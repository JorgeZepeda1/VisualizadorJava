// RED de la tarea 2.14 (REQ-EJEC-006 biblioteca, design.md §3.6): `ExcepcionJava` y el texto EXACTO de `stderr` que imprime Java 17. Los textos esperados son los de los goldens
// `.errores` que el oráculo capturó del JDK 17.0.18 real (`corpus/experimentos/texto/*.errores`); la comparación de TODOS los escenarios contra la biblioteca real está en
// `pruebas/diferencial/biblioteca/excepciones.test.ts`.
import { describe, expect, it } from 'vitest';
import { ExcepcionDeEjecucion } from '../../interprete/excepcion-de-ejecucion.ts';
import { crearExcepcion, divisionEntreCero, existeSitio, ExcepcionJava } from './excepcion-java.ts';
import { formatearTrazaDePila } from './traza-de-pila.ts';

describe('crearExcepcion — la clase y los marcos de java.base salen de la tabla que generó el oráculo', () => {
  it('una excepción sin marcos de java.base: ArithmeticException de la división entera', () => {
    const excepcion = crearExcepcion('Aritmetica/division-entera', '/ by zero');
    expect(excepcion).toBeInstanceOf(ExcepcionJava);
    expect(excepcion.clase).toBe('java.lang.ArithmeticException');
    expect(excepcion.mensaje).toBe('/ by zero');
    expect(excepcion.marcos).toEqual([]);
  });

  it('una con marcos: InputMismatchException de nextInt, sin mensaje (null, no la cadena vacía)', () => {
    const excepcion = crearExcepcion('Scanner.nextInt/no-coincide', null);
    expect(excepcion.clase).toBe('java.util.InputMismatchException');
    expect(excepcion.mensaje).toBeNull();
    expect(excepcion.marcos).toEqual([
      'java.base/java.util.Scanner.throwFor(Scanner.java:939)',
      'java.base/java.util.Scanner.next(Scanner.java:1594)',
      'java.base/java.util.Scanner.nextInt(Scanner.java:2258)',
      'java.base/java.util.Scanner.nextInt(Scanner.java:2212)',
    ]);
  });

  it('charAt fuera de rango: Latin-1 y UTF-16 dan clase igual pero marcos distintos (REQ-BIB-006)', () => {
    const latin1 = crearExcepcion('String.charAt/latin1', 'String index out of range: 5');
    const utf16 = crearExcepcion('String.charAt/utf16', 'index 5, length 3');
    expect(latin1.marcos[0]).toBe('java.base/java.lang.StringLatin1.charAt(StringLatin1.java:48)');
    expect(utf16.marcos[0]).toBe('java.base/java.lang.String.checkIndex(String.java:4565)');
    expect(latin1.clase).toBe(utf16.clase);
  });
});

describe('ExcepcionJava es una ExcepcionDeEjecucion (hito 1, parte C: una sola jerarquía de excepciones de Java)', () => {
  it('lo que lanza la biblioteca lo reconoce el director del intérprete, que atrapa ExcepcionDeEjecucion y arma el stderr', () => {
    const excepcion = crearExcepcion('Scanner.nextInt/sin-token', null);
    expect(excepcion).toBeInstanceOf(ExcepcionDeEjecucion);
    expect(excepcion).toBeInstanceOf(Error);
    expect(excepcion.sitio).toBe('Scanner.nextInt/sin-token');
    expect(excepcion.clase).toBe('java.util.NoSuchElementException');
    expect(excepcion.message).toBe('java.util.NoSuchElementException');
  });

  it('el texto del Error lleva el mensaje de Java cuando lo hay', () => {
    expect(crearExcepcion('Aritmetica/division-entera', '/ by zero').message).toBe('java.lang.ArithmeticException: / by zero');
  });
});

