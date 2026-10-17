# Diseño técnico: Robots tutores (`robots-tutores`)

> Fase `sdd-design` · 2026-10-17 · Rol: **Arquitecto de Software**, con el criterio del **Diseñador Pedagógico** en el catálogo de distractores y en el libro. Fuente: `proposal.md` (R-D1–R-D4, PR-1–PR-5), `specs/*` (29 requisitos, 55 escenarios) y el código de los hitos 1 y 2. Lo comprobado contra el código o el corpus va marcado **[verificado en diseño]**. Cada decisión no trivial tendrá su ADR (017–019, primeras tareas de cada hito); aquí va el porqué en una línea.
>
> **Tamaño:** la plantilla pide menos de 800 palabras; como en `visualizador-java/design.md`, este documento fija contratos, reglas exactas y ejemplos para que `sdd-apply` no tenga que reabrir decisiones.

## 0. Resumen y mapa de decisiones

Los tres robots no agregan capas ni dependencias: el **motor** sabe dos cosas nuevas —las trampas de un programa compilado (pasada pura sobre la IR) y los hechos de cada comparación que la interfaz no puede calcular sin reevaluar Java—; **presentación** compone lo que dice cada robot a partir de la traza; **textos** guarda cada frase (ADR 015); **interfaz** dibuja los personajes, la pregunta del reto, el marcador del editor y la pantalla del libro, que se carga aparte.

| Decisión | Elegida | Descartada | Por qué | ADR |
|---|---|---|---|---|
| Dónde se detectan las trampas | Pasada `src/motor/revision/` sobre `ProgramaIr`, después de compilar | Sobre el AST; en presentación con el texto | La IR ya tiene tipos, conversiones implícitas y lecturas resueltas (`ConversionIr`, `ComparacionIr.tipoOperandos`, `LlamadaIr.clave`); en presentación habría que reanalizar Java | 017 |
| Qué es un falso positivo | Un aviso cuyo hecho no se cumple, o uno fuera de la etiqueta del PO en el corpus curricular | «Lo que el alumno no quiso hacer» | La intención no es medible; el hecho sí (D2). Las reglas son conservadoras: si no hay certeza, no se avisa | 017 |
| Opciones del reto (PR-2) | Veredicto + razón; cada opción es una lista de **afirmaciones** verificables contra la traza | Solo destino (B); dos tiempos (C) | Con razón, la tercera opción nunca es relleno y existe el acierto parcial | 018 |
| Datos para refutar distractores | El motor anota piezas de la condición, relación numérica y «mismo texto» | La interfaz compara los valores de `Paso.valores` | «Nunca recalcular en la interfaz» (D2): el motor compara con su semántica verificada | 018 |
| Reto y predicción D4 (PR-1) | El reto **es** D4 con tres opciones (enmienda) | Dos modos | Dos interruptores casi iguales confunden; D4 conserva «apagado por omisión» y el enlace | 018 |
| Contenido del libro | Datos tipados en `src/textos/es-MX/libro/` + ejemplos en `corpus/libro/` con goldens | Markdown con un analizador | Cero dependencias nuevas; la regla de textos en catálogo ya existe; los ejemplos usan el arnés del oráculo | 019 |
| Aprobación del PO | Estado por tema + **huella** SHA-256 del contenido; el sitio publicado filtra los borradores | Bloquear el merge de borradores | `main` siempre desplegable y verde; un texto cambiado después de aprobarse se detecta solo | 019 |
| Botón en contexto | Árbol sintáctico de CodeMirror (`IfStatement`, `WhileStatement`, `DoStatement`, `ForStatement`, `SwitchStatement` de `@lezer/java`, **[verificado en diseño]**) | Nodos de `VistaPrograma` | Funciona también en edición y con errores de compilación; solo navega, no juzga Java | 019 |
| Peso del libro | Fragmentos diferidos por unidad, precacheados, límite propio de 80 KB gzip | Todo en el fragmento principal | La primera interacción no espera al libro; REQ-PLAT-003 cuenta todo lo precacheado | 019 |

## 1. Arquitectura

### 1.1 Capas (ADR 001, sin cambios en la matriz)

```
 motor        revision/ (nuevo) ──► trampas en VistaPrograma        interprete/ ──► Paso.hechos, piezas de la condición
 textos       es-MX/revisor.ts · es-MX/reto.ts · es-MX/libro/* (tipos de motor/vista)
 presentacion revisor.ts · reto.ts (+ reto/familias.ts, reto/afirmaciones.ts) · libro.ts      (puras, sin DOM)
 interfaz     componentes/{RobotRevisor,NotaDelRevisor,PreguntaReto,InterruptorReto}.tsx · libro/* (diferido)
              editor/{marcas-de-trampa,accesos-a-temas}.ts · estado/reductor.ts (ajustes, reto, pantalla)
```

`motor/vista.ts` exporta los tipos nuevos (`Trampa`, `CodigoTrampa`, `DatosPorCodigoTrampa`, `HechoDelPaso`, `PiezaDeCondicion`, `FormaDeCondicion`, `EstructuraDeSwitch`); nadie fuera del motor importa `revision/`. El protocolo del trabajador **no cambia**: las trampas y la estructura viajan dentro de `vista` en el mensaje `compilado`, y los hechos dentro de cada `Paso`.

### 1.2 Contratos nuevos del motor

