// RED de la tarea R0.6 (REQ-PANT-009, WCAG 2.3.3, design.md §6.6): TODO movimiento de la hoja de estilos vive dentro de `prefers-reduced-motion: no-preference`, y con `reduce` se apaga lo que quedara. Incluye el
// fundido de 150 ms con que entra el robot nuevo al cambiar el hablante. Como jsdom no calcula estilos, aquí se lee la hoja de estilos como texto (el E2E `accesibilidad-base.spec.ts` comprueba el efecto real
// en el navegador): una animación o una transición fuera del bloque `no-preference` es un movimiento que un alumno que pidió reducirlo sí vería.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const HOJAS = ['aplicacion.css', 'proyector.css'] as const;

function leerHoja(nombre: string): string {
  return readFileSync(resolve(import.meta.dirname, '../../src/interfaz/estilos', nombre), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** El contenido (sin las llaves exteriores) de cada bloque `@media <condición> { … }` cuya condición contiene `condicion`. */
function bloquesDeMedia(css: string, condicion: string): string[] {
  const bloques: string[] = [];
  let desde = 0;
  for (;;) {
    const inicio = css.indexOf('@media', desde);
    if (inicio === -1) return bloques;
    const apertura = css.indexOf('{', inicio);
    let profundidad = 1;
    let cursor = apertura + 1;
    while (profundidad > 0 && cursor < css.length) {
      if (css[cursor] === '{') profundidad += 1;
      if (css[cursor] === '}') profundidad -= 1;
      cursor += 1;
    }
    if (css.slice(inicio, apertura).includes(condicion)) bloques.push(css.slice(apertura + 1, cursor - 1));
    desde = cursor;
  }
}

/** La hoja sin los bloques `@media (prefers-reduced-motion: …)`: lo que se aplica siempre, con o sin la preferencia. */
function fueraDeLosBloquesDeMovimiento(css: string): string {
  let resultado = css;
  for (const condicion of ['(prefers-reduced-motion: no-preference)', '(prefers-reduced-motion: reduce)']) {
    for (const bloque of bloquesDeMedia(css, condicion)) resultado = resultado.replace(bloque, '');
  }
  return resultado;
}

const DECLARACION_DE_MOVIMIENTO = /(^|[\s;{])(animation(-name)?|transition(-property)?)\s*:\s*(?!none\b)/;

describe('movimiento reducido: nada se mueve fuera de `prefers-reduced-motion: no-preference`', () => {
  for (const hoja of HOJAS) {
    it(`${hoja}: ninguna animación ni transición se declara fuera de los bloques de la preferencia`, () => {
      const css = leerHoja(hoja);
      const siempre = fueraDeLosBloquesDeMovimiento(css);
      expect(siempre.match(DECLARACION_DE_MOVIMIENTO), hoja).toBeNull();
    });
  }

  it('con `reduce` se apaga cualquier animación y transición que hubiera, sin quitar información', () => {
    const reducido = bloquesDeMedia(leerHoja('aplicacion.css'), '(prefers-reduced-motion: reduce)').join('\n');
    expect(reducido).toMatch(/animation:\s*none\s*!important/);
    expect(reducido).toMatch(/transition:\s*none\s*!important/);
  });

  it('hay movimiento permitido (el robot y el globo se animan con `no-preference`): la prueba no pasa por estar vacía', () => {
    const permitido = bloquesDeMedia(leerHoja('aplicacion.css'), '(prefers-reduced-motion: no-preference)').join('\n');
    expect(permitido).toMatch(/animation:/);
    expect(permitido).toMatch(/@keyframes robot-balanceo/);
  });

  it('el robot nuevo entra con un fundido de 150 ms al cambiar el hablante, y solo con `no-preference`', () => {
    const permitido = bloquesDeMedia(leerHoja('aplicacion.css'), '(prefers-reduced-motion: no-preference)').join('\n');
    expect(permitido).toMatch(/\.robot\s*\{[^}]*animation:\s*robot-aparece\s+0?\.15s/);
    expect(permitido).toMatch(/@keyframes robot-aparece\s*\{[^@]*opacity:\s*0/);
  });
});
