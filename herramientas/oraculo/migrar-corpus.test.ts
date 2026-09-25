import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  RAIZ_EXPLORACION,
  listarArchivosRecursivo,
  migrarCorpus,
  planMigracionCurso,
  planMigracionExperimentos,
} from './migrar-corpus.ts';

// Tarea 0.6 — COPIA (nunca mueve) `exploracion/corpus-candidato/` → `corpus/curso/` y
// `exploracion/experimentos/{numeros,texto}/` → `corpus/experimentos/`. Solo programas fuente
// (.java) y entradas (.entrada.txt): las salidas capturadas a mano (.salida.txt, .error.txt,
// .compilacion.txt...) y los datos crudos generados (CSVs, `Generar*.java`) NO son corpus — el
// oráculo los regenera o los produce de cero en su propio lote (ADR 010, ADR 011; ver
// exploracion/02-semantica-numeros-y-formato.md "Lista consolidada" y "Experimentos de gran
// escala: no forman parte del corpus").

describe('planMigracionCurso (pura) — corpus-candidato → corpus/curso', () => {
  it('incluye .java y .entrada.txt, excluye el .salida.txt heredado (perdió el \\n final)', () => {
    const archivos = ['u3-hola-mundo.java', 'u3-hola-mundo.salida.txt', 'u3-saludo-con-scanner.java', 'u3-saludo-con-scanner.entrada.txt'];
    const plan = planMigracionCurso(archivos);
    const destinos = plan.map((operacion) => operacion.destino).sort();
    expect(destinos).toEqual(['u3-hola-mundo.java', 'u3-saludo-con-scanner.entrada.txt', 'u3-saludo-con-scanner.java']);
  });

  it('con los 85 archivos reales de corpus-candidato, migra exactamente 35 .java + 15 .entrada.txt', () => {
    const archivosReales = readdirSync(resolve(RAIZ_EXPLORACION, 'corpus-candidato'));
    const plan = planMigracionCurso(archivosReales);
    expect(plan.filter((operacion) => operacion.destino.endsWith('.java'))).toHaveLength(35);
    expect(plan.filter((operacion) => operacion.destino.endsWith('.entrada.txt'))).toHaveLength(15);
    expect(plan).toHaveLength(50);
  });
});

describe('planMigracionExperimentos (pura) — experimentos/{numeros,texto} → corpus/experimentos', () => {
  it('excluye los generadores de datos crudos y sus CSV (doc 02: "no forman parte del corpus")', () => {
    const archivos = [
      'numeros/GenerarSalon.java',
      'numeros/GenerarAleatorios.java',
      'numeros/generado/salon.csv',
      'numeros/generado/aleatorios.csv',
      'numeros/generado/diferencias-double-tostring.csv',
      'numeros/comparar_double_tostring.js',
      'numeros/random_java_port.js',
      'numeros/Test01Int.java',
    ];
    const plan = planMigracionExperimentos(archivos);
    expect(plan.map((operacion) => operacion.destino)).toEqual(['numeros/Test01Int.java']);
  });

  it('excluye toda salida capturada a mano (.salida.txt en cualquier variante, .error.txt, .compilacion.txt) pero conserva .entrada.txt', () => {
    const archivos = [
      'numeros/candidatos/Candidato01_IntOverflowYShifts.java',
      'numeros/candidatos/Candidato01_IntOverflowYShifts.salida.txt',
      'numeros/Test09Random.salida.txt',
      'numeros/Test09Random.node.salida.txt',
      'numeros/errores_compilacion/E1_long_sin_L.java',
      'numeros/errores_compilacion/E1_long_sin_L.error.txt',
      'texto/err01_falta_punto_coma.java',
      'texto/err01_falta_punto_coma.compilacion.txt',
      'texto/scan01_entrada.java',
      'texto/scan01_entrada.entrada.txt',
      'texto/scan05c_coma.entrada.txt',
      'texto/out04.combinado.txt',
    ];
    const plan = planMigracionExperimentos(archivos);
    const destinos = plan.map((operacion) => operacion.destino).sort();
    expect(destinos).toEqual(
      [
        'numeros/candidatos/Candidato01_IntOverflowYShifts.java',
        'numeros/errores_compilacion/E1_long_sin_L.java',
        'texto/err01_falta_punto_coma.java',
        'texto/scan01_entrada.entrada.txt',
        'texto/scan01_entrada.java',
        'texto/scan05c_coma.entrada.txt',
      ].sort(),
    );
  });

  it('con los archivos reales de experimentos/, produce el tamaño esperado del corpus (24 .java de numeros, 117 .java de texto)', () => {
    const archivosNumeros = listarArchivosRecursivo(resolve(RAIZ_EXPLORACION, 'experimentos', 'numeros'));
    const archivosTexto = listarArchivosRecursivo(resolve(RAIZ_EXPLORACION, 'experimentos', 'texto'));
    const planNumeros = planMigracionExperimentos(archivosNumeros.map((ruta) => join('numeros', ruta)));
    const planTexto = planMigracionExperimentos(archivosTexto.map((ruta) => join('texto', ruta)));

    expect(planNumeros.filter((operacion) => operacion.destino.endsWith('.java'))).toHaveLength(24);
    expect(planTexto.filter((operacion) => operacion.destino.endsWith('.java'))).toHaveLength(117);
    // ninguno de los dos generadores de datos crudos debe colarse
    expect(planNumeros.some((operacion) => operacion.destino.includes('Generar'))).toBe(false);
    // ningún .csv ni .js debe colarse
    expect(planNumeros.every((operacion) => operacion.destino.endsWith('.java') || operacion.destino.endsWith('.entrada.txt'))).toBe(true);
    expect(planTexto.every((operacion) => operacion.destino.endsWith('.java') || operacion.destino.endsWith('.entrada.txt'))).toBe(true);
  });
});

