// Tarea 1.32 (agregada por el orquestador, decisión del PO 2026-09-29: «A, corrígelo antes del merge»): las familias de
// ATRIBUCIÓN que encontró el generador diferencial de la 1.31 (`npm run oraculo:generados`) — cast inválido (F1), miembro de
// un primitivo (F2), `final` con `++`/`--` (F3), etiquetas de `switch` (F4), `void` como valor (F5), método de instancia por
// el nombre de la clase (F6), tipos envoltorio (N1), `Scanner`/`Random` sin `import` (N5) y una variable que tapa una clase
// del JDK (N6) — dejaban pasar programas que javac 17 rechaza y el alumno leía «Java sí acepta tu programa».
//
// Esta guarda vigila, en `npm test` y SIN JDK, el programa mínimo de cada familia (`corpus/experimentos/atribucion/`) con los
// goldens del oráculo: el veredicto y la LÍNEA de javac salen del `.errores` real de cada programa (nunca escritos a mano). Lo
// que fija esta tabla es la respuesta de NUESTRO compilador:
//   - dentro del subconjunto U3–U7 (REQ-SUB-002/REQ-SUB-005): un error de compilación con el código propio de la regla y la
//     MISMA línea que javac;
//   - fuera del subconjunto (los tipos envoltorio como TIPO de variable, REQ-SUB-002 solo lista int, double, boolean, char,
//     String y long): el aviso de «no disponible», sin modelar la regla de javac (D2, ADR 003/004); su línea es la de la
//     construcción, no la del error de javac, así que no se compara;
//   - un programa que javac compila (los controles `*-validos`): nunca un error; todas las pasadas lo aceptan.
// `programas-invalidos.test.ts` y `programas-validos.test.ts` recorren además el mismo corpus con la regla general.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import { textoDelProblema } from '../../src/presentacion/texto-del-problema.ts';

const RUTA_ATRIBUCION = resolve('corpus/experimentos/atribucion');

interface Golden {
  readonly fuente: string;
  readonly compilo: boolean;
  /** La línea del primer error de javac, leída del `.errores` real; `null` si compiló. */
  readonly lineaDeJavac: number | null;
}

function leerGolden(archivo: string): Golden {
  const base = resolve(RUTA_ATRIBUCION, archivo);
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
  // F1 — cast inválido (JLS 5.5): javac `prob.found.req`, 44 de los 64 pares (origen, destino) de los 8 tipos.
  ['f1-cast-texto-a-int', 'cast-invalido'],
  ['f1-cast-booleano-a-int', 'cast-invalido'],
  ['f1-cast-numero-a-texto', 'cast-invalido'],
  ['f1-cast-numero-a-booleano', 'cast-invalido'],
  ['f1-cast-texto-en-expresion', 'cast-invalido'],
  ['f1-cast-entre-objetos', 'cast-invalido'],
  // F2 — un miembro de un primitivo: javac `cant.deref`.
  ['f2-int-con-metodo', 'miembro-de-primitivo'],
  ['f2-double-con-equals', 'miembro-de-primitivo'],
  ['f2-literal-largo-con-metodo', 'miembro-de-primitivo'],
  ['f2-caracter-con-metodo', 'miembro-de-primitivo'],
  ['f2-variable-primitiva-tapa-system', 'miembro-de-primitivo'],
  // F3 — `final` con `++`/`--`: javac `cant.assign.val.to.final.var`, en atribución (pasada 2) como cualquier otro error de tipos.
  ['f3-final-incremento', 'variable-final-reasignada'],
  ['f3-final-decremento-prefijo', 'variable-final-reasignada'],
  ['f3-final-en-ciclo', 'variable-final-reasignada'],
  ['f3-final-reasignada-antes-de-otro-error', 'variable-final-reasignada'],
  // F4 — etiquetas de `switch`: javac `prob.found.req` y `duplicate.default.label`.
  ['f4-switch-etiqueta-texto-en-int', 'etiqueta-de-case-de-otro-tipo'],
  ['f4-switch-char-etiqueta-grande', 'etiqueta-de-case-de-otro-tipo'],
  ['f4-switch-texto-etiqueta-numero', 'etiqueta-de-case-de-otro-tipo'],
  ['f4-switch-default-repetido', 'etiqueta-default-duplicada'],
  // F5 — `void` como valor: javac `prob.found.req` y `void.not.allowed.here`.
  ['f5-void-en-declaracion', 'llamada-sin-valor'],
  ['f5-void-como-argumento', 'llamada-sin-valor'],
  ['f5-void-en-condicion', 'llamada-sin-valor'],
  ['f5-void-de-scanner-close', 'llamada-sin-valor'],
  ['f5-void-en-operacion', 'llamada-sin-valor'],
  // F6 — un método de instancia por el nombre de la clase: javac `non-static.cant.be.ref`.
  ['f6-texto-trim-por-clase', 'metodo-de-instancia-sin-objeto'],
  ['f6-scanner-nextint-por-clase', 'metodo-de-instancia-sin-objeto'],
  ['f6-random-nextint-por-clase', 'metodo-de-instancia-sin-objeto'],
  ['f6-scanner-close-por-clase', 'metodo-de-instancia-sin-objeto'],
  // N5 — `Scanner`/`Random` sin `import`, como receptor o como destino de un cast: javac `cant.resolve.location`.
  ['n5-scanner-sin-import-como-receptor', 'tipo-requiere-import'],
  ['n5-random-sin-import-como-receptor', 'tipo-requiere-import'],
  ['n5-scanner-sin-import-en-cast', 'tipo-requiere-import'],
  // N6 — una variable que tapa el nombre de una clase (JLS 6.4.2, 6.5.2) y el alcance de una variable, que incluye su
  // propio inicializador (JLS 6.3): javac `cant.resolve.location` y `var.might.not.have.been.initialized`.
  ['n6-scanner-llamado-system', 'campo-no-declarado'],
  ['n6-texto-llamado-system', 'campo-no-declarado'],
  ['n6-variable-en-su-propio-inicializador', 'variable-posiblemente-no-asignada'],
  ['n6-calificador-en-su-inicializador', 'variable-posiblemente-no-asignada'],
  // Hermanos de N5 que el generador no sortea: el nombre de una clase como VALOR (`int r = Math;`) y un import de `java.lang` que no
  // existe (`PrintStream` es de `java.io`): javac `cant.resolve.location` en los dos.
  ['n5-clase-como-valor', 'variable-no-declarada'],
  ['n5-import-java-lang-inexistente', 'importacion-no-reconocida'],
];

