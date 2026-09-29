// RED de la tarea 1.6 (Reconocimiento NO-DISP sintáctico — resto del catálogo, REQ-SUB-006,
// REQ-SUB-007, design.md §2.6 fila "Sintaxis"): una muestra por cada fila restante (lo léxico ya
// quedó cubierto en 1.1, y bits/desplazamientos/ternario/instanceof/[]/:: en 1.3). Cada muestra
// MUST producir un `NodoNoSoportado`/`NodoExpresionNoSoportada` y dejar que el análisis siga —
// NUNCA un error de sintaxis (ErrorDeCompilacion) sin clasificar (C8).
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { analizarPrograma } from './analizador-sintactico.ts';
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';
import type { NodoDeclaracionLocal, NodoIf, NodoNoSoportado, NodoSwitch } from './ast.ts';

function analizar(fuente: string) {
  return analizarPrograma(tokenizar(fuente));
}

function primeraSentencia(cuerpoDeMain: string) {
  const programa = analizar(`class C { public static void main(String[] a) { ${cuerpoDeMain} } }`);
  return programa.clase.main!.cuerpo.elementos[0];
}

describe('no-soportado — otra clase/interfaz/enum/record de nivel superior', () => {
  it('una segunda clase tras la principal no rompe el análisis', () => {
    const programa = analizar(
      'class C { public static void main(String[] a) { } } class Ayudante { int x; }',
    );
    expect(programa.otrosTiposDeNivelSuperior).toHaveLength(1);
    expect(programa.otrosTiposDeNivelSuperior[0].codigo).toBe('otro-tipo-de-nivel-superior-no-soportado');
  });

  it('un enum tras la clase principal también se reconoce (triangulación de la misma fila)', () => {
    const programa = analizar(
      'class C { public static void main(String[] a) { } } enum Color { ROJO, VERDE }',
    );
    expect(programa.otrosTiposDeNivelSuperior).toHaveLength(1);
  });

  // Tarea 1.29 (causa 12, hallada al comparar programas típicos con javac 17; REQ-SUB-007: «clases/objetos
  // propios» → aviso): el archivo puede traer una interfaz, un enum o un record ANTES de la clase con `main`
  // (`enum Dia { … }` arriba, muy habitual) y `analizarClase` exigía «class» como primerísima palabra: «se
  // esperaba "class" y se encontró "enum"», un error FALSO. Esos tipos avisan y el análisis sigue con la primera
  // clase, que es la principal. Un archivo sin NINGUNA clase (solo una interfaz, o un enum que trae su propio
  // `main`) también es Java válido: avisa, y la «clase principal» queda sin `main`.
  it.each([
    ['una interfaz', 'interface Figura { double area(); }'],
    ['un enum', 'enum Dia { LUNES, MARTES }'],
    ['un record', 'record Punto(int x, int y) { }'],
    ['un tipo de anotación', '@interface Nota { String value(); }'],
    ['una interfaz pública con anotación y genéricos', '@FunctionalInterface public interface Operacion<T> { T aplicar(T a); }'],
  ])('%s ANTES de la clase principal avisa y la clase con main se sigue reconociendo', (_nombre, tipoAnterior) => {
    const programa = analizar(`${tipoAnterior} class C { public static void main(String[] a) { } }`);
    expect(programa.clase.nombre).toBe('C');
    expect(programa.clase.main).not.toBeNull();
    expect(programa.otrosTiposDeNivelSuperior).toHaveLength(1);
    expect(programa.otrosTiposDeNivelSuperior[0]).toMatchObject({ codigo: 'otro-tipo-de-nivel-superior-no-soportado' });
  });

  it('varios tipos antes de la clase principal (interfaz, enum y record) avisan uno por uno, en el orden del texto', () => {
    const fuente = 'interface A { } enum B { X } record R(int n) { } public class C { public static void main(String[] a) { } }';
    const programa = analizar(fuente);
    expect(programa.clase.nombre).toBe('C');
    expect(programa.otrosTiposDeNivelSuperior.map((t) => fuente.slice(t.rango.inicio, t.rango.fin))).toEqual([
      'interface A { }',
      'enum B { X }',
      'record R(int n) { }',
    ]);
  });

  it('un tipo antes Y otro después de la clase principal: los dos avisan', () => {
    const programa = analizar('enum A { X } class C { public static void main(String[] a) { } } interface B { }');
    expect(programa.clase.nombre).toBe('C');
    expect(programa.otrosTiposDeNivelSuperior).toHaveLength(2);
  });

  it.each([
    ['solo una interfaz', 'interface I { void f(); }', 'I'],
    ['un enum que trae su propio main', 'public enum E { A, B; public static void main(String[] args) { } }', 'E'],
    ['un record y una interfaz sin ninguna clase', 'record P(int x) { } interface Q { }', 'P'],
  ])('un archivo SIN ninguna clase (%s) avisa y la clase principal queda sin main', (_nombre, fuente, nombreDelPrimerTipo) => {
    const programa = analizar(fuente);
    expect(programa.clase.main).toBeNull();
    expect(programa.clase.nombre).toBe(nombreDelPrimerTipo);
    expect(programa.otrosTiposDeNivelSuperior.length).toBeGreaterThanOrEqual(1);
    expect(programa.otrosTiposDeNivelSuperior[0]).toMatchObject({ codigo: 'otro-tipo-de-nivel-superior-no-soportado' });
  });

  it('un tipo antes de la clase seguido de basura sigue siendo un error de sintaxis REAL (javac: class, interface, enum, or record expected)', () => {
    expect(() => analizar('enum A { X } foo')).toThrow(ErrorDeCompilacion);
  });

  it('regresión: un archivo vacío (sin ningún tipo) sigue siendo un error de sintaxis real', () => {
    expect(() => analizar('')).toThrow(ErrorDeCompilacion);
    expect(() => analizar('import java.util.Scanner;')).toThrow(ErrorDeCompilacion);
  });
});

describe('no-soportado — miembros de clase distintos de main (campos, métodos propios, anotaciones)', () => {
  it('un método propio (recursión, REQ-SUB-007) no rompe el análisis y main se sigue reconociendo', () => {
    const programa = analizar(
      'class C { static int cuadrado(int n) { return n * n; } public static void main(String[] a) { } }',
    );
    expect(programa.clase.otrosMiembros).toHaveLength(1);
    expect(programa.clase.otrosMiembros[0].codigo).toBe('miembro-de-clase-no-soportado');
    expect(programa.clase.main!.parametro).toBe('a');
  });

  it('un campo de clase (antes de main)', () => {
    const programa = analizar(
      'class C { static int contador; public static void main(String[] a) { } }',
    );
    expect(programa.clase.otrosMiembros).toHaveLength(1);
  });

  it('main en medio de otros miembros (antes Y después) se sigue reconociendo una sola vez', () => {
    const programa = analizar(
      'class C { int x; public static void main(String[] a) { } static int y() { return 1; } }',
    );
    expect(programa.clase.otrosMiembros).toHaveLength(2);
    expect(programa.clase.main!.parametro).toBe('a');
  });

  it('un campo CON inicializador (p. ej. "static int contador = 0;") sigue reconociéndose de punta a punta', () => {
    const programa = analizar('class C { static int contador = 0; public static void main(String[] a) { } }');
    expect(programa.clase.otrosMiembros).toHaveLength(1);
    expect(programa.clase.main).not.toBeNull();
  });
});

