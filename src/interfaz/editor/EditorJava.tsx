// Editor de CodeMirror 6, de solo texto (design.md §1.2, §6.3; ADR 013). Presentacional puro:
// recibe `valor`/`soloLectura` y emite `onCambio`; no sabe nada de compilación ni de la traza. Los
// resaltados por `StateEffect` (línea ejecutada, subexpresión, rama no tomada…) llegan en el
// lote 4 — el `Compartment` de solo lectura ya queda armado desde esta rebanada porque lo necesita
// el propio flujo "edición → visualización" (design.md §6.2).
import { useEffect, useRef } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { java } from '@codemirror/lang-java';

export interface PropiedadesEditorJava {
  readonly valor: string;
  readonly soloLectura?: boolean;
  readonly onCambio?: (nuevoValor: string) => void;
}

export function EditorJava({ valor, soloLectura = false, onCambio }: PropiedadesEditorJava) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const vistaRef = useRef<EditorView | null>(null);
  const compartimientoSoloLecturaRef = useRef(new Compartment());
  const onCambioRef = useRef(onCambio);
  onCambioRef.current = onCambio;
  // Textos que este editor emitió por `onCambio` y que React todavía no devuelve como `valor`, en
  // el orden en que se emitieron (ver el efecto de `valor`, abajo).
  const emitidosPendientesRef = useRef<string[]>([]);

  // Se crea una sola vez: `valor`/`soloLectura` se sincronizan en los efectos de abajo (patrón
  // estándar de CodeMirror 6 dentro de React — el estado real vive en `EditorView`, no en React).
  useEffect(() => {
    if (!contenedorRef.current) return;
    const compartimientoSoloLectura = compartimientoSoloLecturaRef.current;
    const vista = new EditorView({
      state: EditorState.create({
        doc: valor,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          java(),
          compartimientoSoloLectura.of(EditorView.editable.of(!soloLectura)),
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
      effects: compartimientoSoloLecturaRef.current.reconfigure(
        EditorView.editable.of(!soloLectura),
      ),
    });
  }, [soloLectura]);

  return <div ref={contenedorRef} data-testid="editor-java" />;
}
