// RED de la tarea 3.3 (REQ-EJEC-007 diagnóstico, design.md §3.5, M15): cuando el visualizador detiene un programa por seguridad, `diagnosticarCiclo(pasos, vista)` toma el ciclo más interno que estaba
// activo al detenerse y, en sus últimas 100 vueltas, mira las variables de su condición: si NINGUNA cambió, da su nombre y su valor («`intentos` siempre valió 1»). Es evidencia sacada de la
// traza, nunca una suposición: si alguna variable de la condición sí cambió, o la condición depende de la entrada o de un `Random`, no hay variables que citar.
import { describe, expect, it } from 'vitest';
import { compilar } from '../compilador.ts';
import { configuracion, programaDe } from '../interprete/ayudas-de-prueba.ts';
import { crearEjecucion } from '../interprete/ejecucion.ts';
import { PUERTO_VACIO, type PuertoBiblioteca } from '../interprete/puerto-biblioteca.ts';
import { PUERTO_POR_OMISION } from '../interprete/puerto-por-omision.ts';
import type { VistaPrograma } from '../ir/vista-programa.ts';
import { diagnosticarCiclo } from './diagnostico-ciclo.ts';
import type { Paso } from './paso.ts';

/** Compila un programa y lo corre con un tope de pasos chico (como lo hace el límite de seguridad), sin el paso `detenido` final. */
function trazaDePrograma(fuente: string, limitePasos: number, puerto: PuertoBiblioteca): { pasos: readonly Paso[]; vista: VistaPrograma } {
  const resultado = compilar(fuente, puerto);
  if (!resultado.ok) throw new Error(`no compiló: ${JSON.stringify(resultado.problema)}`);
  const avance = crearEjecucion(resultado.programa, configuracion({ limitePasos }), puerto).avanzar(100_000);
  return { pasos: avance.pasos, vista: resultado.vista };
}

/** Un fragmento de `main` (la primera línea del cuerpo es la 3). */
function trazaDe(cuerpo: string, limitePasos = 400): { pasos: readonly Paso[]; vista: VistaPrograma } {
  return trazaDePrograma(programaDe(cuerpo), limitePasos, PUERTO_VACIO);
}

