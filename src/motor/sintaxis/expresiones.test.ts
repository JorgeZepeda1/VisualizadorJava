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

// Tarea 1.29 (causa 3, agregada por el orquestador): «(» tipo primitivo «)» es SIEMPRE un cast
// (design.md §2.5.1, JLS 15.16) — también con `byte`, `short` y `float`, que son tipos primitivos
// REALES de Java fuera del subconjunto (REQ-SUB-007: nunca se reinterpretan como `int`/`double`).
// Antes solo `int/long/double/boolean/char` abrían un cast, así que `(byte) x` daba «se esperaba una
// expresión y se encontró "byte"» para dos programas de `corpus/experimentos` que javac compila. Es la
// MISMA construcción que la declaración `byte b = 5;` (`tipo-primitivo-no-soportado`): un aviso.
describe('expresiones — cast a un tipo primitivo fuera del subconjunto es aviso, no error (tarea 1.29)', () => {
  it.each(['byte', 'short', 'float'])('"(%s) x" es NoSoportado con el mismo código que la declaración de ese tipo', (tipo) => {
    expect(expresionDe(`(${tipo}) x`)).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'tipo-primitivo-no-soportado' });
  });

  // Tarea 1.30 (decisión del PO 2026-09-29): el aviso nombra el tipo CONCRETO del cast (`(byte) x` → «el tipo
  // `byte`»), igual que en la declaración, así que el nodo lo lleva en sus datos.
  it.each(['byte', 'short', 'float'])('"(%s) x" manda el tipo del cast en los datos del aviso', (tipo) => {
    expect(expresionDe(`(${tipo}) x`)).toMatchObject({
      tipo: 'expresion-no-soportada',
      codigo: 'tipo-primitivo-no-soportado',
      datos: { tipo },
    });
  });

  it('el rango cubre el paréntesis de apertura hasta el final del operando: "(byte) 200" → 0..10', () => {
    expect(expresionDe('(byte) 200').rango).toEqual({ inicio: 0, fin: 10 });
  });

  it('el análisis sigue después (ADR 003): "(byte) x + 1" es una suma cuyo primer operando es NoSoportado', () => {
    expect(expresionDe('(byte) x + 1')).toMatchObject({
      tipo: 'binaria',
      operador: '+',
      izquierda: { tipo: 'expresion-no-soportada', codigo: 'tipo-primitivo-no-soportado' },
      derecha: { tipo: 'literal-entero', valor: 1n },
    });
  });

  it('un cast soportado con un operando NoSoportado: "(int) (short) x" conserva el cast exterior', () => {
    expect(expresionDe('(int) (short) x')).toMatchObject({
      tipo: 'conversion',
      nombreTipo: 'int',
      operando: { tipo: 'expresion-no-soportada', codigo: 'tipo-primitivo-no-soportado' },
    });
  });

  it('un cast sin operando sigue siendo un error de sintaxis real (javac: illegal start of expression): "(byte)" solo', () => {
    expect(() => expresionDe('(byte)')).toThrow(ErrorDeCompilacion);
  });

  it('control: "byte" fuera de un cast no se confunde con uno: "(x) + 1" sigue siendo una agrupación', () => {
    expect(expresionDe('(x) + 1')).toMatchObject({ tipo: 'binaria', operador: '+', izquierda: { tipo: 'nombre', nombre: 'x' } });
  });
});

