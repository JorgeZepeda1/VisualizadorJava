// Compila y ejecuta un programa Java contra el JDK 17 real (ADR 011). Nunca usa `$(...)` ni un
// shell: `child_process.spawn` directo, entrada y salida siempre como Buffer (captura binaria),
// con un tiempo límite propio (macOS no trae `timeout`) que mata el proceso con SIGKILL.
//
// Corre DOS veces cada programa: la primera con stdout/stderr en pipes separados (para los
// goldens `.salida`/`.errores`); la segunda con ambos flujos redirigidos al mismo archivo
// temporal — el patrón documentado de Node para compartir un descriptor entre stdout y stderr —
// para capturar el orden real de intercalado (golden `.combinada`). Dos pipes independientes de
// Node NUNCA garantizan ese orden entre sí, solo un mismo descriptor lo hace a nivel del kernel.

import { spawn } from 'node:child_process';
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { type InfoJdk, verificarVersionJdk } from './jdk.ts';

export const FLAGS_LOCALE: Readonly<Record<'es-MX' | 'es-ES', readonly string[]>> = Object.freeze({
  // Español de México (ADR 012): el modelo regional único del producto. 'es-ES' existe para las
  // pruebas de printf/Scanner que comparan explícitamente contra la coma decimal (design.md §4.7).
  'es-MX': Object.freeze(['-Duser.language=es', '-Duser.country=MX', '-Dfile.encoding=UTF-8']),
  'es-ES': Object.freeze(['-Duser.language=es', '-Duser.country=ES', '-Dfile.encoding=UTF-8']),
});

export const LIMITE_MS_POR_OMISION = 5000;
// `javac` compite por CPU con TODO lo demás que corra en paralelo (otros workers de Vitest, el
// resto de la suite del oráculo) — un presupuesto generoso y FIJO evita que la carga de la
// máquina mate al compilador a medio trabajo y lo confunda con un error de compilación real. El
// límite que sí importa para detectar un ciclo infinito del PROGRAMA es `limiteMs`, aplicado solo
// a las dos corridas de `java`, nunca a `javac`.
export const LIMITE_MS_COMPILACION_POR_OMISION = 15_000;

// Tope a la captura de stdout/stderr/combinada — hallazgo real al regenerar el corpus completo
// (0.6 GREEN): un ciclo infinito real ("while(true) println(...)") produce del orden de 15-20
// MB/s una vez que el JIT optimiza el bucle; sin tope, un golden de un programa que agota tiempo
// termina pesando decenas de MB. 64 KiB alcanza de sobra para que el patrón repetido quede
// documentado (miles de líneas) sin inflar el repositorio — y de cualquier forma
// `verificar-goldens.ts` NUNCA compara estos bytes byte a byte para un desenlace `limite-pasos`
// (design.md §7.2: se prueba por propiedad, no por diff).
export const LIMITE_BYTES_CAPTURA_POR_OMISION = 65_536;

export interface OpcionesEjecucion {
  readonly fuente: string;
  readonly entrada?: Buffer;
  readonly limiteMs?: number;
  readonly limiteCompilacionMs?: number;
  readonly limiteBytesCaptura?: number;
  readonly regional?: 'es-MX' | 'es-ES';
  // Sub-lote 1-D3 (Parte A.2, defensa adicional para el gotcha de la JVM en frío, engram): variables
  // de entorno adicionales para EL PROCESO HIJO (javac/java), fusionadas sobre `process.env` heredado
  // -- nunca lo reemplazan. Opcional a propósito: por omisión el comportamiento es IDÉNTICO al de
  // siempre (hereda `process.env` tal cual, como ya hacía `spawn` sin la opción `env`).
  readonly envAdicional?: Readonly<Record<string, string>>;
}

export interface ResultadoEjecucion {
  readonly nombreArchivo: string;
  readonly paquete: string | null;
  readonly compilo: boolean;
  readonly erroresCompilacion: Buffer;
  readonly stdout: Buffer;
  readonly stderr: Buffer;
  readonly combinada: Buffer;
  readonly codigoSalida: number | null;
  readonly agotoTiempo: boolean;
}

/**
 * Pura: deriva el nombre de archivo con el que hay que compilar (el de la clase `public`, o el
 * de la primera clase si ninguna es `public`) y el paquete declarado, si lo hay. El archivo del
 * corpus casi nunca se llama como su clase — ver exploracion/04-corpus-curricular.md §3, "Nota
 * técnica sobre nombres de clase": el oráculo siempre compila con el archivo renombrado.
 */
