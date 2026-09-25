# Exploración — `visualizador-java`

> Índice y síntesis del orquestador (2026-09-25). El detalle vive en los cinco documentos de `exploracion/`; este archivo fija qué se concluyó, qué corrigió el orquestador y qué queda pendiente del PO.

## 1. Decisiones del PO (no se reabren sin ADR)

| # | Decisión | Fuente |
|---|---|---|
| D1 | Proyecto independiente en `/Users/desarrollo/VisualizadorJava`: página estática (Vite + React + TypeScript estricto), publicable en GitHub Pages, sin red en tiempo de ejecución una vez cargada. | Respuesta del PO, 2026-09-25 |
| D2 | Alcance v1 = currículo U3–U7 de `AprendiendoJava/docs/02-curriculum.md`. Lo que quede fuera muestra un aviso claro en español, nunca un resultado inventado. | Respuesta del PO |
| D3 | Motor: intérprete de un subconjunto de Java escrito en TypeScript que corre en el navegador; fidelidad verificada contra el JDK 17 real (Temurin 17.0.18 en esta máquina). | Respuesta del PO |

## 2. Mapa de artefactos

| Documento | Contenido | Engram |
|---|---|---|
| `exploracion/01-antecedentes-y-experiencia.md` | Antecedentes (JavaWiz, Python Tutor, Thonny, Jeliot 3, UUhistle…), evidencia pedagógica, granularidad, paneles, 18 errores conceptuales, 26 plantillas de explicación, prioridades MUST/SHOULD/COULD | `sdd/visualizador-java/explore/antecedentes-ux` |
| `exploracion/02-semantica-numeros-y-formato.md` + `experimentos/numeros/` | int/long/double/char, casting, Math, printf, Random; experimento de 45 293 dobles; puerto validado de `java.util.Random` | `sdd/visualizador-java/explore/semantica-numeros` |
| `exploracion/03-semantica-texto-entrada-errores.md` + `experimentos/texto/` | String y `==`, Scanner, switch, 42 errores de compilación con mensaje exacto de javac 17 → mensaje en español, asignación definitiva, excepciones | `sdd/visualizador-java/explore/semantica-texto-errores` |
| `exploracion/04-corpus-curricular.md` + `corpus-candidato/` | Inventario del Java real del curso; 35 programas (+15 entradas, +35 salidas reales de JDK 17) | `sdd/visualizador-java/explore/corpus-curricular` |
| `exploracion/05-tecnologia-y-arquitectura.md` | Parser, editor, modelo de ejecución, worker, traza, valores, pruebas, despliegue, estructura, versiones verificadas | `sdd/visualizador-java/explore/tecnologia` |

## 3. Conclusiones que fijan el rumbo

### Experiencia de aprendizaje (01)
- Dos niveles de paso, como Thonny: **Normal** (por sentencia) y **Detallado** (por subexpresión, con cortocircuito visible de `&&`/`||`).
- 3–4 vistas simultáneas como máximo (JavaWiz demuestra que 10 vistas saturan a un principiante).
- "Predecir antes de revelar" tiene evidencia fuerte (Kumar 2015) → candidato a v1 en versión ligera (Sí/No antes de una condición o un ciclo).
- La **prueba de escritorio** (tabla variable × paso) es la vista que el alumno mexicano ya reconoce; se deriva de la traza.
- Scanner **interactivo por omisión** (fiel a NetBeans) y **precargado** también (lo exige el arnés diferencial).
- Diferenciador sin antecedentes: mostrar el búfer pendiente de Scanner (explica el error `nextInt()` + `nextLine()`).

### Fidelidad numérica (02) — verificada con JDK 17 real
- `Double.toString`: 0 diferencias en todo el rango pedagógico (19 828 valores "de salón"); 86 de 45 293 en total (0.19 %).
- `printf %.Nf` redondea HALF_UP **sobre los dígitos cortos de `Double.toString`**, no sobre el valor binario exacto ni con `toFixed` (`%.2f` de 2.675 → `2.68`). El formateador debe construirse sobre el mismo generador de dígitos.
- `java.util.Random` portado a BigInt, 100 % exacto contra JDK 17 (8 semillas, 6 métodos).
- Casting satura en double→int/long y da vuelta en long→int (`(int)(long)1e30` = −1). `Integer.MIN_VALUE / -1` no lanza excepción. `es_MX` ≡ `en_US` en separadores; solo `es_ES` los invierte.

### Texto, entrada y errores (03) — verificada con JDK 17 real
- `sc.next() == "si"` → `false`; el plegado de constantes (`"ho" + "la" == "hola"`) solo aplica a literales y `final` con inicializador constante.
- En `es_MX` el separador decimal de `Scanner.nextDouble()` es **punto**: `"3,5"` lanza `InputMismatchException`.
- Java prohíbe declarar una local con el nombre de otra que sigue viva; el análisis de alcance debe replicarlo.
- Reglas de asignación definitiva verificadas (if/else completo, `while(true)`+`break`, `do-while`; `while(cond)` y `for` nunca garantizan).
- javac encadena 3–4 errores por un solo fallo: mostrar el primero.
- `main` sin `static` compila y falla al ejecutar (error del lanzador, no de javac).

