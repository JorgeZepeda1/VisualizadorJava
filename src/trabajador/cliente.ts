// Cliente del trabajador para la interfaz (design.md §5, ADR 007). Es, junto con `protocolo.ts`,
// lo único de `trabajador/` que `interfaz` puede importar (matriz de capas). En un navegador real
// crea un Web Worker de verdad con `trabajador.ts` (nunca ejecuta el motor en el hilo principal),
// usando el sufijo `?worker` de Vite — NUNCA `new Worker(new URL('./trabajador.ts', import.meta.url))`:
// esa forma tiene un defecto real en Vite 8.3.1/Rolldown (nombra el chunk `trabajador-<hash>.ts`
// en vez de `.js`; la mayoría de los servidores, incluida GitHub Pages, sirven `.ts` como
// `video/mp2t` y el navegador rechaza cargarlo como módulo — verificado con un build real, tarea
// 0.15; ver también el comentario en vite.config.ts). Cuando `Worker` no existe (jsdom en pruebas
// de componentes — ADR 013 nota que jsdom no hace layout ni implementa Worker) usa la MISMA lógica
// de `manejarMensaje` en el proceso actual: el motor real corre igual, solo cambia el transporte —
// nunca se finge un resultado. La detección de `Worker` es vía `globalThis` (nunca nombrando
// `Worker` como global ambiental) para que este archivo compile igual bajo cualquier tsconfig que
// lo incluya (el suyo propio, sin DOM, y el de `interfaz`, con DOM). El trabajador de repuesto y el
// perro guardián (ADR 007) llegan en el lote 3 — aquí hay un trabajador por ejecución, sin repuesto.
import { manejarMensaje } from './trabajador.ts';
import type { ConfigEjecucion, MensajeTrabajadorAUi, MensajeUiATrabajador } from './protocolo.ts';
// El tipo que infiere Vite para este import (`vite/client`) nombra el global `Worker` del DOM, que
// no existe en el tsconfig de esta capa (sin lib DOM) — se recasta abajo a `ConstructorDeTrabajador`
// (estructural, propio) en vez de dejar que ese tipo se propague.
import ConstructorDelWorkerDeVite from './trabajador.ts?worker';

export interface OyentesCliente {
  readonly onMensaje: (mensaje: MensajeTrabajadorAUi) => void;
}

export interface ClienteTrabajador {
  ejecutar(id: number, fuente: string, config: ConfigEjecucion): void;
  darEntrada(id: number, renglon: string): void;
  cerrarEntrada(id: number): void;
  detener(id: number): void;
  terminar(): void;
}

interface TrabajadorComoDom {
  postMessage(mensaje: unknown): void;
  terminate(): void;
  onmessage: ((evento: { data: unknown }) => void) | null;
}

interface ConstructorDeTrabajador {
  new (): TrabajadorComoDom;
}

const ConstructorDeTrabajadorReal =
  ConstructorDelWorkerDeVite as unknown as ConstructorDeTrabajador;

/** ¿Hay un `Worker` real en este entorno? (nunca nombra `Worker` como global ambiental). */
function hayWorkerReal(): boolean {
  return typeof (globalThis as unknown as { Worker?: unknown }).Worker === 'function';
}

export function crearClienteTrabajador(oyentes: OyentesCliente): ClienteTrabajador {
  return hayWorkerReal() ? crearClienteConWorkerReal(oyentes) : crearClienteEnProceso(oyentes);
}

function crearClienteConWorkerReal(oyentes: OyentesCliente): ClienteTrabajador {
  const worker = new ConstructorDeTrabajadorReal();
  worker.onmessage = (evento) => oyentes.onMensaje(evento.data as MensajeTrabajadorAUi);
  const enviar = (mensaje: MensajeUiATrabajador): void => worker.postMessage(mensaje);
  return construirApi(enviar, () => worker.terminate());
}

function crearClienteEnProceso(oyentes: OyentesCliente): ClienteTrabajador {
  const enviar = (mensaje: MensajeUiATrabajador): void => {
    manejarMensaje(mensaje, oyentes.onMensaje);
  };
  return construirApi(enviar, () => {
    // Sin Worker real que terminar: no hay nada que limpiar en el transporte en proceso.
  });
}

function construirApi(
  enviar: (mensaje: MensajeUiATrabajador) => void,
  terminar: () => void,
): ClienteTrabajador {
  return {
    ejecutar(id, fuente, config) {
      enviar({ tipo: 'ejecutar', id, fuente, config });
    },
    darEntrada(id, renglon) {
      enviar({ tipo: 'entrada', id, renglon });
    },
    cerrarEntrada(id) {
      enviar({ tipo: 'cerrar-entrada', id });
    },
    detener(id) {
      enviar({ tipo: 'detener', id });
    },
    terminar,
  };
}
