// RED de la tarea 2.13 (REQ-BIB-011): `System.out`/`System.err` — `print` y `println` por tipo ESTÁTICO de la expresión, y la conversión a texto de `String.valueOf`, que es
// la misma que usa la concatenación con `+`. Los valores esperados salieron de un programa real corrido en el JDK 17.0.18 (stdout byte a byte); los sustitutos sueltos
// salen como `?` porque así los codifica la JVM (design.md §4.8).
import { describe, expect, it } from 'vitest';
import { FlujoDeSalida, valorATexto } from './print-stream.ts';

describe('valorATexto — String.valueOf por tipo estático (también la concatenación con `+`)', () => {
  it('int y long: el número en decimal, con el signo; long conserva los 64 bits', () => {
    expect(valorATexto('int', 66)).toBe('66');
    expect(valorATexto('int', -2147483648)).toBe('-2147483648');
    expect(valorATexto('long', -9223372036854775808n)).toBe('-9223372036854775808');
    expect(valorATexto('long', 1000000000000000000n)).toBe('1000000000000000000');
  });

  it('char: una unidad de código; `print(65)` imprime 65 pero `print((char) 65)` imprime A', () => {
    expect(valorATexto('char', 65)).toBe('A');
    expect(valorATexto('int', 65)).toBe('65');
    expect(valorATexto('char', 0xf1)).toBe('ñ');
  });

  it('double: el formato de Double.toString de Java (punto decimal, E para magnitudes extremas, -0.0)', () => {
    expect(valorATexto('double', 100 / 3)).toBe('33.333333333333336');
    expect(valorATexto('double', 1e7)).toBe('1.0E7');
    expect(valorATexto('double', 0.0001)).toBe('1.0E-4');
    expect(valorATexto('double', -0)).toBe('-0.0');
    expect(valorATexto('double', 5 / 2)).toBe('2.5');
  });

  it('boolean y String: `true`/`false` y el texto tal cual (una referencia nula sale como `null`)', () => {
    expect(valorATexto('boolean', true)).toBe('true');
    expect(valorATexto('boolean', false)).toBe('false');
    expect(valorATexto('String', 'hola')).toBe('hola');
    expect(valorATexto('String', null)).toBe('null');
  });
});

describe('FlujoDeSalida — print y println', () => {
  it('print no agrega fin de línea y println agrega "\\n" (el separador de la máquina de referencia)', () => {
    const salida = new FlujoDeSalida();
    expect(salida.print('String', 'fin')).toBe('fin');
    expect(salida.println('String', 'fin')).toBe('fin\n');
    expect(salida.println()).toBe('\n');
  });

  it('la sobrecarga la decide el tipo estático: print(\'A\') → A, print(65) → 65, y println(\'A\' + 1) (que es int) → 66', () => {
    const salida = new FlujoDeSalida();
    expect(salida.println('char', 65)).toBe('A\n');
    expect(salida.println('int', 65)).toBe('65\n');
    expect(salida.println('int', 'A'.charCodeAt(0) + 1)).toBe('66\n');
  });

  it('un sustituto suelto sale como `?` (lo que hace el codificador UTF-8 de la JVM), dentro de una cadena y como char', () => {
    expect(new FlujoDeSalida().println('String', 'x\uD83Dy')).toBe('x?y\n');
    const salida = new FlujoDeSalida();
    expect(salida.print('char', 0xde00)).toBe('?');
    expect(salida.print('String', 'a')).toBe('a');
  });

  it('un sustituto alto al final de un print espera al siguiente: alto + bajo en prints separados forman UN carácter', () => {
    const salida = new FlujoDeSalida();
    expect(salida.print('char', 0xd83d)).toBe('');
    expect(salida.print('char', 0xde00)).toBe('😀');
    // …y si el siguiente no es un sustituto bajo, el alto era suelto: `?` seguido del texto nuevo.
    expect(salida.print('char', 0xd83d)).toBe('');
    expect(salida.print('String', 'b')).toBe('?b');
  });

  it('System.out y System.err son flujos independientes: el sustituto pendiente de uno no afecta al otro', () => {
    const out = new FlujoDeSalida();
    const err = new FlujoDeSalida();
    expect(out.print('char', 0xd83d)).toBe('');
    expect(err.print('String', 'e')).toBe('e');
    expect(out.print('char', 0xde00)).toBe('😀');
  });
});
