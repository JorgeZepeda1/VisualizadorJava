# ADR 010 — Datos del JDK generados por el oráculo, nunca escritos a mano

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `design.md` §2.7, §3.6, §4, §7.3; ADR 004, 011, 016

## Contexto

La fidelidad depende de hechos del JDK 17 que no se pueden deducir de JS: tablas de `Character` con Unicode 13 (los navegadores traen uno más nuevo), marcos de excepción con número de línea que además dependen del *coder* de `String` (verificado: `charAt` cambia mensaje y marcos entre Latin-1 y UTF-16), firmas públicas de las clases soportadas (para resolver sobrecargas y distinguir «no soportado» de «no existe»), nombres de clases de `java.lang` y `java.util`, símbolos de `DecimalFormatSymbols` para `es_MX` y `es_ES`, y los mensajes del lanzador.

## Decisión

1. Programas Java propios (`herramientas/oraculo/java/Generar*.java`), escritos contra la API pública y reflexión, corren en el JDK de referencia y producen los datos.
2. Las tablas de ejecución se guardan como `src/motor/biblioteca/datos/*.generado.ts` (codificadas por rangos, con cabecera «generado; no editar») y los conjuntos de prueba en `corpus/datos/`.
3. El job del oráculo los regenera y exige bytes idénticos; nadie los edita a mano.
4. Son hechos observados del comportamiento, no código: no arrastran la licencia de OpenJDK.

## Alternativas consideradas

- **Expresiones Unicode de JS (`\p{L}`):** usan una versión de Unicode distinta de la del JDK 17.
- **Tablas escritas a mano:** propensas a error e imposibles de auditar.
- **Copiar fuentes del JDK:** problema de licencia.

## Consecuencias

- Positivas: fidelidad por construcción; auditables; se actualizan con un comando.
- Negativas: peso en el paquete (estimado 10–20 KB comprimidos, medido por el presupuesto de tamaño); hace falta el JDK para regenerarlos.
