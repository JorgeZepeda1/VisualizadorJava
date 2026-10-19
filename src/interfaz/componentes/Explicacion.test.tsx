// RED de la tarea 4.11 (REQ-VIS-011): la explicación del robot, en una ubicación fija del mismo campo visual que el código y las variables (nunca en una pestaña aparte). El globo narra el paso
// actual con la frase que el motor y el catálogo armaron —con su línea—, usa `aria-live="polite"` (y `assertive` en una excepción o una detención), resume cómo terminó, y nunca muestra un globo vacío
// ni un marcador `{…}` sin resolver. El robot nunca dice algo que el motor no calculó: el componente solo pinta el `RobotVista` que recibe.
// Ampliado en la tarea R0.6 (REQ-PANT-009, ADR 017): habla UN solo robot a la vez —el que decide `presentacion/hablante.ts`—, siempre en la misma ranura, y al cambiar de hablante el globo anuncia su nombre
// antes de su texto (solo cuando cambió, para no repetirlo en cada paso). Nunca hay un robot dentro del globo de otro.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Hablante, RobotVista } from '../../presentacion/index.ts';
import { Explicacion, type PropiedadesExplicacion } from './Explicacion.tsx';

function robot(parcial: Partial<RobotVista> = {}): RobotVista {
  return { animo: 'normal', linea: null, texto: 'Hola', nota: null, aviso: null, asertivo: false, ...parcial };
}

const ERROR_DE_COMPILACION = { tipo: 'error-compilacion', segmentos: [{ tipo: 'texto', texto: 'Línea 3: Te falta un punto y coma.' }], adicionales: 0 } as const;

function pantalla(parcial: Partial<PropiedadesExplicacion> = {}): PropiedadesExplicacion {
  return { robot: robot(), hablante: 'paso-a-paso', ...parcial };
}

describe('<Explicacion/> — el globo', () => {
  it('narra el paso actual con su línea', () => {
    render(<Explicacion {...pantalla({ robot: robot({ linea: 5, texto: 'Java guarda 125 en `total`; antes valía 100.' }) })} />);
    const globo = screen.getByTestId('globo-del-robot');
    expect(globo.textContent).toContain('Línea 5');
    expect(globo.textContent).toContain('Java guarda 125 en total; antes valía 100.');
  });

  it('el código de la frase se pinta como código, sin comillas invertidas crudas', () => {
    render(<Explicacion {...pantalla({ robot: robot({ texto: 'Java guarda 125 en `total`.' }) })} />);
    const globo = screen.getByTestId('globo-del-robot');
    expect(Array.from(globo.querySelectorAll('code')).map((c) => c.textContent)).toEqual(['total']);
    expect(globo.textContent).not.toContain('`');
  });

  it('sin línea (antes del primer paso) no pone etiqueta de línea', () => {
    render(<Explicacion {...pantalla({ robot: robot({ linea: null, texto: 'Todavía no se ejecuta nada.' }) })} />);
    expect(screen.getByTestId('globo-del-robot').textContent).not.toContain('Línea');
  });

  it('la nota del último paso (espera o resumen) va en su propio párrafo', () => {
    render(<Explicacion {...pantalla({ robot: robot({ linea: 26, texto: 'Java ejecuta `sc.close()`.', nota: 'Así terminó: sin errores, en 26 pasos.' }) })} />);
    const globo = screen.getByTestId('globo-del-robot');
    expect(globo.querySelector('.globo-nota')?.textContent).toBe('Así terminó: sin errores, en 26 pasos.');
  });

  it('el globo es una región `aria-live="polite"` y atómica: el lector de pantalla lee la frase completa', () => {
    render(<Explicacion {...pantalla()} />);
    const globo = screen.getByTestId('globo-del-robot');
    expect(globo.getAttribute('aria-live')).toBe('polite');
    expect(globo.getAttribute('aria-atomic')).toBe('true');
  });
});

