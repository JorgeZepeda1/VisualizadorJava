// Analizador sintáctico de la rebanada vertical: descenso recursivo (ADR 003) para exactamente
// Programa→Clase→Main→Bloque→System.out.println(literal), con los modificadores opcionales de
// design.md §2.3 ("{ 'public' | 'static' | 'final' }"). El resto de la gramática y el
// reconocimiento NO-DISP (design.md §2.6) llegan en el lote 1 — aquí, cualquier cosa fuera de este
// subconjunto lanza `ErrorDeCompilacion` con su rango en vez de fingir un análisis exitoso.
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';
import type { Token, TipoToken } from '../lexico/tokens.ts';
import type {
  NodoBloque,
  NodoClase,
  NodoImpresion,
  NodoLiteralCadena,
  NodoMain,
  NodoPrograma,
  NodoSentencia,
} from './ast.ts';

const MODIFICADORES_CLASE: ReadonlySet<string> = new Set(['public']);
const MODIFICADORES_MAIN: ReadonlySet<string> = new Set(['public', 'static', 'final']);

class CursorDeTokens {
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

export function analizarPrograma(tokens: readonly Token[]): NodoPrograma {
  const cursor = new CursorDeTokens(tokens);
  const clase = analizarClase(cursor);
  const finToken = cursor.esperarTipo('eof');
  return {
    tipo: 'programa',
    clase,
    rango: { inicio: clase.rango.inicio, fin: finToken.rango.fin },
  };
}

function analizarClase(cursor: CursorDeTokens): NodoClase {
  const inicio = cursor.actual().rango.inicio;
  consumirModificadores(cursor, MODIFICADORES_CLASE, 'class');
  cursor.esperarTexto('class');
  const nombre = cursor.esperarTipo('identificador');
  cursor.esperarTexto('{');
  const main = analizarMain(cursor);
  const cierre = cursor.esperarTexto('}');
  return { tipo: 'clase', nombre: nombre.texto, main, rango: { inicio, fin: cierre.rango.fin } };
}

function analizarMain(cursor: CursorDeTokens): NodoMain {
  const inicio = cursor.actual().rango.inicio;
  consumirModificadores(cursor, MODIFICADORES_MAIN, 'void');
  cursor.esperarTexto('void');
  cursor.esperarTexto('main');
  cursor.esperarTexto('(');
  cursor.esperarTexto('String');
  cursor.esperarTexto('[');
  cursor.esperarTexto(']');
  const parametro = cursor.esperarTipo('identificador');
  cursor.esperarTexto(')');
  const cuerpo = analizarBloque(cursor);
  return {
    tipo: 'main',
    parametro: parametro.texto,
    cuerpo,
    rango: { inicio, fin: cuerpo.rango.fin },
  };
}

function analizarBloque(cursor: CursorDeTokens): NodoBloque {
  const apertura = cursor.esperarTexto('{');
  const sentencias: NodoSentencia[] = [];
  while (!cursor.coincideTexto('}')) {
    sentencias.push(analizarSentencia(cursor));
  }
  const cierre = cursor.esperarTexto('}');
  return {
    tipo: 'bloque',
    sentencias,
    rango: { inicio: apertura.rango.inicio, fin: cierre.rango.fin },
  };
}

function analizarSentencia(cursor: CursorDeTokens): NodoSentencia {
  // Única sentencia del subconjunto de esta rebanada; el resto de Sentencia
  // (design.md §2.3) llega en la tarea 1.5.
  return analizarImpresion(cursor);
}

function analizarImpresion(cursor: CursorDeTokens): NodoImpresion {
  const inicioToken = cursor.esperarTexto('System');
  cursor.esperarTexto('.');
  cursor.esperarTexto('out');
  cursor.esperarTexto('.');
  cursor.esperarTexto('println');
  cursor.esperarTexto('(');
  const argumento = analizarLiteralCadena(cursor);
  cursor.esperarTexto(')');
  const fin = cursor.esperarTexto(';');
  return {
    tipo: 'impresion',
    argumento,
    rango: { inicio: inicioToken.rango.inicio, fin: fin.rango.fin },
  };
}

function analizarLiteralCadena(cursor: CursorDeTokens): NodoLiteralCadena {
  const token = cursor.esperarTipo('cadena');
  return { tipo: 'literal-cadena', valor: token.valor ?? '', rango: token.rango };
}

function consumirModificadores(
  cursor: CursorDeTokens,
  permitidos: ReadonlySet<string>,
  hasta: string,
): void {
  while (!cursor.coincideTexto(hasta) && permitidos.has(cursor.actual().texto)) {
    cursor.avanzar();
  }
}
