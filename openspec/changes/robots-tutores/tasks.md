# Tareas: Robots tutores (`robots-tutores`)

> Fase `sdd-tasks` · 2026-10-17. Fuente: `design.md` (§2 revisor, §3 reto, §4 libro, §6 pruebas, §8 hitos), `specs/*/spec.md` (29 requisitos: 26 nuevos y 3 modificados; 55 escenarios), `proposal.md` (R-D1–R-D4, CR1–CR9, §11 Definición de Terminado, §12 PR-1–PR-5).
>
> **Tamaño:** como en `visualizador-java/tasks.md`, cada tarea trae su RED, su GREEN, los archivos y su verificación para que `sdd-apply` no tenga que reabrir el diseño; por eso pasa del presupuesto de la plantilla. 49 tareas en 4 hitos cortos, cada uno usable por sí solo y con **una sola verificación**.

## Convenciones

- **TDD estricto** (`strict_tdd: true`): toda tarea de código es RED (prueba nueva que falla por una razón concreta, **ejecutada**) → GREEN (lo mínimo, confirmado por ejecución) → REFACTOR («ninguno relevante» cuando no aplica). Las tareas de documentos (ADR) y de proceso (revisión del PO) no llevan RED.
- **Comandos base** (no se repiten): `npm test -- <patrón> --reporter=dot` · `npm run test:oraculo` · `npm run e2e -- <patrón> --reporter=dot` · `npm run lint` · `npm run tipos` · `npm run oraculo:goldens` (JDK 17.0.18). Nunca `npm run build` suelto (regla 8): el peso se mide en `npm run ci` al cerrar el hito.
- **Datos del JDK solo del oráculo** (ADR 010): todo golden de `corpus/experimentos/{trampas,reto}/` y `corpus/libro/` lo genera `oraculo:goldens`.
- **Textos** solo en `src/textos/es-MX/` (ADR 015); identificadores en español ASCII (ADR 002); la matriz de capas no cambia (ADR 001).
- **Dependencias:** dentro de un hito, secuenciales por número salvo nota; «depende» solo cuando cruza de hito o salta.
- **Cierre de cada hito:** una `sdd-verify` → el PO revisa los textos nuevos → commit con confirmación EXPLÍCITA del PO (conventional commits, sin atribución de IA) → `state.yaml`. Sin `judgment-day` salvo que la verificación lo pida.
- **Preguntas del PO:** las tareas marcadas «PR-n» se implementan con la recomendación por omisión y se ajustan si el PO decide otra cosa (`proposal.md` §12).

## Hito R1 — Robot revisor

**Objetivo:** el revisor explica los errores y avisos de hoy con su porqué y detecta las cinco trampas que compilan, con cero falsos positivos medidos y confirmación en la ejecución.
**Entrada:** hito 3 publicado y PR #3 fusionado (R-D4). **Sesiones:** 2–3.

**R1.1 ADR 017 — Revisor de trampas** · documento
- `docs/adr/017-revisor-de-trampas.md`: pasada sobre la IR; definición de falso positivo (hecho que no se cumple o fuera de la etiqueta del PO); las cinco reglas con su argumento de JLS; alternativas (AST, presentación) y consecuencias (recall conservador).

**R1.2 Modelo `Trampa` y la pasada vacía** — REQ-REV-002, REQ-REV-003
- RED `src/motor/revision/revisar.test.ts`: `compilar()` de MaquinaSnacks entrega `vista.trampas = []`; un programa con error de compilación no tiene `vista`; la traza de cada programa ejecutable del corpus es idéntica con y sin `revisar`; falla (módulo inexistente).
- GREEN: `revision/{trampas,revisar}.ts` (§1.2), `compilador.ts` llena `vista.trampas`, `VistaPrograma.trampas?`, tipos exportados en `motor/vista.ts`.
- Verif: `motor/revision` · `motor/compilador`

**R1.3 Corpus de trampas con el oráculo** — REQ-REV-005, REQ-DIFF-009
- RED `pruebas/diferencial/trampas.test.ts`: cada `.java` de `corpus/experimentos/trampas/` tiene goldens con `compilo: true` y el motor coincide byte a byte; hay ≥ 3 positivas (`p-<familia>-*`) y ≥ 2 casi-trampas (`c-<familia>-*`) por familia; falla (carpeta vacía).
- GREEN: ≈ 25 programas con sus entradas (variantes de §2.5.3 y las casi-trampas de §2.2) + `npm run oraculo:goldens`.
- Verif: `diferencial/trampas` · `test:oraculo`

