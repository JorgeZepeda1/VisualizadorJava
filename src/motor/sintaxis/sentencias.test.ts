// RED de la tarea 1.5 (Sentencias completas, design.md §2.3, REQ-SUB-004): if/else/else-if
// anidados, ";" vacía, switch clásico (con caída real de Java), while, do-while, for (varias
// variables, partes vacías), break/continue, bloque anidado como sentencia y sentencias de
// expresión general (asignación/incremento-decremento/llamada/"new" — el resto de "Sentencia" que
// 0.12-1.4 no cubrían). La ejecución (intérprete) llega en el lote 2; aquí solo se verifica que el
// AST tiene la forma correcta y que nada produce un error de sintaxis engañoso.
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { analizarPrograma } from './analizador-sintactico.ts';
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';
import type {
  NodoBreak,
  NodoContinue,
  NodoDoWhile,
  NodoFor,
  NodoIf,
  NodoSentenciaExpresion,
  NodoSwitch,
  NodoWhile,
} from './ast.ts';

function analizar(fuente: string) {
  return analizarPrograma(tokenizar(fuente));
}

function primeraSentencia(fuente: string) {
  const programa = analizar(`class C { public static void main(String[] a) { ${fuente} } }`);
  return programa.clase.main!.cuerpo.elementos[0];
}

describe('sentencias — if / else / else if (REQ-SUB-004)', () => {
  it('if simple sin else', () => {
    const sentencia = primeraSentencia('if (x > 0) { return; }') as NodoIf;
    expect(sentencia.tipo).toBe('if');
    expect(sentencia.condicion).toMatchObject({ tipo: 'binaria', operador: '>' });
    expect(sentencia.entonces.tipo).toBe('bloque');
    expect(sentencia.sino).toBeNull();
  });

  it('if/else', () => {
    const sentencia = primeraSentencia('if (x > 0) { return; } else { return; }') as NodoIf;
    expect(sentencia.sino).not.toBeNull();
    expect(sentencia.sino?.tipo).toBe('bloque');
  });

  it('if/else-if/else anidados: el "else" del segundo if es otro NodoIf (cadena real)', () => {
    const sentencia = primeraSentencia(
      'if (x > 0) { return; } else if (x < 0) { return; } else { return; }',
    ) as NodoIf;
    expect(sentencia.sino?.tipo).toBe('if');
    const elseIf = sentencia.sino as NodoIf;
    expect(elseIf.condicion).toMatchObject({ operador: '<' });
    expect(elseIf.sino?.tipo).toBe('bloque');
  });

  it('el "else" se liga al "if" más cercano sin llaves (dangling else, verificado contra javac 17: flow11)', () => {
    // if (a) if (b) return; else return;  -- el else pertenece al "if (b)" interno.
    const sentencia = primeraSentencia('if (a) if (b) { return; } else { return; }') as NodoIf;
    expect(sentencia.sino).toBeNull(); // el if EXTERNO no tiene else
    expect(sentencia.entonces.tipo).toBe('if');
    const interno = sentencia.entonces as NodoIf;
    expect(interno.sino).not.toBeNull(); // el else es del if INTERNO
  });

  it('cuerpo de if sin llaves es una sola sentencia (no un bloque)', () => {
    const sentencia = primeraSentencia('if (x > 0) return;') as NodoIf;
    expect(sentencia.entonces.tipo).toBe('retorno');
  });
});

describe('sentencias — sentencia vacía ";" (REQ-SUB-004)', () => {
  it('";" sola es una sentencia real, no se ignora', () => {
    const sentencia = primeraSentencia(';');
    expect(sentencia.tipo).toBe('sentencia-vacia');
  });

  it('"if (x > 5);" seguido de un bloque: el ";" ES el cuerpo del if (bug clásico verificado, flow10)', () => {
    // El bloque "{ }" que sigue es una sentencia SUELTA, sin relación con la condición.
    const programa = analizar('class C { public static void main(String[] a) { if (x > 5); { return; } } }');
    const [ifNodo, bloqueSuelto] = programa.clase.main!.cuerpo.elementos as [NodoIf, { tipo: string }];
    expect(ifNodo.entonces.tipo).toBe('sentencia-vacia');
    expect(bloqueSuelto.tipo).toBe('bloque');
  });
});

