# Textos nuevos de la primera entrega de los robots

Para tu revisión antes de publicar. Son los textos que verán tus alumnos en la galería «Ejemplos», en la pantalla y en los globos de los robots. Lo que va entre comillas invertidas se muestra como código. Donde aparece **N**, el visualizador pone el dato real (un número de línea, de pasos, etc.).

## 1. Galería «Ejemplos»

### Ejercicio de la clase

- **Máquina de snacks**
  Un `switch` elige el producto según el código; dos `if` con `||` revisan que la cantidad y el dinero estén en rango, y un `if` con `else` decide si alcanza el dinero. Cada `return` termina el programa antes de tiempo. Antes de avanzar, ¿qué camino crees que toma Java con cada dato?

### Unidad 3 · Primeros programas

- **«Hola, mundo»**
  El programa más corto: una sola instrucción, `System.out.println`. El texto entre comillas aparece en la consola tal cual, pero sin las comillas.
- **Bienvenida al curso**
  Otro `println`: el texto entre comillas sale idéntico en la consola y después Java pasa a la línea siguiente.
- **Tipos básicos y constantes**
  Cada variable nace con su tipo (`int`, `double`, `boolean`, `char`, `String`); `contador` se crea sin valor y recibe uno después, e `IVA` es `final`: Java no deja cambiar su valor.
- **Área de un rectángulo con valores fijos**
  Mira cómo `area` se calcula con `base * altura` y cómo un `double` con valor entero se imprime con `.0`.
- **Área de un rectángulo con datos del teclado**
  Java se detiene en cada `nextDouble()` hasta tener el dato; con los datos de ejemplo, 5.0 y 3.0, mira cómo se calcula `area` con lo que leyó.
- **Saludo con tu nombre**
  `nextLine()` lee todo el renglón que se escribió y `+` lo une con el texto del saludo para imprimirlo.
- **Cuadrado de un número**
  El número que se lee del teclado se multiplica por sí mismo, y el resultado es lo que se imprime.

### Unidad 4 · Operadores y expresiones

- **Precedencia de operadores**
  Java multiplica antes de sumar, a menos que los paréntesis le digan otra cosa: mira cómo se calculan `2 + 3 * 4` y `(2 + 3) * 4`.
- **Predice: la precedencia**
  Antes de pulsar «Siguiente», calcula a mano `a + b * 3 - 1`, con `a` valiendo 4 y `b` valiendo 2. ¿Qué número crees que imprime? Compáralo con lo que calcula Java.
- **Conversión de `double` a `int`**
  La variable se llama `promedioRedondeado`, pero `(int)` no redondea: corta los decimales. Antes de avanzar, predice qué queda de 8.99.
- **Calificación final**
  El promedio es un `double`; `(int)` le corta los decimales para la calificación entera, y el resultado de `promedio >= 6.0`, `true` o `false`, se guarda en el `boolean` `aprobado`.
- **División entera y módulo**
  Compara `10 / 3`, entre enteros, con `10.0 / 3`: el tipo de los números decide si hay decimales. `%` da el residuo y `numero % 2 == 0` pregunta si un número es par.
- **Cociente y residuo con datos del teclado**
  `/` da el cociente y `%` da el residuo de dividir los dos números que se leen. Con los datos de ejemplo, 17 y 5, calcula los dos a mano antes de avanzar.
- **Calculadora de cambio**
  `/` y `%` trabajan juntos: `/` cuenta cuántos billetes de $100 caben y `%` da lo que sobra. Con 350 pesos, calcula a mano los dos antes de avanzar.
- **El operador lógico `&&`**
  `&&` da `true` solo si sus dos lados dan `true`: mira cómo se juntan la edad y la identificación en `puedeEntrar`.
- **Predice: el operador lógico `||`**
  `edad` vale 16 y `tienePermiso` vale `true`: ¿`puedeEntrar` será `true` o `false`? Decídelo antes de avanzar y compruébalo.
- **Verificar el acceso con `||`**
  Con `||` basta con que uno de los dos lados dé `true`. Con 110 cm de estatura y un adulto que acompaña, mira cuál de los dos lados lo da.

### Unidad 5 · Decisiones

- **¿Puede votar? (`if` con `else`)**
  Con 17 años, ¿Java entra al `if` o al `else`? Mira qué da `edad >= 18`: de los dos bloques, solo se ejecuta uno.
- **Par o impar**
  `numero % 2 == 0` pregunta si el residuo de dividir entre 2 es 0: mira qué bloque ejecuta Java con el dato de ejemplo, 8.
