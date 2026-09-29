// RED de la tarea 1.3 (sintaxis — expresiones Pratt, design.md §2.4): los 14 niveles de
// precedencia, cortocircuito &&/||, y las construcciones NO-DISP de la misma tabla (bits,
// desplazamientos, ternario, instanceof) reconocidas con la precedencia REAL (ADR 003) en vez de
// dar un error de sintaxis. `expresiones.ts` también soporta las declaraciones locales de la tarea
// 1.2 (se prueba ahí, en contexto real); aquí se prueba el analizador de expresiones aislado.
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { CursorDeTokens } from './cursor-de-tokens.ts';
import { analizarExpresion } from './expresiones.ts';
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';

function expresionDe(texto: string) {
  return analizarExpresion(new CursorDeTokens(tokenizar(texto)));
}

describe('expresiones — primarias', () => {
  it('literal entero', () => {
    expect(expresionDe('42')).toMatchObject({ tipo: 'literal-entero', valor: 42n });
  });
  it('literal largo', () => {
    expect(expresionDe('42L')).toMatchObject({ tipo: 'literal-largo', valor: 42n });
  });
  it('literal doble', () => {
    expect(expresionDe('3.5')).toMatchObject({ tipo: 'literal-doble', valor: 3.5 });
  });
  it('literal char', () => {
    expect(expresionDe("'z'")).toMatchObject({ tipo: 'literal-caracter', valor: 'z' });
  });
  it('literal cadena', () => {
    expect(expresionDe('"hola"')).toMatchObject({ tipo: 'literal-cadena', valor: 'hola' });
  });
  it('literal booleano true y false (triangulación)', () => {
    expect(expresionDe('true')).toMatchObject({ tipo: 'literal-booleano', valor: true });
    expect(expresionDe('false')).toMatchObject({ tipo: 'literal-booleano', valor: false });
  });
  it('un identificador es una referencia por nombre', () => {
    expect(expresionDe('total')).toMatchObject({ tipo: 'nombre', nombre: 'total' });
  });
  it('paréntesis de agrupación cambian la precedencia', () => {
    const expr = expresionDe('(1 + 2) * 3');
    expect(expr).toMatchObject({
      tipo: 'binaria',
      operador: '*',
      izquierda: { tipo: 'binaria', operador: '+' },
      derecha: { tipo: 'literal-entero', valor: 3n },
    });
  });
});

describe('expresiones — precedencia aritmética (niveles 11-12)', () => {
  it('* liga más fuerte que + (2 + 3 * 4)', () => {
    const expr = expresionDe('2 + 3 * 4');
    expect(expr).toMatchObject({
      tipo: 'binaria',
      operador: '+',
      izquierda: { tipo: 'literal-entero', valor: 2n },
      derecha: { tipo: 'binaria', operador: '*', izquierda: { valor: 3n }, derecha: { valor: 4n } },
    });
  });

  it('+ y - son izquierda-asociativos (10 - 3 - 2 == (10-3)-2)', () => {
    const expr = expresionDe('10 - 3 - 2');
    expect(expr).toMatchObject({
      tipo: 'binaria',
      operador: '-',
      izquierda: { tipo: 'binaria', operador: '-', izquierda: { valor: 10n }, derecha: { valor: 3n } },
      derecha: { valor: 2n },
    });
  });

  it('* / % son izquierda-asociativos (triangulación de nivel 12)', () => {
    const expr = expresionDe('20 / 4 / 2');
    expect(expr).toMatchObject({
      tipo: 'binaria',
      operador: '/',
      izquierda: { tipo: 'binaria', operador: '/' },
    });
  });
});

describe('expresiones — relacionales, igualdad y lógicos con cortocircuito (niveles 3-4, 8-9)', () => {
  it('< > <= >= son nivel 9', () => {
    expect(expresionDe('a < b')).toMatchObject({ tipo: 'binaria', operador: '<' });
    expect(expresionDe('a >= b')).toMatchObject({ tipo: 'binaria', operador: '>=' });
  });

  it('== y != son nivel 8', () => {
    expect(expresionDe('a == b')).toMatchObject({ tipo: 'binaria', operador: '==' });
    expect(expresionDe('a != b')).toMatchObject({ tipo: 'binaria', operador: '!=' });
  });

  it('&& liga más fuerte que || (a && b || c == (a&&b)||c)', () => {
    const expr = expresionDe('a && b || c');
    expect(expr).toMatchObject({
      tipo: 'binaria',
      operador: '||',
      izquierda: { tipo: 'binaria', operador: '&&' },
      derecha: { tipo: 'nombre', nombre: 'c' },
    });
  });

  it('la comparación liga más fuerte que && (a < b && c > d)', () => {
    const expr = expresionDe('a < b && c > d');
    expect(expr).toMatchObject({
      tipo: 'binaria',
      operador: '&&',
      izquierda: { tipo: 'binaria', operador: '<' },
      derecha: { tipo: 'binaria', operador: '>' },
    });
  });
});

