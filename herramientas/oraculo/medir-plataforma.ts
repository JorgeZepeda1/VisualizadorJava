// Mide si Math.pow difiere de StrictMath.pow en x86_64 real (ADR 009, design.md §8). HotSpot
// podría usar una implementación intrínseca distinta de pow() en x86_64 (laptops Windows/Intel)
// frente a la máquina de referencia (arm64). La verdad del motor SIGUE SIENDO fdlibm (D3) pase lo
// que pase aquí — esto solo mide el riesgo, nunca lo resuelve ni cambia el intérprete.
//
// Dos formas de correr `MedirPow.java` contra x86_64 real:
//   1. `medirPowConDocker` (este archivo, requiere Docker Desktop corriendo): `docker run
//      --platform linux/amd64 eclipse-temurin:17`. Indicativo nada más — en Apple Silicon corre
//      traducido por Rosetta. Si el demonio no está corriendo, regresa `disponible: false` con un
//      motivo explícito — NUNCA lanza, NUNCA finge un resultado.
//   2. Autoritativa: `.github/workflows/plataforma.yml` — matriz ubuntu-latest/windows-latest,
//      x86_64 reales, Temurin 17.0.18 vía `actions/setup-java`. `continue-on-error`: nunca
//      bloquea el resto de CI.
//
// `medirPowLocal` corre el MISMO `MedirPow.java` con el JDK local de esta máquina (sin Docker) —
// no mide el riesgo de plataforma (esta máquina no es x86_64), pero sí prueba de verdad que el
// programa compila y calcula correctamente, con RED/GREEN real sin depender de Docker.

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type InfoJdk, localizarJdk, verificarVersionJdk } from './jdk.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const RUTA_MEDIR_POW_JAVA = resolve(AQUI, 'java', 'MedirPow.java');
const RAIZ_PROYECTO = resolve(AQUI, '..', '..');

export interface FilaMedicionPow {
  readonly base: number;
  readonly exponente: number;
  readonly mathPow: number;
  readonly strictMathPow: number;
  readonly coinciden: boolean;
}

/** Pura: interpreta el CSV que imprime `MedirPow.java` (cabecera + una fila por par medido). */
export function parsearInformeMedicion(textoCsv: string): FilaMedicionPow[] {
  const lineas = textoCsv
    .trim()
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0);
  const [, ...filas] = lineas; // la primera línea siempre es la cabecera que imprime MedirPow.java
  return filas.map((linea) => {
    const columnas = linea.split(',');
    const base = columnas[0]!;
    const exponente = columnas[1]!;
    const mathPow = columnas[2]!;
    const strictMathPow = columnas[3]!;
    const coinciden = columnas[4]!;
    return {
      base: Number(base),
      exponente: Number(exponente),
      mathPow: Number(mathPow),
      strictMathPow: Number(strictMathPow),
      coinciden: coinciden.trim() === 'true',
    };
  });
}

/** Pura: inverso de `parsearInformeMedicion` — regenera el CSV (cabecera + una fila por par) para
 * escribirlo como "informe" en disco (design.md §9: "MedirPow → informe y resumen"). */
export function formatearInformeCsv(filas: readonly FilaMedicionPow[]): string {
  const cabecera = 'base,exponente,mathPow,strictMathPow,coinciden';
  const lineas = filas.map((fila) => `${fila.base},${fila.exponente},${fila.mathPow},${fila.strictMathPow},${fila.coinciden}`);
  return `${[cabecera, ...lineas].join('\n')}\n`;
}

/** ¿Hay un demonio de Docker corriendo en esta máquina AHORA MISMO? Nunca lanza. */
export function dockerDisponible(): boolean {
  const resultado = spawnSync('docker', ['info'], { stdio: 'ignore' });
  return resultado.status === 0;
}

/**
 * Corre `MedirPow.java` con el JDK LOCAL de esta máquina (sin Docker) — sanity real del programa
 * (parseo del CSV, cálculo, formato de salida). NO mide el riesgo de plataforma x86_64 en sí
 * (para eso están `medirPowConDocker` y `plataforma.yml`); usa la misma sintaxis de lanzamiento
 * de archivo único que design.md §8 documenta (`java MedirPow.java <csv>`, JEP 330).
 */
