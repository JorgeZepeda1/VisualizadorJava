# ADR 008 — `Double.toString` y `printf` por comportamiento, sobre un generador de dígitos propio

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `design.md` §4.2–4.3; `exploration.md` §4.1; `exploracion/02` §3 y §8; ADR 010, 016

## Contexto

JDK 17 usa el `FloatingDecimal` antiguo, que no siempre da el decimal más corto. La exploración midió la banda de enteros [2⁵³, 2⁶³) y un residual. En esta fase se midieron tres clases más que el conjunto de 45 293 casi no contenía: **empates en el borde** (3 885 de 149 985 decimales cortos, todos empates, exponentes binarios 71–85: `1e23 → 9.999999999999999E22`), **potencias de dos** (366 de 2 098; un ciclo que divide entre 2 difiere en 2⁻²⁴ y 2⁻³¹) y **subnormales** (26 de 20 104; `Double.MIN_VALUE → 4.9E-324`). `printf %.Nf` redondea HALF_UP sobre esos mismos dígitos. ECMA-262 fija la longitud mínima del más corto, pero no el último dígito, y el código de OpenJDK es GPLv2+CE.

## Decisión

1. Un solo módulo `digitosJava(x)` alimenta `Double.toString`, `println`, `String.valueOf`, la concatenación, el plegado de constantes y `printf`/`String.format`.
2. Casos, en orden: especiales (`NaN`, infinitos, `±0.0`); subnormales (`MIN_VALUE` exacto; el resto con la regla que caracterice el lote 2 o **aviso en ejecución** si no se logra al 100 %); banda de enteros (dígitos exactos menos k con HALF_UP, k = 0/1/2 por exponente 53–57/58–60/61–62); potencias de dos (redondeo del valor exacto con el mínimo de dígitos dentro de x ± 2^(e−54), en `BigInt`); resto de normales con los dígitos más cortos del motor JS **corregidos** al candidato más cercano (comparación exacta en `BigInt`, empate al dígito par) y, si `|x| ≥ 2⁶³` y el candidato es empate en el borde, el valor exacto HALF_UP al mínimo número de dígitos estrictamente dentro.
3. Formato de Java: decimal si 10⁻³ ≤ |x| < 10⁷, si no `d.ddd…E±n`.
4. `printf`: HALF_UP mirando un solo dígito en la precisión y relleno con ceros; nunca `toFixed`.
5. Residual documentado con su frecuencia medida (`0x453d04ffce09b504`); todo validado con conjuntos del oráculo (salón, aleatorio denso, banda, empates, potencias de dos, subnormales).

## Alternativas consideradas

- **Portar `FloatingDecimal`/`FDBigInteger`:** fidelidad total, pero es GPLv2+CE: prohibido.
- **Ryu o Schubfach propios:** dan el más corto, que no es lo que imprime Java; habría que agregarles las mismas reglas.
- **Dígitos del motor sin corrección:** el último dígito podría variar entre motores y no cubre empates ni potencias de dos.

## Consecuencias

- Positivas: camino rápido nativo en el caso común; resultado idéntico en Chromium, Firefox y WebKit; ningún código de OpenJDK.
- Negativas: reglas empíricas que dependen de conjuntos densos; C4 debe reformularse; queda un residual documentado.
