// Forma compartida de un problema de ATRIBUCIÓN (tarea 1.7+, pasada 2 de ADR 004) — deliberadamente
// angosta, como `NoSoportadoColectado` en `sintaxis/no-soportado.ts`: ni `categoria` (normalmente
// 'error-compilacion' en esta pasada) ni `linea` (la calcula quien la conecte a `compilador.ts`,
// tarea 1.14, igual que ya hace esa tarea con los avisos NO-DISP) — solo lo que esta pasada sabe
// de verdad. `codigo` usa el catálogo CERRADO real desde la tarea 1.11 (antes `string` abierto).
//
// Corrección obligatoria (sub-lote 1-D2c, ADR 004 punto 2): "miembros existentes no soportados de
// clases soportadas" (`s.split`, `Math.sin`…) es un aviso NO-DISP real de la propia pasada de
// ATRIBUCIÓN (design.md §2.6 fila "Atribución"), no de sintaxis — `atribuir` necesita poder
// devolver ESE tipo de problema junto con los errores de tipo/símbolo de siempre, y
// `compilador.ts` necesita saber distinguirlos (`categoria`) para no reportarlos como
// 'error-compilacion'. `codigo` se ensancha a `CodigoProblema | string` (MISMA forma que ya tiene
// `Problema.codigo` en problemas.ts) para poder llevar el código ABIERTO de NO-DISP
// (`sintaxis/no-soportado.ts`) cuando `categoria` es 'no-disponible'.
import type { Rango } from '../fuente/rango.ts';
import type { CodigoProblema } from '../problemas.ts';

export interface ProblemaAtribucion {
  readonly codigo: CodigoProblema | string;
  /** `undefined` (el caso normal, de siempre) significa 'error-compilacion' — solo un aviso de
   * biblioteca no soportada (sub-lote 1-D2c) trae 'no-disponible' explícito. */
  readonly categoria?: 'no-disponible';
  readonly rango: Rango;
  readonly datos: Readonly<Record<string, unknown>>;
}