- **Escalera de `else if` en orden correcto**
  Java revisa de arriba hacia abajo y se queda con la primera condición que da `true`. Con 85, ¿en cuál se queda? Fíjate en que las de abajo ya no se revisan.
- **Predice: ¿qué letra le toca al 95?**
  Con 95, ¿qué letra crees que se imprime? Mira en qué orden revisa Java las condiciones y qué pasa con las que quedan más abajo.
- **Decisiones anidadas: la licencia**
  Un `if` dentro de otro: primero se revisa la edad y, solo si es mayor de edad, se revisa la licencia.
- **Menú con `switch`**
  `switch` salta al `case` que coincide con `opcion` y `break` lo termina; con los datos de ejemplo, 1, 10 y 5, suma.
- **Predice: un `switch` sin `break`**
  `diaSemana` vale 2: ¿cuántos textos crees que se imprimen? Mira qué hace Java al llegar al final de un `case` que no tiene `break`.

### Unidad 6 · Ciclos

- **Tabla de multiplicar**
  El `for` va de 1 a 10 y cada vuelta imprime una línea de la tabla del número elegido; mira cómo cambia `i` en cada vuelta.
- **Suma de 1 a n**
  `suma` es un acumulador: en cada vuelta le agrega el valor de `i`. `n` vale 5 con el dato de ejemplo: antes de avanzar, calcula cuánto valdrá `suma` al final.
- **Contador de números pares**
  El `if` dentro del `for` decide en cada vuelta si `contador` sube: mira cómo solo cambia cuando `i` es par. Antes de avanzar, ¿cuántos pares hay del 1 al 20?
- **Promedio de cinco calificaciones**
  `calificacion` guarda solo la última calificación que se leyó; `suma` es la que las va juntando todas. Al final, `suma` se divide entre 5 para sacar el promedio.
- **Bandera: ¿hubo un número negativo?**
  `seEncontroNegativo` empieza en `false` y pasa a `true` la primera vez que llega un número negativo; después ya no vuelve a `false`.
- **Pedir un número positivo con `do-while`**
  El `do-while` revisa al final: pide el número al menos una vez y repite mientras `numero <= 0`. Los datos de ejemplo son -3, 0 y 7: ¿con cuál termina? ¿El 0 hace que repita?
- **Predice: ¿cuántas vueltas da este `while`?**
  `contador` empieza en 8 y la condición es `contador <= 5`. ¿Cuántas vueltas crees que da el `while`? ¿Qué se imprime?
- **Predice: tres `for` casi iguales**
  Tres ciclos casi iguales: ¿cuántas vueltas crees que da cada uno? Compara `<=` con `<` y empezar en 0 o en 1.
- **Predice: ¿cuándo termina este `while`?**
  ¿Cuántas líneas crees que imprime este programa? Avanza unas vueltas y mira el panel de variables: ¿qué tendría que cambiar para que `contador <= 5` dé `false`?
- **Ciclos anidados: tabla de 3 × 3**
  Por cada vuelta del `for` de `fila`, el `for` de `columna` da sus 3 vueltas completas. Antes de avanzar: ¿cuántas veces se ejecuta el `print` en total?

### Unidad 7 · Proyecto

- **Proyecto: cajero automático**
  Un `while` repite el menú y un `switch` elige la operación; `continuar` pasa a `false` al elegir la opción 4 y el ciclo termina.

**Datos de ejemplo de la máquina de snacks**

- Código a1, 2 piezas, paga con $50
- Código b2, 3 piezas, paga con $40
- Código b3
- Código z9
- Código a2 y 5 piezas

## 2. Pantalla

- *saludo*
  - *globo*: ¡Hola! Te muestro, paso a paso, qué hace Java con un programa. ¿Por dónde quieres empezar?
  - *puertas*
    - *etiquetaDelGrupo*: ¿Por dónde quieres empezar?
    - *leerUnTema*: Leer un tema
    - *verUnEjemplo*: Ver un ejemplo paso a paso
    - *probarMiPrograma*: Probar mi programa
- *navegacion*
  - *etiqueta*: Secciones del visualizador
  - *pasoAPaso*: Paso a paso
  - *libro*: Libro
  - *ejemplos*: Ejemplos
- *consola*
  - *titulo*: Consola
  - *vacia*: Aquí aparecerá lo que imprima tu programa
- *edicion*
  - *avisoAlTeclearDuranteLaVisualizacion*: Para cambiar el código pulsa «Editar programa»
- *leyenda*
  - *etiqueta*: Marcas del código
  - *ejecutada*: acaba de ejecutarse
  - *siguiente*: sigue
