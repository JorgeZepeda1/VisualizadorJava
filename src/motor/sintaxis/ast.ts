// AST del subconjunto (design.md §1.2, §2.3, §2.4). Nace en la rebanada vertical (0.12) con
// Programa→Clase→Main→Bloque→println(literal); el lote 1 (tareas 1.1-1.4) amplía con
// importaciones, las 3 formas de `main`, `return;`, declaraciones locales y expresiones completas
// (Pratt, con NO-DISP para lo que Java acepta y este visualizador todavía no — ADR 003). La tarea
// 1.5 completa `Sentencia` (if/while/do-while/for/switch/break/continue/`;`/bloque anidado/
// sentencia de expresión) y la 1.6 agrega `NodoNoSoportado` para el resto del catálogo REQ-SUB-007
// que solo se reconoce en posición sintáctica (segunda clase, miembros de clase, arreglos, var,
// genéricos, lambdas, try/catch, etiquetas, for mejorado, `switch` con flecha/yield…).
import type { Rango } from '../fuente/rango.ts';
// Tarea 1.24: unión CERRADA de códigos "no soportado" (única fuente de verdad, `motor/no-soportado.ts`)
// — antes `string` abierto en los dos nodos de abajo, lo que permitía que un emisor usara un código
// que ningún catálogo de texto reconociera (el bug real de "lambda" vs "lambda-no-soportada").
// Tarea 1.25: `ConDatosPorCodigo` — cada nodo trae, además del código, los datos EXACTOS que su
// texto necesita (antes ninguno de los dos traía ningún dato — el bug real de "arreglo"/"tipoArreglo").
import type { ConDatosPorCodigo } from '../no-soportado.ts';

export interface NodoPrograma {
  readonly tipo: 'programa';
  readonly importaciones: readonly NodoImportacion[];
  /** "import static ...;" (tarea 1.6, REQ-SUB-007) — nunca se trata como un import normal. */
  readonly importacionesNoSoportadas: readonly NodoNoSoportado[];
  readonly clase: NodoClase;
  /** Otra clase/interfaz/enum/record de nivel superior tras la primera (tarea 1.6, REQ-SUB-007). */
  readonly otrosTiposDeNivelSuperior: readonly NodoNoSoportado[];
  readonly rango: Rango;
}

export interface NodoImportacion {
  readonly tipo: 'importacion';
  /** P.ej. "java.util.Scanner" o "java.util" (sin el ".*" final). */
  readonly nombre: string;
  readonly comodin: boolean;
  readonly rango: Rango;
}

export interface NodoClase {
  readonly tipo: 'clase';
  readonly nombre: string;
  /** `null` si la clase no tiene ningún método `main` reconocible (design.md §2.3: `Clase = ...
   * "{" { Main | ";" } "}"` acepta CERO Main). Antes de la tarea 1.15 esto era un error de sintaxis
   * genérico -- REQ-COMP-008 exige aceptarlo como programa BIEN FORMADO (javac lo compila limpio) y
   * rechazarlo recién en la pasada de arranque (`semantica/arranque.ts`), nunca en sintaxis. */
  readonly main: NodoMain | null;
  /** Campos, métodos propios, clases internas, inicializadores, anotaciones (tarea 1.6). */
  readonly otrosMiembros: readonly NodoNoSoportado[];
  readonly rango: Rango;
}

export interface NodoMain {
  readonly tipo: 'main';
  readonly parametro: string;
  /** Tarea 1.15 (REQ-COMP-007): si el modificador `static` está presente. `public void main` (sin
   * `static`) es un programa BIEN FORMADO para javac -- solo el LANZADOR (`java`, no `javac`) lo
   * rechaza al intentar ejecutarlo (exploracion/03 §4.2). `semantica/arranque.ts` lee este campo. */
  readonly esEstatico: boolean;
  /** Sub-lote 1-D2c (design.md §2.1, task_0b5b6e47): si el modificador `public` está presente.
   * `static void main` (sin `public`) TAMBIÉN es un programa BIEN FORMADO para javac -- el
   * lanzador solo encuentra métodos PÚBLICOS (`Class#getMethod`, que ignora los no públicos),
   * verificado contra el JDK 17 real: da el MISMO mensaje EXACTO que "sin main" (nunca uno propio
   * de "no public") -- `semantica/arranque.ts` lo trata como el mismo caso "sin-main". */
  readonly esPublico: boolean;
  /** `throws Tipo, Tipo…` tras los paréntesis, si el programa lo trae (tarea 1.6, NO-DISP). */
  readonly clausulaThrows: NodoNoSoportado | null;
  readonly cuerpo: NodoBloque;
  readonly rango: Rango;
}

