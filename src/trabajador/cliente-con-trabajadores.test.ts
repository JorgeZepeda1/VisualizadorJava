// RED de la tarea 3.6 (ADR 007, design.md §5): el cliente con trabajadores de verdad (aquí, de mentira), el trabajador de repuesto ya cargado y el perro guardián. `fabricaDeTrabajadores` se inyecta:
// cada llamada devuelve un trabajador falso que guarda lo que le mandan y deja a la prueba contestar. Los tiempos son de mentira (`vi.useFakeTimers`): ninguna prueba espera de verdad.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Traza } from '../motor/vista.ts';
import type { ConfigEjecucion, Paso } from '../motor/index.ts';
import { crearClienteTrabajador, type TrabajadorComoDom } from './cliente.ts';
import type { MensajeTrabajadorAUi, MensajeUiATrabajador } from './protocolo.ts';

function configPorOmision(): ConfigEjecucion {
  return { regional: 'es-MX', semilla: 0n, entradaPreparada: '', entradaInteractiva: false, limitePasos: 100_000, limiteCaracteres: 1_048_576 };
}

class TrabajadorFalso implements TrabajadorComoDom {
  readonly recibidos: MensajeUiATrabajador[] = [];
  terminado = false;
  onmessage: ((evento: { data: unknown }) => void) | null = null;
  onerror: ((evento: { message?: string }) => void) | null = null;

  postMessage(mensaje: unknown): void {
    this.recibidos.push(mensaje as MensajeUiATrabajador);
  }

  terminate(): void {
    this.terminado = true;
  }

  /** El trabajador manda un mensaje a la página (si ya lo terminaron, no llega nada, como en un Worker de verdad). */
  responder(mensaje: MensajeTrabajadorAUi): void {
    if (!this.terminado) this.onmessage?.({ data: mensaje });
  }
}

function paso(texto: string): Paso {
  return { clase: 'impresion', nodo: 0, linea: 1, explicacion: { clave: 'impresion', datos: { texto, flujo: 'out', saltoDeLinea: true } }, salida: [{ flujo: 'out', texto: `${texto}\n` }] };
}

const VISTA_VACIA = { fuente: 'x', ranuras: [], nodos: [] };

