// RED de la tarea 1.13 (Asignación definitiva, JLS 16, REQ-COMP-004) · depende de 1.12. Pasada 4 de
// ADR 004 (léxico+sintaxis → atribución → alcanzabilidad → **asignación definitiva** → arranque),
// standalone por ahora — igual que `atribucion.ts`/`alcanzabilidad.ts`: 1.14 la conecta a
// `compilador.ts` (fuera de este sub-lote; el orquestador dijo explícitamente "NO hagas 1.14 en
// adelante"). Reglas reales de JLS 16, restringidas al subconjunto — cada bloque `describe` cita su
// verificación (exploracion/03 §4.4, o ad-hoc contra javac 17 real de esta sesión para lo que §4.4
// no cubre: switch con default, &&/||/!).
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { analizarPrograma } from '../sintaxis/analizador-sintactico.ts';
import { verificarAsignacionDefinitiva } from './asignacion-definitiva.ts';

function asignacionDefinitivaDeCuerpo(cuerpoDeMain: string) {
  const programa = analizarPrograma(tokenizar(`class C { public static void main(String[] a) { ${cuerpoDeMain} } }`));
  return verificarAsignacionDefinitiva(programa);
}

// Red de seguridad (mismo patrón que `atribucion.test.ts`/`alcanzabilidad.test.ts`): un programa
// válido que combina TODAS las construcciones de esta tarea (declaraciones con/sin inicializador,
// if/else, while/for/do-while, switch con default, final, &&/||) no debe producir NINGÚN problema
// -- cruza las 9 reglas entre sí, algo que las pruebas de un solo `describe` no garantizan.
describe('verificarAsignacionDefinitiva — programa válido que combina TODAS las construcciones: sin problemas', () => {
  it('declaraciones, if/else, while/for/do-while, switch con default, final y && -- todo bien asignado', () => {
    const problemas = asignacionDefinitivaDeCuerpo(`
      int a;
      int n = 1;
      if (n > 0) { a = 1; } else { a = 2; }
      System.out.println(a);
      int b;
      while (true) { b = 1; break; }
      System.out.println(b);
      int c;
      for (int i = 0; i < 3; i++) { c = i; }
      int d;
      do { d = 1; } while (n > 0);
      System.out.println(d);
      int e;
      switch (n) { case 1: e = 1; break; default: e = 2; break; }
      System.out.println(e);
      final int f = 5;
      System.out.println(f);
      int g;
      if (n > 0 && (g = n) > 0) { System.out.println(g); }
    `);
    expect(problemas).toEqual([]);
  });
});

// exploracion/03 §4.4 punto 1 (err05): "Declaración sin inicializador + uso sin asignación previa
// garantizada -> error."
describe('verificarAsignacionDefinitiva — declaración sin inicializador + uso sin asignación previa (REQ-COMP-004, err05)', () => {
  it('"int x; System.out.println(x);" se rechaza: "x" podría no estar asignada', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int x; System.out.println(x);');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'x' } });
  });

  it('control: CON inicializador, el mismo uso NO se rechaza', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int x = 5; System.out.println(x);');
    expect(problemas).toEqual([]);
  });
});

// JLS 16.1.8: una asignación simple ("x = valor;") deja "x" definitivamente asignada para las
// lecturas POSTERIORES en el mismo camino secuencial (base de todas las reglas de flujo de esta
// tarea: if/while/for solo tienen sentido si una asignación straight-line ya funciona).
describe('verificarAsignacionDefinitiva — una asignación ("x = valor;") satisface el uso posterior', () => {
  it('"int x; x = 5; System.out.println(x);" NO se rechaza: la asignación ocurrió antes del uso', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int x; x = 5; System.out.println(x);');
    expect(problemas).toEqual([]);
  });

  it('triangulación: el ORDEN importa -- "int x; System.out.println(x); x = 5;" SÍ se rechaza (el uso viene ANTES)', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int x; System.out.println(x); x = 5;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'x' } });
  });
});

