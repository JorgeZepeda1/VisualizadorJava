# 05 — Tecnología y arquitectura del motor

**Cambio SDD:** `visualizador-java` · **Fase:** exploración (uno de 5 exploradores en paralelo, ver `state.yaml`) · **Verificado:** 2026-09-25 · **Alcance:** comparar y recomendar; el diseño definitivo lo cierra `sdd-design`.

## Cómo leer este documento

- Cada decisión trae: la pregunta, una tabla comparativa, la recomendación, los **contras honestos** de esa recomendación, y la evidencia con la que se verificó.
- Todas las versiones se verificaron HOY con `npm view <paquete> version/engines.node/license/time.modified` contra el registro real de npm, y con `curl` a la API pública de GitHub (`pushed_at`, issues abiertos, `archived`) para señales de mantenimiento. Ninguna versión se tomó de memoria.
- Ya existe un corpus real de pruebas diferenciales contra JDK 17 en `exploracion/experimentos/{numeros,texto}/`, obra de otro explorador en paralelo — se referencia en §7 y §9 en vez de proponer algo desconectado de él.

## Resumen (una línea por decisión)

| # | Decisión | Recomendación |
|---|----------|----------------|
| 1 | Analizador sintáctico | Recursive-descent + Pratt **escrito a mano** |
| 2 | Editor | **CodeMirror 6** |
| 3 | Modelo de ejecución | Intérprete de AST con **funciones generadoras** |
| 4 | Web Worker | `postMessage` asíncrono, **sin** SharedArrayBuffer |
| 5 | Traza | **Deltas** por mensaje + estructura persistente reconstruida en cada lado |
| 6 | Valores en runtime | Primitivos JS + **tipo estático en el AST**; `String` con wrapper de identidad |
| 7 | Pruebas | Vitest + Testing Library + Playwright + arnés diferencial JDK 17 + fast-check |
| 8 | Despliegue | GitHub Pages + Actions + vite-plugin-pwa + lz-string |
| 9 | Estructura del repo | `motor/` TS puro (hexagonal), `worker/` y `ui/` como adaptadores |
| 10 | Versiones | Ver tabla §10 — **riesgo:** no usar TypeScript 7.0.2 "latest" |

---

## 1. Analizador sintáctico

### Comparativa

| Opción | Errores en español c/línea-columna | Rangos por subexpresión | Recuperación de errores | Bundle | Sin red | Esfuerzo | Mantenimiento (verificado hoy) |
|---|---|---|---|---|---|---|---|
| **Recursive-descent + Pratt a mano** | Total — el mensaje ES el código | Natural — cada nodo nace con su span | Tan buena como se programe | 0 KB de dependencia | Nativo | Alto: hay que escribir la gramática completa | Cero riesgo de terceros |
| `java-parser` (Chevrotain, prettier-java) | CST con posición, pero mensajes en inglés orientados al JLS — hay que traducir | Sí, vía CST | Buena (algoritmo estilo Antlr3) | `chevrotain` 1.24 MB + `java-parser` 257 KB (unpacked) | Sí | Medio: adaptar el CST completo de Java a un AST reducido | **Alto — ver hallazgo abajo** |
| `@lezer/java` | Sin mensajes propios; diseñado para "nunca fallar" y seguir coloreando | Sí, vía árbol Lezer | Tolera errores (los ignora, no los reporta como querremos) | 178 KB | Sí | Medio-alto: hay que invertir su filosofía de "tolerar todo" | Bajo — actualizado 2026-09-08 |
| `web-tree-sitter` + `tree-sitter-java` (WASM) | Sin mensajes propios, hay que construirlos sobre sus nodos de error | Sí, por rango de bytes | La mejor de las 5 (ver evidencia) | Runtime + gramática, WASM de un solo hilo (~1-2 MB estimado, medir con build real) | Sí, no requiere COOP/COEP | Medio: parsea TODO Java, incluso lo fuera de alcance | Bajo — activo (`pushed` 2026-09-13) |
| ANTLR4 (`antlr4ng` + gramática `Java.g4`) | Genéricos, hay que traducir | Vía `Token`/contexto | Sistemática (resync + inserción/borrado de un token) | Runtime `antlr4ng` 10.9 MB unpacked + parser generado | Sí | Medio-alto: adoptar la gramática oficial completa | Repo activo en GitHub, **sin publicar en npm desde 2025-03-03** (18 meses) |

