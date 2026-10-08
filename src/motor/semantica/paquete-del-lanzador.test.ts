// RED de la tarea 1.38 (W-15 de la «Verificación acotada del lote 1 (1.37)») · el paquete que el LANZADOR de la JVM no arranca: ADR 004 (léxico+sintaxis → atribución → alcanzabilidad →
// asignación definitiva → límites del archivo → **paquete del lanzador** → arranque).
//
// `package java.miapp;` lo compila javac, pero el JDK real no ejecuta el programa: `java.lang.SecurityException: Prohibited package name: java.miapp` (`ClassLoader.preDefineClass` y
// `ClassFileParser::check_prohibited_package`: el NOMBRE DE CLASE empieza con `java.`). Medido con el `java` 17.0.18 real sobre 70 nombres (`herramientas/oraculo/generar-datos.test.ts` vuelve a medir 43
// en cada `npm run test:oraculo`): se niega con `java` y con TODO lo que está dentro (`java.a`, `java.lang.aula`, `java.util.Map`, `java.Aula`…); arranca con `javax.*`, `jdk.*`, `sun.*`, `com.sun.*`,
// `org.*`, `javafoo`, `Java.x` y `aula.java`. El motor lo daba por bueno (`ok`) y el lote 0 ejecutaba el `println`: un resultado inventado.
import { describe, expect, it } from 'vitest';
import { TablaDeLineas } from '../fuente/tabla-de-lineas.ts';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { SIN_LIMITES_DE_ANIDAMIENTO } from '../limites.ts';
import { analizarPrograma } from '../sintaxis/analizador-sintactico.ts';
import { PAQUETES_INTERNOS_DEL_JDK } from '../biblioteca/datos/paquetes-internos-del-jdk.generado.ts';
import { esPaqueteInternoDelJdk, esPaqueteReservadoPorJava, verificarPaqueteDelLanzador } from './paquete-del-lanzador.ts';

const CLASE = 'public class C { public static void main(String[] a) { } }';

/** Lo que reporta la pasada, con la LÍNEA de cada problema: `[]` si no encuentra nada. */
function problemasDe(fuente: string) {
  const tabla = new TablaDeLineas(fuente);
  return verificarPaqueteDelLanzador(analizarPrograma(tokenizar(fuente), SIN_LIMITES_DE_ANIDAMIENTO)).map((problema) => ({
    codigo: problema.codigo,
    categoria: problema.categoria,
    datos: problema.datos,
    linea: tabla.ubicar(problema.rango.inicio).linea,
  }));
}

describe('esPaqueteReservadoPorJava — `java` y todo lo que está dentro de `java` (lo que el lanzador real se niega a arrancar)', () => {
  it.each([
    'java',
    'java.a',
    'java.miapp',
    'java.aula.u3.ejercicio',
    'java.lang.aula',
    'java.util.aula',
    'java.util.Map',
    'java.lang.Strin',
    'java.Aula',
    'java.utils',
    'java.sqrt',
  ])('«%s» es reservado', (nombre) => {
    expect(esPaqueteReservadoPorJava(nombre)).toBe(true);
  });

  it.each([
    'javax',
    'javax.miapp',
    'javax.swing.JFrame',
    'javafoo',
    'javafoo.aula',
    'javaa',
    'java1',
    'java_',
    'Java',
    'Java.miapp',
    'JAVA.x',
    'aula.java',
    'mi.java.util',
    'jdk.miapp',
    'sun.miapp',
    'com.sun.miapp',
    'org.w3c.miapp',
    'miproyecto',
    'com.escuela.u5',
  ])('«%s» no es reservado: el lanzador lo arranca', (nombre) => {
    expect(esPaqueteReservadoPorJava(nombre)).toBe(false);
  });
});

