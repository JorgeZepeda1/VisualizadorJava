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

**Criterio de salida:** `npm run ci` verde sobre lo existente; `oraculo.yml`/`plataforma.yml` verdes; `u3-hola-mundo` verde en diferencial + E2E×3 motores; C12 cumplido de forma inicial; `sdd-init` refrescado.
**Cierre:** `sdd-verify` del lote 0 → commit (`feat(cimientos): ...`) con confirmación del PO → actualizar `state.yaml`.

## Lote 1 — Lenguaje

**Objetivo:** gramática completa del subconjunto, reconocimiento de lo no soportado sin abortar el análisis, las 5 pasadas de compilación (léxico+sintaxis, atribución, alcanzabilidad, asignación definitiva, arranque) con errores en español idénticos a `javac`, catálogo del JDK generado por el oráculo, y verificación contra ≥2000 mutantes.
**Criterio de entrada:** lote 0 cerrado (CI verde, oráculo funcional, rebanada vertical navegable).
**Sesiones:** 3–4 (design.md §10).

**1.1 Léxico completo** — REQ-SUB-002, REQ-SUB-006, REQ-SUB-007(léxico) · depende: 0.12
- RED `src/motor/lexico/analizador-lexico.test.ts`: tokeniza cada literal de proposal §2.1 (enteros con `_`, `long` con `L`, `double` punto/exponente/`d`, `char`/`String` con escapes válidos) y afirma que `010` produce `NoSoportado` con nota "Java lo lee como octal: 8"; falla (lexer mínimo de 0.12).
- GREEN: amplía `analizador-lexico.ts`/`tokens.ts`/`literales.ts` con hex/octal/binario, `float`, bloques `"""`, `\uXXXX`, escapes no soportados (`\r \b \f \s \0–\377`) como `NoSoportado{codigo,rango}` sin abortar.
- REFACTOR: tabla de escapes válidos/no soportados aislada en `literales.ts`.
- Verif: `motor/lexico`

**1.2 Sintaxis — núcleo del programa** — REQ-SUB-001 · depende: 1.1
- RED `analizador-sintactico.test.ts`: clase con cualquier nombre, `public` opcional, 3 formas de `main`, imports de `Scanner`/`Random`/`*`, `package` ignorado, comentarios, `return;`; falla (parser mínimo de 0.12).
- GREEN: `sintaxis/{analizador-sintactico,ast}.ts` con `Programa/Importacion/Clase/Main/ParamMain/Bloque/DeclLocal` (design §2.3).
- REFACTOR: `ParamMain` (3 formas) como función reusada por 1.15.
- Verif: `motor/sintaxis`

**1.3 Sintaxis — expresiones Pratt** — REQ-SUB-003, REQ-SUB-007(bits, `?:`, `instanceof`) · depende: 1.2
- RED `expresiones.test.ts`: los 14 niveles de precedencia de design §2.4, cortocircuito `&&`/`||`, `& | ^ << >> >>> ?: instanceof` → `NoSoportado`; falla.
- GREEN: `sintaxis/expresiones.ts` (Pratt).
- REFACTOR: tabla de precedencia como dato.
- Verif: `motor/sintaxis/expresiones`

**1.4 Ambigüedades del parser** — REQ-SUB-002(literal `long`/`MIN_VALUE`) · depende: 1.3
- RED `ambiguedades.test.ts`: cast-vs-paréntesis (JLS 15.16), declaración-vs-expresión, `-2147483648`/`-9223372036854775808L` válidos solo tras `-` unario, `5000000000` sin `L` → error; falla.
- GREEN: las 3 reglas de design §2.5 en el parser.
- REFACTOR: función compartida "abre expresión unaria".
- Verif: `motor/sintaxis/ambiguedades`

**1.5 Sentencias completas** — REQ-SUB-004 · depende: 1.3
- RED `sentencias.test.ts`: `if/else/else-if` anidados, `;` vacía, `switch` clásico (caída), `while`, `do-while`, `for` (varias variables, partes vacías), `break`/`continue`; falla.
- GREEN: resto de `Sentencia` en `analizador-sintactico.ts`.
- REFACTOR: manejo de `Bloque` unificado entre `if`/ciclos/`switch`.
- Verif: `motor/sintaxis/sentencias`

