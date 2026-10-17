// Protocolo de mensajes UI↔trabajador (design.md §5, ADR 007), completo desde la tarea 3.5. UI → trabajador: `ejecutar`, `entrada`, `cerrar-entrada`, `detener`. Trabajador → UI: `compilado`, `pasos`
// (lotes de ≤ 2 000, con el `desde` de cada uno), `espera-entrada`, `fin`, `error-interno` y `detenido` (el acuse de `detener`, que el perro guardián del cliente espera 300 ms). Todos llevan el `id`
// de la ejecución. Viajan por clonación estructurada: solo datos simples (conserva `BigInt`, `-0` y `NaN`).
import type { ConfigEjecucion, FinEjecucion, Paso, Problema, VistaPrograma } from '../motor/index.ts';

// Re-exportado para que `cliente.ts`/`interfaz` obtengan el tipo sin importar `motor/index.ts`
// directamente — la matriz de capas solo permite `motor/vista` desde `interfaz`
// (herramientas/eslint/matriz-capas.ts); `ConfigEjecucion` vive en `interprete/ejecucion`, fuera
// de `vista.ts`.
export type { ConfigEjecucion } from '../motor/index.ts';

export interface MensajeEjecutar {
  readonly tipo: 'ejecutar';
  readonly id: number;
  readonly fuente: string;
  readonly config: ConfigEjecucion;
}

export interface MensajeEntrada {
  readonly tipo: 'entrada';
  readonly id: number;
  readonly renglon: string;
}

export interface MensajeCerrarEntrada {
  readonly tipo: 'cerrar-entrada';
  readonly id: number;
}

export interface MensajeDetener {
  readonly tipo: 'detener';
  readonly id: number;
}

export type MensajeUiATrabajador =
  | MensajeEjecutar
  | MensajeEntrada
  | MensajeCerrarEntrada
  | MensajeDetener;

export type MensajeCompilado =
  | { readonly tipo: 'compilado'; readonly id: number; readonly ok: true; readonly vista: VistaPrograma }
  | {
      readonly tipo: 'compilado';
      readonly id: number;
      readonly ok: false;
      readonly problema: Problema;
      readonly adicionales: number;
    };

export interface MensajePasos {
  readonly tipo: 'pasos';
  readonly id: number;
  readonly desde: number;
  readonly pasos: readonly Paso[];
}

export interface MensajeEsperaEntrada {
  readonly tipo: 'espera-entrada';
  readonly id: number;
  readonly nodo: number;
}

export interface MensajeFin {
  readonly tipo: 'fin';
  readonly id: number;
  readonly fin: FinEjecucion;
}

export interface MensajeErrorInterno {
  readonly tipo: 'error-interno';
  readonly id: number;
  readonly mensaje: string;
}

/** El acuse de `detener` (tarea 3.5): el trabajador dejó de correr esa ejecución. Si no llega en 300 ms, el cliente termina el trabajador (perro guardián, tarea 3.6). */
export interface MensajeDetenido {
  readonly tipo: 'detenido';
  readonly id: number;
}

export type MensajeTrabajadorAUi =
  | MensajeCompilado
  | MensajePasos
  | MensajeEsperaEntrada
  | MensajeFin
  | MensajeErrorInterno
  | MensajeDetenido;
