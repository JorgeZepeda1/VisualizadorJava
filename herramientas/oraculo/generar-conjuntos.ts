// Conjuntos de datos de la biblioteca (hito 1, parte A; tarea 2.1 acotada, ADR 010/011): los casos que el motor debe reproducir EXACTO
// (`Double.toString`, `printf`, `Random`, `Character`, `Scanner`, `parseInt`/`parseDouble`, mayúsculas/minúsculas de `String`) y lo que el JDK
// 17 REAL contesta a cada uno. Los casos los arma este archivo con azar determinista (`azar-determinista.ts`); el JDK los evalúa con
// `java/EvaluarBiblioteca.java`; el resultado se guarda en `corpus/datos/<conjunto>/` y las tablas que el motor necesita en ejecución
// (`Character`) en `src/motor/biblioteca/datos/*.generado.ts`. Nunca se escribe un valor esperado a mano (regla 4 de CLAUDE.md).
//
// Tamaños: más acotados que los de design.md §7.3 (el PO pidió velocidad: lo que no se cubre aquí queda anotado como pendiente en tasks.md).
// El conjunto DENSO de `Double.toString` no se guarda: `generar-conjuntos.test.ts` (proyecto `oraculo`) lo genera fresco contra el JDK.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Azar, bitsAHex, bitsDeDouble, crearAzar, doubleDeBits } from './azar-determinista.ts';
import { casosDeCadenas, puntosDeCodigoDeMayusculas } from './casos-de-cadenas.ts';
import { casosDeMatematicas } from './casos-de-matematicas.ts';
import { type CasoDeFormato, casosDeFormato, codificarArgumento } from './casos-de-formato.ts';
import { FLAGS_LOCALE, ejecutarPrograma } from './ejecutar.ts';
import { type InfoJdk, localizarJdk, verificarVersionJdk } from './jdk.ts';
import { ESCENARIOS_DE_EXCEPCIONES, type EscenarioDeExcepcion, type ResultadoDeEscenario, analizarStderrDeEscenario, programaDelEscenario } from './escenarios-de-excepciones.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ_PROYECTO = resolve(AQUI, '..', '..');
const SONDA = resolve(AQUI, 'java', 'EvaluarBiblioteca.java');

/** Tope de cada corrida de la sonda: los conjuntos grandes (≈ 170 000 `double`) tardan unos segundos, pero una JVM en frío con la máquina cargada puede tardar mucho más. */
export const LIMITE_MS_DE_LA_SONDA_DE_CONJUNTOS = 120_000;

export type Regional = 'es-MX' | 'es-ES';

// ---- Sonda del JDK ----

/** Corre `EvaluarBiblioteca.java <orden> <entrada>` con el JDK real y devuelve su stdout (UTF-8). Lanza con el stderr si la sonda falla. */
export function correrLaSonda(jdk: InfoJdk, orden: string, lineasDeEntrada: readonly string[], regional: Regional = 'es-MX'): Promise<string> {
  const directorio = mkdtempSync(join(tmpdir(), 'conjuntos-'));
  const archivoDeEntrada = join(directorio, 'entrada.txt');
  writeFileSync(archivoDeEntrada, lineasDeEntrada.length === 0 ? '' : `${lineasDeEntrada.join('\n')}\n`, 'utf-8');
  return new Promise((resolverPromesa, rechazarPromesa) => {
    const argumentos = [...FLAGS_LOCALE[regional], SONDA, orden, archivoDeEntrada];
    const proceso = spawn(jdk.rutaJava, argumentos, { stdio: ['ignore', 'pipe', 'pipe'] });
    const salida: Buffer[] = [];
    const error: Buffer[] = [];
    let agotoTiempo = false;
    const temporizador = setTimeout(() => {
      agotoTiempo = true;
      proceso.kill('SIGKILL');
    }, LIMITE_MS_DE_LA_SONDA_DE_CONJUNTOS);
    proceso.stdout.on('data', (fragmento: Buffer) => salida.push(fragmento));
    proceso.stderr.on('data', (fragmento: Buffer) => error.push(fragmento));
    proceso.on('error', (causa) => {
      clearTimeout(temporizador);
      rmSync(directorio, { recursive: true, force: true });
      rechazarPromesa(causa);
    });
    proceso.on('close', (codigo) => {
      clearTimeout(temporizador);
      rmSync(directorio, { recursive: true, force: true });
      if (agotoTiempo) {
        rechazarPromesa(new Error(`La sonda "${orden}" no terminó en ${LIMITE_MS_DE_LA_SONDA_DE_CONJUNTOS} ms (JVM en frío o máquina cargada). Vuelve a correrla con la máquina más libre.`));
      } else if (codigo !== 0) {
        rechazarPromesa(new Error(`La sonda "${orden}" terminó con código ${codigo}:\n${Buffer.concat(error).toString('utf-8')}`));
      } else {
        resolverPromesa(Buffer.concat(salida).toString('utf-8'));
      }
    });
  });
}

// ---- Escapes de campo (los mismos que `EvaluarBiblioteca.java`) ----

export function escaparCampo(texto: string): string {
  let resultado = '';
  for (const c of texto) {
    const codigo = c.codePointAt(0)!;
    if (c === '\\') resultado += '\\\\';
    else if (c === '\t') resultado += '\\t';
    else if (c === '\n') resultado += '\\n';
    else if (c === '\r') resultado += '\\r';
    else if (codigo < 0x20 || codigo === 0x7f || codigo === 0x2028 || codigo === 0x2029 || codigo === 0x85) resultado += `\\u${codigo.toString(16).padStart(4, '0')}`;
    else if (codigo > 0xffff) {
      for (let i = 0; i < c.length; i++) resultado += `\\u${c.charCodeAt(i).toString(16).padStart(4, '0')}`;
    } else if (codigo >= 0xd800 && codigo <= 0xdfff) resultado += `\\u${codigo.toString(16).padStart(4, '0')}`;
    else resultado += c;
  }
  return resultado;
}

export function desescaparCampo(texto: string): string {
  let resultado = '';
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (c !== '\\') {
      resultado += c;
      continue;
    }
    const siguiente = texto[++i]!;
    if (siguiente === '\\') resultado += '\\';
    else if (siguiente === 't') resultado += '\t';
    else if (siguiente === 'n') resultado += '\n';
    else if (siguiente === 'r') resultado += '\r';
    else if (siguiente === 'u') {
      resultado += String.fromCharCode(Number.parseInt(texto.slice(i + 1, i + 5), 16));
      i += 4;
    } else throw new Error(`escape desconocido: \\${siguiente}`);
  }
  return resultado;
}

// ---- Conjuntos de Double.toString ----

export interface ConjuntoDeDobles {
  readonly nombre: string;
  readonly bits: readonly bigint[];
}

const MASCARA_MANTISA = (1n << 52n) - 1n;
const BITS_INFINITO = 0x7ff0_0000_0000_0000n;

function sinRepetidos(bits: readonly bigint[]): bigint[] {
  return [...new Set(bits)];
}

