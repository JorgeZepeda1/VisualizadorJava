// RED del arreglo (a) del hito 2A: el texto de la expresión que sale en la explicación de un paso se cortaba cuando la expresión TERMINABA o EMPEZABA con una subexpresión entre
// paréntesis. La pantalla decía «Calculo `(char) (65 + k`» para `char c = (char) (65 + k);`. El rango de un nodo compuesto (cast, binaria, unaria, asignación) iba del primer al
// último operando SIN contar los paréntesis de esos operandos (la marca `parentesis` del nodo, tarea 1.34), así que el texto perdía el `)` del final o el `(` del principio.
// Aquí se comprueba el TEXTO de punta a punta (compilar + ejecutar), que es lo que el alumno lee.
import { describe, expect, it } from 'vitest';
import type { DatosPorClave, ExplicacionPaso } from '../traza/explicacion.ts';
import { correr, correrPrograma } from './ayudas-de-prueba.ts';
import { PUERTO_POR_OMISION } from './puerto-por-omision.ts';

function explicaciones(cuerpo: string): ExplicacionPaso[] {
  return correr(cuerpo, { puerto: PUERTO_POR_OMISION }).pasos.map((paso) => paso.explicacion);
}

/** Los datos del ÚLTIMO paso de la clave pedida. */
function datosDe<K extends ExplicacionPaso['clave']>(cuerpo: string, clave: K): DatosPorClave[K] {
  const encontradas = explicaciones(cuerpo).filter((explicacion) => explicacion.clave === clave);
  const ultima = encontradas[encontradas.length - 1];
  if (ultima === undefined) throw new Error(`no hubo un paso ${clave}`);
  return ultima.datos as DatosPorClave[K];
}

