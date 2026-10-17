// RED de la tarea 0.13 (rebanada vertical — traza y trabajador mínimos, design.md §3.4, ADR 006).
// `agregar`/`estadoEn` sin puntos de control (se completan en la tarea 3.1); `suscribir`/
// `obtenerVersion` habilitan useSyncExternalStore (ADR 013) desde el lote 0.
//
// Tarea 3.1 (design.md §3.4, ADR 006): punto de control cada 256 pasos; `instantaneaEn(n)` = el punto de control anterior a `n` + ≤ 255 deltas (nunca desde cero) y da EXACTAMENTE lo mismo
// que reproducir los pasos desde el principio (propiedad). `estadoEn(n)` sigue devolviendo los primeros `n` pasos.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compilar } from '../compilador.ts';
import { configuracion } from '../interprete/ayudas-de-prueba.ts';
import { crearEjecucion } from '../interprete/ejecucion.ts';
import type { VistaPrograma } from '../ir/vista-programa.ts';
import { aplicarPaso, instantaneaEn, type ValoresPorNombre } from './estado.ts';
import { Traza } from './traza.ts';
import type { Cambio, Paso, Segmento, Valor } from './paso.ts';

function paso(texto: string): Paso {
  return { clase: 'impresion', nodo: 0, linea: 1, explicacion: { clave: 'impresion', datos: { texto, flujo: 'out', saltoDeLinea: false } }, salida: [{ flujo: 'out', texto }] };
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

const NOMBRES = ['a', 'b', 'c', 'd'] as const;

function vistaSintetica(): VistaPrograma {
  return {
    fuente: '',
    ranuras: NOMBRES.map((nombre, indice) => ({ indice, nombre, tipo: 'int' as const, nodo: 0, esFinal: false })),
    nodos: [{ id: 0, clase: 'expresion', rango: { inicio: 0, fin: 0 }, linea: 1, vivas: [0, 1, 2, 3], plan: [] }],
  };
}

interface Operacion {
  readonly cambios: readonly { readonly ranura: (typeof NOMBRES)[number]; readonly nuevo: number | null }[];
  readonly salida: readonly Segmento[];
}

const operacionArbitraria: fc.Arbitrary<Operacion> = fc.record({
  cambios: fc.array(fc.record({ ranura: fc.constantFrom(...NOMBRES), nuevo: fc.option(fc.integer({ min: -5, max: 5 }), { nil: null }) }), { maxLength: 3 }),
  salida: fc.array(fc.record({ flujo: fc.constantFrom('out' as const, 'err' as const, 'eco' as const), texto: fc.constantFrom('x', 'y\n', 'z') }), { maxLength: 2 }),
});

const SIN_EFECTO: Operacion = { cambios: [], salida: [] };

/** Los pasos de unas operaciones: cada `Cambio` trae el `anterior` que de verdad tenía la variable (como lo hace el intérprete). */
function pasosDe(operaciones: readonly Operacion[]): Paso[] {
  const actuales = new Map<string, Valor | null>();
  return operaciones.map((operacion, indice) => {
    const cambios: Cambio[] = operacion.cambios.map(({ ranura, nuevo }) => {
      const anterior = actuales.get(ranura);
      actuales.set(ranura, nuevo);
      return { ranura, anterior: anterior ?? undefined, nuevo };
    });
    return {
      clase: 'asignacion' as const,
      nodo: 0,
      linea: 1 + (indice % 7),
      explicacion: { clave: 'vacia' as const, datos: {} },
      ...(cambios.length > 0 ? { cambios } : {}),
      ...(operacion.salida.length > 0 ? { salida: operacion.salida } : {}),
    };
  });
}

describe('Traza: puntos de control cada 256 pasos (tarea 3.1)', () => {
  it('hay un punto de control por cada 256 pasos completos, juntando varias llamadas a agregar()', () => {
    const traza = new Traza();
    expect(traza.puntosDeControl).toBe(0);
    traza.agregar(pasosDe(Array.from({ length: 255 }, () => SIN_EFECTO)));
    expect(traza.puntosDeControl).toBe(0);
    traza.agregar(pasosDe([SIN_EFECTO]));
    expect(traza.puntosDeControl).toBe(1);
    traza.agregar(pasosDe(Array.from({ length: 1000 }, () => SIN_EFECTO)));
    expect(traza.total).toBe(1256);
    expect(traza.puntosDeControl).toBe(4);
  });

  it('reiniciar() también borra los puntos de control y la instantánea vuelve a empezar de cero', () => {
    const traza = new Traza();
    const vista = vistaSintetica();
    traza.agregar(pasosDe(Array.from({ length: 600 }, () => ({ cambios: [{ ranura: 'a' as const, nuevo: 1 }], salida: [] }))));
    expect(traza.puntosDeControl).toBe(2);
    traza.reiniciar();
    expect(traza.puntosDeControl).toBe(0);
    expect(traza.instantaneaEn(10, vista)).toEqual({ paso: 0, linea: null, variables: [], salida: [] });
  });

  it('después de reiniciar(), nada de la ejecución anterior se cuela en la nueva: ni valores ni salida, ni en los puntos de control', () => {
    const traza = new Traza();
    const vista = vistaSintetica();
    traza.agregar(pasosDe(Array.from({ length: 600 }, () => ({ cambios: [{ ranura: 'a' as const, nuevo: 7 }], salida: [{ flujo: 'out' as const, texto: 'x' }] }))));
    traza.reiniciar();
    traza.agregar(pasosDe(Array.from({ length: 600 }, () => SIN_EFECTO)));
    for (const n of [1, 255, 256, 300, 512, 600]) {
      const instantanea = traza.instantaneaEn(n, vista);
      expect(instantanea.salida, `salida en ${n}`).toEqual([]);
      expect(instantanea.variables.every((variable) => variable.valor === null), `variables en ${n}`).toBe(true);
    }
  });

  it('una sola llamada a agregar() con 150 000 pasos no desborda la pila (el spread de un arreglo enorme sí lo hace)', () => {
    const traza = new Traza();
    traza.agregar(pasosDe(Array.from({ length: 150_000 }, () => SIN_EFECTO)));
    expect(traza.total).toBe(150_000);
    expect(traza.puntosDeControl).toBe(Math.floor(150_000 / 256));
  });

  it('PROPIEDAD: instantaneaEn(n) con puntos de control es idéntica a reproducir los pasos desde el principio, para cualquier n (incluidos los bordes 255/256/257)', () => {
    const vista = vistaSintetica();
    fc.assert(
      fc.property(fc.array(operacionArbitraria, { minLength: 0, maxLength: 1100 }), fc.array(fc.nat(), { maxLength: 12 }), (operaciones, azar) => {
        const pasos = pasosDe(operaciones);
        const traza = new Traza();
        // llega en lotes de tamaño irregular, como los manda el trabajador
        for (let inicio = 0; inicio < pasos.length; inicio += 300) traza.agregar(pasos.slice(inicio, inicio + 300));
        const total = pasos.length;
        const muestras = new Set([0, total, 255, 256, 257, 511, 512, 513, 768, ...azar.map((valor) => valor % (total + 1))]);
        for (const n of muestras) {
          if (n > total) continue;
          expect(traza.instantaneaEn(n, vista), `n=${n}`).toEqual(instantaneaEn(pasos, vista, n));
        }
      }),
      { numRuns: 25 },
    );
  });

  it('recorrer una traza paso a paso, hacia adelante y luego hacia atrás, da en cada paso lo mismo que reproducir desde el principio', () => {
    const vista = vistaSintetica();
    const pasos = pasosDe(fc.sample(operacionArbitraria, 700));
    const traza = new Traza();
    traza.agregar(pasos);
    for (let n = 0; n <= pasos.length; n += 1) expect(traza.instantaneaEn(n, vista), `adelante n=${n}`).toEqual(instantaneaEn(pasos, vista, n));
    for (let n = pasos.length; n >= 0; n -= 1) expect(traza.instantaneaEn(n, vista), `atrás n=${n}`).toEqual(instantaneaEn(pasos, vista, n));
  });

  it('con un programa de verdad de unos 100 000 pasos, cualquier salto da lo mismo que reproducir desde el principio, y saltar no recorre la traza desde cero', () => {
    const resultado = compilar(
      ['public class Ciclo {', '  public static void main(String[] args) {', '    int suma = 0;', '    for (int i = 0; i < 33000; i++) {', '      suma += i;', '    }', '    System.out.println(suma);', '  }', '}', ''].join('\n'),
    );
    if (!resultado.ok) throw new Error('no compiló');
    const avance = crearEjecucion(resultado.programa, configuracion()).avanzar(200_000);
    expect(avance.pasos.length).toBeGreaterThan(98_000);
    const traza = new Traza();
    traza.agregar(avance.pasos);
    for (const n of [0, 1, 255, 256, 257, 4_096, 50_001, 77_777, avance.pasos.length - 1, avance.pasos.length]) {
      expect(traza.instantaneaEn(n, resultado.vista), `n=${n}`).toEqual(instantaneaEn(avance.pasos, resultado.vista, n));
    }
    // 2 000 saltos: reproducir cada uno desde cero cuesta ≈ 2 000 × 100 000 pasos (más de 10 s); con puntos de control, ≤ 255 deltas por salto.
    const antes = Date.now();
    for (let salto = 0; salto < 2_000; salto += 1) traza.instantaneaEn((salto * 49_157) % avance.pasos.length, resultado.vista);
    expect(Date.now() - antes).toBeLessThan(2_000);
  });

  it('estadoEn(n) sigue devolviendo los primeros n pasos (la pantalla lo usa así)', () => {
    const pasos = pasosDe(Array.from({ length: 600 }, () => SIN_EFECTO));
    const traza = new Traza();
    traza.agregar(pasos);
    expect(traza.estadoEn(300)).toEqual(pasos.slice(0, 300));
    expect(traza.estadoEn(600)).toHaveLength(600);
  });
});

describe('ir a un paso anterior parte de un punto de control y avanza (tarea 3.1)', () => {
  it('aplicarPaso escribe el valor nuevo de cada cambio, en orden (dos cambios a la misma variable en un paso: queda el último)', () => {
    const valores: ValoresPorNombre = new Map<string, Valor | null>([['d', 1]]);
    const [paso] = pasosDe([{ cambios: [{ ranura: 'a', nuevo: 4 }, { ranura: 'a', nuevo: 3 }], salida: [] }]);
    aplicarPaso(valores, paso);
    expect(valores.get('a')).toBe(3);
    expect(valores.get('d')).toBe(1);
  });

  // HALLAZGO de la propiedad sobre el corpus (`pruebas/propiedades/traza-del-corpus.test.ts`): deshacer con `Cambio.anterior` NO es exacto. `anterior` es el valor de ESA variable, y
  // dos `for` seguidos con `int fila` son dos variables con el mismo nombre: la declaración del segundo trae `anterior` vacío, así que deshacerla borraría el `6` con el que terminó el primero.
  it('un nombre que reutiliza otra declaración (dos for seguidos con `int fila`) conserva el valor del primero al ir hacia atrás', () => {
    const resultado = compilar(
      ['public class Dos {', '  public static void main(String[] args) {', '    for (int fila = 1; fila <= 2; fila++) { }', '    for (int fila = 1; fila <= 2; fila++) { }', '  }', '}', ''].join('\n'),
    );
    if (!resultado.ok) throw new Error('no compiló');
    const avance = crearEjecucion(resultado.programa, configuracion()).avanzar(1_000);
    const traza = new Traza(3);
    traza.agregar(avance.pasos);
    expect(traza.puntosDeControl).toBeGreaterThan(2);
    for (let n = avance.pasos.length; n >= 0; n -= 1) expect(traza.instantaneaEn(n, resultado.vista), `n=${n}`).toEqual(instantaneaEn(avance.pasos, resultado.vista, n));
    // en el paso que revisa la condición del primer for por última vez, `fila` vale 3 aunque el segundo for ya haya declarado otra `fila` más adelante
    const alSalirDelPrimero = traza.instantaneaEn(avance.pasos.findIndex((paso) => paso.clase === 'declaracion' && paso.linea === 4), resultado.vista);
    expect(alSalirDelPrimero.variables).toEqual([{ nombre: 'fila', tipo: 'int', valor: 3 }]);
  });
});
