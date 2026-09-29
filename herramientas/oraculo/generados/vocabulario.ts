// Vocabulario del generador diferencial (tarea 1.31): los tipos, literales, nombres y operadores con que
// se arman los programas. Son DATOS, no lógica: ampliar la cobertura del generador casi siempre es
// agregar una entrada aquí o subir el peso de una plantilla (`plantillas.ts`).

/** Los 8 tipos del subconjunto (design.md §2.7). */
export const TIPOS_DEL_SUBCONJUNTO = ['int', 'long', 'double', 'boolean', 'char', 'String', 'Scanner', 'Random'] as const;
export const PRIMITIVOS = ['int', 'long', 'double', 'boolean', 'char'] as const;
/** Los tipos que tienen literal propio. */
export const TIPOS_DE_VALOR = ['int', 'long', 'double', 'boolean', 'char', 'String'] as const;
export const TIPOS_NUMERICOS = ['int', 'long', 'double', 'char'] as const;
export const TIPOS_ENVOLTORIO = ['Integer', 'Double', 'Character', 'Long', 'Boolean'] as const;
/** Java válido que el subconjunto NO cubre: el compilador debe darles un aviso, nunca un error inventado. */
export const TIPOS_FUERA_DEL_SUBCONJUNTO = ['byte', 'short', 'float'] as const;
/** Los tipos entre los que se castea: todos los del subconjunto y los que lo rodean. */
export const TIPOS_PARA_CAST: readonly string[] = [...TIPOS_DEL_SUBCONJUNTO, ...TIPOS_ENVOLTORIO, 'Object', ...TIPOS_FUERA_DEL_SUBCONJUNTO];
/** Los tipos con que se declara una variable, además de `var`. */
export const TIPOS_DE_DECLARACION: readonly string[] = [...TIPOS_DEL_SUBCONJUNTO, ...TIPOS_ENVOLTORIO, 'Object', ...TIPOS_FUERA_DEL_SUBCONJUNTO];

/** Literales de cada tipo: valores típicos de un ejercicio, y los que rompen una regla (70000 para un char). */
export const LITERALES: Readonly<Record<string, readonly string[]>> = {
  int: ['0', '1', '2', '3', '5', '7', '10', '42', '100', '65', '70000', '-1'],
  long: ['0L', '1L', '5L', '100L', '10000000000L'],
  double: ['0.0', '0.5', '1.5', '2.0', '3.14', '100.25', '1e3'],
  boolean: ['true', 'false'],
  char: ["'a'", "'z'", "'A'", "'0'", "'9'", "' '", "'x'"],
  String: ['""', '"a"', '"hola"', '"123"', '"5"', '"x"', '"3.5"', '"true"'],
  float: ['1.5f', '2f', '0.25f'],
  byte: ['1', '10', '100'],
  short: ['1', '1000', '30000'],
};

/** Nombres de variable de un ejercicio típico. */
export const NOMBRES_COMUNES: readonly string[] = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'w', 'x', 'y', 'z',
  'total', 'suma', 'promedio', 'edad', 'nota', 'flag', 'contador', 'texto', 'valor', 'letra', 'sc', 'rnd',
];

/**
 * Palabras que Java reconoce como palabra clave SOLO en cierto contexto (`var`, `yield`, `record`,
 * `sealed`, `permits`, las de módulo…): en un programa normal siguen siendo nombres válidos de
 * variable, y ahí es donde un analizador que las trata como reservadas rechaza de más.
 */
export const NOMBRES_CONTEXTUALES: readonly string[] = [
  'var', 'yield', 'record', 'sealed', 'permits', 'non', 'module', 'open', 'opens', 'requires', 'transitive', 'exports', 'to', 'uses', 'provides', 'with',
];

/**
 * TODAS las palabras reservadas de Java 17 (JLS 3.9; `_` lo es desde Java 9; `true`, `false` y `null` son
 * literales, y tampoco pueden ser un nombre): como nombre de variable son un error de sintaxis. La lista es
 * completa a propósito: un analizador que reserva unas y otras no (`class` sí, `goto`, `const`, `enum`,
 * `native`, `volatile`… no) solo se ve al probar TODAS.
 */
export const PALABRAS_RESERVADAS: readonly string[] = [
  '_', 'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends',
  'false', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'null', 'package',
  'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'true', 'try',
  'void', 'volatile', 'while',
];

/** Clases del JDK que una variable puede «tapar» (`int Math = 3; Math.abs(2)`): javac prefiere la variable. */
export const CLASES_QUE_UNA_VARIABLE_PUEDE_TAPAR: readonly string[] = ['Math', 'String', 'Integer', 'System', 'Double', 'Character', 'Random', 'Scanner', 'Long', 'Object'];

