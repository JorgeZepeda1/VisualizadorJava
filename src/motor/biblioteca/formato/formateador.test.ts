// RED de la tarea 2.8 (REQ-BIB-003, REQ-BIB-010, design.md §4.3): `printf`/`String.format` reducido — `%d %s %f %.Nf %c %b %n %%`, ancho y banderas `- 0 ,` — con el HALF_UP de Java sobre los
// dígitos de `Double.toString` (nunca `toFixed`) y los separadores de la región. Lo que Java acepta pero el motor no promete (`%e`, `%x`, `%+d`, `1$`…) es «No disponible», jamás un valor
// distinto. Los valores esperados salieron del JDK 17.0.18; el barrido de ~15 000 casos está en `pruebas/diferencial/biblioteca/printf.test.ts`.
import { describe, expect, it } from 'vitest';
import { ExcepcionJava } from '../excepciones/excepcion-java.ts';
import { NoDisponibleEnEjecucion } from '../no-disponible.ts';
import { potenciaDeDos } from '../numeros/potencia-de-dos.ts';
import { type ArgumentoDeFormato, formatear, formatearEnPiezas, formatoSoportado } from './formateador.ts';

const int = (valor: number): ArgumentoDeFormato => ({ tipo: 'int', valor });
const long = (valor: bigint): ArgumentoDeFormato => ({ tipo: 'long', valor });
const double = (valor: number): ArgumentoDeFormato => ({ tipo: 'double', valor });
const char = (texto: string): ArgumentoDeFormato => ({ tipo: 'char', valor: texto.charCodeAt(0) });
const cadena = (valor: string): ArgumentoDeFormato => ({ tipo: 'String', valor });
const booleano = (valor: boolean): ArgumentoDeFormato => ({ tipo: 'boolean', valor });

function usar(formato: string, ...argumentos: ArgumentoDeFormato[]): string {
  return formatear(formato, argumentos, 'es-MX', 'String.format');
}

function excepcionDe(accion: () => unknown): ExcepcionJava {
  try {
    accion();
  } catch (error) {
    if (error instanceof ExcepcionJava) return error;
    throw error;
  }
  throw new Error('se esperaba una ExcepcionJava y no se lanzó nada');
}

describe('%f y %.Nf — HALF_UP sobre los dígitos cortos, rellenando con ceros', () => {
  it('%.2f de 2.675 es 2.68 (toFixed daría 2.67) y de 0.125 es 0.13; de 1.005 es 1.01', () => {
    expect(usar('%.2f', double(2.675))).toBe('2.68');
    expect(usar('%.2f', double(0.125))).toBe('0.13');
    expect(usar('%.2f', double(1.005))).toBe('1.01');
  });

  it('pedir más decimales de los que hay rellena con ceros: %.20f de 0.1 → 0.10000000000000000000', () => {
    expect(usar('%.20f', double(0.1))).toBe('0.10000000000000000000');
  });

  it('el acarreo cambia la longitud (9.995 → 10.00), %f usa 6 decimales y %.0f no lleva punto', () => {
    expect(usar('%.2f', double(9.995))).toBe('10.00');
    expect(usar('%f', double(1.5))).toBe('1.500000');
    expect(usar('%.0f', double(2.5))).toBe('3');
  });

  it('los enteros grandes usan los dígitos de la banda: %.1f de 2^60 → 1152921504606846980.0', () => {
    expect(usar('%.1f', double(potenciaDeDos(60)))).toBe('1152921504606846980.0');
  });

  it('cero negativo y redondeo a cero conservan el signo; NaN e Infinity se escriben como Java', () => {
    expect(usar('%.2f', double(-0))).toBe('-0.00');
    expect(usar('%.2f', double(-0.001))).toBe('-0.00');
    expect(usar('%.2f', double(Number.NaN))).toBe('NaN');
    expect(usar('%8.2f', double(-Infinity))).toBe('-Infinity');
  });

  it('ancho, banderas - y 0, y agrupación de miles', () => {
    expect(usar('%8.2f', double(3.14159))).toBe('    3.14');
    expect(usar('%-8.2f|', double(3.14159))).toBe('3.14    |');
    expect(usar('%08.2f', double(-3.5))).toBe('-0003.50');
    expect(usar('%,.2f', double(1234567.891))).toBe('1,234,567.89');
    expect(usar('%,12.3f', double(1234.5))).toBe('   1,234.500');
  });
});

