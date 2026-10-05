// Tarea 1.36 (C-4b y S-1 de la verificación final del lote 1): un tope de tamaño del programa, con aviso honesto («programa demasiado grande para este visualizador»), revisado ANTES de las pasadas
// costosas. javac rechaza un método de más de 65 535 bytes de bytecode (`limit.code`: unas 8 200 sentencias `System.out.println("x");` en `main`), y el motor no genera bytecode: no modela ese tamaño, pone un
// tope CONSERVADOR en lo único que sí sabe contar, los elementos (tokens) del programa. El tope sale de una medición con javac 17.0.18 (ver `limites.ts`), y de paso acota el costo de las pasadas que
// crecían como n² con las declaraciones locales de un bloque (S-1: 5 000 declaraciones tardaban 4,6 s y 20 000 pasaban de 60 s).
import { describe, expect, it } from 'vitest';
import { tokenizar } from './lexico/analizador-lexico.ts';
import { MAXIMO_DE_TOKENS_DE_UN_PROGRAMA, primerTokenFueraDelLimite } from './limites.ts';

/** Un programa con EXACTAMENTE `tokens` tokens (sin el de fin de archivo): el encabezado de `main` y tantas sentencias vacías `;` como hagan falta, una por línea. */
function programaConTokens(tokens: number): string {
  const encabezado = 'public class P {\n    public static void main(String[] args) {\n';
  const cierre = '    }\n}\n';
  const fijos = tokenizar(encabezado + cierre).length - 1;
  return encabezado + ';\n'.repeat(tokens - fijos) + cierre;
}

describe('MAXIMO_DE_TOKENS_DE_UN_PROGRAMA — el tope conservador de tamaño', () => {
  it('es mucho mayor que el programa más grande del corpus del curso (881 tokens) y menor que lo que hace falta para pasar el límite de código de javac con la construcción más densa (≈ 5 700)', () => {
    expect(MAXIMO_DE_TOKENS_DE_UN_PROGRAMA).toBeGreaterThanOrEqual(881 * 4);
    expect(MAXIMO_DE_TOKENS_DE_UN_PROGRAMA).toBeLessThan(5_700);
  });
});

describe('primerTokenFueraDelLimite — el primer token que se pasa del tope, o null', () => {
  it('un programa de exactamente el tope de tokens cabe: null', () => {
    expect(primerTokenFueraDelLimite(tokenizar(programaConTokens(MAXIMO_DE_TOKENS_DE_UN_PROGRAMA)))).toBeNull();
  });

  it('con UN token más, el que se pasa es ese token (el siguiente al último que cabía), y trae su posición', () => {
    const fuente = programaConTokens(MAXIMO_DE_TOKENS_DE_UN_PROGRAMA + 1);
    const tokens = tokenizar(fuente);
    const token = primerTokenFueraDelLimite(tokens);
    expect(token).not.toBeNull();
    expect(token).toBe(tokens[MAXIMO_DE_TOKENS_DE_UN_PROGRAMA]);
    // con el tope + 1 tokens exactos, el que se pasa es el ÚLTIMO del programa: la `}` que cierra la clase
    expect(fuente.slice(token!.rango.inicio, token!.rango.fin)).toBe('}');
    expect(token!.rango.fin).toBe(fuente.lastIndexOf('}') + 1);
  });

  it('un programa chico (el del curso) nunca se pasa, y el token de fin de archivo no cuenta', () => {
    expect(primerTokenFueraDelLimite(tokenizar('public class P { public static void main(String[] a) { } }'))).toBeNull();
    expect(primerTokenFueraDelLimite(tokenizar(programaConTokens(MAXIMO_DE_TOKENS_DE_UN_PROGRAMA)))).toBeNull(); // con su `eof` hay TOPE + 1 elementos
  });
});
