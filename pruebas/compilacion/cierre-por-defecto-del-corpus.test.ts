// Tarea 1.34 (agregada por el orquestador, decisión del PO 2026-10-02: «A, corrígelo antes del merge»): la re-verificación independiente del
// lote 1 (1.1–1.33) encontró, con instrumentos que no son la gramática del generador, cuatro familias de programas que javac 17 rechaza y que
// `compilar()` daba por buenos —«Java sí acepta tu programa», o `ok`—:
//   A. una sentencia o declaración dentro del `switch` ANTES del primer `case`/`default` (javac: `case, default, or '}' expected`);
//   B. `args` y `System.in`/`System.out`/`System.err` usados como VALOR (`int x = System.in;`, `args.length()`, `System.in.nextInt()`): el motor
//      no sabía su tipo y «no saber» terminaba en «sí»;
//   C. una clase del alumno con el nombre de una clase del JDK (`public class System`, `Math`, `Scanner`…, JLS 6.4.1 y 7.5.1);
//   D. una expresión entre paréntesis como sentencia (`(x = 2);`, JLS 14.8: javac `not a statement`);
// y, de paso, que un nombre que JavaScript trae en todos sus objetos (`constructor`, `toString`…) se leía como un operador (`int a = 1 constructor 2;`).
//
// Esta guarda vigila, en `npm test` y SIN JDK, el programa mínimo de cada familia (`corpus/experimentos/cierre-por-defecto/`) con los goldens del
// oráculo: el veredicto y la LÍNEA de javac salen del `.errores` real de cada programa (nunca escritos a mano). Lo que fija esta tabla es la
// respuesta de NUESTRO compilador, con el principio de la 1.32 y la regla nueva de la 1.34:
//   - dentro del subconjunto U3–U7: un error de compilación con el código propio de la regla y la MISMA línea que javac;
//   - fuera del subconjunto (arreglos, `InputStream`/`PrintStream` como valor, un objeto de la clase propia): el aviso de «no disponible», sin
//     modelar la regla de javac (D2, ADR 003/004) — nunca «Java sí acepta tu programa»: una expresión cuyo tipo el motor no conoce NO termina en
//     `ok` ni en `ejecucion-no-disponible`;
//   - un programa que javac compila (los controles `*-valido`): nunca un error.
// `programas-invalidos.test.ts` y `programas-validos.test.ts` recorren además el mismo corpus con la regla general.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import { textoDelProblema } from '../../src/presentacion/texto-del-problema.ts';

const RUTA_CORPUS = resolve('corpus/experimentos/cierre-por-defecto');

interface Golden {
  readonly fuente: string;
  readonly compilo: boolean;
  /** La línea del primer error de javac, leída del `.errores` real; `null` si compiló. */
  readonly lineaDeJavac: number | null;
}

function leerGolden(archivo: string): Golden {
  const base = resolve(RUTA_CORPUS, archivo);
  const { compilo } = JSON.parse(readFileSync(`${base}.oraculo.json`, 'utf-8')) as { compilo: boolean };
  const primerError = /\.java:(\d+): error:/.exec(readFileSync(`${base}.errores`, 'utf-8'));
  return {
    fuente: readFileSync(`${base}.java`, 'utf-8'),
    compilo,
    lineaDeJavac: primerError === null ? null : Number(primerError[1]),
  };
}

