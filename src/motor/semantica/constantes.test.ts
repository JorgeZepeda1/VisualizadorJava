// RED de la tarea 1.10 (Constantes — JLS 15.29, REQ-COMP-001 parcial) · depende de 1.8. Plegado en
// tiempo de compilación de literales, operadores, casts a primitivo y campos constantes conocidos
// (Integer/Long/Double.MAX_VALUE/MIN_VALUE, Math.PI/E) — NUNCA de una llamada a método (JLS 15.29
// jamás incluye invocaciones) ni de una variable local sin marcar `final` (design.md §2.7: "final
// con inicializador constante" queda fuera de ESTA tarea a propósito — ver la cabecera de
// constantes.ts para el porqué). `"ho"+"la"=="hola"` -> true por internado real (exploracion/03
// §1.1: dos constantes String comparables por CONTENIDO son la MISMA referencia interna); una
// división entera entre cero NO es una expresión constante (JLS 15.29: lanzaría
// ArithmeticException, y una expresión que lanza nunca es "constante").
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { analizarPrograma } from '../sintaxis/analizador-sintactico.ts';
import { Alcance } from './alcance.ts';
import { constanteDeVariable, valorConstante } from './constantes.ts';
import type { NodoDeclaracionLocal, NodoExpresion } from '../sintaxis/ast.ts';

function expresionDe(expr: string): NodoExpresion {
  const fuente = `class C { public static void main(String[] a) { int x = ${expr}; } }`;
  const programa = analizarPrograma(tokenizar(fuente));
  const decl = programa.clase.main!.cuerpo.elementos[0] as NodoDeclaracionLocal;
  return decl.declaradores[0]!.inicializador!;
}

function constante(expr: string) {
  return valorConstante(expresionDe(expr), new Alcance());
}

describe('valorConstante — literales (JLS 15.29: caso base)', () => {
  it.each([
    ['5', { tipo: 'int', valor: 5 }],
    ['5L', { tipo: 'long', valor: 5n }],
    ['5.5', { tipo: 'double', valor: 5.5 }],
    ["'a'", { tipo: 'char', valor: 97 }],
    ['"hola"', { tipo: 'String', valor: 'hola' }],
    ['true', { tipo: 'boolean', valor: true }],
  ] as const)('%s -> %o', (expr, esperado) => {
    expect(constante(expr)).toEqual(esperado);
  });
});

describe('valorConstante — operadores unarios (JLS 15.29 lista +/-/! entre los operadores constantes)', () => {
  // "-5" a secas ya es un NodoLiteralEntero{valor:-5n} (analizarLiteralNegativo, 1.4) — para
  // ejercitar de verdad el NODO "unaria" (operador "-" real) hace falta que el "-" NO preceda
  // directo a un literal entero/largo (design.md §2.5.3); "-(5)" fuerza esa forma.
  it('"-(5)" (unario real, no el literal negativo especial de 1.4) sigue siendo constante: int -5', () => {
    expect(constante('-(5)')).toEqual({ tipo: 'int', valor: -5 });
  });

  it('"!true" -> false', () => {
    expect(constante('!true')).toEqual({ tipo: 'boolean', valor: false });
  });

  it('"+5" (más unario, JLS 15.29 lo incluye) es un no-op numérico', () => {
    expect(constante('+5')).toEqual({ tipo: 'int', valor: 5 });
  });

  it('triangulación real: "-Math.PI" (unario sobre un campo constante, no un literal)', () => {
    expect(constante('-Math.PI')).toEqual({ tipo: 'double', valor: -Math.PI });
  });
});

describe('valorConstante — aritmética entera con wraparound real (design.md §3.1)', () => {
  it('"2147483647 + 1" da la vuelta a Integer.MIN_VALUE (overflow silencioso, igual que javac)', () => {
    expect(constante('2147483647 + 1')).toEqual({ tipo: 'int', valor: -2147483648 });
  });

  it('"3 * 4" es una multiplicación entera normal', () => {
    expect(constante('3 * 4')).toEqual({ tipo: 'int', valor: 12 });
  });

  it('"7 / 2" trunca hacia cero (división entera)', () => {
    expect(constante('7 / 2')).toEqual({ tipo: 'int', valor: 3 });
  });

  it('"7 % 2" -> 1', () => {
    expect(constante('7 % 2')).toEqual({ tipo: 'int', valor: 1 });
  });
});