describe('sentencias — while / do-while (REQ-SUB-004)', () => {
  it('while con cuerpo en bloque', () => {
    const sentencia = primeraSentencia('while (x < 10) { x++; }') as NodoWhile;
    expect(sentencia.tipo).toBe('while');
    expect(sentencia.condicion).toMatchObject({ operador: '<' });
    expect(sentencia.cuerpo.tipo).toBe('bloque');
  });

  it('do-while: el cuerpo va ANTES que la condición en el texto, pero el nodo guarda ambos', () => {
    const sentencia = primeraSentencia('do { x++; } while (x < 10);') as NodoDoWhile;
    expect(sentencia.tipo).toBe('do-while');
    expect(sentencia.cuerpo.tipo).toBe('bloque');
    expect(sentencia.condicion).toMatchObject({ operador: '<' });
  });

  it('while anidado dentro de while (anidamiento real)', () => {
    const sentencia = primeraSentencia('while (a) { while (b) { x++; } }') as NodoWhile;
    const interno = (sentencia.cuerpo as unknown as { elementos: unknown[] }).elementos[0] as NodoWhile;
    expect(interno.tipo).toBe('while');
  });
});

describe('sentencias — for (REQ-SUB-004: varias variables, partes vacías)', () => {
  it('for clásico con declaración, condición y actualización', () => {
    const sentencia = primeraSentencia('for (int i = 0; i < 10; i++) { x++; }') as NodoFor;
    expect(sentencia.tipo).toBe('for');
    expect(sentencia.inicializacionDeclaracion).toMatchObject({ tipo: 'declaracion-local', nombreTipo: 'int' });
    expect(sentencia.condicion).toMatchObject({ operador: '<' });
    expect(sentencia.actualizacion).toHaveLength(1);
    expect(sentencia.cuerpo.tipo).toBe('bloque');
  });

  it('for con varias variables en la inicialización y la actualización (verificado contra javac: flow09)', () => {
    const sentencia = primeraSentencia('for (int i = 0, j = 10; i < j; i++, j--) { x++; }') as NodoFor;
    expect(sentencia.inicializacionDeclaracion?.declaradores.map((d) => d.nombre)).toEqual(['i', 'j']);
    expect(sentencia.actualizacion).toHaveLength(2);
  });

  it('for con las 3 partes vacías ("for (;;)")', () => {
    const sentencia = primeraSentencia('for (;;) { break; }') as NodoFor;
    expect(sentencia.inicializacionDeclaracion).toBeNull();
    expect(sentencia.inicializacionExpresiones).toEqual([]);
    expect(sentencia.condicion).toBeNull();
    expect(sentencia.actualizacion).toEqual([]);
  });

  it('for con inicialización de expresiones (variables ya existentes, sin declarar)', () => {
    const sentencia = primeraSentencia('for (i = 0; i < 10; i++) { x++; }') as NodoFor;
    expect(sentencia.inicializacionDeclaracion).toBeNull();
    expect(sentencia.inicializacionExpresiones).toHaveLength(1);
    expect(sentencia.inicializacionExpresiones[0].expresion).toMatchObject({ tipo: 'asignacion' });
  });

  it('for anidado dentro de otro for', () => {
    const sentencia = primeraSentencia('for (int i = 0; i < 3; i++) { for (int j = 0; j < 3; j++) { x++; } } ') as NodoFor;
    const interno = (sentencia.cuerpo as unknown as { elementos: unknown[] }).elementos[0] as NodoFor;
    expect(interno.tipo).toBe('for');
  });
});

