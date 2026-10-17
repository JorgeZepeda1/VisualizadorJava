# Delta para Uso en el aula

> Base: `openspec/changes/visualizador-java/specs/uso-en-aula/spec.md` (aún sin archivar). Se aplica después de archivar `visualizador-java`. Depende de PR-1 (reto en lugar de predicción) y de PR-4 (momento del aviso del revisor).

## MODIFIED Requirements

### Requirement: [REQ-AULA-002] Enlace compartible
El sistema MUST poder codificar en el fragmento de la URL (`#…`, que el servidor nunca recibe) el código, las entradas precargadas, la semilla, el nivel de paso, si el modo reto está activo, si el aviso del revisor se omite en el paso 0 y si el modo proyector está activo; al abrir ese enlace MUST reproducir exactamente el mismo programa y configuración. Cuando el contenido no cabe en la URL, el sistema MUST ofrecer descargar o abrir un archivo `.java` en su lugar.
(Previously: el enlace guardaba «si la predicción está activa»; no había modo reto ni ajuste del revisor.)

#### Scenario: ida y vuelta exacta
- GIVEN un programa de U7 con sus entradas y semilla ya preparado, con el modo reto activo
- WHEN se genera su enlace y se abre en una pestaña nueva
- THEN el editor, las entradas, la semilla, el nivel de paso, el modo reto y el ajuste del revisor quedan idénticos a como se guardaron

#### Scenario: demostración sin spoiler del revisor
- GIVEN el docente prepara `u5-switch-sin-break-fallthrough` con el aviso del paso 0 omitido
- WHEN un alumno abre el enlace y visualiza
- THEN el paso 0 no anuncia trampas y la nota del revisor aparece solo en los pasos donde el `switch` sigue de largo

### Requirement: [REQ-AULA-005] Escenario de uso docente con el reto proyectado
El sistema MUST permitir que un docente, con el visualizador proyectado y el modo reto activado, conduzca una sesión donde el grupo elige una de tres opciones antes de que se revele cada condición, continuación de ciclo o selección de `switch`, y escucha la retroalimentación del robot, usando exclusivamente las funciones ya definidas en `visualizador-paso-a-paso`, `modo-reto` y este documento (galería, enlace, proyector, reto) — sin necesitar apoyo técnico adicional.
(Previously: el grupo respondía Sí/No antes de cada revelación, con la predicción de D4.)

#### Scenario: clase proyectada de U6 sin apoyo técnico
- GIVEN un docente que abrió desde la galería un programa de ciclo con `for` y activó el modo reto y el proyector
- WHEN proyecta el visualizador y, antes de cada revelación, pide al grupo que elija la opción 1, 2 o 3
- THEN completa la sesión usando solo controles ya definidos (incluido «Ya entendí este ciclo»), sin configuración adicional ni soporte técnico
