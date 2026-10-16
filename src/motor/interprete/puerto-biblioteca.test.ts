// RED de la tarea 2.17/2.18 (ADR 005, design.md §3.1): los valores en ejecución y el puerto por el que el intérprete llama a la biblioteca. Las clases de valor (`CadenaJava`,
// `PoolDeCadenas`, `EntradaDelPrograma`, `FaltaEntrada`, `FlujoDeSalida`) ya no se declaran aquí: son las de la biblioteca (hito 1, parte C).
import { describe, expect, it } from 'vitest';
import { CadenaJava, FlujoDeSalida } from '../biblioteca/index.ts';
import { aTrazaValor, PUERTO_VACIO, type ObjetoDeBiblioteca } from './puerto-biblioteca.ts';

describe('aTrazaValor: lo que un valor en ejecución es dentro de un Paso', () => {
  it('los números y booleanos pasan tal cual, la cadena pasa como texto', () => {
    expect(aTrazaValor(5)).toBe(5);
    expect(aTrazaValor(5n)).toBe(5n);
    expect(aTrazaValor(true)).toBe(true);
    expect(aTrazaValor(new CadenaJava('hola'))).toBe('hola');
  });

  it('un flujo de salida pasa como el nombre del flujo (nunca ocupa un punto del plan)', () => {
    expect(aTrazaValor(new FlujoDeSalida('out'))).toBe('System.out');
    expect(aTrazaValor(new FlujoDeSalida('err'))).toBe('System.err');
  });

  it('un objeto de la biblioteca pasa como { objeto: <clase> }', () => {
    const scanner: ObjetoDeBiblioteca = { claseJava: 'Scanner', capturar: () => 0, restaurar: () => undefined };
    const azar: ObjetoDeBiblioteca = { claseJava: 'Random', capturar: () => 0, restaurar: () => undefined };
    expect(aTrazaValor(scanner)).toEqual({ objeto: 'Scanner' });
    expect(aTrazaValor(azar)).toEqual({ objeto: 'Random' });
  });
});

describe('PUERTO_VACIO', () => {
  it('no sabe ninguna operación ni cómo escribir un double: todo lo que lo necesite queda como "no disponible"', () => {
    expect(PUERTO_VACIO.operaciones.size).toBe(0);
    expect(PUERTO_VACIO.doubleATexto).toBeNull();
  });
});
