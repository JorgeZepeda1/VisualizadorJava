// RED/GREEN de la tarea 2.9 (REQ-BIB-006, REQ-DIFF-003): `String` contra el JDK 17 REAL — `corpus/datos/cadenas/operaciones.tsv` (≈ 15 000 operaciones sobre ~50 cadenas de aula y de
// trampas: Latin-1 y UTF-16, sustitutos, `ß`, `İ`, sigma final, U+00A0, `\u0000`; con las variantes `…Mismo` que dicen si el resultado ES el mismo objeto) y los mapeos de
// mayúsculas/minúsculas de TODOS los puntos de código del plano básico y del plano 1 (`corpus/datos/caracteres/*-especiales.csv` + las correspondencias simples de `rangos.csv`).
import { describe, expect, it } from 'vitest';
import { ExcepcionJava } from '../../../src/motor/biblioteca/excepciones/excepcion-java.ts';
import { type CadenaJava, nuevaCadena } from '../../../src/motor/biblioteca/texto/cadena-java.ts';
import { StringJava as S } from '../../../src/motor/biblioteca/texto/string.ts';
import { desescaparCampo } from '../../../herramientas/oraculo/generar-conjuntos.ts';
import { leerConjunto } from './conjuntos.ts';

function resultadoDe(valor: CadenaJava | number | boolean): string {
  return typeof valor === 'object' ? valor.texto : String(valor);
}

/** Ejecuta la operación del conjunto con la biblioteca; `s` entra como instancia nueva y los `…Mismo` comparan identidad. */
function ejecutar(operacion: string, s: CadenaJava, args: readonly string[]): CadenaJava | number | boolean {
  const cadena = (i: number): CadenaJava => nuevaCadena(args[i] as string);
  const entero = (i: number): number => Number(args[i]);
  switch (operacion) {
    case 'length':
      return S.length(s);
    case 'charAt':
      return S.charAt(s, entero(0));
    case 'substring1':
      return S.substring(s, entero(0));
    case 'substring2':
      return S.substring(s, entero(0), entero(1));
    case 'substring1Mismo':
      return S.substring(s, entero(0)) === s;
    case 'substring2Mismo':
      return S.substring(s, entero(0), entero(1)) === s;
    case 'indexOf':
      return S.indexOf(s, cadena(0));
    case 'indexOfDesde':
      return S.indexOf(s, cadena(0), entero(1));
    case 'indexOfChar':
      return S.indexOfChar(s, entero(0));
    case 'equals':
      return S.equals(s, cadena(0));
    case 'equalsIgnoreCase':
      return S.equalsIgnoreCase(s, cadena(0));
    case 'compareTo':
      return S.compareTo(s, cadena(0));
    case 'toUpperCase':
      return S.toUpperCase(s);
    case 'toLowerCase':
      return S.toLowerCase(s);
    case 'toUpperCaseMismo':
      return S.toUpperCase(s) === s;
    case 'toLowerCaseMismo':
      return S.toLowerCase(s) === s;
    case 'trim':
      return S.trim(s);
    case 'trimMismo':
      return S.trim(s) === s;
    case 'isEmpty':
      return S.isEmpty(s);
    case 'contains':
      return S.contains(s, cadena(0));
    case 'startsWith':
      return S.startsWith(s, cadena(0));
    case 'endsWith':
      return S.endsWith(s, cadena(0));
    case 'replace':
      return S.replace(s, cadena(0), cadena(1));
    case 'replaceMismo':
      return S.replace(s, cadena(0), cadena(1)) === s;
    case 'replaceChar':
      return S.replaceChar(s, entero(0), entero(1));
    case 'replaceCharMismo':
      return S.replaceChar(s, entero(0), entero(1)) === s;
    default:
      throw new Error(`operación desconocida: ${operacion}`);
  }
}

