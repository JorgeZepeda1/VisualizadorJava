// RED de la tarea 3.4 (REQ-EJEC-007, design.md §3.5, ADR 007 punto 3): los límites completos del director. 100 000 pasos → `detenido`/`limite-pasos` CON el diagnóstico del ciclo (3.3);
// 1 048 576 caracteres por cadena o 4 194 304 en consola → `limite-caracteres`; 15 s de cómputo → `limite-tiempo`, cooperativo (el director mira el reloj cada tanto, nunca interrumpe
// una sentencia a medias); y una rebanada con presupuesto de tiempo (`avanzar(maxPasos, presupuestoMs)`) para que el trabajador ceda cada ≤ 8 ms (3.5). El reloj se INYECTA: ninguna de
// estas pruebas espera tiempo de verdad.
import { describe, expect, it } from 'vitest';
import { compilar } from '../compilador.ts';
import type { ProgramaCompilado } from '../ir/ir.ts';
import type { Paso } from '../traza/paso.ts';
import { configuracion, correr, correrPrograma, programaDe } from './ayudas-de-prueba.ts';
import { crearEjecucion } from './ejecucion.ts';
import { PUERTO_POR_OMISION } from './puerto-por-omision.ts';

function compilado(fuente: string): ProgramaCompilado {
  const resultado = compilar(fuente);
  if (!resultado.ok) throw new Error(`no compiló: ${JSON.stringify(resultado.problema)}`);
  return resultado.programa;
}

const CICLO_SIN_AVANCE = ['    int contador = 1;', '    while (contador <= 5) {', '      System.out.println("Vuelta " + contador);', '    }'].join('\n');

describe('límite de pasos con el diagnóstico del ciclo (3.4)', () => {
  it('el mismo diagnóstico llega al paso `detenido` (lo que dice el robot) y en `fin` (lo que dice el aviso)', () => {
    const corrida = correr(CICLO_SIN_AVANCE, { config: { limitePasos: 600 } });
    const detenido = corrida.pasos[corrida.pasos.length - 1];
    expect(corrida.fin).toMatchObject({ causa: 'limite-pasos', diagnostico: { sinCambio: [{ nombre: 'contador', valor: '1' }] } });
    expect(detenido.explicacion).toEqual({ clave: 'detenido', datos: { causa: 'limite-pasos', diagnostico: corrida.fin?.diagnostico } });
    expect(detenido.fin).toBe(corrida.fin);
    // con evidencia, el paso resalta la línea del ciclo (el `while` de la 4), no la del `println` que iba a ejecutarse (la 5)
    expect(detenido.linea).toBe(4);
  });

  it('da el mismo diagnóstico aunque la ejecución llegue al límite en tandas pequeñas (la ventana de pasos recientes vive entre llamadas a avanzar)', () => {
    const enUnaTanda = correr(CICLO_SIN_AVANCE, { config: { limitePasos: 3_000 } });
    const enTandas = correr(CICLO_SIN_AVANCE, { config: { limitePasos: 3_000 }, pasosPorAvance: 7 });
    expect(enTandas.fin).toEqual(enUnaTanda.fin);
    expect(enTandas.fin?.diagnostico?.sinCambio).toEqual([{ nombre: 'contador', valor: '1' }]);
  });

  it('la ventana de pasos recientes se recorta sin perder lo que el diagnóstico necesita: se detiene justo cuando la ventana llega al doble de su tamaño (32 768 pasos)', () => {
    const corrida = correr(CICLO_SIN_AVANCE, { config: { limitePasos: 32_768 } });
    expect(corrida.fin).toMatchObject({ causa: 'limite-pasos', diagnostico: { vueltas: 100, sinCambio: [{ nombre: 'contador', valor: '1' }] } });
  });

  it('sigue siendo exacto en el borde: un programa de exactamente `limitePasos` pasos termina; con uno menos de tope, se detiene', () => {
    const cuerpo = '    int a = 1;\n    int b = 2;\n    int c = 3;';
    expect(correr(cuerpo, { config: { limitePasos: 3 } }).fin).toEqual({ causa: 'terminado' });
    expect(correr(cuerpo, { config: { limitePasos: 2 } }).fin).toEqual({ causa: 'limite-pasos' });
  });

  it('un `for (;;)` sin nada que dé pasos se detiene por límite de pasos, sin diagnóstico (no hay condición que revisar)', () => {
    const corrida = correr('    for (;;) {\n    }', { config: { limitePasos: 50 } });
    expect(corrida.fin).toEqual({ causa: 'limite-pasos' });
    expect(corrida.fin).not.toHaveProperty('diagnostico');
  });

  it('el paso `detenido` no repite lo que ya salió en el paso anterior (una impresión antes de un `for (;;)` vacío no se escribe dos veces en la consola)', () => {
    const corrida = correr('    System.out.println("antes");\n    for (;;) {\n    }', { config: { limitePasos: 50 } });
    expect(corrida.fin).toEqual({ causa: 'limite-pasos' });
    expect(corrida.salida).toBe('antes\n');
    const detenido = corrida.pasos[corrida.pasos.length - 1];
    expect(detenido.clase).toBe('detenido');
    expect(detenido).not.toHaveProperty('salida');
    expect(detenido).not.toHaveProperty('cambios');
  });

  it('un ciclo cuyas variables sí cambian da el ciclo pero sin citar variables (`sinCambio` vacío)', () => {
    const corrida = correr('    int i = 0;\n    while (i >= 0) {\n      i++;\n    }', { config: { limitePasos: 600 } });
    expect(corrida.fin).toMatchObject({ causa: 'limite-pasos', diagnostico: { ciclo: 'while', linea: 4, condicion: 'i >= 0', sinCambio: [] } });
  });

  it('un programa que se pasa de pasos fuera de todo ciclo no trae diagnóstico', () => {
    const corrida = correr('    int a = 1;\n    int b = 2;\n    int c = 3;', { config: { limitePasos: 2 } });
    expect(corrida.fin).not.toHaveProperty('diagnostico');
  });
});

