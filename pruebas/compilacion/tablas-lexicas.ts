// Tablas de verdad del ANÁLISIS LÉXICO Y SINTÁCTICO de los nombres, los literales numéricos, `yield` y las etiquetas `case` con flecha (tarea 1.33:
// las familias V, N2, N3 y N4 que dejó el generador diferencial de la 1.31). Son DATOS — lo que devolvió javac 17.0.18 (sondas del 2026-09-29
// con `JavacTask` y compilación completa) — y NO se derivan de la regla del motor: son la prueba independiente de esa regla.
//
// Las usan DOS pruebas, para que nunca puedan divergir:
//   - `tablas-lexicas.test.ts` (`npm test`, sin JDK): `compilar()` responde lo mismo que javac en CADA fila, con la línea de javac;
//   - `herramientas/oraculo/tablas-lexicas.test.ts` (`npm run test:oraculo`, con el JDK real): javac sigue diciendo esto mismo, fila por fila, y
//     además un fuzz por mutación de estos literales compara los dos veredictos — si otro JDK cambiara una respuesta, esa prueba lo descubre antes
//     de que el motor se calibre contra un dato viejo.
//
// Cada fila es un programa completo de UNA sentencia en una línea conocida (`LINEA_DEL_LITERAL`, `LINEA_DEL_NOMBRE`, `LINEA_DE_YIELD`,
// `LINEA_DEL_CASE`), así la línea de javac se compara sin recurrir a un `.errores`.

// ---- Literales numéricos (JLS 3.10.1 y 3.10.2) ----

/** La clase de un literal ACEPTADO por javac y, con ella, lo que el visualizador responde (`CODIGO_POR_CLASE_DE_LITERAL`). */
export type ClaseDeLiteral = 'decimal' | 'largo' | 'doble' | 'float' | 'octal' | 'hexadecimal' | 'binario' | 'hexadecimal-flotante';

export interface LiteralAceptado {
  readonly texto: string;
  readonly clase: ClaseDeLiteral;
}

export interface LiteralRechazado {
  readonly texto: string;
  /** La clave del PRIMER error de javac (`Diagnostic#getCode()`). */
  readonly codigoJavac: string;
}

const CLASES_Y_LITERALES: Readonly<Record<ClaseDeLiteral, readonly string[]>> = {
  decimal: ['0', '1', '10', '1_0', '1__0', '1_0_0', '1_000_000', '2147483647'],
  largo: ['1L', '1l', '0L', '100_000L', '9223372036854775807L', '1__0L'],
  doble: [
    '1.5', '1.', '.5', '1_0.5_0', '1e1', '1E+1_0', '1e-1', '1.5e1_0', '1d', '1D', '1.5d', '.5e1', '3_1.4_1e+1_0', '1_0d', '0.0', '0e0', '09.5', '09e1', '07.5',
    '0.', '00.5', '1e1d', '1__0.0__1',
  ],
  float: ['1f', '1F', '1.5f', '1e1f', '.5f', '1_0f', '09f', '0f'],
  octal: ['0_7', '00', '07', '0__7', '017', '07L', '0777L', '0_7_7', '01_0'],
  hexadecimal: ['0x0', '0x1F', '0X1f', '0xF_F', '0x1_0', '0xFFL', '0x7fffffff', '0x1__0', '0xF_FL'],
  binario: ['0b0', '0b1', '0B101', '0b1_0', '0b1L', '0b1__0'],
  'hexadecimal-flotante': [
    '0x1p3', '0x1P3', '0x1p+3', '0x1p-3', '0x1.8p1', '0x.8p0', '0X1P-2', '0x1p3d', '0x1p3f', '0x1p3D', '0x1p3F', '0xA.Bp1', '0x1.p3', '0x1_0p1_0', '0x1.f_fp1',
    '0x1p0', '0x0p0', '0x1.0p1',
  ],
};

/** Los literales que javac ACEPTA (`double x = <literal>;` compila con todos: cada tipo numérico se ensancha a `double`). */
export const LITERALES_ACEPTADOS: readonly LiteralAceptado[] = (Object.entries(CLASES_Y_LITERALES) as [ClaseDeLiteral, readonly string[]][]).flatMap(
  ([clase, textos]) => textos.map((texto) => ({ texto, clase })),
);