describe('migrarCorpus (integración real, destino temporal — nunca toca exploracion/ ni corpus/ real)', () => {
  it('copia de verdad desde exploracion/ real a un destino temporal, preserva bytes, y no deja huecos', () => {
    const raizTemporal = mkdtempSync(join(tmpdir(), 'migrar-corpus-prueba-'));
    try {
      const resultado = migrarCorpus({ raizExploracion: RAIZ_EXPLORACION, raizCorpusDestino: raizTemporal });

      expect(resultado.copiadosCurso).toBe(50);
      // 24 .java de numeros/ (10 candidatos + 4 errores_compilacion + 10 Test0N*) + 117 .java de
      // texto/ + 19 .entrada.txt de texto/ (numeros/ no tiene ningún .entrada.txt) = 160.
      expect(resultado.copiadosExperimentos).toBe(160);

      const rutaHolaMundo = resolve(raizTemporal, 'curso', 'u3-hola-mundo.java');
      expect(existsSync(rutaHolaMundo)).toBe(true);
      const contenidoOriginal = readdirSync(resolve(RAIZ_EXPLORACION, 'corpus-candidato')).includes('u3-hola-mundo.java');
      expect(contenidoOriginal).toBe(true);

      // el registro de auditoría NUNCA se toca: sigue teniendo sus 85 archivos originales intactos
      expect(readdirSync(resolve(RAIZ_EXPLORACION, 'corpus-candidato'))).toHaveLength(85);

      expect(existsSync(resolve(raizTemporal, 'experimentos', 'numeros', 'candidatos', 'Candidato01_IntOverflowYShifts.java'))).toBe(true);
      expect(existsSync(resolve(raizTemporal, 'experimentos', 'texto', 'err01_falta_punto_coma.java'))).toBe(true);
      expect(existsSync(resolve(raizTemporal, 'experimentos', 'numeros', 'GenerarSalon.java'))).toBe(false);
      expect(existsSync(resolve(raizTemporal, 'experimentos', 'numeros', 'generado'))).toBe(false);
    } finally {
      rmSync(raizTemporal, { recursive: true, force: true });
    }
  });

  it('crea los subdirectorios de destino que hagan falta (candidatos/, errores_compilacion/)', () => {
    // Prueba de humo mínima contra un árbol propio en memoria de archivos, no el real, para
    // triangular con un caso más pequeño y controlado.
    const origen = mkdtempSync(join(tmpdir(), 'migrar-corpus-origen-'));
    const destino = mkdtempSync(join(tmpdir(), 'migrar-corpus-destino-'));
    try {
      mkdirSync(resolve(origen, 'corpus-candidato'), { recursive: true });
      writeFileSync(resolve(origen, 'corpus-candidato', 'uX-prueba.java'), 'public class X {}', 'utf-8');
      mkdirSync(resolve(origen, 'experimentos', 'numeros', 'candidatos'), { recursive: true });
      writeFileSync(resolve(origen, 'experimentos', 'numeros', 'candidatos', 'CandidatoX.java'), 'public class CandidatoX {}', 'utf-8');
      mkdirSync(resolve(origen, 'experimentos', 'texto'), { recursive: true });
      writeFileSync(resolve(origen, 'experimentos', 'texto', 'errX.java'), 'public class ErrX {}', 'utf-8');

      const resultado = migrarCorpus({ raizExploracion: origen, raizCorpusDestino: destino });

      expect(resultado.copiadosCurso).toBe(1);
      expect(resultado.copiadosExperimentos).toBe(2);
      expect(existsSync(resolve(destino, 'experimentos', 'numeros', 'candidatos', 'CandidatoX.java'))).toBe(true);
      expect(existsSync(resolve(destino, 'experimentos', 'texto', 'errX.java'))).toBe(true);
    } finally {
      rmSync(origen, { recursive: true, force: true });
      rmSync(destino, { recursive: true, force: true });
    }
  });
});
