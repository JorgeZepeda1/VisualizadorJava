# Tareas: Robots tutores (`robots-tutores`)

> Fase `sdd-tasks`, **actualización 1** · 2026-10-17. Fuente: `design.md` (§2 pantalla, §3 robots, §4 reto, §5 libro, §6 revisor, §7 peso, §8 pruebas, §10 hitos), `specs/*/spec.md` (42 requisitos: 37 nuevos y 5 modificados; 100 escenarios), `proposal.md` (R-D1–R-D8, CR1–CR15, §11 Definición de Terminado, §12 PQ-1–PQ-6) y el panel 1.
>
> **Tamaño:** como en `visualizador-java/tasks.md`, cada tarea trae su RED, su GREEN, sus archivos y su verificación para que `sdd-apply` no reabra el diseño; por eso pasa del presupuesto de la plantilla. **72 tareas en 5 hitos**, cada uno usable por sí solo y con **una sola verificación** que incluye al panel de expertos. Reemplaza el plan anterior de 49 tareas (R1 revisor → R2 reto → R3–R4 libro).

## Convenciones

- **TDD estricto** (`strict_tdd: true`): toda tarea de código es RED (prueba nueva que falla por una razón concreta, **ejecutada**) → GREEN (lo mínimo, confirmado por ejecución) → REFACTOR («ninguno relevante» si no aplica). Las tareas de documento (ADR) y de proceso (PO, panel) no llevan RED. Las de contenido del libro sí: su RED es la prueba del índice que exige ese tema.
- **Comandos base** (no se repiten): `npm test -- <patrón> --reporter=dot` · `npm run test:oraculo` · `npm run e2e -- <patrón> --reporter=dot` · `npm run lint` · `npm run tipos` · `npm run oraculo:goldens` (JDK 17.0.18). Nunca `npm run build` suelto (regla 8): el peso se mide en `npm run ci` al cerrar el hito, y las E2E «sin red» lo exigen de forma explícita.
- **Datos del JDK solo del oráculo** (ADR 010): todo golden de `corpus/experimentos/{reto,trampas}/` y `corpus/libro/` lo genera `oraculo:goldens`.
- **Textos** solo en `src/textos/es-MX/` (ADR 015), con la voz y el vocabulario de REQ-PANT-010; identificadores en español ASCII (ADR 002); la matriz de capas no cambia (ADR 001); `import.meta.glob` solo en `src/interfaz/datos/`.
- **Dependencias:** dentro de un hito, secuenciales por número salvo nota; las de contenido (borradores) son una pista en paralelo.
- **Cierre de cada hito:** una verificación (`sdd-verify` + panel de expertos sobre la pantalla real) → el PO revisa los textos nuevos → `npm run ci` (peso) → commit con confirmación EXPLÍCITA del PO (conventional commits, sin atribución de IA) → `state.yaml`.

## Hito R0 — Pantalla y personajes

**Objetivo:** un alumno nuevo sabe por dónde empezar; «Siguiente» está junto al robot; la pantalla cabe en celular y en proyector; los tres robots existen y habla uno a la vez; la galería ofrece los programas del curso; empiezan los borradores de U6.
**Entrada:** hito 3 publicado y PR #3 fusionado (R-D4); `v0.3.1` publicada (R-D8). **Sesiones:** 3–4.

**R0.1 El PO elige los tres robots** · proceso — REQ-PANT-008 · PQ-1 — ✅ hecha (2026-10-19: el PO aprobó la recomendación de PQ-1 sin cambios)
- Maqueta en escala de grises de las tres siluetas, accesorios y nombres (design §3.1, recomendación de PQ-1); el PO aprueba o cambia nombres y apariencia. Se puede hacer en paralelo a R0.2–R0.4; bloquea R0.5.

**R0.2 ADR 017 — Pantalla y tres robots** · documento — ✅ hecha (2026-10-19)
- `docs/adr/017-pantalla-y-tres-robots.md`: ranura de acciones, un hablante y su turno, puertas con destino, distribuciones y proyector (absorbe 5.5), galería curricular (adelanta parte de 5.2), `import.meta.glob` solo en `interfaz/datos`, PQ-6; alternativas: un robot con tres papeles, pantalla de inicio aparte, mini retrato en el globo.

**R0.3 Voz «Java revisa…» y vocabulario** — REQ-PANT-010, REQ-PANT-004 — ✅ hecha (2026-10-19)
- RED `textos/es-MX/voz.test.ts` (rechaza `Reviso`, `Guardo`, `verdadero`, `falso`, `es falso`, `iteración`, `revisión N` en el catálogo de los robots) + `textos/es-MX/explicaciones.test.ts` (T1 de la línea 72 de MaquinaSnacks y T2 con «Terminó la vuelta 2…», sin piezas todavía) + `robot.test.ts` (T3 del paso 0); fallan con los textos de hoy.
- GREEN: `textos/es-MX/{explicaciones,robot}.ts` con las plantillas T1–T3 y menores del maestro (§4), `presentacion/robot.ts` pasa la sustitución completa que ya existe.
- Verif: `textos/es-MX` · `presentacion/robot`

**R0.4 Textos de la pantalla** — REQ-PANT-001, 002, 004, 006, 007 — ✅ hecha (2026-10-19)
- RED `textos/es-MX/pantalla.test.ts`: saludo, tres puertas, navegación, consola vacía, aviso de edición durante la visualización, leyenda ▶/▷, «Paso N» con y sin total, «Ajustes de la clase» y sus estados en palabras, acciones del fin; sin marcadores; falla (módulo inexistente).
- GREEN: `src/textos/es-MX/pantalla.ts` (borradores para la revisión del PO en R0.16).
- Verif: `textos/es-MX/pantalla`

**R0.5 Tres personajes** — REQ-PANT-008 · depende: R0.1 — ✅ hecha (2026-10-19)
- RED `componentes/Robot.test.tsx`: `personaje` `paso-a-paso` | `revisor` | `libro` con `data-forma` y accesorio distintos, mismo `viewBox`, nombre visible y accesible del catálogo, cada ánimo en cada cabeza, sin animación con movimiento reducido; falla.
- GREEN: `Robot.tsx` con las tres figuras aprobadas, `textos/es-MX/robot.ts` (nombres), estilos.
- Verif: `interfaz/componentes/Robot`

**R0.6 Un solo hablante** — REQ-PANT-009 — ✅ hecha (2026-10-19)
- RED `presentacion/hablante.test.ts` (error de compilación, aviso y arranque → revisor; libro → libro; lo demás → paso a paso) + `componentes/Explicacion.test.tsx` (exactamente un `[data-personaje]` en la zona; al cambiar de hablante la región `aria-live` empieza con su nombre, y no lo repite si no cambió); falla.
- GREEN: `presentacion/hablante.ts`, `ModeloVista.hablante`, `Explicacion.tsx` (fundido de 150 ms solo con `prefers-reduced-motion: no-preference`).
- Verif: `presentacion/hablante` · `interfaz/componentes/Explicacion`

