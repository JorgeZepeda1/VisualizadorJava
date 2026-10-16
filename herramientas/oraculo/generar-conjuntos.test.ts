// Pruebas de los conjuntos de la biblioteca (hito 1, parte A; tarea 2.1 acotada, ADR 010/011). Primero lo PURO (azar determinista, escapes, análisis de la salida de la sonda, compresión en
// tramos) y luego, con el JDK 17 real (este archivo es del proyecto `oraculo`, que exige el JDK): (1) lo guardado en `corpus/datos/` y en `src/motor/biblioteca/datos/*.generado.ts` es
// EXACTAMENTE lo que el JDK da hoy (se regenera todo en un directorio temporal y se exigen bytes idénticos), y (2) el conjunto DENSO de `Double.toString` —que no se guarda por su
// tamaño— se genera fresco (otra semilla que la de los conjuntos guardados) y el motor coincide en el 100 %.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { doubleATexto } from '../../src/motor/biblioteca/formato/double-a-texto.ts';
import { bitsAHex, bitsDeDouble, crearAzar, doubleDeBits } from './azar-determinista.ts';
import { analizarStderrDeEscenario, type EscenarioDeExcepcion, type ResultadoDeEscenario } from './escenarios-de-excepciones.ts';
import {
  analizarSalidaDeCaracteres,
  analizarSalidaDeDobles,
  comprimirEnRangos,
  correrLaSonda,
  desescaparCampo,
  digitosMasCortosDeJs,
  digitosYExponente,
  escaparCampo,
  generarTodo,
  type FilaDeCaracter,
  verificarSitiosConsistentes,
} from './generar-conjuntos.ts';
import { localizarJdk, verificarVersionJdk } from './jdk.ts';
import { LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS } from './limites-de-pruebas.ts';

const RAIZ = resolve(import.meta.dirname, '..', '..');

describe('azar determinista', () => {
  it('la misma semilla da la misma secuencia y otra semilla da otra (los conjuntos se regeneran idénticos)', () => {
    const a = crearAzar(42);
    const b = crearAzar(42);
    const c = crearAzar(43);
    const secuenciaA = [a.siguiente32(), a.siguiente32(), a.siguiente32()];
    expect([b.siguiente32(), b.siguiente32(), b.siguiente32()]).toEqual(secuenciaA);
    expect([c.siguiente32(), c.siguiente32(), c.siguiente32()]).not.toEqual(secuenciaA);
  });

  it('entre(min, max) cae en el rango (incluidos los dos extremos con muchas muestras)', () => {
    const azar = crearAzar(7);
    const vistos = new Set(Array.from({ length: 2000 }, () => azar.entre(3, 6)));
    expect([...vistos].sort()).toEqual([3, 4, 5, 6]);
  });

  it('los bits de un double van y vienen: 1.0 es 0x3ff0000000000000 y MIN_VALUE es 1', () => {
    expect(bitsAHex(bitsDeDouble(1))).toBe('3ff0000000000000');
    expect(bitsDeDouble(Number.MIN_VALUE)).toBe(1n);
    expect(doubleDeBits(0x4000000000000000n)).toBe(2);
  });
});

describe('escapes de campo (los de EvaluarBiblioteca.java)', () => {
  it('ida y vuelta con tabuladores, saltos, barras, controles y sustitutos sueltos', () => {
    for (const texto of ['', 'hola', 'a\tb\nc\r\\d', '\u0000\u001f\u007f', '😀 ñ €', '\uD83D', 'x y\u0085']) {
      expect(desescaparCampo(escaparCampo(texto))).toBe(texto);
    }
  });

  it('el campo escapado nunca contiene un tabulador ni un salto de línea (cabe en una línea de la sonda)', () => {
    expect(escaparCampo('a\tb\nc\rd')).toBe('a\\tb\\nc\\rd');
  });
});

