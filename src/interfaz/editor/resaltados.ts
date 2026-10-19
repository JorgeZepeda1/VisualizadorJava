// Los resaltados del editor (tarea 4.4, REQ-VIS-004, REQ-VIS-002, REQ-VIS-007, design.md §6.3): un `StateField` que recibe por `StateEffect` lo que la presentación derivó y lo convierte en
// decoraciones de CodeMirror. La línea recién ejecutada y la siguiente llevan DOS marcas distintas —una clase de línea (borde sólido o punteado) Y un símbolo en el margen (▶ o ▷)—, así que no
// dependen solo del color; el contador de vueltas es una etiqueta (*widget*) al final de la línea del ciclo; y un error o un aviso se subraya sobre su rango (ondulado o punteado) con ✖ o ⓘ
// en el margen. El editor es presentacional: este módulo no sabe de la traza ni del trabajador, solo de líneas y rangos. La rama del `if` que no se toma se atenúa con color suave Y cursiva Y una etiqueta en palabras
// (hito 2C, rangos de `VistaPrograma.ramasDeIf`).
import { StateEffect, StateField, type Extension, type Range, type Text } from '@codemirror/state';
import { Decoration, EditorView, GutterMarker, WidgetType, gutter, type DecorationSet } from '@codemirror/view';
import type { EtiquetaDeVuelta, ResaltadoDeProblema, ResaltadosDelEditor } from '../../presentacion/index.ts';
import { textosPaneles } from '../../textos/es-MX/paneles.ts';

export interface EstadoDeResaltados {
  readonly lineas: ResaltadosDelEditor | null;
  readonly problema: ResaltadoDeProblema | null;
}

export const SIN_RESALTADOS: EstadoDeResaltados = { lineas: null, problema: null };

/** Reemplaza TODO lo que el editor marca (lo anterior desaparece): el contenedor manda el estado completo cada vez. */
export const establecerResaltados = StateEffect.define<EstadoDeResaltados>();

interface ValorDelCampo {
  readonly estado: EstadoDeResaltados;
  readonly decoraciones: DecorationSet;
}

class EtiquetaDeVueltaDelEditor extends WidgetType {
  private readonly texto: string;
  constructor(texto: string) {
    super();
    this.texto = texto;
  }
  override eq(otra: EtiquetaDeVueltaDelEditor): boolean {
    return otra.texto === this.texto;
  }
  override toDOM(): HTMLElement {
    const etiqueta = document.createElement('span');
    etiqueta.className = 'cm-etiqueta-de-vuelta';
    etiqueta.textContent = this.texto;
    return etiqueta;
  }
}

/** La etiqueta en palabras que acompaña a la rama atenuada («✗ Java se salta este bloque»): el atenuado solo no basta, no se puede depender del color (REQ-PLAT-005). */
class EtiquetaDeRamaNoTomada extends WidgetType {
  private readonly texto: string;
  constructor(texto: string) {
    super();
    this.texto = texto;
  }
  override eq(otra: EtiquetaDeRamaNoTomada): boolean {
    return otra.texto === this.texto;
  }
  override toDOM(): HTMLElement {
    const etiqueta = document.createElement('span');
    etiqueta.className = 'cm-etiqueta-rama-no-tomada';
    etiqueta.textContent = this.texto;
    return etiqueta;
  }
}

function textoDeLaEtiqueta(etiqueta: EtiquetaDeVuelta): string {
  const base = textosPaneles.vueltas.etiquetaEnElEditor(etiqueta.vuelta);
  return etiqueta.termino ? `${base} (${textosPaneles.vueltas.yaTermino()})` : base;
}

function existe(documento: Text, linea: number | null): linea is number {
  return linea !== null && Number.isInteger(linea) && linea >= 1 && linea <= documento.lines;
}

function construirDecoraciones(estado: EstadoDeResaltados, documento: Text): DecorationSet {
  const rangos: Range<Decoration>[] = [];
  const { lineas, problema } = estado;

  if (lineas !== null) {
    const clasesPorLinea = new Map<number, string[]>();
    if (existe(documento, lineas.lineaEjecutada)) clasesPorLinea.set(lineas.lineaEjecutada, ['cm-linea-ejecutada']);
    if (existe(documento, lineas.lineaSiguiente)) {
      clasesPorLinea.set(lineas.lineaSiguiente, [...(clasesPorLinea.get(lineas.lineaSiguiente) ?? []), 'cm-linea-siguiente']);
    }
    for (const [linea, clases] of clasesPorLinea) {
      rangos.push(Decoration.line({ class: clases.join(' ') }).range(documento.line(linea).from));
    }
    for (const etiqueta of lineas.vueltas) {
      if (!existe(documento, etiqueta.linea)) continue;
      rangos.push(Decoration.widget({ widget: new EtiquetaDeVueltaDelEditor(textoDeLaEtiqueta(etiqueta)), side: 1 }).range(documento.line(etiqueta.linea).to));
    }
    // La rama del `if` que no se toma: el tramo se atenúa (nunca se oculta) y su primera línea lleva una etiqueta en palabras. Un rango que se pasa del programa se recorta; uno vacío no marca nada.
    const rama = lineas.ramaNoTomada;
    if (rama !== null) {
      const desde = Math.max(0, Math.min(rama.desde, documento.length));
      const hasta = Math.max(0, Math.min(rama.hasta, documento.length));
      if (hasta > desde) {
        rangos.push(Decoration.mark({ class: 'cm-rama-no-tomada' }).range(desde, hasta));
        rangos.push(Decoration.widget({ widget: new EtiquetaDeRamaNoTomada(textosPaneles.editor.ramaNoTomada()), side: 1 }).range(documento.lineAt(desde).to));
      }
    }
  }

  if (problema !== null && existe(documento, problema.linea)) {
    const linea = documento.line(problema.linea);
    const desde = Math.max(0, Math.min(problema.desde, documento.length));
    const hasta = Math.max(0, Math.min(problema.hasta, documento.length));
    // Un rango vacío (el motor no pudo señalar un tramo) subraya toda la línea.
    const [de, a] = hasta > desde ? [desde, hasta] : [linea.from, linea.to];
    if (a > de) {
      rangos.push(Decoration.mark({ class: problema.tipo === 'error' ? 'cm-problema-error' : 'cm-problema-aviso' }).range(de, a));
    }
  }

  return Decoration.set(rangos, true);
}

