// Clasificador del generador diferencial (tarea 1.31): dado el veredicto de `javac` 17 y el de nuestro
// compilador sobre el MISMO programa, decide si coinciden. Puro: no lanza procesos ni toca el motor
// (el adaptador que convierte `compilar()` en un `VeredictoNuestro` vive en `campana.ts`), así que se
// prueba con compiladores falsos y sigue valiendo cuando la tarea 1.32 corrija el compilador.
//
// Diseñado para crecer (tarea 2.21): hoy el veredicto es de COMPILACIÓN; para comparar también la
// ejecución (salida y excepciones) bastará sumar un veredicto por fase con la misma forma
// (oráculo, nuestro, clasificación) sin tocar el reductor ni el informe.

/** Lo que dijo javac 17 (protocolo de `CompiladorEnLote.java`): compila, o el primer error. */
export interface VeredictoJavac {
  readonly compila: boolean;
  /** Línea del primer error; `-1` si compila. */
  readonly linea: number;
  /** Clave estable del diagnóstico (`compiler.err.…`); vacía si compila. */
  readonly codigoJavac: string;
  /** Mensaje real de javac en inglés (`Locale.ROOT`); vacío si compila. */
  readonly mensajeJavac: string;
}

/**
 * Lo que dijo nuestro `compilar()`, reducido a lo que decide el veredicto. Cinco formas, porque cada
 * una cuenta distinto frente a javac:
 * - `ok`: el compilador lo aceptó y hay algo que ejecutar.
 * - `ejecucion-no-disponible`: TODAS las pasadas lo aceptaron y solo falta ejecutarlo (tarea 1.27);
 *   su texto dice «Tu programa pasó todas mis revisiones…» (hasta la 1.34, «Java sí acepta tu programa»),
 *   así que para un programa que javac rechaza es un falso acepto igual que `ok`.
 * - `aviso`: una construcción fuera del subconjunto reconocida; afirma la construcción, no el programa.
 * - `error-compilacion`: lo rechazó, con su línea.
 * - `fallo-interno`: el compilador lanzó una excepción (un fallo del motor, nunca una respuesta).
 */
export type VeredictoNuestro =
  | { readonly tipo: 'ok' }
  | { readonly tipo: 'ejecucion-no-disponible'; readonly linea: number }
  | { readonly tipo: 'aviso'; readonly codigo: string; readonly linea: number }
  | { readonly tipo: 'error-compilacion'; readonly codigo: string; readonly linea: number }
  | { readonly tipo: 'fallo-interno'; readonly mensaje: string };

export type TipoDeDiscrepancia = 'falso-acepto' | 'falso-rechazo' | 'fallo-interno';

export interface Clasificacion {
  /** `null` si los dos veredictos son compatibles. */
  readonly discrepancia: TipoDeDiscrepancia | null;
  /**
   * Solo cuando AMBOS rechazan con un error (javac y `error-compilacion`): ¿la misma línea? Es una
   * métrica que se reporta, nunca una causa de falla. `null` cuando no es comparable (un aviso no
   * señala «la línea del error», sino la de la construcción que no cubre).
   */
  readonly lineaCoincide: boolean | null;
}

const LARGO_MAXIMO_DEL_MENSAJE_EN_LA_CLAVE = 100;

export function clasificar(javac: VeredictoJavac, nuestro: VeredictoNuestro): Clasificacion {
  if (nuestro.tipo === 'fallo-interno') return { discrepancia: 'fallo-interno', lineaCoincide: null };

  if (javac.compila) {
    return { discrepancia: nuestro.tipo === 'error-compilacion' ? 'falso-rechazo' : null, lineaCoincide: null };
  }

  switch (nuestro.tipo) {
    case 'ok':
    case 'ejecucion-no-disponible':
      return { discrepancia: 'falso-acepto', lineaCoincide: null };
    case 'error-compilacion':
      return { discrepancia: null, lineaCoincide: nuestro.linea === javac.linea };
    case 'aviso':
      return { discrepancia: null, lineaCoincide: null };
  }
}

/**
 * Clave estable de lo que respondió nuestro compilador: con ella (más el código de javac) se agrupan
 * las discrepancias en familias. Conserva el código porque `ok`, `ejecucion-no-disponible` y cada
 * aviso o error son respuestas distintas para el alumno.
 */
export function claveDeNuestroVeredicto(nuestro: VeredictoNuestro): string {
  switch (nuestro.tipo) {
    case 'ok':
    case 'ejecucion-no-disponible':
      return nuestro.tipo;
    case 'aviso':
      return `aviso:${nuestro.codigo}`;
    case 'error-compilacion':
      return `error:${nuestro.codigo}`;
    case 'fallo-interno':
      return `fallo-interno:${nuestro.mensaje.split('\n')[0]!.slice(0, LARGO_MAXIMO_DEL_MENSAJE_EN_LA_CLAVE)}`;
  }
}
