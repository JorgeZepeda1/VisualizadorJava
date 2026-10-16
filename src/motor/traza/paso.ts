// Contrato de Paso (design.md §3.3), fijado completo desde la rebanada vertical del lote 0. Las tareas 2.17-2.19 llenan sus campos (valores,
// cambios, control, entrada) sin cambiar su forma, y agregan dos: `linea` (la línea del programa que el paso resalta) y `explicacion` (la
// clave y los datos con los que el catálogo es-MX arma la frase del robot, ADR 015). Definición de tipos — se ejercita en traza.test.ts,
// ejecucion.test.ts y compilador.test.ts.
import type { CausaFin, ProblemaArranque } from '../problemas.ts';
import type { ExplicacionPaso } from './explicacion.ts';

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
  /** La variable, por su nombre (Java prohíbe el sombreado, así que no es ambiguo en un mismo momento). */
  readonly ranura: string;
  /** Lo que tenía la variable antes (`undefined` si aún no tenía nada); hace el cambio reversible. */
  readonly anterior: Valor | undefined;
  /** El valor nuevo; `null` cuando la declaración deja la variable existente pero SIN valor (`int x;`). */
  readonly nuevo: Valor | null;
  /** El punto del plan del nodo en el que ocurrió (para efectos a media expresión: `y = y++ + ++y`). */
  readonly punto?: number;
}

export interface Segmento {
  readonly flujo: 'out' | 'err' | 'eco';
  readonly texto: string;
}

export interface FinEjecucion {
  readonly causa: CausaFin;
  /** Solo para quien depure (`error-interno`): el mensaje del fallo. La interfaz nunca lo muestra. */
  readonly detalle?: string;
  /** Presente sii `causa === 'error-arranque'` (tarea 1.15, ADR 004 pasada 5) — el detalle que
   * `crearEjecucion` copia de `ProgramaCompilado.arranque` al reportarlo en el primer `avanzar()`. */
  readonly arranque?: ProblemaArranque;
}

export interface Paso {
  readonly clase: ClasePaso;
  /** El nodo del programa (índice en `VistaPrograma.nodos`) que este paso ejecuta. */
  readonly nodo: number;
  /** La línea (1 en adelante) del programa que este paso resalta. */
  readonly linea: number;
  /** La clave de explicación y sus datos: de aquí sale la frase del robot (catálogo es-MX, ADR 015). */
  readonly explicacion: ExplicacionPaso;
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
