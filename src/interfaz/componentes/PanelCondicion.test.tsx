// RED de la tarea 4.8 (REQ-VIS-006): el panel de condición — la cadena de sustitución completa, la rama que corre (✓) y la que no (✗, ATENUADA pero NUNCA oculta), las condiciones de un
// `else if` en orden, y en un `switch` el `case` igualado, la caída sin `break` y el `default`, señalados explícitamente. Nada va solo por color: ✓ y ✗, y las palabras «se ejecuta» /
// «no se ejecuta» para el lector de pantalla.
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { CondicionVista } from '../../presentacion/index.ts';
import { PanelCondicion } from './PanelCondicion.tsx';

const IF_FALSO_CON_ELSE: CondicionVista = {
  tipo: 'if',
  evaluaciones: [{ cadena: ['x > 5', '3 > 5', 'false'], resultado: false }],
  ramas: [
    { texto: 'Entra al `if`', corre: false },
    { texto: 'Entra al `else`', corre: true },
  ],
};

describe('<PanelCondicion/> — cadena y ramas', () => {
  it('muestra la cadena de sustitución completa: intentos < 10 → 3 < 10 → true', () => {
    const condicion: CondicionVista = {
      tipo: 'if',
      evaluaciones: [{ cadena: ['intentos < 10', '3 < 10', 'true'], resultado: true }],
      ramas: [{ texto: 'Entra al `if`', corre: true }],
    };
    render(<PanelCondicion condicion={condicion} />);
    expect(screen.getByTestId('cadena-de-sustitucion').textContent).toBe('intentos < 10 → 3 < 10 → true');
  });

  it('con x = 3: el else corre (✓) y el if se atenúa (✗) pero sigue visible', () => {
    render(<PanelCondicion condicion={IF_FALSO_CON_ELSE} />);
    const ramas = screen.getAllByRole('listitem');
    expect(ramas).toHaveLength(2);

    const rama = (texto: RegExp) => ramas.find((r) => texto.test(r.textContent ?? '')) as HTMLElement;
    const entraAlIf = rama(/Entra al if/);
    const entraAlElse = rama(/Entra al else/);

    expect(entraAlElse.getAttribute('data-corre')).toBe('true');
    expect(entraAlElse.textContent).toContain('✓');
    expect(entraAlIf.getAttribute('data-corre')).toBe('false');
    expect(entraAlIf.textContent).toContain('✗');
    expect(entraAlIf.className).toContain('atenuada');
    // atenuada, NUNCA oculta
    expect(entraAlIf.hasAttribute('hidden')).toBe(false);
    expect(entraAlIf.textContent).toContain('Entra al if');
  });

  it('cada rama dice con palabras si se ejecuta o no, para el lector de pantalla', () => {
    render(<PanelCondicion condicion={IF_FALSO_CON_ELSE} />);
    const ramas = screen.getAllByRole('listitem');
    expect(ramas[0]?.textContent).toContain('no se ejecuta');
    expect(ramas[1]?.textContent).toContain('se ejecuta');
  });

  it('el código de cada rama (`if`, `else`) se pinta como código, sin comillas invertidas crudas', () => {
    const { container } = render(<PanelCondicion condicion={IF_FALSO_CON_ELSE} />);
    expect(Array.from(container.querySelectorAll('li code')).map((c) => c.textContent)).toEqual(['if', 'else']);
    expect(container.textContent).not.toContain('`');
  });

  it('el panel se llama «Condición»', () => {
    render(<PanelCondicion condicion={IF_FALSO_CON_ELSE} />);
    expect(screen.getByRole('heading', { name: 'Condición' })).toBeTruthy();
  });

  it('sin condición no pinta nada', () => {
    const { container } = render(<PanelCondicion condicion={null} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('<PanelCondicion/> — cadena de else if, en orden', () => {
  const ELSE_IF: CondicionVista = {
    tipo: 'if',
    evaluaciones: [
      { cadena: ['suma > 100', '3 > 100', 'false'], resultado: false },
      { cadena: ['suma > 0', '3 > 0', 'true'], resultado: true },
    ],
    ramas: [
      { texto: 'Entra al `else if`', corre: true },
      { texto: 'Entra al `else`', corre: false },
    ],
  };

  it('lista las condiciones revisadas en el orden en que se revisaron, cada una con su ✓ o ✗', () => {
    render(<PanelCondicion condicion={ELSE_IF} />);
    const orden = screen.getByRole('list', { name: 'Condiciones revisadas, en orden' });
    const revisadas = within(orden).getAllByRole('listitem');
    expect(revisadas.map((r) => r.textContent)).toEqual([
      expect.stringContaining('suma > 100 → 3 > 100 → false'),
      expect.stringContaining('suma > 0 → 3 > 0 → true'),
    ]);
    expect(revisadas[0]?.textContent).toContain('✗');
    expect(revisadas[1]?.textContent).toContain('✓');
  });

  it('con una sola condición no hay lista de condiciones revisadas (solo la cadena)', () => {
    render(<PanelCondicion condicion={IF_FALSO_CON_ELSE} />);
    expect(screen.queryByRole('list', { name: 'Condiciones revisadas, en orden' })).toBeNull();
  });
});

describe('<PanelCondicion/> — ciclos', () => {
  it('un ciclo muestra su cadena y sus dos ramas, la que no corre atenuada', () => {
    const condicion: CondicionVista = {
      tipo: 'ciclo',
      ciclo: 'while',
      cadena: ['j < 2', '2 < 2', 'false'],
      resultado: false,
      vuelta: 3,
      ramas: [
        { texto: 'Entra al cuerpo del ciclo', corre: false },
        { texto: 'Sale del ciclo', corre: true },
      ],
    };
    render(<PanelCondicion condicion={condicion} />);
    expect(screen.getByTestId('cadena-de-sustitucion').textContent).toBe('j < 2 → 2 < 2 → false');
    const ramas = screen.getAllByRole('listitem');
    expect(ramas.map((r) => r.getAttribute('data-corre'))).toEqual(['false', 'true']);
  });
});

describe('<PanelCondicion/> — switch', () => {
  it('señala explícitamente el case igualado', () => {
    const condicion: CondicionVista = {
      tipo: 'switch',
      cadena: ['codigo', '"A1"'],
      filas: [{ texto: 'Coincide con `case "A1"`', corre: true }],
    };
    render(<PanelCondicion condicion={condicion} />);
    expect(screen.getByTestId('cadena-de-sustitucion').textContent).toBe('codigo → "A1"');
    expect(screen.getByRole('listitem').textContent).toContain('Coincide con case "A1"');
    expect(screen.getByRole('listitem').getAttribute('data-corre')).toBe('true');
  });

  it('señala la caída sin break y el default', () => {
    const caida: CondicionVista = { tipo: 'switch', cadena: null, filas: [{ texto: 'Cae a `case 2` porque no hubo `break`', corre: true }] };
    const { rerender } = render(<PanelCondicion condicion={caida} />);
    expect(screen.getByRole('listitem').textContent).toContain('Cae a case 2 porque no hubo break');
    expect(screen.queryByTestId('cadena-de-sustitucion')).toBeNull();

    rerender(<PanelCondicion condicion={{ tipo: 'switch', cadena: ['n', '9'], filas: [{ texto: 'Ningún `case` coincide: va al `default`', corre: true }] }} />);
    expect(screen.getByRole('listitem').textContent).toContain('va al default');
  });
});