**R1.4 Etiquetas del corpus** — REQ-REV-005
- RED `pruebas/revisor/etiquetas.test.ts`: `corpus/trampas-esperadas.json` tiene una entrada por cada `.java` de `curso/`, `experimentos/tipicos/`, `experimentos/ejercicios-del-po/` y `experimentos/trampas/`, solo con códigos de `CodigoTrampa`; falla (no existe).
- GREEN: el archivo: `u5-switch-sin-break-fallthrough` → 3 × `case-que-sigue-de-largo` (l. 6, 8, 10); las positivas de `trampas/` con lo suyo; el resto `[]`.
- Verif: `revisor/etiquetas`

**R1.5 Trampa 1: `;` tras la condición** — REQ-REV-002, REQ-REV-004
- RED `revision/punto-y-coma.test.ts`: positivas de `trampas/` (`if`, `while`, `for`; con bloque o sentencia después) con `nodoCondicion` y `nodoSiguiente`; no reporta `{ }` ni `do { } while (c);`; falla.
- GREEN: `revision/punto-y-coma.ts` (regla 1 de §2.2).
- Verif: `revision/punto-y-coma`

**R1.6 Trampa 2: `==`/`!=` entre `String`** — REQ-REV-002, REQ-REV-004
- RED `revision/comparacion-de-textos.test.ts`: `respuesta == "si"`, `a != b` (`String`) con su `punto`; no reporta `equals`, `char` ni números; falla.
- GREEN: `revision/comparacion-de-textos.ts`.
- Verif: `revision/comparacion-de-textos`

**R1.7 Estructura de `switch` y trampa 3** — REQ-REV-002, REQ-REV-004
- RED `revision/case-que-sigue.test.ts` + `revision/estructura-de-switch.test.ts`: grupos y `Terminacion` (normal/abrupta/depende) de MaquinaSnacks y `u5-switch-sin-break-fallthrough`; reporta los tres grupos de este último; no reporta grupos vacíos, el último grupo ni los que terminan en `break`/`return`/`continue` o en un `if`; falla.
- GREEN: `revision/{estructura-de-switch,case-que-sigue}.ts`, `VistaPrograma.switches`.
- Verif: `motor/revision`

**R1.8 Trampa 4: renglón pendiente del `Scanner`** — REQ-REV-002, REQ-REV-004
- RED `revision/renglon-pendiente.test.ts`: `nextInt()`/`next()`/`nextDouble()` seguido de `String s = sc.nextLine();`; no reporta `sc.nextLine();` como sentencia, lecturas en ramas distintas ni `u3-saludo-con-scanner`; falla.
- GREEN: `revision/renglon-pendiente.ts` (regla 4: última llamada de una, primera de la otra, ninguna en medio a ninguna profundidad).
- Verif: `revision/renglon-pendiente`

**R1.9 Trampa 5: división entera que se vuelve `double`** — REQ-REV-002, REQ-REV-004
- RED `revision/division-entera.test.ts`: `double p = suma / 3;`, `1 / 2 * base`, `(double) (a / b)`, `long`; no reporta `(double) a / b`, `int m = n / 2`, `"x" + a / b`, `suma / 5` con `suma` `double`; los cuatro puntos del plan en los datos; falla.
- GREEN: `revision/division-entera.ts`.
- Verif: `revision/division-entera`

**R1.10 Guarda de cero falsos positivos** — REQ-REV-004, REQ-REV-005 (CR1, CR2)
- RED `pruebas/revisor/trampas-del-corpus.test.ts`: lo detectado = `trampas-esperadas.json` en código y línea para cada archivo; `revisar` corre sobre cada mutante que javac acepta en `corpus/mutantes/veredictos.jsonl` (campo `fuente`) sin lanzar y con el mismo resultado en dos corridas; falla (el cargador `pruebas/revisor/corpus-etiquetado.ts` no existe).
- GREEN: el cargador; cada discrepancia que salga se corrige en su regla con su caso en la prueba unitaria de esa familia.
- Verif: `pruebas/revisor`

