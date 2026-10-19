// RED de la tarea R0.11 (REQ-AULA-001, ADR 017): la galería «Ejemplos». Programas por unidad (U3 a U7) y «Ejercicio de la clase» con el ejercicio del PO; cada programa con su título, su origen marcado (del curso o
// ejercicio del profesor), una línea de «Qué observar» y su botón «Ver paso a paso»; la máquina de snacks con sus cinco datos de ejemplo. Presentacional puro: recibe la galería ya armada (o `null`
// mientras carga) y avisa qué se abrió y con qué entrada. La primera acción recibe el foco: con el teclado, de la puerta del saludo a un ejemplo en tres acciones.
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { armarGaleria } from '../../presentacion/galeria.ts';
import { Galeria } from './Galeria.tsx';

const ARCHIVOS: Readonly<Record<string, string>> = {
  'u3-hola-mundo.java': 'class Hola {}',
  'u3-saludo-con-scanner.java': 'class Saludo {}',
  'u3-saludo-con-scanner.entrada.txt': 'Carlos\n',
  'u6-error-por-uno.java': 'class Uno {}',
  'maquina-snacks-a1-2-50.java': 'class Snacks {}',
  'maquina-snacks-a1-2-50.entrada.txt': 'a1\n2\n50\n',
  'maquina-snacks-b3.java': 'class Snacks {}',
  'maquina-snacks-b3.entrada.txt': 'b3\n',
  'maquina-snacks-z9.java': 'class Snacks {}',
  'maquina-snacks-z9.entrada.txt': 'z9\n',
};
const GALERIA = armarGaleria(ARCHIVOS);

function programa(id: string) {
  const encontrado = GALERIA.secciones.flatMap((seccion) => seccion.programas).find((candidato) => candidato.id === id);
  if (encontrado === undefined) throw new Error(`no hay ${id}`);
  return encontrado;
}

