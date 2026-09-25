// RED de la tarea 0.13: `cliente.ts` es lo único de `trabajador/` que `interfaz` puede importar
// junto con `protocolo.ts` (matriz de capas). Bajo Vitest (Node/jsdom, sin `Worker` real) usa el
// transporte en proceso — mismo motor real, sin mocks de negocio — que se ejercita aquí.
import { describe, expect, it } from 'vitest';
import { crearClienteTrabajador } from './cliente.ts';
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

describe('crearClienteTrabajador (transporte en proceso — sin Worker real bajo Vitest)', () => {
  it('ejecutar() produce compilado→pasos→fin para el programa dorado', () => {
    const mensajes: MensajeTrabajadorAUi[] = [];
    const cliente = crearClienteTrabajador({ onMensaje: (m) => mensajes.push(m) });
    const fuente = 'class C { public static void main(String[] a) { System.out.println("hola"); } }';

    cliente.ejecutar(1, fuente, configPorOmision());

    expect(mensajes.map((m) => m.tipo)).toEqual(['compilado', 'pasos', 'fin']);
    const compilado = mensajes[0];
    if (compilado.tipo !== 'compilado' || !compilado.ok) {
      throw new Error('se esperaba compilado ok:true');
    }
    expect(compilado.vista.fuente).toBe(fuente);
  });

  it('propaga un error de compilación como compilado ok:false, sin pasos ni fin', () => {
    const mensajes: MensajeTrabajadorAUi[] = [];
    const cliente = crearClienteTrabajador({ onMensaje: (m) => mensajes.push(m) });

    cliente.ejecutar(2, '#$%', configPorOmision());

    expect(mensajes).toHaveLength(1);
    expect(mensajes[0]).toMatchObject({ tipo: 'compilado', ok: false });
  });

  it('distingue ejecuciones por id cuando ejecutar() se llama dos veces (triangulación)', () => {
    const mensajes: MensajeTrabajadorAUi[] = [];
    const cliente = crearClienteTrabajador({ onMensaje: (m) => mensajes.push(m) });

    cliente.ejecutar(
      10,
      'class A { public static void main(String[] a) { System.out.println("x"); } }',
      configPorOmision(),
    );
    cliente.ejecutar(
      11,
      'class B { public static void main(String[] a) { System.out.println("y"); } }',
      configPorOmision(),
    );

    const idsDeFin = mensajes.filter((m) => m.tipo === 'fin').map((m) => m.id);
    expect(idsDeFin).toEqual([10, 11]);
  });
});
