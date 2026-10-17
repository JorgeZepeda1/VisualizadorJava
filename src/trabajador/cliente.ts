// Cliente del trabajador para la interfaz (design.md §5, ADR 007). Es, junto con `protocolo.ts`, lo único de `trabajador/` que `interfaz` puede importar (matriz de capas). En un navegador real
// crea Web Workers de verdad con `trabajador.ts` (nunca ejecuta el motor en el hilo principal), usando el sufijo `?worker` de Vite — NUNCA `new Worker(new URL('./trabajador.ts', import.meta.url))`:
// esa forma tiene un defecto real en Vite 8.3.1/Rolldown (nombra el chunk `trabajador-<hash>.ts` en vez de `.js`; la mayoría de los servidores, incluida GitHub Pages, sirven `.ts` como
// `video/mp2t` y el navegador rechaza cargarlo como módulo — verificado con un build real, tarea 0.15; ver también el comentario en vite.config.ts). Cuando `Worker` no existe (jsdom en pruebas
// de componentes — ADR 013 nota que jsdom no hace layout ni implementa Worker) usa la lógica de `manejarMensaje` en el proceso actual SOLO si alguien registró ese transporte
// (`registrarTransporteEnProceso`; las pruebas de la interfaz lo hacen desde `herramientas/vitest/transporte-en-proceso.ts`): el motor real corre igual, solo cambia el transporte — nunca se
// finge un resultado. Hito 2C: este archivo YA NO importa `trabajador.ts` de forma estática (lo hacía para el respaldo), así que el motor completo no viaja también en el paquete principal de
// la página —se medía ~100 KB con gzip de más—; sin `Worker` y sin transporte registrado, `ejecutar` avisa un error interno en vez de correr el motor en el hilo principal. La detección de
// `Worker` es vía `globalThis` (nunca nombrando `Worker` como global ambiental) para que este archivo compile igual bajo cualquier tsconfig que lo incluya (el suyo propio, sin DOM, y el de
// `interfaz`, con DOM).
//
// Tarea 3.6 (ADR 007): con trabajadores de verdad el cliente
//   - tiene UN trabajador por ejecución y uno de REPUESTO ya cargado (se deja uno al crearse y otro en cuanto el activo manda su primer mensaje): editar o volver a visualizar termina al anterior
//     y usa el repuesto, así que no hay estado viejo que limpiar ni arranque que esperar;
//   - vigila con el PERRO GUARDIÁN (`perro-guardian.ts`): 2 s sin ningún mensaje mientras el trabajador calcula, y lo termina — `terminate()`, el de repuesto queda cargado y la página recibe un `fin`
//     con causa `limite-tiempo`; la traza que ya recibió es de la página y sigue navegable. Si un `detener` no se acusa con `detenido` en 300 ms, lo termina también.
import { crearPerroGuardian } from './perro-guardian.ts';
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

/** Lo que el cliente usa de un `Worker`: estructural, para no nombrar el global del DOM (y para poder inyectar uno de mentira). */
export interface TrabajadorComoDom {
  postMessage(mensaje: unknown): void;
  terminate(): void;
  onmessage: ((evento: { data: unknown }) => void) | null;
  onerror?: ((evento: { message?: string }) => void) | null;
}

export interface OpcionesDelCliente {
  /** Cómo se crea un trabajador. Por omisión, un `Worker` de verdad si existe; las pruebas inyectan uno de mentira. */
  readonly fabricaDeTrabajadores?: () => TrabajadorComoDom;
}

interface ConstructorDeTrabajador {
  new (): TrabajadorComoDom;
}

const ConstructorDeTrabajadorReal = ConstructorDelWorkerDeVite as unknown as ConstructorDeTrabajador;

/** ¿Hay un `Worker` real en este entorno? (nunca nombra `Worker` como global ambiental). */
function hayWorkerReal(): boolean {
  return typeof (globalThis as unknown as { Worker?: unknown }).Worker === 'function';
}

/** Cómo se atiende un mensaje en el proceso actual: la firma de `manejarMensaje` de `trabajador.ts` (su tercer parámetro, el entorno, es opcional). */
export type ManejadorEnProceso = (mensaje: MensajeUiATrabajador, emitir: (mensajeSalida: MensajeTrabajadorAUi) => void) => void;

let transporteEnProceso: ManejadorEnProceso | null = null;

/**
 * Registra (o, con `null`, quita) el transporte en proceso que usan los clientes creados SIN `Worker`. Solo lo registran las pruebas de la interfaz bajo jsdom, que no tiene `Worker`
 * (`herramientas/vitest/transporte-en-proceso.ts`): la página real usa Web Workers, y así `trabajador.ts` y el motor entero no entran al paquete principal.
 */
export function registrarTransporteEnProceso(manejador: ManejadorEnProceso | null): void {
  transporteEnProceso = manejador;
}

export function crearClienteTrabajador(oyentes: OyentesCliente, opciones: OpcionesDelCliente = {}): ClienteTrabajador {
  if (opciones.fabricaDeTrabajadores !== undefined) return crearClienteConTrabajadores(oyentes, opciones.fabricaDeTrabajadores);
  return hayWorkerReal() ? crearClienteConTrabajadores(oyentes, () => new ConstructorDeTrabajadorReal()) : crearClienteEnProceso(oyentes);
}

