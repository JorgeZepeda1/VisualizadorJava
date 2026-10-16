// Decodificación de literales (design.md §1.2 "literales.ts", §2.6). Catálogo COMPLETO desde la
// tarea 1.1: cadenas y chars con todos los escapes de Java (los NO-DISP —\r \b \f \s, octales
// \0-\377, \uXXXX, bloques de texto """— nunca abortan: producen `NoSoportadoLexico` y "dejan
// seguir", ADR 003); y literales numéricos (enteros con "_", "long" con "L", "double" con
// punto/exponente/sufijo "d"; hex/octal/binario/float —y los flotantes hexadecimales, `0x1p3`—
// son NO-DISP; un guion bajo mal puesto o un literal mal formado, `0x` o `1e`, son un error como
// en javac: tarea 1.33). El léxico NO valida rangos de un entero decimal (int/long demasiado
// grandes): eso lo hace el analizador sintáctico en la tarea 1.4, porque depende de si el
// literal viene tras un "-" unario (JLS 3.10.1).
import type { Rango } from '../fuente/rango.ts';
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';
// Tarea 1.24: única fuente de verdad de códigos "no soportado" (antes strings inline sueltos aquí).
// Tarea 1.25: `ConDatosPorCodigo` liga cada código a los datos exactos que su texto necesita (el
// literal octal es el hallazgo real de esta tarea: el texto pedía `textoOriginal`/`valorDecimal`
// desde 1.24, pero nada obligaba a este archivo a mandarlos — el alumno veía "el número `undefined`").
import { CODIGOS_NO_SOPORTADO, type ConDatosPorCodigo } from '../no-soportado.ts';

/** Una construcción que Java sí acepta pero que este visualizador todavía no soporta (ADR 003). */
export type NoSoportadoLexico = ConDatosPorCodigo<{ readonly nota: string; readonly rango: Rango }>;

// Tarea 1.34: `Map`s y no objetos planos (la clave es el carácter que escribió el alumno tras la barra; ver `PRECEDENCIA` en `sintaxis/expresiones.ts`).
const ESCAPES_VALIDOS: ReadonlyMap<string, string> = new Map([
  ['"', '"'],
  ["'", "'"],
  ['\\', '\\'],
  ['n', '\n'],
  ['t', '\t'],
]);

// Escapes que Java SÍ reconoce (JLS 3.10.7) pero que este visualizador todavía no soporta: no son
// error, son NoSoportado (design.md §2.6). `\s` es el escape de espacio de los bloques de texto
// (Java 15+); aquí se acepta igual como escape suelto, aunque en este subconjunto solo puede
// aparecer si alguien lo escribe a mano (no hay bloques de texto reales).
const ESCAPES_NO_SOPORTADOS_SIMPLES: ReadonlyMap<string, string> = new Map([
  ['r', 'retorno de carro (\\r)'],
  ['b', 'retroceso (\\b)'],
  ['f', 'salto de página (\\f)'],
  ['s', 'espacio (\\s)'],
]);

const DIGITO_OCTAL = /[0-7]/;
const DIGITO_HEX = /[0-9A-Fa-f]/;

interface UnidadDecodificada {
  readonly texto: string;
  readonly longitudConsumida: number;
  readonly noSoportado?: ConDatosPorCodigo<{ readonly nota: string }>;
}

/**
 * Decodifica UNA unidad de contenido (un carácter simple o una secuencia de escape) a partir de
 * `cursor`. No consume la comilla de cierre. Compartida por `leerCadena` y `leerCaracter`.
 */
