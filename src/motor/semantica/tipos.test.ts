// RED de la tarea 1.7/1.8 (tipos mínimos de atribución, design.md §2.7). 1.7 solo necesita lo
// justo para el selector de `switch` (literal, variable, cast) y para no romper en cascada ante
// un símbolo no resuelto ("Una expresión que depende de algo no soportado recibe el tipo
// `desconocido`, que suprime los errores en cascada" — design.md §2.1); 1.8 amplía este mismo
// archivo con conversiones/sobrecargas reales sobre `NodoLlamada`/`NodoAccesoMiembro`.
import { describe, expect, it } from 'vitest';
import { Alcance } from './alcance.ts';
import { NOMBRES_DE_CLASE_RECONOCIDOS, claseDelObjeto, tipoDeExpresion, tipoDeNombreDeTipo } from './tipos.ts';
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

// Corrección descubierta en la tarea 1.14 (JLS 15.26.1: "el tipo de una expresión de asignación es
// el tipo de la variable"): al conectar atribución de punta a punta contra el catálogo real de
// exploracion/03, "if (x = 5)" (err13, `x` es "int") debía dar "condicion-no-booleana" pero
// `verificarCondicionBooleana` (atribucion.ts) recibía 'desconocido' de aquí y NUNCA reportaba
// nada (D2: 'desconocido' suprime la cascada a propósito) -- el programa caía en el catch-all
// genérico de IR no implementada en vez del error de tipos real. Alcance MÍNIMO a propósito (mismo
// estilo angosto que el resto de este archivo): solo el tipo del OBJETIVO, nunca evalúa el valor
// ni verifica asignabilidad aquí (eso ya lo hace `verificarOperandosBinaria`/`visitarDeclaracionLocal`
// en su propio punto, esta función solo tipa expresiones).
describe('tipoDeExpresion (pura) — asignación (JLS 15.26.1, corrección de la tarea 1.14, err13)', () => {
  it('"x = 5" da el tipo de "x" (int), no "desconocido" -- necesario para que "if (x = 5)" se rechace como condición no booleana', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'x', tipo: 'int', esFinal: false, rango: R });
    const nodo: NodoExpresion = {
      tipo: 'asignacion',
      operador: '=',
      objetivo: { tipo: 'nombre', nombre: 'x', rango: R },
      valor: { tipo: 'literal-entero', valor: 5n, rango: R },
      rango: R,
    };
    expect(tipoDeExpresion(nodo, alcance)).toBe('int');
  });

  it('triangulación: "b = true" da "boolean" (tipo distinto, del objetivo, no del literal por coincidencia)', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'b', tipo: 'boolean', esFinal: false, rango: R });
    const nodo: NodoExpresion = {
      tipo: 'asignacion',
      operador: '=',
      objetivo: { tipo: 'nombre', nombre: 'b', rango: R },
      valor: { tipo: 'literal-booleano', valor: true, rango: R },
      rango: R,
    };
    expect(tipoDeExpresion(nodo, alcance)).toBe('boolean');
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

