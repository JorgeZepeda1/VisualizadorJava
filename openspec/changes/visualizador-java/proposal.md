# Propuesta: Visualizador de Java paso a paso (`visualizador-java`)

> Fase `sdd-propose` · 2026-09-25 · Roles: **Diseñador Pedagógico** (resultados de aprendizaje, progresión, tono) y **Arquitecto** (alcance técnico, riesgos). Base: `exploration.md` y `exploracion/01–05`. Lo comprobado en esta fase va marcado **[verificado hoy]**.

## 0. Decisiones del PO (vinculantes; no se reabren sin ADR)

| # | Decisión |
|---|---|
| D1 | Proyecto independiente: página estática Vite + React + TypeScript estricto en GitHub Pages; sin red en tiempo de ejecución tras la primera carga. |
| D2 | Alcance = currículo U3–U7; lo demás muestra un aviso claro en español, **nunca** un resultado inventado. |
| D3 | Intérprete TypeScript en el navegador; fidelidad verificada contra el JDK 17 real (Temurin 17.0.18 de la máquina del PO). |
| D4 | Modo "predice antes de avanzar" en v1, **apagado por omisión**: lo activa el docente con un interruptor visible o con un enlace que abre el simulador con el modo activo. |
| D5 | `nextDouble()` usa **punto** (`3.5`), como `es_MX`; `3,5` lanza el mismo `InputMismatchException` que NetBeans. La coma queda como opción de configuración. |
| D6 | No hay programas propios del PO: se escriben ejemplos nuevos por unidad (incluidos `Math`, `Random`, `printf`), verificados contra el JDK 17 y marcados "de autoría". |
| D7 | Consola con la apariencia inferida de NetBeans: mensaje del `print` y entrada tecleada en el mismo renglón, la entrada en otro color; ajustable después. |

## 1. Intención

**Problema en el aula.** En U3–U7 el alumno escribe Java en NetBeans y solo ve la salida final. Lo que la produce —la *máquina nocional* (Sorva 2013): variables que cambian, condiciones que se evalúan, vueltas de un ciclo, el programa detenido esperando al `Scanner`— es invisible; el docente lo reconstruye a mano en el pizarrón con una prueba de escritorio. Los errores clásicos que el propio curso enseña (división entera, `;` tras el `if`, caída sin `break`, error por uno, ciclo infinito, `nextInt()` + `nextLine()`, `==` con `String`) solo se entienden viendo la ejecución.

**Principio rector.** El visualizador *es* la máquina nocional que el alumno se va a formar: todo lo que muestra debe ser verdad de Java 17 (D3) y lo que no puede mostrar con verdad lo avisa (D2).

| Unidad | El alumno podrá… | Hoy no ve | Se hace visible con |
|---|---|---|---|
| U3 | Predecir el valor de cada variable tras asignaciones y lecturas | Que una variable guarda un solo valor que se reemplaza; que `Scanner` detiene el programa | Variables (anterior → nuevo, "sin inicializar"); consola que espera |
| U4 | Evaluar una expresión respetando precedencia, tipos y cortocircuito | División entera, `%` con negativos, `char` promovido, cast que trunca | Paso Detallado: subexpresión resaltada y tipo de cada resultado |
| U5 | Justificar qué rama corre sustituyendo la condición | Por qué entra o no; caída sin `break`; `;` fantasma; `else` colgante | Condición `x > 5 → 3 > 5 → false`; rama ✓/✗; paso de caída |
| U6 | Contar vueltas, explicar por qué un ciclo termina o no, usar contador, acumulador y bandera | Error por uno; ciclo infinito; cómo crece un acumulador | Contador de vueltas; prueba de escritorio; aviso de ciclo desbocado con datos |
| U7 | Depurar su proyecto comparando su prueba de escritorio con la real | Dónde se separa su idea de lo que hace Java | Prueba de escritorio + retroceder en el tiempo |

- **Progresión:** ver → predecir → modificar (taxonomía de Naps 2002; en Kumar 2015 predecir antes de ver dio más compromiso y mejor aprendizaje percibido que solo mirar). Carga cognitiva acotada: máximo 4 zonas (código · estado [Variables ⇄ Prueba de escritorio] · consola · explicación); lo contextual (condición, búfer de `Scanner`) aparece solo cuando aplica; el nivel Detallado es opcional.
- **Tono:** tuteo, amable, preciso, sin infantilizar; primero *qué* pasó y luego *por qué* con los números reales; nunca "incorrecto" a secas; vocabulario del curso (ciclo, vuelta, condición, prueba de escritorio, computadora); ≤ 2 renglones por explicación.
- **Uso docente:** (1) proyector con letra grande; el docente activa la predicción (D4) y pregunta al grupo "¿entra o no?"; (2) galería por unidad con los 35 programas del curso —incluidos sus errores clásicos— y ejemplos de autoría (D6); (3) enlace: prepara en casa código, entradas, semilla y modo, y lo abre en el aula o lo manda a sus alumnos, sin cuentas ni servidor.