```ts
// src/motor/revision/trampas.ts (R1)
export type CodigoTrampa =
  | 'punto-y-coma-tras-condicion' | 'comparacion-de-textos-con-igual' | 'case-que-sigue-de-largo'
  | 'renglon-pendiente-del-scanner' | 'division-entera-a-decimal';
export interface DatosPorCodigoTrampa {
  'punto-y-coma-tras-condicion': { construccion: 'if' | 'while' | 'for'; nodoCondicion: number; nodoSiguiente: number | null };
  'comparacion-de-textos-con-igual': { operador: '==' | '!='; texto: string; nodo: number; punto: number };
  'case-que-sigue-de-largo': { etiqueta: string | null; siguiente: string | null; nodoSiguienteEtiqueta: number }; // null = default
  'renglon-pendiente-del-scanner': { lectura: 'nextInt' | 'nextDouble' | 'nextBoolean' | 'next'; lineaDeLaLectura: number; nodo: number; punto: number };
  'division-entera-a-decimal': { texto: string; tipo: 'int' | 'long'; nodo: number; puntos: { izquierda: number; derecha: number; division: number; conversion: number } };
}
export type Trampa = { [C in CodigoTrampa]: { codigo: C; linea: number; rango: Rango; datos: DatosPorCodigoTrampa[C] } }[CodigoTrampa];
export function revisar(programa: ProgramaIr): readonly Trampa[];   // determinista, ordenadas por posición en el texto

// src/motor/ir/vista-programa.ts
interface VistaPrograma {
  /* …lo de hoy… */
  readonly trampas?: readonly Trampa[];                 // R1; opcional en el TIPO como `ramasDeIf`
  readonly switches?: readonly EstructuraDeSwitch[];    // R1 la calcula (trampa 3); R2 la usa
}
interface RamasDeIf { /* nodo, entonces, sino de hoy */ readonly sinoEsIf: boolean; readonly enEscalera: boolean; readonly entoncesTermina: Terminacion } // R2
type Terminacion = 'normal' | 'abrupta' | 'depende';   // abrupta: termina SIEMPRE en break/continue/return; depende: no se sabe sin ejecutar
interface EstructuraDeSwitch { readonly nodo: number; readonly grupos: readonly GrupoDeSwitch[] }
interface GrupoDeSwitch { readonly etiquetas: readonly { nodo: number; texto: string | null }[]; readonly vacio: boolean; readonly termina: Terminacion; readonly lineaDelFinal: number | null }

// src/motor/traza/paso.ts — un hecho por comparación evaluada (R1: textos; R2: números)
interface Paso { /* … */ readonly hechos?: readonly HechoDelPaso[] }
type HechoDelPaso =
  | { readonly punto: number; readonly tipo: 'mismo-texto'; readonly mismoTexto: boolean }                         // ==/!= entre String: StringJava.equals
  | { readonly punto: number; readonly tipo: 'relacion'; readonly relacion: 'menor' | 'igual' | 'mayor' | 'sin-orden' }; // numérica, con promociones de Java; NaN → sin-orden

// src/motor/traza/explicacion.ts — R2: condicion-if y condicion-ciclo agregan
readonly piezas: readonly PiezaDeCondicion[];
readonly forma: FormaDeCondicion;
interface PiezaDeCondicion { texto: string; sustituida: string | null; resultado: boolean | null; punto: number;   // null: Java no la revisó (cortocircuito)
                             clase: 'comparacion' | 'variable' | 'llamada' | 'constante'; operador?: '<' | '<=' | '>' | '>=' | '==' | '!=' }
type FormaDeCondicion = { tipo: 'pieza'; indice: number } | { tipo: 'no'; operando: FormaDeCondicion }
                      | { tipo: 'y' | 'o'; izquierda: FormaDeCondicion; derecha: FormaDeCondicion };
```

La forma se calcula una vez en `generar-ir.ts` (`CondicionIr.forma`, con los puntos del plan); `explicar.ts` la llena en cada paso con el registro (`sustituida` con la misma función que ya arma la sustitución completa). Los hechos los anota `interprete/expresiones.ts` al evaluar una `ComparacionIr`, con las mismas operaciones que deciden el resultado. **[verificado en diseño]** `Paso.valores` ya trae el valor de cada punto del plan (`sentencias.ts:99`) y la IR **no** pliega constantes numéricas (`generar-ir.ts:462`: solo las de texto), así que `1 / 2 * base` llega como `AritmeticaIr` y la trampa 5 la ve.

## 2. Robot revisor (R1)

### 2.1 La pasada

`compilar()` llama a `revisar(ir)` solo cuando el resultado es `ok` (nunca con error, aviso o arranque inválido: REQ-REV-003) y guarda el resultado en `vista.trampas`. Es lineal sobre la IR, no ejecuta nada y no cambia `ProgramaCompilado`: la traza es idéntica con y sin revisor (prueba de propiedad).

### 2.2 Las cinco reglas exactas

| # | Regla sobre la IR | Por qué no hay falso positivo | Casi-trampas que la prueba exige NO reportar |
|---|---|---|---|
| 1 | `IfIr.entonces`, `WhileIr.cuerpo` o `ForIr.cuerpo` es `VaciaIr` | El hecho «ese `;` es todo el cuerpo» es la definición de JLS 14.6; un `{ }` es `BloqueIr` y un `do-while` es `DoWhileIr` | `if (c) { }`, `while (c) {}`, `do { … } while (c);` |
| 2 | `ComparacionIr` con `tipoOperandos = 'referencia'` y ambos operandos de tipo `String` | Compara identidad siempre (JLS 15.21.3); el aviso no dice que dará `false` | `s.equals(t)`, `c == 'a'`, `n == 0` |
| 3 | En `EstructuraDeSwitch`, un grupo no vacío, seguido de otro grupo, cuya última sentencia es una sentencia simple (declaración, expresión, impresión, vacía) → `termina = 'normal'` | Una sentencia simple completa normalmente (JLS 14.22); si la última es un `if`, ciclo, bloque o `switch` (`depende`), **no** se avisa | `case 1: case 2:` (grupo vacío), último grupo, grupo que termina en `break`/`return`/`continue`, grupo que termina en un `if` |
| 4 | En una misma lista de sentencias, una sentencia simple cuya **última** llamada de `Scanner` (orden del plan) es `next`, `nextInt`, `nextDouble` o `nextBoolean`, seguida —sin ninguna llamada de `Scanner` en las sentencias intermedias, a ninguna profundidad— de una sentencia simple cuya **primera** llamada de `Scanner` es `nextLine()` y su valor se usa (inicializador, lado derecho, argumento, operando) | Todo camino de una a otra pasa sin otra lectura: el `nextLine()` lee el resto del renglón de ese token (`Scanner`, §4.6 de `visualizador-java`); el aviso dice «lo que quedó», no «un texto vacío» | `sc.nextLine();` como sentencia (el arreglo clásico), lecturas en ramas o ciclos distintos, `nextLine()` como primera lectura (`u3-saludo-con-scanner`) |
| 5 | `ConversionIr { tipo: 'double', de: 'int' \| 'long' }` cuyo operando, bajando solo por `AritmeticaIr` `int`/`long` y `MenosIr`, contiene una `AritmeticaIr` con `/` | La división entre enteros trunca antes de la conversión (JLS 15.17.2, 5.1.2); el aviso dice «si no es exacta, se pierden los decimales» | `(double) a / b` (la conversión es de `a`), `int m = n / 2`, `"x" + a / b`, `suma / 5` con `suma` `double` |

