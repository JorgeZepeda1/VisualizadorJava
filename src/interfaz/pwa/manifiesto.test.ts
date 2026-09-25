// RED de la tarea 0.11 (PWA mínima, ADR 014). El manifiesto lo consume `vite.config.ts`
// (`VitePWA({ manifest: manifiesto })`) y se prueba aquí sin necesitar un build real (CLAUDE.md
// regla 8: nunca `vite build` salvo que el E2E "sin red" lo exija — tarea 0.15).
import { describe, expect, it } from 'vitest';
import { manifiesto } from './manifiesto.ts';

describe('manifiesto de la PWA', () => {
  it('define name, short_name y lang en español de México', () => {
    expect(manifiesto.name).toBe('Visualizador de Java paso a paso');
    expect(manifiesto.short_name).toBe('Visualizador Java');
    expect(manifiesto.lang).toBe('es-MX');
  });

  it('define un ícono de 192x192 y uno de 512x512, cada uno con src/sizes/type reales', () => {
    const iconos = manifiesto.icons ?? [];
    const tamanos = iconos.map((icono) => icono.sizes);
    expect(tamanos).toContain('192x192');
    expect(tamanos).toContain('512x512');
    for (const icono of iconos) {
      expect(icono.src).toMatch(/\.png$/);
      expect(icono.type).toBe('image/png');
    }
  });

  it('display standalone y start_url relativo (instalable bajo cualquier subruta de Pages)', () => {
    expect(manifiesto.display).toBe('standalone');
    expect(manifiesto.start_url).toBe('.');
  });
});
