// RED de la tarea 0.14 (rebanada vertical) ampliado en las tareas 4.11 a 4.13: ejercita el pipeline real completo —React → ClienteTrabajador (transporte en proceso bajo jsdom, el MISMO motor real, sin
// mocks de negocio) → compilar/crearEjecucion → Traza → modelo de vista → paneles y robot—. El programa dorado ya viene precargado en el editor (design.md §6.2 "Primera visita: editor con un
// «Hola, mundo»"); para los demás, la prueba reemplaza el documento de CodeMirror con una transacción (ADR 013: jsdom no hace layout, así que el teclado real se prueba en `pruebas/e2e/`).
// Tras Visualizar la pantalla queda en el paso 0 (design.md §6.2); «Fin» salta al último paso.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorView } from '@codemirror/view';
import { App, type PropiedadesApp } from './App.tsx';

const CORPUS_DEL_PO = resolve(import.meta.dirname, '../../corpus/experimentos/ejercicios-del-po');

function leerDelCorpus(nombre: string): string {
  return readFileSync(resolve(CORPUS_DEL_PO, nombre), 'utf8');
}

/** Reemplaza el programa del editor como lo haría un pegado: una transacción que cambia todo el documento. */
function escribirPrograma(fuente: string): void {
  const raiz = document.querySelector('.cm-editor');
  const vista = raiz instanceof HTMLElement ? EditorView.findFromDOM(raiz) : null;
  if (!vista) throw new Error('No se encontró el editor de CodeMirror');
  act(() => {
    vista.dispatch({ changes: { from: 0, to: vista.state.doc.length, insert: fuente } });
  });
}

async function pulsar(nombre: RegExp): Promise<void> {
  await userEvent.setup().click(screen.getByRole('button', { name: nombre }));
}

/** Lo que la consola muestra del programa (`out` y `err`), SIN lo que el alumno tecleó: debe ser idéntico a lo que Java imprime. */
function salidaDelPrograma(): string {
  return Array.from(screen.getByTestId('consola').querySelectorAll('[data-flujo="out"], [data-flujo="err"]'))
    .map((segmento) => segmento.textContent)
    .join('');
}

/** Lo que ve el alumno en la consola, sin las etiquetas que solo oye el lector de pantalla. */
function textoVisibleDeLaConsola(): string {
  return Array.from(screen.getByTestId('consola').querySelectorAll('[data-flujo]'))
    .map((segmento) => segmento.textContent)
    .join('');
}

function ecoDeLaConsola(): string[] {
  return Array.from(screen.getByTestId('consola').querySelectorAll('[data-flujo="eco"]')).map((segmento) => segmento.textContent ?? '');
}

function globo(): string {
  return screen.getByTestId('globo-del-robot').textContent ?? '';
}

describe('<App/> — el programa dorado', () => {
  it('al pulsar Visualizar queda en el paso 0 y, al ir al final, "Hola, mundo" aparece en la consola', async () => {
    render(<App />);
    await pulsar(/visualizar/i);
    expect(screen.getByTestId('consola').textContent).toBe('');

    await pulsar(/fin/i);

    await vi.waitFor(() => {
      expect(screen.getByTestId('consola').textContent).toContain('Hola, mundo');
    });
  });

  it('◀ Anterior vacía la consola y ▶ Siguiente la vuelve a llenar (navegación real de pasos)', async () => {
    render(<App />);
    await pulsar(/visualizar/i);
    await pulsar(/siguiente/i);
    expect(screen.getByTestId('consola').textContent).toContain('Hola, mundo');

    await pulsar(/anterior/i);
    expect(screen.getByTestId('consola').textContent).toBe('');

    await pulsar(/siguiente/i);
    expect(screen.getByTestId('consola').textContent).toContain('Hola, mundo');
  });

  it('el robot explica el paso: «Línea 3: Imprimo en la consola: «Hola, mundo»…»', async () => {
    render(<App />);
    await pulsar(/visualizar/i);
    expect(globo()).toContain('Todavía no se ejecuta nada');

    await pulsar(/siguiente/i);

    expect(globo()).toContain('Línea 3: Imprimo en la consola: «Hola, mundo» y paso a la línea siguiente.');
    expect(globo()).toContain('Así terminó: sin errores, en 1 paso.');
  });
});

