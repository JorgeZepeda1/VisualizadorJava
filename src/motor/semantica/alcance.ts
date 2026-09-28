// Pila de bloques y tabla de símbolos de la pasada de atribución (tarea 1.7, REQ-COMP-002/003,
// design.md §2.7: "una ranura por declaración; no hay recursión: un solo marco"). Java prohíbe
// redeclarar un nombre en el MISMO bloque y también sombrear, en un bloque anidado, una local
// todavía viva de un bloque contenedor — javac da el MISMO mensaje para ambos casos (verificado:
// `variable x is already defined in method main(String[])`, tanto para redeclaración directa como
// para sombreado, incluida la variable de control de un `for`), así que `declarar` los rechaza con
// un solo código: lo que importa es si el nombre YA está visible en algún bloque todavía abierto,
// no en cuál de los bloques abiertos vive.
import type { Rango } from '../fuente/rango.ts';

export interface SimboloVariable {
  readonly nombre: string;
  readonly tipo: string;
  readonly esFinal: boolean;
  readonly rango: Rango;
}

export type ResultadoDeclarar =
  | { readonly ok: true }
  | { readonly ok: false; readonly existente: SimboloVariable };

/** Un solo marco (sin recursión, design.md §2.7): pila de bloques léxicos abiertos, cada uno su
 * propio mapa nombre→símbolo. `buscar` recorre de adentro hacia afuera (el bloque más interno
 * gana); `declarar` rechaza si el nombre YA es visible en CUALQUIER bloque abierto. */
export class Alcance {
  private readonly bloques: Map<string, SimboloVariable>[] = [];

  entrarBloque(): void {
    this.bloques.push(new Map());
  }

  salirBloque(): void {
    if (this.bloques.length === 0) {
      throw new Error('Alcance.salirBloque(): no hay ningún bloque abierto');
    }
    this.bloques.pop();
  }

  declarar(simbolo: SimboloVariable): ResultadoDeclarar {
    const existente = this.buscar(simbolo.nombre);
    if (existente !== null) {
      return { ok: false, existente };
    }
    const bloqueActual = this.bloques[this.bloques.length - 1];
    if (bloqueActual === undefined) {
      throw new Error('Alcance.declarar(): no hay ningún bloque abierto (falta entrarBloque())');
    }
    bloqueActual.set(simbolo.nombre, simbolo);
    return { ok: true };
  }

  /** Busca de adentro (el bloque más reciente) hacia afuera; `null` si no está visible en ningún
   * bloque actualmente abierto. */
  buscar(nombre: string): SimboloVariable | null {
    for (let i = this.bloques.length - 1; i >= 0; i -= 1) {
      const simbolo = this.bloques[i]!.get(nombre);
      if (simbolo !== undefined) return simbolo;
    }
    return null;
  }
}
