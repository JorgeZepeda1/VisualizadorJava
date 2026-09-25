# ADR 005 — Intérprete: sentencias en generadores, expresiones directas y lectura con reintento

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `design.md` §3.1–3.3; `exploracion/05` §3; ADR 006, 007

## Contexto

La exploración recomienda un intérprete de AST con generadores. Hay que cumplir 100 000 pasos Normal en ≤ 1 s con CPU ×4 (C11), detener el programa cuando `Scanner` espera datos aunque la lectura esté dentro de una expresión (`int t = sc.nextInt() + sc.nextInt();`) y dar al paso Detallado el valor de cada subexpresión. Dos implementaciones de la semántica (una para Normal y otra para Detallado o para expresiones con lectura) serían una fuente de diferencias con Java.

## Decisión

1. El semántico baja el AST a una **IR tipada**: operaciones ya resueltas por tipo, ranuras de locales, llamadas a funciones de biblioteca, conversiones implícitas como nodos visibles y un **plan de evaluación** por expresión (sus puntos en el orden de Java).
2. Cada **sentencia** se ejecuta en una función generadora que cede un `Paso` por paso Normal; los bloques delegan con `yield*` y devuelven su terminación (`normal`, `break`, `continue`, `return`).
3. Las **expresiones** se evalúan con una función recursiva directa (sin generadores) que anota el valor de cada punto del plan. El Detallado se deriva de esos valores: no es otro modo del intérprete.
4. **Lectura con reintento:** si `Scanner` no tiene datos lanza `FaltaEntrada`; la sentencia (solo las que el semántico marca `leeEntrada` toman instantánea: ranuras que puede tocar, cursor del `Scanner`, estados de `Random`, registro del paso) se restaura, consume un renglón preparado o cede `necesita-entrada`, y se ejecuta de nuevo.
5. Un director (`Ejecucion.avanzar`) reanuda el generador, cuenta pasos, aplica límites y convierte `ExcepcionJava` en el paso final.

## Alternativas consideradas

- **Generadores también en expresiones:** varias veces más objetos por paso y dos caminos de evaluación.
- **Máquina de pila con código intermedio:** instantáneas triviales y más velocidad, pero hay que mantener el mapa instrucción ↔ rango y reconstruir el árbol para el Detallado.
- **Ejecutar de corrido sin pausas:** imposible con entrada interactiva.

## Consecuencias

- Positivas: una sola semántica; rapidez; la traza interactiva y la preparada son idénticas con los mismos renglones (propiedad que se prueba).
- Negativas: una sentencia con lectura puede ejecutarse dos veces (determinista y acotado); la instantánea debe cubrir todo el estado mutable (prueba de propiedad).
