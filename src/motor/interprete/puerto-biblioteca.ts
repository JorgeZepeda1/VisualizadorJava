// Valores en ejecución y PUERTO de la biblioteca (tareas 2.17 a 2.19, ADR 005, design.md §3.1). El intérprete no sabe nada de `Scanner`,
// `Random`, `Math`, `String.charAt`, `printf` ni de cómo se escribe un `double`: llama a esas funciones por su clave de firma
// (`Math.abs(int)`, `Scanner.nextInt()`, `PrintStream.printf(java.lang.String,java.lang.Object[])`) a través de este puerto. La biblioteca
// (`biblioteca/{formato,salida,entrada,texto,matematicas,aleatorio,excepciones}`, la parte A del hito 1) registra aquí sus operaciones;
// mientras no estén, `PUERTO_VACIO` hace que todo programa que las necesite quede como `ejecucion-no-disponible` y nunca con un resultado
// inventado (D2, regla 5 de CLAUDE.md).
//
// El contrato, en una línea por pieza:
//   - `PuertoBiblioteca.operaciones`: clave de firma -> función. La clave es `Clase.metodo(tipos reflejados)`, `Clase.<init>(tipos)` para un
//     constructor y `Clase.CAMPO` para una constante; los tipos son los nombres reflejados del catálogo del JDK (`java.lang.String`, `int`,
//     `java.lang.Object[]`) — exactamente `FirmaMiembro` de `datos/firmas-jdk.generado.ts` —, así que no hay una segunda tabla de nombres.
//   - `PuertoBiblioteca.doubleATexto`: `Double.toString`. Mientras sea `null`, ningún programa que use `double` se ejecuta.
//   - Una operación recibe el receptor (`null` si es estática), los argumentos ya convertidos al tipo de la firma, los argumentos variables
//     empaquetados con su tipo estático (`null` si la firma no es variable) y el `ContextoDeBiblioteca`. Devuelve el valor (o `undefined` si es `void`).
//   - Una operación que no encuentra datos en la entrada lanza `FaltaEntrada` (el director restaura la instantánea y reintenta con el
//     siguiente renglón, o cede `espera-entrada`); una excepción de Java la lanza como `ExcepcionDeEjecucion`.
//   - Un objeto con estado (`Scanner`, `Random`) cumple `ObjetoDeBiblioteca`: `capturar()`/`restaurar()` sostienen la instantánea del reintento.
import type { TipoIr } from '../ir/ir.ts';
import type { Valor } from '../traza/paso.ts';

/**
 * Un `String` de Java (design.md §3.1): identidad por referencia —`==` compara el objeto, no el texto—, y `latin1` recuerda si TODOS sus
 * caracteres caben en un byte, porque de eso depende el mensaje y los marcos de `charAt` fuera de rango (§3.6).
 */
export class CadenaJava {
  readonly texto: string;
  readonly latin1: boolean;

  constructor(texto: string) {
    this.texto = texto;
    this.latin1 = esLatin1(texto);
  }
}

function esLatin1(texto: string): boolean {
  for (let indice = 0; indice < texto.length; indice += 1) {
    if (texto.charCodeAt(indice) > 0xff) return false;
  }
  return true;
}

/** El *pool* de cadenas internadas: los literales y las constantes de texto son el mismo objeto si tienen el mismo texto (`"ho" + "la" == "hola"`). */
export class PoolDeCadenas {
  private readonly cadenas = new Map<string, CadenaJava>();

  internar(texto: string): CadenaJava {
    let cadena = this.cadenas.get(texto);
    if (cadena === undefined) {
      cadena = new CadenaJava(texto);
      this.cadenas.set(texto, cadena);
    }
    return cadena;
  }
}

/** Un objeto de la biblioteca con estado interno (`Scanner`, `Random`). `capturar` devuelve una copia del estado; `restaurar` la devuelve a ese estado. */
export interface ObjetoDeBiblioteca {
  readonly claseJava: 'Scanner' | 'Random';
  capturar(): unknown;
  restaurar(estado: unknown): void;
}

/** `System.out` o `System.err`: el receptor de `printf`. */
export class FlujoDeSalida {
  readonly flujo: 'out' | 'err';

  constructor(flujo: 'out' | 'err') {
    this.flujo = flujo;
  }
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
  if (valor instanceof FlujoDeSalida) return `System.${valor.flujo}`; // nunca ocupa un punto del plan; por completitud
  if (typeof valor === 'object') return { objeto: valor.claseJava };
  return valor;
}

/**
 * La entrada estándar del programa: todo lo que se ha «tecleado» hasta ahora (`texto`) y hasta dónde ha leído `Scanner` (`cursor`). La biblioteca
 * lee y avanza `cursor`; el director agrega renglones (los de `entradaPreparada` o los que llegan con `darEntrada`) y marca `cerrada` al agotarse
 * (EOF). Una lectura que necesita más datos con `cerrada === false` lanza `FaltaEntrada`; con `cerrada === true` lanza `NoSuchElementException`.
 */
export class EntradaDelPrograma {
  texto = '';
  cursor = 0;
  cerrada = false;

  agregar(renglon: string): void {
    this.texto += renglon;
  }

  cerrar(): void {
    this.cerrada = true;
  }
}

/** Señal de la biblioteca: la lectura necesita más datos que los que hay en `EntradaDelPrograma` y la entrada sigue abierta (ADR 005 punto 4). */
export class FaltaEntrada extends Error {
  constructor() {
    super('falta entrada');
    this.name = 'FaltaEntrada';
  }
}

/** Lo que una operación de la biblioteca puede pedir del entorno de la ejecución. */
export interface ContextoDeBiblioteca {
  readonly regional: 'es-MX' | 'es-ES';
  /** La semilla visible de la ejecución (design.md §3.7). */
  readonly semilla: bigint;
  readonly entrada: EntradaDelPrograma;
  /** Escribe en la consola (`out`/`err`), en el orden real. Lo usa `printf`. */
  escribir(flujo: 'out' | 'err', texto: string): void;
  /** El tope de caracteres de una cadena (`limiteCaracteres` de la configuración): pasarlo es `limite-caracteres`. */
  readonly limiteCaracteres: number;
  /** Registra un objeto con estado que NO vive en una ranura (p. ej. el generador de semillas, el `Random` oculto de `Math.random()`) para que la instantánea del reintento lo capture. */
  registrarObjetoGlobal(objeto: ObjetoDeBiblioteca): void;
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