**[verificado en diseño]** Revisión a mano de los 60 archivos del corpus curricular con esas reglas: solo `u5-switch-sin-break-fallthrough` da trampas (regla 3, `case 1` l. 6, `case 2` l. 8, `case 3` l. 10; `default` es el último grupo); casi-trampas reales del corpus: `u4-division-entera-y-modulo` (`int resultado1 = 10 / 3`), `u4-cociente-residuo` (`println(dividendo / divisor)`), `t12-conversiones-y-casts` (`(double) a / b`), `u6-acumulador-promedio-calificaciones` (`suma` es `double`), `u6-pedir-numero-positivo` y `t04` (`} while (…);`), todos los `switch` de MaquinaSnacks, `u5-switch-menu-calculadora`, `u7`, `t04` y `t20` (cada grupo termina en `break` o `return`).

### 2.3 Confirmación en la ejecución (REQ-REV-006)

`derivarRevisor` mira el último paso aplicado; la nota sale solo si el dato del motor está en la traza:

| Trampa | Se ve cuando… (datos del motor) | La nota cita |
|---|---|---|
| 1 `if` | el paso de `nodoCondicion` dio `false` y el siguiente paso aplicado es `nodoSiguiente` | «La condición dio `false` y aun así se ejecuta esta línea» |
| 1 `while`/`for` | el fin es `limite-pasos` con diagnóstico de ese ciclo | la evidencia del diagnóstico de 3.3 (`contador` siempre valió 1) |
| 2 | `hechos[punto]` es `mismo-texto: true` y `valores[punto]` es `false` | los dos textos (de `valores`) y el `false` |
| 3 | paso `caida-switch` hacia `nodoSiguienteEtiqueta` | la etiqueta de la que viene y a la que entra |
| 4 | paso de `nodo` con `valores[punto]` (el `String` leído) | el texto leído, escapado como Java (`""`, `" Juan"`) |
| 5 | paso de `nodo` con los cuatro puntos con valor | `25 / 3` → `8` → `8.0` (texto armado con los valores del plan; `double` con `doubleATexto`) |

### 2.4 Explicar los problemas que ya existen (REQ-REV-001)

`src/textos/es-MX/revisor.ts` agrega `familiaDelProblema: { [K in CodigoProblema]: FamiliaDeProblema }` y `familiaDelAviso: { [K in CodigoNoSoportado]: … }` (exhaustivas por tipo: un código nuevo sin familia no compila) y un `porQue[familia]()` de una o dos frases. Familias: `sintaxis`, `nombres`, `tipos`, `valor-sin-asignar`, `inalcanzable`, `llamadas`, `switch`, `estructura`, `limites-del-visualizador`, `arranque`, `fuera-del-alcance`. El texto del problema sigue siendo el de `textoDelProblema` (tarea 1.28); el revisor solo agrega el porqué y, desde R3, el enlace a su tema.

### 2.5 Cómo se mide «cero falsos positivos» (REQ-REV-004, REQ-REV-005, CR1–CR2)

1. **Reglas que solo afirman hechos del lenguaje** (§2.2), cada una con su argumento de JLS en su ADR y en el comentario del módulo.
2. **Corpus curricular etiquetado:** `corpus/trampas-esperadas.json` mapea cada `.java` de `curso/`, `experimentos/tipicos/`, `experimentos/ejercicios-del-po/` y `experimentos/trampas/` a `{ codigo, linea }[]`. `pruebas/revisor/trampas-del-corpus.test.ts` exige igualdad exacta y que **todo** `.java` de esas carpetas tenga entrada (un programa nuevo sin etiquetar falla). El PO revisa la lista en la verificación de R1.
3. **Muestras con el oráculo:** `corpus/experimentos/trampas/` con ≥ 3 positivas por familia (variantes de sintaxis: con y sin llaves, `!=`, `next()` además de `nextInt()`, `long`, división dentro de paréntesis) y ≥ 2 casi-trampas por familia, cada una compilada y ejecutada por el JDK (goldens) con su entrada; las positivas que la entrada hace visibles sirven para la confirmación (CR3).
4. **Robustez:** `revisar` corre sobre cada mutante que javac acepta en `corpus/mutantes/veredictos.jsonl` (campo `fuente`) y sobre todo el corpus, sin lanzar ni variar entre corridas.

### 2.6 Pantalla (REQ-REV-007, REQ-VIS-014)

- **Paso 0:** debajo del globo del programador, `NotaDelRevisor` («Revisé tu programa: encontré 3 trampas, en las líneas 6, 8 y 10» · «Ver explicación»), o «Revisé las 5 trampas que conozco y no encontré ninguna». Con `revisor=despues` en el enlace (PR-4) se omite.
- **Editor:** marca de canal ⚑ con título «Trampa» y subrayado punteado propio (distinto de ✖ error, ⓘ no disponible), clase `cm-trampa`, desde el `StateField` de resaltados de 4.4.
- **Durante la traza:** la nota de confirmación entra en la misma región `aria-live="polite"` del globo (una sola lectura por paso).
- **Error de compilación o aviso:** el robot del globo pasa a ser el revisor (accesorio lupa, ánimo preocupado) con `AvisoProblema` intacto y su porqué debajo.

## 3. Modo reto (R2)

