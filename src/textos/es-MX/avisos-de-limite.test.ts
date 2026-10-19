// RED de la tarea 3.4 (REQ-EJEC-007, ADR 015) y C7 del panel 1 (2026-10-17): el aviso «Se detuvo por seguridad» cuando el visualizador para un programa por un límite (pasos, caracteres, tiempo). Con la
// evidencia del ciclo que saca el diagnóstico (3.3) dice cosas como «`contador` siempre valió 1», no un mensaje genérico. Antes de ese aviso, en el paso 0, el robot solo despierta la curiosidad (una
// intriga que NO cuenta el final), y en el último paso hay UN solo texto (el título del aviso ya dice que se detuvo: no se repite en tres lugares). Español de México, tuteo, el código entre
// comillas invertidas.
import { describe, expect, it } from 'vitest';
import type { DiagnosticoDeCiclo, FinEjecucion } from '../../motor/vista.ts';
import { evidenciaDelCiclo, textoDeLaDetencion, textoDelAvisoDeLimite, textoIntrigaDelLimite, tituloDelAvisoDeLimite } from './avisos-de-limite.ts';

const CONTADOR: DiagnosticoDeCiclo = { ciclo: 'while', linea: 5, condicion: 'contador <= 5', vueltas: 100, sinCambio: [{ nombre: 'contador', valor: '1' }] };
const SIN_VARIABLES: DiagnosticoDeCiclo = { ciclo: 'while', linea: 3, condicion: 'true', vueltas: 100, sinCambio: [] };

describe('evidenciaDelCiclo: lo que el diagnóstico le dice al alumno', () => {
  it('una variable que no cambió: «`contador` siempre valió 1», la condición siempre dio `true` y qué hace falta para que el ciclo termine', () => {
    expect(evidenciaDelCiclo(CONTADOR)).toBe(
      'En las últimas 100 vueltas del `while` de la línea 5, `contador` siempre valió 1, así que `contador <= 5` siempre dio `true`. Mientras nada dentro del ciclo cambie `contador`, el ciclo no va a terminar.',
    );
  });

  it('otro ciclo y otra variable cambian la frase con ellos (`do-while`, `for`)', () => {
    expect(evidenciaDelCiclo({ ciclo: 'do-while', linea: 9, condicion: 'intentos > 0', vueltas: 50, sinCambio: [{ nombre: 'intentos', valor: '3' }] })).toBe(
      'En las últimas 50 vueltas del `do-while` de la línea 9, `intentos` siempre valió 3, así que `intentos > 0` siempre dio `true`. Mientras nada dentro del ciclo cambie `intentos`, el ciclo no va a terminar.',
    );
  });

  it('dos variables: se enumeran con «y» y lo que tendría que cambiar con «o»; tres, con comas', () => {
    expect(
      evidenciaDelCiclo({ ...CONTADOR, condicion: 'vidas > 0 && nivel < 10', sinCambio: [{ nombre: 'vidas', valor: '3' }, { nombre: 'nivel', valor: '7' }] }),
    ).toBe(
      'En las últimas 100 vueltas del `while` de la línea 5, `vidas` siempre valió 3 y `nivel` siempre valió 7, así que `vidas > 0 && nivel < 10` siempre dio `true`. Mientras nada dentro del ciclo cambie `vidas` o `nivel`, el ciclo no va a terminar.',
    );
    const tres = evidenciaDelCiclo({ ...CONTADOR, sinCambio: [{ nombre: 'a', valor: '1' }, { nombre: 'b', valor: '2' }, { nombre: 'c', valor: '3' }] });
    expect(tres).toContain('`a` siempre valió 1, `b` siempre valió 2 y `c` siempre valió 3, así que');
    expect(tres).toContain('Mientras nada dentro del ciclo cambie `a`, `b` o `c`, el ciclo no va a terminar.');
  });

  it('con una sola vuelta observada no dice «vueltas» en plural', () => {
    expect(evidenciaDelCiclo({ ...CONTADOR, vueltas: 1 })).toContain('En la última vuelta del `while` de la línea 5, `contador` siempre valió 1');
  });

  it('sin variables que citar: nombra el ciclo y la condición y dice que seguía repitiéndose (no se inventa un «siempre valió»)', () => {
    expect(evidenciaDelCiclo(SIN_VARIABLES)).toBe('El ciclo `while` de la línea 3, con la condición `true`, seguía repitiéndose.');
    expect(evidenciaDelCiclo({ ciclo: 'do-while', linea: 9, condicion: 'i >= 0', vueltas: 100, sinCambio: [] })).toBe(
      'El ciclo `do-while` de la línea 9, con la condición `i >= 0`, seguía repitiéndose.',
    );
  });
});

