// Tarea 3.4 (REQ-EJEC-007, C10 en su parte de motor): el programa del currículo `u6-ciclo-infinito-demo` —un `while (contador <= 5)` al que le falta `contador = contador + 1`— se detiene por el
// límite de pasos y el visualizador sabe decir por qué: «`contador` siempre valió 1». Lo mismo con la entrada como la manda la interfaz (un solo `avanzar` grande o tandas de 2 000 pasos, como
// el trabajador). El JDK real no termina este programa (su golden dice `desenlace: "limite-pasos"`, cortado por tiempo): lo que se compara con él son los renglones que alcanzó a imprimir.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compilar, type Avance } from '../../src/motor/index.ts';
import { crearEjecucion } from '../../src/motor/interprete/ejecucion.ts';
import type { FinEjecucion, Paso } from '../../src/motor/vista.ts';
import { textoDelAvisoDeLimite } from '../../src/textos/es-MX/avisos-de-limite.ts';

const RUTA = 'corpus/curso/u6-ciclo-infinito-demo';
const CONFIG = { regional: 'es-MX', semilla: 0n, entradaPreparada: '', entradaInteractiva: false, limitePasos: 100_000, limiteCaracteres: 1_048_576 } as const;

function correrHastaElFin(pasosPorTanda: number): { pasos: Paso[]; fin: FinEjecucion } {
  const resultado = compilar(readFileSync(`${RUTA}.java`, 'utf-8'));
  if (!resultado.ok) throw new Error('el programa del currículo no compiló');
  const ejecucion = crearEjecucion(resultado.programa, CONFIG);
  const pasos: Paso[] = [];
  for (;;) {
    const avance: Avance = ejecucion.avanzar(pasosPorTanda);
    for (const paso of avance.pasos) pasos.push(paso);
    if (avance.estado === 'fin') return { pasos, fin: avance.fin };
    if (avance.estado === 'espera-entrada') throw new Error('este programa no lee entrada');
  }
}

describe('u6-ciclo-infinito-demo: se detiene por el límite de pasos, con su aviso de datos (tarea 3.4)', () => {
  for (const [nombre, tanda] of [['de un solo avanzar', 1_000_000], ['en tandas de 2 000 pasos (como el trabajador)', 2_000]] as const) {
    it(`${nombre}: 100 000 pasos y el paso «detenido», y «contador siempre valió 1»`, () => {
      const { pasos, fin } = correrHastaElFin(tanda);
      expect(pasos).toHaveLength(100_001);
      expect(pasos[100_000]).toMatchObject({ clase: 'detenido', linea: 5, fin });
      expect(fin).toEqual({
        causa: 'limite-pasos',
        diagnostico: { ciclo: 'while', linea: 5, condicion: 'contador <= 5', vueltas: 100, sinCambio: [{ nombre: 'contador', valor: '1' }] },
      });
      // C7 del panel 1: el único texto del final es la evidencia (el título del aviso ya dice que se detuvo), con lo que el motor midió: 100 vueltas, `contador` en 1, la condición siempre `true`.
      expect(textoDelAvisoDeLimite(fin)).toBe(
        'En las últimas 100 vueltas del `while` de la línea 5, `contador` siempre valió 1, así que `contador <= 5` siempre dio `true`. Mientras nada dentro del ciclo cambie `contador`, el ciclo no va a terminar.',
      );
    });
  }

  it('lo que imprimió antes de detenerse es lo que imprime el JDK real mientras lo dejan correr: el mismo renglón, «Vuelta número 1», una y otra vez', () => {
    const { pasos } = correrHastaElFin(1_000_000);
    const salida = pasos.flatMap((paso) => paso.salida ?? []).filter((segmento) => segmento.flujo === 'out').map((segmento) => segmento.texto).join('');
    const renglones = new Set(salida.split('\n').slice(0, -1));
    const delJdk = new Set(readFileSync(`${RUTA}.salida`, 'utf-8').split('\n').slice(0, -1));
    expect([...renglones]).toEqual(['Vuelta número 1']);
    expect([...delJdk]).toEqual(['Vuelta número 1']);
  });
});
