// `java.lang.Math` (tarea 2.6, REQ-BIB-004, design.md §4.4): Java elige la sobrecarga por el tipo estático de los argumentos y `generarIr` ya la resolvió en la clave; cada clave llama a su variante de
// `MathJava` (`absInt`, `absLong`, `absDouble`…). `Math.pow` NO está aquí a propósito: sin el puerto de fdlibm verificado (tarea 2.5) Java y V8 difieren en el 4 % de los casos, así que `generarIr` lo deja
// como `ejecucion-no-disponible` en la compilación (D2).
//
// `Math.round(int)`, `Math.round(long)` y `Math.round(char)` no existen en Java: se resuelven a `round(float)`. `generarIr` deja el argumento SIN convertir (el subconjunto no tiene `float`) y esta
// operación lo convierte: un `long` llega como `bigint` y pasa a `float` con UN solo redondeo; un `int` o un `char` llegan como `number`.
import { MathJava } from '../../biblioteca/index.ts';
import type { OperacionDeBiblioteca } from '../puerto-biblioteca.ts';
import { largo, numero } from './valores.ts';

export const OPERACIONES_DE_MATH: ReadonlyMap<string, OperacionDeBiblioteca> = new Map<string, OperacionDeBiblioteca>([
  ['Math.abs(int)', (_receptor, argumentos) => MathJava.absInt(numero(argumentos[0]))],
  ['Math.abs(long)', (_receptor, argumentos) => MathJava.absLong(largo(argumentos[0]))],
  ['Math.abs(double)', (_receptor, argumentos) => MathJava.absDouble(numero(argumentos[0]))],
  ['Math.max(int,int)', (_receptor, argumentos) => MathJava.maxInt(numero(argumentos[0]), numero(argumentos[1]))],
  ['Math.max(long,long)', (_receptor, argumentos) => MathJava.maxLong(largo(argumentos[0]), largo(argumentos[1]))],
  ['Math.max(double,double)', (_receptor, argumentos) => MathJava.maxDouble(numero(argumentos[0]), numero(argumentos[1]))],
  ['Math.min(int,int)', (_receptor, argumentos) => MathJava.minInt(numero(argumentos[0]), numero(argumentos[1]))],
  ['Math.min(long,long)', (_receptor, argumentos) => MathJava.minLong(largo(argumentos[0]), largo(argumentos[1]))],
  ['Math.min(double,double)', (_receptor, argumentos) => MathJava.minDouble(numero(argumentos[0]), numero(argumentos[1]))],
  ['Math.sqrt(double)', (_receptor, argumentos) => MathJava.sqrt(numero(argumentos[0]))],
  ['Math.floor(double)', (_receptor, argumentos) => MathJava.floor(numero(argumentos[0]))],
  ['Math.ceil(double)', (_receptor, argumentos) => MathJava.ceil(numero(argumentos[0]))],
  ['Math.round(double)', (_receptor, argumentos) => MathJava.roundDouble(numero(argumentos[0]))],
  ['Math.round(float)', (_receptor, argumentos) => (typeof argumentos[0] === 'bigint' ? MathJava.roundLong(argumentos[0]) : MathJava.roundInt(numero(argumentos[0])))],
  ['Math.random()', (_receptor, _argumentos, _variables, contexto) => MathJava.random(contexto.fuenteDeAleatorios)],
]);
