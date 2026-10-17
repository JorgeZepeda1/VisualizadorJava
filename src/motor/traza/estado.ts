// Reconstruye lo que el alumno ve en un paso a partir de los pasos y de la vista del programa (tareas 2.19 y 3.1, design.md §3.4): la línea resaltada, las variables a la
// vista con su valor (o «sin inicializar») y la salida acumulada. No ejecuta nada: aplica los `cambios` de los pasos (cada uno trae el valor nuevo) y toma como variables a la
// vista las `vivas` del nodo del último paso aplicado, que se derivan del texto del programa (Java prohíbe el sombreado, así que una variable se identifica por su nombre).
// Solo se aplica HACIA ADELANTE: `Cambio.anterior` es el valor de ESA variable, y un nombre que reutiliza una declaración posterior (dos `for` seguidos con `int i`) llegaría con
// `anterior` vacío, así que deshacer perdería el valor que el nombre tenía. Para ir a un paso anterior se parte de un punto de control y se avanza.
//
// `instantaneaEn` de este archivo es la referencia: reproduce los pasos DESDE EL PRINCIPIO. `Traza.instantaneaEn` (tarea 3.1) da lo mismo partiendo de un punto de control
// cada 256 pasos, y una propiedad (`traza.test.ts`) vigila que sean idénticas.
import type { VistaPrograma } from '../ir/vista-programa.ts';
import type { TipoIr } from '../ir/ir.ts';
import type { Paso, Segmento, Valor } from './paso.ts';

export interface VariableDeInstantanea {
  readonly nombre: string;
  readonly tipo: TipoIr;
  /** El valor; `null` si la variable está declarada pero todavía sin inicializar. */
  readonly valor: Valor | null;
}

export interface InstantaneaDeEjecucion {
  /** Cuántos pasos se aplicaron. */
  readonly paso: number;
  /** La línea del último paso aplicado; `null` antes del primero. */
  readonly linea: number | null;
  readonly variables: readonly VariableDeInstantanea[];
  /** Todo lo escrito en la consola (`out`, `err` y el eco de lo tecleado) hasta ese paso. */
  readonly salida: readonly Segmento[];
}

/** El valor de cada variable, por su nombre, en un momento de la ejecución; una variable que no está (o está en `null`) todavía no tiene valor. */
export type ValoresPorNombre = Map<string, Valor | null>;

/** Avanzar un paso: cada cambio escribe su valor nuevo, en el orden en que ocurrieron. */
export function aplicarPaso(valores: ValoresPorNombre, paso: Paso): void {
  for (const cambio of paso.cambios ?? []) valores.set(cambio.ranura, cambio.nuevo);
}

/** Las variables a la vista tras el paso `ultimo`: las `vivas` de su nodo, cada una con su valor (o `null`). */
export function variablesALaVista(vista: VistaPrograma, ultimo: Paso, valores: ValoresPorNombre): VariableDeInstantanea[] {
  const variables: VariableDeInstantanea[] = [];
  for (const indice of vista.nodos[ultimo.nodo]?.vivas ?? []) {
    const ranura = vista.ranuras[indice];
    if (ranura === undefined) continue;
    variables.push({ nombre: ranura.nombre, tipo: ranura.tipo, valor: valores.get(ranura.nombre) ?? null });
  }
  return variables;
}

export function instantaneaEn(pasos: readonly Paso[], vista: VistaPrograma, pasosAplicados: number): InstantaneaDeEjecucion {
  const aplicados = pasos.slice(0, pasosAplicados);
  const ultimo = aplicados[aplicados.length - 1];
  if (ultimo === undefined) return { paso: 0, linea: null, variables: [], salida: [] };

  const valores: ValoresPorNombre = new Map();
  const salida: Segmento[] = [];
  for (const paso of aplicados) {
    aplicarPaso(valores, paso);
    if (paso.salida !== undefined) salida.push(...paso.salida);
  }
  return { paso: aplicados.length, linea: ultimo.linea, variables: variablesALaVista(vista, ultimo, valores), salida };
}
