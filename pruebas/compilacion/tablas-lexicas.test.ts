// Tarea 1.33 (V, N2, N3 y N4): `compilar()` responde lo mismo que javac 17.0.18 en CADA fila de las tablas de verdad de `tablas-lexicas.ts` — los
// literales numéricos (los que javac acepta y los que rechaza), las 54 palabras reservadas y los 17 identificadores contextuales como nombre de una
// variable en cinco contextos y de una clase, las formas de `yield` y las etiquetas `case` con flecha — y, cuando javac rechaza, en la MISMA línea.
// Sin JDK: las tablas son datos; su verificación contra javac es `herramientas/oraculo/tablas-lexicas.test.ts` (`npm run test:oraculo`). Es la prueba
// de PUNTA A PUNTA (léxico, sintaxis, atribución, alcanzabilidad y asignación) de lo que `literales.test.ts`, `palabras-y-nombres.test.ts` y
// `atribucion.test.ts` prueban capa por capa.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import type { ResultadoCompilacion } from '../../src/motor/index.ts';
import { PALABRAS_RESERVADAS_JAVA } from '../../src/motor/biblioteca/datos/palabras-reservadas-java.generado.ts';
import {
  CLAVE_DE_GUION_BAJO_ILEGAL,
  CODIGO_POR_CLASE_DE_LITERAL,
  CONTEXTOS_DE_NOMBRE,
  ETIQUETAS_DE_CASE,
  FORMAS_DE_YIELD,
  IDENTIFICADORES_CONTEXTUALES,
  LINEA_DE_LA_CLASE,
  LINEA_DE_YIELD,
  LINEA_DEL_CASE,
  LINEA_DEL_LITERAL,
  LINEA_DEL_NOMBRE,
  LITERALES_ACEPTADOS,
  LITERALES_RECHAZADOS,
  NOMBRES_DE_CLASE_RESTRINGIDOS,
  PALABRAS_RESERVADAS_DE_JAVA,
  programaConCaseConFlecha,
  programaConClase,
  programaConLiteral,
  programaConNombre,
  programaConYield,
} from './tablas-lexicas.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));

/** El problema de `compilar()`; falla si el programa "compiló" (falta la IR del lote 2, así que un programa aceptado por todas las pasadas da `ejecucion-no-disponible`). */
function problemaDe(fuente: string): Extract<ResultadoCompilacion, { ok: false }>['problema'] {
  const resultado = compilar(fuente);
  if (resultado.ok) throw new Error('se esperaba un problema (falta la IR del lote 2, un aviso o un rechazo), no ok: true');
  return resultado.problema;
}

/** ¿`compilar()` aceptó el programa? `ok`, o `ejecucion-no-disponible` (todas las pasadas lo aceptaron y solo falta ejecutarlo). Un aviso NO es aceptarlo. */
function aceptaElPrograma(fuente: string): boolean {
  const resultado = compilar(fuente);
  return resultado.ok || (resultado.problema.categoria === 'no-disponible' && resultado.problema.codigo === 'ejecucion-no-disponible');
}

describe('tablas léxicas — los literales numéricos (N3, N4)', () => {
  it('las tablas tienen el tamaño esperado (guarda contra una tabla mal armada)', () => {
    expect(LITERALES_ACEPTADOS).toHaveLength(8 + 6 + 23 + 8 + 9 + 9 + 6 + 18);
    expect(LITERALES_RECHAZADOS).toHaveLength(37 + 5 + 4 + 10 + 1);
    expect(new Set([...LITERALES_ACEPTADOS, ...LITERALES_RECHAZADOS].map((l) => l.texto)).size).toBe(LITERALES_ACEPTADOS.length + LITERALES_RECHAZADOS.length);
  });

  it.each(LITERALES_ACEPTADOS.map((l) => [l.texto, l.clase] as const))('«%s» (%s) lo acepta javac: compilar() no lo rechaza y lo responde con el código de su clase', (texto, clase) => {
    expect(problemaDe(programaConLiteral(texto))).toMatchObject({ categoria: 'no-disponible', codigo: CODIGO_POR_CLASE_DE_LITERAL[clase] });
  });

  it.each(LITERALES_RECHAZADOS.map((l) => [l.texto, l.codigoJavac] as const))('«%s» lo rechaza javac (%s): compilar() lo rechaza también, en la línea de javac', (texto, codigoJavac) => {
    const problema = problemaDe(programaConLiteral(texto));
    expect(problema).toMatchObject({ categoria: 'error-compilacion', linea: LINEA_DEL_LITERAL });
    if (codigoJavac === CLAVE_DE_GUION_BAJO_ILEGAL) {
      expect(problema.codigo).toBe('guion-bajo-mal-puesto');
      // Los datos traen el literal tal como se escribió, hasta donde javac lo lee (`0_8` es el literal `0_` y un `8` suelto).
      const numero = (problema.datos as { numero: string }).numero;
      expect(texto.startsWith(numero), texto).toBe(true);
      expect(numero, texto).toContain('_');
    } else {
      expect(problema.codigo, texto).not.toBe('guion-bajo-mal-puesto');
    }
  });
});

