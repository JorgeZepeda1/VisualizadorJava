// RED de la tarea 0.12 (rebanada vertical — motor mínimo, design.md §2.3 subconjunto de
// Programa/Clase/Main/Bloque/println) + tarea 1.1 (léxico completo, design.md §2.6): literales
// numéricos, char, palabras clave nuevas, operadores y reconocimiento NO-DISP léxico (ADR 003).
import { describe, expect, it } from 'vitest';
import { tokenizar } from './analizador-lexico.ts';
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';

describe('tokenizar', () => {
  it('tokeniza el programa dorado u3-hola-mundo completo', () => {
    const fuente = [
      'public class MiPrograma {',
      '    public static void main(String[] args) {',
      '        System.out.println("Hola, mundo");',
      '    }',
      '}',
      '',
    ].join('\n');

    const tokens = tokenizar(fuente);
    const textos = tokens.map((t) => t.texto);

    expect(textos).toEqual([
      'public', 'class', 'MiPrograma', '{',
      'public', 'static', 'void', 'main', '(', 'String', '[', ']', 'args', ')', '{',
      'System', '.', 'out', '.', 'println', '(', '"Hola, mundo"', ')', ';',
      '}',
      '}',
      '',
    ]);
    expect(tokens.at(-1)?.tipo).toBe('eof');
  });

  it('clasifica cada palabra reservada como palabra-clave y el resto como identificador', () => {
    const tokens = tokenizar('public class final static void Foo');
    const tipos = tokens.slice(0, -1).map((t) => t.tipo);
    expect(tipos).toEqual([
      'palabra-clave', 'palabra-clave', 'palabra-clave',
      'palabra-clave', 'palabra-clave', 'identificador',
    ]);
  });

  it('decodifica el literal de cadena y expone el valor ya sin comillas', () => {
    const tokens = tokenizar('"hola"');
    expect(tokens[0]).toMatchObject({ tipo: 'cadena', texto: '"hola"', valor: 'hola' });
  });

  it('ignora comentarios de línea y de bloque', () => {
    const tokens = tokenizar('// comentario\nclass /* otro */ Foo');
    const textos = tokens.slice(0, -1).map((t) => t.texto);
    expect(textos).toEqual(['class', 'Foo']);
  });

  it('registra el rango de cada token (desplazamientos reales, no arbitrarios)', () => {
    const tokens = tokenizar('class Foo');
    expect(tokens[0].rango).toEqual({ inicio: 0, fin: 5 });
    expect(tokens[1].rango).toEqual({ inicio: 6, fin: 9 });
  });

  it('lanza ErrorDeCompilacion con rango ante un carácter no reconocido', () => {
    try {
      tokenizar('class § Foo');
      expect.unreachable('debía lanzar');
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorDeCompilacion);
      expect((error as ErrorDeCompilacion).rango.inicio).toBe(6);
    }
  });
});

describe('tokenizar — palabras clave nuevas de la tarea 1.1', () => {
  it('reconoce import, package, return y los tipos primitivos como palabra-clave', () => {
    const tokens = tokenizar('import package return int long double boolean char true false instanceof new');
    const tipos = tokens.slice(0, -1).map((t) => t.tipo);
    expect(tipos).toEqual(Array(12).fill('palabra-clave'));
  });

  it('String, Scanner y Random siguen siendo identificador (no son palabra reservada de Java)', () => {
    const tokens = tokenizar('String Scanner Random');
    expect(tokens.slice(0, -1).map((t) => t.tipo)).toEqual(['identificador', 'identificador', 'identificador']);
  });
});

describe('tokenizar — literales numéricos (tarea 1.1, design.md §2.1)', () => {
  it('produce un token "entero" con el valor decodificado', () => {
    const [token] = tokenizar('42');
    expect(token).toMatchObject({ tipo: 'entero', texto: '42', valorEntero: 42n });
  });

  it('produce un token "largo" para el sufijo L', () => {
    const [token] = tokenizar('100L');
    expect(token).toMatchObject({ tipo: 'largo', texto: '100L', valorEntero: 100n });
  });

  it('produce un token "doble" para un literal con punto decimal', () => {
    const [token] = tokenizar('3.14');
    expect(token).toMatchObject({ tipo: 'doble', texto: '3.14', valorDoble: 3.14 });
  });

  it('el rango del token numérico cubre exactamente el literal', () => {
    const tokens = tokenizar('  1_000L;');
    expect(tokens[0]).toMatchObject({ tipo: 'largo', rango: { inicio: 2, fin: 8 } });
    expect(tokens[1]).toMatchObject({ tipo: 'puntuacion', texto: ';' });
  });
});