function decodificarUnidad(fuente: string, cursor: number): UnidadDecodificada {
  const caracter = fuente[cursor];
  if (caracter !== '\\') {
    return { texto: caracter, longitudConsumida: 1 };
  }

  const siguiente = fuente[cursor + 1];
  const escapeValido = siguiente === undefined ? undefined : ESCAPES_VALIDOS.get(siguiente);
  if (escapeValido !== undefined) {
    return { texto: escapeValido, longitudConsumida: 2 };
  }
  const descripcionDelEscape = siguiente === undefined ? undefined : ESCAPES_NO_SOPORTADOS_SIMPLES.get(siguiente);
  if (descripcionDelEscape !== undefined) {
    return {
      texto: fuente.slice(cursor, cursor + 2),
      longitudConsumida: 2,
      noSoportado: {
        codigo: CODIGOS_NO_SOPORTADO.escapeNoSoportado,
        nota: `Java sí reconoce el escape "\\${siguiente}" (${descripcionDelEscape}), pero este visualizador todavía no lo soporta.`,
        datos: {},
      },
    };
  }
  if (siguiente === 'u') {
    return decodificarEscapeUnicode(fuente, cursor);
  }
  if (siguiente !== undefined && DIGITO_OCTAL.test(siguiente)) {
    return decodificarEscapeOctal(fuente, cursor);
  }

  throw new ErrorDeCompilacion(`secuencia de escape no reconocida: "\\${siguiente ?? ''}"`, {
    inicio: cursor,
    fin: cursor + 2,
  });
}

function decodificarEscapeOctal(fuente: string, cursor: number): UnidadDecodificada {
  const d1 = fuente[cursor + 1];
  const d2 = fuente[cursor + 2];
  const d3 = fuente[cursor + 3];
  let longitud = 2;
  if (d2 !== undefined && DIGITO_OCTAL.test(d2)) {
    longitud = 3;
    if (d3 !== undefined && DIGITO_OCTAL.test(d3) && /[0-3]/.test(d1)) {
      longitud = 4;
    }
  }
  const textoOctal = fuente.slice(cursor + 1, cursor + longitud);
  const valorDecimal = Number.parseInt(textoOctal, 8);
  return {
    texto: fuente.slice(cursor, cursor + longitud),
    longitudConsumida: longitud,
    noSoportado: {
      codigo: CODIGOS_NO_SOPORTADO.escapeOctalNoSoportado,
      nota: `Java sí reconoce el escape octal "\\${textoOctal}" (valor ${valorDecimal}), pero este visualizador todavía no lo soporta.`,
      datos: {},
    },
  };
}

// JLS 3.3: una secuencia unicode admite varias "u" seguidas ("\uu0041").
function decodificarEscapeUnicode(fuente: string, cursor: number): UnidadDecodificada {
  let inicioHex = cursor + 2;
  while (fuente[inicioHex] === 'u') inicioHex += 1;
  const hex = fuente.slice(inicioHex, inicioHex + 4);
  if (hex.length !== 4 || !DIGITO_HEX.test(hex[0]) || ![...hex].every((c) => DIGITO_HEX.test(c))) {
    throw new ErrorDeCompilacion(
      'secuencia unicode incompleta: se esperaban 4 dígitos hexadecimales tras "\\u"',
      { inicio: cursor, fin: inicioHex },
    );
  }
  const longitud = inicioHex + 4 - cursor;
  return {
    texto: fuente.slice(cursor, cursor + longitud),
    longitudConsumida: longitud,
    noSoportado: {
      codigo: CODIGOS_NO_SOPORTADO.escapeUnicodeNoSoportado,
      nota: `Java procesa "\\u${hex}" como el carácter Unicode U+${hex.toUpperCase()} antes de leer el resto del programa; este visualizador todavía no lo soporta.`,
      datos: {},
    },
  };
}

export interface CadenaLeida {
  readonly valor: string;
  readonly longitud: number;
  readonly noSoportados: readonly NoSoportadoLexico[];
}

