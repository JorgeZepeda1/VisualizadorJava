# CLAUDE.md — Instrucciones para Claude Code

Proyecto: **Visualizador de Java paso a paso** — página web donde un alumno de bachillerato sin experiencia previa (materia de Algoritmos y Programación, Java de consola en NetBeans) pega un programa Java del currículo U3–U7 y ve, del lado derecho, la ejecución paso a paso: variables que cambian, cada condición evaluada, cada vuelta de los ciclos, la consola y la entrada con `Scanner`. Todo en español de México.

## Orientación al iniciar sesión (en este orden)

1. `openspec/changes/visualizador-java/` — **fuente del plan**: `proposal.md` (alcance, riesgos y Definición de Terminado §13), `specs/` (73 requisitos y 96 escenarios), `design.md` (arquitectura, contratos y §9 versiones/scripts), `tasks.md` (7 lotes, 101 tareas, con su estado `[x]`/`[ ]`).
2. `docs/adr/001…016` — decisiones de arquitectura, con alternativas consideradas y consecuencias.
3. Este archivo, para las reglas no negociables y los comandos.

No hay un `PROGRESO.md` separado en este proyecto: las marcas `[x]`/`[ ]` de `tasks.md` y la sección `phases`/`decisiones_po` de `openspec/changes/visualizador-java/state.yaml` son el único tablero de avance real.

## Stack (design.md §1, §9)

Frontend: **Vite + React 19 + TypeScript 6 estricto**, SPA estática publicable en GitHub Pages. Motor: intérprete de un subconjunto de Java (currículo U3–U7) en **TypeScript puro**, corre en el navegador dentro de un **Web Worker** (nunca en el hilo principal). Editor: **CodeMirror 6**. Fidelidad verificada contra un **JDK 17 real** (oráculo en `herramientas/oraculo/`, ADR 010/011). Cero dependencias de red en tiempo de ejecución (PWA con precache completo, ADR 014).

**JDK real para el oráculo y las pruebas diferenciales:**

```
/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home/bin/
```

Versión exacta esperada: Temurin `17.0.18+8`. `herramientas/oraculo/jdk.ts` aborta si detecta otra versión — nunca se generan goldens contra un JDK distinto.

## Reglas no negociables

