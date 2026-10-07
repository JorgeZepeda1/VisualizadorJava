// Tope conservador de tamaño de un programa (tarea 1.36, C-4b y S-1 de la verificación final del lote 1). javac rechaza un método de más de 65 535 bytes de bytecode (`compiler.err.limit.code`,
// «code too large»): unas 8 200 sentencias `System.out.println("x");` en `main`. El motor no genera bytecode y NO modela ese tamaño (decisión del PO: sería reimplementar el generador de código de
// javac); en su lugar pone un tope en lo único que sí sabe contar, los elementos (tokens) del programa, y da un aviso honesto cuando se pasa: «programa demasiado grande para este visualizador».
//
// De dónde sale el número (medido con javac 17.0.18 real, `scratchpad` de la 1.36 y `tasks.md`): se buscó, por cada construcción densa del subconjunto, con cuántos tokens javac da `limit.code`.
//   - la más densa es un `switch` sobre `String`: cada `case "x":` (3 tokens) compila a ≈ 34 bytes (la búsqueda por `hashCode`, la comparación con `equals` y el segundo `switch`), así que
//     con unas 1 950 etiquetas vacías (≈ 5 800 tokens) javac se pasa; con 1 900 todavía compila;
//   - el siguiente es `System.out.printf("%d", n1, n2, …)` con miles de argumentos (cada uno se empaqueta en un arreglo: ≈ 5 bytes por token): se pasa con ≈ 11 000 tokens;
//   - el resto —sentencias `println` (≈ 73 800 tokens), sumas y concatenaciones, `long`/`double`, más de 255 variables locales, comparaciones, `char`, booleanos— necesita más de 28 000.
// 4 000 deja un margen de 1,4 veces por debajo de lo MÁS denso (4 000 tokens × 11,2 bytes = 44 800 < 65 535) y es más de 4 veces el programa más grande del corpus del curso (881 tokens; los programas
// del curso llegan a 266). Un programa más grande que esto no es un programa de clase: el aviso dice que está fuera de lo que el visualizador revisa, nunca que Java lo rechace o lo acepte.
//
// El tope se revisa justo después del léxico (que es lineal) y ANTES del análisis sintáctico y de las pasadas semánticas: así también acota el costo de las pasadas que crecen como n² con las
// declaraciones locales de un mismo bloque (`Alcance`; con el tope, 800 declaraciones cuestan 15 ms, en vez de los 11 s de las 20 000 que antes se aceptaban).
import type { Rango } from './fuente/rango.ts';
import type { Token } from './lexico/tokens.ts';

export const MAXIMO_DE_TOKENS_DE_UN_PROGRAMA = 4_000;

// Topes de anidamiento (tarea 1.37, W-12 de la verificación del delta del lote 1). El tope de tokens NO acota la profundidad: 4 000 tokens caben en un árbol de 2 000 niveles. El analizador es recursivo
// y todas las pasadas que siguen recorren el árbol con recursión, así que una forma muy anidada agotaba la pila y la pantalla decía «Algo falló dentro del visualizador». Son DOS topes porque la pila se
// agota por dos motivos distintos, a distinto costo por nivel, y no a la vez (el analizador termina y libera su pila antes de que corra la primera pasada):
//   - `niveles`: la RECURSIÓN del analizador (un paréntesis dentro de otro, una instrucción dentro de otra, un operador prefijo o un cast sobre otro, un argumento dentro de una llamada…);
//   - `arbol`: la PROFUNDIDAD del árbol resultante, que recorren con recursión todas las pasadas. Una cadena de `&&` o de `+` la arma el analizador con un lazo (sin recursión) y es un árbol de tantos
//     niveles como operadores.
export interface LimitesDeAnidamiento {
  readonly niveles: number;
  readonly arbol: number;
}

export const MAXIMO_DE_NIVELES_DE_ANIDAMIENTO = 100;
export const MAXIMO_DE_PROFUNDIDAD_DEL_ARBOL = 200;

export const LIMITES_DE_ANIDAMIENTO: LimitesDeAnidamiento = { niveles: MAXIMO_DE_NIVELES_DE_ANIDAMIENTO, arbol: MAXIMO_DE_PROFUNDIDAD_DEL_ARBOL };

/** Sin tope: lo usan las pruebas para armar árboles hondos y medirlos o para ejercitar una pasada por separado con un programa que `compilar()` no deja pasar. Nunca el producto. */
export const SIN_LIMITES_DE_ANIDAMIENTO: LimitesDeAnidamiento = { niveles: Number.POSITIVE_INFINITY, arbol: Number.POSITIVE_INFINITY };

/**
 * El programa tiene más niveles de anidamiento que `MAXIMO_DE_NIVELES_DE_ANIDAMIENTO` (paréntesis dentro de paréntesis, instrucciones dentro de instrucciones, cadenas larguísimas de operadores…).
 * No es un error del alumno ni de Java —javac lo compila— sino un límite honesto de este visualizador: `compilador.ts` lo traduce al aviso `programa-demasiado-anidado`, nunca a `error-compilacion`.
 * `rango` es donde se pasó (el primer elemento del nivel de más).
 */
export class ProgramaDemasiadoAnidado extends Error {
  readonly rango: Rango;

  constructor(rango: Rango) {
    super('el programa tiene demasiados niveles de anidamiento');
    this.name = 'ProgramaDemasiadoAnidado';
    this.rango = rango;
  }
}

/**
 * El primer token (de código, sin contar el de fin de archivo) que hace que el programa pase de `MAXIMO_DE_TOKENS_DE_UN_PROGRAMA`, o `null` si cabe. Con él se señala la línea donde el programa «se pasó».
 * Pura.
 */
export function primerTokenFueraDelLimite(tokens: readonly Token[]): Token | null {
  const token = tokens[MAXIMO_DE_TOKENS_DE_UN_PROGRAMA];
  return token === undefined || token.tipo === 'eof' ? null : token;
}
