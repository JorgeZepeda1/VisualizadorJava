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

  it('nunca lanza: hasta un carácter no reconocido se convierte en Problema, nunca en excepción (D2)', () => {
    expect(() => compilar('#$%')).not.toThrow();
    const resultado = compilar('#$%');
    expect(resultado.ok).toBe(false);
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
    // gap YA documentado y ajeno a esta corrección, nunca 'no-disponible' (println no es NO-DISP).
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false (falta la IR de "for", lote 2)');
    // 'error-compilacion' (genérico, IR de "for" no implementada) y NUNCA 'no-disponible' (eso
    // significaría que println() SIGUE sin reconocerse, que es justo lo que esta corrección arregla).
    expect(resultado.problema.categoria).toBe('error-compilacion');
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
