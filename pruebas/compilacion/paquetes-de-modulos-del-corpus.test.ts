// Tarea 1.39 (W-16 de la tarea 1.38): `package jdk.internal.misc;` y `package sun.nio.ch;` los compila javac —el paquete existe en un módulo del JDK que no lo exporta, así que no hay «package exists in another
// module»— y el lanzador real no los arranca: «no se ha encontrado o cargado la clase principal» (`ClassNotFoundException`). El motor los daba por `ok` y el visualizador ejecutaba el `println`, un resultado
// inventado; los dos goldens de la 1.36 (`c3-paquete-interno-no-exportado-valido` y `c3-paquete-sun-no-exportado-valido`) guardaban la falla real sin que nadie la mirara. La lista de los 516 paquetes que no
// cargan sale del oráculo (`GenerarPaquetesDeModulos.java`, el `java` 17.0.18 real).
//
// Esta guarda vigila, en `npm test` y SIN JDK, `corpus/experimentos/paquetes-de-modulos/` (17 programas con los goldens del oráculo): el veredicto y la LÍNEA de javac salen del `.errores` real de cada programa.
//   1. Los paquetes de módulos que el lanzador no carga son un AVISO (`paquete-interno-del-jdk`, nunca `ok`), también `java.awt.peer` y `java.awt.dnd.peer`: están dentro de `java`, pero el módulo gana y el
//      lanzador da `ClassNotFoundException`, no «Prohibited package name».
//   2. Un error del cuerpo que javac rechaza se informa primero y con la línea de javac (primero el error de compilación, después el del lanzador, como en NetBeans).
//   3. Solo cuenta el nombre EXACTO: un subpaquete (`jdk.internal.misc.aula`) y el paquete de arriba que no es de módulo (`com.sun.crypto`) SÍ arrancan; dentro de `java` el subpaquete (`java.awt.peer.aula`) es el
//      aviso de la 1.38. Y los controles —nombres propios y dos de los 129 paquetes de módulos que no están en el arranque— corren y escriben «hola».
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import { textoDelProblema } from '../../src/presentacion/texto-del-problema.ts';
import { guardaDeCorpusConTablas } from './guarda-de-corpus-con-tablas.ts';

const NO_CARGA = 'paquete-interno-del-jdk';
const RESERVADO = 'paquete-reservado-por-java';

const ERRORES: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  ['w16-error-de-tipos-primero', 'tipos-incompatibles-en-asignacion'],
  ['w16-error-de-asignacion-primero', 'variable-posiblemente-no-asignada'],
];

const VALIDOS: ReadonlyArray<readonly [archivo: string, resultado: 'ok' | string]> = [
  // javac los compila y el lanzador real no carga la clase: aviso, nunca `ok`.
  ['w16-no-carga-com-sun-crypto-provider', NO_CARGA],
  ['w16-no-carga-jdk-internal', NO_CARGA],
  ['w16-no-carga-javax-swing-plaf-metal-icons', NO_CARGA],
  ['w16-no-carga-java-awt-peer', NO_CARGA],
  ['w16-no-carga-java-awt-dnd-peer', NO_CARGA],
  ['w16-no-carga-con-entrada', NO_CARGA],
  ['w16-no-carga-sin-main', NO_CARGA],
  // un subpaquete de uno que no carga y el paquete de arriba que no es de módulo: el lanzador los arranca (el golden de cada uno corre y escribe «hola»); dentro de `java`, el subpaquete es el de la 1.38.
  ['w16-subpaquete-jdk-internal-misc-aula', 'ok'],
  ['w16-subpaquete-com-sun-crypto-provider-aula', 'ok'],
  ['w16-paquete-de-arriba-com-sun-crypto', 'ok'],
  ['w16-subpaquete-java-awt-peer-aula', RESERVADO],
  // nombres propios y dos de los 129 paquetes de módulos que no están en el arranque: el lanzador los arranca.
  ['w16-control-javax-miapp', 'ok'],
  ['w16-control-miproyecto', 'ok'],
  ['w16-control-jdk-incubator-vector', 'ok'],
  ['w16-control-sun-jvm-hotspot-debugger', 'ok'],
];

const RUTA = 'corpus/experimentos/paquetes-de-modulos';

guardaDeCorpusConTablas({
  nombre: 'paquetes de módulos que el lanzador no carga',
  ruta: RUTA,
  errores: ERRORES,
  avisos: [],
  validos: VALIDOS,
  piso: 17,
});

interface Ejecucion {
  readonly archivo: string;
  readonly paquete: string;
  readonly codigoDeSalida: number | null;
  readonly salida: string;
  readonly errores: string;
  readonly nombreArchivo: string;
}

