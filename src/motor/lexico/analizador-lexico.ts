// Analizador léxico (design.md §1.2, §2.3, §2.6). Catálogo COMPLETO desde la tarea 1.1: palabras
// clave, identificadores, literales (cadena/char/entero/largo/doble, con hex/octal/binario/float/
// bloques de texto/\uXXXX reconocidos como NO-DISP — ADR 003, "deja seguir"), operadores y
// puntuación, comentarios de línea/bloque y fin de archivo. Un carácter genuinamente inválido (que
// ni Java mismo aceptaría) sigue lanzando `ErrorDeCompilacion` en vez de fingir un token.
import type { Rango } from '../fuente/rango.ts';
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';
import { leerCadena, leerCaracter, leerNumero } from './literales.ts';
import { OPERADORES_MULTICARACTER, PALABRAS_CLAVE, PUNTUACION, type Token } from './tokens.ts';

const INICIO_IDENTIFICADOR = /[A-Za-z_$]/;
const RESTO_IDENTIFICADOR = /[A-Za-z0-9_$]/;
const DIGITO_DECIMAL = /[0-9]/;
const DIGITO_HEX = /[0-9A-Fa-f]/;

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
      const { valor, longitud, noSoportados } = leerCadena(fuente, cursor);
      cursor += longitud;
      const rango: Rango = { inicio, fin: cursor };
      const texto = fuente.slice(inicio, cursor);
      if (noSoportados.length > 0) {
        tokens.push({
          tipo: 'no-soportado',
          texto,
          rango,
          codigo: noSoportados[0].codigo,
          nota: noSoportados[0].nota,
        });
      } else {
        tokens.push({ tipo: 'cadena', texto, valor, rango });
      }
      continue;
    }

    if (caracter === "'") {
      const inicio = cursor;
      const { valor, longitud, noSoportados } = leerCaracter(fuente, cursor);
      cursor += longitud;
      const rango: Rango = { inicio, fin: cursor };
      const texto = fuente.slice(inicio, cursor);
      if (noSoportados.length > 0) {
        tokens.push({
          tipo: 'no-soportado',
          texto,
          rango,
          codigo: noSoportados[0].codigo,
          nota: noSoportados[0].nota,
        });
      } else {
        tokens.push({ tipo: 'caracter', texto, valorCaracter: valor, rango });
      }
      continue;
    }

    // \uXXXX fuera de una cadena/char (design.md §2.6: "en cualquier lugar" del código; esta
    // implementación lo reconoce en posición de código normal, no dentro de comentarios — ver
    // discovery de la tarea 1.1: implementar la fidelidad completa de la fase de traducción 1 de
    // la JLS exigiría reescribir el código fuente ANTES de tokenizar, desproporcionado para este
    // lote y no exigido por ningún RED de tasks.md).
    if (caracter === '\\' && fuente[cursor + 1] === 'u') {
      const inicio = cursor;
      let inicioHex = cursor + 2;
      while (fuente[inicioHex] === 'u') inicioHex += 1;
      const hex = fuente.slice(inicioHex, inicioHex + 4);
      if (hex.length !== 4 || ![...hex].every((c) => DIGITO_HEX.test(c))) {
        throw new ErrorDeCompilacion(
          'secuencia unicode incompleta: se esperaban 4 dígitos hexadecimales tras "\\u"',
          { inicio, fin: inicioHex },
        );
      }
      cursor = inicioHex + 4;
      tokens.push({
        tipo: 'no-soportado',
        texto: fuente.slice(inicio, cursor),
        rango: { inicio, fin: cursor },
        codigo: 'escape-unicode-no-soportado',
        nota: `Java procesa "\\u${hex}" como el carácter Unicode U+${hex.toUpperCase()} antes de leer el resto del programa; este visualizador todavía no lo soporta.`,
      });
      continue;
    }

    if (DIGITO_DECIMAL.test(caracter)) {
      const inicio = cursor;
      const numero = leerNumero(fuente, cursor);
      cursor += numero.longitud;
      const rango: Rango = { inicio, fin: cursor };
      const texto = fuente.slice(inicio, cursor);
      if (numero.noSoportado) {
        tokens.push({ tipo: 'no-soportado', texto, rango, codigo: numero.noSoportado.codigo, nota: numero.noSoportado.nota });
      } else if (numero.clase === 'doble') {
        tokens.push({ tipo: 'doble', texto, rango, valorDoble: numero.valorDoble });
      } else if (numero.clase === 'largo') {
        tokens.push({ tipo: 'largo', texto, rango, valorEntero: numero.magnitud });
      } else {
        tokens.push({ tipo: 'entero', texto, rango, valorEntero: numero.magnitud });
      }
      continue;
    }

    const operadorMulti = OPERADORES_MULTICARACTER.find((op) => fuente.startsWith(op, cursor));
    if (operadorMulti) {
      const inicio = cursor;
      cursor += operadorMulti.length;
      tokens.push({ tipo: 'puntuacion', texto: operadorMulti, rango: { inicio, fin: cursor } });
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
