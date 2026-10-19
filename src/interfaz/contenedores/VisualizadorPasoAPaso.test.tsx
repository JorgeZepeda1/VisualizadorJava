// RED de las tareas 4.11 a 4.13 (REQ-VIS-009, REQ-VIS-011, REQ-VIS-012): el contenedor conecta el editor, el trabajador, la traza y todos los paneles en un flujo único — Visualizar, mirar el paso 0,
// navegar, ver al robot explicar cada paso, escribir el dato que el programa espera y seguir. Aquí el ÚNICO doble es el transporte con el trabajador (`crearClienteTrabajador`): contesta con mensajes
// de protocolo fijos para ejercitar cada rama del contenedor; los textos, la presentación y los componentes son los REALES. El recorrido con el motor de verdad vive en `App.test.tsx` (jsdom) y
// en `pruebas/e2e/visualizador-normal.spec.ts` (el build real, ×3 navegadores).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Paso, VistaPrograma } from '../../motor/vista.ts';
import { nodo, paso, ranura } from '../../presentacion/ayudas-de-prueba.ts';
import type { ClienteTrabajador } from '../../trabajador/cliente.ts';
import { crearClienteTrabajador } from '../../trabajador/cliente.ts';
import type { MensajeTrabajadorAUi } from '../../trabajador/protocolo.ts';
import { Visualizador } from './Visualizador.tsx';

vi.mock('../../trabajador/cliente.ts', () => ({ crearClienteTrabajador: vi.fn() }));

// Un programa de mentira: 0 = `int edad = 17;` (línea 3), 1 = `System.out.println("Hola");` (línea 4), 2 = la lectura `sc.nextInt()` (línea 6).
const VISTA: VistaPrograma = {
  fuente: '',
  ranuras: [ranura(0, 'edad')],
  nodos: [nodo(0, { clase: 'declaracion', linea: 3, vivas: [0] }), nodo(1, { clase: 'expresion', linea: 4, vivas: [0] }), nodo(2, { clase: 'declaracion', linea: 6, vivas: [0] })],
};

const DECLARACION: Paso = paso({
  clase: 'declaracion',
  nodo: 0,
  linea: 3,
  explicacion: { clave: 'declaracion-con-valor', datos: { nombre: 'edad', tipo: 'int', expresion: '17', sustituida: '17', valor: '17' } },
  cambios: [{ ranura: 'edad', anterior: undefined, nuevo: 17 }],
});
const IMPRESION: Paso = paso({
  clase: 'impresion',
  nodo: 1,
  linea: 4,
  explicacion: { clave: 'impresion', datos: { texto: 'Hola', flujo: 'out', saltoDeLinea: true } },
  salida: [{ flujo: 'out', texto: 'Hola\n' }],
});

let cliente: { [K in keyof ClienteTrabajador]: ReturnType<typeof vi.fn> };

/** El trabajador simulado contesta a cada «ejecutar» con estos mensajes (con el `id` de la ejecución, como los reales). */
function trabajadorQueResponde(respuesta: (id: number) => readonly MensajeTrabajadorAUi[]): void {
  vi.mocked(crearClienteTrabajador).mockImplementation(({ onMensaje }) => {
    cliente = { ejecutar: vi.fn(), darEntrada: vi.fn(), cerrarEntrada: vi.fn(), detener: vi.fn(), terminar: vi.fn() };
    cliente.ejecutar.mockImplementation((id: number) => {
      for (const mensaje of respuesta(id)) onMensaje(mensaje);
    });
    return cliente as unknown as ClienteTrabajador;
  });
}

const compilado = (id: number): MensajeTrabajadorAUi => ({ tipo: 'compilado', id, ok: true, vista: VISTA });

