// RED de las tareas 4.3 y 4.4 (REQ-VIS-001, REQ-VIS-002, REQ-VIS-004, REQ-VIS-007): el editor completo de CodeMirror 6 — resaltado de Java, números de línea, Tab que no se captura, caracteres
// invisibles a la vista — y los resaltados que recibe por `props` (línea recién ejecutada y siguiente con DOS marcas distintas, etiqueta de vuelta junto al ciclo, subrayado de un error o un
// aviso). Lo que jsdom puede probar de verdad (no hace layout): decoraciones, clases, marcadores del margen y atributos. El recorrido con teclado real vive en `pruebas/e2e/`.
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { ResaltadoDeProblema, ResaltadosDelEditor } from '../../presentacion/index.ts';
import { EditorJava } from './EditorJava.tsx';

// --- Tarea 4.3 (REQ-VIS-001) -----------------------------------------------------------------------------------------------------------------------
const PROGRAMA = ['public class Hola {', '    public static void main(String[] args) {', '        int x = 5;', '    }', '}'].join('\n');

describe('<EditorJava/> — editor completo (REQ-VIS-001)', () => {
  it('un programa pegado se ve con números de línea, sin configurar nada', () => {
    const { container } = render(<EditorJava valor={PROGRAMA} />);
    const numeros = Array.from(container.querySelectorAll('.cm-lineNumbers .cm-gutterElement')).map((e) => e.textContent);
    expect(numeros).toEqual(expect.arrayContaining(['1', '2', '3', '4', '5']));
  });

  it('resalta la sintaxis de Java: las palabras reservadas van en su propio elemento con estilo', () => {
    const { container } = render(<EditorJava valor={PROGRAMA} />);
    const palabras = Array.from(container.querySelectorAll('.cm-line span')).filter((e) => e.textContent === 'public');
    expect(palabras.length).toBeGreaterThan(0);
    expect(palabras[0]?.className.length).toBeGreaterThan(0);
  });

  it('triangulación: otro programa, otra palabra reservada resaltada (while)', () => {
    const { container } = render(<EditorJava valor={'while (true) {\n}'} />);
    expect(Array.from(container.querySelectorAll('.cm-line span')).some((e) => e.textContent === 'while')).toBe(true);
  });

  it('Tab no se captura: el editor no impide que el foco siga su camino (sin trampa de teclado, WCAG 2.1.2)', () => {
    const { container } = render(<EditorJava valor={PROGRAMA} />);
    const contenido = container.querySelector('.cm-content') as HTMLElement;
    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    contenido.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(false);
  });

  it('el editor tiene un nombre accesible', () => {
    const { container } = render(<EditorJava valor="x" />);
    expect(container.querySelector('.cm-content')?.getAttribute('aria-label')).toBe('Código Java');
  });

  it('muestra los caracteres invisibles que se pegan desde una página o un PDF, con su nombre en español', () => {
    const { container } = render(<EditorJava valor={'int x = 5;​'} />);
    const marcas = Array.from(container.querySelectorAll('.cm-specialChar'));
    expect(marcas.map((m) => m.getAttribute('title'))).toEqual(['Espacio de no separación (U+00A0)', 'Espacio de ancho cero (U+200B)']);
  });

  it('en solo lectura el código sigue pudiendo recibir el foco: es una región desplazable y el teclado debe poder moverla (axe: scrollable-region-focusable)', () => {
    const { container, rerender } = render(<EditorJava valor={PROGRAMA} soloLectura />);
    const contenido = () => container.querySelector('.cm-content');
    expect(contenido()?.getAttribute('contenteditable')).toBe('false');
    expect(contenido()?.getAttribute('tabindex')).toBe('0');

    // Al volver a editar, el editor sigue contando con tabindex 0 (C4 del panel 1): `contenteditable` solo NO basta para axe. Con un programa más alto que el editor, `.cm-scroller` es una región
    // desplazable y axe (`scrollable-region-focusable`, grave) exige un elemento enfocable con `tabindex` dentro: lo vio en el estado de error y en cualquier edición de un programa largo.
    rerender(<EditorJava valor={PROGRAMA} soloLectura={false} />);
    expect(contenido()?.getAttribute('contenteditable')).toBe('true');
    expect(contenido()?.getAttribute('tabindex')).toBe('0');
  });

  it('el editor editable también lleva tabindex 0 desde que se crea (la primera visita y el estado de error son de edición)', () => {
    const { container } = render(<EditorJava valor={PROGRAMA} />);
    expect(container.querySelector('.cm-content')?.getAttribute('contenteditable')).toBe('true');
    expect(container.querySelector('.cm-content')?.getAttribute('tabindex')).toBe('0');
  });

  it('un tabulador y un espacio corriente NO se marcan como caracteres especiales', () => {
    const { container } = render(<EditorJava valor={'int\tx = 5;'} />);
    expect(container.querySelectorAll('.cm-specialChar')).toHaveLength(0);
  });
});

