// Audita que cada dependencia de EJECUCIÓN tenga licencia permisiva (ADR 016 punto 4) y genera
// la sección correspondiente de AVISOS-DE-TERCEROS.md. Corre en CI (`npm run licencias`) y de
// forma local antes de agregar una dependencia nueva.
//
// Deliberadamente NO analiza devDependencies: herramientas de build/pruebas nunca llegan al
// bundle que recibe el alumno, así que su licencia no exige aviso (ADR 016 solo habla de
// "dependencias de ejecución").

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { DEPENDENCIAS_EJECUCION } from './versiones-fijadas.ts';

export interface DependenciaConLicencia {
  readonly nombre: string;
  readonly version?: string;
  readonly licencia: string | undefined;
}

export interface ResultadoAuditoria {
  readonly ok: boolean;
  readonly noPermitidas: readonly DependenciaConLicencia[];
}

// MIT, ISC, BSD y Apache-2.0 son las que ADR 016 nombra explícitamente; 0BSD es un caso más
// permisivo todavía (dominio público de facto) que a veces aparece en transitivas del ecosistema.
export const LICENCIAS_PERMITIDAS: readonly string[] = [
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  '0BSD',
];

export function esLicenciaPermitida(licencia: string | undefined): boolean {
  if (!licencia) return false;
  return LICENCIAS_PERMITIDAS.includes(licencia.trim());
}

export function auditarLicencias(dependencias: readonly DependenciaConLicencia[]): ResultadoAuditoria {
  const noPermitidas = dependencias.filter((dependencia) => !esLicenciaPermitida(dependencia.licencia));
  return { ok: noPermitidas.length === 0, noPermitidas };
}

export function formatearMensajeDeFalla(resultado: ResultadoAuditoria): string {
  const lineas = resultado.noPermitidas.map((dependencia) => {
    const version = dependencia.version ? `@${dependencia.version}` : '';
    const licencia = dependencia.licencia ?? 'desconocida (sin campo "license")';
    return `  - ${dependencia.nombre}${version}: licencia "${licencia}" no está en la lista permisiva (ADR 016: MIT, ISC, BSD, Apache-2.0).`;
  });
  return ['Dependencias de ejecución con licencia no permitida:', ...lineas].join('\n');
}

export function generarSeccionAvisos(dependencias: readonly DependenciaConLicencia[]): string {
  return dependencias
    .slice()
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map((dependencia) => {
      const version = dependencia.version ? ` ${dependencia.version}` : '';
      return `- **${dependencia.nombre}**${version} — ${dependencia.licencia ?? 'licencia desconocida'}`;
    })
    .join('\n');
}

const MARCADOR_INICIO = '<!-- INICIO: generado por herramientas/licencias.ts -->';
const MARCADOR_FIN = '<!-- FIN: generado por herramientas/licencias.ts -->';

/** Reemplaza solo el bloque entre los marcadores; el resto del documento (incluido el aviso
 * reservado de fdlibm/Sun) queda intacto. */
export function actualizarAvisos(contenidoActual: string, seccionGenerada: string): string {
  const inicio = contenidoActual.indexOf(MARCADOR_INICIO);
  const fin = contenidoActual.indexOf(MARCADOR_FIN);
  if (inicio === -1 || fin === -1 || fin < inicio) {
    throw new Error(
      `AVISOS-DE-TERCEROS.md no tiene los marcadores esperados ("${MARCADOR_INICIO}" … "${MARCADOR_FIN}").`,
    );
  }
  const antes = contenidoActual.slice(0, inicio + MARCADOR_INICIO.length);
  const despues = contenidoActual.slice(fin);
  return `${antes}\n${seccionGenerada}\n${despues}`;
}

function leerLicenciaInstalada(raiz: string, nombrePaquete: string): DependenciaConLicencia {
  const rutaPaquete = resolve(raiz, 'node_modules', ...nombrePaquete.split('/'), 'package.json');
  try {
    const contenido = JSON.parse(readFileSync(rutaPaquete, 'utf-8')) as {
      version?: string;
      license?: unknown;
    };
    const licencia = typeof contenido.license === 'string' ? contenido.license : undefined;
    return { nombre: nombrePaquete, version: contenido.version, licencia };
  } catch {
    return { nombre: nombrePaquete, licencia: undefined };
  }
}

export function leerDependenciasDeEjecucion(raiz: string): DependenciaConLicencia[] {
  return DEPENDENCIAS_EJECUCION.map((dependencia) => leerLicenciaInstalada(raiz, dependencia.nombre));
}

function main(): void {
  const raiz = resolve(fileURLToPath(import.meta.url), '..', '..');
  const dependencias = leerDependenciasDeEjecucion(raiz);
  const resultado = auditarLicencias(dependencias);

  if (!resultado.ok) {
    console.error(formatearMensajeDeFalla(resultado));
    process.exitCode = 1;
    return;
  }

  const rutaAvisos = resolve(raiz, 'AVISOS-DE-TERCEROS.md');
  const actual = readFileSync(rutaAvisos, 'utf-8');
  const actualizado = actualizarAvisos(actual, generarSeccionAvisos(dependencias));
  writeFileSync(rutaAvisos, actualizado, 'utf-8');
  console.log(`Licencias verificadas: ${dependencias.length} dependencias de ejecución, todas permisivas.`);
}

const esEjecutadoDirectamente = process.argv[1] === fileURLToPath(import.meta.url);
if (esEjecutadoDirectamente) {
  main();
}
