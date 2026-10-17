// Lo que muestra el panel de condición (tareas 4.2 y 4.8, REQ-VIS-006): cuando el paso actual evalúa una condición o elige un caso, la cadena de sustitución completa, la rama que corre
// (✓) y la que no (✗, atenuada y NUNCA oculta), las condiciones de un `else if` EN ORDEN, y en un `switch` el `case` igualado, la caída sin `break` y el `default`. Todo sale de los datos de
// la explicación de los pasos que el motor calculó (`Paso.explicacion`); aquí no se evalúa nada. Puro, sin DOM.
import type { ExplicacionPaso, Paso, TipoDeCiclo } from '../motor/vista.ts';
import { textosPaneles } from '../textos/es-MX/paneles.ts';
import { cadenaDeSustitucion } from './sustitucion.ts';

/** Una rama del programa y si corre en este paso. El texto lleva código entre comillas invertidas (la pantalla lo pinta como código). */
export interface Rama {
  readonly texto: string;
  readonly corre: boolean;
}

export interface Evaluacion {
  readonly cadena: readonly string[];
  readonly resultado: boolean;
}

export type CondicionVista =
  | {
      readonly tipo: 'if';
      /** Las condiciones revisadas, en orden: una sola, o la cadena de un `else if` (todas falsas menos, a lo más, la última). La última es la del paso actual. */
      readonly evaluaciones: readonly Evaluacion[];
      readonly ramas: readonly Rama[];
    }
  | {
      readonly tipo: 'ciclo';
      readonly ciclo: TipoDeCiclo;
      readonly cadena: readonly string[];
      readonly resultado: boolean;
      readonly vuelta: number;
      readonly ramas: readonly Rama[];
    }
  | {
      readonly tipo: 'switch';
      /** Lo que mira el `switch` y su valor; `null` en una caída sin `break` (el paso no evalúa nada). */
      readonly cadena: readonly string[] | null;
      readonly filas: readonly Rama[];
    };

type DatosDeIf = Extract<ExplicacionPaso, { clave: 'condicion-if' }>['datos'];

function esIf(paso: Paso): paso is Paso & { readonly explicacion: Extract<ExplicacionPaso, { clave: 'condicion-if' }> } {
  return paso.explicacion.clave === 'condicion-if';
}

function evaluacionDeIf(datos: DatosDeIf): Evaluacion {
  return { cadena: [datos.condicion, ...(datos.sustituida === datos.condicion ? [] : [datos.sustituida]), String(datos.resultado)], resultado: datos.resultado };
}

/** Las condiciones de la cadena `if … else if …` que termina en el último paso: hacia atrás, mientras el paso anterior sea un `if` falso que tenía `else`. */
function evaluacionesDeLaCadena(aplicados: readonly Paso[], datosActuales: DatosDeIf): readonly Evaluacion[] {
  const evaluaciones: Evaluacion[] = [evaluacionDeIf(datosActuales)];
  for (let indice = aplicados.length - 2; indice >= 0; indice -= 1) {
    const previo = aplicados[indice];
    if (previo === undefined || !esIf(previo)) break;
    const datos = previo.explicacion.datos;
    if (datos.resultado || !datos.tieneSino) break;
    evaluaciones.unshift(evaluacionDeIf(datos));
  }
  return evaluaciones;
}

function condicionDeIf(aplicados: readonly Paso[], datos: DatosDeIf): CondicionVista {
  const evaluaciones = evaluacionesDeLaCadena(aplicados, datos);
  const esElseIf = evaluaciones.length > 1;
  const ramas: Rama[] = [{ texto: esElseIf ? textosPaneles.condicion.ramaElseIf(datos.resultado) : textosPaneles.condicion.ramaIf(datos.resultado), corre: datos.resultado }];
  if (datos.tieneSino) ramas.push({ texto: textosPaneles.condicion.ramaElse(!datos.resultado), corre: !datos.resultado });
  return { tipo: 'if', evaluaciones, ramas };
}

function condicionDeCiclo(explicacion: Extract<ExplicacionPaso, { clave: 'condicion-ciclo' }>): CondicionVista {
  const { ciclo, resultado, vuelta } = explicacion.datos;
  const entra = ciclo === 'do-while' ? textosPaneles.condicion.ramaCicloRepite(resultado) : textosPaneles.condicion.ramaCicloEntra(resultado);
  return {
    tipo: 'ciclo',
    ciclo,
    cadena: cadenaDeSustitucion(explicacion) ?? [],
    resultado,
    vuelta,
    ramas: [
      { texto: entra, corre: resultado },
      { texto: textosPaneles.condicion.ramaCicloSale(!resultado), corre: !resultado },
    ],
  };
}

export function derivarCondicion(aplicados: readonly Paso[]): CondicionVista | null {
  const ultimo = aplicados.at(-1);
  if (ultimo === undefined) return null;
  const explicacion = ultimo.explicacion;
  switch (explicacion.clave) {
    case 'condicion-if':
      return condicionDeIf(aplicados, explicacion.datos);
    case 'condicion-ciclo':
      return condicionDeCiclo(explicacion);
    case 'switch-elige-caso':
      return { tipo: 'switch', cadena: [explicacion.datos.expresion, explicacion.datos.valor], filas: [{ texto: textosPaneles.condicion.casoIgualado(explicacion.datos.etiqueta), corre: true }] };
    case 'switch-elige-defecto':
      return { tipo: 'switch', cadena: [explicacion.datos.expresion, explicacion.datos.valor], filas: [{ texto: textosPaneles.condicion.casoPorDefecto(), corre: true }] };
    case 'switch-sin-coincidencia':
      return { tipo: 'switch', cadena: [explicacion.datos.expresion, explicacion.datos.valor], filas: [{ texto: textosPaneles.condicion.sinCoincidencia(), corre: true }] };
    case 'switch-cae':
      return { tipo: 'switch', cadena: null, filas: [{ texto: textosPaneles.condicion.casoCae(explicacion.datos.etiqueta), corre: true }] };
    default:
      return null;
  }
}
