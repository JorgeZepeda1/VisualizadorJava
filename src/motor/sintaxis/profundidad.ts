// La profundidad del ÁRBOL del programa (tarea 1.37, W-12 de la verificación del delta del lote 1). Todo lo que sigue al análisis sintáctico recorre el árbol con recursión —`recolectarNoSoportados`,
// la atribución, la alcanzabilidad, la asignación definitiva, la pasada de límites del archivo y `generarIr`—, así que su pila crece con la PROFUNDIDAD del árbol, y esa profundidad no la acota ni el
// tope de tokens (4 000 admiten un árbol de 2 000 niveles) ni el contador de recursión del analizador: una cadena de mil `&&` la arma el analizador con un lazo, sin recursión, y es un árbol de mil
// niveles. En los navegadores, desde unos 800 niveles de esa forma (y desde unos 200 de las más pesadas) la pila se agota y el alumno veía «Algo falló dentro del visualizador».
//
// La medida es EXACTA y NO recursiva —una pila explícita—, para que medir no sea lo que agota la pila: el cuerpo de `main` es el nivel 0 y cada nodo hijo suma uno. Los paréntesis no son nodos (el árbol
// solo guarda su marca, ver `ConParentesis` en `ast.ts`), así que no suman: su recursión la acota el contador del analizador (`CursorDeTokens.entrarNivel`).
import type { Rango } from '../fuente/rango.ts';
import type { NodoBloque, NodoDeclarador, NodoElementoSwitch, NodoExpresion, NodoPrograma } from './ast.ts';

type NodoDelArbol = NodoBloque | NodoElementoSwitch | NodoExpresion | NodoDeclarador;

const SIN_HIJOS: readonly NodoDelArbol[] = [];

/** Los hijos de un nodo, en el orden del texto. El `switch` es exhaustivo: un tipo de nodo nuevo no compila hasta que se diga cuáles son sus hijos (si no, quedaría fuera de la medida). */
function hijosDe(nodo: NodoDelArbol): readonly NodoDelArbol[] {
  switch (nodo.tipo) {
    case 'bloque':
      return nodo.elementos;
    case 'impresion':
      return nodo.argumento === null ? SIN_HIJOS : [nodo.argumento];
    case 'retorno':
      return nodo.valor === null ? SIN_HIJOS : [nodo.valor];
    case 'sentencia-expresion':
      return [nodo.expresion];
    case 'if':
      return nodo.sino === null ? [nodo.condicion, nodo.entonces] : [nodo.condicion, nodo.entonces, nodo.sino];
    case 'while':
      return [nodo.condicion, nodo.cuerpo];
    case 'do-while':
      return [nodo.cuerpo, nodo.condicion];
    case 'for':
      return [
        ...(nodo.inicializacionDeclaracion === null ? SIN_HIJOS : [nodo.inicializacionDeclaracion]),
        ...nodo.inicializacionExpresiones,
        ...(nodo.condicion === null ? SIN_HIJOS : [nodo.condicion]),
        ...nodo.actualizacion,
        nodo.cuerpo,
      ];
    case 'switch':
      return [nodo.selector, ...nodo.elementos];
    case 'etiqueta-case':
      return [nodo.valor];
    case 'declaracion-local':
      return nodo.declaradores;
    case 'declarador':
      return nodo.inicializador === null ? SIN_HIJOS : [nodo.inicializador];
    case 'binaria':
      return [nodo.izquierda, nodo.derecha];
    case 'unaria':
    case 'incremento-decremento':
    case 'conversion':
      return [nodo.operando];
    case 'asignacion':
      return [nodo.objetivo, nodo.valor];
    case 'llamada':
      return [nodo.callee, ...nodo.argumentos];
    case 'acceso-miembro':
      return [nodo.objeto];
    case 'nueva-instancia':
      return nodo.argumentos;
    case 'sentencia-vacia':
    case 'break':
    case 'continue':
    case 'no-soportado':
    case 'etiqueta-default':
    case 'literal-entero':
    case 'literal-largo':
    case 'literal-doble':
    case 'literal-caracter':
    case 'literal-cadena':
    case 'literal-booleano':
    case 'nombre':
    case 'expresion-no-soportada':
      return SIN_HIJOS;
    default: {
      const noContemplado: never = nodo;
      return noContemplado;
    }
  }
}

interface NodoConNivel {
  readonly nodo: NodoDelArbol;
  readonly nivel: number;
}

/**
 * Recorre el árbol de `main` en el orden del texto (preorden) con una pila explícita y le avisa a `alVisitar` de cada nodo y su nivel; si devuelve `true`, el recorrido se detiene ahí.
 * El cuerpo de `main` es el nivel 0. Un programa sin `main` no tiene nada que recorrer: lo que no se parsea (los miembros que se delimitan sin leerlos) no tiene hijos.
 */
function recorrer(programa: NodoPrograma, alVisitar: (nodo: NodoDelArbol, nivel: number) => boolean): void {
  const main = programa.clase.main;
  if (main === null) return;
  const pila: NodoConNivel[] = [{ nodo: main.cuerpo, nivel: 0 }];
  while (pila.length > 0) {
    const { nodo, nivel } = pila.pop()!;
    if (alVisitar(nodo, nivel)) return;
    const hijos = hijosDe(nodo);
    for (let i = hijos.length - 1; i >= 0; i -= 1) pila.push({ nodo: hijos[i]!, nivel: nivel + 1 });
  }
}

/** La profundidad del nodo más hondo del árbol de `main` (su cuerpo es el nivel 0). Pura y no recursiva. */
export function profundidadMaximaDelArbol(programa: NodoPrograma): number {
  let maxima = 0;
  recorrer(programa, (_nodo, nivel) => {
    if (nivel > maxima) maxima = nivel;
    return false;
  });
  return maxima;
}

/** El primer nodo (en el orden del texto) cuyo nivel pasa de `limite`, con su rango, o `null` si el árbol cabe. Pura y no recursiva; se detiene en cuanto lo encuentra. */
export function primerNodoMasProfundoQue(programa: NodoPrograma, limite: number): { readonly rango: Rango } | null {
  let exceso: { readonly rango: Rango } | null = null;
  recorrer(programa, (nodo, nivel) => {
    if (nivel <= limite) return false;
    exceso = { rango: nodo.rango };
    return true;
  });
  return exceso;
}