// Sub-lote 1-D3 (mutante real contra veredicto de javac, tarea 1.16): ANTES, este catch-all
// devoraba CUALQUIER cosa hasta el siguiente ";"/"{" de nivel superior sin verificar que lo
// anterior siquiera pareciera el inicio de un miembro real de Java (JLS 8: como mínimo
// "{modificadores} Tipo Identificador") -- una firma de "main" mal escrita ("public static main
// void(...)", "public static void main main(...)"…) se aceptaba como "un método propio más" en
// silencio. Los 4 casos siguientes son mutantes REALES de esta sesión (ver el informe): verificados
// contra javac 17 real vía `corpus/mutantes/veredictos.jsonl` -- javac los RECHAZA, nuestro motor
// los aceptaba.
describe('consumirMiembroDeClase — cabecera inválida se rechaza como error real, nunca un NO-DISP inventado (sub-lote 1-D3)', () => {
  it('"public static main void(...)" ("void"/"main" intercambiados): el "nombre" no puede ser una palabra reservada', () => {
    const fuente = 'class C { public static main void(String[] args) { } public static void main(String[] a) { } }';
    expect(() => analizar(fuente)).toThrow(ErrorDeCompilacion);
  });

  it('"public static void main main(...)" ("main" duplicado): tras tipo+nombre debe seguir "(", ";", "{" o "="', () => {
    const fuente = 'class C { public static void main main(String[] args) { } }';
    expect(() => analizar(fuente)).toThrow(ErrorDeCompilacion);
  });

  it('"public static void (...)" ("main" borrado): falta el nombre por completo', () => {
    const fuente = 'class C { public static void (String[] args) { } public static void main(String[] a) { } }';
    expect(() => analizar(fuente)).toThrow(ErrorDeCompilacion);
  });

  it('"public static ; void main(...)" (";" de más justo tras los modificadores): falta el tipo por completo', () => {
    const fuente = 'class C { public static; void main(String[] args) { } }';
    expect(() => analizar(fuente)).toThrow(ErrorDeCompilacion);
  });

  it('control (regresión): "static int cuadrado(int n) { return n * n; }" (miembro real válido, REQ-SUB-007) NO se rechaza', () => {
    expect(() =>
      analizar('class C { static int cuadrado(int n) { return n * n; } public static void main(String[] a) { } }'),
    ).not.toThrow();
  });
});

// Tarea 1.21 (sub-lote 1-D4, ~35 mutantes de la tarea 1.16, la clase de discrepancia MÁS GRANDE):
// `validarCabeceraDeMiembro` (arriba) valida la CABECERA (tipo+nombre+continuación) pero, hasta
// esta tarea, NO el CONTENIDO de una lista de parámetros ya comprometida -- "void main([String[]
// args)" tiene una cabecera PERFECTA ("void main(") pero un parámetro roto DENTRO de los
// paréntesis; antes se tragaba como NO-DISP (¡pareceMain ya había fallado a reconocerlo como
// main, precisamente PORQUE el primer token del parámetro es "["!), cuando javac lo rechaza de
// verdad. Verificado contra javac 17 real esta sesión (carpetas temporales, borradas):
// "illegal start of type" en el primer token que no puede abrir un tipo.
describe('consumirMiembroDeClase — lista de parámetros DENTRO de los paréntesis (sub-lote 1-D4)', () => {
  it('"void main([String[] args)" ("[" insertado antes de "String", mutante real): se rechaza como error real, nunca NO-DISP en silencio', () => {
    expect(() => analizar('class C { public static void main([String[] args) { } }')).toThrow(ErrorDeCompilacion);
  });

  it('triangulación: "static int foo([int n) { return n; }" (miembro genérico, NO solo main -- REQ-SUB-007 acepta el miembro, pero sus PARÉNTESIS deben ser sintaxis real)', () => {
    expect(() =>
      analizar('class C { static int foo([int n) { return n; } public static void main(String[] a) { } }'),
    ).toThrow(ErrorDeCompilacion);
  });

  it('triangulación: "static void foo(int n, )" (coma colgante, ningún parámetro real después) también se rechaza', () => {
    expect(() =>
      analizar('class C { static void foo(int n, ) { } public static void main(String[] a) { } }'),
    ).toThrow(ErrorDeCompilacion);
  });

  it('control (regresión): parámetros con arreglos, varargs, nombres calificados y "final" -- las formas REALES de Java -- siguen sin rechazarse', () => {
    expect(() =>
      analizar(
        'class C { static void foo(final int x, String[] datos, java.util.List resto, int... otros) { } public static void main(String[] a) { } }',
      ),
    ).not.toThrow();
  });

  it('control (regresión): sin parámetros ("()") sigue sin rechazarse', () => {
    expect(() => analizar('class C { static void foo() { } public static void main(String[] a) { } }')).not.toThrow();
  });

  it('control (regresión): "static int contador;" (campo real válido) NO se rechaza', () => {
    expect(() => analizar('class C { static int contador; public static void main(String[] a) { } }')).not.toThrow();
  });
});

describe('no-soportado — "throws" en main (REQ-SUB-007)', () => {
  it('"public static void main(String[] args) throws Exception" no rompe el análisis', () => {
    const programa = analizar(
      'class C { public static void main(String[] args) throws Exception { } }',
    );
    expect(programa.clase.main!.clausulaThrows).not.toBeNull();
    expect(programa.clase.main!.clausulaThrows?.codigo).toBe('throws-no-soportado');
  });
});

describe('no-soportado — arreglos (tipo, new, inicializador — el acceso [] ya es de la tarea 1.3)', () => {
  it('"int[] datos;" como declaración es NO-DISP, no una declaración normal', () => {
    const elemento = primeraSentencia('int[] datos;');
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('arreglo-no-soportado');
  });

  it('"String[] datos = new String[5];" también es NO-DISP de punta a punta', () => {
    const elemento = primeraSentencia('String[] datos = new String[5];');
    expect(elemento.tipo).toBe('no-soportado');
  });

  it('"int[] datos = {1, 2, 3};" (inicializador de arreglo, ejemplo del REQ-SUB-006) es NO-DISP', () => {
    const elemento = primeraSentencia('int[] datos = {1, 2, 3};');
    expect(elemento.tipo).toBe('no-soportado');
  });

  it('"new int[5]" como expresión suelta es NO-DISP, no un error de sintaxis', () => {
    const elemento = primeraSentencia('int[] x = new int[5];');
    expect(elemento.tipo).toBe('no-soportado');
  });
});

