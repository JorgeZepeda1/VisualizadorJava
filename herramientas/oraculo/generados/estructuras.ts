// Formas ESTRUCTURALES del generador diferencial (tarea 1.35). Hasta la 1.34 todo lo que el generador inventaba vivía dentro de `main`: declaraciones, casts, `switch`, ciclos… Pero la
// re-verificación independiente del lote 1 halló falsos RECHAZOS (programas que javac compila y el compilador marcaba como error) y falsos aceptos que viven en lo que RODEA a `main`:
// un campo al que le falta su `;`, un `main` con otra firma que la del lanzador, una clase sellada, un archivo sin ninguna clase, un `import` de un paquete que no existe, un escape
// Unicode con significado sintáctico. Cada forma de `FORMAS_ESTRUCTURALES` es UNA de esas ideas, con los rasgos que el programa debe mostrar (para que su familia no salga «sin
// rasgos») y si javac acepta su sintaxis (`generador-javac.test.ts` lo comprueba con el análisis sintáctico real de javac).
//
// Un programa estructural es 1 de cada 12 (`PERIODO_DE_LAS_ESTRUCTURAS`), ESTRATIFICADO como las demás familias fijas del generador: la forma i-ésima sale en el programa
// `FASE + PERIODO · i`, así que cada forma aparece cada `PERIODO · FORMAS.length` programas con cualquier semilla y no depende de la suerte. El residuo 5 módulo 12 nunca coincide
// con los de los casts (0 módulo 8), los literales (3 módulo 16) ni las clases con nombre del JDK (7 módulo 20): los cuatro son distintos módulo 4.
import type { Azar } from './azar.ts';
import {
  CLASE_POR_OMISION,
  declaracion,
  haz,
  literal,
  mientras,
  nombre,
  para,
  plantilla,
  salto,
  seleccion,
  sentenciaExpr,
  si,
  type EscapeUnicode,
  type Etiqueta,
  type Expr,
  type FinDeLinea,
  type MiembroDeClase,
  type Programa,
  type Sentencia,
} from './programa.ts';

export const PERIODO_DE_LAS_ESTRUCTURAS = 12;
export const FASE_DE_LAS_ESTRUCTURAS = 5;

/** Lo que una forma agrega alrededor del cuerpo de `main`. */
export interface RasgosEstructurales {
  /** Renglones que van ANTES de los imports que el cuerpo pida. */
  readonly imports?: readonly string[];
  readonly miembros?: readonly MiembroDeClase[];
  readonly parametrosDeMain?: string;
  /** Un archivo sin ninguna clase: no hay cuerpo, solo `imports`. */
  readonly sinClase?: boolean;
  readonly escapeUnicode?: EscapeUnicode;
  /** Sentencias que van ANTES de las del cuerpo: el uso de lo que la forma declara (una llamada, un `System.out`…). */
  readonly sentenciasAlPrincipio?: readonly Sentencia[];
  /** Tarea 1.36: con qué termina cada renglón del programa impreso (el retorno de carro solo y `\r\n` son fines de línea de Java). */
  readonly finDeLinea?: FinDeLinea;
  /** Tarea 1.36: el programa entero pretende un error de sintaxis (los tres puntos separados de `main`). */
  readonly sintaxisInvalida?: boolean;
}

export interface FormaEstructural {
  readonly nombre: string;
  /** Los rasgos que el programa con esta forma DEBE mostrar. */
  readonly etiquetas: readonly Etiqueta[];
  /** ¿Acepta javac la SINTAXIS del programa? Falso cuando la forma pide un error de sintaxis a propósito (un campo sin su `;`, un escape mal formado). */
  readonly sintaxisValida: boolean;
  readonly aplicar: (azar: Azar) => RasgosEstructurales;
}

/** El programa que sale de poner `forma` alrededor del `cuerpo` de `main` (los `imports` del cuerpo van detrás de los de la forma). */
export function conLaForma(forma: FormaEstructural, azar: Azar, cuerpo: readonly Sentencia[], importsDelCuerpo: readonly string[]): Programa {
  const rasgos = forma.aplicar(azar);
  const imports = [...(rasgos.imports ?? []), ...importsDelCuerpo];
  if (rasgos.sinClase === true) return { imports, sinClase: true, sentencias: [] };
  return {
    imports,
    ...(rasgos.miembros !== undefined ? { miembros: rasgos.miembros } : {}),
    ...(rasgos.parametrosDeMain !== undefined ? { parametrosDeMain: rasgos.parametrosDeMain } : {}),
    ...(rasgos.escapeUnicode !== undefined ? { escapeUnicode: rasgos.escapeUnicode } : {}),
    ...(rasgos.finDeLinea !== undefined ? { finDeLinea: rasgos.finDeLinea } : {}),
    ...(rasgos.sintaxisInvalida === true ? { sintaxisInvalida: true } : {}),
    sentencias: [...(rasgos.sentenciasAlPrincipio ?? []), ...cuerpo],
  };
}

// ---- Piezas comunes ----

// Una barra real: este archivo nunca lleva una barra seguida de `u` escrita a mano (sería un escape de verdad para javac y para quien lo lea).
const BARRA = String.fromCharCode(92);

const miembro = (lineas: readonly string[], etiquetas: readonly Etiqueta[] = []): MiembroDeClase => ({ lineas, etiquetas });
const campo = (lineas: readonly string[], etiquetas: readonly Etiqueta[] = []): MiembroDeClase => miembro(lineas, ['campo-de-la-clase', ...etiquetas]);
const campoSinPuntoYComa = (lineas: readonly string[], despuesDeMain = false): MiembroDeClase => ({
  lineas,
  etiquetas: ['campo-de-la-clase'],
  sintaxisInvalida: true,
  ...(despuesDeMain ? { despuesDeMain: true } : {}),
});

const imprimir = (texto: string, tipo = 'String'): Sentencia => sentenciaExpr(plantilla(['System.out.println(', ')'], [literal(texto, tipo)], 'void', { etiquetas: ['impresion'] }));

function forma(nombreDeLaForma: string, etiquetas: readonly Etiqueta[], aplicar: (azar: Azar) => RasgosEstructurales, sintaxisValida = true): FormaEstructural {
  return { nombre: nombreDeLaForma, etiquetas, sintaxisValida, aplicar };
}

// ---- F: `main` con otra firma que la del lanzador ----

const firmaDeMain = (nombreDeLaForma: string, parametros: string, extra: Pick<RasgosEstructurales, 'sentenciasAlPrincipio'> = {}): FormaEstructural =>
  forma(nombreDeLaForma, ['main-con-otra-firma'], () => ({ parametrosDeMain: parametros, ...extra }));