// Tarea 1.35 (WARNING 3 de la re-verificación del lote 1, falsos RECHAZOS; javac 17.0.18 compila todos los programas de abajo): «(» Nombre «)» seguido de algo que
// abre una expresión es un cast, y el conjunto de lo que la abre es el de `JavacParser.analyzeParens` (JDK 17): los literales —TODOS: también los que el visualizador
// no ejecuta (octal, hexadecimal, binario, `float`, bloque de texto, una cadena con un escape que no decodifica) llegan aquí como tokens «no soportados»—, `switch`,
// `assert`/`enum`/`_` y las palabras de tipo primitivo y `void`. Antes un literal «no soportado» o un `switch` tras el paréntesis hacía que el cast se leyera como una
// agrupación y el programa terminaba con «Te falta un punto y coma» (`int c = (Integer) 017;`).
describe('expresiones — «(Nombre) operando» es un cast también cuando el operando es un literal que el visualizador no ejecuta (tarea 1.35)', () => {
  it.each([
    ['(Integer) 017', 'literal-octal-no-soportado'],
    ['(Integer) 0x1F', 'literal-hexadecimal-no-soportado'],
    ['(Integer) 0b101', 'literal-binario-no-soportado'],
    ['(Integer) 0_0', 'literal-octal-no-soportado'],
    ['(Double) 1.5f', 'literal-float-no-soportado'],
    ['(String) "a\\bb"', 'escape-no-soportado'],
    ['(String) """\n  hola\n  """', 'bloque-de-texto-no-soportado'],
  ])('"%s" es un cast cuyo operando es el aviso «%s»', (texto, codigo) => {
    expect(expresionDe(texto)).toMatchObject({
      tipo: 'conversion',
      operando: { tipo: 'expresion-no-soportada', codigo },
    });
  });

  it('el nombre del tipo del cast se conserva: "(Integer) 017" -> Integer', () => {
    expect(expresionDe('(Integer) 017')).toMatchObject({ tipo: 'conversion', nombreTipo: 'Integer' });
  });

  it('`(Integer) switch (k) { … }`: el operando es el `switch` usado como expresión (aviso), no un error de sintaxis', () => {
    expect(expresionDe('(Integer) switch (k) { case 1 -> 10; default -> 0; }')).toMatchObject({
      tipo: 'conversion',
      nombreTipo: 'Integer',
      operando: { tipo: 'expresion-no-soportada', codigo: 'switch-expresion-no-soportado' },
    });
  });

  it('un cast dentro de otro: "(String) (Object) 0x1F" conserva los dos', () => {
    expect(expresionDe('(String) (Object) 0x1F')).toMatchObject({
      tipo: 'conversion',
      nombreTipo: 'String',
      operando: { tipo: 'conversion', nombreTipo: 'Object', operando: { tipo: 'expresion-no-soportada', codigo: 'literal-hexadecimal-no-soportado' } },
    });
  });

  it('controles: lo que NO abre un expresión sigue siendo una agrupación, como en javac: "(x) + 1", "(x) - 1", "(x) * 2", "(x) == 1"', () => {
    expect(expresionDe('(x) + 1')).toMatchObject({ tipo: 'binaria', operador: '+', izquierda: { tipo: 'nombre', nombre: 'x' } });
    expect(expresionDe('(x) - 1')).toMatchObject({ tipo: 'binaria', operador: '-' });
    expect(expresionDe('(x) * 2')).toMatchObject({ tipo: 'binaria', operador: '*' });
    expect(expresionDe('(x) == 1')).toMatchObject({ tipo: 'binaria', operador: '==' });
  });
});

