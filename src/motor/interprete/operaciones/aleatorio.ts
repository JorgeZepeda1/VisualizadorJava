// `java.util.Random` (tarea 2.7, REQ-BIB-005, REQ-EJEC-008, design.md §3.7): `new Random(semilla)` es determinista; `new Random()` toma la siguiente semilla derivada de la semilla visible de la
// ejecución (`contexto.fuenteDeAleatorios`, que la instantánea del reintento también captura).
import { RandomJava } from '../../biblioteca/index.ts';
import type { OperacionDeBiblioteca } from '../puerto-biblioteca.ts';
import { largo, numero } from './valores.ts';

function azar(receptor: Parameters<OperacionDeBiblioteca>[0]): RandomJava {
  return receptor as RandomJava;
}

export const OPERACIONES_DE_RANDOM: ReadonlyMap<string, OperacionDeBiblioteca> = new Map<string, OperacionDeBiblioteca>([
  ['Random.<init>()', (_receptor, _argumentos, _variables, contexto) => contexto.fuenteDeAleatorios.nuevoSinSemilla()],
  ['Random.<init>(long)', (_receptor, argumentos) => new RandomJava(largo(argumentos[0]))],
  ['Random.nextInt()', (receptor) => azar(receptor).nextInt()],
  ['Random.nextInt(int)', (receptor, argumentos) => azar(receptor).nextInt(numero(argumentos[0]))],
  ['Random.nextDouble()', (receptor) => azar(receptor).nextDouble()],
  ['Random.nextBoolean()', (receptor) => azar(receptor).nextBoolean()],
]);
