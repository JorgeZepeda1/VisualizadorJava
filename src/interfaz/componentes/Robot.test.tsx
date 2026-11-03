// RED de la tarea 4.11 (REQ-VIS-011), ampliado en la tarea R0.5 (REQ-PANT-008, ADR 017): el robot — un dibujo SVG en línea (cero imágenes de red, ADR 014) — ahora en TRES personajes: el robot paso a paso
// (cabeza cuadrada con antena y un puntero ▶), el revisor (cabeza redonda tipo casco y una lupa con «!») y el del libro (cabeza ancha con lentes y un libro abierto). Cada uno se reconoce por la forma de
// su cabeza y por su accesorio, además del color; los tres comparten `viewBox`, llevan su nombre visible bajo la figura y su nombre accesible (con el ánimo) del catálogo, y los cinco ánimos existen en cada
// cabeza. El movimiento (antena, parpadeo) vive en la hoja de estilos y se apaga con `prefers-reduced-motion` (lo vigila `pruebas/arquitectura/movimiento-reducido.test.ts` y el E2E).
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PersonajeDelRobot } from '../../textos/es-MX/robot.ts';
import { Robot } from './Robot.tsx';

const ANIMOS = ['normal', 'esperando', 'feliz', 'preocupado', 'seguridad'] as const;
const PERSONAJES: readonly PersonajeDelRobot[] = ['paso-a-paso', 'revisor', 'libro'];

const FORMAS: Readonly<Record<PersonajeDelRobot, string>> = { 'paso-a-paso': 'cuadrada-con-antena', revisor: 'redonda-tipo-casco', libro: 'ancha-con-lentes' };
const ACCESORIOS: Readonly<Record<PersonajeDelRobot, string>> = { 'paso-a-paso': 'puntero', revisor: 'lupa', libro: 'libro-abierto' };
const NOMBRES: Readonly<Record<PersonajeDelRobot, string>> = { 'paso-a-paso': 'Robot paso a paso', revisor: 'Robot revisor', libro: 'Robot del libro' };

function dibujoDe(personaje: PersonajeDelRobot, animo: (typeof ANIMOS)[number] = 'normal'): { container: HTMLElement; unmount: () => void; dibujo: SVGElement } {
  const { container, unmount } = render(<Robot personaje={personaje} animo={animo} />);
  return { container, unmount, dibujo: screen.getByRole('img') as unknown as SVGElement };
}

describe('<Robot/> — el dibujo', () => {
  it('es un dibujo SVG con una descripción en palabras que empieza por el nombre del robot', () => {
    const { dibujo } = dibujoDe('paso-a-paso');
    expect(dibujo.tagName.toLowerCase()).toBe('svg');
    expect(dibujo.getAttribute('aria-label')).toBe('Robot paso a paso: te explica cada paso');
  });

  it('cada ánimo tiene su descripción y queda en un atributo para que el estilo lo anime', () => {
    for (const personaje of PERSONAJES) {
      const descripciones = ANIMOS.map((animo) => {
        const { unmount, dibujo } = dibujoDe(personaje, animo);
        const resultado = { animo: dibujo.getAttribute('data-animo'), descripcion: dibujo.getAttribute('aria-label') };
        unmount();
        return resultado;
      });
      expect(descripciones.map((d) => d.animo), personaje).toEqual([...ANIMOS]);
      expect(new Set(descripciones.map((d) => d.descripcion)).size, personaje).toBe(ANIMOS.length);
    }
  });

  it('el rostro cambia con el ánimo en cada cabeza, no solo el color: la boca y los ojos son otros trazos', () => {
    for (const personaje of PERSONAJES) {
      const rostros = ANIMOS.map((animo) => {
        const { container, unmount } = dibujoDe(personaje, animo);
        const rostro = container.querySelector('[data-rostro]')?.innerHTML ?? '';
        unmount();
        return rostro;
      });
      expect(new Set(rostros).size, personaje).toBe(ANIMOS.length);
    }
  });

  // C5 del panel 1: las cejas con el extremo interior MÁS BAJO que el exterior se leen como enojo, justo cuando el alumno se equivoca. La preocupación amable es lo contrario: el extremo interior MÁS ALTO.
  describe('el rostro preocupado se ve preocupado, no enojado (C5), en las tres cabezas', () => {
    const CENTRO_DE_LA_CARA = 60;

    /** Las cejas: los trazos rectos `M x y L x y` del rostro, con su extremo interior (el más cercano al centro de la cara) y el exterior. */
    function cejasDe(personaje: PersonajeDelRobot): { interior: { x: number; y: number }; exterior: { x: number; y: number } }[] {
      const { container, unmount } = dibujoDe(personaje, 'preocupado');
      const trazos = Array.from(container.querySelectorAll('[data-rostro] path')).map((trazo) => trazo.getAttribute('d') ?? '');
      unmount();
      return trazos.flatMap((d) => {
        const recta = /^M\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*L\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/.exec(d);
        if (recta === null) return [];
        const a = { x: Number(recta[1]), y: Number(recta[2]) };
        const b = { x: Number(recta[3]), y: Number(recta[4]) };
        return Math.abs(a.x - CENTRO_DE_LA_CARA) < Math.abs(b.x - CENTRO_DE_LA_CARA) ? [{ interior: a, exterior: b }] : [{ interior: b, exterior: a }];
      });
    }

    it('tiene dos cejas, una de cada lado de la cara', () => {
      for (const personaje of PERSONAJES) {
        const cejas = cejasDe(personaje);
        expect(cejas, personaje).toHaveLength(2);
        expect(cejas.filter((c) => c.exterior.x < CENTRO_DE_LA_CARA), personaje).toHaveLength(1);
        expect(cejas.filter((c) => c.exterior.x > CENTRO_DE_LA_CARA), personaje).toHaveLength(1);
      }
    });

    it('el extremo interior de cada ceja está MÁS ARRIBA que el exterior (en SVG, y menor): cejas de preocupación, no de enojo', () => {
      for (const personaje of PERSONAJES) {
        for (const ceja of cejasDe(personaje)) {
          expect(ceja.interior.y, `${personaje}: interior en y=${ceja.interior.y}, exterior en y=${ceja.exterior.y}`).toBeLessThan(ceja.exterior.y);
        }
      }
    });

    it('las cejas quedan sobre los ojos y dentro de la cabeza (no tapan los ojos ni salen del dibujo)', () => {
      for (const personaje of PERSONAJES) {
        for (const ceja of cejasDe(personaje)) {
          for (const punto of [ceja.interior, ceja.exterior]) {
            expect(punto.y, personaje).toBeGreaterThan(26); // la cabeza empieza en y=26
            expect(punto.y, personaje).toBeLessThan(50); // los ojos (cy=56, r=6) empiezan en y=50
          }
        }
      }
    });
  });

  it('no pide nada a la red: ni imágenes, ni referencias externas (en ninguno de los tres)', () => {
    for (const personaje of PERSONAJES) {
      const { container, unmount } = dibujoDe(personaje, 'feliz');
      expect(container.querySelector('image'), personaje).toBeNull();
      expect(container.querySelector('use'), personaje).toBeNull();
      for (const elemento of Array.from(container.querySelectorAll('*'))) {
        for (const atributo of ['href', 'src', 'xlink:href']) {
          expect(elemento.getAttribute(atributo), `${personaje} ${atributo}`).toBeNull();
        }
      }
      expect(container.innerHTML, personaje).not.toMatch(/https?:/);
      unmount();
    }
  });
});

