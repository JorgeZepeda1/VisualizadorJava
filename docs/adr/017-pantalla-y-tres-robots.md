# ADR 017 — Pantalla con ranura de acciones y tres robots con un solo hablante

- **Fecha**: 2026-10-19
- **Estado**: Aceptada (el PO aprobó el plan y la recomendación de PQ-1 el 2026-10-19; se implementa en el hito R0 de `robots-tutores`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan y PQ-1
- **Relacionadas**: `openspec/changes/robots-tutores/design.md` §2 y §3; ADR 001, 013, 014, 015; REQ-PANT-001 a 010, REQ-AULA-001 y 004

## Contexto

El panel de expertos encontró que un alumno nuevo llega a un «Hola, mundo» sin camino, que «Siguiente» queda a unos 600 px del robot que lo pide, que a 1280×720 y a 390 px no cabe ni el robot con su globo, y que el modo reto del hito siguiente no cabe en proyector ni en celular sin una distribución propia. El PO decidió además que haya **tres robots distintos** (R-D5): el que narra cada paso, el que revisa el programa y el del libro, con un solo hablante a la vez.

## Decisión

1. **Ranura de acciones bajo el globo.** Una sola zona, pegada debajo del globo, aloja —nunca a la vez— las puertas del saludo, el par «◀ Anterior · Siguiente ▶», las opciones del reto (R1) y las acciones del fin. Qué cosa va en ella lo decide `presentacion/ranura.ts` (una unión discriminada de ids, sin texto); el componente `RanuraDeAcciones` la dibuja y las palabras salen de `textos/es-MX/pantalla.ts`. «Siguiente» es el botón primario durante la visualización y recibe el foco; «Visualizar» deja de serlo.
2. **Puertas con destino (PQ-2).** Cada puerta del saludo aparece solo cuando su destino tiene contenido: «Ver un ejemplo paso a paso» (la galería de R0) y «Probar mi programa» siempre; «Leer un tema» —y la sección «Libro» de la navegación— solo cuando hay al menos un tema publicado. La consulta vive en **un solo punto** (`interfaz/datos/temas-publicados.ts`), que hoy responde «ninguno» y que el hito R2 conecta con el índice del libro. Ninguna puerta lleva a un callejón.
3. **Un solo hablante.** `presentacion/hablante.ts` deriva quién habla: el **revisor** cuando hay un problema al revisar el programa en el globo (error de compilación, aviso de fuera de alcance, error de arranque o falla del visualizador), el **robot del libro** en la sección «Libro» y el **robot paso a paso** en todo lo demás. `Explicacion` pinta exactamente un `[data-personaje]` junto al globo, siempre en la misma ranura, y al cambiar el hablante antepone su nombre en la región `aria-live` (solo cuando cambió, para no repetirlo en cada paso). **Nunca** se pinta un robot, ni un retrato, dentro del globo de otro: cuando el revisor tenga algo que decir dentro de un paso (R3) toma el turno del paso.
4. **Tres personajes.** `Robot` recibe `personaje` (`paso-a-paso`, `revisor`, `libro`) y `animo`. Cada uno se reconoce por la silueta de la cabeza (`data-forma`: cuadrada con antena, redonda tipo casco, ancha con lentes) y por un accesorio que sostiene (puntero ▶, lupa con «!», libro abierto) además del color (azul, ámbar, verde, con contorno AA), con nombre visible bajo la figura y nombre accesible tomados del catálogo. Las tres figuras comparten `viewBox` y tamaño de ranura, y los cinco ánimos existen en cada cabeza.
5. **Estado.** `EstadoApp` agrega `seccion`, `saludo`, `ajustes` (proyector y velocidad; el reto y el revisor se agregan en R1 y R3), `entradaPreparada`, `origen` y `programaGuardado`. La acción `cargar-programa { codigo, entradaPreparada, origen }` es la que también reutilizarán el libro y la galería de autoría: guarda el programa del alumno y `volver-a-mi-programa` lo restaura. Cambiar de sección **no desmonta** el editor ni toca la `Traza` (REQ-PANT-002): el visualizador queda oculto con `hidden`, no destruido.
6. **Distribuciones.** Una sola hoja de estilos con áreas de cuadrícula y los atributos `data-modo` y `data-proyector`: escritorio (el robot, el globo y «Siguiente» caben a 1366×768), proyector (código al 58 % y de 24 px o más con ajuste de línea, variables sin «Tipo», consola con sus últimas líneas; absorbe la tarea 5.5) y celular de menos de 700 px (editor de ≈ 35vh centrado en la línea actual, globo, y la ranura convertida en barra inferior fija). La columna exclusiva del reto llega en R1 sobre este mismo cimiento.
7. **Galería curricular (adelanta la parte curricular de 5.2).** Los únicos `import.meta.glob(…?raw)` de `corpus/curso` y de los ejercicios del PO viven en `interfaz/datos/programas-crudos.ts`, un fragmento **diferido** (se carga al abrir «Ejemplos» y el service worker lo precachea). `presentacion/galeria.ts` es pura: recibe texto crudo y arma las secciones U3–U7; los títulos, el «Qué observar» y los programas de demostración salen de `textos/es-MX/galeria.ts`. La matriz de capas de ADR 001 no cambia.
8. **PQ-6.** La narración del globo conserva la sustitución de la condición (es lo que lee el lector de pantalla y lo que se ve en proyector); «un dueño por dato» se aplica al número de vuelta (junto al ciclo en el editor, en ningún panel) y al vocabulario.
9. **Voz.** Los tres robots hablan en tercera persona («Java revisa…», «Java guarda…»), con `true` y `false` como código y «vuelta» para cada repetición; una prueba del catálogo rechaza las formas prohibidas.

## Alternativas consideradas

- **Un robot con tres papeles** (propuesta del diseñador): menos figuras que mantener, pero el PO eligió tres personajes y los requisitos de un solo hablante y de silueta propia resuelven lo que el diseñador temía.
- **Pantalla de inicio aparte** para las puertas: un clic más y otra pantalla que mantener; el saludo en el globo con las puertas en la ranura cuesta una acción menos.
- **Mini retrato del revisor dentro del globo del narrador** (plan anterior): dos robots a la vez; descartado por R-D5.
- **Escalar todo al 150 % para el proyector:** el diseñador midió que el reto no cabe; una línea de 53 caracteres a 24 px no cabe a 1024 px sin partirla.
- **Botones fijos en la barra inferior en escritorio:** quedan lejos del robot que los pide (H2).

## Consecuencias

- Positivas: «Siguiente» a un paso del robot; el alumno nuevo llega al paso 1 de un ejemplo en tres acciones; un solo lugar para lo que sigue (el reto de R1 usa la misma ranura); el catálogo de textos y la matriz de capas no cambian.
- Negativas: `Visualizador.tsx` crece (secciones, saludo, ajustes); la galería agrega un fragmento diferido de ≈ 45 KB crudos; tres figuras SVG que mantener y revisar en escala de grises.
- Riesgos: tres personajes compiten por la atención del principiante (mitigado: un solo hablante, siempre en el mismo lugar; las puertas muestran el accesorio, no la cara); la distribución de proyector a 1024×768 depende del ajuste de línea de CodeMirror (la prueba E2E la mide en los tres motores).
