import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { localizarJdk } from './jdk.ts';
import { RAIZ_EXPLORACION } from './migrar-corpus.ts';
import {
  dockerDisponible,
  emitirAdvertenciaGitHubActions,
  escribirResumenDelTrabajo,
  formatearInformeCsv,
  formatearResumenMarkdown,
  medirPowConDocker,
  medirPowLocal,
  parsearInformeMedicion,
} from './medir-plataforma.ts';

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

// Tarea 0.18 — `plataforma.yml` deja de tener `continue-on-error` a nivel de job: un error real de
// la herramienta (JDK no encontrado, etc.) debe fallar el trabajo, pero una diferencia real entre
// Math.pow y StrictMath.pow NO es un fallo (ADR 009) — se reporta con una anotación `::warning::`
// y en el resumen del trabajo ($GITHUB_STEP_SUMMARY), nunca con exitCode != 0.

describe('formatearResumenMarkdown (pura) — resumen de $GITHUB_STEP_SUMMARY para este job', () => {
  it('sin diferencias, dice que todos los pares coinciden (ningún fallo que anotar)', () => {
    const resumen = formatearResumenMarkdown('linux', 'x64', 5, []);
    expect(resumen).toContain('5/5 pares coinciden');
  });

  it('con diferencias, arma una tabla Markdown con base/exponente/mathPow/strictMathPow de cada fila', () => {
    const distintos = [{ base: 10, exponente: -4, mathPow: 9.999999999999999e-5, strictMathPow: 1e-4, coinciden: false }];

    const resumen = formatearResumenMarkdown('win32', 'x64', 5, distintos);

    expect(resumen).toContain('1/5');
    expect(resumen).toContain(`| 10 | -4 | ${9.999999999999999e-5} | ${1e-4} |`);
  });

  it('con más de 20 diferencias, trunca a 20 filas de tabla y lo anota (no infla el resumen)', () => {
    // mathPow/strictMathPow con desplazamiento grande para que NINGÚN valor de columna choque por
    // texto con "20" (el número de fila truncada) — la aserción de abajo debe fallar solo por la
    // fila 21 faltando, nunca por una coincidencia de texto accidental en otra columna.
    const distintos = Array.from({ length: 25 }, (_, indice) => ({
      base: indice,
      exponente: 1,
      mathPow: 1000 + indice,
      strictMathPow: 2000 + indice,
      coinciden: false,
    }));

    const resumen = formatearResumenMarkdown('linux', 'x64', 30, distintos);

    expect(resumen).toContain('| 19 |'); // fila de índice 19 (la 20.ª) SÍ entra en el truncado a 20
    expect(resumen).not.toContain('| 20 |'); // fila de índice 20 (la 21.ª) YA NO entra
    expect(resumen).toContain('mostrando 20 de 25');
  });
});

describe('escribirResumenDelTrabajo — agrega texto a $GITHUB_STEP_SUMMARY, nunca lanza', () => {
  it('si GITHUB_STEP_SUMMARY apunta a un archivo real, le agrega el texto', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'resumen-trabajo-'));
    const rutaResumen = resolve(raiz, 'resumen.md');
    writeFileSync(rutaResumen, '', 'utf-8');
    const anterior = process.env['GITHUB_STEP_SUMMARY'];
    process.env['GITHUB_STEP_SUMMARY'] = rutaResumen;
    try {
      escribirResumenDelTrabajo('### hola\n');
      expect(readFileSync(rutaResumen, 'utf-8')).toBe('### hola\n');
    } finally {
      rmSync(raiz, { recursive: true, force: true });
      if (anterior === undefined) delete process.env['GITHUB_STEP_SUMMARY'];
      else process.env['GITHUB_STEP_SUMMARY'] = anterior;
    }
  });

  it('si GITHUB_STEP_SUMMARY no está definida (fuera de un runner de Actions), no lanza y no escribe nada', () => {
    const anterior = process.env['GITHUB_STEP_SUMMARY'];
    delete process.env['GITHUB_STEP_SUMMARY'];
    try {
      expect(() => escribirResumenDelTrabajo('### hola\n')).not.toThrow();
    } finally {
      if (anterior !== undefined) process.env['GITHUB_STEP_SUMMARY'] = anterior;
    }
  });
});

describe('emitirAdvertenciaGitHubActions — anotación ::warning:: reconocida por Actions', () => {
  it('imprime el mensaje con el prefijo exacto que Actions reconoce como advertencia', () => {
    const espia = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      emitirAdvertenciaGitHubActions('3/5 pares distintos');
      expect(espia).toHaveBeenCalledWith('::warning::3/5 pares distintos');
    } finally {
      espia.mockRestore();
    }
  });
});
