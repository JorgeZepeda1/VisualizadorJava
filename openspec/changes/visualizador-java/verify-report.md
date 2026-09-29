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
