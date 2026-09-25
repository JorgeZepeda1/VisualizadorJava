// Traza guardada por la interfaz, fuera de React (ADR 006). Mínima para la rebanada vertical:
// `agregar`/`estadoEn` sin puntos de control (se completan en la tarea 3.1 — hoy `estadoEn`
// reconstruye por recorte directo del arreglo; correcto, pero sin la optimización de checkpoints
// cada 256 pasos de design.md §3.4). `suscribir`/`obtenerVersion` habilitan useSyncExternalStore
// (ADR 013) desde este lote.
import type { Paso } from './paso.ts';

export class Traza {
  private readonly pasos: Paso[] = [];
  private version = 0;
  private readonly oyentes = new Set<() => void>();

  agregar(pasosNuevos: readonly Paso[]): void {
    this.pasos.push(...pasosNuevos);
    this.version += 1;
    for (const oyente of this.oyentes) oyente();
  }

  /** Vacía la traza para una nueva ejecución (p. ej. el alumno vuelve a pulsar "Visualizar") sin
   * crear una instancia nueva — así un `useSyncExternalStore` suscrito a esta traza no necesita
   * volver a suscribirse (design.md §6.1, ADR 013). */
  reiniciar(): void {
    this.pasos.length = 0;
    this.version += 1;
    for (const oyente of this.oyentes) oyente();
  }

  /** Los primeros `pasosCompletados` Paso de la traza. */
  estadoEn(pasosCompletados: number): readonly Paso[] {
    return this.pasos.slice(0, pasosCompletados);
  }

  get total(): number {
    return this.pasos.length;
  }

  suscribir = (oyente: () => void): (() => void) => {
    this.oyentes.add(oyente);
    return () => {
      this.oyentes.delete(oyente);
    };
  };

  obtenerVersion = (): number => this.version;
}
