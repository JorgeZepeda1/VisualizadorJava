// Cierre de la tarea 0.12 (rebanada vertical — motor mínimo, design.md §7.2). Compila y ejecuta el
// programa DORADO real de `corpus/curso/` (no el ejemplo ilustrativo de tasks.md: la clase se
// llama `MiPrograma` y el texto es "Hola, mundo") y compara byte a byte contra la salida que
// capturó el oráculo contra Temurin 17.0.18 real (tarea 0.6) — nunca un resultado inventado (D2).
// No regenera nada: reutiliza el golden ya verificado, sin tocarlo.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar, crearEjecucion, type ConfigEjecucion, type Segmento } from '../../src/motor/index.ts';

const RUTA_BASE = resolve('corpus/curso/u3-hola-mundo');
const fuente = readFileSync(`${RUTA_BASE}.java`, 'utf-8');
const salidaEsperada = readFileSync(`${RUTA_BASE}.salida`);

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

describe('diferencial: u3-hola-mundo (golden real del oráculo, sin JDK)', () => {
  it('produce un único Paso "impresion" con la salida exacta capturada de Temurin 17.0.18', () => {
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error('se esperaba que el golden compilara');

    const ejecucion = crearEjecucion(resultado.programa, configPorOmision());
    const avance = ejecucion.avanzar(100_000);

    expect(avance.estado).toBe('fin');
    expect(avance.pasos).toHaveLength(1);
    expect(avance.pasos[0].clase).toBe('impresion');

    const segmentos: Segmento[] = avance.pasos.flatMap((paso) => paso.salida ?? []);
    const textoSalida = segmentos
      .filter((segmento) => segmento.flujo === 'out')
      .map((segmento) => segmento.texto)
      .join('');

    expect(Buffer.from(textoSalida, 'utf-8')).toEqual(salidaEsperada);
  });
});
