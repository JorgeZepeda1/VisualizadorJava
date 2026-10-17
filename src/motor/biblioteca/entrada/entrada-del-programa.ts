// La entrada estándar del programa (tarea 2.12, ADR 005 punto 4): todo lo que se ha «tecleado» hasta ahora (`texto`) y hasta dónde ha leído `Scanner` (`cursor`). La biblioteca es su dueña:
// `ScannerJava` lee de aquí y avanza `cursor`; el intérprete (el director de la ejecución) agrega renglones —los de `entradaPreparada` o los que llegan con `darEntrada`— y marca
// `cerrada` al agotarse (EOF). Una lectura que necesita más datos con `cerrada === false` lanza `FaltaEntrada`; con `cerrada === true` lanza `NoSuchElementException`.
// El texto solo crece y el EOF no se deshace; lo único que el intérprete devuelve al reintentar una sentencia es `cursor` (su instantánea).
export class EntradaDelPrograma {
  texto = '';
  cursor = 0;
  cerrada = false;

  agregar(renglon: string): void {
    this.texto += renglon;
  }

  cerrar(): void {
    this.cerrada = true;
  }
}
