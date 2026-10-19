// RED de las tareas R0.8 y R0.9 (REQ-PANT-001, REQ-PANT-003, PQ-2, ADR 017): qué hay en la ranura de acciones, pegada bajo el globo. Una sola cosa a la vez: las puertas del saludo, el par «Anterior · Siguiente»
// (y, en R1, las opciones del reto) o las acciones del fin. Cada puerta aparece solo cuando su destino tiene contenido: sin ningún tema publicado no hay «Leer un tema». Puro, sin DOM.
import { describe, expect, it } from 'vitest';
import { derivarRanura, puertasDelSaludo } from './ranura.ts';
import type { EstadoDeLaEjecucion } from './robot.ts';

const IDS = (puertas: ReturnType<typeof puertasDelSaludo>) => puertas.map((puerta) => puerta.id);

describe('puertasDelSaludo (REQ-PANT-001, PQ-2)', () => {
  it('sin ningún tema publicado, «Leer un tema» no aparece y las otras dos sí, en este orden', () => {
    expect(IDS(puertasDelSaludo({ hayTemasPublicados: false }))).toEqual(['ver-un-ejemplo', 'probar-mi-programa']);
  });

  it('con al menos un tema publicado aparecen las tres, empezando por «Leer un tema»', () => {
    expect(IDS(puertasDelSaludo({ hayTemasPublicados: true }))).toEqual(['leer-un-tema', 'ver-un-ejemplo', 'probar-mi-programa']);
  });

  it('cada puerta lleva el accesorio del robot que ayuda ahí (el libro, el puntero, la lupa), no su cara', () => {
    const puertas = puertasDelSaludo({ hayTemasPublicados: true });
    expect(puertas.map((puerta) => puerta.accesorio)).toEqual(['libro-abierto', 'puntero', 'lupa']);
  });
});

const entrada = (ejecucion: EstadoDeLaEjecucion, parcial: { paso?: number; total?: number; hayTemasPublicados?: boolean } = {}) => ({
  ejecucion,
  paso: 0,
  total: 0,
  hayTemasPublicados: false,
  ...parcial,
});

describe('derivarRanura: el saludo y la edición', () => {
  it('en el saludo la ranura ofrece las puertas que tienen destino', () => {
    expect(derivarRanura(entrada({ estado: 'saludo' }))).toEqual({ tipo: 'puertas', puertas: puertasDelSaludo({ hayTemasPublicados: false }) });
    const conTemas = derivarRanura(entrada({ estado: 'saludo' }, { hayTemasPublicados: true }));
    expect(conTemas.tipo === 'puertas' && IDS(conTemas.puertas)).toEqual(['leer-un-tema', 'ver-un-ejemplo', 'probar-mi-programa']);
  });

  it('mientras el alumno escribe, se revisa el programa o cambió tras un aviso no hay nada en la ranura', () => {
    for (const estado of ['sin-ejecutar', 'compilando', 'cambiado-tras-un-aviso'] as const) {
      expect(derivarRanura(entrada({ estado })), estado).toEqual({ tipo: 'ninguna' });
    }
  });
});

// R0.9 (REQ-PANT-003): durante la visualización la ranura es el par «Anterior · Siguiente»; nunca dos cosas a la vez.
describe('derivarRanura: la navegación durante la visualización', () => {
  it('en el paso 0 «Anterior» no tiene a dónde ir y «Siguiente» sí', () => {
    expect(derivarRanura(entrada({ estado: 'calculando' }, { paso: 0, total: 8 }))).toEqual({ tipo: 'navegacion', alPrincipio: true, alFinal: false });
  });

  it('en un paso de en medio los dos botones están disponibles', () => {
    expect(derivarRanura(entrada({ estado: 'calculando' }, { paso: 3, total: 8 }))).toEqual({ tipo: 'navegacion', alPrincipio: false, alFinal: false });
  });

  it('en el último paso de lo que el motor ya calculó, «Siguiente» se apaga mientras el programa espera un dato o el motor sigue calculando', () => {
    expect(derivarRanura(entrada({ estado: 'esperando-entrada', nodo: 3 }, { paso: 8, total: 8 }))).toEqual({ tipo: 'navegacion', alPrincipio: false, alFinal: true });
    expect(derivarRanura(entrada({ estado: 'calculando' }, { paso: 5, total: 5 }))).toEqual({ tipo: 'navegacion', alPrincipio: false, alFinal: true });
  });

  it('una ejecución detenida antes del final sigue siendo navegable', () => {
    expect(derivarRanura(entrada({ estado: 'detenida' }, { paso: 2, total: 6 }))).toEqual({ tipo: 'navegacion', alPrincipio: false, alFinal: false });
  });

  it('un programa que terminó, antes de llegar a su último paso, también ofrece el par', () => {
    expect(derivarRanura(entrada({ estado: 'terminada', fin: { causa: 'terminado' } }, { paso: 4, total: 8 }))).toEqual({ tipo: 'navegacion', alPrincipio: false, alFinal: false });
  });
});

// R0.10 (REQ-PANT-007): en el último paso de un programa que terminó, la ranura ofrece qué sigue.
describe('derivarRanura: el fin del recorrido', () => {
  it('en el último paso de un programa que terminó ofrece volver atrás, probar con otros datos y modificar el programa', () => {
    const ranura = derivarRanura(entrada({ estado: 'terminada', fin: { causa: 'terminado' } }, { paso: 8, total: 8 }));
    expect(ranura).toEqual({ tipo: 'fin', acciones: ['anterior', 'probar-con-otros-datos', 'modificar-el-programa'] });
  });

  it('también cuando terminó por una excepción o por un límite del visualizador: hay algo que probar o corregir', () => {
    for (const causa of ['excepcion', 'limite-pasos', 'limite-tiempo', 'limite-caracteres', 'no-disponible-en-ejecucion'] as const) {
      expect(derivarRanura(entrada({ estado: 'terminada', fin: { causa } }, { paso: 5, total: 5 })).tipo, causa).toBe('fin');
    }
  });

  it('un programa de cero pasos que ya terminó está en su último paso: ofrece las acciones del fin, sin «Anterior» (no hay a dónde volver)', () => {
    expect(derivarRanura(entrada({ estado: 'terminada', fin: { causa: 'terminado' } }, { paso: 0, total: 0 }))).toEqual({
      tipo: 'fin',
      acciones: ['probar-con-otros-datos', 'modificar-el-programa'],
    });
  });

  it('antes del último paso, o mientras el programa espera un dato o se detuvo, no hay acciones del fin', () => {
    expect(derivarRanura(entrada({ estado: 'terminada', fin: { causa: 'terminado' } }, { paso: 7, total: 8 })).tipo).toBe('navegacion');
    expect(derivarRanura(entrada({ estado: 'esperando-entrada', nodo: 1 }, { paso: 8, total: 8 })).tipo).toBe('navegacion');
    expect(derivarRanura(entrada({ estado: 'detenida' }, { paso: 8, total: 8 })).tipo).toBe('navegacion');
  });
});