/** Valores de borde y los que el diseño nombra (§4.2): umbrales de notación, extremos, `NaN`, ceros con signo, el residual documentado. */
export function conjuntoEspeciales(): ConjuntoDeDobles {
  const valores = [
    0, -0, 1, -1, 0.1, 0.2, 0.3, 0.5, 1.5, 100, 1e7, 1e-3, 9999999.999999998, 0.001, 0.0009999999999999998, 1e-4, 1e-5, 1e22, 1e23, 2e23, 1e300, 1e-300, 123456789.0, 1234567.0, 12345678.0,
    Number.MAX_VALUE, -Number.MAX_VALUE, Number.MIN_VALUE, 2.2250738585072014e-308, 2.225073858507201e-308, Number.EPSILON, Number.MAX_SAFE_INTEGER, 2 ** 53, 2 ** 63, 2 ** 62, 4.35, 0.1 + 0.2, 1 / 3, 2 / 3,
    Math.PI, Math.E, 100 * 1.1, 3 * 1.1, 0.7 + 0.1, 0.1 * 3, 4.35 * 100, 1.1 * 1.1, 5e-324, 1.5e-323, Number(21347700531594670n), -Number(21347700531594670n), 1.0e10, 3e22, 2.5e22, 8.41e21, 2.0e-3, Number(9007199254740993n),
  ].map(bitsDeDouble);
  return {
    nombre: 'especiales',
    bits: sinRepetidos([...valores, 0x7ff8_0000_0000_0000n, BITS_INFINITO, BITS_INFINITO | (1n << 63n), 0x453d_04ff_ce09_b504n, 0xffef_ffff_ffff_ffffn]),
  };
}

/** Valores de aula: décimas, centésimas, sumas y productos de decimales, raíces, recíprocos, áreas con π, conversiones de temperatura, promedios, interés compuesto, divisiones entre 2. */
export function conjuntoSalon(): ConjuntoDeDobles {
  const valores: number[] = [];
  for (let i = 0; i <= 3000; i++) valores.push(i / 10);
  for (let i = 0; i <= 3000; i++) valores.push(i / 100);
  for (let i = 0; i <= 1000; i++) valores.push(i / 1000);
  for (let i = 1; i <= 400; i++) valores.push(i * 0.1, i * 0.01, i * 0.05, i * 1.1);
  const bases = [0.1, 0.2, 0.3, 0.5, 0.7, 1.1, 1.5, 2.5, 3.14, 9.81, 0.25, 4.35, 1.05, 0.01, 12.5, 99.99, 19.99];
  for (const a of bases) {
    for (const b of bases) valores.push(a + b, a * b, a - b, a / b);
  }
  for (let n = 1; n <= 2000; n++) valores.push(Math.sqrt(n), 1 / n);
  for (let r = 1; r <= 300; r++) valores.push(Math.PI * r * r, 2 * Math.PI * r, (4 / 3) * Math.PI * r * r * r, r * r * Math.PI);
  for (let c = -50; c <= 200; c += 0.5) valores.push((c * 9) / 5 + 32, c * 1.8 + 32, ((c - 32) * 5) / 9);
  for (let n = 2; n <= 7; n++) {
    for (let suma = 0; suma <= 300; suma++) valores.push(suma / n);
  }
  let capital = 1000;
  for (let anio = 1; anio <= 60; anio++) {
    capital *= 1.05;
    valores.push(capital);
  }
  let factor = 1;
  for (let k = 1; k <= 120; k++) {
    factor /= 2;
    valores.push(factor);
  }
  let crecimiento = 1;
  for (let k = 1; k <= 200; k++) {
    crecimiento *= 1.1;
    valores.push(crecimiento);
  }
  for (let k = 1; k <= 300; k++) valores.push(k * 0.1 * 3, k * 0.7, k * 1.15, (k * 17) / 7, k / 3, k / 7, k / 9, k / 12);
  return { nombre: 'salon', bits: sinRepetidos(valores.map(bitsDeDouble)) };
}

/** Patrones aleatorios: bits crudos, `nextDouble`, literales con pocos dígitos escalados, enteros por centésimas. */
export function conjuntoAleatorios(azar: Azar = crearAzar(20260416)): ConjuntoDeDobles {
  const bits: bigint[] = [];
  for (let i = 0; i < 8000; i++) {
    let patron = azar.siguiente64();
    const exponente = azar.entre(1, 0x7fe);
    patron = (patron & ((1n << 63n) | MASCARA_MANTISA)) | (BigInt(exponente) << 52n);
    bits.push(patron);
  }
  for (let i = 0; i < 8000; i++) bits.push(bitsDeDouble(Number(azar.siguiente64() >> 11n) / 2 ** 53));
  for (let i = 0; i < 8000; i++) {
    const mantisa = azar.entre(1, 999_999_999);
    bits.push(bitsDeDouble(Number(`${mantisa}e${azar.entre(-30, 30)}`)));
  }
  for (let i = 0; i < 4000; i++) bits.push(bitsDeDouble(azar.entre(-1_000_000, 1_000_000) * 0.01));
  return { nombre: 'aleatorios', bits: sinRepetidos(bits) };
}

/** Banda de enteros [2^53, 2^63): mantisas aleatorias en cada exponente 53–62 y los enteros "redondos" que un alumno escribiría. */
export function conjuntoBanda(azar: Azar = crearAzar(53_62)): ConjuntoDeDobles {
  const bits: bigint[] = [];
  for (let exponente = 53; exponente <= 62; exponente++) {
    for (let i = 0; i < 400; i++) {
      const mantisa = azar.siguiente64() & MASCARA_MANTISA;
      bits.push((BigInt(exponente + 1023) << 52n) | mantisa);
      if (i < 40) bits.push((1n << 63n) | (BigInt(exponente + 1023) << 52n) | mantisa);
    }
  }
  for (const entero of [10n ** 16n, 10n ** 17n, 10n ** 18n, 123456789012345678n, 9007199254740993n, 4611686018427387905n, 9223372036854775807n, 6000000000000000000n, 1152921504606846976n, 1152921504606847000n]) {
    bits.push(bitsDeDouble(Number(entero)));
  }
  return { nombre: 'banda', bits: sinRepetidos(bits) };
}

/** Las 2 098 potencias de dos (de 2^-1074 a 2^1023) y sus vecinas inmediatas. */
export function conjuntoPotenciasDeDos(): ConjuntoDeDobles {
  const bits: bigint[] = [];
  for (let e = -1074; e <= 1023; e++) {
    const potencia = e >= -1022 ? BigInt(e + 1023) << 52n : 1n << BigInt(e + 1074);
    bits.push(potencia, potencia + 1n);
    if (potencia > 1n) bits.push(potencia - 1n);
  }
  return { nombre: 'potencias-de-dos', bits: sinRepetidos(bits) };
}

/** Subnormales: múltiplos pequeños de `MIN_VALUE`, patrones aleatorios y los vecinos del mínimo normal. */
export function conjuntoSubnormales(azar: Azar = crearAzar(1074)): ConjuntoDeDobles {
  const bits: bigint[] = [];
  for (let k = 1n; k <= 2000n; k++) bits.push(k);
  for (let i = 0; i < 4000; i++) bits.push((azar.siguiente64() & MASCARA_MANTISA) || 1n);
  for (let i = 0; i < 1000; i++) bits.push(1n << BigInt(azar.entre(0, 51)) | (azar.siguiente64() & ((1n << BigInt(azar.entre(0, 12))) - 1n)));
  for (let i = 0; i < 3000; i++) bits.push((azar.siguiente64() & ((1n << BigInt(azar.entre(1, 52))) - 1n)) | 1n);
  for (let k = -5n; k <= 5n; k++) bits.push((1n << 52n) + k);
  return { nombre: 'subnormales', bits: sinRepetidos(bits.filter((patron) => patron > 0n)) };
}

/**
 * Valores enormes (exponente binario 63–100) con un refuerzo en 83–87: con exponente 84 el JDK 17 desborda un `long` en la prueba de `alto` y TRUNCA el último dígito en el 2.6 % de los
 * valores (el «residual» `0x453d04ffce09b504` de design.md §4.2, que resultó ser una clase, no un caso aislado). Medido contra el JDK real con 2.6 millones de valores de todos los exponentes: solo el 84.
 */
