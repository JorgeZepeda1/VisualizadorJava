// RED de la tarea 1.11 (cierre de `CodigoProblema` + `textos/es-MX/problemas.ts`, ADR 015). Cruce
// entre motor y catálogo de textos: para una muestra representativa de los casos de
// `exploracion/03-semantica-texto-entrada-errores.md` §4 cubiertos por 1.11, corre el snippet REAL
// a través del motor (`atribuir`/`compilar`, `src/motor`) y confirma que el `codigo` que produce
// tiene una traducción REAL y no vacía en `textosProblemas` (`src/textos/es-MX`) — la prueba de
// integración completa que ninguna de las dos capas por separado puede dar (cada una vive en su
// propio directorio, con su propia guarda de capa, ADR 001; `pruebas/` no tiene esa restricción,
// design.md §1.1 "puede importar: todo").
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../../src/motor/lexico/analizador-lexico.ts';
import { analizarPrograma } from '../../src/motor/sintaxis/analizador-sintactico.ts';
import { atribuir } from '../../src/motor/semantica/atribucion.ts';
import { verificarAlcanzabilidad } from '../../src/motor/semantica/alcanzabilidad.ts';
import { compilar } from '../../src/motor/index.ts';
import type { CodigoProblema } from '../../src/motor/index.ts';
import { textosProblemas } from '../../src/textos/es-MX/problemas.ts';

function atribuirCuerpo(cuerpoDeMain: string) {
  const programa = analizarPrograma(tokenizar(`class C { public static void main(String[] a) { ${cuerpoDeMain} } }`));
  return atribuir(programa);
}

function alcanzabilidadDeCuerpo(cuerpoDeMain: string) {
  const programa = analizarPrograma(tokenizar(`class C { public static void main(String[] a) { ${cuerpoDeMain} } }`));
  return verificarAlcanzabilidad(programa);
}

function textoDe(codigo: CodigoProblema, datos: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- `datos` varía por código (ver DatosPorCodigo en el catálogo real)
  return (textosProblemas[codigo] as (d: any) => string)(datos);
}

describe('problemas en español — cruce motor + catálogo es-MX (casos de atribución de exploracion/03)', () => {
  it.each([
    ['err02', 'int y = edad + 1;'],
    ['err03', 'saludar();'],
    ['err04', 'int x = 3.5;'],
    ['err12', 'int x = "5";'],
    ['err13', 'int x = 5; if (x) { }'],
    ['err18', 'string nombre = "Ana";'],
    ['err19', 'system.out.println(1);'],
    ['err28', 'boolean b = "hola" == 5;'],
    ['err29', 'break;'],
    ['err30', 'continue;'],
    ['err35', 'int y = "hola" - 1;'],
    ['flow05', 'int x = 1; switch (x) { case 1: break; case 1: break; }'],
    ['flow13', 'int x = 1; int x = 2;'],
    ['REQ-COMP-002 (switch inválido)', 'long n = 5L; switch (n) { default: break; }'],
    ['err34', 'int x = 1; int v = 2; switch (x) { case v: break; }'],
  ] as const)('%s: el primer problema real tiene una frase en español no vacía', (_caso, cuerpo) => {
    const [problema] = atribuirCuerpo(cuerpo);
    expect(problema).toBeDefined();
    if (problema === undefined) return;
    const texto = textoDe(problema.codigo, problema.datos);
    expect(typeof texto).toBe('string');
    expect(texto.length).toBeGreaterThan(0);
    expect(texto).not.toMatch(/undefined|\[object Object\]/);
  });
});

describe('problemas en español — cruce motor + catálogo es-MX (casos de sintaxis de exploracion/03)', () => {
  it.each([
    ['err01', 'class C { public static void main(String[] a) { int x = 5 } }'],
    ['err23/err32', 'class C { public static void main(String[] a) { System.out.println("x"; } }'],
  ] as const)('%s: el Problema de compilar() tiene una frase en español no vacía', (_caso, fuente) => {
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    const texto = textoDe(resultado.problema.codigo as CodigoProblema, resultado.problema.datos);
    expect(texto.length).toBeGreaterThan(0);
  });
});

// Deuda del commit 999a8ca (sub-lote 1-D1): las 5 sintaxis básicas + Scanner sin import de la
// deuda #2 del orquestador (mismo mecanismo que arriba, casos nuevos).
describe('problemas en español — cruce motor + catálogo es-MX (deuda del commit 999a8ca: sintaxis básicas + Scanner sin import)', () => {
  it.each([
    ['err14 (else sin if)', 'class C { public static void main(String[] a) { if (true) { } else { } else { } } }'],
    ['err16 (fin de archivo inesperado)', 'class C { public static void main(String[] a) { }'],
    ['err17 (llave de cierre sobrante)', 'class C { public static void main(String[] a) { } } }'],
    ['err22 (llave de método faltante)', 'class C { public static void main(String[] a) int x = 5; } }'],
    ['struct07 (package después de import)', 'import java.util.Scanner; package p; class C { public static void main(String[] a) { } }'],
  ] as const)('%s: el Problema de compilar() tiene una frase en español no vacía', (_caso, fuente) => {
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    const texto = textoDe(resultado.problema.codigo as CodigoProblema, resultado.problema.datos);
    expect(texto.length).toBeGreaterThan(0);
  });

  it('err20 (Scanner sin import): el Problema de atribuir() tiene una frase en español no vacía y menciona la clase real', () => {
    const programa = analizarPrograma(
      tokenizar('class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); } }'),
    );
    const [problema] = atribuir(programa);
    expect(problema).toBeDefined();
    if (problema === undefined) return;
    const texto = textoDe(problema.codigo, problema.datos);
    expect(texto.length).toBeGreaterThan(0);
    expect(texto).toContain('Scanner');
  });
});

// Tarea 1.12 (sub-lote 1-D1): alcanzabilidad (JLS 14.22, REQ-COMP-010) — pasada standalone todavía
// (1.14 la conecta a compilar(), fuera de este sub-lote), así que el cruce corre sobre
// verificarAlcanzabilidad() directamente, igual que ya hace atribuirCuerpo() para atribuir().
describe('problemas en español — cruce motor + catálogo es-MX (tarea 1.12: alcanzabilidad)', () => {
  it('sentencia tras un "return" incondicional: el Problema tiene una frase en español no vacía', () => {
    const [problema] = alcanzabilidadDeCuerpo('System.out.println("a"); return; System.out.println("nunca");');
    expect(problema).toBeDefined();
    if (problema === undefined) return;
    const texto = textoDe(problema.codigo, problema.datos);
    expect(texto.length).toBeGreaterThan(0);
  });
});
