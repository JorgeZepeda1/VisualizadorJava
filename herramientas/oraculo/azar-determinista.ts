// Azar determinista para los generadores del oráculo (hito 1, parte A): los conjuntos de `corpus/datos/` salen de casos que este
// archivo reproduce idénticos en cualquier máquina y en cualquier corrida (semilla fija), de modo que regenerarlos contra el JDK
// da bytes idénticos y `git diff` solo muestra cambios REALES del JDK (ADR 010/011). No usa `Math.random` jamás.

export interface Azar {
  /** Entero sin signo de 32 bits. */
  siguiente32(): number;
  /** Entero sin signo de 64 bits. */
  siguiente64(): bigint;
  /** Entero uniforme en [minimo, maximo] (ambos incluidos; el rango cabe en 2^32). */
  entre(minimo: number, maximo: number): number;
  /** Elemento uniforme de una lista no vacía. */
  elegir<T>(lista: readonly T[]): T;
}

/** xorshift128+ en 32 bits (xoshiro128**): pequeño, rápido y con buena distribución para armar casos. */
export function crearAzar(semilla: number): Azar {
  // splitmix32 para sembrar las cuatro palabras de estado desde un solo entero.
  let s = semilla >>> 0;
  const sembrar = (): number => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
  let a = sembrar();
  let b = sembrar();
  let c = sembrar();
  let d = sembrar();
  const rotar = (x: number, k: number): number => ((x << k) | (x >>> (32 - k))) >>> 0;

  const siguiente32 = (): number => {
    const resultado = Math.imul(rotar(Math.imul(b, 5) >>> 0, 7), 9) >>> 0;
    const t = (b << 9) >>> 0;
    c = (c ^ a) >>> 0;
    d = (d ^ b) >>> 0;
    b = (b ^ c) >>> 0;
    a = (a ^ d) >>> 0;
    c = (c ^ t) >>> 0;
    d = rotar(d, 11);
    return resultado;
  };

  return {
    siguiente32,
    siguiente64: () => (BigInt(siguiente32()) << 32n) | BigInt(siguiente32()),
    entre: (minimo, maximo) => minimo + Math.floor((siguiente32() / 0x1_0000_0000) * (maximo - minimo + 1)),
    elegir: (lista) => lista[Math.floor((siguiente32() / 0x1_0000_0000) * lista.length)]!,
  };
}

const VISTA = new DataView(new ArrayBuffer(8));

/** Los 64 bits de un `double` (como sin signo). */
export function bitsDeDouble(x: number): bigint {
  VISTA.setFloat64(0, x);
  return VISTA.getBigUint64(0);
}

/** El `double` de 64 bits dados. */
export function doubleDeBits(bits: bigint): number {
  VISTA.setBigUint64(0, bits);
  return VISTA.getFloat64(0);
}

/** 16 dígitos hexadecimales en minúsculas (el formato de los conjuntos). */
export function bitsAHex(bits: bigint): string {
  return bits.toString(16).padStart(16, '0');
}
