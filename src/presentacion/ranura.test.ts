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

  // Panel R0 (diseñador): la lupa con «!» es del robot revisor y será la marca de trampa; «Probar mi programa» lleva su propio dibujo, que no pertenece a ningún robot: una hoja con código y un lápiz.
  it('«Leer un tema» y «Ver un ejemplo» llevan el accesorio de su robot (el libro, el puntero) y «Probar mi programa» una hoja con lápiz que no es de ningún robot', () => {
    const puertas = puertasDelSaludo({ hayTemasPublicados: true });
    expect(puertas.map((puerta) => puerta.accesorio)).toEqual(['libro-abierto', 'puntero', 'hoja-con-lapiz']);
  });
});

const entrada = (ejecucion: EstadoDeLaEjecucion, parcial: { paso?: number; total?: number; hayTemasPublicados?: boolean; leeDatos?: boolean } = {}) => ({
  ejecucion,
  paso: 0,
  total: 0,
  hayTemasPublicados: false,
  leeDatos: false,
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
// Panel R0 (diseñador, «Antes de publicar» 5): «Probar con otros datos» solo si el programa LEE datos —si no, no hay otros datos que probar—, y en un ciclo que el visualizador detuvo la acción principal
// es «Modificar el programa»: probar otros datos no arregla un ciclo que no termina.
describe('derivarRanura: el fin del recorrido', () => {
  const terminada = (causa: 'terminado' | 'excepcion' | 'limite-pasos' | 'limite-tiempo' | 'limite-caracteres' | 'no-disponible-en-ejecucion') =>
    ({ estado: 'terminada', fin: { causa } }) as const;

  it('en el último paso de un programa que lee datos ofrece volver atrás, probar con otros datos (principal) y modificar el programa', () => {
    const ranura = derivarRanura(entrada(terminada('terminado'), { paso: 8, total: 8, leeDatos: true }));
    expect(ranura).toEqual({ tipo: 'fin', acciones: ['anterior', 'probar-con-otros-datos', 'modificar-el-programa'], principal: 'probar-con-otros-datos' });
  });

  it('en un programa que NO lee datos no ofrece «Probar con otros datos» y lo principal es modificar el programa', () => {
    const ranura = derivarRanura(entrada(terminada('terminado'), { paso: 8, total: 8, leeDatos: false }));
    expect(ranura).toEqual({ tipo: 'fin', acciones: ['anterior', 'modificar-el-programa'], principal: 'modificar-el-programa' });
  });

  it('también cuando terminó por una excepción o por un límite del visualizador: hay algo que probar o corregir', () => {
    for (const causa of ['excepcion', 'limite-pasos', 'limite-tiempo', 'limite-caracteres', 'no-disponible-en-ejecucion'] as const) {
      expect(derivarRanura(entrada(terminada(causa), { paso: 5, total: 5 })).tipo, causa).toBe('fin');
    }
  });

  it('una excepción en un programa que lee datos sigue ofreciendo «Probar con otros datos» como principal (un dato mal escrito es la causa más común)', () => {
    const ranura = derivarRanura(entrada(terminada('excepcion'), { paso: 5, total: 5, leeDatos: true }));
    expect(ranura).toMatchObject({ tipo: 'fin', principal: 'probar-con-otros-datos' });
  });

  it('un ciclo que el visualizador detuvo por seguridad: lo principal es «Modificar el programa», lea datos o no', () => {
    for (const causa of ['limite-pasos', 'limite-tiempo', 'limite-caracteres'] as const) {
      for (const leeDatos of [true, false]) {
        const ranura = derivarRanura(entrada(terminada(causa), { paso: 5, total: 5, leeDatos }));
        expect(ranura, `${causa} leeDatos=${String(leeDatos)}`).toMatchObject({ tipo: 'fin', principal: 'modificar-el-programa' });
        if (ranura.tipo === 'fin') expect(ranura.acciones.includes('probar-con-otros-datos'), `${causa} leeDatos=${String(leeDatos)}`).toBe(leeDatos);
      }
    }
  });

  it('un programa de cero pasos que ya terminó está en su último paso: ofrece las acciones del fin, sin «Anterior» (no hay a dónde volver)', () => {
    expect(derivarRanura(entrada(terminada('terminado'), { paso: 0, total: 0, leeDatos: true }))).toEqual({
      tipo: 'fin',
      acciones: ['probar-con-otros-datos', 'modificar-el-programa'],
      principal: 'probar-con-otros-datos',
    });
    expect(derivarRanura(entrada(terminada('terminado'), { paso: 0, total: 0 }))).toEqual({ tipo: 'fin', acciones: ['modificar-el-programa'], principal: 'modificar-el-programa' });
  });

  it('antes del último paso, o mientras el programa espera un dato o se detuvo, no hay acciones del fin', () => {
    expect(derivarRanura(entrada(terminada('terminado'), { paso: 7, total: 8 })).tipo).toBe('navegacion');
    expect(derivarRanura(entrada({ estado: 'esperando-entrada', nodo: 1 }, { paso: 8, total: 8 })).tipo).toBe('navegacion');
    expect(derivarRanura(entrada({ estado: 'detenida' }, { paso: 8, total: 8 })).tipo).toBe('navegacion');
  });
});
