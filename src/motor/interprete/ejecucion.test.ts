// RED de la tarea 0.12/0.13 (rebanada vertical): director de ejecución mínimo. El intérprete real
// con generadores por sentencia y lectura con reintento (ADR 005) llega en las tareas 2.17-2.19;
// aquí solo el contrato Ejecucion.avanzar/darEntrada/cerrarEntrada (design.md §1.3), que ese lote
// hereda sin romper la firma.
import { describe, expect, it } from 'vitest';
import { crearEjecucion, type ConfigEjecucion } from './ejecucion.ts';
import type { ProgramaCompilado } from '../ir/ir.ts';

function configPorOmision(): ConfigEjecucion {
  return {
    regional: 'es-MX',
    semilla: 0n,
    entradaPreparada: '',
    entradaInteractiva: false,
    limitePasos: 100_000,
    limiteCaracteres: 1_048_576,
  };
}

function programaDeUnaImpresion(texto: string): ProgramaCompilado {
  return { ir: { sentencias: [{ tipo: 'impresion', texto }] } };
}

describe('crearEjecucion', () => {
  it('avanzar() ejecuta la única sentencia y termina con un Paso "impresion"', () => {
    const ejecucion = crearEjecucion(programaDeUnaImpresion('Hola, mundo'), configPorOmision());
    const avance = ejecucion.avanzar(100_000);
    expect(avance.estado).toBe('fin');
    expect(avance.pasos).toHaveLength(1);
    expect(avance.pasos[0]).toMatchObject({
      clase: 'impresion',
      salida: [{ flujo: 'out', texto: 'Hola, mundo\n' }],
    });
    if (avance.estado === 'fin') expect(avance.fin).toEqual({ causa: 'terminado' });
  });

  it('produce un Paso por cada sentencia, en orden (triangulación con dos impresiones)', () => {
    const programa: ProgramaCompilado = {
      ir: {
        sentencias: [
          { tipo: 'impresion', texto: 'uno' },
          { tipo: 'impresion', texto: 'dos' },
        ],
      },
    };
    const ejecucion = crearEjecucion(programa, configPorOmision());
    const avance = ejecucion.avanzar(100_000);
    expect(avance.pasos.map((p) => p.salida?.[0]?.texto)).toEqual(['uno\n', 'dos\n']);
  });

  it('respeta maxPasos: se detiene a medio programa con estado "continua"', () => {
    const programa: ProgramaCompilado = {
      ir: {
        sentencias: [
          { tipo: 'impresion', texto: 'uno' },
          { tipo: 'impresion', texto: 'dos' },
        ],
      },
    };
    const ejecucion = crearEjecucion(programa, configPorOmision());
    const primerAvance = ejecucion.avanzar(1);
    expect(primerAvance.estado).toBe('continua');
    expect(primerAvance.pasos).toHaveLength(1);
    const segundoAvance = ejecucion.avanzar(1);
    expect(segundoAvance.estado).toBe('fin');
    expect(segundoAvance.pasos).toHaveLength(1);
  });

  it('tras terminar, avanzar() de nuevo devuelve fin sin pasos nuevos (idempotente)', () => {
    const ejecucion = crearEjecucion(programaDeUnaImpresion('x'), configPorOmision());
    ejecucion.avanzar(100_000);
    const otraVez = ejecucion.avanzar(100_000);
    expect(otraVez).toEqual({ estado: 'fin', pasos: [], fin: { causa: 'terminado' } });
  });
});
