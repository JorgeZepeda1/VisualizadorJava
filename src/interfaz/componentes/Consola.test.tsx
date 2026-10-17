// Tarea 0.14 (Consola mínima) ampliada en la 4.7 (REQ-VIS-008): presentacional puro, recibe los segmentos ya resueltos por el contenedor (design.md §6.4: out/err/eco en el mismo <pre>). La
// salida normal se ve como está; `System.err` lleva ícono y la palabra «Error» (no solo rojo); lo que el alumno teclea (eco) va con otro estilo Y subrayado, en el mismo renglón que el
// mensaje del `print`; y no hay mensajes de IDE. El campo de entrada entra como hijo, al final del último renglón.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Consola } from './Consola.tsx';

function segmentosPintados(): Element[] {
  return Array.from(screen.getByTestId('consola').querySelectorAll('[data-flujo]'));
}

describe('<Consola/>', () => {
  it('sin segmentos, no muestra texto', () => {
    render(<Consola segmentos={[]} />);
    expect(screen.getByTestId('consola').textContent).toBe('');
  });

  it('concatena los segmentos de salida en orden', () => {
    render(
      <Consola
        segmentos={[
          { flujo: 'out', texto: 'Hola, ' },
          { flujo: 'out', texto: 'mundo\n' },
        ]}
      />,
    );
    expect(screen.getByTestId('consola').textContent).toBe('Hola, mundo\n');
  });

  it('distingue el flujo de cada segmento vía data-flujo (triangulación out/err)', () => {
    render(
      <Consola
        segmentos={[
          { flujo: 'out', texto: 'normal' },
          { flujo: 'err', texto: 'error' },
        ]}
      />,
    );
    const pintados = segmentosPintados();
    expect(pintados.map((s) => s.getAttribute('data-flujo'))).toEqual(['out', 'err']);
    expect(pintados.map((s) => s.textContent)).toEqual(['normal', 'error']);
  });
});

describe('<Consola/> — System.err (REQ-VIS-008)', () => {
  it('"ok" con estilo normal y "cuidado" como error, en el orden en que el programa los generó', () => {
    render(
      <Consola
        segmentos={[
          { flujo: 'out', texto: 'ok\n' },
          { flujo: 'err', texto: 'cuidado\n' },
        ]}
      />,
    );
    const pintados = segmentosPintados();
    expect(pintados[0]?.className).not.toContain('consola-err');
    expect(pintados[1]?.className).toContain('consola-err');
  });

  it('el error lleva un ícono y la palabra «Error» para el lector de pantalla, no solo el rojo', () => {
    const { container } = render(<Consola segmentos={[{ flujo: 'err', texto: 'Exception in thread "main"\n' }]} />);
    expect(container.querySelector('[data-icono-err]')?.textContent?.length).toBeGreaterThan(0);
    expect(container.querySelector('[data-icono-err]')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.solo-lectores')?.textContent).toBe('Error: ');
  });

  it('varios segmentos de error seguidos llevan UN solo ícono, no uno por segmento', () => {
    const { container } = render(
      <Consola
        segmentos={[
          { flujo: 'err', texto: 'uno\n' },
          { flujo: 'err', texto: 'dos\n' },
        ]}
      />,
    );
    expect(container.querySelectorAll('[data-icono-err]')).toHaveLength(1);
  });

  it('un error después de salida normal lleva su ícono, y otro error más adelante, el suyo', () => {
    const { container } = render(
      <Consola
        segmentos={[
          { flujo: 'err', texto: 'a\n' },
          { flujo: 'out', texto: 'b\n' },
          { flujo: 'err', texto: 'c\n' },
        ]}
      />,
    );
    expect(container.querySelectorAll('[data-icono-err]')).toHaveLength(2);
  });
});

describe('<Consola/> — lo que el alumno teclea (REQ-VIS-008)', () => {
  it('el mensaje del print y la entrada tecleada quedan en el mismo renglón', () => {
    render(
      <Consola
        segmentos={[
          { flujo: 'out', texto: 'Código: ' },
          { flujo: 'eco', texto: 'a1\n' },
        ]}
      />,
    );
    // El texto que ve el alumno, sin las etiquetas que solo oye el lector de pantalla.
    expect(segmentosPintados().map((s) => s.textContent).join('')).toBe('Código: a1\n');
  });

  it('el eco tiene su propio estilo (clase) y su marca no cromática (subrayado, en la hoja de estilos)', () => {
    render(
      <Consola
        segmentos={[
          { flujo: 'out', texto: 'Código: ' },
          { flujo: 'eco', texto: 'a1\n' },
        ]}
      />,
    );
    const eco = segmentosPintados()[1];
    expect(eco?.getAttribute('data-flujo')).toBe('eco');
    expect(eco?.className).toContain('consola-eco');
  });

  it('el eco se anuncia como «Lo que tecleaste» para el lector de pantalla', () => {
    const { container } = render(<Consola segmentos={[{ flujo: 'eco', texto: '50\n' }]} />);
    expect(container.querySelector('.solo-lectores')?.textContent).toBe('Lo que tecleaste: ');
  });

  it('no muestra mensajes propios de un IDE (run:, BUILD SUCCESSFUL…)', () => {
    render(<Consola segmentos={[{ flujo: 'out', texto: 'Hola\n' }]} />);
    const texto = screen.getByTestId('consola').textContent ?? '';
    expect(texto).not.toMatch(/run:|BUILD SUCCESSFUL|BUILD FAILED/);
  });
});

describe('<Consola/> — el campo de entrada como hijo', () => {
  it('se muestra al final, después del último segmento', () => {
    render(
      <Consola segmentos={[{ flujo: 'out', texto: 'Dinero: ' }]}>
        <input data-testid="campo" />
      </Consola>,
    );
    const consola = screen.getByTestId('consola');
    expect(consola.lastElementChild?.tagName).toBe('INPUT');
    expect(consola.textContent).toBe('Dinero: ');
  });
});
