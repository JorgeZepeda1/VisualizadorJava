// RED de la tarea 2.2 (REQ-BIB-001, REQ-SUB-002 aritmética de `long`): 64 bits exactos con `BigInt.asIntN(64, ·)`.
import { describe, expect, it } from 'vitest';
import { ExcepcionDeEjecucion } from '../../interprete/excepcion-de-ejecucion.ts';
import { dividirLong, LONG_MAXIMO, LONG_MINIMO, modLong, multiplicarLong, negarLong, restarLong, sumarLong } from './largos.ts';

describe('largos: la aritmética da la vuelta en 64 bits', () => {
  it('Long.MAX_VALUE + 1 = Long.MIN_VALUE y Long.MIN_VALUE - 1 = Long.MAX_VALUE', () => {
    expect(sumarLong(LONG_MAXIMO, 1n)).toBe(LONG_MINIMO);
    expect(restarLong(LONG_MINIMO, 1n)).toBe(LONG_MAXIMO);
  });

  it('sin desbordar, sigue siendo exacto más allá de 2^53 (control: 9007199254740993 + 1)', () => {
    expect(sumarLong(9007199254740993n, 1n)).toBe(9007199254740994n);
  });

  it('el producto conserva los 64 bits bajos: MAX*2 = -2, 3037000500 * 3037000500 se desborda', () => {
    expect(multiplicarLong(LONG_MAXIMO, 2n)).toBe(-2n);
    expect(multiplicarLong(3037000500n, 3037000500n)).toBe(-9223372036709301616n);
  });

  it('-Long.MIN_VALUE = Long.MIN_VALUE', () => {
    expect(negarLong(LONG_MINIMO)).toBe(LONG_MINIMO);
    expect(negarLong(7n)).toBe(-7n);
  });

  it('la división trunca hacia cero y el módulo toma el signo del dividendo', () => {
    expect([dividirLong(7n, 2n), dividirLong(-7n, 2n), dividirLong(7n, -2n)]).toEqual([3n, -3n, -3n]);
    expect([modLong(7n, 3n), modLong(-7n, 3n), modLong(7n, -3n), modLong(-7n, -3n)]).toEqual([1n, -1n, 1n, -1n]);
  });

  it('Long.MIN_VALUE / -1 da Long.MIN_VALUE sin excepción', () => {
    expect(dividirLong(LONG_MINIMO, -1n)).toBe(LONG_MINIMO);
    expect(modLong(LONG_MINIMO, -1n)).toBe(0n);
  });

  it('dividir entre cero lanza ArithmeticException: / by zero', () => {
    expect(() => dividirLong(1n, 0n)).toThrow(ExcepcionDeEjecucion);
    expect(() => modLong(1n, 0n)).toThrow(ExcepcionDeEjecucion);
  });
});
