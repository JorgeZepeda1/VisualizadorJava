// RED de la tarea 1.27 (agregada por el orquestador — hallazgo verificado de punta a punta): un programa que las pasadas de compilación de `compilar()` ACEPTAN (léxico+sintaxis,
// atribución, alcanzabilidad y asignación definitiva) puede seguir fallando al bajar a IR (`generarIr`, `src/motor/ir/generar-ir.ts`) cuando no sabe ejecutar algo de él. Antes de la 1.27 ese
// `throw new Error(...)` caía en el catch-all genérico de `compilador.ts`: `categoria:'error-compilacion'`, `codigo:'error-no-clasificado'`, `linea` SIEMPRE 1, con el MENSAJE DE DESARROLLO como único
// detalle — un error de SINTAXIS inventado para un programa que javac 17.0.18 REAL acepta y ejecuta (D2, regla 5 de CLAUDE.md).
//
// Tarea 2.16 (lote 2): la IR ya baja declaraciones, `if`, ciclos, `switch`… — esos programas ahora se EJECUTAN (`ok`). La ruta defensiva sigue siendo PERMANENTE y se prueba con lo que de
// verdad no se puede ejecutar todavía: lo que necesita la biblioteca (el puerto de `interprete/puerto-biblioteca.ts` aún no la tiene conectada) y todo `double` (necesita `Double.toString`).
// Vive en pruebas/ (capa sin restricción, design.md §1.1) por la misma razón que avisos-textos.test.ts: necesita compilar() (motor/index.ts completo) Y textosNoSoportado
// (textos/es-MX) a la vez — src/textos/es-MX solo puede importar motor/vista (herramientas/eslint/matriz-capas.ts).
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import { textosNoSoportado } from '../../src/textos/es-MX/no-soportado.ts';
import type { CodigoNoSoportado } from '../../src/motor/vista.ts';

describe('generarIr no sabe ejecutar algo del subconjunto (la biblioteca no está conectada) -- "no-disponible", NUNCA "error-compilacion" (tarea 1.27)', () => {
  it('una llamada a la biblioteca (Java válido -- javac 17.0.18 real la acepta y la ejecuta): categoria "no-disponible", código "ejecucion-no-disponible", línea REAL del elemento', () => {
    const fuente = [
      'class C {',
      '    public static void main(String[] a) {',
      '        int x = 5;',
      '        int y = Math.abs(x);',
      '        System.out.println(y);',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.problema.categoria).toBe('no-disponible');
    expect(resultado.problema.codigo).toBe('ejecucion-no-disponible');
    // "int y = Math.abs(x);" está en la línea 4 -- NUNCA la línea 1 fija del catch-all genérico anterior.
    expect(resultado.problema.linea).toBe(4);

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

  it('triangulación: un `double` dentro de un `if` (otro elemento del programa, con su PROPIA línea) también da "ejecucion-no-disponible" -- el mecanismo es genérico, no un caso especial', () => {
    const fuente = [
      'class C {',
      '    public static void main(String[] a) {',
      '',
      '        if (true) {',
      '            double d = 1.5;',
      '        }',
      '    }',
      '}',
    ].join('\n');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.problema.categoria).toBe('no-disponible');
    expect(resultado.problema.codigo).toBe('ejecucion-no-disponible');
    // "double d = 1.5;" está en la línea 5 (línea distinta del caso anterior, a propósito) -- calculada del rango REAL de la declaración, nunca una línea fija.
    expect(resultado.problema.linea).toBe(5);
  });

  it('control (tarea 2.16): declaraciones, `if` y `println` de int YA se ejecutan -- el mismo programa que antes era "no-disponible" ahora compila ok', () => {
    const fuente = [
      'class C {',
      '    public static void main(String[] a) {',
      '        int x = 5;',
      '        if (x > 3) {',
      '            System.out.println(x);',
      '        }',
      '    }',
      '}',
    ].join('\n');
    expect(compilar(fuente).ok).toBe(true);
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
