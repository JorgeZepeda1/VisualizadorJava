# 03 — Semántica de texto, entrada, control de flujo y errores (Java 17)

**Cambio SDD:** `visualizador-java` · **Fase:** explore · **Explorador:** texto/entrada/control-de-flujo/errores
**Metodología:** todo lo marcado como VERIFICADO se comprobó ejecutando `javac`/`java` reales del JDK usado por el proyecto:

```
/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home/bin/{javac,java}
openjdk version "17.0.18" 2026-01-20 (Temurin-17.0.18+8)
```

Todos los programas fuente, sus salidas reales (`.salida.txt`), entradas (`.entrada.txt`) y mensajes de compilación (`.compilacion.txt`) están en:
`/Users/desarrollo/VisualizadorJava/openspec/changes/visualizador-java/exploracion/experimentos/texto/`

**117 micro-programas** compilados/ejecutados; **42 de ellos rompen la compilación a propósito** (se pedían ≥30). Ningún `.class` quedó en el repo (se compiló siempre a `/tmp`). Lo que NO se pudo verificar contra el JDK real (p. ej. la apariencia de la consola de NetBeans) se marca explícitamente como **INFERIDO, no verificado**.

---

## 1. `String`: identidad, interning, folding y métodos

### 1.1 `==` vs `.equals()` — tabla verificada

| Caso | Código | `==` | `.equals()` | Archivo |
|---|---|---|---|---|
| Dos literales iguales | `"hola" == "hola"` | **true** | true | `str01` |
| Concatenación de literales (constant folding) | `"ho" + "la" == "hola"` | **true** | true | `str02` |
| Concatenación de `final` con inicializador constante | `final String a="ho"; final b="la"; (a+b)=="hola"` | **true** | true | `str03` |
| Concatenación de variables **no** `final` | `String a="ho"; b="la"; (a+b)=="hola"` | **false** | true | `str04` |
| `new String("hola") == "hola"` | — | **false** | true | `str05` |
| `new String("hola").intern() == "hola"` | — | **true** | — | `str05` |
| **Cadena creada en ejecución** (`Scanner.next()`) comparada con literal | `sc.next() == "si"` | **false** | true | `str06` |

**Regla exacta para el intérprete:** el compilador de `javac` pliega en tiempo de compilación (constant folding, JLS §15.28/§15.29) cualquier expresión de concatenación cuyos operandos sean **expresiones constantes** — literales, o variables `final` inicializadas con una expresión constante. El resultado se interna automáticamente junto con el resto de literales del *constant pool*, por eso `==` da `true`. En cuanto uno de los operandos deja de ser una expresión constante en tiempo de compilación (variable no `final`, o cualquier valor que venga de `Scanner`, `args`, un cálculo, etc.), la concatenación se hace en tiempo de EJECUCIÓN con un `StringBuilder` interno y produce un objeto `String` nuevo → `==` da `false` aunque el contenido sea idéntico. **Esto es exactamente el error clásico que el simulador debe reproducir**: un alumno que compara `sc.next() == "si"` en vez de `.equals("si")` debe ver `false` aunque el usuario haya tecleado "si".

Para el intérprete del simulador esto implica que **el motor debe distinguir "cadena literal/constante" de "cadena construida en ejecución"** y modelar la identidad de objeto (referencia) por separado del contenido — no basta con comparar strings de TypeScript con `===`, porque TypeScript no tiene esta distinción y el simulador la tiene que fabricar a propósito para que `==` dé el resultado didácticamente correcto (falso para casi todo excepto literales/constantes).

### 1.2 Métodos de `String` — verificados (`str07`)

Sobre `s = "  Hola Mundo  "`:

| Método | Resultado verificado |
|---|---|
| `s.length()` | `14` |
| `s.charAt(2)` | `'H'` |
| `s.substring(2)` | `"Hola Mundo  "` |
| `s.substring(2,6)` | `"Hola"` |
| `s.indexOf("Mundo")` | `7` |
| `s.indexOf("zzz")` | `-1` |
| `s.equals("hola")` | `false` (sensible a mayúsculas y a los espacios) |
| `s.trim().equalsIgnoreCase("HOLA MUNDO")` | `true` |
| `"abc".compareTo("abd")` | `-1` |
| `"abc".compareTo("abc")` | `0` |
| `s.toUpperCase()` / `toLowerCase()` | conserva los espacios, solo cambia las letras |
| `s.trim()` | `"Hola Mundo"` |
| `"".isEmpty()` | `true`; `s.isEmpty()` | `false` |
| `s.contains("Mundo")` | `true` |
| `s.trim().startsWith("Hola")` | `true` |
| `s.replace("Mundo","Java")` | `"  Hola Java  "` |
| `String.valueOf(42)` / `(3.5)` / `(true)` / `('z')` | `"42"`, `"3.5"`, `"true"`, `"z"` |

### 1.3 Excepciones de `String` — mensaje EXACTO de JDK 17

| Operación | Excepción y mensaje EXACTO | Archivo |
|---|---|---|
| `"abc".charAt(5)` | `java.lang.StringIndexOutOfBoundsException: String index out of range: 5` | `str08` |
| `"abc".substring(1,10)` | `java.lang.StringIndexOutOfBoundsException: begin 1, end 10, length 3` | `str09` |
| `"abc".substring(-1)` | `java.lang.StringIndexOutOfBoundsException: begin -1, end 3, length 3` | `str09b` |
| `Integer.parseInt("abc")` | `java.lang.NumberFormatException: For input string: "abc"` | `str10` |
| `Integer.parseInt("")` | `java.lang.NumberFormatException: For input string: ""` | `str10b` |
| `Integer.parseInt("3.5")` | `java.lang.NumberFormatException: For input string: "3.5"` | `str10c` |
| `Integer.parseInt(" 5 ")` (con espacios) | `java.lang.NumberFormatException: For input string: " 5 "` — **`parseInt` NO recorta espacios** | `str13` |
| `Integer.parseInt("+5")` / `("-5")` | Funciona: `5` / `-5` (sí admite signo explícito) | `str14` |
| `Integer.parseInt(null)` | `java.lang.NumberFormatException: Cannot parse null string` (mensaje **distinto** al de arriba, y el *stack* no pasa por `forInputString`) | `str15` |
| `Double.parseDouble("abc")` | `java.lang.NumberFormatException: For input string: "abc"` (stack via `FloatingDecimal`, no `Integer`) | `str11` |

