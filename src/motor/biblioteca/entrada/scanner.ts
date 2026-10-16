// Tarea 2.12 (REQ-BIB-009, REQ-BIB-010, REQ-EJEC-010, design.md §4.6 y §3.2): `Scanner` sobre un búfer de entrada que puede recibir MÁS texto.
//
// Modo de uso desde el intérprete:
//   - `agregarEntrada(texto)` agrega lo que "teclea" el alumno (la entrada preparada de golpe, o un renglón a la vez si es interactivo). `cerrarEntrada()` marca el EOF.
//   - Si para decidir el resultado hace falta más entrada, la operación lanza `FaltaEntrada` SIN cambiar el estado visible (Java se bloquearía): el intérprete restaura la instantánea
//     (`capturar`/`restaurar`), pide el renglón y reintenta la sentencia entera.
//   - Con EOF se comporta como `java < archivo`: sin más tokens, `NoSuchElementException`.
// Las excepciones son las de Java con su mensaje y sus marcos (`crearExcepcion`, tabla del oráculo). `hasNext*` nunca consumen. Una lectura que falla por `InputMismatchException` deja el
// token sin consumir, pero sí consumió los separadores que lo precedían (así lo hace Java, y lo comprueba el conjunto de secuencias del oráculo).
import { crearExcepcion, type ExcepcionJava } from '../excepciones/excepcion-java.ts';
import { simbolosRegionales, type Regional, type SimbolosRegionales } from '../formato/regional.ts';
import { NoDisponibleEnEjecucion } from '../no-disponible.ts';
import { digitoDecimal } from '../texto/character.ts';
import { Double, Integer } from '../texto/envoltorios.ts';
import {
  clasificarDecimal,
  coincideBooleano,
  coincideEntero,
  primerCaracterDeToken,
  procesarDecimal,
  procesarEntero,
  ubicarRenglon,
  ubicarToken,
} from './tokens-scanner.ts';

/** Falta entrada para responder: el intérprete debe pedir otro renglón (o dar el EOF) y reintentar. No es una excepción de Java. */
export class FaltaEntrada extends Error {
  constructor() {
    super('Falta entrada para que el Scanner responda.');
    this.name = 'FaltaEntrada';
  }
}

/** Lo único que cambia entre una operación y otra (el texto del búfer solo crece y el EOF no se deshace), para tomar instantáneas baratas. */
export interface EstadoDelScanner {
  readonly cursor: number;
  readonly cerrado: boolean;
}

type OperacionDeLectura = 'nextInt' | 'nextDouble' | 'nextBoolean' | 'next' | 'nextLine';
type OperacionDeConsulta = 'hasNext' | 'hasNextInt' | 'hasNextDouble' | 'hasNextLine';

export class ScannerJava {
  private readonly simbolos: SimbolosRegionales;
  private texto = '';
  private cursor = 0;
  private cerrado = false;
  private eof = false;
  /** Java guarda el resultado de `hasNextLine()` y el `nextLine()` siguiente lo usa SIN revisar si el `Scanner` se cerró entre los dos. Cualquier otra operación lo borra. */
  private renglonEnCache: { readonly cursor: number; readonly fin: number; readonly siguiente: number } | null = null;

  constructor(regional: Regional) {
    this.simbolos = simbolosRegionales(regional);
  }

  agregarEntrada(texto: string): void {
    this.texto += texto;
  }

  /** El EOF: la entrada ya no crecerá (el alumno lo pidió, o la entrada preparada no es interactiva). */
  cerrarEntrada(): void {
    this.eof = true;
  }

  capturar(): EstadoDelScanner {
    return { cursor: this.cursor, cerrado: this.cerrado };
  }

  restaurar(estado: EstadoDelScanner): void {
    this.cursor = estado.cursor;
    this.cerrado = estado.cerrado;
    this.renglonEnCache = null;
  }

  /** Cuántos caracteres se han consumido (la vista de entrada de la interfaz marca hasta dónde llegó el `Scanner`). */
  get posicion(): number {
    return this.cursor;
  }

  close(): void {
    this.cerrado = true;
  }

  // ---- Lecturas ----

  next(): string {
    this.asegurarAbierto('next');
    const { inicio, fin } = this.tomarToken('next');
    this.cursor = fin;
    return this.texto.slice(inicio, fin);
  }

  nextInt(): number {
    this.asegurarAbierto('nextInt');
    const { inicio, fin } = this.tomarToken('nextInt');
    const token = this.texto.slice(inicio, fin);
    if (!coincideEntero(token, this.simbolos)) throw crearExcepcion('Scanner.nextInt/no-coincide', null);
    const valor = this.convertirEntero(token);
    if (valor === null) throw crearExcepcion('Scanner.nextInt/fuera-de-rango', `For input string: "${procesarEntero(token, this.simbolos)}"`);
    this.cursor = fin;
    return valor;
  }

  nextDouble(): number {
    this.asegurarAbierto('nextDouble');
    const { inicio, fin } = this.tomarToken('nextDouble');
    const token = this.texto.slice(inicio, fin);
    if (clasificarDecimal(token, this.simbolos) === 'ninguno') throw crearExcepcion('Scanner.nextDouble/no-coincide', null);
    const valor = this.convertirDecimal(token);
    if (typeof valor === 'string') throw crearExcepcion('Scanner.nextDouble/no-numerico', valor);
    this.cursor = fin;
    return valor;
  }

