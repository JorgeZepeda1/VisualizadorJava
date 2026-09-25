# ADR 001 — Arquitectura hexagonal en cinco capas con guardas del compilador

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `openspec/changes/visualizador-java/design.md` §1; ADR 005, 006, 007

## Contexto

El motor debe ser verificable contra el JDK 17 en Node (sin navegador), ejecutarse en un Web Worker para que un ciclo infinito no congele la pestaña (D1, C10) y quedar listo para integrarse después en AprendiendoJava. El riesgo típico es que, por comodidad, el intérprete termine importando React o tocando el DOM, o que la interfaz reimplemente semántica de Java.

## Decisión

1. Cinco capas en `src/`: `motor` (dominio), `textos` (catálogo es-MX), `presentacion` (deriva la vista de un paso, puro), `trabajador` (adaptador Web Worker + cliente) e `interfaz` (React + CodeMirror).
2. El `motor` **no tiene E/S ni puertos de salida**: todo entra por `ConfigEjecucion` (fuente, entrada, semilla, regional, límites) y sale en los pasos. No usa reloj, azar ni dependencias npm.
3. Guardas del compilador: un `tsconfig` por capa; `motor`, `textos` y `presentacion` compilan con `lib: ["ES2023"]` y `types: []` (sin DOM ni Node), `trabajador` con `WebWorker`, `interfaz` con `DOM`. ESLint `no-restricted-imports` impone la matriz de dependencias del diseño.
4. Dos puertas del motor: `motor/index.ts` (compilar y ejecutar; solo trabajador y pruebas) y `motor/vista.ts` (traza, formato de valores y tipos; lo que la interfaz puede usar). El intérprete nunca corre en el hilo principal.
5. Un solo paquete npm por ahora; al integrar con AprendiendoJava, `src/motor` (y si conviene `trabajador`, `presentacion`, `textos`) pasa a un paquete de *workspace* sin cambiar código.

## Alternativas consideradas

- **Monorepo con *workspaces* desde hoy:** separación física, pero más configuración (Vite, TS, Vitest) sin un segundo consumidor real. Se pospone.
- **Un `src/` sin capas:** más rápido al inicio; la fuga de dependencias se descubre tarde y bloquea la integración.
- **Intérprete en el hilo principal:** más simple, pero un ciclo desbocado congela la interfaz y viola C10.

## Consecuencias

- Positivas: el motor y la presentación se prueban en Node sin jsdom; contratos explícitos entre capas; la integración futura es mover carpetas.
- Negativas: cinco `tsconfig` y una matriz de lint que mantener; disciplina para no exportar de más por `motor/vista.ts`.
