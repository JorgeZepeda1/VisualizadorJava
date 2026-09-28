// Verificaciones de TIPO (tarea 1.11, cierre de REQ-COMP-001, catálogo `03` §4) — funciones puras,
// separadas de `atribucion.ts` (que solo RECORRE el árbol y decide CUÁNDO llamarlas) para que cada
// regla se pueda probar y leer por separado, igual que ya hace `switch.ts` con el selector.
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

/** err18 (`string nombre`, "cannot find symbol: class string"): el nombre de tipo de una
 * declaración debe ser un primitivo real o una clase reflejada de verdad (1.9) — nunca una
 * suposición sobre lo que "debería" existir. */
export function esNombreDeTipoValido(nombreTipo: string): boolean {
  return PRIMITIVOS_DEL_SUBCONJUNTO.has(nombreTipo) || NOMBRES_DE_CLASE_RECONOCIDOS.has(nombreTipo);
}

/** err19 (`system.out...`, "package system does not exist"): pista de mayúscula cuando un nombre
 * NO declarado, en mayúscula inicial, SÍ coincide con una clase real reflejada — nunca inventa una
 * sugerencia sin verificarla contra el catálogo real del oráculo. */
export function sugerenciaDeMayuscula(nombre: string): string | undefined {
  const conMayuscula = nombre.charAt(0).toUpperCase() + nombre.slice(1);
  return conMayuscula !== nombre && NOMBRES_DE_CLASE_RECONOCIDOS.has(conMayuscula) ? conMayuscula : undefined;
}