**R0.7 Estado: secciones, saludo, ajustes y programas cargados** — REQ-PANT-001, 002, 006; REQ-AULA-001 — ✅ hecha (2026-10-19)
- RED `estado/reductor.test.ts`: `ir-a-seccion` no pierde programa ni paso; `saludo` hasta la primera acción; `cambiar-ajuste` (proyector, velocidad) sin perder el paso; `cargar-programa { codigo, entradaPreparada, origen }` guarda el programa anterior y `volver-a-mi-programa` lo restaura; `visualizar` usa `entradaPreparada`; falla.
- GREEN: `estado/reductor.ts` (design §2.2), `contenedores/Visualizador.tsx` deja de fijar `entradaPreparada: ''`.
- Verif: `interfaz/estado` · `interfaz/contenedores`

**R0.8 Saludo con puertas, navegación y ajustes de la clase** — REQ-PANT-001, 002, 006 · PQ-2 — ✅ hecha (2026-10-19)
- RED `presentacion/ranura.test.ts` (puertas solo con destino: sin temas publicados no hay «Leer un tema») + `componentes/{Saludo,Navegacion,AjustesDeLaClase}.test.tsx` (foco en la primera puerta; «Probar mi programa» enfoca el editor; `aria-current="page"`; «Libro» oculto sin temas; ajustes con teclado y estado en palabras); falla.
- GREEN: `presentacion/ranura.ts` (puertas), `Saludo.tsx`, `Navegacion.tsx`, `AjustesDeLaClase.tsx`; la velocidad sale de `BarraControles.tsx`; encabezado en `App.tsx`.
- Verif: `presentacion/ranura` · `interfaz/componentes`

**R0.9 Ranura bajo el globo y «Siguiente» primario** — REQ-PANT-003 — ✅ hecha (2026-10-19)
- RED `componentes/RanuraDeAcciones.test.tsx` + `contenedores/Visualizador.test.tsx`: en visualización la ranura tiene «◀ Anterior · Siguiente ▶» debajo del globo con `aria-keyshortcuts`; «Siguiente» es el primario y recibe el foco al visualizar; «Visualizar» deja de ser primario; flechas, Inicio, Fin y espacio siguen; la ranura nunca muestra dos cosas a la vez; falla.
- GREEN: `RanuraDeAcciones.tsx`, `presentacion/ranura.ts` (`navegacion`), `BarraControles.tsx` conserva Inicio/Fin/Reproducir/deslizador.
- Verif: `interfaz/componentes` · `interfaz/contenedores`

**R0.10 Un dueño por dato, pistas y fin del recorrido** — REQ-PANT-004, REQ-PANT-007, REQ-PANT-001 (consola vacía) — ✅ hecha (2026-10-19)
- RED `presentacion/modelo-vista.test.ts` (`posicion.total` es `null` mientras calcula y en `u6-ciclo-infinito-demo` detenido; ranura `fin` con «Probar con otros datos» y «Modificar el programa») + `contenedores/Visualizador.test.tsx` (sin `ContadorVueltas` en la zona de explicación; leyenda ▶/▷; teclear en visualización muestra el aviso en `aria-live="polite"`; consola vacía con título y texto); falla.
- GREEN: `modelo-vista.ts`, `ranura.ts` (`fin`), `Visualizador.tsx`, `Consola.tsx`, estilos de la línea siguiente.
- Verif: `presentacion/modelo-vista` · `interfaz/contenedores`

**R0.11 Galería «Ejemplos»** — REQ-AULA-001 (parte curricular de la 5.2) — ✅ hecha (2026-10-19)
- RED `presentacion/galeria.test.ts` (secciones U3–U7 desde texto crudo de prueba; la máquina de snacks con 5 datos de ejemplo; entrada preparada idéntica al `.entrada.txt`) + `pruebas/arquitectura/galeria-completa.test.ts` (todo `.java` de `corpus/curso/` y `ejercicios-del-po/` tiene entrada en `textos/es-MX/galeria.ts`; toda `.entrada.txt` termina en `\n`) + `componentes/Galeria.test.tsx`; falla.
- GREEN: `src/interfaz/datos/programas-crudos.ts` (diferido), `presentacion/galeria.ts`, `textos/es-MX/galeria.ts` (títulos, «Qué observar», demostraciones propuestas en design §2.5), `Galeria.tsx`.
- Verif: `presentacion/galeria` · `arquitectura/galeria-completa` · `interfaz/componentes/Galeria`

**R0.12 Distribuciones: escritorio, celular y proyector** — REQ-PANT-003, REQ-PANT-005, REQ-AULA-004 (absorbe 5.5) — ✅ hecha (2026-10-19)
- RED `pruebas/e2e/pantalla.spec.ts` + `pruebas/e2e/proyector.spec.ts`: a 1366×768 robot, globo y ranura sin desplazar; a 390×844 y 320 px editor ≈ 35vh centrado en la línea actual, globo visible en el paso 0, barra inferior fija, sin desplazamiento horizontal; proyector a 1024×768 y 1280×720 con código ≥ 24 px, línea de 53 caracteres partida sin desplazamiento horizontal, variables sin «Tipo», consola con sus últimas líneas, nada encimado ni cortado; falla.
- GREEN: `estilos/{aplicacion,proyector}.css` (áreas de cuadrícula y `data-proyector`), `EditorJava.tsx` (`Compartment` de tema y `lineWrapping` en proyector), `PanelVariables.tsx` (`compacto`), `Consola.tsx` (`ultimasLineas`).
- Verif: `npm run e2e -- pantalla proyector`

**R0.13 Modelo del libro y programas con el oráculo** — REQ-LIBRO-002, REQ-LIBRO-003, REQ-DIFF-009 (infraestructura de borradores) — ✅ hecha (2026-10-19)
- RED `textos/es-MX/libro/indice.test.ts` (los 34 ids de design §5.2 con unidad, oleada y orden; un tema con contenido tiene las 8 secciones, 2–3 «Ponte a prueba», 2 tareas, ≤ 550 palabras, sin salidas escritas) + `herramientas/oraculo/generar-goldens.test.ts` (descubre `corpus/libro/`) + `pruebas/diferencial/libro.test.ts` (byte a byte o veredicto y línea; ningún aviso de fuera de alcance; entradas con `\n`), con un programa semilla `corpus/libro/u6-while/contar-del-1-al-5.java`; falla.
- GREEN: `textos/es-MX/libro/{tipos,indice}.ts`, `generar-goldens.ts` recorre `libro`, el programa semilla y su `.meta.json`, goldens.
- Verif: `textos/es-MX/libro` · `diferencial/libro` · `test:oraculo`

