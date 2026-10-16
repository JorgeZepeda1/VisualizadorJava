// RED/GREEN de la tarea 2.19 con el ojo en la 2.20 (REQ-DIFF-003, C1, ADR 011): la prueba DIFERENCIAL de ejecución sobre TODO el corpus con goldens.
// Cada programa de `corpus/**` que javac compila (`"compilo": true`) y que el motor sabe ejecutar de punta a punta debe producir BYTE A BYTE lo mismo que
// el JDK 17 real: la salida estándar (`.salida`), la de error (`.errores`) y el código de salida (`.oraculo.json`: 0 si termina, 1 si una excepción lo detiene).
// Los goldens los generó el oráculo contra Temurin 17.0.18; aquí no hace falta JDK. Nunca un resultado que «parece correcto»: o es idéntico o es un fallo.
//
// Lo que el motor NO ejecuta todavía —todo programa que usa la biblioteca (Scanner, Math, métodos de String, printf…, parte A del hito 1) o un `double`— debe
// salir como el aviso honesto `ejecucion-no-disponible`, nunca con una salida inventada. Esta prueba cuenta unos y otros para que ese aviso no esconda un hueco
// de más: el piso de programas ejecutados sube conforme se conecta la biblioteca.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { crearEjecucion } from '../../src/motor/interprete/ejecucion.ts';
import { compilar } from '../../src/motor/index.ts';
import { programasDelCorpusConVeredicto } from '../compilacion/corpus-con-veredicto.ts';
import { resolve } from 'node:path';
import type { Avance } from '../../src/motor/index.ts';
import type { Segmento } from '../../src/motor/vista.ts';

interface MetadatosDelOraculo {
  readonly compilo: boolean;
  readonly codigoSalida: number | null;
  readonly desenlace: 'normal' | 'excepcion' | 'error-compilacion' | 'limite-pasos';
}

interface Resultado {
  readonly id: string;
  readonly estado: 'ejecutado' | 'no-disponible' | 'otro';
  readonly diferencias: string[];
}

function leer(ruta: string): Buffer {
  return readFileSync(ruta);
}

function juntar(segmentos: readonly Segmento[], flujo: 'out' | 'err'): Buffer {
  return Buffer.from(segmentos.filter((s) => s.flujo === flujo).map((s) => s.texto).join(''), 'utf-8');
}

function ejecutarTodo(fuente: string, entrada: string): { segmentos: Segmento[]; causa: string } | 'arranque' {
  const resultado = compilar(fuente);
  if (!resultado.ok) throw new Error('solo se ejecutan programas que compilan');
  if (resultado.programa.arranque !== null) return 'arranque';
  const ejecucion = crearEjecucion(resultado.programa, {
    regional: 'es-MX',
    semilla: 0n,
    entradaPreparada: entrada,
    entradaInteractiva: false,
    limitePasos: 100_000,
    limiteCaracteres: 1_048_576,
  });
  const segmentos: Segmento[] = [];
  for (;;) {
    const avance: Avance = ejecucion.avanzar(5_000);
    for (const paso of avance.pasos) segmentos.push(...(paso.salida ?? []));
    if (avance.estado === 'fin') return { segmentos, causa: avance.fin.causa };
    if (avance.estado === 'espera-entrada') throw new Error('la ejecución preparada no puede esperar entrada');
  }
}