### Recomendación: recursive-descent + Pratt escrito a mano

**Por qué:**

1. **El alcance es un subconjunto de Java (U3–U7), no Java completo.** Las cuatro alternativas parsean TODO Java (lambdas, genéricos, clases, interfaces…): aceptarían sintaxis fuera de alcance y de todos modos habría que escribir una segunda pasada semántica para rechazarla con el aviso claro que pide el PO. Un parser a mano simplemente no tiene esas producciones en su gramática — lo fuera de alcance no parsea, y el error nace en el mismo lugar donde se detecta.
2. **Control total del mensaje en español y del rango exacto de la subexpresión** (`x > 5` dentro de la línea). Con un CST/AST de terceros hay que mapear su modelo de nodos al nuestro; sus mensajes nacen en inglés y orientados al JLS, no a un alumno de bachillerato.
3. **Cero dependencia de terceros en el motor.** Evidencia de que esto importa de verdad: `java-parser` — el paquete que expone la gramática completa de Java sobre Chevrotain — fue **abandonado por su propio creador**. El último commit que toca `packages/java-parser` en el repo `jhipster/prettier-java` (2026-03-08) se titula literalmente `refactor: replace java-parser with tree-sitter`; el paquete no se ha vuelto a publicar en npm desde 2025-08-07 (13 meses). No es razonable apostar un proyecto educativo de largo plazo a una pieza que su propio dueño ya reemplazó.
4. **Cómo se resuelven las ambigüedades típicas:**
   - `(int) x` (cast) vs. `(x)` (paréntesis): con 1-2 tokens de lookahead tras el `(` — si sigue una palabra reservada de tipo primitivo (`int`, `double`, `boolean`, `char`) y luego `)`, es cast seguro. En el JLS completo `(Foo) bar` es genuinamente ambiguo entre cast y multiplicación si `Foo` fuera variable (por eso el grammar oficial de Java reestructura `CastExpression` para diferir la decisión, ver JLS cap. 19); en nuestro subconjunto **no hay tipos de referencia definidos por el usuario** (solo `String` + primitivos/wrappers), así que la lista de "nombres válidos para cast" es cerrada y conocida en tiempo de parseo — no hace falta resolución diferida.
   - `Tipo x` (declaración) vs. `x` (expresión) al inicio de sentencia: se resuelve mirando el primer token — palabra reservada de tipo o `final` ⇒ declaración; en el resto de los casos (con un vistazo extra para `String identificador`) ⇒ sentencia-expresión. Como el conjunto de tipos válidos es cerrado, no hace falta el backtracking que exige el JLS completo.
   - Las 4 alternativas de terceros ya traen esta ambigüedad resuelta por su gramática (heredan el trabajo del JLS o de tree-sitter-java) — es una ventaja real de adoptarlas, pero no compensa los puntos 1-3.

**Contras honestos:**
- Esfuerzo: hay que escribir toda la gramática, incluida la recuperación de errores — no se hereda gratis el trabajo de un equipo dedicado a esto.
- No está "probado en batalla" contra millones de repositorios reales como sí lo está `tree-sitter-java`. Mitigación: el corpus curricular de 35 programas + el arnés diferencial contra JDK 17 (§7, que ya tiene semilla real) hace ese trabajo de validación, acotado a nuestro subconjunto.
- Si el alcance creciera mucho más allá de U3–U7 (clases, herencia, genéricos…), el costo de mantener la gramática a mano crece rápido — ese es el punto en el que valdría reabrir esta decisión.

**Alternativa de respaldo** si el recobro de errores a mano sale más caro de lo previsto: `web-tree-sitter` + `tree-sitter-java` (WASM, un solo hilo, no pide COOP/COEP) — su gramática está activa y ahora además validada por el hecho de que el propio `prettier-java` migró a ella. El costo es adoptar una gramática completa de Java y filtrar lo fuera de alcance en una pasada aparte.

**No recomendado:** `java-parser`/Chevrotain-la-gramática (abandonado por su autor — Chevrotain-el-toolkit en sí sigue muy vivo, `pushed_at` de hoy, pero solo tendría sentido como ayuda para construir una gramática propia reducida, no para adoptar la gramática completa de Java); `@lezer/java` (optimizado para "nunca fallar" en un editor en vivo, justo lo contrario de lo que pedimos); ANTLR4/`antlr4ng` (bundle grande, sin publicar en npm hace 18 meses aunque el repo en GitHub sigue con commits).

