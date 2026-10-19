// RED de la tarea 4.11 (REQ-VIS-011, ADR 015): lo que dice el robot cuando NO es la explicación de un paso del motor — el saludo, el paso 0, la espera de un
// dato y el resumen de cómo terminó el programa. Cada frase sale de un dato que el motor SÍ calculó (la línea que sigue, los pasos, la causa del fin): el robot
// nunca dice algo que el motor no calculó. TypeScript exige una frase por cada `CausaFin`; aquí se prueba el texto y que ninguna deje un marcador sin resolver.
import { describe, expect, it } from 'vitest';
import type { FinEjecucion } from '../../motor/vista.ts';
import { textosRobot, type AnimoDelRobot, type PersonajeDelRobot } from './robot.ts';

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
  // El saludo con las puertas (S0) vive en `pantalla.ts` (R0.4); esto es lo que dice el robot mientras el alumno escribe o pega su programa.
  it('mientras el alumno escribe su programa, dice qué hacer para verlo paso a paso', () => {
    expect(textosRobot.sinEjecutar()).toBe('Cuando tu programa esté listo, pulsa «Visualizar» y te muestro cómo lo ejecuta Java, paso a paso.');
  });

  it('si el alumno cambia el programa después de un aviso, el robot ya no repite el error: invita a revisar otra vez (C4 del panel 1)', () => {
    expect(textosRobot.programaCambiado()).toBe('Cambiaste el programa. Pulsa «Visualizar» para que Java lo revise otra vez.');
  });

  it('mientras el motor revisa el programa, lo dice', () => {
    expect(textosRobot.compilando()).toBe('Java está revisando tu programa…');
  });

  // T3 del maestro (panel 1): el paso 0 invita a PREDECIR antes de ver (PRIMM, Naps 2002) y no adelanta nada de la ejecución.
  it('T3, en el paso 0 pide leer el programa y anotar qué aparecerá en la consola antes de pulsar «Siguiente», y nombra la línea con la que se comprueba', () => {
    expect(textosRobot.alInicio(7)).toBe(
      'Todavía no se ejecuta nada. Antes de empezar, lee el programa y anota qué crees que va a aparecer en la consola. Luego pulsa «Siguiente» y lo comprobamos desde la línea 7.',
    );
    expect(textosRobot.alInicio(31)).toContain('lo comprobamos desde la línea 31.');
  });

  it('T3, si el motor aún no calculó ninguna línea, no inventa una', () => {
    expect(textosRobot.alInicio(null)).toBe(
      'Todavía no se ejecuta nada. Antes de empezar, lee el programa y anota qué crees que va a aparecer en la consola. Luego pulsa «Siguiente» para empezar.',
    );
  });

  it('etiqueta cada explicación con su línea («Línea 12»)', () => {
    expect(textosRobot.etiquetaDeLinea(12)).toBe('Línea 12');
  });

  it('cuando el programa espera un dato dice en qué línea y qué hacer', () => {
    expect(textosRobot.esperandoUnDato(19)).toBe('En la línea 19 el programa espera un dato. Escríbelo en la consola y pulsa Enter.');
  });

  it('mientras el motor aún calcula, no finge que el programa terminó', () => {
    expect(textosRobot.calculando()).toBe('Se siguen calculando los siguientes pasos…');
  });

  it('el resumen de un programa que terminó bien cuenta los pasos, en singular y en plural', () => {
    expect(textosRobot.resumenDelFin.terminado({ pasos: 26 })).toBe('Así terminó: sin errores, en 26 pasos.');
    expect(textosRobot.resumenDelFin.terminado({ pasos: 1 })).toBe('Así terminó: sin errores, en 1 paso.');
  });

  it('el resumen de una excepción manda a la consola, donde está el mensaje de Java', () => {
    expect(textosRobot.resumenDelFin.excepcion({ pasos: 8 })).toBe(
      'Así terminó: Java detuvo el programa por un error y lo que seguía ya no se ejecutó. Lee en la consola el mensaje marcado «Error»: dice qué pasó.',
    );
  });

  it('el resumen de cada límite dice que fue por seguridad y por qué', () => {
    expect(textosRobot.resumenDelFin['limite-pasos']({ pasos: 100000 })).toBe('Así terminó: el visualizador lo detuvo por seguridad (demasiados pasos).');
    expect(textosRobot.resumenDelFin['limite-caracteres']({ pasos: 5 })).toBe('Así terminó: el visualizador lo detuvo por seguridad (un texto creció demasiado).');
    expect(textosRobot.resumenDelFin['limite-tiempo']({ pasos: 5 })).toBe('Así terminó: el visualizador lo detuvo por seguridad (tardó demasiado en calcular).');
  });

  it('una parte no disponible o un fallo interno no se le achacan al alumno', () => {
    expect(textosRobot.resumenDelFin['no-disponible-en-ejecucion']({ pasos: 3 })).toBe(
      'Así terminó: el visualizador se detuvo en una parte que todavía no sabe ejecutar.',
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

});

// R0.5 (REQ-PANT-008, ADR 017): tres robots con nombre propio. El nombre visible va bajo la figura y el accesible junta el nombre y el ánimo («Robot revisor: preocupado, algo salió mal»).
describe('textosRobot: los tres personajes', () => {
  const PERSONAJES: readonly PersonajeDelRobot[] = ['paso-a-paso', 'revisor', 'libro'];
  const ANIMOS: readonly AnimoDelRobot[] = ['normal', 'esperando', 'feliz', 'preocupado', 'seguridad'];

  it('cada robot se llama por su tarea (PQ-1): «Robot paso a paso», «Robot revisor» y «Robot del libro»', () => {
    expect(textosRobot.personajes['paso-a-paso'].nombre()).toBe('Robot paso a paso');
    expect(textosRobot.personajes.revisor.nombre()).toBe('Robot revisor');
    expect(textosRobot.personajes.libro.nombre()).toBe('Robot del libro');
  });

  it('el nombre accesible junta el nombre y el ánimo, y es distinto para cada personaje y cada ánimo (para el lector de pantalla)', () => {
    expect(textosRobot.nombreAccesible('paso-a-paso', 'normal')).toBe('Robot paso a paso: te explica cada paso');
    expect(textosRobot.nombreAccesible('revisor', 'normal')).toBe('Robot revisor: revisa tu programa');
    expect(textosRobot.nombreAccesible('libro', 'normal')).toBe('Robot del libro: te presenta el tema');
    expect(textosRobot.nombreAccesible('revisor', 'preocupado')).toBe('Robot revisor: preocupado, algo salió mal');
    const todos = PERSONAJES.flatMap((personaje) => ANIMOS.map((animo) => textosRobot.nombreAccesible(personaje, animo)));
    expect(todos).toHaveLength(15);
    expect(new Set(todos).size).toBe(15);
  });

  it('ningún nombre accesible deja un marcador sin resolver', () => {
    for (const personaje of PERSONAJES) {
      for (const animo of ANIMOS) expect(textosRobot.nombreAccesible(personaje, animo), `${personaje} ${animo}`).not.toMatch(/[{}]|undefined|NaN|\[object/);
    }
  });
});