/** Lee un literal de cadena (o un bloque de texto NO-DISP) que empieza en `inicio`. */
export function leerCadena(fuente: string, inicio: number): CadenaLeida {
  if (fuente[inicio] !== '"') {
    throw new ErrorDeCompilacion('se esperaba una cadena entre comillas', {
      inicio,
      fin: inicio + 1,
    });
  }
  if (fuente[inicio + 1] === '"' && fuente[inicio + 2] === '"') {
    return leerBloqueDeTexto(fuente, inicio);
  }

  let cursor = inicio + 1;
  let valor = '';
  const noSoportados: NoSoportadoLexico[] = [];

  while (cursor < fuente.length && fuente[cursor] !== '"') {
    if (fuente[cursor] === '\n') {
      // err15 de exploracion/03: verificado contra javac 17 real (unclosed string literal) que el
      // error se ancla en la comilla de APERTURA ("inicio"), no en el fin de línea — el mismo
      // "rango" que ya se usaba, solo con su código real en vez del catch-all.
      throw new ErrorDeCompilacion(
        'cadena sin cerrar antes del fin de línea',
        { inicio, fin: cursor },
        undefined,
        'cadena-sin-cerrar',
      );
    }
    const unidad = decodificarUnidad(fuente, cursor);
    if (unidad.noSoportado) {
      noSoportados.push({
        ...unidad.noSoportado,
        rango: { inicio: cursor, fin: cursor + unidad.longitudConsumida },
      });
    }
    valor += unidad.texto;
    cursor += unidad.longitudConsumida;
  }

  if (fuente[cursor] !== '"') {
    throw new ErrorDeCompilacion('cadena sin cerrar', { inicio, fin: cursor }, undefined, 'cadena-sin-cerrar');
  }

  return { valor, longitud: cursor + 1 - inicio, noSoportados };
}

// Bloque de texto """…""" (Java 15+, design.md §2.6): NO-DISP completo. No se decodifica su
// contenido (nunca se va a ejecutar); solo se delimita bien para que el análisis siga después.
function leerBloqueDeTexto(fuente: string, inicio: number): CadenaLeida {
  const cierre = fuente.indexOf('"""', inicio + 3);
  if (cierre === -1) {
    throw new ErrorDeCompilacion('bloque de texto (""") sin cerrar', {
      inicio,
      fin: fuente.length,
    });
  }
  const fin = cierre + 3;
  return {
    valor: '',
    longitud: fin - inicio,
    noSoportados: [
      {
        codigo: CODIGOS_NO_SOPORTADO.bloqueDeTexto,
        nota: 'Java 17 sí acepta bloques de texto (""" … """), pero este visualizador todavía no los soporta.',
        datos: {},
        rango: { inicio, fin },
      },
    ],
  };
}

export interface CaracterLeido {
  readonly valor: string;
  readonly longitud: number;
  readonly noSoportados: readonly NoSoportadoLexico[];
}

/** Tarea 1.35: ¿hay en `fuente[i]` un par de sustitutos UTF-16 (una unidad alta y una baja), es decir, un carácter fuera del plano básico como un emoji? */
function esParDeSustitutos(fuente: string, i: number): boolean {
  const alta = fuente.charCodeAt(i);
  const baja = fuente.charCodeAt(i + 1);
  return alta >= 0xd800 && alta <= 0xdbff && baja >= 0xdc00 && baja <= 0xdfff;
}

