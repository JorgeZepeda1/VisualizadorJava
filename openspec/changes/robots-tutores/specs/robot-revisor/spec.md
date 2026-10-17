# Robot revisor

## Purpose

Define lo que el robot revisor dice sobre un programa antes y durante su ejecución: la explicación de los errores y avisos que ya existen y el aviso de cinco trampas clásicas que compilan (R-D1). Cada aviso es un hecho verificable sobre el programa, nunca una suposición sobre la intención del alumno (D2).

## Requirements

### Requirement: [REQ-REV-001] El revisor explica los problemas que ya existen
Cuando el análisis termina con un error de compilación, un aviso de fuera de alcance o un error de arranque, el sistema MUST presentarlo en la voz del robot revisor con el texto que ya produce el catálogo es-MX, sin reescribirlo, anclado a su línea, y MUST agregar una explicación breve de por qué Java lo pide según la familia del problema. Cada código de problema MUST pertenecer a exactamente una familia.

#### Scenario: punto y coma faltante
- GIVEN `int x = 5` sin `;` en la línea 3
- WHEN se analiza
- THEN el revisor muestra el texto existente «Te falta un punto y coma ";" al final de esta línea.» con la línea 3, y debajo la explicación de su familia (Java necesita saber dónde termina cada instrucción)
- AND conserva el ícono y el título de «Error de compilación» de REQ-VIS-002

#### Scenario: aviso de fuera de alcance
- GIVEN un programa que declara un arreglo `int[]`
- WHEN se analiza
- THEN el revisor muestra el aviso «No disponible» existente y explica que el visualizador cubre U3–U7, sin afirmar que el programa está mal escrito

### Requirement: [REQ-REV-002] Catálogo cerrado de cinco trampas
Para un programa que compila y está dentro del subconjunto, el sistema MUST detectar antes de ejecutar, de forma determinista, exactamente estas familias y ninguna otra: (1) un `;` que es todo el cuerpo de un `if`, `while` o `for`; (2) `==` o `!=` entre dos `String`; (3) un grupo de `case` o `default` con sentencias, que puede terminar sin `break`, `return` ni `continue` y va seguido de otra etiqueta; (4) un `nextLine()` cuyo valor se usa y que se ejecuta inmediatamente después de una lectura de token (`nextInt`, `nextDouble`, `nextBoolean`, `next`) sin otra lectura de por medio; (5) una división entre `int` o `long` cuyo resultado se convierte en `double`. El sistema MUST NOT emitir comentarios de estilo.

#### Scenario: punto y coma tras la condición
- GIVEN `if (edad >= 18); { System.out.println("Adulto"); }` en la línea 5
- WHEN se analiza
- THEN se reporta la trampa 1 en la línea 5

#### Scenario: comparar textos con ==
- GIVEN `String respuesta = sc.next();` y `if (respuesta == "si")` en la línea 7
- WHEN se analiza
- THEN se reporta la trampa 2 en la línea 7

#### Scenario: case que sigue de largo
- GIVEN `case 1: System.out.println("Lunes");` seguido de `case 2:`
- WHEN se analiza
- THEN se reporta la trampa 3 en la línea del `case 1`

#### Scenario: renglón pendiente del Scanner
- GIVEN `int edad = sc.nextInt();` seguido de `String nombre = sc.nextLine();` en la línea 9
- WHEN se analiza
- THEN se reporta la trampa 4 en la línea 9

#### Scenario: división entera que se vuelve decimal
- GIVEN `int suma = 25;` y `double promedio = suma / 3;` en la línea 6
- WHEN se analiza
- THEN se reporta la trampa 5 en la línea 6

### Requirement: [REQ-REV-003] Cada trampa es un hecho, no una suposición
Cada aviso MUST afirmar lo que Java hace con ese código, con su línea; MUST NOT calificar al alumno («error», «incorrecto», «te equivocaste») ni adivinar su intención; MUST NOT impedir ni alterar la ejecución; y el sistema MUST NOT buscar trampas en un programa con error de compilación, aviso de fuera de alcance o error de arranque.

#### Scenario: aviso que no bloquea
- GIVEN un programa con la trampa 5 en la línea 6
- WHEN se pulsa «Visualizar»
- THEN la traza es idéntica a la que se obtiene sin revisor y el aviso dice que `suma / 3` divide dos enteros y Java descarta los decimales antes de convertir el resultado en `double`

#### Scenario: con error de compilación no hay trampas
- GIVEN un programa con `if (x > 5);` y un `;` faltante en otra línea
- WHEN se analiza
- THEN solo se muestra el error de compilación