### 1.4 `NullPointerException` útil (JEP 358) — con y sin `-g`

**Hallazgo crítico verificado** (`str12`, `str12b`, `str12c`): el mensaje "útil" de NPE (JEP 358, activo por defecto desde Java 14) solo incluye el **nombre real** de la variable/campo si la clase se compiló con información de depuración de variables locales (`-g` o `-g:vars`). NetBeans compila sus proyectos con `-g` completo por defecto, así que en la práctica el alumno SIEMPRE ve el nombre real. Comparación exacta:

| Compilado con | Mensaje |
|---|---|
| **sin flags** (default de `javac`, equivalente a `-g:source,lines`) | `Cannot read field "nombre" because "<local1>" is null` |
| **`-g`** (todo, como NetBeans) | `Cannot read field "nombre" because "p" is null` |
| **`-g:none`** | `Cannot read field "nombre" because "<local1>" is null` **y además** `at str12_npe_util.main(Unknown Source)` (sin línea) |

**Conclusión de diseño:** el intérprete del simulador debe comportarse como si SIEMPRE se compilara con `-g` (mostrar el nombre real de la variable en el NPE), porque eso es lo que un alumno usando NetBeans ve en la práctica. Simular el modo `-g:source,lines` (con `<local1>`) sería más "fiel a `javac` por defecto" pero **menos fiel a la experiencia real del alumno en NetBeans**, que es el objetivo declarado del producto.

Otros patrones de NPE verificados:

| Código | Mensaje EXACTO |
|---|---|
| `int[] arr=null; arr[0];` | `Cannot load from int array because "arr" is null` |
| `obtener().trim()` con `obtener()` retornando `null` | `Cannot invoke "String.trim()" because the return value of "Clase.obtener()" is null` |
| `switch(s)` con `s=null` (`String`) | `Cannot invoke "String.hashCode()" because "<local2>" is null` — **incluso compilando con `-g`** |

Este último es un descubrimiento no obvio: `switch` sobre `String` se traduce internamente (*desugaring*) a `s.hashCode()` guardado en una variable temporal **sintética** que el compilador nunca nombra en la tabla de variables locales, así que el NPE muestra `<local2>` sin importar los flags de compilación. Es una inconsistencia real de `javac`/la JVM que **recomiendo NO replicar** en el simulador (mostrar siempre el nombre real `s` es mejor pedagógicamente); si se quiere fidelidad absoluta habría que documentarlo como excepción conocida.

---

## 2. `Scanner`

Todos verificados en `scan01`–`scan11`, `scan05b`, `scan05c`.

| Comportamiento | Verificado |
|---|---|
| Tokeniza por espacios/tabs/saltos de línea (cualquier whitespace) | `scan01`: `"  hola    mundo\tcruel  \n"` → tokens `hola`, `mundo`, `cruel` |
| `nextInt()` seguido de `nextLine()` sin limpiar | `nombre` queda `""` (longitud 0) — el clásico bug del buffer. `nextInt()` consume solo el número, deja el `\n` pendiente, y ese `nextLine()` lo consume vacío | `scan02` |
| Forma correcta: `nextInt()` + `nextLine()` extra para limpiar + `nextLine()` real | Funciona: `nombre="Juan Perez"` | `scan02b` |
| `InputMismatchException` | **Sin mensaje** (solo el nombre de la clase, sin texto descriptivo) | `scan03` |
| `InputMismatchException` **NO consume** el token que falló | Tras capturar la excepción, `sc.next()` devuelve el MISMO token inválido (`"veinte"`) | `scan03b` |
| `NoSuchElementException` al agotar la entrada | También **sin mensaje** | `scan04` |
| `nextBoolean()` | Acepta `"true"`/`"True"` sin distinguir mayúsculas; cualquier otra cosa (`"si"`) → `InputMismatchException` | `scan06` |
| `hasNextInt()` | No consume el token no numérico; permite hacer `while(sc.hasNextInt())` de forma segura | `scan07` |
| `next()` vs `nextLine()` | `next()` deja el cursor justo tras el token; `nextLine()` inmediatamente después devuelve **el resto de esa misma línea** (con el espacio inicial incluido) | `scan08` |
| **Dos `Scanner` sobre `System.in`** | **PELIGROSO.** El primer `Scanner` puede "robarse" del *stream* subyacente más bytes de los que entrega por `next()` (su búfer interno de lectura). El segundo `Scanner`, al envolver el mismo `System.in` ya drenado, lanza `NoSuchElementException` en su primer `next()` aunque en el `.txt` de entrada sobraran tokens sin leer | `scan09` |
| `sc.close()` y reutilizar | `IllegalStateException: Scanner closed` | `scan10` |
| `nextInt()` con la entrada totalmente vacía | `NoSuchElementException` (no `InputMismatchException`: no hay diferencia entre "no hay token" y "no hay ENTRADA" en absoluto) | `scan11` |

### 2.1 `nextDouble()` y el locale — hallazgo importante para México

**Se investigó exactamente la pregunta abierta del encargo ("es_MX vs es_ES: ¿3.5 o 3,5?") y el resultado es contraintuitivo:**

