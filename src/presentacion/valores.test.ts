// RED de la tarea 4.6 (REQ-VIS-005): cómo se escribe cada valor en el panel de variables, tal como Java lo escribe en el código (`5`, `'A'`, `"hola"`, `2.5`, `true`).
// El motor ya escribe así los valores de sus explicaciones (`motor/interprete/explicar.ts`); aquí se escriben los de las variables a partir del `Valor` crudo de la traza y
// del tipo de la variable (un `char` viaja como número: sin su tipo, 65 no sería `'A'`).
import { describe, expect, it } from 'vitest';
import { doubleATexto } from '../motor/vista.ts';
import { formatearValor } from './valores.ts';

describe('formatearValor: enteros, booleanos y objetos', () => {
  it('un int y un long se escriben con sus dígitos', () => {
    expect(formatearValor(3, 'int')).toBe('3');
    expect(formatearValor(-12, 'int')).toBe('-12');
    expect(formatearValor(9007199254740993n, 'long')).toBe('9007199254740993');
  });

  it('un boolean se escribe true o false', () => {
    expect(formatearValor(true, 'boolean')).toBe('true');
    expect(formatearValor(false, 'boolean')).toBe('false');
  });

  it('un objeto de la biblioteca se nombra con su clase, en español', () => {
    expect(formatearValor({ objeto: 'Scanner' }, 'Scanner')).toBe('un Scanner');
    expect(formatearValor({ objeto: 'Random' }, 'Random')).toBe('un Random');
  });
});

describe('formatearValor: char y String', () => {
  it('un char viaja como número y se escribe entre comillas simples', () => {
    expect(formatearValor(65, 'char')).toBe("'A'");
    expect(formatearValor(241, 'char')).toBe("'ñ'");
  });

  it('un char especial se escribe escapado, como en el código', () => {
    expect(formatearValor(10, 'char')).toBe("'\\n'");
    expect(formatearValor(39, 'char')).toBe("'\\''");
    expect(formatearValor(92, 'char')).toBe("'\\\\'");
  });

  it('un String se escribe entre comillas dobles', () => {
    expect(formatearValor('Papas', 'String')).toBe('"Papas"');
    expect(formatearValor('', 'String')).toBe('""');
  });

  it('un String con comillas, barra o salto de línea los escribe escapados', () => {
    expect(formatearValor('dijo "hola"', 'String')).toBe('"dijo \\"hola\\""');
    expect(formatearValor('a\\b', 'String')).toBe('"a\\\\b"');
    expect(formatearValor('uno\ndos\ttres', 'String')).toBe('"uno\\ndos\\ttres"');
  });
});

describe('formatearValor: double, con la forma de Double.toString', () => {
  it('un entero se escribe con .0', () => {
    expect(formatearValor(5, 'double')).toBe('5.0');
    expect(formatearValor(-3, 'double')).toBe('-3.0');
    expect(formatearValor(0, 'double')).toBe('0.0');
  });

  it('un decimal conserva todos sus dígitos', () => {
    expect(formatearValor(2.5, 'double')).toBe('2.5');
    expect(formatearValor(0.1 + 0.2, 'double')).toBe('0.30000000000000004');
    expect(formatearValor(10 / 3, 'double')).toBe('3.3333333333333335');
  });

  it('el cero negativo conserva su signo', () => {
    expect(formatearValor(-0, 'double')).toBe('-0.0');
  });

  it('de 10 millones en adelante y por debajo de una milésima usa la notación con E, como Java', () => {
    expect(formatearValor(1e7, 'double')).toBe('1.0E7');
    expect(formatearValor(12345678.9, 'double')).toBe('1.23456789E7');
    expect(formatearValor(0.0001, 'double')).toBe('1.0E-4');
    expect(formatearValor(1.5e-5, 'double')).toBe('1.5E-5');
    expect(formatearValor(1e21, 'double')).toBe('1.0E21');
  });

  it('justo dentro del rango (menos de 10 millones, una milésima o más) sigue en notación decimal', () => {
    expect(formatearValor(9999999, 'double')).toBe('9999999.0');
    expect(formatearValor(0.001, 'double')).toBe('0.001');
    expect(formatearValor(123456.789, 'double')).toBe('123456.789');
  });

  it('los casos donde JDK 17 NO escribe los dígitos más cortos (los de JavaScript) salen como Java: `Double.toString` exacto del motor (hito 2C)', () => {
    expect(formatearValor(1e23, 'double')).toBe('9.999999999999999E22');
    expect(formatearValor(Number.MIN_VALUE, 'double')).toBe('4.9E-324');
    expect(formatearValor(2 ** 60, 'double')).toBe('1.15292150460684698E18');
  });

  it('el valor que el panel de variables escribe es el mismo que el motor escribe en la consola (una sola fuente de verdad)', () => {
    for (const numero of [0.1 + 0.2, 10 / 3, 1e7, 1.5e-5, 12345678.9, 2 ** 53, 100]) {
      expect(formatearValor(numero, 'double'), String(numero)).toBe(doubleATexto(numero));
    }
  });

  it('NaN e infinitos se escriben como Java', () => {
    expect(formatearValor(Number.NaN, 'double')).toBe('NaN');
    expect(formatearValor(Number.POSITIVE_INFINITY, 'double')).toBe('Infinity');
    expect(formatearValor(Number.NEGATIVE_INFINITY, 'double')).toBe('-Infinity');
  });
});
