// RED de la tarea 1.31: lo que solo javac puede medir del generador (JDK real, proyecto `oraculo`).
//   1. La mezcla: cerca de la mitad de los programas compila y cerca de la mitad no. Un generador que
//      casi solo produce programas válidos (o casi solo rotos) no ejerce ni las reglas que se aceptan
//      de más ni las que se rechazan de más.
//   2. La sintaxis: ningún programa falla por un error de SINTAXIS que el generador no pretendía. Se
//      mide con el análisis sintáctico de javac mismo (`--solo-sintaxis`): un programa marcado como
//      «sintaxis inválida a propósito» DEBE fallar ahí, y uno que no lo está NO DEBE fallar. Así una
//      discrepancia con el compilador nunca es en realidad un defecto de cómo se imprimió el programa.
//   3. Cada familia conocida de la re-verificación del lote 1 (F1–F6, V) aparece: para ella javac
//      responde como en el hallazgo. Es independiente del estado de nuestro compilador, así que sigue
//      valiendo después de la tarea 1.32.
import { beforeAll, describe, expect, it } from 'vitest';
import { compilarEnLote, type RespuestaJava } from '../compilar-en-lote.ts';
import { localizarJdk, verificarVersionJdk } from '../jdk.ts';
import { generarProgramas } from './generador.ts';
import { etiquetasDe, pretendeErrorDeSintaxis, renderizarPrograma, type Programa } from './programa.ts';

const SEMILLA = 20260929;
const CANTIDAD = 3000;

let programas: readonly Programa[] = [];
let fuentes: readonly { readonly id: string; readonly fuente: string }[] = [];
let completo: Map<string, RespuestaJava>;
let soloSintaxis: Map<string, RespuestaJava>;

beforeAll(async () => {
  const jdk = localizarJdk();
  verificarVersionJdk(jdk);
  programas = generarProgramas(SEMILLA, CANTIDAD);
  fuentes = programas.map((programa, i) => ({ id: `p${i}`, fuente: renderizarPrograma(programa) }));
  completo = await compilarEnLote(jdk, fuentes);
  soloSintaxis = await compilarEnLote(jdk, fuentes, { soloSintaxis: true });
}, 120_000);

describe('la mezcla de programas que javac acepta y rechaza', () => {
  it('entre el 42 % y el 58 % de los programas compila (cercano a 50/50)', () => {
    const compilan = programas.filter((_, i) => completo.get(`p${i}`)?.compila === true).length;
    const proporcion = compilan / CANTIDAD;
    // eslint-disable-next-line no-console -- la proporción medida es el dato que pide la tarea 1.31
    console.log(`[generador] javac compila ${compilan}/${CANTIDAD} = ${(proporcion * 100).toFixed(1)} %`);
    expect(proporcion).toBeGreaterThanOrEqual(0.42);
    expect(proporcion).toBeLessThanOrEqual(0.58);
  });
});

describe('la sintaxis de los programas generados, medida con el analizador sintáctico de javac', () => {
  it('ningún programa falla por un error de sintaxis que el generador no pretendía', () => {
    const sinIntencion = programas.flatMap((programa, i) => {
      const respuesta = soloSintaxis.get(`p${i}`);
      if (respuesta === undefined || respuesta.compila || pretendeErrorDeSintaxis(programa)) return [];
      return [`${respuesta.codigoJavac} (línea ${respuesta.linea}) — ${respuesta.mensajeJavac.split('\n')[0]}\n${fuentes[i]!.fuente}`];
    });
    expect(sinIntencion.slice(0, 3)).toEqual([]);
    expect(sinIntencion).toHaveLength(0);
  });

  it('todo programa marcado como «sintaxis inválida a propósito» SÍ falla en el análisis sintáctico', () => {
    const marcados = programas.flatMap((programa, i) => (pretendeErrorDeSintaxis(programa) ? [i] : []));
    expect(marcados.length, 'hay programas marcados').toBeGreaterThan(20);
    const sinError = marcados.filter((i) => soloSintaxis.get(`p${i}`)?.compila === true).map((i) => fuentes[i]!.fuente);
    expect(sinError.slice(0, 2)).toEqual([]);
    expect(sinError).toHaveLength(0);
  });
});

describe('las familias conocidas de la re-verificación del lote 1 aparecen entre los programas que javac rechaza', () => {
  const rechazadosPorJavac = (): { readonly programa: Programa; readonly respuesta: RespuestaJava }[] =>
    programas.flatMap((programa, i) => {
      const respuesta = completo.get(`p${i}`);
      return respuesta !== undefined && !respuesta.compila ? [{ programa, respuesta }] : [];
    });

  it('F1 cast inválido: `incompatible types` con un cast', () => {
    expect(rechazadosPorJavac().some(({ programa, respuesta }) => respuesta.codigoJavac === 'compiler.err.prob.found.req' && etiquetasDe(programa).includes('cast'))).toBe(true);
  });

  it.each([
    ['F2 miembro de un primitivo', 'compiler.err.cant.deref'],
    ['F3 final con ++/--/asignación', 'compiler.err.cant.assign.val.to.final.var'],
    ['F4 switch con etiqueta duplicada de default', 'compiler.err.duplicate.default.label'],
    ['F5 void como valor', 'compiler.err.void.not.allowed.here'],
    ['F6 método de instancia desde el nombre de la clase', 'compiler.err.non-static.cant.be.ref'],
  ])('%s: javac responde %s', (_familia, clave) => {
    expect(rechazadosPorJavac().some(({ respuesta }) => respuesta.codigoJavac === clave)).toBe(true);
  });

  it('F4 switch con etiqueta de otro tipo: `incompatible types` en un switch', () => {
    expect(rechazadosPorJavac().some(({ programa, respuesta }) => respuesta.codigoJavac === 'compiler.err.prob.found.req' && etiquetasDe(programa).includes('switch'))).toBe(true);
  });

  it('cada familia conocida aparece con frecuencia, no por casualidad: F3 (final modificado) y F6 (instancia por clase) en al menos 25 de 3 000 programas, F2 (miembro de un primitivo) en al menos 40', () => {
    const cuantos = (clave: string): number => rechazadosPorJavac().filter(({ respuesta }) => respuesta.codigoJavac === clave).length;
    expect(cuantos('compiler.err.cant.assign.val.to.final.var')).toBeGreaterThanOrEqual(25);
    expect(cuantos('compiler.err.non-static.cant.be.ref')).toBeGreaterThanOrEqual(25);
    expect(cuantos('compiler.err.cant.deref')).toBeGreaterThanOrEqual(40);
  });

  it('V `var` y `yield` como nombres de variable: javac COMPILA programas que los usan', () => {
    const usando = (palabra: string): boolean =>
      programas.some((programa, i) => completo.get(`p${i}`)?.compila === true && new RegExp(`\\b(?:int|double|String|boolean|char|long) ${palabra}\\b`).test(renderizarPrograma(programa)));
    expect({ var: usando('var'), yield: usando('yield') }).toEqual({ var: true, yield: true });
  });
});