function describirFallo(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function crearClienteConTrabajadores(oyentes: OyentesCliente, fabrica: () => TrabajadorComoDom): ClienteTrabajador {
  /** El trabajador de la ejecución en curso (o el último que la tuvo), y el que espera cargado para la siguiente. */
  let activo: TrabajadorComoDom | null = null;
  let repuesto: TrabajadorComoDom | null = null;
  /** La ejecución en curso. */
  let idActual: number | null = null;

  const perro = crearPerroGuardian({
    alVencerElSilencio: () => {
      const id = idActual;
      sacrificarAlActivo();
      if (id !== null) oyentes.onMensaje({ tipo: 'fin', id, fin: { causa: 'limite-tiempo' } });
    },
    alVencerElAcuse: () => {
      const id = idActual;
      sacrificarAlActivo();
      if (id !== null) oyentes.onMensaje({ tipo: 'detenido', id });
    },
  });

  function crearTrabajador(): TrabajadorComoDom {
    const trabajador = fabrica();
    trabajador.onmessage = (evento) => recibir(trabajador, evento.data as MensajeTrabajadorAUi);
    trabajador.onerror = (evento) => {
      if (trabajador !== activo || idActual === null) return;
      const id = idActual;
      sacrificarAlActivo();
      oyentes.onMensaje({ tipo: 'error-interno', id, mensaje: evento.message ?? 'el trabajador falló' });
    };
    return trabajador;
  }

  /** Un trabajador de repuesto cargado, si no hay (un fallo al crearlo no es de nadie: se vuelve a intentar al necesitarlo). */
  function asegurarRepuesto(): void {
    if (repuesto !== null) return;
    try {
      repuesto = crearTrabajador();
    } catch {
      repuesto = null;
    }
  }

  function descartarAlActivo(): void {
    perro.descansar();
    perro.acuseRecibido();
    activo?.terminate();
    activo = null;
  }

  /** Termina al trabajador activo (atorado, o que no acusó) y deja listo uno de repuesto para la siguiente ejecución. */
  function sacrificarAlActivo(): void {
    descartarAlActivo();
    idActual = null;
    asegurarRepuesto();
  }

  function recibir(trabajador: TrabajadorComoDom, mensaje: MensajeTrabajadorAUi): void {
    if (trabajador !== activo) return; // un mensaje que ya venía en camino de una ejecución que se terminó
    asegurarRepuesto(); // el activo ya respondió: es buen momento para dejar uno cargado
    perro.latido();
    if (mensaje.tipo === 'espera-entrada' || mensaje.tipo === 'fin' || mensaje.tipo === 'error-interno' || (mensaje.tipo === 'compilado' && !mensaje.ok)) perro.descansar();
    if (mensaje.tipo === 'detenido') {
      perro.acuseRecibido();
      perro.descansar();
    }
    oyentes.onMensaje(mensaje);
  }

  function mandar(id: number, mensaje: MensajeUiATrabajador): boolean {
    if (activo === null || id !== idActual) return false;
    activo.postMessage(mensaje);
    return true;
  }

  try {
    repuesto = crearTrabajador(); // un trabajador cargado desde que se crea el cliente
  } catch {
    repuesto = null; // el fallo, si persiste, se avisa en el primer `ejecutar`
  }

  return {
    ejecutar(id, fuente, config) {
      descartarAlActivo(); // editar o volver a visualizar termina al anterior
      try {
        activo = repuesto ?? crearTrabajador();
        repuesto = null;
      } catch (error) {
        activo = null;
        idActual = null;
        oyentes.onMensaje({ tipo: 'error-interno', id, mensaje: describirFallo(error) });
        return;
      }
      idActual = id;
      activo.postMessage({ tipo: 'ejecutar', id, fuente, config });
      perro.vigilar();
    },
    darEntrada(id, renglon) {
      if (mandar(id, { tipo: 'entrada', id, renglon })) perro.vigilar();
    },
    cerrarEntrada(id) {
      if (mandar(id, { tipo: 'cerrar-entrada', id })) perro.vigilar();
    },
    detener(id) {
      if (mandar(id, { tipo: 'detener', id })) perro.esperarAcuse();
    },
    terminar() {
      descartarAlActivo();
      repuesto?.terminate();
      repuesto = null;
      idActual = null;
    },
  };
}

/**
 * Sin `Worker` (jsdom): el trabajador corre en el proceso actual, de corrido, con el mismo motor —si alguien registró el transporte—. Sin trabajador que atorar, no hay perro guardián. Sin transporte
 * registrado el motor NO corre (nunca en el hilo principal de una página real): `ejecutar` avisa un error interno y `detener` cumple igual con su acuse.
 */
function crearClienteEnProceso(oyentes: OyentesCliente): ClienteTrabajador {
  const enviar = (mensaje: MensajeUiATrabajador): void => {
    if (transporteEnProceso !== null) {
      transporteEnProceso(mensaje, oyentes.onMensaje);
      return;
    }
    if (mensaje.tipo === 'ejecutar') oyentes.onMensaje({ tipo: 'error-interno', id: mensaje.id, mensaje: 'no hay Worker ni transporte en proceso para ejecutar el programa' });
    if (mensaje.tipo === 'detener') oyentes.onMensaje({ tipo: 'detenido', id: mensaje.id });
  };
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
    terminar() {
      // Sin Worker real que terminar: no hay nada que limpiar en el transporte en proceso.
    },
  };
}
