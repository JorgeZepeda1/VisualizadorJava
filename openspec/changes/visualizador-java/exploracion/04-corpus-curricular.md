# 04 — Corpus curricular: qué Java ven realmente los alumnos de AprendiendoJava

Exploración de solo lectura sobre `/Users/desarrollo/AprendiendoJava` (plataforma hermana) para fijar con datos el alcance del intérprete, la galería de ejemplos y el corpus de pruebas del Visualizador de Java. No se modificó ningún archivo de AprendiendoJava.

**Fuentes revisadas por completo:**
- `docs/01-vision.md`, `docs/02-curriculum.md`
- `plataforma/content/u1/*.md` … `plataforma/content/u7/*.md` — **21 lecciones**, las 21 leídas íntegras (frontmatter + cuerpo)
- `plataforma/prisma/seed.ts` (confirma que el contenido real vive en el frontmatter Markdown, no en el seed)
- Esquemas de actividades (`ejercicio-java.tsx`, `prediccion-salida.tsx`) para entender la forma de `codigo`/`plantilla`/`casos`
- `openspec/specs/*/spec.md` (índice), `plataforma/e2e/*proyecto*.spec.ts`, `plataforma/src/features/proyecto/**` (para el proyecto integrador U7)
- `plataforma/src/app/globals.css`, `plataforma/src/app/layout.tsx`, y un muestreo de clases Tailwind reales en `src/features/**/*.tsx` para las convenciones visuales

Nota de alcance: AprendiendoJava es una plataforma **digital** que complementa una clase presencial ("el curso es presencial asistido: la clase depende hoy de pizarrón, NetBeans y ejercicios sueltos", docs/01-vision.md §1). Este corpus documenta lo que existe **en la plataforma digital**, no necesariamente todo lo que un docente muestra en el pizarrón o en la práctica de NetBeans no capturada aquí. Es la mejor aproximación disponible con datos, no una garantía de exhaustividad absoluta del curso completo.

Se detectó trabajo paralelo de otro explorador de este mismo cambio SDD en `exploracion/experimentos/` (fidelidad JDK 17: `Math`, `printf`, `char`, locale). No se tocó ese directorio.

---

## 1. Inventario de construcciones Java usadas

Frecuencias contadas sobre el cuerpo de las 21 lecciones **y** el código embebido en el frontmatter de las actividades (`codigo:`/`plantilla:` de `PREDICCION_SALIDA` y `EJERCICIO_JAVA`) — es decir, todo el Java que un alumno efectivamente lee o escribe en la plataforma.

### Tipos y literales

| Construcción | Unidad que la introduce | Frecuencia real | Nota |
|---|---|---|---|
| `int` | U3 | Muy alta (~20 programas/fragmentos) | El tipo por defecto para cualquier cantidad entera |
| `double` | U3 | Alta (~10) | Dinero, medidas, promedios |
| `boolean` | U3 | Alta (~10) | Banderas, resultados de comparaciones |
| `String` | U3 | Alta (~8) | Nombres, mensajes, concatenación con `+` |
| `char` | U3 | **1 sola vez** (tabla de U3, `char grupo = 'B';`) | Se enseña pero casi no se ejercita: ninguna lección U4–U7 vuelve a usar `char` en código ejecutable |
| `final` (constantes) | U3 | **1 sola vez** (`final double IVA = 0.16;`) | Se enseña y nunca reaparece en ninguna actividad ni ejemplo posterior |
| Literales enteros/decimales/booleanos/String | U3 | Constante en todo el corpus | — |
| Literal `char` (`'B'`) | U3 | 1 vez | Mismo caso que arriba |

### Operadores

