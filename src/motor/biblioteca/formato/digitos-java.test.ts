// RED de la tarea 2.3 (REQ-BIB-002 parte 1, ADR 008): `digitosJava(x)` reproduce los dígitos que imprime `Double.toString` de JDK 17 — NO los "más cortos" de
// JS ni de JDK 19+. Los valores esperados de abajo salieron del JDK 17.0.18 real (design.md §4.2 «verificado en diseño» y los conjuntos de `corpus/datos/double-tostring/`,
// que `pruebas/diferencial/biblioteca/double-tostring.test.ts` recorre completos); aquí quedan los casos que la especificación nombra.
import { describe, expect, it } from 'vitest';
import { potenciaDeDos } from '../numeros/potencia-de-dos.ts';
import { digitosJava } from './digitos-java.ts';

describe('digitosJava — resto de normales (clase 5): dígitos más cortos que redondean al mismo valor', () => {
  it('0.1 → 1 × 10^-1 y 123.456 → 123456 × 10^2 (los ceros finales no cuentan)', () => {
    expect(digitosJava(0.1)).toEqual({ digitos: '1', exponente: -1 });
    expect(digitosJava(123.456)).toEqual({ digitos: '123456', exponente: 2 });
  });

  it('0.1 + 0.2 conserva los 17 dígitos que Java imprime (0.30000000000000004)', () => {
    expect(digitosJava(0.1 + 0.2)).toEqual({ digitos: '30000000000000004', exponente: -1 });
  });

  it('1/3 → 3333333333333333 (16 dígitos) y 2/3 → 6666666666666666', () => {
    expect(digitosJava(1 / 3)).toEqual({ digitos: '3333333333333333', exponente: -1 });
    expect(digitosJava(2 / 3)).toEqual({ digitos: '6666666666666666', exponente: -1 });
  });
});

describe('digitosJava — banda de enteros [2^53, 2^63) (clase 2): dígitos exactos menos 0–2 finales con HALF_UP', () => {
  it('2^60 pierde un dígito: 1.15292150460684698E18 (exponente binario 60 → k = 1)', () => {
    expect(digitosJava(potenciaDeDos(60))).toEqual({ digitos: '115292150460684698', exponente: 18 });
  });

  it('-21347700531594670.0 (valor absoluto) → 21347700531594672 con 17 dígitos (exponente binario 54 → k = 0)', () => {
    expect(digitosJava(21347700531594670)).toEqual({ digitos: '21347700531594672', exponente: 16 });
  });

  it('un entero por debajo de 2^53 se imprime exacto: 9007199254740991 conserva sus 16 dígitos', () => {
    expect(digitosJava(9007199254740991)).toEqual({ digitos: '9007199254740991', exponente: 15 });
  });
});

describe('digitosJava — empates exactos en el borde (clase 4): el valor exacto, no el "más corto"', () => {
  it('1e23 → 9.999999999999999E22 (el más corto, 1E23, cae exacto en el borde y Java lo excluye)', () => {
    expect(digitosJava(1e23)).toEqual({ digitos: '9999999999999999', exponente: 22 });
  });

  it('2.1e22 → 2.0999999999999998E22', () => {
    expect(digitosJava(2.1e22)).toEqual({ digitos: '20999999999999998', exponente: 22 });
  });
});

describe('digitosJava — potencias de dos (clase 3): intervalo asimétrico', () => {
  it('2^-24 → 5.9604644775390625E-8 (el más corto de JS terminaría en …063)', () => {
    expect(digitosJava(potenciaDeDos(-24))).toEqual({ digitos: '59604644775390625', exponente: -8 });
  });

  it('2^-25 → 2.9802322387695312E-8: con empate decimal exacto Java no redondea hacia arriba', () => {
    expect(digitosJava(potenciaDeDos(-25))).toEqual({ digitos: '29802322387695312', exponente: -8 });
  });
});

describe('digitosJava — subnormales (clase 1)', () => {
  it('Double.MIN_VALUE → 4.9E-324 (el más corto sería 5E-324)', () => {
    expect(digitosJava(Number.MIN_VALUE)).toEqual({ digitos: '49', exponente: -324 });
  });

  it('un normal grande no se confunde: Double.MAX_VALUE → 1.7976931348623157E308', () => {
    expect(digitosJava(Number.MAX_VALUE)).toEqual({ digitos: '17976931348623157', exponente: 308 });
  });

  it('2 × MIN_VALUE y 20 × MIN_VALUE redondean a la potencia de diez siguiente: 1.0E-323 y 1.0E-322 (no 9.9E-324 ni 9.9E-323)', () => {
    // El intervalo de estos subnormales llega estrictamente a 10^k+1, y Java arranca la generación una posición más arriba.
    expect(digitosJava(2 * Number.MIN_VALUE)).toEqual({ digitos: '1', exponente: -323 });
    expect(digitosJava(20 * Number.MIN_VALUE)).toEqual({ digitos: '1', exponente: -322 });
  });

  it('otros múltiplos de MIN_VALUE siguen la regla de los dos dígitos: 3 × MIN_VALUE → 1.5E-323', () => {
    expect(digitosJava(3 * Number.MIN_VALUE)).toEqual({ digitos: '15', exponente: -323 });
  });
});

describe('digitosJava — el desbordamiento de `long` de JDK 17 con exponente binario 84 (el «residual» de design.md §4.2)', () => {
  // Para x en [2^84, 2^85) el divisor es 10·5^25 < 2^63, pero `b + m` puede pasar de 2^63: la comparación sale falsa y Java trunca en vez de redondear.
  it('0x453d04ffce09b504 → 3.5082457001091195E25 (el valor verificado del JDK; el más cercano sería …196)', () => {
    expect(digitosJava(Number(new DataView(bitsABuffer(0x453d04ffce09b504n)).getFloat64(0)))).toEqual({ digitos: '35082457001091195', exponente: 25 });
  });

  it('0x4530bb476162eec8 → 2.0227212382393635E25 (trunca; …636 es más cercano)', () => {
    expect(digitosJava(Number(new DataView(bitsABuffer(0x4530bb476162eec8n)).getFloat64(0)))).toEqual({ digitos: '20227212382393635', exponente: 25 });
  });

  it('con otros exponentes binarios (83, 84 sin desbordamiento, 85) el redondeo es el normal', () => {
    expect(digitosJava(potenciaDeDos(84) * 1.5)).toEqual({ digitos: '290142196707511', exponente: 25 });
    expect(digitosJava(potenciaDeDos(85) * 1.3)).toEqual({ digitos: '50291314095968575', exponente: 25 });
    expect(digitosJava(potenciaDeDos(83) * 1.7)).toEqual({ digitos: '16441391146758956', exponente: 25 });
  });
});

function bitsABuffer(bits: bigint): ArrayBuffer {
  const buffer = new ArrayBuffer(8);
  new DataView(buffer).setBigUint64(0, bits);
  return buffer;
}
