// RED de la tarea 4.12 (REQ-VIS-012): los controles de reproducción — reiniciar, fin, reproducir/pausa y un deslizador «Paso X de Y» — operables solo con teclado: flechas izquierda/derecha para atrás/adelante,
// Inicio/Fin para los extremos y espacio para reproducir o pausar (cuando el foco NO está en un campo de texto). Cada botón lleva su palabra. En la tarea R0.9 (REQ-PANT-003) «Anterior» y «Siguiente» se
// mudaron a la ranura bajo el globo (`RanuraDeAcciones`) y la velocidad a «Ajustes de la clase»: aquí quedan solo los ATAJOS de las flechas. En la R0.10 (REQ-PANT-004) el total solo se dice si se conoce.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BarraControles, type PropiedadesBarraControles } from './BarraControles.tsx';

function propiedades(parcial: Partial<PropiedadesBarraControles> = {}): PropiedadesBarraControles {
  return {
    paso: 5,
    total: 12,
    totalMostrado: 12,
    reproduciendo: false,
    alReiniciar: vi.fn(),
    alAnterior: vi.fn(),
    alSiguiente: vi.fn(),
    alFin: vi.fn(),
    alReproducirOPausar: vi.fn(),
    alIrAlPaso: vi.fn(),
    ...parcial,
  };
}

