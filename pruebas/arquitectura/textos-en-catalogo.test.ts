import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

// Verifica la guarda de "texto fuera del catálogo es-MX" (tarea 0.17, ADR 015, WARNING-2 de
// sdd-verify del lote 0). Mismo patrón que pruebas/arquitectura/fronteras.test.ts: `lintText` con
// un `filePath` VIRTUAL bajo src/interfaz/__fixture__/ — el código de cada fixture nunca toca
// disco, así que una violación a propósito jamás contamina `npm run lint`.

const raiz = resolve(import.meta.dirname, '..', '..');

async function lintarComoSiFuera(rutaVirtual: string, codigo: string) {
  const eslint = new ESLint({ cwd: raiz });
  const [resultado] = await eslint.lintText(codigo, { filePath: rutaVirtual });
  if (!resultado) throw new Error('ESLint no devolvió resultado para ' + rutaVirtual);
  return resultado;
}

function violacionesDeTextos(resultado: ESLint.LintResult) {
  return resultado.messages.filter((mensaje) => mensaje.ruleId === 'no-restricted-syntax');
}

describe('textos fuera del catálogo es-MX (tarea 0.17, ADR 015)', () => {
  it('texto visible literal en JSX (con letras) dispara la regla', async () => {
    const resultado = await lintarComoSiFuera(
      'src/interfaz/__fixture__/texto-literal.tsx',
      ['export function Fixture() {', '  return <p>Hola</p>;', '}', ''].join('\n'),
    );
    expect(violacionesDeTextos(resultado).length).toBeGreaterThan(0);
  });

  it('un texto JSX partido por una expresión ("Paso {n} de 10") dispara la regla en cada tramo con letras', async () => {
    const resultado = await lintarComoSiFuera(
      'src/interfaz/__fixture__/texto-con-interpolacion.tsx',
      [
        'export function Fixture({ n }: { n: number }) {',
        '  return <span>Paso {n} de 10</span>;',
        '}',
        '',
      ].join('\n'),
    );
    // Dos tramos de JSXText con letras alrededor de la expresión: "Paso " y " de 10".
    expect(violacionesDeTextos(resultado).length).toBeGreaterThanOrEqual(2);
  });

  it('un símbolo suelto como ◀ NO dispara la regla (no tiene letras)', async () => {
    const resultado = await lintarComoSiFuera(
      'src/interfaz/__fixture__/simbolo-suelto.tsx',
      ['export function Fixture() {', '  return <span>◀</span>;', '}', ''].join('\n'),
    );
    expect(violacionesDeTextos(resultado)).toHaveLength(0);
  });

  it('una cadena literal en aria-label/title/placeholder dispara la regla en cada atributo', async () => {
    const resultado = await lintarComoSiFuera(
      'src/interfaz/__fixture__/atributo-literal.tsx',
      [
        'export function Fixture() {',
        '  return <input title="Correo" placeholder="tu@correo.com" />;',
        '}',
        '',
      ].join('\n'),
    );
    expect(violacionesDeTextos(resultado)).toHaveLength(2);
  });

  it('aria-label con una expresión (no literal) NO dispara la regla de atributos', async () => {
    const resultado = await lintarComoSiFuera(
      'src/interfaz/__fixture__/atributo-expresion.tsx',
      [
        'export function Fixture({ t }: { t: string }) {',
        '  return <button aria-label={t} />;',
        '}',
        '',
      ].join('\n'),
    );
    expect(violacionesDeTextos(resultado)).toHaveLength(0);
  });

  it('un atributo no vigilado como className NO dispara la regla', async () => {
    const resultado = await lintarComoSiFuera(
      'src/interfaz/__fixture__/atributo-no-vigilado.tsx',
      ['export function Fixture() {', '  return <div className="visualizador" />;', '}', ''].join(
        '\n',
      ),
    );
    expect(violacionesDeTextos(resultado)).toHaveLength(0);
  });

  it('los archivos reales de src/interfaz ya no tienen texto fuera del catálogo (App.tsx, Visualizador.tsx, etc.)', async () => {
    const eslint = new ESLint({ cwd: raiz });
    const resultados = await eslint.lintFiles(['src/interfaz/**/*.tsx']);
    const violaciones = resultados.flatMap((resultado) =>
      violacionesDeTextos(resultado).map(
        (mensaje) => `${resultado.filePath}:${mensaje.line} — ${mensaje.message}`,
      ),
    );
    expect(violaciones).toEqual([]);
  });
});
