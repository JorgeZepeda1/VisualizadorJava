import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ErrorJdk, VERSION_JDK_ESPERADA, esVersionEsperada, localizarJdk, verificarVersionJdk } from './jdk.ts';

// Tarea 0.5 (ADR 011) — el oráculo nunca genera goldens contra un JDK que no sea EXACTAMENTE el
// de referencia (Temurin 17.0.18). `esVersionEsperada` es pura (Extract-Before-Mock: se prueba
// sin lanzar procesos); `localizarJdk`/`verificarVersionJdk` sí tocan el sistema real — se
// prueban contra el JDK real de esta máquina, no con mocks, porque ES el propio objeto bajo
// prueba (arnés diferencial: fidelidad contra el JDK real, no contra una simulación de él).
//
// Tarea 0.18 (tras el primer CI remoto): `windows-latest` falló porque `localizarJdk` buscaba
// siempre `bin/java`/`bin/javac` SIN `.exe`. Las pruebas de más abajo inyectan la plataforma (no
// dependen de correr de verdad en Windows) y usan un JDK FALSO (archivos vacíos, ni se compilan
// ni se ejecutan) — solo prueban la resolución de rutas y el chequeo de existencia.

/** Crea un directorio temporal con `bin/<archivo>` por cada nombre dado (contenido vacío: estas
 * pruebas solo verifican resolución de rutas, nunca ejecutan el binario). */
function crearBinFalso(archivos: readonly string[]): string {
  const raiz = mkdtempSync(join(tmpdir(), 'jdk-falso-'));
  const bin = join(raiz, 'bin');
  mkdirSync(bin, { recursive: true });
  for (const archivo of archivos) writeFileSync(join(bin, archivo), '');
  return raiz;
}

/** Fija `JDK17_HOME` a `directorio` mientras corre `cuerpo`, restaura el valor anterior y borra
 * el directorio temporal al final (incluso si `cuerpo` lanza). */
function conJdk17HomeTemporal(directorio: string, cuerpo: () => void): void {
  const anterior = process.env['JDK17_HOME'];
  process.env['JDK17_HOME'] = directorio;
  try {
    cuerpo();
  } finally {
    rmSync(directorio, { recursive: true, force: true });
    if (anterior === undefined) delete process.env['JDK17_HOME'];
    else process.env['JDK17_HOME'] = anterior;
  }
}

describe('jdk.ts — localizar y verificar el JDK 17 real (ADR 011)', () => {
  it('reconoce la salida real de «java -version» de Temurin 17.0.18', () => {
    const salidaReal =
      'openjdk version "17.0.18" 2026-01-20\n' +
      'OpenJDK Runtime Environment Temurin-17.0.18+8 (build 17.0.18+8)\n' +
      'OpenJDK 64-Bit Server VM Temurin-17.0.18+8 (build 17.0.18+8, mixed mode, sharing)\n';
    expect(esVersionEsperada(salidaReal)).toBe(true);
  });

  it('rechaza la salida de otra versión de JDK', () => {
    const salidaDistinta = 'openjdk version "21.0.2" 2024-01-16\n';
    expect(esVersionEsperada(salidaDistinta, VERSION_JDK_ESPERADA)).toBe(false);
  });

  it('rechaza un prefijo parecido pero distinto (17.0.180 no es 17.0.18)', () => {
    const salidaParecida = 'openjdk version "17.0.180" 2026-01-20\n';
    expect(esVersionEsperada(salidaParecida)).toBe(false);
  });

  it('localiza el JDK 17 real instalado en esta máquina (ruta fija de macOS o JDK17_HOME)', () => {
    const info = localizarJdk();
    expect(info.rutaJava.endsWith('/bin/java')).toBe(true);
    expect(info.rutaJavac.endsWith('/bin/javac')).toBe(true);
  });

  it('verifica sin lanzar excepción contra el JDK real de esta máquina (17.0.18)', () => {
    const info = localizarJdk();
    expect(() => verificarVersionJdk(info)).not.toThrow();
  });

  it('lanza ErrorJdk con mensaje claro si JDK17_HOME apunta a una ruta inexistente', () => {
    const anterior = process.env['JDK17_HOME'];
    process.env['JDK17_HOME'] = '/ruta/inexistente/jdk-falso';
    try {
      expect(() => localizarJdk()).toThrow(ErrorJdk);
      expect(() => localizarJdk()).toThrow(/JDK17_HOME/);
    } finally {
      if (anterior === undefined) delete process.env['JDK17_HOME'];
      else process.env['JDK17_HOME'] = anterior;
    }
  });

  it('con la plataforma win32 inyectada, localiza java.exe/javac.exe (tarea 0.18)', () => {
    const directorio = crearBinFalso(['java.exe', 'javac.exe']);
    conJdk17HomeTemporal(directorio, () => {
      const info = localizarJdk('win32');
      expect(info.rutaJava.endsWith('java.exe')).toBe(true);
      expect(info.rutaJavac.endsWith('javac.exe')).toBe(true);
    });
  });

  it('con la plataforma win32 inyectada, NO encuentra un JDK cuyo bin/ solo tiene java/javac sin .exe', () => {
    const directorio = crearBinFalso(['java', 'javac']);
    conJdk17HomeTemporal(directorio, () => {
      expect(() => localizarJdk('win32')).toThrow(ErrorJdk);
    });
  });

  it('con la plataforma darwin inyectada, NO agrega .exe aunque bin/ solo tenga java.exe/javac.exe', () => {
    const directorio = crearBinFalso(['java.exe', 'javac.exe']);
    conJdk17HomeTemporal(directorio, () => {
      expect(() => localizarJdk('darwin')).toThrow(ErrorJdk);
    });
  });
});
