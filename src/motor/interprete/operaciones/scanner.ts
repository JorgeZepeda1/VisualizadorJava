// `java.util.Scanner` sobre la entrada del programa (tarea 2.12, REQ-BIB-009, REQ-BIB-010, design.md §4.6): las operaciones que el subconjunto reconoce (REQ-SUB-005) llaman a `ScannerJava` de la
// biblioteca. Lo que devuelve `next()`/`nextLine()` es una cadena NUEVA (identidad propia): `sc.next() == "si"` es `false` en Java. Si falta entrada, `ScannerJava` lanza `FaltaEntrada` y
// el director restaura la instantánea y reintenta la sentencia (ADR 005 punto 4).
import { nuevaCadena, ScannerJava } from '../../biblioteca/index.ts';
import type { OperacionDeBiblioteca } from '../puerto-biblioteca.ts';

function scanner(receptor: Parameters<OperacionDeBiblioteca>[0]): ScannerJava {
  return receptor as ScannerJava;
}

export const OPERACIONES_DE_SCANNER: ReadonlyMap<string, OperacionDeBiblioteca> = new Map<string, OperacionDeBiblioteca>([
  // `new Scanner(System.in)`: el `System.in` ya lo dice la clave del constructor y no llega como argumento.
  ['Scanner.<init>(java.io.InputStream)', (_receptor, _argumentos, _variables, contexto) => new ScannerJava(contexto.regional, contexto.entrada)],
  [
    'Scanner.close()',
    (receptor) => {
      scanner(receptor).close();
      return undefined;
    },
  ],
  ['Scanner.next()', (receptor) => nuevaCadena(scanner(receptor).next())],
  ['Scanner.nextLine()', (receptor) => nuevaCadena(scanner(receptor).nextLine())],
  ['Scanner.nextInt()', (receptor) => scanner(receptor).nextInt()],
  ['Scanner.nextDouble()', (receptor) => scanner(receptor).nextDouble()],
  ['Scanner.nextBoolean()', (receptor) => scanner(receptor).nextBoolean()],
]);