/** Deja pasar `ms` de tiempo falso DENTRO de `act`, para que React procese los cambios de estado que el temporizador provoca. */
async function dejarPasar(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function pulsar(nombre: RegExp): Promise<void> {
  await userEvent.setup().click(screen.getByRole('button', { name: nombre }));
}

function globo(): string {
  return screen.getByTestId('globo-del-robot').textContent ?? '';
}

beforeEach(() => {
  vi.mocked(crearClienteTrabajador).mockReset();
});

describe('<Visualizador/> — Visualizar lleva al paso 0', () => {
  beforeEach(() => {
    trabajadorQueResponde((id) => [compilado(id), { tipo: 'pasos', id, desde: 0, pasos: [DECLARACION, IMPRESION] }, { tipo: 'fin', id, fin: { causa: 'terminado' } }]);
  });

  it('antes de visualizar el robot saluda y no hay controles de reproducción', () => {
    render(<Visualizador />);
    expect(globo()).toContain('¿Por dónde quieres empezar?');
    expect(screen.queryByRole('button', { name: /siguiente/i })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Controles de reproducción' })).toBeNull();
  });

  it('al visualizar queda en el paso 0: «Todavía no se ejecuta nada», la consola vacía y la línea siguiente nombrada', async () => {
    render(<Visualizador />);
    await pulsar(/visualizar/i);

    expect(globo()).toContain('Todavía no se ejecuta nada. Antes de empezar, lee el programa y anota qué crees que va a aparecer en la consola. Luego pulsa «Siguiente» y lo comprobamos desde la línea 3.');
    expect(screen.getByTestId('consola').textContent).toBe('');
    expect(screen.getAllByText('Paso 0 de 2').length).toBeGreaterThan(0);
  });

  it('el foco queda en «Siguiente» (el siguiente paso natural para quien usa teclado)', async () => {
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: /siguiente/i })));
  });

  it('el editor queda en solo lectura mientras se visualiza', async () => {
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    expect(document.querySelector('.cm-content')?.getAttribute('contenteditable')).toBe('false');
  });

  it('la ejecución es interactiva: el trabajador recibe `entradaInteractiva` para esperar los datos del Scanner', async () => {
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    expect(cliente.ejecutar).toHaveBeenCalledTimes(1);
    expect(cliente.ejecutar.mock.calls[0]?.[2]).toMatchObject({ entradaInteractiva: true });
  });
});

describe('<Visualizador/> — el robot explica cada paso', () => {
  beforeEach(() => {
    trabajadorQueResponde((id) => [compilado(id), { tipo: 'pasos', id, desde: 0, pasos: [DECLARACION, IMPRESION] }, { tipo: 'fin', id, fin: { causa: 'terminado' } }]);
  });

  it('Siguiente muestra la explicación del paso 1, con su línea, y las variables a la vista', async () => {
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    await pulsar(/siguiente/i);

    expect(globo()).toContain('Línea 3');
    expect(globo()).toContain('Java crea la variable edad de tipo int y le guarda 17.');
    const fila = screen.getByRole('row', { name: /^edad\b/ });
    expect(within(fila).getByText('17')).toBeTruthy();
    expect(fila.textContent).toContain('nueva');
  });

  it('el paso 2 imprime en la consola y el robot lo dice', async () => {
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    await pulsar(/siguiente/i);
    await pulsar(/siguiente/i);

    expect(screen.getByTestId('consola').textContent).toContain('Hola');
    expect(globo()).toContain('Línea 4');
    expect(globo()).toContain('Java imprime en la consola: «Hola» y pasa a la línea siguiente.');
  });

  it('en el último paso, con el programa terminado, el robot resume cómo terminó', async () => {
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    await pulsar(/fin/i);

    expect(screen.getByTestId('globo-del-robot').querySelector('.globo-nota')?.textContent).toBe('Así terminó: sin errores, en 2 pasos.');
    expect(screen.getByRole('img').getAttribute('data-animo')).toBe('feliz');
  });

  it('marca la línea recién ejecutada y la siguiente en el editor', async () => {
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    await pulsar(/siguiente/i);

    // El programa precargado tiene 5 renglones; las líneas 3 (ejecutada) y 4 (siguiente) existen en él.
    expect(Array.from(document.querySelectorAll('.cm-linea-ejecutada')).length).toBe(1);
    expect(Array.from(document.querySelectorAll('.cm-linea-siguiente')).length).toBe(1);
  });

  it('Anterior regresa un paso y Reiniciar vuelve al paso 0', async () => {
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    await pulsar(/fin/i);
    await pulsar(/anterior/i);
    expect(screen.getAllByText('Paso 1 de 2').length).toBeGreaterThan(0);
    await pulsar(/reiniciar/i);
    expect(screen.getAllByText('Paso 0 de 2').length).toBeGreaterThan(0);
    expect(globo()).toContain('Todavía no se ejecuta nada');
  });

  it('las flechas del teclado avanzan y retroceden, igual que los botones', async () => {
    const usuario = userEvent.setup();
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    await usuario.keyboard('{ArrowRight}');
    expect(screen.getAllByText('Paso 1 de 2').length).toBeGreaterThan(0);
    await usuario.keyboard('{ArrowLeft}');
    expect(screen.getAllByText('Paso 0 de 2').length).toBeGreaterThan(0);
  });
});

