// RED de la tarea 1.28 (agregada por el orquestador, decisión del PO 2026-09-29: «la pantalla
// muestra el texto real de cada problema (error o aviso) con su línea; el ícono, el título y el
// subrayado siguen en la 4.5»). Antes, el contenedor IGNORABA el `problema` que le manda el
// trabajador y mostraba siempre «El programa no compila todavía (…lote 1)», falso para un programa
// que Java acepta y con jerga de desarrollo. Aquí el ÚNICO doble es el transporte con el trabajador
// (`crearClienteTrabajador`, el puerto de `trabajador/cliente.ts`): responde con mensajes de
// protocolo fijos, así se ejercita cada rama del contenedor sin teclear en CodeMirror (jsdom no
// hace layout para eso, ADR 013; el recorrido real, con el motor de verdad, vive en
// `pruebas/e2e/problemas-en-pantalla.spec.ts`). Los textos y la segmentación sí son los REALES.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorView } from '@codemirror/view';
import type { Problema, ProblemaArranque } from '../../motor/vista.ts';
import type { MensajeTrabajadorAUi } from '../../trabajador/protocolo.ts';
import { crearClienteTrabajador } from '../../trabajador/cliente.ts';
import { Visualizador } from './Visualizador.tsx';

vi.mock('../../trabajador/cliente.ts', () => ({ crearClienteTrabajador: vi.fn() }));

const RANGO = { inicio: 0, fin: 1 } as const;

// El trabajador simulado contesta a cada «ejecutar» con estos mensajes (llevan el `id` de la
// ejecución, como los reales: el contenedor ignora los de una ejecución ya reemplazada).
function trabajadorQueResponde(respuesta: (id: number) => readonly MensajeTrabajadorAUi[]): void {
  vi.mocked(crearClienteTrabajador).mockImplementation(({ onMensaje }) => ({
    ejecutar: (id) => {
      for (const mensaje of respuesta(id)) onMensaje(mensaje);
    },
    darEntrada: vi.fn(),
    cerrarEntrada: vi.fn(),
    detener: vi.fn(),
    terminar: vi.fn(),
  }));
}

function compiladoConProblema(id: number, problema: Problema, adicionales = 0): MensajeTrabajadorAUi {
  return { tipo: 'compilado', id, ok: false, problema, adicionales };
}

function editorEditable(): boolean {
  return document.querySelector('.cm-content')?.getAttribute('contenteditable') === 'true';
}

async function pulsarVisualizar(): Promise<void> {
  await userEvent.setup().click(screen.getByRole('button', { name: /visualizar/i }));
}

function vistaDelEditor(): EditorView {
  const raiz = document.querySelector('.cm-editor');
  const vista = raiz instanceof HTMLElement ? EditorView.findFromDOM(raiz) : null;
  if (!vista) throw new Error('No se encontró el editor de CodeMirror');
  return vista;
}

/** Cambia el programa del editor como lo haría quien corrige una línea: una transacción que inserta texto al final (pasa por el mismo `onCambio` que una tecla). */
function corregirElPrograma(): void {
  const vista = vistaDelEditor();
  act(() => {
    vista.dispatch({ changes: { from: vista.state.doc.length, insert: ' ' }, userEvent: 'input.type' });
  });
}

/** La línea (1 en adelante) donde está el cursor del editor. */
function lineaDelCursor(): number {
  const vista = vistaDelEditor();
  return vista.state.doc.lineAt(vista.state.selection.main.head).number;
}

beforeEach(() => {
  vi.mocked(crearClienteTrabajador).mockReset();
});