describe('<Galeria/> — la lista de ejemplos', () => {
  it('lleva el título «Ejemplos», una ayuda y una sección con su título por «Ejercicio de la clase» y por cada unidad', () => {
    render(<Galeria galeria={GALERIA} alAbrir={() => undefined} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Ejemplos' })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 3 }).map((titulo) => titulo.textContent)).toEqual(['Ejercicio de la clase', 'Unidad 3 · Primeros programas', 'Unidad 6 · Ciclos']);
  });

  it('cada programa tiene su título como encabezado, su origen marcado y «Qué observar» con el código pintado como código', () => {
    render(<Galeria galeria={GALERIA} alAbrir={() => undefined} />);
    const hola = screen.getByRole('heading', { level: 4, name: '«Hola, mundo»' }).closest('li') as HTMLElement;
    expect(within(hola).getByText('Del curso')).toBeTruthy();
    expect(within(hola).getByText('Qué observar')).toBeTruthy();
    expect(within(hola).getAllByText('System.out.println', { selector: 'code' })).toHaveLength(1);
    const snacks = screen.getByRole('heading', { level: 4, name: 'Máquina de snacks' }).closest('li') as HTMLElement;
    expect(within(snacks).getByText('Ejercicio del profesor')).toBeTruthy();
  });

  // Item 6 del diseñador (panel R0): un título con comillas invertidas se pinta como código —como «Qué observar»— y el nombre accesible de sus botones no las dice.
  it('un título con código (`for`) se pinta como código y sus botones lo nombran sin comillas invertidas', () => {
    render(<Galeria galeria={GALERIA} alAbrir={() => undefined} />);
    const titulo = screen.getByRole('heading', { level: 4, name: 'Predice: tres for casi iguales' });
    expect(titulo.textContent).toBe('Predice: tres for casi iguales');
    expect(titulo.querySelector('code')?.textContent).toBe('for');
    expect(screen.getByRole('button', { name: 'Ver paso a paso: Predice: tres for casi iguales' })).toBeTruthy();
    expect(document.body.innerHTML).not.toContain('`');
  });

  it('un programa sin datos preparados se abre con «Ver paso a paso» y su entrada vacía', async () => {
    const alAbrir = vi.fn();
    render(<Galeria galeria={GALERIA} alAbrir={alAbrir} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ver paso a paso: «Hola, mundo»' }));
    expect(alAbrir).toHaveBeenCalledExactlyOnceWith(programa('u3-hola-mundo'), '');
  });

  it('un programa con datos de ejemplo los muestra y se abre con ellos o, con «Con mis datos», con la entrada vacía', async () => {
    const alAbrir = vi.fn();
    const usuario = userEvent.setup();
    render(<Galeria galeria={GALERIA} alAbrir={alAbrir} />);
    const saludo = screen.getByRole('heading', { level: 4, name: 'Saludo con tu nombre' }).closest('li') as HTMLElement;
    expect(within(saludo).getByText('Datos de ejemplo: Carlos')).toBeTruthy();

    await usuario.click(within(saludo).getByRole('button', { name: 'Ver paso a paso: Saludo con tu nombre' }));
    expect(alAbrir).toHaveBeenLastCalledWith(programa('u3-saludo-con-scanner'), 'Carlos\n');
    await usuario.click(within(saludo).getByRole('button', { name: 'Con mis datos: Saludo con tu nombre' }));
    expect(alAbrir).toHaveBeenLastCalledWith(programa('u3-saludo-con-scanner'), '');
  });

  it('un programa sin datos preparados no ofrece «Con mis datos»: ahí no hay nada que cambiar', () => {
    render(<Galeria galeria={GALERIA} alAbrir={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'Con mis datos: «Hola, mundo»' })).toBeNull();
  });

  it('la máquina de snacks ofrece sus datos de ejemplo, cada uno con lo que pasa; el primero es a1 · 2 · 50; cada botón abre con su entrada', async () => {
    const alAbrir = vi.fn();
    const usuario = userEvent.setup();
    render(<Galeria galeria={GALERIA} alAbrir={alAbrir} />);
    const grupo = screen.getByRole('group', { name: 'Datos de ejemplo: Máquina de snacks' });
    const botones = within(grupo).getAllByRole('button');
    expect(botones.map((boton) => boton.querySelector('.muestra-etiqueta')?.textContent)).toEqual(['a1 · 2 · 50', 'b3', 'z9']);
    expect(botones[0]?.textContent).toContain('Código a1, 2 piezas, paga con $50');

    await usuario.click(botones[1] as HTMLElement);
    expect(alAbrir).toHaveBeenLastCalledWith(programa('maquina-snacks'), 'b3\n');
    await usuario.click(within(screen.getByRole('heading', { level: 4, name: 'Máquina de snacks' }).closest('li') as HTMLElement).getByRole('button', { name: 'Con mis datos: Máquina de snacks' }));
    expect(alAbrir).toHaveBeenLastCalledWith(programa('maquina-snacks'), '');
  });

  it('la primera acción de la lista recibe el foco: con el teclado, el primer dato de la máquina de snacks', () => {
    render(<Galeria galeria={GALERIA} alAbrir={() => undefined} />);
    const primera = within(screen.getByRole('group', { name: 'Datos de ejemplo: Máquina de snacks' })).getAllByRole('button')[0];
    expect(document.activeElement).toBe(primera);
  });

  it('si no hay máquina de snacks, el foco va al primer «Ver paso a paso» de la lista', () => {
    render(<Galeria galeria={armarGaleria({ 'u3-hola-mundo.java': 'class Hola {}' })} alAbrir={() => undefined} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Ver paso a paso: «Hola, mundo»' }));
  });

  it('se abre con Enter con el foco en un botón: todo se opera con el teclado', async () => {
    const alAbrir = vi.fn();
    const usuario = userEvent.setup();
    render(<Galeria galeria={GALERIA} alAbrir={alAbrir} />);
    await usuario.keyboard('{Enter}');
    expect(alAbrir).toHaveBeenCalledExactlyOnceWith(programa('maquina-snacks'), 'a1\n2\n50\n');
  });
});

describe('<Galeria/> — cargando y con error', () => {
  it('mientras la galería carga lo dice en una región de estado y no hay botones', () => {
    render(<Galeria galeria={null} alAbrir={() => undefined} />);
    expect(screen.getByRole('status').textContent).toBe('Cargando los ejemplos…');
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('si no pudo cargarla, lo dice en una alerta con el título de la sección', () => {
    render(<Galeria galeria={null} fallo alAbrir={() => undefined} />);
    expect(screen.getByRole('alert').textContent).toBe('No se pudieron cargar los ejemplos. Recarga la página para intentarlo otra vez.');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('el título «Ejemplos» está siempre, cargando o no', () => {
    render(<Galeria galeria={null} alAbrir={() => undefined} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Ejemplos' })).toBeTruthy();
  });
});
