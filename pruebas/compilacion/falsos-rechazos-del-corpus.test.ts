// Tarea 1.35 (agregada por el orquestador, decisión del PO 2026-10-02: «A, corrígelo antes del merge»): la re-verificación independiente del lote 1 (1.1–1.33)
// encontró, además de los falsos aceptos de la 1.34, FALSOS RECHAZOS: programas que javac 17 COMPILA y que `compilar()` presentaba como un error de compilación
// («Hay un error de sintaxis aquí», «Te falta un punto y coma») sobre código que está bien. Es el peor fallo posible del visualizador: le dice al alumno que su
// programa está mal cuando no lo está (regla 5 de CLAUDE.md, D2).
//
// Esta guarda vigila, en `npm test` y SIN JDK, el programa mínimo de cada familia (`corpus/experimentos/falsos-rechazos/`) con los goldens del oráculo: el veredicto y la
// LÍNEA de javac salen del `.errores` real de cada programa (nunca escritos a mano). Lo que fija esta tabla es la respuesta de NUESTRO compilador, con el principio de la
// 1.32 («dentro de U3–U7 se modela la regla de javac; fuera, un aviso honesto»):
//   A. constantes (JLS 5.2 y 15.29): `final int A = 'a'; char c = A;` y `case (String) "a":` los compila javac; el motor no conocía el valor de una variable `final`
//      convertido al tipo declarado ni los casts a `String` y `boolean` como constantes. Dentro del subconjunto se modelan (y se prueba lo contrario: sin `final`,
//      fuera de rango o con una constante `long`, javac RECHAZA y el motor también, en la misma línea);
//   B–D. `instanceof` con patrón o con nombre completo, `sealed`/`non-sealed`/`permits` y la clase anónima: fuera del subconjunto → aviso, nunca un error;
//   E. un archivo sin ninguna clase (vacío, solo un comentario, solo un `import`): javac lo compila, no hay nada que ejecutar → aviso `archivo-sin-clase`;
//   F. `main` con otra firma que la del lanzador (`String...`, `final String[]`, `String args[]` SÍ son la misma; dos parámetros, ninguno, un parámetro que no es un
//      arreglo de `String`: javac los compila y el lanzador real dice que no hay `main`; el golden guarda ese desenlace) → un método propio más;
//   G. escapes Unicode con significado sintáctico (JLS 3.3: `\u0022` es una comilla, `\u0026\u0026` es `&&`…, y uno pegado al final de un literal que sin él falla: `0x1.8\u00701`) → aviso; y su
//      contraparte, un `\u` MAL formado en un comentario (una ruta de Windows pegada: `C:\users\juan`), que javac rechaza (`illegal unicode escape`) y que antes se aceptaba;
//   H–K. `for` mejorado con el tipo completo, `Clase.<T>metodo()`, `new Tipo<…>()` y los `import` tras un `;` suelto → aviso o ok, nunca un error;
//   L, O. un campo cuya expresión sigue en la línea de abajo es válido; un campo sin su `;` es un error en la línea DEL CAMPO (como javac), no en la del miembro
//      que le sigue, y no se lo traga como si fuera parte de él;
//   M. `import paquete.*;` de un paquete que no existe (`java.sqrt`, `java.Util`, `org.junit`): javac lo rechaza, y el motor lo daba por bueno;
//   N. un parámetro de `main` que tapa a `System`: javac lo rechaza; el motor no modela arreglos (aviso);
//   P. un TIPO en posición de expresión (hallada por la mutación por elemento del conjunto de palabras que abren el operando de un cast): `(String[]) args`, `(java.util.List<String>) x`,
//      `(A & B) x`, `String.class`, `int[].class`, `toArray(String[]::new)`, `ArrayList<String>::new` los compila javac y el analizador solo conocía `(primitivo)` y `(Nombre)`;
//      fuera del subconjunto → aviso (arreglo, genérico, clase, literal de clase, referencia a método); y lo que javac rechaza (`f().class`, `String[]` solo, `int` solo, un cast a un
//      tipo que no existe) sigue siendo un error en la misma línea;
//   Q. un emoji dentro de un literal `char` (`'<un emoji>'`: dos unidades UTF-16, javac lo compila con el valor de la primera): aviso; dos emojis en un `char` son un error.
// `programas-invalidos.test.ts` y `programas-validos.test.ts` recorren además el mismo corpus con la regla general.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import { textoDelProblema } from '../../src/presentacion/texto-del-problema.ts';

