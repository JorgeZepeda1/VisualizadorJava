// Ayudas de las pruebas de la presentación: arman `Paso`, nodos y vistas de programa a mano, sin pasar por el motor, para que cada prueba diga SOLO lo que le importa. Las pruebas
// que necesitan el motor de verdad (trazas reales de programas del corpus) viven en `pruebas/traza/`, que sí puede importarlo. Archivo de apoyo: no se importa desde el código de producción.
import type { ClasePaso, ExplicacionPaso, NodoIr, Paso, RanuraIr, VistaPrograma } from '../motor/vista.ts';

/** Un `Paso` con valores por omisión sensatos: lo que la prueba no menciona no estorba (explicación de sentencia vacía, nodo 0, línea 1). */
export function paso(parcial: Partial<Paso> & { readonly clase: ClasePaso }): Paso {
  const explicacion: ExplicacionPaso = { clave: 'vacia', datos: {} };
  return { nodo: 0, linea: 1, explicacion, ...parcial };
}

/** Un nodo del programa: solo `id`, `clase`, `linea`, `vivas` y `rango` importan para la presentación. */
export function nodo(id: number, parcial: Partial<NodoIr> = {}): NodoIr {
  return { id, clase: 'expresion', rango: { inicio: 0, fin: 0 }, linea: 1, vivas: [], plan: [], ...parcial };
}

export function ranura(indice: number, nombre: string, tipo: RanuraIr['tipo'] = 'int'): RanuraIr {
  return { indice, nombre, tipo, nodo: 0, esFinal: false };
}

export function vistaDePrueba(nodos: readonly NodoIr[], ranuras: readonly RanuraIr[] = []): VistaPrograma {
  return { fuente: '', nodos, ranuras };
}
