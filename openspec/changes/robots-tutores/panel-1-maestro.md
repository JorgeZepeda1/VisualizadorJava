# Panel 1, anexo: informe del maestro experto en enseñanza

Resumen fiel del informe de `maestro-pedagogo` (2026-10-17). La propuesta consolidada está en `panel-1.md`.

## 1. Secuencia de aprendizaje

### 1.1 Dentro de cada tema (una sesión de unos 50 min)

| # | Momento | Qué hace el alumno | Robot | Por qué |
|---|---|---|---|---|
| 1 | Enganche y predicción global (3 min) | Lee un programa con una situación cotidiana y anota qué cree que imprime | Paso 0 con el texto T3 | PRIMM empieza por predecir (Naps 2002, Hundhausen 2002) |
| 2 | Ejemplo resuelto narrado (10 min) | Sigue la traza completa, sin reto; el docente pausa y pregunta | Narrador | Ejemplos resueltos antes que problemas (Sweller; Renkl y Atkinson 2003) |
| 3 | La idea, ya con nombre (5–10 min) | Lee el tema | Libro o botón 📖 | Primero el ejemplo y luego la regla (Fyfe 2014) |
| 4 | Práctica guiada (10–15 min) | El mismo programa con otra entrada o un programa hermano, con el reto encendido; en clase, votar, discutir en parejas y volver a votar | Reto | Ejemplo con huecos; instrucción entre pares (Porter 2013) |
| 5 | La trampa del tema (5–10 min) | Predice la salida de un programa con trampa, la ve, se sorprende y la explica | Revisor en modo «después» y sección «Errores típicos» | Conflicto cognitivo: no revelar antes |
| 6 | Modificar (10 min) | «Cambia `i <= 10` por `i < 10`; antes de visualizar, predice cuántas vueltas da» | Libro («Ahora hazlo tú») y revisor | *Modify* de PRIMM (faltaba en el plan) |
| 7 | Crear (tarea) | Programa nuevo + prueba de escritorio en papel, comparada con el visualizador | Revisor; reto opcional | *Make* de PRIMM, meta de U7 |
| 8 | Recuperación (5 min, clase siguiente) | Un reto sobre un programa de la clase anterior | Reto | Práctica de recuperación e intercalada (Roediger y Karpicke 2006; Rohrer 2007) |

### 1.2 Entre unidades: el andamiaje se retira

| Unidad | Robots que entran | Qué todavía no |
|---|---|---|
| U3 | Narrador (asignaciones, panel del búfer de `Scanner`); revisor con el porqué de los errores de compilación; trampa 4 | Reto (no hay condiciones) |
| U4 | Narrador; trampa 5; libro: comparaciones y operadores lógicos (requisito de U5) | Reto en `boolean x = …` |
| U5 | Ciclo completo de 1.1 con reto en todos los `if`/`else if`/`switch`; trampas 1, 2 y 3 | — |
| U6 | Reto con «Ya entendí» y la pregunta de la frontera; trampa 1 en `while`/`for`; prueba de escritorio | — |
| U7 | Revisor encendido; reto apagado por omisión, a elección; libro U7 | — |

En U5 el reto pregunta todo; en U6 el alumno decide cuándo ya entendió, pero la frontera se pregunta siempre; en U7 lo enciende para comprobarse (efecto inverso de la pericia, Kalyuga 2003).

## 2. Hallazgos

