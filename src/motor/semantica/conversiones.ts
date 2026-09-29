// Conversiones aplicables en la resolución de sobrecargas (tarea 1.8, JLS 15.12.2.2 "invocación
// estricta" + JLS 5.1.2 ensanchamiento primitivo/de referencia). La fase 1 (identidad +
// ensanchamiento, SIN boxing) basta para TODO el catálogo REQ-SUB-005 de aridad fija (Math.*,
// print/println…), que nunca produce un valor envuelto.
//
// Corrección obligatoria (sub-lote 1-C2, orquestador): `printf`/`String.format` SÍ son varargs
// reales (`PrintStream.printf(String, Object...)`, `String.format(String, Object...)`, catálogo
// real del oráculo 1.9) y 4 programas del corpus los usan con argumentos literales — la fase 1
// nunca los resuelve (ningún tipo nuestro ensancha a `Object[]` sin boxing). Esta fase 2
// ("invocación laxa", JLS 15.12.2.3) agrega boxing primitivo — restringido a los 5 envoltorios que
// este subconjunto puede producir como argumento (`int/double/char/boolean/long`; nunca unboxing,
// nunca un envoltorio para `String`/`Scanner`/`Random`, que ya son de referencia). `sobrecargas.ts`
// la usa tanto para la fase 2 de aridad FIJA como, empaquetando cada argumento sobrante, para la
// fase 3 de aridad VARIABLE (varargs) — ver su cabecera.
//
// Sub-lote 1-D4: `origen` amplía de `Tipo` a `ArgumentoDeSobrecarga` (`Tipo | {reflejado}`) para
// que `System.in`/`System.out`/`System.err` (sin un `Tipo` cerrado propio, ver tipos.ts) participen
// en la resolución con su nombre reflejado REAL — para un `origen` de tipo `Tipo` (el caso de
// SIEMPRE) el comportamiento es IDÉNTICO al de antes, ni una prueba existente cambia.
import { SUPERTIPOS_JDK } from '../biblioteca/datos/supertipos-jdk.generado.ts';
import { nombreReflejado, type ArgumentoDeSobrecarga, type Tipo } from './tipos.ts';

// JLS 5.1.2: pares de ensanchamiento primitivo DIRECTOS relevantes para los tipos alcanzables de
// este subconjunto (sin byte/short, NO-DISP). Los nombres de destino son los que da la reflexión
// real (`Class#getTypeName()`), nunca traducidos: así comparar contra `FirmaMiembro.parametros`
// es una comparación de texto directa, sin una segunda tabla de sinónimos que se pueda desincronizar.
const ENSANCHAMIENTOS_PRIMITIVOS: Readonly<Record<string, readonly string[]>> = {
  char: ['int', 'long', 'float', 'double'],
  int: ['long', 'float', 'double'],
  long: ['float', 'double'],
  float: ['double'],
};

const TIPOS_PRIMITIVOS: ReadonlySet<Tipo> = new Set(['int', 'long', 'double', 'char', 'boolean']);

// Tarea 1.29 (causa 4, JLS 4.10.2/5.1.5): los supertipos REALES de cada tipo de referencia, tal
// como los observó el oráculo (`supertipos-jdk.generado.ts`, ADR 010) — un `Map` (nunca el objeto
// generado directo) para que un nombre como "constructor" no encuentre nada del prototipo.
const SUPERTIPOS_POR_TIPO: ReadonlyMap<string, readonly string[]> = new Map(Object.entries(SUPERTIPOS_JDK));

/**
 * ¿`subtipo` es el mismo tipo de referencia que `supertipo`, o desciende de él (clase base o
 * interfaz, transitivo, siempre también `java.lang.Object`)? Ambos son nombres reflejados
 * (`Class#getTypeName()`, como `FirmaMiembro.parametros`). Un nombre que el oráculo no midió no
 * desciende de nada (D2: sin adivinar, ni siquiera de `Object`). Sirve al ensanchamiento de
 * referencia (JLS 5.1.5, aquí) y al "más específico" (JLS 15.12.2.5, `sobrecargas.ts`) — una sola
 * relación, nunca dos tablas que puedan divergir.
 */
