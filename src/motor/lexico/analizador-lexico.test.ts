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
    expect(tokenizar('String... args').slice(0, -1).map((t) => t.texto)).toEqual(['String', '...', 'args']); // tarea 1.36: los tres puntos pegados son UN token (JLS 3.11)
    expect(tokenizar('3.14')[0]).toMatchObject({ tipo: 'doble', valorDoble: 3.14 });
    expect(tokenizar('42')[0]).toMatchObject({ tipo: 'entero', valorEntero: 42n });
    expect(tokenizar('x.length()').slice(0, -1).map((t) => t.texto)).toEqual(['x', '.', 'length', '(', ')']);
  });

  it('regresión: un octal sin punto sigue siendo el aviso octal ("010"), pero "010.5" es un decimal', () => {
    expect(tokenizar('010')[0]).toMatchObject({ tipo: 'no-soportado', codigo: 'literal-octal-no-soportado' });
    expect(tokenizar('010.5')[0]).toMatchObject({ tipo: 'doble', valorDoble: 10.5 });
  });
});

// Tarea 1.36 (C-1 de la verificación final del lote 1): la elipsis `...` de un varargs es UN token (JLS 3.11, `ELLIPSIS` de javac: `accept("...")` en `JavaTokenizer.readToken`),
// de tres puntos ADYACENTES. Antes el léxico no la conocía y el analizador sintáctico leía tres «.» seguidos sin comprobar que estuvieran pegados: `main(String . . . args)` se aceptaba
// (javac: «<identifier> expected») y el programa se «ejecutaría».
describe('tokenizar — la elipsis "..." es UN token de tres puntos adyacentes (JLS 3.11, tarea 1.36)', () => {
  it.each([
    ['String... args', ['String', '...', 'args']],
    ['String ... args', ['String', '...', 'args']],
    ['String...args', ['String', '...', 'args']],
    ['int/* a */... /* b */x', ['int', '...', 'x']],
  ] as const)('"%s" tiene un solo token "..."', (fuente, textos) => {
    expect(tokenizar(fuente).slice(0, -1).map((t) => t.texto)).toEqual(textos);
  });

  it('el token "..." es de puntuación y su rango abarca exactamente los tres puntos', () => {
    const tokens = tokenizar('String... args');
    expect(tokens[1]).toMatchObject({ tipo: 'puntuacion', texto: '...', rango: { inicio: 6, fin: 9 } });
  });

  it.each([
    ['String . . . args', ['String', '.', '.', '.', 'args']],
    ['String.. .args', ['String', '.', '.', '.', 'args']],
    ['String. ..args', ['String', '.', '.', '.', 'args']],
    ['String./**/.. args', ['String', '.', '.', '.', 'args']],
    ['String.. ./**/args', ['String', '.', '.', '.', 'args']],
    ['String.\n.. args', ['String', '.', '.', '.', 'args']],
    ['String.  .  . args', ['String', '.', '.', '.', 'args']],
    ['String.\t.\t. args', ['String', '.', '.', '.', 'args']],
    ['String.. args', ['String', '.', '.', 'args']],
  ] as const)('"%s": tres puntos que NO están pegados siguen siendo puntos sueltos, nunca una elipsis', (fuente, textos) => {
    expect(tokenizar(fuente).slice(0, -1).map((t) => t.texto)).toEqual(textos);
  });

  it.each([
    ['....', ['...', '.']],
    ['.....', ['...', '.', '.']],
    ['......', ['...', '...']],
    ['a....b', ['a', '...', '.', 'b']],
  ] as const)('"%s": se toman tres puntos de izquierda a derecha (el resto son puntos sueltos), como javac', (fuente, textos) => {
    expect(tokenizar(fuente).slice(0, -1).map((t) => t.texto)).toEqual(textos);
  });

  it('un punto de acceso y un decimal con punto inicial no se confunden con la elipsis ("a.b", ".5", "1...x")', () => {
    expect(tokenizar('a.b').slice(0, -1).map((t) => t.texto)).toEqual(['a', '.', 'b']);
    expect(tokenizar('.5')[0]).toMatchObject({ tipo: 'doble', valorDoble: 0.5 });
    // javac lee `1.` como el literal 1.0 (el punto es del número) y la elipsis no se forma con él: quedan dos puntos sueltos.
    expect(tokenizar('1...x').slice(0, -1).map((t) => t.texto)).toEqual(['1.', '.', '.', 'x']);
  });
});

