# Biblioteca de Java soportada

## Purpose

Define la fidelidad exacta, verificada contra el JDK 17 real (Temurin 17.0.18), del comportamiento numérico, de texto, de entrada y de salida que el subconjunto soportado expone: conversiones, formato de números, `Math`, `Random`, `String`/`Character`/`Integer`/`Double`/`Long`, `Scanner` y `System.out`/`System.err`.

## Requirements

### Requirement: [REQ-BIB-001] Conversión numérica explícita (`cast`)
El sistema MUST saturar (no dar la vuelta) al convertir `double`/`float` a `int`/`long` fuera de rango (`(int) 1e10` = `Integer.MAX_VALUE`; `NaN` convierte a `0`; `±Infinity` satura al extremo correspondiente), y MUST dar la vuelta (wraparound de bits, no saturar) al convertir entre tipos enteros más angostos (`(int)(long)1e30` = `-1`: el `double→long` satura a `Long.MAX_VALUE`, y ESE valor, al pasar a `int`, se trunca a sus 32 bits bajos). El cast MUST aplicarse solo al operando al que se pega sintácticamente, no a toda la expresión.

#### Scenario: cast encadenado da un resultado que no es ni mínimo ni máximo
- GIVEN `int r = (int) (long) 1e30;`
- WHEN se ejecuta
- THEN `r` queda en `-1`

#### Scenario: precedencia del cast
- GIVEN `double a = (float) 1.0 / 3.0;` y `double b = (float) (1.0 / 3.0);`
- WHEN se ejecutan ambas
- THEN `a` conserva la precisión completa de `double` (el cast solo afectó al `1.0`) y `b` queda truncado a precisión de `float`

### Requirement: [REQ-BIB-002] `Double.toString`, `println` y concatenación
El sistema MUST reproducir el formato de salida de `Double.toString` de Java 17 (notación decimal simple si la magnitud está en `[10⁻³, 10⁷)`, si no notación científica `d.dddE±n`, siempre con al menos un dígito decimal); `NaN`, `Infinity`/`-Infinity` y `-0.0` MUST tratarse como casos especiales antes del formateo normal. Los dígitos MUST calcularse por clase de valor, en este orden de prioridad: **(1) subnormales** (`|x| < 2⁻¹⁰²²`): `Double.MIN_VALUE` MUST imprimirse exacto (`4.9E-324`); el resto, con la regla que los caracterice al 100 %, o — si ninguna regla los cubre al 100 % — el sistema MUST mostrar el aviso en ejecución "No disponible" en vez de un valor no verificado (nunca un resultado inventado, D2); **(2) banda de enteros** `[2^53, 2^63)`: dígitos exactos del entero menos 0–2 dígitos finales con redondeo HALF_UP según el exponente binario (53–57 → 0, 58–60 → 1, 61–62 → 2); **(3) potencias de dos** fuera de la banda: el candidato de mínimo número de dígitos del valor exacto, redondeado, que cae estrictamente dentro de `x ± 2^(e−54)`; **(4) empates exactos en el borde de redondeo**, en cualquier magnitud: Java NO usa el candidato más corto por redondeo a par — MUST imprimir el valor exacto redondeado HALF_UP al mínimo de dígitos que cae estrictamente dentro del intervalo; **(5) resto de valores normales**: los dígitos más cortos que redondean exactamente al mismo valor binario.

#### Scenario: umbral de notación científica
- GIVEN `System.out.println(10000000.0);`
- WHEN se ejecuta
- THEN imprime `1.0E7`, no `10000000.0`

#### Scenario: banda de enteros grandes (2^53–2^63)
- GIVEN `System.out.println(-21347700531594670.0);`
- WHEN se ejecuta
- THEN imprime `-2.1347700531594672E16` (17 dígitos significativos), no el string más corto ingenuo de 16 dígitos

#### Scenario: límite conocido y documentado
- GIVEN el valor de bits `0x453d04ffce09b504`
- WHEN se imprime con `Double.toString`
- THEN el sistema MUST mostrar `3.5082457001091195E25` (el valor verificado del JDK 17); este es el único caso, del conjunto original de 45,293 valores de salón, donde el sistema puede no coincidir en el último dígito — queda documentado como límite conocido, nunca oculto

#### Scenario: empate exacto en el borde no redondea a par
- GIVEN `System.out.println(1e23);`
- WHEN se ejecuta
- THEN imprime `9.999999999999999E22`, no `1.0E23` — el candidato más corto cae exactamente a medio ULP; Java excluye ese borde y usa el valor exacto en HALF_UP **[verificado: Temurin 17.0.18]**

