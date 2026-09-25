// Trabajador (Web Worker) de la rebanada vertical (design.md §5, ADR 007). `manejarMensaje`
// contiene toda la lógica real y es lo que prueba trabajador.test.ts directamente, sin un Worker
// de verdad. El cableado de más abajo detecta en RUNTIME (vía `globalThis`, nunca nombrando `self`
// como global ambiental) si este módulo corre dentro de un worker real — nunca bajo Vitest/Node,
// nunca en el hilo principal — y solo entonces conecta postMessage/onmessage. Se detecta así (no
// con `declare const self`) para que este archivo compile igual bajo cualquier tsconfig que lo
// incluya transitivamente (p. ej. `interfaz`, vía `cliente.ts`, con lib DOM y sin lib WebWorker).
// El trabajador de repuesto y el perro guardián (ADR 007) llegan en el lote 3.
import { compilar, crearEjecucion, type Ejecucion } from '../motor/index.ts';
import type { MensajeTrabajadorAUi, MensajeUiATrabajador } from './protocolo.ts';

const ejecucionesActivas = new Map<number, Ejecucion>();

export function manejarMensaje(
  mensaje: MensajeUiATrabajador,
  emitir: (mensajeSalida: MensajeTrabajadorAUi) => void,
): void {
  switch (mensaje.tipo) {
    case 'ejecutar': {
      const resultado = compilar(mensaje.fuente);
      if (!resultado.ok) {
        emitir({
          tipo: 'compilado',
          id: mensaje.id,
          ok: false,
          problema: resultado.problema,
          adicionales: resultado.adicionales,
        });
        return;
      }
      emitir({ tipo: 'compilado', id: mensaje.id, ok: true, vista: resultado.vista });
      const ejecucion = crearEjecucion(resultado.programa, mensaje.config);
      ejecucionesActivas.set(mensaje.id, ejecucion);
      avanzarYEmitir(mensaje.id, ejecucion, emitir);
      return;
    }
    case 'entrada': {
      const ejecucion = ejecucionesActivas.get(mensaje.id);
      if (!ejecucion) return;
      ejecucion.darEntrada(mensaje.renglon);
      avanzarYEmitir(mensaje.id, ejecucion, emitir);
      return;
    }
    case 'cerrar-entrada': {
      ejecucionesActivas.get(mensaje.id)?.cerrarEntrada();
      return;
    }
    case 'detener': {
      ejecucionesActivas.delete(mensaje.id);
      return;
    }
  }
}

function avanzarYEmitir(
  id: number,
  ejecucion: Ejecucion,
  emitir: (mensajeSalida: MensajeTrabajadorAUi) => void,
): void {
  let desde = 0;
  for (;;) {
    const avance = ejecucion.avanzar(2000);
    if (avance.pasos.length > 0) {
      emitir({ tipo: 'pasos', id, desde, pasos: avance.pasos });
      desde += avance.pasos.length;
    }
    if (avance.estado === 'fin') {
      ejecucionesActivas.delete(id);
      emitir({ tipo: 'fin', id, fin: avance.fin });
      return;
    }
    if (avance.estado === 'espera-entrada') {
      emitir({ tipo: 'espera-entrada', id, nodo: avance.nodo });
      return;
    }
    // 'continua': los programas de esta rebanada vertical nunca superan un lote de 2000 pasos.
    // El lote 3 sustituye este bucle por rebanadas cooperativas de ≤8ms con MessageChannel
    // (ADR 007, design.md §5) para programas largos.
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
  const esWorkerReal =
    posibleAlcance !== undefined &&
    typeof posibleAlcance.postMessage === 'function' &&
    global.window === undefined;
  return esWorkerReal ? (posibleAlcance as AlcanceDeTrabajador) : undefined;
}

const alcanceDeTrabajador = obtenerAlcanceDeTrabajadorReal();
if (alcanceDeTrabajador) {
  alcanceDeTrabajador.onmessage = (evento) => {
    manejarMensaje(evento.data as MensajeUiATrabajador, (mensajeSalida) =>
      alcanceDeTrabajador.postMessage(mensajeSalida),
    );
  };
}
