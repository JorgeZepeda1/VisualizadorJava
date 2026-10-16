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

// Tarea 2.4 (cierre de la 1.36, hito 1 parte C): ahora que `Double.toString` es exacto (los 3 millones de `double` del JDK 17 real), `"x=" + 1.5` se PLIEGA como cualquier otra constante de texto. Antes
// (deuda del commit 999a8ca y tarea 1.36, C-5 y W-10) el motor no sabía convertir un `double` a texto: ni daba `null` («no es constante», un resultado inventado: de que una expresión sea constante
// dependen la alcanzabilidad de un ciclo, la asignación definitiva y las etiquetas `case`) ni un valor, sino un tercer estado «constante de valor desconocido» que obligaba a los tres a dar un aviso.
// Ese tercer estado ya no existe: una constante es de valor conocido o no es constante.
describe('valorConstante — "+" con double concatenado a String: se pliega con el Double.toString de Java (tarea 2.4, cierre de la 1.36)', () => {
  it.each([
    ['"x=" + 1.5', 'x=1.5'],
    ['1.5 + "x="', '1.5x='],
    ['"x=" + (1.0 + 2.0)', 'x=3.0'],
    ['"é" + 1.5 + "ñ" + 2.5', 'é1.5ñ2.5'],
    ['"a" + (double) 1', 'a1.0'],
    ['"a" + (1 + 0.5)', 'a1.5'],
    ['"a" + Math.PI', 'a3.141592653589793'],
    ['"a" + Math.E', 'a2.718281828459045'],
    ['"a" + Double.MAX_VALUE', 'a1.7976931348623157E308'],
    ['"a" + Double.MIN_VALUE', 'a4.9E-324'],
    ['"v=" + 100.0', 'v=100.0'],
    ['"v=" + 1.0E7', 'v=1.0E7'],
    ['"v=" + 9999999.0', 'v=9999999.0'],
    ['"v=" + 0.001', 'v=0.001'],
    ['"v=" + 0.0001', 'v=1.0E-4'],
    ['"n=" + (0.1 + 0.2)', 'n=0.30000000000000004'],
    ['"d=" + (1.0 / 0)', 'd=Infinity'],
    ['"d=" + (0.0 / 0)', 'd=NaN'],
    ['"d=" + -(0.0)', 'd=-0.0'],
    ['"m=" + (double) 9007199254740993L', 'm=9.007199254740992E15'],
  ] as const)('%s -> "%s"', (expr, texto) => {
    expect(constante(expr)).toEqual({ tipo: 'String', valor: texto });
  });

  it('un String concatenado con algo conocido (int, char, boolean, otro decimal) sigue plegando: el texto exacto, de izquierda a derecha', () => {
    expect(constante('("a" + 1.5) + "bc" + 7 + \'z\' + true')).toEqual({ tipo: 'String', valor: 'a1.5bc7ztrue' });
    expect(constante('7 + ("a" + 1.5)')).toEqual({ tipo: 'String', valor: '7a1.5' });
  });

  it('control: concatenar con int/long/char/boolean SIGUE plegando normal (nunca se tocó su camino)', () => {
    expect(constante('"n=" + 5')).toEqual({ tipo: 'String', valor: 'n=5' });
    expect(constante('"n=" + 5L')).toEqual({ tipo: 'String', valor: 'n=5' });
  });

  it('control: un `double` solo (sin texto) y la aritmética con doubles SIGUEN siendo constantes conocidas', () => {
    expect(constante('1.5 + 2.5')).toEqual({ tipo: 'double', valor: 4 });
    expect(constante('1.5 == 1.5')).toEqual({ tipo: 'boolean', valor: true });
  });

  it('control: con un operando que NO es constante (una llamada, una variable que no es `final`) NO es constante', () => {
    expect(constante('"x=" + Math.abs(1.5)')).toBeNull();
    expect(constante('("x=" + 1.5).length()')).toBeNull();
  });
});

describe('valorConstante — lo que sale de un texto con un decimal: comparaciones, negación, casts (C-5 y W-10, cierre de la 1.36)', () => {
  it.each([
    ['"a" + 1.5 == "a1.5"', true],
    ['"a" + 1.5 != "a1.5"', false],
    ['"a" + 1.5 == "a1.50"', false],
    ['"" + 1.0 == "1.0"', true],
    ['"a" + 1.5 == "a" + 1.5', true],
    ['1.5 + "a" == "1.5a"', true],
    ['"a1.5" == "a" + 1.5', true],
    ['"a" + (double) 2 == "a2.0"', true],
    ['!("a" + 1.5 == "a1.5")', false],
    ['("a" + 1.5 == "a1.5") == true', true],
    ['("a" + 1.5 == "a1.5") != ("b" + 2.5 == "b2.5")', false],
    ['("a" + 1.5 == "a1.5") && true', true],
    ['true || ("a" + 1.5 == "a1.5")', true],
    ['("a" + 1.5 == "a1.5") && ("a" + 1.5 != "a1.5")', false],
    ['(boolean) ("a" + 1.5 == "a1.5")', true],
  ] as const)('%s vale %s', (expr, valor) => {
    expect(constante(expr)).toEqual({ tipo: 'boolean', valor });
  });

  it.each([
    ['(String) ("a" + 1.5)', 'a1.5'],
    ['(String) ("a" + 1.5) + "b"', 'a1.5b'],
    ['("a" + 1.5 == "a1.5") + "z"', 'truez'],
  ] as const)('%s es el texto "%s"', (expr, valor) => {
    expect(constante(expr)).toEqual({ tipo: 'String', valor });
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

describe('una variable `final` con inicializador "a" + 1.5 es una constante de valor conocido (C-5 y W-10, cierre de la 1.36)', () => {
  const texto = { tipo: 'String', valor: 'a1.5' } as const;
  const booleano = { tipo: 'boolean', valor: true } as const;

  it('`constanteDeVariable` conserva el texto plegado para un `String` y el boolean para un `boolean`', () => {
    expect(constanteDeVariable('String', texto)).toEqual(texto);
    expect(constanteDeVariable('boolean', booleano)).toEqual(booleano);
  });

  it('el símbolo guardado se lee de vuelta, y se compone: `K == "a1.5"` y `K + "zz"` con `final String K = "a" + 1.5`', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'K', tipo: 'String', esFinal: true, rango: { inicio: 0, fin: 0 }, constante: texto });
    const k: NodoExpresion = { tipo: 'nombre', nombre: 'K', rango: { inicio: 0, fin: 0 } };
    expect(valorConstante(k, alcance)).toEqual(texto);
    expect(valorConstante(expresionDe('K == "a1.5"'), alcance)).toEqual({ tipo: 'boolean', valor: true });
    expect(valorConstante(expresionDe('K + "zz"'), alcance)).toEqual({ tipo: 'String', valor: 'a1.5zz' });
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
