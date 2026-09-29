// RED de la tarea 1.28 (agregada por el orquestador, decisión del PO 2026-09-29: «la pantalla
// muestra el texto real de cada problema»): los textos del catálogo es-MX marcan el código con
// comillas invertidas (`int[]`, `split`) y la pantalla NO debe mostrarlas crudas — cada tramo de
// código se pinta aparte (`<code>`, en `interfaz`). Esta función pura parte el texto en tramos
// (texto / código); una comilla invertida sin pareja queda como texto literal (nunca se pierde un
// carácter del alumno: p. ej. la comilla que tecleó por error y que el propio motor cita).
import { describe, expect, it } from 'vitest';
import { segmentarCodigoEnLinea, type SegmentoDeTexto } from './segmentos-de-codigo.ts';

const texto = (contenido: string): SegmentoDeTexto => ({ tipo: 'texto', texto: contenido });
const codigo = (contenido: string): SegmentoDeTexto => ({ tipo: 'codigo', texto: contenido });

// Inversa de la segmentación: vuelve a poner las comillas invertidas en los tramos de código.
// Sirve para probar que NUNCA se pierde ni se inventa un carácter.
function reconstruir(segmentos: readonly SegmentoDeTexto[]): string {
  return segmentos.map((s) => (s.tipo === 'codigo' ? `\`${s.texto}\`` : s.texto)).join('');
}

describe('segmentarCodigoEnLinea — parte el texto en tramos de texto y de código', () => {
  it('un tramo de código en medio del texto: texto, código, texto (sin comillas invertidas)', () => {
    expect(segmentarCodigoEnLinea('Tu programa usa un arreglo (`int[]`) en la línea 3.')).toEqual([
      texto('Tu programa usa un arreglo ('),
      codigo('int[]'),
      texto(') en la línea 3.'),
    ]);
  });

  it('triangulación: varios tramos de código, con otro contenido y otro orden', () => {
    expect(segmentarCodigoEnLinea('el método `split` de `String` no existe')).toEqual([
      texto('el método '),
      codigo('split'),
      texto(' de '),
      codigo('String'),
      texto(' no existe'),
    ]);
  });

  it('el código al principio y al final del texto no deja tramos de texto vacíos', () => {
    expect(segmentarCodigoEnLinea('`a` y `b`')).toEqual([codigo('a'), texto(' y '), codigo('b')]);
  });

  it('sin comillas invertidas, todo el texto es un solo tramo de texto', () => {
    expect(segmentarCodigoEnLinea('Te falta un punto y coma ";" al final de esta línea.')).toEqual([
      texto('Te falta un punto y coma ";" al final de esta línea.'),
    ]);
  });

  it('un texto vacío no produce ningún tramo', () => {
    expect(segmentarCodigoEnLinea('')).toEqual([]);
  });

  it('el contenido del código se conserva tal cual: espacios, diagonales invertidas y símbolos', () => {
    expect(segmentarCodigoEnLinea('un escape (`\\r`, `\\b`) o `new Scanner`')).toEqual([
      texto('un escape ('),
      codigo('\\r'),
      texto(', '),
      codigo('\\b'),
      texto(') o '),
      codigo('new Scanner'),
    ]);
  });
});

describe('segmentarCodigoEnLinea — una comilla invertida sin pareja queda como texto literal', () => {
  it('una sola comilla invertida: todo el texto, comilla incluida, es un tramo de texto', () => {
    expect(segmentarCodigoEnLinea('carácter no reconocido: "`"')).toEqual([texto('carácter no reconocido: "`"')]);
  });

  it('cantidad impar: las dos primeras forman pareja y la tercera queda literal', () => {
    expect(segmentarCodigoEnLinea('usa `x` y ` suelta')).toEqual([texto('usa '), codigo('x'), texto(' y ` suelta')]);
  });

  it('un par vacío ("``") no es código: queda literal', () => {
    expect(segmentarCodigoEnLinea('a `` b')).toEqual([texto('a `` b')]);
  });
});

describe('segmentarCodigoEnLinea — nunca pierde ni inventa un carácter', () => {
  it.each([
    'Tu programa usa un arreglo (`int[]`) en la línea 3.',
    'el método `split` de `String` no existe',
    '`a` y `b`',
    'carácter no reconocido: "`"',
    'usa `x` y ` suelta',
    'a `` b',
    'sin código',
    '',
  ])('reconstruir(segmentar(%j)) es el texto original', (original) => {
    expect(reconstruir(segmentarCodigoEnLinea(original))).toBe(original);
  });
});
