// Localiza el JDK 17 real de referencia y verifica que sea EXACTAMENTE la versión esperada
// (ADR 011) antes de compilar o ejecutar nada. Generar o verificar goldens contra un JDK distinto
// invalidaría la fidelidad de todo el corpus diferencial (ADR 010): los datos y las tablas del
// motor son hechos observados de ESTA versión concreta del JDK, no de "Java" en abstracto.

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export const VERSION_JDK_ESPERADA = '17.0.18';
const RUTA_MACOS_POR_OMISION = '/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home';

export interface InfoJdk {
  readonly directorioHome: string;
  readonly rutaJava: string;
  readonly rutaJavac: string;
}

export class ErrorJdk extends Error {}

/**
 * Pura: decide si la salida de «java -version» corresponde a la versión esperada.
 * Aislada de `child_process` para poder probarla sin lanzar procesos (Extract-Before-Mock).
 */
export function esVersionEsperada(salidaVersion: string, versionEsperada: string = VERSION_JDK_ESPERADA): boolean {
  return salidaVersion.includes(`"${versionEsperada}"`);
}

/** Localiza el JDK 17 real: `JDK17_HOME` si está definida, si no la ruta fija de macOS. */
export function localizarJdk(): InfoJdk {
  const directorioHome = process.env['JDK17_HOME']?.trim() || RUTA_MACOS_POR_OMISION;
  const rutaJava = resolve(directorioHome, 'bin', 'java');
  const rutaJavac = resolve(directorioHome, 'bin', 'javac');
  if (!existsSync(rutaJava) || !existsSync(rutaJavac)) {
    throw new ErrorJdk(
      `No se encontró el JDK 17 real en "${directorioHome}" (faltan bin/java o bin/javac). ` +
        `Define la variable de entorno JDK17_HOME o instala Temurin ${VERSION_JDK_ESPERADA} en la ruta ` +
        `por omisión de macOS ("${RUTA_MACOS_POR_OMISION}").`,
    );
  }
  return { directorioHome, rutaJava, rutaJavac };
}

/** Lanza `ErrorJdk` si el JDK localizado no es exactamente la versión de referencia. */
export function verificarVersionJdk(info: InfoJdk): void {
  const resultado = spawnSync(info.rutaJava, ['-version'], { encoding: 'utf-8' });
  // «java -version» escribe en stderr, no en stdout (comportamiento histórico de la JVM).
  const salida = `${resultado.stdout ?? ''}${resultado.stderr ?? ''}`;
  if (!esVersionEsperada(salida)) {
    throw new ErrorJdk(
      `El JDK en "${info.rutaJava}" no es la versión de referencia esperada (Temurin ` +
        `${VERSION_JDK_ESPERADA}). Salida real de «java -version»:\n${salida}\n` +
        `ADR 010/011: nunca se generan goldens contra un JDK distinto al de referencia.`,
    );
  }
}
