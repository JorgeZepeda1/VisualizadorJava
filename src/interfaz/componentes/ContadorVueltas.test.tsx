// RED de la tarea 4.9 (REQ-VIS-007): el contador de vueltas de los ciclos activos en el paso actual, cada uno por separado cuando hay anidamiento. Presentacional puro: recibe las vueltas ya
// derivadas por la presentación (`derivarVueltas`).
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContadorVueltas } from './ContadorVueltas.tsx';

describe('<ContadorVueltas/>', () => {
  it('dos for anidados: «ciclo externo: vuelta 2 · ciclo interno: vuelta 3», cada contador por separado', () => {
    render(
      <ContadorVueltas
        vueltas={[
          { nombre: 'ciclo externo', vuelta: 2, termino: false, nodoDelCiclo: 0 },
          { nombre: 'ciclo interno', vuelta: 3, termino: false, nodoDelCiclo: 3 },
        ]}
      />,
    );
    const contador = screen.getByTestId('contador-de-vueltas');
    expect(contador.textContent).toBe('ciclo externo: vuelta 2 · ciclo interno: vuelta 3');
    expect(contador.querySelectorAll('[data-ciclo]')).toHaveLength(2);
  });

  it('un solo ciclo: «ciclo: vuelta 1»', () => {
    render(<ContadorVueltas vueltas={[{ nombre: 'ciclo', vuelta: 1, termino: false, nodoDelCiclo: 0 }]} />);
    expect(screen.getByTestId('contador-de-vueltas').textContent).toBe('ciclo: vuelta 1');
  });

  it('en la revisión que hace salir del ciclo, lo dice', () => {
    render(<ContadorVueltas vueltas={[{ nombre: 'ciclo', vuelta: 3, termino: true, nodoDelCiclo: 0 }]} />);
    expect(screen.getByTestId('contador-de-vueltas').textContent).toBe('ciclo: vuelta 3 (terminó)');
  });

  it('sin ciclos activos no pinta nada', () => {
    const { container } = render(<ContadorVueltas vueltas={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('es una lista con nombre «Vueltas», para el lector de pantalla', () => {
    render(<ContadorVueltas vueltas={[{ nombre: 'ciclo', vuelta: 2, termino: false, nodoDelCiclo: 0 }]} />);
    expect(screen.getByTestId('contador-de-vueltas').getAttribute('aria-label')).toBe('Vueltas');
  });
});
