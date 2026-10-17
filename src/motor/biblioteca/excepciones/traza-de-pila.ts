// Tarea 2.14 (design.md §3.6): el texto EXACTO de `stderr` cuando una excepción llega a `main` sin atraparse en Java 17:
//   Exception in thread "main" <clase>[: <mensaje>]
//   \tat <marco de java.base>      (uno por marco, del más interno al más externo)
//   \tat [paquete.]Clase.metodo(Clase.java:<línea>)   (uno por marco del alumno, del más interno a `main`)
import type { ExcepcionDeEjecucion } from '../../interprete/excepcion-de-ejecucion.ts';

/** Un marco del programa del alumno. La línea la da el intérprete (la tabla de líneas de javac: la del inicio de la sentencia, design.md §3.6). */
export interface MarcoDelAlumno {
  readonly paquete: string | null;
  readonly clase: string;
  readonly metodo: string;
  readonly linea: number;
}

/** `clase` o `clase: mensaje`: la primera línea sin el "Exception in thread". */
export function textoDeLaExcepcion(excepcion: ExcepcionDeEjecucion): string {
  return excepcion.mensaje === null ? excepcion.clase : `${excepcion.clase}: ${excepcion.mensaje}`;
}

function textoDelMarcoDelAlumno(marco: MarcoDelAlumno): string {
  const nombreCalificado = marco.paquete === null ? marco.clase : `${marco.paquete}.${marco.clase}`;
  return `${nombreCalificado}.${marco.metodo}(${marco.clase}.java:${marco.linea})`;
}

/** Los marcos de la pila, uno por línea y con el sangrado de Java (tabulador + "at "): primero los de `java.base` de la tabla, luego los del alumno. */
export function formatearMarcos(excepcion: ExcepcionDeEjecucion, marcosDelAlumno: readonly MarcoDelAlumno[]): string[] {
  return [...excepcion.marcos, ...marcosDelAlumno.map(textoDelMarcoDelAlumno)].map((marco) => `\tat ${marco}`);
}

/** El `stderr` completo de una excepción que mata el programa. */
export function formatearTrazaDePila(excepcion: ExcepcionDeEjecucion, marcosDelAlumno: readonly MarcoDelAlumno[]): string {
  const lineas = [`Exception in thread "main" ${textoDeLaExcepcion(excepcion)}`, ...formatearMarcos(excepcion, marcosDelAlumno)];
  return `${lineas.join('\n')}\n`;
}
