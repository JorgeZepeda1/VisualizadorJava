// RED de la tarea 4.11 (REQ-VIS-011): qué dice el robot y cómo se ve en cada momento. En un paso dice la frase de su explicación (el motor manda la clave y los datos; el catálogo la escribe) con su
// línea; en el paso 0 dice cuál línea sigue; si el programa espera un dato lo dice; y en el último paso resume cómo terminó. NUNCA dice algo que el motor no calculó: cada texto sale de un dato
// del motor (la explicación del paso, la línea del nodo que espera, la causa del fin).
import { describe, expect, it } from 'vitest';
import type { ExplicacionPaso, FinEjecucion, Paso } from '../motor/vista.ts';
import { nodo, paso, vistaDePrueba } from './ayudas-de-prueba.ts';
import { derivarRobot, type EstadoDeLaEjecucion } from './robot.ts';

const IMPRESION: ExplicacionPaso = { clave: 'impresion', datos: { texto: 'Hola', flujo: 'out', saltoDeLinea: true } };
const FRASE_DE_IMPRESION = 'Imprimo en la consola: «Hola» y paso a la línea siguiente.';

function pasoDeImpresion(linea: number): Paso {
  return paso({ clase: 'impresion', linea, explicacion: IMPRESION });
}

/** `cuantos` pasos de impresión seguidos, con el último ya dado: la traza llega a su último paso. */
function pasosHasta(cuantos: number, ultimo?: Paso): Paso[] {
  const previos = Array.from({ length: cuantos - (ultimo === undefined ? 0 : 1) }, () => pasoDeImpresion(10));
  return ultimo === undefined ? previos : [...previos, ultimo];
}

const VISTA = vistaDePrueba([nodo(0), nodo(1), nodo(2), nodo(3, { linea: 19 })]);

function terminada(causa: FinEjecucion['causa']): EstadoDeLaEjecucion {
  return { estado: 'terminada', fin: { causa } };
}

describe('derivarRobot: antes de que haya pasos', () => {
  it('sin ejecutar saluda y dice qué hacer', () => {
    expect(derivarRobot({ ejecucion: { estado: 'sin-ejecutar' }, aplicados: [], siguiente: null, total: 0, vista: null })).toEqual({
      animo: 'normal',
      linea: null,
      texto: '¡Hola! Pega o escribe un programa de Java y pulsa «Visualizar». Yo te explico cada paso.',
      nota: null,
      aviso: null,
      asertivo: false,
    });
  });

  it('mientras se revisa el programa, lo dice', () => {
    expect(derivarRobot({ ejecucion: { estado: 'compilando' }, aplicados: [], siguiente: null, total: 0, vista: null }).texto).toBe(
      'Estoy revisando tu programa…',
    );
  });
});

describe('derivarRobot: el paso 0', () => {
  it('dice que todavía no se ejecuta nada y la línea del primer paso', () => {
    const robot = derivarRobot({ ejecucion: { estado: 'calculando' }, aplicados: [], siguiente: pasoDeImpresion(7), total: 5, vista: VISTA });
    expect(robot.texto).toBe('Todavía no se ejecuta nada. Pulsa «Siguiente» y te explico la línea 7.');
    expect(robot.linea).toBeNull();
    expect(robot.animo).toBe('normal');
  });

  it('si el motor aún no calculó ningún paso, no inventa una línea', () => {
    const robot = derivarRobot({ ejecucion: { estado: 'calculando' }, aplicados: [], siguiente: null, total: 0, vista: VISTA });
    expect(robot.texto).toBe('Todavía no se ejecuta nada. Pulsa «Siguiente» para empezar.');
  });

  it('si el programa empieza con una lectura, la línea que sigue es la del nodo que espera', () => {
    const robot = derivarRobot({ ejecucion: { estado: 'esperando-entrada', nodo: 3 }, aplicados: [], siguiente: null, total: 0, vista: VISTA });
    expect(robot.texto).toContain('la línea 19');
  });

  it('un programa sin ninguna sentencia que ejecutar termina de inmediato y el robot lo resume', () => {
    const robot = derivarRobot({ ejecucion: terminada('terminado'), aplicados: [], siguiente: null, total: 0, vista: VISTA });
    expect(robot.texto).toBe('Así terminó: sin errores, en 0 pasos.');
    expect(robot.animo).toBe('feliz');
  });
});

