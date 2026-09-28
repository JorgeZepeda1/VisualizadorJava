// RED de la tarea 1.12 (Alcanzabilidad, JLS 14.22, REQ-COMP-010) · depende de 1.10. Pasada 3 de
// ADR 004 (léxico+sintaxis → atribución → **alcanzabilidad** → asignación definitiva → arranque),
// standalone por ahora — igual que `atribucion.ts`: 1.14 la conecta a `compilador.ts` (fuera de
// este sub-lote; el orquestador dijo explícitamente "NO hagas 1.13 en adelante").
//
// Reglas reales de JLS 14.22, restringidas al subconjunto (design.md §2.7):
// - `return`/`break`/`continue` NUNCA completan normalmente: lo que sigue en el MISMO bloque es
//   inalcanzable.
// - `while`/`for` con condición constante `false`: el CUERPO es inalcanzable.
// - `while`/`for` con condición constante `true` (o `for` sin condición): lo que SIGUE al ciclo es
//   inalcanzable, SALVO que el ciclo tenga un `break` alcanzable que lo cierre (JLS 14.21).
// - `if (false)` está EXENTO: a diferencia de while/for, el "then"/"sino" de un `if` SIEMPRE es
//   alcanzable si el propio `if` lo es, sin importar si la condición es una constante (asimetría
//   real y deliberada de JLS, para permitir "comentar con if(false)").
// - Una condición constante (JLS 15.29, vía `valorConstante` de la tarea 1.10 — variables `final`
//   constantes INCLUIDAS, deuda 3 del commit 999a8ca) cuenta igual que el literal equivalente.
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { analizarPrograma } from '../sintaxis/analizador-sintactico.ts';
import { verificarAlcanzabilidad } from './alcanzabilidad.ts';

function alcanzabilidadDeCuerpo(cuerpoDeMain: string) {
  const programa = analizarPrograma(tokenizar(`class C { public static void main(String[] a) { ${cuerpoDeMain} } }`));
  return verificarAlcanzabilidad(programa);
}

describe('verificarAlcanzabilidad — programa válido no produce ningún problema', () => {
  it('declaraciones, if/while/for/switch e impresión, todo alcanzable: sin problemas', () => {
    const problemas = alcanzabilidadDeCuerpo(`
      int x = 5;
      if (x > 0) { System.out.println("positivo"); }
      while (x > 0) { x = x - 1; }
      for (int i = 0; i < 3; i++) { System.out.println(i); }
      System.out.println("fin");
    `);
    expect(problemas).toEqual([]);
  });
});

describe('verificarAlcanzabilidad — código tras "return" incondicional (REQ-COMP-010, escenario verificado)', () => {
  it('"System.out.println(\\"a\\"); return; System.out.println(\\"nunca\\");" rechaza la SEGUNDA impresión', () => {
    const problemas = alcanzabilidadDeCuerpo('System.out.println("a"); return; System.out.println("nunca");');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]?.codigo).toBe('sentencia-inalcanzable');
  });

  it('control: SIN el "return", la segunda impresión SÍ es alcanzable', () => {
    expect(alcanzabilidadDeCuerpo('System.out.println("a"); System.out.println("b");')).toEqual([]);
  });
});

describe('verificarAlcanzabilidad — código tras "break"/"continue" incondicional', () => {
  it('"break" seguido de otra sentencia, dentro de un "while": la sentencia posterior es inalcanzable', () => {
    const problemas = alcanzabilidadDeCuerpo('while (true) { break; System.out.println("nunca"); }');
    expect(problemas.some((p) => p.codigo === 'sentencia-inalcanzable')).toBe(true);
  });

  it('triangulación: "continue" seguido de otra sentencia, dentro de un "for", también es inalcanzable', () => {
    const problemas = alcanzabilidadDeCuerpo('for (int i = 0; i < 3; i++) { continue; System.out.println("nunca"); }');
    expect(problemas.some((p) => p.codigo === 'sentencia-inalcanzable')).toBe(true);
  });

  it('control: un "break"/"continue" DENTRO de un "if" sin "else" NO hace inalcanzable lo que sigue (el if siempre completa normal)', () => {
    const problemas = alcanzabilidadDeCuerpo('while (true) { if (true) { break; } System.out.println("si es alcanzable"); }');
    expect(problemas).toEqual([]);
  });
});

describe('verificarAlcanzabilidad — cuerpo de "while(false)" es inalcanzable (design.md §2.7)', () => {
  it('"while (false) { System.out.println("x"); }": el cuerpo se rechaza', () => {
    const problemas = alcanzabilidadDeCuerpo('while (false) { System.out.println("x"); }');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]?.codigo).toBe('sentencia-inalcanzable');
  });

  it('triangulación: "for" con condición constante "false" también rechaza su cuerpo', () => {
    const problemas = alcanzabilidadDeCuerpo('for (int i = 0; false; i++) { System.out.println("x"); }');
    expect(problemas.some((p) => p.codigo === 'sentencia-inalcanzable')).toBe(true);
  });

  it('control: "do { ... } while (false);" SÍ ejecuta su cuerpo al menos una vez (nunca inalcanzable)', () => {
    expect(alcanzabilidadDeCuerpo('do { System.out.println("x"); } while (false);')).toEqual([]);
  });
});

