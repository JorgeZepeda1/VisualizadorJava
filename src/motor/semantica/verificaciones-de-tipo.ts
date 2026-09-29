// Verificaciones de TIPO (tarea 1.11, cierre de REQ-COMP-001, catálogo `03` §4) — funciones puras,
// separadas de `atribucion.ts` (que solo RECORRE el árbol y decide CUÁNDO llamarlas) para que cada
// regla se pueda probar y leer por separado, igual que ya hace `switch.ts` con el selector.
import type { NodoExpresion } from '../sintaxis/ast.ts';
import type { Alcance } from './alcance.ts';
import type { ValorConstante } from './constantes.ts';
import { NOMBRES_DE_CLASE_RECONOCIDOS, type Tipo } from './tipos.ts';

const TIPOS_NUMERICOS: ReadonlySet<Tipo> = new Set(['int', 'long', 'double', 'char']);

// JLS 5.1.2 (ensanchamiento primitivo), restringido a los tipos que este subconjunto declara.
const ENSANCHAMIENTO_ASIGNACION: Readonly<Partial<Record<Tipo, readonly Tipo[]>>> = {
  char: ['int', 'long', 'double'],
  int: ['long', 'double'],
  long: ['double'],
};

/** ¿Un valor de tipo `origen` es asignable a una variable declarada `destino` (JLS 5.2)? Incluye
 * identidad, ensanchamiento primitivo y el único caso de ESTRECHAMIENTO que JLS 5.2 permite sin
 * cast: una expresión CONSTANTE `int` cuyo valor cabe en `char` (design.md §2.7: "char c = 65;").
 * `'desconocido'` (algo no soportado o ya inválido) nunca produce un error aquí — D2, suprime la
 * cascada. */
export function esAsignable(origen: Tipo, destino: Tipo, constanteOrigen: ValorConstante | null): boolean {
  if (origen === destino || origen === 'desconocido' || destino === 'desconocido') return true;
  if ((ENSANCHAMIENTO_ASIGNACION[origen] ?? []).includes(destino)) return true;
  if (origen === 'int' && destino === 'char' && constanteOrigen?.tipo === 'int') {
    return constanteOrigen.valor >= 0 && constanteOrigen.valor <= 65535;
  }
  return false;
}

// Tarea 1.11 (cierre de REQ-COMP-001): "conversion-con-perdida" (existe un cast que arreglaría el
// problema, ambos numéricos — err04) es un CÓDIGO DISTINTO de "tipos-incompatibles-en-asignacion"
// (ningún cast lo arregla, p. ej. String -> int — err12): javac usa mensajes distintos.
export function codigoDeAsignacionInvalida(
  origen: Tipo,
  destino: Tipo,
): 'conversion-con-perdida' | 'tipos-incompatibles-en-asignacion' {
  return TIPOS_NUMERICOS.has(origen) && TIPOS_NUMERICOS.has(destino)
    ? 'conversion-con-perdida'
    : 'tipos-incompatibles-en-asignacion';
}

/** err28 (`String == int`, "bad operand types") / "incomparable types" (dos referencias distintas
 * — nunca ocurre hoy: los únicos tipos de referencia declarables son String/Scanner/Random y este
 * subconjunto no compara Scanner/Random entre sí en ningún caso real). Numérico-con-numérico
 * (cualquier combinación, la promoción real los hace comparables) y boolean-con-boolean son las
 * únicas combinaciones válidas fuera de la identidad. */
export function tiposComparablesConIgualdad(a: Tipo, b: Tipo): boolean {
  if (a === 'desconocido' || b === 'desconocido' || a === b) return true;
  return TIPOS_NUMERICOS.has(a) && TIPOS_NUMERICOS.has(b);
}

/** err35 (`String - int`, "bad operand types for binary operator '-'"). "+" es distinto: concatena
 * si CUALQUIER operando es String (nunca un error) — el resto de aritmética (`- * / %`) y lo
 * relacional (`< > <= >=`) exige ambos operandos numéricos. */
export function operandosValidosParaAritmetica(operador: string, a: Tipo, b: Tipo): boolean {
  if (a === 'desconocido' || b === 'desconocido') return true;
  if (operador === '+') return (TIPOS_NUMERICOS.has(a) && TIPOS_NUMERICOS.has(b)) || a === 'String' || b === 'String';
  return TIPOS_NUMERICOS.has(a) && TIPOS_NUMERICOS.has(b);
}

const PRIMITIVOS_DEL_SUBCONJUNTO: ReadonlySet<string> = new Set(['int', 'long', 'double', 'boolean', 'char']);

