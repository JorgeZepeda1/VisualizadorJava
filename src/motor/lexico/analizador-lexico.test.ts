// RED de la tarea 0.12 (rebanada vertical — motor mínimo, design.md §2.3 subconjunto de
// Programa/Clase/Main/Bloque/println). Cubre exactamente los tokens que necesita esa gramática:
// palabras clave, identificadores, cadenas, puntuación, comentarios y fin de archivo.
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
