// RED de la tarea 4.12 (REQ-VIS-012, ADR 015): los textos de la barra de reproducción. Las etiquetas de los botones llevan el glifo Y la palabra (nada solo por
// símbolo). La posición «Paso X de Y» pasó a `pantalla.ts` (R0.10: solo dice el total cuando se conoce).
import { describe, expect, it } from 'vitest';
import { textosControles } from './controles.ts';

describe('textosControles: la barra de reproducción', () => {
  it('cada botón lleva su palabra (no solo el glifo)', () => {
    expect(textosControles.botonReiniciar()).toBe('⏮ Reiniciar');
    expect(textosControles.botonReproducir()).toBe('⏵ Reproducir');
    expect(textosControles.botonPausar()).toBe('⏸ Pausa');
    expect(textosControles.botonFin()).toBe('Fin ⏭');
  });

  it('el deslizador se llama por su posición', () => {
    expect(textosControles.etiquetaDelDeslizador()).toBe('Posición en el programa');
  });

  it('hay cinco velocidades con nombre, de la más lenta a la más rápida', () => {
    expect([1, 2, 3, 4, 5].map((nivel) => textosControles.nombreDeVelocidad(nivel as 1 | 2 | 3 | 4 | 5))).toEqual([
      'Muy lenta',
      'Lenta',
      'Normal',
      'Rápida',
      'Muy rápida',
    ]);
  });

  it('el grupo de controles tiene nombre y avisa los atajos de teclado', () => {
    expect(textosControles.etiquetaDelGrupo()).toBe('Controles de reproducción');
    expect(textosControles.ayudaDeAtajos()).toBe('Atajos: flecha izquierda y derecha para ir atrás y adelante, Inicio y Fin para ir a los extremos, y espacio para reproducir o pausar.');
  });
});
