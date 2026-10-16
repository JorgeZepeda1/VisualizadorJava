// RED de la tarea 2.9 (REQ-BIB-006, design.md §3.1), hito 1 parte C: `CadenaJava` y `PoolDeCadenas` son UNA sola pareja de clases (antes el intérprete tenía las suyas). `CadenaJava` tiene
// identidad por referencia (`"ho" + "la" == "hola"` es true por el *pool*, `sc.next() == "si"` es false) y recuerda si todos sus caracteres caben en Latin-1 (de eso depende el mensaje
// y los marcos de `charAt` fuera de rango, design.md §3.6).
import { describe, expect, it } from 'vitest';
import { CadenaJava, nuevaCadena, PoolDeCadenas } from './cadena-java.ts';

describe('CadenaJava', () => {
  it('guarda el texto y marca latin1 solo si todos los caracteres son <= U+00FF', () => {
    expect(new CadenaJava('hola').latin1).toBe(true);
    expect(new CadenaJava('canción ñ').latin1).toBe(true);
    expect(new CadenaJava('€uro').latin1).toBe(false);
    expect(new CadenaJava('').latin1).toBe(true);
  });

  it('dos instancias con el mismo texto son objetos distintos (identidad por referencia)', () => {
    expect(new CadenaJava('si')).not.toBe(new CadenaJava('si'));
    expect(nuevaCadena('si')).not.toBe(nuevaCadena('si'));
    expect(nuevaCadena('si').texto).toBe('si');
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
