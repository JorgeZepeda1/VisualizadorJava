// RED de la tarea 2.16 (design.md §3.1): el PLAN DE EVALUACIÓN de una expresión es la lista de sus puntos en el orden en que Java las evalúa
// (operando izquierdo, derecho, operador; en `x op= e` primero se lee `x`; en una llamada, el objetivo y luego los argumentos). `numerarExpresion`
// recorre un árbol IR sin números y devuelve otro con el `punto` de cada nodo, y deja el plan en el `ConstructorDePlan`.
import { describe, expect, it } from 'vitest';
import type { Rango } from '../fuente/rango.ts';
import { ConstructorDePlan, numerarExpresion } from './plan-evaluacion.ts';
import type { AsignacionCompuestaIr, ExpresionIr, LlamadaIr, LecturaIr } from './ir.ts';

const R: Rango = { inicio: 0, fin: 1 };

const lectura = (nombre: string, ranura = 0): LecturaIr => ({ forma: 'lectura', tipo: 'int', punto: -1, rango: R, ranura, nombre });
const entero = (valor: number): ExpresionIr => ({ forma: 'constante', tipo: 'int', punto: -1, rango: R, valor });
const suma = (izquierda: ExpresionIr, derecha: ExpresionIr): ExpresionIr => ({ forma: 'aritmetica', tipo: 'int', operador: '+', punto: -1, rango: R, izquierda, derecha });

describe('numerarExpresion: cada nodo recibe su punto en orden de evaluación de Java', () => {
  it('(a + b) + c: a, b, a+b, c, (a+b)+c  — los hijos antes del padre, de izquierda a derecha', () => {
    const plan = new ConstructorDePlan();
    const arbol = suma(suma(lectura('a'), lectura('b')), lectura('c'));
    const numerado = numerarExpresion(arbol, plan);
    expect(plan.puntos.map((p) => p.nombre ?? p.forma)).toEqual(['a', 'b', 'aritmetica', 'c', 'aritmetica']);
    expect(numerado.punto).toBe(4);
    if (numerado.forma !== 'aritmetica') throw new Error('forma');
    expect(numerado.izquierda.punto).toBe(2);
    expect(numerado.derecha.punto).toBe(3);
  });

  it('`x op= e` pone la lectura previa de x PRIMERO, luego e, y al final la asignación compuesta', () => {
    const plan = new ConstructorDePlan();
    const compuesta: AsignacionCompuestaIr = {
      forma: 'asignacion-compuesta',
      tipo: 'int',
      punto: -1,
      rango: R,
      ranura: 0,
      nombre: 'x',
      operador: '+',
      tipoOperacion: 'int',
      lectura: lectura('x'),
      valor: suma(entero(1), entero(2)),
    };
    const numerado = numerarExpresion(compuesta, plan);
    expect(plan.puntos.map((p) => p.forma)).toEqual(['lectura', 'constante', 'constante', 'aritmetica', 'asignacion-compuesta']);
    if (numerado.forma !== 'asignacion-compuesta') throw new Error('forma');
    expect(numerado.lectura.punto).toBe(0);
    expect(numerado.punto).toBe(4);
  });

  it('una llamada: primero el objetivo, luego los argumentos en orden, luego la llamada', () => {
    const plan = new ConstructorDePlan();
    const llamada: LlamadaIr = {
      forma: 'llamada',
      tipo: 'int',
      punto: -1,
      rango: R,
      clave: 'String.charAt(int)',
      receptor: lectura('s'),
      flujo: null,
      argumentos: [entero(1), lectura('i')],
      variables: [entero(9)],
      esNativa: false,
    };
    const numerado = numerarExpresion(llamada, plan);
    expect(plan.puntos.map((p) => p.nombre ?? p.forma)).toEqual(['s', 'constante', 'i', 'constante', 'llamada']);
    expect(numerado.punto).toBe(4);
  });

  it('los puntos de VARIAS expresiones comparten el plan (una declaración con dos inicializadores): la segunda sigue donde terminó la primera', () => {
    const plan = new ConstructorDePlan();
    const primera = numerarExpresion(suma(entero(1), entero(2)), plan);
    const segunda = numerarExpresion(lectura('z'), plan);
    expect(primera.punto).toBe(2);
    expect(segunda.punto).toBe(3);
    expect(plan.puntos).toHaveLength(4);
  });

  it('cada punto guarda su forma, su tipo, su rango y, según el caso, el nombre o el origen de la conversión', () => {
    const plan = new ConstructorDePlan();
    numerarExpresion({ forma: 'conversion', tipo: 'int', de: 'char', implicita: true, punto: -1, rango: R, operando: lectura('c') }, plan);
    expect(plan.puntos).toEqual([
      { forma: 'lectura', tipo: 'int', rango: R, nombre: 'c' },
      { forma: 'conversion', tipo: 'int', rango: R, de: 'char', implicita: true },
    ]);
  });
});