describe('diagnosticarCiclo: la evidencia de un ciclo que no termina', () => {
  it('un while sin `intentos++` (el ejemplo del currículo): la variable de la condición siempre valió 1', () => {
    const { pasos, vista } = trazaDe(['    int intentos = 1;', '    while (intentos <= 5) {', '      System.out.println("otra vez");', '    }'].join('\n'));
    expect(diagnosticarCiclo(pasos, vista)).toEqual({
      ciclo: 'while',
      linea: 4,
      condicion: 'intentos <= 5',
      vueltas: 100,
      sinCambio: [{ nombre: 'intentos', valor: '1' }],
    });
  });

  it('ignora el paso `detenido` del final si el director ya lo puso', () => {
    const { pasos, vista } = trazaDe(['    int n = 3;', '    while (n > 0) {', '      System.out.println("x");', '    }'].join('\n'));
    const ultimo = pasos[pasos.length - 1];
    const conDetenido: readonly Paso[] = [...pasos, { clase: 'detenido', nodo: ultimo.nodo, linea: ultimo.linea, explicacion: { clave: 'detenido', datos: { causa: 'limite-pasos' } }, fin: { causa: 'limite-pasos' } }];
    expect(diagnosticarCiclo(conDetenido, vista)?.sinCambio).toEqual([{ nombre: 'n', valor: '3' }]);
  });

  it('un for sin actualización (`for (int i = 0; i < 5; )`) y un do-while también', () => {
    const delFor = trazaDe(['    for (int i = 0; i < 5; ) {', '      System.out.println(i);', '    }'].join('\n'));
    expect(diagnosticarCiclo(delFor.pasos, delFor.vista)).toMatchObject({ ciclo: 'for', linea: 3, condicion: 'i < 5', sinCambio: [{ nombre: 'i', valor: '0' }] });
    const delDoWhile = trazaDe(['    int k = 2;', '    do {', '      System.out.println(k);', '    } while (k < 10);'].join('\n'));
    expect(diagnosticarCiclo(delDoWhile.pasos, delDoWhile.vista)).toMatchObject({ ciclo: 'do-while', linea: 6, condicion: 'k < 10', sinCambio: [{ nombre: 'k', valor: '2' }] });
  });

  it('si la condición lee dos variables y ninguna cambia, cita las dos en el orden en que aparecen', () => {
    const { pasos, vista } = trazaDe(['    int vidas = 3;', '    int nivel = 7;', '    while (vidas > 0 && nivel < 10) {', '      System.out.println("juego");', '    }'].join('\n'));
    expect(diagnosticarCiclo(pasos, vista)?.sinCambio).toEqual([
      { nombre: 'vidas', valor: '3' },
      { nombre: 'nivel', valor: '7' },
    ]);
  });

  it('si UNA variable de la condición sí cambia, no hay evidencia que citar (el ciclo puede ser largo y no infinito): sinCambio vacío, pero sí sabe qué ciclo era', () => {
    const { pasos, vista } = trazaDe(['    int limite = 1000000;', '    for (int i = 0; i < limite; i++) {', '      System.out.println(i);', '    }'].join('\n'));
    expect(diagnosticarCiclo(pasos, vista)).toEqual({ ciclo: 'for', linea: 4, condicion: 'i < limite', vueltas: 100, sinCambio: [] });
  });

  it('solo cuentan las últimas 100 vueltas: una variable que cambió al principio y ya se quedó quieta cuenta como sin cambio', () => {
    const { pasos, vista } = trazaDe(['    int x = 0;', '    while (x < 1000) {', '      if (x < 20) {', '        x++;', '      }', '    }'].join('\n'), 600);
    expect(diagnosticarCiclo(pasos, vista)).toMatchObject({ vueltas: 100, sinCambio: [{ nombre: 'x', valor: '20' }] });
  });

  it('con ciclos anidados toma el MÁS INTERNO que estaba activo: un ciclo infinito dentro de otro que termina', () => {
    const { pasos, vista } = trazaDe(
      ['    for (int fila = 0; fila < 3; fila++) {', '      int j = 0;', '      while (j < 4) {', '        System.out.println(fila);', '      }', '    }'].join('\n'),
    );
    expect(diagnosticarCiclo(pasos, vista)).toMatchObject({ ciclo: 'while', linea: 5, condicion: 'j < 4', sinCambio: [{ nombre: 'j', valor: '0' }] });
  });

  it('si el ciclo más interno sí avanza, sube al de afuera: un ciclo sin avance que envuelve a uno que termina', () => {
    const { pasos, vista } = trazaDe(
      ['    int ronda = 1;', '    while (ronda <= 3) {', '      for (int c = 0; c < 2; c++) {', '        System.out.println(c);', '      }', '    }'].join('\n'),
    );
    expect(diagnosticarCiclo(pasos, vista)).toMatchObject({ ciclo: 'while', linea: 4, condicion: 'ronda <= 3', sinCambio: [{ nombre: 'ronda', valor: '1' }] });
  });

  it('si la condición depende de la entrada o de un Random (un objeto que cambia por dentro), `siempre valió` sería mentira: no cita nada', () => {
    const fuente = [
      'import java.util.Random;',
      'public class MiPrograma {',
      '  public static void main(String[] args) {',
      '    Random r = new Random(5);',
      '    while (r.nextInt(10) < 20) {',
      '      System.out.println("x");',
      '    }',
      '  }',
      '}',
      '',
    ].join('\n');
    const { pasos, vista } = trazaDePrograma(fuente, 400, PUERTO_POR_OMISION);
    expect(diagnosticarCiclo(pasos, vista)).toMatchObject({ ciclo: 'while', condicion: 'r.nextInt(10) < 20', sinCambio: [] });
  });

  it('una condición que no lee ninguna variable (`while (true)`) no tiene nada que citar, pero se reconoce el ciclo', () => {
    const { pasos, vista } = trazaDe(['    while (true) {', '      System.out.println("para siempre");', '    }'].join('\n'));
    expect(diagnosticarCiclo(pasos, vista)).toEqual({ ciclo: 'while', linea: 3, condicion: 'true', vueltas: 100, sinCambio: [] });
  });

  it('un `while (true) {}` con el cuerpo vacío también (sin ninguna salida)', () => {
    const { pasos, vista } = trazaDe(['    while (true) {', '    }'].join('\n'));
    expect(diagnosticarCiclo(pasos, vista)).toMatchObject({ ciclo: 'while', condicion: 'true', sinCambio: [] });
  });

  it('un programa que no estaba dentro de ningún ciclo al detenerse no tiene diagnóstico (null)', () => {
    const { pasos, vista } = trazaDe(['    int a = 1;', '    int b = a + 1;'].join('\n'));
    expect(diagnosticarCiclo(pasos, vista)).toBeNull();
    expect(diagnosticarCiclo([], vista)).toBeNull();
  });

  it('un ciclo que terminó antes de detenerse el programa no se diagnostica: solo cuenta el que seguía activo', () => {
    const { pasos, vista } = trazaDe(['    for (int i = 0; i < 3; i++) {', '      System.out.println(i);', '    }', '    int despues = 5;'].join('\n'));
    expect(diagnosticarCiclo(pasos, vista)).toBeNull();
  });

  it('con menos de dos revisiones de la condición no hay con qué comparar: null', () => {
    const { pasos, vista } = trazaDe(['    int n = 1;', '    while (n > 0) {', '      System.out.println("x");', '    }'].join('\n'), 3);
    // 3 pasos: n = 1, la condición (1.ª revisión) y el println: una sola revisión
    expect(diagnosticarCiclo(pasos, vista)).toBeNull();
  });

  it('un `for (;;)` no tiene condición que revisar: null', () => {
    const { pasos, vista } = trazaDe(['    for (;;) {', '      System.out.println("x");', '    }'].join('\n'));
    expect(diagnosticarCiclo(pasos, vista)).toBeNull();
  });

  it('solo mira la ÚLTIMA ejecución del ciclo: si el programa se detiene a pocas vueltas de que el ciclo de adentro empezó otra vez, las de la ejecución anterior no se mezclan', () => {
    // el while de adentro termina las dos primeras veces (k cambia) y la tercera se atora con k = 0
    const cuerpo = [
      '    int fuera = 0;',
      '    while (fuera < 3) {',
      '      int k = 0;',
      '      while (k < 2) {',
      '        if (fuera == 2) {',
      '        } else {',
      '          k++;',
      '        }',
      '      }',
      '      fuera++;',
      '    }',
    ].join('\n');
    const { pasos, vista } = trazaDe(cuerpo, 40);
    const diagnostico = diagnosticarCiclo(pasos, vista);
    expect(diagnostico).toMatchObject({ ciclo: 'while', condicion: 'k < 2', sinCambio: [{ nombre: 'k', valor: '0' }] });
    expect(diagnostico?.vueltas).toBeLessThan(20); // solo las vueltas de la ejecución que seguía activa
  });

  it('todos los while terminan y el programa también: no hay ciclo activo (null)', () => {
    const { pasos, vista } = trazaDe(
      ['    for (int pasada = 0; pasada < 5; pasada++) {', '      int w = pasada;', '      while (w < 2) {', '        w++;', '      }', '    }'].join('\n'),
    );
    // todos los while terminan y el programa también: no hay ciclo activo
    expect(diagnosticarCiclo(pasos, vista)).toBeNull();
  });
});