| Operador | Unidad | Frecuencia | Nota |
|---|---|---|---|
| `+ - * /` | U4 | Muy alta | `/` es el que más confusión genera (entera vs. decimal); es el eje de la lección |
| `%` | U4 | Alta | Paridad, cociente/residuo, "vueltos" |
| `== < > <= >=` | U4 | Alta | — |
| `!=` | U4 (tabla) | **0 en código real** | Se enseña en la tabla comparativa; ningún ejemplo ni actividad lo usa en un fragmento ejecutable |
| `&& \|\|` | U4 | Media (ambos aparecen en ejemplos completos y en la actividad de predicción) | — |
| `!` (negación) | U4 (tabla) | **0 en código real** | Mismo patrón que `!=`: se enseña, nunca se ejercita en código |
| `=` (asignación) vs `==` | U4/U5 | Se enseña explícitamente como error clásico | Aparece como ejemplo de error de compilación intencional |
| `++` | U6 | Media (encabezados `for`) | `--` se **menciona en prosa** ("Existe también `--`...") pero nunca aparece en código |
| Casting `(int)` | U4 | Baja pero explícita (2 ocurrencias) | Siempre trunca, nunca redondea — remarcado como "trampa" en el propio texto |
| Precedencia / paréntesis | U4 | Explícita, con ejemplos numéricos concretos | PEMDAS extendido a relacionales/lógicos |

### Sentencias de control

| Sentencia | Unidad | Frecuencia | Nota |
|---|---|---|---|
| `if` / `if-else` | U5 | Alta | — |
| `else if` (escalera) | U5 | Media, con un ejemplo explícito de **bug por orden incorrecto** | Muy valioso para el visualizador: mismo código, dos órdenes, resultado distinto |
| `if` anidado | U5 | 1 ejemplo completo (licencia de conducir) | — |
| `switch` / `case` / `default` / `break` | U5 | Media | Incluye un ejemplo **intencional de fall-through sin `break`** (día de la semana) |
| `while` | U6 | Alta | Incluye ejemplo **intencional de ciclo infinito** (falta el incremento) |
| `do-while` | U6 | 1 ejemplo completo (validación de entrada positiva) | — |
| `for` | U6 | Alta | Incluye ejemplo explícito de **error "por uno"** (`<` vs `<=`) |
| Ciclos anidados | U6 | 1 ejemplo (tabla de multiplicar 3×3) | — |
| Contador / acumulador / bandera | U6 | Formalizados como patrones con nombre propio | Regla explícita: "el acumulador SIEMPRE se inicializa en 0 antes del ciclo" |

### Llamadas de biblioteca

| Llamada | Frecuencia real | Nota |
|---|---|---|
| `new Scanner(System.in)` | En todo programa que lee datos | — |
| `.nextInt()` | 7 | El método de lectura más usado |
| `.nextDouble()` | 5 | — |
| `.nextLine()` | 1 (ejemplo "Saludo") | — |
| `.nextBoolean()` | 1 (`VerificarAcceso`) | Notable: le pide al alumno teclear literalmente `true`/`false` — el intérprete debe soportar ese método aunque sea poco común en cursos reales |
| `.next()` | **0** | Aparece solo en la tabla comparativa de métodos de Scanner (U3), nunca en código |
| `System.out.println` | 54 | Dominante |
| `System.out.print` | 15 | **Convención exclusiva**: siempre y solo para el mensaje que antecede a un `Scanner` (ver §4) |
| `System.out.printf` / `String.format` | **0** | Cero apariciones en todo el currículo, pese a estar en el alcance v1 acordado |
| `Math.*` (cualquier método) | **0** | Cero apariciones — ver §2 |
| `Random` (cualquier uso) | **0** | Cero apariciones — ver §2 |
| Métodos de `String` (`.equals`, `.length`, `.charAt`, `.substring`, `.toUpperCase`, `.compareTo`, `.trim`...) | **0 en código**; 1 mención en prosa (retroalimentación de un quiz explicando por qué un `String` necesita `.equals()` para compararse, U5) | El alumno LEE sobre `.equals()` pero nunca lo escribe ni lo ejecuta |
| `Character.*` | **0** | — |
| `Integer.parseInt` / `Double.parseDouble` | **0** | No hace falta: `Scanner` siempre lee con el método tipado correcto |

### Catálogo de actividades evaluables (contexto, no son "código" per se)