describe('el texto de la expresión en la explicación incluye los paréntesis de sus extremos (arreglo a)', () => {
  it('un cast de una expresión entre paréntesis: `char c = (char) (65 + k);`', () => {
    expect(datosDe('    int k = 2;\n    char c = (char) (65 + k);', 'declaracion-con-valor')).toMatchObject({
      nombre: 'c',
      expresion: '(char) (65 + k)',
      sustituida: '(char) (65 + 2)',
      valor: "'C'",
    });
  });

  it('un cast anidado con paréntesis al final: `(int) (x * (y + 1))`', () => {
    expect(datosDe('    double x = 2.5;\n    int y = 3;\n    int r = (int) (x * (y + 1));', 'declaracion-con-valor')).toMatchObject({
      expresion: '(int) (x * (y + 1))',
      sustituida: '(int) (2.5 * (3 + 1))',
    });
  });

  it('el paréntesis al FINAL de una binaria: `a * (b + c)`', () => {
    expect(datosDe('    int a = 2, b = 3, c = 4;\n    int r = a * (b + c);', 'declaracion-con-valor')).toMatchObject({ expresion: 'a * (b + c)', sustituida: '2 * (3 + 4)' });
  });

  it('el paréntesis al PRINCIPIO de una binaria: `(a + b) * 2`', () => {
    expect(datosDe('    int a = 2, b = 3;\n    int r = (a + b) * 2;', 'declaracion-con-valor')).toMatchObject({ expresion: '(a + b) * 2', sustituida: '(2 + 3) * 2' });
  });

  it('paréntesis en los dos extremos: `(a + b) * (c - 1)`', () => {
    expect(datosDe('    int a = 2, b = 3, c = 4;\n    int r = (a + b) * (c - 1);', 'declaracion-con-valor')).toMatchObject({
      expresion: '(a + b) * (c - 1)',
      sustituida: '(2 + 3) * (4 - 1)',
    });
  });

  it('un operador unario sobre un paréntesis: `-(a + 1)` y `!(a > 1)`', () => {
    expect(datosDe('    int a = 2;\n    int r = -(a + 1);', 'declaracion-con-valor')).toMatchObject({ expresion: '-(a + 1)', sustituida: '-(2 + 1)' });
    expect(datosDe('    int a = 2;\n    boolean f = !(a > 1);', 'declaracion-con-valor')).toMatchObject({ expresion: '!(a > 1)', sustituida: '!(2 > 1)' });
  });

  it('la asignación y la asignación compuesta con el lado derecho entre paréntesis: `r = (a + 1);` y `a += (a + 1);`', () => {
    expect(datosDe('    int a = 2;\n    int r;\n    r = (a + 1);', 'asignacion')).toMatchObject({ expresion: '(a + 1)', sustituida: '(2 + 1)', valor: '3' });
    expect(datosDe('    int a = 7;\n    a += (a + 1);', 'asignacion-compuesta')).toMatchObject({ expresion: '(a + 1)', sustituida: '(7 + 1)' });
  });

  it('la condición de un ciclo o de un if con paréntesis en los extremos: `(a > 1) && (a < 10)`', () => {
    expect(datosDe('    int a = 7;\n    while ((a > 1) && (a < 10)) {\n      a++;\n    }', 'condicion-ciclo')).toMatchObject({
      condicion: '(a > 1) && (a < 10)',
      sustituida: '(10 > 1) && (10 < 10)',
    });
    expect(datosDe('    int a = 7;\n    if ((a > 1) && (a < 10)) {\n    }', 'condicion-if')).toMatchObject({ condicion: '(a > 1) && (a < 10)', sustituida: '(7 > 1) && (7 < 10)' });
  });

  it('el argumento de una impresión con paréntesis: lo que se imprime no cambia', () => {
    expect(datosDe('    int a = 7;\n    System.out.println((a + 1) * (a - 1));', 'impresion')).toMatchObject({ texto: '48' });
  });

  it('una llamada sobre una expresión entre paréntesis: `("ab" + n).toUpperCase()` y `(s + "!").length()` empiezan en el paréntesis', () => {
    expect(datosDe('    int n = 5;\n    String t = ("ab" + n).toUpperCase();', 'declaracion-con-valor')).toMatchObject({ expresion: '("ab" + n).toUpperCase()', sustituida: '("ab" + 5).toUpperCase()' });
    expect(datosDe('    String s = "hola";\n    int m = (s + "!").length();', 'declaracion-con-valor')).toMatchObject({ expresion: '(s + "!").length()' });
  });

  it('sin paréntesis en los extremos nada cambia: `a + b * 2`; y un nombre entre paréntesis `(a)` se sustituye completo, con sus paréntesis', () => {
    expect(datosDe('    int a = 2, b = 3;\n    int r = a + b * 2;', 'declaracion-con-valor')).toMatchObject({ expresion: 'a + b * 2', sustituida: '2 + 3 * 2' });
    expect(datosDe('    int a = 2;\n    int r = (a);', 'declaracion-con-valor')).toMatchObject({ expresion: '(a)', sustituida: '2' });
  });
});

// RED del arreglo (b) del hito 2A: la frase de una lectura de `Scanner` decía «con los valores de ahora es `un Scanner.nextInt()`». `sc` no es un valor que se pueda poner en el lugar de la
// variable (el `Scanner` es un objeto, no un número ni un texto), así que ni se sustituye ni se lista como «sc vale un Scanner»; y una sentencia que es SOLO una lectura (`int edad =
// sc.nextInt();`) lo dice con datos propios, `leeDelTeclado`, para que el catálogo la cuente como lo que es: lo que el usuario escribió.
const CON_SCANNER = (cuerpo: string): string => `    Scanner sc = new Scanner(System.in);\n${cuerpo}`;

function explicacionesConEntrada(cuerpo: string, entrada: string): ExplicacionPaso[] {
  const fuente = `import java.util.Scanner;\n\npublic class MiPrograma {\n  public static void main(String[] args) {\n${CON_SCANNER(cuerpo)}\n  }\n}\n`;
  return correrPrograma(fuente, { puerto: PUERTO_POR_OMISION, config: { entradaPreparada: entrada } }).pasos.map((paso) => paso.explicacion);
}