describe('sentencias — switch clásico con caída (REQ-SUB-004, verificado contra javac: flow01/flow04)', () => {
  it('switch con varios case y un default, en una lista plana de elementos', () => {
    const sentencia = primeraSentencia(
      'switch (dia) { case 1: x = 1; break; case 2: case 3: x = 2; break; default: x = 0; }',
    ) as NodoSwitch;
    expect(sentencia.tipo).toBe('switch');
    expect(sentencia.selector).toMatchObject({ tipo: 'nombre', nombre: 'dia' });
    const tipos = sentencia.elementos.map((e) => e.tipo);
    expect(tipos).toEqual([
      'etiqueta-case',
      'sentencia-expresion',
      'break',
      'etiqueta-case',
      'etiqueta-case',
      'sentencia-expresion',
      'break',
      'etiqueta-default',
      'sentencia-expresion',
    ]);
  });

  it('switch sobre char/String (REQ-SUB-004: selector int/char/String)', () => {
    const sentencia = primeraSentencia('switch (letra) { case \'a\': break; default: break; }') as NodoSwitch;
    expect(sentencia.elementos[0]).toMatchObject({ tipo: 'etiqueta-case', valor: { tipo: 'literal-caracter' } });
  });
});

// Tarea 1.34 (familia A de la re-verificación del lote 1): JLS 14.11 — el cuerpo de un `switch` es `{ { SwitchBlockStatementGroup } { SwitchLabel } }`, y todo
// grupo EMPIEZA con una etiqueta. javac (`JavacParser.switchBlockStatementGroups`): lo primero que no sea `case`, `default` o `}` es «case, default, or '}'
// expected», en ESE token — también si es una sentencia, una declaración, `;` o un bloque. Antes el analizador aceptaba cualquier elemento de bloque ahí y el
// programa del alumno que escribió un título del menú antes del primer `case` terminaba en «Java sí acepta tu programa».
describe('sentencias — antes del primer `case` o `default` de un switch no cabe nada más que una etiqueta (JLS 14.11, tarea 1.34)', () => {
  const ANTES_DEL_PRIMER_CASE: ReadonlyArray<readonly [descripcion: string, cuerpo: string, primerToken: string]> = [
    ['break', 'switch (x) { break; case 1: break; }', 'break'],
    ['println', 'switch (x) { System.out.println("a"); case 1: break; }', 'System'],
    ['una declaración', 'switch (x) { int y = 2; case 1: break; }', 'int'],
    ['una declaración final', 'switch (x) { final int k = 1; case 1: break; }', 'final'],
    ['la sentencia vacía', 'switch (x) { ; case 1: break; }', ';'],
    ['un bloque', 'switch (x) { { x = 2; } case 1: break; }', '{ x'],
    ['un incremento y nada más', 'switch (x) { x++; }', 'x++'],
    ['un return', 'switch (x) { return; }', 'return'],
    ['un if', 'switch (x) { if (x > 0) { } case 1: break; }', 'if'],
    ['un for', 'switch (x) { for (;;) { } }', 'for'],
    ['dos asignaciones sin ningún case', 'switch (x) { x = 2; x = 3; }', 'x = 2'],
  ];

  it.each(ANTES_DEL_PRIMER_CASE)('%s → ErrorDeCompilacion «sentencia-antes-del-primer-case» en el primer token', (_descripcion, cuerpo, primerToken) => {
    const fuente = `class C { public static void main(String[] a) { int x = 1; ${cuerpo} } }`;
    let error: unknown;
    try {
      analizar(fuente);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ErrorDeCompilacion);
    const lanzado = error as ErrorDeCompilacion;
    expect(lanzado.codigo).toBe('sentencia-antes-del-primer-case');
    // El rango es el del primer token que no es una etiqueta (donde javac lo señala).
    const inicioEsperado = fuente.indexOf(primerToken, fuente.indexOf('switch'));
    expect(lanzado.rango.inicio).toBe(inicioEsperado);
  });

  it('el error de un switch ANIDADO también es el de su propio primer token (no el del switch de afuera)', () => {
    const fuente = 'class C { public static void main(String[] a) { int x = 1; switch (x) { case 1: switch (x) { x++; } } } }';
    let error: unknown;
    try {
      analizar(fuente);
    } catch (e) {
      error = e;
    }
    expect((error as ErrorDeCompilacion).codigo).toBe('sentencia-antes-del-primer-case');
    expect((error as ErrorDeCompilacion).rango.inicio).toBe(fuente.indexOf('x++'));
  });

  it('control: DESPUÉS de un `case` o de `default` sí caben sentencias, declaraciones, `;` y bloques', () => {
    const sentencia = primeraSentencia('switch (x) { default: ; int y = 2; { y = 3; } case 1: x++; break; }') as NodoSwitch;
    expect(sentencia.elementos.map((e) => e.tipo)).toEqual(['etiqueta-default', 'sentencia-vacia', 'declaracion-local', 'bloque', 'etiqueta-case', 'sentencia-expresion', 'break']);
  });

  it('control: un switch vacío y uno cuya primera etiqueta es `default` (o varios `case` seguidos) no son errores', () => {
    expect((primeraSentencia('switch (x) { }') as NodoSwitch).elementos).toEqual([]);
    expect((primeraSentencia('switch (x) { default: }') as NodoSwitch).elementos.map((e) => e.tipo)).toEqual(['etiqueta-default']);
    expect((primeraSentencia('switch (x) { case 1: case 2: break; }') as NodoSwitch).elementos.map((e) => e.tipo)).toEqual(['etiqueta-case', 'etiqueta-case', 'break']);
  });

  it('control: sin la llave de cierre sigue siendo el error de fin de archivo de siempre, no el de la etiqueta', () => {
    let error: unknown;
    try {
      analizar('class C { public static void main(String[] a) { int x = 1; switch (x) {');
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ErrorDeCompilacion);
    expect((error as ErrorDeCompilacion).codigo).not.toBe('sentencia-antes-del-primer-case');
  });
});

