// RED de la tarea 1.31 (generador diferencial permanente): el clasificador compara el veredicto de
// `javac` 17 con el de nuestro compilador y decide si hay una discrepancia. Es PURO: recibe los dos
// veredictos ya calculados, así que aquí se prueba con compiladores falsos (uno que acepta todo, otro
// que rechaza todo) y no depende de en qué estado esté `compilar()` hoy ni después de la tarea 1.32.
//
// Reglas (decisión D2 y REQ-COMP-006, «ni más permisivo ni más estricto que javac»):
//   - javac compila  → lo nuestro debe ser `ok`, `ejecucion-no-disponible` o un aviso de construcción;
//     un `error-compilacion` es un FALSO RECHAZO.
//   - javac rechaza  → lo nuestro debe ser `error-compilacion` o un aviso de construcción; `ok` o
//     `ejecucion-no-disponible` (cuyo texto dice «Java sí acepta tu programa») es un FALSO ACEPTO.
//   - un fallo interno (el compilador lanza) es una discrepancia con cualquier veredicto de javac.
import { describe, expect, it } from 'vitest';
import {
  clasificar,
  claveDeNuestroVeredicto,
  type VeredictoJavac,
  type VeredictoNuestro,
} from './clasificador.ts';

const JAVAC_COMPILA: VeredictoJavac = { compila: true, linea: -1, codigoJavac: '', mensajeJavac: '' };

function javacRechaza(linea: number, codigoJavac = 'compiler.err.prob.found.req'): VeredictoJavac {
  return { compila: false, linea, codigoJavac, mensajeJavac: 'incompatible types: java.lang.String cannot be converted to int' };
}

const ACEPTA_TODO: VeredictoNuestro = { tipo: 'ok' };
const ACEPTA_SIN_EJECUTAR: VeredictoNuestro = { tipo: 'ejecucion-no-disponible', linea: 3 };
const AVISO: VeredictoNuestro = { tipo: 'aviso', codigo: 'tipo-primitivo-no-soportado', linea: 3 };
const RECHAZA_TODO: VeredictoNuestro = { tipo: 'error-compilacion', codigo: 'error-no-clasificado', linea: 1 };
const FALLA: VeredictoNuestro = { tipo: 'fallo-interno', mensaje: 'RangeError: Maximum call stack size exceeded' };

describe('clasificar — javac COMPILA el programa', () => {
  it('nuestro compilador da ok: coinciden', () => {
    expect(clasificar(JAVAC_COMPILA, ACEPTA_TODO).discrepancia).toBeNull();
  });

  it('nuestro compilador da ejecucion-no-disponible (lo acepta y solo falta ejecutarlo): coinciden', () => {
    expect(clasificar(JAVAC_COMPILA, ACEPTA_SIN_EJECUTAR).discrepancia).toBeNull();
  });

  it('nuestro compilador da un aviso de construcción fuera del subconjunto: coinciden (honesto, no un error inventado)', () => {
    expect(clasificar(JAVAC_COMPILA, AVISO).discrepancia).toBeNull();
  });

  it('nuestro compilador da error-compilacion: es un FALSO RECHAZO', () => {
    expect(clasificar(JAVAC_COMPILA, RECHAZA_TODO).discrepancia).toBe('falso-rechazo');
  });

  it('un compilador falso que RECHAZA todo produce un falso rechazo en cada programa que javac compila', () => {
    const veredictos = [JAVAC_COMPILA, JAVAC_COMPILA, JAVAC_COMPILA];
    expect(veredictos.map((javac) => clasificar(javac, RECHAZA_TODO).discrepancia)).toEqual([
      'falso-rechazo',
      'falso-rechazo',
      'falso-rechazo',
    ]);
  });
});

describe('clasificar — javac RECHAZA el programa', () => {
  it('nuestro compilador da error-compilacion en la misma línea: coinciden y la línea coincide', () => {
    expect(clasificar(javacRechaza(3), { tipo: 'error-compilacion', codigo: 'conversion-con-perdida', linea: 3 })).toMatchObject({
      discrepancia: null,
      lineaCoincide: true,
    });
  });

  it('nuestro compilador da error-compilacion en OTRA línea: sigue sin ser discrepancia (solo se reporta el porcentaje)', () => {
    expect(clasificar(javacRechaza(3), { tipo: 'error-compilacion', codigo: 'conversion-con-perdida', linea: 5 })).toMatchObject({
      discrepancia: null,
      lineaCoincide: false,
    });
  });

  it('nuestro compilador da un aviso de construcción: coinciden (nunca afirma que Java lo acepta) y la línea no es comparable', () => {
    expect(clasificar(javacRechaza(3), AVISO)).toMatchObject({ discrepancia: null, lineaCoincide: null });
  });

  it('nuestro compilador da ok: es un FALSO ACEPTO', () => {
    expect(clasificar(javacRechaza(3), ACEPTA_TODO).discrepancia).toBe('falso-acepto');
  });

  it('nuestro compilador da ejecucion-no-disponible: es un FALSO ACEPTO (su texto dice «Java sí acepta tu programa»)', () => {
    expect(clasificar(javacRechaza(3), ACEPTA_SIN_EJECUTAR).discrepancia).toBe('falso-acepto');
  });

  it('un compilador falso que ACEPTA todo produce un falso acepto en cada programa que javac rechaza', () => {
    const veredictos = [javacRechaza(2), javacRechaza(4, 'compiler.err.cant.deref'), javacRechaza(7, 'compiler.err.void.not.allowed.here')];
    expect(veredictos.map((javac) => clasificar(javac, ACEPTA_TODO).discrepancia)).toEqual([
      'falso-acepto',
      'falso-acepto',
      'falso-acepto',
    ]);
  });
});

describe('clasificar — el compilador lanza una excepción', () => {
  it('con javac compilando: es un fallo interno', () => {
    expect(clasificar(JAVAC_COMPILA, FALLA).discrepancia).toBe('fallo-interno');
  });

  it('con javac rechazando: también es un fallo interno (un fallo del motor nunca es una respuesta válida)', () => {
    expect(clasificar(javacRechaza(3), FALLA).discrepancia).toBe('fallo-interno');
  });
});

describe('claveDeNuestroVeredicto — la clave estable con que se agrupan las familias', () => {
  it('distingue cada forma de respuesta y conserva el código que dio nuestro compilador', () => {
    expect(claveDeNuestroVeredicto(ACEPTA_TODO)).toBe('ok');
    expect(claveDeNuestroVeredicto(ACEPTA_SIN_EJECUTAR)).toBe('ejecucion-no-disponible');
    expect(claveDeNuestroVeredicto(AVISO)).toBe('aviso:tipo-primitivo-no-soportado');
    expect(claveDeNuestroVeredicto(RECHAZA_TODO)).toBe('error:error-no-clasificado');
    expect(claveDeNuestroVeredicto(FALLA)).toBe('fallo-interno:RangeError: Maximum call stack size exceeded');
  });

  it('un mensaje de fallo largo se recorta (la clave no puede crecer sin límite)', () => {
    const clave = claveDeNuestroVeredicto({ tipo: 'fallo-interno', mensaje: `TypeError: ${'x'.repeat(500)}` });
    expect(clave.length).toBeLessThanOrEqual('fallo-interno:'.length + 100);
  });
});