---

## 2. Editor

| Criterio | Monaco | CodeMirror 6 |
|---|---|---|
| Tamaño | Paquete npm sin empacar: **101.7 MB** (todo VS Code, todos los lenguajes/workers). Cifra *comúnmente citada* (no verificada de primera mano) para un build afinado: 2–5 MB | Núcleo modular por paquetes (`@codemirror/state` 6.7.6, `@codemirror/view` 6.43.13, `@codemirror/language` 6.12.4); unpacked de `@codemirror/view` 1.2 MB (incluye mapas/tipos/dual build). Cifra comúnmente citada para un bundle final razonable: 50–300 KB |
| Workers bajo Vite | Sus servicios de lenguaje corren en Web Workers — **hay que configurar el bundler explícitamente** (import del worker de editor) o no arranca en runtime; no hay plugin oficial first-party para Vite | No necesita workers para edición/resaltado básico (nuestro intérprete sí va en un Worker aparte, pero es una decisión independiente de la del editor, ver §4) |
| API de decoraciones | Madura, pensada para IDE completo (hover, autocompletado, minimapa) | `Decoration.mark` / `.widget` / `.line` operan sobre **offsets de carácter exactos** — encaja directo con "subrayar `x > 5` dentro de la línea" y "valor en línea junto a la variable" |
| Accesibilidad / móvil-tableta | Débil en táctil, reconocido por el propio proyecto VS Code | Diseñado con soporte táctil desde el origen |
| Resaltado de Java | Tokenizer Monarch para Java incluido | `@codemirror/lang-java` 6.0.2 (MIT) |
| Licencia | MIT | MIT |
| Mantenimiento | Excelente — `pushed_at` 2026-09-24, 46.8k estrellas | Excelente — `@codemirror/view` actualizado 2026-09-22 (hace 3 días) |

### Recomendación: CodeMirror 6

Laptops escolares modestas + posible tableta + cero-CDN + decoraciones exactas por carácter son justo el caso para el que se diseñó CM6. Monaco resuelve un problema que no tenemos (IDE completo con IntelliSense) a cambio de un footprint muchas veces mayor y una integración de workers más delicada bajo Vite.

**Contras honestos:** CM6 tiene una curva de aprendizaje real por su arquitectura de extensiones/facets (no es "poner un `<textarea>` y ya"); funciones que Monaco trae de fábrica (ir a definición, IntelliSense) habría que construirlas a mano si algún día hicieran falta — no las necesitamos para este alcance.

**Nota de honestidad sobre tamaños:** las cifras de npm de arriba son el tamaño del tarball completo (incluye mapas de fuente, builds CJS+ESM, tipos y, en Monaco, todos los lenguajes que soporta VS Code) — no el tamaño que termina en el bundle servido tras tree-shaking/minify. Antes de cerrar `sdd-design` conviene medir con un build real de Vite en vez de fiarse de comparativas de terceros.

---

## 3. Modelo de ejecución

| Criterio | AST + funciones generadoras | Bytecode / VM de pila |
|---|---|---|
| Pasos a nivel subexpresión | Natural — cualquier `yield` puede vivir dentro de `evaluarExpresion()` | Posible, pero exige que cada subexpresión compile a su propia instrucción con mapeo de vuelta al rango fuente — si no, se pierde precisión o hay que reconstruir el árbol de evaluación desde el bytecode |
| Pausa para Scanner | Trivial: un `yield {tipo:'necesita_entrada'}` en medio de `nextInt()` | Requiere una instrucción `ESPERAR_ENTRADA` que congele el puntero de instrucción — factible, pero una segunda máquina de estados encima de la primera |
| Límite de pasos | Se cuenta cada `yield` en el bucle director | Se cuenta por instrucción ejecutada — igual de simple |
| Rendimiento | Un intérprete AST con generadores hace típicamente millones de nodos/seg en V8 para programas simples — la meta de 100 000 pasos/<1s es holgada | Más rápido en teoría (menos overhead de despacho), pero la diferencia es irrelevante frente a la meta ya holgada del caso anterior |
| Memoria de la traza | Depende de la estrategia de snapshot (ortogonal, ver §5) | El estado de la VM (pila + IP) suele ser más chico y regular que un entorno con nombres — ventaja potencial |
| Navegación hacia atrás | Se resuelve en la capa de traza (§5) | Snapshots de VM (arrays) a veces más fáciles de deduplicar |
| Esfuerzo | Medio — calca casi directamente la gramática | Alto — hay que diseñar el set de instrucciones, el compilador AST→bytecode, y mantener el mapa instrucción↔rango-fuente |

