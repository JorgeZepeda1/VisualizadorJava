// Analizador léxico de la rebanada vertical (design.md §1.2, §2.3, §2.6). Reconoce exactamente lo
// que necesita Programa→Clase→Main→Bloque→System.out.println(literal): palabras clave,
// identificadores, cadenas, la puntuación de esa gramática, comentarios de línea/bloque y fin de
// archivo. El catálogo léxico completo (numéricos en todas sus bases, \uXXXX, bloques de texto…)
// y el reconocimiento NO-DISP llegan en la tarea 1.1 — un carácter fuera de este subconjunto
// lanza `ErrorDeCompilacion` en vez de fingir un token.
import type { Rango } from '../fuente/rango.ts';
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';
import { leerCadena } from './literales.ts';
import { PALABRAS_CLAVE, PUNTUACION, type Token } from './tokens.ts';

const INICIO_IDENTIFICADOR = /[A-Za-z_$]/;
const RESTO_IDENTIFICADOR = /[A-Za-z0-9_$]/;

export function tokenizar(fuente: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < fuente.length) {
    const caracter = fuente[cursor];

    if (caracter === ' ' || caracter === '\t' || caracter === '\r' || caracter === '\n') {
      cursor += 1;
      continue;
    }

    if (caracter === '/' && fuente[cursor + 1] === '/') {
      cursor += 2;
      while (cursor < fuente.length && fuente[cursor] !== '\n') cursor += 1;
      continue;
    }

    if (caracter === '/' && fuente[cursor + 1] === '*') {
      const inicioComentario = cursor;
      cursor += 2;
      while (cursor < fuente.length && !(fuente[cursor] === '*' && fuente[cursor + 1] === '/')) {
        cursor += 1;
      }
      if (cursor >= fuente.length) {
        throw new ErrorDeCompilacion('comentario de bloque sin cerrar', {
          inicio: inicioComentario,
          fin: cursor,
        });
      }
      cursor += 2;
      continue;
    }

    if (caracter === '"') {
      const inicio = cursor;
      const { valor, longitud } = leerCadena(fuente, cursor);
      cursor += longitud;
      const rango: Rango = { inicio, fin: cursor };
      tokens.push({ tipo: 'cadena', texto: fuente.slice(inicio, cursor), valor, rango });
      continue;
    }

    if (PUNTUACION.has(caracter)) {
      const inicio = cursor;
      cursor += 1;
      tokens.push({ tipo: 'puntuacion', texto: caracter, rango: { inicio, fin: cursor } });
      continue;
    }

    if (INICIO_IDENTIFICADOR.test(caracter)) {
      const inicio = cursor;
      cursor += 1;
      while (cursor < fuente.length && RESTO_IDENTIFICADOR.test(fuente[cursor])) cursor += 1;
      const texto = fuente.slice(inicio, cursor);
      const tipo = PALABRAS_CLAVE.has(texto) ? 'palabra-clave' : 'identificador';
      tokens.push({ tipo, texto, rango: { inicio, fin: cursor } });
      continue;
    }

    throw new ErrorDeCompilacion(`carácter no reconocido: "${caracter}"`, {
      inicio: cursor,
      fin: cursor + 1,
    });
  }

  tokens.push({ tipo: 'eof', texto: '', rango: { inicio: fuente.length, fin: fuente.length } });
  return tokens;
}
