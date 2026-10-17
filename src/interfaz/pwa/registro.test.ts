// RED de la tarea 0.11 (el service worker se registra; degrada sin red ni soporte) ampliado en la 5.7 (REQ-PLAT-008, ADR 014): al cargar y cada hora busca una versión nueva, y cuando la hay la ofrece —sin
// activarla sola, porque recargar borra el programa del editor— y, solo si la persona acepta, le pide al worker nuevo que tome el mando y recarga la página. Los fakes de aquí abajo reproducen el
// contrato real del navegador (eventos `updatefound`, `statechange`, `controllerchange`); que el `sw.js` que genera `vite-plugin-pwa` entienda el mensaje lo prueba `pruebas/e2e/actualizacion.spec.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registrarServiceWorker } from './registro.ts';

class TrabajadorFalso extends EventTarget {
  state: ServiceWorkerState = 'installing';
  readonly postMessage = vi.fn();

  pasarA(estado: ServiceWorkerState): void {
    this.state = estado;
    this.dispatchEvent(new Event('statechange'));
  }
}

class RegistroFalso extends EventTarget {
  installing: TrabajadorFalso | null = null;
  waiting: TrabajadorFalso | null = null;
  readonly update = vi.fn(() => Promise.resolve());

  /** El navegador encontró un `sw.js` distinto y empezó a instalarlo. */
  encontrarVersionNueva(trabajador: TrabajadorFalso): void {
    this.installing = trabajador;
    this.dispatchEvent(new Event('updatefound'));
  }
}

class ContenedorFalso extends EventTarget {
  /** Quien controla la página hoy: `null` en la primera visita. */
  controller: object | null;
  readonly registro: RegistroFalso;
  readonly register = vi.fn<(guion: string, opciones: RegistrationOptions) => Promise<RegistroFalso>>(() => Promise.resolve(this.registro));

  constructor(registro: RegistroFalso, controlada: boolean) {
    super();
    this.registro = registro;
    this.controller = controlada ? {} : null;
  }

  tomarElMando(): void {
    this.dispatchEvent(new Event('controllerchange'));
  }
}

function navegadorCon(contenedor: ContenedorFalso): Navigator {
  return { serviceWorker: contenedor } as unknown as Navigator;
}

