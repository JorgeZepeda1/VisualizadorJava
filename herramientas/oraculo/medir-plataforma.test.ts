import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { localizarJdk } from './jdk.ts';
import { RAIZ_EXPLORACION } from './migrar-corpus.ts';
import { dockerDisponible, formatearInformeCsv, medirPowConDocker, medirPowLocal, parsearInformeMedicion } from './medir-plataforma.ts';

// Tarea 0.10 (ADR 009, design.md §8) — mide si Math.pow difiere de StrictMath.pow en x86_64 real.
// La verdad del motor SIGUE siendo fdlibm (D3): esto solo mide el riesgo, nunca lo resuelve aquí.
//
// El demonio de Docker NO está corriendo en esta máquina de desarrollo (confirmado con
// `docker info`) y esta tarea tiene EXPRESAMENTE PROHIBIDO encenderlo. Todo lo que no depende de
// Docker (parseo del informe, la lógica real de MedirPow.java corrida con el JDK local) lleva su
// RED/GREEN real de todas formas — el 8/8 real de esta máquina; la medición autoritativa contra
// x86_64 real queda pendiente de verificar en CI (`.github/workflows/plataforma.yml`).

const CSV_SMOKE = [
  'base,exponente',
  '10,-4', // el caso insignia de ADR 009: V8 da 9.999999999999999E-5, Java da 1.0E-4
  '2,10',
  '-2,3',
  '2,0.5',
  '1.05,30',
].join('\n');

describe('parsearInformeMedicion (pura) — interpreta el CSV que imprime MedirPow.java', () => {
  it('interpreta cabecera + filas, castea números y booleano', () => {
    const texto = [
      'base,exponente,mathPow,strictMathPow,coinciden',
      '10.0,-4.0,1.0E-4,1.0E-4,true',
      '2.0,10.0,1024.0,1024.0,true',
    ].join('\n');

    const filas = parsearInformeMedicion(texto);

    expect(filas).toHaveLength(2);
    expect(filas[0]).toEqual({ base: 10, exponente: -4, mathPow: 1e-4, strictMathPow: 1e-4, coinciden: true });
    expect(filas[1]?.mathPow).toBe(1024);
  });

  it('reconoce coinciden=false cuando el texto lo dice', () => {
    const texto = ['base,exponente,mathPow,strictMathPow,coinciden', '3.0,7.0,2187.0000000001,2187.0,false'].join('\n');
    const filas = parsearInformeMedicion(texto);
    expect(filas[0]?.coinciden).toBe(false);
  });

  it('ignora líneas en blanco al final', () => {
    const texto = 'base,exponente,mathPow,strictMathPow,coinciden\n1.0,1.0,1.0,1.0,true\n\n';
    expect(parsearInformeMedicion(texto)).toHaveLength(1);
  });
});

describe('formatearInformeCsv (pura) — el "informe" que design.md §9 espera de este job', () => {
  it('serializa cabecera + filas, y es el inverso exacto de parsearInformeMedicion (viaje redondo)', () => {
    const filas = [
      { base: 10, exponente: -4, mathPow: 1e-4, strictMathPow: 1e-4, coinciden: true },
      { base: 2, exponente: 3, mathPow: 8, strictMathPow: 8, coinciden: true },
    ];

    const csv = formatearInformeCsv(filas);

    expect(csv).toBe(['base,exponente,mathPow,strictMathPow,coinciden', '10,-4,0.0001,0.0001,true', '2,3,8,8,true', ''].join('\n'));
    expect(parsearInformeMedicion(csv)).toEqual(filas);
  });

  it('con cero filas, produce solo la cabecera', () => {
    expect(formatearInformeCsv([])).toBe('base,exponente,mathPow,strictMathPow,coinciden\n');
  });
});

describe('dockerDisponible — nunca lanza, siempre regresa un booleano real', () => {
  it('devuelve un booleano (no lanza aunque Docker no esté corriendo)', () => {
    expect(typeof dockerDisponible()).toBe('boolean');
  });
});

describe('medirPowLocal — corre MedirPow.java de verdad con el JDK local (sin Docker, sanity real)', () => {
  const jdk = localizarJdk();

  it('calcula Math.pow y StrictMath.pow reales para los 5 pares de humo y los reporta', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'medir-plataforma-'));
    try {
      const rutaCsv = resolve(raiz, 'pares-smoke.csv');
      writeFileSync(rutaCsv, CSV_SMOKE, 'utf-8');

      const filas = medirPowLocal(jdk, rutaCsv);

      expect(filas).toHaveLength(5);
      const casoInsignia = filas.find((f) => f.base === 10 && f.exponente === -4);
      // ADR 009: en la máquina de referencia, Math.pow(10,-4) da exactamente 1.0E-4 (no el
      // 9.999999999999999E-5 de V8) — el propio JDK real de esta máquina lo confirma aquí.
      expect(casoInsignia?.mathPow).toBe(1e-4);
      expect(casoInsignia?.coinciden).toBe(true);

      // ADR 009 contexto: "en la máquina de referencia Math.pow coincide con StrictMath.pow
      // (fdlibm) en 26 336/26 336 pares" — debe seguir siendo cierto para estos 5.
      expect(filas.every((f) => f.coinciden)).toBe(true);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it('usa la sintaxis real de lanzamiento de archivo único documentada en design.md §8 (java MedirPow.java <csv>)', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'medir-plataforma-lanzamiento-'));
    try {
      const rutaCsv = resolve(raiz, 'un-par.csv');
      writeFileSync(rutaCsv, 'base,exponente\n2,3\n', 'utf-8');
      const filas = medirPowLocal(jdk, rutaCsv);
      expect(filas).toEqual([{ base: 2, exponente: 3, mathPow: 8, strictMathPow: 8, coinciden: true }]);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
});

describe('medirPowConDocker — la medición indicativa local (linux/amd64 vía Rosetta)', () => {
  it.skipIf(!dockerDisponible())(
    'corre MedirPow.java dentro de un contenedor linux/amd64 — se SALTA si Docker Desktop no está corriendo en esta máquina',
    () => {
      const rutaCsv = resolve(RAIZ_EXPLORACION, '..', 'corpus', 'datos', 'pow', 'pares-smoke.csv');
      const resultado = medirPowConDocker(rutaCsv);
      expect(resultado.disponible).toBe(true);
      expect(resultado.filas.length).toBeGreaterThan(0);
    },
  );

  it('si Docker NO está disponible, regresa disponible=false con un motivo explícito (nunca lanza, nunca finge)', () => {
    if (dockerDisponible()) return; // esta rama es la que sí corre en ESTA máquina hoy
    const resultado = medirPowConDocker('corpus/datos/pow/pares-smoke.csv');
    expect(resultado.disponible).toBe(false);
    expect(resultado.motivo).toBeTruthy();
    expect(resultado.filas).toEqual([]);
  });
});