describe('verificarPaqueteDelLanzador — un `package` dentro de `java` es un aviso honesto, nunca «ok»', () => {
  it('«package java.miapp;» da UN aviso `paquete-reservado-por-java` (categoría no-disponible) con el nombre del paquete y la línea del `package`', () => {
    expect(problemasDe(`package java.miapp;\n${CLASE}`)).toEqual([
      { codigo: 'paquete-reservado-por-java', categoria: 'no-disponible', datos: { nombre: 'java.miapp' }, linea: 1 },
    ]);
  });

  it('triangulación: el paquete a secas («java») y una línea de `package` que no es la primera: el nombre y la línea cambian con ellos', () => {
    expect(problemasDe(`// aula\n\npackage java;\n${CLASE}`)).toEqual([{ codigo: 'paquete-reservado-por-java', categoria: 'no-disponible', datos: { nombre: 'java' }, linea: 3 }]);
  });

  it('el rango cubre la declaración entera (de `package` al `;`), para que la línea sea la del `package`', () => {
    const fuente = '// aula\n\npackage java.util.aula;\npublic class C { public static void main(String[] a) { } }';
    const programa = analizarPrograma(tokenizar(fuente), SIN_LIMITES_DE_ANIDAMIENTO);
    expect(verificarPaqueteDelLanzador(programa)[0]!.rango).toEqual({ inicio: fuente.indexOf('package'), fin: fuente.indexOf(';') + 1 });
  });

  it('el cuerpo del programa no cambia nada: una clase sin `main` también tiene el aviso (el lanzador falla al cargar la clase, antes de buscar `main`)', () => {
    expect(problemasDe('package java.miapp;\npublic class C { }').map((p) => p.codigo)).toEqual(['paquete-reservado-por-java']);
  });

  it.each([
    ['con comentarios y espacios dentro', 'java /* uno */ . miapp'],
    ['partido en dos líneas', 'java\n    .miapp'],
    ['con un espacio de ancho cero dentro de `java` (javac lo salta)', 'ja​va.miapp'],
    ['con un guion blando antes del punto', 'java­.miapp'],
  ])('el nombre se lee como lo lee javac, así que sigue reservado: %s', (_cual, escrito) => {
    expect(problemasDe(`package ${escrito};\n${CLASE}`)).toMatchObject([{ codigo: 'paquete-reservado-por-java', datos: { nombre: 'java.miapp' } }]);
  });

  it.each(['javax.miapp', 'javafoo.aula', 'Java.miapp', 'aula.java', 'jdk.miapp', 'sun.miapp', 'com.sun.miapp', 'miproyecto', 'com.escuela.u5'])(
    'control: «package %s;» lo arranca el lanzador y no da ningún aviso',
    (nombre) => {
      // Con un reservado a la vista (el caso de arriba) la pasada SÍ habla: aquí calla porque el nombre no está reservado, no porque no corra.
      expect(problemasDe('package java.miapp;\n' + CLASE)).toHaveLength(1);
      expect(problemasDe(`package ${nombre};\n${CLASE}`)).toEqual([]);
    },
  );

  it('un programa SIN `package` no da nada', () => {
    expect(problemasDe(CLASE)).toEqual([]);
  });
});

