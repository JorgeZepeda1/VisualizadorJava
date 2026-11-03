// RED de la tarea 4.6 (REQ-VIS-005): el panel de variables — nombre, tipo y valor de cada variable a la vista; el valor anterior atenuado junto al nuevo cuando cambió («3 → 4»);
// «sin inicializar»; y las que salieron de su bloque, atenuadas con una nota. Nada va solo por color: la flecha, el peso del texto y las palabras lo dicen.
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { VariableVista } from '../../presentacion/index.ts';
import { PanelVariables } from './PanelVariables.tsx';

function variable(parcial: Partial<VariableVista> & { readonly nombre: string }): VariableVista {
  return { tipo: 'int', valor: '0', anterior: null, estado: 'sin-cambio', fueraDeAlcance: false, ...parcial };
}

function filaDe(nombre: string): HTMLElement {
  return screen.getByRole('row', { name: new RegExp(`^${nombre}\\b`) });
}

describe('<PanelVariables/> — nombre, tipo y valor', () => {
  it('muestra una fila por variable con su nombre, su tipo y su valor', () => {
    render(<PanelVariables variables={[variable({ nombre: 'edad', valor: '17' }), variable({ nombre: 'nombre', tipo: 'String', valor: '"Ana"' })]} />);
    const edad = within(filaDe('edad'));
    expect(edad.getByText('edad')).toBeTruthy();
    expect(edad.getByText('int')).toBeTruthy();
    expect(edad.getByText('17')).toBeTruthy();
    const nombre = within(filaDe('nombre'));
    expect(nombre.getByText('String')).toBeTruthy();
    expect(nombre.getByText('"Ana"')).toBeTruthy();
  });

  it('el panel se llama «Variables» y la tabla tiene encabezados de columna', () => {
    render(<PanelVariables variables={[variable({ nombre: 'x' })]} />);
    expect(screen.getByRole('heading', { name: 'Variables' })).toBeTruthy();
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Nombre', 'Tipo', 'Valor']);
  });

  it('sin variables dice que todavía no hay', () => {
    render(<PanelVariables variables={[]} />);
    expect(screen.getByText('Todavía no hay variables.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('<PanelVariables/> — cambio de valor (REQ-VIS-005)', () => {
  it('contador pasa de 3 a 4: muestra «3 → 4» con el 3 atenuado y el 4 resaltado', () => {
    const { container } = render(<PanelVariables variables={[variable({ nombre: 'contador', valor: '4', anterior: '3', estado: 'cambio' })]} />);
    const fila = filaDe('contador');
    expect(fila.querySelector('.valor-anterior')?.textContent).toBe('3');
    expect(fila.querySelector('.valor-nuevo')?.textContent).toBe('4');
    expect(fila.textContent).toContain('3 → 4');
    // el valor anterior va atenuado y tachado en su estilo; aquí basta que sea un elemento propio y distinto del nuevo
    expect(container.querySelector('.valor-anterior')).not.toBe(container.querySelector('.valor-nuevo'));
  });

  it('el cambio también se dice con palabras para el lector de pantalla', () => {
    render(<PanelVariables variables={[variable({ nombre: 'contador', valor: '4', anterior: '3', estado: 'cambio' })]} />);
    expect(filaDe('contador').textContent).toContain('cambió de 3 a 4');
  });

  it('triangulación: texto con comillas, valor anterior distinto', () => {
    render(<PanelVariables variables={[variable({ nombre: 'producto', tipo: 'String', valor: '"Agua"', anterior: '"Papas"', estado: 'cambio' })]} />);
    expect(filaDe('producto').textContent).toContain('"Papas" → "Agua"');
  });

  it('la primera asignación a una variable sin inicializar cambia desde «sin inicializar»', () => {
    render(<PanelVariables variables={[variable({ nombre: 'precio', valor: '18', anterior: null, estado: 'cambio' })]} />);
    expect(filaDe('precio').textContent).toContain('sin inicializar → 18');
  });

  it('una variable que no cambió no lleva flecha', () => {
    render(<PanelVariables variables={[variable({ nombre: 'edad', valor: '17' })]} />);
    expect(filaDe('edad').textContent).not.toContain('→');
  });
});

describe('<PanelVariables/> — variables nuevas, sin inicializar y fuera de alcance', () => {
  it('una variable recién declarada lleva la palabra «nueva» (no solo un color)', () => {
    render(<PanelVariables variables={[variable({ nombre: 'total', valor: '36', estado: 'nueva' })]} />);
    expect(filaDe('total').textContent).toContain('nueva');
  });

  it('una variable declarada sin valor se muestra «sin inicializar»', () => {
    render(<PanelVariables variables={[variable({ nombre: 'precio', valor: null, estado: 'nueva' })]} />);
    expect(within(filaDe('precio')).getByText('sin inicializar')).toBeTruthy();
  });

  it('una variable que salió de su bloque se atenúa y lleva una nota (no desaparece sin explicación)', () => {
    render(<PanelVariables variables={[variable({ nombre: 'j', valor: null, fueraDeAlcance: true })]} />);
    const fila = filaDe('j');
    expect(fila.getAttribute('data-fuera-de-alcance')).toBe('true');
    expect(fila.textContent).toContain('ya no existe: salió de su bloque');
    expect(fila.textContent).not.toContain('sin inicializar');
  });
});

// R0.12 (REQ-AULA-004, ADR 017): en el modo proyector la tabla de variables no muestra la columna «Tipo» (el valor es lo que se mira desde el fondo del salón y la columna derecha tiene que dejar lugar para
// la pregunta y las tres tarjetas del reto). El tipo sigue estando en el motor y vuelve al apagar el proyector.
describe('<PanelVariables/> — compacto (modo proyector)', () => {
  it('sin la columna «Tipo»: encabezados Nombre y Valor, y las filas no repiten el tipo', () => {
    render(<PanelVariables compacto variables={[variable({ nombre: 'edad', valor: '17' }), variable({ nombre: 'nombre', tipo: 'String', valor: '"Ana"' })]} />);
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Nombre', 'Valor']);
    const edad = within(filaDe('edad'));
    expect(edad.getByText('17')).toBeTruthy();
    expect(edad.queryByText('int')).toBeNull();
    expect(within(filaDe('nombre')).queryByText('String')).toBeNull();
  });

  it('el valor anterior, la palabra «nueva» y «sin inicializar» siguen diciéndose igual', () => {
    render(
      <PanelVariables
        compacto
        variables={[variable({ nombre: 'i', valor: '4', anterior: '3', estado: 'cambio' }), variable({ nombre: 'n', valor: '1', estado: 'nueva' }), variable({ nombre: 'z', valor: null })]}
      />,
    );
    expect(within(filaDe('i')).getByText('4')).toBeTruthy();
    expect(filaDe('i').textContent).toContain('3');
    expect(within(filaDe('n')).getByText('nueva')).toBeTruthy();
    expect(within(filaDe('z')).getByText('sin inicializar')).toBeTruthy();
  });

  it('sin `compacto` la columna «Tipo» sigue ahí (modo normal)', () => {
    render(<PanelVariables variables={[variable({ nombre: 'edad', valor: '17' })]} />);
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Nombre', 'Tipo', 'Valor']);
  });
});