#### Scenario: potencia de dos visible en un ciclo que divide entre 2
- GIVEN `double h = 1.0;` dividido entre 2 veinticuatro veces seguidas (`h /= 2;`), hasta 2⁻²⁴
- WHEN se imprime `h`
- THEN imprime `5.9604644775390625E-8`, distinto del más corto ingenuo que terminaría en `…063` **[verificado: Temurin 17.0.18]**

#### Scenario: subnormal exacto conocido
- GIVEN `System.out.println(Double.MIN_VALUE);`
- WHEN se ejecuta
- THEN imprime `4.9E-324`, no `5E-324` (el candidato más corto) **[verificado: Temurin 17.0.18]**

### Requirement: [REQ-BIB-003] `printf` y `String.format`
El sistema MUST construir `%f`/`%.Nf`/`%e` sobre los mismos dígitos más cortos que `Double.toString` (nunca sobre el valor binario exacto tipo `BigDecimal`, nunca con `toFixed`), redondeando HALF_UP en la posición pedida y rellenando con ceros cuando se piden más dígitos de los que hay. MUST soportar `%d %f %.Nf %s %c %b %n %%`, ancho y banderas `- 0 ,`. MUST agrupar millares con coma y usar punto decimal en `es_MX` (idéntico a `en_US`); en la opción "coma" (`es_ES`, ver REQ-BIB-010) MUST invertir ambos separadores.

#### Scenario: HALF_UP sobre el dígito corto, no sobre el valor binario exacto
- GIVEN `System.out.printf("%.2f", 2.675);`
- WHEN se ejecuta
- THEN imprime `2.68` (el valor binario exacto de 2.675 es ligeramente menor y redondearía a 2.67 si se usara `BigDecimal`/`toFixed`; Java redondea el string corto `"2.675"`)

#### Scenario: pedir más decimales de los que hay rellena con ceros
- GIVEN `System.out.printf("%.20f", 0.1);`
- WHEN se ejecuta
- THEN imprime `0.10000000000000000000` (ceros, nunca los dígitos del valor binario exacto)

### Requirement: [REQ-BIB-004] `Math`
El sistema MUST reproducir: `Math.round` con redondeo asimétrico en negativos (`floor(x+0.5)`: `round(-2.5)=-2`, `round(-0.5)=0`, y `round(0.49999999999999994)=0`, el valor correcto en JDK 17, no el bug histórico ya corregido); `Math.pow` con la semántica de `StrictMath`/fdlibm (MUST NOT delegar a la función `pow` nativa de JavaScript, que difiere en el 4.1% de los casos verificados, incluido `Math.pow(10,-4)`: Java da `1.0E-4`, JS da `9.999999999999999E-5`); `Math.sqrt(-1)` da `NaN` sin lanzar; `Math.abs(Integer.MIN_VALUE)` sigue negativo (desbordamiento); y el tipo de retorno por sobrecarga de `abs`/`max`/`min` (mezclar `int` y `double` da `double`). El sistema MUST resolver `Math.round` por sobrecarga según JLS 15.12: un argumento `double` usa `round(double)` y devuelve `long`; un argumento `int`, `long` o `char` NO tiene sobrecarga propia — se resuelve a `round(float)` (con conversión previa a `float` de redondeo correcto, nunca doble redondeo) y devuelve `int`, por lo que `int r = Math.round(unLong);` SÍ compila (a diferencia de asignar a `int` el `long` que devuelve `round(double)`).

#### Scenario: `Math.pow` no usa el `Math.pow` de JavaScript
- GIVEN `System.out.println(Math.pow(10, -4));`
- WHEN se ejecuta
- THEN imprime `1.0E-4`

#### Scenario: redondeo asimétrico en mitad negativa
- GIVEN `System.out.println(Math.round(-2.5));`
- WHEN se ejecuta
- THEN imprime `-2`, no `-3`

#### Scenario: `Math.round` de un `long` usa la sobrecarga `float`, no `double`
- GIVEN `long base = 123456789L; int r = Math.round(base);`
- WHEN se ejecuta
- THEN `r` queda en `123456792` (no `123456789`): no existe `Math.round(long)`, se resuelve a `round(float)`, que pierde precisión al pasar por `float`, y el resultado es `int` **[verificado: Temurin 17.0.18]**

### Requirement: [REQ-BIB-005] `Random` y `Math.random()`
El sistema MUST portar el generador congruencial lineal de 48 bits de `java.util.Random` (multiplicador `0x5DEECE66D`, incremento `0xB`, máscara de 48 bits), incluida la máscara de la semilla a sus 48 bits bajos (por lo que `new Random(0)` y `new Random(Long.MIN_VALUE)` MUST producir la misma secuencia) y el bucle de rechazo de `nextInt(bound)` cuando `bound` no es potencia de 2. `Math.random()` MUST usar el mismo algoritmo con una semilla no fijada por el programa.

