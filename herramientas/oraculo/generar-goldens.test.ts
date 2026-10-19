import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { localizarJdk } from './jdk.ts';
import { RAIZ_EXPLORACION } from './migrar-corpus.ts';
import {
  CARPETAS_DEL_CORPUS,
  clasificarDesenlace,
  descubrirProgramas,
  elegirCarpetas,
  escribirGoldens,
  generarGoldenPara,
  generarTodosLosGoldens,
} from './generar-goldens.ts';

// Tarea 0.6 (ADR 011) — regenera TODOS los goldens (`.salida`, `.errores`, `.combinada`,
// `.oraculo.json`) en binario contra el JDK real. El `.salida.txt` heredado de la exploración
// perdió el "\n" final al capturarse con un shell; el golden regenerado por el oráculo SÍ debe
// terminar en "\n" — ese es el RED de esta tarea.

describe('clasificarDesenlace (pura) — clasifica el resultado de una corrida del oráculo', () => {
  it('normal: compiló, no agotó tiempo, código de salida 0', () => {
    expect(clasificarDesenlace({ compilo: true, agotoTiempo: false, codigoSalida: 0 })).toBe('normal');
  });

  it('error-compilacion: no compiló', () => {
    expect(clasificarDesenlace({ compilo: false, agotoTiempo: false, codigoSalida: null })).toBe('error-compilacion');
  });

  it('limite-pasos: agotó el tiempo (ciclo infinito real, ADR 011 §7.2)', () => {
    expect(clasificarDesenlace({ compilo: true, agotoTiempo: true, codigoSalida: null })).toBe('limite-pasos');
  });

  it('excepcion: compiló, no agotó tiempo, pero el código de salida no es 0', () => {
    expect(clasificarDesenlace({ compilo: true, agotoTiempo: false, codigoSalida: 1 })).toBe('excepcion');
  });
});

describe('generarGoldenPara — regenera el golden de u3-hola-mundo real contra el JDK (0.6 RED)', () => {
  const jdk = localizarJdk();

  it('el .salida binario regenerado termina en "\\n" (el .salida.txt heredado de la exploración NO)', async () => {
    const fuenteReal = readFileSync(resolve(RAIZ_EXPLORACION, 'corpus-candidato', 'u3-hola-mundo.java'), 'utf-8');
    const salidaHeredada = readFileSync(resolve(RAIZ_EXPLORACION, 'corpus-candidato', 'u3-hola-mundo.salida.txt'));

    // El propio defecto que motiva la tarea: el artefacto heredado NO termina en salto de línea.
    expect(salidaHeredada[salidaHeredada.length - 1]).not.toBe(0x0a);

    const resultado = await generarGoldenPara(jdk, { fuente: fuenteReal, entrada: null });

    expect(resultado.metadatos.compilo).toBe(true);
    expect(resultado.metadatos.desenlace).toBe('normal');
    expect(resultado.salida.toString('utf-8')).toBe('Hola, mundo\n');
    expect(resultado.salida[resultado.salida.length - 1]).toBe(0x0a);
  });

  it('un programa con error de compilación real produce desenlace "error-compilacion" y golden de errores no vacío', async () => {
    const fuente = 'public class ErrorGolden {\n public static void main(String[] a) { int x = 5 }\n}\n';
    const resultado = await generarGoldenPara(jdk, { fuente, entrada: null });

    expect(resultado.metadatos.compilo).toBe(false);
    expect(resultado.metadatos.desenlace).toBe('error-compilacion');
    expect(resultado.errores.length).toBeGreaterThan(0);
    expect(resultado.salida.length).toBe(0);
  });

  it('un ciclo infinito real produce desenlace "limite-pasos" (nunca cuelga la regeneración)', async () => {
    const fuente = [
      'public class InfinitoGolden {',
      '    public static void main(String[] args) {',
      '        while (true) { System.out.println("vuelta"); }',
      '    }',
      '}',
    ].join('\n');
    const resultado = await generarGoldenPara(jdk, { fuente, entrada: null, limiteMs: 300 });

    expect(resultado.metadatos.desenlace).toBe('limite-pasos');
    expect(resultado.metadatos.agotoTiempo).toBe(true);
  }, 10_000);
});

describe('descubrirProgramas — empareja cada .java con su .entrada.txt hermano, si existe', () => {
  it('encuentra los .java de un directorio temporal y empareja solo los que tienen entrada', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'descubrir-programas-'));
    try {
      mkdirSync(resolve(raiz, 'sub'), { recursive: true });
      writeFileSync(resolve(raiz, 'sin-entrada.java'), 'public class SinEntrada {}', 'utf-8');
      writeFileSync(resolve(raiz, 'sub', 'con-entrada.java'), 'public class ConEntrada {}', 'utf-8');
      writeFileSync(resolve(raiz, 'sub', 'con-entrada.entrada.txt'), '5\n', 'utf-8');

      const programas = descubrirProgramas(raiz);

      expect(programas).toHaveLength(2);
      const sinEntrada = programas.find((p) => p.rutaBase.endsWith('sin-entrada'));
      const conEntrada = programas.find((p) => p.rutaBase.endsWith('con-entrada'));
      expect(sinEntrada?.rutaEntrada).toBeNull();
      expect(conEntrada?.rutaEntrada).not.toBeNull();
      expect(conEntrada?.rutaEntrada && readFileSync(conEntrada.rutaEntrada, 'utf-8')).toBe('5\n');
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
});

