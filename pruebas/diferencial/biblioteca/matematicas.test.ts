// RED/GREEN de la tarea 2.6 (REQ-BIB-004, REQ-DIFF-003): `Math` contra el JDK 17 REAL en `corpus/datos/matematicas/operaciones.tsv` (≈ 3 000 operaciones: `abs`, `max`, `min`, `sqrt`, `floor`,
// `ceil` y `round` por tipo, con NaN, ±0, ±Infinity, extremos de `int`/`long`, empates y el `0.49999999999999994` del bug histórico). Los `double` se comparan por sus bits.
import { describe, expect, it } from 'vitest';
import { MathJava as M } from '../../../src/motor/biblioteca/matematicas/math.ts';
import { bitsAHex, bitsDeDouble, doubleDeBits } from '../../../herramientas/oraculo/azar-determinista.ts';
import { desescaparCampo } from '../../../herramientas/oraculo/generar-conjuntos.ts';
import { leerConjunto } from './conjuntos.ts';

type Argumento = number | bigint;

function decodificar(codificado: string): Argumento {
  const valor = codificado.slice(2);
  switch (codificado[0]) {
    case 'd':
    case 'c':
      return Number(valor);
    case 'l':
      return BigInt(valor);
    default:
      return doubleDeBits(BigInt(`0x${valor}`));
  }
}

function describir(valor: number | bigint, comoDouble: boolean): string {
  return comoDouble ? bitsAHex(bitsDeDouble(valor as number)) : String(valor);
}

const OPERACIONES: ReadonlyMap<string, { readonly ejecutar: (a: never, b: never) => number | bigint; readonly devuelveDouble: boolean }> = new Map([
  ['absInt', { ejecutar: M.absInt, devuelveDouble: false }],
  ['absLong', { ejecutar: M.absLong, devuelveDouble: false }],
  ['absDouble', { ejecutar: M.absDouble, devuelveDouble: true }],
  ['maxInt', { ejecutar: M.maxInt, devuelveDouble: false }],
  ['maxLong', { ejecutar: M.maxLong, devuelveDouble: false }],
  ['maxDouble', { ejecutar: M.maxDouble, devuelveDouble: true }],
  ['minInt', { ejecutar: M.minInt, devuelveDouble: false }],
  ['minLong', { ejecutar: M.minLong, devuelveDouble: false }],
  ['minDouble', { ejecutar: M.minDouble, devuelveDouble: true }],
  ['sqrt', { ejecutar: M.sqrt, devuelveDouble: true }],
  ['floor', { ejecutar: M.floor, devuelveDouble: true }],
  ['ceil', { ejecutar: M.ceil, devuelveDouble: true }],
  ['roundDouble', { ejecutar: M.roundDouble, devuelveDouble: false }],
  ['roundInt', { ejecutar: M.roundInt, devuelveDouble: false }],
  ['roundLong', { ejecutar: M.roundLong, devuelveDouble: false }],
  ['roundChar', { ejecutar: M.roundChar, devuelveDouble: false }],
]);

describe('Math contra el JDK 17 real (corpus/datos/matematicas)', () => {
  const lineas = leerConjunto('matematicas', 'operaciones.tsv')
    .split('\n')
    .filter((linea) => linea !== '')
    .map((linea) => {
      const campos = linea.split('\t');
      const resultado = desescaparCampo((campos.pop() as string).slice(2));
      const [operacion, ...argumentos] = campos as [string, ...string[]];
      return { operacion, argumentos, resultado };
    });

  it('el conjunto cubre las 16 operaciones y trae miles de casos', () => {
    expect(lineas.length).toBeGreaterThan(3_000);
    expect(new Set(lineas.map((l) => l.operacion))).toEqual(new Set(OPERACIONES.keys()));
  });

  it('el 100 % de las operaciones coincide (los double por sus bits)', () => {
    const fallos: string[] = [];
    for (const { operacion, argumentos, resultado } of lineas) {
      const definicion = OPERACIONES.get(operacion);
      if (definicion === undefined) throw new Error(`operación sin definir: ${operacion}`);
      const [a, b] = argumentos.map(decodificar) as [Argumento, Argumento];
      const obtenido = `OK:${describir(definicion.ejecutar(a as never, b as never), definicion.devuelveDouble)}`;
      if (obtenido !== resultado && fallos.length < 10) fallos.push(`${operacion}(${argumentos.join(', ')}): Java ${resultado}, motor ${obtenido}`);
    }
    expect(fallos).toEqual([]);
  });
});
