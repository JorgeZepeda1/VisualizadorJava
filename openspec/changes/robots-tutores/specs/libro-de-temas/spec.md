# Libro de temas

## Purpose

Define el robot del libro (R-D3): una sección tipo libro con 34 temas de U3 a U7 que empiezan por un ejemplo y terminan pidiendo predecir, modificar y crear (PRIMM), cuyos programas verificados contra el JDK 17 real se abren en el visualizador, y un acceso en contexto desde el código y desde la explicación de cada paso. Ningún tema se publica sin el visto bueno del PO. Incorpora la estructura y la lista del maestro (panel 1).

## Requirements

### Requirement: [REQ-LIBRO-001] Sección «Libro» con los temas de U3–U7
El sistema MUST ofrecer una sección «Libro» con un índice por unidad (U3–U7) sobre la lista cerrada de 34 temas del diseño, con navegación al tema anterior y al siguiente; una unidad sin temas publicados MUST decir «Este capítulo llega pronto». Abrir el libro MUST NOT perder el programa del editor ni la posición de la traza; al volver, todo MUST quedar como estaba.

#### Scenario: ir al libro y volver
- GIVEN una traza detenida en el paso 15
- WHEN el alumno abre el libro, lee dos temas y vuelve a «Paso a paso»
- THEN el editor tiene el mismo programa y la traza sigue en el paso 15

#### Scenario: una unidad todavía vacía
- GIVEN la oleada 1 publicada y ningún tema de U7 aprobado
- WHEN el alumno abre el índice
- THEN U7 dice «Este capítulo llega pronto» y no tiene enlaces

### Requirement: [REQ-LIBRO-002] Estructura que empieza por el ejemplo
Cada tema MUST tener, en este orden: «Para empezar» (una situación, un programa corto, «¿Qué crees que imprime?» y «Ver la salida»), «La idea» (de 3 a 5 frases), «Cómo se escribe» (la forma general y el orden en que Java la ejecuta), «Míralo paso a paso», «Errores típicos», «Ponte a prueba», «Ahora hazlo tú» y «En resumen» (3 viñetas). MUST tratar una sola idea; MUST NOT pasar de 550 palabras sin contar el código (la meta es 400); MUST estar en español de México con el tono y la voz del producto (REQ-PANT-010) y salir del catálogo es-MX. Al abrir un tema, MUST hablar el robot del libro.

#### Scenario: el tema del `while`
- GIVEN el tema «El ciclo `while`»
- WHEN se abre
- THEN el robot del libro presenta «Para empezar» con un programa y «¿Qué crees que imprime?», la salida está oculta tras «Ver la salida», y siguen las otras siete secciones en orden

### Requirement: [REQ-LIBRO-003] Programas verificados por el oráculo y dentro del subconjunto
Cada programa del libro (ejemplos, errores típicos, «Ponte a prueba» y soluciones de referencia de «Ahora hazlo tú») MUST estar en el corpus del libro, compilado y ejecutado por el JDK 17 real; toda salida que el libro muestre MUST tomarse del golden del oráculo, nunca escribirse a mano. Un programa que enseña un error de compilación MUST mostrar el veredicto y la línea de javac, y el motor MUST coincidir con ellos. Ningún programa del libro MUST producir un aviso de fuera de alcance ni un «No disponible» en la ejecución, y cada renglón de su entrada preparada MUST terminar en salto de línea.

#### Scenario: salida del ejemplo
- GIVEN un ejemplo del tema `while` con su entrada preparada
- WHEN se compara la salida que muestra el libro con el golden del oráculo
- THEN son idénticas byte a byte

#### Scenario: ejemplo de un error
- GIVEN un ejemplo del tema «Variables y tipos» que muestra `int x = 3.5;`
- WHEN se verifica
- THEN javac lo rechaza en la misma línea en que lo rechaza el motor, y el libro muestra el mensaje en español del motor

#### Scenario: un ejemplo fuera del subconjunto
- GIVEN un borrador del tema de variables con `static final double IVA = 0.16;` a nivel de clase
- WHEN corre la prueba del libro
- THEN falla porque el motor da un aviso de fuera de alcance; el ejemplo debe usar una constante `final` local

### Requirement: [REQ-LIBRO-004] «Ponte a prueba» y «Ahora hazlo tú»
«Ponte a prueba» MUST tener 2 o 3 predicciones sobre programas del corpus del libro, con la respuesta oculta tras «Ver la respuesta» y tomada del golden. «Ahora hazlo tú» MUST tener una tarea de modificar y una de crear; cada una MUST decir cómo comprobarla («Para comprobar: con la entrada 5 debe imprimir…») con la salida del golden de una solución de referencia del corpus del libro.

