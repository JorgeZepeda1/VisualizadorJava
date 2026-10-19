# Panel 1, anexo: informe del diseñador de experiencia

Resumen fiel del informe de `disenador-ux` (2026-10-17), con la página real en 1366×768, 1280×720, 1024×768, 390 px y 320 px, axe en tres estados y una maqueta del reto. La propuesta consolidada está en `panel-1.md`.

## Hallazgos

- **H1. Primera vez sin camino.** El alumno llega a un «Hola, mundo» y a «Pega o escribe un programa…»; no tiene programa, no hay galería ni libro y la consola vacía no tiene título. Propuesta: el saludo del robot ofrece tres botones («Leer un tema», «Ver un ejemplo paso a paso», «Probar mi programa»); navegación fija «Paso a paso · Libro · Ejemplos» con `aria-current`; la consola vacía dice «Aquí aparecerá lo que imprima tu programa». Alternativa: pantalla de inicio aparte (un clic más).
- **H2. El botón que más se usa está lejos.** «Visualizar» sigue como botón primario mientras se visualiza y «Siguiente» es de contorno; el robot dice «Pulsa «Siguiente»» arriba a la derecha y el botón está abajo a la izquierda (≈ 600 px). A 1366×768 la barra queda cortada. A 390 px el globo está en y = 1050 con una ventana de 844 px: en el paso 0 no se ve al robot. Propuesta: en visualización «Siguiente» es el primario; par «◀ Anterior · Siguiente ▶» pegado debajo del globo; en celular, editor de ≈ 35vh centrado en la línea actual, globo después y barra inferior fija con Anterior y Siguiente. Ese par es el lugar donde aparecen las 3 opciones del reto.
- **H3. El reto no cabe en proyector ni en celular.** A 1280×720 el documento mide 873 px; con zoom 150 % el código se corta; a 1024×768 la columna del código mide 522 px y una línea de 53 caracteres a 24 px no cabe. Con la maqueta, pregunta + 3 opciones + porqué + «Siguiente» caben a 1280×720, 1024×768 y 390 px solo si durante el reto la columna derecha es exclusiva del reto (panel de condición oculto hasta responder, variables reducidas a «Valores ahora: `cantidad` = 2», consola compacta). Propuesta: el modo proyector (5.5) como requisito previo del reto; distribución «reto proyectado» con el código al 55–60 % del ancho, sin la columna «Tipo» y la consola con sus últimas líneas.
- **H4. La opción que se repite delata a la correcta** (coincide con el maestro, H3).
- **H5. La cara «preocupado» se ve enojada** (cejas `M37 44 L53 49`). Invertir las cejas o usar un ánimo «pensativo».
- **H6. El error sigue en pantalla después de corregir y el foco se pierde.** axe: `scrollable-region-focusable` grave en `.cm-scroller` solo en el estado de error.
- **H7. El mismo dato en tres o cuatro lugares** («(revisión 3)», «↻ vuelta 3», «ciclo: vuelta 3»; «es falso» y `false`). Un dueño por dato: el globo narra, el panel de condición es el único lugar de la sustitución y el contador de vueltas vive en el editor. «✕ Entra al `if`» se lee «entra»: decir «No entra al `if`».
- **H8. Demasiados íconos en el editor** (▶ ▷ ✖ ⚑ 📖, insignia de vuelta, rama no tomada). ⚑ se lee «bandera», que es un tema de U6, y los emojis se dibujan distinto en laptops viejas. Propuesta: marca de trampa con un SVG de lupa con «!»; 📖 solo en la línea del cursor al editar y, en visualización, como enlace en el globo («📖 ¿Qué es un `while`?»); un botón visible «Tema de esta línea» además de `Alt+F1` (F1 pide Fn en muchas laptops).
- **H9. Menores.** Falta leyenda de ▶ «acaba de ejecutarse» y ▷ «sigue», y la línea que sigue (punteada amarilla) llama más que la actual; «Paso 0 de 8» crece y en el ciclo infinito muestra «de 100001» (no mostrar el total hasta que la traza esté completa); «Pendiente: ⏎» es críptico; teclear en el editor durante la visualización no hace nada y nada lo explica («Para cambiar el código pulsa «Editar programa»»).

## Flujo propuesto