describe('textoDelAvisoDeLimite: UN solo texto al final, sin repetir «se detuvo»', () => {
  it('el título es «Se detuvo por seguridad»', () => {
    expect(tituloDelAvisoDeLimite()).toBe('Se detuvo por seguridad');
  });

  it('límite de pasos con evidencia de variables: solo la evidencia (el título ya dice que se detuvo, y la evidencia dice por qué)', () => {
    const fin: FinEjecucion = { causa: 'limite-pasos', diagnostico: CONTADOR };
    expect(textoDelAvisoDeLimite(fin)).toBe(evidenciaDelCiclo(CONTADOR));
    expect(textoDelAvisoDeLimite(fin)).not.toMatch(/Par[eé]|me detuve|se detuvo|Así terminó/);
  });

  it('límite de pasos en `while (true) {}`: no cita variables; dice el motivo y que el ciclo seguía repitiéndose', () => {
    expect(textoDelAvisoDeLimite({ causa: 'limite-pasos', diagnostico: SIN_VARIABLES })).toBe(
      'El programa llevaba demasiados pasos y todavía no terminaba. El ciclo `while` de la línea 3, con la condición `true`, seguía repitiéndose.',
    );
  });

  it('límite de pasos sin ciclo que diagnosticar: el motivo y la pregunta que lleva al alumno a buscar el ciclo', () => {
    expect(textoDelAvisoDeLimite({ causa: 'limite-pasos' })).toBe('El programa llevaba demasiados pasos y todavía no terminaba. ¿Será un ciclo que nunca termina?');
  });

  it('límite de tiempo (el perro guardián o los 15 s): el motivo, y la evidencia si la hay', () => {
    expect(textoDelAvisoDeLimite({ causa: 'limite-tiempo' })).toBe('El programa llevaba demasiado tiempo calculando y todavía no terminaba.');
    expect(textoDelAvisoDeLimite({ causa: 'limite-tiempo', diagnostico: CONTADOR })).toBe(evidenciaDelCiclo(CONTADOR));
    expect(textoDelAvisoDeLimite({ causa: 'limite-tiempo', diagnostico: SIN_VARIABLES })).toBe(
      'El programa llevaba demasiado tiempo calculando y todavía no terminaba. El ciclo `while` de la línea 3, con la condición `true`, seguía repitiéndose.',
    );
  });

  it('límite de caracteres: un texto o la consola crecieron de más', () => {
    expect(textoDelAvisoDeLimite({ causa: 'limite-caracteres' })).toBe(
      'El programa escribió demasiado texto: una cadena o la consola pasaron del tamaño que el visualizador permite.',
    );
  });

  it('un fin que no es un límite (terminó, excepción, error) no tiene aviso de seguridad: null', () => {
    for (const causa of ['terminado', 'excepcion', 'error-arranque', 'no-disponible-en-ejecucion', 'error-interno'] as const) {
      expect(textoDelAvisoDeLimite({ causa }), causa).toBeNull();
    }
  });
});

describe('textoDeLaDetencion: es el mismo texto que el del aviso (el paso `detenido` y el cierre dicen una sola cosa)', () => {
  it('coincide con textoDelAvisoDeLimite para cada límite, con y sin diagnóstico', () => {
    for (const causa of ['limite-pasos', 'limite-tiempo', 'limite-caracteres'] as const) {
      for (const diagnostico of [undefined, CONTADOR, SIN_VARIABLES]) {
        expect(textoDeLaDetencion(causa, diagnostico), `${causa} ${diagnostico?.condicion ?? 'sin diagnóstico'}`).toBe(
          textoDelAvisoDeLimite(diagnostico === undefined ? { causa } : { causa, diagnostico }),
        );
      }
    }
  });
});

describe('textoIntrigaDelLimite: el paso 0 despierta la curiosidad sin contar el final (C7)', () => {
  it('por pasos: «no terminó solo», lo detuvo el visualizador «después de muchos pasos» y la invitación a avanzar', () => {
    expect(textoIntrigaDelLimite('limite-pasos')).toBe(
      'Ojo: este programa no terminó solo. El visualizador lo detuvo por seguridad después de muchos pasos. Avanza y descubre por qué.',
    );
  });

  it('por tiempo y por caracteres cambian solo el motivo', () => {
    expect(textoIntrigaDelLimite('limite-tiempo')).toBe(
      'Ojo: este programa no terminó solo. El visualizador lo detuvo por seguridad porque tardaba demasiado en calcular. Avanza y descubre por qué.',
    );
    expect(textoIntrigaDelLimite('limite-caracteres')).toBe(
      'Ojo: este programa no terminó solo. El visualizador lo detuvo por seguridad porque escribía demasiado texto. Avanza y descubre por qué.',
    );
  });

  it('no cuenta el diagnóstico: ni una variable, ni «siempre valió», ni la condición', () => {
    for (const causa of ['limite-pasos', 'limite-tiempo', 'limite-caracteres'] as const) {
      expect(textoIntrigaDelLimite(causa), causa).not.toMatch(/siempre valió|nunca dejó|seguía repitiéndose|`/);
    }
  });

  it('un fin que no es un límite no tiene intriga: null', () => {
    for (const causa of ['terminado', 'excepcion', 'error-arranque', 'no-disponible-en-ejecucion', 'error-interno'] as const) {
      expect(textoIntrigaDelLimite(causa), causa).toBeNull();
    }
  });
});
