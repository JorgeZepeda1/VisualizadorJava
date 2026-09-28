// RED de la tarea 1.8 (Catálogo de biblioteca reconocida, REQ-SUB-005/007). `clasificarMiembro`
// distingue las 3 categorías reales sobre el catálogo generado por el oráculo (tarea 1.9, ADR
// 010): 'soportado' (REQ-SUB-005), 'existe-no-soportado' (REQ-SUB-007: el miembro es real en el
// JDK pero fuera de esta versión) y 'no-existe' (ni siquiera es un miembro real — typo del
// alumno). Los 3 ejemplos de "existe pero no soportado" son los que da el propio RED de la tarea.
import { describe, expect, it } from 'vitest';
import { clasificarMiembro, MIEMBROS_SOPORTADOS } from './catalogo-api.ts';
import { FIRMAS_JDK } from '../biblioteca/datos/firmas-jdk.generado.ts';

describe('clasificarMiembro — "existe pero no soportado" (REQ-SUB-007, los 3 ejemplos del RED de 1.8)', () => {
  it('String.split existe en el JDK pero no está en la superficie soportada (REQ-SUB-005)', () => {
    expect(clasificarMiembro('String', 'split')).toBe('existe-no-soportado');
  });

  it('Math.sin existe pero no está soportado (trascendentes, REQ-SUB-007)', () => {
    expect(clasificarMiembro('Math', 'sin')).toBe('existe-no-soportado');
  });

  it('Scanner.hasNextInt existe pero no está soportado (REQ-SUB-007)', () => {
    expect(clasificarMiembro('Scanner', 'hasNextInt')).toBe('existe-no-soportado');
  });
});

describe('clasificarMiembro — "soportado" (REQ-SUB-005)', () => {
  it.each([
    ['Math', 'round'],
    ['Math', 'abs'],
    ['String', 'length'],
    ['Scanner', 'nextInt'],
    ['Character', 'isDigit'],
    ['Integer', 'parseInt'],
  ] as const)('%s.%s', (clase, nombre) => {
    expect(clasificarMiembro(clase, nombre)).toBe('soportado');
  });
});

describe('clasificarMiembro — "no existe" (ni siquiera es un miembro real del JDK)', () => {
  it('un nombre inventado no es ni soportado ni "existe-no-soportado"', () => {
    expect(clasificarMiembro('Math', 'sqrtDeUnaCosaQueNoExiste')).toBe('no-existe');
  });

  it('triangulación: un error de dedo común (typo de "length")', () => {
    expect(clasificarMiembro('String', 'lenght')).toBe('no-existe');
  });

  it('Long.parseLong existe en el JDK pero NUNCA está soportado aquí (REQ-SUB-002 lo excluye explícitamente)', () => {
    expect(clasificarMiembro('Long', 'parseLong')).toBe('existe-no-soportado');
  });
});

describe('MIEMBROS_SOPORTADOS — cada entrada corresponde a un miembro REAL del catálogo del oráculo (nunca inventado)', () => {
  it('ninguna entrada de la lista blanca es un nombre que el JDK real no tenga', () => {
    const sinCorrespondencia = [...MIEMBROS_SOPORTADOS].filter((clave) => {
      const separador = clave.indexOf('.');
      const clase = clave.slice(0, separador);
      const nombre = clave.slice(separador + 1);
      return !FIRMAS_JDK.some((f) => f.clase === clase && f.nombre === nombre);
    });
    expect(sinCorrespondencia).toEqual([]);
  });
});
