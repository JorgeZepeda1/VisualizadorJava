// Orquesta compilar(): léxico+sintaxis → IR (design.md §1.3, §2.1). Las 5 pasadas completas
// (atribución, alcanzabilidad, asignación definitiva, arranque) llegan en la tarea 1.14; léxico+
// sintaxis ya son un subconjunto real de esas pasadas, en el mismo orden. El contrato público
// `ResultadoCompilacion` queda fijo desde aquí (REFACTOR de la tarea 0.12) para que el lote 1 solo
// lo amplíe.
import { tokenizar } from './lexico/analizador-lexico.ts';
import type { Token } from './lexico/tokens.ts';
import { analizarPrograma } from './sintaxis/analizador-sintactico.ts';
import { recolectarNoSoportados, type NoSoportadoColectado } from './sintaxis/no-soportado.ts';
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

// Tarea 1.17 (C8, REQ-SUB-006, REQ-SUB-008): detecta lo NO-DISP (léxico y sintáctico) ANTES de
// intentar bajar a IR, para que un programa fuera del subconjunto NUNCA produzca "cero pasos, cero
// errores de sintaxis engañosos" (nunca un `error-compilacion` genérico cuando en realidad es una
// construcción que Java sí acepta). ADR 004: avisos y errores de sintaxis COMPITEN por posición en
// el texto — si el análisis sintáctico se detiene con un error real, pero había un aviso léxico
// ANTES de esa posición, gana el aviso (p. ej. un "\uXXXX" en un comentario que precede a un error
// de sintaxis genuino más adelante).
export function compilar(fuente: string): ResultadoCompilacion {
  let tokens: Token[];
  try {
    tokens = tokenizar(fuente);
  } catch (error) {
    return { ok: false, problema: construirProblema(error, fuente), adicionales: 0 };
  }

  const noSoportadosLexicos = tokens.filter((t) => t.tipo === 'no-soportado');

  try {
    const programaAst = analizarPrograma(tokens);
    const noSoportados = recolectarNoSoportados(programaAst, noSoportadosLexicos);
    if (noSoportados.length > 0) {
      return construirResultadoNoDisponible(noSoportados, fuente);
    }
    const ir = generarIr(programaAst);
    return { ok: true, programa: { ir }, vista: { fuente } };
  } catch (error) {
    const rangoError = error instanceof ErrorDeCompilacion ? error.rango : null;
    const avisosAntesDelError = rangoError
      ? noSoportadosLexicos.filter((t) => t.rango.inicio <= rangoError.inicio)
      : noSoportadosLexicos;
    if (avisosAntesDelError.length > 0) {
      const noSoportados = avisosAntesDelError
        .map((t) => ({ codigo: t.codigo ?? 'no-soportado', rango: t.rango }))
        .sort((a, b) => a.rango.inicio - b.rango.inicio);
      return construirResultadoNoDisponible(noSoportados, fuente);
    }
    return { ok: false, problema: construirProblema(error, fuente), adicionales: 0 };
  }
}

function construirResultadoNoDisponible(
  noSoportados: readonly NoSoportadoColectado[],
  fuente: string,
): ResultadoCompilacion {
  const [primero, ...resto] = noSoportados;
  const tabla = new TablaDeLineas(fuente);
  const { linea } = tabla.ubicar(primero.rango.inicio);
  return {
    ok: false,
    adicionales: resto.length,
    problema: {
      categoria: 'no-disponible',
      codigo: primero.codigo,
      rango: primero.rango,
      linea,
      datos: {},
    },
  };
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