### 3.1 Cuándo hay reto

`construirReto(siguiente, aplicados, vista)` solo devuelve algo si el **siguiente** paso tiene clave `condicion-if`, `condicion-ciclo`, `switch-elige-caso`, `switch-elige-defecto` o `switch-sin-coincidencia`. Como el reto se pregunta en el paso anterior, la pantalla no tiene que esconder nada: el resultado aún no está aplicado (la misma idea que D4, `design.md` §3.3 de `visualizador-java`). En Detallado (lote 6) se pregunta antes del primer micropaso de la condición.

### 3.2 Modelo: opción = veredicto + razón como afirmaciones

```ts
// src/presentacion/reto/afirmaciones.ts
type Veredicto = 'entra' | 'no-entra' | 'repite' | 'sale' | { readonly caso: string } | 'defecto' | 'ninguno';
type Afirmacion =
  | { tipo: 'veredicto'; veredicto: Veredicto }                        // vs control.resultado o la clave del switch
  | { tipo: 'pieza'; indice: number; resultado: boolean }              // vs piezas[indice].resultado
  | { tipo: 'pieza-sin-revisar'; indice: number }                      // vs piezas[indice].resultado === null
  | { tipo: 'como-la-revision-anterior'; pasoAnterior: number }        // vs el paso anterior del mismo nodo: mismo resultado
  | { tipo: 'variable-vale'; nombre: string; valor: string }           // vs lecturas del paso
  | { tipo: 'grupo-termina'; termina: 'abrupta' | 'normal' }           // vs EstructuraDeSwitch, confirmado por la traza
  | { tipo: 'regla'; regla: ReglaDeJava };                             // regla equivocada: siempre falsa
interface OpcionReto { readonly familia: FamiliaDeOpcion; readonly veredicto: Veredicto; readonly afirmaciones: readonly Afirmacion[] }
interface RetoVista { readonly nodo: number; readonly construccion: 'if' | 'else-if' | 'while' | 'for' | 'do-while' | 'switch';
                      readonly opciones: readonly [OpcionReto, OpcionReto, OpcionReto]; readonly correcta: 0 | 1 | 2 }
export function verificar(afirmacion: Afirmacion, contexto: ContextoDeReto): boolean;   // solo LEE datos del motor
```

Los textos (`src/textos/es-MX/reto.ts`) reciben **solo** los datos de las afirmaciones (piezas, sustituciones, valores escritos por el motor): una opción no puede citar un valor que no esté en la traza. Un distractor solo puede equivocarse en el veredicto, en el `true`/`false` de una pieza que Java **sí** revisó, en atribuir a esta revisión los datos de una anterior, o en una regla de Java; una afirmación `pieza` nunca se genera para una pieza con `resultado: null` (REQ-RETO-006). Cada `ReglaDeJava` (falsa) tiene en `corpus/experimentos/reto/` un programa cuyo golden muestra la regla verdadera (REQ-DIFF-009): p. ej. `o-revisa-el-segundo.java` (`int x = 0; boolean r = 1 < 0 || x++ == 0; System.out.println(x);` imprime `1`).

### 3.3 Catálogo de familias (v1; textos para revisión del PO)

| Familia | Aplica cuando (datos) | Ejemplo de opción | Refutación (dato del motor o regla) | Error #  |
|---|---|---|---|---|
| **correcta** | siempre | «Es `false`: `2 < 1` es false y `2 > 3` también; no entra» | — | — |
| *Lectura* (opción 2, veredicto contrario) | | | | |
| frontera | pieza `<`/`>` con `relacion = igual`, o `<=`/`>=` con `igual` | «Es `true`: `10 < 10` incluye al 10, porque valen lo mismo» | `<` es estricto; para incluirlo, `<=` | #6 |
| revision-anterior | el mismo nodo se evaluó antes con el resultado contrario | «Es `true`: `5 <= 5`, como en la revisión anterior» | «Desde entonces el `i++` de la línea 8 cambió `i` a 6» (último `Cambio` de la traza) | — |
| valor-anterior | pieza que es una variable `boolean` con un `Cambio` previo | «Es `false`: `seEncontroNegativo` vale `false`, como al principio» | «En la línea 12 cambió a `true`» | #18 |
| textos-iguales | `==` entre `String` con `mismo-texto: true` y `false` | «Es `true`: los dos textos dicen «si»» | `==` compara si es el mismo objeto; usar `equals` | #4 |
| simbolo-al-reves | pieza `<`, `<=`, `>`, `>=` con `relacion` menor o mayor | «Es `true`: `<` pregunta si `dinero` es mayor que `total`, y 50 es mayor que 36» | «`<` se lee "menor que": `50 < 36` es false» | — |
| pieza-volteada | siempre (último recurso de la opción 2) | «Es `true`: `50 < 36` es true; entra» | la sustitución del motor | — |
| *Concepto* (opción 3) | | | | |
| o-se-detiene-con-false | `\|\|` con la pieza izquierda `false` | «Es `false` desde `2 < 1`: con `\|\|` Java ya no revisa el otro lado» | la pieza derecha SÍ se revisó | #15 |
| y-revisa-los-dos | `&&` con la izquierda `false` (derecha sin revisar) | «Es `false`: Java revisa los dos lados y con `&&` basta que uno sea false» | Java ni siquiera revisó `tieneIne` (pieza sin revisar) | #15 |
| o-necesita-los-dos / y-basta-uno | `\|\|` / `&&` | «con `\|\|` tendrían que ser true los dos» | regla | — |
| escalera-revisa-todas | `if` `true` con `sinoEsIf` | «Entra y después revisa también `calificacion >= 90`» | la escalera se salta al resto | — |
| primera-revision | `while`/`for`, revisión 1, `false` | «Entra una vez y luego sale» | revisa ANTES de entrar | — |
| una-vuelta-mas | ciclo `false` (revisión > 1) | «Es `false`, pero el `for` da una vuelta más antes de salir» | regla | #6 |
| do-while-una-vuelta | `do-while` `true` | «Es `true`, pero un `do-while` solo da una vuelta» | regla | — |
| dos-bloques | `if` con `else` | «Ejecuta los dos: primero el `if` y luego el `else`» | regla | — |
| return-no-termina | `if` `true` con `entoncesTermina = abrupta` por `return` | «Entra y, después del `return`, sigue en la línea siguiente» | `return` termina `main` | — |
| if-como-ciclo / if-espera | todo `if` (`true` / `false`) — **siempre aplica** | «…y al terminar el bloque vuelve a revisar la condición» / «el programa espera aquí a que sea `true`» | un `if` se revisa una vez (el «if vigilante», Pea 1986) | — |
| ciclo-no-revisa | todo ciclo `true` — **siempre aplica** | «Repite, y ya no vuelve a revisar `i <= 5`» | se revisa antes de cada vuelta | — |
| switch: defecto / ninguno / otra-etiqueta | etiquetas de `EstructuraDeSwitch` | «Salta al `default`» | `codigo` vale "A1" y coincide | — |
| switch: sigue-de-largo / se-detiene | grupo elegido `abrupta` / `normal` | «…y sigue de largo con los demás» / «…y ahí termina el `switch`» | `break` en la línea 28 / la caída de la traza | #11 |