// --- Tarea 4.4 (REQ-VIS-004, REQ-VIS-002, REQ-VIS-007) ---------------------------------------------------------------------------------------------
const CUATRO_LINEAS = 'uno\ndos\ntres\ncuatro';

function lineasConClase(contenedor: HTMLElement, clase: string): string[] {
  return Array.from(contenedor.querySelectorAll(`.cm-line.${clase}`)).map((l) => l.textContent ?? '');
}

function resaltados(parcial: Partial<ResaltadosDelEditor>): ResaltadosDelEditor {
  return { lineaEjecutada: null, lineaSiguiente: null, vueltas: [], ramaNoTomada: null, ...parcial };
}

describe('<EditorJava/> — línea recién ejecutada y línea siguiente (REQ-VIS-004)', () => {
  it('la línea 2 lleva la marca de «recién ejecutada» y la 3 la marca distinta de «siguiente»', () => {
    const { container } = render(<EditorJava valor={CUATRO_LINEAS} resaltados={resaltados({ lineaEjecutada: 2, lineaSiguiente: 3 })} />);
    expect(lineasConClase(container, 'cm-linea-ejecutada')).toEqual(['dos']);
    expect(lineasConClase(container, 'cm-linea-siguiente')).toEqual(['tres']);
  });

  it('cada marca tiene además su propio símbolo en el margen, con texto accesible (no solo color)', () => {
    const { container } = render(<EditorJava valor={CUATRO_LINEAS} resaltados={resaltados({ lineaEjecutada: 2, lineaSiguiente: 3 })} />);
    const ejecutada = container.querySelector('.cm-marca-ejecutada');
    const siguiente = container.querySelector('.cm-marca-siguiente');
    expect(ejecutada?.textContent).toBe('▶');
    expect(siguiente?.textContent).toBe('▷');
    expect(ejecutada?.getAttribute('title')).toBe('Línea recién ejecutada');
    expect(siguiente?.getAttribute('title')).toBe('Línea siguiente');
    expect(ejecutada?.textContent).not.toBe(siguiente?.textContent);
  });

  it('cuando son la misma línea, lleva las dos marcas', () => {
    const { container } = render(<EditorJava valor={CUATRO_LINEAS} resaltados={resaltados({ lineaEjecutada: 2, lineaSiguiente: 2 })} />);
    expect(lineasConClase(container, 'cm-linea-ejecutada')).toEqual(['dos']);
    expect(lineasConClase(container, 'cm-linea-siguiente')).toEqual(['dos']);
  });

  it('al cambiar los resaltados, las marcas se mueven (la anterior desaparece)', () => {
    const { container, rerender } = render(<EditorJava valor={CUATRO_LINEAS} resaltados={resaltados({ lineaEjecutada: 1, lineaSiguiente: 2 })} />);
    rerender(<EditorJava valor={CUATRO_LINEAS} resaltados={resaltados({ lineaEjecutada: 3, lineaSiguiente: 4 })} />);
    expect(lineasConClase(container, 'cm-linea-ejecutada')).toEqual(['tres']);
    expect(lineasConClase(container, 'cm-linea-siguiente')).toEqual(['cuatro']);
  });

  it('sin resaltados no hay marcas', () => {
    const { container } = render(<EditorJava valor={CUATRO_LINEAS} resaltados={null} />);
    expect(container.querySelector('.cm-linea-ejecutada, .cm-linea-siguiente')).toBeNull();
  });

  it('las marcas siguen en el editor de solo lectura (así se ve durante la visualización)', () => {
    const { container } = render(<EditorJava valor={CUATRO_LINEAS} soloLectura resaltados={resaltados({ lineaEjecutada: 2 })} />);
    expect(lineasConClase(container, 'cm-linea-ejecutada')).toEqual(['dos']);
  });

  it('una línea que no existe en el programa no rompe nada', () => {
    const { container } = render(<EditorJava valor={CUATRO_LINEAS} resaltados={resaltados({ lineaEjecutada: 99, lineaSiguiente: 0 })} />);
    expect(container.querySelector('.cm-linea-ejecutada, .cm-linea-siguiente')).toBeNull();
  });
});

