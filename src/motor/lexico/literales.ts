// Decodificación de literales (design.md §1.2 "literales.ts", §2.6). Catálogo COMPLETO desde la
// tarea 1.1: cadenas y chars con todos los escapes de Java (los NO-DISP —\r \b \f \s, octales
// \0-\377, \uXXXX, bloques de texto """— nunca abortan: producen `NoSoportadoLexico` y "dejan
// seguir", ADR 003); y literales numéricos (enteros con "_", "long" con "L", "double" con
// punto/exponente/sufijo "d"; hex/octal/binario/float son NO-DISP). El léxico NO valida rangos
// (int/long demasiado grandes): eso lo hace el analizador sintáctico en la tarea 1.4, porque
// depende de si el literal viene tras un "-" unario (JLS 3.10.1).
import type { Rango } from '../fuente/rango.ts';
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';

/** Una construcción que Java sí acepta pero que este visualizador todavía no soporta (ADR 003). */
export interface NoSoportadoLexico {
  readonly codigo: string;
  readonly nota: string;
  readonly rango: Rango;
}

const ESCAPES_VALIDOS: Readonly<Record<string, string>> = {
  '"': '"',
  "'": "'",
  '\\': '\\',
  n: '\n',
  t: '\t',
};

// Escapes que Java SÍ reconoce (JLS 3.10.7) pero que este visualizador todavía no soporta: no son
// error, son NoSoportado (design.md §2.6). `\s` es el escape de espacio de los bloques de texto
// (Java 15+); aquí se acepta igual como escape suelto, aunque en este subconjunto solo puede
// aparecer si alguien lo escribe a mano (no hay bloques de texto reales).
const ESCAPES_NO_SOPORTADOS_SIMPLES: Readonly<Record<string, string>> = {
  r: 'retorno de carro (\\r)',
  b: 'retroceso (\\b)',
  f: 'salto de página (\\f)',
  s: 'espacio (\\s)',
};

const DIGITO_OCTAL = /[0-7]/;
const DIGITO_DECIMAL = /[0-9]/;
const DIGITO_HEX = /[0-9A-Fa-f]/;