export function conjuntoGrandes(azar: Azar = crearAzar(8_4)): ConjuntoDeDobles {
  const bits: bigint[] = [];
  for (let exponente = 63; exponente <= 100; exponente++) {
    const cuantos = exponente >= 83 && exponente <= 87 ? (exponente === 84 ? 1500 : 300) : 60;
    for (let i = 0; i < cuantos; i++) bits.push((BigInt(exponente + 1023) << 52n) | (azar.siguiente64() & MASCARA_MANTISA));
  }
  return { nombre: 'grandes', bits: sinRepetidos(bits) };
}

/** Los vecinos (±2 ulps) de cada potencia de diez representable, de 1e-323 a 1e308: ahí el intervalo llega a la potencia de diez y la estimación del exponente decimal cambia. */
export function conjuntoPotenciasDeDiez(): ConjuntoDeDobles {
  const bits: bigint[] = [];
  for (let n = -323; n <= 308; n++) {
    const base = bitsDeDouble(Number(`1e${n}`));
    for (let delta = -2n; delta <= 2n; delta++) bits.push(base + delta);
  }
  return { nombre: 'potencias-de-diez', bits: sinRepetidos(bits.filter((patron) => patron > 0n)) };
}

/** Todos los decimales cortos d×10^n con d ≤ 9999 y n de 12 a 26 (design.md §4.2 (a)); el JDK dice cuáles se apartan del "más corto". */
export function candidatosDeEmpates(): bigint[] {
  const bits: bigint[] = [];
  for (let d = 1; d <= 9999; d++) {
    for (let n = 12; n <= 26; n++) bits.push(bitsDeDouble(Number(`${d}e${n}`)));
  }
  return sinRepetidos(bits);
}

/** `Double.toString` → (dígitos sin ceros finales, exponente decimal del primer dígito): para comparar un resultado de Java con los dígitos más cortos de JS sin depender del formato. */
export function digitosYExponente(texto: string): { digitos: string; exponente: number } {
  const sinSigno = texto.startsWith('-') ? texto.slice(1) : texto;
  const [mantisa, exponenteTexto] = sinSigno.split('E') as [string, string | undefined];
  const [entera, fraccion = ''] = mantisa.split('.') as [string, string | undefined];
  const todos = `${entera}${fraccion}`;
  const ceros = todos.length - todos.replace(/^0+/, '').length;
  const digitos = todos.replace(/^0+/, '').replace(/0+$/, '');
  const exponente = (exponenteTexto === undefined ? 0 : Number(exponenteTexto)) + entera.length - 1 - ceros;
  return { digitos: digitos === '' ? '0' : digitos, exponente };
}

/** Los dígitos más cortos de JS para un `double` positivo, en la misma forma que `digitosYExponente`. */
export function digitosMasCortosDeJs(x: number): { digitos: string; exponente: number } {
  const [mantisa, exponente] = Math.abs(x).toExponential().split('e') as [string, string];
  return { digitos: mantisa.replace('.', '').replace(/0+$/, '') || '0', exponente: Number(exponente) };
}


// ---- Character (65 536 valores de `char`) ----

/** Lo que el JDK contesta para un `char`: banderas (1 `isDigit`, 2 `isLetter`, 4 `isLetterOrDigit`, 8 `isUpperCase`, 16 `isLowerCase`, 32 `isWhitespace`) y `toUpperCase`/`toLowerCase`. */
export interface FilaDeCaracter {
  readonly codigo: number;
  readonly banderas: number;
  readonly mayuscula: number;
  readonly minuscula: number;
  /** `Character.digit(c, 10)`: el valor 0–9 de un dígito, -1 si no lo es. */
  readonly valorDeDigito: number;
}

/** Un tramo de `char` consecutivos que comparten banderas y la DISTANCIA a su mayúscula y a su minúscula (así un bloque de letras emparejadas cabe en pocos tramos). */
export interface RangoDeCaracteres {
  readonly inicio: number;
  readonly banderas: number;
  readonly deltaMayuscula: number;
  readonly deltaMinuscula: number;
}

export function analizarSalidaDeCaracteres(salida: string): FilaDeCaracter[] {
  const filas = salida
    .split('\n')
    .filter((linea) => linea !== '')
    .map((linea) => {
      const [codigo, banderas, mayuscula, minuscula, valorDeDigito] = linea.split(',').map(Number) as [number, number, number, number, number];
      return { codigo, banderas, mayuscula, minuscula, valorDeDigito };
    });
  if (filas.length !== 65_536 || filas.some((fila, indice) => fila.codigo !== indice)) {
    throw new Error(`La sonda "caracteres" debía dar los 65 536 valores de char en orden y dio ${filas.length}.`);
  }
  verificarQueLosDigitosVanEnRachasDeDiez(filas);
  return filas;
}

/**
 * El motor calcula el valor de un dígito Unicode como (posición dentro de su racha de dígitos consecutivos) mod 10, en vez de guardar una columna más por `char`. Eso vale si todo `char` con
 * `isDigit` forma rachas alineadas a 10 y su valor es esa posición mod 10: esta función lo COMPRUEBA contra el JDK (y lanza si un Unicode futuro lo rompiera).
 */
export function verificarQueLosDigitosVanEnRachasDeDiez(filas: readonly FilaDeCaracter[]): void {
  let inicioDeRacha = -1;
  for (const fila of filas) {
    const esDigito = (fila.banderas & 1) !== 0;
    if (!esDigito) {
      inicioDeRacha = -1;
      if (fila.valorDeDigito !== -1) throw new Error(`U+${fila.codigo.toString(16)} no es dígito (isDigit) pero Character.digit(c, 10) = ${fila.valorDeDigito}.`);
      continue;
    }
    if (inicioDeRacha === -1) inicioDeRacha = fila.codigo;
    const esperado = (fila.codigo - inicioDeRacha) % 10;
    if (fila.valorDeDigito !== esperado) throw new Error(`U+${fila.codigo.toString(16)}: Character.digit(c, 10) = ${fila.valorDeDigito}, pero la racha de dígitos dice ${esperado}.`);
  }
}

export function comprimirEnRangos(filas: readonly FilaDeCaracter[]): RangoDeCaracteres[] {
  const rangos: RangoDeCaracteres[] = [];
  for (const fila of filas) {
    const deltaMayuscula = fila.mayuscula - fila.codigo;
    const deltaMinuscula = fila.minuscula - fila.codigo;
    const ultimo = rangos[rangos.length - 1];
    if (ultimo === undefined || ultimo.banderas !== fila.banderas || ultimo.deltaMayuscula !== deltaMayuscula || ultimo.deltaMinuscula !== deltaMinuscula) {
      rangos.push({ inicio: fila.codigo, banderas: fila.banderas, deltaMayuscula, deltaMinuscula });
    }
  }
  return rangos;
}

export function renderizarCsvDeRangos(rangos: readonly RangoDeCaracteres[]): string {
  return `${rangos.map((rango) => `${rango.inicio},${rango.banderas},${rango.deltaMayuscula},${rango.deltaMinuscula}`).join('\n')}\n`;
}

