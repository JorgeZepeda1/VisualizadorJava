// Reconstruye lo que el alumno ve en un paso a partir de los pasos y de la vista del programa (tarea 2.19, design.md §3.4): la línea resaltada, las variables a
// la vista con su valor (o «sin inicializar») y la salida acumulada. No ejecuta nada: aplica los `cambios` de los primeros `n` pasos (cada uno trae el valor
// nuevo) y toma como variables a la vista las `vivas` del nodo del último paso aplicado, que se derivan del texto del programa (Java prohíbe el sombreado,
// así que una variable se identifica por su nombre). El punto de control cada 256 pasos de la tarea 3.1 lo acelera; el resultado es el mismo.
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

export function instantaneaEn(pasos: readonly Paso[], vista: VistaPrograma, pasosAplicados: number): InstantaneaDeEjecucion {
  const aplicados = pasos.slice(0, pasosAplicados);
  const ultimo = aplicados[aplicados.length - 1];
  if (ultimo === undefined) return { paso: 0, linea: null, variables: [], salida: [] };

  const valores = new Map<string, Valor | null>();
  const salida: Segmento[] = [];
  for (const paso of aplicados) {
    for (const cambio of paso.cambios ?? []) valores.set(cambio.ranura, cambio.nuevo);
    if (paso.salida !== undefined) salida.push(...paso.salida);
  }

  const variables: VariableDeInstantanea[] = [];
  for (const indice of vista.nodos[ultimo.nodo]?.vivas ?? []) {
    const ranura = vista.ranuras[indice];
    if (ranura === undefined) continue;
    variables.push({ nombre: ranura.nombre, tipo: ranura.tipo, valor: valores.get(ranura.nombre) ?? null });
  }
  return { paso: aplicados.length, linea: ultimo.linea, variables, salida };
}
