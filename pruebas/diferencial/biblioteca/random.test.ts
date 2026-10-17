// RED/GREEN de la tarea 2.7 (REQ-BIB-005, REQ-DIFF-003): `java.util.Random` contra el JDK 17 REAL en `corpus/datos/random/secuencias.tsv` — 17 semillas (incluidas 0, `Long.MIN_VALUE`,
// `Long.MAX_VALUE`, 2^48 y 2^48−1) × `nextInt()`, `nextInt(n)` para 14 cotas (potencias de 2, no potencias, 1 073 741 825 que fuerza el rechazo, `Integer.MAX_VALUE`), `nextLong()`,
// `nextDouble()` (bits exactos), `nextBoolean()` y una mezcla de métodos sobre el mismo estado.
import { describe, expect, it } from 'vitest';
import { RandomJava } from '../../../src/motor/biblioteca/aleatorio/random.ts';
import { bitsAHex, bitsDeDouble } from '../../../herramientas/oraculo/azar-determinista.ts';
import { leerConjunto } from './conjuntos.ts';

interface Secuencia {
  readonly semilla: bigint;
  readonly metodo: string;
  readonly argumento: string;
  readonly valores: readonly string[];
}

function leerSecuencias(): Secuencia[] {
  return leerConjunto('random', 'secuencias.tsv')
    .split('\n')
    .filter((linea) => linea !== '')
    .map((linea) => {
      const [semilla, metodo, argumento, valores] = linea.split('\t') as [string, string, string, string];
      return { semilla: BigInt(semilla), metodo, argumento, valores: valores.split(',') };
    });
}

function generar(secuencia: Secuencia): string[] {
  const azar = new RandomJava(secuencia.semilla);
  return secuencia.valores.map((_, i) => {
    switch (secuencia.metodo) {
      case 'nextInt':
        return String(secuencia.argumento === '' ? azar.nextInt() : azar.nextInt(Number(secuencia.argumento)));
      case 'nextLong':
        return String(azar.nextLong());
      case 'nextDouble':
        return bitsAHex(bitsDeDouble(azar.nextDouble()));
      case 'nextBoolean':
        return String(azar.nextBoolean());
      default:
        // 'mezcla': dado, double, booleano, long, en ese orden cíclico.
        switch (i % 4) {
          case 0:
            return String(azar.nextInt(6) + 1);
          case 1:
            return bitsAHex(bitsDeDouble(azar.nextDouble()));
          case 2:
            return String(azar.nextBoolean());
          default:
            return String(azar.nextLong());
        }
    }
  });
}

describe('java.util.Random contra el JDK 17 real (corpus/datos/random)', () => {
  const secuencias = leerSecuencias();

  it('el conjunto trae al menos 8 semillas y todos los métodos soportados', () => {
    expect(new Set(secuencias.map((s) => s.semilla)).size).toBeGreaterThanOrEqual(8);
    expect(new Set(secuencias.map((s) => s.metodo))).toEqual(new Set(['nextInt', 'nextLong', 'nextDouble', 'nextBoolean', 'mezcla']));
    expect(secuencias.reduce((total, s) => total + s.valores.length, 0)).toBeGreaterThan(30_000);
  });

  it('el 100 % de los valores coincide con el JDK, secuencia por secuencia', () => {
    const fallos: string[] = [];
    for (const secuencia of secuencias) {
      const obtenidos = generar(secuencia);
      const primerDistinto = obtenidos.findIndex((valor, i) => valor !== secuencia.valores[i]);
      if (primerDistinto !== -1) {
        fallos.push(`semilla ${secuencia.semilla} ${secuencia.metodo}(${secuencia.argumento}) #${primerDistinto}: Java ${secuencia.valores[primerDistinto]}, motor ${obtenidos[primerDistinto]}`);
      }
    }
    expect(fallos.slice(0, 10)).toEqual([]);
  });
});
