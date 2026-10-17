// Tarea 2.4 (REQ-BIB-002, ADR 008, design.md §4.2 pasos 1 y 6): `Double.toString` de JDK 17 — `println(double)`, `String.valueOf(double)` y la concatenación de un `double`
// con un `String` pasan por aquí. El formato jamás depende del modelo regional (§4.7): el punto decimal siempre es `.`, aun con la opción «coma».
import { digitosJava } from './digitos-java.ts';

/** `10^-3 ≤ |x| < 10^7` se escribe en decimal simple; fuera de ese rango, en notación científica `d.dddE±n`. */
const EXPONENTE_DECIMAL_MINIMO = -3;
const EXPONENTE_DECIMAL_MAXIMO = 6;

/** `Double.toString(x)`: especiales primero (el signo de `-0.0` sale del bit 63, no de una comparación), luego los dígitos de `digitosJava` con el formato de Java. */
export function doubleATexto(x: number): string {
  if (Number.isNaN(x)) return 'NaN';
  if (x === Infinity) return 'Infinity';
  if (x === -Infinity) return '-Infinity';
  if (x === 0) return Object.is(x, -0) ? '-0.0' : '0.0';
  const signo = x < 0 ? '-' : '';
  const { digitos, exponente } = digitosJava(Math.abs(x));
  if (exponente < EXPONENTE_DECIMAL_MINIMO || exponente > EXPONENTE_DECIMAL_MAXIMO) {
    const resto = digitos.length > 1 ? digitos.slice(1) : '0';
    return `${signo}${digitos[0]}.${resto}E${exponente}`;
  }
  if (exponente >= 0) {
    const parteEntera = digitos.length > exponente + 1 ? digitos.slice(0, exponente + 1) : digitos.padEnd(exponente + 1, '0');
    const parteFraccionaria = digitos.length > exponente + 1 ? digitos.slice(exponente + 1) : '0';
    return `${signo}${parteEntera}.${parteFraccionaria}`;
  }
  return `${signo}0.${'0'.repeat(-exponente - 1)}${digitos}`;
}
