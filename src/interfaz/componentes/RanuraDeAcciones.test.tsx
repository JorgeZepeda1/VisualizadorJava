// RED de las tareas R0.9 y R0.10 (REQ-PANT-003, REQ-PANT-007, ADR 017): la ranura de acciones, pegada bajo el globo. Aloja —NUNCA a la vez— las puertas del saludo, el par «◀ Anterior · Siguiente ▶» y las
// acciones del fin. «Siguiente» es el botón primario y anuncia su atajo; «Anterior» se apaga en el paso 0 y «Siguiente» en el último paso que el motor ya calculó. Presentacional puro: avisa qué se eligió.
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { puertasDelSaludo, type Ranura } from '../../presentacion/index.ts';
import { RanuraDeAcciones, type PropiedadesRanuraDeAcciones } from './RanuraDeAcciones.tsx';

function propiedades(ranura: Ranura, parcial: Partial<PropiedadesRanuraDeAcciones> = {}): PropiedadesRanuraDeAcciones {
  return {
    ranura,
    alElegirPuerta: () => undefined,
    alAnterior: () => undefined,
    alSiguiente: () => undefined,
    alProbarConOtrosDatos: () => undefined,
    alModificarElPrograma: () => undefined,
    ...parcial,
  };
}

const NAVEGACION = (alPrincipio: boolean, alFinal: boolean): Ranura => ({ tipo: 'navegacion', alPrincipio, alFinal });

describe('<RanuraDeAcciones/> — las puertas del saludo', () => {
  it('muestra las puertas que recibe y avisa cuál se eligió', async () => {
    const alElegirPuerta = vi.fn();
    render(<RanuraDeAcciones {...propiedades({ tipo: 'puertas', puertas: puertasDelSaludo({ hayTemasPublicados: false }) }, { alElegirPuerta })} />);
    expect(screen.getByTestId('ranura-de-acciones').getAttribute('data-ranura')).toBe('puertas');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Probar mi programa' }));
    expect(alElegirPuerta).toHaveBeenCalledWith('probar-mi-programa');
  });

  it('la primera puerta recibe la referencia del foco inicial', () => {
    const refPrimeraPuerta = createRef<HTMLButtonElement>();
    render(<RanuraDeAcciones {...propiedades({ tipo: 'puertas', puertas: puertasDelSaludo({ hayTemasPublicados: false }) }, { refPrimeraPuerta })} />);
    expect(refPrimeraPuerta.current).toBe(screen.getByRole('button', { name: 'Ver un ejemplo paso a paso' }));
  });
});

