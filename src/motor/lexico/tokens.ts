// Tipos de token (design.md §1.2, §2.6). Catálogo COMPLETO desde la tarea 1.1: además de la
// gramática mínima de la rebanada vertical (0.12), incluye literales numéricos con su valor
// decodificado, literal char, y el tipo 'no-soportado' para construcciones léxicas que Java sí
// acepta pero este visualizador todavía no (ADR 003) — el analizador sintáctico decide con ellos
// (lote 1.6+) sin que el lexer aborte el análisis.
import type { Rango } from '../fuente/rango.ts';

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
  readonly codigo?: string;
  readonly nota?: string;
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