**R0.14 Borradores U6, parte 1 (5 temas)** · contenido — REQ-LIBRO-002, 003, 004 — ✅ hecha (2026-10-19)
- RED `indice.test.ts` ampliada: `u6-que-es-un-ciclo`, `u6-while`, `u6-contador-acumulador-bandera`, `u6-do-while` y `u6-for` con contenido completo y programas verificados; falla (sin contenido).
- GREEN: `textos/es-MX/libro/u6.ts` + `corpus/libro/u6-*/` + goldens. Estado borrador; el PO los recibe como texto en el chat.
- Verif: `textos/es-MX/libro` · `diferencial/libro`
- **Correcciones del panel R0 (2026-10-19)** — `panel-r0-maestro.md` (L1, L2, L3 y «Puede esperar», libro) y `panel-r0-java.md` (A4, A5, B5, B6); rama `feat/r0-libro-correcciones`. Cada una con su RED ejecutado antes del GREEN:
  - **L1** — RED `pruebas/libro/contenido-del-libro.test.ts` («los nombres no le dan la respuesta»: los cinco nombres anteriores ya no existen, los nuevos sí, ningún programa que se predice trae «vuelta», «sola» ni «hasta pasar»; 11 fallan). GREEN: `UnaSolaVuelta` → `PrimerDoWhile`, `NoDaNiUnaVuelta` → `PagarConElSaldo`, `SinVueltas` → `ForQueEmpiezaEn5`, `DoblarHastaPasarDe20` → `DoblarUnNumero`, `ContarDel1Al5` → `ContarEnVozAlta`; archivo, clase e id cambian juntos (el corpus llama igual al archivo y a su clase) y los goldens se regeneraron con `oraculo:goldens -- libro`: `.salida`, `.errores`, `.combinada`, `.entrada.txt` y `.meta.json` idénticos byte a byte; solo cambian la clase y `nombreArchivo` del `.oraculo.json`.
  - **L2 y A5** — RED regla nueva `afirmaciones` en `reglas-del-tema.ts` (6 frases que Java desmiente, con su versión acotada: «el ciclo nunca termina», «antes de cada vuelta» fuera del `while` y del `for`, `i++` igual que `i = i + 1` sin `int`, «la bandera empieza en `false`», «mismo trabajo que un `while`», «las llaves marcan lo que se repite» sin decir qué pasa sin ellas); 10 pruebas de la regla fallan y, con la regla puesta, 4 temas reales incumplen (9 frases). GREEN en `u6.ts`: tema 1 con los textos exactos del maestro; «nunca da `false`» en los temas 1 y 2 (el 2 tenía la misma frase); bandera «suele empezar en `false`»; tema 5 «con una variable `int` usada como instrucción» y «un trabajo parecido al de un `while`» (B6); nota de llaves con «sin llaves, solo se repite la primera instrucción» (B5). Verificado con el JDK 17: `char c = 'a'; c++;` compila y `c = c + 1;` da `possible lossy conversion from int to char`; con `int` dan lo mismo; sin llaves solo repite la primera instrucción; un `break` termina un ciclo cuya condición nunca da `false`.
  - **L3** — RED `u6.test.ts` (forma general del tema 3 con el cambio del valor y el contador y la bandera dentro de un `if`, y los puntos 1 y 3 del maestro). GREEN en `u6.ts`.
  - **A4** — RED `herramientas/libro-borradores.test.ts` (un error con `mensajeDelVisualizadorPendiente` muestra lo que dijo javac y la explicación, y ningún borrador cita «¿La declaraste antes?»). GREEN: campo `ErrorTipico.mensajeDelVisualizadorPendiente` (puesto en `u6-do-while/variable-del-bloque` y `u6-for/variable-fuera-del-for`) y el guion de borradores no cita el mensaje. **Para R3.12 (E2):** el robot revisor debe dar el mensaje propio de una variable declarada en un bloque que ya cerró («`i` solo existe dentro del `for`; aquí ya no se puede usar»); entonces se quita la bandera de los dos errores típicos y se actualiza la prueba `ningún error típico del libro cita el mensaje «¿La declaraste antes?»`, que hoy exige que sean exactamente esos dos.
  - **«Puede esperar»** — RED `u6.test.ts` (textos exactos, 21 fallan), `indice.test.ts` (etiquetas) y `pruebas/libro/contenido-del-libro.test.ts` (cruces con el corpus, que se comprobó que fallan con un texto malo): el 6 del primer error típico del tema 2; el paso 3 del tema 2; las tres partes del ciclo en el tema 1; «Ponte a prueba» 1 del tema 3 con `mayores = mayores + 1;`; la bandera «que se levanta para avisar»; el nuevo «Crear» del tema 4 (leer números hasta un 7 y escribir «Intentos:»; programa nuevo `intentos-hasta-el-7` con entrada `3 9 7` y golden «Intentos: 3»; reemplaza a `pedir-numero-positivo`, que se retiró); «Prueba este ejemplo con el modo reto encendido.» y el aviso de NetBeans (ambos en `etiquetas.ts`; el aviso solo sale en «Para comprobar» con entrada); lo impreso en las consignas entre « », con una prueba que cruza cada cita con el golden de la solución y otra que exige que las instrucciones citadas (`...;`) existan en un programa del tema o en su forma general.
  - Borrador regenerado (`npm run libro:borradores`) con la sección «Cambios desde la versión anterior» (campo `cambios` de `Borrador`). Palabras por tema: 347, 398, 414, 318 y 390 (máximo 550).
  - Verif: `npm test` (191 archivos, 7991 pruebas) · `npm run lint` · `npm run tipos` · `npm run oraculo:verificar -- libro` (43 programas idénticos a una regeneración real, Temurin 17.0.18) · `npm run test:oraculo`. Pendiente del PO: aprobar los borradores corregidos y las preguntas P1–P4 del maestro; las preguntas del experto en Java sobre la consigna de `tabla-de-n` («con los valores en lugar de las letras» y la `x` literal) siguen abiertas.

**R0.15 E2E y accesibilidad de la pantalla** — REQ-PANT-001–REQ-PANT-009 (CR1, CR2, CR3) — ✅ hecha (2026-10-19)
- RED `pruebas/e2e/pantalla.spec.ts` ampliada: primera vez solo con teclado (saludo → «Ver un ejemplo paso a paso» → MaquinaSnacks → paso 1 en ≤ 3 acciones); error de compilación y su corrección con el hablante correcto; exactamente un robot en cada estado; axe sin graves ni críticas en saludo, visualización, error, galería y proyector; zoom al 200 %; galería sin red tras la primera visita (sobre el build real, regla 8); Chromium, Firefox y WebKit; falla.
- GREEN: los huecos que destape.
- Verif: `npm run e2e -- pantalla`

**R0.16 Cierre de R0** · proceso
- Verificación única: `sdd-verify` + panel (diseñador sobre la pantalla real a 1366×768, 1280×720, 1024×768, 390 y 320; maestro sobre voz, saludo y «Qué observar»; experto en Java sobre galería y entradas). El PO revisa `textos/es-MX/{pantalla,galeria,explicaciones,robot}.ts`; `npm run ci` (peso); commit confirmado; `state.yaml`; avisar al orquestador para conciliar 5.2 y 5.5.

## Hito R1 — Modo reto (ciclos primero)

**Objetivo:** el robot paso a paso pregunta con tres tarjetas antes de cada condición y selección que admiten reto, con la respuesta, las refutaciones y el balance tomados del motor; cabe en proyector y celular.
**Entrada:** R0 cerrado. **Sesiones:** 3–4.

**R1.0 Prueba en papel en clase** · proceso, a cargo del PO (la «R2.0» del panel) · PQ-4
- Los 4 retos de MaquinaSnacks `a1 2 50` (textos de `panel-1-maestro.md` §3.3) en una clase real, 20 min, votación a mano alzada; el PO anota qué opción confundió y por qué. Puede hacerse durante R0.

**R1.1 El PO revisa el catálogo de distractores** · proceso — REQ-RETO-004
- Al **inicio** del hito: el PO revisa design §4.3 (familias, textos de ejemplo, las tres familias nuevas de `switch`) con el resultado de R1.0, y los 4 retos de §4.6. Lo que cambie se aplica en design §4.3–§4.6 antes de R1.7.

**R1.2 ADR 018 — Modo reto (enmienda D4)** · documento
- `docs/adr/018-modo-reto.md`: D4 pasa a tres tarjetas; consecuencia + razón como afirmaciones; dónde no hay reto; catálogo, selección, balance y salida a la forma C; silenciado; columna exclusiva; alternativas B y C.

