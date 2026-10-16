// RED de la tarea 2.8 (parte regional, ADR 012, REQ-BIB-010): el modelo regional único. Los símbolos salen de `DecimalFormatSymbols` del JDK 17 (`datos/regional.generado.ts`);
// los consumen SOLO `Scanner` (entrada) y `Formatter` (`printf`/`String.format`), nunca `Double.toString`.
import { describe, expect, it } from 'vitest';
import { simbolosRegionales } from './regional.ts';

describe('simbolosRegionales — es-MX (por omisión) y es-ES («coma»)', () => {
  it('es-MX usa el punto decimal y la coma de miles (igual que en_US)', () => {
    const simbolos = simbolosRegionales('es-MX');
    expect(simbolos.decimal).toBe('.');
    expect(simbolos.miles).toBe(',');
    expect(simbolos.menos).toBe('-');
  });

  it('es-ES invierte los dos separadores: coma decimal y punto de miles', () => {
    const simbolos = simbolosRegionales('es-ES');
    expect(simbolos.decimal).toBe(',');
    expect(simbolos.miles).toBe('.');
  });

  it('los dos tienen NaN e infinito como los escribe Java (∞, no "Infinity")', () => {
    expect(simbolosRegionales('es-MX').nan).toBe('NaN');
    expect(simbolosRegionales('es-MX').infinito).toBe('∞');
    expect(simbolosRegionales('es-ES').infinito).toBe('∞');
  });
});
