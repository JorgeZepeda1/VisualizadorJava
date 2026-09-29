// Tarea 1.29 (agregada por el orquestador, D2/regla 5 de CLAUDE.md): «ningún programa que javac 17
// compila se presenta como error de compilación». Guarda PERMANENTE y de punta a punta: recorre
// TODOS los `.oraculo.json` de `corpus/**` cuyo veredicto REAL de javac es `"compilo": true` y
// exige que `compilar()` (el compilador completo, las 5 pasadas) dé `ok: true` o
// `categoria: 'no-disponible'` — nunca `error-compilacion`. Un programa que Java acepta y que el
// visualizador todavía no sabe mostrar es un AVISO honesto; un error de compilación falso le dice
// al alumno que su código está mal cuando no lo está (peor que no mostrar nada).
//
// No necesita el JDK: el veredicto de javac ya está guardado en cada `.oraculo.json` (dato del
// oráculo, ADR 010/011), así que corre en `npm test`. Por qué la 1.28 no lo vio: la guarda de
// textos (`problemas-en-pantalla.test.ts`) solo mira que cada problema SE PUEDA LEER, no que sea
// cierto; y los mutantes (C7) derivan de `corpus/curso`, cuyos 35 programas no disparaban ninguno
// de estos falsos rechazos (los 14 primeros vivían en `corpus/experimentos`).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';

const RAIZ = resolve('.');
const SUFIJO_ORACULO = '.oraculo.json';

function archivosOraculo(directorio: string): string[] {
  return readdirSync(directorio)
    .sort()
    .flatMap((nombre) => {
      const ruta = join(directorio, nombre);
      if (statSync(ruta).isDirectory()) return archivosOraculo(ruta);
      return nombre.endsWith(SUFIJO_ORACULO) ? [ruta] : [];
    });
}

interface ProgramaDelCorpus {
  readonly id: string;
  readonly fuente: string;
  readonly compilo: boolean;
}

function programasDelCorpus(): ProgramaDelCorpus[] {
  return archivosOraculo(resolve(RAIZ, 'corpus')).map((rutaOraculo) => {
    const { compilo } = JSON.parse(readFileSync(rutaOraculo, 'utf-8')) as { compilo: boolean };
    const rutaFuente = `${rutaOraculo.slice(0, -SUFIJO_ORACULO.length)}.java`;
    return { id: relative(RAIZ, rutaFuente), fuente: readFileSync(rutaFuente, 'utf-8'), compilo };
  });
}

const programas = programasDelCorpus();
const validos = programas.filter((programa) => programa.compilo);

describe('corpus real → ningún programa que javac 17 compila se presenta como error de compilación', () => {
  it('el barrido encuentra los programas que javac compiló Y los que rechazó (guarda contra un recorrido vacío o un filtro trivial)', () => {
    // 131 de `corpus/curso` + `corpus/experimentos/{numeros,texto}` y 20 de `corpus/experimentos/tipicos` (programas típicos de
    // U3–U7 con constructores, arreglos, herencia, enum, genéricos, constantes…), todos con el veredicto real de javac 17.
    expect(validos.length).toBeGreaterThanOrEqual(151);
    // Si el filtro `compilo` no separara nada, la prueba de abajo revisaría también los que javac
    // rechazó (que SÍ deben ser error) y no distinguiría un rechazo legítimo de uno falso.
    expect(programas.length - validos.length).toBeGreaterThanOrEqual(1);
  });

  it('cada programa con "compilo": true da ok o "no-disponible", nunca "error-compilacion"', () => {
    const rechazadosPorError = validos.flatMap(({ id, fuente }) => {
      const resultado = compilar(fuente);
      if (resultado.ok || resultado.problema.categoria === 'no-disponible') return [];
      const { codigo, linea, datos } = resultado.problema;
      return [`${id} → línea ${linea} [${codigo}] ${JSON.stringify(datos)}`];
    });
    expect(rechazadosPorError).toEqual([]);
  });
});