const FIRMAS_DE_MAIN: readonly FormaEstructural[] = [
  firmaDeMain('main-con-varargs', 'String... args'),
  firmaDeMain('main-con-final', 'final String[] args'),
  firmaDeMain('main-con-corchetes-tras-el-nombre', 'String args[]'),
  firmaDeMain('main-con-final-y-varargs', 'final String... args'),
  firmaDeMain('main-con-dos-parametros', 'String[] args, int n'),
  firmaDeMain('main-sin-parametros', ''),
  firmaDeMain('main-con-parametro-que-no-es-arreglo', 'String args'),
  firmaDeMain('main-con-arreglo-de-otro-tipo', 'double[] args'),
  firmaDeMain('main-con-arreglo-de-arreglos', 'String[][] args'),
  // El parámetro `System` (un arreglo) tapa a la clase `System`: javac rechaza el `System.out` que lo usa.
  firmaDeMain('main-con-parametro-llamado-system', 'String[] System', { sentenciasAlPrincipio: [imprimir('"hola"')] }),
  // `main(args);` es una llamada a un método propio (a sí mismo); en una rama que no se ejecuta, para que el programa termine.
  forma('main-llamado-como-metodo-propio', ['llamada-a-main'], () => ({
    sentenciasAlPrincipio: [
      declaracion({ tipo: 'boolean', nombre: 'repetir', inicial: literal('false', 'boolean') }),
      si(nombre('repetir', 'boolean'), [sentenciaExpr(plantilla(['main(', ')'], [nombre('args', 'String[]')], 'void', { etiquetas: ['llamada-a-main'] }))], null),
    ],
  })),
];

// ---- C: clases selladas ----

const sellada = (nombreDeLaForma: string, miembros: readonly (readonly string[])[]): FormaEstructural =>
  forma(nombreDeLaForma, ['clase-sellada'], () => ({ miembros: miembros.map((lineas) => miembro(lineas, ['clase-sellada'])) }));

const CLASES_SELLADAS: readonly FormaEstructural[] = [
  sellada('sellada-interfaz-con-records', [
    ['sealed interface Forma permits Circulo, Cuadrado { }'],
    ['record Circulo(double r) implements Forma { }'],
    ['record Cuadrado(double l) implements Forma { }'],
  ]),
  sellada('sellada-clase-con-hija-final', [['static sealed class Base permits Hija { }'], ['static final class Hija extends Base { }']]),
  sellada('sellada-clase-con-hija-non-sealed', [['static sealed class Base permits Hija { }'], ['static non-sealed class Hija extends Base { }']]),
  sellada('sellada-sin-permits', [['sealed interface Forma { }'], ['static final class Circulo implements Forma { }']]),
  // javac rechaza (semántica, no sintaxis): una clase sellada sin hijas y un `permits` de un tipo que no existe.
  sellada('sellada-sin-hijas', [['static sealed class Base { }']]),
  sellada('sellada-con-permits-de-un-tipo-inexistente', [['sealed interface Forma permits Fantasma { }']]),
];

// ---- L: campos válidos, con la expresión de todas las formas ----

const campoValido = (nombreDeLaForma: string, miembros: readonly MiembroDeClase[]): FormaEstructural =>
  forma(nombreDeLaForma, ['campo-de-la-clase'], () => ({ miembros }));

const CAMPOS_VALIDOS: readonly FormaEstructural[] = [
  campoValido('campo-valido-con-la-expresion-en-el-renglon-siguiente', [
    campo(['static int y = 1;']),
    campo(['static int z = 2;']),
    campo(['static int x = y', '    - z;']),
    campo(['static String s = "a"', '    + "b";']),
  ]),
  campoValido('campo-valido-con-inicializador-de-arreglo', [campo(['static int[] a = { 1, 2 };'])]),
  campoValido('campo-valido-con-clase-anonima', [campo(['static Object o = new Object() { int q; };'], ['clase-anonima'])]),
  campoValido('campo-valido-con-lambda', [campo(['static Runnable r = () -> { };'])]),
  campoValido('campo-valido-con-instanceof-y-patron', [
    campo(['static Object o = "a";']),
    campo(['static boolean b = o instanceof String s && s.isEmpty();'], ['instanceof-con-patron']),
  ]),
  campoValido('campo-valido-con-conversion', [campo(['static Object o = "a";']), campo(['static String f = (String) o;'])]),
  campoValido('campo-valido-con-varios-declaradores', [campo(['static int a = 1, b = 2;'])]),
  campoValido('campo-valido-con-int-punto-class', [campo(['static Class<?> c = int.class;']), campo(['static Object oc = (Object) int.class;'])]),
  campoValido('campo-valido-con-referencia-a-metodo-de-arreglo', [campo(['static java.util.function.IntFunction<int[]> fab = int[]::new;'])]),
  campoValido('campo-valido-con-tipo-generico', [campo(['static java.util.List<String> l = new java.util.ArrayList<String>();'])]),
  campoValido('campo-valido-con-conversion-y-operacion', [campo(['static double d = (double) 5 / 2;'])]),
];

// ---- O: campos sin su `;` (javac: «';' expected» en el fin del último renglón del campo) ----

/** Lo que puede venir DESPUÉS del campo olvidado: `main` (nada más), otro campo, un método, un constructor, una clase anidada, un bloque… */
const MIEMBROS_QUE_PUEDEN_SEGUIR: readonly (readonly MiembroDeClase[])[] = [
  [],
  [campo(['int otro;'])],
  [campo(['private String nombre;'])],
  [campo(['static final double PI = 3.14159;'])],
  [miembro(['public int obtener() { return 1; }'])],
  [miembro([`${CLASE_POR_OMISION}(int n) { }`])],
  [miembro(['class Interna { }'])],
  [miembro(['static { }'])],
  [miembro(['{ }'])],
  [miembro(['@Deprecated int viejo;'])],
];

const camposSinPuntoYComa = (nombreDeLaForma: string, campos: readonly (readonly string[])[]): FormaEstructural =>
  forma(
    nombreDeLaForma,
    ['campo-de-la-clase'],
    (azar) => ({ miembros: [campoSinPuntoYComa(azar.elegir(campos)), ...azar.elegir(MIEMBROS_QUE_PUEDEN_SEGUIR)] }),
    false,
  );

