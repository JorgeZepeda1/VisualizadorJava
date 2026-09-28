// RED de la tarea 0.12: compilador.ts orquesta léxico+sintaxis→IR y fija ResultadoCompilacion
// (design.md §1.3). Las 5 pasadas completas (atribución, alcanzabilidad…) llegan en la tarea 1.14;
// aquí solo léxico+sintaxis, que ya es un subconjunto real de esas pasadas.
import { describe, expect, it } from 'vitest';
import { compilar } from './compilador.ts';

describe('compilar', () => {
  it('compila el programa dorado y produce programa + vista', () => {
    const fuente = [
      'public class MiPrograma {',
      '    public static void main(String[] args) {',
      '        System.out.println("Hola, mundo");',
      '    }',
      '}',
      '',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error('se esperaba ok:true');
    expect(resultado.programa.ir.sentencias).toEqual([{ tipo: 'impresion', texto: 'Hola, mundo' }]);
    expect(resultado.vista.fuente).toBe(fuente);
  });

  it('devuelve ok:false con un Problema real (categoría y línea del token inesperado) si no compila', () => {
    // Falta el ";" tras println("x"); el analizador reporta la posición del token inesperado
    // ("}" en la línea 4) — la calibración exacta de javac ("al final del token anterior",
    // design.md §2.6) es trabajo de las tareas 1.1-1.6, fuera del alcance de esta rebanada.
    const fuente = [
      'class C {',
      '  public static void main(String[] a) {',
      '    System.out.println("x")',
      '  }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.categoria).toBe('error-compilacion');
    expect(resultado.problema.linea).toBe(4);
    expect(resultado.adicionales).toBe(0);
  });

  it('nunca lanza: hasta un carácter no reconocido se convierte en Problema, nunca en excepción (D2)', () => {
    expect(() => compilar('#$%')).not.toThrow();
    const resultado = compilar('#$%');
    expect(resultado.ok).toBe(false);
  });
});

// Corrección obligatoria (sub-lote 1-B, regla 5 de CLAUDE.md: nunca un resultado inventado).
// Verificado contra javac 17 real: "int x = 08;" y "int y = 09;" NO compilan ("';' expected");
// "int z = 010;" SÍ compila y vale 8 (octal real, ya cubierto como NO-DISP desde la tarea 1.1).
describe('compilar — "08"/"09" nunca se aceptan como decimal (corrección de la simplificación de 1-A)', () => {
  function programaCon(declaracion: string): string {
    return `class C { public static void main(String[] a) { ${declaracion} } }`;
  }

  it('"int x = 08;" jamás compila con el valor 8: el mismo veredicto que javac (rechazo)', () => {
    const resultado = compilar(programaCon('int x = 08;'));
    expect(resultado.ok).toBe(false);
  });

  it('"int y = 09;" tampoco compila (triangulación del mismo dígito inválido, 9)', () => {
    const resultado = compilar(programaCon('int y = 09;'));
    expect(resultado.ok).toBe(false);
  });

  it('un octal válido como "010" sigue compilando distinto: NO-DISP, no error de sintaxis (contraste)', () => {
    // No debe confundirse con el caso anterior: 010 es octal BIEN formado (sin dígitos 8/9), así
    // que javac SÍ lo acepta (con el valor 8) — el visualizador lo marca "no disponible" (ya
    // cubierto desde 1.1), nunca lo rechaza como si fuera un error de sintaxis.
    const resultado = compilar(programaCon('int z = 010;'));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.categoria).not.toBe('error-compilacion');
  });
});