describe('tokenizar — literal char (tarea 1.1)', () => {
  it('produce un token "caracter" con el valor decodificado', () => {
    const [token] = tokenizar("'x'");
    expect(token).toMatchObject({ tipo: 'caracter', texto: "'x'", valorCaracter: 'x' });
  });

  it('decodifica un escape válido dentro del char', () => {
    const [token] = tokenizar(String.raw`'\n'`);
    expect(token).toMatchObject({ tipo: 'caracter', valorCaracter: '\n' });
  });
});

describe('tokenizar — operadores (tarea 1.1, design.md §2.4)', () => {
  it('tokeniza los operadores aritméticos y de asignación de un carácter', () => {
    const tokens = tokenizar('+ - * / % = < > ! & | ^ ~ ? :');
    expect(tokens.slice(0, -1).map((t) => t.texto)).toEqual([
      '+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~', '?', ':',
    ]);
    expect(tokens.slice(0, -1).every((t) => t.tipo === 'puntuacion')).toBe(true);
  });

  it('prefiere el operador MÁS LARGO en cada posición (maximal munch)', () => {
    const tokens = tokenizar('a >>>= b >>> c >>= d >> e >= f > g');
    const textos = tokens.filter((t) => t.tipo === 'puntuacion').map((t) => t.texto);
    expect(textos).toEqual(['>>>=', '>>>', '>>=', '>>', '>=', '>']);
  });

  it('tokeniza ==, !=, &&, ||, ++, -- y las asignaciones compuestas soportadas', () => {
    const tokens = tokenizar('a == b != c && d || e++ f-- g += 1 h -= 1 i *= 1 j /= 1 k %= 1');
    const textos = tokens.filter((t) => t.tipo === 'puntuacion').map((t) => t.texto);
    expect(textos).toEqual(['==', '!=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=']);
  });
});

describe('tokenizar — reconocimiento NO-DISP léxico (tarea 1.1, ADR 003, design.md §2.6)', () => {
  it('un literal octal (010) produce un token "no-soportado" y el análisis sigue', () => {
    const tokens = tokenizar('int n = 010 ;');
    const noSoportado = tokens.find((t) => t.tipo === 'no-soportado');
    expect(noSoportado).toMatchObject({ codigo: 'literal-octal-no-soportado', texto: '010' });
    expect(noSoportado?.nota).toBe('Java lo lee como octal: 8');
    // Sigue tokenizando lo que viene después (";"), no aborta.
    expect(tokens.at(-2)?.texto).toBe(';');
  });

  it('un literal hexadecimal (0x1F) produce un token "no-soportado"', () => {
    const tokens = tokenizar('0x1F');
    expect(tokens[0]).toMatchObject({ tipo: 'no-soportado', codigo: 'literal-hexadecimal-no-soportado' });
  });

  it('un escape no soportado dentro de una cadena produce un token "no-soportado" para toda la cadena', () => {
    const tokens = tokenizar(String.raw`"antes\rdespues"`);
    expect(tokens[0]).toMatchObject({ tipo: 'no-soportado', codigo: 'escape-no-soportado' });
  });

  it('un \\uXXXX bien formado fuera de una cadena/char produce un token "no-soportado" y sigue', () => {
    // Barra invertida doblada a propósito (ver discovery de esta sesión): en tiempo de ejecución
    // Node la decodifica a UNA barra invertida real seguida de "u0041", que es la fuente Java que
    // se quiere tokenizar (el escape unicode fuera de cadenas del design.md §2.6).
    const fuente = `class \\u0041 { }`;
    const tokens = tokenizar(fuente);
    expect(tokens[0]).toMatchObject({ tipo: 'palabra-clave', texto: 'class' });
    expect(tokens[1]).toMatchObject({ tipo: 'no-soportado', codigo: 'escape-unicode-no-soportado' });
    expect(tokens[2]).toMatchObject({ tipo: 'puntuacion', texto: '{' });
  });
});