describe('<App/> — MaquinaSnacks con entrada interactiva (el ejercicio del PO)', () => {
  const fuente = leerDelCorpus('maquina-snacks-a1-2-50.java');

  async function visualizarYTeclear(datos: readonly string[]): Promise<void> {
    const usuario = userEvent.setup();
    render(<App />);
    escribirPrograma(fuente);
    await usuario.click(screen.getByRole('button', { name: /visualizar/i }));
    for (const dato of datos) {
      await usuario.click(screen.getByRole('button', { name: /fin/i }));
      await usuario.type(await screen.findByRole('textbox', { name: /dato/i }), `${dato}{Enter}`);
    }
    await usuario.click(screen.getByRole('button', { name: /fin/i }));
  }

  it('a1, 2, 50: la consola termina idéntica a lo que imprime Java, y lo tecleado va aparte', async () => {
    await visualizarYTeclear(['a1', '2', '50']);

    expect(salidaDelPrograma()).toBe(leerDelCorpus('maquina-snacks-a1-2-50.combinada'));
    expect(ecoDeLaConsola()).toEqual(['a1\n', '2\n', '50\n']);
    expect(screen.queryByRole('textbox', { name: /dato/i })).toBeNull();
  });

  it('z9: un código inválido termina el programa con su mensaje, idéntico a Java', async () => {
    await visualizarYTeclear(['z9']);

    expect(salidaDelPrograma()).toBe(leerDelCorpus('maquina-snacks-z9.combinada'));
    expect(globo()).toContain('Así terminó: sin errores');
  });

  it('en cada espera el robot dice en qué línea espera el dato, y la consola tiene el foco', async () => {
    const usuario = userEvent.setup();
    render(<App />);
    escribirPrograma(fuente);
    await usuario.click(screen.getByRole('button', { name: /visualizar/i }));
    await usuario.click(screen.getByRole('button', { name: /fin/i }));

    const campo = await screen.findByRole('textbox', { name: /dato/i });
    expect(document.activeElement).toBe(campo);
    expect(globo()).toContain('En la línea 19 el programa espera un dato. Escríbelo en la consola y pulsa Enter.');
    // El mensaje del print y el campo van en el mismo renglón: la consola termina en «Código: » y el campo sigue.
    expect(salidaDelPrograma().endsWith('Código: ')).toBe(true);
    expect(screen.getByTestId('consola').contains(campo)).toBe(true);
  });

  it('tras teclear el dato, la pantalla pasa sola al paso de la lectura: el robot la explica y la consola muestra lo tecleado', async () => {
    const usuario = userEvent.setup();
    render(<App />);
    escribirPrograma(fuente);
    await usuario.click(screen.getByRole('button', { name: /visualizar/i }));
    await usuario.click(screen.getByRole('button', { name: /fin/i }));
    await usuario.type(await screen.findByRole('textbox', { name: /dato/i }), 'a1{Enter}');

    expect(globo()).toContain('Línea 19');
    expect(globo()).toContain('Creo la variable codigo de tipo String y le guardo "A1".');
    expect(textoVisibleDeLaConsola()).toContain('Código: a1\n');
    // y el foco vuelve a los controles para seguir con el teclado
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /siguiente/i }));
  });

  it('el panel de variables sigue los cambios del programa y el de condición, la cadena de sustitución', async () => {
    await visualizarYTeclear(['a1', '2', '50']);
    // Al final: cantidad 2, dinero 50, total 36. El último paso es `sc.close()`; vamos a la condición `dinero < total` (tres pasos antes).
    await pulsar(/anterior/i);
    await pulsar(/anterior/i);
    expect(globo()).toContain('dinero < total');
    expect(screen.getByTestId('cadena-de-sustitucion').textContent).toBe('dinero < total → 50 < 36 → false');
    const filaTotal = screen.getByRole('row', { name: /^total\b/ });
    expect(filaTotal.textContent).toContain('36');
  });

  it('el robot dice algo en CADA paso: nunca un globo vacío ni un marcador sin resolver', async () => {
    await visualizarYTeclear(['a1', '2', '50']);
    await pulsar(/reiniciar/i);
    const textos: string[] = [];
    for (let i = 0; i < 40 && screen.getByRole('button', { name: /siguiente/i }).hasAttribute('disabled') === false; i += 1) {
      await pulsar(/siguiente/i);
      textos.push(globo());
    }
    expect(textos.length).toBe(26);
    for (const texto of textos) {
      expect(texto.trim().length).toBeGreaterThan(8);
      expect(texto).not.toMatch(/[{}]|undefined|NaN|\[object|null/);
    }
  });
});

