# Robot revisor

## Purpose

Define lo que el robot revisor dice sobre un programa antes y durante su ejecución: la explicación de los errores y avisos que ya existen y el aviso de cinco trampas de Java que compilan (R-D1). Cada aviso es un hecho verificable sobre el programa, nunca una suposición sobre la intención del alumno (D2). Incorpora los ajustes E2, E3, E4, E7 y E8 del experto en Java y las pistas graduadas del maestro (panel 1).

## Requirements

### Requirement: [REQ-REV-001] El revisor explica los problemas que ya existen
Cuando el análisis termina con un error de compilación, un aviso de fuera de alcance o un error de arranque, el robot revisor MUST presentarlo con el texto que ya produce el catálogo es-MX, sin reescribirlo, anclado a su línea, y MUST agregar una explicación breve de por qué Java lo pide según la familia del problema; cada código de problema MUST pertenecer a exactamente una familia. Cuando el motor informa que la sentencia anterior al problema es un `if`, `for` o `while` cuyo cuerpo es solo `;`, la explicación MUST decir ese hecho en lugar de la causa genérica de la familia.

#### Scenario: punto y coma faltante
- GIVEN `int x = 5` sin `;` en la línea 3
- WHEN se analiza
- THEN el revisor muestra el texto existente «Te falta un punto y coma ";" al final de esta línea.» con la línea 3, y debajo la explicación de su familia
- AND conserva el ícono y el título de «Error de compilación» de REQ-VIS-002

#### Scenario: aviso de fuera de alcance
- GIVEN un programa que declara un arreglo `int[]`
- WHEN se analiza
- THEN el revisor muestra el aviso «No disponible» existente y explica que el visualizador cubre U3–U7, sin afirmar que el programa está mal escrito

#### Scenario: el `;` de un for deja la variable fuera
- GIVEN `for (int i = 1; i <= 3; i++);` seguido de `System.out.println("Hola " + i);`
- WHEN se analiza
- THEN el revisor muestra el error existente de `i` no declarada y explica «Ese `;` es todo el cuerpo del `for`; `i` solo existe dentro del `for`», no «¿la declaraste antes?»

#### Scenario: el `;` de un if deja suelto el else
- GIVEN `if (n % 2 == 0);` seguido de una impresión y de `else`
- WHEN se analiza
- THEN el revisor muestra el error existente de `else` sin `if` y explica que ese `;` es todo el cuerpo del `if`, así que el `else` ya no tiene `if`

### Requirement: [REQ-REV-002] Catálogo cerrado de cinco trampas de Java
Para un programa que compila y está dentro del subconjunto, el sistema MUST detectar antes de ejecutar, de forma determinista, exactamente estas familias y ninguna otra: (1) un `;` que es todo el cuerpo de un `if`, `while` o `for`; (2) `==` o `!=` entre dos `String`; (3) un grupo de `case` o `default` con sentencias, seguido de otra etiqueta, que puede completar normalmente según las reglas de alcanzabilidad de Java (JLS 14.22), aunque termine en un bloque o en un `if`; (4) un `nextLine()` cuyo valor se usa y que lee el resto del renglón de una lectura de token (`nextInt`, `nextDouble`, `nextBoolean`, `next`) sin otra lectura de por medio, en una misma lista de sentencias o de una vuelta de un ciclo a la siguiente; (5) una división entre `int` o `long` cuyo resultado se convierte en `double`. «Se usa» significa que forma parte de una expresión o un argumento, o que se guarda en una variable que el programa lee después. El sistema MUST NOT emitir comentarios de estilo.

#### Scenario: punto y coma tras la condición
- GIVEN `if (edad >= 18); { System.out.println("Adulto"); }` en la línea 5
- WHEN se analiza
- THEN se reporta la trampa 1 en la línea 5

#### Scenario: comparar textos con != en un menú
- GIVEN `String op = sc.next();` dentro de un `while (op != "salir")` en la línea 7
- WHEN se analiza
- THEN se reporta la trampa 2 en la línea 7

#### Scenario: case que sigue de largo
- GIVEN `case 1: System.out.println("Lunes");` seguido de `case 2:`
- WHEN se analiza
- THEN se reporta la trampa 3 en la línea del `case 1`

#### Scenario: grupo que termina en un if y cae
- GIVEN `case 1: if (x > 0) { break; }` seguido de `case 2:`
- WHEN se analiza
- THEN se reporta la trampa 3 en la línea del `case 1`, porque el grupo puede llegar a su final

