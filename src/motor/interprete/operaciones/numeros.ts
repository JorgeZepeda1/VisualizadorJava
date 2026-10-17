// `Integer.parseInt` y `Double.parseDouble` (tarea 2.11, REQ-BIB-008, design.md §4.5): la gramática y los mensajes de `NumberFormatException` son los de Java, no los de `Number()` de JavaScript
// (que acepta espacios y `""`). Los literales hexadecimales de `double` son «No disponible» (nunca un valor inventado). Las constantes `MAX_VALUE`/`MIN_VALUE` y `Math.PI`/`Math.E` las baja
// `generarIr` a valores fijos.
import { Double, Integer } from '../../biblioteca/index.ts';
import type { OperacionDeBiblioteca } from '../puerto-biblioteca.ts';
import { cadena } from './valores.ts';

export const OPERACIONES_DE_NUMEROS: ReadonlyMap<string, OperacionDeBiblioteca> = new Map<string, OperacionDeBiblioteca>([
  ['Integer.parseInt(java.lang.String)', (_receptor, argumentos) => Integer.parseInt(cadena(argumentos[0]).texto)],
  ['Double.parseDouble(java.lang.String)', (_receptor, argumentos) => Double.parseDouble(cadena(argumentos[0]).texto)],
]);