**1.6 Reconocimiento NO-DISP sintáctico (resto del catálogo)** — REQ-SUB-006, REQ-SUB-007 · depende: 1.5
- RED `no-soportado.test.ts`: una muestra por cada fila restante de REQ-SUB-007 (clases/interfaces/enums/records, campos, métodos propios, clases internas, anotaciones, `throws`, arreglos, `for` mejorado, etiquetas, `switch` flecha/`yield`, `try/catch/throw`, `var`, genéricos, lambdas, `::`, `this`/`super`, `null`, `final` sin inicializador, `import static`) produce `NoSoportado` y el análisis sigue; falla.
- GREEN: `sintaxis/no-soportado.ts` con subgramática permisiva por construcción.
- REFACTOR: tabla construcción→código de aviso, reusada por 1.17.
- Verif: `motor/sintaxis/no-soportado`

**1.7 Atribución — símbolos, alcance, sombreado, `switch`** — REQ-COMP-002, REQ-COMP-003 · depende: 1.6
- RED `atribucion.test.ts`: variable/método no declarado, uso fuera de bloque (incl. variable de `for`), redeclaración en el mismo bloque, sombreado en bloque anidado, selector de `switch` no `int`/`char`/`String`; falla.
- GREEN: `semantica/{atribucion,alcance,switch}.ts`.
- REFACTOR: tabla de símbolos compartida con 1.10/1.12/1.13.
- Verif: `motor/semantica/atribucion`

**1.8 Sobrecargas y catálogo de biblioteca reconocida** — REQ-SUB-005, REQ-SUB-007(atribución) · depende: 1.7, 1.9
- RED `sobrecargas.test.ts`: JLS 15.12.2 (estricta/laxa/varargs/más específico); `Math.round(123456789L)` resuelve a `round(float)`; miembros existentes-no-soportados (`s.split`, `Math.sin`, `sc.hasNextInt`) → `NoSoportado`; falla.
- GREEN: `semantica/{sobrecargas,tipos,conversiones}.ts` sobre un `catalogo-api.ts` stub (real en 2.15).
- REFACTOR: las 4 fases de resolución como funciones puras.
- Verif: `motor/semantica/sobrecargas`

**1.9 Catálogo de datos del JDK (oráculo, ADR 010)** · depende: 0.5
- RED `herramientas/oraculo/generar-datos.test.ts`: genera `corpus/datos/api/` (firmas soportadas/existen-no-soportadas/no-existen), `corpus/datos/regional/` (símbolos `DecimalFormatSymbols`), `corpus/datos/marcos/` (mensajes exactos del lanzador Temurin 17.0.18 es-MX) contra el JDK real; falla sin generador.
- GREEN: `herramientas/oraculo/generar-datos.ts` + `src/motor/biblioteca/datos/*.generado.ts` (cabecera "no editar").
- Verif: `herramientas/oraculo/generar-datos`

**1.10 Constantes (JLS 15.29)** — REQ-COMP-001(parcial) · depende: 1.8
- RED `constantes.test.ts`: plegado de literales/operadores/casts, `"ho"+"la"=="hola"` → `true` (internado), división entera entre cero NO es constante, `Integer.MAX_VALUE`/`Math.PI`; falla.
- GREEN: `semantica/constantes.ts` (stub numérico hasta el lote 2; el TODO se retira explícitamente al cerrar 2.4).
- REFACTOR: comparte el plegado con 1.12/1.13.
- Verif: `motor/semantica/constantes`

**1.11 Errores de tipo y símbolo en español** — REQ-COMP-001(cierre) · depende: 1.7, 1.10
- RED `problemas.test.ts`: `Math.round(double)` a `int`, condición de `if` no booleana, `String`/numérico incompatibles en `==`, los 37 casos del subconjunto en el catálogo `03`; falla.
- GREEN: `problemas.ts` (`Problema`, `CodigoProblema`) + `src/textos/es-MX/problemas.ts`.
- REFACTOR: un `Problema` por `CodigoProblema`, sin strings sueltos.
- Verif: `motor/problemas`

**1.12 Alcanzabilidad (JLS 14.22)** — REQ-COMP-010 · depende: 1.10
- RED `alcanzabilidad.test.ts`: código tras `return`/`break`/`continue` incondicional, cuerpo de `while(false)`, sentencia tras `while(1<2){}` (condición constante cuenta igual que el literal), `if(false)` exento; falla.
- GREEN: `semantica/alcanzabilidad.ts`.
- REFACTOR: evaluador de "condición constante" compartido con 1.13.
- Verif: `motor/semantica/alcanzabilidad`