describe('%d, %s, %c, %b, %n, %%', () => {
  it('%d con int y long, ancho, ceros y agrupación (los ceros no se agrupan)', () => {
    expect(usar('%d', int(-42))).toBe('-42');
    expect(usar('%d', long(9223372036854775807n))).toBe('9223372036854775807');
    expect(usar('%5d|%-5d|%05d', int(42), int(42), int(-42))).toBe('   42|42   |-0042');
    expect(usar('%,d', int(1234567))).toBe('1,234,567');
    expect(usar('%,010d', int(1000))).toBe('000001,000');
  });

  it('%s usa String.valueOf: un double sale con punto y notación de Java; precisión trunca; ancho y -', () => {
    expect(usar('%s', double(2.5))).toBe('2.5');
    expect(usar('%s', double(1e7))).toBe('1.0E7');
    expect(usar('%s y %s', int(1), booleano(true))).toBe('1 y true');
    expect(usar('%.3s|%10s|%-10s|', cadena('Hola mundo'), cadena('hola'), cadena('hola'))).toBe('Hol|      hola|hola      |');
  });

  it('%c con char y con int (punto de código), %b con cualquier argumento, %n es salto de línea, %% es el signo', () => {
    expect(usar('%c%c', char('a'), int(0x1f600))).toBe('a\u{1F600}');
    expect(usar('%b %b %b', booleano(false), int(0), cadena('x'))).toBe('false true true');
    expect(usar('a%nb')).toBe('a\nb');
    expect(usar('100%% y %5%|')).toBe('100% y     %|');
  });

  it('una plantilla de aula con varios especificadores y un argumento de sobra (que Java ignora)', () => {
    expect(usar('Nombre: %s, Edad: %d, Promedio: %.2f%n', cadena('Ana'), int(17), double(9.5))).toBe('Nombre: Ana, Edad: 17, Promedio: 9.50\n');
    expect(usar('%d', int(5), int(6))).toBe('5');
  });
});

describe('modelo regional: es-ES invierte separadores en la salida; %s de un double nunca cambia', () => {
  it('es-ES: coma decimal y punto de miles', () => {
    expect(formatear('%,.2f', [double(1234.5)], 'es-ES', 'String.format')).toBe('1.234,50');
    expect(formatear('%,d|%.2f', [int(1234567), double(3.5)], 'es-ES', 'String.format')).toBe('1.234.567|3,50');
  });

  it('%s de un double usa Double.toString: punto aun en es-ES (design.md §4.7)', () => {
    expect(formatear('%s', [double(3.5)], 'es-ES', 'String.format')).toBe('3.5');
  });
});

