// RED de la tarea 0.12: compilador.ts orquesta léxico+sintaxis→IR y fija ResultadoCompilacion
// (design.md §1.3). Las 5 pasadas completas (atribución, alcanzabilidad…) llegan en la tarea 1.14;
// aquí solo léxico+sintaxis, que ya es un subconjunto real de esas pasadas.
import { describe, expect, it, vi } from 'vitest';
import { compilar } from './compilador.ts';
import * as analizadorSintactico from './sintaxis/analizador-sintactico.ts';
import { MAXIMO_DE_TOKENS_DE_UN_PROGRAMA } from './limites.ts';
import { tokenizar } from './lexico/analizador-lexico.ts';
import { TablaDeLineas } from './fuente/tabla-de-lineas.ts';

// Tarea 1.36: el analizador sintáctico se envuelve para poder INYECTAR una falla interna en las pruebas de «solo un ErrorDeCompilacion es un error de compilación» (por omisión llama al real).
vi.mock('./sintaxis/analizador-sintactico.ts', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('./sintaxis/analizador-sintactico.ts')>();
  return { ...original, analizarPrograma: vi.fn(original.analizarPrograma) };
});

describe('compilar', () => {
  it('compila el programa dorado y produce programa + vista', () => {
    const fuente = [
      'public class MiPrograma {',
      '    public static void main(String[] args) {',
      '        System.out.println("Hola, mundo");',
      '    }',
      '}',
      '',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error('se esperaba ok:true');
    expect(resultado.programa.ir.sentencias).toHaveLength(1);
    expect(resultado.programa.ir.sentencias[0]).toMatchObject({ forma: 'expresion', clasePaso: 'impresion' });
    expect(resultado.programa.arranque).toBeNull();
    expect(resultado.vista.fuente).toBe(fuente);
    expect(resultado.vista.nodos).toHaveLength(1); // Tarea 2.16: la vista trae los nodos del programa (línea y plan de cada paso)
    expect(resultado.vista.nodos[0]).toMatchObject({ clase: 'expresion', linea: 3 });
  });

  it('devuelve ok:false con un Problema real (categoría y línea calibrada de javac) si no compila', () => {
    // Falta el ";" tras println("x"). Actualizado en el sub-lote 1-D2a (task_e4ca8312): la
    // calibración exacta de javac ("al final del token anterior", design.md §2.6 —
    // `esperarTexto` ahora la aplica para ";"/")", ver cursor-de-tokens.ts) da la línea 3 (el fin
    // de "println(\"x\")"), NUNCA la línea 4 de la "}" que sigue — antes de esa corrección, esta
    // prueba documentaba a propósito el comportamiento SIN calibrar de la rebanada vertical (0.12).
    const fuente = [
      'class C {',
      '  public static void main(String[] a) {',
      '    System.out.println("x")',
      '  }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.categoria).toBe('error-compilacion');
    expect(resultado.problema.linea).toBe(3);
    expect(resultado.adicionales).toBe(0);
  });

  // Tarea 1.11 (cierre de CodigoProblema): el MISMO error de arriba, ahora con su código real —
  // "falta-punto-y-coma" en vez del genérico "error-no-clasificado" de siempre.
  it('err01 de exploracion/03: el Problema de arriba trae el código real "falta-punto-y-coma"', () => {
    const fuente = 'class C { public static void main(String[] a) { int x = 5 } }';
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.codigo).toBe('falta-punto-y-coma');
  });

  it('err23/err32 de exploracion/03: paréntesis de cierre faltante trae el código "falta-parentesis-cierre"', () => {
    const resultado = compilar('class C { public static void main(String[] a) { System.out.println("x"; } }');
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.codigo).toBe('falta-parentesis-cierre');
  });

  it('nunca lanza por un error del alumno: hasta un carácter no reconocido se convierte en Problema, nunca en excepción (D2)', () => {
    expect(() => compilar('#$%')).not.toThrow();
    const resultado = compilar('#$%');
    expect(resultado.ok).toBe(false);
  });
});

// Tarea 1.28: `Problema` es una unión discriminada y su construcción, en `compilador.ts`, elige a mano
// los cinco campos del contrato (design.md §2.2) — nunca copia el objeto de origen. Los avisos
// sintácticos salen de los PROPIOS nodos del árbol (que traen su `tipo` interno), y una copia con
// `...` los habría filtrado hacia la interfaz: esta prueba fija la forma EXACTA del `Problema`, venga
// de la pasada que venga. Programas verificados con javac 17.0.18 real: `int[]`, el ternario, `0x10`,
// `s.split` y `println(x)` COMPILAN; `int x = y;` (cannot find symbol) y `int x = 5` (';' expected) NO.
describe('compilar — el Problema tiene EXACTAMENTE las claves del contrato, venga de la pasada que venga (tarea 1.28)', () => {
  const CLAVES_DEL_CONTRATO = ['categoria', 'codigo', 'datos', 'linea', 'rango'];
  const conMain = (cuerpo: string): string => `class C { public static void main(String[] a) { ${cuerpo} } }`;

  it.each([
    ['un aviso sintáctico (arreglo, nodo del árbol)', conMain('int[] d = new int[3];'), 'no-disponible'],
    ['un aviso de expresión (ternario, nodo del árbol)', conMain('int x = 1 > 0 ? 1 : 2;'), 'no-disponible'],
    ['un aviso léxico (literal hexadecimal, token)', conMain('int x = 0x10;'), 'no-disponible'],
    ['un aviso de biblioteca (String.split, atribución)', conMain('String s = "a,b"; s.split(",");'), 'no-disponible'],
    ['lo que el motor todavía no ejecuta (un double, que necesita Double.toString de la biblioteca)', conMain('double x = 5.5; System.out.println(x);'), 'no-disponible'],
    ['un error de atribución (variable no declarada)', conMain('int x = y;'), 'error-compilacion'],
    ['un error de sintaxis (falta el ";")', conMain('int x = 5'), 'error-compilacion'],
  ] as const)('%s: solo categoria, codigo, rango, linea y datos', (_caso, fuente, categoria) => {
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.problema.categoria).toBe(categoria);
    expect(Object.keys(resultado.problema).sort()).toEqual(CLAVES_DEL_CONTRATO);
  });
});

// Tarea 1.28 (agregada por el orquestador — hallazgo verificado de punta a punta, D2/regla 5 de
// CLAUDE.md): antes, el `catch` de `compilar()` convertía CUALQUIER excepción en un `Problema` de
// `categoria:'error-compilacion'`, incluidos los fallos del propio motor (un TypeError, un
// RangeError...): con `rango:{0,0}` (línea SIEMPRE 1) y el mensaje de JavaScript en `datos.mensaje`.
// Una vez que la pantalla muestre el texto real de cada problema, un bug del motor se habría leído
// como «Línea 1: Hay un error de sintaxis aquí: Maximum call stack size exceeded» — un error de
// sintaxis inventado, en inglés, para un programa cuyo único problema es NUESTRO. Solo
// `ErrorDeCompilacion` (el error del ALUMNO, con posición) es un `error-compilacion`; cualquier otra
// excepción es un fallo interno y se propaga fuera de `compilar()` (el trabajador la convierte en
// `error-interno`, ver `trabajador.test.ts`).
//
// Tarea 1.36 (C-4b): ANTES la entrada que forzaba el fallo era «legítima, sin simular nada»: una expresión con 100 000 paréntesis anidados (más allá del límite de la pila del analizador
// de descenso recursivo; con javac 17.0.18 real, 500 niveles compilan y 100 000 matan a javac con su `StackOverflowError`). El tope de tamaño de `limites.ts` detiene ahora esa entrada
// ANTES del análisis sintáctico (es un programa que no es de clase: aviso honesto), y con menos de 4 000 elementos el analizador ya no agota la pila (se midieron 1 990 niveles). Que NUESTRO
// fallo no se disfrace de error del alumno se sigue afirmando, ahora con una falla INYECTADA en el analizador: la prueba ya no depende de cuánta pila tenga la máquina.
describe('compilar — solo un ErrorDeCompilacion es un error de compilación (tarea 1.28)', () => {
  const fallaDelAnalizador = (): never => {
    throw new RangeError('Maximum call stack size exceeded');
  };

  it('una excepción ajena al alumno (agotar la pila del analizador) se propaga: NO se disfraza de error de sintaxis', () => {
    vi.mocked(analizadorSintactico.analizarPrograma).mockImplementationOnce(fallaDelAnalizador);
    expect(() => compilar('class C { public static void main(String[] a) { int x = 1; } }')).toThrow(RangeError);
  });

  it('triangulación: aunque un aviso léxico ("0x10", hexadecimal) preceda a la falla, el fallo interno sigue propagándose', () => {
    vi.mocked(analizadorSintactico.analizarPrograma).mockImplementationOnce(fallaDelAnalizador);
    expect(() => compilar('class C { public static void main(String[] a) { int y = 0x10; int x = 1; } }')).toThrow(RangeError);
  });

  it('contraste: un ErrorDeCompilacion real (falta el ";") SIGUE siendo un Problema "error-compilacion", nunca una excepción', () => {
    const fuente = 'class C { public static void main(String[] a) { int x = 5 } }';
    const resultado = compilar(fuente);
    expect(resultado).toMatchObject({ ok: false, problema: { categoria: 'error-compilacion', codigo: 'falta-punto-y-coma' } });
  });

  it('la entrada de antes (100 000 paréntesis anidados) ya no llega al analizador: es el aviso de tamaño, no una excepción', () => {
    const niveles = 100_000;
    const resultado = compilar(`class C { public static void main(String[] a) { int x = ${'('.repeat(niveles)}1${')'.repeat(niveles)}; } }`);
    expect(resultado).toMatchObject({ ok: false, problema: { categoria: 'no-disponible', codigo: 'programa-demasiado-grande' } });
  });

  // (Tarea 1.37: el comentario de abajo describía el riesgo 9 de la 1.36; ahora el anidamiento muy por encima del tope es un aviso, ver «un programa demasiado anidado» al final de este archivo.)
  // La pila que agota el analizador depende del entorno: con la de Node por omisión aguanta 1 900 niveles de paréntesis (HEAD y ahora), con la del ejecutor de pruebas se agota entre 500 y 700. Aquí solo se
  // afirma lo que vale en cualquiera: un anidamiento muy por encima del que escribe un alumno (300 niveles) compila sin lanzar nada.
  it('un anidamiento de 300 niveles de paréntesis, de llaves y de `else if` (muy por encima del de un alumno) compila sin lanzar nada', () => {
    const niveles = 300;
    expect(() => compilar(`class C { public static void main(String[] a) { int x = ${'('.repeat(niveles)}1${')'.repeat(niveles)}; } }`)).not.toThrow();
    expect(() => compilar(`class C { public static void main(String[] a) { ${'{'.repeat(niveles)}${'}'.repeat(niveles)} } }`)).not.toThrow();
    expect(() => compilar(`class C { public static void main(String[] a) { int k = 1; ${'if (k == 0) { } else '.repeat(niveles)}{ } } }`)).not.toThrow();
  });
});

// Corrección obligatoria (sub-lote 1-B, regla 5 de CLAUDE.md: nunca un resultado inventado).
// Verificado contra javac 17 real: "int x = 08;" y "int y = 09;" NO compilan ("';' expected");
// "int z = 010;" SÍ compila y vale 8 (octal real, ya cubierto como NO-DISP desde la tarea 1.1).
describe('compilar — "08"/"09" nunca se aceptan como decimal (corrección de la simplificación de 1-A)', () => {
  function programaCon(declaracion: string): string {
    return `class C { public static void main(String[] a) { ${declaracion} } }`;
  }

  it('"int x = 08;" jamás compila con el valor 8: el mismo veredicto que javac (rechazo)', () => {
    const resultado = compilar(programaCon('int x = 08;'));
    expect(resultado.ok).toBe(false);
  });

  it('"int y = 09;" tampoco compila (triangulación del mismo dígito inválido, 9)', () => {
    const resultado = compilar(programaCon('int y = 09;'));
    expect(resultado.ok).toBe(false);
  });

  it('un octal válido como "010" sigue compilando distinto: NO-DISP, no error de sintaxis (contraste)', () => {
    // No debe confundirse con el caso anterior: 010 es octal BIEN formado (sin dígitos 8/9), así
    // que javac SÍ lo acepta (con el valor 8) — el visualizador lo marca "no disponible" (ya
    // cubierto desde 1.1), nunca lo rechaza como si fuera un error de sintaxis.
    const resultado = compilar(programaCon('int z = 010;'));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.categoria).not.toBe('error-compilacion');
  });
});