/** Lee un literal char ('x') que empieza en `inicio`: exactamente una unidad de contenido (o, desde la tarea 1.35, el par de unidades de un carácter fuera del plano básico). */
export function leerCaracter(fuente: string, inicio: number): CaracterLeido {
  if (fuente[inicio] !== "'") {
    throw new ErrorDeCompilacion('se esperaba un literal char entre comillas simples', {
      inicio,
      fin: inicio + 1,
    });
  }

  const cursorContenido = inicio + 1;
  if (fuente[cursorContenido] === "'") {
    throw new ErrorDeCompilacion('el literal char no puede estar vacío', {
      inicio,
      fin: cursorContenido + 1,
    });
  }
  if (fuente[cursorContenido] === undefined || fuente[cursorContenido] === '\n') {
    throw new ErrorDeCompilacion('literal char sin cerrar', { inicio, fin: cursorContenido });
  }

  // Tarea 1.35: un carácter fuera del plano básico (un emoji) ocupa DOS unidades UTF-16. javac 17 lo acepta como el contenido de un literal `char` (el valor es la primera unidad:
  // `int x = '<emoji>';` da 55357 para U+1F600), así que no es un error; el visualizador no simula ese literal y avisa.
  if (esParDeSustitutos(fuente, cursorContenido) && fuente[cursorContenido + 2] === "'") {
    const caracter = fuente.slice(cursorContenido, cursorContenido + 2);
    return {
      valor: caracter,
      longitud: cursorContenido + 3 - inicio,
      noSoportados: [
        {
          codigo: CODIGOS_NO_SOPORTADO.caracterSuplementario,
          nota: `Java sí acepta el carácter "${caracter}" dentro de un literal char (ocupa dos unidades), pero este visualizador todavía no lo soporta.`,
          datos: { caracter },
          rango: { inicio: cursorContenido, fin: cursorContenido + 2 },
        },
      ],
    };
  }

  const unidad = decodificarUnidad(fuente, cursorContenido);
  const noSoportados: NoSoportadoLexico[] = unidad.noSoportado
    ? [
        {
          ...unidad.noSoportado,
          rango: { inicio: cursorContenido, fin: cursorContenido + unidad.longitudConsumida },
        },
      ]
    : [];

  const cursorCierre = cursorContenido + unidad.longitudConsumida;
  if (fuente[cursorCierre] !== "'") {
    throw new ErrorDeCompilacion(
      'el literal char debe tener exactamente un carácter (¿sobra texto o falta escapar algo?)',
      { inicio, fin: cursorCierre },
    );
  }

  return { valor: unidad.texto, longitud: cursorCierre + 1 - inicio, noSoportados };
}

export interface NumeroLeido {
  readonly clase: 'entero' | 'largo' | 'doble';
  /** Magnitud exacta (siempre ≥ 0; el signo lo maneja el analizador sintáctico). Solo para entero/largo. */
  readonly magnitud: bigint;
  /** Solo para `clase: 'doble'`. */
  readonly valorDoble: number;
  readonly longitud: number;
  /** Si está presente, `magnitud`/`valorDoble` no deben usarse: el literal es NO-DISP. */
  readonly noSoportado?: NoSoportadoLexico;
}

// ---- Literales numéricos (JLS 3.10.1 y 3.10.2), tarea 1.33 ----
//
// Antes de la tarea 1.33 este lector quitaba los guiones bajos de cualquier lado (`1_`, `1_L` y `1_.0` se aceptaban, falsos aceptos) y no
// conocía los flotantes hexadecimales (`0x1p3` se cortaba en `0x1` y daba «Te falta un punto y coma», un falso rechazo). Ahora recorre el
// literal con las MISMAS decisiones que el analizador léxico de javac 17 (`JavaTokenizer.scanNumber`, verificadas con `JavacTask.parse()`;
// la tabla completa vive en `pruebas/compilacion/tablas-lexicas.ts` y la vigila `herramientas/oraculo/tablas-lexicas.test.ts`):
//   - Un guion bajo solo puede ir ENTRE dos dígitos. Es ilegal si abre o cierra una racha de dígitos, si va justo tras `0x`/`0b`, pegado al
//     punto decimal, antes o después de la `e`/`p` del exponente (y de su signo) y antes del sufijo `L`/`f`/`d`. La racha de un octal
//     (`0_7`) admite guiones bajos; `0_` y `0_8` no.
//   - `0x1p3`, `0x1.8p1`, `0x.8p0`, `0X1P-2`, `0x1p3d` son flotantes hexadecimales válidos: UN literal, con el aviso de «hexadecimal», como
//     los enteros (`0x1F`). Un `0x1.8` sin exponente, un `0x`/`0b` sin dígitos o un `1e` sin dígitos de exponente son errores de javac
//     (`malformed.fp.lit`, `invalid.hex.number`, `invalid.binary.number`): aquí también, no un aviso.
//   - Un error de guion bajo gana sobre los que vienen DESPUÉS en el mismo literal (javac reporta el primero); el literal se lee completo
//     y el error lo trae tal como se escribió.
// El léxico NO valida el rango de un entero decimal (lo hace el analizador sintáctico, que sabe si viene tras un «-» unario, JLS 3.10.1):
// un hexadecimal, octal o binario demasiado grande sigue siendo un aviso, no un error.