describe('derivarRobot: un paso del programa', () => {
  it('dice la frase de la explicación del paso, con su línea', () => {
    const robot = derivarRobot({
      ejecucion: { estado: 'calculando' },
      aplicados: [pasoDeImpresion(10), pasoDeImpresion(11)],
      siguiente: pasoDeImpresion(12),
      total: 5,
      vista: VISTA,
    });
    expect(robot).toEqual({ animo: 'normal', linea: 11, texto: FRASE_DE_IMPRESION, nota: null, aviso: null, asertivo: false });
  });

  it('triangulación: otra explicación, otra línea', () => {
    const robot = derivarRobot({
      ejecucion: { estado: 'calculando' },
      aplicados: [paso({ clase: 'vacia', linea: 3, explicacion: { clave: 'break', datos: { en: 'ciclo' } } })],
      siguiente: null,
      total: 4,
      vista: VISTA,
    });
    expect(robot.linea).toBe(3);
    expect(robot.texto).toBe('`break`: salgo del ciclo ahora mismo.');
  });

  it('en el último paso, mientras el motor aún calcula, no finge que el programa terminó', () => {
    const robot = derivarRobot({ ejecucion: { estado: 'calculando' }, aplicados: [pasoDeImpresion(10)], siguiente: null, total: 1, vista: VISTA });
    expect(robot.nota).toBe('Sigo calculando los siguientes pasos…');
    expect(robot.animo).toBe('normal');
  });
});

describe('derivarRobot: espera de un dato', () => {
  it('en el último paso con el programa esperando, lo dice con la línea de la lectura y el robot espera', () => {
    const robot = derivarRobot({
      ejecucion: { estado: 'esperando-entrada', nodo: 3 },
      aplicados: [pasoDeImpresion(18)],
      siguiente: null,
      total: 1,
      vista: VISTA,
    });
    expect(robot.texto).toBe(FRASE_DE_IMPRESION);
    expect(robot.nota).toBe('En la línea 19 el programa espera un dato. Escríbelo en la consola y pulsa Enter.');
    expect(robot.animo).toBe('esperando');
  });

  it('en un paso anterior al último, el robot explica ese paso y no menciona la espera', () => {
    const robot = derivarRobot({
      ejecucion: { estado: 'esperando-entrada', nodo: 3 },
      aplicados: [pasoDeImpresion(10)],
      siguiente: pasoDeImpresion(18),
      total: 2,
      vista: VISTA,
    });
    expect(robot.nota).toBeNull();
    expect(robot.animo).toBe('normal');
  });
});

