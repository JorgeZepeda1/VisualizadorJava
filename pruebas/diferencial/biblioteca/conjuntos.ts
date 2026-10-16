// Lectura de los conjuntos de `corpus/datos/` que generó el oráculo (hito 1, parte A). Vive en `pruebas/` (no en `src/motor`) porque necesita `node:fs`, que
// el motor no toca ni en sus pruebas (tsconfig.motor.json fija `types: []`, ADR 001) — mismo patrón que `pruebas/compilacion/catalogo.test.ts`.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bitsAHex, bitsDeDouble } from '../../../herramientas/oraculo/azar-determinista.ts';
import { desescaparCampo } from '../../../herramientas/oraculo/generar-conjuntos.ts';

const RAIZ = resolve(import.meta.dirname, '..', '..', '..');

/** El contenido de un archivo de `corpus/datos/<conjunto>/<archivo>` como texto UTF-8. */
export function leerConjunto(conjunto: string, archivo: string): string {
  return readFileSync(resolve(RAIZ, 'corpus', 'datos', conjunto, archivo), 'utf-8');
}

export interface CasoDeDouble {
  readonly bits: bigint;
  readonly valor: number;
  readonly esperado: string;
}

const VISTA = new DataView(new ArrayBuffer(8));

/** `double-tostring/<nombre>.csv`: líneas `bitsHex,Double.toString` que salieron del JDK 17 real. */
export function leerConjuntoDeDobles(nombre: string): CasoDeDouble[] {
  return leerConjunto('double-tostring', `${nombre}.csv`)
    .split('\n')
    .filter((linea) => linea !== '')
    .map((linea) => {
      const coma = linea.indexOf(',');
      const bits = BigInt(`0x${linea.slice(0, coma)}`);
      VISTA.setBigUint64(0, bits);
      return { bits, valor: VISTA.getFloat64(0), esperado: linea.slice(coma + 1) };
    });
}

// ---- Conjuntos de parseo y de Scanner (`analisis`, `scanner`): TSV con campos escapados ----

export type ResultadoDelOraculo = { readonly ok: true; readonly texto: string } | { readonly ok: false; readonly clase: string; readonly mensaje: string };

/** `OK:<valor>` o `EX:<clase>:<mensaje>` (el valor y el mensaje vienen escapados por la sonda) → estructura con el texto ya sin escapes. */
export function analizarResultadoDelOraculo(campo: string): ResultadoDelOraculo {
  if (campo.startsWith('OK:')) return { ok: true, texto: desescaparCampo(campo.slice(3)) };
  const segundoDosPuntos = campo.indexOf(':', 3);
  return { ok: false, clase: campo.slice(3, segundoDosPuntos), mensaje: desescaparCampo(campo.slice(segundoDosPuntos + 1)) };
}

export interface LineaDeAnalisis {
  readonly operacion: string;
  readonly entrada: string;
  readonly resultado: ResultadoDelOraculo;
}

/** `corpus/datos/<conjunto>/<archivo>`: líneas `operacion<TAB>entrada<TAB>resultado`. */
export function leerLineasDeAnalisis(conjunto: string, archivo: string): LineaDeAnalisis[] {
  return leerConjunto(conjunto, archivo)
    .split('\n')
    .filter((linea) => linea !== '')
    .map((linea) => {
      const [operacion, entrada, resultado] = linea.split('\t') as [string, string, string];
      return { operacion, entrada: desescaparCampo(entrada), resultado: analizarResultadoDelOraculo(resultado) };
    });
}

export interface LineaDeSecuencia {
  readonly texto: string;
  readonly operaciones: readonly string[];
  readonly resultados: readonly ResultadoDelOraculo[];
}

/** `secuencias-<regional>.tsv`: `texto<TAB>op1,op2,…<TAB>r1<TAB>r2…` (sobre un MISMO `Scanner`). */
export function leerLineasDeSecuencia(archivo: string): LineaDeSecuencia[] {
  return leerConjunto('scanner', archivo)
    .split('\n')
    .filter((linea) => linea !== '')
    .map((linea) => {
      const [texto, operaciones, ...resultados] = linea.split('\t') as [string, string, ...string[]];
      return { texto: desescaparCampo(texto), operaciones: operaciones.split(','), resultados: resultados.map(analizarResultadoDelOraculo) };
    });
}

/** Cómo escribe la sonda del oráculo un valor que devolvió una operación: los `double` como sus 64 bits en hexadecimal, lo demás con `String.valueOf`. */
export function describirValorComoElOraculo(operacion: string, valor: number | bigint | boolean | string): string {
  if (operacion === 'parseDouble' || operacion === 'nextDouble') return bitsAHex(bitsDeDouble(valor as number));
  return String(valor);
}
