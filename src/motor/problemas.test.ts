// RED de la tarea 1.11 (cierre de `CodigoProblema`, REQ-COMP-001 + REQ-COMP-002/003). Índice de
// COBERTURA: para cada caso del catálogo de errores de compilación de
// `exploracion/03-semantica-texto-entrada-errores.md` §4 (42 filas verificadas contra javac 17
// real) que cae en el alcance de esta tarea (tipo/símbolo/alcance — NO asignación definitiva ni
// alcanzabilidad, que son 1.12/1.13; NO arranque, que es 1.15), corre el snippet REAL a través del
// pipeline (léxico+sintaxis para los 3 códigos de sintaxis vía `compilar()`; `atribuir()` para
// símbolo/tipo/switch) y confirma que produce el `CodigoProblema` correcto. Las pruebas UNITARIAS
// detalladas de cada regla (triangulación, controles negativos) viven junto a quien la implementa
// (`semantica/atribucion.test.ts`, `semantica/switch.test.ts`, `compilador.test.ts`); este archivo
// es el ÍNDICE, no la profundidad. El cruce con `textosProblemas` (catálogo es-MX) vive aparte en
// `pruebas/compilacion/problemas-en-espanol.test.ts` — este archivo es de la capa `motor`, que
// (ADR 001) no puede importar `textos` (matriz de capas).
import { describe, expect, it } from 'vitest';
import { tokenizar } from './lexico/analizador-lexico.ts';
import { analizarPrograma } from './sintaxis/analizador-sintactico.ts';
import { atribuir } from './semantica/atribucion.ts';
import { compilar } from './compilador.ts';
import type { CodigoProblema } from './problemas.ts';

// Sub-lote 1-D2c: `ProblemaAtribucion.codigo` se ensanchó a `CodigoProblema | string` (el mismo
// ensanchamiento que ya tenía `Problema.codigo`) para poder llevar códigos NO-DISP abiertos
// (biblioteca no soportada, `semantica/atribucion.ts`) -- este índice solo compara contra los
// `CodigoProblema` cerrados de siempre, así que el ensanchamiento del tipo no cambia su alcance.
function primerCodigoDeAtribucion(cuerpoDeMain: string): CodigoProblema | string | undefined {
  const programa = analizarPrograma(tokenizar(`class C { public static void main(String[] a) { ${cuerpoDeMain} } }`));
  return atribuir(programa)[0]?.codigo;
}

function primerCodigoDeSintaxis(fuente: string): string | undefined {
  const resultado = compilar(fuente);
  return resultado.ok ? undefined : resultado.problema.codigo;
}

describe('Catálogo `CodigoProblema` — casos de exploracion/03 §4 cubiertos por la pasada de sintaxis (1.11)', () => {
  it.each([
    ['err01', 'class C { public static void main(String[] a) { int x = 5 } }', 'falta-punto-y-coma'],
    ['err23/err32', 'class C { public static void main(String[] a) { System.out.println("x"; } }', 'falta-parentesis-cierre'],
  ] as const)('%s -> "%s"', (_caso, fuente, esperado) => {
    expect(primerCodigoDeSintaxis(fuente)).toBe(esperado);
  });
});

describe('Catálogo `CodigoProblema` — casos de exploracion/03 §4 cubiertos por atribución (1.11)', () => {
  it.each([
    ['err02', 'int y = edad + 1;', 'variable-no-declarada'],
    ['err03', 'saludar();', 'metodo-no-declarado'],
    ['err04', 'int x = 3.5;', 'conversion-con-perdida'],
    ['err12', 'int x = "5";', 'tipos-incompatibles-en-asignacion'],
    ['err13', 'int x = 5; if (x) { }', 'condicion-no-booleana'],
    ['err18', 'string nombre = "Ana";', 'tipo-no-reconocido'],
    ['err19', 'system.out.println(1);', 'variable-no-declarada'],
    ['err28', 'boolean b = "hola" == 5;', 'tipos-incomparables'],
    ['err29', 'break;', 'break-fuera-de-contexto'],
    ['err30', 'continue;', 'continue-fuera-de-contexto'],
    ['err33', 'int x = 5; while (x) { }', 'condicion-no-booleana'],
    ['err34', 'int x = 1; int v = 2; switch (x) { case v: break; }', 'etiqueta-de-case-no-constante'],
    ['err35', 'int y = "hola" - 1;', 'operandos-invalidos-operador-binario'],
    ['flow05', 'int x = 1; switch (x) { case 1: break; case 1: break; }', 'etiqueta-de-case-duplicada'],
    ['flow13', 'int x = 1; int x = 2;', 'variable-ya-definida'],
    ['flow18', 'int x = 5; if (true) { int x = 10; }', 'variable-ya-definida'],
    ['flow19', 'int i = 0; for (int i = 0; i < 3; i++) { }', 'variable-ya-definida'],
    ['REQ-COMP-002 (switch long)', 'long n = 5L; switch (n) { default: break; }', 'selector-de-switch-invalido'],
  ] as const)('%s -> "%s"', (_caso, cuerpo, esperado) => {
    expect(primerCodigoDeAtribucion(cuerpo)).toBe(esperado);
  });
});

// Casos deliberadamente FUERA de este cierre (documentado — no un olvido): ver el reporte de la
// tarea 1.11 para el detalle completo por caso (asignación definitiva → 1.13, alcanzabilidad →
// 1.12, arranque → 1.15, custom methods → moot en este subconjunto, etc.).
