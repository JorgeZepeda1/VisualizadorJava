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