interface EstadoDeLectura {
  readonly fuente: string;
  readonly inicio: number;
  cursor: number;
  /** ¿Ya se vio un guion bajo mal puesto en este literal? */
  guionBajoIlegal: boolean;
}

/** El valor de un dígito ASCII (0-9, a-z, A-Z) como `Character.digit`, o -1 si no es uno. */
function valorDeDigito(caracter: string | undefined): number {
  if (caracter === undefined) return -1;
  const codigo = caracter.charCodeAt(0);
  if (codigo >= 48 && codigo <= 57) return codigo - 48;
  if (codigo >= 97 && codigo <= 122) return codigo - 97 + 10;
  if (codigo >= 65 && codigo <= 90) return codigo - 65 + 10;
  return -1;
}

function esDigitoEnBase(caracter: string | undefined, base: number): boolean {
  const valor = valorDeDigito(caracter);
  return valor >= 0 && valor < base;
}

function mensajeDeNumeroMalFormado(estado: EstadoDeLectura, razon: string): ErrorDeCompilacion {
  const texto = estado.fuente.slice(estado.inicio, estado.cursor);
  return new ErrorDeCompilacion(`el número "${texto}" está mal escrito: ${razon}`, { inicio: estado.inicio, fin: estado.cursor });
}

/** Lanza el error del literal ya leído: primero el del guion bajo (javac reporta el primero que ve), si no, el que se pida. */
function fallarSiElGuionBajoEsIlegal(estado: EstadoDeLectura): void {
  if (!estado.guionBajoIlegal) return;
  const numero = estado.fuente.slice(estado.inicio, estado.cursor);
  throw new ErrorDeCompilacion(
    `el número "${numero}" tiene un guion bajo mal puesto`,
    { inicio: estado.inicio, fin: estado.cursor },
    undefined,
    undefined,
    { codigo: 'guion-bajo-mal-puesto', datos: { numero } },
  );
}

function fallarPorNumeroMalFormado(estado: EstadoDeLectura, razon: string): never {
  fallarSiElGuionBajoEsIlegal(estado);
  throw mensajeDeNumeroMalFormado(estado, razon);
}

/** `javac: skipIllegalUnderscores`: un guion bajo en un lugar donde ningún guion bajo es válido (tras `0x`, tras el punto, tras `e`/`p`). */
function saltarGuionesBajosIlegales(estado: EstadoDeLectura): void {
  if (estado.fuente[estado.cursor] !== '_') return;
  estado.guionBajoIlegal = true;
  while (estado.fuente[estado.cursor] === '_') estado.cursor += 1;
}

/** `javac: scanDigits`: una racha de dígitos de `base` y guiones bajos; el primer carácter se consume SIEMPRE. Ilegal si abre o cierra con `_`. */
function leerRachaDeDigitos(estado: EstadoDeLectura, base: number): void {
  const abreConGuionBajo = estado.fuente[estado.cursor] === '_';
  let cierraConGuionBajo: boolean;
  do {
    cierraConGuionBajo = estado.fuente[estado.cursor] === '_';
    estado.cursor += 1;
  } while (esDigitoEnBase(estado.fuente[estado.cursor], base) || estado.fuente[estado.cursor] === '_');
  if (abreConGuionBajo || cierraConGuionBajo) estado.guionBajoIlegal = true;
}

function esSufijoDeFloat(caracter: string | undefined): boolean {
  return caracter === 'f' || caracter === 'F';
}

function esSufijoDeDouble(caracter: string | undefined): boolean {
  return caracter === 'd' || caracter === 'D';
}

function esLetraE(caracter: string | undefined): boolean {
  return caracter === 'e' || caracter === 'E';
}