// Tarea 1.35 (la mutación por elemento del conjunto de palabras que abren el operando de un cast mostró que NINGUNA prueba protegía 18 de sus 19 miembros; al probar cada uno
// apareció la familia entera: javac compila casts a tipos que NO son un nombre simple —`(String[]) args`, `(java.util.List<String>) x`, `(A & B) x`— y el analizador solo
// reconocía `(primitivo)` y `(Nombre)`). La decisión «¿es un cast?» es `JavacParser.analyzeParens` (JDK 17.0.18) portado entero (`parentesis.ts`); el tipo se delimita sin
// validarlo y el aviso es el de la forma que tiene: arreglo, genérico, intersección o anotación. Un nombre con su paquete sigue siendo una conversión: la atribución decide si existe.
describe('expresiones — un cast a un tipo que no es un nombre simple (tarea 1.35, JavacParser.analyzeParens)', () => {
  const errorDe = (texto: string): ErrorDeCompilacion => {
    try {
      expresionDe(texto);
    } catch (error) {
      if (error instanceof ErrorDeCompilacion) return error;
      throw error;
    }
    throw new Error(`se esperaba un ErrorDeCompilacion para: ${texto}`);
  };

  it.each([
    ['un arreglo de un nombre', '(String[]) args', 'arreglo-no-soportado', { tipoArreglo: 'String[]' }],
    ['un arreglo de un primitivo', '(int[]) x', 'arreglo-no-soportado', { tipoArreglo: 'int[]' }],
    ['un arreglo de arreglos', '(int[][]) x', 'arreglo-no-soportado', { tipoArreglo: 'int[][]' }],
    ['un arreglo con el nombre calificado', '(java.lang.String[]) x', 'arreglo-no-soportado', { tipoArreglo: 'java.lang.String[]' }],
    ['un arreglo de un tipo genérico', '(java.util.List<String>[]) x', 'arreglo-no-soportado', { tipoArreglo: 'java.util.List<String>[]' }],
    ['un tipo genérico', '(java.util.List<String>) x', 'generico-no-soportado', {}],
    ['un tipo genérico con comodín', '(java.util.List<?>) x', 'generico-no-soportado', {}],
    ['un tipo genérico con comodín acotado', '(java.util.List<? extends Number>) x', 'generico-no-soportado', {}],
    ['un tipo genérico con dos argumentos', '(java.util.Map<String, Integer>) x', 'generico-no-soportado', {}],
    ['un genérico dentro de otro (`>>`)', '(java.util.List<java.util.List<String>>) x', 'generico-no-soportado', {}],
    ['tres genéricos anidados (`>>>`)', '(A<B<C<D>>>) x', 'generico-no-soportado', {}],
    ['una intersección de tipos', '(Object & java.io.Serializable) x', 'clase-no-soportada', { nombre: 'Object & java.io.Serializable' }],
    ['una intersección con un arreglo al final', '(Object & A[]) x', 'clase-no-soportada', { nombre: 'Object & A[]' }],
    ['un tipo anotado', '(@Deprecated String) x', 'anotacion-no-soportada', {}],
  ])('%s: «%s» es el aviso `%s`, que cubre el cast y su operando', (_descripcion, texto, codigo, datos) => {
    expect(expresionDe(texto)).toMatchObject({ tipo: 'expresion-no-soportada', codigo, datos, rango: { inicio: 0, fin: texto.length } });
  });

  it.each([
    ['un nombre con su paquete', '(java.lang.String) x', 'java.lang.String'],
    ['un tipo anidado con su paquete', '(java.util.Map.Entry) x', 'java.util.Map.Entry'],
    ['un nombre con espacios alrededor de los puntos', '(java . lang . String) x', 'java.lang.String'],
  ])('%s: «%s» es una conversión; el nombre se guarda sin espacios y la atribución decide qué es', (_descripcion, texto, nombreTipo) => {
    expect(expresionDe(texto)).toMatchObject({ tipo: 'conversion', nombreTipo, operando: { tipo: 'nombre', nombre: 'x' } });
  });

  it('el operando puede ser una lambda: `(Runnable & java.io.Serializable) () -> { }` es UN aviso que cubre el cast y la lambda', () => {
    const texto = '(Runnable & java.io.Serializable) () -> { }';
    expect(expresionDe(texto)).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'clase-no-soportada', rango: { inicio: 0, fin: texto.length } });
  });

  it('un cast dentro de otro conserva los dos: `(Object) (String[]) x` es una conversión cuyo operando es el aviso del arreglo', () => {
    expect(expresionDe('(Object) (String[]) x')).toMatchObject({
      tipo: 'conversion',
      nombreTipo: 'Object',
      operando: { tipo: 'expresion-no-soportada', codigo: 'arreglo-no-soportado' },
    });
  });

  it.each([
    ['una comparación entre paréntesis', '(a < b) && c', 'binaria'],
    ['un nombre entre paréntesis y una suma', '(a) + b', 'binaria'],
    ['un nombre entre paréntesis y una resta', '(a) - b', 'binaria'],
    ['un acceso a arreglo entre paréntesis', '(a[0]) + 1', 'binaria'],
    ['un acceso a miembro entre paréntesis y una suma', '(a.b) + 1', 'binaria'],
    ['dos comparaciones con «<» y «>»', '(a < b) == (c > d)', 'binaria'],
    ['un ternario entre paréntesis', '(a ? b : c) + 1', 'binaria'],
  ])('control, %s: «%s» sigue siendo una agrupación, no un cast', (_descripcion, texto, tipo) => {
    expect(expresionDe(texto)).toMatchObject({ tipo });
  });

  // Los 19 miembros del conjunto de lo que, tras «(Nombre)», abre el operando de un cast (`analyzeParens`, case RPAREN): sin la palabra, `(Object) true` sería «(Object)» y un
  // `true` suelto, y el programa terminaría con «Te falta un punto y coma». Verificados con javac 17.0.18 (los de tipo primitivo y `void` son literales de clase: `(Object) int.class`).
  it.each([
    ['true', '(Object) true', { tipo: 'literal-booleano', valor: true }],
    ['false', '(Object) false', { tipo: 'literal-booleano', valor: false }],
    ['null', '(Object) null', { tipo: 'expresion-no-soportada', codigo: 'null-no-soportado' }],
    ['new', '(Object) new Object()', { tipo: 'nueva-instancia', nombreTipo: 'Object' }],
    ['this', '(Object) this', { tipo: 'expresion-no-soportada', codigo: 'this-super-no-soportado' }],
    ['super', '(Object) super', { tipo: 'expresion-no-soportada', codigo: 'this-super-no-soportado' }],
    ['switch', '(Object) switch (k) { default -> 0; }', { tipo: 'expresion-no-soportada', codigo: 'switch-expresion-no-soportado' }],
    ['byte', '(Object) byte.class', { tipo: 'expresion-no-soportada', codigo: 'literal-de-clase-no-soportado' }],
    ['short', '(Object) short.class', { tipo: 'expresion-no-soportada', codigo: 'literal-de-clase-no-soportado' }],
    ['char', '(Object) char.class', { tipo: 'expresion-no-soportada', codigo: 'literal-de-clase-no-soportado' }],
    ['int', '(Object) int.class', { tipo: 'expresion-no-soportada', codigo: 'literal-de-clase-no-soportado' }],
    ['long', '(Object) long.class', { tipo: 'expresion-no-soportada', codigo: 'literal-de-clase-no-soportado' }],
    ['float', '(Object) float.class', { tipo: 'expresion-no-soportada', codigo: 'literal-de-clase-no-soportado' }],
    ['double', '(Object) double.class', { tipo: 'expresion-no-soportada', codigo: 'literal-de-clase-no-soportado' }],
    ['boolean', '(Object) boolean.class', { tipo: 'expresion-no-soportada', codigo: 'literal-de-clase-no-soportado' }],
    ['void', '(Object) void.class', { tipo: 'expresion-no-soportada', codigo: 'literal-de-clase-no-soportado' }],
  ])('«(Object) %s…»: javac lo lee como un cast y su operando es %j', (_palabra, texto, operando) => {
    expect(expresionDe(texto)).toMatchObject({ tipo: 'conversion', nombreTipo: 'Object', operando });
  });

  it.each(['assert', 'enum', '_'])('«(Object) %s»: javac también lee un cast y es la palabra la que no puede ser un operando: error EN ella, no «falta el ;»', (palabra) => {
    const texto = `(Object) ${palabra}`;
    const error = errorDe(texto);
    expect(error.codigo).not.toBe('falta-punto-y-coma');
    expect(error.rango.inicio).toBe(texto.indexOf(palabra));
  });

  it('un cast sin operando sigue siendo un error de sintaxis real, también con un tipo complejo: `(String[])` solo', () => {
    expect(errorDe('(String[])').codigo).not.toBe('falta-punto-y-coma');
  });
});