describe('divisionEntreCero — la ArithmeticException de / y % entre enteros (int y long)', () => {
  it('es java.lang.ArithmeticException: / by zero, sin marcos de java.base', () => {
    const excepcion = divisionEntreCero();
    expect(excepcion).toBeInstanceOf(ExcepcionJava);
    expect(excepcion.clase).toBe('java.lang.ArithmeticException');
    expect(excepcion.mensaje).toBe('/ by zero');
    expect(excepcion.marcos).toEqual([]);
  });
});

describe('existeSitio — solo los sitios que el oráculo midió tienen marcos; el resto no se inventa', () => {
  it('un sitio medido existe y uno inventado no', () => {
    expect(existeSitio('Scanner.nextInt/sin-token')).toBe(true);
    expect(existeSitio('Formatter/conversion-incompatible-d@printf')).toBe(true);
    expect(existeSitio('Formatter/algo-que-nadie-midio@printf')).toBe(false);
    expect(existeSitio('constructor')).toBe(false);
  });
});

describe('formatearTrazaDePila — el texto exacto de stderr', () => {
  it('ArithmeticException: encabezado con mensaje y solo el marco del alumno (golden exc01_division_entera_cero)', () => {
    const texto = formatearTrazaDePila(crearExcepcion('Aritmetica/division-entera', '/ by zero'), [{ paquete: null, clase: 'exc01_division_entera_cero', metodo: 'main', linea: 5 }]);
    expect(texto).toBe(
      'Exception in thread "main" java.lang.ArithmeticException: / by zero\n' + '\tat exc01_division_entera_cero.main(exc01_division_entera_cero.java:5)\n',
    );
  });

  it('InputMismatchException sin mensaje: el encabezado no lleva ":" y los marcos de java.base van antes del del alumno (golden scan03_inputmismatch)', () => {
    const texto = formatearTrazaDePila(crearExcepcion('Scanner.nextInt/no-coincide', null), [{ paquete: null, clase: 'scan03_inputmismatch', metodo: 'main', linea: 6 }]);
    expect(texto).toBe(
      'Exception in thread "main" java.util.InputMismatchException\n' +
        '\tat java.base/java.util.Scanner.throwFor(Scanner.java:939)\n' +
        '\tat java.base/java.util.Scanner.next(Scanner.java:1594)\n' +
        '\tat java.base/java.util.Scanner.nextInt(Scanner.java:2258)\n' +
        '\tat java.base/java.util.Scanner.nextInt(Scanner.java:2212)\n' +
        '\tat scan03_inputmismatch.main(scan03_inputmismatch.java:6)\n',
    );
  });

  it('NumberFormatException con mensaje entre comillas (golden str10_numberformat_parseint)', () => {
    const texto = formatearTrazaDePila(crearExcepcion('Integer.parseInt/digito-invalido', 'For input string: "abc"'), [{ paquete: null, clase: 'str10_numberformat_parseint', metodo: 'main', linea: 4 }]);
    expect(texto).toBe(
      'Exception in thread "main" java.lang.NumberFormatException: For input string: "abc"\n' +
        '\tat java.base/java.lang.NumberFormatException.forInputString(NumberFormatException.java:67)\n' +
        '\tat java.base/java.lang.Integer.parseInt(Integer.java:668)\n' +
        '\tat java.base/java.lang.Integer.parseInt(Integer.java:786)\n' +
        '\tat str10_numberformat_parseint.main(str10_numberformat_parseint.java:4)\n',
    );
  });

  it('con `package`, el marco del alumno lleva el nombre calificado; varios marcos del alumno salen del más interno al más externo', () => {
    const texto = formatearTrazaDePila(crearExcepcion('Aritmetica/division-entera', '/ by zero'), [
      { paquete: 'mx.escuela', clase: 'Calculadora', metodo: 'dividir', linea: 9 },
      { paquete: 'mx.escuela', clase: 'Calculadora', metodo: 'main', linea: 14 },
    ]);
    expect(texto).toBe(
      'Exception in thread "main" java.lang.ArithmeticException: / by zero\n' +
        '\tat mx.escuela.Calculadora.dividir(Calculadora.java:9)\n' +
        '\tat mx.escuela.Calculadora.main(Calculadora.java:14)\n',
    );
  });
});
