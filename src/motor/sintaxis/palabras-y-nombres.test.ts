// RED de la tarea 1.33 (léxico y sintaxis que dejó el generador diferencial de la 1.31): qué es un NOMBRE y qué es una palabra
// reservada (V y N2), cuándo `yield` es una sentencia y cuándo un identificador, `case s ->` (N4), `println` con más o menos de un
// argumento y `return` con valor (WARNING-2 de la re-verificación del lote 1). Todo verificado contra javac 17.0.18 real (sondas con
// `JavacTask.parse()` y compilación completa); la tabla de nombres vive en `pruebas/compilacion/tablas-lexicas.ts` y el corpus en
// `corpus/experimentos/lexico-y-sintaxis/`.
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { analizarPrograma } from './analizador-sintactico.ts';
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';
import type { NodoDeclaracionLocal, NodoNoSoportado, NodoRetorno, NodoSentenciaExpresion, NodoSwitch } from './ast.ts';

function analizar(fuente: string) {
  return analizarPrograma(tokenizar(fuente));
}

function elementosDeMain(cuerpo: string) {
  return analizar(`class C { public static void main(String[] a) { ${cuerpo} } }`).clase.main!.cuerpo.elementos;
}

function primerElemento(cuerpo: string) {
  return elementosDeMain(cuerpo)[0]!;
}

function errorAlAnalizar(fuente: string): ErrorDeCompilacion {
  try {
    analizar(fuente);
  } catch (error) {
    if (error instanceof ErrorDeCompilacion) return error;
    throw error;
  }
  throw new Error(`debía lanzar un ErrorDeCompilacion: ${fuente}`);
}

describe('V — `var` y `yield` valen como NOMBRE de variable (javac los compila)', () => {
  it.each(['int var;', 'int var = 5;', 'double yield;', 'String yield = "a";', 'Long var;', 'final int var = 1;', 'int a = 1, var = 2, yield = 3;'])(
    '«%s» es una declaración local, no un error de sintaxis',
    (declaracion) => {
      const elemento = primerElemento(declaracion);
      expect(elemento.tipo, declaracion).toBe('declaracion-local');
    },
  );

  it('el nombre del declarador es `var` (o `yield`), tal cual', () => {
    const declaracion = primerElemento('int var = 5;') as NodoDeclaracionLocal;
    expect(declaracion.declaradores.map((d) => d.nombre)).toEqual(['var']);
    expect((primerElemento('double yield;') as NodoDeclaracionLocal).declaradores[0]!.nombre).toBe('yield');
  });

  it.each([
    'int var = 1; var = var + 1;',
    'int var = 1; var++;',
    'int var = 1; --var;',
    'int var = 1; System.out.println(var);',
    'int var = 1; int y = var * 2;',
    'String var = "a"; int n = var.length();',
    'for (int var = 0; var < 3; var++) { }',
    'boolean yield = true; while (yield) { yield = false; }',
    'boolean yield = true; if (yield) { }',
    'int yield = 1; yield = yield + 1;',
    'int yield = 1; System.out.println(yield + 1);',
    'String yield = "a"; yield.length();',
    'int yield = 1; int z = yield;',
  ])('«%s» se usa como una variable cualquiera: se analiza sin error', (cuerpo) => {
    expect(() => elementosDeMain(cuerpo), cuerpo).not.toThrow();
  });

  it('`var` como TIPO (`var x = 5;`, Java 10) sigue siendo el aviso de var, nunca una variable llamada var', () => {
    for (const declaracion of ['var x = 5;', 'final var x = 5;', 'var var = 5;', 'var x;']) {
      const elemento = primerElemento(declaracion) as NodoNoSoportado;
      expect(elemento.tipo, declaracion).toBe('no-soportado');
      expect(elemento.codigo, declaracion).toBe('var-no-soportado');
    }
  });

  it('`for (var i = 0; …)` y `for (var s : lista)` siguen avisando', () => {
    expect((primerElemento('for (var i = 0; i < 3; i++) { }') as NodoNoSoportado).codigo).toBe('var-no-soportado');
    expect((primerElemento('for (var s : lista) { }') as NodoNoSoportado).codigo).toBe('for-mejorado-no-soportado');
  });

  it('los campos, métodos y parámetros de la clase también pueden llamarse `var` o `yield`', () => {
    const programa = analizar('class C { static int var; static void yield() { } public static void main(String[] var) { } }');
    expect(programa.clase.main).not.toBeNull();
    expect(programa.clase.main!.parametro).toBe('var');
  });

  it.each(['var', 'yield', 'record', 'sealed', 'permits'])('«%s» NO puede ser el nombre de la CLASE (javac: restricted.type.not.allowed)', (nombre) => {
    const error = errorAlAnalizar(`public class ${nombre} { public static void main(String[] a) { } }`);
    expect(error.message).toContain(`"${nombre}"`);
    // El rango es el del nombre de la clase (tras «public class »).
    expect(error.rango).toEqual({ inicio: 13, fin: 13 + nombre.length });
  });

  it('`module`, `open`, `to`, `with`… sí pueden ser el nombre de la clase (javac los compila)', () => {
    for (const nombre of ['module', 'open', 'opens', 'requires', 'transitive', 'exports', 'to', 'uses', 'provides', 'with', 'non']) {
      expect(analizar(`public class ${nombre} { public static void main(String[] a) { } }`).clase.nombre, nombre).toBe(nombre);
    }
  });
});

