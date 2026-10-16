// RED/GREEN de la tarea 2.10 (REQ-BIB-007, REQ-DIFF-003): los 65 536 valores de `char` contra `corpus/datos/caracteres/rangos.csv`, que el oráculo (JDK 17.0.18 real) generó:
// `isDigit isLetter isLetterOrDigit isUpperCase isLowerCase isWhitespace toUpperCase toLowerCase`. El archivo guarda tramos (inicio, banderas, distancia a la mayúscula y a la
// minúscula); aquí se expande a un valor por `char` y se compara con la biblioteca uno por uno.
import { describe, expect, it } from 'vitest';
import { isDigit, isLetter, isLetterOrDigit, isLowerCase, isUpperCase, isWhitespace, toLowerCase, toUpperCase } from '../../../src/motor/biblioteca/texto/character.ts';
import { leerConjunto } from './conjuntos.ts';

interface Esperado {
  readonly banderas: number;
  readonly mayuscula: number;
  readonly minuscula: number;
}

function expandirTramos(): Esperado[] {
  const tramos = leerConjunto('caracteres', 'rangos.csv')
    .split('\n')
    .filter((linea) => linea !== '')
    .map((linea) => linea.split(',').map(Number) as [number, number, number, number]);
  const esperados: Esperado[] = [];
  tramos.forEach(([inicio, banderas, deltaMayuscula, deltaMinuscula], indice) => {
    const fin = indice + 1 < tramos.length ? (tramos[indice + 1] as number[])[0]! : 65_536;
    for (let c = inicio; c < fin; c++) esperados[c] = { banderas, mayuscula: c + deltaMayuscula, minuscula: c + deltaMinuscula };
  });
  return esperados;
}

describe('Character contra el JDK 17 real (corpus/datos/caracteres)', () => {
  const esperados = expandirTramos();

  it('el conjunto cubre los 65 536 valores de char', () => {
    expect(esperados).toHaveLength(65_536);
    expect(esperados.filter((e) => (e.banderas & 2) !== 0).length).toBeGreaterThan(40_000);
  });

  it('las seis clasificaciones coinciden en los 65 536 char', () => {
    const fallos: string[] = [];
    for (let c = 0; c < 65_536; c++) {
      const e = esperados[c] as Esperado;
      const obtenido =
        (isDigit(c) ? 1 : 0) | (isLetter(c) ? 2 : 0) | (isLetterOrDigit(c) ? 4 : 0) | (isUpperCase(c) ? 8 : 0) | (isLowerCase(c) ? 16 : 0) | (isWhitespace(c) ? 32 : 0);
      if (obtenido !== e.banderas && fallos.length < 8) fallos.push(`U+${c.toString(16)}: Java ${e.banderas}, motor ${obtenido}`);
    }
    expect(fallos).toEqual([]);
  });

  it('toUpperCase y toLowerCase coinciden en los 65 536 char', () => {
    const fallos: string[] = [];
    for (let c = 0; c < 65_536; c++) {
      const e = esperados[c] as Esperado;
      if ((toUpperCase(c) !== e.mayuscula || toLowerCase(c) !== e.minuscula) && fallos.length < 8) {
        fallos.push(`U+${c.toString(16)}: Java ${e.mayuscula}/${e.minuscula}, motor ${toUpperCase(c)}/${toLowerCase(c)}`);
      }
    }
    expect(fallos).toEqual([]);
  });
});
