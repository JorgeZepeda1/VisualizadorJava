// Puerta pública del motor: compilar() y crearEjecucion() (ADR 001, design.md §1.3). El motor no
// importa nada fuera de sí mismo (0 dependencias npm) y no tiene E/S ni puertos de salida.
// Contrato fijo desde la tarea 0.12 (rebanada vertical); los lotes 1 y 2 lo amplían sin romper
// esta firma (REFACTOR de la tarea 0.12).
export { compilar } from './compilador.ts';
export type { ResultadoCompilacion, VistaPrograma } from './compilador.ts';
export { crearEjecucion } from './interprete/ejecucion.ts';
export type { Avance, ConfigEjecucion, Ejecucion } from './interprete/ejecucion.ts';
export type { ProgramaCompilado } from './ir/ir.ts';
export type { CausaFin, Categoria, CodigoArranque, CodigoProblema, Problema, ProblemaArranque } from './problemas.ts';
export type { Cambio, ClasePaso, FinEjecucion, Paso, Segmento, Valor } from './traza/paso.ts';