export function derivarNombreDeArchivo(fuente: string): { paquete: string | null; nombreArchivo: string } {
  const coincidenciaPaquete = /^\s*package\s+([\w.]+)\s*;/m.exec(fuente);
  const paquete = coincidenciaPaquete ? coincidenciaPaquete[1]! : null;

  const coincidenciaPublica = /\bpublic\s+(?:final\s+|abstract\s+)*class\s+(\w+)/.exec(fuente);
  if (coincidenciaPublica) {
    return { paquete, nombreArchivo: `${coincidenciaPublica[1]}.java` };
  }
  const coincidenciaCualquiera = /\bclass\s+(\w+)/.exec(fuente);
  const nombreClase = coincidenciaCualquiera ? coincidenciaCualquiera[1]! : 'Programa';
  return { paquete, nombreArchivo: `${nombreClase}.java` };
}

interface ResultadoProceso {
  readonly stdout: Buffer;
  readonly stderr: Buffer;
  readonly codigo: number | null;
  readonly agotoTiempo: boolean;
}

/** Acumula fragmentos hasta `limiteBytes`; descarta en silencio lo que exceda (nunca lanza ni
 * corta el proceso por esto — solo dejamos de RETENER más de lo necesario). */
function crearAcumuladorAcotado(limiteBytes: number): { agregar: (fragmento: Buffer) => void; total: () => Buffer } {
  const fragmentos: Buffer[] = [];
  let bytesAcumulados = 0;
  return {
    agregar(fragmento: Buffer) {
      if (bytesAcumulados >= limiteBytes) return;
      fragmentos.push(fragmento);
      bytesAcumulados += fragmento.length;
    },
    total: () => Buffer.concat(fragmentos).subarray(0, limiteBytes),
  };
}

/** Un proceso con stdout/stderr en pipes independientes (para goldens `.salida` / `.errores`). */
function ejecutarProcesoSeparado(
  comando: string,
  argumentos: string[],
  cwd: string,
  entrada: Buffer | undefined,
  limiteMs: number,
  limiteBytesCaptura: number,
  env: NodeJS.ProcessEnv | undefined,
): Promise<ResultadoProceso> {
  return new Promise((resolverPromesa) => {
    const proceso = spawn(comando, argumentos, { cwd, stdio: ['pipe', 'pipe', 'pipe'], ...(env ? { env } : {}) });
    const acumuladorStdout = crearAcumuladorAcotado(limiteBytesCaptura);
    const acumuladorStderr = crearAcumuladorAcotado(limiteBytesCaptura);
    let agotoTiempo = false;

    const temporizador = setTimeout(() => {
      agotoTiempo = true;
      proceso.kill('SIGKILL');
    }, limiteMs);

    proceso.stdout.on('data', (fragmento: Buffer) => acumuladorStdout.agregar(fragmento));
    proceso.stderr.on('data', (fragmento: Buffer) => acumuladorStderr.agregar(fragmento));
    proceso.stdin.end(entrada ?? Buffer.alloc(0));

    proceso.on('close', (codigo) => {
      clearTimeout(temporizador);
      resolverPromesa({
        stdout: acumuladorStdout.total(),
        stderr: acumuladorStderr.total(),
        codigo,
        agotoTiempo,
      });
    });
  });
}

/**
 * Un proceso con stdout Y stderr redirigidos al MISMO archivo temporal (dos descriptores propios
 * en modo `'a'`, patrón documentado de Node para compartir destino entre stdio) — el kernel
 * intercala los bytes en el orden real en que el proceso los escribió.
 */
function ejecutarProcesoCombinado(
  comando: string,
  argumentos: string[],
  cwd: string,
  entrada: Buffer | undefined,
  limiteMs: number,
  directorioTemporal: string,
  limiteBytesCaptura: number,
  env: NodeJS.ProcessEnv | undefined,
): Promise<{ combinada: Buffer; agotoTiempo: boolean }> {
  return new Promise((resolverPromesa) => {
    const rutaCombinada = join(directorioTemporal, `combinada-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`);
    writeFileSync(rutaCombinada, Buffer.alloc(0));
    const descriptorStdout = openSync(rutaCombinada, 'a');
    const descriptorStderr = openSync(rutaCombinada, 'a');
    let agotoTiempo = false;

    const proceso = spawn(comando, argumentos, {
      cwd,
      stdio: ['pipe', descriptorStdout, descriptorStderr],
      ...(env ? { env } : {}),
    });

    const temporizador = setTimeout(() => {
      agotoTiempo = true;
      proceso.kill('SIGKILL');
    }, limiteMs);

    // stdin siempre es 'pipe' (índice 0 fijo arriba); el tipo se ensancha a `Writable | null`
    // solo porque los índices 1/2 mezclan `string` y `number` en el arreglo de `stdio`.
    proceso.stdin!.end(entrada ?? Buffer.alloc(0));

    proceso.on('close', () => {
      clearTimeout(temporizador);
      closeSync(descriptorStdout);
      closeSync(descriptorStderr);
      // El archivo temporal en sí puede crecer más que el tope mientras el proceso corre (aquí no
      // hay 'data' events que interceptar, el hijo escribe directo al descriptor) — se descarta el
      // exceso al leer de vuelta; el temporal se borra con el resto de `directorioTemporal`.
      resolverPromesa({ combinada: readFileSync(rutaCombinada).subarray(0, limiteBytesCaptura), agotoTiempo });
    });
  });
}

