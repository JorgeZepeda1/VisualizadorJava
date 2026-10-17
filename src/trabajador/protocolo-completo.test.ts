// RED de la tarea 3.5 (ADR 007, design.md §5): el protocolo del trabajador COMPLETO. El trabajador corre `avanzar` en rebanadas de ≤ 8 ms y entre una y otra CEDE el turno (MessageChannel) para poder
// atender `detener`, `entrada` y `cerrar-entrada` aunque la ejecución esté a medias; manda los pasos en lotes de ≤ 2 000; `detener` se acusa con `detenido` (para el perro guardián del cliente, 3.6);
// un fallo del motor DURANTE la ejecución es `error-interno`; y todo lo que viaja sobrevive a la clonación estructurada (BigInt, -0, NaN). Las pruebas usan un entorno manual (reloj y turnos de
// mentira) para ver cada rebanada, y una más con el MessageChannel de verdad.
import { describe, expect, it, vi } from 'vitest';
import * as motor from '../motor/index.ts';
import type { ConfigEjecucion, Paso } from '../motor/index.ts';
import type { MensajeTrabajadorAUi, MensajeUiATrabajador } from './protocolo.ts';
import { crearCederConMessageChannel, ENTORNO_EN_PROCESO, manejarMensaje, PASOS_POR_LOTE, type EntornoDelTrabajador } from './trabajador.ts';

// `crearEjecucion` se envuelve para poder INYECTAR un fallo (por omisión llama al real).
vi.mock('../motor/index.ts', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../motor/index.ts')>();
  return { ...original, crearEjecucion: vi.fn(original.crearEjecucion) };
});

function configPorOmision(): ConfigEjecucion {
  return { regional: 'es-MX', semilla: 0n, entradaPreparada: '', entradaInteractiva: false, limitePasos: 100_000, limiteCaracteres: 1_048_576 };
}

const CICLO_LARGO = [
  'public class Largo {',
  '  public static void main(String[] args) {',
  '    int suma = 0;',
  '    for (int i = 0; i < 30000; i++) {',
  '      suma += i;',
  '    }',
  '  }',
  '}',
  '',
].join('\n');
const PASOS_DEL_CICLO_LARGO = 90_003; // `int suma`, el `int i = 0` del for, 30 001 revisiones de la condición, 30 000 cuerpos y 30 000 actualizaciones

const LEE_DOS_ENTEROS = [
  'import java.util.Scanner;',
  'public class Lee {',
  '  public static void main(String[] args) {',
  '    Scanner sc = new Scanner(System.in);',
  '    int a = sc.nextInt();',
  '    int b = sc.nextInt();',
  '    System.out.println(a + b);',
  '  }',
  '}',
  '',
].join('\n');

const PROGRAMA_CHICO = 'class C { public static void main(String[] a) { int x = 1; } }';

function ejecutarMsg(id: number, fuente: string, config: Partial<ConfigEjecucion> = {}): MensajeUiATrabajador {
  return { tipo: 'ejecutar', id, fuente, config: { ...configPorOmision(), ...config } };
}

/** Un entorno donde cada lectura del reloj avanza `msPorLectura` y los turnos que se ceden quedan en una cola que la prueba atiende cuando quiere. */
function entornoManual(msPorLectura = 1): { entorno: EntornoDelTrabajador; turnos: Array<() => void>; atenderTodos: () => void } {
  const turnos: Array<() => void> = [];
  let ahora = 0;
  return {
    entorno: {
      ceder: (continuar) => {
        turnos.push(continuar);
      },
      reloj: () => {
        ahora += msPorLectura;
        return ahora;
      },
    },
    turnos,
    atenderTodos: () => {
      while (turnos.length > 0) turnos.shift()?.();
    },
  };
}

function pasosDe(mensajes: readonly MensajeTrabajadorAUi[]): Paso[] {
  return mensajes.flatMap((m) => (m.tipo === 'pasos' ? [...m.pasos] : []));
}

function ultimo(mensajes: readonly MensajeTrabajadorAUi[]): MensajeTrabajadorAUi {
  return mensajes[mensajes.length - 1];
}

