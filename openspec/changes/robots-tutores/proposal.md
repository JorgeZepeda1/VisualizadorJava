# Propuesta: Robots tutores — pantalla, robot paso a paso con modo reto, robot del libro y robot revisor (`robots-tutores`)

> Fase `sdd-propose`, **actualización 1** · 2026-10-17 · Roles: **Diseñador Pedagógico** y **Arquitecto**. Base: el plan anterior del mismo día (49 tareas en R1 revisor → R2 reto → R3–R4 libro), el **panel de expertos 1** (`panel-1.md` y sus anexos `panel-1-disenador.md`, `panel-1-maestro.md`, `panel-1-java.md`) y las **respuestas del PO del 2026-10-17** (`panel-1.md` §3). Lo comprobado contra el código o el corpus va marcado **[verificado hoy]**.
>
> **Tamaño:** la plantilla de la fase pide menos de 450 palabras; como en `visualizador-java`, el orquestador pidió el nivel de detalle que deja a `sdd-apply` sin decisiones abiertas. Esta propuesta dice el qué y el porqué; el cómo vive en `design.md`.

## 0. Decisiones del PO (vinculantes)

| # | Fecha | Decisión |
|---|---|---|
| R-D1 | 2026-10-17 | **Robot revisor = errores y trampas de Java**: explica los errores y avisos que ya existen y avisa de cinco trampas que compilan (`;` tras la condición, `==` con `String`, `case` sin `break`, `nextInt()` + `nextLine()`, división entera). Sin comentarios de estilo. |
| R-D2 | 2026-10-17 | **Robot paso a paso = narrador y modo reto**: interruptor; en cada `if`, `while`, `for` y `switch` el robot se detiene con **3 opciones** y explica el acierto y el error. Solo condiciones. (Su nombre visible deja de ser «programador»: el programador es el alumno, panel H16.) |
| R-D3 | 2026-10-17 | **Robot del libro**: temas de U3–U7 con ejemplos que se abren en el visualizador y acceso desde el código. Claude redacta; el PO aprueba cada tema antes de publicarlo. |
| R-D4 | 2026-10-17 | Primero se publica el hito 3 (GitHub Pages); los robots van después. |
| R-D5 | 2026-10-17 | **Tres robots distintos, cada uno con su personaje.** Del diseñador quedan como requisitos: un solo robot habla a la vez; cada uno se reconoce por su forma y su accesorio además del color; quien habla aparece siempre en el mismo lugar; nada de un robot (ni su retrato) dentro del globo de otro. |
| R-D6 | 2026-10-17 | **El grupo estará en U6.** El modo reto con ciclos va antes que el revisor, y los temas de U6 con sus requisitos (`comparaciones`, `operadores-logicos`, `entrada-con-scanner`, `division-entera-y-modulo`) encabezan la primera oleada del libro. |
| R-D7 | 2026-10-17 | **Mejorar la pantalla antes del reto, en un hito propio (R0):** saludo con tres puertas, navegación «Paso a paso · Libro · Ejemplos», Anterior y Siguiente debajo del globo, «Siguiente» como acción primaria, distribución de celular y **modo proyector** (absorbe la tarea 5.5 de `visualizador-java`) con la distribución «reto proyectado» que midió el diseñador. |
| R-D8 | 2026-10-17 | Las correcciones C1–C9 de `panel-1.md` §2 se publican aparte como `v0.3.1`. **Este plan las da por hechas** y no las repite. |

Siguen D1–D7 de `visualizador-java`. **D2** (nunca un resultado inventado) gobierna a los tres robots; **D4** (predicción) se enmienda: el modo reto la reemplaza (PR-1, resuelta abajo).

## 1. Lo que se adopta por omisión (panel 1, §4 y §5; el PO puede cambiarlo)