| Locale de la JVM | separador decimal (`DecimalFormatSymbols`) | `nextDouble()` acepta `"3.5"` | `nextDouble()` acepta `"3,5"` |
|---|---|---|---|
| **`es_MX`** (español de México) | **`.` (punto)** | ✅ sí | ❌ `InputMismatchException` |
| `es_ES` (español de España) | `,` (coma) | ❌ `InputMismatchException` | ✅ sí |
| `en_US` | `.` (punto) | ✅ sí | ❌ |
| **Locale por omisión de esta máquina (sin flags)** | — | — | — |

Y crucialmente: **el locale por omisión de la JVM en esta máquina, sin pasar ningún flag, ya es `es_MX`** (`user.language=es`, `user.country=MX`, confirmado con `System.getProperty` y `Locale.getDefault()`), y bajo ese locale real **`Scanner.nextDouble()` exige el PUNTO como separador decimal, igual que en inglés de EE.UU., y RECHAZA la coma**. Esto es consistente con los datos CLDR reales: México usa punto decimal y coma de millares (como EE. UU.), a diferencia de España.

**Implicación de producto:** si el simulador va a decidir qué formato aceptar en `nextDouble()`/`nextFloat()`, lo correcto para un plantel mexicano (`es_MX`, que es el locale que traerán las máquinas configuradas en español de México) es aceptar **punto** como decimal, no coma. Suponer "coma porque es español" sería un error de fidelidad verificado contra el JDK real. Esto hay que confirmarlo con el PO porque contradice una intuición común, pero los datos están verificados (`scan05`, `scan05b`, `scan05c`).

### 2.2 Consola de NetBeans con `Scanner` — **INFERIDO, no verificado con el JDK**

Esto no se puede comprobar solo con `javac`/`java` en terminal porque depende de la ventana "Output" de la IDE NetBeans, que no está instalada/accesible en este entorno de exploración. Por conocimiento documentado de NetBeans (Ant-based, `<exec>`/`<java>` con `input`/`output` conectados a la consola integrada):

- La consola de salida de NetBeans es una única caja de texto que mezcla `System.out` y `System.in` en el mismo widget: el `print`/`println` que pide el dato (p. ej. `"Edad: "`) aparece, y el cursor queda parpadeando **en la misma línea**, a la derecha del mensaje; lo que el usuario teclea aparece ahí mismo, y al dar Enter ese texto se convierte en una línea más del panel (no se "limpia").
- Esto es EXACTAMENTE lo que ya reproducen los experimentos de esta carpeta al no usar `-Duser.` para forzar buffering: en todas las corridas, `System.out.print("Edad: ")` y la respuesta simulada quedan concatenados en la misma línea de la salida capturada (ver p. ej. `scan02.salida.txt`: `"Edad: Nombre: edad=20"`), que es el patrón que el simulador debe imitar en su panel de consola.
- **Recomendación:** el panel de "consola" del simulador debe comportarse como una única superficie de texto donde el `print` del mensaje y el eco de lo que el alumno teclea quedan en la misma línea — no separar visualmente "salida del programa" de "entrada del usuario" en columnas distintas, porque eso no es lo que un alumno reconoce de NetBeans.
- **Riesgo:** esto debería confirmarse con una captura de pantalla real de NetBeans si existe duda; lo marco como riesgo de fidelidad de baja severidad porque no afecta la lógica del intérprete, solo el diseño visual de la consola.

---

## 3. Control de flujo

Verificado en `flow01`–`flow19`.

- **`switch(int)` sin `break`:** cae en cascada por todos los `case` siguientes hasta el primer `break` o el final del bloque. Con `dia=3` y sin `break` en los casos 1–3: imprime `miercoles`, `jueves` (el `case 4` sí tiene `break`) y se detiene ahí. (`flow01`)
- **`switch(char)` y `switch(String)`:** mismo comportamiento que `switch(int)`, funcionan de forma idéntica con `break` explícito. (`flow02`, `flow03`)
- **`default` en medio del `switch` (no al final):** si ningún `case` coincide, la ejecución salta a `default` **y sigue cayendo hacia abajo por los `case` físicamente siguientes** (el orden en el código, no el orden numérico), hasta el próximo `break`. Verificado con `x=9`: entra a `default`, imprime su mensaje, cae al `case 2` (que viene después en el texto) y se detiene en su `break`. (`flow04`)
- **`case` duplicado:** error de compilación, ver tabla de la sección 4. (`flow05`)
- **Sintaxis de flecha `case N ->`:** no hay fallthrough; cada rama es independiente; admite múltiples etiquetas separadas por coma (`case 1,2,3,4,5 ->`). Válida y compila limpio en Java 17. (`flow06`)
- **`switch` como expresión con `yield`:** válido en Java 17; el bloque `{ ...; yield valor; }` en una rama de flecha entrega el valor de esa rama a la expresión completa. (`flow07`)
- **Recomendación para v1:** SÍ incluir ambas formas (`switch` clásico con fallthrough Y `switch` de flecha/expresión), porque (a) ambas son 100% válidas en Java 17 sin ningún flag de preview, (b) el fallthrough clásico es precisamente uno de los conceptos que más se pide enseñar a nivel bachillerato (es una fuente de errores real), y (c) la sintaxis de flecha es cada vez más común en el material didáctico moderno. Excluir una de las dos dejaría al simulador incompleto frente a lo que un docente puede pegar.
- **`break`/`continue` con etiqueta en ciclos anidados:** verificado que `break externo;` sale del ciclo EXTERNO completo (no solo el interno), y `continue etiquetaExterna;` salta directamente a la siguiente iteración del ciclo externo, saltándose el resto del ciclo interno. (`flow08`)
- **`for` con múltiples variables:** `for (int i=0, j=10; i<j; i++, j--)` es válido; ambas variables viven en el mismo scope del `for`. (`flow09`)
- **Sentencia vacía `if (x > 5);`:** el `;` suelto ES la sentencia completa del `if` (un no-op). El bloque `{ ... }` que sigue **se ejecuta siempre**, sin relación con la condición — es un bloque suelto, no el cuerpo del `if`. Verificado: con `x=10` (condición verdadera) el bloque igual se imprime, porque se habría impreso de cualquier forma. Este es uno de los bugs más silenciosos posibles: compila limpio, sin warning. (`flow10`)
- **`else` colgante (dangling else):** el `else` se asocia SIEMPRE al `if` más cercano sin cerrar, sin importar la indentación visual. Verificado con anidamiento donde la indentación sugiere lo contrario y el resultado real confirma la regla del `if` más cercano. (`flow11`)
- **Alcance de bloques:** una variable declarada dentro de `{ }` (incluido el cuerpo de un `for`) deja de existir al cerrar la llave; usarla después es error de compilación "cannot find symbol", no un error de tipo distinto. (`flow12`, `flow14`, `flow15`)
- **Redeclarar una variable en el MISMO scope:** `int x=5; ... int x=10;` → error "variable x is already defined in method main(String[])". (`flow13`)
- **Shadowing en bloque anidado (variable con el mismo nombre que otra aún viva):** verificado que Java **prohíbe** esto — a diferencia de JavaScript (`let`) o Python, declarar `int x` dentro de un `if`/bloque anidado mientras la `x` externa sigue viva en ese punto **es error de compilación**, el mismo mensaje "variable x is already defined in method...". Esto aplica también a la variable de control de un `for` anidado si coincide con una variable externa todavía viva. Es clave que el analizador de alcance del intérprete NO permita este shadowing, porque JS/TS sí lo permiten de forma nativa y sería fácil copiar mal el comportamiento. (`flow17` control válido con nombres distintos, `flow18` y `flow19` con el error confirmado)
- **`switch(null)`:** con cualquier tipo de referencia (verificado con `String`), lanza `NullPointerException` en tiempo de ejecución al intentar evaluar el selector — no hay ningún `case` especial para `null` en el `switch` clásico de Java 17 (eso llegó después, con los patrones de `switch`, fuera del alcance v1). (`flow16`)