| Tipo de actividad | Ocurrencias en U1–U7 | ¿Contiene Java ejecutable? |
|---|---|---|
| Quiz (`MULTIPLE`/`TRUE_FALSE`/`SHORT`) | 67 preguntas | No (texto sobre Java) |
| `EJERCICIO_JAVA` (juez automático) | **4** (todas incluidas en el corpus) | Sí — plantilla + casos de prueba |
| `PREDICCION_SALIDA` | **3** (todas incluidas en el corpus) | Sí — fragmento + salida esperada |
| `PARSONS` (ordenar líneas) | 2 | Fragmentos de 2-3 líneas, no programas completos (no se incluyeron como archivos aparte; su contenido ya está cubierto por otros ejemplos) |
| `COMPLETAR_PSEUDOCODIGO` | 2 | No — es pseudocódigo, no Java |
| `DIAGRAMA_FLUJO` | 3 | No — construcción de diagrama, no código |

El corpus candidato (§3) incluye **el 100% de las actividades `EJERCICIO_JAVA` y `PREDICCION_SALIDA` que existen hoy en la plataforma** — no es una muestra, es el universo completo.

---

## 2. Construcciones FUERA del subconjunto U3–U7 (decisión ya tomada)

Búsqueda exhaustiva (código Y prosa/quizzes) en las 21 lecciones completas. Resultado: **cero ocurrencias** de todas las siguientes, ni una sola vez, ni siquiera como opción incorrecta de un quiz o mención de "esto lo verás más adelante":

| Construcción | Ocurrencias (código) | Ocurrencias (prosa/quiz) | Dónde se buscó |
|---|---|---|---|
| Arreglos (`[]`, `new T[]`) | 0 (el único `[]` en todo el corpus es el obligatorio `String[] args`) | 0 | u1–u7 completos |
| Métodos propios (`static` distinto de `main`) | 0 | 0 | u1–u7 completos |
| Clases propias adicionales (más de una clase por programa) | 0 | 0 | u1–u7 completos |
| `try` / `catch` / excepciones | 0 | 0 (la única coincidencia de "excepción" es la palabra suelta en una opción de quiz no relacionada) | u1–u7 completos |
| `JOptionPane` | 0 | 0 | u1–u7 completos |
| Recursividad | 0 | 0 | u1–u7 completos |
| Colecciones (`ArrayList`, `List<>`, etc.) | 0 | 0 | u1–u7 completos |
| POO (herencia, interfaces, polimorfismo) | 0 | 0 | u1–u7 completos |
| `Math.*` | 0 | 0 | u1–u7 completos |
| `Random` | 0 | 0 | u1–u7 completos |

**Lectura para el alcance del intérprete:** el subconjunto U3–U7 que decidió el dueño de producto (int/double/boolean/char/String, if/switch, while/do-while/for, Scanner, operadores, `Math`, `Random`) es **más amplio que el currículo digital real**. Todo lo de la columna izquierda de la tabla de arriba puede rechazarse con el aviso claro ya decidido (nunca inventar resultado) con **certeza total** de que ningún ejercicio real lo necesita. `Math` y `Random`, en cambio, están en el acuerdo de alcance pero **no tienen NINGÚN ejemplo real que los ejercite hoy** — es una brecha de cobertura, no una construcción prohibida (ver conclusión 5).

---

## 3. Galería / corpus candidato — 35 programas

Ruta: `/Users/desarrollo/VisualizadorJava/openspec/changes/visualizador-java/exploracion/corpus-candidato/`. Convención de nombres: `uN-descripcion.java`, con `uN-descripcion.entrada.txt` hermano cuando el programa lee de `Scanner`, y `uN-descripcion.salida.txt` con la salida REAL capturada por el JDK 17 (§6) en todos los casos.

**Nota técnica sobre nombres de clase:** Java exige que un archivo con una clase `public` se llame exactamente como la clase. Para respetar a la vez (a) la convención de nombres `uN-descripcion.java` pedida y (b) el nombre de clase original de la plataforma (sin alterarlo), la verificación de compilación copia cada archivo a una carpeta temporal con el nombre de su propia clase pública antes de invocar `javac`. El archivo dentro del repo conserva siempre el nombre `uN-descripcion.java`; la clase adentro nunca se modificó respecto al original.

