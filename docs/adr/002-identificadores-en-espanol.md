# ADR 002 — Identificadores en español

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `design.md` §1.4; ADR 015

## Contexto

Quienes mantendrán el proyecto son el PO y docentes de habla hispana. El vocabulario del dominio es el del curso (paso, vuelta, condición, prueba de escritorio, búfer), las especificaciones están en español y AprendiendoJava usa mayoritariamente identificadores en español (con restos en inglés, como `submitActivityAttemptSchema`). El texto visible siempre va en español de México.

## Decisión

1. Identificadores, archivos y carpetas **en español**, en **ASCII** (sin tildes ni ñ en identificadores; se prefieren sinónimos: `longitud`, no `tamaño`). Comentarios y documentación con ortografía completa.
2. Excepciones cerradas:
   - Nombres de la API de Java que se emulan, tal cual: `nextInt`, `charAt`, `println`, `Scanner`, `InputMismatchException`, `MAX_VALUE`. Son el dominio mismo.
   - Nombres impuestos por herramientas: `props`, `children`, prefijo `use` de los *hooks*, `describe`/`it`/`expect`, API de CodeMirror, archivos de configuración.
   - Préstamos técnicos de uso corriente en español (`token`).
   - Tipos de *conventional commits* (`feat:`, `fix:`) con descripción en español, como ya hace el repositorio.
3. Archivos en *kebab-case* (`analizador-lexico.ts`); componentes React en PascalCase (`PanelVariables.tsx`).

## Alternativas consideradas

- **Inglés:** estándar del ecosistema y más colaboradores potenciales, pero agrega una capa de traducción entre el currículo, las specs y el código, y choca con la plataforma hermana.
- **Mezcla libre como en AprendiendoJava:** sin regla, deriva en inconsistencias (`BuscarActivityParaJuez`).

## Consecuencias

- Positivas: correspondencia directa spec ↔ código (arquitectura que «grita» el dominio); integración natural con AprendiendoJava.
- Negativas: convivencia con APIs en inglés (`EditorView`, `useSyncExternalStore`); ESLint no puede imponer el idioma, se cuida en revisión.