export interface NodoBloque {
  readonly tipo: 'bloque';
  readonly elementos: readonly NodoElementoBloque[];
  readonly rango: Rango;
}

// design.md §2.3: "Bloque = '{' { DeclLocal ';' | Sentencia } '}'" — DeclLocal es un elemento del
// bloque, no una Sentencia. `NodoNoSoportado` también puede aparecer aquí (p. ej. una declaración
// de tipo `var`/arreglo/genérico: sintácticamente "parece" DeclLocal pero es NO-DISP — tarea 1.6).
export type NodoElementoBloque = NodoDeclaracionLocal | NodoSentencia;

// design.md §2.3 "Sentencia" completa (tarea 1.5) + `NodoNoSoportado` para lo que la tarea 1.6
// reconoce en posición de sentencia (try/catch/throw, etiquetas, for mejorado…) sin abortar el
// análisis (ADR 003). `NodoBloque` es una alternativa válida de Sentencia (un bloque anidado como
// cuerpo de if/while/for/do-while), reusando el mismo `analizarBloque` de Main (REFACTOR de 1.5).
export type NodoSentencia =
  | NodoImpresion
  | NodoRetorno
  | NodoBloque
  | NodoSentenciaVacia
  | NodoSentenciaExpresion
  | NodoIf
  | NodoWhile
  | NodoDoWhile
  | NodoFor
  | NodoSwitch
  | NodoBreak
  | NodoContinue
  | NodoNoSoportado;

// Tarea 1.8 (pendiente heredado del sub-lote 1-B): `argumento` era SOLO `NodoLiteralCadena` (0.12)
// y únicamente `println` se reconocía. Ahora acepta cualquier expresión y distingue `print` de
// `println` (`metodo`) — la sobrecarga real (REQ-BIB-011, JLS 15.12) la resuelve
// `semantica/sobrecargas.ts` sobre el tipo estático de `argumento`; la ejecución real de un
// argumento que no sea un literal-cadena de `println` sigue pendiente del lote 2 (2.16+), igual
// que el resto de `Sentencia` desde 1.5 (`ir/generar-ir.ts` lo señala con su mismo `throw`, nunca
// con un resultado inventado, D2).
// Corrección obligatoria (sub-lote 1-C2): `argumento` ahora admite `null` — SOLO para
// `println()` sin paréntesis vacíos de contenido (verificado contra javac 17 real: existe
// `PrintStream.println()`, catálogo del oráculo 1.9; `print()` sin argumentos NO existe en la API
// real — "no suitable method found for print(no arguments)" — así que el analizador sintáctico
// nunca produce `metodo:'print', argumento:null`).
export interface NodoImpresion {
  readonly tipo: 'impresion';
  readonly metodo: 'print' | 'println';
  readonly argumento: NodoExpresion | null;
  readonly rango: Rango;
}

export interface NodoRetorno {
  readonly tipo: 'retorno';
  readonly rango: Rango;
}

/** La sentencia vacía `;` (design.md §2.3) — un no-op real, no un error (REQ-SUB-004). */
export interface NodoSentenciaVacia {
  readonly tipo: 'sentencia-vacia';
  readonly rango: Rango;
}

// design.md §2.3: "ExprSentencia = Asignacion | IncDec | Llamada | 'new' NombreDeTipo Argumentos".
// El analizador solo produce este nodo cuando `expresion.tipo` es una de esas 4 formas; cualquier
// otra expresión en posición de sentencia (p. ej. un literal suelto, `a + b;`) es el error real de
// javac "not a statement" (verificado contra javac 17).
export interface NodoSentenciaExpresion {
  readonly tipo: 'sentencia-expresion';
  readonly expresion: NodoExpresion;
  readonly rango: Rango;
}

export interface NodoIf {
  readonly tipo: 'if';
  readonly condicion: NodoExpresion;
  readonly entonces: NodoSentencia;
  readonly sino: NodoSentencia | null;
  readonly rango: Rango;
}

export interface NodoWhile {
  readonly tipo: 'while';
  readonly condicion: NodoExpresion;
  readonly cuerpo: NodoSentencia;
  readonly rango: Rango;
}

export interface NodoDoWhile {
  readonly tipo: 'do-while';
  readonly cuerpo: NodoSentencia;
  readonly condicion: NodoExpresion;
  readonly rango: Rango;
}