describe('derivarRobot: cómo terminó', () => {
  it('terminó bien: resume los pasos y está contento', () => {
    const robot = derivarRobot({ ejecucion: terminada('terminado'), aplicados: pasosHasta(26), siguiente: null, total: 26, vista: VISTA });
    expect(robot.nota).toBe('Así terminó: sin errores, en 26 pasos.');
    expect(robot.animo).toBe('feliz');
    expect(robot.aviso).toBeNull();
    expect(robot.asertivo).toBe(false);
  });

  it('el resumen solo aparece en el último paso', () => {
    const robot = derivarRobot({ ejecucion: terminada('terminado'), aplicados: [pasoDeImpresion(10)], siguiente: pasoDeImpresion(11), total: 2, vista: VISTA });
    expect(robot.nota).toBeNull();
    expect(robot.animo).toBe('normal');
  });

  it('con excepción: aviso de error, anuncio asertivo y el robot preocupado', () => {
    const pasoFinal = paso({
      clase: 'excepcion',
      linea: 8,
      explicacion: { clave: 'excepcion', datos: { clase: 'java.lang.ArithmeticException', mensaje: '/ by zero' } },
      fin: { causa: 'excepcion' },
    });
    const robot = derivarRobot({ ejecucion: terminada('excepcion'), aplicados: pasosHasta(9, pasoFinal), siguiente: null, total: 9, vista: VISTA });
    expect(robot.texto).toBe('Java detuvo el programa con una excepción: `ArithmeticException` (/ by zero).');
    expect(robot.nota).toBe('Así terminó: con un error (mira el mensaje en rojo en la consola).');
    expect(robot.aviso).toBe('excepcion');
    expect(robot.asertivo).toBe(true);
    expect(robot.animo).toBe('preocupado');
  });

  it('detenido por el límite de pasos: aviso de seguridad, asertivo, con el robot levantando la mano', () => {
    const pasoFinal = paso({
      clase: 'detenido',
      linea: 5,
      explicacion: { clave: 'detenido', datos: { causa: 'limite-pasos' } },
      fin: { causa: 'limite-pasos' },
    });
    const robot = derivarRobot({ ejecucion: terminada('limite-pasos'), aplicados: pasosHasta(5, pasoFinal), siguiente: null, total: 5, vista: VISTA });
    expect(robot.texto).toContain('Paré el programa');
    expect(robot.nota).toBe('Así terminó: me detuve por seguridad (demasiados pasos).');
    expect(robot.aviso).toBe('seguridad');
    expect(robot.asertivo).toBe(true);
    expect(robot.animo).toBe('seguridad');
  });

  it('detenido por algo que todavía no sabe ejecutar: aviso «no disponible»', () => {
    const pasoFinal = paso({
      clase: 'detenido',
      explicacion: { clave: 'detenido', datos: { causa: 'no-disponible-en-ejecucion' } },
      fin: { causa: 'no-disponible-en-ejecucion' },
    });
    const robot = derivarRobot({ ejecucion: terminada('no-disponible-en-ejecucion'), aplicados: pasosHasta(3, pasoFinal), siguiente: null, total: 3, vista: VISTA });
    expect(robot.aviso).toBe('no-disponible');
    expect(robot.animo).toBe('seguridad');
  });

  it('si el perro guardián detuvo el trabajador (límite de tiempo) NO hay paso `detenido`: el aviso de seguridad sale de la causa del fin, en el último paso', () => {
    const robot = derivarRobot({ ejecucion: terminada('limite-tiempo'), aplicados: pasosHasta(40), siguiente: null, total: 40, vista: VISTA });
    expect(robot.aviso).toBe('seguridad');
    expect(robot.asertivo).toBe(true);
    expect(robot.animo).toBe('seguridad');
    expect(robot.nota).toBe('Así terminó: me detuve por seguridad (tardó demasiado en calcular).');
  });

  it('el aviso por el límite de tiempo solo aparece en el último paso; antes, el robot explica el paso como siempre', () => {
    const robot = derivarRobot({ ejecucion: terminada('limite-tiempo'), aplicados: pasosHasta(10), siguiente: pasoDeImpresion(11), total: 40, vista: VISTA });
    expect(robot.aviso).toBeNull();
    expect(robot.asertivo).toBe(false);
  });

  it('un fallo interno no se le achaca al alumno: aviso propio (no de seguridad), asertivo y con el robot preocupado', () => {
    const pasoFinal = paso({
      clase: 'detenido',
      explicacion: { clave: 'detenido', datos: { causa: 'error-interno' } },
      fin: { causa: 'error-interno' },
    });
    const robot = derivarRobot({ ejecucion: terminada('error-interno'), aplicados: pasosHasta(3, pasoFinal), siguiente: null, total: 3, vista: VISTA });
    expect(robot.aviso).toBe('interno');
    expect(robot.asertivo).toBe(true);
    expect(robot.animo).toBe('preocupado');
    expect(robot.nota).toBe('Así terminó: algo falló dentro del visualizador, no en tu programa.');
  });
});
