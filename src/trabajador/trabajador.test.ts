// RED de la tarea 0.13 (rebanada vertical — traza y trabajador mínimos, design.md §5). Prueba
// `manejarMensaje` directamente — la lógica real del trabajador — sin un Worker de verdad: Vitest
// corre en Node/jsdom y el cableado a self.onmessage (más abajo en trabajador.ts) solo se activa
// dentro de un worker real, nunca en estos entornos (ADR 007).
import { describe, expect, it } from 'vitest';
import { manejarMensaje } from './trabajador.ts';
import type { ConfigEjecucion } from '../motor/index.ts';
import type { MensajeTrabajadorAUi } from './protocolo.ts';

function configPorOmision(): ConfigEjecucion {
  return {
    regional: 'es-MX',
    semilla: 0n,
    entradaPreparada: '',
    entradaInteractiva: false,
    limitePasos: 100_000,
    limiteCaracteres: 1_048_576,
  };
}

describe('manejarMensaje', () => {
  it('ante {tipo:"ejecutar"} con el programa dorado, emite compilado→pasos→fin en orden', () => {
    const emitidos: MensajeTrabajadorAUi[] = [];
    const fuente = [
      'public class MiPrograma {',
      '  public static void main(String[] args) {',
      '    System.out.println("Hola, mundo");',
      '  }',
      '}',
    ].join('\n');

    manejarMensaje({ tipo: 'ejecutar', id: 1, fuente, config: configPorOmision() }, (m) =>
      emitidos.push(m),
    );

    expect(emitidos.map((m) => m.tipo)).toEqual(['compilado', 'pasos', 'fin']);
    const [compilado, pasos, fin] = emitidos;
    if (compilado.tipo !== 'compilado' || !compilado.ok) {
      throw new Error('se esperaba compilado ok:true');
    }
    if (pasos.tipo !== 'pasos') throw new Error('se esperaba pasos');
    if (fin.tipo !== 'fin') throw new Error('se esperaba fin');
    expect(pasos.pasos).toHaveLength(1);
    expect(pasos.pasos[0].salida?.[0]?.texto).toBe('Hola, mundo\n');
    expect(fin.fin).toEqual({ causa: 'terminado' });
  });

  it('todos los mensajes emitidos llevan el mismo id de la ejecución que los originó', () => {
    const emitidos: MensajeTrabajadorAUi[] = [];
    manejarMensaje(
      {
        tipo: 'ejecutar',
        id: 42,
        fuente: 'class C { public static void main(String[] a) { System.out.println("x"); } }',
        config: configPorOmision(),
      },
      (m) => emitidos.push(m),
    );
    expect(emitidos.every((m) => m.id === 42)).toBe(true);
  });

  it('ante un programa que no compila, emite solo compilado ok:false (sin pasos ni fin)', () => {
    const emitidos: MensajeTrabajadorAUi[] = [];
    manejarMensaje({ tipo: 'ejecutar', id: 2, fuente: '#$%', config: configPorOmision() }, (m) =>
      emitidos.push(m),
    );
    expect(emitidos).toHaveLength(1);
    expect(emitidos[0]).toMatchObject({ tipo: 'compilado', ok: false });
  });

  // Tarea 1.28 (agregada por el orquestador — hallazgo verificado de punta a punta): `compilar()`
  // ya NO disfraza un fallo del propio motor de error de sintaxis (solo `ErrorDeCompilacion`, el
  // error del alumno, se vuelve `Problema`); la excepción sale de `compilar()` y aquí, en el borde
  // del trabajador, se convierte en el mensaje de protocolo `error-interno` (design.md §5) que la
  // interfaz ya sabe mostrar («Algo falló dentro del visualizador.»). Antes el trabajador NUNCA lo
  // emitía. Entrada que fuerza el fallo sin simular nada: paréntesis anidados más allá de la pila
  // del analizador (mismo caso que `compilador.test.ts`; javac 17.0.18 real la rechaza con su propio
  // `StackOverflowError` -- entrada patológica, no un programa de alumno). Las excepciones DURANTE
  // la ejecución (`crearEjecucion`/`avanzarYEmitir`) quedan fuera: son del perro guardián (lote 3).
  describe('un fallo interno de compilar() (tarea 1.28)', () => {
    const NIVELES_QUE_AGOTAN_LA_PILA = 100_000;
    const anidada = `${'('.repeat(NIVELES_QUE_AGOTAN_LA_PILA)}1${')'.repeat(NIVELES_QUE_AGOTAN_LA_PILA)}`;
    const fuenteQueAgotaLaPila = `class C { public static void main(String[] a) { int x = ${anidada}; } }`;

    it('emite UN solo mensaje error-interno con el id de la ejecución, sin compilado, pasos ni fin', () => {
      const emitidos: MensajeTrabajadorAUi[] = [];
      manejarMensaje({ tipo: 'ejecutar', id: 7, fuente: fuenteQueAgotaLaPila, config: configPorOmision() }, (m) =>
        emitidos.push(m),
      );
      expect(emitidos).toHaveLength(1);
      expect(emitidos[0]).toMatchObject({ tipo: 'error-interno', id: 7 });
    });

    it('el mensaje de protocolo lleva el detalle del fallo como texto no vacío (para quien depure, nunca para el alumno)', () => {
      const emitidos: MensajeTrabajadorAUi[] = [];
      manejarMensaje({ tipo: 'ejecutar', id: 8, fuente: fuenteQueAgotaLaPila, config: configPorOmision() }, (m) =>
        emitidos.push(m),
      );
      const [interno] = emitidos;
      if (interno?.tipo !== 'error-interno') throw new Error('se esperaba error-interno');
      expect(interno.mensaje).toMatch(/\S/);
    });

    it('el trabajador sigue sirviendo: la siguiente ejecución con un programa normal emite compilado→pasos→fin', () => {
      const emitidos: MensajeTrabajadorAUi[] = [];
      manejarMensaje({ tipo: 'ejecutar', id: 1, fuente: fuenteQueAgotaLaPila, config: configPorOmision() }, (m) =>
        emitidos.push(m),
      );
      manejarMensaje(
        {
          tipo: 'ejecutar',
          id: 2,
          fuente: 'class C { public static void main(String[] a) { System.out.println("sigue vivo"); } }',
          config: configPorOmision(),
        },
        (m) => emitidos.push(m),
      );
      expect(emitidos.map((m) => `${m.tipo}#${m.id}`)).toEqual([
        'error-interno#1',
        'compilado#2',
        'pasos#2',
        'fin#2',
      ]);
    });

    it('contraste: un error del ALUMNO (falta el ";") sigue siendo compilado ok:false, nunca error-interno', () => {
      const emitidos: MensajeTrabajadorAUi[] = [];
      manejarMensaje(
        {
          tipo: 'ejecutar',
          id: 3,
          fuente: 'class C { public static void main(String[] a) { int x = 5 } }',
          config: configPorOmision(),
        },
        (m) => emitidos.push(m),
      );
      expect(emitidos).toHaveLength(1);
      expect(emitidos[0]).toMatchObject({ tipo: 'compilado', ok: false, problema: { codigo: 'falta-punto-y-coma' } });
    });
  });

  it('"detener" no emite ningún mensaje (silencioso, ADR 007)', () => {
    const emitidos: MensajeTrabajadorAUi[] = [];
    manejarMensaje({ tipo: 'detener', id: 1 }, (m) => emitidos.push(m));
    expect(emitidos).toEqual([]);
  });
});
