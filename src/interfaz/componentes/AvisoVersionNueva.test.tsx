// RED de la tarea 5.7 (REQ-PLAT-008, REQ-PLAT-005): el aviso de «hay una versión nueva». Presentacional puro: dice que hay una versión nueva, advierte que recargar borra el programa del editor y ofrece
// dos botones con palabras («Recargar ahora» / «Más tarde»), alcanzables con teclado. El texto sale del catálogo es-MX; el contenedor `VersionNueva` pone la región `status` que lo anuncia.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvisoVersionNueva } from './AvisoVersionNueva.tsx';
import { textosVersionNueva } from '../../textos/es-MX/version-nueva.ts';

describe('<AvisoVersionNueva/>', () => {
  it('dice que hay una versión nueva y advierte que recargar vuelve el editor al programa de ejemplo', () => {
    render(<AvisoVersionNueva alRecargar={vi.fn()} alDescartar={vi.fn()} />);

    const texto = document.body.textContent ?? '';
    expect(texto).toContain(textosVersionNueva.aviso());
    expect(texto).toContain(textosVersionNueva.advertencia());
  });

  it('«Recargar ahora» llama a alRecargar, y solo a ese', async () => {
    const alRecargar = vi.fn();
    const alDescartar = vi.fn();
    render(<AvisoVersionNueva alRecargar={alRecargar} alDescartar={alDescartar} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Recargar ahora' }));

    expect(alRecargar).toHaveBeenCalledTimes(1);
    expect(alDescartar).not.toHaveBeenCalled();
  });

  it('«Más tarde» llama a alDescartar, y solo a ese', async () => {
    const alRecargar = vi.fn();
    const alDescartar = vi.fn();
    render(<AvisoVersionNueva alRecargar={alRecargar} alDescartar={alDescartar} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Más tarde' }));

    expect(alDescartar).toHaveBeenCalledTimes(1);
    expect(alRecargar).not.toHaveBeenCalled();
  });

  it('se maneja solo con teclado: Tab llega a los dos botones y Enter activa el que tiene el foco', async () => {
    const alRecargar = vi.fn();
    render(<AvisoVersionNueva alRecargar={alRecargar} alDescartar={vi.fn()} />);
    const usuario = userEvent.setup();

    await usuario.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Recargar ahora' }));
    await usuario.keyboard('{Enter}');
    expect(alRecargar).toHaveBeenCalledTimes(1);

    await usuario.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Más tarde' }));
  });
});
