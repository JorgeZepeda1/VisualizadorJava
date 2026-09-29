// RED de la tarea 1.31: el adaptador que convierte el resultado de `compilar()` (src/motor) en el
// `VeredictoNuestro` que entiende el clasificador. Es la ÚNICA pieza del generador que conoce el
// contrato del motor: si el motor cambia la forma de sus problemas, este archivo es el que avisa.
// La parte que depende del estado del compilador usa resultados construidos a mano (estables); solo
// los tres programas de la prueba «con el compilador real» son respuestas que el subconjunto U3–U7
// no puede cambiar nunca (un error de sintaxis, un tipo fuera del subconjunto y un programa que se
// puede ejecutar de verdad hoy).
import { describe, expect, it } from 'vitest';
import type { ResultadoCompilacion } from '../../../src/motor/index.ts';
import { veredictoDeNuestroCompilador, veredictoDeResultado } from './nuestro-compilador.ts';

const RANGO = { inicio: 0, fin: 1 };

describe('veredictoDeResultado — traduce el contrato de compilar() al veredicto del clasificador', () => {
  it('ok: true → ok', () => {
    const resultado: ResultadoCompilacion = {
      ok: true,
      programa: { ir: [], arranque: null },
      vista: { fuente: '' },
    } as unknown as ResultadoCompilacion;
    expect(veredictoDeResultado(resultado)).toEqual({ tipo: 'ok' });
  });

  it('no-disponible con el código de ejecución pendiente → ejecucion-no-disponible, con su línea', () => {
    const resultado: ResultadoCompilacion = {
      ok: false,
      adicionales: 0,
      problema: { categoria: 'no-disponible', codigo: 'ejecucion-no-disponible', datos: {}, rango: RANGO, linea: 4 },
    };
    expect(veredictoDeResultado(resultado)).toEqual({ tipo: 'ejecucion-no-disponible', linea: 4 });
  });

  it('no-disponible con el código de una construcción fuera del subconjunto → aviso, con su código', () => {
    const resultado: ResultadoCompilacion = {
      ok: false,
      adicionales: 0,
      problema: { categoria: 'no-disponible', codigo: 'tipo-primitivo-no-soportado', datos: { tipo: 'float' }, rango: RANGO, linea: 3 },
    };
    expect(veredictoDeResultado(resultado)).toEqual({ tipo: 'aviso', codigo: 'tipo-primitivo-no-soportado', linea: 3 });
  });

  it('error-compilacion → error-compilacion, con su código y su línea', () => {
    const resultado: ResultadoCompilacion = {
      ok: false,
      adicionales: 0,
      problema: { categoria: 'error-compilacion', codigo: 'sentencia-inalcanzable', datos: {}, rango: RANGO, linea: 5 },
    };
    expect(veredictoDeResultado(resultado)).toEqual({ tipo: 'error-compilacion', codigo: 'sentencia-inalcanzable', linea: 5 });
  });
});

describe('veredictoDeNuestroCompilador — llama a compilar() y captura los fallos internos', () => {
  it('una excepción del compilador es un fallo-interno con «Nombre: mensaje» (nunca se propaga ni se pierde)', () => {
    const veredicto = veredictoDeNuestroCompilador('cualquier fuente', () => {
      throw new RangeError('Maximum call stack size exceeded');
    });
    expect(veredicto).toEqual({ tipo: 'fallo-interno', mensaje: 'RangeError: Maximum call stack size exceeded' });
  });

  it('con el compilador real: un error de sintaxis es error-compilacion en la línea del error', () => {
    const fuente = 'public class P {\n    public static void main(String[] args) {\n        int x = ;\n    }\n}\n';
    expect(veredictoDeNuestroCompilador(fuente)).toMatchObject({ tipo: 'error-compilacion', linea: 3 });
  });

  it('con el compilador real: un tipo fuera del subconjunto es un aviso, nunca un error inventado', () => {
    const fuente = 'public class P {\n    public static void main(String[] args) {\n        float f = 1.5f;\n    }\n}\n';
    expect(veredictoDeNuestroCompilador(fuente)).toMatchObject({ tipo: 'aviso', codigo: 'tipo-primitivo-no-soportado', linea: 3 });
  });

  it('con el compilador real: imprimir un literal se puede ejecutar de verdad hoy (ok)', () => {
    const fuente = 'public class P {\n    public static void main(String[] args) {\n        System.out.println("hola");\n    }\n}\n';
    expect(veredictoDeNuestroCompilador(fuente)).toEqual({ tipo: 'ok' });
  });
});
