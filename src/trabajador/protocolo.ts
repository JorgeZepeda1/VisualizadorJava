// Protocolo de mensajes UI↔trabajador (design.md §5, ADR 007). `ejecutar`/`detener` están
// completamente conectados desde esta rebanada vertical; `entrada`/`cerrar-entrada` existen en el
// protocolo pero el trabajador aún no tiene Scanner que les dé datos (llega en la tarea 2.12). El
// trabajador de repuesto y el perro guardián (ADR 007) llegan en el lote 3 — no cambian esta forma
// de mensaje, solo cuándo y cuántos trabajadores hay.
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

export type MensajeTrabajadorAUi =
  | MensajeCompilado
  | MensajePasos
  | MensajeEsperaEntrada
  | MensajeFin
  | MensajeErrorInterno;
