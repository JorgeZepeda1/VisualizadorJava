// RED de la tarea 2.2 (REQ-BIB-001, REQ-EJEC-005 parte entera): aritmética de `int` de Java (JLS 15.17, 4.2.2) sobre números de JavaScript.
// Cada valor esperado es lo que imprime el JDK 17 real (Test01Int del oráculo y los programas de `corpus/experimentos/ejecucion/`).
import { describe, expect, it } from 'vitest';
import { ExcepcionDeEjecucion } from '../../interprete/excepcion-de-ejecucion.ts';
import { dividirInt, INT_MAXIMO, INT_MINIMO, modInt, multiplicarInt, negarInt, restarInt, sumarInt } from './enteros.ts';

describe('enteros: suma, resta y producto dan la vuelta en 32 bits', () => {
  it('MAX_VALUE + 1 = MIN_VALUE y MIN_VALUE - 1 = MAX_VALUE', () => {
    expect(sumarInt(INT_MAXIMO, 1)).toBe(INT_MINIMO);
    expect(restarInt(INT_MINIMO, 1)).toBe(INT_MAXIMO);
  });

  it('sin desbordar, la suma y la resta son las de siempre (control)', () => {
    expect(sumarInt(2, 3)).toBe(5);
    expect(restarInt(2, 3)).toBe(-1);
  });

  it('el producto usa los 32 bits bajos: MAX*2 = -2, MIN*-1 = MIN, 65536*65536 = 0', () => {
    expect(multiplicarInt(INT_MAXIMO, 2)).toBe(-2);
    expect(multiplicarInt(INT_MINIMO, -1)).toBe(INT_MINIMO);
    expect(multiplicarInt(65536, 65536)).toBe(0);
  });

  it('el producto es exacto donde `*` de JavaScript perdería precisión (46341 * 46341 = -2147479015)', () => {
    expect(multiplicarInt(46341, 46341)).toBe(-2147479015);
    expect(multiplicarInt(123456789, 987654321)).toBe(-67153019);
  });

  it('-MIN_VALUE = MIN_VALUE y -0 no existe como int', () => {
    expect(negarInt(INT_MINIMO)).toBe(INT_MINIMO);
    expect(negarInt(5)).toBe(-5);
    expect(Object.is(negarInt(0), 0)).toBe(true);
  });
});

describe('enteros: división y módulo de Java (truncan hacia cero; el módulo toma el signo del dividendo)', () => {
  it('7/2=3, -7/2=-3, 7/-2=-3, -7/-2=3', () => {
    expect([dividirInt(7, 2), dividirInt(-7, 2), dividirInt(7, -2), dividirInt(-7, -2)]).toEqual([3, -3, -3, 3]);
  });

  it('7%3=1, -7%3=-1, 7%-3=1, -7%-3=-1', () => {
    expect([modInt(7, 3), modInt(-7, 3), modInt(7, -3), modInt(-7, -3)]).toEqual([1, -1, 1, -1]);
  });

  it('el módulo cero se normaliza: -6 % 3 es 0 y no -0', () => {
    expect(Object.is(modInt(-6, 3), 0)).toBe(true);
    expect(Object.is(dividirInt(-1, 2), 0)).toBe(true);
  });

  it('MIN_VALUE / -1 da MIN_VALUE sin excepción, y MIN_VALUE % -1 da 0', () => {
    expect(dividirInt(INT_MINIMO, -1)).toBe(INT_MINIMO);
    expect(modInt(INT_MINIMO, -1)).toBe(0);
  });

  it('dividir o sacar módulo entre cero lanza ArithmeticException: / by zero', () => {
    for (const operacion of [() => dividirInt(5, 0), () => modInt(5, 0)]) {
      try {
        operacion();
        expect.unreachable('debía lanzar');
      } catch (error) {
        expect(error).toBeInstanceOf(ExcepcionDeEjecucion);
        expect(error).toMatchObject({ claseCalificada: 'java.lang.ArithmeticException', mensajeJava: '/ by zero', marcosDeJdk: [] });
      }
    }
  });
});