**1.13 Asignación definitiva (JLS 16)** — REQ-COMP-004 · depende: 1.12
- RED `asignacion-definitiva.test.ts`: `if`/`else` completo, `while`/`for(cond)` nunca garantizan, `while(true)`+`break` sí, `do-while` garantiza si el cuerpo asigna, `switch` con `default`, "asignada si verdadero/si falso" en `&&`/`||`/`!`; falla.
- GREEN: `semantica/asignacion-definitiva.ts`.
- Verif: `motor/semantica/asignacion-definitiva`

**1.14 Orquestación de las 5 pasadas** — REQ-COMP-005, REQ-COMP-006, REQ-COMP-009 · depende: 1.6, 1.11, 1.12, 1.13
- RED `compilador.test.ts`: "atribución oculta asignación definitiva anterior" y "alcanzabilidad se informa antes que asignación definitiva" (escenarios verificados de REQ-COMP-006); `;` faltante reporta la línea de `javac`; clase pública con nombre distinto al archivo NO se rechaza; falla.
- GREEN: `compilador.ts` orquesta léxico+sintaxis → atribución → alcanzabilidad → asignación definitiva → arranque, deteniéndose en la primera pasada con problemas.
- REFACTOR: pasadas como lista de funciones `(programa) => Problema[]`, orden como dato.
- Verif: `motor/compilador`

**1.15 Arranque — `main` sin `static` / sin `main`** — REQ-COMP-007, REQ-COMP-008 · depende: 1.9, 1.14
- RED `arranque.test.ts`: `public void main` compila limpio y falla solo al ejecutar con el texto del lanzador (saltos `\n` literales, la rareza de Temurin); clase sin `main` falla bien formada con saltos reales; falla.
- GREEN: `semantica/arranque.ts` usando `corpus/datos/marcos/` (1.9).
- Verif: `motor/semantica/arranque`

**1.16 Mutantes contra veredictos de `javac`** — REQ-DIFF-006 · depende: 1.14
- RED `pruebas/compilacion/mutantes.test.ts`: sobre ≥2000 mutantes de un solo token de `corpus/curso`+`corpus/autoria`, compara veredicto (100%) y línea del primer error (≥95%) contra `corpus/mutantes/veredictos.jsonl`; falla sin generador ni veredictos.
- GREEN: `herramientas/oraculo/mutantes.ts` (semilla fija) + `herramientas/oraculo/java/CompiladorEnLote.java` (`javax.tools`, una JVM) → `corpus/mutantes/veredictos.jsonl`.
- Verif: `pruebas/compilacion/mutantes`

**1.17 Muestra de NO-DISP por construcción (C8)** — REQ-DIFF-004(parte C8) · depende: 1.6
- RED `pruebas/compilacion/catalogo.test.ts`: una muestra por cada fila del catálogo REQ-SUB-007 dispara su aviso antes de ejecutar, cero pasos, cero errores de sintaxis engañosos; falla.
- GREEN: `corpus/compilacion/catalogo/` (37 casos de `03`) + `corpus/compilacion/avisos/` (una muestra por construcción).
- Verif: `pruebas/compilacion/catalogo`

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
| REQ-SUB-001 | 1.2 (parcial: 0.12) |
| REQ-SUB-002 | 1.1, 2.2, 1.4 |
| REQ-SUB-003 | 1.3 |
| REQ-SUB-004 | 1.5 |
| REQ-SUB-005 | 1.8 |
| REQ-SUB-006 | 1.1, 1.6 |
| REQ-SUB-007 | 1.1, 1.3, 1.6, 1.8 |
| REQ-SUB-008 | 2.15 |

**`compilacion-en-espanol`** (10/10)
| REQ | Tarea(s) |
|---|---|
| REQ-COMP-001 | 1.7, 1.10, 1.11 |
| REQ-COMP-002 | 1.7, 1.11 |
| REQ-COMP-003 | 1.7 |
| REQ-COMP-004 | 1.13 |
| REQ-COMP-005 | 1.2, 1.14 |
| REQ-COMP-006 | 1.14 |
| REQ-COMP-007 | 1.9, 1.15 |
| REQ-COMP-008 | 1.9, 1.15 |
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
