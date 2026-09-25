// Decodificación de literales de cadena (design.md §1.2 "literales.ts"). Solo los escapes de la
// rebanada vertical del lote 0: comilla, barra invertida, salto de línea y tabulador. El catálogo
// completo (hex/octal/unicode/"""/escapes NO-DISP como \r \b \f \s \0-\377) llega en la tarea 1.1
// (design.md §2.6) — un escape fuera de este conjunto mínimo lanza `ErrorDeCompilacion` en vez de
// producir un valor no verificado (D2).
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';

const ESCAPES_VALIDOS: Readonly<Record<string, string>> = {
  '"': '"',
  '\\': '\\',
  n: '\n',
  t: '\t',
};

export interface CadenaLeida {
  readonly valor: string;
  /** Cuántos caracteres del texto fuente consumió, incluidas las comillas. */
  readonly longitud: number;
}

/** Lee un literal de cadena que empieza en `inicio` (apuntando a la comilla de apertura). */
export function leerCadena(fuente: string, inicio: number): CadenaLeida {
  if (fuente[inicio] !== '"') {
    throw new ErrorDeCompilacion('se esperaba una cadena entre comillas', {
      inicio,
      fin: inicio + 1,
    });
  }

  let cursor = inicio + 1;
  let valor = '';

  while (cursor < fuente.length && fuente[cursor] !== '"') {
    const caracter = fuente[cursor];
    if (caracter === '\\') {
      const siguiente = fuente[cursor + 1];
      const decodificado = siguiente === undefined ? undefined : ESCAPES_VALIDOS[siguiente];
      if (decodificado === undefined) {
        throw new ErrorDeCompilacion(
          `escape de cadena no reconocido: "\\${siguiente ?? ''}" (catálogo completo en la tarea 1.1)`,
          { inicio: cursor, fin: cursor + 2 },
        );
      }
      valor += decodificado;
      cursor += 2;
      continue;
    }
    if (caracter === '\n') {
      throw new ErrorDeCompilacion('cadena sin cerrar antes del fin de línea', {
        inicio,
        fin: cursor,
      });
    }
    valor += caracter;
    cursor += 1;
  }

  if (fuente[cursor] !== '"') {
    throw new ErrorDeCompilacion('cadena sin cerrar', { inicio, fin: cursor });
  }

  return { valor, longitud: cursor + 1 - inicio };
}