const RUTA_CORPUS = resolve('corpus/experimentos/falsos-rechazos');

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
  // A — la conversión de una constante solo estrecha cuando javac lo permite (JLS 5.2): sin `final`, fuera del rango de `char` o con una constante `long`, no.
  ['a-char-desde-int-sin-final', 'conversion-con-perdida'],
  ['a-char-desde-constante-fuera-de-rango', 'conversion-con-perdida'],
  ['a-int-desde-constante-long', 'conversion-con-perdida'],
  // G — un `\u` mal formado se traduce también dentro de un comentario (JLS 3.3): javac `illegal unicode escape`, en la línea del escape.
  ['g-escape-mal-formado-en-un-comentario', 'error-no-clasificado'],
  ['g-ruta-de-windows-en-un-comentario', 'error-no-clasificado'],
  // G — un escape SEPARADO del literal (tras un espacio) no es parte de él: `0x1.8` sigue mal escrito.
  ['g-literal-mal-formado-con-un-escape-separado', 'error-no-clasificado'],
  // M — el comodín de un `import` exige un paquete que exista (JLS 7.5.2): javac señala la línea del `import`.
  ['m-import-comodin-de-paquete-inexistente', 'importacion-no-reconocida'],
  ['m-import-comodin-con-mayuscula-de-mas', 'importacion-no-reconocida'],
  ['m-import-comodin-de-un-paquete-ajeno-al-jdk', 'importacion-no-reconocida'],
  // O — un campo sin su `;`: «';' expected» en el FIN de su última palabra, no en el del miembro siguiente.
  ['o-campo-sin-punto-y-coma-antes-de-un-metodo', 'falta-punto-y-coma'],
  ['o-campo-sin-punto-y-coma-antes-de-otro-campo', 'falta-punto-y-coma'],
  ['o-campo-sin-inicializador-sin-punto-y-coma', 'falta-punto-y-coma'],
  ['o-campo-con-llamada-sin-punto-y-coma', 'falta-punto-y-coma'],
  ['o-campo-sin-punto-y-coma-antes-de-un-constructor', 'falta-punto-y-coma'],
  ['o-campo-sin-punto-y-coma-antes-de-una-clase-anidada', 'falta-punto-y-coma'],
  ['o-campo-con-llave-tras-el-nombre', 'falta-punto-y-coma'],
  ['o-campo-sin-punto-y-coma-al-final-de-la-clase', 'falta-punto-y-coma'],
  ['o-dos-campos-en-el-mismo-renglon-sin-punto-y-coma', 'falta-punto-y-coma'],
  ['o-campo-con-dos-cadenas-seguidas', 'falta-punto-y-coma'],
  // O — una expresión que todavía espera algo no puede terminar: tras `=` javac dice «illegal start of expression» EN el modificador del miembro siguiente, tras una coma o un
  // punto «<identifier> expected» en el FIN de esa coma o de ese punto. Sin código propio (el catálogo no tiene uno para esos mensajes): «Hay un error de sintaxis aquí», en la línea de javac.
  ['o-campo-que-espera-un-operando-antes-de-un-modificador', 'error-no-clasificado'],
  ['o-coma-sin-el-nombre-del-siguiente-campo', 'error-no-clasificado'],
  ['o-campo-con-punto-sin-el-miembro', 'error-no-clasificado'],
  // P — un tipo en una expresión solo se lee como lo lee javac: `.class` solo cuelga de un nombre de tipo, un arreglo o una palabra de tipo primitivo (`<identifier> expected`,
  // «'.class' expected»), y `(a.b)(1)` es una conversión al tipo `a.b` (que no existe), no una llamada.
  ['p-literal-de-clase-de-una-llamada', 'error-no-clasificado'],
  ['p-tipo-de-arreglo-sin-class', 'error-no-clasificado'],
  ['p-tipo-primitivo-como-valor', 'error-no-clasificado'],
  ['p-cast-a-un-tipo-que-no-existe', 'tipo-no-reconocido'],
  // Q — un `char` con dos emojis: javac `unclosed character literal`.
  ['q-dos-emojis-en-un-char', 'error-no-clasificado'],
];

// Programas que javac RECHAZA y que usan algo FUERA del subconjunto (un arreglo): aviso, nunca «Java sí acepta tu programa». Su línea es la de la construcción, no la
// del error de javac, así que no se compara.
const AVISOS: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  // N — el parámetro `System` (un arreglo) tapa a la clase `System`: javac `cannot find symbol`.
  ['n-parametro-de-main-tapa-a-system', 'arreglo-no-soportado'],
];

