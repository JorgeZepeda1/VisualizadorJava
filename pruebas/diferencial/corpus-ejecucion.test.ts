// RED/GREEN de la tarea 2.19 con el ojo en la 2.20 (REQ-DIFF-003, C1, ADR 011): la prueba DIFERENCIAL de ejecución sobre TODO el corpus con goldens.
// Cada programa de `corpus/**` que javac compila (`"compilo": true`) y que el motor sabe ejecutar de punta a punta debe producir BYTE A BYTE lo mismo que
// el JDK 17 real: la salida estándar (`.salida`), la de error (`.errores`) y el código de salida (`.oraculo.json`: 0 si termina, 1 si una excepción lo detiene).
// Los goldens los generó el oráculo contra Temurin 17.0.18; aquí no hace falta JDK. Nunca un resultado que «parece correcto»: o es idéntico o es un fallo.
//
// Hito 1, parte C: la biblioteca está conectada (Scanner, Math, String, printf, `double`…), así que casi todo se ejecuta. Lo que no (`Math.pow`, un formato de `printf` sin medir, un segundo `Scanner`
// sobre `System.in`) debe salir como el aviso honesto `ejecucion-no-disponible` en la compilación, nunca con una salida inventada. Y los programas del currículo (`corpus/curso` y
// `corpus/experimentos/tipicos`, los 55 de clase) que están dentro del subconjunto U3–U7 corren TODOS completos e idénticos al JDK: los que no, son los que usan lo que el subconjunto deja fuera por
// diseño (métodos propios, clases, arreglos, tipos que no son los del currículo, herencia, `enum`, genéricos).
import { describe, expect, it } from 'vitest';
import { programasDelCorpusConVeredicto } from '../compilacion/corpus-con-veredicto.ts';
import { compararConElGolden, type Resultado } from './comparar-con-el-golden.ts';

const programas = programasDelCorpusConVeredicto().filter((programa) => programa.compilo);
const resultados: Resultado[] = [];

/** Los programas del currículo que usan lo que el subconjunto U3–U7 deja fuera A PROPÓSITO (REQ-SUB-007): por qué el visualizador no los ejecuta y avisa. */
const FUERA_DEL_SUBCONJUNTO: ReadonlyMap<string, string> = new Map([
  ['t05-metodos-y-recursion', 'métodos propios y recursión'],
  ['t06-clase-con-constructor-antes-de-main', 'una clase propia con constructor'],
  ['t07-objeto-de-su-propia-clase', 'un objeto de la propia clase (miembros de clase)'],
  ['t08-arreglo-de-notas', 'arreglos'],
  ['t13-tipos-fuera-del-subconjunto', 'tipos primitivos que el currículo no usa (byte, short, float)'],
  ['t14-herencia-e-interfaces', 'herencia e interfaces'],
  ['t15-enum-y-switch', 'enum'],
  ['t18-lista-con-genericos', 'colecciones y genéricos'],
]);

const delCurriculo = (id: string): boolean => id.startsWith('corpus/curso/') || id.startsWith('corpus/experimentos/tipicos/');
const nombreSinRuta = (id: string): string => id.slice(id.lastIndexOf('/') + 1, -'.java'.length);

describe('diferencial de ejecución: el motor contra los goldens del JDK 17 real (todo corpus/**)', () => {
  it('hay programas que javac compila (guarda contra un recorrido vacío)', () => {
    expect(programas.length).toBeGreaterThan(300);
  });

  it.each(programas.map((programa) => [programa.id, programa.fuente] as const))('%s: si el motor lo ejecuta, es idéntico al JDK; si no, es ejecucion-no-disponible', (id, fuente) => {
    const resultado = compararConElGolden(id, fuente);
    resultados.push(resultado);
    expect(resultado.diferencias.join('\n'), id).toBe('');
  });

  it('los 55 programas del currículo: todos los que están dentro del subconjunto corren completos e idénticos al JDK; los demás son los de lo que el subconjunto deja fuera por diseño', () => {
    const curriculo = resultados.filter((r) => delCurriculo(r.id));
    expect(curriculo).toHaveLength(55);
    const queCorren = curriculo.filter((r) => r.estado === 'ejecutado');
    const queNoCorren = curriculo.filter((r) => r.estado !== 'ejecutado').map((r) => nombreSinRuta(r.id));
    // Los que no corren son EXACTAMENTE los de la lista de lo que el subconjunto deja fuera: ni uno más (un hueco real de la biblioteca) ni uno menos (la lista quedó vieja).
    expect(queNoCorren.sort()).toEqual([...FUERA_DEL_SUBCONJUNTO.keys()].sort());
    expect(queCorren).toHaveLength(55 - FUERA_DEL_SUBCONJUNTO.size);
    console.log(`[diferencial] del currículo (curso + típicos): ${queCorren.length} de ${curriculo.length} corren completos e idénticos; fuera del subconjunto por diseño: ${queNoCorren.join(', ')}`);
  });

  it('cuenta cuántos de todo el corpus se ejecutan idénticos y que lo que no se ejecuta es un aviso honesto, nunca un fallo', () => {
    const ejecutados = resultados.filter((r) => r.estado === 'ejecutado');
    const noDisponibles = resultados.filter((r) => r.estado === 'no-disponible');
    const otros = resultados.filter((r) => r.estado === 'otro' && !delCurriculo(r.id));
    console.log(`[diferencial] ${ejecutados.length} programas ejecutados idénticos al JDK; ${noDisponibles.length} con ejecucion-no-disponible (${noDisponibles.map((r) => nombreSinRuta(r.id)).join(', ')}); ${otros.length} con otro aviso`);
    expect(ejecutados.length).toBeGreaterThanOrEqual(280);
  });
});
