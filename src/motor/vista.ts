// API de presentación del motor (design.md §1.2): Traza y los tipos de Paso/VistaPrograma. Es lo
// único del motor que las capas `textos`/`presentacion`/`interfaz` pueden importar (matriz de
// capas, herramientas/eslint/matriz-capas.ts) — nunca el índice completo. `formatearValorJava` se
// agrega cuando la primera tarea que lo necesite (lote 2/4) lo traiga con su propia prueba: esta
// rebanada vertical no muestra valores de variables, solo el texto literal impreso.
export { Traza } from './traza/traza.ts';
export type { Cambio, ClasePaso, FinEjecucion, Paso, Segmento, Valor } from './traza/paso.ts';
export type { VistaPrograma } from './compilador.ts';
