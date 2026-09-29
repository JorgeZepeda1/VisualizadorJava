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
import { valorConstante } from './constantes.ts';
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

// Deuda del commit 999a8ca (sub-lote 1-D1): el stub `textoDoubleTemporal` formateaba un `double`
// con reglas propias, no con el `Double.toString` real de Java (design.md §4.2) -- un resultado
// INVENTADO (regla 5 de CLAUDE.md). Hasta que la tarea 2.4 traiga `digitosJava`/`Double.toString`
// real, una concatenación de cadena con CUALQUIER operando `double` (o cualquier conversión de
// `double` a texto) NO es una expresión constante para el plegado: da `null`, nunca un String
// inventado. `"x=" + 2.0` ya NO produce `{tipo:'String', valor:'x=2.0'}` (comportamiento del stub,
// retirado) -- ver `plegarBinaria` en constantes.ts.
describe('valorConstante — "+" con double concatenado a String: NUNCA constante hasta 2.4 (D2, deuda del commit 999a8ca)', () => {
  it('"x=" + 1.5 (double a la derecha) da null: ningún Double.toString real todavía', () => {
    expect(constante('"x=" + 1.5')).toBeNull();
  });

  it('triangulación: "1.5" + "x=" (double a la IZQUIERDA) también da null', () => {
    expect(constante('1.5 + "x="')).toBeNull();
  });

  it('triangulación: una conversión de double a texto ANIDADA (double + double, sin literal directo) también da null', () => {
    expect(constante('"x=" + (1.0 + 2.0)')).toBeNull();
  });

  it('control: concatenar con int/long/char/boolean SIGUE plegando normal (nunca se tocó su camino)', () => {
    expect(constante('"n=" + 5')).toEqual({ tipo: 'String', valor: 'n=5' });
  });
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
