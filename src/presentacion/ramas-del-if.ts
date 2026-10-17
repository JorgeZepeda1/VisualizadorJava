// La rama del `if` que NO se toma (resto de la tarea 4.4, REQ-VIS-006, hito 2C): en el paso de la condición de un `if`, el editor atenúa —nunca oculta— el tramo de código que el programa se salta.
// Todo sale de lo que el motor ya calculó: el resultado de la condición (`Paso.explicacion.datos.resultado`) y los rangos de las ramas de cada `if` (`VistaPrograma.ramasDeIf`, que se empata con el
// paso por el nodo de la condición); aquí no se evalúa nada. Un `else if` es un `sino` que abarca el `if` siguiente completo, así que con la primera condición verdadera se atenúa todo ese `if`.
// Puro, sin DOM.
import type { Paso, Rango, VistaPrograma } from '../motor/vista.ts';

/** El rango del código que el programa se salta en este paso, o `null` si el paso no es la condición de un `if` o no hay rama que se salte (un `if` verdadero sin `else`). */
export function ramaNoTomada(ultimo: Paso | null, vista: VistaPrograma | null): Rango | null {
  if (ultimo === null || vista === null) return null;
  const { explicacion } = ultimo;
  if (explicacion.clave !== 'condicion-if') return null;
  const ramas = (vista.ramasDeIf ?? []).find((delIf) => delIf.nodo === ultimo.nodo);
  if (ramas === undefined) return null;
  return explicacion.datos.resultado ? ramas.sino : ramas.entonces;
}
