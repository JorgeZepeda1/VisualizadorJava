// Casos de `printf`/`String.format` para el oráculo (hito 1, parte A; tarea 2.8, REQ-BIB-003/010, design.md §4.3 y §7.3): cada caso es un patrón y sus argumentos tipados; el JDK 17
// REAL dice qué imprime (o qué excepción lanza) y lo guardamos en `corpus/datos/printf/`. Aquí solo se ENUMERAN las situaciones (azar determinista); nunca se escribe un resultado.
//
// `alcance` marca lo que el motor promete: `dentro` (conversiones `%d %s %f %c %b %n %%`, ancho, precisión y banderas `-`, `0`, `,`) o `fuera` (válido en Java pero no soportado: `%e %x`,
// `+ ( # espacio`, `1$`…): para estos el motor responde «No disponible» (o, si coincide, el valor exacto del JDK), jamás otro valor.
import { type Azar, bitsAHex, bitsDeDouble, crearAzar } from './azar-determinista.ts';

export type ArgumentoDeFormato =
  | { readonly t: 'd'; readonly v: number }
  | { readonly t: 'l'; readonly v: bigint }
  | { readonly t: 'D'; readonly v: number }
  | { readonly t: 'c'; readonly v: number }
  | { readonly t: 'b'; readonly v: boolean }
  | { readonly t: 's'; readonly v: string };

export interface CasoDeFormato {
  readonly formato: string;
  readonly argumentos: readonly ArgumentoDeFormato[];
  readonly alcance: 'dentro' | 'fuera';
}

const int = (v: number): ArgumentoDeFormato => ({ t: 'd', v });
const long = (v: bigint): ArgumentoDeFormato => ({ t: 'l', v });
const double = (v: number): ArgumentoDeFormato => ({ t: 'D', v });
const char = (texto: string): ArgumentoDeFormato => ({ t: 'c', v: texto.charCodeAt(0) });
const booleano = (v: boolean): ArgumentoDeFormato => ({ t: 'b', v });
const cadena = (v: string): ArgumentoDeFormato => ({ t: 's', v });

/** Los argumentos como los lee `EvaluarBiblioteca.java`: `d:` Integer, `l:` Long, `D:` bits de un Double, `c:` Character, `b:` Boolean, `s:` String (con los escapes del campo). */
export function codificarArgumento(argumento: ArgumentoDeFormato, escapar: (texto: string) => string): string {
  switch (argumento.t) {
    case 'd':
    case 'l':
    case 'c':
    case 'b':
      return `${argumento.t}:${String(argumento.v)}`;
    case 'D':
      return `D:${bitsAHex(bitsDeDouble(argumento.v))}`;
    case 's':
      return `s:${escapar(argumento.v)}`;
  }
}

const ENTEROS = [0, 1, -1, 7, 42, -42, 100, 999, 1000, -1000, 1234, 12345, 1234567, -1234567, 2147483647, -2147483648];
const LARGOS = [0n, 1n, -1n, 1234567890123n, 9223372036854775807n, -9223372036854775808n];
const FORMATOS_D = ['%d', '%5d', '%-5d|', '%05d', '%,d', '%,10d', '%-,10d|', '%010d', '%,010d', '%3d', '%d%%', '%1d', '%-d%n'];
const FORMATOS_F = ['%f', '%.0f', '%.1f', '%.2f', '%.3f', '%.4f', '%.6f', '%.10f', '%.15f', '%.17f', '%.20f', '%8.2f', '%-8.2f|', '%08.2f', '%,.2f', '%,12.3f', '%10.0f', '%.2f%%', '%12.4f', '%-12.1f|'];
const CADENAS = ['', 'a', 'hola', 'Hola mundo', 'ñandú', 'x y', '12', 'MAYÚSCULAS', 'una cadena larga de prueba'];
const FORMATOS_S = ['%s', '%10s', '%-10s|', '%.3s', '%10.3s', '%-10.3s|', '[%s]', '%2s', '%.0s', '%s%s'];

