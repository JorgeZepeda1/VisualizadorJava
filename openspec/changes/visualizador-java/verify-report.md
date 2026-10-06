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

---

## Lote 1

**Modo:** Strict TDD (inyectado por el orquestador como autoritativo). **Alcance:** tareas 1.1–1.17 y 1.19–1.22 (21 tareas de código; 1.18 nunca se convirtió en tarea numerada — en el sub-lote 1-D1 era un marcador provisional de "cierre del lote", y ese rol lo absorbió la convención estándar de cierre del propio `tasks.md`, la misma que Lote 0 usó sin número propio; no es un hueco). **Rama auditada:** `feat/lote-1b-sentencias` (local), 10 commits sobre `main`@`3e83661` (`c47f2dd`…`a6386c0`).

### Veredicto: **PASS**

Las 21 tareas del alcance están implementadas, con las 5 pasadas de compilación (léxico+sintaxis → atribución → alcanzabilidad → asignación definitiva → arranque) conectadas en el orden de javac (ADR 004) y **ambos criterios numéricos del lote cumplidos y verificados por mí de forma independiente, no solo leídos de `apply-progress`**: C7 en 100.00 % de veredicto y 98.84 % de línea sobre 2625 mutantes reales, C8 en el 100 % de 44 muestras de "no disponible". Los 6 comandos pedidos corren en verde sobre el árbol de trabajo actual. Audité las 3 desviaciones de TDD estricto que el orquestador señaló explícitamente más una muestra adicional; ninguna es CRITICAL — las tres están honestamente declaradas (una de ellas, textualmente, en el propio mensaje de commit) y ninguna dejó una aserción trivial o una regresión sin cubrir. No hay CRITICAL. Quedan 3 WARNING, ninguno bloqueante para cerrar el lote.

---

### Resumen de ejecución (cifras reales, ejecutadas por mí en este momento, salidas acotadas)

| Comando | Resultado |
|---|---|
| `npm test` | **943 passed (943)**, 43 archivos, 2.91 s, exit 0 |
| `npm run test:oraculo` | **104 passed \| 1 skipped (105)**, 8 archivos, 11.34 s, exit 0 (Temurin 17.0.18+8 confirmado antes de correr) |
| `npm run lint` | **exit 0**, cero salida |
| `npm run tipos` | **exit 0**, cero salida (4 tsconfig) |
| `npm run oraculo:verificar` | **176 programas, goldens idénticos** a una regeneración real contra Temurin 17.0.18 |
| `npm run e2e -- u3-hola-mundo` (Chromium+Firefox+WebKit, build real vía `webServer`) | **5 passed \| 1 skipped** (6 = 2×3 motores); el saltado es el mismo límite de WebKit-offline que Lote 0 ya documentó (WARNING-4 de esa sección), no un hallazgo nuevo |
| `pruebas/compilacion/mutantes.test.ts` (incluido en `npm test`, cifras propias) | **veredicto 2625/2625 = 100.00 %** (C7 pide 100 %) · **línea 2383/2411 = 98.84 %** (C7 pide ≥95 %) · código (métrica secundaria, sin umbral de C7) 2102/2411 = 87.18 % |

