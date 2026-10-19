// Lee los programas de `corpus/libro/` con todo lo que tienen al lado (R0.13, REQ-LIBRO-003, REQ-DIFF-009): su entrada preparada, los cuatro goldens del oráculo (`.salida`, `.errores`, `.combinada`,
// `.oraculo.json`) y su `.meta.json` (`papel` y `esperado`, lo único que se escribe a mano). Si algo falta o está mal formado, falla con la ruta a la vista: un programa del libro sin golden no se
// puede publicar. Lo usan la prueba diferencial del libro, la que cruza el catálogo con el corpus y el guion de borradores para el PO.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PapelDelPrograma } from '../src/textos/es-MX/libro/tipos.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const RAIZ_DEL_PROYECTO = resolve(AQUI, '..');
const CARPETA_DEL_LIBRO = ['corpus', 'libro'];

export type Esperado = 'ejecuta' | 'error-compilacion';

export interface MetaDelPrograma {
  readonly papel: PapelDelPrograma;
  readonly esperado: Esperado;
}

export interface VeredictoDelOraculo {
  readonly compilo: boolean;
  readonly codigoSalida: number | null;
  readonly agotoTiempo: boolean;
  readonly desenlace: 'normal' | 'excepcion' | 'error-compilacion' | 'limite-pasos';
}

export interface ProgramaDelLibro {
  /** `u6-while/contar-en-voz-alta`. */
  readonly id: string;
  /** Ruta de la fuente relativa a la raíz del proyecto, con `/`: `corpus/libro/u6-while/contar-en-voz-alta.java`. */
  readonly rutaFuente: string;
  readonly fuente: string;
  /** La entrada preparada (cada renglón con su salto de línea), o `null` si el programa no lee del teclado. */
  readonly entrada: string | null;
  readonly salida: string;
  readonly errores: string;
  readonly meta: MetaDelPrograma;
  readonly oraculo: VeredictoDelOraculo;
}

const PAPELES: readonly PapelDelPrograma[] = ['para-empezar', 'paso-a-paso', 'error-tipico', 'ponte-a-prueba', 'solucion'];
const ESPERADOS: readonly Esperado[] = ['ejecuta', 'error-compilacion'];

function carpetaDelLibro(raiz: string): string {
  return resolve(raiz, ...CARPETA_DEL_LIBRO);
}

function rutaRelativa(id: string, sufijo: string): string {
  return [...CARPETA_DEL_LIBRO, `${id}${sufijo}`].join('/');
}

function leerObligatorio(raiz: string, id: string, sufijo: string): string {
  const relativa = rutaRelativa(id, sufijo);
  const completa = resolve(raiz, relativa);
  if (!existsSync(completa)) throw new Error(`Falta ${relativa}: un programa del libro necesita su golden del oráculo (npm run oraculo:goldens -- libro) y su .meta.json.`);
  return readFileSync(completa, 'utf-8');
}

function leerMeta(raiz: string, id: string): MetaDelPrograma {
  const relativa = rutaRelativa(id, '.meta.json');
  let datos: unknown;
  try {
    datos = JSON.parse(leerObligatorio(raiz, id, '.meta.json'));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`${relativa} no es un JSON válido: ${error.message}`, { cause: error });
    throw error;
  }
  const { papel, esperado } = (datos ?? {}) as { papel?: unknown; esperado?: unknown };
  if (!PAPELES.includes(papel as PapelDelPrograma)) throw new Error(`${relativa}: "papel" debe ser uno de ${PAPELES.join(', ')} y es ${JSON.stringify(papel)}.`);
  if (!ESPERADOS.includes(esperado as Esperado)) throw new Error(`${relativa}: "esperado" debe ser uno de ${ESPERADOS.join(', ')} y es ${JSON.stringify(esperado)}.`);
  return { papel: papel as PapelDelPrograma, esperado: esperado as Esperado };
}

/** Los ids («tema/programa») de cada `.java` de `corpus/libro/`, ordenados. Una carpeta que no existe es una lista vacía. */
export function idsDeProgramasDelLibro(raiz: string = RAIZ_DEL_PROYECTO): readonly string[] {
  const carpeta = carpetaDelLibro(raiz);
  if (!existsSync(carpeta)) return [];
  return readdirSync(carpeta, { recursive: true, encoding: 'utf-8' })
    .map((ruta) => ruta.split('\\').join('/'))
    .filter((ruta) => ruta.endsWith('.java'))
    .map((ruta) => ruta.slice(0, -'.java'.length))
    .sort();
}

export function leerProgramaDelLibro(id: string, raiz: string = RAIZ_DEL_PROYECTO): ProgramaDelLibro {
  const rutaEntrada = join(carpetaDelLibro(raiz), `${id}.entrada.txt`);
  // `.combinada` no se usa aquí, pero su falta delata un golden a medias.
  leerObligatorio(raiz, id, '.combinada');
  return {
    id,
    rutaFuente: rutaRelativa(id, '.java'),
    fuente: leerObligatorio(raiz, id, '.java'),
    entrada: existsSync(rutaEntrada) ? readFileSync(rutaEntrada, 'utf-8') : null,
    salida: leerObligatorio(raiz, id, '.salida'),
    errores: leerObligatorio(raiz, id, '.errores'),
    meta: leerMeta(raiz, id),
    oraculo: JSON.parse(leerObligatorio(raiz, id, '.oraculo.json')) as VeredictoDelOraculo,
  };
}