describe('excepciones de formato: clase, mensaje y marcos según la puerta (String.format o printf)', () => {
  it('%d con un double: IllegalFormatConversionException «d != java.lang.Double»; el sitio cambia con la puerta', () => {
    const porFormat = excepcionDe(() => formatear('%d', [double(3.5)], 'es-MX', 'String.format'));
    expect(porFormat.clase).toBe('java.util.IllegalFormatConversionException');
    expect(porFormat.mensaje).toBe('d != java.lang.Double');
    expect(porFormat.sitio).toBe('Formatter/conversion-incompatible-d@String.format');
    expect(excepcionDe(() => formatear('%d', [double(3.5)], 'es-MX', 'printf')).sitio).toBe('Formatter/conversion-incompatible-d@printf');
  });

  it('%f con un int (el error clásico) y %c con un String', () => {
    expect(excepcionDe(() => usar('%.2f', int(3))).mensaje).toBe('f != java.lang.Integer');
    expect(excepcionDe(() => usar('%c', cadena('hola'))).mensaje).toBe('c != java.lang.String');
  });

  it('argumentos que faltan, conversiones desconocidas (estilo C) y precisión en %d', () => {
    const falta = excepcionDe(() => usar('%d y %d', int(1)));
    expect(falta.clase).toBe('java.util.MissingFormatArgumentException');
    expect(falta.mensaje).toBe("Format specifier '%d'");
    expect(excepcionDe(() => usar('%i', int(1))).mensaje).toBe("Conversion = 'i'");
    expect(excepcionDe(() => usar('%lf', double(1.5))).mensaje).toBe("Conversion = 'l'");
    expect(excepcionDe(() => usar('%.2d', int(1))).mensaje).toBe('2');
    expect(excepcionDe(() => usar('%-d', int(1))).mensaje).toBe('%-d');
  });

  it('un patrón mal formado falla antes de imprimir nada: "%" suelto, "%5" sin conversión', () => {
    expect(excepcionDe(() => usar('abc%')).mensaje).toBe("Conversion = '%'");
    expect(excepcionDe(() => usar('%5')).mensaje).toBe("Conversion = '5'");
    expect(excepcionDe(() => usar('%.f', double(1))).mensaje).toBe("Conversion = '.'");
  });

  it('banderas incompatibles o repetidas', () => {
    expect(excepcionDe(() => usar('%,s', cadena('x'))).mensaje).toBe('Conversion = s, Flags = ,');
    expect(excepcionDe(() => usar('%0-5d', int(1))).mensaje).toBe("Flags = '-0'");
    expect(excepcionDe(() => usar('%--5d', int(1))).mensaje).toBe("Flags = '-'");
  });
});

describe('fuera del alcance: «No disponible», nunca un valor inventado', () => {
  it('%e, %x, %+d, % d y los índices de argumento (%1$s) lanzan NoDisponibleEnEjecucion', () => {
    for (const formato of ['%e', '%x', '%+d', '% d', '%1$s', '%(d', '%S']) {
      expect(() => usar(formato, int(255))).toThrow(NoDisponibleEnEjecucion);
    }
  });
});

describe('formatoSoportado — para que el compilador dé un aviso honesto con un patrón literal', () => {
  it('acepta los patrones del alcance y dice cuál especificador no lo está en los demás', () => {
    expect(formatoSoportado('Total: %d y %.2f%n')).toEqual({ soportado: true });
    expect(formatoSoportado('%8.3f|%-5s|%05d|%,d|%c|%b|%%')).toEqual({ soportado: true });
    expect(formatoSoportado('x = %e')).toEqual({ soportado: false, especificador: '%e' });
    expect(formatoSoportado('%d y %+d')).toEqual({ soportado: false, especificador: '%+d' });
    expect(formatoSoportado('%2$s %1$s')).toEqual({ soportado: false, especificador: '%2$s' });
  });

  it('los patrones que Java rechaza al ejecutar no se consideran fuera del alcance: el motor lanza la excepción de Java', () => {
    expect(formatoSoportado('%i')).toEqual({ soportado: true });
    expect(formatoSoportado('%.2d')).toEqual({ soportado: true });
  });
});

describe('formatearEnPiezas — literal y especificador por separado (para la plantilla 21)', () => {
  it('cada pieza lleva su texto ya formateado y, si es un especificador, el especificador original', () => {
    const piezas = formatearEnPiezas('Hola %s, tienes %d años%n', [cadena('Ana'), int(17)], 'es-MX', 'String.format');
    expect(piezas).toEqual([
      { tipo: 'literal', texto: 'Hola ' },
      { tipo: 'especificador', especificador: '%s', texto: 'Ana' },
      { tipo: 'literal', texto: ', tienes ' },
      { tipo: 'especificador', especificador: '%d', texto: '17' },
      { tipo: 'literal', texto: ' años' },
      { tipo: 'especificador', especificador: '%n', texto: '\n' },
    ]);
  });
});