function esLetraP(caracter: string | undefined): boolean {
  return caracter === 'p' || caracter === 'P';
}

type ClaseDeLiteralLeido = 'int' | 'long' | 'float' | 'double';

interface LiteralLeido {
  readonly clase: ClaseDeLiteralLeido;
  readonly base: 2 | 8 | 10 | 16;
  readonly esFlotanteHexadecimal: boolean;
}

/** Tras la parte entera: `.`, fracción, exponente `e` y sufijo `f`/`d` de un decimal (`javac: scanFractionAndSuffix`). */
function leerFraccionYSufijoDecimal(estado: EstadoDeLectura): LiteralLeido {
  const { fuente } = estado;
  saltarGuionesBajosIlegales(estado);
  if (esDigitoEnBase(fuente[estado.cursor], 10)) leerRachaDeDigitos(estado, 10);
  if (esLetraE(fuente[estado.cursor])) {
    estado.cursor += 1;
    saltarGuionesBajosIlegales(estado);
    if (fuente[estado.cursor] === '+' || fuente[estado.cursor] === '-') estado.cursor += 1;
    saltarGuionesBajosIlegales(estado);
    if (esDigitoEnBase(fuente[estado.cursor], 10)) leerRachaDeDigitos(estado, 10);
    else fallarPorNumeroMalFormado(estado, 'el exponente necesita al menos un dígito después de la "e"');
  }
  if (esSufijoDeFloat(fuente[estado.cursor])) {
    estado.cursor += 1;
    return { clase: 'float', base: 10, esFlotanteHexadecimal: false };
  }
  if (esSufijoDeDouble(fuente[estado.cursor])) estado.cursor += 1;
  return { clase: 'double', base: 10, esFlotanteHexadecimal: false };
}

/** El exponente `p` (obligatorio) y el sufijo de un flotante hexadecimal (`javac: scanHexExponentAndSuffix`). */
function leerExponenteHexadecimalYSufijo(estado: EstadoDeLectura): LiteralLeido {
  const { fuente } = estado;
  if (!esLetraP(fuente[estado.cursor])) fallarPorNumeroMalFormado(estado, 'un número hexadecimal con punto necesita su exponente con "p", como en "0x1.8p1"');
  estado.cursor += 1;
  saltarGuionesBajosIlegales(estado);
  if (fuente[estado.cursor] === '+' || fuente[estado.cursor] === '-') estado.cursor += 1;
  saltarGuionesBajosIlegales(estado);
  if (esDigitoEnBase(fuente[estado.cursor], 10)) leerRachaDeDigitos(estado, 10);
  else fallarPorNumeroMalFormado(estado, 'el exponente necesita al menos un dígito después de la "p"');
  if (esSufijoDeFloat(fuente[estado.cursor])) {
    estado.cursor += 1;
    return { clase: 'float', base: 16, esFlotanteHexadecimal: true };
  }
  if (esSufijoDeDouble(fuente[estado.cursor])) estado.cursor += 1;
  return { clase: 'double', base: 16, esFlotanteHexadecimal: true };
}

/** Tras `0x` y los dígitos hexadecimales, un `.` y los dígitos de la fracción (`javac: scanHexFractionAndSuffix`). */
function leerFraccionHexadecimal(estado: EstadoDeLectura, viDigitos: boolean): LiteralLeido {
  const { fuente } = estado;
  estado.cursor += 1; // el "."
  saltarGuionesBajosIlegales(estado);
  let hayDigitos = viDigitos;
  if (esDigitoEnBase(fuente[estado.cursor], 16)) {
    hayDigitos = true;
    leerRachaDeDigitos(estado, 16);
  }
  if (!hayDigitos) fallarPorNumeroMalFormado(estado, 'un número hexadecimal necesita al menos un dígito hexadecimal');
  return leerExponenteHexadecimalYSufijo(estado);
}

