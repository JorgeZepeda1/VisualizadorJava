// RED de la tarea 0.13: `cliente.ts` es lo único de `trabajador/` que `interfaz` puede importar
// junto con `protocolo.ts` (matriz de capas). Bajo Vitest (Node/jsdom, sin `Worker` real) usa el
// transporte en proceso — mismo motor real, sin mocks de negocio — que se ejercita aquí.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearClienteTrabajador, registrarTransporteEnProceso } from './cliente.ts';
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

describe('crearClienteTrabajador sin Worker y SIN transporte en proceso registrado (hito 2C)', () => {
  // El motor NUNCA corre en el hilo principal (CLAUDE.md): el respaldo en proceso existe solo si alguien lo registra (las pruebas de la interfaz bajo jsdom). `cliente.ts` ya no importa
  // `trabajador.ts`, así que el motor completo no viaja en el paquete principal de la página.
  it('ejecutar() no ejecuta nada: avisa un error interno con el id de la ejecución', () => {
    const mensajes: MensajeTrabajadorAUi[] = [];
    const cliente = crearClienteTrabajador({ onMensaje: (m) => mensajes.push(m) });

    cliente.ejecutar(7, 'class C { public static void main(String[] a) { System.out.println("hola"); } }', configPorOmision());

    expect(mensajes).toHaveLength(1);
    expect(mensajes[0]).toMatchObject({ tipo: 'error-interno', id: 7 });
  });

  it('entrada, cerrar entrada y terminar no hacen nada (no hay ejecución a la que llegar)', () => {
    const mensajes: MensajeTrabajadorAUi[] = [];
    const cliente = crearClienteTrabajador({ onMensaje: (m) => mensajes.push(m) });

    cliente.darEntrada(7, '5\n');
    cliente.cerrarEntrada(7);
    cliente.terminar();

    expect(mensajes).toEqual([]);
  });

  it('detener() cumple igual con el protocolo: recibe su acuse `detenido`, aunque no hubiera nada que detener', () => {
    const mensajes: MensajeTrabajadorAUi[] = [];
    const cliente = crearClienteTrabajador({ onMensaje: (m) => mensajes.push(m) });

    cliente.detener(7);

    expect(mensajes).toEqual([{ tipo: 'detenido', id: 7 }]);
  });
});

describe('crearClienteTrabajador (transporte en proceso — sin Worker real bajo Vitest)', () => {
  beforeAll(() => registrarTransporteEnProceso(manejarMensaje));
  afterAll(() => registrarTransporteEnProceso(null));

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
