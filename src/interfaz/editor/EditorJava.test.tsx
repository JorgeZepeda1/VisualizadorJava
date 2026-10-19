// RED de la tarea 0.14 (rebanada vertical — interfaz mínima, ADR 013 §6.3). Cubre lo que jsdom SÍ
// puede probar de verdad para CodeMirror 6: contenido controlado por props, el Compartment de
// solo lectura y (corrección del E2E de Firefox en CI, PR #1) que un eco atrasado de `onCambio` no
// pise lo tecleado — con transacciones iguales a las que CodeMirror aplica al teclear. La
// interacción real de teclado/pegado se prueba en pruebas/e2e/ (tarea 0.15) — ADR 013 ya anota
// que "los componentes con CodeMirror se prueban sobre todo en E2E porque jsdom no hace layout".
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import { EditorJava, type ManejadorDelEditor } from './EditorJava.tsx';

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

// C4 del panel 1: tras un error de compilación el contenedor lleva el foco al editor, a la línea del error. `enfocar(linea)` pone el cursor al inicio de esa línea (y desplaza el código para que se vea); sin línea
// solo enfoca, como antes.
describe('<EditorJava/> — enfocar en una línea', () => {
  const TRES_LINEAS = 'uno\ndos\ntres';

  function conRef(): { container: HTMLElement; manejador: { current: ManejadorDelEditor | null } } {
    const manejador: { current: ManejadorDelEditor | null } = { current: null };
    const { container } = render(<EditorJava valor={TRES_LINEAS} ref={(m) => {
          manejador.current = m;
        }} />);
    return { container, manejador };
  }

  it('enfocar(2) deja el foco en el editor y el cursor al inicio de la línea 2', () => {
    const { container, manejador } = conRef();
    manejador.current?.enfocar(2);
    expect(document.activeElement).toBe(container.querySelector('.cm-content'));
    const vista = vistaDe(container);
    expect(vista.state.selection.main.head).toBe(vista.state.doc.line(2).from);
  });

  it('triangulación: enfocar(3) mueve el cursor a la línea 3', () => {
    const { container, manejador } = conRef();
    manejador.current?.enfocar(3);
    const vista = vistaDe(container);
    expect(vista.state.doc.lineAt(vista.state.selection.main.head).number).toBe(3);
  });

  it('una línea que no existe (el código cambió, o 0) no mueve el cursor, pero el foco sí llega al editor', () => {
    const { container, manejador } = conRef();
    const antes = vistaDe(container).state.selection.main.head;
    manejador.current?.enfocar(99);
    manejador.current?.enfocar(0);
    expect(vistaDe(container).state.selection.main.head).toBe(antes);
    expect(document.activeElement).toBe(container.querySelector('.cm-content'));
  });

  it('sin línea solo enfoca, sin mover el cursor', () => {
    const { container, manejador } = conRef();
    const antes = vistaDe(container).state.selection.main.head;
    manejador.current?.enfocar();
    expect(document.activeElement).toBe(container.querySelector('.cm-content'));
    expect(vistaDe(container).state.selection.main.head).toBe(antes);
  });
});

