// RED de la tarea R0.8 (REQ-PANT-002, PQ-2, ADR 017): la navegación fija «Paso a paso · Libro · Ejemplos». La sección actual se marca con `aria-current="page"` (y, en la hoja de estilos, con algo más
// que el color); «Libro» solo aparece cuando hay al menos un tema publicado. Cambiar de sección es solo avisar: no pierde el programa ni la traza (eso lo garantiza el reductor).
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navegacion } from './Navegacion.tsx';

describe('<Navegacion/> — «Paso a paso · Libro · Ejemplos»', () => {
  it('es una navegación con nombre y, sin temas publicados, ofrece «Paso a paso» y «Ejemplos» (sin «Libro»)', () => {
    render(<Navegacion seccionActual="paso-a-paso" hayTemasPublicados={false} alIr={() => undefined} />);
    const nav = screen.getByRole('navigation', { name: 'Secciones del visualizador' });
    expect(Array.from(nav.querySelectorAll('button')).map((boton) => boton.textContent)).toEqual(['Paso a paso', 'Ejemplos']);
    expect(screen.queryByRole('button', { name: 'Libro' })).toBeNull();
  });

  it('con al menos un tema publicado aparecen las tres, en este orden', () => {
    render(<Navegacion seccionActual="paso-a-paso" hayTemasPublicados alIr={() => undefined} />);
    const nav = screen.getByRole('navigation', { name: 'Secciones del visualizador' });
    expect(Array.from(nav.querySelectorAll('button')).map((boton) => boton.textContent)).toEqual(['Paso a paso', 'Libro', 'Ejemplos']);
  });

  it('solo la sección actual lleva `aria-current="page"`', () => {
    for (const seccion of ['paso-a-paso', 'libro', 'ejemplos'] as const) {
      const { unmount } = render(<Navegacion seccionActual={seccion} hayTemasPublicados alIr={() => undefined} />);
      const actuales = screen.getAllByRole('button').filter((boton) => boton.getAttribute('aria-current') === 'page');
      expect(actuales, seccion).toHaveLength(1);
      expect(actuales[0]?.getAttribute('data-seccion'), seccion).toBe(seccion);
      unmount();
    }
  });

  it('elegir otra sección avisa cuál, con el ratón o con el teclado', async () => {
    const alIr = vi.fn();
    const usuario = userEvent.setup();
    render(<Navegacion seccionActual="paso-a-paso" hayTemasPublicados={false} alIr={alIr} />);
    await usuario.click(screen.getByRole('button', { name: 'Ejemplos' }));
    expect(alIr).toHaveBeenLastCalledWith('ejemplos');
    screen.getByRole('button', { name: 'Paso a paso' }).focus();
    await usuario.keyboard('{Enter}');
    expect(alIr).toHaveBeenLastCalledWith('paso-a-paso');
  });
});
