// Ayudas de la prueba DIFERENCIAL de ejecución (REQ-DIFF-003, C1, ADR 011): compila un programa del corpus, lo ejecuta con el motor con la entrada de su golden y lo compara BYTE A BYTE con lo que el
// JDK 17 real produjo: la salida estándar (`.salida`), la de error (`.errores`) y el código de salida (`.oraculo.json`: 0 si termina, 1 si una excepción lo detiene). Los goldens los generó el oráculo contra
// Temurin 17.0.18; aquí no hace falta JDK. Nunca un resultado que «parece correcto»: o es idéntico o es un fallo. Las usan `corpus-ejecucion.test.ts` (todo `corpus/**`) y `ejercicios-del-po.test.ts`
// (el ejercicio del PO, con sus salidas escritas a la vista).
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compilar } from '../../src/motor/index.ts';
import { crearEjecucion } from '../../src/motor/interprete/ejecucion.ts';
import type { Avance } from '../../src/motor/index.ts';
import type { Segmento } from '../../src/motor/vista.ts';

interface MetadatosDelOraculo {
  readonly compilo: boolean;
  readonly codigoSalida: number | null;
  readonly desenlace: 'normal' | 'excepcion' | 'error-compilacion' | 'limite-pasos';
}

export interface Resultado {
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

/** Compila `fuente` (el programa de `id`, una ruta relativa a la raíz) y lo compara con los goldens que tiene al lado. Si el motor no lo compila por no poder ejecutarlo, es `no-disponible`. */
export function compararConElGolden(id: string, fuente: string): Resultado {
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