---

## 4. Catálogo de errores de compilación (`javac` 17) — 42 casos verificados

Convención: `→` es el mensaje EXACTO de `javac`; la columna "mensaje amable" es la propuesta en español mexicano para el simulador (no verificada contra UX real, es propuesta de diseño).

| # | Archivo | Qué escribió el alumno | Mensaje EXACTO de `javac` 17 | Mensaje amable propuesto |
|---|---|---|---|---|
| 1 | `err01` | `int x = 5` (sin `;`) | `';' expected` | Te falta un punto y coma `;` al final de esta línea. |
| 2 | `err02` | usa `edad` sin declararla | `cannot find symbol` / `symbol: variable edad` | No existe una variable llamada `edad`. ¿La declaraste antes? ¿Se te fue un error de dedo? |
| 3 | `err03` | llama `saludar()` sin definirla | `cannot find symbol` / `symbol: method saludar()` | No existe un método llamado `saludar()`. ¿Lo definiste? |
| 4 | `err04` | `int x = d;` con `d` tipo `double` | `incompatible types: possible lossy conversion from double to int` | Estás guardando un número con decimales en una variable `int`; puedes perder la parte decimal. Usa `(int)` si es a propósito. |
| 5 | `err05` | `int x; println(x);` | `variable x might not have been initialized` | La variable `x` no tiene un valor todavía. Asígnale uno antes de usarla. |
| 6 | `err06` | asigna `x` solo dentro de un `if` sin `else`, la usa después | `variable x might not have been initialized` | `x` solo recibe valor si se cumple el `if`; si no se cumple, `x` queda sin valor. Agrega un `else` o un valor por omisión. |
| 7 | `err09` | asigna dentro de un `while(cond)` con `break`, la usa después | `variable x might not have been initialized` | El ciclo `while` podría no ejecutarse ni una vez; `x` no queda garantizada. |
| 8 | `err10` | asigna dentro de un `for`, la usa después del `for` | `variable x might not have been initialized` | Un `for` puede ejecutarse cero veces; `x` no queda garantizada fuera del ciclo. |
| 9 | `err10c` | reasigna una variable `final` | `cannot assign a value to final variable x` | `x` es `final`: su valor se fija una sola vez y no se puede cambiar. |
| 10 | `err11` | código después de un `return` incondicional | `unreachable statement` | Esta línea nunca se va a ejecutar porque el método ya terminó con `return` antes. |
| 11 | `err12` | `int x = "5";` | `incompatible types: String cannot be converted to int` | `"5"` es texto, no es un número entero. Usa `Integer.parseInt("5")` para convertirlo. |
| 12 | `err13` | `if (x = 5)` con `x` tipo `int` | `incompatible types: int cannot be converted to boolean` | Usaste `=` (asignar) en vez de `==` (comparar) dentro del `if`. |
| 13 | `err14` | dos `else` para un mismo `if` | `'else' without 'if'` | Este `else` no tiene un `if` al cual pertenecer; revisa las llaves `{ }`. |
| 14 | `err15` | `"hola mundo;` (comilla sin cerrar) | `unclosed string literal` | Te faltó cerrar las comillas `"` de este texto. |
| 15 | `err16` | falta una `}` al final del archivo | `reached end of file while parsing` | El archivo terminó y todavía falta cerrar una o más llaves `}`. |
| 16 | `err17` | sobra una `}` | `class, interface, enum, or record expected` | Sobra una llave `}`: hay una de más después de que la clase ya había cerrado. |
| 17 | `err18` | `string nombre = "Ana";` (minúscula) | `cannot find symbol` / `symbol: class string` | En Java el tipo se llama `String`, con "S" mayúscula. |
| 18 | `err19` | `system.out.println(...)` (minúscula) | `package system does not exist` | Se escribe `System`, con "S" mayúscula. |
| 19 | `err20` | usa `Scanner` sin importar `java.util.Scanner` | `cannot find symbol` / `symbol: class Scanner` (×2) | Falta la línea `import java.util.Scanner;` al principio del archivo. |
| 20 | `err21` | `main` sin `static` | **compila bien**; falla al EJECUTAR: `Error: el método principal no es static en la clase ..., defina el método principal del siguiente modo:\n public static void main(String[] args)` | El método `main` debe ser `static`. (Nota: este error NO lo detecta `javac`, solo aparece al intentar ejecutar — ver §4.2) |
| 21 | `err22` | falta la `{` de apertura del método | `';' expected`, luego una cascada de `<identifier> expected` y `class, interface, enum, or record expected` | Falta abrir una llave `{` después de esto — probablemente la del método. *(mostrar solo el PRIMER error, ver recomendación abajo)* |
| 22 | `err23` | falta `)` en un `for` | `')' expected` | Te falta cerrar un paréntesis `)` en este `for`. |
| 23 | `err24` | `boolean activo = 5;` | `incompatible types: int cannot be converted to boolean` | Un `boolean` solo puede valer `true` o `false`, no un número. |
| 24 | `err25` | método `int` sin `return` en algún camino | `missing return statement` | Este método dice que regresa un `int` pero hay un camino que no hace `return`. |
| 25 | `err26` | `if/else if` sin `else` final, falta `return` | `missing return statement` | Falta cubrir el caso en que ninguna condición se cumple; agrega un `else` con su `return`. |
| 26 | `err27` | llama a un método con más argumentos de los que acepta | `method sumar in class ... cannot be applied to given types` / `reason: actual and formal argument lists differ in length` | `sumar` espera 2 valores (`int,int`) y le mandaste 3. |
| 27 | `err28` | compara `String == int` | `bad operand types for binary operator '=='` / `first type: String, second type: int` | No se puede comparar un texto con un número usando `==`. |
| 28 | `err29` | `break;` fuera de un ciclo/`switch` | `break outside switch or loop` | `break` solo tiene sentido dentro de un ciclo o un `switch`. |
| 29 | `err30` | `continue;` fuera de un ciclo | `continue outside of loop` | `continue` solo tiene sentido dentro de un ciclo. |
| 30 | `err31` | `break etiquetaQueNoExiste;` | `undefined label: otraEtiqueta` | No existe una etiqueta llamada `otraEtiqueta` en este método. |
| 31 | `err32` | `println("hola";` (falta `)`) | `')' expected` | Te falta cerrar un paréntesis `)`. |
| 32 | `err33` | `if (x)` con `x` tipo `int` | `incompatible types: int cannot be converted to boolean` | La condición de un `if` debe ser `true`/`false`, no un número. Usa por ejemplo `if (x != 0)`. |
| 33 | `err34` | `case variable:` (no constante) | `constant expression required` | Un `case` solo acepta valores fijos (constantes), no variables. |
| 34 | `err35` | `String - int` | `bad operand types for binary operator '-'` | No se puede restar un número a un texto. |
| 35 | `err36` | dos clases públicas en el archivo | `class OtroNombre is public, should be declared in a file named OtroNombre.java` (error solo en la SEGUNDA clase pública) | Solo puede haber una clase `public` por archivo, y debe llamarse igual que el archivo. |
| 36 | `flow05` | dos `case 1:` en el mismo `switch` | `duplicate case label` | Ya existe un `case 1` arriba; cada valor solo puede aparecer una vez. |
| 37 | `flow13` | redeclara `x` en el mismo bloque | `variable x is already defined in method main(String[])` | Ya existe una variable `x` en este método. |
| 38 | `flow14` | usa la variable de control del `for` fuera de él | `cannot find symbol` / `symbol: variable i` | `i` solo existe dentro del `for` donde se declaró. |
| 39 | `flow15` | usa una variable fuera de su bloque `{ }` | `cannot find symbol` / `symbol: variable y` | `y` solo existe dentro del bloque `{ }` donde se declaró. |
| 40 | `flow18` | redeclara `x` en un `if` anidado, mientras la externa sigue viva | `variable x is already defined in method main(String[])` | Ya existe una variable `x` visible en este punto (viene de más arriba); usa otro nombre. |
| 41 | `flow19` | el `for` declara `i` y ya existe una `i` externa viva | `variable i is already defined in method main(String[])` | Ya existe una variable `i` visible aquí; usa otro nombre para el contador del `for`. |
| 42 | `struct07` | `import` antes que `package` | `class, interface, enum, or record expected` | La línea `package` debe ir ANTES que cualquier `import`. |

