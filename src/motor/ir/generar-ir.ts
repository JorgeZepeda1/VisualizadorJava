// Baja el AST de la rebanada vertical a la IR mínima (design.md §1.2). `plan-evaluacion.ts` y
// `vista-programa.ts` —también parte de `ir/` en el diseño final— llegan en la tarea 2.16, que es
// quien primero necesita un plan de evaluación (no hace falta para una sentencia sin
// subexpresiones como println(literal)).
import type { NodoPrograma, NodoSentencia } from '../sintaxis/ast.ts';
import type { ProgramaIr, SentenciaIr } from './ir.ts';

export function generarIr(programa: NodoPrograma): ProgramaIr {
  const sentencias = programa.clase.main.cuerpo.sentencias.map(generarSentenciaIr);
  return { sentencias };
}

function generarSentenciaIr(sentencia: NodoSentencia): SentenciaIr {
  // Única variante del subconjunto de esta rebanada (NodoSentencia = NodoImpresion); el resto de
  // sentencias IR llega cuando la tarea 1.5/2.16 amplíen NodoSentencia/SentenciaIr.
  return { tipo: 'impresion', texto: sentencia.argumento.valor };
}