describe('la lectura de un Scanner no sustituye al Scanner ni lo lista como una variable con valor (arreglo b)', () => {
  it('`int edad = sc.nextInt();` es una lectura del teclado: la expresión queda como está y trae `leeDelTeclado`', () => {
    const [, lectura] = explicacionesConEntrada('    int edad = sc.nextInt();', '25\n');
    expect(lectura).toEqual({
      clave: 'declaracion-con-valor',
      datos: { nombre: 'edad', tipo: 'int', expresion: 'sc.nextInt()', sustituida: 'sc.nextInt()', valor: '25', leeDelTeclado: true },
    });
  });

  it('con conversión implícita (`long`) y con texto (`nextLine`) también es una lectura del teclado', () => {
    const [, delLong] = explicacionesConEntrada('    long grande = sc.nextInt();', '7\n');
    expect(delLong).toMatchObject({ clave: 'declaracion-con-valor', datos: { expresion: 'sc.nextInt()', sustituida: 'sc.nextInt()', valor: '7', leeDelTeclado: true } });
    const [, deTexto] = explicacionesConEntrada('    String nombre = sc.nextLine();', 'Ana\n');
    expect(deTexto).toMatchObject({ clave: 'declaracion-con-valor', datos: { expresion: 'sc.nextLine()', valor: '"Ana"', leeDelTeclado: true } });
  });

  it('una asignación `x = sc.nextInt();` también', () => {
    const pasos = explicacionesConEntrada('    int x;\n    x = sc.nextInt();', '9\n');
    expect(pasos[2]).toEqual({ clave: 'asignacion', datos: { nombre: 'x', expresion: 'sc.nextInt()', sustituida: 'sc.nextInt()', valor: '9', anterior: null, leeDelTeclado: true } });
  });

  it('una expresión que mezcla dos lecturas NO es «lo que escribiste»: sin la marca, y sin sustituir el Scanner', () => {
    const [, suma] = explicacionesConEntrada('    int total = sc.nextInt() + sc.nextInt();', '3\n4\n');
    expect(suma).toEqual({
      clave: 'declaracion-con-valor',
      datos: { nombre: 'total', tipo: 'int', expresion: 'sc.nextInt() + sc.nextInt()', sustituida: 'sc.nextInt() + sc.nextInt()', valor: '7' },
    });
  });

  it('una llamada que no es del teclado (`Math.abs`) no lleva la marca', () => {
    const [, abs] = explicacionesConEntrada('    int a = Math.abs(-5);', '');
    expect(abs).toEqual({ clave: 'declaracion-con-valor', datos: { nombre: 'a', tipo: 'int', expresion: 'Math.abs(-5)', sustituida: 'Math.abs(-5)', valor: '5' } });
  });

  it('en la condición de un ciclo, `sc` no aparece como una variable que «vale un Scanner»', () => {
    const pasos = explicacionesConEntrada('    int n = 0;\n    while (sc.nextInt() != 0) {\n      n = n + 1;\n    }', '5 0\n');
    const condicion = pasos.find((paso) => paso.clave === 'condicion-ciclo');
    expect(condicion).toMatchObject({ clave: 'condicion-ciclo', datos: { condicion: 'sc.nextInt() != 0', sustituida: 'sc.nextInt() != 0', lecturas: [], resultado: true } });
  });

  it('las variables que sí tienen valor se siguen sustituyendo en la misma expresión: `sc.nextInt() + base`', () => {
    const pasos = explicacionesConEntrada('    int base = 10;\n    int r = sc.nextInt() + base;', '5\n');
    expect(pasos[2]).toMatchObject({ clave: 'declaracion-con-valor', datos: { expresion: 'sc.nextInt() + base', sustituida: 'sc.nextInt() + 10', valor: '15' } });
  });
});

