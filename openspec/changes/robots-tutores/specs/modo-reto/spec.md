# Modo reto

## Purpose

Define el modo reto del robot paso a paso (R-D2): antes de revelar cada condición y cada selección de `switch`, el alumno elige entre tres opciones que dicen qué pasa y por qué; el robot explica su acierto o su error. La respuesta correcta y cada refutación salen de lo que el motor calculó (D2). Es la forma que toma la predicción de D4 (REQ-VIS-013). Incorpora el panel 1: formato «consecuencia, porque razón», catálogo del maestro, balance del veredicto, condiciones sin reto, «Ya entendí este ciclo» ampliado y la distribución medida por el diseñador.

## Requirements

### Requirement: [REQ-RETO-001] Interruptor del modo reto
El modo reto MUST estar apagado al abrir el visualizador sin parámetro; MUST poder encenderse y apagarse en cualquier momento con el interruptor «Modo reto» del encabezado, que dice «Encendido» o «Apagado» en palabras, y MUST poder encenderse con un parámetro del enlace. La primera vez que se enciende en una visita, el robot MUST explicar que preguntará antes de cada condición y que no es una calificación. Al apagarlo, la navegación MUST volver a ser la de siempre sin perder la posición de la traza.

#### Scenario: apagado por omisión
- GIVEN el visualizador abierto sin parámetros
- WHEN se visualiza MaquinaSnacks
- THEN «Siguiente» avanza por todos los pasos sin preguntar nada

#### Scenario: encender a mitad de la traza
- GIVEN una traza detenida en el paso 8
- WHEN el alumno enciende el interruptor
- THEN la traza sigue en el paso 8, el robot dice «Modo reto: antes de cada condición te pregunto qué crees que pase. No es calificación: si te equivocas, te explico por qué.» y el siguiente paso de condición se presenta como reto

### Requirement: [REQ-RETO-002] Dónde pregunta y dónde no
Con el modo encendido, antes de revelar cada condición de `if`, `else if`, `while`, `do-while` y `for`, y cada selección de un `switch`, el sistema MUST presentar la pregunta con tres opciones en lugar de avanzar. MUST NOT preguntar en ningún otro paso (declaraciones, asignaciones, impresiones, lecturas, la caída de un `switch`, `break`, `continue`, `return`, un `for (;;)`), ni en una condición o un selector que: sea una expresión constante de Java (`while (true)`, `if (MODO_PRUEBA)` con `final`); llame a `Scanner` o a `Random`; tenga dentro un incremento, un decremento o una asignación; o no tenga, para cada parte, la sustitución que da el motor. Esos pasos se narran sin pregunta y el motor MUST indicar el motivo.

#### Scenario: MaquinaSnacks con la entrada a1, 2, 50
- GIVEN el modo reto encendido y MaquinaSnacks con la entrada `a1`, `2`, `50`
- WHEN se recorre la traza completa
- THEN hay exactamente cuatro retos: el `switch` de la línea 24 y los `if` de las líneas 53, 66 y 72

#### Scenario: una condición constante
- GIVEN `while (true)` con un `break` dentro
- WHEN la traza llega a cada revisión de esa condición
- THEN no hay pregunta y el motor marca el motivo «constante»

#### Scenario: una condición que lee del teclado o del azar
- GIVEN `while (sc.nextInt() != 0)` o `if (rand.nextInt(2) == 0)`
- WHEN la traza llega a esa condición
- THEN no hay pregunta y el motor marca el motivo «lee entrada» o «azar»

### Requirement: [REQ-RETO-003] Tres opciones «consecuencia, porque razón»
Cada reto MUST ofrecer exactamente tres opciones distintas con el mismo formato: una **consecuencia** de hasta 30 caracteres (qué pasa: entra o se salta, se va al `else`, da otra vuelta o sale, a qué `case` salta) y una **razón**, en total no más de 100 caracteres sin contar las comillas invertidas. Exactamente una MUST ser verdadera en las dos partes según lo que el motor calculó para ese paso. El orden MUST ser determinista para el mismo programa, la misma entrada y el mismo paso.

#### Scenario: un if simple con else (línea 72)
- GIVEN MaquinaSnacks en la línea 72 con `dinero` = 50 y `total` = 36
- WHEN se presenta el reto
- THEN las opciones son «Se va al `else`, porque `50 < 36` da `false`» (la correcta, familia correcta), «Entra al `if`, porque `<` pregunta si 50 es mayor que 36, y lo es» (familia `simbolo-al-reves`) y «Ejecuta los dos: primero el bloque del `if` y luego el del `else`» (familia `dos-bloques`)

