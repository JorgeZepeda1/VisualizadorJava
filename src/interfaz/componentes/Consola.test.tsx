// RED de la tarea 0.14: Consola mínima — presentacional puro, recibe los segmentos ya resueltos
// por el contenedor (design.md §6.4: out/err/eco en el mismo <pre>; el color e ícono de err, la
// franja del búfer y el eco distinguible sin color llegan en el lote 5, M18).
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Consola } from './Consola.tsx';

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
    const spans = screen.getByTestId('consola').querySelectorAll('span');
    expect(spans[0]?.getAttribute('data-flujo')).toBe('out');
    expect(spans[1]?.getAttribute('data-flujo')).toBe('err');
  });
});
