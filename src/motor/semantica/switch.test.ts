// RED de la tarea 1.7 (switch — REQ-COMP-002, design.md §2.7 "switch: selector int, char o
// String"). Verificado contra javac 17 real (esta sesión): CUALQUIER tipo de selector fuera de
// {int, char, String} da el MISMO mensaje genérico "patterns in switch statements are a preview
// feature..." (long incluso agrega un segundo error de etiqueta incompatible) — NO hay un mensaje
// específico por tipo. Por eso `verificarSelectorDeSwitch` solo necesita devolver el tipo real
// detectado en `datos` (1.11 decide el texto); nunca inventa un mensaje "a medida" por tipo.
import { describe, expect, it } from 'vitest';
import { Alcance } from './alcance.ts';
import { verificarSelectorDeSwitch } from './switch.ts';
import type { NodoSwitch } from '../sintaxis/ast.ts';

const R = { inicio: 0, fin: 1 };

function unSwitch(selector: NodoSwitch['selector']): NodoSwitch {
  return { tipo: 'switch', selector, elementos: [], rango: { inicio: 100, fin: 200 } };
}

describe('verificarSelectorDeSwitch — tipos VÁLIDOS (int, char, String) no producen problema', () => {
  it.each([
    ['literal-entero', { tipo: 'literal-entero', valor: 1n, rango: R }],
    ['literal-caracter', { tipo: 'literal-caracter', valor: 'a', rango: R }],
    ['literal-cadena', { tipo: 'literal-cadena', valor: 'x', rango: R }],
  ] as const)('%s', (_nombre, selector) => {
    expect(verificarSelectorDeSwitch(unSwitch(selector), new Alcance())).toBeNull();
  });
});

describe('verificarSelectorDeSwitch — tipos INVÁLIDOS (verificado contra javac 17: long, boolean, double)', () => {
  it('selector "long" produce un problema con el tipo real en los datos (verificado: switch(long) real)', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'n', tipo: 'long', esFinal: false, rango: R });
    const nodo = unSwitch({ tipo: 'nombre', nombre: 'n', rango: R });
    const problema = verificarSelectorDeSwitch(nodo, alcance);
    expect(problema).not.toBeNull();
    expect(problema?.codigo).toBe('selector-de-switch-invalido');
    expect(problema?.datos).toEqual({ tipo: 'long' });
    // "en la línea del switch" (design.md §2.7): la posición es la del propio NodoSwitch.
    expect(problema?.rango).toEqual({ inicio: 100, fin: 200 });
  });

  it('triangulación: selector "boolean" (literal) también se rechaza, con su propio tipo en datos', () => {
    const nodo = unSwitch({ tipo: 'literal-booleano', valor: true, rango: R });
    const problema = verificarSelectorDeSwitch(nodo, new Alcance());
    expect(problema?.codigo).toBe('selector-de-switch-invalido');
    expect(problema?.datos).toEqual({ tipo: 'boolean' });
  });

  it('triangulación: selector "double" también se rechaza (verificado contra javac real)', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'prom', tipo: 'double', esFinal: false, rango: R });
    const nodo = unSwitch({ tipo: 'nombre', nombre: 'prom', rango: R });
    expect(verificarSelectorDeSwitch(nodo, alcance)?.datos).toEqual({ tipo: 'double' });
  });
});

describe('verificarSelectorDeSwitch — tipo "desconocido" NO produce problema (D2: nunca inventar)', () => {
  it('un selector cuyo tipo no se puede determinar (variable no declarada) no se marca inválido aquí', () => {
    const nodo = unSwitch({ tipo: 'nombre', nombre: 'noExiste', rango: R });
    // La atribución de símbolos (atribucion.ts) es quien reporta "variable no declarada"; el
    // chequeo de selector NUNCA debe agregar un segundo error inventado sobre un tipo que no sabe.
    expect(verificarSelectorDeSwitch(nodo, new Alcance())).toBeNull();
  });
});
