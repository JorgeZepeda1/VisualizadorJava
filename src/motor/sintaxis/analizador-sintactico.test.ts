// RED de la tarea 0.12 (rebanada vertical — motor mínimo, design.md §2.3). Cubre exactamente la
// gramática Programa→Clase→Main→Bloque→println(literal), incluidos los modificadores opcionales
// (design.md §2.3: "{ 'public' | 'static' | 'final' }") y el caso de más de una sentencia.
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { analizarPrograma } from './analizador-sintactico.ts';
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';
import type { NodoImpresion } from './ast.ts';

function analizar(fuente: string) {
  return analizarPrograma(tokenizar(fuente));
}

describe('analizarPrograma', () => {
  it('analiza el programa dorado u3-hola-mundo completo', () => {
    const fuente = [
      'public class MiPrograma {',
      '    public static void main(String[] args) {',
      '        System.out.println("Hola, mundo");',
      '    }',
      '}',
    ].join('\n');

    const programa = analizar(fuente);

    expect(programa.clase.nombre).toBe('MiPrograma');
    expect(programa.clase.main.parametro).toBe('args');
    expect(programa.clase.main.cuerpo.sentencias).toHaveLength(1);
    const [sentencia] = programa.clase.main.cuerpo.sentencias as NodoImpresion[];
    expect(sentencia.tipo).toBe('impresion');
    expect(sentencia.argumento.valor).toBe('Hola, mundo');
  });

  it('acepta una clase sin "public" y modificadores de main en otro orden (triangulación)', () => {
    const fuente =
      'class OtraClase { static public void main(String[] parametros) { System.out.println("otra"); } }';
    const programa = analizar(fuente);
    const [sentencia] = programa.clase.main.cuerpo.sentencias as NodoImpresion[];
    expect(programa.clase.nombre).toBe('OtraClase');
    expect(programa.clase.main.parametro).toBe('parametros');
    expect(sentencia.argumento.valor).toBe('otra');
  });

  it('acepta varias sentencias println dentro del mismo bloque, en orden', () => {
    const fuente =
      'class C { public static void main(String[] a) { System.out.println("uno"); System.out.println("dos"); } }';
    const programa = analizar(fuente);
    const valores = (programa.clase.main.cuerpo.sentencias as NodoImpresion[]).map(
      (s) => s.argumento.valor,
    );
    expect(valores).toEqual(['uno', 'dos']);
  });

  it('lanza ErrorDeCompilacion con rango si falta el punto y coma', () => {
    const fuente = 'class C { public static void main(String[] a) { System.out.println("x") } }';
    expect(() => analizar(fuente)).toThrow(ErrorDeCompilacion);
  });

  it('lanza ErrorDeCompilacion si el programa está vacío (falta la clase)', () => {
    expect(() => analizar('')).toThrow(ErrorDeCompilacion);
  });
});
