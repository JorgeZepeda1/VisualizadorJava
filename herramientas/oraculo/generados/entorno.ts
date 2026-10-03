// Estado de la generación de UN programa (tarea 1.31): el azar, el catálogo de biblioteca, las variables
// que están en alcance y los nombres ya usados. Es estado mutable a propósito y local: cada programa
// crea el suyo, así que nada se comparte entre programas y el resultado sale solo de la semilla.
import type { Azar } from './azar.ts';
import type { CatalogoApi } from './catalogo-api.ts';
import { CLASE_POR_OMISION, type Etiqueta } from './programa.ts';
import {
  CLASES_QUE_UNA_VARIABLE_PUEDE_TAPAR,
  NOMBRES_COMUNES,
  NOMBRES_CONTEXTUALES,
  NOMBRES_DE_JAVASCRIPT,
  NOMBRES_EXTRANOS_VALIDOS,
  NOMBRES_INVALIDOS,
  PALABRAS_RESERVADAS,
} from './vocabulario.ts';

/**
 * Con esta probabilidad UNA sentencia lleva UNA violación deliberada de una regla de Java (un tipo
 * equivocado, un `final` reasignado, una etiqueta repetida…). Cada sentencia se genera válida por
 * construcción y, si le toca, se le inyecta exactamente una falla: así la mezcla de programas que javac
 * acepta y rechaza queda cerca del 50/50 y se puede razonar sobre ella. `generador-javac.test.ts` mide
 * la proporción real (47–49 % compila hasta la 1.33; ≈ 44 % desde la 1.34, cuyas plantillas A–D son casi siempre errores: bajarla a 0,07 subía la mezcla
 * a 45,7 % pero dejaba la familia F6 en 24 programas de 3 000, bajo su piso de 25, así que se quedó en 0,09).
 */
export const PROBABILIDAD_DE_VIOLAR = 0.09;

export interface Variable {
  readonly nombre: string;
  /** El tipo efectivo (para `var x = 5;` es `int`). */
  readonly tipo: string;
  readonly esFinal: boolean;
  readonly etiquetas: readonly Etiqueta[];
}

export interface Entorno {
  readonly azar: Azar;
  readonly api: CatalogoApi;
  readonly probabilidadDeViolar: number;
  /** Tarea 1.34 (familia C): el nombre de la clase del programa (`P`, o una clase del JDK cuyo nombre usurpa). */
  readonly clase: string;
  /** Las variables en alcance, de la más antigua a la más reciente. */
  variables: Variable[];
  readonly nombresUsados: Set<string>;
  /** ¿A la sentencia en curso le toca UNA violación? La consume el primer punto que decida (`debeViolar`). */
  violacionPendiente: boolean;
}

export function crearEntorno(azar: Azar, api: CatalogoApi, probabilidadDeViolar: number = PROBABILIDAD_DE_VIOLAR, clase: string = CLASE_POR_OMISION): Entorno {
  return { azar, api, probabilidadDeViolar, clase, variables: [], nombresUsados: new Set(), violacionPendiente: false };
}

/** Al empezar cada sentencia se decide si le toca una violación. */
export function comenzarSentencia(entorno: Entorno): void {
  entorno.violacionPendiente = entorno.azar.probabilidad(entorno.probabilidadDeViolar);
}

/**
 * ¿Hay que romper una regla en ESTE punto? Solo una vez por sentencia: el primer punto que pregunta
 * consume la violación pendiente y quien recibe `true` DEBE violar; los que preguntan después reciben
 * `false` y generan valores válidos.
 */
export function debeViolar(entorno: Entorno): boolean {
  const pendiente = entorno.violacionPendiente;
  entorno.violacionPendiente = false;
  return pendiente;
}

/** Ejecuta `generar` en un alcance nuevo: lo que declare adentro deja de estar visible al salir. */
export function conAlcance<T>(entorno: Entorno, generar: () => T): T {
  const visibles = entorno.variables.length;
  try {
    return generar();
  } finally {
    entorno.variables = entorno.variables.slice(0, visibles);
  }
}

