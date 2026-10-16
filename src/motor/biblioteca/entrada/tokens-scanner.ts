// Tarea 2.12 (REQ-BIB-009/010, design.md §4.6): la tokenización y las gramáticas de `Scanner`, funciones PURAS sobre texto. Se reescriben desde la documentación pública de
// `java.util.Scanner` (secciones «Localization», «Integer syntax» y «Floating-point syntax»), sin copiar código (ADR 016), y las valida el conjunto del oráculo
// (`corpus/datos/scanner/`, es-MX y es-ES).
//
//  - Delimitador: `Character.isWhitespace` de Java (no `\s` de JS: difieren en U+00A0 y U+001C–U+001F).
//  - Entero: `[-+]?` + Numeral, con Numeral = dígitos | primer grupo de 1–3 dígitos (el primero distinto de '0') + uno o más (separador de miles + 3 dígitos). Los dígitos son los de Unicode.
//  - Decimal: `[-+]?` + (Numeral | Numeral + separador decimal + dígitos* | separador decimal + dígitos+) + exponente opcional, o `NaN`/`Infinity` (también como los escribe la región).
//  - Booleano: `true` o `false` sin distinguir mayúsculas (solo ASCII).
import { isDigit, isWhitespace } from '../texto/character.ts';
import type { SimbolosRegionales } from '../formato/regional.ts';

export type UbicacionDeToken =
  /** Un token completo: `[inicio, fin)` dentro del texto. */
  | { readonly tipo: 'token'; readonly inicio: number; readonly fin: number }
  /** No hay más tokens y la entrada ya terminó (EOF). */
  | { readonly tipo: 'vacio' }
  /** Falta entrada para decidir: no hay token todavía, o el que hay llega al final del búfer y podría seguir. */
  | { readonly tipo: 'incompleto' };

const esDelimitador = (codigo: number): boolean => isWhitespace(codigo);

/** El primer carácter que no es delimitador desde `desde`, o -1. Sirve a `hasNext()`, que responde en cuanto hay algo que no es separador. */
export function primerCaracterDeToken(texto: string, desde: number): number {
  let i = desde;
  while (i < texto.length && esDelimitador(texto.charCodeAt(i))) i += 1;
  return i < texto.length ? i : -1;
}

/** Ubica el siguiente token completo a partir de `desde`. `eof` dice si ya no llegará más entrada. */
export function ubicarToken(texto: string, desde: number, eof: boolean): UbicacionDeToken {
  const inicio = primerCaracterDeToken(texto, desde);
  if (inicio === -1) return eof ? { tipo: 'vacio' } : { tipo: 'incompleto' };
  let fin = inicio;
  while (fin < texto.length && !esDelimitador(texto.charCodeAt(fin))) fin += 1;
  if (fin === texto.length && !eof) return { tipo: 'incompleto' };
  return { tipo: 'token', inicio, fin };
}

/** Un renglón completo desde `desde`: el texto va de `desde` a `fin` y el siguiente renglón empieza en `siguiente`. */
export type UbicacionDeRenglon =
  | { readonly tipo: 'renglon'; readonly fin: number; readonly siguiente: number }
  | { readonly tipo: 'ninguno' }
  | { readonly tipo: 'incompleto' };

/** Los separadores de renglón de `Scanner`: `\r\n`, `\n`, `\r`, U+2028, U+2029 y U+0085. */
const esSeparadorDeRenglon = (codigo: number): boolean => codigo === 0x0a || codigo === 0x0d || codigo === 0x2028 || codigo === 0x2029 || codigo === 0x85;

export function ubicarRenglon(texto: string, desde: number, eof: boolean): UbicacionDeRenglon {
  let i = desde;
  while (i < texto.length && !esSeparadorDeRenglon(texto.charCodeAt(i))) i += 1;
  if (i < texto.length) {
    const esRetornoDeCarro = texto.charCodeAt(i) === 0x0d;
    // Un `\r` al final del búfer podría ser el principio de `\r\n`: hay que ver el siguiente carácter antes de decidir.
    if (esRetornoDeCarro && i + 1 === texto.length && !eof) return { tipo: 'incompleto' };
    const largoDelSeparador = esRetornoDeCarro && texto.charCodeAt(i + 1) === 0x0a ? 2 : 1;
    return { tipo: 'renglon', fin: i, siguiente: i + largoDelSeparador };
  }
  if (!eof) return { tipo: 'incompleto' };
  return desde < texto.length ? { tipo: 'renglon', fin: texto.length, siguiente: texto.length } : { tipo: 'ninguno' };
}

// ---- Gramáticas ----

function esSigno(c: string | undefined): boolean {
  return c === '-' || c === '+';
}

function esDigitoEn(texto: string, i: number): boolean {
  return i < texto.length && isDigit(texto.charCodeAt(i));
}

