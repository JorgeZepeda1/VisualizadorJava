# Visualizador de Java paso a paso

Página web donde un alumno de bachillerato sin experiencia previa en programación pega un
programa Java sencillo (currículo de las unidades U3–U7 de la materia de Algoritmos y
Programación: variables, `if`/`switch`, ciclos, `Scanner`, `Math`, `String`…) y ve, del lado
derecho, **la ejecución paso a paso**: qué variable cambia y a qué valor, si una condición entra
o no, cada vuelta de un ciclo, la consola y la entrada por teclado. Todo en español de México.

No es un compilador de propósito general ni un IDE: es un subconjunto deliberadamente acotado del
lenguaje, pensado para que lo primero que ve un alumno sea **exactamente** lo que haría Java 17 —
nunca una aproximación. Lo que queda fuera del subconjunto se avisa con claridad en vez de
inventarse un resultado.

## Por qué existe

Quien programa por primera vez no tiene un modelo mental de "qué hace la computadora, en qué
orden". Los depuradores de un IDE muestran demasiado (pilas de llamadas, bytecode, hilos) para
alguien que apenas distingue una variable de un valor. Este visualizador enseña un solo programa
a la vez, con la menor cantidad de ruido posible, en el idioma del salón de clases.

## Fidelidad contra Java real

Cada comportamiento numérico, de texto o de biblioteca que el motor emula se verifica **byte a
byte** contra un JDK 17 real (Temurin `17.0.18+8`), nunca contra una aproximación de JavaScript:
`Double.toString`, `printf`, `Math.pow` (portado de fdlibm), `Random`, `Scanner`, mensajes de
excepción con sus marcos de pila… todo sale de un oráculo que ejecuta el JDK real y guarda el
resultado exacto (`herramientas/oraculo/`). El detalle técnico está en
`openspec/changes/visualizador-java/design.md` y en `docs/adr/`.

## Stack

- **Frontend:** Vite + React 19 + TypeScript 6 estricto. SPA estática, publicable en GitHub Pages,
  sin conexión a internet una vez cargada (PWA con precache completo).
- **Motor:** intérprete del subconjunto de Java, en TypeScript puro, sin dependencias — corre en
  un Web Worker para que un ciclo infinito nunca congele la pestaña.
- **Editor:** CodeMirror 6, con resaltado de Java.
- **Pruebas:** Vitest (unidad, diferencial contra el oráculo, propiedades con `fast-check`) y
  Playwright (E2E en Chromium, Firefox y WebKit).

Arquitectura completa, decisiones y alternativas consideradas: `docs/adr/001` a `016`.

## Desarrollo local

Requiere Node `22.23.1` exacto (ver `.nvmrc`) y, para regenerar los datos de referencia, un JDK 17
real en `/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home/bin/`.

```bash
nvm use
npm install
npm run dev          # servidor de desarrollo
npm test             # Vitest — reporter acotado
npm run lint          # ESLint
npm run tipos         # tsc --noEmit, por capa
```

`CLAUDE.md` documenta las reglas no negociables del proyecto (idioma, TDD estricto, fidelidad
contra el JDK, cero red en tiempo de ejecución) y la lista completa de comandos.

## Estado del proyecto

En construcción, por lotes, siguiendo desarrollo guiado por especificaciones. El plan vivo — 73
requisitos, 96 escenarios y 101 tareas en 7 lotes, con su avance real marcado tarea por tarea —
está en `openspec/changes/visualizador-java/`.

## Licencia

MIT — ver [`LICENSE`](./LICENSE). El comportamiento de Java se reimplementa por observación
(oráculo) y documentación pública, nunca copiando código de OpenJDK. `Math.pow` porta fdlibm 5.3
de Sun/netlib conservando su aviso original; ver [`AVISOS-DE-TERCEROS.md`](./AVISOS-DE-TERCEROS.md)
(ADR 016).
