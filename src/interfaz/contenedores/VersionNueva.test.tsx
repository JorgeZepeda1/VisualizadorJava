// RED de la tarea 5.7 (REQ-PLAT-008): el contenedor que conecta el registro del service worker con el aviso. Siempre pinta la región `status` (un lector de pantalla anuncia de forma fiable lo que
// aparece DENTRO de una región viva que ya existía) y, cuando el registro avisa de una versión nueva, pone el aviso adentro. Aceptar activa la versión; «Más tarde» solo oculta el aviso.
// El registro se inyecta: aquí es un fake que expone el momento en que «llega» la versión nueva (el contrato real lo prueba `pwa/registro.test.ts` y, en un navegador de verdad, `actualizacion.spec.ts`).
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VersionNueva } from './VersionNueva.tsx';
import type { registrarServiceWorker } from '../pwa/registro.ts';

type Registrar = typeof registrarServiceWorker;

/** Un registro de mentira que guarda la función que el contenedor le pasa, para poder «publicar» una versión cuando la prueba quiera. */
function registroFalso(): { registrar: Registrar; publicarVersion: (aplicar: () => void) => void; detener: ReturnType<typeof vi.fn> } {
  const detener = vi.fn();
  let alHaberVersionNueva: ((aplicar: () => void) => void) | undefined;
  const registrar: Registrar = (_navegador, opciones) => {
    alHaberVersionNueva = opciones?.alHaberVersionNueva;
    return detener;
  };
  return {
    registrar,
    detener,
    publicarVersion: (aplicar) => {
      if (!alHaberVersionNueva) throw new Error('El contenedor no se registró');
      const avisar = alHaberVersionNueva;
      act(() => avisar(aplicar));
    },
  };
}

describe('<VersionNueva/>', () => {
  it('sin versión nueva solo hay la región de estado, vacía: no hay aviso ni botones', () => {
    const { registrar } = registroFalso();
    render(<VersionNueva registrar={registrar} />);

    expect(screen.getByRole('status').innerHTML).toBe('');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('cuando llega una versión nueva el aviso aparece DENTRO de la región de estado', () => {
    const { registrar, publicarVersion } = registroFalso();
    render(<VersionNueva registrar={registrar} />);

    publicarVersion(vi.fn());

    expect(screen.getByRole('status').textContent).toContain('Hay una versión nueva del visualizador.');
    expect(within(screen.getByRole('status')).getByRole('button', { name: 'Recargar ahora' }).textContent).toBe('Recargar ahora');
  });

  it('«Recargar ahora» activa la versión (llama a la función que dio el registro)', async () => {
    const { registrar, publicarVersion } = registroFalso();
    const aplicar = vi.fn();
    render(<VersionNueva registrar={registrar} />);
    publicarVersion(aplicar);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Recargar ahora' }));

    expect(aplicar).toHaveBeenCalledTimes(1);
  });

  it('«Más tarde» oculta el aviso sin activar nada', async () => {
    const { registrar, publicarVersion } = registroFalso();
    const aplicar = vi.fn();
    render(<VersionNueva registrar={registrar} />);
    publicarVersion(aplicar);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Más tarde' }));

    expect(screen.getByRole('status').innerHTML).toBe('');
    expect(aplicar).not.toHaveBeenCalled();
  });

  it('si después de «Más tarde» llega una versión todavía más nueva, el aviso vuelve y activa ESA', async () => {
    const { registrar, publicarVersion } = registroFalso();
    const primera = vi.fn();
    const segunda = vi.fn();
    render(<VersionNueva registrar={registrar} />);
    publicarVersion(primera);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Más tarde' }));

    publicarVersion(segunda);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Recargar ahora' }));

    expect(segunda).toHaveBeenCalledTimes(1);
    expect(primera).not.toHaveBeenCalled();
  });

  it('al desmontarse detiene la vigilancia del registro (el temporizador de cada hora)', () => {
    const { registrar, detener } = registroFalso();
    const { unmount } = render(<VersionNueva registrar={registrar} />);
    expect(detener).not.toHaveBeenCalled();

    unmount();

    expect(detener).toHaveBeenCalledTimes(1);
  });
});
