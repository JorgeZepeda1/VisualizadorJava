// Tipos de token (design.md §1.2, §2.6). Catálogo COMPLETO desde la tarea 1.1: además de la
// gramática mínima de la rebanada vertical (0.12), incluye literales numéricos con su valor
// decodificado, literal char, y el tipo 'no-soportado' para construcciones léxicas que Java sí
// acepta pero este visualizador todavía no (ADR 003) — el analizador sintáctico decide con ellos
// (lote 1.6+) sin que el lexer aborte el análisis.
import type { Rango } from '../fuente/rango.ts';
// Tarea 1.24: unión CERRADA de códigos "no soportado" (única fuente de verdad, `motor/no-soportado.ts`).
import type { CodigoNoSoportado } from '../no-soportado.ts';

export type TipoToken =
  | 'identificador'
  | 'palabra-clave'
  | 'entero'
  | 'largo'
  | 'doble'
  | 'caracter'
  | 'cadena'
  | 'puntuacion'
  | 'no-soportado'
  | 'eof';

export interface Token {
  readonly tipo: TipoToken;
  readonly texto: string;
  /** Solo para `tipo: 'cadena'`: el valor ya decodificado (sin comillas ni escapes). */
  readonly valor?: string;
  /** Solo para `tipo: 'entero' | 'largo'`: la magnitud exacta (el signo lo aplica el parser). */
  readonly valorEntero?: bigint;
  /** Solo para `tipo: 'doble'`. */
  readonly valorDoble?: number;
  /** Solo para `tipo: 'caracter'`: el único carácter ya decodificado. */
  readonly valorCaracter?: string;
  /** Solo para `tipo: 'no-soportado'`: qué construcción es y la nota explicativa (ADR 003). */
  readonly codigo?: CodigoNoSoportado;
  readonly nota?: string;
  /** Tarea 1.25: solo para `tipo: 'no-soportado'` — los datos EXTRA que el texto es-MX de `codigo`
   * necesita (p. ej. el literal real de un octal). Se copia TAL CUAL de `NoSoportadoLexico.datos`
   * (`literales.ts`), ya verificado ahí contra `DatosPorCodigoNoSoportado` — por eso, a diferencia
   * de `NoSoportadoLexico`, este campo sigue siendo `Record<string, unknown>` sin re-verificar:
   * copiar un valor ya construido no necesita repetir la verificación (mismo patrón que
   * `NoSoportadoColectado.datos`, sintaxis/no-soportado.ts). */
  readonly datos?: Readonly<Record<string, unknown>>;
  readonly rango: Rango;
}

// Palabras reservadas de Java reconocidas por el subconjunto hasta la tarea 1.4 (léxico + núcleo
// del programa + expresiones + ambigüedades). El resto del catálogo de Java (if/while/for/switch/
// try/catch/var/…) llega con las tareas que las necesitan (1.5, 1.6). `main`, `String`, `System`,
// `out`, `println`, `Scanner`, `Random` NO son palabras reservadas de Java (son identificadores
// comunes) — el analizador sintáctico exige su texto exacto donde corresponde.
export const PALABRAS_CLAVE: ReadonlySet<string> = new Set([
  'public',
  'class',
  'static',
  'final',
  'void',
  'import',
  'package',
  'return',
  'int',
  'long',
  'double',
  'boolean',
  'char',
  'true',
  'false',
  'instanceof',
  'new',
  // Tarea 1.5 (Sentencia completa) — control de flujo. Deben ser 'palabra-clave', no
  // 'identificador': de lo contrario "break externo" (etiqueta, tarea 1.6) o cualquier
  // "palabra-reservada identificador" pasaría el chequeo "identificador identificador" de
  // `pareceDeclaracionLocal` y se malinterpretaría como el inicio de una declaración.
  'if',
  'else',
  'while',
  'do',
  'for',
  'switch',
  'case',
  'default',
  'break',
  'continue',
  // Tarea 1.6 (catálogo NO-DISP) — reservadas por la misma razón (no son identificadores válidos
  // en Java real, aunque este subconjunto no interprete lo que introducen).
  'try',
  'catch',
  'finally',
  'throw',
  'throws',
  'var',
  'yield',
  'this',
  'super',
  'null',
  'float',
  'byte',
  'short',
  // Tarea 1.29: `assert` es palabra reservada desde Java 1.4 (`assert x > 0;` es una sentencia, nunca «identificador identificador»).
  'assert',
]);

// Tipos primitivos válidos al inicio de una DeclLocal (design.md §2.3 "Tipo"); `String` no está
// aquí porque no es palabra clave — se reconoce como identificador con ese texto exacto.
export const PALABRAS_CLAVE_TIPO_PRIMITIVO: ReadonlySet<string> = new Set([
  'int',
  'long',
  'double',
  'boolean',
  'char',
]);

export const PUNTUACION: ReadonlySet<string> = new Set([
  '{', '}', '(', ')', '[', ']', ';', '.', ',',
  '+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~', '?', ':',
  // Tarea 1.29: la arroba de las anotaciones (`@Override`, `@SuppressWarnings("resource")`); qué anotación es
  // lo decide `sintaxis/no-soportado.ts` (`consumirAnotaciones`).
  '@',
]);

// Operadores de más de un carácter (design.md §2.4), del MÁS largo al más corto para que el lexer
// haga "maximal munch": p. ej. ">>>=" debe ganarle a ">>>", ">>" y ">". El propio orden de esta
// lista codifica esa prioridad.
export const OPERADORES_MULTICARACTER: readonly string[] = [
  '>>>=',
  '<<=',
  '>>=',
  '>>>',
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '++',
  '--',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '&=',
  '|=',
  '^=',
  '<<',
  '>>',
  '::',
  '->',
];
