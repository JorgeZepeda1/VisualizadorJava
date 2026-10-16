// RED del contrato de la biblioteca (hito 1, parte A): `src/motor/biblioteca/index.ts` es la ÚNICA puerta por la que el intérprete usa la biblioteca de Java (design.md §4, «contrato de la
// biblioteca»). Esta prueba fija los nombres que exporta y comprueba que, juntos, producen la salida de Java en un recorrido de aula (promedio con `Scanner`, `printf` y `println`).
import { describe, expect, it } from 'vitest';
import * as biblioteca from './index.ts';

describe('contrato de la biblioteca (design.md §4)', () => {
  it('exporta cada pieza con el nombre acordado', () => {
    const esperados = [
      'digitosJava', 'doubleATexto', 'formatear', 'formatearEnPiezas', 'formatoSoportado', 'simbolosRegionales', 'valorATexto', 'FlujoDeSalida', 'CodificadorDeSalida', 'FIN_DE_LINEA',
      'ScannerJava', 'FaltaEntrada', 'EntradaDelPrograma', 'CadenaJava', 'nuevaCadena', 'PoolDeCadenas', 'StringJava', 'isDigit', 'isLetter', 'isLetterOrDigit', 'isUpperCase', 'isLowerCase', 'isWhitespace',
      'toUpperCase', 'toLowerCase', 'digitoDecimal', 'Integer', 'Double', 'Long', 'MathJava', 'longAFloat', 'RandomJava', 'FuenteDeAleatorios', 'ExcepcionJava', 'crearExcepcion',
      'divisionEntreCero', 'existeSitio', 'formatearTrazaDePila', 'formatearMarcos', 'textoDeLaExcepcion', 'NoDisponibleEnEjecucion', 'potenciaDeDos',
    ];
    for (const nombre of esperados) expect(Object.keys(biblioteca), nombre).toContain(nombre);
  });

  it('un recorrido de aula: leer dos notas con Scanner, promediar y mostrar con printf y println (la salida que daría Java)', () => {
    const entrada = new biblioteca.EntradaDelPrograma();
    entrada.agregar('9 8\n');
    entrada.cerrar();
    const scanner = new biblioteca.ScannerJava('es-MX', entrada);
    const a = scanner.nextInt();
    const b = scanner.nextInt();
    const promedio = (a + b) / 2;
    const salida = new biblioteca.FlujoDeSalida('out');
    const texto =
      salida.println('String', `Promedio: ${biblioteca.valorATexto('double', promedio)}`) +
      biblioteca.formatear('Redondeado: %.2f y %d%n', [{ tipo: 'double', valor: 8.675 }, { tipo: 'int', valor: a }], 'es-MX', 'printf');
    expect(texto).toBe('Promedio: 8.5\nRedondeado: 8.68 y 9\n');
  });

  it('una excepción de la biblioteca se imprime con el stderr exacto de Java', () => {
    const entrada = new biblioteca.EntradaDelPrograma();
    entrada.agregar('hola\n');
    entrada.cerrar();
    const scanner = new biblioteca.ScannerJava('es-MX', entrada);
    let capturada: unknown;
    try {
      scanner.nextInt();
    } catch (error) {
      capturada = error;
    }
    expect(capturada).toBeInstanceOf(biblioteca.ExcepcionJava);
    expect(biblioteca.formatearTrazaDePila(capturada as biblioteca.ExcepcionJava, [{ paquete: null, clase: 'Promedio', metodo: 'main', linea: 7 }])).toBe(
      'Exception in thread "main" java.util.InputMismatchException\n' +
        '\tat java.base/java.util.Scanner.throwFor(Scanner.java:939)\n' +
        '\tat java.base/java.util.Scanner.next(Scanner.java:1594)\n' +
        '\tat java.base/java.util.Scanner.nextInt(Scanner.java:2258)\n' +
        '\tat java.base/java.util.Scanner.nextInt(Scanner.java:2212)\n' +
        '\tat Promedio.main(Promedio.java:7)\n',
    );
  });
});
