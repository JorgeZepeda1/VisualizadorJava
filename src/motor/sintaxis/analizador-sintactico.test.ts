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
function valorLiteralCadena(argumento: NodoExpresion | null): string {
  // Corrección obligatoria (sub-lote 1-C2): `argumento` ahora admite `null` (println() vacío) —
  // ninguna de las pruebas que usan este helper pasa ese caso, así que null sigue siendo un fallo
  // real y explícito (D2), nunca un valor inventado.
  if (argumento === null) throw new Error('se esperaba un literal-cadena, no null (¿"println()" vacío?)');
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
    expect(programa.clase.main!.parametro).toBe('args');
    expect(programa.clase.main!.cuerpo.elementos).toHaveLength(1);
    const [sentencia] = programa.clase.main!.cuerpo.elementos as NodoImpresion[];
    expect(sentencia.tipo).toBe('impresion');
    expect(valorLiteralCadena(sentencia.argumento)).toBe('Hola, mundo');
  });

  it('acepta una clase sin "public" y modificadores de main en otro orden (triangulación)', () => {
    const fuente =
      'class OtraClase { static public void main(String[] parametros) { System.out.println("otra"); } }';
    const programa = analizar(fuente);
    const [sentencia] = programa.clase.main!.cuerpo.elementos as NodoImpresion[];
    expect(programa.clase.nombre).toBe('OtraClase');
    expect(programa.clase.main!.parametro).toBe('parametros');
    expect(valorLiteralCadena(sentencia.argumento)).toBe('otra');
  });

  it('acepta varias sentencias println dentro del mismo bloque, en orden', () => {
    const fuente =
      'class C { public static void main(String[] a) { System.out.println("uno"); System.out.println("dos"); } }';
    const programa = analizar(fuente);
    const valores = (programa.clase.main!.cuerpo.elementos as NodoImpresion[]).map((s) =>
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
    expect(programa.clase.main!.parametro).toBe('args');
  });

  it('acepta las 3 formas de parámetro de main: String args[]', () => {
    const programa = analizar('class C { public static void main(String args[]) { return; } }');
    expect(programa.clase.main!.parametro).toBe('args');
  });

  it('acepta las 3 formas de parámetro de main: String... args (varargs)', () => {
    const programa = analizar('class C { public static void main(String... args) { return; } }');
    expect(programa.clase.main!.parametro).toBe('args');
  });

  it('acepta "return;" como sentencia dentro de main', () => {
    const fuente =
      'class C { public static void main(String[] a) { System.out.println("x"); return; } }';
    const programa = analizar(fuente);
    expect(programa.clase.main!.cuerpo.elementos.map((e) => e.tipo)).toEqual(['impresion', 'retorno']);
  });
});

// Tarea 1.15 (REQ-COMP-007/008, ADR 004 pasada 5 "arranque"): javac SÍ compila un programa sin
// "static" en "main", o incluso sin ningún "main" -- el lanzador (java, no javac) es quien lo
// rechaza, al EJECUTAR (exploracion/03 §4.2, verificado contra el JDK real). Antes de esta tarea,
// `analizarClase` trataba "sin main" como un error de SINTAXIS genérico (ver el comentario que
// dejó la tarea 1.5 en `analizador-sintactico.ts`, "REQ-COMP-008... llega con la tarea 1.15") --
// eso violaba REQ-COMP-006 (javac SÍ acepta ese programa) y hacía el error indistinguible de un
// "class, interface, enum, or record expected" real.
describe('analizarPrograma — arranque (tarea 1.15, REQ-COMP-007/008): "main" opcional, "static" registrado', () => {
  it('una clase sin ningún "main" NO lanza -- el AST la marca con clase.main === null (antes: ErrorDeCompilacion genérico)', () => {
    const programa = analizar('public class SinMain { }');
    expect(programa.clase.nombre).toBe('SinMain');
    expect(programa.clase.main).toBeNull();
  });

  it('"public void main" (sin "static") no lanza; NodoMain.esEstatico es false', () => {
    const programa = analizar('public class Demo { public void main(String[] args) { } }');
    expect(programa.clase.main).not.toBeNull();
    expect(programa.clase.main?.esEstatico).toBe(false);
  });

  it('triangulación: "public static void main" (con "static") da esEstatico true -- el caso normal sigue intacto', () => {
    const programa = analizar('public class MiPrograma { public static void main(String[] args) { } }');
    expect(programa.clase.main?.esEstatico).toBe(true);
  });
});