// RED de la tarea 1.39 (W-16 de la tarea 1.38) · el paquete de un módulo del JDK que javac COMPILA y el lanzador no carga.
//
// `package jdk.internal.misc;` y `package sun.nio.ch;` los compila javac (el paquete existe en un módulo del JDK, pero ese módulo no lo exporta: no hay «package exists in another module») y el lanzador
// `java` no encuentra la clase: `java.lang.ClassNotFoundException` (el cargador de aplicaciones busca el paquete en su módulo y no mira el classpath). La lista sale del oráculo
// (`PAQUETES_INTERNOS_DEL_JDK`, `GenerarPaquetesDeModulos.java`: 516 de los 871 paquetes de los módulos del sistema del JDK 17.0.18) y solo cuenta el nombre EXACTO: `jdk.internal.misc.aula` sí arranca. El
// motor lo daba por bueno (`ok`) y el lote 0 ejecutaba el `println`, un resultado inventado. Dos de esos 516 están dentro de `java` (`java.awt.peer`, `java.awt.dnd.peer`): el módulo gana, el lanzador da
// `ClassNotFoundException` y no la `SecurityException` de la 1.38, así que el aviso de esos dos es el nuevo.
describe('esPaqueteInternoDelJdk — el nombre EXACTO de un paquete de un módulo del JDK que javac compila y el lanzador no carga', () => {
  it.each([
    'apple.laf',
    'com.apple.eawt',
    'com.sun.crypto.provider',
    'java.awt.dnd.peer',
    'java.awt.peer',
    'javax.swing.plaf.metal.icons',
    'jdk.internal',
    'jdk.internal.misc',
    'org.jcp.xml.dsig.internal.dom',
    'sun.nio',
    'sun.nio.ch',
    'sun.security.provider',
  ])('«%s» no se carga', (nombre) => {
    expect(esPaqueteInternoDelJdk(nombre)).toBe(true);
  });

  it.each([
    ['jdk.internal.misc.aula', 'un subpaquete de uno que no carga SÍ arranca (el lanzador real escribe «hola»)'],
    ['sun.nio.ch.aula', 'ídem'],
    ['com.sun.crypto.provider.aula', 'ídem'],
    ['com.sun.crypto', 'el paquete de arriba de `com.sun.crypto.provider` no es un paquete de módulo: solo cuenta el nombre exacto'],
    ['org.jcp.xml.dsig', 'ídem (el de arriba de `org.jcp.xml.dsig.internal`)'],
    ['sun', 'un solo segmento'],
    ['com.sun', 'un prefijo'],
    ['jdk.incubator.vector', 'está en un módulo que ni siquiera está en el arranque: el lanzador lo arranca'],
    ['sun.jvm.hotspot.debugger', 'ídem (el módulo de las herramientas no está en el arranque)'],
    ['java.util', 'el JDK lo exporta: javac lo rechaza (el error `paquete-del-jdk`), no es de este aviso'],
    ['javax.swing', 'ídem'],
    ['miproyecto', 'un nombre propio'],
    ['javax.miapp', 'un nombre propio'],
    ['Jdk.internal.misc', 'las mayúsculas cuentan'],
    ['jdk.internal.Misc', 'las mayúsculas cuentan'],
    ['', 'el vacío'],
    ['constructor', 'un nombre del prototipo de Object: la tabla no tiene prototipo'],
    ['__proto__', 'ídem'],
    ['toString', 'ídem'],
  ])('«%s» no es de esta lista: %s', (nombre) => {
    expect(esPaqueteInternoDelJdk(nombre)).toBe(false);
  });

  it('la lista generada trae cientos de nombres, sin vacíos ni repetidos, y cada uno cuenta', () => {
    const nombres = PAQUETES_INTERNOS_DEL_JDK.split(',');
    expect(nombres.length).toBeGreaterThan(400);
    expect(nombres.filter((nombre) => nombre === '')).toEqual([]);
    expect(new Set(nombres).size).toBe(nombres.length);
    expect(nombres.filter((nombre) => !esPaqueteInternoDelJdk(nombre))).toEqual([]);
  });
});

