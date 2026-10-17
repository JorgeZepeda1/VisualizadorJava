// Tarea 2.12 (REQ-BIB-009, REQ-BIB-010, REQ-EJEC-010, design.md §4.6 y §3.2): `Scanner` sobre la entrada del programa (`EntradaDelPrograma`), un búfer que puede recibir MÁS texto.
//
// Modo de uso desde el intérprete (hito 1, parte C: el texto, el cursor y el EOF son los de la `EntradaDelPrograma` que maneja el intérprete, no un búfer propio):
//   - El intérprete agrega a la entrada lo que "teclea" el alumno (la entrada preparada de golpe, o un renglón a la vez si es interactivo) y la cierra (`cerrar()`) al llegar el EOF.
//   - Si para decidir el resultado hace falta más entrada, la operación lanza `FaltaEntrada` SIN cambiar el estado visible (Java se bloquearía): el intérprete restaura su instantánea
//     (el cursor de la entrada y `capturar`/`restaurar` de cada objeto), pide el renglón y reintenta la sentencia entera.
//   - Con la entrada cerrada se comporta como `java < archivo`: sin más tokens, `NoSuchElementException`.
// Las excepciones son las de Java con su mensaje y sus marcos (`crearExcepcion`, tabla del oráculo). `hasNext*` nunca consumen. Una lectura que falla por `InputMismatchException` deja el
// token sin consumir, pero sí consumió los separadores que lo precedían (así lo hace Java, y lo comprueba el conjunto de secuencias del oráculo).
import { crearExcepcion, type ExcepcionJava } from '../excepciones/excepcion-java.ts';
import type { EntradaDelPrograma } from './entrada-del-programa.ts';
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

/** Lo único del `Scanner` mismo que cambia entre una operación y otra: si lo cerraron. El texto, el cursor y el EOF son de la entrada del programa, y su instantánea es del intérprete. */
export interface EstadoDelScanner {
  readonly cerrado: boolean;
}

type OperacionDeLectura = 'nextInt' | 'nextDouble' | 'nextBoolean' | 'next' | 'nextLine';
type OperacionDeConsulta = 'hasNext' | 'hasNextInt' | 'hasNextDouble' | 'hasNextLine';

export class ScannerJava {
  /** Así viaja en la traza (`{ objeto: 'Scanner' }`) y así lo reconoce la instantánea del reintento. */
  readonly claseJava = 'Scanner' as const;
  private readonly simbolos: SimbolosRegionales;
  private readonly entrada: EntradaDelPrograma;
  private cerrado = false;
  /** Java guarda el resultado de `hasNextLine()` y el `nextLine()` siguiente lo usa SIN revisar si el `Scanner` se cerró entre los dos. Cualquier otra operación lo borra. */
  private renglonEnCache: { readonly cursor: number; readonly fin: number; readonly siguiente: number } | null = null;

  constructor(regional: Regional, entrada: EntradaDelPrograma) {
    this.simbolos = simbolosRegionales(regional);
    this.entrada = entrada;
  }

  capturar(): EstadoDelScanner {
    return { cerrado: this.cerrado };
  }

  restaurar(estado: EstadoDelScanner): void {
    this.cerrado = estado.cerrado;
    this.renglonEnCache = null;
  }

  close(): void {
    this.cerrado = true;
  }

  // ---- Lecturas ----

  next(): string {
    this.asegurarAbierto('next');
    const { inicio, fin } = this.tomarToken('next');
    this.entrada.cursor = fin;
    return this.entrada.texto.slice(inicio, fin);
  }

  nextInt(): number {
    this.asegurarAbierto('nextInt');
    const { inicio, fin } = this.tomarToken('nextInt');
    const token = this.entrada.texto.slice(inicio, fin);
    if (!coincideEntero(token, this.simbolos)) throw crearExcepcion('Scanner.nextInt/no-coincide', null);
    const valor = this.convertirEntero(token);
    if (valor === null) throw crearExcepcion('Scanner.nextInt/fuera-de-rango', `For input string: "${procesarEntero(token, this.simbolos)}"`);
    this.entrada.cursor = fin;
    return valor;
  }

  nextDouble(): number {
    this.asegurarAbierto('nextDouble');
    const { inicio, fin } = this.tomarToken('nextDouble');
    const token = this.entrada.texto.slice(inicio, fin);
    if (clasificarDecimal(token, this.simbolos) === 'ninguno') throw crearExcepcion('Scanner.nextDouble/no-coincide', null);
    const valor = this.convertirDecimal(token);
    if (typeof valor === 'string') throw crearExcepcion('Scanner.nextDouble/no-numerico', valor);
    this.entrada.cursor = fin;
    return valor;
  }

  nextBoolean(): boolean {
    this.asegurarAbierto('nextBoolean');
    const { inicio, fin } = this.tomarToken('nextBoolean');
    const token = this.entrada.texto.slice(inicio, fin);
    if (!coincideBooleano(token)) throw crearExcepcion('Scanner.nextBoolean/no-coincide', null);
    this.entrada.cursor = fin;
    return token.toLowerCase() === 'true';
  }

  nextLine(): string {
    const guardado = this.renglonEnCache;
    if (guardado !== null && guardado.cursor === this.entrada.cursor) {
      this.renglonEnCache = null;
      const linea = this.entrada.texto.slice(this.entrada.cursor, guardado.fin);
      this.entrada.cursor = guardado.siguiente;
      return linea;
    }
    this.asegurarAbierto('nextLine');
    this.renglonEnCache = null;
    const renglon = ubicarRenglon(this.entrada.texto, this.entrada.cursor, this.entrada.cerrada);
    if (renglon.tipo === 'incompleto') throw new FaltaEntrada();
    if (renglon.tipo === 'ninguno') throw crearExcepcion('Scanner.nextLine/sin-linea', 'No line found');
    const linea = this.entrada.texto.slice(this.entrada.cursor, renglon.fin);
    this.entrada.cursor = renglon.siguiente;
    return linea;
  }

  // ---- Consultas (no consumen) ----

  hasNext(): boolean {
    this.asegurarAbierto('hasNext');
    if (primerCaracterDeToken(this.entrada.texto, this.entrada.cursor) !== -1) return true;
    if (!this.entrada.cerrada) throw new FaltaEntrada();
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
    const renglon = ubicarRenglon(this.entrada.texto, this.entrada.cursor, this.entrada.cerrada);
    if (renglon.tipo === 'incompleto') throw new FaltaEntrada();
    if (renglon.tipo === 'ninguno') return false;
    this.renglonEnCache = { cursor: this.entrada.cursor, fin: renglon.fin, siguiente: renglon.siguiente };
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
    const ubicacion = ubicarToken(this.entrada.texto, this.entrada.cursor, this.entrada.cerrada);
    if (ubicacion.tipo === 'incompleto') throw new FaltaEntrada();
    if (ubicacion.tipo === 'vacio') {
      this.entrada.cursor = this.entrada.texto.length;
      throw crearExcepcion(`Scanner.${operacion}/sin-token`, null);
    }
    this.entrada.cursor = ubicacion.inicio;
    return ubicacion;
  }

  /** Para `hasNextInt`/`hasNextDouble`: el siguiente token completo SIN consumir nada, o `null` si ya no hay. */
  private espiarToken(): string | null {
    const ubicacion = ubicarToken(this.entrada.texto, this.entrada.cursor, this.entrada.cerrada);
    if (ubicacion.tipo === 'incompleto') throw new FaltaEntrada();
    return ubicacion.tipo === 'token' ? this.entrada.texto.slice(ubicacion.inicio, ubicacion.fin) : null;
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
