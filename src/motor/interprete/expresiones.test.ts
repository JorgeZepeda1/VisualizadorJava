// RED de la tarea 2.17 (REQ-EJEC-005, design.md §3.1, §3.2): el intérprete de expresiones evalúa la IR con las reglas de Java —enteros de 32 bits,
// `long` exacto, `char`, división y módulo de Java, concatenación que decide desde el primer `String` de izquierda a derecha, corto circuito,
// `x++`/`++x` con efecto en orden de evaluación— y anota el valor de cada punto del plan en `Paso.valores`. Cada resultado esperado es lo que
// imprime el JDK 17 real (los programas equivalentes están en `corpus/experimentos/ejecucion/`, con su golden del oráculo).
import { describe, expect, it } from 'vitest';
import { correr } from './ayudas-de-prueba.ts';

function imprime(cuerpo: string): string {
  return correr(cuerpo).salida;
}

describe('int: 32 bits, división y módulo de Java', () => {
  it('MAX_VALUE + 1 da la vuelta; MIN_VALUE - 1 también; MAX * 2 es -2', () => {
    expect(imprime('    int m = Integer.MAX_VALUE;\n    System.out.println(m + 1);\n    System.out.println(Integer.MIN_VALUE - 1);\n    System.out.println(m * 2);')).toBe(
      '-2147483648\n2147483647\n-2\n',
    );
  });

  it('-7 % 3 es -1 (el signo del dividendo), 7 % -3 es 1, -7 / 2 es -3 (trunca hacia cero)', () => {
    expect(imprime('    int a = -7;\n    int b = 7;\n    System.out.println(a % 3);\n    System.out.println(b % -3);\n    System.out.println(a / 2);\n    System.out.println(7 / 2);')).toBe(
      '-1\n1\n-3\n3\n',
    );
  });

  it('MIN_VALUE / -1 es MIN_VALUE y no lanza excepción; el producto de 46341 * 46341 es exacto en 32 bits', () => {
    expect(imprime('    int a = Integer.MIN_VALUE;\n    int b = -1;\n    System.out.println(a / b);\n    int c = 46341;\n    System.out.println(c * c);')).toBe(
      '-2147483648\n-2147479015\n',
    );
  });

  it('la precedencia y los paréntesis se respetan: 2 + 3 * 4 = 14, (2 + 3) * 4 = 20', () => {
    expect(imprime('    int n = 2;\n    System.out.println(n + 3 * 4);\n    System.out.println((n + 3) * 4);')).toBe('14\n20\n');
  });
});

describe('char: es un número que se promueve a int', () => {
  it("'A' + 1 es 66 (int) pero (char) ('A' + 1) imprime B; println('A') imprime la letra", () => {
    expect(imprime("    char c = 'A';\n    System.out.println(c + 1);\n    System.out.println((char) (c + 1));\n    System.out.println(c);")).toBe('66\nB\nA\n');
  });

  it("c++ y c += 2 conservan el tipo char: 'a' pasa a 'b' y luego a 'd'", () => {
    expect(imprime("    char c = 'a';\n    c++;\n    System.out.println(c);\n    c += 2;\n    System.out.println(c);")).toBe('b\nd\n');
  });

  it('la vuelta de 16 bits: (char) 65601 es A y (char) -1 es el máximo (65535)', () => {
    expect(imprime('    int n = 65601;\n    System.out.println((char) n);\n    int m = -1;\n    System.out.println((char) m + 0);')).toBe('A\n65535\n');
  });
});

describe('long: 64 bits exactos', () => {
  it('Long.MAX_VALUE + 1 da la vuelta, y 3037000500 * 3037000500 se desborda', () => {
    expect(imprime('    long m = Long.MAX_VALUE;\n    System.out.println(m + 1);\n    long a = 3037000500L;\n    System.out.println(a * a);')).toBe(
      '-9223372036854775808\n-9223372036709301616\n',
    );
  });

  it('int con long promueve a long: 2000000000 + 2000000000L no se desborda; (int) de un long da la vuelta', () => {
    expect(imprime('    int a = 2000000000;\n    long b = a + 2000000000L;\n    System.out.println(b);\n    System.out.println((int) b);')).toBe('4000000000\n-294967296\n');
  });

  it('la división de long trunca hacia cero y el módulo toma el signo del dividendo', () => {
    expect(imprime('    long a = -7L;\n    System.out.println(a / 2);\n    System.out.println(a % 3);')).toBe('-3\n-1\n');
  });
});

describe('concatenación: decide desde el primer String, de izquierda a derecha', () => {
  it('"n=" + 1 + 2 es "n=12", pero 1 + 2 + "x" es "3x" (suma primero)', () => {
    expect(imprime('    int a = 1;\n    int b = 2;\n    System.out.println("n=" + a + b);\n    System.out.println(a + b + "x");')).toBe('n=12\n3x\n');
  });

  it('cada operando pasa por String.valueOf de su tipo ESTÁTICO: char, boolean, long, int', () => {
    expect(imprime("    char c = 'x';\n    boolean t = true;\n    long l = 5L;\n    System.out.println(\"c=\" + c + \" t=\" + t + \" l=\" + l + \" n=\" + (c + 1));")).toBe(
      'c=x t=true l=5 n=121\n',
    );
  });

  it('s += valor concatena, y char + String en una asignación compuesta', () => {
    expect(imprime('    String s = "a";\n    s += 1;\n    s += \'b\';\n    s += true;\n    System.out.println(s);')).toBe('a1btrue\n');
  });
});

