// RED de la tarea 0.11: el service worker se registra y existe manifiesto con name/icons (design
// dice PWA mínima, ADR 014). El aviso «Hay una versión nueva» y la búsqueda de actualización cada
// hora (registerType:'prompt') llegan en el lote 5 (M23); aquí solo el registro base.
import { describe, expect, it, vi } from 'vitest';
import { registrarServiceWorker } from './registro.ts';

describe('registrarServiceWorker', () => {
  it('registra /sw.js con scope "/" cuando el navegador lo soporta (BASE_URL "/" en pruebas)', () => {
    const registrar = vi.fn().mockResolvedValue({ scope: '/' });
    const navegadorFalso = { serviceWorker: { register: registrar } } as unknown as Navigator;

    registrarServiceWorker(navegadorFalso);

    expect(registrar).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('no lanza si el navegador no soporta service workers (degradación sin red, C12)', () => {
    const navegadorSinSoporte = {} as Navigator;
    expect(() => registrarServiceWorker(navegadorSinSoporte)).not.toThrow();
  });

  it('usa el navigator real por omisión (bajo jsdom, sin serviceWorker: degrada sin lanzar)', () => {
    expect(() => registrarServiceWorker()).not.toThrow();
  });
});
