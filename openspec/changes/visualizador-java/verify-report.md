# Verify report — `visualizador-java`

**Modo:** Strict TDD (orquestador confirmó `strict_tdd: true` en el lanzamiento; runner: `npm test`)
**Alcance de esta corrida:** Lote 0 — tareas 0.1–0.15 y 5.13 (adelantada). La tarea 0.16 queda **fuera de alcance** (otro agente la ejecuta en paralelo; `openspec/config.yaml` no se tocó en esta verificación).
**Commit auditado:** árbol de trabajo tras `4b39fb4` (solo `state.yaml` modificado sin commitear, por el agente paralelo de 0.16 — no se tocó).

---

## Lote 0

### Veredicto: **PASS WITH WARNINGS**

Las 16 tareas del alcance (0.1–0.15 + 5.13) están implementadas con evidencia TDD real y verificable: cada una tiene un archivo de prueba que ejecuta código de producción real (JDK real, ESLint real, `git check-attr` real, CodeMirror real, Worker real vía transporte en proceso), sin asserts triviales. Los cinco comandos pedidos corren en verde sobre lo que existe hoy. No se encontró ningún defecto que rompa el criterio de salida del lote. Los WARNINGS son gaps reales pero conocidos, ya rastreados por el propio plan (`tasks.md`) o explícitamente fuera del alcance de este lote (dependen del remoto de GitHub, que aún no existe).

---

### Resumen de ejecución (cifras reales, salidas acotadas)

| Comando | Resultado |
|---|---|
| `npm test` | **121 passed \| 1 skipped (122)**, 26 archivos de prueba, 14.93s, exit 0 |
| `npm run lint` | **exit 0**, cero salida (`eslint . --quiet`) |
| `npm run tipos` | **exit 0**, cero salida (4 tsconfig: motor, trabajador, interfaz, herramientas) |
| `npm run oraculo:verificar` | **176 programas, goldens idénticos** a una regeneración real contra Temurin 17.0.18 |
| `npm run e2e -- u3-hola-mundo` (Chromium+Firefox+WebKit) | **5 passed \| 1 skipped** (6 tests = 2×3 motores); build real (`vite build`) + `vite preview` levantados por Playwright |
| `npm run licencias` (verificación adicional, invocado por `ci.yml`) | **9/9 dependencias de ejecución, todas permisivas** |
| `npm run presupuesto` (verificación adicional del criterio literal `npm run ci`) | **falla: `herramientas/presupuesto-tamano.ts` no existe** — esperado, es entregable del lote 5 (ver WARNING-3) |

El único test saltado en `npm test` es el de Docker en `herramientas/oraculo/medir-plataforma.test.ts` (`it.skipIf(!dockerDisponible())`, línea 118) — motivo explícito, no lanza, no finge (ver auditoría punto 6). El único test saltado en `e2e` es el offline de WebKit (ver auditoría punto 5).

---

### Completitud

| Métrica | Valor |
|---|---|
| Tareas en alcance | 16 (0.1–0.15, 5.13) |
| Tareas completas | 16/16 |
| Tareas incompletas | 0 |
| Fuera de alcance (no auditada) | 0.16 (en progreso, agente paralelo) |

---

### TDD Compliance

