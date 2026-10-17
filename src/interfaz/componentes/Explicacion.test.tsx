// RED de la tarea 4.11 (REQ-VIS-011): la explicación del robot, en una ubicación fija del mismo campo visual que el código y las variables (nunca en una pestaña aparte). El globo narra el paso
// actual con la frase que el motor y el catálogo armaron —con su línea—, usa `aria-live="polite"` (y `assertive` en una excepción o una detención), resume cómo terminó, y nunca muestra un globo vacío
// ni un marcador `{…}` sin resolver. El robot nunca dice algo que el motor no calculó: el componente solo pinta el `RobotVista` que recibe.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { RobotVista } from '../../presentacion/index.ts';
import { Explicacion } from './Explicacion.tsx';

function robot(parcial: Partial<RobotVista> = {}): RobotVista {
  return { animo: 'normal', linea: null, texto: 'Hola', nota: null, aviso: null, asertivo: false, ...parcial };
}

describe('<Explicacion/> — el globo', () => {
  it('narra el paso actual con su línea', () => {
    render(<Explicacion robot={robot({ linea: 5, texto: 'Guardo 125 en `total`; antes valía 100.' })} />);
    const globo = screen.getByTestId('globo-del-robot');
    expect(globo.textContent).toContain('Línea 5');
    expect(globo.textContent).toContain('Guardo 125 en total; antes valía 100.');
  });

  it('el código de la frase se pinta como código, sin comillas invertidas crudas', () => {
    render(<Explicacion robot={robot({ texto: 'Guardo 125 en `total`.' })} />);
    const globo = screen.getByTestId('globo-del-robot');
    expect(Array.from(globo.querySelectorAll('code')).map((c) => c.textContent)).toEqual(['total']);
    expect(globo.textContent).not.toContain('`');
  });

  it('sin línea (antes del primer paso) no pone etiqueta de línea', () => {
    render(<Explicacion robot={robot({ linea: null, texto: 'Todavía no se ejecuta nada.' })} />);
    expect(screen.getByTestId('globo-del-robot').textContent).not.toContain('Línea');
  });

  it('la nota del último paso (espera o resumen) va en su propio párrafo', () => {
    render(<Explicacion robot={robot({ linea: 26, texto: 'Ejecuto `sc.close()`.', nota: 'Así terminó: sin errores, en 26 pasos.' })} />);
    const globo = screen.getByTestId('globo-del-robot');
    expect(globo.querySelector('.globo-nota')?.textContent).toBe('Así terminó: sin errores, en 26 pasos.');
  });

  it('el globo es una región `aria-live="polite"` y atómica: el lector de pantalla lee la frase completa', () => {
    render(<Explicacion robot={robot()} />);
    const globo = screen.getByTestId('globo-del-robot');
    expect(globo.getAttribute('aria-live')).toBe('polite');
    expect(globo.getAttribute('aria-atomic')).toBe('true');
  });
});

describe('<Explicacion/> — excepción o detención', () => {
  it('una excepción se anuncia de inmediato (assertive) con el título «El programa se detuvo por un error»', () => {
    render(<Explicacion robot={robot({ linea: 8, texto: 'Java detuvo el programa con una excepción.', aviso: 'excepcion', asertivo: true, animo: 'preocupado' })} />);
    const globo = screen.getByTestId('globo-del-robot');
    expect(globo.getAttribute('aria-live')).toBe('assertive');
    expect(globo.textContent).toContain('El programa se detuvo por un error');
    // el aviso dentro del globo no se anuncia otra vez por su cuenta: el globo ya es la región viva
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('una detención por seguridad lleva su propio título', () => {
    render(<Explicacion robot={robot({ texto: 'Paré el programa.', aviso: 'seguridad', asertivo: true, animo: 'seguridad' })} />);
    expect(screen.getByTestId('globo-del-robot').textContent).toContain('Se detuvo por seguridad');
  });
});

describe('<Explicacion/> — un problema al revisar el programa', () => {
  it('reemplaza lo que dice el robot y se anuncia como `alert`, con su título', () => {
    render(
      <Explicacion
        robot={robot()}
        problema={{ tipo: 'error-compilacion', segmentos: [{ tipo: 'texto', texto: 'Línea 3: Te falta un punto y coma.' }], adicionales: 0 }}
      />,
    );
    const aviso = screen.getByRole('alert');
    expect(aviso.textContent).toContain('Error de compilación');
    expect(aviso.textContent).toContain('Línea 3: Te falta un punto y coma.');
    expect(screen.queryByTestId('globo-del-robot')).toBeNull();
  });

  it('dice «y N más» cuando hay más avisos, y pinta el código en línea como código', () => {
    render(
      <Explicacion
        robot={robot()}
        problema={{
          tipo: 'no-disponible',
          segmentos: [
            { tipo: 'texto', texto: 'Tu programa usa un arreglo (' },
            { tipo: 'codigo', texto: 'int[]' },
            { tipo: 'texto', texto: ').' },
          ],
          adicionales: 2,
        }}
      />,
    );
    const aviso = screen.getByRole('alert');
    expect(aviso.textContent).toContain('y 2 avisos más');
    expect(Array.from(aviso.querySelectorAll('code')).map((c) => c.textContent)).toEqual(['int[]']);
  });
});

describe('<Explicacion/> — el robot', () => {
  it('lleva el dibujo del robot con el ánimo que le toca, y la zona se llama «Explicación del robot»', () => {
    render(<Explicacion robot={robot({ animo: 'feliz' })} />);
    expect(screen.getByRole('region', { name: 'Explicación del robot' })).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('data-animo')).toBe('feliz');
  });

  it('con un problema el robot se ve preocupado', () => {
    render(<Explicacion robot={robot()} problema={{ tipo: 'error-compilacion', segmentos: [{ tipo: 'texto', texto: 'x' }], adicionales: 0 }} />);
    expect(screen.getByRole('img').getAttribute('data-animo')).toBe('preocupado');
  });

  it('nunca deja un marcador sin resolver ni un globo vacío', () => {
    render(<Explicacion robot={robot({ linea: 3, texto: 'Imprimo en la consola: «Hola» y paso a la línea siguiente.', nota: 'Sigo calculando los siguientes pasos…' })} />);
    const texto = screen.getByTestId('globo-del-robot').textContent ?? '';
    expect(texto.trim().length).toBeGreaterThan(0);
    expect(texto).not.toMatch(/[{}]|undefined|NaN|\[object/);
  });
});