// Tarea 1.36 (W-1 de la verificación final del lote 1): javac (`JavaTokenizer.scanIdent`) SALTA los caracteres ignorables de identificador (`Character.isIdentifierIgnorable`) cuando arma el
// nombre: `int a<U+200B>b = 1; System.out.println(ab);` compila, porque el nombre es `ab`. El léxico los dejaba dentro del nombre y el alumno leía «No existe una variable llamada "ab"» sobre
// un nombre que se ve IGUAL al que declaró (se cuelan al copiar y pegar desde una página, un PDF —el guion blando de fin de renglón— o una app de mensajes). Los 97 puntos de código del
// BMP son los que midió el verificador con javac 17.0.18 sobre todo el plano básico (190 257 programas); la tabla del motor la genera el oráculo (`GenerarIdentificadores.java`).
const rangoDePuntos = (desde: number, hasta: number): number[] => Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
const IGNORABLES_DE_JAVA_17: readonly number[] = [
  ...rangoDePuntos(0x0, 0x8),
  ...rangoDePuntos(0xe, 0x1b),
  ...rangoDePuntos(0x7f, 0x9f),
  0xad,
  ...rangoDePuntos(0x600, 0x605),
  0x61c,
  0x6dd,
  0x70f,
  0x8e2,
  0x180e,
  ...rangoDePuntos(0x200b, 0x200f),
  ...rangoDePuntos(0x202a, 0x202e),
  ...rangoDePuntos(0x2060, 0x2064),
  ...rangoDePuntos(0x2066, 0x206f),
  0xfeff,
  ...rangoDePuntos(0xfff9, 0xfffb),
];
const rotulo = (punto: number): string => `U+${punto.toString(16).toUpperCase().padStart(4, '0')}`;

describe('tokenizar — los caracteres ignorables de identificador no forman parte del nombre (W-1, tarea 1.36, JLS 3.8 / `Character.isIdentifierIgnorable`)', () => {
  it('son 97 puntos de código del plano básico (los que javac 17.0.18 salta dentro de un nombre)', () => {
    expect(IGNORABLES_DE_JAVA_17).toHaveLength(97);
    expect(new Set(IGNORABLES_DE_JAVA_17).size).toBe(97);
  });

  it.each(IGNORABLES_DE_JAVA_17.map((punto) => [rotulo(punto), punto] as const))(
    '«a%s b»: UN identificador de nombre "ab" (el carácter invisible queda dentro del rango, no dentro del nombre)',
    (_rotulo, punto) => {
      const fuente = `a${String.fromCodePoint(punto)}b`;
      const tokens = tokenizar(fuente);
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({ tipo: 'identificador', texto: 'ab', rango: { inicio: 0, fin: 3 } });
    },
  );

  it('con el carácter ignorable al FINAL del nombre sigue siendo el nombre sin él, y el rango lo abarca', () => {
    const tokens = tokenizar('x\u200b = 1');
    expect(tokens[0]).toMatchObject({ tipo: 'identificador', texto: 'x', rango: { inicio: 0, fin: 2 } });
    expect(tokens[1]).toMatchObject({ tipo: 'puntuacion', texto: '=' });
  });

  it('varios seguidos, y de varias clases, se saltan todos: «a<200B><200B>b<00AD>c» es "abc"', () => {
    expect(tokenizar('a\u200b\u200bb\u00adc')[0]).toMatchObject({ tipo: 'identificador', texto: 'abc', rango: { inicio: 0, fin: 6 } });
  });

  it('dentro de una PALABRA CLAVE: «in<200B>t» es la palabra `int` (javac busca la palabra clave con el nombre ya sin ellos)', () => {
    const tokens = tokenizar('in\u200bt x');
    expect(tokens[0]).toMatchObject({ tipo: 'palabra-clave', texto: 'int', rango: { inicio: 0, fin: 4 } });
    expect(tokenizar('pu\u00adblic')[0]).toMatchObject({ tipo: 'palabra-clave', texto: 'public' });
  });

  it('un nombre solo con la letra de inicio y ignorables es esa letra: «x<FEFF><200D>»', () => {
    expect(tokenizar('x\ufeff\u200d')[0]).toMatchObject({ tipo: 'identificador', texto: 'x', rango: { inicio: 0, fin: 3 } });
  });

  it('el ignorable NO puede abrir un nombre: javac lo rechaza donde empieza un token («illegal character»), y el léxico también', () => {
    for (const punto of [0x200b, 0x00ad, 0xfeff, 0x7f, 0x85]) {
      expect(() => tokenizar(`${String.fromCodePoint(punto)}x`), rotulo(punto)).toThrow(ErrorDeCompilacion);
    }
  });

  it.each([0x00a0, 0x2003, 0x3000, 0x2028, 0x000b])(
    'control: %s (un espacio raro, NO ignorable) no se salta ni dentro de un nombre: «a<c>b» es un error, como en javac',
    (punto) => {
      expect(() => tokenizar(`a${String.fromCodePoint(punto)}b`), rotulo(punto)).toThrow(ErrorDeCompilacion);
    },
  );

  it('los caracteres de FUERA del plano básico de la misma categoría (`U+E0001`) javac los toma como parte del nombre, no los salta', () => {
    const fuente = `a${String.fromCodePoint(0xe0001)}b`;
    expect(tokenizar(fuente)[0]).toMatchObject({ tipo: 'identificador', texto: fuente, rango: { inicio: 0, fin: 4 } });
  });

  it('regresión: un identificador normal, con letras Unicode y con dígitos, no cambia', () => {
    expect(tokenizar('año2')[0]).toMatchObject({ tipo: 'identificador', texto: 'año2', rango: { inicio: 0, fin: 4 } });
    expect(tokenizar('x_1$y')[0]).toMatchObject({ tipo: 'identificador', texto: 'x_1$y' });
  });
});

