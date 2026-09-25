# ADR 016 — Licencias y código de terceros

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `design.md` §4.2, §4.4; ADR 008, 009, 010; propuesta P4

## Contexto

OpenJDK es GPLv2 con *Classpath Exception*: usar el JDK como oráculo está permitido; copiar su código a este proyecto no. La licencia del proyecto (P4) sigue abierta, con MIT como recomendación, y el motor debe poder integrarse después en AprendiendoJava. fdlibm original tiene un aviso permisivo de Sun que exige conservarlo.

## Decisión

1. El comportamiento de Java se implementa **por observación** (oráculo) y a partir de documentación pública, sin copiar código de OpenJDK (`FloatingDecimal`, `FDBigInteger`, `FdLibm.java`, `Scanner`, `Formatter`…).
2. `Math.pow` se porta de fdlibm 5.3 de netlib conservando el aviso de Sun en el archivo y en `AVISOS-DE-TERCEROS.md`.
3. Los datos derivados del JDK (tablas, marcos, firmas, mensajes) son hechos generados por nuestros programas: no son código copiado.
4. Dependencias de ejecución solo con licencias permisivas (MIT, ISC, BSD, Apache-2.0); `herramientas/licencias.ts` lo verifica en CI y genera la lista de avisos.
5. Nada del diseño depende de la licencia final; todo es compatible con MIT.

## Alternativas consideradas

- **Portar código de OpenJDK:** la vía más corta a la fidelidad, pero incompatible con MIT.
- **No declarar dependencias transitivas:** riesgo legal al integrar o redistribuir.

## Consecuencias

- Positivas: licenciamiento limpio para publicar e integrar.
- Negativas: más trabajo de caracterización (ADR 008) y un chequeo más en CI.
