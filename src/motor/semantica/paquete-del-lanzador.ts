// Paquete del lanzador (tarea 1.38, W-15 de la «Verificación acotada del lote 1 (1.37)») — ADR 004: léxico+sintaxis → atribución → alcanzabilidad → asignación definitiva → límites del archivo →
// **paquete del lanzador** → arranque. Es lo que rechaza el LANZADOR de la JVM (`java`), no `javac`: `package java.miapp;` compila limpio y el programa nunca llega a `main`.
//
// Medido con el `java` 17.0.18 real (y vuelto a medir en cada `npm run test:oraculo`, `herramientas/oraculo/generar-datos.test.ts`): el lanzador se niega, con
// `java.lang.SecurityException: Prohibited package name: <paquete>` (`ClassLoader.preDefineClass` y `ClassFileParser::check_prohibited_package`: un cargador que no es el de la plataforma no define una
// clase cuyo NOMBRE empieza con `java.`), con `java` a secas y con TODO lo que está dentro de `java` —`java.miapp`, `java.lang.aula`, `java.util.Map`, `java.Aula`…—, exista o no, salvo dos nombres que son de
// un módulo y fallan antes (más abajo, tarea 1.39). La excepción salta al cargar la clase, antes de buscar `main` y de leer una sola línea. Arrancan con normalidad `javax`, `jdk`, `sun`, `com.sun`, `org`, `Java.x` (las mayúsculas cuentan), `javafoo` y `aula.java`: solo importa el
// primer segmento, y completo. Los goldens del oráculo de todo el corpus con `package` lo confirman (`pruebas/compilacion/paquetes-prohibidos-del-corpus.test.ts`).
//
// Va DESPUÉS de las pasadas de javac, como el arranque: `compilador.ts` solo la corre cuando todas aceptaron el programa. Un error del cuerpo (tipos, alcanzabilidad, asignación definitiva, límites
// del archivo) se informa antes, con la línea de javac —igual que en NetBeans, que primero muestra el error de compilación y recién después el del lanzador—, y los errores del propio `package`
// (`java.util`, `java.lang.Shutdown`) ya los dio la atribución, porque ésos sí los rechaza javac. El resultado es un AVISO (`no-disponible`) y nunca un error de compilación: javac compila el
// programa. Gana a `ejecucion-no-disponible` y al «sin main» del arranque, porque el lanzador falla antes que ellos.
//
// Tarea 1.39 (W-16 de la tarea 1.38): la misma pasada cubre la segunda familia. Un paquete que ya existe en un módulo del JDK pero que javac compila porque el módulo no lo exporta (`jdk.internal.misc`,
// `sun.nio.ch`: 516 de los 871 paquetes de los módulos del sistema) tampoco lo arranca el lanzador, con otro mecanismo: `ClassNotFoundException` (el cargador de aplicaciones encuentra el paquete en su módulo y
// no busca la clase en el classpath). La lista sale del oráculo, nombre por nombre, con el `java` real (`GenerarPaquetesDeModulos.java`); solo cuenta el nombre EXACTO (`sun.nio.ch.aula` sí arranca). Es otro
// código y otro texto (`paquete-interno-del-jdk`): el nombre no está reservado, el paquete ya existe dentro de Java. Va primero porque dos de esos nombres están dentro de `java` (`java.awt.peer`): ahí manda el módulo.
import { PAQUETES_INTERNOS_DEL_JDK } from '../biblioteca/datos/paquetes-internos-del-jdk.generado.ts';
import { CODIGOS_NO_SOPORTADO } from '../no-soportado.ts';
import type { NodoPrograma } from '../sintaxis/ast.ts';
import type { ProblemaAtribucion } from './diagnostico.ts';

const PAQUETE_RESERVADO = 'java';
const PREFIJO_DE_LO_QUE_ESTA_DENTRO = `${PAQUETE_RESERVADO}.`;

// Tarea 1.39: un `Set` (nunca el objeto generado directo): un "paquete" como `constructor` o `__proto__` no debe encontrar nada del prototipo de `Object`.
const PAQUETES_DE_MODULOS_QUE_NO_CARGAN: ReadonlySet<string> = new Set(PAQUETES_INTERNOS_DEL_JDK.split(','));

/**
 * ¿`nombre` es `java` o está dentro de `java`? Es la regla del lanzador real: solo importa el primer segmento COMPLETO (`javafoo` y `javax.x` no cuentan) y las mayúsculas distinguen (`Java.x` no
 * cuenta). Es por el NOMBRE: `java.awt.peer` está dentro de `java` pero es de un módulo, y ahí el lanzador falla antes con otra excepción (ver `verificarPaqueteDelLanzador`). Pura; el nombre es el que lee javac
 * (`NodoPaquete.nombre`: sin comentarios, espacios ni caracteres ignorables).
 */
export function esPaqueteReservadoPorJava(nombre: string): boolean {
  return nombre === PAQUETE_RESERVADO || nombre.startsWith(PREFIJO_DE_LO_QUE_ESTA_DENTRO);
}

/**
 * Tarea 1.39 (W-16): ¿`nombre` es EXACTAMENTE el de un paquete de un módulo del JDK que javac compila y el lanzador no carga? La lista la midió el oráculo con el `java` real
 * (`PAQUETES_INTERNOS_DEL_JDK`, `GenerarPaquetesDeModulos.java`): solo cuenta el nombre completo —un subpaquete (`jdk.internal.misc.aula`) o el paquete de arriba cuando no es de ningún módulo (`com.sun.crypto`) sí
 * arrancan— y las mayúsculas distinguen. Pura; el nombre es el que lee javac (`NodoPaquete.nombre`: sin comentarios, espacios ni caracteres ignorables).
 */
export function esPaqueteInternoDelJdk(nombre: string): boolean {
  return PAQUETES_DE_MODULOS_QUE_NO_CARGAN.has(nombre);
}

/**
 * El aviso de que el lanzador no arranca el programa, o nada: un solo aviso, en la línea del `package`. Primero la lista de los paquetes de módulos y después la regla de `java`: dos de esos paquetes
 * (`java.awt.peer`, `java.awt.dnd.peer`) están dentro de `java`, y como el módulo gana antes de que la clase se defina, el lanzador da `ClassNotFoundException` y no «Prohibited package name».
 */
export function verificarPaqueteDelLanzador(programa: NodoPrograma): ProblemaAtribucion[] {
  const paquete = programa.paquete;
  if (paquete === null) return [];
  if (esPaqueteInternoDelJdk(paquete.nombre)) {
    return [{ codigo: CODIGOS_NO_SOPORTADO.paqueteInternoDelJdk, categoria: 'no-disponible', rango: paquete.rango, datos: { nombre: paquete.nombre } }];
  }
  if (!esPaqueteReservadoPorJava(paquete.nombre)) return [];
  return [{ codigo: CODIGOS_NO_SOPORTADO.paqueteReservadoPorJava, categoria: 'no-disponible', rango: paquete.rango, datos: { nombre: paquete.nombre } }];
}