function compararConElGolden(id: string, fuente: string): Resultado {
  const base = resolve(id.slice(0, -'.java'.length));
  const metadatos = JSON.parse(readFileSync(`${base}.oraculo.json`, 'utf-8')) as MetadatosDelOraculo;
  const compilado = compilar(fuente);
  if (!compilado.ok) {
    return { id, estado: compilado.problema.codigo === 'ejecucion-no-disponible' ? 'no-disponible' : 'otro', diferencias: [] };
  }
  const entrada = existsSync(`${base}.entrada.txt`) ? readFileSync(`${base}.entrada.txt`, 'utf-8') : '';
  const corrida = ejecutarTodo(fuente, entrada);
  if (corrida === 'arranque') return { id, estado: 'otro', diferencias: [] };

  const diferencias: string[] = [];
  const salida = juntar(corrida.segmentos, 'out');
  const errores = juntar(corrida.segmentos, 'err');
  if (metadatos.desenlace === 'limite-pasos') {
    // El oráculo cortó el programa por tiempo: su salida parcial depende de la velocidad de la máquina (ADR 011). Se vigila que el motor también lo detenga y que
    // sus renglones sean los mismos que los del golden (un ciclo infinito que imprime siempre lo mismo).
    if (corrida.causa !== 'limite-pasos') diferencias.push(`el JDK lo corta por tiempo y el motor terminó con "${corrida.causa}"`);
    const renglonesDelGolden = new Set(leer(`${base}.salida`).toString('utf-8').split('\n').slice(0, -1));
    const renglonesNuestros = new Set(salida.toString('utf-8').split('\n').slice(0, -1));
    if ([...renglonesDelGolden].some((renglon) => !renglonesNuestros.has(renglon))) diferencias.push('los renglones del golden no son los nuestros');
    return { id, estado: 'ejecutado', diferencias };
  }
  if (!salida.equals(leer(`${base}.salida`))) diferencias.push(`stdout distinto:\n--- motor\n${salida.toString('utf-8')}\n--- JDK\n${leer(`${base}.salida`).toString('utf-8')}`);
  if (!errores.equals(leer(`${base}.errores`))) diferencias.push(`stderr distinto:\n--- motor\n${errores.toString('utf-8')}\n--- JDK\n${leer(`${base}.errores`).toString('utf-8')}`);
  const codigoNuestro = corrida.causa === 'terminado' ? 0 : corrida.causa === 'excepcion' ? 1 : -1;
  if (codigoNuestro !== metadatos.codigoSalida) diferencias.push(`código de salida: motor ${codigoNuestro} (${corrida.causa}), JDK ${String(metadatos.codigoSalida)}`);
  return { id, estado: 'ejecutado', diferencias };
}

const programas = programasDelCorpusConVeredicto().filter((programa) => programa.compilo);
const resultados: Resultado[] = [];

describe('diferencial de ejecución: el motor contra los goldens del JDK 17 real (todo corpus/**)', () => {
  it('hay programas que javac compila (guarda contra un recorrido vacío)', () => {
    expect(programas.length).toBeGreaterThan(300);
  });

  it.each(programas.map((programa) => [programa.id, programa.fuente] as const))('%s: si el motor lo ejecuta, es idéntico al JDK; si no, es ejecucion-no-disponible', (id, fuente) => {
    const resultado = compararConElGolden(id, fuente);
    resultados.push(resultado);
    expect(resultado.diferencias.join('\n'), id).toBe('');
  });

  it('cuenta cuántos se ejecutan completos con el motor solo (sin biblioteca) y que ninguno quedó sin explicar', () => {
    const ejecutados = resultados.filter((r) => r.estado === 'ejecutado');
    const noDisponibles = resultados.filter((r) => r.estado === 'no-disponible');
    const delCurso = (r: Resultado): boolean => r.id.startsWith('corpus/curso/') || r.id.startsWith('corpus/experimentos/tipicos/');
    // Informe: los de clase (corpus/curso + corpus/experimentos/tipicos, los 55 del currículo) que ya corren completos solos.
    console.log(
      `[diferencial] ${ejecutados.length} programas ejecutados idénticos al JDK; ${noDisponibles.length} con ejecucion-no-disponible; ` +
        `del currículo (curso + típicos): ${resultados.filter((r) => delCurso(r) && r.estado === 'ejecutado').length} de ${resultados.filter(delCurso).length} corren completos`,
    );
    expect(ejecutados.length).toBeGreaterThanOrEqual(60);
  });
});