/** Deja correr las promesas pendientes (el registro es asíncrono). */
async function esperarAlRegistro(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

const UNA_HORA_MS = 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('registrarServiceWorker — el registro', () => {
  it('registra sw.js con scope "/" cuando el navegador lo soporta (BASE_URL "/" en pruebas)', () => {
    const contenedor = new ContenedorFalso(new RegistroFalso(), false);

    registrarServiceWorker(navegadorCon(contenedor));

    expect(contenedor.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('bajo una ruta base (GitHub Pages) registra el sw.js de ESA ruta y con ESE alcance: nunca el de la raíz del dominio', () => {
    const contenedor = new ContenedorFalso(new RegistroFalso(), false);

    registrarServiceWorker(navegadorCon(contenedor), { base: '/VisualizadorJava/' });

    expect(contenedor.register).toHaveBeenCalledWith('/VisualizadorJava/sw.js', { scope: '/VisualizadorJava/' });
  });

  it('no lanza si el navegador no soporta service workers (degradación sin red, C12)', () => {
    const alHaberVersionNueva = vi.fn();
    const detener = registrarServiceWorker({} as Navigator, { alHaberVersionNueva });

    expect(() => detener()).not.toThrow();
    expect(alHaberVersionNueva).not.toHaveBeenCalled();
  });

  it('usa el navigator real por omisión (bajo jsdom, sin serviceWorker: degrada sin lanzar)', () => {
    expect(() => registrarServiceWorker()).not.toThrow();
  });

  it('si el registro falla (en desarrollo no hay sw.js), la página sigue y no se ofrece nada', async () => {
    const contenedor = new ContenedorFalso(new RegistroFalso(), true);
    contenedor.register.mockRejectedValueOnce(new Error('404'));
    const alHaberVersionNueva = vi.fn();

    registrarServiceWorker(navegadorCon(contenedor), { alHaberVersionNueva });
    await esperarAlRegistro();

    expect(alHaberVersionNueva).not.toHaveBeenCalled();
  });
});

describe('registrarServiceWorker — busca una versión nueva al cargar y cada hora', () => {
  it('al cargar pregunta si hay una versión nueva, una sola vez', async () => {
    const registro = new RegistroFalso();

    registrarServiceWorker(navegadorCon(new ContenedorFalso(registro, true)));
    await esperarAlRegistro();

    expect(registro.update).toHaveBeenCalledTimes(1);
  });

  it('y vuelve a preguntar cada hora, para el salón que deja la pestaña abierta todo el día', async () => {
    const registro = new RegistroFalso();
    registrarServiceWorker(navegadorCon(new ContenedorFalso(registro, true)));
    await esperarAlRegistro();

    await vi.advanceTimersByTimeAsync(UNA_HORA_MS - 1);
    expect(registro.update).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(registro.update).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(UNA_HORA_MS);
    expect(registro.update).toHaveBeenCalledTimes(3);
  });

  it('sin red la búsqueda falla en silencio: la página no se rompe', async () => {
    const registro = new RegistroFalso();
    registro.update.mockRejectedValue(new TypeError('Failed to fetch'));

    registrarServiceWorker(navegadorCon(new ContenedorFalso(registro, true)));
    await esperarAlRegistro();
    await vi.advanceTimersByTimeAsync(UNA_HORA_MS);

    expect(registro.update).toHaveBeenCalledTimes(2);
  });

  it('lo que devuelve detiene la vigilancia: ni más búsquedas ni más avisos', async () => {
    const registro = new RegistroFalso();
    const alHaberVersionNueva = vi.fn();
    const detener = registrarServiceWorker(navegadorCon(new ContenedorFalso(registro, true)), { alHaberVersionNueva });
    await esperarAlRegistro();

    detener();
    await vi.advanceTimersByTimeAsync(3 * UNA_HORA_MS);
    registro.encontrarVersionNueva(new TrabajadorFalso());
    registro.installing?.pasarA('installed');

    expect(registro.update).toHaveBeenCalledTimes(1);
    expect(alHaberVersionNueva).not.toHaveBeenCalled();
  });
});

describe('registrarServiceWorker — ofrece la versión nueva', () => {
  it('cuando un worker nuevo termina de instalarse y la página ya tenía uno al mando, ofrece la versión (una vez)', async () => {
    const registro = new RegistroFalso();
    const alHaberVersionNueva = vi.fn();
    registrarServiceWorker(navegadorCon(new ContenedorFalso(registro, true)), { alHaberVersionNueva });
    await esperarAlRegistro();

    const nuevo = new TrabajadorFalso();
    registro.encontrarVersionNueva(nuevo);
    expect(alHaberVersionNueva).not.toHaveBeenCalled();
    nuevo.pasarA('installed');

    expect(alHaberVersionNueva).toHaveBeenCalledTimes(1);
    expect(nuevo.postMessage).not.toHaveBeenCalled();
  });

  it('en la PRIMERA visita (nadie al mando todavía) instalar el worker no es una versión nueva: no se ofrece nada', async () => {
    const registro = new RegistroFalso();
    const alHaberVersionNueva = vi.fn();
    registrarServiceWorker(navegadorCon(new ContenedorFalso(registro, false)), { alHaberVersionNueva });
    await esperarAlRegistro();

    const primero = new TrabajadorFalso();
    registro.encontrarVersionNueva(primero);
    primero.pasarA('installed');
    primero.pasarA('activated');

    expect(alHaberVersionNueva).not.toHaveBeenCalled();
  });

  it('un worker que todavía se instala o que se descarta (redundante) no se ofrece', async () => {
    const registro = new RegistroFalso();
    const alHaberVersionNueva = vi.fn();
    registrarServiceWorker(navegadorCon(new ContenedorFalso(registro, true)), { alHaberVersionNueva });
    await esperarAlRegistro();

    const nuevo = new TrabajadorFalso();
    registro.encontrarVersionNueva(nuevo);
    nuevo.pasarA('installing');
    nuevo.pasarA('redundant');

    expect(alHaberVersionNueva).not.toHaveBeenCalled();
  });

  it('un worker nuevo que ya estaba esperando de una visita anterior se ofrece desde que carga la página', async () => {
    const registro = new RegistroFalso();
    registro.waiting = new TrabajadorFalso();
    const alHaberVersionNueva = vi.fn();

    registrarServiceWorker(navegadorCon(new ContenedorFalso(registro, true)), { alHaberVersionNueva });
    await esperarAlRegistro();

    expect(alHaberVersionNueva).toHaveBeenCalledTimes(1);
  });

  it('un worker que el navegador ya había empezado a instalar ANTES de que la página terminara de registrar (carrera real al recargar) se ofrece cuando termina de instalarse', async () => {
    const registro = new RegistroFalso();
    const instalando = new TrabajadorFalso();
    registro.installing = instalando;
    const alHaberVersionNueva = vi.fn();
    registrarServiceWorker(navegadorCon(new ContenedorFalso(registro, true)), { alHaberVersionNueva });
    await esperarAlRegistro();
    expect(alHaberVersionNueva).not.toHaveBeenCalled();

    instalando.pasarA('installed');

    expect(alHaberVersionNueva).toHaveBeenCalledTimes(1);
  });

  it('esa misma carrera en la primera visita (nadie al mando) tampoco ofrece nada', async () => {
    const registro = new RegistroFalso();
    const instalando = new TrabajadorFalso();
    registro.installing = instalando;
    const alHaberVersionNueva = vi.fn();
    registrarServiceWorker(navegadorCon(new ContenedorFalso(registro, false)), { alHaberVersionNueva });
    await esperarAlRegistro();

    instalando.pasarA('installed');

    expect(alHaberVersionNueva).not.toHaveBeenCalled();
  });

  it('un worker esperando en la primera visita (nadie al mando) tampoco se ofrece', async () => {
    const registro = new RegistroFalso();
    registro.waiting = new TrabajadorFalso();
    const alHaberVersionNueva = vi.fn();

    registrarServiceWorker(navegadorCon(new ContenedorFalso(registro, false)), { alHaberVersionNueva });
    await esperarAlRegistro();

    expect(alHaberVersionNueva).not.toHaveBeenCalled();
  });
});

describe('registrarServiceWorker — aceptar la versión nueva', () => {
  async function ofrecida(): Promise<{ contenedor: ContenedorFalso; registro: RegistroFalso; nuevo: TrabajadorFalso; aplicar: () => void; recargar: ReturnType<typeof vi.fn> }> {
    const registro = new RegistroFalso();
    const contenedor = new ContenedorFalso(registro, true);
    const recargar = vi.fn();
    let aplicar: (() => void) | undefined;
    registrarServiceWorker(navegadorCon(contenedor), { alHaberVersionNueva: (aplicarLaVersion) => (aplicar = aplicarLaVersion), recargar });
    await esperarAlRegistro();
    const nuevo = new TrabajadorFalso();
    registro.encontrarVersionNueva(nuevo);
    nuevo.pasarA('installed');
    if (!aplicar) throw new Error('No se ofreció la versión nueva');
    return { contenedor, registro, nuevo, aplicar, recargar };
  }

  it('al aceptar le pide al worker nuevo que tome el mando (el mensaje SKIP_WAITING que entiende el sw.js) y, cuando lo toma, recarga la página', async () => {
    const { contenedor, nuevo, aplicar, recargar } = await ofrecida();

    aplicar();
    expect(nuevo.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(recargar).not.toHaveBeenCalled();

    contenedor.tomarElMando();
    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('recarga UNA sola vez aunque el navegador avise del cambio de mando más de una vez', async () => {
    const { contenedor, aplicar, recargar } = await ofrecida();

    aplicar();
    contenedor.tomarElMando();
    contenedor.tomarElMando();

    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('si la persona NO aceptó, un cambio de mando (por ejemplo desde otra pestaña) no recarga la página: perdería lo que escribió', async () => {
    const { contenedor, recargar } = await ofrecida();

    contenedor.tomarElMando();

    expect(recargar).not.toHaveBeenCalled();
  });

  it('si mientras tanto llegó una versión aún más nueva, activa la que de verdad está esperando y no la que ya quedó descartada', async () => {
    const { registro, nuevo, aplicar } = await ofrecida();
    const masNueva = new TrabajadorFalso();
    registro.waiting = masNueva;

    aplicar();

    expect(masNueva.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(nuevo.postMessage).not.toHaveBeenCalled();
  });

  it('un worker que esperaba desde antes también se activa con SKIP_WAITING', async () => {
    const registro = new RegistroFalso();
    const esperando = new TrabajadorFalso();
    registro.waiting = esperando;
    const contenedor = new ContenedorFalso(registro, true);
    const recargar = vi.fn();
    let aplicar: (() => void) | undefined;
    registrarServiceWorker(navegadorCon(contenedor), { alHaberVersionNueva: (aplicarLaVersion) => (aplicar = aplicarLaVersion), recargar });
    await esperarAlRegistro();

    aplicar?.();
    contenedor.tomarElMando();

    expect(esperando.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(recargar).toHaveBeenCalledTimes(1);
  });
});