describe('String: identidad por referencia, constantes internadas', () => {
  it('"ho" + "la" == "hola" es true (constante internada), pero una concatenación en ejecución es otro objeto', () => {
    expect(imprime('    String a = "ho";\n    String b = a + "la";\n    System.out.println("ho" + "la" == "hola");\n    System.out.println(b == "hola");\n    System.out.println("x" == "x");')).toBe(
      'true\nfalse\ntrue\n',
    );
  });

  it('una variable final con valor constante participa de la constante: P + "b" == "ab"', () => {
    expect(imprime('    final String P = "a";\n    System.out.println(P + "b" == "ab");')).toBe('true\n');
  });
});

describe('lógica y comparaciones: corto circuito', () => {
  it('&& no evalúa la derecha si la izquierda es falsa, y || no la evalúa si la izquierda es verdadera (no lanza 1/0)', () => {
    expect(imprime('    int z = 0;\n    System.out.println(z != 0 && 10 / z > 1);\n    System.out.println(z == 0 || 10 / z > 1);')).toBe('false\ntrue\n');
  });

  it('sin corto circuito la derecha SÍ se evalúa: true && 10 / z lanza ArithmeticException', () => {
    const corrida = correr('    int z = 0;\n    System.out.println(z == 0 && 10 / z > 1);');
    expect(corrida.fin?.causa).toBe('excepcion');
  });

  it('comparar números de tipos distintos promueve: 1 < 2L, \'a\' == 97, == y != de booleanos', () => {
    expect(imprime("    int a = 1;\n    long b = 2L;\n    char c = 'a';\n    boolean t = true;\n    System.out.println(a < b);\n    System.out.println(c == 97);\n    System.out.println(t == !t);\n    System.out.println(t != !t);")).toBe(
      'true\ntrue\nfalse\ntrue\n',
    );
  });
});

describe('x++ y ++x: el efecto ocurre en el orden de evaluación', () => {
  it('i++ + ++i con i = 5 es 5 + 7 = 12 y deja i en 7', () => {
    expect(imprime('    int i = 5;\n    int r = i++ + ++i;\n    System.out.println(r);\n    System.out.println(i);')).toBe('12\n7\n');
  });

  it('`k = k++` deja k igual (el postfijo devuelve el viejo y la asignación lo reescribe)', () => {
    expect(imprime('    int k = 3;\n    k = k++;\n    System.out.println(k);')).toBe('3\n');
  });

  it('i-- y --i, y el incremento de long', () => {
    expect(imprime('    int i = 5;\n    System.out.println(i--);\n    System.out.println(--i);\n    long l = 9L;\n    l++;\n    System.out.println(l);')).toBe('5\n3\n10\n');
  });
});

describe('asignación compuesta: x = (T)(x op e)', () => {
  it('x /= 2 y x %= 3 con int; x *= 2 se desborda en 32 bits', () => {
    expect(imprime('    int x = 7;\n    x /= 2;\n    System.out.println(x);\n    x %= 2;\n    System.out.println(x);\n    int y = Integer.MAX_VALUE;\n    y *= 2;\n    System.out.println(y);')).toBe(
      '3\n1\n-2\n',
    );
  });

  it('x += c con char suma como int y estrecha a int', () => {
    expect(imprime("    int x = 1;\n    char c = 'a';\n    x += c;\n    System.out.println(x);")).toBe('98\n');
  });
});

describe('registro de valores por punto del plan', () => {
  it('`int total = a + b * 2;` anota 100, 25, 2, 50 y 150 en el orden del plan', () => {
    const corrida = correr('    int a = 100;\n    int b = 25;\n    int total = a + b * 2;');
    expect(corrida.pasos[2].valores).toEqual([100, 25, 2, 50, 150]);
  });

  it('el punto que no se evaluó por corto circuito queda en null', () => {
    const corrida = correr('    int z = 0;\n    boolean r = z != 0 && 10 / z > 1;');
    // plan: z, 0, (z != 0), 10, z, (10 / z), 1, (> 1), &&
    expect(corrida.pasos[1].valores).toEqual([0, 0, false, null, null, null, null, null, false]);
  });

  it('un cambio a media expresión lleva el punto donde ocurrió: `y = i++ + 1` registra el cambio de i en el punto del incremento', () => {
    const corrida = correr('    int i = 1;\n    int y = 0;\n    y = i++ + 1;');
    const cambios = corrida.pasos[2].cambios;
    expect(cambios).toEqual([
      { ranura: 'i', anterior: 1, nuevo: 2, punto: 0 },
      { ranura: 'y', anterior: 0, nuevo: 2, punto: 3 },
    ]);
  });
});
