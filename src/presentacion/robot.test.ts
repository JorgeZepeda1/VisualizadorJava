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

const DIAGNOSTICO_DE_CONTADOR = {
  ciclo: 'while',
  linea: 5,
  condicion: 'contador <= 5',
  vueltas: 100,
  sinCambio: [{ nombre: 'contador', valor: '1' }],
} as const;

describe('derivarRobot: una ejecución que el trabajador detuvo antes del final (acuse `detenido`, hito 2C)', () => {
  const DETENIDA: EstadoDeLaEjecucion = { estado: 'detenida' };

  it('en el último paso lo dice en la nota y el robot no finge que terminó bien ni que el programa falló', () => {
    const robot = derivarRobot({ ejecucion: DETENIDA, aplicados: pasosHasta(6), siguiente: null, total: 6, vista: VISTA });
    expect(robot.texto).toBe(FRASE_DE_IMPRESION);
    expect(robot.nota).toBe('Así terminó: la ejecución se detuvo antes de llegar al final del programa.');
    expect(robot.animo).toBe('normal');
    expect(robot.aviso).toBeNull();
    expect(robot.asertivo).toBe(false);
  });

  it('en el paso 0 de una traza vacía lo dice como texto principal (ya no hay nada que esperar)', () => {
    const robot = derivarRobot({ ejecucion: DETENIDA, aplicados: [], siguiente: null, total: 0, vista: VISTA });
    expect(robot.texto).toBe('Así terminó: la ejecución se detuvo antes de llegar al final del programa.');
  });

  it('en el paso 0 de una traza con pasos sigue invitando a navegar: lo ya calculado es navegable', () => {
    const robot = derivarRobot({ ejecucion: DETENIDA, aplicados: [], siguiente: pasoDeImpresion(7), total: 5, vista: VISTA });
    expect(robot.texto).toBe('Todavía no se ejecuta nada. Pulsa «Siguiente» y te explico la línea 7.');
  });

  it('en un paso intermedio el robot solo explica ese paso', () => {
    const robot = derivarRobot({ ejecucion: DETENIDA, aplicados: pasosHasta(2), siguiente: pasoDeImpresion(11), total: 6, vista: VISTA });
    expect(robot.nota).toBeNull();
  });
});

describe('derivarRobot: un programa que el visualizador detuvo por seguridad (hito 2C)', () => {
  const PASO_DETENIDO_CON_EVIDENCIA = paso({
    clase: 'detenido',
    linea: 5,
    explicacion: { clave: 'detenido', datos: { causa: 'limite-pasos', diagnostico: DIAGNOSTICO_DE_CONTADOR } },
    fin: { causa: 'limite-pasos', diagnostico: DIAGNOSTICO_DE_CONTADOR },
  });

  it('en el paso final el alumno lee la evidencia del ciclo: «`contador` siempre valió 1…»', () => {
    const fin: FinEjecucion = { causa: 'limite-pasos', diagnostico: DIAGNOSTICO_DE_CONTADOR };
    const robot = derivarRobot({
      ejecucion: { estado: 'terminada', fin },
      aplicados: pasosHasta(40, PASO_DETENIDO_CON_EVIDENCIA),
      siguiente: null,
      total: 40,
      vista: VISTA,
    });
    expect(robot.texto).toBe(
      'Paré el programa: ya llevaba demasiados pasos. En el ciclo `while` de la línea 5, `contador` siempre valió 1 en las últimas 100 vueltas, así que la condición `contador <= 5` nunca dejó de cumplirse.',
    );
    expect(robot.aviso).toBe('seguridad');
  });

  it('en el paso 0 ya avisa que se detuvo por seguridad, con la evidencia: no hay que llegar hasta el final para enterarse', () => {
    const fin: FinEjecucion = { causa: 'limite-pasos', diagnostico: DIAGNOSTICO_DE_CONTADOR };
    const robot = derivarRobot({
      ejecucion: { estado: 'terminada', fin },
      aplicados: [],
      siguiente: pasoDeImpresion(4),
      total: 100_001,
      vista: VISTA,
    });
    expect(robot.texto).toBe('Todavía no se ejecuta nada. Pulsa «Siguiente» y te explico la línea 4.');
    expect(robot.nota).toBe(
      'El programa llevaba demasiados pasos y todavía no terminaba. En el ciclo `while` de la línea 5, `contador` siempre valió 1 en las últimas 100 vueltas, así que la condición `contador <= 5` nunca dejó de cumplirse.',
    );
  });

  it('en el paso 0, sin evidencia (el perro guardián cortó por tiempo), avisa lo que sí sabe y no inventa un ciclo', () => {
    const robot = derivarRobot({
      ejecucion: terminada('limite-tiempo'),
      aplicados: [],
      siguiente: pasoDeImpresion(4),
      total: 40,
      vista: VISTA,
    });
    expect(robot.nota).toBe('El programa llevaba demasiado tiempo calculando y todavía no terminaba.');
  });

  it('en el paso 0 de un programa que terminó bien NO hay aviso de seguridad', () => {
    const robot = derivarRobot({ ejecucion: terminada('terminado'), aplicados: [], siguiente: pasoDeImpresion(4), total: 26, vista: VISTA });
    expect(robot.nota).toBeNull();
  });

  it('en el paso 0 de un programa que lanzó una excepción tampoco: la excepción se explica en su paso, no antes', () => {
    const robot = derivarRobot({ ejecucion: terminada('excepcion'), aplicados: [], siguiente: pasoDeImpresion(4), total: 9, vista: VISTA });
    expect(robot.nota).toBeNull();
  });

  it('antes del paso final de la navegación (paso 7 de 40) el robot explica ese paso y no repite el aviso', () => {
    const fin: FinEjecucion = { causa: 'limite-pasos', diagnostico: DIAGNOSTICO_DE_CONTADOR };
    const robot = derivarRobot({ ejecucion: { estado: 'terminada', fin }, aplicados: pasosHasta(7), siguiente: pasoDeImpresion(11), total: 40, vista: VISTA });
    expect(robot.nota).toBeNull();
    expect(robot.aviso).toBeNull();
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

  it('un paso `detenido` por el límite de tiempo del motor también es un aviso de seguridad, aunque el `fin` todavía no haya llegado (hito 2C)', () => {
    // Los pasos viajan en su mensaje y el `fin` en otro: entre los dos la ejecución sigue «calculando», y el paso `detenido` ya debe llevar su aviso.
    const pasoFinal = paso({
      clase: 'detenido',
      linea: 5,
      explicacion: { clave: 'detenido', datos: { causa: 'limite-tiempo' } },
      fin: { causa: 'limite-tiempo' },
    });
    const robot = derivarRobot({ ejecucion: { estado: 'calculando' }, aplicados: pasosHasta(5, pasoFinal), siguiente: null, total: 5, vista: VISTA });
    expect(robot.texto).toBe('Paré el programa: llevaba demasiado tiempo calculando.');
    expect(robot.aviso).toBe('seguridad');
    expect(robot.asertivo).toBe(true);
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
