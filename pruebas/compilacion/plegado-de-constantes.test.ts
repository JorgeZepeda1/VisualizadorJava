// Tarea 1.36 (S-9 de la verificación final del lote 1): una fila por operador y por tipo del plegado de constantes (`semantica/constantes.ts`, JLS 15.29), contra el valor que javac 17.0.18 les da
// (`tablas-de-plegado.ts`; el JDK real lo verifica en `herramientas/oraculo/plegado-de-constantes.test.ts`, `npm run test:oraculo`). Sin JDK: lo que calcula el motor tiene que ser, bit a bit, lo que
// calcula Java. Antes de esta tarea 24 líneas de `constantes.ts` —los brazos `long` con `-`, `*`, `/`, `%`; `double` con `-`, `*`, `%` y las comparaciones; `==` y `!=` de `boolean`; la saturación de
// `(int)` y `(long)` sobre un `double`— no las ejecutaba ninguna prueba.
import { describe, expect, it } from 'vitest';
import { bitsDeUnDouble, calcularConElMotor, FILAS_DE_PLEGADO, formatearConstante, programaDeJavaDelPlegado } from './tablas-de-plegado.ts';

describe('la tabla de plegado — está bien armada', () => {
  it('trae las filas, con ids únicos y un resultado de Java en cada una', () => {
    expect(FILAS_DE_PLEGADO.length).toBeGreaterThanOrEqual(170);
    expect(new Set(FILAS_DE_PLEGADO.map((f) => f.id)).size).toBe(FILAS_DE_PLEGADO.length);
    for (const f of FILAS_DE_PLEGADO) expect(f.resultado, f.id).not.toBe('');
  });

  it('cada fila tiene el formato de su tipo (así un resultado de otro tipo no pasa por bueno)', () => {
    const formato = { int: /^-?\d+$/, long: /^-?\d+L$/, double: /^0x[0-9a-f]{16}$/, boolean: /^(true|false)$/, char: /^c\d+$/, String: /^".*"$/s };
    for (const f of FILAS_DE_PLEGADO) expect(f.resultado, f.id).toMatch(formato[f.tipo]);
  });

  it('cubre cada operador aritmético en int, long y double, y cada comparación en int, long y double', () => {
    for (const operador of ['+', '-', '*', '/', '%']) {
      for (const prefijo of ['int-', 'long-', 'double-']) {
        const hay = FILAS_DE_PLEGADO.some((f) => f.id.startsWith(prefijo) && f.expresion.includes(` ${operador} `));
        expect(hay, `${prefijo}${operador}`).toBe(true);
      }
    }
    for (const operador of ['==', '!=', '<', '>', '<=', '>=']) {
      for (const prefijo of ['bool-int-', 'bool-long-', 'bool-double-']) {
        const hay = FILAS_DE_PLEGADO.some((f) => f.id.startsWith(prefijo) && f.expresion.includes(` ${operador} `));
        expect(hay, `${prefijo}${operador}`).toBe(true);
      }
    }
  });

  it('el programa de Java que se arma con la tabla trae una línea de impresión por fila', () => {
    const fuente = programaDeJavaDelPlegado(FILAS_DE_PLEGADO);
    expect(fuente.split('\n').filter((l) => l.includes('System.out.println(')).length).toBe(FILAS_DE_PLEGADO.length);
    expect(fuente).toContain('Double.doubleToLongBits');
  });
});

describe('el formato de los resultados', () => {
  it('un double es la palabra de 64 bits en hexadecimal: distingue 0.0 de -0.0 y da a todo NaN la forma canónica', () => {
    expect(formatearConstante({ tipo: 'double', valor: 0 })).toBe('0x0000000000000000');
    expect(formatearConstante({ tipo: 'double', valor: -0 })).toBe('0x8000000000000000');
    expect(formatearConstante({ tipo: 'double', valor: Number.NaN })).toBe('0x7ff8000000000000');
    expect(formatearConstante({ tipo: 'double', valor: Number.POSITIVE_INFINITY })).toBe('0x7ff0000000000000');
    expect(bitsDeUnDouble(1)).toBe(0x3ff0000000000000n);
  });

  it('long con L, char con c, texto entre comillas', () => {
    expect(formatearConstante({ tipo: 'long', valor: -5n })).toBe('-5L');
    expect(formatearConstante({ tipo: 'char', valor: 65 })).toBe('c65');
    expect(formatearConstante({ tipo: 'String', valor: 'ab' })).toBe('"ab"');
  });
});

describe('plegado de constantes — el motor da, bit a bit, lo que da javac (una fila por operador y por tipo)', () => {
  it.each(FILAS_DE_PLEGADO.map((f) => [f.id, f.expresion, f.resultado] as const))('%s: %s → %s', (id, _expresion, esperado) => {
    const fila = FILAS_DE_PLEGADO.find((f) => f.id === id)!;
    expect(calcularConElMotor(fila)).toBe(esperado);
  });
});
