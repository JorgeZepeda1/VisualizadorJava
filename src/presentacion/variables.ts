// Las variables a la vista en un paso (tareas 4.2 y 4.6, REQ-VIS-005, design.md §3.4): nombre, tipo y valor; si cambiaron en este paso, el valor anterior; «sin inicializar»; y las que acaban de salir
// de su bloque. Sale de la instantánea del motor (`Traza.instantaneaEn`: variables a la vista con su valor) y de los dos últimos pasos (qué cambió, qué nodos están a la vista): «salió de
// alcance» es la diferencia entre los nodos de n−1 y n. Puro, sin DOM.
import type { Cambio, InstantaneaDeEjecucion, Paso, TipoIr, VistaPrograma } from '../motor/vista.ts';
import { formatearValor } from './valores.ts';

export type EstadoDeVariable = 'sin-cambio' | 'nueva' | 'cambio';

export interface VariableVista {
  readonly nombre: string;
  readonly tipo: TipoIr;
  /** El valor escrito como Java lo escribe; `null` si la variable existe pero todavía no tiene valor («sin inicializar»). */
  readonly valor: string | null;
  /** El valor de antes del paso, solo si la variable cambió en este paso (`null` si no cambió o si antes estaba sin inicializar). */
  readonly anterior: string | null;
  readonly estado: EstadoDeVariable;
  /** Estaba a la vista en el paso anterior y ya no: el panel la atenúa con una nota. */
  readonly fueraDeAlcance: boolean;
}

export interface EntradaDeVariables {
  readonly instantanea: InstantaneaDeEjecucion;
  /** El último paso aplicado (`null` antes del primero) y el que lo precede (`null` si no hay). */
  readonly ultimo: Paso | null;
  readonly penultimo: Paso | null;
  readonly vista: VistaPrograma;
}

/** El PRIMER cambio de cada variable en el paso: de él sale el valor de antes del paso (un paso puede escribir la misma variable varias veces: `y = y++ + ++y`). */
function primerCambioPorVariable(paso: Paso): ReadonlyMap<string, Cambio> {
  const cambios = new Map<string, Cambio>();
  for (const cambio of paso.cambios ?? []) {
    if (!cambios.has(cambio.ranura)) cambios.set(cambio.ranura, cambio);
  }
  return cambios;
}

function variablesALaVistaEn(paso: Paso | null, vista: VistaPrograma): readonly { readonly nombre: string; readonly tipo: TipoIr }[] {
  if (paso === null) return [];
  const indices = vista.nodos[paso.nodo]?.vivas ?? [];
  return indices.flatMap((indice) => {
    const ranura = vista.ranuras[indice];
    return ranura === undefined ? [] : [{ nombre: ranura.nombre, tipo: ranura.tipo }];
  });
}

export function derivarVariables({ instantanea, ultimo, penultimo, vista }: EntradaDeVariables): readonly VariableVista[] {
  if (ultimo === null) return [];
  const cambios = primerCambioPorVariable(ultimo);

  const actuales = instantanea.variables.map((variable): VariableVista => {
    const cambio = cambios.get(variable.nombre);
    // Una declaración crea la variable (también en cada vuelta de un ciclo): no hay flecha desde la vuelta anterior.
    const estado: EstadoDeVariable = cambio === undefined ? 'sin-cambio' : ultimo.clase === 'declaracion' ? 'nueva' : 'cambio';
    const huboValorAnterior = estado === 'cambio' && cambio?.anterior !== undefined && cambio.anterior !== null;
    return {
      nombre: variable.nombre,
      tipo: variable.tipo,
      valor: variable.valor === null ? null : formatearValor(variable.valor, variable.tipo),
      anterior: huboValorAnterior && cambio?.anterior !== undefined ? formatearValor(cambio.anterior, variable.tipo) : null,
      estado,
      fueraDeAlcance: false,
    };
  });

  const nombresActuales = new Set(actuales.map((variable) => variable.nombre));
  const salieron = variablesALaVistaEn(penultimo, vista)
    .filter((variable) => !nombresActuales.has(variable.nombre))
    .map((variable): VariableVista => ({ ...variable, valor: null, anterior: null, estado: 'sin-cambio', fueraDeAlcance: true }));

  return [...actuales, ...salieron];
}