describe('pasos en lotes', () => {
  it('los lotes traen a lo más 2 000 pasos, `desde` es el índice del primero (consecutivos, sin huecos) y todo junto es la traza completa', () => {
    const emitidos: MensajeTrabajadorAUi[] = [];
    manejarMensaje(ejecutarMsg(1, CICLO_LARGO), (m) => emitidos.push(m), ENTORNO_EN_PROCESO);
    const lotes = emitidos.filter((m) => m.tipo === 'pasos');
    expect(lotes.length).toBeGreaterThan(40);
    let esperado = 0;
    for (const lote of lotes) {
      expect(lote.pasos.length).toBeGreaterThan(0);
      expect(lote.pasos.length).toBeLessThanOrEqual(PASOS_POR_LOTE);
      expect(lote.desde).toBe(esperado);
      esperado += lote.pasos.length;
    }
    expect(esperado).toBe(PASOS_DEL_CICLO_LARGO);
    expect(ultimo(emitidos)).toEqual({ tipo: 'fin', id: 1, fin: { causa: 'terminado' } });
  });

  it('el transporte en proceso (sin turnos que ceder) corre todo de corrido dentro de la misma llamada: nada queda pendiente', () => {
    const emitidos: MensajeTrabajadorAUi[] = [];
    manejarMensaje(ejecutarMsg(1, CICLO_LARGO), (m) => emitidos.push(m));
    expect(ultimo(emitidos).tipo).toBe('fin');
  });
});

describe('rebanadas de ≤ 8 ms que ceden el turno', () => {
  it('con el reloj corriendo, una ejecución larga NO termina en la llamada: cede turnos entre rebanadas, y al atenderlos todos llega el `fin` con la traza completa', () => {
    const emitidos: MensajeTrabajadorAUi[] = [];
    const { entorno, turnos, atenderTodos } = entornoManual(1);
    manejarMensaje(ejecutarMsg(1, CICLO_LARGO), (m) => emitidos.push(m), entorno);
    expect(emitidos.map((m) => m.tipo)).not.toContain('fin');
    expect(turnos).toHaveLength(1); // un solo turno pendiente a la vez: la continuación de esta ejecución
    expect(pasosDe(emitidos).length).toBeGreaterThan(0);
    atenderTodos();
    expect(ultimo(emitidos)).toEqual({ tipo: 'fin', id: 1, fin: { causa: 'terminado' } });
    expect(pasosDe(emitidos)).toHaveLength(PASOS_DEL_CICLO_LARGO);
  });

  it('cada rebanada gasta a lo más ≈ 8 ms: con un reloj de 1 ms por lectura, el tiempo entre un turno y el siguiente no pasa de 8 ms más las lecturas del propio director', () => {
    let ahora = 0;
    const inicios: number[] = [];
    const entorno: EntornoDelTrabajador = {
      ceder: (continuar) => {
        inicios.push(ahora);
        continuar();
      },
      reloj: () => {
        ahora += 1;
        return ahora;
      },
    };
    manejarMensaje(ejecutarMsg(1, CICLO_LARGO), () => undefined, entorno);
    const duraciones = inicios.slice(1).map((inicio, indice) => inicio - inicios[indice]);
    expect(duraciones.length).toBeGreaterThan(5);
    for (const duracion of duraciones) expect(duracion).toBeLessThanOrEqual(8 + 8);
  });

  it('partir en rebanadas no cambia la traza: los pasos son EXACTAMENTE los de correr el programa de una vez', () => {
    const rebanadas: MensajeTrabajadorAUi[] = [];
    const { entorno, atenderTodos } = entornoManual(1);
    manejarMensaje(ejecutarMsg(1, CICLO_LARGO), (m) => rebanadas.push(m), entorno);
    atenderTodos();
    const deCorrido: MensajeTrabajadorAUi[] = [];
    manejarMensaje(ejecutarMsg(1, CICLO_LARGO), (m) => deCorrido.push(m));
    expect(pasosDe(rebanadas)).toEqual(pasosDe(deCorrido));
  });

  it('`detener` entre dos rebanadas la corta: acusa `detenido`, la rebanada pendiente no emite nada más y no hay `fin`', () => {
    const emitidos: MensajeTrabajadorAUi[] = [];
    const { entorno, turnos, atenderTodos } = entornoManual(1);
    manejarMensaje(ejecutarMsg(1, CICLO_LARGO), (m) => emitidos.push(m), entorno);
    const antes = pasosDe(emitidos).length;
    manejarMensaje({ tipo: 'detener', id: 1 }, (m) => emitidos.push(m), entorno);
    expect(ultimo(emitidos)).toEqual({ tipo: 'detenido', id: 1 });
    atenderTodos();
    expect(turnos).toHaveLength(0);
    expect(pasosDe(emitidos)).toHaveLength(antes);
    expect(emitidos.map((m) => m.tipo)).not.toContain('fin');
  });

  it('detener una ejecución no afecta a otra con distinto id', () => {
    const emitidos: MensajeTrabajadorAUi[] = [];
    const { entorno, atenderTodos } = entornoManual(1);
    manejarMensaje(ejecutarMsg(1, CICLO_LARGO), (m) => emitidos.push(m), entorno);
    manejarMensaje(ejecutarMsg(2, CICLO_LARGO), (m) => emitidos.push(m), entorno);
    manejarMensaje({ tipo: 'detener', id: 1 }, (m) => emitidos.push(m), entorno);
    atenderTodos();
    expect(emitidos.filter((m) => m.tipo === 'fin').map((m) => m.id)).toEqual([2]);
  });

  it('volver a mandar `ejecutar` con el mismo id reemplaza la ejecución anterior: la vieja ya no emite', () => {
    const emitidos: MensajeTrabajadorAUi[] = [];
    const { entorno, atenderTodos } = entornoManual(1);
    manejarMensaje(ejecutarMsg(1, CICLO_LARGO), (m) => emitidos.push(m), entorno);
    manejarMensaje(ejecutarMsg(1, 'class C { public static void main(String[] a) { System.out.println("nueva"); } }'), (m) => emitidos.push(m), entorno);
    atenderTodos();
    expect(emitidos.filter((m) => m.tipo === 'fin')).toHaveLength(1);
    expect(pasosDe(emitidos).some((paso) => paso.salida?.[0]?.texto === 'nueva\n')).toBe(true);
  });
});

