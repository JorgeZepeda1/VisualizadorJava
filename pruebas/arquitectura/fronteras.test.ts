import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

// Verifica las guardas de capa de ADR 001 / design.md §1.1 con el propio ESLint, de forma
// programática (tarea 0.2). Usa `lintText` con un `filePath` VIRTUAL: el código de cada fixture
// nunca toca disco bajo `src/`, así que una violación a propósito jamás contamina `npm run lint`.

const raiz = resolve(import.meta.dirname, '..', '..');

async function lintarComoSiFuera(rutaVirtual: string, codigo: string) {
  const eslint = new ESLint({ cwd: raiz });
  const [resultado] = await eslint.lintText(codigo, { filePath: rutaVirtual });
  if (!resultado) throw new Error('ESLint no devolvió resultado para ' + rutaVirtual);
  return resultado;
}

describe('guardas de capa (tarea 0.2, ADR 001)', () => {
  it('motor no puede tocar el DOM (global "document" prohibido)', async () => {
    const resultado = await lintarComoSiFuera(
      'src/motor/__fixture__/toca-dom.ts',
      ['export function tituloDeLaVentana(): string {', '  return document.title;', '}', ''].join('\n'),
    );
    expect(resultado.messages.length).toBeGreaterThan(0);
    expect(resultado.messages.some((mensaje) => mensaje.ruleId === 'no-restricted-globals')).toBe(true);
  });

  it('motor no puede importar de textos (matriz: motor no importa nada)', async () => {
    const resultado = await lintarComoSiFuera(
      'src/motor/__fixture__/importa-textos.ts',
      ["import { explicaciones } from '../../textos/index.ts';", 'export { explicaciones };', ''].join('\n'),
    );
    expect(resultado.messages.length).toBeGreaterThan(0);
    expect(resultado.messages.some((mensaje) => mensaje.ruleId === 'no-restricted-imports')).toBe(true);
  });

  it('textos SÍ puede importar motor/vista pero NO el resto de motor', async () => {
    const permitido = await lintarComoSiFuera(
      'src/textos/__fixture__/importa-vista.ts',
      ["import '../../motor/vista.ts';", ''].join('\n'),
    );
    const prohibido = await lintarComoSiFuera(
      'src/textos/__fixture__/importa-compilador.ts',
      ["import '../../motor/compilador.ts';", ''].join('\n'),
    );
    expect(permitido.messages.some((mensaje) => mensaje.ruleId === 'no-restricted-imports')).toBe(false);
    expect(prohibido.messages.some((mensaje) => mensaje.ruleId === 'no-restricted-imports')).toBe(true);
  });

  it('interfaz SÍ puede importar de presentación (matriz: permitido) — sin violaciones de frontera', async () => {
    const resultado = await lintarComoSiFuera(
      'src/interfaz/__fixture__/importa-presentacion.ts',
      ["import '../../presentacion/index.ts';", ''].join('\n'),
    );
    const violacionesDeFrontera = resultado.messages.filter(
      (mensaje) => mensaje.ruleId === 'no-restricted-imports' || mensaje.ruleId === 'no-restricted-globals',
    );
    expect(violacionesDeFrontera).toHaveLength(0);
  });
});