describe('<BarraControles/> — botones', () => {
  it('tiene los tres botones que quedan, cada uno con su palabra, y ya no repite Anterior ni Siguiente (están bajo el globo)', () => {
    render(<BarraControles {...propiedades()} />);
    for (const nombre of [/reiniciar/i, /fin/i, /reproducir/i]) {
      expect(screen.getByRole('button', { name: nombre })).toBeTruthy();
    }
    expect(screen.queryByRole('button', { name: /anterior/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /siguiente/i })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Velocidad' })).toBeNull();
  });

  it('cada botón llama a su acción', async () => {
    const p = propiedades();
    const usuario = userEvent.setup();
    render(<BarraControles {...p} />);
    await usuario.click(screen.getByRole('button', { name: /reiniciar/i }));
    await usuario.click(screen.getByRole('button', { name: /fin/i }));
    await usuario.click(screen.getByRole('button', { name: /reproducir/i }));
    expect(p.alReiniciar).toHaveBeenCalledTimes(1);
    expect(p.alFin).toHaveBeenCalledTimes(1);
    expect(p.alReproducirOPausar).toHaveBeenCalledTimes(1);
  });

  it('mientras reproduce, el botón dice «Pausa»', () => {
    render(<BarraControles {...propiedades({ reproduciendo: true })} />);
    expect(screen.getByRole('button', { name: /pausa/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /reproducir/i })).toBeNull();
  });

  it('en el paso 0 no se puede reiniciar', () => {
    render(<BarraControles {...propiedades({ paso: 0 })} />);
    expect((screen.getByRole('button', { name: /reiniciar/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /fin/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('en el último paso no se puede ir al fin ni reproducir', () => {
    render(<BarraControles {...propiedades({ paso: 12 })} />);
    expect((screen.getByRole('button', { name: /fin/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /reproducir/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /reiniciar/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('anuncia sus atajos de teclado', () => {
    render(<BarraControles {...propiedades()} />);
    expect(screen.getByRole('button', { name: /reiniciar/i }).getAttribute('aria-keyshortcuts')).toBe('Home');
    expect(screen.getByRole('button', { name: /fin/i }).getAttribute('aria-keyshortcuts')).toBe('End');
    expect(screen.getByRole('button', { name: /reproducir/i }).getAttribute('aria-keyshortcuts')).toBe('Space');
  });
});

describe('<BarraControles/> — los atajos de teclado se ven (no solo en un título que aparece con el ratón)', () => {
  it('muestra la ayuda de atajos a la vista y el grupo de controles la usa como descripción', () => {
    render(<BarraControles {...propiedades()} />);
    const ayuda = screen.getByText(/^Atajos: flecha izquierda y derecha/);
    expect(ayuda).toBeTruthy();
    const grupo = screen.getByRole('group', { name: 'Controles de reproducción' });
    expect(grupo.getAttribute('aria-describedby')).toBe(ayuda.id);
  });
});

describe('<BarraControles/> — la posición', () => {
  it('muestra «Paso 5 de 12» cuando se conoce el total', () => {
    render(<BarraControles {...propiedades()} />);
    expect(screen.getAllByText('Paso 5 de 12').length).toBeGreaterThan(0);
  });

  // REQ-PANT-004 (panel 1, H9): mientras el motor calcula, espera un dato o se detuvo por seguridad el total sería una cifra provisional («de 100001»): solo se dice el paso actual.
  it('si el total no se conoce, dice solo «Paso 5» y el deslizador conserva su rango para navegar lo ya calculado', () => {
    render(<BarraControles {...propiedades({ totalMostrado: null })} />);
    expect(screen.getAllByText('Paso 5').length).toBeGreaterThan(0);
    expect(screen.queryByText('Paso 5 de 12')).toBeNull();
    const deslizador = screen.getByRole('slider', { name: 'Posición en el programa' }) as HTMLInputElement;
    expect(deslizador.max).toBe('12');
    expect(deslizador.getAttribute('aria-valuetext')).toBe('Paso 5');
  });

  it('el deslizador tiene nombre, rango 0..total y dice «Paso X de Y» a los lectores de pantalla', () => {
    render(<BarraControles {...propiedades()} />);
    const deslizador = screen.getByRole('slider', { name: 'Posición en el programa' }) as HTMLInputElement;
    expect(deslizador.min).toBe('0');
    expect(deslizador.max).toBe('12');
    expect(deslizador.value).toBe('5');
    expect(deslizador.getAttribute('aria-valuetext')).toBe('Paso 5 de 12');
  });

  it('mover el deslizador salta a ese paso', () => {
    const p = propiedades();
    render(<BarraControles {...p} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '9' } });
    expect(p.alIrAlPaso).toHaveBeenCalledExactlyOnceWith(9);
  });
});

describe('<BarraControles/> — atajos de teclado (REQ-VIS-012)', () => {
  it('flecha derecha avanza y flecha izquierda retrocede, igual que los botones', async () => {
    const p = propiedades();
    const usuario = userEvent.setup();
    render(<BarraControles {...p} />);
    await usuario.keyboard('{ArrowRight}');
    await usuario.keyboard('{ArrowLeft}');
    expect(p.alSiguiente).toHaveBeenCalledTimes(1);
    expect(p.alAnterior).toHaveBeenCalledTimes(1);
  });

  it('Inicio reinicia y Fin salta al último paso', async () => {
    const p = propiedades();
    const usuario = userEvent.setup();
    render(<BarraControles {...p} />);
    await usuario.keyboard('{Home}');
    await usuario.keyboard('{End}');
    expect(p.alReiniciar).toHaveBeenCalledTimes(1);
    expect(p.alFin).toHaveBeenCalledTimes(1);
  });

  it('la barra espaciadora reproduce o pausa', async () => {
    const p = propiedades();
    render(<BarraControles {...p} />);
    await userEvent.setup().keyboard(' ');
    expect(p.alReproducirOPausar).toHaveBeenCalledTimes(1);
  });

  it('con el foco en un campo de texto las teclas son del campo: no navegan', async () => {
    const p = propiedades();
    const usuario = userEvent.setup();
    render(
      <>
        <input data-testid="campo" />
        <BarraControles {...p} />
      </>,
    );
    await usuario.click(screen.getByTestId('campo'));
    await usuario.keyboard('hola {ArrowLeft}{ArrowRight}{Home}{End}');
    expect(p.alSiguiente).not.toHaveBeenCalled();
    expect(p.alAnterior).not.toHaveBeenCalled();
    expect(p.alReiniciar).not.toHaveBeenCalled();
    expect(p.alFin).not.toHaveBeenCalled();
    expect(p.alReproducirOPausar).not.toHaveBeenCalled();
  });

  it('con el foco en un botón, la barra espaciadora activa ese botón y no reproduce además', async () => {
    const p = propiedades();
    const usuario = userEvent.setup();
    render(<BarraControles {...p} />);
    screen.getByRole('button', { name: /reiniciar/i }).focus();
    await usuario.keyboard(' ');
    expect(p.alReiniciar).toHaveBeenCalledTimes(1);
    expect(p.alReproducirOPausar).not.toHaveBeenCalled();
  });

  it('con el foco en el deslizador las flechas son del deslizador', async () => {
    const p = propiedades();
    render(<BarraControles {...p} />);
    screen.getByRole('slider').focus();
    await userEvent.setup().keyboard('{ArrowRight}');
    expect(p.alSiguiente).not.toHaveBeenCalled();
  });

  it('al desmontarse deja de escuchar el teclado', async () => {
    const p = propiedades();
    const { unmount } = render(<BarraControles {...p} />);
    unmount();
    await userEvent.setup().keyboard('{ArrowRight}');
    expect(p.alSiguiente).not.toHaveBeenCalled();
  });

  it('una tecla con Ctrl o Alt no se toma como atajo (es del navegador)', () => {
    const p = propiedades();
    render(<BarraControles {...p} />);
    fireEvent.keyDown(document.body, { key: 'ArrowRight', ctrlKey: true });
    fireEvent.keyDown(document.body, { key: 'ArrowLeft', altKey: true });
    expect(p.alSiguiente).not.toHaveBeenCalled();
    expect(p.alAnterior).not.toHaveBeenCalled();
  });
});
