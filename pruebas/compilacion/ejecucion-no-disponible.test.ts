// RED de la tarea 1.27 (agregada por el orquestador — hallazgo verificado de punta a punta): un
// programa que las pasadas de compilación de `compilar()` ACEPTAN (léxico+sintaxis, atribución,
// alcanzabilidad y asignación definitiva; el arranque se revisa DESPUÉS de `generarIr`) puede
// seguir fallando al bajar a IR (`generarIr`,
// `src/motor/ir/generar-ir.ts`) porque el lote 2 (tareas 1.5/2.16) todavía no implementa la
// EJECUCIÓN de todas las sentencias del subconjunto (p. ej. una declaración local con
// inicializador). Antes de esta tarea, ese `throw new Error(...)` caía en el catch-all genérico de
// `compilador.ts` (`construirProblema`): `categoria:'error-compilacion'`,
// `codigo:'error-no-clasificado'`, `linea` SIEMPRE 1 (rango por omisión `{inicio:0,fin:0}`, nunca la
// línea real del elemento), con el MENSAJE DE DESARROLLO del `Error` interno ("la ejecución de
// ... llega en el lote 2 (tareas 1.5/2.16)") como único detalle. El programa de abajo, verificado
// con javac 17.0.18 REAL (carpeta temporal fuera del repo, borrada tras verificar — ver el informe
// de la sesión): javac lo acepta y lo ejecuta limpio (imprime "5"). Presentárselo al alumno como
// error de SINTAXIS, con jerga interna, es un resultado inventado (D2, regla 5 de CLAUDE.md).
//
// Vive en pruebas/ (capa sin restricción, design.md §1.1) por la misma razón que
// avisos-textos.test.ts: necesita compilar() (motor/index.ts completo) Y textosNoSoportado
// (textos/es-MX) a la vez — src/textos/es-MX solo puede importar motor/vista
// (herramientas/eslint/matriz-capas.ts).
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import { textosNoSoportado } from '../../src/textos/es-MX/no-soportado.ts';
import type { CodigoNoSoportado } from '../../src/motor/vista.ts';

describe('generarIr no sabe bajar un elemento del subconjunto todavía no implementado (lote 2) -- "no-disponible", NUNCA "error-compilacion" (tarea 1.27)', () => {
  it('declaración local con inicializador (Java válido -- javac 17.0.18 real la acepta y la ejecuta): categoria "no-disponible", código "ejecucion-no-disponible", línea REAL del elemento', () => {
    const fuente = [
      'class C {',
      '    public static void main(String[] a) {',
      '        int x = 5;',
      '        System.out.println(x);',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.problema.categoria).toBe('no-disponible');
    expect(resultado.problema.codigo).toBe('ejecucion-no-disponible');
    // "int x = 5;" está en la línea 3 -- NUNCA la línea 1 fija del catch-all genérico anterior.
    expect(resultado.problema.linea).toBe(3);

    const codigo = resultado.problema.codigo as CodigoNoSoportado;
    const generador = textosNoSoportado[codigo];
    expect(generador, `código "${codigo}" sin entrada en textosNoSoportado`).toBeTypeOf('function');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- datos varían por código, mismo patrón que avisos-textos.test.ts
    const texto = (generador as (d: any) => string)({ linea: resultado.problema.linea, ...resultado.problema.datos });
    expect(texto).not.toMatch(/undefined/);
    // Nunca jerga de desarrollo en un texto del alumno (Project Standards, catálogo es-MX ADR 015).
    expect(texto).not.toContain('lote');
    expect(texto).not.toContain('tarea');
    expect(texto).not.toContain('declaracion-local');
  });

  it('triangulación: un "if" (elemento AST DISTINTO de una declaración local, javac 17.0.18 real lo acepta y lo ejecuta) también da "ejecucion-no-disponible" con SU PROPIA línea -- prueba que el mecanismo es genérico (cualquier elemento sin IR real), no un caso especial de "declaracion-local"', () => {
    const fuente = [
      'class C {',
      '    public static void main(String[] a) {',
      '',
      '        if (true) {',
      '            System.out.println("hola");',
      '        }',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.problema.categoria).toBe('no-disponible');
    expect(resultado.problema.codigo).toBe('ejecucion-no-disponible');
    // "if (true) {" está en la línea 4 (línea distinta del caso anterior, a propósito) -- calculada
    // del rango REAL de un elemento de tipo "if", nunca una línea fija.
    expect(resultado.problema.linea).toBe(4);
  });

  it('control: un error de sintaxis REAL (falta ";", javac lo rechaza con "\';\' expected") SIGUE siendo "error-compilacion", nunca "no-disponible"', () => {
    const fuente = [
      'class C {',
      '    public static void main(String[] a) {',
      '        int x = 5',
      '        System.out.println(x);',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.problema.categoria).toBe('error-compilacion');
    expect(resultado.problema.codigo).toBe('falta-punto-y-coma');
  });
});
