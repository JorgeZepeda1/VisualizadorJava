// RED de la tarea 1.28: `errorEnLinea` antepone la línea al texto de un error de compilación
// («Línea 3: Te falta un punto y coma…», decisión del PO 2026-09-29). Vive en el catálogo de
// interfaz (ADR 015) porque «Línea» es un texto de pantalla: la presentación no arma frases sueltas.
import { describe, expect, it } from 'vitest';
import { textosInterfaz } from './interfaz.ts';

describe('textosInterfaz.errorEnLinea — antepone la línea al texto del error', () => {
  it('«Línea 3: …» con el texto tal cual', () => {
    expect(textosInterfaz.errorEnLinea(3, 'Te falta un punto y coma ";" al final de esta línea.')).toBe(
      'Línea 3: Te falta un punto y coma ";" al final de esta línea.',
    );
  });

  it('triangulación: otra línea y otro texto', () => {
    expect(textosInterfaz.errorEnLinea(28, 'Esta línea nunca se ejecuta.')).toBe('Línea 28: Esta línea nunca se ejecuta.');
  });
});
