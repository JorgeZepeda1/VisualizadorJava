# ADR 006 — Traza por deltas reversibles con puntos de control, en manos de la interfaz

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `design.md` §3.3–3.4; `exploracion/05` §5; ADR 005, 007

## Contexto

La interfaz debe retroceder en el tiempo, saltar a cualquier paso de una traza de 100 000 en ≤ 200 ms y cambiar de paso en ≤ 100 ms (C11), derivar la prueba de escritorio (M12) y mostrar el Detallado. La compartición estructural (p. ej. `immer`) se pierde al cruzar `postMessage`, y el trabajador puede terminarse a la fuerza (ADR 007).

## Decisión

1. El trabajador envía `Paso` compactos: clase, nodo, valores alineados con el plan de evaluación, cambios con valor **anterior** y nuevo (y el punto del plan donde ocurrieron), segmentos de consola, avance del `Scanner` y datos de control (resultado, vuelta, caso, si es predecible).
2. La **interfaz guarda la traza** en `motor/traza/traza.ts` (código puro compartido con las pruebas): punto de control cada 256 pasos; `estadoEn(n)` = punto de control + ≤ 255 deltas; avanzar o retroceder uno aplica o deshace un delta.
3. El alcance de las variables se deriva de la estructura estática (Java prohíbe el sombreado de locales, así que un nombre identifica a lo más una variable viva); «sin inicializar» es dinámico.
4. La prueba de escritorio y la consola son índices incrementales sobre la misma traza y se pintan virtualizadas.

## Alternativas consideradas

- **Instantánea completa por paso:** simple, pero memoria y clonación proporcionales al estado en cada paso.
- **El trabajador como servidor de vistas:** traza en un solo lugar, pero navegación asíncrona y traza perdida si hay que terminarlo.
- **Estructuras persistentes con compartición:** la compartición no sobrevive a la clonación estructurada.

## Consecuencias

- Positivas: navegación síncrona e inmediata; el trabajador es desechable sin perder lo calculado; el mismo código reconstruye en pruebas y en la interfaz.
- Negativas: el reconstructor exige pruebas de propiedad (`estadoEn(n)` = reproducir desde 0; ida y vuelta de deltas); el intervalo de 256 se ajusta al medir en el lote 3.