- *posicion*
  - *paso*: Paso N de N
- *ajustes*
  - *boton*: Ajustes de la clase
  - *titulo*: Ajustes de la clase
  - *cerrar*: Cerrar
  - *proyector*
    - *nombre*: Modo proyector
    - *descripcion*: Letra más grande y una distribución pensada para proyectar en el salón.
  - *velocidad*
    - *nombre*: Velocidad
  - *estado*: Encendido
- *ranura*
  - *etiqueta*: Qué hacer ahora
- *fin*
  - *etiqueta*: Qué sigue
  - *probarConOtrosDatos*: Probar con otros datos
  - *modificarElPrograma*: Modificar el programa
- *programaPropio*
  - *volver*: Volver a mi programa

## 3. Robots

- *sinEjecutar*: Escribe o pega aquí tu programa (puedes copiarlo de NetBeans). Cuando esté listo, pulsa «Visualizar» y te muestro cómo lo ejecuta Java, paso a paso.
- *compilando*: Java está revisando tu programa…
- *programaCambiado*: Cambiaste el programa. Pulsa «Visualizar» para que Java lo revise otra vez.
- *alInicio*: Todavía no se ejecuta nada. Este programa va a leer este dato: N. Antes de empezar, lee el programa y anota qué crees que va a aparecer en la consola. Luego pulsa «Siguiente» y lo comprobamos desde la línea N.
- *etiquetaDeLinea*: Línea N
- *esperandoUnDato*: En la línea N el programa espera un dato. Escríbelo en la consola y pulsa Enter.
- *calculando*: Se siguen calculando los siguientes pasos…
- *detenida*: Así terminó: la ejecución se detuvo antes de llegar al final del programa.
- *resumenDelFin*
  - *terminado*: Así terminó: sin errores, en N pasos. ¿La consola muestra lo que anotaste al principio? Si algo no coincide, regresa con «Anterior» al paso donde Java hizo otra cosa.
  - *excepcion*: Así terminó: Java detuvo el programa por un error y lo que seguía ya no se ejecutó. Lee en la consola el mensaje marcado «Error»: dice qué pasó.
  - *error-arranque*: Así terminó: el programa no pudo arrancar.
  - *no-disponible-en-ejecucion*: Así terminó: el visualizador se detuvo en una parte que todavía no sabe ejecutar.
  - *limite-pasos*: Así terminó: el visualizador lo detuvo por seguridad (demasiados pasos).
  - *limite-caracteres*: Así terminó: el visualizador lo detuvo por seguridad (un texto creció demasiado).
  - *limite-tiempo*: Así terminó: el visualizador lo detuvo por seguridad (tardó demasiado en calcular).
  - *error-interno*: Así terminó: algo falló dentro del visualizador, no en tu programa.
- *personajes*
  - *paso-a-paso*
    - *nombre*: Robot paso a paso
  - *revisor*
    - *nombre*: Robot revisor
  - *libro*
    - *nombre*: Robot del libro

## 4. La voz del robot paso a paso, con programas reales

Lo que dice el robot en cada paso, generado con el motor real.

### Máquina de snacks con «Código a1, 2 piezas, paga con $50»

