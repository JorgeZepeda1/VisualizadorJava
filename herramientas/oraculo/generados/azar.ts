// Azar determinista del generador diferencial (tarea 1.31). Reutiliza el PRNG con semilla de
// `mutantes.ts` (mulberry32: `Math.random()` no admite semilla y rompería «el informe es reproducible»).
// Cada programa de una campaña sale de `semillaDelPrograma(semilla, indice)`: así el programa número k
// no depende de cuántos se pidan, y pedir 50 000 con la misma semilla comparte los primeros 1 000.
import { crearGeneradorConSemilla } from '../mutantes.ts';

export interface Azar {
  /** Entero en `[0, limiteExclusivo)`. */
  entero(limiteExclusivo: number): number;
  /** `true` con probabilidad `p` (0 nunca, 1 siempre). */
  probabilidad(p: number): boolean;
  /** Un elemento de la lista, todos igual de probables. */
  elegir<T>(opciones: readonly T[]): T;
  /** Un valor de `[peso, valor]`; un peso 0 nunca sale. */
  ponderado<T>(opciones: readonly (readonly [peso: number, valor: T])[]): T;
}

export function crearAzar(semilla: number): Azar {
  const siguiente = crearGeneradorConSemilla(semilla);

  function elegir<T>(opciones: readonly T[]): T {
    if (opciones.length === 0) throw new Error('elegir: lista vacía (no hay nada que elegir)');
    return opciones[Math.floor(siguiente() * opciones.length)]!;
  }

  function ponderado<T>(opciones: readonly (readonly [peso: number, valor: T])[]): T {
    const conPeso = opciones.filter(([peso]) => peso > 0);
    if (conPeso.length === 0) throw new Error('ponderado: ninguna opción tiene peso positivo');
    const total = conPeso.reduce((suma, [peso]) => suma + peso, 0);
    let restante = siguiente() * total;
    for (const [peso, valor] of conPeso) {
      if (restante < peso) return valor;
      restante -= peso;
    }
    return conPeso[conPeso.length - 1]![1];
  }

  return {
    entero: (limiteExclusivo) => Math.floor(siguiente() * limiteExclusivo),
    probabilidad: (p) => siguiente() < p,
    elegir,
    ponderado,
  };
}

/**
 * Semilla del programa número `indice` de la campaña `semilla`: una mezcla de 32 bits (constante áurea
 * y finalizador de MurmurHash3) que es una biyección en `indice`, así que dos programas de la misma
 * campaña nunca comparten semilla.
 */
export function semillaDelPrograma(semilla: number, indice: number): number {
  let h = ((semilla >>> 0) + Math.imul((indice >>> 0) + 1, 0x9e3779b1)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}
