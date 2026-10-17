// RED del arreglo (c) del hito 2A: la pantalla escribía los `double` con una aproximación propia; ahora usa el `Double.toString` EXACTO de Java que ya tiene el motor (ADR 008). `vista.ts` es lo único
// del motor que la interfaz puede importar, así que lo exporta de ahí. Los casos son los de Java 17 de verdad (los valores salen de `biblioteca/formato`, que el oráculo verifica).
import { describe, expect, it } from 'vitest';
import { PUERTO_POR_OMISION } from './interprete/puerto-por-omision.ts';
import { doubleATexto } from './vista.ts';

describe('vista.ts exporta doubleATexto: el Double.toString exacto de Java', () => {
  it('escribe los double como Java: siempre con punto decimal, ".0" en los enteros, notación científica fuera de 10^-3 ≤ |x| < 10^7', () => {
    expect(doubleATexto(100)).toBe('100.0');
    expect(doubleATexto(0.1 + 0.2)).toBe('0.30000000000000004');
    expect(doubleATexto(1e7)).toBe('1.0E7');
    expect(doubleATexto(0.0001)).toBe('1.0E-4');
    expect(doubleATexto(-2.5)).toBe('-2.5');
  });

  it('los casos especiales: -0.0, NaN e infinitos', () => {
    expect(doubleATexto(-0)).toBe('-0.0');
    expect(doubleATexto(Number.NaN)).toBe('NaN');
    expect(doubleATexto(Number.POSITIVE_INFINITY)).toBe('Infinity');
    expect(doubleATexto(Number.NEGATIVE_INFINITY)).toBe('-Infinity');
  });

  it('es la misma función que usa el motor al escribir un double en la consola y en las explicaciones (no una copia que pueda divergir)', () => {
    expect(PUERTO_POR_OMISION.doubleATexto).toBe(doubleATexto);
  });
});
