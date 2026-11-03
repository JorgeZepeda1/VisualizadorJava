// RED de la tarea R0.13 (REQ-LIBRO-002, REQ-LIBRO-004, REQ-PANT-010): las reglas que todo tema con contenido debe cumplir, probadas con temas de MUESTRA —uno válido y varios que rompen una sola regla—
// para que la regla de verdad detecte (nunca un recorrido que no itera). Cuando un tema tenga contenido real (R0.14, `u6.ts`), las mismas reglas corren sobre él. Aquí no hay fs: la relación con
// los programas y los goldens de `corpus/libro/` la prueba `pruebas/libro/contenido-del-libro.test.ts`.
import { describe, expect, it } from 'vitest';
import { META_DE_PALABRAS, MAXIMO_DE_PALABRAS, palabrasDelTema, programasDelTema, reglasDelTema, textosDelTema } from './reglas-del-tema.ts';
import type { Tema } from './tipos.ts';

/** `n` palabras de relleno que no rompen ninguna regla de vocabulario. */
function palabras(n: number): string {
  return Array.from({ length: n }, () => 'casa').join(' ');
}

/** Un tema válido cuyo conteo de palabras se calcula a mano: 10 + 15 + 7 + 6 + 4 + 6 + 8 + 18 + 24 + 9 = 107 (la forma general no cuenta). */
function temaDeMuestra(cambios: Partial<Tema> = {}): Tema {
  return {
    id: 'u6-while',
    unidad: 6,
    oleada: 1,
    orden: 2,
    titulo: 'El ciclo `while`',
    estado: 'borrador',
    paraEmpezar: { situacion: palabras(10), programa: 'u6-while/contar-en-voz-alta' },
    idea: [palabras(5), palabras(5), palabras(5)],
    comoSeEscribe: [
      { tipo: 'parrafo', texto: palabras(7) },
      { tipo: 'forma', texto: 'while (condición) {\n    instrucciones\n}' },
      { tipo: 'nota', texto: palabras(6) },
      { tipo: 'lista', elementos: [palabras(2), palabras(2)] },
    ],
    pasoAPaso: { queObservar: palabras(6), programa: 'u6-while/cuenta-regresiva', sugerirReto: true },
    erroresTipicos: [{ texto: palabras(8), programa: 'u6-while/pagar-con-el-saldo' }],
    ponteAPrueba: [
      { pregunta: palabras(9), programa: 'u6-while/prueba-uno' },
      { pregunta: palabras(9), programa: 'u6-while/prueba-dos' },
    ],
    ahoraHazloTu: [
      { tipo: 'modificar', consigna: palabras(12), solucion: 'u6-while/solucion-modificar' },
      { tipo: 'crear', consigna: palabras(12), solucion: 'u6-while/solucion-crear' },
    ],
    resumen: [palabras(3), palabras(3), palabras(3)],
    ...cambios,
  };
}

describe('palabrasDelTema: lo que el alumno lee, sin contar el código', () => {
  it('suma las palabras de todos los textos de lectura y no cuenta la forma general (es código) ni el título', () => {
    // situación 10 + idea 15 + párrafo 7 + nota 6 + lista 4 + qué observar 6 + error 8 + preguntas 18 + consignas 24 + resumen 9 = 107.
    expect(palabrasDelTema(temaDeMuestra())).toBe(107);
  });

  it('un fragmento de código en línea cuenta como UNA palabra, aunque lleve espacios', () => {
    const tema = temaDeMuestra({ idea: ['Java revisa `i <= 5` antes de cada vuelta', palabras(5), palabras(5)] });
    // La primera frase: Java, revisa, `i <= 5`, antes, de, cada, vuelta = 7 (en vez de las 5 de la muestra).
    expect(palabrasDelTema(tema)).toBe(107 - 5 + 7);
  });

  it('la forma general no suma, pero la nota y la lista sí (otro tema con otra forma da el mismo total)', () => {
    const conOtraForma = temaDeMuestra({
      comoSeEscribe: [
        { tipo: 'forma', texto: 'do {\n    instrucciones\n} while (condición);\n// y más y más y más código' },
        { tipo: 'parrafo', texto: palabras(7) },
        { tipo: 'nota', texto: palabras(6) },
        { tipo: 'lista', elementos: [palabras(2), palabras(2)] },
      ],
    });
    expect(palabrasDelTema(conOtraForma)).toBe(107);
  });

  it('la meta es de 400 palabras y el máximo de 550', () => {
    expect(META_DE_PALABRAS).toBe(400);
    expect(MAXIMO_DE_PALABRAS).toBe(550);
  });
});

