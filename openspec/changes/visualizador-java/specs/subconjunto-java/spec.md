# Subconjunto de Java soportado

## Purpose

Define la gramática cerrada de Java 17 que el visualizador interpreta (currículo U3–U7) y el comportamiento observable cuando un programa usa algo fuera de ese subconjunto: nunca un resultado inventado, siempre un aviso claro antes de ejecutar.

## Requirements

### Requirement: [REQ-SUB-001] Estructura de programa aceptada
El sistema MUST aceptar como programa ejecutable cualquier código con exactamente una clase (cualquier nombre, con o sin `public`) y un método `public static void main(String[] args)` en cualquiera de sus tres formas (`String[] args`, `String args[]`, `String... args`). MUST aceptar `import java.util.Scanner;`, `import java.util.Random;`, `import java.util.*;` e imports de `java.lang` para las clases soportadas. MUST ignorar una línea `package ...;` sin rechazarla. MUST aceptar comentarios y `return;` dentro de `main`.

#### Scenario: Clase con nombre propio, sin `Main`
- GIVEN `public class Bienvenida { public static void main(String[] args) { System.out.println("Hola"); } }`
- WHEN se ejecuta
- THEN corre y produce `Hola`; ningún aviso se dispara por el nombre de la clase

#### Scenario: `package` se ignora
- GIVEN un programa con `package paquetedeprueba;` como primera línea
- WHEN se ejecuta
- THEN corre exactamente igual que sin esa línea

### Requirement: [REQ-SUB-002] Tipos, literales y soporte de `long`
El sistema MUST aceptar variables locales `int`, `double`, `boolean`, `char`, `String` y `long`, con o sin `final` (con inicializador), varias declaraciones por línea, y los literales de §2.1 de la propuesta (enteros con `_`, `long` con `L`, `double` con punto/exponente/sufijo `d`, `char`/`String` con escapes `\n \t \" \' \\`, `true`/`false`). El soporte de `long` MUST cubrir variables, literal `L`, aritmética/comparación de 64 bits con desbordamiento, promociones y casts (valores exactos en `biblioteca-java`); MUST NOT incluir `Scanner.nextLong()` ni `Long.parseLong` (REQ-SUB-007).

#### Scenario: literal `long` sin sufijo no compila
- GIVEN `long total = 5000000000;` (sin `L`)
- WHEN se analiza
- THEN se rechaza como error de compilación (ver `compilacion-en-espanol`), no como aviso de alcance

### Requirement: [REQ-SUB-003] Operadores aceptados
El sistema MUST aceptar `+ - * / %`, unarios `+ -`, `++`/`--` prefijo y postfijo, `== != < > <= >=`, `&& || !` con cortocircuito, `=` y `+= -= *= /= %=` (con conversión implícita al tipo del destino), concatenación con `+`, casts entre `int`/`long`/`double`/`char`, y paréntesis. MUST evaluar con la precedencia y el orden de evaluación izquierda→derecha de Java.

#### Scenario: asignación compuesta con conversión implícita
- GIVEN `int cx = 5; cx += 1.7;`
- WHEN se ejecuta la segunda línea
- THEN `cx` queda en `6` (equivale a `cx = (int)(cx + 1.7)`), no se rechaza como error de tipos

### Requirement: [REQ-SUB-004] Sentencias aceptadas
El sistema MUST aceptar declaraciones (varias por línea), sentencias de expresión, bloques con el alcance de Java (sin sombrear una local viva del bloque contenedor), `if`/`else`/`else if` anidados, la sentencia vacía `;`, `switch` clásico (`case`/`default` en cualquier posición, `break`, caída) sobre `int`/`char`/`String`, `while`, `do-while`, `for` (varias variables, partes vacías), anidamiento, `break` y `continue` sin etiqueta.

#### Scenario: redeclarar una variable viva en un bloque anidado se rechaza
- GIVEN `int x = 5; if (x > 0) { int x = 10; System.out.println(x); } }`
- WHEN se analiza antes de ejecutar
- THEN se rechaza como error de compilación; el sistema MUST NOT ejecutarlo con sombreado silencioso al estilo JavaScript

### Requirement: [REQ-SUB-005] Superficie de biblioteca reconocida
El sistema MUST reconocer sintácticamente (semántica exacta en `biblioteca-java`): `System.out`/`System.err` `print`/`println`/`printf`, `String.format`; un único `new Scanner(System.in)` con `nextInt nextDouble nextBoolean next nextLine close`; `Math.{abs,max,min,pow,sqrt,round,floor,ceil,random,PI,E}`; `String.{length,charAt,substring,indexOf,equals,equalsIgnoreCase,compareTo,toUpperCase,toLowerCase,trim,isEmpty,contains,startsWith,endsWith,replace,valueOf}` y `new String(texto)`; `Character.{isDigit,isLetter,isLetterOrDigit,isUpperCase,isLowerCase,isWhitespace,toUpperCase,toLowerCase}`; `Integer.parseInt`, `Double.parseDouble`, `MAX_VALUE`/`MIN_VALUE` de `Integer`/`Double`/`Long`; `Random` con `nextInt()`, `nextInt(n)`, `nextDouble()`, `nextBoolean()`.