const campoDeResaltados = StateField.define<ValorDelCampo>({
  create: () => ({ estado: SIN_RESALTADOS, decoraciones: Decoration.none }),
  update(valor, transaccion) {
    let estado = valor.estado;
    for (const efecto of transaccion.effects) {
      if (efecto.is(establecerResaltados)) estado = efecto.value;
    }
    if (estado === valor.estado && !transaccion.docChanged) return valor;
    return { estado, decoraciones: construirDecoraciones(estado, transaccion.state.doc) };
  },
  provide: (campo) => EditorView.decorations.from(campo, (valor) => valor.decoraciones),
});

// --- El margen: un símbolo por marca, con texto accesible --------------------------------------------------------------------------------------------

class MarcaDeMargen extends GutterMarker {
  private readonly clase: string;
  private readonly simbolo: string;
  private readonly titulo: string;
  constructor(clase: string, simbolo: string, titulo: string) {
    super();
    this.clase = clase;
    this.simbolo = simbolo;
    this.titulo = titulo;
  }
  override eq(otra: MarcaDeMargen): boolean {
    return otra.clase === this.clase && otra.simbolo === this.simbolo;
  }
  override toDOM(): HTMLElement {
    const marca = document.createElement('span');
    marca.className = this.clase;
    marca.textContent = this.simbolo;
    marca.title = this.titulo;
    return marca;
  }
}

/** Un solo `GutterMarker` por línea: si la línea lleva varias marcas (p. ej. «recién ejecutada» y «siguiente»), las junta en un contenedor. */
class MarcasDeLinea extends GutterMarker {
  private readonly marcas: readonly MarcaDeMargen[];
  constructor(marcas: readonly MarcaDeMargen[]) {
    super();
    this.marcas = marcas;
  }
  override eq(otra: MarcasDeLinea): boolean {
    return otra.marcas.length === this.marcas.length && this.marcas.every((marca, indice) => marca.eq(otra.marcas[indice] as MarcaDeMargen));
  }
  override toDOM(): HTMLElement {
    const contenedor = document.createElement('span');
    contenedor.className = 'cm-marcas-juntas';
    for (const marca of this.marcas) contenedor.append(marca.toDOM());
    return contenedor;
  }
}

function marcasDeLaLinea(estado: EstadoDeResaltados, numeroDeLinea: number): readonly MarcaDeMargen[] {
  const marcas: MarcaDeMargen[] = [];
  const { lineas, problema } = estado;
  if (problema !== null && problema.linea === numeroDeLinea) {
    marcas.push(new MarcaDeMargen('cm-marca-problema', problema.tipo === 'error' ? '✖' : 'ⓘ', textosPaneles.avisos.titulo(problema.tipo === 'error' ? 'error-compilacion' : 'no-disponible')));
  }
  if (lineas?.lineaEjecutada === numeroDeLinea) {
    marcas.push(new MarcaDeMargen('cm-marca-ejecutada', '▶', textosPaneles.editor.lineaEjecutada()));
  }
  if (lineas?.lineaSiguiente === numeroDeLinea) {
    marcas.push(new MarcaDeMargen('cm-marca-siguiente', '▷', textosPaneles.editor.lineaSiguiente()));
  }
  return marcas;
}

const margenDeMarcas = gutter({
  class: 'cm-margen-de-marcas',
  lineMarker(vista, linea) {
    const numero = vista.state.doc.lineAt(linea.from).number;
    const marcas = marcasDeLaLinea(vista.state.field(campoDeResaltados).estado, numero);
    return marcas.length === 0 ? null : new MarcasDeLinea(marcas);
  },
  lineMarkerChange: (actualizacion) => actualizacion.transactions.some((transaccion) => transaccion.effects.some((efecto) => efecto.is(establecerResaltados))),
  // Reserva el ancho del margen aunque todavía no haya ninguna marca, para que el código no se corra al aparecer la primera.
  initialSpacer: () => new MarcasDeLinea([new MarcaDeMargen('cm-marca-reserva', '▶▷', '')]),
});

/** Las extensiones de CodeMirror que pintan los resaltados: el campo de decoraciones y el margen de marcas. */
export function extensionDeResaltados(): Extension {
  return [margenDeMarcas, campoDeResaltados];
}