describe('valorConstante — división/módulo entero entre cero NUNCA es constante (JLS 15.29 explícito)', () => {
  it('"5 / 0" (int) da null: no es una expresión constante (lanzaría ArithmeticException)', () => {
    expect(constante('5 / 0')).toBeNull();
  });

  it('"5 % 0" (int) también da null', () => {
    expect(constante('5 % 0')).toBeNull();
  });

  it('"5L / 0L" (long) también da null (triangulación: el mismo caso en long)', () => {
    expect(constante('5L / 0L')).toBeNull();
  });

  it('control: "5.0 / 0.0" (double) SÍ es constante: IEEE 754 da Infinity, nunca lanza', () => {
    expect(constante('5.0 / 0.0')).toEqual({ tipo: 'double', valor: Infinity });
  });
});

describe('valorConstante — aritmética "long" con BigInt real (design.md §3.1)', () => {
  it('"9223372036854775807L + 1L" da la vuelta a Long.MIN_VALUE', () => {
    expect(constante('9223372036854775807L + 1L')).toEqual({ tipo: 'long', valor: -9223372036854775808n });
  });
});

describe('valorConstante — concatenación de String (JLS 15.29: "+" con un operando String es constante)', () => {
  it('"ho" + "la" -> String "hola" (constant folding real, exploracion/03 §1.1)', () => {
    expect(constante('"ho" + "la"')).toEqual({ tipo: 'String', valor: 'hola' });
  });

  it('"n=" + 5 (int) concatena exacto (String.valueOf(int) nunca necesita el stub de double)', () => {
    expect(constante('"n=" + 5')).toEqual({ tipo: 'String', valor: 'n=5' });
  });

  it('"b=" + true (boolean) concatena exacto', () => {
    expect(constante('"b=" + true')).toEqual({ tipo: 'String', valor: 'b=true' });
  });

  it('"c=" + \'a\' (char, NO se concatena como int) concatena la LETRA, no el código', () => {
    expect(constante('"c=" + \'a\'')).toEqual({ tipo: 'String', valor: 'c=a' });
  });

  it('control: "ho" + "la" == "hola" -> true (el caso insignia EXACTO de exploracion/03 §1.1)', () => {
    expect(constante('"ho" + "la" == "hola"')).toEqual({ tipo: 'boolean', valor: true });
  });
});

