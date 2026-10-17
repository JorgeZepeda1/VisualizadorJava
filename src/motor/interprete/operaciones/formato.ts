// `printf` y `String.format` (tarea 2.8, REQ-BIB-003, REQ-BIB-010, design.md §4.3): el patrón y los argumentos variables (cada uno con su tipo estático, porque `%d` con un `char` falla distinto
// que con un `int`) pasan al formateador de la biblioteca con el modelo regional de la ejecución. Lo que Java rechaza sale como la excepción de Java con sus marcos; lo que está fuera del
// alcance verificado, como `NoDisponibleEnEjecucion` (para un patrón literal, `generarIr` ya lo decidió en la compilación con `formatoSoportado`).
import { CadenaJava, formatear, nuevaCadena, NoDisponibleEnEjecucion, type ArgumentoDeFormato, type FlujoDeSalida, type ViaDeFormato } from '../../biblioteca/index.ts';
import type { ContextoDeBiblioteca, OperacionDeBiblioteca, ValorEjecucion, ValorEncajado } from '../puerto-biblioteca.ts';
import { cadena } from './valores.ts';

/** Un argumento variable en la forma que entiende el formateador: la cadena viaja como su texto. Un `Scanner` o un `Random` (su `toString` lleva una dirección) no se modela. */
function argumentoDeFormato({ tipo, valor }: ValorEncajado): ArgumentoDeFormato {
  if (tipo === 'Scanner' || tipo === 'Random') throw new NoDisponibleEnEjecucion('texto-de-un-objeto-de-la-biblioteca', tipo);
  return { tipo, valor: valor instanceof CadenaJava ? valor.texto : (valor as number | bigint | boolean) };
}

function formatearConLosArgumentos(argumentos: readonly ValorEjecucion[], variables: readonly ValorEncajado[] | null, contexto: ContextoDeBiblioteca, via: ViaDeFormato): string {
  return formatear(cadena(argumentos[0]).texto, (variables ?? []).map(argumentoDeFormato), contexto.regional, via);
}

export const OPERACIONES_DE_FORMATO: ReadonlyMap<string, OperacionDeBiblioteca> = new Map<string, OperacionDeBiblioteca>([
  [
    'PrintStream.printf(java.lang.String,java.lang.Object[])',
    (receptor, argumentos, variables, contexto) => {
      const flujo = receptor as FlujoDeSalida;
      const texto = formatearConLosArgumentos(argumentos, variables, contexto, 'printf');
      contexto.escribir(flujo.nombre, flujo.print('String', texto));
      return undefined;
    },
  ],
  ['String.format(java.lang.String,java.lang.Object[])', (_receptor, argumentos, variables, contexto) => nuevaCadena(formatearConLosArgumentos(argumentos, variables, contexto, 'String.format'))],
]);