// C1 del panel 1 (2026-10-17): el narrador decía «`25 / 3`, que da 8.0» para `double promedio = suma / 3;`. En Java `25 / 3` da 8 (int) y el 8.0 NACE al guardarlo en un `double` (JLS 5.2). El `Paso` ahora
// distingue las dos cosas con datos del motor: `valor` es lo que queda guardado (8.0) y `conversion.antes` es lo que dio el cálculo ANTES de convertirlo (8), leído del registro del punto de la
// subexpresión —nunca recalculado—. Solo hay `conversion` cuando guardar CAMBIA cómo se escribe el valor (un `int` que entra a un `long` se escribe igual: no hay nada que aclarar).
describe('el valor del cálculo y la conversión al guardar son dos datos distintos (C1)', () => {
  it('`double promedio = suma / 3;` con `int suma = 25`: el cálculo da 8 y el 8.0 aparece al guardarlo', () => {
    expect(datosDe('    int suma = 25;\n    double promedio = suma / 3;', 'declaracion-con-valor')).toEqual({
      nombre: 'promedio',
      tipo: 'double',
      expresion: 'suma / 3',
      sustituida: '25 / 3',
      valor: '8.0',
      conversion: { tipo: 'double', antes: '8' },
    });
  });

  it('triangulación: otro cociente entero (`3 / 2` → 1 → 1.0) y un valor negativo (`-7 / 2` → -3 → -3.0)', () => {
    expect(datosDe('    int cociente = 3;\n    double mitad = cociente / 2;', 'declaracion-con-valor')).toMatchObject({ valor: '1.0', conversion: { tipo: 'double', antes: '1' } });
    expect(datosDe('    int n = -7;\n    double m = n / 2;', 'declaracion-con-valor')).toMatchObject({ valor: '-3.0', conversion: { tipo: 'double', antes: '-3' } });
  });

  it('una constante: `double d = 5;` es 5 (int) que se guarda como 5.0', () => {
    expect(datosDe('    double d = 5;', 'declaracion-con-valor')).toMatchObject({ expresion: '5', valor: '5.0', conversion: { tipo: 'double', antes: '5' } });
  });

  it("un carácter que se ensancha: `double e = 'a';` es 'a' que se guarda como 97.0; `int h = 'a';` como 97", () => {
    expect(datosDe("    double e = 'a';", 'declaracion-con-valor')).toMatchObject({ expresion: "'a'", valor: '97.0', conversion: { tipo: 'double', antes: "'a'" } });
    expect(datosDe("    int h = 'a';", 'declaracion-con-valor')).toMatchObject({ valor: '97', conversion: { tipo: 'int', antes: "'a'" } });
  });

  it("una constante que se estrecha: `char c = 65;` es 65 que se guarda como 'A'", () => {
    expect(datosDe('    char c = 65;', 'declaracion-con-valor')).toMatchObject({ expresion: '65', valor: "'A'", conversion: { tipo: 'char', antes: '65' } });
  });

  it('el resultado de una llamada: `double f = Math.abs(a / b);` — `Math.abs(int)` da 3, no 3.0', () => {
    expect(datosDe('    int a = 7, b = 2;\n    double f = Math.abs(a / b);', 'declaracion-con-valor')).toMatchObject({
      expresion: 'Math.abs(a / b)',
      sustituida: 'Math.abs(7 / 2)',
      valor: '3.0',
      conversion: { tipo: 'double', antes: '3' },
    });
  });

  it('una asignación (`g = a / b;`) también separa el cálculo (3) de lo que se guarda (3.0), con el tipo de la variable', () => {
    expect(datosDe('    int a = 7, b = 2;\n    double g;\n    g = a / b;', 'asignacion')).toEqual({
      nombre: 'g',
      expresion: 'a / b',
      sustituida: '7 / 2',
      valor: '3.0',
      anterior: null,
      conversion: { tipo: 'double', antes: '3' },
    });
  });

  it('una lectura del teclado que se convierte (`double x = sc.nextInt();`): lo que el usuario escribió es 5, no 5.0', () => {
    const [, lectura] = explicacionesConEntrada('    double x = sc.nextInt();', '5\n');
    expect(lectura).toEqual({
      clave: 'declaracion-con-valor',
      datos: { nombre: 'x', tipo: 'double', expresion: 'sc.nextInt()', sustituida: 'sc.nextInt()', valor: '5.0', leeDelTeclado: true, conversion: { tipo: 'double', antes: '5' } },
    });
  });

  it('SIN conversión que se note no hay `conversion`: `int` a `int`, `double` a `double` y `int` a `long` se escriben igual', () => {
    expect(datosDe('    int a = 7;\n    int b = a / 2;', 'declaracion-con-valor')).not.toHaveProperty('conversion');
    expect(datosDe('    double d = 7.5 / 2;', 'declaracion-con-valor')).not.toHaveProperty('conversion');
    expect(datosDe('    int a = 7;\n    long l = a;', 'declaracion-con-valor')).not.toHaveProperty('conversion');
    expect(datosDe('    int a = 7;\n    int b;\n    b = a * 2;', 'asignacion')).not.toHaveProperty('conversion');
  });

  it('un cast que el alumno escribió NO es la conversión de guardar: `int n = (int) 3.7;` se calcula completo y da 3', () => {
    expect(datosDe('    int n = (int) 3.7;', 'declaracion-con-valor')).toMatchObject({ expresion: '(int) 3.7', valor: '3' });
    expect(datosDe('    int n = (int) 3.7;', 'declaracion-con-valor')).not.toHaveProperty('conversion');
  });

  it("el `+c` unario promueve el char dentro de la expresión (da 97): no es la conversión de guardar, y no se afirma que `+c` dé 'a'", () => {
    const datos = datosDe("    char c = 'a';\n    int n = +c;", 'declaracion-con-valor');
    expect(datos).toMatchObject({ expresion: '+c', valor: '97' });
    expect(datos).not.toHaveProperty('conversion');
  });
});

