# Delta para Visualizador paso a paso

> Base: `openspec/changes/visualizador-java/specs/visualizador-paso-a-paso/spec.md` (aún sin archivar). Esta delta se aplica después de archivar `visualizador-java`. El MODIFIED de REQ-VIS-013 depende de PR-1: si el PO decide mantener la predicción Sí/No **y** el modo reto, este bloque se retira y REQ-RETO-001 lleva solo el interruptor del reto.

## MODIFIED Requirements

### Requirement: [REQ-VIS-013] Modo reto (apagado por omisión)
El modo reto MUST estar apagado al abrir el visualizador sin un parámetro explícito. Cuando el docente o el alumno lo activa (con un interruptor visible o abriendo un enlace con el parámetro del reto), el sistema MUST, antes de revelar el resultado de cualquier evaluación de condición, de continuación de un ciclo o de selección de un `switch`, reemplazar el control «Adelante» por una pregunta con tres opciones que dicen qué pasa y por qué; solo después de que el usuario elige, MUST revelar el resultado real junto con su explicación y la retroalimentación de su elección. El detalle del reto lo define la capacidad `modo-reto`.
(Previously: la predicción de D4 era una elección Sí/No sobre condiciones y continuaciones de ciclo, sin razón ni retroalimentación de la elección, y solo la activaba el docente.)

#### Scenario: el reto pide elegir antes de revelar
- GIVEN el modo reto activado y el paso siguiente es la condición de un `while`
- WHEN el usuario llega a ese paso
- THEN el control «Adelante» se sustituye por la pregunta y sus tres opciones; solo al elegir se muestran el resultado real, la explicación y la retroalimentación

#### Scenario: apagado al abrir sin parámetro
- GIVEN el visualizador abierto sin parámetros
- WHEN el usuario recorre una traza con condiciones
- THEN «Adelante» nunca se reemplaza por una pregunta

## ADDED Requirements

### Requirement: [REQ-VIS-014] Tres robots tutores
El sistema MUST presentar tres robots —revisor, programador y explicador— distinguibles por su forma (un accesorio propio) y por su nombre, nunca solo por color, con nombre accesible para el lector de pantalla. En la zona de explicación MUST hablar un solo robot a la vez: el programador narra el paso (y hace el reto); el revisor habla al revisar el programa y agrega su nota en el paso donde se ve una trampa; el explicador aparece en el libro y en el enlace al tema del paso. La zona de explicación MUST seguir siendo una sola de las cuatro zonas del producto.

#### Scenario: la nota del revisor dentro del paso
- GIVEN un paso donde se manifiesta una trampa detectada
- WHEN se muestra la zona de explicación
- THEN el robot programador dice la explicación del paso y debajo aparece la nota del robot revisor con su accesorio, su nombre y su ícono de «Trampa», en la misma región `aria-live`

#### Scenario: robots distinguibles sin color
- GIVEN la pantalla en escala de grises
- WHEN se muestran los tres robots
- THEN cada uno se reconoce por su accesorio (lupa, ninguno, libro) y por su nombre
