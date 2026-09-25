import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { localizarJdk } from './jdk.ts';
import { escribirGoldens, generarGoldenPara } from './generar-goldens.ts';
import { verificarGoldens } from './verificar-goldens.ts';

// Tarea 0.6 — `npm run oraculo:verificar`: recompila y re-ejecuta cada `.java` de `corpus/` contra
// el JDK real y exige bytes IDÉNTICOS a los goldens ya escritos (ADR 011 punto 4). No sobrescribe
// nada — solo reporta diferencias. Es lo que corre el job dedicado del oráculo (tarea 0.9).

describe('verificarGoldens — exige bytes idénticos contra una regeneración real (ADR 011)', () => {
  const jdk = localizarJdk();

  it('ok=true cuando los goldens en disco coinciden con una regeneración real, byte a byte', async () => {
    const raizCorpus = mkdtempSync(join(tmpdir(), 'verificar-goldens-ok-'));
    try {
      const fuente = 'public class VerificarOk {\n public static void main(String[] a) { System.out.println("bien"); }\n}\n';
      writeFileSync(resolve(raizCorpus, 'verificar-ok.java'), fuente, 'utf-8');
      const golden = await generarGoldenPara(jdk, { fuente, entrada: null });
      escribirGoldens(resolve(raizCorpus, 'verificar-ok'), golden);

      const resultado = await verificarGoldens(raizCorpus);

      expect(resultado.ok).toBe(true);
      expect(resultado.totalProgramas).toBe(1);
      expect(resultado.diferencias).toEqual([]);
    } finally {
      rmSync(raizCorpus, { recursive: true, force: true });
    }
  });

  it('ok=false y reporta la diferencia cuando el .salida en disco fue alterado a mano', async () => {
    const raizCorpus = mkdtempSync(join(tmpdir(), 'verificar-goldens-alterado-'));
    try {
      const fuente = 'public class VerificarAlterado {\n public static void main(String[] a) { System.out.println("real"); }\n}\n';
      writeFileSync(resolve(raizCorpus, 'verificar-alterado.java'), fuente, 'utf-8');
      const golden = await generarGoldenPara(jdk, { fuente, entrada: null });
      escribirGoldens(resolve(raizCorpus, 'verificar-alterado'), golden);

      // Simula exactamente el defecto que ADR 011 quiere prevenir: alguien "corrige" el golden a
      // mano (o quedó de una captura vieja por shell) y pierde el "\n" final.
      writeFileSync(resolve(raizCorpus, 'verificar-alterado.salida'), Buffer.from('real', 'utf-8'));

      const resultado = await verificarGoldens(raizCorpus);

      expect(resultado.ok).toBe(false);
      expect(resultado.diferencias).toHaveLength(1);
      expect(resultado.diferencias[0]?.archivo).toBe('.salida');
      expect(resultado.diferencias[0]?.razon).toBe('distinto');
    } finally {
      rmSync(raizCorpus, { recursive: true, force: true });
    }
  });

  it('ok=false cuando falta alguno de los 4 artefactos binarios', async () => {
    const raizCorpus = mkdtempSync(join(tmpdir(), 'verificar-goldens-faltante-'));
    try {
      const fuente = 'public class VerificarFaltante {\n public static void main(String[] a) { System.out.println("x"); }\n}\n';
      writeFileSync(resolve(raizCorpus, 'verificar-faltante.java'), fuente, 'utf-8');
      // A propósito NO se escriben los goldens: deben reportarse como faltantes, no lanzar.

      const resultado = await verificarGoldens(raizCorpus);

      expect(resultado.ok).toBe(false);
      const razones = resultado.diferencias.map((d) => d.razon);
      expect(razones.every((r) => r === 'faltante')).toBe(true);
      expect(resultado.diferencias.map((d) => d.archivo).sort()).toEqual(['.combinada', '.errores', '.oraculo.json', '.salida']);
    } finally {
      rmSync(raizCorpus, { recursive: true, force: true });
    }
  });

  it('ignora .salida/.combinada de un programa "limite-pasos" (ciclo infinito real, no reproducible byte a byte)', async () => {
    // design.md §7.2: el ciclo infinito se marca `esperado: limite-pasos` y se prueba por
    // propiedad, nunca por diff de bytes — el número de líneas capturadas antes del SIGKILL
    // depende de la velocidad de la máquina, cambia en cada corrida real (lo confirma la primera
    // regeneración real del corpus completo: 0.6 GREEN).
    const raizCorpus = mkdtempSync(join(tmpdir(), 'verificar-goldens-limite-pasos-'));
    try {
      const fuente = [
        'public class VerificarLimitePasos {',
        '    public static void main(String[] args) {',
        '        while (true) { System.out.println("vuelta"); }',
        '    }',
        '}',
      ].join('\n');
      writeFileSync(resolve(raizCorpus, 'verificar-limite-pasos.java'), fuente, 'utf-8');
      const golden = await generarGoldenPara(jdk, { fuente, entrada: null, limiteMs: 300 });
      expect(golden.metadatos.desenlace).toBe('limite-pasos'); // confirma la premisa del caso
      escribirGoldens(resolve(raizCorpus, 'verificar-limite-pasos'), golden);

      // Simula que la corrida anterior capturó una cantidad distinta de líneas antes del SIGKILL
      // (exactamente lo que pasa entre dos regeneraciones reales en máquinas o momentos distintos).
      writeFileSync(resolve(raizCorpus, 'verificar-limite-pasos.salida'), Buffer.from('vuelta\nvuelta\n', 'utf-8'));
      writeFileSync(resolve(raizCorpus, 'verificar-limite-pasos.combinada'), Buffer.from('vuelta\nvuelta\n', 'utf-8'));

      const resultado = await verificarGoldens(raizCorpus);

      expect(resultado.ok).toBe(true);
      expect(resultado.diferencias).toEqual([]);
    } finally {
      rmSync(raizCorpus, { recursive: true, force: true });
    }
  }, 10_000);

  it('no sobrescribe ningún archivo existente (nunca escribe, solo lee y compara)', async () => {
    const raizCorpus = mkdtempSync(join(tmpdir(), 'verificar-goldens-no-escribe-'));
    try {
      const fuente = 'public class VerificarNoEscribe {\n public static void main(String[] a) { System.out.println("y"); }\n}\n';
      writeFileSync(resolve(raizCorpus, 'verificar-no-escribe.java'), fuente, 'utf-8');
      const golden = await generarGoldenPara(jdk, { fuente, entrada: null });
      escribirGoldens(resolve(raizCorpus, 'verificar-no-escribe'), golden);
      const bytesAntes = readFileSync(resolve(raizCorpus, 'verificar-no-escribe.salida'));

      await verificarGoldens(raizCorpus);

      const bytesDespues = readFileSync(resolve(raizCorpus, 'verificar-no-escribe.salida'));
      expect(bytesDespues).toEqual(bytesAntes);
    } finally {
      rmSync(raizCorpus, { recursive: true, force: true });
    }
  });
});
