// Qué dice el robot y cómo se ve en cada momento (tarea 4.11, REQ-VIS-011, ADR 015). En un paso del programa dice la frase de su explicación —el motor manda la clave y los datos, el catálogo
// `textos/es-MX/explicaciones.ts` la escribe—, con su línea; en el paso 0 dice cuál línea sigue (y, si el visualizador detuvo el programa por seguridad, lo avisa ya desde ahí con el texto de
// `textos/es-MX/avisos-de-limite.ts`); si el programa espera un dato lo dice; y en el último paso resume cómo terminó. El robot NUNCA dice
// algo que el motor no calculó: cada texto sale de un dato del motor (la explicación del paso, la línea del nodo que espera, la causa del fin) o de un estado que la interfaz conoce de verdad
// (todavía no hay programa, se está revisando). Puro, sin DOM.
import type { FinEjecucion, Paso, VistaPrograma } from '../motor/vista.ts';
import { textoDelAvisoDeLimite, textoIntrigaDelLimite } from '../textos/es-MX/avisos-de-limite.ts';
import { textoDeExplicacion } from '../textos/es-MX/explicaciones.ts';
import type { TipoDeAviso } from '../textos/es-MX/paneles.ts';
import { textosRobot, type AnimoDelRobot } from '../textos/es-MX/robot.ts';

/** En qué va la ejecución, según lo que el trabajador ha mandado. */
export type EstadoDeLaEjecucion =
  | { readonly estado: 'sin-ejecutar' }
  | { readonly estado: 'compilando' }
  /** El alumno editó el código después de un aviso: el aviso viejo ya no describe el programa que hay en el editor (C4 del panel 1). */
  | { readonly estado: 'cambiado-tras-un-aviso' }
  | { readonly estado: 'calculando' }
  | { readonly estado: 'esperando-entrada'; readonly nodo: number }
  | { readonly estado: 'terminada'; readonly fin: FinEjecucion }
  /** El trabajador acusó `detener` antes de que el programa terminara (hito 2C): ya no llegarán más pasos y no hay un `fin` que resumir. */
  | { readonly estado: 'detenida' };

export interface RobotVista {
  readonly animo: AnimoDelRobot;
  /** La línea del paso que explica (`null` si no hay paso: antes de visualizar o en el paso 0). */
  readonly linea: number | null;
  /** La frase principal: la explicación del paso, o lo que toca decir cuando todavía no hay paso. */
  readonly texto: string;
  /** Una segunda frase, solo en el último paso: que el programa espera un dato, que el motor sigue calculando o cómo terminó. */
  readonly nota: string | null;
  /** El tipo de aviso con ícono y título propios cuando el paso es una excepción o una detención. */
  readonly aviso: TipoDeAviso | null;
  /** ¿Se anuncia de inmediato al lector de pantalla (`aria-live="assertive"`)? Solo las excepciones y las detenciones. */
  readonly asertivo: boolean;
}

export interface EntradaDelRobot {
  readonly ejecucion: EstadoDeLaEjecucion;
  /** Los pasos aplicados (los primeros `paso` de la traza) y el que sigue, si el motor ya lo calculó. */
  readonly aplicados: readonly Paso[];
  readonly siguiente: Paso | null;
  readonly total: number;
  readonly vista: VistaPrograma | null;
}

type CausaFin = FinEjecucion['causa'];

function animoDelFin(causa: CausaFin): AnimoDelRobot {
  switch (causa) {
    case 'terminado':
      return 'feliz';
    case 'limite-pasos':
    case 'limite-caracteres':
    case 'limite-tiempo':
    case 'no-disponible-en-ejecucion':
      return 'seguridad';
    case 'excepcion':
    case 'error-interno':
    case 'error-arranque':
      return 'preocupado';
  }
}

function avisoDelPaso(paso: Paso): TipoDeAviso | null {
  const explicacion = paso.explicacion;
  if (explicacion.clave === 'excepcion') return 'excepcion';
  if (explicacion.clave !== 'detenido') return null;
  switch (explicacion.datos.causa) {
    case 'limite-pasos':
    case 'limite-caracteres':
    case 'limite-tiempo':
      return 'seguridad';
    case 'no-disponible-en-ejecucion':
      return 'no-disponible';
    case 'error-interno':
      return 'interno';
  }
}

/** El aviso que sale de la CAUSA del fin cuando no hubo un paso que lo dijera: el perro guardián que termina el trabajador (`limite-tiempo`) no deja un paso `detenido` en la traza. */
function avisoDelFin(causa: CausaFin): TipoDeAviso | null {
  return causa === 'limite-tiempo' ? 'seguridad' : null;
}

function lineaDelNodo(vista: VistaPrograma | null, nodo: number): number | null {
  return vista?.nodos[nodo]?.linea ?? null;
}

