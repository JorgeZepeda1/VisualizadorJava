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

  it('devuelve ok:false con un Problema real (categoría y línea del token inesperado) si no compila', () => {
    // Falta el ";" tras println("x"); el analizador reporta la posición del token inesperado
    // ("}" en la línea 4) — la calibración exacta de javac ("al final del token anterior",
    // design.md §2.6) es trabajo de las tareas 1.1-1.6, fuera del alcance de esta rebanada.
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
    expect(resultado.problema.linea).toBe(4);
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
