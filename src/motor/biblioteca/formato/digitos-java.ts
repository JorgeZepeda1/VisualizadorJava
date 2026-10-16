// Tarea 2.3 (REQ-BIB-002 parte 1, ADR 008, design.md §4.2): los dígitos que imprime `Double.toString` de JDK 17 para un `double` finito, positivo y distinto de cero.
//
// JDK 17 NO imprime los dígitos "más cortos" (lo que hacen `Number.prototype.toString` de JS y, desde JDK 19, Java mismo): genera los dígitos del valor EXACTO uno por
// uno y se detiene en cuanto lo ya generado, o ese número más una unidad en el último dígito, cae ESTRICTAMENTE dentro del intervalo de números que redondean a `x`.
// Este módulo implementa esa generación (Steele y White, 1990, "free-format") con aritmética exacta en `BigInt`, y reproduce las cinco rarezas que el oráculo midió en
// el JDK 17.0.18 real (no se leyó ni se copió código de OpenJDK, ADR 016; lo verifican los conjuntos de `corpus/datos/double-tostring/`):
//
//  1. Enteros menores que 2^63: los dígitos del entero exacto, y si el exponente binario pasa de 53 se descartan 0, 1 o 2 dígitos finales con HALF_UP (la "banda").
//  2. Los extremos del intervalo se EXCLUYEN (`<` y `>` estrictos). El "más corto" de JS los incluye cuando la mantisa es par: de ahí los empates de `1e23`.
//  3. Una potencia de dos (mantisa en cero) tiene el hueco de abajo a la mitad, pero Java usa esa mitad de los DOS lados: el intervalo es x ± 2^(e−54).
//  4. Si el resultado va en notación científica (|x| < 10^-3 o |x| ≥ 10^7) la primera cifra nunca termina la generación: siempre salen al menos dos dígitos, y como
//     eso elige el candidato de DOS dígitos más cercano al valor exacto, un subnormal con intervalo ancho (`Double.MIN_VALUE`) da `4.9E-324` y no `5E-324`.
//  5. Al terminar, si tanto el truncado como el truncado + 1 caen dentro, se elige el más cercano al valor exacto y, si están a la misma distancia, el de último dígito par.

export interface DigitosJava {
  /** Dígitos decimales significativos, sin ceros a la derecha (al menos uno). */
  readonly digitos: string;
  /** Exponente decimal del primer dígito: el valor es `d.ddd… × 10^exponente`. */
  readonly exponente: number;
}

import { potenciaDeDos } from '../numeros/potencia-de-dos.ts';

const VISTA = new DataView(new ArrayBuffer(8));
/** 2^63 como `double` (exacto): los enteros menores que esto se imprimen con sus dígitos exactos. */
const DOS_A_LA_63 = 9223372036854775808;
const MASCARA_FRACCION = (1n << 52n) - 1n;
const BIT_OCULTO = 1n << 52n;
const LOG10_DE_2 = 0.30102999566398120;
/** `x < 10^-3` o `x ≥ 10^7`: la notación científica de `Double.toString`. */
const EXPONENTE_MINIMO_DECIMAL = -3;
const EXPONENTE_MAXIMO_DECIMAL = 6;

/** La mantisa entera y el exponente binario de un `double` positivo finito: `x = mantisa × 2^exponente2` (el hueco entre dos vecinos es `2^exponente2`). */
function descomponer(x: number): { mantisa: bigint; exponente2: number } {
  VISTA.setFloat64(0, x);
  const bits = VISTA.getBigUint64(0);
  const campo = Number((bits >> 52n) & 0x7ffn);
  const fraccion = bits & MASCARA_FRACCION;
  return campo === 0 ? { mantisa: fraccion, exponente2: -1074 } : { mantisa: fraccion | BIT_OCULTO, exponente2: campo - 1075 };
}

function longitudEnBits(n: bigint): number {
  return n.toString(2).length;
}

/** Dígitos insignificantes que descarta Java en un entero grande de exponente binario `e` ≥ 54 (floor((e − 54) · log10 2); 0, 0, 0, 0, 1, 1, 1, 2, 2 para e = 54…62). */
function digitosInsignificantes(exponenteBinario: number): number {
  const p2 = exponenteBinario - 54;
  return p2 > 1 ? Math.floor(p2 * LOG10_DE_2) : 0;
}

function quitarCerosFinales(digitos: string): string {
  let fin = digitos.length;
  while (fin > 1 && digitos.charCodeAt(fin - 1) === 48) fin -= 1;
  return digitos.slice(0, fin);
}

