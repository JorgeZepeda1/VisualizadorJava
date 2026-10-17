// RED de la tarea 4.13 (design.md §6.1, ADR 013): el reductor de `EstadoApp` — el estado de la pantalla (modo, código, cómo va la ejecución, a qué paso se mira, si reproduce y a qué velocidad). Es
// una función pura: la `Traza` y el trabajador viven fuera de React; lo que llega del trabajador y lo que hace el alumno entran como acciones. La posición se acota con el `total` de la traza
// que cada acción de navegación trae (la traza es la única fuente de verdad de cuántos pasos hay).
import { describe, expect, it } from 'vitest';
import type { VistaPrograma } from '../../motor/vista.ts';
import { estadoInicial, reductor, type Accion, type AvisoDeEdicion, type EstadoApp } from './reductor.ts';

const VISTA: VistaPrograma = { fuente: 'x', ranuras: [], nodos: [] };
const AVISO: AvisoDeEdicion = { tipo: 'error-compilacion', segmentos: [{ tipo: 'texto', texto: 'Línea 3: Falta ;' }], adicionales: 0, resaltado: { desde: 1, hasta: 4, linea: 3, tipo: 'error' } };

function aplicar(estado: EstadoApp, ...acciones: Accion[]): EstadoApp {
  return acciones.reduce(reductor, estado);
}

/** Un estado ya visualizando, con la vista compilada. */
function visualizando(parcial: Partial<EstadoApp['navegacion']> = {}): EstadoApp {
  const base = aplicar(estadoInicial('programa'), { tipo: 'visualizar', id: 1 }, { tipo: 'compilado-ok', vista: VISTA });
  return { ...base, navegacion: { ...base.navegacion, ...parcial } };
}

describe('reductor: del código a la visualización', () => {
  it('empieza en edición, con el código dado, en el paso 0, sin reproducir y a velocidad normal', () => {
    expect(estadoInicial('programa')).toEqual({
      modo: 'edicion',
      codigo: 'programa',
      ejecucion: { id: 0, estado: 'calculando', nodoEnEspera: null, fin: null, vista: null },
      aviso: null,
      navegacion: { paso: 0, reproduciendo: false, velocidad: 3, seguirAlLlegar: false },
    });
  });

  it('editar cambia el código', () => {
    expect(aplicar(estadoInicial('a'), { tipo: 'editar', codigo: 'b' }).codigo).toBe('b');
  });

  it('visualizar pasa a «compilando», con la ejecución nueva y sin aviso', () => {
    const conAviso = aplicar(estadoInicial('a'), { tipo: 'problema-al-revisar', aviso: AVISO });
    const estado = aplicar(conAviso, { tipo: 'visualizar', id: 7 });
    expect(estado.modo).toBe('compilando');
    expect(estado.ejecucion).toEqual({ id: 7, estado: 'calculando', nodoEnEspera: null, fin: null, vista: null });
    expect(estado.aviso).toBeNull();
  });

  it('al compilar bien pasa a «visualización», guarda la vista del programa y mira el paso 0', () => {
    const estado = aplicar(estadoInicial('a'), { tipo: 'visualizar', id: 1 }, { tipo: 'compilado-ok', vista: VISTA });
    expect(estado.modo).toBe('visualizacion');
    expect(estado.ejecucion.vista).toBe(VISTA);
    expect(estado.navegacion.paso).toBe(0);
  });

  it('si el programa tiene un problema vuelve a edición con el aviso', () => {
    const estado = aplicar(estadoInicial('a'), { tipo: 'visualizar', id: 1 }, { tipo: 'problema-al-revisar', aviso: AVISO });
    expect(estado.modo).toBe('edicion');
    expect(estado.aviso).toBe(AVISO);
  });

  it('editar con un aviso a la vista lo conserva, pero le quita el subrayado (ya no señala el código nuevo)', () => {
    const estado = aplicar(estadoInicial('a'), { tipo: 'problema-al-revisar', aviso: AVISO }, { tipo: 'editar', codigo: 'ab' });
    expect(estado.aviso?.segmentos).toEqual(AVISO.segmentos);
    expect(estado.aviso?.resaltado).toBeNull();
  });

  it('volver a editar termina la visualización: edición, sin aviso, paso 0 y sin reproducir', () => {
    const estado = aplicar(visualizando({ paso: 4, reproduciendo: true }), { tipo: 'volver-a-editar' });
    expect(estado.modo).toBe('edicion');
    expect(estado.navegacion).toMatchObject({ paso: 0, reproduciendo: false });
    expect(estado.ejecucion.vista).toBeNull();
    expect(estado.aviso).toBeNull();
    expect(estado.codigo).toBe('programa');
  });

  it('visualizar de nuevo conserva la velocidad que el alumno eligió', () => {
    const estado = aplicar(visualizando({ velocidad: 5 }), { tipo: 'visualizar', id: 2 });
    expect(estado.navegacion.velocidad).toBe(5);
    expect(estado.navegacion.paso).toBe(0);
  });
});

