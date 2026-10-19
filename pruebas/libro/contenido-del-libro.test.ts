// RED de la tarea R0.14 (REQ-LIBRO-002, REQ-LIBRO-003, REQ-LIBRO-004): el catálogo de los temas (`src/textos/es-MX/libro/`) y el corpus (`corpus/libro/`) cuentan lo mismo. Cada programa que un tema usa existe, con
// el papel que el tema le da y con su golden del oráculo; no sobra ningún programa en la carpeta de un tema; los programas cortos son cortos; y ningún texto escribe a mano una salida de consola: toda salida que el
// libro muestre sale del golden (REQ-LIBRO-003). Las reglas que no necesitan archivos (estructura, palabras, vocabulario) están en `src/textos/es-MX/libro/`. Que el motor coincida con el JDK lo prueba
// `pruebas/diferencial/libro.test.ts`.
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { idsDeProgramasDelLibro, leerProgramaDelLibro } from '../../herramientas/libro-programas.ts';
import { META_DE_PALABRAS, MAXIMO_DE_PALABRAS, palabrasDelTema, programasDelTema, textosDelTema } from '../../src/textos/es-MX/libro/reglas-del-tema.ts';
import { IDS_DE_TEMAS } from '../../src/textos/es-MX/libro/tipos.ts';
import type { PapelDelPrograma, Tema } from '../../src/textos/es-MX/libro/tipos.ts';
import { TEMAS_DE_U6 } from '../../src/textos/es-MX/libro/u6.ts';

// Cuando lleguen las otras unidades (R2, R4) se suman aquí sus temas.
const TEMAS: readonly Tema[] = [...TEMAS_DE_U6];

/** Líneas máximas de un programa según el papel que cumple: el ejemplo de «Para empezar» y las predicciones son cortos; el de «Míralo paso a paso» puede ser un poco más largo. */
const MAXIMO_DE_LINEAS: Readonly<Record<PapelDelPrograma, number>> = {
  'para-empezar': 20,
  'paso-a-paso': 32,
  'error-tipico': 20,
  'ponte-a-prueba': 25,
  solucion: 32,
};

