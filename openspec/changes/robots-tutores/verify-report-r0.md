# Informe de verificación — `robots-tutores` · hito R0 «Pantalla y personajes»

**Fecha**: 2026-10-19 · **Rama**: `feat/r0-pantalla` (HEAD `2c86eae`, unión de la pantalla `cd54467` con el libro `1c5fa4b`) · **Modo**: Strict TDD (`npm test`, Vitest `--reporter=dot`) · **Almacén**: hybrid (este archivo + engram `sdd/robots-tutores/verify-report-r0`)
**Alcance**: tareas R0.1 a R0.15 (R0.16 es este cierre). Specs: `pantalla-y-personajes` (REQ-PANT-001 a 010), `uso-en-aula` (REQ-AULA-001 y 004), `libro-de-temas` (REQ-LIBRO-002, 003, 004, lo que R0.13/R0.14 tocan) y `verificacion-diferencial` (REQ-DIFF-009, la parte del libro).
**Regla de cierre del PO**: solo bloquea lo que afecta el uso real en clase (programas del curso, ejercicios del PO, errores típicos del alumno); lo exótico es advertencia o sugerencia.

## Veredicto: PASS WITH WARNINGS

Sin CRITICAL. 25 de 29 escenarios del alcance de R0 están cubiertos por una prueba que pasa; los 4 restantes dependen de tareas posteriores del propio plan (5.4, R1.5, 5.2/5.3, R2.5) y no tienen prueba que falle. Las advertencias son de proceso (evidencia TDD sin tabla por tarea) y de bordes de pantalla (celulares de 320 px o ventanas bajas).

---

## Completitud

| Métrica | Valor |
|---|---|
| Tareas del hito (R0.1 a R0.15) | 15 |
| Marcadas ✅ en `tasks.md` | 15 (todas con fecha 2026-10-19) |
| Pendientes | R0.16 (este cierre: panel, revisión del PO de textos, `npm run ci`, commit confirmado, `state.yaml`) |
| Tareas de código/contenido con prueba | 13 de 13 (R0.3 a R0.15); R0.1 (PO) y R0.2 (ADR 017, existe) no llevan RED |

## Ejecución real

| Comprobación | Resultado | Quién |
|---|---|---|
| `npm test` | **190 archivos / 7916 pruebas pasan**, salida 0, 67,6 s | repetida aquí |
| `npm run lint`, `npm run tipos` | limpios | orquestador (no repetido) |
| `npm run e2e` (Chromium, Firefox, WebKit) | 321 pasan, 3 omitidas (WebKit sin red con service worker, defecto documentado de Playwright) | orquestador; `test-results/.last-run.json` dice `passed` (13:57) |
| `npm run presupuesto` | 330,5 KB de 500 | orquestador |
| `npm run test:oraculo` | 924 pasan, 1 omitida | orquestador |
| Build | no se corrió (regla 8) | — |
| Cobertura v8 sobre los archivos de producción cambiados (41) | **98,4 % de líneas, 95,8 % de ramas** (ver abajo) | repetida aquí |

Dos pruebas fallaron **solo bajo la instrumentación de cobertura** (con `--testTimeout=180000`, igual fallan): `App.test.tsx > un ciclo que no termina, con el motor real` (tarda ≈ 35 s sin cobertura contra un tope de 60 s fijado en la prueba) y `Ejemplos.test.tsx > por omisión pide el fragmento real de Vite` (espera 1 s por defecto a un `import()` real). Ambas pasan en `npm test` y la primera también sola (39 s). No es regresión; ver SUGGESTION S1.

---

## Cumplimiento TDD estricto