describe('escribirGoldens — escribe los 4 artefactos binarios junto al programa', () => {
  const jdk = localizarJdk();

  it('escribe .salida/.errores/.combinada/.oraculo.json con los bytes reales y metadatos coherentes', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'escribir-goldens-'));
    try {
      const fuente = 'public class GoldenEscrito {\n public static void main(String[] a) { System.out.println("ok"); }\n}\n';
      const resultado = await generarGoldenPara(jdk, { fuente, entrada: null });
      const rutaBase = resolve(raiz, 'golden-escrito');

      escribirGoldens(rutaBase, resultado);

      expect(existsSync(`${rutaBase}.salida`)).toBe(true);
      expect(existsSync(`${rutaBase}.errores`)).toBe(true);
      expect(existsSync(`${rutaBase}.combinada`)).toBe(true);
      expect(existsSync(`${rutaBase}.oraculo.json`)).toBe(true);
      expect(readFileSync(`${rutaBase}.salida`, 'utf-8')).toBe('ok\n');

      const metadatos = JSON.parse(readFileSync(`${rutaBase}.oraculo.json`, 'utf-8'));
      expect(metadatos.desenlace).toBe('normal');
      expect(metadatos.version).toBe('17.0.18');
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
});

// Tarea R0.13 (REQ-DIFF-009, `robots-tutores`): `corpus/libro/` —los ejemplos, errores típicos, «Ponte a prueba» y soluciones del libro— es una carpeta más del corpus: el oráculo la recorre y genera
// sus goldens con el JDK real, nunca escritos a mano. `npm run oraculo:goldens -- libro` regenera solo esa (las otras 400 y pico tardan minutos).
describe('las carpetas del corpus que recorre el oráculo (R0.13)', () => {
  it('son curso, experimentos y libro, en ese orden', () => {
    expect(CARPETAS_DEL_CORPUS).toEqual(['curso', 'experimentos', 'libro']);
  });

  it('sin argumentos se regeneran todas', () => {
    expect(elegirCarpetas([])).toEqual(['curso', 'experimentos', 'libro']);
  });

  it('con argumentos se regenera solo lo pedido, siempre en el orden de siempre y sin repetir', () => {
    expect(elegirCarpetas(['libro'])).toEqual(['libro']);
    expect(elegirCarpetas(['libro', 'curso', 'libro'])).toEqual(['curso', 'libro']);
  });

  it('una carpeta que no existe en el corpus es un error que dice cuáles sí', () => {
    expect(() => elegirCarpetas(['biblioteca'])).toThrow(/biblioteca.*curso, experimentos, libro/s);
  });
});

describe('corpus/libro lo descubre el generador de goldens (R0.13)', () => {
  it('encuentra el programa semilla del tema `while`, que no lee del teclado', () => {
    const programas = descubrirProgramas(resolve('corpus', 'libro'));
    const semilla = programas.find((programa) => programa.rutaBase.endsWith('u6-while/contar-en-voz-alta'));
    expect(semilla, 'el programa semilla de R0.13').toBeDefined();
    expect(semilla?.rutaEntrada).toBeNull();
    expect(programas.every((programa) => programa.rutaFuente.includes('/corpus/libro/'))).toBe(true);
  });
});

describe('generarTodosLosGoldens con solo la carpeta del libro (R0.13)', () => {
  it('genera los goldens reales de cada programa del libro y no migra ni toca curso ni experimentos', async () => {
    const raiz = mkdtempSync(join(tmpdir(), 'goldens-del-libro-'));
    try {
      mkdirSync(resolve(raiz, 'corpus', 'libro', 'u6-demo'), { recursive: true });
      writeFileSync(
        resolve(raiz, 'corpus', 'libro', 'u6-demo', 'doble.java'),
        [
          'import java.util.Scanner;',
          '',
          'public class Doble {',
          '    public static void main(String[] args) {',
          '        Scanner teclado = new Scanner(System.in);',
          '        int numero = teclado.nextInt();',
          '        System.out.println(numero * 2);',
          '    }',
          '}',
          '',
        ].join('\n'),
        'utf-8',
      );
      writeFileSync(resolve(raiz, 'corpus', 'libro', 'u6-demo', 'doble.entrada.txt'), '21\n', 'utf-8');

      const resultado = await generarTodosLosGoldens(raiz, ['libro']);

      expect(resultado.totalProgramas).toBe(1);
      expect(resultado.copiadosCurso).toBe(0);
      expect(resultado.copiadosExperimentos).toBe(0);
      expect(readFileSync(resolve(raiz, 'corpus', 'libro', 'u6-demo', 'doble.salida'), 'utf-8')).toBe('42\n');
      expect(JSON.parse(readFileSync(resolve(raiz, 'corpus', 'libro', 'u6-demo', 'doble.oraculo.json'), 'utf-8')).desenlace).toBe('normal');
      expect(existsSync(resolve(raiz, 'corpus', 'curso'))).toBe(false);
      expect(existsSync(resolve(raiz, 'corpus', 'experimentos'))).toBe(false);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
});
