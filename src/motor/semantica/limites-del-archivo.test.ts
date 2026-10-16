// RED de la tarea 1.36 (C-4a de la verificación final del lote 1) · los límites del archivo de clase que javac revisa DESPUÉS de aceptar el programa: pasada 5 de ADR 004 (léxico+sintaxis →
// atribución → alcanzabilidad → asignación definitiva → **límites del archivo** → arranque).
//
// Dos errores de javac 17.0.18, medidos al byte con el compilador real (los mismos casos están en `corpus/experimentos/limites-del-archivo/` con sus goldens):
//   - `limit.string` (`Gen.checkStringConstant`): una constante de texto de 65 535 CARACTERES (unidades UTF-16) o más que se GENERA. Se ancla en el árbol que `genExpr` generaba.
//   - `limit.string.overflow` (`ClassWriter`): una entrada `CONSTANT_Utf8` de más de 65 535 BYTES en UTF-8 modificado (`\0` son 2 bytes, `é` 2, `€` 3, un emoji 6). Se ancla en la palabra `class`.
// Un texto que se pliega (`"a" + "b"`, `A + A` con `final`) entra por su valor plegado; uno que NO es constante y se concatena (`x + "texto"`) no se genera como constante: entra en la RECETA de la
// concatenación (`invokedynamic`: las constantes más un byte por operando dinámico), y las recetas de más de 200 ranuras se parten. Lo que javac no genera (la rama de un `if` con condición
// constante, el lado derecho de `false && …`, una `final` que nadie usa) no cuenta.
//
// El motor NO modela el bytecode: cuando no puede decidir (un texto con un decimal cuyo largo depende de `Double.toString`, un programa con condiciones constantes que podrían podar código) da un aviso
// honesto, nunca `ok` ni un error inventado.
import { describe, expect, it } from 'vitest';
import { TablaDeLineas } from '../fuente/tabla-de-lineas.ts';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { SIN_LIMITES_DE_ANIDAMIENTO } from '../limites.ts';
import { analizarPrograma } from '../sintaxis/analizador-sintactico.ts';
import { verificarLimitesDelArchivo } from './limites-del-archivo.ts';

const repetir = (n: number, caracter = 'a'): string => caracter.repeat(n);

/**
 * Lo que reporta la pasada, con la LÍNEA de cada problema: `[]` si no encuentra nada. Tarea 1.37: la pasada se prueba SOLA, con árboles más hondos de lo que `compilar()` deja pasar (una
 * concatenación de 400 operandos es un árbol de 400 niveles; el tope de profundidad es del analizador, ver `limites.ts`): aquí se vigila lo que javac hace con la receta, no el tope del producto.
 */
function limitesDe(fuente: string) {
  const tabla = new TablaDeLineas(fuente);
  return verificarLimitesDelArchivo(analizarPrograma(tokenizar(fuente), SIN_LIMITES_DE_ANIDAMIENTO)).map((problema) => ({
    codigo: problema.codigo,
    categoria: problema.categoria ?? 'error-compilacion',
    linea: tabla.ubicar(problema.rango.inicio).linea,
  }));
}

/** El cuerpo de `main` desde la línea 3 (la misma disposición de los programas con goldens del corpus): `public class P {` y `main` ocupan las líneas 1 y 2. `antes` va ANTES de `public class`. */
function delCuerpo(cuerpo: string, antes = '') {
  return limitesDe(`${antes}public class P {\n  public static void main(String[] args) {\n${cuerpo}\n  }\n}\n`);
}

const CARACTERES = 'texto-con-demasiados-caracteres';
const BYTES = 'texto-con-demasiados-bytes';
const AVISO = 'tamano-de-texto-no-revisable';
const errorEn = (codigo: string, linea: number) => [{ codigo, categoria: 'error-compilacion', linea }];
const avisoEn = (linea: number) => [{ codigo: AVISO, categoria: 'no-disponible', linea }];