// Deuda del commit 999a8ca (sub-lote 1-D1): el stub `textoDoubleTemporal` formateaba un `double` con reglas propias, no con el `Double.toString` real de Java (design.md §4.2) -- un resultado
// INVENTADO (regla 5 de CLAUDE.md). Hasta que la tarea 2.4 traiga `digitosJava`/`Double.toString` real, el TEXTO de un `double` convertido no se calcula.
//
// Tarea 1.36 (C-5 y W-10 de la verificación final del lote 1): la solución de entonces —dar `null`, «no es constante»— era OTRO resultado inventado. Para javac `"x=" + 1.5` SÍ es una expresión constante
// (JLS 15.29: «+» con un operando `String` y operandos constantes), y de ella dependen la alcanzabilidad de un ciclo, la asignación definitiva y las etiquetas `case`: el motor confundía «no sé
// calcularla» con «no es constante» y respondía como si lo supiera (un `while ("a" + 1.5 == "a1.5") { }` seguido de una sentencia daba `ejecucion-no-disponible`; javac dice «unreachable statement»).
// Ahora hay un TERCER estado, la constante de VALOR DESCONOCIDO: se sabe que es constante y de qué tipo, no cuánto vale. Quien decide con su valor (alcanzabilidad, asignación definitiva, etiquetas
// de `case`) da un aviso honesto; el cálculo real es de la 2.3/2.4 (`Double.toString` fiel).
describe('valorConstante — "+" con double concatenado a String: una constante de VALOR DESCONOCIDO, nunca «no es constante» (C-5, tarea 1.36)', () => {
  it('"x=" + 1.5 (double a la derecha) es una constante String de valor desconocido, con lo que sí se sabe de su largo', () => {
    expect(constante('"x=" + 1.5')).toEqual({ valorDesconocido: true, tipoJava: 'String', medida: { unidades: 2, bytes: 2, partesDeLargoDesconocido: 1 } });
  });

  it('triangulación: "1.5" + "x=" (double a la IZQUIERDA) también', () => {
    expect(constante('1.5 + "x="')).toEqual({ valorDesconocido: true, tipoJava: 'String', medida: { unidades: 2, bytes: 2, partesDeLargoDesconocido: 1 } });
  });

  it('triangulación: una conversión de double a texto ANIDADA (double + double, que SÍ se calcula: 3.0) también', () => {
    expect(constante('"x=" + (1.0 + 2.0)')).toEqual({ valorDesconocido: true, tipoJava: 'String', medida: { unidades: 2, bytes: 2, partesDeLargoDesconocido: 1 } });
  });

  it('cada operando double suma un decimal, y las partes conocidas (con acentos, de dos bytes) suman sus unidades y sus bytes', () => {
    expect(constante('"é" + 1.5 + "ñ" + 2.5')).toEqual({ valorDesconocido: true, tipoJava: 'String', medida: { unidades: 2, bytes: 4, partesDeLargoDesconocido: 2 } });
  });

  it('un String desconocido concatenado con algo conocido sigue siendo un String desconocido, y suma lo conocido (int, char, boolean y String)', () => {
    expect(constante('("a" + 1.5) + "bc" + 7 + \'z\' + true')).toEqual({ valorDesconocido: true, tipoJava: 'String', medida: { unidades: 1 + 2 + 1 + 1 + 4, bytes: 9, partesDeLargoDesconocido: 1 } });
    expect(constante('7 + ("a" + 1.5)')).toMatchObject({ valorDesconocido: true, tipoJava: 'String', medida: { unidades: 2, partesDeLargoDesconocido: 1 } });
  });

  it('control: concatenar con int/long/char/boolean SIGUE plegando normal (nunca se tocó su camino)', () => {
    expect(constante('"n=" + 5')).toEqual({ tipo: 'String', valor: 'n=5' });
    expect(constante('"n=" + 5L')).toEqual({ tipo: 'String', valor: 'n=5' });
  });

  it('control: un `double` solo (sin texto) y la aritmética con doubles SIGUEN siendo constantes conocidas', () => {
    expect(constante('1.5 + 2.5')).toEqual({ tipo: 'double', valor: 4 });
    expect(constante('1.5 == 1.5')).toEqual({ tipo: 'boolean', valor: true });
  });

  it('control: con un operando que NO es constante (una llamada, una variable que no es `final`) NO es constante, ni siquiera desconocida', () => {
    expect(constante('"x=" + Math.abs(1.5)')).toBeNull();
    expect(constante('("x=" + 1.5).length()')).toBeNull();
  });
});

describe('valorConstante — lo que sale de un texto de valor desconocido sigue siendo constante, de valor desconocido (C-5 y W-10, tarea 1.36)', () => {
  it.each([
    ['"a" + 1.5 == "a1.5"', 'boolean'],
    ['"a" + 1.5 != "a1.5"', 'boolean'],
    ['"" + 1.0 == "1.0"', 'boolean'],
    ['"a" + 1.5 == "a" + 1.5', 'boolean'],
    ['1.5 + "a" == "1.5a"', 'boolean'],
    ['"a1.5" == "a" + 1.5', 'boolean'],
    ['!("a" + 1.5 == "a1.5")', 'boolean'],
    ['("a" + 1.5 == "a1.5") == true', 'boolean'],
    ['("a" + 1.5 == "a1.5") != ("b" + 2.5 == "b2.5")', 'boolean'],
    ['("a" + 1.5 == "a1.5") && true', 'boolean'],
    ['true || ("a" + 1.5 == "a1.5")', 'boolean'],
    ['("a" + 1.5 == "a1.5") && ("a" + 1.5 != "a1.5")', 'boolean'],
    ['(String) ("a" + 1.5)', 'String'],
    ['(String) ("a" + 1.5) + "b"', 'String'],
    ['(boolean) ("a" + 1.5 == "a1.5")', 'boolean'],
    ['("a" + 1.5 == "a1.5") + "z"', 'String'],
    ['"a" + (double) 1', 'String'],
    ['"a" + (1 + 0.5)', 'String'],
    ['"a" + Math.PI', 'String'],
    ['"a" + Double.MAX_VALUE', 'String'],
  ] as const)('%s es constante de valor desconocido, de tipo %s', (expr, tipoJava) => {
    expect(constante(expr)).toMatchObject({ valorDesconocido: true, tipoJava });
  });

  it.each(['("a" + 1.5) - 1', '("a" + 1.5) * 2', '("a" + 1.5) < "b"', '("a" + 1.5 == "a1.5") + 1', '("a" + 1.5 == "a1.5") < true', '-("a" + 1.5)', '("a" + 1.5) == 1', '("a" + 1.5 == "a1.5") && 1', '(int) ("a" + 1.5)', '(String) 5 + 1.5'])(
    '%s no es una expresión válida de Java: no es constante (null), el error de tipos lo da la atribución',
    (expr) => {
      expect(constante(expr)).toBeNull();
    },
  );
});

