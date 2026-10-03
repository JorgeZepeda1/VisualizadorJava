// RED de la tarea 1.31: la representación de un programa generado (árbol de sentencias y expresiones)
// y su impresión como Java. El árbol existe para que el REDUCTOR pueda quitar sentencias y sustituir
// subexpresiones sin volver a parsear texto. La impresión fija un formato estable de UNA sentencia por
// renglón (así las líneas de javac señalan la sentencia culpable) y de llaves siempre presentes.
import { describe, expect, it } from 'vitest';
import {
  bloque,
  declaracion,
  etiquetasDe,
  haz,
  literal,
  mientras,
  nombre,
  para,
  paraCada,
  plantilla,
  pretendeErrorDeSintaxis,
  renderizarCuerpo,
  renderizarExpr,
  renderizarPrograma,
  salto,
  sentenciaExpr,
  sentenciasDe,
  seleccion,
  si,
  todasLasExprs,
  type Programa,
} from './programa.ts';

const CABECERA = 'public class P {\n    public static void main(String[] args) {\n';
const PIE = '    }\n}\n';

function programa(...sentencias: Programa['sentencias']): Programa {
  return { imports: [], sentencias };
}

describe('renderizarExpr — expresiones como plantillas con huecos', () => {
  it('un literal y un nombre se imprimen tal cual', () => {
    expect(renderizarExpr(literal('"a"', 'String'))).toBe('"a"');
    expect(renderizarExpr(nombre('total', 'int'))).toBe('total');
  });

  it('una plantilla intercala su texto fijo con sus hijos (llamada con dos argumentos)', () => {
    const llamada = plantilla(['Math.max(', ', ', ')'], [literal('1', 'int'), nombre('x', 'int')], 'int');
    expect(renderizarExpr(llamada)).toBe('Math.max(1, x)');
  });

  it('una plantilla con menos textos que hijos + 1 es un error de programación y falla fuerte', () => {
    expect(() => plantilla(['f(', ')'], [literal('1', 'int'), literal('2', 'int')], 'int')).toThrow(/partes/);
  });
});