// Tarea 1.35 (JLS 15.8.2; la misma familia: javac compila `System.out.println(String.class)` y `Object o = int[].class;` y el analizador daba un error de sintaxis en la línea): un LITERAL
// DE CLASE es `Tipo.class`, con el tipo escrito con su paquete, con dimensiones de arreglo o como palabra de tipo primitivo (`int.class`, `void.class`). El visualizador no maneja los
// objetos `Class`: es un aviso, y el literal es un operando más (`int.class.getName()`, `String.class == String.class`). Solo un nombre puede ser el receptor: `f().class` es un error.
describe('expresiones — un literal de clase (`X.class`) es un aviso, no un error de sintaxis (tarea 1.35, JLS 15.8.2)', () => {
  const errorDe = (texto: string): ErrorDeCompilacion => {
    try {
      expresionDe(texto);
    } catch (error) {
      if (error instanceof ErrorDeCompilacion) return error;
      throw error;
    }
    throw new Error(`se esperaba un ErrorDeCompilacion para: ${texto}`);
  };

  it.each([
    ['un nombre de clase', 'String.class'],
    ['un nombre con su paquete', 'java.util.List.class'],
    ['un tipo primitivo', 'int.class'],
    ['`void`', 'void.class'],
    ['un tipo primitivo fuera del subconjunto', 'float.class'],
    ['un arreglo de un nombre', 'String[].class'],
    ['un arreglo de un primitivo', 'int[].class'],
    ['un arreglo de arreglos', 'int[][].class'],
    ['un arreglo con el nombre calificado', 'java.lang.String[].class'],
  ])('%s: «%s» es el aviso `literal-de-clase-no-soportado`, con el literal tal como se escribió', (_descripcion, texto) => {
    expect(expresionDe(texto)).toMatchObject({
      tipo: 'expresion-no-soportada',
      codigo: 'literal-de-clase-no-soportado',
      datos: { literal: texto },
      rango: { inicio: 0, fin: texto.length },
    });
  });

  it('los espacios entre las partes no cuentan: `int [ ] . class` es el literal `int[].class`', () => {
    expect(expresionDe('int [ ] . class')).toMatchObject({ codigo: 'literal-de-clase-no-soportado', datos: { literal: 'int[].class' } });
    expect(expresionDe('java . util . List . class')).toMatchObject({ codigo: 'literal-de-clase-no-soportado', datos: { literal: 'java.util.List.class' } });
  });

  it('el literal es un operando más: `int.class.getName()` es una llamada sobre él y `String.class == String.class` una comparación', () => {
    expect(expresionDe('int.class.getName()')).toMatchObject({
      tipo: 'llamada',
      callee: { tipo: 'acceso-miembro', miembro: 'getName', objeto: { tipo: 'expresion-no-soportada', codigo: 'literal-de-clase-no-soportado' } },
    });
    expect(expresionDe('String.class == String.class')).toMatchObject({
      tipo: 'binaria',
      operador: '==',
      izquierda: { codigo: 'literal-de-clase-no-soportado' },
      derecha: { codigo: 'literal-de-clase-no-soportado' },
    });
  });

  it.each([
    ['una llamada', 'f().class'],
    ['un nombre entre paréntesis', '(String).class'],
    ['un acceso a arreglo con índice', 'a[0].class'],
  ])('control, %s: «%s» NO es un literal de clase (javac: «<identifier> expected») y sigue siendo un error de sintaxis', (_descripcion, texto) => {
    expect(errorDe(texto).codigo).not.toBe('literal-de-clase-no-soportado');
  });

  it('un tipo de arreglo sin `.class` ni `::` no es una expresión: `String[]` solo es un error de sintaxis', () => {
    expect(errorDe('String[]')).toBeInstanceOf(ErrorDeCompilacion);
  });

  it('control: una palabra de tipo primitivo fuera de un literal de clase sigue siendo un error («int» no es una expresión)', () => {
    expect(errorDe('int').rango.inicio).toBe(0);
    expect(errorDe('int + 1').rango.inicio).toBe(0);
  });
});

