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

// Tarea 1.8 (pendiente heredado): `sintaxis` ahora acepta `print` y cualquier expresión como
// argumento de impresión (no solo `println` de un literal-cadena), pero la EJECUCIÓN real de esos
// casos sigue perteneciendo al lote 2 (2.16+) — igual que if/while/for/declaraciones desde 1.5.
// `generarIr` debe seguir fallando limpio (D2: nunca un resultado inventado), nunca producir una
// IR silenciosamente incorrecta para lo que todavía no ejecuta de verdad.
describe('generarIr — print/println generalizados (1.8): solo println(literal-cadena) tiene IR real todavía', () => {
  it('"System.out.print(...)" (con literal) NO tiene IR real todavía: falla limpio, no produce una impresión sin salto silenciosa', () => {
    expect(() => irDe('class C { public static void main(String[] a) { System.out.print("x"); } }')).toThrow();
  });

  it('"System.out.println(x)" con una VARIABLE como argumento tampoco tiene IR real todavía', () => {
    expect(() =>
      irDe('class C { public static void main(String[] a) { int x = 5; System.out.println(x); } }'),
    ).toThrow();
  });

  it('control: "System.out.println("literal")" (el único caso real) sigue bajando a IR exactamente igual que antes', () => {
    const ir = irDe('class C { public static void main(String[] a) { System.out.println("sigue igual"); } }');
    expect(ir.sentencias).toEqual([{ tipo: 'impresion', texto: 'sigue igual' }]);
  });
});
