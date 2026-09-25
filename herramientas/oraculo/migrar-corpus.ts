// COPIA (nunca mueve) el material fuente de la exploración hacia el corpus versionado del
// producto — tarea 0.6. `openspec/changes/visualizador-java/exploracion/` es el registro de
// auditoría del cambio SDD y no se toca jamás (ni se borra, ni se mueve, ni se edita).
//
// Solo se copian PROGRAMAS FUENTE (.java) y ENTRADAS (.entrada.txt). Todo lo demás:
//   - Salidas capturadas a mano (.salida.txt en cualquier variante, .error.txt, .compilacion.txt,
//     .combinado.txt...) — el `.salida.txt` heredado perdió el "\n" final al capturarse con un
//     shell; el oráculo regenera TODO en binario (ADR 011), nunca se migra un texto capturado.
//   - Los generadores de datos crudos (`GenerarSalon.java`, `GenerarAleatorios.java`) y sus CSV
//     en `numeros/generado/` — explícitamente "no forman parte del corpus" (ver
//     exploracion/02-semantica-numeros-y-formato.md, sección "Experimentos de gran escala"); el
//     oráculo real los reemplaza con sus propios `Generar*.java` en la tarea 1.9/2.1 (ADR 010).
//   - Los scripts de referencia en JavaScript (`comparar_double_tostring.js`,
//     `random_java_port.js`) — no son "programa fuente" de Java ni "entrada"; quedan como
//     material de consulta en `exploracion/`, intocados.

import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
/** Raíz de la exploración del cambio SDD, fuente de la migración (nunca se escribe aquí). */
export const RAIZ_EXPLORACION = resolve(AQUI, '..', '..', 'openspec', 'changes', 'visualizador-java', 'exploracion');

export interface OperacionCopia {
  readonly origen: string;
  readonly destino: string;
}

// Programas que generan datos crudos, no corpus — ver cabecera del archivo.
const GENERADORES_DE_DATOS_EXCLUIDOS: ReadonlySet<string> = new Set(['GenerarAleatorios.java', 'GenerarSalon.java']);

function nombreBase(rutaRelativa: string): string {
  return rutaRelativa.split('/').pop() ?? rutaRelativa;
}

/** Pura: ¿es este `.txt` una salida capturada de la exploración (y por lo tanto NO es corpus)?
 * Toda entrada declara "entrada" en el nombre por convención del propio corpus (`.entrada.txt`,
 * `mayus.entrada.txt`, `coma.entrada.txt`...); cualquier otro `.txt` es una captura de stdout,
 * stderr, del compilador, o del orden combinado — siempre regenerada por el oráculo, nunca migrada. */
function esSalidaCapturada(rutaRelativa: string): boolean {
  if (!rutaRelativa.endsWith('.txt')) return false;
  return !nombreBase(rutaRelativa).includes('entrada');
}

/** Pura: plan de copia de `exploracion/corpus-candidato/` → `corpus/curso/` — los 35 programas y
 * sus 15 entradas, sin los `.salida.txt` heredados (0.6 RED: perdieron el "\n" final). */
export function planMigracionCurso(nombresArchivos: readonly string[]): OperacionCopia[] {
  return nombresArchivos
    .filter((nombre) => nombre.endsWith('.java') || (nombre.endsWith('.txt') && nombre.includes('entrada')))
    .map((nombre) => ({ origen: nombre, destino: nombre }));
}

/** Pura: plan de copia de `exploracion/experimentos/{numeros,texto}/` → `corpus/experimentos/`.
 * `nombresArchivos` son rutas relativas a `experimentos/` (p. ej. `numeros/candidatos/Candidato01...java`,
 * `texto/err01_falta_punto_coma.java`) — la subestructura de directorios se preserva en el destino. */
export function planMigracionExperimentos(nombresArchivos: readonly string[]): OperacionCopia[] {
  return nombresArchivos
    .filter((nombre) => {
      if (nombre.endsWith('.java')) return !GENERADORES_DE_DATOS_EXCLUIDOS.has(nombreBase(nombre));
      if (nombre.endsWith('.txt')) return !esSalidaCapturada(nombre);
      return false; // excluye .js (scripts de referencia) y cualquier otro tipo de archivo
    })
    .map((nombre) => ({ origen: nombre, destino: nombre }));
}

/** Lista, de forma recursiva, todos los archivos bajo `directorio`, como rutas relativas a él
 * (con separador `/` siempre, independiente del sistema operativo — para que las pruebas y el
 * plan de migración sean deterministas también en CI Windows/ubuntu). */
export function listarArchivosRecursivo(directorio: string, prefijo = ''): string[] {
  const entradas = readdirSync(directorio, { withFileTypes: true });
  const resultado: string[] = [];
  for (const entrada of entradas) {
    const rutaRelativa = prefijo ? `${prefijo}/${entrada.name}` : entrada.name;
    if (entrada.isDirectory()) {
      resultado.push(...listarArchivosRecursivo(join(directorio, entrada.name), rutaRelativa));
    } else if (entrada.isFile()) {
      resultado.push(rutaRelativa);
    }
  }
  return resultado;
}

function copiarSegunPlan(raizOrigen: string, raizDestino: string, plan: readonly OperacionCopia[]): void {
  for (const operacion of plan) {
    const rutaOrigen = resolve(raizOrigen, operacion.origen);
    const rutaDestino = resolve(raizDestino, operacion.destino);
    mkdirSync(dirname(rutaDestino), { recursive: true });
    copyFileSync(rutaOrigen, rutaDestino);
  }
}

export interface OpcionesMigracion {
  readonly raizExploracion: string;
  readonly raizCorpusDestino: string;
}

export interface ResultadoMigracion {
  readonly copiadosCurso: number;
  readonly copiadosExperimentos: number;
}

/** Ejecuta la migración real: COPIA (nunca mueve, nunca borra el origen) desde
 * `raizExploracion/corpus-candidato` y `raizExploracion/experimentos/{numeros,texto}` hacia
 * `raizCorpusDestino/{curso,experimentos}`. */
export function migrarCorpus(opciones: OpcionesMigracion): ResultadoMigracion {
  const origenCurso = resolve(opciones.raizExploracion, 'corpus-candidato');
  const destinoCurso = resolve(opciones.raizCorpusDestino, 'curso');
  const planCurso = planMigracionCurso(listarArchivosRecursivo(origenCurso));
  copiarSegunPlan(origenCurso, destinoCurso, planCurso);

  const origenExperimentos = resolve(opciones.raizExploracion, 'experimentos');
  const destinoExperimentos = resolve(opciones.raizCorpusDestino, 'experimentos');
  const subcarpetas = readdirSync(origenExperimentos, { withFileTypes: true }).filter((entrada) => entrada.isDirectory());
  const archivosExperimentos = subcarpetas.flatMap((subcarpeta) =>
    listarArchivosRecursivo(join(origenExperimentos, subcarpeta.name), subcarpeta.name),
  );
  const planExperimentos = planMigracionExperimentos(archivosExperimentos);
  copiarSegunPlan(origenExperimentos, destinoExperimentos, planExperimentos);

  return { copiadosCurso: planCurso.length, copiadosExperimentos: planExperimentos.length };
}

/** Cierto solo si `ruta` existe y es un directorio — usado por `generar-goldens.ts` para saber si
 * ya hay que migrar o si el corpus destino ya existe. */
export function existeDirectorio(ruta: string): boolean {
  try {
    return statSync(ruta).isDirectory();
  } catch {
    return false;
  }
}