describe('yield — sentencia o identificador según el token que sigue (JavacParser.blockStatement)', () => {
  it.each([
    ['yield++;', 'una expresión (el «;» de tres tokens más allá lo decide)'],
    ['yield--;', 'una expresión'],
    ['yield = 5;', 'una asignación'],
    ['yield += 3;', 'una asignación compuesta'],
    ['yield -= 1;', 'una asignación compuesta'],
    ['yield.length();', 'una llamada sobre la variable'],
    ['yield();', 'una llamada sin argumentos (javac: yield() sin calificar es un método, no una sentencia)'],
    ['yield(1, 2);', 'una llamada con una coma dentro de los paréntesis'],
  ])('«%s» es %s, no la sentencia yield', (cuerpo) => {
    const elemento = primerElemento(cuerpo);
    expect(elemento.tipo, cuerpo).toBe('sentencia-expresion');
  });

  it.each([
    'yield 5;',
    'yield x;',
    'yield "a";',
    "yield 'a';",
    'yield 1.5;',
    'yield 5L;',
    'yield null;',
    'yield true;',
    'yield false;',
    'yield new Scanner(System.in);',
    'yield this;',
    'yield super.x;',
    'yield +1;',
    'yield -1;',
    'yield ++x;',
    'yield --x;',
    'yield !x;',
    'yield ~x;',
    'yield (1);',
    'yield (a + b);',
    'yield;',
  ])('«%s» es la sentencia yield: un aviso (javac solo la admite en un switch usado como expresión)', (cuerpo) => {
    const elemento = primerElemento(cuerpo) as NodoNoSoportado;
    expect(elemento.tipo, cuerpo).toBe('no-soportado');
    expect(elemento.codigo, cuerpo).toBe('yield-no-soportado');
  });

  it('dentro de un `switch` clásico, `yield 1;` sigue avisando y `yield = 2;` es una asignación', () => {
    const elementos = (primerElemento('switch (d) { case 1: yield 1; case 2: yield = 2; break; }') as NodoSwitch).elementos;
    expect(elementos.map((e) => e.tipo)).toEqual(['etiqueta-case', 'no-soportado', 'etiqueta-case', 'sentencia-expresion', 'break']);
  });

  it('`yield x;` NO es una declaración de una variable `x` de tipo `yield`', () => {
    expect(primerElemento('yield x;').tipo).toBe('no-soportado');
  });

  it('el cuerpo de un `if` sin llaves también distingue: `if (c) yield = 1;` es una asignación', () => {
    const sentencia = primerElemento('if (c) yield = 1;') as { entonces: { tipo: string } };
    expect(sentencia.entonces.tipo).toBe('sentencia-expresion');
  });
});

