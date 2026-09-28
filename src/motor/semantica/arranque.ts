// Arranque (tarea 1.15, REQ-COMP-007/008, ADR 004 pasada 5 "arranque"): lo que rechaza el
// LANZADOR de la JVM (`java`), no `javac` -- verificado contra el JDK 17 real (exploracion/03
// §4.2): un `main` sin `static`, sin `public`, o una clase sin ningún `main`, compilan LIMPIO; el
// problema aparece recién al intentar EJECUTAR. `compilador.ts` (tarea 1.14) solo llama a esta
// pasada cuando las 4 anteriores (léxico+sintaxis, atribución, alcanzabilidad, asignación
// definitiva) ya terminaron sin ningún problema -- design.md §2.2: "Solo aplica si la compilación
// no tuvo errores" (instrucción del orquestador).
//
// Sub-lote 1-D2c (design.md §2.1 lista 3 casos: "sin static, sin main, no public" -- el 3ro nunca
// se había verificado, task_0b5b6e47): "main sin public" NUNCA tuvo mensaje propio -- comparte el
// de "sin-main" byte a byte (verificado contra el JDK real: `Class#getMethod("main", ...)`, lo que
// usa el lanzador para encontrar el punto de entrada, SOLO ve métodos públicos — uno no público es
// indistinguible de "no existe" para esa búsqueda). Por eso `verificarArranque` solo tiene 2
// desenlaces reales (`sin-main` cubre AMBOS "sin main" y "main no public"), nunca un 3er código.
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
  // Corrección obligatoria (sub-lote 1-D2c, design.md §2.1, task_0b5b6e47): "main sin public"
  // NUNCA tuvo su propio mensaje -- verificado contra el JDK 17 real (3 corridas repetidas, carpeta
  // temporal borrada): un "main" no público da el mensaje EXACTO de "sin-main", byte a byte, NUNCA
  // uno propio. Motivo real: el lanzador resuelve el método de entrada con
  // `Class#getMethod("main", String[].class)`, que SOLO encuentra métodos PÚBLICOS (declarados o
  // heredados) -- un "main" no público es, para esa búsqueda, indistinguible de "no existe ningún
  // main". Por eso este chequeo va ANTES que `esEstatico`: un "main" ni público ni static (probado)
  // también da "sin-main", NUNCA "main-no-static" (ese mensaje exige que el lanzador SÍ haya
  // encontrado el método -- solo pasa si es público).
  if (clase.main === null || !clase.main.esPublico) {
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
