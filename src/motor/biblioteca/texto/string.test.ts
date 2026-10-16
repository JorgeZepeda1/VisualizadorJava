// RED de la tarea 2.9 (REQ-BIB-006, design.md §4.5): `String` — identidad de objeto, los métodos del catálogo con las excepciones exactas del JDK 17, y las trampas de JavaScript (`trim`,
// mayúsculas, `replace`). Los valores esperados salieron del JDK 17.0.18 (`pruebas/diferencial/biblioteca/cadenas.test.ts` compara ~15 000 operaciones y todos los puntos de código).
import { describe, expect, it } from 'vitest';
import { ExcepcionJava } from '../excepciones/excepcion-java.ts';
import { NoDisponibleEnEjecucion } from '../no-disponible.ts';
import { CadenaJava, PoolDeCadenas, nuevaCadena } from './cadena-java.ts';
import { StringJava as S } from './string.ts';

const c = (texto: string): CadenaJava => nuevaCadena(texto);

function excepcionDe(accion: () => unknown): ExcepcionJava {
  try {
    accion();
  } catch (error) {
    if (error instanceof ExcepcionJava) return error;
    throw error;
  }
  throw new Error('se esperaba una ExcepcionJava y no se lanzó nada');
}

describe('identidad de String (REQ-BIB-006)', () => {
  it('los literales internados comparten instancia; una cadena construida en ejecución es una instancia nueva aunque tenga el mismo texto', () => {
    const pool = new PoolDeCadenas();
    const literal = pool.internar('hola');
    expect(pool.internar('hola')).toBe(literal);
    const leida = nuevaCadena('hola');
    expect(leida).not.toBe(literal);
    expect(S.equals(leida, literal)).toBe(true);
  });

  it('latin1 depende del contenido: "abc" y "ñandú" sí; "€bc" y cualquier cadena con un carácter > U+00FF no', () => {
    expect(c('abc').latin1).toBe(true);
    expect(c('ñandú').latin1).toBe(true);
    expect(c('€bc').latin1).toBe(false);
    expect(c('😀').latin1).toBe(false);
    expect(c('').latin1).toBe(true);
  });

  it('substring(0), el trim sin nada que recortar y el reemplazo sin coincidencias devuelven LA MISMA instancia (== da true)', () => {
    const s = c('hola mundo');
    expect(S.substring(s, 0)).toBe(s);
    expect(S.substring(s, 0, s.texto.length)).toBe(s);
    expect(S.trim(s)).toBe(s);
    expect(S.replace(s, c('xyz'), c('q'))).toBe(s);
    expect(S.substring(s, 1)).not.toBe(s);
    expect(S.toUpperCase(c('ABC'))).not.toBe(c('ABC'));
  });
});

describe('charAt y substring: excepciones que dependen del coder (REQ-BIB-006)', () => {
  it('Latin-1: "abc".charAt(5) → String index out of range: 5, con marcos de StringLatin1', () => {
    const excepcion = excepcionDe(() => S.charAt(c('abc'), 5));
    expect(excepcion.clase).toBe('java.lang.StringIndexOutOfBoundsException');
    expect(excepcion.mensaje).toBe('String index out of range: 5');
    expect(excepcion.sitio).toBe('String.charAt/latin1');
  });

  it('UTF-16: "€bc".charAt(5) → index 5, length 3, con marcos de StringUTF16', () => {
    const excepcion = excepcionDe(() => S.charAt(c('€bc'), 5));
    expect(excepcion.mensaje).toBe('index 5, length 3');
    expect(excepcion.sitio).toBe('String.charAt/utf16');
    expect(excepcionDe(() => S.charAt(c('€bc'), -1)).mensaje).toBe('index -1, length 3');
    expect(excepcionDe(() => S.charAt(c('abc'), -1)).mensaje).toBe('String index out of range: -1');
  });

  it('un índice válido devuelve el char como número (el intérprete lo tipa char)', () => {
    expect(S.charAt(c('abc'), 1)).toBe(98);
    expect(S.charAt(c('€bc'), 0)).toBe(0x20ac);
  });

  it('substring fuera de rango NO depende del coder: begin/end/length en los dos casos', () => {
    expect(excepcionDe(() => S.substring(c('abc'), 1, 10)).mensaje).toBe('begin 1, end 10, length 3');
    expect(excepcionDe(() => S.substring(c('€bc'), 1, 10)).mensaje).toBe('begin 1, end 10, length 3');
    expect(excepcionDe(() => S.substring(c('abc'), 5)).mensaje).toBe('begin 5, end 3, length 3');
    expect(excepcionDe(() => S.substring(c('abcdef'), 4, 2)).mensaje).toBe('begin 4, end 2, length 6');
  });
});