// Tarea 1.29 (causa 9, hallada al comparar programas típicos con javac 17): en Java los corchetes de un
// arreglo pueden ir DESPUÉS del nombre — `int notas[] = new int[5];` — la forma «estilo C» que muchos
// cursos y tutoriales en español enseñan. Solo `int[] notas` se reconocía; con los corchetes tras el
// nombre `analizarDeclarador` esperaba `=` o `;` y daba «se esperaba ";" y se encontró "["», un error
// FALSO. Es el MISMO aviso de arreglo, con el tipo tal como lo escribió el alumno (`int[]`).
describe('no-soportado — arreglos con los corchetes después del nombre (estilo C, tarea 1.29)', () => {
  it('"int notas[] = new int[5];" es el aviso de arreglo, con tipoArreglo "int[]" y el rango de toda la declaración', () => {
    const fuente = 'class C { public static void main(String[] a) { int notas[] = new int[5]; } }';
    const elemento = analizar(fuente).clase.main!.cuerpo.elementos[0] as NodoNoSoportado;
    expect(elemento).toMatchObject({ tipo: 'no-soportado', codigo: 'arreglo-no-soportado', datos: { tipoArreglo: 'int[]' } });
    expect(fuente.slice(elemento.rango.inicio, elemento.rango.fin)).toBe('int notas[] = new int[5];');
  });

  it('cada dimensión cuenta: "int m[][] = new int[2][2];" es "int[][]"; y con un tipo de referencia, "String nombres[];" es "String[]"', () => {
    expect(primeraSentencia('int m[][] = new int[2][2];')).toMatchObject({ codigo: 'arreglo-no-soportado', datos: { tipoArreglo: 'int[][]' } });
    expect(primeraSentencia('String nombres[];')).toMatchObject({ codigo: 'arreglo-no-soportado', datos: { tipoArreglo: 'String[]' } });
  });

  it('un declarador con corchetes DESPUÉS de uno normal ("int a = 1, b[] = { 2 };") también avisa, y consume toda la sentencia', () => {
    const elementos = analizar('class C { public static void main(String[] a) { int x = 1, b[] = { 2 }; int y = 3; } }').clase.main!.cuerpo.elementos;
    expect(elementos).toHaveLength(2);
    expect(elementos[0]).toMatchObject({ tipo: 'no-soportado', codigo: 'arreglo-no-soportado', datos: { tipoArreglo: 'int[]' } });
    expect(elementos[1]).toMatchObject({ tipo: 'declaracion-local' });
  });

  it('dentro de un for ("for (int v[] = { 1 }; ; ) { }") el aviso de arreglo sale de la declaración de siempre', () => {
    expect(primeraSentencia('for (int v[] = { 1 }; ; ) { }')).toMatchObject({ tipo: 'no-soportado', codigo: 'arreglo-no-soportado' });
  });

  it('una dimensión con número ("int a[5];") NO es Java válido y sigue siendo un error de sintaxis real (javac: array dimension missing)', () => {
    expect(() => primeraSentencia('int a[5];')).toThrow(ErrorDeCompilacion);
  });

  it('regresión: una declaración normal con varios declaradores no se toca ("int a = 1, b = 2;")', () => {
    expect(primeraSentencia('int a = 1, b = 2;')).toMatchObject({ tipo: 'declaracion-local' });
  });
});

// Tarea 1.29 (causa 10, hallada al comparar programas típicos con javac 17; design.md §2.3: «campo,
// método, clase interna, bloque, anotación → NO-DISP»): las anotaciones (`@SuppressWarnings("resource")`
// que Eclipse pone sobre un Scanner, `@Override`, `@Deprecated`) son Java válido y el léxico ni siquiera
// conocía el carácter «@» («carácter no reconocido: "@"»). Se reconocen donde Java las admite —antes de la
// clase, de un miembro y de una declaración local— y delimitan SOLO la anotación, el resto sigue.
describe('no-soportado — anotaciones (design.md §2.3, tarea 1.29)', () => {
  function anotacionesDeLaClase(fuente: string): { programa: ReturnType<typeof analizar>; anotaciones: NodoNoSoportado[] } {
    const programa = analizar(fuente);
    return { programa, anotaciones: programa.clase.otrosMiembros.filter((m) => m.codigo === 'anotacion-no-soportada') };
  }

  it('antes de main: "@SuppressWarnings("unused") public static void main" avisa y main se sigue reconociendo', () => {
    const fuente = 'class C { @SuppressWarnings("unused") public static void main(String[] a) { } }';
    const { programa, anotaciones } = anotacionesDeLaClase(fuente);
    expect(programa.clase.main).not.toBeNull();
    expect(anotaciones).toHaveLength(1);
    expect(fuente.slice(anotaciones[0]!.rango.inicio, anotaciones[0]!.rango.fin)).toBe('@SuppressWarnings("unused")');
  });

  it('antes de la clase: "@SuppressWarnings("all") public class C" avisa, con los paréntesis anidados y las llaves del argumento bien delimitados', () => {
    const fuente = '@SuppressWarnings({"a", "b"}) public class C { public static void main(String[] a) { } }';
    const { programa, anotaciones } = anotacionesDeLaClase(fuente);
    expect(programa.clase.main).not.toBeNull();
    expect(anotaciones).toHaveLength(1);
    expect(fuente.slice(anotaciones[0]!.rango.inicio, anotaciones[0]!.rango.fin)).toBe('@SuppressWarnings({"a", "b"})');
  });

  it('varias anotaciones seguidas ("@A @B(1) @p.C") son UN solo aviso que las cubre a todas', () => {
    const fuente = '@A @B(1) @p.C class C { public static void main(String[] a) { } }';
    const { anotaciones } = anotacionesDeLaClase(fuente);
    expect(anotaciones).toHaveLength(1);
    expect(fuente.slice(anotaciones[0]!.rango.inicio, anotaciones[0]!.rango.fin)).toBe('@A @B(1) @p.C');
  });

  it('sobre un método propio ("@Override public String toString() { … }"): la anotación y el miembro avisan, y main sigue en pie', () => {
    const { programa, anotaciones } = anotacionesDeLaClase(
      'class C { @Override public String toString() { return "x"; } public static void main(String[] a) { } }',
    );
    expect(anotaciones).toHaveLength(1);
    expect(programa.clase.otrosMiembros).toHaveLength(2);
    expect(programa.clase.main).not.toBeNull();
  });

  it('sobre una declaración local (el "@SuppressWarnings("resource")" de Eclipse): el aviso y, DESPUÉS, la declaración normal', () => {
    const elementos = analizar(
      'class C { public static void main(String[] a) { @SuppressWarnings("resource") Scanner sc = new Scanner(System.in); } }',
    ).clase.main!.cuerpo.elementos;
    expect(elementos).toHaveLength(2);
    expect(elementos[0]).toMatchObject({ tipo: 'no-soportado', codigo: 'anotacion-no-soportada' });
    expect(elementos[1]).toMatchObject({ tipo: 'declaracion-local', nombreTipo: 'Scanner' });
  });

  it('"@interface Nota { }" (declarar una anotación) tras la clase es otro tipo de nivel superior, no una anotación', () => {
    const programa = analizar('class C { public static void main(String[] a) { } } @interface Nota { }');
    expect(programa.otrosTiposDeNivelSuperior).toHaveLength(1);
    expect(programa.otrosTiposDeNivelSuperior[0]).toMatchObject({ codigo: 'otro-tipo-de-nivel-superior-no-soportado' });
  });

  it('una anotación antes de OTRA clase de nivel superior ("@Deprecated class Otra { }") no rompe el análisis', () => {
    const programa = analizar('class C { public static void main(String[] a) { } } @Deprecated class Otra { int x; }');
    expect(programa.otrosTiposDeNivelSuperior).toHaveLength(1);
  });

  it('un "@" sin nombre detrás sigue siendo un error de sintaxis real (javac: illegal start of expression)', () => {
    expect(() => primeraSentencia('@ int x = 1;')).toThrow(ErrorDeCompilacion);
  });
});