// Tarea 1.8 (pendiente heredado del sub-lote 1-B): `println`/`print` ahora aceptan cualquier
// expresión (antes solo un literal-cadena, 0.12) — el recolector de NO-DISP (1.6/1.17) debía
// aprender a bajar a ESE argumento nuevo, igual que ya baja a la condición de un "if" o el
// selector de un "switch".
describe('compilar — NO-DISP anidado dentro del argumento de println/print (1.8)', () => {
  function programaCon(declaracion: string): string {
    return `class C { public static void main(String[] a) { ${declaracion} } }`;
  }

  it('bug real corregido: "a & b" (bits, NO-DISP) DENTRO de un println caía antes en "error-compilacion" genérico', () => {
    // Antes de este fix, `recolectarDeElemento` (no-soportado.ts) trataba 'impresion' como una
    // hoja sin subexpresiones (cierto solo cuando el argumento era SIEMPRE un literal-cadena) —
    // verificado con esta prueba antes/después: sin el fix, categoria daba 'error-compilacion'
    // (mal clasificado, D2), no 'no-disponible'.
    const resultado = compilar(programaCon('int a = 1; int b = 2; System.out.println(a & b);'));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.categoria).toBe('no-disponible');
    expect(resultado.problema.codigo).toBe('operador-bits-and');
  });

  it('triangulación: lo mismo dentro de "print" (no solo "println")', () => {
    const resultado = compilar(programaCon('int a = 1; int b = 2; System.out.print(a & b);'));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.categoria).toBe('no-disponible');
  });
});

// Corrección obligatoria (sub-lote 1-C2, orquestador): "System.out.println()" sin argumentos es
// Java real (PrintStream.println() existe) — antes se rechazaba como error de sintaxis. Verificado
// contra javac 17 real que compila limpio.
describe('compilar — "println()" sin argumentos (corrección obligatoria, sub-lote 1-C2)', () => {
  function programaCon(declaracion: string): string {
    return `class C { public static void main(String[] a) { ${declaracion} } }`;
  }

  it('un programa mínimo con "println()" vacío compila y produce la IR real (texto vacío)', () => {
    const resultado = compilar(programaCon('System.out.println();'));
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error('se esperaba ok:true');
    expect(resultado.programa.ir.sentencias).toHaveLength(1);
    expect(resultado.programa.ir.sentencias[0]).toMatchObject({ forma: 'expresion', clasePaso: 'impresion' });
  });

  it('el programa real de corpus/curso/u6-ciclos-anidados-tabla.java: "println()" ya NO se detecta como no-disponible y el "for" anidado se ejecuta (compila ok)', () => {
    const fuente = [
      'public class CiclosAnidadosTabla {',
      '    public static void main(String[] args) {',
      '        for (int fila = 1; fila <= 3; fila++) {',
      '            for (int columna = 1; columna <= 3; columna++) {',
      '                System.out.print(fila * columna + " ");',
      '            }',
      '            System.out.println();',
      '        }',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    // Antes de la corrección 1-C2, "println()" producía un error de SINTAXIS; hasta la tarea 2.16 el "for" no tenía IR y salía `ejecucion-no-disponible`. Hoy la IR baja el "for"
    // anidado y el programa se ejecuta: ni "println" ni el "for" clásico disparan ningún código de no-soportado.
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error(`se esperaba ok:true, salió ${resultado.problema.codigo}`);
    expect(resultado.programa.ir.sentencias[0]).toMatchObject({ forma: 'for' });
  });
});

// Deuda del commit 999a8ca (sub-lote 1-D1, regla 5 de CLAUDE.md): 5 errores de SINTAXIS que antes
// caían en el catch-all "error-no-clasificado" (veredicto correcto, línea correcta, pero SIN un
// código/texto específico) ahora tienen su propio CodigoProblema. Cada fuente es EXACTA a su
// archivo real de corpus/experimentos/texto/ (oráculo, tarea 0.6) — la línea esperada es la que
// javac 17 real reportó (ver el .errores correspondiente).
describe('compilar — deuda del commit 999a8ca: errores de sintaxis básicos con código real (exploracion/03 §4)', () => {
  it('err14: un "else" sin "if" (segundo else de más) -> "else-sin-if" en la línea real de javac (10)', () => {
    // corpus/experimentos/texto/err14_else_sin_if.java — javac: "10: error: 'else' without 'if'".
    const fuente = [
      'public class err14_else_sin_if {',
      '    public static void main(String[] args) {',
      '        int x = 5;',
      '        if (x > 0) {',
      '            System.out.println("positivo");',
      '        }',
      '        else {',
      '            System.out.println("no positivo");',
      '        }',
      '        else {',
      '            System.out.println("otro else de mas");',
      '        }',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.codigo).toBe('else-sin-if');
    expect(resultado.problema.linea).toBe(10);
  });

  it('err15: una cadena sin cerrar -> "cadena-sin-cerrar" en la línea real de javac (3)', () => {
    // corpus/experimentos/texto/err15_cadena_sin_cerrar.java — javac: "3: error: unclosed string literal".
    const fuente = [
      'public class err15_cadena_sin_cerrar {',
      '    public static void main(String[] args) {',
      '        String s = "hola mundo;',
      '        System.out.println(s);',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.codigo).toBe('cadena-sin-cerrar');
    expect(resultado.problema.linea).toBe(3);
  });

  it('triangulación: una cadena sin cerrar que llega hasta el FIN DE ARCHIVO (sin salto de línea) también da "cadena-sin-cerrar"', () => {
    const fuente = 'class C { public static void main(String[] a) { String s = "sin cerrar';
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.codigo).toBe('cadena-sin-cerrar');
  });

  it('err16: falta la "}" de cierre de la clase (fin de archivo inesperado) -> "fin-de-archivo-inesperado" en la línea real de javac (5, NUNCA la línea 6 vacía tras el último salto de línea)', () => {
    // corpus/experimentos/texto/err16_eof_inesperado.java (termina en "}\n") — javac:
    // "5: error: reached end of file while parsing", con el caret justo tras la "}" de la línea 5.
    // Ancla verificada: el FIN del último token real (la "}" de main), NUNCA la posición cruda del
    // token "eof" (que cae en la línea 6, vacía e inexistente, por el salto de línea final).
    const fuente = [
      'public class err16_eof_inesperado {',
      '    public static void main(String[] args) {',
      '        int x = 5;',
      '        System.out.println(x);',
      '    }',
      '',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.codigo).toBe('fin-de-archivo-inesperado');
    expect(resultado.problema.linea).toBe(5);
  });

  it('err17: sobra una "}" tras cerrar la clase -> "llave-de-cierre-sobrante" en la línea real de javac (7)', () => {
    // corpus/experimentos/texto/err17_llaves_desbalanceadas.java — javac:
    // "7: error: class, interface, enum, or record expected", apuntando a la "}" sobrante.
    const fuente = [
      'public class err17_llaves_desbalanceadas {',
      '    public static void main(String[] args) {',
      '        int x = 5;',
      '        System.out.println(x);',
      '    }',
      '}',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.codigo).toBe('llave-de-cierre-sobrante');
    expect(resultado.problema.linea).toBe(7);
  });

  it('err22: falta la "{" de apertura del cuerpo de "main" -> "llave-de-metodo-faltante" en la línea real de javac (2, el final de "args)", NUNCA la línea 3 donde arranca el siguiente token real)', () => {
    // corpus/experimentos/texto/err22_falta_llave_metodo.java — javac reporta EN CASCADA
    // ("';' expected" en la línea 2 + 3 errores más, exploracion/03 §4.1), pero el simulador
    // muestra SOLO el primero (recomendación fuerte del catálogo): la línea 2, ancladA al final de
    // "args)" — NUNCA la línea 3 (donde arranca "int x = 5;", el siguiente token real).
    const fuente = [
      'public class err22_falta_llave_metodo {',
      '    public static void main(String[] args)',
      '        int x = 5;',
      '        System.out.println(x);',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.codigo).toBe('llave-de-metodo-faltante');
    expect(resultado.problema.linea).toBe(2);
  });

  it('mutante real (sub-lote 1-D4, tarea 1.16): falta la "{" de apertura del CUERPO de la CLASE -> "llave-de-clase-faltante" en la línea real de javac (1, el final del nombre de la clase), NUNCA la línea del siguiente token real', () => {
    // corpus/mutantes u3-hola-mundo.java#24 (mutación "quitar-puntuacion" sobre la "{" de la
    // clase) — javac: "'{' expected" en la línea 1 (justo tras el nombre de la clase, MISMO
    // patrón que err22 arriba para el "{" de "main"); antes de esta corrección, `analizarClase`
    // usaba `cursor.esperarTexto('{')` genérico (ancla en el token inesperado que SÍ encontró,
    // "public" de la línea 2) -- nunca el patrón de `finDelTokenAnterior()` que ya usaba `analizarMain`.
    const fuente = [
      'public class MiPrograma ',
      '    public static void main(String[] args) {',
      '        System.out.println("Hola, mundo");',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.codigo).toBe('llave-de-clase-faltante');
    expect(resultado.problema.linea).toBe(1);
  });

  it('struct07: "package" DESPUÉS de un "import" -> "paquete-despues-de-import" en la línea real de javac (2)', () => {
    // corpus/experimentos/texto/struct07_package_fuera_de_lugar.java — javac:
    // "2: error: class, interface, enum, or record expected" (MISMO mensaje crudo que err17, pero
    // un mensaje amable DISTINTO: aquí el problema es el orden, no una llave de más).
    const fuente = [
      'import java.util.Scanner;',
      'package paquetedeprueba;',
      'public class struct07_package_fuera_de_lugar {',
      '    public static void main(String[] args) {',
      '        System.out.println("hola");',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.codigo).toBe('paquete-despues-de-import');
    expect(resultado.problema.linea).toBe(2);
  });
});

// Corrección obligatoria (sub-lote 1-D2a, task_e4ca8312, orquestador): "esperarTexto(';')"/
// "esperarTexto(')')" anclaban SIEMPRE en el token INESPERADO que encontraban, nunca en el FIN del
// token anterior -- verificado con javac 17 real que esto da la línea EQUIVOCADA para el error MÁS
// común de un alumno ("falta ;") en código real de varias líneas (el caso normal: las pruebas
// anteriores solo usaban fuentes de una línea, donde ambas reglas coinciden). Fuente EXACTA de
// corpus/experimentos/texto/err01_falta_punto_coma.java (oráculo, tarea 0.6); línea verificada
// contra su .errores real ("3: error: ';' expected"). El caso de ")" se verificó ad-hoc contra
// javac 17 real en una carpeta temporal (borrada al terminar, CLAUDE.md regla del JDK): no existe
// un archivo multi-línea de ")" faltante en el catálogo (err23/err32 son de una sola línea).
describe('compilar — corrección: "falta-punto-y-coma"/"falta-parentesis-cierre" anclan en el FIN del token anterior, no en el token inesperado (multi-línea, task_e4ca8312)', () => {
  it('";" faltante tras un DECLARADOR multi-línea: línea 3 (fin de "5"), NUNCA la línea 4 donde arranca "System" (corpus real err01)', () => {
    const fuente = [
      'public class err01_falta_punto_coma {',
      '    public static void main(String[] args) {',
      '        int x = 5',
      '        System.out.println(x);',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.codigo).toBe('falta-punto-y-coma');
    expect(resultado.problema.linea).toBe(3);
  });

  it('triangulación: ";" faltante tras una SENTENCIA (no una declaración) multi-línea: línea 3 (fin de la llamada), NUNCA la línea 4', () => {
    const fuente = [
      'public class Prueba {',
      '    public static void main(String[] args) {',
      '        System.out.println("hola")',
      '        System.out.println("mundo");',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.codigo).toBe('falta-punto-y-coma');
    expect(resultado.problema.linea).toBe(3);
  });

  it('")" faltante multi-línea (llamada a "println"): línea 3 (fin del literal), NUNCA la línea 4 (verificado ad-hoc contra javac 17 real)', () => {
    const fuente = [
      'public class Prueba {',
      '    public static void main(String[] args) {',
      '        System.out.println("hola"',
      '        System.out.println("mundo");',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.codigo).toBe('falta-parentesis-cierre');
    expect(resultado.problema.linea).toBe(3);
  });
});

