// RED de la tarea 3.6 (ADR 007 punto 4, design.md §5): el perro guardián vigila al trabajador desde el cliente. Si pasan 2 s sin que el trabajador mande un solo mensaje MIENTRAS CALCULA, vence el
// silencio (el cliente lo termina); y tras un `detener`, si el acuse no llega en 300 ms, vence el plazo del acuse. Es solo el reloj: qué hacer al vencer lo decide el cliente. Los tiempos son de mentira
// (`vi.useFakeTimers`): ninguna prueba espera de verdad.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACUSE_MAXIMO_MS, crearPerroGuardian, SILENCIO_MAXIMO_MS } from './perro-guardian.ts';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function perro() {
  const alVencerElSilencio = vi.fn();
  const alVencerElAcuse = vi.fn();
  return { guardian: crearPerroGuardian({ alVencerElSilencio, alVencerElAcuse }), alVencerElSilencio, alVencerElAcuse };
}

describe('los plazos son los del diseño', () => {
  it('2 s de silencio y 300 ms para el acuse de detener', () => {
    expect(SILENCIO_MAXIMO_MS).toBe(2_000);
    expect(ACUSE_MAXIMO_MS).toBe(300);
  });
});

describe('silencio del trabajador mientras calcula', () => {
  it('vence a los 2 s justos sin mensajes, una sola vez', () => {
    const { guardian, alVencerElSilencio } = perro();
    guardian.vigilar();
    vi.advanceTimersByTime(SILENCIO_MAXIMO_MS - 1);
    expect(alVencerElSilencio).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(alVencerElSilencio).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    expect(alVencerElSilencio).toHaveBeenCalledTimes(1);
  });

  it('cada mensaje del trabajador (`latido`) reinicia el plazo completo', () => {
    const { guardian, alVencerElSilencio } = perro();
    guardian.vigilar();
    vi.advanceTimersByTime(1_900);
    guardian.latido();
    vi.advanceTimersByTime(1_900);
    guardian.latido();
    vi.advanceTimersByTime(1_900);
    expect(alVencerElSilencio).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(alVencerElSilencio).toHaveBeenCalledTimes(1);
  });

  it('`descansar` (el programa espera una línea, o terminó) quita la vigilancia: por mucho que pase el tiempo, no vence', () => {
    const { guardian, alVencerElSilencio } = perro();
    guardian.vigilar();
    guardian.descansar();
    vi.advanceTimersByTime(10 * SILENCIO_MAXIMO_MS);
    expect(alVencerElSilencio).not.toHaveBeenCalled();
  });

  it('un `latido` sin vigilar no arma nada (un mensaje que llega cuando no se espera no despierta al perro)', () => {
    const { guardian, alVencerElSilencio } = perro();
    guardian.latido();
    vi.advanceTimersByTime(10 * SILENCIO_MAXIMO_MS);
    expect(alVencerElSilencio).not.toHaveBeenCalled();
  });

  it('se puede volver a vigilar tras descansar (llegó la línea que esperaba y el programa sigue calculando)', () => {
    const { guardian, alVencerElSilencio } = perro();
    guardian.vigilar();
    guardian.descansar();
    guardian.vigilar();
    vi.advanceTimersByTime(SILENCIO_MAXIMO_MS);
    expect(alVencerElSilencio).toHaveBeenCalledTimes(1);
  });

  it('vigilar dos veces seguidas no apila dos plazos: sigue siendo uno', () => {
    const { guardian, alVencerElSilencio } = perro();
    guardian.vigilar();
    vi.advanceTimersByTime(1_000);
    guardian.vigilar();
    vi.advanceTimersByTime(1_500);
    expect(alVencerElSilencio).not.toHaveBeenCalled(); // el segundo `vigilar` reinició el plazo
    vi.advanceTimersByTime(500);
    expect(alVencerElSilencio).toHaveBeenCalledTimes(1);
  });
});

describe('acuse de `detener`', () => {
  it('si no llega en 300 ms, vence el plazo del acuse', () => {
    const { guardian, alVencerElAcuse } = perro();
    guardian.esperarAcuse();
    vi.advanceTimersByTime(ACUSE_MAXIMO_MS - 1);
    expect(alVencerElAcuse).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(alVencerElAcuse).toHaveBeenCalledTimes(1);
  });

  it('si el acuse llega a tiempo, no vence', () => {
    const { guardian, alVencerElAcuse } = perro();
    guardian.esperarAcuse();
    vi.advanceTimersByTime(200);
    guardian.acuseRecibido();
    vi.advanceTimersByTime(10_000);
    expect(alVencerElAcuse).not.toHaveBeenCalled();
  });

  it('esperar el acuse no depende de la vigilancia del silencio: son dos relojes', () => {
    const { guardian, alVencerElSilencio, alVencerElAcuse } = perro();
    guardian.vigilar();
    guardian.esperarAcuse();
    vi.advanceTimersByTime(ACUSE_MAXIMO_MS);
    expect(alVencerElAcuse).toHaveBeenCalledTimes(1);
    expect(alVencerElSilencio).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SILENCIO_MAXIMO_MS);
    expect(alVencerElSilencio).toHaveBeenCalledTimes(1);
  });
});

describe('cancelar', () => {
  it('descansar y acuseRecibido cancelan cada uno su plazo y dejan al perro listo para volver a vigilar', () => {
    const { guardian, alVencerElSilencio, alVencerElAcuse } = perro();
    guardian.vigilar();
    guardian.esperarAcuse();
    guardian.descansar();
    guardian.acuseRecibido();
    vi.advanceTimersByTime(60_000);
    expect(alVencerElSilencio).not.toHaveBeenCalled();
    expect(alVencerElAcuse).not.toHaveBeenCalled();
    guardian.vigilar();
    vi.advanceTimersByTime(SILENCIO_MAXIMO_MS);
    expect(alVencerElSilencio).toHaveBeenCalledTimes(1);
  });
});
