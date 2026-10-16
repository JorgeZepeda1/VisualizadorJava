// RED de la tarea 1.31: el azar del generador diferencial. Todo programa generado sale de UNA semilla
// y de su posición en la campaña, para que un informe sea reproducible: «--semilla 7 --cantidad 5000»
// vuelve a producir EXACTAMENTE los mismos programas, y el programa número k no depende de cuántos se
// pidan (pedir 1 000 o 50 000 con la misma semilla comparte los primeros 1 000).
import { describe, expect, it } from 'vitest';
import { crearAzar, semillaDelPrograma } from './azar.ts';

function secuencia(semilla: number, cuantos: number): number[] {
  const azar = crearAzar(semilla);
  return Array.from({ length: cuantos }, () => azar.entero(1_000_000));
}

describe('crearAzar — PRNG determinista por semilla', () => {
  it('la misma semilla produce la misma secuencia', () => {
    expect(secuencia(42, 50)).toEqual(secuencia(42, 50));
  });

  it('semillas distintas producen secuencias distintas', () => {
    expect(secuencia(1, 50)).not.toEqual(secuencia(2, 50));
  });

  it('entero(n) siempre cae en [0, n) y alcanza todos los valores de un rango chico', () => {
    const azar = crearAzar(7);
    const vistos = new Set<number>();
    for (let i = 0; i < 500; i += 1) {
      const valor = azar.entero(5);
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(5);
      vistos.add(valor);
    }
    expect([...vistos].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('elegir devuelve un elemento de la lista y los recorre todos (triangulación con 3 opciones)', () => {
    const azar = crearAzar(11);
    const vistos = new Set<string>();
    for (let i = 0; i < 200; i += 1) vistos.add(azar.elegir(['a', 'b', 'c']));
    expect([...vistos].sort()).toEqual(['a', 'b', 'c']);
  });

  it('elegir sobre una lista vacía falla con un mensaje claro (nunca devuelve undefined en silencio)', () => {
    expect(() => crearAzar(1).elegir([])).toThrow(/lista vacía/);
  });

  it('probabilidad(p) respeta los extremos (0 nunca, 1 siempre) y se acerca a p', () => {
    const azar = crearAzar(3);
    expect(Array.from({ length: 100 }, () => azar.probabilidad(0)).some(Boolean)).toBe(false);
    expect(Array.from({ length: 100 }, () => azar.probabilidad(1)).every(Boolean)).toBe(true);
    const aciertos = Array.from({ length: 4000 }, () => azar.probabilidad(0.25)).filter(Boolean).length;
    expect(aciertos / 4000).toBeGreaterThan(0.2);
    expect(aciertos / 4000).toBeLessThan(0.3);
  });

  it('ponderado respeta los pesos: un peso 0 nunca sale y el más pesado sale más', () => {
    const azar = crearAzar(5);
    const cuenta = { raro: 0, comun: 0, nunca: 0 };
    for (let i = 0; i < 3000; i += 1) {
      cuenta[azar.ponderado([[1, 'raro'], [9, 'comun'], [0, 'nunca']] as const)] += 1;
    }
    expect(cuenta.nunca).toBe(0);
    expect(cuenta.comun).toBeGreaterThan(cuenta.raro * 4);
    expect(cuenta.raro).toBeGreaterThan(0);
  });
});

describe('semillaDelPrograma — la semilla de cada programa de la campaña', () => {
  it('es determinista', () => {
    expect(semillaDelPrograma(20260929, 17)).toBe(semillaDelPrograma(20260929, 17));
  });

  it('cambia con el índice y con la semilla de la campaña (10 000 programas sin una sola colisión)', () => {
    const semillas = new Set<number>();
    for (let indice = 0; indice < 10_000; indice += 1) semillas.add(semillaDelPrograma(20260929, indice));
    expect(semillas.size).toBe(10_000);
    expect(semillaDelPrograma(1, 0)).not.toBe(semillaDelPrograma(2, 0));
  });

  it('es un entero sin signo de 32 bits (lo que espera el PRNG)', () => {
    for (const indice of [0, 1, 999, 123456]) {
      const semilla = semillaDelPrograma(20260929, indice);
      expect(Number.isInteger(semilla)).toBe(true);
      expect(semilla).toBeGreaterThanOrEqual(0);
      expect(semilla).toBeLessThan(2 ** 32);
    }
  });
});
