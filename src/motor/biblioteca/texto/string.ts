// Tarea 2.9 (REQ-BIB-006, design.md §4.5): los métodos de `String` del catálogo (REQ-SUB-005): `length charAt substring indexOf equals equalsIgnoreCase compareTo toUpperCase toLowerCase trim
// isEmpty contains startsWith endsWith replace`, `String.valueOf` y `new String`. Las trampas de JavaScript se evitan a propósito:
//  - `trim` quita lo ≤ U+0020 (incluido `\u0000`) y NO el espacio de no separación U+00A0;
//  - `toUpperCase`/`toLowerCase` usan las tablas de Java 17 (`Character` + los casos especiales que midió el oráculo: `ß` → `SS`, `İ` → `i̇`, el plano 1) y la sigma final;
//  - `replace` es literal (sin `$&`) y con la cadena vacía inserta entre todos los caracteres;
//  - `compareTo` devuelve la DIFERENCIA, no solo -1/0/1;
//  - algunos métodos devuelven la MISMA instancia (`substring(0)`, `trim` sin nada que recortar, `replace` sin coincidencias, mayúsculas sin cambios): para `==` importa.
import { crearExcepcion } from '../excepciones/excepcion-java.ts';
import { MAYUSCULAS_ESPECIALES, MINUSCULAS_ESPECIALES } from '../datos/mayusculas.generado.ts';
import { type TipoImprimible, type ValorImprimible, valorATexto } from '../salida/print-stream.ts';
import { isLetter, isLowerCase, isUpperCase, toLowerCase as caracterAMinuscula, toUpperCase as caracterAMayuscula } from './character.ts';
import { type CadenaJava, nuevaCadena } from './cadena-java.ts';
import { recortarComoJava } from './envoltorios.ts';

const MAYUSCULAS_POR_PUNTO = new Map<number, string>(MAYUSCULAS_ESPECIALES);
const MINUSCULAS_POR_PUNTO = new Map<number, string>(MINUSCULAS_ESPECIALES);
const SIGMA_MAYUSCULA = 0x3a3;
const SIGMA_FINAL = 'ς';
const SIGMA_MINUSCULA = 'σ';

function longitud(s: CadenaJava): number {
  return s.texto.length;
}

function charAt(s: CadenaJava, indice: number): number {
  const largo = s.texto.length;
  if (indice < 0 || indice >= largo) {
    throw s.latin1 ? crearExcepcion('String.charAt/latin1', `String index out of range: ${indice}`) : crearExcepcion('String.charAt/utf16', `index ${indice}, length ${largo}`);
  }
  return s.texto.charCodeAt(indice);
}

function substring(s: CadenaJava, inicio: number, fin?: number): CadenaJava {
  const largo = s.texto.length;
  if (fin === undefined) {
    if (inicio < 0) throw crearExcepcion('String.substring1/negativo', `begin ${inicio}, end ${largo}, length ${largo}`);
    if (inicio > largo) throw crearExcepcion('String.substring1/mayor', `begin ${inicio}, end ${largo}, length ${largo}`);
    return inicio === 0 ? s : nuevaCadena(s.texto.slice(inicio));
  }
  if (inicio < 0 || inicio > fin || fin > largo) {
    const mensaje = `begin ${inicio}, end ${fin}, length ${largo}`;
    if (inicio < 0) throw crearExcepcion('String.substring2/inicio-negativo', mensaje);
    if (fin < 0) throw crearExcepcion('String.substring2/fin-negativo', mensaje);
    if (inicio > fin) throw crearExcepcion('String.substring2/inicio-mayor-que-fin', mensaje);
    throw crearExcepcion('String.substring2/fin-mayor', mensaje);
  }
  return inicio === 0 && fin === largo ? s : nuevaCadena(s.texto.slice(inicio, fin));
}

function indexOf(s: CadenaJava, buscada: CadenaJava, desde = 0): number {
  return s.texto.indexOf(buscada.texto, desde);
}

