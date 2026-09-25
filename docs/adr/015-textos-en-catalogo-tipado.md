# ADR 015 — Textos en un catálogo tipado es-MX; el motor solo emite códigos y datos

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `design.md` §2.2, §6.1; ADR 002, 013

## Contexto

C9 exige que ninguna explicación tenga marcadores sin resolver; C18, que no haya textos de interfaz fuera del catálogo es-MX. El tono (tuteo, ≤ 2 renglones, nunca «incorrecto» a secas) lo revisa el PO. El motor debe servir después a otra interfaz (AprendiendoJava).

## Decisión

1. `src/textos/es-MX/` exporta **funciones tipadas por sus datos** (`Record<ClaveExplicacion, (d: Datos) => string>`, igual para problemas, excepciones e interfaz). TypeScript exige que existan todas las claves y que cada dato esté presente: no hay plantillas con `{marcadores}` que puedan quedar sin resolver.
2. El motor emite solo códigos (`CodigoProblema`, `ClasePaso`, sitio de excepción) y datos. Lo que imprime Java (`stdout`, `stderr`, el texto del lanzador) se muestra tal cual.
3. Una regla local de ESLint rechaza texto literal en JSX y en `aria-label`, `title` y `placeholder` dentro de `src/interfaz`.
4. Una prueba recorre todas las trazas de la galería en Normal y Detallado y rechaza textos con restos como `undefined` o `{`.

## Alternativas consideradas

- **Biblioteca de i18n:** innecesaria con un solo idioma.
- **Plantillas de texto con marcadores:** fallan en ejecución y no las revisa el compilador.

## Consecuencias

- Positivas: completitud verificada al compilar; textos revisables en un solo lugar; motor reutilizable con otros textos.
- Negativas: los textos viven en archivos TypeScript; el PO necesita una guía breve (o un desarrollador) para editarlos.