// Tarea 1.14 (Orquestación de las 5 pasadas, ADR 004, REQ-COMP-005/006/009): conecta atribución →
// alcanzabilidad → asignación definitiva → arranque a `compilar()` por primera vez — ninguna de
// las 4 estaba wireada hasta ahora (cada una tiene su propia prueba unitaria, pero `compilar()`
// nunca las llamaba). Fuentes inline (idénticas a `corpus/experimentos/texto/`, línea verificada
// contra el `.errores` real de javac correspondiente) -- el barrido completo que SÍ lee esos
// archivos directamente vive en `pruebas/compilacion/catalogo-semantico.test.ts` (ver nota debajo).
describe('compilar — pasada 2 (atribución) conectada por primera vez (tarea 1.14)', () => {
  it('err02 de exploracion/03: variable no declarada -> "variable-no-declarada" en la línea real de javac (3), no el catch-all genérico', () => {
    const fuente = [
      'public class err02_simbolo_no_encontrado_variable {',
      '    public static void main(String[] args) {',
      '        System.out.println(edad);',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.categoria).toBe('error-compilacion');
    expect(resultado.problema.codigo).toBe('variable-no-declarada');
    expect(resultado.problema.linea).toBe(3);
  });
});

describe('compilar — pasada 3 (alcanzabilidad) conectada por primera vez (tarea 1.14)', () => {
  it('err11 de exploracion/03: sentencia tras "return" incondicional -> "sentencia-inalcanzable" en la línea real de javac (5)', () => {
    const fuente = [
      'public class err11_unreachable_statement {',
      '    public static void main(String[] args) {',
      '        int x = 5;',
      '        return;',
      '        System.out.println(x);',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.codigo).toBe('sentencia-inalcanzable');
    expect(resultado.problema.linea).toBe(5);
  });
});

describe('compilar — pasada 4 (asignación definitiva) conectada por primera vez (tarea 1.14)', () => {
  it('err05 de exploracion/03: variable sin inicializar usada -> "variable-posiblemente-no-asignada" en la línea real de javac (4)', () => {
    const fuente = [
      'public class err05_variable_no_inicializada_simple {',
      '    public static void main(String[] args) {',
      '        int x;',
      '        System.out.println(x);',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.codigo).toBe('variable-posiblemente-no-asignada');
    expect(resultado.problema.linea).toBe(4);
  });
});

// REQ-COMP-006, escenarios verificados de design.md §2.1 (engram discovery orden-fases-javac/
// orden-flujo-javac, sdd-design 2026-09-25): cuando dos pasadas DISTINTAS tendrían, cada una, algo
// que reportar, javac SOLO informa la de la pasada MÁS TEMPRANA -- sin importar que el problema de
// la pasada posterior esté en una línea ANTERIOR del texto.
describe('compilar — ADR 004: solo el primer problema de la primera pasada que falla (REQ-COMP-006)', () => {
  it('un error de TIPOS (pasada 2) oculta una variable sin asignar (pasada 4) en una línea ANTERIOR', () => {
    const fuente = [
      'public class Prueba {',
      '    public static void main(String[] args) {',
      '        int x;',
      '        System.out.println(x);',
      '        int y = "hola";',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    // Gana el de tipos (línea 5, pasada 2) — NUNCA "variable-posiblemente-no-asignada" de "x"
    // (línea 4, pasada 4), aunque esa línea sea anterior en el texto.
    expect(resultado.problema.codigo).toBe('tipos-incompatibles-en-asignacion');
    expect(resultado.problema.linea).toBe(5);
  });

  it('la ALCANZABILIDAD (pasada 3) se informa antes que la asignación definitiva (pasada 4), aunque esté en una línea posterior', () => {
    const fuente = [
      'public class Prueba {',
      '    public static void main(String[] args) {',
      '        int x;',
      '        System.out.println(x);',
      '        return;',
      '        System.out.println("fin");',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    // Gana la sentencia inalcanzable (línea 6, pasada 3) — NUNCA "variable-posiblemente-no-asignada"
    // de "x" (línea 4, pasada 4), aunque esa línea sea anterior en el texto.
    expect(resultado.problema.codigo).toBe('sentencia-inalcanzable');
    expect(resultado.problema.linea).toBe(6);
  });
});

// Tarea 1.15 (REQ-COMP-007/008): "compila limpio" (`ok:true`) es justo lo que exige la decisión
// del orquestador (design.md §2.2) -- el problema de arranque viaja en `programa.arranque`, listo
// para que `crearEjecucion` lo convierta en una "excepción en ejecución" (ver ejecucion.test.ts).
describe('compilar — arranque (tarea 1.15): "sin main" / "main sin static" compilan limpio, con el problema en programa.arranque', () => {
  it('REQ-COMP-008: una clase sin ningún "main" da ok:true, con programa.arranque = "sin-main"', () => {
    const resultado = compilar('public class Ejercicio3 { }');
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error('se esperaba ok:true (javac SÍ compila esto)');
    expect(resultado.programa.ir.sentencias).toEqual([]);
    expect(resultado.programa.arranque?.codigo).toBe('sin-main');
    expect(resultado.programa.arranque?.nombreClase).toBe('Ejercicio3');
  });

  it('REQ-COMP-007: "public void main" (sin "static") da ok:true, con programa.arranque = "main-no-static"', () => {
    const resultado = compilar('public class Demo { public void main(String[] args) { } }');
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error('se esperaba ok:true (javac SÍ compila esto)');
    expect(resultado.programa.arranque?.codigo).toBe('main-no-static');
    expect(resultado.programa.arranque?.nombreClase).toBe('Demo');
  });

  it('triangulación: un "main" static normal sigue dando programa.arranque = null (el caso de siempre no cambió)', () => {
    const resultado = compilar('class C { public static void main(String[] a) { System.out.println("x"); } }');
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error('se esperaba ok:true');
    expect(resultado.programa.arranque).toBeNull();
  });

  // Sub-lote 1-D2c (design.md §2.1, task_0b5b6e47): el 3er caso de arranque que design.md siempre
  // había listado ("sin static, sin main, no public") pero que 1.15 nunca verificó. Verificado
  // contra el JDK 17 real: "static void main" (SIN "public") da el mensaje EXACTO de "sin-main" —
  // el lanzador (`Class#getMethod`) solo encuentra métodos PÚBLICOS.
  it('"main sin public": da ok:true (javac SÍ compila), con programa.arranque = "sin-main" (mismo mensaje que "sin main" real)', () => {
    const resultado = compilar('public class SoloEstatico { static void main(String[] args) { } }');
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) throw new Error('se esperaba ok:true (javac SÍ compila esto)');
    expect(resultado.programa.arranque?.codigo).toBe('sin-main');
    expect(resultado.programa.arranque?.nombreClase).toBe('SoloEstatico');
  });
});

// REQ-COMP-009: el visualizador no representa archivos -- nunca debe existir un chequeo de "el
// nombre de la clase pública debe coincidir con el archivo" (ese error de javac no tiene sentido
// sin sistema de archivos real).
describe('compilar — REQ-COMP-009: el nombre de la clase pública nunca se valida contra ningún archivo', () => {
  it('una clase pública con cualquier nombre compila igual (sin preguntar ni validar un nombre de archivo)', () => {
    const fuente = [
      'public class CalculadoraVueltos {',
      '    public static void main(String[] args) {',
      '        System.out.println("hola");',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(true);
  });
});

// Tarea 1.14: el barrido de extremo a extremo contra el catálogo de 42 casos verificados de
// exploracion/03 §4 (leyendo `corpus/experimentos/texto/` real) vive en
// `pruebas/compilacion/catalogo-semantico.test.ts` -- `node:fs`/`node:path` no type-checan dentro
// de `src/motor/**` (tsconfig.motor.json fija `types: []`, ADR 001: el motor no toca Node/DOM ni
// siquiera en sus pruebas), mismo patrón ya establecido por `pruebas/compilacion/catalogo.test.ts`
// (tarea 1.17) para el mismo problema.

// Tarea NUEVA (sub-lote 1-D5, JLS 15.12, cierre de C7 -- mutante REAL de la tarea 1.16,
// `u5-switch-menu-calculadora.java#49` de `corpus/mutantes/veredictos.jsonl`, reproducido tal
// cual): "MethodInvocation" SIEMPRE exige un Identifier justo antes de "("
// (`MethodName(...)`/`Primary.Identifier(...)`) -- NINGUNA forma de la JLS admite un Primary
// arbitrario (p. ej. un literal de cadena) directamente seguido de "(...)" como llamada. Antes de
// esta tarea, `expresiones.ts` (Pratt) aceptaba CUALQUIER expresión primaria como "callee" sin
// restricción sintáctica, así que `"texto"(argumentos)` se parseaba como una llamada válida (el
// mutante de la línea 20 -- "intercambiar-vecinos" sobre "+ (" de "Resultado: " + (a - b) --
// terminaba aceptándose en silencio). Verificado contra javac 17 real (mismo dato que
// `veredictos.jsonl`): "')' expected" en la línea 20 -- el "(" nunca puede empezar una llamada tras
// un literal de cadena, así que javac lo trata como el cierre que le falta a "println(...)".
describe('compilar — mutante real u5-switch-menu-calculadora.java#49 (JLS 15.12, callee de una llamada)', () => {
  it('"Resultado: " ( +a - b) dentro de println: mismo veredicto que javac -- "falta-parentesis-cierre" en la línea 20, NUNCA una llamada con callee de cadena', () => {
    const fuente = [
      'import java.util.Scanner;',
      '',
      'public class MenuCalculadora {',
      '    public static void main(String[] args) {',
      '        Scanner teclado = new Scanner(System.in);',
      '',
      '        System.out.print("Elige una operación (1=suma, 2=resta, 3=multiplicación): ");',
      '        int opcion = teclado.nextInt();',
      '',
      '        System.out.print("Primer número: ");',
      '        double a = teclado.nextDouble();',
      '        System.out.print("Segundo número: ");',
      '        double b = teclado.nextDouble();',
      '',
      '        switch (opcion) {',
      '            case 1:',
      '                System.out.println("Resultado: " + (a + b));',
      '                break;',
      '            case 2:',
      '                System.out.println("Resultado: " ( +a - b));',
      '                break;',
      '            case 3:',
      '                System.out.println("Resultado: " + (a * b));',
      '                break;',
      '            default:',
      '                System.out.println("Opción no válida.");',
      '        }',
      '    }',
      '}',
      '',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false (javac lo rechaza: "\')\' expected")');
    expect(resultado.problema.categoria).toBe('error-compilacion');
    expect(resultado.problema.codigo).toBe('falta-parentesis-cierre');
    expect(resultado.problema.linea).toBe(20);
  });
});

// Tarea NUEVA (sub-lote 1-D5, cierre de C7 -- mutante REAL `u6-ciclos-anidados-tabla.java#52` de
// `corpus/mutantes/veredictos.jsonl`, reproducido tal cual): un literal "3f" (float, léxicamente
// NO-DISP pero un literal REAL y válido -- verificado que javac también lo tokeniza así, JLS
// 3.10.2) DENTRO de la condición de un "for" hacía que el "for" COMPLETO se aceptara en silencio
// (categoría 'no-disponible', el mismo trato que "no lo mostramos" en cualquier OTRA posición) --
// aunque javac SÍ rechace el programa completo ("';' expected" en la línea 3, porque lo que sigue
// al literal -- "ila" -- rompe la estructura real del "for", un problema TOTALMENTE independiente
// de que el literal sea float). Verificado contra javac 17 real (mismo dato que
// `veredictos.jsonl`).
describe('compilar — mutante real u6-ciclos-anidados-tabla.java#52 (propagación de NO-DISP dentro de un "for")', () => {
  it('"fila <= 3fila ;++" dentro del for: mismo veredicto que javac -- "falta-punto-y-coma" en la línea 3, NUNCA "no-disponible"', () => {
    const fuente = [
      'public class CiclosAnidadosTabla {',
      '    public static void main(String[] args) {',
      '        for (int fila = 1; fila <= 3fila ;++) {',
      '            for (int columna = 1; columna <= 3; columna++) {',
      '                System.out.print(fila * columna + " ");',
      '            }',
      '            System.out.println();',
      '        }',
      '    }',
      '}',
      '',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false (javac lo rechaza: "\';\' expected")');
    expect(resultado.problema.categoria).toBe('error-compilacion');
    expect(resultado.problema.codigo).toBe('falta-punto-y-coma');
    expect(resultado.problema.linea).toBe(3);
  });
});

// Tarea 1.24 (hallazgo real durante el catálogo es-MX de avisos "no disponible", orquestador):
// `construirResultadoDeAtribucion` (arriba) ignoraba `problema.categoria` y SIEMPRE devolvía
// 'error-compilacion' -- el comentario de la tarea 1.14 ("las pasadas 2-4 nunca producen NO-DISP")
// quedó DESACTUALIZADO desde la tarea 1.19 (biblioteca conectada a la atribución, sub-lote 1-D2c),
// que SÍ hace que `atribuir()` devuelva `categoria:'no-disponible'` para un miembro real-pero-no-
// soportado (`s.split`, `Math.sin`...) -- verificado con `atribuir()` en aislamiento
// (atribucion.test.ts líneas 93-106), pero NUNCA a través de `compilar()` completo, que es lo que
// de verdad ve un alumno. RED real (ejecutado antes de este fix, script de verificación aparte):
// `compilar('class C { public static void main(String[] a) { String s = "a,b"; s.split(","); } }')`
// daba `{ categoria: 'error-compilacion', codigo: 'miembro-de-biblioteca-no-soportado' }` -- D2: mal
// clasificado, REQ-SUB-006 exige el ícono/título de "No disponible", NUNCA el de "Error de
// compilación", para una construcción que Java SÍ acepta.
describe('compilar — un miembro de biblioteca real-pero-no-soportado es "no-disponible", nunca "error-compilacion" (hallazgo de la tarea 1.24)', () => {
  it('"s.split(\',\')" (String.split, REQ-SUB-005/007) llega a categoria:"no-disponible" a través de compilar() completo', () => {
    const fuente = 'class C { public static void main(String[] a) { String s = "a,b"; s.split(","); } }';
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.categoria).toBe('no-disponible');
    // Tarea 1.26: el código único "miembro-de-biblioteca-no-soportado" se dividió en 3 (método,
    // campo, constructor) — "split" es una llamada de MÉTODO.
    expect(resultado.problema.codigo).toBe('metodo-de-biblioteca-no-soportado');
  });

  it('triangulación: "Math.sin(x)" (otro método real-pero-no-soportado, otra clase) también llega como "no-disponible"', () => {
    const fuente = 'class C { public static void main(String[] a) { double x = 1.0; Math.sin(x); } }';
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.categoria).toBe('no-disponible');
    expect(resultado.problema.codigo).toBe('metodo-de-biblioteca-no-soportado');
  });

  it('regresión: un error de atribución REAL (variable no declarada) sigue siendo "error-compilacion"', () => {
    const resultado = compilar('class C { public static void main(String[] a) { int x = y; } }');
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.categoria).toBe('error-compilacion');
    expect(resultado.problema.codigo).toBe('variable-no-declarada');
  });
});

// Tarea 1.29 (agregada por el orquestador, D2/regla 5 de CLAUDE.md): a través de `compilar()`
// completo — lo que de verdad ve un alumno — una clase que EXISTE en Java (design.md §2.3: «clase
// existente no soportada → NO-DISP; inexistente → error») es un aviso «No disponible», nunca «No
// reconozco… revisa que esté bien escrito». Cada fuente se compiló con javac 17 real: las de
// `import` real compilan; las de nombre mal escrito no.
describe('compilar — una clase real fuera del subconjunto es "no-disponible", una inexistente sigue siendo error (tarea 1.29)', () => {
  const conImport = (importacion: string): string =>
    `${importacion}\npublic class C {\n  public static void main(String[] a) {\n    System.out.println("hola");\n  }\n}\n`;

  it.each([
    ['import java.util.Locale;', 'java.util.Locale'],
    ['import javax.swing.JOptionPane;', 'javax.swing.JOptionPane'],
    ['import java.text.DecimalFormat;', 'java.text.DecimalFormat'],
    ['import java.math.BigDecimal;', 'java.math.BigDecimal'],
  ])('"%s" → no-disponible/clase-no-soportada, en la línea del import, con el nombre completo', (importacion, nombre) => {
    const resultado = compilar(conImport(importacion));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'clase-no-soportada', linea: 1, datos: { nombre } });
  });

  it.each(['import java.util.Scaner;', 'import javax.swing.JOptionPan;', 'import java.util.Locale2;'])(
    'triangulación negativa: "%s" (no existe) sigue siendo error-compilacion/importacion-no-reconocida',
    (importacion) => {
      const resultado = compilar(conImport(importacion));
      expect(resultado.ok).toBe(false);
      if (resultado.ok) throw new Error('se esperaba ok:false');
      expect(resultado.problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'importacion-no-reconocida', linea: 1 });
    },
  );

  it('una clase de java.lang usada sin import (StringBuilder) avisa en la línea de su declaración, no «no reconozco el tipo»', () => {
    const resultado = compilar(
      'public class C {\n  public static void main(String[] a) {\n    StringBuilder sb = new StringBuilder();\n  }\n}\n',
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'clase-no-soportada', linea: 3, datos: { nombre: 'StringBuilder' } });
  });
});

