// Tarea 2.8 (REQ-BIB-003, REQ-BIB-010, design.md §4.3): `printf` y `String.format` REDUCIDOS. Se reescribe desde la documentación pública de `java.util.Formatter`, sin copiar código
// (ADR 016), y lo valida `corpus/datos/printf/` (miles de casos del JDK 17 real, es-MX y es-ES).
//
//  - Alcance: `%d %s %f %.Nf %c %b %n %%`, ancho, precisión y las banderas `-`, `0`, `,`. Lo demás que Java acepta (`%e %x %o %g`, `+ ( # espacio`, `1$`, `%S`…) es «No disponible»
//    (`NoDisponibleEnEjecucion`): el compilador lo avisa con `formatoSoportado` cuando el patrón es literal, y en ejecución se detiene en vez de imprimir un valor sin verificar.
//  - Lo que Java RECHAZA se rechaza igual, con su excepción, su mensaje y sus marcos: primero se analiza TODO el patrón (los errores de patrón salen antes de imprimir nada, en orden), y
//    luego se consumen los argumentos (los errores de argumentos salen al llegar a cada especificador). Una combinación de falla que el oráculo no midió también es «No disponible».
//  - `%f` usa los dígitos de `Double.toString` (`digitosJava`) y redondea HALF_UP mirando UN solo dígito: `%.2f` de 2.675 es `2.68`. Jamás `toFixed`.
//  - Los separadores de miles y decimal vienen del modelo regional (`es-MX` por omisión, `es-ES` con la opción «coma»); `%s` de un `double` usa `Double.toString` y siempre lleva punto.
import { crearExcepcion, existeSitio } from '../excepciones/excepcion-java.ts';
import { NoDisponibleEnEjecucion } from '../no-disponible.ts';
import { type TipoImprimible, type ValorImprimible, valorATexto } from '../salida/print-stream.ts';
import { digitosJava } from './digitos-java.ts';
import { type Regional, type SimbolosRegionales, simbolosRegionales } from './regional.ts';

export interface ArgumentoDeFormato {
  readonly tipo: TipoImprimible;
  readonly valor: ValorImprimible;
}

/** Por qué puerta entra el formato: cambia los marcos de pila de las excepciones (`String.format` o `System.out.printf`). */
export type ViaDeFormato = 'String.format' | 'printf';

export type PiezaDeFormato =
  | { readonly tipo: 'literal'; readonly texto: string }
  | { readonly tipo: 'especificador'; readonly especificador: string; readonly texto: string };

const FIN_DE_LINEA = '\n';
const BANDERAS_VALIDAS = '-#+ 0,(<';
const BANDERAS_DEL_ALCANCE = '-0,';
const CONVERSIONES_DEL_ALCANCE = 'dsfcbn%';
/** Conversiones que `java.util.Formatter` reconoce (las demás letras son `UnknownFormatConversionException`). */
const CONVERSIONES_DE_JAVA = 'bBhHsScCdoxXeEfgGaAtTn%';
const ORDEN_CANONICO_DE_BANDERAS = '-#+ 0,(<';
const NOMBRE_DE_CLASE: Readonly<Record<TipoImprimible, string>> = {
  int: 'java.lang.Integer',
  long: 'java.lang.Long',
  double: 'java.lang.Double',
  char: 'java.lang.Character',
  boolean: 'java.lang.Boolean',
  String: 'java.lang.String',
};

// ---- Análisis del patrón ----

interface Especificador {
  readonly tipo: 'especificador';
  /** El especificador tal como lo escribió el programador (para el aviso del compilador). */
  readonly original: string;
  /** El especificador canónico (`%-5.2f`): lo que Java pone en los mensajes. */
  readonly canonico: string;
  readonly banderas: string;
  readonly ancho: number;
  readonly precision: number;
  readonly conversion: string;
  readonly fueraDeAlcance: boolean;
}

interface Literal {
  readonly tipo: 'literal';
  readonly texto: string;
}

/** Un fallo de patrón que Java detecta al analizarlo, con el sitio de la tabla de marcos que le toca. */
interface FalloDePatron {
  readonly tipo: 'fallo';
  readonly clase: 'desconocida' | 'otro';
  /** `modo` del sitio, sin la puerta: la ponemos al lanzar (`Formatter/<modo>@<via>`). */
  readonly modo: string;
  readonly mensaje: string;
}

