// RED de la tarea 2.10 (REQ-BIB-007, ADR 010): `Character` con Unicode 13 (el de JDK 17), NO el del navegador. Los valores de abajo son los que el JDK 17.0.18 contestó; los 65 536
// `char` completos los compara `pruebas/diferencial/biblioteca/character.test.ts` contra `corpus/datos/caracteres/`.
import { describe, expect, it } from 'vitest';
import { digitoDecimal, isDigit, isLetter, isLetterOrDigit, isLowerCase, isUpperCase, isWhitespace, toLowerCase, toUpperCase } from './character.ts';

const codigo = (texto: string): number => texto.charCodeAt(0);

describe('Character — clasificación', () => {
  it('isDigit(\'7\') es true e isLetter(\'7\') es false (el escenario de REQ-BIB-007)', () => {
    expect(isDigit(codigo('7'))).toBe(true);
    expect(isLetter(codigo('7'))).toBe(false);
    expect(isLetterOrDigit(codigo('7'))).toBe(true);
  });

  it('una letra con acento y la eñe son letras; el signo "+" no es letra ni dígito', () => {
    expect(isLetter(codigo('é'))).toBe(true);
    expect(isLetter(codigo('ñ'))).toBe(true);
    expect(isLetterOrDigit(codigo('+'))).toBe(false);
    expect(isDigit(codigo('+'))).toBe(false);
  });

  it('mayúsculas y minúsculas: \'A\' es mayúscula, \'a\' minúscula, \'1\' ninguna', () => {
    expect(isUpperCase(codigo('A'))).toBe(true);
    expect(isLowerCase(codigo('A'))).toBe(false);
    expect(isLowerCase(codigo('ñ'))).toBe(true);
    expect(isUpperCase(codigo('1'))).toBe(false);
    expect(isLowerCase(codigo('1'))).toBe(false);
  });

  it('isWhitespace: espacio, tabulador y salto de línea sí; el espacio de no separación U+00A0 NO (a diferencia de \\s de JavaScript); U+001C sí', () => {
    expect(isWhitespace(0x20)).toBe(true);
    expect(isWhitespace(0x09)).toBe(true);
    expect(isWhitespace(0x0a)).toBe(true);
    expect(isWhitespace(0xa0)).toBe(false);
    expect(isWhitespace(0x1c)).toBe(true);
    expect(isWhitespace(0x2007)).toBe(false);
  });

  it('un dígito que no es ASCII también es dígito (arábigo-índico U+0663)', () => {
    expect(isDigit(0x0663)).toBe(true);
    expect(isLetterOrDigit(0x0663)).toBe(true);
  });
});

describe('Character.digit(c, 10) — el valor de un dígito Unicode', () => {
  it('ASCII, arábigo-índico, devanagari y de ancho completo dan su valor; lo que no es dígito da -1', () => {
    expect(digitoDecimal(codigo('7'))).toBe(7);
    expect(digitoDecimal(0x0663)).toBe(3);
    expect(digitoDecimal(0x096b)).toBe(5);
    expect(digitoDecimal(0xff11)).toBe(1);
    expect(digitoDecimal(codigo('a'))).toBe(-1);
    expect(digitoDecimal(codigo('+'))).toBe(-1);
  });
});

describe('Character — toUpperCase y toLowerCase (la versión de un char, sin casos especiales)', () => {
  it('\'a\' → \'A\', \'ñ\' → \'Ñ\', \'é\' → \'É\' y de vuelta', () => {
    expect(toUpperCase(codigo('a'))).toBe(codigo('A'));
    expect(toUpperCase(codigo('ñ'))).toBe(codigo('Ñ'));
    expect(toLowerCase(codigo('É'))).toBe(codigo('é'));
  });

  it('lo que no tiene mayúscula se queda igual: la ß (el JDK la deja como está en la versión de un char) y los dígitos', () => {
    expect(toUpperCase(codigo('ß'))).toBe(codigo('ß'));
    expect(toUpperCase(codigo('5'))).toBe(codigo('5'));
    expect(toLowerCase(codigo('5'))).toBe(codigo('5'));
  });

  it('los extremos de la tabla: char 0 y char 65535', () => {
    expect(isWhitespace(0)).toBe(false);
    expect(toUpperCase(0xffff)).toBe(0xffff);
    expect(isLetter(0xffff)).toBe(false);
  });
});
