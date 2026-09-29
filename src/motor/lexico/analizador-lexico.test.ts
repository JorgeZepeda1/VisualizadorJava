// RED de la tarea 0.12 (rebanada vertical — motor mínimo, design.md §2.3 subconjunto de
// Programa/Clase/Main/Bloque/println) + tarea 1.1 (léxico completo, design.md §2.6): literales
// numéricos, char, palabras clave nuevas, operadores y reconocimiento NO-DISP léxico (ADR 003).
import { describe, expect, it } from 'vitest';
import { tokenizar } from './analizador-lexico.ts';
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';

describe('tokenizar', () => {
  it('tokeniza el programa dorado u3-hola-mundo completo', () => {
    const fuente = [
      'public class MiPrograma {',
      '    public static void main(String[] args) {',
      '        System.out.println("Hola, mundo");',
      '    }',
      '}',
      '',
    ].join('\n');

    const tokens = tokenizar(fuente);
    const textos = tokens.map((t) => t.texto);

    expect(textos).toEqual([
      'public', 'class', 'MiPrograma', '{',
      'public', 'static', 'void', 'main', '(', 'String', '[', ']', 'args', ')', '{',
      'System', '.', 'out', '.', 'println', '(', '"Hola, mundo"', ')', ';',
      '}',
      '}',
      '',
    ]);
    expect(tokens.at(-1)?.tipo).toBe('eof');
  });

  it('clasifica cada palabra reservada como palabra-clave y el resto como identificador', () => {
    const tokens = tokenizar('public class final static void Foo');
    const tipos = tokens.slice(0, -1).map((t) => t.tipo);
    expect(tipos).toEqual([
      'palabra-clave', 'palabra-clave', 'palabra-clave',
      'palabra-clave', 'palabra-clave', 'identificador',
    ]);
  });

  it('decodifica el literal de cadena y expone el valor ya sin comillas', () => {
    const tokens = tokenizar('"hola"');
    expect(tokens[0]).toMatchObject({ tipo: 'cadena', texto: '"hola"', valor: 'hola' });
  });

  it('ignora comentarios de línea y de bloque', () => {
    const tokens = tokenizar('// comentario\nclass /* otro */ Foo');
    const textos = tokens.slice(0, -1).map((t) => t.texto);
    expect(textos).toEqual(['class', 'Foo']);
  });

  it('registra el rango de cada token (desplazamientos reales, no arbitrarios)', () => {
    const tokens = tokenizar('class Foo');
    expect(tokens[0].rango).toEqual({ inicio: 0, fin: 5 });
    expect(tokens[1].rango).toEqual({ inicio: 6, fin: 9 });
  });

  it('lanza ErrorDeCompilacion con rango ante un carácter no reconocido', () => {
    try {
      tokenizar('class § Foo');
      expect.unreachable('debía lanzar');
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorDeCompilacion);
      expect((error as ErrorDeCompilacion).rango.inicio).toBe(6);
    }
  });
});

describe('tokenizar — palabras clave nuevas de la tarea 1.1', () => {
  it('reconoce import, package, return y los tipos primitivos como palabra-clave', () => {
    const tokens = tokenizar('import package return int long double boolean char true false instanceof new');
    const tipos = tokens.slice(0, -1).map((t) => t.tipo);
    expect(tipos).toEqual(Array(12).fill('palabra-clave'));
  });

  it('String, Scanner y Random siguen siendo identificador (no son palabra reservada de Java)', () => {
    const tokens = tokenizar('String Scanner Random');
    expect(tokens.slice(0, -1).map((t) => t.tipo)).toEqual(['identificador', 'identificador', 'identificador']);
  });
});

describe('tokenizar — literales numéricos (tarea 1.1, design.md §2.1)', () => {
  it('produce un token "entero" con el valor decodificado', () => {
    const [token] = tokenizar('42');
    expect(token).toMatchObject({ tipo: 'entero', texto: '42', valorEntero: 42n });
  });

  it('produce un token "largo" para el sufijo L', () => {
    const [token] = tokenizar('100L');
    expect(token).toMatchObject({ tipo: 'largo', texto: '100L', valorEntero: 100n });
  });

  it('produce un token "doble" para un literal con punto decimal', () => {
    const [token] = tokenizar('3.14');
    expect(token).toMatchObject({ tipo: 'doble', texto: '3.14', valorDoble: 3.14 });
  });

  it('el rango del token numérico cubre exactamente el literal', () => {
    const tokens = tokenizar('  1_000L;');
    expect(tokens[0]).toMatchObject({ tipo: 'largo', rango: { inicio: 2, fin: 8 } });
    expect(tokens[1]).toMatchObject({ tipo: 'puntuacion', texto: ';' });
  });
});

