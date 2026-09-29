// RED de la tarea 1.17 (Muestra de NO-DISP por construcción, REQ-DIFF-004 parte C8, REQ-SUB-006):
// cada muestra de `corpus/compilacion/avisos/` (una por construcción del catálogo REQ-SUB-007, más
// las ya reconocidas léxica/sintácticamente en 1.1/1.3) MUST disparar el aviso "no disponible"
// ANTES de ejecutar — cero pasos, cero errores de sintaxis engañosos (C8) — y NUNCA el genérico
// "error-compilacion" que existía antes de que esta tarea conectara el recolector de
// `sintaxis/no-soportado.ts` con `compilador.ts`.
//
// `corpus/compilacion/catalogo/` es un subconjunto DELIBERADAMENTE ACOTADO (9 casos, no los 42 de
// `exploracion/03`): solo los que esta pasada (léxico + sintaxis, sin atribución — tareas 1.7+
// siguen pendientes) rechaza por una razón sintáctica REAL y verificada contra javac 17, nunca por
// una coincidencia genérica. Ver el reporte de la tarea para la lista de casos deliberadamente
// diferidos a la tarea 1.11 (dependen de símbolos/tipos).
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';

const RUTA_AVISOS = resolve('corpus/compilacion/avisos');
const RUTA_CATALOGO = resolve('corpus/compilacion/catalogo');

function archivosJava(ruta: string): string[] {
  return readdirSync(ruta)
    .filter((nombre) => nombre.endsWith('.java'))
    .sort();
}

describe('pruebas/compilacion/catalogo — avisos NO-DISP (uno por construcción, corpus/compilacion/avisos)', () => {
  const archivos = archivosJava(RUTA_AVISOS);

  it('el corpus de avisos no está vacío (guarda contra un directorio mal armado)', () => {
    expect(archivos.length).toBeGreaterThanOrEqual(37);
  });

  // Tarea 1.23 (agregada por el orquestador: hallazgo de la guarda de avisos, sub-lote 1-D6):
  // "37-yield.java" volvió a este bucle genérico — `sintaxis/expresiones.ts` (`analizarPrimaria`)
  // ahora reconoce "switch" en posición de EXPRESIÓN (JLS 15.28), así que ya no hace falta la
  // excepción documentada que antes vivía aquí (el analizador daba "error-compilacion" genuino
  // para ese único archivo; el resto de este catálogo siempre dio "no-disponible").
  it.each(archivos)(
    '%s: dispara "no disponible" antes de ejecutar, nunca un error de sintaxis genérico',
    (nombre) => {
      const fuente = readFileSync(resolve(RUTA_AVISOS, nombre), 'utf-8');
      const resultado = compilar(fuente);

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;

      // C8: nunca "error-compilacion" (sería un error de sintaxis engañoso para algo que Java sí
      // acepta) ni "error-arranque" — siempre "no-disponible".
      expect(resultado.problema.categoria).toBe('no-disponible');
      expect(resultado.problema.linea).toBeGreaterThanOrEqual(1);
      expect(resultado.adicionales).toBeGreaterThanOrEqual(0);
    },
  );
});

describe('pruebas/compilacion/catalogo — errores de sintaxis reales (subconjunto acotado, corpus/compilacion/catalogo)', () => {
  const archivos = archivosJava(RUTA_CATALOGO);

  it('el subconjunto acotado de errores reales no está vacío', () => {
    expect(archivos.length).toBeGreaterThanOrEqual(9);
  });

  it.each(archivos)('%s: NUNCA compila (mismo veredicto que javac 17, verificado)', (nombre) => {
    const fuente = readFileSync(resolve(RUTA_CATALOGO, nombre), 'utf-8');
    const resultado = compilar(fuente);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    // Rechazo real de sintaxis — nunca "no-disponible" (no son construcciones fuera de alcance,
    // son programas rotos que javac tampoco aceptaría).
    expect(resultado.problema.categoria).toBe('error-compilacion');
  });
});
