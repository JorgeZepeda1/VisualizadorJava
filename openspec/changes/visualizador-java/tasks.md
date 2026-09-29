# Tareas: Visualizador de Java paso a paso (`visualizador-java`)

> Fase `sdd-tasks` · 2026-09-25. Fuente: `design.md` (capas, §10 orden de construcción), `specs/*/spec.md` (73 requisitos `REQ-*`, 96 escenarios), `proposal.md` (§3 MUST, §8 C1–C20, §13 Definición de Terminado, §14 P1–P5), `exploration.md` y `exploracion/01` §6–7 (18 errores conceptuales, 26 plantillas).
>
> **Tamaño:** `openspec/config.yaml` pide tareas de 1-2 líneas; este cambio tiene 73 requisitos verificados contra un JDK real y sub-agentes `sdd-apply` sin más contexto que este archivo. Para que cada tarea sea autosuficiente (test-first, archivos, verificación, dependencias) sin reabrir `design.md`, el documento es largo — 101 tareas en 7 lotes. Es la misma compensación que ya aplicó `design.md` en su nota de tamaño.
>
> Índice: [Convenciones](#convenciones) · [Lote 0](#lote-0--cimientos--rebanada-vertical) · [Lote 1](#lote-1--lenguaje) · [Lote 2](#lote-2--ejecución-y-biblioteca) · [Lote 3](#lote-3--traza-y-trabajador) · [Lote 4](#lote-4--visualizador) · [Lote 5](#lote-5--aula) · [Lote 6](#lote-6--paso-detallado) · [Matriz de trazabilidad](#matriz-de-trazabilidad)

## Convenciones

- **Test-first obligatorio** (`strict_tdd: true`): toda tarea de código trae RED (prueba nueva, falla por una razón concreta) → GREEN (mínimo para ponerla en verde) → REFACTOR (limpieza sin romper verde; "ninguno relevante" cuando de verdad no aplica, p. ej. puertos de datos generados).
- **Ubicación de pruebas:** unitarias/diferenciales de un módulo, junto al código (`*.test.ts`, design.md §1.2); suites transversales bajo `pruebas/{diferencial,propiedades,compilacion,traza,generadores,e2e,rendimiento}/`.
- **Comandos base** (no se repiten por tarea; cada tarea da solo el patrón): unidad/diferencial/propiedades → `npm test -- <patrón> --reporter=dot`; navegadores → `npm run test:navegadores -- <patrón>`; E2E → `npm run e2e -- <patrón> --reporter=dot`; rendimiento → `npm run rendimiento -- <patrón> --reporter=dot`; tipos → `npm run tipos`; lint → `npm run lint`.
- **Dependencias:** dentro de un lote, las tareas son secuenciales por número salvo que se indique otra cosa; solo se anota "depende" cuando cruza de lote o salta al predecesor inmediato.
- **Bloqueos del PO:** una tarea "BLOQUEADA POR Pn" no detiene el resto del lote; se implementa con la recomendación por omisión ya aplicada donde el diseño lo permite, y se cierra en cuanto el PO resuelve Pn.
- **Cierre estándar de cada lote:** `sdd-verify` del lote → (lotes 2, 5 y 6: revisión adversarial `judgment-day`, mínimo exigido por el orquestador — 2 por ser el núcleo de fidelidad numérica/biblioteca, 5 y 6 por ser los hitos de validación en aula y publicación v1) → commit con confirmación EXPLÍCITA del PO (conventional commits, sin atribución de IA) → actualizar `openspec/changes/visualizador-java/state.yaml` (`phases.tasks`/avance del lote).
- **Sesiones:** estimación heredada de `design.md` §10 / `proposal.md` §6 (ya conciliadas con el PO), no recalculada por lote de tareas.
- **CI al día con lo que existe** (orquestador, 2026-09-25): un workflow solo invoca scripts y suites que ya existen. La tarea que crea una suite nueva (`test:navegadores`, `rendimiento`, `oraculo:generados`, `oraculo:mutantes`, datos completos del oráculo…) agrega su paso al workflow correspondiente en el mismo cambio. Así el CI remoto está verde de verdad en cada cierre de lote, sin `continue-on-error` ni pasos vacíos.

## Lote 0 — Cimientos + rebanada vertical

**Objetivo:** andamiaje del monorepo con las versiones fijadas, guardas de capa, CI de 4 flujos, arnés diferencial con goldens regenerados en binario, medición de `Math.pow` en x86_64, PWA mínima, y una rebanada vertical (`u3-hola-mundo`) de punta a punta con su prueba diferencial y su E2E en los tres motores.
**Criterio de entrada:** ninguno — greenfield, repo en `main` sin commits de producto.
**Sesiones:** 2–3 (design.md §10).

**0.1 Andamiaje raíz y versiones fijadas** — ✅ hecha (2026-09-25)
- RED `pruebas/arquitectura/andamiaje.test.ts`: `package.json` fija exactamente las versiones verificadas de design.md §9 (`react`/`react-dom` 19.3.0, `typescript` 6.0.3, `vite` 8.3.1, `vitest` 5.0.2, `@playwright/test` 1.63.0, `@codemirror/lang-java` 6.0.2, `typescript-eslint` 8.70.1, `vite-plugin-pwa` 1.3.0, `lz-string` 1.5.0, `fast-check` 4.10.2) y `.nvmrc` dice `22.23.1`; falla (nada existe).
- GREEN: `package.json`, `.nvmrc`, `tsconfig.base.json` + `tsconfig.{motor,trabajador,interfaz,herramientas}.json` (con el `lib` de la tabla §1.1), `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `index.html` con CSP `connect-src 'self'`, carpetas `src/{motor,textos,presentacion,trabajador,interfaz}` con `index.ts` mínimo.
- REFACTOR: la lista de versiones queda como constante compartida con `herramientas/licencias.ts` (0.4).
- Verif: `pruebas/arquitectura/andamiaje`

**0.2 Guardas de capa con ESLint (ADR 001)** · depende: 0.1 — ✅ hecha (2026-09-25)
- RED `pruebas/arquitectura/fronteras.test.ts`: ESLint programático sobre un fixture `src/motor/__fixture__/toca-dom.ts` (usa `document.title`) espera un error de regla; falla sin regla.
- GREEN: `eslint.config.js` + `herramientas/eslint/` con la matriz "puede importar" de design.md §1.1 (motor: nada; textos: tipos de motor/vista; presentacion: motor/vista+textos; trabajador: motor+protocolo; interfaz: presentacion+textos+trabajador/cliente+motor/vista).
- REFACTOR: la matriz como tabla de datos, no cascada de reglas.
- Verif: `pruebas/arquitectura/fronteras`

**0.3 `CLAUDE.md` y `README.md` del proyecto** · depende: 0.1 — ✅ hecha (2026-09-25)
- Documentación, sin RED/GREEN de código — exigida por la Definición de Terminado #4 antes de escribir código de producto. `CLAUDE.md` MUST cubrir: idioma es-MX en todo texto de usuario; identificadores en español ASCII con las excepciones de design §1.4; TDD estricto obligatorio; fidelidad contra JDK 17 real como criterio de aceptación; "fuera de U3–U7 = aviso, nunca inventar" (D2); cero red en runtime; commits convencionales SIN atribución de IA; confirmación explícita del PO antes de cada commit; ruta del JDK real; comandos del proyecto.
- Verif: revisión manual contra proposal.md §13 · Archivos: `CLAUDE.md`, `README.md`.

**0.4 Avisos de terceros y licencias** · depende: 0.1 — ✅ hecha (2026-09-25)
- RED `herramientas/licencias.test.ts`: corre `licencias.ts` contra un `package.json` fixture con una dependencia `GPL-3.0` simulada y espera fallo con mensaje claro; falla (script no existe).
- GREEN: `herramientas/licencias.ts` (audita licencias permisivas reales) + `AVISOS-DE-TERCEROS.md` con espacio reservado para el aviso de Sun/fdlibm (se llena en 2.5).
- REFACTOR: ninguno relevante.
- Verif: `herramientas/licencias`

**0.5 Oráculo — ejecución del JDK real (ADR 011)** — REQ-DIFF-001 · depende: 0.1 — ✅ hecha (2026-09-25)
- RED `herramientas/oraculo/ejecutar.test.ts`: compila y corre `System.out.println("hola");` contra Temurin real con `-Duser.language=es -Duser.country=MX -Dfile.encoding=UTF-8`, captura `stdout` en binario, afirma que termina en `\n`; aborta si la versión detectada no es `17.0.18`; falla sin `jdk.ts`/`ejecutar.ts`.
- GREEN: `herramientas/oraculo/jdk.ts` (verifica versión) + `ejecutar.ts` (`child_process.spawn` con timeout propio, nunca `$(...)`; `javac -encoding UTF-8 -g`; segunda corrida con un solo descriptor para el orden combinado).
- REFACTOR: flags de locale como constante compartida con 0.9.
- Verif: `herramientas/oraculo/ejecutar`

**0.6 Migración y regeneración binaria de goldens (ADR 011)** — REQ-DIFF-002 · depende: 0.5 — ✅ hecha (2026-09-25)
- RED `herramientas/oraculo/generar-goldens.test.ts`: regenera el golden de `u3-hola-mundo` y afirma que termina en `\n` (el `.salida.txt` heredado no); falla contra el estado actual.
- GREEN: `generar-goldens.ts` + `verificar-goldens.ts`; migra `exploracion/corpus-candidato/` (35 programas) → `corpus/curso/` y `exploracion/experimentos/{numeros,texto}/` → `corpus/experimentos/`; `npm run oraculo:goldens` regenera TODOS los `.salida`/`.errores`/`.combinada`/`.oraculo.json` en binario.
- REFACTOR: ninguno relevante.
- Verif: `herramientas/oraculo/generar-goldens` + `npm run oraculo:verificar`

**0.7 `.gitattributes` para goldens binarios** · depende: 0.6 — ✅ hecha (2026-09-25)
- RED `pruebas/arquitectura/gitattributes.test.ts`: `git check-attr -a` sobre un archivo de `corpus/curso/` afirma `-text`; falla sin el archivo.
- GREEN: `.gitattributes` con `corpus/** -text`.
- Verif: `pruebas/arquitectura/gitattributes`

**0.8 CI — `ci.yml` (esqueleto)** · depende: 0.1, 0.2 — ✅ hecha (2026-09-25)
- Configuración, sin RED/GREEN de código; verificación por corrida real en Actions. Contenido: `ubuntu-latest`, Node de `.nvmrc`, `npm ci`, navegadores de Playwright, `npm run ci` (lint+tipos+test+build+presupuesto+licencias), `test:navegadores`, `e2e`, `rendimiento` (umbral holgado).
- Verif: corrida verde en GitHub Actions tras el primer push (bloqueada por P1 para el repo remoto real; localmente, revisión estructural del YAML) · Archivos: `.github/workflows/ci.yml`.

**0.9 CI — `oraculo.yml`** — REQ-DIFF-008(parte arm64) · depende: 0.6 — ✅ hecha (2026-09-25)
- Configuración. Disparo por cambios en `corpus/`/`herramientas/oraculo/`/datos, nocturno, manual; `macos-14` (arm64) + `actions/setup-java@v6` Temurin `17.0.18+8`; corre `oraculo:verificar`; de noche `oraculo:generados` + `oraculo:mutantes`.
- Verif: corrida verde en Actions (local: `npm run oraculo:verificar`) · Archivos: `.github/workflows/oraculo.yml`.

**0.10 Medición de `Math.pow` en x86_64** — REQ-DIFF-008(parte x86_64) · depende: 0.5 — ✅ hecha (verificación x86_64 pendiente de CI)
- RED `herramientas/oraculo/medir-plataforma.test.ts`: corre `MedirPow.java` contra un CSV de smoke (5 pares) vía `docker run --rm --platform linux/amd64 eclipse-temurin:17` y afirma una fila por par con `Math.pow`/`StrictMath.pow`/coinciden; falla sin `MedirPow.java` ni `medir-plataforma.ts`.
- GREEN: `herramientas/oraculo/java/MedirPow.java` + `medir-plataforma.ts` + `.github/workflows/plataforma.yml` (matriz `ubuntu-latest`/`windows-latest`, Temurin 17.0.18, `continue-on-error`, semanal+manual). El CSV completo (`corpus/datos/pow/pares.csv`) llega en 2.1.
- REFACTOR: ninguno relevante.
- Verif: `herramientas/oraculo/medir-plataforma` (requiere Docker Desktop corriendo)

**0.11 `desplegar.yml` + PWA mínima** — REQ-PLAT-008(scaffold) · depende: 0.1 — ✅ hecha (2026-09-25)
- RED `src/interfaz/pwa/registro.test.ts` (jsdom): el *service worker* se registra y existe manifiesto con `name`/`icons`; falla sin `vite-plugin-pwa`.
- GREEN: `vite-plugin-pwa` con precache mínimo + `.github/workflows/desplegar.yml` (etiqueta `v*`, manual con `ref`; `BASE_PUBLICA=/<repo>/ vite build` con marcador de posición hasta que P1 fije el repo real → `upload-pages-artifact` → `deploy-pages`).
- REFACTOR: ninguno relevante.
- Verif: `src/interfaz/pwa/registro`
- Nota: el despliegue real queda **bloqueado por P1** (cuenta/nombre/visibilidad del repositorio; recomendación por omisión: repo público `VisualizadorJava`); el workflow y la PWA se construyen y prueban igual con el marcador de posición.

**0.12 Rebanada vertical — motor mínimo (`u3-hola-mundo`)** — REQ-SUB-001(parcial) · depende: 0.2 — ✅ hecha (2026-09-25)
- RED `pruebas/diferencial/u3-hola-mundo.test.ts`: compila y ejecuta `public class HolaMundo { public static void main(String[] args) { System.out.println("Hola"); } }` y afirma un único `Paso` clase `impresion` con salida `"Hola\n"`; falla (nada existe).
- GREEN: `src/motor/fuente/{rango,tabla-de-lineas}.ts`, `lexico/` (tokens de clase/`main`/`println`/cadena/llaves/`;`), `sintaxis/` (Programa→Clase→Main→Bloque→`System.out.println(literal)`), `ir/` mínimo, `interprete/` mínimo, `compilador.ts`, `index.ts`, `vista.ts`.
- REFACTOR: el contrato público §1.3 queda fijo en `index.ts` para que el lote 1 solo amplíe, no rompa la firma.
- Verif: `pruebas/diferencial/u3-hola-mundo`

**0.13 Rebanada vertical — traza y trabajador mínimos** · depende: 0.12 — ✅ hecha (2026-09-25)
- RED `src/trabajador/trabajador.test.ts`: manda `{tipo:'ejecutar', fuente:<hola-mundo>}` y espera `compilado`→`pasos`→`fin`; falla sin protocolo.
- GREEN: `src/motor/traza/{paso,traza}.ts` mínimo (`agregar`/`estadoEn` sin puntos de control — se completan en 3.1), `src/trabajador/{protocolo,trabajador,cliente}.ts` con los mensajes básicos de la tabla §5.
- Verif: `src/trabajador/trabajador`

**0.14 Rebanada vertical — interfaz mínima** — REQ-VIS-001(parcial) · depende: 0.13 — ✅ hecha (2026-09-25)
- RED `src/interfaz/App.test.tsx`: renderiza `<App/>`, pega `hola-mundo`, pulsa "Visualizar", espera "Hola" en consola; falla sin componentes.
- GREEN: `src/interfaz/{main.tsx,App.tsx}` + `editor/EditorJava.tsx` (CodeMirror 6 de solo texto) + `componentes/Consola.tsx` mínima + `contenedores/Visualizador.tsx` + controles ◀▶ mínimos.
- REFACTOR: separa contenedor/presentacional desde el inicio (ADR 013) para que el lote 4 solo amplíe.
- Verif: `src/interfaz/App`

**0.15 Cierre de la rebanada — diferencial + E2E en 3 motores** — REQ-PLAT-006(parcial) · depende: 0.14 — ✅ hecha (2026-09-25; E2E offline saltado en WebKit por límite real de Playwright — ver PROGRESO/Engram)
- RED `pruebas/e2e/u3-hola-mundo.spec.ts` (Playwright, proyectos Chromium/Firefox/WebKit, `offline: true` tras la primera carga): pega el programa, pulsa Visualizar, afirma "Hola" en consola y cero peticiones de red tras la carga inicial; falla sin precache real.
- GREEN: conecta 0.11 + 0.12–0.14 para que pase en los tres motores.
- Verif: `npm run e2e -- u3-hola-mundo`

**0.16 Refrescar `sdd-init`** · depende: 0.1–0.15 (cierre del lote) — ✅ hecha (2026-09-25)
- Última tarea del lote: relanza `sdd-init` para registrar el runner de pruebas real (Vitest + Playwright ya instalados, `npm test` ejecutable, no solo "planeado") en `openspec/config.yaml` → `testing` y en Engram (`sdd-init/visualizadorjava`, `sdd/visualizadorjava/testing-capabilities`). Sin RED/GREEN — no es código de producto.
- Verif: `openspec/config.yaml` → `testing.test_runner` deja de decir "planeado".

**0.17 Textos visibles al catálogo `es-MX` y guarda de lint** (agregada por el orquestador: WARNING-2 de `sdd-verify` del lote 0; ADR 015) · depende: 0.14 — ✅ hecha (2026-09-25)
- RED `pruebas/arquitectura/textos-en-catalogo.test.ts`: ESLint programático sobre un fixture `src/interfaz/__fixture__/texto-literal.tsx` (JSX con texto visible literal y un `aria-label` literal) espera un error de regla; falla sin regla.
- GREEN: regla con `no-restricted-syntax` (sin dependencias nuevas) para `src/interfaz/**/*.tsx` que prohíbe texto visible literal en JSX (con letras; los símbolos sueltos como `◀` no cuentan) y cadenas literales en atributos visibles (`aria-label`, `title`, `placeholder`, `alt`); mueve los textos de `App.tsx:8` y `Visualizador.tsx:69,84,102,111,121` al catálogo tipado `src/textos/es-MX` del ADR 015 y consúmelos desde ahí.
- REFACTOR: ninguno relevante.
- Verif: `pruebas/arquitectura/textos-en-catalogo` + `npm run lint` · Nota: la tarea 5.11 conserva la auditoría completa de textos; esta solo pone la guarda desde el inicio.

**0.18 CI sin JDK y oráculo portable a Windows** (agregada por el orquestador tras el primer CI remoto) · depende: 0.5, 0.8–0.10 — ✅ hecha (2026-09-25)
- Hallazgo: en el primer push (`eaf9fa1`), `ci.yml` (Ubuntu) falló porque `npm test` incluye las pruebas de `herramientas/oraculo/**`, que necesitan el JDK, cuando el ADR 011 fija que el CI por commit corre SIN JDK contra los goldens; y `plataforma.yml` falló en `windows-latest` porque `jdk.ts` busca `bin/java` y `bin/javac` sin `.exe`. Esa falla la ocultó `continue-on-error`.
- RED `herramientas/oraculo/jdk.test.ts`: `localizarJdk` con plataforma `win32` inyectada, sobre un directorio temporal con `bin/java.exe` y `bin/javac.exe`, lo encuentra; hoy falla.
- GREEN: `jdk.ts` resuelve `java`/`javac` con `.exe` en Windows (plataforma inyectable; por omisión `process.platform`). Proyecto de Vitest `oraculo` aparte: `npm test` corre solo `motor` + `interfaz` (sin JDK) y `npm run test:oraculo` corre las pruebas del oráculo (falla fuerte si falta el JDK). `oraculo.yml` corre `test:oraculo` antes de `oraculo:verificar`. `plataforma.yml` sin `continue-on-error`: un error de la herramienta falla el trabajo, y una diferencia entre `Math.pow` y `StrictMath.pow` se reporta como anotación `::warning::` y en el resumen del trabajo (es un dato para el ADR 009, no un fallo). `CLAUDE.md` documenta los dos comandos.
- Verif: `npm test`, `npm run test:oraculo`, `npm run lint`, `npm run tipos`; en remoto: CI, Oráculo y Plataforma (Ubuntu y Windows) en verde.

**0.19 El editor no pierde teclas con ecos atrasados de `onCambio`** (agregada por el orquestador: bug de producto que destapó el E2E de Firefox en el CI del PR #1) · depende: 0.14 — ✅ hecha (2026-09-28)
- Hallazgo: con la CPU saturada, Firefox perdía la última tecla (22 de 30 corridas bajo carga; sin carga, 40/40). El `useEffect([valor])` de `EditorJava` reemplazaba el documento completo y un eco atrasado de `onCambio` pisaba lo que el alumno ya había tecleado.
- RED `src/interfaz/editor/EditorJava.test.tsx`: "un eco atrasado… no borra lo que se tecleó después" falla con `expected 'abc' to be 'abcd'`.
- GREEN: cola ordenada de textos emitidos pendientes (`emitidosPendientesRef`): un eco poda la cola sin tocar el documento; un cambio externo vacía la cola y reemplaza el documento (contrato controlado de ADR 013 intacto). 3 casos de triangulación, cada uno mata un mutante.
- Diagnóstico en CI: `trace: 'retain-on-failure'` y `screenshot: 'only-on-failure'`; `ci.yml` sube `test-results/` y `playwright-report/` con `actions/upload-artifact@v7` cuando falla.
- Verif: `npm test`, `npm run e2e` (Firefox bajo carga ×30: 60/60) · Seguimiento: sin `worker.onerror` la interfaz quedaría en "compilando" si el trabajador lanza una excepción: lo cubre el perro guardián del lote 3 (ADR 007).

**Criterio de salida:** `npm run ci` verde sobre lo existente; `oraculo.yml`/`plataforma.yml` verdes; `u3-hola-mundo` verde en diferencial + E2E×3 motores; C12 cumplido de forma inicial; `sdd-init` refrescado.
**Cierre:** `sdd-verify` del lote 0 → commit (`feat(cimientos): ...`) con confirmación del PO → actualizar `state.yaml`.

## Lote 1 — Lenguaje

**Objetivo:** gramática completa del subconjunto, reconocimiento de lo no soportado sin abortar el análisis, las 5 pasadas de compilación (léxico+sintaxis, atribución, alcanzabilidad, asignación definitiva, arranque) con errores en español idénticos a `javac`, catálogo del JDK generado por el oráculo, y verificación contra ≥2000 mutantes.
**Criterio de entrada:** lote 0 cerrado (CI verde, oráculo funcional, rebanada vertical navegable).
**Sesiones:** 3–4 (design.md §10).

**1.1 Léxico completo** — REQ-SUB-002, REQ-SUB-006, REQ-SUB-007(léxico) · depende: 0.12 — ✅ hecha (2026-09-25)
- RED `src/motor/lexico/analizador-lexico.test.ts`: tokeniza cada literal de proposal §2.1 (enteros con `_`, `long` con `L`, `double` punto/exponente/`d`, `char`/`String` con escapes válidos) y afirma que `010` produce `NoSoportado` con nota "Java lo lee como octal: 8"; falla (lexer mínimo de 0.12).
- GREEN: amplía `analizador-lexico.ts`/`tokens.ts`/`literales.ts` con hex/octal/binario, `float`, bloques `"""`, `\uXXXX`, escapes no soportados (`\r \b \f \s \0–\377`) como `NoSoportado{codigo,rango}` sin abortar.
- REFACTOR: tabla de escapes válidos/no soportados aislada en `literales.ts`.
- Verif: `motor/lexico`

**1.2 Sintaxis — núcleo del programa** — REQ-SUB-001 · depende: 1.1 — ✅ hecha (2026-09-25)
- RED `analizador-sintactico.test.ts`: clase con cualquier nombre, `public` opcional, 3 formas de `main`, imports de `Scanner`/`Random`/`*`, `package` ignorado, comentarios, `return;`; falla (parser mínimo de 0.12).
- GREEN: `sintaxis/{analizador-sintactico,ast}.ts` con `Programa/Importacion/Clase/Main/ParamMain/Bloque/DeclLocal` (design §2.3).
- REFACTOR: `ParamMain` (3 formas) como función reusada por 1.15.
- Verif: `motor/sintaxis`

**1.3 Sintaxis — expresiones Pratt** — REQ-SUB-003, REQ-SUB-007(bits, `?:`, `instanceof`) · depende: 1.2 — ✅ hecha (2026-09-25)
- RED `expresiones.test.ts`: los 14 niveles de precedencia de design §2.4, cortocircuito `&&`/`||`, `& | ^ << >> >>> ?: instanceof` → `NoSoportado`; falla.
- GREEN: `sintaxis/expresiones.ts` (Pratt).
- REFACTOR: tabla de precedencia como dato.
- Verif: `motor/sintaxis/expresiones`

**1.4 Ambigüedades del parser** — REQ-SUB-002(literal `long`/`MIN_VALUE`) · depende: 1.3 — ✅ hecha (2026-09-25)
- RED `ambiguedades.test.ts`: cast-vs-paréntesis (JLS 15.16), declaración-vs-expresión, `-2147483648`/`-9223372036854775808L` válidos solo tras `-` unario, `5000000000` sin `L` → error; falla.
- GREEN: las 3 reglas de design §2.5 en el parser.
- REFACTOR: función compartida "abre expresión unaria".
- Verif: `motor/sintaxis/ambiguedades`

**1.5 Sentencias completas** — REQ-SUB-004 · depende: 1.3 — ✅ hecha (2026-09-28)
- RED `sentencias.test.ts`: `if/else/else-if` anidados, `;` vacía, `switch` clásico (caída), `while`, `do-while`, `for` (varias variables, partes vacías), `break`/`continue`; falla.
- GREEN: resto de `Sentencia` en `analizador-sintactico.ts`.
- REFACTOR: manejo de `Bloque` unificado entre `if`/ciclos/`switch`.
- Verif: `motor/sintaxis/sentencias`

**1.6 Reconocimiento NO-DISP sintáctico (resto del catálogo)** — REQ-SUB-006, REQ-SUB-007 · depende: 1.5 — ✅ hecha (2026-09-28)
- RED `no-soportado.test.ts`: una muestra por cada fila restante de REQ-SUB-007 (clases/interfaces/enums/records, campos, métodos propios, clases internas, anotaciones, `throws`, arreglos, `for` mejorado, etiquetas, `switch` flecha/`yield`, `try/catch/throw`, `var`, genéricos, lambdas, `::`, `this`/`super`, `null`, `final` sin inicializador, `import static`) produce `NoSoportado` y el análisis sigue; falla.
- GREEN: `sintaxis/no-soportado.ts` con subgramática permisiva por construcción.
- REFACTOR: tabla construcción→código de aviso, reusada por 1.17.
- Verif: `motor/sintaxis/no-soportado`

**1.7 Atribución — símbolos, alcance, sombreado, `switch`** — REQ-COMP-002, REQ-COMP-003 · depende: 1.6 — ✅ hecha (2026-09-28)
- RED `atribucion.test.ts`: variable/método no declarado, uso fuera de bloque (incl. variable de `for`), redeclaración en el mismo bloque, sombreado en bloque anidado, selector de `switch` no `int`/`char`/`String`; falla.
- GREEN: `semantica/{atribucion,alcance,switch}.ts`.
- REFACTOR: tabla de símbolos compartida con 1.10/1.12/1.13.
- Verif: `motor/semantica/atribucion`

**1.8 Sobrecargas y catálogo de biblioteca reconocida** — REQ-SUB-005, REQ-SUB-007(atribución) · depende: 1.7, 1.9 — ✅ hecha (2026-09-28)
- RED `sobrecargas.test.ts`: JLS 15.12.2 (estricta/laxa/varargs/más específico); `Math.round(123456789L)` resuelve a `round(float)`; miembros existentes-no-soportados (`s.split`, `Math.sin`, `sc.hasNextInt`) → `NoSoportado`; falla.
- GREEN: `semantica/{sobrecargas,tipos,conversiones}.ts` sobre un `catalogo-api.ts` stub (real en 2.15).
- REFACTOR: las 4 fases de resolución como funciones puras.
- Verif: `motor/semantica/sobrecargas`

**1.9 Catálogo de datos del JDK (oráculo, ADR 010)** · depende: 0.5 — ✅ hecha (2026-09-28)
- RED `herramientas/oraculo/generar-datos.test.ts`: genera `corpus/datos/api/` (firmas soportadas/existen-no-soportadas/no-existen), `corpus/datos/regional/` (símbolos `DecimalFormatSymbols`), `corpus/datos/marcos/` (mensajes exactos del lanzador Temurin 17.0.18 es-MX) contra el JDK real; falla sin generador.
- GREEN: `herramientas/oraculo/generar-datos.ts` + `src/motor/biblioteca/datos/*.generado.ts` (cabecera "no editar").
- Verif: `herramientas/oraculo/generar-datos`

**1.10 Constantes (JLS 15.29)** — REQ-COMP-001(parcial) · depende: 1.8 — ✅ hecha (2026-09-28)
- RED `constantes.test.ts`: plegado de literales/operadores/casts, `"ho"+"la"=="hola"` → `true` (internado), división entera entre cero NO es constante, `Integer.MAX_VALUE`/`Math.PI`; falla.
- GREEN: `semantica/constantes.ts` (stub numérico hasta el lote 2; el TODO se retira explícitamente al cerrar 2.4).
- REFACTOR: comparte el plegado con 1.12/1.13.
- Verif: `motor/semantica/constantes`

**1.11 Errores de tipo y símbolo en español** — REQ-COMP-001(cierre) · depende: 1.7, 1.10 — ✅ hecha (2026-09-28; alcance real documentado en engram — ver reporte de la sesión)
- RED `problemas.test.ts`: `Math.round(double)` a `int`, condición de `if` no booleana, `String`/numérico incompatibles en `==`, los 37 casos del subconjunto en el catálogo `03`; falla.
- GREEN: `problemas.ts` (`Problema`, `CodigoProblema`) + `src/textos/es-MX/problemas.ts`.
- REFACTOR: un `Problema` por `CodigoProblema`, sin strings sueltos.
- Verif: `motor/problemas`

**1.12 Alcanzabilidad (JLS 14.22)** — REQ-COMP-010 · depende: 1.10 — ✅ hecha (2026-09-28)
- RED `alcanzabilidad.test.ts`: código tras `return`/`break`/`continue` incondicional, cuerpo de `while(false)`, sentencia tras `while(1<2){}` (condición constante cuenta igual que el literal), `if(false)` exento; falla.
- GREEN: `semantica/alcanzabilidad.ts`.
- REFACTOR: evaluador de "condición constante" compartido con 1.13.
- Verif: `motor/semantica/alcanzabilidad`

**1.13 Asignación definitiva (JLS 16)** — REQ-COMP-004 · depende: 1.12 — ✅ hecha (2026-09-28)
- RED `asignacion-definitiva.test.ts`: `if`/`else` completo, `while`/`for(cond)` nunca garantizan, `while(true)`+`break` sí, `do-while` garantiza si el cuerpo asigna, `switch` con `default`, "asignada si verdadero/si falso" en `&&`/`||`/`!`; falla.
- GREEN: `semantica/asignacion-definitiva.ts`.
- Verif: `motor/semantica/asignacion-definitiva`
- Nota: "final sin inicializador" es NO-DISP desde la sintaxis (1.6) — nunca llega a esta pasada, así que el estado se simplificó a un solo conjunto (DA); "final" reasignada se detecta sin necesitar flujo (siempre tiene inicializador). `switch`/`&&`/`||`/`!` no estaban en exploracion/03 §4.4: verificados ad-hoc contra javac 17 real en carpetas temporales (borradas) antes de implementar.

**1.14 Orquestación de las 5 pasadas** — REQ-COMP-005, REQ-COMP-006, REQ-COMP-009 · depende: 1.6, 1.11, 1.12, 1.13 — ✅ hecha (2026-09-28)
- RED `compilador.test.ts`: "atribución oculta asignación definitiva anterior" y "alcanzabilidad se informa antes que asignación definitiva" (escenarios verificados de REQ-COMP-006); `;` faltante reporta la línea de `javac`; clase pública con nombre distinto al archivo NO se rechaza; falla.
- GREEN: `compilador.ts` orquesta léxico+sintaxis → atribución → alcanzabilidad → asignación definitiva → arranque, deteniéndose en la primera pasada con problemas.
- REFACTOR: pasadas como lista de funciones `(programa) => Problema[]`, orden como dato.
- Verif: `motor/compilador`

**1.15 Arranque — `main` sin `static` / sin `main`** — REQ-COMP-007, REQ-COMP-008 · depende: 1.9, 1.14 — ✅ hecha (2026-09-28)
- RED `arranque.test.ts`: `public void main` compila limpio y falla solo al ejecutar con el texto del lanzador (saltos `\n` literales, la rareza de Temurin); clase sin `main` falla bien formada con saltos reales; falla.
- GREEN: `semantica/arranque.ts` usando `corpus/datos/marcos/` (1.9).
- Verif: `motor/semantica/arranque`

**1.16 Mutantes contra veredictos de `javac`** — REQ-DIFF-006 · depende: 1.14 — ✅ hecha (sub-lote 1-D5, 2026-09-29) — C7 CUMPLIDO: 100% veredicto, línea ≥95%
- RED `pruebas/compilacion/mutantes.test.ts`: sobre ≥2000 mutantes de un solo token de `corpus/curso` (desviación documentada: `corpus/autoria` todavía no existe — lo crea la tarea 5.3 del lote 5; cuando exista, este generador se amplía para incluirlo), compara veredicto (100%) y línea del primer error (≥95%) contra `corpus/mutantes/veredictos.jsonl`; falla sin generador ni veredictos. RED real confirmado (import inexistente).
- GREEN: `herramientas/oraculo/mutantes.ts` (tokenizador propio + 9 tipos de mutación + semilla fija `20260925`, determinismo verificado byte a byte) + `herramientas/oraculo/java/CompiladorEnLote.java` (`javax.tools`, una sola JVM, ~5.5s para 2625 mutantes) → `corpus/mutantes/veredictos.jsonl` (2625 mutantes generados, ≥2000 cumplido). `pruebas/compilacion/mutantes.test.ts` compara contra `compilar()`.
- **Cifras reales (sub-lote 1-D3 → 1-D4 → 1-D5)**: 1-D3 (5 correcciones) cerró en veredicto 98.02%/línea 94.69%/código 86.77%. 1-D4 (tarea 1.21) cerró en veredicto 99.92% (2623/2625), línea 98.76% (2381/2411, YA CUMPLÍA C7), código 86.93% — quedaban 2 clases de discrepancia nuevas y chicas (1 mutante cada una). 1-D5 (esta sesión) cerró AMBAS: (a) `expresiones.ts`/`analizarPostfija` restringe el "(" de una llamada a JLS 15.12 (solo `nombre`/`acceso-miembro` como callee — antes CUALQUIER primaria, incluido un literal de cadena, se aceptaba como llamada); (b) `expresiones.ts`/`analizarPrimaria` trata cualquier token léxico no-soportado (hex/octal/binario/float/`\uXXXX`) como primaria válida (ADR 003 "deja seguir", ya no aborta el análisis) + `compilador.ts`/`avisoEnmascaraError` (nuevo): un aviso NO-DISP léxico solo enmascara un error de sintaxis POSTERIOR no colocado cuando es `escape-unicode-no-soportado` (JLS 3.3, D2 explícito) — cualquier otro no-soportado léxico solo enmascara si el error cae DENTRO de su propio rango. **Resultado final: veredicto 100.00% (2625/2625), línea 98.84% (2383/2411), código 87.18% (2102/2411)**.
- Umbrales de `mutantes.test.ts` fijados como mínimos de C7 (veredicto `1.0` exacto, línea `0.95` — el mínimo real de C7, con margen de sobra medido) + código en su valor real (`0.87`, nunca inflado).
- Verif: `pruebas/compilacion/mutantes` (`npm test`, 5/5 verde) + TODO el catálogo NO-DISP (`pruebas/compilacion/catalogo.test.ts`, 37+9 casos) y el barrido semántico (`pruebas/compilacion/catalogo-semantico.test.ts`, 42 casos) re-verificados verdes tras tocar la gramática y la propagación de avisos — sin regresiones.

**1.17 Muestra de NO-DISP por construcción (C8)** — REQ-DIFF-004(parte C8) · depende: 1.6 — ✅ hecha (2026-09-28)
- RED `pruebas/compilacion/catalogo.test.ts`: una muestra por cada fila del catálogo REQ-SUB-007 dispara su aviso antes de ejecutar, cero pasos, cero errores de sintaxis engañosos; falla.
- GREEN: `corpus/compilacion/catalogo/` (37 casos de `03`) + `corpus/compilacion/avisos/` (una muestra por construcción).
- Verif: `pruebas/compilacion/catalogo`

**1.19 Biblioteca conectada a la atribución y firmas de main** (agregada por el orquestador: huecos que encontró 1-D2b) · depende: 1.8, 1.9, 1.14, 1.15 — ✅ hecha (2026-09-28)
- Hallazgo: `semantica/sobrecargas.ts`/`catalogo-api.ts` (tareas 1.7/1.8) estaban completos y probados STANDALONE pero JAMÁS se invocaban desde `visitarLlamada`/`visitarAccesoMiembro` de `atribucion.ts` — un método real de Java pero no soportado (`s.split`, `Math.sin`) no producía ningún aviso, y `design.md` §2.1 nunca se había verificado contra el JDK real para el 3er caso de arranque ("main sin `public`").
- RED (una regla a la vez, evidencia completa con la línea de la falla real en el informe de la sesión): p. ej. `atribucion.test.ts` — `atribuirCuerpo('String s = "a,b"; s.split(",");')` esperaba un aviso NO-DISP y `problemas` era `[]` (`expected [] to have a length of 1`); `analizador-sintactico.test.ts` — `analizar('class C { static void main(String[] a) {} }').clase.main?.esPublico` daba `undefined`; `arranque.test.ts` — `verificarArranque` de un `main` `static` sin `public` daba `null` en vez de `'sin-main'`; `analizar('public class C { public static void main() {} }')` lanzaba `ErrorDeCompilacion` (javac SÍ compila esto).
- GREEN: `semantica/catalogo-api.ts` (`clasificarMetodo`/`clasificarCampo`, genero-aware sobre `FIRMAS_JDK` — JLS 6.5.6 separa campos y métodos); `semantica/sobrecargas.ts` (`resolverSobrecarga` excluye `genero:'campo'` de sus candidatos — corrige un falso positivo real, `Math.PI()`); `semantica/atribucion.ts` (`visitarLlamadaDeMiembro`/`visitarAccesoMiembro` reescritos: cada llamada/acceso a miembro real se resuelve contra el catálogo — soportado con sobrecarga real, NO-DISP, no existe, o sin sobrecarga aplicable — las 4 verificadas contra javac 17 real); 3 códigos nuevos en `problemas.ts`/`textos/es-MX/problemas.ts` (`campo-no-declarado`, `miembro-no-declarado`, `sin-sobrecarga-aplicable`); `sintaxis/ast.ts`+`analizador-sintactico.ts` (`NodoMain.esPublico`, y `pareceMain` corregido: ya no se compromete con un `main()` sin el parámetro real — antes daba un error de sintaxis falso donde javac compila limpio); `semantica/arranque.ts` ("main sin `public`" reutiliza el mensaje de "sin-main" BYTE A BYTE, verificado contra el JDK real — sin datos nuevos del oráculo, D2, porque el mensaje ya existía idéntico). 2 correcciones descubiertas al conectar la biblioteca real (interacción invisible hasta ahora): `System.in`/`out`/`err` faltaban en `MIEMBROS_SOPORTADOS` (rompía el patrón más básico del currículo, `new Scanner(System.in)`); un tipo sin resolver (`Scanner` sin `import`) debía degradar a `desconocido` para suprimir la cascada (antes producía un SEGUNDO problema donde javac solo da uno).
- REFACTOR: `tipos.ts` exporta `claseDelObjeto` (antes privada) para que `atribucion.ts` la reuse, nunca una segunda implementación que podría divergir.
- Verif: `npm test` (815/815), `npm run test:oraculo` (70 + 1 skip), `npm run lint`, `npm run tipos`, `npm run oraculo:verificar` (176 programas, idénticos — no se regeneró ningún dato del oráculo).

**1.20 Constructores e idioma del lanzador en el oráculo** (agregada por el orquestador) · depende: 1.9, 1.19 — ✅ hecha (2026-09-28)
- Parte A.1 (JLS 15.9, REQ-SUB-005): `NodoNuevaInstancia` no se validaba — `Scanner sc = new Scanner();` se aceptaba en silencio, javac lo rechaza. RED con la línea de falla real por caso (`atribucion.test.ts`, `tipos.test.ts`): `new Foo()` esperaba `tipo-no-reconocido` y daba `[]`; `new Scanner()` (con import) esperaba `sin-constructor-aplicable` y daba `[]`; `new Scanner("texto")` esperaba aviso NO-DISP y daba `[]`; `tipoDeExpresion(new Random())` esperaba `'Random'` y daba `'desconocido'`.
- GREEN: `semantica/atribucion.ts` (`visitarNuevaInstancia` nueva, reusa `resultadoNombreDeTipo`+`resolverSobrecarga` con `nombre:'<init>'`, ambos ya existentes — nunca una segunda implementación); `semantica/catalogo-api.ts` (`CONSTRUCTORES_SOPORTADOS` nuevo, granularidad de FIRMA completa — a diferencia de `MIEMBROS_SOPORTADOS`, que resuelve por NOMBRE — porque REQ-SUB-005 es explícito: "un único `new Scanner(System.in)`", "`new String(texto)`"; REFACTOR: se retiran `Scanner.<init>`/`String.<init>`/`Random.<init>` de `MIEMBROS_SOPORTADOS`, ahora muertos y engañosos); `semantica/tipos.ts` (`tipoDeNuevaInstancia` nueva, mismo criterio que `tipoDeLlamada` — tipa aunque el constructor sea NO-DISP); `problemas.ts`/`textos/es-MX/problemas.ts` (código nuevo `sin-constructor-aplicable`). Los 4 casos soportados (`new Scanner(System.in)`, `new Random()`, `new Random(42)`, `new String("hola")`) y los 4 no soportados/inválidos verificados contra javac 17 real (carpetas temporales, borradas). Hallazgo real verificado contra javac: `Scanner sc = new Scanner(System.in);` SIN import da el error "cannot find symbol: class Scanner" DOS VECES (declaración + `new`), nunca deduplicado — 2 pruebas preexistentes (sub-lote 1-D2c) corregidas de `toHaveLength(1)` a `toHaveLength(2)`, mismo invariante real (cascada suprimida sobre los USOS) intacto. Fuera de alcance a propósito: `new Math()`/clases sin constructor público reflejado (comparten el mismo código `sin-constructor-aplicable`, mensaje menos preciso pero D2-honesto; nunca ocurre en `corpus/curso` ni en el vocabulario de mutación de la tarea 1.16).
- Parte A.2: gotcha de sesión anterior (engram) — la JVM en frío A VECES da el mensaje del lanzador en inglés pese a `-Duser.language=es -Duser.country=MX`. Experimento real esta sesión (31 invocaciones: bash directo, `env -i`, `LANG=en_US.UTF-8` forzado, orden de banderas invertido, sin banderas, y la ruta real de invocación del oráculo vía `child_process.spawn` de Node) — 31/31 en español; `defaults read -g AppleLocale` confirma `es_MX` en esta máquina, lo que probablemente enmascara el bug (hipótesis razonada, no confirmada: un runner de CI stock casi seguro tiene `AppleLocale=en-US`). Causa raíz NO identificada con certeza (igual que la sesión anterior). GREEN incondicional (nunca dependiente de la causa): `generar-datos.ts` (`pareceLanzadorEnEspanol`/`verificarMarcoEnEspanol` nuevas, marcador `"método principal"` verificado contra ambos mensajes reales; `generarDatos` llama a `verificarMarcoEnEspanol` antes de devolver los marcos — lanza y NUNCA guarda un dato en inglés) + `ejecutar.ts` (`OpcionesEjecucion.envAdicional` nuevo, opcional — defensa adicional de bajo costo, LANG/LC_ALL fijados solo en los 2 probes de marcos). Prueba real de "JVM en frío" (RED con fixtures ingleses reales del bundle base de javac, GREEN tras implementar) cubre el caso que el CI (siempre frío) puede disparar.
- Verif: `npm test` (855/855 antes de la tarea 1.16), `npm run test:oraculo` (26 nuevas + existentes, verde), `npm run lint`, `npm run tipos`.

**1.21 Tipos de las expresiones con operadores, lista de parámetros y `import` inválido** (agregada por el orquestador — sub-lote 1-D4, cierre de C7) · depende: 1.14, 1.16, 1.19, 1.20 — ✅ hecha (2026-09-28)
- Hallazgo: `tipoDeExpresion` (tarea 1.7/1.8) nunca resolvía `'binaria'`/`'unaria'`/`'incremento-decremento'` (deferido a propósito) — un operando ANIDADO (p. ej. `(a + b) == true`) daba `'desconocido'` y suprimía SIEMPRE la cascada de `verificarOperandosBinaria`; `System.in`/`System.out`/`System.err` como ARGUMENTOS (no como receptor, eso ya se resolvía desde 1-D3) tampoco tenían un `Tipo` reflejado; `consumirMiembroDeClase` validaba la cabecera de un miembro pero no el CONTENIDO de su lista de parámetros; un `import` de una clase inexistente no se validaba contra el catálogo real.
- RED (una regla/clase a la vez, línea de la falla real en cada caso — ver `tipos.test.ts`/`atribucion.test.ts`/`no-soportado.test.ts`/`compilador.test.ts`): p. ej. `tipoDeExpresion(nBin('+', nEntero(1), nEntero(2)))` esperaba `'int'` y daba `'desconocido'`; `atribuirCuerpo('int x=5; boolean r=!x;')` esperaba 1 problema `operando-invalido-operador-unario` y daba `[]`; `atribuirPrograma('...int sc = new Scanner(System.in);...')` esperaba `tipos-incompatibles-en-asignacion` y daba `[]`; `analizar('class C { public static void main([String[] args) { } }')` esperaba `throw ErrorDeCompilacion` y no lanzaba; `atribuirPrograma('import java.utilScanner;...')` esperaba `importacion-no-reconocida` y daba `[]` (el error solo aparecía después, en el uso).
- GREEN: `semantica/tipos.ts` (`tipoDeBinaria`/`tipoDeUnaria`/`tipoDeOperadorAritmetico`/`tipoDePromocionNumericaBinaria` — JLS 5.6.1/5.6.2/15.18.1; `ArgumentoDeSobrecarga`/`argumentoDeSobrecarga`/`campoReflejadoDeSystem`/`nombreReflejado` — canal paralelo para que System.in/out/err participen en la resolución de sobrecargas con su nombre reflejado real sin ensanchar el `Tipo` cerrado; `claseDelObjeto` refactorizado para reusar `campoReflejadoDeSystem`); `semantica/conversiones.ts`/`sobrecargas.ts` (amplían su parámetro de `Tipo` a `ArgumentoDeSobrecarga`, retrocompatible: CERO pruebas existentes tocadas); `semantica/verificaciones-de-tipo.ts` (`operandoValidoParaUnario`, `operandoValidoParaIncrementoDecremento`, `esConvertibleImplicitamenteEnAsignacionCompuesta` JLS 15.26.2, `nombreDeClaseImportadaEsValido` — valida paquete+clase completos, no solo el último segmento, `operandoNoEsVariableValida` JLS 4.12.3); `semantica/atribucion.ts` (`verificarOperandoUnaria`/`verificarOperandoIncrementoDecremento`/`verificarAsignacionCompuesta`/`verificarObjetivoDeAsignacion` nuevas; validación de imports movida ANTES del corte de "sin main"; `visitarLlamadaDeMiembro`/`visitarNuevaInstancia` usan `argumentoDeSobrecarga`); `sintaxis/no-soportado.ts` (`indiceDeErrorEnListaDeParametros`/`validarListaDeParametros`/`pareceInicioDeTipo`, JLS 8.4.1, llamada desde `validarCabeceraDeMiembro` cuando la continuación es `"("`); `sintaxis/analizador-sintactico.ts` (la `"{"` del CUERPO DE LA CLASE ahora ancla en `finDelTokenAnterior()` cuando falta, mismo patrón que ya tenía la de `main`); 4 códigos nuevos en `problemas.ts`/`textos/es-MX/problemas.ts` (`operando-invalido-operador-unario`, `importacion-no-reconocida`, `objetivo-no-es-variable`, `llave-de-clase-faltante`). El condicional `?:` NO se implementó: confirmado que NO existe como nodo propio del AST (`NodoExpresionNoSoportada` lo cubre, design §2.4 lo marca NO-DISP) — nada que resolver.
- Cifras reales del cierre: ver 1.16 arriba (veredicto 88.69%→99.92%, línea 86.93%→98.76% a lo largo de 1-D3+1-D4; línea YA cumple C7, veredicto a 2 mutantes de 100%, 2 clases nuevas documentadas).
- Verif: `npm test` (928/928), `npm run test:oraculo` (104 + 1 skip), `npm run lint`, `npm run tipos`, `npm run oraculo:verificar` (176 programas, idénticos), `npm run oraculo:mutantes` (2625 mutantes, determinismo confirmado, sin diff).

**1.22 Conversión de asignación en asignaciones simples** (agregada por el orquestador — sub-lote 1-D5, hueco real dejado a propósito por 1.21) — REQ-COMP-001 · depende: 1.10, 1.21 — ✅ hecha (2026-09-29)
- Hallazgo: `esAsignable`/`codigoDeAsignacionInvalida` (tarea 1.10, JLS 5.2) solo se comprobaban en el inicializador de una DECLARACIÓN (`visitarDeclaracionLocal`) — una asignación SIMPLE ("=") fuera de una declaración (`int x; x = "hola";`) nunca se verificaba (documentado a propósito como fuera de alcance al cierre de 1.21, nunca un olvido).
- RED `atribucion.test.ts` (verificado contra javac 17 real, temurin-17.0.18, 7 casos en un solo archivo con 7 clases, carpeta temporal borrada tras verificar): `atribuirCuerpo('int x; x = "hola";')` esperaba 1 problema `tipos-incompatibles-en-asignacion` y daba `[]` (`expected [] to have a length of 1 but got +0`); mismo patrón para `x = 3.5` (`conversion-con-perdida`, double→int), `c = n` con `n` int NO constante (`conversion-con-perdida`, int→char), `s = 5` y `b = 1` (`tipos-incompatibles-en-asignacion`); controles `c = 65` (constante que cabe) y `d = 5` (ensanchamiento) YA pasaban.
- GREEN: `semantica/atribucion.ts` — `verificarAsignacionSimple` nueva (reusa `esAsignable`/`codigoDeAsignacionInvalida`/`valorConstante`, las MISMAS que ya usa una declaración, nunca una segunda tabla), llamada desde el caso `'asignacion'` de `visitarExpresion` cuando `operador === '='`. `destino === 'desconocido'` cubre D2 para un objetivo no declarado O que no es una variable real (ambos ya reportados aparte).
- Verif: `npm test` (943/943 antes de esta tarea), `npm run lint`, `npm run tipos`.

**1.23 switch como expresión reconocido como no soportado** (agregada por el orquestador: hallazgo de la guarda de avisos) — REQ-SUB-007 · depende: 1.6, 1.17 — ✅ hecha (2026-09-28)
- Hallazgo: `analizarPrimaria` (`src/motor/sintaxis/expresiones.ts`) no tenía ninguna rama para `switch` en posición de EXPRESIÓN (JLS 15.28, Java 14+) — `analizarSwitch` (`analizador-sintactico.ts`) solo lo reconoce como inicio de SENTENCIA. Por eso `corpus/compilacion/avisos/37-yield.java` (Java válido real, javac lo compila) daba `error-compilacion` en vez del aviso de no soportado — un resultado inventado (regla 5 de CLAUDE.md): un alumno que escribe `int x = switch (n) { case 1 -> 10; default -> 0; };` vería un error que Java no da. Documentado como pendiente real al cierre del sub-lote 1-D6 (guarda permanente de `corpus/compilacion/avisos/`).
- RED `expresiones.test.ts` (6 casos, verificados contra javac 17 real en carpeta temporal borrada tras verificar): con flechas (`switch (dia) { case 1 -> 10; default -> 0; }`), forma clásica con `:`/`yield` (igual que la muestra 37), `yield` dentro de un bloque (`case 1 -> { yield 10; }`), el rango exacto `switch`→`}`, anidado como operando de `+`, y como argumento de `System.out.println(...)` — los 6 esperaban `{tipo:'expresion-no-soportada', codigo:'switch-expresion-no-soportado'}` y daban `ErrorDeCompilacion: se esperaba una expresión y se encontró "switch"` (lanzado desde `analizarPrimaria`); falla confirmada por ejecución real antes de tocar producción.
- GREEN: `analizarSwitchExpresionNoSoportado` nueva en `expresiones.ts`, llamada desde `analizarPrimaria` cuando `token.texto === 'switch'` — delimita el selector `(...)` balanceando solo paréntesis (nunca lo interpreta, evita que un `{` dentro del selector se confunda con el cuerpo) y el cuerpo `{...}` balanceando llaves (`saltarHastaCerrar`, ADR 003 "deja seguir"), sin interpretar `case`/`default`/flecha/`yield` — mismo patrón que ya usa este archivo para `new Tipo[]{...}` y `->` (lambda).
- Verif: `pruebas/compilacion/catalogo.test.ts` — se quitó la excepción documentada de `37-yield.java` (vuelve al `it.each` genérico); 44/44 muestras de `corpus/compilacion/avisos/` dan `no-disponible` (55/55 del archivo). `npm test` 949/949 (943 + 6 nuevas), `npm run test:oraculo` 149 + 1 skip (sin cambio), `npm run lint` y `npm run tipos` limpios. Mutantes (C7) sin regresión: veredicto 2625/2625 = 100.00%, línea 2383/2411 = 98.84%, código 2102/2411 = 87.18% — idénticos a antes de esta tarea (cambio puramente aditivo: ningún mutante existente ejercitaba switch-como-expresión).

**1.24 Texto en español de cada aviso de "no soportado"** (agregada por el orquestador: los códigos de `CODIGOS_NO_SOPORTADO` no tenían NINGÚN texto en es-MX) — REQ-SUB-006, REQ-SUB-007 · depende: 1.6, 1.17 — ✅ hecha (2026-09-28)
- Hallazgo: `src/textos/es-MX/` no tenía texto para NINGUNO de los códigos de "no disponible" (solo `problemas.ts`, `arranque.ts`, `interfaz.ts` existían) — D2/REQ-SUB-006 exigen "un aviso claro en español". Tampoco había una sola fuente de verdad: la tabla de `sintaxis/no-soportado.ts` decía `lambda: 'lambda-no-soportada'`, pero `sintaxis/expresiones.ts` emitía `'lambda'` (sin el sufijo) porque NUNCA importaba la tabla (13 códigos más de `expresiones.ts` tampoco pasaban por ninguna tabla) — un alumno que escribía una lambda recibía `{ categoria: 'no-disponible', codigo: 'lambda' }` sin texto. Verificado además en vivo (script de verificación aparte, borrado): `compilador.ts`/`construirResultadoDeAtribucion` ignoraba `problema.categoria` y SIEMPRE devolvía `'error-compilacion'` — un aviso real de biblioteca (`s.split`, `Math.sin`, conectados desde la tarea 1.19) llegaba a través de `compilar()` completo con el ícono/título de "Error de compilación" en vez de "No disponible", aunque `atribuir()` en aislamiento ya lo clasificara bien.
- RED (3 rondas, cada una ejecutada y fallando por la razón real antes de tocar producción):
  1. `compilador.test.ts` — nuevo describe "un miembro de biblioteca real-pero-no-soportado…": `compilar('class C { public static void main(String[] a) { String s = "a,b"; s.split(","); } }')` esperaba `categoria:'no-disponible'` y dio `'error-compilacion'` (`AssertionError: expected 'error-compilacion' to be 'no-disponible'`).
  2. `src/textos/es-MX/no-soportado.test.ts` + `pruebas/compilacion/avisos-textos.test.ts` (archivos nuevos): `Error: Cannot find module './no-soportado.ts'` / `Cannot find module '../../src/textos/es-MX/no-soportado.ts'` (catálogo inexistente).
  3. Con el catálogo ya creado (paso intermedio, tabla y textos aún sin conectar a los emisores): `pruebas/compilacion/avisos-textos.test.ts` fallaba en `40-lambda-parentesis.java`/`41-lambda-identificador.java` — `AssertionError: "40-lambda-parentesis.java" produjo el código "lambda", sin entrada en textosNoSoportado: expected undefined to be type of 'function'` — la discrepancia real, reproducida por una prueba real antes de corregirla.
- GREEN: (a) `compilador.ts`/`construirResultadoDeAtribucion` respeta `problema.categoria ?? 'error-compilacion'` en vez de hardcodearla. (b) `src/motor/no-soportado.ts` nuevo: `CODIGOS_NO_SOPORTADO` ampliada a TODOS los emisores (léxico, sintaxis, expresiones, atribución de biblioteca — 40 códigos reales + 1 respaldo defensivo `sinClasificar`) + `CodigoNoSoportado`, unión cerrada derivada de la tabla con `as const`/`keyof typeof`. (c) `sintaxis/no-soportado.ts` re-exporta la misma tabla (cero imports existentes rotos en `analizador-sintactico.ts`/`semantica/atribucion.ts`). (d) `lexico/tokens.ts`, `lexico/literales.ts`, `lexico/analizador-lexico.ts`, `sintaxis/ast.ts` (`NodoNoSoportado`/`NodoExpresionNoSoportada`) retipados de `codigo: string` a `codigo: CodigoNoSoportado`. (e) `sintaxis/expresiones.ts` reemplaza sus ~15 códigos inline por la tabla central (incluida la corrección de `lambda` → `lambda-no-soportada`; 2 aserciones de `no-soportado.test.ts` actualizadas al código correcto). (f) `src/textos/es-MX/no-soportado.ts` nuevo: `Record<CodigoNoSoportado, (datos) => string>` (ADR 015), helper `marco()` compartido para el formato de REQ-SUB-006 (línea, "Java sí lo acepta", cobertura U3–U7, alternativa opcional), datos específicos para arreglo (tipo), literal octal (valor real) y miembro de biblioteca (clase/nombre concretos). (g) `motor/vista.ts` exporta `CodigoNoSoportado` para que el catálogo de textos lo importe sin violar la matriz de capas (`textos` solo puede importar `motor/vista`).
- Verif: `npm test` 1045/1045 (949 + 96 nuevas: 3 del fix de categoría + 93 del catálogo/corpus), `npm run test:oraculo` 149 + 1 skip (sin cambio), `npm run lint` y `npm run tipos` limpios (4 capas, guarda de capas intacta). Mutantes (C7) sin regresión: veredicto 2625/2625 = 100.00%, línea 2383/2411 = 98.84%, código 2102/2411 = 87.18% — idénticos a antes de esta tarea (cambio de tipos + textos + un fallback de categoría, nunca de la gramática ni del veredicto de `compilar()`).

**1.25 Datos tipados de cada aviso de "no soportado"** (agregada por el orquestador: 4 textos mostraban undefined) — REQ-SUB-006 · depende: 1.24 — ✅ hecha (2026-09-28)
- Hallazgo (orquestador, verificado de punta a punta con `compilar()` real + `textosNoSoportado` real, nunca datos fabricados): 4 de las 44 muestras de `corpus/compilacion/avisos/` mostraban `undefined` al alumno — `02-literal-octal.java` → "usa el número `undefined`"; `25/26/27-arreglo-*.java` → "usa un arreglo (`undefined`)". Causa raíz: `Problema.datos`/`NoSoportadoColectado.datos` seguían siendo `Record<string, unknown>` sin verificar contra el código, así que `construirResultadoNoDisponible` (`compilador.ts`) mandaba `datos: {}` FIJO sin importar el código real, y `NoSoportadoColectado` ni siquiera tenía campo `datos` — la prueba de 1.24 solo verificaba "texto no vacío que menciona la línea", nunca el contenido. **Hallazgo propio, no reportado por el orquestador (verificado con evidencia antes de aceptar el alcance, regla de CLAUDE.md)**: un 5.º código real, `miembro-de-biblioteca-no-soportado`, estaba IGUAL de roto (`semantica/atribucion.ts` mandaba `datos: {}` en sus 3 sitios de emisión — llamada de método, acceso de campo, constructor — aunque el texto pide `{ clase, nombre }` desde 1.24) pero ninguna muestra de `corpus/compilacion/avisos/` lo ejercita (ese código solo lo produce la atribución, no la sintaxis), así que la auditoría del orquestador no podía verlo. Incluido en el arreglo por ser la MISMA causa raíz y el mismo mecanismo de corrección.
- RED (4 archivos de prueba, cada uno ejecutado y fallando por la razón real antes de tocar producción): `pruebas/compilacion/avisos-textos.test.ts` (reescrito — ya NO fabrica datos con un mapa `DATOS_EXTRA` local, arma `{ linea, ...problema.datos }` con el `datos` REAL de `compilar()`) falló en 11/52 casos, p. ej. `AssertionError: expected 'Tu programa usa el número \`undefined\`…' to contain '010'` y, para el hallazgo propio, `AssertionError: expected 'Tu programa usa el miembro \`undefined\` de \`undefined\`…' to contain 'split'` (×3: método/campo/constructor). `literales.test.ts` (`leerNumero('010',0).noSoportado?.datos`), `expresiones.test.ts` (`new int[5]` → `datos.tipoArreglo`) y `atribucion.test.ts` (`datos` de los 3 sitios de `miembro-de-biblioteca-no-soportado`) fallaron con `expected {} to deeply equal {...}` / `expected undefined`. 18 fallos totales, 245 pasaban.
- GREEN, por diseño: `DatosPorCodigoNoSoportado` nueva en `src/motor/no-soportado.ts` (única fuente de verdad de qué datos EXTRA exige cada código, `Record<never, never>` para los que solo usan la línea) + `ConDatosPorCodigo<Extra>` (tipo discriminado por `codigo` reusado por `NodoNoSoportado`/`NodoExpresionNoSoportada`, `sintaxis/ast.ts`, y `NoSoportadoLexico`, `lexico/literales.ts`) — un emisor que construye uno de estos nodos sin los datos exactos que su código exige deja de compilar. `consumirRestoDeSentenciaNoSoportada` (sintaxis/no-soportado.ts) se volvió genérica (`<C extends CodigoNoSoportado>`) para obligar al LLAMADOR a pasar los datos correctos. Los ~30 sitios de construcción directa (analizador-sintactico.ts, expresiones.ts, literales.ts, atribucion.ts) ahora mandan `datos: {}` explícito o el dato real (`tipoArreglo` en 2 sitios — declaración y `new Tipo[...]` —, `textoOriginal`/`valorDecimal` en el literal octal, `{ clase, nombre }` en los 3 sitios de `miembro-de-biblioteca`, con `nombre: 'new '+clase` para el caso constructor, que no tiene nombre propio en JLS — decisión de redacción marcada como riesgo para revisión del PO). `compilador.ts`/`construirResultadoNoDisponible` ahora manda `datos: primero.datos` (antes `{}` fijo — la causa raíz). `textos/es-MX/no-soportado.ts` ya NO duplica la forma de los datos: la deriva de `DatosPorCodigoNoSoportado` vía `motor/vista.ts`. `Token.datos`/`NoSoportadoColectado.datos` quedan `Record<string, unknown>` a propósito (solo COPIAN un valor ya verificado en su origen, mismo patrón que `ProblemaAtribucion.datos` desde 1.11).
- Verif: `npm test` 1054/1054 (1045 + 9 nuevas), `npm run test:oraculo` 149 + 1 skip (sin cambio), `npm run lint` y `npm run tipos` limpios (4 capas). Mutantes (C7) sin regresión: veredicto 2625/2625 = 100.00%, línea 2383/2411 = 98.84%, código 2102/2411 = 87.18% — idénticos a antes de esta tarea (cambio de tipos + datos reales, nunca de la gramática ni del veredicto de `compilar()`).

**1.26 El aviso de miembros de biblioteca distingue método, campo y constructor** (agregada por el orquestador: hallazgo verificado de punta a punta con el `compilar()` real y el catálogo real `textosNoSoportado`) — REQ-SUB-006 · depende: 1.24, 1.25 — ✅ hecha (2026-09-28)
- Hallazgo: el código único `miembro-de-biblioteca-no-soportado` (3 sitios de emisión en `semantica/atribucion.ts`: llamada de método `visitarLlamadaDeMiembro` ~l.631, acceso de campo `visitarAccesoMiembro` ~l.694, constructor `visitarNuevaInstancia` ~l.776) mezclaba método/campo/constructor bajo un solo texto genérico. Para el CONSTRUCTOR, sin "nombre" propio en JLS, el sitio de emisión inventaba `nombre: 'new ' + clase` — para `Scanner s = new Scanner("12 34");` el alumno leía "el miembro `new Scanner` de `Scanner`... todavía no simula `Scanner.new Scanner`" — `Scanner.new Scanner` NO es Java (D2, regla 5 de CLAUDE.md: casi un resultado inventado en el propio TEXTO del aviso). "miembro" tampoco es una palabra que un alumno de U3–U7 conozca (conoce "método").
- RED `pruebas/compilacion/avisos-textos.test.ts` (sección "miembro-de-biblioteca-no-soportado — no cubierto por corpus/avisos" reescrita a 3 casos, cada programa verificado con javac 17.0.18 real en carpeta temporal fuera del repo, borrada tras verificar: `s.split(",")` sobre un `String`, `Integer.SIZE`, `new Scanner("12 34")`) + `compilador.test.ts` + `atribucion.test.ts` + `textos/es-MX/no-soportado.test.ts` (exhaustividad `Record<CodigoNoSoportado,...>`): `AssertionError: expected 'miembro-de-biblioteca-no-soportado' to be 'metodo-de-biblioteca-no-soportado'` (método), `to be 'campo-de-biblioteca-no-soportado'` (campo), `to be 'constructor-de-biblioteca-no-soportado'` (constructor), `AssertionError: expected {…4} to match object {categoria: 'no-disponible', …1}` (atribucion.test.ts, 4 casos), `expected 41 to be 43` (exhaustividad de `textosNoSoportado`). 20 fallos, 245 pasaban (265 en los 4 archivos).
- GREEN: `motor/no-soportado.ts` — `CODIGOS_NO_SOPORTADO.miembroDeBiblioteca` se divide en `metodoDeBiblioteca`/`campoDeBiblioteca`/`constructorDeBiblioteca`; `DatosPorCodigoNoSoportado` da a método/campo `{ clase, nombre }` (igual que antes) y a constructor SOLO `{ clase }` (sin inventar un "nombre" que JLS no tiene). `semantica/atribucion.ts` — los 3 sitios emiten su código propio; el constructor manda `datos: { clase: nodo.nombreTipo }` (ya no `nombre: 'new '+clase`). `textos/es-MX/no-soportado.ts` — 3 textos nuevos con el helper `marco()` (método: "el método `${nombre}` de `${clase}`"/"no simula ese método"; campo: "`${clase}.${nombre}`"/"no simula ese valor"; constructor: "`new ${clase}` con esos argumentos"/"no simula esa forma de crear un `${clase}`" — arma la sintaxis real él mismo, nunca "Scanner.new"). `CODIGOS_NO_SOPORTADO` sigue siendo la única fuente de verdad; cero referencias sueltas al código viejo (verificado con `grep`).
- Verif: `npm test` 1060/1060 (1054 + 6 nuevas), `npm run test:oraculo` 149 + 1 skip (sin cambio), `npm run lint` y `npm run tipos` limpios. Mutantes (C7) sin regresión: veredicto 2625/2625 = 100.00%, línea 2383/2411 = 98.84%, código 2102/2411 = 87.18% — idénticos a antes de esta tarea (cambio de clasificación/texto, nunca de la gramática ni del veredicto de `compilar()`). Las 44 muestras de `corpus/compilacion/avisos/` renderizadas de punta a punta con `compilar()` + `textosNoSoportado` reales: 0 textos con `undefined`/`NaN`/`[object` (`pruebas/compilacion/avisos-textos.test.ts`, sin cambios en esa cobertura).

**1.27 Lo que el motor todavía no ejecuta es un aviso, nunca un error de compilación** (agregada por el orquestador: hallazgo verificado de punta a punta — `main` ya tiene este comportamiento desde el PR #1) — REQ-SUB-006 (aplicado a un hueco de EJECUCIÓN dentro del subconjunto, no de reconocimiento de una construcción fuera de él) · depende: 1.14, 1.25 — ✅ hecha (2026-09-28)
- Hallazgo: un programa que las pasadas de compilación de `compilar()` YA ACEPTAN (léxico+sintaxis, atribución, alcanzabilidad y asignación definitiva; el arranque se revisa DESPUÉS de `generarIr`) podía seguir fallando al bajar a IR (`generarIr`, `motor/ir/generar-ir.ts:37`) con un `Error` PLANO, sin posición: `la ejecución de "declaracion-local" llega en el lote 2 (tareas 1.5/2.16)`. El `catch` genérico de `compilar()` (`compilador.ts` ~l.85–97) lo mandaba a `construirProblema`, que por defecto usa `rango:{inicio:0,fin:0}` (línea SIEMPRE 1, nunca la real) y `categoria:'error-compilacion'`/`codigo:'error-no-clasificado'` — el alumno leería un mensaje de desarrollo ("llega en el lote 2...") presentado como error de SINTAXIS, para un programa que javac 17.0.18 real acepta y ejecuta limpio (verificado, carpeta temporal fuera del repo, borrada tras verificar). Viola D2 y la regla 5 de CLAUDE.md. No publicado hoy (no hay Pages), pero `main` tiene este comportamiento desde el PR #1.
- RED `pruebas/compilacion/ejecucion-no-disponible.test.ts` (nuevo): `int x = 5; System.out.println(x);` (declaración local con inicializador, javac real la acepta) esperaba `categoria:'no-disponible'` y daba `'error-compilacion'` — `AssertionError: expected 'error-compilacion' to be 'no-disponible'`; caso de control (falta ";", javac rechaza con "';' expected") ya pasaba (confirma que el fix no debía tocar los errores de sintaxis reales). Colateral descubierto al correr la suite COMPLETA tras el GREEN (no en el RED inicial, honestamente reportado): 4 casos de control positivo en `catalogo-semantico.test.ts` (`err07/err08/err10b_definite_assignment_*`, `flow17_shadowing_bloque_anidado` — los 4 documentaban a propósito el catch-all viejo como comportamiento ACTUAL, nunca como deseado) y 1 caso en `compilador.test.ts` (`u6-ciclos-anidados-tabla.java`, hueco de IR de "for") esperaban `codigo:'error-no-clasificado'`/`categoria:'error-compilacion'` y ahora daban `'ejecucion-no-disponible'`/`'no-disponible'` — actualizados a la aserción CORRECTA (positiva: prueban que ningún código de `CODIGOS_NO_SOPORTADO` se dispara de verdad, solo el hueco honesto de IR).
- GREEN: `motor/ir/error-de-ejecucion-no-disponible.ts` (nuevo) — `ErrorDeEjecucionNoDisponible extends Error` con `rango: Rango` tipado (ruta defensiva PERMANENTE, documentada para seguir viva tras el lote 2). `generar-ir.ts`/`generarSentenciaIr` lanza este error con `elemento.rango` en vez de un `Error` plano. `motor/no-soportado.ts` — código nuevo `ejecucionNoDisponible: 'ejecucion-no-disponible'` en `CODIGOS_NO_SOPORTADO`, con `DatosPorCodigoNoSoportado` = solo línea (`Record<never,never>`). `compilador.ts` — el `catch` de `compilar()` distingue `error instanceof ErrorDeEjecucionNoDisponible` (chequeo de TIPO, nunca un catch genérico que se trague otras fases) y lo traduce reusando `construirResultadoNoDisponible` (mismo mecanismo que los avisos de léxico/sintaxis/atribución); cualquier OTRA excepción (incluida `ErrorDeCompilacion` real) sigue la lógica de siempre, sin cambios — un error de sintaxis real sigue siendo `error-compilacion` (probado por el caso de control). `textos/es-MX/no-soportado.ts` — texto NUEVO (no usa `marco()`: a diferencia del resto del catálogo, esta construcción SÍ está en el subconjunto, así que nunca dice "cubre las unidades 3 a 7"): "Java sí acepta tu programa, pero este visualizador todavía no sabe ejecutar lo que escribiste en la línea N. No lo ejecuto para no enseñarte un resultado que podría no ser el de Java." — sin "lote", "tarea" ni nombres del AST.
- Revisión de interfaz (pedida por el orquestador): `src/interfaz/contenedores/Visualizador.tsx` (único consumidor de `ResultadoCompilacion`) recibe `problema: Problema` completo en el mensaje `'compilado'` del protocolo (`src/trabajador/protocolo.ts:46-49`, campo `problema` ya presente) pero su `case 'compilado':` (`Visualizador.tsx:66-72`) IGNORA `mensaje.problema` por completo — solo llama `setMensajeCompilacion(textosInterfaz.noCompilaTodavia())`, un texto FIJO genérico («El programa no compila todavía (el catálogo completo de errores en español llega en el lote 1).», `textos/es-MX/interfaz.ts:17-18`: falso para un programa que Java acepta y con jerga de desarrollo) para CUALQUIER `ok:false`, sin mirar `categoria`/`codigo`/`datos`. **`textosNoSoportado` NO está conectado a la interfaz** — ni para este código ni para ninguno de los otros 43. No se construyó interfaz nueva (fuera de alcance de esta tarea, fuera de alcance también de 1.24/1.25): reportado con precisión para que el PO decida: se conecta en el lote 4 (M13, `src/presentacion/index.ts` sigue siendo un stub `export {}`) o antes.
- REFACTOR (orquestador, al verificar): `pruebas/compilacion/mutantes.test.ts` pierde `esGapDeIrTodaviaNoImplementado`, que reconocía el hueco de IR por el texto "llega en el lote 2" del mensaje; tras 1.27 ese hueco llega como `no-disponible` y la regla ya no podía coincidir con nada, solo esconder una regresión futura. Mutantes idénticos sin ella (100.00 % / 98.84 % / 87.18 %), prueba de que era código muerto. Corregidos también los comentarios que contaban el arranque entre las pasadas previas a `generarIr`.
- Verif: `npm test` 1065/1065 (1060 + 5 nuevas: 3 en `ejecucion-no-disponible.test.ts`, 2 en `no-soportado.test.ts`), `npm run test:oraculo` 149 + 1 skip (sin cambio), `npm run lint` y `npm run tipos` limpios. Mutantes (C7) sin regresión: veredicto 2625/2625 = 100.00%, línea 2383/2411 = 98.84%, código 2102/2411 = 87.18% — idénticos a antes de esta tarea (ruta defensiva nueva, nunca cambia el veredicto de `compilar()` contra javac). Las 44 muestras de `corpus/compilacion/avisos/` sin cambios (ninguna ejercita este código: todas son NO-DISP de léxico/sintaxis/atribución detectadas ANTES de `generarIr`).

**1.28 La pantalla muestra el texto real de cada problema, con su línea** (agregada por el orquestador por decisión explícita del PO, 2026-09-29: «la pantalla muestra el texto real de cada problema (error o aviso) con su línea; el ícono, el título y el subrayado siguen en la 4.5») — REQ-VIS-002 (solo el texto y su línea), REQ-SUB-006, REQ-COMP-005, REQ-COMP-007, REQ-COMP-008 · depende: 1.24, 1.25, 1.26, 1.27 — ✅ hecha (2026-09-29)
- Hallazgo (orquestador, verificado de punta a punta): (1) `Visualizador.tsx` IGNORABA el `problema` que manda el trabajador (`protocolo.ts:44-49`) y mostraba SIEMPRE «El programa no compila todavía (el catálogo completo de errores en español llega en el lote 1)» — falso para un programa que Java acepta y con jerga de desarrollo; ni `textosNoSoportado` ni `textosProblemas` estaban conectados a `interfaz`/`presentacion`. (2) `construirProblema` convertía CUALQUIER excepción (TypeError, RangeError…) en `error-compilacion` con `rango:{0,0}` (línea 1) y el mensaje de JavaScript: con los textos reales en pantalla, un bug del motor se habría leído como «Línea 1: Hay un error de sintaxis aquí: Maximum call stack size exceeded». El trabajador no atrapaba ninguna excepción de `compilar()` y NUNCA emitía el `error-interno` que la interfaz ya sabía mostrar.
- Hallazgos propios (verificados con evidencia): (a) **Medición previa del punto 5**, antes de cambiar nada (réplica exacta de los `try/catch` de `compilar()`, validada contra el `compilar()` real: 0 discrepancias en 2 713 entradas; control positivo con 60 000 paréntesis anidados → `RangeError` detectado en sus dos destinos, «llega a `construirProblema`» y «tragada por un aviso léxico previo»): **0 de las 2 625 entradas de `corpus/mutantes/veredictos.jsonl`, 0 de las 53 de `corpus/compilacion/**` y 0 de las 35 de `corpus/curso/**` llegaban a `construirProblema` con una excepción que no fuera `ErrorDeCompilacion`** (tampoco las 141 fuentes de `corpus/experimentos`), así que la semántica del `catch` se cambió sin esconder ningún bug. (b) **`error-arranque` no se mostraba en absoluto** (ni texto fijo ni texto falso): llega a la interfaz en `FinEjecucion.arranque` (mensaje `fin`, `crearEjecucion` lo copia de `programa.arranque`), pero `case 'fin'` de `Visualizador.tsx` solo hacía `setModo('visualizacion')` — un `main` sin `static` dejaba consola vacía, «Paso 0 de 0», el editor en solo lectura y ninguna explicación. (c) `Problema` (`codigo: CodigoProblema | string`, `datos: Record<string, unknown>`) no permitía estrechar el código por categoría ni los datos por código sin un `as`.
- RED (por capa, cada uno ejecutado y fallando por su razón antes de tocar producción): **motor** `compilador.test.ts` (dos casos con 100 000 paréntesis anidados, uno con un aviso léxico `0x10` antes): `AssertionError: expected function to throw an error, but it didn't`. **trabajador** `trabajador.test.ts` (4 casos; el de contraste ya pasaba): `RangeError: Maximum call stack size exceeded` escapando de `manejarMensaje` (❯ `intentarAnalizarLambda src/motor/sintaxis/expresiones.ts:223`) en los 3 que esperan `error-interno`. **presentacion/textos** `segmentos-de-codigo.test.ts`/`texto-del-problema.test.ts`: `Error: Cannot find module './segmentos-de-codigo.ts'` / `'./texto-del-problema.ts'`; `interfaz.test.ts`: `TypeError: textosInterfaz.errorEnLinea is not a function`. **tipos** (RED de compilación, con el módulo ya escrito contra el `Problema` plano): `npm run tipos` → 14 errores, p. ej. `TS2344: Type 'CodigoNoSoportado' does not satisfy the constraint '"Expected: literal string: otro-tipo-de-nivel-superior-no-soportado, Actual: never"…'`, `TS2578: Unused '@ts-expect-error' directive` (×5) y `TS2305: Module '"../motor/vista.ts"' has no exported member 'DatosPorCodigoProblema'`. **interfaz**: `Failed to resolve import "./TextoConCodigo.tsx"`; `Visualizador.test.tsx` 6 de 11 fallan (las otras 5 fijan comportamiento que ya existía): `expected 'El programa no compila todavía (el ca…' to be 'Línea 3: Te falta un punto y coma ";"…'`, `expected [] to deeply equal [ 'int[]' ]` y, para el arranque, `Unable to find role="alert"`. **E2E** (`pruebas/e2e/problemas-en-pantalla.spec.ts`, build real): 12 fallos (4 pruebas × 3 motores) — `Expected substring: "Línea 3: Te falta un punto y coma \";\" al final de esta línea." / Received string: "El programa no compila todavía (el catálogo completo de errores en español llega en el lote 1)."` y, para el arranque, `Expected substring: "\"SinStatic\""` sin ninguna región de alerta. Los tres programas de las muestras se compilaron con javac 17.0.18 real (carpeta temporal fuera del repo, borrada): `Saludo` (falta el `;`) NO compila (`';' expected`, línea 3), `Arreglos` y `SinStatic` SÍ compilan (este último lo rechaza el lanzador: «el método principal no es static en la clase SinStatic»); también los cinco fragmentos de la prueba de forma del `Problema` (ternario, `0x10`, `s.split`, `println(x)` compilan; `int x = y;` y `int x = 5` no).
- GREEN: **motor** `compilador.ts` — el `catch` de `tokenizar` y el de las pasadas dejan pasar (`throw error`) todo lo que no sea `ErrorDeCompilacion` (ni un aviso léxico previo lo esconde: un aviso solo enmascara a un error de sintaxis genuino); `construirProblema`/`codigoDeSintaxis` reciben ya un `ErrorDeCompilacion` (sin el `rango:{0,0}` ni el `String(error)`). **trabajador** `trabajador.ts` — `try/catch` solo alrededor de `compilar()` → `{ tipo: 'error-interno', id, mensaje }` (el `mensaje` protocolar lleva `Nombre: detalle` para quien depure; la interfaz nunca lo muestra); las excepciones durante la ejecución siguen fuera (perro guardián, lote 3). **tipos** — `Problema` pasa a UNIÓN DISCRIMINADA por `categoria` con el código estrechado por categoría y los datos exactos de cada código (mismo mecanismo que 1.25 dio a los avisos): `motor/problemas.ts` (`DatosPorCodigoProblema`, movido aquí desde el catálogo de textos; `ProblemaDeCompilacion`, `ProblemaNoDisponible = ConDatosPorCodigo<…>`; `CodigoDeSintaxis` = los 11 códigos que salen de un `ErrorDeCompilacion`, ahora el tipo de `ErrorDeCompilacion.codigo`), `semantica/diagnostico.ts` (`ProblemaAtribucion` unión), `motor/{vista,index}.ts` (exports). Costó muy poco porque los ~35 sitios de emisión ya construían sus datos exactos: `tsc` solo señaló uno (`rangoExistente` de `variable-ya-definida`, que el tipo no declaraba y ahora sí), las tres funciones de conversión de `compilador.ts`, 3 aserciones de `atribucion.test.ts` que indexaban `datos` sin estrechar y el auxiliar `renderizar` de `avisos-textos.test.ts` — ninguna de esas correcciones cambia la ejecución. `categoria:'error-arranque'` NO es una variante de `Problema` (javac SÍ compila un `main` sin `static`; viaja aparte como `ProblemaArranque`). **presentacion** — `segmentos-de-codigo.ts` (`segmentarCodigoEnLinea`: tramos texto/código; una comilla invertida sin pareja o un par vacío quedan literales, sin perder ni inventar un carácter) y `texto-del-problema.ts` (`textoDelProblema`: `error-compilacion` → `textosProblemas` con «Línea N: » antepuesta; `no-disponible` → `textosNoSoportado` tal cual, que ya dice «en la línea N»; `textoDelArranque` → `textosArranque` con el nombre real de la clase; SIN `as` ni `any`: dos funciones genéricas sobre el código correlacionan código y datos), exportadas por `presentacion/index.ts`. **textos** — `textosInterfaz.errorEnLinea(linea, texto)`; `noCompilaTodavia` BORRADO (sin uso); `textos/es-MX/problemas.ts` deriva su forma de datos de `DatosPorCodigoProblema` (sin el mapa duplicado); `textos/es-MX/no-soportado.ts` usa el alias genérico `DatosDe<K>` (con el mapa anterior, indexar el catálogo con un código genérico exigía la intersección de los datos de los 45 códigos). **interfaz** — `componentes/TextoConCodigo.tsx` (cada tramo de código, un `<code>`) y `contenedores/Visualizador.tsx`: el aviso es un texto segmentado; `compilado ok:false` → `textoDelProblema`; `fin` con `arranque` → `textoDelArranque` y el editor vuelve a ser editable (sin pasos que mostrar, el alumno corrige); `error-interno` → aviso genérico, nunca el detalle de JavaScript. **Accesibilidad:** la región ya era `<p role="alert">` (región viva asertiva, `Visualizador.tsx:102` en `180b917`), así que no se agregó nada; solo existe cuando hay un problema, no depende del color (es texto, sin color alguno) y el teclado no cambia — ahora la fijan una prueba de componente y una E2E.
- REFACTOR (propio, encontrado al medir): la primera versión de `construirResultadoNoDisponible` copiaba con `{ ...primero }` y FILTRABA la clave interna `tipo` de los nodos del árbol (`recolectarNoSoportados` inserta los propios nodos) dentro del `Problema` que viaja a la interfaz — un cambio observable en lo que debía ser un refactor de tipos. Vuelve a elegir los cinco campos a mano (como siempre) con una única aserción `as ProblemaNoDisponible` documentada («segura por construcción», mismo criterio que `expresiones.ts`); `NoSoportadoColectado`/`Token.datos` siguen siendo copias anchas, como decidió 1.25. Nueva prueba en `compilador.test.ts` (forma EXACTA de las 5 claves para 7 orígenes: aviso sintáctico, de expresión, léxico, de biblioteca, hueco de ejecución, error de atribución y de sintaxis), que se comprobó reintroduciendo la copia (`+ "tipo"`). Comentario de `ConDatosPorCodigo` (`motor/no-soportado.ts`) y de `problemas.ts` puestos al día.
- Verif: nueva `pruebas/compilacion/problemas-en-pantalla.test.ts` — verificación de punta a punta (`compilar()` REAL + catálogo REAL + `textoDelProblema`, como 1.25/1.26) sobre 2 830 fuentes (`corpus/mutantes`, `corpus/compilacion`, `corpus/curso` y `corpus/experimentos/texto`, las fuentes que compiló javac para el catálogo de errores): 2 814 problemas reales (2 468 errores, 346 avisos), **los 36 códigos de error y 38 de los 44 códigos de aviso** alcanzados (los otros 6 — `campo-`/`constructor-de-biblioteca`, cubiertos por `avisos-textos.test.ts` de 1.26, y `yield`, `this-super`, `continue-con-etiqueta` y el respaldo `no-soportado`, sin ninguna fuente del corpus que los dispare) — sin restos (`undefined`/`NaN`/`[object`/`{x`), sin jerga de JavaScript, con «Línea N: » (errores) o «línea N» una sola vez (avisos) y sin comillas invertidas crudas; se comprobó que no es vacía sabotando `textoDelProblema` (3 fallos). `npm test` 1133/1133 (1065 + 68 nuevas: 10 en `compilador.test.ts`, 4 en `trabajador.test.ts`, 17 en `segmentos-de-codigo.test.ts`, 12 en `texto-del-problema.test.ts`, 2 en `interfaz.test.ts`, 8 en `problemas-en-pantalla.test.ts`, 4 en `TextoConCodigo.test.tsx`, 11 en `Visualizador.test.tsx`), `npm run test:oraculo` 149 + 1 omitida (sin cambio), `npm run lint` y `npm run tipos` limpios, `npm run e2e` 17 pasan + 1 omitida (Chromium 6/6, Firefox 6/6, WebKit 5/6 + el salto conocido de «sin red»; el spec nuevo 12/12, y 36/36 con `--repeat-each=3`). Mutantes (C7) sin regresión: veredicto 2625/2625 = 100.00%, línea 2383/2411 = 98.84%, código 2102/2411 = 87.18% — idénticos (la única lógica nueva del motor es la propagación de excepciones ajenas, que ninguna de las 2 713 fuentes ejercita).
- Hallazgo FUERA DE ALCANCE, previo a esta tarea y sin corregir (idéntico en `180b917`): al mostrar los textos reales de todo el corpus aparecen programas que javac 17 SÍ compila y que `compilar()` presenta como `error-compilacion` — 14 de los 131 programas con `compilo: true` de `corpus/curso` + `corpus/experimentos`: 8 con `sin-sobrecarga-aplicable` (7 por `Scanner.next()` sin argumentos, porque `firmas-jdk.generado.ts` trae DOS `next()` sin parámetros — el real y el método puente `next():Object` de `Iterator` — y `resolverSobrecarga` no desempata; 1 por `String.contains(String)`, que espera `CharSequence`), 3 con `importacion-no-reconocida` (`java.util.Locale`, `java.text.DecimalFormatSymbols`: existen en el JDK pero no están en el catálogo; el diseño pide `NO-DISP` para «clase existente no soportada»), 2 con `error-no-clasificado` por un cast a `(byte)` y 1 por `case 1, 2 ->` (`flow06_switch_flecha`). Con esta tarea el alumno leería, p. ej., «No reconozco "java.util.Locale" como algo que se pueda importar. Revisa que el nombre esté bien escrito» para un import correcto. No afecta a C7 (los mutantes derivan de `corpus/curso`, cuyos 35 programas no disparan estos casos); queda para que el orquestador decida una tarea propia.
- Nota para la revisión del PO (5.11): el único texto NUEVO del catálogo es el prefijo «Línea N: »; lo que sí cambia es que ahora se VEN los textos reales de todos los códigos. Ojo con el genérico `error-no-clasificado` («Hay un error de sintaxis aquí: <mensaje del analizador>»): de los 2 411 mutantes con error de compilación, 1 217 (50.5 %) lo muestran — los mutantes de un solo token cargan hacia errores de sintaxis, no es la distribución de un alumno real — y 373 de ellos con jerga: «se esperaba un token de tipo "identificador" y se encontró "5"» (`cursor-de-tokens.ts`, `esperarTipo`).

**1.29 Ningún programa que javac 17 compila se presenta como error de compilación** (agregada por el orquestador: 14 de los 131 programas válidos del corpus daban error de compilación; falla de D2/regla 5 de CLAUDE.md que bloqueaba el merge del PR #2) — REQ-SUB-006, REQ-SUB-007, REQ-COMP-004, REQ-COMP-006, REQ-COMP-010, REQ-DIFF-006 · depende: 1.16, 1.24–1.28 — ✅ hecha (2026-09-29)
- Hallazgo (orquestador, verificado con los veredictos REALES de javac guardados en los `.oraculo.json`): 14 de los 131 programas con `compilo: true` de `corpus/curso` + `corpus/experimentos` se presentaban como `error-compilacion`: 7× `Scanner.next()` (`firmas-jdk.generado.ts` traía DOS `next()` sin parámetros: el real y el método puente `next():Object`), 3× `import` de clases reales fuera del subconjunto (`java.util.Locale`, `java.text.DecimalFormatSymbols`, dando `importacion-no-reconocida` en vez del aviso que pide el diseño §2.3/§2.6), 2× cast `(byte)`, 1× `String.contains(String)` (falta el ensanchamiento de referencia a `CharSequence`) y 1× `case 1, 2 ->`. Nadie lo veía porque la guarda de textos (1.28) solo comprueba que un problema SE PUEDA LEER, no que sea CIERTO, y los mutantes (C7) derivan de `corpus/curso`, cuyos 35 programas no disparan ninguno.
- Hallazgos propios (cada uno verificado contra javac 17.0.18 real y con su prueba; cazados con tres instrumentos: ~250 programas típicos escritos a mano, un barrido diferencial de 12 216 llamadas de biblioteca y un fuzzer diferencial de sentencias de ~200 000 programas, todos comparando el veredicto de javac con `compilar()`; los scripts viven fuera del repo): (A) API — 13 métodos puente públicos en las 10 clases (682 → 669 firmas; 8 claves duplicadas → 0), miembros HEREDADOS que el generador no veía (`Random.nextInt(int,int)`, `nextDouble(double)`…: `getMethods()`, 669 → 755), y el ensanchamiento de referencia general (supertipos generados por el oráculo, 25 tipos; también usados por «más específico»); (B) nombres de clase — la lista de las 4 477 clases de 226 paquetes que un programa sin módulo ve (todos los módulos con export sin calificar, sin incubadoras, filtrada con javac en proceso: rechaza APIs en vista previa), imports reales = aviso, nombres simples de `java.lang`/comodín/propia = aviso, nombre calificado con paquete (`java.util.Scanner sc = new java.util.Scanner(System.in)`); (C) léxico — `.5`, `1.`, `\f`, identificadores con acentos y `ñ` (`int año`), con la tabla EXACTA del JDK 17 (Unicode 13; Node 22 trae Unicode 17); (D) `(byte)`/`(short)`/`(float)`, `case 1, 2:`/`case 1, 2 ->`; (E) sintaxis — declarador estilo C (`int notas[]`), anotaciones (`@SuppressWarnings`), CABECERAS DE MIEMBRO VÁLIDAS que se rechazaban (constructores, `int a, b;`, `static int[] crear(int n)`, `List<String> x`, `<T> T f()`, parámetros genéricos), cabecera de clase (`extends`, `implements`, `class C<T>`, `final`/`abstract`/`strictfp`), interfaz/enum/record ANTES de la clase con `main` o sin ninguna clase, `assert`, clase local, `synchronized`, genéricos con comodín (`Class<?>`); (F) semántica de flujo — asignación definida (JLS 16.1.1: una constante `true`/`false` deja «vacuamente» asignada cualquier variable en la rama que no ocurre, compuesta por `&&`/`||`/`!`; `final boolean DEBUG = true; if (DEBUG) { x = 1; }` daba «variable posiblemente no asignada»; `&&`/`||` como valor; bucles con «asignada si verdadero/falso»; nombres residuales tras cerrar un alcance) y alcanzabilidad (cuerpo de `while (false)`, cuándo completa un `do-while`).
- RED (ejecutados y fallando por su razón concreta antes de tocar producción): la guarda permanente `pruebas/compilacion/programas-validos.test.ts` (nueva, sin JDK: recorre TODOS los `.oraculo.json` con `compilo: true` y exige `ok` o `no-disponible`) → `AssertionError: expected [ …(14) ] to deeply equal []`. Ciclos de la API/nombres/léxico/cast/`case` (antes de una compactación de contexto: se conserva la salida literal solo del RED de la guarda; los demás fallaban por la causa descrita arriba, con conteos medidos, p. ej. 8 claves duplicadas, 156 de 225 paquetes en la lista truncada por el límite de 64 KiB de captura del oráculo). Ciclo 9 (nombres calificados): 19 fallos — `TypeError: textosNoSoportado.nombre-calificado-no-soportado is not a function`, `expected 47 to be 48`. Ciclo 10, cabeceras: 40 fallos — `ErrorDeCompilacion: se esperaba un identificador y se encontró "("` (constructor `C() { }`), `se esperaba "(", ";" o "=" y se encontró ","` (`int a, b;`), `… "["` (`static int[] a;`), `… ">"` (`static <T> void f`), `falta abrir "{" para el cuerpo de la clase` (`extends`), `TypeError: textosNoSoportado[codigo] is not a function`, `expected 48 to be 49`, `expected 'int a = 1, b[] = { 2 }' to be 'int a = 1, b[] = { 2 };'`. Tipos antes de la clase: 13 fallos — `se esperaba "class" y se encontró "interface"` (×3), `"enum"` (×3), `"record"` (×2), `"@"` (×1), y 2× `expected { Object (categoria, codigo, ...) } to match object { categoria: 'no-disponible', …(2) }`. Asignación definida (tabla de 37 casos, TODOS con su veredicto de javac comprobado en lote antes de escribir la prueba): 21 fallos — 17 falsos rechazos (`expected [ { …(3) } ] to deeply equal []`) y 4 falsos aceptos (`expected [] to have a length of 1 but got +0`); después `Alcance`: `alcance.nombresVisibles is not a function` (×3) y `expected undefined to deeply equal []` (`salirBloque`); rendimiento: `expected 7150.243042 to be less than 1000` (×2) y `expected 14769.061291999999 to be less than 1000`. Alcanzabilidad (18 casos con veredicto de javac): 10 fallos — `expected 0 to be greater than or equal to 1` (×9) y `expected 'S' to be '{'`. Genéricos con comodín: 7 fallos — `se esperaba una expresión y se encontró "?"`, `… "["`, `… "int"`. `assert`/tipo local/`synchronized`: 20 fallos — `se esperaba ";" y se encontró "{"`, `… ":"`, `… "("`, `se esperaba una expresión y se encontró "class"`, `textosNoSoportado[codigo] is not a function`. **Contra el código de producción de `HEAD`** (`git archive` en un árbol temporal, con las pruebas actuales encima): 307 pruebas fallan en 16 archivos de prueba y `catalogo-clases.test.ts` no carga (módulo nuevo); en el corpus, 22 de 151 programas válidos eran falsos rechazos (los 14 del hallazgo y 8 de los 20 programas nuevos).
- GREEN: (A) `GenerarFirmasApi.java` (`getMethods()`/`getFields()`, filtro `isBridge()||isSynthetic()`, orden determinista), sondas nuevas `GenerarSupertipos.java`, `GenerarClasesJdk.java` (línea centinela `#total|N`: el oráculo trunca la salida de una sonda a 64 KiB en silencio; `LIMITE_BYTES_SONDAS` 16 MiB) y `GenerarIdentificadores.java`, todo por `generar-datos.ts`/`npm run oraculo:datos` (nadie edita `*.generado.ts`); `conversiones.ts`/`sobrecargas.ts` con `esSubtipoDeReferencia` (JLS 5.1.5). (B) `catalogo-clases.ts`, `ambito-de-nombres.ts` y `atribucion.ts`: imports reales y nombres de `java.lang`/comodín/propia → aviso `clase-no-soportada` SOLO como tipo o receptor (un nombre de clase suelto como valor sigue siendo error: tratarlo como válido bajó los mutantes a 2596/2625), nombre calificado → `nombre-calificado-no-soportado`. (C) `tabla-de-rangos.ts`, `literales.ts`, `analizador-lexico.ts`. (D) `cast` de tipos no soportados → `tipo-primitivo-no-soportado`; `case` con varias etiquetas (`case-con-varias-etiquetas-no-soportado`; con flecha, el aviso de la flecha). (E) `sintaxis/no-soportado.ts` — `validarCabeceraDeMiembro` reconoce constructor (nombre de la clase + «(»; con otro nombre sigue siendo error), tipos calificados/genéricos/de arreglo (`indiceTrasTipo`, `>>`/`>>>` cuentan por sus «>»), parámetros de tipo, varios declaradores (`validarDeclaradoresDeCampo`) y tipos anidados; un CAMPO se consume hasta SU «;» de nivel superior (`consumirCampo`); `consumirCabeceraDeClase` (`herencia-no-soportada`, `generico-no-soportado`); `analizarPrograma` acepta interfaz/enum/record antes de la clase principal y un nodo de clase de relleno (`main: null`) si no hay ninguna `class`; códigos nuevos `assert-no-soportado`, `clase-local-no-soportada`, `sincronizado-no-soportado` y `anotacion-no-soportada`; `pareceGenericoDesde` con comodines y arreglos. (F) `asignacion-definitiva.ts`: `visitarCondicion` — UN recorrido que devuelve «asignada si verdadero» y «asignada si falso» (JLS 16.1.1–16.1.4, una constante no se recorre, como `scanCond` de javac), el estado «vacuo» son solo las variables YA visibles (`Alcance.nombresVisibles`), bucles con «asignada si verdadero/falso» + `break`, actualización del `for`/condición del `do-while` con estado tras el cuerpo ∩ `continue` (reenviado desde `switch`), y las variables mueren al cerrar su alcance (`Alcance.salirBloque` devuelve los nombres); `alcanzabilidad.ts`: el cuerpo de `while`/`for` con condición `false` se reporta él mismo (la «{», aunque esté vacío) y un `do-while` completa sii (su cuerpo completa o hay un `continue` que lo apunta) y la condición no es `true`, o hay un `break`.
- REFACTOR: `herramientas/oraculo/compilar-en-lote.ts` extraído de `mutantes.ts` (lo comparten los mutantes y la verificación de la lista de clases; una compilación por `import`, porque `java.util.List` y `java.awt.List` chocan en un mismo archivo). Un primer diseño de la asignación definida (estado «todas salvo…», y `daSiVerdadero`/`daSiFalso`/`propagar` por separado) aceptaba de más y costaba n⁴ en una cadena de `&&` (240 términos: 6,3 s; en `HEAD`, 2 ms): se reemplazó por `visitarCondicion`, más simple (se eliminaron esas tres funciones) y lineal (3 ms).
- Corpus nuevo (el entregable de «≥10 programas típicos», generado por el oráculo con `npm run oraculo:goldens`): 20 programas en `corpus/experimentos/tipicos/` (`t01`…`t20`: tabla de multiplicar, promedio con `Scanner`, primos, menú con `do-while`/`switch`, métodos y recursión, clase con constructor antes de `main`, objeto de su propia clase, arreglos, cadenas, constantes `final` en un `if`, lectura hasta cero, conversiones y casts, tipos fuera del subconjunto, herencia e interfaces, enum, triángulos, dados con `Random(semilla)`, lista genérica, identificadores con acentos, calculadora con `char`), todos `compilo: true`, desenlace `normal`. Cazaron 8 falsos rechazos más (constructores ×2, interfaz/enum antes de la clase ×2, constante `final` en un `if`, identificadores con acentos, `String.contains`, `Scanner.next`), que entraron en esta tarea. El resto de goldens del corpus salió byte a byte igual (regeneración idempotente). Además, 15 muestras nuevas en `corpus/compilacion/avisos/` (44 → 59: clase del JDK importada/como tipo, anotación, nombre completo, `case` con varias etiquetas, herencia, clase genérica, `assert`, clase local, `synchronized`, constructor propio, tipo antes de la clase, cast a `byte`, genérico con comodín, método que devuelve arreglo), compiladas con javac real por la guarda del oráculo y renderizadas de punta a punta.
- Verif: `npm test` 1580/1580 en 54 archivos (1133 → 1580), `npm run test:oraculo` 189 + 1 omitida (149 + 1 antes: +40, entre ellas las 15 muestras de avisos que javac compila), `npm run lint` (`--quiet`) y `npm run tipos` limpios, `npm run e2e` 17 pasan + 1 omitida (el salto conocido de «sin red» en WebKit; construye por su cuenta), `npm run oraculo:datos` idempotente (hash idéntico de todos los datos generados) y `npm run oraculo:verificar` — 196 programas, goldens idénticos a una regeneración real contra Temurin 17.0.18. Mutantes (C7): veredicto 2625/2625 = 100.00 %, línea 2383/2411 = 98.84 % — idénticos; CÓDIGO 2133/2411 = 88.47 % (antes 87.18 %, 2102): +31 mutantes de «duplicar» del tipo `System.out.println println("…")`, comparados uno por uno contra `HEAD` (los 31 y solo esos), porque javac lee `System.out.println println` como una declaración con tipo calificado y pide «;» y ahora damos `falta-punto-y-coma` en la misma línea (antes `error-no-clasificado`); el umbral (0.87) no se toca. C8: las 44 muestras originales siguen dando su aviso, más las 15 nuevas. `pruebas/compilacion/problemas-en-pantalla.test.ts` verde. Fuzzer (fuera del repo): 80 000 programas de la campaña final, ya con todos los arreglos (modos mixto, puro y de constantes, semillas nuevas), con 0 falsos rechazos y 0 falsos aceptos; el barrido de 12 216 llamadas, 12 216/12 216. Peso (gzip -9 sobre el `dist/` del e2e): `index-*.js` 240 981 B y `trabajador-*.js` 55 577 B = 296 558 B (≈ 290 KB) frente al presupuesto de 500 KB; antes ≈ 228 KB (204 + 23,5). Los datos nuevos pesan ≈ 29 KB comprimidos (clases 23,3 + identificadores 4,8 + supertipos 0,6 + firmas +0,4) y cuentan DOS veces porque `cliente.ts` importa `./trabajador.ts` de forma estática (seguimiento ya anotado en la tarea 3.5), que mete el motor también en `index-*.js`; `npm run presupuesto` sigue sin existir (`herramientas/presupuesto-tamano.ts`, tarea 5.9), así que el peso se midió a mano.
- Riesgos residuales (Java 17 válido que TODAVÍA se presenta como error de sintaxis, ninguno de un curso de U3–U7; verificados con javac y sin corregir a propósito): clases selladas (`sealed`/`non-sealed`/`permits`), literales flotantes hexadecimales (`0x1p3`). Lo contrario —programas que javac rechaza por una regla que este subconjunto no modela y que aquí salen como aviso, nunca como resultado inventado—: `String.length()` desde un contexto estático o `Math.hashCode()` («non-static method … cannot be referenced»), `case 1, 1:` (etiqueta duplicada) y mezclar `case` con flecha y con dos puntos.
- Nota para la revisión del PO (5.11): textos NUEVOS del catálogo, tal como los vería el alumno — `clase-no-soportada` («Tu programa usa la clase `java.util.Locale` en la línea 1. Java sí lo acepta, pero este visualizador cubre las unidades 3 a 7 y todavía no simula esa clase. No lo ejecuto…»), `nombre-calificado-no-soportado` («…el nombre completo de una clase (`java.util.Scanner`)… todavía solo entiende las clases por su nombre corto. Escribe `import java.util.Scanner;` al principio del programa y usa solo `Scanner`…»), `case-con-varias-etiquetas-no-soportado` («…un `case` con varios valores separados por coma (`case 1, 2:`)… todavía solo ejecuta un valor por cada `case`. Escribe un `case` por cada valor, uno debajo del otro: `case 1:` y luego `case 2:`…»), `anotacion-no-soportada` («…una anotación (como `@Override` o `@SuppressWarnings`)… todavía no interpreta anotaciones. Si solo silencia un aviso del editor, puedes quitarla…»), `herencia-no-soportada` («…una clase que hereda de otra o implementa una interfaz (`extends` o `implements`)… todavía no simula herencia ni interfaces…»), `assert-no-soportado` («…una instrucción `assert`… todavía no comprueba aserciones…»), `clase-local-no-soportada` («…un tipo declarado dentro de un método (una clase, interfaz, enum o record local)… todavía no simula clases propias…») y `sincronizado-no-soportado` («…un bloque `synchronized`… todavía no simula hilos ni sincronización…»); y una frase CAMBIADA: `miembro-de-clase-no-soportado` ahora dice «un campo, un constructor, un método distinto de `main`…». Observación de tono, previa y sin tocar: el texto de `tipo-primitivo-no-soportado` dice «…que Java sí tiene, pero que no forma parte de este subconjunto en la línea 3. Java sí lo acepta…» (repite «Java sí» y deja la línea al final de la primera oración). Ojo: `generico-no-soportado` se reutiliza para `class C<T>` y comodines y habla de `ArrayList<Integer>`.

**1.30 Ningún aviso afirma que Java acepta un programa que javac rechaza** (agregada por el orquestador por decisión explícita del PO, 2026-09-29: «sí, corrige la frase ya»; falla de D2/regla 5 de CLAUDE.md anterior a la 1.29, que la guarda de la 1.29 —los programas que javac COMPILA— no podía ver) — REQ-SUB-006, REQ-SUB-007 · depende: 1.24–1.29 — ✅ hecha (2026-09-29)
- Hallazgo (orquestador, verificado con los veredictos REALES de javac guardados en los `.oraculo.json`): `marco()` (`src/textos/es-MX/no-soportado.ts`) armaba casi todos los avisos con «Tu programa usa QUÉ en la línea N. Java sí lo acepta, pero este visualizador cubre las unidades 3 a 7 y todavía…». Pero reconocer una construcción fuera del subconjunto no permite revisar la validez de lo que queda DENTRO de ella, así que de los 45 programas del corpus con `"compilo": false`, 7 reciben un aviso que afirma «Java sí lo acepta» (o «Java sí tiene») y eso es FALSO para ellos: `E3_float_desde_double_literal` y `E4_byte_suma_sin_cast` (`tipo-primitivo-no-soportado`), `err25_metodo_no_retorna_valor`, `err26_falta_return_en_rama` y `err27_llamada_argumentos_incorrectos` (`miembro-de-clase-no-soportado`), `err31_etiqueta_break_no_existe` (`break-con-etiqueta-no-soportado`) y `struct05_dos_clases_publicas` (`otro-tipo-de-nivel-superior-no-soportado`). Ya daban el mismo aviso antes de la 1.29: no es una regresión. Además, el texto de `tipo-primitivo-no-soportado` («un tipo primitivo (`float`, `byte` o `short`) que Java sí tiene, pero que no forma parte de este subconjunto en la línea 3. Java sí lo acepta…») repetía la afirmación, no decía cuál de los tres tipos era y dejaba la línea a media oración (la observación de tono ya anotada en la nota de la 1.29).
- Hallazgos propios (medidos con el `compilar()` REAL sobre los 196 programas del corpus que traen veredicto de javac): de los 45 rechazados, 38 salen como `error-compilacion` (correcto), 7 como aviso (los de arriba) y NINGUNO como `ok` ni como `ejecucion-no-disponible` (un falso acepto del compilador: hoy no hay ninguno, y la guarda nueva lo vigila); de los 151 válidos, 5 dan `ok`, 102 `ejecucion-no-disponible` y 44 un aviso de una construcción. Las únicas pruebas que esperaban «Java sí» de un aviso de construcción eran las de `no-soportado.test.ts`; `texto-del-problema.test.ts` y `Visualizador.test.tsx` esperan «Java sí acepta tu programa» de `ejecucion-no-disponible` (la excepción explícita de esta tarea: solo se emite DESPUÉS de que TODAS las pasadas de compilación aceptaron el programa) y se dejan como están. Ningún otro texto de `src/textos/es-MX/` afirma que Java acepta el programa (revisado con `grep`; los textos de arranque, «Java compiló tu clase… sin problema», están respaldados por los goldens del lanzador y quedan igual). `PALABRAS_TIPO_PRIMITIVO_NO_SOPORTADO` era una lista escrita a mano (`float`, `byte`, `short`) sin relación con ningún tipo: ahora hay UNA lista y de ella salen el conjunto de reconocimiento y el tipo de los datos del aviso.
- RED (cada uno ejecutado y fallando por su razón concreta antes de tocar producción):
  1. Guarda permanente `pruebas/compilacion/programas-invalidos.test.ts` (nueva, sin JDK, junto a `programas-validos.test.ts`; 5 pruebas, 4 pasaban de nacimiento: el barrido mínimo, los falsos aceptos y los dos controles del detector): `AssertionError: expected [ …(7) ] to deeply equal []` con los 7 programas, p. ej. `corpus/experimentos/numeros/errores_compilacion/E3_float_desde_double_literal.java → [tipo-primitivo-no-soportado] «Java sí tiene»` y `corpus/experimentos/texto/err25_metodo_no_retorna_valor.java → [miembro-de-clase-no-soportado] «Java sí lo acepta»`.
  2. Catálogo `src/textos/es-MX/no-soportado.test.ts`: 108 de 178 fallan — `AssertionError: expected 'Tu programa usa un arreglo (`int[]`) …' to be 'Tu programa usa un arreglo (`int[]`) …'` (`Received: "…en la línea 4. Java sí lo acepta, pero este visualizador cubre las unidades 3 a 7 y todavía no muestra arreglos. No lo ejecuto…"`): 50 de «no dice que Java acepta el programa» (uno por código con el marco), 50 de «sigue el marco» y 8 del texto de arreglo, `clase-no-soportada`, el formato compartido, el orden exacto de las cuatro frases y `tipo-primitivo-no-soportado` (`float`, `byte`, `short` y el texto exacto de `byte`).
  3. Sitios de emisión y punta a punta, 19 de 397 fallan en 4 archivos: `expected {} to deeply equal { tipo: 'float' }` (declaración, `sintaxis/no-soportado.test.ts` ×5), `expected { Object (tipo, codigo, ...) } to match object { Object (tipo, codigo, ...) }` (cast, `expresiones.test.ts` ×3), `expected { categoria: 'no-disponible', …(4) } to match object { categoria: 'no-disponible', …(3) }` (`compilador.test.ts` ×6) y `AssertionError: expected false to be true` (`avisos-textos.test.ts` ×5: el texto no empezaba por «Tu programa usa el tipo `float` en la línea 3. »).
  4. Tipos: con el contrato `{ tipo }` ya declarado y los emisores sin tocar, `npm run tipos` señaló exactamente los dos sitios de emisión — `analizador-sintactico.ts(450,111): error TS2345: Argument of type '{}' is not assignable to parameter of type '{ readonly tipo: "float" | "byte" | "short"; }'` y `expresiones.ts(336,101): error TS2741: Property 'tipo' is missing in type '{}' but required in type '{ readonly tipo: "float" | "byte" | "short"; }'`.
  5. Pantalla (RED tardío, honestamente: estas dos aserciones se agregaron DESPUÉS del GREEN, y su RED se comprobó devolviendo un momento el catálogo de `HEAD`, restaurado enseguida): componente `Visualizador.test.tsx` — `expected 'Tu programa usa un arreglo (int[]) en…' to contain 'Es parte de Java, pero este visualiza…'`; E2E en Chromium con el build real — `Expected substring: "Es parte de Java, pero este visualizador cubre las unidades 3 a 7"` / `Received string: "Tu programa usa un arreglo (int[]) en la línea 3. Java sí lo acepta, pero este visualizador cubre las unidades 3 a 7 y todavía no muestra arreglos. No lo ejecuto…"`.
- GREEN: (a) `marco()` — «Tu programa usa QUÉ en la línea N. **Es parte de Java**, pero este visualizador cubre las unidades 3 a 7 y todavía TODAVÍA, **así que no puedo revisar si esa parte está bien escrita**.[ ALTERNATIVA] No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.» (redacción aprobada por el PO): afirma la CONSTRUCCIÓN, nunca el programa, y admite lo que no revisa. Comentario de cabecera del catálogo y de `marco()` puestos al día (ya no repiten la frase vieja), y los de `ejecucion-no-disponible` (único texto que dice «Java sí acepta tu programa», con la razón) y del respaldo `no-soportado`. (b) `tipo-primitivo-no-soportado` — `DatosPorCodigoNoSoportado` pasa de `{}` a `{ tipo: 'float' | 'byte' | 'short' }` (`TIPOS_PRIMITIVOS_NO_SOPORTADOS` y `TipoPrimitivoNoSoportado` en `motor/no-soportado.ts`); `sintaxis/no-soportado.ts` deriva `PALABRAS_TIPO_PRIMITIVO_NO_SOPORTADO` de esa lista y agrega el estrechador `esTipoPrimitivoNoSoportado`; los DOS sitios de emisión (`analizador-sintactico.ts`, la declaración —también la de un `for`—, y `expresiones.ts`, el cast) mandan `{ tipo }` sin ningún `as`. Texto: QUÉ «el tipo `byte`», TODAVÍA «no simula ese tipo», ALTERNATIVA «Si tu programa lo permite, usa `int` en vez de `byte`.» (`float` → `double`; `byte` y `short` → `int`, en `TIPO_DEL_SUBCONJUNTO_EN_SU_LUGAR`, un `Record` tipado por el mismo `tipo`: agregar un tipo sin su alternativa deja de compilar).
- REFACTOR: `pruebas/compilacion/corpus-con-veredicto.ts` (recorrido del corpus con el veredicto de javac de cada `.oraculo.json`) extraído de `programas-validos.test.ts`, que ahora lo importa: las dos guardas (1.29 y 1.30) comparten el recorrido en vez de copiarlo.
- Verif: `npm test` 1713/1713 en 55 archivos (1580 → 1713: +5 `programas-invalidos`, +108 `no-soportado.test.ts`, +5 `sintaxis/no-soportado.test.ts`, +3 `expresiones.test.ts`, +6 `compilador.test.ts`, +5 `avisos-textos.test.ts`, +1 `Visualizador.test.tsx`), `npm run test:oraculo` 189 + 1 omitida (sin cambio), `npm run lint` (`--quiet`) y `npm run tipos` limpios, `npm run e2e` 17 pasan + 1 omitida (el salto conocido de «sin red» en WebKit; construye por su cuenta). Mutantes (C7) idénticos: veredicto 2625/2625 = 100.00 %, línea 2383/2411 = 98.84 %, código 2133/2411 = 88.47 % (cambio de texto y de datos, nunca de la gramática ni del veredicto). Las guardas de la 1.28 (`problemas-en-pantalla.test.ts`, 8/8), la 1.29 (`programas-validos.test.ts`, 2/2) y `avisos-textos.test.ts` (72/72) siguen verdes. La guarda nueva no es vacía: con el filtro invertido (los 151 programas que javac compiló) falla en sus tres pruebas — `expected 45 to be greater than or equal to 151`, 107 «falsos aceptos» (5 `ok` + 102 `ejecucion-no-disponible`) y 102 textos con «Java sí acepta tu programa».
- Nota para la revisión del PO (5.11), los textos tal como los vería el alumno: arreglo — «Tu programa usa un arreglo (`int[]`) en la línea 4. Es parte de Java, pero este visualizador cubre las unidades 3 a 7 y todavía no muestra arreglos, así que no puedo revisar si esa parte está bien escrita. No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.»; `float` en E3 — «Tu programa usa el tipo `float` en la línea 3. Es parte de Java, pero este visualizador cubre las unidades 3 a 7 y todavía no simula ese tipo, así que no puedo revisar si esa parte está bien escrita. Si tu programa lo permite, usa `double` en vez de `float`. No lo ejecuto…»; método propio en err25 — «Tu programa usa un miembro propio de la clase (un campo, un constructor, un método distinto de `main`, una clase interna o un bloque inicializador) en la línea 2. Es parte de Java, pero este visualizador cubre las unidades 3 a 7 y todavía no ejecuta nada fuera de `main`, así que no puedo revisar si esa parte está bien escrita. Si necesitas repetir código, cópialo dentro de `main` por ahora. No lo ejecuto…»; clase `java.util.Locale` — «Tu programa usa la clase `java.util.Locale` en la línea 1. Es parte de Java, pero este visualizador cubre las unidades 3 a 7 y todavía no simula esa clase, así que no puedo revisar si esa parte está bien escrita. No lo ejecuto…».
- Riesgos y observaciones: (1) el escenario «arreglo fuera de alcance» de `specs/subconjunto-java/spec.md` (l.60) y el ejemplo de `proposal.md` §2.3 (l.77) conservan la frase anterior («Java sí lo acepta…»): esta tarea no los tocó (fuera de su encargo). **Resuelto por el orquestador el 2026-09-29**: el requisito, el escenario y la tabla de `spec.md` y los dos lugares de `proposal.md` ya citan la frase aprobada por el PO. (2) La excepción `ejecucion-no-disponible` («Java sí acepta tu programa») es tan cierta como la cobertura de las reglas con que javac rechaza: 0 falsos aceptos en los 45 rechazados del corpus (más los 2 625 mutantes al 100 % y los ≈ 80 000 programas del fuzzer de la 1.29), pero cualquier regla de javac que el compilador no modele y que deje pasar un programa lo volvería falso; la guarda nueva lo vigila sobre el corpus. (3) El detector de la guarda reconoce «Java sí (lo|la) acepta / tiene»: una redacción futura distinta («Java sí lo permite») no lo dispararía. (4) `escape-no-soportado` conserva en su QUÉ «una secuencia de escape que Java reconoce pero este visualizador todavía no simula…»: afirma la construcción, no el programa (correcto), pero ahora repite la idea del marco; no se tocó por no ser una afirmación falsa (candidata a la revisión de 5.11).

**Criterio de salida:** `motor/{lexico,sintaxis,semantica,compilador}` + `pruebas/compilacion/**` verdes; C7 (100% veredicto, ≥95% línea) y C8 (100% muestras) cumplidos.
**Cierre:** `sdd-verify` del lote 1 → commit con confirmación del PO → actualizar `state.yaml`.

## Lote 2 — Ejecución y biblioteca

**Objetivo:** fidelidad numérica y de biblioteca verificada contra el oráculo (números, `digitosJava`, `printf`, fdlibm, `Random`, texto, `Scanner`, excepciones y marcos), luego IR + intérprete con Paso Normal y registro de valores. El lote más grande y de mayor riesgo de fidelidad — por eso lleva `judgment-day` obligatorio al cierre.
**Criterio de entrada:** lote 1 cerrado (compilación completa en español, catálogo del JDK en `corpus/datos/api`).
**Sesiones:** 4–5 (design.md §10).

**2.1 Generación de conjuntos del oráculo** — REQ-DIFF-001(extensión) · depende: 1.9
- RED `herramientas/oraculo/generar-datos.test.ts`(ampliado): genera `corpus/datos/{double-tostring,printf,random,pow,caracteres,scanner,parseo}/` con los tamaños de design §7.3 (double-tostring: salón 19828 + aleatorios 25465 + denso ≥200000 + banda ≥1000/exponente + empates 149985 + potencias de dos 2098 + subnormales 20104; printf ≥30000; random ≥8 semillas×1000; pow ≥26000; caracteres 65536); CI corre un subconjunto de smoke, el nocturno el conjunto completo; falla sin el generador ampliado.
- GREEN: amplía `herramientas/oraculo/generar-datos.ts`.
- Verif: `herramientas/oraculo/generar-datos` (smoke) / nocturno (completo)

**2.2 Enteros, `long`, `char`, conversiones** — REQ-BIB-001, REQ-SUB-002(aritmética/casts `long`), REQ-EJEC-005(parte entera) · depende: 2.1
- RED `biblioteca/numeros/{enteros,largos,caracter,conversiones}.test.ts`: `int` con `|0`/`Math.imul`/`ArithmeticException: / by zero`/`MIN_VALUE / -1` sin excepción; `long` con `BigInt.asIntN(64,·)`; `(int)(long)1e30=-1`; `(int)1e10=Integer.MAX_VALUE`; `NaN→0`; cast solo al operando sintáctico; falla.
- GREEN: `src/motor/biblioteca/numeros/{enteros,largos,caracter,conversiones}.ts`.
- REFACTOR: función de saturación y función de wraparound compartidas.
- Verif: `motor/biblioteca/numeros`

**2.3 `digitosJava` — 5 clases** — REQ-BIB-002(parte 1) · depende: 2.1
- RED `biblioteca/formato/digitos-java.test.ts` contra `corpus/datos/double-tostring/`: subnormales (`MIN_VALUE`→`4.9E-324` exacto, resto por regla o aviso "No disponible"), banda `[2^53,2^63)` (0–2 dígitos HALF_UP según exponente), potencias de dos (`x±2^(e−54)`), empates exactos (HALF_UP, nunca a par: `1e23→9.999999999999999E22`), resto de normales (dígitos cortos corregidos con vecinos ±1 en `BigInt`); falla.
- GREEN: `src/motor/biblioteca/formato/digitos-java.ts`.
- REFACTOR: cada clase como función pura con su propio conjunto.
- Verif: `motor/biblioteca/formato/digitos-java`

**2.4 `Double.toString`, `println(double)`, concatenación (cierre)** — REQ-BIB-002 · depende: 2.3
- RED `biblioteca/formato/double-a-texto.test.ts`: casos especiales (`NaN`/`Infinity`/`-Infinity`/`0.0`/`-0.0` por bit de signo), umbral científico (`1e7→1.0E7`), residual documentado (`0x453d04ffce09b504→3.5082457001091195E25`); 45292/45293 del salón + 100% por conjunto denso o aviso; falla.
- GREEN: `src/motor/biblioteca/formato/double-a-texto.ts`; retira el stub numérico de 1.10.
- Verif: `motor/biblioteca/formato/double-a-texto`

**2.5 `Math.pow` (fdlibm)** — REQ-BIB-004(parte pow) · depende: 2.1
- RED `biblioteca/matematicas/fdlibm-pow.test.ts` contra `corpus/datos/pow/`: `Math.pow(10,-4)=1.0E-4` (no `9.999999999999999E-5` de V8); 100% de ≥26000 pares; falla.
- GREEN: `src/motor/biblioteca/matematicas/fdlibm-pow.ts` (puerto de `e_pow.c` fdlibm 5.3, `DataView` 32 bits, aviso de Sun en `AVISOS-DE-TERCEROS.md`; nunca `FdLibm.java` de OpenJDK).
- Verif: `motor/biblioteca/matematicas/fdlibm-pow`

**2.6 `Math` — resto (cierre)** — REQ-BIB-004 · depende: 2.5
- RED `biblioteca/matematicas/math.test.ts`: `round(-2.5)=-2`, `round(0.49999999999999994)=0`, `round(long)` usa sobrecarga `float` (`123456789L→123456792`, `int`), `abs(Integer.MIN_VALUE)` negativo, `sqrt(-1)=NaN`; regla ESLint prohíbe `Math.pow/exp/log*/sin/cos/tan/cbrt/hypot` y `**` en `src/motor`; falla.
- GREEN: `src/motor/biblioteca/matematicas/math.ts` + regla en `herramientas/eslint/`.
- Verif: `motor/biblioteca/matematicas/math`

**2.7 `Random` y semilla visible** — REQ-BIB-005, REQ-EJEC-008 · depende: 2.1
- RED `biblioteca/aleatorio/{random,semillas}.test.ts` contra `corpus/datos/random/`: LCG 48 bits (`0x5DEECE66D`/`0xB`), `new Random(0)`≡`new Random(Long.MIN_VALUE)`, rechazo en `nextInt(bound)` no potencia de 2, secuencia `52,81,42,29,56` con semilla `12345L`; semilla visible (k-ésima instancia sin semilla usa la k-ésima `nextLong()` de `new Random(S)`); falla.
- GREEN: `src/motor/biblioteca/aleatorio/{random,semillas}.ts`.
- Verif: `motor/biblioteca/aleatorio`

**2.8 `printf`/`String.format` + modelo regional** — REQ-BIB-003, REQ-BIB-010 · depende: 2.4
- RED `biblioteca/formato/{formateador,regional}.test.ts` contra `corpus/datos/printf/`: `%.2f` de `2.675→2.68` (HALF_UP sobre dígitos cortos, no `toFixed`), `%.20f` de `0.1` rellena con ceros, excepciones exactas (`UnknownFormatConversionException`, `IllegalFormatConversionException: f != java.lang.Integer`…), `es_MX` punto / `es_ES` coma en entrada Y salida (P2); falla.
- GREEN: `src/motor/biblioteca/formato/{formateador,regional}.ts`.
- REFACTOR: piezas del formato (literal/especificador→texto) reusables por la plantilla 21 (4.11).
- Verif: `motor/biblioteca/formato/formateador`

**2.9 `String` — identidad y métodos** — REQ-BIB-006 · depende: 2.2
- RED `biblioteca/texto/{cadena-java,string}.test.ts`: `"ho"+"la"=="hola"` true, `sc.next()=="si"` false, `charAt` fuera de rango difiere por *coder* (Latin-1 `StringLatin1.charAt`; UTF-16 `String.checkIndex`), `trim` no recorta U+00A0 pero sí `\u0000`; falla.
- GREEN: `src/motor/biblioteca/texto/{cadena-java,string}.ts` (`CadenaJava{texto,latin1}`, pool internado).
- REFACTOR: chequeo de límites compartido entre `substring`/`charAt`.
- Verif: `motor/biblioteca/texto/cadena-java`

**2.10 `Character` — 65536 valores** — REQ-BIB-007 · depende: 2.1
- RED `biblioteca/texto/character.test.ts` contra `corpus/datos/caracteres/`: `isDigit`/`isLetter`/.../`toUpperCase`/`toLowerCase` exactos para los 65536 `char`; falla.
- GREEN: `src/motor/biblioteca/texto/character.ts` + `datos/caracteres.generado.ts`.
- Verif: `motor/biblioteca/texto/character`

**2.11 `Integer`/`Double`/`Long` — envoltorios** — REQ-BIB-008 · depende: 2.4
- RED `biblioteca/texto/envoltorios.test.ts`: `parseInt(" 5 ")` → `NumberFormatException: For input string: " 5 "` (sin recortar); `parseInt("٣٤")=34` (dígitos Unicode); `parseDouble` gramática Java (`NaN`/`Infinity`/`f`/`d`, hex→NO-DISP); `MAX_VALUE`/`MIN_VALUE` de los 3 tipos; falla.
- GREEN: `src/motor/biblioteca/texto/envoltorios.ts`.
- Verif: `motor/biblioteca/texto/envoltorios`

**2.12 `Scanner` — tokenización y excepciones** — REQ-BIB-009, REQ-BIB-010(scanner), REQ-EJEC-010 · depende: 2.8, 2.11
- RED `biblioteca/entrada/{scanner,tokens-scanner}.test.ts` contra `corpus/datos/scanner/`: delimitador `Character.isWhitespace` del JDK; `nextInt()` deja `\n` pendiente (`nextLine()` inmediato → `""`); `InputMismatchException` no consume; `NoSuchElementException` al agotar; `close()`+lectura→`IllegalStateException: Scanner closed`; `"3,5"` rechazado por omisión, aceptado con opción coma; falla.
- GREEN: `src/motor/biblioteca/entrada/{scanner,tokens-scanner}.ts`.
- REFACTOR: tokenizador de delimitadores compartido con `parseo/`.
- Verif: `motor/biblioteca/entrada/scanner`

**2.13 `System.out`/`System.err`** — REQ-BIB-011 · depende: 2.9
- RED `biblioteca/salida/{print-stream,codificacion-jvm}.test.ts`: `print` sin `\n` final; sobrecarga por tipo estático (`print('A')` vs `print(65)`, `'A'+1` imprime `66`); sustitutos sueltos → `?`; `out`/`err` intercalados en orden real; falla.
- GREEN: `src/motor/biblioteca/salida/{print-stream,codificacion-jvm}.ts`.
- Verif: `motor/biblioteca/salida`

**2.14 Excepciones y marcos de pila** — REQ-EJEC-006(biblioteca) · depende: 1.9, 2.9
- RED `biblioteca/excepciones/{excepcion-java,traza-de-pila}.test.ts` contra `corpus/datos/marcos/`: `"abc".charAt(5)`→`StringIndexOutOfBoundsException: String index out of range: 5` con `StringLatin1.charAt(StringLatin1.java:48)`; `"€bc".charAt(5)`→`index 5, length 3` con `StringUTF16`; `ArithmeticException` sin marcos de `java.base`; marco del alumno calificado si hay `package`; falla.
- GREEN: `src/motor/biblioteca/excepciones/{excepcion-java,traza-de-pila}.ts`.
- REFACTOR: tabla (operación, modo de falla, *coder*)→marcos como dato.
- Verif: `motor/biblioteca/excepciones`

**2.15 Catálogo API (soportado / existe-no-soportado / no-existe)** — REQ-SUB-008 · depende: 1.9, 2.2–2.14
- RED `biblioteca/catalogo/catalogo-api.test.ts`: cada miembro de REQ-SUB-005 clasifica `soportado`; cada fila de REQ-SUB-007 clasifica `existe-no-soportado`; símbolo inventado → `no-existe`; formato no literal en `printf` detiene en ejecución con el mismo aviso, traza previa navegable; falla.
- GREEN: `src/motor/biblioteca/catalogo/catalogo-api.ts` reemplaza el stub de 1.8.
- REFACTOR: elimina el stub de 1.8.
- Verif: `motor/biblioteca/catalogo`

**2.16 IR tipada** · depende: 1.14, 2.2–2.15
- RED `ir/{ir,generar-ir,plan-evaluacion}.test.ts`: baja `int total = a + b * 2;` a nodos tipados (conversiones implícitas visibles) y produce el plan de evaluación en orden Java (izq., der., operador; `x op= e` lee `x` primero; llamada: objetivo luego argumentos); falla.
- GREEN: `src/motor/ir/{ir,generar-ir,plan-evaluacion,vista-programa}.ts`.
- Verif: `motor/ir`

**2.17 Intérprete — expresiones** — REQ-EJEC-005(cierre) · depende: 2.16
- RED `interprete/expresiones.test.ts`: `-7%3=-1` (signo del dividendo), `'A'+1=66`, concatenación decide desde el primer `String` izq→der, `x++`/`++x` con efecto en orden de evaluación, registro de valor por punto del plan; falla.
- GREEN: `src/motor/interprete/expresiones.ts` (evaluación recursiva directa).
- Verif: `motor/interprete/expresiones`

**2.18 Intérprete — sentencias, instantánea, límites base** — REQ-EJEC-004, REQ-EJEC-009(mecanismo) · depende: 2.17
- RED `interprete/{sentencias,instantanea,limites}.test.ts`: generador por sentencia con `yield*` en bloques; rama `if`/`else if` en orden; caída de `switch` sin `break`; vuelta de ciclo por separado si anidados; `continue` en `for` ejecuta la actualización antes de re-evaluar; instantánea+reintento en `Scanner` sin datos (misma salida interactiva y preparada — propiedad); falla.
- GREEN: `src/motor/interprete/{sentencias,instantanea,limites}.ts`.
- Verif: `motor/interprete/sentencias`

**2.19 Director de ejecución + Paso Normal** — REQ-EJEC-001, REQ-EJEC-002, REQ-EJEC-006(cierre), REQ-EJEC-010(integración) · depende: 2.14, 2.18
- RED `interprete/ejecucion.test.ts` + `compilador.test.ts`(ampliado): sin análisis limpio no hay traza; condición/asignación resueltas en un solo `Paso` Normal con sustitución completa; `ExcepcionJava`→paso `excepcion`, otra excepción→`error-interno`; `5/0`→`ArithmeticException: / by zero` deteniendo ahí, pasos previos navegables; falla.
- GREEN: `src/motor/interprete/{ejecucion,registro}.ts` + `crearEjecucion` en `compilador.ts`/`index.ts` (contrato §1.3).
- Verif: `motor/interprete/ejecucion`

**2.20 Verificación diferencial completa del corpus (C1)** — REQ-DIFF-003 · depende: 2.19, 0.6
- RED `pruebas/diferencial/corpus.test.ts`: 34/34 programas de `corpus/curso` que terminan → `stdout`/`stderr` byte a byte contra el oráculo; `u6-ciclo-infinito-demo` → `limite-pasos` con `"Vuelta número 1"` en cada renglón y el aviso; falla hasta cubrir el corpus completo.
- GREEN: cierra huecos de biblioteca/intérprete que el corpus real revele — sin archivos nuevos de producción, solo correcciones.
- Verif: `pruebas/diferencial/corpus`

**2.21 Fuzzing de propiedades (C3)** — REQ-DIFF-004(parte C3) · depende: 2.20
- RED `pruebas/generadores/programas.test.ts` (fast-check): ≥1000 AST válidos del subconjunto (ciclos acotados, lecturas con su entrada, `printf` válidos) impresos como Java, corridos en el motor y en el JDK (nocturno) — cada uno coincide exacto o produce el aviso correcto; 0 salidas inventadas; falla sin generador.
- GREEN: `pruebas/generadores/programas.ts` + `herramientas/oraculo/programas-generados.ts` (nocturno, encoge fallos a `corpus/regresiones/`).
- Verif: `pruebas/generadores/programas` (smoke en CI; 1000+ nocturno)

**2.22 Motor en navegadores (C17)** — REQ-PLAT-006 · depende: 2.20
- RED proyecto `navegadores` en `vitest.config.ts` (`@vitest/browser-playwright`): corre diferencial+propiedades en Chromium, Firefox y WebKit, mismo resultado en los tres; falla sin configurar.
- GREEN: configura el proyecto `navegadores` + script `test:navegadores`.
- Verif: `npm run test:navegadores`

**Criterio de salida:** `motor/biblioteca/**` + `motor/{ir,interprete}` verdes; `pruebas/diferencial/corpus` (C1), `pruebas/generadores/programas` (C3), `test:navegadores` (C17) verdes; C4/C5/C6 cumplidos.
**Cierre:** `sdd-verify` del lote 2 → **`judgment-day`** (fidelidad numérica y de biblioteca — el riesgo más alto del producto) → commit con confirmación del PO → actualizar `state.yaml`.

## Lote 3 — Traza y trabajador

**Objetivo:** traza por deltas con puntos de control, prueba de escritorio, protocolo completo del Web Worker (entrada, detener, perro guardián, trabajador de repuesto), diagnóstico de ciclo desbocado, y pruebas de rendimiento.
**Criterio de entrada:** lote 2 cerrado (intérprete Normal completo y fiel, C1 cumplido).
**Sesiones:** 1–2 (design.md §10).

**3.1 Traza por deltas y puntos de control** · depende: 2.19
- RED `motor/traza/traza.test.ts`: punto de control cada 256 pasos; `estadoEn(n)` para cualquier `n` de una traza de 100000 pasos = reproducir desde 0 (propiedad); avanzar/retroceder aplica/deshace un delta; falla (traza mínima de 0.13 sin puntos de control).
- GREEN: `src/motor/traza/traza.ts` completo.
- Verif: `motor/traza/traza`

**3.2 Prueba de escritorio (datos)** — apoya REQ-VIS-010 · depende: 3.1
- RED `motor/traza/prueba-de-escritorio.test.ts`: índice incremental de pasos relevantes (cambian variable, evalúan condición, imprimen), columnas por nombre de variable; falla.
- GREEN: `src/motor/traza/prueba-de-escritorio.ts`.
- Verif: `motor/traza/prueba-de-escritorio`

**3.3 Diagnóstico de ciclo** — REQ-EJEC-007(diagnóstico) · depende: 3.1
- RED `motor/traza/diagnostico-ciclo.test.ts`: sobre un `while` sin `intentos++`, devuelve nombre y valor de la variable de condición que no cambió en las últimas 100 vueltas; falla.
- GREEN: `src/motor/traza/diagnostico-ciclo.ts`.
- Verif: `motor/traza/diagnostico-ciclo`

**3.4 Límites completos en el director (cierre)** — REQ-EJEC-007 · depende: 3.3, 2.19
- RED `interprete/limites.test.ts`(ampliado): 100000 pasos→`detenido`/`limite-pasos` con diagnóstico; 1048576 caracteres por cadena o 4194304 en consola→`limite-caracteres`; 15s cómputo→`limite-tiempo` cooperativo; falla.
- GREEN: integra `diagnosticarCiclo` (3.3) en `src/motor/interprete/limites.ts`.
- Verif: `motor/interprete/limites`

**3.5 Protocolo del trabajador — completo (ADR 007)** · depende: 3.4, 0.13
- RED `trabajador/{protocolo,trabajador}.test.ts`: los 8 mensajes de la tabla §5 del diseño; rebanadas ≤8ms cedidas con `MessageChannel`; clonación estructurada conserva `BigInt`/`-0`/`NaN`; falla (0.13 solo cubre 3 mensajes).
- GREEN: `src/trabajador/{protocolo,trabajador}.ts` completos.
- Verif: `trabajador/trabajador`

**3.6 Cliente y perro guardián** · depende: 3.5
- RED `trabajador/{cliente,perro-guardian}.test.ts`: 2s sin mensajes mientras calcula → `terminate()` + trabajador de repuesto ya cargado, `fin limite-tiempo`, traza recibida sigue navegable; 300ms sin responder a `detener` → `terminate()`; falla.
- GREEN: `src/trabajador/{cliente,perro-guardian}.ts`.
- Verif: `trabajador/cliente`
- Seguimiento (orquestador, 2026-09-29, medido sobre el build del E2E de la 1.28): el respaldo en proceso de `cliente.ts` (para jsdom, que no tiene `Worker`) importa `./trabajador.ts` de forma estática, así que el motor completo entra también en el paquete del hilo principal (`index-*.js`, 734 KB sin comprimir / 204 KB con gzip; el motor solo pesa ~24 KB con gzip en `trabajador-*.js`). En un navegador real nunca se ejecuta ahí, pero se descarga dos veces. Al rehacer el cliente, llevar ese respaldo a las pruebas (inyección del transporte) o a un `import()` dinámico, y medirlo con `npm run presupuesto` (`herramientas/presupuesto-tamano.ts` todavía no existe).

**3.7 Propiedad: interactiva ≡ preparada; retroceder no repite entrada (cierre)** — REQ-EJEC-009 · depende: 3.1, 2.18
- RED `pruebas/propiedades/entrada.test.ts` (fast-check): traza con entrada interactiva ≡ traza con la misma entrada precargada; retroceder con `Traza.estadoEn` a un paso anterior a una lectura ya satisfecha y avanzar de nuevo reproduce el mismo valor sin pedirlo otra vez; falla.
- GREEN: conecta `instantanea.ts` (2.18) con `Traza.estadoEn` (3.1).
- Verif: `pruebas/propiedades/entrada`

**3.8 Rendimiento — Normal (C10, C11)** — REQ-PLAT-004(parte Normal) · depende: 3.4, 3.6
- RED `pruebas/rendimiento/normal.spec.ts` (Playwright, Chromium, CPU×4): 100000 pasos Normal ≤1s; cambiar de paso ≤100ms p95; saltar a cualquier paso de una traza de 100000 ≤200ms; 5 ciclos desbocados distintos → teclado ≤100ms p95, aviso ≤2s; falla contra un umbral no cumplido.
- GREEN: ajusta tamaño de rebanada del trabajador (3.5) y frecuencia de puntos de control (3.1) hasta cumplir.
- Verif: `npm run rendimiento -- normal` (umbral oficial en la máquina de referencia; holgado en CI)

**Criterio de salida:** `motor/traza/**`, `trabajador/**`, `pruebas/propiedades/entrada`, `pruebas/rendimiento/normal` verdes; C10 y C11 (modo Normal) cumplidos.
**Cierre:** `sdd-verify` del lote 3 → commit con confirmación del PO → actualizar `state.yaml`.

## Lote 4 — Visualizador

**Objetivo:** M1–M3, M5–M17 — editor, marcadores, paneles de variables/condición/consola/prueba de escritorio, explicación en español, controles de reproducción, integrados sobre la traza y el trabajador; línea base de accesibilidad.
**Criterio de entrada:** lote 3 cerrado (traza navegable con puntos de control, protocolo del trabajador completo).
**Sesiones:** 3–4 (design.md §10).

**4.1 Catálogo de textos es-MX + regla de lint** · depende: 1.11
- RED `src/textos/es-MX/explicaciones.test.ts`: las 26 plantillas de `exploracion/01` §7 devuelven texto sin marcadores `{…}` sin resolver dado un `Paso` de ejemplo; `pruebas/arquitectura/sin-texto-literal.test.ts` (ESLint) rechaza un string literal fixture en JSX/`aria-label`; falla.
- GREEN: `src/textos/es-MX/{explicaciones,excepciones,interfaz,ayuda}.ts` (amplía `problemas.ts` de 1.11) + regla en `herramientas/eslint/`.
- REFACTOR: cada plantilla como función tipada por sus datos (completas por construcción, C9).
- Verif: `src/textos/es-MX` + `pruebas/arquitectura/sin-texto-literal`

**4.2 Modelo de vista y sustitución** — apoya REQ-VIS-006, REQ-VIS-011 · depende: 3.1, 4.1
- RED `presentacion/{modelo-vista,sustitucion}.test.ts`: paso de condición deriva `intentos < 10 → 3 < 10 → true`; paso de asignación deriva `ModeloVista` con variables vivas y explicación resuelta; falla.
- GREEN: `src/presentacion/{modelo-vista,sustitucion}.ts`.
- Verif: `presentacion/modelo-vista`

**4.3 `EditorJava` (CodeMirror 6)** — REQ-VIS-001 · depende: 0.14
- RED `interfaz/editor/EditorJava.test.tsx`: pegar un programa muestra resaltado de Java y números de línea sin configuración previa; Tab no se captura; falla contra el editor mínimo de 0.14.
- GREEN: `src/interfaz/editor/EditorJava.tsx` con extensiones de §6.3 (`@codemirror/{state,view,language,commands,lang-java}`, historial, sangría, correspondencia de llaves).
- REFACTOR: aísla el `StateField` de resaltados en un módulo propio (4.4).
- Verif: `interfaz/editor/EditorJava`

**4.4 Resaltados y marcadores de línea** — REQ-VIS-004 · depende: 4.3, 4.2
- RED `presentacion/resaltados.test.ts` + `editor/resaltados.test.tsx`: línea recién ejecutada y línea siguiente con DOS marcas distintas (no solo color); rama no tomada atenuada con etiqueta; "no evaluado" tachado con etiqueta; contador de vueltas como *widget*; falla.
- GREEN: `src/presentacion/resaltados.ts` + `StateField`/`StateEffect` en `EditorJava.tsx`.
- Verif: `presentacion/resaltados`

**4.5 Aviso de problema (4 tipos)** — REQ-VIS-002 · depende: 4.3, 1.11
- RED `componentes/AvisoProblema.test.tsx`: error de compilación en línea 3 → ícono/título "Error de compilación", distinto de "No disponible en el visualizador"; subrayado ondulado (error) vs punteado (aviso); falla.
- GREEN: `src/interfaz/componentes/AvisoProblema.tsx`.
- Verif: `interfaz/componentes/AvisoProblema`
- 1.28 adelantó el texto real de cada problema en pantalla (con su línea y el código en `<code>`); a la 4.5 le quedan el ícono, el título y el subrayado.

**4.6 Panel de variables** — REQ-VIS-005 · depende: 4.2
- RED `componentes/PanelVariables.test.tsx`: `contador` 3→4 muestra "3 → 4" con el 3 atenuado; sin inicializar → "sin inicializar"; fuera de alcance → atenuada/retirada con nota; falla.
- GREEN: `src/interfaz/componentes/PanelVariables.tsx` + `contenedores/PanelVariables.tsx` (`useSyncExternalStore` sobre `Traza`).
- Verif: `interfaz/componentes/PanelVariables`

**4.7 Consola, búfer y campo de entrada** — REQ-VIS-008, REQ-VIS-009 · depende: 4.2, 3.5
- RED `componentes/{Consola,FranjaBufer,CampoEntrada}.test.tsx`: mensaje+entrada tecleada en el mismo renglón, entrada con color distinto Y rasgo no cromático; `System.err` en rojo; franja `"Pendiente: ␣30⏎"` visible tras `nextInt()`+`nextLine()`; sin mensajes de IDE; falla.
- GREEN: `src/presentacion/consola.ts` + `src/interfaz/componentes/{Consola,FranjaBufer,CampoEntrada}.tsx`.
- Verif: `interfaz/componentes/Consola`

**4.8 Panel de condición** — REQ-VIS-006 · depende: 4.2
- RED `componentes/PanelCondicion.test.tsx`: rama no tomada atenuada, NUNCA oculta; cadena `else if` en orden; `case` igualado + caída sin `break` + `default` señalados explícitamente; falla.
- GREEN: `src/interfaz/componentes/PanelCondicion.tsx`.
- Verif: `interfaz/componentes/PanelCondicion`

**4.9 Contador de vueltas (UI)** — REQ-VIS-007 · depende: 4.4
- RED `componentes/ContadorVueltas.test.tsx`: dos `for` anidados muestran "ciclo externo: vuelta 2 · ciclo interno: vuelta 3", contadores por separado; falla.
- GREEN: `src/interfaz/componentes/ContadorVueltas.tsx` (usa el *widget* de 4.4).
- Verif: `interfaz/componentes/ContadorVueltas`

**4.10 Prueba de escritorio (UI)** — REQ-VIS-010 · depende: 3.2, 4.6
- RED `componentes/PruebaDeEscritorio.test.tsx`: pestaña alterna a Variables; `total` 0→25 en el paso 6 → celda resaltada; columna de salida presente; tabla virtualizada con ≥1000 renglones sin colgar; falla.
- GREEN: `src/interfaz/componentes/PruebaDeEscritorio.tsx` sobre `motor/traza/prueba-de-escritorio.ts` (3.2).
- Verif: `interfaz/componentes/PruebaDeEscritorio`

**4.11 Explicación en español (incl. plantilla 21 `printf`)** — REQ-VIS-011 · depende: 4.1, 4.2, 2.8
- RED `componentes/Explicacion.test.tsx`: paso de asignación → "se calcula total + precio y el resultado (125) se guarda en total. Antes tenía 100." (≤2 renglones); paso de `printf` usa las piezas de 2.8; `aria-live="polite"` salvo excepción (`assertive`); falla.
- GREEN: `src/interfaz/componentes/Explicacion.tsx`.
- Verif: `interfaz/componentes/Explicacion`

**4.12 Controles de reproducción** — REQ-VIS-012 · depende: 0.14
- RED `componentes/BarraControles.test.tsx`: ⏮◀▶⏭⏯, velocidad, deslizador "paso X de Y"; flechas avanzan/retroceden, Inicio/Fin saltan a extremos, espacio reproduce/pausa; falla.
- GREEN: `src/interfaz/componentes/BarraControles.tsx`.
- Verif: `interfaz/componentes/BarraControles`

**4.13 `EstadoApp` + `ClienteTrabajador` — integración** · depende: 4.3–4.12
- RED `interfaz/App.test.tsx`(ampliado): el reductor `EstadoApp` (§6.1) conecta editor→trabajador (3.5/3.6)→traza→todos los paneles de 4.4–4.12 en un flujo único (pegar, Visualizar, navegar, ver variables/condición/consola/explicación); falla.
- GREEN: `src/interfaz/estado/reductor.ts` (`useReducer`) + `src/interfaz/contenedores/{App,Visualizador}.tsx` completos.
- REFACTOR: separa contenedor/presentacional donde 4.4–4.12 aún no lo esté.
- Verif: `interfaz/App`

**4.14 Cobertura de explicación Normal + errores conceptuales (parte)** — REQ-DIFF-007(Normal) · depende: 4.13
- RED `pruebas/traza/cobertura-normal.test.ts`: en cada traza Normal de `corpus/curso`, ninguna explicación tiene marcador sin resolver; los errores conceptuales #1,2,3,5,6,7,8,9,10,11,12,14,16,17 (`exploracion/01` §6 — los que no requieren Detallado) tienen ≥1 programa que los hace visibles; falla.
- GREEN: ajustes de plantillas/datos que el barrido revele.
- Verif: `pruebas/traza/cobertura-normal`

**4.15 Accesibilidad AA — línea base** — REQ-PLAT-005(parte) · depende: 4.13
- RED `pruebas/e2e/accesibilidad-base.spec.ts` (Playwright + `@axe-core/playwright`): cero violaciones graves/críticas en la pantalla principal con un programa cargado; flujo M1–M17 solo con teclado; `prefers-reduced-motion` sin perder información; zoom 200% sin recorte; falla.
- GREEN: ajustes de foco/contraste/`aria-*` que el barrido revele.
- Verif: `npm run e2e -- accesibilidad-base`

**4.16 E2E — M1–M3, M5–M17 combinados (C9 Normal, C14 base)** · depende: 4.14, 4.15
- RED `pruebas/e2e/visualizador-normal.spec.ts` (Chromium + Firefox): pega código de `corpus/curso`, Visualizar, navega con teclado y mouse, ve variables/condición/consola/prueba de escritorio/explicación, termina por excepción y por límite de pasos; falla hasta que 4.1–4.15 cierren.
- GREEN: cierra huecos de integración que el E2E revele.
- Verif: `npm run e2e -- visualizador-normal`

**Criterio de salida:** `interfaz/**` + `presentacion/**` (excepto Detallado) verdes; `pruebas/traza/cobertura-normal`, `e2e/accesibilidad-base`, `e2e/visualizador-normal` verdes; C9(Normal) y C14(base) cumplidos.
**Cierre:** `sdd-verify` del lote 4 → commit con confirmación del PO → actualizar `state.yaml`.

## Lote 5 — Aula

**Objetivo:** M18–M23 — predicción ligera, galería (curricular + autoría D6), enlace compartible, modo proyector, PWA completa, auditoría AA completa → **hito: validación en aula**.
**Criterio de entrada:** lote 4 cerrado (visualizador Normal completo, línea base de accesibilidad).
**Sesiones:** 2–3 (design.md §10).

**5.1 Predicción ligera (D4)** — REQ-VIS-013 · depende: 4.13
- RED `interfaz/estado/reductor.test.ts` + `componentes/PreguntaPrediccion.test.tsx`: apagada al abrir sin parámetro; activada por interruptor, antes de revelar condición o continuación de ciclo "Adelante" se sustituye por "¿Se repite el ciclo? Sí/No"; solo al responder se revela resultado+explicación; falla.
- GREEN: `src/presentacion/prediccion.ts` + `src/interfaz/componentes/PreguntaPrediccion.tsx` + `navegacion.prediccion` en el reductor.
- Verif: `interfaz/componentes/PreguntaPrediccion`

**5.2 Galería curricular** — REQ-AULA-001 · depende: 0.6, 5.3
- RED `presentacion/galeria.test.ts`: `import.meta.glob` sobre `corpus/{curso,autoria}` arma una entrada por programa con unidad, origen, "Qué observar", semilla y ajustes sugeridos; falla sin `corpus/autoria/` (5.3) ni el módulo.
- GREEN: `src/presentacion/galeria.ts` + `src/interfaz/componentes/Galeria.tsx` + `DialogoGaleria.tsx`.
- Verif: `presentacion/galeria`

**5.3 Autoría de ejemplos D6** — REQ-DIFF-004(parte C2) · depende: 0.6
- RED `pruebas/diferencial/autoria.test.ts`: cada programa de `corpus/autoria/` (≥1 por unidad U3–U7 y por API: `Math`, `Random` con/sin semilla, `printf`, `String`, `Character`, `long`) coincide 100% con el oráculo; falla sin los programas.
- GREEN: escribe los programas en `corpus/autoria/` (regenerados con 0.6/2.1), marcados "de autoría".
- Verif: `pruebas/diferencial/autoria`

**5.4 Enlace compartible** — REQ-AULA-002, REQ-AULA-003 · depende: 4.13
- RED `presentacion/enlace.test.ts`: codifica/decodifica código+entradas+semilla+nivel+predicción+proyector+regional en `#` con `lz-string`; ida y vuelta exacta; parseo manual evita `+`→espacio; versión desconocida → aviso, nunca abre a medias; >2000 caracteres → ofrece `.java`; falla.
- GREEN: `src/presentacion/enlace.ts` + `DialogoCompartir.tsx`.
- Verif: `presentacion/enlace`

**5.5 Modo proyector** — REQ-AULA-004 · depende: 4.13
- RED `pruebas/e2e/proyector.spec.ts`: código ≥24px, controles grandes, disposición 4:3; sin superposición ni recorte a 1024×768 y 1280×720; falla.
- GREEN: `Compartment` de tema en `EditorJava.tsx` (4.3) + `src/interfaz/estilos/proyector.css`.
- Verif: `npm run e2e -- proyector`

**5.6 Escenario docente E2E** — REQ-AULA-005, REQ-VIS-013(E2E, C19) · depende: 5.1, 5.2, 5.5
- RED `pruebas/e2e/escenario-docente.spec.ts`: abre un programa de ciclo desde la galería, activa predicción y proyector, conduce la traza pidiendo Sí/No antes de cada revelación sin apoyo técnico; 100% de condiciones/continuaciones de ciclo de la galería piden Sí/No; falla.
- GREEN: cierra huecos de integración que el E2E revele.
- Verif: `npm run e2e -- escenario-docente`

**5.7 PWA completa y aviso de versión** — REQ-PLAT-001(parte), REQ-PLAT-008(cliente) · depende: 0.11, 5.2
- RED `interfaz/pwa/{registro,version}.test.ts`: precache incluye trabajador Y galería completa; busca versión nueva al cargar y ofrece recargar; `localStorage` con clave versionada solo para preferencias; falla.
- GREEN: amplía `vite-plugin-pwa` (0.11) con la galería + `AvisoVersionNueva.tsx`.
- Verif: `interfaz/pwa/registro`

**5.8 Verificación "sin red" completa** — REQ-PLAT-001(cierre), REQ-PLAT-002 · depende: 5.7, 5.4
- RED `pruebas/e2e/sin-red.spec.ts` (`offline: true` tras primera carga): recarga, ejecuta TODA la galería y abre enlaces sin ninguna petición a otro origen; sin cookies ni telemetría; falla.
- GREEN: cierra huecos de precache/telemetría accidental que el E2E revele.
- Verif: `npm run e2e -- sin-red`

**5.9 Presupuesto de carga** — REQ-PLAT-003 · depende: 5.7
- RED `herramientas/presupuesto-tamano.test.ts`: build comprimido ≤500KB; `pruebas/rendimiento/carga.spec.ts` mide interactivo desde caché ≤2s; falla si excede.
- GREEN: `herramientas/presupuesto-tamano.ts` como gate de CI + ajustes de *code-splitting*/PWA que el resultado exija.
- Verif: `node herramientas/presupuesto-tamano.ts` + `npm run rendimiento -- carga`

**5.10 Auditoría AA completa (cierre C14)** — REQ-PLAT-005(cierre) · depende: 4.15, 5.2, 5.5
- RED `pruebas/e2e/accesibilidad-completa.spec.ts`: axe-core sobre TODAS las pantallas principales + galería + proyector; cero violaciones graves/críticas; contraste AA claro/oscuro; falla.
- GREEN: ajustes finales que el barrido revele.
- Verif: `npm run e2e -- accesibilidad-completa`

**5.11 Cierre del catálogo es-MX (C18)** — REQ-PLAT-007(cierre) · depende: 4.1, 5.2, 5.4
- RED `pruebas/arquitectura/sin-texto-literal.test.ts`(ampliado a todo `src/interfaz`+`src/presentacion`): cero textos fuera del catálogo es-MX; falla si algún componente de los lotes 4–5 quedó con string literal.
- GREEN: mueve cualquier texto suelto a `src/textos/es-MX/`.
- Verif: `pruebas/arquitectura/sin-texto-literal`
- Nota: el cierre formal de C18 exige además "revisión del PO sin observaciones bloqueantes" — se agenda junto con 5.14.
- Revisión del PO pendiente de las frases nuevas de 1.26/1.27 (método, campo, constructor y ejecución no disponible).
- Revisión del PO pendiente de las frases nuevas de 1.29 (clase del JDK, nombre completo de una clase, `case` con varias etiquetas, anotación, herencia, `assert`, tipo local, `synchronized`) y del cambio de `miembro-de-clase-no-soportado` (ahora menciona el constructor); la lista con el texto exacto está en la nota de la 1.29.
- 1.30: frase del marco aprobada por el PO el 2026-09-29 («Es parte de Java… así que no puedo revisar si esa parte está bien escrita»): sustituye a la de todos los avisos de 1.24–1.29 (las notas de 1.26 y 1.29 todavía muestran la anterior) y `tipo-primitivo-no-soportado` pasa a nombrar el tipo concreto («el tipo `byte`… usa `int` en vez de `byte`»). Quedan por enmendar el escenario «arreglo fuera de alcance» de `spec.md` (l.60) y el ejemplo de `proposal.md` §2.3, que conservan la frase anterior.

**5.12 Despliegue real a GitHub Pages** — REQ-PLAT-008(publicación) · depende: 0.11
- **BLOQUEADA POR P1** (cuenta/nombre/visibilidad del repositorio). Recomendación por omisión: repositorio público `VisualizadorJava` en la cuenta del PO → `https://<usuario>.github.io/VisualizadorJava/`.
- RED (al desbloquear) `pruebas/e2e/despliegue.spec.ts`: mismo contenido en la URL real de Pages que en `preview` local; falla hasta fijar `BASE_PUBLICA` real.
- GREEN: fija `BASE_PUBLICA` real en `desplegar.yml` (0.11); primer despliegue con etiqueta `v0.5.0-lote5`.
- Verif: `npm run e2e -- despliegue` contra la URL publicada.

**5.13 `LICENSE`** — REQ-PLAT-008(legal) · depende: 0.4
- ✅ adelantada al lote 0 (sub-lote 0-A)
- **BLOQUEADA POR P4** (licencia). Recomendación por omisión: MIT (compatible con fdlibm/Sun, React, CodeMirror, lz-string, e integración futura a AprendiendoJava).
- Sin RED/GREEN (documento legal). Al desbloquear: agrega `LICENSE` (MIT) en la raíz y referencia en `README.md`/`AVISOS-DE-TERCEROS.md`.
- Verif: revisión manual.

**5.14 Validación en aula (C20, hito de cierre del lote)** — REQ-AULA-005(cierre) · depende: 5.6, 5.10, 5.11
- **BLOQUEADA POR P5** (grupo y semana). Recomendación por omisión: al cerrar este lote, en una clase de U5 o U6 del PO.
- Sin RED/GREEN de código — observación de campo. Aceptación: el PO reporta haber conducido la sesión proyectada con predicción sin apoyo técnico, usando solo las funciones de los lotes 4–5.
- Verif: reporte del PO, documentado en `state.yaml` y en la revisión `judgment-day` del lote.

**Criterio de salida:** `presentacion/{galeria,enlace,prediccion}`, `pwa/**`, `e2e/{sin-red,proyector,accesibilidad-completa,escenario-docente}`, `presupuesto-tamano` verdes; C2, C12(completo), C13, C14(cierre), C15, C16, C19 cumplidos; C18 y C20 pendientes solo de la revisión/reporte del PO; P1/P4 pendientes no bloquean el resto del cambio.
**Cierre:** `sdd-verify` del lote 5 → **`judgment-day`** (hito: validación en aula) → commit con confirmación del PO → actualizar `state.yaml`.

## Lote 6 — Paso Detallado

**Objetivo:** M4 — micropasos por subexpresión derivados del registro que el motor ya guarda desde el lote 2 (design §3.3: este lote es sobre todo interfaz y plantillas), control Normal⇄Detallado, cobertura de explicación y rendimiento en Detallado → **hito: publicación v1**.
**Criterio de entrada:** lote 5 cerrado (galería, enlace y proyector funcionando; validación en aula agendada aunque P5 siga pendiente).
**Sesiones:** 2–3 (design.md §10).

**6.1 `presentacion/detallado.ts` — micropasos** — REQ-EJEC-003 · depende: 2.17, 3.1
- RED `presentacion/detallado.test.ts`: `(edad>=18) && (tieneCredencial)` con `edad=15` en Detallado → operando izquierdo `false`, derecho "no evaluado", resultado `false` sin tocar `tieneCredencial`; `y = y++ + ++y` muestra `cambios` con `punto` a media expresión; falla.
- GREEN: `src/presentacion/detallado.ts` deriva micropasos de `paso.valores` (puntos del plan ya registrados desde 2.17/2.19; el motor no cambia).
- Verif: `presentacion/detallado`

**6.2 Control Normal ⇄ Detallado** — REQ-VIS-003 · depende: 6.1, 4.13
- RED `componentes/ControlNivel.test.tsx`: detenido en el paso 10 en Normal, activar Detallado mantiene la posición, los pasos siguientes se muestran por subexpresión; disponible en cualquier punto; falla.
- GREEN: `src/interfaz/componentes/ControlNivel.tsx` en la barra superior + `ajustes.nivel` en el reductor (4.13).
- Verif: `interfaz/componentes/ControlNivel`

**6.3 Plantillas de explicación — Detallado** · depende: 6.1, 4.1
- RED `src/textos/es-MX/explicaciones.test.ts`(ampliado): subexpresión resaltada + tipo de cada resultado + promoción visible ("`'a'` se promueve a `int`: 97"); sin marcadores sin resolver; falla.
- GREEN: amplía `explicaciones.ts` con las plantillas de Detallado.
- Verif: `src/textos/es-MX/explicaciones`

**6.4 Cobertura de explicación Detallado + errores conceptuales restantes (cierre)** — REQ-DIFF-007 · depende: 6.3
- RED `pruebas/traza/cobertura-detallado.test.ts`: en cada traza Detallado de la galería completa (`corpus/curso`+`corpus/autoria`), ninguna explicación tiene marcador sin resolver; los errores conceptuales #13 (aritmética con `char`) y #15 (cortocircuito) tienen ≥1 programa que los hace visibles en Detallado; falla.
- GREEN: ajustes que el barrido revele.
- Verif: `pruebas/traza/cobertura-detallado`

**6.5 E2E — Detallado (cierre C9)** · depende: 6.2, 6.4
- RED `pruebas/e2e/visualizador-detallado.spec.ts` (Chromium + Firefox): cambia de nivel a mitad de traza, navega subexpresiones, ve cortocircuito "no evaluado", contra la galería completa; falla hasta que 6.1–6.4 cierren.
- GREEN: cierra huecos de integración que el E2E revele.
- Verif: `npm run e2e -- visualizador-detallado`

**6.6 Rendimiento de Detallado (cierre C11)** — REQ-PLAT-004(extensión) · depende: 3.8, 6.2
- RED `pruebas/rendimiento/detallado.spec.ts`: cambiar de paso en Detallado (el más caro, design §3.3) ≤100ms p95, mismo presupuesto que Normal; falla si excede.
- GREEN: optimizaciones de `detallado.ts` (memoización de micropasos) que el perfilado exija.
- Verif: `npm run rendimiento -- detallado`

**6.7 Publicación v1** — REQ-PLAT-008(cierre) · depende: 6.5, 6.6, 5.12(P1), 5.13(P4)
- **BLOQUEADA POR P1** (heredada de 5.12: `BASE_PUBLICA`/URL final) y por el cierre de 5.13 (P4, `LICENSE` en el repo).
- RED (al desbloquear) `pruebas/e2e/reversion.spec.ts`: publica `v1.0.0`, simula un resultado erróneo, revierte re-desplegando la etiqueta anterior, el service worker ofrece recargar, sin migración de datos; falla hasta ejercitar el flujo real.
- GREEN: etiqueta `v1.0.0`, ejercita `desplegar.yml` de punta a punta.
- Verif: `npm run e2e -- reversion` contra Pages real.

**6.8 Revisión final de Definición de Terminado** · depende: 6.7
- Checklist de cierre de TODO el cambio contra proposal.md §13: cero TODOs/*mocks* en producción; TDD estricto respetado en las 101 tareas; `npm test`+`lint`+`tipos` en verde con salidas acotadas; CI verde incl. arnés; textos es-MX reales; accesible en todo lo agregado; cero red en runtime; `main` desplegable; commits convencionales sin atribución de IA con confirmación explícita del PO en cada uno. Sin RED/GREEN — auditoría, no código.
- Verif: checklist firmado en `state.yaml` (`phases.archive` lista para `sdd-archive`).

**Criterio de salida:** `presentacion/detallado`, `e2e/visualizador-detallado`, `rendimiento/detallado` verdes; C9(Detallado) y C11(cierre) cumplidos; publicación v1 bloqueada solo por P1/P4 ya heredados del lote 5.
**Cierre:** `sdd-verify` del lote 6 → **`judgment-day`** (hito: publicación v1) → commit con confirmación del PO → actualizar `state.yaml` → `sdd-archive`.

## Matriz de trazabilidad

### Requisitos (73) → tarea(s)

**`subconjunto-java`** (8/8 cubiertos)
| REQ | Tarea(s) |
|---|---|
| REQ-SUB-001 | 1.2 (parcial: 0.12), 1.21 (import inválido) |
| REQ-SUB-002 | 1.1, 2.2, 1.4 |
| REQ-SUB-003 | 1.3, 1.21 (tipos de operadores) |
| REQ-SUB-004 | 1.5 |
| REQ-SUB-005 | 1.8, 1.19 |
| REQ-SUB-006 | 1.1, 1.6 |
| REQ-SUB-007 | 1.1, 1.3, 1.6, 1.8, 1.19 |
| REQ-SUB-008 | 2.15 |

**`compilacion-en-espanol`** (10/10)
| REQ | Tarea(s) |
|---|---|
| REQ-COMP-001 | 1.7, 1.10, 1.11, 1.22 |
| REQ-COMP-002 | 1.7, 1.11 |
| REQ-COMP-003 | 1.7 |
| REQ-COMP-004 | 1.13 |
| REQ-COMP-005 | 1.2, 1.14 |
| REQ-COMP-006 | 1.14 |
| REQ-COMP-007 | 1.9, 1.15, 1.19 |
| REQ-COMP-008 | 1.9, 1.15, 1.19 |
| REQ-COMP-009 | 1.15 |
| REQ-COMP-010 | 1.12 |

**`motor-de-ejecucion`** (10/10)
| REQ | Tarea(s) |
|---|---|
| REQ-EJEC-001 | 2.19 |
| REQ-EJEC-002 | 2.19 |
| REQ-EJEC-003 | 6.1 |
| REQ-EJEC-004 | 2.18 |
| REQ-EJEC-005 | 2.2, 2.17 |
| REQ-EJEC-006 | 2.14, 2.19 |
| REQ-EJEC-007 | 3.3, 3.4 |
| REQ-EJEC-008 | 2.7 |
| REQ-EJEC-009 | 2.18 (mecanismo), 3.7 (cierre) |
| REQ-EJEC-010 | 2.12, 2.19 |

**`biblioteca-java`** (11/11)
| REQ | Tarea(s) |
|---|---|
| REQ-BIB-001 | 2.2 |
| REQ-BIB-002 | 2.3, 2.4 |
| REQ-BIB-003 | 2.8 |
| REQ-BIB-004 | 2.5, 2.6 |
| REQ-BIB-005 | 2.7 |
| REQ-BIB-006 | 2.9 |
| REQ-BIB-007 | 2.10 |
| REQ-BIB-008 | 2.11 |
| REQ-BIB-009 | 2.12 |
| REQ-BIB-010 | 2.8, 2.12 |
| REQ-BIB-011 | 2.13 |

**`visualizador-paso-a-paso`** (13/13)
| REQ | Tarea(s) |
|---|---|
| REQ-VIS-001 | 4.3 (parcial: 0.14) |
| REQ-VIS-002 | 4.5 |
| REQ-VIS-003 | 6.2 |
| REQ-VIS-004 | 4.4 |
| REQ-VIS-005 | 4.6 |
| REQ-VIS-006 | 4.8 |
| REQ-VIS-007 | 4.9 |
| REQ-VIS-008 | 4.7 |
| REQ-VIS-009 | 4.7 |
| REQ-VIS-010 | 3.2, 4.10 |
| REQ-VIS-011 | 4.11 |
| REQ-VIS-012 | 4.12 |
| REQ-VIS-013 | 5.1, 5.6 |

**`uso-en-aula`** (5/5)
| REQ | Tarea(s) |
|---|---|
| REQ-AULA-001 | 5.2 |
| REQ-AULA-002 | 5.4 |
| REQ-AULA-003 | 5.4 |
| REQ-AULA-004 | 5.5 |
| REQ-AULA-005 | 5.6, 5.14 |

**`plataforma-web`** (8/8)
| REQ | Tarea(s) |
|---|---|
| REQ-PLAT-001 | 5.7, 5.8 |
| REQ-PLAT-002 | 5.8 |
| REQ-PLAT-003 | 5.9 |
| REQ-PLAT-004 | 3.8, 6.6 |
| REQ-PLAT-005 | 4.15, 5.10 |
| REQ-PLAT-006 | 0.15, 2.22 |
| REQ-PLAT-007 | 0.2 (lint), 4.1, 5.11 |
| REQ-PLAT-008 | 0.11, 5.7, 5.12, 6.7 |

**`verificacion-diferencial`** (8/8)
| REQ | Tarea(s) |
|---|---|
| REQ-DIFF-001 | 0.5, 2.1 |
| REQ-DIFF-002 | 0.6 |
| REQ-DIFF-003 | 2.20 |
| REQ-DIFF-004 | 1.17 (C8), 2.21 (C3), 5.3 (C2) |
| REQ-DIFF-005 | 2.3, 2.4, 2.5, 2.7, 2.8, 2.10 |
| REQ-DIFF-006 | 1.16 |
| REQ-DIFF-007 | 4.14, 6.4 |
| REQ-DIFF-008 | 0.9, 0.10 |

**Cobertura: 73/73 requisitos con al menos una tarea.** Ninguno queda sin cubrir.

### Criterios de éxito (C1–C20) → lote

| C# | Lote(s) | Tarea(s) clave |
|---|---|---|
| C1 | 2 | 2.20 |
| C2 | 5 | 5.3 |
| C3 | 2 | 2.21 |
| C4 | 2 | 2.3, 2.4 |
| C5 | 2 | 2.8 |
| C6 | 2 | 2.5, 2.7, 2.10 |
| C7 | 1 | 1.16 |
| C8 | 1 | 1.17 |
| C9 (Normal) | 4 | 4.14, 4.16 |
| C9 (Detallado) | 6 | 6.4, 6.5 |
| C10 | 3 | 3.8 |
| C11 | 3, 6 | 3.8 (Normal), 6.6 (cierre Detallado) |
| C12 | 0, 5 | 0.15 (inicial), 5.8 (completo) |
| C13 | 5 | 5.9 |
| C14 | 4, 5 | 4.15 (base), 5.10 (cierre) |
| C15 | 5 | 5.4 |
| C16 | 5 | 5.5 |
| C17 | 2 | 2.22 |
| C18 | 5 | 5.11 (+ revisión del PO) |
| C19 | 5 | 5.1, 5.6 |
| C20 | 5 | 5.14 (bloqueada por P5) |

### Bloqueos del PO

| Pregunta | Tarea(s) que bloqueaba | Resolución del PO (2026-09-25) |
|---|---|---|
| P1 (cuenta/nombre/visibilidad del repo) | 5.12, 6.7 (heredada) — y el criterio de salida del lote 0 (ver nota) | **Resuelta:** repo público `JorgeZepeda1/VisualizadorJava` → `BASE_PUBLICA=/VisualizadorJava/`, sitio en `https://jorgezepeda1.github.io/VisualizadorJava/`. El remoto se crea al cerrar el lote 0, junto con su commit confirmado por el PO. |
| P4 (licencia) | 5.13, 6.7 (heredada) | **Resuelta:** MIT. La tarea 5.13 (`LICENSE`) se ADELANTA al lote 0, porque el repo se vuelve público al cerrarlo. |
| P5 (grupo y semana de validación en aula) | 5.14 | **Resuelta:** al cerrar el lote 5, en una clase de U5 o U6 del PO. |

> **Corrección del orquestador:** P1 también condicionaba el lote 0: su criterio de salida exige `ci.yml`, `oraculo.yml` y `plataforma.yml` verdes, y eso solo ocurre con el remoto en GitHub.

Ninguna otra tarea depende de P1/P4/P5; el resto del cambio (lotes 0–4, y 6.1–6.6/6.8) avanza sin esperar al PO.

## Resumen por lote

| Lote | Objetivo | Tareas | Sesiones | Hito / `judgment-day` |
|---|---|---|---|---|
| 0 | Cimientos + rebanada vertical | 16 | 2–3 | — |
| 1 | Lenguaje | 17 | 3–4 | — |
| 2 | Ejecución y biblioteca | 22 | 4–5 | `judgment-day` (fidelidad numérica) |
| 3 | Traza y trabajador | 8 | 1–2 | — |
| 4 | Visualizador | 16 | 3–4 | — |
| 5 | Aula | 14 | 2–3 | `judgment-day` → validación en aula (C20) |
| 6 | Paso Detallado | 8 | 2–3 | `judgment-day` → publicación v1 |
| **Total** | | **101** | **17–24** | |
