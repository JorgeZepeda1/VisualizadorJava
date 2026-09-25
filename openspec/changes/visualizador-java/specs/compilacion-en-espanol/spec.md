# Compilación en español

## Purpose

Define el análisis estático previo a la ejecución: qué se rechaza como error de compilación (igual que `javac`), en qué idioma y con qué línea se reporta, y los dos casos de arranque (falla al ejecutar, no al compilar) que produce el lanzador de Java.

## Requirements

### Requirement: [REQ-COMP-001] Errores de tipos
El sistema MUST rechazar antes de ejecutar cualquier incompatibilidad de tipos que `javac` 17 rechaza: asignar un tipo incompatible (`String` a `int`, `double` a `int` sin cast, `int` a `boolean`), usar un valor no booleano como condición de `if`/`while`, operandos incompatibles entre `String` y un tipo numérico en `==`/`-`/etc., y el caso `int r = Math.round(x);` (retorno `long` de `Math.round(double)` asignado a `int`). MUST reportarlo en español, en la misma línea que señalaría `javac`.

#### Scenario: `Math.round(double)` asignado a `int`
- GIVEN `double x = 2.5; int r = Math.round(x);`
- WHEN se analiza
- THEN se rechaza en la línea de `int r = ...` con un mensaje equivalente a "estás guardando un valor `long` en una variable `int`; puede perder precisión. Usa `(int)` si es a propósito."

#### Scenario: condición no booleana
- GIVEN `int x = 5; if (x) { } }`
- WHEN se analiza
- THEN se rechaza: "la condición de un `if` debe ser `true`/`false`, no un número. Usa por ejemplo `if (x != 0)`."

### Requirement: [REQ-COMP-002] Errores de símbolo y de alcance
El sistema MUST rechazar el uso de una variable o método no declarado ("no existe una variable/método llamado…"), el uso de una variable fuera de su bloque (incluida la variable de control de un `for`), y el uso de `Scanner` sin su `import`. MUST señalar la línea donde se usa el símbolo, igual que `javac`.

#### Scenario: variable de un `for` usada después de cerrarlo
- GIVEN `for (int i = 0; i < 3; i++) { } System.out.println(i);`
- WHEN se analiza
- THEN se rechaza en la línea del `println`: "`i` solo existe dentro del `for` donde se declaró."

### Requirement: [REQ-COMP-003] Redeclaración y sombreado prohibidos
El sistema MUST rechazar redeclarar una variable en el mismo bloque y declarar, en un bloque anidado, un nombre que ya pertenece a una variable local todavía viva en un bloque contenedor (incluida la variable de control de un `for` anidado) — Java no permite sombreado de locales, a diferencia de JavaScript/TypeScript.

#### Scenario: sombreado en un `if` anidado
- GIVEN `int x = 5; if (true) { int x = 10; }`
- WHEN se analiza
- THEN se rechaza: "ya existe una variable `x` visible en este punto; usa otro nombre."

### Requirement: [REQ-COMP-004] Asignación definitiva
El sistema MUST aplicar exactamente las reglas de asignación definitiva de Java: una variable sin inicializador usada sin asignación previa se rechaza; tras `if`/`else` queda garantizada solo si ambas ramas asignan o la rama faltante termina abruptamente; `while(condición)` y `for(condición)` con condición no constante NUNCA garantizan asignación después del ciclo, aun si el cuerpo asigna en cada vuelta; `while(true)`/`for(;;)` sí la garantizan si todo `break` alcanzable ocurre después de asignar; `do-while` la garantiza si el cuerpo asigna incondicionalmente; una `final` solo admite una asignación total.

#### Scenario: `while` con condición variable nunca garantiza
- GIVEN `int x; while (leer()) { x = 1; } System.out.println(x);`
- WHEN se analiza
- THEN se rechaza: "el ciclo `while` podría no ejecutarse ni una vez; `x` no queda garantizada."

#### Scenario: `while(true)` con `break` sí garantiza
- GIVEN `int x; while (true) { x = 1; break; } System.out.println(x);`
- WHEN se analiza
- THEN compila limpio: `x` queda definitivamente asignada