// Operadores por familia. Cada uno lleva el tipo de resultado que el generador PRETENDE; javac decide.
export const OPERADORES_ARITMETICOS = ['+', '-', '*', '/', '%'] as const;
export const OPERADORES_RELACIONALES = ['<', '>', '<=', '>='] as const;
export const OPERADORES_DE_IGUALDAD = ['==', '!='] as const;
export const OPERADORES_LOGICOS = ['&&', '||'] as const;
export const OPERADORES_DE_BITS = ['&', '|', '^'] as const;
export const OPERADORES_DE_DESPLAZAMIENTO = ['<<', '>>', '>>>'] as const;
export const OPERADORES_DE_ASIGNACION_COMPUESTA = ['+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '>>>='] as const;

/** Miembros que un alumno intenta sobre un valor primitivo (o inventa): casi todos son error. */
export const METODOS_SOBRE_PRIMITIVOS: readonly { readonly texto: string; readonly retorno: string }[] = [
  { texto: 'length()', retorno: 'int' },
  { texto: 'charAt(0)', retorno: 'char' },
  { texto: 'equals(5)', retorno: 'boolean' },
  { texto: 'toString()', retorno: 'String' },
  { texto: 'isEmpty()', retorno: 'boolean' },
  { texto: 'hashCode()', retorno: 'int' },
  { texto: 'compareTo(3)', retorno: 'int' },
  { texto: 'intValue()', retorno: 'int' },
  { texto: 'substring(1)', retorno: 'String' },
  { texto: 'nextInt()', retorno: 'int' },
  { texto: 'foo()', retorno: 'int' },
];
export const CAMPOS_SOBRE_PRIMITIVOS: readonly { readonly texto: string; readonly tipo: string }[] = [
  { texto: 'length', tipo: 'int' },
  { texto: 'MAX_VALUE', tipo: 'int' },
  { texto: 'size', tipo: 'int' },
  { texto: 'x', tipo: 'int' },
];

/**
 * Los métodos que un alumno de U3–U7 usa (la superficie de REQ-SUB-005, por nombre). Sirve para que la
 * mayoría de las llamadas de biblioteca del generador sean del currículo: un método que el subconjunto no
 * cubre hace que el compilador AVISE y no revise el resto del programa, y entonces casi ninguna otra regla
 * se ejerce. No sale del motor a propósito (sus puntos ciegos serían los del compilador vigilado): es lo
 * que dice el requisito. El resto de la API se sigue usando, con menos frecuencia.
 */
export const METODOS_DEL_CURRICULO: Readonly<Record<string, readonly string[]>> = {
  String: ['length', 'charAt', 'substring', 'indexOf', 'equals', 'equalsIgnoreCase', 'compareTo', 'toUpperCase', 'toLowerCase', 'trim', 'isEmpty', 'contains', 'startsWith', 'endsWith', 'replace', 'valueOf'],
  Scanner: ['nextInt', 'nextDouble', 'nextBoolean', 'next', 'nextLine', 'close', 'hasNext', 'hasNextInt'],
  Math: ['abs', 'max', 'min', 'pow', 'sqrt', 'round', 'floor', 'ceil', 'random'],
  Character: ['isDigit', 'isLetter', 'isLetterOrDigit', 'isUpperCase', 'isLowerCase', 'isWhitespace', 'toUpperCase', 'toLowerCase'],
  Integer: ['parseInt', 'valueOf', 'toString'],
  Double: ['parseDouble', 'valueOf', 'toString'],
  Random: ['nextInt', 'nextDouble', 'nextBoolean'],
};

/** Constantes enteras con que se prueba el estrechamiento a `char`, `byte` y `short` (JLS 5.2): dentro y fuera de rango. */
export const CONSTANTES_PARA_ESTRECHAR: readonly string[] = ['0', '1', '65', '100', '127', '128', '200', '255', '256', '1000', '32767', '32768', '65535', '65536', '-1', '-128', '-129'];

/** Un literal de un tipo y si Java lo acepta: los que no, son errores de sintaxis a propósito. */
export interface LiteralRaro {
  readonly tipo: string;
  readonly texto: string;
  readonly valido: boolean;
}

/**
 * Formas de literal que un curso rara vez usa pero que Java acepta (hexadecimal, octal, binario, guiones bajos,
 * escapes Unicode y octales, flotante hexadecimal…) y las que rechaza (guion bajo al final, un 9 en un octal,
 * un entero que no cabe, un carácter con dos símbolos…). Es el terreno del analizador léxico.
 */
export const LITERALES_RAROS: readonly LiteralRaro[] = [
  ...[
    ['int', '0x1F'], ['int', '0x7fffffff'], ['int', '017'], ['int', '00'], ['int', '0b101'], ['int', '1_000'], ['int', '1__0'], ['int', '100_000_000'], ['int', '2147483647'], ['int', '-2147483648'],
    ['long', '0xFFL'], ['long', '1_000L'], ['long', '9223372036854775807L'], ['long', '1l'],
    ['double', '.5'], ['double', '5.'], ['double', '1e3'], ['double', '1E-3'], ['double', '0x1p3'], ['double', '1d'], ['double', '1_0.5_0'], ['double', '0.5e1'],
    ['char', "'\\u0041'"], ['char', "'\\t'"], ['char', "'\\\\'"], ['char', "'\\''"], ['char', "'\\101'"],
    ['String', '"\\"q\\""'], ['String', '"\\u00e9"'], ['String', '"tab\\t"'], ['String', '"a\\\\b"'],
  ].map(([tipo, texto]): LiteralRaro => ({ tipo: tipo!, texto: texto!, valido: true })),
  ...[
    ['int', '09'], ['int', '0x'], ['int', '1_'], ['int', '1__'], ['int', '0b2'], ['int', '3000000000'], ['long', '3000000000'], ['double', '1e'],
    ['char', "'ab'"], ['char', "''"], ['char', "'\\q'"], ['String', '"\\q"'],
  ].map(([tipo, texto]): LiteralRaro => ({ tipo: tipo!, texto: texto!, valido: false })),
];

/** Identificadores válidos poco corrientes: con letras que no son ASCII, con `$` y con `_`. */
export const NOMBRES_EXTRANOS_VALIDOS: readonly string[] = ['año', 'día', 'cañón', '$dinero', '_valor', 'x$', 'π', 'mañana', 'α', 'переменная', '变量'];

/** Nombres que no son identificadores (no son palabras reservadas): empiezan con un dígito, llevan un guion, un espacio… */
export const NOMBRES_INVALIDOS: readonly string[] = ['1a', 'a-b', 'mi variable', 'a+b', '#x'];
