// Tarea 1.37 (W-12 de la verificación del delta del lote 1): la profundidad del ÁRBOL del programa. Todas las pasadas posteriores al análisis sintáctico (`recolectarNoSoportados`, la atribución, la
// alcanzabilidad, la asignación definitiva, los límites del archivo y `generarIr`) recorren el árbol con recursión: su pila crece con la profundidad del árbol, y una cadena de mil `&&` (que el analizador
// arma con un lazo, sin recursión) es un árbol de mil niveles. Esta medida es EXACTA y no recursiva (una pila explícita): el cuerpo de `main` es el nivel 0 y cada nodo hijo suma uno. Los paréntesis no
// son nodos (el árbol solo guarda su marca), así que no suman.
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { SIN_LIMITES_DE_ANIDAMIENTO } from '../limites.ts';
import { analizarPrograma } from './analizador-sintactico.ts';
import { primerNodoMasProfundoQue, profundidadMaximaDelArbol } from './profundidad.ts';

/** El árbol de un programa con `cuerpo` dentro de `main`, SIN tope de niveles en el analizador: aquí se prueba solo la medida del árbol. */
function arbol(cuerpo: string) {
  return analizarPrograma(tokenizar(`public class P {\n    public static void main(String[] args) {\n${cuerpo}\n    }\n}\n`), SIN_LIMITES_DE_ANIDAMIENTO);
}

const profundidadDe = (cuerpo: string): number => profundidadMaximaDelArbol(arbol(cuerpo));

describe('profundidadMaximaDelArbol — la medida exacta (el cuerpo de `main` es el nivel 0)', () => {
  it('un `main` vacío es el nivel 0, y una sentencia vacía suma uno', () => {
    expect(profundidadDe('')).toBe(0);
    expect(profundidadDe(';')).toBe(1);
  });

  it('una declaración suma tres niveles: la declaración, su declarador y el valor (`int x = 1;`)', () => {
    expect(profundidadDe('int x = 1;')).toBe(3);
    expect(profundidadDe('int x;')).toBe(2);
  });

  it('un bloque anidado suma uno por llave: `{ { { ; } } }` son cuatro niveles', () => {
    expect(profundidadDe('{ { { ; } } }')).toBe(4);
    expect(profundidadDe('{ { ; } }')).toBe(3);
  });

  it('las instrucciones compuestas suman por su cuerpo: `if` dentro de `while` dentro de `for`', () => {
    expect(profundidadDe('for (int i = 0; i < 3; i++) while (true) if (true) ;')).toBe(4);
    expect(profundidadDe('do { switch (1) { default: ; } } while (true);')).toBe(4);
  });

  it('una cadena de operadores es un árbol que baja por la izquierda: `1 + 1 + 1 + 1` tiene un nivel por operador', () => {
    const profundidadConTerminos = (n: number): number => profundidadDe(`int x = ${Array.from({ length: n }, () => '1').join(' + ')};`);
    expect(profundidadConTerminos(2)).toBe(profundidadConTerminos(1) + 1);
    expect(profundidadConTerminos(5)).toBe(profundidadConTerminos(1) + 4);
    expect(profundidadConTerminos(60)).toBe(profundidadConTerminos(1) + 59);
  });

  it('los paréntesis NO suman (son una marca del nodo, no un nodo): `((((1))))` mide lo mismo que `1`', () => {
    expect(profundidadDe('int x = ((((1))));')).toBe(profundidadDe('int x = 1;'));
  });

  it('las llamadas encadenadas, los accesos y los argumentos suman: `a.b().c().d()` y `f(f(f(1)))`', () => {
    expect(profundidadDe('s.trim().trim().trim();')).toBeGreaterThan(profundidadDe('s.trim();'));
    expect(profundidadDe('f(f(f(1)));')).toBeGreaterThan(profundidadDe('f(1);'));
    expect(profundidadDe('x = (int) (int) (int) y;')).toBeGreaterThan(profundidadDe('x = (int) y;'));
    expect(profundidadDe('b = !!!!c;')).toBeGreaterThan(profundidadDe('b = !c;'));
  });

  it('NO es recursiva: una cadena de 20 000 operadores se mide sin agotar la pila', () => {
    const n = 20_000;
    const programa = arbol(`int x = 1${' + 1'.repeat(n)};`);
    expect(profundidadMaximaDelArbol(programa)).toBeGreaterThanOrEqual(n);
  });
});

describe('primerNodoMasProfundoQue — el primer nodo que pasa del tope, o null', () => {
  it('un árbol que no pasa del tope devuelve null, justo en el tope y por debajo', () => {
    const programa = arbol('{ { ; } }');
    expect(profundidadMaximaDelArbol(programa)).toBe(3);
    expect(primerNodoMasProfundoQue(programa, 3)).toBeNull();
    expect(primerNodoMasProfundoQue(programa, 50)).toBeNull();
  });

  it('con un nivel de más devuelve el rango del primer nodo de ese nivel (en el orden del texto)', () => {
    const cuerpo = '{ { ; } }';
    const programa = arbol(cuerpo);
    const exceso = primerNodoMasProfundoQue(programa, 2);
    expect(exceso).not.toBeNull();
    const fuente = `public class P {\n    public static void main(String[] args) {\n${cuerpo}\n    }\n}\n`;
    expect(fuente.slice(exceso!.rango.inicio, exceso!.rango.fin)).toBe(';'); // el nivel 3 es la sentencia vacía del bloque interno
  });

  it('en una cadena de operadores señala el comienzo de la cadena (el primer operando), no el final', () => {
    const fuente = 'public class P {\n    public static void main(String[] args) {\n        int x = 1 + 2 + 3 + 4 + 5 + 6;\n    }\n}\n';
    const programa = analizarPrograma(tokenizar(fuente), SIN_LIMITES_DE_ANIDAMIENTO);
    const exceso = primerNodoMasProfundoQue(programa, 4);
    expect(exceso).not.toBeNull();
    expect(exceso!.rango.inicio).toBe(fuente.indexOf('1 + 2'));
  });

  it('control: el mismo programa con un tope mayor no señala nada, y uno menor señala antes', () => {
    const programa = arbol('int x = 1 + 2 + 3 + 4 + 5 + 6;');
    expect(primerNodoMasProfundoQue(programa, profundidadMaximaDelArbol(programa))).toBeNull();
    expect(primerNodoMasProfundoQue(programa, 1)).not.toBeNull();
  });
});