const CODIGO_EN_LINEA = /`[^`]+`/g;
const LARGO_MINIMO_DE_UNA_SALIDA_ESCRITA = 6;

/** Los renglones de la salida de un programa que aparecen tal cual en la prosa de un texto (el código en línea no cuenta: ahí se cita lo que el programa debe escribir). Los renglones de menos de 6 caracteres son números o palabras sueltas. */
function renglonesEscritosEnLaProsa(textos: readonly string[], salida: string): readonly string[] {
  const prosa = textos.map((texto) => texto.replace(CODIGO_EN_LINEA, ' ')).join('\n');
  const renglones = salida
    .split('\n')
    .map((renglon) => renglon.trim())
    .filter((renglon) => renglon.length >= LARGO_MINIMO_DE_UNA_SALIDA_ESCRITA);
  return [...new Set(renglones)].filter((renglon) => prosa.includes(renglon));
}

describe('el catálogo y el corpus del libro cuentan lo mismo (R0.14)', () => {
  it('hay temas con contenido que cruzar (guarda contra un recorrido vacío)', () => {
    expect(TEMAS.length).toBeGreaterThanOrEqual(5);
  });

  it('reporta el tamaño de cada tema contra la meta de 400 palabras y el máximo de 550 (design §5.1)', () => {
    const cuentas = TEMAS.map((tema) => palabrasDelTema(tema));
    const promedio = cuentas.reduce((suma, palabras) => suma + palabras, 0) / cuentas.length;
    console.log(`[libro] palabras por tema (sin código): ${TEMAS.map((tema, i) => `${tema.id}=${cuentas[i]}`).join(', ')}; promedio ${promedio.toFixed(0)} (meta ${META_DE_PALABRAS}, máximo ${MAXIMO_DE_PALABRAS})`);
    expect(Math.max(...cuentas)).toBeLessThanOrEqual(MAXIMO_DE_PALABRAS);
  });

  it('cada carpeta de corpus/libro es un tema de la lista cerrada del libro', () => {
    const carpetas = readdirSync(resolve('corpus', 'libro'), { withFileTypes: true })
      .filter((entrada) => entrada.isDirectory())
      .map((entrada) => entrada.name);
    expect(carpetas.length).toBeGreaterThanOrEqual(5);
    expect(carpetas.filter((carpeta) => !(IDS_DE_TEMAS as readonly string[]).includes(carpeta))).toEqual([]);
  });

  it.each(TEMAS.map((tema) => [tema.id, tema] as const))('%s: la carpeta del tema tiene exactamente los programas que el tema usa, ni uno más ni uno menos', (id, tema) => {
    const enLaCarpeta = idsDeProgramasDelLibro().filter((programa) => programa.startsWith(`${id}/`));
    const queUsaElTema = programasDelTema(tema).map((programa) => programa.id as string);
    expect([...enLaCarpeta].sort()).toEqual([...queUsaElTema].sort());
  });

  describe.each(TEMAS.map((tema) => [tema.id, tema] as const))('%s', (_id, tema) => {
    const programas = programasDelTema(tema).map(({ id, papel }) => ({ papel, programa: leerProgramaDelLibro(id) }));

    it('cada programa tiene en su .meta.json el mismo papel que el tema le da', () => {
      expect(programas.length).toBeGreaterThanOrEqual(7);
      for (const { papel, programa } of programas) {
        expect(programa.meta.papel, programa.id).toBe(papel);
      }
    });

    it('solo un error típico puede ser un programa que javac rechaza: todos los demás se ejecutan y escriben algo', () => {
      for (const { papel, programa } of programas) {
        if (papel === 'error-tipico') continue;
        expect(programa.meta.esperado, programa.id).toBe('ejecuta');
        expect(programa.oraculo.desenlace, programa.id).toBe('normal');
        expect(programa.salida.length, `${programa.id}: la respuesta y el «Para comprobar» salen del golden, que no puede estar vacío`).toBeGreaterThan(0);
      }
    });

    it('un error típico que javac rechaza deja el veredicto de javac en su golden; uno que se ejecuta escribe algo', () => {
      const errores = programas.filter(({ papel }) => papel === 'error-tipico');
      expect(errores.length).toBeGreaterThanOrEqual(1);
      for (const { programa } of errores) {
        if (programa.meta.esperado === 'error-compilacion') expect(programa.errores, programa.id).toMatch(/\.java:\d+: error:/);
        else expect(programa.salida.length, programa.id).toBeGreaterThan(0);
      }
    });

    it('los programas son cortos para leerse en una pantalla (según el papel que cumplen)', () => {
      for (const { papel, programa } of programas) {
        const lineas = programa.fuente.trimEnd().split('\n').length;
        expect(lineas, `${programa.id} (${papel})`).toBeLessThanOrEqual(MAXIMO_DE_LINEAS[papel]);
      }
    });

    it('ningún texto del tema escribe a mano un renglón de lo que imprimen sus programas: las salidas salen del golden', () => {
      const textos = textosDelTema(tema);
      for (const { programa } of programas) {
        expect(renglonesEscritosEnLaProsa(textos, programa.salida), `${programa.id}: renglones de su salida escritos en el texto`).toEqual([]);
      }
    });
  });
});

describe('control: el criterio de «salida escrita a mano» sí detecta una (no es un filtro que nunca dispara)', () => {
  it('detecta un renglón de la salida puesto en la prosa y no lo detecta dentro de código en línea ni si es corto', () => {
    const salida = 'Alumno número 1: presente\nLista terminada\n3\n';
    expect(renglonesEscritosEnLaProsa(['Java escribe Lista terminada al final.'], salida)).toEqual(['Lista terminada']);
    expect(renglonesEscritosEnLaProsa(['Escribe `Lista terminada` al final.'], salida)).toEqual([]);
    expect(renglonesEscritosEnLaProsa(['Escribe 3 veces.'], salida)).toEqual([]);
    expect(renglonesEscritosEnLaProsa(['Otro texto cualquiera.'], salida)).toEqual([]);
  });
});