export function renderizarTsDeCaracteres(rangos: readonly RangoDeCaracteres[]): string {
  const numeros = rangos.flatMap((rango) => [rango.inicio, rango.banderas, rango.deltaMayuscula, rango.deltaMinuscula]);
  const lineas: string[] = [];
  for (let i = 0; i < numeros.length; i += 16) lineas.push(`  ${numeros.slice(i, i + 16).join(', ')},`);
  return (
    '// Archivo generado por `npm run oraculo:conjuntos` a partir de herramientas/oraculo/java/EvaluarBiblioteca.java (orden `caracteres`) contra el JDK 17 de referencia\n' +
    '// (Temurin 17.0.18+8, ADR 010) — no editar a mano. Cualquier cambio real viene de regenerar contra el JDK, nunca de tocar este archivo directamente.\n' +
    '//\n' +
    '// Tramos de `char` consecutivos con las mismas banderas y la misma distancia a su mayúscula y a su minúscula, de 4 en 4 números: [inicio, banderas, deltaMayuscula, deltaMinuscula].\n' +
    '// Banderas: 1 isDigit, 2 isLetter, 4 isLetterOrDigit, 8 isUpperCase, 16 isLowerCase, 32 isWhitespace. Unicode 13 (el de JDK 17), no el del navegador.\n\n' +
    'export const TRAMOS_DE_CARACTERES: readonly number[] = [\n' +
    `${lineas.join('\n')}\n` +
    '];\n'
  );
}


// ---- Excepciones y marcos de pila (design.md §3.6) ----

/** Cuántos escenarios (javac + java) corren a la vez: pocos, para no saturar la máquina (cada uno son dos JVM). */
const CONCURRENCIA_DE_ESCENARIOS = 4;
const LIMITE_MS_DE_UN_ESCENARIO = 60_000;

async function correrEscenario(jdk: InfoJdk, escenarioProbado: EscenarioDeExcepcion): Promise<ResultadoDeEscenario> {
  const resultado = await ejecutarPrograma(jdk, {
    fuente: programaDelEscenario(escenarioProbado),
    entrada: Buffer.from(escenarioProbado.entrada, 'utf-8'),
    regional: 'es-MX',
    limiteMs: LIMITE_MS_DE_UN_ESCENARIO,
    limiteCompilacionMs: LIMITE_MS_DE_UN_ESCENARIO,
  });
  if (!resultado.compilo) {
    throw new Error(`El escenario ${escenarioProbado.id} no compiló:\n${resultado.erroresCompilacion.toString('utf-8')}`);
  }
  if (resultado.agotoTiempo) throw new Error(`El escenario ${escenarioProbado.id} no terminó a tiempo.`);
  return analizarStderrDeEscenario(escenarioProbado, resultado.stderr.toString('utf-8'));
}

/** Corre todos los escenarios con el JDK real, de a `CONCURRENCIA_DE_ESCENARIOS`, y devuelve los resultados en el orden de la lista. */
export async function generarEscenariosDeExcepciones(jdk: InfoJdk, escenarios: readonly EscenarioDeExcepcion[] = ESCENARIOS_DE_EXCEPCIONES): Promise<ResultadoDeEscenario[]> {
  const resultados: ResultadoDeEscenario[] = new Array<ResultadoDeEscenario>(escenarios.length);
  let siguiente = 0;
  const trabajador = async (): Promise<void> => {
    for (;;) {
      const indice = siguiente++;
      if (indice >= escenarios.length) return;
      resultados[indice] = await correrEscenario(jdk, escenarios[indice] as EscenarioDeExcepcion);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCIA_DE_ESCENARIOS }, trabajador));
  verificarSitiosConsistentes(resultados);
  return resultados;
}

/** Dos escenarios con el mismo `sitio` deben dar la misma clase y los mismos marcos: si no, el `sitio` mezcla dos situaciones distintas y la tabla mentiría. */
export function verificarSitiosConsistentes(resultados: readonly ResultadoDeEscenario[]): void {
  const primeros = new Map<string, ResultadoDeEscenario>();
  for (const resultado of resultados) {
    const previo = primeros.get(resultado.sitio);
    if (previo === undefined) {
      primeros.set(resultado.sitio, resultado);
    } else if (previo.clase !== resultado.clase || previo.marcos.join('\n') !== resultado.marcos.join('\n')) {
      throw new Error(`El sitio "${resultado.sitio}" mezcla situaciones distintas: ${previo.id} da ${previo.clase} ${JSON.stringify(previo.marcos)} y ${resultado.id} da ${resultado.clase} ${JSON.stringify(resultado.marcos)}.`);
    }
  }
}

export function renderizarJsonlDeEscenarios(resultados: readonly ResultadoDeEscenario[]): string {
  return resultados.map((resultado) => `${JSON.stringify(resultado)}\n`).join('');
}

export interface FilaDeSitio {
  readonly sitio: string;
  readonly clase: string;
  readonly marcos: readonly string[];
}

/** Una fila por `sitio`, en el orden en que aparece por primera vez. */
export function filasPorSitio(resultados: readonly ResultadoDeEscenario[]): FilaDeSitio[] {
  const vistos = new Set<string>();
  const filas: FilaDeSitio[] = [];
  for (const { sitio, clase, marcos } of resultados) {
    if (vistos.has(sitio)) continue;
    vistos.add(sitio);
    filas.push({ sitio, clase, marcos });
  }
  return filas;
}

export function renderizarTsDeMarcosDePila(filas: readonly FilaDeSitio[]): string {
  const cuerpo = filas.map((fila) => `  [${JSON.stringify(fila.sitio)}, ${JSON.stringify(fila.clase)}, ${JSON.stringify(fila.marcos)}],`).join('\n');
  const union = filas.map((fila) => `  | ${JSON.stringify(fila.sitio)}`).join('\n');
  return (
    '// Archivo generado por `npm run oraculo:conjuntos` a partir de herramientas/oraculo/escenarios-de-excepciones.ts contra el JDK 17 de referencia (Temurin 17.0.18+8, ADR 010)\n' +
    '// — no editar a mano. Cada fila es un SITIO de excepción (operación, modo de falla, coder): su clase y los marcos de java.base que Java imprime antes del marco del alumno.\n\n' +
    `export type SitioDeExcepcion =\n${union};\n\n` +
    'export const MARCOS_DE_PILA_GENERADOS: readonly (readonly [SitioDeExcepcion, string, readonly string[]])[] = [\n' +
    `${cuerpo}\n` +
    '];\n'
  );
}

// ---- parseInt, parseDouble y Scanner (REQ-BIB-008/009/010) ----

/** Textos de aula y de error típico que `Integer.parseInt` y `Scanner.nextInt` deben aceptar o rechazar igual que Java (design.md §4.5 y §4.6). */
const CANDIDATOS_ENTEROS: readonly string[] = [
  '0', '-0', '+0', '5', '-5', '+5', '007', '-007', '42', '2147483647', '2147483648', '-2147483648', '-2147483649', '99999999999', '1_000', '1,000', '1,00', '12,345,678', '1.000', '1.5', '1e3', ' 5',
  '5 ', '', '+', '-', '--5', '+-5', '-+5', '٣٤', '-٣٤', '١٢٣٤', '１２３', '१२३', '٣4', '0x1F', '1L', 'abc', '12abc', 'a12', '5.', '.5', '1 000', '\t5', '5\n', ' 5', '5 ', '(5)', '5-', '0,1', '1,0000',
  '9223372036854775807', '00000000000000000000005', '+00', 'true', 'NaN', '٫', '5٫', '12,3456', ',5', '5,', '1,,000', '²', '½', '5²',
];

const CANDIDATOS_DOBLES: readonly string[] = [
  '0', '0.0', '-0.0', '+0.0', '.5', '5.', '1e5', '1E5', '1e+5', '1e-5', '1e', 'e5', '1.5e3', '1.5E-3', '1.5f', '1.5F', '1.5d', '1.5D', 'NaN', '-NaN', 'Infinity', '-Infinity', '+Infinity', '∞', '-∞',
  'infinity', 'nan', 'inf', '1,5', '1,5e3', '1.000,5', '1,000.5', '1,000,000.25', '1.000', '0x1p3', '0x1.8p1', '1_0', '١٫٥', '٣٫١٤', '1.', '1.e5', '.e5', '+.5', '-.5e-3', ' 1.5', '1.5 ', '1.5\n', '9e999', '1e-999',
  '4.9e-324', '2.4e-324', '1.7976931348623157e308', '1.7976931348623159e308', '123456789012345678901234567890', '0.1234567890123456789012345', '3.14', '-3.14', '2.675', '100', '1.0', '00.5', '5.00', '1e1000000',
  '--1.5', '1.5.5', '1.5e3.5', '12abc', 'abc', '', '+', '-', '.', '-.', 'E5', '1,', ',5', '1 5', '٣', '３．１４', '1.5e٣', '0.1', '0.30000000000000004',
];