function dobles(azar: Azar): number[] {
  const sencillos = [
    0, -0, 1, -1, 0.5, 1.5, 2.5, 0.125, 0.1, 0.2, 0.3, 0.7, 2.675, 1.005, 0.005, 0.015, 0.025, 9.995, 99.995, 0.995, 0.0049999, 1 / 3, 2 / 3, 123456.789, 1e7, 1e-5, 1e20, 1e21, 1e22, 1e23, 1e100,
    1e-7, 123456789.12345679, 0.000123456, 5e-324, 1.5e-323, 4.9e-300, Number.MAX_VALUE, Number.MIN_VALUE, 2 ** 53, 2 ** 60, 2 ** 62 + 2048, 2 ** 70, 2 ** -24, 2 ** -25, 3.14159, 100, 99.99, 19.99, 4.35,
    1.1 * 1.1, 0.1 + 0.2, 1e15 + 0.3, 12345678.9, 0.9999999, 0.99999999999, 999999.9999995, 5.5, 6.5, -2.5, -0.5, -1.005, -2.675, 33.333333333333336, 66.66666666666667, 85.5, 90.25, 72.125, 100.0 / 3,
    Number.NaN, Infinity, -Infinity,
  ];
  const aleatorios: number[] = [];
  for (let i = 0; i < 180; i++) aleatorios.push(azar.entre(-1_000_000, 1_000_000) / 10 ** azar.entre(0, 4));
  for (let i = 0; i < 110; i++) aleatorios.push(Number(`${azar.entre(1, 99_999_999)}e${azar.entre(-12, 22)}`));
  for (let i = 0; i < 60; i++) aleatorios.push(Number(`0.${azar.entre(0, 99_999)}`) + azar.entre(0, 50));
  // Un 5 justo en la posición del corte: los empates que HALF_UP resuelve hacia arriba.
  for (let i = 0; i < 60; i++) aleatorios.push(Number(`${azar.entre(0, 99)}.${azar.entre(0, 99)}5`));
  for (let i = 0; i < 30; i++) aleatorios.push(2 ** azar.entre(53, 62) + azar.entre(0, 4096));
  return [...sencillos, ...aleatorios];
}