describe('expresiones — unarios y incremento/decremento (nivel 13, 14)', () => {
  it('menos unario', () => {
    expect(expresionDe('-a')).toMatchObject({ tipo: 'unaria', operador: '-', operando: { nombre: 'a' } });
  });
  it('más unario y negación lógica (triangulación)', () => {
    expect(expresionDe('+a')).toMatchObject({ tipo: 'unaria', operador: '+' });
    expect(expresionDe('!listo')).toMatchObject({ tipo: 'unaria', operador: '!' });
  });
  it('incremento/decremento prefijo', () => {
    expect(expresionDe('++a')).toMatchObject({
      tipo: 'incremento-decremento',
      operador: '++',
      posicion: 'prefijo',
    });
    expect(expresionDe('--a')).toMatchObject({ operador: '--', posicion: 'prefijo' });
  });
  it('incremento/decremento postfijo', () => {
    expect(expresionDe('a++')).toMatchObject({
      tipo: 'incremento-decremento',
      operador: '++',
      posicion: 'postfijo',
    });
    expect(expresionDe('a--')).toMatchObject({ operador: '--', posicion: 'postfijo' });
  });
});

describe('expresiones — asignación (nivel 1, design.md §2.4)', () => {
  it('asignación simple', () => {
    expect(expresionDe('a = 5')).toMatchObject({
      tipo: 'asignacion',
      operador: '=',
      objetivo: { nombre: 'a' },
      valor: { valor: 5n },
    });
  });

  it('+= -= *= /= %= soportados (triangulación de los 5 operadores)', () => {
    expect(expresionDe('a += 1')).toMatchObject({ tipo: 'asignacion', operador: '+=' });
    expect(expresionDe('a -= 1')).toMatchObject({ tipo: 'asignacion', operador: '-=' });
    expect(expresionDe('a *= 1')).toMatchObject({ tipo: 'asignacion', operador: '*=' });
    expect(expresionDe('a /= 1')).toMatchObject({ tipo: 'asignacion', operador: '/=' });
    expect(expresionDe('a %= 1')).toMatchObject({ tipo: 'asignacion', operador: '%=' });
  });

  it('la asignación es derecha-asociativa (a = b = 5)', () => {
    const expr = expresionDe('a = b = 5');
    expect(expr).toMatchObject({
      tipo: 'asignacion',
      objetivo: { nombre: 'a' },
      valor: { tipo: 'asignacion', objetivo: { nombre: 'b' }, valor: { valor: 5n } },
    });
  });
});

describe('expresiones — miembro, llamada y "new" (nivel 14, REQ-SUB-005)', () => {
  it('llamada simple a un método', () => {
    expect(expresionDe('foo()')).toMatchObject({ tipo: 'llamada', callee: { nombre: 'foo' }, argumentos: [] });
  });

  it('llamada con argumentos separados por coma', () => {
    const expr = expresionDe('sumar(1, 2)');
    expect(expr).toMatchObject({ tipo: 'llamada', argumentos: [{ valor: 1n }, { valor: 2n }] });
  });

  it('acceso a miembro encadenado con llamada (System.out.println recibe cualquier expresión)', () => {
    const expr = expresionDe('sc.nextInt()');
    expect(expr).toMatchObject({
      tipo: 'llamada',
      callee: { tipo: 'acceso-miembro', objeto: { nombre: 'sc' }, miembro: 'nextInt' },
    });
  });

  // Tarea NUEVA (sub-lote 1-D5, JLS 15.12, cierre de C7 -- mutante real u5-switch-menu-calculadora
  // .java#49): "MethodInvocation" SIEMPRE exige un Identifier justo antes de "("
  // (`MethodName(...)`/`Primary.Identifier(...)`) -- un Primary arbitrario (un literal de cadena,
  // el resultado de "(a - b)"...) NUNCA puede ser el "callee" de una llamada real. El "(" que sigue
  // a un Primary que no es 'nombre' ni 'acceso-miembro' NUNCA se consume como el inicio de una
  // llamada -- se deja intacto para que el contexto que sigue lo rechace con su propio error real
  // (ver compilador.test.ts para el caso completo dentro de println, con línea calibrada).
  it('un literal de cadena seguido de "(" NUNCA forma una llamada (JLS 15.12): el "(" queda SIN consumir', () => {
    expect(expresionDe('"texto"(1)')).toMatchObject({ tipo: 'literal-cadena', valor: 'texto' });
  });

  it('triangulación: "(a - b)" (una binaria, tras colapsar los paréntesis) seguida de "(" tampoco forma una llamada', () => {
    expect(expresionDe('(a - b)(1)')).toMatchObject({
      tipo: 'binaria',
      operador: '-',
      izquierda: { nombre: 'a' },
      derecha: { nombre: 'b' },
    });
  });

  it('control: una llamada encadenada SÍ sigue funcionando cuando el callee real es un acceso a miembro ("Primary.Identifier(...)", JLS 15.12)', () => {
    const expr = expresionDe('new Scanner(System.in).nextInt()');
    expect(expr).toMatchObject({
      tipo: 'llamada',
      callee: { tipo: 'acceso-miembro', objeto: { tipo: 'nueva-instancia', nombreTipo: 'Scanner' }, miembro: 'nextInt' },
    });
  });

  it('cadena de acceso a miembro de más de un nivel (Math.PI-like)', () => {
    const expr = expresionDe('a.b.c');
    expect(expr).toMatchObject({
      tipo: 'acceso-miembro',
      miembro: 'c',
      objeto: { tipo: 'acceso-miembro', miembro: 'b', objeto: { nombre: 'a' } },
    });
  });

  it('"new Scanner(System.in)" es una nueva instancia con el argumento reconocido', () => {
    const expr = expresionDe('new Scanner(System.in)');
    expect(expr).toMatchObject({
      tipo: 'nueva-instancia',
      nombreTipo: 'Scanner',
      argumentos: [{ tipo: 'acceso-miembro', objeto: { nombre: 'System' }, miembro: 'in' }],
    });
  });
});

