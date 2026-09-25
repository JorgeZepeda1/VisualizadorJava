# ADR 009 — `Math.pow` con un puerto de fdlibm y ninguna función aproximada de JS

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `design.md` §4.4 y §8; `exploration.md` §4.2; ADR 016

## Contexto

El `Math.pow` de V8 difiere del JDK en 1 083 de 26 336 pares (4.1 %), incluido `Math.pow(10, -4)` (`1.0E-4` en Java, `9.999999999999999E-5` en V8). En la máquina de referencia `Math.pow` coincide con `StrictMath.pow` (fdlibm) en 26 336/26 336 pares. ECMA-262 deja `**`, `pow`, `exp`, `log`, `sin`… «aproximadas por la implementación». En x86_64 (laptops Windows) HotSpot podría usar otra implementación; eso no se ha medido.

## Decisión

1. Portar `e_pow.c` de fdlibm 5.3 (netlib, © Sun Microsystems 1993, aviso permisivo) a TypeScript conservando el aviso al inicio del archivo y en `AVISOS-DE-TERCEROS.md`. Se manipulan las palabras de 32 bits con `DataView` y se usan solo operaciones binary64 (JS nunca fusiona multiplicación y suma).
2. **Nunca** se porta desde OpenJDK (`FdLibm.java`, GPLv2+CE).
3. Regla de lint en `src/motor`: prohibidos `Math.pow/exp/expm1/log*/sin/cos/tan/asin/acos/atan*/sinh/cosh/tanh/cbrt/hypot` y el operador `**`.
4. `sqrt`, `floor`, `ceil`, `abs`, `max`, `min` y `round` salen de JS o de reglas exactas, siempre validados con conjuntos del JDK en los tres navegadores.
5. El riesgo de x86_64 se mide (§8 del diseño) sin cambiar la semántica: la verdad es la máquina de referencia (D3).

## Alternativas consideradas

- **`Math.pow` de JS:** incorrecto en 4.1 % de los pares, incluidos valores de salón.
- **Potencia exacta en `BigInt` con redondeo correcto:** difiere de fdlibm justo donde fdlibm no redondea correctamente.
- **Otra libm (p. ej. musl):** no es idéntica a fdlibm en todos los casos.

## Consecuencias

- Positivas: resultados idénticos al JDK de referencia; licencia compatible con MIT.
- Negativas: unas 300 líneas portadas con cuidado; se prueban con ≥ 26 000 pares y la rejilla de salón.