#### Scenario: renglón pendiente en la misma lista
- GIVEN `int edad = sc.nextInt();` seguido de `String nombre = sc.nextLine();` en la línea 9, y `nombre` se imprime después
- WHEN se analiza
- THEN se reporta la trampa 4 en la línea 9

#### Scenario: renglón pendiente de una vuelta a otra
- GIVEN un `for` cuyo cuerpo empieza con `String nombre = sc.nextLine();` y termina con `int edad = sc.nextInt();`, y ambas se usan
- WHEN se analiza
- THEN se reporta la trampa 4 en la línea del `nextLine()`

#### Scenario: división entera que se vuelve decimal
- GIVEN `int suma = 25;` y `double promedio = suma / 3;` en la línea 6
- WHEN se analiza
- THEN se reporta la trampa 5 en la línea 6

### Requirement: [REQ-REV-003] Cada trampa es un hecho, no una suposición
(Enmendado tras el panel 1, E2: antes no decía nada de las formas de la trampa 1 que no compilan.)
Cada aviso MUST afirmar lo que Java hace con ese código, con su línea; MUST NOT calificar al alumno («error tuyo», «incorrecto», «te equivocaste») ni adivinar su intención; MUST NOT impedir ni alterar la ejecución. El sistema MUST NOT buscar trampas en un programa con error de compilación, aviso de fuera de alcance o error de arranque; en ese caso, el hecho del `;` llega por la explicación del error (REQ-REV-001). Los textos MUST NOT afirmar lo que solo a veces es cierto: el aviso de `==` entre `String` MUST decir que compara si son el mismo texto guardado y que puede dar `false` aunque digan lo mismo, nunca que dará `false`; el del renglón pendiente MUST hablar de «lo que quedaba del renglón», nunca de que la lectura de token «se come» el salto de línea.

#### Scenario: aviso que no bloquea
- GIVEN un programa con la trampa 5 en la línea 6
- WHEN se pulsa «Visualizar»
- THEN la traza es idéntica a la que se obtiene sin revisor y el aviso dice que `suma / 3` divide dos enteros y Java descarta los decimales antes de convertir el resultado en `double`

#### Scenario: con error de compilación no hay trampas
- GIVEN un programa con `if (x > 5);` y un `;` faltante en otra línea
- WHEN se analiza
- THEN solo se muestra el error de compilación con su explicación

### Requirement: [REQ-REV-004] Cero falsos positivos en las casi-trampas
El sistema MUST NOT reportar trampa en: un `if`, `while` o `for` con cuerpo `{ }` vacío; el `;` obligatorio de `do { … } while (c);`; un `nextLine()` usado como sentencia para descartar el renglón; un `nextLine()` guardado en una variable que nunca se lee; un `nextLine()` antes de cualquier lectura de token; lecturas en ramas distintas; etiquetas seguidas que comparten sentencias (`case 1: case 2:`); el último grupo de un `switch`; un grupo que no puede completar normalmente (termina en `break`, `return` o `continue`, o en un `if`/`else` cuyas dos ramas lo hacen); `(double) a / b`; una división entera que se guarda en un entero o se concatena a un texto; `s.equals(t)`.

#### Scenario: el arreglo clásico del renglón pendiente
- GIVEN `int edad = sc.nextInt(); sc.nextLine(); String nombre = sc.nextLine();`
- WHEN se analiza
- THEN no se reporta ninguna trampa

#### Scenario: la lectura extra se guarda y no se usa
- GIVEN `int edad = sc.nextInt(); String basura = sc.nextLine(); String nombre = sc.nextLine();` y `basura` nunca se lee
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
Las trampas detectadas en cada programa de `corpus/curso/`, `corpus/experimentos/tipicos/`, `corpus/experimentos/ejercicios-del-po/` y `corpus/experimentos/trampas/` MUST coincidir exactamente, en código y línea, con la etiqueta revisada por el PO; una de más o de menos MUST hacer fallar la prueba, y un programa sin etiqueta también. Las muestras positivas y las casi-trampas de cada familia, incluidas las formas de E2, E3, E4, E7 y E8, MUST estar compiladas y ejecutadas por el oráculo.

