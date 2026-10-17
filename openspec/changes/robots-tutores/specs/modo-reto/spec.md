# Modo reto

## Purpose

Define el modo reto del robot programador (R-D2): antes de revelar cada condición y cada selección de `switch`, el alumno elige entre tres opciones que dicen qué pasa y por qué; el robot explica su acierto o su error. La respuesta correcta y cada refutación salen de lo que el motor calculó (D2). Con PR-1 aceptada, es la forma que toma la predicción de D4 (REQ-VIS-013).

## Requirements

### Requirement: [REQ-RETO-001] Interruptor del modo reto
El modo reto MUST estar apagado al abrir el visualizador sin parámetro; MUST poder encenderse y apagarse en cualquier momento con un interruptor visible para el docente y para el alumno, y MUST poder encenderse con un parámetro del enlace. Al apagarlo, la navegación MUST volver a ser la de siempre sin perder la posición de la traza.

#### Scenario: apagado por omisión
- GIVEN el visualizador abierto sin parámetros
- WHEN se visualiza MaquinaSnacks
- THEN «Siguiente» avanza por todos los pasos sin preguntar nada

#### Scenario: encender a mitad de la traza
- GIVEN una traza detenida en el paso 8
- WHEN el alumno enciende el interruptor
- THEN la traza sigue en el paso 8 y el siguiente paso de condición se presenta como reto

### Requirement: [REQ-RETO-002] Dónde se detiene el reto
Con el modo encendido, antes de revelar cada condición de `if` y `else if`, de `while`, de `do-while` y de `for`, y cada selección de un `switch`, el sistema MUST reemplazar «Siguiente» por la pregunta con tres opciones. MUST NOT detenerse en ningún otro paso: declaraciones, asignaciones, impresiones, lecturas, la caída de un `switch` sin `break`, `break`, `continue`, `return` ni un `for (;;)` sin condición.

#### Scenario: MaquinaSnacks con la entrada a1, 2, 50
- GIVEN el modo reto encendido y MaquinaSnacks con la entrada `a1`, `2`, `50`
- WHEN se recorre la traza completa
- THEN hay exactamente cuatro retos: el `switch` de la línea 24 y los `if` de las líneas 53, 66 y 72

### Requirement: [REQ-RETO-003] Tres opciones con una sola correcta, tomada del motor
Cada reto MUST ofrecer exactamente tres opciones distintas. Cada opción MUST decir qué pasa (entra o no, repite o sale, a qué etiqueta salta) y por qué. Exactamente una MUST ser verdadera en las dos partes: lo que pasa coincide con lo que el motor calculó para ese paso y la razón coincide con los valores de la traza. El orden de las opciones MUST ser determinista para el mismo programa, la misma entrada y el mismo paso.

#### Scenario: un if simple con else
- GIVEN MaquinaSnacks en la línea 72 con `dinero` = 50 y `total` = 36
- WHEN se presenta el reto
- THEN las opciones son «Es `false`: `50 < 36` es false, así que se va al `else`» (la correcta), «Es `true`: `50 < 36` es true, así que entra al `if`» y «Es `true`: `<` pregunta si `dinero` es mayor que `total`, y 50 es mayor que 36»

#### Scenario: todo el corpus
- GIVEN todos los pasos de condición y de selección de los programas ejecutables del corpus
- WHEN se construye cada reto
- THEN cada uno tiene tres opciones distintas y exactamente una verdadera según las afirmaciones verificadas contra la traza

### Requirement: [REQ-RETO-004] Distractores del catálogo, nunca relleno
Cada distractor MUST salir de una familia del catálogo cerrado de errores típicos, revisado por el PO, que aplique a esa condición (sus operadores, los valores del motor, la construcción y la historia de la traza); MUST ser falso en al menos una afirmación verificable contra la traza o contra una regla de Java respaldada por un programa del oráculo. Dos opciones MUST NOT afirmar lo mismo. Para cada construcción, el catálogo MUST tener al menos una familia que siempre aplica, de modo que nunca falte la tercera opción.

#### Scenario: `||` con el primer lado false
- GIVEN MaquinaSnacks en la línea 53 con `cantidad` = 2 (`cantidad < 1 || cantidad > 3`)
- WHEN se presenta el reto
- THEN un distractor dice «Es `false` desde `2 < 1`: con `||` Java ya no revisa el otro lado»

#### Scenario: la frontera de un `<`
- GIVEN `u6-error-por-uno`, tercer ciclo, cuando `i` vale 10 en `i < 10`
- WHEN se presenta el reto
- THEN un distractor dice «Es `true`: `10 < 10` incluye al 10, porque valen lo mismo»

#### Scenario: un while que no entra nunca
- GIVEN `u6-prediccion-while-no-ejecuta` en la primera revisión de `contador <= 5` con `contador` = 8
- WHEN se presenta el reto
- THEN un distractor dice que entra una vez y luego sale

#### Scenario: el valor de la revisión anterior
- GIVEN `u6-suma-1-a-n` con la entrada 5, en la revisión de `i <= n` con `i` = 6
- WHEN se presenta el reto
- THEN una opción posible es «Es `true`: `5 <= 5`, como en la revisión anterior», y su refutación cita el `i++` que cambió `i` a 6