// Programas que javac RECHAZA y que usan algo FUERA del subconjunto: aviso, nunca «Java sí acepta tu programa».
const AVISOS: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  ['n1-long-con-entero', 'clase-no-soportada'],
  ['n1-integer-a-booleano', 'clase-no-soportada'],
  ['n1-double-con-entero', 'clase-no-soportada'],
  ['n6-double-llamado-math', 'clase-no-soportada'],
];

// Controles: programas que javac COMPILA. Todas las pasadas los aceptan (solo falta ejecutarlos); el envoltorio, fuera del
// subconjunto, es un aviso honesto.
const VALIDOS: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  ['f1-cast-validos', 'ejecucion-no-disponible'],
  ['f2-metodos-validos', 'ejecucion-no-disponible'],
  ['f3-final-valida', 'ejecucion-no-disponible'],
  ['f4-switch-etiquetas-validas', 'ejecucion-no-disponible'],
  // Tarea 1.33: el programa termina con `System.out.println(System.out.printf("%d", 1));` — `printf` como ARGUMENTO devuelve un PrintStream que el subconjunto no modela: el aviso propio, no el genérico.
  ['f5-void-como-sentencia-valido', 'valor-de-tipo-no-soportado'],
  ['f6-metodos-de-clase-validos', 'ejecucion-no-disponible'],
  ['n1-envoltorios-validos', 'clase-no-soportada'],
  ['n5-imports-con-comodin-validos', 'ejecucion-no-disponible'],
  ['n6-variables-con-nombre-de-clase-validas', 'ejecucion-no-disponible'],
  ['n6-asignacion-en-su-inicializador-valida', 'ejecucion-no-disponible'],
];

describe('corpus/experimentos/atribucion — el corpus de la tarea 1.32 está completo', () => {
  it('cada programa del directorio aparece en exactamente UNA de las tres tablas (ninguno olvidado, ninguno repetido)', () => {
    const enDisco = readdirSync(RUTA_ATRIBUCION)
      .filter((nombre) => nombre.endsWith('.java'))
      .map((nombre) => nombre.slice(0, -'.java'.length))
      .sort();
    const enTablas = [...ERRORES, ...AVISOS, ...VALIDOS].map(([archivo]) => archivo).sort();
    expect(enTablas).toEqual(enDisco);
    // Piso: 51 programas (41 que javac rechaza y 10 que compila); un directorio vacío no pasaría desapercibido.
    expect(enDisco.length).toBeGreaterThanOrEqual(51);
  });

  it('las tres tablas coinciden con el veredicto real de javac guardado en cada `.oraculo.json`', () => {
    for (const [archivo] of [...ERRORES, ...AVISOS]) expect(leerGolden(archivo).compilo, `${archivo}: javac debe rechazarlo`).toBe(false);
    for (const [archivo] of VALIDOS) expect(leerGolden(archivo).compilo, `${archivo}: javac debe compilarlo`).toBe(true);
  });
});

describe('atribución — un programa que javac rechaza sale como error en la MISMA línea de javac', () => {
  it.each(ERRORES)('%s → [%s]', (archivo, codigo) => {
    const { fuente, lineaDeJavac } = leerGolden(archivo);
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó (ok: true) y javac lo rechaza en la línea ${lineaDeJavac}`);
    expect(resultado.problema.categoria, `${archivo}: ${resultado.problema.codigo}`).toBe('error-compilacion');
    expect(resultado.problema.codigo).toBe(codigo);
    expect(resultado.problema.linea).toBe(lineaDeJavac);
  });
});

describe('atribución — lo que LEE el alumno: cada error empieza con la línea de javac y ningún texto trae restos', () => {
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

describe('atribución — fuera del subconjunto: aviso, sin modelar la regla de javac (D2)', () => {
  it.each(AVISOS)('%s → aviso [%s]', (archivo, codigo) => {
    const { fuente } = leerGolden(archivo);
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó (ok: true) y javac lo rechaza`);
    expect(resultado.problema.categoria, `${archivo}: ${resultado.problema.codigo}`).toBe('no-disponible');
    expect(resultado.problema.codigo).toBe(codigo);
  });
});

describe('atribución — controles: lo que javac compila no se rechaza', () => {
  it.each(VALIDOS)('%s → [%s]', (archivo, codigo) => {
    const { fuente } = leerGolden(archivo);
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error(`${archivo}: se esperaba ${codigo} y salió ok: true`);
    expect(resultado.problema.categoria, `${archivo}: ${resultado.problema.codigo} en la línea ${resultado.problema.linea}`).toBe('no-disponible');
    expect(resultado.problema.codigo).toBe(codigo);
  });
});