#### Scenario: todo el corpus
- GIVEN todos los pasos con reto de los programas ejecutables del corpus
- WHEN se construye cada reto con los datos más largos del corpus
- THEN cada uno tiene tres opciones distintas, exactamente una verdadera según las afirmaciones verificadas contra la traza, y ninguna pasa de 100 caracteres

### Requirement: [REQ-RETO-004] Distractores del catálogo, nunca relleno
Cada distractor MUST salir de una familia del catálogo cerrado, revisado por el PO al inicio de su hito, que aplique a esa condición según sus operadores, los datos del motor, la construcción y la historia de la traza; MUST ser falso en al menos una afirmación verificable contra la traza o contra una regla de Java respaldada por un programa del oráculo. Dos opciones MUST NOT afirmar lo mismo. Las familias `y-revisa-los-dos` y `otra-etiqueta` MUST NOT usarse por omisión. Para cada construcción MUST existir al menos una familia que siempre aplica. En el corpus, `pieza-volteada` MUST NOT pasar del 20 % de los retos e `if-como-ciclo`/`if-espera` MUST NOT pasar de 1 de cada 3 retos de `if` de un mismo programa.

#### Scenario: `||` con los dos lados false (línea 53)
- GIVEN MaquinaSnacks en la línea 53 con `cantidad` = 2 (`cantidad < 1 || cantidad > 3`)
- WHEN se presenta el reto
- THEN las opciones son «Se salta el `if`, porque `2 < 1` y `2 > 3` dan `false`» (correcta), «Entra al `if`, porque `cantidad` vale 2, que sí está entre 1 y 3» (`rango-al-reves`) y «Se salta el `if`: `2 < 1` da `false`, y con `||` eso ya basta» (`o-se-detiene-con-false`)

#### Scenario: un switch con break (línea 24)
- GIVEN MaquinaSnacks en la línea 24 con la entrada `a1`, que la línea 19 convirtió en "A1"
- WHEN se presenta el reto
- THEN las opciones son «Salta al `case "A1"`, porque `codigo` vale "A1"» (correcta), «Salta al `default`: escribiste `a1` en minúsculas y el `case` dice "A1"» (defecto con el valor tecleado) y «Salta al `case "A1"` y sigue de largo con los demás `case`» (`sigue-de-largo`)

#### Scenario: un switch que salta al default
- GIVEN MaquinaSnacks en la línea 24 con la entrada `z9`
- WHEN se presenta el reto
- THEN la correcta dice que salta al `default` y la segunda opción es de la familia `sin-default`: «No ejecuta nada del `switch`, porque ningún `case` dice "Z9"», refutada con que, cuando ningún `case` coincide, Java salta al `default`

#### Scenario: la frontera de un `<`
- GIVEN `u6-error-por-uno`, tercer ciclo, cuando `i` vale 10 en `i < 10`
- WHEN se presenta el reto
- THEN la segunda opción es de la familia `frontera`: «Da otra vuelta, porque 10 y 10 son iguales y `10 < 10` lo acepta»

#### Scenario: el valor de la vuelta anterior
- GIVEN `u6-suma-1-a-n` con la entrada 5, en la revisión de `i <= n` con `i` = 6
- WHEN se presenta el reto
- THEN la segunda opción es de la familia `revision-anterior` y su refutación cita el `i++` de la línea 8 que cambió `i` de 5 a 6

#### Scenario: un while que no entra nunca
- GIVEN `u6-prediccion-while-no-ejecuta` en la primera revisión de `contador <= 5` con `contador` = 8
- WHEN se presenta el reto
- THEN una opción es de la familia `primera-revision`: «Da una vuelta y luego sale, porque el `while` entra al menos una vez»

#### Scenario: un while cuya variable nada cambia
- GIVEN un `while (contador <= 5)` cuyo cuerpo no cambió `contador` en la vuelta anterior
- WHEN se presenta el reto de la segunda revisión
- THEN la familia `el-ciclo-cuenta-solo` aplica y su refutación dice que en la vuelta anterior nada cambió `contador`