describe('límites dentro del trabajador (3.5 con 3.4)', () => {
  it('un `while (true) {}` sin salida se detiene solo por el límite de pasos, cediendo turnos (la página nunca espera), con el diagnóstico del ciclo en el `fin`', () => {
    const emitidos: MensajeTrabajadorAUi[] = [];
    const { entorno, atenderTodos, turnos } = entornoManual(1);
    manejarMensaje(ejecutarMsg(1, 'public class P { public static void main(String[] a) { while (true) { } } }'), (m) => emitidos.push(m), entorno);
    expect(turnos).toHaveLength(1); // cedió: no se quedó girando dentro de la llamada
    atenderTodos();
    const fin = ultimo(emitidos);
    if (fin.tipo !== 'fin') throw new Error('se esperaba fin');
    expect(fin.fin).toEqual({ causa: 'limite-pasos', diagnostico: { ciclo: 'while', linea: 1, condicion: 'true', vueltas: 100, sinCambio: [] } });
    expect(pasosDe(emitidos)).toHaveLength(100_001);
  });

  it('el límite de tiempo sale del reloj del trabajador: pasado `limiteTiempoMs`, `fin` con causa limite-tiempo', () => {
    const emitidos: MensajeTrabajadorAUi[] = [];
    const { entorno, atenderTodos } = entornoManual(100);
    manejarMensaje(ejecutarMsg(1, 'public class P { public static void main(String[] a) { int n = 0; while (n >= 0) { } } }', { limiteTiempoMs: 5_000 }), (m) => emitidos.push(m), entorno);
    atenderTodos();
    const fin = ultimo(emitidos);
    if (fin.tipo !== 'fin') throw new Error('se esperaba fin');
    expect(fin.fin.causa).toBe('limite-tiempo');
    expect(fin.fin.diagnostico).toMatchObject({ ciclo: 'while', condicion: 'n >= 0', sinCambio: [{ nombre: 'n', valor: '0' }] });
  });
});

