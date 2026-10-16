// Tarea 1.37 (W-12 de la verificación del delta del lote 1): el tope de ANIDAMIENTO. El analizador es recursivo (descenso por precedencia): cada paréntesis, cada instrucción dentro de otra, cada operador
// prefijo o cast, cada argumento de una llamada usa pila. Con la pila por omisión de Node, 700 paréntesis anidados lanzan `RangeError`; en Chromium, desde unos 400 (y en `compilar()`, `error-interno`:
// la pantalla decía «Algo falló dentro del visualizador»). El tope de 4 000 tokens no lo acota. Un contador de niveles en el analizador (`CursorDeTokens.entrarNivel`) + la medida exacta del árbol
// (`profundidad.ts`, para las cadenas que el analizador arma con un lazo) dan un aviso honesto, `ProgramaDemasiadoAnidado`, mucho antes de que la pila se agote.
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { type LimitesDeAnidamiento, MAXIMO_DE_NIVELES_DE_ANIDAMIENTO, ProgramaDemasiadoAnidado, SIN_LIMITES_DE_ANIDAMIENTO } from '../limites.ts';
import { analizarPrograma } from './analizador-sintactico.ts';

const programa = (cuerpo: string): string => `public class P {\n    public static void main(String[] args) {\n        int a = 1;\n        boolean b = true;\n        String s = "x";\n        ${cuerpo}\n    }\n}\n`;
const LINEA_DEL_CUERPO = 6;

type Forma = (d: number) => string;

/** Las formas cuya repetición mete DOS niveles (`!(`: un operador y un paréntesis; `.trim()`: una llamada y el acceso al método; `if (b) {`: la instrucción y su bloque); las demás meten uno. */
const NIVELES_POR_REPETICION = new Map<string, number>([
  ['negaciones con paréntesis', 2],
  ['llamadas encadenadas', 2],
  ['bloques con if', 2],
]);

/** Las formas de anidar (las 21 que midió el verificador y alguna más): cada una repite UNA construcción `d` veces. */
const FORMAS: ReadonlyArray<readonly [nombre: string, forma: Forma]> = [
  ['paréntesis anidados', (d) => `a = ${'('.repeat(d)}1${')'.repeat(d)};`],
  ['bloques anidados', (d) => `${'{'.repeat(d)}${'}'.repeat(d)}`],
  ['if anidados', (d) => `${'if (b) '.repeat(d)};`],
  ['else if en cadena', (d) => `if (b) a = 1;${' else if (b) a = 2;'.repeat(d)}`],
  ['while anidados', (d) => `${'while (b) '.repeat(d)};`],
  ['do-while anidados', (d) => `${'do '.repeat(d)};${' while (b);'.repeat(d)}`],
  ['for anidados', (d) => `${'for (int i = 0; i < 1; i++) '.repeat(d)};`],
  ['switch anidados', (d) => `${'switch (a) { case 1: '.repeat(d)};${' }'.repeat(d)}`],
  ['bloques con if', (d) => `${'if (b) {'.repeat(d)}${'}'.repeat(d)}`],
  ['negaciones sin paréntesis', (d) => `b = ${'!'.repeat(d)}b;`],
  ['signos menos', (d) => `a = ${'- '.repeat(d)}a;`],
  ['casts en cadena', (d) => `a = ${'(int) '.repeat(d)}1;`],
  ['asignaciones en cadena', (d) => `${'a = '.repeat(d)}1;`],
  ['ternarios en cadena', (d) => `a = ${'b ? 1 : '.repeat(d)}2;`],
  ['llamadas dentro de llamadas', (d) => `${'f('.repeat(d)}1${')'.repeat(d)};`],
  ['índices dentro de índices', (d) => `a = x${'[x'.repeat(d)}${']'.repeat(d)};`],
  ['argumentos de new', (d) => `s = ${'new T('.repeat(d)}${')'.repeat(d)};`],
  ['lambdas dentro de lambdas', (d) => `f(${'x -> '.repeat(d)}1);`],
  ['suma por la derecha', (d) => `a = ${'1 + ('.repeat(d)}1${')'.repeat(d)};`],
  ['negaciones con paréntesis', (d) => `b = ${'!('.repeat(d)}true${')'.repeat(d)};`],
  ['comparaciones anidadas', (d) => `b = ${'(a < '.repeat(d)}2${')'.repeat(d)} == true;`],
  // las cadenas que el analizador arma con un lazo (el árbol baja por la izquierda): las acota la medida del árbol, no el contador
  ['suma por la izquierda', (d) => `a = 1${' + 1'.repeat(d)};`],
  ['y lógico encadenado', (d) => `b = b${' && b'.repeat(d)};`],
  ['o lógico encadenado', (d) => `b = b${' || b'.repeat(d)};`],
  ['concatenación', (d) => `s = "x"${' + "y"'.repeat(d)};`],
  ['llamadas encadenadas', (d) => `s = s${'.trim()'.repeat(d)};`],
];

/** Los dos topes al mismo valor (las pruebas de cada forma miden niveles de anidamiento, sea cual sea el mecanismo que los acota). */
const topes = (n: number): LimitesDeAnidamiento => ({ niveles: n, arbol: n });

function analizar(cuerpo: string, limites?: LimitesDeAnidamiento) {
  return analizarPrograma(tokenizar(programa(cuerpo)), limites);
}

