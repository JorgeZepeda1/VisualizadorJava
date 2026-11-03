// El modelo de vista (tarea 4.2, REQ-VIS-006, REQ-VIS-011, design.md §6.1, ADR 013): TODO lo que la pantalla necesita para dibujar un paso, derivado de la traza sin tocar el DOM —las líneas recién
// ejecutada y siguiente, las variables vivas, la cadena de sustitución, el panel de condición, las vueltas, la consola, el búfer y lo que dice el robot—. Los componentes presentacionales solo
// reciben esto por `props`; la `Traza` vive fuera de React y el contenedor le pide `estadoEn`/`instantaneaEn` para armar la entrada. Puro, sin DOM, y NUNCA calcula lo que el motor ya calculó:
// compone los datos de los pasos.
import type { InstantaneaDeEjecucion, Paso, Rango, Segmento, VistaPrograma } from '../motor/vista.ts';
import { derivarBufer, type BuferVista } from './bufer.ts';
import { derivarCondicion, type CondicionVista } from './condicion.ts';
import { datosDeLaEntrada } from './galeria.ts';
import { derivarHablante, type Hablante } from './hablante.ts';
import { derivarRanura, type Ranura } from './ranura.ts';
import { ramaNoTomada } from './ramas-del-if.ts';
import { derivarRobot, type EstadoDeLaEjecucion, type RobotVista } from './robot.ts';
import type { Seccion } from './secciones.ts';
import { cadenaDeSustitucion } from './sustitucion.ts';
import { derivarVariables, type VariableVista } from './variables.ts';
import { derivarVueltas, type VueltaVista } from './vueltas.ts';

/** Lo que el modelo necesita saber de la pantalla, además de la traza (REQ-PANT-001 a 009): en qué sección está el alumno y si hay un problema vigente en el globo. Todo opcional: por omisión, el paso a paso sin problemas. */
export interface ContextoDePantalla {
  readonly seccion: Seccion;
  /** ¿Hay en el globo un problema vigente al revisar el programa (error de compilación, aviso de «no disponible», error de arranque o falla del visualizador)? */
  readonly hayProblema: boolean;
  /** ¿Hay al menos un tema del libro publicado? De eso depende que aparezcan la puerta «Leer un tema» y la sección «Libro» (PQ-2). */
  readonly hayTemasPublicados: boolean;
}

/** El indicador de posición (REQ-PANT-004): `total` solo cuando el programa terminó; mientras el motor calcula o si se detuvo por seguridad, `null` (solo se dice el paso actual). */
export interface PosicionVista {
  readonly paso: number;
  readonly total: number | null;
}

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
  readonly pantalla?: Partial<ContextoDePantalla>;
  /** La entrada preparada del programa abierto (renglones con su salto de línea): el paso 0 nombra sus datos (V7, panel R0). Vacía o ausente, el programa no trae datos. */
  readonly entradaPreparada?: string;
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
  /** Quién habla en el globo (REQ-PANT-009): uno solo, siempre en la misma ranura. */
  readonly hablante: Hablante;
  /** Lo que hay bajo el globo: las puertas del saludo, «Anterior · Siguiente» o las acciones del fin (REQ-PANT-003). Una sola cosa a la vez. */
  readonly ranura: Ranura;
  readonly posicion: PosicionVista;
  /** El tramo del código que el programa se salta en este paso (la rama del `if` que no se toma), o `null` si el paso no es la condición de un `if` (hito 2C). */
  readonly ramaNoTomada: Rango | null;
  /** ¿El programa espera un dato Y la pantalla está en el último paso? Solo entonces la consola muestra el campo de entrada. */
  readonly esperandoEntrada: boolean;
}

/** El total de pasos solo se sabe cuando el programa terminó por sí solo (bien o con una excepción); un límite del visualizador, una espera o un cálculo en curso dejan solo una cifra provisional. */
function totalConocido(ejecucion: EstadoDeLaEjecucion, total: number): number | null {
  if (ejecucion.estado !== 'terminada') return null;
  return ejecucion.fin.causa === 'terminado' || ejecucion.fin.causa === 'excepcion' ? total : null;
}

export function derivarModeloVista(entrada: EntradaModeloVista): ModeloVista {
  const { vista, aplicados, siguiente, instantanea, total, ejecucion, entradaPreparada = '' } = entrada;
  const { seccion = 'paso-a-paso', hayProblema = false, hayTemasPublicados = false } = entrada.pantalla ?? {};
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
    robot: derivarRobot({ ejecucion, aplicados, siguiente, total, vista, datosPreparados: datosDeLaEntrada(entradaPreparada) }),
    hablante: derivarHablante({ seccion, hayProblema }),
    ranura: derivarRanura({ ejecucion, paso, total, hayTemasPublicados, leeDatos: aplicados.some((aplicado) => aplicado.entrada !== undefined) }),
    posicion: { paso, total: totalConocido(ejecucion, total) },
    ramaNoTomada: ramaNoTomada(ultimo, vista),
    esperandoEntrada,
  };
}
