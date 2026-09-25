// RED de la tarea 0.12: IR mínima (design.md §1.2, §3.1) — baja el AST de la rebanada vertical a
// una lista de sentencias de impresión con el texto ya resuelto.
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { analizarPrograma } from '../sintaxis/analizador-sintactico.ts';
import { generarIr } from './generar-ir.ts';

function irDe(fuente: string) {
  return generarIr(analizarPrograma(tokenizar(fuente)));
}

describe('generarIr', () => {
  it('baja una única sentencia println a una ImpresionIr con el texto decodificado', () => {
    const ir = irDe(
      'class C { public static void main(String[] a) { System.out.println("Hola, mundo"); } }',
    );
    expect(ir.sentencias).toEqual([{ tipo: 'impresion', texto: 'Hola, mundo' }]);
  });

  it('preserva el orden y el contenido de varias sentencias (triangulación)', () => {
    const ir = irDe(
      'class C { public static void main(String[] a) { System.out.println("uno"); System.out.println("dos"); } }',
    );
    expect(ir.sentencias).toEqual([
      { tipo: 'impresion', texto: 'uno' },
      { tipo: 'impresion', texto: 'dos' },
    ]);
  });

  it('decodifica escapes dentro del literal antes de bajarlo a IR', () => {
    const ir = irDe(
      String.raw`class C { public static void main(String[] a) { System.out.println("a\nb"); } }`,
    );
    expect(ir.sentencias).toEqual([{ tipo: 'impresion', texto: 'a\nb' }]);
  });
});
