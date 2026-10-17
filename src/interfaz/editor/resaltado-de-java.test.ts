// RED de la tarea 4.15 (REQ-PLAT-005 parte: contraste AA) y 4.3 (REQ-VIS-001: resaltado de sintaxis de Java): los colores del resaltado de Java. El estilo por omisión de CodeMirror se hizo para fondo
// blanco y se queda corto en contraste sobre las líneas teñidas (la «recién ejecutada», verde, y la «siguiente», ámbar): axe lo marcó como `color-contrast`. Estos colores son propios y se
// prueban contra TODOS los fondos que el editor puede tener —leídos de la hoja de estilos, para que no puedan divergir de ella—, con el mínimo de WCAG AA (4.5:1 para texto normal).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COLORES_DE_SINTAXIS } from './resaltado-de-java.ts';

const HOJA_DE_ESTILOS = readFileSync(resolve(import.meta.dirname, '../estilos/aplicacion.css'), 'utf8');

/** El valor de una variable CSS de `:root` (p. ej. `--siguiente-fondo`), como `#rrggbb`. */
function variableDeLaHoja(nombre: string): string {
  const coincidencia = new RegExp(`${nombre}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(HOJA_DE_ESTILOS);
  if (coincidencia?.[1] === undefined) throw new Error(`la hoja de estilos no define ${nombre}`);
  return coincidencia[1];
}

function luminancia(color: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((inicio) => {
    const canal = parseInt(color.slice(inicio, inicio + 2), 16) / 255;
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** La razón de contraste de WCAG 2.x entre dos colores. */
function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return ((claro ?? 0) + 0.05) / ((oscuro ?? 0) + 0.05);
}

// Todos los fondos sobre los que puede ir texto de código: el del editor, las dos líneas teñidas, el margen y el aviso de caracteres invisibles.
const FONDOS_DEL_EDITOR: Readonly<Record<string, string>> = {
  'el editor': variableDeLaHoja('--superficie'),
  'la línea recién ejecutada': variableDeLaHoja('--ejecutada-fondo'),
  'la línea siguiente': variableDeLaHoja('--siguiente-fondo'),
  'el fondo de un error': variableDeLaHoja('--error-fondo'),
};

describe('contraste: la fórmula de WCAG', () => {
  it('negro sobre blanco es 21:1 y un color sobre sí mismo es 1:1', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contraste('#336699', '#336699')).toBeCloseTo(1, 5);
  });
});

describe('COLORES_DE_SINTAXIS: el resaltado de Java pasa AA sobre cada fondo del editor', () => {
  for (const [categoria, color] of Object.entries(COLORES_DE_SINTAXIS)) {
    for (const [fondo, valorDelFondo] of Object.entries(FONDOS_DEL_EDITOR)) {
      it(`${categoria} (${color}) sobre ${fondo} (${valorDelFondo}): al menos 4.5:1`, () => {
        expect(contraste(color, valorDelFondo)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('cada categoría de la sintaxis tiene su propio color (el resaltado distingue palabras reservadas, textos, números, comentarios y tipos)', () => {
    const colores = Object.values(COLORES_DE_SINTAXIS);
    expect(new Set(colores).size).toBe(colores.length);
  });
});