// R0.10 (REQ-PANT-004, panel 1 H9): teclear en el editor mientras se visualiza no hacía nada y nada lo explicaba. Con el editor en solo lectura, una tecla que intentaría ESCRIBIR avisa al contenedor
// (que dice «Para cambiar el código pulsa «Editar programa»»); las teclas de navegación y los atajos (flechas, Tab, Inicio, Fin, Escape, espacio, Ctrl/Cmd+algo) no avisan.
describe('<EditorJava/> — intentar escribir con el programa en solo lectura', () => {
  function contenido(contenedor: HTMLElement): Element {
    const nodo = contenedor.querySelector('.cm-content');
    if (nodo === null) throw new Error('No se encontró el contenido del editor');
    return nodo;
  }

  it('una letra, un número o un símbolo avisan que se intentó editar, y el código no cambia', () => {
    const alIntentarEditar = vi.fn();
    const { container } = render(<EditorJava valor="int x = 1;" soloLectura alIntentarEditar={alIntentarEditar} />);
    for (const key of ['a', '7', ';', 'ñ']) fireEvent.keyDown(contenido(container), { key });
    expect(alIntentarEditar).toHaveBeenCalledTimes(4);
    expect(textoMostrado(container)).toBe('int x = 1;');
  });

  it('Enter, Retroceso y Suprimir también son editar', () => {
    const alIntentarEditar = vi.fn();
    const { container } = render(<EditorJava valor="x" soloLectura alIntentarEditar={alIntentarEditar} />);
    for (const key of ['Enter', 'Backspace', 'Delete']) fireEvent.keyDown(contenido(container), { key });
    expect(alIntentarEditar).toHaveBeenCalledTimes(3);
    // y los comandos del teclado tampoco cambian el código mientras se visualiza (antes Enter o Retroceso lo modificaban aunque el editor no fuera editable)
    expect(textoMostrado(container)).toBe('x');
  });

  it('las flechas, Tab, Escape, Inicio, Fin, el espacio y los atajos con Ctrl o Cmd NO avisan: son navegación o del navegador', () => {
    const alIntentarEditar = vi.fn();
    const { container } = render(<EditorJava valor="x" soloLectura alIntentarEditar={alIntentarEditar} />);
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Escape', 'Home', 'End', 'PageUp', 'PageDown', ' ', 'Shift', 'F5']) {
      fireEvent.keyDown(contenido(container), { key });
    }
    fireEvent.keyDown(contenido(container), { key: 'c', ctrlKey: true });
    fireEvent.keyDown(contenido(container), { key: 'a', metaKey: true });
    expect(alIntentarEditar).not.toHaveBeenCalled();
  });

  it('con AltGr (Ctrl+Alt) se escribe un símbolo de verdad —«@» en un teclado en español—: sí avisa', () => {
    const alIntentarEditar = vi.fn();
    const { container } = render(<EditorJava valor="x" soloLectura alIntentarEditar={alIntentarEditar} />);
    fireEvent.keyDown(contenido(container), { key: '@', ctrlKey: true, altKey: true });
    expect(alIntentarEditar).toHaveBeenCalledTimes(1);
  });

  it('con el editor editable teclear es editar: no avisa nada', () => {
    const alIntentarEditar = vi.fn();
    const { container } = render(<EditorJava valor="x" alIntentarEditar={alIntentarEditar} />);
    fireEvent.keyDown(contenido(container), { key: 'a' });
    expect(alIntentarEditar).not.toHaveBeenCalled();
  });

  it('al pasar de editable a solo lectura (se pulsó «Visualizar») empieza a avisar, sin recrear el editor', () => {
    const alIntentarEditar = vi.fn();
    const { container, rerender } = render(<EditorJava valor="x" alIntentarEditar={alIntentarEditar} />);
    const antes = contenido(container);
    rerender(<EditorJava valor="x" soloLectura alIntentarEditar={alIntentarEditar} />);
    fireEvent.keyDown(contenido(container), { key: 'a' });
    expect(contenido(container)).toBe(antes);
    expect(alIntentarEditar).toHaveBeenCalledTimes(1);
  });

  it('sin la propiedad `alIntentarEditar` teclear en solo lectura no falla', () => {
    const { container } = render(<EditorJava valor="x" soloLectura />);
    expect(() => fireEvent.keyDown(contenido(container), { key: 'a' })).not.toThrow();
  });
});

// R0.12 (REQ-PANT-005, REQ-AULA-004, ADR 017): el proyector parte las líneas largas en vez de desplazarlas (a 24 píxeles en 1024×768 una línea de 53 caracteres no cabe) y el celular centra la línea
// actual en el 35 % de alto que le toca al código.
describe('<EditorJava/> — ajuste de línea para el proyector', () => {
  const LINEA_LARGA = 'System.out.println("Esta línea es larga y en proyector se parte en dos renglones");';

  it('con `ajusteDeLinea` el editor parte las líneas largas (sin desplazamiento horizontal)', () => {
    const { container } = render(<EditorJava valor={LINEA_LARGA} ajusteDeLinea />);
    expect(container.querySelector('.cm-content')?.classList.contains('cm-lineWrapping')).toBe(true);
  });

  it('sin él, las líneas largas se desplazan como siempre', () => {
    const { container } = render(<EditorJava valor={LINEA_LARGA} />);
    expect(container.querySelector('.cm-content')?.classList.contains('cm-lineWrapping')).toBe(false);
  });

  it('se enciende y se apaga con el modo proyector sin recrear el editor ni perder el programa', () => {
    const { container, rerender } = render(<EditorJava valor={LINEA_LARGA} />);
    const antes = container.querySelector('.cm-content');

    rerender(<EditorJava valor={LINEA_LARGA} ajusteDeLinea />);
    expect(container.querySelector('.cm-content')).toBe(antes);
    expect(antes?.classList.contains('cm-lineWrapping')).toBe(true);
    expect(container.textContent).toContain('Esta línea es larga');

    rerender(<EditorJava valor={LINEA_LARGA} />);
    expect(container.querySelector('.cm-content')?.classList.contains('cm-lineWrapping')).toBe(false);
  });
});