describe('<Visualizador/> — el texto real de cada problema, con su línea', () => {
  it('un error de compilación muestra «Línea N: …» con el texto del catálogo, no un mensaje fijo', async () => {
    trabajadorQueResponde((id) => [
      compiladoConProblema(id, {
        categoria: 'error-compilacion',
        codigo: 'falta-punto-y-coma',
        rango: RANGO,
        linea: 3,
        datos: { mensaje: 'se esperaba ";" y se encontró "}"' },
      }),
    ]);
    render(<Visualizador />);
    await pulsarVisualizar();

    const aviso = await screen.findByRole('alert');
    // Tarea 4.5: el aviso lleva el título de su tipo; el texto del catálogo, con su línea, sigue siendo el mismo.
    expect(aviso.textContent).toContain('Error de compilación');
    expect(aviso.textContent).toContain('Línea 3: Te falta un punto y coma ";" al final de esta línea.');
  });

  it('triangulación: otro error, otra línea y datos propios ("edad" en la línea 12)', async () => {
    trabajadorQueResponde((id) => [
      compiladoConProblema(id, {
        categoria: 'error-compilacion',
        codigo: 'variable-no-declarada',
        rango: RANGO,
        linea: 12,
        datos: { nombre: 'edad' },
      }),
    ]);
    render(<Visualizador />);
    await pulsarVisualizar();

    const aviso = await screen.findByRole('alert');
    expect(aviso.textContent).toContain('Línea 12: ');
    expect(aviso.textContent).toContain('"edad"');
  });

  it('un aviso de "no disponible" pinta el código en línea como <code>, sin comillas invertidas crudas', async () => {
    trabajadorQueResponde((id) => [
      compiladoConProblema(id, {
        categoria: 'no-disponible',
        codigo: 'arreglo-no-soportado',
        rango: RANGO,
        linea: 4,
        datos: { tipoArreglo: 'int[]' },
      }),
    ]);
    render(<Visualizador />);
    await pulsarVisualizar();

    const aviso = await screen.findByRole('alert');
    expect(Array.from(aviso.querySelectorAll('code')).map((c) => c.textContent)).toEqual(['int[]']);
    expect(aviso.textContent).toContain('Tu programa usa un arreglo (int[]) en la línea 4.');
    expect(aviso.textContent).not.toContain('`');
  });

  // Tarea 1.30 (decisión del PO 2026-09-29): un aviso de una construcción afirma que la construcción es parte
  // de Java y admite que no revisa lo demás; nunca dice que Java acepta el PROGRAMA (podría no aceptarlo).
  it('un aviso de una construcción dice "Es parte de Java" y que no puede revisar esa parte, nunca que Java acepta el programa', async () => {
    trabajadorQueResponde((id) => [
      compiladoConProblema(id, {
        categoria: 'no-disponible',
        codigo: 'arreglo-no-soportado',
        rango: RANGO,
        linea: 4,
        datos: { tipoArreglo: 'int[]' },
      }),
    ]);
    render(<Visualizador />);
    await pulsarVisualizar();

    const texto = (await screen.findByRole('alert')).textContent ?? '';
    expect(texto).toContain('Es parte de Java, pero este visualizador cubre las unidades 3 a 7');
    expect(texto).toContain('así que no puedo revisar si esa parte está bien escrita.');
    expect(texto).not.toContain('Java sí');
  });

  it('triangulación: un método de biblioteca marca DOS tramos de código (el método y la clase)', async () => {
    trabajadorQueResponde((id) => [
      compiladoConProblema(id, {
        categoria: 'no-disponible',
        codigo: 'metodo-de-biblioteca-no-soportado',
        rango: RANGO,
        linea: 7,
        datos: { clase: 'String', nombre: 'split' },
      }),
    ]);
    render(<Visualizador />);
    await pulsarVisualizar();

    const aviso = await screen.findByRole('alert');
    expect(Array.from(aviso.querySelectorAll('code')).map((c) => c.textContent)).toEqual(['split', 'String']);
    expect(aviso.textContent).not.toContain('`');
    expect(aviso.textContent).toContain('línea 7');
  });

  it('nunca muestra el texto fijo de antes ni jerga de desarrollo', async () => {
    trabajadorQueResponde((id) => [
      compiladoConProblema(id, {
        categoria: 'no-disponible',
        codigo: 'ejecucion-no-disponible',
        rango: RANGO,
        linea: 5,
        datos: {},
      }),
    ]);
    render(<Visualizador />);
    await pulsarVisualizar();

    const texto = (await screen.findByRole('alert')).textContent ?? '';
    expect(texto).toContain('Tu programa pasó todas mis revisiones');
    expect(texto).not.toMatch(/no compila todavía|lote|tarea/i);
  });

  it('tras un problema el editor vuelve a ser editable, para poder corregirlo', async () => {
    trabajadorQueResponde((id) => [
      compiladoConProblema(id, {
        categoria: 'error-compilacion',
        codigo: 'falta-punto-y-coma',
        rango: RANGO,
        linea: 3,
        datos: { mensaje: 'x' },
      }),
    ]);
    render(<Visualizador />);
    await pulsarVisualizar();
    await screen.findByRole('alert');

    expect(editorEditable()).toBe(true);
  });
});

