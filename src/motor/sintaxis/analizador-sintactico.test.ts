// RED de la tarea 0.12 (rebanada vertical — motor mínimo, design.md §2.3). Cubre exactamente la
// gramática Programa→Clase→Main→Bloque→println(literal), incluidos los modificadores opcionales
// (design.md §2.3: "{ 'public' | 'static' | 'final' }") y el caso de más de una sentencia.
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { analizarPrograma } from './analizador-sintactico.ts';
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';
import type { NodoExpresion, NodoImpresion } from './ast.ts';

function analizar(fuente: string) {
  return analizarPrograma(tokenizar(fuente));
}

// Tarea 1.8: `NodoImpresion.argumento` ahora es `NodoExpresion` general (antes solo
// `NodoLiteralCadena`, 0.12) — estas pruebas de la rebanada vertical siguen construyendo
// únicamente literales-cadena, así que basta angostar aquí en vez de repetir el chequeo.
function valorLiteralCadena(argumento: NodoExpresion): string {
  if (argumento.tipo !== 'literal-cadena') throw new Error(`se esperaba un literal-cadena, no "${argumento.tipo}"`);
  return argumento.valor;
}

describe('analizarPrograma', () => {
  it('analiza el programa dorado u3-hola-mundo completo', () => {
    const fuente = [
      'public class MiPrograma {',
      '    public static void main(String[] args) {',
      '        System.out.println("Hola, mundo");',
      '    }',
      '}',
    ].join('\n');

    const programa = analizar(fuente);

    expect(programa.clase.nombre).toBe('MiPrograma');
    expect(programa.clase.main.parametro).toBe('args');
    expect(programa.clase.main.cuerpo.elementos).toHaveLength(1);
    const [sentencia] = programa.clase.main.cuerpo.elementos as NodoImpresion[];
    expect(sentencia.tipo).toBe('impresion');
    expect(valorLiteralCadena(sentencia.argumento)).toBe('Hola, mundo');
  });

  it('acepta una clase sin "public" y modificadores de main en otro orden (triangulación)', () => {
    const fuente =
      'class OtraClase { static public void main(String[] parametros) { System.out.println("otra"); } }';
    const programa = analizar(fuente);
    const [sentencia] = programa.clase.main.cuerpo.elementos as NodoImpresion[];
    expect(programa.clase.nombre).toBe('OtraClase');
    expect(programa.clase.main.parametro).toBe('parametros');
    expect(valorLiteralCadena(sentencia.argumento)).toBe('otra');
  });

  it('acepta varias sentencias println dentro del mismo bloque, en orden', () => {
    const fuente =
      'class C { public static void main(String[] a) { System.out.println("uno"); System.out.println("dos"); } }';
    const programa = analizar(fuente);
    const valores = (programa.clase.main.cuerpo.elementos as NodoImpresion[]).map((s) =>
      valorLiteralCadena(s.argumento),
    );
    expect(valores).toEqual(['uno', 'dos']);
  });

  it('lanza ErrorDeCompilacion con rango si falta el punto y coma', () => {
    const fuente = 'class C { public static void main(String[] a) { System.out.println("x") } }';
    expect(() => analizar(fuente)).toThrow(ErrorDeCompilacion);
  });

  it('lanza ErrorDeCompilacion si el programa está vacío (falta la clase)', () => {
    expect(() => analizar('')).toThrow(ErrorDeCompilacion);
  });
});

describe('analizarPrograma — núcleo del programa (tarea 1.2, REQ-SUB-001)', () => {
  it('ignora una línea "package" sin rechazarla ni guardarla', () => {
    const fuente =
      'package paquetedeprueba; class C { public static void main(String[] a) { System.out.println("x"); } }';
    const programa = analizar(fuente);
    expect(programa.clase.nombre).toBe('C');
  });

  it('acepta un import simple de Scanner y lo registra en el AST', () => {
    const fuente =
      'import java.util.Scanner; class C { public static void main(String[] a) { System.out.println("x"); } }';
    const programa = analizar(fuente);
    expect(programa.importaciones).toEqual([
      { tipo: 'importacion', nombre: 'java.util.Scanner', comodin: false, rango: { inicio: 0, fin: 25 } },
    ]);
  });

  it('acepta varios imports, incluido uno con comodín (triangulación de import)', () => {
    const fuente = [
      'import java.util.Random;',
      'import java.util.*;',
      'class C { public static void main(String[] a) { System.out.println("x"); } }',
    ].join('\n');
    const programa = analizar(fuente);
    expect(programa.importaciones.map((i) => ({ nombre: i.nombre, comodin: i.comodin }))).toEqual([
      { nombre: 'java.util.Random', comodin: false },
      { nombre: 'java.util', comodin: true },
    ]);
  });

  it('acepta las 3 formas de parámetro de main: String[] args', () => {
    const programa = analizar('class C { public static void main(String[] args) { return; } }');
    expect(programa.clase.main.parametro).toBe('args');
  });

  it('acepta las 3 formas de parámetro de main: String args[]', () => {
    const programa = analizar('class C { public static void main(String args[]) { return; } }');
    expect(programa.clase.main.parametro).toBe('args');
  });

  it('acepta las 3 formas de parámetro de main: String... args (varargs)', () => {
    const programa = analizar('class C { public static void main(String... args) { return; } }');
    expect(programa.clase.main.parametro).toBe('args');
  });

  it('acepta "return;" como sentencia dentro de main', () => {
    const fuente =
      'class C { public static void main(String[] a) { System.out.println("x"); return; } }';
    const programa = analizar(fuente);
    expect(programa.clase.main.cuerpo.elementos.map((e) => e.tipo)).toEqual(['impresion', 'retorno']);
  });
});