- Línea 7: Java crea la variable `sc` de tipo Scanner con `new Scanner(System.in)`. Con ella leerá lo que escribas en el teclado.
- Línea 10: Java imprime en la consola: «=== MÁQUINA DE SNACKS ===» y pasa a la línea siguiente.
- Línea 11: Java imprime en la consola: «A1 Papas      $18» y pasa a la línea siguiente.
- Línea 12: Java imprime en la consola: «A2 Galletas   $15» y pasa a la línea siguiente.
- Línea 13: Java imprime en la consola: «B1 Agua       $12» y pasa a la línea siguiente.
- Línea 14: Java imprime en la consola: «B2 Refresco   $22» y pasa a la línea siguiente.
- Línea 15: Java imprime en la consola: «B3 Jugo       Agotado» y pasa a la línea siguiente.
- Línea 18: Java imprime en la consola: «Código: » sin pasar a la línea siguiente.
- Línea 19: Java calcula `sc.next().toUpperCase()`, que da "A1". Después crea la variable `codigo` de tipo String y le guarda "A1".
- Línea 21: Java crea la variable `producto` de tipo String. Todavía no tiene valor: Java no te deja usarla hasta que le guardes algo.
- Línea 22: Java crea la variable `precio` de tipo int. Todavía no tiene valor: Java no te deja usarla hasta que le guardes algo.
- Línea 24: El `switch` mira `codigo`, que vale "A1", y salta al `case "A1"`.
- Línea 26: Java guarda "Papas" en `producto`.
- Línea 27: Java guarda 18 en `precio`.
- Línea 28: `break`: Java termina el `switch` ahora mismo.
- Línea 50: Java imprime en la consola: «Cantidad (1 a 3): » sin pasar a la línea siguiente.
- Línea 51: Java lee con `sc.nextInt()` lo que se escribió y obtiene 2. Después crea la variable `cantidad` de tipo int y le guarda 2.
- Línea 53: Java revisa `cantidad < 1 || cantidad > 3`. Con los valores de ahora queda `2 < 1 || 2 > 3`, que da `false`. Se salta el bloque del `if` y sigue después de él.
- Línea 59: Java calcula `precio * cantidad`: con los valores de ahora es `18 * 2`, que da 36. Después crea la variable `total` de tipo int y le guarda 36.
- Línea 60: Java imprime en la consola: «Total: $36» y pasa a la línea siguiente.
- Línea 63: Java imprime en la consola: «Dinero: » sin pasar a la línea siguiente.
- Línea 64: Java lee con `sc.nextInt()` lo que se escribió y obtiene 50. Después crea la variable `dinero` de tipo int y le guarda 50.
- Línea 66: Java revisa `dinero < 1 || dinero > 200`. Con los valores de ahora queda `50 < 1 || 50 > 200`, que da `false`. Se salta el bloque del `if` y sigue después de él.
- Línea 72: Java revisa `dinero < total`. Con los valores de ahora queda `50 < 36`, que da `false`. Se salta el `if` y entra al `else`.
- Línea 75: Java imprime en la consola: «Entregando 2 x Papas. Cambio: $14» y pasa a la línea siguiente.
- Línea 78: Java ejecuta `sc.close()`.

### `u6-suma-1-a-n` con el dato de ejemplo

- Línea 5: Java crea la variable `sc` de tipo Scanner con `new Scanner(System.in)`. Con ella leerá lo que escribas en el teclado.
- Línea 6: Java lee con `sc.nextInt()` lo que se escribió y obtiene 5. Después crea la variable `n` de tipo int y le guarda 5.
- Línea 7: Java crea la variable `suma` de tipo int y le guarda 0.
- Línea 8: Java crea la variable `i` de tipo int y le guarda 1.
- Línea 8: Antes de la primera vuelta, Java revisa `i <= n`: queda `1 <= 5`, que da `true`. Entra al cuerpo del `for`.
- Línea 9: Java calcula `suma + i`: con los valores de ahora es `0 + 1`, que da 1. Después guarda 1 en `suma`; antes valía 0.
- Línea 8: Java le suma 1 a `i`: valía 1 y ahora vale 2.
- Línea 8: Terminó la vuelta 1. Java revisa otra vez `i <= n`: queda `2 <= 5`, que da `true`. Empieza la vuelta 2.
- Línea 9: Java calcula `suma + i`: con los valores de ahora es `1 + 2`, que da 3. Después guarda 3 en `suma`; antes valía 1.
- Línea 8: Java le suma 1 a `i`: valía 2 y ahora vale 3.
- Línea 8: Terminó la vuelta 2. Java revisa otra vez `i <= n`: queda `3 <= 5`, que da `true`. Empieza la vuelta 3.
- Línea 9: Java calcula `suma + i`: con los valores de ahora es `3 + 3`, que da 6. Después guarda 6 en `suma`; antes valía 3.
- Línea 8: Java le suma 1 a `i`: valía 3 y ahora vale 4.
- Línea 8: Terminó la vuelta 3. Java revisa otra vez `i <= n`: queda `4 <= 5`, que da `true`. Empieza la vuelta 4.
- Línea 9: Java calcula `suma + i`: con los valores de ahora es `6 + 4`, que da 10. Después guarda 10 en `suma`; antes valía 6.
- Línea 8: Java le suma 1 a `i`: valía 4 y ahora vale 5.
- Línea 8: Terminó la vuelta 4. Java revisa otra vez `i <= n`: queda `5 <= 5`, que da `true`. Empieza la vuelta 5.
- Línea 9: Java calcula `suma + i`: con los valores de ahora es `10 + 5`, que da 15. Después guarda 15 en `suma`; antes valía 10.
- Línea 8: Java le suma 1 a `i`: valía 5 y ahora vale 6.
- Línea 8: Terminó la vuelta 5. Java revisa otra vez `i <= n`: queda `6 <= 5`, que da `false`. El ciclo termina y el programa sigue después del `for`.
- Línea 11: Java imprime en la consola: «15» y pasa a la línea siguiente.