// C4 del panel 1 (disenador-ux H6): tras un error de compilación el foco caía en `body` (el botón «Visualizar» se deshabilita mientras se revisa) y quien usa teclado o lector de pantalla quedaba
// perdido. Ahora el foco va al editor, en la línea del error. Y cuando el alumno corrige, el globo ya no repite el error con la cara de preocupación mientras el editor ya no lo marca.
describe('<Visualizador/> — después de un error el foco va al editor, a la línea del error (C4)', () => {
  const ERROR_EN_LA_LINEA_3: Problema = { categoria: 'error-compilacion', codigo: 'falta-punto-y-coma', rango: RANGO, linea: 3, datos: { mensaje: 'x' } };

  it('el foco queda en el editor y el cursor en la línea del error', async () => {
    trabajadorQueResponde((id) => [compiladoConProblema(id, ERROR_EN_LA_LINEA_3)]);
    render(<Visualizador />);
    await pulsarVisualizar();
    await screen.findByRole('alert');

    await vi.waitFor(() => expect(document.activeElement).toBe(document.querySelector('.cm-content')));
    expect(lineaDelCursor()).toBe(3);
  });

  it('triangulación: otro error, otra línea (la 4)', async () => {
    trabajadorQueResponde((id) => [compiladoConProblema(id, { ...ERROR_EN_LA_LINEA_3, codigo: 'variable-no-declarada', linea: 4, datos: { nombre: 'edad' } })]);
    render(<Visualizador />);
    await pulsarVisualizar();
    await screen.findByRole('alert');

    await vi.waitFor(() => expect(document.activeElement).toBe(document.querySelector('.cm-content')));
    expect(lineaDelCursor()).toBe(4);
  });

  it('un `main` sin static no tiene línea que señalar: el foco igual vuelve al editor para corregir', async () => {
    const arranque: ProblemaArranque = { codigo: 'main-no-static', nombreClase: 'SinStatic', textoLanzador: 'Error' };
    trabajadorQueResponde((id) => [
      { tipo: 'compilado', id, ok: true, vista: { fuente: '', ranuras: [], nodos: [] } },
      { tipo: 'fin', id, fin: { causa: 'error-arranque', arranque } },
    ]);
    render(<Visualizador />);
    await pulsarVisualizar();
    await screen.findByRole('alert');

    await vi.waitFor(() => expect(document.activeElement).toBe(document.querySelector('.cm-content')));
  });
});

