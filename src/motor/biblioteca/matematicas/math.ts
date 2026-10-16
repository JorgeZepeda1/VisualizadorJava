// Tarea 2.6 (REQ-BIB-004, design.md §4.4): `Math` reducido — `abs max min sqrt round floor ceil PI E random` y `pow`. Java elige la sobrecarga por el tipo ESTÁTICO de los argumentos; el
// intérprete llama a la variante que corresponde (`absInt`, `absLong`, `absDouble`…).
//  - `sqrt`, `floor` y `ceil` son los de JavaScript: IEEE 754 en los tres motores, y el oráculo lo comprueba (≈ 3 000 casos).
//  - `max`/`min` de `double` heredan de JS el trato de NaN y de ±0 (que coincide con Java); `abs(MIN_VALUE)` sigue negativo en int y long.
//  - `round(double)` es "el más cercano, los empates hacia +∞" SIN sumar 0.5 (`0.49999999999999994 + 0.5` daría 1 en JS y Java da 0). `round` de `int`, `long` y `char` NO tiene
//    sobrecarga propia: se resuelve a `round(float)` — el argumento pasa a `float` con UN solo redondeo (nunca `Math.fround(Number(l))`, que redondea dos veces) y el resultado es `int`.
//  - `pow` es «No disponible» mientras el puerto de fdlibm (ADR 009) no esté verificado contra el oráculo: el `pow` de JavaScript difiere de Java en el 4 % de los casos
//    (`Math.pow(10, -4)`), así que jamás se usa. Una regla de ESLint prohíbe `Math.pow/exp/log*/sin/cos/tan/cbrt/hypot` y el operador `**` en `src/motor`.
import { FuenteDeAleatorios } from '../aleatorio/semillas.ts';
import { NoDisponibleEnEjecucion } from '../no-disponible.ts';

const MAXIMO_INT = 2147483647;
const MINIMO_INT = -2147483648;
const MAXIMO_LONG = 9223372036854775807n;
const MINIMO_LONG = -9223372036854775808n;
/** 2^63 como `double` (exacto): a partir de aquí `round(double)` satura a `Long.MAX_VALUE`. */
const DOS_A_LA_63 = 9223372036854775808;
/** 2^31 como `double` (exacto): a partir de aquí `round(float)` satura a `Integer.MAX_VALUE`. */
const DOS_A_LA_31 = 2147483648;
const BITS_DE_LA_MANTISA_DE_FLOAT = 24;

/** El entero más cercano a `x` con los empates hacia +∞ (el `rint` de Java 17); `x` ya no es NaN. Para |x| ≥ 2^52 `x` es entero y la resta da 0, así que no se toca. */
function redondearHaciaMasInfinito(x: number): number {
  const piso = Math.floor(x);
  return x - piso >= 0.5 ? piso + 1 : piso;
}

function roundDouble(x: number): bigint {
  if (Number.isNaN(x)) return 0n;
  if (x >= DOS_A_LA_63) return MAXIMO_LONG;
  if (x <= -DOS_A_LA_63) return MINIMO_LONG;
  return BigInt(redondearHaciaMasInfinito(x));
}

/** `Math.round(float)`: el argumento ya es un valor de `float` (guardado en un `number`). Devuelve `int`, con saturación y NaN → 0. */
function roundFloat(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x >= DOS_A_LA_31) return MAXIMO_INT;
  if (x <= -DOS_A_LA_31) return MINIMO_INT;
  return redondearHaciaMasInfinito(x);
}

/** `(float) l` de Java para un `long`: redondeo al más cercano con empate al par, UNA sola vez, directamente desde el entero exacto. */
export function longAFloat(l: bigint): number {
  if (l === 0n) return 0;
  const negativo = l < 0n;
  const magnitud = negativo ? -l : l;
  const bits = magnitud.toString(2).length;
  if (bits <= BITS_DE_LA_MANTISA_DE_FLOAT) return Number(l);
  const desplazamiento = BigInt(bits - BITS_DE_LA_MANTISA_DE_FLOAT);
  let cociente = magnitud >> desplazamiento;
  const resto = magnitud & ((1n << desplazamiento) - 1n);
  const mitad = 1n << (desplazamiento - 1n);
  if (resto > mitad || (resto === mitad && (cociente & 1n) === 1n)) cociente += 1n;
  const valor = Number(cociente) * Number(1n << desplazamiento);
  return negativo ? -valor : valor;
}

export const MathJava = {
  PI: 3.141592653589793,
  E: 2.718281828459045,

  absInt: (x: number): number => (x < 0 ? -x : x) | 0,
  absLong: (x: bigint): bigint => BigInt.asIntN(64, x < 0n ? -x : x),
  absDouble: (x: number): number => Math.abs(x),

  maxInt: (a: number, b: number): number => (a >= b ? a : b),
  minInt: (a: number, b: number): number => (a <= b ? a : b),
  maxLong: (a: bigint, b: bigint): bigint => (a >= b ? a : b),
  minLong: (a: bigint, b: bigint): bigint => (a <= b ? a : b),
  maxDouble: (a: number, b: number): number => Math.max(a, b),
  minDouble: (a: number, b: number): number => Math.min(a, b),

  sqrt: (x: number): number => Math.sqrt(x),
  floor: (x: number): number => Math.floor(x),
  ceil: (x: number): number => Math.ceil(x),

  /** `Math.round(double)` → `long`. */
  roundDouble,
  /** `Math.round(float)` → `int`, para un argumento que ya es `float`. */
  roundFloat,
  /** `Math.round(int)` no existe: se resuelve a `round(float)`. */
  roundInt: (x: number): number => roundFloat(Math.fround(x)),
  /** `Math.round(long)` no existe: se resuelve a `round(float)` (con la conversión de un solo redondeo). */
  roundLong: (x: bigint): number => roundFloat(longAFloat(x)),
  /** `Math.round(char)` no existe: se resuelve a `round(float)`. */
  roundChar: (c: number): number => roundFloat(c),

  /** `Math.random()`: la instancia oculta de la ejecución, con la semilla visible. */
  random: (fuente: FuenteDeAleatorios): number => fuente.mathRandom(),

  /** `Math.pow`: «No disponible» hasta que fdlibm esté portado y verificado (ADR 009). */
  pow: (base: number, exponente: number): number => {
    throw new NoDisponibleEnEjecucion('math-pow', `Math.pow(${base}, ${exponente})`);
  },
} as const;