describe('<EditorJava/> — contador de vueltas como etiqueta junto al ciclo (REQ-VIS-007)', () => {
  it('pone «↻ vuelta 2» al final de la línea del encabezado del ciclo', () => {
    const { container } = render(<EditorJava valor={CUATRO_LINEAS} resaltados={resaltados({ vueltas: [{ linea: 2, vuelta: 2, termino: false }] })} />);
    const etiquetas = Array.from(container.querySelectorAll('.cm-etiqueta-de-vuelta'));
    expect(etiquetas.map((e) => e.textContent)).toEqual(['↻ vuelta 2']);
    expect(etiquetas[0]?.closest('.cm-line')?.textContent).toContain('dos');
  });

  it('un ciclo que terminó lo dice', () => {
    const { container } = render(<EditorJava valor={CUATRO_LINEAS} resaltados={resaltados({ vueltas: [{ linea: 1, vuelta: 3, termino: true }] })} />);
    expect(container.querySelector('.cm-etiqueta-de-vuelta')?.textContent).toBe('↻ vuelta 3 (terminó)');
  });

  it('dos ciclos anidados llevan cada uno su etiqueta', () => {
    const { container } = render(
      <EditorJava
        valor={CUATRO_LINEAS}
        resaltados={resaltados({
          vueltas: [
            { linea: 1, vuelta: 2, termino: false },
            { linea: 3, vuelta: 3, termino: false },
          ],
        })}
      />,
    );
    expect(Array.from(container.querySelectorAll('.cm-etiqueta-de-vuelta')).map((e) => e.textContent)).toEqual(['↻ vuelta 2', '↻ vuelta 3']);
  });
});

describe('<EditorJava/> — la rama del `if` que no se toma, atenuada y con etiqueta (REQ-VIS-006, hito 2C)', () => {
  const IF_ELSE = ['if (n > 3) {', '    uno();', '} else {', '    dos();', '}'].join('\n');
  // Los dos bloques del programa: el `entonces` va de la primera llave a su cierre y el `sino` de la segunda llave de apertura al final.
  const ENTONCES = { desde: IF_ELSE.indexOf('{'), hasta: IF_ELSE.indexOf('}') + 1 };
  const SINO = { desde: IF_ELSE.lastIndexOf('{'), hasta: IF_ELSE.length };

  /** El código atenuado, línea por línea, SIN la etiqueta que lo acompaña (esa se prueba aparte). */
  function textoAtenuado(contenedor: HTMLElement): string {
    return Array.from(contenedor.querySelectorAll('.cm-rama-no-tomada'))
      .map((e) => {
        const copia = e.cloneNode(true) as HTMLElement;
        copia.querySelectorAll('.cm-etiqueta-rama-no-tomada').forEach((etiqueta) => etiqueta.remove());
        return copia.textContent ?? '';
      })
      .join('\n');
  }

  it('atenúa el bloque del `entonces` (varias líneas) y NO lo oculta: el texto sigue en el documento', () => {
    const { container } = render(<EditorJava valor={IF_ELSE} resaltados={resaltados({ ramaNoTomada: ENTONCES })} />);
    expect(textoAtenuado(container)).toBe('{\n    uno();\n}');
    expect(container.querySelector('.cm-content')?.textContent).toContain('uno();');
  });

  it('triangulación: atenuar el `sino` deja el `entonces` normal', () => {
    const { container } = render(<EditorJava valor={IF_ELSE} resaltados={resaltados({ ramaNoTomada: SINO })} />);
    expect(textoAtenuado(container)).toBe('{\n    dos();\n}');
    expect(textoAtenuado(container)).not.toContain('uno();');
  });

  it('lleva una etiqueta en palabras, al final de la primera línea de la rama: no depende solo del color', () => {
    const { container } = render(<EditorJava valor={IF_ELSE} resaltados={resaltados({ ramaNoTomada: SINO })} />);
    const etiquetas = Array.from(container.querySelectorAll('.cm-etiqueta-rama-no-tomada'));
    expect(etiquetas.map((e) => e.textContent)).toEqual(['✗ esta rama no se ejecuta']);
    expect(etiquetas[0]?.closest('.cm-line')?.textContent).toContain('} else {');
  });

  it('una rama de una sola línea (un `if` sin llaves) se atenúa entera', () => {
    const sinLlaves = 'if (n == 5) cinco();\nseguir();';
    const rama = { desde: sinLlaves.indexOf('cinco'), hasta: sinLlaves.indexOf('\n') };
    const { container } = render(<EditorJava valor={sinLlaves} resaltados={resaltados({ ramaNoTomada: rama })} />);
    expect(textoAtenuado(container)).toBe('cinco();');
    expect(container.querySelectorAll('.cm-etiqueta-rama-no-tomada')).toHaveLength(1);
  });

  it('sin rama que atenuar no hay atenuado ni etiqueta', () => {
    const { container } = render(<EditorJava valor={IF_ELSE} resaltados={resaltados({ ramaNoTomada: null })} />);
    expect(container.querySelector('.cm-rama-no-tomada, .cm-etiqueta-rama-no-tomada')).toBeNull();
  });

  it('al pasar al paso siguiente la atenuación anterior desaparece', () => {
    const { container, rerender } = render(<EditorJava valor={IF_ELSE} resaltados={resaltados({ ramaNoTomada: ENTONCES })} />);
    expect(textoAtenuado(container)).toBe('{\n    uno();\n}');
    rerender(<EditorJava valor={IF_ELSE} resaltados={resaltados({ ramaNoTomada: null })} />);
    expect(container.querySelector('.cm-rama-no-tomada, .cm-etiqueta-rama-no-tomada')).toBeNull();
  });

  it('un rango que se pasa del final del programa se recorta, sin romper el editor', () => {
    const { container } = render(<EditorJava valor={IF_ELSE} resaltados={resaltados({ ramaNoTomada: { desde: SINO.desde, hasta: 9999 } })} />);
    expect(textoAtenuado(container)).toBe('{\n    dos();\n}');
  });

  it('un rango vacío no atenúa nada ni deja una etiqueta suelta', () => {
    const { container } = render(<EditorJava valor={IF_ELSE} resaltados={resaltados({ ramaNoTomada: { desde: 5, hasta: 5 } })} />);
    expect(container.querySelector('.cm-rama-no-tomada, .cm-etiqueta-rama-no-tomada')).toBeNull();
  });
});