describe('reductor: lo que manda el trabajador', () => {
  it('espera-entrada guarda el nodo de la lectura pendiente', () => {
    const estado = aplicar(visualizando(), { tipo: 'espera-entrada', nodo: 8 });
    expect(estado.ejecucion).toMatchObject({ estado: 'esperando-entrada', nodoEnEspera: 8 });
  });

  it('entrada-enviada vuelve a «calculando» y pide seguir al paso nuevo cuando llegue', () => {
    const estado = aplicar(visualizando(), { tipo: 'espera-entrada', nodo: 8 }, { tipo: 'entrada-enviada' });
    expect(estado.ejecucion).toMatchObject({ estado: 'calculando', nodoEnEspera: null });
    expect(estado.navegacion.seguirAlLlegar).toBe(true);
  });

  it('si el alumno estaba en el último paso al teclear el dato, al llegar los pasos nuevos avanza al primero (el de la lectura)', () => {
    const estado = aplicar(
      visualizando({ paso: 8 }),
      { tipo: 'espera-entrada', nodo: 8 },
      { tipo: 'entrada-enviada' },
      { tipo: 'pasos-recibidos', totalAnterior: 8, total: 16 },
    );
    expect(estado.navegacion.paso).toBe(9);
    expect(estado.navegacion.seguirAlLlegar).toBe(false);
  });

  it('si el alumno estaba mirando un paso anterior, no lo mueve cuando llegan pasos', () => {
    const estado = aplicar(
      visualizando({ paso: 3 }),
      { tipo: 'espera-entrada', nodo: 8 },
      { tipo: 'entrada-enviada' },
      { tipo: 'pasos-recibidos', totalAnterior: 8, total: 16 },
    );
    expect(estado.navegacion.paso).toBe(3);
    expect(estado.navegacion.seguirAlLlegar).toBe(false);
  });

  it('pasos que llegan sin haber pedido seguir no mueven la posición', () => {
    const estado = aplicar(visualizando({ paso: 0 }), { tipo: 'pasos-recibidos', totalAnterior: 0, total: 8 });
    expect(estado.navegacion.paso).toBe(0);
  });

  it('fin guarda cómo terminó', () => {
    const estado = aplicar(visualizando(), { tipo: 'fin', fin: { causa: 'terminado' } });
    expect(estado.ejecucion).toMatchObject({ estado: 'terminada', fin: { causa: 'terminado' } });
  });
});

