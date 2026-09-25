// Prueba unitaria de TablaDeLineas (design.md §1.2: "Rango, tabla de líneas (desplazamiento ↔
// línea/columna)"). RED de la tarea 0.12 (rebanada vertical — motor mínimo): este módulo no
// existe todavía.
import { describe, expect, it } from 'vitest';
import { TablaDeLineas } from './tabla-de-lineas.ts';

describe('TablaDeLineas', () => {
  it('ubica el primer carácter de un texto de una sola línea en línea 1, columna 1', () => {
    const tabla = new TablaDeLineas('Hola');
    expect(tabla.ubicar(0)).toEqual({ linea: 1, columna: 1 });
  });

  it('ubica un desplazamiento a media línea en la columna correcta (1-based)', () => {
    const tabla = new TablaDeLineas('Hola');
    expect(tabla.ubicar(2)).toEqual({ linea: 1, columna: 3 });
  });

  it('ubica el primer carácter de la segunda línea en línea 2, columna 1', () => {
    const tabla = new TablaDeLineas('ab\ncd');
    expect(tabla.ubicar(3)).toEqual({ linea: 2, columna: 1 });
  });

  it('ubica el propio salto de línea como el último carácter de su línea', () => {
    const tabla = new TablaDeLineas('ab\ncd');
    expect(tabla.ubicar(2)).toEqual({ linea: 1, columna: 3 });
  });

  it('distingue tres líneas distintas dentro del mismo texto', () => {
    const tabla = new TablaDeLineas('uno\ndos\ntres');
    expect(tabla.ubicar(0)).toEqual({ linea: 1, columna: 1 }); // 'u'
    expect(tabla.ubicar(4)).toEqual({ linea: 2, columna: 1 }); // 'd'
    expect(tabla.ubicar(9)).toEqual({ linea: 3, columna: 2 }); // 'r' de "tres"
  });
});