export function medirPowLocal(jdk: InfoJdk, rutaCsvPares: string): FilaMedicionPow[] {
  verificarVersionJdk(jdk);
  const resultado = spawnSync(jdk.rutaJava, [RUTA_MEDIR_POW_JAVA, rutaCsvPares], { encoding: 'utf-8' });
  if (resultado.status !== 0) {
    throw new Error(`MedirPow.java terminó con código ${String(resultado.status)}:\n${resultado.stderr}`);
  }
  return parsearInformeMedicion(resultado.stdout);
}

export interface ResultadoMedicionPlataforma {
  readonly disponible: boolean;
  readonly motivo: string | null;
  readonly filas: readonly FilaMedicionPow[];
}

/**
 * Corre `MedirPow.java` contra `rutaCsvParesRelativaAlProyecto` (ruta relativa a la raíz del
 * repositorio: se monta como `/w` dentro del contenedor) en `eclipse-temurin:17`
 * `--platform linux/amd64`. Si Docker Desktop no está corriendo, regresa `disponible: false` con
 * un motivo explícito — nunca lanza, nunca finge un resultado (precisión del orquestador, 0.10).
 */
export function medirPowConDocker(rutaCsvParesRelativaAlProyecto: string): ResultadoMedicionPlataforma {
  if (!dockerDisponible()) {
    return {
      disponible: false,
      motivo:
        'Docker Desktop no está corriendo en esta máquina (`docker info` falló). La medición ' +
        'local con Docker es solo indicativa (Rosetta en Apple Silicon); la medición autoritativa ' +
        'corre en x86_64 real vía .github/workflows/plataforma.yml (ubuntu-latest/windows-latest, ' +
        'continue-on-error). Enciende Docker Desktop para correr esta medición local.',
      filas: [],
    };
  }

  const resultado = spawnSync(
    'docker',
    [
      'run',
      '--rm',
      '--platform',
      'linux/amd64',
      '-v',
      `${RAIZ_PROYECTO}:/w`,
      '-w',
      '/w',
      'eclipse-temurin:17',
      'java',
      'herramientas/oraculo/java/MedirPow.java',
      rutaCsvParesRelativaAlProyecto,
    ],
    { encoding: 'utf-8' },
  );

  if (resultado.status !== 0) {
    return {
      disponible: false,
      motivo: `«docker run» terminó con código ${String(resultado.status)}:\n${resultado.stderr}`,
      filas: [],
    };
  }

  return { disponible: true, motivo: null, filas: parsearInformeMedicion(resultado.stdout) };
}

/**
 * `npm run medir:plataforma [ruta-csv]` — mide con el JDK de ESTE entorno (la variable que
 * importa: en `.github/workflows/plataforma.yml` ese JDK es Temurin 17.0.18 en x86_64 REAL, la
 * medición autoritativa de design.md §8; localmente en esta Mac arm64 es solo indicativo). Sin
 * argumento, usa `corpus/datos/pow/pares.csv` (el conjunto completo — llega en la tarea 2.1; con
 * un CSV de humo pasado como argumento sirve para probar el cableado antes de esa tarea).
 */
function main(): void {
  const rutaCsv = process.argv[2] ?? resolve(RAIZ_PROYECTO, 'corpus', 'datos', 'pow', 'pares.csv');
  try {
    const jdk = localizarJdk();
    const filas = medirPowLocal(jdk, rutaCsv);
    const distintos = filas.filter((fila) => !fila.coinciden);

    const rutaInforme = resolve(RAIZ_PROYECTO, `informe-plataforma-pow-${process.platform}-${process.arch}.csv`);
    writeFileSync(rutaInforme, formatearInformeCsv(filas), 'utf-8');

    console.log(`medir:plataforma — ${filas.length} pares medidos, ${distintos.length} con Math.pow ≠ StrictMath.pow.`);
    console.log(`Informe completo: ${rutaInforme}`);
    if (distintos.length > 0) {
      console.log('Pares donde difieren (ADR 009 / design.md §8 — el motor NO cambia; esto solo documenta el riesgo):');
      for (const fila of distintos.slice(0, 20)) {
        console.log(`  base=${fila.base} exponente=${fila.exponente} Math.pow=${fila.mathPow} StrictMath.pow=${fila.strictMathPow}`);
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const esEjecutadoDirectamente = process.argv[1] === fileURLToPath(import.meta.url);
if (esEjecutadoDirectamente) {
  main();
}