**R1.3 Hechos `relacion` y `mismo-texto`** — REQ-RETO-007
- RED `interprete/expresiones.test.ts`: `i < 10` con `i` = 10 → `igual`; `0.0 / 0.0 < 1` → `sin-orden`; `'a' < 98` → `menor`; `long`; `-0.0 == 0.0` → `igual`; `sc.next() == "si"` con «si» → `mismo-texto: true` y resultado `false`; `!=` análogo; + `pruebas/propiedades/relacion-del-corpus.test.ts` (relación coherente con su operador en todo el corpus); falla.
- GREEN: `interprete/expresiones.ts` (mismas operaciones que deciden el resultado; `StringJava.equals`), `traza/paso.ts` (`hechos`).
- Verif: `motor/interprete` · `propiedades/relacion-del-corpus`

**R1.4 Condiciones en la vista y contención** — REQ-RETO-002, REQ-RETO-009, REQ-RETO-010
- RED `ir/vista-programa.test.ts`: `CondicionEnVista` de MaquinaSnacks (`variables`, `rango` de las líneas 53 y 66, `admiteReto`); motivos `constante` (`while (true)`, `if (MODO)` con `final`), `lee-entrada`, `azar`, `con-efectos` (`n-- > 0`); `hayInstruccionesDespues`; `cicloPadre` en `u6-ciclos-anidados-tabla`; `control.predecible` solo si `admiteReto`; falla.
- GREEN: `ir/{ir,generar-ir,vista-programa}.ts` (constante con la prueba de `semantica/alcanzabilidad.ts`), `interprete/sentencias.ts`.
- Verif: `motor/ir` · `motor/interprete`

**R1.5 Piezas de la condición por paso** — REQ-RETO-003, REQ-RETO-007, REQ-PANT-010 (CR14)
- RED `interprete/explicar.test.ts`: `cantidad < 1 || cantidad > 3` con 2 → `2 < 1`/`false`, `2 > 3`/`false`; `edad >= 18 && tieneIne` con 16 → la segunda con `resultado: null` y `sustituida: null`; `!(x > 3)`; `seEncontroNegativo` → clase `variable`; + `explicaciones.test.ts` con la frase de piezas («ningún lado da `true`») de la línea 53; falla.
- GREEN: `interprete/explicar.ts`, `traza/explicacion.ts`, `textos/es-MX/explicaciones.ts`.
- Verif: `motor/interprete` · `textos/es-MX/explicaciones` + `npm run rendimiento` dentro de C11

**R1.6 Estructura de `if` y `switch`** — REQ-RETO-004 (y base de la trampa 3)
- RED `ir/vista-programa.test.ts`: `sinoEsIf`, `enEscalera`, `entoncesTermina` en `u5-escalera-else-if-orden-incorrecto`, la línea 53 de MaquinaSnacks (`abrupta` por `return`) y `u5-decision-anidada-licencia`; `EstructuraDeSwitch` con `termina` por alcanzabilidad (grupo en `break`, en `return`, en `if` que puede caer, en `if/else` con dos ramas abruptas, apiladas, `tieneDefault`); falla.
- GREEN: `ir/{generar-ir,vista-programa}.ts` reutilizando `semantica/alcanzabilidad.ts`.
- Verif: `motor/ir`

**R1.7 Afirmaciones y reglas de Java con su respaldo** — REQ-RETO-004, REQ-RETO-007, REQ-DIFF-009 · depende: R1.1
- RED `presentacion/reto/afirmaciones.test.ts` (`verificar` de cada tipo de design §4.2 contra trazas reales) + `pruebas/diferencial/reto.test.ts` (cada `ReglaDeJava` tiene su programa en `corpus/experimentos/reto/` y el motor coincide con su golden); falla.
- GREEN: `presentacion/reto/afirmaciones.ts` + ≈ 20 programas (`o-revisa-el-segundo`, `y-no-revisa-el-segundo`, `frontera`, `while-no-entra`, `for-actualiza-al-final`, `while-no-cuenta-solo`, `escalera-se-queda-con-la-primera`, `return-termina-main`, `switch-break-y-caida`, `switch-sin-coincidencia`, `textos-distintos-guardados`…) + `oraculo:goldens`.
- Verif: `presentacion/reto` · `diferencial/reto`

**R1.8 Textos del reto** — REQ-RETO-001, 003, 006, 009
- RED `textos/es-MX/reto.test.ts`: preguntas exactas por construcción (maestro §3.1), texto de primera vez, cada familia como consecuencia (≤ 30) + razón (total ≤ 100) con los datos más largos del corpus, retroalimentación ✔/◐/✖, «✔ Lo que hizo Java», «¿Y las otras opciones?», «Ya entendí este ciclo» y su descripción, interruptor; sin «incorrecto» ni «`==` no sirve»; pasa `voz.test.ts`; falla.
- GREEN: `src/textos/es-MX/reto.ts` (borradores para la revisión del PO en R1.18).
- Verif: `textos/es-MX/reto` · `textos/es-MX/voz`

**R1.9 Familias y constructor del reto** — REQ-RETO-002, 003, 004
- RED `presentacion/reto.test.ts`: los 4 retos de MaquinaSnacks `a1 2 50` y la línea 24 con `z9` exactamente como en design §4.6 (con los cambios de R1.1); los casos del corpus de §4.6; sin reto en pasos con `motivoSinReto`; variedad entre retos seguidos; mismo resultado en dos corridas; correcta en `(nodo × 7 + revisión) mod 3`; falla.
- GREEN: `presentacion/reto/familias.ts` + `presentacion/reto.ts` (design §4.4, memoria por índice de paso).
- Verif: `presentacion/reto`

**R1.10 Propiedad y balance en todo el corpus** — REQ-RETO-003, 004, 005, 007 (CR4, CR5)
- RED `pruebas/propiedades/reto-del-corpus.test.ts`: en cada paso con reto de cada programa ejecutable (incluidos `reto/` y `trampas/` cuando existan): tres opciones distintas, exactamente una verdadera, cada distractor con al menos una afirmación falsa, ninguna `pieza` sobre una pieza sin revisar; pasos sin reto con su motivo; balance 40–60 %, `pieza-volteada` ≤ 20 %, topes de `if-como-ciclo`/`if-espera`; falla (el recorredor `pruebas/propiedades/pasos-con-reto.ts` no existe).
- GREEN: el recorredor y los ajustes de orden que destape (cada uno con su caso en `presentacion/reto.test.ts`). **Si el balance no se alcanza, se detiene el hito y el PO decide** (design §4.5).
- Verif: `propiedades/reto-del-corpus`

**R1.11 «Ya entendí este ciclo»** — REQ-RETO-009 (CR7)
- RED `presentacion/reto/silenciado.test.ts`: `u6-contador-de-pares` silenciado en la primera revisión solo pregunta en sus dos últimas revisiones y en ningún `if` de adentro; `u6-ciclos-anidados-tabla` (interno silenciado vuelve a preguntar en la siguiente vuelta del externo; externo silenciado calla también al interno); traza que espera un dato → sigue silenciado; salida por `break` termina el silenciado; falla.
- GREEN: `presentacion/reto/silenciado.ts` (design §4.7).
- Verif: `presentacion/reto`

