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
  'clase-llamada-string': { nombreClase: 'String' },
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

// Tarea 1.34 (defensa en profundidad, aprobada por el PO el 2026-10-02): el texto decía «Java compiló tu clase "X" sin problema», una afirmación sobre javac que el visualizador
// no puede garantizar (solo sabe que la clase pasó SUS revisiones). Ahora dice lo que se revisó. El detalle secundario, el texto exacto del lanzador, no se toca.
describe('textosArranque — dicen lo que se revisó, no lo que Java haría con la clase (tarea 1.34)', () => {
  it('"sin-main": «Tu clase "X" pasó todas mis revisiones, pero Java no encuentra por dónde EMPEZAR…», con cómo se escribe `main`', () => {
    expect(textosArranque['sin-main']({ nombreClase: 'Ejercicio3' })).toBe(
      'Tu clase "Ejercicio3" pasó todas mis revisiones, pero Java no encuentra por dónde EMPEZAR a ejecutarla: le falta un método "main". Agrégalo así: "public static void main(String[] args) { ... }".',
    );
  });

  it('"main-no-static": mismo cambio, y sigue señalando la palabra "static"', () => {
    expect(textosArranque['main-no-static']({ nombreClase: 'Demo' })).toBe(
      'Tu clase "Demo" pasó todas mis revisiones, pero su método "main" existe sin la palabra "static" — y sin eso, Java no puede arrancarlo. Escríbelo así: "public static void main(String[] args)".',
    );
  });

  it('"clase-llamada-string": explica que el `String[]` de `main` ya no es el de Java y pide cambiar el nombre de la clase (no dice que le falta un `main`)', () => {
    const texto = textosArranque['clase-llamada-string']({ nombreClase: 'String' });
    expect(texto).toBe(
      'Tu clase "String" pasó todas mis revisiones, pero se llama igual que la clase "String" de Java y por eso el "String[] args" de "main" ya no es el de Java: ' +
        'Java no encuentra por dónde EMPEZAR a ejecutarla. Cámbiale el nombre a tu clase.',
    );
    expect(texto).not.toContain('le falta un método');
  });

  it.each(Object.keys(DATOS_DE_EJEMPLO) as CodigoArranque[])('"%s" ya no afirma que Java compiló la clase', (codigo) => {
    expect(textosArranque[codigo](DATOS_DE_EJEMPLO[codigo])).not.toMatch(/Java compiló|sin problema/);
  });
});