/** Clase 1: un entero positivo menor que 2^63. Dígitos exactos; por encima de 2^53 se redondea HALF_UP quitando 0–2 dígitos finales. */
function digitosDeEnteroGrande(x: number): DigitosJava {
  const entero = BigInt(x);
  const k = digitosInsignificantes(longitudEnBits(entero) - 1);
  let cociente = entero;
  if (k > 0) {
    const potencia = 10n ** BigInt(k);
    cociente = entero / potencia;
    if ((entero % potencia) * 2n >= potencia) cociente += 1n;
  }
  const texto = cociente.toString();
  return { digitos: quitarCerosFinales(texto), exponente: texto.length - 1 + k };
}

/** `floor(log10(x))` exacto para `x = mantisa × 2^exponente2` (con escala `2^escala` ya aplicada a ambos lados: `numerador = x × 2^escala`). */
function exponenteDecimal(numerador: bigint, escala: number, mantisa: bigint, exponente2: number): number {
  let k = Math.floor((longitudEnBits(mantisa) - 1 + exponente2) * LOG10_DE_2);
  // `x ≥ 10^k` ⇔ numerador ≥ 10^k × 2^escala (k ≥ 0) ⇔ numerador × 10^-k ≥ 2^escala (k < 0).
  const alMenos = (potencia: number): boolean =>
    potencia >= 0 ? numerador >= (10n ** BigInt(potencia)) << BigInt(escala) : numerador * 10n ** BigInt(-potencia) >= 1n << BigInt(escala);
  while (!alMenos(k)) k -= 1;
  while (alMenos(k + 1)) k += 1;
  return k;
}

/** Suma 1 al último dígito con acarreo. Devuelve `true` si todos eran 9 (quedó `[1]` y el exponente sube uno). */
function redondearHaciaArriba(digitos: number[]): boolean {
  let i = digitos.length - 1;
  while (i >= 0 && digitos[i] === 9) {
    digitos[i] = 0;
    i -= 1;
  }
  if (i < 0) {
    digitos.length = 0;
    digitos.push(1);
    return true;
  }
  digitos[i] = (digitos[i] as number) + 1;
  return false;
}

/**
 * El exponente decimal con que JDK 17 EMPIEZA a generar (no el real): una aproximación lineal de log10 que siempre queda igual o un poco por encima del valor verdadero
 * (la tangente de una curva cóncava), así que da `k` o `k + 1`. Importa en dos sitios (ver `digitosGenerados`): con `k + 1` la primera posición produce un cero, y con `k`
 * la primera cifra es real y en notación científica no puede terminar la generación.
 */
function estimarExponenteDecimal(mantisa: bigint, exponente2: number): number {
  const bitsDeLaMantisa = longitudEnBits(mantisa);
  const exponenteBinario = exponente2 + bitsDeLaMantisa - 1;
  const fraccion = Number(mantisa) / potenciaDeDos(bitsDeLaMantisa - 1);
  return Math.floor((fraccion - 1.5) * 0.289529654 + 0.176091259 + exponenteBinario * 0.301029995663981);
}

/**
 * JDK 17 hace la aritmética de la generación con `long` (64 bits con signo) cuando todo cabe en 63 bits. Con divisor 10 · 5^25 (valores de 10^25 a 10^26 con exponente binario
 * 77–87) la suma `b + m` de la prueba de `alto` puede pasar de 2^63 y dar un número NEGATIVO: la comparación sale falsa y Java trunca el último dígito aunque el siguiente esté más
 * cerca (con exponente binario 84, 2.6 % de los valores; es el «residual» `0x453d04ffce09b504` de design.md §4.2). Y si `m` mismo pasa de 2^63 queda negativo y el JDK da por
 * ciertos `bajo` y `alto`. `resto` y `holgura` de aquí están multiplicados por 2^25 respecto de los `b` y `m` del JDK (el divisor `10^25` es `5^25 · 2^25`).
 */
const EXPONENTE_DECIMAL_DE_LONG_DE_64_BITS = 25;
const EXPONENTE_BINARIO_MINIMO_DE_LONG_DE_64_BITS = 77;
const EXPONENTE_BINARIO_MAXIMO_DE_LONG_DE_64_BITS = 87;
const POTENCIA_DE_DOS_COMUN = 25n;

function usaAritmeticaDe64Bits(k: number, estimado: number, exponenteBinario: number): boolean {
  return (
    k === EXPONENTE_DECIMAL_DE_LONG_DE_64_BITS &&
    estimado === EXPONENTE_DECIMAL_DE_LONG_DE_64_BITS &&
    exponenteBinario >= EXPONENTE_BINARIO_MINIMO_DE_LONG_DE_64_BITS &&
    exponenteBinario <= EXPONENTE_BINARIO_MAXIMO_DE_LONG_DE_64_BITS
  );
}

interface Cotas {
  readonly bajo: boolean;
  readonly alto: boolean;
}