const CAMPOS_SIN_PUNTO_Y_COMA: readonly FormaEstructural[] = [
  camposSinPuntoYComa('campo-sin-punto-y-coma-con-literal', [['int x = 5'], ['static final int MAX = 10'], ["char c = 'a'"], ['String s = "a"'], ['double d = 2.5'], ['boolean b = true']]),
  camposSinPuntoYComa('campo-sin-punto-y-coma-con-nombre', [['int total = suma'], ['int x = y'], ['String t = s']]),
  camposSinPuntoYComa('campo-sin-punto-y-coma-con-llamada', [['int n = Math.abs(-1)'], ['static int m = Math.max(1, 2)'], ['String s = String.valueOf(5)']]),
  camposSinPuntoYComa('campo-sin-punto-y-coma-con-arreglo', [['int[] a = { 1, 2 }'], ['int[] a = new int[3]'], ['int a[] = { 1 }'], ['String[] s = new String[2]']]),
  camposSinPuntoYComa('campo-sin-punto-y-coma-con-clase-anonima-o-lambda', [['Object o = new Object() { }'], ['Runnable r = () -> { }'], ['Runnable r = new Runnable() { public void run() { } }']]),
  camposSinPuntoYComa('campo-sin-punto-y-coma-con-varios-declaradores', [['int a = 1, b = 2'], ['int a, b'], ['int a = 1, b']]),
  camposSinPuntoYComa('campo-sin-punto-y-coma-sin-inicializador', [['int x'], ['private static String nombre'], ['private int edad'], ['static double d']]),
  camposSinPuntoYComa('campo-sin-punto-y-coma-con-conversion-o-grupo', [['double d = (double) 5'], ['int s = (1 + 2)'], ['int t = (5)']]),
  camposSinPuntoYComa('campo-sin-punto-y-coma-con-tipo-generico', [['java.util.List<String> l = new java.util.ArrayList<String>()'], ['java.util.Map<String, Integer> m = new java.util.HashMap<>()']]),
  // El último miembro de la clase: lo que sigue al campo es la `}` que la cierra.
  forma(
    'campo-sin-punto-y-coma-al-final-de-la-clase',
    ['campo-de-la-clase'],
    (azar) => ({ miembros: [campoSinPuntoYComa(azar.elegir([['int x'], ['int x = 5'], ['String s = "a"'], ['private static String nombre']]), true)] }),
    false,
  ),
];

const CAMPOS_MAL_ESCRITOS: readonly FormaEstructural[] = [
  forma('campos-en-el-mismo-renglon-sin-punto-y-coma', ['campo-de-la-clase'], () => ({ miembros: [campoSinPuntoYComa(['int a = 5 int b = 6;'])] }), false),
  forma('campo-con-dos-cadenas-seguidas', ['campo-de-la-clase'], () => ({ miembros: [campoSinPuntoYComa(['String s = "a" "b";'])] }), false),
  forma('campo-con-llave-tras-el-nombre', ['campo-de-la-clase'], () => ({ miembros: [campoSinPuntoYComa(['int x { }'])] }), false),
  // `int x =` y, en el renglón de abajo, otro miembro: javac «illegal start of expression» en ese miembro.
  forma('campo-con-modificador-tras-el-igual', ['campo-de-la-clase'], () => ({ miembros: [campoSinPuntoYComa(['int x ='])] }), false),
];

// ---- I: `Clase.<T>metodo(...)` con los argumentos de tipo escritos ----

const LLAMADA_GENERICA: FormaEstructural = forma('llamada-generica-explicita', ['llamada-generica-explicita'], (azar) => {
  const [tipoDeArgumento, argumento] = azar.elegir([['String', '"a"'], ['Integer', '5'], ['String', '5']] as const);
  return {
    miembros: [miembro(['static <T> T id(T t) {', '    return t;', '}'])],
    sentenciasAlPrincipio: [
      declaracion({
        tipo: tipoDeArgumento,
        nombre: 'valorGenerico',
        inicial: plantilla([`${CLASE_POR_OMISION}.<${tipoDeArgumento}>id(`, ')'], [literal(argumento, tipoDeArgumento)], tipoDeArgumento, { etiquetas: ['llamada-generica-explicita'] }),
      }),
    ],
  };
});

// ---- M: `import` de paquetes que existen y que no ----

const conImports = (nombreDeLaForma: string, etiquetas: readonly Etiqueta[], imports: readonly string[]): FormaEstructural => forma(nombreDeLaForma, etiquetas, () => ({ imports }));

const IMPORTS: readonly FormaEstructural[] = [
  forma('import-comodin-de-paquete-real', ['import-con-comodin'], (azar) => ({ imports: azar.elegir([['import java.util.*;'], ['import java.io.*;'], ['import java.util.*;', 'import java.io.*;']]) })),
  conImports('import-comodin-de-paquete-inexistente', ['import-con-comodin'], ['import java.sqrt.*;']),
  conImports('import-comodin-con-mayuscula-de-mas', ['import-con-comodin'], ['import java.Util.*;']),
  conImports('import-comodin-de-paquete-ajeno-al-jdk', ['import-con-comodin'], ['import org.junit.*;']),
  // `import p.T.*;` con `T` un tipo importa sus tipos anidados: válido si el tipo existe, javac lo rechaza si no.
  conImports('import-comodin-de-un-tipo', ['import-con-comodin'], ['import java.lang.String.*;']),
  conImports('import-comodin-de-un-tipo-mal-escrito', ['import-con-comodin'], ['import java.lang.Matth.*;']),
  conImports('import-estatico-con-comodin', ['import-con-comodin'], ['import static java.lang.Math.*;']),
  conImports('import-tras-un-punto-y-coma-suelto', ['import-con-punto-y-coma-de-mas'], ['import java.util.Scanner;;', 'import java.util.Random;']),
];

// ---- E: un archivo sin ninguna clase ----

const archivoSinClase = (nombreDeLaForma: string, imports: readonly string[]): FormaEstructural =>
  forma(nombreDeLaForma, ['archivo-sin-clase'], () => ({ sinClase: true, imports }));

const ARCHIVOS_SIN_CLASE: readonly FormaEstructural[] = [
  archivoSinClase('archivo-vacio', []),
  archivoSinClase('archivo-con-un-import', ['import java.util.Scanner;']),
  archivoSinClase('archivo-con-imports-con-comodin', ['import java.util.*;', 'import java.io.*;']),
  archivoSinClase('archivo-con-un-import-de-paquete-inexistente', ['import java.sqrt.*;']),
];

// ---- G: escapes Unicode (JLS 3.3) ----

