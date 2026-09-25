# Motor de ejecución

## Purpose

Define la semántica observable de ejecutar, paso a paso, un programa que ya pasó el análisis estático: qué es un paso en cada nivel de detalle, cómo se comportan el control de flujo y la aritmética, y cómo terminan las excepciones, el límite de seguridad y las semillas de aleatoriedad.

## Requirements

### Requirement: [REQ-EJEC-001] La traza solo existe tras un análisis limpio
El sistema MUST generar una traza de ejecución únicamente cuando el análisis estático previo no reportó ningún error de compilación ni aviso de fuera de alcance detectable antes de ejecutar (ver `compilacion-en-espanol`, `subconjunto-java`).

#### Scenario: un aviso de fuera de alcance impide generar traza
- GIVEN un programa que usa un arreglo (fuera de alcance)
- WHEN se intenta ejecutar
- THEN el sistema no genera ningún paso de traza; solo se muestra el aviso correspondiente

### Requirement: [REQ-EJEC-002] Paso Normal
En el nivel **Normal**, el sistema MUST tratar cada sentencia completa como un único paso; una condición o una asignación se MUST mostrar ya evaluada, con su sustitución completa resuelta dentro de ese mismo paso (p. ej. `intentos < 10` resuelto a `true` en un solo paso, sin sub-pasos).

#### Scenario: condición resuelta en un solo paso Normal
- GIVEN `int intentos = 3; if (intentos < 10) { } }`
- WHEN se avanza un paso en modo Normal sobre el `if`
- THEN el paso único deja la condición resuelta a `true`, sin pasos intermedios por subexpresión

### Requirement: [REQ-EJEC-003] Paso Detallado
En el nivel **Detallado**, el sistema MUST descomponer una expresión en un paso por subexpresión, respetando la precedencia y la asociatividad de Java, y MUST marcar el operando derecho de `&&`/`||` como "no evaluado" cuando el cortocircuito lo omite. El control para cambiar entre Normal y Detallado MUST estar disponible en cualquier punto de la traza.

#### Scenario: cortocircuito de `&&` en Detallado
- GIVEN `boolean r = (edad >= 18) && (tieneCredencial);` con `edad = 15`
- WHEN se avanza en modo Detallado
- THEN el paso del operando izquierdo evalúa `false` y el operando derecho se marca "no evaluado"; el resultado final es `false` sin haber tocado `tieneCredencial`

### Requirement: [REQ-EJEC-004] Semántica de control de flujo por paso
El sistema MUST producir, como parte de la traza: la rama tomada en `if`/`else if`/`else` (evaluando cada condición en orden hasta la primera verdadera); el `case` igualado en `switch` (incluida la caída sin `break` hacia los `case` físicamente siguientes, y `default` en cualquier posición, que también cae hacia abajo); el número de vuelta de cada ciclo (`while`/`do-while`/`for`), por separado si están anidados; y el destino de `break`/`continue`, incluido `continue` en un `for` (que ejecuta la actualización antes de re-evaluar la condición).

#### Scenario: `default` a la mitad del `switch` cae hacia el siguiente `case`
- GIVEN un `switch(x)` con `x = 9` y ningún `case` que coincida, con `default` ubicado antes de `case 2` en el texto y sin `break` en `default`
- WHEN se ejecuta
- THEN la traza entra a `default`, y sin re-comparar, continúa cayendo al `case 2` siguiente hasta su `break`

### Requirement: [REQ-EJEC-005] Semántica aritmética y de tipos en cada paso
El sistema MUST reproducir, en cada paso que las involucre: desbordamiento silencioso de `int`/`long` en `+ - *` (complemento a 2, sin excepción); `MIN_VALUE / -1` sin excepción; división/`%` entre enteros truncando hacia cero, con el signo de `%` siguiendo al dividendo; `ArithmeticException: / by zero` para `/` y `%` enteros con divisor `0` (nunca para `double`, que da `Infinity`/`NaN`); promoción de `char` a `int` en aritmética (`'A' + 1` = `66`, no `'B'`); la regla de concatenación (el primer `String` que aparece en una cadena de `+`, leyendo izquierda a derecha, decide desde dónde todo pasa a ser texto); y `x++`/`++x` aplicando su efecto secundario en cuanto se evalúa, en el orden izquierda→derecha de la expresión completa.