### Requirement: [REQ-COMP-005] Errores de sintaxis
El sistema MUST rechazar sintaxis inválida (`;` faltante, paréntesis o llave sin cerrar, cadena sin cerrar, `else` sin `if`, `case` duplicado, `break`/`continue` fuera de ciclo o `switch`, etiqueta indefinida, método que declara un tipo de retorno y tiene un camino sin `return`) con un mensaje amable en español y la misma línea que `javac` señalaría como la primera. El código inalcanzable (`return`/`break`/`continue` seguido de otra sentencia, cuerpo de ciclo con condición constante `false`) MUST NOT tratarse como error de sintaxis: es una pasada aparte, **alcanzabilidad** (ver REQ-COMP-006 y REQ-COMP-010), que corre después y solo si las pasadas de sintaxis y atribución no encontraron error.

#### Scenario: falta `;`
- GIVEN `int x = 5`
- WHEN se analiza
- THEN se rechaza en esa línea: "te falta un punto y coma `;` al final de esta línea."

### Requirement: [REQ-COMP-006] Solo el primer error, de la primera pasada que falla — veredicto idéntico a `javac`
El análisis MUST correr en el mismo orden de pasadas que `javac` 17: **(1)** léxico y sintaxis, **(2)** atribución (tipos, símbolos, sobrecargas, alcance y sombreado — REQ-COMP-001, REQ-COMP-002, REQ-COMP-003), **(3)** alcanzabilidad (JLS 14.22 — REQ-COMP-010), **(4)** asignación definitiva (REQ-COMP-004), **(5)** arranque (REQ-COMP-007, REQ-COMP-008). Cuando hay varios errores, el sistema MUST reportar únicamente el primero de la **primera pasada que falla**, sin importar si un error de una pasada posterior está en una línea anterior del texto: un error de atribución oculta cualquier error de alcanzabilidad o de asignación definitiva aunque esté en una línea posterior en el texto, y dentro del flujo, todo código inalcanzable se informa antes que cualquier variable sin inicializar. El veredicto "compila" / "no compila" MUST coincidir con `javac` 17 en el 100% de los casos: ni más estricto ni más permisivo. La regla de "el nombre de la clase pública debe coincidir con el archivo" MUST NOT aplicarse — el visualizador no tiene archivos.

#### Scenario: llave de apertura faltante genera una cascada en `javac`, el sistema reporta solo la primera
- GIVEN un método sin su `{` de apertura, que en `javac` real dispara varios errores encadenados
- WHEN se analiza
- THEN el sistema muestra solo el primero, con su línea

#### Scenario: un error de atribución oculta uno de asignación definitiva en una línea anterior
- GIVEN `int x; System.out.println(x);` (variable sin inicializar) seguido, más adelante, de `int y = "hola";` (tipos incompatibles)
- WHEN se analiza
- THEN el sistema reporta solo el error de tipos de `int y = "hola";` (pasada 2, atribución); el de `x` sin inicializar (pasada 4, asignación definitiva) no se informa, aunque esté antes en el texto

#### Scenario: la alcanzabilidad se informa antes que la asignación definitiva
- GIVEN `int x; System.out.println(x);` (variable sin inicializar) en una línea, y más adelante `return;` seguido de otra sentencia en la misma rama (código inalcanzable)
- WHEN se analiza
- THEN el sistema reporta solo el código inalcanzable (pasada 3, alcanzabilidad); el de `x` sin inicializar (pasada 4, asignación definitiva) no se informa, aunque esté antes en el texto

### Requirement: [REQ-COMP-007] `main` sin `static` — error de arranque, no de compilación
El sistema MUST compilar sin error un programa cuyo `main` no es `static`, y MUST fallar únicamente al intentar ejecutarlo, con el texto verificado del lanzador de Java 17 (locale es-MX) más una explicación breve en español que aclare que esto no es un error de compilación.