// Un nodo con varios hijos debe contar la profundidad de CADA uno: si la medida olvidara un hijo, el árbol que baja por ahí pasaría de largo y las pasadas volverían a agotar la pila. Cada fila
// arma dos programas con la misma construcción y el MISMO resto, y hace más hondo SOLO el hijo que se prueba; la profundidad tiene que subir exactamente lo que se le agregó (los paréntesis
// de las formas «por la derecha» no son nodos: lo hondo lo pone el operador que los acompaña).
describe('profundidadMaximaArbol — cada hijo de cada nodo cuenta (tarea 1.37, S-10)', () => {
  const unos = (n: number, operador = '+'): string => Array.from({ length: n }, () => '1').join(` ${operador} `);
  const conParentesisPorLaDerecha = (n: number): string => `${'1 + ('.repeat(n)}1${')'.repeat(n)}`;

  it.each([
    ['la condición de un `if`', (n: number) => `if (${unos(n, '<')}) ;`, 1],
    ['la rama «entonces» de un `if`', (n: number) => `if (true) ${'{ '.repeat(n)};${' }'.repeat(n)}`, 1],
    ['la rama «sino» de un `if`', (n: number) => `if (true) ; else ${'{ '.repeat(n)};${' }'.repeat(n)}`, 1],
    ['la condición de un `while`', (n: number) => `while (${unos(n, '<')}) ;`, 1],
    ['el cuerpo de un `while`', (n: number) => `while (true) ${'{ '.repeat(n)};${' }'.repeat(n)}`, 1],
    ['el cuerpo de un `do-while`', (n: number) => `do ${'{ '.repeat(n)};${' }'.repeat(n)} while (true);`, 1],
    ['la condición de un `do-while`', (n: number) => `do ; while (${unos(n, '<')});`, 1],
    ['la inicialización de un `for`', (n: number) => `for (int i = ${unos(n)}; i < 1; i++) ;`, 1],
    ['las expresiones de inicialización de un `for` (sin declarar)', (n: number) => `for (i = ${unos(n)}; i < 1; i++) ;`, 1],
    ['la condición de un `for`', (n: number) => `for (int i = 0; ${unos(n, '<')}; i++) ;`, 1],
    ['la actualización de un `for`', (n: number) => `for (int i = 0; i < 1; i = ${unos(n)}) ;`, 1],
    ['el cuerpo de un `for`', (n: number) => `for (int i = 0; i < 1; i++) ${'{ '.repeat(n)};${' }'.repeat(n)}`, 1],
    ['el selector de un `switch`', (n: number) => `switch (${unos(n)}) { default: ; }`, 1],
    ['el valor de una etiqueta `case`', (n: number) => `switch (1) { case ${unos(n)}: ; }`, 1],
    ['las instrucciones de un `switch`', (n: number) => `switch (1) { default: ${'{ '.repeat(n)};${' }'.repeat(n)} }`, 1],
    ['el inicializador de una declaración', (n: number) => `int x = ${unos(n)};`, 1],
    ['el argumento de una impresión', (n: number) => `System.out.println(${unos(n)});`, 1],
    ['el valor de un `return`', (n: number) => `return ${unos(n)};`, 1],
    ['el operando izquierdo de una operación', (n: number) => `x = ${unos(n)} + 1;`, 1],
    ['el operando DERECHO de una operación', (n: number) => `x = 1 + ${conParentesisPorLaDerecha(n)};`, 1],
    ['el valor de una asignación', (n: number) => `${'x = '.repeat(n)}1;`, 1],
    ['el objetivo de una asignación', (n: number) => `a${'.b'.repeat(n)} = 1;`, 1],
    ['el operando de un operador prefijo', (n: number) => `x = ${'!'.repeat(n)}y;`, 1],
    ['el operando de `++`', (n: number) => `a${'.b'.repeat(n)}++;`, 1],
    ['el operando de un cast', (n: number) => `x = ${'(int) '.repeat(n)}y;`, 1],
    ['el receptor de una llamada', (n: number) => `s${'.trim()'.repeat(n)};`, 2],
    ['los argumentos de una llamada', (n: number) => `${'f('.repeat(n)}1${')'.repeat(n)};`, 1],
    ['los argumentos de un `new`', (n: number) => `x = ${'new T('.repeat(n)}${')'.repeat(n)};`, 1],
    ['los accesos a un miembro', (n: number) => `x = a${'.b'.repeat(n)};`, 1],
  ] as const)('%s: cada vuelta más baja el árbol lo que debe', (_descripcion, armar, nivelesPorVuelta) => {
    // Se parte de 6 vueltas, no de 2: con pocas, lo demás de la instrucción (la `int i = 0` de un `for`, por ejemplo) es tan hondo como la parte que se prueba y la tapa.
    const base = profundidadDe(armar(6));
    expect(profundidadDe(armar(9))).toBe(base + 3 * nivelesPorVuelta);
    expect(profundidadDe(armar(16))).toBe(base + 10 * nivelesPorVuelta);
  });
});