### Requirement: [REQ-RETO-005] Balance del veredicto
En los retos del corpus cuyas opciones tienen dos veredictos posibles (`if`, `else if`, `while`, `do-while`, `for`), la proporción de retos en que el veredicto de la opción correcta aparece también en otra opción MUST quedar entre el 40 % y el 60 %. Si el catálogo no lo alcanza, el modo reto MUST NOT publicarse con este formato: el PO decide entre ajustar el catálogo o pasar a la forma (C), Sí/No y después «¿por qué?».

#### Scenario: medición en el corpus
- GIVEN todos los retos de dos veredictos del corpus ejecutable
- WHEN se cuentan los retos cuya consecuencia correcta se repite en un distractor
- THEN la proporción está entre el 40 % y el 60 %

#### Scenario: el balance no se alcanza
- GIVEN un catálogo con el que la proporción queda en el 75 %
- WHEN corre la prueba de propiedad del corpus
- THEN la prueba falla y el hito no puede cerrarse hasta la decisión del PO

### Requirement: [REQ-RETO-006] Retroalimentación
Al elegir una opción (elegir confirma, sin botón aparte), el sistema MUST mostrar en el globo, en lugar de la narración de ese paso: ✔ «¡Eso es!» con la razón y la sustitución del motor si acertó; ◐ «Casi» con lo que atinó y la razón real si acertó la consecuencia pero no la razón; ✖ «No es esa» con el dato del motor que refuta su opción y por qué la correcta sí. Cada resultado MUST marcarse con ícono, palabra y estilo de borde, nunca solo con color; la opción correcta MUST rotularse «✔ Lo que hizo Java»; un desplegable «¿Y las otras opciones?» MUST dar la refutación de cada distractor. MUST NOT decir «incorrecto». El panel de condición MUST quedar oculto hasta que el alumno contesta.

#### Scenario: acierto parcial (línea 53)
- GIVEN el reto de la línea 53 con `cantidad` = 2
- WHEN el alumno elige «Se salta el `if`: `2 < 1` da `false`, y con `||` eso ya basta»
- THEN el globo dice «◐ Casi», que atinó en que no entra, y que con `||` Java deja de revisar solo si el primer lado es `true`; aquí fue `false`, así que revisó `2 > 3`

#### Scenario: error (línea 72)
- GIVEN el reto de la línea 72 con `dinero` = 50 y `total` = 36
- WHEN el alumno elige la opción de `simbolo-al-reves`
- THEN el globo dice «✖ No es esa», que `<` se lee «es menor que» y que `50 < 36` da `false`, así que Java ejecuta solo el bloque del `else`

#### Scenario: las otras opciones
- GIVEN un reto ya contestado con acierto
- WHEN el alumno abre «¿Y las otras opciones?»
- THEN ve por qué cada uno de los dos distractores no es lo que hizo Java

### Requirement: [REQ-RETO-007] Nunca un resultado inventado
Todo valor de una variable o de una parte de la condición que aparezca en una opción, una refutación o una explicación MUST provenir de la traza (valores, sustituciones, relación entre dos números, si dos textos dicen lo mismo, cambios de una variable con su línea, valor leído) o de la estructura del programa que entrega el motor; la interfaz MUST NOT evaluar ninguna expresión. Una parte que Java no revisó por cortocircuito MUST citarse como «no revisada», nunca con un valor, ni siquiera en un distractor; si a una familia le falta un dato del motor, esa familia no se usa. Con `==` o `!=` entre `String`, la opción correcta MUST dar la razón de identidad (son dos textos distintos guardados) y ningún texto MUST decir que `==` «no sirve» con `String`.

#### Scenario: cortocircuito con &&
- GIVEN `if (edad >= 18 && tieneIne)` con `edad` = 16
- WHEN se presenta el reto y se revela
- THEN ninguna opción ni explicación da un valor para `tieneIne` y la explicación dice que Java no lo revisó

#### Scenario: dos textos iguales con ==
- GIVEN `if (respuesta == "si")` con la entrada `si` leída con `sc.next()`
- WHEN se presenta el reto
- THEN la opción correcta dice que se salta el `if` porque son dos textos distintos guardados, aunque los dos digan «si»

### Requirement: [REQ-RETO-008] Navegación y revelación en dos tiempos
Con el modo encendido, al pulsar «Siguiente» en el paso anterior a una condición, el globo MUST cambiar a la pregunta (con el rótulo «Reto · línea N» y el robot con su letrero «?») sin avanzar de paso; narración y pregunta MUST NOT mezclarse. La reproducción automática MUST detenerse ante un reto sin contestar; la flecha derecha MUST llevar el foco a la primera opción en lugar de saltar el reto; volver atrás y adelante MUST conservar la respuesta sin volver a preguntar; el deslizador y «Fin» MAY saltar retos, que quedan sin contestar; una ejecución nueva MUST empezar sin respuestas.

