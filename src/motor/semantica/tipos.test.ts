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

describe('tipoDeExpresion (pura) — lo que sigue fuera del alcance da "desconocido" (D2, nunca fabrica un tipo)', () => {
  it('una construcción NO-DISP (p. ej. bits/ternario, ya delimitada como NodoExpresionNoSoportada) da "desconocido"', () => {
    const nodo: NodoExpresion = { tipo: 'expresion-no-soportada', codigo: 'bits-no-soportado', rango: R };
    expect(tipoDeExpresion(nodo, new Alcance())).toBe('desconocido');
  });
});

// Sub-lote 1-D4 (tarea 1.21, JLS 5.6): hasta esta tarea, `tipoDeExpresion` no resolvía 'binaria' ni
// 'unaria' -- deferido A PROPÓSITO desde 1.7/1.8 (ver el comentario que encabezaba este archivo
// antes de esta tarea). Consecuencia real medida en los mutantes de la tarea 1.16: un operando que
// es EL MISMO una expresión binaria/unaria (p. ej. "(a + b) == true") daba 'desconocido' para el
// operando anidado, lo que suprimía SIEMPRE la cascada de `verificarOperandosBinaria` --
// `atribucion.test.ts` trae la prueba de integración completa (con `Problema` real); aquí solo la
// función PURA de tipos, verificada contra las reglas de JLS 5.6/15.18.1 (design.md §2.7,
// exploracion/02 §1/§4/§6, ya verificadas contra javac 17 real en sesiones anteriores).
function nEntero(valor: number): NodoExpresion {
  return { tipo: 'literal-entero', valor: BigInt(valor), rango: R };
}
function nLargo(valor: number): NodoExpresion {
  return { tipo: 'literal-largo', valor: BigInt(valor), rango: R };
}
function nDoble(valor: number): NodoExpresion {
  return { tipo: 'literal-doble', valor, rango: R };
}
function nCaracter(valor: string): NodoExpresion {
  return { tipo: 'literal-caracter', valor, rango: R };
}
function nCadena(valor: string): NodoExpresion {
  return { tipo: 'literal-cadena', valor, rango: R };
}
function nBooleano(valor: boolean): NodoExpresion {
  return { tipo: 'literal-booleano', valor, rango: R };
}
function nBin(operador: string, izquierda: NodoExpresion, derecha: NodoExpresion): NodoExpresion {
  return { tipo: 'binaria', operador, izquierda, derecha, rango: R };
}
function nUn(operador: '+' | '-' | '!', operando: NodoExpresion): NodoExpresion {
  return { tipo: 'unaria', operador, operando, rango: R };
}
function nIncDec(operador: '++' | '--', operando: NodoExpresion): NodoExpresion {
  return { tipo: 'incremento-decremento', operador, posicion: 'postfijo', operando, rango: R };
}
function nNombreNoDeclarado(): NodoExpresion {
  return { tipo: 'nombre', nombre: 'noExiste', rango: R };
}

describe('tipoDeExpresion (pura) — promoción numérica BINARIA (JLS 5.6.2): aritmética (+ - * / %)', () => {
  it.each([
    ['int + int -> int', nEntero(1), nEntero(2), 'int'],
    ['int + long -> long (el operando "mayor" gana, nunca al revés)', nEntero(1), nLargo(2), 'long'],
    ['int + double -> double', nEntero(1), nDoble(2.5), 'double'],
    ['long + double -> double', nLargo(1), nDoble(2.5), 'double'],
    ['char + int -> int (char SIEMPRE promueve, nunca se queda char)', nCaracter('a'), nEntero(1), 'int'],
    ['triangulación: char + char -> int (NO "char" -- "\'a\'+\'b\'" es 195, exploracion/02 §6)', nCaracter('a'), nCaracter('b'), 'int'],
  ] as const)('%s', (_descripcion, izquierda, derecha, esperado) => {
    expect(tipoDeExpresion(nBin('+', izquierda, derecha), new Alcance())).toBe(esperado);
  });

  it('la promoción es la MISMA para cualquier operador aritmético, no solo "+": "int * double" da "double"', () => {
    expect(tipoDeExpresion(nBin('*', nEntero(2), nDoble(1.5)), new Alcance())).toBe('double');
  });

  it('triangulación: "long % int" da "long" (el operador "%" promueve igual que "+"/"*")', () => {
    expect(tipoDeExpresion(nBin('%', nLargo(10), nEntero(3)), new Alcance())).toBe('long');
  });
});

