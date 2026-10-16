// RED de la tarea 2.16 (design.md §3.3, §6.1): `VistaPrograma` es lo que la interfaz conoce del programa compilado — el código, las variables
// (ranuras) y los nodos que `Paso.nodo` nombra, cada uno con su línea, sus variables vivas y su plan de evaluación. Son datos simples
// (viajan por `postMessage`): no lleva el árbol IR ni funciones.
import { describe, expect, it } from 'vitest';
import { compilar } from '../compilador.ts';
import { construirVistaPrograma } from './vista-programa.ts';

const FUENTE = ['public class Demo {', '  public static void main(String[] args) {', '    int a = 1;', '    int b = a + 2;', '  }', '}', ''].join('\n');

describe('construirVistaPrograma', () => {
  it('lleva el código fuente, una ranura por variable y un nodo por paso con su línea y su plan', () => {
    const resultado = compilar(FUENTE);
    if (!resultado.ok) throw new Error('se esperaba que compilara');
    const vista = construirVistaPrograma(resultado.programa.ir, FUENTE);
    expect(vista.fuente).toBe(FUENTE);
    expect(vista.ranuras.map((r) => `${r.nombre}:${r.tipo}`)).toEqual(['a:int', 'b:int']);
    expect(vista.nodos.map((n) => `${n.clase}@${n.linea}`)).toEqual(['declaracion@3', 'declaracion@4']);
    expect(vista.nodos[1].plan.map((p) => p.forma)).toEqual(['lectura', 'constante', 'aritmetica']);
    expect(vista.nodos[1].vivas).toEqual([0, 1]);
  });

  it('la vista que entrega compilar() es esa misma (no solo el código)', () => {
    const resultado = compilar(FUENTE);
    if (!resultado.ok) throw new Error('se esperaba que compilara');
    expect(resultado.vista).toEqual(construirVistaPrograma(resultado.programa.ir, FUENTE));
  });

  it('es serializable: son solo datos simples (sobrevive a un viaje por JSON, como a uno por postMessage, sin perder nada)', () => {
    const resultado = compilar(FUENTE);
    if (!resultado.ok) throw new Error('se esperaba que compilara');
    expect(JSON.parse(JSON.stringify(resultado.vista))).toEqual(resultado.vista);
  });
});
