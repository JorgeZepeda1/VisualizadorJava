# ADR 006 — Traza por deltas reversibles con puntos de control, en manos de la interfaz

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `design.md` §3.3–3.4; `exploracion/05` §5; ADR 005, 007

## Contexto

La interfaz debe retroceder en el tiempo, saltar a cualquier paso de una traza de 100 000 en ≤ 200 ms y cambiar de paso en ≤ 100 ms (C11), derivar la prueba de escritorio (M12) y mostrar el Detallado. La compartición estructural (p. ej. `immer`) se pierde al cruzar `postMessage`, y el trabajador puede terminarse a la fuerza (ADR 007).

## Decisión

1. El trabajador envía `Paso` compactos: clase, nodo, valores alineados con el plan de evaluación, cambios con valor **anterior** y nuevo (y el punto del plan donde ocurrieron), segmentos de consola, avance del `Scanner` y datos de control (resultado, vuelta, caso, si es predecible).
2. La **interfaz guarda la traza** en `motor/traza/traza.ts` (código puro compartido con las pruebas): punto de control cada 256 pasos; `instantaneaEn(n, vista)` = punto de control anterior a `n` + ≤ 255 deltas. **La traza solo avanza desde un punto de control: no existe deshacer un paso.** Ir a un paso anterior (retroceder uno, saltar atrás, reiniciar) parte de un punto de control y vuelve a aplicar los `cambios` hacia adelante (enmienda del hito 2, parte A; ver «Enmienda»).
3. El alcance de las variables se deriva de la estructura estática (Java prohíbe el sombreado de locales, así que un nombre identifica a lo más una variable viva); «sin inicializar» es dinámico.
4. La prueba de escritorio y la consola son índices incrementales sobre la misma traza y se pintan virtualizadas.

## Alternativas consideradas

- **Instantánea completa por paso:** simple, pero memoria y clonación proporcionales al estado en cada paso.
- **El trabajador como servidor de vistas:** traza en un solo lugar, pero navegación asíncrona y traza perdida si hay que terminarlo.
- **Estructuras persistentes con compartición:** la compartición no sobrevive a la clonación estructurada.

## Consecuencias

- Positivas: navegación síncrona e inmediata; el trabajador es desechable sin perder lo calculado; el mismo código reconstruye en pruebas y en la interfaz.
- Negativas: el reconstructor exige pruebas de propiedad (`instantaneaEn(n)` desde un punto de control = reproducir desde 0, en cada paso de cada programa ejecutable del corpus); el intervalo de 256 se ajusta al medir en el lote 3.

## Enmienda (hito 2, parte A — tarea 3.1; documentada en la parte C)

La propiedad sobre el corpus (`pruebas/propiedades/traza-del-corpus.test.ts`) mostró que **deshacer un paso con `Cambio.anterior` NO es exacto**: `anterior` es el valor de ESA variable, no el del nombre. Dos `for` seguidos con `int fila` (`e16-triangulos-y-tablas`) son dos variables con el mismo nombre; la declaración de la segunda llega con `anterior` vacío aunque el nombre ya valiera algo, y deshacerla pierde ese valor. La decisión «avanzar o retroceder uno aplica o deshace un delta» (punto 2 original) quedó sustituida por la de arriba: la traza **solo avanza** desde el punto de control anterior, también para ir hacia atrás.

- `Cambio.anterior` se conserva, pero solo para lo que se **muestra** («`contador` cambió de 3 a 4»); nunca para reconstruir un estado.
- El costo no cambia de orden: ≤ 255 deltas por salto (C11), con el punto de control cada 256 pasos.
