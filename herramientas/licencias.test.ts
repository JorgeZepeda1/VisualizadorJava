import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEPENDENCIAS_EJECUCION,
} from './versiones-fijadas.ts';
import {
  actualizarAvisos,
  auditarLicencias,
  esLicenciaPermitida,
  formatearMensajeDeFalla,
  generarSeccionAvisos,
  leerDependenciasDeEjecucion,
  type DependenciaConLicencia,
} from './licencias.ts';

// Tarea 0.4 — audita que las dependencias de ejecución tengan licencia permisiva (ADR 016) y
// genera la sección de AVISOS-DE-TERCEROS.md correspondiente. El caso GPL-3.0 es un
// `package.json` simulado (lista de dependencias en memoria): no se instala una dependencia
// copyleft real solo para probar el rechazo.

const raiz = resolve(import.meta.dirname, '..');

function dependenciasPermisivasSimuladas(): DependenciaConLicencia[] {
  return DEPENDENCIAS_EJECUCION.map((dep) => ({ nombre: dep.nombre, version: dep.version, licencia: 'MIT' }));
}

describe('auditoría de licencias (tarea 0.4, ADR 016)', () => {
  it('rechaza una dependencia con licencia copyleft (GPL-3.0 simulada) con mensaje claro', () => {
    const dependencias: DependenciaConLicencia[] = [
      ...dependenciasPermisivasSimuladas(),
      { nombre: 'paquete-copyleft-simulado', version: '1.0.0', licencia: 'GPL-3.0' },
    ];

    const resultado = auditarLicencias(dependencias);

    expect(resultado.ok).toBe(false);
    expect(resultado.noPermitidas).toHaveLength(1);
    expect(resultado.noPermitidas[0]?.nombre).toBe('paquete-copyleft-simulado');

    const mensaje = formatearMensajeDeFalla(resultado);
    expect(mensaje).toContain('paquete-copyleft-simulado');
    expect(mensaje).toContain('GPL-3.0');
  });

  it('acepta un conjunto donde todas las licencias son permisivas', () => {
    const resultado = auditarLicencias(dependenciasPermisivasSimuladas());
    expect(resultado.ok).toBe(true);
    expect(resultado.noPermitidas).toHaveLength(0);
  });

  it('clasifica licencias individuales (MIT permitida, GPL-3.0 y ausente no permitidas)', () => {
    expect(esLicenciaPermitida('MIT')).toBe(true);
    expect(esLicenciaPermitida('Apache-2.0')).toBe(true);
    expect(esLicenciaPermitida('GPL-3.0')).toBe(false);
    expect(esLicenciaPermitida(undefined)).toBe(false);
  });

  it('genera la sección de avisos ordenada, con nombre, versión y licencia', () => {
    const seccion = generarSeccionAvisos([
      { nombre: 'zeta', version: '2.0.0', licencia: 'ISC' },
      { nombre: 'alfa', version: '1.0.0', licencia: 'MIT' },
    ]);
    const lineas = seccion.split('\n');
    expect(lineas[0]).toBe('- **alfa** 1.0.0 — MIT');
    expect(lineas[1]).toBe('- **zeta** 2.0.0 — ISC');
  });

  it('actualiza solo el bloque generado de AVISOS-DE-TERCEROS.md y conserva el resto', () => {
    const original = [
      '# Avisos de terceros',
      '',
      '## fdlibm (Sun Microsystems)',
      '(reservado — se llena en la tarea 2.5)',
      '',
      '## Dependencias de ejecución',
      '<!-- INICIO: generado por herramientas/licencias.ts -->',
      '- **viejo** 0.0.1 — MIT',
      '<!-- FIN: generado por herramientas/licencias.ts -->',
      '',
      '## Fin del documento',
    ].join('\n');

    const actualizado = actualizarAvisos(original, '- **nuevo** 1.0.0 — MIT');

    expect(actualizado).toContain('(reservado — se llena en la tarea 2.5)');
    expect(actualizado).toContain('## Fin del documento');
    expect(actualizado).toContain('- **nuevo** 1.0.0 — MIT');
    expect(actualizado).not.toContain('- **viejo** 0.0.1 — MIT');
  });

  it('lee las licencias reales instaladas de las dependencias de ejecución (MIT, verificado en node_modules)', () => {
    const dependencias = leerDependenciasDeEjecucion(raiz);
    expect(dependencias).toHaveLength(DEPENDENCIAS_EJECUCION.length);
    const react = dependencias.find((dep) => dep.nombre === 'react');
    expect(react?.licencia).toBe('MIT');
    const resultado = auditarLicencias(dependencias);
    expect(resultado.ok).toBe(true);
  });
});
