// Tabla de rangos de puntos de código con búsqueda binaria (tarea 1.29): la forma compacta en que el
// oráculo entrega qué puntos de código puede llevar un identificador de Java
// (`biblioteca/datos/identificadores-java.generado.ts`) — "24,41-5a,5f" en hexadecimal, un solo punto
// ("5f") o un rango ("41-5a"), ordenados y sin traslape.
export interface TablaDeRangos {
  /** ¿`puntoDeCodigo` cae en algún rango de la tabla? */
  contiene(puntoDeCodigo: number): boolean;
}

export function crearTablaDeRangos(texto: string): TablaDeRangos {
  const limites: number[] = []; // [desde0, hasta0, desde1, hasta1, ...]
  for (const rango of texto.split(',')) {
    const [desde, hasta] = rango.split('-') as [string, string?];
    const inicio = Number.parseInt(desde, 16);
    limites.push(inicio, hasta === undefined ? inicio : Number.parseInt(hasta, 16));
  }
  const cantidad = limites.length / 2;
  return {
    contiene(puntoDeCodigo: number): boolean {
      let bajo = 0;
      let alto = cantidad - 1;
      while (bajo <= alto) {
        const medio = (bajo + alto) >> 1;
        if (puntoDeCodigo < limites[2 * medio]!) alto = medio - 1;
        else if (puntoDeCodigo > limites[2 * medio + 1]!) bajo = medio + 1;
        else return true;
      }
      return false;
    },
  };
}
