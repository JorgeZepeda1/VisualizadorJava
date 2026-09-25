// RED de la tarea 0.13 (rebanada vertical — traza y trabajador mínimos, design.md §3.4, ADR 006).
// `agregar`/`estadoEn` sin puntos de control (se completan en la tarea 3.1); `suscribir`/
// `obtenerVersion` habilitan useSyncExternalStore (ADR 013) desde el lote 0.
import { describe, expect, it } from 'vitest';
import { Traza } from './traza.ts';
import type { Paso } from './paso.ts';

function paso(texto: string): Paso {
  return { clase: 'impresion', nodo: 0, salida: [{ flujo: 'out', texto }] };
}

describe('Traza', () => {
  it('empieza vacía: estadoEn(0) no trae pasos y total es 0', () => {
    const traza = new Traza();
    expect(traza.estadoEn(0)).toEqual([]);
    expect(traza.total).toBe(0);
  });

  it('agregar() acumula pasos de varias llamadas y estadoEn(n) devuelve los primeros n', () => {
    const traza = new Traza();
    traza.agregar([paso('a'), paso('b')]);
    traza.agregar([paso('c')]);
    expect(traza.total).toBe(3);
    expect(traza.estadoEn(2)).toEqual([paso('a'), paso('b')]);
    expect(traza.estadoEn(3)).toEqual([paso('a'), paso('b'), paso('c')]);
  });

  it('notifica a los oyentes suscritos al agregar, y deja de notificar tras desuscribirse', () => {
    const traza = new Traza();
    let notificaciones = 0;
    const cancelar = traza.suscribir(() => {
      notificaciones += 1;
    });
    traza.agregar([paso('a')]);
    expect(notificaciones).toBe(1);
    cancelar();
    traza.agregar([paso('b')]);
    expect(notificaciones).toBe(1);
  });

  it('obtenerVersion() cambia con cada agregar() (snapshot para useSyncExternalStore)', () => {
    const traza = new Traza();
    const v0 = traza.obtenerVersion();
    traza.agregar([paso('a')]);
    expect(traza.obtenerVersion()).not.toBe(v0);
  });

  it('reiniciar() vacía la traza, sube la versión y notifica (para volver a pulsar Visualizar)', () => {
    const traza = new Traza();
    traza.agregar([paso('a'), paso('b')]);
    const versionAntes = traza.obtenerVersion();
    let notificaciones = 0;
    traza.suscribir(() => {
      notificaciones += 1;
    });

    traza.reiniciar();

    expect(traza.total).toBe(0);
    expect(traza.estadoEn(2)).toEqual([]);
    expect(traza.obtenerVersion()).not.toBe(versionAntes);
    expect(notificaciones).toBe(1);
  });
});
