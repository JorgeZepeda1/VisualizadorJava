// RED de la tarea 1.7/1.8 (tipos mínimos de atribución, design.md §2.7). 1.7 solo necesita lo
// justo para el selector de `switch` (literal, variable, cast) y para no romper en cascada ante
// un símbolo no resuelto ("Una expresión que depende de algo no soportado recibe el tipo
// `desconocido`, que suprime los errores en cascada" — design.md §2.1); 1.8 amplía este mismo
// archivo con conversiones/sobrecargas reales sobre `NodoLlamada`/`NodoAccesoMiembro`.
import { describe, expect, it } from 'vitest';
import { Alcance } from './alcance.ts';
import { NOMBRES_DE_CLASE_RECONOCIDOS, tipoDeExpresion, tipoDeNombreDeTipo } from './tipos.ts';
import type { NodoExpresion } from '../sintaxis/ast.ts';

const R = { inicio: 0, fin: 1 };

describe('tipoDeNombreDeTipo (pura) — de NodoDeclaracionLocal.nombreTipo/NodoConversion.nombreTipo a Tipo', () => {
  it.each([
    ['int', 'int'],
    ['long', 'long'],
    ['double', 'double'],
    ['boolean', 'boolean'],
    ['char', 'char'],
    ['String', 'String'],
    ['Scanner', 'Scanner'],
    ['Random', 'Random'],
  ] as const)('%s -> %s', (entrada, esperado) => {
    expect(tipoDeNombreDeTipo(entrada)).toBe(esperado);
  });

  it('un nombre de tipo no reconocido da "desconocido" (nunca inventa un tipo, D2)', () => {
    expect(tipoDeNombreDeTipo('ClaseQueNoExiste')).toBe('desconocido');
  });
});

describe('tipoDeExpresion (pura) — literales', () => {
  it.each([
    [{ tipo: 'literal-entero', valor: 5n, rango: R }, 'int'],
    [{ tipo: 'literal-largo', valor: 5n, rango: R }, 'long'],
    [{ tipo: 'literal-doble', valor: 5.0, rango: R }, 'double'],
    [{ tipo: 'literal-caracter', valor: 'a', rango: R }, 'char'],
    [{ tipo: 'literal-cadena', valor: 'x', rango: R }, 'String'],
    [{ tipo: 'literal-booleano', valor: true, rango: R }, 'boolean'],
  ] as const)('%o -> %s', (nodo, esperado) => {
    expect(tipoDeExpresion(nodo as NodoExpresion, new Alcance())).toBe(esperado);
  });
});

describe('tipoDeExpresion (pura) — nombre (variable) vía Alcance', () => {
  it('una variable declarada resuelve al tipo con el que se declaró', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'edad', tipo: 'int', esFinal: false, rango: R });
    const nodo: NodoExpresion = { tipo: 'nombre', nombre: 'edad', rango: R };
    expect(tipoDeExpresion(nodo, alcance)).toBe('int');
  });

  it('triangulación: un nombre NO declarado da "desconocido" (suprime cascada, nunca inventa) — mismo Alcance, tipo distinto', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    const nodo: NodoExpresion = { tipo: 'nombre', nombre: 'noExiste', rango: R };
    expect(tipoDeExpresion(nodo, alcance)).toBe('desconocido');
  });
});

describe('tipoDeExpresion (pura) — conversión (cast) toma el tipo destino directamente', () => {
  it('(char) 65 dice "char" sin evaluar el operando', () => {
    const nodo: NodoExpresion = {
      tipo: 'conversion',
      nombreTipo: 'char',
      operando: { tipo: 'literal-entero', valor: 65n, rango: R },
      rango: R,
    };
    expect(tipoDeExpresion(nodo, new Alcance())).toBe('char');
  });
});

describe('tipoDeExpresion (pura) — lo que 1.7 todavía no resuelve da "desconocido" (no fabrica un tipo)', () => {
  it('una expresión binaria (aritmética/promoción real: fuera del alcance de 1.7) da "desconocido"', () => {
    const nodo: NodoExpresion = {
      tipo: 'binaria',
      operador: '+',
      izquierda: { tipo: 'literal-entero', valor: 1n, rango: R },
      derecha: { tipo: 'literal-entero', valor: 2n, rango: R },
      rango: R,
    };
    expect(tipoDeExpresion(nodo, new Alcance())).toBe('desconocido');
  });
});

