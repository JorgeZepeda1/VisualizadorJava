// `java.lang.String` (tarea 2.9, REQ-BIB-006, design.md §4.5): cada método del catálogo (REQ-SUB-005) llama a `StringJava`. La identidad de la cadena importa: `substring(0)`, `trim` sin nada que
// recortar, `replace` sin coincidencias y las mayúsculas sin cambios devuelven la MISMA instancia, y `equals` compara el texto mientras `==` compara el objeto.
import { CadenaJava, StringJava } from '../../biblioteca/index.ts';
import type { OperacionDeBiblioteca } from '../puerto-biblioteca.ts';
import { cadena, numero } from './valores.ts';

export const OPERACIONES_DE_STRING: ReadonlyMap<string, OperacionDeBiblioteca> = new Map<string, OperacionDeBiblioteca>([
  ['String.<init>(java.lang.String)', (_receptor, argumentos) => StringJava.nueva(cadena(argumentos[0]))],
  ['String.length()', (receptor) => StringJava.length(cadena(receptor))],
  ['String.isEmpty()', (receptor) => StringJava.isEmpty(cadena(receptor))],
  ['String.charAt(int)', (receptor, argumentos) => StringJava.charAt(cadena(receptor), numero(argumentos[0]))],
  ['String.substring(int)', (receptor, argumentos) => StringJava.substring(cadena(receptor), numero(argumentos[0]))],
  ['String.substring(int,int)', (receptor, argumentos) => StringJava.substring(cadena(receptor), numero(argumentos[0]), numero(argumentos[1]))],
  ['String.indexOf(int)', (receptor, argumentos) => StringJava.indexOfChar(cadena(receptor), numero(argumentos[0]))],
  ['String.indexOf(java.lang.String)', (receptor, argumentos) => StringJava.indexOf(cadena(receptor), cadena(argumentos[0]))],
  ['String.indexOf(java.lang.String,int)', (receptor, argumentos) => StringJava.indexOf(cadena(receptor), cadena(argumentos[0]), numero(argumentos[1]))],
  // `equals(Object)`: el argumento puede ser cualquier objeto del subconjunto; solo un `String` con el mismo texto es igual.
  ['String.equals(java.lang.Object)', (receptor, argumentos) => argumentos[0] instanceof CadenaJava && StringJava.equals(cadena(receptor), argumentos[0])],
  ['String.equalsIgnoreCase(java.lang.String)', (receptor, argumentos) => StringJava.equalsIgnoreCase(cadena(receptor), cadena(argumentos[0]))],
  ['String.compareTo(java.lang.String)', (receptor, argumentos) => StringJava.compareTo(cadena(receptor), cadena(argumentos[0]))],
  ['String.contains(java.lang.CharSequence)', (receptor, argumentos) => StringJava.contains(cadena(receptor), cadena(argumentos[0]))],
  ['String.startsWith(java.lang.String)', (receptor, argumentos) => StringJava.startsWith(cadena(receptor), cadena(argumentos[0]))],
  ['String.endsWith(java.lang.String)', (receptor, argumentos) => StringJava.endsWith(cadena(receptor), cadena(argumentos[0]))],
  ['String.replace(char,char)', (receptor, argumentos) => StringJava.replaceChar(cadena(receptor), numero(argumentos[0]), numero(argumentos[1]))],
  ['String.replace(java.lang.CharSequence,java.lang.CharSequence)', (receptor, argumentos) => StringJava.replace(cadena(receptor), cadena(argumentos[0]), cadena(argumentos[1]))],
  ['String.toUpperCase()', (receptor) => StringJava.toUpperCase(cadena(receptor))],
  ['String.toLowerCase()', (receptor) => StringJava.toLowerCase(cadena(receptor))],
  ['String.trim()', (receptor) => StringJava.trim(cadena(receptor))],
  // `String.valueOf(x)`: una cadena NUEVA con el texto de `x` según su tipo estático.
  ['String.valueOf(boolean)', (_receptor, argumentos) => StringJava.valueOf('boolean', argumentos[0] as boolean)],
  ['String.valueOf(char)', (_receptor, argumentos) => StringJava.valueOf('char', numero(argumentos[0]))],
  ['String.valueOf(int)', (_receptor, argumentos) => StringJava.valueOf('int', numero(argumentos[0]))],
  ['String.valueOf(long)', (_receptor, argumentos) => StringJava.valueOf('long', argumentos[0] as bigint)],
  ['String.valueOf(double)', (_receptor, argumentos) => StringJava.valueOf('double', numero(argumentos[0]))],
  // `valueOf(Object)` con un `String` devuelve ese mismo objeto (`obj.toString()`); `generarIr` no deja pasar un `Scanner` ni un `Random`.
  ['String.valueOf(java.lang.Object)', (_receptor, argumentos) => cadena(argumentos[0])],
]);