/** Un escape de `caracter`, con una sentencia al principio que garantiza que el carácter aparece en el programa. */
const escapeDe = (nombreDeLaForma: string, caracteres: readonly string[], sentencia: Sentencia): FormaEstructural =>
  forma(nombreDeLaForma, ['escape-unicode'], (azar) => ({
    escapeUnicode: { caracter: azar.elegir(caracteres), aparicion: azar.entero(8) },
    sentenciasAlPrincipio: [sentencia],
  }));

const ESCAPES: readonly FormaEstructural[] = [
  escapeDe('escape-de-comilla', ['"'], imprimir('"hola"')),
  escapeDe('escape-de-llave-que-abre', ['{'], imprimir('"hola"')),
  escapeDe('escape-de-llave-que-cierra', ['}'], imprimir('"hola"')),
  escapeDe('escape-de-punto-y-coma', [';'], imprimir('1', 'int')),
  escapeDe('escape-de-mas', ['+'], sentenciaExpr(plantilla(['System.out.println(', ' + ', ')'], [literal('"a"', 'String'), literal('"b"', 'String')], 'void', { etiquetas: ['impresion'] }))),
  escapeDe('escape-de-ampersand', ['&'], imprimir('true && false', 'boolean')),
  escapeDe('escape-de-parentesis', ['(', ')'], imprimir('"hola"')),
  escapeDe('escape-de-punto', ['.'], imprimir('"hola"')),
  escapeDe('escape-de-letra', ['S', 'y', 's', 't', 'e', 'm', 'o', 'u', 'p', 'r', 'i', 'n', 'l', 'a', 'h'], imprimir('"hola"')),
  // Un escape bien formado dentro de un comentario es un aviso; uno mal formado (`C:\users`), un error de javac; con la barra duplicada, `\\u` ya no es un escape.
  forma('comentario-con-escape-bien-formado', ['escape-unicode'], () => ({ miembros: [miembro([`// nota ${BARRA}u0041`], ['escape-unicode'])] })),
  forma('comentario-con-barra-duplicada-antes-de-la-u', ['escape-unicode'], () => ({ miembros: [miembro([`// ruta C:${BARRA}${BARRA}users${BARRA}${BARRA}juan`], ['escape-unicode'])] })),
  forma(
    'comentario-con-escape-mal-formado',
    ['escape-unicode'],
    () => ({ miembros: [{ lineas: [`// ruta C:${BARRA}users${BARRA}juan`], etiquetas: ['escape-unicode'], sintaxisInvalida: true }] }),
    false,
  ),
  forma(
    'comentario-de-bloque-con-escape-mal-formado',
    ['escape-unicode'],
    () => ({ miembros: [{ lineas: [`/* mal: ${BARRA}u00 */`], etiquetas: ['escape-unicode'], sintaxisInvalida: true }] }),
    false,
  ),
];

// ---- Tarea 1.36: lo que la verificación final del lote 1 halló fuera de la gramática del generador (C-1, C-3, W-1, C-2/W-2, C-5/W-10, C-4) ----

// C-1: los tres puntos de `String... args`. Pegados son UN token (JLS 3.11); `String . . . args` son tres puntos sueltos y javac pide un identificador. Con espacios alrededor de los tres puntos pegados es válido.
const firmaDeMainConPuntosMalEscritos = (nombreDeLaForma: string, parametros: string): FormaEstructural =>
  forma(nombreDeLaForma, ['main-con-otra-firma', 'varargs-mal-escrito'], () => ({ parametrosDeMain: parametros, sintaxisInvalida: true }), false);

const FIRMAS_DE_MAIN_CON_PUNTOS: readonly FormaEstructural[] = [
  firmaDeMain('main-con-varargs-con-espacios', 'String ... args'),
  firmaDeMainConPuntosMalEscritos('main-con-puntos-separados', 'String . . . args'),
  firmaDeMainConPuntosMalEscritos('main-con-dos-puntos-pegados-y-uno-suelto', 'String .. . args'),
  firmaDeMainConPuntosMalEscritos('main-con-un-punto-suelto-y-dos-pegados', 'String . .. args'),
  firmaDeMainConPuntosMalEscritos('main-con-final-y-puntos-separados', 'final String . . . args'),
];

// C-3: `package` con el nombre de un paquete que el JDK exporta (javac: «package exists in another module»), uno propio, y uno con el nombre de una CLASE del JDK (javac solo lo rechaza si esa clase
// ya está cargada). Los imports del cuerpo van después: la línea `package` va primero.
const PAQUETES_DEL_JDK: readonly string[] = [
  'java.util', 'java.lang', 'java.io', 'java.net', 'java.text', 'java.time', 'java.math', 'java.sql', 'javax.swing',
  'java.util.function', 'java.nio.file', 'java.awt', 'javax.xml.parsers', 'java.util.concurrent',
];
const PAQUETES_PROPIOS: readonly string[] = ['miproyecto', 'aula.curso.u3', 'mx.edu.escuela', 'javax.nada', 'programa'];
// Tarea 1.38 (W-15): lo que está DENTRO de `java`. javac lo compila (`java.utilidades` incluido, que estaba entre los «propios»), pero el lanzador del JDK real no arranca NADA que esté en `java`
// (`SecurityException: Prohibited package name`), y el compilador lo avisa en vez de darlo por bueno. Se sortea `java` a secas, subpaquetes de varios niveles, nombres que parecen del JDK y con mayúsculas.
const PAQUETES_DENTRO_DE_JAVA: readonly string[] = ['java', 'java.miapp', 'java.aula.u3', 'java.lang.curso', 'java.util.aula', 'java.utilidades', 'java.Aula', 'java.a.b.c.d'];
// Tarea 1.37 (C-6): javac rechaza el nombre de una clase como paquete cuando el compilador ya la conoce al leer el `package` —todo `java.lang` (público o no, anidado o no) y las pocas que él crea
// de antemano— o cuando un PREFIJO del nombre lo es (`java.lang.String.aula`). Se sortean de los dos lados para que el veredicto no se escriba solo de uno: los que javac rechaza y los que compila.
const PAQUETES_CON_NOMBRE_DE_CLASE: readonly string[] = [
  'java.util.Map', 'java.lang.String', 'java.util.Scanner', 'java.io.File',
  // rechazados: no públicas de java.lang, una vista previa, anidadas con su `$`, las que javac crea de antemano, y subpaquetes de una clase
  'java.lang.Shutdown', 'java.lang.StringCoding', 'java.lang.CharacterData00', 'java.lang.VersionProps', 'java.lang.ProcessImpl', 'java.lang.runtime.SwitchBootstraps',
  'java.lang.Thread$State', 'java.lang.Class$1', 'java.io.Serializable', 'java.util.Iterator', 'java.util.List', 'java.lang.invoke.MethodHandle',
  'java.lang.String.aula', 'java.lang.Shutdown.a.b', 'java.io.Serializable.aula',
  // compilados: no públicas fuera de java.lang, anidadas fuera de java.lang, un prefijo que aún no está cargado y una pública de un paquete hermano
  'java.util.ArraysParallelSortHelpers', 'java.io.FileSystem', 'java.util.Map$Entry', 'java.util.Map.aula', 'java.lang.reflect.Method', 'java.lang.Strin',
];