**R1.11 Hecho `mismo-texto` en el paso** — REQ-REV-006
- RED `interprete/expresiones.test.ts`: `sc.next() == "si"` con la entrada «si» → `hechos: [{ punto, tipo: 'mismo-texto', mismoTexto: true }]` y resultado `false`; `"a" == "b"` → `false`; las comparaciones numéricas no llevan hecho (eso es R2.2); falla.
- GREEN: `interprete/expresiones.ts` lo anota con `StringJava.equals`; `Paso.hechos` en `traza/paso.ts`.
- Verif: `motor/interprete`

**R1.12 Textos del revisor** — REQ-REV-001, REQ-REV-003
- RED `textos/es-MX/revisor.test.ts`: `familiaDelProblema` y `familiaDelAviso` cubren todos los códigos (tipos `Record`); un `porQue` por familia; texto de cada trampa y de cada confirmación sin marcadores; resumen con 0, 1 y n trampas («revisé las 5 que conozco…»); ninguna frase con «incorrecto», «error tuyo» o «te equivocaste»; falla.
- GREEN: `src/textos/es-MX/revisor.ts` (borradores para la revisión del PO en R1.17).
- Verif: `textos/es-MX/revisor`

**R1.13 Presentación del revisor** — REQ-REV-001, REQ-REV-006, REQ-REV-007 · PR-4
- RED `presentacion/revisor.test.ts`: paso 0 de `u5-switch-sin-break-fallthrough` → 3 trampas en 6, 8 y 10; MaquinaSnacks → «revisé las 5…»; con `revisorAlInicio: false` no hay resumen; una confirmación por familia con las positivas (`nextLine()` leyó `""`; dos textos iguales y `false`; caída al `case 2`; `false` y aun así la línea siguiente; `25 / 3` → `8` → `8.0`); sin manifestación no hay nota; un error de compilación da su porqué; falla.
- GREEN: `src/presentacion/revisor.ts` + `ModeloVista.revisor`.
- Verif: `presentacion/revisor`

**R1.14 Personajes y nota del revisor** — REQ-VIS-014, REQ-REV-001, REQ-REV-007
- RED `componentes/{Robot,NotaDelRevisor,Explicacion}.test.tsx`: `personaje` programador y revisor con accesorio distinto (`data-personaje`, la lupa) y nombre accesible; la nota en la misma región `aria-live`; «Ver explicación» con teclado; con un error de compilación habla el revisor con `AvisoProblema` intacto y su porqué; falla.
- GREEN: `Robot.tsx` (`personaje`), `NotaDelRevisor.tsx`, `Explicacion.tsx`, `textos/es-MX/robot.ts`, estilos.
- Verif: `interfaz/componentes`

**R1.15 Marca de trampa en el editor** — REQ-REV-007
- RED `editor/marcas-de-trampa.test.ts`: cada línea de `vista.trampas` lleva `cm-trampa` y la marca ⚑ con nombre «Trampa», distinta de ✖ y ⓘ; ninguna en edición después de cambiar el código; falla.
- GREEN: `src/interfaz/editor/marcas-de-trampa.ts` sobre el `StateField` de resaltados (4.4).
- Verif: `interfaz/editor`

**R1.16 E2E y accesibilidad del revisor** — REQ-REV-006, REQ-REV-007 (CR3)
- RED `pruebas/e2e/revisor.spec.ts`: `u5-switch-sin-break-fallthrough` (aviso del paso 0, marcas, nota en cada caída) y la positiva del renglón pendiente con su entrada, solo con teclado; axe sin graves ni críticas; Chromium, Firefox y WebKit; falla.
- GREEN: los huecos que destape.
- Verif: `npm run e2e -- revisor`

**R1.17 Cierre de R1** · proceso
- `sdd-verify` del hito; el PO revisa `textos/es-MX/revisor.ts` y `corpus/trampas-esperadas.json`; commit confirmado; `state.yaml`.

## Hito R2 — Modo reto

**Objetivo:** el robot programador pregunta con tres opciones antes de cada condición y selección, con la respuesta y las refutaciones tomadas del motor.
**Entrada:** R1 cerrado; respuestas del PO a PR-1, PR-2 y PR-3 (o sus recomendaciones). **Sesiones:** 3–4.

**R2.1 ADR 018 — Modo reto (enmienda D4)** · documento · PR-1, PR-2
- `docs/adr/018-modo-reto.md`: D4 pasa a tres opciones; opción = veredicto + razón como afirmaciones; catálogo y selección (§3.3–3.4); hechos del motor; alternativas B y C.

