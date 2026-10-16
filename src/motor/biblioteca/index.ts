// Contrato de la biblioteca de Java (hito 1, parte A; design.md §4 «contrato de la biblioteca (hito 1)»): la ÚNICA puerta por la que el intérprete usa las funciones puras que reproducen la
// salida de Java 17. Todo es TypeScript puro (ADR 001: sin DOM, sin Node, sin dependencias npm) y cada pieza se compara contra el JDK 17.0.18 real (`pruebas/diferencial/biblioteca/`).
//
// Reglas comunes:
//  - Lo que Java LANZA sale como `ExcepcionJava` (clase, mensaje, marcos de java.base de la tabla del oráculo); el intérprete la vuelve el paso final `excepcion` y con `formatearTrazaDePila`
//    arma el `stderr` exacto. Cualquier otra excepción de JavaScript es un `error-interno`.
//  - Lo que Java hace pero no está verificado al 100 % contra el JDK sale como `NoDisponibleEnEjecucion` (aviso «No disponible», nunca un valor inventado).
//  - `Scanner` no bloquea: si falta entrada lanza `FaltaEntrada` y el intérprete reintenta la sentencia (design.md §3.2).
//  - Valores: `int`/`char`/`double` son `number`, `long` es `bigint`, `boolean` es `boolean`, `String` es `CadenaJava` (identidad) o `string` donde no importa la identidad.
export { digitosJava, type DigitosJava } from './formato/digitos-java.ts';
export { doubleATexto } from './formato/double-a-texto.ts';
export {
  type ArgumentoDeFormato,
  type FormatoSoportado,
  type PiezaDeFormato,
  type ViaDeFormato,
  formatear,
  formatearEnPiezas,
  formatoSoportado,
} from './formato/formateador.ts';
export { type Regional, type SimbolosRegionales, simbolosRegionales } from './formato/regional.ts';

export { CodificadorDeSalida } from './salida/codificacion-jvm.ts';
export { FIN_DE_LINEA, FlujoDeSalida, type TipoImprimible, type ValorImprimible, valorATexto } from './salida/print-stream.ts';

export { EntradaDelPrograma } from './entrada/entrada-del-programa.ts';
export { type EstadoDelScanner, FaltaEntrada, ScannerJava } from './entrada/scanner.ts';

export { CadenaJava, PoolDeCadenas, nuevaCadena } from './texto/cadena-java.ts';
export { StringJava } from './texto/string.ts';
export { digitoDecimal, isDigit, isLetter, isLetterOrDigit, isLowerCase, isUpperCase, isWhitespace, toLowerCase, toUpperCase } from './texto/character.ts';
export { Double, Integer, Long, recortarComoJava } from './texto/envoltorios.ts';

export { MathJava, longAFloat } from './matematicas/math.ts';
export { potenciaDeDos } from './numeros/potencia-de-dos.ts';

export { RandomJava } from './aleatorio/random.ts';
export { type EstadoDeLaFuente, FuenteDeAleatorios } from './aleatorio/semillas.ts';

export { type SitioDeExcepcion, ExcepcionJava, crearExcepcion, divisionEntreCero, existeSitio } from './excepciones/excepcion-java.ts';
export { type MarcoDelAlumno, formatearMarcos, formatearTrazaDePila, textoDeLaExcepcion } from './excepciones/traza-de-pila.ts';
export { type MotivoNoDisponible, NoDisponibleEnEjecucion } from './no-disponible.ts';