describe('renderizarPrograma — una sentencia por renglón, llaves siempre', () => {
  it('un programa con una declaración y una llamada', () => {
    const p = programa(
      declaracion({ tipo: 'int', nombre: 'x', inicial: literal('5', 'int') }),
      sentenciaExpr(plantilla(['System.out.println(', ')'], [nombre('x', 'int')], 'void')),
    );
    expect(renderizarPrograma(p)).toBe(`${CABECERA}        int x = 5;\n        System.out.println(x);\n${PIE}`);
  });

  it('una declaración final y otra sin valor inicial', () => {
    const p = programa(
      declaracion({ tipo: 'int', nombre: 'a', inicial: literal('1', 'int'), esFinal: true }),
      declaracion({ tipo: 'String', nombre: 's', inicial: null }),
    );
    expect(renderizarPrograma(p)).toBe(`${CABECERA}        final int a = 1;\n        String s;\n${PIE}`);
  });

  it('los imports van antes de la clase, uno por renglón', () => {
    const p: Programa = { imports: ['import java.util.Scanner;', 'import java.util.Random;'], sentencias: [] };
    expect(renderizarPrograma(p)).toBe(`import java.util.Scanner;\nimport java.util.Random;\n\n${CABECERA}${PIE}`);
  });

  it('if con else: cada cuerpo sangrado y con llaves', () => {
    const p = programa(
      si(nombre('c', 'boolean'), [sentenciaExpr(plantilla(['a++'], [], 'int'))], [sentenciaExpr(plantilla(['a--'], [], 'int'))]),
    );
    expect(renderizarPrograma(p)).toBe(
      `${CABECERA}        if (c) {\n            a++;\n        } else {\n            a--;\n        }\n${PIE}`,
    );
  });

  it('if sin else, while y do-while', () => {
    const p = programa(
      si(nombre('c', 'boolean'), [salto('break')], null),
      mientras(nombre('c', 'boolean'), [salto('continue')]),
      haz([sentenciaExpr(plantilla(['a++'], [], 'int'))], nombre('c', 'boolean')),
    );
    expect(renderizarPrograma(p)).toBe(
      `${CABECERA}        if (c) {\n            break;\n        }\n        while (c) {\n            continue;\n        }\n` +
        `        do {\n            a++;\n        } while (c);\n${PIE}`,
    );
  });

  it('for con declaración en la cabecera, y for sin ninguna de sus tres partes', () => {
    const p = programa(
      para({
        inicial: declaracion({ tipo: 'int', nombre: 'i', inicial: literal('0', 'int') }),
        condicion: plantilla(['i < 3'], [], 'boolean'),
        paso: plantilla(['i++'], [], 'int'),
        cuerpo: [],
      }),
      para({ inicial: null, condicion: null, paso: null, cuerpo: [salto('break')] }),
    );
    expect(renderizarPrograma(p)).toBe(
      `${CABECERA}        for (int i = 0; i < 3; i++) {\n        }\n        for (;;) {\n            break;\n        }\n${PIE}`,
    );
  });

  it('switch clásico: etiquetas con dos puntos, varias etiquetas y default', () => {
    const p = programa(
      seleccion({
        selector: nombre('a', 'int'),
        casos: [
          { etiquetas: [literal('1', 'int'), literal('2', 'int')], cuerpo: [salto('break')] },
          { etiquetas: 'default', cuerpo: [] },
        ],
        flecha: false,
      }),
    );
    expect(renderizarPrograma(p)).toBe(
      `${CABECERA}        switch (a) {\n            case 1, 2:\n                break;\n            default:\n        }\n${PIE}`,
    );
  });

  it('switch con flecha: cada caso lleva su bloque', () => {
    const p = programa(
      seleccion({
        selector: nombre('a', 'int'),
        casos: [{ etiquetas: [literal('1', 'int')], cuerpo: [sentenciaExpr(plantilla(['a++'], [], 'int'))] }],
        flecha: true,
      }),
    );
    expect(renderizarPrograma(p)).toBe(`${CABECERA}        switch (a) {\n            case 1 -> {\n                a++;\n            }\n        }\n${PIE}`);
  });

  it('un bloque anónimo abre un alcance nuevo', () => {
    const p = programa(bloque([declaracion({ tipo: 'int', nombre: 'x', inicial: null })]));
    expect(renderizarPrograma(p)).toBe(`${CABECERA}        {\n            int x;\n        }\n${PIE}`);
  });
});

describe('recorridos del árbol — sentenciasDe y todasLasExprs', () => {
  const nuevo = plantilla(['new Scanner(System.in)'], [], 'Scanner', { primaria: true });
  const suma = plantilla(['', ' + ', ''], [literal('1', 'int'), nombre('x', 'int')], 'int');
  const p = programa(
    declaracion({ tipo: 'Scanner', nombre: 'sc', inicial: nuevo }),
    si(
      nombre('c', 'boolean'),
      [mientras(nombre('d', 'boolean'), [salto('break')])],
      [sentenciaExpr(suma)],
    ),
    para({ inicial: declaracion({ tipo: 'int', nombre: 'i', inicial: literal('0', 'int') }), condicion: null, paso: null, cuerpo: [] }),
  );

  it('sentenciasDe recorre en preorden las sentencias anidadas (incluida la declaración de la cabecera del for)', () => {
    expect([...sentenciasDe(p.sentencias)].map((s) => s.k)).toEqual(['declaracion', 'si', 'mientras', 'salto', 'expresion', 'para', 'declaracion']);
  });

  it('todasLasExprs recorre en preorden cada expresión del programa, con sus subexpresiones', () => {
    const textos = [...todasLasExprs(p)].map(renderizarExpr);
    expect(textos).toEqual(['new Scanner(System.in)', 'c', 'd', '1 + x', '1', 'x', '0']);
  });
});

