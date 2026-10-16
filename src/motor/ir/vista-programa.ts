// Lo que la interfaz conoce del programa compilado (tarea 2.16, design.md §1.2, §3.3): el código, las variables y los nodos a los que apunta
// `Paso.nodo`. Son datos simples —viajan por `postMessage` en el mensaje `compilado`—: sin árbol IR ni funciones. Con ella la presentación
// sabe qué línea resalta cada paso, qué variables están a la vista y qué significa cada posición de `Paso.valores`.
import type { NodoIr, ProgramaIr, RanuraIr } from './ir.ts';

export interface VistaPrograma {
  readonly fuente: string;
  /** Las variables locales, una ranura por declaración (`Cambio.ranura` nombra la variable por su `nombre`). */
  readonly ranuras: readonly RanuraIr[];
  /** Los nodos del programa, por `id` (el índice): línea, variables vivas y plan de evaluación de cada paso. */
  readonly nodos: readonly NodoIr[];
}

export function construirVistaPrograma(ir: ProgramaIr, fuente: string): VistaPrograma {
  return { fuente, ranuras: ir.ranuras, nodos: ir.nodos };
}