## 2. Alcance v1 del lenguaje (lista cerrada)

### 2.1 Dentro

| Área | Soportado |
|---|---|
| Programa | Una clase (cualquier nombre, con o sin `public`) con `public static void main(String[] args)` (también `String args[]`, `String... args`); `import java.util.Scanner;`, `java.util.Random;`, `java.util.*;` y de `java.lang` para clases soportadas; `package …;` se acepta y se ignora; comentarios; `return;` en `main`. `main` sin `static` → error **al arrancar** (como el lanzador), no de compilación. |
| Tipos | `int`, `double`, `boolean`, `char`, `String` (con identidad de objeto) y `long` de apoyo (§2.2); solo variables locales; `final` con inicializador. |
| Literales | Enteros decimales (con `_`), `long` con `L`, `double` (punto, exponente, sufijo `d`), `char` y `String` con escapes `\n \t \" \' \\`, `true`/`false`. |
| Operadores | `+ - * / %`, unarios `+ -`, `++`/`--` prefijo y postfijo, `== != < > <= >=`, `&& \|\| !` con cortocircuito, `=` y `+= -= *= /= %=` (con conversión implícita), concatenación, casts entre `int`/`long`/`double`/`char`, paréntesis; precedencia y evaluación izquierda→derecha de Java. |
| Sentencias | Declaraciones (varias por línea), expresiones, bloques con el alcance de Java (sin sombrear locales vivas), `if`/`else`/`else if` anidados, sentencia vacía `;`, `switch` clásico (`case`, `default` en cualquier lugar, `break`, caída) sobre `int`, `char` y `String`, `while`, `do-while`, `for` (varias variables, partes vacías), anidados, `break`, `continue`. |
| Salida | `System.out.print/println` (sobrecarga por tipo estático: `char` ≠ `int`); `System.out.printf` y `String.format` con `%d %f %.Nf %s %c %b %n %%`, ancho y banderas `- 0 ,`; `System.err.print/println`. |
| `Scanner` | Uno solo sobre `System.in`: `nextInt nextDouble nextBoolean next nextLine close`. |
| `Math` | `abs max min` (int/long/double), `pow` (semántica fdlibm, §4), `sqrt round floor ceil random`, `PI`, `E`. |
| `String` | `length charAt substring (1 o 2 arg.) indexOf (String o char) equals equalsIgnoreCase compareTo toUpperCase toLowerCase trim isEmpty contains startsWith endsWith replace`, `String.valueOf`, `new String(texto)`. |
| `Character` | `isDigit isLetter isLetterOrDigit isUpperCase isLowerCase isWhitespace toUpperCase toLowerCase` (versiones `char`). |
| `Integer`/`Double`/`Long` | `Integer.parseInt`, `Double.parseDouble`, `MAX_VALUE`/`MIN_VALUE` de los tres. |
| `Random` | `new Random()`, `new Random(semilla)`, `nextInt()`, `nextInt(n)`, `nextDouble()`, `nextBoolean()`; `Math.random()`. |

### 2.2 Decisiones de borde

| Construcción | v1 | Motivo |
|---|---|---|
| `long` | **Apoyo:** variables, literales `L`, aritmética y comparación a 64 bits con desbordamiento, promociones, casts (`(int)` de `long` da la vuelta; `(long)` de `double` satura), `%d`, `Math.round/abs/max/min`. Fuera: `nextLong`, `Long.parseLong`. | `Math.round(double)` devuelve `long`; `int r = Math.round(x);` es un error real que Java rechaza. |
| Entero > `int` sin `L` | Error de compilación, como javac. | Fidelidad. |
| `float`, `byte`, `short` | Aviso. **Nunca** se reinterpretan como `double`/`int`. | Fuera del currículo; reinterpretar = resultado inventado. |
| `switch` con flecha, `switch` como expresión, `yield` | Aviso. | 0 usos en el currículo (04); candidato v1.x. |
| Métodos propios, recursión, varias clases, campos, objetos propios | Aviso ("Java sí lo acepta…"). | 0 usos (04). |
| Arreglos (salvo `String[] args`), `for` mejorado | Aviso. | 0 usos. |
| `try/catch/throw/throws`, `System.exit`, `null` | Aviso. | 0 usos; sin `null` no hay NPE fuera del currículo. |
| `?:`, bits y desplazamientos, `&`/`\|` lógicos, `instanceof` | Aviso (para `&`/`\|` sugiere `&&`/`\|\|`). | 0 usos. |
| `break`/`continue` con etiqueta; `final` sin inicializador | Aviso. | 0 usos; simplifica alcanzabilidad y asignación definitiva. |
| Hex/octal/binario (incluido `010`), bloques de texto, `\uXXXX` | Aviso (para `010` explica que Java lo lee como octal: 8). | Nunca leer mal en silencio. |
| Segundo `Scanner`, `hasNextX`, `useLocale` | Aviso. | Con dos `Scanner` Java se comporta distinto según cómo llega la entrada. |
| `Math` trascendentes (`sin`, `log`, `exp`, `cbrt`…) | Aviso. | Dependen de la plataforma incluso en Java (§4). |
| `printf` con `%e %g %x %o %h %t`, `%1$`, banderas `+ ( #` y espacio | Aviso. | Fuera del currículo. |
| `var`, genéricos, lambdas, `JOptionPane`, colecciones, cualquier miembro no listado | Aviso. | Fuera de U3–U7. |
| `Random` sin semilla / `Math.random()` | Soportado: semilla **visible**, nueva en cada ejecución, guardada en el enlace, con botón "repetir". | Java real no es reproducible; se dice explícitamente. |