1. **S0 Llegada.** El robot saluda con las tres puertas. Por enlace del docente se abre directo el programa preparado.
2. **S1 Tema del libro.** Secciones del tema; al final «Tema anterior» y «Tema siguiente». Cada ejemplo con «▶ Verlo paso a paso» y «🎯 Ponerme a prueba» (abre con el reto encendido).
3. **S2 Paso a paso de un ejemplo.** Franja «Ejemplo del libro: El ciclo `while` · ← Volver al tema». Anterior/Siguiente bajo el globo. En cada condición el globo enlaza su tema.
4. **S3 Reto en dos tiempos.** (a) El paso anterior con su narración y «Siguiente». (b) Al pulsar Siguiente el globo cambia a pregunta (rótulo «Reto · línea 53», borde doble, robot con «?»); el paso no avanza; las 3 tarjetas ocupan el lugar de Anterior/Siguiente y del panel de condición, con el foco en la 1. Nunca se mezclan narración y pregunta.
5. **S4 Revelación.** Se marcan la elegida y la correcta, aparece el «Por qué» con la sustitución, se revela el panel de condición y «Siguiente ▶» vuelve con el foco.
6. **S5 Fin.** Resumen y siguientes pasos: «Probar con otros datos», «Modificar el programa», «Volver al tema», «Siguiente tema».
7. **S6 Modificar y probar.** «Editar programa»; el robot propone un cambio del tema; al visualizar, si hay error habla el revisor con gesto empático; si hay trampas, nota en el paso 0; si no, un sello discreto.

## Robots

Recomendó un robot con tres papeles (accesorio y rótulo por papel). **El PO eligió tres robots distintos (2026-10-17)**; del informe quedan como requisitos: un solo hablante a la vez en el globo (nada de «mini retrato» de otro robot dentro del globo), cada robot reconocible por forma y accesorio además del color, y el mismo lugar en pantalla para quien habla.

## Las 3 opciones del reto

- **R1 Tarjeta.** Tecla grande [1] [2] [3]; encabezado en negritas con qué pasa (≈ 30 caracteres); debajo el porqué (≈ 90 caracteres). Tarjetas apiladas a todo el ancho, ≥ 56 px de alto, `aria-keyshortcuts` 1, 2 y 3; la flecha derecha lleva el foco a la opción 1 y no salta el reto.
- **R2 Escaneo.** Formato igual en las tres: se comparan encabezados y luego porqués.
- **R3 Elegir confirma**, sin botón de confirmar (práctica sin calificación, D1).
- **R4 Retroalimentación.** ✔ «¡Eso es!», ◐ «Casi», ✖ «No es esa» con ícono, palabra y estilo de borde (sólido, punteado o grueso); la correcta siempre dice «✔ Lo que hizo Java»; la que sobra se atenúa sin bajar de AA; «Por qué» en 1 o 2 frases con la sustitución; robot feliz si acierta y pensativo si falla; resaltado de 150 ms y nada más; sin movimiento con `prefers-reduced-motion`; sin confeti.
- **R5 Foco.** Al contestar, el foco pasa a «Siguiente» y el resultado se anuncia con `aria-live="polite"`.
- **R6 Ciclos.** Enlace secundario «Ya entendí este ciclo (dejo de preguntarte hasta que termine)»; la pregunta dice «Revisión 3 de la condición» (unificar con «vuelta»).
- **R7 Interruptor** «Modo reto» con «Encendido»/«Apagado» en palabras, en el encabezado.
- **R8 Ajustes.** El alumno ve solo el interruptor del reto; el resto (proyector, nivel, revisor después, velocidad) en «Ajustes de la clase».

## Posición sobre PR-1 a PR-5

- **PR-1:** sí, un interruptor.
- **PR-2:** (A) con tarjeta estructurada, si se corrige H4; si no, (C). (B) no.
- **PR-3:** sí, con «Revisión N», el efecto del botón en palabras y aviso al volver a preguntar; la reproducción automática se detiene en cada reto pendiente.
- **PR-4:** (a), con 0 trampas un sello discreto («🔍 Revisé las 5 trampas que conozco: ninguna») en lugar de un párrafo en cada ejecución, y la marca con lupa. El parámetro de demostración, bien.
- **PR-5:** sí a la lista; el orden de las oleadas sigue el calendario del grupo; el índice muestra todas las unidades y las vacías dicen «Este capítulo llega pronto».
- **Dependencias:** adelantar 5.5 (proyector) y el saludo con puertas antes del reto.

## Lo que no cambiaría

La narración con datos reales, la etiqueta «Línea N» y el código en fichas; la cadena de sustitución; «✕ esta rama no se ejecuta» en el editor; la entrada en la consola con foco automático y eco subrayado; la tabla de variables; el paro por seguridad con evidencia; botones con símbolo y palabra y `aria-keyshortcuts`; sin desplazamiento horizontal a 320 px.

## Evidencia

Capturas y maqueta en el directorio temporal de la sesión, `panel/disenador/`: `01-primera-vez-1366.png`, `02-snacks-paso0.png`, `19-celular-paso0.png`, `10-error-compilacion.png`, `24-tras-editar-con-error.png`, `14-proyector-1280-if-53.png`, `17-proyector-1024-if-53.png`, `m-proyector-1280-respuesta.png`, `m-proyector-1024-respuesta.png`, `m-celular-390-pregunta.png`, `maqueta-reto.html`, `notas.txt`.