describe('reductor: navegación', () => {
  it('siguiente avanza un paso y no pasa del total', () => {
    expect(aplicar(visualizando({ paso: 2 }), { tipo: 'siguiente', total: 10 }).navegacion.paso).toBe(3);
    expect(aplicar(visualizando({ paso: 10 }), { tipo: 'siguiente', total: 10 }).navegacion.paso).toBe(10);
  });

  it('anterior retrocede un paso y no baja de cero', () => {
    expect(aplicar(visualizando({ paso: 2 }), { tipo: 'anterior' }).navegacion.paso).toBe(1);
    expect(aplicar(visualizando({ paso: 0 }), { tipo: 'anterior' }).navegacion.paso).toBe(0);
  });

  it('reiniciar vuelve al paso 0 y detiene la reproducción', () => {
    const estado = aplicar(visualizando({ paso: 7, reproduciendo: true }), { tipo: 'reiniciar' });
    expect(estado.navegacion).toMatchObject({ paso: 0, reproduciendo: false });
  });

  it('al-final salta al último paso y detiene la reproducción', () => {
    const estado = aplicar(visualizando({ paso: 1, reproduciendo: true }), { tipo: 'al-final', total: 12 });
    expect(estado.navegacion).toMatchObject({ paso: 12, reproduciendo: false });
  });

  it('ir-al-paso salta a ese paso, acotado entre 0 y el total', () => {
    expect(aplicar(visualizando(), { tipo: 'ir-al-paso', paso: 6, total: 10 }).navegacion.paso).toBe(6);
    expect(aplicar(visualizando(), { tipo: 'ir-al-paso', paso: 99, total: 10 }).navegacion.paso).toBe(10);
    expect(aplicar(visualizando(), { tipo: 'ir-al-paso', paso: -3, total: 10 }).navegacion.paso).toBe(0);
  });

  it('cualquier navegación a mano pausa la reproducción', () => {
    for (const accion of [{ tipo: 'siguiente', total: 10 }, { tipo: 'anterior' }, { tipo: 'ir-al-paso', paso: 4, total: 10 }] as const) {
      expect(aplicar(visualizando({ paso: 5, reproduciendo: true }), accion).navegacion.reproduciendo, accion.tipo).toBe(false);
    }
  });

  it('la velocidad se cambia sin mover la posición ni detener la reproducción', () => {
    const estado = aplicar(visualizando({ paso: 3, reproduciendo: true }), { tipo: 'velocidad', velocidad: 5 });
    expect(estado.navegacion).toMatchObject({ paso: 3, reproduciendo: true, velocidad: 5 });
  });
});

describe('reductor: reproducción', () => {
  it('alternar-reproduccion empieza a reproducir y, de nuevo, pausa', () => {
    const reproduciendo = aplicar(visualizando({ paso: 1 }), { tipo: 'alternar-reproduccion', total: 10 });
    expect(reproduciendo.navegacion.reproduciendo).toBe(true);
    expect(aplicar(reproduciendo, { tipo: 'alternar-reproduccion', total: 10 }).navegacion.reproduciendo).toBe(false);
  });

  it('en el último paso no hay nada que reproducir', () => {
    expect(aplicar(visualizando({ paso: 10 }), { tipo: 'alternar-reproduccion', total: 10 }).navegacion.reproduciendo).toBe(false);
  });

  it('cada tic avanza un paso mientras reproduce', () => {
    const estado = aplicar(visualizando({ paso: 1, reproduciendo: true }), { tipo: 'tic', total: 10 });
    expect(estado.navegacion).toMatchObject({ paso: 2, reproduciendo: true });
  });

  it('un tic sin estar reproduciendo no hace nada', () => {
    const estado = aplicar(visualizando({ paso: 1, reproduciendo: false }), { tipo: 'tic', total: 10 });
    expect(estado.navegacion.paso).toBe(1);
  });

  it('al llegar al último paso con el programa terminado, la reproducción se detiene sola', () => {
    const terminado = aplicar(visualizando({ paso: 9, reproduciendo: true }), { tipo: 'fin', fin: { causa: 'terminado' } });
    const estado = aplicar(terminado, { tipo: 'tic', total: 10 });
    expect(estado.navegacion).toMatchObject({ paso: 10, reproduciendo: false });
  });

  it('al llegar al último paso con el programa esperando un dato, se detiene sola', () => {
    const esperando = aplicar(visualizando({ paso: 9, reproduciendo: true }), { tipo: 'espera-entrada', nodo: 3 });
    const estado = aplicar(esperando, { tipo: 'tic', total: 10 });
    expect(estado.navegacion).toMatchObject({ paso: 10, reproduciendo: false });
  });

  it('si el motor aún calcula y se acabaron los pasos, espera sin detenerse (llegarán más)', () => {
    const estado = aplicar(visualizando({ paso: 10, reproduciendo: true }), { tipo: 'tic', total: 10 });
    expect(estado.navegacion).toMatchObject({ paso: 10, reproduciendo: true });
  });

  it('un tic con el programa terminado y ya en el último paso detiene la reproducción', () => {
    const terminado = aplicar(visualizando({ paso: 10, reproduciendo: true }), { tipo: 'fin', fin: { causa: 'terminado' } });
    expect(aplicar(terminado, { tipo: 'tic', total: 10 }).navegacion.reproduciendo).toBe(false);
  });
});
