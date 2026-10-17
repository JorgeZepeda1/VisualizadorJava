// Catálogo es-MX del aviso «Se detuvo por seguridad» (tarea 3.4, REQ-EJEC-007, ADR 015): lo que el alumno lee cuando el visualizador detiene un programa por un límite (pasos, caracteres, tiempo).
// El motor no escribe frases: manda la causa del fin (`FinEjecucion.causa`) y, si el programa estaba dentro de un ciclo con condición, el diagnóstico (`FinEjecucion.diagnostico`, tarea 3.3).
// Con él, el aviso es concreto —«`contador` siempre valió 1»— en vez de genérico. Tono: español de México, tuteo, el código entre comillas invertidas. Solo importa tipos de `motor/vista`.
import type { DiagnosticoDeCiclo, FinEjecucion, LecturaExplicada } from '../../motor/vista.ts';

/** `` `a` siempre valió 1``, `` `a` siempre valió 1 y `b` siempre valió 2``, `` `a` siempre valió 1, `b` siempre valió 2 y `c` siempre valió 3``. */
function enumerarSiempreValio(variables: readonly LecturaExplicada[]): string {
  const partes = variables.map((variable) => `\`${variable.nombre}\` siempre valió ${variable.valor}`);
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

/** La evidencia del ciclo desbocado: qué variables no cambiaron y por qué eso lo mantiene dando vueltas, o al menos qué ciclo era. */
export function evidenciaDelCiclo(diagnostico: DiagnosticoDeCiclo): string {
  const { ciclo, linea, condicion, vueltas, sinCambio } = diagnostico;
  if (sinCambio.length === 0) return `El ciclo \`${ciclo}\` de la línea ${linea}, con la condición \`${condicion}\`, seguía repitiéndose.`;
  const cuando = vueltas === 1 ? 'en la última vuelta' : `en las últimas ${vueltas} vueltas`;
  return `En el ciclo \`${ciclo}\` de la línea ${linea}, ${enumerarSiempreValio(sinCambio)} ${cuando}, así que la condición \`${condicion}\` nunca dejó de cumplirse.`;
}

export function tituloDelAvisoDeLimite(): string {
  return 'Se detuvo por seguridad';
}

/**
 * El detalle del aviso de seguridad para el fin de una ejecución, o `null` si ese fin no es un límite (terminó, lanzó una excepción, falló…). Con la evidencia del ciclo la agrega al final.
 */
export function textoDelAvisoDeLimite(fin: Pick<FinEjecucion, 'causa' | 'diagnostico'>): string | null {
  const evidencia = fin.diagnostico === undefined ? '' : ` ${evidenciaDelCiclo(fin.diagnostico)}`;
  switch (fin.causa) {
    case 'limite-pasos':
      return `El programa llevaba demasiados pasos y todavía no terminaba.${evidencia}`;
    case 'limite-tiempo':
      return `El programa llevaba demasiado tiempo calculando y todavía no terminaba.${evidencia}`;
    case 'limite-caracteres':
      return 'El programa escribió demasiado texto: una cadena o la consola pasaron del tamaño que el visualizador permite.';
    default:
      return null;
  }
}