// Programas que javac RECHAZA y que el subconjunto modela: nuestro error, con la línea de javac.
const ERRORES: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  // A — una sentencia antes del primer `case`: javac `expected3` («case, default, or '}' expected»), en la línea de la sentencia.
  ['a-switch-break-antes-del-case', 'sentencia-antes-del-primer-case'],
  ['a-switch-println-antes-del-case', 'sentencia-antes-del-primer-case'],
  ['a-switch-declaracion-antes-del-case', 'sentencia-antes-del-primer-case'],
  ['a-switch-punto-y-coma-antes-del-case', 'sentencia-antes-del-primer-case'],
  ['a-switch-solo-una-sentencia', 'sentencia-antes-del-primer-case'],
  ['a-switch-bloque-antes-del-case', 'sentencia-antes-del-primer-case'],
  // C — la clase del alumno tapa a la del JDK (JLS 6.4.1): `System` no tiene `out`, `Math` no tiene `sqrt`…; un `import` de un solo tipo con el mismo
  // nombre choca con ella (JLS 7.5.1) y javac lo señala en la línea del `import`.
  ['c-clase-system-println', 'campo-no-declarado'],
  ['c-clase-math-sqrt', 'miembro-no-declarado'],
  ['c-clase-integer-parseint', 'miembro-no-declarado'],
  ['c-clase-scanner-con-import-exacto', 'clase-repetida-con-import'],
  ['c-clase-random-con-import-exacto', 'clase-repetida-con-import'],
  ['c-clase-system-con-import-de-java-lang', 'clase-repetida-con-import'],
  // D — una expresión entre paréntesis como sentencia (JLS 14.8); y el nombre de una clase entre paréntesis ya no es una clase.
  ['d-parentesis-asignacion', 'sentencia-entre-parentesis'],
  ['d-parentesis-incremento', 'sentencia-entre-parentesis'],
  ['d-parentesis-println', 'sentencia-entre-parentesis'],
  ['d-parentesis-dobles', 'sentencia-entre-parentesis'],
  ['d-parentesis-nextint', 'sentencia-entre-parentesis'],
  ['d-parentesis-nombre-de-clase', 'variable-no-declarada'],
  // E — nombres de `Object.prototype`: `toString` y `constructor` no son campos de `System` (antes: TypeError) ni operadores (antes: se aceptaban).
  ['e-prototipo-system-tostring-como-argumento', 'campo-no-declarado'],
  ['e-prototipo-system-constructor-en-math', 'campo-no-declarado'],
  ['e-prototipo-nombre-como-operador', 'falta-punto-y-coma'],
  ['e-prototipo-nombre-como-operador-tostring', 'falta-punto-y-coma'],
];

// Programas que javac RECHAZA y que usan algo FUERA del subconjunto (un arreglo, un `InputStream`, un objeto de la clase propia): aviso, nunca
// «Java sí acepta tu programa». Su línea es la de la construcción, no la del error de javac, así que no se compara.
const AVISOS: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  // B — `args` es un arreglo (`String[]`): fuera del subconjunto.
  ['b-args-length-con-parentesis', 'arreglo-no-soportado'],
  ['b-args-como-entero', 'arreglo-no-soportado'],
  ['b-args-asignado', 'arreglo-no-soportado'],
  ['b-args-en-una-condicion', 'arreglo-no-soportado'],
  // B — `System.in`/`System.out` usados como VALOR (no como argumento del `Scanner` ni como receptor de `println`): su tipo no está modelado.
  ['b-system-in-como-entero', 'valor-de-tipo-no-modelado'],
  ['b-system-in-como-texto', 'valor-de-tipo-no-modelado'],
  ['b-system-in-nextint', 'valor-de-tipo-no-modelado'],
  ['b-system-in-read', 'valor-de-tipo-no-modelado'],
  ['b-system-in-comparado', 'valor-de-tipo-no-modelado'],
  ['b-system-in-con-signo-en-el-scanner', 'valor-de-tipo-no-modelado'],
  // C — el nombre de la propia clase como TIPO: «objetos propios» (REQ-SUB-007).
  ['c-clase-string-como-tipo', 'clase-no-soportada'],
];

// Controles: programas que javac COMPILA. Ninguno se rechaza; los que usan algo fuera del subconjunto son un aviso honesto, y el resto, que ya pasó
// todas las revisiones, solo espera a que el lote 2 lo ejecute.
const VALIDOS: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  ['a-switch-sentencias-despues-del-case-valido', 'ok'],
  ['b-flujos-estandar-validos', 'ejecucion-no-disponible'],
  ['b-args-length-valido', 'arreglo-no-soportado'],
  ['c-clase-math-sin-usar-valido', 'ok'],
  ['c-clase-scanner-con-comodin-valido', 'ok'],
  ['c-clase-random-como-tipo-valido', 'clase-no-soportada'],
  ['c-clase-math-recursion-valido', 'clase-no-soportada'],
  ['d-parentesis-validos', 'ok'],
  ['e-prototipo-nombres-validos', 'ok'],
];