describe('trim, comparaciones y búsquedas', () => {
  it('trim recorta todo lo ≤ U+0020 (incluido \\u0000) y NO el espacio de no separación U+00A0 (al revés que JavaScript)', () => {
    expect(S.trim(c('  hola \t\n')).texto).toBe('hola');
    expect(S.trim(c('\u0000x\u0000')).texto).toBe('x');
    expect(S.trim(c(' hola')).texto).toBe(' hola');
  });

  it('compareTo devuelve la diferencia del primer carácter distinto, o la de las longitudes (no solo -1/0/1)', () => {
    expect(S.compareTo(c('abc'), c('hola mundo'))).toBe(-7);
    expect(S.compareTo(c('abc'), c('abcde'))).toBe(-2);
    expect(S.compareTo(c('b'), c('a'))).toBe(1);
    expect(S.compareTo(c('abc'), c('abc'))).toBe(0);
  });

  it('equalsIgnoreCase compara carácter a carácter con las tablas de Java', () => {
    expect(S.equalsIgnoreCase(c('Hola'), c('hOLA'))).toBe(true);
    expect(S.equalsIgnoreCase(c('ÁRBOL'), c('árbol'))).toBe(true);
    expect(S.equalsIgnoreCase(c('hola'), c('hola '))).toBe(false);
  });

  it('indexOf, contains, startsWith, endsWith e isEmpty', () => {
    expect(S.indexOf(c('hola mundo'), c('mundo'))).toBe(5);
    expect(S.indexOf(c('hola'), c('x'))).toBe(-1);
    expect(S.indexOf(c('abcabc'), c('c'), 3)).toBe(5);
    expect(S.indexOfChar(c('hola'), 0x6f)).toBe(1);
    expect(S.contains(c('hola'), c('ol'))).toBe(true);
    expect(S.startsWith(c('hola'), c('ho'))).toBe(true);
    expect(S.endsWith(c('hola'), c('la'))).toBe(true);
    expect(S.isEmpty(c(''))).toBe(true);
  });

  it('replace es literal (sin $& ni $1 de JavaScript) y con una cadena vacía inserta entre todos los caracteres', () => {
    expect(S.replace(c('a.b.c'), c('.'), c('$&')).texto).toBe('a$&b$&c');
    expect(S.replace(c('abc'), c(''), c('-')).texto).toBe('-a-b-c-');
    expect(S.replaceChar(c('hola'), 0x6f, 0x30).texto).toBe('h0la');
  });
});

describe('toUpperCase / toLowerCase (locale es_MX)', () => {
  it('mayúsculas con casos especiales de Java: "straße" → "STRASSE"; minúsculas de "İstanbul" → "i̇stanbul" (i + U+0307)', () => {
    expect(S.toUpperCase(c('straße')).texto).toBe('STRASSE');
    expect(S.toLowerCase(c('İstanbul')).texto).toBe('i̇stanbul');
    expect(S.toUpperCase(c('ñandú árbol')).texto).toBe('ÑANDÚ ÁRBOL');
  });

  it('la sigma final: "ΟΔΟΣ ΣΑΣ" → "οδος σας" (ς solo al final de palabra) y "Σ" suelta → "σ"', () => {
    expect(S.toLowerCase(c('ΟΔΟΣ ΣΑΣ')).texto).toBe('οδος σας');
    expect(S.toLowerCase(c('Σ')).texto).toBe('σ');
    expect(S.toLowerCase(c('ΑΣΑ')).texto).toBe('ασα');
  });

  it('las letras fuera del plano básico también cambian (Deseret 𐐨 → 𐐀) y un emoji se queda igual', () => {
    expect(S.toUpperCase(c('\u{10428}')).texto).toBe('\u{10400}');
    expect(S.toUpperCase(c('hola 😀')).texto).toBe('HOLA 😀');
  });

  it('si no cambia nada, devuelve la misma instancia', () => {
    const mayusculas = c('HOLA');
    expect(S.toUpperCase(mayusculas)).toBe(mayusculas);
    const minusculas = c('hola 123');
    expect(S.toLowerCase(minusculas)).toBe(minusculas);
  });
});

describe('String.valueOf y new String', () => {
  it('valueOf convierte según el tipo y crea una instancia NUEVA; new String(texto) también', () => {
    expect(S.valueOf('int', 5).texto).toBe('5');
    expect(S.valueOf('double', 2.5).texto).toBe('2.5');
    expect(S.valueOf('char', 65).texto).toBe('A');
    const original = c('hola');
    expect(S.nueva(original)).not.toBe(original);
    expect(S.nueva(original).texto).toBe('hola');
  });
});

describe('lo que no está verificado es «No disponible»', () => {
  it('la clase NoDisponibleEnEjecucion existe para las rutas sin caracterizar', () => {
    expect(new NoDisponibleEnEjecucion('mayusculas-fuera-del-plano-basico').motivo).toBe('mayusculas-fuera-del-plano-basico');
  });
});