// Deuda del commit 999a8ca (sub-lote 1-D1, err20 de exploracion/03): "Scanner"/"Random" son las 2
// ÚNICAS clases de referencia de REQ-SUB-005 que viven en java.util -- a diferencia de "String"
// (java.lang, SIEMPRE disponible sin import) -- así que son las ÚNICAS que Java exige importar de
// verdad. Verificado contra javac 17 real: "Scanner sc = new Scanner(System.in);" sin import ->
// "cannot find symbol: class Scanner" (exploracion/03 §4, fila err20).
//
// Corrección obligatoria (sub-lote 1-D2a): fuente ÚNICA — antes existía una copia idéntica
// (`CLASES_JAVA_UTIL_QUE_REQUIEREN_IMPORT`) en `atribucion.ts`, que ahora importa esta constante en
// vez de mantener su propia lista (riesgo real de que alguna vez divergieran si el subconjunto
// agrega una tercera clase de java.util). Se exporta como `ReadonlySet` (no un array): además de
// `.has()` en `resultadoNombreDeTipo`, `atribucion.ts` solo necesita iterarla (`for...of`), que un
// `Set` ya soporta igual que un array.
export const CLASES_QUE_REQUIEREN_IMPORT: ReadonlySet<string> = new Set(['Scanner', 'Random']);

export type ResultadoNombreDeTipo = 'valido' | 'requiere-import' | 'no-reconocido';

/** err18 (`string nombre`, "cannot find symbol: class string") / err20 (`Scanner` sin import,
 * "cannot find symbol: class Scanner"): distingue un nombre GENUINAMENTE desconocido (ni
 * primitivo ni clase reflejada real — nunca una suposición sobre lo que "debería" existir) de uno
 * real de java.util al que le falta el import — mismo catálogo del oráculo (1.9), sin adivinar
 * ninguno de los dos casos. `nombresJavaUtilImportados`: qué de {Scanner, Random} el programa
 * importó de verdad (lo arma `atribucion.ts` con `NodoPrograma.importaciones`). */
export function resultadoNombreDeTipo(
  nombreTipo: string,
  nombresJavaUtilImportados: ReadonlySet<string>,
): ResultadoNombreDeTipo {
  if (PRIMITIVOS_DEL_SUBCONJUNTO.has(nombreTipo)) return 'valido';
  if (!NOMBRES_DE_CLASE_RECONOCIDOS.has(nombreTipo)) return 'no-reconocido';
  if (CLASES_QUE_REQUIEREN_IMPORT.has(nombreTipo) && !nombresJavaUtilImportados.has(nombreTipo)) {
    return 'requiere-import';
  }
  return 'valido';
}

/** err19 (`system.out...`, "package system does not exist"): pista de mayúscula cuando un nombre
 * NO declarado, en mayúscula inicial, SÍ coincide con una clase real reflejada — nunca inventa una
 * sugerencia sin verificarla contra el catálogo real del oráculo. */
export function sugerenciaDeMayuscula(nombre: string): string | undefined {
  const conMayuscula = nombre.charAt(0).toUpperCase() + nombre.slice(1);
  return conMayuscula !== nombre && NOMBRES_DE_CLASE_RECONOCIDOS.has(conMayuscula) ? conMayuscula : undefined;
}

// Tarea 1.21 (sub-lote 1-D4, REQ-SUB-001): "import java.utilScanner;" (nombre real mal formado,
// mutante real de la tarea 1.16) -- javac ancla su error en la propia línea del IMPORT, NUNCA en
// el uso posterior de la variable (a diferencia de "Scanner sin import", `resultadoNombreDeTipo`
// arriba, que SÍ es sobre el USO). Solo valida imports NO comodín (REQ-SUB-001 solo pide
// "java.util.*" real, un caso que los mutantes de este corpus nunca corrompen). REQ-SUB-001 mismo
// enumera el universo EXACTO de imports válidos: "java.util.Scanner", "java.util.Random", o
// "java.lang.X" de una clase soportada -- nunca basta con mirar solo el ÚLTIMO segmento (corrección
// real esta sesión: "import java.java.Scanner;", mutante "cambiar-identificador" sobre "util",
// termina en un nombre de clase REAL pero un PAQUETE que no existe; javac lo rechaza igual,
// verificado: "cannot find symbol: class Scanner, location: package java.java").
export function nombreDeClaseImportadaEsValido(nombreCalificado: string): boolean {
  const ultimoPunto = nombreCalificado.lastIndexOf('.');
  if (ultimoPunto === -1) return false; // un import siempre es un nombre calificado (JLS 7.5.1)
  const paquete = nombreCalificado.slice(0, ultimoPunto);
  const clase = nombreCalificado.slice(ultimoPunto + 1);
  if (!NOMBRES_DE_CLASE_RECONOCIDOS.has(clase)) return false;
  if (paquete === 'java.util') return CLASES_QUE_REQUIEREN_IMPORT.has(clase);
  if (paquete === 'java.lang') return !CLASES_QUE_REQUIEREN_IMPORT.has(clase);
  return false;
}

