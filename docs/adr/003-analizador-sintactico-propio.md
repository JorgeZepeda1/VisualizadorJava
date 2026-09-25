# ADR 003 — Analizador sintáctico propio que reconoce lo no soportado

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `design.md` §2.3–2.6; `exploracion/05` §1; ADR 004

## Contexto

El subconjunto es U3–U7. Se necesitan mensajes en español con la línea de javac, rangos exactos por subexpresión y, sobre todo, **reconocer** lo que Java acepta pero el visualizador no cubre para avisarlo sin reinterpretarlo (D2) y sin dar jamás un error de sintaxis engañoso (C8). `java-parser` fue abandonado por su autor; `@lezer/java` está hecho para tolerar errores; tree-sitter y ANTLR analizan todo Java y exigirían una segunda pasada.

## Decisión

1. Léxico, descenso recursivo para sentencias y Pratt para expresiones, escritos a mano y sin dependencias (gramática y precedencias en el diseño).
2. **Reconocedores** para una lista cerrada de construcciones fuera del alcance (léxicas, sintácticas y de atribución, tabla del diseño): cada uno delimita la construcción con una subgramática permisiva, crea un nodo `NoSoportado { codigo, rango }` y deja seguir, de modo que se encuentra el primer problema en el orden del texto.
3. En cada punto de error se pregunta primero si el token que falla abre una construcción válida de Java fuera del alcance; si sí, es aviso.
4. Posiciones calibradas con javac («X expected» al final del token anterior; literales sin cerrar en su inicio); se informa solo el primer error.
5. Respaldo si la recuperación a mano sale cara: `web-tree-sitter` + `tree-sitter-java` (WASM, sin COOP/COEP), filtrando lo no soportado en una pasada aparte.

## Alternativas consideradas

- `java-parser`/Chevrotain: abandonado; mensajes en inglés orientados al JLS.
- `@lezer/java`: optimizado para no fallar nunca, lo opuesto a lo que se necesita.
- tree-sitter o ANTLR: gramática completa (buena recuperación), pero hay que traducir su árbol, construir los mensajes y filtrar lo no soportado; más peso.

## Consecuencias

- Positivas: control total de mensajes y rangos; cero dependencias en el motor; lo no soportado nace en el mismo lugar donde se detecta.
- Negativas: la gramática y la lista de reconocedores se mantienen a mano; se prueban con una muestra por construcción (C8) y con ≥ 2 000 mutantes contra javac (C7).