// Controles: programas que javac COMPILA. Ninguno se rechaza; los que usan algo fuera del subconjunto son un aviso honesto, y el resto, que ya pasó todas las revisiones,
// solo espera a que el lote 2 lo ejecute (`ejecucion-no-disponible`) o ya se puede ejecutar de verdad (`ok`).
const VALIDOS: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  // A — constantes: el valor de `final int A = 'a'` convertido a `char` cabe; un cast a `String`, `int` o `char` de un literal es una constante de `case`; `(boolean) true`
  // es una condición constante para la asignación definitiva y para el ciclo.
  ['a-constante-char-por-int-valido', 'ok'],
  ['a-constante-byte-short-valido', 'tipo-primitivo-no-soportado'],
  ['a-case-cast-a-string-valido', 'ok'],
  ['a-case-constante-string-con-cast-valido', 'ok'],
  ['a-case-cast-a-int-valido', 'ok'],
  ['a-case-cast-a-char-valido', 'ok'],
  ['a-asignacion-definitiva-cast-boolean-valido', 'ok'],
  ['a-ciclo-con-cast-boolean-valido', 'ok'],
  // B, C, D — `instanceof` con patrón o nombre completo, clases selladas y clase anónima.
  ['b-instanceof-con-patron-valido', 'instanceof'],
  ['b-instanceof-con-patron-final-valido', 'instanceof'],
  ['b-instanceof-con-tipo-calificado-valido', 'instanceof'],
  ['c-sealed-interface-con-permits-valido', 'miembro-de-clase-no-soportado'],
  ['c-sealed-clase-de-nivel-superior-valido', 'herencia-no-soportada'],
  ['c-non-sealed-valido', 'herencia-no-soportada'],
  ['d-clase-anonima-valida', 'clase-anonima-no-soportada'],
  ['d-clase-anonima-sin-miembros-valida', 'clase-anonima-no-soportada'],
  // E — un archivo sin ninguna clase.
  ['e-archivo-vacio-valido', 'archivo-sin-clase'],
  ['e-solo-comentario-valido', 'archivo-sin-clase'],
  ['e-solo-import-valido', 'archivo-sin-clase'],
  // F — `main` con la firma del lanzador (`ok`) y con otra (un método propio más: aviso).
  ['f-main-varargs-valido', 'ok'],
  ['f-main-final-valido', 'ok'],
  ['f-main-estilo-c-valido', 'ok'],
  ['f-main-dos-parametros-valido', 'miembro-de-clase-no-soportado'],
  ['f-main-sin-parametros-valido', 'miembro-de-clase-no-soportado'],
  ['f-main-parametro-que-no-es-arreglo-valido', 'miembro-de-clase-no-soportado'],
  ['f-main-arreglo-de-otro-tipo-valido', 'miembro-de-clase-no-soportado'],
  // G — escapes Unicode con significado sintáctico.
  ['g-escape-comilla-valido', 'escape-unicode-no-soportado'],
  ['g-escape-ampersand-valido', 'escape-unicode-no-soportado'],
  ['g-escape-llaves-valido', 'escape-unicode-no-soportado'],
  ['g-escape-punto-y-coma-valido', 'escape-unicode-no-soportado'],
  ['g-escape-mas-valido', 'escape-unicode-no-soportado'],
  ['g-nombre-con-escape-valido', 'escape-unicode-no-soportado'],
  ['g-var-con-nombre-con-escape-valido', 'escape-unicode-no-soportado'],
  // G — un escape PEGADO al final de un literal que sin él falla (la `p` de `0x1.8p1`, el primer dígito de `0x1F`, la comilla de un `char`): javac lo junta al literal (lo halló la campaña de 100 000).
  ['g-escape-pegado-al-exponente-de-un-flotante-hexadecimal-valido', 'escape-unicode-no-soportado'],
  ['g-escape-pegado-al-primer-digito-de-un-hexadecimal-valido', 'escape-unicode-no-soportado'],
  ['g-escape-que-cierra-un-caracter-valido', 'escape-unicode-no-soportado'],
  // H, I, K — `for` mejorado con el tipo completo, argumentos de tipo explícitos y `new Tipo<…>()`.
  ['h-for-mejorado-float-valido', 'tipo-primitivo-no-soportado'],
  ['h-for-mejorado-arreglo-de-arreglos-valido', 'arreglo-no-soportado'],
  ['h-for-mejorado-final-valido', 'arreglo-no-soportado'],
  ['h-for-mejorado-con-tipo-generico-valido', 'generico-no-soportado'],
  ['i-llamada-generica-explicita-valida', 'miembro-de-clase-no-soportado'],
  ['k-new-con-argumentos-de-tipo-valido', 'generico-no-soportado'],
  // J — los `import`: tras un `;` suelto y el comodín de un paquete real.
  ['j-import-tras-un-punto-y-coma-suelto-valido', 'ok'],
  ['j-import-comodin-de-un-paquete-real-valido', 'ok'],
  // L — la expresión de un campo puede seguir en la línea de abajo.
  ['l-campo-que-sigue-en-la-linea-siguiente-valido', 'miembro-de-clase-no-soportado'],
  // P — un tipo en posición de expresión: casts a arreglos, genéricos, nombres con paquete e intersecciones; literales de clase; referencias a método con un tipo de receptor.
  ['p-cast-a-arreglo-valido', 'arreglo-no-soportado'],
  ['p-cast-a-arreglo-de-parametro-valido', 'arreglo-no-soportado'],
  ['p-cast-a-tipo-generico-valido', 'generico-no-soportado'],
  ['p-cast-con-nombre-calificado-valido', 'clase-no-soportada'],
  ['p-cast-a-interseccion-valido', 'clase-no-soportada'],
  ['p-literal-de-clase-valido', 'literal-de-clase-no-soportado'],
  ['p-literal-de-clase-primitivo-valido', 'literal-de-clase-no-soportado'],
  ['p-literal-de-clase-de-arreglo-valido', 'literal-de-clase-no-soportado'],
  ['p-literal-de-clase-como-operando-valido', 'literal-de-clase-no-soportado'],
  ['p-referencia-a-metodo-de-arreglo-valida', 'referencia-metodo'],
  ['p-referencia-a-metodo-de-tipo-generico-valida', 'referencia-metodo'],
  // Q — un emoji en un `char` (aviso) y en una cadena (ya funcionaba).
  ['q-emoji-en-un-char-valido', 'caracter-suplementario-no-soportado'],
  ['q-emoji-en-una-cadena-valido', 'ejecucion-no-disponible'],
];