describe('no-soportado — "var" (REQ-SUB-007)', () => {
  it('"var x = 5;" es NO-DISP', () => {
    const elemento = primeraSentencia('var x = 5;');
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('var-no-soportado');
  });
});

describe('no-soportado — genéricos (REQ-SUB-007)', () => {
  it('"ArrayList<Integer> lista;" es NO-DISP, nunca confundido con una comparación', () => {
    const elemento = primeraSentencia('ArrayList<Integer> lista;');
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('generico-no-soportado');
  });

  it('genéricos anidados ("Map<String, List<Integer>> mapa;") también se reconocen (triangulación)', () => {
    const elemento = primeraSentencia('Map<String, List<Integer>> mapa;');
    expect(elemento.tipo).toBe('no-soportado');
  });

  it('una comparación real ("total < limite") NUNCA se confunde con un genérico (regresión)', () => {
    const elemento = primeraSentencia('total = a < limite;');
    expect(elemento.tipo).toBe('sentencia-expresion');
  });

  // Tarea 1.29: los comodines y los arreglos dentro de un genérico también son Java válido (`Class<?> c`, `List<? extends
  // Number> l`, `Map<String, ? super Integer> m`, `List<int[]> filas`, `List<String>[] listas`): `pareceGenericoDesde` solo
  // dejaba pasar identificadores, comas y puntos, así que esas declaraciones se leían como una expresión y daban un error
  // de sintaxis FALSO. Todas siguen siendo el mismo aviso de genérico.
  it.each([
    'Class<?> c;',
    'List<? extends Number> lista;',
    'Map<String, ? super Integer> mapa;',
    'List<int[]> filas;',
    'List<String>[] listas;',
    'Map.Entry<String, Integer> par;',
    'java.util.List<? extends Number> l;',
    'Comparable<? super Integer> c = null;',
  ])('«%s» es el aviso de genérico, no un error de sintaxis', (declaracion) => {
    expect(primeraSentencia(declaracion)).toMatchObject({ tipo: 'no-soportado', codigo: 'generico-no-soportado' });
  });

  it('regresión: una comparación encadenada con «>» ("r = a < b == c > d;") sigue siendo una expresión', () => {
    expect(primeraSentencia('r = a < b == c > d;').tipo).toBe('sentencia-expresion');
  });
});

describe('no-soportado — for mejorado (REQ-SUB-007)', () => {
  it('"for (int x : arreglo) { }" es NO-DISP de punta a punta', () => {
    const elemento = primeraSentencia('for (int x : arreglo) { total = total + x; }');
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('for-mejorado-no-soportado');
  });

  it('un "for" clásico normal NUNCA se confunde con el mejorado (regresión)', () => {
    const elemento = primeraSentencia('for (int i = 0; i < 10; i++) { }');
    expect(elemento.tipo).toBe('for');
  });
});

describe('no-soportado — etiquetas y break/continue con etiqueta (REQ-SUB-007, verificado: flow08)', () => {
  it('una sentencia etiquetada ("externo: for (...) { }") es NO-DISP, pero delimita bien el for interior', () => {
    const elemento = primeraSentencia('externo: for (int i = 0; i < 3; i++) { break; }');
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('etiqueta-no-soportada');
  });

  it('"break externo;" (con etiqueta) es NO-DISP, distinto de un "break;" simple', () => {
    const elemento = primeraSentencia('for (int i = 0; i < 3; i++) { break externo; }');
    const cuerpo = (elemento as unknown as { cuerpo: { elementos: NodoNoSoportado[] } }).cuerpo;
    expect(cuerpo.elementos[0].tipo).toBe('no-soportado');
    expect(cuerpo.elementos[0].codigo).toBe('break-con-etiqueta-no-soportado');
  });

  it('"continue externo;" (con etiqueta) es NO-DISP', () => {
    const elemento = primeraSentencia('for (int i = 0; i < 3; i++) { continue externo; }');
    const cuerpo = (elemento as unknown as { cuerpo: { elementos: NodoNoSoportado[] } }).cuerpo;
    expect(cuerpo.elementos[0].codigo).toBe('continue-con-etiqueta-no-soportado');
  });

  it('un "break;"/"continue;" simples NUNCA se confunden con la forma etiquetada (regresión)', () => {
    const elemento = primeraSentencia('while (true) { break; }');
    const cuerpo = (elemento as unknown as { cuerpo: { elementos: { tipo: string }[] } }).cuerpo;
    expect(cuerpo.elementos[0].tipo).toBe('break');
  });
});

describe('no-soportado — try/catch/throw (REQ-SUB-007)', () => {
  it('"try { } catch (Exception e) { }" completo es NO-DISP y consume bien las llaves anidadas', () => {
    const elemento = primeraSentencia(
      'try { total = 1 / 0; } catch (Exception e) { total = -1; } System.out.println("después");',
    );
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('try-catch-no-soportado');
  });

  it('el análisis SIGUE después del try/catch (la sentencia siguiente se reconoce normal)', () => {
    const programa = analizar(
      'class C { public static void main(String[] a) { try { } catch (Exception e) { } System.out.println("ok"); } }',
    );
    expect(programa.clase.main!.cuerpo.elementos[1]).toMatchObject({ tipo: 'impresion' });
  });

  it('"throw new RuntimeException(\\"error\\");" es NO-DISP', () => {
    const elemento = primeraSentencia('throw new RuntimeException("error");');
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('throw-no-soportado');
  });
});

