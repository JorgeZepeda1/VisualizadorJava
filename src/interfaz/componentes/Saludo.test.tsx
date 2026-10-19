// RED de la tarea R0.8 (REQ-PANT-001, PQ-2, ADR 017): las puertas del saludo. El robot paso a paso saluda en el globo y, bajo él, el alumno elige por dónde empezar: «Leer un tema», «Ver un ejemplo paso a
// paso» o «Probar mi programa». Cada puerta lleva el ACCESORIO del robot que ayuda ahí (el libro, el puntero ▶, la lupa) y no su cara, y aparece solo si su destino tiene contenido (eso lo decide
// `presentacion/ranura.ts`: este componente pinta las puertas que recibe). Se opera con teclado y la primera puerta puede recibir el foco inicial.
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { puertasDelSaludo } from '../../presentacion/index.ts';
import { Saludo } from './Saludo.tsx';

describe('<Saludo/> — las puertas del saludo', () => {
  it('es un grupo con nombre que ofrece las tres puertas cuando hay un tema publicado', () => {
    render(<Saludo puertas={puertasDelSaludo({ hayTemasPublicados: true })} alElegir={() => undefined} />);
    const grupo = screen.getByRole('group', { name: '¿Por dónde quieres empezar?' });
    const botones = Array.from(grupo.querySelectorAll('button')).map((boton) => boton.textContent);
    expect(botones).toEqual(['Leer un tema', 'Ver un ejemplo paso a paso', 'Probar mi programa']);
  });

  it('sin ningún tema publicado «Leer un tema» no aparece y las otras dos sí', () => {
    render(<Saludo puertas={puertasDelSaludo({ hayTemasPublicados: false })} alElegir={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'Leer un tema' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver un ejemplo paso a paso' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Probar mi programa' })).toBeTruthy();
  });

  it('cada puerta lleva el accesorio de su robot como dibujo decorativo (el texto del botón ya dice a dónde lleva)', () => {
    render(<Saludo puertas={puertasDelSaludo({ hayTemasPublicados: true })} alElegir={() => undefined} />);
    const accesorios = screen.getAllByRole('button').map((boton) => {
      const icono = boton.querySelector('[data-icono-accesorio]');
      return { accesorio: icono?.getAttribute('data-icono-accesorio'), decorativo: icono?.getAttribute('aria-hidden') };
    });
    expect(accesorios).toEqual([
      { accesorio: 'libro-abierto', decorativo: 'true' },
      { accesorio: 'puntero', decorativo: 'true' },
      { accesorio: 'lupa', decorativo: 'true' },
    ]);
  });

  it('las puertas no dibujan robots: la zona del robot sigue teniendo uno solo', () => {
    const { container } = render(<Saludo puertas={puertasDelSaludo({ hayTemasPublicados: true })} alElegir={() => undefined} />);
    expect(container.querySelectorAll('[data-personaje]')).toHaveLength(0);
  });

  it('elegir una puerta con el ratón avisa cuál', async () => {
    const alElegir = vi.fn();
    render(<Saludo puertas={puertasDelSaludo({ hayTemasPublicados: true })} alElegir={alElegir} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ver un ejemplo paso a paso' }));
    expect(alElegir).toHaveBeenCalledWith('ver-un-ejemplo');
  });

  it('también se elige solo con el teclado: Tab hasta la puerta y Enter', async () => {
    const alElegir = vi.fn();
    const usuario = userEvent.setup();
    render(<Saludo puertas={puertasDelSaludo({ hayTemasPublicados: false })} alElegir={alElegir} />);
    await usuario.tab();
    await usuario.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Probar mi programa' }));
    await usuario.keyboard('{Enter}');
    expect(alElegir).toHaveBeenCalledWith('probar-mi-programa');
  });

  it('la primera puerta recibe la referencia para el foco inicial', () => {
    const refPrimera = createRef<HTMLButtonElement>();
    render(<Saludo puertas={puertasDelSaludo({ hayTemasPublicados: false })} alElegir={() => undefined} refPrimera={refPrimera} />);
    expect(refPrimera.current).toBe(screen.getByRole('button', { name: 'Ver un ejemplo paso a paso' }));
  });
});