export function casosDeFormato(azar: Azar = crearAzar(808)): CasoDeFormato[] {
  const casos: CasoDeFormato[] = [];
  const dentro = (formato: string, ...argumentos: ArgumentoDeFormato[]): void => {
    casos.push({ formato, argumentos, alcance: 'dentro' });
  };
  const fuera = (formato: string, ...argumentos: ArgumentoDeFormato[]): void => {
    casos.push({ formato, argumentos, alcance: 'fuera' });
  };

  for (const valor of ENTEROS) for (const formato of FORMATOS_D) dentro(formato, int(valor));
  for (const valor of LARGOS) for (const formato of FORMATOS_D) dentro(formato, long(valor));
  for (const cadenaDePrueba of CADENAS) for (const formato of FORMATOS_S) dentro(formato, cadena(cadenaDePrueba), cadena(cadenaDePrueba));
  for (const valor of dobles(azar)) {
    for (const formato of FORMATOS_F) dentro(formato, double(valor));
    for (const formato of ['%s', '%10s', '%-12s|']) dentro(formato, double(valor));
  }
  // Subnormales con tanta precisión que se ven todos sus dígitos: `%f` los toma de `Double.toString` (4.9E-324, 1.0E-323…), no del valor binario exacto.
  for (const valor of [Number.MIN_VALUE, 2 * Number.MIN_VALUE, 3 * Number.MIN_VALUE, 20 * Number.MIN_VALUE, 1e-310, 2.5e-320]) {
    for (const formato of ['%.330f', '%.324f', '%.323f', '%.40f']) dentro(formato, double(valor));
  }
  for (const valor of ENTEROS.slice(0, 8)) for (const formato of ['%s', '%6s', '%b', '%c']) dentro(formato, int(valor));
  for (const letra of ['a', 'Z', 'ñ', '€', '7', ' ']) for (const formato of ['%c', '%3c', '%-3c|', '%s', '%b']) dentro(formato, char(letra));
  for (const valor of [true, false]) for (const formato of ['%b', '%6b', '%-6b|', '%s', '%.3b']) dentro(formato, booleano(valor));
  for (const formato of ['%n', '%%', 'sin especificadores', 'a%nb%nc', '100%%', '%5%', '%-5%|', '', '%n%n']) dentro(formato);

  // Plantillas de aula con varios especificadores.
  const plantillas: [string, ArgumentoDeFormato[]][] = [
    ['Nombre: %s, Edad: %d, Promedio: %.2f%n', [cadena('Ana'), int(17), double(9.5)]],
    ['%s tiene %d años y mide %.2f m%n', [cadena('Luis'), int(16), double(1.7)]],
    ['Total: $%,.2f (%d artículos)%n', [double(1234.5), int(3)]],
    ['%d + %d = %d%n', [int(2), int(3), int(5)]],
    ['%5.1f%%%n', [double(45.678)]],
    ['|%-10s|%8.2f|%5d|%n', [cadena('pan'), double(12.5), int(3)]],
    ['%s%n', [double(2.5)]],
    ['%s y %s%n', [int(1), booleano(true)]],
    ['%c%c%c%n', [char('a'), char('b'), char('c')]],
    ['%d%s%d', [int(1), cadena('x'), int(2)]],
    ['%.2f', [double(2.675)]],
    ['%.2f %.2f', [double(0.125), double(0.135)]],
    ['%d', [int(5), int(6)]],
    ['sin argumentos usados', [int(5)]],
  ];
  for (const [formato, argumentos] of plantillas) dentro(formato, ...argumentos);

  // Cada conversión contra cada tipo de argumento: el resultado, o la IllegalFormatConversionException exacta.
  const muestras: ArgumentoDeFormato[] = [int(65), long(65n), double(65.5), char('A'), booleano(true), cadena('texto')];
  for (const conversion of ['d', 's', 'f', 'c', 'b', '.2f', '5d', '-5s|']) for (const argumento of muestras) dentro(`%${conversion}`, argumento);
  for (const argumento of [int(0x1f600), int(-1), int(0x110000), int(65), long(65n)]) dentro('%c', argumento);

  // Patrones mal formados y errores de banderas: la excepción exacta de Java.
  for (const formato of ['%', 'abc%', '%5', '%.', '%.2', '%-', '%0', '%i', '%lf', '%u', '%ld', '%y', '%q', '%d%', '%dd', '%.2d', '%5.2d', '%-d', '%0d', '%-s', '%-f', '%-c', '%,s', '%,c', '%,b', '%05s', '%.2c', '%0-5d', '%--5d', '%,,d', '%.-1f', '%.f', '%5.f', '%d%d%d']) {
    dentro(formato, int(1), int(2));
    dentro(formato);
  }

  // Fuera del alcance: válido en Java, el motor responde «No disponible» (nunca un valor distinto del de Java).
  for (const formato of ['%e', '%E', '%.3e', '%g', '%G', '%x', '%X', '%o', '%h', '%H', '%a', '%A', '%tY', '%s %S', '%S', '%B', '%C', '%+d', '% d', '%(d', '%#x', '%#o', '%+.2f', '% .2f', '%(.2f', '%#.0f', '%1$s', '%2$s %1$s', '%<s', '%1$d %1$d', '%+,d', '%08.3e']) {
    fuera(formato, double(12345.6789), int(42), cadena('x'));
    fuera(formato, int(255), double(0.5), cadena('y'));
  }
  return casos;
}

/** La salida de la orden `formatos` por caso: `OK:<resultado>` o `EX:<clase>:<mensaje>`. */
export interface LineaDeFormato {
  readonly formato: string;
  readonly argumentos: readonly string[];
  readonly alcance: 'dentro' | 'fuera';
  readonly resultado: string;
}