**R1.12 Estado y navegación con retos** — REQ-RETO-001, 008, REQ-VIS-013
- RED `estado/reductor.test.ts` + `presentacion/modelo-vista.test.ts`: `alternar-reto` sin perder la posición (y texto de primera vez una sola vez); `siguiente` no avanza con reto pendiente y la flecha derecha va a la tarjeta 1; `responder-reto` registra y avanza; la reproducción se pausa; atrás/adelante conservan; «Fin» salta; `visualizar` vacía; `silenciar-ciclo`; la retroalimentación reemplaza el texto del globo; `ranura.reto`; falla.
- GREEN: `estado/reductor.ts` (`reto`), `modelo-vista.ts`, `ranura.ts`, `contenedores/Visualizador.tsx`.
- Verif: `interfaz/estado` · `presentacion/modelo-vista`

**R1.13 Tarjetas, retroalimentación e interruptor** — REQ-RETO-001, 006, 008, 010
- RED `componentes/{TarjetasDelReto,InterruptorReto}.test.tsx` + `Explicacion.test.tsx`: tarjetas ≥ 56 px con número, consecuencia y razón, `aria-keyshortcuts` 1/2/3, foco en la 1; elegir confirma; ✔/◐/✖ con ícono, palabra y borde; «✔ Lo que hizo Java»; «¿Y las otras opciones?» con teclado; foco a «Siguiente» y `aria-live="polite"`; rótulo «Reto · línea N» y robot con «?»; panel de condición oculto hasta contestar; interruptor `role="switch"` con «Encendido»/«Apagado»; sin movimiento con movimiento reducido; falla.
- GREEN: los dos componentes, `RanuraDeAcciones.tsx`, `Explicacion.tsx`, `Robot.tsx` (letrero «?»), encabezado, estilos.
- Verif: `interfaz/componentes`

**R1.14 Columna exclusiva del reto** — REQ-RETO-010, REQ-AULA-004
- RED `pruebas/e2e/reto.spec.ts` (parte de distribución): con un reto pendiente, a 1280×720 y 1024×768 en proyector y a 390×844, la pregunta, «Valores ahora», las 3 tarjetas, el porqué y «Siguiente» se ven sin desplazar ni encimarse; variables y consola compactas; falla.
- GREEN: `data-reto="pendiente"` en `Visualizador.tsx`, CSS de la columna y de la barra inferior crecida, `RetoVista.valoresAhora`.
- Verif: `npm run e2e -- reto`

**R1.15 El enlace lleva `reto`** — REQ-AULA-002 · depende: 5.4 de `visualizador-java`
- RED `presentacion/enlace.test.ts`: ida y vuelta exacta con `reto=1`; sin él abre apagado; falla.
- GREEN: `src/presentacion/enlace.ts`. Si la 5.4 aún no existe, el parámetro pasa a su contrato y esta tarea se cierra con ella.
- Verif: `presentacion/enlace`

**R1.16 E2E del reto en clase** — REQ-RETO-002, 008, 009, 010, REQ-AULA-005 (CR6)
- RED `pruebas/e2e/reto.spec.ts` ampliada: MaquinaSnacks `a1 2 50` presenta 4 retos (24, 53, 66, 72) que se contestan con 1/2/3; regresar no vuelve a preguntar; `u6-suma-1-a-n` con «Ya entendí»; un `while (true)` no pregunta; un solo robot en cada estado; axe sin graves ni críticas; tres motores; falla.
- GREEN: los huecos que destape.
- Verif: `npm run e2e -- reto`

**R1.17 Borradores U6, parte 2 (5 temas)** · contenido — REQ-LIBRO-002, 003, 004
- RED `indice.test.ts`: `u6-ciclos-incrementales-y-decrementales`, `u6-error-por-uno-y-ciclo-infinito`, `u6-repetir-hasta-que-el-usuario-quiera`, `u6-ciclos-anidados` y `u6-break-y-continue` completos; falla.
- GREEN: `textos/es-MX/libro/u6.ts` + `corpus/libro/u6-*/` + goldens. Estado borrador.
- Verif: `textos/es-MX/libro` · `diferencial/libro`

**R1.18 Cierre de R1** · proceso
- Verificación única con el panel (maestro sobre catálogo y retroalimentación; diseñador sobre tarjetas en proyector y celular; experto en Java sobre las reglas); el PO revisa `textos/es-MX/reto.ts` y, si hizo falta, decide el balance; `npm run ci`; commit confirmado; `state.yaml`; avisar al orquestador para conciliar 5.1, 5.4 y 5.6.

## Hito R2 — Libro, oleada 1 (21 temas, U6 primero)

**Objetivo:** el libro funciona completo con los 10 temas de U6, sus 5 requisitos y los 6 de U5, aprobados por el PO.
**Entrada:** R1 cerrado (los 10 borradores de U6 ya existen). **Sesiones:** 3 + la revisión del PO.

**R2.1 El PO revisa la lista de temas** · proceso — REQ-LIBRO-001 · PQ-3
- Al **inicio** del hito: el PO revisa los 34 temas, su orden y las oleadas (design §5.2); los cambios se aplican en `indice.ts` y en design §5.2 antes de R2.10.

**R2.2 ADR 019 — Libro de temas** · documento
- `docs/adr/019-libro-de-temas.md`: estructura que empieza por el ejemplo (PRIMM), contenido tipado, programas del oráculo dentro del subconjunto, huella y la regla «nadie marca aprobado sin el visto bueno explícito del PO», accesos por el árbol de CodeMirror, carga diferida y peso.

**R2.3 Huella y aprobación** — REQ-LIBRO-007
- RED `pruebas/libro/aprobaciones.test.ts` + `herramientas/libro-huella.test.ts`: un tema aprobado con huella vieja falla; la huella cambia si cambia un texto o un programa; los borradores no salen en el índice publicado; falla.
- GREEN: `herramientas/libro-huella.ts`, script `libro:huella` en `package.json`, filtro `mostrarBorradores`.
- Verif: `pruebas/libro` · `herramientas/libro-huella`

**R2.4 Presentación del libro** — REQ-LIBRO-001, 004, 006 (CR9)
- RED `presentacion/libro.test.ts`: índice por unidad con «Este capítulo llega pronto»; anterior/siguiente; «Ponte a prueba» y «Para comprobar» desde goldens; tema de un paso por su clave y de cada construcción (`el-if`, `if-con-else`, escalera, decrementales); cobertura: todo `if`/`switch`/`while`/`do`/`for` de la galería y del corpus ejecutable lleva a un tema publicado; falla.
- GREEN: `src/presentacion/libro.ts`.
- Verif: `presentacion/libro`

**R2.5 Pantalla del libro y carga diferida** — REQ-LIBRO-001, 002, 008, 009, REQ-PANT-001, 002, 009
- RED `interfaz/libro/*.test.tsx` + `pruebas/arquitectura/libro-diferido.test.ts`: las 8 secciones en orden; «Ver la salida» y «Ver la respuesta» con teclado; habla el robot del libro; aparecen la puerta «Leer un tema» y «Libro» en la navegación; ningún módulo importa `libro/u*.ts` salvo con `import()`; falla.
- GREEN: `interfaz/libro/{PantallaLibro,TemaDelLibro,ProgramaDelLibro}.tsx`, `interfaz/datos/libro-crudo.ts`.
- Verif: `interfaz/libro` · `arquitectura/libro-diferido`

