// Tarea 1.38 (W-15 de la «Verificación acotada del lote 1 (1.37)»): `package java.miapp;` lo compila javac, pero el JDK real no ejecuta nada que esté dentro de `java`: el lanzador se detiene con
// `java.lang.SecurityException: Prohibited package name: java.miapp` (`ClassLoader.preDefineClass`: el nombre de la CLASE empieza con `java.`) antes de buscar `main` o de leer una línea. El motor
// daba `ok`, el visualizador ejecutaba el `println` y mostraba una salida que Java nunca da.
//
// Esta guarda vigila, en `npm test` y SIN JDK, dos cosas con los goldens del oráculo:
//   1. `corpus/experimentos/paquetes-prohibidos/` (14 programas): los que el lanzador no arranca son un AVISO (`paquete-reservado-por-java`, nunca `ok`), un error del cuerpo que javac rechaza se informa
//      primero y con la línea de javac (como en NetBeans: primero el error de compilación, después el del lanzador) y los nombres que se parecen —`javax`, `jdk`, `sun`, `com.sun`, `Java`,
//      `javafoo`— siguen siendo `ok`, y el golden de cada uno corre y escribe «hola».
//   2. TODO el corpus: la regla `esPaqueteReservadoPorJava` (salvo los paquetes de módulos, ver abajo) coincide con lo que el lanzador real hizo en cada programa con paquete que javac compiló (en la 1.38
//      eran 39: 22 se negaron con la excepción, 2 no encontraron la clase y 15 corrieron; con los 15 programas compilados de `paquetes-de-modulos/` de la 1.39, 54), en las dos direcciones, y ninguno de los
//      que el lanzador se negó a arrancar termina en `ok`.
//
// Tarea 1.39 (W-16, la otra familia): los dos goldens `c3-paquete-interno-no-exportado-valido` (`jdk.internal.misc`) y `c3-paquete-sun-no-exportado-valido` (`sun.nio.ch`) también los compila javac y el
// lanzador tampoco los arranca, pero con OTRO mecanismo —`ClassNotFoundException`: el paquete existe en un módulo del JDK y el cargador no busca la clase en el classpath—, para 516 nombres de paquetes de
// módulos; los vigila `paquetes-de-modulos-del-corpus.test.ts` y la guarda de todo el corpus, `lanzador-del-corpus.test.ts`. Dos de esos 516 están DENTRO de `java` (`java.awt.peer`, `java.awt.dnd.peer`) y
// el lanzador real NO se niega con la `SecurityException` en ellos: el módulo gana y da `ClassNotFoundException`. Por eso el barrido de abajo dice «reservado por su nombre Y no es el de un módulo».
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import { esPaqueteInternoDelJdk, esPaqueteReservadoPorJava } from '../../src/motor/semantica/paquete-del-lanzador.ts';
import { guardaDeCorpusConTablas, leerGolden } from './guarda-de-corpus-con-tablas.ts';

const AVISO = 'paquete-reservado-por-java';

// javac rechaza el cuerpo: el aviso del lanzador no tapa su error, que sale con la línea de javac.
const ERRORES: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  ['w15-error-de-tipos-primero', 'tipos-incompatibles-en-asignacion'],
  ['w15-error-de-asignacion-primero', 'variable-posiblemente-no-asignada'],
];

const VALIDOS: ReadonlyArray<readonly [archivo: string, resultado: 'ok' | string]> = [
  // javac los compila y el lanzador real se detiene con «Prohibited package name»: aviso, nunca `ok`.
  ['w15-reservado-java-miapp', AVISO],
  ['w15-reservado-java-profundo', AVISO],
  ['w15-reservado-java-lang-aula', AVISO],
  ['w15-reservado-java-con-mayuscula', AVISO],
  ['w15-reservado-con-entrada', AVISO],
  ['w15-reservado-sin-main', AVISO],
  // se parecen a `java` y el lanzador los arranca (el golden de cada uno corre y escribe «hola»).
  ['w15-control-javax-miapp', 'ok'],
  ['w15-control-javafoo-aula', 'ok'],
  ['w15-control-jdk-miapp', 'ok'],
  ['w15-control-sun-miapp', 'ok'],
  ['w15-control-com-sun-miapp', 'ok'],
  ['w15-control-java-con-mayuscula-inicial', 'ok'],
];

const RUTA = 'corpus/experimentos/paquetes-prohibidos';

guardaDeCorpusConTablas({
  nombre: 'paquetes que el lanzador no arranca',
  ruta: RUTA,
  errores: ERRORES,
  avisos: [],
  validos: VALIDOS,
  piso: 14,
});

interface Ejecucion {
  readonly programa: string;
  readonly paquete: string;
  readonly fuente: string;
  readonly codigoDeSalida: number | null;
  readonly salida: string;
  readonly errores: string;
}

