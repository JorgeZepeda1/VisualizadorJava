// RED/GREEN de la tarea 2.11 (REQ-BIB-008, REQ-DIFF-003): `Integer.parseInt` y `Double.parseDouble` contra `corpus/datos/parseo/parseo.tsv`, que generó el oráculo (JDK 17.0.18 real):
// valores aceptados (los `double` como bits exactos) y mensajes de `NumberFormatException` exactos, para entradas de aula, errores típicos y cadenas al azar.
import { describe, expect, it } from 'vitest';
import { ExcepcionJava } from '../../../src/motor/biblioteca/excepciones/excepcion-java.ts';
import { NoDisponibleEnEjecucion } from '../../../src/motor/biblioteca/no-disponible.ts';
import { Double, Integer } from '../../../src/motor/biblioteca/texto/envoltorios.ts';
import { describirValorComoElOraculo, leerLineasDeAnalisis } from './conjuntos.ts';

describe('parseInt y parseDouble contra el JDK 17 real (corpus/datos/parseo)', () => {
  const lineas = leerLineasDeAnalisis('parseo', 'parseo.tsv');

  it('el conjunto trae miles de casos de las dos operaciones', () => {
    expect(lineas.filter((l) => l.operacion === 'parseInt').length).toBeGreaterThan(1500);
    expect(lineas.filter((l) => l.operacion === 'parseDouble').length).toBeGreaterThan(1500);
    expect(lineas.filter((l) => l.resultado.ok).length).toBeGreaterThan(300);
  });

  it('el 100 % coincide en valor y en mensaje; solo los literales hexadecimales de double son «No disponible»', () => {
    const fallos: string[] = [];
    let noDisponibles = 0;
    for (const { operacion, entrada, resultado } of lineas) {
      try {
        const valor = operacion === 'parseInt' ? Integer.parseInt(entrada) : Double.parseDouble(entrada);
        const obtenido = describirValorComoElOraculo(operacion, valor);
        if (!resultado.ok || obtenido !== resultado.texto) fallos.push(`${operacion}(${JSON.stringify(entrada)}): Java ${JSON.stringify(resultado)}, motor OK:${obtenido}`);
      } catch (error) {
        if (error instanceof NoDisponibleEnEjecucion) {
          noDisponibles += 1;
          if (!/^[+-]?0[xX]/.test(entrada.trim())) fallos.push(`${operacion}(${JSON.stringify(entrada)}): «No disponible» inesperado (${error.motivo})`);
        } else if (error instanceof ExcepcionJava) {
          if (resultado.ok || resultado.clase !== error.clase || resultado.mensaje !== (error.mensaje ?? 'null')) {
            fallos.push(`${operacion}(${JSON.stringify(entrada)}): Java ${JSON.stringify(resultado)}, motor EX:${error.clase}:${error.mensaje}`);
          }
        } else {
          throw error;
        }
      }
    }
    expect(fallos.slice(0, 10)).toEqual([]);
    expect(noDisponibles).toBeGreaterThan(0);
  });
});
