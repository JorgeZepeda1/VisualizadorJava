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
import { esPaqueteReservadoPorJava, verificarPaqueteDelLanzador } from './paquete-del-lanzador.ts';

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