// exploracion/03 §4.4 punto 2 (err06/control err07): tras "if"/"else", "x" queda definitivamente
// asignada SOLO si se asigna en AMBAS ramas, o una rama asigna y la otra termina abruptamente
// (return/break/continue). Sin "else", NUNCA queda garantizada, aunque el "if" a ojo humano cubra
// "todos los casos posibles" -- el compilador no razona sobre el VALOR de la condición (salvo que
// sea una constante booleana literal, que no aplica a "if"/"else" en JLS 16 -- esa excepción es
// exclusiva de while/for, un ciclo posterior de esta misma tarea).
describe('verificarAsignacionDefinitiva — "if"/"else" (REQ-COMP-004, err06/err07)', () => {
  it('err06: "if" SIN "else" que asigna en el "then" NUNCA garantiza -- se rechaza', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int x; int n = 1; if (n > 0) { x = 1; } System.out.println(x);');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'x' } });
  });

  it('err07 control: "if"/"else" donde AMBAS ramas asignan SÍ garantiza -- no se rechaza', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int x; int n = 1; if (n > 0) { x = 1; } else { x = 2; } System.out.println(x);');
    expect(problemas).toEqual([]);
  });

  it('triangulación: una rama asigna y la otra termina abruptamente ("return") -- SÍ garantiza', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int x; int n = 1; if (n > 0) { x = 1; } else { return; } System.out.println(x);');
    expect(problemas).toEqual([]);
  });

  it('triangulación (simétrica): el "then" termina abruptamente y el "else" asigna -- también garantiza', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int x; int n = 1; if (n > 0) { return; } else { x = 1; } System.out.println(x);');
    expect(problemas).toEqual([]);
  });

  it('control negativo: SOLO una rama asigna y la otra NO termina abruptamente (solo imprime) -- sigue sin garantizar', () => {
    const problemas = asignacionDefinitivaDeCuerpo(
      'int x; int n = 1; if (n > 0) { x = 1; } else { System.out.println("otro"); } System.out.println(x);',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'x' } });
  });
});

// exploracion/03 §4.4 puntos 3 y 5 (err09/err10): "while(condición)" y "for(condición)" con
// condición NO constante NUNCA garantizan asignación después del ciclo, aun si el cuerpo asigna en
// TODAS las vueltas -- el compilador no sabe que el cuerpo corre al menos una vez (podría correr
// CERO veces). La excepción real (condición constante "true"/ausente) es un ciclo posterior de
// esta misma tarea.
describe('verificarAsignacionDefinitiva — "while"/"for" con condición NO constante NUNCA garantizan (err09/err10)', () => {
  it('err09: "while (n > 0) { x = 1; ... }" -- el cuerpo podría no correr ni una vez, se rechaza', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int x; int n = 1; while (n > 0) { x = 1; n = 0; } System.out.println(x);');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'x' } });
  });

  it('err10: "for (...; i < 3; ...) { x = i; }" -- un "for" puede ejecutarse cero veces, se rechaza', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int x; for (int i = 0; i < 3; i++) { x = i; } System.out.println(x);');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'x' } });
  });

  it('el CUERPO de "while" SÍ se recorre de verdad: una lectura sin asignar DENTRO del cuerpo se reporta (no basta con no tocar nada)', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int n = 1; while (n > 0) { int y; System.out.println(y); n = 0; }');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'y' } });
  });

  it('el CUERPO de "for" SÍ se recorre de verdad: una lectura sin asignar DENTRO del cuerpo se reporta', () => {
    const problemas = asignacionDefinitivaDeCuerpo('for (int i = 0; i < 3; i++) { int y; System.out.println(y); }');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'y' } });
  });

  it('el alcance del "for" NO deja rastro: una "i" declarada DESPUÉS de que el "for" cierra (mismo nombre, variable DISTINTA) sigue sin asignar', () => {
    // "for (int i = 0; ...) { }" cierra su propio alcance con "i" YA asignada (tiene inicializador)
    // -- una "i" DISTINTA, declarada después en el bloque contenedor (legal: la del "for" ya no
    // vive), NO debe heredar ese estado "asignada" por compartir el nombre.
    const problemas = asignacionDefinitivaDeCuerpo('for (int i = 0; i < 3; i++) { } int i; System.out.println(i);');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'i' } });
  });
});

