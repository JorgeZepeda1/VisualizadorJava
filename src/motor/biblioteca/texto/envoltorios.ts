// Tarea 2.11 (REQ-BIB-008, design.md §4.5): `Integer`, `Double` y `Long`. `parseInt` sigue el algoritmo documentado de Java (signo opcional, dígitos con `Character.digit`, acumulación
// negativa para llegar a `MIN_VALUE`) y `parseDouble` la gramática de `Double.valueOf` — NO la de `parseInt`/`Number()` de JavaScript, que aceptan espacios, `""` y no entienden los
// dígitos Unicode. Los fallos son `NumberFormatException` con el mensaje exacto y el sitio de la tabla de marcos que corresponde a CADA camino de falla (la línea de `Integer.parseInt`
// cambia según dónde falle). `Long.parseLong` no existe aquí a propósito: queda fuera del subconjunto (REQ-SUB-007).
import { crearExcepcion, type ExcepcionJava } from '../excepciones/excepcion-java.ts';
import { NoDisponibleEnEjecucion } from '../no-disponible.ts';
import { digitoDecimal } from './character.ts';

const MAXIMO_INT = 2147483647;
const MINIMO_INT = -2147483648;
const CODIGO_CERO = 48;
const CODIGO_MAS = 43;
const CODIGO_MENOS = 45;

function entradaInvalida(sitio: Parameters<typeof crearExcepcion>[0], entrada: string): ExcepcionJava {
  return crearExcepcion(sitio, `For input string: "${entrada}"`);
}

/** `Integer.parseInt(texto)`: acumula en negativo (así cabe `-2147483648`) y distingue DÓNDE falla, porque Java imprime una línea distinta de `Integer.parseInt` en cada caso. */
function analizarEntero(entrada: string): number {
  const largo = entrada.length;
  if (largo === 0) throw entradaInvalida('Integer.parseInt/vacio', entrada);
  let negativo = false;
  let limite = -MAXIMO_INT;
  let i = 0;
  const primero = entrada.charCodeAt(0);
  if (primero < CODIGO_CERO) {
    if (primero === CODIGO_MENOS) {
      negativo = true;
      limite = MINIMO_INT;
    } else if (primero !== CODIGO_MAS) {
      throw entradaInvalida('Integer.parseInt/inicio-invalido', entrada);
    }
    if (largo === 1) throw entradaInvalida('Integer.parseInt/solo-signo', entrada);
    i += 1;
  }
  const minimoAntesDeMultiplicar = Math.trunc(limite / 10);
  let resultado = 0;
  while (i < largo) {
    const digito = digitoDecimal(entrada.charCodeAt(i));
    i += 1;
    if (digito < 0 || resultado < minimoAntesDeMultiplicar) throw entradaInvalida('Integer.parseInt/digito-invalido', entrada);
    resultado *= 10;
    if (resultado < limite + digito) throw entradaInvalida('Integer.parseInt/desborde-final', entrada);
    resultado -= digito;
  }
  return negativo ? resultado : 0 - resultado; // `0 - 0` y no `-0`: un int de Java no tiene cero negativo (`1.0 / Integer.parseInt("0")` es Infinity)
}

/** `String.trim()` de Java: quita los caracteres ≤ U+0020 de los extremos (incluido `\u0000`), NO el espacio de no separación U+00A0. */
export function recortarComoJava(texto: string): string {
  let inicio = 0;
  let fin = texto.length;
  while (inicio < fin && texto.charCodeAt(inicio) <= 0x20) inicio += 1;
  while (fin > inicio && texto.charCodeAt(fin - 1) <= 0x20) fin -= 1;
  return inicio === 0 && fin === texto.length ? texto : texto.slice(inicio, fin);
}

const ES_COMA_FLOTANTE_HEXADECIMAL = /^0[xX](?:[0-9a-fA-F]+\.?[0-9a-fA-F]*|\.[0-9a-fA-F]+)[pP][+-]?[0-9]+[fFdD]?$/;

function esDigitoAscii(codigo: number): boolean {
  return codigo >= 48 && codigo <= 57;
}

/** `Double.parseDouble(texto)`: `trim`, signo, `NaN`/`Infinity`, y el literal decimal de Java (`Digits . Digits? Exponent? Suffix?`); la coma, el guion bajo y los dígitos no ASCII no valen. */
function analizarDoble(entrada: string): number {
  const texto = recortarComoJava(entrada);
  if (texto.length === 0) throw crearExcepcion('Double.parseDouble/vacio', 'empty String');
  const invalido = (): ExcepcionJava => entradaInvalida('Double.parseDouble/no-es-numero', texto);
  let i = 0;
  const negativo = texto.charCodeAt(0) === CODIGO_MENOS;
  if (negativo || texto.charCodeAt(0) === CODIGO_MAS) i += 1;
  const resto = texto.slice(i);
  if (resto === 'NaN') return Number.NaN;
  if (resto === 'Infinity') return negativo ? -Infinity : Infinity;
  if (/^0[xX]/.test(resto)) {
    if (ES_COMA_FLOTANTE_HEXADECIMAL.test(resto)) throw new NoDisponibleEnEjecucion('double-hexadecimal', entrada);
    throw invalido();
  }
  const inicioDelNumero = i;
  let digitos = 0;
  let hayPunto = false;
  for (; i < texto.length; i++) {
    const codigo = texto.charCodeAt(i);
    if (esDigitoAscii(codigo)) {
      digitos += 1;
    } else if (texto[i] === '.') {
      if (hayPunto) throw crearExcepcion('Double.parseDouble/no-es-numero', 'multiple points');
      hayPunto = true;
    } else {
      break;
    }
  }
  if (digitos === 0) throw invalido();
  if (texto[i] === 'e' || texto[i] === 'E') {
    i += 1;
    if (texto[i] === '+' || texto[i] === '-') i += 1;
    const inicioDelExponente = i;
    while (i < texto.length && esDigitoAscii(texto.charCodeAt(i))) i += 1;
    if (i === inicioDelExponente) throw invalido();
  }
  const finDelNumero = i;
  if ('fFdD'.includes(texto[i] ?? '#') && i < texto.length) i += 1;
  if (i !== texto.length) throw invalido();
  const valor = Number(texto.slice(inicioDelNumero, finDelNumero));
  return negativo ? -valor : valor;
}

export const Integer = {
  MAX_VALUE: MAXIMO_INT,
  MIN_VALUE: MINIMO_INT,
  parseInt: analizarEntero,
} as const;

export const Double = {
  MAX_VALUE: Number.MAX_VALUE,
  MIN_VALUE: Number.MIN_VALUE,
  parseDouble: analizarDoble,
} as const;

export const Long = {
  MAX_VALUE: 9223372036854775807n,
  MIN_VALUE: -9223372036854775808n,
} as const;
