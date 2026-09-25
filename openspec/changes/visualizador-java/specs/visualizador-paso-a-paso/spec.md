# Visualizador paso a paso

## Purpose

Define los paneles, controles, marcadores y explicaciones que el alumno y el docente ven en cada paso de la traza: la interfaz observable, no la tecnología que la dibuja.

## Requirements

### Requirement: [REQ-VIS-001] Editor de código
El sistema MUST ofrecer un editor donde el código Java se puede pegar o escribir directamente, con resaltado de sintaxis de Java y números de línea visibles, sin pasos de configuración previos.

#### Scenario: pegar código sin configuración previa
- GIVEN el visualizador recién abierto, sin ningún programa cargado
- WHEN el usuario pega un programa Java completo en el editor
- THEN el texto aparece con resaltado de sintaxis de Java y números de línea, listo para analizar, sin ningún paso de configuración antes

### Requirement: [REQ-VIS-002] Mensajes de error y aviso en línea
El sistema MUST mostrar cada error de compilación o aviso de fuera de alcance anclado a su línea exacta, con un subrayado sobre el código señalado, y con ícono y título distinguibles para cada uno de los cuatro tipos: *Error de compilación*, *No disponible en el visualizador*, *El programa se detuvo por un error*, *Se detuvo por seguridad*.

#### Scenario: error de compilación anclado a su línea
- GIVEN un programa con `int x = 5` (sin `;`) en la línea 3
- WHEN se analiza
- THEN el editor subraya la línea 3 y muestra el mensaje con el ícono y el título de "Error de compilación", distinto del de "No disponible en el visualizador"

### Requirement: [REQ-VIS-003] Control de nivel de paso
El sistema MUST mostrar, siempre visible, un control para alternar entre el nivel **Normal** (por omisión) y **Detallado**, que el usuario puede cambiar en cualquier punto de la traza sin perder su posición.

#### Scenario: cambiar de Normal a Detallado a mitad de la traza
- GIVEN una traza detenida en el paso 10, en modo Normal
- WHEN el usuario activa el control de nivel Detallado
- THEN la traza permanece en el mismo punto del programa y los pasos siguientes se muestran por subexpresión

### Requirement: [REQ-VIS-004] Marcadores de línea
El sistema MUST distinguir visualmente, con dos marcas diferentes (no solo color), la línea que se acaba de ejecutar y la línea que sigue.

#### Scenario: línea recién ejecutada y línea siguiente distinguibles
- GIVEN una traza detenida después de ejecutar la línea 4 de un programa
- WHEN se muestra el editor
- THEN la línea 4 lleva la marca de "recién ejecutada" y la línea 5 lleva la marca distinta de "siguiente", sin depender solo del color

### Requirement: [REQ-VIS-005] Panel de variables
El sistema MUST mostrar, por cada variable visible en el paso actual, su nombre, tipo y valor; al cambiar de valor MUST mostrar el valor anterior atenuado junto al nuevo resaltado; una variable declarada sin inicializar MUST mostrarse como "sin inicializar"; una variable que sale de alcance al cerrar su bloque MUST atenuarse o retirarse del panel con una nota.

#### Scenario: valor anterior → nuevo
- GIVEN `contador` vale `3` y el paso ejecuta `contador++;`
- WHEN se muestra el panel de variables tras ese paso
- THEN `contador` se muestra como `3 → 4`, con el `3` atenuado

### Requirement: [REQ-VIS-006] Panel de condición
Cuando el paso actual es la evaluación de una condición, el sistema MUST mostrar la cadena de sustitución completa (p. ej. `intentos < 10 → 3 < 10 → true`), MUST marcar con un indicador la rama que corre (✓) y atenuar —nunca ocultar— la rama que no corre (✗), MUST mostrar la cadena de evaluación de un `else if` en orden, y MUST señalar explícitamente el `case` igualado, la caída sin `break`, y el `default`, en un `switch`.

#### Scenario: rama no tomada se atenúa, no desaparece
- GIVEN `if (x > 5) { } else { } }` con `x = 3`
- WHEN se ejecuta la condición
- THEN el bloque `else` se marca como el que corre y el bloque del `if` se atenúa visualmente, pero sigue visible en el código

### Requirement: [REQ-VIS-007] Contador de vueltas
El sistema MUST mostrar el número de vuelta de cualquier ciclo activo en el paso actual, y MUST mostrarlo por separado para cada ciclo cuando hay anidamiento.

#### Scenario: dos ciclos anidados muestran su vuelta por separado
- GIVEN un `for` externo en su vuelta 2 con un `for` interno en su vuelta 3
- WHEN se muestra el paso actual
- THEN el panel indica "ciclo externo: vuelta 2 · ciclo interno: vuelta 3", cada contador por separado