/** Cada programa del corpus con un `package` que javac compiló, con lo que el lanzador real hizo con él (los goldens del oráculo). */
function programasConPaqueteCompilado(): Ejecucion[] {
  const raiz = resolve('corpus');
  const resultado: Ejecucion[] = [];
  for (const relativa of readdirSync(raiz, { recursive: true }).map(String).sort()) {
    if (!relativa.endsWith('.oraculo.json')) continue;
    const base = join(raiz, relativa.slice(0, -'.oraculo.json'.length));
    const oraculo = JSON.parse(readFileSync(`${base}.oraculo.json`, 'utf-8')) as { paquete: string | null; compilo: boolean; codigoSalida: number | null };
    if (oraculo.paquete === null || !oraculo.compilo) continue;
    resultado.push({
      programa: relativa.slice(0, -'.oraculo.json'.length),
      paquete: oraculo.paquete,
      fuente: readFileSync(`${base}.java`, 'utf-8'),
      codigoDeSalida: oraculo.codigoSalida,
      salida: readFileSync(`${base}.salida`, 'utf-8'),
      errores: readFileSync(`${base}.errores`, 'utf-8'),
    });
  }
  return resultado;
}

const SE_NEGO = /java\.lang\.SecurityException: Prohibited package name: (\S+)/;

describe('el corpus entero — lo que el lanzador real hizo con cada programa con `package` que javac compiló (goldens del oráculo)', () => {
  const programas = programasConPaqueteCompilado();
  const queSeNegaron = programas.filter((programa) => SE_NEGO.test(programa.errores));

  it('el barrido encuentra los programas (nunca un barrido vacío): los hay que el lanzador arrancó y los hay que no', () => {
    expect(programas.length).toBeGreaterThanOrEqual(54);
    expect(queSeNegaron.length).toBeGreaterThanOrEqual(23);
    expect(programas.length - queSeNegaron.length).toBeGreaterThanOrEqual(31);
  });

  // Tarea 1.39: «reservado por su nombre» no basta. Si el paquete es además el de un módulo del JDK (`java.awt.peer`), el cargador de aplicaciones lo busca en su módulo y falla ANTES de definir la clase:
  // `ClassNotFoundException`, no `SecurityException`. La 1.38 dio el biconditional por bueno con 39 programas y ninguno era de esos dos nombres.
  const elMotorLoReserva = (paquete: string): boolean => esPaqueteReservadoPorJava(paquete) && !esPaqueteInternoDelJdk(paquete);

  it('el lanzador se negó con «Prohibited package name: <paquete>» SI Y SOLO SI el motor dice `esPaqueteReservadoPorJava(<paquete>)` y no es el de un módulo (`esPaqueteInternoDelJdk`) — en los dos sentidos, para cada programa', () => {
    const desacuerdos = programas
      .filter((programa) => (SE_NEGO.exec(programa.errores)?.[1] ?? null) !== (elMotorLoReserva(programa.paquete) ? programa.paquete : null))
      .map((programa) => `${programa.programa}: paquete «${programa.paquete}», el lanzador ${SE_NEGO.test(programa.errores) ? 'se negó' : 'arrancó'} y el motor ${elMotorLoReserva(programa.paquete) ? 'lo reserva' : 'no lo reserva'}`);
    expect(desacuerdos).toEqual([]);
  });

  it.each(queSeNegaron.map((programa) => [programa.programa, programa] as const))('%s: el lanzador se negó, así que `compilar()` nunca da `ok` (el aviso, o el error de una pasada anterior)', (_nombre, programa) => {
    const resultado = compilar(programa.fuente);
    expect(resultado.ok, `${programa.programa}: el compilador lo dio por bueno y el lanzador real no lo arranca`).toBe(false);
  });

  it('los controles de la carpeta nueva corrieron de verdad en el JDK real: código 0 y «hola» (no basta con que no se hayan negado)', () => {
    const controles = VALIDOS.filter(([, resultado]) => resultado === 'ok').map(([archivo]) => archivo);
    expect(controles).toHaveLength(6);
    for (const archivo of controles) {
      const programa = programas.find((candidato) => candidato.programa === `experimentos/paquetes-prohibidos/${archivo}`);
      expect(programa, archivo).toBeDefined();
      expect(programa!.codigoDeSalida, archivo).toBe(0);
      expect(programa!.salida, archivo).toBe('hola\n');
    }
  });

  it('los que el lanzador no arranca no escribieron nada: ni una línea del programa corrió (sin salida y con código 1), con el paquete exacto en el mensaje', () => {
    const reservados = VALIDOS.filter(([, resultado]) => resultado === AVISO).map(([archivo]) => archivo);
    expect(reservados).toHaveLength(6);
    for (const archivo of reservados) {
      const programa = programas.find((candidato) => candidato.programa === `experimentos/paquetes-prohibidos/${archivo}`);
      expect(programa, archivo).toBeDefined();
      expect(programa!.codigoDeSalida, archivo).toBe(1);
      expect(programa!.salida, archivo).toBe('');
      expect(SE_NEGO.exec(programa!.errores)?.[1], archivo).toBe(programa!.paquete);
    }
  });

  it('el golden de los errores del cuerpo es un rechazo de javac (no hay ejecución que mirar): el aviso del lanzador no le toca', () => {
    for (const [archivo] of ERRORES) expect(leerGolden(resolve(RUTA), archivo).compilo, archivo).toBe(false);
  });
});