// exploracion/03 §4.4 punto 4 (err08, JLS 16.2.11): "while(true)" (condición CONSTANTE true) es un
// caso especial -- el compilador SABE que el ciclo jamás termina por su condición, así que la
// asignación definitiva después del ciclo se calcula sobre los puntos de "break": si TODO "break"
// alcanzable ocurre DESPUÉS de asignar la variable, queda definitivamente asignada. "for(;;)"
// (condición ausente) cuenta igual (JLS 14.21, ya verificado en `alcanzabilidad.ts`, 1.12).
describe('verificarAsignacionDefinitiva — "while(true)"/"for(;;)" + "break" (REQ-COMP-004, err08)', () => {
  it('err08: "while (true) { x = 1; break; }" -- SÍ garantiza (el único "break" ocurre tras asignar)', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int x; while (true) { x = 1; break; } System.out.println(x);');
    expect(problemas).toEqual([]);
  });

  it('triangulación: "for (;;) { x = 1; break; }" -- misma garantía (condición ausente cuenta como constante "true")', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int x; for (;;) { x = 1; break; } System.out.println(x);');
    expect(problemas).toEqual([]);
  });

  it('negativo: "while (true) { if (n > 0) { break; } x = 1; }" -- ese "break" ocurre ANTES de asignar, NO garantiza', () => {
    const problemas = asignacionDefinitivaDeCuerpo(
      'int x; int n = 1; while (true) { if (n > 0) { break; } x = 1; } System.out.println(x);',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'x' } });
  });

  it('triangulación positiva: el "break" está DENTRO de un "if" pero SIEMPRE después de asignar en ese camino -- SÍ garantiza', () => {
    const problemas = asignacionDefinitivaDeCuerpo(
      'int x; int n = 1; while (true) { if (n > 0) { x = 1; break; } } System.out.println(x);',
    );
    expect(problemas).toEqual([]);
  });
});

// exploracion/03 §4.4 punto 6 (err10b, JLS 14.22.2/16.2.10): "do { ... } while(condición);" ejecuta
// su cuerpo SIEMPRE al menos una vez, sin importar la condición. Si el cuerpo asigna la variable de
// forma INCONDICIONAL, queda definitivamente asignada después del ciclo -- a diferencia de
// "while(condición)"/"for(condición)" (err09/err10), que NUNCA lo garantizan.
describe('verificarAsignacionDefinitiva — "do-while" garantiza si el cuerpo asigna incondicionalmente (err10b)', () => {
  it('err10b: "do { x = 1; } while (n > 0);" -- el cuerpo corre siempre al menos una vez, garantiza', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int x; int n = 1; do { x = 1; } while (n > 0); System.out.println(x);');
    expect(problemas).toEqual([]);
  });

  it('negativo: la asignación DENTRO del cuerpo es CONDICIONAL ("if" sin garantía) -- sigue sin garantizar', () => {
    const problemas = asignacionDefinitivaDeCuerpo(
      'int x; int n = 1; do { if (n > 0) { x = 1; } } while (n > 0); System.out.println(x);',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'x' } });
  });

  it('triangulación: el cuerpo asigna y luego "break" incondicional (sale en la primera vuelta) -- también garantiza', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int x; int n = 1; do { x = 1; break; } while (n > 0); System.out.println(x);');
    expect(problemas).toEqual([]);
  });
});

// "switch" con "default" (JLS 16.2.9) -- no cubierto por exploracion/03 §4.4 (solo enumera
// if/while/for/do-while/final); verificado AD-HOC contra javac 17 real en esta sesión (carpetas
// temporales, ya borradas, DA_A..DA_D2 del reporte de la tarea). Reglas: (a) SIN "default", nunca
// garantiza (el selector podría no coincidir con ningún "case", igual que la razón de
// `alcanzabilidad.ts` para su propia corrección de switch en este mismo sub-lote); (b) CON
// "default", garantiza sii TODO grupo que pueda "salir" del switch (por "break" o cayendo al fondo
// del último grupo) ya asignó la variable en ese camino -- misma intersección que "if"/"else".
describe('verificarAsignacionDefinitiva — "switch" con "default" (JLS 16.2.9, verificado ad-hoc contra javac 17 real)', () => {
  it('DA_A: CON "default", cada grupo asigna y sale con "break" -- garantiza', () => {
    const problemas = asignacionDefinitivaDeCuerpo(
      'int x; int n = 1; switch (n) { case 1: x = 1; break; case 2: x = 2; break; default: x = 3; break; } System.out.println(x);',
    );
    expect(problemas).toEqual([]);
  });

  it('DA_B: SIN "default" -- nunca garantiza, aunque todos los "case" existentes asignen', () => {
    const problemas = asignacionDefinitivaDeCuerpo(
      'int x; int n = 1; switch (n) { case 1: x = 1; break; case 2: x = 2; break; } System.out.println(x);',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'x' } });
  });

  it('DA_C: CON "default", pero un "case" olvida asignar antes de su "break" -- no garantiza', () => {
    const problemas = asignacionDefinitivaDeCuerpo(
      'int x; int n = 1; switch (n) { case 1: x = 1; break; case 2: break; default: x = 3; break; } System.out.println(x);',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'x' } });
  });

  it('DA_D: CON "default", el ÚLTIMO grupo asigna y cae al fondo del switch SIN "break" -- garantiza igual', () => {
    const problemas = asignacionDefinitivaDeCuerpo(
      'int x; int n = 1; switch (n) { case 1: x = 1; break; default: x = 2; } System.out.println(x);',
    );
    expect(problemas).toEqual([]);
  });

  it('DA_D2: CON "default", el ÚLTIMO grupo cae al fondo SIN asignar -- no garantiza', () => {
    const problemas = asignacionDefinitivaDeCuerpo(
      'int x; int n = 1; switch (n) { case 1: x = 1; break; default: System.out.println("sin asignar"); } System.out.println(x);',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'x' } });
  });
});