const ALFABETO_AL_AZAR = '0123456789+-.,eEfFdD xX_NaIni\t';

function entradasAlAzar(azar: Azar, cuantas: number): string[] {
  const resultado: string[] = [];
  for (let i = 0; i < cuantas; i++) {
    const largo = azar.entre(1, 8);
    let texto = '';
    for (let j = 0; j < largo; j++) texto += ALFABETO_AL_AZAR[azar.entre(0, ALFABETO_AL_AZAR.length - 1)];
    resultado.push(texto);
  }
  return resultado;
}

export interface LineaDeAnalisis {
  readonly operacion: string;
  readonly entrada: string;
  /** `OK:<valor>` (los double como bits en hexadecimal) o `EX:<clase>:<mensaje>`. */
  readonly resultado: string;
}

const OPERACIONES_DE_PARSEO = ['parseInt', 'parseDouble'] as const;
const OPERACIONES_DE_TOKEN = ['nextInt', 'nextDouble', 'nextBoolean', 'next', 'nextLine'] as const;

/** Los casos de la orden `analisis`: (operación, entrada). */
export function casosDeAnalisis(azar: Azar = crearAzar(2011)): { parseo: [string, string][]; tokens: [string, string][] } {
  const aleatorias = entradasAlAzar(azar, 1500);
  const parseo: [string, string][] = [];
  for (const entrada of [...CANDIDATOS_ENTEROS, ...CANDIDATOS_DOBLES, ...aleatorias]) {
    for (const operacion of OPERACIONES_DE_PARSEO) parseo.push([operacion, entrada]);
  }
  const palabras = ['true', 'false', 'TRUE', 'False', 'tRuE', 'si', 'hola', 'Juan', 'María', 'x', 'yes', 'verdadero'];
  const tokens: [string, string][] = [];
  for (const entrada of [...CANDIDATOS_ENTEROS, ...CANDIDATOS_DOBLES, ...palabras, ...aleatorias, 'a b', '5 6', '5\n6', ' \n 7', '7 \n', '\n', ' ', 'dos palabras\nlinea 2', '1.5 2.5']) {
    for (const operacion of OPERACIONES_DE_TOKEN) tokens.push([operacion, entrada]);
  }
  return { parseo, tokens };
}

export function renderizarTsvDeAnalisis(lineas: readonly LineaDeAnalisis[]): string {
  return lineas.map(({ operacion, entrada, resultado }) => `${operacion}\t${escaparCampo(entrada)}\t${resultado}\n`).join('');
}

/** Pura: la salida de la orden `analisis` → una línea por caso. `OK\tvalor` / `EX\tclase\tmensaje` se unifican como `OK:valor` / `EX:clase:mensaje`. */
export function analizarSalidaDeAnalisis(casos: readonly (readonly [string, string])[], salida: string): LineaDeAnalisis[] {
  const lineas = salida.split('\n');
  lineas.pop();
  if (lineas.length !== casos.length) throw new Error(`La sonda "analisis" contestó ${lineas.length} líneas para ${casos.length} casos.`);
  return lineas.map((linea, indice) => {
    const [operacion, entrada] = casos[indice] as readonly [string, string];
    const campos = linea.split('\t');
    const resultado = campos[0] === 'OK' ? `OK:${campos[1] ?? ''}` : `EX:${campos[1]}:${campos[2] ?? ''}`;
    return { operacion, entrada, resultado };
  });
}

const OPERACIONES_DE_SECUENCIA = ['nextInt', 'nextDouble', 'nextBoolean', 'next', 'nextLine', 'hasNext', 'hasNextInt', 'hasNextDouble', 'hasNextLine'] as const;

export interface CasoDeSecuencia {
  readonly texto: string;
  readonly operaciones: readonly string[];
}

/** Textos con forma de entrada de aula (números, palabras, renglones, separadores raros) y secuencias al azar de operaciones sobre un MISMO `Scanner`. */
export function casosDeSecuencias(azar: Azar = crearAzar(3003), cuantos = 2500): CasoDeSecuencia[] {
  const piezas = ['5', '-3', '42', '007', '3.5', '-2.25', '1e3', '1,5', '1,000', '2.675', 'true', 'FALSE', 'si', 'hola', 'Juan', 'Pérez', 'abc', '12abc', '99999999999', '0', '', 'NaN', '٣٤', '7'];
  const separadores = [' ', ' ', ' ', '  ', '\n', '\n', '\t', '\r\n', ' \n', '\n ', '', ' ', ' '];
  const casos: CasoDeSecuencia[] = [];
  for (let i = 0; i < cuantos; i++) {
    let texto = '';
    const cantidad = azar.entre(0, 6);
    for (let j = 0; j < cantidad; j++) texto += azar.elegir(piezas) + azar.elegir(separadores);
    if (azar.entre(0, 3) === 0) texto = texto.replace(/\s+$/, '');
    const operaciones: string[] = [];
    const largo = azar.entre(1, 8);
    for (let j = 0; j < largo; j++) operaciones.push(azar.elegir(OPERACIONES_DE_SECUENCIA));
    if (azar.entre(0, 12) === 0) operaciones.splice(azar.entre(0, operaciones.length), 0, 'close');
    casos.push({ texto, operaciones });
  }
  return casos;
}

export interface LineaDeSecuencia extends CasoDeSecuencia {
  /** Un resultado por operación: `OK:valor` o `EX:clase:mensaje`. */
  readonly resultados: readonly string[];
}

export function renderizarTsvDeSecuencias(lineas: readonly LineaDeSecuencia[]): string {
  return lineas.map(({ texto, operaciones, resultados }) => `${escaparCampo(texto)}\t${operaciones.join(',')}\t${resultados.join('\t')}\n`).join('');
}

export function analizarSalidaDeSecuencias(casos: readonly CasoDeSecuencia[], salida: string): LineaDeSecuencia[] {
  const lineas = salida.split('\n');
  lineas.pop();
  if (lineas.length !== casos.length) throw new Error(`La sonda "scanner" contestó ${lineas.length} líneas para ${casos.length} casos.`);
  return lineas.map((linea, indice) => ({ ...(casos[indice] as CasoDeSecuencia), resultados: linea.split('\t') }));
}

export interface ConjuntosDeEntrada {
  readonly parseo: LineaDeAnalisis[];
  readonly tokens: Readonly<Record<Regional, LineaDeAnalisis[]>>;
  readonly secuencias: Readonly<Record<Regional, LineaDeSecuencia[]>>;
}