#### Scenario: `public void main` sin `static`
- GIVEN `public class Demo { public void main(String[] args) { } }`
- WHEN se analiza y se ejecuta
- THEN el análisis previo no marca ningún error; al intentar ejecutar se muestra "Error: el método principal no es static en la clase Demo, defina el método principal del siguiente modo: `public static void main(String[] args)`" con la explicación de que Java permitió compilarlo pero no puede arrancarlo

### Requirement: [REQ-COMP-008] Sin método `main` — error de arranque
El sistema MUST detectar cuando la clase no tiene ningún método `main` (con cualquier firma) y MUST mostrarlo como error de arranque, no de compilación, con un mensaje bien formado en español (saltos de línea reales) — MUST NOT reproducir el error de escape verificado del lanzador de Temurin 17.0.18 en español, donde el texto trae literalmente los caracteres `\n` en vez de saltos de línea.

#### Scenario: clase sin ningún `main`
- GIVEN `public class SinMain { public static int x = 5; }`
- WHEN se analiza y se ejecuta
- THEN el análisis previo no marca error; al ejecutar se muestra, bien formado: "no se ha encontrado el método principal en la clase SinMain; defina el método principal del siguiente modo: `public static void main(String[] args)`" más una explicación de que Java no sabe por dónde empezar a ejecutar el programa

### Requirement: [REQ-COMP-009] Nombre de archivo no aplica
Dado que el visualizador no representa archivos, el sistema MUST tomar como punto de entrada la primera clase `public` que encuentre (o la única clase, si ninguna es `public`), y MUST NOT generar un error de "el nombre de la clase debe coincidir con el archivo" — ese error de `javac` no tiene sentido fuera de un sistema de archivos real.

#### Scenario: clase pública con cualquier nombre
- GIVEN `public class CalculadoraVueltos { public static void main(String[] args) { } }`
- WHEN se analiza y se ejecuta
- THEN corre sin que el sistema pregunte ni valide ningún nombre de archivo

### Requirement: [REQ-COMP-010] Alcanzabilidad (código inalcanzable)
El sistema MUST rechazar, en su propia pasada de **alcanzabilidad** (JLS 14.22, tercera en el orden de REQ-COMP-006, después de sintaxis y atribución, antes de asignación definitiva), cualquier sentencia inalcanzable: código tras un `return`/`break`/`continue` incondicional en el mismo bloque, el cuerpo de un `while`/`for` con condición constante `false`, y toda sentencia posterior a un ciclo de condición constante `true` sin `break` alcanzable. Una condición constante (JLS 15.29, p. ej. `while (1 < 2)`) MUST contar como `true`/`false` para este análisis, igual que el literal equivalente; el `if (false)` MUST estar exento.

#### Scenario: sentencia tras un `return` incondicional
- GIVEN `System.out.println("a"); return; System.out.println("nunca");`
- WHEN se analiza
- THEN se rechaza la línea del segundo `println`: "esta línea nunca se ejecuta."

#### Scenario: condición constante `true` cuenta como un ciclo sin fin
- GIVEN `while (1 < 2) { }` seguido de otra sentencia
- WHEN se analiza
- THEN la sentencia posterior al ciclo se rechaza como inalcanzable, igual que si la condición fuera el literal `true`

## Conciliación con design.md §12 (2026-09-25)

- **REQ-COMP-006** reescrito: antes decía "reportar el primero en el orden en que javac los generaría" sin definir ese orden, lo que se podía leer como "primero por posición en el texto" — falso contra javac real. Ahora enumera las cinco pasadas (ADR 004) y afirma explícitamente que un error de una pasada anterior gana aunque esté en una línea posterior; agrega dos escenarios verificados (atribución oculta asignación definitiva; alcanzabilidad se informa antes que asignación definitiva).
- **REQ-COMP-005** editado: se quitó "código inalcanzable tras un `return`" de la lista de errores de sintaxis (pasada 1) porque en realidad es la pasada 3 (alcanzabilidad) — conflación que contradecía el orden de pasadas del diseño.
- **REQ-COMP-010** (nuevo): requisito propio para alcanzabilidad, que REQ-COMP-005 ya no cubre; con dos escenarios verificados, incluida la regla de que una condición constante `true`/`false` cuenta igual que el literal.