// Tarea 1.29 (causa 3): las dos fuentes REALES de `corpus/experimentos/numeros` que javac compila y que
// `compilar()` rechazaba con «se esperaba una expresión y se encontró "byte"» — a través del compilador
// completo, un cast a un primitivo fuera del subconjunto avisa en SU línea (nunca un resultado inventado).
describe('compilar — un cast a byte/short/float es "no-disponible", nunca "error-compilacion" (tarea 1.29)', () => {
  it.each(['byte', 'short', 'float'])('"(%s)" en la línea 3 → no-disponible/tipo-primitivo-no-soportado, línea 3', (tipo) => {
    const resultado = compilar(
      `public class C {\n  public static void main(String[] a) {\n    int x = (${tipo}) 200;\n  }\n}\n`,
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'tipo-primitivo-no-soportado', linea: 3 });
  });

  // Tarea 1.30 (decisión del PO 2026-09-29): el aviso nombra el tipo CONCRETO que escribió el alumno, así que el
  // `Problema` que llega a la interfaz lo lleva en `datos` — en el cast y en la declaración (dos sitios de emisión).
  it.each(['byte', 'short', 'float'])('"(%s)" en un cast: el problema manda ese tipo en sus datos', (tipo) => {
    const resultado = compilar(
      `public class C {\n  public static void main(String[] a) {\n    System.out.println((${tipo}) 200);\n  }\n}\n`,
    );
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'tipo-primitivo-no-soportado', datos: { tipo } });
  });

  it.each(['byte', 'short', 'float'])('"%s x = 1;" en una declaración: el problema manda ese tipo en sus datos', (tipo) => {
    const resultado = compilar(`public class C {\n  public static void main(String[] a) {\n    ${tipo} x = 1;\n  }\n}\n`);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'tipo-primitivo-no-soportado', linea: 3, datos: { tipo } });
  });
});

// Tarea 1.29 (causa 5): las formas de `case` con varios valores que javac 17 compila — a través de
// `compilar()` completo son avisos en la línea del `case`, nunca «se esperaba ":" y se encontró ","».
describe('compilar — varios valores en un case es "no-disponible", nunca "error-compilacion" (tarea 1.29)', () => {
  const conSwitch = (etiqueta: string): string =>
    `public class C {\n  public static void main(String[] a) {\n    int x = 2;\n    switch (x) {\n      ${etiqueta}\n        x = 0;\n    }\n  }\n}\n`;

  it.each([
    ['case 1, 2:', 'case-con-varias-etiquetas-no-soportado'],
    ['case 3, 4, 5:', 'case-con-varias-etiquetas-no-soportado'],
    ['case 1, 2 ->', 'switch-flecha-no-soportado'],
  ])('"%s" en la línea 5 → no-disponible/%s', (etiqueta, codigo) => {
    const resultado = compilar(conSwitch(etiqueta));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo, linea: 5 });
  });
});

// Tarea 1.29 (causa 10): las anotaciones que javac 17 compila — a través de `compilar()` completo son un
// aviso en la línea de la anotación, nunca «carácter no reconocido: "@"».
describe('compilar — una anotación es "no-disponible", nunca "error-compilacion" (tarea 1.29)', () => {
  it.each([
    ['sobre main', '@SuppressWarnings("unused")\npublic class C {\n  public static void main(String[] a) { }\n}\n', 1],
    ['sobre main (en la línea de main)', 'public class C {\n  @SuppressWarnings("unused")\n  public static void main(String[] a) { }\n}\n', 2],
    ['sobre una declaración local', 'public class C {\n  public static void main(String[] a) {\n    @SuppressWarnings("unused") int x = 1;\n  }\n}\n', 3],
  ])('%s → no-disponible/anotacion-no-soportada, con su línea', (_descripcion, fuente, linea) => {
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'anotacion-no-soportada', linea });
  });
});

// Tarea 1.29 (causas 11 y 12; REQ-SUB-007: «métodos propios, recursión, clases/campos/objetos propios» y «arreglos»
// → aviso): los constructores, los miembros con arreglos o genéricos, la herencia y los tipos declarados antes de la
// clase con `main` los compila javac 17 — a través de `compilar()` completo son un aviso en la línea del miembro, de
// la cabecera o del tipo, nunca un `error-compilacion`.
describe('compilar — miembros propios, herencia y tipos antes de la clase son "no-disponible", nunca "error-compilacion" (tarea 1.29)', () => {
  it.each([
    ['un constructor', 'public class C {\n  C(int x) { }\n  public static void main(String[] a) { }\n}\n', 'miembro-de-clase-no-soportado', 2],
    ['un método que devuelve un arreglo', 'public class C {\n  static int[] crear(int n) { return new int[n]; }\n  public static void main(String[] a) { }\n}\n', 'miembro-de-clase-no-soportado', 2],
    ['dos campos en una declaración', 'public class C {\n  static int a, b;\n  public static void main(String[] a) { }\n}\n', 'miembro-de-clase-no-soportado', 2],
    ['un campo genérico', 'public class C {\n  static java.util.List<String> nombres;\n  public static void main(String[] a) { }\n}\n', 'miembro-de-clase-no-soportado', 2],
    ['un método genérico', 'public class C {\n  static <T> T primero(T a) { return a; }\n  public static void main(String[] a) { }\n}\n', 'miembro-de-clase-no-soportado', 2],
    ['una clase que hereda', 'public class C extends Thread {\n  public static void main(String[] a) { }\n}\n', 'herencia-no-soportada', 1],
    ['una clase que implementa una interfaz', 'public class C implements Runnable {\n  public void run() { }\n  public static void main(String[] a) { }\n}\n', 'herencia-no-soportada', 1],
    ['una clase genérica', 'public class C<T> {\n  public static void main(String[] a) { }\n}\n', 'generico-no-soportado', 1],
    ['un enum antes de la clase', 'enum Dia { LUNES }\npublic class C {\n  public static void main(String[] a) { }\n}\n', 'otro-tipo-de-nivel-superior-no-soportado', 1],
    ['una interfaz antes de la clase (línea 3)', '\n\ninterface F { }\npublic class C {\n  public static void main(String[] a) { }\n}\n', 'otro-tipo-de-nivel-superior-no-soportado', 3],
    ['un archivo con solo una interfaz', 'interface I { void f(); }\n', 'otro-tipo-de-nivel-superior-no-soportado', 1],
    ['un assert', 'public class C {\n  public static void main(String[] a) {\n    int x = 1;\n    assert x > 0 : "positivo";\n  }\n}\n', 'assert-no-soportado', 4],
    ['una clase local', 'public class C {\n  public static void main(String[] a) {\n    class Local { }\n  }\n}\n', 'clase-local-no-soportada', 3],
    ['un bloque synchronized', 'public class C {\n  public static void main(String[] a) {\n    synchronized (C.class) { }\n  }\n}\n', 'sincronizado-no-soportado', 3],
    ['un genérico con comodín', 'public class C {\n  public static void main(String[] a) {\n    Class<?> c = null;\n  }\n}\n', 'generico-no-soportado', 3],
  ])('%s → no-disponible/%s en la línea %d', (_descripcion, fuente, codigo, linea) => {
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo, linea });
  });
});