/** El d más grande de la forma que el analizador deja pasar con ese tope (busca subiendo de uno en uno hasta que lanza). */
function profundidadMaximaPermitida(forma: Forma, limite: number): number {
  let d = 0;
  for (; d <= limite + 20; d += 1) {
    try {
      analizar(forma(d + 1), topes(limite));
    } catch (error) {
      if (error instanceof ProgramaDemasiadoAnidado) return d;
      throw error;
    }
  }
  throw new Error(`la forma no se acotó con el tope ${limite}`);
}

describe('el tope de niveles de anidamiento — cada forma de anidar se acota, con un nivel por construcción', () => {
  it.each(FORMAS.map(([nombre, forma]) => [nombre, forma] as const))('«%s»: con un tope de 12 niveles deja pasar tantas repeticiones como niveles caben y rechaza la siguiente', (nombre, forma) => {
    const porRepeticion = NIVELES_POR_REPETICION.get(nombre) ?? 1;
    const permitidas = profundidadMaximaPermitida(forma, 12);
    // el programa de alrededor usa algunos niveles (la sentencia y su expresión), así que caben un poco menos de 12 / porRepeticion
    expect(permitidas).toBeGreaterThanOrEqual(Math.floor(12 / porRepeticion) - 4);
    expect(permitidas).toBeLessThanOrEqual(Math.floor(12 / porRepeticion));
  });

  it.each(FORMAS.map(([nombre, forma]) => [nombre, forma] as const))('«%s»: una forma mucho más profunda que el tope lanza `ProgramaDemasiadoAnidado` ANTES de agotar la pila (nunca `RangeError`)', (_nombre, forma) => {
    expect(() => analizar(forma(20_000))).toThrow(ProgramaDemasiadoAnidado);
  });

  it('el tope por omisión de la RECURSIÓN es MAXIMO_DE_NIVELES_DE_ANIDAMIENTO: los paréntesis que caben pasan, y uno más de lo permitido lanza', () => {
    const [, parentesis] = FORMAS[0]!;
    const permitidas = profundidadMaximaPermitida(parentesis, MAXIMO_DE_NIVELES_DE_ANIDAMIENTO);
    expect(permitidas).toBeGreaterThan(MAXIMO_DE_NIVELES_DE_ANIDAMIENTO - 6);
    expect(() => analizar(parentesis(permitidas))).not.toThrow();
    expect(() => analizar(parentesis(permitidas + 1))).toThrow(ProgramaDemasiadoAnidado);
  });

  it('un tope infinito no limita nada (así se arman los árboles profundos de las pruebas de la medida del árbol)', () => {
    expect(() => analizar(`a = ${'('.repeat(300)}1${')'.repeat(300)};`, SIN_LIMITES_DE_ANIDAMIENTO)).not.toThrow();
  });
});

describe('ProgramaDemasiadoAnidado — señala dónde el programa se pasó', () => {
  it('el rango es el del primer elemento que pasa del tope, en la línea donde está la forma (paréntesis)', () => {
    const fuente = programa(`a = ${'('.repeat(40)}1${')'.repeat(40)};`);
    let error: unknown;
    try {
      analizarPrograma(tokenizar(fuente), topes(12));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ProgramaDemasiadoAnidado);
    const rango = (error as ProgramaDemasiadoAnidado).rango;
    expect(fuente.slice(rango.inicio, rango.fin)).toMatch(/^\(|^1$/); // un paréntesis o el literal de adentro: lo que sigue a los 12 niveles
    expect(fuente.slice(0, rango.inicio).split('\n').length).toBe(LINEA_DEL_CUERPO);
  });

  it('en una cadena de operadores (que arma un lazo) señala el comienzo de la cadena, en su línea', () => {
    const fuente = programa(`b = b${' && b'.repeat(40)};`);
    let error: unknown;
    try {
      analizarPrograma(tokenizar(fuente), topes(12));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ProgramaDemasiadoAnidado);
    const rango = (error as ProgramaDemasiadoAnidado).rango;
    expect(fuente.slice(0, rango.inicio).split('\n').length).toBe(LINEA_DEL_CUERPO);
  });

  it('es un error de otro tipo que `ErrorDeCompilacion` (un aviso honesto, no un error del alumno)', async () => {
    const { ErrorDeCompilacion } = await import('../error-de-compilacion.ts');
    expect(() => analizar(`a = ${'('.repeat(40)}1${')'.repeat(40)};`, topes(12))).toThrow(ProgramaDemasiadoAnidado);
    try {
      analizar(`a = ${'('.repeat(40)}1${')'.repeat(40)};`, topes(12));
    } catch (e) {
      expect(e).not.toBeInstanceOf(ErrorDeCompilacion);
    }
  });
});

describe('lo que NO se pasa del tope no cambia', () => {
  it('un programa normal (anidamientos de un programa de clase) pasa con cualquier tope razonable', () => {
    const cuerpo = `for (int i = 0; i < 3; i++) { if (b) { while (a < 10) { a = a + 1 * (2 + (3 - 1)); } } else { s = "no"; } }`;
    expect(() => analizar(cuerpo, topes(20))).not.toThrow();
  });

  it('un error de sintaxis ANTES de la parte profunda gana: el analizador no llega al anidamiento', () => {
    const mal = programa(`int x = ;\n        a = ${'('.repeat(40)}1${')'.repeat(40)};`);
    expect(() => analizarPrograma(tokenizar(mal), topes(12))).toThrow(/expresión/);
  });
});
