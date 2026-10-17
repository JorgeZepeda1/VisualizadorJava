// El texto que ocupa una expresión en el programa, CON los paréntesis de sus operandos de los extremos (arreglo a del hito 2A). El analizador guarda en cada nodo `rango` (lo de dentro, sin sus
// paréntesis) y aparte `parentesis` (los más externos que lo envuelven, tarea 1.34). Un nodo compuesto —binaria, unaria, cast, asignación, llamada— arma su `rango` del primer al último
// operando con el `rango` de cada uno, así que cuando ese operando de un extremo va entre paréntesis (`a * (b + c)`, `(a + b) * 2`, `(char) (65 + k)`, `("ab" + n).length()`) el rango del
// compuesto se queda sin el `)` o sin el `(`. Esto lo completa SIN tocar el árbol (de él salen también los rangos de los problemas de compilación): sirve para el texto que se le muestra al
// alumno en la explicación de un paso y para el rango de los nodos que la interfaz resalta.
import type { Rango } from '../fuente/rango.ts';
import type { NodoExpresion } from '../sintaxis/ast.ts';

function unir(propio: Rango, inicio: Rango | null, fin: Rango | null): Rango {
  return { inicio: Math.min(propio.inicio, inicio?.inicio ?? propio.inicio), fin: Math.max(propio.fin, fin?.fin ?? propio.fin) };
}

/** El rango de la expresión con todo lo que de verdad se escribió: sus propios paréntesis si los tiene, y si no, los de los operandos que quedan en sus extremos. */
export function rangoTextual(nodo: NodoExpresion): Rango {
  if (nodo.parentesis !== undefined) return nodo.parentesis; // los paréntesis más externos ya envuelven todo lo de dentro
  switch (nodo.tipo) {
    case 'binaria':
      return unir(nodo.rango, rangoTextual(nodo.izquierda), rangoTextual(nodo.derecha));
    case 'asignacion':
      return unir(nodo.rango, rangoTextual(nodo.objetivo), rangoTextual(nodo.valor));
    case 'unaria':
    case 'conversion':
      return unir(nodo.rango, null, rangoTextual(nodo.operando));
    case 'llamada':
      return unir(nodo.rango, rangoTextual(nodo.callee), null);
    case 'acceso-miembro':
      return unir(nodo.rango, rangoTextual(nodo.objeto), null);
    default:
      return nodo.rango; // los literales, los nombres, `++x`/`x--` (su operando es un nombre) y lo no soportado no tienen operandos entre paréntesis en sus extremos
  }
}