#### Scenario: comprobar una tarea de crear
- GIVEN la tarea de crear del tema `for`
- WHEN el alumno la lee
- THEN ve la entrada de prueba y la salida esperada, y esa salida es idéntica al golden de la solución de referencia

### Requirement: [REQ-LIBRO-005] Abrir un ejemplo en el visualizador
Cada ejemplo MUST ofrecer «▶ Verlo paso a paso», que carga su código y su entrada preparada en el editor, y «🎯 Ponerme a prueba», que hace lo mismo con el modo reto encendido. Mientras el programa vino del libro, el visualizador MUST mostrar la franja «Ejemplo del libro: {tema} · ← Volver al tema». Si el editor tenía otro programa, el sistema MUST avisar que se reemplaza y MUST ofrecer volver a él. La segunda vez que el alumno abre el mismo ejemplo con el reto apagado, el robot MUST sugerir encenderlo.

#### Scenario: no se pierde el programa del alumno
- GIVEN el editor con un programa escrito por el alumno
- WHEN abre un ejemplo del libro en el visualizador y luego pulsa «Volver a mi programa»
- THEN el editor vuelve a tener su programa sin cambios

#### Scenario: ponerme a prueba
- GIVEN el ejemplo «Contar del 1 al 5» del tema `while`
- WHEN el alumno elige «🎯 Ponerme a prueba»
- THEN el programa se carga, el modo reto queda encendido y la franja dice «Ejemplo del libro: El ciclo `while` · ← Volver al tema»

### Requirement: [REQ-LIBRO-006] Tema en contexto
Mientras se edita, el editor MUST mostrar el acceso 📖 solo en la línea del cursor cuando esa línea tiene un `if`, `switch`, `while`, `do` o `for`, junto con un botón visible «Tema de esta línea» y el atajo `Alt+F1`. Durante la visualización, cuando el paso actual es una condición o una selección de `switch`, el globo MUST ofrecer el enlace a su tema («📖 ¿Qué es un `while`?»). Un `if` sin `else` MUST abrir «Decisiones: el `if`»; uno con `else`, «`if` con `else`: dos caminos»; uno de una escalera, el de `else if`; un `for` cuya actualización resta MUST ofrecer también el de ciclos incrementales y decrementales. Solo se ofrecen temas publicados.

#### Scenario: desde el código
- GIVEN el editor con el cursor en un `for (int i = 10; i > 0; i--)` en la línea 4
- WHEN el alumno pulsa «Tema de esta línea»
- THEN se abre el tema del `for` con el enlace a «Ciclos incrementales y decrementales»

#### Scenario: desde la explicación
- GIVEN el paso actual es la condición de un `while`
- WHEN el alumno sigue el enlace del globo
- THEN se abre el tema del `while`

### Requirement: [REQ-LIBRO-007] Nada se publica sin el visto bueno del PO
Cada tema MUST estar en estado *borrador* o *aprobado*. El sitio publicado MUST mostrar solo los temas aprobados. Una aprobación MUST guardar la huella del contenido del tema (textos y programas) y cualquier cambio posterior MUST invalidarla hasta que el PO vuelva a aprobarlo. En desarrollo, los borradores MUST verse con una marca visible de «Borrador».

#### Scenario: un borrador no se publica
- GIVEN el tema «`do-while`» en estado borrador
- WHEN se construye el sitio publicado
- THEN el índice del libro no lo muestra y ningún acceso en contexto lleva a él

#### Scenario: cambiar un texto aprobado
- GIVEN el tema «`while`» aprobado con su huella
- WHEN se cambia una frase de su texto
- THEN la verificación de aprobaciones falla hasta que el tema vuelve a borrador o el PO lo aprueba de nuevo

### Requirement: [REQ-LIBRO-008] Carga aparte y peso
El libro MUST cargarse aparte de la pantalla principal, sin retrasar la primera interacción; MUST quedar en el precache para funcionar sin red; cada uno de sus fragmentos MUST pesar 80 KB comprimidos o menos, y el total MUST seguir dentro de REQ-PLAT-003.

#### Scenario: sin red después de la primera visita
- GIVEN una visita previa con el libro aún sin abrir
- WHEN, sin red, el alumno abre el libro y un ejemplo en el visualizador
- THEN el libro y el ejemplo funcionan y no hay peticiones a otros orígenes

### Requirement: [REQ-LIBRO-009] Libro accesible
El libro MUST usar encabezados jerárquicos y regiones con nombre, MUST poder recorrerse completo con teclado (incluidos «Ver la salida» y «Ver la respuesta»), MUST aguantar el zoom al 200 % sin perder contenido y MUST tener una versión legible en modo proyector; el código de los ejemplos MUST tener contraste AA.

#### Scenario: auditoría del libro
- GIVEN el índice y tres temas abiertos en Chromium, Firefox y WebKit
- WHEN corre axe-core
- THEN no hay violaciones graves ni críticas