// C2 del panel 1, primera parte: `x += 2.7;` con `int x = 10` es `x = (int) (x + 2.7)`: la suma da 12.7 y guardarla en un `int` la recorta a 12. El motor guarda el valor SIN recortar en un canal propio del paso
// (`sinRecortar`), y el lado derecho se cuenta como lo escribió el alumno (2), no ya promovido a la operación (2.0).
describe('la asignación compuesta separa el resultado de la operación del valor recortado que se guarda (C2)', () => {
  it('`x += 2.7;` con `int x = 10`: la suma da 12.7 y, como `x` es `int`, se queda con 12', () => {
    expect(datosDe('    int x = 10;\n    x += 2.7;', 'asignacion-compuesta')).toEqual({
      nombre: 'x',
      operador: '+=',
      expresion: '2.7',
      sustituida: '2.7',
      derecho: '2.7',
      anterior: '10',
      valor: '12',
      recorte: { tipo: 'int', operado: '12.7' },
    });
  });

  it('triangulación: `/=` con `double` da 4.0 y `int` se queda con 4; un `char` con `+= 1` suma 98 y se queda con \'b\'', () => {
    expect(datosDe('    int x = 10;\n    x /= 2.5;', 'asignacion-compuesta')).toMatchObject({ derecho: '2.5', anterior: '10', valor: '4', recorte: { tipo: 'int', operado: '4.0' } });
    expect(datosDe("    char ch = 'a';\n    ch += 1;", 'asignacion-compuesta')).toMatchObject({ derecho: '1', anterior: "'a'", valor: "'b'", recorte: { tipo: 'char', operado: '98' } });
  });

  it('un `long` con un `double` también recorta: `l += 2.7` con `long l = 10` suma 12.7 y se queda con 12', () => {
    expect(datosDe('    long l = 10;\n    l += 2.7;', 'asignacion-compuesta')).toMatchObject({ valor: '12', recorte: { tipo: 'long', operado: '12.7' } });
  });

  it('sin recorte no hay `recorte`: `int += int` y `double += int` guardan lo mismo que da la operación', () => {
    expect(datosDe('    int x = 10;\n    x += 2;', 'asignacion-compuesta')).not.toHaveProperty('recorte');
    expect(datosDe('    double d = 5.5;\n    d += 2;', 'asignacion-compuesta')).not.toHaveProperty('recorte');
  });

  it('el lado derecho se cuenta como lo escribió el alumno: `d += 2` con `double d` es 2, no el 2.0 de la promoción', () => {
    expect(datosDe('    double d = 5.5;\n    d += 2;', 'asignacion-compuesta')).toMatchObject({ derecho: '2', anterior: '5.5', valor: '7.5' });
  });

  it('y con una variable: `int k = 3; x += k * 2;` el lado derecho vale 6', () => {
    expect(datosDe('    int x = 10;\n    int k = 3;\n    x += k * 2;', 'asignacion-compuesta')).toMatchObject({ expresion: 'k * 2', sustituida: '3 * 2', derecho: '6', valor: '16' });
  });
});