/** Lo que sigue a un prefijo `0x`, `0b`, a un `0` inicial o a un dígito del 1 al 9 (`javac: scanNumber(pos, radix)`). */
function leerNumeroEnBase(estado: EstadoDeLectura, base: 2 | 8 | 10 | 16): LiteralLeido {
  const { fuente } = estado;
  // Un octal admite dígitos decimales mientras no se sepa si es un flotante (`07.5`, `09e1`).
  const baseDeLosDigitos = base === 8 ? 10 : base;
  const primero = valorDeDigito(fuente[estado.cursor]);
  const viDigitos = primero >= 0 && primero < Math.max(10, baseDeLosDigitos);
  const viDigitosValidos = viDigitos && primero < baseDeLosDigitos;
  if (viDigitos) leerRachaDeDigitos(estado, baseDeLosDigitos);

  if (base === 16 && fuente[estado.cursor] === '.') return leerFraccionHexadecimal(estado, viDigitos);
  if (viDigitos && base === 16 && esLetraP(fuente[estado.cursor])) return leerExponenteHexadecimalYSufijo(estado);
  if (baseDeLosDigitos === 10 && fuente[estado.cursor] === '.') {
    estado.cursor += 1;
    return leerFraccionYSufijoDecimal(estado);
  }
  if (baseDeLosDigitos === 10 && (esLetraE(fuente[estado.cursor]) || esSufijoDeFloat(fuente[estado.cursor]) || esSufijoDeDouble(fuente[estado.cursor]))) {
    return leerFraccionYSufijoDecimal(estado);
  }

  if (!viDigitosValidos && base === 2) fallarPorNumeroMalFormado(estado, 'un número binario necesita al menos un dígito binario');
  if (!viDigitosValidos && base === 16) fallarPorNumeroMalFormado(estado, 'un número hexadecimal necesita al menos un dígito hexadecimal');
  // Un entero octal se vuelve a leer desde su primer dígito, ahora solo con dígitos octales: el «8» de `08` queda fuera y abre otro token.
  if (base === 8) {
    estado.cursor = estado.inicio;
    leerRachaDeDigitos(estado, 8);
  }
  if (fuente[estado.cursor] === 'l' || fuente[estado.cursor] === 'L') {
    estado.cursor += 1;
    return { clase: 'long', base, esFlotanteHexadecimal: false };
  }
  return { clase: 'int', base, esFlotanteHexadecimal: false };
}

function leerLiteralNumerico(estado: EstadoDeLectura): LiteralLeido {
  const { fuente } = estado;
  if (fuente[estado.cursor] === '.') {
    // `.5`: `tokenizar` solo entrega un punto si un dígito lo sigue.
    estado.cursor += 1;
    return leerFraccionYSufijoDecimal(estado);
  }
  if (fuente[estado.cursor] !== '0') return leerNumeroEnBase(estado, 10);
  estado.cursor += 1;
  const tras = fuente[estado.cursor];
  if (tras === 'x' || tras === 'X') {
    estado.cursor += 1;
    saltarGuionesBajosIlegales(estado);
    return leerNumeroEnBase(estado, 16);
  }
  if (tras === 'b' || tras === 'B') {
    estado.cursor += 1;
    saltarGuionesBajosIlegales(estado);
    return leerNumeroEnBase(estado, 2);
  }
  // `0_7` es un octal con un guion bajo entre dos dígitos; `0_` y `0_8` no (el guion bajo debe llevar un dígito detrás).
  if (fuente[estado.cursor] === '_') {
    while (fuente[estado.cursor] === '_') estado.cursor += 1;
    if (!esDigitoEnBase(fuente[estado.cursor], 10)) estado.guionBajoIlegal = true;
  }
  return leerNumeroEnBase(estado, 8);
}

function noSoportado(
  codigo: 'literal-hexadecimal-no-soportado' | 'literal-binario-no-soportado' | 'literal-float-no-soportado',
  nota: string,
  estado: EstadoDeLectura,
): NoSoportadoLexico {
  return { codigo, nota, datos: {}, rango: { inicio: estado.inicio, fin: estado.cursor } };
}

