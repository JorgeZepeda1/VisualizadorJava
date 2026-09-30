// Tipos de token (design.md §1.2, §2.6). Catálogo COMPLETO desde la tarea 1.1: además de la
// gramática mínima de la rebanada vertical (0.12), incluye literales numéricos con su valor
// decodificado, literal char, y el tipo 'no-soportado' para construcciones léxicas que Java sí
// acepta pero este visualizador todavía no (ADR 003) — el analizador sintáctico decide con ellos
// (lote 1.6+) sin que el lexer aborte el análisis.
import type { Rango } from '../fuente/rango.ts';
// Tarea 1.24: unión CERRADA de códigos "no soportado" (única fuente de verdad, `motor/no-soportado.ts`).
import type { CodigoNoSoportado } from '../no-soportado.ts';
// Tarea 1.33: las 54 palabras reservadas, generadas por el oráculo desde `Tokens.TokenKind` de javac 17 (mismo patrón que `identificadores-java.generado.ts`).
import { PALABRAS_RESERVADAS_JAVA } from '../biblioteca/datos/palabras-reservadas-java.generado.ts';

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

// Palabras reservadas de Java (tarea 1.33): las 54 que javac 17 no deja usar como nombre, en su forma EXACTA. La lista no se escribe a
// mano ni de memoria: la genera el oráculo leyendo `Tokens.TokenKind` del JDK real (`herramientas/oraculo/java/GenerarPalabrasReservadas.java`,
// `npm run oraculo:datos`) y `herramientas/oraculo/generar-datos.test.ts` comprueba con javac que cada una se rechaza como nombre de variable.
// Antes de la 1.33 aquí solo estaban las que el subconjunto U3–U7 usa, y 15 de las 54 (`_`, `abstract`, `const`, `enum`, `extends`, `goto`,
// `implements`, `interface`, `native`, `private`, `protected`, `strictfp`, `synchronized`, `transient`, `volatile`) se aceptaban como el nombre
// de una variable: falsos aceptos contra javac. `var`, `yield`, `record`, `sealed`, `permits`, `non-sealed` y `when` NO son palabras reservadas
// (JLS 3.9: son identificadores «contextuales» o restringidos): `int var;` y `double yield;` compilan, así que el léxico los entrega como
// `identificador` y es el analizador sintáctico quien decide qué significan en cada lugar (`var` como tipo, `yield` como sentencia).
// `main`, `String`, `System`, `out`, `println`, `Scanner`, `Random` tampoco son palabras reservadas de Java (son identificadores comunes) —
// el analizador sintáctico exige su texto exacto donde corresponde.
export const PALABRAS_CLAVE: ReadonlySet<string> = new Set(PALABRAS_RESERVADAS_JAVA);

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
