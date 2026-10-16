// Código en línea dentro de un texto del catálogo es-MX (tarea 1.28). Los textos marcan el código
// con comillas invertidas (`int[]`, `split`); la pantalla NO las muestra crudas: esta función pura
// parte el texto en tramos — texto corriente / código — y `interfaz` pinta cada tramo de código
// como `<code>` (ADR 015: el catálogo arma la frase, la presentación decide cómo se ve).
//
// Regla: un tramo de código es `` `algo` `` con al menos un carácter y sin otra comilla invertida
// adentro. Cualquier comilla invertida que no forme pareja así (una suelta, la tercera de tres, un
// par vacío "``") queda como texto literal, sin perder ni inventar un carácter: p. ej. la comilla
// que el alumno tecleó por error y que el propio motor cita en su mensaje.

export interface SegmentoDeTexto {
  readonly tipo: 'texto' | 'codigo';
  /** El contenido del tramo, sin las comillas invertidas que marcaban el código. */
  readonly texto: string;
}

const CODIGO_EN_LINEA = /`([^`]+)`/g;

export function segmentarCodigoEnLinea(texto: string): readonly SegmentoDeTexto[] {
  const segmentos: SegmentoDeTexto[] = [];
  let desde = 0;
  for (const coincidencia of texto.matchAll(CODIGO_EN_LINEA)) {
    if (coincidencia.index > desde) {
      segmentos.push({ tipo: 'texto', texto: texto.slice(desde, coincidencia.index) });
    }
    segmentos.push({ tipo: 'codigo', texto: coincidencia[1] });
    desde = coincidencia.index + coincidencia[0].length;
  }
  if (desde < texto.length) {
    segmentos.push({ tipo: 'texto', texto: texto.slice(desde) });
  }
  return segmentos;
}
