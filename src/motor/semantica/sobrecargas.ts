// Resolución de sobrecargas (tarea 1.8, JLS 15.12.2, REQ-BIB-004) sobre las firmas REALES del
// catálogo (tarea 1.9) — nunca una tabla de sobrecargas escrita a mano. Solo la fase 1 de la JLS
// ("invocación estricta": identidad + ensanchamiento) hace falta en este subconjunto — ver la
// cabecera de `conversiones.ts` para el porqué (sin boxing, sin varargs relevantes aquí).
//
// "Más específico" (JLS 15.12.2.5, simplificada a aridad fija): entre los candidatos aplicables,
// el ganador es aquel cuyos tipos de parámetro son ELLOS MISMOS aplicables a los de cualquier
// otro candidato — p. ej. entre `round(float)` y `round(double)`, `float` ensancha a `double`
// (nunca al revés), así que `round(float)` es más específico.
import { buscarFirmas } from './catalogo-api.ts';
import { esConvertiblePorEnsanchamiento } from './conversiones.ts';
import type { Tipo } from './tipos.ts';
import type { FirmaMiembro } from '../biblioteca/datos/firmas-jdk.generado.ts';

/** ¿El candidato `a` es aplicable donde se pide `b` (para decidir "más específico")? Mismo
 * ensanchamiento de `conversiones.ts`, pero entre dos parámetros YA reflejados (`FirmaMiembro`),
 * nunca entre un `Tipo` nuestro y un parámetro — por eso vive aparte, no en `conversiones.ts`. */
function unParametroEnsanchaAOtro(paramA: string, paramB: string): boolean {
  if (paramA === paramB) return true;
  const PRIMITIVOS_REFLEJADOS: Readonly<Record<string, readonly string[]>> = {
    char: ['int', 'long', 'float', 'double'],
    int: ['long', 'float', 'double'],
    long: ['float', 'double'],
    float: ['double'],
  };
  if (paramA in PRIMITIVOS_REFLEJADOS) return PRIMITIVOS_REFLEJADOS[paramA]!.includes(paramB);
  return paramA === 'java.lang.String' && paramB === 'java.lang.Object';
}

/** `true` si `candidato` es aplicable a los parámetros de CUALQUIER otro miembro de `todos`
 * (incluido él mismo) — la definición de "más específico" de JLS 15.12.2.5 para aridad fija. */
function esMasEspecificoQueTodos(candidato: FirmaMiembro, todos: readonly FirmaMiembro[]): boolean {
  return todos.every((otro) =>
    candidato.parametros.every((tipoParam, indice) => unParametroEnsanchaAOtro(tipoParam, otro.parametros[indice]!)),
  );
}

/**
 * Resuelve la sobrecarga real de `Clase.nombre` aplicable a `tiposDeArgumentos` (los tipos
 * ESTÁTICOS reales de cada argumento, en el mismo orden). `null` si ninguna sobrecarga real
 * acepta esa aridad/esos tipos — nunca se inventa una firma (D2).
 */
export function resolverSobrecarga(
  clase: string,
  nombre: string,
  tiposDeArgumentos: readonly Tipo[],
): FirmaMiembro | null {
  const candidatosPorAridad = buscarFirmas(clase, nombre).filter(
    (firma) => firma.parametros.length === tiposDeArgumentos.length,
  );
  const aplicables = candidatosPorAridad.filter((firma) =>
    firma.parametros.every((paramReflejado, indice) =>
      esConvertiblePorEnsanchamiento(tiposDeArgumentos[indice]!, paramReflejado),
    ),
  );
  if (aplicables.length === 0) return null;
  if (aplicables.length === 1) return aplicables[0]!;
  const masEspecificos = aplicables.filter((firma) => esMasEspecificoQueTodos(firma, aplicables));
  // Único candidato "más específico que todos" (incluido de sí mismo): el subconjunto cerrado de
  // sobrecargas reales que usa este visualizador (Math.*, print/println) nunca produce un empate
  // real — si alguna vez lo hiciera, es más honesto devolver null (D2) que adivinar cuál gana.
  return masEspecificos.length === 1 ? masEspecificos[0]! : null;
}
