// Modelo de problemas (design.md §2.2). El catálogo cerrado de `CodigoProblema` y los mensajes en
// español del catálogo (`src/textos/es-MX/problemas.ts`) llegan en la tarea 1.11, sobre las 37+
// filas reales del subconjunto; hasta entonces `CodigoProblema` queda abierto (`string`) porque
// esta rebanada solo necesita un código genérico para el único caso de error que produce
// (`compilador.ts`: cualquier fallo de léxico/sintaxis). Definición de tipos — se ejercita en
// compilador.test.ts.
import type { Rango } from './fuente/rango.ts';

export type Categoria = 'error-compilacion' | 'no-disponible' | 'error-arranque';

// Unión cerrada real desde la tarea 1.11 (design.md §2.2: 'falta-punto-y-coma',
// 'tipos-incompatibles', …). Aquí, `string` — solo se produce 'error-no-clasificado'.
export type CodigoProblema = string;

export interface Problema {
  readonly categoria: Categoria;
  readonly codigo: CodigoProblema;
  readonly codigoJavac?: string;
  readonly rango: Rango;
  readonly linea: number;
  readonly datos: Readonly<Record<string, unknown>>;
}

export type CausaFin =
  | 'terminado'
  | 'excepcion'
  | 'error-arranque'
  | 'no-disponible-en-ejecucion'
  | 'limite-pasos'
  | 'limite-caracteres'
  | 'limite-tiempo'
  | 'error-interno';
