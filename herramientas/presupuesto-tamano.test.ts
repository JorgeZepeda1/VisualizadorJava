// RED de la tarea 5.9 (REQ-PLAT-003, C13): el presupuesto de carga se vigila con una herramienta propia (`npm run presupuesto`), no con un número anotado en un informe. Suma el peso
// COMPRIMIDO (gzip) de todo lo que deja `vite build` en `dist/` —lo que un alumno descarga en su primera visita porque el service worker lo precachea completo— y falla si pasa de 500 KB.
// Las pruebas arman carpetas de mentira en el directorio temporal: nunca construyen (CLAUDE.md regla 8).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  evaluarPresupuesto,
  LIMITE_EN_BYTES,
  medirDirectorio,
  resumirPresupuesto,
  revisarPresupuesto,
  type ArchivoMedido,
} from './presupuesto-tamano.ts';

let directorio: string;

beforeEach(() => {
  directorio = mkdtempSync(join(tmpdir(), 'presupuesto-'));
});

afterEach(() => {
  rmSync(directorio, { recursive: true, force: true });
});

/** Bytes que gzip no puede comprimir: un generador congruencial fijo, para que la prueba sea determinista. */
function bytesIncomprimibles(cantidad: number): Buffer {
  const bytes = Buffer.alloc(cantidad);
  let estado = 123456789;
  for (let i = 0; i < cantidad; i += 1) {
    estado = (Math.imul(estado, 1103515245) + 12345) >>> 0;
    bytes[i] = estado >>> 24;
  }
  return bytes;
}

function archivo(ruta: string, bytesComprimidos: number): ArchivoMedido {
  return { ruta, bytesComprimidos };
}

describe('LIMITE_EN_BYTES', () => {
  it('son 500 KB de 1 024 bytes (REQ-PLAT-003), la misma unidad con la que se midió el peso en los lotes anteriores', () => {
    expect(LIMITE_EN_BYTES).toBe(512_000);
  });
});

describe('medirDirectorio — peso gzip de cada archivo, recorriendo las subcarpetas', () => {
  it('mide lo COMPRIMIDO, no lo que ocupa en disco: 100 000 letras iguales pesan unas decenas de bytes', () => {
    writeFileSync(join(directorio, 'repetido.js'), 'a'.repeat(100_000));

    const [medido, ...otros] = medirDirectorio(directorio);

    expect(otros).toEqual([]);
    expect(medido?.ruta).toBe('repetido.js');
    expect(medido?.bytesComprimidos).toBeGreaterThan(20);
    expect(medido?.bytesComprimidos).toBeLessThan(300);
  });

  it('un archivo que no se comprime (una imagen) pesa lo mismo que en disco, más la cabecera de gzip', () => {
    writeFileSync(join(directorio, 'icono.png'), bytesIncomprimibles(10_000));

    const [medido] = medirDirectorio(directorio);

    expect(medido?.ruta).toBe('icono.png');
    expect(medido?.bytesComprimidos).toBeGreaterThanOrEqual(10_000);
    expect(medido?.bytesComprimidos).toBeLessThan(10_100);
  });

  it('entra a las subcarpetas y da las rutas relativas a la carpeta medida, con «/», en orden alfabético', () => {
    mkdirSync(join(directorio, 'assets', 'profunda'), { recursive: true });
    writeFileSync(join(directorio, 'index.html'), '<html></html>');
    writeFileSync(join(directorio, 'assets', 'index-abc123.js'), 'let x = 1;');
    writeFileSync(join(directorio, 'assets', 'profunda', 'trabajador-def456.js'), 'let y = 2;');

    expect(medirDirectorio(directorio).map((medido) => medido.ruta)).toEqual([
      'assets/index-abc123.js',
      'assets/profunda/trabajador-def456.js',
      'index.html',
    ]);
  });
});