type ElementoDePatron = Literal | Especificador | FalloDePatron;

const esDigito = (c: string | undefined): boolean => c !== undefined && c >= '0' && c <= '9';
const esLetra = (c: string | undefined): boolean => c !== undefined && ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'));

function banderasCanonicas(banderas: string): string {
  return [...ORDEN_CANONICO_DE_BANDERAS].filter((bandera) => banderas.includes(bandera)).join('');
}

function falloUnknown(caracter: string, modo: string): FalloDePatron {
  return { tipo: 'fallo', clase: 'desconocida', modo, mensaje: `Conversion = '${caracter}'` };
}

/**
 * Recorre el patrón como `java.util.Formatter`: `%[índice$][banderas][ancho][.precisión]conversión`. Se detiene en el PRIMER fallo (Java lanza ahí) y deja el elemento `fallo` al final.
 * Los especificadores válidos en Java pero fuera del alcance quedan marcados `fueraDeAlcance` y NO se les aplican las revisiones (no sabemos qué diría Java de sus banderas).
 */
function analizarPatron(formato: string): ElementoDePatron[] {
  const elementos: ElementoDePatron[] = [];
  let i = 0;
  while (i < formato.length) {
    if (formato[i] !== '%') {
      const siguiente = formato.indexOf('%', i);
      const fin = siguiente === -1 ? formato.length : siguiente;
      elementos.push({ tipo: 'literal', texto: formato.slice(i, fin) });
      i = fin;
      continue;
    }
    const inicio = i;
    let j = i + 1;
    let fueraDeAlcance = false;
    // Índice de argumento (`1$`): válido en Java, fuera del alcance.
    let k = j;
    while (esDigito(formato[k])) k += 1;
    if (k > j && formato[k] === '$') {
      fueraDeAlcance = true;
      j = k + 1;
    }
    let banderas = '';
    while (j < formato.length && BANDERAS_VALIDAS.includes(formato[j] as string)) {
      const bandera = formato[j] as string;
      if (banderas.includes(bandera)) {
        elementos.push({ tipo: 'fallo', clase: 'otro', modo: 'bandera-repetida', mensaje: `Flags = '${bandera}'` });
        return elementos;
      }
      banderas += bandera;
      j += 1;
    }
    const inicioDelAncho = j;
    while (esDigito(formato[j])) j += 1;
    const ancho = j > inicioDelAncho ? Number(formato.slice(inicioDelAncho, j)) : -1;
    let precision = -1;
    let precisionSinDigitos = false;
    if (formato[j] === '.') {
      const inicioDeLaPrecision = j + 1;
      j += 1;
      while (esDigito(formato[j])) j += 1;
      if (j === inicioDeLaPrecision) precisionSinDigitos = true;
      else precision = Number(formato.slice(inicioDeLaPrecision, j));
    }
    const conversion = formato[j];
    let fechaYHora = false;
    if (!precisionSinDigitos && (conversion === 't' || conversion === 'T')) {
      // Fecha y hora (`%tY`): válido en Java, fuera del alcance; la letra que sigue es la del campo y no se revisa.
      fueraDeAlcance = true;
      fechaYHora = true;
      j += 1;
      if (esLetra(formato[j])) j += 1;
    }
    if (precisionSinDigitos || conversion === undefined || !(esLetra(conversion) || conversion === '%') || (fechaYHora && !esLetra(formato[j - 1]))) {
      const primero = formato[inicio + 1];
      elementos.push(primero === undefined ? falloUnknown('%', 'conversion-desconocida-al-final') : falloUnknown(primero, 'especificador-incompleto'));
      return elementos;
    }
    if (!fechaYHora) j += 1;
    if (!fechaYHora && !CONVERSIONES_DE_JAVA.includes(conversion)) {
      elementos.push(falloUnknown(conversion, 'conversion-desconocida'));
      return elementos;
    }
    if (!CONVERSIONES_DEL_ALCANCE.includes(conversion) || [...banderas].some((bandera) => !BANDERAS_DEL_ALCANCE.includes(bandera))) fueraDeAlcance = true;
    const canonico = `%${banderasCanonicas(banderas)}${ancho === -1 ? '' : ancho}${precision === -1 ? '' : `.${precision}`}${conversion}`;
    const especificador: Especificador = { tipo: 'especificador', original: formato.slice(inicio, j), canonico, banderas, ancho, precision, conversion, fueraDeAlcance };
    const fallo = fueraDeAlcance ? null : revisarEspecificador(especificador);
    elementos.push(especificador);
    if (fallo !== null) {
      elementos.push(fallo);
      return elementos;
    }
    i = j;
  }
  return elementos;
}

