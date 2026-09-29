// RED de la tarea 0.12: compilador.ts orquesta léxico+sintaxis→IR y fija ResultadoCompilacion
// (design.md §1.3). Las 5 pasadas completas (atribución, alcanzabilidad…) llegan en la tarea 1.14;
// aquí solo léxico+sintaxis, que ya es un subconjunto real de esas pasadas.
import { describe, expect, it } from 'vitest';
import { compilar } from './compilador.ts';

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
    expect(resultado.programa.ir.sentencias).toEqual([{ tipo: 'impresion', texto: 'Hola, mundo' }]);
    expect(resultado.vista.fuente).toBe(fuente);
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
    ['lo que el motor todavía no ejecuta (declaración con println)', conMain('int x = 5; System.out.println(x);'), 'no-disponible'],
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
// Entrada que fuerza el fallo de forma legítima, sin simular nada: una expresión con paréntesis
// anidados mucho más allá del límite de la pila del analizador (descenso recursivo). Verificada con
// javac 17.0.18 real: 500 niveles compilan sin salida; 100 000 niveles matan al propio javac con su
// `StackOverflowError` («The system is out of resources») — es una entrada patológica, no un
// programa de alumno, y lo único que se afirma aquí es que NUESTRO fallo no se disfraza.
describe('compilar — solo un ErrorDeCompilacion es un error de compilación (tarea 1.28)', () => {
  const NIVELES_QUE_AGOTAN_LA_PILA = 100_000;
  const anidada = `${'('.repeat(NIVELES_QUE_AGOTAN_LA_PILA)}1${')'.repeat(NIVELES_QUE_AGOTAN_LA_PILA)}`;

  it('una excepción ajena al alumno (agotar la pila del analizador) se propaga: NO se disfraza de error de sintaxis', () => {
    const fuente = `class C { public static void main(String[] a) { int x = ${anidada}; } }`;
    expect(() => compilar(fuente)).toThrow(RangeError);
  });

  it('triangulación: aunque un aviso léxico ("0x10", hexadecimal) preceda a la falla, el fallo interno sigue propagándose', () => {
    const fuente = `class C { public static void main(String[] a) { int y = 0x10; int x = ${anidada}; } }`;
    expect(() => compilar(fuente)).toThrow(RangeError);
  });

  it('contraste: un ErrorDeCompilacion real (falta el ";") SIGUE siendo un Problema "error-compilacion", nunca una excepción', () => {
    const fuente = 'class C { public static void main(String[] a) { int x = 5 } }';
    const resultado = compilar(fuente);
    expect(resultado).toMatchObject({ ok: false, problema: { categoria: 'error-compilacion', codigo: 'falta-punto-y-coma' } });
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
    expect(resultado.programa.ir.sentencias).toEqual([{ tipo: 'impresion', texto: '' }]);
  });

  it('el programa real de corpus/curso/u6-ciclos-anidados-tabla.java: "println()" ya NO se detecta como no-disponible (el único hueco restante es la IR de "for", del lote 2, no println)', () => {
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
    // Antes de esta corrección, "println()" producía un error de SINTAXIS (categoría
    // 'error-compilacion', ni siquiera llegaba a clasificarse). Hoy el análisis léxico+sintáctico+
    // NO-DISP pasa limpio: lo único que falta es la IR real de "for" (lote 2, tarea 2.16) — un
    // gap YA documentado y ajeno a esta corrección.
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false (falta la IR de "for", lote 2)');
    // Tarea 1.27 (agregada por el orquestador, D2): el hueco de IR del "for" ahora se reporta como
    // 'no-disponible'/'ejecucion-no-disponible' (nunca 'error-compilacion' -- ese código
    // desaparecería DE VERDAD si "println"/"for" volvieran a mis-clasificarse como una construcción
    // NO-DISP real: el código sería uno de `CODIGOS_NO_SOPORTADO` DISTINTO de
    // "ejecucion-no-disponible", p. ej. "for-mejorado-no-soportado" u otro -- esta aserción POSITIVA
    // sigue probando, más precisa que antes, que ni "println" ni el "for" clásico disparan ningún
    // código de no-soportado real: solo el hueco honesto de IR del lote 2).
    expect(resultado.problema.categoria).toBe('no-disponible');
    expect(resultado.problema.codigo).toBe('ejecucion-no-disponible');
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