- **H1 (grave). Falta el «ahora hazlo tú».** Cada tema cierra con «Ponte a prueba» (2 o 3 predicciones con respuesta del golden, oculta tras «Ver la respuesta») y «Ahora hazlo tú» (1 tarea de modificar y 1 de crear, con «para comprobar: con la entrada 5 debe imprimir…», del golden de una solución de referencia en `corpus/libro/`).
- **H2 (grave). Cansancio en ciclos con `if` adentro.** `u6-contador-de-pares` daría 41 retos; `t09`, 53. «Ya entendí este ciclo» silencia también los retos de adentro hasta que el ciclo termina; vuelve a preguntar en las dos últimas revisiones (penúltima y última; si la traza aún no se conoce por entrada en vivo, sigue silenciado). Texto del botón: «Ya entendí este ciclo», descripción «Dejo de preguntarte aquí y te vuelvo a preguntar cuando el ciclo esté por terminar». No preguntar en condiciones constantes (`while (true)`, `if (MODO_PRUEBA)` con `final`).
- **H3 (alta). Veredicto mayoritario.** En 8 de 9 retos de ejemplo el veredicto repetido es el correcto. Propiedad nueva en `reto-del-corpus.test.ts`: el veredicto correcto queda solo en el 40–60 % de los retos del corpus; preferir familias de concepto con veredicto contrario; si no se alcanza, PR-2 (C).
- **H4 (alta). `y-revisa-los-dos` castiga una razón correcta.** Usarla solo si el lado derecho tiene efecto visible; por omisión, `y-basta-uno`.
- **H5 (alta). Spoiler en el paso 0 del ciclo infinito** (texto T4).
- **H6 (alta).** Pasar a la oleada 1 `comparaciones`, `operadores-logicos`, `entrada-con-scanner` y `division-entera-y-modulo`.
- **H7 (alta).** La spec (REQ-RETO-003) y el diseño (§3.5) no coinciden en el reto de la línea 72; usar la versión del diseño (correcta / símbolo al revés / dos bloques).
- **H8 (media).** El libro va de la regla al ejemplo y es largo: estructura de §5.1, 400 palabras como meta y 550 como máximo, una idea por tema.
- **H9 (media). Dos voces.** Tercera persona en todos los robots («Java revisa», «Java guarda»): el robot es el guía que señala la máquina (superbug de Pea, 1986).
- **H10 (media).** Siempre `true`/`false` como código y siempre «vuelta».
- **H11 (media).** «Trampa de Java». Paso 0: «Revisé tu programa: encontré 3 trampas de Java, en las líneas 6, 8 y 10. Tu programa compila, pero ahí Java hace algo que sorprende a muchos.» Sin trampas: «Revisé las 5 trampas de Java que conozco y no encontré ninguna. Eso no garantiza que el programa haga lo que quieres: compruébalo paso a paso.»
- **H12 (media).** Opciones «consecuencia + porque + razón», ≤ 100 caracteres («Se va al `else`, porque `50 < 36` da `false`»). Con más de 2 partes, resumir («Se salta el `if`: ninguna de las 5 comparaciones da `true`»).
- **H13 (media).** Desplegable «¿Y las otras opciones?» con la refutación de cada distractor; en modo reto la retroalimentación reemplaza a la narración de ese paso.
- **H14 (media).** Preguntas exactas en §3.1.
- **H15 (baja).** «✕ No entra al `if`» / «✓ Entra al `if`»; «Sin leer todavía: ⏎»; quitar «mira el mensaje en rojo».
- **H16 (baja).** Nombre visible «Robot paso a paso» (el programador es el alumno).

## 3. Retos

### 3.1 Preguntas y plantillas

- `if`: «Java va a revisar `{condicion}`. ¿Qué crees que pase?»
- `else if`: «La condición de arriba dio `false`. Ahora Java va a revisar `{condicion}`. ¿Qué crees que pase?»
- `while`/`for`, primera revisión: «Java llega al `{ciclo}` y va a revisar `{condicion}` por primera vez. ¿Qué crees que pase?»
- Revisión k > 1: «Terminó la vuelta {k−1}. Java va a revisar otra vez `{condicion}`. ¿Qué crees que pase?»
- `do-while`: «Terminó la vuelta {k} del `do-while`. Java va a revisar `{condicion}`. ¿Qué crees que pase?»
- `switch`: «El `switch` va a comparar `{expresion}` con sus `case`. ¿A dónde crees que salte?»
- Primera vez que se enciende: «Modo reto: antes de cada condición te pregunto qué crees que pase. No es calificación: si te equivocas, te explico por qué.»
- Acierto: «✔ ¡Eso es! {razón con la sustitución del motor}. {Consecuencia}.»
- Parcial: «◐ Casi. Atinaste en que {consecuencia}. Pero la razón es otra: {regla verdadera}. {dato del motor}.»
- Error: «✖ No es esa. {dato del motor que refuta tu opción}. {por qué la correcta sí}.»

### 3.2 Catálogo de familias