### 4.1 Nota de diseño: errores en cascada

`err22` (falta una llave de apertura) demuestra que UN solo error de sintaxis temprano puede generar 3–4 errores más, todos consecuencia del primero y todos confusos si se muestran juntos a un alumno de bachillerato. **Recomendación fuerte:** el simulador debe reportar (al menos de forma destacada) SOLO el primer error de compilación, igual que hacen la mayoría de los entornos educativos, aunque `javac` internamente reporte varios.

### 4.2 Nota: "`main` sin `static`" NO es un error de `javac`

Verificado explícitamente: un programa con `public void main(String[] args)` (sin `static`) **compila sin ningún error ni advertencia**. El error solo aparece al intentar EJECUTARLO — lo lanza el *launcher* de la JVM (`java`), no el compilador. Mensaje verificado (con el locale por omisión de esta máquina, `es_MX`):

```
Error: el método principal no es static en la clase err21_main_sin_static, defina el método principal del siguiente modo:
   public static void main(String[] args)
```

Esto importa para el diseño del simulador: si el motor solo simula "compilación" en un paso y "ejecución" en otro, este caso debe clasificarse como fallo de EJECUCIÓN (o de arranque), no de compilación — de lo contrario se estaría inventando un comportamiento que `javac` no tiene.

### 4.3 Hallazgo colateral: bug de localización en el *launcher* de Temurin 17.0.18 (es)

