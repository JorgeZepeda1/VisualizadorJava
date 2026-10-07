// Paquete del lanzador (tarea 1.38, W-15 de la «Verificación acotada del lote 1 (1.37)») — ADR 004: léxico+sintaxis → atribución → alcanzabilidad → asignación definitiva → límites del archivo →
// **paquete del lanzador** → arranque. Es lo que rechaza el LANZADOR de la JVM (`java`), no `javac`: `package java.miapp;` compila limpio y el programa nunca llega a `main`.
//
// Medido con el `java` 17.0.18 real (y vuelto a medir en cada `npm run test:oraculo`, `herramientas/oraculo/generar-datos.test.ts`): el lanzador se niega, con
// `java.lang.SecurityException: Prohibited package name: <paquete>` (`ClassLoader.preDefineClass` y `ClassFileParser::check_prohibited_package`: un cargador que no es el de la plataforma no define una
// clase cuyo NOMBRE empieza con `java.`), con `java` a secas y con TODO lo que está dentro de `java` —`java.miapp`, `java.lang.aula`, `java.util.Map`, `java.Aula`…—, exista o no. La excepción salta al
// cargar la clase, antes de buscar `main` y de leer una sola línea. Arrancan con normalidad `javax`, `jdk`, `sun`, `com.sun`, `org`, `Java.x` (las mayúsculas cuentan), `javafoo` y `aula.java`: solo importa el
// primer segmento, y completo. Los goldens del oráculo de todo el corpus con `package` lo confirman (`pruebas/compilacion/paquetes-prohibidos-del-corpus.test.ts`).
//
// Va DESPUÉS de las pasadas de javac, como el arranque: `compilador.ts` solo la corre cuando todas aceptaron el programa. Un error del cuerpo (tipos, alcanzabilidad, asignación definitiva, límites
// del archivo) se informa antes, con la línea de javac —igual que en NetBeans, que primero muestra el error de compilación y recién después el del lanzador—, y los errores del propio `package`
// (`java.util`, `java.lang.Shutdown`) ya los dio la atribución, porque ésos sí los rechaza javac. El resultado es un AVISO (`no-disponible`) y nunca un error de compilación: javac compila el
// programa. Gana a `ejecucion-no-disponible` y al «sin main» del arranque, porque el lanzador falla antes que ellos.
//
// Lo que NO cubre (hallazgo W-16 de la tarea 1.38, tarea aparte): un paquete que ya existe en un módulo del JDK pero que javac compila porque no lo exporta (`jdk.internal.misc`, `sun.nio.ch`) tampoco lo
// arranca el lanzador, con otro mecanismo (`ClassNotFoundException`: el cargador encuentra el paquete en el módulo y no busca la clase en el classpath).
import { CODIGOS_NO_SOPORTADO } from '../no-soportado.ts';
import type { NodoPrograma } from '../sintaxis/ast.ts';
import type { ProblemaAtribucion } from './diagnostico.ts';

const PAQUETE_RESERVADO = 'java';
const PREFIJO_DE_LO_QUE_ESTA_DENTRO = `${PAQUETE_RESERVADO}.`;

/**
 * ¿`nombre` es `java` o está dentro de `java`? Es la regla del lanzador real: solo importa el primer segmento COMPLETO (`javafoo` y `javax.x` no cuentan) y las mayúsculas distinguen (`Java.x` no
 * cuenta). Pura; el nombre es el que lee javac (`NodoPaquete.nombre`: sin comentarios, espacios ni caracteres ignorables).
 */
export function esPaqueteReservadoPorJava(nombre: string): boolean {
  return nombre === PAQUETE_RESERVADO || nombre.startsWith(PREFIJO_DE_LO_QUE_ESTA_DENTRO);
}

/** El aviso de que el lanzador no arranca el programa, o nada: un solo aviso, en la línea del `package`. */
export function verificarPaqueteDelLanzador(programa: NodoPrograma): ProblemaAtribucion[] {
  const paquete = programa.paquete;
  if (paquete === null || !esPaqueteReservadoPorJava(paquete.nombre)) return [];
  return [{ codigo: CODIGOS_NO_SOPORTADO.paqueteReservadoPorJava, categoria: 'no-disponible', rango: paquete.rango, datos: { nombre: paquete.nombre } }];
}