| Familia | Concepción errónea | Decisión | Opción | Retroalimentación |
|---|---|---|---|---|
| frontera | `<` incluye el igual | Mantener | «Da otra vuelta, porque 10 y 10 son iguales y `10 < 10` lo acepta.» | ✖ «`<` quiere decir «menor que», sin el igual. 10 no es menor que 10: son iguales. Por eso `10 < 10` da `false` y el ciclo termina. Para incluir el 10 se escribe `<=`.» |
| revision-anterior | La variable conserva el valor de la vuelta pasada | Mantener (la mejor) | «Da otra vuelta, porque `i` sigue valiendo 5 y `5 <= 5` da `true`.» | ✖ «Al terminar la vuelta 5, el `i++` de la línea 8 cambió `i` de 5 a 6, y eso pasa antes de revisar. Ahora queda `6 <= 5`, que da `false`: el ciclo termina.» |
| valor-anterior | La variable recuerda su valor inicial | Mantener | «Se va al `else`, porque `seEncontroNegativo` vale `false`, como al crearla.» | ✖ «En la línea 12 cambió a `true`. Una variable guarda solo su último valor. Ahora vale `true`, así que entra al `if`.» |
| textos-iguales | `==` compara lo que dicen dos textos | Mantener, sin «objeto» ni «referencia» | «Entra al `if`, porque los dos textos dicen «si».» | ✖ «Con textos, `==` no compara las letras: pregunta si los dos lados son el mismo texto guardado. Es como tener dos hojas que dicen «si»: `==` pregunta si es la misma hoja. Aquí son dos hojas distintas, por eso da `false`. Para comparar lo que dicen, usa `respuesta.equals("si")`.» |
| simbolo-al-reves | Leer `<` como «mayor que» | Mantener | «Entra al `if`, porque `<` pregunta si 50 es mayor que 36, y lo es.» | ✖ «`<` se lee «es menor que»: `50 < 36` pregunta si 50 es menor que 36. No lo es, así que da `false`. Truco: la punta del `<` señala al número que debería ser el más chico.» |
| pieza-volteada | Descuido | Último recurso, ≤ 20 % de los retos | «Entra al `if`, porque `50 > 200` da `true`.» | ✖ «Léelo con los números: ¿50 es mayor que 200? No, es menor. `50 > 200` da `false`.» |
| rango-al-reves (nueva) | Confundir dentro y fuera del rango | Agregar, antes de simbolo-al-reves; veredicto contrario | «Entra al `if`, porque `cantidad` vale 2, que sí está entre 1 y 3.» | ✖ «Esta condición pregunta si `cantidad` está FUERA del rango: menor que 1 o mayor que 3. 2 está dentro, así que ningún lado se cumple y da `false`. Este `if` solo atrapa cantidades no válidas.» |
| o-se-detiene-con-false | Confundir `\|\|` con `&&` | Mantener | «Se salta el `if`: `2 < 1` da `false`, y con `\|\|` eso ya basta.» | ◐ «Casi. Atinaste en que no entra. Pero con `\|\|` un lado `false` no basta: Java revisa el otro, porque todavía podría ser `true`. Revisó `2 > 3`, que también dio `false`, y por eso todo dio `false`.» |
| y-revisa-los-dos | Orden de evaluación | Quitar por omisión | — | — |
| y-basta-uno / o-necesita-los-dos | Confundir «y» con «o» | Mantener; preferir (veredicto contrario) | «Entra al `if`, porque con `&&` basta con que un lado se cumpla.» / «Se salta el `if`: con `\|\|` tendrían que dar `true` los dos lados.» | ✖ «`&&` se lee «y»: necesita que los DOS lados den `true`. `16 >= 18` ya dio `false`, así que todo da `false` (Java ni siquiera revisa `tieneIne`).» / ◐ «Con `\|\|` basta con que UN lado sea `true`. Aquí no entra porque ninguno lo es.» |
| escalera-revisa-todas | En una escalera se revisan todas | Mantener | «Entra al primer bloque y después también revisa `calificacion >= 90`.» | ◐ «Casi: sí entra al primer bloque. Pero en una escalera, en cuanto una condición da `true`, Java ejecuta ese bloque y se salta todos los `else if` de abajo, sin revisarlos.» |
| escalera-elige-la-mejor (nueva) | Java escoge la mejor condición (Pea 1986) | Agregar; veredicto contrario | «Se salta este bloque: Java busca la condición más exacta de la escalera.» | ✖ «Java no busca la mejor: revisa de arriba hacia abajo y se queda con la PRIMERA que da `true`. `95 >= 70` da `true`, así que entra aquí. Por eso importa el orden de la escalera.» |
| primera-revision | Un `while` siempre da una vuelta | Mantener | «Da una vuelta y luego sale, porque el `while` entra al menos una vez.» | ✖ «El `while` revisa ANTES de cada vuelta, incluso la primera. `8 <= 5` da `false` desde el principio: no da ni una vuelta. El que siempre da al menos una es el `do-while`, que revisa al final.» |
| una-vuelta-mas | Débil | Solo de respaldo | «La condición da `false`, pero el ciclo todavía da una vuelta más.» | ✖ «En cuanto la condición da `false`, el ciclo termina ahí, sin otra vuelta. El programa sigue con lo que está después del ciclo.» |
| sale-y-termina-el-programa (nueva) | Al terminar el ciclo termina el programa | Agregar si hay instrucciones después | «Sale del ciclo y ahí se acaba el programa.» | ◐ «Casi: sí sale del ciclo. Pero el programa sigue con la línea 11, lo que está después de la llave que cierra el ciclo.» |
| do-while-una-vuelta | El `do-while` da exactamente una vuelta | Mantener | «Sale del ciclo, porque un `do-while` solo da una vuelta.» | ✖ «El `do-while` da al menos una vuelta, no solo una: al final de cada vuelta revisa y, mientras dé `true`, repite.» |
| dos-bloques | Se ejecutan las dos ramas | Mantener (solo con `else`) | «Ejecuta los dos: primero el bloque del `if` y luego el del `else`.» | ✖ «Con `if`/`else`, Java ejecuta solo UNO de los dos bloques: el del `if` si da `true`, o el del `else` si da `false`.» |
| return-no-termina | `return` sale del `if` como `break` | Mantener | «Entra al `if` y, después del `return`, sigue en la línea 59.» | ◐ «Casi: sí entra. Pero `return` no solo sale del `if`: termina `main`, y con eso todo el programa.» |
| if-como-ciclo / if-espera | El `if` que vigila (Pea 1986) | Mantener, ≤ 1 de cada 3 retos de `if` del mismo programa | «Entra al `if` y, al terminar el bloque, vuelve a revisar la condición.» / «No entra todavía: el programa se queda esperando aquí hasta que se cumpla.» | ✖ «Un `if` no espera ni se repite: Java revisa la condición una sola vez, cuando llega a ella, y sigue. Para repetir mientras algo se cumpla se usa un ciclo, como `while`.» |
| ciclo-no-revisa | Las vueltas se deciden al principio | Mantener | «Da otra vuelta; la condición solo se revisa la primera vez.» | ✖ «La condición se revisa antes de CADA vuelta. Si algo cambia `i` o `n` dentro del ciclo, cambia cuántas vueltas da.» |
| el-ciclo-cuenta-solo (nueva) | El `while` aumenta solo su variable | Agregar en `while` con `true` cuando ninguna variable de la condición cambió en la vuelta anterior | «Da otra vuelta, y a la quinta sale solo, porque la condición dice `<= 5`.» | ◐ «Casi: sí da otra vuelta. Pero un `while` no cuenta solo: en la vuelta anterior nada cambió `contador`, que sigue valiendo 1. Mientras nada lo cambie, `contador <= 5` seguirá dando `true`.» |
| for-actualiza-primero (nueva) | El `i++` se hace antes de la primera vuelta | Agregar en la primera revisión de un `for` | «Entra, pero antes de la primera vuelta el `for` ya hizo el `i++`.» | ◐ «Casi: sí entra. Pero el `i++` se hace al FINAL de cada vuelta. El orden es: inicio, condición, cuerpo, actualización, condición…» |
| switch: defecto | No coincide | Mantener con razón concreta | Ver 3.3 | — |
| switch: otra-etiqueta | Relleno | Quitar | — | — |
| switch: sigue-de-largo / se-detiene | `case` sin `break` | Mantener | «Salta al `case 2` y, al terminar sus instrucciones, sale del `switch`.» | ◐ «Casi: sí salta al `case 2`. Pero ese grupo no tiene `break`, así que Java sigue de largo y ejecuta también lo del `case 3`, sin revisar si coincide.» |

