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

interface EscapeUnicodeDetectado {
  readonly longitud: number;
  readonly hex: string;
}

// \uXXXX EN CUALQUIER LUGAR del código fuente, comentarios incluidos (JLS 3.3: Java traduce los
// escapes Unicode en la fase 1, ANTES del análisis léxico — un "\u000a" dentro de un "//" cierra el
// comentario ahí mismo porque se vuelve un salto de línea real ANTES de que exista el concepto de
// "comentario"; verificado ejecutando javac/java 17 reales). Corrección obligatoria (sub-lote 1-B):
// dentro de comentarios esto se ignoraba en silencio (simplificación documentada de 1-A) — como
// \uXXXX está fuera del subconjunto (ADR 003), debe producir el aviso "no soportado" SIEMPRE, nunca
// ignorarse ni reinterpretarse (no se realiza la traducción real: solo se detecta y se avisa).
// Admite "u" repetida (JLS 3.3: "\uu0041" también es válido). Devuelve `null` si no hay un escape
// bien formado en esta posición (4 dígitos hexadecimales exactos tras la(s) "u"); el llamador
// decide qué hacer con un `\u` malformado (código: error real; comentario: se ignora como texto).
function intentarLeerEscapeUnicode(fuente: string, cursor: number): EscapeUnicodeDetectado | null {
  if (fuente[cursor] !== '\\' || fuente[cursor + 1] !== 'u') return null;
  let inicioHex = cursor + 2;
  while (fuente[inicioHex] === 'u') inicioHex += 1;
  const hex = fuente.slice(inicioHex, inicioHex + 4);
  if (hex.length !== 4 || ![...hex].every((c) => DIGITO_HEX.test(c))) return null;
  return { longitud: inicioHex + 4 - cursor, hex };
}

function tokenNoSoportadoPorEscapeUnicode(
  fuente: string,
  cursor: number,
  escape: EscapeUnicodeDetectado,
  dentroDeComentario: boolean,
): Token {
  const fin = cursor + escape.longitud;
  const sufijo = dentroDeComentario ? ', incluso dentro de comentarios,' : '';
  return {
    tipo: 'no-soportado',
    texto: fuente.slice(cursor, fin),
    rango: { inicio: cursor, fin },
    codigo: 'escape-unicode-no-soportado',
    nota: `Java procesa "\\u${escape.hex}" como el carácter Unicode U+${escape.hex.toUpperCase()}${sufijo} antes de leer el resto del programa; este visualizador todavía no lo soporta.`,
  };
}

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
      while (cursor < fuente.length && fuente[cursor] !== '\n') {
        const escape = intentarLeerEscapeUnicode(fuente, cursor);
        if (escape) {
          tokens.push(tokenNoSoportadoPorEscapeUnicode(fuente, cursor, escape, true));
          cursor += escape.longitud;
          continue;
        }
        cursor += 1;
      }
      continue;
    }

    if (caracter === '/' && fuente[cursor + 1] === '*') {
      const inicioComentario = cursor;
      cursor += 2;
      while (cursor < fuente.length && !(fuente[cursor] === '*' && fuente[cursor + 1] === '/')) {
        const escape = intentarLeerEscapeUnicode(fuente, cursor);
        if (escape) {
          tokens.push(tokenNoSoportadoPorEscapeUnicode(fuente, cursor, escape, true));
          cursor += escape.longitud;
          continue;
        }
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

    // \uXXXX fuera de una cadena/char, en posición de código normal (design.md §2.6). Dentro de
    // comentarios lo manejan los dos bloques de arriba (misma detección, código 1.5/1.6).
    if (caracter === '\\' && fuente[cursor + 1] === 'u') {
      const escape = intentarLeerEscapeUnicode(fuente, cursor);
      if (!escape) {
        let inicioHex = cursor + 2;
        while (fuente[inicioHex] === 'u') inicioHex += 1;
        throw new ErrorDeCompilacion(
          'secuencia unicode incompleta: se esperaban 4 dígitos hexadecimales tras "\\u"',
          { inicio: cursor, fin: inicioHex },
        );
      }
      tokens.push(tokenNoSoportadoPorEscapeUnicode(fuente, cursor, escape, false));
      cursor += escape.longitud;
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