/** Las revisiones que Java hace al CONSTRUIR cada especificador (antes de imprimir): ancho que falta, banderas incompatibles, precisión ilegal. `null` si está bien. */
function revisarEspecificador(e: Especificador): FalloDePatron | null {
  const tiene = (bandera: string): boolean => e.banderas.includes(bandera);
  const faltaAncho = (modo: string): FalloDePatron => ({ tipo: 'fallo', clase: 'otro', modo, mensaje: e.canonico });
  const precisionIlegal = (modo: string): FalloDePatron => ({ tipo: 'fallo', clase: 'otro', modo, mensaje: String(e.precision) });
  const incompatible = (modo: string, bandera: string): FalloDePatron => ({ tipo: 'fallo', clase: 'otro', modo, mensaje: `Conversion = ${e.conversion}, Flags = ${bandera}` });
  switch (e.conversion) {
    case 's':
    case 'b': {
      if (tiene('-') && e.ancho === -1) return faltaAncho('falta-ancho-general');
      const mala = ['0', ','].find(tiene);
      return mala === undefined ? null : incompatible('bandera-incompatible-general', mala);
    }
    case 'c': {
      const mala = ['0', ','].find(tiene);
      if (mala !== undefined) return incompatible('bandera-incompatible-caracter', mala);
      if (tiene('-') && e.ancho === -1) return faltaAncho('falta-ancho-caracter');
      return e.precision === -1 ? null : precisionIlegal('precision-con-c');
    }
    case 'd':
    case 'f': {
      const sufijo = e.conversion === 'd' ? 'entero' : 'decimal';
      if (e.ancho === -1 && (tiene('-') || tiene('0'))) return faltaAncho(`falta-ancho-${sufijo}`);
      if (tiene('-') && tiene('0')) return { tipo: 'fallo', clase: 'otro', modo: `banderas-ilegales-${sufijo}`, mensaje: `Flags = '${banderasCanonicas(e.banderas)}'` };
      return e.conversion === 'd' && e.precision !== -1 ? precisionIlegal('precision-con-d') : null;
    }
    default:
      // `%n` y `%%`: Java también revisa sus banderas y su ancho, pero esos sitios no se midieron.
      return e.conversion === 'n' && (e.ancho !== -1 || e.precision !== -1 || e.banderas !== '') ? { tipo: 'fallo', clase: 'otro', modo: 'sin-medir', mensaje: '' } : null;
  }
}

function lanzarFallo(fallo: FalloDePatron, via: ViaDeFormato): never {
  const sitio = `Formatter/${fallo.modo}@${via}`;
  if (!existeSitio(sitio)) throw new NoDisponibleEnEjecucion('formato-fuera-de-alcance', fallo.mensaje);
  throw crearExcepcion(sitio, fallo.mensaje);
}

// ---- Impresión ----

function justificar(texto: string, ancho: number, izquierda: boolean): string {
  if (ancho === -1 || texto.length >= ancho) return texto;
  return izquierda ? texto + ' '.repeat(ancho - texto.length) : ' '.repeat(ancho - texto.length) + texto;
}

function agrupar(digitos: string, separador: string): string {
  let resultado = '';
  for (let i = 0; i < digitos.length; i++) {
    if (i > 0 && (digitos.length - i) % 3 === 0) resultado += separador;
    resultado += digitos[i];
  }
  return resultado;
}

/** Signo, ceros de relleno (sin agrupar) y cuerpo, hasta el ancho pedido; con `-` el relleno de espacios va a la derecha. */
function componerNumero(signo: string, cuerpo: string, e: Especificador): string {
  const conCeros = e.banderas.includes('0') && e.ancho !== -1;
  const ceros = conCeros ? Math.max(0, e.ancho - signo.length - cuerpo.length) : 0;
  return justificar(signo + '0'.repeat(ceros) + cuerpo, e.ancho, e.banderas.includes('-'));
}