#### Scenario: llamada de biblioteca reconocida sintácticamente
- GIVEN `Character.isDigit('5')` dentro de una expresión de un programa por lo demás válido
- WHEN se analiza
- THEN el sistema la reconoce como llamada válida y continúa el análisis; el resultado exacto de evaluarla se rige por `biblioteca-java`

### Requirement: [REQ-SUB-006] Momento y formato del aviso de fuera de alcance
Cuando un programa usa una construcción fuera de los requisitos anteriores, el sistema MUST detectarlo en el análisis previo a la ejecución (cero pasos ejecutados, cero salida) y MUST mostrar un mensaje de tipo **"No disponible en el visualizador"**, visualmente distinguible por ícono y título de los otros tres tipos de mensaje (error de compilación, excepción, límite de pasos). El mensaje MUST señalar la línea y la construcción, decir que Java sí la acepta (cuando aplica), aclarar que el visualizador cubre U3–U7, y ofrecer una alternativa dentro de alcance si existe. Si hay más de un problema, MUST mostrar solo el primero según su orden en el texto, seguido de "y N más".

#### Scenario: arreglo fuera de alcance
- GIVEN `int[] datos = {1, 2, 3};` en la línea 4 de un programa por lo demás válido
- WHEN se analiza
- THEN no se ejecuta ningún paso y se muestra: «Tu programa usa un arreglo (`int[]`) en la línea 4. Java sí lo acepta, pero este visualizador cubre las unidades 3 a 7 y todavía no muestra arreglos. No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.»

#### Scenario: literal octal se explica, no se malinterpreta
- GIVEN `int n = 010;`
- WHEN se analiza
- THEN el aviso indica explícitamente que Java lee `010` como octal (valor `8`), no como diez, y no ejecuta el programa

### Requirement: [REQ-SUB-007] Catálogo de construcciones fuera de alcance
El sistema MUST tratar cada fila de la siguiente tabla con el aviso de REQ-SUB-006; ninguna se reinterpreta de forma silenciosa:

| Construcción | Ejemplo | Nota del aviso |
|---|---|---|
| `nextLong`, `Long.parseLong` | `sc.nextLong()` | `long` sí soportado; estos miembros no |
| `float`, `byte`, `short` | `float f = 3.5f;` | nunca se reinterpretan como `double`/`int` |
| `switch` flecha/expresión, `yield` | `case 1 -> ...` | 0 usos en el currículo |
| Métodos propios, recursión, clases/campos/objetos propios | `static int cuadrado(int n)` | "Java sí lo acepta…" |
| Arreglos (salvo `String[] args`), `for` mejorado | `int[] a; for (int x : a)` | — |
| `try/catch/throw/throws`, `System.exit`, `null` | `catch (Exception e)` | sin `null` no hay NPE fuera del currículo |
| `?:`, bits/desplazamientos, `&`/`\|` lógicos, `instanceof` | `a & b`, `x << 2` | para `&`/`\|` sugiere `&&`/`\|\|` |
| `break`/`continue` con etiqueta; `final` sin inicializador | `break externo;` | — |
| Hex/octal/binario, bloques de texto, `\uXXXX` | `0x1F`, `010` | `010` se explica como octal, nunca se lee como diez |
| Segundo `Scanner`, `hasNextX`, `useLocale` | `new Scanner(System.in)` (2ª vez) | comportamiento distinto según cómo llega la entrada |
| `Math` trascendentes | `Math.sin`, `Math.log` | dependen de la plataforma incluso en Java real |
| `printf` con `%e %g %x %o %h %t`, `%1$`, banderas `+ ( #` y espacio | `%1$d` | fuera del currículo |
| `var`, genéricos, lambdas, `JOptionPane`, colecciones, cualquier miembro no listado | `var x = 5;` | fuera de U3–U7 |

#### Scenario: método propio del alumno
- GIVEN un programa que define `static int cuadrado(int n) { return n * n; }` y lo llama desde `main`
- WHEN se analiza
- THEN se muestra el aviso "No disponible en el visualizador" señalando la línea de la definición, indicando que los métodos propios (`static`) no están disponibles en esta versión

### Requirement: [REQ-SUB-008] Fuera de alcance detectado solo en ejecución
Cuando una construcción fuera de alcance solo puede detectarse en tiempo de ejecución (p. ej. un patrón de `printf`/`String.format` que no es un literal de texto), el sistema MUST detenerse en ese paso con el mismo tipo de mensaje de REQ-SUB-006, MUST dejar la traza previa completamente navegable, y MUST NOT producir ninguna salida a partir de ese paso.

#### Scenario: patrón de `printf` no literal
- GIVEN `String patron = obtenerPatron(); System.out.printf(patron, 5);` donde `obtenerPatron()` no es una construcción soportada de forma estática
- WHEN la ejecución llega a ese `printf`
- THEN se detiene con el aviso "No disponible en el visualizador"; los pasos anteriores siguen navegables; no se imprime nada de esa llamada
