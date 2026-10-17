// Trabajador (Web Worker) — protocolo completo (tarea 3.5, design.md §5, ADR 007). `manejarMensaje` contiene toda la lógica real y es lo que prueban `trabajador.test.ts` y
// `protocolo-completo.test.ts` directamente, sin un Worker de verdad. El cableado de más abajo detecta en RUNTIME (vía `globalThis`, nunca nombrando `self` como global ambiental) si este módulo
// corre dentro de un worker real — nunca bajo Vitest/Node, nunca en el hilo principal — y solo entonces conecta postMessage/onmessage. Se detecta así (no con `declare const self`) para que este
// archivo compile igual bajo cualquier tsconfig que lo incluya transitivamente (p. ej. `interfaz`, vía `cliente.ts`, con lib DOM y sin lib WebWorker).
//
// Cómo corre una ejecución: el motor da los pasos en REBANADAS de ≤ 8 ms (`avanzar(2000, presupuesto)`), cada una se manda como un mensaje `pasos` (≤ 2 000 pasos), y entre una rebanada y la
// siguiente el trabajador CEDE el turno (`ceder`, un MessageChannel) para poder atender los mensajes que lleguen (`detener`, `entrada`, `cerrar-entrada`) aunque el programa sea un ciclo sin fin.
// El transporte en proceso (jsdom y pruebas, sin Worker) no cede: corre todo de corrido dentro de la misma llamada, igual que antes de esta tarea.
import { compilar, crearEjecucion, type Ejecucion, type ResultadoCompilacion } from '../motor/index.ts';
import type { MensajeTrabajadorAUi, MensajeUiATrabajador } from './protocolo.ts';

/** Cuántos pasos, a lo más, lleva un mensaje `pasos` (ADR 007 punto 2). */
export const PASOS_POR_LOTE = 2000;
/** Cuánto, a lo más, trabaja el trabajador antes de ceder el turno (ADR 007 punto 3). */
export const MILISEGUNDOS_POR_REBANADA = 8;

export interface EntornoDelTrabajador {
  /** Pide que `continuar` corra DESPUÉS de atender los mensajes que ya esperan (en el trabajador real, un MessageChannel); `null` = no ceder nunca (todo corre de corrido). */
  readonly ceder: ((continuar: () => void) => void) | null;
  /** Milisegundos, para medir las rebanadas y el límite de tiempo del motor. */
  readonly reloj: () => number;
}

/** El transporte en proceso (jsdom, pruebas): sin Worker no hay nadie a quien ceder el turno. */
export const ENTORNO_EN_PROCESO: EntornoDelTrabajador = { ceder: null, reloj: Date.now };

interface PuertoDeMensajes {
  onmessage: ((evento: unknown) => void) | null;
  postMessage(mensaje: unknown): void;
  close(): void;
}
interface CanalDeMensajes {
  readonly port1: PuertoDeMensajes;
  readonly port2: PuertoDeMensajes;
}

/**
 * Ceder el turno con un MessageChannel: `postMessage` encola una tarea que corre cuando el trabajador ya atendió los mensajes que estaban esperando, sin la espera mínima de un
 * `setTimeout` anidado (design.md §5). `cerrar` libera el canal (el trabajador real nunca lo cierra: vive lo que vive el trabajador).
 */
export function crearCederConMessageChannel(): { ceder: (continuar: () => void) => void; cerrar: () => void } {
  const constructor = (globalThis as unknown as { MessageChannel: new () => CanalDeMensajes }).MessageChannel;
  const canal = new constructor();
  let pendiente: (() => void) | null = null;
  canal.port1.onmessage = () => {
    const continuar = pendiente;
    pendiente = null;
    continuar?.();
  };
  return {
    ceder: (continuar) => {
      pendiente = continuar;
      canal.port2.postMessage(null);
    },
    cerrar: () => {
      canal.port1.close();
      canal.port2.close();
    },
  };
}

interface EjecucionActiva {
  readonly ejecucion: Ejecucion;
  /** Cuántos pasos ya se mandaron: el `desde` del siguiente mensaje `pasos`. */
  emitidos: number;
  /** `true` mientras espera una línea (`espera-entrada`): una `entrada` o un `cerrar-entrada` la reanuda. */
  esperandoEntrada: boolean;
}

const ejecucionesActivas = new Map<number, EjecucionActiva>();

export function manejarMensaje(
  mensaje: MensajeUiATrabajador,
  emitir: (mensajeSalida: MensajeTrabajadorAUi) => void,
  entorno: EntornoDelTrabajador = ENTORNO_EN_PROCESO,
): void {
  switch (mensaje.tipo) {
    case 'ejecutar': {
      // Tarea 1.28: `compilar()` solo devuelve `Problema` para el error del ALUMNO (`ErrorDeCompilacion`); cualquier otra excepción es un fallo interno del motor y sale de ahí. Aquí, en el
      // borde del trabajador, se convierte en el mensaje de protocolo `error-interno` (design.md §5) que la interfaz ya sabe mostrar.
      let resultado: ResultadoCompilacion;
      try {
        resultado = compilar(mensaje.fuente);
      } catch (error) {
        emitir({ tipo: 'error-interno', id: mensaje.id, mensaje: describirFalloInterno(error) });
        return;
      }
      if (!resultado.ok) {
        emitir({ tipo: 'compilado', id: mensaje.id, ok: false, problema: resultado.problema, adicionales: resultado.adicionales });
        return;
      }
      emitir({ tipo: 'compilado', id: mensaje.id, ok: true, vista: resultado.vista });
      let activa: EjecucionActiva;
      try {
        activa = { ejecucion: crearEjecucion(resultado.programa, mensaje.config, undefined, entorno.reloj), emitidos: 0, esperandoEntrada: false };
      } catch (error) {
        emitir({ tipo: 'error-interno', id: mensaje.id, mensaje: describirFalloInterno(error) });
        return;
      }
      ejecucionesActivas.set(mensaje.id, activa); // si ya había una con este id, queda reemplazada: su rebanada pendiente verá que ya no es la activa
      correr(mensaje.id, activa, emitir, entorno);
      return;
    }
    case 'entrada': {
      const activa = ejecucionesActivas.get(mensaje.id);
      if (activa === undefined) return;
      activa.ejecucion.darEntrada(mensaje.renglon);
      reanudarSiEsperaba(mensaje.id, activa, emitir, entorno);
      return;
    }
    case 'cerrar-entrada': {
      const activa = ejecucionesActivas.get(mensaje.id);
      if (activa === undefined) return;
      activa.ejecucion.cerrarEntrada();
      reanudarSiEsperaba(mensaje.id, activa, emitir, entorno);
      return;
    }
    case 'detener': {
      ejecucionesActivas.delete(mensaje.id);
      // El acuse es lo que el perro guardián del cliente espera (300 ms); se manda aunque la ejecución ya no existiera.
      emitir({ tipo: 'detenido', id: mensaje.id });
      return;
    }
  }
}