// Tarea 1.32 (N6, JLS 6.3 y 16): leer una variable en su propio inicializador es «variable x might not have been initialized»
// (`var.might.not.have.been.initialized`, pasada de asignación definitiva), no «no existe una variable llamada x»: la variable SÍ existe.
describe('compilar — una variable leída en su propio inicializador (N6, tarea 1.32)', () => {
  it('"int x = x + 1;" es «podría no tener un valor» en la línea de la declaración, no «variable no declarada»', () => {
    const resultado = compilar(['class C {', '  public static void main(String[] a) {', '    int x = x + 1;', '  }', '}'].join('\n'));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'variable-posiblemente-no-asignada', linea: 3, datos: { nombre: 'x' } });
  });

  it('control: `int y = (y = 5) + 1;` compila (javac lo acepta): ninguna pasada lo rechaza y se ejecuta (y vale 6)', () => {
    const resultado = compilar(['class C {', '  public static void main(String[] a) {', '    int y = (y = 5) + 1;', '  }', '}'].join('\n'));
    expect(resultado.ok).toBe(true);
  });
});

// Tarea 1.35 (WARNING 3 de la re-verificación del lote 1, decisión del PO 2026-10-02; javac 17.0.18 compila estos cinco archivos sin un solo error): un programa sin ninguna
// clase no tiene nada que ejecutar. Antes salía «Hay un error de sintaxis aquí» en la línea 2 —un error de compilación que javac no da—; ahora es un aviso honesto.
// Tarea 1.36 (C-2 y W-2a de la verificación final del lote 1, JLS 3.4): el retorno de carro suelto `\r` es un fin de línea. `compilar()` normaliza los fines de línea a `\n` al entrar —el editor
// (CodeMirror) ya los entrega así, y un llamado directo, una prueba o un enlace compartido pueden traer `\r`—, y los números de línea salen como los de javac. Medido con javac 17.0.18 real.
describe('compilar — el retorno de carro suelto es un fin de línea (C-2 y W-2a, tarea 1.36, JLS 3.4)', () => {
  const programa = (cuerpo: string, fin = '\n'): string => ['public class P {', '    public static void main(String[] args) {', cuerpo, '    }', '}', ''].join(fin);

  it.each([
    ["un `char` que abre y no cierra antes del `\\r` (javac: «illegal line end in character literal»)", "        char c = '\r';", 'error-no-clasificado'],
    ['una cadena cortada por un `\\r` (javac: «unclosed string literal»)', '        String s = "a\rb";', 'cadena-sin-cerrar'],
    ['una cadena cuyo `\\r` es lo último (javac: «unclosed string literal»)', '        String s = "a\r";', 'cadena-sin-cerrar'],
    ['una cadena con una pareja `\\r\\n` adentro (javac: «unclosed string literal»)', '        String s = "a\r\nb";', 'cadena-sin-cerrar'],
    ['el `;` que falta quedaba DENTRO del comentario que el `\\r` debía cerrar (javac: `\';\' expected`)', '        int x = 1; // uno\r        int y = 2', 'falta-punto-y-coma'],
  ])('%s → error en la línea 3, no «ejecución no disponible»', (_descripcion, cuerpo, codigo) => {
    const resultado = compilar(programa(cuerpo));
    if (resultado.ok) throw new Error('se esperaba un error y salió ok: true');
    expect(resultado.problema).toMatchObject({ categoria: 'error-compilacion', codigo });
    // `';' expected` se ancla en el fin de la palabra anterior: la línea 4 (la de `int y = 2`).
    expect(resultado.problema.linea).toBe(codigo === 'falta-punto-y-coma' ? 4 : 3);
  });

  it('el comentario `//` que cierra un `\\r` NO se traga la línea siguiente (W-2a: javac compila `int x = 1; // fin<CR>int y = 2;`)', () => {
    const resultado = compilar(programa('        int x = 1; // fin\r        int y = 2;'));
    if (!resultado.ok) expect(resultado.problema.categoria).toBe('no-disponible'); // la declaración todavía no se ejecuta: aviso honesto, nunca un error
    else expect(resultado.ok).toBe(true);
  });

  it.each([
    ['solo `\\r\\n` (Windows)', '\r\n'],
    ['solo `\\r` (Mac clásico)', '\r'],
    ['una mezcla', '\r\n'],
  ])('un programa válido entero con fines de línea %s compila: ok', (_descripcion, fin) => {
    const resultado = compilar(programa('        System.out.println("x");', fin));
    expect(resultado.ok).toBe(true);
  });

  it('los números de línea siguen la cuenta de javac: `\\r\\n` y `\\r` son UN fin de línea, `\\n\\r` y `\\r\\r\\n` son DOS', () => {
    const lineaDelError = (fin: string): number => {
      const resultado = compilar(['public class P {', '    public static void main(String[] args) {', '        int x = 1;', '        int x = 2;', '    }', '}', ''].join(fin));
      if (resultado.ok) throw new Error('se esperaba un error');
      expect(resultado.problema.codigo).toBe('variable-ya-definida');
      return resultado.problema.linea;
    };
    expect([lineaDelError('\n'), lineaDelError('\r'), lineaDelError('\r\n')]).toEqual([4, 4, 4]);
    expect([lineaDelError('\n\r'), lineaDelError('\r\r\n'), lineaDelError('\r\n\r')]).toEqual([7, 7, 7]);
  });

  it('el rango y `vista.fuente` hablan del texto NORMALIZADO (sin `\\r`), para que los desplazamientos de un problema coincidan con el texto que se muestra', () => {
    const resultado = compilar(programa('        System.out.println("x");', '\r\n'));
    if (!resultado.ok) throw new Error('se esperaba ok: true');
    expect(resultado.vista.fuente).toBe(programa('        System.out.println("x");', '\n'));
    expect(resultado.vista.fuente.includes('\r')).toBe(false);
  });
});

// Tarea 1.36 (C-5 y W-10 de la verificación final del lote 1): `compilar()` de punta a punta con una constante de texto con un `double`. Los 12 + 6 programas del corpus
// (`corpus/experimentos/constantes-desconocidas/`, con los veredictos de javac) los vigila `constantes-desconocidas-del-corpus.test.ts`; aquí, los cuatro que bastan para cada pasada.
describe('compilar — una constante de texto con un número decimal es un aviso honesto, nunca una respuesta inventada (C-5 y W-10, tarea 1.36)', () => {
  const programa = (...lineas: string[]): string => ['public class P {', '    public static void main(String[] args) {', ...lineas.map((l) => `        ${l}`), '    }', '}', ''].join('\n');

  it.each([
    ['un ciclo `while` (alcanzabilidad: javac dice «unreachable statement»)', ['while ("a" + 1.5 == "a1.5") { }', 'System.out.println("x");'], 3],
    ['una etiqueta de `case` (javac la compila)', ['String s = "d1.5";', 'switch (s) {', '    case "d" + 1.5:', '        break;', '    default:', '        break;', '}'], 5],
    ['una asignación definitiva (javac compila: la condición vale `true`)', ['int x;', 'if ("a" + 1.5 == "a1.5") x = 1;', 'System.out.println(x);'], 4],
  ])('%s → aviso `constante-de-texto-con-decimal-no-soportada` en la línea de la construcción, ni `ok` ni «ejecución no disponible»', (_descripcion, lineas, linea) => {
    const resultado = compilar(programa(...lineas));
    if (resultado.ok) throw new Error('se esperaba un aviso y salió ok: true');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'constante-de-texto-con-decimal-no-soportada', linea, datos: {} });
  });

  it.each([
    ['se imprime', ['System.out.println("a" + 1.5);']],
    ['se declara y se imprime', ['String s = "a" + 1.5;', 'System.out.println(s);']],
    ['se compara sin decidir nada', ['boolean b = "a" + 1.5 == "a1.5";', 'System.out.println(b);']],
    ['un `if` que no deja ninguna variable sin asignar', ['if ("a" + 1.5 == "a1.5") {', '    System.out.println("x");', '}']],
  ])('control: un texto con un `double` que NO decide nada (%s) sigue su camino de siempre: «ejecución no disponible», sin aviso de constante', (_descripcion, lineas) => {
    const resultado = compilar(programa(...lineas));
    if (resultado.ok) throw new Error('lo que no es un literal todavía no se ejecuta: se esperaba un aviso');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'ejecucion-no-disponible' });
  });

  it('control: una condición constante CONOCIDA sigue dando el error exacto de javac (`while ("a" + 1 == "a2") { … }` es «unreachable statement»)', () => {
    const resultado = compilar(programa('while ("a" + 1 == "a2") {', '    System.out.println("nunca");', '}'));
    if (resultado.ok) throw new Error('se esperaba un error');
    expect(resultado.problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'sentencia-inalcanzable', linea: 3 });
  });
});

// Tarea 1.36 (C-4b y S-1 de la verificación final del lote 1): el tope de tamaño. javac rechaza un método de más de 65 535 bytes de bytecode (`limit.code`); el motor no genera bytecode y no lo modela:
// pone un tope CONSERVADOR en los elementos del programa y da un aviso honesto. Se revisa justo después del léxico, ANTES de las pasadas que crecían como n² con las declaraciones locales.
describe('compilar — un programa demasiado grande es un aviso honesto, no un resultado inventado ni un cuelgue (C-4b y S-1, tarea 1.36)', () => {
  /** Un programa con EXACTAMENTE `tokens` tokens (sin el de fin de archivo): el encabezado de `main` y tantas sentencias vacías `;` como hagan falta, una por línea. */
  const programaConTokens = (tokens: number): string => {
    const encabezado = 'public class P {\n    public static void main(String[] args) {\n';
    const cierre = '    }\n}\n';
    const fijos = tokenizar(encabezado + cierre).length - 1;
    return encabezado + ';\n'.repeat(tokens - fijos) + cierre;
  };
  const lineaDelAviso = (fuente: string): number | 'ok' | 'otro' => {
    const resultado = compilar(fuente);
    if (resultado.ok) return 'ok';
    return resultado.problema.codigo === 'programa-demasiado-grande' ? resultado.problema.linea : 'otro';
  };

  it('un programa de exactamente el tope de tokens se revisa como siempre: no es el aviso de tamaño (aquí, solo sentencias vacías, que todavía no se ejecutan)', () => {
    const resultado = compilar(programaConTokens(MAXIMO_DE_TOKENS_DE_UN_PROGRAMA));
    expect(typeof lineaDelAviso(programaConTokens(MAXIMO_DE_TOKENS_DE_UN_PROGRAMA))).not.toBe('number');
    if (!resultado.ok) expect(resultado.problema.codigo).toBe('ejecucion-no-disponible');
  });

  it('con UN token más es el aviso `programa-demasiado-grande`, señalado en la línea donde se pasó del tope (la del primer token de más)', () => {
    const fuente = programaConTokens(MAXIMO_DE_TOKENS_DE_UN_PROGRAMA + 1);
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error('se esperaba un aviso');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'programa-demasiado-grande', datos: {} });
    // El token de más es el del lugar tope + 1 (aquí, la `}` final de la clase): la línea del aviso es la suya.
    expect(resultado.problema.linea).toBe(new TablaDeLineas(fuente).ubicar(tokenizar(fuente)[MAXIMO_DE_TOKENS_DE_UN_PROGRAMA]!.rango.inicio).linea);
  });

  it('20 000 declaraciones locales (más de 60 s con la pasada cuadrática, S-1) terminan al instante con el aviso, sin correr ninguna pasada costosa', () => {
    const declaraciones = Array.from({ length: 20_000 }, (_, i) => `        int v${i} = ${i};`).join('\n');
    const fuente = `public class P {\n    public static void main(String[] args) {\n${declaraciones}\n    }\n}\n`;
    const antes = Date.now();
    const resultado = compilar(fuente);
    const milisegundos = Date.now() - antes;
    if (resultado.ok) throw new Error('se esperaba un aviso');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'programa-demasiado-grande' });
    expect(milisegundos).toBeLessThan(2_000);
  });

  it('8 200 sentencias `println` (javac: `limit.code`) también son el aviso, no `ok` ni «ejecución no disponible»', () => {
    const cuerpo = Array.from({ length: 8_200 }, () => '        System.out.println("x");').join('\n');
    expect(lineaDelAviso(`public class P {\n    public static void main(String[] args) {\n${cuerpo}\n    }\n}\n`)).not.toBe('ok');
    expect(lineaDelAviso(`public class P {\n    public static void main(String[] args) {\n${cuerpo}\n    }\n}\n`)).not.toBe('otro');
  });

  it('un error LÉXICO sigue ganando (el léxico corre antes del tope): una cadena sin cerrar en un programa enorme es ese error', () => {
    const cuerpo = Array.from({ length: 6_000 }, () => '        int x = 1;').join('\n');
    const resultado = compilar(`public class P {\n    public static void main(String[] args) {\n${cuerpo}\n        String s = "sin cerrar;\n    }\n}\n`);
    if (resultado.ok) throw new Error('se esperaba un error');
    expect(resultado.problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'cadena-sin-cerrar' });
  });

  it('control: un programa de clase (cientos de tokens) no cambia en nada', () => {
    const resultado = compilar(['public class P {', '    public static void main(String[] args) {', '        System.out.println("hola");', '    }', '}', ''].join('\n'));
    expect(resultado.ok).toBe(true);
  });
});