No pedido explícitamente, pero se encontró verificando el punto anterior y vale la pena registrarlo como riesgo de NO copiar: cuando la clase **no tiene ningún método `main` en absoluto** (a diferencia de "no static"), el mensaje en español del *launcher* de `java` viene con errores de escape — literalmente contiene los caracteres `\n` como texto plano en vez de saltos de línea reales (confirmado con `od -c`, dump de bytes: aparecen los bytes `\` y `n` por separado, no el byte `0x0A`). El mismo mensaje en inglés (`-Duser.language=en -Duser.country=US`) SÍ tiene saltos de línea reales y se ve bien formado. Es un bug real de la traducción al español de Temurin 17.0.18, no algo que el simulador deba imitar — si alguna vez se simula este mensaje, debe mostrarse bien formado, no con el bug.

### 4.4 Reglas de asignación definitiva verificadas (JLS cap. 16), aplicadas al subconjunto v1

Estas son las reglas que el analizador estático del intérprete TypeScript debe implementar para rechazar exactamente lo que `javac` rechaza (ni más estricto ni más permisivo):

1. **Declaración sin inicializador + uso sin asignación previa garantizada** → error. (`err05`)
2. **`if`/`else`:** una variable queda *definitivamente asignada* después del `if`/`else` **solo si** se asigna en AMBAS ramas, o una rama asigna y la otra termina abruptamente (`return`/`throw`/`break`/`continue`). Si falta el `else`, NUNCA queda garantizada (aunque el `if` cubra "todos los casos posibles" a ojo humano — el compilador no razona sobre el valor de la condición, salvo que sea una constante booleana literal). (`err06` falla, `err07` control que sí compila con `if`/`else` completo)
3. **`while(condición)` con asignación dentro del cuerpo:** el cuerpo puede ejecutarse cero veces (el compilador no garantiza que se ejecute, salvo que la condición sea el literal constante `true`), así que una variable asignada solo ahí **nunca** queda definitivamente asignada después del ciclo. (`err09`)
4. **`while(true)` (condición constante `true`) es un caso especial de la JLS:** el compilador SABE que el ciclo jamás termina por su condición, así que la única forma de "salir" es `break` (o `return`/`throw`). La asignación definitiva después del ciclo se calcula sobre los puntos de `break`: si todo `break` alcanzable ocurre después de asignar la variable, la variable queda definitivamente asignada. Verificado: `while(true){ x=1; break; }` seguido de `println(x)` **compila limpio**. (`err08`) Lo mismo aplica a `for(;;)` por ser también condición constante `true` (no se probó explícitamente pero se deriva de la misma regla JLS §16.2.11 y no requiere verificación adicional: es la misma construcción semántica que `while(true)`).
5. **`for` con condición NO constante:** igual que `while(condición)` — nunca garantiza asignación definitiva después del ciclo, aunque el cuerpo asigne en cada iteración. (`err10`)
6. **`do { ... } while(condición);`** el cuerpo se ejecuta SIEMPRE al menos una vez, sin importar la condición. Si el cuerpo asigna la variable de forma incondicional, la variable SÍ queda definitivamente asignada después del ciclo, sin importar qué tan compleja sea la condición de salida. Verificado. (`err10b`, control que compila y corre)
7. **`final`:** solo se puede asignar una vez en total (ni siquiera dos veces dentro del mismo `if`/`else`, aunque las ramas sean mutuamente excluyentes — no se probó ese sub-caso específico, pero si se reasigna literalmente una segunda vez en el mismo camino de ejecución lineal, es error inmediato). (`err10c`)
8. **Redeclaración / shadowing:** "ya está definida" es un error de **alcance/duplicidad de nombre**, NO de asignación definitiva — ocurre incluso si la primera variable ni siquiera se usó. Aplica tanto a redeclarar en el mismo bloque como a declarar en un bloque anidado un nombre que ya existe en un bloque contenedor todavía vivo (Java NO permite shadowing de variables locales, a diferencia de JS/TS). (`flow13`, `flow18`, `flow19`)
9. **Uso fuera de alcance** (variable de bloque, o variable de control de `for`, referenciada después de cerrarse su bloque) es error de **resolución de símbolo** ("cannot find symbol"), otra categoría distinta de "podría no estar inicializada". (`flow14`, `flow15`)

---

## 5. Excepciones en tiempo de ejecución sin atrapar — formato EXACTO de JDK 17

Verificado en `exc01`–`exc09`, más `scan03/04/10/11` (Scanner) y `str08–str12` (String) ya cubiertas en la sección 1.

| Código | Excepción/Error y mensaje EXACTO | Notas |
|---|---|---|
| `10 / 0` (enteros) | `Exception in thread "main" java.lang.ArithmeticException: / by zero` | El mensaje es literalmente `/ by zero`, incluso para `%` (ver siguiente fila) — no dice "% by zero". |
| `10 % 0` (enteros) | `Exception in thread "main" java.lang.ArithmeticException: / by zero` | Mismo mensaje que la división; puede confundir a quien espera ver el símbolo `%`. |
| `10.0 / 0.0` (double) | **No lanza excepción.** Da `Infinity`. `-10.0/0.0` da `-Infinity`. `0.0/0.0` da `NaN` | Aritmética IEEE 754: la división flotante entre cero NUNCA lanza `ArithmeticException`, a diferencia de la entera. Gotcha importante para el simulador (comportamiento distinto según el tipo). |
| `arr[5]` con `arr.length==3` | `Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 3` | Formato moderno (JDK 9+); NO es el formato viejo `"Index: 5, Size: 3"`. |
| `arr[-1]` | `Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index -1 out of bounds for length 3` | Mismo formato para índice negativo. |
| `new int[-5]` | `Exception in thread "main" java.lang.NegativeArraySizeException: -5` | El mensaje es solo el número. |
| Recursión sin caso base | `Exception in thread "main" java.lang.StackOverflowError` | **Sin mensaje**, y el *stack trace* se llena de miles de líneas repetidas del mismo marco (en esta corrida, 1024 líneas de traza antes de truncarse el proceso). No es una `Exception`, es un `Error`. |
| NPE con varias llamadas anidadas (`main→paso1→paso2→paso3`) | `Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.trim()" because "s" is null` + 4 líneas `at Clase.metodo(Archivo.java:N)`, una por cada marco, en orden desde el más profundo (`paso3`) hasta `main` | Muestra la pila completa de invocaciones, útil para decidir cuánto de la traza mostrarle al alumno (ver recomendación abajo). |
| Conversión `(byte)200` | No es excepción: dato. Resultado `-56` (desbordamiento silencioso, aritmética de complemento a 2, 200-256) | |
| `(int) 3.99` / `(int) -3.99` | `3` / `-3` — el *cast* trunca HACIA CERO, no redondea ni hace `floor` | Importante: `(int)-3.99` da `-3`, NO `-4`. |
| `(int)(10_000_000_000L)` | `1410065408` | Truncamiento a los 32 bits bajos del `long`, con signo — desbordamiento silencioso, sin excepción. |

**Recomendación sobre qué mostrar al alumno:** de la traza completa, mostrar (a) el nombre de la excepción sin el paquete completo cuando sea del alumno (`ArithmeticException` en vez de `java.lang.ArithmeticException`) pero SÍ mantener el paquete completo cuando la traza pasa por `java.base` (Scanner, String) para que el alumno aprenda a distinguir "esto es mi código" de "esto es la biblioteca estándar"; (b) el mensaje completo; (c) solo los marcos (`at ...`) que pertenecen a la clase del alumno — colapsar u ocultar los marcos `java.base/...` de Scanner/String salvo que el alumno pida "ver más", porque esos marcos no aportan nada pedagógico y si el programa es recursivo pueden ser miles de líneas (caso `StackOverflowError`).

---

## 6. Estructura del programa

Verificado en `struct01`–`struct07`.

- **Plantilla de NetBeans** (comentario de licencia + `package` + Javadoc `@author` + clase): compila y corre sin cambios; el `package` obliga a ejecutar con el nombre calificado (`paquetedeprueba.NombreClase`). El simulador **no tiene archivos ni paquetes reales**, así que debe: si el pegado incluye `package ...;`, simplemente ignorarlo (no hay filesystem que lo represente) — no hay necesidad de rechazarlo, basta con no usarlo para nada. (`struct01`)
- **`import java.util.Scanner;` vs `import java.util.*;`**: ambos compilan y funcionan idéntico en la práctica para este subconjunto. (`struct02`, `struct02b`)
- **`package` debe ir ANTES que cualquier `import`**: si se invierte el orden, `javac` da `class, interface, enum, or record expected` señalando la línea de `package` — mensaje confuso que no menciona el orden. (`struct07`)
- **`String[] args` / `String args[]` / `String... args`**: **las tres formas son válidas** y funcionan exactamente igual como punto de entrada; no hay diferencia observable en tiempo de ejecución. (`struct03`, `struct03b`, `struct03c`)
- **Más de una clase en el archivo:** válido, siempre que como máximo UNA sea `public` y esa `public` coincida con el nombre del archivo. Con dos clases `public` en el mismo archivo, el error se reporta solo sobre la SEGUNDA (`class OtraPublica is public, should be declared in a file named OtraPublica.java`), la primera no se queja aunque también sea "culpable" en cierto sentido. (`struct04` válido, `struct05` con el error)
- **Métodos `static` auxiliares:** funcionan sin ningún problema a nivel de lenguaje (`struct06`); que estén "fuera de alcance v1" es una decisión de PRODUCTO (cuánto simula el motor), no una limitación del lenguaje. **Recomendación:** si el motor decide no soportar métodos definidos por el alumno en v1, el aviso debe ser explícito y claro ("Los métodos propios (`static`) no están disponibles todavía en esta versión del simulador"), nunca fallar en silencio ni dar un resultado inventado — tal como exige el encargo.
- **Clase pública vs. nombre de archivo:** en `javac` real, el nombre del archivo `.java` debe coincidir con el de la única clase `public`. **En el simulador no existe archivo real** (el alumno pega texto en un cuadro), así que esta regla de `javac` simplemente **no aplica** — no hay "nombre de archivo" que pueda no coincidir. Recomendación: el simulador debe tomar el nombre de la primera clase `public` que encuentre (o la única clase, si no hay ninguna marcada `public`) como el punto de entrada, y punto; no debe intentar inventar un error de "nombre de archivo" porque sería un error que NUNCA le pasaría al alumno en su contexto real (pegar código en una caja de texto, no guardar archivos).

---

## 7. Salida estándar

Verificado en `out01`–`out06`.

- **`System.out.print(...)` sin salto de línea final:** confirmado a nivel de BYTES (con `od -c`) que si el programa termina con `print` (no `println`), el último caracter de la salida NO es `\n`. El simulador debe replicar esto con exactitud si compara salidas de forma literal (por ejemplo en pruebas diferenciales) — no agregar un salto de línea final "por cortesía". (`out01`)
- **`println()` vacío:** solo emite el salto de línea; lo que venga antes y después queda cada uno en su propia línea sin espacio extra. (`out02`)
- **`print(char)` vs `print(int)`:** son *overloads* distintos y el compilador elige uno según el tipo de la expresión, NO según el valor. `print('A')` imprime la letra `A`; `print(65)` imprime el texto `65`. Pero `'A' + 1` dentro de una expresión aritmética PROMUEVE el `char` a `int` (da `66`, no `'B'`); hay que aplicar un *cast* explícito `(char)('A' + 1)` para recuperar la letra `'B'`. Este es un punto fino y muy propenso a confusión que el simulador debe modelar como parte de su sistema de tipos (elegir el overload de `print`/`println` en función del tipo ESTÁTICO de la expresión, no de un valor dinámico). (`out03`)
- **`System.err` vs `System.out`:** son dos flujos independientes; capturados por separado nunca se mezclan entre sí, pero cuando ambos van al mismo destino (como la consola real, o como al combinarlos con `2>&1`) el orden de aparición sigue el orden real en que el programa los fue escribiendo, porque ambos son `PrintStream` con autoflush por línea. Verificado: `out(1), err(1), out(2), err(2)` en el código produce exactamente esa secuencia en la consola combinada. **Para el panel único de "consola" del simulador, esto significa que basta con escribir ambos flujos en el mismo lugar en el orden en que el intérprete los va generando** — no hace falta ningún mecanismo especial de sincronización. Sí conviene, como NetBeans, pintar `System.err` en otro color (p. ej. rojo) para que el alumno note la diferencia, aunque compartan la misma caja de texto. (`out04`)
- **`printf`:** `%d`, `%s`, `%.2f`, `%n` (salto de línea independiente de plataforma) y `%%` (porcentaje literal) verificados y funcionando como en cualquier `printf` de estilo C. (`out05`)
- **Orden de evaluación de `+` con mezcla de tipos:** izquierda a derecha, y en cuanto CUALQUIER operando se vuelve `String`, todo lo que sigue a la derecha se concatena como texto. `1+2+"hola"` → `"3hola"` (la suma numérica ocurre primero porque va antes del `String`); `"hola"+1+2` → `"hola12"` (una vez que aparece el `String`, todo lo siguiente es concatenación, de izquierda a derecha); `'a'+1` → `98` (un `char` más un `int` es aritmética pura, char promovido a su código numérico); `""+'a'+1` → `"a1"` (forzar el `char` a texto primero con `""+`, evita la promoción numérica). Estos cinco casos son de los favoritos para "trampa" en exámenes de bachillerato y deben estar en el corpus de pruebas del intérprete. (`out06`)

---

## 8. Riesgos para reportar al PO / al resto del equipo SDD

1. **`nextDouble()` y el separador decimal:** el simulador debe decidir explícitamente si acepta punto, coma, o ambos — verificado que "español" NO implica automáticamente coma (México usa punto). Ver §2.1. Recomiendo aceptar punto por default (fidelidad a `es_MX`) y considerar aceptar también coma con un mensaje de advertencia, pero esto es una decisión de producto, no una verificación técnica pendiente.
2. **Consola de NetBeans (Scanner):** la descripción de cómo se ve la consola integrada de NetBeans (§2.2) es INFERIDA de comportamiento documentado y de cómo se comportan `System.in`/`System.out` en terminal, NO se verificó abriendo NetBeans real. Si la fidelidad visual de la consola es crítica para el producto, recomiendo una sesión corta de validación con capturas de pantalla reales de NetBeans antes de construir esa parte de la UI.
3. **NPE de `switch(String nula)` con `<local2>`:** es una inconsistencia real de `javac`/la JVM (§1.4) que recomiendo NO replicar (mostrar siempre el nombre real de la variable es más simple y más útil pedagógicamente); si se quiere fidelidad absoluta, hay que decidirlo explícitamente porque diverge de "todo se compila con `-g` como NetBeans".
4. **Errores en cascada (`err22`):** un solo error de sintaxis genera varios mensajes de `javac`; recomiendo fuertemente mostrar solo el primero (§4.1) para no abrumar a un alumno de bachillerato — pero esto es una decisión de UX que vale la pena confirmar con el PO/docente.
5. **Cuánto de la pila de excepción mostrar (§5):** recomiendo ocultar por default los marcos `java.base/...` (Scanner, String) y mostrar solo los marcos del código del alumno; confirmar con el PO si quiere un botón de "ver todo" para los casos avanzados (recursión / `StackOverflowError`).

---

## 9. Programas candidatos al corpus de pruebas diferenciales

De los 117 programas, estos son los más representativos para promover a un corpus formal de pruebas diferenciales `javac`/`java` real vs. intérprete TypeScript (uno por concepto, eligiendo el más claro cuando hay variantes):

**Identidad de `String`:** `str01`, `str02`, `str04`, `str05`, `str06` (el error clásico), `str07` (métodos), `str08`, `str09`, `str10`, `str11`, `str12` (NPE con nombre real), `flow16` (NPE de switch-null), `str13`, `str15`.

**Scanner:** `scan01`, `scan02` (el bug del buffer), `scan02b` (la forma correcta), `scan03`/`scan03b` (InputMismatch y su no-consumo), `scan04`, `scan05`/`scan05c` (locale), `scan06`, `scan07`, `scan08`.

**Control de flujo:** `flow01` (fallthrough), `flow04` (default en medio), `flow06`/`flow07` (flecha y `yield`), `flow08` (etiquetas), `flow09` (for multivariable), `flow10` (`;` fantasma), `flow11` (else colgante), `flow18`/`flow19` (shadowing prohibido).

**Errores de compilación (mínimo indispensable, uno por categoría del temario U3–U6):** `err01`, `err04`, `err05`, `err06`, `err08` (control que SÍ compila), `err09` (el mismo caso pero que SÍ falla — para contrastar), `err10b` (do-while que sí compila), `err12`, `err13`, `err18`, `err19`, `err20`, `err21` (falla al ejecutar, no al compilar), `err25`, `err28`, `flow05`, `flow13`.

**Excepciones en ejecución:** `exc01`, `exc02` (el contraste entero-vs-flotante), `exc04`, `exc07` (stack overflow), `exc08` (pila con varios marcos), `exc09` (casting silencioso).

**Salida:** `out01`, `out03`, `out06` (los cinco casos de concatenación mixta).

---

## Metadatos

- Explorador: semántica de texto/entrada/control-de-flujo/errores — Java 17
- JDK real usado: Temurin 17.0.18+8 (`/Library/Java/JavaVirtualMachines/temurin-17.jdk`)
- 117 micro-programas, 42 con error de compilación verificado, 0 archivos `.class` en el repo
- Carpeta de experimentos: `/Users/desarrollo/VisualizadorJava/openspec/changes/visualizador-java/exploracion/experimentos/texto/`
