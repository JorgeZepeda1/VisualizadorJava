# ADR 014 — Enlace compartible, PWA y despliegue en GitHub Pages

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `design.md` §6.5, §6.7, §9; propuesta M20, M23 y §11

## Contexto

El docente prepara en casa código, entradas, semilla y modo, y lo abre en el aula sin cuentas ni servidor (M20); la aplicación debe funcionar sin red tras la primera visita (M23, C12); la reversión es volver a desplegar una etiqueta (propuesta §11). El nombre del repositorio (P1, abierta) fija la ruta del sitio.

## Decisión

1. **Enlace** en el fragmento, que el servidor nunca recibe: `#v=1&codigo=…&entrada=…&semilla=…&nivel=detallado&prediccion=1&proyector=1&regional=es-ES`. `codigo` y `entrada` con `lz-string` (`compressToEncodedURIComponent`). Se analiza a mano, porque `URLSearchParams` convierte `+` en espacio. Versión desconocida o dato dañado → aviso, nunca un programa corrupto. Si pasa de 2 000 caracteres, descargar o abrir un `.java`.
2. **PWA** con `vite-plugin-pwa`, `registerType: 'prompt'`: *precache* de todo (incluidos el trabajador y la galería), búsqueda de versión al cargar y cada hora, aviso «Hay una versión nueva» y versión visible.
3. `base` desde la variable `BASE_PUBLICA`; una prueba E2E corre con una ruta base no raíz.
4. CSP por `<meta>` con `connect-src 'self'`.
5. Despliegue con `actions/upload-pages-artifact` + `actions/deploy-pages` al crear una etiqueta `v*`; revertir = ejecutar el flujo a mano con la etiqueta anterior.

## Alternativas consideradas

- **Cadena de consulta (`?`):** llega al servidor y a sus registros.
- **Solo `localStorage`:** no se puede compartir.
- **Rama `gh-pages` manual:** reemplazada por el flujo oficial de Actions.

## Consecuencias

- Positivas: sin servidor ni cuentas; funciona sin red; reversión simple.
- Negativas: límite práctico de longitud del enlace; la actualización de la PWA requiere que el docente acepte el aviso.
