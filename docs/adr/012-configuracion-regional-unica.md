# ADR 012 — Configuración regional única: `es-MX` por omisión y `es-ES` completa como opción

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); orquestador (P2); PO al aprobar el plan
- **Relacionadas**: `design.md` §4.6–4.7; propuesta D5 y P2

## Contexto

D5 fija el punto decimal (`es_MX`) y deja la coma como opción. P2, decidida por el orquestador, exige que la opción emule una JVM `es_ES` **completa**: `Scanner` acepta `3,5` y rechaza `3.5`, y `printf` imprime `3,50`. Solo `Scanner` y `Formatter` dependen del *locale*; `Double.toString`, `println(double)`, `String.valueOf` y la concatenación no.

## Decisión

1. Un solo objeto `Regional { id, decimal, miles, menos, nan, infinito }`, con valores **generados** de `DecimalFormatSymbols` del JDK (ADR 010), viaja en `ConfigEjecucion`.
2. Lo consumen solo `Scanner` (`nextInt`/`nextDouble`: agrupación, separador decimal, `NaN`, `∞`) y `Formatter` (`%f`, `%,d`, `%,.2f`…). Nada más lo lee.
3. En la interfaz, un interruptor «Coma decimal (como una JVM en España)»; en el enlace, `regional=es-ES`.
4. Goldens y conjuntos de `es-ES` generados con `-Duser.language=es -Duser.country=ES`.

## Alternativas consideradas

- **Coma solo en la entrada:** sería un resultado inventado (ninguna JVM se comporta así).
- **Banderas separadas por API:** combinaciones que no existen en Java.

## Consecuencias

- Positivas: fiel a una JVM real en ambos modos; un solo punto de verdad.
- Negativas: dos juegos de goldens para programas sensibles al *locale*.