describe('verificarLimitesDelArchivo — un programa normal no produce nada', () => {
  it('un programa de clase, con textos cortos, concatenaciones y todo tipo de sentencias, no tiene problemas', () => {
    expect(
      delCuerpo(`
    int x = 5;
    String s = "hola " + x;
    final String K = "constante";
    if (x > 0) { System.out.println(s + K); }
    for (int i = 0; i < 3; i++) { System.out.println("vuelta " + i); }
    switch (s) { case "a": break; default: break; }`),
    ).toEqual([]);
  });

  it('un programa sin `main` no tiene nada que revisar', () => {
    expect(limitesDe('public class P { }')).toEqual([]);
  });
});

describe('verificarLimitesDelArchivo — limit.string: 65 535 caracteres o más en una constante que se genera (la frontera exacta)', () => {
  it.each([
    ['inicializador', (n: number) => `    String s = "${repetir(n)}";`, 3],
    ['argumento de println', (n: number) => `    System.out.println("${repetir(n)}");`, 3],
    ['argumento de print', (n: number) => `    System.out.print("${repetir(n)}");`, 3],
    ['asignación a una variable ya declarada', (n: number) => `    String s;\n    s = "${repetir(n)}";`, 4],
    ['argumento de una llamada (equals)', (n: number) => `    String t = "q";\n    boolean b = t.equals("${repetir(n)}");`, 4],
    ['formato de printf', (n: number) => `    System.out.printf("${repetir(n)}");`, 3],
    ['operando de una comparación', (n: number) => `    String t = "q";\n    boolean b = t == "${repetir(n)}";`, 4],
    ['receptor de una llamada', (n: number) => `    int k = "${repetir(n)}".length();`, 3],
    ['cuerpo de un while', (n: number) => `    int i = 0;\n    while (i < 1) {\n      String s = "${repetir(n)}";\n      i++;\n    }`, 5],
    ['cuerpo de un do-while', (n: number) => `    int i = 0;\n    do {\n      String s = "${repetir(n)}";\n      i++;\n    } while (i < 1);`, 5],
  ])('%s: con 65 534 caracteres Java lo acepta y con 65 535 lo rechaza en la línea del texto', (_nombre, cuerpo, linea) => {
    expect(delCuerpo(cuerpo(65_534))).toEqual([]);
    expect(delCuerpo(cuerpo(65_535))).toEqual(errorEn(CARACTERES, linea));
    expect(delCuerpo(cuerpo(70_000))).toEqual(errorEn(CARACTERES, linea));
  });

  it('una `final` con una constante así de larga lo rechaza AUNQUE nadie la use (se revisa su declaración): en la línea del inicializador', () => {
    expect(delCuerpo(`    final String K =\n        "${repetir(65_535)}";`)).toEqual(errorEn(CARACTERES, 4));
    expect(delCuerpo(`    final String K = "${repetir(65_534)}";`)).toEqual([]);
  });

  it('el texto plegado cuenta: `"a…" + "b…"` (dos literales) y `A + A + A` (tres veces una `final`)', () => {
    expect(delCuerpo(`    String s = "${repetir(40_000)}" + "${repetir(40_000)}";`)).toEqual(errorEn(CARACTERES, 3));
    expect(delCuerpo(`    final String A = "${repetir(32_000)}";\n    String s = A + A;`)).toEqual([]);
    expect(delCuerpo(`    final String A = "${repetir(32_000)}";\n    String s = A + A + A;`)).toEqual(errorEn(CARACTERES, 4));
  });

  it('un número o un carácter pegados al texto entran en la cuenta (`"a…" + 12`, `\'a\' + "…"`, `1 + "…"`)', () => {
    expect(delCuerpo(`    String s = "${repetir(65_533)}" + 1;`)).toEqual([]);
    expect(delCuerpo(`    String s = "${repetir(65_533)}" + 12;`)).toEqual(errorEn(CARACTERES, 3));
    expect(delCuerpo(`    String s = 'a' + "${repetir(65_534)}";`)).toEqual(errorEn(CARACTERES, 3));
    expect(delCuerpo(`    String s = 1 + "${repetir(65_534)}";`)).toEqual(errorEn(CARACTERES, 3));
  });

  it('con dos textos de más, el error es el del PRIMERO que se genera', () => {
    expect(delCuerpo(`    String s = "${repetir(65_535)}";\n    String t = "${repetir(65_535)}";`)).toEqual(errorEn(CARACTERES, 3));
  });

  it('limit.string se detecta ANTES que el exceso de bytes, aunque el de bytes aparezca primero en el programa', () => {
    expect(delCuerpo(`    String s = "${repetir(32_768, 'é')}";\n    String t = "${repetir(65_535)}";`)).toEqual(errorEn(CARACTERES, 4));
  });
});