describe('tipoDeExpresion (pura) — concatenación con "+" (JLS 15.18.1): cualquier lado String gana', () => {
  it('String + int -> String', () => {
    expect(tipoDeExpresion(nBin('+', nCadena('x='), nEntero(5)), new Alcance())).toBe('String');
  });

  it('triangulación: int + String -> String (el orden no importa, ninguno de los dos es "izquierda" fijo)', () => {
    expect(tipoDeExpresion(nBin('+', nEntero(5), nCadena('=x')), new Alcance())).toBe('String');
  });

  it('anidado real: (1 + 2) + "x" da "String" -- el operando IZQUIERDO es él mismo una binaria (nunca "desconocido")', () => {
    const nodo = nBin('+', nBin('+', nEntero(1), nEntero(2)), nCadena('x'));
    expect(tipoDeExpresion(nodo, new Alcance())).toBe('String');
  });
});

describe('tipoDeExpresion (pura) — relacionales/igualdad/lógicos: SIEMPRE "boolean" (fijo por gramática)', () => {
  it.each([
    ['<', nEntero(1), nEntero(2)],
    ['<=', nEntero(1), nLargo(2)],
    ['>', nDoble(1.5), nEntero(2)],
    ['>=', nEntero(1), nEntero(2)],
    ['==', nEntero(1), nDoble(2)],
    ['!=', nBooleano(true), nBooleano(false)],
    ['&&', nBooleano(true), nBooleano(false)],
    ['||', nBooleano(true), nBooleano(false)],
  ] as const)('"%s" da "boolean"', (operador, izquierda, derecha) => {
    expect(tipoDeExpresion(nBin(operador, izquierda, derecha), new Alcance())).toBe('boolean');
  });

  it('triangulación real (mutante de la tarea 1.16): "(a + b) == true" da "boolean" -- el "==" en sí, aunque sus OPERANDOS sean incompatibles (eso lo reporta atribucion.ts aparte, ver atribucion.test.ts)', () => {
    const nodo = nBin('==', nBin('+', nEntero(1), nEntero(2)), nBooleano(true));
    expect(tipoDeExpresion(nodo, new Alcance())).toBe('boolean');
  });
});

describe('tipoDeExpresion (pura) — cascada (D2): un operando GENUINAMENTE desconocido nunca produce un tipo aritmético inventado', () => {
  it('"noExiste + 1" da "desconocido" (variable no declarada, nunca "int" por adivinanza)', () => {
    expect(tipoDeExpresion(nBin('+', nNombreNoDeclarado(), nEntero(1)), new Alcance())).toBe('desconocido');
  });

  it('triangulación: "noExiste < 1" (relacional) SÍ da "boolean" -- fijo por gramática (igual que "(a+b)==true" arriba), NUNCA "desconocido": el problema real ("variable-no-declarada" de "noExiste") ya lo reporta `visitarNombreComoValor` aparte, en la posición del propio nombre (siempre antes o igual que cualquier uso posterior del "<")', () => {
    expect(tipoDeExpresion(nBin('<', nNombreNoDeclarado(), nEntero(1)), new Alcance())).toBe('boolean');
  });
});

describe('tipoDeExpresion (pura) — promoción numérica UNARIA (JLS 5.6.1): "+"/"-"', () => {
  it.each([
    ['-int -> int', '-', nEntero(5), 'int'],
    ['+long -> long', '+', nLargo(5), 'long'],
    ['-double -> double', '-', nDoble(5.5), 'double'],
    ['triangulación: -char -> int (char SIEMPRE promueve, exploracion/02 §6: "-c" nunca es "char")', '-', nCaracter('a'), 'int'],
  ] as const)('%s', (_descripcion, operador, operando, esperado) => {
    expect(tipoDeExpresion(nUn(operador, operando), new Alcance())).toBe(esperado);
  });

  it('"!" siempre da "boolean" (fijo por gramática, igual que "==")', () => {
    expect(tipoDeExpresion(nUn('!', nBooleano(true)), new Alcance())).toBe('boolean');
  });

  it('cascada: "-noExiste" da "desconocido" (D2)', () => {
    expect(tipoDeExpresion(nUn('-', nNombreNoDeclarado()), new Alcance())).toBe('desconocido');
  });
});

describe('tipoDeExpresion (pura) — incremento/decremento (JLS 15.14/15.15): conserva el tipo del operando, SIN promoción', () => {
  it('"x++" con "x" int da "int"', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'x', tipo: 'int', esFinal: false, rango: R });
    expect(tipoDeExpresion(nIncDec('++', { tipo: 'nombre', nombre: 'x', rango: R }), alcance)).toBe('int');
  });

  it('triangulación: "c--" con "c" char da "char" (a diferencia de "-c" arriba, "++"/"--" NUNCA promueven -- exploracion/02 §6)', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'c', tipo: 'char', esFinal: false, rango: R });
    expect(tipoDeExpresion(nIncDec('--', { tipo: 'nombre', nombre: 'c', rango: R }), alcance)).toBe('char');
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
