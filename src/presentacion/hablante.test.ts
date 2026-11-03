// RED de la tarea R0.6 (REQ-PANT-009, ADR 017): quién habla. En cada pantalla habla UN solo robot, siempre en la misma ranura junto al globo. Habla el revisor cuando el análisis del programa termina con un
// error de compilación, un aviso de fuera de alcance o un error de arranque (hoy: cuando hay un problema vigente en el globo); el robot del libro, en el libro; el robot paso a paso, en todo lo demás
// (incluidos el saludo y la galería). Las trampas de Java en un paso y «Ver explicación» llegan con el revisor de R3 y amplían esta regla. Puro, sin DOM.
import { describe, expect, it } from 'vitest';
import { derivarHablante } from './hablante.ts';
import type { Seccion } from './secciones.ts';

const SECCIONES: readonly Seccion[] = ['paso-a-paso', 'ejemplos', 'libro'];

describe('derivarHablante', () => {
  it('un error de compilación, un aviso de «no disponible» o un error de arranque en el globo → habla el revisor', () => {
    expect(derivarHablante({ seccion: 'paso-a-paso', hayProblema: true })).toBe('revisor');
  });

  it('sin problema, en el paso a paso (el saludo, la edición, cada paso, el reto) → habla el robot paso a paso', () => {
    expect(derivarHablante({ seccion: 'paso-a-paso', hayProblema: false })).toBe('paso-a-paso');
  });

  it('en el libro → habla el robot del libro', () => {
    expect(derivarHablante({ seccion: 'libro', hayProblema: false })).toBe('libro');
  });

  it('en la galería de ejemplos sigue hablando el paso a paso (la galería no tiene robot propio)', () => {
    expect(derivarHablante({ seccion: 'ejemplos', hayProblema: false })).toBe('paso-a-paso');
  });

  it('el libro manda sobre un problema que quedó pendiente en el editor: nunca hablan dos robots', () => {
    expect(derivarHablante({ seccion: 'libro', hayProblema: true })).toBe('libro');
  });

  it('para cada combinación de sección y problema habla exactamente uno de los tres', () => {
    const hablantes = SECCIONES.flatMap((seccion) => [true, false].map((hayProblema) => derivarHablante({ seccion, hayProblema })));
    expect(hablantes).toHaveLength(6);
    expect(hablantes.every((hablante) => hablante === 'paso-a-paso' || hablante === 'revisor' || hablante === 'libro')).toBe(true);
    expect(new Set(hablantes)).toEqual(new Set(['paso-a-paso', 'revisor', 'libro']));
  });
});