**R2.6 Abrir un ejemplo del libro** — REQ-LIBRO-005, REQ-PANT-007
- RED `estado/reductor.test.ts` + `presentacion/ranura.test.ts` + componentes: «▶ Verlo paso a paso» y «🎯 Ponerme a prueba» (reto encendido) con `origen: libro`; franja «Ejemplo del libro: … · ← Volver al tema»; aviso de reemplazo y «Volver a mi programa»; sugerencia de encender el reto la segunda vez; fin con «Volver al tema» y «Siguiente tema»; falla.
- GREEN: reductor, `ranura.ts`, `Visualizador.tsx`, textos del libro en `pantalla.ts`.
- Verif: `interfaz/estado` · `presentacion/ranura`

**R2.7 Accesos en contexto** — REQ-LIBRO-006
- RED `editor/accesos-a-temas.test.ts` + `componentes/Explicacion.test.tsx`: 📖 solo en la línea del cursor en edición; botón «Tema de esta línea» y `Alt+F1`; mapeo de design §5.5 (un `for` con `i--` agrega decrementales); el globo enlaza el tema de la condición actual; solo temas publicados; falla.
- GREEN: `interfaz/editor/accesos-a-temas.ts`, `Explicacion.tsx`, ayuda de atajos.
- Verif: `interfaz/editor` · `interfaz/componentes`

**R2.8 Enlaces desde el reto** — REQ-LIBRO-006
- RED `presentacion/reto.test.ts`: la retroalimentación enlaza el tema de la construcción y, si la familia lo tiene, el de su error (`frontera` → `error-por-uno-y-ciclo-infinito`); nunca un borrador; falla.
- GREEN: `presentacion/reto.ts`, `TarjetasDelReto.tsx`.
- Verif: `presentacion/reto`

**R2.9 Límite de peso del libro** — REQ-LIBRO-008 (CR8, CR15)
- RED `herramientas/presupuesto-tamano.test.ts`: con un `dist/` de prueba, un fragmento del libro de más de 80 KB gzip da salida 1 aunque el total quepa; falla.
- GREEN: `herramientas/presupuesto-tamano.ts` (del hito 3) con el límite por fragmento.
- Verif: `herramientas/presupuesto-tamano`

**R2.10 Borradores: requisitos de U6 (5 temas)** · contenido — REQ-LIBRO-002, 003, 004
- RED `indice.test.ts`: `u4-comparaciones`, `u4-operadores-logicos`, `u3-entrada-con-scanner`, `u4-division-entera-y-modulo` y `u4-incremento-y-decremento` completos; falla.
- GREEN: `textos/es-MX/libro/{u3,u4}.ts` + `corpus/libro/` + goldens. Estado borrador.
- Verif: `textos/es-MX/libro` · `diferencial/libro`

**R2.11 Borradores U5 (6 temas)** · contenido — REQ-LIBRO-002, 003, 004
- RED `indice.test.ts`: los 6 de U5 en el orden del maestro; falla.
- GREEN: `textos/es-MX/libro/u5.ts` + `corpus/libro/u5-*/` + goldens. Estado borrador.
- Verif: `textos/es-MX/libro` · `diferencial/libro`

**R2.12 E2E del libro: accesible y sin red** — REQ-LIBRO-005, 008, 009
- RED `pruebas/e2e/libro.spec.ts`: índice y tres temas con teclado y axe; «Ponerme a prueba» abre con el reto; acceso en contexto desde un `for`; volver al programa; sin red tras la primera visita (build real, regla 8); proyector; tres motores; falla.
- GREEN: los huecos que destape.
- Verif: `npm run e2e -- libro`

**R2.13 Revisión y aprobación del PO — oleada 1** · proceso — REQ-LIBRO-007
- El PO revisa cada tema en `npm run dev` (marca «Borrador»), primero los de U6; con su aprobación explícita por tema, `npm run libro:huella -- <id>`. Verif: `pruebas/libro/aprobaciones` en verde con los 21.

**R2.14 Cierre de R2** · proceso
- Verificación única con el panel (maestro sobre los temas; diseñador sobre pantalla y proyector; experto en Java sobre los programas y el subconjunto); `npm run ci` (peso por fragmento y total); commit confirmado; `state.yaml`.

## Hito R3 — Robot revisor

**Objetivo:** el revisor explica los errores y avisos de hoy con su porqué (y el hecho del `;` de la E2) y detecta las cinco trampas de Java que compilan, con cero falsos positivos medidos, pistas graduadas y espera con el reto.
**Entrada:** R2 cerrado. **Sesiones:** 3.

**R3.1 ADR 020 — Revisor de trampas** · documento
- `docs/adr/020-revisor-de-trampas.md`: pasada sobre la IR; falso positivo = hecho que no se cumple o fuera de la etiqueta del PO; las 5 reglas con su JLS y los ajustes E2, E3, E4, E7 y E8; límites conocidos de la regla 4; pistas graduadas y espera con el reto.

**R3.2 Modelo `Trampa` y la pasada vacía** — REQ-REV-002, 003
- RED `revision/revisar.test.ts`: MaquinaSnacks → `vista.trampas = []`; con error de compilación no hay `vista`; traza idéntica con y sin `revisar` en todo el corpus; falla (módulo inexistente).
- GREEN: `revision/{trampas,revisar}.ts` (design §6.1), `compilador.ts`, `VistaPrograma.trampas`, tipos en `motor/vista.ts`.
- Verif: `motor/revision` · `motor/compilador`

**R3.3 Corpus de trampas con el oráculo** — REQ-REV-005, REQ-DIFF-009
- RED `pruebas/diferencial/trampas.test.ts`: cada `.java` de `corpus/experimentos/trampas/` tiene goldens y el motor coincide (byte a byte, o veredicto y línea en las de E2); ≥ 3 positivas (`p-*`) y ≥ 2 casi-trampas (`c-*`) por familia, incluidas las de design §6.6.3; falla (carpeta vacía).
- GREEN: ≈ 30 programas con sus entradas + `oraculo:goldens`.
- Verif: `diferencial/trampas` · `test:oraculo`

**R3.4 Etiquetas del corpus** — REQ-REV-005
- RED `pruebas/revisor/etiquetas.test.ts`: `corpus/trampas-esperadas.json` tiene una entrada por cada `.java` de las cuatro carpetas, solo con códigos de `CodigoTrampa`; falla.
- GREEN: el archivo (`u5-switch-sin-break-fallthrough` → 3 × `case-que-sigue-de-largo`, l. 6, 8, 10; las positivas con lo suyo; el resto `[]`).
- Verif: `revisor/etiquetas`

**R3.5 Trampa 1: `;` tras la condición** — REQ-REV-002, 004
- RED `revision/punto-y-coma.test.ts`: positivas `if`/`while`/`for` con `nodoCondicion` y `nodoSiguiente`; no reporta `{ }` ni `do { } while (c);`; falla.
- GREEN: `revision/punto-y-coma.ts`.
- Verif: `revision/punto-y-coma`

**R3.6 Trampa 2: `==`/`!=` entre `String`** — REQ-REV-002, 003, 004
- RED `revision/comparacion-de-textos.test.ts`: `respuesta == "si"`, `op != "salir"` en un `while` con `punto` y `enCondicion`; no reporta `equals`, `char`, números ni `switch` con `String`; falla.
- GREEN: `revision/comparacion-de-textos.ts`.
- Verif: `revision/comparacion-de-textos`