/** `indexOf(int ch)`: el carácter se promueve a `int` (un punto de código). Fuera de 0–0x10FFFF no se encuentra. */
function indexOfChar(s: CadenaJava, puntoDeCodigo: number): number {
  if (puntoDeCodigo < 0 || puntoDeCodigo > 0x10ffff) return -1;
  return s.texto.indexOf(String.fromCodePoint(puntoDeCodigo));
}

function equals(s: CadenaJava, otra: CadenaJava): boolean {
  return s.texto === otra.texto;
}

/** `regionMatches(true, …)` de Java sobre todo el texto: por unidad, igual o con la misma mayúscula o con la misma minúscula de esa mayúscula. */
function equalsIgnoreCase(s: CadenaJava, otra: CadenaJava): boolean {
  if (s.texto.length !== otra.texto.length) return false;
  for (let i = 0; i < s.texto.length; i++) {
    const a = s.texto.charCodeAt(i);
    const b = otra.texto.charCodeAt(i);
    if (a === b) continue;
    const mayusculaA = caracterAMayuscula(a);
    const mayusculaB = caracterAMayuscula(b);
    if (mayusculaA === mayusculaB) continue;
    if (caracterAMinuscula(mayusculaA) === caracterAMinuscula(mayusculaB)) continue;
    return false;
  }
  return true;
}

function compareTo(s: CadenaJava, otra: CadenaJava): number {
  const minimo = Math.min(s.texto.length, otra.texto.length);
  for (let i = 0; i < minimo; i++) {
    const diferencia = s.texto.charCodeAt(i) - otra.texto.charCodeAt(i);
    if (diferencia !== 0) return diferencia;
  }
  return s.texto.length - otra.texto.length;
}

function esLetraConMayusculas(unidad: number): boolean {
  return isUpperCase(unidad) || isLowerCase(unidad) || (isLetter(unidad) && caracterAMinuscula(unidad) !== caracterAMayuscula(unidad));
}

/** Lo que Java ignora al decidir una sigma final: apóstrofos y puntos de palabra, la interpunción griega y las marcas combinantes (U+0300–U+036F). */
function esIgnorableParaLaSigma(unidad: number): boolean {
  return unidad === 0x27 || unidad === 0x2e || unidad === 0x3a || unidad === 0xb7 || unidad === 0x2019 || unidad === 0x387 || (unidad >= 0x300 && unidad <= 0x36f);
}

/** La sigma mayúscula en `indice` es FINAL si la precede una letra con mayúsculas y no la sigue ninguna (saltando lo ignorable): `ΟΔΟΣ` → `οδος`, pero `ΑΣΑ` → `ασα` y una `Σ` suelta → `σ`. */
function esSigmaFinal(texto: string, indice: number): boolean {
  let antes = indice - 1;
  while (antes >= 0 && esIgnorableParaLaSigma(texto.charCodeAt(antes))) antes -= 1;
  if (antes < 0 || !esLetraConMayusculas(texto.charCodeAt(antes))) return false;
  let despues = indice + 1;
  while (despues < texto.length && esIgnorableParaLaSigma(texto.charCodeAt(despues))) despues += 1;
  return despues >= texto.length || !esLetraConMayusculas(texto.charCodeAt(despues));
}

function aMayusculas(texto: string): string {
  let resultado = '';
  for (const caracter of texto) {
    const punto = caracter.codePointAt(0) as number;
    const especial = MAYUSCULAS_POR_PUNTO.get(punto);
    if (especial !== undefined) resultado += especial;
    else resultado += punto < 0x10000 ? String.fromCharCode(caracterAMayuscula(punto)) : caracter;
  }
  return resultado;
}

