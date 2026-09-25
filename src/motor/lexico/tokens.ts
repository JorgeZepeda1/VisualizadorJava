// Tipos de token de la rebanada vertical (design.md §1.2). El catálogo léxico completo (hex,
// octal, binario, float, bloques de texto, \uXXXX...) llega en la tarea 1.1; aquí solo lo que
// necesita la gramática mínima Programa→Clase→Main→Bloque→println(literal) (design.md §2.3).
// Definición de tipos + constante — sin lógica propia; se ejercita en analizador-lexico.test.ts.
import type { Rango } from '../fuente/rango.ts';

export type TipoToken = 'identificador' | 'palabra-clave' | 'cadena' | 'puntuacion' | 'eof';

export interface Token {
  readonly tipo: TipoToken;
  readonly texto: string;
  /** Solo para `tipo: 'cadena'`: el valor ya decodificado (sin comillas ni escapes). */
  readonly valor?: string;
  readonly rango: Rango;
}

// Palabras reservadas de Java que aparecen en el subconjunto de la rebanada vertical. `main`,
// `String`, `System`, `out`, `println` NO son palabras reservadas de Java (son identificadores
// comunes) — el analizador sintáctico es quien exige su texto exacto donde corresponde.
export const PALABRAS_CLAVE: ReadonlySet<string> = new Set([
  'public',
  'class',
  'static',
  'final',
  'void',
]);

export const PUNTUACION: ReadonlySet<string> = new Set(['{', '}', '(', ')', '[', ']', ';', '.', ',']);
