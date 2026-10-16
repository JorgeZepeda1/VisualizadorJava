// RED/GREEN de las tareas 2.3 y 2.4 (REQ-BIB-002, REQ-DIFF-003): cada línea de `corpus/datos/double-tostring/*.csv` —bits de un `double` y lo que `Double.toString`
// del JDK 17.0.18 REAL imprimió— se compara con `doubleATexto` byte a byte. Los conjuntos son hechos del oráculo (`npm run oraculo:conjuntos`), nunca valores escritos a mano.
import { describe, expect, it } from 'vitest';
import { doubleATexto } from '../../../src/motor/biblioteca/formato/double-a-texto.ts';
import { leerConjuntoDeDobles } from './conjuntos.ts';

const CONJUNTOS = ['especiales', 'salon', 'aleatorios', 'banda', 'potencias-de-dos', 'potencias-de-diez', 'subnormales', 'grandes', 'empates'] as const;

function primerosFallos(nombre: string): string[] {
  return leerConjuntoDeDobles(nombre)
    .filter((caso) => doubleATexto(caso.valor) !== caso.esperado)
    .slice(0, 8)
    .map((caso) => `${caso.bits.toString(16).padStart(16, '0')}: Java imprime ${caso.esperado}, el motor ${doubleATexto(caso.valor)}`);
}

describe('Double.toString contra el JDK 17 real (corpus/datos/double-tostring)', () => {
  for (const nombre of CONJUNTOS) {
    it(`${nombre}: el 100 % coincide byte a byte`, () => {
      const casos = leerConjuntoDeDobles(nombre);
      expect(casos.length).toBeGreaterThan(40);
      expect(primerosFallos(nombre)).toEqual([]);
    });
  }
});
