import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Tarea 0.7 (ADR 011): los goldens del oráculo son binarios (capturados con `child_process`,
// bytes exactos del JDK real) — git NUNCA debe normalizar sus finales de línea ni tratarlos como
// texto, o "bytes idénticos" (ADR 011 punto 4) dejaría de ser cierto entre un `checkout` en
// Windows y uno en macOS/Linux. `git check-attr` es la fuente de verdad: no requiere que el
// archivo exista de verdad en disco, solo evalúa los patrones de `.gitattributes` contra la ruta.

const raiz = resolve(import.meta.dirname, '..', '..');

function atributoText(rutaRelativa: string): string {
  const salida = execFileSync('git', ['check-attr', '-a', rutaRelativa], { cwd: raiz, encoding: 'utf-8' });
  return salida.trim();
}

describe('.gitattributes — goldens binarios de corpus/ (tarea 0.7, ADR 011)', () => {
  it('marca un golden de corpus/curso/ como binario (-text → "unset")', () => {
    expect(atributoText('corpus/curso/u3-hola-mundo.salida')).toContain('text: unset');
  });

  it('marca un golden de corpus/experimentos/ (subcarpeta anidada) también como binario', () => {
    expect(atributoText('corpus/experimentos/numeros/candidatos/Candidato01_IntOverflowYShifts.oraculo.json')).toContain(
      'text: unset',
    );
  });

  it('cubre CUALQUIER archivo bajo corpus/, no solo los que ya existen hoy (patrón corpus/**)', () => {
    expect(atributoText('corpus/curso/algun-programa-futuro.combinada')).toContain('text: unset');
  });

  it('no afecta archivos fuera de corpus/ (sigue sin declarar el atributo "text")', () => {
    expect(atributoText('package.json')).toBe('');
  });
});
