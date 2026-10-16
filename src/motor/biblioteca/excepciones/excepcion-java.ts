// Tarea 2.14 (REQ-EJEC-006 biblioteca, design.md §3.6): una excepción de Java que la biblioteca lanza. La CLASE y los MARCOS de java.base no se escriben a mano: salen de la tabla
// `sitio → (clase, marcos)` que el oráculo generó corriendo programas reales en el JDK 17.0.18 (`datos/marcos-de-pila.generado.ts`, ADR 010). El MENSAJE lo arma quien lanza (depende
// de los argumentos: `begin 5, end 3, length 3`). El intérprete atrapa esta clase y la vuelve el paso final `excepcion`; cualquier otra excepción de JS es `error-interno`.
import { MARCOS_DE_PILA_GENERADOS, type SitioDeExcepcion } from '../datos/marcos-de-pila.generado.ts';

export type { SitioDeExcepcion };

const FILAS_POR_SITIO: ReadonlyMap<SitioDeExcepcion, { readonly clase: string; readonly marcos: readonly string[] }> = new Map(
  MARCOS_DE_PILA_GENERADOS.map(([sitio, clase, marcos]) => [sitio, { clase, marcos }] as const),
);

export class ExcepcionJava extends Error {
  /** Nombre calificado de la clase (`java.util.InputMismatchException`). */
  readonly clase: string;
  /** El mensaje de Java; `null` si la excepción no lleva (`InputMismatchException` de `nextInt`). */
  readonly mensaje: string | null;
  /** Dónde se lanzó (la clave de la tabla de marcos). */
  readonly sitio: SitioDeExcepcion;
  /** Los marcos de `java.base` que Java imprime antes del marco del alumno, del más interno al más externo. */
  readonly marcos: readonly string[];

  constructor(sitio: SitioDeExcepcion, clase: string, mensaje: string | null, marcos: readonly string[]) {
    super(mensaje === null ? clase : `${clase}: ${mensaje}`);
    this.name = 'ExcepcionJava';
    this.sitio = sitio;
    this.clase = clase;
    this.mensaje = mensaje;
    this.marcos = marcos;
  }
}

/** ¿El oráculo midió este sitio? Para los que se arman con piezas (`Formatter/…@printf`): si la combinación no se midió, el que llama responde «No disponible» en vez de adivinar marcos. */
export function existeSitio(sitio: string): sitio is SitioDeExcepcion {
  return FILAS_POR_SITIO.has(sitio as SitioDeExcepcion);
}

/** `/` o `%` entre enteros (`int` o `long`) con divisor cero: `ArithmeticException: / by zero`, sin marcos de `java.base`. La lanza el intérprete (las operaciones aritméticas son suyas). */
export function divisionEntreCero(): ExcepcionJava {
  return crearExcepcion('Aritmetica/division-entera', '/ by zero');
}

/** La excepción de un sitio conocido, con el mensaje que arma quien la lanza (`null` si Java no le pone mensaje). Un sitio fuera de la tabla es un error de programación: lanza. */
export function crearExcepcion(sitio: SitioDeExcepcion, mensaje: string | null): ExcepcionJava {
  const fila = FILAS_POR_SITIO.get(sitio);
  if (fila === undefined) throw new Error(`Sitio de excepción desconocido: ${sitio}`);
  return new ExcepcionJava(sitio, fila.clase, mensaje, fila.marcos);
}
