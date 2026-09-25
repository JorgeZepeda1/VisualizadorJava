// `npm run oraculo:verificar` (ADR 011 punto 4): recompila y re-ejecuta cada `.java` de `corpus/`
// contra el JDK real y exige bytes IDÉNTICOS a los goldens ya escritos en el repositorio. Nunca
// escribe nada — solo lee y compara. Corre en el job dedicado del oráculo (tarea 0.9), no en
// `npm test` (que compara sin JDK, design.md §7.2).

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localizarJdk } from './jdk.ts';
import { type GoldenGenerado, descubrirProgramas, generarGoldenPara } from './generar-goldens.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ_PROYECTO = resolve(AQUI, '..', '..');

export type ArchivoGolden = '.salida' | '.errores' | '.combinada' | '.oraculo.json';
const ARCHIVOS_GOLDEN: readonly ArchivoGolden[] = ['.salida', '.errores', '.combinada', '.oraculo.json'];

export interface DiferenciaGolden {
  readonly rutaBase: string;
  readonly archivo: ArchivoGolden;
  readonly razon: 'faltante' | 'distinto';
}

export interface ResultadoVerificacion {
  readonly ok: boolean;
  readonly totalProgramas: number;
  readonly diferencias: readonly DiferenciaGolden[];
}

function serializarGolden(golden: GoldenGenerado, archivo: ArchivoGolden): Buffer {
  switch (archivo) {
    case '.salida':
      return golden.salida;
    case '.errores':
      return golden.errores;
    case '.combinada':
      return golden.combinada;
    case '.oraculo.json':
      return Buffer.from(`${JSON.stringify(golden.metadatos, null, 2)}\n`, 'utf-8');
  }
}

function compararArchivo(rutaBase: string, archivo: ArchivoGolden, esperado: Buffer): DiferenciaGolden | null {
  const ruta = `${rutaBase}${archivo}`;
  if (!existsSync(ruta)) {
    return { rutaBase, archivo, razon: 'faltante' };
  }
  const real = readFileSync(ruta);
  if (!real.equals(esperado)) {
    return { rutaBase, archivo, razon: 'distinto' };
  }
  return null;
}

/**
 * Regenera en memoria el golden de cada `.java` bajo `raizCorpus` y lo compara contra los 4
 * artefactos ya escritos en disco. No toca `raizCorpus` para nada más que leerlo.
 */
export async function verificarGoldens(raizCorpus: string): Promise<ResultadoVerificacion> {
  const jdk = localizarJdk();
  const programas = descubrirProgramas(raizCorpus);
  const diferencias: DiferenciaGolden[] = [];

  for (const programa of programas) {
    const fuente = readFileSync(programa.rutaFuente, 'utf-8');
    const entrada = programa.rutaEntrada ? readFileSync(programa.rutaEntrada) : null;
    const golden = await generarGoldenPara(jdk, { fuente, entrada });

    // «limite-pasos» (ciclo infinito real, design.md §7.2): el número de líneas capturadas antes
    // del SIGKILL depende de la velocidad de la máquina — NUNCA es reproducible byte a byte entre
    // dos regeneraciones. Se prueba por propiedad (tarea 2.20), no por diff aquí. `.oraculo.json`
    // (el desenlace en sí) y `.errores` SÍ son deterministas y se siguen verificando siempre.
    const archivosAVerificar =
      golden.metadatos.desenlace === 'limite-pasos'
        ? ARCHIVOS_GOLDEN.filter((archivo) => archivo !== '.salida' && archivo !== '.combinada')
        : ARCHIVOS_GOLDEN;

    for (const archivo of archivosAVerificar) {
      const diferencia = compararArchivo(programa.rutaBase, archivo, serializarGolden(golden, archivo));
      if (diferencia) diferencias.push(diferencia);
    }
  }

  return { ok: diferencias.length === 0, totalProgramas: programas.length, diferencias };
}

function formatearDiferencias(diferencias: readonly DiferenciaGolden[]): string {
  return diferencias
    .map((d) => `  - ${d.rutaBase}${d.archivo}: ${d.razon === 'faltante' ? 'falta en disco' : 'difiere de la regeneración real'}`)
    .join('\n');
}

async function main(): Promise<void> {
  const raizCorpus = resolve(RAIZ_PROYECTO, 'corpus');
  const resultadoCurso = await verificarGoldens(resolve(raizCorpus, 'curso'));
  const resultadoExperimentos = await verificarGoldens(resolve(raizCorpus, 'experimentos'));
  const totalProgramas = resultadoCurso.totalProgramas + resultadoExperimentos.totalProgramas;
  const diferencias = [...resultadoCurso.diferencias, ...resultadoExperimentos.diferencias];

  if (diferencias.length > 0) {
    console.error(`oraculo:verificar — ${diferencias.length} diferencia(s) contra el JDK real:\n${formatearDiferencias(diferencias)}`);
    console.error('Corre "npm run oraculo:goldens" para regenerar y luego revisa el diff antes de aceptarlo.');
    process.exitCode = 1;
    return;
  }
  console.log(`oraculo:verificar — ${totalProgramas} programas, goldens idénticos a una regeneración real contra Temurin 17.0.18.`);
}

const esEjecutadoDirectamente = process.argv[1] === fileURLToPath(import.meta.url);
if (esEjecutadoDirectamente) {
  void main();
}