### 2.3 Cómo se comporta el aviso

1. Se detecta **antes de ejecutar**: no corre ningún paso ni aparece salida.
2. Marca la línea y la construcción; dice qué es, que Java sí la acepta (cuando aplica), que el visualizador cubre U3–U7 y, si existe, una alternativa dentro del alcance. Ej.: «Tu programa usa un arreglo (`int[]`) en la línea 4. Java sí lo acepta, pero este visualizador cubre las unidades 3 a 7 y todavía no muestra arreglos. No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.»
3. Cuatro mensajes distinguibles por icono y título, no solo por color: *Error de compilación* (Java tampoco lo acepta), *No disponible en el visualizador* (Java sí), *El programa se detuvo por un error* (excepción), *Se detuvo por seguridad* (límite de pasos).
4. Varios problemas → el primero en el orden del texto, más "y N más".
5. Lo que solo se sabe al ejecutar (formato de `printf` no literal) detiene la ejecución en ese paso con el mismo aviso; la traza previa sigue navegable; no se imprime nada inventado.

### 2.4 Errores de compilación

Solo el **primer** error, en español, en la **misma línea** que javac, con subrayado; el veredicto compila/no compila es idéntico al de javac (ni más estricto ni más permisivo). Del catálogo de 42 casos de `03`, **37** caen en el subconjunto. De los 5 restantes, cuatro producen su aviso (tres usan métodos propios y uno `break` con etiqueta); el de "clase pública con nombre distinto al archivo" no aplica, porque en el visualizador no hay archivo (03 §6): el programa corre.

## 3. Funcionalidad v1

**MUST** (condición para publicar v1):

| # | Función | Evidencia |
|---|---|---|
| M1 | Editor CodeMirror 6: resaltado de Java, números de línea, pegar o escribir | 05 §2; fricción cero |
| M2 | Errores de compilación (§2.4) y avisos (§2.3) | D2, D3; 03 §4.1 |
| M3 | Paso **Normal** (por sentencia) con sustitución completa de condiciones y asignaciones | 01 §4 |
| M4 | Paso **Detallado** (por subexpresión: precedencia, promociones, cortocircuito marcado "no evaluado"), control siempre visible | 01 §4; U4; lote propio |
| M5 | Marcadores de línea recién ejecutada y siguiente | Python Tutor, JavaWiz |
| M6 | Variables: tipo, valor, anterior → nuevo, "sin inicializar", entrada y salida de alcance | Sorva; errores #5, #16, #17 |
| M7 | Condición contextual: sustitución, rama ✓/✗ (la otra se atenúa, nunca se oculta), cadena `else if`, `switch` con caída y `default` | Requisito central; errores #3, #8–#11, #15 |
| M8 | Contador de vueltas (también anidado) y fin de ciclo | Errores #6, #7 |
| M9 | Consola (D7): mensaje y entrada en el mismo renglón; entrada con otro color **y** un rasgo no cromático; `System.err` en rojo; sin mensajes del IDE | 04 §4; D7 |
| M10 | `Scanner` interactivo (se detiene y espera) + entrada preparada (se consume primero); punto decimal (D5) y opción "coma" (§4) | 01 §5.1; D5 |
| M11 | **Búfer de `Scanner`**: franja contextual con lo pendiente del renglón (⏎ visible) | Error #12; ningún antecedente lo muestra (01 §12) |
| M12 | **Prueba de escritorio**: pestaña alterna a Variables; renglón por paso relevante, celda cambiada resaltada, columna de salida | 01 §3; U6 |
| M13 | Explicación en español en cada paso (26 plantillas de 01 §7 + avisos y errores) | 04 §4; PLTutor |
| M14 | Controles: inicio, atrás, adelante, fin, reproducir con velocidad, deslizador "paso X de Y", teclado | JavaWiz |
| M15 | Límite de pasos y aviso de ciclo desbocado **con datos** ("`contador` siempre valió 1"); Worker terminable | Lección de U6 |
| M16 | Excepciones: `stderr` exacto del JDK 17 + explicación en español + línea | 03 §5 |
| M17 | `Random` reproducible (semilla visible, en el enlace) | 02 §9 |
| M18 | **Predicción ligera (D4):** Sí/No antes de revelar una condición o la continuación de un ciclo; apagada por omisión; interruptor visible y parámetro del enlace | Kumar 2015; D4 |
| M19 | Galería U3–U7: 35 programas del curso + de autoría (D6), origen marcado y una línea "Qué observar" | 01 §8; D6 |
| M20 | Enlace (código, entradas, semilla, nivel, predicción, proyector) en el fragmento `#` —el servidor nunca lo recibe—; si no cabe, descargar/abrir `.java` | 01 §8; 05 §8 |
| M21 | Modo proyector: código ≥ 24 px, controles grandes, disposición 4:3 | 01 §8 |
| M22 | Accesibilidad AA: teclado completo, contraste, nada solo por color, `aria-live` (assertive solo para errores), movimiento reducido, zoom 200 % | 01 §9 |
| M23 | Sin red tras la primera carga (PWA), cero peticiones externas, sin telemetría ni cookies | D1 |