**R2.2 Hecho `relacion` de las comparaciones numéricas** — REQ-RETO-006
- RED `interprete/expresiones.test.ts`: `i < 10` con `i` = 10 → `igual`; `0.0 / 0.0 < 1` → `sin-orden`; `'a' < 98` → `menor`; `long`; `-0.0 == 0.0` → `igual`; propiedad en `pruebas/propiedades/relacion-del-corpus.test.ts`: en todo paso de condición del corpus, la relación es coherente con el resultado de su operador; falla.
- GREEN: `interprete/expresiones.ts` (mismas operaciones que deciden el resultado).
- Verif: `motor/interprete` · `propiedades/relacion-del-corpus`

**R2.3 Piezas y forma de la condición** — REQ-RETO-003, REQ-RETO-006 (CR9)
- RED `interprete/explicar.test.ts`: `cantidad < 1 || cantidad > 3` con 2 → piezas `2 < 1`/false y `2 > 3`/false, forma `o`; `edad >= 18 && tieneIne` con 16 → la segunda con `resultado: null` y `sustituida: null`; `!(x > 3)` → `no`; `seEncontroNegativo` → clase `variable`; falla.
- GREEN: `ir/generar-ir.ts` (`CondicionIr.forma`), `interprete/explicar.ts`, `traza/explicacion.ts`.
- Verif: `motor/interprete` + `npm run rendimiento` dentro de C11 (100 000 pasos ≤ 1 s; cambio de paso ≤ 100 ms p95)

**R2.4 Estructura de los `if` en la vista** — REQ-RETO-004
- RED `ir/vista-programa.test.ts`: `sinoEsIf`, `enEscalera` y `entoncesTermina` en `u5-escalera-else-if-orden-incorrecto`, en el `if` de la línea 53 de MaquinaSnacks (`abrupta` por `return`) y en `u5-decision-anidada-licencia`; falla.
- GREEN: `ir/generar-ir.ts`, `ir/vista-programa.ts` (`RamasDeIf`).
- Verif: `motor/ir`

**R2.5 Afirmaciones, reglas de Java y su respaldo** — REQ-RETO-003, REQ-RETO-004, REQ-RETO-006, REQ-DIFF-009
- RED `presentacion/reto/afirmaciones.test.ts`: `verificar` de cada tipo (§3.2) contra trazas reales del corpus; `pruebas/diferencial/reto.test.ts`: cada `ReglaDeJava` tiene su programa en `corpus/experimentos/reto/` y el motor coincide con su golden; falla.
- GREEN: `presentacion/reto/afirmaciones.ts` + ≈ 14 programas (`o-revisa-el-segundo`, `y-no-revisa-el-segundo`, `frontera`, `while-no-entra`, `escalera-se-detiene`, `return-termina-main`, `switch-break-y-caida`…) + `oraculo:goldens`.
- Verif: `presentacion/reto` · `diferencial/reto`

**R2.6 Textos del reto** — REQ-RETO-005 · PR-2
- RED `textos/es-MX/reto.test.ts`: pregunta por construcción; texto de cada familia, veredicto, refutación y retroalimentación (acierto, parcial, error); ninguna opción pasa de 140 caracteres con los datos más largos del corpus; sin marcadores ni «incorrecto»; falla.
- GREEN: `src/textos/es-MX/reto.ts` (borradores para la revisión del PO en R2.13).
- Verif: `textos/es-MX/reto`

**R2.7 Familias y constructor del reto** — REQ-RETO-002, REQ-RETO-003, REQ-RETO-004
- RED `presentacion/reto.test.ts`: los cuatro retos de MaquinaSnacks `a1 2 50`, la línea 72 con `b2 3 40` y la 53 con `a2 5` exactamente como en §3.5; los seis casos del corpus de §3.5; ningún reto en otros pasos; mismo orden en dos corridas; la correcta en `(nodo × 7 + revisión) mod 3`; falla.
- GREEN: `presentacion/reto/familias.ts` + `presentacion/reto.ts` (§3.4).
- Verif: `presentacion/reto`