const paquete = (nombreDeLaForma: string, nombres: readonly string[]): FormaEstructural =>
  forma(nombreDeLaForma, ['paquete-declarado'], (azar) => ({ imports: [`package ${azar.elegir(nombres)};`] }));

const PAQUETES: readonly FormaEstructural[] = [
  paquete('paquete-del-jdk', PAQUETES_DEL_JDK),
  paquete('paquete-propio', PAQUETES_PROPIOS),
  paquete('paquete-con-nombre-de-clase', PAQUETES_CON_NOMBRE_DE_CLASE),
  paquete('paquete-dentro-de-java', PAQUETES_DENTRO_DE_JAVA),
];

// W-1: un carácter invisible (de los que `Character.isIdentifierIgnorable` da por ignorables) DENTRO de un nombre o de una palabra clave: javac lo salta, así que `in\u200bt` es `int` y `a\u200bb` es `ab`.
// Al principio de un nombre no vale (no es un inicio de identificador: «illegal character»).
const INVISIBLES: readonly string[] = ['\u00ad', '\u200b', '\u200c', '\u200d', '\u200e', '\u200f', '\u2060', '\ufeff'];
const IGNORABLE: readonly Etiqueta[] = ['caracter-ignorable'];

/** `palabra` con `invisible` metido en una posición cualquiera de su interior. */
const conInvisibleAdentro = (palabra: string, invisible: string, azar: Azar): string => {
  const posicion = 1 + azar.entero(palabra.length - 1);
  return `${palabra.slice(0, posicion)}${invisible}${palabra.slice(posicion)}`;
};

const NOMBRES_DE_VARIABLE = ['saldo', 'total', 'cuenta', 'precio', 'edad'] as const;

const INVISIBLES_EN_NOMBRES: readonly FormaEstructural[] = [
  forma('nombre-con-un-caracter-invisible', IGNORABLE, (azar) => {
    const visible = azar.elegir(NOMBRES_DE_VARIABLE);
    return {
      sentenciasAlPrincipio: [
        declaracion({ tipo: 'int', nombre: conInvisibleAdentro(visible, azar.elegir(INVISIBLES), azar), inicial: literal('1', 'int'), etiquetas: IGNORABLE }),
        declaracion({ tipo: 'int', nombre: 'copia', inicial: nombre(visible, 'int') }),
        imprimir('copia', 'int'),
      ],
    };
  }),
  forma('palabra-clave-con-un-caracter-invisible', IGNORABLE, (azar) => ({
    sentenciasAlPrincipio: [
      declaracion({ tipo: conInvisibleAdentro(azar.elegir(['int', 'long', 'double']), azar.elegir(INVISIBLES), azar), nombre: 'numero', inicial: literal('5', 'int'), etiquetas: IGNORABLE }),
      imprimir('numero', 'int'),
    ],
  })),
  // El modificador `final` con el invisible dentro: `fina\u200bl int k = 1;`.
  forma('modificador-con-un-caracter-invisible', IGNORABLE, (azar) => ({
    sentenciasAlPrincipio: [
      declaracion({ tipo: `${conInvisibleAdentro('final', azar.elegir(INVISIBLES), azar)} int`, nombre: 'constante', inicial: literal('1', 'int'), etiquetas: IGNORABLE }),
      imprimir('constante', 'int'),
    ],
  })),
  // `ab` y `a\u200bb` son el MISMO nombre: la segunda declaración repite la primera (javac: «already defined»).
  forma('nombre-repetido-por-un-caracter-invisible', IGNORABLE, (azar) => {
    const visible = azar.elegir(NOMBRES_DE_VARIABLE);
    return {
      sentenciasAlPrincipio: [
        declaracion({ tipo: 'int', nombre: visible, inicial: literal('1', 'int') }),
        declaracion({ tipo: 'int', nombre: conInvisibleAdentro(visible, azar.elegir(INVISIBLES), azar), inicial: literal('2', 'int'), etiquetas: IGNORABLE }),
      ],
    };
  }),
  // Pegado a la palabra clave, el invisible es parte del nombre: `int\u200bx` es el nombre `intx` (no un tipo), y `intx = 1;` no declara nada.
  forma('tipo-pegado-a-un-caracter-invisible', IGNORABLE, (azar) => ({
    sentenciasAlPrincipio: [sentenciaExpr(literal(`int${azar.elegir(INVISIBLES)}x = 1`, 'int', { etiquetas: IGNORABLE }))],
  })),
  // Al principio de un nombre no es un inicio de identificador: javac da «illegal character».
  forma(
    'nombre-que-empieza-con-un-caracter-invisible',
    IGNORABLE,
    (azar) => ({
      sentenciasAlPrincipio: [declaracion({ tipo: 'int', nombre: `${azar.elegir(INVISIBLES)}x`, inicial: literal('1', 'int'), etiquetas: IGNORABLE, sintaxisInvalida: true })],
    }),
    false,
  ),
];

// C-2/W-2 (JLS 3.4): `\r` solo y `\r\n` son fines de línea, igual que `\n`; `\n\r` son DOS (javac cuenta una línea de más). El programa es el mismo y las líneas de javac son las del texto con sus fines.
const FINES_DE_LINEA: readonly FormaEstructural[] = [
  forma('fin-de-linea-cr', ['fin-de-linea-especial'], () => ({ finDeLinea: 'cr' })),
  forma('fin-de-linea-crlf', ['fin-de-linea-especial'], () => ({ finDeLinea: 'crlf' })),
  forma('fin-de-linea-lf-y-cr', ['fin-de-linea-especial'], () => ({ finDeLinea: 'lf-y-cr' })),
  forma('fin-de-linea-mezclado', ['fin-de-linea-especial'], () => ({ finDeLinea: 'mezclado' })),
];

