// RED de la tarea 4.5 (REQ-VIS-002): el aviso de un problema lleva ícono y título propios para cada uno de los cuatro tipos —Error de compilación, No disponible en el visualizador, El programa
// se detuvo por un error, Se detuvo por seguridad—, así que el alumno distingue unos de otros sin depender del color. Además dice «y N más» cuando el motor encontró más avisos (pendiente de
// REQ-SUB-006). El texto del problema llega ya armado por la presentación; el subrayado en el editor se prueba en `editor/EditorJava.test.tsx`.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvisoProblema } from './AvisoProblema.tsx';

describe('<AvisoProblema/> — título e ícono de cada tipo', () => {
  it('un error de compilación en la línea 3 lleva el título «Error de compilación», no el de «No disponible»', () => {
    render(<AvisoProblema tipo="error-compilacion">{'Línea 3: Te falta un punto y coma.'}</AvisoProblema>);
    const aviso = screen.getByRole('alert');
    expect(aviso.textContent).toContain('Error de compilación');
    expect(aviso.textContent).not.toContain('No disponible en el visualizador');
    expect(aviso.textContent).toContain('Línea 3: Te falta un punto y coma.');
  });

  it('un aviso de «no disponible» lleva su propio título', () => {
    render(<AvisoProblema tipo="no-disponible">{'Tu programa usa un arreglo.'}</AvisoProblema>);
    expect(screen.getByRole('alert').textContent).toContain('No disponible en el visualizador');
  });

  it('una excepción y una detención por seguridad también tienen su título', () => {
    const { rerender } = render(<AvisoProblema tipo="excepcion">{'x'}</AvisoProblema>);
    expect(screen.getByRole('alert').textContent).toContain('El programa se detuvo por un error');
    rerender(<AvisoProblema tipo="seguridad">{'x'}</AvisoProblema>);
    expect(screen.getByRole('alert').textContent).toContain('Se detuvo por seguridad');
  });

  it('un fallo del visualizador no se confunde con un error del alumno ni con una detención por seguridad', () => {
    render(<AvisoProblema tipo="interno">{'Algo falló dentro del visualizador.'}</AvisoProblema>);
    const texto = screen.getByRole('alert').textContent ?? '';
    expect(texto).toContain('Falla del visualizador');
    expect(texto).not.toContain('Se detuvo por seguridad');
    expect(texto).not.toContain('Error de compilación');
  });

  it('cada tipo tiene un ícono DISTINTO (decorativo: el título lo dice con palabras)', () => {
    const iconos = (['error-compilacion', 'no-disponible', 'excepcion', 'seguridad', 'interno'] as const).map((tipo) => {
      const { container, unmount } = render(<AvisoProblema tipo={tipo}>{'x'}</AvisoProblema>);
      const icono = container.querySelector('[data-icono]');
      const resultado = { texto: icono?.textContent ?? '', oculto: icono?.getAttribute('aria-hidden') };
      unmount();
      return resultado;
    });
    expect(new Set(iconos.map((i) => i.texto)).size).toBe(5);
    for (const icono of iconos) {
      expect(icono.texto.length).toBeGreaterThan(0);
      expect(icono.oculto).toBe('true');
    }
  });

  it('el tipo queda en un atributo para que el estilo distinga el subrayado y el borde sin depender del color', () => {
    const { container } = render(<AvisoProblema tipo="no-disponible">{'x'}</AvisoProblema>);
    expect(container.querySelector('[data-tipo="no-disponible"]')).not.toBeNull();
  });
});

describe('<AvisoProblema/> — «y N más» (REQ-SUB-006)', () => {
  it('con más avisos de los que se muestran, dice cuántos más hay', () => {
    render(
      <AvisoProblema tipo="no-disponible" adicionales={2}>
        {'Tu programa usa un arreglo.'}
      </AvisoProblema>,
    );
    expect(screen.getByRole('alert').textContent).toContain('y 2 avisos más');
  });

  it('en singular, con uno más', () => {
    render(
      <AvisoProblema tipo="error-compilacion" adicionales={1}>
        {'x'}
      </AvisoProblema>,
    );
    expect(screen.getByRole('alert').textContent).toContain('y 1 aviso más');
  });

  it('sin más avisos no dice nada de «más»', () => {
    render(<AvisoProblema tipo="error-compilacion">{'x'}</AvisoProblema>);
    expect(screen.getByRole('alert').textContent).not.toMatch(/más/);
  });
});

describe('<AvisoProblema/> — anuncio', () => {
  it('por omisión es una región `alert` (asertiva) que el lector de pantalla anuncia al aparecer', () => {
    render(<AvisoProblema tipo="error-compilacion">{'x'}</AvisoProblema>);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('dentro de una región viva que ya lo anuncia, no se anuncia dos veces', () => {
    render(
      <AvisoProblema tipo="excepcion" anunciar={false}>
        {'x'}
      </AvisoProblema>,
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