describe('<Explicacion/> — excepción o detención', () => {
  it('una excepción se anuncia de inmediato (assertive) con el título «El programa se detuvo por un error»', () => {
    render(<Explicacion {...pantalla({ robot: robot({ linea: 8, texto: 'Java detuvo el programa con una excepción.', aviso: 'excepcion', asertivo: true, animo: 'preocupado' }) })} />);
    const globo = screen.getByTestId('globo-del-robot');
    expect(globo.getAttribute('aria-live')).toBe('assertive');
    expect(globo.textContent).toContain('El programa se detuvo por un error');
    // el aviso dentro del globo no se anuncia otra vez por su cuenta: el globo ya es la región viva
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('una detención por seguridad lleva su propio título', () => {
    render(<Explicacion {...pantalla({ robot: robot({ texto: 'El visualizador detuvo el programa.', aviso: 'seguridad', asertivo: true, animo: 'seguridad' }) })} />);
    expect(screen.getByTestId('globo-del-robot').textContent).toContain('Se detuvo por seguridad');
  });
});

describe('<Explicacion/> — un problema al revisar el programa', () => {
  it('reemplaza lo que dice el robot y se anuncia como `alert`, con su título', () => {
    render(<Explicacion {...pantalla({ hablante: 'revisor', problema: ERROR_DE_COMPILACION })} />);
    const aviso = screen.getByRole('alert');
    expect(aviso.textContent).toContain('Error de compilación');
    expect(aviso.textContent).toContain('Línea 3: Te falta un punto y coma.');
    expect(screen.queryByTestId('globo-del-robot')).toBeNull();
  });

  it('dice «y N más» cuando hay más avisos, y pinta el código en línea como código', () => {
    render(
      <Explicacion
        {...pantalla({
          hablante: 'revisor',
          problema: {
            tipo: 'no-disponible',
            segmentos: [
              { tipo: 'texto', texto: 'Tu programa usa un arreglo (' },
              { tipo: 'codigo', texto: 'int[]' },
              { tipo: 'texto', texto: ').' },
            ],
            adicionales: 2,
          },
        })}
      />,
    );
    const aviso = screen.getByRole('alert');
    expect(aviso.textContent).toContain('y 2 avisos más');
    expect(Array.from(aviso.querySelectorAll('code')).map((c) => c.textContent)).toEqual(['int[]']);
  });
});

describe('<Explicacion/> — el robot', () => {
  it('lleva el dibujo del robot con el ánimo que le toca, y la zona se llama «Explicación del robot»', () => {
    render(<Explicacion {...pantalla({ robot: robot({ animo: 'feliz' }) })} />);
    expect(screen.getByRole('region', { name: 'Explicación del robot' })).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('data-animo')).toBe('feliz');
  });

  it('con un problema el robot se ve preocupado', () => {
    render(<Explicacion {...pantalla({ hablante: 'revisor', problema: ERROR_DE_COMPILACION })} />);
    expect(screen.getByRole('img').getAttribute('data-animo')).toBe('preocupado');
  });

  it('nunca deja un marcador sin resolver ni un globo vacío', () => {
    render(<Explicacion {...pantalla({ robot: robot({ linea: 3, texto: 'Java imprime en la consola: «Hola» y pasa a la línea siguiente.', nota: 'Se siguen calculando los siguientes pasos…' }) })} />);
    const texto = screen.getByTestId('globo-del-robot').textContent ?? '';
    expect(texto.trim().length).toBeGreaterThan(0);
    expect(texto).not.toMatch(/[{}]|undefined|NaN|\[object/);
  });
});

// REQ-PANT-009: un solo hablante, siempre en la misma ranura, y nada de un robot dentro del globo de otro.
describe('<Explicacion/> — un solo robot habla (REQ-PANT-009)', () => {
  const HABLANTES: readonly Hablante[] = ['paso-a-paso', 'revisor', 'libro'];

  it('en la zona hay exactamente un robot —el del hablante— con su nombre visible, y ninguno dentro del globo', () => {
    for (const hablante of HABLANTES) {
      const { container, unmount } = render(<Explicacion {...pantalla({ hablante })} />);
      const zona = screen.getByRole('region', { name: 'Explicación del robot' });
      expect(zona.querySelectorAll('[data-personaje]'), hablante).toHaveLength(1);
      expect(zona.querySelector('[data-personaje]')?.getAttribute('data-personaje'), hablante).toBe(hablante);
      expect(container.querySelector('.globo [data-personaje]'), hablante).toBeNull();
      unmount();
    }
  });

  it('con un problema también es uno solo: el revisor, y su globo no lleva otro robot adentro', () => {
    render(<Explicacion {...pantalla({ hablante: 'revisor', problema: ERROR_DE_COMPILACION })} />);
    const zona = screen.getByRole('region', { name: 'Explicación del robot' });
    expect(zona.querySelectorAll('[data-personaje]')).toHaveLength(1);
    expect(zona.querySelector('[data-personaje]')?.getAttribute('data-personaje')).toBe('revisor');
    expect(zona.querySelector('.globo [data-personaje]')).toBeNull();
  });

  it('la zona dice quién habla (`data-hablante`) para que el globo tome el color de su robot', () => {
    render(<Explicacion {...pantalla({ hablante: 'libro' })} />);
    expect(screen.getByRole('region', { name: 'Explicación del robot' }).getAttribute('data-hablante')).toBe('libro');
  });

  it('en el primer render no se anuncia ningún nombre: no cambió nadie', () => {
    render(<Explicacion {...pantalla()} />);
    expect(screen.getByTestId('globo-del-robot').textContent).toBe('Hola');
  });

  it('al cambiar de hablante el globo empieza por el nombre del nuevo robot (también si es un problema, que se anuncia como `alert`)', () => {
    const { rerender } = render(<Explicacion {...pantalla()} />);

    rerender(<Explicacion {...pantalla({ hablante: 'revisor', problema: ERROR_DE_COMPILACION })} />);
    expect(screen.getByRole('alert').textContent?.startsWith('Robot revisor: ')).toBe(true);

    rerender(<Explicacion {...pantalla({ robot: robot({ texto: 'Cambiaste el programa.' }) })} />);
    expect(screen.getByTestId('globo-del-robot').textContent?.startsWith('Robot paso a paso: ')).toBe(true);
    expect(screen.getByTestId('globo-del-robot').textContent).toContain('Cambiaste el programa.');
  });

  it('el nombre es para quien oye: se dice como texto solo para lectores de pantalla', () => {
    const { rerender } = render(<Explicacion {...pantalla()} />);
    rerender(<Explicacion {...pantalla({ hablante: 'libro' })} />);
    const nombre = screen.getByTestId('globo-del-robot').querySelector('.solo-lectores');
    expect(nombre?.textContent).toBe('Robot del libro: ');
  });

  it('si el hablante no cambió, el nombre no se repite aunque cambie el paso', () => {
    const { rerender } = render(<Explicacion {...pantalla()} />);
    rerender(<Explicacion {...pantalla({ hablante: 'revisor', problema: ERROR_DE_COMPILACION })} />);
    expect(screen.getByRole('alert').textContent?.startsWith('Robot revisor: ')).toBe(true);

    // otro problema, el mismo robot: ya no se vuelve a nombrar
    rerender(<Explicacion {...pantalla({ hablante: 'revisor', problema: { ...ERROR_DE_COMPILACION, segmentos: [{ tipo: 'texto', texto: 'Línea 4: Falta una llave.' }] } })} />);
    expect(screen.getByRole('alert').textContent).toContain('Línea 4: Falta una llave.');
    expect(screen.getByRole('alert').textContent).not.toContain('Robot revisor');

    // y paso a paso: el primero que habla tras el revisor sí se nombra; el segundo paso, no
    rerender(<Explicacion {...pantalla({ robot: robot({ texto: 'Paso uno.' }) })} />);
    expect(screen.getByTestId('globo-del-robot').textContent?.startsWith('Robot paso a paso: ')).toBe(true);
    rerender(<Explicacion {...pantalla({ robot: robot({ texto: 'Paso dos.' }) })} />);
    expect(screen.getByTestId('globo-del-robot').textContent).toBe('Paso dos.');
  });

  it('al volver a pintar lo mismo (un re-render sin cambios) el nombre no desaparece ni se duplica', () => {
    const { rerender } = render(<Explicacion {...pantalla()} />);
    rerender(<Explicacion {...pantalla({ hablante: 'libro', robot: robot({ texto: 'Un tema.' }) })} />);
    rerender(<Explicacion {...pantalla({ hablante: 'libro', robot: robot({ texto: 'Un tema.' }) })} />);
    expect(screen.getByTestId('globo-del-robot').textContent).toBe('Robot del libro: Un tema.');
  });
});
