// Regla local de ESLint: en `src/motor` no se usan las funciones de `Math` que ECMA-262 deja «aproximadas por la implementación» ni el operador `**` sobre números (tarea 2.6, ADR 009,
// design.md §4.4). Cada motor de JavaScript (V8, SpiderMonkey, JavaScriptCore) puede dar un último dígito distinto, y Java no: `Math.pow(10, -4)` es `1.0E-4` en Java y `9.999999999999999E-5`
// en V8. Lo exacto vive en `biblioteca/matematicas` (`pow` es «No disponible» hasta portar fdlibm). `**` entre `BigInt` es exacto y se permite. Solo reglas del propio ESLint, sin dependencias.

import type { Linter } from 'eslint';

/** Las funciones de `Math` cuyo resultado no está fijado bit a bit por ECMA-262 (las que sí lo están: `floor ceil sqrt abs max min fround imul round trunc sign clz32`). */
export const FUNCIONES_APROXIMADAS_DE_MATH: readonly string[] = [
  'pow',
  'exp',
  'expm1',
  'log',
  'log10',
  'log1p',
  'log2',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'sinh',
  'cosh',
  'tanh',
  'asinh',
  'acosh',
  'atanh',
  'cbrt',
  'hypot',
];

const MENSAJE_DEL_OPERADOR =
  'El operador `**` entre números es «aproximado por la implementación» en ECMA-262 y puede dar otro último dígito que Java. Usa `biblioteca/matematicas` (exacto) o, entre `BigInt`, `10n ** 3n` (sí se permite).';

/** Selectores de `no-restricted-syntax` para `**` y `**=` con operandos que no son `BigInt` (un literal `10n` en la base lo marca como exacto). */
export const SELECTORES_DE_OPERADOR_DE_POTENCIA: readonly { readonly selector: string; readonly message: string }[] = [
  { selector: 'BinaryExpression[operator="**"]:not([left.bigint])', message: MENSAJE_DEL_OPERADOR },
  { selector: 'AssignmentExpression[operator="**="]', message: MENSAJE_DEL_OPERADOR },
];

/** La regla `no-restricted-properties`: `Math.<función aproximada>`. */
export const REGLA_DE_FUNCIONES_APROXIMADAS: Linter.RuleEntry = [
  'error',
  ...FUNCIONES_APROXIMADAS_DE_MATH.map((property) => ({
    object: 'Math',
    property,
    message: `Math.${property} es «aproximada por la implementación» en ECMA-262: otro motor puede dar otro último dígito que Java. Usa \`biblioteca/matematicas\` (tarea 2.6, ADR 009).`,
  })),
];
