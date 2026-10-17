# Libro de temas

## Purpose

Define el robot explicador (R-D3): una sección tipo libro con los temas de U3 a U7, cuyos ejemplos verificados contra el JDK 17 real se abren en el visualizador, y un acceso en contexto desde el código y desde la explicación de cada paso. Ningún tema se publica sin el visto bueno del PO.

## Requirements

### Requirement: [REQ-LIBRO-001] Sección «Libro» con los temas de U3–U7
El sistema MUST ofrecer una sección «Libro» con un índice por unidad (U3–U7) sobre una lista cerrada de temas, con navegación al tema anterior y al siguiente. Abrir el libro MUST NOT perder el programa del editor ni la posición de la traza; al volver al visualizador, todo MUST quedar como estaba.

#### Scenario: ir al libro y volver
- GIVEN una traza detenida en el paso 15
- WHEN el alumno abre el libro, lee dos temas y vuelve al visualizador
- THEN el editor tiene el mismo programa y la traza sigue en el paso 15

### Requirement: [REQ-LIBRO-002] Estructura y tono de libro
Cada tema MUST tener la idea en palabras simples, cómo se escribe en Java, al menos un ejemplo, los errores típicos de ese tema y un resumen; MUST estar escrito en español de México con el tono del producto (tuteo, sin infantilizar, vocabulario del curso), MUST salir del catálogo es-MX y MUST NOT pasar del máximo de palabras por tema que fija el diseño.

#### Scenario: el tema del `for`
- GIVEN el tema «El ciclo `for`»
- WHEN se abre
- THEN muestra, en este orden, la idea, cómo se escribe (inicio, condición y actualización), un ejemplo con su salida, los errores típicos (error por uno, `;` tras el paréntesis) y un resumen

### Requirement: [REQ-LIBRO-003] Ejemplos verificados por el oráculo
Cada ejemplo MUST ser un programa del corpus del libro compilado y ejecutado por el JDK 17 real; la salida que el libro muestre MUST tomarse del golden del oráculo, nunca escribirse a mano. Un ejemplo que enseña un error de compilación MUST mostrar el veredicto y la línea que dio javac, y el motor MUST coincidir con ellos.

#### Scenario: salida del ejemplo
- GIVEN un ejemplo del tema `while` con su entrada preparada
- WHEN se compara la salida que muestra el libro con el golden del oráculo
- THEN son idénticas byte a byte

#### Scenario: ejemplo de un error
- GIVEN un ejemplo del tema «Variables y tipos» que muestra `int x = 3.5;`
- WHEN se verifica
- THEN javac lo rechaza en la misma línea en que lo rechaza el motor, y el libro muestra el mensaje en español del motor

### Requirement: [REQ-LIBRO-004] Abrir un ejemplo en el visualizador
«Ábrelo en el visualizador» MUST cargar el código y la entrada preparada del ejemplo en el editor, listos para «Visualizar». Si el editor tenía otro programa, el sistema MUST avisar que se reemplaza y MUST ofrecer volver a él.

#### Scenario: no se pierde el programa del alumno
- GIVEN el editor con un programa escrito por el alumno
- WHEN abre un ejemplo del libro en el visualizador y luego pulsa «Volver a mi programa»
- THEN el editor vuelve a tener su programa sin cambios

### Requirement: [REQ-LIBRO-005] Tema en contexto
Junto a cada `if`, `switch`, `while`, `do` y `for` del editor, el sistema MUST ofrecer un acceso que abre su tema, también con una tecla para la línea del cursor; y cuando el paso actual es una condición o una selección de `switch`, la explicación del robot MUST ofrecer el enlace a su tema. Un `if` con `else` MUST abrir el tema de `if`/`else`; uno de una escalera, el de `else if`; un `for` cuya actualización resta MUST ofrecer también el de ciclos incrementales y decrementales.

#### Scenario: desde el código
- GIVEN el editor con un `for (int i = 10; i > 0; i--)` en la línea 4
- WHEN el alumno pulsa el acceso de la línea 4
- THEN se abre el tema del `for` con el enlace a «Ciclos incrementales y decrementales»

#### Scenario: desde la explicación
- GIVEN el paso actual es la condición de un `while`
- WHEN el alumno sigue el enlace de la explicación del robot
- THEN se abre el tema del `while`

### Requirement: [REQ-LIBRO-006] Nada se publica sin el visto bueno del PO
Cada tema MUST estar en estado *borrador* o *aprobado*. El sitio publicado MUST mostrar solo los temas aprobados. Una aprobación MUST guardar la huella del contenido del tema (textos y ejemplos) y cualquier cambio posterior MUST invalidarla hasta que el PO vuelva a aprobarlo. En desarrollo, los borradores MUST verse con una marca visible de «Borrador».

#### Scenario: un borrador no se publica
- GIVEN el tema «`do-while`» en estado borrador
- WHEN se construye el sitio publicado
- THEN el índice del libro no lo muestra y ningún acceso en contexto lleva a él

#### Scenario: cambiar un texto aprobado
- GIVEN el tema «`while`» aprobado con su huella
- WHEN se cambia una frase de su texto
- THEN la verificación de aprobaciones falla hasta que el tema vuelve a borrador o el PO lo aprueba de nuevo

### Requirement: [REQ-LIBRO-007] Carga aparte y peso
El libro MUST cargarse aparte de la pantalla principal, sin retrasar la primera interacción; MUST quedar en el precache para funcionar sin red; su fragmento MUST pesar 80 KB comprimidos o menos, y el total MUST seguir dentro de REQ-PLAT-003.

#### Scenario: sin red después de la primera visita
- GIVEN una visita previa con el libro aún sin abrir
- WHEN, sin red, el alumno abre el libro y un ejemplo en el visualizador
- THEN el libro y el ejemplo funcionan y no hay peticiones a otros orígenes

### Requirement: [REQ-LIBRO-008] Libro accesible
El libro MUST usar encabezados jerárquicos y regiones con nombre, MUST poder recorrerse completo con teclado, MUST aguantar el zoom al 200 % sin perder contenido y MUST tener una versión legible en modo proyector; el código de los ejemplos MUST tener contraste AA.

#### Scenario: auditoría del libro
- GIVEN el índice y tres temas abiertos en Chromium, Firefox y WebKit
- WHEN corre axe-core
- THEN no hay violaciones graves ni críticas