describe('<Visualizador/> — al editar después de un aviso, el globo deja de repetirlo (C4)', () => {
  const ERROR: Problema = { categoria: 'error-compilacion', codigo: 'falta-punto-y-coma', rango: RANGO, linea: 3, datos: { mensaje: 'x' } };

  it('mientras el programa no cambia, el globo sigue diciendo el error con la cara de preocupación', async () => {
    trabajadorQueResponde((id) => [compiladoConProblema(id, ERROR)]);
    render(<Visualizador />);
    await pulsarVisualizar();

    expect((await screen.findByRole('alert')).textContent).toContain('Error de compilación');
    expect(screen.getByRole('img', { name: /robot/i }).getAttribute('data-animo')).toBe('preocupado');
  });

  it('al editar, el globo pasa a «Cambiaste el programa…», con la cara normal y sin el error', async () => {
    trabajadorQueResponde((id) => [compiladoConProblema(id, ERROR)]);
    render(<Visualizador />);
    await pulsarVisualizar();
    await screen.findByRole('alert');

    corregirElPrograma();

    const globo = await screen.findByTestId('globo-del-robot');
    expect(globo.textContent).toContain('Cambiaste el programa. Pulsa «Visualizar» y lo reviso otra vez.');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.body.textContent).not.toContain('Te falta un punto y coma');
    expect(screen.getByRole('img', { name: /robot/i }).getAttribute('data-animo')).toBe('normal');
  });

  it('también cuando el aviso era de «no disponible» o un `main` sin static: el aviso viejo no describe el programa nuevo', async () => {
    trabajadorQueResponde((id) => [compiladoConProblema(id, { categoria: 'no-disponible', codigo: 'arreglo-no-soportado', rango: RANGO, linea: 3, datos: { tipoArreglo: 'int[]' } })]);
    render(<Visualizador />);
    await pulsarVisualizar();
    await screen.findByRole('alert');

    corregirElPrograma();

    expect((await screen.findByTestId('globo-del-robot')).textContent).toContain('Cambiaste el programa.');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('al pulsar «Visualizar» otra vez con otro error, el aviso nuevo vuelve a ser el actual', async () => {
    trabajadorQueResponde((id) => [compiladoConProblema(id, ERROR)]);
    render(<Visualizador />);
    await pulsarVisualizar();
    await screen.findByRole('alert');
    corregirElPrograma();
    await screen.findByTestId('globo-del-robot');

    await pulsarVisualizar();

    expect((await screen.findByRole('alert')).textContent).toContain('Línea 3: Te falta un punto y coma');
    expect(screen.getByRole('img', { name: /robot/i }).getAttribute('data-animo')).toBe('preocupado');
  });
});

describe('<Visualizador/> — «y N más» (REQ-SUB-006, pendiente de la tarea 4.5)', () => {
  const ARREGLO: Problema = { categoria: 'no-disponible', codigo: 'arreglo-no-soportado', rango: RANGO, linea: 3, datos: { tipoArreglo: 'int[]' } };

  it('cuando el motor encontró más avisos, la pantalla dice cuántos más hay', async () => {
    trabajadorQueResponde((id) => [compiladoConProblema(id, ARREGLO, 2)]);
    render(<Visualizador />);
    await pulsarVisualizar();

    expect((await screen.findByRole('alert')).textContent).toContain('y 2 avisos más');
  });

  it('con un solo aviso adicional, en singular; sin adicionales, no dice nada de «más»', async () => {
    trabajadorQueResponde((id) => [compiladoConProblema(id, ARREGLO, 1)]);
    const { unmount } = render(<Visualizador />);
    await pulsarVisualizar();
    expect((await screen.findByRole('alert')).textContent).toContain('y 1 aviso más');
    unmount();

    trabajadorQueResponde((id) => [compiladoConProblema(id, ARREGLO, 0)]);
    render(<Visualizador />);
    await pulsarVisualizar();
    expect((await screen.findByRole('alert')).textContent).not.toMatch(/más/);
  });

  it('el problema se subraya en el editor sobre su rango, con la marca del margen de su tipo', async () => {
    trabajadorQueResponde((id) => [compiladoConProblema(id, ARREGLO, 0)]);
    render(<Visualizador />);
    await pulsarVisualizar();
    await screen.findByRole('alert');

    expect(document.querySelector('.cm-problema-aviso')).not.toBeNull();
    expect(document.querySelector('.cm-marca-problema')?.textContent).toBe('ⓘ');
  });
});

describe('<Visualizador/> — el aviso es una región anunciada que solo existe cuando hay algo que decir', () => {
  it('sin problemas no hay ninguna región de alerta (ni al inicio ni tras una ejecución que sale bien)', async () => {
    trabajadorQueResponde((id) => [
      { tipo: 'compilado', id, ok: true, vista: { fuente: '', ranuras: [], nodos: [] } },
      { tipo: 'fin', id, fin: { causa: 'terminado' } },
    ]);
    render(<Visualizador />);
    expect(screen.queryByRole('alert')).toBeNull();

    await pulsarVisualizar();
    await vi.waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('al volver a visualizar con éxito, el aviso anterior desaparece', async () => {
    let ejecuciones = 0;
    trabajadorQueResponde((id) => {
      ejecuciones += 1;
      return ejecuciones === 1
        ? [
            compiladoConProblema(id, {
              categoria: 'error-compilacion',
              codigo: 'falta-punto-y-coma',
              rango: RANGO,
              linea: 3,
              datos: { mensaje: 'x' },
            }),
          ]
        : [
            { tipo: 'compilado', id, ok: true, vista: { fuente: '', ranuras: [], nodos: [] } },
            { tipo: 'fin', id, fin: { causa: 'terminado' } },
          ];
    });
    render(<Visualizador />);
    await pulsarVisualizar();
    await screen.findByRole('alert');

    await pulsarVisualizar();
    await vi.waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
});

describe('<Visualizador/> — un error de arranque (main sin static, sin main) también se explica', () => {
  const arranque: ProblemaArranque = {
    codigo: 'main-no-static',
    nombreClase: 'SinStatic',
    textoLanzador: 'Error: el método principal no es static en la clase SinStatic, defina el método principal del siguiente modo:\n   public static void main(String[] args)\n',
  };

  it('muestra el texto amable con la clase real y deja el editor editable (no hay nada que visualizar)', async () => {
    trabajadorQueResponde((id) => [
      { tipo: 'compilado', id, ok: true, vista: { fuente: '', ranuras: [], nodos: [] } },
      { tipo: 'fin', id, fin: { causa: 'error-arranque', arranque } },
    ]);
    render(<Visualizador />);
    await pulsarVisualizar();

    const aviso = await screen.findByRole('alert');
    expect(aviso.textContent).toContain('"SinStatic"');
    expect(aviso.textContent).toContain('static');
    // El detalle secundario (texto exacto del lanzador) es de la consola, no de este aviso.
    expect(aviso.textContent).not.toContain('Error: el método principal');
    expect(editorEditable()).toBe(true);
  });

  it('un fin normal (terminado) NO muestra ningún aviso y deja el editor en solo lectura', async () => {
    trabajadorQueResponde((id) => [
      { tipo: 'compilado', id, ok: true, vista: { fuente: '', ranuras: [], nodos: [] } },
      { tipo: 'fin', id, fin: { causa: 'terminado' } },
    ]);
    render(<Visualizador />);
    await pulsarVisualizar();

    await vi.waitFor(() => expect(editorEditable()).toBe(false));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('<Visualizador/> — un fallo interno del motor no se presenta como error del alumno', () => {
  it('muestra el aviso genérico y nunca el detalle de JavaScript', async () => {
    trabajadorQueResponde((id) => [
      { tipo: 'error-interno', id, mensaje: 'RangeError: Maximum call stack size exceeded' },
    ]);
    render(<Visualizador />);
    await pulsarVisualizar();

    const texto = (await screen.findByRole('alert')).textContent ?? '';
    // Tarea 4.5: un fallo del visualizador tiene su propio título (no es "Error de compilación" ni "Se detuvo por seguridad").
    expect(texto).toContain('Falla del visualizador');
    expect(texto).toContain('Algo falló dentro del visualizador.');
    expect(texto).not.toContain('Error de compilación');
    expect(texto).not.toMatch(/RangeError|call stack|sintaxis/i);
    expect(editorEditable()).toBe(true);
  });
});