### 3.3 MaquinaSnacks `a1 2 50`

- **Línea 24.** «El `switch` va a comparar `codigo` con sus `case`. ¿A dónde crees que salte?» (1) «Salta al `case "A1"`, porque `codigo` vale "A1".» ✔ «¡Eso es! `codigo` vale "A1" y hay un `case "A1"`: Java salta ahí. Ese grupo termina en `break` (línea 28), así que después sale del `switch`.» (2) Si el motor da lo tecleado: «Salta al `default`: escribiste `a1` en minúsculas y el `case` dice "A1".» ✖ «Sí escribiste `a1`, pero en la línea 19 `toUpperCase()` lo cambió a mayúsculas antes de guardarlo: `codigo` vale "A1" y coincide.» Sin ese dato: «Salta al `default`, porque `codigo` no coincide con ningún `case`.» (3) «Salta al `case "A1"` y sigue de largo con los demás `case`.» ◐ «Casi. Atinaste en que salta al `case "A1"`. Pero ese grupo termina en `break` (línea 28) y `break` termina el `switch` ahí mismo.»
- **Línea 53.** «Java va a revisar `cantidad < 1 || cantidad > 3`. ¿Qué crees que pase?» (1) «Se salta el `if`, porque `2 < 1` y `2 > 3` dan `false`.» ✔ «¡Eso es! Con `||` basta con que un lado sea `true`, y ninguno lo es. Todo da `false` y Java se salta el bloque del `if`.» (2) rango-al-reves. (3) o-se-detiene-con-false.
- **Línea 66.** (1) «Se salta el `if`, porque `50 < 1` y `50 > 200` dan `false`.» ✔ «¡Eso es! 50 no es menor que 1 ni mayor que 200: con `||` hace falta al menos un `true`, así que todo da `false`.» (2) pieza-volteada. (3) o-necesita-los-dos.
- **Línea 72.** «Java va a revisar `dinero < total`. ¿Qué crees que pase?» (1) «Se va al `else`, porque `50 < 36` da `false`.» ✔ «¡Eso es! `50 < 36` pregunta si 50 es menor que 36, y no lo es. Da `false`, así que Java se salta el `if` y ejecuta solo el bloque del `else`.» (2) simbolo-al-reves. (3) dos-bloques.

