// RED de la tarea R0.11 (REQ-AULA-001, ADR 015 y 017): el catálogo de la galería «Ejemplos». Cada programa del curso (corpus/curso, 35) y la máquina de snacks del PO tiene su título y UNA línea de «Qué observar»
// —lo que el alumno debe mirar mientras avanza paso a paso—; algunos son de DEMOSTRACIÓN (abren con el aviso del revisor en «después», REQ-AULA-001). Borradores para la revisión del PO en R0.16. Las
// afirmaciones sobre lo que hace un programa se revisan contra su código y su salida en `pruebas/arquitectura/galeria-completa.test.ts` y a mano en la revisión del PO.
import { describe, expect, it } from 'vitest';
import { ORDEN_DE_LA_GALERIA, textosGaleria, type IdDeGaleria } from './galeria.ts';

const TODOS: readonly IdDeGaleria[] = ORDEN_DE_LA_GALERIA.flatMap((seccion) => seccion.programas);

describe('textosGaleria: el orden de la galería', () => {
  it('empieza con «Para empezar» (el ejercicio del PO) y sigue con las unidades 3 a 7, en orden', () => {
    expect(ORDEN_DE_LA_GALERIA.map((seccion) => seccion.unidad)).toEqual([null, 3, 4, 5, 6, 7]);
    expect(ORDEN_DE_LA_GALERIA[0]?.programas).toEqual(['maquina-snacks']);
  });

  it('son 36 programas, sin repetir: los 35 de corpus/curso y la máquina de snacks', () => {
    expect(TODOS).toHaveLength(36);
    expect(new Set(TODOS).size).toBe(36);
  });

  it('cada programa curricular está en la sección de SU unidad (el id empieza por u3-… a u7-…)', () => {
    for (const seccion of ORDEN_DE_LA_GALERIA) {
      if (seccion.unidad === null) continue;
      for (const id of seccion.programas) expect(id.startsWith(`u${seccion.unidad}-`), id).toBe(true);
    }
  });

  it('las unidades tienen su título y la sección inicial el suyo', () => {
    expect(textosGaleria.seccion.paraEmpezar()).toBe('Para empezar');
    for (const unidad of [3, 4, 5, 6, 7] as const) expect(textosGaleria.seccion.unidad(unidad).startsWith(`Unidad ${unidad}`), String(unidad)).toBe(true);
  });
});