describe('expresiones — cast (design.md §2.4 nivel 13, sí soportado)', () => {
  it('cast a tipo primitivo', () => {
    expect(expresionDe('(int) 3.9')).toMatchObject({
      tipo: 'conversion',
      nombreTipo: 'int',
      operando: { tipo: 'literal-doble', valor: 3.9 },
    });
  });

  it('cast a double (triangulación de tipo primitivo distinto)', () => {
    expect(expresionDe('(double) 3')).toMatchObject({ tipo: 'conversion', nombreTipo: 'double' });
  });
});

describe('expresiones — NO-DISP con precedencia real (design.md §2.6, ADR 003)', () => {
  it('bits & | ^ son NoSoportado, cada uno con su propio código', () => {
    expect(expresionDe('a & b')).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'operador-bits-and' });
    expect(expresionDe('a | b')).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'operador-bits-or' });
    expect(expresionDe('a ^ b')).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'operador-bits-xor' });
  });

  it('desplazamientos << >> >>> son NoSoportado', () => {
    expect(expresionDe('a << 2')).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'operador-desplazamiento' });
    expect(expresionDe('a >> 2')).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'operador-desplazamiento' });
    expect(expresionDe('a >>> 2')).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'operador-desplazamiento' });
  });

  it('el operador ternario es NoSoportado y el rango cubre las 3 ramas', () => {
    const expr = expresionDe('a ? b : c');
    expect(expr).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'operador-ternario' });
    expect(expr.rango).toEqual({ inicio: 0, fin: 9 });
  });

  it('instanceof es NoSoportado', () => {
    expect(expresionDe('a instanceof Foo')).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'instanceof' });
  });

  it('~ (complemento de bits) es NoSoportado', () => {
    expect(expresionDe('~a')).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'operador-complemento-bits' });
  });

  it('acceso a arreglo [] es NoSoportado pero el análisis sigue después (ADR 003)', () => {
    const expr = expresionDe('a[0] + 1');
    expect(expr).toMatchObject({
      tipo: 'binaria',
      operador: '+',
      izquierda: { tipo: 'expresion-no-soportada', codigo: 'acceso-arreglo' },
      derecha: { valor: 1n },
    });
  });

  it('referencia a método :: es NoSoportado', () => {
    expect(expresionDe('Foo::bar')).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'referencia-metodo' });
  });

  it('asignaciones compuestas de bits son NoSoportado (&= |= ^= <<= >>= >>>=)', () => {
    expect(expresionDe('a &= 1')).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'asignacion-de-bits' });
    expect(expresionDe('a <<= 1')).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'asignacion-de-bits' });
  });

  it('un problema NO-DISP a la izquierda de una expresión de mayor precedencia no rompe el análisis (bits dentro de una suma)', () => {
    // "a & b" (nivel 5) es el operando completo de la izquierda de "* c" (nivel 12); confirma que
    // la precedencia real se respeta incluso cuando el resultado es NoSoportado.
    const expr = expresionDe('a & b * c');
    expect(expr).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'operador-bits-and' });
    // El operando derecho real fue "b * c" completo (mayor precedencia que "&"), no solo "b".
    expect(expr.rango).toEqual({ inicio: 0, fin: 9 });
  });

  // Tarea 1.25 (datos tipados): "new Tipo[...]" en posición de EXPRESIÓN (analizarNuevaInstancia,
  // código `arregloNuevo` — MISMO valor de texto que la declaración "Tipo[] x;", REQ-SUB-007 fila
  // "Arreglos") es el ÚNICO sitio de emisión de `arreglo-no-soportado` que NINGUNA muestra de
  // `corpus/compilacion/avisos/` ejercita (las 3 muestras de arreglo reales — 25/26/27 — declaran
  // el tipo primero, "Tipo[] nombre = ...", así que SIEMPRE se detectan como declaración antes de
  // llegar a interpretar el inicializador "new ..." como expresión). Sin esta prueba, el sitio de
  // `analizarNuevaInstancia` quedaría sin ninguna verificación real de que manda `tipoArreglo`.
  it('"new Tipo[...]" (arreglo, en posición de EXPRESIÓN) es NoSoportado con el tipo real en datos.tipoArreglo', () => {
    expect(expresionDe('new int[5]')).toMatchObject({
      tipo: 'expresion-no-soportada',
      codigo: 'arreglo-no-soportado',
      datos: { tipoArreglo: 'int[]' },
    });
  });

  it('triangulación: otro tipo y dos dimensiones ("new String[3][]") — nunca "int[]" fijo', () => {
    expect(expresionDe('new String[3][]')).toMatchObject({
      tipo: 'expresion-no-soportada',
      codigo: 'arreglo-no-soportado',
      datos: { tipoArreglo: 'String[][]' },
    });
  });
});