export async function generarConjuntosDeEntrada(jdk: InfoJdk): Promise<ConjuntosDeEntrada> {
  const { parseo, tokens } = casosDeAnalisis();
  const secuencias = casosDeSecuencias();
  const lineasDeAnalisis = (casos: readonly (readonly [string, string])[]): string[] => casos.map(([operacion, entrada]) => `${operacion}\t${escaparCampo(entrada)}`);
  const lineasDeSecuencias = secuencias.map(({ texto, operaciones }) => `${escaparCampo(texto)}\t${operaciones.join(',')}`);
  const salidaDeParseo = await correrLaSonda(jdk, 'analisis', lineasDeAnalisis(parseo), 'es-MX');
  const resultadoPorRegional = async (regional: Regional) => ({
    tokens: analizarSalidaDeAnalisis(tokens, await correrLaSonda(jdk, 'analisis', lineasDeAnalisis(tokens), regional)),
    secuencias: analizarSalidaDeSecuencias(secuencias, await correrLaSonda(jdk, 'scanner', lineasDeSecuencias, regional)),
  });
  const [mx, es] = await Promise.all([resultadoPorRegional('es-MX'), resultadoPorRegional('es-ES')]);
  return {
    parseo: analizarSalidaDeAnalisis(parseo, salidaDeParseo),
    tokens: { 'es-MX': mx.tokens, 'es-ES': es.tokens },
    secuencias: { 'es-MX': mx.secuencias, 'es-ES': es.secuencias },
  };
}

export function escribirConjuntosDeEntrada(raizProyecto: string, conjuntos: ConjuntosDeEntrada): void {
  const parseo = resolve(raizProyecto, 'corpus', 'datos', 'parseo');
  const scanner = resolve(raizProyecto, 'corpus', 'datos', 'scanner');
  mkdirSync(parseo, { recursive: true });
  mkdirSync(scanner, { recursive: true });
  writeFileSync(resolve(parseo, 'parseo.tsv'), renderizarTsvDeAnalisis(conjuntos.parseo), 'utf-8');
  for (const regional of ['es-MX', 'es-ES'] as const) {
    writeFileSync(resolve(scanner, `tokens-${regional}.tsv`), renderizarTsvDeAnalisis(conjuntos.tokens[regional]), 'utf-8');
    writeFileSync(resolve(scanner, `secuencias-${regional}.tsv`), renderizarTsvDeSecuencias(conjuntos.secuencias[regional]), 'utf-8');
  }
}

// ---- printf / String.format (REQ-BIB-003) ----

export interface RegistroDeFormato {
  /** El patrón. */
  readonly f: string;
  /** Los argumentos tipados (`d:5`, `D:<bits>`, `s:texto`…), como los lee la sonda. */
  readonly a: readonly string[];
  /** `OK:<texto>` o `EX:<clase>:<mensaje>`, ya sin escapes. */
  readonly r: string;
  /** Presente (y `true`) si el caso está fuera del alcance prometido: el motor puede responder «No disponible». */
  readonly fuera?: true;
}

/** Corre los casos de formato en el JDK para una región. */
export async function evaluarCasosDeFormato(jdk: InfoJdk, casos: readonly CasoDeFormato[], regional: Regional): Promise<RegistroDeFormato[]> {
  const argumentosCodificados = casos.map((caso) => caso.argumentos.map((argumento) => codificarArgumento(argumento, escaparCampo)));
  const lineas = casos.map((caso, indice) => [escaparCampo(caso.formato), ...(argumentosCodificados[indice] as string[])].join('\t'));
  const salida = (await correrLaSonda(jdk, 'formatos', lineas, regional)).split('\n');
  salida.pop();
  if (salida.length !== casos.length) throw new Error(`La sonda "formatos" contestó ${salida.length} líneas para ${casos.length} casos.`);
  return salida.map((linea, indice) => {
    const campos = linea.split('\t');
    const r = campos[0] === 'OK' ? `OK:${desescaparCampo(campos[1] ?? '')}` : `EX:${campos[1]}:${desescaparCampo(campos[2] ?? '')}`;
    const caso = casos[indice] as CasoDeFormato;
    return { f: caso.formato, a: argumentosCodificados[indice] as string[], r, ...(caso.alcance === 'fuera' ? { fuera: true as const } : {}) };
  });
}

/** Para es-ES basta una muestra de los casos con `double` (las reglas son las mismas y solo cambian los separadores); los demás casos van completos. */
export function muestraParaEsEs(casos: readonly CasoDeFormato[]): CasoDeFormato[] {
  let contador = 0;
  return casos.filter((caso) => {
    if (!caso.argumentos.some((argumento) => argumento.t === 'D')) return true;
    contador += 1;
    return contador % 6 === 0;
  });
}

export function renderizarJsonlDeFormatos(registros: readonly RegistroDeFormato[]): string {
  return registros.map((registro) => `${JSON.stringify(registro)}\n`).join('');
}

export async function generarConjuntosDeFormato(jdk: InfoJdk): Promise<Record<Regional, RegistroDeFormato[]>> {
  const casos = casosDeFormato();
  const [mx, es] = await Promise.all([evaluarCasosDeFormato(jdk, casos, 'es-MX'), evaluarCasosDeFormato(jdk, muestraParaEsEs(casos), 'es-ES')]);
  return { 'es-MX': mx, 'es-ES': es };
}

// ---- Random (REQ-BIB-005) ----

/** Semillas del conjunto de `Random`: las de aula (0, 1, 12345, 42), los extremos de `long` y de 48 bits, y algunas arbitrarias. Más de las 8 que pide design.md §7.3. */
export const SEMILLAS_DE_RANDOM: readonly bigint[] = [
  0n, 1n, 12345n, 42n, -1n, 7n, 100n, 2024n, 987654321012345n, 2147483647n, -2147483648n, 999999999999n, -987654321n, 281474976710656n, 281474976710655n, 9223372036854775807n, -9223372036854775808n,
];

export interface RegistroDeRandom {
  readonly semilla: string;
  readonly metodo: string;
  readonly argumento: string;
  readonly valores: readonly string[];
}

export async function generarConjuntoDeRandom(jdk: InfoJdk): Promise<RegistroDeRandom[]> {
  const salida = await correrLaSonda(jdk, 'aleatorios', SEMILLAS_DE_RANDOM.map(String));
  return salida
    .split('\n')
    .filter((linea) => linea !== '')
    .map((linea) => {
      const [semilla, metodo, argumento, valores] = linea.split('\t') as [string, string, string, string];
      return { semilla, metodo, argumento, valores: valores.split(',') };
    });
}

export function renderizarTsvDeRandom(registros: readonly RegistroDeRandom[]): string {
  return registros.map(({ semilla, metodo, argumento, valores }) => `${semilla}\t${metodo}\t${argumento}\t${valores.join(',')}\n`).join('');
}

// ---- String (REQ-BIB-006) ----

export interface RegistroDeCadena {
  /** Operación y argumentos (la cadena primero), SIN escapar. */
  readonly campos: readonly string[];
  /** `OK:<valor>` o `EX:<clase>:<mensaje>`, sin escapes. */
  readonly resultado: string;
}

function analizarResultadoDeCadena(linea: string): string {
  const campos = linea.split('\t');
  return campos[0] === 'OK' ? `OK:${desescaparCampo(campos[1] ?? '')}` : `EX:${campos[1]}:${desescaparCampo(campos[2] ?? '')}`;
}

export async function generarConjuntoDeCadenas(jdk: InfoJdk): Promise<RegistroDeCadena[]> {
  const casos = casosDeCadenas();
  const lineas = casos.map((caso) => caso.campos.map(escaparCampo).join('\t'));
  const salida = (await correrLaSonda(jdk, 'cadenas', lineas)).split('\n');
  salida.pop();
  if (salida.length !== casos.length) throw new Error(`La sonda "cadenas" contestó ${salida.length} líneas para ${casos.length} casos.`);
  return casos.map((caso, indice) => ({ campos: caso.campos, resultado: analizarResultadoDeCadena(salida[indice] as string) }));
}

export function renderizarTsvDeCadenas(registros: readonly RegistroDeCadena[]): string {
  return registros.map(({ campos, resultado }) => `${[...campos.map(escaparCampo), `=>${escaparCampo(resultado)}`].join('\t')}\n`).join('');
}