describe('valorConstante — comparaciones (JLS 15.29 incluye ==, !=, <, >, <=, >=)', () => {
  it('"5 == 5" -> true; "5 != 5" -> false', () => {
    expect(constante('5 == 5')).toEqual({ tipo: 'boolean', valor: true });
    expect(constante('5 != 5')).toEqual({ tipo: 'boolean', valor: false });
  });

  it('"3 < 5" -> true; "3 > 5" -> false', () => {
    expect(constante('3 < 5')).toEqual({ tipo: 'boolean', valor: true });
    expect(constante('3 > 5')).toEqual({ tipo: 'boolean', valor: false });
  });

  it('triangulación: comparación numérica MIXTA (int vs double) promueve antes de comparar', () => {
    expect(constante('5 == 5.0')).toEqual({ tipo: 'boolean', valor: true });
  });

  it('triangulación: comparación MIXTA (long vs int)', () => {
    expect(constante('10000000000L > 5')).toEqual({ tipo: 'boolean', valor: true });
  });
});

describe('valorConstante — operadores lógicos (JLS 15.29 incluye && y ||)', () => {
  it('"true && false" -> false; "true || false" -> true', () => {
    expect(constante('true && false')).toEqual({ tipo: 'boolean', valor: false });
    expect(constante('true || false')).toEqual({ tipo: 'boolean', valor: true });
  });
});

describe('valorConstante — casts a primitivo (JLS 15.29: "casts a primitivo")', () => {
  it('"(int) 3.99" trunca HACIA CERO (nunca floor): 3', () => {
    expect(constante('(int) 3.99')).toEqual({ tipo: 'int', valor: 3 });
  });

  it('"(int) -3.99" trunca hacia cero: -3 (NO -4, verificado contra javac en exploracion/03 §5)', () => {
    expect(constante('(int) -3.99')).toEqual({ tipo: 'int', valor: -3 });
  });

  it('"(char) 65" -> char 65 (\'A\')', () => {
    expect(constante('(char) 65')).toEqual({ tipo: 'char', valor: 65 });
  });

  it('"(long) 5" -> long 5n', () => {
    expect(constante('(long) 5')).toEqual({ tipo: 'long', valor: 5n });
  });

  it('"(double) 5" -> double 5.0', () => {
    expect(constante('(double) 5')).toEqual({ tipo: 'double', valor: 5 });
  });

  it('triangulación: "(int)(10000000000L)" trunca a los 32 bits bajos (exploracion/03 §5, verificado): 1410065408', () => {
    expect(constante('(int)(10000000000L)')).toEqual({ tipo: 'int', valor: 1410065408 });
  });
});