**R2.8 Propiedad del reto en todo el corpus** — REQ-RETO-003, REQ-RETO-004, REQ-RETO-006 (CR4)
- RED `pruebas/propiedades/reto-del-corpus.test.ts`: en cada paso de condición y de selección de cada programa ejecutable del corpus (incluidos `trampas/` y `reto/`): tres opciones distintas, exactamente una con todas sus afirmaciones verdaderas, cada distractor con al menos una falsa, ninguna afirmación `pieza` sobre una pieza sin revisar, textos resueltos; falla (el recorredor `pruebas/propiedades/pasos-de-condicion.ts` no existe).
- GREEN: el recorredor y las correcciones que destape (cada una con su caso en `presentacion/reto.test.ts`).
- Verif: `propiedades/reto-del-corpus`

**R2.9 Estado y navegación con retos** — REQ-RETO-001, REQ-RETO-007, REQ-RETO-008, REQ-VIS-013 · PR-1, PR-3
- RED `estado/reductor.test.ts` + `presentacion/modelo-vista.test.ts`: `alternar-reto` sin perder la posición; `siguiente` no avanza con un reto pendiente; `responder-reto` registra y avanza; la reproducción se pausa; atrás y adelante conservan la respuesta; «Fin» salta retos; `visualizar` vacía respuestas; `silenciar-ciclo` hasta la revisión `false` de ese nodo; falla.
- GREEN: `estado/reductor.ts` (`ajustes`, `reto`), `modelo-vista.ts` (`reto`, `retroalimentacion`), `contenedores/Visualizador.tsx`.
- Verif: `interfaz/estado` · `presentacion/modelo-vista`

**R2.10 Pregunta del reto e interruptor** — REQ-RETO-001, REQ-RETO-005, REQ-RETO-008, REQ-RETO-009, REQ-VIS-013
- RED `componentes/{PreguntaReto,InterruptorReto}.test.tsx`: tres botones con número y `aria-keyshortcuts` 1/2/3; foco en la opción 1; retroalimentación con ✔/◐/✖ y palabra en `aria-live="polite"`; «Ya entendí este ciclo» solo en ciclos; el interruptor es `role="switch"` con nombre del catálogo; falla.
- GREEN: los dos componentes, `BarraControles.tsx`, `textos/es-MX/controles.ts`, estilos (proyector incluido).
- Verif: `interfaz/componentes`

**R2.11 El enlace lleva `reto` y `revisor`** — REQ-AULA-002 · PR-4 · depende: 5.4 de `visualizador-java`
- RED `presentacion/enlace.test.ts`: ida y vuelta exacta con `reto=1` y `revisor=despues`; un enlace sin ellos abre con el reto apagado y el aviso del paso 0; falla.
- GREEN: `src/presentacion/enlace.ts`. Si la 5.4 aún no existe, esta tarea pasa a ser parte de su contrato y se cierra con ella.
- Verif: `presentacion/enlace`

**R2.12 E2E del reto: teclado, proyector y AA** — REQ-RETO-002, REQ-RETO-007, REQ-RETO-009, REQ-AULA-005 (CR5)
- RED `pruebas/e2e/reto.spec.ts`: MaquinaSnacks `a1 2 50` presenta 4 retos (24, 53, 66, 72) y se contestan con 1/2/3; regresar no vuelve a preguntar; en proyector a 1024×768 y 1280×720 nada se encima ni se corta; axe sin graves ni críticas; tres motores; falla.
- GREEN: los huecos que destape.
- Verif: `npm run e2e -- reto`

**R2.13 Cierre de R2** · proceso
- `sdd-verify` del hito; el PO revisa `textos/es-MX/reto.ts` y el catálogo de familias (§3.3); commit confirmado; `state.yaml`; avisar al orquestador para conciliar 5.1, 5.4 y 5.6 de `visualizador-java`.

## Hito R3 — Libro: la sección, los accesos y la oleada 1

**Objetivo:** el libro funciona completo con los 16 temas de la oleada 1 (U5, U6 e incremento y decremento), aprobados por el PO.
**Entrada:** R2 cerrado (los borradores R3.10 y R3.11 pueden empezar durante R2: no tocan código de R2); respuesta a PR-5. **Sesiones:** 3–4 + la revisión del PO.

**R3.1 ADR 019 — Libro de temas** · documento
- `docs/adr/019-libro-de-temas.md`: contenido tipado; ejemplos del oráculo; aprobación con huella y la regla «nadie marca aprobado sin el visto bueno explícito del PO»; accesos por el árbol de CodeMirror; carga diferida y límite de peso.

