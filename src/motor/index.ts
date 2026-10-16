// Puerta pública del motor: compilar() y crearEjecucion() (ADR 001, design.md §1.3). El motor no
// importa nada fuera de sí mismo (0 dependencias npm) y no tiene E/S ni puertos de salida.
// Contrato fijo desde la tarea 0.12 (rebanada vertical); los lotes 1 y 2 lo amplían sin romper
// esta firma (REFACTOR de la tarea 0.12).
// Tarea 2.19: `compilar(fuente, puerto?)` y `crearEjecucion(programa, config, puerto?)` reciben el puerto de la biblioteca (por omisión `PUERTO_POR_OMISION`, el único lugar donde la
// parte A del hito 1 conecta Scanner, Math, String, printf y Double.toString).
export { compilar } from './compilador.ts';
export type { ResultadoCompilacion, VistaPrograma } from './compilador.ts';
export { crearEjecucion } from './interprete/ejecucion.ts';
export type { Avance, ConfigEjecucion, Ejecucion } from './interprete/ejecucion.ts';
export type { ProgramaCompilado } from './ir/ir.ts';
// El puerto de la biblioteca (tarea 2.17-2.19): lo que la parte A registra para que el intérprete ejecute llamadas, `new` y `Double.toString`.
export { CadenaJava, EntradaDelPrograma, FaltaEntrada, FlujoDeSalida, PoolDeCadenas } from './biblioteca/index.ts';
export { PUERTO_VACIO } from './interprete/puerto-biblioteca.ts';
export type {
  ContextoDeBiblioteca,
  ObjetoDeBiblioteca,
  OperacionDeBiblioteca,
  PuertoBiblioteca,
  ValorEjecucion,
  ValorEncajado,
} from './interprete/puerto-biblioteca.ts';
export { PUERTO_POR_OMISION } from './interprete/puerto-por-omision.ts';
export { ExcepcionDeEjecucion } from './interprete/excepcion-de-ejecucion.ts';
export type { ClaveExplicacion, DatosPorClave, ExplicacionPaso } from './traza/explicacion.ts';
export { instantaneaEn } from './traza/estado.ts';
export type { InstantaneaDeEjecucion, VariableDeInstantanea } from './traza/estado.ts';
export type {
  CausaFin,
  Categoria,
  CodigoArranque,
  CodigoProblema,
  Problema,
  ProblemaArranque,
  ProblemaDeCompilacion,
  ProblemaNoDisponible,
} from './problemas.ts';
export type { Cambio, ClasePaso, FinEjecucion, Paso, Segmento, Valor } from './traza/paso.ts';
