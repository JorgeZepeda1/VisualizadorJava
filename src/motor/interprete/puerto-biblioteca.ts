// Valores en ejecución y PUERTO de la biblioteca (tareas 2.17 a 2.19, ADR 005, design.md §3.1). El intérprete no sabe nada de `Scanner`,
// `Random`, `Math`, `String.charAt`, `printf` ni de cómo se escribe un `double`: llama a esas funciones por su clave de firma
// (`Math.abs(int)`, `Scanner.nextInt()`, `PrintStream.printf(java.lang.String,java.lang.Object[])`) a través de este puerto. La biblioteca
// (`biblioteca/`, la parte A del hito 1) aporta las piezas y `puerto-por-omision.ts` las registra aquí; lo que el puerto no cubre, `generarIr` lo
// deja como `ejecucion-no-disponible` y nunca como un resultado inventado (D2, regla 5 de CLAUDE.md). `PUERTO_VACIO` es el puerto de las pruebas del
// intérprete que no necesitan biblioteca.
//
// El contrato, en una línea por pieza:
//   - `PuertoBiblioteca.operaciones`: clave de firma -> función. La clave es `Clase.metodo(tipos reflejados)`, `Clase.<init>(tipos)` para un
//     constructor y `Clase.CAMPO` para una constante; los tipos son los nombres reflejados del catálogo del JDK (`java.lang.String`, `int`,
//     `java.lang.Object[]`) — exactamente `FirmaMiembro` de `datos/firmas-jdk.generado.ts` —, así que no hay una segunda tabla de nombres.
//   - `PuertoBiblioteca.doubleATexto`: `Double.toString`. Mientras sea `null`, ningún programa que use `double` se ejecuta.
//   - Una operación recibe el receptor (`null` si es estática), los argumentos ya convertidos al tipo de la firma, los argumentos variables
//     empaquetados con su tipo estático (`null` si la firma no es variable) y el `ContextoDeBiblioteca`. Devuelve el valor (o `undefined` si es `void`).
//   - Una operación que no encuentra datos en la entrada lanza `FaltaEntrada` (el director restaura la instantánea y reintenta con el
//     siguiente renglón, o cede `espera-entrada`); una excepción de Java la lanza como `ExcepcionJava` (que es una `ExcepcionDeEjecucion`); lo que Java hace
//     pero no está medido, como `NoDisponibleEnEjecucion`.
//   - Un objeto con estado (`Scanner`, `Random`) cumple `ObjetoDeBiblioteca`: `capturar()`/`restaurar()` sostienen la instantánea del reintento.
//
// Las clases de valor (`CadenaJava`, `PoolDeCadenas`, `FlujoDeSalida`, `EntradaDelPrograma`, `FaltaEntrada`) son las de la biblioteca: el intérprete no declara las suyas.
import { CadenaJava, FlujoDeSalida, type EntradaDelPrograma, type FuenteDeAleatorios } from '../biblioteca/index.ts';
import type { TipoIr } from '../ir/ir.ts';
import type { Valor } from '../traza/paso.ts';

/** Un objeto de la biblioteca con estado interno (`Scanner`, `Random`). `capturar` devuelve una copia del estado; `restaurar` la devuelve a ese estado. */
export interface ObjetoDeBiblioteca {
  readonly claseJava: 'Scanner' | 'Random';
  capturar(): unknown;
  restaurar(estado: unknown): void;
}

/** Los valores que viven en las ranuras y en las expresiones mientras el programa corre. `int` y `char` son `number`; `long`, `bigint`. */
export type ValorEjecucion = number | bigint | boolean | CadenaJava | ObjetoDeBiblioteca | FlujoDeSalida;

/** Un argumento variable (`Object...`) con su tipo estático: `printf("%d", 'a')` falla distinto que `printf("%d", 97)`. */
export interface ValorEncajado {
  readonly tipo: TipoIr;
  readonly valor: ValorEjecucion;
}

/** Cómo viaja un valor dentro de un `Paso` (design.md §3.3): una cadena es su texto; un objeto de la biblioteca, su clase. */
export function aTrazaValor(valor: ValorEjecucion): Valor {
  if (valor instanceof CadenaJava) return valor.texto;
  if (valor instanceof FlujoDeSalida) return `System.${valor.nombre}`; // nunca ocupa un punto del plan; por completitud
  if (typeof valor === 'object') return { objeto: valor.claseJava };
  return valor;
}

/** Lo que una operación de la biblioteca puede pedir del entorno de la ejecución. */
export interface ContextoDeBiblioteca {
  readonly regional: 'es-MX' | 'es-ES';
  /** La entrada estándar del programa: el `Scanner` lee de aquí y el director agrega renglones y la cierra (ADR 005 punto 4). */
  readonly entrada: EntradaDelPrograma;
  /** Escribe en la consola (`out`/`err`), en el orden real. Lo usa `printf`. */
  escribir(flujo: 'out' | 'err', texto: string): void;
  /** El tope de caracteres de una cadena (`limiteCaracteres` de la configuración): pasarlo es `limite-caracteres`. */
  readonly limiteCaracteres: number;
  /** El generador de semillas de la ejecución (la semilla visible, design.md §3.7): de él salen `new Random()` y `Math.random()`. La instantánea del reintento lo captura. */
  readonly fuenteDeAleatorios: FuenteDeAleatorios;
}

export type OperacionDeBiblioteca = (
  receptor: ValorEjecucion | null,
  argumentos: readonly ValorEjecucion[],
  variables: readonly ValorEncajado[] | null,
  contexto: ContextoDeBiblioteca,
) => ValorEjecucion | undefined;

export interface PuertoBiblioteca {
  readonly operaciones: ReadonlyMap<string, OperacionDeBiblioteca>;
  /** `Double.toString` (design.md §4.2). `null` mientras la biblioteca no lo aporte: nada que use `double` se ejecuta. */
  readonly doubleATexto: ((valor: number) => string) | null;
}

/** El puerto sin biblioteca: lo único que el intérprete sabe hacer solo (enteros, `long`, `char`, `boolean`, `String`, `print`/`println` de esos tipos). */
export const PUERTO_VACIO: PuertoBiblioteca = { operaciones: new Map(), doubleATexto: null };