| Tema | Qué se adopta | Hito |
|---|---|---|
| Voz | Tercera persona en los tres robots: «Java revisa…», «Java guarda…» (el robot señala lo que hace la máquina; Pea 1986) | R0 |
| Vocabulario | `true`/`false` siempre como código; «vuelta» para cada repetición de un ciclo; «trampa de Java» en vez de «trampa» | R0, R3 |
| Reto | Opciones «consecuencia, porque razón» (≤ 100 caracteres), teclas 1–3, elegir confirma, «¿Y las otras opciones?», el «por qué» con la sustitución del motor, la retroalimentación **reemplaza** la narración del paso; sin reto en condiciones constantes ni en las que leen del teclado o de `Random`; «Ya entendí este ciclo» silencia también lo de adentro y vuelve a preguntar en las dos últimas revisiones | R1 |
| Distractores | Catálogo del maestro: sin `y-revisa-los-dos` ni `otra-etiqueta`; nuevas `rango-al-reves`, `escalera-elige-la-mejor`, `sale-y-termina-el-programa`, `el-ciclo-cuenta-solo`, `for-actualiza-primero`; **balance**: el veredicto correcto se repite en otra opción solo en el 40–60 % de los retos (si no se logra, forma C) | R1 |
| Libro | 34 temas; cada tema empieza por el ejemplo («¿Qué crees que imprime?») y termina con «Ponte a prueba» y «Ahora hazlo tú»; 400 palabras como meta y 550 como máximo; ningún ejemplo fuera del subconjunto | R0 (borradores), R2, R4 |
| Revisor | Pistas graduadas (dónde mirar → «Ver explicación» → la evidencia en la ejecución); con el reto encendido espera a la ejecución en las trampas que adelantarían una respuesta; programas de demostración en «después»; ajustes E2, E3, E4, E7 y E8 del experto en Java (enmienda de REQ-REV-003) | R3 |
| Entrada preparada | Cada renglón termina en salto de línea, como en NetBeans **[verificado hoy: las 20 `.entrada.txt` de `curso/` y `ejercicios-del-po/` ya terminan en `\n`]** | R0 |

**Lo que más trabajo agrega** (para que el PO lo sepa antes de aprobar):

- **La voz «Java revisa…»** reescribe el catálogo del narrador (`textos/es-MX/explicaciones.ts` y sus pruebas): ≈ 1 sesión en R0. **[verificado hoy]** `v0.3.1` conserva «Reviso…».
- **«Ponte a prueba» y «Ahora hazlo tú»** suman ≈ 4 programas por tema con su golden (≈ 150 programas en el libro) y ≈ 40 % más de redacción y de revisión del PO.
- **El balance del 40–60 %** vuelve más complejo el constructor del reto y trae el riesgo de pasar a la forma C (dos tiempos).
- **«Ya entendí» con lo de adentro y las dos últimas revisiones** pide que la vista sepa qué está dentro de cada ciclo y que la presentación mire hacia adelante en la traza.
- **La navegación «Ejemplos» de R0** obliga a adelantar la parte curricular de la galería (tarea 5.2) con 36 líneas de «Qué observar» que revisa el PO.

## 2. Intención

**Problema.** Hoy el robot narra cada paso con datos del motor, pero (1) un alumno nuevo no sabe por dónde empezar y el botón que más usa está lejos del robot; en proyector y en celular el reto no cabe (diseñador H1–H3); (2) mirar la condición no obliga a predecirla (Naps 2002); (3) para repasar un tema hay que salir de la herramienta y nadie le pide al alumno escribir código (PRIMM incompleto, maestro H1); (4) los errores que **sí compilan** pasan sin aviso.

**Principio rector.** Todo lo que dicen los robots sale de lo que el motor calculó o de una regla verificada contra el JDK 17 real. Cada robot tiene una tarea y un personaje; habla uno a la vez, siempre en el mismo lugar.

