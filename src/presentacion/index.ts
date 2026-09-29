// Deriva el modelo de vista de un Paso: sustitución, Detallado, explicación, resaltados
// (design.md §1.1). Puro, sin DOM. Puede importar motor/vista y textos. Contenido real desde el
// lote 4 (visualizador), con un adelanto mínimo en la tarea 0.14.
//
// Tarea 1.28 (decisión del PO 2026-09-29) adelantó aquí el TEXTO de cada problema (error, aviso o
// arranque inválido) con su línea y el código en línea segmentado; el ícono, el título y el
// subrayado siguen en la tarea 4.5.
export { segmentarCodigoEnLinea, type SegmentoDeTexto } from './segmentos-de-codigo.ts';
export { textoDelArranque, textoDelProblema } from './texto-del-problema.ts';