// C-5/W-10: una constante de texto con un decimal (`"a" + 1.5`) es una expresión constante para javac (JLS 15.29) y su VALOR depende de `Double.toString`: decide si un ciclo termina, si una variable queda
// asignada y si dos etiquetas de `case` se repiten. El decimal sale de una lista; comparado con su propio texto o con otro, la condición vale `true` o `false` y javac decide en consecuencia.
const DECIMALES: readonly string[] = ['1.5', '2.0', '0.1', '100.25', '3.14', '0.5'];
const CON_DECIMAL: readonly Etiqueta[] = ['constante-de-texto-con-decimal'];

/** `"a" + 1.5 == "a1.5"`, o `!=`, o con un decimal distinto del otro lado: una condición constante de valor desconocido para el motor. */
function condicionConDecimal(azar: Azar): Expr {
  const decimal = azar.elegir(DECIMALES);
  const otro = azar.probabilidad(0.25) ? azar.elegir(DECIMALES) : decimal;
  const operador = azar.elegir(['==', '!=']);
  return literal(`"a" + ${decimal} ${operador} "a${otro}"`, 'boolean', { etiquetas: CON_DECIMAL });
}

const DECIMALES_EN_CONSTANTES: readonly FormaEstructural[] = [
  forma('decimal-en-la-condicion-de-un-while', CON_DECIMAL, (azar) => ({ sentenciasAlPrincipio: [mientras(condicionConDecimal(azar), []), imprimir('"fin"')] })),
  forma('decimal-en-la-condicion-de-un-for', CON_DECIMAL, (azar) => ({
    sentenciasAlPrincipio: [para({ inicial: null, condicion: condicionConDecimal(azar), paso: null, cuerpo: [] }), imprimir('"fin"')],
  })),
  forma('decimal-en-la-condicion-de-un-do-while', CON_DECIMAL, (azar) => ({ sentenciasAlPrincipio: [haz([], condicionConDecimal(azar)), imprimir('"fin"')] })),
  forma('decimal-en-una-final-y-un-while', CON_DECIMAL, (azar) => {
    const decimal = azar.elegir(DECIMALES);
    return {
      sentenciasAlPrincipio: [
        declaracion({ esFinal: true, tipo: 'String', nombre: 'CLAVE', inicial: literal(`"a" + ${decimal}`, 'String', { etiquetas: CON_DECIMAL }) }),
        mientras(literal(`CLAVE == "a${decimal}"`, 'boolean'), []),
        imprimir('"fin"'),
      ],
    };
  }),
  forma('decimal-en-una-etiqueta-de-case', CON_DECIMAL, (azar) => {
    const decimal = azar.elegir(DECIMALES);
    return {
      sentenciasAlPrincipio: [
        declaracion({ tipo: 'String', nombre: 'opcion', inicial: literal(`"d${azar.elegir(DECIMALES)}"`, 'String') }),
        seleccion({
          selector: nombre('opcion', 'String'),
          casos: [
            { etiquetas: [literal(`"d" + ${decimal}`, 'String', { etiquetas: CON_DECIMAL })], cuerpo: [imprimir('"uno"'), salto('break')] },
            { etiquetas: 'default', cuerpo: [salto('break')] },
          ],
          flecha: false,
        }),
      ],
    };
  }),
  forma('decimal-en-una-etiqueta-de-case-con-final', CON_DECIMAL, (azar) => {
    const decimal = azar.elegir(DECIMALES);
    return {
      sentenciasAlPrincipio: [
        declaracion({ esFinal: true, tipo: 'String', nombre: 'CLAVE', inicial: literal(`"d" + ${decimal}`, 'String', { etiquetas: CON_DECIMAL }) }),
        declaracion({ tipo: 'String', nombre: 'opcion', inicial: literal(`"d${decimal}"`, 'String') }),
        seleccion({
          selector: nombre('opcion', 'String'),
          casos: [
            { etiquetas: [nombre('CLAVE', 'String')], cuerpo: [imprimir('"uno"'), salto('break')] },
            { etiquetas: 'default', cuerpo: [salto('break')] },
          ],
          flecha: false,
        }),
      ],
    };
  }),
  // La asignación definitiva depende de la condición: con una constante `true`, `x` queda asignada; con una `false`, no.
  forma('decimal-y-asignacion-definitiva-con-if', CON_DECIMAL, (azar) => ({
    sentenciasAlPrincipio: [
      declaracion({ tipo: 'int', nombre: 'valor', inicial: null }),
      si(condicionConDecimal(azar), [sentenciaExpr(literal('valor = 1', 'int', { etiquetas: ['asignacion'] }))], null),
      imprimir('valor', 'int'),
    ],
  })),
  forma('decimal-y-asignacion-definitiva-con-while-y-break', CON_DECIMAL, (azar) => ({
    sentenciasAlPrincipio: [
      declaracion({ tipo: 'int', nombre: 'valor', inicial: null }),
      mientras(condicionConDecimal(azar), [sentenciaExpr(literal('valor = 1', 'int', { etiquetas: ['asignacion'] })), salto('break')]),
      imprimir('valor', 'int'),
    ],
  })),
  forma('decimal-en-una-final-booleana', CON_DECIMAL, (azar) => ({
    sentenciasAlPrincipio: [
      declaracion({ esFinal: true, tipo: 'boolean', nombre: 'BANDERA', inicial: condicionConDecimal(azar) }),
      declaracion({ tipo: 'int', nombre: 'valor', inicial: null }),
      si(nombre('BANDERA', 'boolean'), [sentenciaExpr(literal('valor = 1', 'int', { etiquetas: ['asignacion'] }))], null),
      imprimir('valor', 'int'),
    ],
  })),
  // Control: el texto con decimal solo se declara, se imprime y se compara sin que ninguna decisión del compilador dependa de su valor.
  forma('decimal-sin-decision-de-por-medio', CON_DECIMAL, (azar) => {
    const decimal = azar.elegir(DECIMALES);
    return {
      sentenciasAlPrincipio: [
        declaracion({ tipo: 'String', nombre: 'texto', inicial: literal(`"a" + ${decimal}`, 'String', { etiquetas: CON_DECIMAL }) }),
        imprimir('texto'),
        declaracion({ tipo: 'boolean', nombre: 'igual', inicial: condicionConDecimal(azar) }),
        imprimir('igual', 'boolean'),
      ],
    };
  }),
];