### Requirement: [REQ-REV-004] Cero falsos positivos en las casi-trampas
El sistema MUST NOT reportar trampa en: un `if`, `while` o `for` con cuerpo `{ }` vacío; el `;` obligatorio de `do { … } while (c);`; un `nextLine()` usado como sentencia para descartar el renglón; etiquetas seguidas que comparten sentencias (`case 1: case 2:`); el último grupo de un `switch`; un grupo que termina en `break`, `return` o `continue`; `(double) a / b`; una división entera que se guarda en un entero o se concatena a un texto; `s.equals(t)`.

#### Scenario: el arreglo clásico del renglón pendiente
- GIVEN `int edad = sc.nextInt(); sc.nextLine(); String nombre = sc.nextLine();`
- WHEN se analiza
- THEN no se reporta ninguna trampa

#### Scenario: divisiones que no son la trampa
- GIVEN `int a, b, n` con `double r = (double) a / b;`, `int mitad = n / 2;` y `System.out.println("Cociente: " + a / b);`
- WHEN se analiza
- THEN no se reporta la trampa 5

#### Scenario: etiquetas que comparten sentencias
- GIVEN `case 'a': case 'e': vocales++; break;`
- WHEN se analiza
- THEN no se reporta la trampa 3

### Requirement: [REQ-REV-005] Corpus curricular etiquetado
Las trampas detectadas en cada programa de `corpus/curso/`, `corpus/experimentos/tipicos/` y `corpus/experimentos/ejercicios-del-po/` MUST coincidir exactamente, en código y línea, con la etiqueta revisada por el PO; una de más o de menos MUST hacer fallar la prueba. Las muestras positivas y las casi-trampas de cada familia MUST estar compiladas y ejecutadas por el oráculo.

#### Scenario: el corpus actual
- GIVEN los 60 archivos del corpus curricular
- WHEN se revisan
- THEN solo `u5-switch-sin-break-fallthrough` tiene trampas —tres de la familia 3, en sus `case 1`, `case 2` y `case 3`— y los otros 59, ninguna

### Requirement: [REQ-REV-006] Confirmación en la ejecución
Cuando la traza muestra una trampa detectada, el sistema MUST agregar en ese paso una nota del revisor que cite solo valores que el motor calculó: el texto que leyó el `nextLine()`, los dos textos y el resultado de `==`, el valor de la división entera, la caída al siguiente `case`, o que la condición dio `false` y aun así se ejecutó lo que seguía. Si la ejecución no hace visible la trampa, MUST NOT agregar la nota.

#### Scenario: nextLine lee el renglón pendiente
- GIVEN la trampa 4 con la entrada `"20\nJuan\n"`
- WHEN la traza llega al paso del `nextLine()`
- THEN la nota dice que `nextLine()` leyó `""`, lo que quedaba del renglón después del 20

#### Scenario: == con el mismo texto
- GIVEN la trampa 2 con la entrada `si`
- WHEN la traza llega a la condición
- THEN la nota dice que los dos lados dicen «si» y aun así `==` dio `false`

#### Scenario: la trampa no se ve con esta entrada
- GIVEN la trampa 1 en un `if` cuya condición resulta `true`
- WHEN la traza pasa por ese `if`
- THEN no aparece nota de confirmación

### Requirement: [REQ-REV-007] Aviso en pantalla
Al visualizar un programa con trampas, el sistema MUST mostrar en el paso 0 un aviso breve del revisor con el número de trampas y sus líneas, ampliable a su explicación; MUST marcar cada línea en el editor con un ícono y un título propios de «Trampa», distintos de los cuatro avisos de REQ-VIS-002 y no solo por color; MUST anunciarlo con `aria-live="polite"`. Sin trampas, MUST decir que revisó las cinco que conoce y no encontró ninguna, nunca que el programa está bien. Un parámetro del enlace MAY pedir que se omita el aviso del paso 0 y solo salga la confirmación (PR-4).

#### Scenario: aviso del paso 0
- GIVEN `u5-switch-sin-break-fallthrough` recién visualizado
- WHEN se muestra el paso 0
- THEN el revisor dice que encontró 3 trampas (líneas de `case 1`, `case 2` y `case 3`) y el editor marca esas líneas con el ícono de «Trampa»

#### Scenario: sin trampas
- GIVEN MaquinaSnacks recién visualizado
- WHEN se muestra el paso 0
- THEN el revisor dice que revisó las cinco trampas que conoce y no encontró ninguna
