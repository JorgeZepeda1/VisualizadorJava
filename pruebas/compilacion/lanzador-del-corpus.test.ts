// Tarea 1.39 (W-16 de la tarea 1.38): la guarda PERMANENTE de la regla de cierre del lote 1 —«si no puedo revisarlo, nunca un resultado inventado»— sobre TODO el corpus, en `npm test` y SIN JDK.
//
// El hallazgo W-16: `package jdk.internal.misc;` y `package sun.nio.ch;` los compila javac (el paquete existe en un módulo del JDK, pero ese módulo no lo exporta) y el lanzador `java` NO arranca el
// programa: «no se ha encontrado o cargado la clase principal» / `ClassNotFoundException`. Los dos goldens (`c3-paquete-interno-no-exportado-valido` y `c3-paquete-sun-no-exportado-valido`)
// guardaban la falla real desde la tarea 1.36 sin que nadie la hubiera mirado, y `compilar()` los daba por `ok` con el `println` listo para ejecutarse. Las tareas 1.37 y 1.38 habían cerrado la misma
// familia con otros mecanismos (`java.lang.Shutdown`, `java.miapp`), cada una con una regla escrita a mano a partir de lo que se HABÍA medido. Esta guarda no depende de ninguna regla: lee lo que el
// lanzador real hizo con CADA programa del corpus (los goldens del oráculo, ADR 011) y exige que ninguno que el lanzador se negó a arrancar termine en `ok` listo para ejecutarse.
//
// Qué es «el lanzador falló antes de ejecutar nada». Los tres datos que guarda el golden —javac compiló, el código de salida es 1, el desenlace es una excepción— no bastan: un programa que se
// desborda la pila en su primera instrucción también sale con código 1 y sin escribir nada (`StackOverflowError`), y ése SÍ se ejecutó. Lo que distingue al lanzador es que ninguna línea de la traza
// (`.errores`) es del programa: sus marcos son siempre `(Archivo.java:N)` con el nombre del archivo que compiló el oráculo (`nombreArchivo`), y los del propio JDK son `(ClassLoader.java:N)`,
// `(LauncherHelper.java:N)`…; el mensaje del lanzador (`Error: no se ha encontrado…`, `Error: A JNI error has occurred…`) no trae ninguno.
//
// La exención explícita: `ok` con `programa.arranque !== null`. Es el camino de DISEÑO de un `main` que el lanzador no encuentra o no puede llamar (sin `static`, sin `public`, con otra firma): `compilar()`
// devuelve el programa y le anota el mensaje real del lanzador, la pantalla lo muestra como lo muestra NetBeans y no se ejecuta ninguna instrucción (design.md §2.2). Lo que NO puede pasar es `ok` con
// `arranque === null`: eso es «ejecuta este programa» y el JDK real no lo ejecutó.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';

interface ProgramaDelCorpus {
  /** La ruta del programa dentro de `corpus/`, sin extensión (`experimentos/paquetes-prohibidos/w15-reservado-java-miapp`). */
  readonly programa: string;
  readonly fuente: string;
  readonly nombreArchivo: string;
  readonly compilo: boolean;
  readonly codigoSalida: number | null;
  readonly desenlace: string;
  readonly salida: string;
  readonly errores: string;
}

/** Cada programa del corpus con lo que el JDK real hizo con él: los goldens del oráculo (`.oraculo.json`, `.salida`, `.errores`). */
function programasDelCorpus(): ProgramaDelCorpus[] {
  const raiz = resolve('corpus');
  const programas: ProgramaDelCorpus[] = [];
  for (const relativa of readdirSync(raiz, { recursive: true }).map(String).sort()) {
    if (!relativa.endsWith('.oraculo.json')) continue;
    const base = join(raiz, relativa.slice(0, -'.oraculo.json'.length));
    const golden = JSON.parse(readFileSync(`${base}.oraculo.json`, 'utf-8')) as Pick<ProgramaDelCorpus, 'nombreArchivo' | 'compilo' | 'codigoSalida' | 'desenlace'>;
    programas.push({
      programa: relativa.slice(0, -'.oraculo.json'.length),
      fuente: readFileSync(`${base}.java`, 'utf-8'),
      nombreArchivo: golden.nombreArchivo,
      compilo: golden.compilo,
      codigoSalida: golden.codigoSalida,
      desenlace: golden.desenlace,
      salida: readFileSync(`${base}.salida`, 'utf-8'),
      errores: readFileSync(`${base}.errores`, 'utf-8'),
    });
  }
  return programas;
}

/** Pura: ¿javac compiló el programa y el lanzador real se detuvo antes de ejecutar una sola instrucción suya? (ver la cabecera: ninguna línea de la traza es del programa). */
function elLanzadorFalloAntesDeEjecutar(programa: ProgramaDelCorpus): boolean {
  return (
    programa.compilo &&
    programa.codigoSalida === 1 &&
    programa.desenlace === 'excepcion' &&
    programa.salida === '' &&
    !programa.errores.includes(`(${programa.nombreArchivo}:`)
  );
}

const SE_NEGO_POR_EL_PAQUETE = /java\.lang\.SecurityException: Prohibited package name/;
const NO_ENCONTRO_LA_CLASE = /java\.lang\.ClassNotFoundException/;
const NO_PUDO_LLAMAR_A_MAIN = /el método principal no es static|no se ha encontrado el método principal/;