**R3.2 Modelo e índice del libro** — REQ-LIBRO-001, REQ-LIBRO-002
- RED `textos/es-MX/libro/indice.test.ts`: los 31 ids de §4.2, únicos, con unidad y oleada; todo tema con contenido cumple la estructura (idea, cómo se escribe, ≥ 1 ejemplo, errores típicos, resumen), ≤ 700 palabras y sin salidas de consola escritas; `relacionados` existen; un tema sin contenido está en borrador; falla.
- GREEN: `textos/es-MX/libro/{tipos,indice}.ts`.
- Verif: `textos/es-MX/libro`

**R3.3 Ejemplos del libro con el oráculo** — REQ-LIBRO-003, REQ-DIFF-009
- RED `herramientas/oraculo/generar-goldens.test.ts` (descubre `corpus/libro/`) + `pruebas/diferencial/libro.test.ts` (los que ejecutan, byte a byte; los de error, veredicto y línea), con un ejemplo semilla `corpus/libro/u6-for/tabla-del-3.java`; falla.
- GREEN: `generar-goldens.ts` recorre `libro`; el ejemplo y su `.meta.json`; goldens.
- Verif: `diferencial/libro` · `test:oraculo`

**R3.4 Huella y aprobación** — REQ-LIBRO-006
- RED `pruebas/libro/aprobaciones.test.ts` + `herramientas/libro-huella.test.ts`: un tema aprobado con huella vieja falla (con un tema de prueba); la huella cambia si cambia un texto o un ejemplo; los borradores no salen en el índice publicado (`mostrarBorradores: false`); falla.
- GREEN: `herramientas/libro-huella.ts`, script `libro:huella` en `package.json`, filtro en presentación.
- Verif: `pruebas/libro` · `herramientas/libro-huella`

**R3.5 Presentación del libro** — REQ-LIBRO-001, REQ-LIBRO-005 (CR7)
- RED `presentacion/libro.test.ts`: índice por unidad, anterior y siguiente; tema de un paso por su clave (`tieneSino`, escalera, tipo de ciclo, `switch`); tema de cada familia de problema y de cada trampa; cobertura: todo `if`/`switch`/`while`/`do`/`for` de la galería y del corpus ejecutable lleva a un tema publicado; falla.
- GREEN: `src/presentacion/libro.ts`.
- Verif: `presentacion/libro`

**R3.6 Pantalla del libro, carga diferida y abrir un ejemplo** — REQ-LIBRO-001, REQ-LIBRO-004, REQ-LIBRO-007, REQ-LIBRO-008, REQ-VIS-014
- RED `interfaz/libro/*.test.tsx` + `estado/reductor.test.ts` + `pruebas/arquitectura/libro-diferido.test.ts`: `pantalla` y `temaAbierto` sin perder programa ni paso; `cargar-programa { codigo, entradaPreparada }` y «Volver a mi programa»; el robot explicador con su libro; la salida del ejemplo es la del golden; ningún módulo de `src/interfaz` importa `textos/es-MX/libro/u*.ts` salvo con `import()`; falla.
- GREEN: `interfaz/libro/{PantallaLibro,TemaDelLibro,EjemploDelLibro}.tsx`, reductor, `Robot.tsx` (explicador). Si la 5.2 ya creó `cargar-programa`, se reutiliza.
- Verif: `interfaz/libro` · `arquitectura/libro-diferido`

**R3.7 Accesos en contexto** — REQ-LIBRO-005
- RED `editor/accesos-a-temas.test.ts` + `componentes/Explicacion.test.tsx`: marca 📖 en las líneas de `if`/`switch`/`while`/`do`/`for` (árbol de CodeMirror), con el tema según §4.5 (un `for` con `i--` agrega el de decrementales); `Alt+F1` en la línea del cursor; el globo enlaza el tema de la condición actual; solo temas publicados; falla.
- GREEN: `interfaz/editor/accesos-a-temas.ts`, `Explicacion.tsx`, ayuda de atajos.
- Verif: `interfaz/editor` · `interfaz/componentes`

**R3.8 Enlaces desde el revisor y el reto** — REQ-LIBRO-005
- RED `presentacion/{revisor,reto}.test.ts`: el porqué de un problema y la nota de una trampa enlazan su tema; la retroalimentación del reto enlaza el de la construcción y, si la familia lo tiene, el de su error; nunca un borrador; falla.
- GREEN: `presentacion/{revisor,reto}.ts`, `NotaDelRevisor.tsx`, `PreguntaReto.tsx`.
- Verif: `presentacion`