/** Si la ejecución estaba esperando una línea, la reanuda; si va corriendo (entre rebanadas), la línea queda en la cola del motor y la lee cuando la necesite. */
function reanudarSiEsperaba(id: number, activa: EjecucionActiva, emitir: (mensajeSalida: MensajeTrabajadorAUi) => void, entorno: EntornoDelTrabajador): void {
  if (!activa.esperandoEntrada) return;
  activa.esperandoEntrada = false;
  correr(id, activa, emitir, entorno);
}

/** Detalle del fallo para quien depure (`MensajeErrorInterno.mensaje`); la interfaz nunca lo muestra. */
function describirFalloInterno(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/**
 * Una rebanada de la ejecución: da pasos hasta gastar `MILISEGUNDOS_POR_REBANADA` (un mensaje `pasos` por cada lote de ≤ 2 000), y si queda programa, cede el turno y vuelve a empezar cuando
 * le toque. Termina con `fin` o `espera-entrada`; si la ejecución ya no es la activa (llegó un `detener`, o un `ejecutar` con el mismo id), no hace nada.
 */
function correr(id: number, activa: EjecucionActiva, emitir: (mensajeSalida: MensajeTrabajadorAUi) => void, entorno: EntornoDelTrabajador): void {
  const inicio = entorno.reloj();
  try {
    for (;;) {
      if (ejecucionesActivas.get(id) !== activa) return;
      const restante = Math.max(1, MILISEGUNDOS_POR_REBANADA - (entorno.reloj() - inicio));
      const avance = activa.ejecucion.avanzar(PASOS_POR_LOTE, restante);
      if (avance.pasos.length > 0) {
        emitir({ tipo: 'pasos', id, desde: activa.emitidos, pasos: avance.pasos });
        activa.emitidos += avance.pasos.length;
      }
      if (avance.estado === 'fin') {
        ejecucionesActivas.delete(id);
        emitir({ tipo: 'fin', id, fin: avance.fin });
        return;
      }
      if (avance.estado === 'espera-entrada') {
        activa.esperandoEntrada = true;
        emitir({ tipo: 'espera-entrada', id, nodo: avance.nodo });
        return;
      }
      // 'continua': queda programa. Si ya se gastó la rebanada, se cede el turno (a menos que no haya a quién cedérselo).
      if (entorno.ceder !== null && entorno.reloj() - inicio >= MILISEGUNDOS_POR_REBANADA) {
        entorno.ceder(() => correr(id, activa, emitir, entorno));
        return;
      }
    }
  } catch (error) {
    // Algo que el director no atrapó (él convierte en un paso final todo lo que sale de un programa del alumno): fallo del motor, nunca del alumno.
    if (ejecucionesActivas.get(id) === activa) ejecucionesActivas.delete(id);
    emitir({ tipo: 'error-interno', id, mensaje: describirFalloInterno(error) });
  }
}

// --- Conexión real como Web Worker -----------------------------------------------------------
// Solo se activa dentro de un worker de verdad: existe `postMessage` en el ámbito global Y NO
// existe `window` (lo que sí distingue un DedicatedWorkerGlobalScope real del hilo principal,
// incluida su emulación en jsdom). `cliente.ts` decide si construye un Worker real o llama
// `manejarMensaje` en el proceso actual.
interface AlcanceDeTrabajador {
  readonly postMessage: (mensaje: unknown) => void;
  onmessage: ((evento: { data: unknown }) => void) | null;
}

function obtenerAlcanceDeTrabajadorReal(): AlcanceDeTrabajador | undefined {
  const global = globalThis as unknown as { self?: unknown; window?: unknown };
  const posibleAlcance = global.self as { postMessage?: unknown } | undefined;
  const esWorkerReal = posibleAlcance !== undefined && typeof posibleAlcance.postMessage === 'function' && global.window === undefined;
  return esWorkerReal ? (posibleAlcance as AlcanceDeTrabajador) : undefined;
}

const alcanceDeTrabajador = obtenerAlcanceDeTrabajadorReal();
if (alcanceDeTrabajador) {
  const entorno: EntornoDelTrabajador = { ceder: crearCederConMessageChannel().ceder, reloj: Date.now };
  alcanceDeTrabajador.onmessage = (evento) => {
    manejarMensaje(evento.data as MensajeUiATrabajador, (mensajeSalida) => alcanceDeTrabajador.postMessage(mensajeSalida), entorno);
  };
}