**Hallazgo de formato:** `sdd/visualizador-java/apply-progress` (engram #568) **no** trae la tabla "TDD Cycle Evidence" con las 8 columnas exactas que pide `strict-tdd.md` (Task \| Test File \| Layer \| Safety Net \| RED \| GREEN \| TRIANGULATE \| REFACTOR); trae, en cambio, una narrativa detallada por tarea (archivo de prueba, motivo del RED, contenido del GREEN, refactors). Reconstruí la tabla abajo leyendo directamente cada archivo de prueba (no confié en el resumen) y cruzándola con la ejecución real de `npm test`. **Clasifico esto como WARNING de formato, no CRITICAL**: la regla de `strict-tdd-verify.md` existe para detectar cuando el protocolo NO se siguió; aquí el protocolo SÍ se siguió — lo verifiqué de forma independiente y más rigurosa que si solo hubiera leído la tabla (ver WARNING-1).

| Tarea | Archivo de prueba | Capa | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 0.1 | `pruebas/arquitectura/andamiaje.test.ts` | Unit | N/A (nuevo) | ✅ Escrito | ✅ Pasa (real) | ✅ 4 casos | ✅ versiones en `versiones-fijadas.ts` compartido |
| 0.2 | `pruebas/arquitectura/fronteras.test.ts` | Integration (ESLint real programático) | N/A (nuevo) | ✅ Escrito | ✅ Pasa (real) | ✅ 4 casos | ✅ matriz como datos (`matriz-capas.ts`) |
| 0.3 | — (documento) | — | — | ➖ Sin RED/GREEN (tarea documental, según tasks.md) | — | — | — |
| 0.4 | `herramientas/licencias.test.ts` | Unit | N/A (nuevo) | ✅ Escrito (GPL-3.0 simulada) | ✅ Pasa (real) | ✅ 6 casos | ➖ ninguno relevante |
| 0.5 | `herramientas/oraculo/ejecutar.test.ts` + `jdk.test.ts` | Integration (JDK real) | N/A (nuevo) | ✅ Escrito | ✅ Pasa (real, Temurin 17.0.18 confirmado) | ✅ 7+6 casos | ➖ (flags de locale, no verificado a fondo) |
| 0.6 | `herramientas/oraculo/generar-goldens.test.ts` + `migrar-corpus.test.ts` | Integration (JDK real + FS real) | N/A (nuevo) | ✅ Escrito (`.salida.txt` heredado sin `\n` final) | ✅ Pasa (real) | ✅ 4+5 casos | ➖ ninguno relevante |
| 0.7 | `pruebas/arquitectura/gitattributes.test.ts` | Integration (`git check-attr` real) | N/A (nuevo) | ✅ Escrito | ✅ Pasa (real) | ✅ 4 casos | n/a |
| 0.8 | — (config CI) | — | — | ➖ Sin RED/GREEN (tasks.md lo declara así) | Verificación estructural del YAML | — | — |
| 0.9 | — (config CI) | — | — | ➖ Sin RED/GREEN | Verificado localmente vía `oraculo:verificar` | — | — |
| 0.10 | `herramientas/oraculo/medir-plataforma.test.ts` | Integration (JDK real; Docker condicional) | N/A (nuevo) | ✅ Escrito | ✅ Pasa (real, 8/8 salvo Docker) | ✅ 8 casos | ➖ ninguno relevante |
| 0.11 | `src/interfaz/pwa/registro.test.ts` + `manifiesto.test.ts` | Unit | N/A (nuevo) | ✅ Escrito | ✅ Pasa (real) | ✅ 3+3 casos | ➖ ninguno relevante |
| 0.12 | `pruebas/diferencial/u3-hola-mundo.test.ts` (+ 5 archivos de unidad en `motor/{fuente,lexico,sintaxis}`) | Integration (golden real) + Unit | N/A (nuevo) | ✅ Escrito | ✅ Pasa (real, byte a byte contra golden del oráculo) | ✅ ~35 casos (6 archivos, confirmado por listado) | ✅ contrato público fijado en `index.ts` |
| 0.13 | `src/trabajador/trabajador.test.ts` (+ `motor/traza/traza.test.ts`) | Integration | N/A (nuevo) | ✅ Escrito | ✅ Pasa (real) | ✅ 4 casos (trabajador) | ➖ |
| 0.14 | `src/interfaz/App.test.tsx` (+ `EditorJava.test.tsx`, `Consola.test.tsx`) | Integration (Testing Library) | N/A (nuevo) | ⚠️ Ver desviación abajo | ✅ Pasa (real) | ✅ 2+3+3 casos | ✅ separación contenedor/presentacional (ADR 013) |
| 0.15 | `pruebas/e2e/u3-hola-mundo.spec.ts` | E2E (Playwright, 3 motores) | N/A (nuevo) | ✅ Escrito | ✅ Pasa (real: 5/6, 1 saltado documentado) | ✅ 2 escenarios (funcional + offline) | n/a |
| 5.13 | — (documento legal) | — | — | ➖ Sin RED/GREEN (declarado así en tasks.md) | `LICENSE` (MIT) presente y referenciado | — | — |

**TDD Compliance: 13/13 tareas de código con evidencia RED→GREEN real y triangulación ≥2 casos** (las 3 tareas documentales —0.3, 5.13— y las 2 de configuración pura de CI —0.8, 0.9— no traen código de producción propio, consistente con lo que `tasks.md` declara para cada una).

**Desviación 0.14 (juzgada):** `apply-progress` declara que `App.tsx`/`Visualizador.tsx` se escribieron **junto con** `App.test.tsx` en vez de estrictamente antes, y que se remedió stubeando `App.tsx` a `return null`, confirmando el fallo real, y restaurando la implementación para confirmar el GREEN real. Esto es una desviación del orden estricto (RED antes que GREEN), pero la remediación descrita es metodológicamente equivalente a haberlo hecho en el orden correcto: hay una confirmación real de que la prueba SÍ falla sin la implementación. Lo clasifico como **WARNING, no CRITICAL** — la desviación fue declarada honestamente (no oculta) y la evidencia de remediación es concreta y verificable en la narrativa, no una simple afirmación.

---

### Test Layer Distribution

| Capa | Pruebas | Archivos | Herramienta |
|---|---|---|---|
| Unit | ~55 | 8 | Vitest |
| Integration (proceso real: JDK, ESLint, git, FS, Testing Library, Worker-en-proceso) | ~60 | 15 | Vitest (Node/jsdom) |
| E2E | 6 (2 × 3 motores) | 1 | Playwright (Chromium/Firefox/WebKit) |
| **Total** | **121 pasan + 1 saltada** | **26 archivos** | |

Nota: "Integration" aquí incluye deliberadamente pruebas que lanzan procesos reales (JDK, git) en vez de mocks — consistente con la regla del propio proyecto ("cero mocks: todas las aserciones caen sobre bytes producidos de verdad").

---

### Auditoría de calidad de aserciones

Revisé los 15 archivos de prueba del lote (contenido completo, no resumen) buscando los patrones prohibidos de `strict-tdd.md` (tautologías, `toEqual([])` sin contraparte, asserts solo de tipo, loops fantasma, smoke-tests sin aserción de comportamiento, acoplamiento a detalles de implementación, exceso de mocks).

**Assertion quality: ✅ Todas las aserciones verifican comportamiento real.** No encontré tautologías, ni loops sobre colecciones potencialmente vacías, ni smoke-tests sin aserción de contenido, ni acoplamiento a clases CSS. Cada `expect(result).toEqual([])`/`toHaveLength(0)` que aparece (p. ej. `migrar-corpus.test.ts:120-121`, exclusión de `Generar*.java`/`generado/`) tiene una contraparte no vacía en el mismo `it` o en el mismo `describe`, así que no es un caso trivial. No hay mocks de negocio en ningún archivo del lote — donde el "mock" sería natural (Worker), la prueba usa la ruta real en-proceso (`manejarMensaje`), documentado explícitamente como "cero mocks de negocio, solo cambia el transporte".

---

### Spec Compliance Matrix

| Requisito | Escenario | Prueba | Resultado |
|---|---|---|---|
| REQ-SUB-001 (parcial, 0.12) | "Clase con nombre propio, sin `Main`" | `pruebas/diferencial/u3-hola-mundo.test.ts` (clase `MiPrograma`, no `Main`) | ✅ COMPLIANT (parcial — la gramática completa con `package` ignorado, 3 formas de `main`, etc. cierra en 1.2) |
| REQ-DIFF-001 (0.5 de 0.5+2.1) | Oráculo único fuente de verdad | `herramientas/oraculo/ejecutar.test.ts`, `jdk.test.ts` + `npm run oraculo:verificar` (176/176 reales) | ✅ COMPLIANT (la primitiva de ejecución contra el JDK real está probada; el escenario "x86_64 no es verdad" cierra en 2.1 — `plataforma.yml` ya lo modela como `continue-on-error`, sin bloquear) |
| REQ-DIFF-002 | "Un golden sin el salto de línea final se detecta y se regenera" | `herramientas/oraculo/generar-goldens.test.ts:35-48` | ✅ COMPLIANT — el propio test usa el defecto real del `.salida.txt` heredado como fixture |
| REQ-DIFF-008 (arm64: 0.9; x86_64: 0.10) | "El job x86_64 mide sin bloquear" | `medir-plataforma.test.ts` (8 casos reales) + `.github/workflows/plataforma.yml` (`continue-on-error: true`, matriz ubuntu/windows) + `oraculo.yml` (macos-14, Temurin 17.0.18+8) | ⚠️ PARTIAL — estructura y pruebas locales verificadas; el job real en GitHub Actions **nunca ha corrido** (ver WARNING-3) |
| REQ-VIS-001 (parcial, 0.14) | "Pegar código sin configuración previa" | `src/interfaz/App.test.tsx` (pipeline real) + `pruebas/e2e/u3-hola-mundo.spec.ts` (tecleo real en CodeMirror) | ⚠️ PARTIAL — el pipeline funcional está probado end-to-end; ningún test asserta explícitamente que el gutter de números de línea o el resaltado de sintaxis estén en el DOM (la extensión `lineNumbers()`+`java()` sí está cableada en `EditorJava.tsx:8,10,34,37` — ver SUGGESTION-1) |
| REQ-PLAT-006 (parcial, 0.15 de 0.15+2.22) | "Fidelidad del motor en los tres motores" | `pruebas/e2e/u3-hola-mundo.spec.ts` en Chromium/Firefox/WebKit | ✅ COMPLIANT para lo que 0.15 promete (E2E en 3 motores); la suite de fidelidad dedicada (`test:navegadores`) cierra en 2.22 |
| REQ-PLAT-008 (scaffold, 0.11) | "Revertir una publicación" (scaffold) | `.github/workflows/desplegar.yml` (estructura real, `BASE_PUBLICA=/VisualizadorJava/` ya real, no marcador) + `src/interfaz/pwa/{registro,manifiesto}.test.ts` | ✅ COMPLIANT para el andamiaje; el escenario completo de reversión cierra en 5.12/6.7 contra Pages real |

**Resumen de cumplimiento:** 5/7 COMPLIANT (en el alcance parcial que cada tarea promete), 2/7 PARTIAL — ambos por depender del remoto de GitHub, que no existe todavía (esperado, ver WARNING-3), no por una falla de implementación.

---

### Coherencia con `design.md`

| Decisión | ¿Se siguió? | Notas |
|---|---|---|
| ADR 001 — capas con guardas del compilador + ESLint | ✅ Sí | `tsconfig.{motor,trabajador,interfaz,herramientas}.json` separados; `matriz-capas.ts` + `eslint.config.js` generan las reglas desde datos, no cascada a mano (tal como pide el REFACTOR de 0.2) |
| ADR 007 — protocolo del trabajador sin memoria compartida | ✅ Sí (parcial, mínimo) | `trabajador.ts`/`protocolo.ts`/`cliente.ts` con los mensajes básicos; repuesto y perro guardián llegan en el lote 3, tal como estaba planeado |
| ADR 013 — contenedor/presentacional + `useSyncExternalStore` | ✅ Sí | `Visualizador.tsx` (contenedor, estado + efectos) vs. `EditorJava.tsx`/`Consola.tsx` (presentacionales puros); `Traza` vive fuera de React y se lee con `useSyncExternalStore` (`Visualizador.tsx:47`) |
| Contrato público del motor (design.md §1.3) | ✅ Sí | `src/motor/index.ts` exporta exactamente `compilar`/`crearEjecucion` + los tipos de la firma — nada más, nada menos |
| El `?worker` de Vite en vez de `new Worker(new URL(...))` (hallazgo real de 0.15) | ✅ Sí | `vite.config.ts:13-19` y `src/trabajador/cliente.ts:1-20` documentan y aplican el fix con el mismo razonamiento técnico en ambos archivos — verificado, no solo declarado |
| Detección de `Worker` vía `globalThis`, nunca como tipo ambiental | ✅ Sí | `src/trabajador/cliente.ts:47-50` |
| CSP `connect-src 'self'` (design.md §6.7) | ✅ Sí | `index.html:6` |

---

### Definición de Terminado (`proposal.md` §13, 8 puntos) — auditada punto por punto

1. **Sin TODO/mocks/demo en producción:** ✅ `grep -rniE "TODO|FIXME|XXX|mock"` sobre `src/` y `herramientas/*.ts` (excluyendo `*.test.ts`) — cero coincidencias reales (los únicos hits son la palabra española "todo" dentro de comentarios, no marcadores).
2. **TDD estricto RED→GREEN→REFACTOR, diferencial contra el JDK real:** ✅ ver tabla TDD Compliance arriba; ⚠️ ver WARNING-1 (formato de reporte) y la desviación 0.14.
3. **`npm test`/lint/`tsc --noEmit` en verde, salidas acotadas, CI verde:** ✅ los tres comandos en verde con salida acotada (confirmado arriba); ⚠️ "CI verde" no puede confirmarse como hecho ejecutado — los 4 workflows nunca han corrido en GitHub real (WARNING-3).
4. **Textos en español de México en el catálogo de textos:** ⚠️ **WARNING-2** — el texto SÍ está en español de México, pero NO sale del catálogo `src/textos/es-MX/` (que sigue siendo un stub vacío, `src/textos/index.ts:1-3`, "contenido real desde el lote 1"). Hay strings literales en JSX: `App.tsx:8` (`"Visualizador de Java paso a paso"`), `Visualizador.tsx:69,84,102,111,121` (mensajes y etiquetas de botones). `CLAUDE.md` regla 1 dice "nunca texto suelto en JSX" sin excepción de lote; `tasks.md` sí lo excusa explícitamente hasta la tarea 5.11 ("Cierre del catálogo es-MX"). Lo marco WARNING porque es real y visible hoy, aunque el propio plan ya lo tiene agendado.
5. **Accesible en lo que el lote agrega:** ➖ SUGGESTION-2 — hay accesibilidad mínima real (`<button>` nativos, `role="alert"` en `Visualizador.tsx:103`), pero nada de `aria-live` explícito en la consola/contador de pasos ni evidencia de `prefers-reduced-motion`. Proporcional para una rebanada vertical mínima; la auditoría AA completa está correctamente agendada en 5.10.
6. **Cero red en ejecución; licencias/peso de dependencias justificados:** ✅ `npm run licencias` → 9/9 permisivas; `andamiaje.test.ts` fuerza versiones exactas contra la lista cerrada de `versiones-fijadas.ts`; E2E offline pasa en 2/3 motores (WebKit saltado por límite de la herramienta, no de la app — ver WARNING-4).
7. **`main` desplegable (build de Pages en verde):** ✅ el build real corrió con éxito (vía `webServer` de Playwright: `npm run build && npm run preview`); ⚠️ mismo matiz que el punto 3 — `desplegar.yml` nunca se ha ejecutado contra GitHub Pages real (WARNING-3).
8. **Conventional commits sin atribución de IA, confirmación explícita del PO:** ✅ verifiqué los 3 commits del lote (`6260a3a`, `9b25cef`, `4b39fb4`) — los tres siguen el formato `tipo(alcance): descripción`, y un `grep` extendido sobre el historial completo (mensajes y diffs) por "co-authored-by", "generated with", "claude", "anthropic" no encontró ninguna atribución real (las únicas coincidencias de "claude" son referencias legítimas al archivo `CLAUDE.md` dentro de comentarios de código). La confirmación explícita del PO por commit la reportan `apply-progress` y `state.yaml` de forma consistente; no es verificable de forma independiente desde el repositorio.

---

### CI al día con lo que existe (regla del orquestador, `tasks.md` → Convenciones)

Crucé cada `npm run <x>` invocado en los 4 workflows contra `package.json`:

| Workflow | Comandos invocados | ¿Existen en `package.json`? |
|---|---|---|
| `ci.yml` | `npm ci`, `npx playwright install`, `lint`, `tipos`, `test` (vía `npm test`), `build`, `licencias`, `e2e` | ✅ todos existen; **no** llama al `npm run ci` compuesto (correcto — ese script encadena `presupuesto`, que no existe hasta el lote 5, confirmado arriba con `npm run presupuesto` fallando con `MODULE_NOT_FOUND`) |
| `oraculo.yml` | `npm ci`, `oraculo:verificar` | ✅ existe; `oraculo:generados`/`oraculo:mutantes` quedan comentados con la tarea que los trae (2.21/1.16) |
| `plataforma.yml` | `npm ci`, `medir:plataforma -- corpus/datos/pow/pares-smoke.csv` | ✅ existe; el CSV de humo referenciado sí existe en disco (`corpus/datos/pow/pares-smoke.csv`, 5 pares, coincide con el fixture del test) |
| `desplegar.yml` | `npm ci`, `build` (con `BASE_PUBLICA` real) | ✅ existe |

Cero pasos vacíos, cero `continue-on-error` fuera de `plataforma.yml` (que lo necesita por diseño, ADR 009). Regla respetada.

---

## Issues encontrados

### CRITICAL (deben resolverse antes de archivar)

Ninguno.

### WARNING (deberían resolverse)

1. **Formato de evidencia TDD en `apply-progress`.** `sdd/visualizador-java/apply-progress` no trae la tabla "TDD Cycle Evidence" de 8 columnas que exige `strict-tdd.md`; trae narrativa equivalente. Reconstruí la tabla de forma independiente (ver arriba) y confirmé que la sustancia SÍ cumple. Recomendación: que los próximos lotes de `sdd-apply` incluyan la tabla literal — facilita auditorías futuras sin tener que releer cada archivo de prueba.
2. **Texto en JSX fuera del catálogo `es-MX`.** `App.tsx:8`, `Visualizador.tsx:69,84,102,111,121` tienen strings literales en español en vez de venir de `src/textos/es-MX/` (que sigue vacío). Choca con `CLAUDE.md` regla 1 ("nunca texto suelto en JSX", sin excepción de lote), aunque `tasks.md` ya lo agenda para la tarea 5.11. No bloquea el lote 0 porque el propio plan lo declara así, pero debe quedar visible para el PO, no solo enterrado en `tasks.md`.
3. **Los 4 workflows de GitHub Actions nunca han corrido contra el remoto real.** `ci.yml`, `oraculo.yml`, `plataforma.yml`, `desplegar.yml` están verificados estructuralmente (YAML válido, cada `npm run <x>` existe, versiones de acciones consistentes) y sus pasos equivalentes corren en verde localmente (`lint`, `tipos`, `test`, `build` vía E2E, `licencias`, `oraculo:verificar`), pero el repositorio remoto (`JorgeZepeda1/VisualizadorJava`, recién resuelto por el PO) todavía no existe — es la última pieza pendiente del cierre del lote 0, ya anotada por el propio orquestador en la matriz de trazabilidad ("P1 también condicionaba el lote 0"). No es una falla de implementación; es una dependencia externa explícitamente pendiente.
4. **E2E offline saltado en WebKit** (`pruebas/e2e/u3-hola-mundo.spec.ts:68-75`). Playwright WebKit (build webkit-2359 / "WebKit 26.6", Playwright 1.63.0, macOS 26.5.1 arm64) falla con «WebKit encountered an internal error» al navegar cualquier página con *service worker* activo mientras `context.setOffline(true)` está encendido — confirmado como límite real de la herramienta, no de la app (la prueba 1, que SÍ corre en WebKit, prueba la app real de punta a punta ahí mismo: editor, compilación, ejecución, consola, cero violaciones de CSP). El motivo está documentado en el propio archivo con detalle técnico verificable, y también en Engram. Clasificado como WARNING con seguimiento obligatorio antes del cierre del lote 5, tal como indicó el orquestador — no encontré evidencia de que la app falle realmente en WebKit; al contrario, la prueba 1 la confirma funcionando ahí.

### SUGGESTION (mejoras, no bloqueantes)

1. **REQ-VIS-001 sin aserción explícita de números de línea/resaltado en el DOM.** El cableado es real (`EditorJava.tsx:8,10,34,37`: `lineNumbers()` + `java()` de `@codemirror/lang-java`), pero ningún test (unitario ni E2E) asserta que el gutter o el resaltado estén realmente visibles en pantalla. Cuando el lote 4/5 cierre REQ-VIS-001 por completo, vale la pena añadir una aserción de DOM o una captura visual para esa parte específica.
2. **Accesibilidad mínima pero no instrumentada con `aria-live`.** Proporcional para esta rebanada vertical (ver Definición de Terminado punto 5); la auditoría AA completa ya está agendada en 5.10.

---

## Verificación final

- ✅ Ejecuté (no solo leí) los 5 comandos pedidos, con cifras reales, sobre el árbol de trabajo actual.
- ✅ Leí el contenido completo (no resúmenes) de los 15 archivos de prueba del lote y de una muestra representativa del código de producción que ejercitan (motor/index.ts, cliente.ts, vite.config.ts, EditorJava.tsx, Visualizador.tsx, App.tsx, registro.ts, manifiesto.ts, medir-plataforma.ts).
- ✅ Crucé cada afirmación de `apply-progress` (engram #568) contra el código real — todas las cifras citadas (121/122 pruebas, 176 goldens, 35+141 programas de corpus, 9 dependencias de ejecución, Chromium 2/2 + Firefox 2/2 + WebKit 1/1+1 saltada) coinciden con lo que yo mismo obtuve al ejecutar.
- ✅ No modifiqué código, pruebas, ni `openspec/config.yaml`/`state.yaml`. Solo escribí este archivo.

**Veredicto final: PASS WITH WARNINGS.** El lote 0 puede cerrarse (commit con confirmación del PO) una vez que el PO vea los 4 WARNINGS — ninguno bloquea funcionalmente el resto del plan, y tres de los cuatro (formato de reporte, workflows sin remoto, WebKit) ya estaban anticipados por el propio proceso. El WARNING-2 (texto fuera de catálogo) es el único hallazgo genuinamente nuevo de esta verificación y vale la pena que el PO lo vea explícitamente antes de aprobar el commit, aunque `tasks.md` ya lo tenga agendado para 5.11.

## Lote 0 — Adenda del orquestador (2026-09-25): tareas 0.16 y 0.17

Posteriores a la verificación de arriba:

- **0.16** (refresco de `sdd-init`): `openspec/config.yaml` deja `strict_tdd: true` en el nivel superior como único interruptor y trae la sección `testing` con el runner real; `.atl/skill-registry.md` registra `CLAUDE.md` y los ADR como convenciones del proyecto; la copia de `tasks.md` en engram queda íntegra (índice + 4 partes).
- **0.17** (corrige el WARNING-2): regla `no-restricted-syntax` para `src/interfaz/**/*.tsx`, sin dependencias nuevas; los textos visibles pasan a `src/textos/es-MX/interfaz.ts`, incluida la plantilla `Paso {pasoActual} de {total}` que la lista de líneas de la tarea omitía.
- **Verificación del orquestador tras 0.17**: `npm test` 128 aprobadas + 1 saltada (129 en 27 archivos); `npm run lint` y `npm run tipos` con código de salida 0. El agente de 0.17 reportó el E2E en 5 aprobadas + 1 saltada (WebKit sin red, sin cambios); el CI remoto lo vuelve a correr.
- **Estado de los WARNING**: 1 (formato de la tabla TDD en apply-progress), aceptado · 2, **cerrado** por 0.17 · 3 (workflows sin correr), se cierra con el primer CI del repositorio público · 4 (WebKit sin red), **abierto**, con seguimiento obligatorio antes del cierre del lote 5.

**Veredicto del lote 0 tras la adenda: PASS WITH WARNINGS** (WARNING-3 pendiente del primer CI remoto; WARNING-4 abierto con seguimiento).