**Estado:** `íntegro` = copiado verbatim de un "ejemplo completo" de la lección. `completado` = la lección lo muestra como fragmento suelto (sin `class`/`main`, o sin `print`); se envolvió con lo mínimo necesario para compilar, sin agregar lógica nueva. `solución` = la actividad `EJERCICIO_JAVA` solo trae plantilla con `TODO` + casos de prueba; se escribió la solución que satisface los 3 casos documentados. `proyecto completado` = U7 no trae código, solo una especificación muy detallada (menú, 4 opciones, reglas exactas); se implementó siguiendo esa especificación al pie de la letra.

| # | Archivo | Unidad | Origen (ruta en AprendiendoJava) | Descripción | Entrada | Estado |
|---|---|---|---|---|---|---|
| 1 | `u3-hola-mundo.java` | U3 | `content/u3/01-tu-primer-programa-java.md` (clase `MiPrograma`) | Estructura mínima de un programa Java | — | íntegro |
| 2 | `u3-bienvenida.java` | U3 | `content/u3/01-tu-primer-programa-java.md` (clase `Bienvenida`) | Traducción de un pseudocódigo de U2 a Java | — | íntegro |
| 3 | `u3-area-rectangulo-valores-fijos.java` | U3 | `content/u3/02-variables-y-tipos-de-datos.md` (§"Ejemplo completo") | `double`, concatenación de texto+número con `+` | — | íntegro |
| 4 | `u3-tipos-basicos-y-constantes.java` | U3 | `content/u3/02-variables-y-tipos-de-datos.md` (tabla de tipos + ejemplos de declaración + `final`) | Los 5 tipos básicos, declaración sin inicializar, y una constante `final` | — | completado (fragmentos de la lección envueltos en una sola clase con prints) |
| 5 | `u3-saludo-con-scanner.java` | U3 | `content/u3/03-leer-datos-con-scanner.md` (clase `Saludo`) | `Scanner.nextLine()`, patrón EPS completo | `Carlos` | íntegro |
| 6 | `u3-area-rectangulo-con-scanner.java` | U3 | `content/u3/03-leer-datos-con-scanner.md` (clase `AreaRectangulo`) | Mismo algoritmo que #3, ahora con entrada real | `5.0` / `3.0` | íntegro |
| 7 | `u3-cuadrado-de-un-numero.java` | U3 | `content/u3/03-leer-datos-con-scanner.md`, actividad `EJERCICIO_JAVA` orden 1 | Leer un entero, imprimir su cuadrado | `5` | solución (3 casos documentados verificados: 5→25, y 9→81/12→144 revisados manualmente) |
| 8 | `u4-calculadora-vueltos.java` | U4 | `content/u4/01-operadores-aritmeticos.md` (§"Ejemplo completo") | División entera y módulo combinados en un problema real | `350` | íntegro |
| 9 | `u4-division-entera-y-modulo.java` | U4 | `content/u4/01-operadores-aritmeticos.md` (fragmentos `10/3`, `10.0/3`, `10%3`, paridad) | Contraste explícito entera vs. decimal | — | completado |
| 10 | `u4-operador-logico-and.java` | U4 | `content/u4/02-operadores-relacionales-y-logicos.md` (fragmento `&&`) | `&&` con dos condiciones | — | completado |
| 11 | `u4-verificar-acceso.java` | U4 | `content/u4/02-operadores-relacionales-y-logicos.md` (§"Ejemplo completo") | `\|\|`, `Scanner.nextBoolean()` | `110` / `true` | íntegro |
| 12 | `u4-prediccion-or-logico.java` | U4 | `content/u4/02-operadores-relacionales-y-logicos.md`, actividad `PREDICCION_SALIDA` orden 1 | Predicción de salida oficial de la lección | — | completado (envuelto en clase para compilar) |
| 13 | `u4-precedencia-de-operadores.java` | U4 | `content/u4/03-precedencia-de-operadores.md` (fragmentos PEMDAS) | `2+3*4` vs `(2+3)*4` | — | completado |
| 14 | `u4-prediccion-precedencia.java` | U4 | `content/u4/03-precedencia-de-operadores.md`, actividad `PREDICCION_SALIDA` orden 1 | Predicción de salida oficial de la lección | — | completado |
| 15 | `u4-casting-basico.java` | U4 | `content/u4/03-precedencia-de-operadores.md` (fragmento de casting) | `(int)` trunca, no redondea | — | completado |
| 16 | `u4-calificacion-final.java` | U4 | `content/u4/03-precedencia-de-operadores.md` (§"Ejemplo completo") | Casting + paréntesis explícitos + boolean derivado | — | íntegro |
| 17 | `u4-cociente-residuo.java` | U4 | `content/u4/01-operadores-aritmeticos.md`, actividad `EJERCICIO_JAVA` orden 1 | Cociente y residuo de dos enteros leídos | `17` / `5` | solución (3 casos verificados) |
| 18 | `u5-if-else-verificar-voto.java` | U5 | `content/u5/01-if-else.md` (§"Las tres representaciones") | `if-else` con `Scanner`, espejo del pseudocódigo de la misma lección | `17` | íntegro |
| 19 | `u5-escalera-else-if-correcta.java` | U5 | `content/u5/02-else-if-y-anidados.md` (fragmento de escalera) | Escalera `else if` bien ordenada (95→"B" con calif=85) | — | completado |
| 20 | `u5-escalera-else-if-orden-incorrecto.java` | U5 | `content/u5/02-else-if-y-anidados.md` (fragmento "INCORRECTO") | Mismo problema, orden invertido → bug real (95 da "C") | — | completado |
| 21 | `u5-decision-anidada-licencia.java` | U5 | `content/u5/02-else-if-y-anidados.md` (fragmento de anidamiento) | `if` dentro de `if`, dependencia real entre condiciones | — | completado |
| 22 | `u5-switch-menu-calculadora.java` | U5 | `content/u5/03-switch.md` (§"Ejemplo completo") | `switch` con `break`, `Scanner` doble | `1` / `10` / `5` | íntegro |
| 23 | `u5-switch-sin-break-fallthrough.java` | U5 | `content/u5/03-switch.md` (fragmento de fall-through) | `switch` SIN `break` — cae por 3 casos | — | completado |
| 24 | `u5-par-o-impar.java` | U5 | `content/u5/04-practica-par-o-impar.md`, actividad `EJERCICIO_JAVA` orden 1 | `if-else` + `%`, comparación normalizada | `8` | solución (3 casos verificados) |
| 25 | `u6-pedir-numero-positivo.java` | U6 | `content/u6/01-while-y-do-while.md` (§"Ejemplo completo") | `do-while` para validar entrada, se ejecuta ≥1 vez | `-3`/`0`/`7` | íntegro |
| 26 | `u6-prediccion-while-no-ejecuta.java` | U6 | `content/u6/01-while-y-do-while.md`, actividad `PREDICCION_SALIDA` orden 1 | `while` cuya condición ya es falsa desde el inicio (0 vueltas) | — | completado |
| 27 | `u6-ciclo-infinito-demo.java` | U6 | `content/u6/01-while-y-do-while.md` (fragmento "el error más peligroso") | Ciclo infinito intencional (falta el incremento) | — | completado — **ver nota especial en §6** |
| 28 | `u6-tabla-de-multiplicar.java` | U6 | `content/u6/02-for.md` (§"Ejemplo completo") | `for` clásico, tabla de multiplicar | `7` | íntegro |
| 29 | `u6-error-por-uno.java` | U6 | `content/u6/02-for.md` (fragmento "error por uno") | Compara 3 variantes de encabezado `for`, cuenta vueltas reales | — | completado |
| 30 | `u6-contador-de-pares.java` | U6 | `content/u6/03-contadores-acumuladores-banderas.md` (fragmento de contador) | Patrón contador dentro de `for`+`if` | — | completado |
| 31 | `u6-acumulador-promedio-calificaciones.java` | U6 | `content/u6/03-contadores-acumuladores-banderas.md` (fragmento de acumulador) | Patrón acumulador con `Scanner` dentro de `for` | `8`/`9`/`7`/`10`/`6` | completado |
| 32 | `u6-bandera-numero-negativo.java` | U6 | `content/u6/03-contadores-acumuladores-banderas.md` (fragmento de bandera) | Patrón bandera booleana con `Scanner` dentro de `for` | `3`/`5`/`-2`/`8`/`1` | completado |
| 33 | `u6-ciclos-anidados-tabla.java` | U6 | `content/u6/03-contadores-acumuladores-banderas.md` (fragmento de ciclos anidados) | `for` dentro de `for`, tabla 3×3 | — | completado |
| 34 | `u6-suma-1-a-n.java` | U6 | `content/u6/03-contadores-acumuladores-banderas.md`, actividad `EJERCICIO_JAVA` orden 2 | `for` + acumulador, suma 1..N | `5` | solución (3 casos verificados) |
| 35 | `u7-proyecto-cajero-automatico.java` | U7 | `content/u7/01-proyecto-cajero.md` (especificación completa del proyecto integrador) | Combina TODO el curso: `while`+bandera, `switch`, `Scanner`, acumulador, dos casos especiales | secuencia de 9 líneas (ver `.entrada.txt`) | **proyecto completado** — sin código fuente en la plataforma, implementado siguiendo la especificación línea por línea (saldo inicial 1000, 4 opciones, "Fondos insuficientes", "Opción no válida") |

