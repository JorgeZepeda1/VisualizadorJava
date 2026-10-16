// 2^n EXACTA, armada con los bits del `double` (ECMA-262 deja `2 ** n` «aproximado por la implementación» y la regla de ESLint de `src/motor` lo prohíbe, tarea 2.6).
// De -1022 a 1023 es un normal (exponente sesgado, mantisa en cero); de -1074 a -1023 es un subnormal (un solo bit en la mantisa); fuera de ese rango, 0 o Infinity.
const VISTA = new DataView(new ArrayBuffer(8));
const MENOR_EXPONENTE_NORMAL = -1022;
const MAYOR_EXPONENTE = 1023;
const MENOR_EXPONENTE_SUBNORMAL = -1074;
const SESGO = 1023n;

export function potenciaDeDos(exponente: number): number {
  if (exponente > MAYOR_EXPONENTE) return Infinity;
  if (exponente < MENOR_EXPONENTE_SUBNORMAL) return 0;
  const bits = exponente >= MENOR_EXPONENTE_NORMAL ? (BigInt(exponente) + SESGO) << 52n : 1n << BigInt(exponente - MENOR_EXPONENTE_SUBNORMAL);
  VISTA.setBigUint64(0, bits);
  return VISTA.getFloat64(0);
}