Las cifras de `npm test`, `test:oraculo` y `oraculo:verificar` coinciden EXACTAMENTE con lo que `apply-progress` (engram #568) afirma para el cierre del sub-lote 1-D5 (943/943, 104+1, 176 idénticos) — cruce independiente limpio, igual que en Lote 0.

---

### Completitud

| Métrica | Valor |
|---|---|
| Tareas en alcance | 21 (1.1–1.17, 1.19–1.22) |
| Tareas completas | 21/21 |
| Tareas incompletas | 0 |
| Criterio de salida del lote (`motor/{lexico,sintaxis,semantica,compilador}` + `pruebas/compilacion/**` en verde, C7, C8) | ✅ cumplido, verificado con ejecución real (ver arriba) |

---

### C7 y C8 — los dos criterios numéricos del lote, verificados de forma independiente

- **C7** (`REQ-DIFF-006`, proposal.md §8): "veredicto igual a javac en el 100 % de ≥2000 mutantes; línea del primer error en ≥95 %". `corpus/mutantes/veredictos.jsonl` tiene 2625 casos reales (≥2000 ✅), generados por `herramientas/oraculo/mutantes.ts` + `CompiladorEnLote.java` (`javax.tools`, una sola JVM) con semilla fija `20260925`, 9 tipos de mutación, los 9 presentes en el corpus (verificado por la propia prueba de triangulación del archivo). Leí `pruebas/compilacion/mutantes.test.ts` completo: las 3 aserciones numéricas son **proporciones agregadas calculadas sobre TODO el corpus real** (`discrepancias = veredictos.filter(...)`), nunca casos individuales cableados a mano — cualquier mutante nuevo que discrepe hace bajar el porcentaje y falla la prueba de verdad. Corrí la suite yo mismo: **100.00 % / 98.84 % / 87.18 %**, idéntico a lo reportado. Los umbrales del archivo (`1.0`, `0.95`, `0.87`) están fijados en el mínimo exacto que exige C7 (más el valor real medido para la métrica secundaria de código, sin inflar). **C7: CUMPLIDO.**
- **C8** (`REQ-DIFF-004` parte C8): "100 % de las muestras de §2.2 (una por construcción) → su aviso antes de ejecutar; 0 pasos; 0 errores de sintaxis engañosos". Leí `pruebas/compilacion/catalogo.test.ts` completo: 44 archivos en `corpus/compilacion/avisos/` (cubre las 14 filas de REQ-SUB-007, varias con más de una muestra — p. ej. hex/octal/binario/`\uXXXX` por separado), cada uno afirmando `resultado.ok === false`, `categoria === 'no-disponible'` (nunca `'error-compilacion'`) y `linea ≥ 1`; más 9 archivos en `corpus/compilacion/catalogo/` que SÍ deben rechazarse como error real (control negativo: nunca `'no-disponible'`). Corrí la suite: verde. **C8: CUMPLIDO.**

---

### Requisitos del lote 1 (matriz de trazabilidad de `tasks.md`, verificada)

Crucé la sección "Matriz de trazabilidad" de `tasks.md` (líneas 667–776) contra la implementación real: **REQ-SUB-001 a 007** (excepto REQ-SUB-008, que la propia matriz asigna al lote 2/tarea 2.15 — correctamente fuera de este alcance) y **REQ-COMP-001 a 010** están 100 % mapeados a tareas de este lote, y **REQ-DIFF-004** (solo la parte C8) y **REQ-DIFF-006** (C7 completo) también. Cada uno tiene evidencia de ejecución real:

| Requisito | Evidencia real |
|---|---|
| REQ-SUB-001–007 | `analizador-lexico.test.ts`, `analizador-sintactico.test.ts`, `expresiones.test.ts`, `ambiguedades.test.ts`, `sentencias.test.ts`, `no-soportado.test.ts`, `sobrecargas.test.ts`, `atribucion.test.ts` — todos verdes en `npm test` |
| REQ-COMP-001–010 | `atribucion.test.ts`, `constantes.test.ts`, `problemas.test.ts`, `alcanzabilidad.test.ts`, `asignacion-definitiva.test.ts`, `compilador.test.ts`, `arranque.test.ts` — todos verdes; `compilador.test.ts` prueba explícitamente los dos escenarios verificados de REQ-COMP-006 (atribución oculta asignación definitiva anterior; alcanzabilidad se informa antes que asignación definitiva) |
| REQ-DIFF-004 (C8) | `pruebas/compilacion/catalogo.test.ts` — ver arriba |
| REQ-DIFF-006 (C7) | `pruebas/compilacion/mutantes.test.ts` — ver arriba |

**Metodología de auditoría** (transparencia): leí el contenido completo de los 4 archivos de prueba transversales más críticos para los dos criterios numéricos del lote (`mutantes.test.ts`, `catalogo.test.ts`, `catalogo-semantico.test.ts`, `problemas-en-espanol.test.ts`) y crucé el resto (≈35 archivos de prueba unitarios de `src/motor/{lexico,sintaxis,semantica}/**`) por muestreo dirigido: mensajes de commit reales (que citan líneas de falla RED concretas, p. ej. `expected [] to have a length of 1 but got +0`), narrativa de sesión en Engram, y la ejecución agregada real de `npm test` (943/943), que es evidencia de que TODO el código de producción de estas 21 tareas se ejercita hoy sin fallar. No encontré ninguna discrepancia entre lo narrado y lo ejecutado en ninguno de los puntos muestreados.

---

### Desviaciones de TDD estricto — las 3 que el orquestador pidió auditar, juzgadas

**1. Tareas 1.5 y 1.6 (sub-lote 1-B) — estructura escrita junto con la prueba, verificada después.**
Confirmé la desviación en su fuente más autoritativa posible: el propio mensaje del commit `c47f2dd` la declara en texto plano: *"1.5 y 1.6 se escribieron junto con su estructura y se verificaron después (sus pruebas encontraron 4 errores reales); las tres correcciones y 1.17 siguieron RED→GREEN estricto."* Es decir: el tipo/AST (`ast.ts`) y el análisis sintáctico se escribieron a la vez, no test-primero-implementación-después en el sentido estricto. **Juicio: WARNING, no CRITICAL.** Dos razones: (a) para un parser en TypeScript, los tipos de nodo (`NodoIf`, `NodoWhile`…) casi siempre deben existir para que el archivo de prueba siquiera compile — es una zona gris aceptada de TDD en lenguajes tipados (la "estructura" no es lógica de comportamiento); (b) lo que de verdad importa —que la prueba, al correr, falle por una razón real y no sea un sello de goma— está confirmado de forma verificable: la propia nota dice que las pruebas **encontraron 4 errores reales** al verificarse (coincide con los "Discoveries" de la sesión: ~20 palabras reservadas nunca agregadas a `PALABRAS_CLAVE`, que rompía `break externo;`; `import static` aceptado en silencio). Una verificación que encuentra y corrige bugs reales no es un rubber-stamp.

**2. Tarea 1.12 (sub-lote 1-D1) — alcanzabilidad, "verde a la primera corrida".**
Confirmado en la sesión (engram #632): las 20 pruebas de `alcanzabilidad.test.ts` pasaron en su primera ejecución porque el invariante (JLS 14.22, "alcanzable=false nunca revive") se analizó en papel antes de escribir código, sin el ciclo iterativo de "fake it → generaliza" que `strict-tdd.md` describe por omisión. **Juicio: WARNING, no CRITICAL.** Es la estrategia "Implementación Obvia" de Kent Beck — una de las tres formas legítimas de TDD (junto con Fake It y Triangulación), válida cuando el algoritmo se entiende bien de antemano. El RED sigue siendo real (el módulo no existía antes del test) y el GREEN se confirmó con ejecución real de las 20 aserciones, que cubren ramas genuinamente distintas (no el mismo caso repetido) — el riesgo que la triangulación existe para prevenir (un `fake it` hardcodeado que nunca se generaliza) nunca estuvo presente porque nunca hubo una fase `fake it`. Punto de mejora real: `strict-tdd.md` exige declarar explícitamente `"Triangulación saltada: {razón}"` en la tabla de evidencia cuando se omite el ciclo iterativo, y esta sesión no lo hizo en ese formato exacto (sí lo explicó en prosa) — anotado como parte del WARNING-1 de formato (ver abajo), no como hallazgo aparte.

**3. Regla 9 de 1-D4 — "{" de la clase, RED reconstruido revirtiendo el arreglo.**
Ubiqué la regla exacta en engram #654 ("Regla 8/9 NUEVAS… descubiertas al remedir mutantes tras 1-7"). Es distinta de las otras dos: aquí el "test" que estaba en RED no es una prueba nueva escrita a mano, sino **la propia suite `mutantes.test.ts`**, que compara contra datos reales de javac de forma agregada — cualquier mutante nuevo que discrepe automáticamente baja el porcentaje calculado y hace fallar la aserción de verdad, sin que nadie tenga que escribir una aserción nueva. Revertir el arreglo para reconstruir el RED es, en este contexto específico, una técnica de validación causal (confirmar que ESE cambio es lo que mueve el porcentaje) ejecutada de verdad, no narrada — apoyada en datos externos reales (`veredictos.jsonl`, generados por `javac`, no por el propio proyecto). **Juicio: cumple el espíritu de RED→GREEN real; no es una desviación que deba preocupar.** Es distinto (y más fuerte, no más débil) que escribir código primero y luego inventar una prueba que coincida con lo que el código ya hace — aquí la prueba y los datos de referencia ya existían, independientes e inmutables durante la sesión.

**Muestreo adicional (más allá de las 3 señaladas):** las tareas 1.19, 1.20, 1.21 y 1.22 narran, cada una, la línea exacta del mensaje de falla real antes de la corrección (p. ej. 1.22: `` `atribuirCuerpo('int x; x = "hola";')` esperaba 1 problema... daba `[]` ``); no encontré ninguna otra desviación no declarada en la muestra revisada.

---

### Auditoría de calidad de aserciones

Leí completos `mutantes.test.ts`, `catalogo.test.ts`, `catalogo-semantico.test.ts` y `problemas-en-espanol.test.ts` buscando los patrones prohibidos de `strict-tdd.md`. **Assertion quality: ✅ ninguna aserción trivial encontrada.** No hay tautologías, ni loops fantasma (los `it.each` de `catalogo.test.ts`/`catalogo-semantico.test.ts` iteran sobre listados de archivos reales en disco, nunca vacíos por construcción — la propia suite afirma `length ≥ 37`/`≥ 9`/`≥ 26` antes de iterar), ni smoke-tests sin aserción de contenido. Las aserciones de `problemas-en-espanol.test.ts` (`texto.length > 0` + `not.toMatch(/undefined|\[object Object\]/)`) son deliberadamente de "no vacío / sin fugas de plantilla" porque **eso es exactamente lo que ADR 015 exige verificar** (completitud del catálogo, no la redacción exacta) — no son un caso de "type-only assertion" trivial, es la aserción correcta para lo que se está probando. `mutantes.test.ts` usa proporciones agregadas sobre datos reales, nunca un mock. Cero mocks de negocio encontrados en la muestra.

---

### Coherencia con `design.md` y los ADR

| Decisión | ¿Se siguió? | Notas |
|---|---|---|
| ADR 003 — parser propio que reconoce lo no soportado, nunca reinterpreta | ✅ Sí | `sintaxis/no-soportado.ts` crea `NoSoportado{codigo,rango}` y deja seguir el análisis (verificado en `no-soportado.test.ts` y en el corpus de 44 avisos) |
| ADR 004 — 5 pasadas en el orden de javac, se informa la primera que falla | ✅ Sí | `compilador.ts` orquesta las pasadas como lista de datos (REFACTOR de 1.14); `compilador.test.ts` prueba los 2 escenarios verificados en diseño (atribución oculta asignación definitiva; alcanzabilidad antes que asignación definitiva) |
| ADR 010 — datos del JDK generados por el oráculo, nunca a mano | ✅ Sí | 682 firmas vía reflexión (`GenerarFirmasApi.java`, tarea 1.9) → `*.generado.ts` con cabecera "no editar"; `oraculo.yml` exige regeneración byte a byte |
| ADR 015 — textos en catálogo tipado es-MX, motor solo emite códigos | ✅ Sí | los 17+ `CodigoProblema` nuevos de este lote solo llevan código y datos; los textos viven en `src/textos/es-MX/problemas.ts`, cruzados por `problemas-en-espanol.test.ts` |
| Guarda de capa (ADR 001): `motor` sin DOM/Node, 0 deps npm | ✅ Sí | verificado por mí con grep dirigido (`document.`, `window.`, `require(`, imports de `node:`/`react`/`vite`/`@codemirror` dentro de `src/motor`) — cero coincidencias; reforzado por `npm run tipos`/`npm run lint` en verde sobre las 4 capas |

---

### Definición de Terminado (`proposal.md` §13) — auditada punto por punto

1. **Sin TODO/mocks/demo en producción:** ✅ grep dirigido a marcadores reales (`// TODO`, `/* FIXME`, `@todo`, etc., no la palabra española "todo") sobre `src/{motor,textos,presentacion,trabajador,interfaz}` y `herramientas/` — cero coincidencias reales.
2. **TDD estricto RED→GREEN→REFACTOR, diferencial contra JDK real:** ✅ ver auditoría de desviaciones arriba; las 3 señaladas son WARNING, no CRITICAL, y la evidencia agregada (943/943 pruebas reales, C7/C8 verificados por mí) respalda que el resultado final es sólido incluso donde el proceso se apartó del ideal.
3. **`npm test`/lint/tipos en verde, salidas acotadas, CI verde:** ✅ los 4 comandos base en verde (ver Resumen de ejecución); "CI verde" sigue sin poder confirmarse como corrida real en GitHub — mismo WARNING heredado de Lote 0 (el remoto existe desde el PR #1, pero no audité esta sesión si los 4 workflows ya corrieron limpio sobre estos 10 commits — ver WARNING nuevo abajo).
4. **Textos en español de México en el catálogo:** ✅ el lote 1 es casi enteramente `src/motor` (sin texto de interfaz); los textos nuevos (17+ códigos de error) van a `src/textos/es-MX/problemas.ts`, cruzados por prueba real.
5. **Accesible en lo que el lote agrega:** ➖ no aplica — el lote 1 no toca `src/interfaz`.
6. **Cero red; licencias/peso justificados:** ✅ ninguna dependencia nueva; el catálogo del JDK (1.9) es TypeScript generado, no una librería.
7. **`main` desplegable:** ✅ el build real de `npm run e2e` corrió sin error (`vite build && vite preview`).
8. **Conventional commits sin atribución de IA, confirmación del PO:** ✅ verifiqué los 10 mensajes de commit completos (cuerpo incluido) de `c47f2dd` a `a6386c0`: todos siguen `tipo(alcance): descripción`; un `grep` sobre el historial completo por "co-authored", "generated with", "claude", "anthropic" no encontró nada. La confirmación explícita del PO por commit no es verificable desde el repositorio (mismo matiz que Lote 0) — la reportan `apply-progress`/`state.yaml`.

---

### CI al día con lo que existe

Crucé cada `npm run <x>` de los 4 workflows contra `package.json`: **sin gaps**. En particular, las dos suites nuevas de este lote ya están conectadas: `oraculo.yml` corre `npm run oraculo:datos` (tarea 1.9, con `::error::` si el catálogo generado no coincide con una regeneración real) y `npm run oraculo:mutantes` (tarea 1.16, nocturno, mismo patrón de error si `veredictos.jsonl` no coincide). `ci.yml` sigue corriendo `npm test` (que incluye `mutantes.test.ts` y `catalogo.test.ts`, ninguno requiere JDK en CI porque leen datos pre-generados) sin tocar el JDK, consistente con ADR 011 punto 4. Cero pasos vacíos, cero `continue-on-error` fuera de `plataforma.yml`.

---

### Fidelidad sin inventar — casos revisados fuera de los mutantes

Verifiqué de forma independiente (no solo leí) el hallazgo del sub-lote 1-D5 sobre `corpus/compilacion/avisos/06-escape-unicode-en-codigo.java`: lo compilé contra el JDK 17 real (`javac 17.0.18`) y **confirmo que javac lo rechaza** con `Aviso.java:5: error: ';' expected` — el `A` en su propia línea, sin `;`, traduce a la letra suelta `A` como sentencia sin terminar. **Clasificación:** el error SÍ es consecuencia directa de la construcción que el fixture pretende ilustrar (la traducción temprana de `\uXXXX` por JLS 3.3, que el proyecto nunca implementa a propósito, D2) — no es un fixture ajeno y roto sin relación; es que, si se tradujera de verdad, la línea 5 también fallaría por una razón estructural aparte. El comportamiento actual del visualizador (mostrar siempre "No disponible" para cualquier `\uXXXX`, nunca fingir que tradujo) sigue siendo el correcto y no viola D2 ni C8 en la práctica — pero la premisa implícita del fixture ("esto es Java válido que javac aceptaría") es **imprecisa** para este archivo puntual. **WARNING de documentación de fixture**, no de comportamiento del compilador (ver lista de issues). Contrastado con `07-escape-unicode-en-comentario.java` (mismo escape, dentro de un comentario): compila limpio en javac real, confirmando que la distinción que hace el proyecto (comentario vs. código) es correcta donde importa.

No encontré, en el muestreo de `corpus/experimentos/texto/` (117 archivos; 29 referenciados directamente por `catalogo-semantico.test.ts`, el resto sirvió de oráculo puntual durante el desarrollo según la narrativa de sesión) ni en el resto de la revisión, ningún caso donde el compilador acepte algo que javac rechaza o viceversa fuera de los ya documentados.

---

### Pendientes conocidos que NO son defecto de este lote (carryover explícito al lote 2)

Confirmados como fuera de alcance por diseño, no omisiones:
- `generar-ir.ts` solo baja a IR la sentencia `println` de un literal (el resto lanza `"llega en el lote 2"`, capturado y filtrado explícitamente por `mutantes.test.ts`'s `esGapDeIrTodaviaNoImplementado` para no contaminar la medición de C7).
- Concatenación de `String` con `double` en expresiones constantes da `null` (nunca constante) hasta la tarea 2.4 (stub retirado, comportamiento honesto — nunca inventa un valor).
- Mensajes del lanzador en inglés en JVM fría: defendido incondicionalmente desde 1.20 (el oráculo nunca guarda un dato mal traducido), causa raíz no confirmada — documentado, no bloqueante.

---

## Issues encontrados (Lote 1)

### CRITICAL (deben resolverse antes de archivar)

Ninguno.

### WARNING (deberían resolverse)

1. **Formato de evidencia TDD y de "triangulación saltada" en `apply-progress`.** Igual que en Lote 0 (WARNING-1 heredado, mismo patrón): la tabla de 8 columnas de `strict-tdd.md` no aparece literal; la sustancia se reconstruyó aquí cruzando commits, engram y ejecución real. Además, la tarea 1.12 saltó el ciclo iterativo de triangulación sin la declaración explícita `"Triangulación saltada: {razón}"` que pide el formato (sí lo explicó en prosa). Recomendación: adoptar la tabla literal desde el lote 2, y declarar explícitamente cualquier salto de triangulación en ese formato.
2. **Fixture `corpus/compilacion/avisos/06-escape-unicode-en-codigo.java` no compila con javac real** (falta un `;` en la línea 5, verificado por mí con `javac 17.0.18` directo) — la premisa del fixture ("Java válido que el visualizador no soporta") es imprecisa para este caso puntual, aunque el comportamiento observable del visualizador (mostrar "No disponible") sigue siendo correcto y no fabrica nada. Recomendación de bajo riesgo: agregar el `;` faltante para alinear el fixture con su propia premisa, o documentar la excepción en la cabecera del corpus.
3. **CI remoto no auditado esta sesión sobre estos 10 commits específicos.** Confirmé estructura y equivalentes locales en verde (igual que Lote 0), pero no verifiqué si `ci.yml`/`oraculo.yml` ya corrieron limpio en GitHub sobre `feat/lote-1b-sentencias` — la rama es local y no está en push según los datos fijos de esta verificación. No bloquea el lote (el mismo patrón ya quedó aceptado en Lote 0 mientras el remoto se ponía al día); queda para que el PO lo confirme al fusionar.

### SUGGESTION (mejoras, no bloqueantes)

1. **Numeración de tareas:** `1.18` nunca se volvió tarea numerada (ver nota de alcance arriba) — vale la pena una línea explícita en `tasks.md` (p. ej. "1.18 retirada: su rol de cierre lo absorbe la convención estándar") para que un auditor futuro no lo lea como un hueco.
2. **Fechas de cierre de 1.16/1.22 en `tasks.md`** dicen "2026-09-29", un día después de la fecha real de los commits (`2026-09-28`, confirmado por `git log`) y de la fecha de hoy. Sin impacto funcional; corregible en el próximo commit que toque `tasks.md`.
3. **`corpus/experimentos/texto/` (117 archivos) solo ~29 están wireados a una prueba automatizada data-driven** (`catalogo-semantico.test.ts`); el resto sirvió como oráculo puntual durante el desarrollo (verificado y luego trasladado a casos inline en otros `*.test.ts`). Ampliar el barrido data-driven a todo el directorio daría una red de seguridad más amplia contra regresiones futuras, sin ser necesario para cerrar este lote.

---

## Verificación final (Lote 1)

- ✅ Ejecuté (no solo leí) los 6 comandos pedidos, con cifras reales, sobre el árbol de trabajo actual — incluida la comparación completa de 2625 mutantes y las 176 verificaciones del oráculo.
- ✅ Leí el contenido completo de los 4 archivos de prueba transversales más críticos del lote (`mutantes.test.ts`, `catalogo.test.ts`, `catalogo-semantico.test.ts`, `problemas-en-espanol.test.ts`) y crucé el resto por muestreo dirigido (commits completos, engram, ejecución agregada).
- ✅ Verifiqué de forma independiente, contra el JDK 17 real instalado (`/Library/Java/JavaVirtualMachines/temurin-17.jdk`, confirmado `17.0.18+8`), el hallazgo del fixture 06 y las cifras de `apply-progress` — todas coincidieron.
- ✅ Audité las 3 desviaciones de TDD estricto que el orquestador señaló, con evidencia directa para cada una (una de ellas ubicada en el propio mensaje de commit).
- ✅ No modifiqué código, pruebas, `openspec/config.yaml`, `tasks.md` ni `state.yaml`. Solo escribí esta sección.

**Veredicto final del Lote 1: PASS.** El lote puede cerrarse (commit de cierre con confirmación del PO → actualizar `state.yaml`) sin bloqueantes. Los 3 WARNING son reales pero de bajo riesgo: uno es de formato de reporte (heredado del mismo patrón ya aceptado en Lote 0), uno es una imprecisión de un fixture de corpus sin efecto en el comportamiento observable, y uno es la verificación pendiente del CI remoto sobre estos commits específicos — ninguno cuestiona la fidelidad del compilador contra javac 17 real, que es el criterio central del lote y quedó verificado con ejecución real e independiente en C7 (100 %/98.84 %) y C8 (100 %).

---

## Re-verificación del lote 1 (1.1–1.30)

**Fecha:** 2026-09-29. **Modo:** Strict TDD (inyectado por el orquestador; autoritativo). **Alcance:** tareas 1.1–1.30 (29 tareas numeradas; la 1.18 nunca existió). **Rama:** `feat/lote-1b-sentencias` @ `1c8cf5b`, PR #2 abierto, 18 commits sobre `main` (293 archivos, +25 284/−275). Desde la verificación anterior (`c466f73`): 218 archivos, +10 081/−1 844, 770 pruebas nuevas (943 → 1 713). El árbol de trabajo estuvo limpio en cada control (`git status` vacío) hasta que agregué esta sección, que es lo único que modifiqué. Todo lo que ensucia (copias, sabotajes, scripts) vivió en el scratchpad.

### Veredicto: **FAIL** (1 CRITICAL, hallado con evidencia independiente; todos los criterios medibles del lote están en verde)

Cada compuerta que el plan define pasa con números reales: `npm test` 1 713/1 713, `test:oraculo` 189 + 1 omitida, lint y tipos con salida 0, E2E 17 + 1 omitida, mutantes 100,00 % / 98,84 % / 88,47 %, CI remoto verde sobre `1c8cf5b`. La evidencia TDD de las tareas 1.23–1.30 la reproduje yo contra el código de producción anterior (incluidos los 307 fallos de la 1.29, exactos).

Lo que cambia el veredicto no lo mide ninguna de esas compuertas. Escribí 330 programas propios (fuera del corpus del equipo) y los comparé uno por uno con `javac` 17.0.18 real: **`compilar()` deja pasar como válidos 32 de 193 programas que javac rechaza** (16,6 %), y al alumno le dice «Java sí acepta tu programa…», que es falso. Cero de esos casos aparecen en el corpus, en los mutantes ni en mis 80 errores típicos de sintaxis y tipos; viven en seis reglas de atribución que nadie modeló (cast, miembro de un primitivo, `final` con `++`, tipos de `case`, `void` como valor, método de instancia sin objeto). Eso incumple REQ-COMP-006 («ni más permisivo»), las reglas 4 y 5 de CLAUDE.md y la premisa con que el PO aprobó la excepción de la 1.30. Es el reflejo exacto de lo que el PO consideró bloqueante en la 1.29 y la 1.30. Si el PO decide renunciar por escrito, el resto del lote está listo para fusionarse (ver «Opciones» al final).

---

### Resumen de ejecución (cifras reales, ejecutadas por mí)

| Comando | Resultado |
|---|---|
| `npm test` | **1 713 pasan (1 713)**, 55 archivos, 4,33 s, salida 0 |
| `npm run test:oraculo` (Temurin 17.0.18+8 confirmado con `java -version`) | **189 pasan + 1 omitida (190)**, 9 archivos, 55,8 s, salida 0. La omitida es la medición de `Math.pow` en contenedor (necesita Docker) |
| `npm run lint` / `npm run tipos` (4 `tsc`) | salida 0 / salida 0, sin mensajes |
| `npm run e2e` (construye por su cuenta; Chromium, Firefox, WebKit) | **17 pasan + 1 omitida** (18 = 6 de `u3-hola-mundo` + 12 de `problemas-en-pantalla`), 12,3 s. La omitida es «sin red» en WebKit (límite de Playwright, ya conocido desde el lote 0) |
| `npm run oraculo:verificar` | **196 programas, goldens idénticos** a una regeneración real (151 compilan + 45 no) |
| `oraculo:datos` (en copia, sin tocar el repo) | 755 firmas, 25 tipos con supertipos, 4 477 clases en 226 paquetes: **byte a byte idéntico** al repo |
| `oraculo:mutantes` (en copia) | 2 625 mutantes regenerados con javac (214 compilan, 2 411 no): `veredictos.jsonl` **idéntico** al versionado |
| Mutantes dentro de `npm test` | veredicto **2 625/2 625 = 100,00 %** (C7 pide 100 %), línea **2 383/2 411 = 98,84 %** (pide ≥ 95 %), código **2 133/2 411 = 88,47 %** (umbral propio 0,87) |
| CI remoto sobre `1c8cf5b` (`gh pr checks 2`, `gh run list`) | CI éxito (2 min 39 s); Oráculo éxito en `pull_request` (2 min 42 s) y en `push` (3 min 42 s); PR `MERGEABLE`, estado `CLEAN` |
| Cobertura (informativa, `--coverage` v8 a un directorio del scratchpad) | global: sentencias 94,91 %, ramas 92,08 %, funciones 96,25 %, líneas 96,46 %. Los 35 archivos de producción cambiados promedian **98,28 %** de líneas |
| Peso (`dist/` del E2E, `gzip -9`) | `index-*.js` 240 965 B + `trabajador-*.js` 55 622 B = **296 587 B**; total de la publicación 303 241 B ≈ 296 KiB frente a 500 KB. Antes ≈ 228 KB |

Las cifras de `npm test`, `test:oraculo`, `oraculo:verificar`, E2E y mutantes coinciden exactamente con lo que `apply-progress` (engram #568) y el cuerpo del PR afirman.

Distribución por capa de `npm test` (1 713): unitarias 1 434 en 34 archivos; integración jsdom (Testing Library) 34 en 7; transversales de punta a punta sin DOM (`pruebas/compilacion`, `pruebas/diferencial`) 226 en 10; arquitectura 19 en 4. Aparte: oráculo con JDK real 190 en 9 archivos y E2E Playwright 18. Todas las capas usadas (Vitest, Testing Library con jsdom, Playwright) figuran en `openspec/config.yaml` → `testing`.

---

### Criterio de salida del lote 1, C7 y C8

Criterio de salida de `tasks.md` («`motor/{lexico,sintaxis,semantica,compilador}` + `pruebas/compilacion/**` verdes; C7 y C8 cumplidos»): **CUMPLE** con los números de arriba.

- **C7, primera parte** (37/37 casos del catálogo `03`: 36 rechazados con el primer error de la primera pasada que falla + `main` sin `static` al arrancar): **CUMPLE**. 26 casos + `err19` en `catalogo-semantico.test.ts` (27), 9 de sintaxis en `catalogo.test.ts` (corpus `catalogo/`), y `arranque.test.ts` para `main` sin `static` (37), más 4 controles positivos.
- **C7, segunda parte** (≥ 2 000 mutantes, veredicto 100 %, línea ≥ 95 %): **CUMPLE** (100,00 % / 98,84 %), y regeneré los 2 625 veredictos con javac real: idénticos al archivo versionado. Matiz importante: el criterio mide mutantes de **un token sobre 35 programas del curso**, por construcción no alcanza las reglas semánticas del CRITICAL-1.
- **C8** (una muestra por construcción → su aviso, 0 pasos, 0 errores de sintaxis engañosos): **CUMPLE en lo medido** (59/59 muestras de `corpus/compilacion/avisos/` dan `no-disponible`, y el JDK real confirma que las 59 son Java válido: `corpus-avisos.test.ts`, 60 pruebas). Brecha de cobertura anotada como WARNING-6.

---

### Requisitos del lote 1: al menos un escenario con prueba que pasa (evidencia `archivo:línea`)

| Requisito / escenario | Prueba que lo respalda | Resultado |
|---|---|---|
| REQ-SUB-001 «clase con nombre propio» | `pruebas/diferencial/u3-hola-mundo.test.ts` (clase `HolaMundo`, un paso, `Hola\n`); `compilador.test.ts:604` | CUMPLE |
| REQ-SUB-001 «`package` se ignora» | `analizador-sintactico.test.ts:77`; `compilador.test.ts:373` | CUMPLE |
| REQ-SUB-002 «long sin `L`» | `ambiguedades.test.ts:112` | CUMPLE |
| REQ-SUB-003 «`cx += 1.7`» | `atribucion.test.ts:714` (no se rechaza). Que `cx` quede en 6 exige ejecutar | PARCIAL por diseño (ejecución = lote 2) |
| REQ-SUB-004 «redeclarar en bloque anidado» | `atribucion.test.ts:71`; `problemas.test.ts` (`flow18`) | CUMPLE |
| REQ-SUB-005 «`Character.isDigit('5')`» | `catalogo-api.test.ts:30` (soportado) y `Test06Char.java` en `programas-validos.test.ts` (no da error) | CUMPLE (indirecta) |
| REQ-SUB-006 «arreglo fuera de alcance» | `textos/es-MX/no-soportado.test.ts:109` (texto exacto del escenario); `Visualizador.test.tsx`; E2E `problemas-en-pantalla.spec.ts` | CUMPLE |
| REQ-SUB-006 «octal 010» | `analizador-lexico.test.ts:271`; `no-soportado.test.ts:120` (textos) | CUMPLE |
| REQ-SUB-006 cláusula «y N más» | motor: `adicionales` = 2 con 3 arreglos (mi sonda); ninguna prueba con N > 0; la interfaz no lo muestra | PARCIAL (WARNING-5) |
| REQ-SUB-007 «método propio» | `sintaxis/no-soportado.test.ts:97`; corpus `23-miembro-de-clase` en `catalogo.test.ts` | CUMPLE |
| REQ-COMP-001 «`Math.round` a `int`» / «condición no booleana» | `atribucion.test.ts:339` / `:370` | CUMPLE |
| REQ-COMP-002 «variable de `for` tras cerrarlo» | `atribucion.test.ts:44`; `alcance.test.ts:60` | CUMPLE |
| REQ-COMP-003 «sombreado en `if`» | `atribucion.test.ts:71` | CUMPLE |
| REQ-COMP-004 «`while` variable» / «`while(true)` con `break`» | `asignacion-definitiva.test.ts:123` / `:163` | CUMPLE |
| REQ-COMP-005 «falta `;`» | `problemas.test.ts` (`err01`); `trabajador.test.ts:126`; E2E `problemas-en-pantalla.spec.ts:60` | CUMPLE |
| REQ-COMP-006 «`{` faltante» / «atribución oculta DA» / «alcanzabilidad antes de DA» | `compilador.test.ts:333` y `:353` / `:519` / `:538` | CUMPLE |
| REQ-COMP-007 «`public void main`» | `compilador.test.ts:572`; `arranque.test.ts:38` | CUMPLE |
| REQ-COMP-008 «sin `main`» | `arranque.test.ts:50` (y su par `sin-main`) | CUMPLE |
| REQ-COMP-009 «clase pública con cualquier nombre» | `compilador.test.ts:604` | CUMPLE |
| REQ-COMP-010 «tras `return`» / «`while (1 < 2)`» | `alcanzabilidad.test.ts:41` / `:87` | CUMPLE |
| REQ-DIFF-004 (parte C8) | `pruebas/compilacion/catalogo.test.ts` (59 + 9 muestras) | CUMPLE |
| REQ-DIFF-006 | `pruebas/compilacion/mutantes.test.ts` | CUMPLE |
| REQ-VIS-002 (solo texto y línea, 1.28) | `Visualizador.test.tsx`; `problemas-en-pantalla.test.ts` (2 830 fuentes reales); E2E ×3 motores. Ícono, título y subrayado son de la 4.5 | PARCIAL por diseño |

**Requisitos sin respaldo: ninguno.** Los dos PARCIAL por diseño y la cláusula «y N más» quedan listados arriba.

---

### TDD estricto: reconstrucción de la tabla de evidencia (tareas 1.23–1.30) y juicio

Ni `apply-progress` ni `tasks.md` traen la tabla de 8 columnas de `strict-tdd.md`; traen narrativa por tarea con la línea literal de cada fallo, más detallada que una tabla. La tabla la reconstruí yo, y **el RED lo reproduje contra el código de producción anterior** (árbol temporal con la producción del commit padre y las pruebas y el corpus del commit de la tarea; `gitattributes.test.ts` falla siempre en esos árboles porque no tienen `.git`, así que lo descarto):

| Tarea | Pruebas (capa) | Safety net | RED reproducido contra la producción previa | GREEN hoy | Triangulación | Refactor |
|---|---|---|---|---|---|---|
| 1.23 | `expresiones.test.ts` +6 (unitaria), `catalogo.test.ts` | 943/943 | 7 fallos (6 × «se esperaba una expresión y se encontró "switch"» + la excepción retirada de `37-yield`) | 949 | 6 formas de `switch` como expresión | no |
| 1.24 y 1.25 (un commit) | catálogo nuevo, `avisos-textos`, `compilador`, `atribucion`, `literales`, `expresiones` (unitaria + transversal) | 949 | 11 fallos + 2 archivos que no cargan (módulos inexistentes) | 1 054 | +105 casos; cada código con su dato | sí (tabla única de códigos) |
| 1.26 y 1.27 (un commit) | `ejecucion-no-disponible` nuevo, `avisos-textos`, `compilador`, `atribucion`, `catalogo-semantico`, `mutantes` | 1 054 | 30 fallos | 1 065 | método, campo y constructor por separado; caso de control | sí (retiró código muerto de `mutantes`) |
| 1.28 | 8 archivos; capas unitaria, integración jsdom y E2E ×3 | 1 065 | 13 fallos + 4 archivos que no cargan; coincide con `tasks.md` (6 + 2 + 2 + 3) | 1 133 y E2E 12/12 | error, aviso, arranque, error interno, contraste | sí (forma exacta de las 5 claves) |
| 1.29 | 16 archivos + guarda nueva `programas-validos` | 1 133 | **307 fallos en 16 archivos + 1 que no carga: EXACTO al PR y a `tasks.md`**; la guarda con RED literal (14 falsos rechazos) | 1 580 | tablas de 37 y 18 casos con veredicto de javac | sí (`visitarCondicion`) |
| 1.30 | 7 archivos + guarda nueva `programas-invalidos` | 1 580 | **129 fallos** (108 + 6 + 3 + 5 + 5 + 1 + 1), coincide con `tasks.md`; 2 aserciones con RED «tardío», declaradas | 1 713 | los 52 códigos, 3 tipos primitivos | sí |

Guardas no vacías: invertí el filtro de `programas-validos` y `programas-invalidos` en una copia y fallan como dice el registro (`expected 45 to be ≥ 151`, 107 falsos aceptos, 102 textos con «Java sí acepta», 38 rechazos).

**Juicio sobre la 1.29** (RED literal de 8 ciclos perdido por una compactación de contexto, compensado con 307 fallos contra el código previo). **Basta para dar por buenas las pruebas; no basta para demostrar el orden test-antes-que-código de esos 8 ciclos**, y nada posterior lo recuperará. Lo que la compensación sí prueba, y yo reproduje: las pruebas son sensibles (307 fallan sin el cambio), no vacías, y pasan con él. Lo respaldan la guarda de corpus con RED literal, los veredictos reales de javac en que descansan los casos y los tres instrumentos externos. Lo que no cubre: que alguna prueba interna se haya escrito para coincidir con un código ya hecho. **Juicio: WARNING, no CRITICAL**, porque la desviación está declarada, su causa es un accidente de proceso y no una decisión, el control compensatorio es fuerte y reproducible, y el riesgo residual es bajo. Recomendación: en tandas de muchos ciclos, dejar el RED en un commit WIP de solo pruebas para que sobreviva a una compactación.

Compliance TDD: evidencia reportada, parcial (sin tabla de 8 columnas, WARNING-4); todas las tareas tienen pruebas, 29/29 (1.9 y 1.20 en el proyecto `oraculo`); RED confirmado (1.23–1.30 reproducido; 1.1–1.22 ya verificado en `c466f73` y sus pruebas siguen en verde); GREEN confirmado (1 713 + 189 + 17); triangulación adecuada (≥ 2 casos por comportamiento en todas); safety net registrado en cada línea «Verif» excepto el RED perdido de la 1.29.

### Calidad de aserciones (33 archivos de prueba cambiados)

Sin tautologías, sin lazos fantasma (los `it.each` se apoyan en pisos: `≥ 151`, `≥ 45`, `≥ 37`), sin aserciones de clases CSS ni de conteo de llamadas, un solo doble (el transporte `crearClienteTrabajador` en `Visualizador.test.tsx`, 5 dobles frente a 27 aserciones, justificado en su cabecera). Aserciones débiles, todas SUGGESTION: `catalogo.test.ts:52` (`adicionales ≥ 0`, no puede fallar), `sobrecargas.test.ts:95` (`not.toBeNull()` repite la entrada de la prueba anterior sin valor), y los controles `not.toBeNull()` de `main` en `analizador-sintactico.test.ts` (acompañados de sus pruebas negativas). **Calidad: 0 CRITICAL, 0 WARNING, 2 SUGGESTION.**

---

### Prueba diferencial independiente contra javac 17.0.18 real (origen del CRITICAL-1)

Método: 5 lotes de programas escritos por mí, cada uno compilado con `javac -encoding UTF-8 -Xlint:none` (mismo criterio del oráculo) y comparado con `compilar()`. Regla D2: si javac compila, el visualizador no puede dar `error-compilacion`; si javac rechaza, no puede dar `ok` ni `ejecucion-no-disponible` (su texto dice «Java sí acepta tu programa»).

| Lote | Contenido | Programas | javac compila / rechaza | Falsos aceptos | Falsos rechazos | Misma línea si ambos rechazan |
|---|---|---|---|---|---|---|
| 1 | errores típicos de alumno (sintaxis, tipos, símbolos, flujo) y válidos típicos | 120 | 60 / 60 | **0** | **0** | 59/59 |
| 2 | semántica adversarial | 80 | 20 / 60 | 11 | 1 | 46/46 |
| 3 | semántica plausible de alumno | 60 | 23 / 37 | 15 | 2 | 21/21 |
| 4 | `final`, casts | 20 | 4 / 16 | 6 | 0 | 10/10 |
| 5 | sintaxis válida rara y errores de sintaxis | 50 | 30 / 20 | 0 | 0 | 19/19 |
| **Total** | | **330** | **137 / 193** | **32** | **3** | **155/155 (100 %)** |

Lo que va bien y conviene decirlo: en los 155 casos donde ambos rechazan la línea coincide siempre; los errores de sintaxis y de tipos básicos (lotes 1 y 5, 140 programas) salen perfectos. El hueco está en reglas de segundo nivel.

**Los 32 falsos aceptos, por familia** (instrucción mínima dentro de `main`; mensaje de javac; lo que ve el alumno: «Java sí acepta tu programa, pero este visualizador todavía no sabe ejecutar lo que escribiste en la línea N»):

| Familia (regla de javac que falta) | Ejemplos | javac dice | Casos |
|---|---|---|---|
| F1 validez del cast (JLS 5.5) | `int n = (int) "123";` · `double d = (double) true;` · `String s = (String) 5;` · `char c = (char) "a";` · `Integer k = (Integer) "5";` | `incompatible types: String cannot be converted to int` | 9 |
| F2 miembro de un primitivo | `int n = 12345; int d = n.length();` · `a.equals(5)` · `a.charAt(0)` sobre `int` · `x.length()` sobre `double` · `int Math = 3; Math.abs(2);` | `int cannot be dereferenced` | 6 |
| F3 `final` con `++`/`--` | `final int x = 5; x++;` · `x--;` · `++x;` (`x = 2` y `x += 1` sí se detectan) | `cannot assign a value to final variable x` | 3 |
| F4 `switch` | `case "x":` con selector `int` · `case 1:` con `String` · `case "a":` con `char` · `case 70000:` con `char` · dos `default:` | `incompatible types…` / `duplicate default label` | 7 |
| F5 `void` como valor | `System.out.println(System.out.println());` · `int x = System.out.println("a");` · `String s = System.out.print("a");` | `'void' type not allowed here` / `void cannot be converted to int` | 4 |
| F6 método de instancia sin objeto | `int n = String.length();` · `int n = Scanner.nextInt();` | `non-static method length() cannot be referenced from a static context` | 3 |

Varios son errores que un alumno de bachillerato sí comete (`(int) texto`, `numero.length()`, `case` de otro tipo). **El residual «`String.length()` desde un contexto estático» que la 1.29 declaró «sale como aviso, nunca como resultado inventado» cae exactamente en F6 y recibe la frase falsa**: los residuales declarados de la 1.29 y la excepción de la 1.30 se contradicen. Los textos de arranque («Java compiló tu clase "X" sin problema…») heredan la misma premisa.

**Falsos rechazos** (3 programas, 2 familias; javac compila): `int var = 5;` y `int yield = 5;` (identificadores contextuales de Java 17) salen como «se esperaba un token de tipo "identificador" y se encontró "var"». Además, de los residuales declarados por la 1.29: `sealed`/`permits` y `0x1p3` siguen siendo error (verificado: javac los compila), y `0x1p3` se explica con un texto falso («Te falta un punto y coma»).

**Diagnósticos con texto equivocado** (veredicto y línea correctos, pero el mensaje describe otra cosa; ocurre en errores muy comunes):

| Código del alumno | javac | Lo que lee el alumno |
|---|---|---|
| `return 0;` o `return x;` en `main` (hábito de C) | `incompatible types: unexpected return value` | «Te falta un punto y coma ";" al final de esta línea.» (`analizarRetorno` solo acepta `return;`) |
| `System.out.println("Suma: ", x);` (estilo Python; también `print`) | `no suitable method found for println(String,int)` | «Te falta cerrar un paréntesis ")".» |
| `int x = x + 1;` | `variable x might not have been initialized` | «No existe una variable llamada "x". ¿La declaraste antes?» |

Robustez: 12 000 entradas mutadas a nivel de carácter sobre `corpus/curso`, 0 excepciones no capturadas. La pila se agota (y sale `error-interno`, honesto) solo con anidamientos irreales: ≥ 997 paréntesis, ≥ 1 250 `if`, ≥ 3 125 términos en una suma (medido en Node; el límite en un worker varía por navegador). Rendimiento lineal en lo probado (20 000 `println` en 86 ms).

---

### Definición de Terminado (`proposal.md` §13) aplicada a lo que agrega el lote

1. **Sin TODO, mocks ni demos en producción:** CUMPLE. `grep` sobre `src/`: las únicas coincidencias son la palabra española «TODO» en comentarios; el `stub textoDoubleTemporal` de la 1.10 está retirado (queda solo su historia en comentarios; el plegado devuelve `null` para `double`, nunca inventa). Sin `console`, `debugger`, `any` ni `@ts-ignore`; una supresión `eslint-disable` preexistente del lote 0 (`EditorJava.tsx:58`). Los `vi.mock` son solo de prueba. Lo no terminado (ejecución) queda tras `ejecucion-no-disponible`.
2. **TDD estricto real:** CUMPLE CON OBSERVACIONES (WARNING-4 por el formato y la 1.29; las 8 tareas reproducidas).
3. **`npm test`, lint y tipos en verde con salidas acotadas, CI verde:** CUMPLE (cifras de arriba; CI remoto verde sobre `1c8cf5b`).
4. **Textos es-MX reales, sin jerga:** PARCIAL (WARNING-3). Los avisos y los errores de atribución leen bien y sin restos (`undefined`, `NaN`, `{x}`, `[object`, mensajes de JavaScript o de javac en inglés: 0 en mi barrido de los 2 614 problemas de los mutantes, y 0 en los 2 814 de la guarda del equipo); el genérico `error-no-clasificado` cubre el 49,2 % de los errores de mutantes (1 186 de 2 411) y en 373 (15,5 %) dice «se esperaba un token de tipo "identificador"».
5. **Accesible en lo que el lote agrega:** CUMPLE. `<p role="alert">` (región viva asertiva, `Visualizador.tsx:130`) que solo existe con un problema; el aviso es texto sin color; el flujo por teclado (Tab al botón, Enter) funciona. `axe-core` (WCAG 2 A/AA y 2.1 A/AA) sobre los 3 estados de la pantalla × esquema claro y oscuro con movimiento reducido: **0 violaciones en la región del aviso**. Sí sale 1 violación grave, `aria-input-field-name`, en el editor (`.cm-content` sin nombre accesible); existe también sin ningún aviso y `EditorJava.tsx` no cambió en el lote 1: es del lote 0 y le toca a la 5.10 (C14) (SUGGESTION-6).
6. **Cero red; dependencias y peso:** CUMPLE con reserva. `package.json` y `package-lock.json` sin cambios en toda la rama; ni `fetch`, `XMLHttpRequest` ni `WebSocket` en `src/`; CSP `connect-src 'self'`; 0 peticiones externas en mis 6 cargas con Playwright (2 esquemas de color × 3 pantallas) (WARNING-7 por el peso).
7. **`main` desplegable:** CUMPLE (el paso `build` de CI y el `build` del E2E pasan; Vite avisa de un fragmento de 852 KB sin comprimir).
8. **Commits convencionales sin atribución de IA:** CUMPLE en los 18 (`git log main..HEAD`): todos `tipo(alcance): descripción` en español, autor Jorge Zepeda, cero trailers, cero coincidencias de «co-authored», «claude», «anthropic» o «generated». La confirmación del PO por commit no se puede comprobar desde el repositorio.

### Coherencia con el plan

- **spec y propuesta ya citan la frase de la 1.30:** SÍ. `specs/subconjunto-java/spec.md:55` (requisito: «sin afirmar que el programa compila, admitir que por eso esa parte no se revisa») y `:60` (escenario, texto exacto), `proposal.md:77`. Queda una glosa vieja en `proposal.md:78`: «*No disponible en el visualizador* (Java sí)» (SUGGESTION-1).
- **`state.yaml`:** refleja la 1.30 y la instrucción «re-verificar el lote 1 antes del merge»; `verify: pending`. Desactualizado: `phases.tasks` sigue diciendo «101 tareas».
- **`tasks.md`:** las 29 tareas del lote 1 con su marca y fecha; los encabezados de la 1.29 y 1.30 declaran RED, GREEN, refactor y `Verif`. Cuenta real: 116 tareas (19 + 29 + 22 + 8 + 16 + 14 + 8) frente a 101 en la tabla «Resumen por lote» y en `CLAUDE.md`.
- La nota de la 1.29 dice que el seguimiento del motor duplicado está «en la tarea 3.5»; está en la 3.6 (`tasks.md:501`), con cifras viejas (204 KB / 24 KB).
- Estado de los hallazgos de la verificación anterior: WARNING-2 (fixture 06) **resuelto** (`00ef9e1` encontró 10 de 44 muestras inválidas y dejó guarda permanente); WARNING-3 (CI remoto) **resuelto**; WARNING-1 (tabla TDD) sigue abierto; SUGGESTION-1 (1.18) y SUGGESTION-2 (fechas de 1.16/1.22) siguen abiertas; SUGGESTION-3 (`experimentos/texto`) quedó cubierta en la práctica porque las guardas nuevas recorren los 196 `.oraculo.json`.
- Corrección honesta a mi verificación anterior: dije que no había casos donde el compilador aceptara algo que javac rechaza «fuera de los ya documentados». Con esta prueba independiente eso era falso; mi muestreo entonces se apoyó en el corpus y los mutantes, que no alcanzan esas reglas.

---

### Riesgos abiertos que el PO debe conocer antes del merge

1. **Falsos aceptos (CRITICAL-1).** Cuantificados arriba. Además, cuando el lote 2 empiece a ejecutar, esos programas se **ejecutarían** con semántica inventada: el hueco pasa de «frase falsa» a «resultado inventado».
2. **Residuales de la 1.29:** `sealed`/`permits` y `0x1p3` (Java 17 válido, fuera de U3–U7) dan error; `String.length()` sin objeto recibe la frase falsa (F6); `Math.hashCode()`, `case 1, 1:` y mezclar flecha con dos puntos sí dan aviso honesto (verificado).
3. **Peso:** 296 587 B en los dos paquetes (≈ 59 % de 500 KB), 30 % más que al inicio del lote por los datos del JDK (+29 KB) y el motor completo viaja dos veces (`cliente.ts` lo importa de forma estática: ≈ 55 KB de más). Quedan ≈ 200 KB de margen para los lotes 2–6, que traen tablas de `Double.toString`, `Math.pow`, Unicode, `printf`. No hay puerta automática hasta la 5.9 (`npm run presupuesto` no existe).
4. **Estado del producto tras el merge:** solo se ejecuta `System.out.println` de un literal (5 de 151 programas válidos del corpus dan `ok`; 102 dan «todavía no sabe ejecutar»). Es lo planeado, pero `main` no sería un producto usable hasta el lote 2.
5. **E2E «sin red» en WebKit omitido** (límite de Playwright, arrastrado desde el lote 0 con seguimiento obligatorio antes del lote 5).
6. **Revisión de textos del PO (5.11)** pendiente para las frases de 1.26, 1.27 y 1.29 y el prefijo «Línea N: »; destaca el genérico con jerga.
7. **Accesibilidad de base:** el editor sin nombre accesible (axe, grave) es del lote 0 y sigue abierto hasta la 5.10.

### Opciones para el PO (con su costo)

- **A. Corregir antes del merge (tarea 1.31).** Implementar F1–F6 y los identificadores `var`/`yield` con el método de siempre (javac primero, RED, GREEN), y sumar mis 330 programas al corpus con su `.oraculo.json` para que `programas-validos` y `programas-invalidos` los vigilen. Costo: una sesión más antes del merge; el lote 2 arranca sin huecos conocidos. Es lo que hizo el PO en la 1.29 y la 1.30.
- **B. Fusionar ahora y hacer de la 1.31 prerrequisito duro del lote 2.** Costo: `main` conserva la frase falsa en esos casos (sin usuarios hoy, no hay Pages) y hay riesgo de que la deuda se erosione; la renuncia debe quedar escrita en `state.yaml`.
- **C. Puente barato:** que `ejecucion-no-disponible` y los textos de arranque dejen de afirmar validez («No sé ejecutar lo que escribiste en la línea N y tampoco puedo confirmar que Java lo acepte…»), con el mismo principio de la 1.30. Costo: quita la frase falsa hoy, pero pierde el mensaje tranquilizador para los programas válidos y **no arregla el veredicto**. Solo como puente junto a A o B.

Mi recomendación: A. Si el PO prefiere avanzar, B con la renuncia escrita, y C como puente.

---

## Issues encontrados (re-verificación del lote 1)

### CRITICAL (deben resolverse antes de archivar)

1. **Falsos aceptos en 6 familias de reglas de atribución** (F1–F6): 32 de 193 programas que javac 17.0.18 rechaza se dan por buenos y el alumno lee «Java sí acepta tu programa…». Incumple REQ-COMP-006, reglas 4 y 5 de CLAUDE.md y la premisa de la excepción de la 1.30. Evidencia: tabla de familias arriba; reproducible con los scripts de `…/scratchpad/verif/dif/` (efímeros; los programas mínimos quedan además en engram, topic `sdd/visualizador-java/falsos-aceptos-lote1`).

### WARNING (deberían resolverse)

1. **Falsos rechazos: `var` y `yield` como identificadores** (javac compila; el visualizador da error de sintaxis). Mismo tipo de falla que la 1.29 y que su guarda no ve porque el corpus no los usa. Más `sealed`/`permits` y `0x1p3`, declarados.
2. **Diagnósticos con texto equivocado en errores muy comunes:** `return 0;`/`return x;` en `main`, `println("a", x)` y `int x = x + 1;` (tabla arriba). El veredicto y la línea son correctos; el texto no.
3. **Jerga en el genérico `error-no-clasificado`:** 49,2 % de los errores de mutantes, 15,5 % con «token de tipo "identificador"»; avisos con «tipo de nivel superior», «cláusula throws», «sentencia». Pendiente de la revisión del PO (5.11, C18); el punto 4 de la Definición de Terminado no está cumplido del todo en ese texto.
4. **Evidencia TDD:** sin tabla de 8 columnas (heredado de los lotes 0 y 1) y la 1.29 perdió el RED literal de 8 ciclos. Juzgado arriba: la compensación basta para validar las pruebas, no para probar el orden.
5. **REQ-SUB-006, cláusula «y N más»:** el motor calcula `adicionales` (2 con 3 arreglos) pero ninguna prueba usa N > 0, `Visualizador.tsx` no lo muestra y ninguna tarea futura lo menciona (la 4.5 solo cita ícono, título y subrayado).
6. **C8 «una muestra por construcción», brechas:** dos de las 13 filas de §2.2 —segundo `Scanner` y `printf` con especificadores fuera del currículo— todavía dan el aviso genérico `ejecucion-no-disponible`, y cuatro filas de biblioteca (`nextLong`/`parseLong`, `System.exit`, `hasNextX`/`useLocale`, `Math` trascendentes) solo se cubren con pruebas de atribución, sin muestra en `corpus/compilacion/avisos/`. El plan las lleva a la 2.15; C8 no se puede dar por totalmente cumplido hasta entonces.
7. **Peso:** ver riesgo 3; sin puerta automática y con `cliente.ts` duplicando el motor.

### SUGGESTION (mejoras, no bloqueantes)

1. `proposal.md:78` conserva «*No disponible en el visualizador* (Java sí)».
2. Cuentas desactualizadas: «Resumen por lote» de `tasks.md` (16, 17 y 101; real 19, 29 y 116), `CLAUDE.md` («101 tareas» y marcas `[x]`/`[ ]`, `tasks.md` usa `✅`), `state.yaml` (`phases.tasks`) y `openspec/config.yaml` (`context` sigue en «lote 0 en cierre»).
3. Numeración: la 1.18 sigue sin explicarse en `tasks.md`; las fechas de 1.16 y 1.22 dicen 2026-09-29 y los commits son del 2026-09-28.
4. Nota de la 1.29 apunta a la tarea 3.5; el seguimiento del motor duplicado está en la 3.6, con cifras viejas.
5. Aserciones débiles: `catalogo.test.ts:52` y `sobrecargas.test.ts:95`.
6. Editor sin nombre accesible (axe, grave, preexistente del lote 0): planearlo en la 5.10 o antes.
7. `REQ-BIB-003` nombra `%e` en su primera frase mientras `REQ-SUB-007` lo excluye; aclararlo antes del lote 2.
8. Cobertura baja en archivos tocados por el lote solo donde el código es del lote 3 o defensivo: `trabajador.ts` 71,7 % (`entrada`, `cerrar-entrada`, `detener` y el enlace del worker, que ejerce el E2E), `alcance.ts` 89,5 % (dos `throw` defensivos).

---

## Verificación final (re-verificación del lote 1)

- Ejecuté, no solo leí: `npm test`, `test:oraculo`, `lint`, `tipos`, `e2e`, `oraculo:verificar` y la cobertura, con salida y cifras reales; regeneré en copias los datos del JDK y los 2 625 veredictos de mutantes con javac real (idénticos); reproduje el RED de las tareas 1.23–1.30 contra la producción previa; sabotée las dos guardas de corpus; consulté `gh` para el PR y el CI.
- Escribí y ejecuté 330 programas propios contra javac real (5 lotes), corrí `axe-core` y el flujo por teclado sobre la pantalla de problemas, y medí robustez, rendimiento y peso.
- Leí la Definición de Terminado, el plan y sus tres fuentes (`spec`, `proposal`, `state.yaml`) y contrasté cada afirmación del PR con la ejecución.
- No modifiqué código, pruebas, `tasks.md`, `state.yaml` ni `config.yaml`. Solo agregué esta sección. No hice commit ni push.

**Veredicto final de la re-verificación del lote 1: FAIL por 1 CRITICAL.** Todo lo demás cumple, y el CRITICAL se puede cerrar con una tarea acotada (1.31) o renunciar por escrito. La decisión es del PO.


---

## Re-verificación del lote 1 (1.1–1.33)

**Fecha:** 2026-10-02. **Modo:** Strict TDD (inyectado por el orquestador; autoritativo). **Alcance:** las 32 tareas numeradas 1.1–1.33 (la 1.18 no existe, `tasks.md:240`). **Rama:** `feat/lote-1b-sentencias` @ `a1d8580`, árbol limpio al empezar y al terminar (solo cambia este archivo). 24 commits sobre `main` (828 archivos, +37 038/−438); desde la re-verificación anterior (`52adfdd`) hay 5 commits más (`bcab4f7` 1.31, `2e3c60a` 1.32, `bd5e736` 1.33, `abfeb40` y `a1d8580` de plan; 571 archivos, +11 803/−437). Los seis últimos (`52adfdd`…`a1d8580`) NO están subidos: el PR #2 sigue en `1c8cf5b`, `MERGEABLE`/`CLEAN`, con `ci` y `oraculo` verdes sobre ese SHA. Todo lo que ensucia (copias del repositorio, árboles temporales para reproducir el RED, programas, mutantes, scripts) vivió en el *scratchpad*.

### Veredicto: **FAIL** (1 CRITICAL reabierto, hallado con instrumentos independientes; todo lo que mide el plan está en verde)

Lo bueno, medido: las seis familias de atribución del CRITICAL-1 anterior (F1–F6) y todo lo nuevo de la 1.32 y la 1.33 (N1–N6, `var`/`yield`, palabras reservadas, guion bajo, flotantes hexadecimales, `printf` como valor, `return` con valor, `println` con dos argumentos) **están cerrados**: en 1 335 programas escritos a mano por mí, de los que javac rechaza 935, `compilar()` no deja pasar ninguno (0 falsos aceptos; la primera vez eran 32 de 193). El generador de la 1.31 sale con código 0 y 0 discrepancias en la semilla del CI y en una nocturna de 40 000 programas. `npm test` 2 692/2 692, mutantes 100,00 % / 98,84 % / 87,52 %, lint, tipos, E2E y regeneración de datos del JDK en verde.

Lo que cambia el veredicto: **cuatro familias de falsos aceptos siguen vivas**, y las ve cualquier instrumento que no sea la gramática del generador. Con 105 800 programas independientes comparados con javac 17.0.18 real, javac rechaza decenas de miles y `compilar()` deja pasar como válidos programas que javac rechaza, con el texto «Java sí acepta tu programa, pero este visualizador todavía no sabe ejecutar lo que escribiste en la línea N» (falso). Dos de las familias son errores que un alumno de bachillerato sí comete: **una sentencia dentro del `switch` antes del primer `case`** y **usar `args` o `System.in` donde no van** (`args.length()`, `int x = System.in;`, `System.in.nextInt()`, `System.in.read()`). Incumple REQ-COMP-006 («ni más permisivo»), las reglas 4 y 5 de CLAUDE.md y la premisa de la excepción de la 1.30, igual que el CRITICAL anterior. La barrera «0 discrepancias en 218 000 programas» es verdadera y mide lo que su gramática puede producir: no usa `args`, no usa `System.in` como valor, no escribe nada dentro de un `switch` fuera de un `case`, no nombra una clase como una del JDK ni pone una expresión entre paréntesis como sentencia.

---

### Resumen de ejecución (cifras reales, ejecutadas por mí)

| Comando | Resultado |
|---|---|
| `npm test` | **2 692 pasan (2 692)**, 60 archivos, 8,3 s, salida 0 (motor 2 658 en 53 archivos; interfaz jsdom 34 en 7) |
| `npm run test:oraculo` (Temurin 17.0.18+8) | **1.ª corrida: salida 1**, 1 suite de 23 falló (`herramientas/oraculo/generar-datos.test.ts`, integración con el JDK: «La salida de GenerarClasesJdk.java está truncada o incompleta: se leyeron 0 clases…»; 460 pasan + 19 omitidas). El mismo archivo aislado: 55/55 (48 s) y otra vez con la CPU saturada (12 procesos `yes`): 55/55 (158 s). Corrida completa de nuevo: **478 pasan + 1 omitida (479)**, 23 archivos, 91,7 s, salida 0. Es un *flake*; ver WARNING-1 |
| `npm run lint` / `npm run tipos` (4 `tsc`) | salida 0 / salida 0, sin mensajes |
| `npm run e2e` (construye por su cuenta; 3 motores) | **17 pasan + 1 omitida**, 18,9 s (la omitida es «sin red» en WebKit, límite conocido de Playwright desde el lote 0) |
| `npm run oraculo:verificar` | **295 programas, goldens idénticos** a una regeneración real (178 compilan + 117 no), 113 s |
| Mutantes dentro de `npm test` (C7) | veredicto **2 625/2 625 = 100,00 %** (pide 100 %), línea **2 383/2 411 = 98,84 %** (pide ≥ 95 %), código **2 110/2 411 = 87,52 %** (umbral propio 0,87, intacto) |
| `oraculo:generados`, semilla del CI (`--semilla 20260929 --cantidad 3000 --max-reducir 100`) | **salida 0, 0 discrepancias**; javac compila 1 470 y rechaza 1 530; línea coincide 938/938 (100,00 %); 10,1 s |
| `oraculo:generados`, tamaño nocturno (`--semilla 20261002 --cantidad 40000`) | **salida 0, 0 discrepancias**; compila 19 230, rechaza 20 770; línea 12 715/12 720 (99,96 %); 75,7 s |
| `oraculo:datos` y `oraculo:mutantes` (en copia limpia de `HEAD`, sin tocar el repo) | **bytes idénticos** a lo versionado: 755 firmas, 25 supertipos, 4 477 clases en 226 paquetes, 54 palabras reservadas; 2 625 mutantes (214 compilan, 2 411 no) |
| Cobertura (informativa, v8, a un directorio del scratchpad) | global: líneas 96,90 %, ramas 93,44 %, funciones 96,45 %, sentencias 95,56 %. Los 17 de 18 archivos de producción cambiados desde `52adfdd` que reporta promedian **99,32 %** de líneas (el menor, `sintaxis/no-soportado.ts` 96,79 %) |
| Peso (`dist/` del E2E, `gzip -9`) | `index-*.js` 244 379 B + `trabajador-*.js` 57 661 B = **302 040 B** (295,0 KiB; 60,4 % de 500 KB). `npm run presupuesto` sigue sin existir (`herramientas/presupuesto-tamano.ts`, tarea 5.9) |
| `npm run licencias`; dependencias | 9 de 9 permisivas; `package.json`, `package-lock.json` y `.nvmrc` sin cambios respecto a `main` |

Distribución por capa de `npm test` (2 692): unitarias en `src/motor` 1 596 (26 archivos), `src/textos` 272 (4), `src/presentacion` 29 (2), `src/trabajador` 11 (2), `herramientas` 6 (1); transversales de punta a punta sin DOM en `pruebas/compilacion` 724 (13) y `pruebas/diferencial` 1; arquitectura 19 (4); integración jsdom 34 (7). Aparte: proyecto `oraculo` con JDK real 478 + 1 omitida (23 archivos) y E2E Playwright 17 + 1. Todas las capas usadas figuran en `openspec/config.yaml` → `testing`. Las cifras de `npm test`, mutantes, `test:oraculo` (segunda corrida), E2E y peso coinciden exactamente con `apply-progress` (engram #568).

---

### Criterio de salida del lote 1, C7 y C8

Criterio de salida de `tasks.md` («`motor/{lexico,sintaxis,semantica,compilador}` + `pruebas/compilacion/**` verdes; C7 y C8 cumplidos»): **CUMPLE en lo que mide**, con las cifras de arriba, y las 32 tareas del lote tienen `✅ hecha` (`tasks.md`, 32/32). Pero el requisito que el lote existe para cumplir, REQ-COMP-006 («el veredicto MUST coincidir con javac en el 100 % de los casos: ni más estricto ni más permisivo»), **no se cumple** (CRITICAL-1).

- **C7, primera parte** (37/37 casos del catálogo, primer error de la primera pasada): **CUMPLE** (`catalogo-semantico.test.ts`, `catalogo.test.ts`, `arranque.test.ts`; todo en verde).
- **C7, segunda parte** (≥ 2 000 mutantes, veredicto 100 %, línea ≥ 95 %): **CUMPLE** (100,00 % / 98,84 %), y regeneré los 2 625 veredictos con javac real: idénticos. La baja del código de 88,47 % a 87,52 % la explica la 1.33 y la **juzgo correcta**: según su registro, 41 mutantes cambian de código y ninguno de veredicto ni de línea (31 son `int int x = 5;`/`area double = 5;`, que javac reporta como `not.stmt` y la métrica mapea a `error-no-clasificado`, y que ahora dan `palabra-reservada-como-nombre`; 9 ganan coincidencia; la aritmética cuadra: 2 133 − 31 − 1 + 9 = 2 110, y el veredicto y la línea quedan idénticos, 100,00 % y 98,84 %). Recalculé el efecto corriendo `compilar()` sobre los 2 625 mutantes: `error-no-clasificado` baja de 1 186 a 1 145 (49,2 % → 47,5 % de los errores) y la jerga «token de tipo» de 373 a 354 (15,5 % → 14,7 %). El umbral 0,87 sigue siendo un mínimo contra retroceso, no un valor inflado.
- **C8** (una muestra por construcción → su aviso, 0 pasos, 0 errores de sintaxis engañosos): **CUMPLE en lo medido** (59/59 muestras de `corpus/compilacion/avisos/` dan `no-disponible`, 9 controles en `corpus/compilacion/catalogo/`, y el JDK real confirma que las 59 son Java válido). Brecha vigente (WARNING-7): de las construcciones de REQ-SUB-007 que probé una por una (35 programas válidos, más los escapes Unicode aparte), solo 9 siguen dando `ejecucion-no-disponible` en vez de su aviso propio: el segundo `Scanner`, `printf` con `%e`, `%x`, `%1$d` y las banderas `+`, `(`, `#` y espacio (7 variantes), y un patrón de `printf` que no es literal; las otras 26 construcciones, y la de escapes Unicode, dan su aviso.

---

### CRITICAL-1 reabierto: prueba diferencial independiente contra javac 17.0.18 real

**Método.** Nada de lo de abajo usa el generador del repositorio ni su `CompiladorEnLote.java`. Escribí mis propios programas y mis propios instrumentos: (1) un corpus a mano; (2) un mutador propio de 17 operadores semánticos y estructurales; (3) un fuzzer propio de tokens; (4) una matriz propia valor × contexto; (5) focos dirigidos. Para compilar en lote usé la API `JavaCompiler` del JDK en una sola JVM (`-encoding UTF-8 -Xlint:none`, igual que la CLI); la validé contra la CLI `javac` sobre mis 1 335 programas: **0 diferencias** en veredicto y en línea del primer error. Un falso acepto es: javac rechaza y `compilar()` da `ok` o `ejecucion-no-disponible` (único código cuyo texto dice «Java sí acepta tu programa»); un aviso de otro código ante un rechazo de javac es honesto y no cuenta.

| Instrumento (todo escrito por mí) | Programas | javac compila / rechaza | **Falsos aceptos** | Falsos rechazos | Línea igual si ambos rechazan |
|---|---|---|---|---|---|
| 1. Corpus a mano: U3–U7 completos (48 válidos, 50 con un error típico), F1–F6, N1–N6, `var`/`yield`, 77 casos de palabras reservadas y nombres, guion bajo, flotantes hex, `printf`, `return`, `println`, léxico, 110 de sintaxis, tipos, `Scanner`, cadenas, `Math`, constantes, flujo, Java 17 y clases | 1 335 | 400 / 935 | **0** | 7 | 803/813 (98,77 %) |
| 2. Mutador de 17 operadores sobre los 399 programas que javac compila (7 campañas, semillas 1001 y 2001–2006) | 76 416 | 18 143 / 58 273 | **50** (0,086 %) | 233 | 42 368/42 839 (98,90 %) |
| 3. Fuzzer de tokens (insertar, borrar, intercambiar, reemplazar, duplicar; semilla 3001) | 23 880 | 1 350 / 22 530 | **15** | 21 | 20 656/21 162 (97,61 %) |
| 4. Matriz valor × contexto: 40 valores (variables de cada tipo, literales, `args`, `System.in/out/err`, llamadas void, clases como valor…) × 81 contextos (declaración, asignación, operadores, comparaciones, condiciones, `switch`, llamadas, casts, miembros) | 3 240 | 982 / 2 258 | **368** | 0 | 100 % |
| 5. Focos dirigidos (8): sentencias raras dentro de `switch`, operadores sobre referencias, `args`, campos de biblioteca, `main` y nombres de clase raros, constantes, expresiones como sentencias, nombres que chocan con propiedades de JavaScript | 912 | — | **64** | 9 | — |

Cero falsos aceptos en el instrumento 1 es la mejor noticia del lote (la verificación anterior, con 330 programas del mismo estilo, daba 32). De los 40 valores de la matriz, 32 dan **0 falsos aceptos en los 81 contextos** (enteros, `long`, `double`, `char`, `boolean`, `String`, `Scanner`, `Random`, `args[0]`, literales, `null`, llamadas con y sin valor, `Math`, `System` y `String` como clase, `new Object()`, `Math.PI`, `Integer.MAX_VALUE`…): el verificador de tipos es sólido en lo que modela. Los otros 8 son `args`, `args.length`, `args.length()`, `System.in`, `System.out`, `System.err`, `System.in.read()` (367 de los 368 falsos aceptos) y `(i = 3)` como sentencia (el 368.º: familia D).

**Las cuatro familias que sobreviven** (programas mínimos, cada uno dentro de `public class P { public static void main(String[] args) { … } }`; las cuatro las confirmé con la CLI `javac` y con `compilar()` directo):

| Familia | Programa mínimo | javac 17 dice | `compilar()` | Instrumentos que la ven |
|---|---|---|---|---|
| **A. Sentencia o declaración en el `switch` antes del primer `case`/`default`** | `int x = 1; switch (x) { break; case 1: break; }` · `int op = 2;` ⏎ `switch (op) {` ⏎ `System.out.println("Elige:");` ⏎ `case 1: … }` · `switch (x) { int y = 2; case 1: break; }` · `switch (x) { x++; }` · `switch (x) { ; }` | `case, default, or '}' expected` (en la línea de la sentencia) | `ejecucion-no-disponible` | focos 24 de 35; mutador 38 de los 50 |
| **B. `args` y `System.in`/`System.out`/`System.err` como valores sin tipo y sin aviso** | `int n = args.length();` (confusión clásica con `String`) · `int n = args;` · `String t = args.length;` · `args = 5;` · `args++;` · `if (args == 5) { }` · `int x = System.in;` · `String s = System.out;` · `Scanner sc = new Scanner(+System.in);` (también `-`) · `boolean b = System.in == System.out;` · `int n = System.in.nextInt();` · `int c = System.in.read();` | `cannot find symbol` · `String[] cannot be converted to int` · `incompatible types` · `bad operand type InputStream for unary operator '+'` · `unreported exception IOException; must be caught or declared to be thrown` | `ejecucion-no-disponible` | matriz 367 (los 7 valores); mutador 12; fuzzer 14; focos 29 |
| **C. Clase del alumno con nombre de clase del JDK** | `public class Math { … System.out.println(Math.abs(-1)); … }` · `public class Integer { … Integer.parseInt("5") … }` · `public class System { … System.out.println("x"); … }` | `cannot find symbol` (el `Math`/`System` del alumno no tiene `abs`/`out`) | `ejecucion-no-disponible` y, con `System`, **`ok`** (lo ejecutaría) | focos 3; fuzzer 1 |
| **D. Expresión entre paréntesis como sentencia** | `int x = 1; (x = 2);` · `(x++);` · `(++x);` · `(sc.nextInt());` · `(System.out.println("a"));` · `(Math.abs(-1));` · `String s = "a"; (s.length());` | `not a statement` | `ejecucion-no-disponible` | focos 8; matriz 1 |

Causa raíz (verificada en el código en A y B; probable en C y D):
- **A:** `src/motor/sintaxis/analizador-sintactico.ts:783-793` (`analizarSwitch`): el `while` acepta cualquier elemento de bloque (`analizarElementoDeBloque`) también ANTES de la primera etiqueta; javac exige una etiqueta primero.
- **B:** `src/motor/semantica/tipos.ts:249-276`: `System.in/out/err` solo existen como «argumento reflejado» para resolver una sobrecarga (`new Scanner(System.in)`); como valor en cualquier otra posición (asignación, operador, condición, receptor de un miembro) su tipo es «desconocido» y nada avisa; `args` (un arreglo, fuera del subconjunto salvo como parámetro) no tiene ni tipo ni aviso. Por el principio de la 1.32 («dentro de U3–U7 se modela la regla; fuera, aviso») la respuesta correcta es un error o, como mínimo, un aviso, nunca `ejecucion-no-disponible`.
- **C:** el nombre de la clase pública no se cruza con el catálogo de clases del JDK (probable). El inverso también falla: `public class Random { Random r = new Random(); }` y `public class Scanner { Scanner s = new Scanner(); }` los compila javac y `compilar()` los rechaza con `tipo-requiere-import`.
- **D:** `src/motor/sintaxis/ast.ts` no tiene nodo de paréntesis, así que `analizarSentenciaExpresion`/`envolverComoSentenciaExpresion` (`analizador-sintactico.ts:1061-1073`) no distinguen `(x = 2)` de `x = 2` (probable).

Por qué importa más adelante: cuando el lote 2 ejecute, estos programas dejan de ser «una frase falsa» y pasan a ejecutarse con una semántica inventada (el `public class System` ya da `ok` hoy).

**Falsos rechazos** (javac compila; `compilar()` da error de compilación), todos de baja plausibilidad para el curso pero con texto engañoso; ninguno afecta al corpus ni a los mutantes:
- Java 17 fuera de U3–U7 dado como error en vez de aviso: `if (o instanceof String s)` («Te falta cerrar un paréntesis»), `sealed interface … permits …` (ya declarado en la 1.29), clase anónima `new Runnable() { … };` («Te falta un punto y coma»), y los archivos sin ninguna clase (vacío, solo un comentario, solo `package`, solo `import`: `error-no-clasificado`).
- Dentro del subconjunto: `final int A = 'a'; char c = A;` (constante derivada de un literal `char`: `conversion-con-perdida`), `final String S = (String) "a"; … case S:` (`etiqueta-de-case-no-constante`; un cast a `String` o a un primitivo sigue siendo constante, JLS 15.29), `int x; if ((boolean) true) { x = 1; } System.out.println(x);` (`variable-posiblemente-no-asignada`), `(Integer) 017` o `(String) "…\0…"` (un cast seguido de un literal con aviso da «Te falta un punto y coma»), `main(String[] args, int x)` y `main(String args)` (error de paréntesis o genérico), la llamada `main(args);`, y escapes Unicode con significado sintáctico (el de la comilla o el de `&&`).

**Fallos internos** (`compilar()` LANZA; la interfaz los muestra como `error-interno`, honesto, pero ese tramo de `tipos.ts` se documenta como «Pura, nunca lanza», `tipos.ts:278`): `new Scanner(System.toString)`, `Math.abs(System.valueOf)`, `s.equals(System.constructor)`… cualquier `System.<propiedad de Object.prototype de JavaScript>` (`toString`, `valueOf`, `constructor`, `hasOwnProperty`, `__proto__`…) como argumento da `TypeError: campo.lastIndexOf is not a function`. Causa: `CAMPOS_DE_SYSTEM_REFLEJADOS` (`tipos.ts:249`) es un objeto literal y `CAMPOS_DE_SYSTEM_REFLEJADOS[expresion.miembro] ?? null` (`tipos.ts:269`) devuelve la función heredada, no `undefined`, así que el `?? null` no actúa; `nombreDeArgumentoParaMostrar` (`tipos.ts:299`) la usa como texto y revienta. 56 de las 120 variantes que probé lanzan (8 nombres de `Object.prototype` × 7 posiciones de argumento); 3 de los 76 416 mutantes también. Aparte, con anidamientos patológicos `compilar()` lanza `RangeError: Maximum call stack size exceeded` (a partir de ≈ 1 000 paréntesis anidados, 2 000 casts seguidos, 1 600 `if` anidados o 10 000 términos de una suma); la CLI de javac también se rinde con `StackOverflowError` desde ≈ 4 000 términos de una suma, 4 000 casts, 5 000 paréntesis, 1 600 `if` anidados o 4 000 `else if`, así que el orden de magnitud es el mismo (solo el de paréntesis es entre 4 y 8 veces menor) y no lo cuento como hallazgo: ningún programa de alumno se acerca.

**Líneas distintas** (ambos rechazan, distinta línea): casi todas son la precedencia léxico/sintaxis que la 1.33 dejó abierta (un error léxico posterior —cadena sin cerrar, comilla tipográfica, guion bajo mal puesto, literal mal formado— gana a un `';' expected` anterior, porque `tokenizar` lee todo antes de la sintaxis y javac lee token a token). Medido: 10 de 813 en mi corpus (1,2 %), 471 de 42 839 en los mutantes (1,1 %), 506 de 21 162 en el fuzzer (2,4 %), 5 de 12 720 en la nocturna del generador (0,04 %). No es de veredicto (las dos partes rechazan, y las dos fallas son reales); el criterio de línea de C7 (≥ 95 %) no se ve afectado. Sale además `import java.sqrt.*;` (javac señala el `import`, nosotros el primer uso del tipo, 3 líneas después) y un campo sin `;` (`int x = 5` en el cuerpo de la clase, línea 2 contra 3).

---

### TDD estricto: reconstrucción de la tabla de evidencia (tareas 1.31–1.33) y juicio

`apply-progress` (engram #568) no trae la tabla de 8 columnas de `strict-tdd.md`; trae narrativa por tarea, y `tasks.md` trae el **RED escrito ciclo por ciclo con la línea literal de cada fallo** (1.31: 18 ciclos; 1.32: 12; 1.33: 7), más detallada que una tabla. La tabla la reconstruí yo, y **el RED lo reproduje contra el código de producción del commit padre** (árbol temporal: pruebas y corpus del commit de la tarea, producción del padre; `gitattributes.test.ts` falla siempre en esos árboles porque no tienen `.git`, así que lo descarto):

| Tarea | Pruebas (capa) | Safety net | RED reproducido contra la producción previa | GREEN hoy | Triangulación | Refactor |
|---|---|---|---|---|---|---|
| 1.31 (`bcab4f7`) | 10 archivos en `herramientas/oraculo/generados/` + `programas-generados.test.ts` + `compilar-en-lote.test.ts` (oráculo, JDK real; transversales) | `npm test` 1 713 sin cambio | **12 archivos fallan**: 11 no cargan (`Cannot find module './clasificador.ts'` y los demás módulos del generador) y 1 aserción (`--solo-sintaxis`: `expected false to be true`), tal como declara `tasks.md`; RED «módulo inexistente», que `strict-tdd.md` admite, compensado con 2 sabotajes de sensibilidad (RED 18) y el generador de juguete (RED 6) | `test:oraculo` 478 + 1 | clasificador, reductor y campaña con compiladores falsos (acepta todo / rechaza todo / espejo / lanza) | sí (gramática de «una violación por sentencia», retiro de código muerto) |
| 1.32 (`2e3c60a`) | `atribucion.test.ts`, `problemas.test.ts`, `asignacion-definitiva.test.ts`, `compilador.test.ts`, 3 guardas de corpus y tablas de verdad (unitaria y transversal) | 1 713 | **315 fallos en 9 archivos, 311 sin los 4 de `gitattributes` (descartados)**: `atribucion.test.ts` 124, `atribucion-del-corpus` 79, `tablas-de-atribucion` 67, textos 26, `asignacion-definitiva` 10, `compilador` 2, `programas-invalidos` 2, `programas-validos` 1; 1 785 pasan | 2 100 | tablas de 64 pares de cast y de 39 celdas de `switch` con los datos de javac, 41 programas que javac rechaza y 10 controles | sí (`problemaDeNombreDeTipo`, `verificarReasignacionDeFinal` retirado, tablas compartidas) |
| 1.33 (`bd5e736`) | 13 archivos: `palabras-y-nombres` (nuevo), `literales`, `analizador-lexico`, `atribucion`, textos, corpus nuevo, tablas léxicas (y 2 en el proyecto `oraculo`) | 2 100 | **312 fallos (308 sin los 4 de `gitattributes`) en 13 archivos, con los conteos por archivo EXACTOS de `tasks.md`**: `palabras-y-nombres` 103, `lexico-y-sintaxis-del-corpus` 62, `literales` 61, `atribucion` 41, `analizador-lexico` 19, textos 17 (11 + 6), `programas-invalidos` 2, más 1 por archivo en `analizador-sintactico`, `programas-validos`, `atribucion-del-corpus` y `tablas-lexicas` (no carga: falta el módulo generado) | 2 692 | 48 programas del corpus (31 que javac rechaza, 17 que compila), 87 + 57 literales, 54 palabras × 5 contextos, 44 formas de `yield` | sí |

**Juicio.** Cumple. El RED de las tres tareas existe, está escrito con su línea literal y lo reproduje con los mismos conteos (los de 1.33 por archivo, exactos). Dos desviaciones de orden, declaradas por el propio registro y que no juzgo CRITICAL: (a) 1.32 ciclo 9 y 1.33 ciclo 6, las tablas de verdad compartidas, «pasaron en verde a la primera» o se escribieron DESPUÉS del GREEN, como prueba independiente de las reglas (son datos de javac, no derivados del código); la sensibilidad de las del 1.33 la prueban el RED contra `2e3c60a` (125 fallos de 221) y 11 sabotajes sobre copia del árbol; (b) el RED de los módulos puros nuevos de la 1.31 es el de «módulo inexistente», débil pero válido y compensado. La tabla de 8 columnas sigue ausente en `apply-progress` (heredado del lote 0; WARNING-6).

Compliance TDD: evidencia reportada (narrativa con líneas literales), 3/3 tareas con pruebas, RED confirmado por reproducción 3/3, GREEN confirmado (2 692 + 478 + 17), triangulación adecuada (≥ 2 casos por comportamiento), safety net en cada línea «Verif».

### Calidad de aserciones (31 archivos de prueba cambiados desde `52adfdd`)

Sin tautologías, sin dobles (`vi.mock`, `vi.fn`, `vi.spyOn`: 0), sin lazos fantasma: las guardas de corpus y las tablas aseveran su tamaño (`≥ 48`, `≥ 51`, `≥ 117`, `≥ 178`, `toHaveLength(64)`, `(39)`, `(54)`, `(17)`, `(87 + 57 + …)`), y los `toBeDefined()` y `not.toBeNull()` que hay van seguidos de aserciones de valor en la misma prueba o acompañados de su prueba negativa. **Calidad: 0 CRITICAL, 0 WARNING, 2 SUGGESTION heredadas** (ver abajo).

---

### Requisitos del lote 1: al menos un escenario con prueba que pasa (evidencia `archivo:línea`, todo en verde)

| Requisito / escenario | Prueba que lo respalda | Resultado |
|---|---|---|
| REQ-SUB-001 «clase con nombre propio» / «`package` se ignora» | `pruebas/diferencial/u3-hola-mundo.test.ts:11`; `compilador.test.ts:603`; `analizador-sintactico.test.ts:77`; `compilador.test.ts:373` | CUMPLE |
| REQ-SUB-002 «long sin `L`» | `sintaxis/ambiguedades.test.ts:112` | CUMPLE |
| REQ-SUB-003 «`cx += 1.7`» | `semantica/atribucion.test.ts:688` (no se rechaza). Que `cx` quede en 6 exige ejecutar | PARCIAL por diseño (lote 2) |
| REQ-SUB-004 «redeclarar en bloque anidado» | `atribucion.test.ts:70-72` | CUMPLE |
| REQ-SUB-005 «`Character.isDigit('5')`» | `semantica/catalogo-api.test.ts:30` | CUMPLE |
| REQ-SUB-006 «arreglo fuera de alcance» / «octal `010`» | `textos/es-MX/no-soportado.test.ts:111` y `:121`; `lexico/analizador-lexico.test.ts:150` | CUMPLE |
| REQ-SUB-006 cláusula «y N más» | motor: `adicionales`; ninguna prueba con N > 0 ni UI; asignada a la 4.5 (`tasks.md:651`) | PARCIAL (WARNING-8) |
| REQ-SUB-007 «método propio» | `sintaxis/no-soportado.test.ts:97` | CUMPLE |
| REQ-COMP-001 «`Math.round` a `int`» / «condición no booleana» | `atribucion.test.ts:271` / `:370` | CUMPLE |
| REQ-COMP-002 «variable de `for` tras cerrarlo» | `atribucion.test.ts:44`; `alcance.test.ts:60` | CUMPLE |
| REQ-COMP-003 «sombreado en `if`» | `atribucion.test.ts:72` | CUMPLE |
| REQ-COMP-004 «`while` variable» / «`while(true)` con `break`» | `asignacion-definitiva.test.ts:30` / `:163` | CUMPLE |
| REQ-COMP-005 «falta `;`» | `problemas.test.ts:36` (`err01`); E2E `problemas-en-pantalla.spec.ts` | CUMPLE |
| REQ-COMP-006 los 3 escenarios (`{` faltante, atribución oculta DA, alcanzabilidad antes de DA) | `compilador.test.ts:518` y siguientes | CUMPLE |
| **REQ-COMP-006 «ni más estricto ni más permisivo» (cláusula general)** | mis 105 800 programas contra javac real | **❌ FALLA** (CRITICAL-1: familias A–D permisivas; falsos rechazos del apartado de arriba) |
| REQ-COMP-007 «`public void main`» / REQ-COMP-008 «sin `main`» | `arranque.test.ts:38` / `:23`; `compilador.test.ts:562` | CUMPLE |
| REQ-COMP-009 «clase pública con cualquier nombre» | `compilador.test.ts:603` | CUMPLE (pero ver familia C) |
| REQ-COMP-010 «tras `return`» / «`while (1 < 2)`» | `alcanzabilidad.test.ts:40` / `:86` | CUMPLE |
| REQ-DIFF-004 (parte C8) / REQ-DIFF-006 (C7) | `pruebas/compilacion/catalogo.test.ts:27`; `mutantes.test.ts:196-221` | CUMPLE |
| REQ-VIS-002 (texto y línea, 1.28) | `pruebas/compilacion/problemas-en-pantalla.test.ts:90` (recorre el corpus y los mutantes); E2E ×3 motores | CUMPLE; ícono, título y subrayado son de la 4.5 |

Requisitos sin respaldo: ninguno. Los de 1.31–1.33 (`REQ-DIFF-004`, `REQ-DIFF-006`, `REQ-COMP-006`) tienen su guarda; lo que falta no es una prueba sino cobertura de las familias A–D.

---

### Estado de los hallazgos de la verificación anterior (1.1–1.30), uno por uno

| Hallazgo anterior | Estado hoy | Evidencia |
|---|---|---|
| **CRITICAL-1** falsos aceptos de atribución (32/193) | **Reducido y REABIERTO** en 4 familias nuevas | F1–F6 y lo de 1.32/1.33: 0 en 935 rechazos míos; sobreviven A–D (sección anterior) |
| WARNING-1 falsos rechazos `var`/`yield`, `sealed`/`permits`, `0x1p3` | **Parcialmente cerrado** | `var`/`yield` y `0x1p3` coinciden con javac (corpus V y N4); `sealed`/`permits` sigue dando error (50 de los 233 falsos rechazos de mutantes) |
| WARNING-2 textos equivocados (`return 0;`, `println("a", x)`, `int x = x + 1;`) | **Cerrado** | «`main` no devuelve ningún valor (es `void`)… escribe `return;`»; «Ningún "println(...)" acepta los argumentos… júntalos con `+`»; «La variable "x" podría no tener un valor asignado» |
| WARNING-3 jerga de `error-no-clasificado` | **Abierto** (mejora leve) | 1 145 de 2 411 errores de mutantes (47,5 %; antes 49,2 %); «token de tipo "identificador"» en 354 (14,7 %; antes 15,5 %); 0 restos de interpolación o de JavaScript. En mi corpus: 117 de 820 (14,3 %). Pendiente de la revisión del PO (5.11) |
| WARNING-4 evidencia TDD sin tabla; RED de la 1.29 perdido | **Abierto, mejorado** | 1.31–1.33 traen RED literal por ciclo y lo reproduje; la tabla de 8 columnas sigue ausente en `apply-progress`; lo perdido en la 1.29 no se recupera |
| WARNING-5 «y N más» sin prueba, sin UI y sin tarea | **Reubicado, no implementado** | `tasks.md:651` (la 4.5 lo muestra y lo prueba con N > 0) |
| WARNING-6 C8, brechas | **Abierto** | segundo `Scanner`, `printf` con `%e %x %1$d` y banderas, patrón no literal: `ejecucion-no-disponible` (9 de 35 construcciones probadas); plan 2.15 |
| WARNING-7 peso sin puerta | **Abierto** | 302 040 B, `presupuesto` inexistente (5.9), motor duplicado (3.6, `tasks.md:603`, ya con cifras de la 1.33) |
| SUGGESTION-1 `proposal.md:78` «(Java sí)» | **Cerrada** | sin coincidencias de «Java sí» en `proposal.md`; §2.3 dice «Java tampoco lo acepta» |
| SUGGESTION-2 conteos desactualizados | **Casi cerrada** | `tasks.md` 19/32/22/8/16/14/8 = 119 (ok), `CLAUDE.md` 119/73/96 (ok), `state.yaml` (`phases.tasks` ok); sigue `openspec/config.yaml` (`context`: «lote 0 en cierre») y `CLAUDE.md` menciona marcas `[x]`/`[ ]` cuando `tasks.md` usa `✅ hecha` |
| SUGGESTION-3 numeración 1.18 y fechas de 1.16/1.22 | **Cerrada** | `tasks.md:240` explica la 1.18; 1.16 y 1.22 dicen 2026-09-28, como sus commits |
| SUGGESTION-4 nota que apunta a la 3.5 | **Cerrada** | el seguimiento vive en la 3.6 (`tasks.md:603`) |
| SUGGESTION-5 aserciones débiles | **Abierta** | `pruebas/compilacion/catalogo.test.ts:52` (`adicionales ≥ 0`) y `sobrecargas.test.ts:95` sin cambios |
| SUGGESTION-6 editor sin nombre accesible | **Abierta** | `src/interfaz` sin cambios desde `52adfdd`; sin `aria-label` en `EditorJava.tsx`; planeada en la 5.10 |
| SUGGESTION-7 `REQ-BIB-003` nombra `%e` | **Abierta** | `specs/biblioteca-java/spec.md:56` sin cambios |
| SUGGESTION-8 cobertura baja en `trabajador.ts` y `alcance.ts` | **Sin cambios de fondo** | cobertura global 96,90 %; los archivos tocados por 1.31–1.33 promedian 99,32 % |
| Lote 0: WARNING-3 (workflows nunca corrieron) | **Cerrado** | `ci` y `oraculo` verdes en el PR #2 sobre `1c8cf5b`; falta correr `oraculo.yml` sobre `1.31–1.33` (WARNING-10) |
| Lote 0: WARNING-4 (E2E «sin red» en WebKit omitido) | **Abierto** (1 omitida) | límite de Playwright, seguimiento antes del lote 5 |

---

### Definición de Terminado (`proposal.md` §13) aplicada a lo que agregan 1.31–1.33

1. **Sin TODO, mocks ni demos en producción:** CUMPLE. `grep` sobre `src/` y `herramientas/` (no prueba): solo la palabra española «TODO» en comentarios; ni `fetch`/`XMLHttpRequest`/`WebSocket`/`http(s)://`, ni `console`, `debugger`, `any` ni `@ts-ignore` en `src/`. El generador y el reductor son herramientas del oráculo, no producción del producto.
2. **TDD estricto real:** CUMPLE (RED reproducido 3/3; desviaciones declaradas; WARNING-6 por el formato).
3. **`npm test`, lint y tipos en verde con salidas acotadas; CI verde:** CUMPLE local; el CI remoto de las 1.31–1.33 **no se ha corrido** (sin subir), y `test:oraculo` tuvo un *flake* en 1 de 2 corridas completas mías (WARNING-1), que habría tumbado el job `oraculo` del PR.
4. **Textos es-MX reales, sin jerga:** PARCIAL. Los textos nuevos de 1.32 y 1.33 (cast, `void`, miembro de un primitivo, etiqueta de `switch`, palabra reservada, guion bajo, `return` con valor, `println`) leen bien y sin restos; el genérico `error-no-clasificado` y su «token de tipo» siguen (WARNING-5). El texto de `ejecucion-no-disponible`, verdadero cuando todas las pasadas aceptaron, es falso en las familias A–D.
5. **Accesible en lo que agrega:** CUMPLE (no hay cambios en `src/interfaz` desde `52adfdd`; el nombre accesible del editor es del lote 0, SUGGESTION-6).
6. **Cero red; dependencias y peso:** CUMPLE (0 dependencias nuevas, `package*.json` idénticos a `main`, licencias 9/9, 0 llamadas de red en `src/`); peso 302 040 B = 60,4 % del presupuesto, sin puerta automática hasta la 5.9.
7. **`main` desplegable:** CUMPLE (el `build` del E2E y el de `ci.yml` pasan; Vite avisa de un fragmento de 864 KB sin comprimir).
8. **Commits convencionales sin atribución de IA:** CUMPLE en los 24 de `git log main..HEAD`: todos `tipo(alcance): descripción` en español, autor Jorge Zepeda, cero trailers, cero coincidencias de «co-authored», «claude», «anthropic», «generated», «copilot» o «gpt». La confirmación del PO por commit no se puede comprobar desde el repositorio.

**CI de `oraculo.yml` coherente con lo que existe:** SÍ. Todos los comandos que invoca existen en `package.json` (`test:oraculo`, `oraculo:verificar`, `oraculo:datos`, `oraculo:mutantes`, `oraculo:generados`); en PR y *push* corre el generador con la semilla 20260929 × 3 000 y `--max-reducir 100` (timeout 15 min; localmente 10 s), de noche y a mano con 40 000 y la semilla del día (timeout 45 min; localmente 76 s), sube el informe JSON si falla, y `src/motor/**` está en los `paths`; `design.md` §9 y `tasks.md` (1.31, 2.21) lo reflejan. No pude ejecutar Actions; ejecuté localmente cada paso del job (todos en verde salvo el *flake* de `test:oraculo`). No hay prueba que valide el YAML mismo.

### Coherencia del plan

- **Conteos:** 73 requisitos y 96 escenarios (`specs/`, contados); `tasks.md` 19 + 32 + 22 + 8 + 16 + 14 + 8 = **119** tareas, igual que su tabla «Resumen por lote» y su encabezado (101 aprobadas + 18); lote 1: 32 tareas, 32 con `✅ hecha`. `CLAUDE.md` (119/73/96) y `state.yaml` (`phases.tasks`) al día. Sigue desactualizado `openspec/config.yaml` (`context`).
- **`state.yaml`:** refleja 1.31–1.33, «0 discrepancias en 218 000 programas; 2692 pruebas» y «siguiente: re-verificar el lote 1 y pedir al PO subir y mergear»; `verify: pending`; `updated: 2026-09-29`. No lo toqué.
- **Spec y propuesta:** `specs/subconjunto-java/spec.md` (requisitos y escenarios de la 1.30) y `proposal.md` §2.3 citan la frase de «Es parte de Java… no puedo revisar si esa parte está bien escrita»; la 4.5 lleva ahora la cláusula «y N más».
- **`design.md`:** §9 documenta `oraculo:generados`; §2.3/§2.5/§2.6 recogen las reglas de 1.33.

### Riesgos abiertos que el PO debe conocer antes de subir y mergear

1. **Falsos aceptos A–D (CRITICAL-1).** Cuantificados arriba. Dos son errores de alumno plausibles. Cuando el lote 2 ejecute, dejarán de ser «una frase falsa» y pasarán a «un resultado inventado» (`public class System` ya da `ok`).
2. **El generador mide su gramática.** «0 discrepancias» es verdad y no es garantía; cada familia nueva que halla un instrumento distinto es un hueco de gramática. La matriz valor × contexto (3 240 programas, 3 s de javac) y el fuzzer de tokens (24 000 programas, 50 s) encontraron en una tarde lo que 218 000 programas del generador no.
3. **Precedencia léxico/sintaxis** (abierta desde la 1.33): un error léxico posterior gana a un error de sintaxis anterior. Medido: ≈ 1–2 % de los programas con dos fallas, 0,04 % en la nocturna del generador; no cambia el veredicto, solo cuál de los dos errores se ve primero. Cerrarla pide un token de error diferido y tocar el contrato de `tokenizar`; es candidata a tarea propia.
4. **`test:oraculo` inestable** (1 de 2 corridas completas): puede tumbar el job `oraculo` del PR sin que haya un defecto del compilador.
5. **Peso:** 302 040 B (60,4 % del presupuesto; 296 587 B en la verificación anterior), con el motor duplicado por `cliente.ts` (≈ 55 KB de más) y sin puerta automática; quedan ≈ 198 KB para los lotes 2–6.
6. **Falsos rechazos y fallos internos** de la lista de arriba: bajo costo, pero con textos engañosos («Te falta un punto y coma» para una clase anónima).
7. **Residuales declarados:** `printf` como valor es aviso (el error pediría modelar `PrintStream`); hex, octal, binario y `float` fuera de rango son avisos; `palabra-reservada-como-nombre` también responde a `int int x = 5;`.
8. **Estado del producto tras el merge:** solo se ejecuta `System.out.println` de un literal; `main` no sería usable hasta el lote 2.
9. **Revisión de textos del PO (5.11)** pendiente, ahora también para los textos de 1.32 y 1.33.

### Opciones para el PO (con su costo)

- **A. Corregir antes del merge (tarea 1.34; es lo que se hizo en la 1.29, 1.30 y 1.31–1.33).** Modelar A (la sentencia antes del primer `case` es un error de sintaxis: `case, default, or '}' expected`), B (error o, como mínimo, aviso para `args` y `System.in/out/err` usados como valor, y el `IOException` de `System.in.read()`), C (aviso o resolución correcta cuando la clase del alumno se llama como una del JDK) y D (nodo de paréntesis o regla de sentencia-expresión), arreglar el `TypeError` de `CAMPOS_DE_SYSTEM_REFLEJADOS` (`Object.hasOwn` o un `Map`), y SUMAR a las guardas permanentes: los programas mínimos de A–D con su `.oraculo.json` en `corpus/experimentos/` (los dejo en engram) y, como instrumento, la matriz valor × contexto y un fuzzer de tokens junto al generador (y extender la gramática del generador con `args`, `System.in/out/err`, cuerpos de `switch` y paréntesis como sentencia). Costo: una sesión corta, comparable a la 1.32; el arnés ya existe. **Recomendación.**
- **B. Fusionar ahora y hacer de la 1.34 prerrequisito duro del lote 2.** Costo: `main` conserva la frase falsa en esos casos (sin usuarios hoy: no hay Pages) y la renuncia debe quedar escrita en `state.yaml`; el riesgo es que la deuda se erosione.
- **C. Puente:** que `ejecucion-no-disponible` deje de afirmar validez («no sé ejecutar lo que escribiste en la línea N y tampoco puedo confirmar que Java lo acepte»). No arregla el veredicto; solo como puente junto a A o B.
- En cualquier caso: **no subir ni fusionar hasta que el PO decida**, y re-correr el job `oraculo` en GitHub (hay un *flake* conocido, WARNING-1).

---

## Issues encontrados (re-verificación del lote 1, 1.1–1.33)

### CRITICAL (deben resolverse antes de archivar)

1. **Falsos aceptos en 4 familias** (A–D): javac 17.0.18 rechaza y `compilar()` da `ejecucion-no-disponible` («Java sí acepta tu programa…») o, en un caso, `ok`. Incumple REQ-COMP-006, las reglas 4 y 5 de CLAUDE.md y la premisa de la excepción de la 1.30. Evidencia: tabla de familias arriba; instrumento 4 (368 falsos aceptos: 367 con `args`/`System.in/out/err` y 1 de la familia D), instrumento 2 (50, 38 de la familia A y 12 de la B), instrumento 3 (15), focos (64); reproducible con `compilar()` directo; programas mínimos en engram, topic `sdd/visualizador-java/verificacion-independiente-lote1`. Causa en `analizador-sintactico.ts:783-793` (A) y `tipos.ts:249-276` (B).

### WARNING (deberían resolverse)

1. **`npm run test:oraculo` inestable.** 1 corrida completa de 2 falló en `generar-datos.test.ts` (integración): «se leyeron 0 clases y la línea "#total|N" no aparece»; aislada y bajo carga pasa. Mecanismo demostrado: `ejecutar.ts` da 5 s por omisión (`LIMITE_MS_POR_OMISION`) a cada corrida de `java`, `generarDatos` (`generar-datos.ts:346-374`) no pasa `limiteMs` ni mira `agotoTiempo`/`codigoSalida`, y una sonda matada por el límite deja 0 bytes y produce exactamente ese mensaje (lo comprobé con `limiteMs: 150`); el mensaje además culpa al tope de captura. La sonda tarda ≈ 1,3 s sola; no pude reproducir el fallo ni con 12 procesos saturando la CPU, así que la causa disparadora real (carga, JVM en frío, memoria) no está confirmada. Puede tumbar el job `oraculo` del PR.
2. **`compilar()` lanza `TypeError`** con `System.<toString|valueOf|constructor|hasOwnProperty|__proto__|…>` como argumento (`tipos.ts:249` y `:269`: objeto literal indexado por un nombre del alumno); el tramo se documenta como «Pura, nunca lanza» (`tipos.ts:278`). La interfaz lo muestra como `error-interno`, honesto, pero el patrón (tabla `Record<string, …>` indexada con texto del alumno) merece una auditoría.
3. **Falsos rechazos** de la lista de arriba: `instanceof` con patrón, `sealed`, clase anónima, archivos sin clase, `final int A = 'a'; char c = A;`, `(String) "a"` como etiqueta de `case`, `(boolean) true` en asignación definitiva, un cast antes de un literal con aviso, `main` con otra firma, `main(args);`, `public class Random`/`Scanner`, escapes Unicode con significado sintáctico. Violan D2 (la regla de la 1.29) y dos dicen un texto falso («Te falta un punto y coma»).
4. **Precedencia léxico/sintaxis** (abierta de la 1.33): ≈ 1–2 % de los programas con dos fallas muestran primero el error léxico posterior; más `import java.sqrt.*;` y el campo sin `;`.
5. **Jerga del genérico `error-no-clasificado`:** 47,5 % de los errores de mutantes y «token de tipo» en 14,7 %; pendiente de la revisión del PO (5.11).
6. **Evidencia TDD sin tabla de 8 columnas** (heredado) y la 1.29 sin RED literal; en 1.31–1.33 el RED está escrito y reproducido, con dos desviaciones de orden declaradas (tablas de verdad).
7. **C8, brechas:** segundo `Scanner`, `printf` con `%e %x %1$d` y banderas, y patrón no literal siguen en `ejecucion-no-disponible` (plan 2.15).
8. **REQ-SUB-006, «y N más»:** reubicado en la 4.5 (`tasks.md:651`); sin implementar ni probar con N > 0.
9. **Peso:** 302 040 B sin puerta automática (5.9) y con el motor duplicado en `index-*.js` (3.6).
10. **CI remoto de 1.31–1.33 sin correr:** `oraculo.yml` y `ci.yml` no se han ejecutado sobre los seis commits sin subir; localmente cada paso pasa (salvo el *flake*).

### SUGGESTION (mejoras, no bloqueantes)

1. Sumar a las guardas permanentes los programas mínimos de A–D (engram) y, como instrumento de CI, la matriz valor × contexto (3 240 programas, 3 s) y un fuzzer de tokens; extender la gramática del generador con `args`, `System.in/out/err`, cuerpos de `switch` y paréntesis como sentencia; y que el informe del generador cuente los «avisos ante un rechazo de javac» (en mi corpus 13 %, en los mutantes 26 %): es la parte de javac que el visualizador no verifica.
2. `generarDatos`: pasar un `limiteMs` explícito a las sondas del JDK y, cuando una salga vacía, informar `agotoTiempo`, `codigoSalida` y el *stderr* en vez de culpar al tope de captura.
3. `import java.sqrt.*;` y un campo sin `;` dan una línea distinta de la de javac.
4. `openspec/config.yaml` (`context`: «lote 0 en cierre») y la mención de `[x]`/`[ ]` en `CLAUDE.md` (las marcas reales son `✅ hecha`); `state.yaml` `updated: 2026-09-29`.
5. Aserciones débiles heredadas: `pruebas/compilacion/catalogo.test.ts:52` (`adicionales ≥ 0`) y `sobrecargas.test.ts:95` (`not.toBeNull()`).
6. Editor sin nombre accesible (axe, grave, preexistente del lote 0): planearlo en la 5.10 o antes.
7. `REQ-BIB-003` nombra `%e` en su primera frase mientras `REQ-SUB-007` lo excluye (`specs/biblioteca-java/spec.md:56`); aclararlo antes del lote 2.
8. El texto de `palabra-reservada-como-nombre` también responde a `int int x = 5;` y `area double = 5;` (el alumno confundió el orden, no el nombre): revisión del PO (5.11).

---

## Verificación final (re-verificación del lote 1, 1.1–1.33)

- Ejecuté, no solo leí: `npm test`, `test:oraculo` (tres veces: completa, aislada, bajo carga y completa de nuevo), `lint`, `tipos`, `e2e`, `oraculo:verificar`, el generador con las dos semillas pedidas, la cobertura, `licencias`, y regeneré en una copia limpia de `HEAD` los datos del JDK y los 2 625 veredictos de mutantes con javac real (idénticos); reproduje el RED de 1.31, 1.32 y 1.33 contra la producción del commit padre; probé con `limiteMs: 150` el mecanismo del *flake*; consulté `gh` para el PR y el CI.
- Escribí y ejecuté 1 335 programas propios y cuatro instrumentos propios (mutador de 17 operadores, fuzzer de tokens, matriz valor × contexto, ocho focos) contra javac 17.0.18 real: ≈ 105 800 programas, con un compilador por lotes propio validado contra la CLI (0 diferencias en 1 335).
- Leí la Definición de Terminado, el plan y sus fuentes (`spec`, `proposal`, `design`, `state.yaml`), el `oraculo.yml` y `ci.yml`, y contrasté cada afirmación del registro de la 1.31–1.33 con la ejecución.
- No modifiqué código, pruebas, corpus, `tasks.md`, `state.yaml` ni `config.yaml`. Solo agregué esta sección. No hice commit ni push. `git status` limpio salvo este archivo.

**Veredicto final de la re-verificación del lote 1 (1.1–1.33): FAIL por 1 CRITICAL reabierto** (cuatro familias de falsos aceptos que ningún instrumento del equipo ve). Todo lo demás cumple o es WARNING, y el CRITICAL se puede cerrar con una tarea acotada (1.34) o renunciar por escrito; la decisión es del PO.

---

## Verificación final del lote 1 (1.1–1.35)

**Fecha:** 2026-10-03. **Modo:** Strict TDD (inyectado por el orquestador; autoritativo). **Alcance:** las 34 tareas 1.1–1.17 y 1.19–1.35 (la 1.18 no existe, `tasks.md:240`). **Rama:** `feat/lote-1b-sentencias` @ `8bdc70f`, árbol limpio al empezar y al terminar (solo cambia este archivo). 27 commits sobre `main` (1 497 archivos, +49 721/−556); desde la verificación anterior (`ae41ad4`) hay dos más: `1ce43ea` (1.34) y `8bdc70f` (1.35), 742 archivos, +12 797/−475. Los nueve últimos (`52adfdd`…`8bdc70f`) NO están subidos: el PR #2 sigue en `1c8cf5b` (`origin/feat/lote-1b-sentencias`; la rama local va 9 por delante). Todo lo que ensucia (copias del repositorio, árboles temporales para reproducir el RED y los sabotajes, programas, mutantes, scripts) vivió en el *scratchpad* (`…/scratchpad/vf/`); producción y pruebas no se tocaron.

### Veredicto: **FAIL** por la regla de cierre acordada (5 familias de falsos aceptos, CRITICAL por definición; ninguna se alcanza con un error realista de un alumno); todo lo demás, en verde

**Lo bueno, medido.** Las cuatro familias de la verificación anterior (A sentencia antes del primer `case`; B `args` y `System.in/out/err` como valor; C clase del alumno con nombre del JDK; D expresión entre paréntesis como sentencia) y el fallo interno con nombres de `Object.prototype` están **CERRADOS**: 0 falsos aceptos de esas familias en mis 109 programas de regresión y en la matriz valor × contexto, y 0 fallos internos de ningún tipo en los 448 817 programas propios que comparé con javac 17.0.18 real (con gramáticas distintas de las del generador y de los instrumentos de las tareas); los falsos rechazos de la verificación anterior (`instanceof` con patrón, `sealed`/`permits`, clase anónima, archivos sin clase, constantes, `main` con otra firma, `public class Random`) también (45 de 45 programas válidos sin error). `test:oraculo` ya no falla a ratos (dos corridas seguidas, verdes), los mutantes dan 100,00 % / 98,88 % / 89,22 %, y el generador sale con código 0 y 0 discrepancias en la semilla del CI y en una nocturna de 40 000 programas. La **tabla afinada de la 1.35 es honesta**: revisé una por una sus 51 entradas (no solo 15) y las 51 son lo que dicen. La ejecución real (lo único que el lote 1 sabe correr) coincide con Java en 977 de 977 salidas.

**Lo que cambia el veredicto.** Buscando donde nadie había mirado —**el léxico, los bordes del archivo y el plegado de constantes**, no la atribución— aparecen **cinco familias de falsos aceptos** (javac rechaza y `compilar()` da `ok` o `ejecucion-no-disponible`): **C-1** los tres puntos de `String... args` se aceptan aunque no estén pegados (`String . . . args`); **C-2** el retorno de carro suelto `\r` no cuenta como fin de línea; **C-3** `package java.util;` (cualquier paquete exportado del JDK); **C-4** los límites del archivo de clase de javac (una constante de cadena de 65 535 o más caracteres, o de más de 65 535 bytes en UTF-8 modificado, y cerca de 8 200 sentencias en `main`); **C-5** una constante de texto con un `double` (`"a" + 1.5 == "a1.5"`) no se pliega, así que el motor no ve el bucle infinito ni el cuerpo inalcanzable que javac sí ve. Por la regla acordada con el PO («cualquier falso acepto es CRITICAL») son CRITICAL y el lote no cierra.

**Mi lectura honesta del riesgo, para que el PO decida con datos.** Ninguna de las cinco la produce un alumno de bachillerato por un error típico: C-2 es inalcanzable desde la interfaz (CodeMirror normaliza `\r` y `\r\n` a `\n`, lo comprobé), C-3, C-4 y C-5 exigen entradas que nadie escribe, y C-1 exige separar los tres puntos a propósito. Las cinco se cierran con correcciones pequeñas y localizadas (sección «Opciones para el PO»), y la C-5 tiene además su cierre definitivo ya planeado (la 2.4 trae el `Double.toString` real). Además hay una familia de **falsos rechazos alcanzable desde la interfaz** (WARNING alto): los caracteres ignorables de Java dentro de un identificador (espacio de ancho cero `U+200B`, guion blando `U+00AD`, `U+FEFF`…), que se cuelan al copiar y pegar desde una página o un PDF; javac los ignora y el motor dice «No existe una variable llamada "x​y"» con un nombre que se ve igual al correcto.

---

### Resumen de ejecución (cifras reales, ejecutadas por mí)

| Comando | Resultado |
|---|---|
| `npm test` | **3 961 pasan (3 961)**, 66 archivos, 8,6 s, salida 0 (la verificación anterior: 2 692 en 60) |
| `npm run test:oraculo` (Temurin 17.0.18+8), **dos corridas seguidas en reposo** | **28 archivos, 766 pasan + 1 omitida (767)**, 111,9 s y 111,5 s, **salida 0 las dos** (antes: 1.ª corrida con salida 1 por el *flake* de `generar-datos.test.ts`). Con el mismo conteo que reporta `apply-progress` |
| `npm run lint` / `npm run tipos` (4 `tsc`) | salida 0 / salida 0, sin mensajes; el árbol queda limpio tras cada uno (`lint` es `eslint . --quiet`: no corrige nada) |
| `npm run e2e` (construye por su cuenta; 3 motores) | **17 pasan + 1 omitida**, 14,6 s (la omitida es «sin red» en WebKit, límite conocido de Playwright desde el lote 0) |
| Mutantes dentro de `npm test` (C7) | veredicto **2 625/2 625 = 100,00 %** (pide 100 %), línea **2 384/2 411 = 98,88 %** (pide ≥ 95 %), código **2 151/2 411 = 89,22 %** (umbral nuevo 0,88 de la 1.35: cumple) |
| `oraculo:mutantes` (en copia limpia de `HEAD`) | **bytes idénticos** a `corpus/mutantes/veredictos.jsonl` (2 625 mutantes: 214 compilan, 2 411 no), 44,4 s |
| `oraculo:generados`, semilla del CI (`--semilla 20260929 --cantidad 3000 --max-reducir 100`) | **salida 0, 0 discrepancias**; javac compila 1 366 y rechaza 1 634 (45,5 % compila); línea coincide en 908 de 910 (99,78 %) |
| `oraculo:generados`, tamaño nocturno (`--semilla 20261005 --cantidad 40000`) | **salida 0, 0 discrepancias**; compila 18 131 y rechaza 21 869 (45,3 %); línea 12 244 de 12 264 (99,84 %); 352 s (con la CPU compartida) |
| `oraculo:verificar` y `oraculo:datos` (en copia limpia de `HEAD`, sin tocar el repo) | `oraculo:verificar`: salida 0 (138 s), «423 programas, goldens idénticos a una regeneración real contra Temurin 17.0.18»; `oraculo:datos`: salida 0 (4,3 s), 755 firmas, 25 tipos, 4 477 clases en 226 paquetes, 54 palabras reservadas; los 7 `*.generado.ts` y `corpus/datos/**` regenerados son **byte a byte idénticos** a los confirmados (`cmp` y `diff -r`) |
| Cobertura (informativa; v8, a un directorio del scratchpad) | global: líneas 97,30 %, ramas 93,99 %, funciones 97,51 %, sentencias 96,30 %. Los 23 archivos de producción cambiados por 1.34 y 1.35 que reporta promedian **98,51 %** de líneas y **95,34 %** de ramas (el menor, `semantica/constantes.ts`: 85,62 %, son 24 líneas de brazos del plegado sin ninguna prueba —`long` con `-`, `*`, `/`, `%`; `double` con `-`, `*`, `%` y comparaciones; `==` y `!=` de `boolean`; saturación de `(int)` y `(long)` sobre un `double`—; después `alcance.ts` 90,47 %, dos `throw` de invariantes internas; tabla completa en «Cobertura de los archivos cambiados») |
| Peso (`dist/` del E2E, `gzip -9`) | `index-*.js` 248 865 B + `trabajador-*.js` 61 501 B = **310 366 B** (303,1 KiB; 62,1 % de 500 KB). `npm run presupuesto` sigue sin existir (`herramientas/presupuesto-tamano.ts`, tarea 5.9) |
| `npm run licencias`; dependencias | 9 de 9 permisivas; `package.json`, `package-lock.json` y `.nvmrc` sin cambios respecto a `main` |

Hay un hecho de entorno que conviene saber: durante toda la verificación otra sesión de Claude (proyecto *Rivet*, ver `lsof` de los procesos `yes`) dejó 24 procesos `yes` huérfanos que mantuvieron la carga de la máquina entre 130 y 240; no son míos y no los toqué. Solo afecta a los tiempos de mis campañas (las cifras de `test:oraculo` y de `npm test` de arriba se midieron antes de que aparecieran), no a los veredictos.

---

### Mutantes, métrica de código y «tabla afinada» de la 1.35

Los 2 625 veredictos se regeneraron con javac real y son idénticos a los versionados. El código pasa de 87,10 % (2 100/2 411: lo que ya daban 1.34 y el puerto de los casts) a 89,22 % **solo** porque la prueba acepta 51 mutantes cuyo código nuestro es «más preciso» que el de la tabla de claves de javac (`CODIGOS_MAS_PRECISOS_QUE_EL_DE_JAVAC`, `pruebas/compilacion/mutantes.test.ts:218-276`). Sin esa tabla el umbral 0,88 no se cumpliría, así que su honestidad es lo que importa. **La audité entera, entrada por entrada** (script `tabla-afinada.mjs`: para cada una, el texto que vería el alumno frente a la línea mutada y al mensaje de javac), no solo las 15 pedidas:

| Grupo (código nuestro ← clave de javac) | Entradas | Misma línea que javac | ¿El texto describe el error real? |
|---|---|---|---|
| `sentencia-entre-parentesis` ← `not.stmt` | 10 | 10/10 | **Sí**: «Una instrucción completa… se escribe sola, sin paréntesis… Si lo que querías era una condición, te falta `if`, `while` o `switch` antes del paréntesis» sobre `(numero < 0) {`, `} else (calificacion >= 80) {`, `( switchopcion) {`. En 4 de ellas (`( ifnumero …`) el `if` existe pero pegado al nombre: el consejo sigue apuntando al lugar correcto |
| `palabra-reservada-como-nombre` ← `not.stmt` | 31 | 31/31 | **Sí en lo que dice** («`int` es una palabra reservada… no se puede usar como nombre de una variable»: es lo que la gramática ve en `int int edad = 20;`, `numero int = …`, `double final IVA`); el consejo «Elige otro nombre» **no arregla** el error real (sobra o está invertido el tipo): SUGGESTION de texto para la revisión 5.11, ya anotada por la 1.35 |
| `importacion-no-reconocida` ← `doesnt.exist` | 7 | 7/7 | **Sí**: «No reconozco "util.util.Scanner" como algo que se pueda importar… como "java.util.Scanner"» |
| `sentencia-antes-del-primer-case` ← `expected3` | 1 | 1/1 | **Sí**: `switch (diaSemana) { {` → «esta instrucción quedó antes del primer `case`» |
| `sentencia-inalcanzable` ← `unreachable.stmt` | 1 | 1/1 | **Sí**: `break; ;` → «Esta línea nunca se ejecuta.» |
| `selector-de-switch-invalido` ← `preview.feature.disabled.plural` | 1 | 1/1 | **Sí**, y mejor que javac: «El valor de un "switch" debe ser "int", "char" o "String", no "long".» frente a una queja de patrones en vista previa |
| **Total** | **51** | **51/51** | las 51 son el código y la línea que declara la tabla (la prueba lo exige) y ninguna miente |

Los grupos que la tabla **deja fuera** (`falta-parentesis-cierre` 40, `llave-de-clase-faltante` 39, `llave-de-metodo-faltante` 34, `fin-de-archivo-inesperado` 17, `else-sin-if` 2…) están nombrados con su razón en el comentario de cabecera, y las cuentas cuadran (según la propia prueba 312 mutantes difieren de la clave de javac; 51 se aceptan; quedan 261, y un mutante más lo arregló el puerto de los casts: 2 411 − 2 151 = 260 fuera). Juicio: **honesta**; el método es el correcto (código más específico que el cubo genérico, en la misma línea, con texto verdadero), no mueve el veredicto ni la línea y deja a la vista lo rechazado. Una observación de diseño (SUGGESTION): la tabla se indexa por identificador de mutante (`archivo.java#N`); la prueba comprueba que cada entrada exista y coincida, así que regenerar el corpus no la deja muerta en silencio, pero cualquier cambio de la semilla de `mutantes.ts` obligaría a rehacerla a mano; una tabla por (clave de javac → códigos aceptables) con la misma auditoría sería más estable.

---

### Búsqueda independiente de falsos aceptos y falsos rechazos

**Método.** Nada de lo de abajo usa el generador del repositorio, su `CompiladorEnLote.java`, ni los instrumentos de las tareas, y escribí instrumentos nuevos con gramáticas distintas de los del verificador anterior (cuyo mutador, fuzzer y matriz ya corrió el equipo en cero): (1) **1 695 programas a mano** en 21 archivos (U3–U7, errores típicos de bachillerato, combinaciones de dos y tres construcciones, 20 programas largos de 30–60 líneas, comentarios y espacios raros, `Scanner` con varias lecturas, ciclos anidados con `break`/`continue`, `switch` dentro de ciclos, el catálogo de `String` entero, conversiones en expresiones compuestas, estructura de clases y modificadores, artefactos de copiar y pegar, una clave de error de javac por programa); (2) un **mutador propio** (≈ 45 operadores semánticos, sintácticos y de equivalencia, de 1 a 3 por mutante) sobre 52 semillas largas, 640 cortas y 600 programas largos que genera mi **generador propio** de válidos (8–38 sentencias, anidamiento hasta 4, asignación definida y flujo a propósito); (3) una **matriz carácter × posición** sobre TODO el BMP; (4) las **clases e importaciones de todo el JDK** (26 814 clases del `jrt:/`); (5) una **matriz valor × contexto** propia (199 valores × 114 contextos); (6) una matriz de **escapes `\uXXXX`**; (7) un **fuzz de separadores** (cada frontera de token × 18 separadores, con `NBSP`, `ZWSP`, `U+FEFF`, `NUL`, `U+001A`…); (8) sondas de **límites y rendimiento**; (9) la **ejecución real**: compilé y corrí con Java 3 000 programas de `println` de literales y comparé la salida con la que da el motor; (10) **1 170 programas dirigidos a lo que `npm test` no ejecuta** (cobertura v8 de los 23 archivos que tocaron 1.34 y 1.35: los brazos sin cubrir del plegado de constantes de `long`/`double`/`boolean`, `char` en sus fronteras 0/65 535/65 536, condiciones constantes de `while`/`do`/`for` y ternarios con todos los tipos de operando, variables constantes y `final` en blanco, y las líneas de error del léxico y de la sintaxis que ninguna prueba toca): de ahí salió C-5. Para compilar en lote usé la API `JavaCompiler` del JDK en una JVM (nombre de archivo = clase pública), igual que la CLI. **Falso acepto (CRITICAL)** = javac rechaza y `compilar()` da `ok` o `ejecucion-no-disponible`; **falso rechazo** = javac compila y `compilar()` da error (dentro del subconjunto: WARNING alto); **fallo interno** = `compilar()` lanza; un aviso ante un rechazo de javac es honesto y no cuenta.

| Instrumento (propio) | Programas | javac compila / rechaza | Falsos aceptos | Falsos rechazos | Fallos internos | Línea igual cuando ambos rechazan |
|---|---|---|---|---|---|---|
| A mano (21 archivos, c01–c24) | 1 695 | 582 / 1 110 | **8** (CR 7, `package` 1) | 3 (CR 2, `U+001A` 1) | 0 | 973/979 |
| Carácter × posición, muestra de 106 caracteres × 21 posiciones | 2 226 | 762 / 1 464 | 0 | 138 (ignorables) | 0 | 1 459/1 461 |
| **Todo el BMP × 3 posiciones** | 190 257 | 49 083 / 141 174 | 0 | 97 (ignorables) | 0 | **141 174/141 174** |
| Importaciones de **todas** las clases y paquetes del JDK | 24 044 | 4 703 / 19 341 | 0 | 0 | 0 | 19 341/19 341 |
| Matriz valor × contexto (199 × 114) | 22 686 | 6 566 / 16 091 | 0 | 0 | 0 | 13 759/13 759 |
| Escapes `\uXXXX` × 15 posiciones | 495 | 153 / 342 | 0 | 0 | 0 | 89/89 |
| Mutador propio, tanda 1 (semántico, sintáctico, equivalencia) | 39 156 | 17 582 / 21 574 | 0 | 133 (ignorables 117, CR 16) | 0 | 19 935/20 526 |
| Mutador propio, tanda 2 (sin las familias conocidas) | 94 848 | 31 518 / 63 327 | **1** (C-1) | 0 | 0 | 58 718/59 849 |
| Generador propio de válidos largos | 600 | 600 / 0 | — | 0 | 0 | — |
| Mutador sobre esos 600 (1 falla cada uno) | 24 600 | 6 310 / 18 290 | 0 | 0 | 0 | 16 105/16 706 |
| Fuzz de separadores (cada frontera × 18) | 46 872 | 26 362 / 20 510 | **16** (C-1) | 4 306 (ignorables) | 0 | 20 494/20 494 |
| Límites y rendimiento (incluye la frontera exacta de las constantes de cadena) | 84 | 59 / 25 | **15** (C-4) | 0 | 0 (1 *timeout*) | 8/8 |
| Sondas de puntos, `...` y `package` | 84 | 27 / 56 | **28** (C-1 8, C-3 20) | 0 | 0 | 29/29 |
| Plegado de constantes y líneas sin cubrir (c25–c30, 6 archivos) | 1 170 | 525 / 645 | **25** (C-5) | 8 (W-10) | 0 | 405/405 |
| **Total comparado con javac** | **448 817** | **144 832 / 303 949** | **93, todos en las 5 familias C-1…C-5** | **4 685, todos en 4 familias (3 léxicas y la de C-5)** | **0** | **292 489/294 820 (99,21 %)** |
| Ejecución real (`ok` del motor frente a Java) | 3 000 | 1 111 `ok` | 0 | — | — | 977 salidas idénticas byte a byte + 134 errores de arranque del mismo tipo + 0 distintos |

Lecturas que no cambian el veredicto pero conviene tener: (1) los **falsos aceptos son 93 y caen todos en C-1…C-5** (C-1: 25, C-2: 7, C-3: 21, C-4: 15, C-5: 25); no hay un solo falso acepto de sentencias, tipos, sobrecargas ni biblioteca, y el de flujo es solo el de C-5, en 303 949 rechazos de javac; (2) los **falsos rechazos (4 685) son una sola familia de fondo** —los caracteres ignorables (4 658)— salvo 19 del `\r` suelto y del `U+001A` y 8 de la familia de C-5 (W-10); (3) **0 fallos internos** en 448 817 programas (el `TypeError` con nombres de `Object.prototype` de la verificación anterior no vuelve: 45 programas de regresión y toda la matriz; y los anidamientos de 100 a 3 000 niveles de llaves, paréntesis, `else if`, `&&`, negaciones y casos de `switch`, o de 20 a 400 ciclos anidados, compilan sin lanzar nada); (4) la **ejecución** de lo que el lote 1 sabe correr (`main` con solo `println` de literales) coincide con Java real en 977 de 977 salidas, con 45 escapes (`\0`, `\1`–`\377`, `\s`, `\b`, `\f`, `\r`…), 40 literales raros (emoji, `NUL`, separadores de línea, dos unidades UTF-16, combinantes) y 22 formas de clase y de `main`; los 134 `main` sin `static`, sin `public`, ausentes o en una clase llamada `String` dan el mismo error de arranque que el lanzador de Java; (5) **la métrica de línea** en mis tres campañas de mutación (97,1 %, 98,1 % y 96,4 %; 97,6 % juntas: 94 758 de 97 081) está por debajo de la del generador (99,8 %) porque mis mutantes rompen la estructura a propósito y muchos tienen DOS errores a la vez; ver W-6.

---

### CRITICAL: cinco familias de falsos aceptos (javac rechaza, `compilar()` da `ok` o `ejecucion-no-disponible`)

Los hallé con instrumentos de otra gramática que los de las tareas: un mutador que inserta comentarios entre tokens, un fuzz que pone 18 separadores en CADA frontera de token, una matriz carácter × posición sobre todo el BMP, sondas dirigidas a bordes de archivo y límites de javac, y sondas dirigidas a las líneas de decisión que `npm test` no ejecuta. Cada programa mínimo se compiló con javac 17.0.18 real (API `JavaCompiler`, validada: el mismo veredicto que la CLI en mi corpus) y con `compilar()` del repositorio. Notación: `⟪CR⟫` = retorno de carro suelto (U+000D).

**C-1. Los tres puntos de `String... args` se aceptan aunque no estén pegados.** javac: `illegal '.'` o `<identifier> expected`; `compilar()`: `ok` (el programa se «ejecutaría»).
- Mínimos: `public class P { public static void main(String . . . args) { System.out.println("x"); } }` y las variantes `String.. .args`, `String. ..args`, `String./**/.. args`, `String.. ./**/args`, `String.⏎.. args` (salto de línea), `String.  .  . args`. 8 de las 26 variantes que probé; el fuzz de separadores dio 16 casos (las dos fronteras de `String...` × 8 separadores) y el mutador de equivalencia 1 (`String./*⏎*/.. args`, un comentario que insertó entre los puntos). `String.. args` y `String .... args` sí se rechazan.
- Causa: `src/motor/sintaxis/analizador-sintactico.ts:386-390` (`String... args — el lexer no tiene un token "...": son tres "." seguidos`) y `:327` (`esFirmaDeMainDelLanzador`) leen tres tokens `.` consecutivos **sin comprobar que sean adyacentes** (que `rango.fin` de uno sea el `rango.inicio` del siguiente).
- Alcance real: se alcanza desde la interfaz (no hay normalización de espacios), pero exige escribir los tres puntos separados a propósito (o que una herramienta de formato los parta); un error típico de alumno (`String.. args`, `String... args` con un punto de más) SÍ se rechaza.
- Corrección propuesta (≈ 5 líneas + prueba): exigir adyacencia de los tres puntos en `analizarParametroDeMain` y en `esFirmaDeMainDelLanzador`; sumar `String . . . args` y las 7 variantes a `pruebas/compilacion/` con goldens.

**C-2. El retorno de carro suelto `\r` no es fin de línea (JLS 3.4).** javac lo cuenta como terminador (`\r`, `\n` y `\r\n`); el léxico del motor solo `\n`.
- Mínimos (cuerpo de `main`): `char c = '⟪CR⟫';`, `String s = "a⟪CR⟫b";`, `String s = "a⟪CR⟫";`, `String s = "⟪CR⟫";` (javac: `unclosed string literal` / `illegal line end in character literal`; motor: `ejecucion-no-disponible`) e `int x = 1; // uno⟪CR⟫int y = 2` (el `;` que falta quedó DENTRO del comentario que el motor no cierra: javac `';' expected`; motor `ejecucion-no-disponible`). 6 de las 20 formas de `c20-cr` son falsos aceptos; el resto de las 20 coincide, y los números de línea de un archivo con `\r` solo o con `\n\r` salen mal (ver abajo).
- Causa: `src/motor/lexico/analizador-lexico.ts:115` trata `\r` como espacio en blanco; `:122` cierra el comentario `//` solo en `\n`; `src/motor/lexico/literales.ts:160` y `:243` cierran cadenas y `char` solo en `\n`; `src/motor/fuente/tabla-de-lineas.ts:10` numera líneas solo con `\n`.
- Alcance real: **inalcanzable desde la interfaz**. `EditorJava.tsx:44,80` toma `state.doc.toString()` y CodeMirror 6.7.6 parte el texto en `\r\n?|\n` y lo vuelve a unir con `\n` (`EditorState.create({ doc: "char c = '\r';" }).doc.toString()` da `"char c = '\n';"`, probado). Solo un llamado directo a `compilar()` (pruebas, generador, un enlace compartido que no pase por el editor) puede llevar un `\r`.
- Corrección propuesta: en el léxico, `\r`, `\r\n` y `\n` terminan línea (cadenas, `char`, comentarios `//`) y `TablaDeLineas` cuenta los tres; o normalizar a `\n` al entrar en `compilar()` (una línea) y documentarlo.

**C-3. `package <paquete exportado del JDK>;` se acepta.** javac: `package exists in another module: java.base` (también `java.desktop`, `java.sql`, `java.xml`, `jdk.httpserver`, `jdk.unsupported`…). `compilar()`: `ok`.
- Mínimo: `package java.util;⏎public class P { public static void main(String[] args) { } }`. 20 de 38 nombres sondeados fallan (`java.lang`, `java.io`, `java.net`, `java.awt`, `java.sql`, `java.nio.file`, `javax.swing`, `javax.crypto`, `org.w3c.dom`, `org.xml.sax`, `org.ietf.jgss`, `com.sun.net.httpserver`, `jdk.net`, `jdk.jfr`, `sun.misc`, `java.util.concurrent`, `java.util.function`, `java.lang.invoke`, `java.util.logging`, `java.util`); javac compila `java`, `javax`, `jdk`, `sun`, `com.sun`, `aula.java`, `java.utils`, `Java.util` y los internos no exportados (`jdk.internal.misc`, `sun.nio.ch`).
- Causa: `REQ-SUB-001` («`package` se ignora», `openspec/changes/visualizador-java/specs/subconjunto-java/spec.md:17-20`) se cumple al pie de la letra; nadie comprueba el nombre. El motor ya sabe la respuesta: `src/motor/semantica/catalogo-clases.ts:49-51` (`existePaqueteOTipoDelJdk`: `clasesDelPaquete(nombre).size > 0 || existeClaseDelJdk(nombre)`; para un `package` basta la primera mitad) coincide EXACTAMENTE con la regla de javac (las 226 paquetes exportados con tipos; `java` y los internos no cuentan).
- Alcance real: nulo para un alumno (nadie declara `package java.util;`); el texto del escenario de REQ-SUB-001 ni siquiera lo contempla, pero choca con REQ-COMP-006.
- Corrección propuesta: error en la línea del `package` si `clasesDelPaquete(nombre).size > 0`, con texto propio («Ese paquete ya existe en Java: elige otro nombre»).

**C-4. Límites del archivo de clase de javac.** (a) `compiler.err.limit.string` («constant string too long»): una constante de cadena de **65 535 o más caracteres** (`"a"` × 65 534 compila, × 65 535 y × 65 536 fallan; también cuando la constante se forma por concatenación, `"…40 000…" + "…40 000…"`, o por una variable `final`; la misma concatenación con una variable que NO es constante, `a + a`, compila); (b) `compiler.err.limit.string.overflow` («UTF8 representation for string … is too long for the constant pool»): una constante de **más de 65 535 bytes en UTF-8 modificado** (`é` × 32 767 compila y × 32 768 falla; `€` × 21 845 compila y × 21 846 falla; `😀` × 10 922 compila y × 10 923 falla, porque cada una pesa 6 bytes; `\0` × 32 767 compila y × 32 768 falla, 2 bytes cada una, aunque ahí el motor ya da su aviso de escape octal); (c) `compiler.err.limit.code` («code too large»): 9 000 y 20 000 sentencias `System.out.println("x");` en `main` fallan; 8 000 compila. `compilar()`: `ejecucion-no-disponible` en los tres. 15 programas de mis campañas (5 de las sondas de límites y 10 de la frontera exacta).
- Alcance real: nulo (ningún programa de curso tiene cadenas de 64 KB ni miles de `println`). Junto con C-5, es el que no tiene una corrección de pocas líneas para su tercera parte: el límite de código depende del tamaño del bytecode que el motor no genera.
- Corrección propuesta: error específico para una constante de cadena con `length ≥ 65 535` o con más de 65 535 bytes en UTF-8 modificado (NUL = 2 bytes, cada unidad UTF-16 suplementaria = 3 bytes), calculado sobre cada literal y sobre cada constante plegada; registrar el límite de código como **fuera de alcance documentado** en `design.md` (o un aviso a partir de un número prudente de sentencias en un mismo método).

**C-5. Una constante de texto con un `double` no se pliega, y eso cambia la alcanzabilidad.** javac: `unreachable statement`; `compilar()`: `ejecucion-no-disponible` («Tu programa pasó todas mis revisiones…»).
- Mínimos (cuerpo de `main`): `while ("a" + 1.5 == "a1.5") { }` seguido de `System.out.println("x");`; `final String K = "a" + 1.5; while (K == "a1.5") { } System.out.println("x");`; `final boolean B = "a" + 1.5 == "a1.5"; for (; B; ) { } System.out.println("x");`; `do { } while ("a" + 1.5 == "a1.5"); System.out.println("x");` y el cuerpo de un bucle que nunca corre, `while ("a" + 1.5 != "a1.5") { System.out.println("nunca"); }`. 25 programas con 5 condiciones (`"a" + 1.5 == "a1.5"`, `"a" + 1.5 != "a1.5"`, `"" + 1.0 == "1.0"`, `"a" + 1.5 == "a" + 1.5`, `1.5 + "a" == "1.5a"`) en `while`, `do`, `for` y con la condición en una variable `final`. Con el mismo cuerpo, las otras 65 condiciones de las 70 que probé (`int`, `long`, `char`, `boolean`, `double` con comparaciones, `NaN` e infinitos, `String` sin `double`, casts y constantes de la biblioteca: 585 de los 630 programas) coinciden con javac: es SOLO el texto con `double`.
- Causa: `src/motor/semantica/constantes.ts:32-37` y `:178-180` («Deuda 3», commit `999a8ca`): para no inventar el texto de un `double` (el `Double.toString` real llega con la 2.4), `plegarBinaria` devuelve `null` —«no es constante»— para CUALQUIER concatenación con un operando `double`. Para javac esa expresión SÍ es constante (JLS 15.29) y de ella dependen la alcanzabilidad de un bucle, la asignación definitiva y las etiquetas `case`; el motor confunde «no sé calcularla» con «no es constante» y responde como si lo supiera. Es el mismo defecto de fondo que la 1.34 cerró para los **tipos** desconocidos («cerrar por defecto»), en otra dimensión: el **valor constante** desconocido.
- Contra-lado, misma causa, **falsos rechazos** (ver W-10): 6 programas válidos dan error.
- Alcance real: nulo para un alumno (comparar con `==` cadenas armadas con un `double` literal, y que eso decida un bucle).
- Corrección propuesta (RED con los 31 programas: los 25 de arriba y los 6 de W-10, con goldens del oráculo): (a) ya, ≈ 20 líneas: que `plegarBinaria` distinga «no es constante» de «es constante de valor desconocido» (un tercer estado) y que alcanzabilidad, asignación definitiva, `case` y el tipo de la condición respondan con un **aviso honesto** («No disponible: usas una constante con un `double` convertido a texto») en vez de decidir; (b) la 2.4 trae el `Double.toString` real y retira el *stub*, pero su propio RED admite «100 % por conjunto denso **o aviso**», así que el tercer estado hará falta de todos modos: que la 2.4 sume estos 31 programas a su RED.

Todo lo demás que probé NO produjo un falso acepto: ver la tabla de instrumentos. Es útil notar cómo se repartieron: C-1 y C-2 salieron de 60 000 variantes de separadores y de comentarios entre tokens; C-3 y C-4 de sondas dirigidas a «lo que el motor deja pasar por especificación» (`package`) y «lo que javac mide y el motor no» (los límites); C-5 de leer **qué líneas de decisión no ejecuta `npm test`** y qué *stubs* deliberados hay en `src/motor` (un solo `grep` de «stub», «hasta que la tarea», «deuda» da una lista corta: el único con efecto sobre un veredicto es éste). Ninguna salió de la gramática de sentencias, tipos o biblioteca, que es donde se concentraron las cuatro familias anteriores.

---

### WARNING alto: falsos rechazos alcanzables desde la interfaz

**W-1. Los caracteres ignorables de Java dentro de un identificador o de una palabra clave se toman como parte del nombre.** javac (`JavaTokenizer.scanIdent`) salta los caracteres para los que `Character.isIdentifierIgnorable` es verdadero cuando arma el nombre; el motor los deja dentro y el nombre ya no coincide con el escrito sin ellos.
- Mínimos (`⟪U+200B⟫` = ese carácter, invisible, insertado en ese punto; javac compila todos; `compilar()` da error en la línea 4 o la que corresponda): `int a⟪U+200B⟫b = 1; System.out.println(ab);` («No existe una variable llamada "ab"»: el nombre que muestra lleva el carácter invisible y se ve idéntico al otro), `System.out.pri⟪U+200B⟫ntln("x");` («"PrintStream" no tiene ningún método llamado "pri​ntln()"»), `i⟪U+200B⟫nt x = 1;` («No reconozco el tipo "i​nt"»), `Sys⟪U+200B⟫tem.out.println("x");`.
- El conjunto es exactamente el de `Character.isIdentifierIgnorable` en el BMP, **97 puntos de código**: `U+0000–0008`, `000E–001B`, `007F–009F`, `00AD`, `0600–0605`, `061C`, `06DD`, `070F`, `08E2`, `180E`, `200B–200F`, `202A–202E`, `2060–2064`, `2066–206F`, `FEFF`, `FFF9–FFFB`. Los caracteres suplementarios de la misma categoría (`U+E0001`…) javac los trata como parte del nombre y coinciden.
- Evidencia: la matriz carácter × posición sobre TODO el BMP (190 257 programas) da 97 falsos rechazos y 0 falsos aceptos —solo en «en medio de un identificador»; todo el resto del Unicode es idéntico a javac, con 141 174 rechazos en la MISMA línea (la tabla de letras de Unicode 13 es exacta)—; el fuzz de separadores da 4 306 casos, todos con `ZWSP`, `U+FEFF`, `NUL`, `U+001A` o el guion blando pegados a un identificador; `NBSP`, `U+2003`, `U+3000`, `U+2028` y `VT` los rechazan igual javac y el motor en TODAS las fronteras (sin un solo falso acepto).
- Por qué importa: se alcanza copiando y pegando desde una página web, un PDF (guion blando de fin de renglón) o una aplicación de mensajes; el alumno ve «No existe una variable llamada "x"» sobre una variable que SÍ declaró y que se ve igual, mientras NetBeans compila su código. D2 («un programa válido nunca sale como error») y el principio de la 1.35 piden modelar la regla.
- Causa: `biblioteca/datos/identificadores-java.generado.ts` (`PARTE_DE_IDENTIFICADOR_JAVA` incluye esos puntos, como `Character.isJavaIdentifierPart`) y `src/motor/lexico/analizador-lexico.ts:253-263` arma el texto del identificador (`fuente.slice(inicio, cursor)`) con ellos dentro y lo busca tal cual entre las palabras clave.
- Corrección propuesta (≈ 5 líneas + prueba con los 97 puntos): al armar el texto del identificador, descartar los puntos ignorables (conservando el `rango`) antes de buscarlo en las palabras clave. Propuesta de tarea: la misma 1.36 de las CRITICAL.

**W-2. Dos bordes del archivo más (inalcanzables desde la interfaz o irrelevantes hoy).** (a) El comentario `//` que debía cerrar un `\r` suelto se traga la línea siguiente: `int x = 1; // fin⟪CR⟫int y = 2;` da `error-no-clasificado` («se esperaba una expresión y se encontró "<fin de archivo>"») aunque javac lo compile (misma causa que C-2). (b) `U+001A` (Ctrl-Z, el fin de archivo de MS-DOS) al final del archivo: javac lo lee como fin de entrada y compila; el motor dice «carácter no reconocido». Propuesta: la misma corrección de C-2 y tratar `U+001A` como fin de entrada.

**W-10. Falsos rechazos de la misma causa que C-5: constantes de texto con un `double` (6 programas).** javac los compila; `compilar()` da error. (a) `String s = "d1.5"; switch (s) { case "d" + 1.5: break; default: break; }`, `final String K = "d" + 1.5; … case K:` y `case "a" + (double) 1:` → «Cada "case" necesita un valor fijo (constante), no una variable ni un cálculo» (`etiqueta-de-case-no-constante`); (b) asignación definitiva: `int x; if ("a" + 1.5 == "a1.5") x = 1; System.out.println(x);`, `int x; while ("a" + 1.5 == "a1.5") { x = 1; break; } System.out.println(x);` y la forma con `final boolean B` → «La variable "x" podría no tener un valor asignado» (`variable-posiblemente-no-asignada`), cuando para javac la condición es constante `true` y `x` sí queda asignada. Fuera del currículo U3–U7 (nadie arma una etiqueta `case` con un `double`), de ahí WARNING y no WARNING alto; **D2 pide un aviso honesto en vez de un error**. Misma causa y misma corrección que C-5.

---

### WARNING heredados que siguen abiertos (todos planeados en lotes posteriores)

- **W-3. Jerga de `error-no-clasificado`** (REQ de textos, DoD §13.4). Sobre los 2 411 mutantes que javac rechaza: `error-no-clasificado` es el **47,0 %** (1 133; antes 47,5 %), «token» aparece en 354 textos (**14,7 %**, igual que antes: «se esperaba un token de tipo "identificador" y se encontró ")"»), 0 restos de interpolación o de JavaScript. Pendiente de la revisión de textos del PO (5.11) y del afinado de `falta-parentesis-cierre`/`llave-*`.
- **W-4. Evidencia TDD sin tabla.** `apply-progress` (#568) sigue sin la tabla de 8 columnas por tarea; lo compensan los registros literales de `tasks.md` (1.34: 10 ciclos RED con su conteo; 1.35: 25) y yo reproduje el RED de las dos tareas (sección TDD): **cumple el espíritu, no el formato**.
- **W-5. Brechas de C8** (heredadas de la verificación 1.1–1.30): con mis 14 sondas, el segundo `Scanner` y `printf` con `%e`, `%x`, `%g`, `%o`, `%h`, `%tY`, `%1$d`, las banderas `+`, `(`, `#` y espacio, y un patrón que no es literal siguen dando `ejecucion-no-disponible` («pasó todas mis revisiones, pero todavía no sé ejecutar…») en vez de su aviso propio. Hoy el texto es honesto; el aviso propio es de la 2.15.
- **W-6. Precedencia léxico/sintaxis y otras diferencias de línea (ambos rechazan, solo cambia la línea).** En mis tres campañas de mutación la línea coincide en el **97,6 %** de los rechazos (94 758 de 97 081; por campaña 97,1 %, 98,1 % y 96,4 %; 2 323 diferencias), en el **99,21 %** del total de mis 294 415 rechazos comparados (2 331 diferencias, solo 8 fuera de las campañas de mutación) y en el 99,78–99,84 % de las campañas del generador; C7 pide ≥ 95 % sobre sus 2 411 mutantes de un token y da 98,88 %. De las 2 323 diferencias, las 1 820 que guardé con detalle se reparten así: **870 (48 %)** un `expected`/`expected2` de javac que el motor da como `error-no-clasificado` (719 de ellas a una sola línea: javac ancla «falta algo» al final del token anterior y el motor al inicio del siguiente); **424 (23 %)** un `else` suelto (javac informa primero lo que sigue al `else`, p. ej. `illegal start of statement`; el motor, `else-sin-if` una línea antes); **139 (8 %)** `fin-de-archivo-inesperado` donde javac vio antes `illegal start of expression`; **77 (4 %)** un error léxico posterior (`cadena-sin-cerrar`) que gana a un error de sintaxis anterior porque `tokenizar` lee todo antes de la sintaxis; el resto, grupos de menos de 50. En conjunto el 68 % de las diferencias es de **una** línea, el 9 % de 2–3, el 12 % de 4–10 y el 11 % de más de 10. Los ejemplos mínimos son programas con **dos** errores a la vez (p. ej. `char c = '';` más `Public static void main(…)`: javac dice «`<identifier>` expected» en la línea 2, el motor el `char` vacío de la 3), donde «cuál es el primer error» depende del orden de las pasadas. Nunca cambia el veredicto (0 falsos aceptos por esta causa). La 1.33 y la 1.35 ya la declaran abierta y «candidata a tarea propia» (`tasks.md:436` y `:527`); la propongo como tarea (ver «Opciones para el PO»).
- **W-7. Peso.** 310 366 B gzip (62,1 % del presupuesto; +7 000 B desde la 1.33), sin puerta automática (`herramientas/presupuesto-tamano.ts`, 5.9) y con el motor duplicado por `cliente.ts` (3.6, `tasks.md:690`).
- **W-8. El CI remoto de lo nuevo no corrió.** Los 9 commits `52adfdd`…`8bdc70f` no están subidos; el PR #2 sigue en `1c8cf5b` con `ci` y `oraculo` verdes sobre ESE SHA. Todo lo que hace `oraculo.yml` (`test:oraculo`, `oraculo:verificar`, `oraculo:datos`, `oraculo:generados` con semilla fija, y de noche `oraculo:mutantes` y 40 000 programas) lo corrí a mano con resultado verde; falta correrlo en GitHub tras el `push`.
- **W-9. «y N más»** (REQ-SUB-006): el motor calcula `adicionales`; la UI y su prueba con N > 0 son de la 4.5 (`tasks.md:737` y `:742`).

---

### SUGGESTION

- **S-1. Rendimiento cuadrático con las declaraciones locales de un mismo bloque**: 1 000 → 63 ms, 2 000 → 0,73 s, 4 000 → 2,6 s, 5 000 → 4,6 s, 20 000 → más de 60 s (mi vigilante la mató); 1 000 asignaciones o 4 000 `println` seguidos, 3 000 bloques o paréntesis anidados, 3 000 `else if`, 3 000 casos de `switch`, 400 ciclos anidados: sin problema. Irrelevante para un programa de clase; conviene que `Alcance` no copie arreglos al declarar.
- **S-2. Consejo de `palabra-reservada-como-nombre`** en `int int edad = 20;` y `numero int = …`: «Elige otro nombre» no arregla el error real (sobra o está invertido el tipo); 31 de las 51 entradas de la tabla afinada. Texto para la 5.11.
- **S-3. Conteos y estado del plan desactualizados**: `tasks.md` «Resumen por lote» dice lote 1 = 32 tareas y total 119 (hay 34 hechas en el lote 1, 1.18 no existe, y 121 en total); `CLAUDE.md` repite «119 tareas»; `state.yaml` sigue en `updated: 2026-09-29` y su `apply` termina en la 1.33 (no recoge la 1.34, la 1.35 ni esta verificación; **no lo toqué**, es del orquestador); `openspec/config.yaml` `context` dice «lote 0 … en cierre — tareas 0.1-0.15 hechas».
- **S-4. `CLAUDE.md:53` dice «lint … (autofix: eslint . --fix)»**; `package.json` define `"lint": "eslint . --quiet"` desde el andamiaje (`6260a3a`): no corrige nada. (Y `apply-progress` repite el error como «gotcha».)
- **S-5. `REQ-BIB-003`** (`openspec/changes/visualizador-java/specs/biblioteca-java/spec.md:56`) nombra `%e` en lo que MUST construir y lo excluye en la lista de soportados.
- **S-6. El editor sigue sin nombre accesible** (`src/interfaz` sin cambios desde `52adfdd`; 5.10).
- **S-7. `esCastPermitido` no tiene prueba unitaria directa**: un sabotaje que acepta cualquier par de tipos sobrevive en `tipos.test.ts` (70 pruebas) y lo atrapan tres suites de nivel superior (`tablas-de-atribucion` 44, `atribucion` 10, `atribucion-del-corpus` 12). Una fila por par en `tipos.test.ts` lo haría local.
- **S-8. La tabla de la 1.35 va indexada por id de mutante** (ver arriba): más estable por clave de javac → códigos aceptables.
- **S-9. Brazos del plegado de constantes sin ninguna prueba** (`src/motor/semantica/constantes.ts`: 24 líneas, 85,62 % —ver «Cobertura de los archivos cambiados»—): `long` con `-`, `*`, `/`, `%`; `double` con `-`, `*`, `%` y comparaciones; `==`/`!=` de `boolean`; saturación de `(int)`/`(long)` sobre un `double`. Mis 1 050 programas dirigidos (c25–c29) coinciden con javac en todos esos brazos, así que hoy son correctos, pero cualquier cambio futuro los deja sin guarda; la regla de la 1.35 («cada conjunto cerrado se muta elemento por elemento») no se aplicó a `plegarBinaria`. Propuesta: una fila por operador y tipo en `constantes.test.ts`, de paso con los 31 programas de C-5/W-10.

---

### TDD estricto: reproducción del RED de la 1.34 y de la 1.35, y juicio

Método (el de la verificación anterior): árbol temporal con la producción del commit PADRE y encima los archivos de prueba, corpus y herramientas del commit HIJO (`git archive` a un directorio nuevo, sin tocar el repositorio), y `vitest run --project motor --project interfaz`. Una prueba nueva debe fallar contra la producción vieja **por la razón concreta que anota `tasks.md`**, y pasar contra la nueva (`npm test`: 3 961/3 961).

| Tarea | Padre → hijo | Fallos reproducidos | Cifras por archivo frente a `tasks.md` |
|---|---|---|---|
| **1.34** cerrar por defecto, familias A–D, nombres de `Object.prototype` | `ae41ad4` → `1ce43ea` | **271 en 18 archivos** (267 sin las 4 de `gitattributes.test.ts`, que fallan siempre en un árbol sin `.git`; el archivo `problemas-en-pantalla.test.ts` ni carga: `campo.lastIndexOf is not a function`) | `atribucion.test.ts` **112** (anotado 56 + 5 + 16 + 35 = 112, exacto); `sentencias.test.ts` **24** (12 + 12, exacto); `expresiones.test.ts` **14** (9 + 5, exacto); `tablas-de-prototipo.test.ts` **14**, `matriz-de-valores-y-contextos.test.ts` **8**, `arranque.test.ts` de textos **7**, de semántica **2**, `programas-invalidos` **3**, `Visualizador.test.tsx` **1**, `texto-del-problema` **1**, `tablas-sin-prototipo` **1**, `programas-validos` **1** (todos exactos); `cierre-por-defecto-del-corpus` **58** (anotado 59), `no-soportado.test.ts` de textos **10** (anotado 9), `problemas.test.ts` de textos **8** (anotado 7): ±1 por una fila de la tabla exhaustiva; `alcance.test.ts` **3** (el tipo propio de la familia C) |
| **1.35** falsos rechazos, `test:oraculo` estable, métrica de código | `1ce43ea` → `8bdc70f` | **582 en 19 archivos** (578 sin `gitattributes`; `parentesis.test.ts` ni carga: `Cannot find module './parentesis.ts'`) | `falsos-rechazos-del-corpus.test.ts` **117 de 168, exacto** al `Tests  117 failed \| 51 passed (168)` de `tasks.md`; `constantes.test.ts` **8** (ciclo 1: «8 failed \| 50 passed (58)», exacto); `no-soportado.test.ts` (sintaxis) **220**, `expresiones.test.ts` **80**, `compilador.test.ts` **35**, `analizador-sintactico.test.ts` **24**, `catalogo-clases.test.ts` **23** y `atribucion.test.ts` **13** (suma de los ciclos 2–25: el total por archivo no se anota, los ciclos sí y los que cotejé coinciden: ciclo 6 «8 failed» en `analizador-sintactico`, ciclo 22 «13 failed» en `no-soportado`…) |

Además, **8 sabotajes míos** sobre una copia limpia de `HEAD` (cada uno edita producción, corre las pruebas que lo cubren y restaura): `parentesis.ts` (quitar `switch` de lo que abre el operando de un cast) → 2 fallos; `analizarSwitch` (volver a aceptar una sentencia antes del primer `case`) → 12; `cerrarSiNoSeSabeSuTipo` sin efecto (abrir por defecto) → 18; `strictfp` fuera de los modificadores de clase → 1; la rama `clase-llamada-string` apagada → 2; `avisoEnmascaraError` que siempre enmascara → 2; `guion-bajo-mal-puesto` aceptado → 33; `esCastPermitido` que acepta cualquier par → **0 en su propio `tipos.test.ts`** pero 44 + 10 + 12 en tres suites de nivel superior. **8 de 8 atrapados** a nivel de la suite (S-7: el último, no a nivel de archivo).

**Juicio: CUMPLE.** Para las dos tareas, cada capa nueva tiene su RED real contra el código anterior, con la razón concreta que `tasks.md` declara, y su GREEN confirmado por mi `npm test`. Las dos pruebas agregadas por la regla «cada conjunto cerrado se muta elemento por elemento» (la 1.35 afirma 0 vivos de 125 y 31 sabotajes atrapados) las muestreé con mis 8 sabotajes y se comportan como dice. **Desviaciones**: la tabla de 8 columnas sigue ausente en `apply-progress` (W-4, formato, no sustancia); la 1.35 amplió el alcance respecto del encargo (tres familias más de falsos rechazos halladas por mutación y campaña), declarado por ella misma.

---

### Cobertura de los archivos cambiados (Strict TDD, paso 5d)

Cobertura v8 de `npm test` (proyectos `motor` + `interfaz`; el proyecto `oraculo`, con JDK, no entra), medida en una copia limpia de `HEAD` y sin tocar el repositorio. Los 23 archivos de producción cambiados por 1.34 y 1.35 con datos (`problemas.ts` y `ast.ts` son solo tipos): **98,06 % de líneas ponderado (2 837 de 2 893) y 94,75 % de ramas (2 580 de 2 723)**; promedio simple 98,51 % y 95,34 %. v8 mide por línea: una línea con varias sentencias cuenta como cubierta si corre alguna, por eso hay archivos al 100 % de líneas con una sentencia sin ejecutar.

| Archivo de producción (cambiado por 1.34/1.35) | Líneas | Ramas | Sentencias que `npm test` no ejecuta |
|---|---|---|---|
| `semantica/constantes.ts` | 85,62 % | 79,37 % | 167, 195-197, 203, 214, 219, 258, 267, 269, 271 … (28 tramos) |
| `semantica/alcance.ts` | 90,47 % | 77,77 % | 62, 74 |
| `semantica/asignacion-definitiva.ts` | 97,68 % | 96,52 % | 88, 124, 252, 292, 315, 376, 497-498 |
| `sintaxis/expresiones.ts` | 97,78 % | 92,46 % | 318, 372, 546-548, 551-552, 555 |
| `lexico/literales.ts` | 98,11 % | 94,97 % | 117, 146-149, 194-197, 230-233, 244, 533, 535 |
| `sintaxis/no-soportado.ts` | 98,7 % | 95,79 % | 126, 231, 267, 295, 355, 498, 519, 532, 574 … (16 tramos) |
| `sintaxis/analizador-sintactico.ts` | 98,78 % | 98,44 % | 651, 672, 976-977, 989-991, 1076, 1091 |
| `lexico/analizador-lexico.ts` | 99,2 % | 92,15 % | 43, 149-152, 204 |
| `semantica/atribucion.ts` | 99,45 % | 98,67 % | 128, 438, 473, 980 |
| `compilador.ts` | 100 % | 86,84 % | 66, 164 |
| `lexico/tokens.ts` | 100 % | 100 % | — |
| `no-soportado.ts` | 100 % | 100 % | — |
| `semantica/alcanzabilidad.ts` | 100 % | 97,95 % | — |
| `semantica/arranque.ts` | 100 % | 100 % | — |
| `semantica/catalogo-clases.ts` | 100 % | 100 % | — |
| `semantica/conversiones.ts` | 100 % | 100 % | — |
| `semantica/sobrecargas.ts` | 100 % | 85,71 % | 74, 81 |
| `semantica/tipos.ts` | 100 % | 99,14 % | 226 |
| `semantica/verificaciones-de-tipo.ts` | 100 % | 98,8 % | 147 |
| `sintaxis/parentesis.ts` | 100 % | 98,29 % | 56 |
| `textos/arranque.ts` | 100 % | 100 % | — |
| `textos/no-soportado.ts` | 100 % | 100 % | — |
| `textos/problemas.ts` | 100 % | 100 % | — |

Lectura: lo sin ejecutar son, en su mayoría, errores léxicos y sintácticos de borde (`comentario de bloque sin cerrar`, `literal char sin cerrar`, `bloque de texto sin cerrar`, `double` fuera de rango), `throw` de invariantes internas y **los brazos del plegado de constantes** de `constantes.ts`. Los programas de borde los probé a mano contra javac (c30: 120 programas dirigidos a esas líneas, 0 diferencias de veredicto y 53 de 53 líneas iguales) y los brazos del plegado también (c25–c29: 1 050 programas, 0 diferencias de veredicto en lo que el motor decide, salvo la familia de C-5 / W-10 que el propio *stub* de `constantes.ts:178-180` provoca). Que `npm test` no las ejecute **es una guarda ausente, no un defecto**: S-9.

---

### Calidad de aserciones (49 archivos de prueba cambiados por 1.34 y 1.35: 1 483 pruebas, 2 779 `expect`)

Exploración automática más lectura de lo señalado: **0 tautologías** (`expect(true).toBe(true)` y parecidos); 43 aserciones de solo tipo (`not.toBeNull()` sobre `main`, `toBeDefined()`), todas **acompañadas de aserciones de valor en la misma prueba** o usadas como guarda del acceso siguiente; 242 `toEqual([])`/`toHaveLength(0)`, de las cuales las de `atribucion.test.ts`, `asignacion-definitiva.test.ts` y `alcanzabilidad.test.ts` tienen pruebas hermanas con el caso contrario no vacío (el patrón «válido → lista vacía; inválido → un problema»); **0 bucles fantasma confirmados**: 58 bucles sobre colecciones derivadas se señalaron por no tener una guarda en las seis líneas anteriores, y los de `reductor.test.ts:51,112,244` los cubren pruebas del mismo archivo que exigen candidatos concretos para el mismo programa (`:41-48`, `:88-91`), y el de `herramientas/oraculo/generados/campana.test.ts:125` lo cierra el `toBeLessThan` agregado de la línea siguiente (que falla con una lista vacía); 6 `vi.fn`/`vi.spyOn` en `Visualizador.test.tsx` frente a 27 `expect`. Resultado: **0 CRITICAL, 0 WARNING, 1 SUGGESTION** (los `not.toBeNull()` de `main` en `no-soportado.test.ts` y `analizador-sintactico.test.ts` ganarían con la forma del parámetro).

---

### Matriz de cumplimiento de lo que agregan 1.34 y 1.35 (todas con prueba que pasa en mi `npm test`)

| Requisito / criterio | Escenario o regla agregada | Prueba que lo respalda (resultado en mi corrida) |
|---|---|---|
| REQ-COMP-006, REQ-SUB-004 | Una sentencia antes del primer `case` es un error en esa línea (A) | `src/motor/sintaxis/sentencias.test.ts:177` (describe de 1.34, 12 casos) — ✅ |
| REQ-COMP-006, REQ-SUB-006/007 | `args` y `System.in/out/err` como valor: aviso por defecto (B) | `src/motor/semantica/atribucion.test.ts` (35 pruebas de 1.34, p. ej. `:72`) y `pruebas/compilacion/matriz-de-valores-y-contextos.test.ts:29-48` (40 × 81, 982 celdas válidas, 2 258 rechazos) — ✅ |
| REQ-COMP-001/002/006, REQ-SUB-005 | La clase del alumno tapa a la del JDK; `class String` no arranca (C) | `atribucion.test.ts:2000+`, `src/motor/semantica/arranque.test.ts` (2 pruebas de 1.34), `corpus/experimentos/cierre-por-defecto/` + `pruebas/compilacion/cierre-por-defecto-del-corpus.test.ts:110-122` — ✅ |
| REQ-COMP-006 | `(x = 2);` es error; `(x) = 2;`, `(s).length();` compilan (D) | `sentencias.test.ts:291` (10 formas), `expresiones.test.ts`, `atribucion.test.ts` — ✅ |
| REQ-DIFF-004/006 | Ninguna tabla del motor hereda de `Object.prototype` (E) | `pruebas/arquitectura/tablas-sin-prototipo.test.ts:27-43`, `pruebas/compilacion/tablas-de-prototipo.test.ts:35-44` (1 058 programas), `herramientas/oraculo/tablas-de-prototipo.test.ts` (con JDK) — ✅ |
| DoD §13.4, decisión del PO 2026-10-02 | Ningún texto afirma que Java acepta o compiló el programa | `src/textos/es-MX/no-soportado.test.ts`, `arranque.test.ts`, `pruebas/compilacion/programas-invalidos.test.ts` (el detector), `texto-del-problema.test.ts` — ✅ |
| REQ-COMP-006, D2 | Ningún programa que javac compila sale como error (1.35: instanceof con patrón, sealed, clase anónima, archivos sin clase, constantes, `main`, casts, `import p.*;`, `\u`, campo sin `;`…) | `corpus/experimentos/falsos-rechazos/` (86 × 5) + `pruebas/compilacion/falsos-rechazos-del-corpus.test.ts:178-190`, `src/motor/sintaxis/parentesis.test.ts` (149 filas del puerto de `analyzeParens`) — ✅ |
| REQ-DIFF-006 (C7) | Veredicto 100 %, línea ≥ 95 %, código ≥ 88 % | `pruebas/compilacion/mutantes.test.ts:285-322` — ✅ 100,00 / 98,88 / 89,22 |
| Estabilidad de `test:oraculo` | tope por proyecto y diagnóstico de «no terminó a tiempo» | `herramientas/oraculo/limites-de-pruebas.test.ts:24-34`, `generar-datos.test.ts:380` — ✅ (mis 2 corridas) |
| REQ-DIFF-004 (generador) | 0 discrepancias frente a javac | `herramientas/oraculo/generados/*.test.ts` y mis dos campañas — ✅ |

REQ-SUB-001–007 y REQ-COMP-001–010 siguen 100 % mapeados (verificación anterior: sin cambios de cobertura), y la excepción declarada de REQ-SUB-003 (ejecución) y REQ-VIS-002 (ícono/título/subrayado, 4.5) no cambia.

---

### Estado de los hallazgos de la verificación anterior (1.1–1.33), uno por uno

| Hallazgo anterior | Estado hoy | Evidencia |
|---|---|---|
| **CRITICAL-1** falsos aceptos A–D (sentencia antes del primer `case`; `args` y `System.in/out/err` como valor; clase del alumno con nombre del JDK; expresión entre paréntesis como sentencia) | **CERRADO** | `c01`: A 12, B 24, C 14, D 14 programas, 0 falsos aceptos; las 4 formas dentro de la matriz propia valor × contexto (22 686 programas): 0; el RED de la 1.34 reproducido (271 fallos contra el padre) y la guarda permanente `matriz-de-valores-y-contextos.test.ts` |
| WARNING-1 `test:oraculo` inestable (`generar-datos.test.ts`, «se leyeron 0 clases») | **CERRADO** | dos corridas completas seguidas, 766 + 1 omitida, salida 0 (111,9 s y 111,5 s); causa reproducida por la 1.35 (límite de 5 s por omisión de `ejecutar.ts`) y tope por proyecto en `vitest.config.ts` con su guarda `limites-de-pruebas.test.ts` |
| WARNING-2 fallo interno: `compilar()` lanza con `System.<propiedad de Object.prototype>` | **CERRADO** | 45 programas de regresión (`c01` p01–p45) y 0 fallos internos en 448 817; las 10 tablas del motor pasan a `Map` y la regla ESLint `herramientas/eslint/reglas-de-tablas.ts` impide volver a una tabla de objeto plano |
| WARNING-3 falsos rechazos (`instanceof` con patrón, `sealed`/`permits`, clase anónima, archivos sin clase, constantes, `main` con otra firma, `public class Random`/`Scanner`, escapes Unicode) | **CERRADO en lo que describía; aparecieron otros de otra familia** | `c21`: 45/45 válidos sin error; mutador y fuzzer propios: 0 falsos rechazos salvo las familias nuevas (W-1: 97 puntos ignorables; W-2: `\r` y `U+001A`; W-10: constantes de texto con `double`) |
| WARNING-4 precedencia léxico/sintaxis (solo línea) | **ABIERTO** | W-6: la línea coincide en 97,6 % de mis rechazos de mutantes de estructura rota (96,4 %–98,1 % por campaña), 99,21 % en el total y 99,78–99,84 % en las campañas del generador; 0 falsos aceptos por esta causa |
| WARNING-5 jerga de `error-no-clasificado` | **ABIERTO, sin cambio** | W-3: 47,0 % (1 133/2 411); «token» 14,7 % (354); revisión de textos del PO (5.11) |
| WARNING-6 TDD sin tabla de 8 columnas; 1.29 sin RED literal | **ABIERTO (formato), mejorado** | W-4: 1.34 y 1.35 traen RED literal por ciclo y lo reproduje; la tabla sigue ausente; lo perdido en la 1.29 no se recupera |
| WARNING-7 brechas de C8 (segundo `Scanner`, `printf` con `%e`/`%x`/`%1$d`/banderas, patrón no literal) | **ABIERTO** | W-5: 14 sondas, todas `ejecucion-no-disponible` (texto honesto desde la 1.34); aviso propio en la 2.15 |
| WARNING-8 «y N más» sin prueba ni UI | **Reubicado, no implementado** | `tasks.md:737` y `:742` (la 4.5) |
| WARNING-9 peso sin puerta automática, motor duplicado | **ABIERTO** | W-7: 310 366 B (+7 000 B desde la 1.33), `presupuesto` inexistente (5.9), 3.6 |
| WARNING-10 el CI remoto de 1.31–1.33 no corrió | **ABIERTO y ampliado a 1.31–1.35** | W-8: 9 commits sin subir; todo lo que hace `oraculo.yml` corrido a mano en verde |
| SUGGESTION-1 sumar A–D, la matriz y el fuzzer a las guardas e informar los «avisos ante rechazo» | **Cerrada en lo principal** | `matriz-de-valores-y-contextos.test.ts` (sin y con JDK), corpus `cierre-por-defecto/` (42 × 5) y `falsos-rechazos/` (86 × 5); el fuzzer de tokens y el recuento de «avisos ante rechazo» siguen solo como informe del generador |
| SUGGESTION-2 `generarDatos` sin `limiteMs` ni diagnóstico de `agotoTiempo` | **Cerrada** | `LIMITE_MS_DE_LAS_SONDAS` y `verificarQueLaSondaTermino`; `generar-datos.test.ts:380` |
| SUGGESTION-3 `import java.sqrt.*;` y campo sin `;` con otra línea que javac | **Cerrada** | `c24`: 5 rechazos de 5 con la MISMA línea que javac; `import java.io.*; java.net.*` compilan |
| SUGGESTION-4 `config.yaml` y `CLAUDE.md` desactualizados | **ABIERTA** | S-3, S-4 |
| SUGGESTION-5 aserciones débiles `catalogo.test.ts:52`, `sobrecargas.test.ts:95` | **Cerrada** | ambas endurecidas por la 1.35 (la de `catalogo` destapó un literal contado dos veces) |
| SUGGESTION-6 editor sin nombre accesible | **ABIERTA** | S-6 (5.10) |
| SUGGESTION-7 `REQ-BIB-003` nombra `%e` | **ABIERTA** | S-5 |
| SUGGESTION-8 texto de `palabra-reservada-como-nombre` para `int int x = 5;` | **ABIERTA** | S-2 |
| Lote 0: WARNING-4 (E2E «sin red» en WebKit omitido) | **ABIERTO** (1 omitida) | límite de Playwright; seguimiento antes del lote 5 |

---

### Criterio de salida del lote 1, C7 y C8

Criterio de salida de `tasks.md` («`motor/{lexico,sintaxis,semantica,compilador}` + `pruebas/compilacion/**` verdes; C7 y C8 cumplidos»): **CUMPLE en lo que mide**, con las cifras de arriba, y las 34 tareas del lote tienen `✅ hecha` (34/34). Lo que **no** cumple es el requisito para el que existe el lote, REQ-COMP-006 («ni más estricto ni más permisivo»), en las cinco familias C-1…C-5 de arriba (todas de alcance casi nulo) y, del lado estricto, en la familia léxica de W-1/W-2 y en W-10.

- **C7, primera parte** (37/37 casos del catálogo, primer error de la primera pasada): **CUMPLE** (`pruebas/compilacion/catalogo.test.ts`, `catalogo-semantico.test.ts`, `arranque.test.ts`: verdes).
- **C7, segunda parte** (≥ 2 000 mutantes de un token: veredicto 100 %, línea ≥ 95 %): **CUMPLE** con 100,00 % / 98,88 %, y regeneré los 2 625 veredictos con javac real: idénticos. El código (métrica secundaria) 89,22 % cumple el umbral 0,88 gracias a las 51 entradas auditadas (tabla honesta).
- **C8** (una muestra por construcción → su aviso, 0 pasos, 0 errores de sintaxis engañosos): **CUMPLE en lo medido**: las 67 muestras de `corpus/compilacion/avisos/` dan `no-disponible` y el JDK real confirma que son Java válido (`herramientas/oraculo/corpus-avisos.test.ts` en mi `test:oraculo`), y mis 14 sondas de las brechas dan un `ejecucion-no-disponible` honesto, nunca un error de sintaxis (W-5).

---

### Definición de Terminado (`proposal.md` §13) aplicada a lo que agregan 1.34 y 1.35

1. **Sin TODO, mocks ni demos en producción:** CUMPLE **con una salvedad**. `grep` sobre `src/` (sin pruebas): ningún marcador `TODO`/`FIXME`/`XXX`/`HACK`, solo la palabra española «TODO» en mayúsculas de énfasis; ni `fetch(`, ni `XMLHttpRequest`, ni URL `http(s)://` en `src/` (la única coincidencia, `WebSocket`, es el nombre de una clase del JDK en una tabla de datos generada). La salvedad: el *stub* deliberado de `semantica/constantes.ts:178-180` («concatenar con un `double` no es constante», deuda `999a8ca` que retira la 2.4) es una conducta provisional **en producción** y hoy provoca C-5 y W-10.
2. **TDD estricto:** CUMPLE (RED reproducido de las dos tareas; ver arriba; W-4 de formato).
3. **`npm test`, lint y tipos en verde con salidas acotadas; CI verde:** CUMPLE en local (3 961/3 961, `test:oraculo` 766 + 1 ×2, lint y tipos 0, E2E 17 + 1); **el CI remoto de 1.31–1.35 no corrió** (W-8).
4. **Textos en español de México, del catálogo, con el tono de §1:** CUMPLE en lo agregado: los textos nuevos (`sentencia-antes-del-primer-case`, `sentencia-entre-parentesis`, `clase-repetida-con-import`, `valor-de-tipo-no-modelado`, `clase-llamada-string`, `ejecucion-no-disponible`, y los de la 1.35) están en el catálogo, en español claro y sin afirmar que Java compiló el programa; los de la revisión del PO (5.11) siguen pendientes. Salvedades: la jerga heredada (W-3) y el consejo de `palabra-reservada-como-nombre` (S-2).
5. **Accesible:** CUMPLE sin cambios (1.34 y 1.35 no tocan `src/interfaz`; el E2E de problemas en pantalla pasa).
6. **Cero red; dependencias y peso:** CUMPLE (0 dependencias nuevas, licencias 9/9 permisivas, 310 366 B = 62 % del presupuesto; ver W-7 por la puerta automática).
7. **`main` desplegable:** CUMPLE en local (el E2E construye y pasa); no verifiqué el *build* de Pages en remoto.
8. **Conventional commits sin atribución de IA, con confirmación explícita:** CUMPLE: los 27 commits `main..HEAD` son convencionales (`feat|fix|docs|test`), todos de Jorge Zepeda, **0 líneas** con `Co-Authored-By`, `Claude`, `Anthropic` ni `generated`; sin merges.

---

### Coherencia del plan

- **Spec:** 73 requisitos y 96 escenarios (cuenta propia sobre `specs/`), como declara `CLAUDE.md`. `proposal.md` y `specs/` ya no contienen «Java sí» ni afirmaciones de validez (la 1.30 y la 1.34 las enmendaron).
- **`tasks.md`:** lote 1 con 34 tareas `✅ hecha` (1.1–1.17 y 1.19–1.35); el «Resumen por lote» dice 32 y total 119 (real: 34 y **121**: 19 + 34 + 22 + 8 + 16 + 14 + 8): conteo viejo (S-3).
- **`design.md`:** §2.1, §2.3, §2.7 y §9 recogen el principio de cerrar por defecto, el generador y la matriz (1.34 y 1.35).
- **`state.yaml`:** `updated: 2026-09-29`; su `apply` llega a la 1.33 y dice «siguiente: re-verificar el lote 1»; no refleja la 1.34, la 1.35, el FAIL de `ae41ad4` ni esta verificación. **No lo toqué**: lo actualiza el orquestador tras la decisión del PO.
- **`.github/workflows/oraculo.yml`:** coherente (`test:oraculo`, `oraculo:verificar`, `oraculo:datos`, `oraculo:mutantes` de noche, `oraculo:generados` con semilla fija 20260929 × 3 000 en PR/push y de noche 40 000 con la semilla del día); todos sus comandos existen.

---

### Riesgos para el PO

1. **Un falso acepto cuesta más a partir del lote 2.** Hoy el motor solo ejecuta `println` de literales, así que un programa que javac rechaza y el motor deja pasar produce el aviso «todavía no sé ejecutar…». Con el lote 2 ese mismo programa se **ejecutará** y el alumno verá una traza de código que NetBeans no compila (un bucle con una sentencia inalcanzable, un `package java.util;`, un `main(String . . . args)`). Es el momento más barato para cerrar las cinco familias: la corrección es local y el motor aún no depende de ellas.
2. **W-1 es el único hallazgo que un alumno puede tocar sin proponérselo**: pegar desde una página, un PDF o un chat introduce un espacio de ancho cero o un guion blando; el alumno ve «No existe una variable llamada "x"» sobre una variable que sí declaró, mientras NetBeans compila. Es raro, pero es el caso en que el visualizador contradice a NetBeans con un mensaje que no se puede entender.
3. **Dos errores a la vez** (W-6): con un solo error la línea coincide con javac; con dos, el primero que reporta el motor depende del orden de sus pasadas (97,6 % de coincidencia en mis mutantes). Y la jerga de `error-no-clasificado` (W-3: 47 % de los rechazos, «token» en 14,7 %) sigue pendiente de la revisión del PO (5.11).
4. **Peso:** 310 366 B (62,1 % de 500 000) con **solo** el lote 1: quedan 189 634 B para los lotes 2 a 6, no existe la puerta `npm run presupuesto` (5.9) y el motor va duplicado en `index-*.js` y `trabajador-*.js` (3.6). Conviene la puerta antes del lote 2, no al final.
5. **CI remoto sin correr** para los 9 commits `52adfdd`…`8bdc70f` (el PR #2 sigue en `1c8cf5b`): lo que hace `oraculo.yml` lo corrí a mano en verde, pero la primera ejecución en GitHub (JDK y Node de la imagen, Playwright) puede mostrar diferencias de entorno; la regla «`main` siempre desplegable» pide verlo verde **antes** del merge.
6. **El plan está desactualizado** (S-3): `state.yaml` no recoge 1.34, 1.35 ni esta verificación; `tasks.md` y `CLAUDE.md` dicen 119 tareas (son 121). Quien abra una sesión nueva lee un tablero atrasado.

### Opciones para el PO (con su consecuencia)

La regla acordada era binaria («sin CRITICAL, el lote 1 cierra y los WARNING pasan a tareas de lotes posteriores»); la apliqué sin excepciones y da **FAIL**. Lo que sigue es lo que el PO puede decidir con los datos de arriba; ninguna opción es mía de elegir.

| | Qué se hace | A favor | En contra |
|---|---|---|---|
| **A. Tarea 1.36 y cerrar** (la que yo recomendaría) | Una tarea con TDD estricto y goldens del oráculo que cierra C-1, C-2, C-3, C-4 (a y b; la c, `limit.code`, se documenta como fuera de alcance), C-5 (con el tercer estado «constante desconocida» y aviso honesto), W-1, W-2 y W-10; luego una verificación **acotada al delta** con mis instrumentos y el `push` con CI remoto verde | Cumple la regla tal cual; deja el lote 1 sin falsos aceptos conocidos; cierra el único falso rechazo alcanzable desde la interfaz; el motor aún no depende de nada de esto | Una tarea y una verificación más antes de empezar el lote 2; C-5 toca varias pasadas (alcanzabilidad, asignación definitiva, `case`) y es la más grande |
| **B. Mergear ya, con aceptación escrita** | El PO anota en `state.yaml` (`decisiones_po`) que acepta C-1…C-5 como límites conocidos de alcance casi nulo, y la 1.36 pasa al lote 5 (antes de la validación en aula, 5.14) | Desbloquea el lote 2 hoy | Se aparta de la regla acordada (decisión del PO, no una corrección mía); queda deuda de cinco familias de falsos aceptos que **a partir del lote 2 se ejecutarían**; W-1 sigue; hay que acordarse de la 1.36 |
| **C. 1.36 reducida** | Solo lo barato y lo alcanzable: W-1, C-1, C-2 (normalizando `\r` al entrar en `compilar()`) y C-3; C-4 y C-5/W-10 se documentan como límites, porque C-5 tiene su cierre natural en la 2.4 (que retira el *stub* de `constantes.ts`) y C-4 no lo produce nadie | La mitad del trabajo; cubre lo que un alumno podría tocar | La regla no se cumple a la letra para C-4 y C-5; C-5 sigue como falso acepto hasta la 2.4 |

**Alcance propuesto de la 1.36** (nombre sugerido: «Cierre del léxico, los bordes del archivo y las constantes desconocidas»), cada ítem con su RED en los programas mínimos de este informe y su golden del oráculo:

| Ítem | Dónde | Corrección |
|---|---|---|
| C-1 | `sintaxis/analizador-sintactico.ts:386-390` y `:327` | exigir que los tres `.` sean adyacentes (`rango.fin` de uno = `rango.inicio` del siguiente) |
| C-2, W-2a | `lexico/analizador-lexico.ts:115,122`, `lexico/literales.ts:160,243`, `fuente/tabla-de-lineas.ts:10` | `\r`, `\r\n` y `\n` terminan línea; o normalizar a `\n` al entrar en `compilar()` y documentarlo |
| W-2b | `lexico/analizador-lexico.ts` | `U+001A` al final del archivo es fin de entrada |
| C-3 | `compilador.ts` o `semantica/arranque.ts` | error con texto es-MX propio si `clasesDelPaquete(nombre).size > 0` para el nombre del `package` |
| C-4 | `lexico/literales.ts` y `semantica/constantes.ts` | error si una constante de cadena tiene `length ≥ 65 535` o más de 65 535 bytes en UTF-8 modificado; documentar `limit.code` en `design.md` |
| W-1 | `lexico/analizador-lexico.ts:253-263` | descartar los 97 puntos `Character.isIdentifierIgnorable` del texto del identificador (conservando el `rango`) antes de buscar la palabra clave |
| C-5, W-10 | `semantica/constantes.ts:178-180` y los consumidores | tercer estado «constante de valor desconocido»; alcanzabilidad, asignación definitiva, `case` y condición responden con aviso honesto |
| Guardas | `corpus/experimentos/`, `pruebas/compilacion/` | una versión reducida y permanente de mi matriz carácter × posición, del fuzz de separadores y de las sondas de `package`, límites y constantes, con goldens del oráculo |

**Verificación del delta tras la 1.36** (estimación mía, a confirmar): `npm test`, `test:oraculo`, mutantes y generador con la semilla del CI; mis 109 programas de regresión; los 25 + 7 + 21 + 15 + 25 falsos aceptos y los 4 685 falsos rechazos de esta sección, que vuelven a correr con mis instrumentos (en el *scratchpad* y, resumidos, en engram): la matriz del BMP tarda unos 7 min, el fuzz de separadores unos 21 min y las sondas dirigidas 1–2 min, o sea unos 30–40 minutos de máquina (la campaña completa de ~449 000 programas son unas 2 horas, casi todas de javac: el motor tarda 4 minutos en total); y una pasada nueva de búsqueda sobre lo que la 1.36 toque.

### Tareas propuestas para los WARNING y SUGGESTION (por lote)

| Hallazgo | Propuesta |
|---|---|
| W-1, W-2, W-10, C-1…C-5 | **1.36** (arriba); C-5 además en el RED de la **2.4** |
| W-3 jerga, S-2 consejo de `palabra-reservada-como-nombre`, S-5 `%e` en REQ-BIB-003 | **5.11** (cierre del catálogo es-MX) y una enmienda de una línea al requisito |
| W-4 tabla TDD | proceso: desde la siguiente tarea, `apply-progress` con la tabla de 8 columnas |
| W-5 brechas de C8 | **2.15** (catálogo API y avisos propios) |
| W-6 precedencia léxico/sintaxis | tarea propia en el lote 5 (léxico perezoso: tokenizar bajo demanda, como javac); ya anotada como «candidata a tarea propia» en `tasks.md:436` y `:527` |
| W-7 peso | adelantar la puerta de **5.9** (`presupuesto`) al lote 2; **3.6** deduplica el motor |
| W-8 CI remoto | acción: `push` y esperar `ci` y `oraculo` verdes antes del merge |
| W-9 «y N más» | **4.5** (`tasks.md:737` y `:742`) |
| S-1 rendimiento cuadrático de `Alcance` | lote 5 (no copiar arreglos al declarar) |
| S-3, S-4 plan y `CLAUDE.md` | orquestador: `state.yaml`, «Resumen por lote» (34 y 121), `CLAUDE.md` (121 tareas; `lint` no corrige), `openspec/config.yaml` |
| S-6 editor sin nombre accesible | **5.10** |
| S-7 `esCastPermitido` | una fila por par de tipos en `tipos.test.ts` |
| S-8 tabla afinada por id de mutante | tabla por clave de javac → códigos aceptables, con la misma auditoría |
| S-9 brazos del plegado | filas por operador y tipo en `constantes.test.ts` (con la 1.36) |

---

### Límites de esta verificación (lo que NO pude comprobar)

CI remoto en GitHub (los 9 commits no están subidos); E2E «sin red» en WebKit (omitida desde el lote 0); `test:navegadores` (llega con la 2.22); `npm run presupuesto` (no existe, 5.9); el comportamiento de NetBeans en Windows (uso JDK 17 de macOS: Temurin 17.0.18); la revisión de textos con un docente (5.11, 5.14). Mis cifras de tiempo de las campañas (no las de `npm test` ni `test:oraculo`) se midieron con la máquina cargada por procesos ajenos.

---

### Issues Found

**CRITICAL** (falsos aceptos; la regla acordada los hace bloqueantes; ninguno alcanzable por un error realista de un alumno):
- **C-1** `main(String . . . args)` y 7 variantes con los tres puntos separados se aceptan (`analizador-sintactico.ts:386-390`, `:327`).
- **C-2** el `\r` suelto no es fin de línea: `char c = '⟪CR⟫';`, `"a⟪CR⟫b"`, comentario `//` que debía cerrar un `\r` (inalcanzable desde la interfaz).
- **C-3** `package java.util;` y todo paquete exportado del JDK.
- **C-4** constante de cadena de ≥ 65 535 caracteres o > 65 535 bytes en UTF-8 modificado; > ~8 200 sentencias en `main`.
- **C-5** constante de texto con un `double` (`"a" + 1.5 == "a1.5"`) no se pliega: bucle infinito o cuerpo inalcanzable no vistos (`constantes.ts:178-180`).

**WARNING** (deben arreglarse, no bloquean):
- **W-1 (alto)** caracteres ignorables de Java en identificadores y palabras clave se toman como parte del nombre (97 puntos BMP; alcanzable desde la interfaz).
- **W-2** `//` con `\r` suelto se traga la línea siguiente; `U+001A` final.
- **W-3** jerga de `error-no-clasificado` (47,0 %; «token» 14,7 %).
- **W-4** evidencia TDD sin tabla de 8 columnas.
- **W-5** brechas de C8 (14 sondas, texto honesto desde la 1.34; aviso propio en la 2.15).
- **W-6** precedencia léxico/sintaxis y anclas: 97,6 % de línea igual en mis mutantes; 99,21 % en el total.
- **W-7** peso 310 366 B sin puerta automática, motor duplicado.
- **W-8** CI remoto de los 9 commits sin correr.
- **W-9** «y N más» sin UI ni prueba (4.5).
- **W-10** seis falsos rechazos por constantes de texto con `double` (`case "d" + 1.5:`, asignación definitiva con esa condición).

**SUGGESTION**: S-1 rendimiento cuadrático con locales; S-2 consejo de `palabra-reservada-como-nombre`; S-3 conteos y estado del plan; S-4 `CLAUDE.md` dice «autofix» y `lint` no corrige; S-5 `REQ-BIB-003` y `%e`; S-6 editor sin nombre accesible; S-7 `esCastPermitido` sin prueba directa; S-8 tabla afinada indexada por id; S-9 brazos del plegado sin prueba.

---

### Verdict

**FAIL**

Por la regla de cierre acordada con el PO (**cualquier falso acepto es CRITICAL**): cinco familias, 93 falsos aceptos en 448 817 programas propios comparados con javac 17.0.18 real, todas en el léxico, los bordes del archivo y el plegado de constantes, ninguna alcanzable por un error realista de un alumno; el resto, en verde: las familias A–D y el fallo interno de la verificación anterior **cerrados**, 0 fallos internos, 0 resultados inventados en la ejecución real (977/977), `npm test` 3 961/3 961, `test:oraculo` ×2 verde, E2E 17 + 1 omitida, lint y tipos en 0, mutantes 100,00 / 98,88 / 89,22 %, generador y oráculo sin una sola discrepancia, commits convencionales sin atribución de IA. **Mi expectativa, a confirmar con la verificación del delta: con la 1.36 (opción A) el lote 1 cierra como PASS WITH WARNINGS.**

---

### Dónde está la evidencia

- **En el repositorio:** solo este archivo cambió (`git status` limpio en todo lo demás).
- **Scratchpad (volátil):** `/private/tmp/claude-502/-Users-desarrollo-VisualizadorJava/da1801e0-cfc0-4c84-99cd-2ce29b4b6d1e/scratchpad/vf/` con `herr/` (instrumentos: `LoteMio.java` compila en lote con `javax.tools`; `worker-compilar.mjs`, `comparar.mjs`, mutador, matrices, fuzz, generadores), `corpus/` (c01–c32 y semillas), `out/` (un informe JSON por campaña, registros de `oraculo:*`), `head/` (copia limpia de `HEAD`), `informe/` (borradores de esta sección).
- **Engram** (proyecto `visualizadorjava`): `sdd/visualizador-java/verify-report` (esta corrida, primero), `sdd/visualizador-java/verificacion-final-lote1-programas` (índice, veredictos, programas mínimos de cada hallazgo y los corpus), `sdd/visualizador-java/verificacion-final-lote1-progreso`.

---

## Verificación del delta del lote 1 (1.36)

**Fecha:** 2026-10-05. **Modo:** Strict TDD (inyectado por el orquestador; autoritativo). **Alcance:** la tarea 1.36 (`33e502e`, 61 archivos de código y pruebas y 990 de corpus: +4 087/−165 líneas sin contar el corpus) y el commit de conteos `db50217`. **Rama:** `feat/lote-1b-sentencias` @ `db50217`, árbol limpio al empezar y al terminar (solo cambia este archivo). 30 commits sobre `main`; los 12 últimos (`52adfdd`…`db50217`) NO están subidos: el PR #2 sigue en `1c8cf5b` (`OPEN`, `MERGEABLE`/`CLEAN`, `ci` y `oraculo` verdes sobre ESE SHA). Todo lo que ensucia (copias de `HEAD`, el árbol del RED, el árbol de sabotajes, programas, mutantes, scripts) vivió en el *scratchpad* (`…/scratchpad/vd/`); producción y pruebas no se tocaron.

### Veredicto: **FAIL** por la regla de cierre acordada (queda UNA familia de falsos aceptos: 34 programas, alcance nulo); todo lo demás, en verde

**Lo bueno, medido.** Los cinco hallazgos CRITICAL de la verificación final (C-1, C-2, C-4, C-5 y la parte exportada de C-3) y los tres falsos rechazos (W-1, W-2, W-10) están **CERRADOS** con los mismos instrumentos que los encontraron: los **53 conjuntos (451 355 programas) vuelven a dar 0 falsos aceptos, 0 falsos rechazos, 0 fallos internos (en mi arnés, con una pila de 3 MB: W-12 trae los que aparecen con la pila real) y 0 *timeouts*** (antes: 93 falsos aceptos —la 1.36 cuenta 94 con el *timeout* de `lim`—, 4 691 falsos rechazos, 0 fallos internos), con los veredictos de javac **recalculados con `-g`** (alineé `LoteMio` con el oráculo: los 451 319 veredictos únicos son idénticos a los guardados sin `-g`, así que `-g` solo importa para una `final` constante enorme sin uso, que ningún conjunto viejo tenía y que mis conjuntos de límites sí). La línea coincide en 293 439 de 295 643 rechazos (**99,25 %**; 2 204 diferencias, la cifra exacta que declara la 1.36, todas de la familia W-6). `npm test` 4 966/4 966, `test:oraculo` 866 + 1 omitida, lint, tipos y E2E en verde, mutantes 100,00 / 98,88 / 89,22 %, generador con la semilla del CI y con la nocturna (20261007 × 40 000) en 0 discrepancias, y las regeneraciones del oráculo (`oraculo:verificar` 620 programas, `oraculo:datos`, `oraculo:mutantes`) idénticas byte a byte. Contra el código nuevo escribí **instrumentos nuevos con otras gramáticas** (19 conjuntos, 231 639 programas: fines de línea, ignorables compuestos, elipsis, `package`, constantes con `double`/`float`, límites del archivo al byte, tope de tamaño, densidad de bytecode, 5 campañas de mutación con semillas nuevas y SIN excluir las familias ya cerradas, y un generador de árboles de constantes al azar): **cero falsos aceptos salvo la familia de abajo**.

**Lo que cambia el veredicto.** Con el instrumento exhaustivo de `package` (los 844 paquetes de `jrt:/`, sus prefijos y las 14 909 clases de primer nivel como nombre de paquete) aparece el **residuo de C-3**: `package java.lang.Shutdown;` (y otras 32 clases NO públicas de `java.lang`, más `java.lang.runtime.SwitchBootstraps`) lo rechaza javac (`pkg.clashes.with.class.of.same.name`) y `compilar()` lo da por bueno (`ok` en los 34 programas de `d04`). La 1.36 modeló los 256 paquetes exportados (0 falsos aceptos ahí) y dio aviso a los nombres de clase PÚBLICA (133, honestos), pero su catálogo no conoce las clases no públicas que javac ya carga en `java.lang`. Por la regla acordada con el PO («cualquier falso acepto es CRITICAL») es **C-6**; mi lectura del riesgo está abajo: es alcance nulo y un arreglo de datos de media hora.

---

### Resumen de ejecución (cifras reales, ejecutadas por mí)

| Comando | Resultado |
|---|---|
| `npm test` | **4 966 pasan (4 966)**, 74 archivos, 7,4 s, salida 0 (la verificación anterior: 3 961 en 66) |
| `npm run test:oraculo` (Temurin 17.0.18+8) | **29 archivos, 866 pasan + 1 omitida (867)**, 105 s, salida 0 (incluye `[generador] javac compila 1367/3000 = 45,6 %` de la semilla del CI) |
| `npm run lint` / `npm run tipos` (4 `tsc`) | salida 0 / salida 0; el árbol queda limpio tras cada uno |
| `npm run e2e` (construye por su cuenta; 3 motores) | **17 pasan + 1 omitida** (la de «sin red» en WebKit), 13,3 s |
| Mutantes dentro de `npm test` (C7) | veredicto **2 625/2 625 = 100,00 %**, línea **2 384/2 411 = 98,88 %**, código **2 151/2 411 = 89,22 %** (umbral 0,88 intacto) |
| `oraculo:mutantes` / `oraculo:datos` (copia limpia de `HEAD`) | salida 0 y **bytes idénticos**: `corpus/mutantes/veredictos.jsonl` (`cmp`; 2 625 mutantes, 214 compilan y 2 411 no, 8 s), `corpus/datos/**` (`diff -r`) y los 7 `*.generado.ts`, incluido el de identificadores con la tabla nueva de ignorables |
| `oraculo:verificar` (copia limpia de `HEAD`) | salida 0: «620 programas, goldens idénticos a una regeneración real contra Temurin 17.0.18» (423 de antes + 197 nuevos; 400 s con la CPU saturada por mis campañas) |
| `oraculo:generados`, semilla del CI (`--semilla 20260929 --cantidad 3000 --max-reducir 100`) | **salida 0, 0 discrepancias**; javac compila 1 367 y rechaza 1 633 (45,6 %); línea 900/900 (100 %); 14 s |
| `oraculo:generados`, `--semilla 20261007 --cantidad 40000` | **salida 0, 0 discrepancias**; compila 18 160 y rechaza 21 840 (45,4 %); línea 12 281/12 301 (99,84 %); 92 s |
| Cobertura (informativa; v8, `npm test`, copia limpia) | global de `src/`: líneas 98,06 %, ramas 95,60 %. Los **23 archivos de producción cambiados por la 1.36** con datos: **98,66 % de líneas ponderado (2 792/2 830) y 95,99 % de ramas (2 467/2 570)**; `semantica/constantes.ts` sube de 85,62 % a **96,93 %** (S-9 cerrado); los menores: `alcance.ts` 90,47 % (dos `throw` de invariantes), `constantes.ts` 96,93 %, `posiciones-de-javac.ts` 97,22 %, `limites-del-archivo.ts` 98,98 % (líneas 345-346) |
| Peso (`dist/` del E2E, `gzip -9`) | `index-*.js` 251 991 B + `trabajador-*.js` 64 089 B = **316 080 B** (63,2 % de 500 000; +5 714 B desde la verificación final). `npm run presupuesto` sigue sin existir (`herramientas/presupuesto-tamano.ts`, tarea 5.9) |
| `npm run licencias`; dependencias | 9 de 9 permisivas y `AVISOS-DE-TERCEROS.md` idéntico; `package.json`, `package-lock.json` y `.nvmrc` sin cambios respecto a `main` |

---

### Regresión de los 53 conjuntos (451 355 programas; javac 17.0.18 con `-g`)

El encargo hablaba de 51 conjuntos; los informes que dejó mi verificación anterior son **53** y suman exactamente los 451 355 programas que cita la 1.36. Corrí `compilar()` del repositorio contra veredictos de javac **recalculados con `LoteMio -g`** (tres JVM en paralelo: unos 12 minutos de reloj, casi todo javac; mi campaña original, con la máquina saturada, tardó más de dos horas).

| Instrumento (propio) | Programas | javac compila / rechaza | Falsos aceptos | Falsos rechazos | Fallos internos | Línea igual cuando ambos rechazan |
|---|---|---|---|---|---|---|
| A mano (c01–c24, `humo`) | 1 701 | 587 / 1 111 | **0** (antes 8) | **0** (antes 3) | 0 | 988/988 |
| Plegado de constantes y líneas sin cubrir (c25–c30) | 1 170 | 525 / 645 | **0** (antes 25) | **0** (antes 8) | 0 | 402/402 |
| Límites del archivo, `package` y puntos (c31, c32, `lim`, `pk`, `vd`, `vd2`) | 168 | 86 / 81 | **0** (antes 43) | 0 | 0 | 77/77 |
| Carácter × posición: muestra y TODO el BMP | 192 483 | 49 845 / 142 638 | 0 | **0** (antes 235) | 0 | 142 633/142 635 |
| Importaciones de todas las clases del JDK | 24 044 | 4 703 / 19 341 | 0 | 0 | 0 | 19 341/19 341 |
| Matriz valor × contexto y escapes | 23 181 | 6 719 / 16 433 | 0 | 0 | 0 | 13 848/13 848 |
| Mutador propio, tandas 1 y 2 (9 conjuntos) | 136 136 | 49 866 / 86 267 | **0** (antes 1) | **0** (antes 139) | 0 | 80 056/81 672 |
| Generador propio de válidos largos y su mutador | 25 600 | 7 310 / 18 290 | 0 | 0 | 0 | 15 584/16 170 |
| Fuzz de separadores (cada frontera × 18 separadores) | 46 872 | 26 362 / 20 510 | **0** (antes 16) | **0** (antes 4 306) | 0 | 20 510/20 510 |
| **Total** | **451 355** | **146 003 / 305 316** | **0** (antes 93) | **0** (antes 4 691) | **0** | **293 439/295 643 (99,25 %)** |

Lecturas: (1) `-g` NO cambió ni un veredicto, código ni línea de javac en las 451 319 filas únicas; (2) la bajada de la línea de los conjuntos de mutación (2 362 → 2 204 diferencias) es la que declara la 1.36; (3) 585 de los 18 290 rechazos de `gv-mut-1` pasaron de error a aviso `programa-demasiado-grande`: son programas sintéticos largos de MI generador (mediana 1 794 tokens, p90 3 368, máximo 5 509; el 3,3 % pasa de 4 000) y el aviso es honesto; (4) `textoMalo` 0 en los 53 (ningún texto vacío, con `undefined`, `[object`, `${`, `NaN` ni `{{`).

---

### Búsqueda dirigida al delta de la 1.36 (programas NUEVOS míos, comparados con javac `-g`)

Método: leí el diff completo de producción de la 1.36 (`compilador.ts`, `fines-de-linea.ts`, `limites.ts`, léxico, sintaxis, `constantes.ts`, `alcanzabilidad.ts`, `asignacion-definitiva.ts`, `switch.ts`, `atribucion.ts`, `limites-del-archivo.ts`, `posiciones-de-javac.ts`) y armé un instrumento por cada decisión que toma, con gramática distinta de la de los instrumentos de las tareas y de la de mi verificación anterior. Las campañas de mutación usan SEMILLAS NUEVAS y **no excluyen** las familias ya cerradas (`--sin-conocidas` apagado): los operadores que antes producían C-1/C-2/W-1 ahora corren contra el código corregido.

| Conjunto | Qué barre | Programas | javac compila / rechaza | FA | FR | FI | Línea igual |
|---|---|---|---|---|---|---|---|
| `d01-eol` | CR, LF, CRLF, LFCR y CRCRLF mezclados (al azar y uniformes) en un programa de 8 líneas con 9 clases de error en la 5; el separador DENTRO de 21 construcciones (comentarios, textos, caracteres, bloques de texto, escapes y entre tokens); U+2028/2029/0085/000B/000C… (no son fin de línea en Java); bordes del archivo (vacío, solo `\r`, sin fin de línea final, comentario sin cerrar) | 4 660 | 737 / 3 923 | 0 | 0 | 0 | **3 916/3 916** |
| `d02-ign` | 34 ignorables y 23 parecidos que NO lo son, en 111 plantillas (identificadores, palabras clave, `String`/`main`/`System.out.println`, `package`/`import`, literales, textos, comentarios, `...`, al principio, en medio y al final de un nombre, dos y tres seguidos, `U+001A` en cada posición; 6 327 programas), 28 mutaciones al azar de cada uno de 345 programas reales (9 643) y una matriz exhaustiva (token × posición × 10 caracteres; 910) | 16 880 | 3 817 / 13 063 | 0 | 2 (W-11b) | 0 | 12 485/12 725 |
| `d03-elipsis` | 50 formas distintas de escribir los tres puntos (pegados, con espacios, 1+2, 2+1, comentario o salto entre ellos, escape Unicode, `…`, `final`, corchetes) × 7 tipos en `main`, con más parámetros, en otros métodos, constructores y genéricos, y en expresiones, literales y comentarios | 1 222 | 345 / 877 | 0 | 19 (W-11a) | 0 | 758/800 |
| `d04-package` | los **844 paquetes** de `jrt:/`, sus 105 prefijos, 3 491 variantes, las **14 903 clases de primer nivel** (distintas) como nombre de paquete, 78 formas de escribirlo (comentarios, saltos, ignorables, escapes, anotaciones, duplicado, tras `import`, dentro de la clase…) y 45 nombres típicos de NetBeans y de un curso, con y sin `Scanner` | 19 511 | 19 056 / 455 | **34 (C-6)** | 0 | 0 | 283/283 |
| `d05-const` | 43 expresiones de texto con `double`/`float` (con `char`, `long`, `boolean`, variables `final` encadenadas) × 26 formas de condición (`==`, `!=`, `!`, `&&`, `\|\|`, `&`, `\|`, `^`, casts) × 32 contextos (`while`, `do`, `for`, asignación definitiva en 14 formas, `final boolean`, …), más 691 `switch` de texto (duplicados, con `final`), 576 cadenas de `final` y 832 condiciones de valor conocido | 37 832 | 20 536 / 17 296 | 0 | 0 | 0 | 787/787 |
| `d06a`, `d06b`, `d06c` (y `d06e`: 250 programas con el lado izquierdo de `&&`/`\|\|` de valor desconocido, 0/0/0) | la FRONTERA de 65 531 a 65 538 bytes con `a`, `é`, `€` y 😀 (y 65 533 a 65 536 caracteres) en 22 + 30 + 32 contextos: inicializador, `final` sin uso, `println`, `+=`, receta con `int`/`long`/`double`/`char`/`boolean`, constantes plegadas entre `final`, receta con dos literales, `if` con condición constante o variable, `&&`/`\|\|` con lado constante, `switch` de texto, `for`, `do`, campos y métodos (aviso) | 1 006 + 1 320 + 640 | 1 365 / 1 601 | 0 | 0 | 0 | 1 401/1 401 |
| `d06d` | el reparto de la receta a 200 ranuras (`int` y `char` 195–203 operandos; `long`/`double` 96–102) × 19 tamaños de la constante entre 65 300 y 65 536 bytes × 3 posiciones | 1 881 | 1 074 / 807 | 0 | 0 | 0 | 807/807 |
| `d07-tope` | **3 990…4 010 tokens exactos** (3 999, 4 000, 4 001 y seis más) con 12 rellenos (`;`, `println`, declaraciones, `switch`, sumas, bloques y paréntesis anidados, `else if`…), válidos y con 6 errores al principio y al final | 432 | 109 / 323 | 0 | 0 | 0 | 179/179 |
| `d08-dens` | las 37 construcciones más densas con **2 000, 3 000 y 4 000 tokens** (`switch` de texto con etiquetas solas o con colisiones de `hashCode`, `printf` con miles de argumentos, concatenaciones, `+=`…) y sondas de `limit.parameters`, `limit.dimensions` y `try`/`finally` | 146 | 114 / 32 | 0 | 0 | 0 | 12/12 |
| `d09-misc` | duplicados de `case` con plegado conocido (texto, `int`, `char`, `long`), `final` a través de ámbitos (el símbolo con su constante debe morir con su bloque) y 74 condiciones de borde (división por cero, desbordes, `(char) -1`, `Math.PI`, NaN…) en 5 contextos | 531 | 113 / 418 | 0 | 0 | 0 | 285/285 |
| `d10b-qual` | el nombre CALIFICADO de las 14 909 clases del JDK (públicas o no, exportadas o no) como tipo de una variable y como cast | 16 400 | 4 317 / 12 083 | 0 | 0 | 0 | 10 985/10 985 |
| `d11-cazar` | **27 999 árboles de constantes al azar** (6 tipos, finales encadenados, variables NO constantes mezcladas, `&&`/`\|\|`/`!`/`&`/`\|`/`^`/casts/paréntesis) en 10 contextos y en `switch` de texto | 27 999 | 14 207 / 13 792 | 0 | 5 (W-11c) | 0 | 12 218/12 218 |
| `mut-d1` … `mut-d5` | mutador propio con semillas nuevas: 52 programas largos × 300; 640 cortos × 60; **los 35 del currículo × 400**; equivalencia × 150; mis 600 programas válidos largos × 40 | 15 652 + 39 040 + 14 035 + 7 852 + 24 600 | 4 894+4 952+4 301+7 572+9 171 / 10 758+34 085+9 734+280+15 429 | 0 | 0 | 0 | 9 973/10 128; 31 232/31 762; 9 090/9 249; 269/269; 13 505/13 957 |
| **Total de lo nuevo** | | **231 639** | **96 680 / 134 956** | **34** | **26** | **0** | **108 185/109 763 (98,56 %)** |

(El primer intento de `d10` usaba `= null` y lo enmascaraba el aviso `null-no-soportado` en 12 083 de 17 891 programas; lo descarté y lo rehíce sin `null`: el que cuenta es `d10b`.) Todos los 34 falsos aceptos son de UNA familia (C-6); los 26 falsos rechazos son de tres familias contrivadas y **preexistentes** (W-11); hay 0 fallos internos en este arnés (ver W-12 para la pila real).

**Tiempos** (con una pila de 3 MB para que las formas anidadas no lancen). `d07-tope` y `d08-dens` llevan 578 programas de hasta 4 000 tokens: `compilar()` tarda 2,1 ms de mediana y **668 ms como máximo** (una concatenación de 2 000 operandos: cuadrática; 0,2–0,4 s antes de la 1.36 y 0,4–0,7 s ahora, porque la pasada nueva recorre la cadena otra vez; irrelevante para clase). Con 20 000 declaraciones locales (S-1): **35,7 ms** (antes 11 395 ms); con 796, las que caben, 13 ms.

---

### CRITICAL: un falso acepto (javac rechaza, `compilar()` da `ok` o `ejecucion-no-disponible`)

**C-6. Residuo de C-3: `package java.lang.<clase no pública>;` y `package java.lang.runtime.SwitchBootstraps;` se aceptan (34 programas).** javac 17.0.18 (con y sin `-g`): `compiler.err.pkg.clashes.with.class.of.same.name` («package java.lang.Shutdown clashes with class of same name»), en la línea del `package`; `compilar()`: **`ok` en los 34** (sus programas llevan un `println` de un literal, que el lote 0 ya ejecuta; con `int x = 5;` o `Scanner` en `main` daría `ejecucion-no-disponible`, «Tu programa pasó todas mis revisiones…»; con `main` vacío, `ok`).
- **Mínimo:** `package java.lang.Shutdown;⏎public class P { public static void main(String[] args) { System.out.println("x"); } }`.
- **Los 34 nombres:** de `java.lang`: `AbstractStringBuilder`, `ApplicationShutdownHooks`, `AssertionStatusDirectives`, `CharacterData`, `CharacterData00`, `CharacterData01`, `CharacterData02`, `CharacterData03`, `CharacterData0E`, `CharacterDataLatin1`, `CharacterDataPrivateUse`, `CharacterDataUndefined`, `CharacterName`, `CompoundEnumeration`, `ConditionalSpecialCasing`, `FdLibm`, `LiveStackFrame`, `LiveStackFrameInfo`, `NamedPackage`, `ProcessEnvironment`, `ProcessHandleImpl`, `ProcessImpl`, `PublicMethods`, `Shutdown`, `StackFrameInfo`, `StackStreamFactory`, `StringCoding`, `StringConcatHelper`, `StringLatin1`, `StringUTF16`, `Terminator`, `VersionProps`, `WeakPairMap`; y `java.lang.runtime.SwitchBootstraps` (una clase de vista previa de JDK 17; lo medido es que javac rechaza ese nombre: mi hipótesis, sin comprobar, es que ya la tiene cargada al arrancar).
- **Evidencia (`d04-package`, 19 511 programas):** de los 455 rechazos de javac, 256 son `package.in.other.module` (los paquetes exportados: **0 falsos aceptos**, la corrección de la 1.36 funciona para TODOS) y 167 son `pkg.clashes.with.class.of.same.name`: 133 reciben su aviso honesto (`paquete-con-nombre-de-clase-no-soportado`, las clases públicas del catálogo) y **34 se aceptan**; los 32 restantes (errores de sintaxis del `package` y 2 anotaciones) coinciden. Fuera de `java.lang` javac sí COMPILA el nombre de una clase no pública (`java.util.ArraysParallelSortHelpers`, `java.io.FileSystem`, también con `import java.util.*;`) y el motor coincide: por eso solo salen estos 34.
- **Causa:** `atribucion.ts` decide con `existeClaseDelJdk` (`clases-jdk.generado.ts`), que solo conoce los tipos PÚBLICOS importables; lo medido es que javac rechaza el nombre de CUALQUIER clase de primer nivel de `java.lang` (y `SwitchBootstraps`) como paquete, sea pública o no; mi hipótesis, sin comprobar, es que las tiene cargadas al arrancar.
- **Alcance real: nulo, pero con las consecuencias de un falso acepto.** Nadie escribe `package java.lang.Shutdown;`. Con un `println` de un literal el visualizador lo EJECUTA hoy (`ok`: se ve «x» en la consola de un programa que NetBeans no compila); con otras sentencias el alumno lee el aviso de `ejecucion-no-disponible`, y desde el lote 2 se ejecutaría cualquier programa así.
- **Corrección propuesta (datos, ≈ 5 líneas + guarda):** que el oráculo mida `package <clase>;` para cada clase de primer nivel de `jrt:/` y guarde la lista de los 167 nombres que javac rechaza (los 133 públicos ya avisan; los 34 faltantes bastan con el mismo aviso, que es honesto, o con un error propio); sumar `d04` (reducido a esos 167 y a una muestra de los 256 exportados) al corpus con goldens.

---

### WARNING nuevos (W-11 y W-12 PREEXISTENTES en lo esencial —mismo veredicto en la producción padre; W-12 detalla las dos formas que la 1.36 empeoró—; W-13 es de documentación)

**W-11. Tres familias de falsos rechazos contrivadas (26 programas).** javac compila; `compilar()` da error de sintaxis. (a) **El tercer punto de la elipsis como escape Unicode** (19 programas de `d03`): `public static void main(int..\u002e args)` — javac traduce el escape y lee `...`; el motor ve dos puntos y un escape y responde «la lista de parámetros no es válida aquí». (b) **Dígitos Unicode no ASCII dentro de un escape** (2 de `d02`): `"\u00٠41"` (`U+0660`) y `"\u00０41"` (`U+FF10`): javac los toma por dígitos hexadecimales (`Character.digit`) y el motor pide cuatro dígitos ASCII. (c) **`(boolean)` sobre una condición con asignación definitiva** (5 de `d11`; mínimo verificado con javac y con `compilar()`): `boolean vb = true; int x; if ((boolean) (vb || true)) x = 1; System.out.println(x);` — javac compila (mi hipótesis, sin comprobar: trata el *cast* como transparente para el análisis de asignación definitiva, y `x` queda asignada); `asignacion-definitiva.ts` no lo hace y da `variable-posiblemente-no-asignada`. Las tres exigen un escape Unicode o un *cast* a `boolean` que ningún alumno escribe; es la misma clase de borde que los escapes `\u` que la 1.35 ya dejó abiertos. Propuesta: tarea del lote 5 (con la precedencia léxico/sintaxis, W-6).

**W-12. Profundidad de anidamiento → `error-interno` (riesgo 9 del apply, ahora medido; la 1.36 lo empeora en dos formas).** El tope de 4 000 tokens NO acota la profundidad: cuando el anidamiento agota la pila, `compilar()` lanza `RangeError` (en Firefox, `InternalError`) y el trabajador lo convierte en el mensaje `error-interno` (degradación controlada, fijada a propósito por la 1.28: nunca un resultado falso).

*Node con la pila por omisión (≈ 984 KB), un proceso NUEVO por caso* (`pila-fria2.mjs`): 700 paréntesis anidados (≈ 1 430 tokens) y 1 500 llaves anidadas (≈ 3 030 tokens) ya lanzan. De las 21 formas que probé (llaves, paréntesis, sumas por la izquierda y por la derecha, concatenaciones, `&&`/`||`, `else if`, `while`/`if`/`do`/`for`/`switch` anidados, casts, negaciones, signos, llamadas y asignaciones en cadena, comparaciones), **9 lanzan en la profundidad máxima que cabe en 4 000 tokens** (llaves, paréntesis, `1 + (1 + (…`, `-(`, `!(`, comparaciones anidadas, asignaciones en cadena, `&&` y `||` encadenados) y 12 responden. El umbral depende del estado del JIT: un proceso que ya compiló cientos de programas aguanta más (en uno así solo lanzaron los paréntesis), de modo que las cifras son órdenes de magnitud y no constantes.

*Trabajador REAL* (Playwright sobre `dist/assets/trabajador-*.js`, un `Worker` nuevo por caso). «N / M» = la última profundidad que responde / la primera que falla entre 50, 100, 200, 300, 400, 600, 800, 1 000, 1 500 y 1 982 (las dos primeras filas vienen de una pasada anterior con otras profundidades: 50, 100, 200, 400, 600, 700, 800, 1 000, 1 200, 1 500, 1 800 y 1 990 para los paréntesis; 200, 600, 1 000, 1 500, 1 800 y 1 990 para las llaves):

| Forma | Chromium 153 | Firefox 155 | WebKit 26.6 |
|---|---|---|---|
| paréntesis anidados `a = ((((1))))` | 200 / 400 | 400 / 600 | 400 / 600 |
| llaves anidadas | 600 / 1 000 | 1 000 / 1 500 | 600 / 1 000 |
| `1 + (1 + (…` | 300 / 400 | 400 / 600 | 400 / 600 |
| `!(!(…` | 300 / 400 | 400 / 600 | 400 / 600 |
| comparaciones anidadas `(a < (a < …` | 300 / 400 | 400 / 600 | 400 / 600 |
| asignaciones en cadena `a = a = … = 1` | 1 000 / 1 500 | no falla (hasta 1 982) | 1 000 / 1 500 |
| `&&` o `\|\|` encadenados | 800 / 1 000 | 1 500 / 1 982 | 800 / 1 000 |

*Lo que cambió con la 1.36.* Comparé las 21 formas (proceso nuevo, misma pila) contra la producción del commit padre `0c2cfe9`: 7 de las 9 que lanzan lanzan IGUAL en el padre; las cadenas de `&&` y de `||` NO lanzaban en el padre hasta el tope (1 982 términos, 4 000 tokens) y ahora lanzan desde **1 777 términos (3 590 tokens)** en Node y desde ≈ 1 000 en Chromium y WebKit (en los navegadores no medí el padre). La pasada nueva de límites, o el tercer estado de las constantes, añade pila por operador. Es una regresión pequeña (nadie encadena mil `&&`), pero real, y la anoto como tal.

*Clasificación (criterio abierto).* La regla acordada pone «ningún fallo interno» entre los CRITICAL, y esto es, a la letra, un fallo interno alcanzable con un programa que cabe en el tope. Lo clasifico WARNING porque (1) ya figura en el apply como riesgo abierto 9 («abierto y ajeno») y su comportamiento (`error-interno`) lo fijó la 1.28 a propósito; (2) exige cientos de niveles que ningún programa de clase tiene: los 35 programas del currículo del repo tienen como máximo 265 tokens en total, y cada nivel necesita al menos dos; (3) degrada de forma controlada y nunca produce un resultado falso. Es una decisión de clasificación MÍA: si el PO lee la regla al pie de la letra, W-12 también es CRITICAL y su arreglo entra en la 1.37.

Es por esto que mi verificación anterior decía «0 fallos internos con anidamientos de 100 a 3 000 niveles»: mi arnés corría el motor con una pila de 8 MB; con la pila real el hallazgo existe. Propuesta: aviso `programa-demasiado-anidado` a partir de un tope de profundidad (p. ej. entre 100 y 200 niveles: un contador en el analizador, barato y fuera del currículo) o un analizador iterativo, en el lote 5 (o en la 1.37, si el PO decide leer la regla al pie de la letra); hasta entonces el riesgo 9 sigue abierto y documentado.

**W-13. La documentación no recoge lo que agregó la 1.36.** ADR 004 y `design.md` §2.1 dicen «cuatro pasadas en el orden de javac (más el arranque)»; la 1.36 añadió una quinta (`semantica/limites-del-archivo.ts`, «pasada 5 de ADR 004» según su propia cabecera), el tope de tamaño de programa (4 000 tokens, aviso `programa-demasiado-grande`: una decisión del PO) y el tercer estado de las constantes (`ConstanteDeValorDesconocido`, `design.md` §2.7): `grep` sobre `docs/`, `design.md`, `proposal.md` y `specs/` da 0 coincidencias (la 1.34 y la 1.35 sí actualizaron `design.md`). Propuesta: actualizar ADR 004 y `design.md` §2.1/§2.7/§9 en la misma tarea que cierre C-6.

(Los WARNING heredados siguen abajo, con su estado.)

### SUGGESTION nuevas

- **S-10. Las guardas del repo tienen cinco huecos que mis conjuntos sí cubren.** Hice 40 sabotajes sobre una copia de `HEAD` (cada uno edita producción, corre `npm test` y restaura): **34 los atrapa `npm test`** (fines de línea ×2, ignorables, `U+001A`, elipsis ×2, `package` ×3, constantes ×3, plegado ×4, alcanzabilidad ×3, asignación definitiva, `switch`, límites ×10, `esCastPermitido`, la lista de pasadas, el índice del tope) y **6 sobreviven**: (1) el valor del tope (4 001 o 3 999 en vez de 4 000: ninguna prueba lo fija; no produce falsos aceptos ni rechazos porque el aviso es honesto en los dos lados, pero cambia el producto); (2) el reparto de la receta a 201 ranuras en vez de 200; (3) el cuerpo de un `if` de condición NO constante no se visita en la pasada de límites (un texto largo ahí pasaría); (4) la actualización de un `for` no se genera; (5) `valorSiSeSabe` sin filtrar lo desconocido (equivalente: lo desconocido solo puede ser texto o `boolean`, que nunca se estrechan). Con el código real mis conjuntos dan 0 falsos aceptos y 0 rechazos; con (2), `d06d` da **6 falsos aceptos y 72 rechazos**; con (3), `d06b` da **25 falsos aceptos**; con (4), `d06c` da **9**: la producción es correcta y mis programas fijan lo que el repo no. Propuesta: sumar `d06b`/`d06c`/`d06d` (reducidos) y `d07` (3 999/4 000/4 001 tokens) al corpus con goldens del oráculo.
- **S-11. Plan: restos de S-3.** `state.yaml` quedó con `updated: 2026-09-29` (su línea `apply` ya recoge 1.34–1.36 y los 122); `openspec/config.yaml` `context` sigue diciendo «lote 0 … tareas 0.1-0.15 hechas». Los conteos del plan (122) y `CLAUDE.md` (122; `lint` ya dice «sin autofix») están al día.
- **S-12. Aserciones.** 29 archivos de prueba cambiados por la 1.36 (1 340 pruebas, 2 122 `expect`): 0 tautologías, 0 bucles fantasma (los 16 bucles sin guarda visible recorren constantes o están guardados por un `toEqual` previo), 4 `vi.fn` frente a 208 `expect`; 18 aserciones «de solo tipo» (`main` `not.toBeNull()` en `analizador-sintactico.test.ts`: ganarían con la forma del parámetro, como ya se anotó).

---

### WARNING heredados de la verificación final y estado de cada hallazgo

| Hallazgo de la verificación final (1.1–1.35) | Estado hoy | Evidencia |
|---|---|---|
| **C-1** `String . . . args` y variantes | **CERRADO** | `vd`/`sep-a`/`mut-eq-2`: 8+16+1 falsos aceptos → 0; `d03` (1 222): 0 falsos aceptos (queda W-11a, un escape Unicode) |
| **C-2** `\r` suelto | **CERRADO** | `c20`: 6 → 0; `d01` (4 660): 0/0/0 con la línea igual en 3 916/3 916; el sabotaje S01 lo atrapan 33 pruebas |
| **C-3** `package java.util;` y todo paquete exportado | **CERRADO en lo que describía; queda el residuo C-6** | `pk` 20 → 0; `d04`: los 256 `package.in.other.module` sin un solo falso acepto |
| **C-4** límites del archivo de clase | **CERRADO** (el `limit.code` lo cubre el tope, medido) | `c31`/`c32`/`lim` 15 → 0; `d06a/b/c/d` (4 847): 0/0/0 al byte; la `final` sin uso con `-g` coincide con javac `-g`; la construcción más densa a 4 000 tokens usa **38 148 B de 65 535 (58 %)** |
| **C-5** constante de texto con `double` | **CERRADO** | `c27` 20 → 0, `c28` 5 → 0; `d05` (37 832) y `d11` (27 999): 0 falsos aceptos; 12 231 + 377 avisos honestos |
| **W-1** ignorables en identificadores | **CERRADO** | `lx-bmp` 97 → 0, `lx-matriz` 138 → 0, `sep-a`/`sep-b` 4 306 → 0; `d02` (16 880): 0 falsos aceptos |
| **W-2** `\r` en un comentario y `U+001A` final | **CERRADO** | `c10` 3 → 0 |
| **W-10** constantes de texto con `double` en `case`/condición | **CERRADO** | `c25` 2 → 0, `c28` 6 → 0 |
| W-3 jerga de `error-no-clasificado` | **ABIERTO, sin cambio** | re-medido sobre los 2 411 mutantes: 1 133 = **47,0 %**; «token» en 354 = **14,7 %**; 0 textos con restos técnicos. Revisión de textos del PO (5.11) |
| W-4 evidencia TDD sin tabla de 8 columnas | **ABIERTO (formato)** | `apply-progress` (#842, #839) trae narrativa y los 16 RED literales viven en `tasks.md`; reproducidos abajo |
| W-5 brechas de C8 | **ABIERTO** | `c23` (14 sondas): 14 `ejecucion-no-disponible` honestos; aviso propio en la 2.15 |
| W-6 precedencia léxico/sintaxis | **ABIERTO** | línea igual 99,25 % del total, 98,56 % de lo nuevo (97,6 %–98,3 % en mutantes); 0 falsos aceptos por esta causa |
| W-7 peso | **ABIERTO** | 316 080 B (63,2 %, +5 714 B); `presupuesto` inexistente (5.9); el motor duplicado (3.6) |
| W-8 CI remoto | **ABIERTO y ampliado** | 12 commits sin subir (`52adfdd`…`db50217`); el PR #2 en `1c8cf5b` con `ci` y `oraculo` verdes sobre ese SHA. Lo que hace `oraculo.yml` lo corrí a mano en verde |
| W-9 «y N más» | **ABIERTO (4.5)** | `src/interfaz` sin cambios |
| S-1 rendimiento cuadrático de las locales | **CERRADO** | 20 000 declaraciones: 11 395 ms → **35,7 ms** (tope de 4 000 tokens); con 796 declaraciones, el máximo que cabe, 13 ms |
| S-2 consejo de `palabra-reservada-como-nombre` | ABIERTO | 5.11 |
| S-3 conteos y estado del plan | **Casi cerrado** | `tasks.md` 122 (19+35+22+8+16+14+8) y «Resumen por lote» 122; `CLAUDE.md` 122; `state.yaml` con los 122 y 1.34–1.36, pero `updated` viejo (S-11) |
| S-4 `CLAUDE.md` decía «autofix» | **CERRADO** | `CLAUDE.md:53` «sin autofix» |
| S-5 `REQ-BIB-003` nombra `%e` | ABIERTO | `spec.md:56` |
| S-6 editor sin nombre accesible | ABIERTO (5.10) | `src/interfaz/editor/EditorJava.tsx` sin `aria-label` ni `contentAttributes` |
| S-7 `esCastPermitido` sin prueba directa | **CERRADO** | 64 pares en `tipos.test.ts`; el sabotaje que acepta cualquier par hace fallar **135 pruebas en 6 archivos** |
| S-8 tabla afinada por id de mutante | **DECIDIDO: se queda** | razón escrita en `mutantes.test.ts` (31 aceptados y 1 rechazado en el mismo par: una clave de javac no reproduce la auditoría); una entrada que deja de coincidir no pasa en silencio |
| S-9 brazos del plegado sin prueba | **CERRADO** | `plegado-de-constantes.test.ts` (176 filas con el JDK real, sin y con JDK); `constantes.ts` 85,62 % → 96,93 %; los sabotajes del `-`, `/`, división por cero entera y larga los atrapan 3, 2, 2 y 1 pruebas |
| Lote 0 W-4: E2E «sin red» en WebKit omitido | ABIERTO (1 omitida) | límite de Playwright |

---

### TDD estricto: reproducción del RED de la 1.36 y juicio

Método (el de las verificaciones anteriores): árbol temporal con la **producción y las herramientas del commit PADRE** (`0c2cfe9`) y encima las pruebas, el corpus y los helpers de prueba del HIJO (`git archive` a un directorio nuevo, sin tocar el repositorio). Una prueba nueva debe fallar contra la producción vieja por la razón que anota `tasks.md` y pasar contra la nueva.

| # | Capa de la 1.36 | Pruebas | Safety net | RED contra el padre (lo medido por mí) | GREEN hoy | Triangulación |
|---|---|---|---|---|---|---|
| 1 | C-1 elipsis | `analizador-lexico`, `analizador-sintactico`, `bordes-del-archivo-del-corpus` | `npm test` de `0c2cfe9`: 66 archivos / 3 961 | léxico 117 fallan de 242 (10 de C-1 + 106 de W-1/W-2b + 1); sintaxis 16 de 115; corpus 80 de 115 (acumulado de los ítems 1, 2 y 5; los ciclos anotan 10/126, 12/112 y 18/25) | ✅ | 12 formas inválidas + 5 válidas, y 8 variantes con comentario o salto |
| 2 | C-3 `package` | `analizador-sintactico`, `atribucion`, textos `problemas` y `no-soportado`, corpus | ídem | `atribucion` 32 fallan (el ciclo anota 25: 20 paquetes que javac rechaza + 5 nombres de clase), textos 7 + 20, `textosProblemas.paquete-del-jdk is not a function` | ✅ | 20 paquetes, 5 nombres de clase, 3 propios |
| 3 | W-1 ignorables y W-2b `U+001A` | `analizador-lexico` | ídem | `Tests 106 failed \| 136 passed (242)` (97 = uno por punto de código ignorable del BMP) | ✅ | 97 puntos + palabra clave partida + inicio de token |
| 4 | W-1 la tabla sale del oráculo (JDK real) | `generar-datos.test.ts` (proyecto `oraculo`) | `test:oraculo` de `0c2cfe9`: 28 / 766 + 1 | **5 fallan \| 58 pasan (63), EXACTO** a `tasks.md` («se leyeron 3,4 rangos…») | ✅ | los bordes de cada rango con javac real |
| 5 | C-2/W-2a `\r` suelto | `fines-de-linea.test.ts`, `compilador.test.ts`, corpus | ídem | `Cannot find module './fines-de-linea.ts'` (EXACTO) y `compilador.test.ts` no carga (importa `limites.ts`); corpus 17 | ✅ | 5 separadores × 20 contextos |
| 6 | C-5/W-10 tercer estado | `constantes`, `alcanzabilidad` 11, `asignacion-definitiva` 11, `atribucion`, corpus de constantes desconocidas | ídem | `constantes.test.ts` **27 fallan \| 73 pasan (100), EXACTO**; corpus **18 fallan, EXACTO** | ✅ | 26 programas con goldens; 12 de C-5 y 6 de W-10 |
| 7 | C-4b/S-1 tope | `limites.test.ts`, textos | ídem | `Cannot find module './limites.ts'` (EXACTO) y textos 6 | ✅ | tope − 1, tope y tope + 1 |
| 8 | C-4a (1) campos del árbol | `expresiones` 5, `analizador-sintactico` (acumulado 16) | ídem | `expresiones.test.ts` 5 fallan (el ciclo anota 7 entre las dos pruebas: `rangoDelOperador` y `rangoDeLaPalabraClass`) | ✅ | |
| 9 | C-4a (2) posición de javac y pasada | `posiciones-de-javac`, `limites-del-archivo`, textos | ídem | `Cannot find module` ×2 (EXACTO) | ✅ | 15 + 54 pruebas |
| 10 | C-4a (3) `-g` | `limites-del-archivo.test.ts` | ídem | no carga contra el padre (su módulo no existe); el RED del ciclo era 1 prueba | ✅ | |
| 11 | C-4a (4) corpus con goldens | `limites-del-archivo-del-corpus.test.ts` | ídem | **116 fallan de 151, EXACTO** | ✅ | 92 programas |
| 12 | S-7 `esCastPermitido` | `tipos.test.ts` | ídem | pasa contra el padre (RED = sabotaje): mi sabotaje → **135 fallos en 6 archivos** | ✅ | 64 pares |
| 13 | S-9 plegado | `plegado-de-constantes.test.ts` (sin y con JDK) | ídem | RED = sabotajes: mis 4 sobre `constantes.ts` los atrapan 3, 2, 2 y 1 pruebas | ✅ | 176 filas |
| 14 | Muestras de avisos 68–71 | `catalogo`, `avisos-textos`, `programas-validos`, `programas-invalidos`, `corpus-avisos` | ídem | 2 + 2 + 1 + 1 (`expected 67 to be greater than or equal to 71`) | ✅ | 4 muestras |
| 15 | `CompiladorEnLote` con `-g` | `compilar-en-lote.test.ts` (JDK real) | ídem | **1 falla \| 5 pasan (6), EXACTO** | ✅ | |
| 16 | El generador ve las familias | `generados/estructuras.test.ts` | ídem | **6 fallan \| 147 pasan, EXACTO** (`no hay una forma llamada «main-con-puntos-separados»`…) | ✅ | 43 formas |

Total contra el padre: **646 pruebas fallan en 18 archivos y 5 archivos no cargan** (proyectos `motor` + `interfaz`; 642 sin las 4 de `gitattributes.test.ts`, que fallan siempre en un árbol sin `.git`) y **12 en 3 archivos** del proyecto `oraculo`. **Juicio: CUMPLE.** Cada capa nueva tiene su RED real contra el código anterior, por la razón concreta que `tasks.md` declara (en 8 de 16 filas con el MISMO conteo o el mismo error que el literal pegado —filas 4, 5, 6, 7, 9, 11, 15 y 16—; en el resto las cifras acumulan varios ciclos y son coherentes), y su GREEN confirmado por mi `npm test` (4 966/4 966) y mi `test:oraculo` (866 + 1). Las dos tareas de guarda sin RED natural (S-7, S-9) quedan probadas por sabotaje (S29–S33: atrapados). **Desviación declarada y heredada:** `apply-progress` sigue sin la tabla de 8 columnas (W-4, formato); la reconstruí arriba leyendo cada prueba. Con la regla literal de `strict-tdd-verify.md` («si no hay tabla: CRITICAL») esto sería un CRITICAL de formato; mantengo el criterio de las verificaciones anteriores (WARNING: el protocolo SÍ se siguió y lo reproduje independientemente).

**Calidad de aserciones** (Paso 5f): ver S-12: 0 CRITICAL, 0 WARNING, 1 SUGGESTION. **Distribución de capas:** unitarias (motor, textos), de integración (corpus con goldens del oráculo, pantalla) y de oráculo (JDK real); el E2E existente cubre la pantalla de problemas. **Métricas de calidad:** lint 0, tipos 0.

---

### Definición de Terminado (`proposal.md` §13) aplicada a lo que agrega la 1.36

1. **Sin TODO, mocks ni demos en producción:** **CUMPLE** (mejora respecto de la verificación anterior). `grep` sobre `src/` sin pruebas: ningún `FIXME`/`XXX`/`HACK`; «TODO» solo como palabra española de énfasis; ni `fetch(`, ni `XMLHttpRequest`, ni `http(s)://`. El *stub* que daba C-5 (`textoDoubleTemporal`) está retirado y reemplazado por el tercer estado honesto.
2. **TDD estricto:** CUMPLE (RED reproducido de 16 de 16 capas; W-4 de formato).
3. **`npm test`, lint y tipos en verde con salidas acotadas; CI verde:** CUMPLE en local (4 966; `test:oraculo` 866 + 1; lint y tipos 0; E2E 17 + 1); **el CI remoto de los 12 commits no corrió** (W-8).
4. **Textos en español de México, del catálogo, con el tono de §1:** CUMPLE. Los siete textos nuevos (`paquete-del-jdk`, `texto-con-demasiados-caracteres`, `texto-con-demasiados-bytes`, `paquete-con-nombre-de-clase-no-soportado`, `constante-de-texto-con-decimal-no-soportada`, `programa-demasiado-grande`, `tamano-de-texto-no-revisable`) viven en `src/textos/es-MX/` y los leí tal como los ve el alumno: en español claro, sin jerga, sin afirmar que Java compiló el programa y con afirmaciones verdaderas (comprobé que «65 535 caracteres o más» y «más de 65 535 bytes» son exactamente los umbrales de javac, y que `programa-demasiado-grande` nombra la línea donde el programa se pasa). Pendientes de la revisión del PO (5.11). Observación de tono ya anotada por la tarea: «divídelo en varias instrucciones `System.out.print`» sirve si el texto se imprime.
5. **Accesible:** CUMPLE sin cambios (la 1.36 no toca `src/interfaz`; el E2E de problemas pasa).
6. **Cero red; dependencias y peso:** CUMPLE (0 dependencias nuevas, 9/9 permisivas, 316 080 B = 63,2 %; ver W-7 por la puerta automática).
7. **`main` desplegable:** CUMPLE en local (el E2E construye y pasa); el CI remoto de lo nuevo no corrió.
8. **Conventional commits sin atribución de IA, con confirmación explícita:** **CUMPLE**: los 30 commits `main..HEAD` son convencionales (`feat|fix|docs|test`), todos de Jorge Zepeda, 0 merges, **0 líneas** con `Co-Authored-By`, `Claude`, `Anthropic`, `generated`, `AI`, `Copilot` ni `GPT` en asunto o cuerpo (`33e502e`: «fix(motor): bordes del léxico, del archivo y constantes desconocidas (1.36)»; `db50217`: «docs(sdd): conteos del plan (122 tareas) y comentario de lint al día»).

**Coherencia del plan:** 73 requisitos y 96 escenarios; `tasks.md` con **122 tareas** (lote 0: 19; lote 1: 35; lote 2: 22; lote 3: 8; lote 4: 16; lote 5: 14; lote 6: 8) y su «Resumen por lote» al día; **54 `✅ hecha`** (lotes 0 y 1 completos); la entrada de la 1.36 trae sus 16 RED literales, el GREEN por capas, la decisión por hallazgo, los textos nuevos y los sabotajes; `CLAUDE.md` dice 122; `state.yaml` (no lo toqué) recoge 1.34–1.36 y termina en «siguiente: verificación del delta, luego pedir al PO subir los commits al PR #2 y mergear» (`updated` viejo: S-11); `.github/workflows/oraculo.yml` coherente (todos sus comandos existen y coinciden con los que corrí); falta recoger la 5.ª pasada, el tope y el tercer estado en ADR 004 y `design.md` (W-13). Criterio de salida del lote 1 (`tasks.md`): CUMPLE en lo que mide; **REQ-COMP-006** («ni más estricto ni más permisivo») se cumple salvo C-6 y los bordes contrivados de W-11; C7 (100,00 / 98,88 / 89,22) y C8 siguen cumpliendo.

---

### Riesgos para el PO

1. **Un falso acepto cuesta más desde el lote 2** (hoy solo se ejecuta el `println` de un literal, que el 34/34 de `d04` ya hace; desde el lote 2, cualquier programa así), pero este es de alcance nulo: ningún alumno escribe `package java.lang.Shutdown;` y el arreglo son datos del oráculo.
2. **Los instrumentos del equipo y los míos miden lo que su gramática puede producir.** La 1.36 llegó a 0/0 en los 451 355 programas que la motivaron y siguió en 0 falsos aceptos en 231 639 programas nuevos salvo el único instrumento exhaustivo sobre `package`: la lección de las cuatro verificaciones anteriores se repite una vez más, ahora con un residuo de datos y no de lógica.
3. **El tope de 4 000 tokens es una decisión de producto, no de corrección**: los 35 programas del currículo del repo llegan a 265 tokens (6,6 % del tope; media 81) y el más grande de `corpus/compilacion` a 4 276 (la muestra deliberada 70), pero mis programas largos sintéticos lo pasan en el 3,3 % de los casos y no tengo programas reales de alumnos de 300 a 600 líneas. Un programa de 4 001 tokens recibe «demasiado grande» en vez de una revisión (honesto). Conviene validarlo en la 5.14.
4. **Pila:** W-12 — `error-interno` con cientos de niveles de anidamiento (400 paréntesis anidados en Chromium; ≈ 1 000 `&&` encadenados, que la 1.36 empeoró); preexistente en lo esencial y fuera del currículo, pero a la letra encaja en «ningún fallo interno»: decisión de clasificación del PO.
5. **CI remoto sin correr** para los 12 commits: lo que hace `oraculo.yml` lo corrí a mano en verde, pero la regla «`main` siempre desplegable» pide verlo verde **antes** del merge.
6. **Revisión de textos del PO (5.11) pendiente** para los siete textos nuevos y los de 1.32–1.35.

### Opciones para el PO (con su consecuencia)

La regla acordada era binaria («sin CRITICAL, el lote 1 cierra y los WARNING pasan a tareas posteriores»); la apliqué sin excepciones y da **FAIL**. Con el mismo rigor hay que decir que la cláusula «ningún fallo interno» también encaja, a la letra, en W-12 (`error-interno` con cientos de niveles de anidamiento); lo traté como WARNING por las tres razones que da su ficha y lo dejo a su decisión: si el PO lo lee como CRITICAL, la 1.37 de la opción A incluye un tope de profundidad. Lo que sigue es lo que el PO puede decidir con los datos de arriba; ninguna opción es mía de elegir.

| | Qué se hace | A favor | En contra |
|---|---|---|---|
| **A. Tarea 1.37 acotada y cerrar** (la que yo recomendaría) | «El nombre de un paquete que choca con una clase de `java.lang`»: que `oraculo:datos` mida `package <clase>;` para cada clase de `jrt:/` y guarde los 167 nombres que javac rechaza (los 133 públicos ya avisan; con los 34 basta el mismo aviso o un error propio); RED = los 34 programas de `d04` como corpus con goldens; actualizar ADR 004 y `design.md` §2.1/§2.7 (W-13); sumar `d06b/c/d` y `d07` como guardas (S-10). Verificación acotada: re-correr `d04` (2 min), los 53 conjuntos (≈ 12 min con 3 JVM) y el generador → **PASS WITH WARNINGS** esperado | Cumple la regla tal cual; es una tarea de datos con un RED ya escrito (mis programas); deja el lote 1 sin falsos aceptos conocidos | Una tarea y una verificación más (≈ 1,5 h) antes del merge |
| **B. Mergear ya, con aceptación escrita** | El PO anota en `state.yaml` (`decisiones_po`) que acepta C-6 como límite conocido de alcance nulo y la 1.37 pasa al inicio del lote 2 | Desbloquea el merge hoy; el resultado para esos 34 programas es el aviso «todavía no sé ejecutar» | Se aparta de la regla acordada (decisión del PO, no una corrección mía); a partir del lote 2 esos programas se ejecutarían; hay que acordarse de la 1.37 |
| **C. Subir y mergear tras el CI remoto con A hecha a medias** | Solo los datos (sin ADR ni guardas) y la verificación del `d04` | La mitad del trabajo | Deja W-13 y S-10 sin atender |

En cualquier caso: **subir los 12 commits y esperar `ci` y `oraculo` verdes en GitHub antes del merge** (W-8); los WARNING nuevos y los heredados pasan a las tareas con nombre de la tabla de abajo.

### Tareas propuestas para los hallazgos nuevos y los que siguen abiertos

| Hallazgo | Propuesta |
|---|---|
| **C-6** | **1.37** (arriba) |
| W-13 documentación | en la 1.37: ADR 004 («cinco pasadas»), `design.md` §2.1, §2.7 y §9 (tope y tercer estado) |
| S-10 guardas | en la 1.37: `d06b/c/d` reducidos y `d07` al corpus con goldens (y que `plegado-de-constantes` conserve su tabla) |
| W-11 tres bordes contrivados | lote 5, con W-6 (léxico perezoso: un `.` y un dígito Unicode se traducen donde javac los traduce) y una prueba del cast en `asignacion-definitiva.ts` |
| W-12 pila | lote 5: aviso `programa-demasiado-anidado` (profundidad máxima: un contador en el analizador) o analizador iterativo; cuantificado arriba. **Si el PO lee «ningún fallo interno» al pie de la letra, entra en la 1.37** |
| S-11 plan | orquestador: `state.yaml` `updated`, `openspec/config.yaml` `context` |
| W-3, S-2, S-5 | 5.11 (cierre del catálogo es-MX) y enmienda de una línea a REQ-BIB-003 |
| W-5 | 2.15 |
| W-6 | lote 5 |
| W-7 | adelantar 5.9 (`presupuesto`) al lote 2; 3.6 deduplica el motor |
| W-8 | acción: `push` y esperar `ci` y `oraculo` verdes |
| W-9, S-6 | 4.5, 5.10 |

---

### Límites de esta verificación (lo que NO pude comprobar)

CI remoto en GitHub (los 12 commits no están subidos); E2E «sin red» en WebKit (omitida desde el lote 0); `test:navegadores` (llega con la 2.22); `npm run presupuesto` (no existe, 5.9); el comportamiento de NetBeans en Windows (uso JDK 17 de macOS: Temurin 17.0.18); la revisión de textos con un docente (5.11, 5.14); programas reales de alumnos de más de 300 líneas (no hay corpus: el tope de 4 000 tokens se juzga con los programas del currículo del repo y con los míos sintéticos). Mi campaña de tiempos se midió con la máquina cargada por mis propios procesos (carga de 15 a 38 sobre 8 núcleos): los tiempos de `oraculo:verificar` (400 s) y de las campañas no son los de una máquina en reposo; los veredictos sí lo son.

---

### Issues Found

**CRITICAL** (un falso acepto; la regla acordada lo hace bloqueante; alcance nulo):
- **C-6** `package java.lang.<clase no pública>;` (33 clases) y `package java.lang.runtime.SwitchBootstraps;`: javac `pkg.clashes.with.class.of.same.name`, `compilar()` `ok`/`ejecucion-no-disponible`. Residuo de C-3: `atribucion.ts` solo conoce las clases públicas del catálogo.

**WARNING** (deben arreglarse, no bloquean): **W-11** tres familias de falsos rechazos contrivadas y preexistentes (tercer punto como `.`, dígitos Unicode no ASCII en un escape, `(boolean)` en una condición con asignación definitiva); **W-12** `error-interno` con 400–700 paréntesis, 1 000–1 500 llaves o ≈ 1 000 `&&`/`||` encadenados (preexistente en 7 de las 9 formas que lanzan; la 1.36 empeoró las cadenas de `&&`/`||`; medido en tres navegadores; **a la letra de «ningún fallo interno» sería CRITICAL: criterio del PO**); **W-13** ADR 004 y `design.md` sin la 5.ª pasada, el tope y el tercer estado; heredados: **W-3** jerga (47,0 %; «token» 14,7 %), **W-4** tabla TDD, **W-5** C8, **W-6** línea (99,25 %), **W-7** peso (316 080 B), **W-8** CI remoto (12 commits), **W-9** «y N más».

**SUGGESTION**: **S-10** seis sabotajes sobreviven a `npm test` (el valor del tope, la receta a 200 ranuras, el cuerpo de un `if` no constante, la actualización de un `for`, uno equivalente) y mis conjuntos los atrapan; **S-11** `state.yaml` `updated` y `config.yaml` `context`; **S-12** aserciones (18 de solo tipo); heredadas: S-2, S-5, S-6.

---

### Verdict

**FAIL**

Por la regla de cierre acordada con el PO (**cualquier falso acepto es CRITICAL**): una familia, 34 falsos aceptos entre 231 639 programas nuevos y 0 entre los 451 355 de los instrumentos que motivaron la 1.36, todos en `package java.lang.<clase no pública>`; ninguno alcanzable por un error realista de un alumno y de arreglo de datos. El resto, en verde y medido: **C-1, C-2, C-4, C-5, W-1, W-2, W-10 y la parte exportada de C-3 CERRADOS** (0 falsos aceptos, 0 falsos rechazos, 0 fallos internos en mi arnés —pila de 3 MB; W-12 trae los de la pila real— y 0 *timeouts* en 451 355 programas, con la línea en 99,25 %), 0 resultados inventados, `npm test` 4 966/4 966, `test:oraculo` 866 + 1, E2E 17 + 1, lint y tipos en 0, mutantes 100,00 / 98,88 / 89,22 %, generador (CI y nocturno de 40 000) sin una sola discrepancia, regeneraciones del oráculo idénticas, RED reproducido en las 16 capas, commits convencionales sin atribución de IA y plan en 122. **Mi expectativa, a confirmar con una verificación acotada: con la 1.37 (opción A) el lote 1 cierra como PASS WITH WARNINGS.**

---

### Dónde está la evidencia

- **En el repositorio:** solo este archivo cambió (`git status` limpio en todo lo demás).
- **Scratchpad (volátil):** `/private/tmp/claude-502/-Users-desarrollo-VisualizadorJava/da1801e0-cfc0-4c84-99cd-2ce29b4b6d1e/scratchpad/vd/` con `herr/` (`LoteMio.java` alineado con `-g`, `comparar.mjs` con veredictos de javac por archivo, `regresion.sh`, `una.sh`, `mutar.sh`, `suites-oraculo.sh`, los generadores `gen-eol`, `gen-ign`, `gen-elipsis`, `gen-package`, `gen-const`, `gen-const-azar`, `gen-limites`, `gen-limites-c`, `gen-limites-d`, `gen-tope`, `gen-densidad`, `gen-misc`, `gen-calificados`, `robustez.mjs`, `pila-fria.mjs`, `pila-fria2.mjs`, `robustez-navegadores.mjs`, `robustez-navegadores2.mjs`, `sabotajes.py`, `sabotajes2.py`, `cobertura-cambiados.mjs`, `total.mjs`, `resumen-informe.mjs`), `corpus-nuevo/` (los 19 conjuntos nuevos), `corpus-viejo` (enlace a los 53 de `vf/`), `out/` (un informe JSON por conjunto, `red136.json`, `red136-oraculo.json`, `sabotajes.txt`, `sabotajes2.txt`, registros de `oraculo:*`, `gen-ci.json`, `gen-20261007.json`), `tmp/*.g.tsv` (los veredictos de javac `-g`), `red136/` (producción del padre + pruebas del hijo), `head/` (copia limpia de `HEAD`), `sab/` (copia para los sabotajes) y `cov/`.
- **Engram** (proyecto `visualizadorjava`): `sdd/visualizador-java/verify-report` (esta corrida, primero), `sdd/visualizador-java/verificacion-delta-lote1-programas` (índice de los 19 conjuntos con su veredicto, los programas mínimos de C-6, W-11 y W-12, y cómo regenerarlos) y `sdd/visualizador-java/verificacion-delta-lote1-progreso`.