const ILEGAL = 'compiler.err.illegal.underscore';
const HEX_INVALIDO = 'compiler.err.invalid.hex.number';
const BINARIO_INVALIDO = 'compiler.err.invalid.binary.number';
const FLOTANTE_MAL_FORMADO = 'compiler.err.malformed.fp.lit';

/**
 * Los literales que javac RECHAZA, con la clave de su primer error: un guion bajo mal puesto (JLS 3.10.1: solo va ENTRE dos dígitos; no abre ni
 * cierra una racha de dígitos, ni va tras `0x`/`0b`, junto al punto, antes o después de `e`/`p` y de su signo, ni antes del sufijo `L`/`f`/`d`) y
 * los literales mal formados (`0x` sin dígitos, un hexadecimal con punto y sin exponente, un exponente sin dígitos).
 */
export const LITERALES_RECHAZADOS: readonly LiteralRechazado[] = [
  ...['1_', '1__', '1_L', '1__L', '1_.0', '1._0', '1_e1', '1e_1', '1e1_', '1.0_', '1_f', '1_d', '1.5_', '1_.', '1._', '0_', '07_', '.5_', '0x_1', '0x1_', '0x1__', '0b_1', '0b1_',
    '0x1_L', '1e+_1', '1e-1_', '0x1p_3', '0x1p3_', '0x1_p3', '0x1._8p1', '0x1.8_p1', '0_8', '0_9', '0b1__', '0x_', '1__e1', '1e+1__'].map((texto) => ({ texto, codigoJavac: ILEGAL })),
  ...['0x', '0X', '0x.', '0x.p1', '0xg'].map((texto) => ({ texto, codigoJavac: HEX_INVALIDO })),
  ...['0b', '0B', '0b2', '0b9'].map((texto) => ({ texto, codigoJavac: BINARIO_INVALIDO })),
  ...['0x1.8', '0x1.', '0x1p', '0x1p+', '0x1p-', '0x1.8p', '1e', '1e+', '1E-', '1.5e'].map((texto) => ({ texto, codigoJavac: FLOTANTE_MAL_FORMADO })),
  // `0b12` es el literal `0b1` y un `2` suelto: javac pide el «;» que falta.
  { texto: '0b12', codigoJavac: 'compiler.err.expected' },
];

/** El código con que `compilar()` responde a un literal que javac acepta: los decimales llegan hasta el hueco de la IR; los demás son un aviso. */
export const CODIGO_POR_CLASE_DE_LITERAL: Readonly<Record<ClaseDeLiteral, string>> = {
  decimal: 'ejecucion-no-disponible',
  largo: 'ejecucion-no-disponible',
  doble: 'ejecucion-no-disponible',
  float: 'literal-float-no-soportado',
  octal: 'literal-octal-no-soportado',
  hexadecimal: 'literal-hexadecimal-no-soportado',
  binario: 'literal-binario-no-soportado',
  'hexadecimal-flotante': 'literal-hexadecimal-no-soportado',
};

/** La línea (de 1) del literal dentro de `programaConLiteral`. */
export const LINEA_DEL_LITERAL = 3;

export function programaConLiteral(literal: string): string {
  return ['public class P {', '    public static void main(String[] args) {', `        double x = ${literal};`, '    }', '}', ''].join('\n');
}

export const CLAVE_DE_GUION_BAJO_ILEGAL = ILEGAL;

// ---- Nombres: palabras reservadas e identificadores contextuales (JLS 3.8, 3.9) ----

/**
 * Las 54 palabras que javac 17 no deja usar como NOMBRE: los 50 `TokenKind` alfabéticos (`abstract` … `while`, incluidas `const` y `goto`), `_` (desde
 * Java 9) y los tres literales `true`, `false` y `null`. Es la lista que el oráculo leyó de `Tokens.TokenKind` (`npm run oraculo:datos`); la prueba sin JDK
 * comprueba que es la misma que usa el analizador léxico, y la de JDK que cada una se rechaza como nombre en los cinco contextos de `CONTEXTOS_DE_NOMBRE`.
 */
