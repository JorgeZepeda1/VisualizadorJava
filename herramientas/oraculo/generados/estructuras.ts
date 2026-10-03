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
import { CLASE_POR_OMISION, declaracion, literal, nombre, plantilla, sentenciaExpr, si, type EscapeUnicode, type Etiqueta, type MiembroDeClase, type Programa, type Sentencia } from './programa.ts';

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
];

/** La forma que le toca al programa `indice` de una campaña, o `null` si ese programa no es estructural. */
export function formaDelPrograma(indice: number): FormaEstructural | null {
  if (indice % PERIODO_DE_LAS_ESTRUCTURAS !== FASE_DE_LAS_ESTRUCTURAS) return null;
  return FORMAS_ESTRUCTURALES[Math.floor(indice / PERIODO_DE_LAS_ESTRUCTURAS) % FORMAS_ESTRUCTURALES.length]!;
}