#### Scenario: secuencia reproducible con semilla fija
- GIVEN `Random r = new Random(12345L);` y 5 llamadas a `r.nextInt(100) + 1`
- WHEN se ejecutan
- THEN la secuencia es `52, 81, 42, 29, 56`

### Requirement: [REQ-BIB-006] Identidad y métodos de `String`
El sistema MUST modelar la identidad de objeto de `String`: literales y concatenaciones de expresiones constantes (literales o `final` con inicializador constante) comparten instancia (`==` da `true`); cualquier `String` construido en tiempo de ejecución (`Scanner`, concatenación de variables no `final`, `new String(...)`) MUST ser una instancia nueva (`==` da `false` aunque `.equals()` dé `true`). MUST implementar `length charAt substring(1 o 2 arg.) indexOf equals equalsIgnoreCase compareTo toUpperCase toLowerCase trim isEmpty contains startsWith endsWith replace`, `String.valueOf` y `new String(texto)` con los resultados verificados del JDK 17, incluidas las excepciones exactas. El mensaje y los marcos de pila (`java.base`, ver `motor-de-ejecucion`) de `charAt` fuera de rango MUST variar según el *coder* interno de la cadena (cadenas compactas, JEP 254): si todos sus caracteres son ≤ U+00FF (Latin-1), el mensaje MUST ser `String index out of range: N` con marcos de `StringLatin1`; si contiene algún carácter > U+00FF (UTF-16 — incluye texto pegado con comillas tipográficas de Word), el mensaje MUST ser `index N, length L` con marcos de `StringUTF16`/`String.checkIndex`. `substring` fuera de rango MUST NOT depender del *coder* (mismo mensaje `begin`/`end`/`length` en ambos casos). `trim` MUST recortar únicamente caracteres ≤ U+0020 en los extremos (incluido `\u0000`) y MUST NOT recortar U+00A0 (espacio de no separación) — la regla opuesta a `trim`/`String.prototype.trim` de JavaScript.

#### Scenario: el error clásico de comparar con `==`
- GIVEN `String resp = sc.next(); boolean ok = (resp == "si");` con el usuario tecleando `si`
- WHEN se ejecuta
- THEN `ok` es `false` aunque el texto tecleado sea idéntico — el objeto de `sc.next()` nunca es el mismo que el literal

#### Scenario: `charAt` fuera de rango en una cadena Latin-1
- GIVEN `String s = "abc"; s.charAt(5);`
- WHEN se ejecuta
- THEN lanza `StringIndexOutOfBoundsException: String index out of range: 5` con el marco `StringLatin1.charAt(StringLatin1.java:48)` **[verificado: Temurin 17.0.18]**

#### Scenario: `charAt` fuera de rango en una cadena UTF-16
- GIVEN `String s = "€bc"; s.charAt(5);` (contiene `€`, fuera de Latin-1)
- WHEN se ejecuta
- THEN lanza `StringIndexOutOfBoundsException: index 5, length 3` con marcos de `StringUTF16`/`String.checkIndex` — mensaje y marcos distintos del caso Latin-1 para el mismo método y el mismo tipo de error **[verificado: Temurin 17.0.18]**

#### Scenario: `trim` no recorta el espacio de no separación
- GIVEN una cadena cuyo primer carácter es el espacio de no separación (Unicode U+00A0, código decimal 160) seguido de `hola`
- WHEN se le aplica `trim()`
- THEN ese primer carácter NO se elimina — a diferencia de `String.prototype.trim` de JavaScript, que sí lo quita **[verificado: Temurin 17.0.18]**

### Requirement: [REQ-BIB-007] `Character`
El sistema MUST implementar `Character.isDigit isLetter isLetterOrDigit isUpperCase isLowerCase isWhitespace toUpperCase toLowerCase` con el resultado exacto del JDK 17 para los 65,536 valores de `char` (tipo entero sin signo de 16 bits, único tipo numérico de Java sin signo).

#### Scenario: clasificación de un carácter
- GIVEN `Character.isDigit('7')` y `Character.isLetter('7')`
- WHEN se evalúan
- THEN el primero da `true` y el segundo da `false`, igual que en el JDK 17

### Requirement: [REQ-BIB-008] `Integer`, `Double`, `Long`
El sistema MUST implementar `Integer.parseInt` y `Double.parseDouble` con las excepciones exactas del JDK 17: `NumberFormatException: For input string: "abc"` (sin recortar espacios: `" 5 "` también falla), y el mensaje distinto `NumberFormatException: Cannot parse null string` cuando el argumento es `null`. `Integer.parseInt` MUST aceptar cualquier dígito decimal Unicode reconocido por `Character.digit` (no solo ASCII `0`–`9`), a diferencia de `parseInt`/`Number()` de JavaScript, que no los reconocen. MUST exponer `MAX_VALUE`/`MIN_VALUE` de `Integer`, `Double` y `Long`. `Long.parseLong` MUST NOT estar disponible (produce el aviso de `subconjunto-java`).