describe('etiquetasDe — los rasgos de construcción que ejerce un programa', () => {
  it('reúne las etiquetas de las expresiones, sin repetir y en orden alfabético', () => {
    const p = programa(
      declaracion({
        tipo: 'int',
        nombre: 'n',
        inicial: plantilla(['(int) ', ''], [literal('"5"', 'String')], 'int', { etiquetas: ['cast'] }),
      }),
      sentenciaExpr(plantilla(['', '++'], [nombre('n', 'int')], 'int', { etiquetas: ['incremento'] })),
      sentenciaExpr(plantilla(['', '--'], [nombre('n', 'int')], 'int', { etiquetas: ['incremento'] })),
    );
    expect(etiquetasDe(p)).toEqual(['cast', 'incremento']);
  });

  it('deduce de la estructura los rasgos de las sentencias: final, ciclos, condicionales, switch, saltos y bloques', () => {
    const p = programa(
      declaracion({ tipo: 'int', nombre: 'k', inicial: literal('1', 'int'), esFinal: true }),
      si(literal('true', 'boolean'), [], null),
      mientras(literal('true', 'boolean'), [salto('break')]),
      haz([salto('continue')], literal('true', 'boolean')),
      para({ inicial: null, condicion: null, paso: null, cuerpo: [] }),
      seleccion({ selector: literal('1', 'int'), casos: [], flecha: false }),
      bloque([]),
    );
    expect(etiquetasDe(p)).toEqual(['bloque', 'break', 'continue', 'do-while', 'final', 'for', 'if', 'switch', 'while']);
  });

  it('deduce del tipo declarado los rasgos var y tipo-envoltorio (Integer, Double, Character, Long, Boolean y Object)', () => {
    const p = programa(
      declaracion({ tipo: 'var', nombre: 'a', inicial: literal('1', 'int') }),
      declaracion({ tipo: 'Integer', nombre: 'k', inicial: literal('5', 'int') }),
      declaracion({ tipo: 'Object', nombre: 'o', inicial: null }),
    );
    expect(etiquetasDe(p)).toEqual(['tipo-envoltorio', 'var']);
    expect(etiquetasDe(programa(declaracion({ tipo: 'int', nombre: 'x', inicial: literal('1', 'int') })))).toEqual([]);
  });

  // Tarea 1.33: el `switch` con flecha (`case s -> …`) es un rasgo aparte del `switch` clásico: los falsos rechazos de `case s ->`
  // (N4) salían como «sin rasgos» porque el generador solo etiquetaba lo que él mismo ponía en un nodo de expresión.
  it('deduce de la estructura el rasgo switch-flecha (solo con flecha; el switch clásico solo trae switch)', () => {
    const conFlecha = programa(seleccion({ selector: literal('1', 'int'), casos: [], flecha: true }));
    const clasico = programa(seleccion({ selector: literal('1', 'int'), casos: [], flecha: false }));
    expect(etiquetasDe(conFlecha)).toEqual(['switch', 'switch-flecha']);
    expect(etiquetasDe(clasico)).toEqual(['switch']);
  });

  it('un programa sin ningún rasgo tiene una lista vacía', () => {
    expect(etiquetasDe(programa(declaracion({ tipo: 'int', nombre: 'x', inicial: literal('1', 'int') })))).toEqual([]);
  });

  it('las etiquetas de una declaración (nombre contextual) también cuentan', () => {
    const p = programa(declaracion({ tipo: 'int', nombre: 'var', inicial: literal('1', 'int'), etiquetas: ['nombre-contextual'] }));
    expect(etiquetasDe(p)).toEqual(['nombre-contextual']);
  });
});

