// Editor de CodeMirror 6 (tareas 0.14, 4.3 y 4.4; design.md §1.2, §6.3; ADR 013). Presentacional puro: recibe `valor`, `soloLectura`, `resaltados` y `problema` y emite `onCambio`; no sabe nada de
// compilación ni de la traza. Extensiones (§6.3): números de línea, historial, sangría al pulsar Enter, correspondencia de llaves, resaltado de sintaxis de Java (`lang-java` solo resalta; el
// análisis es del motor), caracteres invisibles a la vista (lo que el alumno pega desde una página o un PDF), un `Compartment` de solo lectura (en visualización) y el campo de resaltados
// (`./resaltados.ts`). Tab NO se captura (sin `indentWithTab`): sin trampa de teclado, WCAG 2.1.2.
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { Compartment, EditorState, type Extension, type StateEffect } from '@codemirror/state';
import { EditorView, highlightSpecialChars, keymap, lineNumbers } from '@codemirror/view';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { java } from '@codemirror/lang-java';
import type { ResaltadoDeProblema, ResaltadosDelEditor } from '../../presentacion/index.ts';
import { textosPaneles } from '../../textos/es-MX/paneles.ts';
import { resaltadoDeJava } from './resaltado-de-java.ts';
import { establecerResaltados, extensionDeResaltados } from './resaltados.ts';

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
  readonly ref?: Ref<ManejadorDelEditor>;
}

/** Los espacios invisibles que más se pegan desde una página web (el de no separación y los de ancho fijo); los demás invisibles ya los marca CodeMirror. */
const ESPACIOS_ESPECIALES = /[\u00a0\u2000-\u200a\u202f\u205f\u3000]/;

/**
 * Editable o de solo lectura. El código es SIEMPRE enfocable (`tabindex="0"`): es una región desplazable y quien usa solo teclado debe poder desplazarla (WCAG 2.1.1; axe `scrollable-region-focusable`). En solo
 * lectura (durante la visualización) hace falta porque el contenido deja de ser `contenteditable`; en edición también, porque axe NO cuenta `contenteditable` como enfocable y marcaba una falla grave en
 * `.cm-scroller` en cuanto el programa era más alto que el editor (el panel 1 la vio en el estado de error, C4).
 */
function extensionesDeEdicion(soloLectura: boolean): Extension {
  return [EditorView.editable.of(!soloLectura), EditorView.contentAttributes.of({ tabindex: '0' })];
}

function caracterEspecial(codigo: number, _descripcion: string | null, marcador: string): HTMLElement {
  const marca = document.createElement('span');
  marca.className = 'cm-specialChar';
  marca.textContent = marcador;
  marca.title = textosPaneles.editor.caracterEspecial(codigo);
  return marca;
}

export function EditorJava({ valor, soloLectura = false, onCambio, resaltados = null, problema = null, ref }: PropiedadesEditorJava) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const vistaRef = useRef<EditorView | null>(null);
  const compartimientoSoloLecturaRef = useRef(new Compartment());
  const onCambioRef = useRef(onCambio);
  onCambioRef.current = onCambio;
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
          compartimientoSoloLectura.of(extensionesDeEdicion(soloLectura)),
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
      effects: compartimientoSoloLecturaRef.current.reconfigure(extensionesDeEdicion(soloLectura)),
    });
  }, [soloLectura]);

  // Los resaltados llegan por `StateEffect` (design.md §6.3): se reemplazan completos cada vez que cambian. El contenedor los deriva en cada render (objetos nuevos), así que se compara por
  // contenido: nada se vuelve a mandar —ni se vuelve a desplazar el código— mientras lo marcado sea lo mismo (p. ej., al teclear un dato en la consola).
  const claveDeResaltados = JSON.stringify([resaltados, problema]);
  useEffect(() => {
    const vista = vistaRef.current;
    if (!vista) return;
    const { lineas, problema: delProblema } = resaltadosRef.current;
    const efectos: StateEffect<unknown>[] = [establecerResaltados.of({ lineas, problema: delProblema })];
    // El código largo se desplaza para que la línea que se marca quede a la vista.
    const linea = lineas?.lineaEjecutada ?? lineas?.lineaSiguiente ?? delProblema?.linea ?? null;
    if (linea !== null && linea >= 1 && linea <= vista.state.doc.lines) {
      efectos.push(EditorView.scrollIntoView(vista.state.doc.line(linea).from, { y: 'nearest', yMargin: 48 }));
    }
    vista.dispatch({ effects: efectos });
  }, [claveDeResaltados]);

  return <div ref={contenedorRef} data-testid="editor-java" />;
}
