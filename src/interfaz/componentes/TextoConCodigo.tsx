// Texto con código en línea (tarea 1.28, decisión del PO 2026-09-29). Presentacional puro: recibe
// los tramos ya segmentados por `presentacion` (`segmentarCodigoEnLinea`) y pinta cada tramo de
// código como `<code>`; el resto, como texto corriente. Los textos del catálogo es-MX marcan el
// código con comillas invertidas (`int[]`, `split`) y la pantalla nunca las muestra crudas. No agrega
// ningún elemento de bloque: se usa DENTRO de un párrafo (p. ej. el aviso de un problema).
import { Fragment } from 'react';
import type { SegmentoDeTexto } from '../../presentacion/index.ts';

export interface PropiedadesTextoConCodigo {
  readonly segmentos: readonly SegmentoDeTexto[];
}

export function TextoConCodigo({ segmentos }: PropiedadesTextoConCodigo) {
  return (
    <>
      {segmentos.map((segmento, indice) =>
        // El índice basta como key: los tramos de un mismo texto no se reordenan, se reemplazan
        // todos juntos cuando llega otro texto.
        segmento.tipo === 'codigo' ? (
          <code key={indice}>{segmento.texto}</code>
        ) : (
          <Fragment key={indice}>{segmento.texto}</Fragment>
        ),
      )}
    </>
  );
}
