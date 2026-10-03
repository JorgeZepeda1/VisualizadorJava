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

// Las muestras que traen más de una ocurrencia de la construcción a propósito, y cuántas «más» hay tras la primera: `36-switch-flecha.java` tiene dos brazos con flecha;
// `65-clase-sellada.java` declara tres miembros propios (la interfaz sellada y sus dos records).
const MUESTRAS_CON_VARIAS_OCURRENCIAS: ReadonlyMap<string, number> = new Map([
  ['36-switch-flecha.java', 1],
  ['65-clase-sellada.java', 2],
]);

describe('pruebas/compilacion/catalogo — avisos NO-DISP (uno por construcción, corpus/compilacion/avisos)', () => {
  const archivos = archivosJava(RUTA_AVISOS);

  it('el corpus de avisos no está vacío (guarda contra un directorio mal armado)', () => {
    // 67 muestras: las 61 de la 1.17–1.34 y las 6 de la 1.35 (clase anónima, llamada a `main`, `instanceof` con patrón, clase sellada, literal de clase, emoji en un `char`).
    expect(archivos.length).toBeGreaterThanOrEqual(67);
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
      // Tarea 1.35 (SUGGESTION-5 de la re-verificación del lote 1): `adicionales ≥ 0` no podía fallar nunca. Cada muestra ejemplifica UNA construcción, así que no queda
      // nada «más» que contar (REQ-SUB-006: «y N más»), salvo las que traen varias ocurrencias A PROPÓSITO (`MUESTRAS_CON_VARIAS_OCURRENCIAS`). Al volverla exacta apareció un
      // defecto real: un literal fuera del subconjunto (`0x1F`, `010`, `0b101`, `3.5f`, un bloque de texto, un escape raro) se contaba DOS veces —el aviso del léxico y el
      // nodo del analizador, con el mismo rango— y el alumno habría leído «y 1 más» en un programa con una sola construcción.
      expect(resultado.adicionales).toBe(MUESTRAS_CON_VARIAS_OCURRENCIAS.get(nombre) ?? 0);
      // Y la línea del aviso cae DENTRO del archivo y es la de una línea con código, no una vacía ni el final.
      const lineas = fuente.split('\n');
      expect(resultado.problema.linea).toBeLessThanOrEqual(lineas.length);
      expect(lineas[resultado.problema.linea - 1]?.trim().length).toBeGreaterThan(0);
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
