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
    // Sub-lote 1-D2c: `ProblemaAtribucion.codigo` se ensanchó a `CodigoProblema | string` (puede
    // traer un código NO-DISP abierto) — MISMO cast ya usado abajo para `Problema.codigo`, que
    // tiene esa forma desde 1.11; ninguno de los 15 casos de esta tabla toca el código NO-DISP.
    const texto = textoDe(problema.codigo as CodigoProblema, problema.datos);
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
    const texto = textoDe(problema.codigo as CodigoProblema, problema.datos);
    expect(texto.length).toBeGreaterThan(0);
    expect(texto).toContain('Scanner');
  });
});

// Sub-lote 1-D2c (REQ-SUB-005/007, task_c0cf2e6c): cruce motor + catálogo es-MX de los 3 códigos
// nuevos de la biblioteca conectada a la atribución.
describe('problemas en español — cruce motor + catálogo es-MX (sub-lote 1-D2c: biblioteca conectada a la atribución)', () => {
  it.each([
    ['miembro-no-declarado', 'String s = "a"; s.lenght();'],
    ['campo-no-declarado', 'double p = Math.PIE;'],
    ['sin-sobrecarga-aplicable', 'int r = Math.max("a", 1);'],
  ] as const)('%s: el primer problema real tiene una frase en español no vacía', (_codigo, cuerpo) => {
    const [problema] = atribuirCuerpo(cuerpo);
    expect(problema).toBeDefined();
    if (problema === undefined) return;
    const texto = textoDe(problema.codigo as CodigoProblema, problema.datos);
    expect(typeof texto).toBe('string');
    expect(texto.length).toBeGreaterThan(0);
    expect(texto).not.toMatch(/undefined|\[object Object\]/);
  });
});

// Sub-lote 1-D3 (JLS 15.9, REQ-SUB-005): cruce motor + catálogo es-MX del código nuevo de
// constructores ("new Clase(...)", ver atribucion.test.ts para los 6 casos completos).
describe('problemas en español — cruce motor + catálogo es-MX (sub-lote 1-D3: constructores, JLS 15.9)', () => {
  it('sin-constructor-aplicable ("new Scanner()", sin argumentos): frase en español no vacía y menciona la clase real', () => {
    const programa = analizarPrograma(
      tokenizar('import java.util.Scanner; class C { public static void main(String[] a) { Scanner sc = new Scanner(); } }'),
    );
    const [problema] = atribuir(programa);
    expect(problema).toBeDefined();
    if (problema === undefined) return;
    expect(problema.codigo).toBe('sin-constructor-aplicable');
    const texto = textoDe(problema.codigo as CodigoProblema, problema.datos);
    expect(texto.length).toBeGreaterThan(0);
    expect(texto).toContain('Scanner');
    expect(texto).not.toMatch(/undefined|\[object Object\]/);
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
    const texto = textoDe(problema.codigo as CodigoProblema, problema.datos);
    expect(texto.length).toBeGreaterThan(0);
  });
});

// C3 del panel 1 (2026-10-17): el texto de «etiqueta-de-case-no-constante» decía «no una variable ni un cálculo», pero `final int K = 3; … case K + 1:` COMPILA (una variable `final` con valor fijo es
// una constante, y un cálculo con constantes también). Lo que el robot afirma tiene que ser verdad en Java (D2): aquí se compara el texto con lo que el motor hace de verdad.
describe('problemas en español — C3: el aviso de un `case` no constante no afirma nada falso', () => {
  const programa = (cuerpo: string): string => `public class P {\n  public static void main(String[] args) {\n${cuerpo}\n  }\n}\n`;

  it('lo que el texto deja de negar SÍ compila: una variable `final` con valor fijo y un cálculo con ella son etiquetas válidas', () => {
    expect(compilar(programa('final int K = 3; int x = 4; switch (x) { case K + 1: break; default: break; }')).ok).toBe(true);
    expect(compilar(programa('final int K = 3; int x = 3; switch (x) { case K: break; default: break; }')).ok).toBe(true);
  });

  it('una variable que puede cambiar SÍ es el error, y su texto habla de un valor que Java conoce antes de ejecutar (un literal o una `final` con valor fijo)', () => {
    const resultado = compilar(programa('int v = 2; int x = 4; switch (x) { case v: break; default: break; }'));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.problema.codigo).toBe('etiqueta-de-case-no-constante');
    const texto = textoDe(resultado.problema.codigo as CodigoProblema, resultado.problema.datos);
    expect(texto).toBe(
      'Cada `case` necesita un valor que Java conozca antes de ejecutar: un literal o una variable `final` con valor fijo, no una variable que puede cambiar.',
    );
    expect(texto).not.toContain('ni un cálculo');
  });
});