describe('<EditorJava/> — la línea actual en el celular', () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
    vi.restoreAllMocks();
  });

  const RESALTADOS = { lineaEjecutada: null, lineaSiguiente: 2, vueltas: [], ramaNoTomada: null } as const;
  const PROGRAMA = 'linea uno\nlinea dos\nlinea tres';

  function pantallaAngosta(angosta: boolean): void {
    window.matchMedia = ((consulta: string) => ({ matches: angosta, media: consulta, addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia;
  }

  it('en un celular (pantalla angosta) deja la línea que se marca en el CENTRO del editor, no en el borde', () => {
    pantallaAngosta(true);
    const alDesplazar = vi.spyOn(EditorView, 'scrollIntoView');
    render(<EditorJava valor={PROGRAMA} soloLectura resaltados={RESALTADOS} />);
    expect(alDesplazar).toHaveBeenCalled();
    expect(alDesplazar.mock.calls.at(-1)?.[1]).toMatchObject({ y: 'center' });
  });

  it('en una pantalla ancha solo la deja a la vista (lo más cerca posible, como siempre)', () => {
    pantallaAngosta(false);
    const alDesplazar = vi.spyOn(EditorView, 'scrollIntoView');
    render(<EditorJava valor={PROGRAMA} soloLectura resaltados={RESALTADOS} />);
    expect(alDesplazar.mock.calls.at(-1)?.[1]).toMatchObject({ y: 'nearest' });
  });

  it('sin `matchMedia` (jsdom) se comporta como en una pantalla ancha', () => {
    // @ts-expect-error: jsdom no trae `matchMedia`; así se prueba la ausencia.
    window.matchMedia = undefined;
    const alDesplazar = vi.spyOn(EditorView, 'scrollIntoView');
    render(<EditorJava valor={PROGRAMA} soloLectura resaltados={RESALTADOS} />);
    expect(alDesplazar.mock.calls.at(-1)?.[1]).toMatchObject({ y: 'nearest' });
  });
});

// R0.12: con el ajuste de línea una línea sangrada que no cabe se parte, y las filas de continuación deben seguir la sangría de SU línea (sangría colgante): sin ella las continuaciones arrancan en la columna 0
// y parecen otra línea. Cada línea con sangría lleva su cuenta en `--sangria` (en columnas); la hoja de estilos la convierte en el margen de las filas siguientes.
describe('<EditorJava/> — sangría colgante de las líneas partidas (proyector)', () => {
  const PROGRAMA = ['class A {', '    void f() {', '        int x = 1;', '\tint y;', '}'].join('\n');

  function sangriasDeLasLineas(contenedor: HTMLElement): (string | null)[] {
    return Array.from(contenedor.querySelectorAll('.cm-line')).map((linea) => /--sangria:\s*(\d+)/.exec(linea.getAttribute('style') ?? '')?.[1] ?? null);
  }

  it('cada línea con sangría lleva su cuenta de columnas (los espacios); las que no, nada', () => {
    const { container } = render(<EditorJava valor={PROGRAMA} ajusteDeLinea />);
    expect(sangriasDeLasLineas(container)).toEqual([null, '4', '8', '4', null]);
  });

  it('sin ajuste de línea no se agrega nada: el modo normal no cambia', () => {
    const { container } = render(<EditorJava valor={PROGRAMA} />);
    expect(sangriasDeLasLineas(container)).toEqual([null, null, null, null, null]);
  });

  it('al encender el proyector las sangrías aparecen y al apagarlo se van, sin recrear el editor', () => {
    const { container, rerender } = render(<EditorJava valor={PROGRAMA} />);
    rerender(<EditorJava valor={PROGRAMA} ajusteDeLinea />);
    expect(sangriasDeLasLineas(container)).toEqual([null, '4', '8', '4', null]);
    rerender(<EditorJava valor={PROGRAMA} />);
    expect(sangriasDeLasLineas(container)).toEqual([null, null, null, null, null]);
  });

  it('si el programa cambia, las sangrías se recalculan', () => {
    const { container, rerender } = render(<EditorJava valor={'a\n  b'} ajusteDeLinea />);
    expect(sangriasDeLasLineas(container)).toEqual([null, '2']);
    rerender(<EditorJava valor={'      c\nd'} ajusteDeLinea />);
    expect(sangriasDeLasLineas(container)).toEqual(['6', null]);
  });
});
