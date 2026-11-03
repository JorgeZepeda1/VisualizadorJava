// Editor de CodeMirror 6 (tareas 0.14, 4.3 y 4.4; design.md §1.2, §6.3; ADR 013). Presentacional puro: recibe `valor`, `soloLectura`, `resaltados` y `problema` y emite `onCambio`; no sabe nada de
// compilación ni de la traza. Extensiones (§6.3): números de línea, historial, sangría al pulsar Enter, correspondencia de llaves, resaltado de sintaxis de Java (`lang-java` solo resalta; el
// análisis es del motor), caracteres invisibles a la vista (lo que el alumno pega desde una página o un PDF), un `Compartment` de solo lectura (en visualización) y el campo de resaltados
// (`./resaltados.ts`). Tab NO se captura (sin `indentWithTab`): sin trampa de teclado, WCAG 2.1.2.
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { Compartment, EditorSelection, EditorState, Prec, type Extension, type StateEffect } from '@codemirror/state';
import { EditorView, highlightSpecialChars, keymap, lineNumbers } from '@codemirror/view';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { java } from '@codemirror/lang-java';
import type { ResaltadoDeProblema, ResaltadosDelEditor } from '../../presentacion/index.ts';
import { textosPaneles } from '../../textos/es-MX/paneles.ts';
import { resaltadoDeJava } from './resaltado-de-java.ts';
import { establecerResaltados, extensionDeResaltados } from './resaltados.ts';
import { sangriaColgante } from './sangria-colgante.ts';

/** Lo que el contenedor puede pedirle al editor desde fuera: llevar el foco a él (p. ej. al volver de la visualización a la edición, o a la línea de un error de compilación). */
export interface ManejadorDelEditor {
  /** Enfoca el editor. Con `linea` (1 en adelante, si existe en el código) pone además el cursor al inicio de esa línea y la deja a la vista. */
  enfocar(linea?: number): void;
}

export interface PropiedadesEditorJava {
  readonly valor: string;
  readonly soloLectura?: boolean;
  readonly onCambio?: (nuevoValor: string) => void;
  /** La línea recién ejecutada, la siguiente y las etiquetas de vuelta (REQ-VIS-004, REQ-VIS-007). */
  readonly resaltados?: ResaltadosDelEditor | null;
  /** El error o aviso que se subraya sobre su rango (REQ-VIS-002). */
  readonly problema?: ResaltadoDeProblema | null;
  /** Con el editor en solo lectura (durante la visualización), el alumno pulsó una tecla que intentaría ESCRIBIR: el contenedor le dice cómo cambiar el código (REQ-PANT-004, panel 1 H9). */
  readonly alIntentarEditar?: () => void;
  /** El modo proyector parte las líneas largas en dos renglones en vez de desplazarlas (REQ-AULA-004): a 24 píxeles en 1024×768 una línea de 53 caracteres no cabe. El número de línea sale una sola vez. */
  readonly ajusteDeLinea?: boolean;
  readonly ref?: Ref<ManejadorDelEditor>;
}

/** Los espacios invisibles que más se pegan desde una página web (el de no separación y los de ancho fijo); los demás invisibles ya los marca CodeMirror. */
const ESPACIOS_ESPECIALES = /[\u00a0\u2000-\u200a\u202f\u205f\u3000]/;

/** El ajuste de línea del modo proyector: parte las líneas largas y las filas de continuación siguen la sangría de su línea. */
function extensionesDeAjuste(ajusteDeLinea: boolean): Extension {
  return ajusteDeLinea ? [EditorView.lineWrapping, sangriaColgante] : [];
}

/** La consulta de pantalla de celular: la misma que usa la hoja de estilos para poner el código en ≈ 35 % del alto y la barra de acciones abajo (`estilos/aplicacion.css`). */
const PANTALLA_DE_CELULAR = '(max-width: 43.75rem)';

/** ¿Es una tecla que intentaría escribir? Letras, números y símbolos (también con AltGr, que llega como Ctrl+Alt), Enter, Retroceso y Suprimir. NO el espacio (en solo lectura reproduce o pausa), ni las flechas, Tab, Escape, Inicio, Fin, ni los atajos con Ctrl o Cmd. */
function intentaEscribir(evento: KeyboardEvent): boolean {
  if (evento.key === ' ' || evento.metaKey) return false;
  if (evento.key === 'Enter' || evento.key === 'Backspace' || evento.key === 'Delete') return !evento.ctrlKey && !evento.altKey;
  return evento.key.length === 1 && (!evento.ctrlKey || evento.altKey);
}

/**
 * Editable o de solo lectura. El código es SIEMPRE enfocable (`tabindex="0"`): es una región desplazable y quien usa solo teclado debe poder desplazarla (WCAG 2.1.1; axe `scrollable-region-focusable`). En solo
 * lectura (durante la visualización) hace falta porque el contenido deja de ser `contenteditable`; en edición también, porque axe NO cuenta `contenteditable` como enfocable y marcaba una falla grave en
 * `.cm-scroller` en cuanto el programa era más alto que el editor (el panel 1 la vio en el estado de error, C4).
 */