#### Scenario: signo de `%` sigue al dividendo
- GIVEN `int r = -7 % 3;`
- WHEN se ejecuta
- THEN `r` queda en `-1`

#### Scenario: división entera entre cero
- GIVEN `int r = 5 / 0;`
- WHEN se ejecuta ese paso
- THEN el programa se detiene por un error con `ArithmeticException: / by zero` en esa línea

### Requirement: [REQ-EJEC-006] Excepciones en tiempo de ejecución
Cuando el programa lanza una excepción que no captura (el subconjunto no soporta `try/catch`, así que toda excepción detiene el programa), el sistema MUST detener la ejecución en la línea que la causó, MUST mostrar el nombre y el mensaje exacto que da el JDK 17 real para esa excepción, MUST acompañarlo de una explicación en español, y MUST dejar toda la traza previa a ese paso completamente navegable — MUST NOT inventar pasos posteriores.

#### Scenario: excepción detiene el programa sin perder la traza previa
- GIVEN un programa que imprime tres líneas y luego ejecuta `5 / 0`
- WHEN llega a esa división
- THEN se detiene mostrando `ArithmeticException: / by zero` con explicación y línea; los pasos de las tres impresiones anteriores siguen disponibles para revisar

### Requirement: [REQ-EJEC-007] Límite de pasos y ciclo desbocado
El sistema MUST contar los pasos ejecutados y, al alcanzar un límite de seguridad, MUST detener la ejecución con un mensaje de tipo "Se detuvo por seguridad" que incluye evidencia concreta del ciclo (p. ej. el nombre y el valor de una variable que no cambió durante el ciclo), y MUST hacerlo sin bloquear la interfaz del navegador.

#### Scenario: ciclo sin incremento se detiene con evidencia
- GIVEN un `while` cuya condición nunca cambia porque falta `intentos++`
- WHEN la ejecución alcanza el límite de pasos
- THEN se detiene y muestra un aviso citando que "`intentos` siempre valió 1" (o el valor observado), no un mensaje genérico

### Requirement: [REQ-EJEC-008] Semillas de números aleatorios
Cuando el programa fija una semilla explícita (`new Random(semilla)`), el sistema MUST producir una secuencia determinista (algoritmo exacto en `biblioteca-java`). Cuando el programa NO fija semilla (`new Random()`, `Math.random()`), el sistema MUST usar una semilla interna propia, reproducible y expuesta al usuario (ver `visualizador-paso-a-paso`), en vez de un valor realmente no determinista.

#### Scenario: semilla fija reproduce la misma secuencia
- GIVEN `Random r = new Random(12345L);` seguido de 5 llamadas a `r.nextInt(100) + 1`
- WHEN se ejecuta
- THEN la secuencia es `52, 81, 42, 29, 56`, siempre igual entre corridas

### Requirement: [REQ-EJEC-009] Pausa y reanudación en lecturas de `Scanner`
El sistema MUST suspender la ejecución en cada llamada a `Scanner` que requiera un dato nuevo y reanudarla al recibirlo. Si el programa tiene entradas precargadas, MUST consumirlas en orden antes de requerir entrada interactiva. Retroceder la traza a un paso anterior a una lectura ya satisfecha MUST NOT volver a solicitar esa entrada — se reproduce desde el historial.

#### Scenario: retroceder no vuelve a pedir una entrada ya dada
- GIVEN un programa que ya leyó `edad` con `nextInt()` y avanzó 3 pasos más
- WHEN el usuario retrocede hasta el paso de esa lectura y luego avanza de nuevo
- THEN el mismo valor de `edad` se reproduce sin pedir que se teclee otra vez

### Requirement: [REQ-EJEC-010] Entrada agotada o inválida en `Scanner`
El sistema MUST producir `NoSuchElementException` (sin mensaje) cuando se pide un dato y no queda entrada alguna, y `InputMismatchException` (sin mensaje) cuando el siguiente token no coincide con el tipo pedido, MUST NOT consumir el token inválido (una lectura posterior debe volver a verlo), y en ambos casos MUST tratarlo como una excepción en tiempo de ejecución (REQ-EJEC-006), no como un error de compilación.

#### Scenario: token inválido no se consume
- GIVEN `int edad = sc.nextInt();` con la entrada `"veinte"`
- WHEN se ejecuta esa línea
- THEN se detiene con `InputMismatchException`; si el programa intentara leer de nuevo, el mismo token `"veinte"` seguiría disponible