/** Lo que el lanzador real hizo con cada programa de la carpeta (los goldens del oráculo). */
function ejecuciones(): Ejecucion[] {
  const carpeta = resolve(RUTA);
  return readdirSync(carpeta)
    .filter((nombre) => nombre.endsWith('.java'))
    .sort()
    .map((nombre) => {
      const base = join(carpeta, nombre.slice(0, -'.java'.length));
      const oraculo = JSON.parse(readFileSync(`${base}.oraculo.json`, 'utf-8')) as { paquete: string; codigoSalida: number | null; nombreArchivo: string };
      return {
        archivo: nombre.slice(0, -'.java'.length),
        paquete: oraculo.paquete,
        codigoDeSalida: oraculo.codigoSalida,
        salida: readFileSync(`${base}.salida`, 'utf-8'),
        errores: readFileSync(`${base}.errores`, 'utf-8'),
        nombreArchivo: oraculo.nombreArchivo,
      };
    });
}

const de = (archivos: ReadonlyArray<readonly [string, string]>, resultado: string): string[] => archivos.filter(([, esperado]) => esperado === resultado).map(([archivo]) => archivo);

describe('paquetes de módulos — lo que el lanzador real hizo con cada programa de la carpeta (goldens del oráculo)', () => {
  const todas = ejecuciones();
  const porArchivo = (archivo: string): Ejecucion => todas.find((ejecucion) => ejecucion.archivo === archivo)!;

  it('los que el lanzador no carga no escribieron nada: ni una línea del programa corrió (sin salida y con código 1), con la `ClassNotFoundException` de la clase EXACTA y sin `SecurityException`', () => {
    const noCargan = de(VALIDOS, NO_CARGA);
    expect(noCargan).toHaveLength(7);
    for (const archivo of noCargan) {
      const ejecucion = porArchivo(archivo);
      const clase = /^Error: no se ha encontrado o cargado la clase principal (\S+)$/m.exec(ejecucion.errores)?.[1];
      expect(clase, `${archivo}: el lanzador real no encontró la clase principal`).toBeDefined();
      expect(clase, archivo).toMatch(new RegExp(`^${ejecucion.paquete.replaceAll('.', '\\.')}\\.[A-Z]\\w*$`));
      expect(ejecucion.errores, archivo).toContain(`java.lang.ClassNotFoundException: ${clase}`);
      expect(ejecucion.errores, archivo).not.toMatch(/SecurityException/);
      expect(ejecucion.codigoDeSalida, archivo).toBe(1);
      expect(ejecucion.salida, archivo).toBe('');
    }
  });

  it('el texto del aviso cita el mensaje del lanzador tal como lo escribió el JDK real (está en el `.errores` de cada golden), y cambia con el paquete y con la línea', () => {
    for (const archivo of de(VALIDOS, NO_CARGA)) {
      const resultado = compilar(readFileSync(join(resolve(RUTA), `${archivo}.java`), 'utf-8'));
      if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó`);
      const texto = textoDelProblema(resultado.problema);
      const citado = /«(no se ha encontrado o cargado la clase principal)»/.exec(texto)?.[1];
      expect(citado, `${archivo}: el aviso cita el mensaje del lanzador`).toBeDefined();
      expect(porArchivo(archivo).errores, archivo).toContain(`Error: ${citado}`);
      expect(texto, archivo).toContain(`\`${porArchivo(archivo).paquete}\``);
    }
  });

  it('el lanzador se negó con la `SecurityException` en el subpaquete de `java` (`java.awt.peer.aula`) y arrancó los demás, sin escribir nada más que «hola»', () => {
    const reservado = porArchivo('w16-subpaquete-java-awt-peer-aula');
    expect(reservado.errores).toMatch(/java\.lang\.SecurityException: Prohibited package name: java\.awt\.peer\.aula/);
    expect(reservado.codigoDeSalida).toBe(1);
    expect(reservado.salida).toBe('');
    const arrancan = de(VALIDOS, 'ok');
    expect(arrancan).toHaveLength(7);
    for (const archivo of arrancan) {
      expect(porArchivo(archivo).codigoDeSalida, archivo).toBe(0);
      expect(porArchivo(archivo).salida, archivo).toBe('hola\n');
    }
  });

  it('el aviso de un nombre dentro de `java` que además es de un módulo NO es el de la 1.38: `java.awt.peer` no se detuvo con «Prohibited package name» (el módulo gana), su subpaquete sí', () => {
    for (const archivo of ['w16-no-carga-java-awt-peer', 'w16-no-carga-java-awt-dnd-peer']) {
      expect(porArchivo(archivo).errores, archivo).not.toMatch(/Prohibited package name/);
      expect(porArchivo(archivo).errores, archivo).toMatch(/ClassNotFoundException: java\.awt\.(dnd\.)?peer\.Saludo/);
    }
    expect(porArchivo('w16-subpaquete-java-awt-peer-aula').errores).toMatch(/Prohibited package name/);
  });
});
