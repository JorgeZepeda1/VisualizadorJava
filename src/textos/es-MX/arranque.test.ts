// RED de la tarea 1.15 (catálogo es-MX de arranque, ADR 015). El motor SOLO emite `codigo` +
// `nombreClase` (`ProblemaArranque`, `src/motor/problemas.ts`); este catálogo es el ÚNICO lugar
// que arma el texto AMABLE ("texto principal", decisión del orquestador, design.md §2.2) en
// español de México para las 2 claves cerradas de `CodigoArranque`. El texto EXACTO del lanzador
// (`ProblemaArranque.textoLanzador`, ya calculado por `semantica/arranque.ts`) se muestra "tal
// cual" (ADR 015 punto 2) como detalle secundario -- este catálogo NUNCA lo reconstruye.
import { describe, expect, it } from 'vitest';
import { textosArranque } from './arranque.ts';
import type { CodigoArranque } from '../../motor/vista.ts';

const DATOS_DE_EJEMPLO: Record<CodigoArranque, { readonly nombreClase: string }> = {
  'sin-main': { nombreClase: 'Ejercicio3' },
  'main-no-static': { nombreClase: 'Demo' },
};

describe('textosArranque — catálogo completo (ADR 015): cada código produce una frase real', () => {
  it.each(Object.keys(DATOS_DE_EJEMPLO) as CodigoArranque[])('"%s" no produce texto vacío ni restos sin resolver', (codigo) => {
    const texto = textosArranque[codigo](DATOS_DE_EJEMPLO[codigo]);
    expect(typeof texto).toBe('string');
    expect(texto.length).toBeGreaterThan(0);
    expect(texto).not.toMatch(/undefined|\[object Object\]|\{[a-zA-Z]/);
  });
});

describe('textosArranque — menciona el nombre REAL de la clase del alumno (nunca uno inventado)', () => {
  it('"sin-main" incluye el nombre de la clase que escribió el alumno', () => {
    const texto = textosArranque['sin-main']({ nombreClase: 'Ejercicio3' });
    expect(texto).toContain('Ejercicio3');
  });

  it('triangulación: OTRO nombre de clase produce OTRO texto (no un texto fijo)', () => {
    const texto = textosArranque['sin-main']({ nombreClase: 'CalculadoraVueltos' });
    expect(texto).toContain('CalculadoraVueltos');
    expect(texto).not.toContain('Ejercicio3');
  });

  it('"main-no-static" incluye el nombre de la clase Y la palabra "static" (la pista real de qué falta)', () => {
    const texto = textosArranque['main-no-static']({ nombreClase: 'Demo' });
    expect(texto).toContain('Demo');
    expect(texto).toContain('static');
  });
});

// REQ-COMP-008: el texto AMABLE nunca reproduce el bug de escape del lanzador real (design.md
// §2.2: "MUST NOT reproducir el error de escape... donde el texto trae literalmente los
// caracteres \n") -- eso es exclusivo de `ProblemaArranque.textoLanzador` (detalle secundario).
describe('textosArranque — nunca reproduce la rareza del "\\n" literal del lanzador (REQ-COMP-008)', () => {
  it('"sin-main" no contiene la secuencia de escape "\\n" literal', () => {
    const texto = textosArranque['sin-main']({ nombreClase: 'Ejercicio3' });
    expect(texto).not.toContain('\\n');
  });
});
