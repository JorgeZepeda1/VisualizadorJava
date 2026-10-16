// Tarea 1.35 (WARNING 1 de la re-verificación del lote 1): los topes de las pruebas que lanzan JVM salen de UN solo lugar (`limites-de-pruebas.ts`). Un tope puesto a mano —120 000,
// 180 000 o 300 000 ms— se rinde cuando la máquina está saturada (una JVM tarda 5 o 10 veces más con la CPU al 400 %) y la prueba falla sin que nada esté mal.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS } from './limites-de-pruebas.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..', '..');

function archivosDePrueba(directorio: string): string[] {
  return readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre);
    if (statSync(ruta).isDirectory()) return archivosDePrueba(ruta);
    return nombre.endsWith('.test.ts') ? [ruta] : [];
  });
}

// Los tres topes que las pruebas del oráculo escribían a mano (con o sin el separador de miles).
const TOPE_ESCRITO_A_MANO = /\b(?:120_?000|180_?000|300_?000)\b/;

describe('los topes de las pruebas que lanzan JVM (tarea 1.35)', () => {
  it('el tope compartido es de 10 minutos, el mismo que `compilarEnLote` se da a sí mismo', () => {
    expect(LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS).toBe(10 * 60 * 1000);
    expect(readFileSync(resolve(AQUI, 'compilar-en-lote.ts'), 'utf-8')).toContain('const limiteMs = 10 * 60 * 1000;');
  });

  it('ninguna prueba del oráculo fija a mano un tope de 120 000, 180 000 o 300 000 ms: todas usan el compartido', () => {
    const archivos = archivosDePrueba(AQUI).filter((ruta) => ruta !== fileURLToPath(import.meta.url));
    expect(archivos.length, 'el recorrido encuentra las pruebas del oráculo').toBeGreaterThanOrEqual(25);
    const sueltos = archivos.flatMap((ruta) =>
      readFileSync(ruta, 'utf-8')
        .split('\n')
        .flatMap((linea, i) => (TOPE_ESCRITO_A_MANO.test(linea) ? [`${relative(RAIZ, ruta)}:${i + 1}: ${linea.trim()}`] : [])),
    );
    expect(sueltos).toEqual([]);
  });

  // La corrida con la CPU cargada (16 procesos `yes`) dejó dos pruebas sin tope propio (`compilar-en-lote.test.ts`, `verificar-goldens.test.ts`) rendidas a los 5 000 ms que vitest da por
  // omisión: una JVM que arranca tarda más que eso cuando la máquina está saturada. El tope va en el PROYECTO, no prueba por prueba: toda prueba de `herramientas/oraculo/**` puede lanzar
  // una JVM, y una nueva ya nace con el tope correcto.
  it('el proyecto `oraculo` de `vitest.config.ts` usa el tope compartido como `testTimeout` y como `hookTimeout`: ninguna prueba con JVM depende de los 5 s de omisión', () => {
    const configuracion = readFileSync(resolve(RAIZ, 'vitest.config.ts'), 'utf-8');
    expect(configuracion).toContain("from './herramientas/oraculo/limites-de-pruebas.ts'");
    const proyecto = configuracion.slice(configuracion.indexOf("name: 'oraculo'"));
    expect(proyecto).toMatch(/testTimeout: LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS/);
    expect(proyecto).toMatch(/hookTimeout: LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS/);
  });

  it('control: el detector SÍ reconoce un tope escrito a mano', () => {
    expect(TOPE_ESCRITO_A_MANO.test('  }, 120_000);')).toBe(true);
    expect(TOPE_ESCRITO_A_MANO.test('      timeout: 300000,')).toBe(true);
    expect(TOPE_ESCRITO_A_MANO.test('  }, LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS);')).toBe(false);
  });
});
