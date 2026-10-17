// Traza guardada por la interfaz, fuera de React (ADR 006, design.md §3.4). Guarda los pasos tal como llegan del trabajador y, cada 256 pasos, un PUNTO DE CONTROL (tarea 3.1): el
// valor de cada variable y cuánta salida había escrito la consola en ese momento. `instantaneaEn(n)` parte del punto de control anterior a `n` y aplica los deltas (los `cambios` de cada
// paso) que haya entre ese punto y `n`: nunca más de 255, así que saltar a cualquier paso de una traza de 100 000 cuesta microsegundos (C11). Siempre hacia adelante, también para ir a un
// paso anterior: deshacer con `Cambio.anterior` no es exacto cuando dos variables comparten nombre (ver `estado.ts`). `estadoEn(n)` devuelve los primeros `n` pasos.
// `suscribir`/`obtenerVersion` habilitan `useSyncExternalStore` (ADR 013).
import type { VistaPrograma } from '../ir/vista-programa.ts';
import { aplicarPaso, variablesALaVista, type InstantaneaDeEjecucion, type ValoresPorNombre } from './estado.ts';
import type { Paso, Segmento, Valor } from './paso.ts';

/** Cada cuántos pasos se guarda un punto de control (design.md §3.4; se ajusta al medir en la tarea 3.8). */
const PASOS_POR_PUNTO_DE_CONTROL = 256;

/** El estado tras `k × 256` pasos: el valor de cada variable y cuántos segmentos de salida llevaba la consola. */
interface PuntoDeControl {
  readonly valores: ReadonlyMap<string, Valor | null>;
  readonly segmentos: number;
}

function segmentosDe(paso: Paso): number {
  return paso.salida?.length ?? 0;
}

export class Traza {
  private readonly pasos: Paso[] = [];
  /** `puntos[k - 1]` es el punto de control tras `k × 256` pasos (el estado tras 0 pasos es el vacío y no se guarda). */
  private readonly puntos: PuntoDeControl[] = [];
  /** El estado tras TODOS los pasos recibidos: de aquí salen los puntos de control sin volver a recorrer nada. */
  private readonly valoresAlFinal: ValoresPorNombre = new Map();
  /** Toda la salida de la consola, en orden; cada punto de control recuerda cuántos de estos segmentos llevaba. */
  private readonly salida: Segmento[] = [];
  private version = 0;
  private readonly oyentes = new Set<() => void>();

  private readonly pasosPorPuntoDeControl: number;

  /** `pasosPorPuntoDeControl`: solo las pruebas lo cambian (con 256, los programas cortos del corpus nunca cruzarían un punto de control). */
  constructor(pasosPorPuntoDeControl: number = PASOS_POR_PUNTO_DE_CONTROL) {
    this.pasosPorPuntoDeControl = pasosPorPuntoDeControl;
  }

  agregar(pasosNuevos: readonly Paso[]): void {
    // Un ciclo y no `push(...pasosNuevos)`: el spread de un arreglo de ~125 000 elementos agota la pila.
    for (const paso of pasosNuevos) {
      this.pasos.push(paso);
      aplicarPaso(this.valoresAlFinal, paso);
      for (const segmento of paso.salida ?? []) this.salida.push(segmento);
      if (this.pasos.length % this.pasosPorPuntoDeControl === 0) {
        this.puntos.push({ valores: new Map(this.valoresAlFinal), segmentos: this.salida.length });
      }
    }
    this.version += 1;
    for (const oyente of this.oyentes) oyente();
  }

  /** Vacía la traza para una nueva ejecución (p. ej. el alumno vuelve a pulsar "Visualizar") sin
   * crear una instancia nueva — así un `useSyncExternalStore` suscrito a esta traza no necesita
   * volver a suscribirse (design.md §6.1, ADR 013). */
  reiniciar(): void {
    this.pasos.length = 0;
    this.puntos.length = 0;
    this.valoresAlFinal.clear();
    this.salida.length = 0;
    this.version += 1;
    for (const oyente of this.oyentes) oyente();
  }

  /** Los primeros `pasosCompletados` Paso de la traza. */
  estadoEn(pasosCompletados: number): readonly Paso[] {
    return this.pasos.slice(0, pasosCompletados);
  }

  /**
   * Lo que se ve tras los primeros `pasosCompletados` pasos: línea, variables a la vista con su valor y salida acumulada. Idéntico a reproducir los pasos desde el principio
   * (`instantaneaEn` de `estado.ts`), pero parte del punto de control anterior.
   */
  instantaneaEn(pasosCompletados: number, vista: VistaPrograma): InstantaneaDeEjecucion {
    const hasta = Math.max(0, Math.min(pasosCompletados, this.pasos.length));
    const ultimo = this.pasos[hasta - 1];
    if (ultimo === undefined) return { paso: 0, linea: null, variables: [], salida: [] };

    // El último punto de control que no pasa de `hasta`, y de ahí se avanza.
    const k = Math.floor(hasta / this.pasosPorPuntoDeControl);
    const punto = k === 0 ? undefined : this.puntos[k - 1];
    const valores: ValoresPorNombre = new Map(punto?.valores);
    let segmentos = punto?.segmentos ?? 0;
    for (let indice = k * this.pasosPorPuntoDeControl; indice < hasta; indice += 1) {
      aplicarPaso(valores, this.pasos[indice]);
      segmentos += segmentosDe(this.pasos[indice]);
    }
    return { paso: hasta, linea: ultimo.linea, variables: variablesALaVista(vista, ultimo, valores), salida: this.salida.slice(0, segmentos) };
  }

  get total(): number {
    return this.pasos.length;
  }

  /** Cuántos puntos de control hay (uno por cada 256 pasos completos, o los que pida el constructor). */
  get puntosDeControl(): number {
    return this.puntos.length;
  }

  suscribir = (oyente: () => void): (() => void) => {
    this.oyentes.add(oyente);
    return () => {
      this.oyentes.delete(oyente);
    };
  };

  obtenerVersion = (): number => this.version;
}