| Robot (nombre por confirmar, PQ-1) | El alumno podrá… | Error conceptual que ataca |
|---|---|---|
| **Paso a paso** (narrador + reto) | Predecir y justificar qué hace cada condición antes de verla | Frontera (#6), valor de la vuelta anterior, `while` que no entra, `if` que «vigila», `\|\|`/`&&` (#15), escalera, `switch` sin `break` (#11), `==` con `String` (#4) |
| **Del libro** | Repasar un tema empezando por un ejemplo, predecirlo, modificarlo y crear uno propio | Todos los de U3–U7 |
| **Revisor** | Entender por qué Java rechaza su programa y reconocer cinco trampas de Java que compilan | #1, #4, #8, #11, #12 |

## 3. Alcance

### 3.1 Dentro, por hito (cada uno se usa por sí solo)

| Hito | Entregable |
|---|---|
| **R0 Pantalla y personajes** | Saludo del robot paso a paso con las puertas «Leer un tema», «Ver un ejemplo paso a paso» y «Probar mi programa» (cada una aparece cuando su destino tiene contenido); navegación «Paso a paso · Libro · Ejemplos»; ranura de acciones bajo el globo con «◀ Anterior · Siguiente ▶» y «Siguiente» primario; un dueño por dato y las pistas H7–H9; fin del recorrido con siguientes pasos; distribución de celular; **modo proyector** (5.5) con la base «reto proyectado»; «Ajustes de la clase»; **galería «Ejemplos»** con los 35 programas de `corpus/curso/` y la máquina de snacks del PO; **tres personajes** y un solo hablante (el revisor ya presenta los errores de compilación de hoy); **voz «Java revisa…»** en el narrador; modelo del libro, ejemplos con el oráculo y **borradores de U6 (parte 1)**. |
| **R1 Modo reto** | Interruptor «Modo reto»; tres tarjetas «consecuencia, porque razón» antes de cada condición y selección de `switch` (salvo las constantes, las que leen del teclado o de `Random` y las que no tienen sustitución); catálogo de familias del maestro con balance; retroalimentación ✔ ◐ ✖ que reemplaza la narración, «¿Y las otras opciones?»; «Ya entendí este ciclo»; columna exclusiva del reto en proyector y celular; **borradores de U6 (parte 2)**. Absorbe la 5.1 (D4). |
| **R2 Libro, oleada 1 (21 temas)** | Sección «Libro» completa (índice, temas con su estructura, «Ponte a prueba», «Ahora hazlo tú», ejemplos que se abren en el visualizador, «Ponerme a prueba» con el reto encendido); accesos en contexto; aprobación con huella; los 10 temas de U6 primero, sus 5 requisitos y los 6 de U5, aprobados por el PO. |
| **R3 Robot revisor** | Porqué de los errores y avisos existentes (con el hecho del `;` de la E2); cinco trampas de Java con los ajustes E3, E4, E7 y E8; cero falsos positivos medidos; pistas graduadas; espera con el reto; programas de demostración en «después»; enlaces al libro. |
| **R4 Libro, oleada 2 (13 temas)** | Solo contenido: U3, el resto de U4 y U7, aprobados por el PO. |

### 3.2 Fuera (de este cambio)

- Comentarios de estilo y trampas fuera de las cinco familias (`if (b = true)`, `else` colgante): cada una, después, con su ADR.
- Retos sobre valores de variables, sobre la caída de un `switch` o en el nivel Detallado; el «reto difícil» que oculta las variables (maestro §7, después de R4).
- Calificaciones, conteo guardado de aciertos, cuentas o telemetría (D1). Voz o audio de los robots.
- Reescribir los mensajes de error existentes (tarea 1.28): el revisor les agrega el porqué.
- La parte de autoría de la galería (5.2 + 5.3 de `visualizador-java`) y el enlace compartible (5.4): siguen en ese cambio; aquí solo se agregan los parámetros `reto` y `revisor`.

## 4. Capacidades (contrato con `sdd-spec`)

`openspec/specs/` sigue vacío (`visualizador-java` no se ha archivado): las deltas se escriben contra `openspec/changes/visualizador-java/specs/<capacidad>/spec.md` y se aplican después de su archivo.

### New Capabilities
- `pantalla-y-personajes`: saludo con puertas, navegación, ranura de acciones, un dueño por dato, celular, ajustes de la clase, fin del recorrido, tres robots, un solo hablante y la voz de los robots.
- `modo-reto`: dónde pregunta y dónde no, tres opciones con una sola correcta del motor, catálogo, balance, retroalimentación, ciclos, navegación, tarjetas accesibles y proyectables.
- `libro-de-temas`: 34 temas con su estructura, ejemplos del oráculo dentro del subconjunto, «Ponte a prueba» y «Ahora hazlo tú», abrir en el visualizador, acceso en contexto, aprobación con huella, peso y accesibilidad.
- `robot-revisor`: porqué de los problemas existentes, cinco trampas como hechos, cero falsos positivos, confirmación con pérdida real y pistas graduadas.

### Modified Capabilities
- `visualizador-paso-a-paso`: REQ-VIS-013 (la predicción Sí/No pasa a ser el modo reto). El REQ-VIS-014 del plan anterior se mueve a `pantalla-y-personajes` (REQ-PANT-008 y 009).
- `uso-en-aula`: REQ-AULA-001 (galería con entrada preparada y programas de demostración), REQ-AULA-002 (enlace con `reto` y `revisor`), REQ-AULA-004 (proyector con la distribución «reto proyectado») y REQ-AULA-005 (escenario docente con tres opciones).
- `verificacion-diferencial`: REQ-DIFF-009 (corpus de los robots, ejemplos y soluciones del libro, todos contra el JDK y dentro del subconjunto).

## 5. Enfoque y orden de los hitos

Sin capas nuevas ni dependencias (ADR 001): el **motor** agrega hechos que la interfaz no puede calcular sin reevaluar Java (piezas de la condición, relación numérica, «mismo texto», si una condición admite reto, qué está dentro de cada ciclo, estructura de `if`/`switch`, trampas y sus hechos); **presentación** decide quién habla y compone pantalla, reto, libro y revisor; **textos** guarda cada frase (ADR 015); **interfaz** dibuja personajes, ranuras, distribuciones y el libro diferido.

| Hito | Por qué en este lugar | Criterios | Tareas | Sesiones (estim.) |
|---|---|---|---|---|
| R0 Pantalla y personajes | R-D7: el reto no cabe sin la ranura bajo el globo, la columna exclusiva ni el proyector; el alumno nuevo necesita las puertas. Es útil solo: mejor primera vez, galería y proyector para la clase de U6 aunque el reto no llegue | CR1–CR3, CR13, CR15 | 16 | 3–4 |
| R1 Modo reto | R-D6: el grupo en U6; frontera, vuelta anterior y `while` que no entra son el centro de U6 | CR4–CR7, CR13–CR15 | 19 | 3–4 |
| R2 Libro, oleada 1 | Los borradores de U6 empiezan en R0, así que llegan listos; el libro da a U6 el «Modificar» y el «Crear» de PRIMM que hoy no tiene nadie | CR8, CR9, CR13, CR15 | 14 | 3 + revisión del PO |
| R3 Robot revisor | En U6 pesan menos trampas que temas (la 1 en ciclos, la 4 en ciclos, la 2 en menús); sus enlaces al libro ya tienen destino publicado | CR10–CR13, CR15 | 18 | 3 |
| R4 Libro, oleada 2 | Solo contenido, para U3, U4 y U7 | CR8, CR13, CR15 | 5 | 1–2 + revisión del PO |
| **Total** | | | **72** | **13–17** |

**Calendario de U6.** Si el grupo llega a U6 antes de cerrar R1, R0 ya le da la galería con los 10 programas de U6, el proyector y el narrador con la voz nueva. La prueba en papel de los cuatro retos de la máquina de snacks (R1.0, la «R2.0» del panel) se puede hacer durante R0. Una sola verificación por hito, **con el panel de expertos dentro de ella**.

## 6. Áreas afectadas

| Área | Impacto | Descripción |
|---|---|---|
| `src/interfaz/{componentes,contenedores,estado,estilos,editor}/` | Modificado/Nuevo | Personajes, saludo, navegación, ranura, ajustes, galería, tarjetas del reto, libro, franja y marca del revisor; distribuciones escritorio/celular/proyector/reto |
| `src/interfaz/datos/` | Nuevo | Únicos `import.meta.glob(…?raw)` de `corpus/curso`, `corpus/experimentos/ejercicios-del-po` y `corpus/libro` (diferidos) |
| `src/presentacion/{hablante,galeria,reto,reto/*,libro,revisor}.ts`, `modelo-vista.ts` | Nuevo/Modificado | Quién habla, ranura, reto, libro, revisor |
| `src/textos/es-MX/{explicaciones,robot,pantalla,galeria,reto,revisor}.ts`, `textos/es-MX/libro/` | Modificado/Nuevo | Voz «Java…», pantalla, «Qué observar», reto, revisor, 34 temas |
| `src/motor/{ir,interprete,traza}/`, `src/motor/revision/` | Modificado/Nuevo | Hechos y piezas, condiciones en la vista, estructura de `if`/`switch`, contención; pasada de trampas; hecho del `;` en los errores |
| `corpus/experimentos/{reto,trampas}/`, `corpus/libro/`, `corpus/trampas-esperadas.json` | Nuevo | Respaldo de reglas, muestras y ejemplos con goldens del oráculo |
| `herramientas/oraculo/generar-goldens.ts`, `herramientas/presupuesto-tamano.ts`, `herramientas/libro-huella.ts` | Modificado/Nuevo | Recorre `corpus/libro`; límite por fragmento; huella |
| `pruebas/{e2e,propiedades,diferencial,revisor,libro}/` | Nuevo | Flujos, propiedad y balance del reto, ejemplos, etiquetas |
| `docs/adr/017…020` | Nuevo | Pantalla y personajes, modo reto (enmienda D4), libro, revisor |

## 7. Criterios de éxito (medibles)

| # | Hito | Criterio |
|---|---|---|
| CR1 | R0 | **Primera vez:** solo con teclado, desde el saludo se llega al paso 1 de un ejemplo de la galería en ≤ 3 acciones; el robot y «Siguiente» se ven sin desplazar a 1366×768, 1280×720, 1024×768, 390×844 y 320 px; sin desplazamiento horizontal a 320 px. |
| CR2 | R0 | **Proyector:** código ≥ 24 px; nada se encima ni se corta a 1024×768 y 1280×720; 0 violaciones graves o críticas de axe en saludo, visualización, error, galería y proyector, en Chromium, Firefox y WebKit. |
| CR3 | R0 | **Un hablante:** en todos los estados de la suite E2E hay exactamente un robot en la zona de explicación y ninguno dentro de un globo; los tres personajes tienen silueta (`data-forma`) y accesorio distintos y el PO aprobó su maqueta en escala de grises. |
| CR4 | R1 | **Reto en todo el corpus ejecutable:** en el 100 % de los pasos de condición y de selección que admiten reto, 3 opciones distintas, exactamente una verdadera según el verificador de afirmaciones, cada distractor con al menos una afirmación falsa y ningún valor que el motor no calculó; los pasos sin reto llevan su motivo del motor (constante, lee entrada, azar, con efectos o sin sustitución). |
| CR5 | R1 | **Balance:** en los retos de dos veredictos del corpus, el de la correcta aparece en otra opción en el 40–60 %; `pieza-volteada` ≤ 20 % de los retos; `if-como-ciclo`/`if-espera` ≤ 1 de cada 3 retos de `if` de un mismo programa. |
| CR6 | R1 | **Clase:** MaquinaSnacks `a1 2 50` presenta exactamente 4 retos (líneas 24, 53, 66 y 72) con los textos aprobados por el PO, contestables solo con teclado; a 1024×768, 1280×720 y 390×844 la pregunta, las 3 tarjetas, el porqué y «Siguiente» se ven sin desplazar; axe sin graves ni críticas. |
| CR7 | R1 | **Cansancio:** con «Ya entendí este ciclo» en su primera revisión, `u6-contador-de-pares` solo vuelve a preguntar en las dos últimas revisiones de ese ciclo (ningún `if` de adentro mientras tanto). |
| CR8 | R2, R4 | **Libro:** 100 % de los programas del libro (ejemplos, errores típicos, «Ponte a prueba» y soluciones de «Ahora hazlo tú») idénticos al oráculo y sin ningún aviso de fuera de alcance; cada tema con sus 8 secciones y ≤ 550 palabras; 0 temas publicados sin huella vigente; cada fragmento del libro ≤ 80 KB gzip. |
| CR9 | R2 | **Cobertura:** el 100 % de los `if`, `switch`, `while`, `do` y `for` de la galería y del corpus ejecutable lleva a un tema publicado. |
| CR10 | R3 | **Cero falsos positivos:** en los 60 programas del corpus curricular lo detectado es **exactamente** `corpus/trampas-esperadas.json` (revisado por el PO). **[verificado hoy, plan anterior]** solo `u5-switch-sin-break-fallthrough` tiene trampas. |
| CR11 | R3 | 100 % de las muestras positivas de `corpus/experimentos/trampas/` (≥ 3 por familia, incluidas las formas de E3, E4 y E7) y 0 de las casi-trampas (≥ 2 por familia, incluidas la «basura» de E3 y las de E8), todas con el oráculo. |
| CR12 | R3 | La confirmación sale solo con pérdida real (E8) y en el paso donde se manifiesta, citando solo valores del motor; el error de las formas de la trampa 1 que no compilan dice el hecho del `;` (E2). |
| CR13 | todos | Textos de cada hito en el catálogo es-MX (0 fuera de él) con la voz y el vocabulario de §1, revisados por el PO sin observaciones bloqueantes. |
| CR14 | R1 | Con piezas y hechos en los pasos de condición, C11 se mantiene: 100 000 pasos Normal ≤ 1 s y cambiar de paso ≤ 100 ms (p95). |
| CR15 | todos | Total ≤ 500 KB gzip (REQ-PLAT-003) medido al cerrar cada hito; hoy **314 KB**; previsto ≈ 420–435 KB al terminar (design §7). |

## 8. Riesgos

| Riesgo | Prob. | Mitigación |
|---|---|---|
| Tres personajes compiten por la atención del principiante (lo que temía el diseñador) | Media | Un solo hablante en un solo lugar; las puertas muestran el accesorio, no tres caras; el panel lo revisa en la verificación de R0 con la pantalla real |
| El catálogo no alcanza el balance 40–60 % | Media | Familias de veredicto contrario primero cuando aplican las dos; regla de balance dentro de la traza; si la propiedad no pasa, se detiene el hito y el PO elige entre ajustar el catálogo o la forma C (design §4.5) |
| R0 crece (galería, voz nueva, tres distribuciones, borradores) y retrasa el reto | Media | La galería solo con el corpus curricular ya verificado; la parte de autoría sigue en 5.2/5.3; los borradores son una pista de contenido en paralelo |
| La puerta «Leer un tema» y «Libro» no existen hasta R2 | Alta (por diseño) | Aparecen solas cuando hay un tema publicado; el PO puede adelantar 3 temas (PQ-2) |
| Volumen del libro: 34 temas × 8 secciones + ≈ 150 programas + revisión del PO | Alta | Borradores desde R0; U6 primero; aprobación por tema con huella; dos oleadas |
| Peso: margen de ≈ 65–80 KB al final | Media | Libro y galería diferidos y con límite por fragmento; medición en cada hito; si el total pasa de 470 KB, el PO decide qué se recorta (design §7) |
| Un distractor confunde en vez de enseñar | Media | Catálogo del maestro; prueba en papel en clase (R1.0); revisión del PO al **inicio** de R1, no al cierre |
| «Ya entendí» con entrada en vivo no sabe cuáles son las dos últimas revisiones | Baja | Sigue silenciado hasta que la traza las tenga (maestro H2) |
| La regla 4 extendida a ciclos introduce un falso positivo | Media | Solo sentencias simples en el nivel superior del cuerpo; lo demás, límite conocido documentado; muestras y casi-trampas con el oráculo |
| Choque con el lote 5 de `visualizador-java` | Media | Lista de conciliación (§13) |

## 9. Plan de reversión

- Cada hito se publica con su etiqueta `vX.Y.Z`; revertir = desplegar la etiqueta anterior (`desplegar.yml`) o `git revert` del merge del hito.
- Sin datos que migrar. Los parámetros `reto` y `revisor` de un enlace que una versión anterior no conoce se ignoran con el aviso de versión (ADR 014).
- Reto y revisor no tocan la ejecución (la traza es idéntica con y sin ellos, prueba de propiedad); la pantalla de R0 cambia la distribución, no el motor.
- Disparadores: una trampa reportada en un programa sin ella, un reto con dos opciones verdaderas, un ejemplo del libro distinto al JDK, dos robots hablando a la vez o un estado que no cabe en proyector → revertir y corregir empezando por su prueba.

## 10. Dependencias

- Hito 3 publicado y PR #3 fusionado (R-D4); `v0.3.1` con C1–C9 publicada (R-D8).
- `visualizador-java` sin archivar: sus specs son la base de las deltas.
- JDK 17.0.18 para los goldens de `corpus/experimentos/{reto,trampas}/` y `corpus/libro/`.
- Respuestas del PO a PQ-1 (antes de R0.5) y PQ-2 a PQ-5 (§12).

## 11. Definición de Terminado (cada hito)

La de `visualizador-java` `proposal.md` §13, más: (a) los textos de los robots, de la pantalla, de la galería y del libro los revisa el PO antes de publicarse (el libro, tema por tema con huella); (b) ninguna afirmación de un robot sin su dato del motor o su regla respaldada por un programa del oráculo; (c) **una sola verificación por hito**: `sdd-verify` con el panel de expertos (diseñador, maestro, experto en Java) sobre la pantalla real, sin `judgment-day` salvo que la verificación lo pida.

## 12. Preguntas abiertas para el PO

| # | Pregunta | Recomendación |
|---|---|---|
| PQ-1 | **Nombres y apariencia de los tres robots.** Bloquea R0.5. | **Nombres por su tarea:** «Robot paso a paso», «Robot revisor» y «Robot del libro» (al principiante le importa qué hace cada uno; el maestro pidió «paso a paso»). **Apariencia** (silueta + accesorio + color, en ese orden de importancia): *paso a paso* = el robot de hoy, cabeza cuadrada con antena, con un puntero ▶ como el marcador del editor (en el reto sostiene un letrero «?»), azul; *revisor* = cabeza redonda tipo casco, con una lupa con «!» igual a la marca de trampa del editor, ámbar; *del libro* = cabeza ancha con lentes, con un libro abierto, verde. Alternativa: que el grupo les ponga nombre propio en la primera clase («Bit, el robot paso a paso»); solo cambia el catálogo. |
| PQ-2 | La puerta «Leer un tema» y la sección «Libro» no tienen destino hasta R2. ¿Aparecen hasta entonces? | **Sí:** cada puerta aparece cuando su destino tiene contenido publicado. Alternativa: adelantar a R0 tres temas de U6 (`while`, `for`, `error-por-uno-y-ciclo-infinito`): +2 sesiones en R0 y tu revisión antes del reto. |
| PQ-3 | Oleada 1 de **21** temas (los 10 de U6, sus 5 requisitos y los 6 de U5) y oleada 2 de 13. El panel decía 20 + 14 con `u6-repetir-hasta-que-el-usuario-quiera` en la segunda. | **21 + 13:** R-D6 pone toda U6 primero. |
| PQ-4 | Calendario: ¿cuándo empieza U6 el grupo y en qué clase haces la prueba en papel de R1.0 (20 min)? | R1.0 durante R0, en la primera clase de U5–U6 que tengas; con la fecha de U6 se decide si conviene publicar R0 solo o esperar a R1. |
| PQ-5 | En «Ahora hazlo tú», ¿el alumno ve la solución de referencia o solo la salida esperada? | **Solo la salida esperada** en v1 («Para comprobar: con la entrada 5 debe imprimir…», del golden); la solución queda en `corpus/libro/` para el docente. |
| PQ-6 | El diseñador pide que la sustitución viva solo en el panel de condición (H7); el maestro la pone en la narración (T1). | **La narración la conserva** (es lo que lee el lector de pantalla y lo que se ve en el proyector) y el panel da el detalle por pieza; «un dueño por dato» se aplica al número de vuelta y al vocabulario. Durante el reto el panel se oculta hasta responder. |

**Resueltas** con la recomendación del plan anterior y los ajustes del panel (`panel-1.md` §4–§5): **PR-1** el reto reemplaza la predicción Sí/No (D4 conserva «apagado por omisión», el interruptor y el enlace; al abrir por segunda vez un ejemplo del libro se sugiere encenderlo); **PR-2** forma (A) «consecuencia, porque razón» con balance y salida a (C); **PR-3** cada revisión + «Ya entendí este ciclo» con los tres ajustes de H2; **PR-4** pistas graduadas, espera con el reto y demostraciones en «después»; **PR-5** 34 temas en dos oleadas (ver PQ-3).

**Respuestas del PO (2026-10-19):** «sigue las recomendaciones de cada pregunta».

- **PQ-1:** nombres por tarea, «Robot paso a paso», «Robot revisor» y «Robot del libro», con la apariencia recomendada (paso a paso: cabeza cuadrada con antena, puntero ▶ y letrero «?» en el reto, azul; revisor: cabeza redonda tipo casco con lupa con «!», ámbar; del libro: cabeza ancha con lentes y libro abierto, verde). R0.1 queda cerrada con esta respuesta y R0.5 se desbloquea.
- **PQ-2:** cada puerta aparece cuando su destino tiene contenido publicado; «Leer un tema» y «Libro» llegan con R2.
- **PQ-3:** oleadas de 21 y 13 temas.
- **PQ-4:** sin fecha de inicio de U6. Supuesto: U6 empieza pronto, así que R0 se publica en cuanto pase su verificación, sin esperar a R1, y R1 arranca enseguida. La prueba en papel (R1.0) la hace el PO en su primera clase de U5–U6, durante R0.
- **PQ-5:** «Ahora hazlo tú» muestra solo la salida esperada; la solución queda en `corpus/libro/` para el docente.
- **PQ-6:** la narración conserva la sustitución y el panel de condición da el detalle por pieza.
- **Ejercicios:** «Ponte a prueba» y «Ahora hazlo tú» en todos los temas.

## 13. Conciliación pendiente en `openspec/changes/visualizador-java/tasks.md` (la hace el orquestador; este cambio no edita ese archivo)

| Tarea | Qué cambia |
|---|---|
| **5.1** Predicción ligera (D4) | Queda absorbida por R1 (REQ-VIS-013 modificado; ADR 018 enmienda D4). Se marca «absorbida por `robots-tutores` R1». |
| **5.2** Galería curricular | Su parte curricular (programas de `corpus/curso/` y de `ejercicios-del-po/`, «Qué observar», `cargar-programa` con entrada preparada) la entrega R0.11. La 5.2 se reduce a agregar `corpus/autoria/` (tras la 5.3) y la marca «de autoría», sobre el componente de R0. |
| **5.4** Enlace compartible | Codifica `reto` (en lugar de `prediccion`) y `revisor` (`al-inicio`/`despues`) además de lo suyo. Si la 5.4 se hace antes, R1.15 y R3.16 agregan los parámetros; si se hace después, son parte de su contrato. |
| **5.5** Modo proyector | Absorbida por R0.12 (con la distribución «reto proyectado» y su activación en «Ajustes de la clase»); R1.14 agrega la columna exclusiva del reto. Se cierra cuando cierre R0. |
| **5.6** Escenario docente E2E | Sí/No → tres opciones con «Ya entendí este ciclo»; depende de R0 (galería y proyector) y R1 (reto) en lugar de 5.1, 5.2 y 5.5. |
| 5.7, 5.8 y 5.10 (de paso) | El precache y la prueba sin red incluyen la galería de R0 y el libro de R2; la auditoría AA completa incluye saludo, galería, tarjetas del reto, libro y franja del revisor. |