### Requirement: [REQ-VIS-008] Consola
El sistema MUST mostrar el mensaje de un `print` y la entrada que el usuario teclea a continuación en el mismo renglón, con la entrada en un color distinto Y un rasgo no cromático adicional (p. ej. un ícono o subrayado) que no dependa solo del color; `System.err` MUST mostrarse en rojo dentro de la misma consola; el panel MUST NOT mostrar mensajes propios de un IDE (`run:`, `BUILD SUCCESSFUL`, etc.).

#### Scenario: mensaje del programa en rojo distinto de la salida normal
- GIVEN un programa que ejecuta `System.out.println("ok"); System.err.println("cuidado");`
- WHEN se muestra la consola
- THEN "ok" aparece con el estilo normal y "cuidado" aparece en rojo, ambos en el orden en que el programa los generó

### Requirement: [REQ-VIS-009] Entrada de `Scanner` — interactiva, precargada y búfer visible
El sistema MUST detener la ejecución en cada lectura de `Scanner` y mostrar un estado de espera hasta que el usuario teclee un valor (modo interactivo, por omisión); MUST también admitir una lista de entradas precargadas que se consumen antes de pedir algo interactivamente; MUST ofrecer el punto decimal como separador por omisión y la coma como opción explícita; y MUST mostrar una franja contextual con el contenido pendiente del renglón actual del búfer de `Scanner`, incluido un salto de línea visible (⏎), para explicar el error clásico de `nextInt()` seguido de `nextLine()`.

#### Scenario: búfer pendiente visible tras `nextInt()`
- GIVEN `int edad = sc.nextInt();` con entrada `"20\nJuan\n"`
- WHEN se ejecuta ese paso
- THEN la franja del búfer muestra el salto de línea pendiente (⏎) antes de "Juan", visualmente distinto del texto ya consumido

### Requirement: [REQ-VIS-010] Prueba de escritorio
El sistema MUST ofrecer una pestaña alterna al panel de Variables llamada "Prueba de escritorio", con un renglón por paso relevante (asignaciones y evaluaciones de condición) y una columna por variable; MUST resaltar la celda que cambió en cada renglón y MUST incluir una columna de salida de consola.

#### Scenario: celda resaltada al cambiar una variable
- GIVEN una traza donde `total` cambia de `0` a `25` en el paso 6
- WHEN se abre la pestaña "Prueba de escritorio"
- THEN el renglón del paso 6 muestra la celda de `total` resaltada con su nuevo valor, junto a las demás columnas de variables y la columna de salida

### Requirement: [REQ-VIS-011] Explicación en español por paso
El sistema MUST mostrar, en una ubicación fija dentro del mismo campo visual que el código y las variables (nunca en una pestaña aparte), una explicación en español de máximo dos renglones que traduce el paso actual usando las plantillas de tono definidas para el producto (declaración, asignación, condición, cortocircuito, ciclo, `switch`, `break`/`continue`, entrada/salida, excepción, fin de programa).

#### Scenario: explicación de una asignación
- GIVEN el paso que ejecuta `total = total + precio;` con `total` pasando de `100` a `125`
- WHEN se muestra el paso
- THEN la explicación de máximo dos renglones dice, en el mismo campo visual que el código: "se calcula total + precio y el resultado (125) se guarda en total. Antes tenía 100."

### Requirement: [REQ-VIS-012] Controles de reproducción
El sistema MUST ofrecer controles de inicio, atrás, adelante, fin, reproducción con velocidad ajustable, y un deslizador de posición con el formato "paso X de Y"; MUST responder a los atajos de teclado: flechas izquierda/derecha para atrás/adelante, Inicio/Fin para saltar a los extremos, y espacio para reproducir/pausar.

#### Scenario: atajos de teclado avanzan y retroceden
- GIVEN una traza detenida en el paso 5
- WHEN el usuario presiona la flecha derecha y luego la flecha izquierda
- THEN el paso avanza a 6 y regresa a 5, igual que con los botones "Adelante"/"Atrás"

### Requirement: [REQ-VIS-013] Modo predicción (apagado por omisión)
El modo predicción MUST estar apagado al abrir el visualizador sin un parámetro explícito. Cuando el docente lo activa (con un interruptor visible o abriendo un enlace con el parámetro de predicción), el sistema MUST, antes de revelar el resultado de cualquier evaluación de condición o de continuación de un ciclo, reemplazar el control "Adelante" por una elección Sí/No; solo después de que el usuario elige, MUST revelar el resultado real junto con su explicación.

#### Scenario: predicción pide Sí/No antes de revelar
- GIVEN el modo predicción activado y el paso siguiente es la condición de un `while`
- WHEN el usuario llega a ese paso
- THEN el control "Adelante" se sustituye por "¿Se repite el ciclo? Sí / No"; solo al responder se muestra el resultado real y la explicación
