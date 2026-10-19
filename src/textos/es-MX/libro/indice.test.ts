// RED de la tarea R0.13 (REQ-LIBRO-001, REQ-LIBRO-002): el índice del libro es la lista cerrada de 34 temas de design §5.2, cada uno con su unidad, su oleada y su orden, y la estructura de un tema
// son ocho secciones en un orden fijo que empieza por el ejemplo. Aquí solo hay datos del índice y de las etiquetas: el contenido de cada tema se prueba en `reglas-del-tema.test.ts`
// (las reglas, con temas de muestra) y, cuando un tema tiene contenido, en las pruebas de `u6.ts` y de `pruebas/libro/`.
import { describe, expect, it } from 'vitest';
import { ETIQUETAS_DEL_LIBRO, SECCIONES_DEL_TEMA } from './etiquetas.ts';
import { INDICE_DEL_LIBRO, entradaDelIndice, temaCompleto } from './indice.ts';
import { META_DE_PALABRAS, MAXIMO_DE_PALABRAS, palabrasDelTema, reglasDelTema } from './reglas-del-tema.ts';
import { IDS_DE_TEMAS } from './tipos.ts';
import { TEMAS_DE_U6 } from './u6.ts';
import type { ContenidoDelTema, IdTema, Unidad } from './tipos.ts';

const IDS_POR_UNIDAD: Readonly<Record<Unidad, readonly IdTema[]>> = {
  3: ['u3-programa-y-main', 'u3-salida', 'u3-variables-y-tipos', 'u3-asignacion', 'u3-entrada-con-scanner', 'u3-tipos-de-errores'],
  4: [
    'u4-operadores-aritmeticos',
    'u4-division-entera-y-modulo',
    'u4-incremento-y-decremento',
    'u4-precedencia',
    'u4-conversiones',
    'u4-math-y-random',
    'u4-textos-y-concatenacion',
    'u4-comparaciones',
    'u4-operadores-logicos',
  ],
  5: ['u5-el-if', 'u5-if-con-else', 'u5-comparar-textos', 'u5-else-if', 'u5-decisiones-anidadas', 'u5-switch'],
  6: [
    'u6-que-es-un-ciclo',
    'u6-while',
    'u6-contador-acumulador-bandera',
    'u6-do-while',
    'u6-for',
    'u6-ciclos-incrementales-y-decrementales',
    'u6-error-por-uno-y-ciclo-infinito',
    'u6-repetir-hasta-que-el-usuario-quiera',
    'u6-ciclos-anidados',
    'u6-break-y-continue',
  ],
  7: ['u7-prueba-de-escritorio', 'u7-depurar-con-el-visualizador', 'u7-casos-de-prueba'],
};

const UNIDADES: readonly Unidad[] = [3, 4, 5, 6, 7];