describe('tipoDeExpresion (pura) — 1.8: llamadas resueltas por sobrecarga real (Math.*)', () => {
  it('Math.round(2.5) da "long" (round(double), coincidencia exacta)', () => {
    const nodo: NodoExpresion = {
      tipo: 'llamada',
      callee: { tipo: 'acceso-miembro', objeto: { tipo: 'nombre', nombre: 'Math', rango: R }, miembro: 'round', rango: R },
      argumentos: [{ tipo: 'literal-doble', valor: 2.5, rango: R }],
      rango: R,
    };
    expect(tipoDeExpresion(nodo, new Alcance())).toBe('long');
  });

  it('Math.round(unLong) da "int" (REQ-BIB-004: se resuelve a round(float), no round(double))', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'base', tipo: 'long', esFinal: false, rango: R });
    const nodo: NodoExpresion = {
      tipo: 'llamada',
      callee: { tipo: 'acceso-miembro', objeto: { tipo: 'nombre', nombre: 'Math', rango: R }, miembro: 'round', rango: R },
      argumentos: [{ tipo: 'nombre', nombre: 'base', rango: R }],
      rango: R,
    };
    expect(tipoDeExpresion(nodo, alcance)).toBe('int');
  });

  it('una llamada de nombre libre (sin "objeto.") da "desconocido" — 1.7 ya la marca "método no declarado" aparte', () => {
    const nodo: NodoExpresion = {
      tipo: 'llamada',
      callee: { tipo: 'nombre', nombre: 'saludar', rango: R },
      argumentos: [],
      rango: R,
    };
    expect(tipoDeExpresion(nodo, new Alcance())).toBe('desconocido');
  });
});

describe('tipoDeExpresion (pura) — 1.8: campos estáticos reales (Math.PI, Integer.MAX_VALUE)', () => {
  it('Math.PI da "double"', () => {
    const nodo: NodoExpresion = {
      tipo: 'acceso-miembro',
      objeto: { tipo: 'nombre', nombre: 'Math', rango: R },
      miembro: 'PI',
      rango: R,
    };
    expect(tipoDeExpresion(nodo, new Alcance())).toBe('double');
  });

  it('triangulación: Integer.MAX_VALUE da "int" (campo distinto, clase distinta)', () => {
    const nodo: NodoExpresion = {
      tipo: 'acceso-miembro',
      objeto: { tipo: 'nombre', nombre: 'Integer', rango: R },
      miembro: 'MAX_VALUE',
      rango: R,
    };
    expect(tipoDeExpresion(nodo, new Alcance())).toBe('int');
  });
});

describe('tipoDeExpresion (pura) — 1.8: receptor es una VARIABLE (Scanner/String), no una clase', () => {
  it('sc.nextInt() da "int" cuando "sc" está declarado como Scanner', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'sc', tipo: 'Scanner', esFinal: false, rango: R });
    const nodo: NodoExpresion = {
      tipo: 'llamada',
      callee: { tipo: 'acceso-miembro', objeto: { tipo: 'nombre', nombre: 'sc', rango: R }, miembro: 'nextInt', rango: R },
      argumentos: [],
      rango: R,
    };
    expect(tipoDeExpresion(nodo, alcance)).toBe('int');
  });

  it('encadenado: s.trim().length() da "int" (trim() devuelve String, .length() de ESE resultado da int)', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 's', tipo: 'String', esFinal: false, rango: R });
    const trim: NodoExpresion = {
      tipo: 'llamada',
      callee: { tipo: 'acceso-miembro', objeto: { tipo: 'nombre', nombre: 's', rango: R }, miembro: 'trim', rango: R },
      argumentos: [],
      rango: R,
    };
    const length: NodoExpresion = {
      tipo: 'llamada',
      callee: { tipo: 'acceso-miembro', objeto: trim, miembro: 'length', rango: R },
      argumentos: [],
      rango: R,
    };
    expect(tipoDeExpresion(length, alcance)).toBe('int');
  });

  it('control: un receptor no declarado da "desconocido" (nunca inventa una clase)', () => {
    const nodo: NodoExpresion = {
      tipo: 'llamada',
      callee: { tipo: 'acceso-miembro', objeto: { tipo: 'nombre', nombre: 'noDeclarada', rango: R }, miembro: 'length', rango: R },
      argumentos: [],
      rango: R,
    };
    expect(tipoDeExpresion(nodo, new Alcance())).toBe('desconocido');
  });
});

describe('NOMBRES_DE_CLASE_RECONOCIDOS (dato) — viene del catálogo real del oráculo (1.9), no de una lista a mano', () => {
  it('incluye Math, String y Scanner (REQ-SUB-005)', () => {
    expect(NOMBRES_DE_CLASE_RECONOCIDOS.has('Math')).toBe(true);
    expect(NOMBRES_DE_CLASE_RECONOCIDOS.has('String')).toBe(true);
    expect(NOMBRES_DE_CLASE_RECONOCIDOS.has('Scanner')).toBe(true);
  });

  it('NO incluye un nombre de variable típico (triangulación: no es "cualquier identificador")', () => {
    expect(NOMBRES_DE_CLASE_RECONOCIDOS.has('edad')).toBe(false);
  });
});
