// AST de la rebanada vertical (design.md §1.2, §2.3): Programa→Clase→Main→Bloque→println(literal).
// El resto de la gramática (expresiones Pratt, sentencias completas, NO-DISP…) llega en el lote 1
// (tareas 1.2-1.6); este subconjunto es una porción real y compatible de esa gramática, no un
// formato aparte. Definición de tipos pura — se ejercita en analizador-sintactico.test.ts.
import type { Rango } from '../fuente/rango.ts';

export interface NodoPrograma {
  readonly tipo: 'programa';
  readonly clase: NodoClase;
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
  readonly sentencias: readonly NodoSentencia[];
  readonly rango: Rango;
}

// Lote 1 (tarea 1.5) amplía esta unión con el resto de Sentencia (if/while/for/switch…).
export type NodoSentencia = NodoImpresion;

export interface NodoImpresion {
  readonly tipo: 'impresion';
  readonly argumento: NodoLiteralCadena;
  readonly rango: Rango;
}

export interface NodoLiteralCadena {
  readonly tipo: 'literal-cadena';
  readonly valor: string;
  readonly rango: Rango;
}
