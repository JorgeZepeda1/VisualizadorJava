# Panel R0, anexo: informe del diseñador

Resumen fiel del informe de `disenador-ux` en la verificación del hito R0 (2026-10-19), con la pantalla real a 1366×768, 1280×720 y 1024×768 (proyector encendido y apagado), 390×844, 320×640 y zoom al 200 %. axe en 9 estados: ninguna violación. Capturas y maquetas en el directorio temporal de la sesión, `panel-r0/disenador/capturas/`.

## Hallazgos del panel 1

| # | Estado | Detalle |
|---|---|---|
| H1 Llegada | Resuelto | Saludo con puertas, foco en «Ver un ejemplo paso a paso», `aria-current`, consola vacía con texto. Detalles: «Visualizar» sigue como botón relleno en la llegada; en celular el editor aparece antes que el saludo. |
| H2 «Siguiente» lejos | Parcial | Resuelto durante la visualización. Quedan: a 1366×768 con un programa largo, «Paso N de M», Reiniciar, Fin y Reproducir quedan bajo el borde; «Siguiente» se mueve con la altura del globo (14 px a 1366, 90 px a 1280 con proyector, 184 px a 1024 con proyector); al editar o con error la ranura queda vacía (≈ 100 px). |
| H3 Proyector y celular | Parcial | La consola queda fuera de la ventana en 9 de 26 pasos a 1280×720 y 8 de 26 a 1024×768; las variables se cortan en 5 de 26; a 1024 el partido de líneas deja un renglón numerado vacío, parte palabras («Cantida\|d») y parte la cadena de sustitución dentro de una comparación. |
| H5 Cara | Resuelto | Nuevo y menor: el ánimo «seguridad» se lee como fastidio y la mano parece una oreja. |
| H6 Error tras corregir | Resuelto | |
| H7 Un dueño por dato | Resuelto | |
| H8 Íconos | Parcial | ⚑ y 📖 llegan en R2–R3; la lupa del revisor también quedó en la puerta «Probar mi programa». |
| H9 Menores | Casi | Pendiente: «Sin leer todavía: ⏎» no se explica. |

Tres robots: se distinguen en escala de grises, habla uno a la vez (exactamente un `[data-personaje]` en cada estado) y quien habla está en el mismo lugar en escritorio; en celular el robot baja entre 60 y 240 px de un estado a otro.

## Antes de publicar

1. **La narración se sale de la vista** (a 1366×768 con «Con mis datos», al teclear el tercer dato la página baja 188 px y el robot y «Así terminó» quedan fuera del paso 22 al 26). Propuesta A: robot, globo y ranura fijos arriba de la columna derecha (`position: sticky`), probado con CSS inyectado.
2. **En el proyector la consola no se ve.** Propuesta C: solo con el proyector encendido, la consola (últimas 4 líneas) debajo del código, como la ventana «Output» de NetBeans; en la maqueta queda visible en 26 de 26 pasos a 1280×720 y 1024×768.
3. **Partido de líneas en el proyector a 1024:** sin renglones numerados vacíos ni palabras partidas (la sangría inicial no se parte; continuación con sangría colgante de +2 columnas); en la condición y en el globo, cada pieza de la cadena de sustitución sin partir por dentro, con corte permitido solo entre las flechas.
4. **Ícono de «Probar mi programa»:** una hoja con dos renglones de código y un lápiz, que no pertenezca a ningún robot (la lupa con «!» es del revisor y será la marca de trampa). Alternativa: un teclado; descartado `</>`.
5. **«Probar con otros datos» solo si el programa lee datos**; en el ciclo detenido, «Modificar el programa» como principal.
6. **Títulos de la galería con comillas invertidas sin convertir a código** (también en el nombre accesible de los botones): pasarlos por el mismo componente de texto con código.

## Puede esperar (a R1 a más tardar)

«Siguiente» fijo en su lugar con un alto mínimo del globo (≈ 4 renglones), antes de R1 porque ahí van las tarjetas del reto; en celular, «◀ Anterior · Escribir el dato» en la barra durante la espera (el campo queda bajo la barra fija), menos botones de edición durante la visualización y «Ajustes» como ⚙ con nombre accesible; la ranura con «Visualizar ▶» al editar e «Ir a la línea N» con error; «Visualizar» secundario en la llegada; el foco tras pulsar «Fin» o «Reiniciar» cae en `body` (ya pasaba); «Volver a mi programa» solo si hay un programa propio; «Paso N de M» visible junto a la ranura a 1366; explicar «Sin leer todavía: ⏎» una vez y ocultarlo al final; la antena se balancea sin fin (WCAG 2.2.2: limitar a pocos ciclos); recordar el proyector al recargar; índice «Ir a: U3 · U4 · U5 · U6 · U7» en la galería (mide 4 671 px) y quitar los 35 rótulos «Del curso»; la cara de «seguridad».

## Lo que no cambiaría

Los tres robots, el hablante anunciado por su nombre, la narración con datos reales, «Siguiente» primario con foco automático, la leyenda ▶/▷, «Paso N» sin total mientras no se conoce, el aviso al teclear durante la visualización, el error que desaparece al corregir, la insignia de vuelta como único dueño, «Ajustes de la clase» con estados en palabras, cero violaciones de axe, sin desplazamiento horizontal a 320 px.
