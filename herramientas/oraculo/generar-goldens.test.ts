import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { localizarJdk } from './jdk.ts';
import { RAIZ_EXPLORACION } from './migrar-corpus.ts';
import { clasificarDesenlace, descubrirProgramas, escribirGoldens, generarGoldenPara } from './generar-goldens.ts';

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