describe('verificarLimitesDelArchivo — limit.string.overflow: más de 65 535 BYTES en una entrada del archivo (UTF-8 modificado), anclado en la palabra `class`', () => {
  it.each([
    ['letras con acento (2 bytes)', 'é', 32_767, 32_768],
    ['el euro (3 bytes)', '€', 21_845, 21_846],
    ['un emoji (2 unidades de 3 bytes = 6)', '😀', 10_922, 10_923],
    ['el carácter nulo `\\0` (2 bytes en UTF-8 modificado)', '\0', 32_767, 32_768],
  ])('%s: justo en el límite pasa y un carácter más lo rechaza (y NO es limit.string: el texto mide menos de 65 535 caracteres)', (_nombre, caracter, cabe, noCabe) => {
    expect(delCuerpo(`    String s = "${repetir(cabe, caracter)}";`)).toEqual([]);
    expect(delCuerpo(`    String s = "${repetir(noCabe, caracter)}";`)).toEqual(errorEn(BYTES, 1));
  });

  it('el error es de la línea de la palabra `class`, no la del primer modificador ni la del texto', () => {
    expect(delCuerpo(`    String s = "${repetir(32_768, 'é')}";`, '// uno\n// dos\n\n')).toEqual(errorEn(BYTES, 4));
    expect(limitesDe(`\npublic\nclass P {\n  public static void main(String[] args) {\n    String s = "${repetir(32_768, 'é')}";\n  }\n}\n`)).toEqual(errorEn(BYTES, 3));
  });

  it('una `final` constante SE GENERA aunque nadie la use (el oráculo compila con `-g`, igual que NetBeans): con 65 536 bytes da el exceso, usada o no; con 65 535 cabe', () => {
    const final = `    final String K = "${repetir(32_768, 'é')}";`;
    expect(delCuerpo(final)).toEqual(errorEn(BYTES, 1));
    expect(delCuerpo(`${final}\n    System.out.println(K);`)).toEqual(errorEn(BYTES, 1));
    expect(delCuerpo(`${final}\n    String s = K;`)).toEqual(errorEn(BYTES, 1));
    expect(delCuerpo(`${final}\n    String t = "q";\n    boolean b = t.equals(K);`)).toEqual(errorEn(BYTES, 1));
    expect(delCuerpo(`    final String K = "${repetir(32_767, 'é')}";`)).toEqual([]);
  });

  it('una `final` entre paréntesis dentro de una condición CONSTANTE se pliega a un boolean: nunca carga su texto (una `final` ya más corta que el límite no estorba)', () => {
    expect(delCuerpo(`    final String K = "${repetir(16_384, 'é')}";\n    boolean b = K + K == "x";`)).toEqual([]);
  });

  it('lo mismo con el texto que se pliega: `"é…" == "b"` es un boolean y no deja ninguna cadena en el archivo', () => {
    expect(delCuerpo(`    boolean b = "${repetir(32_768, 'é')}" == "b";`)).toEqual([]);
    expect(delCuerpo(`    boolean b = "${repetir(65_535)}" == "b";`)).toEqual([]);
  });

  it('un `print` y un `println` con el texto largo entran al archivo', () => {
    expect(delCuerpo(`    System.out.print("${repetir(32_768, 'é')}");`)).toEqual(errorEn(BYTES, 1));
  });
});

