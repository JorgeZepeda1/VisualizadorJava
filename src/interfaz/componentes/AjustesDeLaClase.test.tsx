// RED de la tarea R0.8 (REQ-PANT-006, ADR 017): «Ajustes de la clase». El encabezado le muestra al alumno solo la navegación, el interruptor del modo reto (R1) y este botón; dentro están el modo proyector y la
// velocidad de reproducción. Cada ajuste tiene nombre accesible y dice su estado EN PALABRAS («Encendido» / «Apagado»), nunca solo con un color. Todo se opera con el teclado y Escape cierra el panel y
// devuelve el foco al botón.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AjustesDeLaClase, type PropiedadesAjustesDeLaClase } from './AjustesDeLaClase.tsx';

function ajustes(parcial: Partial<PropiedadesAjustesDeLaClase> = {}): PropiedadesAjustesDeLaClase {
  return { proyector: false, velocidad: 3, alCambiarProyector: () => undefined, alCambiarVelocidad: () => undefined, ...parcial };
}

describe('<AjustesDeLaClase/> — el botón y el panel', () => {
  it('empieza cerrado: un botón «Ajustes de la clase» que dice que está colapsado', () => {
    render(<AjustesDeLaClase {...ajustes()} />);
    const boton = screen.getByRole('button', { name: 'Ajustes de la clase' });
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('al abrirlo muestra el modo proyector y la velocidad, cada uno con su nombre', async () => {
    render(<AjustesDeLaClase {...ajustes()} />);
    const boton = screen.getByRole('button', { name: 'Ajustes de la clase' });
    await userEvent.setup().click(boton);

    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('group', { name: 'Ajustes de la clase' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: /Modo proyector/ })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Velocidad' })).toBeTruthy();
  });

  it('el estado del proyector se dice en palabras: «Apagado» y, encendido, «Encendido»', async () => {
    const { rerender } = render(<AjustesDeLaClase {...ajustes()} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ajustes de la clase' }));
    expect(screen.getByRole('switch', { name: 'Modo proyector: Apagado' })).toBeTruthy();

    rerender(<AjustesDeLaClase {...ajustes({ proyector: true })} />);
    const encendido = screen.getByRole('switch', { name: 'Modo proyector: Encendido' }) as HTMLInputElement;
    expect(encendido.checked).toBe(true);
  });

  it('encender el proyector solo con el teclado: abrir con Enter, ir con Tab al interruptor y pulsar espacio', async () => {
    const alCambiarProyector = vi.fn();
    const usuario = userEvent.setup();
    render(<AjustesDeLaClase {...ajustes({ alCambiarProyector })} />);

    screen.getByRole('button', { name: 'Ajustes de la clase' }).focus();
    await usuario.keyboard('{Enter}');
    await usuario.tab();
    expect(document.activeElement).toBe(screen.getByRole('switch', { name: /Modo proyector/ }));
    await usuario.keyboard(' ');
    expect(alCambiarProyector).toHaveBeenCalledWith(true);
  });

  it('cambiar la velocidad avisa el nivel elegido; ofrece los cinco niveles con su nombre', async () => {
    const alCambiarVelocidad = vi.fn();
    const usuario = userEvent.setup();
    render(<AjustesDeLaClase {...ajustes({ alCambiarVelocidad })} />);
    await usuario.click(screen.getByRole('button', { name: 'Ajustes de la clase' }));

    const selector = screen.getByRole('combobox', { name: 'Velocidad' }) as HTMLSelectElement;
    expect(Array.from(selector.options).map((opcion) => opcion.textContent)).toEqual(['Muy lenta', 'Lenta', 'Normal', 'Rápida', 'Muy rápida']);
    expect(selector.value).toBe('3');
    await usuario.selectOptions(selector, '5');
    expect(alCambiarVelocidad).toHaveBeenCalledWith(5);
  });

  it('Escape cierra el panel y devuelve el foco al botón', async () => {
    const usuario = userEvent.setup();
    render(<AjustesDeLaClase {...ajustes()} />);
    const boton = screen.getByRole('button', { name: 'Ajustes de la clase' });
    await usuario.click(boton);
    screen.getByRole('switch', { name: /Modo proyector/ }).focus();

    await usuario.keyboard('{Escape}');

    expect(screen.queryByRole('switch')).toBeNull();
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(boton);
  });

  it('el botón vuelve a cerrar el panel', async () => {
    const usuario = userEvent.setup();
    render(<AjustesDeLaClase {...ajustes()} />);
    const boton = screen.getByRole('button', { name: 'Ajustes de la clase' });
    await usuario.click(boton);
    await usuario.click(boton);
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