// El criterio es lo que hace que la guarda vigile algo: se prueba solo, con goldens SINTÉTICOS, para que cada una de sus condiciones tenga un caso que la ejerza aunque ningún programa del corpus lo haga
// (el sabotaje que le quitó «sin salida» sobrevivía: ningún programa del corpus escribe algo, no tiene marcos propios en la traza y sale con código 1).
describe('elLanzadorFalloAntesDeEjecutar — cada condición del criterio importa (tarea 1.39)', () => {
  const lanzador: ProgramaDelCorpus = {
    programa: 'sintetico/lanzador',
    fuente: '',
    nombreArchivo: 'Saludo.java',
    compilo: true,
    codigoSalida: 1,
    desenlace: 'excepcion',
    salida: '',
    errores: 'Error: no se ha encontrado o cargado la clase principal jdk.internal.misc.Saludo\nCausado por: java.lang.ClassNotFoundException: jdk.internal.misc.Saludo\n',
  };

  it('javac compiló, código 1, excepción, nada escrito y ninguna línea de la traza es del programa: el lanzador falló antes de ejecutar', () => {
    expect(elLanzadorFalloAntesDeEjecutar(lanzador)).toBe(true);
  });

  it.each([
    ['javac no compiló (no hay lanzador que mirar)', { compilo: false, codigoSalida: null, desenlace: 'error-compilacion' }],
    ['el programa terminó bien (código 0)', { codigoSalida: 0, desenlace: 'normal' }],
    ['el desenlace no es una excepción (el límite de pasos)', { desenlace: 'limite-pasos' }],
    ['el programa escribió algo y salió con código 1 (`System.exit(1)`): ejecutó instrucciones suyas', { salida: 'Error en los datos\n', errores: '' }],
    ['la traza trae un marco del propio programa (`Saludo.java:5`): lo ejecutó y falló adentro', { errores: 'Exception in thread "main" java.lang.StackOverflowError\n\tat Saludo.f(Saludo.java:5)\n' }],
  ])('NO es «el lanzador falló antes de ejecutar» cuando %s', (_cual, cambios) => {
    expect(elLanzadorFalloAntesDeEjecutar({ ...lanzador, ...cambios })).toBe(false);
  });
});

describe('el corpus entero — si el lanzador real no arrancó el programa, `compilar()` no lo da por bueno (tarea 1.39, W-16)', () => {
  const programas = programasDelCorpus();
  const queElLanzadorNoArranco = programas.filter(elLanzadorFalloAntesDeEjecutar);

  it('el barrido encuentra los programas (nunca un barrido vacío) y de cada familia de falla del lanzador: el paquete prohibido, la clase que no se carga y el `main` que no se puede llamar', () => {
    expect(programas.length).toBeGreaterThanOrEqual(776);
    // 41 programas con el corpus de la 1.39: 23 con la `SecurityException`, 13 con la `ClassNotFoundException` (4 archivos sin clase, los 2 `c3` y los 7 que no cargan de `paquetes-de-modulos/`) y 5 con un `main`
    // que no se puede llamar. (Al escribir la guarda, antes de que la carpeta nueva existiera, eran 33: 22, 6 y 5.)
    expect(queElLanzadorNoArranco.length).toBeGreaterThanOrEqual(41);
    expect(queElLanzadorNoArranco.filter((programa) => SE_NEGO_POR_EL_PAQUETE.test(programa.errores)).length).toBeGreaterThanOrEqual(23);
    expect(queElLanzadorNoArranco.filter((programa) => NO_ENCONTRO_LA_CLASE.test(programa.errores)).length).toBeGreaterThanOrEqual(13);
    expect(queElLanzadorNoArranco.filter((programa) => NO_PUDO_LLAMAR_A_MAIN.test(programa.errores)).length).toBeGreaterThanOrEqual(5);
  });

  it('un programa que SÍ se ejecutó y falló (la primera instrucción desborda la pila) no cuenta como «el lanzador falló»: tiene un marco del propio programa en la traza', () => {
    const desbordes = programas.filter((programa) => programa.compilo && programa.codigoSalida === 1 && programa.salida === '' && programa.errores.includes('StackOverflowError'));
    expect(desbordes.length).toBeGreaterThanOrEqual(1);
    for (const programa of desbordes) expect(elLanzadorFalloAntesDeEjecutar(programa), programa.programa).toBe(false);
  });

  it.each(queElLanzadorNoArranco.map((programa) => [programa.programa, programa] as const))(
    '%s: el lanzador real no lo arrancó, así que `compilar()` no devuelve `ok` con `arranque` nulo (el programa no se ejecuta)',
    (_nombre, programa) => {
      const resultado = compilar(programa.fuente);
      const seEjecutaria = resultado.ok && resultado.programa.arranque === null;
      expect(seEjecutaria, `${programa.programa}: el JDK real no lo arrancó (${programa.errores.split('\n')[0]}) y el compilador lo da por bueno: se ejecutaría y mostraría una salida que Java nunca da`).toBe(false);
    },
  );

  it('la exención no tapa nada: todo programa que el lanzador no arrancó y que sale `ok` es un `main` que el lanzador no puede llamar (`arranque` con el mensaje real), nunca un paquete', () => {
    const exentos = queElLanzadorNoArranco.filter((programa) => {
      const resultado = compilar(programa.fuente);
      return resultado.ok && resultado.programa.arranque !== null;
    });
    expect(exentos.length).toBeGreaterThanOrEqual(1);
    for (const programa of exentos) {
      expect(programa.errores, programa.programa).toMatch(NO_PUDO_LLAMAR_A_MAIN);
      expect(programa.errores, programa.programa).not.toMatch(NO_ENCONTRO_LA_CLASE);
      expect(programa.errores, programa.programa).not.toMatch(SE_NEGO_POR_EL_PAQUETE);
    }
  });
});
