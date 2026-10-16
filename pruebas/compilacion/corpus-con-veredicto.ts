// Recorrido de `corpus/**` con el veredicto REAL de javac 17 de cada programa: el `.oraculo.json` de cada
// `.java` (dato del oráculo, ADR 010/011) trae `"compilo": true|false`, así que las dos guardas de
// «lo que se le dice al alumno sobre lo que javac decidió» corren en `npm test` SIN JDK:
//   - `programas-validos.test.ts` (tarea 1.29): javac compiló → nunca `error-compilacion`.
//   - `programas-invalidos.test.ts` (tarea 1.30): javac rechazó → nunca se le dice que Java lo acepta.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const RAIZ = resolve('.');
const SUFIJO_ORACULO = '.oraculo.json';

export interface ProgramaConVeredicto {
  readonly id: string;
  readonly fuente: string;
  /** El veredicto de javac 17 guardado en el `.oraculo.json`, nunca uno calculado aquí. */
  readonly compilo: boolean;
}

function archivosOraculo(directorio: string): string[] {
  return readdirSync(directorio)
    .sort()
    .flatMap((nombre) => {
      const ruta = join(directorio, nombre);
      if (statSync(ruta).isDirectory()) return archivosOraculo(ruta);
      return nombre.endsWith(SUFIJO_ORACULO) ? [ruta] : [];
    });
}

/** Todos los programas de `corpus/**` que tienen un `.oraculo.json` al lado, en orden estable. */
export function programasDelCorpusConVeredicto(): ProgramaConVeredicto[] {
  return archivosOraculo(resolve(RAIZ, 'corpus')).map((rutaOraculo) => {
    const { compilo } = JSON.parse(readFileSync(rutaOraculo, 'utf-8')) as { compilo: boolean };
    const rutaFuente = `${rutaOraculo.slice(0, -SUFIJO_ORACULO.length)}.java`;
    return { id: relative(RAIZ, rutaFuente), fuente: readFileSync(rutaFuente, 'utf-8'), compilo };
  });
}