describe('pretendeErrorDeSintaxis — solo cuando el generador QUIERE un error de sintaxis', () => {
  it('un programa normal no lo pretende', () => {
    expect(pretendeErrorDeSintaxis(programa(declaracion({ tipo: 'int', nombre: 'x', inicial: literal('1', 'int') })))).toBe(false);
  });

  it('una declaración marcada lo pretende', () => {
    expect(pretendeErrorDeSintaxis(programa(declaracion({ tipo: 'int', nombre: 'class', inicial: null, sintaxisInvalida: true })))).toBe(true);
  });

  it('una expresión marcada, aunque esté anidada en un ciclo, lo pretende', () => {
    const mala = plantilla(['x +'], [], 'int', { sintaxisInvalida: true });
    expect(pretendeErrorDeSintaxis(programa(mientras(literal('true', 'boolean'), [sentenciaExpr(mala)])))).toBe(true);
  });
});

describe('renderizarCuerpo — solo las sentencias de main, sin la clase ni la sangría de main', () => {
  it('un renglón por sentencia, con la sangría relativa de lo anidado', () => {
    const p = programa(
      declaracion({ tipo: 'int', nombre: 'x', inicial: literal('5', 'int') }),
      si(nombre('c', 'boolean'), [sentenciaExpr(plantilla(['x++'], [], 'int'))], null),
    );
    expect(renderizarCuerpo(p)).toEqual(['int x = 5;', 'if (c) {', '    x++;', '}']);
  });

  it('un programa sin sentencias tiene un cuerpo vacío y los imports no cuentan', () => {
    expect(renderizarCuerpo({ imports: ['import java.util.Scanner;'], sentencias: [] })).toEqual([]);
  });
});

// ---- Tarea 1.34: el nombre de la clase y las sentencias antes del primer `case` ----
//
// La re-verificación del lote 1 encontró dos familias que el generador de la 1.31 NO podía producir por construcción: la clase del
// alumno con el nombre de una clase del JDK (el árbol imprimía SIEMPRE `class P`) y una sentencia dentro del `switch` antes del primer
// `case` (un `Seleccion` solo sabía de casos). Las dos son ahora parte del árbol, y por eso el reductor y los rasgos las ven.
describe('renderizarPrograma — el nombre de la clase (tarea 1.34)', () => {
  it('por omisión la clase se llama P (el programa de siempre no cambia)', () => {
    expect(renderizarPrograma({ imports: [], sentencias: [] })).toBe(`${CABECERA}${PIE}`);
  });

  it('con `clase` el programa declara la clase con ese nombre (System, Math, Scanner…)', () => {
    const texto = renderizarPrograma({ imports: [], sentencias: [], clase: 'System' });
    expect(texto).toBe('public class System {\n    public static void main(String[] args) {\n    }\n}\n');
    expect(renderizarPrograma({ imports: ['import java.util.Scanner;'], sentencias: [], clase: 'Scanner' })).toBe(
      'import java.util.Scanner;\n\npublic class Scanner {\n    public static void main(String[] args) {\n    }\n}\n',
    );
  });

  it('el rasgo clase-con-nombre-del-jdk se deduce de la estructura: solo si la clase no se llama P', () => {
    expect(etiquetasDe({ imports: [], sentencias: [], clase: 'Math' })).toEqual(['clase-con-nombre-del-jdk']);
    expect(etiquetasDe({ imports: [], sentencias: [], clase: 'P' })).toEqual([]);
    expect(etiquetasDe({ imports: [], sentencias: [] })).toEqual([]);
  });
});