describe('analizarPrograma — declaraciones locales (tarea 1.2, DeclLocal)', () => {
  it('acepta una declaración de tipo primitivo con inicializador literal', () => {
    const fuente = 'class C { public static void main(String[] a) { int x = 5; } }';
    const programa = analizar(fuente);
    const [declaracion] = programa.clase.main.cuerpo.elementos;
    expect(declaracion).toMatchObject({
      tipo: 'declaracion-local',
      esFinal: false,
      nombreTipo: 'int',
      declaradores: [{ tipo: 'declarador', nombre: 'x' }],
    });
  });

  it('acepta "final" y varios declaradores separados por coma', () => {
    const fuente = 'class C { public static void main(String[] a) { final double x = 1.5, y = 2.5; } }';
    const programa = analizar(fuente);
    const [declaracion] = programa.clase.main.cuerpo.elementos as [
      import('./ast.ts').NodoDeclaracionLocal,
    ];
    expect(declaracion.esFinal).toBe(true);
    expect(declaracion.declaradores.map((d) => d.nombre)).toEqual(['x', 'y']);
  });

  it('acepta un declarador sin inicializador', () => {
    const fuente = 'class C { public static void main(String[] a) { boolean listo; } }';
    const programa = analizar(fuente);
    const [declaracion] = programa.clase.main.cuerpo.elementos as [
      import('./ast.ts').NodoDeclaracionLocal,
    ];
    expect(declaracion.declaradores[0].inicializador).toBeNull();
  });

  it('acepta una declaración con tipo por referencia (String) — triangulación de "Nombre Id"', () => {
    const fuente = 'class C { public static void main(String[] a) { String s = "hola"; } }';
    const programa = analizar(fuente);
    const [declaracion] = programa.clase.main.cuerpo.elementos as [
      import('./ast.ts').NodoDeclaracionLocal,
    ];
    expect(declaracion.nombreTipo).toBe('String');
    expect(declaracion.declaradores[0].inicializador).toMatchObject({ tipo: 'literal-cadena', valor: 'hola' });
  });

  it('acepta declarar un Scanner con "new" como inicializador', () => {
    const fuente =
      'class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); } }';
    const programa = analizar(fuente);
    const [declaracion] = programa.clase.main.cuerpo.elementos as [
      import('./ast.ts').NodoDeclaracionLocal,
    ];
    expect(declaracion.nombreTipo).toBe('Scanner');
    expect(declaracion.declaradores[0].inicializador).toMatchObject({
      tipo: 'nueva-instancia',
      nombreTipo: 'Scanner',
    });
  });

  it('varias declaraciones y sentencias se intercalan en orden dentro del mismo bloque', () => {
    const fuente = [
      'class C { public static void main(String[] a) {',
      '  int x = 1;',
      '  System.out.println("hola");',
      '  double y = 2.5;',
      '} }',
    ].join('\n');
    const programa = analizar(fuente);
    expect(programa.clase.main.cuerpo.elementos.map((e) => e.tipo)).toEqual([
      'declaracion-local',
      'impresion',
      'declaracion-local',
    ]);
  });
});

// Tarea 1.8 (pendiente heredado del sub-lote 1-B): `System.out.println`/`print` solo aceptaban un
// literal-cadena (0.12). Las sobrecargas reales de `PrintStream` (REQ-BIB-011) se resuelven en
// `semantica/sobrecargas.ts`; aquí solo se generaliza la SINTAXIS: `print` (no solo `println`) y
// cualquier expresión como argumento (no solo un literal-cadena).
describe('analizarImpresion — generalización a print/println con cualquier expresión (pendiente heredado)', () => {
  it('"System.out.print(...)" (sin la "l" de println) ahora SÍ se reconoce como sentencia de impresión', () => {
    const [sentencia] = primeraSentenciaDe('System.out.print("sin salto");') as [NodoImpresion];
    expect(sentencia.tipo).toBe('impresion');
    expect(sentencia).toMatchObject({ metodo: 'print', argumento: { tipo: 'literal-cadena', valor: 'sin salto' } });
  });

  it('"System.out.println(x)" con una VARIABLE como argumento (no solo un literal-cadena)', () => {
    const fuente = 'class C { public static void main(String[] a) { int x = 5; System.out.println(x); } }';
    const programa = analizar(fuente);
    const [, sentencia] = programa.clase.main.cuerpo.elementos as [unknown, NodoImpresion];
    expect(sentencia).toMatchObject({ tipo: 'impresion', metodo: 'println', argumento: { tipo: 'nombre', nombre: 'x' } });
  });

  it('triangulación: "println" de una expresión aritmética (n + 1)', () => {
    const fuente = 'class C { public static void main(String[] a) { int n = 1; System.out.println(n + 1); } }';
    const programa = analizar(fuente);
    const [, sentencia] = programa.clase.main.cuerpo.elementos as [unknown, NodoImpresion];
    expect(sentencia.argumento.tipo).toBe('binaria');
  });

  it('control: "println()" sin argumentos sigue sin aceptarse igual que antes (println vacío no es 0.12/1.8, queda NO-DISP más adelante si hace falta)', () => {
    // No se pidió en ningún RED de 1.5/1.6/1.8 — se documenta el comportamiento actual (falla al
    // parsear como sentencia de impresión) en vez de fingir soporte no verificado (D2).
    expect(() => analizar('class C { public static void main(String[] a) { System.out.println(); } }')).toThrow(
      ErrorDeCompilacion,
    );
  });
});

function primeraSentenciaDe(cuerpoDeMain: string) {
  const programa = analizar(`class C { public static void main(String[] a) { ${cuerpoDeMain} } }`);
  return programa.clase.main.cuerpo.elementos;
}
