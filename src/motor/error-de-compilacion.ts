// Error interno con posición, usado por léxico y sintaxis para señalar en qué rango del código
// fuente ocurrió un problema. `compilador.ts` lo atrapa y lo traduce a un `Problema` real
// (design.md §2.2).
import type { Rango } from './fuente/rango.ts';

export class ErrorDeCompilacion extends Error {
  readonly rango: Rango;
  /** Tarea 1.11 (cierre de `CodigoProblema`): el texto EXACTO que `CursorDeTokens.esperarTexto`
   * esperaba encontrar (p. ej. ";", ")", "}") cuando lo lanzó — `compilador.ts` lo usa para elegir
   * un código real (`falta-punto-y-coma`…) en vez del genérico `error-no-clasificado`, SIN tener
   * que tocar cada punto donde el analizador llama `esperarTexto` (`CursorDeTokens` ya lo sabe).
   * `undefined` para cualquier otro error (léxico, `esperarTipo`, mensajes armados a mano). */
  readonly esperado?: string;

  constructor(mensaje: string, rango: Rango, esperado?: string) {
    super(mensaje);
    this.name = 'ErrorDeCompilacion';
    this.rango = rango;
    this.esperado = esperado;
  }
}
