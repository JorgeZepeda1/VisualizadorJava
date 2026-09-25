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
              onCambioRef.current?.(actualizacion.state.doc.toString());
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

  // Mantiene el editor controlado: si `valor` cambia por fuera (galería, enlace, reiniciar), lo
  // refleja sin perder el historial de deshacer si el texto no cambió realmente.
  useEffect(() => {
    const vista = vistaRef.current;
    if (!vista) return;
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