// Tarea 1.29 (causa 7, hallada al comparar programas típicos con javac 17): JLS 3.10.2 — un literal
// decimal de punto flotante puede empezar con el punto (`.5`), terminar en él (`5.`), o traer el
// exponente justo tras el punto (`5.e2`, `.5e1`). El léxico exigía un dígito DESPUÉS del punto, así que
// `double f = .5;` daba «se esperaba una expresión y se encontró "."» y `5.e2` se partía en `5`, `.` y el
// identificador `e2`. Son literales `double` corrientes (SOPORTADOS): se leen como tales.
describe('tokenizar — literales decimales con punto en cualquier posición (JLS 3.10.2, tarea 1.29)', () => {
  it.each([
    ['.5', 0.5],
    ['5.', 5],
    ['.5e1', 5],
    ['5.e2', 500],
    ['1_0.2_5', 10.25],
    ['01.5', 1.5],
    ['09.', 9],
    ['5.d', 5],
    ['.5D', 0.5],
  ])('"%s" es UN solo token "doble" con valor %s', (texto, valor) => {
    const tokens = tokenizar(texto);
    expect(tokens).toHaveLength(2); // el literal y el fin de archivo
    expect(tokens[0]).toMatchObject({ tipo: 'doble', texto, valorDoble: valor, rango: { inicio: 0, fin: texto.length } });
  });

  it.each(['.5f', '5.f', '.5e1F', '5.5F'])('"%s" (sufijo f) sigue siendo el aviso del literal float, no un double', (texto) => {
    const tokens = tokenizar(texto);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toMatchObject({ tipo: 'no-soportado', codigo: 'literal-float-no-soportado', texto });
  });

  it('un entero con punto y luego un identificador se parte como javac: "5.toString" es el literal "5." y el identificador "toString"', () => {
    const tokens = tokenizar('5.toString');
    expect(tokens.slice(0, -1).map((t) => [t.tipo, t.texto])).toEqual([
      ['doble', '5.'],
      ['identificador', 'toString'],
    ]);
  });

  it('regresión: el punto de acceso, de varargs y los literales de siempre no cambian ("a.b", "String... args", "3.14", "42")', () => {
    expect(tokenizar('a.b').slice(0, -1).map((t) => t.texto)).toEqual(['a', '.', 'b']);
    expect(tokenizar('String... args').slice(0, -1).map((t) => t.texto)).toEqual(['String', '.', '.', '.', 'args']);
    expect(tokenizar('3.14')[0]).toMatchObject({ tipo: 'doble', valorDoble: 3.14 });
    expect(tokenizar('42')[0]).toMatchObject({ tipo: 'entero', valorEntero: 42n });
    expect(tokenizar('x.length()').slice(0, -1).map((t) => t.texto)).toEqual(['x', '.', 'length', '(', ')']);
  });

  it('regresión: un octal sin punto sigue siendo el aviso octal ("010"), pero "010.5" es un decimal', () => {
    expect(tokenizar('010')[0]).toMatchObject({ tipo: 'no-soportado', codigo: 'literal-octal-no-soportado' });
    expect(tokenizar('010.5')[0]).toMatchObject({ tipo: 'doble', valorDoble: 10.5 });
  });
});