describe('<Visualizador/> — el programa espera un dato (REQ-VIS-009)', () => {
  beforeEach(() => {
    trabajadorQueResponde((id) => [
      compilado(id),
      { tipo: 'pasos', id, desde: 0, pasos: [DECLARACION, IMPRESION] },
      { tipo: 'espera-entrada', id, nodo: 2 },
    ]);
  });

  it('en el último paso, la consola muestra el campo de entrada y el robot lo dice, con la línea de la lectura', async () => {
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    await pulsar(/fin/i);

    expect(screen.getByRole('textbox', { name: 'Escribe tu dato y pulsa Enter' })).toBeTruthy();
    expect(screen.getByTestId('globo-del-robot').querySelector('.globo-nota')?.textContent).toBe(
      'En la línea 6 el programa espera un dato. Escríbelo en la consola y pulsa Enter.',
    );
    expect(screen.getByRole('img').getAttribute('data-animo')).toBe('esperando');
  });

  it('la consola toma el foco (el campo de entrada) cuando el programa espera', async () => {
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    await pulsar(/fin/i);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Escribe tu dato y pulsa Enter' }));
  });

  it('el campo está en el mismo renglón que el mensaje, dentro de la consola', async () => {
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    await pulsar(/fin/i);
    expect(screen.getByTestId('consola').contains(screen.getByRole('textbox', { name: /dato/i }))).toBe(true);
  });

  it('en un paso anterior al último no hay campo de entrada (el dato se pide al llegar al final)', async () => {
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    await pulsar(/siguiente/i);
    expect(screen.queryByRole('textbox', { name: /dato/i })).toBeNull();
  });

  it('al escribir el dato, se manda al trabajador con su salto de línea y el campo desaparece', async () => {
    const usuario = userEvent.setup();
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    await pulsar(/fin/i);

    await usuario.type(screen.getByRole('textbox', { name: /dato/i }), '50{Enter}');

    expect(cliente.darEntrada).toHaveBeenCalledTimes(1);
    expect(cliente.darEntrada.mock.calls[0]?.[1]).toBe('50\n');
    expect(screen.queryByRole('textbox', { name: /dato/i })).toBeNull();
  });

  it('el campo está en la consola y las flechas del teclado no navegan mientras se escribe en él', async () => {
    const usuario = userEvent.setup();
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    await pulsar(/fin/i);
    await usuario.type(screen.getByRole('textbox', { name: /dato/i }), '12{ArrowLeft}{ArrowLeft}');
    expect(screen.getAllByText('Paso 2').length).toBeGreaterThan(0);
  });
});

describe('<Visualizador/> — el acuse `detenido` del trabajador (hito 2C)', () => {
  it('con el programa calculando, el acuse cierra la ejecución: el robot ya no dice «Se siguen calculando» y lo ya calculado sigue navegable', async () => {
    trabajadorQueResponde((id) => [compilado(id), { tipo: 'pasos', id, desde: 0, pasos: [DECLARACION, IMPRESION] }, { tipo: 'detenido', id }]);
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    await pulsar(/fin/i);

    expect(screen.getByTestId('globo-del-robot').querySelector('.globo-nota')?.textContent).toBe(
      'Así terminó: la ejecución se detuvo antes de llegar al final del programa.',
    );
    expect(screen.getByTestId('globo-del-robot').textContent).not.toContain('Se siguen calculando');
    // El programa no terminó (lo detuvieron): no se sabe cuántos pasos habría tenido, así que solo se dice el actual.
    expect(screen.getAllByText('Paso 2').length).toBeGreaterThan(0);
    await pulsar(/anterior/i);
    expect(globo()).toContain('Java crea la variable edad de tipo int y le guarda 17.');
  });

  it('con el programa esperando un dato, el acuse quita el campo de la consola: ya no hay a quién entregarle el dato', async () => {
    trabajadorQueResponde((id) => [
      compilado(id),
      { tipo: 'pasos', id, desde: 0, pasos: [DECLARACION, IMPRESION] },
      { tipo: 'espera-entrada', id, nodo: 2 },
      { tipo: 'detenido', id },
    ]);
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    await pulsar(/fin/i);

    expect(screen.queryByRole('textbox', { name: /dato/i })).toBeNull();
    expect(screen.getByTestId('globo-del-robot').querySelector('.globo-nota')?.textContent).toBe(
      'Así terminó: la ejecución se detuvo antes de llegar al final del programa.',
    );
  });

  it('un acuse de una ejecución ya reemplazada (otro `id`) no toca a la ejecución nueva', async () => {
    const entregas: Array<(mensaje: MensajeTrabajadorAUi) => void> = [];
    vi.mocked(crearClienteTrabajador).mockImplementation(({ onMensaje }) => {
      entregas.push(onMensaje);
      const nuevo = { ejecutar: vi.fn(), darEntrada: vi.fn(), cerrarEntrada: vi.fn(), detener: vi.fn(), terminar: vi.fn() };
      nuevo.ejecutar.mockImplementation((id: number) => {
        onMensaje(compilado(id));
        onMensaje({ tipo: 'pasos', id, desde: 0, pasos: [DECLARACION, IMPRESION] });
      });
      return nuevo as unknown as ClienteTrabajador;
    });
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    await pulsar(/visualizar/i);
    expect(entregas).toHaveLength(2);

    await act(async () => {
      entregas[0]?.({ tipo: 'detenido', id: 1 });
    });
    await pulsar(/fin/i);
    expect(screen.getByTestId('globo-del-robot').querySelector('.globo-nota')?.textContent).toBe('Se siguen calculando los siguientes pasos…');

    await act(async () => {
      entregas[1]?.({ tipo: 'detenido', id: 2 });
    });
    expect(screen.getByTestId('globo-del-robot').querySelector('.globo-nota')?.textContent).toBe(
      'Así terminó: la ejecución se detuvo antes de llegar al final del programa.',
    );
  });
});