function escenario(alMensaje: (mensaje: MensajeTrabajadorAUi) => void = () => undefined) {
  const trabajadores: TrabajadorFalso[] = [];
  const mensajes: MensajeTrabajadorAUi[] = [];
  const cliente = crearClienteTrabajador(
    {
      onMensaje: (mensaje) => {
        mensajes.push(mensaje);
        alMensaje(mensaje);
      },
    },
    {
      fabricaDeTrabajadores: () => {
        const trabajador = new TrabajadorFalso();
        trabajadores.push(trabajador);
        return trabajador;
      },
    },
  );
  return { cliente, trabajadores, mensajes };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('cliente con trabajadores (tarea 3.6)', () => {
  it('al crearse deja UN trabajador cargado, y ejecutar() usa ese mismo (no espera a arrancar otro): le manda el mensaje `ejecutar`', () => {
    const { cliente, trabajadores } = escenario();
    expect(trabajadores).toHaveLength(1);
    cliente.ejecutar(1, 'fuente', configPorOmision());
    expect(trabajadores).toHaveLength(1);
    expect(trabajadores[0].recibidos).toEqual([{ tipo: 'ejecutar', id: 1, fuente: 'fuente', config: configPorOmision() }]);
  });

  it('los mensajes del trabajador llegan a la página tal cual; darEntrada, cerrarEntrada y detener le llegan al trabajador', () => {
    const { cliente, trabajadores, mensajes } = escenario();
    cliente.ejecutar(1, 'fuente', configPorOmision());
    trabajadores[0].responder({ tipo: 'espera-entrada', id: 1, nodo: 3 });
    expect(mensajes).toEqual([{ tipo: 'espera-entrada', id: 1, nodo: 3 }]);
    cliente.darEntrada(1, '25\n');
    cliente.cerrarEntrada(1);
    cliente.detener(1);
    expect(trabajadores[0].recibidos.slice(1)).toEqual([
      { tipo: 'entrada', id: 1, renglon: '25\n' },
      { tipo: 'cerrar-entrada', id: 1 },
      { tipo: 'detener', id: 1 },
    ]);
  });

  it('tras el primer mensaje del trabajador activo se prepara el de repuesto; y ejecutar() otra vez termina al anterior y usa el repuesto (un trabajador por ejecución)', () => {
    const { cliente, trabajadores } = escenario();
    cliente.ejecutar(1, 'a', configPorOmision());
    expect(trabajadores).toHaveLength(1);
    trabajadores[0].responder({ tipo: 'compilado', id: 1, ok: true, vista: VISTA_VACIA });
    expect(trabajadores).toHaveLength(2); // el repuesto ya está cargado
    cliente.ejecutar(2, 'b', configPorOmision());
    expect(trabajadores[0].terminado).toBe(true);
    expect(trabajadores).toHaveLength(2); // usó el repuesto, no arrancó otro
    expect(trabajadores[1].recibidos).toEqual([{ tipo: 'ejecutar', id: 2, fuente: 'b', config: configPorOmision() }]);
  });

  it('los mensajes de una ejecución anterior (ya terminado su trabajador) ya no llegan a la página', () => {
    const { cliente, trabajadores, mensajes } = escenario();
    cliente.ejecutar(1, 'a', configPorOmision());
    trabajadores[0].responder({ tipo: 'compilado', id: 1, ok: true, vista: VISTA_VACIA });
    mensajes.length = 0;
    cliente.ejecutar(2, 'b', configPorOmision());
    trabajadores[0].onmessage?.({ data: { tipo: 'pasos', id: 1, desde: 0, pasos: [paso('viejo')] } }); // un mensaje que ya venía en camino
    expect(mensajes).toEqual([]);
  });

  it('ejecutar() con el trabajador activo ya atorado (terminado por el perro guardián) usa el repuesto y no vuelve a vigilar al viejo', () => {
    const { cliente, trabajadores, mensajes } = escenario();
    cliente.ejecutar(1, 'a', configPorOmision());
    vi.advanceTimersByTime(2_000);
    expect(mensajes).toEqual([{ tipo: 'fin', id: 1, fin: { causa: 'limite-tiempo' } }]);
    cliente.ejecutar(2, 'b', configPorOmision());
    trabajadores[1].responder({ tipo: 'fin', id: 2, fin: { causa: 'terminado' } });
    vi.advanceTimersByTime(60_000);
    expect(mensajes).toEqual([
      { tipo: 'fin', id: 1, fin: { causa: 'limite-tiempo' } },
      { tipo: 'fin', id: 2, fin: { causa: 'terminado' } },
    ]);
  });
});

describe('perro guardián: 2 s sin mensajes mientras calcula', () => {
  it('termina al trabajador, avisa `fin` con causa limite-tiempo y deja un repuesto cargado para la siguiente ejecución', () => {
    const { cliente, trabajadores, mensajes } = escenario();
    cliente.ejecutar(1, 'while (true) {}', configPorOmision());
    vi.advanceTimersByTime(1_999);
    expect(trabajadores[0].terminado).toBe(false);
    expect(mensajes).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(trabajadores[0].terminado).toBe(true);
    expect(mensajes).toEqual([{ tipo: 'fin', id: 1, fin: { causa: 'limite-tiempo' } }]);
    // el repuesto que se había dejado al crear el cliente se usó; ya hay otro nuevo, cargado
    expect(trabajadores).toHaveLength(2);
    expect(trabajadores[1].terminado).toBe(false);
    cliente.ejecutar(2, 'x', configPorOmision());
    expect(trabajadores).toHaveLength(2);
    expect(trabajadores[1].recibidos).toEqual([{ tipo: 'ejecutar', id: 2, fuente: 'x', config: configPorOmision() }]);
  });

  it('la traza recibida antes de la parada sigue navegable (la guarda la página, no el trabajador)', () => {
    const traza = new Traza();
    const { cliente, trabajadores } = escenario((mensaje) => {
      if (mensaje.tipo === 'pasos') traza.agregar(mensaje.pasos);
    });
    cliente.ejecutar(1, 'x', configPorOmision());
    trabajadores[0].responder({ tipo: 'pasos', id: 1, desde: 0, pasos: [paso('uno'), paso('dos'), paso('tres')] });
    vi.advanceTimersByTime(2_000);
    expect(trabajadores[0].terminado).toBe(true);
    expect(traza.total).toBe(3);
    expect(traza.estadoEn(2).map((p) => p.salida?.[0]?.texto)).toEqual(['uno\n', 'dos\n']);
  });

  it('cada mensaje del trabajador reinicia el plazo: un programa que sigue mandando pasos nunca se termina', () => {
    const { cliente, trabajadores, mensajes } = escenario();
    cliente.ejecutar(1, 'x', configPorOmision());
    for (let lote = 0; lote < 20; lote += 1) {
      vi.advanceTimersByTime(1_500);
      trabajadores[0].responder({ tipo: 'pasos', id: 1, desde: lote, pasos: [paso('x')] });
    }
    expect(trabajadores[0].terminado).toBe(false);
    expect(mensajes.every((m) => m.tipo === 'pasos')).toBe(true);
    vi.advanceTimersByTime(2_000);
    expect(trabajadores[0].terminado).toBe(true);
  });

  it('no vigila mientras el programa espera una línea del alumno (puede tardar lo que sea); al llegar la línea vuelve a vigilar', () => {
    const { cliente, trabajadores, mensajes } = escenario();
    cliente.ejecutar(1, 'x', configPorOmision());
    trabajadores[0].responder({ tipo: 'espera-entrada', id: 1, nodo: 0 });
    vi.advanceTimersByTime(10 * 60_000);
    expect(trabajadores[0].terminado).toBe(false);
    cliente.darEntrada(1, '5\n');
    vi.advanceTimersByTime(2_000);
    expect(trabajadores[0].terminado).toBe(true);
    expect(mensajes[mensajes.length - 1]).toEqual({ tipo: 'fin', id: 1, fin: { causa: 'limite-tiempo' } });
  });

  it('`cerrar-entrada` también vuelve a vigilar', () => {
    const { cliente, trabajadores } = escenario();
    cliente.ejecutar(1, 'x', configPorOmision());
    trabajadores[0].responder({ tipo: 'espera-entrada', id: 1, nodo: 0 });
    cliente.cerrarEntrada(1);
    vi.advanceTimersByTime(2_000);
    expect(trabajadores[0].terminado).toBe(true);
  });

  it('no vigila lo que ya terminó: `fin`, `error-interno` o un problema de compilación', () => {
    const problema = { categoria: 'error-compilacion', codigo: 'falta-punto-y-coma', rango: { inicio: 0, fin: 1 }, linea: 1, datos: {} } as never;
    const finales: MensajeTrabajadorAUi[] = [
      { tipo: 'fin', id: 1, fin: { causa: 'terminado' } },
      { tipo: 'error-interno', id: 1, mensaje: 'x' },
      { tipo: 'compilado', id: 1, ok: false, problema, adicionales: 0 },
    ];
    for (const final of finales) {
      const { cliente, trabajadores, mensajes } = escenario();
      cliente.ejecutar(1, 'x', configPorOmision());
      trabajadores[0].responder(final);
      vi.advanceTimersByTime(60_000);
      expect(trabajadores[0].terminado, final.tipo).toBe(false);
      expect(mensajes, final.tipo).toEqual([final]);
    }
  });
});

describe('detener: 300 ms para el acuse', () => {
  it('si el trabajador acusa `detenido` a tiempo, no se termina, y el acuse llega a la página', () => {
    const { cliente, trabajadores, mensajes } = escenario();
    cliente.ejecutar(1, 'x', configPorOmision());
    cliente.detener(1);
    vi.advanceTimersByTime(200);
    trabajadores[0].responder({ tipo: 'detenido', id: 1 });
    vi.advanceTimersByTime(10_000);
    expect(trabajadores[0].terminado).toBe(false);
    expect(mensajes).toEqual([{ tipo: 'detenido', id: 1 }]);
  });

  it('si no responde en 300 ms, se termina al trabajador, se deja uno de repuesto y la página recibe igual el `detenido`', () => {
    const { cliente, trabajadores, mensajes } = escenario();
    cliente.ejecutar(1, 'while (true) {}', configPorOmision());
    cliente.detener(1);
    vi.advanceTimersByTime(299);
    expect(trabajadores[0].terminado).toBe(false);
    vi.advanceTimersByTime(1);
    expect(trabajadores[0].terminado).toBe(true);
    expect(mensajes).toEqual([{ tipo: 'detenido', id: 1 }]);
    expect(trabajadores).toHaveLength(2);
    expect(trabajadores[1].terminado).toBe(false);
  });

  it('mientras se espera el acuse el perro del silencio no avisa un `fin` encima del `detenido`', () => {
    const { cliente, trabajadores, mensajes } = escenario();
    cliente.ejecutar(1, 'x', configPorOmision());
    cliente.detener(1);
    vi.advanceTimersByTime(300);
    expect(mensajes).toEqual([{ tipo: 'detenido', id: 1 }]);
    vi.advanceTimersByTime(60_000);
    expect(mensajes).toEqual([{ tipo: 'detenido', id: 1 }]);
    expect(trabajadores[0].terminado).toBe(true);
  });

  it('detener() de una ejecución que no es la activa no hace nada', () => {
    const { cliente, trabajadores } = escenario();
    cliente.ejecutar(2, 'x', configPorOmision());
    cliente.detener(1);
    expect(trabajadores[0].recibidos.map((m) => m.tipo)).toEqual(['ejecutar']);
  });
});

describe('un trabajador que se cae solo', () => {
  it('si el trabajador activo dispara un error (el script no cargó, una excepción sin atrapar), la página recibe `error-interno` y no tiene que esperar los 2 s del perro guardián', () => {
    const { cliente, trabajadores, mensajes } = escenario();
    cliente.ejecutar(1, 'x', configPorOmision());
    trabajadores[0].onerror?.({ message: 'no se pudo cargar el trabajador' });
    expect(mensajes).toEqual([{ tipo: 'error-interno', id: 1, mensaje: 'no se pudo cargar el trabajador' }]);
    expect(trabajadores[0].terminado).toBe(true);
    vi.advanceTimersByTime(60_000);
    expect(mensajes).toHaveLength(1);
  });

  it('un error de un trabajador que ya no es el activo se ignora', () => {
    const { cliente, trabajadores, mensajes } = escenario();
    cliente.ejecutar(1, 'x', configPorOmision());
    trabajadores[0].responder({ tipo: 'compilado', id: 1, ok: true, vista: VISTA_VACIA });
    cliente.ejecutar(2, 'y', configPorOmision());
    mensajes.length = 0;
    trabajadores[0].onerror?.({ message: 'tarde' });
    expect(mensajes).toEqual([]);
  });
});

describe('terminar() y fallos al arrancar', () => {
  it('terminar() termina al activo y al de repuesto, cancela los plazos y nada más llega a la página', () => {
    const { cliente, trabajadores, mensajes } = escenario();
    cliente.ejecutar(1, 'x', configPorOmision());
    trabajadores[0].responder({ tipo: 'compilado', id: 1, ok: true, vista: VISTA_VACIA });
    cliente.detener(1);
    cliente.terminar();
    mensajes.length = 0;
    expect(trabajadores.every((t) => t.terminado)).toBe(true);
    vi.advanceTimersByTime(60_000);
    expect(mensajes).toEqual([]);
    cliente.terminar(); // idempotente
  });

  it('si no se puede crear un trabajador, la página recibe un `error-interno` con el id (y no se cae)', () => {
    const mensajes: MensajeTrabajadorAUi[] = [];
    let intentos = 0;
    const cliente = crearClienteTrabajador(
      { onMensaje: (m) => mensajes.push(m) },
      {
        fabricaDeTrabajadores: () => {
          intentos += 1;
          if (intentos > 1) throw new Error('el navegador no deja crear trabajadores');
          return new TrabajadorFalso();
        },
      },
    );
    cliente.ejecutar(1, 'x', configPorOmision());
    cliente.terminar();
    cliente.ejecutar(2, 'x', configPorOmision());
    expect(mensajes).toHaveLength(1);
    expect(mensajes[0]).toMatchObject({ tipo: 'error-interno', id: 2, mensaje: expect.stringContaining('no deja crear trabajadores') });
  });
});
