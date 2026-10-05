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
import type { Token } from './lexico/tokens.ts';

export const MAXIMO_DE_TOKENS_DE_UN_PROGRAMA = 4_000;

/**
 * El primer token (de código, sin contar el de fin de archivo) que hace que el programa pase de `MAXIMO_DE_TOKENS_DE_UN_PROGRAMA`, o `null` si cabe. Con él se señala la línea donde el programa «se pasó».
 * Pura.
 */
export function primerTokenFueraDelLimite(tokens: readonly Token[]): Token | null {
  const token = tokens[MAXIMO_DE_TOKENS_DE_UN_PROGRAMA];
  return token === undefined || token.tipo === 'eof' ? null : token;
}
