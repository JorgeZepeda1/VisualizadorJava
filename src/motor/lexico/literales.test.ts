// RED de la tarea 0.12: decodificación mínima de literales de cadena. El catálogo completo de
// escapes (incluidos los NO-DISP) llega en la tarea 1.1; aquí solo los escapes de la rebanada
// vertical: comilla, barra invertida, salto de línea y tabulador.
import { describe, expect, it } from 'vitest';
import { leerCadena } from './literales.ts';

describe('leerCadena', () => {
  it('lee una cadena simple sin escapes y reporta cuánto texto fuente consumió', () => {
    const resultado = leerCadena('"Hola, mundo"', 0);
    expect(resultado).toEqual({ valor: 'Hola, mundo', longitud: 13 });
  });

  it('decodifica \\" y \\\\ dentro de la cadena', () => {
    const resultado = leerCadena(String.raw`"di \"hola\\" `, 0);
    expect(resultado.valor).toBe('di "hola\\');
  });

  it('decodifica \\n y \\t', () => {
    const resultado = leerCadena(String.raw`"a\nb\tc"`, 0);
    expect(resultado.valor).toBe('a\nb\tc');
  });

  it('lee la cadena a partir de un desplazamiento distinto de 0', () => {
    const resultado = leerCadena('  "ho"', 2);
    expect(resultado).toEqual({ valor: 'ho', longitud: 4 });
  });

  it('lanza un error con rango si la cadena no cierra', () => {
    expect(() => leerCadena('"sin cerrar', 0)).toThrow();
  });

  it('lanza un error si el escape no es reconocido (catálogo completo llega en 1.1)', () => {
    expect(() => leerCadena(String.raw`"\q"`, 0)).toThrow();
  });
});
