// Tarea 1.33 (agregada por el orquestador, decisión del PO 2026-09-29: «A, corrígelo antes del merge»): las familias de LÉXICO
// y SINTAXIS que dejó el generador diferencial de la 1.31 (`npm run oraculo:generados`) tras cerrar las de atribución (1.32) —
// `var` y `yield` como nombre de variable (V, falsos rechazos), palabras reservadas como nombre (N2), guion bajo mal puesto en un
// literal (N3), flotantes hexadecimales y `case s ->` (N4, falsos rechazos), `printf` usado como valor (residual de la 1.32) y
// los dos diagnósticos con texto equivocado de la re-verificación del lote 1 (WARNING-2: `return 0;` en `main` y
// `println("a", x)`).
//
// Esta guarda vigila, en `npm test` y SIN JDK, el programa mínimo de cada familia (`corpus/experimentos/lexico-y-sintaxis/`) con
// los goldens del oráculo: el veredicto y la LÍNEA de javac salen del `.errores` real de cada programa (nunca escritos a mano).
// Lo que fija esta tabla es la respuesta de NUESTRO compilador:
//   - dentro del subconjunto U3–U7 (REQ-SUB-002/REQ-SUB-004, REQ-COMP-005/006): un error de compilación con el código propio de
//     la regla y la MISMA línea que javac;
//   - fuera del subconjunto (hexadecimal, `switch` con flecha, `yield`, el resultado de `printf`): el aviso de «no disponible»,
//     sin modelar la regla de javac (D2, ADR 003/004);
//   - un programa que javac compila (los controles): nunca un error; todas las pasadas lo aceptan, o un aviso honesto.
// `programas-invalidos.test.ts` y `programas-validos.test.ts` recorren además el mismo corpus con la regla general.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import { textoDelProblema } from '../../src/presentacion/texto-del-problema.ts';

const RUTA_CORPUS = resolve('corpus/experimentos/lexico-y-sintaxis');

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
  // N2 — una palabra reservada como nombre de variable: javac `not.stmt`, `enum.as.identifier`, `underscore.as.identifier`, `expected`.
  ['n2-native-como-nombre', 'palabra-reservada-como-nombre'],
  ['n2-enum-como-nombre', 'palabra-reservada-como-nombre'],
  ['n2-guion-bajo-como-nombre', 'palabra-reservada-como-nombre'],
  ['n2-goto-como-nombre', 'palabra-reservada-como-nombre'],
  ['n2-extends-en-una-constante', 'palabra-reservada-como-nombre'],
  ['n2-reservada-con-tipo-de-referencia', 'palabra-reservada-como-nombre'],
  ['n2-reservada-en-un-for', 'palabra-reservada-como-nombre'],
  // N3 — un guion bajo que no está entre dos dígitos (JLS 3.10.1/3.10.2): javac `illegal.underscore`.
  ['n3-guion-bajo-al-final', 'guion-bajo-mal-puesto'],
  ['n3-guiones-bajos-al-final', 'guion-bajo-mal-puesto'],
  ['n3-guion-bajo-antes-de-l', 'guion-bajo-mal-puesto'],
  ['n3-guion-bajo-antes-del-punto', 'guion-bajo-mal-puesto'],
  ['n3-guion-bajo-despues-del-punto', 'guion-bajo-mal-puesto'],
  ['n3-guion-bajo-antes-del-exponente', 'guion-bajo-mal-puesto'],
  ['n3-guion-bajo-al-final-del-exponente', 'guion-bajo-mal-puesto'],
  ['n3-guion-bajo-en-hexadecimal', 'guion-bajo-mal-puesto'],
  ['n3-guion-bajo-al-final-de-un-octal', 'guion-bajo-mal-puesto'],
  // N4 — un flotante hexadecimal con punto necesita su exponente `p`: javac `malformed.fp.lit`.
  ['n4-flotante-hexadecimal-sin-exponente', 'error-no-clasificado'],
  // V — `var`, `yield`, `record`… no valen como nombre de CLASE (javac `restricted.type.not.allowed`), y `yield()` sin calificar
  // no es una llamada (javac `invalid.yield`): un método que no existe.
  ['v-clase-llamada-var', 'error-no-clasificado'],
  ['v-clase-llamada-record', 'error-no-clasificado'],
  ['v-yield-llamado-como-metodo', 'metodo-no-declarado'],
  // WARNING-2 de la re-verificación del lote 1 — veredicto y línea ya eran correctos, el TEXTO no: `return 0;` decía «Te falta un
  // punto y coma» (javac `prob.found.req`, «unexpected return value») y `println("a", x)` decía «Te falta cerrar un paréntesis»
  // (javac `cant.apply.symbols`, «no suitable method found for println(String,int)»).
  ['w2-return-con-valor-en-main', 'retorno-con-valor'],
  ['w2-return-con-una-variable', 'retorno-con-valor'],
  ['w2-return-con-valor-en-un-ciclo', 'retorno-con-valor'],
  ['w2-println-con-dos-argumentos', 'sin-sobrecarga-aplicable'],
  ['w2-print-con-dos-argumentos', 'sin-sobrecarga-aplicable'],
  ['w2-print-sin-argumentos', 'sin-sobrecarga-aplicable'],
];

