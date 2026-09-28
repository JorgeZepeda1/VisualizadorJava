// Resolución de sobrecargas (tarea 1.8, JLS 15.12.2, REQ-BIB-004) sobre las firmas REALES del
// catálogo (tarea 1.9) — nunca una tabla de sobrecargas escrita a mano. Las 3 fases de la JLS, EN
// ORDEN (cada una solo corre si la anterior no resolvió nada — 15.12.2: "si la fase 1 falla,
// intenta la 2; si la 2 falla, intenta la 3"):
//   1. Invocación ESTRICTA (15.12.2.2): identidad + ensanchamiento, aridad FIJA. Sola basta para
//      TODO el catálogo REQ-SUB-005 de aridad fija (Math.*, print/println…).
//   2. Invocación LAXA (15.12.2.3): + boxing, aridad FIJA. Ningún miembro soportado hoy tiene un
//      parámetro de tipo envoltorio en posición fija — esta fase nunca "gana" todavía por sí sola,
//      pero es la que exige la JLS antes de intentar varargs, y su predicado de conversión
//      (`esConvertiblePorInvocacionLaxa`) es el mismo que empaqueta los argumentos de la fase 3.
//   3. Invocación de ARIDAD VARIABLE (15.12.2.4, varargs): + empaquetar el resto de los argumentos
//      en el arreglo del último parámetro. Corrección obligatoria (sub-lote 1-C2): la ÚNICA fase
//      que resuelve `printf`/`String.format` (`(String, Object...)`, catálogo real 1.9).
//
// "Más específico" (JLS 15.12.2.5, simplificada a aridad fija): entre los candidatos aplicables de
// una misma fase, el ganador es aquel cuyos tipos de parámetro son ELLOS MISMOS aplicables a los
// de cualquier otro candidato — p. ej. entre `round(float)` y `round(double)`, `float` ensancha a
// `double` (nunca al revés), así que `round(float)` es más específico. Se reusa igual en las 3
// fases (el "candidato más específico" no depende de CUÁL conversión lo hizo aplicable).
import { buscarFirmas } from './catalogo-api.ts';
import { esConvertiblePorEnsanchamiento, esConvertiblePorInvocacionLaxa } from './conversiones.ts';
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

/** El único candidato "más específico que todos" entre `aplicables` (incluido de sí mismo), o
 * `null` si hay 0 candidatos o un empate real (D2: más honesto devolver null que adivinar). */
function elegirMasEspecifico(aplicables: readonly FirmaMiembro[]): FirmaMiembro | null {
  if (aplicables.length === 0) return null;
  if (aplicables.length === 1) return aplicables[0]!;
  const masEspecificos = aplicables.filter((firma) => esMasEspecificoQueTodos(firma, aplicables));
  return masEspecificos.length === 1 ? masEspecificos[0]! : null;
}

/** Fases 1 y 2 (aridad FIJA: mismo número de parámetros que de argumentos) — solo cambia el
 * predicado de conversión que reciben (estricta o laxa). */
function resolverPorAridadFija(
  candidatos: readonly FirmaMiembro[],
  tiposDeArgumentos: readonly Tipo[],
  esAplicable: (origen: Tipo, destinoReflejado: string) => boolean,
): FirmaMiembro | null {
  const candidatosPorAridad = candidatos.filter((firma) => firma.parametros.length === tiposDeArgumentos.length);
  const aplicables = candidatosPorAridad.filter((firma) =>
    firma.parametros.every((paramReflejado, indice) => esAplicable(tiposDeArgumentos[indice]!, paramReflejado)),
  );
  return elegirMasEspecifico(aplicables);
}

/** Fase 3 (JLS 15.12.2.4): `firma` es varargs y su último parámetro reflejado es un arreglo
 * (`"algo[]"`, p. ej. `"java.lang.Object[]"`) — los parámetros FIJOS anteriores se comprueban
 * igual que en aridad fija, y CADA argumento sobrante se empaqueta contra el tipo COMPONENTE del
 * arreglo (quitando el `"[]"` final), con la MISMA conversión laxa (boxing incluido). */
function esAplicablePorAridadVariable(firma: FirmaMiembro, tiposDeArgumentos: readonly Tipo[]): boolean {
  const tipoArreglo = firma.parametros[firma.parametros.length - 1]!;
  if (!tipoArreglo.endsWith('[]')) return false; // varargs siempre reflejado como arreglo (JLS 8.4.1)
  const tipoComponente = tipoArreglo.slice(0, -2);
  const posicionesFijas = firma.parametros.length - 1;
  for (let indice = 0; indice < posicionesFijas; indice += 1) {
    if (!esConvertiblePorInvocacionLaxa(tiposDeArgumentos[indice]!, firma.parametros[indice]!)) return false;
  }
  for (let indice = posicionesFijas; indice < tiposDeArgumentos.length; indice += 1) {
    if (!esConvertiblePorInvocacionLaxa(tiposDeArgumentos[indice]!, tipoComponente)) return false;
  }
  return true;
}

function resolverPorAridadVariable(
  candidatos: readonly FirmaMiembro[],
  tiposDeArgumentos: readonly Tipo[],
): FirmaMiembro | null {
  const candidatosVarargs = candidatos.filter(
    // Al menos tantos argumentos como parámetros FIJOS (el arreglo final puede recibir 0 o más).
    (firma) => firma.esVarargs && tiposDeArgumentos.length >= firma.parametros.length - 1,
  );
  const aplicables = candidatosVarargs.filter((firma) => esAplicablePorAridadVariable(firma, tiposDeArgumentos));
  return elegirMasEspecifico(aplicables);
}

/**
 * Resuelve la sobrecarga real de `Clase.nombre` aplicable a `tiposDeArgumentos` (los tipos
 * ESTÁTICOS reales de cada argumento, en el mismo orden), probando las 3 fases de JLS 15.12.2 EN
 * ORDEN — la primera fase que resuelve algo GANA, nunca se sigue buscando (p. ej. `Math.round`,
 * sin varargs, siempre se resuelve en la fase 1). `null` si NINGUNA fase resuelve nada — nunca se
 * inventa una firma (D2).
 */
export function resolverSobrecarga(
  clase: string,
  nombre: string,
  tiposDeArgumentos: readonly Tipo[],
): FirmaMiembro | null {
  const candidatos = buscarFirmas(clase, nombre);
  return (
    resolverPorAridadFija(candidatos, tiposDeArgumentos, esConvertiblePorEnsanchamiento) ??
    resolverPorAridadFija(candidatos, tiposDeArgumentos, esConvertiblePorInvocacionLaxa) ??
    resolverPorAridadVariable(candidatos, tiposDeArgumentos)
  );
}
