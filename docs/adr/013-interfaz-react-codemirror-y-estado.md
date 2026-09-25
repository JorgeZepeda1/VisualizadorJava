# ADR 013 — Interfaz React con CodeMirror 6, estado por reductor y almacén externo de la traza

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `design.md` §6; `exploracion/05` §2; ADR 006, 015

## Contexto

La interfaz tiene cuatro zonas (código, estado, consola, explicación) más controles, debe navegar trazas de 100 000 pasos sin trabarse, seguir el patrón contenedor/presentacional y minimizar dependencias. El editor necesita decoraciones exactas por carácter (subexpresión, rama, error) y modo de solo lectura.

## Decisión

1. Estado de la aplicación con `useReducer` + contexto de React 19; la `Traza` vive **fuera** de React como almacén mutable con versión, leída con `useSyncExternalStore`.
2. `src/presentacion` deriva un `ModeloVista` puro (explicación, sustitución, resaltados, variables, consola, búfer, predicción) a partir de la vista del programa, la traza y la navegación; los componentes presentacionales solo reciben *props*.
3. CodeMirror 6 (`state`, `view`, `language`, `commands`, `lang-java`) envuelto en `EditorJava`, controlado por *props* y `StateEffect`; `Compartment` para solo lectura y para el tema del modo proyector.
4. Estilos con variables CSS y módulos CSS de Vite (sin Tailwind); fuentes del sistema.

## Alternativas consideradas

- **Redux o Zustand:** dependencias para lo que `useReducer` y `useSyncExternalStore` ya resuelven.
- **Monaco:** mucho más pesado y con *workers* propios delicados bajo Vite.
- **Tailwind (como AprendiendoJava):** coherencia visual, pero una dependencia más para una sola pantalla.

## Consecuencias

- Positivas: la derivación de la vista se prueba en Node (C9); cero bibliotecas de estado; el editor es reemplazable.
- Negativas: integración propia con CodeMirror (decoraciones, efectos); los componentes con CodeMirror se prueban sobre todo en E2E porque jsdom no hace *layout*.