describe('<Visualizador/> — volver a editar', () => {
  beforeEach(() => {
    trabajadorQueResponde((id) => [compilado(id), { tipo: 'pasos', id, desde: 0, pasos: [DECLARACION] }, { tipo: 'fin', id, fin: { causa: 'terminado' } }]);
  });

  it('«Editar programa» termina la visualización y devuelve el editor editable', async () => {
    render(<Visualizador />);
    await pulsar(/visualizar/i);
    expect(screen.queryByRole('button', { name: /editar programa/i })).not.toBeNull();

    await pulsar(/editar programa/i);

    expect(cliente.terminar).toHaveBeenCalled();
    expect(document.querySelector('.cm-content')?.getAttribute('contenteditable')).toBe('true');
    expect(screen.queryByRole('button', { name: /siguiente/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /editar programa/i })).toBeNull();
    expect(globo()).toContain('Cuando tu programa esté listo');
  });

  it('no ofrece «Editar programa» cuando todavía no se visualiza nada', () => {
    render(<Visualizador />);
    expect(screen.queryByRole('button', { name: /editar programa/i })).toBeNull();
  });
});

describe('<Visualizador/> — reproducción automática', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    trabajadorQueResponde((id) => [
      compilado(id),
      { tipo: 'pasos', id, desde: 0, pasos: [DECLARACION, IMPRESION, IMPRESION] },
      { tipo: 'fin', id, fin: { causa: 'terminado' } },
    ]);
  });

  it('Reproducir avanza un paso por tic hasta el final y se detiene sola', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Visualizador />);
    await usuario.click(screen.getByRole('button', { name: /visualizar/i }));
    await usuario.click(screen.getByRole('button', { name: /reproducir/i }));

    expect(screen.getByRole('button', { name: /pausa/i })).toBeTruthy();
    await dejarPasar(700);
    expect(screen.getAllByText('Paso 1 de 3').length).toBeGreaterThan(0);
    await dejarPasar(2000);
    expect(screen.getAllByText('Paso 3 de 3').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /pausa/i })).toBeNull();
    vi.useRealTimers();
  });

  it('una velocidad mayor avanza más rápido', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Visualizador />);
    await usuario.click(screen.getByRole('button', { name: /visualizar/i }));
    await usuario.click(screen.getByRole('button', { name: 'Ajustes de la clase' }));
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Velocidad' }), '5');
    await usuario.click(screen.getByRole('button', { name: /reproducir/i }));
    await dejarPasar(500);
    expect(screen.getAllByText('Paso 3 de 3').length).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it('Pausa detiene el avance', async () => {
    const usuario = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Visualizador />);
    await usuario.click(screen.getByRole('button', { name: /visualizar/i }));
    await usuario.click(screen.getByRole('button', { name: /reproducir/i }));
    await dejarPasar(700);
    await usuario.click(screen.getByRole('button', { name: /pausa/i }));
    await dejarPasar(5000);
    expect(screen.getAllByText('Paso 1 de 3').length).toBeGreaterThan(0);
    vi.useRealTimers();
  });
});
