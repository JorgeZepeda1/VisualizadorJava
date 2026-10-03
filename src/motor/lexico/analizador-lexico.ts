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
// decide qué hacer con un `\u` malformado (tarea 1.35: en el código, en una cadena y en un comentario es un error real, como en javac).
function intentarLeerEscapeUnicode(fuente: string, cursor: number): EscapeUnicodeDetectado | null {
  if (fuente[cursor] !== '\\' || fuente[cursor + 1] !== 'u') return null;
  let inicioHex = cursor + 2;
  while (fuente[inicioHex] === 'u') inicioHex += 1;
  const hex = fuente.slice(inicioHex, inicioHex + 4);
  if (hex.length !== 4 || ![...hex].every((c) => DIGITO_HEX.test(c))) return null;
  return { longitud: inicioHex + 4 - cursor, hex };
}

// Tarea 1.35 (JLS 3.3): una barra invertida solo puede empezar un escape Unicode si la preceden un número PAR de barras invertidas seguidas: en `C:\\users` (dos barras)
// la `u` no empieza nada, y en `C:\users` (una) sí, y le faltan los cuatro dígitos.
function empiezaUnEscapeUnicode(fuente: string, cursor: number): boolean {
  if (fuente[cursor] !== '\\' || fuente[cursor + 1] !== 'u') return false;
  let barrasAntes = 0;
  for (let i = cursor - 1; i >= 0 && fuente[i] === '\\'; i -= 1) barrasAntes += 1;
  return barrasAntes % 2 === 0;
}

// Tarea 1.35: javac rechaza (`illegal unicode escape`) un `\u` que no trae sus cuatro dígitos hexadecimales EN CUALQUIER LUGAR del archivo —código, cadenas y comentarios—.
function errorDeEscapeUnicodeIncompleto(fuente: string, cursor: number): ErrorDeCompilacion {
  let inicioHex = cursor + 2;
  while (fuente[inicioHex] === 'u') inicioHex += 1;
  return new ErrorDeCompilacion('secuencia unicode incompleta: se esperaban 4 dígitos hexadecimales tras "\\u"', { inicio: cursor, fin: inicioHex });
}

/**
 * Tarea 1.35: el primer escape Unicode BIEN FORMADO del archivo que empieza antes de `limite` (un offset) o JUSTO en él, en cualquier lugar —código, cadena o comentario—, con la regla
 * de la paridad de barras; `null` si no hay ninguno. Lo usa `compilador.ts` cuando el léxico se detiene con un error: si antes había un escape, el error puede ser consecuencia de no
 * haberlo traducido (un escape que cierra una cadena, que es un `&`…), y lo honesto es el aviso del escape, no el error. Uno que empieza justo donde termina el error es parte del
 * mismo literal para javac (que traduce los escapes antes de leer): `0x1.8` + `\u0070` es el flotante hexadecimal `0x1.8p1`.
 */
export function primerEscapeUnicodeAntesDe(fuente: string, limite: number): Rango | null {
  for (let i = 0; i <= limite && i < fuente.length; i += 1) {
    if (!empiezaUnEscapeUnicode(fuente, i)) continue;
    const escape = intentarLeerEscapeUnicode(fuente, i);
    if (escape) return { inicio: i, fin: i + escape.longitud };
  }
  return null;
}

/** Tarea 1.35: ¿en `posicion` empieza un escape Unicode MAL formado (una `u` sin sus cuatro dígitos hexadecimales)? Ese error es real y ningún otro escape lo explica. */
export function empiezaUnEscapeUnicodeMalFormado(fuente: string, posicion: number): boolean {
  return empiezaUnEscapeUnicode(fuente, posicion) && intentarLeerEscapeUnicode(fuente, posicion) === null;
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
    // Tarea 1.35: `compilador.ts` distingue un escape dentro de un comentario (que no puede ser la causa de un error de sintaxis) de uno en el código.
    ...(dentroDeComentario ? { enComentario: true } : {}),
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
        if (empiezaUnEscapeUnicode(fuente, cursor)) {
          const escape = intentarLeerEscapeUnicode(fuente, cursor);
          if (!escape) throw errorDeEscapeUnicodeIncompleto(fuente, cursor);
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
        if (empiezaUnEscapeUnicode(fuente, cursor)) {
          const escape = intentarLeerEscapeUnicode(fuente, cursor);
          if (!escape) throw errorDeEscapeUnicodeIncompleto(fuente, cursor);
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
      if (!escape) throw errorDeEscapeUnicodeIncompleto(fuente, cursor);
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