**R3.7 Trampa 3 con alcanzabilidad** — REQ-REV-002, 004 · depende: R1.6
- RED `revision/case-que-sigue.test.ts`: reporta los tres grupos de `u5-switch-sin-break-fallthrough` y un grupo que termina en `if` que cae; no reporta apiladas, último grupo, `break`/`return`/`continue` ni `if/else` con las dos ramas abruptas; falla.
- GREEN: `revision/case-que-sigue.ts` sobre `EstructuraDeSwitch.termina`.
- Verif: `revision/case-que-sigue`

**R3.8 Trampa 4: renglón pendiente, también entre vueltas** — REQ-REV-002, 004
- RED `revision/renglon-pendiente.test.ts`: `nextInt()`/`next()`/`nextDouble()` + `String s = sc.nextLine();` usado; el ciclo nombre/edad (`entreVueltas: true`); no reporta `sc.nextLine();`, la «basura» que no se lee, ramas distintas ni `u3-saludo-con-scanner`; falla.
- GREEN: `revision/renglon-pendiente.ts` (design §6.2, regla 4 a y b; «usado» por lecturas posteriores de la variable).
- Verif: `revision/renglon-pendiente`

**R3.9 Trampa 5: división entera que se vuelve `double`** — REQ-REV-002, 004
- RED `revision/division-entera.test.ts`: `double p = suma / 3;`, `1 / 2 * base`, `(double) (a / b)`, `long`; no reporta `(double) a / b`, `int m = n / 2`, `"x" + a / b`, `suma / 5` con `suma` `double`; los cuatro puntos; falla.
- GREEN: `revision/division-entera.ts`.
- Verif: `revision/division-entera`

**R3.10 Guarda de cero falsos positivos** — REQ-REV-004, 005 (CR10, CR11)
- RED `pruebas/revisor/trampas-del-corpus.test.ts`: lo detectado = `trampas-esperadas.json` en código y línea; `revisar` sobre cada mutante que javac acepta sin lanzar y estable en dos corridas; falla (el cargador `pruebas/revisor/corpus-etiquetado.ts` no existe).
- GREEN: el cargador; cada discrepancia se corrige en su regla con su caso unitario.
- Verif: `pruebas/revisor`

**R3.11 Hechos para notas con pérdida real** — REQ-REV-006 (E8)
- RED `interprete/expresiones.test.ts` + `biblioteca/entrada/*.test.ts`: `25 / 3` → `division-entera.exacta: false`, `100 / 4` → `true` (negativos con la semántica de Java); `nextLine()` tras `20⏎` → `soloBlancos: true`, tras `20 Juan⏎` → `false`, tras `20  ⏎` → `true`; falla.
- GREEN: `interprete/expresiones.ts`, lectura de `Scanner`, `traza/paso.ts`.
- Verif: `motor/interprete` · `motor/biblioteca`

**R3.12 El porqué de los problemas existentes y el `;` de la E2** — REQ-REV-001, 003
- RED `semantica/atribucion.test.ts` + `sintaxis/*.test.ts` (`cuerpoVacioAntes` en `for (…); println(i)` e `if (c); … else`) + `textos/es-MX/revisor.test.ts` (`familiaDelProblema` y `familiaDelAviso` exhaustivas; un `porQue` por familia; el hecho del `;` cuando viene el dato); falla.
- GREEN: `motor/problemas.ts`, atribución y analizador, `textos/es-MX/revisor.ts` (familias).
- Verif: `motor/semantica` · `motor/sintaxis` · `textos/es-MX/revisor`
- **Nota del panel R0 (A4):** `u6-do-while/variable-del-bloque` y `u6-for/variable-fuera-del-for` son variables que sí se declararon, en un bloque que ya cerró; el motor las trata como `variable-no-declarada` y dice «¿La declaraste antes?», que contradice al libro. Esta tarea da el mensaje propio (el `;` de la E2 es el mismo tipo de caso) y quita `mensajeDelVisualizadorPendiente` de esos dos errores típicos (ver R0.14).

**R3.13 Textos del revisor** — REQ-REV-003, 006, 007
- RED `textos/es-MX/revisor.test.ts` ampliada: aviso de cada trampa (el de `==` sin «dará `false`»; el de `nextLine` con «lo que quedaba del renglón»); evidencia de cada confirmación; franja con 0, 1 y n trampas, con trampas en espera y en «después»; sello sin trampas de una línea; «trampa de Java»; sin «incorrecto», «error tuyo» ni «te equivocaste»; pasa `voz.test.ts`; falla.
- GREEN: `textos/es-MX/revisor.ts` (borradores para la revisión del PO en R3.18).
- Verif: `textos/es-MX/revisor` · `textos/es-MX/voz`

**R3.14 Presentación del revisor** — REQ-REV-001, 006, 007, REQ-PANT-009
- RED `presentacion/revisor.test.ts` + `presentacion/hablante.test.ts`: franja del paso 0 de `u5-switch-sin-break-fallthrough` (líneas 6, 8, 10); con el reto encendido, las de `adelantaUnReto` quedan en espera; «después» con texto neutro; el revisor toma el turno en cada confirmación (y no en una división exacta ni con resto no vacío); con reto contestado en el paso, enlace «Ver la trampa de Java»; `turno: 'revisor'` con «Ver explicación»; falla.
- GREEN: `src/presentacion/revisor.ts`, `hablante.ts`, `ModeloVista.revisor`, reductor (`ver-explicacion-del-revisor`).
- Verif: `presentacion/revisor` · `presentacion/hablante`

**R3.15 Franja y marca de lupa** — REQ-REV-007
- RED `componentes/FranjaDelRevisor.test.tsx` + `editor/marcas-de-trampa.test.ts`: franja encima del editor con la lupa, «Ver explicación» con teclado, `aria-live="polite"`; cada línea de `vista.trampas` lleva `cm-trampa` con el SVG de lupa con «!» y el título «Trampa de Java», distinta de ✖ y ⓘ; ninguna al editar después de cambiar el código; falla.
- GREEN: `FranjaDelRevisor.tsx`, `interfaz/editor/marcas-de-trampa.ts` sobre el `StateField` de resaltados.
- Verif: `interfaz/componentes` · `interfaz/editor`

**R3.16 Enlaces al libro, «después» y demostraciones** — REQ-REV-007, REQ-LIBRO-006, REQ-AULA-001, REQ-AULA-002 · depende: 5.4 para el enlace
- RED `presentacion/{revisor,libro,galeria,enlace}.test.ts`: el porqué de un problema y cada trampa enlazan su tema publicado; `revisor=despues` de ida y vuelta en el enlace; un programa de demostración de la galería abre en «después»; falla.
- GREEN: `presentacion/{revisor,libro,galeria,enlace}.ts`, «Ajustes de la clase» (momento del aviso).
- Verif: `presentacion`

**R3.17 E2E y accesibilidad del revisor** — REQ-REV-001, 006, 007 (CR12)
- RED `pruebas/e2e/revisor.spec.ts`: `u5-switch-sin-break-fallthrough` (franja, marcas, el revisor habla en cada caída); la positiva del renglón pendiente con su entrada; `for (…); println(i)` con el hecho del `;`; con el reto encendido, la trampa 2 en espera; un solo robot en cada estado; solo teclado; axe; tres motores; falla.
- GREEN: los huecos que destape.
- Verif: `npm run e2e -- revisor`

