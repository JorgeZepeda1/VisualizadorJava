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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

function compiladoConProblema(id: number, problema: Problema): MensajeTrabajadorAUi {
  return { tipo: 'compilado', id, ok: false, problema, adicionales: 0 };
}

function editorEditable(): boolean {
  return document.querySelector('.cm-content')?.getAttribute('contenteditable') === 'true';
}

async function pulsarVisualizar(): Promise<void> {
  await userEvent.setup().click(screen.getByRole('button', { name: /visualizar/i }));
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

    expect((await screen.findByRole('alert')).textContent).toBe('Línea 3: Te falta un punto y coma ";" al final de esta línea.');
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
    expect(texto).toContain('Java sí acepta tu programa');
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

describe('<Visualizador/> — el aviso es una región anunciada que solo existe cuando hay algo que decir', () => {
  it('sin problemas no hay ninguna región de alerta (ni al inicio ni tras una ejecución que sale bien)', async () => {
    trabajadorQueResponde((id) => [
      { tipo: 'compilado', id, ok: true, vista: { fuente: '' } },
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
            { tipo: 'compilado', id, ok: true, vista: { fuente: '' } },
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
      { tipo: 'compilado', id, ok: true, vista: { fuente: '' } },
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
      { tipo: 'compilado', id, ok: true, vista: { fuente: '' } },
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
    expect(texto).toBe('Algo falló dentro del visualizador.');
    expect(texto).not.toMatch(/RangeError|call stack|sintaxis/i);
    expect(editorEditable()).toBe(true);
  });
});