// Tarea 1.29 (causa 8): JLS 3.8 — un identificador puede llevar cualquier letra Unicode
// (`Character.isJavaIdentifierStart/Part`): `int año = 2020;`, `double área`, `String número` son Java
// válido (verificado con javac 17) y de uso corriente en un curso en español. El léxico solo aceptaba
// ASCII y respondía «carácter no reconocido: "ñ"» a un programa correcto.
describe('tokenizar — identificadores con letras Unicode (JLS 3.8, tarea 1.29)', () => {
  it.each(['año', 'número', 'área', 'Ñandú', 'ñoño', 'μ', '変数', 'ⅷ', '€', 'a1_$', 'x\u0301'])(
    '"%s" es UN identificador',
    (nombre) => {
      const tokens = tokenizar(nombre);
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({ tipo: 'identificador', texto: nombre, rango: { inicio: 0, fin: nombre.length } });
    },
  );

  it('una letra de fuera del plano básico (dos unidades UTF-16, "𝒳") también es identificador', () => {
    const tokens = tokenizar('𝒳y');
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toMatchObject({ tipo: 'identificador', texto: '𝒳y', rango: { inicio: 0, fin: 3 } });
  });

  it('el identificador termina donde termina la letra: "año+1" son tres tokens; un dígito no inicia un identificador', () => {
    expect(tokenizar('año+1').slice(0, -1).map((t) => [t.tipo, t.texto])).toEqual([
      ['identificador', 'año'],
      ['puntuacion', '+'],
      ['entero', '1'],
    ]);
    expect(tokenizar('1año').slice(0, -1).map((t) => [t.tipo, t.texto])).toEqual([
      ['entero', '1'],
      ['identificador', 'año'],
    ]);
  });

  it('una palabra reservada con acento NO lo es ("clásse" es un identificador) y las de siempre siguen siéndolo', () => {
    expect(tokenizar('clásse')[0]).toMatchObject({ tipo: 'identificador' });
    expect(tokenizar('class')[0]).toMatchObject({ tipo: 'palabra-clave' });
  });

  it.each(['§', '·', '😀', '\u00a0', '\ufeff'])('triangulación negativa: %j NO es un carácter de identificador — sigue siendo un error de javac', (caracter) => {
    expect(() => tokenizar(`int ${caracter} = 5;`)).toThrow(ErrorDeCompilacion);
  });

  // La tabla sale del JDK 17 (Unicode 13), no de las propiedades del motor de JavaScript (Node 22: Unicode
  // 17, que aceptaría ~14 000 letras nuevas que javac 17 rechaza) — ver `identificadores-java.generado.ts`.
  it('una letra asignada en Unicode 14 (U+0870, árabe) NO es identificador para javac 17, y aquí tampoco', () => {
    expect(() => tokenizar('int \u0870 = 5;')).toThrow(ErrorDeCompilacion);
  });

  it('un carácter ignorable (U+200D, unión de ancho cero) SÍ cabe DENTRO de un identificador para javac, pero no lo inicia', () => {
    expect(tokenizar('a\u200db')[0]).toMatchObject({ tipo: 'identificador', texto: 'a\u200db' });
    expect(() => tokenizar('int \u200db = 5;')).toThrow(ErrorDeCompilacion);
  });

  it('el rango del error cubre el carácter COMPLETO, también uno de dos unidades UTF-16 ("😀")', () => {
    try {
      tokenizar('int 😀 = 5;');
      expect.unreachable('debía lanzar');
    } catch (error) {
      expect((error as ErrorDeCompilacion).rango).toEqual({ inicio: 4, fin: 6 });
    }
  });
});

// Tarea 1.29: JLS 3.6 — el salto de página (\f) también es espacio en blanco.
describe('tokenizar — el salto de página es espacio en blanco (JLS 3.6, tarea 1.29)', () => {
  it('"a\fb" son dos identificadores', () => {
    expect(tokenizar('a\fb').slice(0, -1).map((t) => t.texto)).toEqual(['a', 'b']);
  });
});

// Tarea 1.29 (causa 10): «@» abre una anotación (`@Override`, `@SuppressWarnings("resource")`) — Java válido
// que el léxico rechazaba como carácter desconocido. Es puntuación; qué anotación es lo decide la sintaxis.
describe('tokenizar — la arroba de las anotaciones (tarea 1.29)', () => {
  it('"@Override" son dos tokens: la puntuación "@" y el identificador', () => {
    expect(tokenizar('@Override').slice(0, -1).map((t) => [t.tipo, t.texto])).toEqual([
      ['puntuacion', '@'],
      ['identificador', 'Override'],
    ]);
  });
});

describe('tokenizar — literal char (tarea 1.1)', () => {
  it('produce un token "caracter" con el valor decodificado', () => {
    const [token] = tokenizar("'x'");
    expect(token).toMatchObject({ tipo: 'caracter', texto: "'x'", valorCaracter: 'x' });
  });

  it('decodifica un escape válido dentro del char', () => {
    const [token] = tokenizar(String.raw`'\n'`);
    expect(token).toMatchObject({ tipo: 'caracter', valorCaracter: '\n' });
  });
});

describe('tokenizar — operadores (tarea 1.1, design.md §2.4)', () => {
  it('tokeniza los operadores aritméticos y de asignación de un carácter', () => {
    const tokens = tokenizar('+ - * / % = < > ! & | ^ ~ ? :');
    expect(tokens.slice(0, -1).map((t) => t.texto)).toEqual([
      '+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~', '?', ':',
    ]);
    expect(tokens.slice(0, -1).every((t) => t.tipo === 'puntuacion')).toBe(true);
  });

  it('prefiere el operador MÁS LARGO en cada posición (maximal munch)', () => {
    const tokens = tokenizar('a >>>= b >>> c >>= d >> e >= f > g');
    const textos = tokens.filter((t) => t.tipo === 'puntuacion').map((t) => t.texto);
    expect(textos).toEqual(['>>>=', '>>>', '>>=', '>>', '>=', '>']);
  });

  it('tokeniza ==, !=, &&, ||, ++, -- y las asignaciones compuestas soportadas', () => {
    const tokens = tokenizar('a == b != c && d || e++ f-- g += 1 h -= 1 i *= 1 j /= 1 k %= 1');
    const textos = tokens.filter((t) => t.tipo === 'puntuacion').map((t) => t.texto);
    expect(textos).toEqual(['==', '!=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=']);
  });
});

