// `char` de Java (tarea 2.2, REQ-BIB-001, design.md §3.1): un número de 0 a 65535, una unidad UTF-16 sin signo. En la aritmética se promueve
// a `int` (el número tal cual); al guardarlo de vuelta en un `char` se estrecha con `& 0xFFFF`. Funciones puras.

const MASCARA_DE_CHAR = 0xffff;

/** El valor numérico del literal `'x'` que entrega el analizador (el texto ya decodificado): su primera unidad UTF-16. */
export function caracterDeLiteral(texto: string): number {
  return texto.charCodeAt(0);
}

/** `(char) (a + b)` con la vuelta de 16 bits: lo que hacen `c++`, `c--` y `c += n`. */
export function sumarChar(a: number, b: number): number {
  return (a + b) & MASCARA_DE_CHAR;
}

/** El texto de un solo `char` (`String.valueOf(char)`); una unidad suelta de un par de sustitutos se conserva tal cual. */
export function caracterATexto(valor: number): string {
  return String.fromCharCode(valor);
}
