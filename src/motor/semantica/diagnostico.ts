// Forma compartida de un problema de ATRIBUCIÓN (tarea 1.7+, pasada 2 de ADR 004) — deliberadamente
// angosta, como `NoSoportadoColectado` en `sintaxis/no-soportado.ts`: ni `categoria` (siempre
// 'error-compilacion' en esta pasada) ni `linea` (la calcula quien la conecte a `compilador.ts`,
// tarea 1.14, igual que ya hace esa tarea con los avisos NO-DISP) — solo lo que esta pasada sabe
// de verdad. `codigo` sigue abierto (`string`) hasta que la tarea 1.11 cierre `CodigoProblema`.
import type { Rango } from '../fuente/rango.ts';

export interface ProblemaAtribucion {
  readonly codigo: string;
  readonly rango: Rango;
  readonly datos: Readonly<Record<string, unknown>>;
}
