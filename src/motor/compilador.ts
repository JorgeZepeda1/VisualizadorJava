// Orquesta compilar(): léxico+sintaxis → IR (design.md §1.3, §2.1). Las 5 pasadas completas
// (atribución, alcanzabilidad, asignación definitiva, arranque) llegan en la tarea 1.14; léxico+
// sintaxis ya son un subconjunto real de esas pasadas, en el mismo orden. El contrato público
// `ResultadoCompilacion` queda fijo desde aquí (REFACTOR de la tarea 0.12) para que el lote 1 solo
// lo amplíe.
import { tokenizar } from './lexico/analizador-lexico.ts';
import { analizarPrograma } from './sintaxis/analizador-sintactico.ts';
import { generarIr } from './ir/generar-ir.ts';
import type { ProgramaCompilado } from './ir/ir.ts';
import type { Problema } from './problemas.ts';
import { ErrorDeCompilacion } from './error-de-compilacion.ts';
import { TablaDeLineas } from './fuente/tabla-de-lineas.ts';
import type { Rango } from './fuente/rango.ts';

export interface VistaPrograma {
  readonly fuente: string;
}

export type ResultadoCompilacion =
  | { readonly ok: true; readonly programa: ProgramaCompilado; readonly vista: VistaPrograma }
  | { readonly ok: false; readonly problema: Problema; readonly adicionales: number };

export function compilar(fuente: string): ResultadoCompilacion {
  try {
    const tokens = tokenizar(fuente);
    const programaAst = analizarPrograma(tokens);
    const ir = generarIr(programaAst);
    return { ok: true, programa: { ir }, vista: { fuente } };
  } catch (error) {
    return { ok: false, problema: construirProblema(error, fuente), adicionales: 0 };
  }
}

function construirProblema(error: unknown, fuente: string): Problema {
  const rango: Rango = error instanceof ErrorDeCompilacion ? error.rango : { inicio: 0, fin: 0 };
  const tabla = new TablaDeLineas(fuente);
  const { linea } = tabla.ubicar(rango.inicio);
  const mensaje = error instanceof Error ? error.message : String(error);
  return {
    categoria: 'error-compilacion',
    codigo: 'error-no-clasificado',
    rango,
    linea,
    datos: { mensaje },
  };
}
