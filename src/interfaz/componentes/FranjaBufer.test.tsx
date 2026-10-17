// RED de la tarea 4.7 (REQ-VIS-009): la franja del búfer del Scanner — «Pendiente: ␣30⏎», con los espacios y el salto de línea a la vista, visualmente distinta del texto ya consumido.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FranjaBufer } from './FranjaBufer.tsx';

describe('<FranjaBufer/>', () => {
  it('muestra lo pendiente con los símbolos visibles: «Pendiente: ␣30⏎»', () => {
    render(<FranjaBufer bufer={{ visible: '␣30⏎' }} />);
    expect(screen.getByTestId('franja-bufer').textContent).toBe('Pendiente: ␣30⏎');
  });

  it('tras nextInt() queda el salto de línea pendiente (⏎)', () => {
    render(<FranjaBufer bufer={{ visible: '⏎' }} />);
    expect(screen.getByTestId('franja-bufer').textContent).toBe('Pendiente: ⏎');
  });

  it('lo pendiente va en un elemento propio, para distinguirlo de lo ya consumido', () => {
    render(<FranjaBufer bufer={{ visible: '⏎Juan' }} />);
    expect(screen.getByTestId('franja-bufer').querySelector('.bufer-pendiente')?.textContent).toBe('⏎Juan');
  });

  it('si el paso tocó el Scanner y no quedó nada, lo dice', () => {
    render(<FranjaBufer bufer={{ visible: '' }} />);
    expect(screen.getByTestId('franja-bufer').textContent).toBe('Pendiente: nada');
  });

  it('explica sus símbolos al pasar el ratón y al lector de pantalla', () => {
    render(<FranjaBufer bufer={{ visible: '⏎' }} />);
    expect(screen.getByTestId('franja-bufer').getAttribute('title')).toBe('Lo que el Scanner todavía no leyó. ␣ es un espacio y ⏎ es un salto de línea.');
  });

  it('sin búfer no pinta nada', () => {
    const { container } = render(<FranjaBufer bufer={null} />);
    expect(container.firstChild).toBeNull();
  });
});
