// El modelo de vista (tarea 4.2, REQ-VIS-006, REQ-VIS-011, design.md §6.1, ADR 013): TODO lo que la pantalla necesita para dibujar un paso, derivado de la traza sin tocar el DOM —las líneas recién
// ejecutada y siguiente, las variables vivas, la cadena de sustitución, el panel de condición, las vueltas, la consola, el búfer y lo que dice el robot—. Los componentes presentacionales solo
// reciben esto por `props`; la `Traza` vive fuera de React y el contenedor le pide `estadoEn`/`instantaneaEn` para armar la entrada. Puro, sin DOM, y NUNCA calcula lo que el motor ya calculó:
// compone los datos de los pasos.
import type { InstantaneaDeEjecucion, Paso, Segmento, VistaPrograma } from '../motor/vista.ts';
import { derivarBufer, type BuferVista } from './bufer.ts';
import { derivarCondicion, type CondicionVista } from './condicion.ts';
import { derivarRobot, type EstadoDeLaEjecucion, type RobotVista } from './robot.ts';
import { cadenaDeSustitucion } from './sustitucion.ts';
import { derivarVariables, type VariableVista } from './variables.ts';
import { derivarVueltas, type VueltaVista } from './vueltas.ts';

export interface EntradaModeloVista {
  readonly vista: VistaPrograma | null;
  /** Los primeros `paso` pasos de la traza (`Traza.estadoEn(paso)`): el último es el recién ejecutado. */
  readonly aplicados: readonly Paso[];
  /** El paso que sigue al último aplicado, si el motor ya lo calculó (`null` si el último es el último de la traza hasta ahora). */
  readonly siguiente: Paso | null;
  readonly instantanea: InstantaneaDeEjecucion;
  /** Cuántos pasos tiene la traza hasta ahora. */
  readonly total: number;
  readonly ejecucion: EstadoDeLaEjecucion;
}

export interface ModeloVista {
  readonly paso: number;
  readonly total: number;
  readonly lineas: { readonly ejecutada: number | null; readonly siguiente: number | null };
  readonly variables: readonly VariableVista[];
  readonly cadena: readonly string[] | null;
  readonly condicion: CondicionVista | null;
  readonly vueltas: readonly VueltaVista[];
  readonly consola: readonly Segmento[];
  readonly bufer: BuferVista | null;
  readonly robot: RobotVista;
  /** ¿El programa espera un dato Y la pantalla está en el último paso? Solo entonces la consola muestra el campo de entrada. */
  readonly esperandoEntrada: boolean;
}

export function derivarModeloVista(entrada: EntradaModeloVista): ModeloVista {
  const { vista, aplicados, siguiente, instantanea, total, ejecucion } = entrada;
  const paso = aplicados.length;
  const ultimo = aplicados.at(-1) ?? null;
  const penultimo = aplicados.at(-2) ?? null;
  const esperandoEntrada = ejecucion.estado === 'esperando-entrada' && paso === total;
  const lineaDeLaLectura = esperandoEntrada ? (vista?.nodos[ejecucion.nodo]?.linea ?? null) : null;

  return {
    paso,
    total,
    lineas: { ejecutada: ultimo?.linea ?? null, siguiente: siguiente?.linea ?? lineaDeLaLectura },
    variables: vista === null ? [] : derivarVariables({ instantanea, ultimo, penultimo, vista }),
    cadena: ultimo === null ? null : cadenaDeSustitucion(ultimo.explicacion),
    condicion: derivarCondicion(aplicados),
    vueltas: vista === null ? [] : derivarVueltas(aplicados, vista),
    consola: instantanea.salida,
    bufer: derivarBufer(aplicados),
    robot: derivarRobot({ ejecucion, aplicados, siguiente, total, vista }),
    esperandoEntrada,
  };
}