  nextBoolean(): boolean {
    this.asegurarAbierto('nextBoolean');
    const { inicio, fin } = this.tomarToken('nextBoolean');
    const token = this.texto.slice(inicio, fin);
    if (!coincideBooleano(token)) throw crearExcepcion('Scanner.nextBoolean/no-coincide', null);
    this.cursor = fin;
    return token.toLowerCase() === 'true';
  }

  nextLine(): string {
    const guardado = this.renglonEnCache;
    if (guardado !== null && guardado.cursor === this.cursor) {
      this.renglonEnCache = null;
      const linea = this.texto.slice(this.cursor, guardado.fin);
      this.cursor = guardado.siguiente;
      return linea;
    }
    this.asegurarAbierto('nextLine');
    this.renglonEnCache = null;
    const renglon = ubicarRenglon(this.texto, this.cursor, this.eof);
    if (renglon.tipo === 'incompleto') throw new FaltaEntrada();
    if (renglon.tipo === 'ninguno') throw crearExcepcion('Scanner.nextLine/sin-linea', 'No line found');
    const linea = this.texto.slice(this.cursor, renglon.fin);
    this.cursor = renglon.siguiente;
    return linea;
  }

  // ---- Consultas (no consumen) ----

  hasNext(): boolean {
    this.asegurarAbierto('hasNext');
    if (primerCaracterDeToken(this.texto, this.cursor) !== -1) return true;
    if (!this.eof) throw new FaltaEntrada();
    return false;
  }

  hasNextInt(): boolean {
    this.asegurarAbierto('hasNextInt');
    const token = this.espiarToken();
    return token !== null && coincideEntero(token, this.simbolos) && this.convertirEntero(token) !== null;
  }

  hasNextDouble(): boolean {
    this.asegurarAbierto('hasNextDouble');
    const token = this.espiarToken();
    if (token === null || clasificarDecimal(token, this.simbolos) === 'ninguno') return false;
    return typeof this.convertirDecimal(token) === 'number';
  }

  hasNextLine(): boolean {
    this.asegurarAbierto('hasNextLine');
    this.renglonEnCache = null;
    const renglon = ubicarRenglon(this.texto, this.cursor, this.eof);
    if (renglon.tipo === 'incompleto') throw new FaltaEntrada();
    if (renglon.tipo === 'ninguno') return false;
    this.renglonEnCache = { cursor: this.cursor, fin: renglon.fin, siguiente: renglon.siguiente };
    return true;
  }

  // ---- Internos ----

  private asegurarAbierto(operacion: OperacionDeLectura | OperacionDeConsulta): void {
    if (this.cerrado) throw crearExcepcion(`Scanner.${operacion}/cerrado`, 'Scanner closed');
    if (operacion !== 'nextLine' && operacion !== 'hasNextLine') this.renglonEnCache = null;
  }

  /**
   * El siguiente token completo. Como en Java, los separadores que lo preceden se consumen aunque la lectura falle después; el token mismo solo se consume al tener éxito
   * (lo hace cada operación). Si no hay token y la entrada terminó, lanza `NoSuchElementException` (después de consumir los separadores).
   */
  private tomarToken(operacion: Exclude<OperacionDeLectura, 'nextLine'>): { inicio: number; fin: number } {
    const ubicacion = ubicarToken(this.texto, this.cursor, this.eof);
    if (ubicacion.tipo === 'incompleto') throw new FaltaEntrada();
    if (ubicacion.tipo === 'vacio') {
      this.cursor = this.texto.length;
      throw crearExcepcion(`Scanner.${operacion}/sin-token`, null);
    }
    this.cursor = ubicacion.inicio;
    return ubicacion;
  }

  /** Para `hasNextInt`/`hasNextDouble`: el siguiente token completo SIN consumir nada, o `null` si ya no hay. */
  private espiarToken(): string | null {
    const ubicacion = ubicarToken(this.texto, this.cursor, this.eof);
    if (ubicacion.tipo === 'incompleto') throw new FaltaEntrada();
    return ubicacion.tipo === 'token' ? this.texto.slice(ubicacion.inicio, ubicacion.fin) : null;
  }

  /** El `int` del token, o `null` si el token tiene forma de entero pero no cabe en un `int`. */
  private convertirEntero(token: string): number | null {
    try {
      return Integer.parseInt(procesarEntero(token, this.simbolos));
    } catch (error) {
      if (esExcepcionDeFormato(error)) return null;
      throw error;
    }
  }

  /** El `double` del token, o el mensaje de la `NumberFormatException` si `Double.parseDouble` lo rechaza (pasa con `+∞`, por ejemplo). */
  private convertirDecimal(token: string): number | string {
    try {
      return Double.parseDouble(procesarDecimal(token, digitoDecimal, this.simbolos));
    } catch (error) {
      if (error instanceof NoDisponibleEnEjecucion) throw error;
      if (esExcepcionDeFormato(error)) return error.mensaje ?? '';
      throw error;
    }
  }
}

function esExcepcionDeFormato(error: unknown): error is ExcepcionJava {
  return typeof error === 'object' && error !== null && 'clase' in error && (error as ExcepcionJava).clase === 'java.lang.NumberFormatException';
}