export const PALABRAS_RESERVADAS_DE_JAVA: readonly string[] = [
  '_', 'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends',
  'false', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'null', 'package',
  'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'true', 'try',
  'void', 'volatile', 'while',
];

/**
 * Los identificadores «contextuales» o restringidos de JLS 3.9: NO son palabras reservadas, así que valen como nombre de variable (`int var;`,
 * `double yield;`). `non` es el primer trozo de `non-sealed`; `when` es contextual en Java 21 y en 17 es un identificador cualquiera.
 */
export const IDENTIFICADORES_CONTEXTUALES: readonly string[] = [
  'var', 'yield', 'record', 'sealed', 'permits', 'non', 'module', 'open', 'opens', 'requires', 'transitive', 'exports', 'to', 'uses', 'provides', 'with', 'when',
];

/** Los cinco que un TIPO no puede llamarse (`public class var`: javac `restricted.type.not.allowed`); el resto de los contextuales sí puede ser una clase. */
export const NOMBRES_DE_CLASE_RESTRINGIDOS: readonly string[] = ['var', 'yield', 'record', 'sealed', 'permits'];

export const CONTEXTOS_DE_NOMBRE = ['local', 'con-inicializador', 'segundo-declarador', 'tipo-de-referencia', 'ciclo-for'] as const;
export type ContextoDeNombre = (typeof CONTEXTOS_DE_NOMBRE)[number];

const SENTENCIA_DE_NOMBRE: Readonly<Record<ContextoDeNombre, (nombre: string) => string>> = {
  local: (nombre) => `int ${nombre};`,
  'con-inicializador': (nombre) => `int ${nombre} = 1;`,
  'segundo-declarador': (nombre) => `int a = 1, ${nombre} = 2;`,
  'tipo-de-referencia': (nombre) => `String ${nombre} = "a";`,
  'ciclo-for': (nombre) => `for (int ${nombre} = 0; ${nombre} < 1; ${nombre}++) { }`,
};

/** La línea (de 1) de la sentencia dentro de `programaConNombre`. */
export const LINEA_DEL_NOMBRE = 3;

export function programaConNombre(nombre: string, contexto: ContextoDeNombre): string {
  return ['public class P {', '    public static void main(String[] args) {', `        ${SENTENCIA_DE_NOMBRE[contexto](nombre)}`, '    }', '}', ''].join('\n');
}

/** El nombre de la clase está en la línea 1 de `programaConClase`. */
export const LINEA_DE_LA_CLASE = 1;

export function programaConClase(nombre: string): string {
  return [`public class ${nombre} {`, '    public static void main(String[] args) {', '    }', '}', ''].join('\n');
}

// ---- `yield`: ¿la sentencia o una variable llamada `yield`? (JavacParser.blockStatement) ----

export interface FormaDeYield {
  /** La sentencia, con `yield` declarado antes como `int yield = 0;`. */
  readonly cuerpo: string;
  /** `true`: javac la lee como la sentencia `yield` (fuera de un `switch` usado como expresión es un error de javac, y el visualizador avisa). */
  readonly esSentencia: boolean;
  /** La clave del primer error de javac, o `null` si el programa compila. */
  readonly codigoJavac: string | null;
}

const NO_HAY_SWITCH = 'compiler.err.no.switch.expression';

