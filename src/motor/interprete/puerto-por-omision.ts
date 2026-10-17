// El puerto de la biblioteca que usan `compilar()` y `crearEjecucion()` cuando nadie les da otro (tarea 2.19). Es el ÚNICO lugar donde se conecta la biblioteca (`biblioteca/`, la parte A del hito 1)
// al intérprete: una tabla de operaciones por clase de Java (`operaciones/`) y el `Double.toString` exacto. Lo que el catálogo reconoce y no está aquí (`Math.pow`, las sobrecargas exóticas…) lo deja
// `generarIr` como `ejecucion-no-disponible` en la compilación, nunca a media ejecución (D2, regla 5 de CLAUDE.md); `puerto-por-omision.test.ts` lleva la cuenta de cada una con su motivo.
import { doubleATexto } from '../biblioteca/index.ts';
import { OPERACIONES_DE_RANDOM } from './operaciones/aleatorio.ts';
import { OPERACIONES_DE_CHARACTER } from './operaciones/caracteres.ts';
import { OPERACIONES_DE_FORMATO } from './operaciones/formato.ts';
import { OPERACIONES_DE_MATH } from './operaciones/matematicas.ts';
import { OPERACIONES_DE_NUMEROS } from './operaciones/numeros.ts';
import { OPERACIONES_DE_SCANNER } from './operaciones/scanner.ts';
import { OPERACIONES_DE_STRING } from './operaciones/texto.ts';
import { unirOperaciones } from './operaciones/unir-operaciones.ts';
import type { PuertoBiblioteca } from './puerto-biblioteca.ts';

export const PUERTO_POR_OMISION: PuertoBiblioteca = {
  operaciones: unirOperaciones([
    OPERACIONES_DE_SCANNER,
    OPERACIONES_DE_RANDOM,
    OPERACIONES_DE_STRING,
    OPERACIONES_DE_CHARACTER,
    OPERACIONES_DE_NUMEROS,
    OPERACIONES_DE_MATH,
    OPERACIONES_DE_FORMATO,
  ]),
  doubleATexto,
};