describe('tablas léxicas — las palabras reservadas y los identificadores contextuales como NOMBRE (V, N2)', () => {
  it('la lista de la tabla es la que el oráculo leyó de javac: las 54, y la misma que usa el analizador léxico', () => {
    const delOraculo = (JSON.parse(readFileSync(resolve(AQUI, '..', '..', 'corpus', 'datos', 'lexico', 'palabras-reservadas.json'), 'utf-8')) as { reservadas: string[] }).reservadas;
    expect(PALABRAS_RESERVADAS_DE_JAVA).toHaveLength(54);
    expect([...PALABRAS_RESERVADAS_DE_JAVA].sort()).toEqual([...delOraculo].sort());
    expect([...PALABRAS_RESERVADAS_DE_JAVA].sort()).toEqual([...PALABRAS_RESERVADAS_JAVA].sort());
  });

  it('ningún identificador contextual es una palabra reservada, y los cinco restringidos son contextuales', () => {
    expect(IDENTIFICADORES_CONTEXTUALES).toHaveLength(17);
    expect(IDENTIFICADORES_CONTEXTUALES.filter((nombre) => PALABRAS_RESERVADAS_DE_JAVA.includes(nombre))).toEqual([]);
    expect(NOMBRES_DE_CLASE_RESTRINGIDOS.filter((nombre) => !IDENTIFICADORES_CONTEXTUALES.includes(nombre))).toEqual([]);
  });

  it.each(CONTEXTOS_DE_NOMBRE)('contexto «%s»: cada una de las 54 palabras reservadas es un error en la línea de javac, con la palabra por nombre; cada identificador contextual es un nombre válido', (contexto) => {
    const desacuerdos: string[] = [];
    for (const palabra of PALABRAS_RESERVADAS_DE_JAVA) {
      const problema = problemaDe(programaConNombre(palabra, contexto));
      if (problema.categoria !== 'error-compilacion' || problema.linea !== LINEA_DEL_NOMBRE) {
        desacuerdos.push(`${palabra}: se esperaba un error en la línea ${LINEA_DEL_NOMBRE} y salió ${problema.categoria}/${problema.codigo} en la línea ${problema.linea}`);
        continue;
      }
      // `String instanceof = "a";` es la expresión `String instanceof <tipo>` y `=` la interrumpe: un error de sintaxis, no un nombre reservado.
      const esperaElNombre = !(palabra === 'instanceof' && contexto === 'tipo-de-referencia');
      if (esperaElNombre && (problema.codigo !== 'palabra-reservada-como-nombre' || (problema.datos as { palabra: string }).palabra !== palabra)) {
        desacuerdos.push(`${palabra}: se esperaba palabra-reservada-como-nombre y salió ${problema.codigo}`);
      }
    }
    for (const nombre of IDENTIFICADORES_CONTEXTUALES) {
      if (!aceptaElPrograma(programaConNombre(nombre, contexto))) desacuerdos.push(`${nombre}: javac lo compila y compilar() no lo acepta`);
    }
    expect(desacuerdos).toEqual([]);
  });

  it('como nombre de la CLASE: las 54 reservadas y los 5 restringidos son un error en la línea 1; los otros 12 contextuales son una clase válida', () => {
    const desacuerdos: string[] = [];
    for (const nombre of [...PALABRAS_RESERVADAS_DE_JAVA, ...NOMBRES_DE_CLASE_RESTRINGIDOS]) {
      const problema = problemaDe(programaConClase(nombre));
      if (problema.categoria !== 'error-compilacion' || problema.linea !== LINEA_DE_LA_CLASE) {
        desacuerdos.push(`${nombre}: se esperaba un error en la línea 1 y salió ${problema.categoria}/${problema.codigo} en la línea ${problema.linea}`);
      }
    }
    for (const nombre of NOMBRES_DE_CLASE_RESTRINGIDOS) {
      const problema = problemaDe(programaConClase(nombre));
      if (!problema.datos || !JSON.stringify(problema.datos).includes(`\\"${nombre}\\"`)) desacuerdos.push(`${nombre}: el mensaje no nombra la palabra`);
    }
    for (const nombre of IDENTIFICADORES_CONTEXTUALES.filter((n) => !NOMBRES_DE_CLASE_RESTRINGIDOS.includes(n))) {
      if (!aceptaElPrograma(programaConClase(nombre))) desacuerdos.push(`${nombre}: javac lo compila como clase y compilar() no lo acepta`);
    }
    expect(desacuerdos).toEqual([]);
  });
});

