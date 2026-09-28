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
//      x86_64 reales, Temurin 17.0.18 vía `actions/setup-java`. Nunca bloquea nada que dependa de
//      este flujo (no corre en push/PR) — pero SÍ falla el trabajo (`job`) cuando la herramienta
//      misma truena (JDK no encontrado, `MedirPow.java` no compila…). Una diferencia real entre
//      `Math.pow` y `StrictMath.pow` NO es un fallo de la herramienta (ADR 009): se reporta como
//      anotación `::warning::` y en el resumen del trabajo ($GITHUB_STEP_SUMMARY), nunca con
//      `exitCode != 0` (tarea 0.18 — antes, `continue-on-error` a nivel de job ocultaba también
//      los errores reales de la herramienta, como `windows-latest` sin soporte de `.exe`).
//
// `medirPowLocal` corre el MISMO `MedirPow.java` con el JDK local de esta máquina (sin Docker) —
// no mide el riesgo de plataforma (esta máquina no es x86_64), pero sí prueba de verdad que el
// programa compila y calcula correctamente, con RED/GREEN real sin depender de Docker.

import { spawnSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
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

/**
 * Pura: arma el resumen Markdown de `$GITHUB_STEP_SUMMARY` para este job (design.md §9: "MedirPow
 * → informe y resumen", tarea 0.18). Separada de `main()` para probarla sin variables de entorno
 * ni archivos temporales. Trunca la tabla a 20 filas — el mismo tope que ya usaba el resumen por
 * consola (`main()`), para no inflar el resumen del trabajo con miles de filas.
 */
export function formatearResumenMarkdown(
  plataforma: string,
  arquitectura: string,
  totalPares: number,
  distintos: readonly FilaMedicionPow[],
): string {
  const encabezado = `### Medición de \`Math.pow\` vs \`StrictMath.pow\` — ${plataforma}/${arquitectura}\n\n`;
  if (distintos.length === 0) {
    return `${encabezado}${totalPares}/${totalPares} pares coinciden. Sin diferencias (ADR 009).\n`;
  }
  const TOPE_FILAS = 20;
  const filas = distintos
    .slice(0, TOPE_FILAS)
    .map((fila) => `| ${fila.base} | ${fila.exponente} | ${fila.mathPow} | ${fila.strictMathPow} |`)
    .join('\n');
  const nota = distintos.length > TOPE_FILAS ? `\n\n_(mostrando ${TOPE_FILAS} de ${distintos.length})_` : '';
  return (
    `${encabezado}**${distintos.length}/${totalPares}** pares con \`Math.pow\` ≠ \`StrictMath.pow\` ` +
    `(el motor sigue fdlibm, D3 — esto NO es un fallo, solo documenta el riesgo de ADR 009).\n\n` +
    `| base | exponente | Math.pow | StrictMath.pow |\n|---|---|---|---|\n${filas}${nota}\n`
  );
}

/** Agrega `texto` a `$GITHUB_STEP_SUMMARY` si la variable está definida (dentro de un runner de
 * GitHub Actions); fuera de un runner (ej. local) la variable no existe — no escribe nada, nunca
 * lanza. */
export function escribirResumenDelTrabajo(texto: string): void {
  const rutaResumen = process.env['GITHUB_STEP_SUMMARY'];
  if (!rutaResumen) return;
  appendFileSync(rutaResumen, texto, 'utf-8');
}

/** Imprime `mensaje` con el prefijo `::warning::` — GitHub Actions reconoce esta sintaxis en
 * stdout como anotación de advertencia sin necesitar la dependencia `@actions/core` (ADR 016:
 * cero dependencias nuevas). Fuera de un runner de Actions es un log normal, inofensivo. */
export function emitirAdvertenciaGitHubActions(mensaje: string): void {
  console.log(`::warning::${mensaje}`);
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
 *
 * Tarea 0.18: una diferencia real Math.pow ≠ StrictMath.pow NUNCA pone `exitCode = 1` (ADR 009 —
 * es un dato, no un fallo); se anota con `::warning::` y en `$GITHUB_STEP_SUMMARY`. Un error de la
 * propia herramienta (el `catch` de abajo: JDK no encontrado, `MedirPow.java` no compila…) sí pone
 * `exitCode = 1` — con `plataforma.yml` sin `continue-on-error`, eso ahora sí falla el trabajo.
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

    escribirResumenDelTrabajo(formatearResumenMarkdown(process.platform, process.arch, filas.length, distintos));

    if (distintos.length > 0) {
      emitirAdvertenciaGitHubActions(
        `${distintos.length}/${filas.length} pares con Math.pow ≠ StrictMath.pow en ${process.platform}/${process.arch} ` +
          `(ADR 009 / design.md §8 — el motor sigue fdlibm, esto NO es un fallo; ver el resumen del trabajo).`,
      );
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
