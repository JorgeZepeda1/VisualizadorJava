// Presupuesto de carga (tarea 5.9, REQ-PLAT-003, C13): la primera visita descarga 500 KB o menos COMPRIMIDOS. Esta herramienta suma el peso gzip de todo lo que deja `vite build` en `dist/` (el
// service worker precachea el sitio completo, así que eso es lo que baja la primera vez) y falla si pasa del límite. Corre en CI (`npm run presupuesto`, después del build) y en local.
//
// «KB» son 1 024 bytes —la unidad con la que se midió el peso desde el lote 1— y gzip va al nivel 9, el más pequeño que puede dar (GitHub Pages comprime con un nivel menor, así que el número
// de aquí es una cota optimista: el presupuesto deja holgura a propósito, hoy se usa poco más de la mitad).

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const BYTES_POR_KB = 1024;

export const LIMITE_EN_BYTES = 500 * BYTES_POR_KB;

const ARCHIVOS_EN_EL_RESUMEN = 3;

export interface ArchivoMedido {
  readonly ruta: string;
  readonly bytesComprimidos: number;
}

export interface ResultadoPresupuesto {
  readonly ok: boolean;
  readonly totalBytes: number;
  readonly limiteBytes: number;
  readonly archivos: readonly ArchivoMedido[];
}

export interface RevisionDelPresupuesto {
  /** 0 = cabe; 1 = se pasa; 2 = no hay nada que medir (falta construir). */
  readonly codigoDeSalida: 0 | 1 | 2;
  readonly mensaje: string;
}

function listarArchivos(directorio: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) encontrados.push(...listarArchivos(ruta));
    else if (entrada.isFile()) encontrados.push(ruta);
  }
  return encontrados;
}

/** Peso gzip (nivel 9) de cada archivo bajo `directorio`, con su ruta relativa («/» en todas las plataformas) y en orden alfabético. */
export function medirDirectorio(directorio: string): ArchivoMedido[] {
  return listarArchivos(directorio)
    .map((ruta) => ({
      ruta: relative(directorio, ruta).split('\\').join('/'),
      bytesComprimidos: gzipSync(readFileSync(ruta), { level: 9 }).length,
    }))
    .sort((a, b) => (a.ruta < b.ruta ? -1 : a.ruta > b.ruta ? 1 : 0));
}

export function evaluarPresupuesto(archivos: readonly ArchivoMedido[], limiteBytes: number = LIMITE_EN_BYTES): ResultadoPresupuesto {
  const totalBytes = archivos.reduce((suma, archivo) => suma + archivo.bytesComprimidos, 0);
  return { ok: totalBytes <= limiteBytes, totalBytes, limiteBytes, archivos };
}

function enKb(bytes: number): string {
  return (bytes / BYTES_POR_KB).toFixed(1);
}

/** El límite se escribe sin decimales cuando son KB redondos («500 KB», no «500.0 KB»). */
function limiteEnKb(bytes: number): string {
  return String(Number(enKb(bytes)));
}

export function resumirPresupuesto(resultado: ResultadoPresupuesto): string {
  const { ok, totalBytes, limiteBytes, archivos } = resultado;
  const porcentaje = ((totalBytes / limiteBytes) * 100).toFixed(1);
  const cuantos = `${archivos.length} ${archivos.length === 1 ? 'archivo' : 'archivos'}`;
  const encabezado = `Presupuesto de carga: ${ok ? 'OK' : 'EXCEDIDO'} — ${enKb(totalBytes)} KB de ${limiteEnKb(limiteBytes)} KB (${porcentaje} %), gzip, ${cuantos}.`;
  const lineas = [encabezado];
  if (!ok) lineas.push(`El sitio excede por ${enKb(totalBytes - limiteBytes)} KB el límite de REQ-PLAT-003.`);
  const masPesados = [...archivos].sort((a, b) => b.bytesComprimidos - a.bytesComprimidos).slice(0, ARCHIVOS_EN_EL_RESUMEN);
  for (const archivo of masPesados) lineas.push(`  ${enKb(archivo.bytesComprimidos)} KB  ${archivo.ruta}`);
  return lineas.join('\n');
}

export function revisarPresupuesto(directorio: string, limiteBytes: number = LIMITE_EN_BYTES): RevisionDelPresupuesto {
  if (!existsSync(directorio) || !statSync(directorio).isDirectory()) {
    return { codigoDeSalida: 2, mensaje: `La carpeta ${directorio} no existe: construye el sitio primero (npm run build).` };
  }
  const archivos = medirDirectorio(directorio);
  if (archivos.length === 0) {
    return { codigoDeSalida: 2, mensaje: `La carpeta ${directorio} está vacía: construye el sitio primero (npm run build).` };
  }
  const resultado = evaluarPresupuesto(archivos, limiteBytes);
  return { codigoDeSalida: resultado.ok ? 0 : 1, mensaje: resumirPresupuesto(resultado) };
}

function main(): void {
  const raiz = resolve(fileURLToPath(import.meta.url), '..', '..');
  const { codigoDeSalida, mensaje } = revisarPresupuesto(join(raiz, 'dist'));
  if (codigoDeSalida === 0) console.log(mensaje);
  else console.error(mensaje);
  process.exitCode = codigoDeSalida;
}

const esEjecutadoDirectamente = process.argv[1] === fileURLToPath(import.meta.url);
if (esEjecutadoDirectamente) {
  main();
}