describe('verificarLimitesDelArchivo — la receta de una concatenación NO constante (invokedynamic): constantes + 1 byte por operando dinámico', () => {
  it.each([
    ['un solo operando dinámico y 65 534 caracteres', (n: number) => `    int x = 1;\n    String s = "${repetir(n)}" + x;`, 65_534, 65_535],
    ['dos operandos dinámicos', (n: number) => `    int x = 1; int y = 2;\n    String s = "${repetir(n)}" + x + y;`, 65_533, 65_534],
    ['letras con acento: 2 bytes cada una', (n: number) => `    int x = 1;\n    String s = "${repetir(n, 'é')}" + x;`, 32_767, 32_768],
    ['dentro de un println', (n: number) => `    int x = 1;\n    System.out.println("${repetir(n)}" + x);`, 65_534, 65_535],
    ['con un `+=`', (n: number) => `    String s = "q";\n    s += "${repetir(n)}";`, 65_534, 65_535],
    ['con `s = s + …`', (n: number) => `    String s = "q";\n    s = s + "${repetir(n)}";`, 65_534, 65_535],
  ])('%s: la receta justo en el límite pasa y un byte más lo rechaza (sin limit.string: el texto nunca se genera suelto)', (_nombre, cuerpo, cabe, noCabe) => {
    expect(delCuerpo(cuerpo(cabe))).toEqual([]);
    expect(delCuerpo(cuerpo(noCabe))).toEqual(errorEn(BYTES, 1));
  });

  it('un texto de 65 535 caracteres o más dentro de una concatenación NO da limit.string (no se genera como constante) sino el exceso de la receta', () => {
    expect(delCuerpo(`    int x = 1;\n    String s = "${repetir(70_000)}" + x;`)).toEqual(errorEn(BYTES, 1));
  });

  it('las constantes plegadas de la receta cuentan por su valor: una `final` de 40 000 sola cabe (con `x`); dos veces no', () => {
    expect(delCuerpo(`    final String A = "${repetir(40_000)}";\n    int x = 1;\n    String s = A + x;`)).toEqual([]);
    expect(delCuerpo(`    final String A = "${repetir(40_000)}";\n    int x = 1;\n    String s = A + x + A;`)).toEqual(errorEn(BYTES, 1));
    expect(delCuerpo(`    final String A = "${repetir(65_530)}";\n    int x = 1;\n    System.out.println(A + x);`)).toEqual([]);
  });

  it('una constante con el carácter \\u0001 o \\u0002 (las marcas de la receta; en el subconjunto solo se llega a ellos con `(char) 1`) va aparte: 1 byte en la receta y su propia entrada', () => {
    // 65 534 caracteres + el \u0001: la entrada propia mide 65 535 bytes (cabe); con un carácter más no cabe. La receta, con la marca, mide 2 bytes.
    expect(delCuerpo(`    int x = 1;\n    String s = "${repetir(65_534)}" + (char) 1 + x;`)).toEqual([]);
    expect(delCuerpo(`    int x = 1;\n    String s = "${repetir(65_535)}" + (char) 1 + x;`)).toEqual(errorEn(BYTES, 1));
    expect(delCuerpo(`    int x = 1;\n    String s = "${repetir(65_533)}" + (char) 2 + x;`)).toEqual([]);
  });

  it('con 200 ranuras o más javac parte la receta en varias: 400 operandos y 65 300 caracteres caben (cada receta mide ~65 500), pero 90 o 150 operandos con 65 450 no', () => {
    const variables = (n: number) => Array.from({ length: n }, (_, i) => `x${i}`);
    const declaraciones = (n: number) => `    int ${variables(n).map((v) => `${v} = 1`).join(', ')};`;
    const suma = (n: number) => variables(n).join(' + ');
    expect(delCuerpo(`${declaraciones(400)}\n    String s = "${repetir(65_300)}" + ${suma(400)};`)).toEqual([]);
    expect(delCuerpo(`${declaraciones(150)}\n    String s = "${repetir(65_300)}" + ${suma(150)};`)).toEqual([]);
    expect(delCuerpo(`${declaraciones(150)}\n    String s = "${repetir(65_450)}" + ${suma(150)};`)).toEqual(errorEn(BYTES, 1));
    expect(delCuerpo(`${declaraciones(90)}\n    String s = "${repetir(65_450)}" + ${suma(90)};`)).toEqual(errorEn(BYTES, 1));
    expect(delCuerpo(`${declaraciones(250)}\n    String s = "${repetir(65_450)}" + ${suma(250)};`)).toEqual(errorEn(BYTES, 1));
  });
});