**R3.18 Cierre de R3** · proceso
- Verificación única con el panel (experto en Java sobre reglas y corpus; maestro sobre textos y pistas; diseñador sobre franja y marca); el PO revisa `textos/es-MX/revisor.ts` y `corpus/trampas-esperadas.json`; `npm run ci`; commit confirmado; `state.yaml`.

## Hito R4 — Libro, oleada 2 (13 temas)

**Objetivo:** U3, el resto de U4 y U7, aprobados por el PO. Solo contenido: no toca código.
**Entrada:** R2 cerrado (puede ir en paralelo a R3). **Sesiones:** 1–2 + la revisión del PO.

**R4.1 Borradores U3 (5 temas)** — REQ-LIBRO-002, 003, 004
- RED `indice.test.ts` con `programa-y-main`, `variables-y-tipos`, `asignacion`, `salida` y `tipos-de-errores`; falla. GREEN `textos/es-MX/libro/u3.ts` + `corpus/libro/u3-*/` + goldens. Verif: `textos/es-MX/libro` · `diferencial/libro`

**R4.2 Borradores U4 (5 temas)** — REQ-LIBRO-002, 003, 004
- RED la misma con `operadores-aritmeticos`, `precedencia`, `conversiones`, `math-y-random` y `textos-y-concatenacion`; falla. GREEN `u4.ts` + `corpus/libro/u4-*/` + goldens. Verif: ídem

**R4.3 Borradores U7 (3 temas)** — REQ-LIBRO-002, 003, 004
- RED la misma con `prueba-de-escritorio`, `depurar-con-el-visualizador` y `casos-de-prueba`; falla. GREEN `u7.ts` + `corpus/libro/u7-*/` + goldens. Verif: ídem

**R4.4 Revisión y aprobación del PO — oleada 2** · proceso — REQ-LIBRO-007
- Como R2.13. Verif: `pruebas/libro/aprobaciones` con los 34 aprobados.

**R4.5 Cierre de R4** · proceso
- Verificación acotada al contenido, con el maestro y el experto en Java; `npm run ci` (peso); commit confirmado; `state.yaml`.

## Matriz de trazabilidad

### Requisitos (42) → tareas

| Requisito | Tareas |
|---|---|
| REQ-PANT-001 | R0.4, R0.7, R0.8, R0.10, R0.15, R2.5 |
| REQ-PANT-002 | R0.4, R0.7, R0.8, R0.15, R2.5 |
| REQ-PANT-003 | R0.9, R0.12, R0.15 |
| REQ-PANT-004 | R0.3, R0.4, R0.10 |
| REQ-PANT-005 | R0.12, R0.15 |
| REQ-PANT-006 | R0.4, R0.7, R0.8 |
| REQ-PANT-007 | R0.4, R0.10, R2.6 |
| REQ-PANT-008 | R0.1, R0.5, R0.15 |
| REQ-PANT-009 | R0.6, R0.15, R2.5, R3.14 |
| REQ-PANT-010 | R0.3, R1.5, R1.8, R3.13 |
| REQ-RETO-001 | R1.8, R1.12, R1.13 |
| REQ-RETO-002 | R1.4, R1.9, R1.16 |
| REQ-RETO-003 | R1.5, R1.8, R1.9, R1.10 |
| REQ-RETO-004 | R1.1, R1.6, R1.7, R1.9, R1.10 |
| REQ-RETO-005 | R1.10 |
| REQ-RETO-006 | R1.8, R1.13 |
| REQ-RETO-007 | R1.3, R1.5, R1.7, R1.10 |
| REQ-RETO-008 | R1.12, R1.13, R1.16 |
| REQ-RETO-009 | R1.4, R1.8, R1.11, R1.16 |
| REQ-RETO-010 | R1.4, R1.13, R1.14, R1.16 |
| REQ-LIBRO-001 | R2.4, R2.5 |
| REQ-LIBRO-002 | R0.13, R0.14, R1.17, R2.5, R2.10, R2.11, R4.1–R4.3 |
| REQ-LIBRO-003 | R0.13, R0.14, R1.17, R2.10, R2.11, R4.1–R4.3 |
| REQ-LIBRO-004 | R0.14, R1.17, R2.4, R2.10, R2.11, R4.1–R4.3 |
| REQ-LIBRO-005 | R2.6, R2.12 |
| REQ-LIBRO-006 | R2.4, R2.7, R2.8, R3.16 |
| REQ-LIBRO-007 | R2.3, R2.13, R4.4 |
| REQ-LIBRO-008 | R2.5, R2.9, R2.12 |
| REQ-LIBRO-009 | R2.5, R2.12 |
| REQ-REV-001 | R3.12, R3.14, R3.17 |
| REQ-REV-002 | R3.2, R3.5–R3.9 |
| REQ-REV-003 | R3.2, R3.6, R3.12, R3.13 |
| REQ-REV-004 | R3.5–R3.10 |
| REQ-REV-005 | R3.3, R3.4, R3.10 |
| REQ-REV-006 | R3.11, R3.13, R3.14, R3.17 |
| REQ-REV-007 | R3.13–R3.17 |
| REQ-VIS-013 (modificado) | R1.2, R1.12, R1.13 |
| REQ-AULA-001 (modificado) | R0.7, R0.11, R3.16 (autoría: 5.2/5.3 de `visualizador-java`) |
| REQ-AULA-002 (modificado) | R1.15, R3.16 (y la 5.4, conciliada) |
| REQ-AULA-004 (modificado) | R0.12, R1.14 |
| REQ-AULA-005 (modificado) | R1.16 (y la 5.6, conciliada) |
| REQ-DIFF-009 | R0.13, R1.7, R3.3 |

### Criterios de éxito → tareas

| Criterio | Tareas |
|---|---|
| CR1 primera vez | R0.12, R0.15 |
| CR2 proyector y AA | R0.12, R0.15 |
| CR3 un hablante | R0.1, R0.5, R0.6, R0.15 |
| CR4 reto en todo el corpus | R1.10 |
| CR5 balance y topes | R1.10 |
| CR6 clase (MaquinaSnacks) | R1.14, R1.16 |
| CR7 cansancio | R1.11 |
| CR8 libro = oráculo, estructura, peso | R0.13, R2.3, R2.9, R2.13, R4.4 |
| CR9 cobertura | R2.4 |
| CR10 cero falsos positivos | R3.4, R3.10 |
| CR11 muestras | R3.3, R3.10 |
| CR12 confirmación con pérdida real y E2 | R3.11, R3.12, R3.17 |
| CR13 textos | R0.16, R1.18, R2.13, R3.18, R4.4 |
| CR14 rendimiento | R1.5 |
| CR15 peso | R0.16, R1.18, R2.9, R2.14, R3.18, R4.5 |

## Resumen por hito

| Hito | Objetivo | Tareas | Sesiones | Verificación |
|---|---|---|---|---|
| R0 | Pantalla y personajes (+ U6 parte 1) | 16 | 3–4 | una, con el panel |
| R1 | Modo reto (+ U6 parte 2) | 19 | 3–4 | una, con el panel |
| R2 | Libro, oleada 1 (21 temas) | 14 | 3 + PO | una, con el panel |
| R3 | Robot revisor | 18 | 3 | una, con el panel |
| R4 | Libro, oleada 2 (13 temas) | 5 | 1–2 + PO | acotada al contenido |
| **Total** | | **72** | **13–17** | |
