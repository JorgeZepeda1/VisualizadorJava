// Tarea 2.8 (parte regional, ADR 012, design.md §4.7, REQ-BIB-010): UN solo modelo regional para toda la ejecución. `es-MX` (por omisión) es idéntico a `en_US` en separadores; la opción
// «coma» es una JVM `es_ES` COMPLETA: lee con coma y escribe con coma, nunca una mezcla. Solo lo consumen `Scanner` y `Formatter`; `Double.toString`, `println(double)`, `String.valueOf`
// y la concatenación jamás (Java tampoco). Los símbolos los generó `DecimalFormatSymbols` del JDK real (ADR 010).
import { SIMBOLOS_REGIONALES, type SimbolosRegionales } from '../datos/regional.generado.ts';

export type Regional = 'es-MX' | 'es-ES';

export type { SimbolosRegionales };

export function simbolosRegionales(regional: Regional): SimbolosRegionales {
  return SIMBOLOS_REGIONALES[regional];
}
