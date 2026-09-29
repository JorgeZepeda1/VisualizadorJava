// RED de la tarea 1.31: la línea de comandos de `npm run oraculo:generados -- --semilla N --cantidad M
// [--salida ruta]`. Las piezas puras (argumentos, resumen, escritura del informe) se prueban sin
// procesos; una sola prueba lanza el script de verdad con una campaña chica para comprobar el cableado
// completo (JDK, argumentos, informe, resumen). Esa prueba NO afirma nada sobre las discrepancias que
// encuentre —el compilador real cambia con la tarea 1.32—, solo que el script corre, escribe un informe
// bien formado y sale con 0 o con 1 según haya o no discrepancias.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import type { InformeDeCampana } from './generados/campana.ts';
import { analizarArgumentos, escribirInforme, formatearResumen, SALIDA_POR_OMISION } from './programas-generados.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..', '..');
const temporales: string[] = [];
afterAll(() => temporales.forEach((ruta) => rmSync(ruta, { recursive: true, force: true })));

function informeDeEjemplo(familias: InformeDeCampana['familias'] = []): InformeDeCampana {
  return {
    version: 1,
    semilla: 20260929,
    cantidad: 5000,
    jdk: '17.0.18',
    programas: { total: 5000, javacCompila: 2400, javacRechaza: 2600, proporcionQueCompila: 0.48 },
    respuestasDeNuestroCompilador: { ejecucionNoDisponible: 10, 'error:conversion-con-perdida': 20 },
    coincidenciaDeLinea: { comparables: 1900, coinciden: 1880, porcentaje: 98.95 },
    discrepancias: { total: familias.reduce((s, f) => s + f.cantidad, 0), falsosAceptos: 0, falsosRechazos: 0, fallosInternos: 0, reducidas: 0, sinReducir: 0 },
    familias,
  };
}

const familiaDeEjemplo = (indice: number, conocida: { id: string; nombre: string } | null): InformeDeCampana['familias'][number] => ({
  clave: `falso-acepto | compiler.err.cant.deref | ejecucion-no-disponible | miembro-de-primitivo-${indice}`,
  tipo: 'falso-acepto',
  codigoJavac: 'compiler.err.cant.deref',
  mensajeJavac: 'int cannot be dereferenced',
  nuestraClave: 'ejecucion-no-disponible',
  etiquetas: ['miembro-de-primitivo'],
  fase: 'semantica',
  cantidad: 100 - indice,
  minimo: { fuente: 'public class P {}', cuerpo: ['int x = 5;', 'int y = x.length();'] },
  indicesDeEjemplo: [3, 9],
  variantes: [{ fuente: 'public class P {}', cuerpo: ['int y = x.length();'], veces: 100 - indice }],
  conocida,
});

describe('analizarArgumentos', () => {
  it('lee --semilla y --cantidad como enteros', () => {
    expect(analizarArgumentos(['--semilla', '7', '--cantidad', '100'])).toMatchObject({ semilla: 7, cantidad: 100 });
  });

  it('--salida elige la ruta del informe; sin ella, una ruta por omisión dentro de test-results/', () => {
    expect(analizarArgumentos(['--semilla', '1', '--cantidad', '5', '--salida', 'informe.json'])).toMatchObject({ salida: 'informe.json' });
    expect(analizarArgumentos(['--semilla', '1', '--cantidad', '5'])).toMatchObject({ salida: SALIDA_POR_OMISION });
    expect(SALIDA_POR_OMISION.startsWith('test-results/')).toBe(true);
  });

  it('--max-reducir acota cuántas discrepancias se reducen', () => {
    expect(analizarArgumentos(['--semilla', '1', '--cantidad', '5', '--max-reducir', '40'])).toMatchObject({ maximoAReducir: 40 });
  });

  it('sin --semilla o sin --cantidad, o con valores que no son enteros no negativos, explica el uso en español', () => {
    for (const argumentos of [[], ['--semilla', '1'], ['--cantidad', '5'], ['--semilla', 'x', '--cantidad', '5'], ['--semilla', '1', '--cantidad', '-3'], ['--semilla', '1', '--cantidad', '2.5']]) {
      const resultado = analizarArgumentos(argumentos);
      expect(resultado, argumentos.join(' ')).toHaveProperty('error');
      expect((resultado as { error: string }).error).toMatch(/--semilla/);
      expect((resultado as { error: string }).error).toMatch(/--cantidad/);
    }
  });

  it('una opción desconocida o sin valor es un error', () => {
    expect(analizarArgumentos(['--semilla', '1', '--cantidad', '5', '--rapido'])).toHaveProperty('error');
    expect(analizarArgumentos(['--semilla', '1', '--cantidad'])).toHaveProperty('error');
  });
});