// design.md §2.3 "For": inicialización es UNA declaración local (con sus propios declaradores,
// p. ej. "int i=0, j=10") O una lista de ExprSentencia separadas por coma ("i=0, j=10" reusando
// variables existentes) — nunca ambas. La actualización siempre es una lista de ExprSentencia
// (posiblemente vacía). Cualquier parte puede faltar ("for (;;)").
export interface NodoFor {
  readonly tipo: 'for';
  readonly inicializacionDeclaracion: NodoDeclaracionLocal | null;
  readonly inicializacionExpresiones: readonly NodoSentenciaExpresion[];
  readonly condicion: NodoExpresion | null;
  readonly actualizacion: readonly NodoSentenciaExpresion[];
  readonly cuerpo: NodoSentencia;
  readonly rango: Rango;
}

// design.md §2.3 "Switch": el cuerpo es una secuencia PLANA de etiquetas (una o más seguidas) y
// elementos de bloque, igual que `NodoBloque.elementos` — así la caída (fallthrough) real de Java
// es, sencillamente, "seguir recorriendo la lista" (la ejecución llega en el lote 2).
export interface NodoSwitch {
  readonly tipo: 'switch';
  readonly selector: NodoExpresion;
  readonly elementos: readonly NodoElementoSwitch[];
  readonly rango: Rango;
}

export type NodoElementoSwitch = NodoEtiquetaCase | NodoEtiquetaDefault | NodoElementoBloque;

export interface NodoEtiquetaCase {
  readonly tipo: 'etiqueta-case';
  readonly valor: NodoExpresion;
  readonly rango: Rango;
}

export interface NodoEtiquetaDefault {
  readonly tipo: 'etiqueta-default';
  readonly rango: Rango;
}

/** `break;` sin etiqueta (REQ-SUB-004). Con etiqueta es NO-DISP — ver `NodoNoSoportado` (tarea 1.6). */
export interface NodoBreak {
  readonly tipo: 'break';
  readonly rango: Rango;
}

/** `continue;` sin etiqueta (REQ-SUB-004). Con etiqueta es NO-DISP (tarea 1.6). */
export interface NodoContinue {
  readonly tipo: 'continue';
  readonly rango: Rango;
}

// Tarea 1.6 (ADR 003): una construcción que Java sí acepta, pero que está fuera de REQ-SUB-005 (la
// superficie soportada) — a diferencia de `NodoExpresionNoSoportada` (dentro de una expresión),
// este nodo aparece en posición de SENTENCIA, DECLARACIÓN o MIEMBRO DE NIVEL SUPERIOR: clases
// extra, miembros de clase (campos/métodos/anotaciones/clases internas), arreglos como tipo de una
// declaración, `var`, genéricos, `for` mejorado, etiquetas, `try/catch/throw`, `switch` con flecha
// o `yield`, `throws` de `main`, `import static`. Un solo nodo/código cierra cada fila del catálogo
// REQ-SUB-007 que no cabe dentro de una expresión — delimita la construcción completa y deja
// seguir el análisis (nunca aborta, nunca un error de sintaxis engañoso — C8).
// Tarea 1.25: discriminado por `codigo` (`ConDatosPorCodigo`, motor/no-soportado.ts) — cada miembro
// trae EXACTAMENTE los datos que `DatosPorCodigoNoSoportado[codigo]` exige (p. ej. `arreglo-no-
// soportado` exige `datos.tipoArreglo`), nunca un `Record<string, unknown>` sin verificar. Un sitio
// de emisión que construye este nodo con un `codigo` LITERAL (la inmensa mayoría) se verifica de
// forma directa; uno que recibe el `codigo` por parámetro genérico ver `consumirRestoDeSentenciaNoSoportada`.
export type NodoNoSoportado = ConDatosPorCodigo<{ readonly tipo: 'no-soportado'; readonly rango: Rango }>;

export interface NodoDeclaracionLocal {
  readonly tipo: 'declaracion-local';
  readonly esFinal: boolean;
  /** 'int' | 'long' | 'double' | 'boolean' | 'char' | un nombre de tipo por referencia (String, Scanner, Random…). */
  readonly nombreTipo: string;
  readonly declaradores: readonly NodoDeclarador[];
  readonly rango: Rango;
}

export interface NodoDeclarador {
  readonly tipo: 'declarador';
  readonly nombre: string;
  readonly inicializador: NodoExpresion | null;
  readonly rango: Rango;
}

// ---- Expresiones (tareas 1.3 Pratt, 1.4 ambigüedades) ----