// Tarea 1.35 (la misma familia, JLS 15.13): una REFERENCIA A MÉTODO cuyo receptor es un tipo con dimensiones o con argumentos de tipo (`String[]::new`, `int[]::clone`,
// `ArrayList<String>::new`) es el aviso de referencias a método, como `ArrayList::new`; antes `[` esperaba un índice y `<` era una comparación.
describe('expresiones — una referencia a método con un tipo como receptor es el aviso de referencias (tarea 1.35, JLS 15.13)', () => {
  it.each([
    ['un arreglo de un nombre', 'String[]::new'],
    ['un arreglo de un primitivo', 'int[]::new'],
    ['un arreglo y un método', 'int[]::clone'],
    ['un genérico', 'java.util.ArrayList<String>::new'],
    ['un genérico anidado', 'java.util.ArrayList<java.util.List<String>>::new'],
    ['un genérico y un método', 'java.util.List<String>::size'],
    ['un genérico con comodín', 'java.util.List<?>::size'],
  ])('%s: «%s» es el aviso `referencia-metodo`, que cubre el receptor y el miembro', (_descripcion, texto) => {
    expect(expresionDe(texto)).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'referencia-metodo', rango: { inicio: 0, fin: texto.length } });
  });

  it('control: una comparación con «<» y «>» sigue siendo una comparación (el «>» no lo sigue un `::`, un `.` ni un `[`)', () => {
    expect(expresionDe('a < b > c')).toMatchObject({ tipo: 'binaria', operador: '>', izquierda: { tipo: 'binaria', operador: '<' } });
    expect(expresionDe('a < b')).toMatchObject({ tipo: 'binaria', operador: '<' });
  });

  it('control: una referencia simple sigue siendo la misma: `System.out::println` y `ArrayList::new`', () => {
    expect(expresionDe('System.out::println')).toMatchObject({ codigo: 'referencia-metodo' });
    expect(expresionDe('java.util.ArrayList::new')).toMatchObject({ codigo: 'referencia-metodo' });
  });
});

