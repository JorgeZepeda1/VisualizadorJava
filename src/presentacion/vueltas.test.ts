// RED de las tareas 4.4 y 4.9 (REQ-VIS-007): el número de vuelta de cada ciclo activo en el paso actual, por separado cuando hay anidamiento («ciclo externo: vuelta 2 · ciclo interno:
// vuelta 3»). Un ciclo está activo mientras el nodo del paso cae dentro de su rango; su vuelta sale de la última revisión de su condición que el motor registró en esta ejecución del ciclo
// (`Paso.control.vuelta`, `Paso.control.ciclo`). Puro, sin DOM.
import { describe, expect, it } from 'vitest';
import type { NodoIr, Paso, VistaPrograma } from '../motor/vista.ts';
import { nodo, paso, vistaDePrueba } from './ayudas-de-prueba.ts';
import { derivarVueltas } from './vueltas.ts';

// Un programa de mentira con dos `for` anidados, un `do-while` y una sentencia suelta. El índice de cada nodo es su id (`Paso.nodo` indexa `VistaPrograma.nodos`).
//   0 for externo  [0,100)  línea 4        1 condición externa [10,20)        2 declaración del for externo [5,9)
//   3 for interno  [40,90)  línea 6        4 condición interna [45,55)        5 cuerpo interno [60,70)
//   6 sentencia suelta (después de los ciclos) [120,130)
//   7 do-while     [200,260) línea 12      8 cuerpo del do-while [210,220)    9 condición del do-while [230,240)
const NODOS: readonly NodoIr[] = [
  nodo(0, { clase: 'for', rango: { inicio: 0, fin: 100 }, linea: 4 }),
  nodo(1, { clase: 'condicion-ciclo', rango: { inicio: 10, fin: 20 }, linea: 4 }),
  nodo(2, { clase: 'declaracion', rango: { inicio: 5, fin: 9 }, linea: 4 }),
  nodo(3, { clase: 'for', rango: { inicio: 40, fin: 90 }, linea: 6 }),
  nodo(4, { clase: 'condicion-ciclo', rango: { inicio: 45, fin: 55 }, linea: 6 }),
  nodo(5, { clase: 'expresion', rango: { inicio: 60, fin: 70 }, linea: 7 }),
  nodo(6, { clase: 'expresion', rango: { inicio: 120, fin: 130 }, linea: 9 }),
  nodo(7, { clase: 'do-while', rango: { inicio: 200, fin: 260 }, linea: 12 }),
  nodo(8, { clase: 'expresion', rango: { inicio: 210, fin: 220 }, linea: 13 }),
  nodo(9, { clase: 'condicion-ciclo', rango: { inicio: 230, fin: 240 }, linea: 14 }),
];
const VISTA: VistaPrograma = vistaDePrueba(NODOS);

function evaluacion(nodoDeLaCondicion: number, ciclo: number, vuelta: number, resultado: boolean): Paso {
  return paso({ clase: 'condicion-ciclo', nodo: nodoDeLaCondicion, control: { ciclo, vuelta, resultado } });
}

const cuerpo = (nodoDelCuerpo: number): Paso => paso({ clase: 'expresion', nodo: nodoDelCuerpo });

describe('derivarVueltas: un ciclo', () => {
  it('dentro del cuerpo de un for, muestra la vuelta de su última revisión', () => {
    expect(derivarVueltas([evaluacion(1, 0, 3, true), cuerpo(2)], VISTA)).toEqual([
      { nombre: 'ciclo', vuelta: 3, termino: false, nodoDelCiclo: 0 },
    ]);
  });

  it('triangulación: otra vuelta', () => {
    expect(derivarVueltas([evaluacion(1, 0, 1, true)], VISTA)).toEqual([{ nombre: 'ciclo', vuelta: 1, termino: false, nodoDelCiclo: 0 }]);
  });

  it('en la revisión que sale del ciclo, las vueltas completas son una menos y se avisa que terminó', () => {
    expect(derivarVueltas([evaluacion(1, 0, 3, true), evaluacion(1, 0, 4, false)], VISTA)).toEqual([
      { nombre: 'ciclo', vuelta: 3, termino: true, nodoDelCiclo: 0 },
    ]);
  });

  it('un ciclo que nunca entró (primera revisión falsa) cuenta cero vueltas y terminó', () => {
    expect(derivarVueltas([evaluacion(1, 0, 1, false)], VISTA)).toEqual([{ nombre: 'ciclo', vuelta: 0, termino: true, nodoDelCiclo: 0 }]);
  });

  it('antes de la primera revisión (el inicio de un for) todavía no hay vuelta que mostrar', () => {
    expect(derivarVueltas([cuerpo(2)], VISTA)).toEqual([]);
  });

  it('fuera de los ciclos no hay contador', () => {
    expect(derivarVueltas([evaluacion(1, 0, 3, false), cuerpo(6)], VISTA)).toEqual([]);
  });

  it('sin pasos no hay contador', () => {
    expect(derivarVueltas([], VISTA)).toEqual([]);
  });
});