describe('compilar — un archivo sin ninguna clase (tarea 1.35)', () => {
  it.each([
    ['vacío', ''],
    ['solo un comentario', '// nada por aquí\n'],
    ['solo un `package`', 'package solo.paquete;\n'],
    ['solo un `import`', 'import java.util.Scanner;\n'],
    ['un `import` con `;;`', 'import java.util.Scanner;;\n'],
  ])('%s: no-disponible `archivo-sin-clase` en la línea 1, y ningún error de compilación', (_descripcion, fuente) => {
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'archivo-sin-clase', linea: 1, datos: {} });
  });

  it('control: código suelto sin clase sigue siendo un error de compilación (javac: class, interface, enum, or record expected)', () => {
    const resultado = compilar('int x = 5;');
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.categoria).toBe('error-compilacion');
  });
});

// Tarea 1.35 (WARNING 3 de la re-verificación del lote 1, falsos RECHAZOS, y un falso acepto hallado al revisarlos; JLS 3.3; cada programa verificado con javac 17.0.18 real):
// javac traduce los escapes Unicode en TODO el archivo ANTES de leerlo, así que un escape puede ser una comilla, un `&`, una llave o un `;` con significado sintáctico. El
// visualizador no hace esa traducción (ADR 003, D2): cuando un error aparece donde hay un escape, el error puede ser consecuencia de NO haberlo traducido, y lo honesto es el aviso
// (`escape-unicode-no-soportado`), nunca «Te falta un punto y coma» para un programa que javac compila. Las fuentes se arman con `B` (una barra real).
describe('compilar — un escape Unicode con significado sintáctico es un aviso, no un error (tarea 1.35, JLS 3.3)', () => {
  const B = '\\';
  const programa = (cuerpoDeMain: string): string => `public class P { public static void main(String[] args) { ${cuerpoDeMain} } }`;
  const problemaDe = (fuente: string) => {
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    return resultado.problema;
  };

  it.each([
    ['el escape de la comilla doble cierra la cadena', programa(`String s = "a${B}u0022; int x = 1;`)],
    ['el escape de `&` dos veces forma `&&`', programa(`boolean b = (1 > 0) ${B}u0026${B}u0026 (2 > 1);`)],
    ['el escape de `{` y el de `}` abren y cierran el cuerpo', `public class P { public static void main(String[] args) ${B}u007b int x = 5; ${B}u007d }`],
    ['el escape de `;` termina la sentencia', programa(`int x = 5 ${B}u003b`)],
    ['el escape de `+` entre dos cadenas', programa(`String s = "a" ${B}u002b "b";`)],
    ['`var` seguido de un nombre escrito con un escape (hallado en una campaña sobre el corpus: el error era «no es una sentencia», anclado en `var`)', programa(`var ${B}u0041 = 5; System.out.println(${B}u0041);`)],
    ['un tipo conocido y un nombre escrito con un escape', programa(`int ${B}u0061 = 1; System.out.println(a);`)],
  ])('%s: aviso `escape-unicode-no-soportado` (javac compila el programa)', (_descripcion, fuente) => {
    expect(problemaDe(fuente)).toMatchObject({ categoria: 'no-disponible', codigo: 'escape-unicode-no-soportado' });
  });

  // Hallado por la campaña de 100 000 programas del generador (semilla 20261201, programa 54617: `double edad = 0x1.8\u00701;`; javac 17.0.18 lo compila): un escape que EMPIEZA justo donde
  // termina el error léxico es parte del mismo literal para javac, que traduce los escapes antes de leer —`0x1.8` + `\u0070` es el flotante hexadecimal `0x1.8p1`, `0x` + `\u0031F` es
  // `0x1F`, `'a` + `\u0027` es el carácter `'a'`—, así que el error léxico puede ser consecuencia de no haberlo traducido: aviso. Antes solo contaban los escapes que empezaban ANTES
  // del fin del error.
  it.each([
    ['la `p` del exponente de un flotante hexadecimal', `double e = 0x1.8${B}u00701;`],
    ['el primer dígito de un hexadecimal', `int x = 0x${B}u0031F;`],
    ['el primer dígito de un binario', `int x = 0b${B}u0031;`],
    ['el dígito que sigue a un guion bajo', `int x = 1_${B}u0030;`],
    ['la comilla que cierra un carácter', `char c = 'a${B}u0027;`],
  ])('un escape pegado al final del literal que falla (%s) es un aviso: javac lo junta al literal y compila', (_descripcion, cuerpo) => {
    expect(problemaDe(programa(cuerpo))).toMatchObject({ categoria: 'no-disponible', codigo: 'escape-unicode-no-soportado' });
  });

  it('control: un literal mal formado con un escape SEPARADO de él (un espacio, o un comentario más adelante) sigue siendo un error de compilación', () => {
    expect(problemaDe(programa(`double e = 0x1.8 ${B}u0041;`))).toMatchObject({ categoria: 'error-compilacion', linea: 1 });
    expect(problemaDe(programa(`double e = 0x1.8; /* ${B}u0041 */`))).toMatchObject({ categoria: 'error-compilacion', linea: 1 });
  });

  it('el aviso señala el PRIMER escape del archivo, no la posición del error que habría dado', () => {
    const fuente = programa(`String s = "a${B}u0022; int x = 1;`);
    const problema = problemaDe(fuente);
    expect(fuente.slice(problema.rango.inicio, problema.rango.fin)).toBe(`${B}u0022`);
  });

  it('un escape en un COMENTARIO anterior a un error de sintaxis real sigue ganando (ADR 004, comportamiento de la 1.5): es el aviso', () => {
    const fuente = ['public class P {', `  // ${B}u0041`, '  public static void main(String[] args) { int x = 5 }', '}'].join('\n');
    expect(problemaDe(fuente)).toMatchObject({ categoria: 'no-disponible', codigo: 'escape-unicode-no-soportado' });
  });

  it('control: un error de sintaxis REAL anterior al escape sigue siendo el error (el escape no pudo causarlo)', () => {
    const fuente = ['public class P {', '  public static void main(String[] args) {', '    int x = 5', '    int y = 6; // ' + B + 'u0041', '  }', '}'].join('\n');
    expect(problemaDe(fuente)).toMatchObject({ categoria: 'error-compilacion', codigo: 'falta-punto-y-coma', linea: 3 });
  });

  it('control: un escape en un comentario que viene DESPUÉS del error no lo esconde: la sentencia que falla es otra', () => {
    const fuente = programa(`int x = 5 int y = 6; /* ${B}u0041 */`);
    expect(problemaDe(fuente)).toMatchObject({ categoria: 'error-compilacion', codigo: 'falta-punto-y-coma' });
  });

  it('un escape mal formado en un comentario es un error de compilación (javac: illegal unicode escape), también si antes hay un escape bien formado', () => {
    expect(problemaDe(programa(`int x = 5; /* ${B}u00 */`))).toMatchObject({ categoria: 'error-compilacion', linea: 1 });
    expect(problemaDe(programa(`int ${B}u0061 = 1; /* ${B}u00 */`))).toMatchObject({ categoria: 'error-compilacion' });
    expect(problemaDe(['public class P {', `  // ruta C:${B}users${B}juan`, '}'].join('\n'))).toMatchObject({ categoria: 'error-compilacion', linea: 2 });
  });

  it('control: un escape bien formado y un programa sin errores siguen dando el aviso de siempre (no «sin errores»)', () => {
    expect(problemaDe(programa(`System.out.println("${B}u0041");`))).toMatchObject({ categoria: 'no-disponible', codigo: 'escape-unicode-no-soportado' });
  });

  // Dos escapes tras la zona del error: uno en un comentario (que no cambia ningún token del código) y, después, el de código que SÍ pudo causar el error (el `;` escrito
  // `${B}u003b`). El primero es el que se muestra (es el primero del archivo, ADR 004), pero el segundo no puede quedar fuera de la cuenta: es otra construcción de las que
  // el visualizador no traduce. Los tres programas verificados con javac 17.0.18: los dos primeros compilan; el tercero lo rechaza (`';' expected`) y el aviso gana igual.
  it('un escape en un comentario entre el error y el escape de código que lo causó no lo esconde: se cuentan los dos («y 1 más»)', () => {
    const conComentarioDeLinea = ['public class P {', '  public static void main(String[] args) {', `    int x = 5 // ${B}u0041`, `    ${B}u003b`, '    System.out.println(x);', '  }', '}'].join('\n');
    const conComentarioDeBloque = programa(`int x = 5 /* ${B}u0041 */ ${B}u003b`);
    for (const fuente of [conComentarioDeLinea, conComentarioDeBloque]) {
      const resultado = compilar(fuente);
      if (resultado.ok) throw new Error('se esperaba ok:false');
      expect(resultado.problema, fuente).toMatchObject({ categoria: 'no-disponible', codigo: 'escape-unicode-no-soportado', linea: expect.any(Number) });
      expect(resultado.adicionales, fuente).toBe(1);
    }
  });

  it('control: con un solo escape (en un comentario), aunque el error real venga después, no hay «y N más»', () => {
    const fuente = ['public class P {', '  public static void main(String[] args) {', `    int x = 5 /* ${B}u0041 */`, '    int y = 6;', '  }', '}'].join('\n');
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'escape-unicode-no-soportado', linea: 3 });
    expect(resultado.adicionales).toBe(0);
  });
});

