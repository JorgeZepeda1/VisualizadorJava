// RED de la tarea 2.2 (REQ-BIB-001, REQ-SUB-002 casts de `long`, REQ-EJEC-005): conversiones primitivas de Java (JLS 5.1.2, 5.1.3, 5.6).
// Valores del JDK 17 real (Test05Casting y programas de `corpus/experimentos/ejecucion/`).
import { describe, expect, it } from 'vitest';
import {
  convertirNumero,
  doubleAChar,
  doubleAInt,
  doubleALong,
  intAChar,
  longAChar,
  longADouble,
  longAInt,
  promocionBinaria,
} from './conversiones.ts';
import { tipoDeOperadorAritmetico, type Tipo } from '../../semantica/tipos.ts';

describe('conversiones: double a int y a long saturan, NaN da 0 y se trunca hacia cero', () => {
  it('(int) 3.99 = 3, (int) -3.99 = -3, (int) -0.5 = 0', () => {
    expect(doubleAInt(3.99)).toBe(3);
    expect(doubleAInt(-3.99)).toBe(-3);
    expect(Object.is(doubleAInt(-0.5), 0)).toBe(true);
  });

  it('(int) 1e10 = Integer.MAX_VALUE, (int) -1e10 = Integer.MIN_VALUE, (int) NaN = 0, (int) Infinity = MAX', () => {
    expect(doubleAInt(1e10)).toBe(2147483647);
    expect(doubleAInt(-1e10)).toBe(-2147483648);
    expect(doubleAInt(Number.NaN)).toBe(0);
    expect(doubleAInt(Number.POSITIVE_INFINITY)).toBe(2147483647);
    expect(doubleAInt(Number.NEGATIVE_INFINITY)).toBe(-2147483648);
  });

  it('(long) 1e30 = Long.MAX_VALUE, (long) NaN = 0, (long) 1e18 es exacto, (long) -2.9 = -2', () => {
    expect(doubleALong(1e30)).toBe(9223372036854775807n);
    expect(doubleALong(-1e30)).toBe(-9223372036854775808n);
    expect(doubleALong(Number.NaN)).toBe(0n);
    expect(doubleALong(1e18)).toBe(1000000000000000000n);
    expect(doubleALong(-2.9)).toBe(-2n);
  });
});

describe('conversiones: long a int da la vuelta; a double redondea al más cercano', () => {
  it('(int) (long) 1e30 = -1 (primero satura a Long.MAX_VALUE y luego toma 32 bits)', () => {
    expect(longAInt(doubleALong(1e30))).toBe(-1);
  });

  it('(int) 4294967296L = 0, (int) 2147483648L = Integer.MIN_VALUE, (int) -1L = -1', () => {
    expect(longAInt(4294967296n)).toBe(0);
    expect(longAInt(2147483648n)).toBe(-2147483648);
    expect(longAInt(-1n)).toBe(-1);
  });

  it('(double) 9007199254740993L = 9007199254740992 (empate al par) y Long.MAX_VALUE a 2^63', () => {
    expect(longADouble(9007199254740993n)).toBe(9007199254740992);
    expect(longADouble(9223372036854775807n)).toBe(9223372036854775808);
  });
});

describe('conversiones: a char toma 16 bits (desde double, primero a int)', () => {
  it('(char) 65 = 65, (char) 65601 = 65, (char) -1 = 65535', () => {
    expect(intAChar(65)).toBe(65);
    expect(intAChar(65601)).toBe(65);
    expect(intAChar(-1)).toBe(65535);
  });

  it('(char) 97.9 = 97, (char) 1e10 = 65535 (satura a int y luego toma 16 bits), (char) 4294967297L = 1', () => {
    expect(doubleAChar(97.9)).toBe(97);
    expect(doubleAChar(1e10)).toBe(65535);
    expect(longAChar(4294967297n)).toBe(1);
  });
});

describe('conversiones: promoción numérica binaria (JLS 5.6.2)', () => {
  it('double gana a todo, long gana a int/char, el resto es int (char + char es int)', () => {
    expect(promocionBinaria('int', 'double')).toBe('double');
    expect(promocionBinaria('long', 'double')).toBe('double');
    expect(promocionBinaria('char', 'long')).toBe('long');
    expect(promocionBinaria('int', 'int')).toBe('int');
    expect(promocionBinaria('char', 'char')).toBe('int');
    expect(promocionBinaria('char', 'int')).toBe('int');
  });

  it('coincide con la que usa la atribución para tipar las expresiones, en los 16 pares numéricos', () => {
    const numericos = ['int', 'long', 'double', 'char'] as const;
    for (const a of numericos) {
      for (const b of numericos) {
        expect(promocionBinaria(a, b), `${a} y ${b}`).toBe(tipoDeOperadorAritmetico('-', a as Tipo, b as Tipo));
      }
    }
  });
});

describe('conversiones: convertirNumero hace el cast o el ensanchamiento entre dos tipos numéricos', () => {
  it('int a long y a double, long a double, char a int (ensanchamientos)', () => {
    expect(convertirNumero(5, 'int', 'long')).toBe(5n);
    expect(convertirNumero(5, 'int', 'double')).toBe(5);
    expect(convertirNumero(123456789012n, 'long', 'double')).toBe(123456789012);
    expect(convertirNumero(97, 'char', 'int')).toBe(97);
  });

  it('estrechamientos: double a int, long a int, int a char, double a char', () => {
    expect(convertirNumero(3.99, 'double', 'int')).toBe(3);
    expect(convertirNumero(4294967297n, 'long', 'int')).toBe(1);
    expect(convertirNumero(98, 'int', 'char')).toBe(98);
    expect(convertirNumero(66.5, 'double', 'char')).toBe(66);
  });

  it('el mismo tipo devuelve el mismo valor', () => {
    expect(convertirNumero(7n, 'long', 'long')).toBe(7n);
    expect(convertirNumero(2.5, 'double', 'double')).toBe(2.5);
  });
});