describe('formatearResumen', () => {
  it('sin discrepancias dice que no hubo y trae las cifras de la campaña', () => {
    const resumen = formatearResumen(informeDeEjemplo());
    expect(resumen).toContain('5000 programas');
    expect(resumen).toContain('48,0 %');
    expect(resumen).toContain('98,95 %');
    expect(resumen).toMatch(/sin discrepancias/i);
  });

  it('cada familia sale con su marca (conocida o NUEVA), su cantidad, el mensaje de javac, lo que dijo nuestro compilador y el programa mínimo', () => {
    const resumen = formatearResumen(informeDeEjemplo([familiaDeEjemplo(0, { id: 'F2', nombre: 'miembro de un primitivo' }), familiaDeEjemplo(1, null)]));
    expect(resumen).toContain('[F2]');
    expect(resumen).toContain('[NUEVA]');
    expect(resumen).toContain('int cannot be dereferenced');
    expect(resumen).toContain('ejecucion-no-disponible');
    expect(resumen).toContain('int y = x.length();');
    expect(resumen).toContain('--semilla 20260929');
  });

  it('la salida está acotada: con 60 familias muestra las primeras y cuenta las que faltan', () => {
    const familias = Array.from({ length: 60 }, (_, i) => familiaDeEjemplo(i, null));
    const resumen = formatearResumen(informeDeEjemplo(familias));
    expect(resumen.split('\n').length).toBeLessThan(400);
    expect(resumen).toMatch(/y 40 familias más/);
  });
});

describe('escribirInforme', () => {
  it('escribe el informe como JSON legible, con un salto de línea final, creando las carpetas que falten', () => {
    const carpeta = mkdtempSyncSeguro();
    const ruta = join(carpeta, 'a', 'b', 'informe.json');
    escribirInforme(informeDeEjemplo(), ruta);
    const texto = readFileSync(ruta, 'utf-8');
    expect(texto.endsWith('\n')).toBe(true);
    expect(JSON.parse(texto)).toEqual(informeDeEjemplo());
  });
});

function mkdtempSyncSeguro(): string {
  const carpeta = mkdtempSync(join(tmpdir(), 'programas-generados-'));
  temporales.push(carpeta);
  return carpeta;
}

describe('el script completo (con el JDK real y una campaña chica)', () => {
  it('corre, escribe un informe bien formado, imprime el resumen y sale con 0 o 1 según haya discrepancias', () => {
    const carpeta = mkdtempSyncSeguro();
    const salida = join(carpeta, 'informe.json');
    const resultado = spawnSync(process.execPath, ['herramientas/oraculo/programas-generados.ts', '--semilla', '3', '--cantidad', '60', '--salida', salida, '--max-reducir', '4'], {
      cwd: RAIZ,
      encoding: 'utf-8',
      timeout: 120_000,
    });
    expect(existsSync(salida), resultado.stderr).toBe(true);
    const informe = JSON.parse(readFileSync(salida, 'utf-8')) as InformeDeCampana;
    expect(informe).toMatchObject({ version: 1, semilla: 3, cantidad: 60, jdk: '17.0.18' });
    expect(resultado.stdout).toContain('60 programas');
    expect(resultado.status).toBe(informe.discrepancias.total > 0 ? 1 : 0);
  }, 150_000);

  it('con argumentos inválidos explica el uso y sale con 2, sin tocar el JDK', () => {
    const resultado = spawnSync(process.execPath, ['herramientas/oraculo/programas-generados.ts', '--semilla', 'x'], { cwd: RAIZ, encoding: 'utf-8' });
    expect(resultado.status).toBe(2);
    expect(resultado.stderr).toMatch(/--cantidad/);
  });
});