| Revisión | Resultado | Detalle |
|---|---|---|
| Evidencia TDD reportada | ⚠️ | No hay tabla «TDD Cycle Evidence» por tarea. `tasks.md` solo trae «✅ hecha (fecha)»; engram #893 y #894 son resúmenes narrativos con cifras globales. Cada archivo de prueba declara en su encabezado «RED de la tarea R0.x», pero el historial es un solo commit por rama (`cd54467`, `1c5fa4b`), así que no se puede probar que cada RED falló antes del GREEN. |
| Todas las tareas de código tienen pruebas | ✅ | 13/13 |
| RED (el archivo de prueba existe) | ✅ | 13/13 archivos o conjuntos existen |
| GREEN (la prueba pasa hoy) | ✅ | 7916/7916 en `npm test`; E2E 321/324 con 3 omitidas documentadas |
| Triangulación | ✅ | Abundantes casos con valores distintos (`it.each` por personaje, ánimo, estado de ejecución, causa de fin; 5 datos de ejemplo de la máquina de snacks; 12 de 12 mutaciones puntuales atrapadas, ver abajo) |
| Prueba escrita antes que el CSS (R0.12, R0.15) | ⚠️ | El orquestador registró (engram #889) que parte de las E2E de R0.12/R0.15 se escribió **después** del CSS. Contradice la regla 3 de `CLAUDE.md` para esas dos tareas; solo hay el dato de segunda mano. |
| Red de seguridad en archivos modificados | ➖ | No registrada. Los archivos modificados (`Visualizador.tsx`, `reductor.ts`, `Explicacion.tsx`, `EditorJava.tsx`, `BarraControles.tsx`…) ya tenían pruebas y siguen en verde. |

**Prueba de que las pruebas no son vacías (muestreo de mutaciones).** Sobre una copia del árbol en el scratchpad (el repositorio no se tocó) apliqué 12 mutaciones puntuales a código de producción de R0 y corrí las pruebas relacionadas (523 pruebas). **Las 12 fueron atrapadas**: puerta «Leer un tema» siempre visible, hablante fijo, total de pasos siempre conocido, entrada preparada sin salto final, «Siguiente» sin ser primario, una puerta que no termina el saludo, sin nombre del robot al cambiar de hablante, texto de consola vacía, sin foco en la primera puerta, fin del recorrido sin «Probar con otros datos», proyector sin ajuste de línea, «Libro» siempre en la navegación.

### Calidad de aserciones

Sin tautologías (`expect(true)`), sin bucles fantasma (las guardas `toHaveLength(35)`, `toHaveLength(60)`, `toBeGreaterThan(100)`, `programas.length >= 43` impiden recorrer colecciones vacías), con controles de que los filtros disparan (`libro.test.ts` control de entradas sin salto final, `voz.test.ts` detector de formas prohibidas, `contenido-del-libro.test.ts` criterio de «salida escrita a mano»). `toBeTruthy()` aparece 45 veces sobre elementos de `getByRole` (que ya lanzan si no existen): redundante, no vacío. Un único `vi.mock` por archivo (el transporte del trabajador) en los 3 archivos del contenedor. **Aserciones: 0 CRITICAL, 0 WARNING.**

### Distribución de capas (casos declarados en los archivos de prueba cambiados)

| Capa | Casos | Archivos | Herramienta |
|---|---|---|---|
| Unidad (`presentacion`, `textos`) | 260 | 14 | Vitest, Node |
| Unidad/arquitectura/diferencial/herramientas | 85 | 8 | Vitest, Node (diferencial lee goldens del oráculo) |
| Integración (componentes y contenedor) | 313 | 19 | Vitest + Testing Library + jsdom |
| E2E nuevas de R0 | 25 | 2 | Playwright ×3 motores + axe |
| E2E existentes ajustadas | 32 | 4 | Playwright |

### Cobertura de los archivos cambiados (líneas / ramas)

41 archivos de producción, **98,4 % / 95,8 %**. 37 de 41 al 100 % de líneas. Excepciones: `src/interfaz/main.tsx` 0 % (punto de entrada; lo ejercen las E2E), `herramientas/libro-borradores.ts` 89,3 % / 77,8 % (6 líneas sin cubrir, es el guion que genera el documento del PO), `src/presentacion/robot.ts` 97,8 %, `Visualizador.tsx` 98,1 % (3 líneas). Ramas más bajas: `libro-borradores.ts` 77,8 %, `Ejemplos.tsx` 80 %, `libro-programas.ts` 87,5 %.

---

## Matriz de cumplimiento de especificación

† = la evidencia es una E2E que corrió el orquestador (no repetida aquí; `.last-run.json` confirma que pasó).

| Requisito | Escenario | Prueba | Resultado |
|---|---|---|---|
| PANT-001 saludo | primera visita | `VisualizadorPantalla.test.tsx` > la primera visita (saludo, foco en la primera puerta, consola vacía, «Probar mi programa» enfoca el editor) | ✅ |
| PANT-001 | una puerta sin destino no aparece | `presentacion/ranura.test.ts` > sin ningún tema publicado, «Leer un tema» no aparece; `VisualizadorPantalla.test.tsx` (solo dos puertas) | ✅ |
| PANT-001 | enlace del docente | `reductor.test.ts` > abrir un programa lo termina el saludo; **no hay lectura de la URL** (es la tarea 5.4 de `visualizador-java`, `state.yaml` conciliación) | ⚠️ PARCIAL por plan |
| PANT-002 navegación | ir a Ejemplos y volver | `VisualizadorPantalla.test.tsx` > ir a «Ejemplos» y volver; `reductor.test.ts` > secciones | ✅ |
| PANT-003 acción junto al globo | al visualizar | `VisualizadorPantalla.test.tsx` > foco a «Siguiente», primario, bajo el globo; `pantalla.spec.ts` > «Siguiente» es el botón primario † | ✅ |
| PANT-003 | a 1366×768 | `pantalla.spec.ts` > escritorio 1366×768 † | ✅ |
| PANT-004 un dueño por dato | la vuelta en un solo lugar | `VisualizadorPantalla.test.tsx` > sin contador de vueltas; `EditorJavaCompleto.test.tsx` > etiqueta «↻ vuelta N» junto al ciclo | ✅ |
| PANT-004 | ciclo desbocado | `modelo-vista.test.ts` > posición sin total (límite de pasos, tiempo, espera); `ciclo-desbocado.spec.ts` > «Paso 100001» exacto † | ✅ |
| PANT-004 | teclear durante la visualización | `VisualizadorPantalla.test.tsx` > teclear no cambia el código y avisa, `aria-live="polite"` | ✅ |
| PANT-005 celular | paso 0 en 390×844 | `pantalla.spec.ts` > celular 390 px † | ✅ (ver W3) |
| PANT-006 ajustes | encender el proyector con teclado | `VisualizadorPantalla.test.tsx` > proyector con teclado; `AjustesDeLaClase.test.tsx` | ✅ |
| PANT-007 fin | fin de un ejemplo | `VisualizadorPantalla.test.tsx` > «Probar con otros datos» desde el paso 0 con entrada vacía; `pantalla.spec.ts` > fin del recorrido † | ✅ |
| PANT-008 tres robots | distinguibles sin color | `Robot.test.tsx` > tres personajes (silueta, accesorio, trazo de cabeza distintos; accesorio en todos los ánimos) | ✅ |
| PANT-008 | nombre accesible | `Robot.test.tsx` > nombre accesible; `VisualizadorPantalla.test.tsx` > «Robot revisor: …» | ✅ |
| PANT-009 un solo hablante | un error y su corrección | `VisualizadorPantalla.test.tsx` > quién habla cuando algo sale mal; `pantalla.spec.ts` † | ✅ |
| PANT-009 | nunca dos robots | `Explicacion.test.tsx` > un solo robot habla; `pantalla.spec.ts` > un solo robot en cada estado † (saludo, edición, visualización, espera, fin, error; reto/trampa/libro llegan en R1 a R3) | ✅ |
| PANT-010 voz | condición con else (línea 72) | `explicaciones.test.ts` > T1, texto exacto de la spec | ✅ |
| PANT-010 | condición compuesta con piezas | `explicaciones.test.ts` > «conserva la sustitución completa (las piezas llegan en R1)»; falta «ningún lado da `true`» (tarea R1.5) | ⚠️ PARCIAL por plan |
| PANT-010 | el paso 0 invita a predecir | `textos/es-MX/robot.test.ts` > `alInicio`; `pantalla.spec.ts` † | ✅ |
| AULA-001 galería | origen marcado («de autoría») | `galeria.test.ts` marca «Del curso» y «Ejercicio del profesor»; **no existe aún ningún programa de autoría** (tareas 5.2/5.3) | ⚠️ PARCIAL por plan |
| AULA-001 | abrir un ejercicio con su entrada | `presentacion/galeria.test.ts` > `a1\n2\n50\n` byte a byte; `VisualizadorPantalla.test.tsx` > `b2·3·40`; `galeria-completa.test.ts` > 20 `.entrada.txt` terminan en `\n` | ✅ |
| AULA-004 proyector | sin recorte a 1024×768 | `proyector.spec.ts` > ningún panel se superpone ni corta † | ✅ |
| AULA-004 | línea larga a 1024×768 | `proyector.spec.ts` > 53 caracteres partida en dos renglones, número una vez, sin desplazamiento horizontal †; `EditorJava.test.tsx` > ajuste de línea | ✅ |
| LIBRO-002 estructura | el tema del `while` | `indice.test.ts` > las ocho secciones en orden; etiquetas «¿Qué crees que imprime?», «Ver la salida»; **la pantalla del libro es R2.5** | ⚠️ PARCIAL por plan |
| LIBRO-003 programas verificados | salida del ejemplo | `pruebas/diferencial/libro.test.ts` > idéntico al JDK (43 programas); `contenido-del-libro.test.ts` > sin salidas escritas a mano | ✅ |
| LIBRO-003 | ejemplo de un error | `diferencial/libro.test.ts` > javac y el motor rechazan en la misma línea (4 programas de U6; el `int x = 3.5` es del tema de variables, R2.10) | ✅ |
| LIBRO-003 | ejemplo fuera del subconjunto | `diferencial/libro.test.ts` exige `estado === 'ejecutado'` (ni aviso ni «No disponible») | ✅ |
| LIBRO-004 Ponte a prueba / Ahora hazlo tú | comprobar una tarea de crear | `reglas-del-tema.test.ts` (2 o 3 predicciones, modificar y crear); `libro-borradores.test.ts` > «Para comprobar» con el golden; `indice.test.ts` > borradores de U6 | ✅ |
| DIFF-009 corpus de los robots | la solución de una tarea del libro | `diferencial/libro.test.ts` + `libro-borradores.test.ts` > toda salida es la del golden (los escenarios de trampas y de reto son R3 y R1) | ✅ |

**Resumen**: 25 de 29 escenarios cumplidos (✅), 4 parciales por plan (⚠️), 0 fallan, 0 sin prueba. **Requisitos**: 12 de 16 totalmente cubiertos (PANT-002 a 009, AULA-004, LIBRO-003, LIBRO-004, DIFF-009 en su parte del libro); 4 con una cláusula que el propio plan difiere (PANT-001 enlace, PANT-010 piezas, AULA-001 autoría, LIBRO-002 pantalla del libro); 0 sin implementar.

---

## Correctitud estática (evidencia en el código)

| Requisito | Estado | Nota |
|---|---|---|
| PANT-001/002/006 | ✅ | `Saludo`, `Navegacion` (`aria-current`, negrita y raya además del color), `AjustesDeLaClase` (estado en palabras, Escape devuelve el foco). «Libro» y «Leer un tema» dependen de `interfaz/datos/temas-publicados.ts`, que devuelve `false` a propósito hasta R2. |
| PANT-003/007 | ✅ | `RanuraDeAcciones` + `presentacion/ranura.ts`: una sola cosa a la vez, el foco no se pierde al pasar de «Siguiente» al fin. |
| PANT-004 | ✅ | `ContadorVueltas` eliminado; leyenda ▶/▷; `totalConocido` solo para `terminado` y `excepcion`. |
| PANT-005 | ⚠️ | Editor `max-height: clamp(7.5rem, 100vh − 32.5rem, 35vh)`: llega a 35 % solo en ventanas de 800 px de alto o más; ver W3. |
| PANT-008/009 | ✅ | Tres figuras con `data-forma` y accesorio, mismo `viewBox`; `derivarHablante`; nombre antepuesto en la región `aria-live` solo al cambiar. |
| PANT-010 | ✅ / ⚠️ | `voz.test.ts` recorre todo el catálogo de los robots (más de 80 frases) contra 5 formas prohibidas. |
| AULA-001/004 | ✅ / ⚠️ | Galería con el fragmento diferido `import()`; `import.meta.glob` solo en `interfaz/datos/` (guarda en `galeria-completa.test.ts`). |
| LIBRO-002/003/004, DIFF-009 | ✅ | `textos/es-MX/libro/*` (34 ids, 5 temas con contenido: 329/355/383/324/380 palabras, tope 550), 43 programas con goldens del JDK 17.0.18, ninguno con aviso de fuera de alcance. |

## Coherencia con el diseño y las reglas de `CLAUDE.md`

| Decisión o regla | ¿Se cumplió? | Nota |
|---|---|---|
| Ranura de acciones, un hablante, puertas con destino, galería curricular, `import.meta.glob` aislado, PQ-6, voz «Java revisa…» (design §0 y ADR 017) | ✅ | Los 8 puntos aplicables a R0. |
| Archivos de design §9 | ✅ | Todos presentes. Extras sin riesgo: `Ejemplos.tsx`, `IconoDeAccesorio.tsx`, `editor/sangria-colgante.ts`, `presentacion/secciones.ts`, `herramientas/libro-{programas,borradores}.ts`, `textos/es-MX/libro/{etiquetas,reglas-del-tema}.ts`. |
| Textos solo en `src/textos/es-MX/` | ✅ | Regla ESLint `reglas-de-textos` (JSX, `aria-label`, `title`, `placeholder`) en verde; sin cadenas visibles sueltas en los componentes cambiados. |
| Identificadores en español ASCII | ✅ | Recorrido con la API de TypeScript sobre 91 archivos cambiados: 0 identificadores con tilde o ñ; los nombres en inglés son los impuestos (`props`, `update` de CodeMirror, `width`/`height` de Playwright). |
| Guardas de capa | ✅ | Matriz (`herramientas/eslint/`, `eslint.config.js`) sin cambios; lint limpio. |
| Cero red, sin dependencias nuevas | ✅ | `package.json` solo agrega el script `libro:borradores`; sin `fetch`/`XMLHttpRequest`/URL en `src/`; E2E «sin red» pasa en Chromium y Firefox. |
| Sin TODO ni mocks en producción | ✅ | Ningún `TODO`/`FIXME`; `vi.mock` solo en pruebas. `temas-publicados.ts` devuelve `false` por diseño (PQ-2), documentado y con su prueba. |
| Peso | ✅ | 330,5 KB de 500; el libro no entra al bundle todavía. |

---

## Hallazgos

### CRITICAL
Ninguno.

### WARNING
- **W1. Evidencia TDD sin tabla por tarea** (proceso). `openspec/changes/robots-tutores/tasks.md` marca R0.1 a R0.15 solo con fecha; engram #893/#894 resumen el hito sin RED/GREEN/triangulación por tarea, y el historial es un commit por rama. Con la regla estricta del módulo `strict-tdd-verify` esto sería CRITICAL; se baja a WARNING por la regla de cierre del PO (no afecta el uso en clase). Antes de archivar, conviene que el orquestador pegue en `tasks.md` o engram una tabla breve por tarea. Las 12 mutaciones atrapadas dan confianza de que las pruebas son reales.
- **W2. Pruebas E2E de R0.12 y R0.15 escritas después del CSS** (`pruebas/e2e/pantalla.spec.ts`, `pruebas/e2e/proyector.spec.ts`; dato del orquestador, engram #889). Hoy cubren el comportamiento y pasan, pero para esas dos tareas el ciclo RED→GREEN no se cumplió.
- **W3. Celular de 320 px o ventana baja** (`src/interfaz/estilos/aplicacion.css` línea 1123, `pruebas/e2e/pantalla.spec.ts`). REQ-PANT-005 pide «alrededor del 35 %» del alto a 390 y a 320 px y el globo completo en el paso 0. El CSS prioriza el globo: con `100vh − 32,5rem` el editor baja a ≈ 19 % en 320×640 y a ≈ 22 % en una ventana visible de 390×664, y a 320×568 el globo del paso 0 no cabe entero (hallazgo del agente de pantalla, engram #889). La E2E lo acepta aflojando el umbral a > 0,15 y probando 320 a 640 px de alto, no a 568. El escenario de la spec (390×844) sí se cumple. Es una desviación razonable pero no está registrada en ADR 017 ni en la spec. Decidir: documentarla o ajustar la spec.
- **W4. «Recargar ahora» dejó de ser lo primero que alcanza Tab** (`pruebas/e2e/actualizacion.spec.ts`, `src/interfaz/App.tsx`). Para cumplir «el foco está en la primera puerta» (REQ-PANT-001), el aviso de versión nueva, que va antes en el DOM, ahora exige Mayús+Tab (el agente de pantalla midió ≈ 5) y la E2E de la tarea 5.7 se reescribió con un bucle de hasta 8 intentos. Importa si el docente recibe el aviso en medio de una clase. Decisión no registrada en ADR 017.
- **W5. Pegar sobre una selección en Firefox tras un aviso con decoración** (`pruebas/e2e/pantalla.spec.ts`, prueba «un error de compilación…»). `insertText` de Playwright borra el texto en lugar de insertarlo cuando hay una línea decorada; la prueba lo esquiva con Backspace + pegado. El agente de pantalla lo ve también en el código anterior al hito, así que no es regresión, pero no se probó con un pegado real del navegador: conviene una comprobación manual en Firefox (alumno que corrige un error pegando su programa completo).
- **W6. Borrador `u6-for`: el mensaje del motor contradice al libro** (`openspec/changes/robots-tutores/borradores/u6-parte-1.md` líneas ≈ 1395-1417, `src/textos/es-MX/problemas.ts` línea 78). Para el error típico de usar `i` fuera del `for`, el visualizador dice «No existe una variable llamada "i". ¿La declaraste antes?», pero el alumno sí la declaró (en el ciclo). Es el error más corriente de U6. No es un defecto de R0 (los temas son borrador y el mensaje es del hito 1), pero el PO no debería aprobar `u6-for` mientras no se resuelva (plan: E2 en R3 o ajuste del texto del tema).

### SUGGESTION
- **S1. Pruebas lentas o sensibles a la carga**: `App.test.tsx > un ciclo que no termina` tarda ≈ 35 s con un tope de 60 s; `Ejemplos.test.tsx > por omisión pide el fragmento real de Vite` usa la espera de 1 s por defecto. Fallan bajo cobertura v8; subir el tope de ambas.
- **S2. Textos huérfanos tras quitar `ContadorVueltas`**: `textosPaneles.vueltas.titulo` y `.vuelta` (`src/textos/es-MX/paneles.ts`) ya no los usa ningún componente.
- **S3. `temas-publicados.ts` devuelve `false` fijo**: al conectarlo en R2.5, agregar una prueba que falle si hay un tema aprobado y esta función sigue diciendo `false`.
- **S4. Estilo de la sección actual** (negrita, raya, fondo) y el contraste «línea actual más destacada que la siguiente» (REQ-PANT-002, 004) viven solo en CSS; ninguna prueba automática los afirma. Cubiertos por la revisión visual del panel.
- **S5. Puerta «Probar mi programa» con el accesorio de la lupa**, que es también el de la marca de trampa del revisor (observación del orquestador, engram #889); decisión de apariencia del PO.
- **S6. REQ-PANT-009 y la galería**: `hablante.ts` dice que en «Ejemplos» habla el paso a paso, pero la E2E comprueba que no hay ningún robot visible (el visualizador está oculto). Coherente con «nunca dos», pero la regla del texto del requisito («todo lo demás») y lo que se ve difieren; aclarar en el próximo ajuste de la spec.
- **S7. Diferidos por plan que R0.16 debe recordar**: enlace (5.4), autoría (5.2/5.3), piezas de la condición (R1.5), pantalla del libro (R2.5), conciliar 5.2 y 5.5 de `visualizador-java` y actualizar `state.yaml` (`phases.apply`).

---

## Resultado

**PASS WITH WARNINGS.** El hito R0 cumple lo que afecta el uso en clase: el alumno nuevo llega a un ejemplo en tres acciones con teclado, «Siguiente» queda junto al robot, el proyector a 1024×768 y 1280×720 no corta ni superpone, un solo robot habla y los 35 programas del curso más la máquina de snacks abren con la entrada del oráculo. Se puede pasar a la revisión de textos del PO y al `npm run ci`; las seis advertencias no bloquean, y W1, W3, W4 y W6 conviene resolverlas o decidirlas antes de archivar o de aprobar el tema `u6-for`.

`skill_resolution`: `injected` (reglas de Strict TDD y de cierre del PO recibidas en el prompt de lanzamiento; `strict-tdd-verify.md` cargado y aplicado).