describe('textosGaleria: un título y una línea de «Qué observar» por programa', () => {
  it('cada programa tiene título y «Qué observar», sin marcadores sin resolver', () => {
    for (const id of TODOS) {
      const { titulo, queObservar } = textosGaleria.programa(id);
      expect(titulo.trim().length, `${id} título`).toBeGreaterThan(3);
      expect(queObservar.trim().length, `${id} qué observar`).toBeGreaterThan(30);
      for (const texto of [titulo, queObservar]) expect(texto, id).not.toMatch(/[{}]|undefined|NaN|\[object/);
    }
  });

  it('«Qué observar» es UNA línea corta (≤ 220 caracteres) y los fragmentos de código van entre comillas invertidas, bien cerradas', () => {
    for (const id of TODOS) {
      const { queObservar } = textosGaleria.programa(id);
      expect(queObservar.length, id).toBeLessThanOrEqual(220);
      expect(queObservar.split('`').length % 2, `${id}: comillas invertidas sin cerrar`).toBe(1);
      expect(queObservar.includes('\n'), id).toBe(false);
    }
  });

  it('los títulos son distintos entre sí', () => {
    const titulos = TODOS.map((id) => textosGaleria.programa(id).titulo);
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it('respeta la voz y el vocabulario de los robots: sin «verdadero»/«falso», «vuelta» y no «iteración», sin primera persona', () => {
    for (const id of TODOS) {
      const { titulo, queObservar } = textosGaleria.programa(id);
      for (const texto of [titulo, queObservar]) {
        expect(texto, id).not.toMatch(/\b(verdader[oa]s?|fals[oa]s?)\b/i);
        expect(texto, id).not.toMatch(/iteraci[oó]n/i);
        expect(texto, id).not.toMatch(/(^|[.:;¡!?]\s+)(Reviso|Guardo|Creo|Calculo|Imprimo)(?![\p{L}])/u);
      }
    }
  });

  it('nunca da por hecho lo que el alumno debe predecir: los programas de predicción preguntan y no cuentan el resultado', () => {
    for (const id of ['u4-prediccion-precedencia', 'u4-prediccion-or-logico', 'u6-prediccion-while-no-ejecuta', 'u5-escalera-else-if-orden-incorrecto', 'u5-switch-sin-break-fallthrough', 'u6-error-por-uno'] as const) {
      expect(textosGaleria.programa(id).queObservar, id).toMatch(/[¿?]/);
    }
  });
});

describe('textosGaleria: de dónde viene cada programa y qué es una demostración', () => {
  it('distingue el programa del curso del ejercicio del profesor (REQ-AULA-001: el origen se marca)', () => {
    expect(textosGaleria.origen('curricular')).toBe('Del curso');
    expect(textosGaleria.origen('del-po')).toBe('Ejercicio del profesor');
  });

  it('los programas de demostración son los de la propuesta del diseño (§2.5): predicción y trampas', () => {
    expect([...textosGaleria.demostraciones].sort()).toEqual(
      ['u4-prediccion-or-logico', 'u4-prediccion-precedencia', 'u5-escalera-else-if-orden-incorrecto', 'u5-switch-sin-break-fallthrough', 'u6-ciclo-infinito-demo', 'u6-error-por-uno', 'u6-prediccion-while-no-ejecuta'].sort(),
    );
    for (const id of textosGaleria.demostraciones) expect(TODOS, id).toContain(id);
  });
});

describe('textosGaleria: la máquina de snacks y sus cinco datos de ejemplo', () => {
  const MUESTRAS = textosGaleria.muestrasDeLaMaquinaDeSnacks;

  it('tiene cinco datos de ejemplo, empezando por a1 2 50 (el que usa la clase)', () => {
    expect(MUESTRAS.map((muestra) => muestra.archivo)).toEqual([
      'maquina-snacks-a1-2-50',
      'maquina-snacks-b2-3-40',
      'maquina-snacks-b3',
      'maquina-snacks-z9',
      'maquina-snacks-a2-5',
    ]);
  });

  it('cada uno dice qué pasa con esos datos, verificado contra lo que imprimió el JDK (compra con cambio, no alcanza, agotado, código inválido, cantidad no válida)', () => {
    expect(MUESTRAS.map((muestra) => muestra.descripcion)).toEqual([
      'Compra completa: 2 papas pagadas con $50 y con cambio',
      'No alcanza el dinero: 3 refrescos cuestan $66 y se pagan $40',
      'Producto agotado: el jugo B3',
      'Código inválido: Z9 no existe',
      'Cantidad no válida: se piden 5 y solo se aceptan de 1 a 3',
    ]);
  });
});

describe('textosGaleria: el resto de la pantalla de ejemplos', () => {
  it('tiene título, ayuda, carga y el nombre de cada acción', () => {
    expect(textosGaleria.titulo()).toBe('Ejemplos');
    expect(textosGaleria.ayuda().length).toBeGreaterThan(20);
    expect(textosGaleria.cargando()).toBe('Cargando los ejemplos…');
    expect(textosGaleria.noSeCargaron()).toBe('No se pudieron cargar los ejemplos. Recarga la página para intentarlo otra vez.');
    expect(textosGaleria.verPasoAPaso()).toBe('Ver paso a paso');
    expect(textosGaleria.conMisDatos()).toBe('Con mis datos');
    expect(textosGaleria.queObservar()).toBe('Qué observar');
  });

  it('las etiquetas de las acciones llevan el título del programa para el lector de pantalla', () => {
    expect(textosGaleria.nombreDeLaAccion('Ver paso a paso', 'Hola, mundo')).toBe('Ver paso a paso: Hola, mundo');
    expect(textosGaleria.datosDeEjemplo('Carlos')).toBe('Datos de ejemplo: Carlos');
  });
});