// exploracion/03 §4.4 punto 7 (err10c, JLS 4.12.4 + 16.1): una "final" solo admite UNA asignación
// total. Descubrimiento de esta tarea (verificado contra el propio analizador sintáctico, tarea
// 1.6): "final sin inicializador" ("blank final", p. ej. "final int x;") es NO-DISP desde la
// SINTAXIS (REQ-SUB-007) -- nunca llega a esta pasada como una declaración real, así que los
// escenarios de "blank final" verificados ad-hoc contra javac 17 real (FIN_A/B/C del reporte de la
// tarea) NO APLICAN a este subconjunto y se descartaron; toda "final" real de este subconjunto
// SIEMPRE tiene su inicializador, así que CUALQUIER asignación posterior es ilegal sin excepción,
// sin necesitar mirar el flujo (if/else, ciclos, switch...).
describe('verificarAsignacionDefinitiva — reasignación de "final" (err10c, JLS 4.12.4/16.1)', () => {
  it('err10c: "final int x = 5; x = 10;" -- cualquier reasignación se rechaza', () => {
    const problemas = asignacionDefinitivaDeCuerpo('final int x = 5; x = 10;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-final-reasignada', datos: { nombre: 'x' } });
  });

  it('triangulación: otro tipo/nombre y una asignación COMPUESTA ("listo += ...") -- la regla no depende del nombre "x" ni del "="', () => {
    const problemas = asignacionDefinitivaDeCuerpo('final boolean listo = true; listo = false;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-final-reasignada', datos: { nombre: 'listo' } });
  });

  it('control negativo: una variable NO "final" se puede reasignar libremente -- nunca se rechaza', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int y = 5; y = 10; y = 20;');
    expect(problemas).toEqual([]);
  });
});