describe('<EditorJava/> — subrayado de un error o un aviso (REQ-VIS-002)', () => {
  function problema(parcial: Partial<ResaltadoDeProblema>): ResaltadoDeProblema {
    return { desde: 4, hasta: 7, linea: 2, tipo: 'error', ...parcial };
  }

  it('un error de compilación se subraya sobre su rango (ondulado) y lleva ✖ en el margen', () => {
    const { container } = render(<EditorJava valor={CUATRO_LINEAS} problema={problema({})} />);
    expect(Array.from(container.querySelectorAll('.cm-problema-error')).map((e) => e.textContent)).toEqual(['dos']);
    expect(container.querySelector('.cm-marca-problema')?.textContent).toBe('✖');
  });

  it('un aviso de «no disponible» se subraya distinto (punteado) y lleva ⓘ', () => {
    const { container } = render(<EditorJava valor={CUATRO_LINEAS} problema={problema({ tipo: 'aviso', desde: 8, hasta: 12, linea: 3 })} />);
    expect(Array.from(container.querySelectorAll('.cm-problema-aviso')).map((e) => e.textContent)).toEqual(['tres']);
    expect(container.querySelector('.cm-problema-error')).toBeNull();
    expect(container.querySelector('.cm-marca-problema')?.textContent).toBe('ⓘ');
  });

  it('un rango vacío subraya toda la línea', () => {
    const { container } = render(<EditorJava valor={CUATRO_LINEAS} problema={problema({ desde: 4, hasta: 4, linea: 2 })} />);
    expect(Array.from(container.querySelectorAll('.cm-problema-error')).map((e) => e.textContent)).toEqual(['dos']);
  });

  it('un rango que se pasa del final del programa se recorta, sin romper el editor', () => {
    const { container } = render(<EditorJava valor={CUATRO_LINEAS} problema={problema({ desde: 14, hasta: 500, linea: 4 })} />);
    expect(Array.from(container.querySelectorAll('.cm-problema-error')).map((e) => e.textContent)).toEqual(['uatro']);
  });

  it('sin problema no hay subrayado', () => {
    const { container } = render(<EditorJava valor={CUATRO_LINEAS} problema={null} />);
    expect(container.querySelector('.cm-problema-error, .cm-problema-aviso')).toBeNull();
  });
});
