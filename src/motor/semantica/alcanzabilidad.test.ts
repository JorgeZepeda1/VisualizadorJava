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

// Corrección obligatoria (sub-lote 1-D2a, JLS 14.22): antes, "switch" era CONSERVADOR a propósito
// (D2, "case 'switch': return alcanzable;" sin bajar a sus elementos) y NUNCA marcaba inalcanzable
// lo que sigue, aunque javac SÍ lo rechace cuando el switch tiene "default" y NINGÚN grupo puede
// completar normalmente. Reglas reales verificadas contra javac 17 real (carpetas temporales,
// borradas al terminar, CLAUDE.md): un switch completa normalmente sii (a) NO tiene "default" (el
// selector podría no coincidir con ningún "case", el switch entero se salta), O (b) tiene un
// "break" que estructuralmente le pertenece (sin filtrar por si ese break en sí es alcanzable dentro
// de su propio grupo -- verificado que un "break" muerto tras un "return" en el MISMO grupo TODAVÍA
// cuenta, igual que ya hacían los ciclos de 1.12: un solo error, el del break muerto, nunca dos), O
// (c) el ÚLTIMO grupo (textual) completa normal por sí mismo (cae al fondo sin return/throw/break,
// incluido un grupo vacío al final). El selector usa "args.length" (no constante) en todos los
// casos para que el resultado no dependa del valor real del selector, igual que las pruebas ad-hoc.
describe('verificarAlcanzabilidad — "switch" (JLS 14.22, corrección sub-lote 1-D2a)', () => {
  it('SIN "default": alcanzable SIEMPRE, aunque TODOS los "case" terminen en "return" (el selector podría no coincidir con ninguno)', () => {
    const problemas = alcanzabilidadDeCuerpo(
      'int n = args.length; switch (n) { case 1: return; case 2: return; } System.out.println("despues");',
    );
    expect(problemas).toEqual([]);
  });

  it('CON "default", TODOS los grupos retornan y SIN "break": la sentencia posterior es inalcanzable', () => {
    const problemas = alcanzabilidadDeCuerpo(
      'int n = args.length; switch (n) { case 1: return; case 2: return; default: return; } System.out.println("despues");',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'sentencia-inalcanzable' });
  });

  it('CON "default" pero un "case" con "break" alcanzable: la sentencia posterior SÍ es alcanzable', () => {
    const problemas = alcanzabilidadDeCuerpo(
      'int n = args.length; switch (n) { case 1: break; case 2: return; default: return; } System.out.println("despues");',
    );
    expect(problemas).toEqual([]);
  });

  it('caída entre grupos (fallthrough) SIN "break": "case 1" cae a "case 2", que retorna -- CON "default" que también retorna: inalcanzable', () => {
    const problemas = alcanzabilidadDeCuerpo(
      'int n = args.length; switch (n) { case 1: case 2: return; default: return; } System.out.println("despues");',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'sentencia-inalcanzable' });
  });

  it('control negativo del "break": un "break" DENTRO de un "while" ANIDADO no cuenta para el "switch" externo (mismo principio que 1.12 con ciclos)', () => {
    const problemas = alcanzabilidadDeCuerpo(
      'int n = args.length; switch (n) { case 1: while (true) { break; } return; default: return; } System.out.println("despues");',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'sentencia-inalcanzable' });
  });

  it('el ÚLTIMO grupo (textual) NO termina en return/break (cae al fondo del switch): alcanzable, SIN necesitar ningún "break"', () => {
    const problemas = alcanzabilidadDeCuerpo(
      'int n = args.length; switch (n) { case 1: System.out.println("uno"); break; default: System.out.println("otro"); } System.out.println("despues");',
    );
    expect(problemas).toEqual([]);
  });

  it('triangulación: la posición de "default" NO importa -- en medio, sin "break" en ningún grupo, sigue inalcanzable', () => {
    const problemas = alcanzabilidadDeCuerpo(
      'int n = args.length; switch (n) { case 1: return; default: return; case 2: return; } System.out.println("despues");',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'sentencia-inalcanzable' });
  });
});

