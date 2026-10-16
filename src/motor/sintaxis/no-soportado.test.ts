// RED de la tarea 1.6 (Reconocimiento NO-DISP sintáctico — resto del catálogo, REQ-SUB-006,
// REQ-SUB-007, design.md §2.6 fila "Sintaxis"): una muestra por cada fila restante (lo léxico ya
// quedó cubierto en 1.1, y bits/desplazamientos/ternario/instanceof/[]/:: en 1.3). Cada muestra
// MUST producir un `NodoNoSoportado`/`NodoExpresionNoSoportada` y dejar que el análisis siga —
// NUNCA un error de sintaxis (ErrorDeCompilacion) sin clasificar (C8).
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { analizarPrograma } from './analizador-sintactico.ts';
import { CursorDeTokens } from './cursor-de-tokens.ts';
import { longitudDeModificadorSellado } from './no-soportado.ts';
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

  // Tarea 1.35 (WARNING 3): una interfaz o clase SELLADA de nivel superior, antes o después de la clase principal, es un tipo más (aviso).
  it('una interfaz sellada ANTES de la clase principal, con sus clases permitidas, avisa y la clase principal se sigue reconociendo', () => {
    const programa = analizar(
      'sealed interface F permits A, B { } final class A implements F { } final class B implements F { } ' +
        'public class C { public static void main(String[] a) { } }',
    );
    // La interfaz es el primer tipo; la «clase» del programa es la primera `class` que sigue (`A`) y la principal (`C`) un tipo más, como con cualquier otra clase anterior.
    expect(programa.otrosTiposDeNivelSuperior.length).toBeGreaterThanOrEqual(3);
    expect(programa.otrosTiposDeNivelSuperior.every((t) => t.codigo === 'otro-tipo-de-nivel-superior-no-soportado')).toBe(true);
    expect(programa.otrosTiposDeNivelSuperior[0]!.rango.inicio).toBe(0);
  });

  it('una clase sellada y una `non-sealed` DESPUÉS de la clase principal también son tipos de nivel superior (avisos)', () => {
    const programa = analizar(
      'class C { public static void main(String[] a) { } } sealed class Base permits Hijo { } non-sealed class Hijo extends Base { }',
    );
    expect(programa.otrosTiposDeNivelSuperior).toHaveLength(2);
    expect(programa.otrosTiposDeNivelSuperior.map((t) => t.codigo)).toEqual(['otro-tipo-de-nivel-superior-no-soportado', 'otro-tipo-de-nivel-superior-no-soportado']);
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

  // Tarea 1.35: este test fijaba el falso rechazo (javac compila un archivo vacío y uno con solo imports). Ahora son un aviso; ver `analizador-sintactico.test.ts`.
  it('un archivo sin ningún tipo (vacío, solo imports) NO es un error de sintaxis: es el aviso de que no tiene ninguna clase', () => {
    expect(analizar('').otrosTiposDeNivelSuperior).toMatchObject([{ codigo: 'archivo-sin-clase' }]);
    expect(analizar('import java.util.Scanner;').otrosTiposDeNivelSuperior).toMatchObject([{ codigo: 'archivo-sin-clase' }]);
  });

  it('control: con un tipo (aunque no sea una clase) el aviso es el de siempre, no el de «sin clase»', () => {
    expect(analizar('interface I { }').otrosTiposDeNivelSuperior).toMatchObject([{ codigo: 'otro-tipo-de-nivel-superior-no-soportado' }]);
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

  // Tarea 1.35 (hallado por una semilla nueva del mutador, `for (float x : datos)`; javac 17.0.18 compila las diez formas): la variable del `for` mejorado lleva un TIPO completo
  // (JLS 14.14.2): un primitivo que el subconjunto no ejecuta (`float`, `byte`), un arreglo (`int[] fila`, la forma de recorrer una matriz), un nombre con paquete, genéricos
  // (`Map.Entry<K, V>`), `var` o `final`. El reconocedor solo veía un tipo de UN token y las demás formas daban «Te falta cerrar un paréntesis»: eran falsos RECHAZOS.
  it.each([
    'for (float x : datos) { }',
    'for (byte b : bytes) { }',
    'for (final String s : lista) { }',
    'for (final int x : datos) { }',
    'for (int[] fila : matriz) { }',
    'for (String[] fila : tabla) { }',
    'for (Map.Entry<String, Integer> e : mapa.entrySet()) { }',
    'for (java.lang.String s : lista) { }',
    'for (var x : lista) { }',
    'for (List<String> l : listas) { }',
  ])('«%s» es el aviso de for mejorado, no un error de sintaxis', (sentencia) => {
    expect(primeraSentencia(sentencia)).toMatchObject({ tipo: 'no-soportado', codigo: 'for-mejorado-no-soportado' });
  });

  it('el aviso cubre desde el `for` hasta el final del cuerpo, y lo que sigue se sigue leyendo', () => {
    const fuente = 'class C { public static void main(String[] a) { for (int[] fila : m) { int t = 0; } int z = 1; } }';
    const elementos = analizar(fuente).clase.main!.cuerpo.elementos;
    expect(elementos).toHaveLength(2);
    expect(fuente.slice(elementos[0]!.rango.inicio, elementos[0]!.rango.fin)).toBe('for (int[] fila : m) { int t = 0; }');
  });

  it('control: los `for` clásicos con declaraciones o con expresiones NO son el mejorado: se siguen leyendo como `for`', () => {
    expect(primeraSentencia('for (int i = 0, j = 5; i < j; i++, j--) { }').tipo).toBe('for');
    expect(primeraSentencia('for (i = 0; i < 3; i++) { }').tipo).toBe('for');
    expect(primeraSentencia('for (;;) { }').tipo).toBe('for');
    expect(primeraSentencia('for (int i = a ? b : c; i < 3; i++) { }').tipo).toBe('for');
    expect(primeraSentencia('for (String s = "a"; s.length() < 3; s += "b") { }').tipo).toBe('for');
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
    // Tarea 1.35 (WARNING 3: `sealed interface Forma permits A, B { }` daba «error-no-clasificado»; javac 17 lo compila): `sealed` y `non-sealed` son
    // modificadores contextuales (JLS 8.1.1.2) y `permits` una cláusula; ninguno cambia que el miembro sea una clase interna: un aviso.
    'sealed interface F permits A, B { }',
    'public sealed interface G permits H { }',
    'static sealed class A permits B { }',
    'static non-sealed class B extends A { }',
    'sealed abstract class S permits T { }',
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

// Tarea 1.35 (SUGGESTION-3 de la re-verificación del lote 1: «un campo sin `;` da una línea distinta de la de javac»; cada fuente verificada con javac 17.0.18): un campo sin su `;` se
// señala donde javac lo hace, en el FIN de su última palabra («';' expected»), no en el final del siguiente miembro. javac lee un campo como `Tipo nombre [= expresión] {, nombre …} ;`: la
// expresión se acaba donde la siguiente palabra ya no puede continuarla —un modificador, un tipo, `class`, un nombre que sigue a otro nombre o a un literal—, y lo que falta es el `;`.
describe('consumirMiembroDeClase — un campo sin `;` se señala en el fin de su última palabra, como javac (tarea 1.35, SUGGESTION-3)', () => {
  const siguienteMiembro = 'public static void main(String[] a) { }';
  const errorDe = (fuente: string): ErrorDeCompilacion => {
    try {
      analizar(fuente);
    } catch (error) {
      if (error instanceof ErrorDeCompilacion) return error;
      throw error;
    }
    throw new Error(`se esperaba un ErrorDeCompilacion para: ${fuente}`);
  };
  const conMiembroDetras = (campo: string, siguiente: string = siguienteMiembro): string => `class C {\n    ${campo}\n    ${siguiente}\n}`;

  it.each([
    ['con un literal y un modificador detrás', 'int x = 5'],
    ['con un literal y un tipo primitivo detrás (el siguiente campo)', 'static final int MAX = 10'],
    ['con una cadena', 'String s = "a"'],
    ['con un carácter', "char c = 'a'"],
    ['con un nombre y un modificador detrás', 'int total = suma'],
    ['con una llamada y un modificador detrás', 'int n = Math.abs(-1)'],
    ['con un inicializador de arreglo', 'int[] a = { 1, 2 }'],
    ['con un arreglo nuevo', 'int[] a = new int[3]'],
    ['con corchetes tras el nombre', 'int a[] = { 1 }'],
    ['con una clase anónima', 'Object o = new Object() { }'],
    ['con una lambda de bloque', 'Runnable r = () -> { }'],
    ['con una expresión switch', 'int w = switch (k) { default -> 0; }'],
    ['con un operador ternario', 'int x = c ? 1 : 2'],
    ['con varios declaradores', 'int a = 1, b = 2'],
    ['con un tipo genérico', 'java.util.List<String> l = new java.util.ArrayList<String>()'],
    ['con los argumentos de un constructor', 'static java.util.Scanner sc = new java.util.Scanner(System.in)'],
    ['con un grupo que no puede ser una conversión', 'int s = (a + 1)'],
    ['con una conversión y su operando', 'double d = (double) 5'],
    ['sin inicializador', 'int x'],
    ['sin inicializador y con modificadores', 'private static String nombre'],
    ['sin inicializador y con varios nombres', 'int a, b'],
  ])('%s: «falta-punto-y-coma» en el fin de la última palabra del campo', (_descripcion, campo) => {
    const fuente = conMiembroDetras(campo);
    const error = errorDe(fuente);
    expect(error.codigo).toBe('falta-punto-y-coma');
    // El error está en la línea del campo (la 2) y exactamente al final de su texto.
    expect(error.rango.inicio).toBe(fuente.indexOf(campo) + campo.length);
    expect(error.rango.fin).toBe(error.rango.inicio);
  });

  // Lo que sigue al campo olvidado no tiene que ser un método: cualquier miembro empieza con algo que no puede continuar una expresión.
  it.each([
    ['otro campo con tipo primitivo', 'int x = 5', 'int y;'],
    ['otro campo con tipo de clase', 'int x = y', 'Scanner sc;'],
    ['otro campo con modificadores', 'String s = "a"', 'private String t;'],
    ['un constructor', 'private String nombre', 'C(String n) { }'],
    ['un método con tipo de retorno', 'static final double PI = 3.14159', 'static double area(double r) { return r; }'],
    ['una clase anidada', 'int x = 5', 'class Q { }'],
    ['una interfaz anidada', 'int x = 5', 'interface Q { }'],
    ['un enum anidado', 'int x = 5', 'enum Q { A }'],
    ['un bloque inicializador', 'int x = 5', '{ }'],
    ['un bloque estático', 'int x = 5', 'static { }'],
    ['un literal (una cadena que sigue a otra sin el +)', 'String s = "a"', '"b";'],
    ['el mismo renglón', 'int a = 5 int b = 6;', ''],
  ])('lo que sigue es %s: el error sigue en el campo', (_descripcion, campo, siguiente) => {
    const fuente = conMiembroDetras(campo, `${siguiente}\n    ${siguienteMiembro}`);
    const error = errorDe(fuente);
    expect(error.codigo).toBe('falta-punto-y-coma');
    const finDelCampo = campo === 'int a = 5 int b = 6;' ? fuente.indexOf('5') + 1 : fuente.indexOf(campo) + campo.length;
    expect(error.rango.inicio).toBe(finDelCampo);
  });

  // La cabecera `Tipo nombre` seguida de algo que no es «=», «,», «;» ni «(» también es un campo sin su `;`: javac lo señala en el fin del NOMBRE.
  it.each([
    ['un operador', 'int x +', 'int x'],
    ['un número', 'int x 5;', 'int x'],
    ['un punto', 'int x.y;', 'int x'],
    ['una llave', 'int x { }', 'int x'],
    ['una cadena', 'String s "a";', 'String s'],
    ['corchetes vacíos tras el nombre', 'int x[] 5;', 'int x[]'],
  ])('la cabecera de un campo seguida de %s: «falta-punto-y-coma» en el fin del nombre', (_descripcion, campo, hastaElNombre) => {
    const fuente = conMiembroDetras(campo);
    const error = errorDe(fuente);
    expect(error.codigo).toBe('falta-punto-y-coma');
    expect(error.rango.inicio).toBe(fuente.indexOf(hastaElNombre) + hastaElNombre.length);
  });

  it('un campo sin inicializador al final de la clase: el error está en el fin de su nombre, no en la «}»', () => {
    const fuente = 'class C {\n    public static void main(String[] a) { }\n    int x\n}';
    const error = errorDe(fuente);
    expect(error.codigo).toBe('falta-punto-y-coma');
    expect(error.rango.inicio).toBe(fuente.indexOf('int x') + 'int x'.length);
  });

  // Lo que NO cambia: un `void` o un miembro con parámetros de tipo exige el «(» de un método, y javac lo dice en el token que sigue («'(' expected»), no en el fin del nombre.
  it.each([
    ['void x', 'void x'],
    ['<T> int x', '<T> int x'],
  ])('«%s» sin paréntesis sigue siendo un error en el token siguiente, no «falta el ;»', (_descripcion, cabecera) => {
    const fuente = conMiembroDetras(cabecera);
    const error = errorDe(fuente);
    expect(error.codigo).not.toBe('falta-punto-y-coma');
    expect(error.rango.inicio).toBe(fuente.indexOf('public'));
  });

  // Control: lo que SÍ es un campo válido nunca da «falta el `;`» — la expresión puede ser casi cualquier cosa (arreglos, lambdas, clases anónimas, `instanceof` con patrón, conversiones,
  // genéricos, referencias a método, el ternario, un `switch`, varios nombres en una declaración). Todas estas líneas las compila javac 17.0.18 sin errores.
  it.each([
    'int[] a = { 1, 2 };',
    'static final String S = "a" + \'b\' + 1;',
    'Runnable r = () -> { };',
    'Object o = new Object() { int q; };',
    'boolean b = o instanceof String s && s.isEmpty();',
    'boolean c = o instanceof final String t ? true : false;',
    'boolean arr = o instanceof String[] sa;',
    'double d = (double) x / 2;',
    'List<String> l = new ArrayList<String>();',
    'Map<String, List<Integer>> m = new HashMap<>();',
    'int a = 1, b = 2;',
    'Comparator<String> c = String::compareTo;',
    'int v = cond ? 1 : 2;',
    'Foo f = (Foo) bar;',
    'int w = switch (k) { case 1 -> 1; default -> 0; };',
    'String t = "una" + \'\\n\';',
    'int x;',
    'private static int y = z++;',
    'Class<?> cl = int.class;',
    'Class<?> cl3 = true ? int.class : void.class;',
    'Object oc = (Object) int.class;',
    'IntFunction<int[]> fab = int[]::new;',
    'int y = x\n        - z;',
    'String s = "a"\n        + "b";',
  ])('control: «%s» es un campo válido (aviso de miembro) aunque otro miembro venga detrás', (campo) => {
    const programa = analizar(conMiembroDetras(campo));
    expect(programa.clase.main).not.toBeNull();
    expect(programa.clase.otrosMiembros).toHaveLength(1);
  });

  // `(a)` seguido de una palabra es, para javac, una conversión de `a` y NO un «falta el ;» (`int s = (a)` + `int t;` → «'.class' expected»): ahí no se afirma nada falso.
  it('un grupo que podría ser el tipo de una conversión no se señala como «falta el ;» (javac da otro error)', () => {
    const programa = analizar(conMiembroDetras('int s = (a)', `int t;\n    ${siguienteMiembro}`));
    expect(programa.clase.main).not.toBeNull();
  });
});

// Tarea 1.35 (la campaña del generador, con los campos sin `;` que sumó a su gramática, halló 4 de 7 programas con la línea distinta; cada fuente verificada con javac 17.0.18): un campo
// cuya expresión se queda ESPERANDO un operando (`int x =`, `int x = 5 +`, `c ?`, `->`…) y cuyo siguiente miembro empieza con un modificador no es un «falta el `;`»: javac dice
// «illegal start of expression» EN EL MODIFICADOR, porque la expresión todavía no podía terminar. Y una coma sin el nombre del siguiente campo (`int a = 1,`) es
// «<identifier> expected» en el FIN de la coma, no en lo que viene después.
describe('consumirMiembroDeClase — un campo que espera un operando y un modificador que le sigue (tarea 1.35)', () => {
  const errorDe = (fuente: string): ErrorDeCompilacion => {
    try {
      analizar(fuente);
    } catch (error) {
      if (error instanceof ErrorDeCompilacion) return error;
      throw error;
    }
    throw new Error(`se esperaba un ErrorDeCompilacion para: ${fuente}`);
  };

  it.each([
    ['un `=`', 'int x ='],
    ['un `+`', 'int x = 5 +'],
    ['un `-`', 'int x = 5 -'],
    ['un `*`', 'int x = 5 *'],
    ['un `&&`', 'boolean b = true &&'],
    ['un `||`', 'boolean b = true ||'],
    ['un `==`', 'boolean b = 1 =='],
    ['un `<=`', 'boolean b = 1 <='],
    ['un `?`', 'int x = c ?'],
    ['un `:`', 'int x = c ? 1 :'],
    ['una flecha de lambda', 'Runnable r = () ->'],
    ['un `!`', 'boolean b = !'],
    ['un `~`', 'int x = ~'],
    // El resto del conjunto, uno por uno (cada forma verificada con javac 17.0.18: «illegal start of expression» en el modificador). Una asignación compuesta solo cabe como
    // expresión dentro del inicializador (`int x = y +=`): tras el nombre del campo, `+=` ya no es válido.
    ['un `/`', 'int x = 5 /'],
    ['un `%`', 'int x = 5 %'],
    ['un `&`', 'boolean b = true &'],
    ['un `|`', 'boolean b = true |'],
    ['un `^`', 'boolean b = true ^'],
    ['un `!=`', 'boolean b = 1 !='],
    ['un `>=`', 'boolean b = 1 >='],
    ['un `<<`', 'int x = 1 <<'],
    ['un `+=`', 'int x = y +='],
    ['un `-=`', 'int x = y -='],
    ['un `*=`', 'int x = y *='],
    ['un `/=`', 'int x = y /='],
    ['un `%=`', 'int x = y %='],
    ['un `&=`', 'int x = y &='],
    ['un `|=`', 'int x = y |='],
    ['un `^=`', 'int x = y ^='],
    ['un `<<=`', 'int x = y <<='],
    ['un `>>=`', 'int x = y >>='],
    ['un `>>>=`', 'int x = y >>>='],
  ])('tras %s, un modificador que abre el siguiente miembro: error SIN código de «falta el ;», en el modificador', (_descripcion, campo) => {
    for (const modificador of ['public static void main(String[] a) { }', 'static int z = 1;', 'private int w = 2;', 'final int k = 3;']) {
      const fuente = `class C {\n    ${campo}\n    ${modificador}\n}`;
      const error = errorDe(fuente);
      expect(error.codigo, `${campo} / ${modificador}`).not.toBe('falta-punto-y-coma');
      expect(error.rango.inicio, `${campo} / ${modificador}`).toBe(fuente.indexOf(modificador.split(' ')[0]!, fuente.indexOf(campo) + campo.length));
    }
  });

  it('una coma sin el nombre del siguiente campo: el error está en el FIN de la coma («<identifier> expected»), aunque lo que sigue esté en otro renglón', () => {
    for (const siguiente of ['static int z = 1;', 'public static void main(String[] a) { }', 'int otro;']) {
      const fuente = `class C {\n    int a = 1,\n    ${siguiente}\n}`;
      const error = errorDe(fuente);
      expect(error.rango.inicio, siguiente).toBe(fuente.indexOf(',') + 1);
    }
  });

  it.each([
    ['un punto', 'int x = a.', 'a.'],
    ['`new`', 'Object o = new', 'new'],
  ])('tras %s, un modificador: «<identifier> expected» en el FIN de ese token (javac lo pide ahí), no en el modificador', (_descripcion, campo, hasta) => {
    for (const modificador of ['public static void main(String[] a) { }', 'static int z = 1;', 'private int w = 2;']) {
      const fuente = `class C {\n    ${campo}\n    ${modificador}\n}`;
      const error = errorDe(fuente);
      expect(error.codigo, `${campo} / ${modificador}`).not.toBe('falta-punto-y-coma');
      expect(error.rango.inicio, `${campo} / ${modificador}`).toBe(fuente.indexOf(hasta) + hasta.length);
    }
  });

  // Una anotación pegada al fin de un campo (la del miembro siguiente) no continúa nada: tras el NOMBRE (`static double d`) javac la lee como una anotación de TIPO que falta
  // («illegal start of type») y tras un operando («static final int MAX = 10») como el inicio de una expresión («illegal start of expression»): en los dos casos EN la `@`.
  it.each([
    ['el nombre de un campo sin inicializador', 'static double d'],
    ['el nombre de un campo con corchetes', 'int a[]'],
    ['un literal', 'static final int MAX = 10'],
    ['un nombre', 'int x = y'],
    ['una llamada', 'int n = Math.abs(-1)'],
    ['una cadena', 'String s = "a"'],
  ])('una anotación tras %s: error SIN código de «falta el ;», en la `@`', (_descripcion, campo) => {
    const fuente = `class C {\n    ${campo}\n    @Deprecated int viejo;\n    public static void main(String[] a) { }\n}`;
    const error = errorDe(fuente);
    expect(error.codigo, campo).not.toBe('falta-punto-y-coma');
    expect(error.rango.inicio, campo).toBe(fuente.indexOf('@'));
  });

  // Tras la `}` de un arreglo (`= { 1, 2 }`) o de un `switch` la expresión YA terminó: javac pide el «;» en el fin de esa `}` y no ve la anotación. Tras la de una clase anónima, una lambda
  // o un arreglo creado con `new` (`new int[] { 1 }`) la expresión todavía admitía un sufijo, y la `@` es «illegal start of expression».
  it.each([
    ['un arreglo', 'int[] arr = { 1, 2 }'],
    ['un arreglo de arreglos', 'int[][] m = { { 1 }, { 2 } }'],
    ['dos arreglos', 'int[] a = { 1 }, b = { 2 }'],
    ['una expresión switch', 'int w = switch (k) { default -> 0; }'],
  ])('una anotación tras la `}` de %s: «falta-punto-y-coma» en el fin de esa `}`', (_descripcion, campo) => {
    const fuente = `class C {\n    ${campo}\n    @Deprecated int viejo;\n    public static void main(String[] a) { }\n}`;
    const error = errorDe(fuente);
    expect(error.codigo, campo).toBe('falta-punto-y-coma');
    expect(error.rango.inicio, campo).toBe(fuente.indexOf(campo) + campo.length);
  });

  it.each([
    ['una clase anónima', 'Object o = new Object() { int q; }'],
    ['una clase anónima con tipo genérico', 'java.util.List<String> l = new java.util.ArrayList<String>() { }'],
    ['una lambda de bloque', 'Runnable r = () -> { int q = 1; }'],
    ['un arreglo creado con new', 'int[] z = new int[] { 1 }'],
  ])('una anotación tras la `}` de %s: error SIN código de «falta el ;», en la `@`', (_descripcion, campo) => {
    const fuente = `class C {\n    ${campo}\n    @Deprecated int viejo;\n    public static void main(String[] a) { }\n}`;
    const error = errorDe(fuente);
    expect(error.codigo, campo).not.toBe('falta-punto-y-coma');
    expect(error.rango.inicio, campo).toBe(fuente.indexOf('@'));
  });

  // Un bloque `{ … }` tras un `)` que no es una llamada, ni el selector de un `switch`, ni una lambda no puede continuar la expresión: «';' expected» en el fin del `)`.
  it.each([
    ['un grupo con operadores', 'int s = (1 + 2)'],
    ['un grupo de un solo literal', 'int t = (5)'],
    ['un grupo que podría ser una conversión', 'int u = (x)'],
    ['los argumentos de una llamada (no de un `new`)', 'int v = f(1)'],
    ['los argumentos de una llamada con receptor', 'int n = Math.abs(-1)'],
  ])('un bloque tras %s: «falta-punto-y-coma» en el fin del `)`', (_descripcion, campo) => {
    const fuente = `class C {\n    ${campo}\n    { }\n    public static void main(String[] a) { }\n}`;
    const error = errorDe(fuente);
    expect(error.codigo, campo).toBe('falta-punto-y-coma');
    expect(error.rango.inicio, campo).toBe(fuente.indexOf(campo) + campo.length);
  });

  it.each([
    ['un arreglo', 'int[] arr = { 1, 2 }'],
    ['un arreglo con corchetes tras el nombre', 'int a[] = { 1 }'],
    ['una expresión switch', 'int w = switch (k) { default -> 0; }'],
  ])('un bloque tras la `}` de %s: «falta-punto-y-coma» en el fin de esa `}` (la expresión ya terminó)', (_descripcion, campo) => {
    const fuente = `class C {\n    ${campo}\n    { }\n    public static void main(String[] a) { }\n}`;
    const error = errorDe(fuente);
    expect(error.codigo, campo).toBe('falta-punto-y-coma');
    expect(error.rango.inicio, campo).toBe(fuente.indexOf(campo) + campo.length);
  });

  it('control: los `{` que SÍ continúan un campo siguen siendo válidos (clase anónima, lambda de bloque, selector de `switch`, arreglo, `new` con argumentos)', () => {
    for (const campo of [
      'Object o = new Object() { };',
      'Object p = new Object() { int q; };',
      'Runnable r = () -> { };',
      'int w = switch (a + 1) { default -> 0; };',
      'int v = switch (a) { case 1 -> 1; default -> 0; };',
      'int[] arr = { 1, 2 };',
      'int[] otro = new int[] { 1, 2 };',
      'java.util.List<String> l = new java.util.ArrayList<String>() { };',
    ]) {
      const programa = analizar(`class C {\n    ${campo}\n    public static void main(String[] a) { }\n}`);
      expect(programa.clase.main, campo).not.toBeNull();
    }
  });

  it('control: el operador y su operando en renglones distintos es un campo válido (la expresión sigue abajo)', () => {
    for (const campo of ['int x = 5 +\n        3;', 'int y = c ?\n        1 : 2;', 'boolean b = true &&\n        false;', 'Runnable r = () ->\n        System.out.println(1);', 'int a = 1,\n        b = 2;']) {
      const programa = analizar(`class C {\n    ${campo}\n    public static void main(String[] a) { }\n}`);
      expect(programa.clase.main, campo).not.toBeNull();
    }
  });

  it('control: `instanceof final String s` es válido (el `final` no abre un miembro: lo pide el patrón)', () => {
    const programa = analizar('class C {\n    boolean b = o instanceof final String s;\n    public static void main(String[] a) { }\n}');
    expect(programa.clase.main).not.toBeNull();
  });
});

// Tarea 1.35 (la mutación por elemento de los conjuntos cerrados del reconocedor de campos mostró que ninguna prueba protegía las 3 palabras de literal, 7 de las 9 de tipo primitivo, 8 de los 11
// signos de un tipo ni 6 de los 11 modificadores de miembro; y al probarlos uno por uno javac mostró 6 diferencias más: `class`, `interface` y `default` tras un operador, un «.» o un `new`):
// UNA fila por elemento, cada una verificada con javac 17.0.18 (sondas 24a y 24b: 82 programas completos, misma línea que javac).
describe('consumirMiembroDeClase — cada elemento de los conjuntos cerrados del reconocedor de campos tiene su fila (tarea 1.35)', () => {
  const errorDe = (fuente: string): ErrorDeCompilacion => {
    try {
      analizar(fuente);
    } catch (error) {
      if (error instanceof ErrorDeCompilacion) return error;
      throw error;
    }
    throw new Error(`se esperaba un ErrorDeCompilacion para: ${fuente}`);
  };

  // Las 15 palabras que abren un miembro (los 11 modificadores, `default`, `class`, `interface` y `enum`), cada una con un miembro completo que empieza con ella.
  const MIEMBROS_POR_PALABRA: ReadonlyArray<readonly [string, string]> = [
    ['public', 'public int a;'],
    ['protected', 'protected int a;'],
    ['private', 'private int a;'],
    ['static', 'static int a;'],
    ['final', 'final int a;'],
    ['abstract', 'abstract void a();'],
    ['synchronized', 'synchronized void a() { }'],
    ['transient', 'transient int a;'],
    ['volatile', 'volatile int a;'],
    ['native', 'native void a();'],
    ['strictfp', 'strictfp void a() { }'],
    ['default', 'default int a;'],
    ['class', 'class Q { }'],
    ['interface', 'interface Q { }'],
    ['enum', 'enum Q { A }'],
  ];

  it.each(MIEMBROS_POR_PALABRA)('tras un operando, un miembro que empieza con `%s`: «falta-punto-y-coma» en el fin del operando', (_palabra, miembro) => {
    const fuente = `class C {\n    int x = 5\n    ${miembro}\n}`;
    const error = errorDe(fuente);
    expect(error.codigo).toBe('falta-punto-y-coma');
    expect(error.rango.inicio).toBe(fuente.indexOf('5') + 1);
  });

  it.each(MIEMBROS_POR_PALABRA)('tras un operador (`int x =`), un miembro que empieza con `%s`: «illegal start of expression» EN la palabra, no «falta el ;»', (palabra, miembro) => {
    const fuente = `class C {\n    int x =\n    ${miembro}\n}`;
    const error = errorDe(fuente);
    expect(error.codigo).not.toBe('falta-punto-y-coma');
    expect(error.rango.inicio).toBe(fuente.indexOf(palabra, fuente.indexOf('=')));
  });

  // Tras un «.» o un `new` javac pide un NOMBRE y lo señala en el fin de ese token. Excepciones: `class` tras un «.» es un literal de clase (`a.class`) y `enum` se lee como un
  // identificador mal usado (el error cae en la palabra, como con cualquier nombre reservado).
  it.each(MIEMBROS_POR_PALABRA.filter(([palabra]) => palabra !== 'class' && palabra !== 'enum'))('tras un «.», un miembro que empieza con `%s`: «<identifier> expected» en el fin del punto', (_palabra, miembro) => {
    const fuente = `class C {\n    int x = a.\n    ${miembro}\n}`;
    const error = errorDe(fuente);
    expect(error.codigo).not.toBe('falta-punto-y-coma');
    expect(error.rango.inicio).toBe(fuente.indexOf('a.') + 2);
  });

  it.each(MIEMBROS_POR_PALABRA.filter(([palabra]) => palabra !== 'enum'))('tras un `new`, un miembro que empieza con `%s`: «<identifier> expected» en el fin de `new`', (_palabra, miembro) => {
    const fuente = `class C {\n    Object o = new\n    ${miembro}\n}`;
    const error = errorDe(fuente);
    expect(error.codigo).not.toBe('falta-punto-y-coma');
    expect(error.rango.inicio).toBe(fuente.indexOf('new') + 3);
  });

  it.each([
    ['int', 'int a;'],
    ['long', 'long a;'],
    ['double', 'double a;'],
    ['float', 'float a;'],
    ['char', 'char a;'],
    ['boolean', 'boolean a;'],
    ['byte', 'byte a;'],
    ['short', 'short a;'],
    ['void', 'void a() { }'],
  ])('tras un operando, un miembro cuyo tipo es `%s`: «falta-punto-y-coma» en el fin del operando', (_palabra, miembro) => {
    const fuente = `class C {\n    int x = 5\n    ${miembro}\n}`;
    const error = errorDe(fuente);
    expect(error.codigo).toBe('falta-punto-y-coma');
    expect(error.rango.inicio).toBe(fuente.indexOf('5') + 1);
  });

  // `true`, `false` y `null` son operandos: lo que sigue a uno de ellos ya no puede continuar la expresión; y detrás de otro operando no pueden aparecer (`y true`).
  it.each([
    ['true', 'boolean b = true'],
    ['false', 'boolean b = false'],
    ['null', 'Object o = null'],
  ])('un campo que termina en `%s` y el siguiente miembro: «falta-punto-y-coma» en el fin del literal', (palabra, campo) => {
    const fuente = `class C {\n    ${campo}\n    int y;\n}`;
    const error = errorDe(fuente);
    expect(error.codigo).toBe('falta-punto-y-coma');
    expect(error.rango.inicio).toBe(fuente.indexOf(campo) + campo.length);
    expect(fuente.slice(error.rango.inicio - palabra.length, error.rango.inicio)).toBe(palabra);
  });

  it.each(['true', 'false', 'null'])('un `%s` detrás de un operando («y %s»): «falta-punto-y-coma» en el fin del operando', (palabra) => {
    const fuente = `class C {\n    boolean b = y ${palabra};\n}`;
    const error = errorDe(fuente);
    expect(error.codigo).toBe('falta-punto-y-coma');
    expect(error.rango.inicio).toBe(fuente.indexOf('y') + 1);
  });

  // Los signos que puede llevar el TIPO de una conversión (`(Map<K, V>) x`): sin cualquiera de ellos, el grupo no se reconocería como un posible cast y el nombre que sigue
  // se leería como «dos nombres seguidos»: un «falta el ;» falso para un campo que javac compila.
  it.each([
    ['una coma (dos argumentos de tipo)', 'static Object a = (java.util.Map<String, Integer>) x;'],
    ['un `>>` (un genérico dentro de otro)', 'static Object a = (java.util.List<java.util.List<String>>) x;'],
    ['un `>>>` (tres genéricos anidados)', 'static Object a = (java.util.List<java.util.List<java.util.List<String>>>) x;'],
    ['un comodín `?`', 'static Object a = (java.util.List<?>) x;'],
    ['un `&` (una intersección)', 'static Object a = (Object & java.io.Serializable) x;'],
    ['corchetes (un arreglo)', 'static Object a = (int[]) x;'],
    ['dos pares de corchetes', 'static Object a = (String[][]) x;'],
    ['una anotación del tipo', 'static Object a = (@Deprecated String) x;'],
  ])('un campo con una conversión cuyo tipo lleva %s es válido (aviso), aunque otro miembro venga detrás', (_descripcion, campo) => {
    const programa = analizar(`class C {\n    static Object x = null;\n    ${campo}\n    static int z = 1;\n    public static void main(String[] a) { }\n}`);
    expect(programa.clase.main).not.toBeNull();
    expect(programa.clase.otrosMiembros).toHaveLength(3);
  });

  // Y los argumentos de tipo de un `new` con cuerpo (clase anónima): la «(» tras ellos son los argumentos del constructor y la «{» el cuerpo, no un «falta el ;».
  it.each([
    ['una coma', 'static Object a = new java.util.HashMap<String, Integer>() { };'],
    ['un `>>`', 'static Object a = new java.util.ArrayList<java.util.List<String>>() { };'],
    ['un `>>>`', 'static Object a = new java.util.ArrayList<java.util.List<java.util.List<String>>>() { };'],
    ['un comodín `?`', 'static Object a = new java.util.ArrayList<?>() { };'],
  ])('un campo con una clase anónima cuyo tipo lleva %s es válido (aviso)', (_descripcion, campo) => {
    const programa = analizar(`class C {\n    ${campo}\n    static int z = 1;\n    public static void main(String[] a) { }\n}`);
    expect(programa.clase.main).not.toBeNull();
    expect(programa.clase.otrosMiembros).toHaveLength(2);
  });

  // Los 11 modificadores de miembro son miembros válidos (avisos): `native` y `abstract` sin cuerpo, los demás con él.
  it.each([
    'protected int a;',
    'synchronized void s() { }',
    'transient int t;',
    'volatile int v;',
    'native void n();',
    'strictfp void f() { }',
    'abstract void q();',
  ])('control: «%s» es un miembro válido (aviso)', (miembro) => {
    const programa = analizar(`class C {\n    ${miembro}\n    public static void main(String[] a) { }\n}`);
    expect(programa.clase.main).not.toBeNull();
    expect(programa.clase.otrosMiembros).toHaveLength(1);
  });
});

// Tarea 1.35 (la misma mutación por elemento, sobre `sealed`): `JavacParser.isSealedClassStart` (JDK 17, miembros y nivel superior) acepta tras `sealed` EXACTAMENTE estas palabras —los
// modificadores `public protected private abstract static final strictfp` y `class interface enum`—, una anotación que no abra `@interface`, otro `sealed` o `non-sealed`; ninguna otra
// (`synchronized`, `native`, `transient`, `volatile`, `default`, un tipo, un nombre). `non-sealed` son tres tokens PEGADOS.
describe('longitudDeModificadorSellado — qué palabras puede seguir a `sealed` y a `non-sealed` (tarea 1.35, JavacParser.isSealedClassStart)', () => {
  const longitudDe = (texto: string): number => longitudDeModificadorSellado(new CursorDeTokens(tokenizar(texto)), 0);

  it.each(['public', 'protected', 'private', 'abstract', 'static', 'final', 'strictfp', 'class', 'interface', 'enum'])('`sealed %s` es el modificador `sealed` (1 token)', (palabra) => {
    expect(longitudDe(`sealed ${palabra} X { }`)).toBe(1);
  });

  it.each(['public', 'protected', 'private', 'abstract', 'static', 'final', 'strictfp', 'class', 'interface', 'enum'])('`non-sealed %s` es el modificador `non-sealed` (3 tokens)', (palabra) => {
    expect(longitudDe(`non-sealed ${palabra} X { }`)).toBe(3);
  });

  it.each(['synchronized', 'native', 'transient', 'volatile', 'default', 'int', 'void', 'x', '=', ';'])('`sealed %s` NO es un modificador: `sealed` es un nombre', (palabra) => {
    expect(longitudDe(`sealed ${palabra} X { }`)).toBe(0);
  });

  it('una anotación, otro `sealed` o `non-sealed` tras `sealed` también cuentan; `@interface` solo tras `non-sealed`', () => {
    expect(longitudDe('sealed @A class X { }')).toBe(1);
    expect(longitudDe('sealed sealed class X { }')).toBe(1);
    expect(longitudDe('sealed non-sealed class X { }')).toBe(1);
    expect(longitudDe('sealed @interface X { }')).toBe(0);
    expect(longitudDe('non-sealed @interface X { }')).toBe(3);
  });

  it('`non-sealed` con espacios no es el modificador (son tres tokens que deben ir pegados)', () => {
    expect(longitudDe('non - sealed class X { }')).toBe(0);
    expect(longitudDe('non-sealed class X { }')).toBe(3);
  });
});

// Tarea 1.35: `strictfp` también es modificador de un tipo de nivel superior (`strictfp class Q { }` lo compila javac 17.0.18).
describe('no-soportado — `strictfp` como modificador de un tipo de nivel superior (tarea 1.35)', () => {
  it('`strictfp class Q { }` antes o después de la clase principal es un tipo más (aviso)', () => {
    const despues = analizar('class C { public static void main(String[] a) { } } strictfp class Q { }');
    expect(despues.otrosTiposDeNivelSuperior).toHaveLength(1);
    // Antes de la principal pasa lo mismo que con cualquier otra clase: la primera es «la clase» del programa y las demás son tipos más.
    const antes = analizar('strictfp class Q { } class C { public static void main(String[] a) { } }');
    expect(antes.clase.nombre).toBe('Q');
    expect(antes.otrosTiposDeNivelSuperior).toHaveLength(1);
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

  // Tarea 1.35 (WARNING 3, `sealed`/`permits`): la clase principal también puede ser sellada (`public sealed class C permits D`), y lo que no se puede
  // revisar con el resto del archivo (¿tiene subclases?, ¿están en la lista?) hace que sea un aviso, nunca un error; el modificador y la cláusula `permits`
  // cuentan como herencia (JLS 8.1.6). Con espacios, `non - sealed` NO es el modificador (javac pide los tres tokens pegados).
  it('"public sealed class C permits D": aviso del modificador `sealed` y aviso de herencia por la cláusula `permits`', () => {
    expect(avisosDeCabecera('public sealed class C permits D')).toEqual([
      { codigo: 'herencia-no-soportada', texto: 'sealed' },
      { codigo: 'herencia-no-soportada', texto: 'permits D' },
    ]);
  });

  it('triangulación: lista de `permits`, `sealed` antes de `public`, `non-sealed` con `extends`', () => {
    expect(avisosDeCabecera('sealed public class C permits D, E.F')).toEqual([
      { codigo: 'herencia-no-soportada', texto: 'sealed' },
      { codigo: 'herencia-no-soportada', texto: 'permits D, E.F' },
    ]);
    expect(avisosDeCabecera('non-sealed class C extends B')).toEqual([
      { codigo: 'herencia-no-soportada', texto: 'non-sealed' },
      { codigo: 'herencia-no-soportada', texto: 'extends B' },
    ]);
    expect(avisosDeCabecera('class C extends B implements A permits D')).toEqual([
      { codigo: 'herencia-no-soportada', texto: 'extends B implements A permits D' },
    ]);
  });

  it('una clase `sealed` sin cláusula `permits` también avisa (javac exige que tenga subclases en el mismo archivo, y eso no se revisa)', () => {
    expect(avisosDeCabecera('public sealed class C')).toEqual([{ codigo: 'herencia-no-soportada', texto: 'sealed' }]);
  });

  it('control: `sealed` y `permits` siguen siendo nombres válidos de variable, y `non - sealed` con espacios no es el modificador (error de sintaxis)', () => {
    const programa = analizar('class C { public static void main(String[] a) { int sealed = 1; int permits = 2; } }');
    expect(programa.clase.main).not.toBeNull();
    expect(() => analizar('non - sealed class C { public static void main(String[] a) { } }')).toThrow(ErrorDeCompilacion);
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
