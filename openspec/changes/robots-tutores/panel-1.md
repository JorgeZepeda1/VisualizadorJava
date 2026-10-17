# Panel de expertos 1: pantalla actual y plan de los robots

Fecha: 2026-10-17. Revisaron en paralelo el diseñador de experiencia (`disenador-ux`), el maestro experto en enseñanza (`maestro-pedagogo`) y el experto en Java (`experto-java`). Material: la pantalla de los hitos 1 y 2 en uso real (computadora, celular y proyector) y este plan (`proposal.md`, `design.md`, `tasks.md`, `specs/`). El panel aconseja y el PO decide.

## 1. En qué coinciden los tres

- **La base es buena.** El robot narra con datos reales del motor; la cadena de sustitución (`2 < 1 || 2 > 3 → false`) es el corazón pedagógico y el reto debe construirse sobre ella. El experto en Java confirmó que el motor coincide con el JDK en todos los casos probados: los problemas están en lo que dicen algunos textos, no en el cálculo.
- **El reto delata su respuesta.** Con el catálogo actual, el veredicto correcto es el que se repite en dos de las tres opciones en 8 de 9 retos de ejemplo. Un alumno lo descubre en minutos y deja de predecir. Hay que equilibrar el catálogo (prueba de propiedad: el veredicto correcto queda solo entre 40 % y 60 % de los retos) y, si no se logra, pasar a la forma (C) de PR-2.
- **Las respuestas a PR-1 a PR-5** van en el mismo sentido que el plan, con ajustes (sección 5).
- **Tres temas del libro deben pasar a la primera oleada**: `operadores-logicos`, `entrada-con-scanner` y `division-entera-y-modulo`, porque el revisor y el reto enlazan a ellos desde el principio. El maestro agrega `comparaciones`.

## 2. Errores en la versión publicada (se corrigen sin esperar decisiones)

| # | Qué pasa | Quién lo vio | Corrección |
|---|---|---|---|
| C1 | El narrador dice «`25 / 3`, que da 8.0». En Java `25 / 3` da 8; el 8.0 aparece al guardarlo en un `double`. Igual con `3 / 2` → «1.0», `double d = 5` → «5.0», `char c = 65` → «'A'», `Math.abs(a / b)` → «3.0» | experto-java (E1) | Separar el cálculo de la conversión: «… que da 8. Como `promedio` es `double`, guardo 8.0.» |
| C2 | `x += 2.7` con `x` entero: dice «el lado derecho vale 2.7… guardo 12» sin explicar el 12.7 ni el recorte; `i++ + i` e `i = i++` muestran un valor que no se explicó | experto-java (E6) | Mostrar el valor intermedio en una frase |
| C3 | El texto del error `case` no constante dice «no una variable», pero una variable `final` con valor fijo sí se permite | experto-java (E5) | «Cada `case` necesita un valor que Java conozca antes de ejecutar: un literal o una variable `final` con valor fijo.» |
| C4 | Tras corregir un error de compilación, el globo sigue diciendo el error con la cara de preocupación mientras el editor ya no lo marca; el foco se pierde; axe marca una falla grave de accesibilidad en ese estado | disenador-ux (H6) | El globo pasa a «Cambiaste el programa…», el foco va a la línea del error y se corrige la falla de accesibilidad |
| C5 | La cara «preocupado» se ve enojada justo cuando el alumno se equivoca | disenador-ux (H5) | Cejas de preocupación amable |
| C6 | «✕ Entra al `if`» se lee como «entra» | disenador-ux (H7), maestro (H15) | «✕ No entra al `if`» y «✓ Entra al `if`» |
| C7 | En el paso 0 de un ciclo desbocado el robot ya cuenta el final («`contador` siempre valió 1…»); al final repite «se detuvo» tres veces | maestro (H5) | Intriga en el paso 0 y un solo texto al final |
| C8 | `switch` sin `break`: falta decir que Java no vuelve a comparar | maestro (T5) | «… ejecuta también lo del `case 3`, sin revisar si coincide.» |
| C9 | «Pendiente: ⏎» no se entiende | disenador-ux (H9), maestro (H15) | «Sin leer todavía: ⏎» |

## 3. Decisiones que tocan al PO

1. **Un robot con tres papeles o tres robots.** El diseñador recomienda uno solo con accesorio y rótulo por papel (lupa al revisar, «?» en el reto, libro en los temas): al principiante le importa qué actividad hace, no quién habla, y tres personajes compiten por la atención. Tres robots son más literales y coleccionables.
2. **En qué unidad estará tu grupo** cuando salgan los robots. De eso dependen el orden de R1 y R2 (si el grupo va en U5–U6, el maestro sugiere adelantar el reto) y qué temas del libro van primero.
3. **Mejorar la pantalla antes del reto.** El diseñador midió que el reto no cabe en proyector ni en celular con la distribución actual, y que un alumno nuevo no sabe por dónde empezar. Propone, antes de R2: saludo del robot con tres puertas («Leer un tema», «Ver un ejemplo paso a paso», «Probar mi programa»), «Anterior/Siguiente» debajo del globo, y el modo proyector (tarea 5.5).
4. **Publicar las correcciones de la sección 2** como versión `v0.3.1` cuando estén verificadas.