describe('límite de caracteres (3.4): 1 048 576 por cadena y 4 194 304 en la consola, EXACTOS', () => {
  /** Una cadena de 2^k caracteres, duplicándola k veces. */
  const cadenaDe = (k: number): string => `    String t = "x";\n    for (int i = 0; i < ${k}; i++) {\n      t += t;\n    }`;

  it('una cadena de exactamente 1 048 576 caracteres (2^20) se arma; con uno más duplicación (2 097 152), la ejecución se detiene por límite de caracteres', () => {
    expect(correr(cadenaDe(20)).fin).toEqual({ causa: 'terminado' });
    const pasada = correr(cadenaDe(21));
    expect(pasada.fin).toEqual({ causa: 'limite-caracteres' });
    expect(pasada.pasos[pasada.pasos.length - 1]).toMatchObject({ clase: 'detenido', explicacion: { clave: 'detenido', datos: { causa: 'limite-caracteres' } } });
  });

  it('la consola cabe exactamente 4 194 304 caracteres: ocho impresiones de 524 288 caben; la novena detiene la ejecución', () => {
    const imprimir = (veces: number): string => `${cadenaDe(19)}\n    for (int k = 0; k < ${veces}; k++) {\n      System.out.print(t);\n    }`;
    expect(correr(imprimir(8)).fin).toEqual({ causa: 'terminado' });
    const pasada = correr(imprimir(9));
    expect(pasada.fin).toEqual({ causa: 'limite-caracteres' });
    expect(pasada.salida.length).toBe(8 * 524_288);
  });
});

/** Un reloj de mentira: cada vez que se lee avanza `salto` milisegundos; `ahora` se puede mover a mano. */
function relojQueAvanza(salto: number): { reloj: () => number; leidas: () => number } {
  let ahora = 0;
  let leidas = 0;
  return {
    reloj: () => {
      leidas += 1;
      ahora += salto;
      return ahora;
    },
    leidas: () => leidas,
  };
}