describe('corpus/experimentos/cierre-por-defecto — el corpus de la tarea 1.34 está completo', () => {
  it('cada programa del directorio aparece en exactamente UNA de las tres tablas (ninguno olvidado, ninguno repetido)', () => {
    const enDisco = readdirSync(RUTA_CORPUS)
      .filter((nombre) => nombre.endsWith('.java'))
      .map((nombre) => nombre.slice(0, -'.java'.length))
      .sort();
    const enTablas = [...ERRORES, ...AVISOS, ...VALIDOS].map(([archivo]) => archivo).sort();
    expect(enTablas).toEqual(enDisco);
    // Piso: 42 programas (33 que javac rechaza y 9 que compila); un directorio vacío no pasaría desapercibido.
    expect(enDisco.length).toBeGreaterThanOrEqual(42);
  });

  it('las tres tablas coinciden con el veredicto real de javac guardado en cada `.oraculo.json`', () => {
    for (const [archivo] of [...ERRORES, ...AVISOS]) expect(leerGolden(archivo).compilo, `${archivo}: javac debe rechazarlo`).toBe(false);
    for (const [archivo] of VALIDOS) expect(leerGolden(archivo).compilo, `${archivo}: javac debe compilarlo`).toBe(true);
  });
});

describe('cierre por defecto — un programa que javac rechaza sale como error en la MISMA línea de javac', () => {
  it.each(ERRORES)('%s → [%s]', (archivo, codigo) => {
    const { fuente, lineaDeJavac } = leerGolden(archivo);
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó (ok: true) y javac lo rechaza en la línea ${lineaDeJavac}`);
    expect(resultado.problema.categoria, `${archivo}: ${resultado.problema.codigo}`).toBe('error-compilacion');
    expect(resultado.problema.codigo).toBe(codigo);
    expect(resultado.problema.linea).toBe(lineaDeJavac);
  });
});

describe('cierre por defecto — lo que LEE el alumno: cada error empieza con la línea de javac y ningún texto trae restos', () => {
  it.each(ERRORES)('%s → «Línea N: …» con la línea real de javac', (archivo) => {
    const { fuente, lineaDeJavac } = leerGolden(archivo);
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó`);
    const texto = textoDelProblema(resultado.problema);
    expect(texto.startsWith(`Línea ${lineaDeJavac}: `), `${archivo}: ${texto}`).toBe(true);
    expect(texto, archivo).not.toMatch(/undefined|\bNaN\b|\[object|\{[a-zA-Z]/);
    expect(texto.length, archivo).toBeGreaterThan(`Línea ${lineaDeJavac}: `.length + 20);
  });
});

describe('cierre por defecto — fuera del subconjunto: aviso honesto, nunca «Java sí acepta tu programa» (D2)', () => {
  it.each(AVISOS)('%s → aviso [%s]', (archivo, codigo) => {
    const { fuente } = leerGolden(archivo);
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó (ok: true) y javac lo rechaza`);
    expect(resultado.problema.categoria, `${archivo}: ${resultado.problema.codigo}`).toBe('no-disponible');
    expect(resultado.problema.codigo).toBe(codigo);
  });

  it.each(AVISOS)('%s → el aviso nombra la construcción y su línea, sin restos', (archivo) => {
    const { fuente } = leerGolden(archivo);
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó`);
    const texto = textoDelProblema(resultado.problema);
    expect(texto, archivo).toContain(`línea ${resultado.problema.linea}`);
    expect(texto, archivo).not.toMatch(/undefined|\bNaN\b|\[object|\{[a-zA-Z]/);
  });
});

describe('cierre por defecto — controles: lo que javac compila no se rechaza', () => {
  it.each(VALIDOS)('%s → [%s]', (archivo, codigo) => {
    const { fuente } = leerGolden(archivo);
    const resultado = compilar(fuente);
    // `ok`: el programa se puede ejecutar de verdad hoy (solo `System.out.println` de un literal de texto, lo único que baja a IR).
    if (codigo === 'ok') {
      expect(resultado.ok, `${archivo}: ${resultado.ok ? 'ok' : `${resultado.problema.codigo} en la línea ${resultado.problema.linea}`}`).toBe(true);
      return;
    }
    if (resultado.ok) throw new Error(`${archivo}: se esperaba ${codigo} y salió ok: true`);
    expect(resultado.problema.categoria, `${archivo}: ${resultado.problema.codigo} en la línea ${resultado.problema.linea}`).toBe('no-disponible');
    expect(resultado.problema.codigo).toBe(codigo);
  });
});
