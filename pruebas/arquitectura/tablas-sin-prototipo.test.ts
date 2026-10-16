import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

// Tarea 1.34: la guarda «ninguna tabla del motor es un objeto plano indexado por texto». En JavaScript `{ in: 'a' }['constructor']` no es `undefined`
// sino la función heredada de `Object.prototype`, así que una tabla `Record<string, …>` que se consulta con un nombre que escribió el alumno (`System.toString`,
// `1 constructor 2`) devuelve basura en vez de «no está»: la re-verificación del lote 1 vio `TypeError: campo.lastIndexOf is not a function` y la 1.34, al
// auditar todas las tablas, un nombre leído como operador. Un `Map` solo conoce las claves que se le pusieron. La regla (`herramientas/eslint/reglas-de-tablas.ts`)
// prohíbe `Record<string, X>` y las firmas de índice `[k: string]: X` en `src/motor` (salvo `Record<string, unknown>`, una bolsa de datos que no se consulta por
// nombre, y los archivos `*.generado.ts`, que se convierten a `Map` al cargarse). Mismo patrón que `textos-en-catalogo.test.ts` y `fronteras.test.ts`:
// `lintText` con un `filePath` VIRTUAL, así que una violación a propósito jamás contamina `npm run lint`.

const raiz = resolve(import.meta.dirname, '..', '..');

async function lintarComoSiFuera(rutaVirtual: string, codigo: string) {
  const eslint = new ESLint({ cwd: raiz });
  const [resultado] = await eslint.lintText(codigo, { filePath: rutaVirtual });
  if (!resultado) throw new Error('ESLint no devolvió resultado para ' + rutaVirtual);
  return resultado;
}

function violacionesDeTablas(resultado: ESLint.LintResult) {
  return resultado.messages.filter((mensaje) => mensaje.ruleId === 'no-restricted-syntax' && mensaje.message.includes('Map'));
}

describe('tablas del motor sin prototipo (tarea 1.34)', { timeout: 30_000 }, () => {
  it('`Record<string, number>` en src/motor dispara la regla (la tabla de precedencias de antes)', async () => {
    const resultado = await lintarComoSiFuera(
      'src/motor/sintaxis/__fixture__/tabla-plana.ts',
      ["const PRECEDENCIA: Readonly<Record<string, number>> = { '+': 11 };", 'export { PRECEDENCIA };', ''].join('\n'),
    );
    expect(violacionesDeTablas(resultado)).toHaveLength(1);
  });

  it('una firma de índice `[nombre: string]: X` también dispara la regla', async () => {
    const resultado = await lintarComoSiFuera(
      'src/motor/semantica/__fixture__/indice-de-texto.ts',
      ['export interface Tabla {', '  readonly [nombre: string]: number;', '}', ''].join('\n'),
    );
    expect(violacionesDeTablas(resultado)).toHaveLength(1);
  });

  it('un `Map` NO dispara la regla (la forma correcta de la tabla)', async () => {
    const resultado = await lintarComoSiFuera(
      'src/motor/sintaxis/__fixture__/tabla-de-mapa.ts',
      ["export const PRECEDENCIA: ReadonlyMap<string, number> = new Map([['+', 11]]);", ''].join('\n'),
    );
    expect(violacionesDeTablas(resultado)).toHaveLength(0);
  });

  it('un `Record` con una clave CERRADA (`Record<Tipo, string>`) NO dispara la regla: no se indexa con texto del alumno', async () => {
    const resultado = await lintarComoSiFuera(
      'src/motor/semantica/__fixture__/clave-cerrada.ts',
      ["type Tipo = 'int' | 'double';", "export const NOMBRES: Readonly<Record<Tipo, string>> = { int: 'entero', double: 'decimal' };", ''].join('\n'),
    );
    expect(violacionesDeTablas(resultado)).toHaveLength(0);
  });

  it('`Record<string, unknown>` (una bolsa de datos que no se consulta por nombre) NO dispara la regla', async () => {
    const resultado = await lintarComoSiFuera(
      'src/motor/lexico/__fixture__/bolsa-de-datos.ts',
      ['export interface Token {', '  readonly datos?: Readonly<Record<string, unknown>>;', '}', ''].join('\n'),
    );
    expect(violacionesDeTablas(resultado)).toHaveLength(0);
  });

  it('los datos generados por el oráculo (`*.generado.ts`) quedan fuera de la regla: se convierten a `Map` al cargarse', async () => {
    const resultado = await lintarComoSiFuera(
      'src/motor/biblioteca/datos/ejemplo.generado.ts',
      ["export const CLASES: Readonly<Record<string, string>> = { 'java.util': 'Scanner' };", ''].join('\n'),
    );
    expect(violacionesDeTablas(resultado)).toHaveLength(0);
  });

  it('fuera de src/motor la regla no aplica (los catálogos de texto se indexan con códigos cerrados)', async () => {
    const resultado = await lintarComoSiFuera(
      'src/textos/es-MX/__fixture__/tabla-plana.ts',
      ["export const TEXTOS: Readonly<Record<string, string>> = { a: 'b' };", ''].join('\n'),
    );
    expect(violacionesDeTablas(resultado)).toHaveLength(0);
  });

  it('los archivos reales de src/motor ya no tienen ninguna tabla de objeto plano indexada por texto', async () => {
    const eslint = new ESLint({ cwd: raiz });
    const resultados = await eslint.lintFiles(['src/motor/**/*.ts']);
    const violaciones = resultados.flatMap((resultado) =>
      violacionesDeTablas(resultado).map((mensaje) => `${resultado.filePath}:${mensaje.line} — ${mensaje.message}`),
    );
    expect(violaciones).toEqual([]);
  });
});
