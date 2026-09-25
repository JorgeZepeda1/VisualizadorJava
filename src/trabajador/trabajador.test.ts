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

  it('"detener" no emite ningún mensaje (silencioso, ADR 007)', () => {
    const emitidos: MensajeTrabajadorAUi[] = [];
    manejarMensaje({ tipo: 'detener', id: 1 }, (m) => emitidos.push(m));
    expect(emitidos).toEqual([]);
  });
});
