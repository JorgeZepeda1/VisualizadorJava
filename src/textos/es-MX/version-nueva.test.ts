// RED de la tarea 5.7 (REQ-PLAT-008): el aviso de que hay una versión nueva del visualizador. El texto vive en el catálogo (ADR 015). Dos cosas lo hacen especial: dice con claridad que recargar
// BORRA el programa del editor (el visualizador todavía no guarda lo que el alumno escribe, así que un aviso que solo dijera «recarga» le costaría el trabajo a quien lo pulse sin leer), y los dos
// botones llevan palabras, no solo un ícono.
import { describe, expect, it } from 'vitest';
import { textosVersionNueva } from './version-nueva.ts';

describe('textosVersionNueva — el aviso de «hay una versión nueva»', () => {
  it('avisa con el nombre del visualizador, en tuteo y sin jerga técnica (ni «service worker», ni «caché»)', () => {
    expect(textosVersionNueva.aviso()).toBe('Hay una versión nueva del visualizador.');
    const todo = [textosVersionNueva.aviso(), textosVersionNueva.advertencia(), textosVersionNueva.botonRecargar(), textosVersionNueva.botonDespues()].join(' ');
    expect(todo).not.toMatch(/service worker|caché|cache|PWA|refresh/i);
  });

  it('advierte que al recargar el programa del editor vuelve al de ejemplo y ofrece una salida: copiarlo antes', () => {
    expect(textosVersionNueva.advertencia()).toBe(
      'Al recargar, el programa que tienes en el editor vuelve al de ejemplo. Si quieres conservar el tuyo, cópialo antes.',
    );
  });

  it('los dos botones dicen qué hacen con palabras', () => {
    expect(textosVersionNueva.botonRecargar()).toBe('Recargar ahora');
    expect(textosVersionNueva.botonDespues()).toBe('Más tarde');
  });
});