## 4. Textos del narrador (voz «Java revisa»)

- **T1 `condicion-if`.** `true`: «Java revisa `{condicion}`. Con los valores de ahora queda `{sustituida}`, que da `true`. Entra al `if`.» `false` con `else`: «… que da `false`. Se salta el `if` y entra al `else`.» `false` sin `else`: «… que da `false`. Se salta el bloque del `if` y sigue después de él.» Hacia `else if`: «… que da `false`. Pasa a revisar la condición del `else if`.» Si `sustituida` = `condicion`, se omite «Con los valores de ahora queda…». Con piezas: «Java revisa `cantidad < 1 || cantidad > 3`. Con los valores de ahora queda `2 < 1 || 2 > 3`: ningún lado da `true`, así que todo da `false`. Se salta el bloque del `if` y sigue después de él.»
- **T2 `condicion-ciclo`.** k = 1 `true`: «Antes de la primera vuelta, Java revisa `{condicion}`: queda `{sustituida}`, que da `true`. Entra al cuerpo del `{ciclo}`.» k = 1 `false`: «… que da `false`. No da ni una vuelta: sigue después del `{ciclo}`.» k > 1 `true`: «Terminó la vuelta {k−1}. Java revisa otra vez `{condicion}`: queda `{sustituida}`, que da `true`. Empieza la vuelta {k}.» k > 1 `false`: «… que da `false`. El ciclo termina y el programa sigue después del `{ciclo}`.» `do-while`: «Terminó la vuelta {k} del `do-while`. Ahora Java revisa `{condicion}`: queda `{sustituida}`, que da `true`. Repite: empieza la vuelta {k+1}.» / «… que da `false`. Sale del ciclo.»
- **T3 `alInicio`.** «Todavía no se ejecuta nada. Antes de empezar, lee el programa y anota qué crees que va a aparecer en la consola. Luego pulsa «Siguiente» y lo comprobamos desde la línea 7.»
- **T4 aviso de límite.** Ya en las correcciones C7 de `panel-1.md`.
- **T5 `switch-cae`.** Ya en C8.
- **Menores.** `resumenDelFin.excepcion`: «Así terminó: Java detuvo el programa por un error y lo que seguía ya no se ejecutó. Lee en la consola el mensaje marcado «Error»: dice qué pasó.» `excepcion`: «Java detuvo el programa por un error mientras se ejecutaba (una excepción): `{clase}`.» `return`: «`return` termina `main`, y con eso termina el programa.» `incremento`: «`i++` le suma 1 a `i`: valía 5 y ahora vale 6.» `asignacion-compuesta`: «`suma += i` es lo mismo que `suma = suma + i`: queda `3 + 3`, que da 6. Guarda 6 en `suma`; antes valía 3.» (con el ajuste del experto en Java para tipos menores).

