// RED de las tareas R0.8, R0.9 y R0.10 (REQ-PANT-001 a 004, 006, 007; REQ-AULA-001; ADR 017): la pantalla nueva del contenedor. El robot paso a paso saluda con las puertas, la navegación «Paso a paso · Libro ·
// Ejemplos» y «Ajustes de la clase» están en el encabezado, «Siguiente» es el botón primario bajo el globo (la ranura de acciones), cada dato vive en un solo lugar y, al terminar el programa, la ranura ofrece
// qué sigue. Como en `VisualizadorPasoAPaso.test.tsx`, el ÚNICO doble es el transporte con el trabajador; los textos, la presentación y los componentes son los reales.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Paso, VistaPrograma } from '../../motor/vista.ts';
import { nodo, paso, ranura } from '../../presentacion/ayudas-de-prueba.ts';
import type { ClienteTrabajador } from '../../trabajador/cliente.ts';
import { crearClienteTrabajador } from '../../trabajador/cliente.ts';
import type { MensajeTrabajadorAUi } from '../../trabajador/protocolo.ts';
import { Visualizador } from './Visualizador.tsx';

vi.mock('../../trabajador/cliente.ts', () => ({ crearClienteTrabajador: vi.fn() }));

const VISTA: VistaPrograma = {
  fuente: '',
  ranuras: [ranura(0, 'edad')],
  nodos: [nodo(0, { clase: 'declaracion', linea: 3, vivas: [0] }), nodo(1, { clase: 'expresion', linea: 4, vivas: [0] })],
};
const DECLARACION: Paso = paso({
  clase: 'declaracion',
  nodo: 0,
  linea: 3,
  explicacion: { clave: 'declaracion-con-valor', datos: { nombre: 'edad', tipo: 'int', expresion: '17', sustituida: '17', valor: '17' } },
  cambios: [{ ranura: 'edad', anterior: undefined, nuevo: 17 }],
});
/** Un programa que LEE un dato: su primer paso consumió entrada (`Paso.entrada`), preparada o tecleada. */
const LECTURA: Paso = { ...DECLARACION, entrada: { cursor: 3 } };
const IMPRESION: Paso = paso({
  clase: 'impresion',
  nodo: 1,
  linea: 4,
  explicacion: { clave: 'impresion', datos: { texto: 'Hola', flujo: 'out', saltoDeLinea: true } },
  salida: [{ flujo: 'out', texto: 'Hola\n' }],
});

let cliente: { [K in keyof ClienteTrabajador]: ReturnType<typeof vi.fn> };

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

function trabajadorQueTermina(): void {
  trabajadorQueResponde((id) => [compilado(id), { tipo: 'pasos', id, desde: 0, pasos: [DECLARACION, IMPRESION] }, { tipo: 'fin', id, fin: { causa: 'terminado' } }]);
}

function trabajadorQueLeeYTermina(): void {
  trabajadorQueResponde((id) => [compilado(id), { tipo: 'pasos', id, desde: 0, pasos: [LECTURA, IMPRESION] }, { tipo: 'fin', id, fin: { causa: 'terminado' } }]);
}

async function pulsar(nombre: string | RegExp): Promise<void> {
  await userEvent.setup().click(screen.getByRole('button', { name: nombre }));
}

function globo(): string {
  return screen.getByTestId('globo-del-robot').textContent ?? '';
}

function laRanura(): HTMLElement {
  return screen.getByTestId('ranura-de-acciones');
}

function elEditorEstaMontado(): boolean {
  return document.querySelector('.cm-content') !== null;
}

beforeEach(() => {
  vi.mocked(crearClienteTrabajador).mockReset();
  trabajadorQueTermina();
});

