# Delta para Uso en el aula

> Base: `openspec/changes/visualizador-java/specs/uso-en-aula/spec.md` (aún sin archivar). Se aplica después de archivar `visualizador-java`. La parte curricular de la galería y el modo proyector se entregan en el hito R0 de este cambio (absorben la parte curricular de la tarea 5.2 y toda la 5.5 de `visualizador-java`); el enlace sigue siendo la 5.4.

## MODIFIED Requirements

### Requirement: [REQ-AULA-001] Galería curricular
El sistema MUST ofrecer una galería («Ejemplos») organizada por unidad (U3–U7) con los programas curriculares, los ejercicios del PO y los de autoría (`Math`, `Random`, `printf` y demás API sin ejemplo curricular real); MUST marcar el origen de cada programa (curricular, del PO o de autoría) y MUST mostrar una línea de «Qué observar» por programa. Al abrir un programa, MUST cargar su código y su entrada preparada tal como la usó el oráculo, con cada renglón terminado en salto de línea, como en NetBeans; un programa con varias entradas MUST ofrecerlas como datos de ejemplo. Un programa MAY estar marcado como demostración: entonces abre con el aviso del revisor en «después» (REQ-REV-007).
(Previously: la galería no cargaba entrada preparada ni tenía programas de demostración, y no incluía los ejercicios del PO.)

#### Scenario: origen marcado
- GIVEN un programa de autoría que ejercita `Math.pow`
- WHEN se muestra en la galería
- THEN aparece marcado explícitamente como «de autoría», distinto de un programa tomado del curso

#### Scenario: abrir un ejercicio con su entrada
- GIVEN la máquina de snacks del PO en la galería con sus cinco entradas de ejemplo
- WHEN el alumno elige la entrada `a1 2 50`
- THEN el editor tiene el programa y la entrada preparada es, byte a byte, la que usó el oráculo (`a1⏎2⏎50⏎`)

### Requirement: [REQ-AULA-002] Enlace compartible
El sistema MUST poder codificar en el fragmento de la URL (`#…`, que el servidor nunca recibe) el código, las entradas precargadas, la semilla, el nivel de paso, si el modo reto está activo, si el aviso del revisor va «después» y si el modo proyector está activo; al abrir ese enlace MUST reproducir exactamente el mismo programa y configuración. Cuando el contenido no cabe en la URL, el sistema MUST ofrecer descargar o abrir un archivo `.java` en su lugar.
(Previously: el enlace guardaba «si la predicción está activa»; no había modo reto ni ajuste del revisor.)

#### Scenario: ida y vuelta exacta
- GIVEN un programa de U7 con sus entradas y semilla ya preparado, con el modo reto activo
- WHEN se genera su enlace y se abre en una pestaña nueva
- THEN el editor, las entradas, la semilla, el nivel de paso, el modo reto y el ajuste del revisor quedan idénticos a como se guardaron

#### Scenario: demostración sin adelantar la trampa
- GIVEN el docente prepara `u5-switch-sin-break-fallthrough` con el aviso del revisor en «después»
- WHEN un alumno abre el enlace y visualiza
- THEN el paso 0 no localiza trampas y el revisor habla solo en los pasos donde el `switch` sigue de largo

### Requirement: [REQ-AULA-004] Modo proyector
El sistema MUST ofrecer un modo proyector, que se enciende desde «Ajustes de la clase» o con el enlace, con el código a un tamaño de al menos 24 píxeles y controles de tamaño ampliado, y MUST NOT superponer ni cortar ningún panel a resoluciones de 1024×768 y 1280×720. Su distribución MUST ser la de «reto proyectado»: el código ocupa del 55 % al 60 % del ancho, la tabla de variables no muestra la columna «Tipo» y la consola muestra sus últimas líneas, de modo que la columna derecha deje lugar para la pregunta y las tres tarjetas del reto (REQ-RETO-010).
(Previously: no fijaba la distribución ni cómo se enciende; el diseñador midió que el reto no cabía con la distribución normal.)

#### Scenario: proyector sin recorte a 1024×768
- GIVEN el modo proyector activo con una ventana de 1024×768
- WHEN se muestran el código, el globo, el panel de estado y los controles
- THEN ningún panel se superpone ni corta texto

#### Scenario: línea larga a 1024×768
- GIVEN una línea de 53 caracteres en el modo proyector a 1024×768, donde la columna del código no le da cabida a 24 píxeles
- WHEN se muestra el código
- THEN la línea se ve completa a 24 píxeles o más, partida en dos renglones con su número de línea una sola vez, sin desplazamiento horizontal

### Requirement: [REQ-AULA-005] Escenario de uso docente con el reto proyectado
El sistema MUST permitir que un docente, con el visualizador proyectado y el modo reto activado, conduzca una sesión donde el grupo elige una de tres opciones antes de que se revele cada condición, continuación de ciclo o selección de `switch`, y escucha la retroalimentación del robot, usando exclusivamente las funciones ya definidas en `visualizador-paso-a-paso`, `pantalla-y-personajes`, `modo-reto` y este documento (galería, enlace, proyector, reto) — sin necesitar apoyo técnico adicional.
(Previously: el grupo respondía Sí/No antes de cada revelación, con la predicción de D4.)

#### Scenario: clase proyectada de U6 sin apoyo técnico
- GIVEN un docente que abrió desde la galería un programa de ciclo con `for` y activó el modo reto y el proyector
- WHEN proyecta el visualizador y, antes de cada revelación, pide al grupo que elija la opción 1, 2 o 3
- THEN completa la sesión usando solo controles ya definidos (incluido «Ya entendí este ciclo»), sin configuración adicional ni soporte técnico
