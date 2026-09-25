# Avisos de terceros

Este proyecto se publica bajo licencia MIT (ver [`LICENSE`](./LICENSE)). El comportamiento de Java
se reimplementa por observación contra un JDK real y documentación pública — nunca copiando código
de OpenJDK (ADR 016). Esta página reúne los avisos que la licencia de cada pieza de terceros exige
conservar.

## fdlibm (Sun Microsystems / netlib)

`src/motor/biblioteca/matematicas/fdlibm-pow.ts` porta `e_pow.c` de fdlibm 5.3 (netlib), la
implementación de referencia de `Math.pow` (ADR 009). Su licencia permisiva exige conservar el
aviso de copyright de Sun Microsystems en el propio archivo y aquí.

**(reservado — el aviso exacto de Sun se copia aquí en la tarea 2.5, junto con el puerto de
`fdlibm-pow.ts`; no se transcribe de memoria para no introducir un error de licenciamiento.)**

## Dependencias de ejecución

Licencias de las dependencias que sí llegan al bundle publicado (las de desarrollo — pruebas,
build, linters — no se listan: nunca llegan al navegador del alumno). Esta sección la genera
`herramientas/licencias.ts` (`npm run licencias`, ADR 016 punto 4); no se edita a mano.

<!-- INICIO: generado por herramientas/licencias.ts -->
- **@codemirror/commands** 6.11.1 — MIT
- **@codemirror/lang-java** 6.0.2 — MIT
- **@codemirror/language** 6.12.4 — MIT
- **@codemirror/state** 6.7.6 — MIT
- **@codemirror/view** 6.43.13 — MIT
- **lz-string** 1.5.0 — MIT
- **react** 19.3.0 — MIT
- **react-dom** 19.3.0 — MIT
- **workbox-window** 7.4.1 — MIT
<!-- FIN: generado por herramientas/licencias.ts -->