#### Scenario: espacios no se recortan
- GIVEN `Integer.parseInt(" 5 ")`
- WHEN se ejecuta
- THEN lanza `NumberFormatException: For input string: " 5 "`

#### Scenario: `parseInt` acepta dígitos Unicode no ASCII
- GIVEN `Integer.parseInt("٣٤")` (dígitos arábigo-índicos para 3 y 4)
- WHEN se ejecuta
- THEN devuelve `34`, igual que el JDK 17 **[verificado: Temurin 17.0.18]** — a diferencia de JavaScript, que no reconoce esos dígitos como numéricos

### Requirement: [REQ-BIB-009] `Scanner` — tokenización y excepciones
El sistema MUST tokenizar por cualquier espacio en blanco (espacios, tabs, saltos de línea); `nextInt()`/`nextDouble()` MUST dejar pendiente el salto de línea, de modo que un `nextLine()` inmediato después devuelve una cadena vacía (el error clásico del currículo); `InputMismatchException` MUST NOT consumir el token que falló; `NoSuchElementException` MUST dispararse al agotar la entrada; `sc.close()` seguido de cualquier lectura MUST lanzar `IllegalStateException: Scanner closed`; `nextBoolean()` MUST aceptar únicamente `"true"`/`"false"` sin distinguir mayúsculas.

#### Scenario: `nextInt()` seguido de `nextLine()` sin limpiar
- GIVEN `int edad = sc.nextInt(); String nombre = sc.nextLine();` con la entrada `"20\nJuan Perez\n"`
- WHEN se ejecuta
- THEN `nombre` queda en `""` (cadena vacía), no en `"Juan Perez"`

### Requirement: [REQ-BIB-010] Separador decimal de `Scanner` — `es_MX` por omisión, `es_ES` opcional
Por omisión, el sistema MUST aceptar el **punto** como separador decimal en `nextDouble()` (fiel a `es_MX`, idéntico a `en_US`) y MUST rechazar la coma con `InputMismatchException`. Cuando el usuario activa la opción "coma", el sistema MUST emular una JVM `es_ES` completa: `nextDouble()` acepta coma y rechaza punto, Y ADEMÁS `printf`/`String.format` cambian a imprimir con coma decimal (REQ-BIB-003) — nunca una mezcla de "coma en la entrada, punto en la salida".

#### Scenario: `3,5` se rechaza por omisión
- GIVEN `double x = sc.nextDouble();` con la entrada `"3,5"`, sin activar la opción "coma"
- WHEN se ejecuta
- THEN lanza `InputMismatchException`, igual que en NetBeans real

#### Scenario: opción "coma" cambia también la salida
- GIVEN la opción "coma" activada, `double x = sc.nextDouble();` con entrada `"3,5"`, seguido de `System.out.printf("%.2f", x);`
- WHEN se ejecuta
- THEN `x` se lee como `3.5` y el `printf` imprime `3,50`

### Requirement: [REQ-BIB-011] `System.out` y `System.err`
El sistema MUST NO agregar un salto de línea al final de la salida cuando el programa termina con `print` (no `println`). MUST elegir la sobrecarga de `print`/`println` según el tipo estático de la expresión (`print('A')` imprime `A`; `print(65)` imprime `65`; `'A' + 1` se promueve a `int` antes de imprimir, dando `66`). MUST intercalar `System.out` y `System.err` en una sola secuencia en el orden real en que el programa los generó.

#### Scenario: `print` no agrega salto de línea final
- GIVEN un programa cuya última sentencia es `System.out.print("fin");`
- WHEN termina
- THEN el último carácter de la salida es `n` de "fin", no un salto de línea

## Conciliación con design.md §12 (2026-09-25)

- **REQ-BIB-002** reescrito: `Double.toString` ya no describe solo la ruta de enteros grandes. Ahora define las cinco clases en orden de prioridad (subnormales con aviso en ejecución de respaldo, banda de enteros, potencias de dos, empates en el borde, resto de normales) y agrega tres escenarios verificados (`1e23`, 2⁻²⁴, `Double.MIN_VALUE`).
- **REQ-BIB-004** editado: se agregó la resolución de sobrecarga de `Math.round` para argumentos `int`/`long`/`char` (usa `round(float)`, no existe `round(long)`/`round(int)`), con un escenario verificado.
- **REQ-BIB-006** editado: se agregó que el mensaje y los marcos de `charAt` fuera de rango dependen del *coder* interno (Latin-1 / UTF-16) y que `trim` no recorta U+00A0, con tres escenarios verificados.
- **REQ-BIB-008** editado: se agregó que `parseInt` acepta dígitos Unicode no ASCII, con un escenario verificado.
- Ningún requisito se eliminó ni cambió de ID.
