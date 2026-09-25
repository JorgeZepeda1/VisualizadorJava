// Rango de desplazamientos (offsets UTF-16, igual que String.prototype.length) dentro del código
// fuente. design.md §1.2 y §2.2 (Problema.rango). Definición de tipos pura — sin lógica propia,
// se ejercita indirectamente en tabla-de-lineas.test.ts y analizador-lexico.test.ts.
export interface Rango {
  readonly inicio: number;
  readonly fin: number;
}
