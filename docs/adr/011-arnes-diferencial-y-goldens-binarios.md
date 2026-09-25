# ADR 011 — Arnés diferencial en Node con captura binaria y goldens en el repositorio

- **Fecha**: 2026-09-25
- **Estado**: Propuesta (se aprueba con el plan, antes de `sdd-apply`)
- **Decisores**: Arquitecto (fase `sdd-design`); PO al aprobar el plan
- **Relacionadas**: `design.md` §7; `exploration.md` §4.3; ADR 010

## Contexto

Los `.salida.txt` de `corpus-candidato/` perdieron el `\n` final (captura con el shell). macOS no trae `timeout`. Los criterios C1–C3 y C7 exigen comparar byte a byte y veredictos de javac, y `npm test` no debería necesitar el JDK en cada máquina. javac tarda ≈ 0.25 s por archivo (medido), así que 2 000 mutantes uno por uno serían lentos.

## Decisión

1. `herramientas/oraculo/` en TypeScript, ejecutado directamente por Node 22 (elimina tipos). Localiza el JDK (`JDK17_HOME` o la ruta de macOS) y **verifica la versión 17.0.18**.
2. Compila con `javac -encoding UTF-8 -g` en un directorio temporal con el nombre de la clase (subcarpeta si hay `package`); ejecuta `java -Duser.language=es -Duser.country=MX -Dfile.encoding=UTF-8` (o `ES`) con `child_process.spawn`, entrada desde los bytes del archivo, salida como `Buffer` y `SIGKILL` al vencer el tiempo; una segunda corrida con un solo descriptor para stdout y stderr guarda el orden combinado. Nunca `$(...)`.
3. Goldens en el repositorio: `nombre.salida`, `nombre.errores`, `nombre.combinada`, `nombre.oraculo.json`; `.gitattributes` con `corpus/** -text`.
4. `npm test` compara sin JDK; el job del oráculo (macOS arm64, Temurin 17.0.18+8) regenera y falla ante cualquier diferencia de bytes.
5. Mutantes compilados en lote con `javax.tools` (`CompiladorEnLote.java`, una sola JVM; guarda veredicto, línea y clave de diagnóstico); programas generados, una JVM por programa en paralelo.
6. Programas con `Random` sin semilla: se transforman con la derivación documentada de la semilla visible antes de compilarlos.

## Alternativas consideradas

- **Scripts de shell:** `$(...)` quita saltos finales y el tiempo límite es frágil en macOS.
- **Goldens escritos a mano:** prohibido.
- **Exigir el JDK en cada `npm test`:** fricción y dependencia del ambiente.

## Consecuencias

- Positivas: comparaciones exactas y reproducibles; goldens auditables en el historial.
- Negativas: regenerar requiere el JDK; el job de macOS consume minutos caros si el repositorio es privado (P1).