describe('<RanuraDeAcciones/> — «◀ Anterior · Siguiente ▶» (REQ-PANT-003)', () => {
  it('«Siguiente» es el botón primario y «Anterior» el secundario', () => {
    render(<RanuraDeAcciones {...propiedades(NAVEGACION(false, false))} />);
    expect(screen.getByRole('button', { name: /siguiente/i }).className).toContain('boton-principal');
    expect(screen.getByRole('button', { name: /anterior/i }).className).not.toContain('boton-principal');
  });

  it('cada botón anuncia su atajo de teclado', () => {
    render(<RanuraDeAcciones {...propiedades(NAVEGACION(false, false))} />);
    expect(screen.getByRole('button', { name: /anterior/i }).getAttribute('aria-keyshortcuts')).toBe('ArrowLeft');
    expect(screen.getByRole('button', { name: /siguiente/i }).getAttribute('aria-keyshortcuts')).toBe('ArrowRight');
  });

  it('el par es un grupo con nombre, y lleva el glifo Y la palabra (nada va solo por símbolo)', () => {
    render(<RanuraDeAcciones {...propiedades(NAVEGACION(false, false))} />);
    const grupo = screen.getByRole('group', { name: 'Qué hacer ahora' });
    expect(within(grupo).getAllByRole('button').map((boton) => boton.textContent)).toEqual(['◀ Anterior', 'Siguiente ▶']);
  });

  it('en el paso 0 «Anterior» está apagado; en el último paso calculado, «Siguiente»', () => {
    const { rerender } = render(<RanuraDeAcciones {...propiedades(NAVEGACION(true, false))} />);
    expect((screen.getByRole('button', { name: /anterior/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /siguiente/i }) as HTMLButtonElement).disabled).toBe(false);

    rerender(<RanuraDeAcciones {...propiedades(NAVEGACION(false, true))} />);
    expect((screen.getByRole('button', { name: /anterior/i }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: /siguiente/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('avisa cuál se pulsó, y «Siguiente» entrega la referencia para el foco', async () => {
    const alAnterior = vi.fn();
    const alSiguiente = vi.fn();
    const refSiguiente = createRef<HTMLButtonElement>();
    const usuario = userEvent.setup();
    render(<RanuraDeAcciones {...propiedades(NAVEGACION(false, false), { alAnterior, alSiguiente, refSiguiente })} />);

    await usuario.click(screen.getByRole('button', { name: /anterior/i }));
    await usuario.click(screen.getByRole('button', { name: /siguiente/i }));

    expect(alAnterior).toHaveBeenCalledTimes(1);
    expect(alSiguiente).toHaveBeenCalledTimes(1);
    expect(refSiguiente.current).toBe(screen.getByRole('button', { name: /siguiente/i }));
  });
});

describe('<RanuraDeAcciones/> — el fin del recorrido (REQ-PANT-007)', () => {
  const FIN: Ranura = { tipo: 'fin', acciones: ['anterior', 'probar-con-otros-datos', 'modificar-el-programa'], principal: 'probar-con-otros-datos' };

  it('ofrece volver atrás, probar con otros datos y modificar el programa, con «Probar con otros datos» como botón primario', () => {
    render(<RanuraDeAcciones {...propiedades(FIN)} />);
    const grupo = screen.getByRole('group', { name: 'Qué sigue' });
    expect(within(grupo).getAllByRole('button').map((boton) => boton.textContent)).toEqual(['◀ Anterior', 'Probar con otros datos', 'Modificar el programa']);
    expect(screen.getByRole('button', { name: 'Probar con otros datos' }).className).toContain('boton-principal');
    expect(screen.getByRole('button', { name: 'Modificar el programa' }).className).not.toContain('boton-principal');
    expect(screen.queryByRole('button', { name: /siguiente/i })).toBeNull();
  });

  // Panel R0 (diseñador): en un ciclo que el visualizador detuvo, probar otros datos no lo arregla; lo principal es corregir el programa.
  it('si la acción principal es «Modificar el programa» (un ciclo detenido), ese es el botón primario y el foco del fin', () => {
    const refPrimariaDelFin = createRef<HTMLButtonElement>();
    render(<RanuraDeAcciones {...propiedades({ tipo: 'fin', acciones: ['anterior', 'probar-con-otros-datos', 'modificar-el-programa'], principal: 'modificar-el-programa' }, { refPrimariaDelFin })} />);
    expect(screen.getByRole('button', { name: 'Modificar el programa' }).className).toContain('boton-principal');
    expect(screen.getByRole('button', { name: 'Probar con otros datos' }).className).not.toContain('boton-principal');
    expect(refPrimariaDelFin.current).toBe(screen.getByRole('button', { name: 'Modificar el programa' }));
  });

  it('un programa que no lee datos no trae «Probar con otros datos»', () => {
    render(<RanuraDeAcciones {...propiedades({ tipo: 'fin', acciones: ['anterior', 'modificar-el-programa'], principal: 'modificar-el-programa' })} />);
    expect(screen.queryByRole('button', { name: 'Probar con otros datos' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Modificar el programa' }).className).toContain('boton-principal');
  });

  it('un programa de cero pasos no ofrece «Anterior»: no hay a dónde volver', () => {
    render(<RanuraDeAcciones {...propiedades({ tipo: 'fin', acciones: ['probar-con-otros-datos', 'modificar-el-programa'], principal: 'probar-con-otros-datos' })} />);
    expect(screen.queryByRole('button', { name: /anterior/i })).toBeNull();
  });

  it('cada acción avisa cuál se eligió', async () => {
    const alAnterior = vi.fn();
    const alProbarConOtrosDatos = vi.fn();
    const alModificarElPrograma = vi.fn();
    const usuario = userEvent.setup();
    render(<RanuraDeAcciones {...propiedades(FIN, { alAnterior, alProbarConOtrosDatos, alModificarElPrograma })} />);

    await usuario.click(screen.getByRole('button', { name: 'Probar con otros datos' }));
    await usuario.click(screen.getByRole('button', { name: 'Modificar el programa' }));
    await usuario.click(screen.getByRole('button', { name: /anterior/i }));

    expect(alProbarConOtrosDatos).toHaveBeenCalledTimes(1);
    expect(alModificarElPrograma).toHaveBeenCalledTimes(1);
    expect(alAnterior).toHaveBeenCalledTimes(1);
  });

  it('la acción primaria del fin recibe la referencia para el foco', () => {
    const refPrimariaDelFin = createRef<HTMLButtonElement>();
    render(<RanuraDeAcciones {...propiedades(FIN, { refPrimariaDelFin })} />);
    expect(refPrimariaDelFin.current).toBe(screen.getByRole('button', { name: 'Probar con otros datos' }));
  });
});

describe('<RanuraDeAcciones/> — sin nada que ofrecer', () => {
  it('la ranura sigue en su lugar pero vacía: no mueve la pantalla cuando aparece algo', () => {
    render(<RanuraDeAcciones {...propiedades({ tipo: 'ninguna' })} />);
    const ranura = screen.getByTestId('ranura-de-acciones');
    expect(ranura.getAttribute('data-ranura')).toBe('ninguna');
    expect(within(ranura).queryAllByRole('button')).toHaveLength(0);
  });
});