export function esSubtipoDeReferencia(subtipo: string, supertipo: string): boolean {
  return subtipo === supertipo || (SUPERTIPOS_POR_TIPO.get(subtipo)?.includes(supertipo) ?? false);
}

/**
 * ¿Un valor de `origen` es aplicable donde se pide `destinoReflejado` (el `parametros[i]` real
 * de una `FirmaMiembro`), en la fase estricta de JLS 15.12.2.2 — identidad, ensanchamiento
 * primitivo (5.1.2) o ensanchamiento de referencia (5.1.5, a cualquier supertipo real del origen:
 * `String` -> `CharSequence`/`Comparable`/`Object`…, tarea 1.29)? NUNCA boxing/unboxing (fase 2) ni
 * varargs (fase 3) — ver la nota de cabecera. Sub-lote 1-D4: un `origen` `{reflejado}`
 * (System.in/out/err, ver tipos.ts) compara identidad y, desde la tarea 1.29, también sus
 * supertipos reales (`PrintStream` -> `Appendable`).
 */
export function esConvertiblePorEnsanchamiento(origen: ArgumentoDeSobrecarga, destinoReflejado: string): boolean {
  const origenReflejado = typeof origen === 'string' ? nombreReflejado(origen) : origen.reflejado;
  if (origenReflejado === destinoReflejado) return true;
  if (typeof origen === 'string' && TIPOS_PRIMITIVOS.has(origen)) {
    return (ENSANCHAMIENTOS_PRIMITIVOS[origen] ?? []).includes(destinoReflejado);
  }
  // Ensanchamiento de referencia (JLS 5.1.5, "widening reference conversion"): a CUALQUIER
  // supertipo real del origen — antes solo `String -> Object`, escrito a mano (tarea 1.29). Nunca
  // boxing (int/char/… -> Object): eso requiere la fase 2 (invocación laxa) — ver
  // `esConvertiblePorInvocacionLaxa` abajo.
  return esSubtipoDeReferencia(origenReflejado, destinoReflejado);
}

// JLS 5.1.7 "boxing conversion": el envoltorio real de cada primitivo que este subconjunto puede
// producir como argumento. `String`/`Scanner`/`Random` no aparecen aquí — ya son de referencia
// (los cubre `esConvertiblePorEnsanchamiento`), y este subconjunto nunca tiene un valor de tipo
// envuelto que DESEMPAQUETAR (unboxing, la otra mitad de la fase 2 — REQ-SUB-007 lo deja fuera).
const ENVOLTORIOS: Readonly<Partial<Record<Tipo, string>>> = {
  int: 'java.lang.Integer',
  double: 'java.lang.Double',
  char: 'java.lang.Character',
  boolean: 'java.lang.Boolean',
  long: 'java.lang.Long',
};

/**
 * ¿Un valor de `origen` es aplicable donde se pide `destinoReflejado` en la fase 2 de JLS
 * 15.12.2.3 ("invocación laxa")? Incluye TODO lo de la fase estricta (`esConvertiblePorEnsanchamiento`)
 * más boxing (JLS 5.1.7) opcionalmente seguido de ensanchamiento de referencia (JLS 5.3: p. ej.
 * `int` -> `Integer` -> `Object`). Nunca unboxing — ver cabecera. Un `origen` `{reflejado}` nunca
 * tiene envoltorio (no es un primitivo nuestro) -- se queda con lo que ya resolvió la fase estricta.
 */
export function esConvertiblePorInvocacionLaxa(origen: ArgumentoDeSobrecarga, destinoReflejado: string): boolean {
  if (esConvertiblePorEnsanchamiento(origen, destinoReflejado)) return true;
  if (typeof origen !== 'string') return false;
  const envoltorio = ENVOLTORIOS[origen];
  if (envoltorio === undefined) return false;
  // JLS 5.3: boxing seguido de ensanchamiento de referencia — a cualquier supertipo real del
  // envoltorio (`int -> Integer -> Number/Comparable/Object…`), no solo a `Object` (tarea 1.29).
  return esSubtipoDeReferencia(envoltorio, destinoReflejado);
}