describe('sentencias — break / continue sin etiqueta (REQ-SUB-004)', () => {
  it('break dentro de un while', () => {
    const sentencia = primeraSentencia('while (true) { break; }') as NodoWhile;
    const dentro = (sentencia.cuerpo as unknown as { elementos: unknown[] }).elementos[0] as NodoBreak;
    expect(dentro.tipo).toBe('break');
  });

  it('continue dentro de un for', () => {
    const sentencia = primeraSentencia('for (int i = 0; i < 10; i++) { continue; }') as NodoFor;
    const dentro = (sentencia.cuerpo as unknown as { elementos: unknown[] }).elementos[0] as NodoContinue;
    expect(dentro.tipo).toBe('continue');
  });
});

describe('sentencias — sentencia de expresión general (REQ-SUB-004: "sentencias de expresión")', () => {
  it('una asignación suelta es una sentencia válida', () => {
    const sentencia = primeraSentencia('x = 5;') as NodoSentenciaExpresion;
    expect(sentencia.tipo).toBe('sentencia-expresion');
    expect(sentencia.expresion).toMatchObject({ tipo: 'asignacion' });
  });

  it('un incremento postfijo suelto es una sentencia válida ("x++;")', () => {
    const sentencia = primeraSentencia('x++;') as NodoSentenciaExpresion;
    expect(sentencia.expresion).toMatchObject({ tipo: 'incremento-decremento' });
  });

  it('una llamada suelta es una sentencia válida ("sc.nextInt();")', () => {
    const sentencia = primeraSentencia('sc.nextInt();') as NodoSentenciaExpresion;
    expect(sentencia.expresion).toMatchObject({ tipo: 'llamada' });
  });

  it('"new Scanner(System.in);" suelto (sin asignar) es una sentencia válida', () => {
    const sentencia = primeraSentencia('new Scanner(System.in);') as NodoSentenciaExpresion;
    expect(sentencia.expresion).toMatchObject({ tipo: 'nueva-instancia' });
  });

  it('un literal suelto NO es una sentencia válida: "not a statement" real de javac (verificado)', () => {
    expect(() => primeraSentencia('5;')).toThrow(ErrorDeCompilacion);
  });

  it('una expresión aritmética suelta tampoco es una sentencia válida (verificado: "a + b;")', () => {
    expect(() => primeraSentencia('a + b;')).toThrow(ErrorDeCompilacion);
  });
});