### Recomendación: intérprete de AST con funciones generadoras

La meta de rendimiento (100 000 pasos/<1s) es baja para cualquiera de las dos opciones en V8 — no es el criterio que decide. Lo que decide es que el requisito central del producto ("ver `x > 5` → `3 > 5` → `false`", resaltar la subexpresión) vive naturalmente en un AST: cada nodo **es** la subexpresión, con su rango de origen ya adjunto desde el parseo. Con bytecode hay que reconstruir esa relación después de compilar, duplicando información. Además, un generador que hace `yield` es exactamente el punto de pausa que necesita el protocolo del Worker (§4) sin mecanismo adicional — la pausa "un paso" y la pausa "esperando Scanner" son el mismo `yield`.

**Contras honestos:** un intérprete AST ingenuo es más lento que una VM de pila bien optimizada si el alcance creciera a programas grandes o hubiera que ejecutar muchos programas en paralelo — no es nuestro caso (un alumno viendo un programa a la vez). Los generadores de JS tienen su propio costo de asignación por `yield`, muy por debajo del margen que da la meta ya holgada.

---

## 4. Web Worker

**Hallazgo verificado:** GitHub Pages **no soporta headers de respuesta personalizados** — confirmado por la discusión abierta de la comunidad de GitHub (`community/community` discusión #13309, sin ETA de resolución) y por múltiples guías de terceros que documentan el mismo límite. Sin poder mandar `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` desde el servidor, no se puede activar aislamiento de origen cruzado — el requisito real para `SharedArrayBuffer`/`Atomics.wait`.

Existe un workaround conocido (`coi-serviceworker`): un service worker que intercepta las respuestas y simula esos headers en el navegador. Funciona en GitHub Pages, pero fuerza una recarga en la primera visita y suma una segunda pieza de service worker junto a la que ya pondría `vite-plugin-pwa`.

### Recomendación: protocolo asíncrono por `postMessage`, sin perseguir SharedArrayBuffer

1. El Worker ejecuta el generador del intérprete en un bucle director.
2. Cuando el generador hace `yield {tipo:'necesita_entrada', prompt}` (dentro de `Scanner.nextInt()`, etc.), el Worker manda `postMessage({tipo:'necesita_entrada', ...})` y espera (`await`) sobre una Promise pendiente.
3. El hilo principal muestra el cuadro de entrada junto a la consola; al confirmar el alumno, manda `postMessage({tipo:'entrada', valor})`.
4. El listener del Worker resuelve la Promise pendiente; el bucle director llama `generador.next(valor)` y sigue.

No se necesita `SharedArrayBuffer` en ningún punto — compatible con GitHub Pages tal cual, sin service workers adicionales. Esto coincide con lo que el PO ya definió.

**Terminar por tiempo/ciclo infinito — dos capas, no una sola:**
- **Cooperativa (primera línea):** el intérprete debe garantizar al menos un `yield` cada N operaciones primitivas — le da al bucle director un punto para chequear un contador de pasos y abortar limpio, con traza parcial intacta, si se excede un máximo configurable.
- **Dura (respaldo):** `worker.terminate()` + recrear el Worker si por alguna razón no se respetó el punto anterior — es un corte sucio (se pierde la traza parcial) pero es la única garantía absoluta de que la pestaña no se cuelga.

**Contras honestos:** el protocolo por mensajes es más código que "el hilo se detiene solo" (lo que daría `Atomics.wait`) — hay que manejar explícitamente el estado "esperando entrada" en la UI (deshabilitar controles de paso, etc.). Es el costo aceptado a cambio de funcionar en GitHub Pages sin depender de un hack de service worker.

---

## 5. Modelo de datos de la traza

Cada paso NO debe llevar texto en español ya armado — debe llevar **datos** para que la UI arme el texto (separa intérprete de presentación; facilita que el mismo motor sirva a `AprendiendoJava` con otra UI el día de mañana). Boceto ilustrativo (no es diseño final):

```ts
interface PasoTraza {
  numero: number;
  rango: RangoFuente;               // sentencia/expresión en ejecución
  evento: EventoPaso;                // union: asignacion | evaluacionCondicion | entradaCiclo | llamadaImpresion | esperaEntrada | ...
  cambiosVariables: CambioVariable[]; // DELTA, no snapshot completo
  salidaConsola?: string;            // solo el fragmento NUEVO de este paso
  arbolEvaluacion?: NodoEvaluacion;   // p.ej. x>5 -> {op:'>', izq:{valor:3}, der:{valor:5}, resultado:false}
}
```

La tabla de "prueba de escritorio" (variable × paso) **no se guarda** en cada paso — se reconstruye en el cliente recorriendo `cambiosVariables` de los pasos 0..N y acumulando el último valor conocido de cada variable (operación lineal, barata).

**Hallazgo importante sobre serialización vía `postMessage`:** si el Worker guarda su traza con estructuras persistentes de compartición estructural (p. ej. `immer` 11.1.18, MIT, confirmado en npm), esa compartición de memoria vive **solo dentro del heap del Worker**. En el momento de mandar un paso por `postMessage`, el algoritmo de clonación estructurada del navegador copia el objeto completo — no preserva la compartición entre mensajes. Si se manda una instantánea completa de todas las variables en cada uno de, digamos, 100 000 pasos, el hilo principal termina pagando el costo íntegro de copia que la estructura persistente evitaba del lado del Worker.

### Recomendación: mandar deltas por `postMessage`, reconstruir persistente en ambos lados

- El mensaje es barato de clonar (proporcional a lo que cambió, no al estado total).
- Tanto el Worker como la UI pueden reconstruir el estado completo en cualquier paso N sin haber acumulado los N pasos completos en memoria activa — clave para "navegación hacia atrás" en programas con muchas iteraciones.
- Combinar con checkpoints periódicos (p. ej. cada 500 pasos): para saltar lejos hacia atrás se parte del checkpoint más cercano y se "reproducen" los deltas siguientes, en vez de retener cada instantánea.

**Contras honestos:** reconstruir estado a partir de deltas es más código que "cada paso ya trae todo" — hay que escribir y probar un reconstructor de estado en ambos lados (Worker y UI), y decidir la frecuencia de checkpoints (afinar en `sdd-design`: es una decisión de memoria vs. velocidad de salto en el scrubber).

---

## 6. Representación de valores en tiempo de ejecución

**La pregunta del PO — costo de rendimiento de valores etiquetados:** etiquetar cada valor con un wrapper `{tipo, valor}` (boxing universal) es un patrón conocido por ser costoso en V8 — cada operación aritmética asigna un objeto nuevo, presiona al recolector de basura y desactiva optimizaciones de forma oculta que V8 aplica a números primitivos. Para la meta de 100 000 pasos/<1s en laptop escolar modesta, evitar boxing en el camino caliente (aritmética, comparaciones, bucles) importa.

### Recomendación: tipo ESTÁTICO en el AST, no etiqueta en tiempo de ejecución

El subconjunto de Java del alcance es de **tipado estático declarado** (`int x`, `double y`...). El tipo de cada expresión se puede — y se debe — resolver en una pasada de análisis semántico *antes* de interpretar (igual que hace `javac`), anotando cada nodo del AST y cada entrada del entorno con su tipo Java estático. El intérprete no necesita preguntarle al valor qué tipo es — ya lo sabe por el nodo que está evaluando — y aplica la coerción correspondiente:

- **`int`:** número JS + `| 0` tras cada operación (`Math.imul` específicamente para multiplicación, porque `a*b|0` puede perder precisión antes del `|0` con operandos grandes).
- **`long`:** `BigInt` nativo (sin wrapper) + `BigInt.asIntN(64, resultado)` tras cada operación, porque el `BigInt` de JS es de precisión arbitraria por defecto.
- **`double`:** número JS tal cual (IEEE 754 de 64 bits — coincide exactamente con Java `double`).
- **`float`:** número JS + `Math.fround(resultado)` tras cada operación.
- **`boolean`:** `boolean` de JS tal cual.
- **`char`:** número JS (unidad UTF-16) **sin** wrapper — el "es char" lo sabe el AST/entorno por tipo estático. La promoción numérica (`'a' + 1` da `int` en Java, no `char`) se resuelve una sola vez en el análisis semántico, con las reglas de promoción del JLS, no en cada ejecución.

**La excepción real: `String`.** Java distingue identidad de igualdad de valor (`==` compara referencia, `.equals()` compara contenido) — es justo una lección central del curso (`new String("a") == "a"` → `false`). Un string primitivo de JS no puede reproducir esto: JS compara primitivos de string **por valor** con `===`, siempre. Para que `==` en el intérprete se comporte como Java, `String` necesita un wrapper con identidad propia:

```ts
class CadenaJava { constructor(public valor: string) {} }
```

con un "pool" de literales (mismo texto literal reutiliza la misma instancia, simulando el pool de constantes de la JVM) y `new String(...)` creando siempre una instancia nueva.

### Recomendación

Primitivos JS crudos + tipo estático llevado en el AST/entorno para `int`/`double`/`float`/`char`/`boolean`/`long`; wrapper de identidad **solo** para `String`.

**Contras honestos:** exige escribir una pasada de análisis semántico/tipos completa antes de interpretar — no se puede improvisar tipos sobre la marcha. Es más disciplina de diseño que "etiquetar y ya", pero es trabajo que de todas formas hace falta para dar buenos mensajes de error de tipos en español *antes* de ejecutar (coincide con "aviso claro, nunca un resultado inventado" para lo fuera de alcance).

---

## 7. Pruebas

Ya existe un corpus real en `exploracion/experimentos/{numeros,texto}/` (obra de otro explorador en paralelo — `state.yaml` confirma 5 exploradores, 01..05) con pares `.java` + `.salida.txt` (y `.entrada.txt`/`.compilacion.txt` para casos con Scanner o errores) ya verificados contra el JDK 17 real de este equipo — ver por ejemplo `Test01Int.java`/`.salida.txt`, que ya cubre overflow de `int`, división entera con signos, orden de evaluación de `++`/`--`, y desplazamientos con máscara de bits. Es la semilla natural del arnés diferencial; no hay que construir el corpus desde cero.

### Recomendación

- **Arnés diferencial:** un script de Node que recorra `corpus/**/*.java`, compile con `javac` y ejecute con `java` del JDK 17 en `/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home/bin/` (alimentando `.entrada.txt` por stdin cuando exista), y escriba `.salida.txt` — commiteados al repo para que `npm test` local no necesite JDK instalado en cada máquina. Una prueba de Vitest separada, con JDK disponible (local o CI), regenera y diffea contra lo commiteado para detectar goldens desactualizados.
- **CI:** `actions/setup-java@v6` (versión vigente confirmada hoy) con `distribution: temurin, java-version: '17'` — coincide exactamente con el JDK 17.0.18 ya instalado en local, evitando divergencias entre lo que se prueba en CI y lo que valida el PO en su laptop.
- **`fast-check`** (4.10.2, MIT, confirmado) para pruebas basadas en propiedades: generar programas pequeños **válidos dentro de la gramática del subconjunto** (un generador de AST válido, no de texto Java arbitrario) y comparar contra el oráculo de JDK 17 en lote. Recomendado como job de CI aparte (más lento, invoca `javac`/`java` por caso), no en cada commit.
- **Vitest** 5.0.2 + `@vitest/coverage-v8` para unidad/cobertura, **Testing Library** para componentes React, **Playwright** 1.63.0 para E2E — todas confirmadas como versiones vigentes hoy (§10).

**Contras honestos:** mantener un arnés diferencial contra JDK real es infraestructura extra (JDK 17 disponible en CI, captura de `stdin`/`stdout` exactamente igual que Java, codificación y saltos de línea consistentes) — pero es la única forma creíble de sostener "fidelidad idéntica a Java 17" en el tiempo, y el corpus ya iniciado reduce mucho el costo de arrancar.

---

## 8. Despliegue y uso sin red

- **GitHub Pages + Actions:** build de Vite con `base` configurado al nombre del repo, deploy con `actions/deploy-pages` (flujo oficial que reemplazó la rama `gh-pages` manual).
- **`vite-plugin-pwa`** 1.3.0 ya declara soporte de peer dependency para Vite `^8.0.0` (confirmado con `npm view vite-plugin-pwa peerDependencies`) — no hay bloqueo hoy, aunque el paquete no se ha vuelto a publicar desde 2026-05-05 (~4.5 meses; no alarmante para un proyecto con 4275 estrellas y 191 issues abiertos, volumen normal).
- **Fuentes autoalojadas:** nada de Google Fonts ni ningún otro CDN en tiempo de ejecución (coincide con la decisión ya tomada) — empacar los `.woff2` necesarios y referenciarlos con `@font-face` local. Para el editor de código, considerar la pila `monospace` del sistema como primera opción (cero bytes, funciona en cualquier laptop escolar) y solo autoalojar una fuente propia si el PO pide identidad visual específica.
- **Compartir programa por URL:** `lz-string` (1.5.0, MIT, confirmado) vía `compressToEncodedURIComponent` — el límite práctico de URL entre navegadores ronda ~2000 caracteres; un programa típico de clase (decenas de líneas) suele entrar sin problema, pero un programa largo con muchos ciclos anidados puede no caber. Recomendación: `lz-string` como mecanismo principal, con salida de emergencia (exportar/cargar archivo `.java`, o `localStorage` como historial reciente) para cuando no quepa — no depender de la URL como único mecanismo de guardado.
- **Un solo service worker:** el de `vite-plugin-pwa` (Workbox 7.4.1 por debajo) para caché offline. Evitar sumar `coi-serviceworker` (§4) sin una razón de peso, para no duplicar la superficie de fallos de caché/actualización.

**Contras honestos:** `vite-plugin-pwa` trae su propia complejidad de invalidación de caché (avisar al usuario que hay versión nueva vs. auto-recargar) que hay que resolver explícitamente en `sdd-design` — no es "zero-config" en la práctica aunque el README lo sugiera.

---

## 9. Estructura del repositorio

```
/Users/desarrollo/VisualizadorJava/
├── motor/                 # TypeScript puro, CERO DOM/React
│   ├── lexer/
│   ├── parser/             # recursive-descent + Pratt (§1)
│   ├── ast/
│   ├── semantico/          # análisis de tipos (§6); aquí se rechaza lo fuera de alcance
│   ├── interprete/         # generadores (§3)
│   ├── stdlib/              # String, Math, Scanner, Random, printf emulados
│   └── traza/               # modelo de pasos (§5)
├── worker/                 # adaptador: protocolo postMessage (§4), sin lógica de dominio
├── ui/                      # React + CodeMirror 6 (§2), consume el motor SOLO vía worker/
├── corpus/                  # *.java + *.salida.txt (semilla: exploracion/experimentos/)
└── openspec/
```

Es Screaming/Hexagonal: `motor/` no importa nada de `react`, `vite` ni del DOM — es una librería TypeScript aislada, publicable o enlazable vía workspace el día que se quiera integrar dentro de `AprendiendoJava` (Next.js 16 + React 19, solo lectura hoy). `worker/` y `ui/` son los dos adaptadores/puertos. Los tests de `motor/` corren en Node puro (sin `jsdom`) porque no toca el navegador.

**Contras honestos:** exige disciplina para no "colar" un import de React dentro de `motor/` por conveniencia — vale la pena una regla de ESLint (`no-restricted-imports`) que lo impida desde el día uno, no solo confiar en la revisión de código.

---

## 10. Versiones actuales (verificadas hoy, 2026-09-25)

| Paquete | Versión | Node mínimo | Licencia | Nota |
|---|---|---|---|---|
| `vite` | 8.3.1 | `^20.19.0 \|\| >=22.12.0` | MIT | — |
| `react` / `react-dom` | 19.3.0 | `>=0.10.0` | MIT | — |
| `typescript` | latest = 7.0.2, **recomendado: 6.0.3** | `>=16.20.0` | Apache-2.0 | Ver riesgo abajo |
| `vitest` / `@vitest/coverage-v8` | 5.0.2 | **`^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`** | MIT | Exige Node ≥22 — no corre en el Node 20 global |
| `@vitejs/plugin-react` | 6.1.1 | `^20.19.0 \|\| >=22.12.0` | MIT | — |
| `playwright` / `@playwright/test` | 1.63.0 | `>=20` | Apache-2.0 | — |
| `@testing-library/react` | 16.3.3 | `>=18` | MIT | — |
| `@codemirror/state` | 6.7.6 | — | MIT | — |
| `@codemirror/view` | 6.43.13 | — | MIT | actualizado hace 3 días |
| `@codemirror/lang-java` | 6.0.2 | — | MIT | — |
| `vite-plugin-pwa` | 1.3.0 | `>=16.0.0` | MIT | peer `vite` ya incluye `^8.0.0` |
| `lz-string` | 1.5.0 | — | MIT | — |
| `fast-check` | 4.10.2 | `>=12.17.0` | MIT | — |
| `immer` | 11.1.18 | — | MIT | opcional, para §5 |
| `actions/setup-java` | v6 | — | MIT | `distribution: temurin, java-version: '17'` |

### Riesgo verificado #1 — no usar TypeScript 7 todavía

`npm view typescript dist-tags` da `latest: 7.0.2`. TypeScript 7 es la reescritura nativa en Go (`tsgo`, GA 2026-07-08, ~8-12x más rápido en type-check) pero **no trae API programática hasta la versión 7.1**. `typescript-eslint@8.70.1` (publicado ayer, 2026-09-24) declara `peerDependencies.typescript: ">=4.8.4 <6.1.0"` (confirmado con `npm view typescript-eslint peerDependencies`) — **excluye explícitamente toda la serie 7.x**. Instalar `typescript@latest` hoy rompe el lint con reglas de tipos desde el primer commit. **Recomendación: fijar `typescript@6.0.3`** (última 6.x estable) hasta que `typescript-eslint` publique soporte para TS7.

### Riesgo verificado #2 — Node del proyecto

El Node global de esta máquina es 20.20.2; `vitest@5` exige Node ≥22.12 (o ≥24, o ≥26) — confirmado en su campo `engines.node`. El proyecto necesita fijarse a Node 22 (ya disponible vía `nvm`: 22.23.1) con un `.nvmrc`. Sin eso, `npm test` falla en el Node global.

---

## Riesgos transversales (resumen)

1. `java-parser`/Chevrotain-la-gramática: abandonado por su propio creador en marzo 2026 (evidencia: commit `refactor: replace java-parser with tree-sitter` en `jhipster/prettier-java`). No usar para el motor.
2. TypeScript 7.0.2 ("latest") rompe `typescript-eslint` hoy (peer dep confirmado `<6.1.0`). Fijar 6.0.3.
3. `vitest@5` exige Node ≥22.12 — fijar `.nvmrc` a 22.23.1; el Node 20 global no alcanza.
4. GitHub Pages no soporta headers COOP/COEP (confirmado, sin ETA de la comunidad) — el diseño ya evita `SharedArrayBuffer`, así que esto no bloquea, pero descarta cualquier futuro intento de acelerar con hilos WASM compartidos sin adoptar el hack de `coi-serviceworker`.
5. `vite-plugin-pwa` sin publicar desde mayo 2026 (~4.5 meses) — no bloqueante hoy (el peer dep ya cubre Vite 8), pero vigilar antes de `sdd-apply`.
6. Los tamaños de Monaco/CodeMirror en §2 mezclan tamaño de tarball de npm (verificado) con cifras de bundle final "comúnmente citadas" por terceros (no verificadas de primera mano) — medir con un build real de Vite antes de cerrar `sdd-design`.
7. El tamaño real en bytes del WASM de `web-tree-sitter` + `tree-sitter-java` (alternativa de respaldo en §1) es una estimación (~1-2 MB) — habría que compilarlo y medirlo si algún día se activa esa alternativa.

## Fuentes principales consultadas

- Registro de npm (`npm view`) — fuente primaria para todas las versiones, licencias y `engines.node` de este documento.
- API pública de GitHub (`api.github.com/repos/...`) — `pushed_at`, `open_issues_count`, `archived` para señales de mantenimiento.
- Commits de `packages/java-parser` en [jhipster/prettier-java](https://github.com/jhipster/prettier-java) (evidencia del abandono de `java-parser`).
- [github.com/community/community discusión #13309](https://github.com/orgs/community/discussions/13309) y [blog.tomayac.com sobre COOP/COEP en hosting estático](https://blog.tomayac.com/2025/03/08/setting-coop-coep-headers-on-static-hosting-like-github-pages/) — límite de headers de GitHub Pages.
- [lezer.codemirror.net](https://lezer.codemirror.net/) — arquitectura de parsing incremental de Lezer.
- [github.com/tree-sitter/tree-sitter-java](https://github.com/tree-sitter/tree-sitter-java) — estado del grammar.
- [github.com/mike-lischke/antlr4ng](https://github.com/mike-lischke/antlr4ng) — antlr4ng vs. antlr4ts.
- [github.com/microsoft/typescript-go](https://github.com/microsoft/typescript-go) — estado de TypeScript 7 / `tsgo`.
- [github.com/pieroxy/lz-string](https://github.com/pieroxy/lz-string) — compresión para compartir por URL.
- JLS cap. 19 (gramática oficial de Java) — resolución de la ambigüedad cast vs. paréntesis en el grammar completo.