#### Scenario: un switch con break
- GIVEN MaquinaSnacks en la línea 24 con `codigo` = "A1"
- WHEN se presenta el reto
- THEN las opciones son saltar al `case "A1"` (la correcta), saltar al `default` y saltar al `case "A1"` y seguir de largo con los demás

### Requirement: [REQ-RETO-005] Retroalimentación
Al elegir, el sistema MUST revelar el paso con su explicación y además: si la opción es la correcta, explicar por qué con la cadena de sustitución del motor; si acierta en qué pasa pero no en la razón, decirlo así y explicar la razón real; si se equivoca, explicar por qué su opción no es, con el dato del motor que la refuta, y por qué la correcta sí. MUST NOT decir «incorrecto» a secas, y cada resultado MUST marcarse con ícono y palabra, no solo con color.

#### Scenario: acierto parcial
- GIVEN el reto de la línea 53 con `cantidad` = 2
- WHEN el alumno elige «Es `false` desde `2 < 1`: con `||` Java ya no revisa el otro lado»
- THEN el robot dice que atinó en que no entra y explica que con `||` Java siguió revisando `2 > 3` porque el primer lado fue false

#### Scenario: error
- GIVEN el reto de la línea 72 con `dinero` = 50 y `total` = 36
- WHEN el alumno elige «Es `true`: `50 < 36` es true, así que entra al `if`»
- THEN el robot explica que `50 < 36` es false (50 no es menor que 36) y que por eso se va al `else`

### Requirement: [REQ-RETO-006] Nunca un resultado inventado
Todo valor de una variable o de una parte de la condición que aparezca en una opción, una refutación o una explicación MUST provenir de la traza (valores, sustituciones, la relación entre dos números, si dos textos dicen lo mismo, los cambios de una variable) o de la estructura del programa que entrega el motor; la interfaz MUST NOT evaluar ninguna expresión. Un distractor MAY equivocarse solo en el veredicto, en el `true`/`false` de una parte que Java sí revisó, en atribuir a esta revisión los datos de una anterior o en una regla de Java; MUST NOT dar un valor que el motor no calculó. Una parte de la condición que Java no revisó por cortocircuito MUST citarse como «no revisada», nunca con un valor, ni siquiera en un distractor; si a una familia le falta un dato del motor, esa familia no se usa.

#### Scenario: cortocircuito con &&
- GIVEN `if (edad >= 18 && tieneIne)` con `edad` = 16
- WHEN se presenta el reto y se revela
- THEN ninguna opción ni explicación da un valor para `tieneIne`; la explicación dice que Java no lo revisó

### Requirement: [REQ-RETO-007] Navegación con retos
Con el modo encendido, la reproducción automática MUST detenerse ante un reto sin contestar; avanzar con teclado MUST llevar el foco a las opciones en lugar de saltarlas; volver atrás y adelante MUST conservar la respuesta dada sin volver a preguntar; el deslizador y «Fin» MAY saltar retos, que quedan sin contestar; una ejecución nueva MUST empezar sin respuestas.

#### Scenario: la reproducción se detiene
- GIVEN el modo reto encendido y la reproducción automática activa
- WHEN la traza llega al paso anterior a una condición
- THEN la reproducción se pausa y aparecen las tres opciones con el foco en la primera

#### Scenario: regresar no vuelve a preguntar
- GIVEN un reto ya contestado en el paso 12
- WHEN el alumno regresa al paso 10 y avanza otra vez
- THEN el paso 12 se muestra con la respuesta que dio y su retroalimentación, sin volver a preguntar

### Requirement: [REQ-RETO-008] Ciclos con muchas vueltas
En un ciclo, el reto MUST preguntar en cada revisión de su condición y MUST ofrecer «Ya entendí este ciclo», que deja de preguntar en ese ciclo hasta que termine; cuando el programa vuelve a empezar ese ciclo, MUST volver a preguntar.

#### Scenario: silenciar un ciclo anidado
- GIVEN `u6-ciclos-anidados-tabla` con el modo reto encendido
- WHEN el alumno elige «Ya entendí este ciclo» en la segunda revisión del ciclo interno
- THEN no se pregunta más en ese ciclo interno hasta que su condición dé `false`, y en la siguiente vuelta del ciclo externo el interno vuelve a preguntar

### Requirement: [REQ-RETO-009] Accesible y proyectable
Las opciones MUST poder elegirse con teclado —Tab y las teclas 1, 2 y 3, anunciadas con `aria-keyshortcuts`— y con lector de pantalla; la retroalimentación MUST anunciarse con `aria-live="polite"`; MUST respetar `prefers-reduced-motion`; en modo proyector, a 1024×768 y 1280×720, la pregunta y las tres opciones MUST verse completas sin encimarse ni cortarse.

#### Scenario: solo teclado en el proyector
- GIVEN el modo proyector y el modo reto encendidos a 1024×768
- WHEN el docente contesta los cuatro retos de MaquinaSnacks solo con las teclas 1, 2 y 3 y «Siguiente»
- THEN cada pregunta y sus opciones se ven completas y axe-core no reporta violaciones graves ni críticas