// Tarea 1.23 (agregada por el orquestador: hallazgo de la guarda de avisos, sub-lote 1-D6):
// "switch" en posición de EXPRESIÓN (JLS 15.28, Java 14+) — `analizarSwitch`
// (analizador-sintactico.ts) solo reconocía "switch" como inicio de SENTENCIA; un switch usado
// como inicializador/argumento/operando (Java válido real, verificado contra javac 17 real en
// esta sesión) caía en el `throw` genérico de abajo, un error de sintaxis engañoso para algo que
// javac sí acepta (C8, regla 5 de CLAUDE.md). Todas las formas verificadas contra javac 17 real
// (carpetas temporales, borradas) antes de escribir estos casos.
describe('expresiones — switch como expresión (JLS 15.28, REQ-SUB-007, tarea 1.23)', () => {
  it('con flechas ("case X -> valor") es NoSoportado, no un error de sintaxis', () => {
    const expr = expresionDe('switch (dia) { case 1 -> 10; default -> 0; }');
    expect(expr).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'switch-expresion-no-soportado' });
  });

  it('forma clásica con ":" y "yield" (igual que corpus/compilacion/avisos/37-yield.java) también es NoSoportado', () => {
    const expr = expresionDe('switch (dia) { case 1: yield 1; default: yield 0; }');
    expect(expr).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'switch-expresion-no-soportado' });
  });

  it('"yield" dentro de un bloque ("case X -> { yield valor; }") no rompe el balanceo de "{"/"}"', () => {
    const expr = expresionDe('switch (dia) { case 1 -> { yield 10; } default -> { yield 0; } }');
    expect(expr).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'switch-expresion-no-soportado' });
  });

  it('el rango va desde "switch" hasta el "}" que cierra, incluso con un bloque "yield" anidado', () => {
    const texto = 'switch (dia) { case 1 -> { yield 10; } default -> { yield 0; } }';
    expect(expresionDe(texto).rango).toEqual({ inicio: 0, fin: texto.length });
  });

  it('anidado como operando de otra expresión, el análisis sigue después (ADR 003)', () => {
    const expr = expresionDe('1 + switch (n) { case 1 -> 10; default -> 0; }');
    expect(expr).toMatchObject({
      tipo: 'binaria',
      operador: '+',
      izquierda: { valor: 1n },
      derecha: { tipo: 'expresion-no-soportada', codigo: 'switch-expresion-no-soportado' },
    });
  });

  it('como argumento de una llamada (p. ej. System.out.println), el análisis sigue después del cierre', () => {
    const expr = expresionDe('System.out.println(switch (n) { case 1 -> "uno"; default -> "otro"; })');
    expect(expr).toMatchObject({
      tipo: 'llamada',
      argumentos: [{ tipo: 'expresion-no-soportada', codigo: 'switch-expresion-no-soportado' }],
    });
  });
});

describe('expresiones — error real cuando no hay ninguna expresión válida que analizar', () => {
  it('lanza ErrorDeCompilacion si el token no puede iniciar una expresión', () => {
    expect(() => expresionDe(';')).toThrow(ErrorDeCompilacion);
  });
});
