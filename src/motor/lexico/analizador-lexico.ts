// Analizador léxico (design.md §1.2, §2.3, §2.6). Catálogo COMPLETO desde la tarea 1.1: palabras
// clave, identificadores, literales (cadena/char/entero/largo/doble, con hex/octal/binario/float/
// bloques de texto/\uXXXX reconocidos como NO-DISP — ADR 003, "deja seguir"), operadores y
// puntuación, comentarios de línea/bloque y fin de archivo. Un carácter genuinamente inválido (que
// ni Java mismo aceptaría) sigue lanzando `ErrorDeCompilacion` en vez de fingir un token.
import type { Rango } from '../fuente/rango.ts';
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';
import { leerCadena, leerCaracter, leerNumero } from './literales.ts';
import { OPERADORES_MULTICARACTER, PALABRAS_CLAVE, PUNTUACION, type Token } from './tokens.ts';
// Tarea 1.24: única fuente de verdad de códigos "no soportado" (antes string inline suelto aquí).
import { CODIGOS_NO_SOPORTADO } from '../no-soportado.ts';
import { INICIO_DE_IDENTIFICADOR_JAVA, PARTE_DE_IDENTIFICADOR_JAVA } from '../biblioteca/datos/identificadores-java.generado.ts';
import { crearTablaDeRangos } from './tabla-de-rangos.ts';

// JLS 3.8: qué puede llevar un identificador lo decide `Character.isJavaIdentifierStart/Part` — letras
// Unicode (`año`, `número`), números-letra, símbolos de moneda (`$`, `€`), conectores (`_`) y, DENTRO del
// identificador, dígitos, marcas combinantes y caracteres ignorables. Los rangos son los del JDK 17 (Unicode
// 13), generados por el oráculo (`identificadores-java.generado.ts`, ADR 010) — NO las propiedades Unicode
// de JavaScript (`\p{L}`…): las del motor de Node 22 son de Unicode 17 y aceptarían ~14 000 letras que javac
// 17 rechaza. Tarea 1.29: antes solo ASCII, y `int año` daba «carácter no reconocido: "ñ"». Se prueba por
// PUNTO DE CÓDIGO (un `𝒳` ocupa dos unidades UTF-16).
const INICIO_IDENTIFICADOR = crearTablaDeRangos(INICIO_DE_IDENTIFICADOR_JAVA);
const RESTO_IDENTIFICADOR = crearTablaDeRangos(PARTE_DE_IDENTIFICADOR_JAVA);
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
    codigo: CODIGOS_NO_SOPORTADO.escapeUnicodeNoSoportado,
    nota: `Java procesa "\\u${escape.hex}" como el carácter Unicode U+${escape.hex.toUpperCase()}${sufijo} antes de leer el resto del programa; este visualizador todavía no lo soporta.`,
    datos: {},
  };
}

export function tokenizar(fuente: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < fuente.length) {
    const caracter = fuente[cursor];

    // JLS 3.6: espacio, tabulador, SALTO DE PÁGINA (tarea 1.29), retorno y salto de línea.
    if (caracter === ' ' || caracter === '\t' || caracter === '\f' || caracter === '\r' || caracter === '\n') {
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
          datos: noSoportados[0].datos,
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
          datos: noSoportados[0].datos,
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

    // Un literal empieza con un dígito, o con el punto de «.5» (JLS 3.10.2, tarea 1.29): un punto sin dígito
    // detrás es el acceso a un miembro («a.b») o los tres de un varargs.
    if (DIGITO_DECIMAL.test(caracter) || (caracter === '.' && DIGITO_DECIMAL.test(fuente[cursor + 1] ?? ''))) {
      const inicio = cursor;
      const numero = leerNumero(fuente, cursor);
      cursor += numero.longitud;
      const rango: Rango = { inicio, fin: cursor };
      const texto = fuente.slice(inicio, cursor);
      if (numero.noSoportado) {
        tokens.push({
          tipo: 'no-soportado',
          texto,
          rango,
          codigo: numero.noSoportado.codigo,
          nota: numero.noSoportado.nota,
          datos: numero.noSoportado.datos,
        });
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

    // El carácter completo (un punto de código: una letra fuera del plano básico ocupa dos unidades UTF-16).
    const caracterCompleto = String.fromCodePoint(fuente.codePointAt(cursor) ?? 0);
    if (INICIO_IDENTIFICADOR.contiene(caracterCompleto.codePointAt(0) ?? 0)) {
      const inicio = cursor;
      cursor += caracterCompleto.length;
      while (cursor < fuente.length) {
        const siguiente = String.fromCodePoint(fuente.codePointAt(cursor) ?? 0);
        if (!RESTO_IDENTIFICADOR.contiene(siguiente.codePointAt(0) ?? 0)) break;
        cursor += siguiente.length;
      }
      const texto = fuente.slice(inicio, cursor);
      const tipo = PALABRAS_CLAVE.has(texto) ? 'palabra-clave' : 'identificador';
      tokens.push({ tipo, texto, rango: { inicio, fin: cursor } });
      continue;
    }

    throw new ErrorDeCompilacion(`carácter no reconocido: "${caracterCompleto}"`, {
      inicio: cursor,
      fin: cursor + caracterCompleto.length,
    });
  }

  tokens.push({ tipo: 'eof', texto: '', rango: { inicio: fuente.length, fin: fuente.length } });
  return tokens;
}