describe('entrada interactiva (REQ-EJEC-009)', () => {
  const interactiva = { entradaInteractiva: true };

  it('espera-entrada con el nodo de la lectura pendiente; `entrada` la reanuda; `desde` CONTINÚA donde iba (antes se reiniciaba en 0)', () => {
    const emitidos: MensajeTrabajadorAUi[] = [];
    const emitir = (m: MensajeTrabajadorAUi): void => {
      emitidos.push(m);
    };
    manejarMensaje(ejecutarMsg(7, LEE_DOS_ENTEROS, interactiva), emitir);
    expect(emitidos.map((m) => m.tipo)).toEqual(['compilado', 'pasos', 'espera-entrada']);
    expect(emitidos[2]).toMatchObject({ tipo: 'espera-entrada', id: 7, nodo: expect.any(Number) });
    expect(pasosDe(emitidos)).toHaveLength(1);

    manejarMensaje({ tipo: 'entrada', id: 7, renglon: '3\n' }, emitir);
    manejarMensaje({ tipo: 'entrada', id: 7, renglon: '4\n' }, emitir);
    expect(emitidos.map((m) => m.tipo)).toEqual(['compilado', 'pasos', 'espera-entrada', 'pasos', 'espera-entrada', 'pasos', 'fin']);
    expect(emitidos.filter((m) => m.tipo === 'pasos').map((lote) => lote.desde)).toEqual([0, 1, 2]);
    expect(
      pasosDe(emitidos)
        .flatMap((p) => p.salida ?? [])
        .filter((s) => s.flujo === 'out')
        .map((s) => s.texto),
    ).toEqual(['7\n']);
    expect(ultimo(emitidos)).toEqual({ tipo: 'fin', id: 7, fin: { causa: 'terminado' } });
  });

  it('`cerrar-entrada` con el programa esperando lo reanuda: la lectura llega al fin de la entrada y Java lanza NoSuchElementException', () => {
    const emitidos: MensajeTrabajadorAUi[] = [];
    const emitir = (m: MensajeTrabajadorAUi): void => {
      emitidos.push(m);
    };
    manejarMensaje(ejecutarMsg(1, LEE_DOS_ENTEROS, interactiva), emitir);
    manejarMensaje({ tipo: 'cerrar-entrada', id: 1 }, emitir);
    const fin = ultimo(emitidos);
    if (fin.tipo !== 'fin') throw new Error('se esperaba fin');
    expect(fin.fin).toEqual({ causa: 'excepcion' });
    expect(
      pasosDe(emitidos)
        .flatMap((p) => p.salida ?? [])
        .map((s) => s.texto)
        .join(''),
    ).toContain('java.util.NoSuchElementException');
  });

  it('una `entrada` que llega con la ejecución a medias (entre rebanadas) se encola: no arranca una segunda ejecución encima y la traza es la misma que con la entrada preparada', () => {
    const fuente = [
      'import java.util.Scanner;',
      'public class Mixto {',
      '  public static void main(String[] args) {',
      '    Scanner sc = new Scanner(System.in);',
      '    int a = sc.nextInt();',
      '    for (int i = 0; i < 20000; i++) {',
      '      a += 1;',
      '    }',
      '    int b = sc.nextInt();',
      '    System.out.println(a + b);',
      '  }',
      '}',
      '',
    ].join('\n');
    const emitidos: MensajeTrabajadorAUi[] = [];
    const emitir = (m: MensajeTrabajadorAUi): void => {
      emitidos.push(m);
    };
    const { entorno, turnos, atenderTodos } = entornoManual(1);
    manejarMensaje(ejecutarMsg(1, fuente, interactiva), emitir, entorno);
    manejarMensaje({ tipo: 'entrada', id: 1, renglon: '5\n' }, emitir, entorno);
    expect(turnos).toHaveLength(1); // corriendo la parte larga
    manejarMensaje({ tipo: 'entrada', id: 1, renglon: '6\n' }, emitir, entorno); // llega a media ejecución: se encola
    expect(turnos).toHaveLength(1);
    atenderTodos();
    expect(emitidos.filter((m) => m.tipo === 'fin')).toHaveLength(1);

    const preparada: MensajeTrabajadorAUi[] = [];
    manejarMensaje(ejecutarMsg(1, fuente, { entradaPreparada: '5\n6\n' }), (m) => preparada.push(m));
    expect(pasosDe(emitidos)).toEqual(pasosDe(preparada));
  });
});

describe('fallos internos DURANTE la ejecución', () => {
  it('si crearEjecucion falla, el trabajador responde `error-interno` con el id y sigue sirviendo', () => {
    vi.mocked(motor.crearEjecucion).mockImplementationOnce(() => {
      throw new RangeError('Maximum call stack size exceeded');
    });
    const emitidos: MensajeTrabajadorAUi[] = [];
    manejarMensaje(ejecutarMsg(3, PROGRAMA_CHICO), (m) => emitidos.push(m));
    expect(emitidos.map((m) => m.tipo)).toEqual(['compilado', 'error-interno']);
    expect(emitidos[1]).toMatchObject({ tipo: 'error-interno', id: 3 });
    manejarMensaje(ejecutarMsg(4, PROGRAMA_CHICO), (m) => emitidos.push(m));
    expect(ultimo(emitidos)).toEqual({ tipo: 'fin', id: 4, fin: { causa: 'terminado' } });
  });

  it('si avanzar() lanza algo que el director no atrapó, también es `error-interno` y la ejecución se descarta (no queda una continuación pendiente)', () => {
    vi.mocked(motor.crearEjecucion).mockImplementationOnce(() => ({
      avanzar: () => {
        throw new TypeError('algo se rompió');
      },
      darEntrada: () => undefined,
      cerrarEntrada: () => undefined,
    }));
    const emitidos: MensajeTrabajadorAUi[] = [];
    const { entorno, turnos } = entornoManual(1);
    manejarMensaje(ejecutarMsg(5, PROGRAMA_CHICO), (m) => emitidos.push(m), entorno);
    expect(emitidos.map((m) => m.tipo)).toEqual(['compilado', 'error-interno']);
    expect(emitidos[1]).toMatchObject({ id: 5, mensaje: expect.stringContaining('algo se rompió') });
    expect(turnos).toHaveLength(0);
  });
});