#### Scenario: el corpus actual
- GIVEN los 60 programas del corpus curricular
- WHEN se revisan
- THEN solo `u5-switch-sin-break-fallthrough` tiene trampas —tres de la familia 3, en sus `case 1`, `case 2` y `case 3`— y los otros 59, ninguna

### Requirement: [REQ-REV-006] Confirmación en la ejecución, solo con pérdida real
Cuando la traza muestra una trampa detectada, en ese paso MUST hablar el robot revisor (REQ-PANT-009): dice la narración del paso y la evidencia, citando solo valores que el motor calculó —el texto que leyó el `nextLine()`, los dos textos y el resultado de `==` o `!=`, el valor de la división entera antes y después de convertirse, la caída al siguiente `case`, o que la condición dio `false` y aun así se ejecutó lo que seguía—. MUST NOT hablar si la ejecución no hace visible la trampa, si la división es exacta o si lo que leyó el `nextLine()` tiene algo más que espacios. Si en ese paso el reto ya dio su retroalimentación, la evidencia MUST ofrecerse como enlace «Ver la trampa de Java» en lugar de tomar el turno.

#### Scenario: nextLine lee el renglón pendiente
- GIVEN la trampa 4 con la entrada `"20\nJuan\n"`
- WHEN la traza llega al paso del `nextLine()`
- THEN habla el revisor: `nextLine()` leyó `""`, lo que quedaba del renglón después del 20

#### Scenario: != con el mismo texto
- GIVEN la trampa 2 en `while (op != "salir")` con la entrada `salir`
- WHEN la traza llega a la condición
- THEN habla el revisor: los dos lados dicen «salir» y aun así `!=` dio `true`, porque son dos textos distintos guardados

#### Scenario: una división exacta no se comenta
- GIVEN la trampa 5 en `double p = total / 4;` con `total` = 100
- WHEN la traza pasa por esa línea
- THEN no habla el revisor, porque `100 / 4` no pierde nada

#### Scenario: el resto del renglón trae texto
- GIVEN la trampa 4 con la entrada `"20 Juan\n"`
- WHEN la traza llega al `nextLine()`
- THEN no habla el revisor, porque leyó `" Juan"`

### Requirement: [REQ-REV-007] Pistas graduadas en pantalla
Al visualizar un programa con trampas, el sistema MUST dar tres niveles de pista: (1) en el paso 0, la franja del revisor encima del editor dice cuántas trampas de Java encontró y en qué líneas, y el editor marca cada una con una lupa con «!» y el título «Trampa de Java», distinta de los avisos de REQ-VIS-002 y no solo por color; (2) «Ver explicación» da el turno al revisor para explicar cada trampa; (3) la confirmación de REQ-REV-006. Sin trampas, la franja MUST mostrar un sello de una línea que dice que revisó las 5 trampas de Java que conoce sin encontrar ninguna y que eso no garantiza que el programa haga lo que el alumno quiere. Con el modo reto encendido, las trampas cuyo aviso adelantaría la respuesta de un reto (la 1, la 2 dentro de una condición o un selector, y la 3) MUST NOT localizarse en el paso 0: la franja dice que hay más y que las mostrará cuando el programa llegue ahí. Con el ajuste «después» (del enlace o de un programa de demostración de la galería), el paso 0 MUST decir solo que revisó el programa, con el mismo texto haya o no trampas. Los avisos MUST anunciarse con `aria-live="polite"`.

#### Scenario: aviso del paso 0
- GIVEN `u5-switch-sin-break-fallthrough` recién visualizado, con el reto apagado
- WHEN se muestra el paso 0
- THEN la franja dice que encontró 3 trampas de Java en las líneas 6, 8 y 10, y el editor marca esas líneas con la lupa

#### Scenario: sin trampas
- GIVEN MaquinaSnacks recién visualizado
- WHEN se muestra el paso 0
- THEN la franja muestra el sello de una línea y ningún párrafo en el globo

#### Scenario: con el reto encendido
- GIVEN un programa con la trampa 2 en la condición de un `if` y la trampa 5 en otra línea, con el reto encendido
- WHEN se muestra el paso 0
- THEN la franja localiza solo la trampa 5 y dice que hay una más que mostrará cuando el programa llegue ahí

#### Scenario: demostración en «después»
- GIVEN `u5-switch-sin-break-fallthrough` abierto desde la galería como programa de demostración
- WHEN se muestra el paso 0
- THEN la franja dice solo que revisó el programa, y el revisor habla en cada paso donde el `switch` sigue de largo
