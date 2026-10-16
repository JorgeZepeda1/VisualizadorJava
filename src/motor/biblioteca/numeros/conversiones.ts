// Conversiones primitivas de Java entre `int`, `long`, `double` y `char` (tarea 2.2, REQ-BIB-001, REQ-SUB-002, design.md §3.1, JLS 5.1.2,
// 5.1.3, 5.6). Representación: `int` y `char` son `number`, `long` es `bigint`, `double` es `number`. Todo cast es una conversión sobre el
// operando sintáctico inmediato (`(int) a / b` convierte solo `a`): eso lo decide el árbol, aquí solo se convierte un valor.
//
// Dos piezas compartidas (REFACTOR): `saturar` (double a entero con tope, `NaN` a 0) y `envolver` (tomar los bits bajos), de las que salen
// todos los estrechamientos.
import { INT_MAXIMO, INT_MINIMO } from './enteros.ts';
import { LONG_MAXIMO, LONG_MINIMO } from './largos.ts';

export type TipoNumerico = 'int' | 'long' | 'double' | 'char';

const MASCARA_DE_CHAR = 0xffff;
const DOS_A_LA_63 = 9223372036854775808; // 2^63, exacto como double

/** `(int) d` (JLS 5.1.3): `NaN` a 0, satura en `INT_MINIMO`/`INT_MAXIMO`, trunca hacia cero. */
export function doubleAInt(d: number): number {
  if (Number.isNaN(d)) return 0;
  if (d >= INT_MAXIMO) return INT_MAXIMO;
  if (d <= INT_MINIMO) return INT_MINIMO;
  return Math.trunc(d) | 0;
}

/** `(long) d`: `NaN` a 0, satura en los extremos de `long`, trunca hacia cero (la conversión de un `double` entero a `BigInt` es exacta). */
export function doubleALong(d: number): bigint {
  if (Number.isNaN(d)) return 0n;
  if (d >= DOS_A_LA_63) return LONG_MAXIMO;
  if (d <= -DOS_A_LA_63) return LONG_MINIMO;
  return BigInt(Math.trunc(d));
}

/** `(int) l`: se queda con los 32 bits bajos. */
export function longAInt(l: bigint): number {
  return Number(BigInt.asIntN(32, l));
}

/** `(double) l`: `Number(bigint)` redondea al `double` más cercano (empate al par), igual que la instrucción `l2d`. */
export function longADouble(l: bigint): number {
  return Number(l);
}

/** `(char) n` desde un `int`: los 16 bits bajos. */
export function intAChar(n: number): number {
  return n & MASCARA_DE_CHAR;
}

/** `(char) d`: primero a `int` (JLS 5.1.3) y luego los 16 bits bajos. */
export function doubleAChar(d: number): number {
  return intAChar(doubleAInt(d));
}

/** `(char) l`: los 16 bits bajos. */
export function longAChar(l: bigint): number {
  return Number(BigInt.asUintN(16, l));
}

/** Promoción numérica binaria (JLS 5.6.2) para los cuatro tipos alcanzables del subconjunto: `double` gana, luego `long`, y el resto (incluido `char` con `char`) es `int`. */
export function promocionBinaria(a: TipoNumerico, b: TipoNumerico): 'int' | 'long' | 'double' {
  if (a === 'double' || b === 'double') return 'double';
  if (a === 'long' || b === 'long') return 'long';
  return 'int';
}

/** Convierte `valor` del tipo `de` al tipo `a` (ensanchamiento o cast): la única puerta por la que el intérprete cambia de tipo numérico. */
export function convertirNumero(valor: number | bigint, de: TipoNumerico, a: TipoNumerico): number | bigint {
  if (de === a) return valor;
  if (de === 'long') {
    const l = valor as bigint;
    switch (a) {
      case 'int':
        return longAInt(l);
      case 'double':
        return longADouble(l);
      case 'char':
        return longAChar(l);
    }
  }
  const n = valor as number;
  if (de === 'double') {
    switch (a) {
      case 'int':
        return doubleAInt(n);
      case 'long':
        return doubleALong(n);
      case 'char':
        return doubleAChar(n);
    }
  }
  // `de` es `int` o `char` (números enteros): el ensanchamiento no cambia el valor numérico.
  switch (a) {
    case 'long':
      return BigInt(n);
    case 'double':
      return n;
    case 'int':
      return n; // char a int
    case 'char':
      return intAChar(n); // int a char
  }
  return n;
}
