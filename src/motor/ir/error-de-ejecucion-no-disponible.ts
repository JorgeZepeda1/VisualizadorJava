// Tarea 1.27 (agregada por el orquestador — hallazgo verificado de punta a punta, D2/regla 5 de
// CLAUDE.md): `generarIr` (generar-ir.ts) puede encontrar un elemento del subconjunto que las
// pasadas de compilación de `compilador.ts` YA ACEPTARON (léxico+sintaxis, atribución,
// alcanzabilidad y asignación definitiva; el arranque se revisa DESPUÉS de `generarIr`) pero que
// el lote 2 (tareas 1.5/2.16) todavía no sabe EJECUTAR -- antes de
// esta tarea, ese hueco se señalaba con un `Error` plano SIN posición, que `compilador.ts` atrapaba
// con el catch-all genérico (`construirProblema`): `categoria:'error-compilacion'` con la línea fija
// en 1 (rango por omisión), como si fuera un error de SINTAXIS -- un resultado inventado para un
// programa que javac SÍ acepta.
//
// Este error, en cambio, lleva el `rango` REAL del elemento que no se pudo bajar -- `compilador.ts`
// lo distingue por tipo (`instanceof`) de cualquier otro `Error`/`ErrorDeCompilacion` y lo traduce a
// `categoria:'no-disponible'` con la línea correcta (mismo mecanismo que ya usa
// `construirResultadoNoDisponible` para los avisos de léxico/sintaxis/atribución de biblioteca,
// motor/no-soportado.ts). Es una ruta defensiva PERMANENTE (nunca se retira): incluso cuando el
// lote 2 baje todo el subconjunto a IR, sigue como respaldo honesto ante cualquier caso no
// caracterizado -- D2 nunca deja de aplicar.
//
// El `mensaje` (p. ej. `la ejecución de "declaracion-local" llega en el lote 2...`) es SOLO para
// quien lea el stack trace en desarrollo (`Error.message`) -- `compilador.ts` NUNCA lo copia a
// `Problema.datos` para este error (a diferencia de `construirProblema`, que sí expone `mensaje`
// para el catch-all genérico): el alumno solo ve el texto es-MX de `textosNoSoportado['ejecucion-
// no-disponible']`, nunca jerga interna ("lote", "tarea", nombres de tipos del AST).
import type { Rango } from '../fuente/rango.ts';

export class ErrorDeEjecucionNoDisponible extends Error {
  readonly rango: Rango;

  constructor(mensaje: string, rango: Rango) {
    super(mensaje);
    this.name = 'ErrorDeEjecucionNoDisponible';
    this.rango = rango;
  }
}
