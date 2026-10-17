// Los argumentos de una operación llegan YA convertidos al tipo de la firma que `generarIr` resolvió (design.md §3.1): una operación sabe que `String.charAt(int)` recibe un `CadenaJava` como
// receptor y un `number` como argumento. Estas funciones nombran esa certeza (sin comprobar nada en ejecución) para que cada tabla de operaciones se lea como la firma de Java.
import type { CadenaJava } from '../../biblioteca/index.ts';
import type { ValorEjecucion } from '../puerto-biblioteca.ts';

/** Un `int`, un `char` o un `double`. */
export function numero(valor: ValorEjecucion | null | undefined): number {
  return valor as number;
}

/** Un `long`. */
export function largo(valor: ValorEjecucion | null | undefined): bigint {
  return valor as bigint;
}

/** Un `String`. */
export function cadena(valor: ValorEjecucion | null | undefined): CadenaJava {
  return valor as CadenaJava;
}
