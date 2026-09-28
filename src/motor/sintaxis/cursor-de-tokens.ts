// Cursor de solo lectura sobre la lista de tokens (design.md §1.2). Vivía dentro de
// analizador-sintactico.ts desde la rebanada vertical (0.12); se extrae a su propio archivo en la
// tarea 1.2 porque `expresiones.ts` (Pratt, tarea 1.3) también lo necesita y así se evita un ciclo
// de imports entre los dos módulos de `sintaxis/`.
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';
import type { Token, TipoToken } from '../lexico/tokens.ts';

export class CursorDeTokens {
  private posicion = 0;
  private readonly tokens: readonly Token[];

  // `erasableSyntaxOnly` (design.md §9, CLAUDE.md) prohíbe el azúcar de "parameter properties":
  // el campo se declara arriba y se asigna aquí, a mano.
  constructor(tokens: readonly Token[]) {
    this.tokens = tokens;
  }

  actual(): Token {
    return this.tokens[this.posicion];
  }

  /** El token `desplazamiento` posiciones adelante (0 = `actual()`), sin consumir nada. Nunca pasa
   * de `eof` (design.md §2.5: la desambiguación necesita mirar más allá sin caerse del final). */
  mirar(desplazamiento: number): Token {
    const indice = Math.min(this.posicion + desplazamiento, this.tokens.length - 1);
    return this.tokens[indice];
  }

  avanzar(): Token {
    const token = this.tokens[this.posicion];
    if (token.tipo !== 'eof') this.posicion += 1;
    return token;
  }

  coincideTexto(texto: string): boolean {
    return this.actual().texto === texto;
  }

  esperarTexto(texto: string): Token {
    const token = this.actual();
    if (token.texto !== texto) {
      throw new ErrorDeCompilacion(
        `se esperaba "${texto}" y se encontró "${token.texto || '<fin de archivo>'}"`,
        token.rango,
      );
    }
    return this.avanzar();
  }

  esperarTipo(tipo: TipoToken): Token {
    const token = this.actual();
    if (token.tipo !== tipo) {
      throw new ErrorDeCompilacion(
        `se esperaba un token de tipo "${tipo}" y se encontró "${token.texto || '<fin de archivo>'}"`,
        token.rango,
      );
    }
    return this.avanzar();
  }
}
