// API de presentación del motor (design.md §1.2): Traza y los tipos de Paso/VistaPrograma. Es lo
// único del motor que las capas `textos`/`presentacion`/`interfaz` pueden importar (matriz de
// capas, herramientas/eslint/matriz-capas.ts) — nunca el índice completo. `formatearValorJava` se
// agrega cuando la primera tarea que lo necesite (lote 2/4) lo traiga con su propia prueba: esta
// rebanada vertical no muestra valores de variables, solo el texto literal impreso.
export { Traza } from './traza/traza.ts';
export type { Cambio, ClasePaso, FinEjecucion, Paso, Segmento, Valor } from './traza/paso.ts';
export type { VistaPrograma } from './compilador.ts';
// Tarea 1.11: el catálogo de textos (`src/textos/es-MX/problemas.ts`, ADR 015) necesita estos
// tipos para tipar sus funciones por sus datos — nunca el motor completo, solo las formas.
export type { Categoria, CodigoProblema, Problema } from './problemas.ts';
// Tarea 1.15: idem para el catálogo de arranque (`src/textos/es-MX/arranque.ts`, ADR 015).
export type { CodigoArranque, ProblemaArranque } from './problemas.ts';
export type { Tipo } from './semantica/tipos.ts';
// Tarea 1.24: idem para el catálogo de avisos "no soportado" (`src/textos/es-MX/no-soportado.ts`,
// ADR 015) — la unión CERRADA de `motor/no-soportado.ts`, única fuente de verdad de estos códigos.
// Tarea 1.25: también `DatosPorCodigoNoSoportado` — la forma EXACTA de datos que cada código exige,
// para que el catálogo de textos tipe su argumento con el MISMO contrato que ya exige a los
// emisores del motor (una sola fuente de verdad de la forma, nunca dos listas que puedan divergir).
export type { CodigoNoSoportado, DatosPorCodigoNoSoportado } from './no-soportado.ts';