/** Un punto de código cuya mayúscula (o minúscula) en `String` NO es la correspondencia simple de `Character` (o está fuera del plano básico): `ß` → `SS`, `İ` → `i̇`, `𐐨` → `𐐀`. */
export interface MapeoEspecial {
  readonly puntoDeCodigo: number;
  readonly resultado: string;
}

export interface MapeosDeMayusculas {
  readonly mayusculas: MapeoEspecial[];
  readonly minusculas: MapeoEspecial[];
}

/**
 * `String.toUpperCase()`/`toLowerCase()` de CADA punto de código del plano básico (sin sustitutos) y del plano 1, en el JDK real. Se guarda solo lo que se aparta de la correspondencia simple de
 * `Character` en el plano básico (`filas`) y todo lo que cambia en el plano 1, donde `Character` de un solo `char` no llega.
 */
export async function generarMapeosDeMayusculas(jdk: InfoJdk, filas: readonly FilaDeCaracter[]): Promise<MapeosDeMayusculas> {
  const puntos = puntosDeCodigoDeMayusculas();
  const pedir = async (operacion: 'codePointUpper' | 'codePointLower'): Promise<MapeoEspecial[]> => {
    const salida = (await correrLaSonda(jdk, 'cadenas', puntos.map((punto) => `${operacion}\t${punto}`))).split('\n');
    salida.pop();
    if (salida.length !== puntos.length) throw new Error(`La sonda "${operacion}" contestó ${salida.length} líneas para ${puntos.length} puntos de código.`);
    const especiales: MapeoEspecial[] = [];
    puntos.forEach((punto, indice) => {
      const resultado = analizarResultadoDeCadena(salida[indice] as string);
      if (!resultado.startsWith('OK:')) throw new Error(`${operacion}(${punto}) lanzó ${resultado}`);
      const texto = resultado.slice(3);
      const fila = punto < 0x10000 ? filas[punto] : undefined;
      const simple = fila === undefined ? String.fromCodePoint(punto) : String.fromCharCode(operacion === 'codePointUpper' ? fila.mayuscula : fila.minuscula);
      if (texto !== simple) especiales.push({ puntoDeCodigo: punto, resultado: texto });
    });
    return especiales;
  };
  const [mayusculas, minusculas] = await Promise.all([pedir('codePointUpper'), pedir('codePointLower')]);
  return { mayusculas, minusculas };
}

export function renderizarCsvDeMapeos(mapeos: readonly MapeoEspecial[]): string {
  return mapeos.map((mapeo) => `${mapeo.puntoDeCodigo},${[...mapeo.resultado].map((c) => (c.codePointAt(0) as number).toString(16)).join(' ')}\n`).join('');
}

export function renderizarTsDeMayusculas(mapeos: MapeosDeMayusculas): string {
  const filas = (lista: readonly MapeoEspecial[]): string => lista.map((m) => `  [${m.puntoDeCodigo}, ${JSON.stringify(m.resultado)}],`).join('\n');
  return (
    '// Archivo generado por `npm run oraculo:conjuntos` a partir de herramientas/oraculo/java/EvaluarBiblioteca.java (órdenes `codePointUpper`/`codePointLower`) contra el JDK 17 de referencia\n' +
    '// (Temurin 17.0.18+8, ADR 010) — no editar a mano. Solo lo que `String.toUpperCase()`/`toLowerCase()` hace distinto de la correspondencia simple de `Character.toUpperCase(char)`\n' +
    '// (`ß` → `SS`, `İ` → `i̇`…) en el plano básico, y todo lo que cambia en el plano 1 (`Character` de un solo `char` no llega ahí).\n\n' +
    `export const MAYUSCULAS_ESPECIALES: readonly (readonly [number, string])[] = [\n${filas(mapeos.mayusculas)}\n];\n\n` +
    `export const MINUSCULAS_ESPECIALES: readonly (readonly [number, string])[] = [\n${filas(mapeos.minusculas)}\n];\n`
  );
}

// ---- Math (REQ-BIB-004) ----

export interface RegistroDeMatematica {
  readonly operacion: string;
  /** Argumentos tipados (`d:5`, `D:<bits>`…). */
  readonly argumentos: readonly string[];
  /** `OK:<valor>` (los double como bits) o `EX:<clase>:<mensaje>`. */
  readonly resultado: string;
}

export async function generarConjuntoDeMatematicas(jdk: InfoJdk): Promise<RegistroDeMatematica[]> {
  const casos = casosDeMatematicas();
  const codificados = casos.map((caso) => caso.argumentos.map((argumento) => codificarArgumento(argumento, escaparCampo)));
  const lineas = casos.map((caso, indice) => [caso.operacion, ...(codificados[indice] as string[])].join('\t'));
  const salida = (await correrLaSonda(jdk, 'matematicas', lineas)).split('\n');
  salida.pop();
  if (salida.length !== casos.length) throw new Error(`La sonda "matematicas" contestó ${salida.length} líneas para ${casos.length} casos.`);
  return casos.map((caso, indice) => ({ operacion: caso.operacion, argumentos: codificados[indice] as string[], resultado: analizarResultadoDeCadena(salida[indice] as string) }));
}

export function renderizarTsvDeMatematicas(registros: readonly RegistroDeMatematica[]): string {
  return registros.map(({ operacion, argumentos, resultado }) => `${[operacion, ...argumentos, `=>${escaparCampo(resultado)}`].join('\t')}\n`).join('');
}

// ---- Escritura ----

export interface LineaDeDouble {
  readonly bits: bigint;
  readonly texto: string;
}

/** Pura: la salida de la orden `dobles` → líneas (bits, texto). */
export function analizarSalidaDeDobles(salida: string): LineaDeDouble[] {
  return salida
    .split('\n')
    .filter((linea) => linea !== '')
    .map((linea) => {
      const [hex, texto] = linea.split('\t') as [string, string];
      return { bits: BigInt(`0x${hex}`), texto };
    });
}

export function renderizarCsvDeDobles(lineas: readonly LineaDeDouble[]): string {
  return lineas.map(({ bits, texto }) => `${bitsAHex(bits)},${texto}\n`).join('');
}

/**
 * Evalúa en el JDK real todos los conjuntos de `Double.toString` y devuelve, por nombre, las líneas que se guardan. En `empates` solo se guardan
 * los que se apartan del "más corto" de JS más una muestra de los que coinciden (el conjunto completo son 149 985 casos y casi todos coinciden).
 */
export async function generarConjuntosDeDobles(jdk: InfoJdk): Promise<Map<string, LineaDeDouble[]>> {
  const conjuntos: ConjuntoDeDobles[] = [
    conjuntoEspeciales(),
    conjuntoSalon(),
    conjuntoAleatorios(),
    conjuntoBanda(),
    conjuntoPotenciasDeDos(),
    conjuntoSubnormales(),
    conjuntoGrandes(),
    conjuntoPotenciasDeDiez(),
  ];
  const empates = candidatosDeEmpates();
  const todos = [...conjuntos.flatMap((conjunto) => conjunto.bits), ...empates];
  const evaluadas = analizarSalidaDeDobles(await correrLaSonda(jdk, 'dobles', todos.map(bitsAHex)));
  if (evaluadas.length !== todos.length) {
    throw new Error(`La sonda "dobles" contestó ${evaluadas.length} líneas para ${todos.length} casos.`);
  }
  const resultado = new Map<string, LineaDeDouble[]>();
  let posicion = 0;
  for (const conjunto of conjuntos) {
    resultado.set(conjunto.nombre, evaluadas.slice(posicion, posicion + conjunto.bits.length));
    posicion += conjunto.bits.length;
  }
  const evaluadasDeEmpates = evaluadas.slice(posicion);
  const seApartan: LineaDeDouble[] = [];
  const coinciden: LineaDeDouble[] = [];
  for (const linea of evaluadasDeEmpates) {
    const java = digitosYExponente(linea.texto);
    const js = digitosMasCortosDeJs(doubleDeBits(linea.bits));
    (java.digitos === js.digitos && java.exponente === js.exponente ? coinciden : seApartan).push(linea);
  }
  const azar = crearAzar(12_26);
  const muestra = coinciden.filter(() => azar.entre(0, coinciden.length) < 3000);
  resultado.set('empates', [...seApartan, ...muestra]);
  return resultado;
}

