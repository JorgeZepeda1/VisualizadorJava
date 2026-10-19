// Partido de líneas del modo proyector (tarea R0.12, REQ-AULA-004, ADR 017; correcciones del panel R0, diseñador «Antes de publicar» 3): en el modo proyector una línea que no cabe en la columna del código se
// parte en dos o más renglones (a 24 píxeles en 1024 px de ancho una línea de 53 caracteres no cabe). Sin ayuda, el partido sale mal de tres maneras, y esta extensión corrige las tres:
//   1. Las filas de continuación arrancan en la columna 0 y parecen otra línea del programa. Cada línea con sangría lleva su cuenta de columnas en la variable CSS `--sangria`; la hoja de estilos
//      (`estilos/proyector.css`) la convierte en margen y sangría negativa para que la continuación quede 2 columnas MÁS adentro que la línea (sangría colgante).
//   2. Un renglón numerado queda vacío: el navegador puede cortar justo después de la sangría (los espacios son un punto de corte) y la primera fila queda solo con espacios. La sangría se marca con
//      `cm-sangria`, y la hoja le pone un «unidor de palabras» (U+2060) al final: ahí no se corta.
//   3. Una palabra se parte por la mitad («Cantida|d»): `System.out.print("Cantidad` no tiene ningún punto de corte, así que el navegador lo corta donde cae. Después de cada `.` y de cada `(` hay un punto de
//      corte posible (`cm-corte`, con un espacio de ancho cero al final), así que se corta ahí y no dentro de una palabra.
// Los marcadores son decoraciones de CodeMirror y el contenido de la hoja de estilos es generado: no cambian el programa, ni el cursor, ni lo que se copia. Solo se agrega junto con el ajuste de línea.
import { RangeSetBuilder, type Extension } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';

const MARCA_DE_SANGRIA = Decoration.mark({ class: 'cm-sangria' });
const MARCA_DE_CORTE = Decoration.mark({ class: 'cm-corte' });

/** Cuántas columnas ocupa la sangría de una línea y cuántos caracteres mide: cada espacio, una columna; cada tabulador, hasta el siguiente múltiplo del tamaño de tabulación. */
function medirLaSangria(texto: string, tamanioDeTabulador: number): { readonly columnas: number; readonly caracteres: number } {
  let columnas = 0;
  let caracteres = 0;
  for (const caracter of texto) {
    if (caracter === ' ') columnas += 1;
    else if (caracter === '\t') columnas += tamanioDeTabulador - (columnas % tamanioDeTabulador);
    else break;
    caracteres += 1;
  }
  return { columnas, caracteres };
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
      const { columnas, caracteres } = medirLaSangria(linea.text, tamanioDeTabulador);
      // Las decoraciones de una línea se agregan en orden: la variable de la línea, la sangría y luego cada punto de corte de izquierda a derecha.
      if (columnas > 0) construccion.add(linea.from, linea.from, Decoration.line({ attributes: { style: `--sangria: ${columnas}` } }));
      // Una línea de pura sangría no tiene nada que unir.
      if (caracteres > 0 && caracteres < linea.text.length) construccion.add(linea.from, linea.from + caracteres, MARCA_DE_SANGRIA);
      for (let indice = caracteres; indice < linea.text.length; indice += 1) {
        const caracter = linea.text.charAt(indice);
        if (caracter === '.' || caracter === '(') construccion.add(linea.from + indice, linea.from + indice + 1, MARCA_DE_CORTE);
      }
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
