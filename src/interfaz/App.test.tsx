// RED de la tarea 0.14 (rebanada vertical — interfaz mínima). Ejercita el pipeline real completo:
// React → ClienteTrabajador (transporte en proceso bajo jsdom — mismo motor real, sin mocks de
// negocio) → compilar/crearEjecucion → Traza → Consola. El programa dorado ya viene precargado en
// el editor (design.md §6.2 "Primera visita: editor con un «Hola, mundo»"); interactuar con
// CodeMirror vía teclado/pegado real se prueba en pruebas/e2e/ (tarea 0.15) — ADR 013 ya anota que
// jsdom no hace layout para eso.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App.tsx';

describe('<App/>', () => {
  it('con el programa dorado precargado, al pulsar Visualizar aparece "Hola, mundo" en la consola', async () => {
    const usuario = userEvent.setup();
    render(<App />);

    await usuario.click(screen.getByRole('button', { name: /visualizar/i }));

    await vi.waitFor(() => {
      expect(screen.getByTestId('consola').textContent).toContain('Hola, mundo');
    });
  });

  it('◀ Anterior vacía la consola y ▶ Siguiente la vuelve a llenar (navegación real de pasos)', async () => {
    const usuario = userEvent.setup();
    render(<App />);
    await usuario.click(screen.getByRole('button', { name: /visualizar/i }));
    await vi.waitFor(() => {
      expect(screen.getByTestId('consola').textContent).toContain('Hola, mundo');
    });

    await usuario.click(screen.getByRole('button', { name: /anterior/i }));
    expect(screen.getByTestId('consola').textContent).toBe('');

    await usuario.click(screen.getByRole('button', { name: /siguiente/i }));
    expect(screen.getByTestId('consola').textContent).toContain('Hola, mundo');
  });
});
