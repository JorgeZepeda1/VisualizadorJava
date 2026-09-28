// AST del subconjunto (design.md §1.2, §2.3, §2.4). Nace en la rebanada vertical (0.12) con
// Programa→Clase→Main→Bloque→println(literal); el lote 1 (tareas 1.1-1.4) amplía con
// importaciones, las 3 formas de `main`, `return;`, declaraciones locales y expresiones completas
// (Pratt, con NO-DISP para lo que Java acepta y este visualizador todavía no — ADR 003). El resto
// de Sentencia (if/while/for/switch/ExprSentencia como sentencia/break/continue) llega en la tarea
// 1.5, que reorganiza `NodoElementoBloque`/`NodoSentencia`.
import type { Rango } from '../fuente/rango.ts';

export interface NodoPrograma {
  readonly tipo: 'programa';
  readonly importaciones: readonly NodoImportacion[];
  readonly clase: NodoClase;
  readonly rango: Rango;
}

export interface NodoImportacion {
  readonly tipo: 'importacion';
  /** P.ej. "java.util.Scanner" o "java.util" (sin el ".*" final). */
  readonly nombre: string;
  readonly comodin: boolean;
  readonly rango: Rango;
}

export interface NodoClase {
  readonly tipo: 'clase';
  readonly nombre: string;
  readonly main: NodoMain;
  readonly rango: Rango;
}

export interface NodoMain {
  readonly tipo: 'main';
  readonly parametro: string;
  readonly cuerpo: NodoBloque;
  readonly rango: Rango;
}

export interface NodoBloque {
  readonly tipo: 'bloque';
  readonly elementos: readonly NodoElementoBloque[];
  readonly rango: Rango;
}

// design.md §2.3: "Bloque = '{' { DeclLocal ';' | Sentencia } '}'" — DeclLocal es un elemento del
// bloque, no una Sentencia. Tarea 1.5 amplía `NodoSentencia` con el resto (if/while/for/switch/…).
export type NodoElementoBloque = NodoDeclaracionLocal | NodoSentencia;

export type NodoSentencia = NodoImpresion | NodoRetorno;

export interface NodoImpresion {
  readonly tipo: 'impresion';
  readonly argumento: NodoLiteralCadena;
  readonly rango: Rango;
}

export interface NodoRetorno {
  readonly tipo: 'retorno';
  readonly rango: Rango;
}

export interface NodoDeclaracionLocal {
  readonly tipo: 'declaracion-local';
  readonly esFinal: boolean;
  /** 'int' | 'long' | 'double' | 'boolean' | 'char' | un nombre de tipo por referencia (String, Scanner, Random…). */
  readonly nombreTipo: string;
  readonly declaradores: readonly NodoDeclarador[];
  readonly rango: Rango;
}

export interface NodoDeclarador {
  readonly tipo: 'declarador';
  readonly nombre: string;
  readonly inicializador: NodoExpresion | null;
  readonly rango: Rango;
}

// ---- Expresiones (tareas 1.3 Pratt, 1.4 ambigüedades) ----

export type NodoExpresion =
  | NodoLiteralEntero
  | NodoLiteralLargo
  | NodoLiteralDoble
  | NodoLiteralCaracter
  | NodoLiteralCadena
  | NodoLiteralBooleano
  | NodoNombre
  | NodoBinaria
  | NodoUnaria
  | NodoAsignacion
  | NodoIncrementoDecremento
  | NodoLlamada
  | NodoAccesoMiembro
  | NodoNuevaInstancia
  | NodoConversion
  | NodoExpresionNoSoportada;

export interface NodoLiteralEntero {
  readonly tipo: 'literal-entero';
  readonly valor: bigint;
  readonly rango: Rango;
}

export interface NodoLiteralLargo {
  readonly tipo: 'literal-largo';
  readonly valor: bigint;
  readonly rango: Rango;
}

export interface NodoLiteralDoble {
  readonly tipo: 'literal-doble';
  readonly valor: number;
  readonly rango: Rango;
}

export interface NodoLiteralCaracter {
  readonly tipo: 'literal-caracter';
  readonly valor: string;
  readonly rango: Rango;
}

export interface NodoLiteralCadena {
  readonly tipo: 'literal-cadena';
  readonly valor: string;
  readonly rango: Rango;
}

export interface NodoLiteralBooleano {
  readonly tipo: 'literal-booleano';
  readonly valor: boolean;
  readonly rango: Rango;
}

/** Una referencia por nombre: variable, o el inicio de una cadena `objeto.miembro`. */
export interface NodoNombre {
  readonly tipo: 'nombre';
  readonly nombre: string;
  readonly rango: Rango;
}

export interface NodoBinaria {
  readonly tipo: 'binaria';
  readonly operador: string;
  readonly izquierda: NodoExpresion;
  readonly derecha: NodoExpresion;
  readonly rango: Rango;
}

export interface NodoUnaria {
  readonly tipo: 'unaria';
  readonly operador: '+' | '-' | '!';
  readonly operando: NodoExpresion;
  readonly rango: Rango;
}

export interface NodoAsignacion {
  readonly tipo: 'asignacion';
  readonly operador: '=' | '+=' | '-=' | '*=' | '/=' | '%=';
  readonly objetivo: NodoExpresion;
  readonly valor: NodoExpresion;
  readonly rango: Rango;
}

export interface NodoIncrementoDecremento {
  readonly tipo: 'incremento-decremento';
  readonly operador: '++' | '--';
  readonly posicion: 'prefijo' | 'postfijo';
  readonly operando: NodoExpresion;
  readonly rango: Rango;
}

export interface NodoLlamada {
  readonly tipo: 'llamada';
  readonly callee: NodoExpresion;
  readonly argumentos: readonly NodoExpresion[];
  readonly rango: Rango;
}

export interface NodoAccesoMiembro {
  readonly tipo: 'acceso-miembro';
  readonly objeto: NodoExpresion;
  readonly miembro: string;
  readonly rango: Rango;
}

export interface NodoNuevaInstancia {
  readonly tipo: 'nueva-instancia';
  readonly nombreTipo: string;
  readonly argumentos: readonly NodoExpresion[];
  readonly rango: Rango;
}

/** Cast: `(Tipo) operando`. A tipo primitivo (design §2.4 nivel 13) o a tipo por referencia (la
 * validez del tipo referenciado la decide atribución, tarea 1.7+ — aquí solo sintaxis, ADR 003). */
export interface NodoConversion {
  readonly tipo: 'conversion';
  readonly nombreTipo: string;
  readonly operando: NodoExpresion;
  readonly rango: Rango;
}

/** Una construcción de expresión que Java sí acepta pero este visualizador todavía no (ADR 003):
 * bits/desplazamientos, ternario, `instanceof`, acceso a arreglo, referencia a método, `~`,
 * asignaciones compuestas de bits. Envuelve el tramo completo, respetando la precedencia real, para
 * que el análisis pueda seguir después sin dar un error de sintaxis engañoso (C8). */
export interface NodoExpresionNoSoportada {
  readonly tipo: 'expresion-no-soportada';
  readonly codigo: string;
  readonly rango: Rango;
}