describe('<Robot/> — tres personajes distintos (REQ-PANT-008)', () => {
  it('cada personaje lleva su silueta (`data-forma`) y su accesorio, y los tres son distintos', () => {
    const rasgos = PERSONAJES.map((personaje) => {
      const { container, unmount, dibujo } = dibujoDe(personaje);
      const resultado = {
        personaje: dibujo.getAttribute('data-personaje'),
        forma: dibujo.getAttribute('data-forma'),
        accesorio: container.querySelector('[data-accesorio]')?.getAttribute('data-accesorio'),
      };
      unmount();
      return resultado;
    });
    expect(rasgos).toEqual(PERSONAJES.map((personaje) => ({ personaje, forma: FORMAS[personaje], accesorio: ACCESORIOS[personaje] })));
    expect(new Set(rasgos.map((r) => r.forma)).size).toBe(3);
    expect(new Set(rasgos.map((r) => r.accesorio)).size).toBe(3);
  });

  it('el accesorio está en TODOS los ánimos (también con la mano levantada de «seguridad»): sin él no se reconoce al personaje', () => {
    for (const personaje of PERSONAJES) {
      for (const animo of ANIMOS) {
        const { container, unmount } = dibujoDe(personaje, animo);
        expect(container.querySelectorAll('[data-accesorio]'), `${personaje} ${animo}`).toHaveLength(1);
        unmount();
      }
    }
  });

  it('la cabeza de cada personaje es otra forma, no solo otro color: el trazo de la cabeza y su relleno no coinciden entre personajes', () => {
    const cabezas = PERSONAJES.map((personaje) => {
      const { container, unmount } = dibujoDe(personaje);
      const cabeza = container.querySelector('[data-cabeza]')?.outerHTML ?? '';
      unmount();
      return cabeza;
    });
    expect(cabezas.every((cabeza) => cabeza.length > 0)).toBe(true);
    expect(new Set(cabezas).size).toBe(3);
  });

  it('los tres comparten `viewBox` (misma ranura al cambiar de hablante)', () => {
    const cajas = PERSONAJES.map((personaje) => {
      const { unmount, dibujo } = dibujoDe(personaje);
      const caja = dibujo.getAttribute('viewBox');
      unmount();
      return caja;
    });
    expect(cajas[0]).not.toBeNull();
    expect(new Set(cajas).size).toBe(1);
  });

  it('muestra el nombre visible bajo la figura, tomado del catálogo', () => {
    for (const personaje of PERSONAJES) {
      const { container, unmount } = dibujoDe(personaje);
      const nombre = container.querySelector('figcaption');
      expect(nombre?.textContent, personaje).toBe(NOMBRES[personaje]);
      expect(container.querySelector('svg')?.nextElementSibling, personaje).toBe(nombre);
      unmount();
    }
  });

  it('el nombre accesible empieza por el nombre visible y dice el ánimo: un lector de pantalla anuncia «Robot revisor: preocupado…»', () => {
    for (const personaje of PERSONAJES) {
      const { dibujo, unmount } = dibujoDe(personaje, 'preocupado');
      expect(dibujo.getAttribute('aria-label'), personaje).toMatch(new RegExp(`^${NOMBRES[personaje]}: preocupado`));
      unmount();
    }
  });

  it('en la figura no hay más de un robot: un único elemento con `data-personaje` por cada `<Robot/>`', () => {
    const { container } = render(<Robot personaje="revisor" animo="normal" />);
    expect(container.querySelectorAll('[data-personaje]')).toHaveLength(1);
  });
});
