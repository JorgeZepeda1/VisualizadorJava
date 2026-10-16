// El puerto se arma con una tabla por clase de Java (`Scanner`, `String`, `Math`…). Una clave en dos tablas sería una operación pisada en silencio por la otra: aquí lanza.
import type { OperacionDeBiblioteca } from '../puerto-biblioteca.ts';

export function unirOperaciones(tablas: readonly ReadonlyMap<string, OperacionDeBiblioteca>[]): Map<string, OperacionDeBiblioteca> {
  const unido = new Map<string, OperacionDeBiblioteca>();
  for (const tabla of tablas) {
    for (const [clave, operacion] of tabla) {
      if (unido.has(clave)) throw new Error(`la operación ${clave} está registrada en dos tablas del puerto`);
      unido.set(clave, operacion);
    }
  }
  return unido;
}
