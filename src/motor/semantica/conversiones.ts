// Conversiones aplicables en la resolución de sobrecargas (tarea 1.8, JLS 15.12.2.2 "invocación
// estricta" + JLS 5.1.2 ensanchamiento primitivo/de referencia). Nuestro subconjunto NUNCA
// produce un valor envuelto (`Integer`/`Double`…: fuera de alcance, REQ-SUB-007) ni pasa por
// varargs salvo `printf`/`String.format` (fuera de la resolución de 1.8 — biblioteca-java decide
// su semántica de formato aparte): por eso la fase 1 (identidad + ensanchamiento, SIN boxing) es
// la ÚNICA fase que este subconjunto necesita — ver engram, "Learned" de esta sesión.
import type { Tipo } from './tipos.ts';

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

/** El nombre tal como lo reporta la reflexión del JDK para un `Tipo` nuestro (`FirmaMiembro`
 * usa `Class#getTypeName()`: los primitivos se quedan igual, `String` es su nombre calificado). */
function nombreReflejado(tipo: Tipo): string {
  if (tipo === 'String') return 'java.lang.String';
  if (tipo === 'Scanner') return 'java.util.Scanner';
  if (tipo === 'Random') return 'java.util.Random';
  return tipo;
}

/**
 * ¿Un valor de `origen` es aplicable donde se pide `destinoReflejado` (el `parametros[i]` real
 * de una `FirmaMiembro`), en la fase estricta de JLS 15.12.2.2 — identidad, ensanchamiento
 * primitivo (5.1.2) o ensanchamiento de referencia (5.1.5, aquí solo `String` -> `Object`,  el
 * único caso real y alcanzable de este subconjunto)? NUNCA boxing/unboxing (fase 2) ni varargs
 * (fase 3) — ver la nota de cabecera.
 */
export function esConvertiblePorEnsanchamiento(origen: Tipo, destinoReflejado: string): boolean {
  const origenReflejado = nombreReflejado(origen);
  if (origenReflejado === destinoReflejado) return true;
  if (TIPOS_PRIMITIVOS.has(origen)) {
    return (ENSANCHAMIENTOS_PRIMITIVOS[origen] ?? []).includes(destinoReflejado);
  }
  // Único ensanchamiento de referencia real y alcanzable en este subconjunto: String -> Object
  // (JLS 5.1.5, "widening reference conversion"). Nunca boxing (int/char/… -> Object): eso
  // requeriría la fase 2 (loose invocation), que este subconjunto no necesita — ver cabecera.
  return origen === 'String' && destinoReflejado === 'java.lang.Object';
}