describe('N2 — una palabra reservada como nombre de variable es un error con el nombre de la palabra', () => {
  it.each([
    'int native;', 'int native = 1;', 'int enum = 5;', "char _ = 'a';", 'int goto;', 'final int extends = 7;', 'boolean synchronized = true;', 'double private;',
    'int class = 5;', 'int true;', 'int null;', 'long int;', 'int assert;', 'int abstract, x;', 'int x, volatile;', 'for (int volatile = 0; volatile < 3; volatile++) { }',
  ])('«%s» → palabra-reservada-como-nombre', (cuerpo) => {
    const error = errorAlAnalizar(`class C { public static void main(String[] a) { ${cuerpo} } }`);
    expect(error.conDatos?.codigo, cuerpo).toBe('palabra-reservada-como-nombre');
  });

  it('los datos traen la palabra tal como se escribió, y el rango es el de la palabra', () => {
    const fuente = 'class C { public static void main(String[] a) { int native; } }';
    const error = errorAlAnalizar(fuente);
    expect(error.conDatos).toEqual({ codigo: 'palabra-reservada-como-nombre', datos: { palabra: 'native' } });
    expect(fuente.slice(error.rango.inicio, error.rango.fin)).toBe('native');
  });

  it.each(['String private = "a";', 'Scanner native;', 'Integer implements;', 'Random goto = null;', 'final String enum = "a";', 'String _ = "a";'])(
    'también tras un tipo de referencia: «%s»',
    (cuerpo) => {
      const error = errorAlAnalizar(`class C { public static void main(String[] a) { ${cuerpo} } }`);
      expect(error.conDatos?.codigo, cuerpo).toBe('palabra-reservada-como-nombre');
    },
  );

  it('un nombre seguido de `instanceof` NO se lee como una declaración: es la expresión `x instanceof T` (un aviso de instanceof), nunca «`instanceof` es una palabra reservada»', () => {
    const elemento = primerElemento('x instanceof String;') as NodoSentenciaExpresion;
    expect(elemento.tipo).toBe('sentencia-expresion');
    expect(elemento.expresion.tipo).toBe('expresion-no-soportada');
  });

  it('un nombre que solo CONTIENE una palabra reservada (nativo, enumerado, extendsAlgo, `_x`, `x_`, `__`) es válido', () => {
    for (const nombre of ['nativo', 'enumerado', 'extendsAlgo', '_x', 'x_', '__', '$goto', 'Native']) {
      expect(primerElemento(`int ${nombre} = 1;`).tipo, nombre).toBe('declaracion-local');
    }
  });

  it('una palabra reservada usada como VALOR (`native = 5;`, `int y = goto;`) sigue siendo un error de sintaxis sin datos propios', () => {
    expect(errorAlAnalizar('class C { public static void main(String[] a) { native = 5; } }').conDatos).toBeUndefined();
    expect(errorAlAnalizar('class C { public static void main(String[] a) { int y = goto; } }').conDatos).toBeUndefined();
  });
});

describe('N4 — `case s ->` (una etiqueta que es un nombre, un paréntesis o una constante con flecha) no es una lambda', () => {
  it.each([
    'final int s = 3; switch (s) { case s -> { } }',
    'switch (x) { case K -> { } }',
    'switch (x) { case (1) -> { } default -> { } }',
    'switch (x) { case (K) -> { } }',
    'switch (x) { case c -> System.out.println("a"); }',
    'switch (x) { case 1, K -> { } }',
    'switch (x) { case K + 1 -> { } }',
    'switch (x) { case 1 -> { } case s -> { } default -> { } }',
  ])('«%s» es un `switch` con flecha: un aviso, no un error de sintaxis', (cuerpo) => {
    const elementos = elementosDeMain(cuerpo);
    const conAviso = (elementos.at(-1) as NodoSwitch).elementos.some((e) => e.tipo === 'no-soportado' && (e as NodoNoSoportado).codigo === 'switch-flecha-no-soportado');
    expect(conAviso, cuerpo).toBe(true);
  });

  it('una lambda de verdad (`x -> x + 1`) FUERA de una etiqueta sigue siendo la lambda: un aviso de lambda', () => {
    expect(() => elementosDeMain('int f = x -> x + 1;')).not.toThrow();
  });

  it('un `case` clásico con dos puntos no cambia (`case s:`)', () => {
    const conDosPuntos = (primerElemento('switch (x) { case s: break; }') as NodoSwitch).elementos.map((e) => e.tipo);
    expect(conDosPuntos).toEqual(['etiqueta-case', 'break']);
  });
});