describe('corpus/experimentos/falsos-rechazos — el corpus de la tarea 1.35 está completo', () => {
  it('cada programa del directorio aparece en exactamente UNA de las tres tablas (ninguno olvidado, ninguno repetido)', () => {
    const enDisco = readdirSync(RUTA_CORPUS)
      .filter((nombre) => nombre.endsWith('.java'))
      .map((nombre) => nombre.slice(0, -'.java'.length))
      .sort();
    const enTablas = [...ERRORES, ...AVISOS, ...VALIDOS].map(([archivo]) => archivo).sort();
    expect(enTablas).toEqual(enDisco);
    // Piso: 86 programas (28 que javac rechaza y 58 que compila); un directorio vacío no pasaría desapercibido.
    expect(enDisco.length).toBeGreaterThanOrEqual(86);
  });

  it('las tres tablas coinciden con el veredicto real de javac guardado en cada `.oraculo.json`', () => {
    for (const [archivo] of [...ERRORES, ...AVISOS]) expect(leerGolden(archivo).compilo, `${archivo}: javac debe rechazarlo`).toBe(false);
    for (const [archivo] of VALIDOS) expect(leerGolden(archivo).compilo, `${archivo}: javac debe compilarlo`).toBe(true);
  });
});

describe('falsos rechazos — un programa que javac rechaza sale como error en la MISMA línea de javac', () => {
  it.each(ERRORES)('%s → [%s]', (archivo, codigo) => {
    const { fuente, lineaDeJavac } = leerGolden(archivo);
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó (ok: true) y javac lo rechaza en la línea ${lineaDeJavac}`);
    expect(resultado.problema.categoria, `${archivo}: ${resultado.problema.codigo}`).toBe('error-compilacion');
    expect(resultado.problema.codigo).toBe(codigo);
    expect(resultado.problema.linea).toBe(lineaDeJavac);
  });
});

describe('falsos rechazos — lo que LEE el alumno: cada error empieza con la línea de javac y ningún texto trae restos', () => {
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

describe('falsos rechazos — fuera del subconjunto: aviso honesto, nunca «Java sí acepta tu programa» (D2)', () => {
  it.each(AVISOS)('%s → aviso [%s]', (archivo, codigo) => {
    const { fuente } = leerGolden(archivo);
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó (ok: true) y javac lo rechaza`);
    expect(resultado.problema.categoria, `${archivo}: ${resultado.problema.codigo}`).toBe('no-disponible');
    expect(resultado.problema.codigo).toBe(codigo);
  });
});

describe('falsos rechazos — controles: lo que javac compila no se rechaza', () => {
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

  // El texto de cada aviso nombra la construcción y su línea, sin restos (`undefined`, `NaN`, `[object`, `{nombre`). El de un archivo sin clase no tiene línea: no hay dónde.
  const conAviso = VALIDOS.filter(([, codigo]) => codigo !== 'ok');
  it.each(conAviso)('%s → [%s]: el texto del aviso es legible', (archivo, codigo) => {
    const { fuente } = leerGolden(archivo);
    const resultado = compilar(fuente);
    if (resultado.ok) throw new Error(`${archivo}: se esperaba ${codigo} y salió ok: true`);
    const texto = textoDelProblema(resultado.problema);
    if (codigo !== 'archivo-sin-clase' && codigo !== 'ejecucion-no-disponible') expect(texto, archivo).toContain(`línea ${resultado.problema.linea}`);
    expect(texto, archivo).not.toMatch(/undefined|\bNaN\b|\[object|\{[a-zA-Z]/);
    expect(texto.length, archivo).toBeGreaterThan(40);
  });
});