#### Scenario: la reproducción se detiene
- GIVEN el modo reto encendido y la reproducción automática activa
- WHEN la traza llega al paso anterior a una condición
- THEN la reproducción se pausa y aparecen las tres opciones con el foco en la primera

#### Scenario: regresar no vuelve a preguntar
- GIVEN un reto ya contestado en el paso 12
- WHEN el alumno regresa al paso 10 y avanza otra vez
- THEN el paso 12 se muestra con la respuesta que dio y su retroalimentación, sin volver a preguntar

### Requirement: [REQ-RETO-009] Ciclos con muchas vueltas
En un ciclo, el reto MUST preguntar en cada revisión de su condición y MUST ofrecer «Ya entendí este ciclo», con la descripción «Dejo de preguntarte aquí y te vuelvo a preguntar cuando el ciclo esté por terminar». Al elegirlo, MUST dejar de preguntar en ese ciclo **y en toda condición dentro de él** (sus `if`, `switch` y ciclos internos) hasta que el ciclo termine, salvo en sus dos últimas revisiones (la última que da `true` y la que da `false`), donde MUST volver a preguntar si la traza ya las contiene; si la traza aún no las contiene (por ejemplo, espera un dato del teclado), MUST seguir sin preguntar. Cuando el programa vuelve a empezar ese ciclo, MUST volver a preguntar.

#### Scenario: un ciclo con un if adentro
- GIVEN `u6-contador-de-pares` con el modo reto encendido
- WHEN el alumno elige «Ya entendí este ciclo» en la primera revisión
- THEN no hay más retos dentro del ciclo hasta sus dos últimas revisiones, que sí se preguntan

#### Scenario: ciclos anidados
- GIVEN `u6-ciclos-anidados-tabla` con el modo reto encendido
- WHEN el alumno silencia el ciclo interno en su segunda revisión
- THEN no se pregunta más en él hasta sus dos últimas revisiones, y en la siguiente vuelta del ciclo externo el interno vuelve a preguntar desde su primera revisión

#### Scenario: entrada en vivo
- GIVEN un ciclo silenciado que pide un dato del teclado en cada vuelta
- WHEN la traza todavía no llega al final del ciclo
- THEN no se pregunta, porque aún no se sabe cuáles son las dos últimas revisiones

### Requirement: [REQ-RETO-010] Tarjetas accesibles y proyectables
Cada opción MUST ser una tarjeta a todo el ancho de su columna, de al menos 56 px de alto, con su número grande, la consecuencia en negritas y la razón debajo; MUST poder elegirse con Tab y Enter y con las teclas 1, 2 y 3, anunciadas con `aria-keyshortcuts`. Al aparecer la pregunta el foco MUST ir a la tarjeta 1; al contestar, MUST pasar a «Siguiente» y el resultado MUST anunciarse con `aria-live="polite"`. El resaltado de la elegida MUST durar 150 ms como máximo y MUST NOT haber movimiento con `prefers-reduced-motion`. Mientras un reto espera respuesta, la columna derecha (en celular, la zona inferior) MUST ser exclusiva del reto: pregunta, «Valores ahora» con las variables que lee la condición (del motor) y las tres tarjetas; panel de condición oculto, variables reducidas y consola compacta. A 1024×768 y 1280×720 en modo proyector y a 390×844, la pregunta, las tres tarjetas, el porqué y «Siguiente» MUST verse sin desplazar, sin encimarse ni cortarse.

#### Scenario: solo teclado en el proyector
- GIVEN el modo proyector y el modo reto encendidos a 1024×768
- WHEN el docente contesta los cuatro retos de MaquinaSnacks solo con las teclas 1, 2 y 3 y «Siguiente»
- THEN cada pregunta, sus tarjetas y su porqué se ven completos y axe-core no reporta violaciones graves ni críticas

#### Scenario: celular
- GIVEN una ventana de 390×844 con el reto de la línea 53 pendiente
- WHEN se muestra la pregunta
- THEN se ven la línea 53 del código, la pregunta, «Valores ahora: `cantidad` = 2» y las tres tarjetas sin desplazar