// Programas que javac RECHAZA y que usan algo FUERA del subconjunto: aviso, nunca «Java sí acepta tu programa».
const AVISOS: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  ['v-yield-fuera-de-un-switch', 'yield-no-soportado'],
  ['n4-switch-flecha-con-etiqueta-que-no-es-constante', 'switch-flecha-no-soportado'],
  // El resultado de `printf` es un `PrintStream` que el subconjunto no modela (`Tipo` no lo incluye): usarlo como VALOR es un aviso.
  ['p-printf-como-valor-de-una-declaracion', 'valor-de-tipo-no-soportado'],
  ['p-printf-como-condicion', 'valor-de-tipo-no-soportado'],
  ['p-printf-como-operando', 'valor-de-tipo-no-soportado'],
];

// Controles: programas que javac COMPILA. Todas las pasadas los aceptan (solo falta ejecutarlos) o, si usan algo fuera del
// subconjunto, dan el aviso honesto de esa construcción.
const VALIDOS: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  ['v-var-y-yield-como-nombre-de-variable', 'ejecucion-no-disponible'],
  ['v-yield-con-incremento-y-asignacion-compuesta', 'ejecucion-no-disponible'],
  ['v-var-y-yield-en-ciclos-y-condiciones', 'ejecucion-no-disponible'],
  ['v-var-y-yield-con-metodos-de-string', 'ejecucion-no-disponible'],
  ['v-nombres-contextuales-validos', 'ejecucion-no-disponible'],
  ['v-var-como-tipo-es-un-aviso', 'var-no-soportado'],
  ['n2-nombres-parecidos-a-reservadas-validos', 'ejecucion-no-disponible'],
  ['n3-guiones-bajos-validos', 'ejecucion-no-disponible'],
  ['n4-flotante-hexadecimal', 'literal-hexadecimal-no-soportado'],
  ['n4-flotante-hexadecimal-con-fraccion-y-signo', 'literal-hexadecimal-no-soportado'],
  ['n4-switch-flecha-con-constante', 'switch-flecha-no-soportado'],
  ['n4-switch-flecha-con-etiqueta-entre-parentesis', 'switch-flecha-no-soportado'],
  ['p-printf-como-sentencia-valido', 'ejecucion-no-disponible'],
  ['p-printf-como-argumento-de-println-valido', 'valor-de-tipo-no-soportado'],
  ['p-printf-encadenado-valido', 'valor-de-tipo-no-soportado'],
  ['w2-return-sin-valor-valido', 'ejecucion-no-disponible'],
  ['w2-println-sin-argumentos-valido', 'ejecucion-no-disponible'],
];

