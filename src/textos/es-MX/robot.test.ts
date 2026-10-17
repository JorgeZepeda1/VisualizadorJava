// RED de la tarea 4.11 (REQ-VIS-011, ADR 015): lo que dice el robot cuando NO es la explicación de un paso del motor — el saludo, el paso 0, la espera de un
// dato y el resumen de cómo terminó el programa. Cada frase sale de un dato que el motor SÍ calculó (la línea que sigue, los pasos, la causa del fin): el robot
// nunca dice algo que el motor no calculó. TypeScript exige una frase por cada `CausaFin`; aquí se prueba el texto y que ninguna deje un marcador sin resolver.
import { describe, expect, it } from 'vitest';
import type { FinEjecucion } from '../../motor/vista.ts';
import { textosRobot } from './robot.ts';

type CausaFin = FinEjecucion['causa'];

const CAUSAS: readonly CausaFin[] = [
  'terminado',
  'excepcion',
  'error-arranque',
  'no-disponible-en-ejecucion',
  'limite-pasos',
  'limite-caracteres',
  'limite-tiempo',
  'error-interno',
];

describe('textosRobot: lo que dice el robot fuera de la explicación de un paso', () => {
  it('saluda y dice qué hacer antes de que haya un programa visualizándose', () => {
    expect(textosRobot.saludo()).toBe('¡Hola! Pega o escribe un programa de Java y pulsa «Visualizar». Yo te explico cada paso.');
  });

  it('mientras el motor revisa el programa, lo dice', () => {
    expect(textosRobot.compilando()).toBe('Estoy revisando tu programa…');
  });

  it('en el paso 0 dice que todavía no se ejecuta nada y cuál es la línea que sigue', () => {
    expect(textosRobot.alInicio(7)).toBe('Todavía no se ejecuta nada. Pulsa «Siguiente» y te explico la línea 7.');
  });

  it('en el paso 0, si el motor aún no calculó ninguna línea, no inventa una', () => {
    expect(textosRobot.alInicio(null)).toBe('Todavía no se ejecuta nada. Pulsa «Siguiente» para empezar.');
  });

  it('etiqueta cada explicación con su línea («Línea 12»)', () => {
    expect(textosRobot.etiquetaDeLinea(12)).toBe('Línea 12');
  });

  it('cuando el programa espera un dato dice en qué línea y qué hacer', () => {
    expect(textosRobot.esperandoUnDato(19)).toBe('En la línea 19 el programa espera un dato. Escríbelo en la consola y pulsa Enter.');
  });

  it('mientras el motor aún calcula, no finge que el programa terminó', () => {
    expect(textosRobot.calculando()).toBe('Sigo calculando los siguientes pasos…');
  });

  it('el resumen de un programa que terminó bien cuenta los pasos, en singular y en plural', () => {
    expect(textosRobot.resumenDelFin.terminado({ pasos: 26 })).toBe('Así terminó: sin errores, en 26 pasos.');
    expect(textosRobot.resumenDelFin.terminado({ pasos: 1 })).toBe('Así terminó: sin errores, en 1 paso.');
  });

  it('el resumen de una excepción manda a la consola, donde está el mensaje de Java', () => {
    expect(textosRobot.resumenDelFin.excepcion({ pasos: 8 })).toBe('Así terminó: con un error (mira el mensaje en rojo en la consola).');
  });

  it('el resumen de cada límite dice que fue por seguridad y por qué', () => {
    expect(textosRobot.resumenDelFin['limite-pasos']({ pasos: 100000 })).toBe('Así terminó: me detuve por seguridad (demasiados pasos).');
    expect(textosRobot.resumenDelFin['limite-caracteres']({ pasos: 5 })).toBe('Así terminó: me detuve por seguridad (un texto creció demasiado).');
    expect(textosRobot.resumenDelFin['limite-tiempo']({ pasos: 5 })).toBe('Así terminó: me detuve por seguridad (tardó demasiado en calcular).');
  });

  it('una parte no disponible o un fallo interno no se le achacan al alumno', () => {
    expect(textosRobot.resumenDelFin['no-disponible-en-ejecucion']({ pasos: 3 })).toBe(
      'Así terminó: me detuve en una parte que todavía no sé ejecutar.',
    );
    expect(textosRobot.resumenDelFin['error-interno']({ pasos: 3 })).toBe('Así terminó: algo falló dentro del visualizador, no en tu programa.');
  });

  it('una ejecución que el trabajador detuvo antes del final (acuse `detenido`) lo dice sin achacarlo al programa ni al alumno', () => {
    expect(textosRobot.detenida()).toBe('Así terminó: la ejecución se detuvo antes de llegar al final del programa.');
  });

  it('hay un resumen para CADA causa de fin y ninguno deja un marcador sin resolver', () => {
    for (const causa of CAUSAS) {
      const texto = textosRobot.resumenDelFin[causa]({ pasos: 4 });
      expect(texto.length, causa).toBeGreaterThan(0);
      expect(texto, causa).not.toMatch(/[{}]|undefined|NaN|\[object/);
    }
  });

  it('el robot tiene una descripción para cada estado de ánimo (para el lector de pantalla)', () => {
    for (const animo of ['normal', 'esperando', 'feliz', 'preocupado', 'seguridad'] as const) {
      expect(textosRobot.descripcionDelAnimo[animo]().length, animo).toBeGreaterThan(0);
    }
  });
});
