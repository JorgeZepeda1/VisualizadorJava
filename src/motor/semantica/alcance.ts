// Pila de bloques y tabla de símbolos de la pasada de atribución (tarea 1.7, REQ-COMP-002/003,
// design.md §2.7: "una ranura por declaración; no hay recursión: un solo marco"). Java prohíbe
// redeclarar un nombre en el MISMO bloque y también sombrear, en un bloque anidado, una local
// todavía viva de un bloque contenedor — javac da el MISMO mensaje para ambos casos (verificado:
// `variable x is already defined in method main(String[])`, tanto para redeclaración directa como
// para sombreado, incluida la variable de control de un `for`), así que `declarar` los rechaza con
// un solo código: lo que importa es si el nombre YA está visible en algún bloque todavía abierto,
// no en cuál de los bloques abiertos vive.
import type { Rango } from '../fuente/rango.ts';
import type { ValorConstante } from './constantes.ts';

export interface SimboloVariable {
  readonly nombre: string;
  readonly tipo: string;
  readonly esFinal: boolean;
  readonly rango: Rango;
  /** Deuda 3 del commit 999a8ca (JLS 4.12.4, "variable constante"): el valor plegado
   * (`constantes.ts`, tarea 1.10) de esta variable si es "final" Y su inicializador es una
   * expresión constante — `undefined` en cualquier otro caso (no es "final", no tiene
   * inicializador, o el inicializador no es constante). Lo arma quien declara el símbolo
   * (`atribucion.ts`/`alcanzabilidad.ts`, cada uno su propio `Alcance`); `constantes.ts` SOLO lo
   * lee de vuelta (`valorConstante`, caso 'nombre'). `import type` — sin dependencia real en
   * tiempo de VALOR, misma garantía que ya documentaba este archivo. */
  readonly constante?: ValorConstante;
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

  /** Cierra el bloque más interno y devuelve los nombres de las variables que declaró (tarea 1.29: al cerrarse un alcance
   * sus variables MUEREN, y la asignación definida las olvida — la `x` de un `for` ya cerrado no debe confundirse con otra `x`
   * declarada después). Quien no los necesita simplemente ignora el resultado. */
  salirBloque(): string[] {
    const cerrado = this.bloques.pop();
    if (cerrado === undefined) {
      throw new Error('Alcance.salirBloque(): no hay ningún bloque abierto');
    }
    return [...cerrado.keys()];
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

  /** Los nombres de TODAS las variables visibles ahora (de todos los bloques abiertos). Tarea 1.29: la asignación
   * definida arma con ellos su estado «vacuo» (JLS 16.1.1) — todo lo YA declarado en ese punto, nada de lo que se declare
   * después. */
  nombresVisibles(): string[] {
    return this.bloques.flatMap((bloque) => [...bloque.keys()]);
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