// Tarea 1.21 (JLS 5.6.1, verificado contra javac 17 real: "bad operand type X for unary operator
// 'Y'"): "!" exige "boolean"; "+"/"-" exigen un tipo NUMÉRICO (int/long/double/char -- char
// promueve, ver `tipoDeUnaria` en tipos.ts, pero el CHEQUEO de aplicabilidad es sobre el tipo
// ORIGINAL del operando, antes de promover). 'desconocido' nunca reporta nada (D2).
export function operandoValidoParaUnario(operador: '+' | '-' | '!', operando: Tipo): boolean {
  if (operando === 'desconocido') return true;
  if (operador === '!') return operando === 'boolean';
  return TIPOS_NUMERICOS.has(operando);
}

// Tarea 1.21 (JLS 15.14/15.15, verificado contra javac 17 real: "bad operand type X for unary
// operator '++'/'--'"): mismo criterio "numérico" que "+"/"-" unarios de arriba -- "!" no aplica
// aquí (Java no tiene "!!"/"!--").
export function operandoValidoParaIncrementoDecremento(operando: Tipo): boolean {
  return operando === 'desconocido' || TIPOS_NUMERICOS.has(operando);
}

// Tarea 1.21 (JLS 15.26.2, verificado contra javac 17 real): una asignación compuesta ("E1 op=
// E2") SIEMPRE aplica un cast implícito de vuelta al tipo de "E1" ("E1 = (T)(E1 op E2)") -- a
// diferencia de una asignación simple (`esAsignable`, más arriba, SIN cast implícito), CUALQUIER
// combinación numérica<->numérica siempre castea de vuelta sin error (verificado: "int x=5; x*=2.5;"
// compila limpio) -- la ÚNICA forma de que esto falle es que "resultado" (el tipo de "E1 op E2",
// YA promovido/concatenado -- ver `tipoDeBinaria` en tipos.ts) sea "String" y "objetivo" no lo sea
// (verificado: "int x=5; x+="a";" da "incompatible types: String cannot be converted to int" --
// "+" SÍ aplicó, por concatenación, pero el resultado "String" no puede volver a "int"). "boolean"/
// "Scanner"/"Random" como "objetivo" nunca llegan aquí: `operandosValidosParaAritmetica` ya los
// rechaza ANTES (el operador base ni siquiera aplica -- ver `verificarAsignacionCompuesta`,
// atribucion.ts).
export function esConvertibleImplicitamenteEnAsignacionCompuesta(resultado: Tipo, objetivo: Tipo): boolean {
  if (resultado === objetivo || resultado === 'desconocido' || objetivo === 'desconocido') return true;
  return TIPOS_NUMERICOS.has(resultado) && TIPOS_NUMERICOS.has(objetivo);
}

// Tarea 1.21 (sub-lote 1-D4, cierre de C7, mutantes reales de la tarea 1.16): el objetivo de una
// asignación (JLS 15.26) y el operando de "++"/"--" (JLS 15.14/15.15) deben ser una VARIABLE real
// (JLS 4.12.3 "ExpressionName" que resuelve a algo declarado) -- NUNCA el nombre de una CLASE
// (aunque comparta la forma sintáctica "Id": "Scanner"/"Math" no son variables) ni el VALOR de otra
// expresión (p. ej. "fila++", el resultado de un incremento, no algo a lo que se pueda volver a
// incrementar). Verificado contra javac 17 real: "Scanner = new Scanner(System.in);" da "cannot
// find symbol: variable Scanner" (el mismo nombre existe como CLASE, espacio de símbolos
// DISTINTO -- JLS 6.5.6); "fila++ ++;" da "unexpected type\n required: variable\n found: value" --
// dos mensajes de javac DISTINTOS para la MISMA causa real (un catálogo con un solo código, igual
// que ya hace "sin-sobrecarga-aplicable" para dos frases de javac).
export function operandoNoEsVariableValida(expresion: NodoExpresion, alcance: Alcance): boolean {
  if (expresion.tipo !== 'nombre') return true; // cualquier otra forma (X++, Math.PI, una llamada…) nunca es una variable
  // NI declarada NI clase reconocida ("noExiste = 5"): NO es un problema NUEVO -- `visitarNombreComoValor`
  // (mismo nodo, visitado antes en `visitarExpresion`) YA reporta "variable-no-declarada" (D2:
  // nunca un SEGUNDO problema por la MISMA causa real).
  return alcance.buscar(expresion.nombre) === null && NOMBRES_DE_CLASE_RECONOCIDOS.has(expresion.nombre);
}
