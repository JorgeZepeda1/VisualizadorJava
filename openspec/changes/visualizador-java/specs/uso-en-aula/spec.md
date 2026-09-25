# Uso en el aula

## Purpose

Define la galería curricular, el enlace compartible y el modo proyector: las funciones que permiten a un docente preparar y proyectar un ejemplo sin cuentas ni servidor.

## Requirements

### Requirement: [REQ-AULA-001] Galería curricular
El sistema MUST ofrecer una galería organizada por unidad (U3–U7) con los programas curriculares y los de autoría (`Math`, `Random`, `printf` y demás API sin ejemplo curricular real), MUST marcar el origen de cada programa (curricular o de autoría) y MUST mostrar una línea de "Qué observar" por programa.

#### Scenario: origen marcado
- GIVEN un programa de autoría que ejercita `Math.pow`
- WHEN se muestra en la galería
- THEN aparece marcado explícitamente como "de autoría", distinto de un programa tomado del curso

### Requirement: [REQ-AULA-002] Enlace compartible
El sistema MUST poder codificar en el fragmento de la URL (`#…`, que el servidor nunca recibe) el código, las entradas precargadas, la semilla, el nivel de paso, si la predicción está activa y si el modo proyector está activo; al abrir ese enlace MUST reproducir exactamente el mismo programa y configuración. Cuando el contenido no cabe en la URL, el sistema MUST ofrecer descargar o abrir un archivo `.java` en su lugar.

#### Scenario: ida y vuelta exacta
- GIVEN un programa de U7 con sus entradas y semilla ya preparado
- WHEN se genera su enlace y se abre en una pestaña nueva
- THEN el editor, las entradas, la semilla, el nivel de paso y el estado de predicción quedan idénticos a como se guardaron

### Requirement: [REQ-AULA-003] Enlace versionado, nunca corrupto
El formato del enlace MUST incluir una marca de versión. Un enlace de una versión que el sistema no reconoce MUST mostrar un aviso explícito de incompatibilidad y MUST NOT abrir un programa a medias o corrupto.

#### Scenario: enlace de una versión futura no reconocida
- GIVEN un enlace generado por una versión futura del formato que el sistema instalado no reconoce
- WHEN se abre
- THEN el sistema muestra un aviso explícito de incompatibilidad de versión y no intenta abrir un programa a medias

### Requirement: [REQ-AULA-004] Modo proyector
El sistema MUST ofrecer un modo proyector con el código a un tamaño de al menos 24 píxeles y controles de tamaño ampliado, y MUST NOT superponer ni cortar ningún panel a resoluciones de 1024×768 y 1280×720.

#### Scenario: proyector sin recorte a 1024×768
- GIVEN el modo proyector activo con una ventana de 1024×768
- WHEN se muestran el código, el panel de estado y los controles
- THEN ningún panel se superpone ni corta texto

### Requirement: [REQ-AULA-005] Escenario de uso docente con predicción proyectada
El sistema MUST permitir que un docente, con el visualizador proyectado y el modo predicción activado, conduzca una sesión donde el grupo responde Sí/No antes de que se revele cada condición o continuación de ciclo, usando exclusivamente las funciones ya definidas en `visualizador-paso-a-paso` y en este documento (galería, enlace, proyector, predicción) — sin necesitar apoyo técnico adicional.

#### Scenario: clase proyectada de U6 sin apoyo técnico
- GIVEN un docente que abrió desde la galería un programa de ciclo con `for` y activó predicción y proyector
- WHEN proyecta el visualizador y avanza la traza pidiendo al grupo "¿entra o no?" antes de cada revelación
- THEN completa la sesión usando solo controles ya definidos, sin necesitar configuración adicional ni soporte técnico
