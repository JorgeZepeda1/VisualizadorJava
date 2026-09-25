# ADR 004 — Compilación en pasadas que reproducen el orden de javac

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `design.md` §2.1–2.2, §2.7; ADR 003, 010

## Contexto

La propuesta exige el mismo veredicto que javac y la línea del primer error igual en ≥ 95 % de los mutantes (C7). Verificado en diseño con Temurin 17.0.18: javac solo informa errores de la **primera fase que falla**. Un error de sintaxis (incluido `integer number too large`) oculta los de atribución aunque estén antes en el texto; un error de atribución oculta los de flujo; y dentro del flujo, todas las sentencias inalcanzables se informan antes que las variables sin inicializar. Ejemplo: `println(x)` sin inicializar en la línea 3 y `int y = "hola";` en la 4 → javac solo informa la 4. Informar «el primer error del texto» fallaría C7.

## Decisión

1. Pasadas en orden: **(1)** léxico + sintaxis, **(2)** atribución (símbolos, tipos, sobrecargas, constantes, alcance y sombreado, `switch`), **(3)** alcanzabilidad (JLS 14.22), **(4)** asignación definitiva (JLS 16), **(5)** arranque (lo que rechaza el lanzador).
2. Se informa el primer problema de la **primera pasada que falla**. En las pasadas 1 y 2 compiten por posición en el texto el primer error y los avisos de lo no soportado; si hubo avisos, no corren 3 ni 4 (no son confiables sobre construcciones desconocidas).
3. Lo que depende de algo no soportado recibe el tipo `desconocido`, que suprime errores en cascada.
4. Cada error lleva la **clave de diagnóstico de javac** (`compiler.err.cant.resolve.location`, …) y la línea; las pruebas comparan ambas con el oráculo (`javax.tools`).
5. El error de arranque es categoría propia y se muestra como una excepción: mensaje amable primero y el texto exacto del lanzador como detalle (decisión del orquestador).

## Alternativas consideradas

- **Una sola pasada con el primer error por posición:** más simple; contradice a javac en los casos medidos.
- **Varios errores a la vez:** fuera de alcance (propuesta §9) y confuso para principiantes (cascadas de javac).

## Consecuencias

- Positivas: veredicto y línea fieles por construcción; mensajes comparables automáticamente.
- Negativas: cuatro recorridos del árbol (costo despreciable); depende del catálogo de firmas del JDK (ADR 010).
