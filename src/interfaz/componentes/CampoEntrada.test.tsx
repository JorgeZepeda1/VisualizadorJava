// RED de la tarea 4.7 (REQ-VIS-009): el campo donde el alumno escribe el dato que el programa espera. Toma el foco al aparecer (el robot dice «escríbelo en la consola»), se envía con Enter o
// con el botón, y un Enter vacío también es un dato (un renglón en blanco para `nextLine()`). Cuando el programa sigue, el contenedor lo quita.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampoEntrada } from './CampoEntrada.tsx';

describe('<CampoEntrada/>', () => {
  it('tiene un nombre accesible y toma el foco al aparecer', () => {
    render(<CampoEntrada alEnviar={() => {}} />);
    const campo = screen.getByRole('textbox', { name: 'Escribe tu dato y pulsa Enter' });
    expect(document.activeElement).toBe(campo);
  });

  it('Enter envía lo escrito y limpia el campo', async () => {
    const alEnviar = vi.fn();
    render(<CampoEntrada alEnviar={alEnviar} />);
    const campo = screen.getByRole('textbox');
    await userEvent.setup().type(campo, '50{Enter}');
    expect(alEnviar).toHaveBeenCalledExactlyOnceWith('50');
    expect((campo as HTMLInputElement).value).toBe('');
  });

  it('triangulación: otro dato con espacios por dentro se envía tal cual', async () => {
    const alEnviar = vi.fn();
    render(<CampoEntrada alEnviar={alEnviar} />);
    await userEvent.setup().type(screen.getByRole('textbox'), 'Juan Pérez{Enter}');
    expect(alEnviar).toHaveBeenCalledExactlyOnceWith('Juan Pérez');
  });

  it('el botón «Enviar» hace lo mismo que Enter', async () => {
    const alEnviar = vi.fn();
    const usuario = userEvent.setup();
    render(<CampoEntrada alEnviar={alEnviar} />);
    await usuario.type(screen.getByRole('textbox'), '7');
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(alEnviar).toHaveBeenCalledExactlyOnceWith('7');
  });

  it('un Enter con el campo vacío envía un renglón en blanco (válido para nextLine)', async () => {
    const alEnviar = vi.fn();
    render(<CampoEntrada alEnviar={alEnviar} />);
    await userEvent.setup().type(screen.getByRole('textbox'), '{Enter}');
    expect(alEnviar).toHaveBeenCalledExactlyOnceWith('');
  });

  it('el campo no revisa el dato: lo que no sea un número también se envía (el que decide es el programa)', async () => {
    const alEnviar = vi.fn();
    render(<CampoEntrada alEnviar={alEnviar} />);
    await userEvent.setup().type(screen.getByRole('textbox'), 'abc{Enter}');
    expect(alEnviar).toHaveBeenCalledExactlyOnceWith('abc');
  });
});
