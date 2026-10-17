// Lo que la interfaz conoce del programa compilado (tarea 2.16, design.md §1.2, §3.3): el código, las variables y los nodos a los que apunta
// `Paso.nodo`. Son datos simples —viajan por `postMessage` en el mensaje `compilado`—: sin árbol IR ni funciones. Con ella la presentación
// sabe qué línea resalta cada paso, qué variables están a la vista y qué significa cada posición de `Paso.valores`.
import type { Rango } from '../fuente/rango.ts';
import type { NodoIr, ProgramaIr, RanuraIr } from './ir.ts';

/**
 * Las ramas de un `if` en el código fuente (hito 2A, arreglo d): el editor atenúa la que NO se tomó. `nodo` es el nodo de su condición (el `Paso.nodo` de la revisión del `if`, cuyo
 * `control.resultado` dice si se entró a `entonces`); `entonces` y `sino` son los rangos de las ramas — el bloque con sus llaves, o la sentencia sola si no hay llaves; un `else if` es un
 * `sino` que abarca el `if` siguiente completo (que tiene su propia entrada). `sino` es `null` si el `if` no tiene `else`.
 */
export interface RamasDeIf {
  readonly nodo: number;
  readonly entonces: Rango;
  readonly sino: Rango | null;
}

export interface VistaPrograma {
  readonly fuente: string;
  /** Las variables locales, una ranura por declaración (`Cambio.ranura` nombra la variable por su `nombre`). */
  readonly ranuras: readonly RanuraIr[];
  /** Los nodos del programa, por `id` (el índice): línea, variables vivas y plan de evaluación de cada paso. */
  readonly nodos: readonly NodoIr[];
  /**
   * Las ramas de cada `if`, en el orden del programa (hito 2A). `compilar()` siempre la entrega; es opcional en el TIPO para que quien arme una vista a mano (pruebas de la interfaz)
   * no tenga que inventarla: un consumidor la lee con `vista.ramasDeIf ?? []`.
   */
  readonly ramasDeIf?: readonly RamasDeIf[];
}

export function construirVistaPrograma(ir: ProgramaIr, fuente: string): VistaPrograma {
  return { fuente, ranuras: ir.ranuras, nodos: ir.nodos, ramasDeIf: ir.ramasDeIf };
}
