// Catálogo es-MX del aviso «Se detuvo por seguridad» (tarea 3.4, REQ-EJEC-007, ADR 015): lo que el alumno lee cuando el visualizador detiene un programa por un límite (pasos, caracteres, tiempo).
// El motor no escribe frases: manda la causa del fin (`FinEjecucion.causa`) y, si el programa estaba dentro de un ciclo con condición, el diagnóstico (`FinEjecucion.diagnostico`, tarea 3.3).
// Con él, el aviso es concreto —«`contador` siempre valió 1»— en vez de genérico. Tono: español de México, tuteo, el código entre comillas invertidas. Solo importa tipos de `motor/vista`.
//
// C7 del panel 1 (2026-10-17): el alumno lee dos cosas, cada una UNA vez. En el paso 0, una intriga que NO cuenta el final («Ojo: este programa no terminó solo… Avanza y descubre por qué»); al llegar al final,
// UN texto con el motivo (el título «Se detuvo por seguridad» del aviso ya dice que se detuvo, así que ni el paso ni la nota lo repiten).
import type { DiagnosticoDeCiclo, FinEjecucion, LecturaExplicada } from '../../motor/vista.ts';

/** Las causas de fin que son un límite del visualizador: las únicas con aviso de seguridad. */
export type CausaDeLimite = 'limite-pasos' | 'limite-tiempo' | 'limite-caracteres';

/** `` `a` siempre valió 1``, `` `a` siempre valió 1 y `b` siempre valió 2``, `` `a` siempre valió 1, `b` siempre valió 2 y `c` siempre valió 3``. */
function enumerarSiempreValio(variables: readonly LecturaExplicada[]): string {
  const partes = variables.map((variable) => `\`${variable.nombre}\` siempre valió ${variable.valor}`);
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

/** `` `a` ``, `` `a` o `b` ``, `` `a`, `b` o `c` ``: las variables que tendrían que cambiar para que el ciclo termine. */
function enumerarConO(variables: readonly LecturaExplicada[]): string {
  const partes = variables.map((variable) => `\`${variable.nombre}\``);
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} o ${partes[partes.length - 1]}`;
}

/** La evidencia del ciclo desbocado: qué variables no cambiaron y por qué eso lo mantiene dando vueltas, o al menos qué ciclo era. */
export function evidenciaDelCiclo(diagnostico: DiagnosticoDeCiclo): string {
  const { ciclo, linea, condicion, vueltas, sinCambio } = diagnostico;
  if (sinCambio.length === 0) return `El ciclo \`${ciclo}\` de la línea ${linea}, con la condición \`${condicion}\`, seguía repitiéndose.`;
  const cuando = vueltas === 1 ? 'En la última vuelta' : `En las últimas ${vueltas} vueltas`;
  return `${cuando} del \`${ciclo}\` de la línea ${linea}, ${enumerarSiempreValio(sinCambio)}, así que \`${condicion}\` siempre dio \`true\`. Mientras nada dentro del ciclo cambie ${enumerarConO(sinCambio)}, el ciclo no va a terminar.`;
}

export function tituloDelAvisoDeLimite(): string {
  return 'Se detuvo por seguridad';
}

const MOTIVO_DE_LA_INTRIGA: Readonly<Record<CausaDeLimite, string>> = {
  'limite-pasos': 'después de muchos pasos',
  'limite-tiempo': 'porque tardaba demasiado en calcular',
  'limite-caracteres': 'porque escribía demasiado texto',
};

const CAUSAS_DE_LIMITE: ReadonlySet<FinEjecucion['causa']> = new Set<FinEjecucion['causa']>(['limite-pasos', 'limite-tiempo', 'limite-caracteres']);

function esLimite(causa: FinEjecucion['causa']): causa is CausaDeLimite {
  return CAUSAS_DE_LIMITE.has(causa);
}

/**
 * Lo que el robot dice en el paso 0 de un programa que el visualizador detuvo por seguridad, o `null` si el fin no es un límite. Es una intriga: dice QUE no terminó solo y deja el POR QUÉ para
 * cuando el alumno avance (la evidencia del ciclo viene después, en el final). Antes contaba el diagnóstico completo desde el primer paso y no quedaba nada por descubrir.
 */
export function textoIntrigaDelLimite(causa: FinEjecucion['causa']): string | null {
  if (!esLimite(causa)) return null;
  return `Ojo: este programa no terminó solo. El visualizador lo detuvo por seguridad ${MOTIVO_DE_LA_INTRIGA[causa]}. Avanza y descubre por qué.`;
}

/**
 * El único texto del final de un programa detenido por un límite (el del paso `detenido` y el de la nota de cierre). Con la evidencia de un ciclo cuyas variables no cambiaron, la evidencia ya dice
 * por qué fue y qué haría que terminara. Sin variables que citar (`while (true) {}`) o sin ciclo que diagnosticar, dice el motivo y lo que sí se sabe; sin ciclo y por pasos, deja la pregunta que lleva
 * a buscarlo.
 */
export function textoDeLaDetencion(causa: CausaDeLimite, diagnostico?: DiagnosticoDeCiclo): string {
  if (causa === 'limite-caracteres') {
    return 'El programa escribió demasiado texto: una cadena o la consola pasaron del tamaño que el visualizador permite.';
  }
  if (diagnostico !== undefined && diagnostico.sinCambio.length > 0) return evidenciaDelCiclo(diagnostico);
  const motivo = causa === 'limite-pasos' ? 'El programa llevaba demasiados pasos y todavía no terminaba.' : 'El programa llevaba demasiado tiempo calculando y todavía no terminaba.';
  if (diagnostico !== undefined) return `${motivo} ${evidenciaDelCiclo(diagnostico)}`;
  return causa === 'limite-pasos' ? `${motivo} ¿Será un ciclo que nunca termina?` : motivo;
}

/** El texto del final de una ejecución que terminó por un límite, o `null` si ese fin no es un límite (terminó, lanzó una excepción, falló…). */
export function textoDelAvisoDeLimite(fin: Pick<FinEjecucion, 'causa' | 'diagnostico'>): string | null {
  if (!esLimite(fin.causa)) return null;
  return textoDeLaDetencion(fin.causa, fin.diagnostico);
}