describe('verificarLimitesDelArchivo — la LÍNEA de limit.string es la del árbol que javac generaba (JCTree.pos)', () => {
  it('una suma de nombres señala su ÚLTIMO operador, no el primer operando (`A\\n + A\\n + A`)', () => {
    const final = `    final String A = "${repetir(40_000)}";`;
    expect(delCuerpo(`${final}\n    String s = A\n        + A\n        + A;`)).toEqual(errorEn(CARACTERES, 6));
    expect(delCuerpo(`${final}\n    String s = A +\n        A +\n        A;`)).toEqual(errorEn(CARACTERES, 5));
  });

  it('dos literales vecinos se juntan en uno que empieza donde el primero (línea del PRIMER literal)', () => {
    expect(delCuerpo(`    String s = "${repetir(40_000)}"\n        + "${repetir(40_000)}";`)).toEqual(errorEn(CARACTERES, 3));
    expect(delCuerpo(`    System.out.println("${repetir(40_000)}"\n        + "${repetir(40_000)}");`)).toEqual(errorEn(CARACTERES, 3));
  });

  it('tras juntar dos literales, la suma con un nombre queda en el INICIO de ese nombre', () => {
    const final = `    final String A = "${repetir(40_000)}";`;
    expect(delCuerpo(`${final}\n    String s = "${repetir(40_000)}"\n        + "x" +\n        A;`)).toEqual(errorEn(CARACTERES, 6));
    expect(delCuerpo(`${final}\n    String s = A\n        + "${repetir(40_000)}"\n        + "x";`)).toEqual(errorEn(CARACTERES, 5));
  });

  it('un paréntesis y un cast señalan su `(`', () => {
    expect(delCuerpo(`    String s =\n        (\n        "${repetir(65_535)}"\n        );`)).toEqual(errorEn(CARACTERES, 4));
    expect(delCuerpo(`    String s =\n        (String)\n        "${repetir(65_535)}";`)).toEqual(errorEn(CARACTERES, 4));
  });

  it('un argumento o un receptor en otra línea: la línea del propio literal', () => {
    expect(delCuerpo(`    String t = "q";\n    boolean b = t.equals(\n        "${repetir(65_535)}");`)).toEqual(errorEn(CARACTERES, 5));
    expect(delCuerpo(`    int n =\n        "${repetir(65_535)}".length();`)).toEqual(errorEn(CARACTERES, 4));
  });
});

describe('verificarLimitesDelArchivo — el ORDEN en que javac genera el código decide cuál es «el primero»', () => {
  it('un `for` genera su cuerpo ANTES que su paso: el texto del cuerpo (línea 4) gana al del paso (línea 3)', () => {
    const texto = repetir(65_535);
    expect(delCuerpo(`    for (int i = 0; i < 1; i += "${texto}".length()) {\n      String s = "${texto}";\n    }`)).toEqual(errorEn(CARACTERES, 4));
  });

  it('un `switch` sobre texto genera TODAS sus etiquetas antes que los cuerpos: el error es de la línea del `switch`', () => {
    const texto = repetir(65_535);
    const cuerpo = `    String t = "q";\n    switch (t) {\n      case "a":\n        String s = "${texto}";\n        break;\n      case "${texto}": break;\n      default: break;\n    }`;
    expect(delCuerpo(cuerpo)).toEqual(errorEn(CARACTERES, 4));
  });

  it('la etiqueta se ancla en la palabra `switch` aunque el `case` y el texto estén en otras líneas; una `final` usada de etiqueta, en su declaración', () => {
    const texto = repetir(65_535);
    expect(delCuerpo(`    String t = "q";\n    switch\n    (t) {\n      case\n      "${texto}": break;\n      default: break;\n    }`)).toEqual(errorEn(CARACTERES, 4));
    expect(delCuerpo(`    final String K = "${texto}";\n    String t = "q";\n    switch (t) {\n      case K: break;\n      default: break;\n    }`)).toEqual(errorEn(CARACTERES, 3));
  });

  it('una etiqueta de `switch` con 65 534 caracteres cabe; con bytes de más, el exceso de la clase', () => {
    expect(delCuerpo(`    String t = "q";\n    switch (t) {\n      case "${repetir(65_534)}": break;\n      default: break;\n    }`)).toEqual([]);
    expect(delCuerpo(`    String t = "q";\n    switch (t) {\n      case "${repetir(32_768, 'é')}": break;\n      default: break;\n    }`)).toEqual(errorEn(BYTES, 1));
  });
});

