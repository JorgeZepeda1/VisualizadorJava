# Delta para Visualizador paso a paso

> Base: `openspec/changes/visualizador-java/specs/visualizador-paso-a-paso/spec.md` (aún sin archivar). Esta delta se aplica después de archivar `visualizador-java`. PR-1 quedó resuelta (el modo reto reemplaza la predicción Sí/No). El REQ-VIS-014 «Tres robots tutores» del plan anterior ya no está aquí: lo reemplazan REQ-PANT-008 y REQ-PANT-009 de la capacidad nueva `pantalla-y-personajes`.

## MODIFIED Requirements

### Requirement: [REQ-VIS-013] Modo reto (apagado por omisión)
El modo reto MUST estar apagado al abrir el visualizador sin un parámetro explícito. Cuando el docente o el alumno lo activa (con un interruptor visible o abriendo un enlace con el parámetro del reto), el sistema MUST, antes de revelar el resultado de cada evaluación de condición, de continuación de un ciclo o de selección de un `switch` que admite reto, reemplazar el control «Adelante» por una pregunta con tres opciones que dicen qué pasa y por qué; solo después de que el usuario elige, MUST revelar el resultado real junto con la retroalimentación de su elección. El detalle del reto lo define la capacidad `modo-reto`.
(Previously: la predicción de D4 era una elección Sí/No sobre condiciones y continuaciones de ciclo, sin razón ni retroalimentación de la elección, y solo la activaba el docente.)

#### Scenario: el reto pide elegir antes de revelar
- GIVEN el modo reto activado y el paso siguiente es la condición de un `while`
- WHEN el usuario llega a ese paso
- THEN el control «Adelante» se sustituye por la pregunta y sus tres opciones; solo al elegir se muestran el resultado real y la retroalimentación

#### Scenario: apagado al abrir sin parámetro
- GIVEN el visualizador abierto sin parámetros
- WHEN el usuario recorre una traza con condiciones
- THEN «Adelante» nunca se reemplaza por una pregunta