function extensionesDeEdicion(soloLectura: boolean, alIntentarEditar: () => void): Extension {
  return [
    EditorView.editable.of(!soloLectura),
    // `editable: false` solo quita el `contenteditable`; los comandos del teclado (Enter, Retroceso…) seguirían cambiando el código y la traza ya no lo describiría. `readOnly` se los prohíbe.
    EditorState.readOnly.of(soloLectura),
    EditorView.contentAttributes.of({ tabindex: '0' }),
    // Solo en solo lectura: sin esto, teclear durante la visualización no hace nada y nada lo explica. Con la precedencia más alta, avisa antes de que ninguna otra tecla actúe.
    ...(soloLectura
      ? [
          Prec.highest(
            EditorView.domEventHandlers({
              keydown: (evento) => {
                if (intentaEscribir(evento)) alIntentarEditar();
                return false;
              },
            }),
          ),
        ]
      : []),
  ];
}

function caracterEspecial(codigo: number, _descripcion: string | null, marcador: string): HTMLElement {
  const marca = document.createElement('span');
  marca.className = 'cm-specialChar';
  marca.textContent = marcador;
  marca.title = textosPaneles.editor.caracterEspecial(codigo);
  return marca;
}

export function EditorJava({ valor, soloLectura = false, onCambio, resaltados = null, problema = null, alIntentarEditar, ajusteDeLinea = false, ref }: PropiedadesEditorJava) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const vistaRef = useRef<EditorView | null>(null);
  const compartimientoSoloLecturaRef = useRef(new Compartment());
  const compartimientoAjusteRef = useRef(new Compartment());
  const onCambioRef = useRef(onCambio);
  onCambioRef.current = onCambio;
  const alIntentarEditarRef = useRef(alIntentarEditar);
  alIntentarEditarRef.current = alIntentarEditar;
  /** Lo que el compartimiento de solo lectura llama: siempre la versión más reciente, sin tener que reconfigurar el editor. */
  const intentoDeEditar = useRef(() => alIntentarEditarRef.current?.()).current;
  // Textos que este editor emitió por `onCambio` y que React todavía no devuelve como `valor`, en
  // el orden en que se emitieron (ver el efecto de `valor`, abajo).
  const emitidosPendientesRef = useRef<string[]>([]);
  // Lo último que el contenedor pidió marcar: el editor lo aplica al crearse y cada vez que cambia.
  const resaltadosRef = useRef({ lineas: resaltados, problema });
  resaltadosRef.current = { lineas: resaltados, problema };

  useImperativeHandle(
    ref,
    () => ({
      enfocar: (linea) => {
        const vista = vistaRef.current;
        if (!vista) return;
        // El cursor va al inicio de la línea pedida (si existe en el código de ahora) y esa línea queda a la vista; una línea que no existe no mueve nada.
        if (linea !== undefined && Number.isInteger(linea) && linea >= 1 && linea <= vista.state.doc.lines) {
          vista.dispatch({ selection: { anchor: vista.state.doc.line(linea).from }, scrollIntoView: true });
        }
        vista.focus();
      },
    }),
    [],
  );

  // Se crea una sola vez: `valor`/`soloLectura` se sincronizan en los efectos de abajo (patrón
  // estándar de CodeMirror 6 dentro de React — el estado real vive en `EditorView`, no en React).
  useEffect(() => {
    if (!contenedorRef.current) return;
    const compartimientoSoloLectura = compartimientoSoloLecturaRef.current;
    const vista = new EditorView({
      state: EditorState.create({
        doc: valor,
        extensions: [
          extensionDeResaltados(),
          lineNumbers(),
          highlightSpecialChars({ addSpecialChars: ESPACIOS_ESPECIALES, render: caracterEspecial }),
          history(),
          indentOnInput(),
          bracketMatching(),
          resaltadoDeJava,
          keymap.of([...defaultKeymap, ...historyKeymap]),
          java(),
          // Sin nombre, un lector de pantalla anuncia un cuadro de texto sin decir de qué.
          EditorView.contentAttributes.of({ 'aria-label': textosPaneles.editor.etiqueta() }),
          compartimientoSoloLectura.of(extensionesDeEdicion(soloLectura, intentoDeEditar)),
          compartimientoAjusteRef.current.of(extensionesDeAjuste(ajusteDeLinea)),
          EditorView.updateListener.of((actualizacion) => {
            if (actualizacion.docChanged) {
              const texto = actualizacion.state.doc.toString();
              emitidosPendientesRef.current.push(texto);
              onCambioRef.current?.(texto);
            }
          }),
        ],
      }),
      parent: contenedorRef.current,
    });
    vistaRef.current = vista;
    vista.dispatch({ effects: establecerResaltados.of(resaltadosRef.current) });
    return () => {
      vista.destroy();
      vistaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantiene el editor controlado SIN pisar lo que el alumno teclea. `valor` llega por dos caminos:
  //   - el eco de lo que este mismo editor emitió por `onCambio` — React puede entregarlo TARDE, con
  //     más teclas ya aplicadas en el documento (causa raíz del E2E de Firefox en CI, PR #1:
  //     comparar ese eco atrasado con el documento vivo y reemplazarlo borraba la última tecla);
  //   - un cambio externo real (galería, enlace, reiniciar), que sí reemplaza el documento.
  // Si `valor` es uno de los textos pendientes, es un eco: se descarta junto con lo emitido antes
  // y el documento no se toca. Se busca el PRIMERO (`indexOf`) a propósito: con textos repetidos
  // (teclear, borrar, volver a teclear) nunca descarta un eco que todavía puede llegar.
  useEffect(() => {
    const vista = vistaRef.current;
    if (!vista) return;
    const pendientes = emitidosPendientesRef.current;
    const indiceDelEco = pendientes.indexOf(valor);
    if (indiceDelEco >= 0) {
      pendientes.splice(0, indiceDelEco + 1);
      return;
    }
    // Cambio externo: lo emitido antes queda reemplazado y ya no puede volver como eco.
    pendientes.length = 0;
    const actual = vista.state.doc.toString();
    if (actual !== valor) {
      vista.dispatch({ changes: { from: 0, to: actual.length, insert: valor } });
    }
  }, [valor]);

  // Compartment de solo lectura (design.md §6.3, ADR 013): se reconfigura sin recrear el editor.
  useEffect(() => {
    const vista = vistaRef.current;
    if (!vista) return;
    vista.dispatch({
      effects: compartimientoSoloLecturaRef.current.reconfigure(extensionesDeEdicion(soloLectura, intentoDeEditar)),
    });
  }, [soloLectura, intentoDeEditar]);

  // Compartment del ajuste de línea (modo proyector): se reconfigura sin recrear el editor, así la traza y el programa no se pierden al encender el proyector. Partir las líneas y agrandar la letra cambia
  // el alto de todo el código: el desplazamiento de antes ya no apunta a la línea de ahora, así que se vuelve a centrar la que se marcó (si hay una).
  useEffect(() => {
    const vista = vistaRef.current;
    if (!vista) return;
    const efectos: StateEffect<unknown>[] = [compartimientoAjusteRef.current.reconfigure(extensionesDeAjuste(ajusteDeLinea))];
    const { lineas, problema: delProblema } = resaltadosRef.current;
    const linea = lineas?.lineaEjecutada ?? lineas?.lineaSiguiente ?? delProblema?.linea ?? null;
    if (linea !== null && linea >= 1 && linea <= vista.state.doc.lines) {
      efectos.push(EditorView.scrollIntoView(vista.state.doc.line(linea).from, { y: 'center' }));
    }
    vista.dispatch({ effects: efectos });
  }, [ajusteDeLinea]);

  // Los resaltados llegan por `StateEffect` (design.md §6.3): se reemplazan completos cada vez que cambian. El contenedor los deriva en cada render (objetos nuevos), así que se compara por
  // contenido: nada se vuelve a mandar —ni se vuelve a desplazar el código— mientras lo marcado sea lo mismo (p. ej., al teclear un dato en la consola).
  const claveDeResaltados = JSON.stringify([resaltados, problema]);
  useEffect(() => {
    const vista = vistaRef.current;
    if (!vista) return;
    const { lineas, problema: delProblema } = resaltadosRef.current;
    const efectos: StateEffect<unknown>[] = [establecerResaltados.of({ lineas, problema: delProblema })];
    // El código largo se desplaza para que la línea que se marca quede a la vista; en un celular, donde el editor ocupa ≈ 35 % del alto, queda en el CENTRO (REQ-PANT-005). Se pide el rango de la línea ENTERA
    // (no solo su inicio): con el ajuste de línea del proyector una línea ocupa varios renglones y su etiqueta queda al final del último. La CABEZA del rango es el inicio (`range(to, from)`): si la línea es más ancha
    // que el editor (un celular, sin ajuste de línea) manda el inicio y el código no se desplaza de lado, en vez de dejar el principio cortado.
    const linea = lineas?.lineaEjecutada ?? lineas?.lineaSiguiente ?? delProblema?.linea ?? null;
    if (linea !== null && linea >= 1 && linea <= vista.state.doc.lines) {
      const enCelular = typeof window.matchMedia === 'function' && window.matchMedia(PANTALLA_DE_CELULAR).matches;
      const { from, to } = vista.state.doc.line(linea);
      efectos.push(EditorView.scrollIntoView(EditorSelection.range(to, from), { y: enCelular ? 'center' : 'nearest', yMargin: 48 }));
    }
    vista.dispatch({ effects: efectos });
  }, [claveDeResaltados]);

  return <div ref={contenedorRef} data-testid="editor-java" />;
}