function imprimirEntero(valor: number | bigint, e: Especificador, simbolos: SimbolosRegionales): string {
  const entero = BigInt(valor);
  const digitos = (entero < 0n ? -entero : entero).toString();
  const cuerpo = e.banderas.includes(',') ? agrupar(digitos, simbolos.miles) : digitos;
  return componerNumero(entero < 0n ? simbolos.menos : '', cuerpo, e);
}

/** El entero y la fracción de `|x|` con `precision` decimales, HALF_UP mirando un solo dígito de los de `Double.toString`. */
function redondearADecimales(x: number, precision: number): { entera: string; fraccion: string } {
  let cifras: string;
  if (x === 0) {
    cifras = '0';
  } else {
    const { digitos, exponente } = digitosJava(x);
    const conservados = exponente + 1 + precision;
    if (conservados < 0) cifras = '0';
    else if (conservados === 0) cifras = (digitos[0] as string) >= '5' ? '1' : '0';
    else if (conservados >= digitos.length) cifras = digitos.padEnd(conservados, '0');
    else {
      const base = digitos.slice(0, conservados);
      cifras = (digitos[conservados] as string) >= '5' ? (BigInt(base) + 1n).toString() : base;
    }
  }
  const completas = cifras.padStart(precision + 1, '0');
  return { entera: completas.slice(0, completas.length - precision), fraccion: completas.slice(completas.length - precision) };
}

function imprimirDecimal(x: number, e: Especificador, simbolos: SimbolosRegionales): string {
  if (Number.isNaN(x)) return justificar('NaN', e.ancho, e.banderas.includes('-'));
  const negativo = x < 0 || Object.is(x, -0);
  if (!Number.isFinite(x)) return justificar(negativo ? `${simbolos.menos}Infinity` : 'Infinity', e.ancho, e.banderas.includes('-'));
  const precision = e.precision === -1 ? 6 : e.precision;
  const { entera, fraccion } = redondearADecimales(Math.abs(x), precision);
  const parteEntera = e.banderas.includes(',') ? agrupar(entera, simbolos.miles) : entera;
  const cuerpo = precision === 0 ? parteEntera : `${parteEntera}${simbolos.decimal}${fraccion}`;
  return componerNumero(negativo ? simbolos.menos : '', cuerpo, e);
}

function imprimirTexto(texto: string, e: Especificador): string {
  const recortado = e.precision !== -1 && e.precision < texto.length ? texto.slice(0, e.precision) : texto;
  return justificar(recortado, e.ancho, e.banderas.includes('-'));
}

function incompatible(e: Especificador, argumento: ArgumentoDeFormato, via: ViaDeFormato): never {
  const sitio = `Formatter/conversion-incompatible-${e.conversion}@${via}`;
  const mensaje = `${e.conversion} != ${NOMBRE_DE_CLASE[argumento.tipo]}`;
  if (!existeSitio(sitio)) throw new NoDisponibleEnEjecucion('formato-fuera-de-alcance', mensaje);
  throw crearExcepcion(sitio, mensaje);
}

function imprimirEspecificador(e: Especificador, argumento: ArgumentoDeFormato, regional: Regional, via: ViaDeFormato): string {
  const simbolos = simbolosRegionales(regional);
  switch (e.conversion) {
    case 'd':
      if (argumento.tipo !== 'int' && argumento.tipo !== 'long') return incompatible(e, argumento, via);
      return imprimirEntero(argumento.valor as number | bigint, e, simbolos);
    case 'f':
      if (argumento.tipo !== 'double') return incompatible(e, argumento, via);
      return imprimirDecimal(argumento.valor as number, e, simbolos);
    case 's':
      return imprimirTexto(valorATexto(argumento.tipo, argumento.valor), e);
    case 'b': {
      const verdadero = argumento.tipo === 'boolean' ? argumento.valor === true : !(argumento.tipo === 'String' && argumento.valor === null);
      return imprimirTexto(verdadero ? 'true' : 'false', e);
    }
    default: {
      // 'c'
      if (argumento.tipo === 'char') return justificar(String.fromCharCode(argumento.valor as number), e.ancho, e.banderas.includes('-'));
      if (argumento.tipo !== 'int') return incompatible(e, argumento, via);
      const punto = argumento.valor as number;
      if (punto < 0 || punto > 0x10ffff) {
        const sitio = `Formatter/punto-de-codigo-invalido@${via}`;
        const mensaje = `Code point = 0x${(punto >>> 0).toString(16)}`;
        if (!existeSitio(sitio)) throw new NoDisponibleEnEjecucion('formato-fuera-de-alcance', mensaje);
        throw crearExcepcion(sitio, mensaje);
      }
      return justificar(String.fromCodePoint(punto), e.ancho, e.banderas.includes('-'));
    }
  }
}