describe('Double.toString: comparación con los dígitos más cortos de JS', () => {
  it('digitosYExponente normaliza el formato de Java (decimal y científico) a (dígitos, exponente)', () => {
    expect(digitosYExponente('1.0E23')).toEqual({ digitos: '1', exponente: 23 });
    expect(digitosYExponente('9.999999999999999E22')).toEqual({ digitos: '9999999999999999', exponente: 22 });
    expect(digitosYExponente('0.001')).toEqual({ digitos: '1', exponente: -3 });
    expect(digitosYExponente('123.456')).toEqual({ digitos: '123456', exponente: 2 });
    expect(digitosYExponente('-0.5')).toEqual({ digitos: '5', exponente: -1 });
    expect(digitosMasCortosDeJs(1e23)).toEqual({ digitos: '1', exponente: 23 });
  });

  it('analizarSalidaDeDobles convierte las líneas de la sonda en (bits, texto)', () => {
    expect(analizarSalidaDeDobles('3ff0000000000000\t1.0\n0000000000000001\t4.9E-324\n')).toEqual([
      { bits: 0x3ff0000000000000n, texto: '1.0' },
      { bits: 1n, texto: '4.9E-324' },
    ]);
  });
});

describe('escenarios de excepción: análisis de stderr', () => {
  const escenario: EscenarioDeExcepcion = { id: 'prueba', sitio: 'Prueba/sitio', cuerpo: 'int a = 1 / 0;', entrada: '' };

  it('separa clase, mensaje y marcos de java.base, y exige que el último marco sea el del alumno', () => {
    const resultado = analizarStderrDeEscenario(
      escenario,
      'Exception in thread "main" java.lang.StringIndexOutOfBoundsException: String index out of range: 5\n\tat java.base/java.lang.StringLatin1.charAt(StringLatin1.java:48)\n\tat Prueba.main(Prueba.java:5)\n',
    );
    expect(resultado.clase).toBe('java.lang.StringIndexOutOfBoundsException');
    expect(resultado.mensaje).toBe('String index out of range: 5');
    expect(resultado.marcos).toEqual(['java.base/java.lang.StringLatin1.charAt(StringLatin1.java:48)']);
  });

  it('una excepción sin mensaje deja mensaje null', () => {
    expect(analizarStderrDeEscenario(escenario, 'Exception in thread "main" java.util.InputMismatchException\n\tat Prueba.main(Prueba.java:5)\n').mensaje).toBeNull();
  });

  it('un programa que no terminó en excepción, con "Caused by" o con otro marco final no se guarda', () => {
    expect(() => analizarStderrDeEscenario(escenario, '')).toThrow(/no terminó con una excepción/);
    expect(() => analizarStderrDeEscenario(escenario, 'Exception in thread "main" java.lang.X\nCaused by: java.lang.Y\n\tat Prueba.main(Prueba.java:5)\n')).toThrow(/líneas de pila inesperadas/);
    expect(() => analizarStderrDeEscenario(escenario, 'Exception in thread "main" java.lang.X\n\tat Otra.main(Otra.java:9)\n')).toThrow(/no terminó en el marco del alumno/);
  });

  it('dos escenarios con el mismo sitio y marcos distintos revientan: el sitio mezclaría situaciones', () => {
    const base = { id: 'a', cuerpo: '', entrada: '', mensaje: null, stderr: '' };
    const uno: ResultadoDeEscenario = { ...base, sitio: 'X', clase: 'java.lang.A', marcos: ['m1'] };
    expect(() => verificarSitiosConsistentes([uno, { ...uno, id: 'b' }])).not.toThrow();
    expect(() => verificarSitiosConsistentes([uno, { ...uno, id: 'b', marcos: ['m2'] }])).toThrow(/mezcla situaciones distintas/);
  });
});

