// Regenera, en binario, los cuatro artefactos golden de cada programa del corpus contra el JDK
// real (ADR 011): `<base>.salida` (stdout), `<base>.errores` (stderr o errores de javac),
// `<base>.combinada` (orden real de intercalado) y `<base>.oraculo.json` (metadatos: si compiló,
// código de salida, si agotó el tiempo, y el desenlace clasificado). Nadie edita estos archivos a
// mano — `npm run oraculo:goldens` los reescribe siempre desde cero.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type InfoJdk, VERSION_JDK_ESPERADA, localizarJdk } from './jdk.ts';
import { type ResultadoEjecucion, ejecutarPrograma } from './ejecutar.ts';
import { migrarCorpus } from './migrar-corpus.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ_PROYECTO = resolve(AQUI, '..', '..');

export type DesenlaceOraculo = 'normal' | 'excepcion' | 'error-compilacion' | 'limite-pasos';

export interface MetadatosOraculo {
  readonly nombreArchivo: string;
  readonly paquete: string | null;
  readonly compilo: boolean;
  readonly codigoSalida: number | null;
  readonly agotoTiempo: boolean;
  readonly desenlace: DesenlaceOraculo;
  readonly version: string;
}

/**
 * Pura: clasifica el desenlace de una corrida del oráculo. El ciclo infinito de U6 se clasifica
 * `limite-pasos` (nunca se "arregla" el programa — el propio timeout del oráculo es el desenlace
 * esperado, design.md §7.2); su `.salida` parcial NO se compara byte a byte en las pruebas
 * diferenciales (se prueba por propiedad, C1, tarea 2.20) porque el número de líneas capturadas
 * antes del SIGKILL depende de la velocidad de la máquina, no es reproducible bit a bit.
 */
export function clasificarDesenlace(datos: {
  readonly compilo: boolean;
  readonly agotoTiempo: boolean;
  readonly codigoSalida: number | null;
}): DesenlaceOraculo {
  if (!datos.compilo) return 'error-compilacion';
  if (datos.agotoTiempo) return 'limite-pasos';
  if (datos.codigoSalida !== 0) return 'excepcion';
  return 'normal';
}

export interface ProgramaCorpus {
  /** Ruta absoluta sin extensión — se le agregan `.java`, `.entrada.txt`, `.salida`, etc. */
  readonly rutaBase: string;
  readonly rutaFuente: string;
  readonly rutaEntrada: string | null;
}

/** Recorre `directorioCorpus` y empareja cada `.java` con su `.entrada.txt` hermano, si existe. */
export function descubrirProgramas(directorioCorpus: string): ProgramaCorpus[] {
  const programas: ProgramaCorpus[] = [];
  const recorrer = (directorio: string): void => {
    for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
      const rutaCompleta = join(directorio, entrada.name);
      if (entrada.isDirectory()) {
        recorrer(rutaCompleta);
      } else if (entrada.isFile() && entrada.name.endsWith('.java')) {
        const rutaBase = rutaCompleta.slice(0, -'.java'.length);
        const rutaEntrada = `${rutaBase}.entrada.txt`;
        programas.push({
          rutaBase,
          rutaFuente: rutaCompleta,
          rutaEntrada: existsSync(rutaEntrada) ? rutaEntrada : null,
        });
      }
    }
  };
  recorrer(directorioCorpus);
  return programas.sort((a, b) => a.rutaBase.localeCompare(b.rutaBase));
}

export interface OpcionesGolden {
  readonly fuente: string;
  readonly entrada: Buffer | null;
  readonly limiteMs?: number;
}

export interface GoldenGenerado {
  readonly salida: Buffer;
  readonly errores: Buffer;
  readonly combinada: Buffer;
  readonly metadatos: MetadatosOraculo;
}