describe('clonación estructurada (ADR 007 punto 5)', () => {
  it('los mensajes sobreviven a structuredClone conservando BigInt, -0 y NaN (nada de lo que se manda es una función o una instancia de clase)', () => {
    const fuente = [
      'public class Raros {',
      '  public static void main(String[] args) {',
      '    long grande = 9007199254740993L;',
      '    double cero = -0.0;',
      '    double nada = 0.0 / 0.0;',
      '  }',
      '}',
      '',
    ].join('\n');
    const clonados: MensajeTrabajadorAUi[] = [];
    manejarMensaje(ejecutarMsg(1, fuente), (m) => clonados.push(structuredClone(m)));
    expect(clonados.map((m) => m.tipo)).toEqual(['compilado', 'pasos', 'fin']);
    const pasos = pasosDe(clonados);
    const nuevo = (indice: number): unknown => pasos[indice].cambios?.[0]?.nuevo;
    expect(nuevo(0)).toBe(9007199254740993n);
    expect(Object.is(nuevo(1), -0)).toBe(true);
    expect(Number.isNaN(nuevo(2))).toBe(true);
    const compilado = clonados[0];
    if (compilado.tipo !== 'compilado' || !compilado.ok) throw new Error('se esperaba compilado ok');
    expect(compilado.vista.ramasDeIf).toEqual([]);
  });

  it('el `config` con una semilla BigInt viaja en el mensaje `ejecutar` sin perderse', () => {
    const mensaje = structuredClone(ejecutarMsg(1, 'x', { semilla: 12345678901234567890n }));
    expect(mensaje.tipo === 'ejecutar' && mensaje.config.semilla).toBe(12345678901234567890n);
  });

  it('el diagnóstico del ciclo y las ramas de los if son datos simples: viajan en `fin` y en `compilado` sin perder nada', () => {
    const emitidos: MensajeTrabajadorAUi[] = [];
    const { entorno, atenderTodos } = entornoManual(1);
    manejarMensaje(ejecutarMsg(1, 'public class P { public static void main(String[] a) { int n = 3; if (n > 1) { } while (n > 0) { } } }'), (m) => emitidos.push(structuredClone(m)), entorno);
    atenderTodos();
    const compilado = emitidos[0];
    if (compilado.tipo !== 'compilado' || !compilado.ok) throw new Error('se esperaba compilado ok');
    expect(compilado.vista.ramasDeIf).toHaveLength(1);
    const fin = ultimo(emitidos);
    if (fin.tipo !== 'fin') throw new Error('se esperaba fin');
    expect(fin.fin.diagnostico?.sinCambio).toEqual([{ nombre: 'n', valor: '3' }]);
  });
});

describe('ceder el turno con MessageChannel', () => {
  it('la continuación corre DESPUÉS de la llamada actual (asíncrona), no dentro de ella', async () => {
    const turnos = crearCederConMessageChannel();
    try {
      const orden: string[] = [];
      turnos.ceder(() => orden.push('continuación'));
      orden.push('síncrono');
      await new Promise((resolver) => setTimeout(resolver, 20));
      expect(orden).toEqual(['síncrono', 'continuación']);
    } finally {
      turnos.cerrar();
    }
  });

  it('una ejecución larga con el entorno real (reloj y MessageChannel) llega al `fin` por turnos y con la traza completa', async () => {
    const turnos = crearCederConMessageChannel();
    try {
      const emitidos: MensajeTrabajadorAUi[] = [];
      let terminada: () => void = () => undefined;
      const fin = new Promise<void>((resolver) => {
        terminada = resolver;
      });
      manejarMensaje(
        ejecutarMsg(1, CICLO_LARGO),
        (m) => {
          emitidos.push(m);
          if (m.tipo === 'fin') terminada();
        },
        { ceder: turnos.ceder, reloj: Date.now },
      );
      await fin;
      expect(pasosDe(emitidos)).toHaveLength(PASOS_DEL_CICLO_LARGO);
    } finally {
      turnos.cerrar();
    }
  });
});
