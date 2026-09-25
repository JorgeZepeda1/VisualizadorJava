// Traduce un desplazamiento (offset) del código fuente a línea/columna 1-based (design.md §1.2,
// "la misma [línea] que javac" — §2.2). Se usa para que los Problema y los Token lleven la línea
// real del error, calibrada con javac (design.md §2.6 "Posiciones calibradas con javac").
export class TablaDeLineas {
  private readonly iniciosDeLinea: readonly number[];

  constructor(fuente: string) {
    const inicios = [0];
    for (let indice = 0; indice < fuente.length; indice++) {
      if (fuente[indice] === '\n') {
        inicios.push(indice + 1);
      }
    }
    this.iniciosDeLinea = inicios;
  }

  /** Línea y columna 1-based del desplazamiento dado. */
  ubicar(desplazamiento: number): { linea: number; columna: number } {
    let bajo = 0;
    let alto = this.iniciosDeLinea.length - 1;
    while (bajo < alto) {
      const medio = Math.ceil((bajo + alto) / 2);
      if (this.iniciosDeLinea[medio] <= desplazamiento) {
        bajo = medio;
      } else {
        alto = medio - 1;
      }
    }
    const inicioDeLinea = this.iniciosDeLinea[bajo];
    return { linea: bajo + 1, columna: desplazamiento - inicioDeLinea + 1 };
  }
}