describe('tablas léxicas — `yield`: la sentencia o una variable llamada `yield` (V)', () => {
  it('la tabla tiene las 18 formas de una variable y las 26 de la sentencia', () => {
    expect(FORMAS_DE_YIELD.filter((f) => !f.esSentencia)).toHaveLength(18);
    expect(FORMAS_DE_YIELD.filter((f) => f.esSentencia)).toHaveLength(26);
  });

  it.each(FORMAS_DE_YIELD.map((f) => [f.cuerpo, f.esSentencia, f.codigoJavac] as const))('«%s»: la sentencia es %s (javac: %s)', (cuerpo, esSentencia, codigoJavac) => {
    const resultado = compilar(programaConYield(cuerpo));
    if (resultado.ok) {
      // Una variable llamada `yield` que javac compila y que no necesita la biblioteca: el programa se ejecuta.
      expect(esSentencia, cuerpo).toBe(false);
      expect(codigoJavac, cuerpo).toBeNull();
      return;
    }
    const problema = resultado.problema;
    if (esSentencia) {
      // La sentencia `yield` es una construcción de Java que el visualizador no soporta: un aviso (javac la rechaza fuera de un `switch` usado como expresión).
      expect(problema).toMatchObject({ categoria: 'no-disponible', codigo: 'yield-no-soportado', linea: LINEA_DE_YIELD });
      return;
    }
    // Una variable llamada `yield`: nunca la sentencia. Si javac compila el programa, nosotros no lo rechazamos; si javac lo rechaza por OTRA razón
    // (`yield.toString()` sobre un `int`, `yield()` sin calificar), la respuesta es la de esa razón o un aviso, jamás `yield-no-soportado`.
    expect(problema.codigo, cuerpo).not.toBe('yield-no-soportado');
    if (codigoJavac === null) {
      // Las asignaciones compuestas de bits (`yield &= 1;`, `yield <<= 1;`) son otra construcción que el visualizador todavía no soporta: su propio aviso.
      // Lo demás que javac compila se ejecuta (`ok`) o, si necesita la biblioteca o un `double`, es `ejecucion-no-disponible`.
      const esperado = /[|&^]=|<<=|>>=/.test(cuerpo) ? 'asignacion-de-bits' : 'ejecucion-no-disponible';
      expect(problema, cuerpo).toMatchObject({ categoria: 'no-disponible', codigo: esperado });
    } else {
      expect(problema.linea, cuerpo).toBe(LINEA_DE_YIELD);
    }
  });
});

describe('tablas léxicas — `case` con flecha: `case s ->` no es una lambda (N4)', () => {
  it.each(ETIQUETAS_DE_CASE.map((e) => [e.etiqueta, e.codigoJavac] as const))('«case %s ->» (javac: %s) es el aviso de `switch` con flecha, nunca un error de sintaxis', (etiqueta) => {
    expect(problemaDe(programaConCaseConFlecha(etiqueta))).toMatchObject({ categoria: 'no-disponible', codigo: 'switch-flecha-no-soportado', linea: LINEA_DEL_CASE });
  });
});