/** Los posibles finales de un Numeral que empieza en `desde`: los dígitos seguidos (si hay) y el agrupado con separador de miles (si cabe). Cada alternativa da UN final. */
function finalesDeNumeral(texto: string, desde: number, simbolos: SimbolosRegionales): number[] {
  const finales: number[] = [];
  let i = desde;
  while (esDigitoEn(texto, i)) i += 1;
  if (i > desde) finales.push(i);

  // Agrupado: primer grupo de 1–3 dígitos (el primero no puede ser el '0' ASCII), luego uno o más (separador + 3 dígitos).
  if (esDigitoEn(texto, desde) && texto[desde] !== '0') {
    let j = desde + 1;
    if (esDigitoEn(texto, j)) j += 1;
    if (esDigitoEn(texto, j)) j += 1;
    let grupos = 0;
    while (texto[j] === simbolos.miles && esDigitoEn(texto, j + 1) && esDigitoEn(texto, j + 2) && esDigitoEn(texto, j + 3)) {
      j += 4;
      grupos += 1;
    }
    if (grupos > 0) finales.push(j);
  }
  return finales;
}

export function coincideEntero(token: string, simbolos: SimbolosRegionales): boolean {
  const inicio = esSigno(token[0]) ? 1 : 0;
  return finalesDeNumeral(token, inicio, simbolos).includes(token.length);
}

/** Quita los separadores de miles: lo que sobra es lo que `Integer.parseInt` recibe (con su signo). */
export function procesarEntero(token: string, simbolos: SimbolosRegionales): string {
  return token.split(simbolos.miles).join('');
}

export function coincideBooleano(token: string): boolean {
  const minusculas = token.replace(/[A-Z]/g, (letra) => letra.toLowerCase());
  return minusculas === 'true' || minusculas === 'false';
}

function esNoNumero(texto: string, simbolos: SimbolosRegionales): boolean {
  return texto === 'NaN' || texto === 'Infinity' || texto === simbolos.nan || texto === simbolos.infinito;
}

/** `true` si desde `i` hasta el final del texto hay un exponente válido o nada. */
function terminaConExponenteOpcional(texto: string, i: number): boolean {
  if (i === texto.length) return true;
  if (texto[i] !== 'e' && texto[i] !== 'E') return false;
  let j = i + 1;
  if (esSigno(texto[j])) j += 1;
  const inicioDeDigitos = j;
  while (esDigitoEn(texto, j)) j += 1;
  return j > inicioDeDigitos && j === texto.length;
}

const ES_COMA_FLOTANTE_HEXADECIMAL = /^[+-]?0[xX][0-9a-fA-F]*\.[0-9a-fA-F]+(?:[pP][+-]?[0-9]+)?$/;

export type ClaseDeDecimal = 'decimal' | 'hexadecimal' | 'ninguno';

/** ¿El token es un decimal para `nextDouble`? `'hexadecimal'` es el literal con `0x` que Java también acepta pero que el motor no calcula (queda «No disponible»). */
export function clasificarDecimal(token: string, simbolos: SimbolosRegionales): ClaseDeDecimal {
  if (ES_COMA_FLOTANTE_HEXADECIMAL.test(token)) return 'hexadecimal';
  const inicio = esSigno(token[0]) ? 1 : 0;
  if (esNoNumero(token.slice(inicio), simbolos)) return 'decimal';
  for (const final of finalesDeNumeral(token, inicio, simbolos)) {
    if (terminaConExponenteOpcional(token, final)) return 'decimal';
    if (token[final] === simbolos.decimal) {
      let k = final + 1;
      while (esDigitoEn(token, k)) k += 1;
      if (terminaConExponenteOpcional(token, k)) return 'decimal';
    }
  }
  if (token[inicio] === simbolos.decimal) {
    let k = inicio + 1;
    while (esDigitoEn(token, k)) k += 1;
    if (k > inicio + 1 && terminaConExponenteOpcional(token, k)) return 'decimal';
  }
  return 'ninguno';
}

/**
 * El texto que `Double.parseDouble` recibe: sin separadores de miles, con punto decimal y los dígitos Unicode pasados a ASCII. El símbolo regional del infinito (`∞`) NO se traduce: Java lo
 * acepta en el patrón pero `Double.parseDouble("∞")` falla, y `nextDouble` lanza `InputMismatchException: For input string: "∞"` (medido en el JDK 17).
 */
export function procesarDecimal(token: string, digitoDeUnicode: (codigo: number) => number, simbolos: SimbolosRegionales): string {
  let resultado = token.split(simbolos.miles).join('');
  if (simbolos.decimal !== '.') resultado = resultado.split(simbolos.decimal).join('.');
  let ascii = '';
  for (let i = 0; i < resultado.length; i++) {
    const codigo = resultado.charCodeAt(i);
    ascii += isDigit(codigo) ? String(digitoDeUnicode(codigo)) : resultado[i];
  }
  return ascii;
}