**Respuestas del PO (2026-10-17):**

1. **Tres robots distintos**, cada uno con su personaje. Del informe del diseñador quedan como requisitos: un solo robot habla a la vez, cada uno se reconoce por su forma y su accesorio además del color, y quien habla aparece siempre en el mismo lugar.
2. **El grupo estará en U6.** El modo reto con ciclos va primero, y los temas de U6 encabezan la primera oleada del libro, junto con sus requisitos.
3. **Mejorar la pantalla antes del reto:** saludo con tres puertas, Anterior y Siguiente debajo del globo, y modo proyector.
4. **Publicar las correcciones** como `v0.3.1` cuando estén verificadas.

Anexos con el detalle de cada informe: `panel-1-disenador.md`, `panel-1-maestro.md` y `panel-1-java.md`.

## 4. Lo que se adopta por omisión (el PO puede cambiarlo)

- **Voz del robot: «Java revisa…»** en lugar de «Reviso…». El robot es el guía que señala lo que hace la computadora, no la computadora. Evita que el alumno crea que la máquina entiende lo que quiso decir (Pea, 1986).
- **Vocabulario único**: `true`/`false` como código y «vuelta» para los ciclos, en todo el producto.
- **«Trampa de Java»** en vez de «trampa» (en México «hacer trampa» suena a fraude). Sin trampas: «Revisé las 5 trampas de Java que conozco y no encontré ninguna. Eso no garantiza que el programa haga lo que quieres: compruébalo paso a paso.»
- **El libro termina cada tema con «Ponte a prueba» y «Ahora hazlo tú»** (modificar y crear, con la salida esperada del oráculo). Es lo que faltaba de PRIMM: hoy ningún robot pide escribir código.
- **Cada tema empieza por un ejemplo** («¿Qué crees que imprime?»), 400 palabras como meta. 34 temas: se agregan tipos de errores, textos y concatenación, repetir hasta que el usuario quiera y casos de prueba; `constantes` se une a variables. Primera oleada de 20.
- **Retos**: opciones de la forma «consecuencia, porque razón» (≤ 100 caracteres), teclas 1–3 grandes, elegir confirma, desplegable «¿Y las otras opciones?» y el «por qué» con la sustitución del motor. No se pregunta en condiciones constantes (`while (true)`) ni en las que leen del teclado o de `Random` sin valor que mostrar. «Ya entendí este ciclo» silencia también los `if` de adentro y vuelve a preguntar en las dos últimas vueltas, donde vive el error por uno.
- **Revisor**: aviso corto en el paso 0 y explicación completa cuando la trampa se ve en la ejecución. Con el reto encendido, espera a la ejecución en las trampas que caen en una condición, para no arruinar la respuesta. Los programas de demostración traen «después» por omisión.

## 5. Ajustes técnicos al plan (experto-java)

- **Trampa 1**: sus dos formas más comunes (`for (…);` y luego usar `i`, e `if (c); … else`) no compilan, y hoy el mensaje apunta a otra causa («¿La declaraste antes?», «revisa las llaves»). Se enmienda REQ-REV-003 para que el porqué del error diga el hecho: «ese `;` es todo el cuerpo del `for`».
- **Trampa 2**: con literales internados `==` da `true`; el aviso dice «puede dar `false` aunque digan lo mismo». Cubrir también `!=`, donde lo que sorprende es `true`. En el reto, la opción correcta lleva la razón de identidad.
- **Trampa 3**: un grupo que termina en bloque o en `if/else` también cae; usar el análisis de alcanzabilidad que ya existe.
- **Trampa 4**: extender la regla a los ciclos (nombre, edad, nombre, edad: la segunda vuelta truena) y no avisar si la lectura extra se guarda en una variable que nunca se usa (la «basura» que lo arregla).
- **Trampa 5**: la nota de ejecución solo cuando se pierde algo (`a % b != 0`).
- **Distractores**: `otra-etiqueta` debe elegir otro grupo de `case`; quitar `y-revisa-los-dos` por omisión (castiga un razonamiento correcto).
- **Libro**: ningún ejemplo debe salir del subconjunto (por ejemplo, constantes `static final` a nivel de clase, `Math.pow` mientras no se ejecute, `break` con etiqueta).
- **Entrada preparada**: que cada renglón termine en salto de línea, como en NetBeans.
- **Alinear** la spec y el diseño del reto de la línea 72 (difieren).

## 6. Evidencia

- Diseñador: capturas y maqueta del reto en el directorio temporal de la sesión (`panel/disenador/`).
- Experto en Java: unos 70 programas con su salida del JDK 17.0.18 (`panel/java/`).
- Maestro: secuencia por tema y por unidad, catálogo de distractores reescrito y textos exactos (en engram, `panel/robots-tutores/maestro`).