function sinPaso(texto: string, animo: AnimoDelRobot = 'normal', nota: string | null = null): RobotVista {
  return { animo, linea: null, texto, nota, aviso: null, asertivo: false };
}

function alInicio({ ejecucion, siguiente, total, vista }: EntradaDelRobot): RobotVista {
  if (ejecucion.estado === 'terminada' && total === 0) {
    return sinPaso(textosRobot.resumenDelFin[ejecucion.fin.causa]({ pasos: 0 }), animoDelFin(ejecucion.fin.causa));
  }
  if (ejecucion.estado === 'detenida' && total === 0) return sinPaso(textosRobot.detenida());
  const esperando = ejecucion.estado === 'esperando-entrada';
  const lineaDeLaLectura = esperando ? lineaDelNodo(vista, ejecucion.nodo) : null;
  const lineaSiguiente = siguiente?.linea ?? lineaDeLaLectura;
  const notaDeLaEspera = esperando && total === 0 && lineaDeLaLectura !== null ? textosRobot.esperandoUnDato(lineaDeLaLectura) : null;
  // Un programa que el visualizador detuvo por seguridad lo adelanta desde el paso 0, pero como intriga: dice QUE no terminó solo y deja el POR QUÉ (la evidencia del ciclo) para el final (C7 del panel 1).
  const notaDelLimite = ejecucion.estado === 'terminada' ? textoIntrigaDelLimite(ejecucion.fin.causa) : null;
  return sinPaso(textosRobot.alInicio(lineaSiguiente), esperando && total === 0 ? 'esperando' : 'normal', notaDeLaEspera ?? notaDelLimite);
}

/**
 * La nota del último paso de un programa que terminó. En un límite del visualizador hay UN solo texto sobre el motivo (C7 del panel 1): si el último paso es el `detenido`, ya lo dice y no hay nota; si
 * no (el perro guardián cortó por tiempo y no dejó ese paso), la nota es ese texto. El título del aviso («Se detuvo por seguridad») ya dice que se detuvo: no se repite en un «Así terminó: me detuve…».
 */
function notaDelCierre(fin: FinEjecucion, total: number, ultimo: Paso): string | null {
  const delLimite = textoDelAvisoDeLimite(fin);
  if (delLimite === null) return textosRobot.resumenDelFin[fin.causa]({ pasos: total });
  return ultimo.explicacion.clave === 'detenido' ? null : delLimite;
}

/** Lo que el robot agrega en el ÚLTIMO paso: la espera de un dato, que el motor sigue calculando, o el resumen de cómo terminó. */
function notaDelUltimoPaso(entrada: EntradaDelRobot, ultimo: Paso): { readonly nota: string | null; readonly animo: AnimoDelRobot } {
  const { ejecucion, total, vista } = entrada;
  switch (ejecucion.estado) {
    case 'esperando-entrada': {
      const linea = lineaDelNodo(vista, ejecucion.nodo);
      return { nota: linea === null ? null : textosRobot.esperandoUnDato(linea), animo: 'esperando' };
    }
    case 'terminada':
      return { nota: notaDelCierre(ejecucion.fin, total, ultimo), animo: animoDelFin(ejecucion.fin.causa) };
    case 'detenida':
      return { nota: textosRobot.detenida(), animo: 'normal' };
    case 'calculando':
      return { nota: textosRobot.calculando(), animo: 'normal' };
    default:
      return { nota: null, animo: 'normal' };
  }
}

export function derivarRobot(entrada: EntradaDelRobot): RobotVista {
  const { ejecucion, aplicados, total } = entrada;
  if (ejecucion.estado === 'sin-ejecutar') return sinPaso(textosRobot.saludo());
  if (ejecucion.estado === 'compilando') return sinPaso(textosRobot.compilando());
  if (ejecucion.estado === 'cambiado-tras-un-aviso') return sinPaso(textosRobot.programaCambiado());

  const ultimo = aplicados.at(-1);
  if (ultimo === undefined) return alInicio(entrada);

  const esElUltimo = aplicados.length === total;
  const { nota, animo } = esElUltimo ? notaDelUltimoPaso(entrada, ultimo) : { nota: null, animo: 'normal' as const };
  const avisoDelCierre = esElUltimo && ejecucion.estado === 'terminada' ? avisoDelFin(ejecucion.fin.causa) : null;
  const aviso = avisoDelPaso(ultimo) ?? avisoDelCierre;
  return {
    animo,
    linea: ultimo.linea,
    texto: textoDeExplicacion(ultimo.explicacion),
    nota,
    aviso,
    asertivo: ultimo.clase === 'excepcion' || ultimo.clase === 'detenido' || avisoDelCierre !== null,
  };
}
