// RED de la tarea 0.14 (rebanada vertical — interfaz mínima, ADR 013 §6.3). Cubre lo que jsdom SÍ
// puede probar de verdad para CodeMirror 6: contenido controlado por props, el Compartment de
// solo lectura y (corrección del E2E de Firefox en CI, PR #1) que un eco atrasado de `onCambio` no
// pise lo tecleado — con transacciones iguales a las que CodeMirror aplica al teclear. La
// interacción real de teclado/pegado se prueba en pruebas/e2e/ (tarea 0.15) — ADR 013 ya anota
// que "los componentes con CodeMirror se prueban sobre todo en E2E porque jsdom no hace layout".
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import { EditorJava } from './EditorJava.tsx';

function vistaDe(contenedor: HTMLElement): EditorView {
  const vista = EditorView.findFromDOM(contenedor);
  if (!vista) throw new Error('No se encontró la vista de CodeMirror dentro del contenedor');
  return vista;
}

/**
 * Teclea `texto` al final del documento tal como CodeMirror aplica una tecla real después de leer
 * el DOM (transacción con `userEvent: 'input.type'`): pasa por el mismo `updateListener` que emite
 * `onCambio`. jsdom no hace layout para teclear de verdad en CodeMirror (ADR 013).
 */
function teclear(vista: EditorView, texto: string): void {
  const fin = vista.state.doc.length;
  vista.dispatch({
    changes: { from: fin, insert: texto },
    selection: { anchor: fin + texto.length },
    userEvent: 'input.type',
  });
}

/** Borra el último carácter como lo haría Retroceso (transacción `delete.backward`). */
function borrarUltimo(vista: EditorView): void {
  const fin = vista.state.doc.length;
  vista.dispatch({
    changes: { from: fin - 1, to: fin },
    selection: { anchor: fin - 1 },
    userEvent: 'delete.backward',
  });
}

function textoMostrado(contenedor: HTMLElement): string {
  return contenedor.querySelector('.cm-content')?.textContent ?? '';
}

describe('<EditorJava/>', () => {
  it('muestra el valor inicial como contenido del editor', () => {
    const { container } = render(<EditorJava valor="System.out.println(1);" onCambio={() => {}} />);
    expect(container.textContent).toContain('System.out.println(1);');
  });

  it('cuando el valor externo cambia (prop controlada), el contenido mostrado se actualiza', () => {
    const { container, rerender } = render(<EditorJava valor="uno" onCambio={() => {}} />);
    expect(container.textContent).toContain('uno');

    rerender(<EditorJava valor="dos, distinto" onCambio={() => {}} />);

    expect(container.textContent).toContain('dos, distinto');
    expect(container.textContent).not.toContain('uno');
  });

  // Causa raíz del E2E de Firefox en CI (PR #1): el contenedor devuelve como `valor` lo que el
  // propio editor emitió, pero React puede entregarlo TARDE — cuando el alumno ya tecleó más. Ese
  // eco atrasado NO es un cambio externo y no debe reemplazar el documento (se perdía la tecla).
  it('un eco atrasado de lo que el propio editor emitió no borra lo que se tecleó después', () => {
    const emitidos: string[] = [];
    const alCambiar = (nuevoValor: string) => {
      emitidos.push(nuevoValor);
    };
    const { container, rerender } = render(<EditorJava valor="ab" onCambio={alCambiar} />);
    const vista = vistaDe(container);

    teclear(vista, 'c');
    teclear(vista, 'd');
    expect(emitidos).toEqual(['abc', 'abcd']);

    // React entrega el eco de la PRIMERA tecla cuando el editor ya va en la segunda.
    rerender(<EditorJava valor="abc" onCambio={alCambiar} />);

    expect(textoMostrado(container)).toBe('abcd');
  });

  it('un valor externo igual a un texto que el editor ya emitió y React ya devolvió sí se aplica', () => {
    const sinUso = () => {};
    const { container, rerender } = render(<EditorJava valor="a" onCambio={sinUso} />);
    const vista = vistaDe(container);
    teclear(vista, 'b');
    rerender(<EditorJava valor="ab" onCambio={sinUso} />);
    teclear(vista, 'c');
    rerender(<EditorJava valor="abc" onCambio={sinUso} />);

    // El contenedor restaura una versión anterior (p. ej., «reiniciar»): ya no es un eco pendiente.
    rerender(<EditorJava valor="ab" onCambio={sinUso} />);

    expect(textoMostrado(container)).toBe('ab');
  });

  it('un cambio externo reemplaza el documento aunque haya ecos del editor todavía sin devolver', () => {
    const sinUso = () => {};
    const { container, rerender } = render(<EditorJava valor="ab" onCambio={sinUso} />);
    teclear(vistaDe(container), 'c');

    // Llega un programa de fuera (galería, enlace) antes que el eco de «abc».
    rerender(<EditorJava valor="otro programa" onCambio={sinUso} />);

    expect(textoMostrado(container)).toBe('otro programa');
  });

  it('con textos repetidos (teclear, borrar y volver a teclear) ningún eco atrasado borra lo tecleado', () => {
    const emitidos: string[] = [];
    const alCambiar = (nuevoValor: string) => {
      emitidos.push(nuevoValor);
    };
    const { container, rerender } = render(<EditorJava valor="x" onCambio={alCambiar} />);
    const vista = vistaDe(container);
    teclear(vista, 'y');
    borrarUltimo(vista);
    teclear(vista, 'y');
    expect(emitidos).toEqual(['xy', 'x', 'xy']);

    // React devuelve los tres ecos, uno por render, mientras el editor ya muestra «xy».
    rerender(<EditorJava valor="xy" onCambio={alCambiar} />);
    rerender(<EditorJava valor="x" onCambio={alCambiar} />);
    expect(textoMostrado(container)).toBe('xy');

    rerender(<EditorJava valor="xy" onCambio={alCambiar} />);
    expect(textoMostrado(container)).toBe('xy');
  });

  it('soloLectura desactiva la edición del contenido real de CodeMirror (Compartment, ADR 013)', () => {
    const { container, rerender } = render(
      <EditorJava valor="x" soloLectura={false} onCambio={() => {}} />,
    );
    const contenido = () => container.querySelector('.cm-content');
    expect(contenido()?.getAttribute('contenteditable')).toBe('true');

    rerender(<EditorJava valor="x" soloLectura onCambio={() => {}} />);

    expect(contenido()?.getAttribute('contenteditable')).toBe('false');
  });
});
