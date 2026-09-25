import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEPENDENCIAS_DESARROLLO,
  DEPENDENCIAS_EJECUCION,
  VERSION_NODE,
} from '../../herramientas/versiones-fijadas.ts';

// Verifica el andamiaje raíz de la tarea 0.1: versiones exactas (design.md §9) y Node fijado
// (.nvmrc). Sin esto, cada máquina y cada CI podría resolver una versión distinta de una
// dependencia — justo lo que proposal.md §13 punto 1 prohíbe ("completo y funcionando").

const raiz = resolve(import.meta.dirname, '..', '..');

function leerJsonDePaquete(): { dependencies: Record<string, string>; devDependencies: Record<string, string> } {
  const contenido = readFileSync(resolve(raiz, 'package.json'), 'utf-8');
  return JSON.parse(contenido) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
}

describe('andamiaje raíz (tarea 0.1)', () => {
  it('.nvmrc fija la versión de Node verificada', () => {
    const contenido = readFileSync(resolve(raiz, '.nvmrc'), 'utf-8').trim();
    expect(contenido).toBe(VERSION_NODE);
  });

  it('package.json fija cada dependencia de ejecución en su versión exacta', () => {
    const { dependencies } = leerJsonDePaquete();
    for (const { nombre, version } of DEPENDENCIAS_EJECUCION) {
      expect(dependencies[nombre]).toBe(version);
    }
  });

  it('package.json fija cada dependencia de desarrollo en su versión exacta', () => {
    const { devDependencies } = leerJsonDePaquete();
    for (const { nombre, version } of DEPENDENCIAS_DESARROLLO) {
      expect(devDependencies[nombre]).toBe(version);
    }
  });

  it('ninguna versión usa rangos semver (^, ~, *, x, latest)', () => {
    const { dependencies, devDependencies } = leerJsonDePaquete();
    const todas = { ...dependencies, ...devDependencies };
    const nombres = Object.keys(todas);
    expect(nombres.length).toBe(DEPENDENCIAS_EJECUCION.length + DEPENDENCIAS_DESARROLLO.length);
    for (const nombre of nombres) {
      expect(todas[nombre]).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});