export type NodoExpresion =
  | NodoLiteralEntero
  | NodoLiteralLargo
  | NodoLiteralDoble
  | NodoLiteralCaracter
  | NodoLiteralCadena
  | NodoLiteralBooleano
  | NodoNombre
  | NodoBinaria
  | NodoUnaria
  | NodoAsignacion
  | NodoIncrementoDecremento
  | NodoLlamada
  | NodoAccesoMiembro
  | NodoNuevaInstancia
  | NodoConversion
  | NodoExpresionNoSoportada;

export interface NodoLiteralEntero {
  readonly tipo: 'literal-entero';
  readonly valor: bigint;
  readonly rango: Rango;
}

export interface NodoLiteralLargo {
  readonly tipo: 'literal-largo';
  readonly valor: bigint;
  readonly rango: Rango;
}

export interface NodoLiteralDoble {
  readonly tipo: 'literal-doble';
  readonly valor: number;
  readonly rango: Rango;
}

export interface NodoLiteralCaracter {
  readonly tipo: 'literal-caracter';
  readonly valor: string;
  readonly rango: Rango;
}

export interface NodoLiteralCadena {
  readonly tipo: 'literal-cadena';
  readonly valor: string;
  readonly rango: Rango;
}

export interface NodoLiteralBooleano {
  readonly tipo: 'literal-booleano';
  readonly valor: boolean;
  readonly rango: Rango;
}

/** Una referencia por nombre: variable, o el inicio de una cadena `objeto.miembro`. */
export interface NodoNombre {
  readonly tipo: 'nombre';
  readonly nombre: string;
  readonly rango: Rango;
}

export interface NodoBinaria {
  readonly tipo: 'binaria';
  readonly operador: string;
  readonly izquierda: NodoExpresion;
  readonly derecha: NodoExpresion;
  readonly rango: Rango;
}

export interface NodoUnaria {
  readonly tipo: 'unaria';
  readonly operador: '+' | '-' | '!';
  readonly operando: NodoExpresion;
  readonly rango: Rango;
}

export interface NodoAsignacion {
  readonly tipo: 'asignacion';
  readonly operador: '=' | '+=' | '-=' | '*=' | '/=' | '%=';
  readonly objetivo: NodoExpresion;
  readonly valor: NodoExpresion;
  readonly rango: Rango;
}

export interface NodoIncrementoDecremento {
  readonly tipo: 'incremento-decremento';
  readonly operador: '++' | '--';
  readonly posicion: 'prefijo' | 'postfijo';
  readonly operando: NodoExpresion;
  readonly rango: Rango;
}

export interface NodoLlamada {
  readonly tipo: 'llamada';
  readonly callee: NodoExpresion;
  readonly argumentos: readonly NodoExpresion[];
  readonly rango: Rango;
}

export interface NodoAccesoMiembro {
  readonly tipo: 'acceso-miembro';
  readonly objeto: NodoExpresion;
  readonly miembro: string;
  readonly rango: Rango;
}

export interface NodoNuevaInstancia {
  readonly tipo: 'nueva-instancia';
  readonly nombreTipo: string;
  readonly argumentos: readonly NodoExpresion[];
  readonly rango: Rango;
}

/** Cast: `(Tipo) operando`. A tipo primitivo (design §2.4 nivel 13) o a tipo por referencia (la
 * validez del tipo referenciado la decide atribución, tarea 1.7+ — aquí solo sintaxis, ADR 003). */
export interface NodoConversion {
  readonly tipo: 'conversion';
  readonly nombreTipo: string;
  readonly operando: NodoExpresion;
  readonly rango: Rango;
}

/** Una construcción de expresión que Java sí acepta pero este visualizador todavía no (ADR 003):
 * bits/desplazamientos, ternario, `instanceof`, acceso a arreglo, referencia a método, `~`,
 * asignaciones compuestas de bits. Envuelve el tramo completo, respetando la precedencia real, para
 * que el análisis pueda seguir después sin dar un error de sintaxis engañoso (C8). */
// Tarea 1.25: mismo mecanismo que `NodoNoSoportado` (arriba) — discriminado por `codigo`, cada
// miembro trae los datos exactos que su texto necesita (p. ej. `arreglo-no-soportado`, sitio "new
// Tipo[...]", también exige `datos.tipoArreglo` — MISMO valor de código que la declaración, ver
// motor/no-soportado.ts).
export type NodoExpresionNoSoportada = ConDatosPorCodigo<{ readonly tipo: 'expresion-no-soportada'; readonly rango: Rango }>;