### 3.4 Selección determinista

1. **Opción 1 — correcta:** el veredicto del motor + las piezas que deciden (`||` verdadero: la primera pieza `true`; `||` falso: todas; `&&` falso: la primera `false` y las demás «no revisadas»; `&&` verdadero: todas; `!`: la interna).
2. **Opción 2 — veredicto contrario** con la primera familia de *lectura* que aplique: frontera › revision-anterior › valor-anterior › textos-iguales › simbolo-al-reves › pieza-volteada (siempre aplica). En `switch`: defecto (o ninguno) › otra-etiqueta.
3. **Opción 3 — concepto:** la familia de *concepto* específica de la forma (cortocircuito, `||`/`&&`, escalera, primera revisión, `return`, `do-while`, dos bloques, sigue-de-largo/se-detiene) y, si no hay, la universal de su construcción (if-como-ciclo / if-espera, ciclo-no-revisa / una-vuelta-mas). **Siempre existe una**: la tercera opción nunca falta ni es relleno. Si varias aplican, rota por `(nodo + revisión) mod n` para no repetir la misma en cada vuelta.
4. **Defensa en profundidad:** cada candidata pasa por `verificar`; si una distractora resultara verdadera o igual a otra, se descarta y se toma la siguiente de su lista.
5. **Orden en pantalla:** la correcta va en la posición `(nodo × 7 + revisión) mod 3`; reproducible para el docente que repite la clase.

### 3.5 Ejemplos

**MaquinaSnacks, entrada `a1 2 50`** (`corpus/experimentos/ejercicios-del-po/maquina-snacks-a1-2-50.java`) — cuatro retos:

| Línea | Datos del motor | Correcta | Opción 2 (lectura) | Opción 3 (concepto) |
|---|---|---|---|---|
| 24 `switch (codigo)` | `codigo` = "A1"; grupo `"A1"` termina en `break` (l. 28) | Salta al `case "A1"`: `codigo` vale "A1" | Salta al `default`: ningún `case` coincide | Salta al `case "A1"` y sigue de largo con los demás (parcial) |
| 53 `cantidad < 1 \|\| cantidad > 3` | `2 < 1` false, `2 > 3` false → false; sin `else` | Es `false`: los dos lados son false; no entra | Es `true`: `2 > 3` es true; entra | Es `false` desde `2 < 1`: con `\|\|` ya no revisa el otro lado (parcial) |
| 66 `dinero < 1 \|\| dinero > 200` | `50 < 1` false, `50 > 200` false → false | Es `false`: los dos lados son false; no entra | Es `true`: `50 > 200` es true; entra | Es `false`: con `\|\|` tendrían que ser true los dos (parcial; rota) |
| 72 `dinero < total` | `50 < 36` false, relación `mayor`; con `else` | Es `false`: `50 < 36` es false; se va al `else` | Es `true`: `<` pregunta si `dinero` es mayor que `total`, y 50 es mayor que 36 | Ejecuta los dos: primero el `if` y luego el `else` |

Con `b2 3 40` la línea 72 es `40 < 66` → `true` (relación `menor`): la opción 2 dice «Es `false`: `<` pregunta si `dinero` es mayor que `total`, y 40 no es mayor que 66». Con `a2 5` la línea 53 es `true` por `5 > 3`; la opción 3 es «Entra y, después del `return`, sigue en la línea 59» (`return-no-termina`).

**Corpus curricular:**

| Programa (paso) | Correcta | Opción 2 | Opción 3 |
|---|---|---|---|
| `u6-error-por-uno`, tercer `for`, `i` = 10 | Es `false`: `10 < 10`; sale | frontera: «`10 < 10` incluye al 10» | una-vuelta-mas |
| `u6-suma-1-a-n` (entrada 5), `i` = 6 | Es `false`: `6 <= 5`; sale | revision-anterior: «`5 <= 5`, como en la revisión anterior» (refuta con el `i++` de la línea 8) | una-vuelta-mas |
| `u6-prediccion-while-no-ejecuta`, revisión 1 | Es `false`: `8 <= 5`; no entra ni una vez | simbolo-al-reves | primera-revision: «entra una vez y luego sale» |
| `u5-escalera-else-if-orden-incorrecto` | Es `true`: `95 >= 70`; entra y se salta el `else if` | simbolo-al-reves | escalera-revisa-todas (parcial) |
| `u5-switch-sin-break-fallthrough` | Salta al `case 2` | Salta al `default` | se-detiene: «…y al terminar sus sentencias sale del `switch`» (parcial; la traza cae al `case 3`) |
| `u6-bandera-numero-negativo`, `if (seEncontroNegativo)` | Es `true`; entra | valor-anterior: «vale `false`, como al principio» (refuta con el cambio de la línea 12) | dos-bloques |

### 3.6 Estado y flujo

