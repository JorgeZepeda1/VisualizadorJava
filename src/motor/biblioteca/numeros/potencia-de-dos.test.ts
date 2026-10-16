// RED de la tarea 2.6 (REFACTOR de las regla ESLint de `**`): `potenciaDeDos(n)` = 2^n EXACTA, armada con los bits del `double` en vez del operador `**` (que ECMA-262 deja aproximado).
import { describe, expect, it } from 'vitest';
import { potenciaDeDos } from './potencia-de-dos.ts';

describe('potenciaDeDos — 2^n exacta para todo exponente de un double', () => {
  it('potencias pequeñas, negativas y grandes', () => {
    expect(potenciaDeDos(0)).toBe(1);
    expect(potenciaDeDos(10)).toBe(1024);
    expect(potenciaDeDos(-1)).toBe(0.5);
    expect(potenciaDeDos(53)).toBe(9007199254740992);
    expect(potenciaDeDos(60)).toBe(1152921504606846976);
    expect(potenciaDeDos(-24)).toBe(5.960464477539063e-8);
  });

  it('los extremos: el mayor normal, el menor normal y el menor subnormal (Double.MIN_VALUE)', () => {
    expect(potenciaDeDos(1023)).toBe(8.98846567431158e307);
    expect(potenciaDeDos(-1022)).toBe(2.2250738585072014e-308);
    expect(potenciaDeDos(-1074)).toBe(Number.MIN_VALUE);
  });

  it('fuera del rango de un double: Infinity por arriba y 0 por abajo', () => {
    expect(potenciaDeDos(1024)).toBe(Infinity);
    expect(potenciaDeDos(-1075)).toBe(0);
  });
});
