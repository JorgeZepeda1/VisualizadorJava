// API de presentación del motor (design.md §1.2): Traza y los tipos de Paso/VistaPrograma. Es lo
// único del motor que las capas `textos`/`presentacion`/`interfaz` pueden importar (matriz de
// capas, herramientas/eslint/matriz-capas.ts) — nunca el índice completo. `formatearValorJava` se
// agrega cuando la primera tarea que lo necesite (lote 2/4) lo traiga con su propia prueba: esta
// rebanada vertical no muestra valores de variables, solo el texto literal impreso.
export { Traza } from './traza/traza.ts';
export type { Cambio, ClasePaso, FinEjecucion, Paso, Segmento, Valor } from './traza/paso.ts';
export type { RamasDeIf, VistaPrograma } from './ir/vista-programa.ts';
export type { Rango } from './fuente/rango.ts';
// Hito 2A (arreglo c): el `Double.toString` EXACTO de Java (ADR 008), el mismo que escribe un `double` en la consola y en las explicaciones, para que la pantalla no use una aproximación.
// Se exporta del módulo hoja y no del índice de la biblioteca para que la interfaz no arrastre la biblioteca completa.
export { doubleATexto } from './biblioteca/formato/double-a-texto.ts';
// Tarea 2.19: las claves de explicación y sus datos (el catálogo `textos/es-MX/explicaciones.ts` los vuelve frases, ADR 015).
export type { ClaveExplicacion, DatosPorClave, DiagnosticoDeCiclo, ExplicacionPaso, LecturaExplicada, TipoDeCiclo } from './traza/explicacion.ts';
// Tarea 2.19: lo que se ve en cada paso (línea, variables a la vista, salida acumulada), reconstruido de los pasos con `Traza.instantaneaEn` / `instantaneaEn`.
export type { InstantaneaDeEjecucion, VariableDeInstantanea } from './traza/estado.ts';
// Tarea 2.16: lo que la vista dice de cada nodo y de cada variable (la presentación lo lee para resaltar líneas y mostrar variables).
export type { NodoIr, PuntoDelPlan, RanuraIr, TipoIr } from './ir/ir.ts';
// Tarea 1.11: el catálogo de textos (`src/textos/es-MX/problemas.ts`, ADR 015) necesita estos
// tipos para tipar sus funciones por sus datos — nunca el motor completo, solo las formas.
export type { Categoria, CodigoProblema, Problema } from './problemas.ts';
// Tarea 1.28: `Problema` es una unión discriminada por `categoria` con el código estrechado por
// categoría y los datos EXACTOS de cada código — `DatosPorCodigoProblema` es la única fuente de
// verdad de esa forma (movida aquí desde el catálogo de textos, como 1.25 hizo con los avisos), y
// la usan el catálogo (`textos/es-MX/problemas.ts`) y la presentación (`texto-del-problema.ts`).
export type { DatosPorCodigoProblema, ProblemaDeCompilacion, ProblemaNoDisponible } from './problemas.ts';
// Tarea 1.15: idem para el catálogo de arranque (`src/textos/es-MX/arranque.ts`, ADR 015).
export type { CodigoArranque, ProblemaArranque } from './problemas.ts';
export type { Tipo } from './semantica/tipos.ts';
// Tarea 1.24: idem para el catálogo de avisos "no soportado" (`src/textos/es-MX/no-soportado.ts`,
// ADR 015) — la unión CERRADA de `motor/no-soportado.ts`, única fuente de verdad de estos códigos.
// Tarea 1.25: también `DatosPorCodigoNoSoportado` — la forma EXACTA de datos que cada código exige,
// para que el catálogo de textos tipe su argumento con el MISMO contrato que ya exige a los
// emisores del motor (una sola fuente de verdad de la forma, nunca dos listas que puedan divergir).
export type { CodigoNoSoportado, DatosPorCodigoNoSoportado } from './no-soportado.ts';
