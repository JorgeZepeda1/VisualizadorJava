// Tarea 1.37 (W-12 de la verificación del delta del lote 1): el tope de anidamiento, de punta a punta por `compilar()`. El verificador halló 9 de 21 formas de anidar que lanzaban `RangeError` (la pantalla
// decía «Algo falló dentro del visualizador») dentro del tope de 4 000 tokens: 700 paréntesis con la pila por omisión de Node, unos 400 en Chromium, y las cadenas de `&&` desde unos 1 000 términos.
// Aquí se vigila, en `npm test`:
//   1. cada una de esas 21 formas (`formas-anidadas.ts`), a la profundidad MÁS GRANDE que el analizador deja pasar y a la siguiente: la primera se revisa como siempre (jamás el aviso de anidamiento) y la
//      siguiente es el aviso honesto, sin lanzar nada en ningún caso;
//   2. que los topes están MUY por encima de lo que escribe un alumno (diez veces o más el programa más anidado del currículo, `corpus/curso/`).
// Que esas mismas 21 formas, a esa profundidad, no agoten la pila en Chromium, Firefox y WebKit lo mide `pruebas/e2e/anidamiento.spec.ts` con el trabajador REAL (acá no hay navegador).
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/compilador.ts';
import { tokenizar } from '../../src/motor/lexico/analizador-lexico.ts';
import { MAXIMO_DE_NIVELES_DE_ANIDAMIENTO, MAXIMO_DE_PROFUNDIDAD_DEL_ARBOL, ProgramaDemasiadoAnidado, SIN_LIMITES_DE_ANIDAMIENTO } from '../../src/motor/limites.ts';
import { analizarPrograma } from '../../src/motor/sintaxis/analizador-sintactico.ts';
import { profundidadMaximaDelArbol } from '../../src/motor/sintaxis/profundidad.ts';
import { FORMAS_ANIDADAS, LINEA_DEL_CUERPO, profundidadMaximaPermitida, profundidadMaximaQueCabeEnLosTokens, programaConForma } from './formas-anidadas.ts';

describe('las 21 formas de anidar del verificador — a la profundidad máxima que cabe y a la siguiente (tarea 1.37, W-12)', () => {
  it('son 21, con nombres distintos', () => {
    expect(FORMAS_ANIDADAS).toHaveLength(21);
    expect(new Set(FORMAS_ANIDADAS.map((forma) => forma.nombre)).size).toBe(21);
  });

  it.each(FORMAS_ANIDADAS.map((forma) => [forma.nombre, forma] as const))('«%s»: lo que cabe en los topes se revisa como siempre, y la siguiente profundidad es el aviso honesto (nunca una excepción)', (_nombre, forma) => {
    const maxima = profundidadMaximaPermitida(forma);
    expect(maxima, 'la forma entra en los topes con al menos 25 repeticiones (un programa de clase usa menos de 10)').toBeGreaterThanOrEqual(25);
    // Con la profundidad máxima que cabe: se revisa (ok, un error del programa o una ejecución no disponible), pero NUNCA el aviso de anidamiento.
    const dentro = compilar(programaConForma(forma, maxima));
    if (!dentro.ok) expect(dentro.problema.codigo).not.toBe('programa-demasiado-anidado');
    // Con una más: el aviso, en la línea donde está la forma.
    const fuera = compilar(programaConForma(forma, maxima + 1));
    if (fuera.ok) throw new Error(`se esperaba el aviso con ${maxima + 1} repeticiones`);
    expect(fuera.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'programa-demasiado-anidado', datos: {}, linea: LINEA_DEL_CUERPO });
  });

  it.each(FORMAS_ANIDADAS.map((forma) => [forma.nombre, forma] as const))('«%s»: a la profundidad máxima que cabe en 4 000 tokens (la que agotaba la pila) es el aviso, sin lanzar nada', (_nombre, forma) => {
    const resultado = compilar(programaConForma(forma, profundidadMaximaQueCabeEnLosTokens(forma)));
    if (resultado.ok) throw new Error('se esperaba el aviso');
    expect(resultado.problema).toMatchObject({ categoria: 'no-disponible', codigo: 'programa-demasiado-anidado' });
  });
});

describe('los topes de anidamiento están muy por encima del currículo (diez veces o más) y por debajo de lo que agota la pila (tarea 1.37, W-12)', () => {
  const RUTA_DEL_CURSO = resolve('corpus/curso');
  const programasDelCurso = readdirSync(RUTA_DEL_CURSO)
    .filter((nombre) => nombre.endsWith('.java'))
    .sort()
    .map((nombre) => ({ nombre, fuente: readFileSync(resolve(RUTA_DEL_CURSO, nombre), 'utf-8') }));

  /** Los niveles de recursión que usa el analizador con el programa: el tope más chico con el que todavía lo analiza. */
  function nivelesDelAnalizador(fuente: string): number {
    const tokens = tokenizar(fuente);
    let bajo = 0;
    let alto = 400;
    while (bajo < alto) {
      const medio = (bajo + alto) >> 1;
      try {
        analizarPrograma(tokens, { niveles: medio, arbol: Number.POSITIVE_INFINITY });
        alto = medio;
      } catch (error) {
        if (!(error instanceof ProgramaDemasiadoAnidado)) throw error;
        bajo = medio + 1;
      }
    }
    return bajo;
  }

  it('el currículo (los 35 programas de corpus/curso) cabe en los topes: ninguno es el aviso de anidamiento', () => {
    expect(programasDelCurso.length).toBeGreaterThanOrEqual(35);
    for (const { nombre, fuente } of programasDelCurso) {
      const resultado = compilar(fuente);
      if (!resultado.ok) expect(resultado.problema.codigo, nombre).not.toBe('programa-demasiado-anidado');
    }
  });

  it('el tope de la RECURSIÓN del analizador es diez veces o más el programa más anidado del currículo', () => {
    const masAnidado = Math.max(...programasDelCurso.map(({ fuente }) => nivelesDelAnalizador(fuente)));
    expect(masAnidado, 'el currículo anida de verdad (ciclos dentro de ciclos, un menú con `if`)').toBeGreaterThanOrEqual(5);
    expect(MAXIMO_DE_NIVELES_DE_ANIDAMIENTO).toBeGreaterThanOrEqual(10 * masAnidado);
  });

  it('el tope de PROFUNDIDAD DEL ÁRBOL es diez veces o más el programa más hondo del currículo', () => {
    const masHondo = Math.max(...programasDelCurso.map(({ fuente }) => profundidadMaximaDelArbol(analizarPrograma(tokenizar(fuente), SIN_LIMITES_DE_ANIDAMIENTO))));
    expect(masHondo).toBeGreaterThanOrEqual(5);
    expect(MAXIMO_DE_PROFUNDIDAD_DEL_ARBOL).toBeGreaterThanOrEqual(10 * masHondo);
  });

  it('los topes siguen siendo un múltiplo chico de lo que un navegador aguanta: la RECURSIÓN no pasa de 150 niveles y el ÁRBOL de 300 (Chromium, el peor, aguantó 300 paréntesis y 800 términos de un `&&`)', () => {
    expect(MAXIMO_DE_NIVELES_DE_ANIDAMIENTO).toBeLessThanOrEqual(150);
    expect(MAXIMO_DE_PROFUNDIDAD_DEL_ARBOL).toBeLessThanOrEqual(300);
  });
});