// "asignada si verdadero"/"asignada si falso" en "&&"/"||"/"!" (JLS 16.1.2-16.1.4) -- no cubierto
// por exploracion/03 §4.4 (solo enumera if/while/for/do-while/final); verificado AD-HOC contra
// javac 17 real en esta sesión (DA_E..DA_I del reporte de la tarea). Solo importa cuando hay una
// ASIGNACIÓN dentro de un operando de "&&"/"||" (el patrón clásico "cond && (x = expr) > 0"): la
// rama que SOLO se alcanza cuando el operando con la asignación de verdad se evaluó queda con "x"
// asignada; la otra rama (donde pudo no evaluarse por cortocircuito) NO.
describe('verificarAsignacionDefinitiva — "asignada si verdadero/si falso" en "&&"/"||"/"!" (JLS 16.1.2-16.1.4)', () => {
  it('DA_E: "&&" -- la rama "then" SÍ ve asignada "x" (ambos operandos se evaluaron para llegar aquí)', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int n = 1; int x; if (n > 0 && (x = n) > 0) { System.out.println(x); }');
    expect(problemas).toEqual([]);
  });

  it('DA_F: "&&" -- la rama "else" NO ve asignada "x" (el operando izquierdo pudo ser falso solo, sin evaluar el derecho)', () => {
    const problemas = asignacionDefinitivaDeCuerpo(
      'int n = 1; int x; if (n > 0 && (x = n) > 0) { } else { System.out.println(x); }',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'x' } });
  });

  it('DA_G: "||" -- la rama "else" SÍ ve asignada "x" (el izquierdo fue falso, así que el derecho SÍ se evaluó)', () => {
    const problemas = asignacionDefinitivaDeCuerpo(
      'int n = 1; int x; if (n > 0 || (x = n) > 0) { } else { System.out.println(x); }',
    );
    expect(problemas).toEqual([]);
  });

  it('DA_H: "||" -- la rama "then" NO ve asignada "x" (el izquierdo pudo ser verdadero solo, cortocircuito)', () => {
    const problemas = asignacionDefinitivaDeCuerpo('int n = 1; int x; if (n > 0 || (x = n) > 0) { System.out.println(x); }');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'x' } });
  });

  it('DA_I: "!" invierte verdadero/falso -- el "else" de un "!(&&...)" es el "then" del "&&" interno (SÍ ve asignada "x")', () => {
    const problemas = asignacionDefinitivaDeCuerpo(
      'int n = 1; int x; if (!(n > 0 && (x = n) > 0)) { System.out.println("no"); } else { System.out.println(x); }',
    );
    expect(problemas).toEqual([]);
  });
});

// Tarea 1.29: el modelo de «asignada si verdadero/falso» (JLS 16.1) recorre cada condición UNA sola vez. Una primera versión
// recalculaba los dos estados de cada subexpresión desde cada nivel y su costo crecía como n⁴ (240 términos: 6,3 s; en `HEAD`, 2 ms).
// Una condición larga es rara, pero el motor no debe colgarse por escribirla: se mide con un margen de 100× sobre lo esperado, para
// que la prueba no dependa de la velocidad de la máquina y solo falle ante una explosión de verdad.
describe('verificarAsignacionDefinitiva — una condición larga no explota (JLS 16.1, tarea 1.29)', () => {
  function milisegundosDe(cuerpoDeMain: string): number {
    const programa = analizarPrograma(tokenizar(`class C { public static void main(String[] a) { int n = 1; ${cuerpoDeMain} } }`));
    const inicio = Date.now();
    verificarAsignacionDefinitiva(programa);
    return Date.now() - inicio;
  }

  it.each([
    ['cadena de 240 «&&»', `if (${Array.from({ length: 240 }, (_, i) => `n > ${i}`).join(' && ')}) { n = 2; }`],
    ['cadena de 240 «||»', `while (${Array.from({ length: 240 }, (_, i) => `n > ${i}`).join(' || ')}) { n--; }`],
    [
      '«&&» con «||» anidados a 240 niveles',
      `boolean r = ${Array.from({ length: 240 }).reduce<string>((anterior, _, i) => `(${anterior} && (n < ${i + 5} || n == ${i}))`, 'n > 0')}; System.out.println(r);`,
    ],
  ])('%s se analiza en menos de un segundo', (_descripcion, cuerpo) => {
    expect(milisegundosDe(cuerpo)).toBeLessThan(1000);
  });
});