`EstadoApp` agrega `ajustes: { reto: boolean; revisorAlInicio: boolean }` y `reto: { respuestas: ReadonlyMap<number, 0 | 1 | 2>; silenciados: readonly { nodoCiclo: number; desdePaso: number }[] }` (se vacía en `visualizar`). Acciones: `alternar-reto`, `responder-reto { paso, opcion }` (registra y avanza a ese paso), `silenciar-ciclo { nodoCiclo, paso }`. Con un reto pendiente, `siguiente` y el tic de la reproducción no avanzan (la reproducción se pausa). Un ciclo silenciado deja de preguntar hasta que la traza aplica una revisión `false` de ese nodo después de `desdePaso` (lo deriva presentación recorriendo los pasos). `derivarModeloVista` agrega `reto: RetoVista | null` y `retroalimentacion` del paso actual si ya se contestó.

```mermaid
sequenceDiagram
  actor A as Alumno o grupo
  participant UI as Visualizador (contenedor)
  participant T as Traza
  participant P as presentacion/reto.ts
  participant R as reductor
  A->>UI: «Siguiente» en el paso n
  UI->>T: estadoEn(n) y el paso n+1 (ya calculado por el motor)
  UI->>P: construirReto(paso n+1, aplicados, vista)
  P-->>UI: RetoVista: 3 opciones, correcta (afirmaciones verificadas)
  UI-->>A: pregunta y opciones 1·2·3 en el globo; «Siguiente» se reemplaza; foco en la opción 1
  A->>UI: tecla 2
  UI->>R: responder-reto {paso: n+1, opcion: 2}
  R-->>UI: paso = n+1, respuestas[n+1] = 2
  UI->>P: retroalimentacion(reto, 2): acierto | parcial | error + refutación
  UI-->>A: resultado real, cadena de sustitución, ✔/✖ con palabra y por qué (aria-live polite)
```

### 3.7 Pantalla y accesibilidad (REQ-RETO-009)

`PreguntaReto` vive en el globo (zona de explicación; no suma zonas): la pregunta («¿Qué pasa en la línea 72?»), tres botones con número visible y `aria-keyshortcuts="1"`/`"2"`/`"3"`, «Ya entendí este ciclo» en los ciclos; al contestar, la retroalimentación con ✔ «¡Eso es!», ◐ «Casi» o ✖ «No es esa» más el porqué. `InterruptorReto` en la barra de controles (`role="switch"`). En proyector, las opciones van apiladas a lo ancho del globo con el tamaño del modo; se mide a 1024×768 y 1280×720.

## 4. Robot explicador: el libro (R3)

### 4.1 Modelo de contenido

```ts
// src/textos/es-MX/libro/tipos.ts
type IdTema = 'u5-que-es-una-decision' | 'u6-for' | /* … unión cerrada de §4.2 … */;
interface Tema {
  readonly id: IdTema; readonly unidad: 3 | 4 | 5 | 6 | 7; readonly oleada: 1 | 2; readonly titulo: string;
  readonly estado: 'borrador' | 'aprobado'; readonly aprobacion?: { readonly fecha: string; readonly huella: string };
  readonly idea: readonly Bloque[]; readonly comoSeEscribe: readonly Bloque[]; readonly ejemplos: readonly IdEjemplo[];
  readonly erroresTipicos: readonly Bloque[]; readonly resumen: readonly string[]; readonly relacionados?: readonly IdTema[];
}
type Bloque = { tipo: 'parrafo'; texto: string } | { tipo: 'lista'; elementos: readonly string[] }
            | { tipo: 'forma'; texto: string }      // la forma general (`for (inicio; condición; actualización)`): no es un programa ni tiene salida
            | { tipo: 'nota'; texto: string };
```

Reglas: ≤ 700 palabras por tema sin contar ejemplos; código entre comillas invertidas como en el resto del catálogo (`FraseConCodigo`); **ninguna salida de consola escrita en el texto**: lo que imprime un programa solo se muestra desde un ejemplo y su golden.

### 4.2 Temas (lista cerrada; PR-5)

| U | Temas (id sin prefijo de unidad) | Oleada |
|---|---|---|
| U3 | programa-y-main · variables-y-tipos · asignacion · salida (`print`, `println`, `printf`) · entrada-con-scanner · constantes | 2 |
| U4 | operadores-aritmeticos · division-entera-y-modulo · precedencia · conversiones · comparaciones · operadores-logicos · math-y-random | 2 |
| U4 | **incremento-y-decremento** (`++`, `--`, `+=`, `-=`) | 1 |
| U5 | **que-es-una-decision** · **if-else** · **else-if** · **decisiones-anidadas** · **switch** · **comparar-textos** | 1 |
| U6 | **que-es-un-ciclo** · **while** · **do-while** · **for** · **ciclos-incrementales-y-decrementales** · **contador-acumulador-bandera** · **ciclos-anidados** · **break-y-continue** · **error-por-uno-y-ciclo-infinito** | 1 |
| U7 | prueba-de-escritorio · depurar-con-el-visualizador | 2 |

31 temas: 16 en la oleada 1 y 15 en la 2.

### 4.3 Ejemplos y oráculo (REQ-LIBRO-003, REQ-DIFF-009)

`corpus/libro/<id-tema>/<ejemplo>.java` + `.entrada.txt` (si lee) + `.meta.json` (`titulo`, `queObservar`, `esperado: 'ejecuta' | 'error-compilacion'`). `herramientas/oraculo/generar-goldens.ts` agrega `libro` a las carpetas que recorre (hoy `curso` y `experimentos`, **[verificado en diseño]** línea 145). `pruebas/diferencial/libro.test.ts`: los que ejecutan, byte a byte contra `.salida`/`.errores`/`.combinada`; los de error, veredicto y línea iguales a `.oraculo.json`. La pantalla toma la salida del `.salida` importado como texto: el libro no puede mostrar una salida que el JDK no produjo.

### 4.4 Aprobación del PO (REQ-LIBRO-006)