### Corpus y alcance (04)
- 21 lecciones leídas: **cero** construcciones fuera del alcance (sin arreglos, métodos propios, clases, try/catch ni JOptionPane). El alcance D2 cubre el 100 % del material real.
- Brecha: `Math`, `Random`, `printf` y casi todos los métodos de `String`/`Character`/`Integer`/`Double` no tienen ejemplos curriculares; los programas de prueba de esas áreas serán **de autoría**, verificados contra JDK 17 y marcados como tales.
- Convención dura del curso: todo `nextX()` va precedido de `System.out.print` (sin salto) → la consola muestra mensaje y entrada en el mismo renglón.
- Conviven clases con nombre en español (lecciones) y `Main` (ejercicios del juez).
- Sin sistema de diseño propio: paleta Tailwind zinc + blue + red/green con modo oscuro; sin fuentes propias.

### Tecnología (05) — versiones verificadas por el orquestador con `npm view`
- Parser recursive-descent + Pratt escrito a mano (`java-parser` sin publicar desde 2025-08-07 y abandonado por su autor).
- CodeMirror 6 (no Monaco); intérprete de AST con funciones generadoras; Web Worker con protocolo `postMessage` de pausa/continuación (GitHub Pages no admite COOP/COEP, así que nada de `SharedArrayBuffer`).
- Traza por deltas con estructura persistente; valores como primitivos JS + tipo estático del AST; solo `String` lleva envoltura de identidad.
- Vitest + Testing Library + Playwright + arnés diferencial + fast-check; CI con `actions/setup-java` (Temurin 17); GitHub Pages + `vite-plugin-pwa` + fuentes autoalojadas + `lz-string`.
- **Restricciones de versión verificadas**: `typescript` 7.0.2 es la última, pero `typescript-eslint` 8.70.1 exige `typescript >=4.8.4 <6.1.0` → fijar TypeScript 6.0.x. `vitest` 5.0.2 exige Node `^22.12.0` → `.nvmrc` con 22.23.1 (el Node global es 20.20.2).

## 4. Correcciones del orquestador

1. **El hueco de `Double.toString` NO se acepta como "límite conocido".** Análisis del archivo `experimentos/numeros/generado/diferencias-double-tostring.csv`: **85 de las 86 diferencias son dobles con valor entero en [2^53, 2^63)**, la banda de la ruta rápida de enteros largos del algoritmo `FloatingDecimal` de JDK 17 (p. ej. JDK 17 imprime `-2.1347700531594672E16` frente al más corto `-2.134770053159467E16`). Un ciclo de U6 con `Math.pow(2, n)` cae ahí. La regla es determinista y la precisó la fase de propuesta: se parte de los dígitos del entero exacto y se quitan de 0 a 2 dígitos finales con redondeo HALF_UP según el exponente binario (ninguno en los exponentes 53–57); reproducida en 122/122 valores. Se implementa por comportamiento (sin copiar código de OpenJDK, GPLv2+CE) y se valida contra el conjunto de 45 293 dobles más un conjunto denso de la banda. El único caso residual queda documentado como límite con su frecuencia medida (1 de 45 293, magnitud 10^25): JDK 17 imprime `3.5082457001091195E25` donde el más corto sería `3.5082457001091196E25`.
2. **`Math.pow` no se delega a JavaScript** (hallazgo de la propuesta, verificado por el orquestador): V8 da `0.00009999999999999999` para `Math.pow(10, -4)` y JDK 17 da `1.0E-4`; difieren en el 4.1 % de 26 336 pares. En esta Mac `Math.pow` = `StrictMath.pow` (fdlibm): el intérprete implementa la semántica de fdlibm. Pendiente medirlo en x86_64 (las laptops Windows del plantel).
3. **Las salidas de `corpus-candidato/*.salida.txt` perdieron el `\n` final** (verificado: `u3-hola-mundo.salida.txt` termina en `o`; la salida real termina en `\n`). No sirven como goldens byte a byte: el arnés las regenera capturando en binario con `-Duser.language=es -Duser.country=MX -Dfile.encoding=UTF-8`.
4. `float`, `long`, `byte` y `short` no están en el currículo, pero `long` es inevitable (`Math.round(double)` devuelve `long`, y `int r = Math.round(x);` es un error de compilación que el alumno SÍ comete). El diseño debe decidir el soporte mínimo de `long` y el aviso para los demás.

## 5. Riesgos principales

| Riesgo | Mitigación prevista |
|---|---|
| El paso Detallado (subexpresiones con cortocircuito) es la parte más cara del motor | Presupuestarlo aparte en design/tasks |
| Apariencia de la consola de NetBeans inferida, no verificada (no hay NetBeans aquí) | Pedir captura al PO |
| Divergencia sutil intérprete ↔ JDK | Arnés diferencial obligatorio en CI + conjuntos de propiedades (45 293 dobles, Random) |
| Programas desbocados (ciclo infinito de la propia lección U6) | Límite de pasos + Web Worker terminable; macOS no trae `timeout`, el generador de goldens debe usar el timeout de `child_process` |

## 6. Preguntas del PO — RESUELTAS (2026-09-25)

| # | Pregunta | Decisión del PO |
|---|---|---|
| D4 | Modo "predice antes de avanzar" | **Apagado por omisión; lo activa el docente**: interruptor visible y enlace compartible que abre el simulador con el modo ya activo. |
| D5 | Separador decimal en la entrada (`nextDouble()`) | **Punto (`3.5`), como `es_MX`**: `3,5` produce el mismo `InputMismatchException` que NetBeans. La coma queda como opción de configuración. |
| D6 | Programas propios de NetBeans | **No hay**: se escriben ejemplos nuevos por unidad (U3–U7), incluidos `Math`, `Random` y `printf`, verificados contra JDK 17 y marcados como de autoría. |
| D7 | Apariencia de la consola de NetBeans | **Apariencia inferida**: el mensaje del `print` y lo que teclea el alumno en el mismo renglón, con la entrada en otro color; se ajusta después si no se parece. |
