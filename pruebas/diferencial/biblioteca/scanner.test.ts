// RED/GREEN de la tarea 2.12 (REQ-BIB-009, REQ-BIB-010, REQ-DIFF-003): `Scanner` contra el JDK 17 REAL, en las dos regiones. `tokens-<región>.tsv`: una operación sobre un `Scanner` nuevo
// del texto (miles de casos de aula, de error típico y al azar). `secuencias-<región>.tsv`: varias operaciones sobre UN MISMO `Scanner` (el estado entre operaciones: qué consume cada
// una, qué deja el `InputMismatchException`, `nextLine` tras `nextInt`…). El motor se compara valor por valor (los `double` como bits) y excepción por excepción (clase y mensaje).
import { describe, expect, it } from 'vitest';
import { ExcepcionJava } from '../../../src/motor/biblioteca/excepciones/excepcion-java.ts';
import { EntradaDelPrograma } from '../../../src/motor/biblioteca/entrada/entrada-del-programa.ts';
import { ScannerJava } from '../../../src/motor/biblioteca/entrada/scanner.ts';
import { NoDisponibleEnEjecucion } from '../../../src/motor/biblioteca/no-disponible.ts';
import { type Regional } from '../../../src/motor/biblioteca/formato/regional.ts';
import { bitsAHex, bitsDeDouble } from '../../../herramientas/oraculo/azar-determinista.ts';
import { leerLineasDeAnalisis, leerLineasDeSecuencia, type ResultadoDelOraculo } from './conjuntos.ts';

const REGIONALES: readonly Regional[] = ['es-MX', 'es-ES'];

/** Ejecuta una operación y la describe como la sonda del oráculo: `OK:valor`, `EX:clase:mensaje` ("null" si no hay mensaje) o `ND` (no disponible). */
function ejecutar(scanner: ScannerJava, operacion: string): string {
  try {
    switch (operacion) {
      case 'nextInt':
        return `OK:${scanner.nextInt()}`;
      case 'nextDouble':
        return `OK:${bitsAHex(bitsDeDouble(scanner.nextDouble()))}`;
      case 'nextBoolean':
        return `OK:${scanner.nextBoolean()}`;
      case 'next':
        return `OK:${scanner.next()}`;
      case 'nextLine':
        return `OK:${scanner.nextLine()}`;
      case 'hasNext':
        return `OK:${scanner.hasNext()}`;
      case 'hasNextInt':
        return `OK:${scanner.hasNextInt()}`;
      case 'hasNextDouble':
        return `OK:${scanner.hasNextDouble()}`;
      case 'hasNextLine':
        return `OK:${scanner.hasNextLine()}`;
      case 'close':
        scanner.close();
        return 'OK:cerrado';
      default:
        throw new Error(`operación desconocida: ${operacion}`);
    }
  } catch (error) {
    if (error instanceof ExcepcionJava) return `EX:${error.clase}:${error.mensaje ?? 'null'}`;
    if (error instanceof NoDisponibleEnEjecucion) return 'ND';
    throw error;
  }
}

function describirOraculo(resultado: ResultadoDelOraculo): string {
  return resultado.ok ? `OK:${resultado.texto}` : `EX:${resultado.clase}:${resultado.mensaje}`;
}

function nuevoScannerConEntradaCompleta(regional: Regional, texto: string): ScannerJava {
  const entrada = new EntradaDelPrograma();
  entrada.agregar(texto);
  entrada.cerrar();
  return new ScannerJava(regional, entrada);
}

for (const regional of REGIONALES) {
  describe(`Scanner contra el JDK 17 real — ${regional}`, () => {
    it('una operación sobre un Scanner nuevo: el 100 % de los casos de token coincide', () => {
      const lineas = leerLineasDeAnalisis('scanner', `tokens-${regional}.tsv`);
      expect(lineas.length).toBeGreaterThan(8000);
      const fallos: string[] = [];
      let noDisponibles = 0;
      for (const { operacion, entrada, resultado } of lineas) {
        const obtenido = ejecutar(nuevoScannerConEntradaCompleta(regional, entrada), operacion);
        if (obtenido === 'ND') {
          noDisponibles += 1;
          if (!/0[xX]/.test(entrada)) fallos.push(`${operacion}(${JSON.stringify(entrada)}): «No disponible» inesperado`);
        } else if (obtenido !== describirOraculo(resultado)) {
          fallos.push(`${operacion}(${JSON.stringify(entrada)}): Java ${describirOraculo(resultado)}, motor ${obtenido}`);
        }
      }
      expect(fallos.slice(0, 10)).toEqual([]);
      expect(noDisponibles).toBeLessThan(40);
    });

    it('varias operaciones sobre un mismo Scanner: el 100 % de las secuencias coincide', () => {
      const secuencias = leerLineasDeSecuencia(`secuencias-${regional}.tsv`);
      expect(secuencias.length).toBe(2500);
      const fallos: string[] = [];
      for (const { texto, operaciones, resultados } of secuencias) {
        const scanner = nuevoScannerConEntradaCompleta(regional, texto);
        const obtenidos = operaciones.map((operacion) => ejecutar(scanner, operacion));
        const esperados = resultados.map(describirOraculo);
        if (obtenidos.includes('ND')) continue;
        if (obtenidos.join('|') !== esperados.join('|')) {
          fallos.push(`${JSON.stringify(texto)} ${operaciones.join(',')}:\n    Java  ${esperados.join(' | ')}\n    motor ${obtenidos.join(' | ')}`);
        }
      }
      expect(fallos.slice(0, 6)).toEqual([]);
    });
  });
}