describe('String contra el JDK 17 real (corpus/datos/cadenas)', () => {
  const lineas = leerConjunto('cadenas', 'operaciones.tsv')
    .split('\n')
    .filter((linea) => linea !== '')
    .map((linea) => {
      const campos = linea.split('\t');
      const resultado = desescaparCampo((campos.pop() as string).slice(2));
      const [operacion, texto, ...args] = campos.map(desescaparCampo) as [string, string, ...string[]];
      return { operacion, texto, args, resultado };
    });

  it('el conjunto es grande y trae operaciones, excepciones y variantes de identidad', () => {
    expect(lineas.length).toBeGreaterThan(15_000);
    expect(lineas.filter((l) => l.resultado.startsWith('EX:')).length).toBeGreaterThan(500);
    expect(lineas.filter((l) => l.operacion.endsWith('Mismo') && l.resultado === 'OK:true').length).toBeGreaterThan(50);
  });

  it('el 100 % de las operaciones coincide (valor, excepción con su mensaje, o identidad)', () => {
    const fallos: string[] = [];
    for (const { operacion, texto, args, resultado } of lineas) {
      let obtenido: string;
      try {
        obtenido = `OK:${resultadoDe(ejecutar(operacion, nuevaCadena(texto), args))}`;
      } catch (error) {
        if (!(error instanceof ExcepcionJava)) throw error;
        obtenido = `EX:${error.clase}:${error.mensaje ?? 'null'}`;
      }
      if (obtenido !== resultado && fallos.length < 12) fallos.push(`${operacion}(${JSON.stringify([texto, ...args])}): Java ${JSON.stringify(resultado)}, motor ${JSON.stringify(obtenido)}`);
    }
    expect(fallos).toEqual([]);
  });
});

describe('toUpperCase / toLowerCase de cada punto de código contra el JDK 17 real', () => {
  function leerEspeciales(archivo: string): Map<number, string> {
    return new Map(
      leerConjunto('caracteres', archivo)
        .split('\n')
        .filter((linea) => linea !== '')
        .map((linea) => {
          const [punto, resultado] = linea.split(',') as [string, string];
          return [Number(punto), resultado.split(' ').map((hex) => String.fromCodePoint(Number.parseInt(hex, 16))).join('')] as const;
        }),
    );
  }

  const tramos = leerConjunto('caracteres', 'rangos.csv')
    .split('\n')
    .filter((linea) => linea !== '')
    .map((linea) => linea.split(',').map(Number) as [number, number, number, number]);
  const simples = new Array<[number, number]>(65_536);
  tramos.forEach(([inicio, , deltaMayuscula, deltaMinuscula], indice) => {
    const fin = indice + 1 < tramos.length ? (tramos[indice + 1] as number[])[0]! : 65_536;
    for (let punto = inicio; punto < fin; punto++) simples[punto] = [punto + deltaMayuscula, punto + deltaMinuscula];
  });

  for (const [nombre, archivo, indice, operacion] of [
    ['mayúsculas', 'mayusculas-especiales.csv', 0, S.toUpperCase],
    ['minúsculas', 'minusculas-especiales.csv', 1, S.toLowerCase],
  ] as const) {
    it(`${nombre}: los 131 070 puntos de código del plano básico y el plano 1 coinciden`, () => {
      const especiales = leerEspeciales(archivo);
      expect(especiales.size).toBeGreaterThan(100);
      const fallos: string[] = [];
      for (let punto = 0; punto <= 0x1ffff; punto++) {
        if (punto >= 0xd800 && punto <= 0xdfff) continue;
        const esperado = especiales.get(punto) ?? (punto < 0x10000 ? String.fromCharCode((simples[punto] as [number, number])[indice]) : String.fromCodePoint(punto));
        const obtenido = operacion(nuevaCadena(String.fromCodePoint(punto))).texto;
        if (obtenido !== esperado && fallos.length < 8) fallos.push(`U+${punto.toString(16)}: Java ${JSON.stringify(esperado)}, motor ${JSON.stringify(obtenido)}`);
      }
      expect(fallos).toEqual([]);
    });
  }
});
