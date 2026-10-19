// Deriva el modelo de vista de un Paso: sustitución, Detallado, explicación, resaltados
// (design.md §1.1). Puro, sin DOM. Puede importar motor/vista y textos. Contenido real desde el
// lote 4 (visualizador), con un adelanto mínimo en la tarea 0.14.
//
// Tarea 1.28 (decisión del PO 2026-09-29) adelantó aquí el TEXTO de cada problema (error, aviso o
// arranque inválido) con su línea y el código en línea segmentado; el ícono, el título y el
// subrayado siguen en la tarea 4.5.
export { segmentarCodigoEnLinea, type SegmentoDeTexto } from './segmentos-de-codigo.ts';
export { textoDelArranque, textoDelProblema } from './texto-del-problema.ts';
// Lote 4 (tareas 4.2 a 4.11): el modelo de vista que los componentes presentacionales reciben por `props` (design.md §6.1, ADR 013).
export { derivarModeloVista, type ContextoDePantalla, type EntradaModeloVista, type ModeloVista, type PosicionVista } from './modelo-vista.ts';
export { derivarRanura, puertasDelSaludo, type AccesorioDePuerta, type AccionDeFin, type IdDePuerta, type Puerta, type Ranura } from './ranura.ts';
export type { EstadoDeLaEjecucion, RobotVista } from './robot.ts';
export { derivarHablante, type EntradaDelHablante, type Hablante } from './hablante.ts';
export { armarGaleria, datosDeLaEntrada, etiquetaDeLaEntrada, type ArchivosCrudos, type GaleriaVista, type MuestraDeGaleria, type ProgramaDeGaleria, type SeccionDeGaleria } from './galeria.ts';
export type { Seccion } from './secciones.ts';
export type { VariableVista } from './variables.ts';
export type { CondicionVista, Evaluacion, Rama } from './condicion.ts';
export type { VueltaVista } from './vueltas.ts';
export type { BuferVista } from './bufer.ts';
export {
  derivarResaltados,
  resaltadosDelProblema,
  type EtiquetaDeVuelta,
  type RamaAtenuada,
  type ResaltadoDeProblema,
  type ResaltadosDelEditor,
} from './resaltados.ts';
