// RED de la tarea 2.11 (REQ-BIB-008, design.md §4.5): `Integer.parseInt`, `Double.parseDouble` y las constantes de `Integer`/`Double`/`Long`, con las excepciones EXACTAS del JDK 17
// (mensaje y marcos). Los textos esperados salieron del JDK 17.0.18; el barrido de miles de entradas está en `pruebas/diferencial/biblioteca/parseo.test.ts`.
import { describe, expect, it } from 'vitest';
import { ExcepcionJava } from '../excepciones/excepcion-java.ts';
import { NoDisponibleEnEjecucion } from '../no-disponible.ts';
import { Double, Integer, Long } from './envoltorios.ts';

function excepcionDe(accion: () => unknown): ExcepcionJava {
  try {
    accion();
  } catch (error) {
    if (error instanceof ExcepcionJava) return error;
    throw error;
  }
  throw new Error('se esperaba una ExcepcionJava y no se lanzó nada');
}

describe('Integer.parseInt', () => {
  it('acepta signo opcional y ceros a la izquierda: "5", "-5", "+5", "007", "-2147483648"', () => {
    expect(Integer.parseInt('5')).toBe(5);
    expect(Integer.parseInt('-5')).toBe(-5);
    expect(Integer.parseInt('+5')).toBe(5);
    expect(Integer.parseInt('007')).toBe(7);
    expect(Integer.parseInt('-2147483648')).toBe(-2147483648);
    expect(Integer.parseInt('2147483647')).toBe(2147483647);
  });

  it('acepta cualquier dígito Unicode, no solo ASCII: "٣٤" (arábigo-índico) → 34 (REQ-BIB-008)', () => {
    expect(Integer.parseInt('٣٤')).toBe(34);
    expect(Integer.parseInt('１２３')).toBe(123);
  });

  it('NO recorta espacios: " 5 " lanza NumberFormatException: For input string: " 5 " (marco de inicio inválido)', () => {
    const excepcion = excepcionDe(() => Integer.parseInt(' 5 '));
    expect(excepcion.clase).toBe('java.lang.NumberFormatException');
    expect(excepcion.mensaje).toBe('For input string: " 5 "');
    expect(excepcion.sitio).toBe('Integer.parseInt/inicio-invalido');
  });

  it('cada forma de fallar cae en su sitio de la tabla de marcos: letras, vacío, solo signo, y los dos desbordes', () => {
    expect(excepcionDe(() => Integer.parseInt('abc')).sitio).toBe('Integer.parseInt/digito-invalido');
    expect(excepcionDe(() => Integer.parseInt('3.5')).sitio).toBe('Integer.parseInt/digito-invalido');
    expect(excepcionDe(() => Integer.parseInt('')).sitio).toBe('Integer.parseInt/vacio');
    expect(excepcionDe(() => Integer.parseInt('-')).sitio).toBe('Integer.parseInt/solo-signo');
    expect(excepcionDe(() => Integer.parseInt('99999999999')).sitio).toBe('Integer.parseInt/digito-invalido');
    expect(excepcionDe(() => Integer.parseInt('2147483648')).sitio).toBe('Integer.parseInt/desborde-final');
    expect(excepcionDe(() => Integer.parseInt('-2147483649')).mensaje).toBe('For input string: "-2147483649"');
  });
});

describe('Double.parseDouble', () => {
  it('acepta el formato de literal de Java: "3.14", ".5", "5.", "1e3", "1.5f", "-0.0", "NaN", "Infinity"', () => {
    expect(Double.parseDouble('3.14')).toBe(3.14);
    expect(Double.parseDouble('.5')).toBe(0.5);
    expect(Double.parseDouble('5.')).toBe(5);
    expect(Double.parseDouble('1e3')).toBe(1000);
    expect(Double.parseDouble('1.5f')).toBe(1.5);
    expect(Object.is(Double.parseDouble('-0.0'), -0)).toBe(true);
    expect(Double.parseDouble('NaN')).toBeNaN();
    expect(Double.parseDouble('-Infinity')).toBe(-Infinity);
  });

  it('recorta con trim de Java (todo lo ≤ U+0020) pero NO el espacio de no separación', () => {
    expect(Double.parseDouble('  2.5\t\n')).toBe(2.5);
    expect(excepcionDe(() => Double.parseDouble(' 5')).clase).toBe('java.lang.NumberFormatException');
  });

  it('rechaza lo que JavaScript acepta o interpreta distinto: "1,5", "1_0", "" (empty String), "0x" sin Java', () => {
    expect(excepcionDe(() => Double.parseDouble('1,5')).mensaje).toBe('For input string: "1,5"');
    expect(excepcionDe(() => Double.parseDouble('1_0')).mensaje).toBe('For input string: "1_0"');
    const vacio = excepcionDe(() => Double.parseDouble(''));
    expect(vacio.mensaje).toBe('empty String');
    expect(vacio.sitio).toBe('Double.parseDouble/vacio');
    expect(excepcionDe(() => Double.parseDouble('   ')).sitio).toBe('Double.parseDouble/vacio');
    expect(excepcionDe(() => Double.parseDouble('abc')).sitio).toBe('Double.parseDouble/no-es-numero');
  });

  it('un segundo punto en la parte numérica da el mensaje especial "multiple points"', () => {
    expect(excepcionDe(() => Double.parseDouble('1.5.5')).mensaje).toBe('multiple points');
  });

  it('un literal hexadecimal es válido en Java pero queda fuera del alcance: «No disponible», nunca un valor inventado', () => {
    expect(() => Double.parseDouble('0x1p3')).toThrow(NoDisponibleEnEjecucion);
  });
});

describe('constantes de Integer, Double y Long', () => {
  it('MAX_VALUE y MIN_VALUE de los tres tipos', () => {
    expect(Integer.MAX_VALUE).toBe(2147483647);
    expect(Integer.MIN_VALUE).toBe(-2147483648);
    expect(Double.MAX_VALUE).toBe(1.7976931348623157e308);
    expect(Double.MIN_VALUE).toBe(5e-324);
    expect(Long.MAX_VALUE).toBe(9223372036854775807n);
    expect(Long.MIN_VALUE).toBe(-9223372036854775808n);
  });
});