// C-4: una constante de texto de 65 535 caracteres, o de 65 535 bytes en UTF-8 modificado. Cada texto largo se ARMA plegando `final` (`final String tl1 = tl0 + tl0;` …): son constantes para javac, que las
// pliega igual que un literal enorme, y el programa no pesa 64 KB. Con los largos en la FRONTERA exacta de cada alfabeto (un carácter más o menos decide si javac lo acepta); el motor modela las dos
// reglas (`limit.string` y `limit.string.overflow`) y avisa cuando no puede decidir.
interface AlfabetoDeTextos {
  readonly prefijo: string;
  readonly unidad: string;
  /** La última `final` de la pila (la que mide 2^kMaximo unidades): ninguna `final` pasa de 65 535 bytes, así que cada una compila sola. */
  readonly kMaximo: number;
}

const ASCII: AlfabetoDeTextos = { prefijo: 'tl', unidad: 'a', kMaximo: 15 };
const ACENTOS: AlfabetoDeTextos = { prefijo: 'el', unidad: 'é', kMaximo: 14 };
const EUROS: AlfabetoDeTextos = { prefijo: 'eu', unidad: '€', kMaximo: 14 };
const EMOJIS: AlfabetoDeTextos = { prefijo: 'em', unidad: '😀', kMaximo: 13 };
const TEXTO_LARGO: readonly Etiqueta[] = ['texto-largo'];

/** `final String x0 = "a"; final String x1 = x0 + x0; …`: cada una duplica a la anterior. */
function pilaDeFinales(alfabeto: AlfabetoDeTextos): Sentencia[] {
  return Array.from({ length: alfabeto.kMaximo + 1 }, (_, k) =>
    declaracion({
      esFinal: true,
      tipo: 'String',
      nombre: `${alfabeto.prefijo}${k}`,
      inicial: literal(k === 0 ? `"${alfabeto.unidad}"` : `${alfabeto.prefijo}${k - 1} + ${alfabeto.prefijo}${k - 1}`, 'String'),
    }),
  );
}

/** La suma de las `final` que mide `cantidad` unidades (los bits de `cantidad`, de mayor a menor; un bit por encima de la pila repite la más grande). */
function sumaDeFinales(alfabeto: AlfabetoDeTextos, cantidad: number): string {
  const partes: string[] = [];
  for (let k = 20; k >= 0; k -= 1) {
    if (((cantidad >> k) & 1) === 0) continue;
    const veces = k > alfabeto.kMaximo ? 2 ** (k - alfabeto.kMaximo) : 1;
    for (let i = 0; i < veces; i += 1) partes.push(`${alfabeto.prefijo}${Math.min(k, alfabeto.kMaximo)}`);
  }
  return partes.join(' + ');
}

const textoDe = (alfabeto: AlfabetoDeTextos, cantidad: number, resto = '', etiquetasExtra: readonly Etiqueta[] = []): Expr =>
  literal(`${sumaDeFinales(alfabeto, cantidad)}${resto}`, 'String', { etiquetas: [...TEXTO_LARGO, ...etiquetasExtra] });

// El largo, en unidades de cada alfabeto: la frontera de `limit.string` (65 534 / 65 535 caracteres) y la de `limit.string.overflow` (32 767 / 32 768 acentos, 21 845 / 21 846 euros, 10 922 / 10 923 emojis).
const LARGOS_ASCII = [65_533, 65_534, 65_535, 65_536] as const;
const LARGOS_CON_ACENTOS = [32_766, 32_767, 32_768] as const;
const LARGOS_CON_EUROS = [21_844, 21_845, 21_846] as const;
const LARGOS_CON_EMOJIS = [10_921, 10_922, 10_923] as const;

const textoLargo = (nombreDeLaForma: string, aplicar: (azar: Azar) => readonly Sentencia[], etiquetas: readonly Etiqueta[] = TEXTO_LARGO): FormaEstructural =>
  forma(nombreDeLaForma, etiquetas, (azar) => ({ sentenciasAlPrincipio: aplicar(azar) }));

const imprimirTexto = (texto: Expr): Sentencia => sentenciaExpr(plantilla(['System.out.println(', ')'], [texto], 'void', { etiquetas: ['impresion'] }));
const declararTexto = (nombreDeLaVariable: string, inicial: Expr | null, esFinal = false): Sentencia => declaracion({ esFinal, tipo: 'String', nombre: nombreDeLaVariable, inicial });