// Tarea 1.34 (familia D de la re-verificación del lote 1): JLS 14.8 — las únicas expresiones que son sentencias son la asignación, `++`/`--`, la llamada a un
// método y `new Clase(...)`; una `ParenthesizedExpression` NO lo es (javac `checkExprStat`: «not a statement»), aunque lo de dentro sí lo sea. El árbol no guardaba
// los paréntesis, así que `(x = 2);` era indistinguible de `x = 2;`; ahora `analizarPrimaria` deja en el nodo el rango de sus paréntesis más externos (`parentesis`).
describe('sentencias — una expresión entre paréntesis NO es una sentencia (JLS 14.8, tarea 1.34)', () => {
  const ENTRE_PARENTESIS: ReadonlyArray<readonly [descripcion: string, sentencia: string]> = [
    ['una asignación', '(x = 2);'],
    ['un incremento postfijo', '(x++);'],
    ['un incremento prefijo', '(++x);'],
    ['una asignación con los paréntesis repetidos', '((x = 1));'],
    ['una llamada', '(sc.nextInt());'],
    ['un println', '(System.out.println("a"));'],
    ['una llamada estática', '(Math.abs(-1));'],
    ['un método de un texto', '(s.length());'],
    ['una creación de objeto', '(new Scanner(System.in));'],
    ['una asignación compuesta', '(x += 2);'],
  ];

  it.each(ENTRE_PARENTESIS)('%s → ErrorDeCompilacion «sentencia-entre-parentesis» en el paréntesis de apertura', (_descripcion, sentencia) => {
    const fuente = `class C { public static void main(String[] a) { int x = 1; ${sentencia} } }`;
    let error: unknown;
    try {
      analizar(fuente);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ErrorDeCompilacion);
    const lanzado = error as ErrorDeCompilacion;
    expect(lanzado.codigo).toBe('sentencia-entre-parentesis');
    // javac señala el paréntesis de apertura de los más externos (`JCParens`), no lo que hay dentro.
    expect(lanzado.rango.inicio).toBe(fuente.indexOf(sentencia));
  });

  it('también en la inicialización y en la actualización de un `for` (javac usa `checkExprStat` en las dos)', () => {
    for (const cabecera of ['for ((x = 0); x < 3; x++) { }', 'for (x = 0; x < 3; (x++)) { }']) {
      const fuente = `class C { public static void main(String[] a) { int x = 1; ${cabecera} } }`;
      let error: unknown;
      try {
        analizar(fuente);
      } catch (e) {
        error = e;
      }
      expect((error as ErrorDeCompilacion).codigo, cabecera).toBe('sentencia-entre-parentesis');
    }
  });

  it('un paréntesis que NO envuelve toda la sentencia sigue siendo una sentencia: `(x) = 2;`, `(x)++;`, `((x)) += 2;`, `(System.out).println("a");`', () => {
    for (const sentencia of ['(x) = 2;', '(x)++;', '((x)) += 2;', '(System.out).println("a");', 'x = (2);', 'x = (x + 1) * 2;', '((Scanner) s).close();']) {
      const fuente = `class C { public static void main(String[] a) { int x = 1; ${sentencia} } }`;
      expect(() => analizar(fuente), sentencia).not.toThrow();
    }
  });

  it('la sentencia es la misma con o sin espacios y saltos de línea dentro de los paréntesis; el error se señala en el `(` aunque lo de dentro esté en otra línea', () => {
    const fuente = 'class C { public static void main(String[] a) { int x = 1;\n (\n x = 2\n );\n } }';
    let error: unknown;
    try {
      analizar(fuente);
    } catch (e) {
      error = e;
    }
    expect((error as ErrorDeCompilacion).codigo).toBe('sentencia-entre-parentesis');
    expect((error as ErrorDeCompilacion).rango.inicio).toBe(fuente.indexOf('('.concat('\n')));
  });
});

describe('sentencias — bloque anidado como sentencia (REFACTOR de 1.5: Bloque reusado)', () => {
  it('un bloque "{ }" suelto dentro de otro bloque es una sentencia válida', () => {
    const sentencia = primeraSentencia('{ x = 1; }');
    expect(sentencia.tipo).toBe('bloque');
  });
});

describe('sentencias — REGRESIÓN: println (0.12) y return (1.2) siguen intactos', () => {
  it('println de un literal sigue funcionando exactamente igual', () => {
    const sentencia = primeraSentencia('System.out.println("hola");');
    expect(sentencia).toMatchObject({ tipo: 'impresion', argumento: { valor: 'hola' } });
  });

  it('"return;" sigue funcionando exactamente igual', () => {
    expect(primeraSentencia('return;').tipo).toBe('retorno');
  });
});
