// Aritmética de `long` de Java (tarea 2.2, REQ-BIB-001, design.md §3.1): un `long` es un `bigint` de 64 bits con signo. Cada resultado se
// lleva otra vez a 64 bits con `BigInt.asIntN(64, ·)`. Funciones puras, sin estado.
import { divisionEntreCero } from '../../interprete/excepcion-de-ejecucion.ts';

export const LONG_MAXIMO = 9223372036854775807n;
export const LONG_MINIMO = -9223372036854775808n;

function envolver(valor: bigint): bigint {
  return BigInt.asIntN(64, valor);
}

export function sumarLong(a: bigint, b: bigint): bigint {
  return envolver(a + b);
}

export function restarLong(a: bigint, b: bigint): bigint {
  return envolver(a - b);
}

export function multiplicarLong(a: bigint, b: bigint): bigint {
  return envolver(a * b);
}

export function negarLong(a: bigint): bigint {
  return envolver(-a);
}

/** Trunca hacia cero (igual que `/` de `bigint`); `LONG_MINIMO / -1` da `LONG_MINIMO` sin excepción; entre cero lanza `ArithmeticException: / by zero`. */
export function dividirLong(a: bigint, b: bigint): bigint {
  if (b === 0n) throw divisionEntreCero();
  return envolver(a / b);
}

/** El resto toma el signo del dividendo (igual que `%` de `bigint`); entre cero lanza `ArithmeticException: / by zero`. */
export function modLong(a: bigint, b: bigint): bigint {
  if (b === 0n) throw divisionEntreCero();
  return envolver(a % b);
}