// ---- API ----

/**
 * `String.format(formato, argumentos)` / `printf` en piezas: cada literal y cada especificador con su texto ya formateado (la plantilla 21 de la interfaz explica cada especificador por
 * separado). Lanza `ExcepcionJava` (lo que Java lanza) o `NoDisponibleEnEjecucion` (fuera del alcance verificado).
 */
export function formatearEnPiezas(formato: string, argumentos: readonly ArgumentoDeFormato[], regional: Regional, via: ViaDeFormato): PiezaDeFormato[] {
  const elementos = analizarPatron(formato);
  const fallo = elementos.find((elemento): elemento is FalloDePatron => elemento.tipo === 'fallo');
  if (fallo !== undefined) lanzarFallo(fallo, via);
  const especificadores = elementos.filter((elemento): elemento is Especificador => elemento.tipo === 'especificador');
  const fuera = especificadores.find((e) => e.fueraDeAlcance);
  if (fuera !== undefined) throw new NoDisponibleEnEjecucion('formato-fuera-de-alcance', fuera.original);

  const piezas: PiezaDeFormato[] = [];
  let siguienteArgumento = 0;
  for (const elemento of elementos) {
    if (elemento.tipo === 'literal') {
      piezas.push({ tipo: 'literal', texto: elemento.texto });
      continue;
    }
    const e = elemento as Especificador;
    if (e.conversion === 'n') {
      piezas.push({ tipo: 'especificador', especificador: e.original, texto: FIN_DE_LINEA });
    } else if (e.conversion === '%') {
      piezas.push({ tipo: 'especificador', especificador: e.original, texto: justificar('%', e.ancho, e.banderas.includes('-')) });
    } else {
      const argumento = argumentos[siguienteArgumento];
      siguienteArgumento += 1;
      if (argumento === undefined) {
        const sitio = `Formatter/falta-argumento@${via}`;
        if (!existeSitio(sitio)) throw new NoDisponibleEnEjecucion('formato-fuera-de-alcance', e.canonico);
        throw crearExcepcion(sitio, `Format specifier '${e.canonico}'`);
      }
      piezas.push({ tipo: 'especificador', especificador: e.original, texto: imprimirEspecificador(e, argumento, regional, via) });
    }
  }
  return piezas;
}

/** `String.format(formato, argumentos)`: el texto completo. */
export function formatear(formato: string, argumentos: readonly ArgumentoDeFormato[], regional: Regional, via: ViaDeFormato): string {
  return formatearEnPiezas(formato, argumentos, regional, via)
    .map((pieza) => pieza.texto)
    .join('');
}

export type FormatoSoportado = { readonly soportado: true } | { readonly soportado: false; readonly especificador: string };

/**
 * Para el compilador, con un patrón LITERAL (REQ-SUB-005/007): ¿todos sus especificadores están en el alcance? Si no, dice cuál es el primero que no, para el aviso honesto «No disponible».
 * Un patrón que Java rechazaría al ejecutar (`%i`, `%.2d`) NO se considera fuera del alcance: el motor reproduce la excepción de Java en ejecución.
 */
export function formatoSoportado(formato: string): FormatoSoportado {
  const fuera = analizarPatron(formato).find((elemento): elemento is Especificador => elemento.tipo === 'especificador' && elemento.fueraDeAlcance);
  return fuera === undefined ? { soportado: true } : { soportado: false, especificador: fuera.original };
}