/** Compila y ejecuta un programa contra el JDK real y arma el conjunto de 4 artefactos golden. */
export async function generarGoldenPara(jdk: InfoJdk, opciones: OpcionesGolden): Promise<GoldenGenerado> {
  const resultado: ResultadoEjecucion = await ejecutarPrograma(jdk, {
    fuente: opciones.fuente,
    entrada: opciones.entrada ?? undefined,
    limiteMs: opciones.limiteMs,
  });

  const metadatos: MetadatosOraculo = {
    nombreArchivo: resultado.nombreArchivo,
    paquete: resultado.paquete,
    compilo: resultado.compilo,
    codigoSalida: resultado.codigoSalida,
    agotoTiempo: resultado.agotoTiempo,
    desenlace: clasificarDesenlace(resultado),
    version: VERSION_JDK_ESPERADA,
  };

  return {
    salida: resultado.compilo ? resultado.stdout : Buffer.alloc(0),
    errores: resultado.compilo ? resultado.stderr : resultado.erroresCompilacion,
    combinada: resultado.combinada,
    metadatos,
  };
}

/** Escribe los 4 artefactos binarios junto a `rutaBase` (sin extensión). */
export function escribirGoldens(rutaBase: string, golden: GoldenGenerado): void {
  writeFileSync(`${rutaBase}.salida`, golden.salida);
  writeFileSync(`${rutaBase}.errores`, golden.errores);
  writeFileSync(`${rutaBase}.combinada`, golden.combinada);
  writeFileSync(`${rutaBase}.oraculo.json`, `${JSON.stringify(golden.metadatos, null, 2)}\n`, 'utf-8');
}

export interface ResultadoRegeneracion {
  readonly totalProgramas: number;
  readonly rutasRegeneradas: readonly string[];
  readonly copiadosCurso: number;
  readonly copiadosExperimentos: number;
}

/**
 * Migra el corpus (si hace falta) y regenera TODOS los goldens del proyecto real. Operación
 * lenta (un `javac` + dos `java` por programa) — pensada para correr manualmente
 * (`npm run oraculo:goldens`) o en el job dedicado del oráculo (`oraculo.yml`, tarea 0.9), nunca
 * como parte de `npm test` (design.md §7.1: el oráculo corre "cambios en corpus/...; nocturno",
 * no "cada commit").
 */
export async function generarTodosLosGoldens(raizProyecto: string = RAIZ_PROYECTO): Promise<ResultadoRegeneracion> {
  const jdk = localizarJdk();
  const raizExploracion = resolve(raizProyecto, 'openspec', 'changes', 'visualizador-java', 'exploracion');
  const raizCorpus = resolve(raizProyecto, 'corpus');

  const { copiadosCurso, copiadosExperimentos } = migrarCorpus({ raizExploracion, raizCorpusDestino: raizCorpus });

  const programas = [...descubrirProgramas(resolve(raizCorpus, 'curso')), ...descubrirProgramas(resolve(raizCorpus, 'experimentos'))];

  const rutasRegeneradas: string[] = [];
  for (const programa of programas) {
    const fuente = readFileSync(programa.rutaFuente, 'utf-8');
    const entrada = programa.rutaEntrada ? readFileSync(programa.rutaEntrada) : null;
    const golden = await generarGoldenPara(jdk, { fuente, entrada });
    escribirGoldens(programa.rutaBase, golden);
    rutasRegeneradas.push(programa.rutaBase);
  }

  return { totalProgramas: programas.length, rutasRegeneradas, copiadosCurso, copiadosExperimentos };
}

function main(): void {
  generarTodosLosGoldens(RAIZ_PROYECTO)
    .then((resultado) => {
      console.log(
        `Oráculo: ${resultado.copiadosCurso} archivos migrados a corpus/curso, ` +
          `${resultado.copiadosExperimentos} a corpus/experimentos. ` +
          `${resultado.totalProgramas} goldens regenerados en binario (${basename(RAIZ_PROYECTO)}).`,
      );
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}

const esEjecutadoDirectamente = process.argv[1] === fileURLToPath(import.meta.url);
if (esEjecutadoDirectamente) {
  main();
}