describe('<Visualizador/> — la primera visita: el saludo con tres puertas (REQ-PANT-001)', () => {
  it('el robot paso a paso saluda y la ranura bajo el globo ofrece las puertas que tienen destino: sin temas publicados, solo dos', () => {
    render(<Visualizador />);
    expect(globo()).toContain('¡Hola! Te muestro, paso a paso, qué hace Java con un programa. ¿Por dónde quieres empezar?');
    const puertas = within(laRanura()).getAllByRole('button').map((boton) => boton.textContent);
    expect(puertas).toEqual(['Ver un ejemplo paso a paso', 'Probar mi programa']);
    expect(screen.queryByRole('button', { name: 'Leer un tema' })).toBeNull();
  });

  it('el foco está en la primera puerta visible', () => {
    render(<Visualizador />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Ver un ejemplo paso a paso' }));
  });

  it('la consola vacía tiene título y dice dónde aparecerá lo que imprima el programa, sin ensuciar la consola misma', () => {
    render(<Visualizador />);
    expect(screen.getByRole('heading', { name: 'Consola' })).toBeTruthy();
    expect(screen.getByText('Aquí aparecerá lo que imprima tu programa')).toBeTruthy();
    expect(screen.getByTestId('consola').textContent).toBe('');
  });

  it('«Probar mi programa» lleva el foco al editor y el saludo termina', async () => {
    render(<Visualizador />);
    await pulsar('Probar mi programa');

    await vi.waitFor(() => expect(document.activeElement).toBe(document.querySelector('.cm-content')));
    expect(screen.queryByRole('button', { name: 'Ver un ejemplo paso a paso' })).toBeNull();
    expect(globo()).toContain('Cuando esté listo, pulsa «Visualizar»');
  });

  it('el robot que habla es uno solo (el paso a paso) y su nombre está bajo la figura', () => {
    render(<Visualizador />);
    const zona = screen.getByRole('region', { name: 'Explicación del robot' });
    expect(zona.querySelectorAll('[data-personaje]')).toHaveLength(1);
    expect(within(zona).getByText('Robot paso a paso')).toBeTruthy();
  });
});

describe('<Visualizador/> — la navegación y los ajustes de la clase (REQ-PANT-002, REQ-PANT-006)', () => {
  it('el encabezado tiene el título, la navegación sin «Libro» (no hay temas publicados) y «Ajustes de la clase»', () => {
    render(<Visualizador />);
    expect(screen.getByRole('heading', { level: 1, name: 'Visualizador de Java paso a paso' })).toBeTruthy();
    const nav = screen.getByRole('navigation', { name: 'Secciones del visualizador' });
    expect(within(nav).getAllByRole('button').map((boton) => boton.textContent)).toEqual(['Paso a paso', 'Ejemplos']);
    expect(within(nav).getByRole('button', { name: 'Paso a paso' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Ajustes de la clase' })).toBeTruthy();
  });

  it('ir a «Ejemplos» y volver sin elegir nada deja el mismo programa y la traza en el mismo paso; el editor nunca se desmonta', async () => {
    render(<Visualizador />);
    await pulsar('Visualizar');
    await pulsar(/siguiente/i);
    await pulsar(/siguiente/i);
    expect(screen.getAllByText('Paso 2 de 2').length).toBeGreaterThan(0);

    await pulsar('Ejemplos');
    expect(screen.getByRole('button', { name: 'Ejemplos' }).getAttribute('aria-current')).toBe('page');
    expect(elEditorEstaMontado()).toBe(true);
    expect(screen.getByTestId('cuerpo-del-visualizador').hasAttribute('hidden')).toBe(true);

    await pulsar('Paso a paso');
    expect(screen.getByTestId('cuerpo-del-visualizador').hasAttribute('hidden')).toBe(false);
    expect(screen.getAllByText('Paso 2 de 2').length).toBeGreaterThan(0);
    expect(document.querySelector('.cm-content')?.textContent).toContain('Hola, mundo');
  });

  it('«Ver un ejemplo paso a paso» lleva a la sección Ejemplos', async () => {
    render(<Visualizador />);
    await pulsar('Ver un ejemplo paso a paso');
    expect(screen.getByRole('button', { name: 'Ejemplos' }).getAttribute('aria-current')).toBe('page');
  });

  it('encender el modo proyector con el teclado cambia la pantalla y la traza sigue en el mismo paso', async () => {
    const usuario = userEvent.setup();
    render(<Visualizador />);
    await pulsar('Visualizar');
    await pulsar(/siguiente/i);
    expect(screen.getByTestId('contenedor-de-la-pantalla').hasAttribute('data-proyector')).toBe(false);
    expect(screen.getAllByRole('columnheader').map((columna) => columna.textContent)).toEqual(['Nombre', 'Tipo', 'Valor']);
    expect(document.querySelector('.cm-content')?.classList.contains('cm-lineWrapping')).toBe(false);

    screen.getByRole('button', { name: 'Ajustes de la clase' }).focus();
    await usuario.keyboard('{Enter}');
    await usuario.tab();
    await usuario.keyboard(' ');

    expect(screen.getByRole('switch', { name: 'Modo proyector: Encendido' })).toBeTruthy();
    expect(screen.getByTestId('contenedor-de-la-pantalla').getAttribute('data-proyector')).toBe('encendido');
    expect(screen.getAllByText('Paso 1 de 2').length).toBeGreaterThan(0);
    // La distribución de proyector: la tabla de variables sin «Tipo» y el código con ajuste de línea (a 24 px una línea de 53 caracteres no cabe sin partirla).
    expect(screen.getAllByRole('columnheader').map((columna) => columna.textContent)).toEqual(['Nombre', 'Valor']);
    expect(document.querySelector('.cm-content')?.classList.contains('cm-lineWrapping')).toBe(true);
  });

  // Panel R0 (diseñador, «Antes de publicar» 2): en el proyector la consola no cabía en la ventana (9 de 26 pasos a 1280×720). Con el proyector encendido va DEBAJO del código, como la ventana «Output» de
  // NetBeans; apagado, queda en la columna derecha como siempre. La traza y lo que la consola ya mostró no cambian.
  it('con el proyector encendido la consola va debajo del código (tras los controles) y, apagado, en la columna derecha', async () => {
    render(<Visualizador />);
    await pulsar('Visualizar');
    await pulsar(/siguiente/i);
    await pulsar(/siguiente/i);
    expect(screen.getByTestId('consola').textContent).toContain('Hola');
    expect(document.querySelector('.columna-estado .zona-consola')).not.toBeNull();
    expect(document.querySelector('.columna-codigo .zona-consola')).toBeNull();

    await pulsar('Ajustes de la clase');
    await userEvent.setup().click(screen.getByRole('switch', { name: /Modo proyector/ }));

    expect(document.querySelector('.columna-estado .zona-consola')).toBeNull();
    const enElCodigo = document.querySelector('.columna-codigo .zona-consola');
    expect(enElCodigo).not.toBeNull();
    expect(document.querySelector('.columna-codigo .barra-controles')?.nextElementSibling).toBe(enElCodigo);
    expect(screen.getByRole('heading', { name: 'Consola' })).toBeTruthy();
    expect(screen.getByTestId('consola').textContent).toContain('Hola');
    expect(screen.getAllByText('Paso 2 de 2').length).toBeGreaterThan(0);

    await userEvent.setup().click(screen.getByRole('switch', { name: /Modo proyector/ }));
    expect(document.querySelector('.columna-estado .zona-consola')).not.toBeNull();
    expect(document.querySelector('.columna-codigo .zona-consola')).toBeNull();
  });

  // Panel R0 (diseñador, «Antes de publicar» 1): robot, globo y ranura son UNA zona (la que se fija arriba de la columna derecha); el panel de condición y la cadena de sustitución van aparte, debajo.
  it('el robot, el globo y la ranura son una sola zona, y lo que se desplaza (condición, variables, consola) queda fuera de ella', async () => {
    render(<Visualizador />);
    await pulsar('Visualizar');
    await pulsar(/siguiente/i);

    const zona = document.querySelector('.columna-estado > .zona-explicacion');
    expect(zona).not.toBeNull();
    expect(zona?.querySelector('[data-personaje]')).not.toBeNull();
    expect(zona?.querySelector('[data-testid="globo-del-robot"]')).not.toBeNull();
    expect(zona?.querySelector('[data-testid="ranura-de-acciones"]')).not.toBeNull();
    expect(zona?.querySelector('.panel-condicion, .cadena-de-sustitucion')).toBeNull();
    expect(zona?.nextElementSibling?.classList.contains('zona-condicion')).toBe(true);
    expect(zona?.querySelector('[data-testid="consola"]')).toBeNull();
  });

  it('la velocidad de la reproducción se cambia desde los ajustes, ya no desde la barra de controles', async () => {
    render(<Visualizador />);
    await pulsar('Visualizar');
    expect(screen.queryByRole('combobox', { name: 'Velocidad' })).toBeNull();
    await pulsar('Ajustes de la clase');
    expect(screen.getByRole('combobox', { name: 'Velocidad' })).toBeTruthy();
  });
});

describe('<Visualizador/> — «Siguiente» junto al globo y como botón primario (REQ-PANT-003)', () => {
  it('al visualizar, «Anterior» y «Siguiente» están en la ranura bajo el globo y el foco pasa a «Siguiente»', async () => {
    render(<Visualizador />);
    await pulsar('Visualizar');

    const botones = within(laRanura()).getAllByRole('button');
    expect(botones.map((boton) => boton.textContent)).toEqual(['◀ Anterior', 'Siguiente ▶']);
    const siguiente = within(laRanura()).getByRole('button', { name: /siguiente/i });
    await vi.waitFor(() => expect(document.activeElement).toBe(siguiente));
  });

  it('«Siguiente» es el botón primario y «Visualizar» deja de serlo mientras se visualiza; antes de visualizar sí lo es', async () => {
    render(<Visualizador />);
    expect(screen.getByRole('button', { name: 'Visualizar' }).className).toContain('boton-principal');

    await pulsar('Visualizar');

    expect(screen.getByRole('button', { name: /siguiente/i }).className).toContain('boton-principal');
    expect(screen.getByRole('button', { name: 'Visualizar' }).className).not.toContain('boton-principal');
  });

  it('«Anterior» y «Siguiente» anuncian su atajo y «Anterior» está apagado en el paso 0', async () => {
    render(<Visualizador />);
    await pulsar('Visualizar');
    const anterior = screen.getByRole('button', { name: /anterior/i }) as HTMLButtonElement;
    const siguiente = screen.getByRole('button', { name: /siguiente/i });
    expect(anterior.disabled).toBe(true);
    expect(anterior.getAttribute('aria-keyshortcuts')).toBe('ArrowLeft');
    expect(siguiente.getAttribute('aria-keyshortcuts')).toBe('ArrowRight');
  });

  it('la barra de controles conserva Inicio, Fin, Reproducir y el deslizador, y ya no repite Anterior ni Siguiente', async () => {
    render(<Visualizador />);
    await pulsar('Visualizar');
    const barra = screen.getByRole('group', { name: 'Controles de reproducción' });
    expect(within(barra).getAllByRole('button').map((boton) => boton.textContent)).toEqual(['⏮ Reiniciar', 'Fin ⏭', '⏵ Reproducir']);
    expect(within(barra).getByRole('slider', { name: 'Posición en el programa' })).toBeTruthy();
  });

  it('las flechas, Inicio, Fin y espacio siguen funcionando', async () => {
    const usuario = userEvent.setup();
    render(<Visualizador />);
    await pulsar('Visualizar');
    await usuario.keyboard('{ArrowRight}');
    expect(screen.getAllByText('Paso 1 de 2').length).toBeGreaterThan(0);
    await usuario.keyboard('{End}');
    expect(screen.getAllByText('Paso 2 de 2').length).toBeGreaterThan(0);
    await usuario.keyboard('{Home}');
    expect(screen.getAllByText('Paso 0 de 2').length).toBeGreaterThan(0);
  });

  it('la ranura nunca muestra dos cosas a la vez: saludo, par de navegación y fin son excluyentes', async () => {
    render(<Visualizador />);
    expect(laRanura().getAttribute('data-ranura')).toBe('puertas');
    await pulsar('Visualizar');
    expect(laRanura().getAttribute('data-ranura')).toBe('navegacion');
    expect(within(laRanura()).queryByRole('button', { name: 'Probar mi programa' })).toBeNull();
    await pulsar(/^fin\b/i);
    expect(laRanura().getAttribute('data-ranura')).toBe('fin');
    expect(within(laRanura()).queryByRole('button', { name: /siguiente/i })).toBeNull();
  });
});

describe('<Visualizador/> — un dueño por dato y pistas de lectura (REQ-PANT-004)', () => {
  it('el número de vuelta no se repite en ningún panel: sin contador de vueltas junto al globo', async () => {
    render(<Visualizador />);
    await pulsar('Visualizar');
    await pulsar(/siguiente/i);
    expect(screen.queryByTestId('contador-de-vueltas')).toBeNull();
  });

  it('una leyenda dice qué significan las marcas ▶ y ▷ mientras se visualiza', async () => {
    render(<Visualizador />);
    expect(screen.queryByRole('list', { name: 'Marcas del código' })).toBeNull();
    await pulsar('Visualizar');
    const leyenda = screen.getByRole('list', { name: 'Marcas del código' });
    expect(within(leyenda).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['▶ acaba de ejecutarse', '▷ sigue']);
  });

  it('teclear en el editor durante la visualización no cambia el código y avisa cómo editarlo, en una región anunciada con cortesía', async () => {
    render(<Visualizador />);
    const aviso = screen.getByTestId('aviso-de-edicion');
    expect(aviso.getAttribute('aria-live')).toBe('polite');
    expect(aviso.textContent).toBe('');

    await pulsar('Visualizar');
    const codigoAntes = document.querySelector('.cm-content')?.textContent;
    fireEvent.keyDown(document.querySelector('.cm-content') as Element, { key: 'x' });

    expect(aviso.textContent).toBe('Para cambiar el código pulsa «Editar programa»');
    expect(document.querySelector('.cm-content')?.textContent).toBe(codigoAntes);
  });

  it('las flechas y las demás teclas de navegación NO disparan el aviso de edición', async () => {
    render(<Visualizador />);
    await pulsar('Visualizar');
    const contenido = document.querySelector('.cm-content') as Element;
    for (const key of ['ArrowLeft', 'ArrowRight', 'Tab', 'Escape', 'Home', 'End']) fireEvent.keyDown(contenido, { key });
    expect(screen.getByTestId('aviso-de-edicion').textContent).toBe('');
  });

  it('el indicador de posición dice el total solo cuando el programa terminó; esperando un dato, solo el paso', async () => {
    trabajadorQueResponde((id) => [compilado(id), { tipo: 'pasos', id, desde: 0, pasos: [DECLARACION, IMPRESION] }, { tipo: 'espera-entrada', id, nodo: 1 }]);
    render(<Visualizador />);
    await pulsar('Visualizar');
    await pulsar(/^fin\b/i);
    expect(screen.getAllByText('Paso 2').length).toBeGreaterThan(0);
    expect(screen.queryByText('Paso 2 de 2')).toBeNull();
  });
});

describe('<Visualizador/> — el fin del recorrido ofrece qué sigue (REQ-PANT-007)', () => {
  it('en el último paso de un programa que lee datos la ranura ofrece «Probar con otros datos» (principal) y «Modificar el programa»', async () => {
    trabajadorQueLeeYTermina();
    render(<Visualizador />);
    await pulsar('Visualizar');
    await pulsar(/^fin\b/i);

    const acciones = within(laRanura()).getAllByRole('button').map((boton) => boton.textContent);
    expect(acciones).toEqual(['◀ Anterior', 'Probar con otros datos', 'Modificar el programa']);
    expect(within(laRanura()).getByRole('button', { name: 'Probar con otros datos' }).className).toContain('boton-principal');
  });

  // Panel R0 (diseñador): si el programa no lee nada, no hay «otros datos» que probar; lo que sigue es modificarlo.
  it('en el último paso de un programa que NO lee datos no hay «Probar con otros datos» y «Modificar el programa» es el principal', async () => {
    render(<Visualizador />);
    await pulsar('Visualizar');
    await pulsar(/^fin\b/i);

    const acciones = within(laRanura()).getAllByRole('button').map((boton) => boton.textContent);
    expect(acciones).toEqual(['◀ Anterior', 'Modificar el programa']);
    expect(within(laRanura()).getByRole('button', { name: 'Modificar el programa' }).className).toContain('boton-principal');
  });

  it('un ciclo que el visualizador detuvo: aunque lea datos, lo principal es «Modificar el programa» y ahí cae el foco', async () => {
    trabajadorQueResponde((id) => [compilado(id), { tipo: 'pasos', id, desde: 0, pasos: [LECTURA, IMPRESION] }, { tipo: 'fin', id, fin: { causa: 'limite-pasos' } }]);
    render(<Visualizador />);
    await pulsar('Visualizar');
    await pulsar(/siguiente/i);
    await pulsar(/siguiente/i);

    const principal = within(laRanura()).getByRole('button', { name: 'Modificar el programa' });
    expect(principal.className).toContain('boton-principal');
    expect(within(laRanura()).getByRole('button', { name: 'Probar con otros datos' }).className).not.toContain('boton-principal');
    await vi.waitFor(() => expect(document.activeElement).toBe(principal));
  });

  it('al llegar al fin con «Siguiente» el foco no se pierde: pasa a la acción principal del fin', async () => {
    trabajadorQueLeeYTermina();
    render(<Visualizador />);
    await pulsar('Visualizar');
    await pulsar(/siguiente/i);
    await pulsar(/siguiente/i);
    await vi.waitFor(() => expect(document.activeElement).toBe(within(laRanura()).getByRole('button', { name: 'Probar con otros datos' })));
  });

  it('«Probar con otros datos» vuelve a visualizar desde el paso 0, con la entrada del alumno y no la preparada', async () => {
    trabajadorQueLeeYTermina();
    render(<Visualizador />);
    await pulsar('Visualizar');
    await pulsar(/^fin\b/i);

    await pulsar('Probar con otros datos');

    expect(cliente.ejecutar).toHaveBeenCalledTimes(1);
    expect(cliente.ejecutar.mock.calls[0]?.[2]).toMatchObject({ entradaPreparada: '', entradaInteractiva: true });
    expect(screen.getAllByText('Paso 0 de 2').length).toBeGreaterThan(0);
    expect(globo()).toContain('Todavía no se ejecuta nada');
  });

  it('«Modificar el programa» devuelve el editor, igual que «Editar programa»', async () => {
    render(<Visualizador />);
    await pulsar('Visualizar');
    await pulsar(/^fin\b/i);

    await pulsar('Modificar el programa');

    expect(document.querySelector('.cm-content')?.getAttribute('contenteditable')).toBe('true');
    expect(screen.queryByRole('button', { name: /siguiente/i })).toBeNull();
    await vi.waitFor(() => expect(document.activeElement).toBe(document.querySelector('.cm-content')));
  });
});

describe('<Visualizador/> — quién habla cuando algo sale mal (REQ-PANT-009)', () => {
  it('un error de compilación lo explica el robot revisor, nombrado antes de su texto; al corregir y visualizar, habla el robot paso a paso', async () => {
    let intento = 0;
    trabajadorQueResponde((id) => {
      intento += 1;
      return intento === 1
        ? [{ tipo: 'compilado', id, ok: false, problema: { categoria: 'error-compilacion', codigo: 'falta-punto-y-coma', rango: { inicio: 0, fin: 1 }, linea: 3, datos: { mensaje: 'x' } }, adicionales: 0 }]
        : [compilado(id), { tipo: 'pasos', id, desde: 0, pasos: [DECLARACION, IMPRESION] }, { tipo: 'fin', id, fin: { causa: 'terminado' } }];
    });
    render(<Visualizador />);
    await pulsar('Visualizar');

    const aviso = await screen.findByRole('alert');
    expect(aviso.textContent?.startsWith('Robot revisor: ')).toBe(true);
    const zona = screen.getByRole('region', { name: 'Explicación del robot' });
    expect(zona.querySelectorAll('[data-personaje]')).toHaveLength(1);
    expect(zona.querySelector('[data-personaje]')?.getAttribute('data-personaje')).toBe('revisor');
    expect(within(zona).getByText('Robot revisor')).toBeTruthy();

    await pulsar('Visualizar');

    await vi.waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(zona.querySelector('[data-personaje]')?.getAttribute('data-personaje')).toBe('paso-a-paso');
    expect(globo().startsWith('Robot paso a paso: ')).toBe(true);
  });
});

describe('<Visualizador/> — abrir un ejemplo de la galería (REQ-AULA-001, R0.11)', () => {
  async function irAEjemplos(): Promise<void> {
    await pulsar('Ejemplos');
    await screen.findByRole('heading', { level: 4, name: 'Bienvenida al curso' });
  }

  it('«Ver paso a paso» carga el código del programa, vuelve a «Paso a paso» y lo visualiza desde el paso 0', async () => {
    render(<Visualizador />);
    await irAEjemplos();

    await pulsar('Ver paso a paso: Bienvenida al curso');

    expect(screen.getByRole('button', { name: 'Paso a paso' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByTestId('cuerpo-del-visualizador').hasAttribute('hidden')).toBe(false);
    expect(document.querySelector('.cm-content')?.textContent).not.toContain('MiPrograma');
    await vi.waitFor(() => expect(cliente.ejecutar).toHaveBeenCalledTimes(1));
    const [, codigo, config] = cliente.ejecutar.mock.calls[0] as [number, string, { entradaPreparada: string }];
    expect(codigo).toContain('class Bienvenida');
    expect(codigo).not.toContain('MiPrograma');
    expect(config.entradaPreparada).toBe('');
    expect(screen.getAllByText(/Paso 0 de 2/).length).toBeGreaterThan(0);
  });

  it('un programa que lee del teclado se abre con la entrada preparada que usó el oráculo, byte a byte', async () => {
    render(<Visualizador />);
    await irAEjemplos();

    await pulsar('Ver paso a paso: Saludo con tu nombre');

    await vi.waitFor(() => expect(cliente.ejecutar).toHaveBeenCalledTimes(1));
    const config = cliente.ejecutar.mock.calls[0]?.[2] as { entradaPreparada: string };
    expect(config.entradaPreparada.length).toBeGreaterThan(0);
    expect(config.entradaPreparada.endsWith('\n')).toBe(true);
  });

  it('«Con mis datos» abre el mismo programa con la entrada vacía, para que el alumno teclee los suyos', async () => {
    render(<Visualizador />);
    await irAEjemplos();

    await pulsar('Con mis datos: Saludo con tu nombre');

    await vi.waitFor(() => expect(cliente.ejecutar).toHaveBeenCalledTimes(1));
    const config = cliente.ejecutar.mock.calls[0]?.[2] as { entradaPreparada: string };
    expect(config.entradaPreparada).toBe('');
  });

  it('la máquina de snacks se abre con el dato de ejemplo que se eligió', async () => {
    render(<Visualizador />);
    await irAEjemplos();

    const grupo = screen.getByRole('group', { name: 'Datos de ejemplo: Máquina de snacks' });
    await userEvent.setup().click(within(grupo).getByRole('button', { name: /b2 · 3 · 40/ }));

    await vi.waitFor(() => expect(cliente.ejecutar).toHaveBeenCalledTimes(1));
    const config = cliente.ejecutar.mock.calls[0]?.[2] as { entradaPreparada: string };
    expect(config.entradaPreparada).toBe('b2\n3\n40\n');
  });

  it('el foco llega a «Siguiente» al abrir el ejemplo, como al visualizar el propio', async () => {
    render(<Visualizador />);
    await irAEjemplos();
    await pulsar('Ver paso a paso: Bienvenida al curso');
    await vi.waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: /siguiente/i })));
  });

  it('el programa del alumno se guarda y «Volver a mi programa» lo recupera; el botón solo existe mientras hay un ejemplo abierto', async () => {
    render(<Visualizador />);
    expect(screen.queryByRole('button', { name: 'Volver a mi programa' })).toBeNull();
    await irAEjemplos();
    await pulsar('Ver paso a paso: Bienvenida al curso');
    expect(document.querySelector('.cm-content')?.textContent).not.toContain('MiPrograma');

    await pulsar('Volver a mi programa');

    expect(document.querySelector('.cm-content')?.textContent).toContain('MiPrograma');
    expect(screen.queryByRole('button', { name: 'Volver a mi programa' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Visualizar' })).toBeTruthy();
  });

  it('abrir un segundo ejemplo no pisa el programa del alumno con el primero', async () => {
    render(<Visualizador />);
    await irAEjemplos();
    await pulsar('Ver paso a paso: Bienvenida al curso');
    await pulsar('Ejemplos');
    await pulsar('Ver paso a paso: Tipos básicos y constantes');
    await pulsar('Volver a mi programa');
    expect(document.querySelector('.cm-content')?.textContent).toContain('MiPrograma');
  });
});
