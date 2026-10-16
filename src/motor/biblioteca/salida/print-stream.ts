// Tarea 2.13 (REQ-BIB-011, design.md §4.8): `System.out`/`System.err`. El intérprete resuelve la sobrecarga de `print`/`println` por el tipo ESTÁTICO de la expresión (JLS 15.12)
// y llama aquí con ese tipo; `valorATexto` es también la conversión de la concatenación con `+` (`String.valueOf` de cada operando). El fin de línea es el de la máquina de
// referencia (macOS): `\n`. `FlujoDeSalida` devuelve el texto que llega a la consola — el intérprete lo pone en un `Segmento` `{ flujo: 'out' | 'err', texto }` — ya con los
// sustitutos sueltos convertidos en `?` como hace la JVM (`codificacion-jvm.ts`).
import { doubleATexto } from '../formato/double-a-texto.ts';
import { CodificadorDeSalida } from './codificacion-jvm.ts';

/** Tipo estático de la expresión que se imprime o concatena. `char` es un `number` 0–65535; `long` es `bigint`; un `String` puede ser `null` (sale como `null`). */
export type TipoImprimible = 'int' | 'long' | 'double' | 'char' | 'boolean' | 'String';

export type ValorImprimible = number | bigint | boolean | string | null;

export const FIN_DE_LINEA = '\n';

/** `String.valueOf(valor)` según el tipo estático: lo que imprime `println` y lo que aporta cada operando de una concatenación. */
export function valorATexto(tipo: TipoImprimible, valor: ValorImprimible): string {
  switch (tipo) {
    case 'int':
    case 'long':
      return String(valor);
    case 'double':
      return doubleATexto(valor as number);
    case 'char':
      return String.fromCharCode(valor as number);
    case 'boolean':
      return valor ? 'true' : 'false';
    case 'String':
      return valor === null ? 'null' : (valor as string);
  }
}

/** Un `PrintStream` (`System.out` o `System.err`): cada uno recuerda su propio sustituto alto pendiente y sabe cuál es (el receptor de `printf` escribe en el flujo de la consola que le toca). */
export class FlujoDeSalida {
  readonly nombre: 'out' | 'err';
  private readonly codificador = new CodificadorDeSalida();

  constructor(nombre: 'out' | 'err') {
    this.nombre = nombre;
  }

  /** `print(valor)`: el texto que llega a la consola. */
  print(tipo: TipoImprimible, valor: ValorImprimible): string {
    return this.codificador.convertir(valorATexto(tipo, valor));
  }

  /** `println(valor)`, o `println()` sin argumentos: el texto más el fin de línea. */
  println(tipo?: TipoImprimible, valor?: ValorImprimible): string {
    const texto = tipo === undefined ? '' : valorATexto(tipo, valor as ValorImprimible);
    return this.codificador.convertir(texto + FIN_DE_LINEA);
  }
}
