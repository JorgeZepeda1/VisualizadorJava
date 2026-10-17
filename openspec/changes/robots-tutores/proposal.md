# Propuesta: Robots tutores — revisor, programador con modo reto y explicador (`robots-tutores`)

> Fase `sdd-propose` · 2026-10-17 · Roles: **Diseñador Pedagógico** (qué aprende el alumno con cada robot, tono, errores típicos) y **Arquitecto** (dónde vive cada pieza, riesgos, medición). Base: la petición del PO (docente) y sus decisiones cerradas del 2026-10-17; el cambio `visualizador-java` (D1–D7, `proposal.md` §1–§13, `design.md` §3–§6, `tasks.md` 4.1, 4.11, 5.1–5.3) y el código de los hitos 1 y 2 (`src/presentacion/{robot,condicion,sustitucion}.ts`, `src/interfaz/componentes/{Robot,Explicacion,AvisoProblema}.tsx`, `src/motor/traza/{paso,explicacion}.ts`, `src/motor/ir/{ir,vista-programa}.ts`). Lo comprobado contra el código o el corpus en esta fase va marcado **[verificado hoy]**.
>
> **Tamaño:** la plantilla de la fase pide menos de 450 palabras; el orquestador pidió el formato y el nivel de detalle de `visualizador-java`. Esta propuesta se queda en el qué y el porqué; el cómo (contratos, catálogo de distractores, medición) vive en `design.md`.

## 0. Decisiones del PO (2026-10-17, vinculantes)

| # | Decisión |
|---|---|
| R-D1 | **Robot revisor = errores y trampas.** Explica con sus palabras los errores de compilación y los avisos que ya existen y, además, avisa de las trampas clásicas aunque el programa compile: `;` después del `if`, `==` con `String`, `case` sin `break`, `nextInt()` seguido de `nextLine()`, división entera. Sin comentarios de estilo. |
| R-D2 | **Robot programador = modo reto.** Un interruptor «modo reto» (lo activa el docente o el alumno). Encendido, en cada `if`, `while`, `for` y `switch` el robot se detiene y da **3 opciones**; si el alumno atina, explica por qué; si se equivoca, explica por qué su opción no es y por qué la correcta sí. Solo condiciones por ahora (no valores de variables). |
| R-D3 | **Robot explicador = libro y en contexto.** Una sección tipo libro con los temas de U3 a U7 (decisión, ciclos, incremento y decremento, `for`, `while`…) con ejemplos que se abren en el visualizador, y un botón junto a cada `if`, `for` o `while` que abre su tema. Claude escribe el borrador; el PO lo revisa antes de publicarlo. |
| R-D4 | **Prioridad:** primero se publica en GitHub Pages (hito 3, en curso); los robots van después. |

Siguen vigentes D1–D7 del cambio `visualizador-java`; en especial **D2** (nunca un resultado inventado) gobierna los tres robots, y **D4** (predicción apagada por omisión, la activa el docente) se enmienda con ADR si el PO acepta PR-1 (§12).

## 1. Intención

