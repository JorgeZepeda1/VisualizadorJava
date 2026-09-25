// Contrato de Paso (design.md §3.3), fijado completo desde la rebanada vertical del lote 0 aunque
// el intérprete mínimo de esta tarea solo produzca la clase 'impresion' con 'salida': el resto de
// campos (valores, cambios, control, entrada) los llenan las tareas 2.17-2.19 sin cambiar la
// forma. Definición de tipos — se ejercita en traza.test.ts, ejecucion.test.ts y compilador.test.ts.
import type { CausaFin } from '../problemas.ts';

export type ClasePaso =
  | 'declaracion'
  | 'asignacion'
  | 'expresion'
  | 'impresion'
  | 'condicion-if'
  | 'condicion-ciclo'
  | 'seleccion-switch'
  | 'caida-switch'
  | 'break'
  | 'continue'
  | 'return'
  | 'vacia'
  | 'excepcion'
  | 'detenido'
  | 'fin';

export type Valor =
  | number
  | bigint
  | boolean
  | string
  | { readonly objeto: 'Scanner' }
  | { readonly objeto: 'Random' };

export interface Cambio {
  readonly ranura: string;
  readonly anterior: Valor | undefined;
  readonly nuevo: Valor;
  readonly punto?: number;
}

export interface Segmento {
  readonly flujo: 'out' | 'err' | 'eco';
  readonly texto: string;
}

export interface FinEjecucion {
  readonly causa: CausaFin;
}

export interface Paso {
  readonly clase: ClasePaso;
  readonly nodo: number;
  readonly valores?: readonly (Valor | null)[];
  readonly cambios?: readonly Cambio[];
  readonly salida?: readonly Segmento[];
  readonly entrada?: { readonly cursor: number; readonly agregado?: string };
  readonly control?: {
    readonly resultado?: boolean;
    readonly vuelta?: number;
    readonly ciclo?: number;
    readonly caso?: number;
    readonly predecible?: true;
  };
  readonly fin?: FinEjecucion;
}