describe('verificarPaqueteDelLanzador — un `package` de un módulo del JDK que el lanzador no carga es un aviso honesto, nunca «ok» (tarea 1.39, W-16)', () => {
  it('«package jdk.internal.misc;» da UN aviso `paquete-interno-del-jdk` (categoría no-disponible) con el nombre del paquete y la línea del `package`', () => {
    expect(problemasDe(`package jdk.internal.misc;\n${CLASE}`)).toEqual([
      { codigo: 'paquete-interno-del-jdk', categoria: 'no-disponible', datos: { nombre: 'jdk.internal.misc' }, linea: 1 },
    ]);
  });

  it('triangulación: otro paquete y una línea de `package` que no es la primera: el nombre y la línea cambian con ellos', () => {
    expect(problemasDe(`// aula\n\npackage sun.nio.ch;\n${CLASE}`)).toEqual([{ codigo: 'paquete-interno-del-jdk', categoria: 'no-disponible', datos: { nombre: 'sun.nio.ch' }, linea: 3 }]);
  });

  it('el rango cubre la declaración entera (de `package` al `;`), para que la línea sea la del `package`', () => {
    const fuente = '// aula\n\npackage com.sun.crypto.provider;\npublic class C { public static void main(String[] a) { } }';
    const programa = analizarPrograma(tokenizar(fuente), SIN_LIMITES_DE_ANIDAMIENTO);
    expect(verificarPaqueteDelLanzador(programa)[0]!.rango).toEqual({ inicio: fuente.indexOf('package'), fin: fuente.indexOf(';') + 1 });
  });

  it('el cuerpo del programa no cambia nada: una clase sin `main` también tiene el aviso (el lanzador no encuentra la clase, antes de buscar `main`)', () => {
    expect(problemasDe('package sun.nio.ch;\npublic class C { }').map((p) => p.codigo)).toEqual(['paquete-interno-del-jdk']);
  });

  it('un nombre de `java` que además es un paquete de módulo (`java.awt.peer`): el módulo gana, el lanzador da `ClassNotFoundException` y no «Prohibited package name» — el aviso es el nuevo', () => {
    expect(esPaqueteReservadoPorJava('java.awt.peer')).toBe(true); // por su nombre sí está dentro de `java`…
    expect(problemasDe(`package java.awt.peer;\n${CLASE}`)).toMatchObject([{ codigo: 'paquete-interno-del-jdk', datos: { nombre: 'java.awt.peer' } }]);
    expect(problemasDe(`package java.awt.dnd.peer;\n${CLASE}`)).toMatchObject([{ codigo: 'paquete-interno-del-jdk', datos: { nombre: 'java.awt.dnd.peer' } }]);
  });

  it('…pero un subpaquete suyo (`java.awt.peer.aula`) no es un paquete de módulo: el lanzador sí se niega con la `SecurityException`, y el aviso es el de la 1.38', () => {
    expect(problemasDe(`package java.awt.peer.aula;\n${CLASE}`)).toMatchObject([{ codigo: 'paquete-reservado-por-java', datos: { nombre: 'java.awt.peer.aula' } }]);
  });

  it.each(['jdk.internal.misc.aula', 'sun.nio.ch.aula', 'com.sun.crypto.provider.aula', 'com.sun.crypto', 'jdk.incubator.vector', 'sun.jvm.hotspot.debugger'])(
    'control: «package %s;» lo arranca el lanzador y no da ningún aviso (un subpaquete, el de arriba que no es de módulo o un módulo fuera del arranque)',
    (nombre) => {
      // Con un paquete de módulo a la vista (el caso de arriba) la pasada SÍ habla: aquí calla porque el nombre no es el exacto de uno, no porque no corra.
      expect(problemasDe('package jdk.internal.misc;\n' + CLASE)).toHaveLength(1);
      expect(problemasDe(`package ${nombre};\n${CLASE}`)).toEqual([]);
    },
  );

  it.each([
    ['con comentarios y espacios dentro', 'jdk /* uno */ . internal . misc'],
    ['partido en dos líneas', 'jdk.internal\n    .misc'],
    ['con un espacio de ancho cero dentro de `jdk` (javac lo salta)', 'jd​k.internal.misc'],
  ])('el nombre se lee como lo lee javac, así que sigue siendo el de un paquete de módulo: %s', (_cual, escrito) => {
    expect(problemasDe(`package ${escrito};\n${CLASE}`)).toMatchObject([{ codigo: 'paquete-interno-del-jdk', datos: { nombre: 'jdk.internal.misc' } }]);
  });
});