describe('<App/> — la rama del `if` que no se toma, con el motor real (hito 2C)', () => {
  const PROGRAMA = [
    'public class Rama {',
    '    public static void main(String[] args) {',
    '        int n = 5;',
    '        if (n > 10) {',
    '            System.out.println("grande");',
    '        } else if (n > 3) {',
    '            System.out.println("medio");',
    '        } else {',
    '            System.out.println("chico");',
    '        }',
    '    }',
    '}',
  ].join('\n');

  /** El código atenuado en el editor, una pieza por línea, SIN la etiqueta que lo acompaña. */
  function atenuado(): string {
    return Array.from(document.querySelectorAll('.cm-rama-no-tomada'))
      .map((pieza) => {
        const copia = pieza.cloneNode(true) as HTMLElement;
        copia.querySelectorAll('.cm-etiqueta-rama-no-tomada').forEach((etiqueta) => etiqueta.remove());
        return copia.textContent ?? '';
      })
      .join('\n');
  }

  it('en la condición falsa del `if` se atenúa su bloque; en la del `else if` verdadera, el `else`; y al salir de la condición, nada', async () => {
    render(<App />);
    escribirPrograma(PROGRAMA);
    await pulsar(/visualizar/i);
    await pulsar(/siguiente/i);
    expect(atenuado()).toBe('');

    await pulsar(/siguiente/i); // `n > 10` es falso: el programa se salta el bloque de «grande»
    expect(globo()).toContain('Reviso n > 10');
    expect(atenuado()).toBe('{\n            System.out.println("grande");\n        }');
    expect(document.querySelectorAll('.cm-etiqueta-rama-no-tomada')).toHaveLength(1);

    await pulsar(/siguiente/i); // `n > 3` es verdadero: se salta el `else` final
    expect(globo()).toContain('Reviso n > 3');
    expect(atenuado()).toBe('{\n            System.out.println("chico");\n        }');

    await pulsar(/siguiente/i); // ya no es una condición
    expect(atenuado()).toBe('');
    expect(document.querySelector('.cm-etiqueta-rama-no-tomada')).toBeNull();
  });

  it('con la primera condición verdadera, el `else if` completo (con su propio `else`) es lo que se atenúa', async () => {
    render(<App />);
    escribirPrograma(PROGRAMA.replace('int n = 5;', 'int n = 50;'));
    await pulsar(/visualizar/i);
    await pulsar(/siguiente/i);
    await pulsar(/siguiente/i); // `n > 10` es verdadero
    expect(atenuado()).toBe(
      ['if (n > 3) {', '            System.out.println("medio");', '        } else {', '            System.out.println("chico");', '        }'].join('\n'),
    );
  });
});