/** `bajo`: lo generado (truncado) cae estrictamente dentro del intervalo; `alto`: lo generado + 1 en el último dígito cae estrictamente dentro. */
function calcularCotas(resto: bigint, holgura: bigint, divisor: bigint, conAritmeticaDe64Bits: boolean): Cotas {
  if (!conAritmeticaDe64Bits) return { bajo: resto < holgura, alto: resto + holgura > divisor };
  const b = (resto * 10n) >> POTENCIA_DE_DOS_COMUN;
  const m = BigInt.asIntN(64, (holgura * 10n) >> POTENCIA_DE_DOS_COMUN);
  const decenas = (divisor * 10n) >> POTENCIA_DE_DOS_COMUN;
  if (m <= 0n) return { bajo: true, alto: true };
  return { bajo: b < m, alto: BigInt.asIntN(64, b + m) > decenas };
}

/** Clases 2–5: generación exacta de dígitos con extremos excluidos, hueco simétrico en las potencias de dos y al menos dos dígitos en notación científica. */
function digitosGenerados(x: number): DigitosJava {
  const { mantisa, exponente2 } = descomponer(x);
  const esPotenciaDeDos = (mantisa & (mantisa - 1n)) === 0n;
  // `x' = x × 2^escala` y la mitad del intervalo `h' = h × 2^escala` son enteros (h = 2^(e−1), o 2^(e−2) en una potencia de dos).
  const escala = Math.max(0, 2 - exponente2);
  const numerador = mantisa << BigInt(exponente2 + escala);
  const mitad = 1n << BigInt(exponente2 - (esPotenciaDeDos ? 2 : 1) + escala);
  const k = exponenteDecimal(numerador, escala, mantisa, exponente2);
  const estimado = estimarExponenteDecimal(mantisa, exponente2);

  // Se normaliza para que la primera cifra salga de `resto / divisor` con `x / 10^k` en [1, 10).
  let resto: bigint;
  let divisor: bigint;
  let holgura: bigint;
  if (k >= 0) {
    resto = numerador;
    divisor = (1n << BigInt(escala)) * 10n ** BigInt(k);
    holgura = mitad;
  } else {
    const potencia = 10n ** BigInt(-k);
    resto = numerador * potencia;
    divisor = 1n << BigInt(escala);
    holgura = mitad * potencia;
  }

  const enNotacionCientifica = k < EXPONENTE_MINIMO_DECIMAL || k > EXPONENTE_MAXIMO_DECIMAL;
  const digitos: number[] = [];
  let exponentePrimerDigito = k;
  // Con la estimación en `k + 1` la primera posición da un cociente 0 que Java descarta, salvo que `x + M` pase estrictamente de 10^(k+1): entonces lo conserva y, en notación
  // científica, ese cero no puede terminar la generación (el siguiente dígito sí). Con la estimación en `k` la primera cifra es real y en notación científica no puede terminar.
  if (estimado > k && resto + holgura > divisor * 10n) {
    if (!enNotacionCientifica) return { digitos: '1', exponente: k + 1 };
    digitos.push(0);
    exponentePrimerDigito = k + 1;
  }
  const primeraCifraPuedeTerminar = !(estimado === k && enNotacionCientifica);
  const conAritmeticaDe64Bits = usaAritmeticaDe64Bits(k, estimado, exponente2 + longitudEnBits(mantisa) - 1);

  let cotas: Cotas;
  let cifrasReales = 0;
  for (;;) {
    const digito = resto / divisor;
    resto -= digito * divisor;
    digitos.push(Number(digito));
    cifrasReales += 1;
    cotas = calcularCotas(resto, holgura, divisor, conAritmeticaDe64Bits);
    const puedeTerminar = cifrasReales > 1 || primeraCifraPuedeTerminar;
    if (puedeTerminar && (cotas.bajo || cotas.alto)) break;
    resto *= 10n;
    holgura *= 10n;
  }

  let sube: boolean;
  if (cotas.alto && cotas.bajo) {
    const doble = resto * 2n;
    sube = doble > divisor || (doble === divisor && (digitos[digitos.length - 1] as number) % 2 === 1);
  } else {
    sube = cotas.alto;
  }
  let exponente = exponentePrimerDigito;
  if (sube && redondearHaciaArriba(digitos)) exponente += 1;
  // Un cero inicial conservado que no se volvió 1 por el acarreo no es una cifra: el primer dígito real está una posición más abajo.
  if (digitos.length > 1 && digitos[0] === 0) {
    digitos.shift();
    exponente -= 1;
  }
  return { digitos: quitarCerosFinales(digitos.join('')), exponente };
}

/** Los dígitos de `Double.toString` (JDK 17) para un `double` finito y positivo. NaN, infinitos y ceros los resuelve `doubleATexto` antes de llegar aquí. */
export function digitosJava(x: number): DigitosJava {
  if (Number.isInteger(x) && x < DOS_A_LA_63) return digitosDeEnteroGrande(x);
  return digitosGenerados(x);
}