// Tarea 1.35 (hallado con una sonda de Java válido; javac 17.0.18 compila `char c = '<emoji>';` con el valor de la primera unidad UTF-16): un carácter fuera del plano básico dentro de un
// literal `char` es un aviso, no «el literal char debe tener exactamente un carácter». En una CADENA no pasa nada (ya funcionaba); dos caracteres en un `char` siguen siendo un error.
describe('compilar — un carácter de dos unidades dentro de un literal char es un aviso (tarea 1.35)', () => {
  const programa = (cuerpoDeMain: string): string => `public class P { public static void main(String[] args) { ${cuerpoDeMain} } }`;
  const emoji = String.fromCodePoint(0x1f600);

  it.each([
    ['una declaración', `char c = '${emoji}';`],
    ['un entero', `int x = '${emoji}';`],
    ['una impresión', `System.out.println('${emoji}');`],
    ['una comparación', `boolean b = 'a' == '${emoji}';`],
  ])('%s: aviso `caracter-suplementario-no-soportado`', (_descripcion, cuerpo) => {
    const resultado = compilar(programa(cuerpo));
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'caracter-suplementario-no-soportado', linea: 1 });
  });

  it('el aviso nombra el carácter tal como lo escribió el alumno', () => {
    const resultado = compilar(programa(`char c = '${emoji}';`));
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema).toMatchObject({ datos: { caracter: emoji } });
  });

  it('control: el mismo carácter dentro de una CADENA no avisa (ya funcionaba): el programa pasa', () => {
    const resultado = compilar(programa(`String s = "${emoji}"; System.out.println(s);`));
    if (!resultado.ok && resultado.problema.categoria === 'no-disponible') expect(resultado.problema.codigo).not.toBe('caracter-suplementario-no-soportado');
  });

  it('control: dos de esos caracteres en un `char` siguen siendo un error de compilación', () => {
    const resultado = compilar(programa(`char c = '${emoji}${emoji}';`));
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.categoria).toBe('error-compilacion');
  });
});

// Tarea 1.35 (SUGGESTION-5: al volver exacta la aserción `adicionales` del catálogo de avisos apareció este defecto, latente desde la 1.17): REQ-SUB-006 pide «y N más», donde N son
// las OTRAS construcciones fuera del subconjunto. Un literal fuera del subconjunto (`0x1F`) producía dos hallazgos con el MISMO rango —el token del léxico y el nodo que el analizador
// crea para él—, así que un programa con UNA sola construcción decía «y 1 más».
describe('compilar — «y N más» cuenta las construcciones distintas, no las veces que se la encontró (tarea 1.35, REQ-SUB-006)', () => {
  const programa = (cuerpoDeMain: string): string => `public class P { public static void main(String[] args) { ${cuerpoDeMain} } }`;
  const adicionalesDe = (fuente: string): number => {
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    return resultado.adicionales;
  };

  it.each([
    ['un literal hexadecimal', 'int x = 0x1F;'],
    ['un literal octal', 'int x = 010;'],
    ['un literal binario', 'int x = 0b101;'],
    ['un literal float', 'double x = 3.5f;'],
    ['una cadena con un escape fuera del subconjunto', 'String s = "antes\\rdespues";'],
    ['una cadena con un escape octal', 'String s = "\\101";'],
    ['un bloque de texto', 'String s = """\n    hola\n    """;'],
  ])('%s, una sola vez: ningún aviso más', (_descripcion, cuerpo) => {
    expect(adicionalesDe(programa(cuerpo))).toBe(0);
  });

  it('triangulación: dos literales DISTINTOS son un aviso más (no se funde de más)', () => {
    expect(adicionalesDe(programa('int a = 0x1F; int b = 010;'))).toBe(1);
  });

  it('triangulación: el MISMO literal escrito dos veces, en dos sitios distintos, son dos hallazgos: uno más', () => {
    expect(adicionalesDe(programa('int a = 0x1F; int b = 0x1F;'))).toBe(1);
  });

  it('un literal y dos construcciones de otra clase suman tres hallazgos: dos más', () => {
    expect(adicionalesDe(programa('int a = 0x1F; int c = 1 << 2; int d = 5 & 3;'))).toBe(2);
  });
});

// Tarea 1.36 (C-4a de la verificación final del lote 1): javac 17 rechaza una constante de texto de 65 535 caracteres o más (`limit.string`) y una entrada de más de 65 535 bytes en el archivo de clase
// (`limit.string.overflow`); antes un `String s = "a…65 535";` salía como `ok` y se ejecutaba. La pasada de límites va DESPUÉS de las semánticas (javac revisa esto al generar el código, cuando ya no
// quedan errores de Attr ni de Flow), así que un programa con otro error muestra ESE error.
describe('compilar — los límites del archivo de clase de javac (C-4a, tarea 1.36)', () => {
  const programa = (cuerpoDeMain: string): string => `public class P {\n  public static void main(String[] args) {\n${cuerpoDeMain}\n  }\n}\n`;
  const problemaDe = (fuente: string) => {
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    return resultado.problema;
  };

  it('un texto de 65 535 caracteres: error de compilación `texto-con-demasiados-caracteres`, en la línea del texto (la misma de javac)', () => {
    expect(problemaDe(programa(`    String s = "${'a'.repeat(65_535)}";`))).toMatchObject({ categoria: 'error-compilacion', codigo: 'texto-con-demasiados-caracteres', linea: 3 });
  });

  it('un texto de 32 768 letras con acento (65 536 bytes): `texto-con-demasiados-bytes`, en la línea de la clase', () => {
    expect(problemaDe(programa(`    String s = "${'é'.repeat(32_768)}";`))).toMatchObject({ categoria: 'error-compilacion', codigo: 'texto-con-demasiados-bytes', linea: 1 });
  });

  it('control: con un carácter menos Java lo acepta y el programa pasa (nunca uno de los dos errores)', () => {
    for (const texto of ['a'.repeat(65_534), 'é'.repeat(32_767)]) {
      const resultado = compilar(programa(`    String s = "${texto}";`));
      if (!resultado.ok) expect(['texto-con-demasiados-caracteres', 'texto-con-demasiados-bytes']).not.toContain(resultado.problema.codigo);
    }
  });

  it('un texto con un decimal que cae en la frontera: aviso `tamano-de-texto-no-revisable` en la línea del texto (nunca ok, nunca un error inventado)', () => {
    expect(problemaDe(programa(`    String s = "${'a'.repeat(65_531)}" + 1.5;`))).toMatchObject({ categoria: 'no-disponible', codigo: 'tamano-de-texto-no-revisable', linea: 3 });
  });

  it('un error de una pasada anterior gana: `unreachable statement` se informa aunque el programa también tenga un texto de más', () => {
    expect(problemaDe(programa(`    return;\n    String s = "${'a'.repeat(65_535)}";`))).toMatchObject({ categoria: 'error-compilacion', codigo: 'sentencia-inalcanzable', linea: 4 });
  });

  it('un error de tipos gana también al texto largo', () => {
    expect(problemaDe(programa(`    int n = "x";\n    String s = "${'a'.repeat(65_535)}";`))).toMatchObject({ categoria: 'error-compilacion', linea: 3 });
  });
});

// Tarea 1.37 (W-12 de la verificación del delta del lote 1): el tope de 4 000 tokens no acota la PROFUNDIDAD. Con la pila por omisión de Node, 700 paréntesis anidados lanzan `RangeError`; en Chromium,
// desde unos 400; las cadenas de `&&` desde unos 1 000 términos — y el trabajador lo convertía en `error-interno` («Algo falló dentro del visualizador»). Ahora `analizarPrograma` cuenta los niveles
// de su recursión y mide la profundidad exacta del árbol, y `compilar()` lo traduce a un aviso honesto, nunca a un error del alumno ni a una excepción.
describe('compilar — un programa demasiado anidado es un aviso honesto, no un fallo interno (W-12, tarea 1.37)', () => {
  const conCuerpo = (cuerpo: string): string => `public class P {\n    public static void main(String[] args) {\n        int a = 1;\n        boolean b = true;\n        String s = "x";\n${cuerpo}\n    }\n}\n`;
  const LINEA_DEL_CUERPO = 6;

  it.each([
    ['700 paréntesis anidados (lanzaban RangeError con la pila por omisión de Node)', `        a = ${'('.repeat(700)}1${')'.repeat(700)};`],
    ['1 500 llaves anidadas', `        ${'{'.repeat(1_500)}${'}'.repeat(1_500)}`],
    ['mil términos unidos con `&&` (un árbol de mil niveles que arma un lazo)', `        b = b${' && b'.repeat(1_000)};`],
    ['1 900 sumas seguidas', `        a = 1${' + 1'.repeat(1_900)};`],
    ['400 `else if` seguidos (cada uno es una instrucción dentro de la anterior)', `        if (b) a = 1;${' else if (b) a = 2;'.repeat(400)}`],
    ['mil negaciones con paréntesis', `        b = ${'!('.repeat(1_000)}true${')'.repeat(1_000)};`],
  ])('%s: el aviso `programa-demasiado-anidado` en la línea donde está, sin lanzar nada', (_nombre, cuerpo) => {
    const resultado = compilar(conCuerpo(cuerpo));
    if (resultado.ok) throw new Error('se esperaba el aviso');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'programa-demasiado-anidado', datos: {}, linea: LINEA_DEL_CUERPO });
  });

  it('un anidamiento que cabe (50 niveles de paréntesis, bloques y `else if`) NO es el aviso: se revisa como siempre', () => {
    for (const cuerpo of [`        a = ${'('.repeat(50)}1${')'.repeat(50)};`, `        ${'{'.repeat(50)}${'}'.repeat(50)}`, `        if (b) a = 1;${' else if (b) a = 2;'.repeat(50)}`, `        b = b${' && b'.repeat(50)};`]) {
      const resultado = compilar(conCuerpo(cuerpo));
      if (!resultado.ok) expect(resultado.problema.codigo, cuerpo.slice(0, 40)).not.toBe('programa-demasiado-anidado');
    }
  });

  it('un error de sintaxis ANTES de la parte profunda gana (el analizador no llega al anidamiento), y uno léxico también', () => {
    const sintaxis = compilar(conCuerpo(`        int x = ;\n        a = ${'('.repeat(700)}1${')'.repeat(700)};`));
    if (sintaxis.ok) throw new Error('se esperaba un error');
    expect(sintaxis.problema).toMatchObject({ categoria: 'error-compilacion', linea: LINEA_DEL_CUERPO });
    const lexico = compilar(conCuerpo(`        String t = "sin cerrar;\n        a = ${'('.repeat(700)}1${')'.repeat(700)};`));
    if (lexico.ok) throw new Error('se esperaba un error');
    expect(lexico.problema.categoria).toBe('error-compilacion');
  });

  it('el aviso se da aunque la parte profunda venga después de un aviso léxico más antiguo (un literal hexadecimal): es la misma categoría, y gana el primero en el texto', () => {
    const resultado = compilar(conCuerpo(`        int h = 0x1F;\n        a = ${'('.repeat(700)}1${')'.repeat(700)};`));
    if (resultado.ok) throw new Error('se esperaba un aviso');
    expect(resultado.problema.categoria).toBe('no-disponible');
    expect(['programa-demasiado-anidado', 'literal-hexadecimal-no-soportado']).toContain(resultado.problema.codigo);
  });
});

