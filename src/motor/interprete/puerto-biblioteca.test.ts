// RED de la tarea 2.17/2.18 (ADR 005, design.md §3.1): los valores en ejecución y el puerto por el que el intérprete llama a la biblioteca.
// `CadenaJava` tiene identidad por referencia (`"ho" + "la" == "hola"` es true por el *pool*, `sc.next() == "si"` es false) y recuerda si todos
// sus caracteres caben en Latin-1 (de eso depende el mensaje y los marcos de `charAt` fuera de rango, design.md §3.6).
import { describe, expect, it } from 'vitest';
import {
  aTrazaValor,
  CadenaJava,
  EntradaDelPrograma,
  FaltaEntrada,
  PUERTO_VACIO,
  PoolDeCadenas,
  type ObjetoDeBiblioteca,
} from './puerto-biblioteca.ts';

describe('CadenaJava', () => {
  it('guarda el texto y marca latin1 solo si todos los caracteres son <= U+00FF', () => {
    expect(new CadenaJava('hola').latin1).toBe(true);
    expect(new CadenaJava('canción ñ').latin1).toBe(true);
    expect(new CadenaJava('€uro').latin1).toBe(false);
    expect(new CadenaJava('').latin1).toBe(true);
  });

  it('dos instancias con el mismo texto son objetos distintos (identidad por referencia)', () => {
    expect(new CadenaJava('si')).not.toBe(new CadenaJava('si'));
  });
});

describe('PoolDeCadenas', () => {
  it('internar devuelve SIEMPRE el mismo objeto para el mismo texto, y objetos distintos para textos distintos', () => {
    const pool = new PoolDeCadenas();
    const a = pool.internar('hola');
    expect(pool.internar('hola')).toBe(a);
    expect(pool.internar('adiós')).not.toBe(a);
    expect(a.texto).toBe('hola');
  });

  it('no confunde un texto con una propiedad heredada (constructor, __proto__)', () => {
    const pool = new PoolDeCadenas();
    expect(pool.internar('constructor').texto).toBe('constructor');
    expect(pool.internar('__proto__').texto).toBe('__proto__');
  });
});

describe('EntradaDelPrograma', () => {
  it('empieza vacía, abierta y con el cursor en 0; agregar() acumula los renglones', () => {
    const entrada = new EntradaDelPrograma();
    expect(entrada).toMatchObject({ texto: '', cursor: 0, cerrada: false });
    entrada.agregar('5\n');
    entrada.agregar('hola\n');
    expect(entrada.texto).toBe('5\nhola\n');
  });

  it('cerrar() marca el fin de la entrada (EOF)', () => {
    const entrada = new EntradaDelPrograma();
    entrada.cerrar();
    expect(entrada.cerrada).toBe(true);
  });
});

describe('FaltaEntrada', () => {
  it('es la señal con la que la biblioteca pide más datos (se distingue de cualquier otro error)', () => {
    expect(new FaltaEntrada()).toBeInstanceOf(Error);
    expect(new FaltaEntrada()).toBeInstanceOf(FaltaEntrada);
    expect(new Error('x')).not.toBeInstanceOf(FaltaEntrada);
  });
});

describe('aTrazaValor: lo que un valor en ejecución es dentro de un Paso', () => {
  it('los números y booleanos pasan tal cual, la cadena pasa como texto', () => {
    expect(aTrazaValor(5)).toBe(5);
    expect(aTrazaValor(5n)).toBe(5n);
    expect(aTrazaValor(true)).toBe(true);
    expect(aTrazaValor(new CadenaJava('hola'))).toBe('hola');
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
