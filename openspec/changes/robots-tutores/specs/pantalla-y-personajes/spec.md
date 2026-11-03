# Pantalla y personajes

## Purpose

Define cómo llega el alumno (saludo con tres puertas), cómo se mueve (navegación), dónde están los controles que más usa, cómo se ve en celular y qué ajusta el docente (R-D7), y cómo se presentan los tres robots: un solo hablante, siempre en el mismo lugar, distinguibles sin color y con la voz «Java revisa…» (R-D5). Reemplaza al REQ-VIS-014 del plan anterior. El modo proyector está en `uso-en-aula` (REQ-AULA-004).

## Requirements

### Requirement: [REQ-PANT-001] Saludo con tres puertas
Al abrir el visualizador sin un enlace que traiga un programa, el robot paso a paso MUST saludar en el globo y MUST ofrecer, en la ranura de acciones bajo el globo, las puertas «Leer un tema», «Ver un ejemplo paso a paso» y «Probar mi programa». Cada puerta MUST llevar a su destino con una sola acción y MUST aparecer solo si su destino tiene contenido publicado. Un enlace que trae un programa MUST abrirlo directamente, sin saludo. La consola vacía MUST tener título y decir dónde aparecerá lo que imprima el programa.

#### Scenario: primera visita
- GIVEN el visualizador abierto sin enlace
- WHEN termina de cargar
- THEN el robot paso a paso saluda, el foco está en la primera puerta visible y la consola dice «Aquí aparecerá lo que imprima tu programa»
- AND «Probar mi programa» lleva el foco al editor

#### Scenario: una puerta sin destino no aparece
- GIVEN el libro sin ningún tema publicado
- WHEN se muestra el saludo
- THEN la puerta «Leer un tema» no aparece y las otras dos sí

#### Scenario: enlace del docente
- GIVEN un enlace que trae un programa con su entrada preparada
- WHEN se abre
- THEN el editor tiene ese programa listo para «Visualizar» y no hay saludo

### Requirement: [REQ-PANT-002] Navegación «Paso a paso · Libro · Ejemplos»
El sistema MUST mostrar una navegación fija con las secciones «Paso a paso», «Libro» y «Ejemplos», con la actual marcada con `aria-current="page"` y con un estilo que no dependa solo del color. Cambiar de sección MUST NOT perder el programa del editor ni la posición de la traza. «Libro» MUST aparecer solo cuando haya al menos un tema publicado.

#### Scenario: ir a Ejemplos y volver
- GIVEN una traza detenida en el paso 12
- WHEN el alumno abre «Ejemplos», mira la lista y vuelve a «Paso a paso» sin elegir nada
- THEN el editor tiene el mismo programa y la traza sigue en el paso 12

### Requirement: [REQ-PANT-003] La acción siguiente junto al globo
Durante la visualización, «◀ Anterior» y «Siguiente ▶» MUST estar en la ranura de acciones pegada debajo del globo; «Siguiente» MUST ser el botón primario y «Visualizar» MUST dejar de serlo. La misma ranura MUST alojar, nunca a la vez, las puertas del saludo, el par Anterior/Siguiente, las opciones del reto y las acciones del fin. Los atajos de REQ-VIS-012 MUST seguir funcionando.

#### Scenario: al visualizar
- GIVEN MaquinaSnacks en el editor
- WHEN el alumno pulsa «Visualizar»
- THEN el foco pasa a «Siguiente», que es el botón primario y está debajo del globo del robot

#### Scenario: a 1366×768
- GIVEN una ventana de 1366×768 en el paso 0
- WHEN se muestra la pantalla
- THEN el robot, su globo y el par Anterior/Siguiente se ven completos sin desplazar la página

### Requirement: [REQ-PANT-004] Un dueño por dato y pistas de lectura
Cada dato MUST mostrarse en un solo lugar: el número de vuelta de un ciclo junto a su encabezado en el editor (ningún panel lo repite), el detalle por pieza de la condición en el panel de condición, la narración en el globo. MUST haber una leyenda de los marcadores ▶ «acaba de ejecutarse» y ▷ «sigue», con la línea actual más destacada que la siguiente. El indicador de posición MUST mostrar el total de pasos solo cuando el programa terminó; mientras el motor calcula o si se detuvo por seguridad, MUST mostrar solo el paso actual. Si el alumno teclea en el editor durante la visualización, el sistema MUST decirle «Para cambiar el código pulsa «Editar programa»», anunciado con `aria-live="polite"`.

#### Scenario: la vuelta en un solo lugar
- GIVEN la tercera vuelta de un `while`
- WHEN se muestra el paso
- THEN el número de vuelta aparece junto al `while` en el editor y en ningún panel fuera de él (la narración del globo puede contarlo en su frase)

#### Scenario: ciclo desbocado
- GIVEN `u6-ciclo-infinito-demo` detenido por el límite de seguridad
- WHEN se muestra el indicador de posición
- THEN dice el paso actual sin un total

#### Scenario: teclear durante la visualización
- GIVEN una traza en el paso 5
- WHEN el alumno teclea en el editor
- THEN el código no cambia y aparece el aviso «Para cambiar el código pulsa «Editar programa»»

### Requirement: [REQ-PANT-005] Distribución de celular
A 390 px y a 320 px de ancho, durante la visualización el editor MUST ocupar alrededor del 35 % del alto de la ventana, centrado en la línea actual, seguido del globo del robot; «Anterior» y «Siguiente» MUST quedar en una barra inferior fija; en el paso 0 el robot y su globo MUST verse sin desplazar; la página MUST NOT desplazarse a lo ancho.