// Sub-lote 1-D3 (JLS 15.9, REQ-SUB-005): ANTES de esta tarea, 'nueva-instancia' no tenía case
// propio en `tipoDeExpresion` (caía en el `default: 'desconocido'`) -- "Scanner sc = new
// Scanner(System.in);" nunca podía fallar por tipos incompatibles aunque el programa asignara mal,
// y "new Random().nextInt()" nunca resolvía la clase del receptor encadenado. Verificado contra
// javac 17 real (carpeta temporal, borrada): `new Scanner()`/`new Random()`/`new Random(42)`/
// `new String("hola")` -- ver el informe de la sesión para los 6 casos completos.
describe('tipoDeExpresion (pura) — nueva-instancia (JLS 15.9, sub-lote 1-D3)', () => {
  it('"new Random()" da "Random" (constructor real de aridad 0, resuelto por resolverSobrecarga)', () => {
    const nodo: NodoExpresion = { tipo: 'nueva-instancia', nombreTipo: 'Random', argumentos: [], rango: R };
    expect(tipoDeExpresion(nodo, new Alcance())).toBe('Random');
  });

  it('triangulación: "new String(\\"hola\\")" da "String" (clase distinta, constructor de aridad 1)', () => {
    const nodo: NodoExpresion = {
      tipo: 'nueva-instancia',
      nombreTipo: 'String',
      argumentos: [{ tipo: 'literal-cadena', valor: 'hola', rango: R }],
      rango: R,
    };
    expect(tipoDeExpresion(nodo, new Alcance())).toBe('String');
  });

  it('"new Scanner()" (SIN constructor de aridad 0 real) da "desconocido" — nunca inventa un tipo para un "new" inválido (D2)', () => {
    const nodo: NodoExpresion = { tipo: 'nueva-instancia', nombreTipo: 'Scanner', argumentos: [], rango: R };
    expect(tipoDeExpresion(nodo, new Alcance())).toBe('desconocido');
  });

  it('"new Foo()" (clase no reconocida) da "desconocido"', () => {
    const nodo: NodoExpresion = { tipo: 'nueva-instancia', nombreTipo: 'Foo', argumentos: [], rango: R };
    expect(tipoDeExpresion(nodo, new Alcance())).toBe('desconocido');
  });

  it('encadenado real: "new Random().nextInt()" resuelve "int" -- claseDelObjeto debe reconocer un receptor "nueva-instancia", no solo "nombre"', () => {
    const nodo: NodoExpresion = {
      tipo: 'llamada',
      callee: {
        tipo: 'acceso-miembro',
        objeto: { tipo: 'nueva-instancia', nombreTipo: 'Random', argumentos: [], rango: R },
        miembro: 'nextInt',
        rango: R,
      },
      argumentos: [],
      rango: R,
    };
    expect(tipoDeExpresion(nodo, new Alcance())).toBe('int');
  });
});

// Sub-lote 1-D3 (mutante real contra veredicto de javac; deuda "pendiente heredado 2" de la
// tarea 1.8, documentada desde entonces en la cabecera de `esInicioDeImpresion`): `System.out`/
// `System.err` son la ÚNICA clase de biblioteca de este subconjunto cuyos miembros se navegan DOS
// veces ("System.out.println") -- pero SOLO "System.out.println/print" pasan por la gramática
// dedicada (`analizarImpresion`); "System.err.println(...)" y cualquier "System.out.OTRO(...)"
// caen en el camino GENERAL de expresiones, donde antes `claseDelObjeto` no sabía que
// "System.out"/"System.err" son del tipo real `PrintStream` -- resolvía 'desconocido' y la
// cascada de `visitarLlamadaDeMiembro` se suprimía SIEMPRE (ni un miembro inventado ni uno real
// se detectaban). Verificado contra javac 17 real (mutante real de esta sesión):
// "System.out.Bienvenida(\"...\")" (método inventado) -> "cannot find symbol: method
// Bienvenida(String)", javac lo RECHAZA -- nuestro motor lo aceptaba en silencio.
describe('claseDelObjeto (pura) — "System.out"/"System.err" resuelven a la clase real "PrintStream" (sub-lote 1-D3)', () => {
  const R = { inicio: 0, fin: 1 };

  it('"System.out" resuelve a la clase "PrintStream"', () => {
    const objeto: NodoExpresion = { tipo: 'acceso-miembro', objeto: { tipo: 'nombre', nombre: 'System', rango: R }, miembro: 'out', rango: R };
    expect(claseDelObjeto(objeto, new Alcance())).toBe('PrintStream');
  });

  it('triangulación: "System.err" TAMBIÉN resuelve a "PrintStream" (mismo tipo real, campo distinto)', () => {
    const objeto: NodoExpresion = { tipo: 'acceso-miembro', objeto: { tipo: 'nombre', nombre: 'System', rango: R }, miembro: 'err', rango: R };
    expect(claseDelObjeto(objeto, new Alcance())).toBe('PrintStream');
  });

  it('control: "System.in" (no navegable en este subconjunto -- se consume directo como argumento de "new Scanner(...)") NO resuelve a una clase', () => {
    const objeto: NodoExpresion = { tipo: 'acceso-miembro', objeto: { tipo: 'nombre', nombre: 'System', rango: R }, miembro: 'in', rango: R };
    expect(claseDelObjeto(objeto, new Alcance())).toBeNull();
  });

  it('control: una variable REAL llamada "System" (sombreando la clase) nunca se trata como la clase System', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'System', tipo: 'Scanner', esFinal: false, rango: R });
    const objeto: NodoExpresion = { tipo: 'acceso-miembro', objeto: { tipo: 'nombre', nombre: 'System', rango: R }, miembro: 'out', rango: R };
    expect(claseDelObjeto(objeto, alcance)).toBeNull();
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
