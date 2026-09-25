// Error interno con posición, usado por léxico y sintaxis para señalar en qué rango del código
// fuente ocurrió un problema. `compilador.ts` lo atrapa y lo traduce a un `Problema` real
// (design.md §2.2); el catálogo cerrado de códigos llega en el lote 1 (tarea 1.11) — aquí solo
// existe el mecanismo de "error con posición", que ese lote reutiliza sin cambiarlo.
import type { Rango } from './fuente/rango.ts';

export class ErrorDeCompilacion extends Error {
  readonly rango: Rango;

  constructor(mensaje: string, rango: Rango) {
    super(mensaje);
    this.name = 'ErrorDeCompilacion';
    this.rango = rango;
  }
}
