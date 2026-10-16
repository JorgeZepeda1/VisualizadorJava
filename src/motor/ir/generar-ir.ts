// Baja el AST a la IR mínima (design.md §1.2). `plan-evaluacion.ts` y `vista-programa.ts` —también
// parte de `ir/` en el diseño final— llegan en la tarea 2.16, que es quien primero necesita un
// plan de evaluación (no hace falta para una sentencia sin subexpresiones como println(literal)).
//
// La tarea 1.2 amplió la gramática (`NodoElementoBloque`: DeclLocal, "return;") sin tocar la IR
// real — esa semántica (bajar declaraciones/expresiones/control de flujo) es de las tareas 1.5/
// 2.16, no de esta. Para que `npm run tipos` siga en verde con el AST más ancho, y para no fingir
// un resultado que no se implementó (D2), cualquier elemento que no sea "impresion" lanza un error
// claro en vez de callar — `compilador.ts` ya lo atrapa y lo convierte en `Problema` (D2: nunca un
// resultado inventado). Ningún caso de esta rebanada vertical ni de las tareas 1.1-1.4 necesita
// que esto haga algo más: sus propias pruebas son de léxico/sintaxis, no de ejecución.
//
// Tarea 1.27 (agregada por el orquestador): antes de esta tarea ese error era un `Error` plano SIN
// posición -- `compilador.ts` lo atrapaba con su catch-all genérico y lo presentaba como
// `error-compilacion` (línea fija en 1), como si el programa tuviera un error de SINTAXIS. Java SÍ
// acepta estos programas (verificado contra javac 17 real) -- `ErrorDeEjecucionNoDisponible` lleva
// el `rango` REAL del elemento para que `compilador.ts` lo traduzca a `categoria:'no-disponible'`
// con la línea correcta, nunca un resultado inventado (D2). Ruta defensiva PERMANENTE: sigue como
// respaldo honesto incluso cuando el lote 2 baje todo el subconjunto a IR.
import type { NodoElementoBloque, NodoPrograma } from '../sintaxis/ast.ts';
import { ErrorDeEjecucionNoDisponible } from './error-de-ejecucion-no-disponible.ts';
import type { ProgramaIr, SentenciaIr } from './ir.ts';

export function generarIr(programa: NodoPrograma): ProgramaIr {
  // Tarea 1.15 (REQ-COMP-008): sin "main" no hay cuerpo que bajar a IR -- `compilador.ts` reporta
  // el error de ARRANQUE (pasada 5) usando este programa vacío; nunca se ejecuta.
  if (programa.clase.main === null) return { sentencias: [] };
  const sentencias = programa.clase.main.cuerpo.elementos.map(generarSentenciaIr);
  return { sentencias };
}

function generarSentenciaIr(elemento: NodoElementoBloque): SentenciaIr {
  // Tarea 1.8 (pendiente heredado): la sintaxis ahora acepta `print` y cualquier expresión como
  // argumento (no solo `println` de un literal-cadena, 0.12) — pero solo ESE caso concreto tiene
  // IR real todavía. Generalizar la EJECUCIÓN (resolver la sobrecarga real de `print`, evaluar
  // una expresión general) es del lote 2 (2.16+), igual que el resto de `Sentencia` desde 1.5:
  // el mismo `throw` honesto de siempre, nunca un resultado a medias o silenciosamente incorrecto.
  if (elemento.tipo === 'impresion' && elemento.metodo === 'println') {
    // Corrección obligatoria (sub-lote 1-C2): "println()" sin argumentos SÍ tiene IR real — el
    // PrintStream real solo emite el separador de línea, así que su texto es la cadena vacía
    // (design.md §4.8: "println agrega \n"; ese \n lo añade la ejecución real, lote 2, igual que
    // para println("literal") — aquí solo el texto ya resuelto).
    if (elemento.argumento === null) return { tipo: 'impresion', texto: '' };
    if (elemento.argumento.tipo === 'literal-cadena') return { tipo: 'impresion', texto: elemento.argumento.valor };
  }
  throw new ErrorDeEjecucionNoDisponible(
    `la ejecución de "${elemento.tipo}" llega en el lote 2 (tareas 1.5/2.16)`,
    elemento.rango,
  );
}