describe('tokenizar — reconocimiento NO-DISP léxico (tarea 1.1, ADR 003, design.md §2.6)', () => {
  it('un literal octal (010) produce un token "no-soportado" y el análisis sigue', () => {
    const tokens = tokenizar('int n = 010 ;');
    const noSoportado = tokens.find((t) => t.tipo === 'no-soportado');
    expect(noSoportado).toMatchObject({ codigo: 'literal-octal-no-soportado', texto: '010' });
    expect(noSoportado?.nota).toBe('Java lo lee como octal: 8');
    // Sigue tokenizando lo que viene después (";"), no aborta.
    expect(tokens.at(-2)?.texto).toBe(';');
  });

  it('un literal hexadecimal (0x1F) produce un token "no-soportado"', () => {
    const tokens = tokenizar('0x1F');
    expect(tokens[0]).toMatchObject({ tipo: 'no-soportado', codigo: 'literal-hexadecimal-no-soportado' });
  });

  it('un escape no soportado dentro de una cadena produce un token "no-soportado" para toda la cadena', () => {
    const tokens = tokenizar(String.raw`"antes\rdespues"`);
    expect(tokens[0]).toMatchObject({ tipo: 'no-soportado', codigo: 'escape-no-soportado' });
  });

  it('un \\uXXXX bien formado fuera de una cadena/char produce un token "no-soportado" y sigue', () => {
    // Barra invertida doblada a propósito (ver discovery de esta sesión): en tiempo de ejecución
    // Node la decodifica a UNA barra invertida real seguida de "u0041", que es la fuente Java que
    // se quiere tokenizar (el escape unicode fuera de cadenas del design.md §2.6).
    const fuente = `class \\u0041 { }`;
    const tokens = tokenizar(fuente);
    expect(tokens[0]).toMatchObject({ tipo: 'palabra-clave', texto: 'class' });
    expect(tokens[1]).toMatchObject({ tipo: 'no-soportado', codigo: 'escape-unicode-no-soportado' });
    expect(tokens[2]).toMatchObject({ tipo: 'puntuacion', texto: '{' });
  });

  // Corrección obligatoria (sub-lote 1-B): hoy \uXXXX dentro de un comentario se ignoraba en
  // silencio (simplificación documentada de 1-A). Verificado contra javac 17 real (compilando y
  // EJECUTANDO un archivo real): Java traduce los escapes Unicode ANTES del análisis léxico (JLS
  // 3.3), incluso dentro de "//" — "// \u000a int x = 99; System.out.println(x);" compila y corre
  // como si el \u000a fuera un salto de línea real, así que "int x = 99; ..." deja de ser parte del
  // comentario y se ejecuta de verdad (imprimió "99"). Como \uXXXX está fuera del subconjunto, esto
  // NUNCA debe ignorarse en silencio: debe producir el aviso de "no soportado", igual que fuera de
  // comentarios (nunca se reinterpreta el comentario, ADR 003 "deja seguir").
  it('un \\uXXXX bien formado dentro de un comentario de línea (//) produce "no-soportado" y sigue', () => {
    const fuente = ['int x = 1; // \\u0041 nota', 'int y = 2;'].join('\n');
    const tokens = tokenizar(fuente);
    const noSoportado = tokens.find((t) => t.codigo === 'escape-unicode-no-soportado');
    expect(noSoportado).toBeDefined();
    // El resto del programa se sigue tokenizando después del comentario (dos declaraciones completas).
    const enteros = tokens.filter((t) => t.tipo === 'entero').map((t) => t.valorEntero);
    expect(enteros).toEqual([1n, 2n]);
  });

  it('un \\uXXXX dentro de un comentario de bloque (/* */) también produce "no-soportado" y sigue', () => {
    const fuente = 'int x = 1; /* antes \\u0041 despues */ int y = 2;';
    const tokens = tokenizar(fuente);
    const noSoportado = tokens.find((t) => t.codigo === 'escape-unicode-no-soportado');
    expect(noSoportado).toBeDefined();
    const enteros = tokens.filter((t) => t.tipo === 'entero').map((t) => t.valorEntero);
    expect(enteros).toEqual([1n, 2n]);
  });

  it('un comentario sin ningún \\uXXXX no produce ningún token "no-soportado" (regresión)', () => {
    const fuente = '// comentario normal sin nada raro\nint x = 1;';
    const tokens = tokenizar(fuente);
    expect(tokens.some((t) => t.tipo === 'no-soportado')).toBe(false);
  });
});