describe('corpus/experimentos/lexico-y-sintaxis — el corpus de la tarea 1.33 está completo', () => {
  it('cada programa del directorio aparece en exactamente UNA de las tres tablas (ninguno olvidado, ninguno repetido)', () => {
    const enDisco = readdirSync(RUTA_CORPUS)
      .filter((nombre) => nombre.endsWith('.java'))
      .map((nombre) => nombre.slice(0, -'.java'.length))
      .sort();
    const enTablas = [...ERRORES, ...AVISOS, ...VALIDOS].map(([archivo]) => archivo).sort();
    expect(enTablas).toEqual(enDisco);
    // Piso: 48 programas (31 que javac rechaza y 17 que compila); un directorio vacío no pasaría desapercibido.
    expect(enDisco.length).toBeGreaterThanOrEqual(48);
  });

  it('las tres tablas coinciden con el veredicto real de javac guardado en cada `.oraculo.json`', () => {
    for (const [archivo] of [...ERRORES, ...AVISOS]) expect(leerGolden(archivo).compilo, `${archivo}: javac debe rechazarlo`).toBe(false);
    for (const [archivo] of VALIDOS) expect(leerGolden(archivo).compilo, `${archivo}: javac debe compilarlo`).toBe(true);
  });
});

describe('léxico y sintaxis — un programa que javac rechaza sale como error en la MISMA línea de javac', () => {
  it.each(ERRORES)('%s → [%s]', (archivo, codigo) => {
    const { fuente, lineaDeJavac } = leerGolden(archivo);
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó (ok: true) y javac lo rechaza en la línea ${lineaDeJavac}`);
    expect(resultado.problema.categoria, `${archivo}: ${resultado.problema.codigo}`).toBe('error-compilacion');
    expect(resultado.problema.codigo).toBe(codigo);
    expect(resultado.problema.linea).toBe(lineaDeJavac);
  });
});

describe('léxico y sintaxis — lo que LEE el alumno: cada error empieza con la línea de javac y ningún texto trae restos', () => {
  it.each(ERRORES)('%s → «Línea N: …» con la línea real de javac', (archivo) => {
    const { fuente, lineaDeJavac } = leerGolden(archivo);
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó`);
    const texto = textoDelProblema(resultado.problema);
    expect(texto.startsWith(`Línea ${lineaDeJavac}: `), `${archivo}: ${texto}`).toBe(true);
    expect(texto, archivo).not.toMatch(/undefined|\bNaN\b|\[object|\{[a-zA-Z]/);
    expect(texto.length, archivo).toBeGreaterThan(`Línea ${lineaDeJavac}: `.length + 20);
  });

  // WARNING-2: el texto de estos dos errores comunes NO puede volver a ser el de una falta de puntuación.
  it.each([
    ['w2-return-con-valor-en-main', /return;/],
    ['w2-return-con-una-variable', /return;/],
    ['w2-println-con-dos-argumentos', /println/],
    ['w2-print-con-dos-argumentos', /print/],
  ] as const)('%s → el texto NO habla de punto y coma ni de paréntesis, y explica el problema real', (archivo, debeMencionar) => {
    const resultado = compilar(leerGolden(archivo).fuente);
    if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó`);
    const texto = textoDelProblema(resultado.problema);
    expect(texto, archivo).not.toMatch(/punto y coma|paréntesis/);
    expect(texto, archivo).toMatch(debeMencionar);
  });
});

describe('léxico y sintaxis — fuera del subconjunto: aviso, sin modelar la regla de javac (D2)', () => {
  it.each(AVISOS)('%s → aviso [%s]', (archivo, codigo) => {
    const { fuente } = leerGolden(archivo);
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó (ok: true) y javac lo rechaza`);
    expect(resultado.problema.categoria, `${archivo}: ${resultado.problema.codigo}`).toBe('no-disponible');
    expect(resultado.problema.codigo).toBe(codigo);
  });
});

describe('léxico y sintaxis — controles: lo que javac compila no se rechaza', () => {
  it.each(VALIDOS)('%s → [%s]', (archivo, codigo) => {
    const { fuente } = leerGolden(archivo);
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error(`${archivo}: se esperaba ${codigo} y salió ok: true`);
    expect(resultado.problema.categoria, `${archivo}: ${resultado.problema.codigo} en la línea ${resultado.problema.linea}`).toBe('no-disponible');
    expect(resultado.problema.codigo).toBe(codigo);
  });
});