#### Scenario: paso 0 en un celular
- GIVEN una ventana de 390×844 con MaquinaSnacks recién visualizado
- WHEN se muestra el paso 0
- THEN se ven la línea actual del código, el robot con su globo y la barra con Anterior y Siguiente, sin desplazar

### Requirement: [REQ-PANT-006] Ajustes de la clase
El encabezado MUST mostrar al alumno solo la navegación, el interruptor del modo reto (REQ-RETO-001) y el botón «Ajustes de la clase». Dentro de los ajustes MUST estar el modo proyector y la velocidad de reproducción y, cuando existan, el momento del aviso del revisor y el nivel de paso. Cada ajuste MUST tener nombre accesible y decir su estado en palabras.

#### Scenario: encender el proyector con teclado
- GIVEN el visualizador con una traza en curso
- WHEN el docente abre «Ajustes de la clase» con el teclado y enciende el modo proyector
- THEN el ajuste dice «Encendido», la pantalla cambia a la distribución de proyector y la traza sigue en el mismo paso

### Requirement: [REQ-PANT-007] Fin del recorrido con siguientes pasos
En el último paso de un programa que terminó, la ranura de acciones MUST ofrecer «Probar con otros datos» y «Modificar el programa» y, si el programa vino del libro, también «Volver al tema» y «Siguiente tema».

#### Scenario: fin de un ejemplo de la galería
- GIVEN MaquinaSnacks abierto desde «Ejemplos» y recorrido hasta el final
- WHEN el alumno elige «Probar con otros datos»
- THEN el programa se vuelve a visualizar desde el paso 0 con la consola esperando lo que el alumno escriba

### Requirement: [REQ-PANT-008] Tres robots con personaje propio
El sistema MUST presentar tres robots distintos —**paso a paso** (narra cada paso y hace el reto), **revisor** (los problemas al revisar el programa y las trampas de Java) y **del libro** (los temas)— cada uno reconocible por su silueta y su accesorio además de su color, con nombre visible y nombre accesible tomados del catálogo es-MX. Los nombres y la apariencia MUST ser los aprobados por el PO.

#### Scenario: distinguibles sin color
- GIVEN la maqueta de los tres robots en escala de grises
- WHEN se comparan
- THEN cada uno se reconoce por su silueta y su accesorio, y cada uno muestra su nombre

#### Scenario: nombre accesible
- GIVEN un error de compilación en pantalla
- WHEN un lector de pantalla llega al robot
- THEN anuncia el nombre del robot revisor y su ánimo

### Requirement: [REQ-PANT-009] Un solo hablante, siempre en el mismo lugar
En cada pantalla MUST hablar un solo robot a la vez, en la misma ranura junto al globo; MUST NOT aparecer un robot ni su retrato dentro del globo de otro. Habla el **revisor** cuando el análisis termina con un error de compilación, un aviso de fuera de alcance o un error de arranque, cuando el alumno pide «Ver explicación» de una trampa y en el paso donde se ve una trampa de Java; el robot **del libro**, en el libro; el robot **paso a paso**, en todo lo demás, incluidos el saludo y el reto. Al cambiar el hablante, el globo MUST anunciar el nombre del nuevo robot antes de su texto en la región `aria-live`, y el cambio MUST ser instantáneo con `prefers-reduced-motion`.

#### Scenario: un error y su corrección
- GIVEN un programa con un `;` faltante
- WHEN se pulsa «Visualizar», se corrige el código y se vuelve a visualizar
- THEN primero habla el robot revisor con el error y después el robot paso a paso con el paso 0, cada uno anunciado con su nombre

#### Scenario: nunca dos robots
- GIVEN cualquier estado de la pantalla en la suite E2E (saludo, visualización, reto, error, trampa, libro)
- WHEN se cuentan los robots de la zona de explicación
- THEN hay exactamente uno y ningún globo contiene otro robot

### Requirement: [REQ-PANT-010] Voz y vocabulario de los robots
Todo texto de los robots MUST describir lo que hace la computadora en tercera persona («Java revisa…», «Java guarda…»), nunca como si el robot fuera la computadora («Reviso…», «Guardo…»); MUST escribir `true` y `false` como código, nunca «verdadero», «falso» ni «es falso»; MUST llamar «vuelta» a cada repetición de un ciclo, nunca «iteración»; y MUST llamar «trampa de Java» a lo que avisa el revisor. Una prueba del catálogo MUST rechazar las formas prohibidas.

#### Scenario: una condición con else
- GIVEN MaquinaSnacks en la línea 72 con `dinero` = 50 y `total` = 36
- WHEN el robot narra la condición
- THEN dice «Java revisa `dinero < total`. Con los valores de ahora queda `50 < 36`, que da `false`. Se salta el `if` y entra al `else`.»

#### Scenario: una condición compuesta (con las piezas del motor, desde el modo reto)
- GIVEN MaquinaSnacks en la línea 53 con `cantidad` = 2
- WHEN el robot narra la condición
- THEN dice «Java revisa `cantidad < 1 || cantidad > 3`. Con los valores de ahora queda `2 < 1 || 2 > 3`: ningún lado da `true`, así que todo da `false`. Se salta el bloque del `if` y sigue después de él.»

#### Scenario: el paso 0 invita a predecir
- GIVEN MaquinaSnacks recién visualizado
- WHEN se muestra el paso 0
- THEN el robot paso a paso pide leer el programa y anotar qué aparecerá en la consola antes de pulsar «Siguiente», sin adelantar nada de la ejecución