describe('verificarLimitesDelArchivo — el código que javac NO genera no cuenta (lo poda `Lower` antes de `Gen`)', () => {
  const grande = repetir(65_535);

  it('la rama de un `if` con condición constante que NO se toma no se genera (`if (false) { … }`, la rama `else` de `if (true)`, una `final` falsa)', () => {
    expect(delCuerpo(`    if (false) {\n      String s = "${grande}";\n    }`)).toEqual([]);
    expect(delCuerpo(`    if (true) {\n      System.out.println("x");\n    } else {\n      String s = "${grande}";\n    }`)).toEqual([]);
    expect(delCuerpo(`    final boolean DEBUG = false;\n    if (DEBUG) {\n      System.out.println("${grande}");\n    }`)).toEqual([]);
  });

  it('el lado derecho de `false && …` y de `true || …` se descarta', () => {
    expect(delCuerpo(`    String t = "q";\n    if (false && t.equals("${grande}")) { }`)).toEqual([]);
    expect(delCuerpo(`    String t = "q";\n    if (true || t.equals("${grande}")) { }`)).toEqual([]);
  });

  it('un `&&` con el lado izquierdo NO constante sí genera el derecho: error normal', () => {
    expect(delCuerpo(`    String t = "q";\n    boolean z = t.length() > 0;\n    if (z && t.equals("${grande}")) { }`)).toEqual(errorEn(CARACTERES, 5));
  });

  it('pero donde SÍ se genera junto a una condición constante, el motor no puede asegurar el resto (¿qué más poda javac?): aviso, nunca un error inventado', () => {
    expect(delCuerpo(`    if (true) {\n      String s = "${grande}";\n    }`)).toEqual(avisoEn(4));
    expect(delCuerpo(`    if (true) return;\n    String s = "${grande}";`)).toEqual(avisoEn(4));
    expect(delCuerpo(`    while (true) {\n      if (false) break;\n    }\n    String s = "${grande}";`)).toEqual(avisoEn(6));
    expect(delCuerpo(`    String t = "q";\n    if (true && t.equals("${grande}")) { }`)).toEqual(avisoEn(4));
  });

  it('y sin texto largo, una condición constante no cambia nada', () => {
    expect(delCuerpo('    if (true) { System.out.println("x"); }\n    if (false) { System.out.println("y"); }')).toEqual([]);
  });
});

describe('verificarLimitesDelArchivo — un texto con un decimal (`"a" + 1.5`): su largo depende de `Double.toString`, que el motor todavía no calcula', () => {
  it('lejos del límite no importa: ni aviso ni error', () => {
    expect(delCuerpo(`    String s = "${repetir(60_000)}" + 1.5;`)).toEqual([]);
  });

  it('si TODOS los largos posibles pasan el límite (el decimal mide al menos 3), es un error seguro', () => {
    expect(delCuerpo(`    String s = "${repetir(65_532)}" + 1.5;`)).toEqual(errorEn(CARACTERES, 3));
    expect(delCuerpo(`    final String K = "${repetir(65_540)}" + 1.5;`)).toEqual(errorEn(CARACTERES, 3));
  });

  it('si el límite cae DENTRO de lo que puede medir el decimal (de 3 a 25 caracteres), no se sabe: aviso', () => {
    expect(delCuerpo(`    String s = "${repetir(65_531)}" + 1.5;`)).toEqual(avisoEn(3));
    expect(delCuerpo(`    String s = "${repetir(65_520)}" + 1.5;`)).toEqual(avisoEn(3));
  });

  it('en la receta de una concatenación también: pasa, o se sabe que no pasa, o aviso', () => {
    expect(delCuerpo(`    int x = 1;\n    String s = "${repetir(60_000)}" + 1.5 + x;`)).toEqual([]);
    expect(delCuerpo(`    int x = 1;\n    String s = "${repetir(65_520)}" + 1.5 + x;`)).toEqual(avisoEn(4));
    expect(delCuerpo(`    int x = 1;\n    String s = "${repetir(65_540)}" + 1.5 + x;`)).toEqual(errorEn(BYTES, 1));
  });
});
