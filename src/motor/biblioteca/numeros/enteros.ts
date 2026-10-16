// Aritmética de `int` de Java (tarea 2.2, REQ-BIB-001, design.md §3.1/§4.1) sobre números de JavaScript: un `int` es un número entero de
// 32 bits con signo. JavaScript suma, resta y multiplica en doble precisión, así que cada resultado se lleva otra vez a 32 bits con `| 0`
// (suma y resta nunca pierden precisión con operandos de 32 bits) o con `Math.imul` (el producto sí la perdería a partir de 2^53). Funciones
// puras, sin estado: las usa el intérprete (`interprete/expresiones.ts`) y el plegado de constantes.
import { divisionEntreCero } from '../excepciones/excepcion-java.ts';

export const INT_MAXIMO = 2147483647;
export const INT_MINIMO = -2147483648;

export function sumarInt(a: number, b: number): number {
  return (a + b) | 0;
}

export function restarInt(a: number, b: number): number {
  return (a - b) | 0;
}

export function multiplicarInt(a: number, b: number): number {
  return Math.imul(a, b);
}

/** `-a`: `-INT_MINIMO` da `INT_MINIMO` y `-0` no existe como `int` (el `| 0` lo normaliza). */
export function negarInt(a: number): number {
  return -a | 0;
}

/** División entera de Java (JLS 15.17.2): trunca hacia cero; `INT_MINIMO / -1` da `INT_MINIMO` sin excepción; entre cero lanza `ArithmeticException: / by zero`. */
export function dividirInt(a: number, b: number): number {
  if (b === 0) throw divisionEntreCero();
  return (a / b) | 0;
}

/** Resto de Java (JLS 15.17.3): toma el signo del dividendo (igual que `%` de JavaScript); `| 0` normaliza el `-0`. Entre cero lanza `ArithmeticException: / by zero`. */
export function modInt(a: number, b: number): number {
  if (b === 0) throw divisionEntreCero();
  return (a % b) | 0;
}