export function escribirConjuntosDeDobles(raizProyecto: string, conjuntos: ReadonlyMap<string, readonly LineaDeDouble[]>): void {
  const directorio = resolve(raizProyecto, 'corpus', 'datos', 'double-tostring');
  mkdirSync(directorio, { recursive: true });
  for (const [nombre, lineas] of conjuntos) {
    writeFileSync(resolve(directorio, `${nombre}.csv`), renderizarCsvDeDobles(lineas), 'utf-8');
  }
}

// ---- Programa principal ----

/**
 * Genera TODOS los conjuntos contra el JDK real y los escribe bajo `raiz` con la misma estructura del repositorio (`corpus/datos/…` y `src/motor/biblioteca/datos/*.generado.ts`). `principal` lo
 * corre sobre el repositorio; la prueba del oráculo lo corre sobre un directorio temporal y exige BYTES IDÉNTICOS a lo guardado (ADR 011): nadie edita estos archivos a mano.
 */
export async function generarTodo(jdk: InfoJdk, raiz: string, informar: (mensaje: string) => void = () => undefined): Promise<void> {
  verificarVersionJdk(jdk);
  mkdirSync(resolve(raiz, 'src', 'motor', 'biblioteca', 'datos'), { recursive: true });
  const dobles = await generarConjuntosDeDobles(jdk);
  escribirConjuntosDeDobles(raiz, dobles);
  const resumen = [...dobles].map(([nombre, lineas]) => `${nombre}: ${lineas.length}`).join(', ');
  informar(`Oráculo: double-tostring (${resumen}) escrito en corpus/datos/double-tostring/.`);
  const filasDeCaracteres = analizarSalidaDeCaracteres(await correrLaSonda(jdk, 'caracteres', []));
  const rangos = comprimirEnRangos(filasDeCaracteres);
  mkdirSync(resolve(raiz, 'corpus', 'datos', 'caracteres'), { recursive: true });
  writeFileSync(resolve(raiz, 'corpus', 'datos', 'caracteres', 'rangos.csv'), renderizarCsvDeRangos(rangos), 'utf-8');
  writeFileSync(resolve(raiz, 'src', 'motor', 'biblioteca', 'datos', 'caracteres.generado.ts'), renderizarTsDeCaracteres(rangos), 'utf-8');
  informar(`Oráculo: ${rangos.length} tramos de Character (65 536 char) escritos en corpus/datos/caracteres/ y src/motor/biblioteca/datos/caracteres.generado.ts.`);
  const escenarios = await generarEscenariosDeExcepciones(jdk);
  mkdirSync(resolve(raiz, 'corpus', 'datos', 'marcos'), { recursive: true });
  writeFileSync(resolve(raiz, 'corpus', 'datos', 'marcos', 'excepciones.jsonl'), renderizarJsonlDeEscenarios(escenarios), 'utf-8');
  const filas = filasPorSitio(escenarios);
  writeFileSync(resolve(raiz, 'src', 'motor', 'biblioteca', 'datos', 'marcos-de-pila.generado.ts'), renderizarTsDeMarcosDePila(filas), 'utf-8');
  const cadenas = await generarConjuntoDeCadenas(jdk);
  mkdirSync(resolve(raiz, 'corpus', 'datos', 'cadenas'), { recursive: true });
  writeFileSync(resolve(raiz, 'corpus', 'datos', 'cadenas', 'operaciones.tsv'), renderizarTsvDeCadenas(cadenas), 'utf-8');
  const mapeos = await generarMapeosDeMayusculas(jdk, filasDeCaracteres);
  writeFileSync(resolve(raiz, 'corpus', 'datos', 'caracteres', 'mayusculas-especiales.csv'), renderizarCsvDeMapeos(mapeos.mayusculas), 'utf-8');
  writeFileSync(resolve(raiz, 'corpus', 'datos', 'caracteres', 'minusculas-especiales.csv'), renderizarCsvDeMapeos(mapeos.minusculas), 'utf-8');
  writeFileSync(resolve(raiz, 'src', 'motor', 'biblioteca', 'datos', 'mayusculas.generado.ts'), renderizarTsDeMayusculas(mapeos), 'utf-8');
  informar(`Oráculo: ${cadenas.length} operaciones de String, ${mapeos.mayusculas.length} mayúsculas y ${mapeos.minusculas.length} minúsculas especiales, escritas en corpus/datos/{cadenas,caracteres}/.`);
  const matematicas = await generarConjuntoDeMatematicas(jdk);
  mkdirSync(resolve(raiz, 'corpus', 'datos', 'matematicas'), { recursive: true });
  writeFileSync(resolve(raiz, 'corpus', 'datos', 'matematicas', 'operaciones.tsv'), renderizarTsvDeMatematicas(matematicas), 'utf-8');
  informar(`Oráculo: ${matematicas.length} operaciones de Math escritas en corpus/datos/matematicas/.`);
  const random = await generarConjuntoDeRandom(jdk);
  mkdirSync(resolve(raiz, 'corpus', 'datos', 'random'), { recursive: true });
  writeFileSync(resolve(raiz, 'corpus', 'datos', 'random', 'secuencias.tsv'), renderizarTsvDeRandom(random), 'utf-8');
  informar(`Oráculo: ${SEMILLAS_DE_RANDOM.length} semillas de Random, ${random.length} secuencias, escritas en corpus/datos/random/.`);
  const formatos = await generarConjuntosDeFormato(jdk);
  mkdirSync(resolve(raiz, 'corpus', 'datos', 'printf'), { recursive: true });
  for (const regional of ['es-MX', 'es-ES'] as const) {
    writeFileSync(resolve(raiz, 'corpus', 'datos', 'printf', `formatos-${regional}.jsonl`), renderizarJsonlDeFormatos(formatos[regional]), 'utf-8');
  }
  informar(`Oráculo: printf/String.format, ${formatos['es-MX'].length} casos en es-MX y ${formatos['es-ES'].length} en es-ES, escritos en corpus/datos/printf/.`);
  const entradas = await generarConjuntosDeEntrada(jdk);
  escribirConjuntosDeEntrada(raiz, entradas);
  informar(
    `Oráculo: ${entradas.parseo.length} casos de parseo, ${entradas.tokens['es-MX'].length} casos de token y ${entradas.secuencias['es-MX'].length} secuencias de Scanner (es-MX y es-ES) escritos en corpus/datos/{parseo,scanner}/.`,
  );
  informar(`Oráculo: ${escenarios.length} escenarios de excepción, ${filas.length} sitios, escritos en corpus/datos/marcos/ y src/motor/biblioteca/datos/marcos-de-pila.generado.ts.`);
}

async function principal(): Promise<void> {
  await generarTodo(localizarJdk(), RAIZ_PROYECTO, (mensaje) => console.log(mensaje));
}

const esEjecutadoDirectamente = process.argv[1] === fileURLToPath(import.meta.url);
if (esEjecutadoDirectamente) {
  principal().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
