// Adaptador entre `compilar()` (src/motor) y el clasificador del generador diferencial (tarea 1.31).
// Es la única pieza del generador que conoce el contrato del motor: el resto (clasificador, reductor,
// informe) trabaja con `VeredictoNuestro`, así que cambiar el motor no obliga a tocarlos.
import { compilar } from '../../../src/motor/index.ts';
import type { ResultadoCompilacion } from '../../../src/motor/index.ts';
import { CODIGOS_NO_SOPORTADO } from '../../../src/motor/no-soportado.ts';
import type { VeredictoNuestro } from './clasificador.ts';

/** Un compilador, tal como lo ve el generador: el real (`compilar`) o uno falso en las pruebas. */
export type CompiladorNuestro = (fuente: string) => VeredictoNuestro;

/** Pura: el resultado de `compilar()` como el veredicto que entiende el clasificador. */
export function veredictoDeResultado(resultado: ResultadoCompilacion): VeredictoNuestro {
  if (resultado.ok) return { tipo: 'ok' };
  const { problema } = resultado;
  if (problema.categoria === 'error-compilacion') {
    return { tipo: 'error-compilacion', codigo: problema.codigo, linea: problema.linea };
  }
  // Solo `ejecucion-no-disponible` significa «todas las pasadas aceptaron el programa» (tarea 1.27);
  // cualquier otro código de `no-disponible` reconoce una construcción fuera del subconjunto.
  if (problema.codigo === CODIGOS_NO_SOPORTADO.ejecucionNoDisponible) {
    return { tipo: 'ejecucion-no-disponible', linea: problema.linea };
  }
  return { tipo: 'aviso', codigo: problema.codigo, linea: problema.linea };
}

/**
 * Llama a `compilar()` y traduce su resultado. `compilar()` LANZA ante un fallo del propio motor (un
 * `TypeError`, una pila agotada…: tarea 1.28); aquí se captura como `fallo-interno`, porque para el
 * generador un fallo del motor es una discrepancia más, nunca algo que detenga la campaña.
 */
export function veredictoDeNuestroCompilador(fuente: string, compilarFuente: (fuente: string) => ResultadoCompilacion = compilar): VeredictoNuestro {
  try {
    return veredictoDeResultado(compilarFuente(fuente));
  } catch (error) {
    const mensaje = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return { tipo: 'fallo-interno', mensaje };
  }
}