// Tarea 1.35 (WARNING 3, falsos RECHAZOS; javac 17.0.18 compila los cuatro): el lado derecho de `instanceof` es un TIPO (JLS 15.20.2), no un identificador suelto: puede
// ser un nombre con su paquete (`java.lang.String`), un arreglo (`String[]`), llevar argumentos de tipo (`List<?>`) y, desde Java 16, terminar en una variable
// (`o instanceof String s`, con `final` si se quiere): el patrón. Todas son la misma construcción —el aviso de `instanceof`—; antes solo se leía UN identificador y el
// patrón daba «Te falta cerrar un paréntesis» para `if (o instanceof String s)`.
describe('expresiones — `instanceof` con un tipo completo y con patrón es el aviso de `instanceof`, no un error (tarea 1.35)', () => {
  it.each([
    'o instanceof String s',
    'o instanceof final String s',
    'o instanceof String[]',
    'o instanceof String[] arreglo',
    'o instanceof java.lang.String',
    'o instanceof java.lang.String s',
    'o instanceof List<?>',
    'o instanceof List<String> lista',
    'o instanceof Map.Entry<String, Integer> e',
  ])('"%s" es el aviso `instanceof` y el análisis termina donde termina el tipo', (texto) => {
    const expresion = expresionDe(texto);
    expect(expresion).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'instanceof' });
    expect(expresion.rango).toEqual({ inicio: 0, fin: texto.length });
  });

  it('el patrón forma parte del `instanceof` y lo que sigue se sigue leyendo: "o instanceof String s && s.length() > 0" es un `&&`', () => {
    expect(expresionDe('o instanceof String s && s.length() > 0')).toMatchObject({
      tipo: 'binaria',
      operador: '&&',
      izquierda: { tipo: 'expresion-no-soportada', codigo: 'instanceof' },
      derecha: { tipo: 'binaria', operador: '>' },
    });
  });

  it('control: sin variable detrás sigue igual: "o instanceof String && b" -> el `b` es el otro operando, no un patrón', () => {
    expect(expresionDe('o instanceof String && b')).toMatchObject({
      tipo: 'binaria',
      operador: '&&',
      izquierda: { tipo: 'expresion-no-soportada', codigo: 'instanceof' },
      derecha: { tipo: 'nombre', nombre: 'b' },
    });
  });

  it('un `instanceof` sin tipo sigue siendo un error de sintaxis real: "o instanceof" y "o instanceof 5"', () => {
    expect(() => expresionDe('o instanceof')).toThrow(ErrorDeCompilacion);
    expect(() => expresionDe('o instanceof 5')).toThrow(ErrorDeCompilacion);
  });
});

// Tarea 1.35 (WARNING 3, falsos RECHAZOS; javac 17.0.18 compila los dos programas de `corpus/experimentos/falsos-rechazos/`): `new Tipo(...) { … }` es una CLASE
// ANÓNIMA (JLS 15.9.5): Java válido que el subconjunto no simula (REQ-SUB-007: «clases/objetos propios» → aviso). Se delimita el cuerpo entero sin interpretarlo y el
// análisis sigue después de su «}» (ADR 003). Aunque la clase base sea una soportada (`new Scanner(System.in) { … }`) el aviso es el mismo: lo de adentro no se revisa.
describe('expresiones — una clase anónima es un aviso, no un error de sintaxis (tarea 1.35)', () => {
  it('"new Runnable() { public void run() { } }" es el aviso `clase-anonima-no-soportada` y cubre el cuerpo completo', () => {
    const texto = 'new Runnable() { public void run() { int x = 1; } }';
    const expresion = expresionDe(texto);
    expect(expresion).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'clase-anonima-no-soportada', datos: {} });
    expect(expresion.rango).toEqual({ inicio: 0, fin: texto.length });
  });

  it('el análisis sigue tras la «}»: "new Object() { }.hashCode()" es una llamada sobre el aviso, y "new Object() { } + 1" una suma', () => {
    expect(expresionDe('new Object() { }.hashCode()')).toMatchObject({
      tipo: 'llamada',
      callee: { tipo: 'acceso-miembro', objeto: { tipo: 'expresion-no-soportada', codigo: 'clase-anonima-no-soportada' }, miembro: 'hashCode' },
    });
    expect(expresionDe('new Object() { } + 1')).toMatchObject({
      tipo: 'binaria',
      operador: '+',
      izquierda: { tipo: 'expresion-no-soportada', codigo: 'clase-anonima-no-soportada' },
    });
  });

  it('con argumentos y con una clase base soportada: "new Scanner(System.in) { }" también es una clase anónima', () => {
    expect(expresionDe('new Scanner(System.in) { }')).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'clase-anonima-no-soportada' });
  });

  it('con argumentos de tipo: "new Comparator<String>() { }" y el rombo "new Comparator<>() { }"', () => {
    expect(expresionDe('new Comparator<String>() { }')).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'clase-anonima-no-soportada' });
    expect(expresionDe('new Comparator<>() { }')).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'clase-anonima-no-soportada' });
  });

  it('control: sin cuerpo sigue siendo una nueva instancia normal, y un cuerpo sin cerrar es un error de sintaxis real', () => {
    expect(expresionDe('new Scanner(System.in)')).toMatchObject({ tipo: 'nueva-instancia', nombreTipo: 'Scanner' });
    expect(() => expresionDe('new Object() { int x;')).toThrow(ErrorDeCompilacion);
  });
});