function aMinusculas(texto: string): string {
  let resultado = '';
  let indice = 0;
  for (const caracter of texto) {
    const punto = caracter.codePointAt(0) as number;
    const especial = MINUSCULAS_POR_PUNTO.get(punto);
    if (punto === SIGMA_MAYUSCULA) resultado += esSigmaFinal(texto, indice) ? SIGMA_FINAL : SIGMA_MINUSCULA;
    else if (especial !== undefined) resultado += especial;
    else resultado += punto < 0x10000 ? String.fromCharCode(caracterAMinuscula(punto)) : caracter;
    indice += caracter.length;
  }
  return resultado;
}

const TIENE_SUSTITUTOS = /[\uD800-\uDFFF]/;

/** Si la conversión no cambió nada, Java devuelve la misma instancia — salvo con caracteres fuera del plano básico (sustitutos), cuyo camino siempre arma una cadena nueva (medido en el JDK 17). */
function resultadoDeConversion(s: CadenaJava, resultado: string): CadenaJava {
  return resultado === s.texto && !TIENE_SUSTITUTOS.test(s.texto) ? s : nuevaCadena(resultado);
}

function toUpperCase(s: CadenaJava): CadenaJava {
  return resultadoDeConversion(s, aMayusculas(s.texto));
}

function toLowerCase(s: CadenaJava): CadenaJava {
  return resultadoDeConversion(s, aMinusculas(s.texto));
}

function trim(s: CadenaJava): CadenaJava {
  const recortada = recortarComoJava(s.texto);
  return recortada === s.texto ? s : nuevaCadena(recortada);
}

function isEmpty(s: CadenaJava): boolean {
  return s.texto.length === 0;
}

function contains(s: CadenaJava, buscada: CadenaJava): boolean {
  return s.texto.includes(buscada.texto);
}

function startsWith(s: CadenaJava, prefijo: CadenaJava): boolean {
  return s.texto.startsWith(prefijo.texto);
}

function endsWith(s: CadenaJava, sufijo: CadenaJava): boolean {
  return s.texto.endsWith(sufijo.texto);
}

/** `replace(CharSequence, CharSequence)`: literal (nada de `$&`). Con el objetivo vacío inserta el reemplazo entre todos los caracteres y en los dos extremos. Sin coincidencias, la misma instancia. */
function replace(s: CadenaJava, objetivo: CadenaJava, reemplazo: CadenaJava): CadenaJava {
  if (objetivo.texto === '') {
    let resultado = reemplazo.texto;
    for (let i = 0; i < s.texto.length; i++) resultado += s.texto[i] + reemplazo.texto;
    return nuevaCadena(resultado);
  }
  if (!s.texto.includes(objetivo.texto)) return s;
  return nuevaCadena(s.texto.split(objetivo.texto).join(reemplazo.texto));
}

/** `replace(char, char)`: los argumentos son `char` (números 0–65535). Sin cambios, la misma instancia. */
function replaceChar(s: CadenaJava, viejo: number, nuevo: number): CadenaJava {
  const buscado = String.fromCharCode(viejo);
  if (viejo === nuevo || !s.texto.includes(buscado)) return s;
  return nuevaCadena(s.texto.split(buscado).join(String.fromCharCode(nuevo)));
}

/** `String.valueOf(valor)` por tipo estático: una instancia NUEVA. */
function valueOf(tipo: TipoImprimible, valor: ValorImprimible): CadenaJava {
  return nuevaCadena(valorATexto(tipo, valor));
}

/** `new String(otra)`: una copia con identidad propia. */
function nueva(otra: CadenaJava): CadenaJava {
  return nuevaCadena(otra.texto);
}

export const StringJava = {
  length: longitud,
  charAt,
  substring,
  indexOf,
  indexOfChar,
  equals,
  equalsIgnoreCase,
  compareTo,
  toUpperCase,
  toLowerCase,
  trim,
  isEmpty,
  contains,
  startsWith,
  endsWith,
  replace,
  replaceChar,
  valueOf,
  nueva,
} as const;
