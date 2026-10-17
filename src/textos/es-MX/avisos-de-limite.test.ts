// RED de la tarea 3.4 (REQ-EJEC-007, ADR 015): el aviso «Se detuvo por seguridad» cuando el visualizador para un programa por un límite (pasos, caracteres, tiempo). Con la evidencia del ciclo
// que saca el diagnóstico (3.3) dice cosas como «`contador` siempre valió 1», no un mensaje genérico. Español de México, tuteo, el código entre comillas invertidas.
import { describe, expect, it } from 'vitest';
import type { DiagnosticoDeCiclo, FinEjecucion } from '../../motor/vista.ts';
import { evidenciaDelCiclo, textoDelAvisoDeLimite, tituloDelAvisoDeLimite } from './avisos-de-limite.ts';

const CONTADOR: DiagnosticoDeCiclo = { ciclo: 'while', linea: 5, condicion: 'contador <= 5', vueltas: 100, sinCambio: [{ nombre: 'contador', valor: '1' }] };

describe('evidenciaDelCiclo: lo que el diagnóstico le dice al alumno', () => {
  it('una variable que no cambió: «`contador` siempre valió 1», con el ciclo y la condición', () => {
    expect(evidenciaDelCiclo(CONTADOR)).toBe(
      'En el ciclo `while` de la línea 5, `contador` siempre valió 1 en las últimas 100 vueltas, así que la condición `contador <= 5` nunca dejó de cumplirse.',
    );
  });

  it('dos variables: se enumeran con «y»; tres, con comas y «y»', () => {
    expect(
      evidenciaDelCiclo({ ...CONTADOR, condicion: 'vidas > 0 && nivel < 10', sinCambio: [{ nombre: 'vidas', valor: '3' }, { nombre: 'nivel', valor: '7' }] }),
    ).toBe('En el ciclo `while` de la línea 5, `vidas` siempre valió 3 y `nivel` siempre valió 7 en las últimas 100 vueltas, así que la condición `vidas > 0 && nivel < 10` nunca dejó de cumplirse.');
    expect(
      evidenciaDelCiclo({ ...CONTADOR, sinCambio: [{ nombre: 'a', valor: '1' }, { nombre: 'b', valor: '2' }, { nombre: 'c', valor: '3' }] }),
    ).toContain('`a` siempre valió 1, `b` siempre valió 2 y `c` siempre valió 3 en las últimas 100 vueltas');
  });

  it('con una sola vuelta observada no dice «vueltas» en plural', () => {
    expect(evidenciaDelCiclo({ ...CONTADOR, vueltas: 1 })).toContain('en la última vuelta');
  });

  it('sin variables que citar: nombra el ciclo y la condición y dice que seguía repitiéndose', () => {
    expect(evidenciaDelCiclo({ ciclo: 'while', linea: 3, condicion: 'true', vueltas: 100, sinCambio: [] })).toBe(
      'El ciclo `while` de la línea 3, con la condición `true`, seguía repitiéndose.',
    );
    expect(evidenciaDelCiclo({ ciclo: 'do-while', linea: 9, condicion: 'i >= 0', vueltas: 100, sinCambio: [] })).toBe(
      'El ciclo `do-while` de la línea 9, con la condición `i >= 0`, seguía repitiéndose.',
    );
  });
});

describe('textoDelAvisoDeLimite', () => {
  it('el título es «Se detuvo por seguridad»', () => {
    expect(tituloDelAvisoDeLimite()).toBe('Se detuvo por seguridad');
  });

  it('límite de pasos con evidencia: dice por qué y cita la variable', () => {
    const fin: FinEjecucion = { causa: 'limite-pasos', diagnostico: CONTADOR };
    expect(textoDelAvisoDeLimite(fin)).toBe(`El programa llevaba demasiados pasos y todavía no terminaba. ${evidenciaDelCiclo(CONTADOR)}`);
  });

  it('límite de pasos sin ciclo que diagnosticar: solo el motivo', () => {
    expect(textoDelAvisoDeLimite({ causa: 'limite-pasos' })).toBe('El programa llevaba demasiados pasos y todavía no terminaba.');
  });

  it('límite de tiempo (el perro guardián o los 15 s): el motivo, y la evidencia si la hay', () => {
    expect(textoDelAvisoDeLimite({ causa: 'limite-tiempo' })).toBe('El programa llevaba demasiado tiempo calculando y todavía no terminaba.');
    expect(textoDelAvisoDeLimite({ causa: 'limite-tiempo', diagnostico: CONTADOR })).toBe(
      `El programa llevaba demasiado tiempo calculando y todavía no terminaba. ${evidenciaDelCiclo(CONTADOR)}`,
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