describe('no-soportado — switch con flecha / yield (REQ-SUB-007, verificado: flow06/flow07)', () => {
  it('"case 1 -> ...;" es NO-DISP, no confunde el resto del switch', () => {
    const elemento = primeraSentencia('switch (dia) { case 1 -> total = 1; default -> total = 0; }') as NodoSwitch;
    expect(elemento.tipo).toBe('switch');
    expect(elemento.elementos[0].tipo).toBe('no-soportado');
    expect((elemento.elementos[0] as NodoNoSoportado).codigo).toBe('switch-flecha-no-soportado');
    expect(elemento.elementos[1].tipo).toBe('no-soportado');
  });

  it('una rama de flecha con bloque "{ }" también se delimita bien', () => {
    const elemento = primeraSentencia(
      'switch (dia) { case 1 -> { total = 1; } default -> { total = 0; } }',
    ) as NodoSwitch;
    expect(elemento.elementos).toHaveLength(2);
  });

  it('"yield" dentro de un switch es NO-DISP', () => {
    const elemento = primeraSentencia('switch (dia) { case 1: yield 1; }') as NodoSwitch;
    expect(elemento.elementos.some((e) => e.tipo === 'no-soportado' && (e as NodoNoSoportado).codigo === 'yield-no-soportado')).toBe(true);
  });

  it('un switch clásico normal (con ":") NUNCA se confunde con el de flecha (regresión)', () => {
    const elemento = primeraSentencia('switch (dia) { case 1: total = 1; break; default: total = 0; }') as NodoSwitch;
    expect(elemento.elementos[0].tipo).toBe('etiqueta-case');
  });
});

// Tarea 1.29 (causa 5, agregada por el orquestador): desde Java 14, `case 1, 2:` y `case 1, 2 ->` son
// válidos (varios valores en una sola etiqueta; verificado con javac 17 real, incluidos valores de tipo
// `char` y `String` y etiquetas partidas en varias líneas). `analizarEtiquetaCase` leía UN valor y
// esperaba `:` o `->`, así que `case 1, 2 ->` (corpus/experimentos/texto/flow06_switch_flecha.java) daba
// «se esperaba ":" y se encontró ","». La forma con flecha sigue siendo el mismo aviso de siempre
// (`switch-flecha-no-soportado`: lo que aleja al programa del subconjunto es la flecha); la forma
// clásica con dos puntos tiene su propio aviso, con la alternativa dentro del subconjunto (un `case` por
// valor). Una coma sin valor detrás (`case 1, :`) sigue siendo un error real de javac.
describe('no-soportado — varias etiquetas en un case (Java 14+, tarea 1.29)', () => {
  it('"case 1, 2 -> ...;" es el aviso de la flecha (el mismo de "case 1 ->"), y el resto del switch sigue bien', () => {
    const elemento = primeraSentencia('switch (dia) { case 1, 2 -> total = 1; default -> total = 0; }') as NodoSwitch;
    expect(elemento.elementos).toHaveLength(2);
    expect(elemento.elementos[0]).toMatchObject({ tipo: 'no-soportado', codigo: 'switch-flecha-no-soportado' });
    expect(elemento.elementos[1]).toMatchObject({ tipo: 'no-soportado', codigo: 'switch-flecha-no-soportado' });
  });

  it('"case 1, 2, 3 -> { ... }" (tres valores, rama con bloque) también se delimita entera', () => {
    const elemento = primeraSentencia('switch (dia) { case 1, 2, 3 -> { total = 1; } default -> { } }') as NodoSwitch;
    expect(elemento.elementos).toHaveLength(2);
    expect(elemento.elementos[0]).toMatchObject({ tipo: 'no-soportado', codigo: 'switch-flecha-no-soportado' });
  });

  it('"case 1, 2:" (forma clásica con varios valores) es NO-DISP con su propio código, y sus sentencias siguen siendo del switch', () => {
    const elemento = primeraSentencia('switch (dia) { case 1, 2: total = 1; break; default: total = 0; }') as NodoSwitch;
    expect(elemento.elementos[0]).toMatchObject({ tipo: 'no-soportado', codigo: 'case-con-varias-etiquetas-no-soportado' });
    expect(elemento.elementos.slice(1).map((e) => e.tipo)).toEqual(['sentencia-expresion', 'break', 'etiqueta-default', 'sentencia-expresion']);
  });

  it('el rango del aviso cubre «case 1, 2:» completo (de "case" a los dos puntos), también con valores de texto', () => {
    const fuente = 'class C { public static void main(String[] a) { switch (s) { case "a", "b": x = 1; } } }';
    const programa = analizar(fuente);
    const cambio = programa.clase.main!.cuerpo.elementos[0] as NodoSwitch;
    const aviso = cambio.elementos[0] as NodoNoSoportado;
    expect(fuente.slice(aviso.rango.inicio, aviso.rango.fin)).toBe('case "a", "b":');
  });

  it('una coma sin valor detrás sigue siendo un error de sintaxis REAL (javac: illegal start of expression): "case 1, :"', () => {
    expect(() => primeraSentencia('switch (dia) { case 1, : total = 1; }')).toThrow(ErrorDeCompilacion);
  });

  it('regresión: "case 1:" y "case 1: case 2:" (una etiqueta cada una) siguen siendo etiquetas normales', () => {
    const elemento = primeraSentencia('switch (dia) { case 1: case 2: total = 1; }') as NodoSwitch;
    expect(elemento.elementos.slice(0, 2).map((e) => e.tipo)).toEqual(['etiqueta-case', 'etiqueta-case']);
  });
});

describe('no-soportado — "final" sin inicializador (REQ-SUB-007)', () => {
  it('"final int x;" (sin "=") es NO-DISP', () => {
    const elemento = primeraSentencia('final int x;');
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('final-sin-inicializador-no-soportado');
  });

  it('"final int x = 5;" (CON inicializador) sigue siendo una declaración normal (regresión)', () => {
    const elemento = primeraSentencia('final int x = 5;') as NodoDeclaracionLocal;
    expect(elemento.tipo).toBe('declaracion-local');
    expect(elemento.esFinal).toBe(true);
  });
});

describe('no-soportado — "import static" (REQ-SUB-007)', () => {
  it('"import static java.lang.Math.PI;" no rompe el análisis del resto del programa', () => {
    const programa = analizar(
      'import static java.lang.Math.PI; class C { public static void main(String[] a) { } }',
    );
    expect(programa.clase.nombre).toBe('C');
  });
});