## 5. El libro

- **Estructura de cada tema:** «Para empezar» (situación + programa corto + «¿Qué crees que imprime?» + «Ver la salida»); «La idea» (3–5 frases); «Cómo se escribe» (forma general y orden de ejecución); «Míralo paso a paso» («Ábrelo en el visualizador», sugerencia de encender el reto); «Errores típicos» (mini ejemplos del oráculo); «Ponte a prueba»; «Ahora hazlo tú»; «En resumen» (3 viñetas).
- **Faltan:** `u3-tipos-de-errores` (errores de compilación, de ejecución y de lógica; casa del revisor), `u4-textos-y-concatenacion` (`+` con textos y números, `length()`, `charAt()`, `toUpperCase()`), `u6-repetir-hasta-que-el-usuario-quiera` (centinela, validar entrada, menú con `switch` dentro de `while`), `u7-casos-de-prueba`.
- **Fusionar** `u3-constantes` en `u3-variables-y-tipos`. Total 34 temas.
- **Renombrar** `que-es-una-decision` → «Decisiones: el `if`»; `if-else` → «`if` con `else`: dos caminos».
- **Orden U5:** el `if` → `if`/`else` → comparar textos → `else if` → anidadas → `switch`. **U6:** qué es un ciclo → `while` → contador, acumulador y bandera → `do-while` → `for` → incrementales y decrementales → error por uno y ciclo infinito → repetir hasta que el usuario quiera → anidados → `break` y `continue` (opcional, al final).
- **Oleadas:** la 1 lleva los 16 del plan más `comparaciones`, `operadores-logicos`, `entrada-con-scanner` y `division-entera-y-modulo` (20); la 2, el resto (14). Manda el calendario del grupo.

## 6. Hitos

- **R2.0:** prueba en papel de los 4 retos de MaquinaSnacks en una clase real, con votación a mano alzada (20 min).
- El PO revisa el catálogo de distractores en R2.1 y la lista de temas en R3.1, no al cierre.
- Empezar los borradores de la oleada 1 desde el primer hito.
- Si el grupo va en U5–U6, adelantar R2.

## 7. Lo que todavía no enseñaría

El cortocircuito como «Casi» sin efecto visible; `==` con `String` explicado con referencias o el pool; retos del nivel Detallado en U5; `break`/`continue` y `while (true)` con `break` como modelo normal; `%` con negativos y el `char` promovido como retos; «excepción» sin «un error mientras se ejecuta»; `printf` más allá de `%d`, `%.2f`, `%s`, `%n`. Después de R4: reto de valores en asignaciones para U3–U4 y un «reto difícil» para U6–U7 que oculte las variables hasta contestar.

## 8. Posición sobre PR-1 a PR-5

- **PR-1:** sí, un solo modo; el reto apagado por omisión; al abrir un ejemplo del libro por segunda vez se sugiere encenderlo.
- **PR-2:** (A) con formato consecuencia + razón (≤ 100), balance 40–60 %, «¿Y las otras opciones?», sin `y-revisa-los-dos` y con las familias nuevas; si no hay balance, (C).
- **PR-3:** sí, con los tres ajustes de H2.
- **PR-4:** (a) con pistas graduadas (nivel 1 dónde mirar en el paso 0, nivel 2 «Ver explicación», nivel 3 la evidencia en la ejecución; Aleven 2003). Con el reto encendido, el revisor espera al «después» en trampas que caen en una condición. Los programas de demostración traen «después» por omisión.
- **PR-5:** sí a dos oleadas, con 34 temas (20 y 14) y estructura que empieza por el ejemplo.