export function registrarVariable(entorno: Entorno, variable: Variable): void {
  entorno.variables = [...entorno.variables, variable];
  entorno.nombresUsados.add(variable.nombre);
}

export function variablesDeTipo(entorno: Entorno, tipo: string): Variable[] {
  return entorno.variables.filter((v) => v.tipo === tipo);
}

export interface NombreElegido {
  readonly nombre: string;
  readonly etiquetas: readonly Etiqueta[];
  /** Es una palabra reservada: la declaración es un error de sintaxis a propósito. */
  readonly sintaxisInvalida: boolean;
}

function primeroSinUsar(entorno: Entorno, candidatos: readonly string[]): string | null {
  const libres = candidatos.filter((c) => !entorno.nombresUsados.has(c));
  return libres.length === 0 ? null : entorno.azar.elegir(libres);
}

/** Un nombre corriente que nadie usó: para las variables que el generador declara por necesidad. */
export function elegirNombreCorriente(entorno: Entorno): string {
  return primeroSinUsar(entorno, NOMBRES_COMUNES) ?? `v${entorno.nombresUsados.size}`;
}

export type ModoDeNombre = 'valido' | 'reservada' | 'repetido';

/**
 * Un nombre para una variable nueva. En modo `valido`, casi siempre uno corriente que nadie usó; a
 * veces una palabra clave contextual (`var`, `yield`…, válidas como nombre) o el nombre de una clase del
 * JDK (`Math`: válido, y tapa a la clase). `reservada` da una palabra reservada (error de sintaxis a
 * propósito) y `repetido` uno ya usado (variable repetida).
 */
export function elegirNombreNuevo(entorno: Entorno, modo: ModoDeNombre = 'valido'): NombreElegido {
  const { azar } = entorno;
  if (modo === 'reservada') {
    // Una palabra reservada o algo que ni siquiera es un identificador (`1a`, `a-b`): error de sintaxis a propósito.
    if (azar.probabilidad(0.4)) return { nombre: azar.elegir(NOMBRES_INVALIDOS), etiquetas: ['nombre-invalido'], sintaxisInvalida: true };
    return { nombre: azar.elegir(PALABRAS_RESERVADAS), etiquetas: ['palabra-reservada-como-nombre'], sintaxisInvalida: true };
  }
  if (modo === 'repetido' && entorno.variables.length > 0) {
    return { nombre: azar.elegir(entorno.variables).nombre, etiquetas: [], sintaxisInvalida: false };
  }
  const suerte = azar.ponderado<'corriente' | 'contextual' | 'clase' | 'extrano' | 'javascript'>([[81, 'corriente'], [10, 'contextual'], [2, 'clase'], [4, 'extrano'], [3, 'javascript']]);
  if (suerte === 'extrano') {
    const nombre = primeroSinUsar(entorno, NOMBRES_EXTRANOS_VALIDOS);
    if (nombre !== null) return { nombre, etiquetas: [], sintaxisInvalida: false };
  }
  if (suerte === 'javascript') {
    // Tarea 1.34 (E): una propiedad de JavaScript (`constructor`, `__proto__`…) como nombre: válida en Java, y una tabla de objeto plano del motor la confundiría.
    const nombre = primeroSinUsar(entorno, NOMBRES_DE_JAVASCRIPT);
    if (nombre !== null) return { nombre, etiquetas: ['nombre-de-javascript'], sintaxisInvalida: false };
  }
  if (suerte === 'contextual') {
    const nombre = primeroSinUsar(entorno, NOMBRES_CONTEXTUALES);
    if (nombre !== null) return { nombre, etiquetas: ['nombre-contextual'], sintaxisInvalida: false };
  }
  if (suerte === 'clase') {
    const nombre = primeroSinUsar(entorno, CLASES_QUE_UNA_VARIABLE_PUEDE_TAPAR);
    if (nombre !== null) return { nombre, etiquetas: [], sintaxisInvalida: false };
  }
  return { nombre: elegirNombreCorriente(entorno), etiquetas: [], sintaxisInvalida: false };
}