describe('no-soportado — lambdas (REQ-SUB-007, corrección obligatoria del sub-lote 1-B)', () => {
  it('"() -> System.out.println(\\"hola\\");" (sin parámetros) es NO-DISP', () => {
    // La declaración en sí ("Runnable r = ...") sigue siendo 'declaracion-local' (Runnable es un
    // nombre de tipo por referencia válido sintácticamente); lo NO-DISP es el INICIALIZADOR: la
    // lambda que Runnable recibiría.
    const elemento = primeraSentencia('Runnable r = () -> System.out.println("hola");') as NodoDeclaracionLocal;
    expect(elemento.tipo).toBe('declaracion-local');
    // Tarea 1.24 (corrección de la discrepancia real): la tabla central SIEMPRE dijo
    // 'lambda-no-soportada' (desde la tarea 1.6) — el código emitido aquí decía 'lambda' a secas
    // porque `expresiones.ts` nunca pasaba por la tabla (engram
    // visualizador-java/patron-codigos-inline-expresiones). Ahora ambos coinciden.
    expect(elemento.declaradores[0].inicializador).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'lambda-no-soportada' });
  });

  it('"x -> x * 2" (un parámetro sin paréntesis) es NO-DISP', () => {
    const elemento = primeraSentencia('Convertidor c = x -> x * 2;') as NodoDeclaracionLocal;
    expect(elemento.declaradores[0].inicializador).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'lambda-no-soportada' });
  });

  it('una lambda con cuerpo en bloque "{ }" se delimita bien y el análisis sigue', () => {
    const programa = analizar(
      'class C { public static void main(String[] a) { Runnable r = () -> { total = 1; }; System.out.println("después"); } }',
    );
    expect(programa.clase.main!.cuerpo.elementos[1]).toMatchObject({ tipo: 'impresion' });
  });

  it('una llamada normal con paréntesis NUNCA se confunde con una lambda (regresión: "foo(1, 2);")', () => {
    const elemento = primeraSentencia('foo(1, 2);');
    expect(elemento.tipo).toBe('sentencia-expresion');
    expect((elemento as { expresion: { tipo: string } }).expresion.tipo).toBe('llamada');
  });
});

describe('no-soportado — this/super/null (design.md §2.6)', () => {
  it('"this" como expresión es NO-DISP', () => {
    const elemento = primeraSentencia('total = this.x;');
    expect(elemento).toMatchObject({ tipo: 'sentencia-expresion', expresion: { tipo: 'asignacion' } });
  });

  it('"null" es NO-DISP (sin null no hay NPE fuera del currículo)', () => {
    const elemento = primeraSentencia('String s = null;') as NodoDeclaracionLocal;
    expect(elemento.declaradores[0].inicializador).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'null-no-soportado' });
  });
});

describe('no-soportado — float/byte/short como tipo de declaración (design.md §2.6)', () => {
  it('"float f = 3.5f;" es NO-DISP (nunca se reinterpreta como double)', () => {
    const elemento = primeraSentencia('float f = 3.5f;');
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('tipo-primitivo-no-soportado');
  });

  it('"byte b = 10;" es NO-DISP (nunca se reinterpreta como int)', () => {
    const elemento = primeraSentencia('byte b = 10;');
    expect(elemento.tipo).toBe('no-soportado');
  });

  // Tarea 1.30 (decisión del PO 2026-09-29): el aviso nombra el tipo CONCRETO que escribió el alumno («el tipo
  // `byte`») y sugiere la alternativa de ESE tipo, así que el nodo lo lleva en sus datos
  // (`DatosPorCodigoNoSoportado['tipo-primitivo-no-soportado']`), no una lista de los tres.
  it.each([
    ['float f = 3.5f;', 'float'],
    ['byte b1 = 10, b2 = 20;', 'byte'],
    ['short s;', 'short'],
    ['final byte MAXIMO = 100;', 'byte'],
    ['for (short i = 0; i < 3; i++) { }', 'short'],
  ] as const)('"%s" manda el tipo que escribió el alumno en los datos del aviso ("%s")', (fuente, tipo) => {
    const elemento = primeraSentencia(fuente);
    expect(elemento).toMatchObject({ tipo: 'no-soportado', codigo: 'tipo-primitivo-no-soportado' });
    expect((elemento as NodoNoSoportado).datos).toEqual({ tipo });
  });

  it('"short s;" es NO-DISP', () => {
    const elemento = primeraSentencia('short s;');
    expect(elemento.tipo).toBe('no-soportado');
  });
});

describe('no-soportado — combinaciones que confirman "cero errores de sintaxis engañosos" (C8)', () => {
  it('un programa con VARIAS construcciones NO-DISP seguidas nunca lanza ErrorDeCompilacion', () => {
    const fuente = [
      'class C {',
      '  static int ayudante() { return 1; }',
      '  public static void main(String[] args) {',
      '    var x = 5;',
      '    int[] datos = {1, 2, 3};',
      '    try { total = 1 / 0; } catch (Exception e) { }',
      '    for (int y : datos) { }',
      '    System.out.println("fin");',
      '  }',
      '}',
    ].join('\n');
    expect(() => analizar(fuente)).not.toThrow();
    const programa = analizar(fuente);
    const tipos = programa.clase.main!.cuerpo.elementos.map((e) => e.tipo);
    expect(tipos).toEqual(['no-soportado', 'no-soportado', 'no-soportado', 'no-soportado', 'impresion']);
  });

  it('el "if" alrededor de una construcción NO-DISP se sigue reconociendo como "if" real', () => {
    const elemento = primeraSentencia('if (listo) { var x = 5; }') as NodoIf;
    expect(elemento.tipo).toBe('if');
    expect((elemento.entonces as unknown as { elementos: { tipo: string }[] }).elementos[0].tipo).toBe('no-soportado');
  });
});

