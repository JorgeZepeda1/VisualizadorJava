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
import type { NodoElementoBloque, NodoPrograma } from '../sintaxis/ast.ts';
import type { ProgramaIr, SentenciaIr } from './ir.ts';

export function generarIr(programa: NodoPrograma): ProgramaIr {
  const sentencias = programa.clase.main.cuerpo.elementos.map(generarSentenciaIr);
  return { sentencias };
}

function generarSentenciaIr(elemento: NodoElementoBloque): SentenciaIr {
  if (elemento.tipo === 'impresion') {
    return { tipo: 'impresion', texto: elemento.argumento.valor };
  }
  throw new Error(`la ejecución de "${elemento.tipo}" llega en el lote 2 (tareas 1.5/2.16)`);
}