Cambios frente a 01 §10: quedan en MUST la prueba de escritorio y la entrada preparada (01 las dejaba en SHOULD) y el búfer de `Scanner` (01 §12 lo dejaba sin ubicar): bajo costo sobre la traza y alto valor; la entrada preparada además la exigen los enlaces.

- **SHOULD (v1.1):** predicción de valor (texto libre) y de `case`; exportar/imprimir la prueba de escritorio; programas recientes en el navegador; enlace que abre en el paso N; ampliaciones de lenguaje hoy con aviso (`switch` con flecha, `hasNextInt`, `System.exit`).
- **COULD (v2+):** rol automático de variable (contador/acumulador/bandera, error #18); diagrama de flujo y pseudocódigo sincronizados (las tres representaciones del curso); aciertos de predicción de la sesión; *sandbox* de expresiones; vista de objetos; integración con AprendiendoJava (el motor queda como librería).

## 4. Fidelidad como requisito de producto

- **Oráculo:** Temurin 17.0.18 de la máquina del PO (macOS aarch64, D3), con `-Duser.language=es -Duser.country=MX -Dfile.encoding=UTF-8` y `javac -encoding UTF-8`; `stdout` y `stderr` capturados en binario, con *timeout* por proceso. CI genera y compara en macOS arm64; un trabajo en x86_64 solo **mide** diferencias de plataforma. **[verificado hoy]** Los 34 `.salida.txt` de `corpus-candidato/` que terminan difieren del JDK real solo porque perdieron el `\n` final: se regeneran; ningún golden se escribe a mano.
- **Enteros y casts:** `int` de 32 bits con vuelta, `long` de 64, `char` sin signo de 16, promociones del JLS; `double→int/long` satura, `long→int` da la vuelta (`(int)(long)1e30 = -1`); `MIN_VALUE / -1` sin excepción.
- **`Double.toString`** (y `println`, concatenación, `String.valueOf`): dígitos más cortos (ECMA-262 fija su longitud; el último dígito se verifica en los tres motores, C17) + reglas de formato de Java + **ruta de enteros en [2^53, 2^63)**, implementada por comportamiento, sin copiar código de OpenJDK (GPLv2+CE). **[verificado hoy]** No son "todos los dígitos exactos": Java quita k dígitos finales del entero con HALF_UP (k = 0 con exponente binario 53–57, 1 con 58–60, 2 con 61–62); la regla reproduce 122/122 valores de la banda, pero el conjunto de 45 293 solo trae 122 ahí → se agrega un conjunto denso. Residual único documentado: bits `0x453d04ffce09b504`, Java imprime `3.5082457001091195E25` y V8 `…196E25`, igual de corto pero más cercano al valor exacto; 1 de 45 293; sin detector barato en ejecución (el último dígito es ambiguo en el 37 % de los dobles y Java coincide con el más corto en todos menos ese).
- **`printf`/`String.format`:** HALF_UP sobre esos mismos dígitos + relleno con ceros (`%.2f` de 2.675 → `2.68`), nunca `toFixed`. **[verificado hoy]** 30 000/30 000 casos adicionales (ocho precisiones entre 0 y 20, incluida la banda).
- **`Math.pow`:** semántica fdlibm (= `StrictMath.pow`; en la máquina de referencia `Math.pow` coincide con `StrictMath.pow` en 26 336/26 336 pares). **[verificado hoy]** El `Math.pow` de V8 difiere en 1 083 de 26 336 pares (4.1 %), incluidos casos de salón: `Math.pow(10, -4)` da `1.0E-4` en Java y `9.999999999999999E-5` en V8. Se porta del fdlibm original en C (aviso permisivo de Sun), nunca de OpenJDK. El motor no usa funciones de JS que ECMA-262 deja "aproximadas por la implementación".
- **`Random`:** LCG de 48 bits con BigInt, idéntico al JDK (puerto validado en 02 §9).
- **`Scanner`:** tokens y renglones como Java (`nextInt()` deja el fin de renglón), `InputMismatchException` no consume el token, `nextBoolean` sin distinguir mayúsculas; punto decimal `es_MX` (D5). La opción "coma" emula una JVM `es_ES` **completa** —`Scanner` y también `printf` con coma— validada con `-Duser.country=ES`: es lo único fiel (P2).
- **`String`:** identidad de objeto; literales y constantes de compilación (`final` con inicializador constante) comparten instancia; lo creado al ejecutar es nuevo → `sc.next() == "si"` da `false`.
- **Excepciones:** `stderr` idéntico al JDK 17, incluidos los marcos de `java.base` (datos tomados del JDK de referencia), atenuados en pantalla; el marco del alumno lleva a su línea.

## 5. Capacidades (contrato con `sdd-spec`)

`openspec/specs/` está vacío: todas son nuevas.

### New Capabilities
- `subconjunto-java`: lista cerrada §2 y comportamiento del aviso.
- `compilacion-en-espanol`: análisis estático (tipos, alcance, asignación definitiva, alcanzabilidad), primer error en español, veredicto igual a javac, error de arranque de `main`.
- `motor-de-ejecucion`: semántica, pasos Normal/Detallado, traza, límite de pasos, excepciones, semillas.
- `biblioteca-java`: números (casts, `Double.toString`, `printf`, `Math`, `Random`), texto (`String`, `Character`, `Integer`/`Double`/`Long`), entrada (`Scanner`, `es_MX`/`es_ES`) y salida (`System.out`/`err`).
- `visualizador-paso-a-paso`: M1–M18 (paneles, controles, explicaciones, predicción).
- `uso-en-aula`: galería, enlaces, modo proyector.
- `plataforma-web`: sin red, accesibilidad, rendimiento, navegadores, despliegue.
- `verificacion-diferencial`: oráculo, goldens, conjuntos de propiedades, mutantes, CI.

### Modified Capabilities
- Ninguna.

## 6. Enfoque

Hexagonal (05 §9): `motor/` en TypeScript puro sin DOM —lexer → parser recursive-descent + Pratt escrito a mano que también **reconoce** lo fuera de alcance para avisar → análisis semántico → intérprete de AST con generadores que emite pasos como datos → traza por deltas con puntos de control—; `worker/` con protocolo `postMessage` y pausa para la entrada (sin `SharedArrayBuffer`: GitHub Pages no da COOP/COEP); `ui/` (React + CodeMirror 6) arma el texto en español desde los datos del paso. Valores: primitivos de JS con el tipo estático del AST; solo `String` lleva envoltura de identidad.

| Lote | Contenido | Criterios | Sesiones (estim.) |
|---|---|---|---|
| 0 Cimientos | Node 22, TS 6.0.x, CI, arnés y regeneración de goldens, Pages + PWA mínima | C12 | 1–2 |
| 1 Lenguaje | Parser, reconocimiento de lo fuera de alcance, análisis semántico, errores en español | C7, C8 | 3–4 |
| 2 Ejecución y biblioteca | Intérprete Normal, números, texto, `Scanner`, consola, excepciones, límite | C1, C3–C6, C17 | 4–5 |
| 3 Traza y Worker | Deltas, puntos de control, protocolo, terminación | C10, C11 | 1–2 |
| 4 Visualizador | M1–M3, M5–M17 | C9, C14 | 3–4 |
| 5 Aula | M18–M23, auditoría AA → **validación en aula** | C2, C12–C16, C19, C20 | 2–3 |
| 6 Paso Detallado | M4 y sus explicaciones → **publicación v1** | C9, C11 | 2–3 |

El Detallado va al final por ser lo más caro (01 §12); desde el lote 2 la traza guarda el árbol de evaluación y el Normal ya muestra la sustitución completa, así la validación de U5–U6 no espera al Detallado.

## 7. Áreas afectadas (greenfield)

| Área | Impacto | Descripción |
|---|---|---|
| `motor/` | Nuevo | Lexer, parser, semántico, intérprete, biblioteca, traza |
| `worker/` | Nuevo | Adaptador `postMessage` |
| `ui/` | Nuevo | React + CodeMirror 6 |
| `corpus/` | Nuevo | Programas, entradas y goldens del JDK (semilla: `corpus-candidato/`, `experimentos/`) |
| Herramientas del arnés (ruta en design) | Nuevo | Generador de goldens, conjuntos de propiedades, mutantes |
| `.github/workflows/` | Nuevo | CI (macOS arm64 + medición x86_64) y despliegue |
| Raíz (`package.json`, `tsconfig`, `vite.config`, `.nvmrc`, ESLint) | Nuevo | TS 6.0.x estricto, Node 22; regla que impide DOM/React en `motor/` |
| `openspec/specs/*` | Nuevo | Las 8 capacidades |

## 8. Criterios de éxito (medibles)

| # | Criterio |
|---|---|
| C1 | 34/34 programas de `corpus-candidato/` que terminan: `stdout`/`stderr` idénticos byte a byte al oráculo con sus entradas. `u6-ciclo-infinito-demo`: se detiene por el límite, cada renglón es `Vuelta número 1` y aparece el aviso. |
| C2 | Galería de autoría (D6): 100 % idéntica al oráculo; ≥ 1 ejemplo por unidad U3–U7 y por API del alcance (`Math`, `Random` con y sin semilla, `printf`, `String`, `Character`, `long`). |
| C3 | `experimentos/{numeros,texto}`: 100 % idénticos los programas del subconjunto; los demás, su aviso específico. Además ≥ 1 000 programas generados dentro del subconjunto (fast-check, trabajo nocturno): salida idéntica. 0 salidas inventadas. |
| C4 | `Double.toString`: 100 % en cada conjunto denso generado por el JDK, por clase — banda de enteros [2^53, 2^63) (≥ 1 000 por exponente 53–62, con empates), empates en el borde de redondeo (149 985 decimales cortos), las 2 098 potencias de dos y vecinos, y subnormales (20 104) —, con el aviso en ejecución «No disponible» en vez de cualquier valor no verificado donde una clase no se caracterice al 100 %; más el residual ya documentado de 45 292/45 293 en el conjunto original de salón. |
| C5 | `printf`/`String.format`: 100 % en ≥ 30 000 dobles × precisiones 0–20, `%d` con `int`/`long`, anchos y banderas del alcance, en `es_MX` y `es_ES`. |
| C6 | `Random` 100 % (≥ 8 semillas × todos los métodos del alcance × 1 000 valores); `Math.pow` 100 % en ≥ 26 000 pares; `Character` 100 % en los 65 536 `char`. |
| C7 | 37/37 casos del catálogo en el subconjunto detectados antes de ejecutar: 36 rechazados con el primer error **de la primera pasada que falla** (léxico+sintaxis → atribución → alcanzabilidad → asignación definitiva), igual que javac, en su línea y con el mensaje del catálogo — nunca el primer error por posición en el texto —, y `main` sin `static` como error al arrancar (pasada de arranque, aparte de las cuatro de compilación). Veredicto igual a javac en el 100 % de ≥ 2 000 mutantes de un solo cambio; línea del primer error —el de la primera pasada que falla— igual en ≥ 95 % de ellos. |
| C8 | 100 % de las muestras de §2.2 (una por construcción) → su aviso antes de ejecutar; 0 pasos ejecutados; 0 errores de sintaxis engañosos. |
| C9 | 100 % de los pasos de todas las trazas de la galería (Normal y Detallado) con explicación sin marcadores sin resolver; cada error conceptual #1–#17 (01 §6) con ≥ 1 ejemplo y un paso que lo hace visible, revisado por el PO. |
| C10 | Con ≥ 5 ciclos desbocados distintos, la interfaz responde al teclado en ≤ 100 ms (p95) y el aviso sale en ≤ 2 s. |
| C11 | 100 000 pasos Normal en ≤ 1 s; cambiar de paso actualiza todo en ≤ 100 ms (p95); saltar a cualquier paso de una traza de 100 000 en ≤ 200 ms. |
| C12 | Tras la primera visita, sin red (Playwright offline): carga, ejecuta toda la galería y abre enlaces; 0 peticiones a otros orígenes, siempre. |
| C13 | Primera visita ≤ 500 KB comprimidos; interactiva desde caché en ≤ 2 s. |
| C14 | Todos los flujos MUST solo con teclado (E2E); 0 violaciones AA graves o críticas (axe-core) en pantallas principales y modo proyector; ningún estado solo por color. |
| C15 | Enlace de ida y vuelta exacto para el 100 % de la galería; el más largo ≤ 2 000 caracteres (**[verificado hoy]** el mayor, U7 con entradas, comprime a 1 101). |
| C16 | Modo proyector: código ≥ 24 px; ningún panel se encima ni corta texto a 1024×768 y 1280×720. |
| C17 | Pruebas de fidelidad del motor al 100 % en Chromium, Firefox y WebKit; E2E en Chromium y Firefox. |
| C18 | 0 textos de interfaz fuera del catálogo es-MX (regla de lint) y revisión del PO sin observaciones bloqueantes; lo que imprime Java se muestra tal cual. |
| C19 | Predicción (D4): apagada al abrir sin parámetro; activada por interruptor o enlace, el 100 % de las condiciones y continuaciones de ciclo de la galería piden Sí/No antes de revelarse (E2E). |
| C20 | El docente usa el visualizador proyectado en una clase real de U5 o U6 sin ayuda técnica (lo reporta el PO). |

Tiempos medidos en Chromium con CPU ×4 en la máquina de referencia (perfil "laptop escolar").

## 9. Fuera de alcance

- Java fuera de U3–U7 (se avisa, §2.2).
- Backend, cuentas, calificaciones, telemetría; ningún dato sale del navegador salvo el enlace que la persona decide compartir.
- Juez automático (vive en AprendiendoJava F3) e integración con AprendiendoJava (el motor queda listo, sin integrarlo).
- Imitar el IDE: proyectos, archivos, paquetes, `run:`/`BUILD SUCCESSFUL`, *breakpoints*.
- Más de un error de compilación; advertencias de javac.
- Teléfonos (objetivo: laptop y proyector); otros idiomas.
- Reproducir diferencias de plataforma del JDK: la verdad es la máquina de referencia (D3).

## 10. Riesgos

| Riesgo | Prob. | Mitigación |
|---|---|---|
| El paso Detallado es lo más caro del motor | Alta | Lote propio al final; árbol de evaluación desde el lote 2 |
| Goldens no reproducibles (sin `\n` final, locale y codificación del CI) | Alta | Regenerar con captura binaria y banderas fijas; CI en macOS arm64; nunca `$(...)` |
| Programas desbocados (la lección de U6 trae uno) | Alta | Límite cooperativo + `worker.terminate()` |
| Divergencia sutil motor ↔ JDK | Media | Arnés en CI, conjuntos de propiedades, mutantes, tres motores de JS |
| `Math.pow` difiere entre motores de JS y quizá en x86_64 (laptops Windows), sin medir | Media | fdlibm en TS; medir en CI x86_64; escalar al PO si difiere en valores de salón |
| Tabla de la banda de enteros validada con solo 122 valores | Media | Conjunto denso (C4) |
| El parser debe reconocer lo que rechaza | Media | Una muestra por construcción como prueba (C8) |
| Caché de PWA vieja en el aula | Media | Aviso de versión nueva, versión visible, búsqueda de actualización al cargar |
| Presión de alcance por código de internet | Media | Lista cerrada + avisos + backlog v1.x |
| Licencias (OpenJDK es GPLv2+CE) | Media | Implementar por comportamiento; fdlibm original con su aviso; revisar licencias de dependencias |
| TS 7 rompe typescript-eslint; vitest 5 exige Node 22 | Baja | TS 6.0.x, `.nvmrc` 22.23.1 |
| `Character`: JDK 17 usa Unicode 13 y los navegadores uno más nuevo | Baja | Prueba en los 65 536 `char` + tabla de excepciones del JDK |
| Contaminación: 02 y 05 citan una "suite de 70 frases" y el proyecto `Distribucion`, ajenos | Baja | Se ignoran; el oráculo es el arnés de este proyecto |
| Consola inferida (D7) | Baja | Ajustable; se revisa en la validación en aula (C20) |

## 11. Plan de reversión

- Cada publicación = etiqueta `vX.Y.Z` + flujo de despliegue de Pages. Revertir = volver a desplegar la etiqueta anterior (ejecución manual del flujo) o `git revert` + push.
- El service worker busca versión al cargar y ofrece recargar; la reversión se publica como versión nueva para que los clientes la tomen.
- Enlaces con formato versionado (`#v=1&…`): una versión que no lo entiende avisa; nunca abre un programa corrupto.
- Sin datos que migrar (no hay backend; preferencias locales con clave versionada).
- Disparador: un resultado distinto al JDK en producción (C1–C6) o reportado por el docente → revertir y corregir empezando por su prueba diferencial.

## 12. Dependencias

- Temurin 17.0.18 (oráculo local) y Temurin 17 en CI (macOS arm64; x86_64 para medir).
- Node 22 LTS, TypeScript 6.0.x. Runtime: `react`, `react-dom`, `@codemirror/*`, `lz-string`. Build: `vite` 8, `vite-plugin-pwa`. Desarrollo: `vitest` 5, Testing Library, Playwright, `fast-check`, `typescript-eslint`, axe-core.
- Repositorio en GitHub con Pages y Actions (P1).
- Semilla del corpus: `exploracion/corpus-candidato/` (35) y `exploracion/experimentos/`.

## 13. Definición de Terminado (cada lote)

1. Completo y funcionando: sin TODO, *mocks* ni "versiones demo" en producción; lo no terminado no se publica o queda tras el aviso "No disponible".
2. TDD estricto: la prueba se escribe antes (RED → GREEN → REFACTOR); cada comportamiento del intérprete con prueba diferencial cuyo golden generó el JDK de referencia.
3. `npm test`, lint y `tsc --noEmit` en verde con salidas acotadas (`--reporter=dot`); CI verde, arnés incluido; criterios del lote cumplidos.
4. Textos en español de México real, en el catálogo de textos, con el tono de §1.
5. Accesible (teclado, AA, nada solo por color, `aria-live`, movimiento reducido) en todo lo que el lote agrega.
6. Cero red en tiempo de ejecución; ninguna dependencia nueva sin justificar licencia y peso.
7. `main` desplegable (build de Pages en verde).
8. Conventional commits sin atribución de IA; cada commit con confirmación explícita del usuario.

## 14. Preguntas abiertas para el PO

Las cuatro de la exploración quedaron resueltas (D4–D7). Surgen estas (P2 y P3 las decidió el orquestador el 2026-09-25 y el PO puede revertirlas; P1, P4 y P5 se presentan al PO junto con el plan):

| # | Pregunta | Recomendación por omisión |
|---|---|---|
| P1 | ¿En qué cuenta de GitHub se publica, con qué nombre de repositorio y visibilidad? (El nombre fija la ruta del sitio.) | Repositorio público `VisualizadorJava` en tu cuenta → `https://<usuario>.github.io/VisualizadorJava/`; público también hace gratuitos los minutos de macOS del CI. **Decidida (PO, 2026-09-25): repo público `JorgeZepeda1/VisualizadorJava`.** |
| P2 | La opción "coma" (D5), para ser fiel, emula una JVM `es_ES` completa: `printf` también imprime coma (`3,50`) y `3.5` deja de aceptarse. ¿De acuerdo? | Sí: es lo único fiel; coma en la entrada con punto en `printf` sería un resultado inventado. **Decidida (orquestador): sí, `es_ES` completo en entrada y salida.** |
| P3 | ¿Qué navegadores tienen las laptops del plantel y la del docente? | Chrome/Edge y Firefox en sus dos últimas versiones; Safari con el motor probado (C17) y la interfaz sin garantía. **Decidida (orquestador): Chromium, Firefox y WebKit con motor E interfaz probados en E2E, dos últimas versiones estables; el docente usa Mac.** |
| P4 | ¿Con qué licencia se publica el código? | MIT: compatible con fdlibm (conservando su aviso), React, CodeMirror y lz-string, y con integrarlo después a AprendiendoJava. **Decidida (PO, 2026-09-25): MIT.** |
| P5 | ¿Con qué grupo y en qué semana se hace la validación en aula (C20)? | Al cerrar el lote 5, en una clase de U5 o U6 de tu grupo. **Decidida (PO, 2026-09-25): al cerrar el lote 5.** |

## Conciliación con design.md §12 (2026-09-25)

Cambios de la fase `sdd-spec` para conciliar §8 con los hallazgos de `design.md` §12 (ADR 004, 008, 010; descubrimientos de engram `visualizador-java/descubrimiento/*`):

1. **C4** reformulado: ya no basta el residual único «45 292/45 293» — ese conjunto casi no contiene empates en el borde, potencias de dos ni subnormales, las tres clases donde JDK 17 también se aparta del formato «más corto». Ahora exige 100 % en cada conjunto denso del oráculo por clase (banda de enteros, empates, potencias de dos, subnormales), acepta el aviso en ejecución «No disponible» como resultado válido donde una clase no se caracterice al 100 % (nunca un valor no verificado, D2), y conserva el residual de 45 292/45 293 del conjunto de salón original.
2. **C7** reformulado: precisa que «el primer error» es el de la **primera pasada que falla** (léxico+sintaxis → atribución → alcanzabilidad → asignación definitiva), nunca el primero por posición en el texto — la lectura anterior contradice a javac en los casos verificados en diseño (p. ej. un error de atribución en una línea posterior oculta uno de asignación definitiva en una línea anterior; uno de alcanzabilidad oculta uno de asignación definitiva anterior).