describe('seleccion con sentencias antes del primer case (tarea 1.34)', () => {
  const conAntes = programa(
    seleccion({
      selector: nombre('a', 'int'),
      antes: [salto('break'), declaracion({ tipo: 'int', nombre: 'k', inicial: literal('1', 'int') })],
      casos: [{ etiquetas: [literal('1', 'int')], cuerpo: [salto('break')] }],
      flecha: false,
    }),
  );

  it('las sentencias de `antes` se imprimen entre la llave y el primer case, con la sangría de los casos', () => {
    expect(renderizarPrograma(conAntes)).toBe(
      `${CABECERA}        switch (a) {\n            break;\n            int k = 1;\n            case 1:\n                break;\n        }\n${PIE}`,
    );
  });

  it('un switch sin `antes` (o con la lista vacía) se imprime como siempre', () => {
    const sin = seleccion({ selector: nombre('a', 'int'), casos: [{ etiquetas: 'default', cuerpo: [] }], flecha: false });
    const vacio = seleccion({ selector: nombre('a', 'int'), antes: [], casos: [{ etiquetas: 'default', cuerpo: [] }], flecha: false });
    expect(renderizarPrograma(programa(vacio))).toBe(renderizarPrograma(programa(sin)));
  });

  it('sentenciasDe recorre las sentencias de `antes` ANTES que las de los casos (el orden en que se imprimen)', () => {
    expect([...sentenciasDe(conAntes.sentencias)].map((s) => s.k)).toEqual(['seleccion', 'salto', 'declaracion', 'salto']);
  });

  it('el rasgo sentencia-antes-del-primer-case se deduce de la estructura, y el programa pretende un error de sintaxis (javac: «case, default, or } expected»)', () => {
    expect(etiquetasDe(conAntes)).toEqual(['break', 'sentencia-antes-del-primer-case', 'switch']);
    expect(pretendeErrorDeSintaxis(conAntes)).toBe(true);
    const normal = programa(seleccion({ selector: nombre('a', 'int'), casos: [{ etiquetas: 'default', cuerpo: [] }], flecha: false }));
    expect(etiquetasDe(normal)).toEqual(['switch']);
    expect(pretendeErrorDeSintaxis(normal)).toBe(false);
  });

  it('con flecha, las sentencias de `antes` también van antes del primer `case X -> {`', () => {
    const conFlecha = programa(
      seleccion({ selector: nombre('a', 'int'), antes: [salto('break')], casos: [{ etiquetas: [literal('1', 'int')], cuerpo: [] }], flecha: true }),
    );
    expect(renderizarPrograma(conFlecha)).toBe(`${CABECERA}        switch (a) {\n            break;\n            case 1 -> {\n            }\n        }\n${PIE}`);
  });
});

