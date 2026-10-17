// Tarea 3.1 (design.md §3.4, ADR 006), con los programas de VERDAD: la instantánea que la `Traza` reconstruye desde un punto de control es idéntica a reproducir los pasos desde el principio,
// en cada paso de cada programa del corpus que el motor ejecuta, al recorrerlos hacia adelante y hacia atrás. Los programas del corpus tienen pocos pasos, así que la traza usa un punto de
// control cada 7 (en vez de cada 256) para que todos crucen varios. (Esta prueba encontró que deshacer con `Cambio.anterior` no es exacto cuando dos variables comparten nombre — dos `for`
// seguidos con `int fila`, `e16-triangulos-y-tablas` —, y por eso la traza solo avanza desde el punto de control: ver `estado.ts`.)
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { programasDelCorpusConVeredicto } from '../compilacion/corpus-con-veredicto.ts';
import { compilar } from '../../src/motor/index.ts';
import { crearEjecucion } from '../../src/motor/interprete/ejecucion.ts';
import { instantaneaEn } from '../../src/motor/traza/estado.ts';
import { Traza } from '../../src/motor/traza/traza.ts';
import type { Paso } from '../../src/motor/vista.ts';

const PASOS_POR_PUNTO_DE_CONTROL_DE_LA_PRUEBA = 7;
/** Reproducir desde el principio cuesta O(n) por paso: en las trazas largas (un ciclo infinito llega a 100 000 pasos) se comparan unos cuantos pasos repartidos, no todos. */
const COMPARACIONES_EN_TRAZA_CORTA = 400;
const COMPARACIONES_EN_TRAZA_LARGA = 25;
const TRAZA_LARGA = 5_000;

function pasosDelPrograma(id: string, fuente: string): { pasos: readonly Paso[]; traza: Traza; vista: Parameters<Traza['instantaneaEn']>[1] } | null {
  const resultado = compilar(fuente);
  if (!resultado.ok || resultado.programa.arranque !== null) return null;
  const rutaEntrada = `${resolve(id).slice(0, -'.java'.length)}.entrada.txt`;
  const entradaPreparada = existsSync(rutaEntrada) ? readFileSync(rutaEntrada, 'utf-8') : '';
  const ejecucion = crearEjecucion(resultado.programa, {
    regional: 'es-MX',
    semilla: 0n,
    entradaPreparada,
    entradaInteractiva: false,
    limitePasos: 100_000,
    limiteCaracteres: 1_048_576,
  });
  const pasos: Paso[] = [];
  for (;;) {
    const avance = ejecucion.avanzar(5_000);
    for (const paso of avance.pasos) pasos.push(paso);
    if (avance.estado === 'fin') break;
    if (avance.estado === 'espera-entrada') throw new Error(`${id}: la ejecución preparada no puede esperar entrada`);
  }
  const traza = new Traza(PASOS_POR_PUNTO_DE_CONTROL_DE_LA_PRUEBA);
  traza.agregar(pasos);
  return { pasos, traza, vista: resultado.vista };
}

describe('la Traza con puntos de control da, en cada paso de cada programa del corpus, lo mismo que reproducir desde el principio', () => {
  const corridas = programasDelCorpusConVeredicto()
    .filter((programa) => programa.compilo)
    .flatMap((programa) => {
      const corrida = pasosDelPrograma(programa.id, programa.fuente);
      return corrida === null ? [] : [{ id: programa.id, ...corrida }];
    });

  it('recorre más de 250 programas ejecutables (guarda contra un recorrido vacío)', () => {
    expect(corridas.length).toBeGreaterThan(250);
  });

  it('la traza de la prueba guarda un punto de control cada 7 pasos (si no, los programas cortos nunca cruzarían uno)', () => {
    for (const { id, pasos, traza } of corridas) expect(traza.puntosDeControl, id).toBe(Math.floor(pasos.length / PASOS_POR_PUNTO_DE_CONTROL_DE_LA_PRUEBA));
  });

  it('en cada paso, adelante y atrás', () => {
    for (const { id, pasos, traza, vista } of corridas) {
      const salto = Math.max(1, Math.floor(pasos.length / (pasos.length > TRAZA_LARGA ? COMPARACIONES_EN_TRAZA_LARGA : COMPARACIONES_EN_TRAZA_CORTA)));
      const comparar = (n: number, sentido: string): void => {
        expect(traza.instantaneaEn(n, vista), `${id} ${sentido} n=${n}`).toEqual(instantaneaEn(pasos, vista, n));
      };
      for (let n = 0; n <= pasos.length; n += salto) comparar(n, 'adelante');
      comparar(pasos.length, 'al final');
      for (let n = pasos.length; n >= 0; n -= salto) comparar(n, 'atrás');
    }
  }, 60_000);
});
