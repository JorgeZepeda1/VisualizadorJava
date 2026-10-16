// RED de la tarea 2.6 (REQ-BIB-004, design.md §4.4): `Math` reducido — `abs max min sqrt round floor ceil` con la sobrecarga que Java elige por tipo, `PI`, `E`, `random` y `pow` (que sin el
// puerto de fdlibm verificado es «No disponible»). Los valores esperados son los de la especificación y los del JDK 17.0.18; `pruebas/diferencial/biblioteca/matematicas.test.ts` compara
// ≈ 3 000 operaciones contra el JDK real.
import { describe, expect, it } from 'vitest';
import { FuenteDeAleatorios } from '../aleatorio/semillas.ts';
import { NoDisponibleEnEjecucion } from '../no-disponible.ts';
import { MathJava as M, longAFloat } from './math.ts';

describe('Math.round — redondeo hacia +∞ en los empates, sin el bug histórico', () => {
  it('round(-2.5) = -2 (no -3), round(2.5) = 3, round(-0.5) = 0 y round(0.5) = 1', () => {
    expect(M.roundDouble(-2.5)).toBe(-2n);
    expect(M.roundDouble(2.5)).toBe(3n);
    expect(M.roundDouble(-0.5)).toBe(0n);
    expect(M.roundDouble(0.5)).toBe(1n);
  });

  it('round(0.49999999999999994) = 0: sumar 0.5 en JavaScript daría 1', () => {
    expect(M.roundDouble(0.49999999999999994)).toBe(0n);
    expect(Math.floor(0.49999999999999994 + 0.5)).toBe(1);
  });

  it('NaN da 0 y los extremos saturan a Long.MIN_VALUE / Long.MAX_VALUE', () => {
    expect(M.roundDouble(Number.NaN)).toBe(0n);
    expect(M.roundDouble(1e19)).toBe(9223372036854775807n);
    expect(M.roundDouble(-1e19)).toBe(-9223372036854775808n);
    expect(M.roundDouble(Infinity)).toBe(9223372036854775807n);
  });

  it('round(long) NO existe: se resuelve a round(float) y devuelve int — 123456789L → 123456792 (REQ-BIB-004)', () => {
    expect(M.roundLong(123456789n)).toBe(123456792);
    expect(M.roundInt(16777217)).toBe(16777216);
    expect(M.roundChar(65)).toBe(65);
  });

  it('la conversión long → float redondea una sola vez (nunca Math.fround(Number(l)), que redondea dos)', () => {
    // 2^53 + 1 pasado a double pierde el +1 y luego a float redondea distinto que desde el entero exacto.
    expect(longAFloat(9007199254740993n)).toBe(9007199254740992);
    expect(longAFloat(16777217n)).toBe(16777216);
    expect(longAFloat(16777219n)).toBe(16777220);
    expect(longAFloat(-16777219n)).toBe(-16777220);
    expect(longAFloat(0n)).toBe(0);
  });
});

describe('abs, max y min por tipo', () => {
  it('abs(Integer.MIN_VALUE) sigue siendo negativo (el desbordamiento de int) y abs(Long.MIN_VALUE) también', () => {
    expect(M.absInt(-2147483648)).toBe(-2147483648);
    expect(M.absInt(-5)).toBe(5);
    expect(M.absLong(-9223372036854775808n)).toBe(-9223372036854775808n);
    expect(M.absDouble(-0)).toBe(0);
    expect(Object.is(M.absDouble(-0), 0)).toBe(true);
  });

  it('max y min de double con NaN y con cero con signo: max(-0.0, 0.0) = 0.0, min(0.0, -0.0) = -0.0, NaN contagia', () => {
    expect(Object.is(M.maxDouble(-0, 0), 0)).toBe(true);
    expect(Object.is(M.minDouble(0, -0), -0)).toBe(true);
    expect(M.maxDouble(Number.NaN, 1)).toBeNaN();
    expect(M.minDouble(1, Number.NaN)).toBeNaN();
  });

  it('max y min de int y long', () => {
    expect(M.maxInt(3, -7)).toBe(3);
    expect(M.minInt(3, -7)).toBe(-7);
    expect(M.maxLong(5n, 9223372036854775807n)).toBe(9223372036854775807n);
    expect(M.minLong(-5n, 7n)).toBe(-5n);
  });
});

describe('sqrt, floor, ceil, constantes, random y pow', () => {
  it('sqrt(-1) es NaN sin lanzar; floor y ceil conservan el cero negativo', () => {
    expect(M.sqrt(-1)).toBeNaN();
    expect(M.sqrt(2)).toBe(1.4142135623730951);
    expect(M.floor(-1.5)).toBe(-2);
    expect(M.ceil(-0.5)).toBe(-0);
    expect(Object.is(M.ceil(-0.5), -0)).toBe(true);
    expect(M.ceil(1.2)).toBe(2);
  });

  it('PI y E son las constantes de Java', () => {
    expect(M.PI).toBe(3.141592653589793);
    expect(M.E).toBe(2.718281828459045);
  });

  it('random() usa la semilla visible: dos fuentes con la misma semilla dan el mismo número, siempre en [0, 1)', () => {
    const a = M.random(new FuenteDeAleatorios(321n));
    const b = M.random(new FuenteDeAleatorios(321n));
    expect(a).toBe(b);
    expect(a >= 0 && a < 1).toBe(true);
  });

  it('pow queda «No disponible» hasta que el puerto de fdlibm esté verificado contra el oráculo (ADR 009): nunca el Math.pow de JavaScript', () => {
    expect(() => M.pow(10, -4)).toThrow(NoDisponibleEnEjecucion);
  });
});