describe('evaluarPresupuesto — suma y compara contra el límite', () => {
  it('el total es la suma de los archivos y pasa cuando cabe', () => {
    const resultado = evaluarPresupuesto([archivo('a.js', 200_000), archivo('b.js', 100_000)], LIMITE_EN_BYTES);

    expect(resultado.totalBytes).toBe(300_000);
    expect(resultado.limiteBytes).toBe(LIMITE_EN_BYTES);
    expect(resultado.ok).toBe(true);
  });

  it('justo en el límite todavía pasa («500 KB o menos»); un byte más ya no', () => {
    expect(evaluarPresupuesto([archivo('a.js', 1_000)], 1_000).ok).toBe(true);
    expect(evaluarPresupuesto([archivo('a.js', 1_001)], 1_000).ok).toBe(false);
  });

  it('por omisión usa los 500 KB de REQ-PLAT-003', () => {
    expect(evaluarPresupuesto([archivo('a.js', 512_000)]).ok).toBe(true);
    expect(evaluarPresupuesto([archivo('a.js', 512_001)]).ok).toBe(false);
  });
});

describe('resumirPresupuesto — el resumen corto que lee quien corre el CI', () => {
  it('dice cuántos KB pesa, contra cuántos, el porcentaje, y los tres archivos más pesados de mayor a menor', () => {
    const resultado = evaluarPresupuesto(
      [archivo('assets/chico.js', 1_024), archivo('assets/index-a.js', 245_760), archivo('assets/trabajador-b.js', 51_200), archivo('assets/medio.css', 10_240)],
      LIMITE_EN_BYTES,
    );

    const resumen = resumirPresupuesto(resultado);

    expect(resumen).toContain('Presupuesto de carga: OK');
    expect(resumen).toContain('301.0 KB de 500 KB (60.2 %)');
    expect(resumen).toContain('4 archivos');
    const lineas = resumen.split('\n');
    expect(lineas.filter((linea) => linea.startsWith('  '))).toEqual([
      '  240.0 KB  assets/index-a.js',
      '  50.0 KB  assets/trabajador-b.js',
      '  10.0 KB  assets/medio.css',
    ]);
  });

  it('cuando se pasa dice cuánto y no lo disfraza de éxito', () => {
    const resultado = evaluarPresupuesto([archivo('assets/index-a.js', 524_288)], LIMITE_EN_BYTES);

    const resumen = resumirPresupuesto(resultado);

    expect(resumen).toContain('Presupuesto de carga: EXCEDIDO');
    expect(resumen).toContain('512.0 KB de 500 KB (102.4 %)');
    expect(resumen).toContain('excede por 12.0 KB');
    expect(resumen).not.toContain('OK');
  });

  it('con un solo archivo lo dice en singular', () => {
    expect(resumirPresupuesto(evaluarPresupuesto([archivo('index.html', 2_048)]))).toContain('(0.4 %), gzip, 1 archivo.');
  });
});

describe('revisarPresupuesto — lo que hace `npm run presupuesto`', () => {
  it('con un build que cabe: código 0 y el resumen', () => {
    mkdirSync(join(directorio, 'assets'));
    writeFileSync(join(directorio, 'index.html'), '<html></html>');
    writeFileSync(join(directorio, 'assets', 'index-abc.js'), bytesIncomprimibles(50_000));

    const { codigoDeSalida, mensaje } = revisarPresupuesto(directorio);

    expect(codigoDeSalida).toBe(0);
    expect(mensaje).toContain('Presupuesto de carga: OK');
    expect(mensaje).toContain('assets/index-abc.js');
  });

  it('con un build que se pasa: código 1 y dice el exceso', () => {
    writeFileSync(join(directorio, 'index-enorme.js'), bytesIncomprimibles(60_000));

    const { codigoDeSalida, mensaje } = revisarPresupuesto(directorio, 50_000);

    expect(codigoDeSalida).toBe(1);
    expect(mensaje).toContain('Presupuesto de carga: EXCEDIDO');
  });

  it('si la carpeta no existe: código 2 y explica que falta construir (no pasa «por vacío»)', () => {
    const { codigoDeSalida, mensaje } = revisarPresupuesto(join(directorio, 'no-existe'));

    expect(codigoDeSalida).toBe(2);
    expect(mensaje).toContain('no existe');
    expect(mensaje).toContain('npm run build');
  });

  it('si la carpeta está vacía: código 2, porque un total de 0 bytes cabría en cualquier presupuesto', () => {
    const { codigoDeSalida, mensaje } = revisarPresupuesto(directorio);

    expect(codigoDeSalida).toBe(2);
    expect(mensaje).toContain('vacía');
  });
});