// Tarea 1.35: la estructura de la clase. Hasta la 1.34 un programa generado era `imports` + una clase con el `main` de siempre + las sentencias de `main`; la re-verificación del lote 1
// halló falsos rechazos y falsos aceptos que viven FUERA del cuerpo de `main` (un campo sin su `;`, un `main` con otra firma, una clase sellada, un archivo sin clase, un `import` de un
// paquete que no existe, un escape Unicode). Los campos nuevos son opcionales: un programa que no los usa se imprime EXACTAMENTE como antes.
describe('renderizarPrograma — la estructura de la clase (tarea 1.35)', () => {
  const B = String.fromCharCode(92); // una barra real: nunca se escribe una barra-u literal en este archivo

  it('un programa sin estructura especial se imprime exactamente como antes', () => {
    expect(renderizarPrograma({ imports: [], sentencias: [] })).toBe(`${CABECERA}${PIE}`);
  });

  it('`parametrosDeMain` cambia la lista de parámetros de `main` (String..., final String[], String args[], ninguno…)', () => {
    expect(renderizarPrograma({ imports: [], sentencias: [], parametrosDeMain: 'String... args' })).toBe('public class P {\n    public static void main(String... args) {\n    }\n}\n');
    expect(renderizarPrograma({ imports: [], sentencias: [], parametrosDeMain: '' })).toContain('    public static void main() {\n');
    expect(renderizarPrograma({ imports: [], sentencias: [], parametrosDeMain: 'String args[]' })).toContain('main(String args[]) {');
  });

  it('los miembros se imprimen entre la cabecera de la clase y `main`, un renglón por línea y con la sangría de la clase', () => {
    const p: Programa = {
      imports: [],
      sentencias: [],
      miembros: [
        { lineas: ['static int y = 1;', 'static int x = y', '    - y;'], etiquetas: [] },
        { lineas: ['interface I { }'], etiquetas: [] },
      ],
    };
    expect(renderizarPrograma(p)).toBe(
      'public class P {\n    static int y = 1;\n    static int x = y\n        - y;\n    interface I { }\n    public static void main(String[] args) {\n    }\n}\n',
    );
  });

  it('un miembro marcado `despuesDeMain` se imprime DESPUÉS de `main` y antes de la `}` de la clase (el último miembro de la clase)', () => {
    const p: Programa = {
      imports: [],
      sentencias: [],
      miembros: [
        { lineas: ['int antes;'], etiquetas: [] },
        { lineas: ['int despues'], etiquetas: [], despuesDeMain: true },
      ],
    };
    expect(renderizarPrograma(p)).toBe('public class P {\n    int antes;\n    public static void main(String[] args) {\n    }\n    int despues\n}\n');
  });

  it('`sinClase` imprime solo los imports (un archivo sin ninguna clase), o nada si no hay ninguno', () => {
    expect(renderizarPrograma({ imports: ['import java.util.Scanner;'], sentencias: [], sinClase: true })).toBe('import java.util.Scanner;\n');
    expect(renderizarPrograma({ imports: [], sentencias: [], sinClase: true })).toBe('');
  });

  it('`escapeUnicode` reemplaza UNA aparición del carácter por su escape (JLS 3.3), con cuatro dígitos hexadecimales', () => {
    const p: Programa = {
      imports: [],
      sentencias: [sentenciaExpr(plantilla(['System.out.println(', ')'], [literal('"a"', 'String')], 'void'))],
      escapeUnicode: { caracter: '"', aparicion: 0 },
    };
    expect(renderizarPrograma(p)).toContain(`System.out.println(${B}u0022a");`);
    expect(renderizarPrograma({ ...p, escapeUnicode: { caracter: '"', aparicion: 1 } })).toContain(`System.out.println("a${B}u0022);`);
    expect(renderizarPrograma({ ...p, escapeUnicode: { caracter: ';', aparicion: 0 } })).toContain(`System.out.println("a")${B}u003b`);
  });

  it('la aparición se toma módulo el número de apariciones (el escape sobrevive a que el reductor quite texto), y un carácter que no aparece deja el texto igual', () => {
    const sin = renderizarPrograma({ imports: [], sentencias: [] });
    expect(renderizarPrograma({ imports: [], sentencias: [], escapeUnicode: { caracter: ';', aparicion: 0 } })).toBe(sin);
    // `{` aparece dos veces en un programa vacío (la clase y `main`): la aparición 2 es otra vez la primera.
    const primera = renderizarPrograma({ imports: [], sentencias: [], escapeUnicode: { caracter: '{', aparicion: 0 } });
    expect(primera).not.toBe(sin);
    expect(renderizarPrograma({ imports: [], sentencias: [], escapeUnicode: { caracter: '{', aparicion: 2 } })).toBe(primera);
    expect(renderizarPrograma({ imports: [], sentencias: [], escapeUnicode: { caracter: '{', aparicion: 1 } })).not.toBe(primera);
  });

  it('un escape no cambia el número de renglones: la línea de javac sigue señalando la misma sentencia', () => {
    const p: Programa = { imports: [], sentencias: [declaracion({ tipo: 'int', nombre: 'x', inicial: literal('5', 'int') })], escapeUnicode: { caracter: ';', aparicion: 0 } };
    expect(renderizarPrograma(p).split('\n')).toHaveLength(renderizarPrograma({ ...p, escapeUnicode: undefined }).split('\n').length);
  });
});

