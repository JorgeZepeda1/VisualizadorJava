// Sangría colgante de las líneas partidas (tarea R0.12, REQ-AULA-004, ADR 017): en el modo proyector una línea que no cabe en la columna del código se parte en dos o más renglones (a 24 píxeles en 1024 px de
// ancho una línea de 53 caracteres no cabe). Sin ayuda, las filas de continuación arrancan en la columna 0 y parecen otra línea del programa. Aquí cada línea con sangría lleva su cuenta de columnas en la variable
// CSS `--sangria`; la hoja de estilos (`estilos/proyector.css`) la convierte en margen y sangría negativa para que las continuaciones sigan la sangría de SU línea. Solo se agrega junto con el ajuste de línea.
import { RangeSetBuilder, type Extension } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';

/** Cuántas columnas ocupa la sangría de una línea: cada espacio, una; cada tabulador, hasta el siguiente múltiplo del tamaño de tabulación. */
function columnasDeSangria(texto: string, tamanioDeTabulador: number): number {
  let columnas = 0;
  for (const caracter of texto) {
    if (caracter === ' ') columnas += 1;
    else if (caracter === '\t') columnas += tamanioDeTabulador - (columnas % tamanioDeTabulador);
    else break;
  }
  return columnas;
}

function decorarLasLineas(vista: EditorView): DecorationSet {
  const construccion = new RangeSetBuilder<Decoration>();
  const tamanioDeTabulador = vista.state.tabSize;
  let ultimaLinea = 0;
  for (const { from, to } of vista.visibleRanges) {
    for (let posicion = from; posicion <= to; ) {
      const linea = vista.state.doc.lineAt(posicion);
      posicion = linea.to + 1;
      if (linea.number <= ultimaLinea) continue;
      ultimaLinea = linea.number;
      const columnas = columnasDeSangria(linea.text, tamanioDeTabulador);
      if (columnas > 0) construccion.add(linea.from, linea.from, Decoration.line({ attributes: { style: `--sangria: ${columnas}` } }));
    }
  }
  return construccion.finish();
}

export const sangriaColgante: Extension = ViewPlugin.fromClass(
  class {
    decoraciones: DecorationSet;

    constructor(vista: EditorView) {
      this.decoraciones = decorarLasLineas(vista);
    }

    update(actualizacion: ViewUpdate): void {
      if (actualizacion.docChanged || actualizacion.viewportChanged) this.decoraciones = decorarLasLineas(actualizacion.view);
    }
  },
  { decorations: (plugin) => plugin.decoraciones },
);