**Problema.** Hoy el robot narra cada paso con datos del motor, pero el alumno es un espectador: (1) cuando Java rechaza su programa lee un mensaje correcto pero no sabe *por qué* Java lo pide; (2) los errores que **sí compilan** —los que más cuestan en U5–U6 (errores conceptuales #1, #4, #8, #11 y #12 de `exploracion/01` §6)— pasan sin aviso hasta que el resultado sale raro; (3) mirar la condición evaluada no obliga a predecirla: la evidencia del propio plan (Naps 2002, Kumar 2015; `proposal.md` §1) dice que predecir antes de ver compromete más; (4) cuando no recuerda qué es un `for` o un ciclo decremental tiene que salir de la herramienta.

**Principio rector.** Tres robots con un solo origen de verdad: **todo lo que dicen sale de lo que el motor calculó o de una regla verificada contra el JDK 17 real**. El revisor afirma *hechos* sobre el programa («ese `;` es todo el cuerpo del `if`»), nunca adivina intenciones; el reto toma la respuesta correcta de la traza y refuta cada distractor con valores de la traza; el libro solo muestra salidas que produjo el oráculo.

| Robot | El alumno podrá… | Error conceptual que ataca |
|---|---|---|
| Revisor | Entender por qué Java rechaza su programa y reconocer cinco trampas que compilan | #1 división entera, #4 `==` con `String`, #8 `;` fantasma, #11 `switch` sin `break`, #12 `nextInt()` + `nextLine()` |
| Programador (modo reto) | Predecir y **justificar** qué hace cada condición antes de verla | #4, #6 error por uno, #11, #15 cortocircuito, valor viejo de una variable, `if` que «vigila» como un ciclo |
| Explicador | Repasar un tema como en un libro y probar sus ejemplos en el visualizador | Todos: decisión, ciclos, incremento/decremento, contador/acumulador/bandera |

**Tono:** el de `proposal.md` §1 (tuteo, amable, preciso, nunca «incorrecto» a secas; primero qué pasa y luego por qué, con los números reales).

## 2. Alcance

### 2.1 Dentro

| Hito | Entregable (cada hito se usa por sí solo) |
|---|---|
| **R1 Revisor** | (a) El revisor presenta los errores y avisos que ya existen con su texto actual más un «¿por qué lo pide Java?» por familia de problema. (b) Cinco familias de trampas detectadas de forma estática y determinista sobre la IR de un programa que compila: `;` tras la condición (`if`, `while`, `for`; el error #8 ya las junta), `==`/`!=` entre `String`, grupo de `case` que sigue de largo, `nextLine()` que lee el renglón pendiente de una lectura de token, división entera que se convierte en `double`. (c) Aviso no bloqueante en el paso 0 y marcador en el editor. (d) Confirmación en la ejecución: cuando la trampa se ve en la traza, una nota con los valores del motor. |
| **R2 Modo reto** | Interruptor apagado por omisión (y parámetro del enlace). Antes de revelar cada condición de `if`/`else if`, `while`, `do-while`, `for` y cada selección de `switch`, el robot ofrece **3 opciones**; exactamente una es la del motor; los distractores salen de un catálogo cerrado de errores típicos aplicables a la forma de esa condición; retroalimentación de acierto, de acierto parcial (qué pasa bien, por qué mal) y de error. |
| **R3 Libro** | Sección «Libro» con los temas de U3–U7 en lista cerrada; ejemplos verificados por el oráculo que se abren en el visualizador; botón en contexto junto a cada `if`, `switch`, `while`, `do` y `for` y en la explicación del paso; flujo de aprobación del PO con huella del contenido; carga aparte y presupuesto propio. |

### 2.2 Fuera (de este cambio)

- Comentarios de estilo (nombres, sangría, llaves) y cualquier trampa fuera de las cinco familias (p. ej. `if (bandera = true)`, `else` colgante por sangría): candidatos posteriores, cada uno con su ADR.
- Retos sobre **valores** de variables, sobre la caída de un `switch` o sobre subexpresiones (Detallado): R-D2 dice «solo condiciones».
- Calificaciones, conteo de aciertos guardado, cuentas o telemetría (D1).
- Voz o audio de los robots (el PO eligió globo de texto el 2026-10-16).
- Reescribir los mensajes de error existentes: el revisor los reutiliza tal cual (decisión del PO del 2026-09-29, tarea 1.28).

## 3. Capacidades (contrato con `sdd-spec`)

`openspec/specs/` sigue vacío: `visualizador-java` no se ha archivado. Las deltas de «Modified» se escriben contra `openspec/changes/visualizador-java/specs/<capacidad>/spec.md` y se aplican después del archivo de ese cambio.

### New Capabilities
- `robot-revisor`: explicación de errores y avisos existentes; catálogo cerrado de cinco trampas; hechos verificables; cero falsos positivos; confirmación en la ejecución.
- `modo-reto`: dónde se detiene, tres opciones con una sola correcta tomada del motor, distractores del catálogo, retroalimentación, navegación, accesibilidad y proyector.
- `libro-de-temas`: temas U3–U7, estructura de libro, ejemplos del oráculo, abrir en el visualizador, botón en contexto, aprobación del PO, carga aparte y peso.

### Modified Capabilities
- `visualizador-paso-a-paso`: REQ-VIS-013 (la predicción Sí/No de D4 pasa a ser el modo reto, si el PO acepta PR-1) y un requisito nuevo de los tres robots como personajes distinguibles.
- `uso-en-aula`: REQ-AULA-002 (el enlace lleva `reto` en lugar de `prediccion`) y REQ-AULA-005 (el escenario docente usa el reto de tres opciones).
- `verificacion-diferencial`: requisito nuevo — los ejemplos del libro y las muestras de trampas y del reto se verifican contra el JDK 17 real.

## 4. Enfoque

Sin capas nuevas (ADR 001): el **motor** detecta las trampas sobre su IR (pasada nueva `src/motor/revision/`, pura, después de compilar) y anota en los pasos de condición los hechos que la interfaz no puede calcular sin reevaluar Java (las piezas de la condición con su sustitución y resultado, la relación entre dos números, si dos `String` dicen lo mismo); **presentación** compone el revisor, el reto (opciones como afirmaciones verificables contra la traza) y el libro; **textos** guarda todo lo que se lee en `src/textos/es-MX/` (ADR 015); **interfaz** agrega los personajes, la pregunta del reto, el marcador del editor y la pantalla del libro (carga diferida). La medición de «cero falsos positivos» es triple: reglas que solo afirman hechos del lenguaje, un corpus curricular etiquetado y revisado por el PO, y muestras positivas y casi-trampas compiladas por el oráculo.

| Hito | Contenido | Criterios | Sesiones (estim.) |
|---|---|---|---|
| R1 Revisor | pasada `revision/`, cinco familias, corpus de trampas, etiquetas del corpus, textos, personaje y marcador, confirmación | CR1–CR3, CR8 | 2–3 |
| R2 Modo reto | piezas y relación en el motor, estructura en `VistaPrograma`, catálogo de distractores, constructor de opciones, estado, interfaz, enlace | CR4, CR5, CR8, CR9 | 3–4 |
| R3 Libro + oleada 1 | modelo de contenido, ejemplos del oráculo, aprobación con huella, pantalla y botones en contexto, peso; los 16 temas de la oleada 1 aprobados | CR6–CR8 | 3–4 + revisión del PO |
| R4 Libro, oleada 2 | solo contenido: los 15 temas restantes (U3, U4, U7) aprobados | CR6, CR8 | 1–2 + revisión del PO |

Una sola verificación (`sdd-verify`) por hito, como acordó el PO.

## 5. Áreas afectadas

| Área | Impacto | Descripción |
|---|---|---|
| `src/motor/revision/` | Nuevo | Pasada de trampas sobre `ProgramaIr`; `Trampa` y sus códigos |
| `src/motor/ir/vista-programa.ts`, `ir/generar-ir.ts` | Modificado | `trampas`, estructura de `switch` e `if` para el reto |
| `src/motor/traza/{paso,explicacion}.ts`, `interprete/explicar.ts` | Modificado | Piezas de la condición, relación numérica, mismo texto |
| `src/presentacion/{revisor,reto,libro}.ts` | Nuevo | Componen lo que dicen los robots |
| `src/textos/es-MX/{revisor,reto}.ts`, `src/textos/es-MX/libro/` | Nuevo | Catálogos y contenido del libro |
| `src/interfaz/{componentes,editor,estado,contenedores}/` | Modificado/Nuevo | Personajes, nota del revisor, pregunta del reto, interruptor, marcador, pantalla del libro |
| `corpus/experimentos/{trampas,reto}/`, `corpus/libro/`, `corpus/trampas-esperadas.json` | Nuevo | Muestras y ejemplos con goldens del oráculo; etiquetas revisadas por el PO |
| `herramientas/oraculo/generar-goldens.ts`, `herramientas/presupuesto-tamano.ts` | Modificado | Recorre `corpus/libro`; límite por fragmento |
| `pruebas/{revisor,propiedades,diferencial,e2e}/` | Nuevo | Guardas del corpus, propiedad del reto, ejemplos, flujos |
| `docs/adr/017…019` | Nuevo | Revisor, modo reto (enmienda D4), libro |

## 6. Criterios de éxito (medibles)

| # | Criterio |
|---|---|
| CR1 | **Cero falsos positivos del revisor:** en los 60 archivos de `corpus/curso/` (35), `corpus/experimentos/tipicos/` (20) y `corpus/experimentos/ejercicios-del-po/` (5), las trampas detectadas son **exactamente** las de `corpus/trampas-esperadas.json` (revisado por el PO); una de más o de menos falla. **[verificado hoy]** a mano sobre el código fuente: solo `u5-switch-sin-break-fallthrough` tiene trampas (tres grupos que siguen de largo); `u4-division-entera-y-modulo` (`int resultado1 = 10 / 3`), `u6-acumulador-promedio-calificaciones` (`suma` es `double`) y MaquinaSnacks son casi-trampas que NO deben salir. |
| CR2 | 100 % de las muestras positivas de `corpus/experimentos/trampas/` detectadas (≥ 3 variantes por familia) y 0 de las casi-trampas (≥ 2 por familia); todas compiladas y ejecutadas por el oráculo. |
| CR3 | En cada muestra positiva cuya entrada hace visible la trampa, la nota del revisor aparece en el paso donde se manifiesta y cita solo valores del motor. |
| CR4 | **Reto en todo el corpus ejecutable:** en el 100 % de los pasos de condición y de selección de `switch`, 3 opciones distintas, exactamente una verdadera según el verificador de afirmaciones contra la traza, cada distractor con al menos una afirmación falsa y ninguna cita de un valor que el motor no calculó. |
| CR5 | E2E: MaquinaSnacks `a1 2 50` presenta 4 retos (líneas 24, 53, 66 y 72) que se contestan solo con teclado; en proyector a 1024×768 las opciones no se enciman ni se cortan; 0 violaciones AA graves o críticas (axe). |
| CR6 | 100 % de los ejemplos del libro idénticos al oráculo (salida byte a byte, o veredicto y línea si el ejemplo muestra un error); 0 temas publicados sin aprobación con huella vigente; fragmento del libro ≤ 80 KB gzip y total ≤ 500 KB (REQ-PLAT-003). |
| CR7 | El 100 % de los `if`, `switch`, `while`, `do` y `for` de la galería y del corpus ejecutable lleva a un tema publicado (cobertura del mapeo construcción → tema). |
| CR8 | Textos de R1–R4 en el catálogo es-MX (0 fuera de él, C18) y revisados por el PO sin observaciones bloqueantes. |
| CR9 | Con las piezas en los pasos de condición, C11 se mantiene: 100 000 pasos Normal ≤ 1 s y cambiar de paso ≤ 100 ms (p95). |

## 7. Fuera de alcance (resumen)

§2.2, más: integrar los robots con AprendiendoJava; editar el contenido del libro desde la página; un buscador del libro (el índice por unidad basta en v1).

## 8. Riesgos

| Riesgo | Prob. | Mitigación |
|---|---|---|
| Un distractor confunde en vez de enseñar (demasiado tramposo o redactado como trampa) | Media | Catálogo cerrado ligado a errores documentados (`exploracion/01` §6); revisión del PO en la verificación de R2; acierto parcial explícito; validación en aula |
| Detección conservadora = pocas trampas encontradas | Media | Es el precio de cero falsos positivos; recall medido con las muestras; el revisor dice «revisé las 5 trampas que conozco», nunca «tu programa está bien» |
| El volumen del libro y su revisión retrasan R3 | Alta | Dos oleadas (U5–U6 primero, PR-5); borradores no publicables; huella que invalida la aprobación si el texto cambia |
| Peso: libro + robots superan los 500 KB | Baja | Estimado: ≈ 319 KB hoy + 55–75 KB libro + ≈ 15 KB robots; fragmento aparte con límite propio medido en cada hito |
| Datos nuevos por paso degradan la navegación (C11) | Baja | Solo en pasos de condición; prueba de rendimiento en R2 |
| Choque con el lote 5 de `visualizador-java` (5.1 predicción, 5.4 enlace, 5.6 escenario docente) | Media | Delta de REQ-VIS-013 y REQ-AULA-002/005; el orquestador concilia esas tareas (§10) |
| Revelar trampas antes de ejecutar arruina el descubrimiento en programas de demostración | Media | PR-4 |

## 9. Plan de reversión

- Cada hito se publica con su etiqueta `vX.Y.Z`; revertir = desplegar la etiqueta anterior (flujo `desplegar.yml`) o `git revert` del merge del hito.
- Sin datos que migrar. El parámetro `reto=1` de un enlace que una versión anterior no conoce se ignora con el aviso de versión (ADR 014), nunca abre un programa corrupto.
- El modo reto y el revisor no tocan la ejecución: apagarlos (interruptor, o quitar su componente) deja el visualizador de los hitos 1–2 intacto.
- Disparador: una trampa reportada en un programa sin ella, un reto con dos opciones verdaderas o un ejemplo del libro distinto al JDK → revertir y corregir empezando por su prueba.

## 10. Dependencias

- Hito 3 publicado y PR #3 fusionado (R-D4).
- `visualizador-java` sin archivar: sus specs son la base de las deltas; al archivarlo primero, las deltas de este cambio se aplican después.
- Conciliación pendiente del orquestador en `visualizador-java/tasks.md`: 5.1 (predicción) queda absorbida por R2 si el PO acepta PR-1; 5.4 (enlace) y 5.6 (escenario docente) usan `reto` en lugar de `prediccion`; 5.2 (galería) y R3 comparten la carga de un programa con su entrada preparada (lo hace quien llegue primero).
- JDK 17.0.18 para los goldens de `corpus/experimentos/{trampas,reto}/` y `corpus/libro/`.

## 11. Definición de Terminado (cada hito)

La de `visualizador-java` `proposal.md` §13, más: (a) los textos de los robots y del libro los revisa el PO antes de publicarse (el libro, con aprobación por tema y huella); (b) ninguna afirmación de un robot sin su dato del motor o su regla respaldada por un programa del oráculo; (c) una sola `sdd-verify` por hito, sin `judgment-day` salvo que la verificación lo pida.

## 12. Preguntas abiertas para el PO

| # | Pregunta | Recomendación por omisión |
|---|---|---|
| PR-1 | La predicción Sí/No de D4 (tarea 5.1, aún sin hacer) y el modo reto preguntan lo mismo. ¿El modo reto la **reemplaza**? | **Sí, un solo modo:** el reto es D4 con tres opciones; se conserva todo lo demás de D4 (apagado por omisión, interruptor visible, parámetro del enlace) y la 5.1 queda absorbida por R2. Con dos modos habría dos interruptores que hacen casi lo mismo. |
| PR-2 | ¿Qué dicen las 3 opciones de una condición de dos salidas (`if`, `while`)? (A) **qué pasa y por qué** («Es `false`: `2 < 1` y `2 > 3` son false; no entra»); (B) solo **a dónde va** (entra / no entra / un error típico de flujo); (C) dos tiempos: Sí/No y luego «¿por qué?» con tres razones. | **(A).** Enseña la sustitución, que es el centro de U5–U6; con la razón, la tercera opción siempre tiene sentido (p. ej. «con `\|\|` basta que el primero sea false») y permite el acierto parcial. (B) es más barata pero su tercera opción en un `if` simple queda floja; (C) duplica la interacción y es lenta en clase. |
| PR-3 | En un ciclo de muchas vueltas, ¿el reto pregunta en **cada** revisión? | **Sí (tu regla), con un botón «Ya entendí este ciclo»** que deja de preguntar en ese ciclo hasta que termine; la siguiente vez que el programa llegue a él vuelve a preguntar. |
| PR-4 | ¿Cuándo avisa el revisor de una trampa? (a) al visualizar: aviso corto en el paso 0 y la explicación completa cuando se ve en la ejecución; (b) solo cuando se ve en la ejecución; (c) solo antes de ejecutar. | **(a)**, y para tus programas de demostración (como `u5-switch-sin-break-fallthrough`) un parámetro del enlace que lo cambia a (b) y deja que el grupo lo descubra. |
| PR-5 | ¿Confirmas la lista de 31 temas (design §4.2) y publicarla en **dos oleadas**? | **Sí:** primero los 16 que nombraste y sus vecinos —U5 completa (decisión, `if`/`else`, `else if`, decisiones anidadas, `switch`, comparar textos), U6 completa (qué es un ciclo, `while`, `do-while`, `for`, incrementales y decrementales, contador/acumulador/bandera, anidados, `break`/`continue`, error por uno y ciclo infinito) e incremento y decremento de U4— y después los 15 restantes de U3, U4 y U7. |