// Tarea 1.29 (causa 11, hallada al comparar programas típicos con javac 17; REQ-SUB-007: «métodos propios,
// recursión, clases/campos/objetos propios» y «arreglos» → aviso «Java sí lo acepta…»): la validación mínima
// de la cabecera de un miembro («Tipo Identificador» y luego «(», «;», «{» o «=») rechazaba como error de
// sintaxis formas perfectamente válidas de Java —el constructor (`Persona(String nombre) { … }`, que no lleva
// tipo de retorno), los arreglos como tipo de un campo o de un método (`static int[] crear(int n)`), varios
// campos en una declaración (`int a, b;`), los tipos genéricos (`List<String> nombres`), los métodos genéricos
// (`static <T> T mayor(T a, T b)`) y los parámetros con tipos genéricos—. Todas son miembros propios: avisan,
// nunca son un error. Cada muestra de la lista se compiló con javac 17 real dentro de una clase `C`.
describe('consumirMiembroDeClase — cabeceras VÁLIDAS de Java avisan, nunca son error (tarea 1.29, REQ-SUB-007)', () => {
  const miembrosValidos: readonly string[] = [
    // constructores (sin tipo de retorno; el nombre es el de la clase)
    'C() { }',
    'public C(int x, String s) { }',
    'private C(int x) { this.x = x; }',
    'protected C() throws Exception { }',
    '<T> C(T t) { }',
    // campos: varios por declaración, arreglos, genéricos, calificados
    'int a, b;',
    'int a[];',
    'static int[] a;',
    'static int[][] m = new int[2][3];',
    'static String[] nombres = { "a", "b" };',
    'int[] a = { 1, 2 }, b = { 3 };',
    'int a = 1, b[] = { 2 };',
    'static final double PI = 3.14, E = 2.71;',
    'java.util.List<String> nombres;',
    'java.util.Map<String, java.util.List<Integer>> mapa = new java.util.HashMap<>();',
    'private final List<List<Integer>> filas = new ArrayList<>();',
    'Map.Entry<String, Integer> par;',
    'List<String>[] listas;',
    // métodos: arreglos, genéricos, varargs, `throws`, corchetes tras los paréntesis
    'static int[] crear(int n) { return new int[n]; }',
    'static <T extends Comparable<T>> T mayor(T a, T b) { return a; }',
    'static <T> void f(T t) { }',
    'static void mostrar(List<String> l, Map<String, Integer> m) { }',
    'static void f(int... xs) { }',
    'static java.util.List<String> f() { return null; }',
    'static void f(int[] a, int b[]) { }',
    'static double media(List<? extends Number> l) { return 0; }',
    'static void f(Map.Entry<String, Integer> e) { }',
    'static void f(final List<? super Integer> l, Map<String, List<Integer>> m) { }',
    'int f()[] { return null; }',
    'static List<String> nombres() { return new ArrayList<>(); }',
    // tipos anidados y bloques inicializadores
    'static class B extends A { }',
    'class B<T> { }',
    'interface I<T> extends J<T> { }',
    'enum E implements I { A, B }',
    'record P(int x, int y) implements I { }',
    'static class Nodo<T> { T dato; Nodo<T> sig; Nodo(T d) { dato = d; } }',
    'static { }',
    '{ }',
  ];

  it.each(miembrosValidos)('el miembro «%s» avisa como miembro propio (rango exacto) y main se sigue reconociendo', (miembro) => {
    const fuente = `class C { ${miembro} public static void main(String[] a) { } }`;
    const programa = analizar(fuente);
    expect(programa.clase.main).not.toBeNull();
    expect(programa.clase.otrosMiembros).toHaveLength(1);
    const aviso = programa.clase.otrosMiembros[0]!;
    expect(aviso.codigo).toBe('miembro-de-clase-no-soportado');
    expect(fuente.slice(aviso.rango.inicio, aviso.rango.fin)).toBe(miembro);
  });

  it('un campo de arreglo con inicializador de llaves termina en SU ";" (no deja un ";" suelto ni se come a main)', () => {
    const fuente = 'class C { int[] a = { 1, 2 }; public static void main(String[] a) { } }';
    const programa = analizar(fuente);
    expect(programa.clase.otrosMiembros).toHaveLength(1);
    expect(fuente.slice(programa.clase.otrosMiembros[0]!.rango.inicio, programa.clase.otrosMiembros[0]!.rango.fin)).toBe('int[] a = { 1, 2 };');
    expect(programa.clase.main).not.toBeNull();
  });

  const miembrosInvalidos: ReadonlyArray<readonly [string, string]> = [
    ['un método sin tipo de retorno cuyo nombre NO es el de la clase (javac: invalid method declaration; return type required)', 'foo() { }'],
    ['una coma seguida de un paréntesis en vez de otro nombre de campo', 'static int cuadrado, (int n) { }'],
    ['una coma sin nombre de campo detrás', 'int a, ;'],
    ['una coma seguida de un número', 'int a, 5;'],
    ['un corchete sin cerrar entre el tipo y el nombre', 'static int[ f() { }'],
    ['un genérico sin cerrar', 'List<String x;'],
    ['un corchete con número tras el nombre de un campo', 'int a[5];'],
    ['un constructor con un parámetro roto', 'C([int x) { }'],
    ['un parámetro con un genérico sin cerrar', 'static void f(List<String l) { }'],
    ['un parámetro sin nombre tras un tipo genérico', 'static void f(List<String>) { }'],
  ];

  it.each(miembrosInvalidos)('sigue siendo un error de sintaxis REAL: %s', (_descripcion, miembro) => {
    expect(() => analizar(`class C { ${miembro} public static void main(String[] a) { } }`)).toThrow(ErrorDeCompilacion);
  });
});

// Tarea 1.29 (misma causa 11, en la cabecera de la CLASE): `class C extends B`, `class C implements A` y
// `class C<T>` son Java válido y la cabecera exigía «{» justo tras el nombre («falta abrir "{" para el cuerpo
// de la clase», un error FALSO). Lo que aleja al programa del subconjunto (design.md §2.3: la clase es una
// sola, con `main`) es la herencia o el genérico: cada uno avisa con su código, dentro de la clase, y el resto
// se analiza igual. Un `extends`/`implements` mal formado sigue siendo un error real de javac.
describe('analizarClase — cabecera con genéricos, extends e implements avisa, nunca es error (tarea 1.29, REQ-SUB-007)', () => {
  function avisosDeCabecera(cabecera: string) {
    const fuente = `${cabecera} { public static void main(String[] a) { } }`;
    const programa = analizar(fuente);
    expect(programa.clase.main).not.toBeNull();
    return programa.clase.otrosMiembros.map((m) => ({ codigo: m.codigo, texto: fuente.slice(m.rango.inicio, m.rango.fin) }));
  }

  it('"class C extends B": aviso de herencia que cubre desde "extends" hasta el nombre del padre', () => {
    expect(avisosDeCabecera('class C extends B')).toEqual([{ codigo: 'herencia-no-soportada', texto: 'extends B' }]);
  });

  it('"class C implements A": aviso de herencia (una interfaz también es herencia de tipos)', () => {
    expect(avisosDeCabecera('class C implements A')).toEqual([{ codigo: 'herencia-no-soportada', texto: 'implements A' }]);
  });

  it('"extends" e "implements" juntos son UN solo aviso que cubre ambas cláusulas, con lista de interfaces', () => {
    expect(avisosDeCabecera('public final class C extends B implements A, D')).toEqual([
      { codigo: 'herencia-no-soportada', texto: 'extends B implements A, D' },
    ]);
  });

  it('nombres calificados y genéricos dentro de las cláusulas ("implements A<String>, java.io.Serializable")', () => {
    expect(avisosDeCabecera('class C extends java.lang.Object implements Comparable<C>, java.io.Serializable')).toEqual([
      { codigo: 'herencia-no-soportada', texto: 'extends java.lang.Object implements Comparable<C>, java.io.Serializable' },
    ]);
  });

  it('"class C<T>": aviso de genérico con el rango de los parámetros de tipo', () => {
    expect(avisosDeCabecera('class C<T>')).toEqual([{ codigo: 'generico-no-soportado', texto: '<T>' }]);
  });

  it('parámetros de tipo acotados MÁS herencia: dos avisos, en el orden del texto', () => {
    expect(avisosDeCabecera('class C<T extends Comparable<T>> implements A<T>')).toEqual([
      { codigo: 'generico-no-soportado', texto: '<T extends Comparable<T>>' },
      { codigo: 'herencia-no-soportada', texto: 'implements A<T>' },
    ]);
  });

  const cabecerasInvalidas: ReadonlyArray<readonly [string, string]> = [
    ['"extends" sin tipo detrás', 'class C extends'],
    ['"implements" sin tipo detrás', 'class C implements'],
    ['dos "extends"', 'class C extends B extends D'],
    ['una coma sin tipo tras "implements"', 'class C implements A,'],
    ['una lista tras "extends" (una clase hereda de UNA sola)', 'class C extends B, D'],
    ['parámetros de tipo sin cerrar', 'class C<T'],
    ['"implements" antes de "extends"', 'class C implements A extends B'],
    ['una palabra suelta tras el nombre', 'class C foo'],
  ];

  it.each(cabecerasInvalidas)('sigue siendo un error de sintaxis REAL: %s', (_descripcion, cabecera) => {
    expect(() => analizar(`${cabecera} { public static void main(String[] a) { } }`)).toThrow(ErrorDeCompilacion);
  });
});