// C2, segunda parte: `int c = i++ + i;` con `i = 7` mostraba «`i++ + 8`» sin decir de dónde sale el 8, e `i = i++;` decía «antes valía 10» sin decir que el `i++` ya había subido `i`. Ahora el paso trae los
// EFECTOS de los `++`/`--` que van dentro de la expresión, con lo que el motor midió: lo que vale la expresión `i++` y lo que dejó en `i`.
describe('los ++ y -- dentro de una expresión traen sus efectos, medidos por el motor (C2)', () => {
  it('`int c = i++ + i;` con `i = 7`: `i++` vale 7 y deja `i` en 8 (por eso la segunda `i` ya es 8)', () => {
    expect(datosDe('    int i = 7;\n    int c = i++ + i;', 'declaracion-con-valor')).toEqual({
      nombre: 'c',
      tipo: 'int',
      expresion: 'i++ + i',
      sustituida: 'i++ + 8',
      valor: '15',
      efectos: [{ expresion: 'i++', nombre: 'i', valor: '7', nuevo: '8' }],
    });
  });

  it('`i = i++;` con `i = 9`: `i++` vale 9 y deja `i` en 10; luego se guarda el 9 y por eso «antes valía 10»', () => {
    expect(datosDe('    int i = 9;\n    i = i++;', 'asignacion')).toEqual({
      nombre: 'i',
      expresion: 'i++',
      sustituida: 'i++',
      valor: '9',
      anterior: '10',
      efectos: [{ expresion: 'i++', nombre: 'i', valor: '9', nuevo: '10' }],
    });
  });

  it('un prefijo vale lo que deja: `int k = ++j * 2;` con `j = 1`: `++j` vale 2 y deja `j` en 2', () => {
    expect(datosDe('    int j = 1;\n    int k = ++j * 2;', 'declaracion-con-valor')).toMatchObject({ valor: '4', efectos: [{ expresion: '++j', nombre: 'j', valor: '2', nuevo: '2' }] });
  });

  it('un decremento y varios efectos, en el orden en que Java los evalúa', () => {
    expect(datosDe('    int a = 5, b = 1;\n    int r = a-- + b++;', 'declaracion-con-valor')).toMatchObject({
      valor: '6',
      efectos: [
        { expresion: 'a--', nombre: 'a', valor: '5', nuevo: '4' },
        { expresion: 'b++', nombre: 'b', valor: '1', nuevo: '2' },
      ],
    });
  });

  it('en una asignación compuesta: `s += a++;` con `a = 5`', () => {
    expect(datosDe('    int a = 5;\n    int s = 1;\n    s += a++;', 'asignacion-compuesta')).toMatchObject({
      derecho: '5',
      valor: '6',
      efectos: [{ expresion: 'a++', nombre: 'a', valor: '5', nuevo: '6' }],
    });
  });

  it('un `++` que no se evaluó (corto circuito) no deja efecto: `z > 5 && z++ > 0` con `z = 0`', () => {
    expect(datosDe('    int z = 0;\n    boolean q = z > 5 && z++ > 0;', 'declaracion-con-valor')).not.toHaveProperty('efectos');
  });

  it('sin ++ ni -- dentro no hay `efectos`; y `i++;` como sentencia sigue siendo la clave `incremento`, sin efectos', () => {
    expect(datosDe('    int a = 2;\n    int b = a * 3;', 'declaracion-con-valor')).not.toHaveProperty('efectos');
    expect(datosDe('    int i = 3;\n    i++;', 'incremento')).toEqual({ nombre: 'i', anterior: '3', valor: '4' });
  });
});