describe('textosDelTema: todos los textos que lee el alumno, para revisar su voz', () => {
  it('trae las frases de cada sección y deja fuera la forma general', () => {
    const tema = temaDeMuestra({ idea: ['Primera frase de la idea.', 'Segunda.', 'Tercera.'] });
    const textos = textosDelTema(tema);
    expect(textos).toContain('Primera frase de la idea.');
    expect(textos).toContain(tema.paraEmpezar.situacion);
    expect(textos).toContain(tema.ahoraHazloTu[1].consigna);
    expect(textos.some((texto) => texto.includes('instrucciones'))).toBe(false);
  });
});

describe('programasDelTema: los programas que usa un tema, en el orden de sus secciones y con su papel', () => {
  it('Para empezar, Míralo paso a paso, errores típicos, Ponte a prueba y las soluciones de Ahora hazlo tú', () => {
    expect(programasDelTema(temaDeMuestra())).toEqual([
      { id: 'u6-while/contar-en-voz-alta', papel: 'para-empezar' },
      { id: 'u6-while/cuenta-regresiva', papel: 'paso-a-paso' },
      { id: 'u6-while/pagar-con-el-saldo', papel: 'error-tipico' },
      { id: 'u6-while/prueba-uno', papel: 'ponte-a-prueba' },
      { id: 'u6-while/prueba-dos', papel: 'ponte-a-prueba' },
      { id: 'u6-while/solucion-modificar', papel: 'solucion' },
      { id: 'u6-while/solucion-crear', papel: 'solucion' },
    ]);
  });
});