**R3.9 Límite de peso del libro** — REQ-LIBRO-007 (CR6)
- RED `herramientas/presupuesto-tamano.test.ts`: con un `dist/` de prueba, un fragmento del libro de más de 80 KB gzip da salida 1 aunque el total quepa; falla.
- GREEN: `herramientas/presupuesto-tamano.ts` (del hito 3) con el límite por fragmento.
- Verif: `herramientas/presupuesto-tamano`; el peso real se mide en `npm run ci` al cerrar R3

**R3.10 Borrador oleada 1 — U5 (6 temas)** — REQ-LIBRO-002, REQ-LIBRO-003 · PR-5
- RED `textos/es-MX/libro/indice.test.ts` (ampliada): los 6 temas de U5 tienen contenido y ejemplos verificados por el oráculo; falla (sin contenido).
- GREEN: `textos/es-MX/libro/u5.ts` + `corpus/libro/u5-*/` + goldens. Estado borrador.
- Verif: `textos/es-MX/libro` · `diferencial/libro`

**R3.11 Borrador oleada 1 — U6 (9 temas) e incremento y decremento** — REQ-LIBRO-002, REQ-LIBRO-003 · PR-5
- RED la misma prueba, ahora con los 9 de U6 y `u4-incremento-y-decremento`; falla.
- GREEN: `textos/es-MX/libro/{u6,u4}.ts` + `corpus/libro/u6-*/`, `corpus/libro/u4-incremento-y-decremento/` + goldens. Estado borrador.
- Verif: `textos/es-MX/libro` · `diferencial/libro`

**R3.12 E2E del libro: accesible y sin red** — REQ-LIBRO-004, REQ-LIBRO-007, REQ-LIBRO-008
- RED `pruebas/e2e/libro.spec.ts`: índice y tres temas con teclado y axe; acceso en contexto desde un `for`; abrir un ejemplo y volver al programa; sin red tras la primera visita (sobre el build real, regla 8); tres motores; falla.
- GREEN: los huecos que destape.
- Verif: `npm run e2e -- libro`

**R3.13 Revisión y aprobación del PO — oleada 1** · proceso — REQ-LIBRO-006
- El PO revisa cada tema en `npm run dev` (marca «Borrador»); las observaciones se corrigen; con su aprobación explícita por tema, `npm run libro:huella -- <id>` → `aprobado` con fecha y huella.
- Verif: `pruebas/libro/aprobaciones` en verde con los 16 aprobados.

**R3.14 Cierre de R3** · proceso
- `sdd-verify` del hito; `npm run ci` (peso por fragmento y total); commit confirmado; `state.yaml`.

## Hito R4 — Libro, oleada 2

**Objetivo:** los 15 temas restantes (U3, U4 y U7), aprobados por el PO. Solo contenido: no toca código.
**Entrada:** R3 cerrado. **Sesiones:** 1–2 + la revisión del PO.

**R4.1 Borrador — U3 (6 temas)** — REQ-LIBRO-002, REQ-LIBRO-003
- RED `textos/es-MX/libro/indice.test.ts` con los 6 de U3; falla. GREEN `textos/es-MX/libro/u3.ts` + `corpus/libro/u3-*/` + goldens. Verif: `textos/es-MX/libro` · `diferencial/libro`

**R4.2 Borrador — U4 (7 temas)** — REQ-LIBRO-002, REQ-LIBRO-003
- RED la misma con los 7 restantes de U4; falla. GREEN `textos/es-MX/libro/u4.ts` + `corpus/libro/u4-*/` + goldens. Verif: ídem

**R4.3 Borrador — U7 (2 temas)** — REQ-LIBRO-002, REQ-LIBRO-003
- RED la misma con los 2 de U7; falla. GREEN `textos/es-MX/libro/u7.ts` + `corpus/libro/u7-*/` + goldens. Verif: ídem

**R4.4 Revisión y aprobación del PO — oleada 2** · proceso — REQ-LIBRO-006
- Como R3.13. Verif: `pruebas/libro/aprobaciones` con los 31 aprobados.

**R4.5 Cierre de R4** · proceso
- `sdd-verify` acotada al contenido; `npm run ci` (peso); commit confirmado; `state.yaml`.

## Matriz de trazabilidad

### Requisitos (29) → tareas

