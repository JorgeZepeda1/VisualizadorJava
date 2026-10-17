// La franja del búfer del Scanner (tarea 4.7, REQ-VIS-009, design.md §6.4): lo que todavía no se leyó del texto que llegó, con los espacios (␣) y los saltos de línea (⏎) a la vista, para explicar el
// error clásico de `nextInt()` seguido de `nextLine()`. Sale de lo que el motor registró en cada paso: `entrada.agregado` (el renglón que entró al búfer) y `entrada.cursor` (hasta dónde se leyó).
// Puro, sin DOM.
import type { Paso } from '../motor/vista.ts';

export interface BuferVista {
  /** Lo que queda sin leer, con los símbolos visibles; vacío si el paso tocó el Scanner y no quedó nada. */
  readonly visible: string;
}

const SIMBOLOS_VISIBLES: ReadonlyMap<string, string> = new Map([
  [' ', '␣'],
  ['\n', '⏎'],
  ['\r', '␍'],
  ['\t', '⇥'],
]);

/** Cambia los caracteres que no se ven (espacio, salto de línea, retorno de carro, tabulador) por un símbolo. */
export function hacerVisible(texto: string): string {
  return Array.from(texto, (caracter) => SIMBOLOS_VISIBLES.get(caracter) ?? caracter).join('');
}

/** La franja aparece solo si el paso tocó el Scanner o si queda texto pendiente; si el programa nunca leyó entrada, no hay franja. */
export function derivarBufer(aplicados: readonly Paso[]): BuferVista | null {
  let texto = '';
  let cursor = 0;
  let huboEntrada = false;
  for (const paso of aplicados) {
    if (paso.entrada === undefined) continue;
    texto += paso.entrada.agregado ?? '';
    cursor = paso.entrada.cursor;
    huboEntrada = true;
  }
  if (!huboEntrada) return null;
  const pendiente = texto.slice(cursor);
  const tocoElScanner = aplicados.at(-1)?.entrada !== undefined;
  if (pendiente === '' && !tocoElScanner) return null;
  return { visible: hacerVisible(pendiente) };
}