describe('Character: compresión en tramos', () => {
  it('los tramos con las mismas banderas y distancias se juntan, y la distancia a la mayúscula separa los pares', () => {
    const fila = (codigo: number, banderas: number, mayuscula: number, minuscula: number): FilaDeCaracter => ({ codigo, banderas, mayuscula, minuscula, valorDeDigito: -1 });
    const filas = [fila(0, 0, 0, 0), fila(1, 0, 1, 1), fila(2, 2, 2, 2), fila(3, 2, 3, 3), fila(4, 2, 5, 4)];
    expect(comprimirEnRangos(filas)).toEqual([
      { inicio: 0, banderas: 0, deltaMayuscula: 0, deltaMinuscula: 0 },
      { inicio: 2, banderas: 2, deltaMayuscula: 0, deltaMinuscula: 0 },
      { inicio: 4, banderas: 2, deltaMayuscula: 1, deltaMinuscula: 0 },
    ]);
  });

  it('analizarSalidaDeCaracteres exige los 65 536 valores en orden', () => {
    expect(() => analizarSalidaDeCaracteres('0,0,0,0,-1\n1,0,1,1,-1\n')).toThrow(/65 536/);
  });
});

describe('con el JDK 17 real', { timeout: LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS }, () => {
  const jdk = localizarJdk();
  verificarVersionJdk(jdk);
  const temporales: string[] = [];
  afterAll(() => {
    for (const directorio of temporales) rmSync(directorio, { recursive: true, force: true });
  });

  function archivosDe(directorio: string): string[] {
    return readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => (entrada.isDirectory() ? archivosDe(join(directorio, entrada.name)) : [join(directorio, entrada.name)]));
  }

  it('lo guardado en corpus/datos y en src/motor/biblioteca/datos es EXACTAMENTE lo que el JDK da hoy (bytes idénticos, ADR 011)', async () => {
    const temporal = mkdtempSync(join(tmpdir(), 'regenerar-conjuntos-'));
    temporales.push(temporal);
    await generarTodo(jdk, temporal);
    const regenerados = archivosDe(temporal);
    expect(regenerados.length).toBeGreaterThanOrEqual(26);
    const diferentes: string[] = [];
    for (const archivo of regenerados) {
      const ruta = relative(temporal, archivo);
      const guardado = resolve(RAIZ, ruta);
      if (!existsSync(guardado) || !statSync(guardado).isFile() || !readFileSync(guardado).equals(readFileSync(archivo))) diferentes.push(ruta);
    }
    expect(diferentes).toEqual([]);
  });

  it('Double.toString: 200 000 valores frescos (todos los exponentes, subnormales y literales cortos) coinciden al 100 % con el JDK', async () => {
    const azar = crearAzar(777_001);
    const mascara = (1n << 52n) - 1n;
    const bits: bigint[] = [];
    for (let exponente = 0; exponente <= 2046; exponente++) {
      for (let i = 0; i < 70; i++) bits.push((BigInt(exponente) << 52n) | (azar.siguiente64() & mascara) | (azar.entre(0, 1) === 1 ? 1n << 63n : 0n));
    }
    for (let i = 0; i < 30_000; i++) bits.push((azar.siguiente64() & ((1n << BigInt(azar.entre(1, 52))) - 1n)) | 1n);
    for (let i = 0; i < 30_000; i++) {
      const digitos = azar.entre(1, 7);
      bits.push(bitsDeDouble(Number(`${azar.entre(1, 10 ** digitos - 1)}e${azar.entre(-330, 300)}`)));
    }
    const validos = bits.filter((patron) => ((patron >> 52n) & 0x7ffn) !== 0x7ffn);
    expect(validos.length).toBeGreaterThan(200_000);
    const evaluados = analizarSalidaDeDobles(await correrLaSonda(jdk, 'dobles', validos.map(bitsAHex)));
    expect(evaluados).toHaveLength(validos.length);
    const fallos = evaluados.filter(({ bits: patron, texto }) => doubleATexto(doubleDeBits(patron)) !== texto).slice(0, 8).map(({ bits: patron, texto }) => `${bitsAHex(patron)}: Java ${texto}, motor ${doubleATexto(doubleDeBits(patron))}`);
    expect(fallos).toEqual([]);
  });
});