// Sub-lote 1-D2c (design.md §2.1: "main sin static, sin main, no public" -- el 3er caso nunca se
// había verificado, task_0b5b6e47). `NodoMain` gana `esPublico` con el MISMO mecanismo que ya
// tiene `esEstatico` (1.15): `consumirModificadores` ya devolvía el conjunto REAL visto.
describe('analizarPrograma — "esPublico" registrado en NodoMain (sub-lote 1-D2c, main sin public)', () => {
  it('"static void main" (SIN "public") no lanza; NodoMain.esPublico es false', () => {
    const programa = analizar('class C { static void main(String[] args) { } }');
    expect(programa.clase.main).not.toBeNull();
    expect(programa.clase.main?.esPublico).toBe(false);
    expect(programa.clase.main?.esEstatico).toBe(true);
  });

  it('triangulación: "public static void main" (con "public") da esPublico true -- el caso normal sigue intacto', () => {
    const programa = analizar('public class MiPrograma { public static void main(String[] args) { } }');
    expect(programa.clase.main?.esPublico).toBe(true);
  });

  it('triangulación: "void main" (SIN ningún modificador) también da esPublico false', () => {
    const programa = analizar('class C { void main(String[] args) { } }');
    expect(programa.clase.main?.esPublico).toBe(false);
  });
});

// Sub-lote 1-D2c: hallazgo al verificar las 4 firmas de "main" que pidió el orquestador contra el
// JDK real -- "public static void main()" (SIN el parámetro String[]) SÍ compila con javac (es
// solo un método público estático más, ajeno al lanzador: "no suitable method" nunca aplica, el
// LANZADOR simplemente no lo encuentra como punto de entrada). Antes de esta corrección,
// `pareceMain` se comprometía a interpretarlo como Main en cuanto veía "void main", y
// `analizarParamMain` reventaba con un error de sintaxis genérico al no encontrar "String" — un
// veredicto FALSO (javac compila limpio) que REQ-COMP-006 prohíbe (D2, nunca más estricto que
// javac). Ahora `pareceMain` exige que lo que sigue a "(" empiece como un ParamMain real
// ("final"/"String") antes de comprometerse -- si no, cae en el camino de "métodos propios"
// (REQ-SUB-007), IGUAL que "public static int main(String[] args)" (retorno equivocado) ya caía.
describe('analizarPrograma — "public static void main()" sin el parámetro String[] (sub-lote 1-D2c, verificado contra javac 17 real)', () => {
  it('NO lanza ErrorDeCompilacion (antes: fallaba con "se esperaba String") -- javac SÍ compila esto limpio', () => {
    expect(() => analizar('public class CaseC { public static void main() { } }')).not.toThrow();
  });

  it('se trata como un método propio NO-DISP (REQ-SUB-007), nunca como Main real -- clase.main sigue null', () => {
    const programa = analizar('public class CaseC { public static void main() { } }');
    expect(programa.clase.main).toBeNull();
    expect(programa.clase.otrosMiembros).toHaveLength(1);
  });

  it('control: "public static int main(String[] args)" (retorno equivocado) YA caía como método propio antes de esta corrección -- sigue intacto', () => {
    const programa = analizar('public class CaseB { public static int main(String[] args) { return 0; } }');
    expect(programa.clase.main).toBeNull();
    expect(programa.clase.otrosMiembros).toHaveLength(1);
  });

  it('control: las 3 formas reales de ParamMain siguen reconociéndose como Main de verdad (sin falsos negativos)', () => {
    expect(analizar('class C { public static void main(String[] args) { } }').clase.main).not.toBeNull();
    expect(analizar('class C { public static void main(String args[]) { } }').clase.main).not.toBeNull();
    expect(analizar('class C { public static void main(String... args) { } }').clase.main).not.toBeNull();
    expect(analizar('class C { public static void main(final String[] args) { } }').clase.main).not.toBeNull();
  });
});