// Tarea 1.35 (WARNING 3 de la re-verificación del lote 1, falsos RECHAZOS): JLS 15.29 dice «casts a tipos primitivos y a `String`»: `(String) "a"` y
// `(boolean) true` son expresiones constantes (el cast es la identidad), y por eso `case (String) "a":` es una etiqueta válida y `if ((boolean) true)`
// es una condición constante para la asignación definitiva. Antes `plegarConversion` solo conocía los cuatro numéricos y daba `null` (javac compila).
describe('valorConstante — casts a String y a boolean (tarea 1.35, JLS 15.29: «casts a tipos primitivos y a String»)', () => {
  it('"(String) "a"" es la constante String "a"', () => {
    expect(constante('(String) "a"')).toEqual({ tipo: 'String', valor: 'a' });
  });

  it('triangulación: el operando puede ser una concatenación constante: "(String) ("a" + "b")" -> "ab"', () => {
    expect(constante('(String) ("a" + "b")')).toEqual({ tipo: 'String', valor: 'ab' });
  });

  it('"(boolean) true" y "(boolean) (1 < 2)" son la constante boolean true; "(boolean) false" es false', () => {
    expect(constante('(boolean) true')).toEqual({ tipo: 'boolean', valor: true });
    expect(constante('(boolean) (1 < 2)')).toEqual({ tipo: 'boolean', valor: true });
    expect(constante('(boolean) false')).toEqual({ tipo: 'boolean', valor: false });
  });

  it('control: un cast que Java rechaza NO es una constante (el error de cast lo da la atribución): "(int) true", "(boolean) 1", "(String) 5", "(char) "a""', () => {
    expect(constante('(int) true')).toBeNull();
    expect(constante('(boolean) 1')).toBeNull();
    expect(constante('(String) 5')).toBeNull();
    expect(constante('(char) "a"')).toBeNull();
  });
});

// Tarea 1.35 (WARNING 3, `final int A = 'a'; char c = A;`): JLS 4.12.4 + 5.2 — el valor de una VARIABLE CONSTANTE es el del inicializador ya CONVERTIDO al tipo
// declarado (`final int A = 'a'` guarda el `int` 97, no el `char`), y es ese `int` constante el que cabe en un `char` (estrechamiento de una constante).
// Antes cada pasada guardaba el valor plegado TAL CUAL salió del inicializador (un `char`), y la regla de estrechamiento no lo reconocía.
describe('constanteDeVariable — el valor de una variable `final` constante, convertido a su tipo declarado (tarea 1.35, JLS 4.12.4 y 5.2)', () => {
  it('`final int A = \'a\'`: el `char` 97 se guarda como el `int` 97', () => {
    expect(constanteDeVariable('int', { tipo: 'char', valor: 97 })).toEqual({ tipo: 'int', valor: 97 });
  });

  it('`final long L = 5` guarda un `long`, y `final double D = 5` / `final double D = 5L` guardan un `double` (ensanchamiento, JLS 5.1.2)', () => {
    expect(constanteDeVariable('long', { tipo: 'int', valor: 5 })).toEqual({ tipo: 'long', valor: 5n });
    expect(constanteDeVariable('double', { tipo: 'int', valor: 5 })).toEqual({ tipo: 'double', valor: 5 });
    expect(constanteDeVariable('double', { tipo: 'long', valor: 5n })).toEqual({ tipo: 'double', valor: 5 });
    expect(constanteDeVariable('double', { tipo: 'char', valor: 97 })).toEqual({ tipo: 'double', valor: 97 });
  });

  it('`final char C = 65`: la constante `int` que cabe en un `char` se guarda como `char`; si no cabe (70000, -1) no es una constante (el error de asignación lo da la atribución)', () => {
    expect(constanteDeVariable('char', { tipo: 'int', valor: 65 })).toEqual({ tipo: 'char', valor: 65 });
    expect(constanteDeVariable('char', { tipo: 'int', valor: 70000 })).toBeUndefined();
    expect(constanteDeVariable('char', { tipo: 'int', valor: -1 })).toBeUndefined();
  });

  it('identidad para `boolean` y `String`, y para un valor que ya es del tipo declarado', () => {
    expect(constanteDeVariable('boolean', { tipo: 'boolean', valor: true })).toEqual({ tipo: 'boolean', valor: true });
    expect(constanteDeVariable('String', { tipo: 'String', valor: 'a' })).toEqual({ tipo: 'String', valor: 'a' });
    expect(constanteDeVariable('int', { tipo: 'int', valor: 7 })).toEqual({ tipo: 'int', valor: 7 });
  });

  it('control: una asignación que Java rechaza, o un tipo que no puede ser constante (`Scanner`, `Random`), o ningún valor, no deja ninguna constante', () => {
    expect(constanteDeVariable('int', { tipo: 'long', valor: 5n })).toBeUndefined();
    expect(constanteDeVariable('int', { tipo: 'double', valor: 5 })).toBeUndefined();
    expect(constanteDeVariable('String', { tipo: 'int', valor: 5 })).toBeUndefined();
    expect(constanteDeVariable('boolean', { tipo: 'int', valor: 1 })).toBeUndefined();
    expect(constanteDeVariable('Scanner', { tipo: 'String', valor: 'a' })).toBeUndefined();
    expect(constanteDeVariable('int', null)).toBeUndefined();
  });
});

