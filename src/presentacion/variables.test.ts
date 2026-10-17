// RED de las tareas 4.2 y 4.6 (REQ-VIS-005): las variables a la vista en un paso — nombre, tipo y valor; si cambiaron, el valor anterior; «sin inicializar»; y las que acaban de
// salir de su bloque. Sale de la instantánea del motor (`Traza.instantaneaEn`: variables a la vista con su valor) y de los dos últimos pasos (qué cambió, qué nodos están a la vista).
import { describe, expect, it } from 'vitest';
import type { InstantaneaDeEjecucion, VariableDeInstantanea } from '../motor/vista.ts';
import { nodo, paso, ranura, vistaDePrueba } from './ayudas-de-prueba.ts';
import { derivarVariables } from './variables.ts';

function instantanea(variables: readonly VariableDeInstantanea[]): InstantaneaDeEjecucion {
  return { paso: 1, linea: 1, variables, salida: [] };
}

const VISTA_VACIA = vistaDePrueba([nodo(0)]);

describe('derivarVariables: valor anterior → nuevo', () => {
  it('contador++ muestra 3 → 4: el valor nuevo y el anterior, marcada como cambio', () => {
    const ultimo = paso({ clase: 'asignacion', cambios: [{ ranura: 'contador', anterior: 3, nuevo: 4, punto: 0 }] });
    const variables = derivarVariables({
      instantanea: instantanea([{ nombre: 'contador', tipo: 'int', valor: 4 }]),
      ultimo,
      penultimo: null,
      vista: VISTA_VACIA,
    });
    expect(variables).toEqual([
      { nombre: 'contador', tipo: 'int', valor: '4', anterior: '3', estado: 'cambio', fueraDeAlcance: false },
    ]);
  });

  it('triangulación: otra variable, otros valores, con tipo String', () => {
    const ultimo = paso({ clase: 'asignacion', cambios: [{ ranura: 'producto', anterior: 'Papas', nuevo: 'Agua', punto: 1 }] });
    const variables = derivarVariables({
      instantanea: instantanea([{ nombre: 'producto', tipo: 'String', valor: 'Agua' }]),
      ultimo,
      penultimo: null,
      vista: VISTA_VACIA,
    });
    expect(variables[0]).toMatchObject({ valor: '"Agua"', anterior: '"Papas"', estado: 'cambio' });
  });

  it('una variable que no cambió en este paso queda sin cambio y sin valor anterior', () => {
    const ultimo = paso({ clase: 'impresion' });
    const variables = derivarVariables({
      instantanea: instantanea([{ nombre: 'edad', tipo: 'int', valor: 17 }]),
      ultimo,
      penultimo: null,
      vista: VISTA_VACIA,
    });
    expect(variables).toEqual([{ nombre: 'edad', tipo: 'int', valor: '17', anterior: null, estado: 'sin-cambio', fueraDeAlcance: false }]);
  });

  it('con varios cambios de la misma variable en un paso, el anterior es el de antes del paso y el nuevo el final', () => {
    const ultimo = paso({
      clase: 'asignacion',
      cambios: [
        { ranura: 'y', anterior: 5, nuevo: 6, punto: 0 },
        { ranura: 'y', anterior: 6, nuevo: 7, punto: 1 },
      ],
    });
    const variables = derivarVariables({
      instantanea: instantanea([{ nombre: 'y', tipo: 'int', valor: 12 }]),
      ultimo,
      penultimo: null,
      vista: VISTA_VACIA,
    });
    expect(variables[0]).toMatchObject({ valor: '12', anterior: '5', estado: 'cambio' });
  });
});

