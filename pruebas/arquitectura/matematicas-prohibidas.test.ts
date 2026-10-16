import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

// Tarea 2.6 (REQ-BIB-004, ADR 009, design.md §4.4): en `src/motor` están prohibidas las funciones de `Math` que ECMA-262 deja «aproximadas por la implementación» (`pow exp log log10 log1p
// expm1 sin cos tan asin acos atan atan2 sinh cosh tanh cbrt hypot`) y el operador `**` sobre números: cada motor (V8, SpiderMonkey, JavaScriptCore) puede dar un último dígito distinto y Java
// no — `Math.pow(10, -4)` es `1.0E-4` en Java y `9.999999999999999E-5` en V8. Lo exacto sale de `biblioteca/matematicas` (`pow` es «No disponible» hasta portar fdlibm). `**` entre `BigInt` es exacto
// y se permite. Mismo patrón que `tablas-sin-prototipo.test.ts`: `lintText` con un `filePath` VIRTUAL, así que una violación a propósito jamás contamina `npm run lint`.

const raiz = resolve(import.meta.dirname, '..', '..');

async function mensajesDeLint(codigo: string, rutaVirtual = 'src/motor/biblioteca/matematicas/__fixture__/aproximada.ts'): Promise<string[]> {
  const eslint = new ESLint({ cwd: raiz });
  const [resultado] = await eslint.lintText(codigo, { filePath: rutaVirtual });
  if (!resultado) throw new Error(`ESLint no devolvió resultado para ${rutaVirtual}`);
  return resultado.messages.filter((mensaje) => mensaje.message.includes('aproximad')).map((mensaje) => mensaje.message);
}

describe('funciones aproximadas de Math y el operador ** en src/motor (tarea 2.6)', { timeout: 30_000 }, () => {
  it('Math.pow en src/motor dispara la regla (el pow de JS difiere de Java en el 4 % de los casos)', async () => {
    const mensajes = await mensajesDeLint('export const x = Math.pow(10, -4);\n');
    expect(mensajes).toHaveLength(1);
    expect(mensajes[0]).toContain('Math.pow');
  });

  it('también Math.exp, log, log10, sin, cos, tan, cbrt y hypot', async () => {
    for (const funcion of ['exp', 'log', 'log10', 'sin', 'cos', 'tan', 'cbrt', 'hypot', 'atan2', 'sinh']) {
      const mensajes = await mensajesDeLint(`export const x = Math.${funcion}(1, 2);\n`);
      expect(mensajes, `Math.${funcion}`).toHaveLength(1);
    }
  });

  it('el operador ** entre números dispara la regla, y también **=', async () => {
    expect(await mensajesDeLint('export const x = 2 ** 10;\n')).toHaveLength(1);
    expect(await mensajesDeLint('let y = 2;\ny **= 3;\nexport { y };\n')).toHaveLength(1);
  });

  it('lo exacto sigue permitido: Math.floor, Math.sqrt, Math.max, Math.abs, Math.fround y ** entre BigInt', async () => {
    const codigo = ['export const a = Math.floor(2.5) + Math.sqrt(4) + Math.max(1, 2) + Math.abs(-1) + Math.fround(1.5);', 'export const b = 10n ** 3n;', ''].join('\n');
    expect(await mensajesDeLint(codigo)).toEqual([]);
  });

  it('fuera de src/motor la regla no aplica (las herramientas y las pruebas del oráculo pueden usar **)', async () => {
    expect(await mensajesDeLint('export const x = 2 ** 10;\n', 'herramientas/oraculo/__fixture__/potencia.ts')).toEqual([]);
  });
});