// Tarea 1.29 (causa 14, hallada por el fuzzer diferencial de sentencias contra javac 17, 73 falsos aceptos en 18 000
// programas): dos reglas de JLS 14.22 que el modelo no cumplía. (1) El CUERPO de un `while`/`for` con condición constante
// `false` es una sentencia inalcanzable en sí misma — javac la señala en el cuerpo (la «{» de un bloque), aunque el bloque
// esté vacío; el modelo solo miraba las sentencias DENTRO del cuerpo, así que `while (false) { }` pasaba. (2) Un `do-while`
// completa normalmente sii (su cuerpo completa normalmente O tiene un `continue` alcanzable que lo apunta) Y la condición no es
// la constante `true`, O tiene un `break` que lo cierra; el modelo solo miraba la condición, y decía que un `do` cuyo cuerpo
// no termina nunca (`do { return; } while (c);`, un bucle infinito dentro) completaba, dejando sin error lo que sigue. Cada
// fuente se compiló con javac 17 real (veredicto en el título de cada caso).
describe('verificarAlcanzabilidad — cuerpo de while/for con condición `false` y cuándo completa un do-while (JLS 14.22, tarea 1.29)', () => {
  const alCompilarConJavac: ReadonlyArray<readonly [string, string]> = [
    ['do { } while (false) SÍ ejecuta su cuerpo: es alcanzable',
     'do { } while (false);'],
    ['un continue alcanzable hace que la condición sea alcanzable',
     'int n = 1; do { if (n > 5) continue; return; } while (n > 0); System.out.println(n);'],
    ['un break alcanzable hace que el do complete',
     'int n = 1; do { if (n > 5) break; return; } while (n > 0); System.out.println(n);'],
    ['un continue dentro de un switch sigue siendo del do',
     'int n = 1; do { switch (n) { case 0: continue; default: return; } } while (n > 0); System.out.println(n);'],
    ['el caso normal sigue igual',
     'int n = 1; do { n++; } while (n < 5); System.out.println(n);'],
    ['do { break; } while (true); es alcanzable después',
     'do { break; } while (true); System.out.println(1);'],
    ['do { break; } while (n > 0): el break sale',
     'int n = 1; do { break; } while (n > 0); System.out.println(n);'],
    ['do { continue; } while (n > 0): el continue lleva a la condición',
     'int n = 1; do { continue; } while (n > 0); System.out.println(n);'],
  ];

  it.each(alCompilarConJavac)('javac 17 lo COMPILA: %s', (_descripcion, cuerpo) => {
    expect(alcanzabilidadDeCuerpo(cuerpo)).toEqual([]);
  });

  const alRechazarConJavac: ReadonlyArray<readonly [string, string]> = [
    ['el cuerpo de while (false) es inalcanzable aunque sea un bloque vacío',
     'while (false) { }'],
    ['el cuerpo de while (false) es inalcanzable aunque sea UNA sentencia',
     'int x = 0; while (false) x++;'],
    ['el cuerpo de for con condición false es inalcanzable aunque esté vacío',
     'for (int i = 0; false; i++) { }'],
    ['una condición constante compuesta que vale false',
     'while (\'\\n\' == \'x\') { }'],
    ['while (false) dentro de otro bucle',
     'for (int i = 0; i < 3; i++) { while (false) { } }'],
    ['do { return; } while (n > 0); y luego una sentencia',
     'int n = 1; do { return; } while (n > 0); System.out.println(n);'],
    ['el cuerpo es un bucle infinito: el do no completa',
     'int n = 1; do { while (true) { } } while (n > 0); System.out.println(n);'],
    ['do { do { } while (true); } while (false);',
     'do { do { } while (true); } while (false); System.out.println(1);'],
    ['con condición true el do nunca completa aunque haya continue',
     'do { continue; } while (true); System.out.println(1);'],
    ['el continue del for interior no es del do: el do no completa',
     'int n = 1; do { for (;;) { if (n > 0) continue; } } while (n > 0); System.out.println(n);'],
  ];

  it.each(alRechazarConJavac)('javac 17 lo RECHAZA («unreachable statement»): %s', (_descripcion, cuerpo) => {
    const problemas = alcanzabilidadDeCuerpo(cuerpo);
    expect(problemas.length).toBeGreaterThanOrEqual(1);
    expect(problemas[0]).toMatchObject({ codigo: 'sentencia-inalcanzable' });
  });

  it('el aviso del cuerpo inalcanzable de while (false) señala el cuerpo mismo, en la línea de su «{» (como javac)', () => {
    const fuente = 'class C { public static void main(String[] a) {\n  while (false) {\n    System.out.println(1);\n  }\n} }';
    const problemas = verificarAlcanzabilidad(analizarPrograma(tokenizar(fuente)));
    expect(problemas).toHaveLength(1);
    expect(fuente.slice(problemas[0]!.rango.inicio, problemas[0]!.rango.inicio + 1)).toBe('{');
  });
});
