// El contador de vueltas (tareas 4.4 y 4.9, REQ-VIS-007): el número de vuelta de cada ciclo activo en el paso actual, por separado cuando hay anidamiento. Un ciclo está activo mientras el nodo del
// paso cae dentro de su rango (`NodoIr.rango`); su vuelta sale de la última revisión de su condición que el motor registró EN ESTA ejecución del ciclo (`Paso.control.vuelta`, `Paso.control.ciclo`).
// Se recorren los pasos hacia adelante y un ciclo se olvida en cuanto un paso queda fuera de su rango —por su condición falsa, por un `break` o por un `return`—: así un ciclo interno que vuelve a
// empezar cuenta desde cero y nunca arrastra la cuenta de su ejecución anterior. Puro, sin DOM.
import type { NodoIr, Paso, VistaPrograma } from '../motor/vista.ts';
import { textosPaneles } from '../textos/es-MX/paneles.ts';

export interface VueltaVista {
  /** «ciclo», «ciclo externo», «ciclo interno»… según cuántos ciclos hay activos a la vez. */
  readonly nombre: string;
  /** Las vueltas del ciclo en este paso (en la revisión que lo hace salir, las que alcanzó a completar). */
  readonly vuelta: number;
  /** ¿Este es el paso en que el ciclo termina? */
  readonly termino: boolean;
  /** El nodo del ciclo (`NodoIr.id`): de él sale su línea para poner la etiqueta junto a su encabezado. */
  readonly nodoDelCiclo: number;
}

interface RevisionDelCiclo {
  /** Cuántas veces se revisó la condición en esta ejecución del ciclo (`control.vuelta` de la última revisión; 0 si todavía ninguna). */
  readonly revisiones: number;
  /** El resultado de la última revisión (`null` si todavía ninguna). */
  readonly resultado: boolean | null;
}

function esCiclo(nodo: NodoIr): boolean {
  return nodo.clase === 'while' || nodo.clase === 'for' || nodo.clase === 'do-while';
}

function contiene(externo: NodoIr, interno: NodoIr): boolean {
  return externo.rango.inicio <= interno.rango.inicio && interno.rango.fin <= externo.rango.fin;
}

/** ¿Es `paso` la revisión de la condición de `ciclo`? */
function esRevisionDe(paso: Paso, ciclo: NodoIr): boolean {
  return paso.clase === 'condicion-ciclo' && paso.control?.ciclo === ciclo.id;
}

function vueltaDe(ciclo: NodoIr, revision: RevisionDelCiclo, ultimo: Paso): Omit<VueltaVista, 'nombre'> {
  const nodoDelCiclo = ciclo.id;
  if (ciclo.clase === 'do-while') {
    // El cuerpo corre ANTES de la primera revisión: durante él ya es la vuelta siguiente a las revisiones hechas.
    const enLaRevision = esRevisionDe(ultimo, ciclo);
    const termino = enLaRevision && revision.resultado === false;
    return { vuelta: enLaRevision ? revision.revisiones : revision.revisiones + 1, termino, nodoDelCiclo };
  }
  // while y for: la revisión que sale del ciclo cuenta una vuelta de más (la que se revisa y no se da).
  const termino = revision.resultado === false;
  return { vuelta: termino ? revision.revisiones - 1 : revision.revisiones, termino, nodoDelCiclo };
}

export function derivarVueltas(aplicados: readonly Paso[], vista: VistaPrograma): readonly VueltaVista[] {
  const ultimo = aplicados.at(-1);
  const ciclos = vista.nodos.filter(esCiclo);
  if (ultimo === undefined || ciclos.length === 0) return [];

  const activos = new Map<number, RevisionDelCiclo>();
  for (const paso of aplicados) {
    const nodoDelPaso = vista.nodos[paso.nodo];
    for (const ciclo of ciclos) {
      if (nodoDelPaso === undefined || !contiene(ciclo, nodoDelPaso)) {
        activos.delete(ciclo.id);
      } else if (ciclo.clase === 'do-while' && !activos.has(ciclo.id)) {
        activos.set(ciclo.id, { revisiones: 0, resultado: null });
      }
    }
    const control = paso.control;
    if (paso.clase === 'condicion-ciclo' && control?.ciclo !== undefined && control.vuelta !== undefined) {
      activos.set(control.ciclo, { revisiones: control.vuelta, resultado: control.resultado ?? null });
    }
  }

  const enCurso = ciclos.filter((ciclo) => activos.has(ciclo.id)).sort((a, b) => a.rango.inicio - b.rango.inicio);
  return enCurso.map((ciclo, nivel) => {
    const revision = activos.get(ciclo.id) as RevisionDelCiclo;
    return { nombre: textosPaneles.vueltas.nombreDelCiclo(nivel, enCurso.length), ...vueltaDe(ciclo, revision, ultimo) };
  });
}