```mermaid
sequenceDiagram
  participant C as Claude (sdd-apply)
  participant O as Oráculo (JDK 17.0.18)
  participant PO as PO (docente)
  participant CI as npm test y CI
  C->>C: escribe el tema (estado borrador) y sus ejemplos en corpus/libro/
  C->>O: npm run oraculo:goldens
  O-->>C: goldens de cada ejemplo
  C->>CI: estructura, palabras, ejemplos = goldens; el borrador NO entra al índice publicado
  C->>PO: lo presenta (npm run dev: marca «Borrador»; o el texto en el chat)
  PO-->>C: observaciones → correcciones
  PO-->>C: «Apruebo el tema X» (explícito, en el chat)
  C->>C: npm run libro:huella -- X → estado aprobado + {fecha, huella}
  CI->>CI: huella recalculada = guardada → el tema se publica
  Note over C,CI: cambiar después un texto o un ejemplo rompe la huella: vuelve a borrador o se re-aprueba
```

La huella es SHA-256 del JSON canónico del tema (sin `estado` ni `aprobacion`) más los bytes de sus ejemplos (`.java`, `.entrada.txt`, `.meta.json`). La calculan `pruebas/libro/aprobaciones.test.ts` (Node `crypto`) y `herramientas/libro-huella.ts`. La interfaz publicada pide a presentación los temas con `mostrarBorradores = import.meta.env.DEV`; marcar «aprobado» sin el visto bueno explícito del PO está prohibido como lo está un commit sin confirmación (ADR 019).

### 4.5 Tema en contexto (REQ-LIBRO-005)

| Desde | Cómo se elige el tema |
|---|---|
| Editor (`accesos-a-temas.ts`) | `syntaxTree()` de CodeMirror: `IfStatement` → `if-else` si tiene `else` y su `else` no es otro `if`, `else-if` si es parte de una escalera, `que-es-una-decision` si no tiene `else`; `SwitchStatement` → `switch`; `WhileStatement` → `while`; `DoStatement` → `do-while`; `ForStatement` → `for` (+ `ciclos-incrementales-y-decrementales` si la actualización contiene `--` o `-=`). Marca de canal 📖 con nombre accesible; `Alt+F1` abre el de la línea del cursor (aviso en la ayuda de atajos) |
| Globo del robot | por la clave del paso (`condicion-if` con `tieneSino`, `condicion-ciclo` con `ciclo`, `switch-*`) |
| Revisor | familia de problema → tema (`tipos` → `conversiones`, `valor-sin-asignar` → `variables-y-tipos`…); trampa → tema (`comparacion-de-textos-con-igual` → `comparar-textos`…) |
| Reto | la retroalimentación enlaza el tema de la construcción y, si la familia lo tiene, el de su error (`frontera` → `error-por-uno-y-ciclo-infinito`) |

Un enlace a un tema aún en borrador no se muestra en el sitio publicado (prueba de cobertura CR7 sobre los temas publicados).

### 4.6 Pantalla

`EstadoApp.pantalla: 'visualizador' | 'libro'` con `temaAbierto`; el visualizador no se desmonta (la `Traza` vive fuera de React y el editor conserva su estado), así que volver deja todo igual. `PantallaLibro` (índice por unidad, tema, anterior/siguiente, «Volver al visualizador») y `EjemploDelLibro` (código de solo lectura con el resaltado de CodeMirror, salida del golden, «Ábrelo en el visualizador»). Abrir un ejemplo usa la acción `cargar-programa { codigo, entradaPreparada }` —la misma que necesita la galería (5.2); la crea quien llegue primero— y guarda el programa anterior en memoria para «Volver a mi programa».

### 4.7 Carga aparte y peso (REQ-LIBRO-007)

El índice (ids, títulos, estado: ≈ 2 KB) va en el fragmento principal porque lo usan los accesos en contexto; cada unidad es un `import()` diferido (`textos/es-MX/libro/u5.ts` y sus ejemplos con `import.meta.glob(…, { query: '?raw' })`), precacheado por el *service worker* (ADR 014).

| Pieza | Crudo (estim.) | gzip (estim.) |
|---|---|---|
| Textos de 31 temas (≤ 700 palabras ≈ 4.5 KB c/u) | ≈ 140 KB | ≈ 45 KB (prosa ≈ 3:1) |
| ≈ 60 ejemplos (código, entrada, meta y salida ≈ 1.2 KB c/u) | ≈ 70 KB | ≈ 15 KB |
| Componentes del libro | ≈ 15 KB | ≈ 4 KB |
| **Libro** | ≈ 225 KB | **≈ 64 KB** (rango 55–75; límite 80) |
| Revisor + reto (motor, presentación, textos, componentes) | ≈ 50 KB | ≈ 14 KB |

Total previsto ≈ 319 + 64 + 14 ≈ **397 KB** de 500. `herramientas/presupuesto-tamano.ts` (hito 3) agrega el límite por fragmento del libro; se mide al cerrar cada hito.

## 5. Personajes (REQ-VIS-014)

`Robot.tsx` recibe `personaje: 'programador' | 'revisor' | 'explicador'` además del ánimo: misma cabeza y cuerpo, accesorio con forma propia (programador: ninguno, el de hoy; revisor: lupa en la mano; explicador: libro abierto). Nombre visible y accesible desde `textos/es-MX/robot.ts` («Robot revisor: está preocupado…»). Un solo robot habla en el globo; el revisor entra como nota con su mini retrato. Sin animación nueva fuera de `prefers-reduced-motion`.

## 6. Pruebas