describe('derivarVariables: variables nuevas y sin inicializar', () => {
  it('una declaración con valor crea la variable: es nueva y no tiene valor anterior', () => {
    const ultimo = paso({ clase: 'declaracion', cambios: [{ ranura: 'total', anterior: undefined, nuevo: 36 }] });
    const variables = derivarVariables({
      instantanea: instantanea([{ nombre: 'total', tipo: 'int', valor: 36 }]),
      ultimo,
      penultimo: null,
      vista: VISTA_VACIA,
    });
    expect(variables[0]).toMatchObject({ valor: '36', anterior: null, estado: 'nueva' });
  });

  it('una declaración repetida en una vuelta del ciclo sigue siendo una variable nueva (sin flecha desde la vuelta anterior)', () => {
    const ultimo = paso({ clase: 'declaracion', cambios: [{ ranura: 'j', anterior: 2, nuevo: 0 }] });
    const variables = derivarVariables({
      instantanea: instantanea([{ nombre: 'j', tipo: 'int', valor: 0 }]),
      ultimo,
      penultimo: null,
      vista: VISTA_VACIA,
    });
    expect(variables[0]).toMatchObject({ valor: '0', anterior: null, estado: 'nueva' });
  });

  it('una variable declarada sin valor se muestra «sin inicializar» (valor nulo)', () => {
    const ultimo = paso({ clase: 'declaracion', cambios: [{ ranura: 'precio', anterior: undefined, nuevo: null }] });
    const variables = derivarVariables({
      instantanea: instantanea([{ nombre: 'precio', tipo: 'int', valor: null }]),
      ultimo,
      penultimo: null,
      vista: VISTA_VACIA,
    });
    expect(variables[0]).toMatchObject({ valor: null, anterior: null, estado: 'nueva' });
  });

  it('la primera asignación a una variable sin inicializar cambia desde «sin inicializar» (anterior nulo, pero es un cambio)', () => {
    const ultimo = paso({ clase: 'asignacion', cambios: [{ ranura: 'precio', anterior: undefined, nuevo: 18, punto: 1 }] });
    const variables = derivarVariables({
      instantanea: instantanea([{ nombre: 'precio', tipo: 'int', valor: 18 }]),
      ultimo,
      penultimo: null,
      vista: VISTA_VACIA,
    });
    expect(variables[0]).toMatchObject({ valor: '18', anterior: null, estado: 'cambio' });
  });
});

describe('derivarVariables: cómo se escribe cada valor', () => {
  it('double, char y objetos se escriben como Java (5.0, \'A\', un Scanner)', () => {
    const variables = derivarVariables({
      instantanea: instantanea([
        { nombre: 'promedio', tipo: 'double', valor: 8 },
        { nombre: 'letra', tipo: 'char', valor: 65 },
        { nombre: 'sc', tipo: 'Scanner', valor: { objeto: 'Scanner' } },
      ]),
      ultimo: paso({ clase: 'impresion' }),
      penultimo: null,
      vista: VISTA_VACIA,
    });
    expect(variables.map((v) => v.valor)).toEqual(['8.0', "'A'", 'un Scanner']);
  });
});

describe('derivarVariables: variables que salen de su bloque', () => {
  // El nodo 8 (el cuerpo del while) ve a suma, i y j; el nodo 9 (la actualización del for) ya no ve a j: j acaba de salir de su bloque.
  // `Paso.nodo` indexa `VistaPrograma.nodos`, así que se arma una lista donde cada nodo está en su posición real.
  const nodos = Array.from({ length: 10 }, (_, id) => nodo(id));
  const vistaReal = vistaDePrueba(
    nodos.map((n) => (n.id === 8 ? { ...n, vivas: [0, 1, 2] } : n.id === 9 ? { ...n, vivas: [0, 1] } : n)),
    [ranura(0, 'suma'), ranura(1, 'i'), ranura(2, 'j')],
  );

  it('la variable que estaba a la vista en el paso anterior y ya no, se marca fuera de alcance', () => {
    const variables = derivarVariables({
      instantanea: instantanea([
        { nombre: 'suma', tipo: 'int', valor: 3 },
        { nombre: 'i', tipo: 'int', valor: 2 },
      ]),
      ultimo: paso({ clase: 'asignacion', nodo: 9 }),
      penultimo: paso({ clase: 'asignacion', nodo: 8 }),
      vista: vistaReal,
    });
    expect(variables.map((v) => [v.nombre, v.fueraDeAlcance])).toEqual([
      ['suma', false],
      ['i', false],
      ['j', true],
    ]);
    expect(variables[2]).toMatchObject({ tipo: 'int', valor: null, anterior: null, estado: 'sin-cambio' });
  });

  it('si no cambió el conjunto de variables a la vista, ninguna sale de alcance', () => {
    const variables = derivarVariables({
      instantanea: instantanea([
        { nombre: 'suma', tipo: 'int', valor: 3 },
        { nombre: 'i', tipo: 'int', valor: 2 },
        { nombre: 'j', tipo: 'int', valor: 1 },
      ]),
      ultimo: paso({ clase: 'asignacion', nodo: 8 }),
      penultimo: paso({ clase: 'asignacion', nodo: 8 }),
      vista: vistaReal,
    });
    expect(variables.filter((v) => v.fueraDeAlcance)).toEqual([]);
  });

  it('antes del primer paso no hay variables', () => {
    expect(derivarVariables({ instantanea: instantanea([]), ultimo: null, penultimo: null, vista: vistaReal })).toEqual([]);
  });
});
