// IR mínima de la rebanada vertical (design.md §1.2, §3.1). El semántico completo que baja tipos,
// ranuras de locales y planes de evaluación llega en la tarea 2.16; aquí solo lo que necesita
// ejecutar System.out.println(literal): una lista de sentencias de impresión con su texto ya
// resuelto. Definición de tipos — se ejercita en generar-ir.test.ts y ejecucion.test.ts.
export interface ProgramaIr {
  readonly sentencias: readonly SentenciaIr[];
}

// Lote 2 (tarea 2.16) amplía esta unión con el resto de SentenciaIr (declaración, asignación…).
export type SentenciaIr = ImpresionIr;

export interface ImpresionIr {
  readonly tipo: 'impresion';
  readonly texto: string;
}

/** Lo que produce `compilar()` cuando el análisis termina sin problemas (design.md §1.3). */
export interface ProgramaCompilado {
  readonly ir: ProgramaIr;
}