interface UnidadDecodificada {
  readonly texto: string;
  readonly longitudConsumida: number;
  readonly noSoportado?: { codigo: string; nota: string };
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
  if (siguiente !== undefined && ESCAPES_VALIDOS[siguiente] !== undefined) {
    return { texto: ESCAPES_VALIDOS[siguiente], longitudConsumida: 2 };
  }
  if (siguiente !== undefined && ESCAPES_NO_SOPORTADOS_SIMPLES[siguiente] !== undefined) {
    return {
      texto: fuente.slice(cursor, cursor + 2),
      longitudConsumida: 2,
      noSoportado: {
        codigo: 'escape-no-soportado',
        nota: `Java sí reconoce el escape "\\${siguiente}" (${ESCAPES_NO_SOPORTADOS_SIMPLES[siguiente]}), pero este visualizador todavía no lo soporta.`,
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
      codigo: 'escape-octal-no-soportado',
      nota: `Java sí reconoce el escape octal "\\${textoOctal}" (valor ${valorDecimal}), pero este visualizador todavía no lo soporta.`,
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
      codigo: 'escape-unicode-no-soportado',
      nota: `Java procesa "\\u${hex}" como el carácter Unicode U+${hex.toUpperCase()} antes de leer el resto del programa; este visualizador todavía no lo soporta.`,
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
      throw new ErrorDeCompilacion('cadena sin cerrar antes del fin de línea', {
        inicio,
        fin: cursor,
      });
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
    throw new ErrorDeCompilacion('cadena sin cerrar', { inicio, fin: cursor });
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
        codigo: 'bloque-de-texto-no-soportado',
        nota: 'Java 17 sí acepta bloques de texto (""" … """), pero este visualizador todavía no los soporta.',
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

/** Lee un literal char ('x') que empieza en `inicio`: exactamente una unidad de contenido. */
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

/** Lee un literal numérico que empieza en `inicio` (apuntando a su primer dígito). */
export function leerNumero(fuente: string, inicio: number): NumeroLeido {
  if (fuente[inicio] === '0' && (fuente[inicio + 1] === 'x' || fuente[inicio + 1] === 'X')) {
    return leerBaseNoSoportada(fuente, inicio, DIGITO_HEX, 'literal-hexadecimal-no-soportado', 'hexadecimales (base 16)');
  }
  if (fuente[inicio] === '0' && (fuente[inicio + 1] === 'b' || fuente[inicio + 1] === 'B')) {
    return leerBaseNoSoportada(fuente, inicio, /[01]/, 'literal-binario-no-soportado', 'binarios (base 2)');
  }

  let cursor = inicio;
  while (cursor < fuente.length && (DIGITO_DECIMAL.test(fuente[cursor]) || fuente[cursor] === '_')) {
    cursor += 1;
  }

  const parecePuntoDecimal = fuente[cursor] === '.' && DIGITO_DECIMAL.test(fuente[cursor + 1] ?? '');
  const digitosTrasElCero = fuente.slice(inicio + 1, cursor).replace(/_/g, '');
  const pareceOctal =
    !parecePuntoDecimal &&
    fuente[inicio] === '0' &&
    digitosTrasElCero.length > 0 &&
    [...digitosTrasElCero].every((d) => DIGITO_OCTAL.test(d));

  if (pareceOctal) {
    return leerLiteralOctal(fuente, inicio, cursor);
  }

  let esDoble = parecePuntoDecimal;
  if (parecePuntoDecimal) {
    cursor += 1;
    while (cursor < fuente.length && (DIGITO_DECIMAL.test(fuente[cursor]) || fuente[cursor] === '_')) {
      cursor += 1;
    }
  }
  if (fuente[cursor] === 'e' || fuente[cursor] === 'E') {
    const finExponente = consumirExponente(fuente, cursor);
    if (finExponente > cursor) {
      esDoble = true;
      cursor = finExponente;
    }
  }

  if (fuente[cursor] === 'f' || fuente[cursor] === 'F') {
    const fin = cursor + 1;
    return {
      clase: 'doble',
      magnitud: 0n,
      valorDoble: 0,
      longitud: fin - inicio,
      noSoportado: {
        codigo: 'literal-float-no-soportado',
        nota: 'Java sí acepta el sufijo "f" (float), pero este visualizador solo soporta "double".',
        rango: { inicio, fin },
      },
    };
  }
  if (fuente[cursor] === 'd' || fuente[cursor] === 'D') {
    esDoble = true;
    cursor += 1;
  }

  if (esDoble) {
    const textoNumero = fuente.slice(inicio, cursor).replace(/_/g, '').replace(/[dD]$/, '');
    return { clase: 'doble', magnitud: 0n, valorDoble: Number(textoNumero), longitud: cursor - inicio };
  }

  const textoDigitos = fuente.slice(inicio, cursor).replace(/_/g, '');
  if (fuente[cursor] === 'l' || fuente[cursor] === 'L') {
    return {
      clase: 'largo',
      magnitud: BigInt(textoDigitos),
      valorDoble: 0,
      longitud: cursor + 1 - inicio,
    };
  }
  return { clase: 'entero', magnitud: BigInt(textoDigitos), valorDoble: 0, longitud: cursor - inicio };
}

// cursorE apunta a 'e'/'E'. Devuelve la posición tras el exponente, o cursorE si no hay uno real
// (p. ej. "1e" sin dígitos después: "e" no es parte del número, javac tampoco lo tomaría).
function consumirExponente(fuente: string, cursorE: number): number {
  let cursor = cursorE + 1;
  if (fuente[cursor] === '+' || fuente[cursor] === '-') cursor += 1;
  if (!DIGITO_DECIMAL.test(fuente[cursor] ?? '')) return cursorE;
  while (cursor < fuente.length && (DIGITO_DECIMAL.test(fuente[cursor]) || fuente[cursor] === '_')) {
    cursor += 1;
  }
  return cursor;
}

function leerLiteralOctal(fuente: string, inicio: number, finDigitos: number): NumeroLeido {
  let fin = finDigitos;
  if (fuente[fin] === 'l' || fuente[fin] === 'L') fin += 1;
  const textoOctal = fuente.slice(inicio + 1, finDigitos).replace(/_/g, '');
  const valorDecimal = Number.parseInt(textoOctal, 8);
  return {
    clase: 'entero',
    magnitud: 0n,
    valorDoble: 0,
    longitud: fin - inicio,
    noSoportado: {
      codigo: 'literal-octal-no-soportado',
      nota: `Java lo lee como octal: ${valorDecimal}`,
      rango: { inicio, fin },
    },
  };
}

function leerBaseNoSoportada(
  fuente: string,
  inicio: number,
  patronDigito: RegExp,
  codigo: string,
  descripcion: string,
): NumeroLeido {
  let cursor = inicio + 2;
  while (cursor < fuente.length && (patronDigito.test(fuente[cursor]) || fuente[cursor] === '_')) {
    cursor += 1;
  }
  if (fuente[cursor] === 'l' || fuente[cursor] === 'L') cursor += 1;
  return {
    clase: 'entero',
    magnitud: 0n,
    valorDoble: 0,
    longitud: cursor - inicio,
    noSoportado: {
      codigo,
      nota: `Java sí acepta literales enteros ${descripcion}, pero este visualizador todavía no los soporta.`,
      rango: { inicio, fin: cursor },
    },
  };
}