1. **Idioma:** todo texto visible u oíble por el alumno o el docente va en **español de México real**, desde el catálogo tipado `src/textos/es-MX/` (ADR 015) — nunca texto suelto en JSX ni en `aria-label`/`title`/`placeholder`.
2. **Identificadores en español, en ASCII** (sin tildes ni ñ), archivos en *kebab-case*, componentes React en PascalCase (ADR 002, design.md §1.4). Excepciones cerradas: nombres de la API de Java que se emulan tal cual (`nextInt`, `charAt`, `Scanner`, `InputMismatchException`, `MAX_VALUE`…), nombres impuestos por herramientas (`props`, `children`, prefijo `use` de los *hooks*, `describe`/`it`/`expect`, API de CodeMirror), préstamos técnicos corrientes (`token`) y los tipos de *conventional commits* (`feat:`, `fix:`) con descripción en español.
3. **TDD estricto obligatorio** (`openspec/config.yaml` → `strict_tdd: true`): toda tarea de código es RED (prueba nueva, falla por una razón concreta, ejecutada de verdad en cuanto hay runner) → GREEN (lo mínimo para ponerla en verde, confirmado por ejecución real) → REFACTOR (limpieza sin romper el verde). Ver `tasks.md` → Convenciones.
4. **Fidelidad contra el JDK 17 real es el criterio de aceptación** de todo comportamiento del intérprete: cada uno se respalda con una prueba diferencial cuyo golden generó el oráculo — nunca un resultado que "parece correcto" sin comparar bytes contra Java de verdad.
5. **Fuera del subconjunto U3–U7 (o cualquier caso no verificado al 100 % contra el oráculo) = aviso claro en español, NUNCA un resultado inventado** (decisión D2; ADR 003, ADR 008, ADR 010). Si algo no está caracterizado por completo, se marca "No disponible" en vez de imprimir un valor sin verificar.
6. **Cero dependencias de red en tiempo de ejecución.** La PWA precachea todo (incluidos el trabajador y la galería, ADR 014); ninguna dependencia nueva entra sin justificar licencia (ADR 016 — solo permisivas: MIT/ISC/BSD/Apache-2.0) y peso (`npm run presupuesto`, ≤ 500 KB comprimidos).
7. **Conventional commits SIN atribución de IA** (nunca `Co-Authored-By`, nunca mencionar la herramienta que generó el código) y **confirmación EXPLÍCITA del usuario antes de cada commit** — nunca se ejecuta `git commit` sin que el PO lo apruebe primero, tarea por tarea.
8. **Nunca correr `vite build` / `npm run build` después de un cambio**, salvo que una prueba E2E lo exija de forma explícita (por ejemplo, la prueba "sin red" de `pruebas/e2e/` arranca sobre el build real con el *service worker* activo). `npm test`, `npm run lint` y `npm run tipos` sí se corren siempre que haya cambios.
9. **Salidas de pruebas y linters acotadas:** `--reporter=dot` en Vitest y Playwright, `--quiet` en ESLint. Nunca pegar un log completo sin resumir.
10. **Node 22 exacto vía `.nvmrc`** (`22.23.1`) — `nvm use` antes de cualquier comando de Node. Las versiones de dependencias en `package.json` son **exactas** (sin `^` ni `~`): ver `herramientas/versiones-fijadas.ts`, fuente única compartida con el chequeo de licencias (`herramientas/licencias.ts`).
11. **Definición de Terminado de cada lote** (`proposal.md` §13): sin TODO/mocks/"versiones demo" en producción; TDD estricto real, no simulado; `npm test` + `lint` + `tipos` en verde con salidas acotadas, CI verde; textos es-MX reales; accesible (teclado, AA, nada solo por color, `aria-live`, movimiento reducido) en lo que el lote agrega; cero red; `main` siempre desplegable; commits convencionales sin atribución de IA, con confirmación explícita.
12. **Guardas de capa (ADR 001):** `src/motor` no importa nada fuera de sí mismo y no toca DOM/Node (0 dependencias npm). La matriz completa "quién puede importar qué" vive como datos en `herramientas/eslint/matriz-capas.ts` y la hace cumplir `eslint.config.js` — no la debiliten para que un import "de una vez" compile; ajusten la matriz y justifíquenlo en el ADR si el diseño cambia de verdad.

## Comandos del proyecto

```
# node local:          nvm use                          (Node 22.23.1, ver .nvmrc)
# instalar:            npm install
# desarrollo:          npm run dev
# build (con cuidado):  npm run build                     (regla 8 — no lo corras "por si acaso")
# vista previa:        npm run preview
# pruebas:             npm test                          (Vitest: proyectos motor + interfaz, --reporter=dot)
# pruebas navegadores: npm run test:navegadores           (Vitest en Chromium/Firefox/WebKit — desde la tarea 2.22)
# e2e:                 npm run e2e                        (Playwright ×3 motores — desde la tarea 0.15)
# rendimiento:         npm run rendimiento                (Playwright, umbral holgado — desde el lote 3)
# lint:                npm run lint                       (autofix: eslint . --fix)
# tipos:               npm run tipos                      (tsc -p, una vez por cada una de las 4 capas)
# presupuesto:         npm run presupuesto                (tamaño del bundle final)
# licencias:           npm run licencias                  (audita licencias permisivas, genera avisos)
# ci local:            npm run ci                         (lint+tipos+test+build+presupuesto+licencias)
# oráculo (JDK real):  npm run oraculo:goldens | oraculo:verificar | oraculo:datos | oraculo:mutantes | oraculo:generados
# medir plataforma:    npm run medir:plataforma           (Math.pow en x86_64 — requiere Docker Desktop)
```

## Estado del cambio

El plan completo (73 requisitos, 96 escenarios, 7 lotes, 101 tareas) vive en `openspec/changes/visualizador-java/`. El avance real de cada tarea son las marcas `[x]`/`[ ]` de `tasks.md` y las secciones `phases`/`decisiones_po` de `state.yaml` — no hay otro tablero ni otro documento de progreso.