| Requisito | Tareas |
|---|---|
| REQ-REV-001 | R1.12, R1.13, R1.14 |
| REQ-REV-002 | R1.2, R1.5, R1.6, R1.7, R1.8, R1.9 |
| REQ-REV-003 | R1.2, R1.12 |
| REQ-REV-004 | R1.3, R1.5–R1.9, R1.10 |
| REQ-REV-005 | R1.3, R1.4, R1.10 |
| REQ-REV-006 | R1.11, R1.13, R1.16 |
| REQ-REV-007 | R1.13, R1.14, R1.15, R1.16 |
| REQ-RETO-001 | R2.9, R2.10 |
| REQ-RETO-002 | R2.7, R2.12 |
| REQ-RETO-003 | R2.3, R2.5, R2.7, R2.8 |
| REQ-RETO-004 | R2.4, R2.5, R2.7, R2.8 |
| REQ-RETO-005 | R2.6, R2.10 |
| REQ-RETO-006 | R2.2, R2.3, R2.5, R2.8 |
| REQ-RETO-007 | R2.9, R2.12 |
| REQ-RETO-008 | R2.9, R2.10 |
| REQ-RETO-009 | R2.10, R2.12 |
| REQ-LIBRO-001 | R3.2, R3.5, R3.6 |
| REQ-LIBRO-002 | R3.2, R3.10, R3.11, R4.1–R4.3 |
| REQ-LIBRO-003 | R3.3, R3.10, R3.11, R4.1–R4.3 |
| REQ-LIBRO-004 | R3.6, R3.12 |
| REQ-LIBRO-005 | R3.5, R3.7, R3.8 |
| REQ-LIBRO-006 | R3.4, R3.13, R4.4 |
| REQ-LIBRO-007 | R3.6, R3.9, R3.12 |
| REQ-LIBRO-008 | R3.6, R3.12 |
| REQ-VIS-013 (modificado) | R2.1, R2.9, R2.10 |
| REQ-VIS-014 | R1.14, R3.6 |
| REQ-AULA-002 (modificado) | R2.11 |
| REQ-AULA-005 (modificado) | R2.12 (y la 5.6 de `visualizador-java`, conciliada) |
| REQ-DIFF-009 | R1.3, R2.5, R3.3 |

### Criterios de éxito → tareas

| Criterio | Tareas |
|---|---|
| CR1 cero falsos positivos en el corpus curricular | R1.4, R1.10 |
| CR2 muestras positivas y casi-trampas | R1.3, R1.10 |
| CR3 confirmación en la ejecución | R1.13, R1.16 |
| CR4 reto en todo el corpus | R2.8 |
| CR5 E2E del reto con teclado y proyector | R2.12 |
| CR6 libro = oráculo, aprobación, peso | R3.3, R3.4, R3.9, R3.14 |
| CR7 cobertura construcción → tema | R3.5 |
| CR8 textos en catálogo y revisados por el PO | R1.17, R2.13, R3.13, R4.4 |
| CR9 rendimiento C11 con piezas | R2.3 |

### Preguntas del PO → tareas que cambian

| Pregunta | Tareas | Si el PO elige otra opción |
|---|---|---|
| PR-1 reto en lugar de Sí/No | R2.1, R2.9, R2.10 | se conserva la 5.1 aparte y se agrega un segundo interruptor |
| PR-2 forma de las opciones | R2.1, R2.5–R2.8 | (B) catálogo de destinos más corto; (C) segundo paso en `PreguntaReto` |
| PR-3 frecuencia en ciclos | R2.9, R2.10 | sin `silenciar-ciclo`, o solo primera y última revisión |
| PR-4 momento del aviso | R1.13, R2.11 | cambia el valor por omisión de `revisorAlInicio` |
| PR-5 temas y oleadas | R3.10, R3.11, R4.1–R4.3 | se mueven temas entre R3 y R4 |

## Resumen por hito

| Hito | Objetivo | Tareas | Sesiones | Verificación |
|---|---|---|---|---|
| R1 | Robot revisor | 17 | 2–3 | `sdd-verify` R1 |
| R2 | Modo reto | 13 | 3–4 | `sdd-verify` R2 |
| R3 | Libro + oleada 1 | 14 | 3–4 + PO | `sdd-verify` R3 |
| R4 | Libro, oleada 2 | 5 | 1–2 + PO | `sdd-verify` acotada |
| **Total** | | **49** | **9–13** | |