// Tarea 1.36 (W-2b de la verificación final del lote 1, JLS 3.5): el `U+001A` (Ctrl-Z, el fin de archivo de MS-DOS) en el lugar donde empezaría un token es el FIN DE LA ENTRADA para javac: lo
// que sigue no se lee. Medido con javac 17.0.18: al final del archivo (compila), al principio (compila: un archivo vacío), entre dos tokens de `main` (`reached end of file while parsing`) y seguido
// de basura (compila). Dentro de un identificador se salta (es un ignorable más); dentro de un comentario, una cadena o un `char` es un carácter cualquiera.
describe('tokenizar — el U+001A donde empieza un token es el fin de la entrada (W-2b, tarea 1.36, JLS 3.5)', () => {
  const SUB = '\u001a';

  it('al final del archivo: no es un «carácter no reconocido», la entrada simplemente termina', () => {
    expect(tokenizar(`class C { }\n${SUB}`).map((t) => t.texto)).toEqual(['class', 'C', '{', '}', '']);
    expect(tokenizar(`class C { }${SUB}`).map((t) => t.texto)).toEqual(['class', 'C', '{', '}', '']);
  });

  it('lo que sigue al U+001A no se lee: ni basura, ni otra clase', () => {
    expect(tokenizar(`class C { }${SUB} esto no es java @@@`).map((t) => t.texto)).toEqual(['class', 'C', '{', '}', '']);
    expect(tokenizar(`class C { }${SUB}class D { }`).map((t) => t.texto)).toEqual(['class', 'C', '{', '}', '']);
  });

  it('al PRINCIPIO del archivo, o solo: no hay ningún token', () => {
    expect(tokenizar(SUB).map((t) => t.texto)).toEqual(['']);
    expect(tokenizar(`${SUB}class C { }`).map((t) => t.texto)).toEqual(['']);
  });

  it('el token de fin de archivo queda donde estaba el U+001A', () => {
    const tokens = tokenizar(`int x;${SUB}`);
    expect(tokens.at(-1)).toMatchObject({ tipo: 'eof', rango: { inicio: 6, fin: 6 } });
  });

  it('dentro de un identificador se salta (ignorable): «a<SUB>b» es "ab", y «a<SUB>» al final también', () => {
    expect(tokenizar(`a${SUB}b`)[0]).toMatchObject({ tipo: 'identificador', texto: 'ab' });
    expect(tokenizar(`a${SUB}`)[0]).toMatchObject({ tipo: 'identificador', texto: 'a' });
  });

  it('dentro de un comentario, una cadena o un `char` es un carácter más: no termina nada', () => {
    expect(tokenizar(`// uno${SUB}dos\nx`).map((t) => t.texto)).toEqual(['x', '']);
    expect(tokenizar(`/* uno${SUB}dos */ x`).map((t) => t.texto)).toEqual(['x', '']);
    expect(tokenizar(`"a${SUB}b"`)[0]).toMatchObject({ tipo: 'cadena', valor: `a${SUB}b` });
    expect(tokenizar(`'${SUB}'`)[0]).toMatchObject({ tipo: 'caracter', valorCaracter: SUB });
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

  // Tarea 1.36 (W-1): esta prueba afirmaba que el nombre CONSERVA el carácter ignorable (`texto: 'a\u200db'`). Contra javac 17.0.18 real era falso: `JavaTokenizer.scanIdent` lo SALTA y el nombre es
  // `ab` (la variable `ab` declarada sin el carácter invisible existe para javac y daba «no existe una variable» aquí). Cabe dentro del identificador (no lo corta), no lo inicia y no forma su nombre.
  it('un carácter ignorable (U+200D, unión de ancho cero) cabe DENTRO de un identificador para javac (no lo corta) pero no forma su nombre, y no lo inicia', () => {
    expect(tokenizar('a\u200db')[0]).toMatchObject({ tipo: 'identificador', texto: 'ab', rango: { inicio: 0, fin: 3 } });
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

// ---- Tarea 1.35 (JLS 3.3, WARNING 3 y un falso acepto hallado al revisar los escapes) ----
//
// javac traduce los escapes Unicode en TODO el archivo antes de leerlo: comentarios y cadenas incluidos. Dos consecuencias que el léxico no cumplía:
//  1. Un `\u` que no va seguido de cuatro dígitos hexadecimales es un error (`illegal unicode escape`) también dentro de un comentario: `// ver C:\users\juan` NO compila
//     (la `\u` de `\users`). Aquí un comentario con un `\u` mal formado se ignoraba en silencio: era un falso ACEPTO.
//  2. Una barra invertida solo puede empezar un escape si la preceden un número PAR de barras seguidas: `// C:\\users` (dos barras) es un comentario normal y compila.
// Las fuentes se arman con `B` (una barra real) para que ningún `\u` aparezca en este archivo de prueba.
describe('tokenizar — un escape Unicode mal formado es un error también dentro de un comentario (tarea 1.35, JLS 3.3)', () => {
  const B = '\\'; // una barra invertida real

  it.each([
    ['un comentario de línea con una ruta de Windows', `// ver C:${B}users${B}juan`],
    ['un comentario de bloque con dos dígitos', `int x = 1; /* ${B}u00 */`],
    ['un comentario con un dígito que no es hexadecimal', `// ${B}u12G4`],
    ['una `u` repetida sin dígitos', `// ${B}uu`],
  ])('%s lanza ErrorDeCompilacion (javac: illegal unicode escape)', (_descripcion, fuente) => {
    expect(() => tokenizar(fuente)).toThrow(ErrorDeCompilacion);
  });

  it('el error señala la `\\u` mal formada, no el principio del comentario', () => {
    const fuente = `int x = 1;\n// ruta C:${B}users`;
    try {
      tokenizar(fuente);
      throw new Error('se esperaba un ErrorDeCompilacion');
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorDeCompilacion);
      const rango = (error as ErrorDeCompilacion).rango;
      expect(fuente.slice(rango.inicio, rango.inicio + 2)).toBe(`${B}u`);
    }
  });

  it('control: con un número PAR de barras la `u` no empieza un escape y el comentario es normal (sin error ni token)', () => {
    expect(tokenizar(`// C:${B}${B}users${B}${B}juan`).some((t) => t.tipo === 'no-soportado')).toBe(false);
    expect(tokenizar(`/* ${B}${B}u0041 */ int x;`).some((t) => t.tipo === 'no-soportado')).toBe(false);
  });

  it('control: con un número IMPAR (tres) de barras la última sí empieza un escape bien formado: aviso, no error', () => {
    const tokens = tokenizar(`// ${B}${B}${B}u0041`);
    expect(tokens.filter((t) => t.codigo === 'escape-unicode-no-soportado')).toHaveLength(1);
  });

  it('control: un escape bien formado en un comentario sigue siendo el aviso de siempre, y el token dice que está en un comentario', () => {
    const enComentario = tokenizar(`int x; // ${B}u0041`).find((t) => t.codigo === 'escape-unicode-no-soportado');
    expect(enComentario).toMatchObject({ tipo: 'no-soportado', enComentario: true });
    const enCodigo = tokenizar(`class ${B}u0041 { }`).find((t) => t.codigo === 'escape-unicode-no-soportado');
    expect(enCodigo?.enComentario).not.toBe(true);
  });
});

// ---- Tarea 1.33 (V y N2): qué es una palabra reservada y qué no ----
//
// JLS 3.9: `var` (tipo reservado, Java 10) y `yield` (identificador restringido, Java 14) NO son palabras clave del léxico: son
// identificadores que el PARSER trata de forma especial según el lugar (`var x = 5;`, `yield 5;`). Como nombre de variable valen:
// `int var;` y `double yield;` compilan con javac 17 (V, falsos rechazos antes de esta tarea). Al revés, 15 de las 54 palabras
// reservadas (las palabras clave, `_` y los literales `true`/`false`/`null`) se lexeaban como identificadores (`abstract`, `const`,
// `enum`, `extends`, `goto`, `implements`, `interface`, `native`, `private`, `protected`, `strictfp`, `synchronized`, `transient`,
// `volatile` y `_`), así que `int native;` se aceptaba (N2, falsos aceptos). La lista completa NO se escribe de memoria: sale de
// `Tokens.TokenKind` de javac, generada por el oráculo (`palabras-reservadas-java.generado.ts`); estas pruebas usan la tabla de
// `pruebas/compilacion/tablas-lexicas.ts`, que `herramientas/oraculo/tablas-lexicas.test.ts` cruza con el JDK real.
describe('tokenizar — var, yield y las demás palabras contextuales son identificadores (V)', () => {
  it.each(['var', 'yield', 'record', 'sealed', 'permits', 'non', 'module', 'open', 'opens', 'requires', 'transitive', 'exports', 'to', 'uses', 'provides', 'with'])(
    '«%s» es un identificador (vale como nombre de variable)',
    (palabra) => {
      expect(tokenizar(palabra)[0]).toMatchObject({ tipo: 'identificador', texto: palabra });
    },
  );
});

describe('tokenizar — las 15 palabras reservadas que se lexeaban como identificador (N2)', () => {
  it.each(['abstract', 'const', 'enum', 'extends', 'goto', 'implements', 'interface', 'native', 'private', 'protected', 'strictfp', 'synchronized', 'transient', 'volatile', '_'])(
    '«%s» es una palabra-clave',
    (palabra) => {
      expect(tokenizar(palabra)[0]).toMatchObject({ tipo: 'palabra-clave', texto: palabra });
    },
  );

  it('`_` SOLA es reservada (Java 9), pero `__`, `_x`, `x_` y `$_` son identificadores', () => {
    for (const nombre of ['__', '_x', 'x_', '$_', '_1']) expect(tokenizar(nombre)[0], nombre).toMatchObject({ tipo: 'identificador', texto: nombre });
  });

  it('nombres que CONTIENEN una palabra reservada son identificadores (nativo, enumerado, extendsAlgo, Native, goto1, $goto)', () => {
    for (const nombre of ['nativo', 'enumerado', 'extendsAlgo', 'Native', 'Enum', 'goto1', '$goto', 'privateX', 'xprivate']) {
      expect(tokenizar(nombre)[0], nombre).toMatchObject({ tipo: 'identificador' });
    }
  });
});

describe('tokenizar — un literal con un guion bajo mal puesto es un error del léxico (N3)', () => {
  it('`int t = 1_;` lanza el error de guion bajo, con el rango del literal', () => {
    const fuente = 'int t = 1_;';
    try {
      tokenizar(fuente);
      expect.unreachable('debía lanzar');
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorDeCompilacion);
      expect((error as ErrorDeCompilacion).conDatos).toEqual({ codigo: 'guion-bajo-mal-puesto', datos: { numero: '1_' } });
      expect((error as ErrorDeCompilacion).rango).toEqual({ inicio: 8, fin: 10 });
    }
  });

  it('un flotante hexadecimal es UN token no-soportado (no `0x1`, `p3`…)', () => {
    const tokens = tokenizar('double a = 0x1p3;');
    expect(tokens.map((t) => t.texto)).toEqual(['double', 'a', '=', '0x1p3', ';', '']);
    expect(tokens[3]).toMatchObject({ tipo: 'no-soportado', codigo: 'literal-hexadecimal-no-soportado' });
  });
});