describe('valorConstante — campos constantes reconocidos (Integer/Long/Double.MAX_VALUE/MIN_VALUE, Math.PI/E)', () => {
  it('Integer.MAX_VALUE / MIN_VALUE', () => {
    expect(constante('Integer.MAX_VALUE')).toEqual({ tipo: 'int', valor: 2147483647 });
    expect(constante('Integer.MIN_VALUE')).toEqual({ tipo: 'int', valor: -2147483648 });
  });

  it('Long.MAX_VALUE / MIN_VALUE', () => {
    expect(constante('Long.MAX_VALUE')).toEqual({ tipo: 'long', valor: 9223372036854775807n });
    expect(constante('Long.MIN_VALUE')).toEqual({ tipo: 'long', valor: -9223372036854775808n });
  });

  it('Double.MAX_VALUE / MIN_VALUE', () => {
    expect(constante('Double.MAX_VALUE')).toEqual({ tipo: 'double', valor: 1.7976931348623157e308 });
    expect(constante('Double.MIN_VALUE')).toEqual({ tipo: 'double', valor: 4.9e-324 });
  });

  it('Math.PI / Math.E (bit-idénticos a Java: ambos son "el double más cercano a la constante real")', () => {
    expect(constante('Math.PI')).toEqual({ tipo: 'double', valor: Math.PI });
    expect(constante('Math.E')).toEqual({ tipo: 'double', valor: Math.E });
  });

  it('triangulación real de diseño: usar un campo constante dentro de una expresión mayor', () => {
    expect(constante('Integer.MAX_VALUE > 0')).toEqual({ tipo: 'boolean', valor: true });
  });
});

describe('valorConstante — lo que NO es una expresión constante da null (D2: nunca inventar)', () => {
  it('una llamada a método nunca es constante (JLS 15.29 jamás incluye invocaciones)', () => {
    expect(constante('Math.abs(-5)')).toBeNull();
  });

  it('una variable local NO "final" da null (sigue sin ser una expresión constante, JLS 4.12.4)', () => {
    const fuente = 'class C { public static void main(String[] a) { int n = 5; int x = n; } }';
    const programa = analizarPrograma(tokenizar(fuente));
    const decl = programa.clase.main!.cuerpo.elementos[1] as NodoDeclaracionLocal;
    const expr = decl.declaradores[0]!.inicializador!;
    expect(valorConstante(expr, new Alcance())).toBeNull();
  });
});

describe('una variable `final` con inicializador de valor desconocido es una constante de valor desconocido (C-5 y W-10, tarea 1.36)', () => {
  const textoDesconocido = { valorDesconocido: true, tipoJava: 'String', medida: { unidades: 1, bytes: 1, partesDeLargoDesconocido: 1 } } as const;
  const booleanoDesconocido = { valorDesconocido: true, tipoJava: 'boolean' } as const;

  it('`constanteDeVariable` conserva un String desconocido para un `String` y un boolean desconocido para un `boolean`', () => {
    expect(constanteDeVariable('String', textoDesconocido)).toEqual(textoDesconocido);
    expect(constanteDeVariable('boolean', booleanoDesconocido)).toEqual(booleanoDesconocido);
  });

  it.each(['int', 'long', 'double', 'char'])('`constanteDeVariable` no guarda un String desconocido en una variable `%s` (la asignación no es válida: el error es de la atribución)', (tipo) => {
    expect(constanteDeVariable(tipo, textoDesconocido)).toBeUndefined();
    expect(constanteDeVariable(tipo, booleanoDesconocido)).toBeUndefined();
  });

  it('un boolean desconocido no cabe en un `String`, ni al revés', () => {
    expect(constanteDeVariable('String', booleanoDesconocido)).toBeUndefined();
    expect(constanteDeVariable('boolean', textoDesconocido)).toBeUndefined();
  });

  it('el símbolo guardado se lee de vuelta, y se compone: `K == "a1.5"` y `K + "z"` con `final String K = "a" + 1.5`', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'K', tipo: 'String', esFinal: true, rango: { inicio: 0, fin: 0 }, constante: textoDesconocido });
    const k: NodoExpresion = { tipo: 'nombre', nombre: 'K', rango: { inicio: 0, fin: 0 } };
    expect(valorConstante(k, alcance)).toEqual(textoDesconocido);
    const comparacion = expresionDe('K == "a1.5"');
    expect(valorConstante(comparacion, alcance)).toMatchObject({ valorDesconocido: true, tipoJava: 'boolean' });
    expect(valorConstante(expresionDe('K + "zz"'), alcance)).toEqual({ valorDesconocido: true, tipoJava: 'String', medida: { unidades: 3, bytes: 3, partesDeLargoDesconocido: 1 } });
  });

  it('una variable que NO es `final` nunca es constante, aunque se le haya asignado un texto con decimales', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'K', tipo: 'String', esFinal: false, rango: { inicio: 0, fin: 0 } });
    expect(valorConstante(expresionDe('K + 1.5'), alcance)).toBeNull();
  });
});