describe('reglasDelTema: un tema de muestra válido no incumple nada; cada regla rota se detecta sola', () => {
  it('el tema válido no incumple ninguna regla', () => {
    expect(reglasDelTema(temaDeMuestra())).toEqual([]);
  });

  it.each([
    [2, 'la idea de 2 frases se queda corta'],
    [6, 'la idea de 6 frases se pasa'],
  ])('la idea debe tener de 3 a 5 frases: con %i se detecta (%s)', (cuantas) => {
    const incumplimientos = reglasDelTema(temaDeMuestra({ idea: Array.from({ length: cuantas }, () => palabras(5)) }));
    expect(incumplimientos.map((i) => i.regla)).toEqual(['idea']);
  });

  it.each([1, 4])('«Ponte a prueba» debe tener 2 o 3 predicciones: con %i se detecta', (cuantas) => {
    const preguntas = Array.from({ length: cuantas }, (_, i) => ({ pregunta: palabras(9), programa: `u6-while/prueba-${i}` as const }));
    const incumplimientos = reglasDelTema(temaDeMuestra({ ponteAPrueba: preguntas }));
    expect(incumplimientos.map((i) => i.regla)).toEqual(['ponte-a-prueba']);
  });

  it('con 3 predicciones sí cumple (el límite alto es válido)', () => {
    const preguntas = [1, 2, 3].map((i) => ({ pregunta: palabras(9), programa: `u6-while/prueba-${i}` as const }));
    expect(reglasDelTema(temaDeMuestra({ ponteAPrueba: preguntas }))).toEqual([]);
  });

  it('«Ahora hazlo tú» debe ser una tarea de modificar y luego una de crear: si vienen al revés se detecta', () => {
    const alReves = [
      { tipo: 'crear', consigna: palabras(12), solucion: 'u6-while/solucion-crear' },
      { tipo: 'modificar', consigna: palabras(12), solucion: 'u6-while/solucion-modificar' },
    ] as unknown as Tema['ahoraHazloTu'];
    expect(reglasDelTema(temaDeMuestra({ ahoraHazloTu: alReves })).map((i) => i.regla)).toEqual(['ahora-hazlo-tu']);
  });

  it('«En resumen» son tres viñetas con texto: una vacía se detecta', () => {
    const incumplimientos = reglasDelTema(temaDeMuestra({ resumen: [palabras(3), '  ', palabras(3)] }));
    expect(incumplimientos.map((i) => i.regla)).toEqual(['resumen']);
  });

  it('con 550 palabras cumple y con 551 se detecta (el límite exacto)', () => {
    const base = palabrasDelTema(temaDeMuestra());
    const con550 = temaDeMuestra({ idea: [palabras(5 + (550 - base)), palabras(5), palabras(5)] });
    const con551 = temaDeMuestra({ idea: [palabras(5 + (551 - base)), palabras(5), palabras(5)] });
    expect(palabrasDelTema(con550)).toBe(550);
    expect(reglasDelTema(con550)).toEqual([]);
    expect(palabrasDelTema(con551)).toBe(551);
    expect(reglasDelTema(con551).map((i) => i.regla)).toEqual(['palabras']);
  });

  it.each([
    ['verdadero', 'Esto es verdadero cuando la condición se cumple.'],
    ['falsa', 'La condición es falsa y Java sale del ciclo.'],
    ['iteración', 'Cada iteración cambia el valor.'],
    ['iteraciones', 'Después de tres iteraciones termina.'],
    ['Reviso', 'Reviso la condición antes de cada vuelta.'],
    ['Guardo', 'Guardo el resultado en la variable.'],
    ['trampa sola', 'Cuidado: esta trampa es muy común.'],
  ])('el vocabulario de los robots rechaza «%s» (REQ-PANT-010)', (_forma, frase) => {
    const incumplimientos = reglasDelTema(temaDeMuestra({ idea: [frase, palabras(5), palabras(5)] }));
    expect(incumplimientos.map((i) => i.regla)).toEqual(['vocabulario']);
  });

  it('el vocabulario acepta `true`, `false`, «vuelta» y «trampa de Java» (el control de las formas prohibidas)', () => {
    const idea = ['Java revisa la condición: si da `true`, empieza otra vuelta; si da `false`, el ciclo termina.', 'Una trampa de Java hace algo que sorprende.', 'La palabra falsificar no es la forma prohibida.'];
    expect(reglasDelTema(temaDeMuestra({ idea }))).toEqual([]);
  });

  it('un fragmento de código no se revisa como prosa (`falso` dentro de comillas invertidas no es la palabra prohibida)', () => {
    const idea = ['La variable `falso` es solo un nombre.', palabras(5), palabras(5)];
    expect(reglasDelTema(temaDeMuestra({ idea }))).toEqual([]);
  });

  // Correcciones del panel R0 (experto en Java A5, B5 y B6; maestro L2): frases que parecen inofensivas y Java desmiente. Cada una se prueba con la frase desmentida (se detecta) y con su versión acotada (pasa).
  describe('afirmaciones que Java desmiente (panel R0)', () => {
    /** Solo la regla `afirmaciones`: el tema de muestra cambia de id y sus programas ya no son «suyos». */
    function afirmaciones(cambios: Partial<Tema>): readonly string[] {
      return reglasDelTema(temaDeMuestra(cambios))
        .filter((incumplimiento) => incumplimiento.regla === 'afirmaciones')
        .map((incumplimiento) => incumplimiento.detalle);
    }

    const enLaIdea = (frase: string): Partial<Tema> => ({ idea: [frase, palabras(5), palabras(5)] });

    it.each([
      ['«el ciclo nunca termina» (un `break` o una excepción lo terminan)', 'Si nada cambia, el ciclo nunca termina.'],
      ['«igual que `i = i + 1`» sin acotar al `int` (con `char c`, `c = c + 1;` ni compila)', '`i++` suma 1 a `i`, igual que `i = i + 1`.'],
      ['«una bandera empieza en `false`» (`boolean todosAprobaron = true;` es normal)', 'Una bandera es una variable `boolean` que empieza en `false`.'],
      ['«la bandera en `false`»', 'Los dos empiezan en 0, y la bandera en `false`.'],
      ['«mismo trabajo que un `while`» (con `continue` el `for` sí hace su cambio)', 'Hace el mismo trabajo que un `while`, pero con las tres partes juntas.'],
      ['«las llaves marcan lo que se repite» sin decir qué pasa sin llaves', 'Las llaves `{ }` marcan lo que se repite.'],
    ])('se detecta: %s', (_porQue, frase) => {
      expect(afirmaciones(enLaIdea(frase))).toHaveLength(1);
    });

    it.each([
      ['«nunca da `false`»', 'Si nada cambia, la condición nunca da `false`.'],
      ['«con una variable `int` usada como instrucción»', 'Con una variable `int` usada como instrucción, `i++` suma 1 a `i`, igual que `i = i + 1`.'],
      ['«suele empezar en `false`»', 'Una bandera es una variable `boolean` que suele empezar en `false`.'],
      ['«la bandera suele empezar en `false`»', 'Los dos empiezan en 0, y la bandera suele empezar en `false`.'],
      ['«un trabajo parecido al de un `while`»', 'Hace un trabajo parecido al de un `while`, pero con las tres partes juntas.'],
      ['«sin llaves, solo se repite la primera instrucción»', 'Las llaves `{ }` marcan lo que se repite. Sin llaves, solo se repite la primera instrucción.'],
    ])('se acepta la versión acotada: %s', (_porQue, frase) => {
      expect(afirmaciones(enLaIdea(frase))).toEqual([]);
    });

    it('«antes de cada vuelta» solo es cierto con `while` y `for`: en un tema general se detecta, y se acepta si la frase nombra el ciclo', () => {
      const general: Partial<Tema> = { id: 'u6-que-es-un-ciclo', ...enLaIdea('Antes de cada vuelta, Java revisa una condición.') };
      expect(afirmaciones(general)).toHaveLength(1);
      expect(afirmaciones({ id: 'u6-que-es-un-ciclo', ...enLaIdea('Con el `while`, antes de cada vuelta, Java revisa una condición.') })).toEqual([]);
      expect(afirmaciones({ id: 'u6-que-es-un-ciclo', ...enLaIdea('Para decidir si da otra vuelta, Java revisa una condición.') })).toEqual([]);
    });

    it('«antes de cada vuelta» es cierto en los temas del `while` y del `for` aunque la frase no nombre el ciclo, y en el `do-while` se detecta', () => {
      const frase = enLaIdea('Java revisa la condición antes de cada vuelta.');
      expect(afirmaciones({ id: 'u6-while', ...frase })).toEqual([]);
      expect(afirmaciones({ id: 'u6-for', ...frase })).toEqual([]);
      expect(afirmaciones({ id: 'u6-do-while', ...frase })).toHaveLength(1);
    });

    it('el detalle dice cuál es la frase y por qué Java la desmiente', () => {
      const [detalle] = afirmaciones(enLaIdea('Si nada cambia, el ciclo nunca termina.'));
      expect(detalle).toContain('el ciclo nunca termina');
      expect(detalle).toContain('`break`');
    });

    it('revisa todos los textos del tema, no solo «La idea»: también el resumen y las notas de «Cómo se escribe»', () => {
      expect(afirmaciones({ resumen: [palabras(3), 'Si no cambia, el ciclo nunca termina.', palabras(3)] })).toHaveLength(1);
      expect(afirmaciones({ comoSeEscribe: [{ tipo: 'nota', texto: 'Las llaves `{ }` marcan lo que se repite.' }] })).toHaveLength(1);
    });
  });

  it('un programa de otro tema o repetido se detecta: cada tema usa solo los suyos y cada uno una vez', () => {
    const ajeno = temaDeMuestra({ pasoAPaso: { queObservar: palabras(6), programa: 'u6-for/suma-de-1-a-n', sugerirReto: true } });
    expect(reglasDelTema(ajeno).map((i) => i.regla)).toEqual(['programas']);
    const repetido = temaDeMuestra({ pasoAPaso: { queObservar: palabras(6), programa: 'u6-while/contar-en-voz-alta', sugerirReto: true } });
    expect(reglasDelTema(repetido).map((i) => i.regla)).toEqual(['programas']);
  });

  it('un programa sin nombre («u6-while/») tampoco es un programa del tema', () => {
    const sinNombre = temaDeMuestra({ erroresTipicos: [{ texto: palabras(8), programa: 'u6-while/' }] });
    expect(reglasDelTema(sinNombre).map((i) => i.regla)).toEqual(['programas']);
  });

  it('el tema empieza por una situación: una situación vacía se detecta', () => {
    const sinSituacion = temaDeMuestra({ paraEmpezar: { situacion: '   ', programa: 'u6-while/contar-en-voz-alta' } });
    expect(reglasDelTema(sinSituacion).map((i) => i.regla)).toEqual(['para-empezar']);
  });

  it('hace falta al menos un error típico: sin ninguno se detecta, con uno o con dos cumple', () => {
    expect(reglasDelTema(temaDeMuestra({ erroresTipicos: [] })).map((i) => i.regla)).toEqual(['errores-tipicos']);
    const dos = temaDeMuestra({
      erroresTipicos: [
        { texto: palabras(8), programa: 'u6-while/pagar-con-el-saldo' },
        { texto: palabras(8), programa: 'u6-while/orden-del-cuerpo' },
      ],
    });
    expect(reglasDelTema(dos)).toEqual([]);
  });

  it('un tema relacionado debe ser otro tema del libro: él mismo no vale', () => {
    expect(reglasDelTema(temaDeMuestra({ relacionados: ['u6-while'] })).map((i) => i.regla)).toEqual(['relacionados']);
    expect(reglasDelTema(temaDeMuestra({ relacionados: ['u6-for', 'u6-do-while'] }))).toEqual([]);
  });

  it('cada incumplimiento trae un detalle legible para quien redacta', () => {
    const [incumplimiento] = reglasDelTema(temaDeMuestra({ idea: [palabras(5)] }));
    expect(incumplimiento?.regla).toBe('idea');
    expect(incumplimiento?.detalle).toContain('3 a 5');
  });
});