// Tarea 1.29 (residuales de la caza diferencial contra javac 17; REQ-SUB-007 «clases/objetos propios» y design.md §2.3 «lo que
// Java acepta y el subconjunto no simula → aviso»): `assert x > 0;`, una clase declarada DENTRO de un método y un bloque
// `synchronized (obj) { … }` son Java válido; sin reconocerlos daban «se esperaba…» (un error FALSO). Cada uno avisa con su
// código, delimita SOLO su construcción y el análisis sigue con la sentencia siguiente.
describe('no-soportado — assert, tipos locales y synchronized (tarea 1.29)', () => {
  function elementosDeMain(cuerpo: string) {
    return analizar(`class C { public static void main(String[] a) { ${cuerpo} } }`).clase.main!.cuerpo.elementos;
  }

  it.each([
    ['sin mensaje', 'assert x > 0;'],
    ['con mensaje', 'assert x > 0 : "x debe ser positivo";'],
    ['con paréntesis y llamadas', 'assert (x > 0 && f(x, 2)) : g("a;b");'],
  ])('«assert» %s es el aviso de assert, con la sentencia siguiente intacta', (_variante, sentencia) => {
    const elementos = elementosDeMain(`${sentencia} System.out.println(1);`);
    expect(elementos).toHaveLength(2);
    expect(elementos[0]).toMatchObject({ tipo: 'no-soportado', codigo: 'assert-no-soportado' });
    expect(elementos[1]).toMatchObject({ tipo: 'impresion' });
  });

  it('el rango del aviso de assert cubre la sentencia completa, hasta su «;»', () => {
    const fuente = 'class C { public static void main(String[] a) { assert x > 0 : "m"; } }';
    const aviso = analizar(fuente).clase.main!.cuerpo.elementos[0] as NodoNoSoportado;
    expect(fuente.slice(aviso.rango.inicio, aviso.rango.fin)).toBe('assert x > 0 : "m";');
  });

  it('«assert» sin condición o sin «;» sigue siendo un error de sintaxis REAL', () => {
    expect(() => elementosDeMain('assert;')).toThrow(ErrorDeCompilacion);
    expect(() => elementosDeMain('assert x > 0')).toThrow(ErrorDeCompilacion);
  });

  it.each([
    ['una clase', 'class Local { int x; void f() { } }'],
    ['una clase final', 'final class Local { }'],
    ['una clase abstracta', 'abstract class Local { abstract void f(); }'],
    ['una clase con cabecera larga', 'class Local<T> extends Base<T> implements I { }'],
    ['una interfaz', 'interface Contrato { void f(); }'],
    ['un enum', 'enum Dia { LUNES, MARTES; }'],
    ['un record', 'record Punto(int x, int y) { }'],
  ])('%s declarada dentro de main es el aviso de tipo local, con la sentencia siguiente intacta', (_tipo, declaracion) => {
    const elementos = elementosDeMain(`${declaracion} System.out.println(1);`);
    expect(elementos).toHaveLength(2);
    expect(elementos[0]).toMatchObject({ tipo: 'no-soportado', codigo: 'clase-local-no-soportada' });
    expect(elementos[1]).toMatchObject({ tipo: 'impresion' });
  });

  it('el rango del aviso de tipo local cubre el tipo completo, de la palabra «class» a su «}»', () => {
    const fuente = 'class C { public static void main(String[] a) { class L { int x; } } }';
    const aviso = analizar(fuente).clase.main!.cuerpo.elementos[0] as NodoNoSoportado;
    expect(fuente.slice(aviso.rango.inicio, aviso.rango.fin)).toBe('class L { int x; }');
  });

  it('regresión: «final int x = 5;» y una variable llamada «record» NO son tipos locales', () => {
    expect(elementosDeMain('final int x = 5;')[0]).toMatchObject({ tipo: 'declaracion-local', esFinal: true });
    const elementos = elementosDeMain('int record = 1; record = 2;');
    expect(elementos.map((e) => e.tipo)).toEqual(['declaracion-local', 'sentencia-expresion']);
  });

  it('«synchronized (obj) { … }» es el aviso de sincronización, con las llaves anidadas bien delimitadas y la sentencia siguiente intacta', () => {
    const fuente = 'class C { public static void main(String[] a) { synchronized (lock) { if (x) { y = 1; } } System.out.println(1); } }';
    const elementos = analizar(fuente).clase.main!.cuerpo.elementos;
    expect(elementos).toHaveLength(2);
    expect(elementos[0]).toMatchObject({ tipo: 'no-soportado', codigo: 'sincronizado-no-soportado' });
    expect(fuente.slice(elementos[0]!.rango.inicio, elementos[0]!.rango.fin)).toBe('synchronized (lock) { if (x) { y = 1; } }');
    expect(elementos[1]).toMatchObject({ tipo: 'impresion' });
  });

  it('«synchronized» sin su bloque sigue siendo un error de sintaxis REAL', () => {
    expect(() => elementosDeMain('synchronized (lock) x = 1;')).toThrow(ErrorDeCompilacion);
  });
});