/**
 * Compila y ejecuta `opciones.fuente` contra el JDK real de `jdk`. Verifica la versión del JDK
 * antes de tocar nada (ADR 010/011). Nunca lanza por un error de COMPILACIÓN del programa dado
 * (eso es un resultado válido, `compilo: false`) — solo lanza `ErrorJdk` si el propio oráculo
 * está mal configurado.
 */
export async function ejecutarPrograma(jdk: InfoJdk, opciones: OpcionesEjecucion): Promise<ResultadoEjecucion> {
  verificarVersionJdk(jdk);

  const { paquete, nombreArchivo } = derivarNombreDeArchivo(opciones.fuente);
  const limiteMs = opciones.limiteMs ?? LIMITE_MS_POR_OMISION;
  const limiteCompilacionMs = opciones.limiteCompilacionMs ?? LIMITE_MS_COMPILACION_POR_OMISION;
  const limiteBytesCaptura = opciones.limiteBytesCaptura ?? LIMITE_BYTES_CAPTURA_POR_OMISION;
  const flagsLocale = FLAGS_LOCALE[opciones.regional ?? 'es-MX'];
  // Sub-lote 1-D3 (Parte A.2): `undefined` cuando nadie pide `envAdicional` -- `spawn` hereda
  // `process.env` tal cual, IDÉNTICO al comportamiento de siempre (nunca cambia sin pedirlo).
  const env = opciones.envAdicional ? { ...process.env, ...opciones.envAdicional } : undefined;

  const directorioTemporal = mkdtempSync(join(tmpdir(), 'oraculo-visualizador-java-'));
  try {
    const directorioFuente = paquete ? resolve(directorioTemporal, ...paquete.split('.')) : directorioTemporal;
    if (paquete) mkdirSync(directorioFuente, { recursive: true });
    writeFileSync(join(directorioFuente, nombreArchivo), opciones.fuente, 'utf-8');

    const compilacion = await ejecutarProcesoSeparado(
      jdk.rutaJavac,
      ['-encoding', 'UTF-8', '-g', nombreArchivo],
      directorioFuente,
      undefined,
      limiteCompilacionMs,
      limiteBytesCaptura,
      env,
    );

    if (compilacion.codigo !== 0) {
      return {
        nombreArchivo,
        paquete,
        compilo: false,
        erroresCompilacion: compilacion.stderr,
        stdout: Buffer.alloc(0),
        stderr: Buffer.alloc(0),
        combinada: Buffer.alloc(0),
        codigoSalida: null,
        agotoTiempo: compilacion.agotoTiempo,
      };
    }

    const nombreClase = nombreArchivo.replace(/\.java$/, '');
    const nombreClaseCalificado = paquete ? `${paquete}.${nombreClase}` : nombreClase;
    const argumentosEjecucion = [...flagsLocale, '-cp', directorioTemporal, nombreClaseCalificado];

    // Las dos corridas son independientes (procesos y archivos temporales propios, mismo .class
    // de solo lectura) — en paralelo, un programa que agota tiempo tarda `limiteMs` una sola vez,
    // no el doble (importa para el costo real del job del oráculo, design.md §9).
    const [separada, combinada] = await Promise.all([
      ejecutarProcesoSeparado(
        jdk.rutaJava,
        argumentosEjecucion,
        directorioTemporal,
        opciones.entrada,
        limiteMs,
        limiteBytesCaptura,
        env,
      ),
      ejecutarProcesoCombinado(
        jdk.rutaJava,
        argumentosEjecucion,
        directorioTemporal,
        opciones.entrada,
        limiteMs,
        directorioTemporal,
        limiteBytesCaptura,
        env,
      ),
    ]);

    return {
      nombreArchivo,
      paquete,
      compilo: true,
      erroresCompilacion: Buffer.alloc(0),
      stdout: separada.stdout,
      stderr: separada.stderr,
      combinada: combinada.combinada,
      codigoSalida: separada.codigo,
      agotoTiempo: separada.agotoTiempo || combinada.agotoTiempo,
    };
  } finally {
    rmSync(directorioTemporal, { recursive: true, force: true });
  }
}