// Tarea 1.29 (causa 13, hallada por el fuzzer diferencial de sentencias contra javac 17, ~36 falsos rechazos en
// 18 000 programas): el modelo de asignación definida no implementaba JLS 16.1.1 — una expresión CONSTANTE
// (`true`, `!(1 == 1)`, una `final` con inicializador constante) deja «vacuamente» asignada CUALQUIER variable
// en la rama que nunca ocurre («V is DA after any constant expression whose value is true when false»), y esa
// regla se compone por `&&`/`||`/`!` (`n > 0 || true` no es constante, pero «asignada si falso» sí es vacua por su
// operando `true`). Un `if (DEBUG) { x = 1; }` con `final boolean DEBUG = true;` daba «variable posiblemente no
// asignada», un error FALSO. Además el modelo evaluaba `&&`/`||` como un valor SECUENCIAL (aceptaba de más
// `boolean r = c && (x = 1) > 0;` y usar x después) y los bucles no usaban «asignada si verdadero/falso» de su
// condición ni el estado tras el cuerpo (con sus `continue`) para la actualización del `for` y la condición del
// `do-while`. El estado «vacuo» cubre solo las variables YA declaradas en ese punto (como el rango de bits de javac):
// una declarada después, en otro grupo de `case`, sigue sin asignar; y al cerrarse un alcance sus variables MUEREN del
// estado (la `x` de un `for` ya cerrado no cuenta para otra `x` posterior). Como `scanCond` de javac, una constante booleana como
// operando de `!`/`&&`/`||` o como condición no se recorre (no se le exige estar asignada); leída como valor (`x + 1`), sí. Cada fuente se compiló con javac 17 real
// (veredicto en el título de cada caso); las que compilan NO deben dar ningún problema y las que no, exactamente el de `x`.
describe('verificarAsignacionDefinitiva — condiciones constantes y «asignada si verdadero/falso» en valores y bucles (JLS 16.1.1, 16.2, tarea 1.29)', () => {
  const alCompilarConJavac: ReadonlyArray<readonly [string, string]> = [
    ['if (true) { x = 1; } y luego se lee x',
     'int x; if (true) { x = 1; } System.out.println(x);'],
    ['la rama else de if (true) nunca corre: leer x ahí no es error',
     'int x; if (true) { } else { System.out.println(x); }'],
    ['el then de if (false) nunca corre: leer x ahí no es error',
     'int x; if (false) { System.out.println(x); }'],
    ['if (false) { } else { x = 1; } y luego se lee x',
     'int x; if (false) { } else { x = 1; } System.out.println(x);'],
    ['true || x > 0: el operando derecho nunca se evalúa',
     'int x; if (true || x > 0) { }'],
    ['false && x > 0: el operando derecho nunca se evalúa',
     'int x; if (false && x > 0) { }'],
    ['la constante es !(1 == 1), es decir false',
     'int x; if (!(1 == 1)) { System.out.println(x); }'],
    ['una variable final con inicializador constante es una constante',
     'final boolean DEBUG = true; int x; if (DEBUG) { x = 1; } System.out.println(x);'],
    ['final false: el then no corre, el else asigna',
     'final boolean K = false; int x; if (K) { System.out.println(x); } else { x = 1; } System.out.println(x);'],
    ['b || true NO es constante, pero asignada-si-falso es vacua por el operando true',
     'int n = 1; int x; if (n > 0 || true) { x = 1; } System.out.println(x);'],
    ['while (true || x > 0)',
     'int x; while (true || x > 0) { break; }'],
    ['boolean r = true || x > 0',
     'int x; boolean r = true || x > 0;'],
    ['boolean r = false && x > 0',
     'int x; boolean r = false && x > 0; System.out.println(r);'],
    ['boolean r = !(true && (x = 1) > 0)',
     'int x; boolean r = !(true && (x = 1) > 0); System.out.println(r);'],
    ['if (b) { x = 1; } else if (true) { x = 2; } y luego se lee x',
     'int n = 1; int x; if (n > 0) { x = 1; } else if (true) { x = 2; } System.out.println(x);'],
    ['if (true) { x = 1; } dentro de un case',
     'int n = 1; int x; switch (n) { case 0: if (true) { x = 1; } break; default: x = 2; } System.out.println(x);'],
    ['while (n > 0 || true) { x = 1; break; }: asignada-si-falso vacua',
     'int n = 1; int x; while (n > 0 || true) { x = 1; break; } System.out.println(x);'],
    ['for (...; i += x) { x = 1; }: la actualización corre tras el cuerpo',
     'int x; for (int i = 0; i < 3; i += x) { x = 1; }'],
    ['while (c && (x = 1) > 0) { leer x }',
     'int n = 1; int x; while (n > 0 && (x = 1) > 0) { System.out.println(x); }'],
    ['while (c || (x = 1) > 0) { } y luego se lee x: falso implica que el derecho se evaluó',
     'int n = 1; int x; while (n > 0 || (x = 1) > 0) { } System.out.println(x);'],
    ['do { x = 1; } while (c && x > 0)',
     'int n = 1; int x; do { x = 1; } while (n > 0 && x > 0); System.out.println(x);'],
    ['do { } while (true);',
     'int x; do { } while (true);'],
    ['do { x = 1; } while (false); y luego se lee x',
     'int x; do { x = 1; } while (false); System.out.println(x);'],
    ['for (...; (x = i) < 3; ...) { } y luego se lee x',
     'int x; for (int i = 0; (x = i) < 3; i++) { } System.out.println(x);'],
    ['while (true) { if (c) { x = 1; break; } }',
     'int n = 1; int x; while (true) { if (n > 0) { x = 1; break; } } System.out.println(x);'],
    ['for (;;) { x = 1; if (x > 0) break; }',
     'int x; for (;;) { x = 1; if (x > 0) break; } System.out.println(x);'],
    ['una final booleana constante declarada en otro case y usada como operando de ! no se recorre: javac no la exige asignada',
     'int n = 1; switch (n) { case 0: final boolean x = true; case 1: boolean r = !x; System.out.println(r); }'],
    ['lo mismo como operando de &&',
     'int n = 1; switch (n) { case 0: final boolean x = false; case 1: boolean r = x && n > 0; System.out.println(r); }'],
    ['y como condición de un if',
     'int n = 1; switch (n) { case 0: final boolean x = false; case 1: if (x) { n = 2; } }'],
  ];

  it.each(alCompilarConJavac)('javac 17 lo COMPILA: %s', (_descripcion, cuerpo) => {
    expect(asignacionDefinitivaDeCuerpo(cuerpo)).toEqual([]);
  });

  const alRechazarConJavac: ReadonlyArray<readonly [string, string]> = [
    ['boolean r = c && (x = 1) > 0; y luego se lee x: si c es falso, x no se asignó',
     'int n = 1; int x; boolean r = n > 0 && (x = 1) > 0; System.out.println(x);'],
    ['el continue salta a la actualización sin haber asignado x',
     'int x; for (int i = 0; i < 3; i += x) { if (i > 5) continue; x = 1; }'],
    ['el continue salta a la condición sin haber asignado x',
     'int n = 1; int x; do { if (n > 5) continue; x = 1; } while (x > 0);'],
    ['if (false && (x = 1) > 0) { } y luego se lee x',
     'int x; if (false && (x = 1) > 0) { } System.out.println(x);'],
    ['while (c && (x = 1) > 0) { } y luego se lee x: el bucle puede terminar por c falso',
     'int n = 1; int x; while (n > 0 && (x = 1) > 0) { } System.out.println(x);'],
    ['for (...; i < 3 || (x = 1) > 0; ...) { leer x }: el cuerpo corre con i < 3 verdadero sin asignar x',
     'int x; for (int i = 0; i < 3 || (x = 1) > 0; i++) { System.out.println(x); }'],
    ['la variable se declara en otro grupo de case DENTRO de una rama muerta: saltar al segundo case se salta su inicializador',
     'int n = 1; if (true) { } else { switch (n) { case 0: int x = 48; case 1: System.out.println(x); } }'],
    ['tras una rama que no completa, el estado vacuo no incluye una variable declarada DESPUÉS en un switch',
     'int n = 1; if (true) { } else { while (true) { } } switch (n) { case 0: int x = 1; case 1: System.out.println(x); }'],
    ['la x del for ya murió: la x del case es OTRA variable y saltar al segundo case se salta su inicializador',
     'int n = 1; for (int x = 0; x < 3; x++) { } switch (n) { case 0: int x = 1; case 1: System.out.println(x); }'],
    ['la x de un bloque ya cerrado no cuenta para la x declarada después sin inicializar',
     'int n = 1; { int x = 1; } int x; if (n > 0) { x = 2; } System.out.println(x);'],
    ['una constante NO booleana leída como valor SÍ se exige asignada (k + 1 se recorre)',
     'int n = 1; switch (n) { case 0: final int x = 5; case 1: int r = x + 1; System.out.println(r); }'],
    ['una constante en una comparación como valor también se recorre',
     'int n = 1; switch (n) { case 0: final int x = 5; case 1: boolean r = x == 5; System.out.println(r); }'],
    ['if (c) { x = 1; } else if (d) { x = 2; } y luego se lee x',
     'int n = 1; int x; if (n > 0) { x = 1; } else if (n > 3) { x = 2; } System.out.println(x);'],
  ];

  it.each(alRechazarConJavac)('javac 17 lo RECHAZA («variable x might not have been initialized»): %s', (_descripcion, cuerpo) => {
    const problemas = asignacionDefinitivaDeCuerpo(cuerpo);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-posiblemente-no-asignada', datos: { nombre: 'x' } });
  });
});
