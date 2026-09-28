// Arranque (tarea 1.15, REQ-COMP-007/008, ADR 004 pasada 5 "arranque"): lo que rechaza el
// LANZADOR de la JVM (`java`), no `javac` -- verificado contra el JDK 17 real (exploracion/03
// §4.2): un `main` sin `static`, o una clase sin ningún `main`, compilan LIMPIO; el problema
// aparece recién al intentar EJECUTAR. `compilador.ts` (tarea 1.14) solo llama a esta pasada
// cuando las 4 anteriores (léxico+sintaxis, atribución, alcanzabilidad, asignación definitiva) ya
// terminaron sin ningún problema -- design.md §2.2: "Solo aplica si la compilación no tuvo
// errores" (instrucción del orquestador).
//
// A diferencia de `atribuir`/`verificarAlcanzabilidad`/`verificarAsignacionDefinitiva`, esta pasada
// NUNCA hace que `compilar()` devuelva `ok:false` -- el resultado viaja dentro de
// `ProgramaCompilado.arranque` (ir.ts) hasta `crearEjecucion`, que lo convierte en un
// `Avance{estado:'fin', fin:{causa:'error-arranque', ...}}` al primer `avanzar()` (design.md §2.2:
// "se presenta como una excepción en ejecución").
import type { NodoClase } from '../sintaxis/ast.ts';
import { MARCOS_ARRANQUE } from '../biblioteca/datos/marcos-arranque.generado.ts';
import type { ProblemaArranque } from '../problemas.ts';

// El oráculo (tarea 1.9, `herramientas/oraculo/generar-datos.ts`) capturó estos mensajes con
// clases de prueba fijas ("SinMain"/"MainNoStatic") -- el texto es IDÉNTICO para cualquier clase
// salvo por ese nombre (verificado: el lanzador solo interpola el nombre real de la clase en la
// misma posición del mensaje), así que sustituir el nombre de ejemplo por el nombre REAL del
// alumno reproduce EXACTAMENTE lo que `java` le mostraría a él -- nunca una reinterpretación del
// resto del mensaje (design.md §2.2, ADR 015 punto 2: "el texto del lanzador se muestra tal cual").
const NOMBRE_DE_EJEMPLO_SIN_MAIN = 'SinMain';
const NOMBRE_DE_EJEMPLO_MAIN_NO_STATIC = 'MainNoStatic';

export function verificarArranque(clase: NodoClase): ProblemaArranque | null {
  if (clase.main === null) {
    return {
      codigo: 'sin-main',
      nombreClase: clase.nombre,
      textoLanzador: MARCOS_ARRANQUE.sinMain.mensaje.replaceAll(NOMBRE_DE_EJEMPLO_SIN_MAIN, clase.nombre),
    };
  }
  if (!clase.main.esEstatico) {
    return {
      codigo: 'main-no-static',
      nombreClase: clase.nombre,
      textoLanzador: MARCOS_ARRANQUE.mainNoStatic.mensaje.replaceAll(NOMBRE_DE_EJEMPLO_MAIN_NO_STATIC, clase.nombre),
    };
  }
  return null;
}