describe('<App/> — un ciclo que no termina, con el motor real (hito 2C)', () => {
  const CICLO_INFINITO = readFileSync(resolve(import.meta.dirname, '../../corpus/curso/u6-ciclo-infinito-demo.java'), 'utf8');

  it('desde el paso 0 el alumno lee que el visualizador se detuvo por seguridad y por qué: «contador siempre valió 1»', async () => {
    render(<App />);
    escribirPrograma(CICLO_INFINITO);
    await pulsar(/visualizar/i);

    expect(globo()).toContain('Todavía no se ejecuta nada');
    expect(globo()).toContain('El programa llevaba demasiados pasos y todavía no terminaba.');
    expect(globo()).toContain('contador siempre valió 1 en las últimas 100 vueltas');
    expect(screen.getAllByText('Paso 0 de 100001').length).toBeGreaterThan(0);
  }, 30_000);
});

describe('<App/> — el alumno corrige y vuelve a visualizar', () => {
  it('«Editar programa» devuelve el editor y, al corregir y visualizar de nuevo, se ve el programa nuevo', async () => {
    render(<App />);
    await pulsar(/visualizar/i);
    await pulsar(/editar programa/i);

    escribirPrograma(['public class Otro {', '    public static void main(String[] args) {', '        System.out.println("Otro programa");', '    }', '}'].join('\n'));
    await pulsar(/visualizar/i);
    await pulsar(/fin/i);

    expect(screen.getByTestId('consola').textContent).toBe('Otro programa\n');
  });

  it('un error de compilación se explica en el globo del robot y se subraya en el editor', async () => {
    render(<App />);
    escribirPrograma(['public class Saludo {', '    public static void main(String[] args) {', '        System.out.println("Hola")', '    }', '}'].join('\n'));
    await pulsar(/visualizar/i);

    const aviso = await screen.findByRole('alert');
    expect(aviso.textContent).toContain('Error de compilación');
    expect(aviso.textContent).toContain('Línea 3: ');
    expect(document.querySelector('.cm-problema-error')).not.toBeNull();
    expect(document.querySelector('.cm-marca-problema')?.textContent).toBe('✖');
  });
});

// Tarea 5.7 (REQ-PLAT-008): el aviso de versión nueva queda conectado a la pantalla. El registro del service worker se inyecta (jsdom no tiene service workers); el contrato real del registro lo prueba
// `pwa/registro.test.ts` y el de un navegador de verdad `pruebas/e2e/actualizacion.spec.ts`.
describe('<App/> — el aviso de versión nueva', () => {
  type Registrar = NonNullable<PropiedadesApp['registrarPwa']>;

  function registroConVersionNueva(): { registrar: Registrar; publicarVersion: (aplicar: () => void) => void } {
    let avisar: ((aplicar: () => void) => void) | undefined;
    const registrar: Registrar = (_navegador, opciones) => {
      avisar = opciones?.alHaberVersionNueva;
      return () => undefined;
    };
    return { registrar, publicarVersion: (aplicar) => act(() => avisar?.(aplicar)) };
  }

  it('sin una versión nueva la pantalla no muestra ningún aviso (y la región de estado está lista, vacía)', () => {
    const { registrar } = registroConVersionNueva();
    render(<App registrarPwa={registrar} />);

    expect(screen.getByRole('status').innerHTML).toBe('');
    expect(screen.queryByRole('button', { name: /recargar ahora/i })).toBeNull();
  });

  it('cuando llega una versión nueva el aviso aparece y «Recargar ahora» la activa, sin sacar al alumno del visualizador', async () => {
    const { registrar, publicarVersion } = registroConVersionNueva();
    const aplicar = vi.fn();
    render(<App registrarPwa={registrar} />);

    publicarVersion(aplicar);
    expect(screen.getByRole('status').textContent).toContain('Hay una versión nueva del visualizador.');
    await pulsar(/recargar ahora/i);

    expect(aplicar).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /visualizar/i }).textContent).toBe('Visualizar');
  });
});