describe('WARNING-2 — `println` y `print` con un número de argumentos que no existe: es una llamada, no un error de paréntesis', () => {
  it.each([
    ['System.out.println("a", 5);', 2],
    ['System.out.print("a", 5);', 2],
    ['System.out.println(1, 2, 3);', 3],
    ['System.out.println("Suma: ", 1 + 2);', 2],
    ['System.out.print();', 0],
  ])('«%s» se analiza como la llamada de %i argumentos que es (la atribución la rechaza)', (cuerpo, argumentos) => {
    const elemento = primerElemento(cuerpo) as NodoSentenciaExpresion;
    expect(elemento.tipo, cuerpo).toBe('sentencia-expresion');
    expect(elemento.expresion, cuerpo).toMatchObject({ tipo: 'llamada' });
    const llamada = elemento.expresion;
    if (llamada.tipo !== 'llamada') throw new Error(`«${cuerpo}» debía ser una llamada`);
    expect(llamada.argumentos, cuerpo).toHaveLength(argumentos);
  });

  it('los usos correctos siguen siendo la sentencia de impresión: println(x), println(), print(x)', () => {
    for (const cuerpo of ['System.out.println("a");', 'System.out.println();', 'System.out.print("a");', 'System.out.println(f(1, 2));', 'System.out.println("a" + b);']) {
      expect(primerElemento(cuerpo).tipo, cuerpo).toBe('impresion');
    }
  });

  it('una coma DENTRO de un paréntesis o de unas llaves del argumento no cuenta (`println(f(1, 2))`, `println(new int[]{1, 2}.length)`)', () => {
    expect(primerElemento('System.out.println(Math.max(1, 2));').tipo).toBe('impresion');
    expect(primerElemento('System.out.println(new int[]{1, 2}.length);').tipo).toBe('impresion');
  });

  it('los errores de puntuación de verdad siguen siendo eso (`println("a" "b")`, `println("a"`)', () => {
    expect(() => elementosDeMain('System.out.println("a" "b");')).toThrow(ErrorDeCompilacion);
    expect(() => elementosDeMain('System.out.println("a";')).toThrow(ErrorDeCompilacion);
  });
});

describe('WARNING-2 — `return` con valor en `main`: el AST lo conserva (la atribución lo rechaza: unexpected return value)', () => {
  it.each(['return 0;', 'return x;', 'return "a";', 'return 1 + 2;', 'return (1);', 'return -1;', 'return sinDeclarar;'])('«%s» es un retorno con valor', (cuerpo) => {
    const elemento = primerElemento(cuerpo) as NodoRetorno;
    expect(elemento.tipo, cuerpo).toBe('retorno');
    expect(elemento.valor, cuerpo).not.toBeNull();
  });

  it('el rango del valor es el de la expresión, y el del retorno llega hasta el «;»', () => {
    const fuente = 'class C { public static void main(String[] a) { return 42; } }';
    const retorno = analizar(fuente).clase.main!.cuerpo.elementos[0] as NodoRetorno;
    expect(fuente.slice(retorno.valor!.rango.inicio, retorno.valor!.rango.fin)).toBe('42');
    expect(fuente.slice(retorno.rango.inicio, retorno.rango.fin)).toBe('return 42;');
  });

  it('`return;` sin valor sigue siendo válido: valor null', () => {
    expect((primerElemento('return;') as NodoRetorno).valor).toBeNull();
  });

  it('a `return 0` le sigue faltando el «;» de verdad → error de punto y coma (como antes)', () => {
    expect(() => elementosDeMain('return 0')).toThrow(ErrorDeCompilacion);
  });
});