describe('límite de tiempo cooperativo (3.4): 15 s de cómputo', () => {
  const CICLO_LARGO = '    int n = 0;\n    while (n >= 0) {\n      n = n;\n    }';

  it('con el reloj inyectado, pasar del límite de tiempo configurado detiene con `limite-tiempo` y deja la traza navegable, con el diagnóstico del ciclo', () => {
    const { reloj } = relojQueAvanza(100);
    const ejecucion = crearEjecucion(compilado(programaDe(CICLO_LARGO)), configuracion({ limiteTiempoMs: 1_000 }), PUERTO_POR_OMISION, reloj);
    const avance = ejecucion.avanzar(1_000_000);
    if (avance.estado !== 'fin') throw new Error('se esperaba fin');
    expect(avance.fin.causa).toBe('limite-tiempo');
    expect(avance.fin.diagnostico).toMatchObject({ ciclo: 'while', condicion: 'n >= 0', sinCambio: [{ nombre: 'n', valor: '0' }] });
    const ultimo = avance.pasos[avance.pasos.length - 1];
    expect(ultimo).toMatchObject({ clase: 'detenido', explicacion: { clave: 'detenido', datos: { causa: 'limite-tiempo' } } });
    expect(avance.pasos.length).toBeGreaterThan(10);
    expect(avance.pasos.length).toBeLessThan(5_000);
  });

  it('sin `limiteTiempoMs` en la configuración el tope es de 15 segundos', () => {
    // el reloj avanza 5 s cada vez que se lee: tras la segunda lectura dentro de una llamada ya van más de 15 s
    const { reloj } = relojQueAvanza(5_000);
    const avance = crearEjecucion(compilado(programaDe(CICLO_LARGO)), configuracion(), PUERTO_POR_OMISION, reloj).avanzar(1_000_000);
    if (avance.estado !== 'fin') throw new Error('se esperaba fin');
    expect(avance.fin.causa).toBe('limite-tiempo');
  });

  it('con un reloj que no pasa del tope el programa corre completo (el reloj real no estorba a los programas normales)', () => {
    const { reloj } = relojQueAvanza(0);
    const avance = crearEjecucion(compilado(programaDe('    for (int i = 0; i < 2000; i++) {\n    }')), configuracion({ limiteTiempoMs: 1 }), PUERTO_POR_OMISION, reloj).avanzar(1_000_000);
    expect(avance.estado).toBe('fin');
    if (avance.estado === 'fin') expect(avance.fin).toEqual({ causa: 'terminado' });
  });

  it('el tiempo cuenta solo mientras se calcula: lo que pasa ENTRE llamadas a avanzar (esperando entrada, el trabajador cediendo el turno) no se suma', () => {
    let ahora = 0;
    const ejecucion = crearEjecucion(compilado(programaDe('    for (int i = 0; i < 3000; i++) {\n    }')), configuracion({ limiteTiempoMs: 15_000 }), PUERTO_POR_OMISION, () => ahora);
    expect(ejecucion.avanzar(100).estado).toBe('continua');
    ahora += 10 * 60_000; // diez minutos de espera
    const resto = ejecucion.avanzar(1_000_000);
    expect(resto.estado).toBe('fin');
    if (resto.estado === 'fin') expect(resto.fin).toEqual({ causa: 'terminado' });
  });

  it('el tiempo de varias llamadas SÍ se acumula: pasarse del tope sumando rebanadas también detiene', () => {
    const { reloj } = relojQueAvanza(1_000);
    const ejecucion = crearEjecucion(compilado(programaDe(CICLO_LARGO)), configuracion({ limiteTiempoMs: 15_000 }), PUERTO_POR_OMISION, reloj);
    let avance = ejecucion.avanzar(100);
    let llamadas = 1;
    while (avance.estado === 'continua' && llamadas < 100) {
      avance = ejecucion.avanzar(100);
      llamadas += 1;
    }
    if (avance.estado !== 'fin') throw new Error('se esperaba fin');
    expect(avance.fin.causa).toBe('limite-tiempo');
    expect(llamadas).toBeGreaterThan(2); // no lo detuvo la primera rebanada sola
  });
});

describe('rebanadas con presupuesto de tiempo (3.4 → 3.5): avanzar(maxPasos, presupuestoMs)', () => {
  const CICLO_FINITO = '    for (int i = 0; i < 400; i++) {\n    }';

  it('al pasar el presupuesto devuelve lo que lleva con `continua`, y retomar da EXACTAMENTE los mismos pasos que correr de una sola vez', () => {
    const entero = correr(CICLO_FINITO).pasos;
    const { reloj } = relojQueAvanza(10);
    const ejecucion = crearEjecucion(compilado(programaDe(CICLO_FINITO)), configuracion(), PUERTO_POR_OMISION, reloj);
    const rebanadas: Paso[][] = [];
    for (;;) {
      const avance = ejecucion.avanzar(100_000, 25);
      rebanadas.push([...avance.pasos]);
      if (avance.estado === 'fin') break;
      expect(avance.estado).toBe('continua');
    }
    expect(rebanadas.length).toBeGreaterThan(3);
    expect(rebanadas.every((rebanada) => rebanada.length < entero.length)).toBe(true);
    expect(rebanadas.flat()).toEqual(entero);
  });

  it('sin presupuesto, avanzar(maxPasos) se comporta como siempre', () => {
    const { reloj } = relojQueAvanza(10_000);
    const avance = crearEjecucion(compilado(programaDe(CICLO_FINITO)), configuracion(), PUERTO_POR_OMISION, reloj).avanzar(100_000);
    expect(avance.estado).toBe('fin');
  });
});

describe('los programas de siempre no cambian (3.4)', () => {
  it('el mismo programa con y sin reloj inyectado da los mismos pasos', () => {
    const fuente = programaDe('    int suma = 0;\n    for (int i = 1; i <= 50; i++) {\n      suma += i;\n    }\n    System.out.println(suma);');
    const sinReloj = correrPrograma(fuente, { puerto: PUERTO_POR_OMISION });
    const conReloj = crearEjecucion(compilado(fuente), configuracion(), PUERTO_POR_OMISION, () => 0).avanzar(1_000_000);
    expect(conReloj.pasos).toEqual(sinReloj.pasos);
  });
});