describe('analizarPrograma — declaraciones locales (tarea 1.2, DeclLocal)', () => {
  it('acepta una declaración de tipo primitivo con inicializador literal', () => {
    const fuente = 'class C { public static void main(String[] a) { int x = 5; } }';
    const programa = analizar(fuente);
    const [declaracion] = programa.clase.main!.cuerpo.elementos;
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
    const [declaracion] = programa.clase.main!.cuerpo.elementos as [
      import('./ast.ts').NodoDeclaracionLocal,
    ];
    expect(declaracion.esFinal).toBe(true);
    expect(declaracion.declaradores.map((d) => d.nombre)).toEqual(['x', 'y']);
  });

  it('acepta un declarador sin inicializador', () => {
    const fuente = 'class C { public static void main(String[] a) { boolean listo; } }';
    const programa = analizar(fuente);
    const [declaracion] = programa.clase.main!.cuerpo.elementos as [
      import('./ast.ts').NodoDeclaracionLocal,
    ];
    expect(declaracion.declaradores[0].inicializador).toBeNull();
  });

  it('acepta una declaración con tipo por referencia (String) — triangulación de "Nombre Id"', () => {
    const fuente = 'class C { public static void main(String[] a) { String s = "hola"; } }';
    const programa = analizar(fuente);
    const [declaracion] = programa.clase.main!.cuerpo.elementos as [
      import('./ast.ts').NodoDeclaracionLocal,
    ];
    expect(declaracion.nombreTipo).toBe('String');
    expect(declaracion.declaradores[0].inicializador).toMatchObject({ tipo: 'literal-cadena', valor: 'hola' });
  });

  it('acepta declarar un Scanner con "new" como inicializador', () => {
    const fuente =
      'class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); } }';
    const programa = analizar(fuente);
    const [declaracion] = programa.clase.main!.cuerpo.elementos as [
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
    expect(programa.clase.main!.cuerpo.elementos.map((e) => e.tipo)).toEqual([
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
    const [, sentencia] = programa.clase.main!.cuerpo.elementos as [unknown, NodoImpresion];
    expect(sentencia).toMatchObject({ tipo: 'impresion', metodo: 'println', argumento: { tipo: 'nombre', nombre: 'x' } });
  });

  it('triangulación: "println" de una expresión aritmética (n + 1)', () => {
    const fuente = 'class C { public static void main(String[] a) { int n = 1; System.out.println(n + 1); } }';
    const programa = analizar(fuente);
    const [, sentencia] = programa.clase.main!.cuerpo.elementos as [unknown, NodoImpresion];
    expect(sentencia.argumento).not.toBeNull();
    expect(sentencia.argumento?.tipo).toBe('binaria');
  });

  // Corrección obligatoria (sub-lote 1-C2, orquestador): "System.out.println()" SIN argumentos
  // SÍ es Java real (PrintStream.println() existe, catálogo del oráculo 1.9) y un programa real
  // del curso lo usa (corpus/curso/u6-ciclos-anidados-tabla.java, verificado que compila contra
  // javac 17). Reemplaza el control anterior (que afirmaba lo contrario) — approval test que
  // documentaba el hueco, ahora cerrado.
  it('"System.out.println()" SIN argumentos ahora SÍ se reconoce: argumento queda en null', () => {
    const [sentencia] = primeraSentenciaDe('System.out.println();') as [NodoImpresion];
    expect(sentencia).toMatchObject({ tipo: 'impresion', metodo: 'println', argumento: null });
  });

  it('triangulación: "println()" vacío dentro del programa real de u6-ciclos-anidados-tabla.java', () => {
    const fuente = [
      'public class CiclosAnidadosTabla {',
      '    public static void main(String[] args) {',
      '        for (int fila = 1; fila <= 3; fila++) {',
      '            for (int columna = 1; columna <= 3; columna++) {',
      '                System.out.print(fila * columna + " ");',
      '            }',
      '            System.out.println();',
      '        }',
      '    }',
      '}',
    ].join('\n');
    expect(() => analizar(fuente)).not.toThrow();
  });

  it('control: "System.out.print()" (sin la "l") SIGUE sin aceptar paréntesis vacíos: verificado contra javac 17 real que print() sin argumentos no existe ("no suitable method found for print(no arguments)") — a diferencia de println()', () => {
    expect(() => analizar('class C { public static void main(String[] a) { System.out.print(); } }')).toThrow(
      ErrorDeCompilacion,
    );
  });
});

function primeraSentenciaDe(cuerpoDeMain: string) {
  const programa = analizar(`class C { public static void main(String[] a) { ${cuerpoDeMain} } }`);
  return programa.clase.main!.cuerpo.elementos;
}
