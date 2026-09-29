import { describe, expect, it } from 'vitest';
import { localizarJdk } from './jdk.ts';
import { LIMITE_BYTES_CAPTURA_POR_OMISION, derivarNombreDeArchivo, ejecutarPrograma } from './ejecutar.ts';

// Sub-lote 1-D3 (Parte A.2): defensa adicional para el gotcha de la JVM en frío (engram) — permite
// forzar variables de entorno del proceso HIJO (p. ej. LANG/LC_ALL) para los dos probes de
// "marcos del lanzador" en `generar-datos.ts`. Opcional (nunca cambia el comportamiento de un
// llamador que no lo pide) — probado aquí con una lectura REAL de `System.getenv` (cero mocks,
// mismo criterio que el resto de este archivo).

// Tarea 0.5 (ADR 011) — arnés diferencial: compila y ejecuta contra el JDK 17 REAL de esta
// máquina (no hay simulación posible del propio oráculo). Cero mocks: todas las aserciones caen
// sobre bytes producidos de verdad por `javac`/`java`.

describe('ejecutar.ts — compila y ejecuta contra el JDK real (ADR 011, tarea 0.5)', () => {
  const jdk = localizarJdk();

  it('compila y ejecuta un System.out.println("hola") real; stdout binario termina en \\n', async () => {
    const fuente = [
      'public class HolaOraculo {',
      '    public static void main(String[] args) {',
      '        System.out.println("hola");',
      '    }',
      '}',
      '',
    ].join('\n');

    const resultado = await ejecutarPrograma(jdk, { fuente });

    expect(resultado.compilo).toBe(true);
    expect(resultado.codigoSalida).toBe(0);
    expect(resultado.stdout.toString('utf-8')).toBe('hola\n');
    expect(resultado.stdout[resultado.stdout.length - 1]).toBe(0x0a);
  });

  it('captura un error de compilación REAL (falta punto y coma) sin ejecutar nada', async () => {
    const fuente = 'public class ErrorOraculo {\n public static void main(String[] a) { int x = 5 }\n}\n';

    const resultado = await ejecutarPrograma(jdk, { fuente });

    expect(resultado.compilo).toBe(false);
    expect(resultado.erroresCompilacion.toString('utf-8')).toContain("';' expected");
    expect(resultado.codigoSalida).toBeNull();
  });

  it('deriva el nombre del archivo desde la clase public, no del nombre original del corpus', () => {
    const { nombreArchivo, paquete } = derivarNombreDeArchivo('public class MiPrograma { }');
    expect(nombreArchivo).toBe('MiPrograma.java');
    expect(paquete).toBeNull();
  });

  it('detecta el paquete declarado y lo usa para calificar la clase al ejecutar', async () => {
    const fuente = [
      'package paquetedeprueba;',
      'public class ConPaquete {',
      '    public static void main(String[] args) {',
      '        System.out.println("desde-paquete");',
      '    }',
      '}',
    ].join('\n');

    const resultado = await ejecutarPrograma(jdk, { fuente });

    expect(resultado.paquete).toBe('paquetedeprueba');
    expect(resultado.compilo).toBe(true);
    expect(resultado.stdout.toString('utf-8')).toBe('desde-paquete\n');
  });

  it('pasa bytes de entrada real por stdin (lectura cruda de System.in)', async () => {
    const fuente = [
      'import java.io.*;',
      'public class EntradaOraculo {',
      '    public static void main(String[] args) throws IOException {',
      '        BufferedReader lector = new BufferedReader(new InputStreamReader(System.in));',
      '        String linea = lector.readLine();',
      '        System.out.println("leido:" + linea);',
      '    }',
      '}',
    ].join('\n');

    const resultado = await ejecutarPrograma(jdk, { fuente, entrada: Buffer.from('Ana\n', 'utf-8') });

    expect(resultado.stdout.toString('utf-8')).toBe('leido:Ana\n');
  });

  it('la corrida combinada intercala stdout y stderr en el orden real de escritura', async () => {
    const fuente = [
      'public class CombinadaOraculo {',
      '    public static void main(String[] args) {',
      '        System.out.println("uno");',
      '        System.err.println("dos");',
      '        System.out.println("tres");',
      '    }',
      '}',
    ].join('\n');

    const resultado = await ejecutarPrograma(jdk, { fuente });

    expect(resultado.combinada.toString('utf-8')).toBe('uno\ndos\ntres\n');
  });

  it('mata el proceso por tiempo límite ante un ciclo infinito real (nunca cuelga la corrida)', async () => {
    const fuente = [
      'public class InfinitoOraculo {',
      '    public static void main(String[] args) {',
      '        while (true) { System.out.println("x"); }',
      '    }',
      '}',
    ].join('\n');

    const resultado = await ejecutarPrograma(jdk, { fuente, limiteMs: 300 });

    expect(resultado.agotoTiempo).toBe(true);
    expect(resultado.compilo).toBe(true);
  }, 10_000);

  it('acota la captura de un ciclo infinito real: nunca guarda megabytes de salida repetida', async () => {
    // Hallazgo real al regenerar el corpus completo (0.6 GREEN): sin tope, 5s de
    // "while(true) println(...)" real producen ~93 MB — inaceptable para un golden versionado.
    const fuente = [
      'public class InfinitoAcotadoOraculo {',
      '    public static void main(String[] args) {',
      '        while (true) { System.out.println("vuelta"); }',
      '    }',
      '}',
    ].join('\n');

    const resultado = await ejecutarPrograma(jdk, { fuente, limiteMs: 1500 });

    expect(resultado.agotoTiempo).toBe(true);
    expect(resultado.stdout.length).toBeLessThanOrEqual(LIMITE_BYTES_CAPTURA_POR_OMISION);
    expect(resultado.combinada.length).toBeLessThanOrEqual(LIMITE_BYTES_CAPTURA_POR_OMISION);
    // Pero sí capturó ALGO real, no lo vació por completo — sigue siendo información útil.
    expect(resultado.stdout.length).toBeGreaterThan(0);
  }, 10_000);

  it('"envAdicional" fija variables de entorno REALES del proceso hijo (LANG), sin perder el resto del entorno heredado', async () => {
    const fuente = [
      'public class EnvAdicionalOraculo {',
      '    public static void main(String[] args) {',
      '        System.out.println("LANG=" + System.getenv("LANG"));',
      '        System.out.println("PATH-vacio=" + (System.getenv("PATH") == null));',
      '    }',
      '}',
    ].join('\n');

    const resultado = await ejecutarPrograma(jdk, { fuente, envAdicional: { LANG: 'es_MX.UTF-8' } });

    expect(resultado.stdout.toString('utf-8')).toBe('LANG=es_MX.UTF-8\nPATH-vacio=false\n');
  });
});
