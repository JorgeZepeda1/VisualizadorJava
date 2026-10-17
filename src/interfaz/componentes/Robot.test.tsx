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

  // C5 del panel 1: las cejas con el extremo interior MÁS BAJO que el exterior se leen como enojo, justo cuando el alumno se equivoca. La preocupación amable es lo contrario: el extremo interior MÁS ALTO.
  describe('el rostro preocupado se ve preocupado, no enojado (C5)', () => {
    const CENTRO_DE_LA_CARA = 60;

    /** Las cejas: los trazos rectos `M x y L x y` del rostro, con su extremo interior (el más cercano al centro de la cara) y el exterior. */
    function cejasDe(animo: (typeof ANIMOS)[number]): { interior: { x: number; y: number }; exterior: { x: number; y: number } }[] {
      const { container, unmount } = render(<Robot animo={animo} />);
      const trazos = Array.from(container.querySelectorAll('[data-rostro] path')).map((trazo) => trazo.getAttribute('d') ?? '');
      unmount();
      return trazos.flatMap((d) => {
        const recta = /^M\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*L\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/.exec(d);
        if (recta === null) return [];
        const a = { x: Number(recta[1]), y: Number(recta[2]) };
        const b = { x: Number(recta[3]), y: Number(recta[4]) };
        return Math.abs(a.x - CENTRO_DE_LA_CARA) < Math.abs(b.x - CENTRO_DE_LA_CARA) ? [{ interior: a, exterior: b }] : [{ interior: b, exterior: a }];
      });
    }

    it('tiene dos cejas, una de cada lado de la cara', () => {
      const cejas = cejasDe('preocupado');
      expect(cejas).toHaveLength(2);
      expect(cejas.filter((c) => c.exterior.x < CENTRO_DE_LA_CARA)).toHaveLength(1);
      expect(cejas.filter((c) => c.exterior.x > CENTRO_DE_LA_CARA)).toHaveLength(1);
    });

    it('el extremo interior de cada ceja está MÁS ARRIBA que el exterior (en SVG, y menor): cejas de preocupación, no de enojo', () => {
      for (const ceja of cejasDe('preocupado')) {
        expect(ceja.interior.y, `interior en y=${ceja.interior.y}, exterior en y=${ceja.exterior.y}`).toBeLessThan(ceja.exterior.y);
      }
    });

    it('las cejas quedan sobre los ojos y dentro de la cabeza (no tapan los ojos ni salen del dibujo)', () => {
      for (const ceja of cejasDe('preocupado')) {
        for (const punto of [ceja.interior, ceja.exterior]) {
          expect(punto.y).toBeGreaterThan(26); // la cabeza empieza en y=26
          expect(punto.y).toBeLessThan(50); // los ojos (cy=56, r=6) empiezan en y=50
        }
      }
    });
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
