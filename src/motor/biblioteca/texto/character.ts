// Tarea 2.10 (REQ-BIB-007, ADR 010): `Character.isDigit isLetter isLetterOrDigit isUpperCase isLowerCase isWhitespace toUpperCase toLowerCase` para un `char` (un entero sin signo
// de 16 bits). Las respuestas salen de la tabla que el oráculo generó del JDK 17 (Unicode 13): `\p{L}` de JavaScript usa otra versión de Unicode y `\s` difiere en U+00A0 y U+001C–U+001F.
// `toUpperCase`/`toLowerCase` de UN `char` son la correspondencia simple de Unicode; los casos especiales de `String` (`ß` → `SS`) viven en `string.ts`.
import { TRAMOS_DE_CARACTERES } from '../datos/caracteres.generado.ts';

const ELEMENTOS_POR_TRAMO = 4;
const BANDERA_DIGITO = 1;
const BANDERA_LETRA = 2;
const BANDERA_LETRA_O_DIGITO = 4;
const BANDERA_MAYUSCULA = 8;
const BANDERA_MINUSCULA = 16;
const BANDERA_ESPACIO = 32;
const TOTAL_DE_TRAMOS = TRAMOS_DE_CARACTERES.length / ELEMENTOS_POR_TRAMO;

/** Índice (del primer elemento) del tramo que contiene al `char`: búsqueda binaria del último tramo cuyo inicio es ≤ `c`. */
function buscarTramo(c: number): number {
  let bajo = 0;
  let alto = TOTAL_DE_TRAMOS - 1;
  while (bajo < alto) {
    const medio = (bajo + alto + 1) >> 1;
    if ((TRAMOS_DE_CARACTERES[medio * ELEMENTOS_POR_TRAMO] as number) <= c) bajo = medio;
    else alto = medio - 1;
  }
  return bajo * ELEMENTOS_POR_TRAMO;
}

function banderas(c: number): number {
  return TRAMOS_DE_CARACTERES[buscarTramo(c) + 1] as number;
}

export function isDigit(c: number): boolean {
  return (banderas(c) & BANDERA_DIGITO) !== 0;
}

export function isLetter(c: number): boolean {
  return (banderas(c) & BANDERA_LETRA) !== 0;
}

export function isLetterOrDigit(c: number): boolean {
  return (banderas(c) & BANDERA_LETRA_O_DIGITO) !== 0;
}

export function isUpperCase(c: number): boolean {
  return (banderas(c) & BANDERA_MAYUSCULA) !== 0;
}

export function isLowerCase(c: number): boolean {
  return (banderas(c) & BANDERA_MINUSCULA) !== 0;
}

/** `Character.isWhitespace` de Java: separa tokens de `Scanner` (design.md §4.6). */
export function isWhitespace(c: number): boolean {
  return (banderas(c) & BANDERA_ESPACIO) !== 0;
}

/**
 * `Character.digit(c, 10)`: el valor 0–9 de un dígito Unicode, o -1 si no lo es. Todo dígito Unicode va en una racha de `char` consecutivos alineada a 10 cuyo primer elemento vale 0
 * (el generador lo comprueba contra el JDK y lanza si un Unicode futuro lo rompiera), así que el valor es la posición dentro de la racha módulo 10: no hace falta otra columna.
 */
export function digitoDecimal(c: number): number {
  const tramo = buscarTramo(c);
  if (((TRAMOS_DE_CARACTERES[tramo + 1] as number) & BANDERA_DIGITO) === 0) return -1;
  return (c - (TRAMOS_DE_CARACTERES[tramo] as number)) % 10;
}

export function toUpperCase(c: number): number {
  return c + (TRAMOS_DE_CARACTERES[buscarTramo(c) + 2] as number);
}

export function toLowerCase(c: number): number {
  return c + (TRAMOS_DE_CARACTERES[buscarTramo(c) + 3] as number);
}