---

## 4. Convenciones reales del curso (para que el visualizador se sienta familiar)

- **Identificadores en español siempre**: `edad`, `saldo`, `precio`, `calificacion`, `contador`, `suma`, `bandera`, `teclado`, `esPar`, `puedeEntrar`, `tieneLicencia`. Ni un solo identificador en inglés en todo el corpus (aparte de las palabras reservadas de Java y los miembros de la API, que son intocables).
- **Nombre de clase**: PascalCase en español, describe el programa (`AreaRectangulo`, `CalculadoraVueltos`, `VerificarVoto`, `MenuCalculadora`, `Cajero`) en los ejemplos de lección. **Excepción sistemática**: las 4 actividades `EJERCICIO_JAVA` (juez automático) usan siempre y exactamente `public class Main` en su plantilla — es una restricción de la infraestructura del juez (Piston), no una convención pedagógica. El visualizador debería aceptar cualquier nombre de clase, no asumir `Main`.
- **Avisar siempre antes de leer**: regla explícita y evaluada en quiz ("es buena práctica mostrar un mensaje... ANTES de pedir un dato"). Se verificó en el corpus completo: **el 100%** de los `Scanner.nextX()` está precedido por un `System.out.print(...)` (nunca `println`) con el mensaje de lo que se pide. Es la única función de `print` sin salto de línea en todo el currículo — `println` domina en cualquier otro caso.
- **Estructura mínima fija**: siempre `public class Nombre { public static void main(String[] args) { ... } }`, indentación de 4 espacios, llave de apertura en la misma línea, sin `package`, sin más imports que `import java.util.Scanner;` cuando hace falta.
- **Comentarios mínimos**: casi inexistentes en el cuerpo de la lección; en las plantillas de `EJERCICIO_JAVA` siempre hay exactamente un `// TODO: <qué hacer>`.
- **Tono de retroalimentación** (relevante para los mensajes de error/aviso del intérprete, no solo para el juez): nunca un "incorrecto" a secas — la regla está **forzada por esquema Zod** (`retroalimentacion: z.string().min(1, "...nunca solo 'Incorrecto'.")`), no es solo una guía de estilo. El patrón real es: (1) recalcula el valor correcto con números concretos, (2) explica el error típico que produce el resultado equivocado más común, (3) a veces usa una analogía cotidiana (repartir galletas para el módulo, código de vestimenta para `&&`, promoción de descuento para `\|\|`). Esto es exactamente la voz que debería usar el visualizador al explicar por qué el programa hizo lo que hizo.
- **Progresión pedagógica deliberada de "gotchas"**: el currículo real dedica ejemplos completos a errores clásicos — ciclo infinito (U6), error "por uno" (U6), fall-through de `switch` sin `break` (U5), escalera `else if` mal ordenada (U5), truncamiento de casting (U4), confundir `=` con `==` (U4/U5). El visualizador tiene una oportunidad clara: estos son exactamente los momentos donde ver la ejecución paso a paso importa más.

