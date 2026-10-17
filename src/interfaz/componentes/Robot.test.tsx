// RED de la tarea 4.11 (REQ-VIS-011): el robot — un dibujo SVG en línea (cero imágenes de red, ADR 014), con un rostro distinto para cada ánimo y una descripción en palabras. El movimiento (antena,
// parpadeo) vive en la hoja de estilos y se apaga con `prefers-reduced-motion`; aquí se prueba que el dibujo es el correcto y que nunca pide nada a la red.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Robot } from './Robot.tsx';

const ANIMOS = ['normal', 'esperando', 'feliz', 'preocupado', 'seguridad'] as const;

describe('<Robot/>', () => {
  it('es un dibujo SVG con una descripción en palabras', () => {
    render(<Robot animo="normal" />);
    const dibujo = screen.getByRole('img');
    expect(dibujo.tagName.toLowerCase()).toBe('svg');
    expect(dibujo.getAttribute('aria-label')).toBe('Un robot amable que te explica cada paso');
  });

  it('cada ánimo tiene su descripción y queda en un atributo para que el estilo lo anime', () => {
    const descripciones = ANIMOS.map((animo) => {
      const { unmount } = render(<Robot animo={animo} />);
      const dibujo = screen.getByRole('img');
      const resultado = { animo: dibujo.getAttribute('data-animo'), descripcion: dibujo.getAttribute('aria-label') };
      unmount();
      return resultado;
    });
    expect(descripciones.map((d) => d.animo)).toEqual([...ANIMOS]);
    expect(new Set(descripciones.map((d) => d.descripcion)).size).toBe(ANIMOS.length);
  });

  it('el rostro cambia con el ánimo, no solo el color: la boca y los ojos son otros trazos', () => {
    const rostros = ANIMOS.map((animo) => {
      const { container, unmount } = render(<Robot animo={animo} />);
      const rostro = container.querySelector('[data-rostro]')?.innerHTML ?? '';
      unmount();
      return rostro;
    });
    expect(new Set(rostros).size).toBe(ANIMOS.length);
  });

  it('no pide nada a la red: ni imágenes, ni referencias externas', () => {
    const { container } = render(<Robot animo="feliz" />);
    expect(container.querySelector('image')).toBeNull();
    expect(container.querySelector('use')).toBeNull();
    for (const elemento of Array.from(container.querySelectorAll('*'))) {
      for (const atributo of ['href', 'src', 'xlink:href']) {
        expect(elemento.getAttribute(atributo), atributo).toBeNull();
      }
    }
    expect(container.innerHTML).not.toMatch(/https?:/);
  });
});
