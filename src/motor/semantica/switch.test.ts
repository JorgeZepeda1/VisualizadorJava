// RED de la tarea 1.7 (switch — REQ-COMP-002, design.md §2.7 "switch: selector int, char o
// String"). Verificado contra javac 17 real (esta sesión): CUALQUIER tipo de selector fuera de
// {int, char, String} da el MISMO mensaje genérico "patterns in switch statements are a preview
// feature..." (long incluso agrega un segundo error de etiqueta incompatible) — NO hay un mensaje
// específico por tipo. Por eso `verificarSelectorDeSwitch` solo necesita devolver el tipo real
// detectado en `datos` (1.11 decide el texto); nunca inventa un mensaje "a medida" por tipo.
import { describe, expect, it } from 'vitest';
import { Alcance } from './alcance.ts';
import { verificarEtiquetasDeCase, verificarSelectorDeSwitch } from './switch.ts';
import type { NodoEtiquetaCase, NodoSwitch } from '../sintaxis/ast.ts';

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

// Tarea 1.11 (cierre de REQ-COMP-001/§2.7, catálogo `03` §4): etiquetas de "case" — err34
// ("constant expression required") y flow05 ("duplicate case label").
function etiqueta(valor: NodoEtiquetaCase['valor'], rango = R): NodoEtiquetaCase {
  return { tipo: 'etiqueta-case', valor, rango };
}

function unSwitchConEtiquetas(elementos: NodoSwitch['elementos']): NodoSwitch {
  return { tipo: 'switch', selector: { tipo: 'literal-entero', valor: 1n, rango: R }, elementos, rango: R };
}

describe('verificarEtiquetasDeCase — err34 de exploracion/03: "constant expression required"', () => {
  it('"case variable:" (no constante) se rechaza', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'variable', tipo: 'int', esFinal: false, rango: R });
    const nodo = unSwitchConEtiquetas([etiqueta({ tipo: 'nombre', nombre: 'variable', rango: R })]);
    const problemas = verificarEtiquetasDeCase(nodo, alcance);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'etiqueta-de-case-no-constante' });
  });

  it('control: "case 1:" (literal, SÍ constante) no se rechaza', () => {
    const nodo = unSwitchConEtiquetas([etiqueta({ tipo: 'literal-entero', valor: 1n, rango: R })]);
    expect(verificarEtiquetasDeCase(nodo, new Alcance())).toEqual([]);
  });
});

describe('verificarEtiquetasDeCase — flow05 de exploracion/03: "duplicate case label"', () => {
  it('"case 1: ... case 1:" (mismo literal dos veces) se rechaza', () => {
    const nodo = unSwitchConEtiquetas([
      etiqueta({ tipo: 'literal-entero', valor: 1n, rango: R }, R),
      etiqueta({ tipo: 'literal-entero', valor: 1n, rango: R }, { inicio: 10, fin: 11 }),
    ]);
    const problemas = verificarEtiquetasDeCase(nodo, new Alcance());
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'etiqueta-de-case-duplicada' });
    // El duplicado se reporta en la SEGUNDA aparición (la que javac señala).
    expect(problemas[0]?.rango).toEqual({ inicio: 10, fin: 11 });
  });

  it('triangulación: duplicado POR VALOR entre "case 97:" y "case \'a\':" (design.md §2.7: "duplicados por valor tras convertir")', () => {
    const nodo = unSwitchConEtiquetas([
      etiqueta({ tipo: 'literal-entero', valor: 97n, rango: R }),
      etiqueta({ tipo: 'literal-caracter', valor: 'a', rango: { inicio: 20, fin: 21 } }),
    ]);
    const problemas = verificarEtiquetasDeCase(nodo, new Alcance());
    expect(problemas.some((p) => p.codigo === 'etiqueta-de-case-duplicada')).toBe(true);
  });

  it('control: valores DISTINTOS no se marcan como duplicados', () => {
    const nodo = unSwitchConEtiquetas([
      etiqueta({ tipo: 'literal-entero', valor: 1n, rango: R }),
      etiqueta({ tipo: 'literal-entero', valor: 2n, rango: { inicio: 10, fin: 11 } }),
    ]);
    expect(verificarEtiquetasDeCase(nodo, new Alcance())).toEqual([]);
  });

  it('control: una etiqueta no constante y otras constantes distintas no producen falsos duplicados', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'v', tipo: 'int', esFinal: false, rango: R });
    const nodo = unSwitchConEtiquetas([
      etiqueta({ tipo: 'nombre', nombre: 'v', rango: R }),
      etiqueta({ tipo: 'literal-entero', valor: 2n, rango: { inicio: 10, fin: 11 } }),
    ]);
    const problemas = verificarEtiquetasDeCase(nodo, alcance);
    expect(problemas).toHaveLength(1); // solo la no-constante; "2" no colisiona con nada real
    expect(problemas[0]?.codigo).toBe('etiqueta-de-case-no-constante');
  });
});
