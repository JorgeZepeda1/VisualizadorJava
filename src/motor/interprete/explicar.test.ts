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