| Capa | Qué | Dónde |
|---|---|---|
| Unidad (motor) | cada regla con positivas y casi-trampas; hechos `mismo-texto` y `relacion` (NaN, `-0.0`, `char`, `long`); piezas y forma con cortocircuito | `src/motor/revision/*.test.ts`, `interprete/expresiones.test.ts`, `interprete/explicar.test.ts` |
| Corpus | etiquetas exactas (CR1); muestras (CR2); traza idéntica con y sin revisor | `pruebas/revisor/` |
| Diferencial | muestras de trampas y del reto, ejemplos del libro, contra goldens | `pruebas/diferencial/{trampas,reto,libro}.test.ts` |
| Propiedad | reto en TODOS los pasos de condición del corpus ejecutable (CR4): 3 opciones, 1 verdadera, distractores falsos, sin datos inventados; `relacion` coherente con el resultado de su operador | `pruebas/propiedades/reto-del-corpus.test.ts` |
| Textos | familias exhaustivas; sin marcadores; opciones ≤ 140 caracteres; ≤ 700 palabras por tema; sin «incorrecto» | `src/textos/es-MX/*.test.ts` |
| Aprobación | huella vigente de cada aprobado; borradores fuera del índice publicado | `pruebas/libro/aprobaciones.test.ts` |
| Componentes | nota del revisor, marca del editor, pregunta y retroalimentación, interruptor, libro | `src/interfaz/**.test.tsx` |
| E2E ×3 motores + axe | revisor (paso 0, marca, confirmación); reto MaquinaSnacks con teclado y proyector (CR5); libro sin red, en contexto y abrir ejemplo | `pruebas/e2e/{revisor,reto,libro}.spec.ts` |
| Rendimiento | C11 con hechos y piezas (CR9); peso por fragmento | `pruebas/rendimiento/`, `npm run presupuesto` |

## 7. Archivos

| Ruta | Acción |
|---|---|
| `src/motor/revision/{trampas,revisar,punto-y-coma,comparacion-de-textos,case-que-sigue,renglon-pendiente,division-entera,estructura-de-switch}.ts` | Crear |
| `src/motor/{compilador.ts,vista.ts}`, `ir/{ir,generar-ir,vista-programa}.ts`, `interprete/{expresiones,explicar}.ts`, `traza/{paso,explicacion}.ts` | Modificar |
| `src/presentacion/{revisor,reto,libro}.ts`, `presentacion/reto/{afirmaciones,familias}.ts`, `presentacion/{modelo-vista,robot}.ts` | Crear / Modificar |
| `src/textos/es-MX/{revisor,reto}.ts`, `textos/es-MX/libro/{tipos,indice,u3,u4,u5,u6,u7}.ts`, `textos/es-MX/{robot,controles}.ts` | Crear / Modificar |
| `src/interfaz/componentes/{NotaDelRevisor,PreguntaReto,InterruptorReto,Robot,Explicacion}.tsx`, `interfaz/libro/{PantallaLibro,TemaDelLibro,EjemploDelLibro}.tsx`, `interfaz/editor/{marcas-de-trampa,accesos-a-temas,resaltados}.ts`, `interfaz/estado/reductor.ts`, `interfaz/contenedores/Visualizador.tsx`, `interfaz/estilos/aplicacion.css` | Crear / Modificar |
| `corpus/experimentos/{trampas,reto}/**`, `corpus/libro/**`, `corpus/trampas-esperadas.json` | Crear (goldens por el oráculo) |
| `herramientas/oraculo/generar-goldens.ts`, `herramientas/presupuesto-tamano.ts`, `herramientas/libro-huella.ts`, `package.json` (`libro:huella`) | Modificar / Crear |
| `pruebas/{revisor,libro}/**`, `pruebas/propiedades/reto-del-corpus.test.ts`, `pruebas/diferencial/{trampas,reto,libro}.test.ts`, `pruebas/e2e/{revisor,reto,libro}.spec.ts` | Crear |
| `docs/adr/017-revisor-de-trampas.md`, `018-modo-reto.md` (enmienda D4), `019-libro-de-temas.md` | Crear |

## 8. Hitos

| Hito | Contenido | Entrada | Salida |
|---|---|---|---|
| R1 Revisor | ADR 017; corpus de trampas y etiquetas; pasada y 5 reglas; hecho `mismo-texto`; textos y familias; presentación; personajes programador/revisor; marca del editor; E2E | Hito 3 publicado, PR #3 fusionado | CR1–CR3, CR8 (revisor); `sdd-verify` R1 |
| R2 Modo reto | ADR 018; piezas, forma y `relacion`; estructura de `if`/`switch` en la vista; muestras de reglas; afirmaciones, familias y constructor; propiedad del corpus; estado; pregunta e interruptor; enlace; E2E; rendimiento | R1 cerrado | CR4, CR5, CR8, CR9; `sdd-verify` R2 |
| R3 Libro + oleada 1 | ADR 019; modelo e índice; ejemplos y oráculo; huella; presentación; pantalla y carga; accesos en contexto; enlaces desde revisor y reto; peso; los 16 temas de la oleada 1 con revisión del PO | R2 cerrado (los borradores de la oleada 1 pueden escribirse en paralelo a R2) | CR6–CR8; `sdd-verify` R3 |
| R4 Libro, oleada 2 | solo contenido: los 15 temas de U3, U4 y U7 con revisión del PO | R3 cerrado | CR6, CR8; `sdd-verify` acotada |

## 9. Riesgos técnicos y preguntas abiertas

- **Preguntas del PO:** PR-1 a PR-5 de la propuesta. El diseño aplica las recomendaciones; si el PO elige otra, cambian: PR-1 → REQ-VIS-013 y la tarea R2.9; PR-2 → §3.2–3.4 y R2.5–R2.7 (B simplifica el catálogo a destinos; C agrega un segundo paso a `PreguntaReto`); PR-3 → `silenciados`; PR-4 → `revisorAlInicio`; PR-5 → la oleada de cada tema.
- **Técnica (no bloquea):** el accesorio del canal del editor junto al marcador ▶/▷ de 4.4 puede saturar la línea en proyector; se decide con el E2E de R1 (alternativa: un solo ícono combinado).
- **Técnica (no bloquea):** `relacion` de `char` frente a `int` usa la promoción binaria de Java (`'a' < 98`); se prueba con los valores de `t09-cadenas-y-caracteres`.
- **Conciliación con `visualizador-java`** (la hace el orquestador): 5.1 absorbida por R2 (PR-1); 5.4 lleva `reto` y `revisor` en el enlace; 5.6 cambia Sí/No por tres opciones; 5.2 comparte `cargar-programa`.