describe('el índice del libro: la lista cerrada de 34 temas (design §5.2, PQ-3)', () => {
  it('tiene exactamente 34 temas y ningún id repetido', () => {
    expect(INDICE_DEL_LIBRO).toHaveLength(34);
    expect(new Set(INDICE_DEL_LIBRO.map((entrada) => entrada.id)).size).toBe(34);
    expect(IDS_DE_TEMAS).toHaveLength(34);
  });

  it.each(UNIDADES.map((unidad) => [unidad] as const))('la unidad U%i trae sus temas en el orden de lectura del libro', (unidad) => {
    const ids = INDICE_DEL_LIBRO.filter((entrada) => entrada.unidad === unidad)
      .sort((a, b) => a.orden - b.orden)
      .map((entrada) => entrada.id);
    expect(ids).toEqual(IDS_POR_UNIDAD[unidad]);
  });

  it('el índice sale ordenado por unidad y, dentro de ella, por orden', () => {
    const ids = INDICE_DEL_LIBRO.map((entrada) => entrada.id);
    expect(ids).toEqual(UNIDADES.flatMap((unidad) => IDS_POR_UNIDAD[unidad]));
  });

  it.each(UNIDADES.map((unidad) => [unidad] as const))('el orden de la unidad U%i es 1, 2, 3… sin huecos ni repetidos', (unidad) => {
    const ordenes = INDICE_DEL_LIBRO.filter((entrada) => entrada.unidad === unidad).map((entrada) => entrada.orden);
    expect(ordenes).toEqual(IDS_POR_UNIDAD[unidad].map((_, posicion) => posicion + 1));
  });

  it('cada id empieza por la unidad que dice tener y es ASCII en kebab-case (ADR 002)', () => {
    for (const entrada of INDICE_DEL_LIBRO) {
      expect(entrada.id.startsWith(`u${entrada.unidad}-`), entrada.id).toBe(true);
      expect(entrada.id, entrada.id).toMatch(/^u[3-7](-[a-z]+)+$/);
    }
  });

  it('la oleada 1 son 21 temas (los 10 de U6, sus 5 requisitos de U3 y U4, y los 6 de U5) y la oleada 2 son los 13 restantes', () => {
    const oleada1 = INDICE_DEL_LIBRO.filter((entrada) => entrada.oleada === 1).map((entrada) => entrada.id);
    const oleada2 = INDICE_DEL_LIBRO.filter((entrada) => entrada.oleada === 2).map((entrada) => entrada.id);
    expect(oleada1).toHaveLength(21);
    expect(oleada2).toHaveLength(13);
    expect(oleada1.filter((id) => id.startsWith('u6-'))).toEqual(IDS_POR_UNIDAD[6]);
    expect(oleada1.filter((id) => id.startsWith('u5-'))).toEqual(IDS_POR_UNIDAD[5]);
    expect(oleada1.filter((id) => id.startsWith('u3-') || id.startsWith('u4-')).sort()).toEqual(
      ['u3-entrada-con-scanner', 'u4-comparaciones', 'u4-division-entera-y-modulo', 'u4-incremento-y-decremento', 'u4-operadores-logicos'].sort(),
    );
    expect(oleada2.filter((id) => id.startsWith('u7-'))).toEqual(IDS_POR_UNIDAD[7]);
    expect(oleada2.filter((id) => id.startsWith('u3-'))).toHaveLength(5);
    expect(oleada2.filter((id) => id.startsWith('u4-'))).toHaveLength(5);
  });

  it('cada título es único, no está vacío y los renombres del maestro están puestos («Decisiones: el `if`», «`if` con `else`: dos caminos»)', () => {
    const titulos = INDICE_DEL_LIBRO.map((entrada) => entrada.titulo);
    expect(new Set(titulos).size).toBe(34);
    expect(titulos.every((titulo) => titulo.trim().length > 0)).toBe(true);
    expect(entradaDelIndice('u5-el-if').titulo).toBe('Decisiones: el `if`');
    expect(entradaDelIndice('u5-if-con-else').titulo).toBe('`if` con `else`: dos caminos');
    expect(entradaDelIndice('u6-while').titulo).toBe('El ciclo `while`');
  });

  it('los 34 están en borrador y sin aprobación: nada se publica sin el visto bueno explícito del PO (REQ-LIBRO-007)', () => {
    expect(INDICE_DEL_LIBRO.every((entrada) => entrada.estado === 'borrador')).toBe(true);
    expect(INDICE_DEL_LIBRO.every((entrada) => entrada.aprobacion === undefined)).toBe(true);
  });

  it('`entradaDelIndice` devuelve la entrada de cada id, la misma que está en el índice', () => {
    for (const entrada of INDICE_DEL_LIBRO) {
      expect(entradaDelIndice(entrada.id)).toEqual(entrada);
    }
    expect(IDS_DE_TEMAS.map((id) => entradaDelIndice(id).id)).toEqual([...IDS_DE_TEMAS]);
  });

  it('el código en línea de cada título tiene su pareja de comillas invertidas (la pantalla lo pinta como código)', () => {
    for (const entrada of INDICE_DEL_LIBRO) {
      expect((entrada.titulo.match(/`/g) ?? []).length % 2, entrada.id).toBe(0);
    }
  });
});

describe('temaCompleto: la entrada del índice con el contenido redactado', () => {
  const contenido: ContenidoDelTema = {
    paraEmpezar: { situacion: 'Una situación.', programa: 'u6-for/tabla' },
    idea: ['Uno.', 'Dos.', 'Tres.'],
    comoSeEscribe: [{ tipo: 'parrafo', texto: 'Texto.' }],
    pasoAPaso: { queObservar: 'Mira.', programa: 'u6-for/suma', sugerirReto: false },
    erroresTipicos: [{ texto: 'Error.', programa: 'u6-for/error' }],
    ponteAPrueba: [
      { pregunta: 'Uno.', programa: 'u6-for/prueba-uno' },
      { pregunta: 'Dos.', programa: 'u6-for/prueba-dos' },
    ],
    ahoraHazloTu: [
      { tipo: 'modificar', consigna: 'Cambia.', solucion: 'u6-for/modificar' },
      { tipo: 'crear', consigna: 'Crea.', solucion: 'u6-for/crear' },
    ],
    resumen: ['A.', 'B.', 'C.'],
  };

  it('trae del índice el id, la unidad, la oleada, el orden, el título y el estado, y del contenido todo lo demás', () => {
    const tema = temaCompleto('u6-for', contenido);
    expect(tema).toMatchObject({ id: 'u6-for', unidad: 6, oleada: 1, orden: 5, titulo: 'El ciclo `for`', estado: 'borrador' });
    expect(tema.paraEmpezar.programa).toBe('u6-for/tabla');
    expect(tema.resumen).toEqual(['A.', 'B.', 'C.']);
  });

  it('con otro id toma los datos de ese otro tema (no es siempre el mismo)', () => {
    expect(temaCompleto('u3-entrada-con-scanner', contenido)).toMatchObject({ unidad: 3, oleada: 1, orden: 5, titulo: 'Leer datos con `Scanner`' });
  });
});

describe('las ocho secciones de un tema, en este orden y empezando por el ejemplo (REQ-LIBRO-002)', () => {
  it('son «Para empezar», «La idea», «Cómo se escribe», «Míralo paso a paso», «Errores típicos», «Ponte a prueba», «Ahora hazlo tú» y «En resumen»', () => {
    expect(SECCIONES_DEL_TEMA.map((seccion) => seccion.titulo)).toEqual([
      'Para empezar',
      'La idea',
      'Cómo se escribe',
      'Míralo paso a paso',
      'Errores típicos',
      'Ponte a prueba',
      'Ahora hazlo tú',
      'En resumen',
    ]);
  });

  it('cada sección tiene un id propio y el primero es el ejemplo', () => {
    const ids = SECCIONES_DEL_TEMA.map((seccion) => seccion.id);
    expect(new Set(ids).size).toBe(8);
    expect(ids[0]).toBe('para-empezar');
  });

  it('las etiquetas del ejemplo que se predice son las del libro: «¿Qué crees que imprime?», «Ver la salida» y «Ver la respuesta»', () => {
    expect(ETIQUETAS_DEL_LIBRO.preguntaDelEjemplo).toBe('¿Qué crees que imprime?');
    expect(ETIQUETAS_DEL_LIBRO.verLaSalida).toBe('Ver la salida');
    expect(ETIQUETAS_DEL_LIBRO.verLaRespuesta).toBe('Ver la respuesta');
  });

  it('«Para comprobar» dice qué entrada se usa solo cuando el programa lee del teclado', () => {
    expect(ETIQUETAS_DEL_LIBRO.paraComprobar(false)).toBe('Para comprobar: debe imprimir');
    expect(ETIQUETAS_DEL_LIBRO.paraComprobar(true)).toBe('Para comprobar: con esta entrada debe imprimir');
  });
});

// Tarea R0.14: los cinco primeros temas de U6 tienen su contenido completo (borrador para el PO). Las reglas son las de `reglas-del-tema.ts`, probadas con temas de muestra en su propio archivo; aquí se aplican al
// contenido real. La relación con los programas y sus goldens la prueba `pruebas/libro/contenido-del-libro.test.ts`.
const PARTE_1_DE_U6: readonly IdTema[] = ['u6-que-es-un-ciclo', 'u6-while', 'u6-contador-acumulador-bandera', 'u6-do-while', 'u6-for'];

describe('borradores de U6, parte 1 (R0.14): los cinco temas con contenido completo', () => {
  it('son exactamente `que-es-un-ciclo`, `while`, `contador-acumulador-bandera`, `do-while` y `for`, en el orden del libro', () => {
    expect(TEMAS_DE_U6.map((tema) => tema.id)).toEqual(PARTE_1_DE_U6);
  });

  it.each(PARTE_1_DE_U6.map((id) => [id] as const))('%s: cumple todas las reglas del tema (8 secciones, 2 o 3 «Ponte a prueba», modificar y crear, ≤ 550 palabras, vocabulario y programas propios)', (id) => {
    const tema = TEMAS_DE_U6.find((candidato) => candidato.id === id);
    expect(tema, `el tema ${id} tiene contenido`).toBeDefined();
    expect(reglasDelTema(tema as NonNullable<typeof tema>)).toEqual([]);
  });

  it.each(PARTE_1_DE_U6.map((id) => [id] as const))('%s: es un borrador sin aprobación y su unidad, oleada, orden y título son los del índice', (id) => {
    const tema = TEMAS_DE_U6.find((candidato) => candidato.id === id);
    expect(tema).toMatchObject({ ...entradaDelIndice(id), estado: 'borrador' });
    expect(tema?.aprobacion).toBeUndefined();
  });

  it.each(PARTE_1_DE_U6.map((id) => [id] as const))('%s: tiene contenido en cada una de las ocho secciones', (id) => {
    const tema = TEMAS_DE_U6.find((candidato) => candidato.id === id) as NonNullable<(typeof TEMAS_DE_U6)[number]>;
    expect(tema.paraEmpezar.situacion.trim().length, 'Para empezar').toBeGreaterThan(0);
    expect(tema.idea.length, 'La idea').toBeGreaterThanOrEqual(3);
    expect(tema.comoSeEscribe.some((bloque) => bloque.tipo === 'forma'), 'Cómo se escribe: la forma general').toBe(true);
    expect(tema.comoSeEscribe.some((bloque) => bloque.tipo === 'lista'), 'Cómo se escribe: el orden en que Java la ejecuta').toBe(true);
    expect(tema.pasoAPaso.queObservar.trim().length, 'Míralo paso a paso').toBeGreaterThan(0);
    expect(tema.erroresTipicos.length, 'Errores típicos').toBeGreaterThanOrEqual(1);
    expect(tema.ponteAPrueba.length, 'Ponte a prueba').toBeGreaterThanOrEqual(2);
    expect(tema.ahoraHazloTu.map((tarea) => tarea.tipo), 'Ahora hazlo tú').toEqual(['modificar', 'crear']);
    expect(tema.resumen.every((vineta) => vineta.trim().length > 0), 'En resumen').toBe(true);
  });

  it('cada tema tiene un tamaño de tema de verdad: entre 250 y 550 palabras, y el promedio de los cinco se queda cerca de la meta de 400', () => {
    const cuentas = TEMAS_DE_U6.map((tema) => palabrasDelTema(tema));
    for (const [posicion, palabras] of cuentas.entries()) {
      expect(palabras, TEMAS_DE_U6[posicion]?.id).toBeGreaterThanOrEqual(250);
      expect(palabras, TEMAS_DE_U6[posicion]?.id).toBeLessThanOrEqual(MAXIMO_DE_PALABRAS);
    }
    const promedio = cuentas.reduce((suma, palabras) => suma + palabras, 0) / cuentas.length;
    expect(promedio).toBeGreaterThanOrEqual(META_DE_PALABRAS - 100);
    expect(promedio).toBeLessThanOrEqual(META_DE_PALABRAS + 100);
  });

  it('cada tema empieza por un ejemplo propio y el «Míralo paso a paso» es otro programa distinto (el hermano con el que se practica)', () => {
    for (const tema of TEMAS_DE_U6) {
      expect(tema.paraEmpezar.programa, tema.id).not.toBe(tema.pasoAPaso.programa);
    }
  });
});