function quitarGuionesBajos(texto: string): string {
  return texto.replace(/_/g, '');
}

/** JLS 3.10.2: un literal decimal distinto de cero que redondea a infinito o a cero es un error de compilación (`fp.number.too.large` y `too.small`). */
function valorDeUnDoubleDecimal(estado: EstadoDeLectura, texto: string): number {
  const limpio = quitarGuionesBajos(texto).replace(/[dD]$/, '');
  const valor = Number(limpio);
  if (!Number.isFinite(valor)) throw mensajeDeNumeroMalFormado(estado, 'es demasiado grande para un double');
  const mantisa = limpio.split(/[eE]/)[0]!;
  if (valor === 0 && /[1-9]/.test(mantisa)) throw mensajeDeNumeroMalFormado(estado, 'es demasiado pequeño para un double');
  return valor;
}

/** Lee un literal numérico que empieza en `inicio` (apuntando a su primer dígito, o al punto de un
 * literal como `.5`, que `tokenizar` solo entrega aquí si un dígito lo sigue). */
export function leerNumero(fuente: string, inicio: number): NumeroLeido {
  const estado: EstadoDeLectura = { fuente, inicio, cursor: inicio, guionBajoIlegal: false };
  const literal = leerLiteralNumerico(estado);
  fallarSiElGuionBajoEsIlegal(estado);
  const longitud = estado.cursor - inicio;
  const texto = fuente.slice(inicio, estado.cursor);

  if (literal.esFlotanteHexadecimal) {
    return {
      clase: 'doble',
      magnitud: 0n,
      valorDoble: 0,
      longitud,
      noSoportado: noSoportado('literal-hexadecimal-no-soportado', 'Java sí acepta literales hexadecimales de punto flotante, pero este visualizador todavía no los soporta.', estado),
    };
  }
  if (literal.clase === 'float') {
    return {
      clase: 'doble',
      magnitud: 0n,
      valorDoble: 0,
      longitud,
      noSoportado: noSoportado('literal-float-no-soportado', 'Java sí acepta el sufijo "f" (float), pero este visualizador solo soporta "double".', estado),
    };
  }
  if (literal.clase === 'double') {
    return { clase: 'doble', magnitud: 0n, valorDoble: valorDeUnDoubleDecimal(estado, texto), longitud };
  }

  const esLargo = literal.clase === 'long';
  const digitos = quitarGuionesBajos(texto).replace(/[lL]$/, '');
  if (literal.base === 16 || literal.base === 2) {
    const esHexadecimal = literal.base === 16;
    return {
      clase: esLargo ? 'largo' : 'entero',
      magnitud: 0n,
      valorDoble: 0,
      longitud,
      noSoportado: noSoportado(
        esHexadecimal ? 'literal-hexadecimal-no-soportado' : 'literal-binario-no-soportado',
        `Java sí acepta literales enteros ${esHexadecimal ? 'hexadecimales (base 16)' : 'binarios (base 2)'}, pero este visualizador todavía no los soporta.`,
        estado,
      ),
    };
  }
  if (literal.base === 8 && /^0\d/.test(digitos)) {
    // Un octal (`010`, `0127`): el aviso explica que Java lo lee en base 8. El texto exacto y su valor viajan como datos (tarea 1.25).
    const valorDecimal = Number.parseInt(digitos.slice(1), 8);
    return {
      clase: esLargo ? 'largo' : 'entero',
      magnitud: 0n,
      valorDoble: 0,
      longitud,
      noSoportado: {
        codigo: CODIGOS_NO_SOPORTADO.literalOctal,
        nota: `Java lo lee como octal: ${valorDecimal}`,
        datos: { textoOriginal: texto, valorDecimal },
        rango: { inicio, fin: estado.cursor },
      },
    };
  }
  return { clase: esLargo ? 'largo' : 'entero', magnitud: BigInt(digitos), valorDoble: 0, longitud };
}