describe('derivarVueltas: ciclos anidados, cada uno por separado', () => {
  it('un for externo en su vuelta 2 con un for interno en su vuelta 3', () => {
    const pasos = [evaluacion(1, 0, 2, true), evaluacion(4, 3, 3, true), cuerpo(5)];
    expect(derivarVueltas(pasos, VISTA)).toEqual([
      { nombre: 'ciclo externo', vuelta: 2, termino: false, nodoDelCiclo: 0 },
      { nombre: 'ciclo interno', vuelta: 3, termino: false, nodoDelCiclo: 3 },
    ]);
  });

  it('cuando el ciclo interno sale y el externo da otra vuelta, el interno vuelve a empezar desde cero', () => {
    const pasos = [
      evaluacion(1, 0, 1, true),
      evaluacion(4, 3, 1, true),
      evaluacion(4, 3, 2, false), // el interno sale
      evaluacion(1, 0, 2, true), // el externo da la vuelta 2 (la actualización y la revisión)
    ];
    // En la revisión del externo, el interno ya no está activo.
    expect(derivarVueltas(pasos, VISTA)).toEqual([{ nombre: 'ciclo', vuelta: 2, termino: false, nodoDelCiclo: 0 }]);
    // Y al volver a entrar al interno, su primera revisión es la vuelta 1, no la 3 de la ejecución anterior.
    expect(derivarVueltas([...pasos, evaluacion(4, 3, 1, true)], VISTA)).toEqual([
      { nombre: 'ciclo externo', vuelta: 2, termino: false, nodoDelCiclo: 0 },
      { nombre: 'ciclo interno', vuelta: 1, termino: false, nodoDelCiclo: 3 },
    ]);
  });

  it('un break que saca del ciclo interno sin pasar por su condición falsa tampoco deja el contador viejo', () => {
    const pasos = [evaluacion(1, 0, 1, true), evaluacion(4, 3, 2, true), paso({ clase: 'break', nodo: 5 }), evaluacion(1, 0, 2, true)];
    expect(derivarVueltas(pasos, VISTA)).toEqual([{ nombre: 'ciclo', vuelta: 2, termino: false, nodoDelCiclo: 0 }]);
  });
});

describe('derivarVueltas: do-while', () => {
  it('durante el primer cuerpo ya es la vuelta 1, aunque aún no se haya revisado la condición', () => {
    expect(derivarVueltas([cuerpo(8)], VISTA)).toEqual([{ nombre: 'ciclo', vuelta: 1, termino: false, nodoDelCiclo: 7 }]);
  });

  it('tras revisar la condición (verdadera) y volver al cuerpo, es la vuelta 2', () => {
    expect(derivarVueltas([cuerpo(8), evaluacion(9, 7, 1, true), cuerpo(8)], VISTA)).toEqual([
      { nombre: 'ciclo', vuelta: 2, termino: false, nodoDelCiclo: 7 },
    ]);
  });

  it('en la revisión de la condición, la vuelta es la que acaba de terminar el cuerpo', () => {
    expect(derivarVueltas([cuerpo(8), evaluacion(9, 7, 1, true)], VISTA)).toEqual([
      { nombre: 'ciclo', vuelta: 1, termino: false, nodoDelCiclo: 7 },
    ]);
  });

  it('la revisión falsa cierra el ciclo con todas sus vueltas', () => {
    expect(derivarVueltas([cuerpo(8), evaluacion(9, 7, 1, true), cuerpo(8), evaluacion(9, 7, 2, false)], VISTA)).toEqual([
      { nombre: 'ciclo', vuelta: 2, termino: true, nodoDelCiclo: 7 },
    ]);
  });
});
