// RED de la tarea 2.2 (REQ-BIB-001): `char` es un número de 0 a 65535 (JLS 4.2.1); se promueve a `int` en la aritmética y se estrecha con `& 0xFFFF`.
import { describe, expect, it } from 'vitest';
import { caracterATexto, caracterDeLiteral, sumarChar } from './caracter.ts';

describe('caracter: el valor numérico de un char', () => {
  it("'A' es 65, 'a' es 97 y '€' es 8364 (una unidad UTF-16)", () => {
    expect(caracterDeLiteral('A')).toBe(65);
    expect(caracterDeLiteral('a')).toBe(97);
    expect(caracterDeLiteral('€')).toBe(8364);
  });

  it('un char suelto de un par de sustitutos conserva su unidad (\\uD83D = 55357)', () => {
    expect(caracterDeLiteral('\uD83D')).toBe(0xd83d);
  });
});

describe('caracter: aritmética de char con la vuelta de 16 bits', () => {
  it("'A' + 1 como char es 'B' (66) y 65535 + 1 da la vuelta a 0", () => {
    expect(sumarChar(65, 1)).toBe(66);
    expect(sumarChar(65535, 1)).toBe(0);
    expect(sumarChar(0, -1)).toBe(65535);
  });

  it('caracterATexto da el texto de una sola unidad', () => {
    expect(caracterATexto(65)).toBe('A');
    expect(caracterATexto(8364)).toBe('€');
    expect(caracterATexto(0)).toBe('\u0000');
  });
});