describe('etiquetasDe y pretendeErrorDeSintaxis — la estructura de la clase (tarea 1.35)', () => {
  it('cada rasgo estructural se deduce de su campo', () => {
    expect(etiquetasDe({ imports: [], sentencias: [], parametrosDeMain: 'String... args' })).toEqual(['main-con-otra-firma']);
    expect(etiquetasDe({ imports: [], sentencias: [], sinClase: true })).toEqual(['archivo-sin-clase']);
    expect(etiquetasDe({ imports: [], sentencias: [], escapeUnicode: { caracter: '{', aparicion: 0 } })).toEqual(['escape-unicode']);
    expect(etiquetasDe({ imports: ['import java.sqrt.*;'], sentencias: [] })).toEqual(['import-con-comodin']);
    expect(etiquetasDe({ imports: ['import java.util.Scanner;'], sentencias: [] })).toEqual([]);
  });

  it('los miembros aportan sus propios rasgos', () => {
    const p: Programa = {
      imports: [],
      sentencias: [],
      miembros: [
        { lineas: ['sealed interface I { }'], etiquetas: ['clase-sellada'] },
        { lineas: ['int x;'], etiquetas: ['campo-de-la-clase'] },
      ],
    };
    expect(etiquetasDe(p)).toEqual(['campo-de-la-clase', 'clase-sellada']);
  });

  it('un miembro marcado como sintaxis inválida hace que el programa pretenda un error de sintaxis; uno normal, no', () => {
    const conError: Programa = { imports: [], sentencias: [], miembros: [{ lineas: ['int x = 5'], etiquetas: [], sintaxisInvalida: true }] };
    const normal: Programa = { imports: [], sentencias: [], miembros: [{ lineas: ['int x = 5;'], etiquetas: [] }] };
    expect(pretendeErrorDeSintaxis(conError)).toBe(true);
    expect(pretendeErrorDeSintaxis(normal)).toBe(false);
  });
});

describe('paraCada — el `for` mejorado (tarea 1.35)', () => {
  const impresion = (variable: string) => sentenciaExpr(plantilla(['System.out.println(', ')'], [nombre(variable, 'int')], 'void'));

  it('se imprime con el tipo, el nombre y la colección, y su cuerpo entre llaves', () => {
    const p = programa(paraCada({ tipo: 'int', nombre: 'x', coleccion: nombre('datos', 'int[]'), cuerpo: [impresion('x')] }));
    expect(renderizarPrograma(p)).toBe(`${CABECERA}        for (int x : datos) {\n            System.out.println(x);\n        }\n${PIE}`);
  });

  it('con `final` y con un tipo calificado o de arreglo', () => {
    const conFinal = programa(paraCada({ tipo: 'String', nombre: 's', coleccion: nombre('nombres', 'String[]'), cuerpo: [], esFinal: true }));
    expect(renderizarPrograma(conFinal)).toContain('for (final String s : nombres) {');
    const conArreglo = programa(paraCada({ tipo: 'int[]', nombre: 'fila', coleccion: nombre('m', 'int[][]'), cuerpo: [] }));
    expect(renderizarPrograma(conArreglo)).toContain('for (int[] fila : m) {');
  });

  it('sentenciasDe recorre su cuerpo, y todasLasExprs incluye la colección y las expresiones del cuerpo', () => {
    const p = programa(paraCada({ tipo: 'int', nombre: 'x', coleccion: nombre('datos', 'int[]'), cuerpo: [impresion('x'), salto('break')] }));
    expect([...sentenciasDe(p.sentencias)].map((s) => s.k)).toEqual(['para-cada', 'expresion', 'salto']);
    expect([...todasLasExprs(p)].map((e) => renderizarExpr(e))).toContain('datos');
    expect([...todasLasExprs(p)].map((e) => renderizarExpr(e))).toContain('System.out.println(x)');
  });

  it('lleva el rasgo for-mejorado, y el break de su cuerpo el suyo', () => {
    const p = programa(paraCada({ tipo: 'int', nombre: 'x', coleccion: nombre('datos', 'int[]'), cuerpo: [salto('break')] }));
    expect(etiquetasDe(p)).toEqual(['break', 'for-mejorado']);
  });
});