## 5. Convenciones visuales de la plataforma (lo esencial, no es auditoría completa)

- **Sin design system propio todavía**: `globals.css` es el boilerplate por defecto de Next.js + Tailwind v4 (`@import "tailwindcss"`). Solo define `--background`/`--foreground` (claro `#ffffff`/`#171717`, oscuro `#0a0a0a`/`#ededed` vía `prefers-color-scheme`). No hay paleta de marca propia declarada como tokens.
- **Paleta real usada en componentes** (muestreada por frecuencia de clases Tailwind en `src/features/**/*.tsx`): neutro = escala `zinc` de Tailwind (superficies e texto: `bg-zinc-50/100/800/900`, `text-zinc-50/100/600/700`, `border-zinc-200/300/500/600`); acento = `blue` (botones/enlaces, `blue-500`/`blue-700`); error = `red` (`bg-red-50`/`text-red-800` en claro, `bg-red-950`/`text-red-200` en oscuro); éxito = `green`, usado con moderación. **Modo oscuro sistemático**: prácticamente cada clase de color tiene su par `dark:`, nunca es un agregado tardío.
- **Tipografía**: contrario a lo que sugiere el README genérico de Next.js (menciona la fuente Geist), el proyecto **no carga ninguna fuente propia vía `next/font`** — usa una pila de fuentes del sistema (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`) como `--font-sans`, y una pila monoespaciada de sistema como `--font-mono` para código.
- **Componentes**: bordes `rounded-md`, padding `px-3 py-2` / `px-4 py-2`, texto base `text-sm`, código/monoespaciado en `text-xs` dentro de cajas con `border`, `rounded-md`, `overflow-auto`. Los mensajes de estado usan `text-lg font-semibold` (p. ej. "¡Correcto!").
- **Accesibilidad intencional**: `role="status"` para resultados de retroalimentación, `role="alert"` para errores, `<label>` asociado a inputs vía `useId()`.

## 6. Verificación de compilación (JDK 17 real)

Cada uno de los 35 archivos se copió a una carpeta temporal (`mktemp -d`) con el nombre de su clase pública, se compiló con `javac` y se ejecutó con `java` del JDK 17 real (`/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home/bin/`), redirigiendo el `.entrada.txt` correspondiente por stdin cuando existía. Ninguna carpeta temporal ni `.class` quedó en el repo.

**Resultado: 35 de 35 compilan. 34 de 35 corren a término y su salida real quedó guardada en `uN-descripcion.salida.txt`.**

Caso especial — `u6-ciclo-infinito-demo.java`: es un ciclo infinito **intencional** (así lo presenta la propia lección, como ejemplo del error más peligroso de U6). Compiló correctamente; se ejecutó con un temporizador manual (este macOS no tiene `timeout`/`gtimeout`) que lo mató a los 2 segundos. Su `.salida.txt` guarda las primeras líneas reales impresas (`"Vuelta número 1"` repetido, porque el contador nunca se incrementa) más una nota explícita de que se detuvo manualmente. Esto es información valiosa en sí misma: **el intérprete necesita un límite de pasos/tiempo de ejecución** para poder mostrarle al alumno un ciclo infinito sin colgar el navegador — este archivo es el caso de prueba natural para esa función.

Se verificaron manualmente contra los valores documentados en la plataforma (campo `salidaEsperada` de cada `caso`/actividad) los 7 archivos con salida oficial conocida — **coinciden exactamente los 7**:

| Archivo | Esperado (plataforma) | Obtenido (JDK 17 real) |
|---|---|---|
| `u3-cuadrado-de-un-numero.java` (entrada `5`) | `25` | `25` ✓ |
| `u4-cociente-residuo.java` (entrada `17`/`5`) | `3\n2` | `3\n2` ✓ |
| `u5-par-o-impar.java` (entrada `8`) | `Par` | `Par` ✓ |
| `u6-suma-1-a-n.java` (entrada `5`) | `15` | `15` ✓ |
| `u4-prediccion-or-logico.java` | `true` | `true` ✓ |
| `u4-prediccion-precedencia.java` | `9` | `9` ✓ |
| `u6-prediccion-while-no-ejecuta.java` | `Fin` | `Fin` ✓ |

Los 3 casos ocultos de cada `EJERCICIO_JAVA` (documentados en el frontmatter pero no re-ejecutados por separado, ya que la solución es la misma) también se revisaron a mano contra la lógica implementada y son consistentes.

---

## 7. Conclusiones para el alcance del intérprete

1. **El núcleo real y de altísima frecuencia es pequeño y muy parejo**: `int`/`double`/`boolean`/`String` + los 5 aritméticos + los 6 relacionales + `&&`/`\|\|` + `if`/`else if`/`switch` + `while`/`do-while`/`for` + `Scanner` (`nextInt`/`nextDouble`/`nextLine`/`nextBoolean`) + `System.out.print`/`println`. Esto es lo que hay que hacer bien primero, con altísima fidelidad de mensajes de error y de traza paso a paso.
2. **`char` y `final` están en el temario pero casi no en el código**: 1 ocurrencia cada uno en todo el currículo digital. No hay que descuidarlos (siguen en el alcance acordado), pero no son donde vive el riesgo de calidad.
3. **`Math` y `Random` tienen CERO ejemplos reales hoy**, pese a estar en el alcance v1 ya decidido por el PO. No es una razón para sacarlos del alcance (la decisión ya está tomada y son APIs baratas de soportar), pero sí una razón para **no bloquear el lanzamiento en tener ejemplos curriculares de ellos** — cualquier ejemplo de `Math`/`Random` en la galería inicial tendría que marcarse explícitamente como no proveniente del currículo real, o esperar a que el docente aporte material de NetBeans que hoy no está digitalizado. Se optó por NO inventar ejemplos "curriculares" falsos para no contaminar este corpus con datos no verificables.
4. **`printf`/`String.format` y casi todos los métodos de `String`/`Character`/`Integer`/`Double` tampoco tienen ningún ejemplo real** — incluso `printf`, que está nombrado explícitamente en la regla de alcance del producto. Mismo tratamiento que el punto 3: soportarlo porque ya se decidió, pero sin currículo real que lo respalde hoy.
5. **Los "errores clásicos" son primera clase en el currículo, no un extra**: ciclo infinito, error por uno, fall-through de `switch`, escalera `else-if` mal ordenada, truncamiento de casting, confundir `=` con `==`. El currículo les dedica ejemplos completos y preguntas de quiz específicas. Son la razón de ser del producto ("ve si entra o no a if/switch, cada vuelta de un ciclo") y ya están en el corpus (ítems 19, 20, 23, 27, 29 de la tabla).
6. **Ninguna construcción fuera de U3–U7 aparece ni una sola vez**, ni en código ni en prosa: arreglos, métodos propios, clases adicionales, `try`/`catch`, `JOptionPane`, recursividad, colecciones, POO. El aviso "fuera de alcance" del intérprete puede diseñarse con la certeza de que ningún ejercicio legítimo de este curso lo va a disparar por accidente.
7. **Dos convenciones de nombre de clase conviven y el intérprete debe soportar ambas**: nombres descriptivos en español (lecciones) y el fijo `Main` (los 4 ejercicios de juez). No asumir un nombre fijo de clase en ningún punto del intérprete o del parser de "pegar código".
8. **El corpus de 35 programas cubre el 100% de las actividades Java evaluables reales** (las 4 `EJERCICIO_JAVA` + las 3 `PREDICCION_SALIDA` que existen hoy en la plataforma) más los 12 "ejemplos completos" de las lecciones, más 15 fragmentos conceptuales completados fielmente, más el proyecto integrador U7 completo — con salida verificada contra el JDK 17 real, no inferida.

---

## Convención de compilación para reproducir la verificación

```bash
JDK=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home/bin
CLASE=$(grep -oE "public class [A-Za-z0-9_]+" archivo.java | awk '{print $3}')
TMP=$(mktemp -d)
cp archivo.java "$TMP/$CLASE.java"
(cd "$TMP" && "$JDK/javac" "$CLASE.java" && "$JDK/java" "$CLASE" < archivo.entrada.txt)
rm -rf "$TMP"
```