const TEXTOS_LARGOS: readonly FormaEstructural[] = [
  textoLargo('texto-largo-en-un-inicializador', (azar) => [...pilaDeFinales(ASCII), declararTexto('textoLargo', textoDe(ASCII, azar.elegir(LARGOS_ASCII))), imprimir('textoLargo.length()', 'int')]),
  textoLargo('texto-largo-en-println', (azar) => [...pilaDeFinales(ASCII), imprimirTexto(textoDe(ASCII, azar.elegir(LARGOS_ASCII)))]),
  textoLargo('texto-largo-en-una-asignacion', (azar) => [
    ...pilaDeFinales(ASCII),
    declararTexto('textoLargo', null),
    sentenciaExpr(plantilla(['textoLargo = ', ''], [textoDe(ASCII, azar.elegir(LARGOS_ASCII))], 'String', { etiquetas: ['asignacion'] })),
    imprimir('textoLargo.length()', 'int'),
  ]),
  textoLargo('texto-largo-como-argumento', (azar) => [
    ...pilaDeFinales(ASCII),
    declararTexto('t', literal('"q"', 'String')),
    declaracion({ tipo: 'boolean', nombre: 'igual', inicial: plantilla(['t.equals(', ')'], [textoDe(ASCII, azar.elegir(LARGOS_ASCII))], 'boolean', { etiquetas: ['llamada-de-biblioteca'] }) }),
    imprimir('igual', 'boolean'),
  ]),
  // Una `final` con una constante así de larga se revisa aunque nadie la use.
  textoLargo('texto-largo-en-una-final', (azar) => [...pilaDeFinales(ASCII), declararTexto('LARGO', textoDe(ASCII, azar.elegir(LARGOS_ASCII)), true), imprimir('LARGO.length()', 'int')]),
  textoLargo('texto-largo-como-etiqueta-de-switch', (azar) => [
    ...pilaDeFinales(ASCII),
    declararTexto('t', literal('"q"', 'String')),
    seleccion({
      selector: nombre('t', 'String'),
      casos: [
        { etiquetas: [textoDe(ASCII, azar.elegir(LARGOS_ASCII))], cuerpo: [salto('break')] },
        { etiquetas: 'default', cuerpo: [salto('break')] },
      ],
      flecha: false,
    }),
  ]),
  textoLargo('texto-largo-con-acentos', (azar) => [...pilaDeFinales(ACENTOS), declararTexto('textoLargo', textoDe(ACENTOS, azar.elegir(LARGOS_CON_ACENTOS))), imprimir('textoLargo.length()', 'int')]),
  textoLargo('texto-largo-con-euros', (azar) => [...pilaDeFinales(EUROS), declararTexto('textoLargo', textoDe(EUROS, azar.elegir(LARGOS_CON_EUROS))), imprimir('textoLargo.length()', 'int')]),
  textoLargo('texto-largo-con-emojis', (azar) => [...pilaDeFinales(EMOJIS), declararTexto('textoLargo', textoDe(EMOJIS, azar.elegir(LARGOS_CON_EMOJIS))), imprimir('textoLargo.length()', 'int')]),
  textoLargo('texto-largo-en-el-cuerpo-de-un-ciclo', (azar) => [
    ...pilaDeFinales(ASCII),
    declaracion({ tipo: 'int', nombre: 'vuelta', inicial: literal('0', 'int') }),
    mientras(literal('vuelta < 1', 'boolean'), [declararTexto('textoLargo', textoDe(ASCII, azar.elegir(LARGOS_ASCII))), sentenciaExpr(literal('vuelta++', 'int', { etiquetas: ['incremento'] }))]),
  ]),
  // La receta de una concatenación que NO es constante: las constantes más un byte por operando dinámico (`invokedynamic`).
  textoLargo('receta-de-una-concatenacion', (azar) => {
    const dos = azar.probabilidad(0.5);
    return [
      ...pilaDeFinales(ASCII),
      declaracion({ tipo: 'int', nombre: 'x', inicial: literal('1', 'int') }),
      ...(dos ? [declaracion({ tipo: 'int', nombre: 'y', inicial: literal('2', 'int') })] : []),
      declararTexto('textoLargo', textoDe(ASCII, azar.elegir([65_531, 65_532, 65_533, 65_534, 65_535]), dos ? ' + x + y' : ' + x')),
      imprimir('textoLargo.length()', 'int'),
    ];
  }),
  textoLargo('receta-con-acentos', (azar) => [
    ...pilaDeFinales(ACENTOS),
    declaracion({ tipo: 'int', nombre: 'x', inicial: literal('1', 'int') }),
    declararTexto('textoLargo', textoDe(ACENTOS, azar.elegir(LARGOS_CON_ACENTOS), ' + x')),
    imprimir('textoLargo.length()', 'int'),
  ]),
  textoLargo('receta-con-mas-igual', (azar) => [
    ...pilaDeFinales(ASCII),
    declararTexto('acumulado', literal('"q"', 'String')),
    sentenciaExpr(plantilla(['acumulado += ', ''], [textoDe(ASCII, azar.elegir([65_533, 65_534, 65_535]))], 'String', { etiquetas: ['asignacion-compuesta'] })),
    imprimir('acumulado.length()', 'int'),
  ]),
  // Un decimal en el texto: su largo exacto lo decide `Double.toString` (de 3 a 25 caracteres); si el límite cae dentro de ese margen, el motor avisa.
  textoLargo(
    'texto-largo-con-un-decimal',
    (azar) => [...pilaDeFinales(ASCII), declararTexto('textoLargo', textoDe(ASCII, azar.elegir([60_000, 65_520, 65_531, 65_532, 65_540]), ' + 1.5', CON_DECIMAL)), imprimir('textoLargo.length()', 'int')],
    [...TEXTO_LARGO, ...CON_DECIMAL],
  ),
  // Lo que javac NO genera no cuenta: la rama que no se toma de un `if` con condición constante, el lado derecho de `false && …`; y lo que el motor no sabe decidir (código tras `if (true) return;`).
  textoLargo('texto-largo-junto-a-una-condicion-constante', (azar) => {
    const texto = textoDe(ASCII, azar.elegir([65_534, 65_535]));
    const gran = (): Sentencia => declararTexto('textoLargo', texto);
    return [
      ...pilaDeFinales(ASCII),
      ...azar.elegir<readonly Sentencia[]>([
        [si(literal('true', 'boolean'), [gran()], null)],
        [si(literal('false', 'boolean'), [gran()], null)],
        [si(literal('true', 'boolean'), [imprimir('"sí"')], [gran()])],
        [declaracion({ esFinal: true, tipo: 'boolean', nombre: 'DEPURAR', inicial: literal('false', 'boolean') }), si(nombre('DEPURAR', 'boolean'), [imprimirTexto(texto)], null)],
        [declararTexto('t', literal('"q"', 'String')), si(plantilla(['false && t.equals(', ')'], [texto], 'boolean'), [], null)],
        [declararTexto('t', literal('"q"', 'String')), si(plantilla(['true || t.equals(', ')'], [texto], 'boolean'), [], null)],
        [declararTexto('t', literal('"q"', 'String')), si(plantilla(['true && t.equals(', ')'], [texto], 'boolean'), [], null)],
        [si(literal('true', 'boolean'), [sentenciaExpr(literal('return', 'void'))], null), gran()],
      ]),
    ];
  }),
];

/** Todas las formas, en el orden en que salen (la i-ésima, en el programa `FASE + PERIODO · i`). */
export const FORMAS_ESTRUCTURALES: readonly FormaEstructural[] = [
  ...FIRMAS_DE_MAIN,
  ...CLASES_SELLADAS,
  ...CAMPOS_VALIDOS,
  ...CAMPOS_SIN_PUNTO_Y_COMA,
  ...CAMPOS_MAL_ESCRITOS,
  LLAMADA_GENERICA,
  ...IMPORTS,
  ...ARCHIVOS_SIN_CLASE,
  ...ESCAPES,
  // Tarea 1.36
  ...FIRMAS_DE_MAIN_CON_PUNTOS,
  ...PAQUETES,
  ...INVISIBLES_EN_NOMBRES,
  ...FINES_DE_LINEA,
  ...DECIMALES_EN_CONSTANTES,
  ...TEXTOS_LARGOS,
];

/** La forma que le toca al programa `indice` de una campaña, o `null` si ese programa no es estructural. */
export function formaDelPrograma(indice: number): FormaEstructural | null {
  if (indice % PERIODO_DE_LAS_ESTRUCTURAS !== FASE_DE_LAS_ESTRUCTURAS) return null;
  return FORMAS_ESTRUCTURALES[Math.floor(indice / PERIODO_DE_LAS_ESTRUCTURAS) % FORMAS_ESTRUCTURALES.length]!;
}