// Deuda 3 del commit 999a8ca (JLS 4.12.4, "variable constante"): una local "final" con
// inicializador constante ES una expresión constante — el mismo `Alcance` que arma `atribucion.ts`
// (vía `SimboloVariable.constante`), pero aquí se construye A MANO para probar `valorConstante`
// (`constantes.ts`) de forma aislada, sin pasar por el resto de la pasada de atribución.
describe('valorConstante — variables "final" CON inicializador constante SÍ participan (deuda 3 del commit 999a8ca, JLS 4.12.4)', () => {
  it('una variable "final" con el campo `constante` ya resuelto en el Alcance se lee de vuelta tal cual', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({
      nombre: 'MAX',
      tipo: 'int',
      esFinal: true,
      rango: { inicio: 0, fin: 0 },
      constante: { tipo: 'int', valor: 3 },
    });
    const nodoNombre: NodoExpresion = { tipo: 'nombre', nombre: 'MAX', rango: { inicio: 0, fin: 0 } };
    expect(valorConstante(nodoNombre, alcance)).toEqual({ tipo: 'int', valor: 3 });
  });

  it('una variable "final" SIN `constante` resuelto (inicializador no constante) da null, nunca inventa un valor', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'N', tipo: 'int', esFinal: true, rango: { inicio: 0, fin: 0 } });
    expect(valorConstante({ tipo: 'nombre', nombre: 'N', rango: { inicio: 0, fin: 0 } }, alcance)).toBeNull();
  });

  it('caso insignia EXACTO verificado contra javac 17 real (corpus/experimentos/texto/str03_folding_final_vars.java): "final String A=\'ho\'; final String B=\'la\'; (A+B)==\'hola\'" -> true (interning real vía variables constantes)', () => {
    // El programa real de la oracle imprime "true" (str03_folding_final_vars.salida) — aquí se
    // verifica el HECHO de compilación que lo produce: la concatenación de dos variables "final"
    // constantes se pliega y se interna EXACTAMENTE igual que la de dos literales (str02).
    const fuente = [
      'class C {',
      '  public static void main(String[] a) {',
      '    final String x = "ho";',
      '    final String y = "la";',
      '    boolean r = (x + y) == "hola";',
      '  }',
      '}',
    ].join('\n');
    const programa = analizarPrograma(tokenizar(fuente));
    const cuerpo = programa.clase.main!.cuerpo.elementos;
    const declX = cuerpo[0] as NodoDeclaracionLocal;
    const declY = cuerpo[1] as NodoDeclaracionLocal;
    const declR = cuerpo[2] as NodoDeclaracionLocal;

    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({
      nombre: 'x',
      tipo: 'String',
      esFinal: true,
      rango: declX.rango,
      constante: valorConstante(declX.declaradores[0]!.inicializador!, alcance) ?? undefined,
    });
    alcance.declarar({
      nombre: 'y',
      tipo: 'String',
      esFinal: true,
      rango: declY.rango,
      constante: valorConstante(declY.declaradores[0]!.inicializador!, alcance) ?? undefined,
    });

    const expresionR = declR.declaradores[0]!.inicializador!;
    expect(valorConstante(expresionR, alcance)).toEqual({ tipo: 'boolean', valor: true });
  });
});