export const FORMAS_DE_YIELD: readonly FormaDeYield[] = [
  // Una variable llamada `yield`: javac la lee como expresión (compila, salvo las que fallan por su tipo o por ser una llamada sin calificar).
  ...['yield = 5;', 'yield++;', 'yield--;', 'yield += 3;', 'yield -= 1;', 'yield *= 2;', 'yield /= 2;', 'yield %= 2;', 'yield <<= 1;', 'yield >>= 1;', 'yield &= 1;', 'yield |= 1;',
    'yield ^= 1;', 'yield = yield + 1;'].map((cuerpo) => ({ cuerpo, esSentencia: false, codigoJavac: null })),
  { cuerpo: 'yield.toString();', esSentencia: false, codigoJavac: 'compiler.err.cant.deref' },
  { cuerpo: 'yield();', esSentencia: false, codigoJavac: 'compiler.err.invalid.yield' },
  { cuerpo: 'yield(1, 2);', esSentencia: false, codigoJavac: 'compiler.err.invalid.yield' },
  { cuerpo: 'yield[0] = 1;', esSentencia: false, codigoJavac: 'compiler.err.array.req.but.found' },
  // La sentencia `yield`: un literal, un nombre, `+`, `-`, `!`, `~`, `null`, `true`, `false`, `new`, `switch`, `this`, `super` o `(` sin comas detrás.
  ...['yield 5;', 'yield yield;', 'yield "a";', "yield 'a';", 'yield 1.5;', 'yield 5L;', 'yield null;', 'yield true;', 'yield false;', 'yield new int[1];', 'yield this;',
    'yield super.hashCode();', 'yield +1;', 'yield -1;', 'yield ++yield;', 'yield --yield;', 'yield !true;', 'yield ~1;', 'yield 0x1F;', 'yield 1.5f;',
    'yield switch (1) { default -> 1; };', 'yield +yield;'].map((cuerpo) => ({ cuerpo, esSentencia: true, codigoJavac: NO_HAY_SWITCH })),
  { cuerpo: 'yield (1);', esSentencia: true, codigoJavac: 'compiler.err.no.switch.expression.qualify' },
  { cuerpo: 'yield (yield + 1);', esSentencia: true, codigoJavac: 'compiler.err.no.switch.expression.qualify' },
  { cuerpo: 'yield;', esSentencia: true, codigoJavac: 'compiler.err.illegal.start.of.expr' },
  { cuerpo: 'yield (1) -> 2;', esSentencia: true, codigoJavac: 'compiler.err.expected' },
];

/** La línea (de 1) de la sentencia dentro de `programaConYield`. */
export const LINEA_DE_YIELD = 4;

export function programaConYield(cuerpo: string): string {
  return ['public class P {', '    public static void main(String[] args) {', '        int yield = 0;', `        ${cuerpo}`, '    }', '}', ''].join('\n');
}

// ---- Etiquetas `case` con flecha: `case s ->` no es una lambda (`term(EXPR | NOLAMBDA)`) ----

export interface EtiquetaDeCase {
  readonly etiqueta: string;
  /** La clave del primer error de javac, o `null` si el programa compila. */
  readonly codigoJavac: string | null;
}

const NO_ES_CONSTANTE = 'compiler.err.const.expr.req';

/**
 * Las etiquetas de un `switch (x)` con `int x`, `final int s = 3;` y `final int K = 1;` declarados antes. Con flecha, TODAS son un aviso de `switch` con
 * flecha en el visualizador (nunca un error de sintaxis: el bug era leer `s ->` como una lambda); que javac acepte o rechace la etiqueta no cambia esa respuesta.
 */
export const ETIQUETAS_DE_CASE: readonly EtiquetaDeCase[] = [
  ...['1', 'K', 's', '(1)', '(K)', 'K + 1', 'K, s', '(K + 1)', '((1))', 'K * 2', '-K', '(s) + (K)', "'a'"].map((etiqueta) => ({ etiqueta, codigoJavac: null })),
  { etiqueta: '1, K', codigoJavac: 'compiler.err.duplicate.case.label' },
  ...['x', '(x)', '1, x', 'x + 1', 'K + x'].map((etiqueta) => ({ etiqueta, codigoJavac: NO_ES_CONSTANTE })),
  ...['"a"', 'true', '1.5', '1L'].map((etiqueta) => ({ etiqueta, codigoJavac: 'compiler.err.prob.found.req' })),
];

/** La línea (de 1) de la etiqueta dentro de `programaConCaseConFlecha`. */
export const LINEA_DEL_CASE = 7;

export function programaConCaseConFlecha(etiqueta: string): string {
  return [
    'public class P {',
    '    public static void main(String[] args) {',
    '        final int s = 3;',
    '        final int K = 1;',
    '        int x = 1;',
    '        switch (x) {',
    `            case ${etiqueta} -> { }`,
    '            default -> { }',
    '        }',
    '    }',
    '}',
    '',
  ].join('\n');
}