describe('verificarAlcanzabilidad — condición constante "true" cuenta como ciclo sin fin (REQ-COMP-010, escenario verificado)', () => {
  it('"while (1 < 2) { }" seguido de otra sentencia: la sentencia posterior se rechaza, IGUAL que si la condición fuera "true"', () => {
    const problemas = alcanzabilidadDeCuerpo('while (1 < 2) { } System.out.println("nunca");');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]?.codigo).toBe('sentencia-inalcanzable');
  });

  it('triangulación: "while (true) { }" (el literal directo) da EXACTAMENTE el mismo resultado', () => {
    const problemas = alcanzabilidadDeCuerpo('while (true) { } System.out.println("nunca");');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]?.codigo).toBe('sentencia-inalcanzable');
  });

  it('triangulación: "for (;;)" (condición OMITIDA, JLS 14.21: cuenta como constante true) da el mismo resultado', () => {
    const problemas = alcanzabilidadDeCuerpo('for (;;) { } System.out.println("nunca");');
    expect(problemas.some((p) => p.codigo === 'sentencia-inalcanzable')).toBe(true);
  });

  it('excepción real (JLS 14.21): "while (true) { x = 1; break; }" seguido de otra sentencia SÍ es alcanzable (hay un "break" que cierra el ciclo)', () => {
    expect(alcanzabilidadDeCuerpo('int x = 0; while (true) { x = 1; break; } System.out.println(x);')).toEqual([]);
  });

  it('control negativo del "break": un "break" DENTRO de un "while" ANIDADO no cuenta para el ciclo EXTERNO (el break más cercano es del interno)', () => {
    const problemas = alcanzabilidadDeCuerpo(
      'while (true) { while (true) { break; } } System.out.println("nunca");',
    );
    expect(problemas.some((p) => p.codigo === 'sentencia-inalcanzable')).toBe(true);
  });
});

describe('verificarAlcanzabilidad — "if (false)" está EXENTO (design.md §2.7, asimetría real con while/for)', () => {
  it('"if (false) { System.out.println("x"); }" NUNCA rechaza el cuerpo del "then" (a diferencia de "while(false)")', () => {
    expect(alcanzabilidadDeCuerpo('if (false) { System.out.println("comentado"); }')).toEqual([]);
  });

  it('triangulación: "if (true) { ... } else { ... }" tampoco rechaza la rama "else" (ninguna rama se descarta por el valor de la condición)', () => {
    expect(alcanzabilidadDeCuerpo('if (true) { System.out.println("a"); } else { System.out.println("b"); }')).toEqual([]);
  });

  it('control: código DESPUÉS de un "if" (con o sin "else") sigue siendo alcanzable, incluso si una rama termina en "return"', () => {
    expect(alcanzabilidadDeCuerpo('int x = 5; if (x > 0) { return; } System.out.println("alcanzable");')).toEqual([]);
  });
});

// Deuda 3 del commit 999a8ca (JLS 4.12.4, "variable constante"), verificación pedida por el
// orquestador: "final boolean X = true; while (X) {} System.out.println();" -> sentencia
// inalcanzable — una variable "final" con inicializador constante cuenta EXACTAMENTE igual que el
// literal equivalente para "condición constante" (el evaluador se comparte con `constantes.ts`).
describe('verificarAlcanzabilidad — condición constante vía variable "final" (deuda 3 del commit 999a8ca, JLS 4.12.4)', () => {
  it('"final boolean X = true; while (X) {} System.out.println();" rechaza la impresión final', () => {
    const problemas = alcanzabilidadDeCuerpo('final boolean X = true; while (X) { } System.out.println();');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]?.codigo).toBe('sentencia-inalcanzable');
  });

  it('control: SIN "final" (variable normal), "X" ya NO es una condición constante -- nada se rechaza', () => {
    expect(alcanzabilidadDeCuerpo('boolean x = true; while (x) { break; } System.out.println("alcanzable");')).toEqual([]);
  });
});

describe('verificarAlcanzabilidad — varios problemas: se devuelven TODOS, ordenados por posición en el texto', () => {
  it('dos "return" en bloques distintos, cada uno con su propia cola inalcanzable', () => {
    const problemas = alcanzabilidadDeCuerpo(
      'if (true) { return; System.out.println("muerto1"); } System.out.println("vivo"); return; System.out.println("muerto2");',
    );
    expect(problemas).toHaveLength(2);
    expect(problemas[0]!.rango.inicio).toBeLessThan(problemas[1]!.rango.inicio);
  });
});