// Tarea 1.35 (hallado con una sonda de Java válido fuera del subconjunto; javac 17.0.18 compila `String s = P.<String>id("a");`): una llamada puede llevar argumentos de tipo
// explícitos entre el punto y el nombre del método (JLS 15.12). Son genéricos: fuera del subconjunto, el aviso de siempre (`generico-no-soportado`), no un error de sintaxis.
describe('expresiones — una llamada con argumentos de tipo explícitos es el aviso de genéricos (tarea 1.35)', () => {
  it.each([
    ['P.<String>id("a")', 17],
    ['Collections.<Integer>emptyList()', 32],
    ['this.<T, U>f(1, 2)', 18],
  ])('"%s" es el aviso `generico-no-soportado` que cubre toda la llamada', (texto, fin) => {
    const expresion = expresionDe(texto);
    expect(expresion).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'generico-no-soportado' });
    expect(expresion.rango).toEqual({ inicio: 0, fin });
  });

  it('el análisis sigue después de la llamada: "P.<String>id("a").length()" es una llamada sobre el aviso', () => {
    expect(expresionDe('P.<String>id("a").length()')).toMatchObject({
      tipo: 'llamada',
      callee: { tipo: 'acceso-miembro', objeto: { tipo: 'expresion-no-soportada', codigo: 'generico-no-soportado' }, miembro: 'length' },
    });
  });

  it('control: una comparación no se confunde con argumentos de tipo, y `.<` sin cerrar sigue siendo un error de sintaxis', () => {
    expect(expresionDe('a < b')).toMatchObject({ tipo: 'binaria', operador: '<' });
    expect(expresionDe('a.b < c')).toMatchObject({ tipo: 'binaria', operador: '<' });
    expect(() => expresionDe('P.<String id("a")')).toThrow(ErrorDeCompilacion);
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

// Tarea 1.34: la tabla de precedencias era un objeto plano (`{ '||': 3, … }`) indexado con el TEXTO del token que sigue a un operando, y ese texto puede
// ser un identificador del alumno: `PRECEDENCIA['constructor']` no es `undefined` sino la función `Object`, y `Object < 3` es falso (NaN), así que el
// nombre pasaba por «operador de alta precedencia» y `int a = 1 constructor 2;` se aceptaba (javac: `';' expected`). Un nombre que no es un operador
// termina la expresión y el resto lo decide quien la llamó.
describe('expresiones — un nombre de Object.prototype detrás de un operando NO es un operador (tarea 1.34)', () => {
  const NOMBRES = ['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString'];

  it.each(NOMBRES)('«1 %s 2»: la expresión es solo el «1» y el cursor queda en el nombre', (nombre) => {
    const cursor = new CursorDeTokens(tokenizar(`1 ${nombre} 2`));
    const expr = analizarExpresion(cursor);
    expect(expr).toMatchObject({ tipo: 'literal-entero', valor: 1n });
    expect(cursor.actual().texto).toBe(nombre);
  });

  it('triangulación: tras una suma y tras un nombre de variable también', () => {
    const suma = new CursorDeTokens(tokenizar('a + b valueOf c'));
    expect(analizarExpresion(suma)).toMatchObject({ tipo: 'binaria', operador: '+', izquierda: { nombre: 'a' }, derecha: { nombre: 'b' } });
    expect(suma.actual().texto).toBe('valueOf');
    const nombre = new CursorDeTokens(tokenizar('x __proto__'));
    expect(analizarExpresion(nombre)).toMatchObject({ tipo: 'nombre', nombre: 'x' });
    expect(nombre.actual().texto).toBe('__proto__');
  });

  it('control: los operadores de verdad siguen siendo operadores (la tabla no se rompió)', () => {
    const cursor = new CursorDeTokens(tokenizar('1 + 2 * 3 == 7 && a'));
    expect(analizarExpresion(cursor)).toMatchObject({ tipo: 'binaria', operador: '&&' });
    expect(cursor.actual().tipo).toBe('eof');
  });
});

// Tarea 1.34 (D): el árbol conserva si una expresión venía entre paréntesis — `parentesis`, el rango de los más externos — porque hay tres reglas de Java que
// dependen de eso y no del valor: una expresión entre paréntesis no es una sentencia (JLS 14.8), no puede ser la «función» de una llamada (`(f)(1)`) y el
// nombre de una clase entre paréntesis ya no es la clase (`(Math).abs(1)`: «illegal parenthesized expression»). El valor y la forma del árbol no cambian.
describe('expresiones — el árbol recuerda los paréntesis (tarea 1.34)', () => {
  it('una expresión entre paréntesis lleva `parentesis`; la misma sin ellos, no', () => {
    expect(expresionDe('(1 + 2)')).toMatchObject({ tipo: 'binaria', operador: '+', parentesis: { inicio: 0, fin: 7 } });
    expect(expresionDe('1 + 2').parentesis).toBeUndefined();
  });

  it('solo la subexpresión que va entre paréntesis lleva la marca: en `(1 + 2) * 3` la suma sí y el producto no', () => {
    const expr = expresionDe('(1 + 2) * 3');
    expect(expr).toMatchObject({ tipo: 'binaria', operador: '*', izquierda: { operador: '+', parentesis: { inicio: 0, fin: 7 } } });
    expect(expr.parentesis).toBeUndefined();
  });

  it('con los paréntesis repetidos la marca es la de los MÁS EXTERNOS (el rango que javac señala)', () => {
    expect(expresionDe('((x))')).toMatchObject({ tipo: 'nombre', nombre: 'x', parentesis: { inicio: 0, fin: 5 } });
    expect(expresionDe('( ( x = 1 ) )')).toMatchObject({ tipo: 'asignacion', parentesis: { inicio: 0, fin: 13 } });
  });

  it('el rango de la propia expresión sigue siendo el de lo de dentro (nada que dependa de él cambia)', () => {
    expect(expresionDe('(1 + 2)').rango).toEqual({ inicio: 1, fin: 6 });
  });

  // Tarea 1.35: antes `(a.b)(1)` terminaba en `(a.b)` y dejaba `(1)` sin leer; javac lee un «(» tras un «)» como el operando de un cast (`analyzeParens`, `case RPAREN`), así que las dos
  // formas son conversiones: `int x = (a.b)(1);` es «package a does not exist» y `int y = (f)(1);` es «cannot find symbol» —el tipo no existe—, ninguna es una llamada (verificado con javac 17.0.18).
  it('una expresión entre paréntesis NO puede ser el nombre de una llamada: `(a.b)(1)` y `(f)(1)` son conversiones, como en javac, no llamadas', () => {
    expect(expresionDe('(a.b)(1)')).toMatchObject({ tipo: 'conversion', nombreTipo: 'a.b', operando: { tipo: 'literal-entero', valor: 1n } });
    expect(expresionDe('(f)(1)')).toMatchObject({ tipo: 'conversion', nombreTipo: 'f' });
  });

  it('control: sin paréntesis, `f(1)` sigue siendo una llamada, y `(a.b).c(1)` sigue siendo una llamada sobre `(a.b)`', () => {
    expect(expresionDe('f(1)')).toMatchObject({ tipo: 'llamada', callee: { nombre: 'f' } });
    expect(expresionDe('(a.b).c(1)')).toMatchObject({ tipo: 'llamada', callee: { tipo: 'acceso-miembro', miembro: 'c', objeto: { parentesis: { inicio: 0, fin: 5 } } } });
  });

  it('un cast no es una expresión entre paréntesis: `(int) x` es una conversión sin marca', () => {
    expect(expresionDe('(int) x').parentesis).toBeUndefined();
    expect(expresionDe('(int) x')).toMatchObject({ tipo: 'conversion' });
  });
});