// Tarea 1.38 (W-15 de la «Verificación acotada del lote 1 (1.37)»): `package java.miapp;` lo compila javac, pero el JDK real no ejecuta nada que esté dentro de `java`
// (`java.lang.SecurityException: Prohibited package name: java.miapp`, medido con el `java` 17.0.18 en `herramientas/oraculo/generar-datos.test.ts` y guardado en los goldens de
// `corpus/experimentos/paquetes-prohibidos/`), y `compilar()` daba `ok`: el visualizador ejecutaba el `println`, un resultado inventado. Es lo que rechaza el LANZADOR, no javac (ADR 004):
// el aviso solo se da cuando las pasadas de javac ya aceptaron el programa, así que un error del cuerpo se informa antes, igual que en NetBeans (primero el error de compilación, luego el del lanzador).
describe('compilar — un paquete dentro de `java` es un aviso honesto: el lanzador no lo arranca (W-15, tarea 1.38)', () => {
  const programa = (paquete: string, cuerpoDeMain = '        System.out.println("hola");'): string =>
    `${paquete}\n\npublic class Saludo {\n    public static void main(String[] args) {\n${cuerpoDeMain}\n    }\n}\n`;
  const resultadoDe = (fuente: string) => {
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    return resultado;
  };

  it('«package java.miapp;» con un println: el aviso `paquete-reservado-por-java` en la línea del `package`, con el nombre del paquete; nunca `ok`', () => {
    const resultado = resultadoDe(programa('package java.miapp;'));
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'paquete-reservado-por-java', datos: { nombre: 'java.miapp' }, linea: 1 });
    expect(resultado.adicionales).toBe(0);
  });

  it.each([
    ['java', 3, '// ejercicio de la unidad 3\n\npackage java;'],
    ['java.lang.aula', 1, 'package java.lang.aula;'],
    ['java.util.Map', 1, 'package java.util.Map;'],
    ['java.Aula', 2, '\npackage java.Aula;'],
  ])('triangulación: «%s» en la línea %i: el nombre y la línea cambian con el programa', (nombre, linea, paquete) => {
    expect(resultadoDe(programa(paquete)).problema).toMatchObject({ categoria: 'no-disponible', codigo: 'paquete-reservado-por-java', datos: { nombre }, linea });
  });

  it('el nombre se lee como lo lee javac: con comentarios o un salto de línea dentro es el mismo `java.miapp`', () => {
    expect(resultadoDe(programa('package java /* uno */ . miapp;')).problema).toMatchObject({ codigo: 'paquete-reservado-por-java', datos: { nombre: 'java.miapp' }, linea: 1 });
    expect(resultadoDe(programa('package java\n    .miapp;')).problema).toMatchObject({ codigo: 'paquete-reservado-por-java', datos: { nombre: 'java.miapp' }, linea: 1 });
  });

  it('el lanzador falla al CARGAR la clase, antes de buscar `main`: una clase sin `main` tiene el aviso del paquete, no un «sin main» de arranque', () => {
    expect(resultadoDe('package java.miapp;\n\npublic class Vacia {\n}\n').problema).toMatchObject({ categoria: 'no-disponible', codigo: 'paquete-reservado-por-java' });
    // sin el paquete el mismo programa sí compila, y el problema de «sin main» viaja en `arranque` (REQ-COMP-008)
    const sinPaquete = compilar('public class Vacia {\n}\n');
    expect(sinPaquete.ok).toBe(true);
    if (sinPaquete.ok) expect(sinPaquete.programa.arranque?.codigo).toBe('sin-main');
  });

  it('gana a `ejecucion-no-disponible`: lo que el lote 0 todavía no sabe ejecutar da igual, el lanzador no arranca el programa', () => {
    const cuerpo = '        Scanner teclado = new Scanner(System.in);\n        int n = teclado.nextInt();\n        System.out.println(n * 2);';
    const conScanner = (paquete: string) => `${paquete}\n\nimport java.util.Scanner;\n\npublic class Doble {\n    public static void main(String[] args) {\n${cuerpo}\n    }\n}\n`;
    expect(resultadoDe(conScanner('package java.miapp;')).problema).toMatchObject({ categoria: 'no-disponible', codigo: 'paquete-reservado-por-java', linea: 1 });
  });

  // El orden de javac: primero sus errores (cada pasada en su turno), después el del lanzador. Los casos de abajo son los de los goldens `w15-error-*`: javac rechaza el programa en esa línea.
  it('un error de TIPOS del cuerpo se informa primero, con la línea de javac: el lanzador no cuenta si javac no compila', () => {
    expect(resultadoDe(programa('package java.miapp;', '        int x = "hola";')).problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'tipos-incompatibles-en-asignacion', linea: 5 });
  });

  it('un código inalcanzable (alcanzabilidad) y una variable sin asignar (asignación definitiva) también van antes', () => {
    expect(resultadoDe(programa('package java.miapp;', '        return;\n        System.out.println("x");')).problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'sentencia-inalcanzable', linea: 6 });
    expect(resultadoDe(programa('package java.miapp;', '        int y;\n        System.out.println(y);')).problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'variable-posiblemente-no-asignada', linea: 6 });
  });

  it('un error de sintaxis y un texto que se pasa del límite del archivo (los de `Gen` y `ClassWriter`, lo último de javac) también van antes', () => {
    expect(resultadoDe(programa('package java.miapp;', '        System.out.println("hola")')).problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'falta-punto-y-coma', linea: 5 });
    expect(resultadoDe(programa('package java.miapp;', `        String s = "${'a'.repeat(65_535)}";`)).problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'texto-con-demasiados-caracteres', linea: 5 });
  });

  it.each(['package javax.miapp;', 'package javafoo.aula;', 'package Java.miapp;', 'package aula.java;', 'package jdk.miapp;', 'package com.sun.miapp;', 'package miproyecto;', 'package com.escuela.u5;', ''])(
    'control: «%s» lo arranca el lanzador y el programa se compila sin avisos (ok), igual que antes',
    (paquete) => {
      const resultado = compilar(paquete === '' ? 'public class Saludo {\n    public static void main(String[] args) {\n        System.out.println("hola");\n    }\n}\n' : programa(paquete));
      expect(resultado.ok, paquete).toBe(true);
    },
  );

  it('control: un nombre de clase pública fuera de `java` (`javax.swing.JFrame`) sigue siendo el aviso de la 1.36, no el nuevo: el JDK real sí lo ejecuta', () => {
    expect(resultadoDe(programa('package javax.swing.JFrame;')).problema).toMatchObject({ categoria: 'no-disponible', codigo: 'paquete-con-nombre-de-clase-no-soportado' });
  });

  it('control: los errores del propio `package` siguen siendo errores de javac, no el aviso (`java.util` es un paquete del JDK; `java.lang.Shutdown`, una clase)', () => {
    expect(resultadoDe(programa('package java.util;')).problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'paquete-del-jdk' });
    expect(resultadoDe(programa('package java.lang.Shutdown;')).problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'paquete-con-nombre-de-clase' });
  });
});

// Tarea 1.39 (W-16 de la tarea 1.38): `package jdk.internal.misc;` y `package sun.nio.ch;` los compila javac y el lanzador real no los carga (`ClassNotFoundException`: el paquete es de un módulo del
// JDK que no lo exporta); `compilar()` daba `ok` y el visualizador ejecutaba el `println`. Los nombres salen del oráculo (`GenerarPaquetesDeModulos.java`; los goldens están en
// `corpus/experimentos/paquetes-de-modulos/` y en `bordes-del-archivo/`). Como el de la 1.38, es lo que rechaza el LANZADOR: el aviso solo sale cuando las pasadas de javac aceptaron el programa.
describe('compilar — un paquete de un módulo del JDK que el lanzador no carga es un aviso honesto (W-16, tarea 1.39)', () => {
  const programa = (paquete: string, cuerpoDeMain = '        System.out.println("hola");'): string =>
    `${paquete}\n\npublic class Saludo {\n    public static void main(String[] args) {\n${cuerpoDeMain}\n    }\n}\n`;
  const resultadoDe = (fuente: string) => {
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    return resultado;
  };

  it('«package jdk.internal.misc;» con un println: el aviso `paquete-interno-del-jdk` en la línea del `package`, con el nombre del paquete; nunca `ok`', () => {
    const resultado = resultadoDe(programa('package jdk.internal.misc;'));
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'paquete-interno-del-jdk', datos: { nombre: 'jdk.internal.misc' }, linea: 1 });
    expect(resultado.adicionales).toBe(0);
  });

  it.each([
    ['sun.nio.ch', 3, '// ejercicio de la unidad 3\n\npackage sun.nio.ch;'],
    ['com.sun.crypto.provider', 1, 'package com.sun.crypto.provider;'],
    ['javax.swing.plaf.metal.icons', 2, '\npackage javax.swing.plaf.metal.icons;'],
    ['java.awt.peer', 1, 'package java.awt.peer;'],
  ])('triangulación: «%s» en la línea %i: el nombre y la línea cambian con el programa', (nombre, linea, paquete) => {
    expect(resultadoDe(programa(paquete)).problema).toMatchObject({ categoria: 'no-disponible', codigo: 'paquete-interno-del-jdk', datos: { nombre }, linea });
  });

  it('el nombre se lee como lo lee javac: con comentarios o un salto de línea dentro es el mismo `jdk.internal.misc`', () => {
    expect(resultadoDe(programa('package jdk /* uno */ . internal . misc;')).problema).toMatchObject({ codigo: 'paquete-interno-del-jdk', datos: { nombre: 'jdk.internal.misc' }, linea: 1 });
    expect(resultadoDe(programa('package jdk.internal\n    .misc;')).problema).toMatchObject({ codigo: 'paquete-interno-del-jdk', datos: { nombre: 'jdk.internal.misc' }, linea: 1 });
  });

  it('el lanzador no encuentra la clase, antes de buscar `main`: una clase sin `main` tiene el aviso del paquete, no un «sin main» de arranque', () => {
    expect(resultadoDe('package sun.nio.ch;\n\npublic class Vacia {\n}\n').problema).toMatchObject({ categoria: 'no-disponible', codigo: 'paquete-interno-del-jdk' });
  });

  it('gana a `ejecucion-no-disponible`: lo que el lote 0 todavía no sabe ejecutar da igual, el lanzador no arranca el programa', () => {
    const cuerpo = '        Scanner teclado = new Scanner(System.in);\n        int n = teclado.nextInt();\n        System.out.println(n * 2);';
    const conScanner = (paquete: string) => `${paquete}\n\nimport java.util.Scanner;\n\npublic class Doble {\n    public static void main(String[] args) {\n${cuerpo}\n    }\n}\n`;
    expect(resultadoDe(conScanner('package jdk.internal.misc;')).problema).toMatchObject({ categoria: 'no-disponible', codigo: 'paquete-interno-del-jdk', linea: 1 });
  });

  it('un nombre de `java` que además es un paquete de módulo (`java.awt.peer`) es el aviso NUEVO (el lanzador da `ClassNotFoundException`), y un subpaquete suyo sigue siendo el de la 1.38 (`SecurityException`)', () => {
    expect(resultadoDe(programa('package java.awt.dnd.peer;')).problema).toMatchObject({ categoria: 'no-disponible', codigo: 'paquete-interno-del-jdk', datos: { nombre: 'java.awt.dnd.peer' } });
    expect(resultadoDe(programa('package java.awt.peer.aula;')).problema).toMatchObject({ categoria: 'no-disponible', codigo: 'paquete-reservado-por-java', datos: { nombre: 'java.awt.peer.aula' } });
  });

  // El orden de javac: primero sus errores (cada pasada en su turno), después el del lanzador.
  it('un error del cuerpo (tipos, alcanzabilidad, asignación definitiva, sintaxis) se informa primero, con la línea de javac: el lanzador no cuenta si javac no compila', () => {
    expect(resultadoDe(programa('package jdk.internal.misc;', '        int x = "hola";')).problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'tipos-incompatibles-en-asignacion', linea: 5 });
    expect(resultadoDe(programa('package sun.nio.ch;', '        return;\n        System.out.println("x");')).problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'sentencia-inalcanzable', linea: 6 });
    expect(resultadoDe(programa('package sun.nio.ch;', '        int y;\n        System.out.println(y);')).problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'variable-posiblemente-no-asignada', linea: 6 });
    expect(resultadoDe(programa('package sun.nio.ch;', '        System.out.println("hola")')).problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'falta-punto-y-coma', linea: 5 });
  });

  it.each([
    'package jdk.internal.misc.aula;',
    'package sun.nio.ch.aula;',
    'package com.sun.crypto.provider.aula;',
    'package com.sun.crypto;',
    'package jdk.incubator.vector;',
    'package sun.jvm.hotspot.debugger;',
    'package javax.miapp;',
    'package miproyecto;',
    '',
  ])('control: «%s» lo arranca el lanzador y el programa se compila sin avisos (ok), igual que antes', (paquete) => {
    const resultado = compilar(paquete === '' ? 'public class Saludo {\n    public static void main(String[] args) {\n        System.out.println("hola");\n    }\n}\n' : programa(paquete));
    expect(resultado.ok, paquete).toBe(true);
  });

  it('control: los errores del propio `package` siguen siendo errores de javac, no el aviso (`java.util` lo exporta un módulo: `paquete-del-jdk`)', () => {
    expect(resultadoDe(programa('package java.util;')).problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'paquete-del-jdk' });
    expect(resultadoDe(programa('package javax.swing;')).problema).toMatchObject({ categoria: 'error-compilacion', codigo: 'paquete-del-jdk' });
  });
});
