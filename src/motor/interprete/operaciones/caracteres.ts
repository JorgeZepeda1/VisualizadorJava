// `java.lang.Character` (tarea 2.10, REQ-BIB-007, design.md §4.5): las tablas de la biblioteca son de un `char` (el plano básico multilingüe, 65 536 valores medidos contra el JDK). Las
// sobrecargas de `char` son directas. Las de `int` (un punto de código) valen igual dentro de ese plano; un punto fuera de él (un emoji, un valor negativo) depende de tablas que la
// biblioteca no tiene, así que se detiene con el aviso «No disponible» en vez de adivinar (D2). Es un aviso en ejecución porque depende del VALOR del argumento.
import { isDigit, isLetter, isLetterOrDigit, isLowerCase, isUpperCase, isWhitespace, NoDisponibleEnEjecucion, toLowerCase, toUpperCase } from '../../biblioteca/index.ts';
import type { OperacionDeBiblioteca } from '../puerto-biblioteca.ts';
import { numero } from './valores.ts';

const ULTIMO_PUNTO_DEL_PLANO_BASICO = 0xffff;

/** El punto de código si cabe en un `char` (0–65535); si no, «No disponible». */
function puntoDelPlanoBasico(valor: number): number {
  if (valor < 0 || valor > ULTIMO_PUNTO_DEL_PLANO_BASICO) throw new NoDisponibleEnEjecucion('punto-de-codigo-fuera-del-plano-basico', String(valor));
  return valor;
}

type Consulta = (caracter: number) => boolean;
type Conversion = (caracter: number) => number;

const CONSULTAS: readonly (readonly [nombre: string, consulta: Consulta])[] = [
  ['isDigit', isDigit],
  ['isLetter', isLetter],
  ['isLetterOrDigit', isLetterOrDigit],
  ['isUpperCase', isUpperCase],
  ['isLowerCase', isLowerCase],
  ['isWhitespace', isWhitespace],
];

const CONVERSIONES: readonly (readonly [nombre: string, conversion: Conversion])[] = [
  ['toUpperCase', toUpperCase],
  ['toLowerCase', toLowerCase],
];

export const OPERACIONES_DE_CHARACTER: ReadonlyMap<string, OperacionDeBiblioteca> = new Map<string, OperacionDeBiblioteca>([
  ...CONSULTAS.flatMap(([nombre, consulta]): [string, OperacionDeBiblioteca][] => [
    [`Character.${nombre}(char)`, (_receptor, argumentos) => consulta(numero(argumentos[0]))],
    [`Character.${nombre}(int)`, (_receptor, argumentos) => consulta(puntoDelPlanoBasico(numero(argumentos[0])))],
  ]),
  ...CONVERSIONES.flatMap(([nombre, conversion]): [string, OperacionDeBiblioteca][] => [
    [`Character.${nombre}(char)`, (_receptor, argumentos) => conversion(numero(argumentos[0]))],
    [`Character.${nombre}(int)`, (_receptor, argumentos) => conversion(puntoDelPlanoBasico(numero(argumentos[0])))],
  ]),
]);
