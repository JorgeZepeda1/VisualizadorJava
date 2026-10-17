# Diseño técnico: Visualizador de Java paso a paso (`visualizador-java`)

> Fase `sdd-design` · 2026-09-25 · Rol: **Arquitecto de Software**; los flujos de pantalla, con el criterio del **Diseñador Pedagógico**. Fuente de verdad: `proposal.md` (D1–D7, P2, P3) y las correcciones vinculantes de `exploration.md` §4. Lo comprobado en esta fase contra Temurin 17.0.18 va marcado **[verificado en diseño]**. Cada decisión no trivial tiene su ADR en `docs/adr/` (alternativas y consecuencias); aquí solo va el porqué en una línea.
>
> **Tamaño:** la plantilla de la fase pide menos de 800 palabras, pero el orquestador pidió cerrar doce frentes con contratos y diagramas. Para compensar, el detalle de cada decisión vive en su ADR y este documento se queda con estructura, contratos, algoritmos y el orden de construcción.

## 0. Resumen y mapa de decisiones

El producto es un **núcleo puro** (`src/motor`: compila y ejecuta el subconjunto de Java y emite pasos como datos) rodeado de adaptadores: un **Web Worker** que lo ejecuta por rebanadas y una **interfaz React + CodeMirror 6** que guarda la traza y la navega sin volver a ejecutar nada. La fidelidad se sostiene con datos del JDK de referencia, generados por un **oráculo** (nunca escritos a mano), y con pruebas diferenciales byte a byte.

| ADR | Decisión | § |
|---|---|---|
| [001](../../../docs/adr/001-arquitectura-hexagonal-en-capas.md) | Cinco capas con guardas del compilador; `motor` sin E/S ni dependencias | 1 |
| [002](../../../docs/adr/002-identificadores-en-espanol.md) | Identificadores en español ASCII; nombres de la API de Java tal cual | 1.4 |
| [003](../../../docs/adr/003-analizador-sintactico-propio.md) | Descenso recursivo + Pratt a mano que **reconoce** lo no soportado | 2.3–2.6 |
| [004](../../../docs/adr/004-compilacion-en-pasadas-como-javac.md) | Cuatro pasadas en el orden de javac (más el arranque); se informa la primera que falla | 2.1 |
| [005](../../../docs/adr/005-interprete-con-generadores-por-sentencia.md) | Sentencias en generadores, expresiones directas, lectura con reintento | 3.2 |
| [006](../../../docs/adr/006-traza-por-deltas-y-puntos-de-control.md) | Traza por deltas reversibles con puntos de control; la guarda la interfaz | 3.4 |
| [007](../../../docs/adr/007-protocolo-del-trabajador-sin-memoria-compartida.md) | Un trabajador por ejecución, lotes por mensajes, perro guardián | 5 |
| [008](../../../docs/adr/008-double-tostring-por-comportamiento.md) | `Double.toString`/`printf` por comportamiento sobre un generador de dígitos propio | 4.2–4.3 |
| [009](../../../docs/adr/009-math-pow-con-fdlibm.md) | `Math.pow` portado de fdlibm; prohibidas las funciones aproximadas de JS | 4.4, 8 |
| [010](../../../docs/adr/010-datos-del-jdk-generados-por-el-oraculo.md) | Tablas y catálogos del JDK generados por el oráculo | 2.7, 4 |
| [011](../../../docs/adr/011-arnes-diferencial-y-goldens-binarios.md) | Arnés en Node con captura binaria; goldens en el repositorio | 7.2 |
| [012](../../../docs/adr/012-configuracion-regional-unica.md) | Un solo modelo regional (`es-MX`/`es-ES`) para `Scanner` y `Formatter` | 4.7 |
| [013](../../../docs/adr/013-interfaz-react-codemirror-y-estado.md) | Reductor + almacén externo de la traza; contenedor/presentacional | 6 |
| [014](../../../docs/adr/014-enlace-pwa-y-despliegue.md) | Enlace en el fragmento, PWA con aviso de versión, Pages por etiquetas | 6.5, 9 |
| [015](../../../docs/adr/015-textos-en-catalogo-tipado.md) | Textos en un catálogo tipado es-MX; el motor solo emite códigos y datos | 6.1 |
| [016](../../../docs/adr/016-licencias-y-codigo-de-terceros.md) | Nada de código de OpenJDK; fdlibm con su aviso; dependencias permisivas | 4.4 |

## 1. Arquitectura y estructura del repositorio

### 1.1 Capas y dependencias (ADR 001)

```
 hilo principal ┌──────────────────────────────────────────────────────────────┐
                │ interfaz (React + CM6) ──► presentacion (puro) ──► textos es-MX│
                │    │ cliente               └──────► motor/vista (Traza, formato)│
                │    ▼ postMessage (clonación estructurada)                      │
 Web Worker     │ trabajador ──► motor (compilar · ejecutar · biblioteca)        │
                └──────────────────────────────────────────────────────────────┘
 Node           pruebas/* ──► motor · presentacion · textos      herramientas/oraculo ──► JDK 17.0.18
```

| Capa (carpeta) | Responsabilidad | Puede importar | `lib` de su tsconfig |
|---|---|---|---|
| `src/motor` | Léxico, sintaxis, semántica, IR, intérprete, biblioteca emulada, traza | nada fuera de sí (0 dependencias npm) | `ES2023` (sin DOM, sin tipos de Node) |
| `src/textos` | Catálogo es-MX tipado (explicaciones, problemas, excepciones, interfaz) | tipos de `motor/vista` | `ES2023` |
| `src/presentacion` | Deriva el modelo de vista de un paso (sustitución, Detallado, explicación, resaltados, enlace, galería) | `motor/vista`, `textos` | `ES2023` |
| `src/trabajador` | Adaptador Web Worker (`trabajador.ts`) y su cliente para la UI (`cliente.ts`) | `motor` (índice completo), su `protocolo.ts` | `ES2023` + `WebWorker` |
| `src/interfaz` | React, CodeMirror, estado, estilos, PWA | `presentacion`, `textos`, `trabajador/cliente`+`protocolo`, `motor/vista` | `ES2023` + `DOM` |
| `herramientas`, `pruebas` | Oráculo, reglas de lint, presupuestos; suites transversales | todo | Node |

Las guardas son del compilador (un `tsconfig` por capa: si `motor` toca `document` no compila) y de ESLint (`no-restricted-imports` con la matriz de arriba). Nadie ejecuta el intérprete en el hilo principal.

### 1.2 Árbol

```
/Users/desarrollo/VisualizadorJava/
├── .nvmrc (22.23.1) · .gitattributes (corpus/** -text) · package.json · package-lock.json
├── tsconfig.json (solución) · tsconfig.base.json · tsconfig.{motor,trabajador,interfaz,herramientas}.json
├── vite.config.ts · vitest.config.ts · playwright.config.ts · eslint.config.js · index.html (CSP)
├── AVISOS-DE-TERCEROS.md · docs/adr/001…016
├── src/
│   ├── motor/
│   │   ├── index.ts            API completa (trabajador y pruebas)
│   │   ├── vista.ts            API de presentación: Traza, doubleATexto (el Double.toString exacto), tipos
│   │   ├── fuente/             Rango, tabla de líneas (desplazamiento ↔ línea/columna)
│   │   ├── lexico/             analizador-lexico.ts, tokens.ts, literales.ts
│   │   ├── sintaxis/           analizador-sintactico.ts, expresiones.ts (Pratt), ast.ts, no-soportado.ts,
│   │   │                       cursor-de-tokens.ts (con el contador de niveles), profundidad.ts (medida del árbol, sin recursión)
│   │   ├── semantica/          atribucion.ts, tipos.ts, conversiones.ts, sobrecargas.ts, constantes.ts,
│   │   │                       alcance.ts, alcanzabilidad.ts, asignacion-definitiva.ts, switch.ts, arranque.ts,
│   │   │                       limites-del-archivo.ts (pasada 5), paquete-del-lanzador.ts (lo que rechaza el lanzador: `java.*` en la 1.38, paquetes de módulos en la 1.39),
│   │   │                       posiciones-de-javac.ts, catalogo-clases.ts
│   │   ├── limites.ts          topes del programa: tokens, niveles de anidamiento y profundidad del árbol (+ ProgramaDemasiadoAnidado)
│   │   ├── problemas.ts        Problema, CodigoProblema, orden entre pasadas
│   │   ├── compilador.ts       compilar(): orquesta pasadas → ProgramaCompilado + VistaPrograma
│   │   ├── ir/                 ir.ts, generar-ir.ts, plan-evaluacion.ts, vista-programa.ts
│   │   ├── interprete/         ejecucion.ts (director), sentencias.ts (generadores), expresiones.ts,
│   │   │                       registro.ts (valores por punto), instantanea.ts, limites.ts
│   │   ├── traza/              paso.ts (contrato), traza.ts, prueba-de-escritorio.ts, diagnostico-ciclo.ts
│   │   └── biblioteca/
│   │       ├── numeros/        enteros.ts (int), largos.ts (long/BigInt), caracter.ts, conversiones.ts
│   │       ├── formato/        digitos-java.ts, double-a-texto.ts, formateador.ts (printf), regional.ts
│   │       ├── matematicas/    math.ts, fdlibm-pow.ts (aviso de Sun al inicio)
│   │       ├── texto/          cadena-java.ts, string.ts, character.ts, envoltorios.ts (Integer/Double/Long)
│   │       ├── entrada/        scanner.ts, tokens-scanner.ts
│   │       ├── salida/         print-stream.ts, codificacion-jvm.ts
│   │       ├── aleatorio/      random.ts (LCG de 48 bits en BigInt), semillas.ts
│   │       ├── excepciones/    excepcion-java.ts, traza-de-pila.ts
│   │       ├── catalogo/       catalogo-api.ts (soportado / existe en Java / no existe)
│   │       └── datos/          *.generado.ts (tablas del JDK; cabecera «no editar»)
│   ├── textos/es-MX/           explicaciones.ts, problemas.ts, excepciones.ts, interfaz.ts, ayuda.ts
│   ├── presentacion/           modelo-vista.ts, sustitucion.ts, detallado.ts, explicacion.ts, resaltados.ts,
│   │                           consola.ts, prediccion.ts, enlace.ts, galeria.ts
│   ├── trabajador/             protocolo.ts, trabajador.ts, cliente.ts, perro-guardian.ts
│   └── interfaz/               main.tsx, App.tsx, estado/, contenedores/, componentes/, editor/, estilos/, pwa/
├── corpus/
│   ├── curso/                  35 programas de corpus-candidato (+ entradas, goldens, .meta.json)
│   ├── autoria/                ejemplos D6 por unidad y por API
│   ├── experimentos/           numeros/ y texto/ de la exploración
│   ├── compilacion/            catalogo/ (42 casos de 03), avisos/ (una muestra por construcción, C8)
│   ├── mutantes/               veredictos.jsonl (javac)
│   ├── regresiones/            casos encogidos por fast-check
│   └── datos/                  double-tostring/, printf/, random/, pow/, caracteres/, scanner/, parseo/,
│                               marcos/, api/, regional/
├── herramientas/
│   ├── oraculo/                jdk.ts, ejecutar.ts, generar-goldens.ts, verificar-goldens.ts, generar-datos.ts,
│   │   │                       transformar-semilla.ts, mutantes.ts, programas-generados.ts, medir-plataforma.ts
│   │   └── java/               Generar*.java, CompiladorEnLote.java, MedirPow.java
│   ├── eslint/                 reglas locales (textos fuera del catálogo, capas)
│   ├── vitest/                 transporte-en-proceso.ts (setupFile del proyecto `interfaz`: registra el respaldo en proceso del cliente, porque jsdom no tiene `Worker` y `cliente.ts` no importa `trabajador.ts`)
│   └── presupuesto-tamano.ts · licencias.ts
├── pruebas/                    diferencial/ propiedades/ compilacion/ traza/ generadores/ e2e/ rendimiento/
└── .github/workflows/          ci.yml · oraculo.yml · plataforma.yml · desplegar.yml
```

Las pruebas unitarias viven junto al código (`*.test.ts`); `pruebas/` guarda las suites transversales. Correspondencia con la propuesta §7: `motor/` → `src/motor`, `worker/` → `src/trabajador`, `ui/` → `src/interfaz` (+ `presentacion` y `textos`), herramientas del arnés → `herramientas/oraculo`.

### 1.3 Contrato público del motor

```ts
// src/motor/index.ts — lo único que ven el trabajador y las pruebas
export function compilar(fuente: string): ResultadoCompilacion;
export function crearEjecucion(programa: ProgramaCompilado, config: ConfigEjecucion): Ejecucion;

export type ResultadoCompilacion =
  | { ok: true; programa: ProgramaCompilado; vista: VistaPrograma }
  | { ok: false; problema: Problema; adicionales: number };      // «y N más»

export interface ConfigEjecucion {
  regional: 'es-MX' | 'es-ES';          // §4.7
  semilla: bigint;                      // semilla visible (§3.7)
  entradaPreparada: string;             // se «teclea» sola, renglón por renglón
  entradaInteractiva: boolean;          // false ⇒ EOF al agotarla (como `java < archivo`)
  limitePasos: number;                  // 100 000 por omisión
  limiteCaracteres: number;             // tope de una cadena y de la consola
}
export interface Ejecucion {
  avanzar(maxPasos: number): Avance;    // síncrono y determinista
  darEntrada(renglon: string): void;    // incluye '\n'
  cerrarEntrada(): void;                // EOF pedido por el alumno
}
export type Avance =
  | { estado: 'continua'; pasos: Paso[] }
  | { estado: 'espera-entrada'; pasos: Paso[]; nodo: number }
  | { estado: 'fin'; pasos: Paso[]; fin: FinEjecucion };
```

El motor no tiene puertos de salida: todo entra por `ConfigEjecucion` y sale en los pasos (sin reloj, sin azar propio, sin E/S). Para integrarlo después a AprendiendoJava (Next.js 16 + React 19) basta con mover `src/motor` (y, si conviene, `trabajador`, `presentacion` y `textos`) a un paquete de *workspace*; no hay que cambiar código porque ya no depende de nada.

### 1.4 Idioma de los identificadores (ADR 002)

Identificadores, archivos y carpetas en **español ASCII** (sin tildes ni ñ en identificadores; comentarios con ortografía completa). Excepciones: los nombres de la API de Java que se emulan van tal cual (`nextInt`, `charAt`, `Scanner`, `InputMismatchException`), los que imponen las herramientas (`props`, `children`, `use*`, `describe`/`it`, API de CodeMirror) y los tipos de *conventional commits* (`feat:` con descripción en español). Todo texto visible u oíble, en español de México (ADR 015).

## 2. Compilación

### 2.1 Pasadas y orden de los problemas (ADR 004)

**[verificado en diseño]** javac 17 solo informa los errores de la **primera fase que falla**: un error de sintaxis (incluido `integer number too large`) oculta todo error de atribución aunque esté antes en el texto; un error de atribución oculta todo error de flujo aunque esté antes; y dentro del flujo, **todas** las sentencias inalcanzables se informan antes que cualquier variable sin inicializar. Ejemplos medidos: `int x; println(x);` (l. 3) + `int y = "hola";` (l. 4) → javac informa solo la l. 4; `println(x)` sin inicializar (l. 3) + `return;` seguido de otra sentencia (l. 5) → el primer error es `5: unreachable statement`.

| # | Pasada | Detecta | Si hay problemas |
|---|---|---|---|
| 1 | Léxico + sintaxis | tokens, literales, gramática, avisos léxicos y sintácticos | el primero en el texto entre {primer error de sintaxis, avisos}; se detiene |
| 2 | Atribución | símbolos, tipos, sobrecargas, constantes, alcance y sombreado, `switch`, avisos de API | el primero en el texto entre {primer error, avisos}; si hubo avisos no corren 3 ni 4 |
| 3 | Alcanzabilidad (JLS 14.22) | `unreachable statement` | el primero |
| 4 | Asignación definitiva (JLS 16) | `might not have been initialized` | el primero |
| 5 | Límites del archivo de clase (tarea 1.36, ADR 004 enmienda) | `limit.string` (65 535 caracteres o más en una constante de texto que `Gen` genera) y `limit.string.overflow` (más de 65 535 bytes en una entrada del archivo, también la receta de una concatenación); modelados al byte, con la línea de javac | el primero; un tamaño que no se puede calcular (un decimal que decide `Double.toString`, una condición constante que poda código) es un aviso |
| 6 | Arranque | lo que rechaza el lanzador (`main` sin `static`, sin `main`, no `public`) | error de arranque |

**Dos topes del programa, antes y durante el análisis sintáctico (tareas 1.36 y 1.37, ADR 004 enmienda).** El motor no modela el bytecode ni la pila de un navegador; en vez de inventar un veredicto, acota lo que sí sabe contar y avisa. (a) **Tamaño:** más de **4 000 tokens** (`MAXIMO_DE_TOKENS_DE_UN_PROGRAMA`, `motor/limites.ts`) es el aviso `programa-demasiado-grande`, revisado justo después del léxico (lineal) y antes de todo lo demás: javac rechaza un método de más de 65 535 bytes de bytecode (`limit.code`) y 4 000 tokens dejan 1,4 veces de margen por debajo de la construcción más densa medida (un `switch` de texto) y más de 4 veces el programa más grande del curso (881). (b) **Anidamiento:** el de tokens no acota la profundidad (4 000 tokens caben en un árbol de 2 000 niveles) y el analizador y las pasadas son recursivos, así que se acota de dos maneras, porque la pila se agota por dos motivos y no a la vez: `MAXIMO_DE_NIVELES_DE_ANIDAMIENTO` = **100** niveles de recursión del analizador (el cursor cuenta cada expresión dentro de otra, cada operador prefijo o cast sobre otro y cada instrucción dentro de otra: `CursorDeTokens.entrarNivel`) y `MAXIMO_DE_PROFUNDIDAD_DEL_ARBOL` = **200** niveles de profundidad del árbol (una medida exacta y no recursiva, `sintaxis/profundidad.ts`, al final de `analizarPrograma` y antes de que ninguna pasada recorra el árbol; cubre las cadenas de `&&` o de `+` que el analizador arma con un lazo). Pasarse de cualquiera es el aviso `programa-demasiado-anidado` (lo lanza `ProgramaDemasiadoAnidado`, que `compilar()` traduce; un error de sintaxis o léxico anterior en el texto gana). Los dos avisos no son una construcción de Java sino el programa entero: su texto no usa el marco de «es parte de Java…» y dice la línea donde se pasó.

Una expresión que depende de algo no soportado recibe el tipo `desconocido`, que suprime los errores en cascada (nunca se informa un error que Java podría no dar). **Cerrar por defecto (tarea 1.34):** `desconocido` solo se tolera si está *explicado* —se reportó un problema sobre esa expresión durante la visita, proviene de una variable ya marcada o hereda de un operando ya cerrado—; una expresión cuyo tipo no se sabe, o es de un tipo que el subconjunto no modela (`args`, `System.in`, `System.out`, `System.err`, el `PrintStream` de `printf`), usada como VALOR (inicializador, asignación y su destino, argumento, operando, condición, receptor, selector, `return`) NUNCA termina en `ok` ni en `ejecucion-no-disponible`: si javac la rechaza por una regla del subconjunto sale el error modelado, y si no, un aviso honesto (`valor-de-tipo-no-modelado`, `arreglo-no-soportado`). El sumidero abierto era el defecto de diseño detrás de cuatro familias de falsos aceptos que halló la re-verificación del lote 1: «no sé» no es «sí». Cada error lleva el **código de diagnóstico de javac** (`compiler.err.var.might.not.have.been.initialized`, etc.) para compararlo con el oráculo (§7.4).

### 2.2 Modelo de problemas

```ts
type Categoria = 'error-compilacion' | 'no-disponible' | 'error-arranque';
interface Problema {
  categoria: Categoria;
  codigo: CodigoProblema;        // unión cerrada: 'falta-punto-y-coma', 'tipos-incompatibles', 'arreglo', …
  codigoJavac?: string;          // clave del diagnóstico de javac (solo errores)
  rango: Rango; linea: number;   // línea 1-based, la misma que javac
  datos: DatosProblema;          // parámetros del mensaje (nombres, tipos); nunca texto
}
type CausaFin = 'terminado' | 'excepcion' | 'error-arranque' | 'no-disponible-en-ejecucion'
              | 'limite-pasos' | 'limite-caracteres' | 'limite-tiempo' | 'error-interno';
```

Los cuatro mensajes de la propuesta §2.3 salen de `categoria` + `CausaFin`. **Decisión del orquestador:** el error de arranque se presenta **como una excepción en ejecución**: primero el mensaje amable en español (qué falta y cómo se escribe `public static void main(String[] args)`) y, como detalle secundario, el texto **exacto** del lanzador de JDK 17 capturado por el oráculo, sin reinterpretarlo. **[verificado en diseño]** Sin `main` o con `main` no público: «Error: no se ha encontrado el método principal en la clase X, defina…» con `\n` **literales** (la rareza de Temurin 17.0.18 en español); sin `static`: «Error: el método principal no es static en la clase X…» con saltos reales; ambos salen con código 1. Los textos viven en `corpus/datos/api/` (ADR 010). `error-interno` (un fallo del propio visualizador) muestra «algo falló dentro del visualizador» y ningún resultado (D2).

### 2.3 Gramática del subconjunto

```ebnf
Programa     = [ "package" Nombre ";" ] { Importacion } Clase { ";" } EOF ;   (* otra clase/interfaz/enum/record → NO-DISP; un archivo SIN ninguna clase (vacío, solo comentarios, `package` o `import`s) → aviso `archivo-sin-clase`, tarea 1.35 *)
Importacion  = "import" Nombre [ "." "*" ] ";" ;          (* static → NO-DISP; clase existente no soportada → NO-DISP; inexistente → error; `import p.*;` exige un paquete con tipos o un tipo (JLS 7.5.2: `java.sqrt.*` → error `importacion-no-reconocida`); un `;` suelto entre dos imports se tolera, como en javac (tarea 1.35) *)
Clase        = { "public" | "final" } "class" Id "{" { Main | ";" } "}" ;  (* campo, método, clase interna, bloque, anotación → NO-DISP; `sealed`, `non-sealed` y `permits` → NO-DISP de herencia; un campo sin su `;` → error `falta-punto-y-coma` (abajo); tarea 1.35 *)
Main         = { "public" | "static" | "final" } "void" "main" "(" ParamMain ")" Bloque ;   (* throws → NO-DISP; con OTRA firma (dos parámetros, ninguno, `String args`, `double[] args`) es un método propio más → NO-DISP, y `main(args);` una llamada a un método propio (tarea 1.35) *)
ParamMain    = [ "final" ] "String" ( "[" "]" Id | Id "[" "]" | "..." Id ) ;
Bloque       = "{" { DeclLocal ";" | Sentencia } "}" ;
DeclLocal    = [ "final" ] Tipo Declarador { "," Declarador } ;             (* final sin inicializador → NO-DISP *)
Declarador   = Id [ "=" Expr ] ;                                (* Id NO es una de las 54 palabras reservadas de javac (`Tokens.TokenKind`, generadas por el oráculo, tarea 1.33): `int native;` da `palabra-reservada-como-nombre`; `var`, `yield`, `record`, `sealed`… no lo son y valen como nombre (JLS 3.9) *)
Tipo         = "int" | "long" | "double" | "boolean" | "char" | NombreDeTipo ; (* String, Scanner, Random, calificados o no *)
Sentencia    = Bloque | ";" | ExprSentencia ";" | If | Switch | While | DoWhile | For
             | "break" ";" | "continue" ";" | "return" [ Expr ] ";" ;   (* `return Expr;` se conserva en el árbol y la atribución lo rechaza en `main` (es `void`): «unexpected return value», tarea 1.33 *)
ExprSentencia= Asignacion | IncDec | Llamada | "new" NombreDeTipo Argumentos ;  (* otra expresión → error «not a statement»; entre paréntesis también (JLS 14.8: `(x = 2);` da `sentencia-entre-parentesis`; `(x) = 2;`, `(x)++;` y `(s).length();` sí compilan): el árbol conserva la marca `parentesis` de cada expresión (tarea 1.34) *)
If           = "if" "(" Expr ")" Sentencia [ "else" Sentencia ] ;
Switch       = "switch" "(" Expr ")" "{" { Etiqueta { Etiqueta } { DeclLocal ";" | Sentencia } } "}" ;   (* las sentencias solo van DESPUÉS de una etiqueta: una antes del primer `case` es el error `sentencia-antes-del-primer-case` («case, default, or '}' expected»); hasta la 1.34 el analizador la aceptaba *)
Etiqueta     = "case" Expr ":" | "default" ":" ;                             (* "case X ->", yield → NO-DISP; la Expr de una etiqueta se lee SIN lambdas (`NOLAMBDA` de javac): en `case s ->` la flecha es la del switch *)
While        = "while" "(" Expr ")" Sentencia ;
DoWhile      = "do" Sentencia "while" "(" Expr ")" ";" ;
For          = "for" "(" [ DeclLocal | ExprSentencia { "," ExprSentencia } ] ";" [ Expr ] ";"
               [ ExprSentencia { "," ExprSentencia } ] ")" Sentencia ;       (* for ([final] T x : xs) → NO-DISP con CUALQUIER tipo (`float`, `int[]`, `Map.Entry<K, V>`, `var`), tarea 1.35 *)
```

Una declaración en posición de `Sentencia` (`if (c) int x = 5;`) da el error de javac «variable declaration not allowed here». El `else` se liga al `if` más cercano por construcción.

**Un campo al que le falta su `;` (tarea 1.35, verificado con javac 17.0.18).** javac lee un campo como `Tipo nombre [= expresión] {, nombre …} ;` y la expresión termina en la primera palabra que ya no puede continuarla (`term()` solo sigue mientras ve un operador, `.`, `[`, `(`, `::`, `?`…): ahí falta el `;` y el error se ancla en el FIN de la palabra anterior, no en el miembro que sigue (que casi siempre está en otra línea). `consumirCampo` ya no busca a ciegas el siguiente `;` —se tragaba al miembro siguiente entero y daba aviso o un error en la línea de otro miembro—: salta la cabecera y vigila los PARES de palabras de nivel superior que ningún programa válido contiene (un operando seguido de un modificador, `class`/`interface`/`enum`, un tipo primitivo, un literal, un nombre o un `{`) y deja pasar lo ambiguo, porque cerrar por defecto no es rechazar lo válido (`(Tipo) x` es una conversión y javac da otro error, `o instanceof T t` y `new @A T()` traen dos nombres seguidos). Casos que cambian el mensaje de javac, y por eso la regla: tras `=`, un operador o `->` la expresión TODAVÍA espera un operando, así que una palabra que abre un miembro (un modificador, `default`, `class`, `interface` o `enum`) es «illegal start of expression» en esa palabra; tras `.` o `new`, «<identifier> expected» en el fin de ese token (salvo `class` tras un `.`, que es un literal de clase, y `enum`, que javac lee como un identificador mal usado); una anotación pegada al nombre es «illegal start of type» y tras un operando «illegal start of expression» en la `@` (salvo tras la `}` de un arreglo o de un `switch`, donde la expresión ya terminó y es «`;` expected»); un `{` solo continúa tras `new T(…)` (clase anónima), el selector de un `switch`, `]`, `->` y `=`. `Tipo nombre` seguido de algo que no es `=`, `,`, `;` ni `(` es el mismo «`;` expected» en el fin del nombre (un `void` o un método genérico piden `(` en el token mismo), y una coma sin el nombre del siguiente campo, «<identifier> expected» en el fin de la coma.

### 2.4 Precedencia (Pratt), de menor a mayor

| Nivel | Operadores | Asoc. | En v1 |
|---|---|---|---|
| 1 | `=` `+=` `-=` `*=` `/=` `%=` · `&=` `\|=` `^=` `<<=` `>>=` `>>>=` | der. | sí · NO-DISP |
| 2 | `?:` · `->` | der. | NO-DISP |
| 3–4 | `\|\|` · `&&` | izq. | sí (cortocircuito) |
| 5–7 | `\|` · `^` · `&` | izq. | NO-DISP (para `\|`/`&` sugiere `\|\|`/`&&`) |
| 8 | `==` `!=` | izq. | sí |
| 9 | `<` `>` `<=` `>=` · `instanceof` | izq. | sí · NO-DISP |
| 10 | `<<` `>>` `>>>` | izq. | NO-DISP |
| 11 | `+` `-` | izq. | sí (concatenación por tipo estático) |
| 12 | `*` `/` `%` | izq. | sí |
| 13 | prefijos `+ - ++ -- !`, cast `(T)` · `~` | der. | sí · NO-DISP |
| 14 | posfijos `++ --`, `.` miembro, `( )` llamada · `[ ]`, `::` | izq. | sí · NO-DISP |

### 2.5 Ambigüedades

1. **Cast o paréntesis** (JLS 15.16; tarea 1.35: la decisión es `JavacParser.analyzeParens` de javac 17, portada rama por rama en `sintaxis/parentesis.ts`, que mira los tokens que siguen sin consumirlos): `(` tipo primitivo `)` es cast siempre; un tipo —un nombre con su paquete, con argumentos de tipo (`<…>`), con corchetes, con anotaciones o una intersección `A & B`— seguido de `)` es cast cuando lo visto solo puede ser un tipo (`(String[]) x`, `(List<?>) x`, `(A & B) x`); `(` Nombre `)` es cast solo si sigue algo que abre una expresión unaria sin `+`/`-` (un identificador, un literal —también los que el visualizador no ejecuta—, `(`, `!`, `~`, `new`, `this`, `super`, `true`, `false`, `null`, `switch`, una palabra de tipo primitivo o `void`, y `assert`/`enum`/`_`, que javac también lee como cast y luego rechaza); si no, es paréntesis. Por eso `(a.b)(1)` es una conversión al tipo `a.b`, no una llamada. El tipo del cast se DELIMITA, no se valida: un arreglo, un genérico, una intersección o una anotación es NO-DISP con el aviso de esa forma (`arreglo-no-soportado`, `generico-no-soportado`, `clase-no-soportada`, `anotacion-no-soportada`); un nombre (con o sin paquete) es una conversión y pasa a atribución: NO-DISP si el tipo existe, error «cannot find symbol» si no.
2. **Declaración o expresión** al inicio de sentencia: primitivo o `final` ⇒ declaración; `Nombre[.Nombre]* Id` ⇒ declaración (el tipo se resuelve en atribución: `string nombre` da «cannot find symbol: class string», como err18); `Nombre [ ]` ⇒ arreglo (NO-DISP); `Nombre < … > Id` con `<>` balanceados ⇒ genérico (NO-DISP); `var Id` ⇒ NO-DISP (`var` solo es el tipo si un nombre lo sigue; NO es palabra reservada, así que `int var;` y `var++;` son una variable llamada `var`); `Nombre palabraReservada ;|=|,` ⇒ declaración con un nombre inválido (`palabra-reservada-como-nombre`; `instanceof` es la excepción: `x instanceof T;` es una expresión); `Id :` ⇒ etiqueta (NO-DISP); lo demás, expresión. No hace falta retroceso: el conjunto de tipos es cerrado. **`yield`** (tarea 1.33) es la sentencia NO-DISP solo cuando lo decide la regla de `JavacParser.blockStatement` del JDK 17 (un literal, un nombre, `+ - ! ~`, `null true false new switch this super`, `;`, `++`/`--` si el tercer token no es `;`, o un paréntesis sin comas de primer nivel ni vacío o seguido de flecha); `yield = 5;`, `yield++;`, `yield.length();` y `yield();` son una variable o una llamada.
3. **`-2147483648` y `-9223372036854775808L`:** el léxico conserva el texto del literal; el analizador valida el rango sabiendo si lo precede un `-` unario (JLS 3.10.1) y si no, «integer number too large» (error de sintaxis, como javac).
4. **Un tipo en posición de expresión** (tarea 1.35, JLS 15.8.2 y 15.13; `bracketsSuffix` e `isUnboundMemberRef` de javac): `Nombre.class`, `Nombre[].class`, `int.class`, `int[][].class` y `void.class` son un literal de clase (NO-DISP, `literal-de-clase-no-soportado`, con el literal escrito sin espacios); solo un nombre (con su paquete), un arreglo o una palabra de tipo primitivo pueden llevar `.class`, y `f().class`, `"a".class` o `(String).class` son «<identifier> expected»; `Tipo[]` o `int` SOLOS no son una expresión («'.class' expected»). `Tipo[]::new`, `int[]::clone` y `Tipo<Args>::miembro` (un «<» que cierra con un «>» seguido de `.`, `[` o `::`; si no, es una comparación) son referencias a método (NO-DISP). Al inicio de una sentencia, `int.class.getName();` y `String[].class.getName();` son expresiones, no declaraciones.

### 2.6 Reconocimiento de lo no soportado (sin reinterpretar)

Cada construcción se reconoce con una subgramática permisiva que delimita su extensión, crea un nodo `NoSoportado { codigo, rango }` y deja seguir el análisis (así se encuentra el primer problema en el orden del texto). En cada punto de error se pregunta primero si el token que falla abre una construcción válida de Java fuera del alcance: si sí, es aviso, nunca error de sintaxis (C8).

| Detector | Construcciones |
|---|---|
| Léxico | `\uXXXX` en cualquier lugar (javac lo procesa incluso en comentarios, y solo cuenta si lo precede un número PAR de barras: `C:\\users` no es un escape, JLS 3.3; **un `\u` mal formado es ERROR en cualquier lugar, también en un comentario**, y un escape que cierra una cadena o es un `&`, una llave o un `;` puede ser la CAUSA de un error posterior: entonces gana el aviso del escape, tarea 1.35); literales hexadecimales, octales (incl. `010`, explicando que Java lo lee como 8) y binarios; `float` (`1.5f`); bloques de texto `"""`; flotantes hexadecimales (`0x1p3`, `0x1.8p1`); escapes válidos en Java fuera de `\n \t \" \' \\` (`\r \b \f \s \0–\377`). Un emoji —dos unidades UTF-16— dentro de un literal `char` (`'<un emoji>'`: javac lo compila con el valor de su primera unidad) es aviso (`caracter-suplementario-no-soportado`); dos en un `char` son error (tarea 1.35). **Son ERROR, como en javac** (tarea 1.33): un guion bajo mal puesto en un literal (`1_`, `1_L`, `1_.0`, `0x_1`: solo puede ir entre dos dígitos, JLS 3.10.1) y un literal mal formado (`0x`, `0b2`, `0x1.8` sin exponente, `1e`) |
| Sintaxis | varias clases, interfaces, enums, records; clases selladas (`sealed`, `non-sealed`, `permits`); un archivo sin ninguna clase; campos, métodos propios (también un `main` con otra firma y `main(args);`), clases internas, clases anónimas (`new T() { … }`), inicializadores, anotaciones; `throws`; arreglos (tipo, `new`, acceso, inicializador) salvo el parámetro de `main`; `for` mejorado con cualquier tipo; etiquetas; `switch` con flecha, como expresión o con `yield`; `try/catch/finally/throw`; `var`; genéricos (`T<…>`, `new T<…>()`, `T.<X>m()`); literales de clase (`X.class`); casts a arreglos, genéricos, intersecciones o con anotaciones; lambdas; `::` (también `T[]::new` y `T<A>::m`); `?:`; `& \| ^ ~ << >> >>>` y sus asignaciones; `instanceof` (también con patrón y con nombre completo); `this`/`super`; `null`; `float`/`byte`/`short`; `final` sin inicializador; `import static` |
| Atribución | clases de `java.lang`/`java.util` existentes pero no soportadas y sus miembros; miembros existentes no soportados de clases soportadas (`s.split`, `Math.sin`, `sc.hasNextInt`, `sc.nextLong`, `Long.parseLong`, `System.exit`…); un segundo `Scanner` o `new Scanner` dentro de un ciclo; `Scanner` sobre algo distinto de `System.in`; `useLocale`; `printf`/`String.format` con conversión o bandera no soportada en formato literal; el resultado de `System.out.printf(...)` (un `PrintStream`, tipo que el subconjunto no modela) usado como valor (tarea 1.33) |
| Ejecución | formato no literal con conversión no soportada (detiene en ese paso; la traza previa sigue navegable); subnormales (§4.2) si el lote 2 no caracteriza su regla |

Posiciones calibradas con javac: los errores «X expected» se ubican al **final del token anterior** (línea del token anterior); una cadena sin cerrar, en su inicio. Cada regla de posición tiene su caso en el catálogo o en los mutantes.

### 2.7 Semántica

- **Tipos:** `int long double boolean char String Scanner Random void` + `desconocido` (tarea 1.32: `void` no es un miembro de `Tipo`: una llamada a un método `void` se tipa `desconocido`, para no propagar errores en cascada, y `esLlamadaSinValor` la reconoce por la firma real del oráculo donde se exige un valor). Los tipos de variable son solo los del subconjunto (REQ-SUB-002): un envoltorio (`Integer`, `Long`, `Double`, `Character`) como TIPO de una variable, de un `new` o de un cast es una clase real fuera de U3–U7 —aviso, sin modelar el *boxing*—; como clase estática (`Integer.parseInt`) sí es del subconjunto. Cast (JLS 5.5): solo entre `int long double char` o de un tipo a sí mismo (`boolean`, `String`, `Scanner`, `Random`); los otros 44 de los 64 pares son error, señalado en el operando. Un miembro de un valor primitivo (`n.length()`) es error. Asignación (JLS 5.2): identidad, ensanchamiento, estrechamiento de constantes `int` a `char` si caben (`char c = 65;`); lo demás, «possible lossy conversion from X to Y» o «X cannot be converted to Y». Promoción numérica binaria y unaria (5.6). `+` concatena si algún operando es `String` (la otra parte pasa por `String.valueOf` de su tipo **estático**); `==`/`!=` numérico, booleano o de referencias comparables (`String` vs `Scanner` → «incomparable types»); asignación compuesta con conversión implícita `E1 = (T)(E1 op E2)`.
- **Sobrecargas:** JLS 15.12.2 (fases estricta, laxa, *varargs* y «más específico») sobre las firmas reales del **catálogo del JDK** (ADR 010), que también distingue *soportado* / *existe en Java (NO-DISP)* / *no existe (error)*. **[verificado en diseño]** `Math.round(123456789L)` elige `round(float)` y da el `int` 123456792 (por eso `int r = Math.round(l);` compila si `l` es `long`); `Math.abs('a')` es `int`; `Character.toUpperCase(97)` imprime `65`; `println(char)` ≠ `println(int)`; `printf` recibe argumentos «encajados» (`%d` con `double` → `IllegalFormatConversionException: d != java.lang.Double`).
- **Constantes (JLS 15.29):** literales, operadores, casts a primitivo o `String`, variables constantes (`final` con inicializador constante: su valor se guarda ya CONVERTIDO al tipo declarado, así `final int A = 'a'; char c = A;` compila por JLS 5.2 y `final long B = 5; int d = B;` no) y campos constantes (`Integer.MAX_VALUE`, `Math.PI`…). Un cast a `String` o a `boolean` también es constante (`case (String) "a":`, `if ((boolean) true)`: tarea 1.35). Se pliegan con las **mismas** funciones de la biblioteca (`"a" + 1.0` usa `Double.toString`); una división entera entre cero no es constante. Sirven para: internar `String` (`"ho" + "la" == "hola"` es `true`), etiquetas de `case` y duplicados, estrechamiento, y condiciones constantes en alcanzabilidad y asignación definitiva (`while (1 < 2)` cuenta como `while (true)`, **[verificado en diseño]**).
- **Constantes de valor desconocido (tarea 1.36, tercer estado):** además de «constante de valor conocido» y `null` («no es constante»), `valorConstante` devuelve `ConstanteDeValorDesconocido` para lo que Java trata como constante pero el motor todavía no calcula (`"a" + 1.5`, `"a" + 1.5 == "a1.5"`, `true && "a" + 1.5 == "a1.5"`: su valor lo decide `Double.toString`, lote 2). No tiene propiedad `tipo` a propósito: quien lea `c.tipo` deja de compilar hasta decidir qué hace con lo desconocido (`esDeValorDesconocido`, o `valorSiSeSabe` si solo importa el valor de una constante entera). Donde el valor decide —la condición de un ciclo (alcanzabilidad), la asignación definitiva, una etiqueta de `case`— es un aviso honesto (`constante-de-texto-con-decimal-no-soportada`); de la medida de un texto se sabe un intervalo (`MedidaDeUnTexto`), con el que la pasada 5 decide o avisa (`tamano-de-texto-no-revisable`).
  - **Cierre (tarea 2.4, hito 1 parte C):** el tercer estado se retiró. `Double.toString` exacto (§4.2) permite plegar `"a" + 1.5` a `"a1.5"`: `valorConstante` devuelve un valor conocido o `null`, y las tres decisiones (alcanzabilidad, asignación definitiva, etiquetas de `case`) y la medida de los textos (pasada 5) usan el valor real, igual que javac (`corpus/experimentos/constantes-desconocidas/`: C-5 es ahora `sentencia-inalcanzable` en la línea de javac, W-10 compila). El aviso `constante-de-texto-con-decimal-no-soportada` desapareció; `tamano-de-texto-no-revisable` queda solo para la poda de código por condiciones constantes.
- **Nombres de paquete (tareas 1.36 a 1.39):** `package nombre;` se revisa primero, antes que los `import` (como javac: se declara al entrar las clases). Un nombre que es el de un paquete que el JDK exporta (`java.util`, `javax.swing`, 226) es el error `paquete-del-jdk` (`package.in.other.module`). Un nombre que es —o empieza con— el de una clase que el compilador YA conoce al leer el `package` es el error `paquete-con-nombre-de-clase` (`pkg.clashes.with.class.of.same.name`): `java.lang.Shutdown`, `java.lang.Thread$State`, `java.lang.String.aula`, `java.io.Serializable`; el chequeo de javac recorre los prefijos, no depende del cuerpo del programa y conoce al arrancar todos los archivos de `java.lang` (públicos o no, anidados o no: 270) y 26 clases que él mismo crea de antemano; la lista sale del oráculo (`CLASES_QUE_CHOCAN_COMO_PAQUETE`, 296 nombres del JDK 17.0.18, `GenerarClasesQueChocan.java`). Una clase PÚBLICA que el compilador aún no conoce y que está fuera de `java` (`javax.swing.JFrame`, `org.w3c.dom.Node`: 2 656 de las 4 477 del catálogo) la compila javac y el JDK real la ejecuta; el visualizador no comprueba los paquetes que se llaman como una clase y lo avisa (`paquete-con-nombre-de-clase-no-soportado`). Lo que está **dentro de `java`** (tarea 1.38) —`java`, `java.miapp`, `java.lang.aula`, `java.util.Map`— lo compila javac, pero el lanzador del JDK real se niega a arrancarlo (`SecurityException: Prohibited package name`; el nombre de la CLASE empieza con `java.`; medido con 70 nombres, de los que 43 se vuelven a medir en cada `npm run test:oraculo`: solo `java` y `java.*`, no `javax`, `jdk`, `sun`, `com.sun`, `org`, `Java.x` ni `javafoo`): es el aviso `paquete-reservado-por-java`, de una pasada propia que va **después** de las de javac (`semantica/paquete-del-lanzador.ts`, junto al arranque: lo que rechaza el lanzador, no javac). Un error del cuerpo se informa antes, con la línea de javac; el aviso solo sale si todo lo anterior aceptó el programa, y gana a `ejecucion-no-disponible` y al «sin main» del arranque (el lanzador falla al cargar la clase, antes de buscar `main`). Los demás nombres (`miproyecto`, el de NetBeans) pasan. **Paquetes de módulos (tarea 1.39, W-16):** un paquete que ya existe en un módulo del JDK pero que javac compila porque el módulo no lo exporta (`jdk.internal.misc`, `sun.nio.ch`, `com.sun.crypto.provider`: **516** de los **871** paquetes de los módulos del sistema) tampoco lo arranca el lanzador, con otro mecanismo (`ClassNotFoundException`: el cargador de aplicaciones busca el paquete en su módulo y no mira el classpath): es el aviso `paquete-interno-del-jdk` (otro código y otro texto: el nombre no está reservado, el paquete ya existe dentro de Java), en la MISMA pasada y **antes** que la de `java` (`java.awt.peer` y `java.awt.dnd.peer` están dentro de `java` pero son de un módulo: el módulo gana y el lanzador da `ClassNotFoundException`, no la `SecurityException`). Los otros 226 los exporta un módulo y javac los rechaza (`paquete-del-jdk`, exactamente los paquetes del catálogo de clases) y los otros 129 arrancan (módulos que ni siquiera están en el arranque: incubadoras, herramientas). Solo cuenta el nombre EXACTO: un subpaquete (`jdk.internal.misc.aula`) y el paquete de arriba cuando no es de módulo (`com.sun.crypto`) SÍ arrancan, y dentro de `java` el subpaquete (`java.awt.peer.aula`) es el aviso de la 1.38. La lista sale del oráculo, nombre por nombre, con el `java` real (`GenerarPaquetesDeModulos.java`: javac compila los 871 de una vez y se arranca uno por uno; unos 10 s en total) y se guarda en `corpus/datos/api/paquetes-de-modulos.jsonl` (los tres desenlaces) y `PAQUETES_INTERNOS_DEL_JDK` (los 516, para el motor). La guarda de TODO el corpus (`pruebas/compilacion/lanzador-del-corpus.test.ts`) exige que ningún programa que el lanzador real no arrancó termine en `ok` listo para ejecutarse (la exención es `arranque !== null`: el `main` que el lanzador no puede llamar).
- **Alcance:** una ranura por declaración (no hay recursión: un solo marco); la variable ya está en alcance en su propio inicializador (JLS 6.3: `int x = x + 1;` no es «no existe x» sino «podría no tener un valor», y una variable que se llama como una clase la tapa desde ahí, JLS 6.5.2; tarea 1.32); el nombre de una local viva no se puede redeclarar en un bloque anidado ni en el mismo (`variable x is already defined in method main(String[])`, incluido `args`); el bloque de un `switch` es un solo alcance; las variables del `for` viven en el `for`.
- **Tipo propio y nombres de clase (tarea 1.34, JLS 6.4.1 y 7.5.1):** la clase del programa TAPA a la del JDK que se llame igual, con o sin `import` (`class Math { … Math.abs(1) … }`: `abs` no es un miembro de la clase del alumno → error; `class Scanner` con `import java.util.Scanner;` → `clase-repetida-con-import`, «already defined in this compilation unit», en la línea del `import`); un nombre de clase entre paréntesis ya no es la clase (`(Math).abs(-1.5)`: «illegal parenthesized expression»); `args` es un `String[]` (aviso `arreglo-no-soportado`, REQ-SUB-007); una clase llamada `String` no tiene el `String[]` de `main` de Java y el lanzador no la arranca (`clase-llamada-string`). Ninguna tabla del motor es un objeto plano indexado por texto del alumno (`Map`; la regla de ESLint de `herramientas/eslint/reglas-de-tablas.ts` lo hace cumplir): `constructor`, `toString`, `__proto__` no son «operadores» ni miembros de `System`.
- **Imports con comodín (tarea 1.35, JLS 7.5.2):** `import p.*;` exige un paquete con al menos un tipo visible, o un tipo (`import java.lang.String.*;` importa sus tipos anidados): `java.sqrt.*`, `java.Util.*` y `org.junit.*` son el error `importacion-no-reconocida` en la línea del `import`. `existePaqueteOTipoDelJdk` coincide con javac en los 886 nombres que se midieron (los 871 paquetes de todos los módulos del sistema, `herramientas/oraculo/java/ListarPaquetes.java`, y 15 más: 3/3 en `importaciones-bajo-demanda.test.ts`).
- **Alcanzabilidad (JLS 14.22):** tras `return`/`break`/`continue`; tras un ciclo de condición constante `true` sin `break`; cuerpo de `while (false)` y de `for` con condición constante `false`; el `if (false)` está exento.
- **Asignación definitiva (JLS 16):** «asignada si verdadero/si falso» para `&&`, `||`, `!` y constantes; `if` con y sin `else`; `while`/`for` (nunca garantizan salvo condición constante `true` y los `break`); `do-while` (el cuerpo corre una vez); `switch` (con `default`, antes de cada `break` y al final del último grupo); `x++`, `x += e` y `int x = x + 1` leen antes de asignar.
- **`switch`:** selector `int`, `char` o `String` (otro tipo → error en la línea del `switch`; con `long`, javac 17 dice «patterns in switch statements are a preview feature», **[verificado en diseño]**); etiquetas constantes asignables al selector; duplicados por valor tras convertir (`case 97:` y `case 'a':` en un `switch` de `int`); un solo `default`.

## 3. Ejecución

### 3.1 Valores y representación intermedia

| Tipo Java | Valor en el motor | Regla de cada operación |
|---|---|---|
| `int` | `number` entero | `\|0` tras `+ - /`, `Math.imul` para `*`, `(a % b) \| 0` (normaliza `-0`); `/` y `%` entre cero lanzan `ArithmeticException: / by zero`; `MIN_VALUE / -1` da `MIN_VALUE` sin excepción |
| `long` | `bigint` | `BigInt.asIntN(64, r)` tras cada operación; `/` trunca hacia cero |
| `char` | `number` 0–65535 | se promueve a `int`; `c++` y `c += n` hacen `& 0xFFFF` |
| `double` | `number` | IEEE 754 tal cual (`/` entre cero da `Infinity`/`NaN`, `%` es `fmod`) |
| `boolean` | `boolean` | — |
| `String` | `CadenaJava { texto, latin1 }` | identidad por referencia; literales y constantes salen de un *pool* internado; `latin1` (todos los chars ≤ U+00FF) elige mensaje y marcos de `charAt` (§3.6) |
| `Scanner`, `Random` | objetos de la biblioteca | — |

Conversiones: `double→int/long` **satura** (`NaN→0`), `long→int` da la vuelta (`(int)(long)1e30 == -1`), `→char` toma 16 bits (desde `double`, primero a `int`), `long→double` con `Number(bigint)` (redondeo al más cercano, como `l2d`), `int/long→float` (solo por la sobrecarga `round(float)`) con redondeo correcto en `BigInt`, nunca `Math.fround(Number(l))` (doble redondeo).

El semántico **baja** el AST a una IR tipada y resuelta: cada operación ya sabe su tipo (`bin-int`, `bin-double`, `concat`, `conv char→int` explícita…), cada local su ranura y cada llamada su función de biblioteca; las conversiones implícitas son nodos visibles (el Detallado muestra «`'a'` se promueve a `int`: 97»). Cada expresión raíz tiene un **plan de evaluación**: la lista de sus puntos en el orden de Java (operando izquierdo, derecho, operador; en `x op= e` primero se lee `x`; en una llamada, objetivo y luego argumentos).

### 3.2 Intérprete (ADR 005)

- Cada sentencia se ejecuta en una función generadora que produce **un `Paso` por paso Normal**; los bloques delegan con `yield*` (la profundidad es la del anidamiento, no la de las expresiones) y devuelven su terminación (`normal | break | continue | return`).
- Las expresiones se evalúan con una función recursiva directa sobre la IR (sin generadores); en cada punto del plan anotan su valor en el registro del paso. Una sola implementación de la semántica: no hay otra ruta para el Detallado.
- **Lectura con reintento:** si `Scanner` no tiene datos lanza `FaltaEntrada`. La sentencia (solo las marcadas `leeEntrada` por el semántico toman instantánea al empezar: ranuras que puede tocar, cursor del `Scanner`, estados de `Random`, registro del paso) la restaura; si queda un renglón de la entrada preparada, lo «teclea» (eco en consola) y reintenta; si no, cede `necesita-entrada`, y al llegar el renglón reintenta. El resultado es determinista, así que **la traza interactiva y la preparada son idénticas** con los mismos renglones (propiedad probada).
- El director (`Ejecucion.avanzar`) reanuda el generador, cuenta pasos, aplica límites y convierte `ExcepcionJava` en el paso final `excepcion`. Cualquier otra excepción es `error-interno`.

### 3.3 Pasos (Normal, Detallado y predicción)

```ts
interface Paso {
  clase: ClasePaso;
  nodo: number;                       // id en VistaPrograma
  valores?: (Valor | null)[];         // alineados con el plan del nodo; null = no evaluado (cortocircuito)
  cambios?: Cambio[];                 // { ranura, anterior, nuevo, punto } — `anterior` es de ESA variable; nunca se deshace con él (§3.4)
  salida?: Segmento[];                // { flujo: 'out' | 'err' | 'eco', texto }
  entrada?: { cursor: number; agregado?: string };   // renglón que entró al búfer y avance del cursor
  control?: { resultado?: boolean; vuelta?: number; ciclo?: number; caso?: number; predecible?: true };
  fin?: FinEjecucion;                 // solo en el último paso
}
type Valor = number | bigint | boolean | string | { objeto: 'Scanner' } | { objeto: 'Random' };
```

| Clase | Cuándo | Predecible (D4) |
|---|---|---|
| `declaracion` | `int x;` (queda «sin inicializar») o con inicializadores (varios declaradores, un paso) | no |
| `asignacion` | `=`, `op=`, `++`/`--` como sentencia o actualización del `for` | no |
| `expresion` | llamada sin impresión (`sc.nextLine();`, `sc.close();`), `new Scanner(...)` suelto | no |
| `impresion` | `print`/`println`/`printf`/`System.err` (con las piezas del formato para la plantilla 21) | no |
| `condicion-if` | condición de `if` / `else if` | **sí** |
| `condicion-ciclo` | condición de `while`/`for`/`do-while`, con `vuelta` y `ciclo` | **sí** (¿se repite?) |
| `seleccion-switch` · `caida-switch` | caso o `default` elegido · paso a un grupo sin `break` | no (predicción de `case` es v1.1) |
| `break` · `continue` · `return` · `vacia` | la sentencia correspondiente (`;` suelto es un paso real, error #8) | no |
| `excepcion` · `detenido` · `fin` | fin por excepción · por seguridad o aviso en ejecución · normal | no |

- **Normal = por sentencia**, con sustitución completa: la explicación reescribe el texto de la expresión cambiando cada lectura de variable y cada llamada por su valor registrado (`total + precio * 2 → 100 + 25 * 2 → 150`).
- **Detallado = presentación**, no otro modo del intérprete: los micropasos de un paso son los puntos del plan con valor (en orden), cada uno reescribe la subexpresión más interna por su valor; los `null` se marcan «no evaluado» (cortocircuito); los `cambios` con `punto` muestran efectos a media expresión (`y = y++ + ++y`). Por eso el lote 6 es sobre todo interfaz y plantillas: el motor ya guarda todo desde el lote 2.
- **Predicción:** la interfaz oculta `control.resultado` de un paso `predecible` hasta que el alumno elige Sí/No; el motor no se detiene (la traza ya existe).

### 3.4 Traza (ADR 006)

La guarda la interfaz en `motor/traza/traza.ts` (código puro, compartido con las pruebas):

- `agregar(pasos)`; cada **256 pasos** un punto de control (ranuras, contadores de vuelta, cursor y búfer del `Scanner`, longitud de consola).
- `instantaneaEn(n, vista)` = punto de control anterior a `n` + ≤ 255 deltas (`estadoEn(n)` devuelve los primeros `n` pasos). **La `Traza` solo avanza desde el punto de control: no existe «deshacer un paso».** Ir a un paso anterior (retroceder uno, saltar atrás, reiniciar) parte de un punto de control y vuelve a aplicar los `cambios` hacia adelante. Saltar a cualquier paso de 100 000 cuesta microsegundos (C11).
- **`Cambio.anterior` es el valor de ESA variable, no el del nombre** (decisión de la tarea 3.1, hito 2-A; ADR 006): dos `for` seguidos con `int fila` (`e16-triangulos-y-tablas`) son dos variables con el mismo nombre, y la declaración de la segunda llega con `anterior` vacío aunque el nombre aún valiera algo; deshacer con él perdería ese valor. Por eso `anterior` solo alimenta lo que se muestra («cambió de 3 a 4») y nunca se usa para reconstruir un estado; la propiedad `pruebas/propiedades/traza-del-corpus.test.ts` vigila que partir de un punto de control dé lo mismo que reproducir desde 0, en cada paso de cada programa ejecutable del corpus.
- **Variables en alcance** se derivan estáticamente (`vivas` de cada nodo); «sin inicializar» es dinámico (la declaración escribe `SIN_VALOR` en cada vuelta); «salió de alcance» es la diferencia entre los nodos de n−1 y n.
- **Prueba de escritorio:** índice incremental de pasos relevantes (cambian variables, evalúan condición o imprimen); columnas **por nombre**, que no es ambiguo porque Java prohíbe el sombreado; tabla virtualizada.
- **Consola:** segmentos `out`/`err`/`eco` con índice acumulado por paso; se pinta solo la ventana visible.
- La traza sobrevive si hay que terminar el trabajador.

### 3.5 Límites y detención

| Límite (valor inicial, se ajusta al medir en el lote 3) | Qué pasa |
|---|---|
| 100 000 pasos Normal | paso `detenido`, causa `limite-pasos`, con diagnóstico del ciclo |
| 1 048 576 caracteres por cadena o 4 194 304 en consola | `limite-caracteres` (p. ej. `s += s` en un ciclo) |
| 15 s de cómputo | `limite-tiempo` (cooperativo) |
| 2 s sin mensajes del trabajador mientras calcula | el cliente lo termina (`limite-tiempo`); la traza recibida sigue navegable |

`diagnosticarCiclo(traza, vista)` toma el ciclo más interno activo al detenerse y, en sus últimas 100 vueltas, las variables de su condición que no cambiaron: da los datos de «`contador` siempre valió 1» (M15).

### 3.6 Excepciones

`stderr` = `Exception in thread "main" <clase>[: <mensaje>]\n`, luego `\tat <marco>\n` por cada marco de `java.base` y al final `\tat [paquete.]Clase.main(Clase.java:<línea>)\n`. Los marcos salen de la tabla generada por el oráculo con clave **(operación, modo de falla, *coder*)**: **[verificado en diseño]** `"abc".charAt(5)` da `String index out of range: 5` con `StringLatin1.charAt(StringLatin1.java:48)`, pero `"€bc".charAt(5)` da `index 5, length 3` con `String.checkIndex(String.java:4565)` y dos marcos de `StringUTF16`; `substring` no depende del *coder*. Casos de la tabla: `charAt`, `substring` (1 y 2 argumentos), `parseInt`/`parseDouble` (incluidos vacío y desbordamiento), `nextInt`/`nextDouble`/`nextBoolean`/`next`/`nextLine` (sin token, token inválido, desbordamiento con mensaje, `No line found`, `Scanner closed`), `Random.nextInt(n ≤ 0)`, excepciones de `Formatter`; `ArithmeticException` no tiene marcos de `java.base`. Con `package`, el marco del alumno lleva el nombre calificado. La **línea** sigue la tabla de líneas de javac: la del inicio de la sentencia, salvo que una invocación de método en otro renglón marque la suya; los programas generados en varios renglones (§7.5) la calibran. En pantalla: explicación en español primero, `stderr` exacto en rojo, marcos de `java.base` atenuados y el del alumno como enlace a su línea.

### 3.7 `Random` y semilla visible

`Random` es el LCG de 48 bits en `BigInt` ya validado (02 §9, con el `nextLong` con extensión de signo). Con semilla del programa, fidelidad total. Sin semilla (`new Random()`, `Math.random()`): la ejecución tiene una **semilla visible** `S` (6 dígitos por omisión, en el enlace, con botones «repetir» y «nueva»); la k-ésima instancia sin semilla usa la k-ésima `nextLong()` de `new Random(S)` (evita la correlación de semillas consecutivas del LCG) y la instancia oculta de `Math.random()` toma la siguiente en su primera llamada. El oráculo verifica esos programas **transformándolos** con la misma derivación (§7.2).

## 4. Fidelidad numérica y biblioteca

### 4.1 Reglas de enteros y casts

Ver la tabla de §3.1; se validan con `experimentos/numeros` (`Test01Int`, `Test05Casting`, candidatos 01–06) y con los conjuntos de §7.3.

### 4.2 `Double.toString` (ADR 008)

**[verificado en diseño]** Además de la banda de enteros, JDK 17 se aparta del «más corto» en tres clases que el conjunto de 45 293 casi no contiene:

- **(a) Empates en el borde:** de 149 985 decimales cortos `d×10^n` (d ≤ 9 999, n 12–26), 3 885 difieren y **todos** son empates: el más corto cae exactamente a medio ulp (el más corto lo admite por redondeo a par; Java excluye el borde). Java imprime el valor exacto redondeado HALF_UP al mínimo número de dígitos que queda estrictamente dentro (3 885/3 885, exponentes binarios 71–85; 4 empates en 86–89 sí coinciden): `1e23 → 9.999999999999999E22`, `2.1e22 → 2.0999999999999998E22`. Por debajo de 2⁵³ no puede haber empates.
- **(b) Potencias de dos** (intervalo asimétrico: el hueco inferior es la mitad): difieren 366 de 2 098; el modelo «mínimo número de dígitos del valor exacto, redondeado, estrictamente dentro de x ± 2^(e−54)» (la mitad del hueco menor) reproduce 2 035 de las 2 036 normales fuera de la banda; la excepción, 2⁻²⁵ (exacto `…953125`), sale `2.9802322387695312E-8`: con empate decimal exacto Java no redondea hacia arriba (¿a par o truncando?, lo decide el conjunto del lote 2). **Visible en clase:** un ciclo que divide entre 2 difiere en 2⁻²⁴ y 2⁻³¹ (también 2⁻⁴⁴ y 2⁻⁴⁵).
- **(c) Subnormales:** 26 de 20 104 (múltiplos pequeños de `MIN_VALUE` y potencias subnormales), p. ej. `Double.MIN_VALUE → 4.9E-324` (el más corto sería `5e-324`), `1.58E-322` (más corto `1.6E-322`).

Los vecinos de las potencias de dos nunca difieren, y los decimales cortos por debajo de 10⁻³ (`0.0007`, `3e-5`…) coinciden.

`digitosJava(x)` → `{ digitos, exponente }` y luego el formato:

1. `NaN`, `Infinity`, `-Infinity`, `0.0`, `-0.0` (signo por el bit 63, no por comparación).
2. **Subnormales** (`|x| < 2⁻¹⁰²²`): `MIN_VALUE` exacto; el resto, la regla que caracterice el lote 2 contra el conjunto denso de subnormales; si no se logra al 100 %, **aviso en ejecución** «No disponible» en vez de imprimir algo no verificado (D2).
3. **Banda de enteros** `2⁵³ ≤ |x| < 2⁶³`: dígitos exactos del entero (`BigInt`), quitar k dígitos finales con HALF_UP (k = 0 con exponente binario 53–57, 1 con 58–60, 2 con 61–62), quitar ceros finales (**[verificado en diseño]** `Math.pow(2,60) → 1.15292150460684698E18`, `2⁶²+2048 → 4.61168601842739E18`).
4. **Potencias de dos** (mantisa en cero, fuera de la banda): regla (b) en `BigInt` exacto.
5. **Resto de normales:** dígitos más cortos del motor JS (`x.toExponential()`; ECMA-262 fija la longitud mínima, no el último dígito) **corregidos** al candidato de esa longitud más cercano al valor exacto, comparando en `BigInt` con sus vecinos ±1 (empate exacto → dígito par); así el resultado no depende del motor. Si `|x| ≥ 2⁶³` y el candidato es un empate en el borde, regla (a); el conjunto denso de empates del lote 2 fija su límite de exponentes.
6. **Formato de Java:** si 10⁻³ ≤ |x| < 10⁷, decimal con al menos un dígito tras el punto; si no, `d.ddd…E±n` (al menos un dígito tras el punto, exponente sin `+`).
7. **Residual documentado:** `0x453d04ffce09b504` (Java trunca a `3.5082457001091195E25` aunque `…196` es más cercano); el conjunto aleatorio denso (≥ 200 000) mide si su clase tiene más miembros. Nunca se copia código de OpenJDK.

El camino rápido (paso 5 sin empate) cuesta dos conversiones de texto a número y, a veces, una comparación en `BigInt`; los caminos exactos solo corren en las clases raras. **C4 debe reformularse** (§12): 100 % en salón, banda, empates, potencias de dos y subnormales caracterizados; residual con frecuencia medida en el aleatorio denso.

### 4.3 `printf` y `String.format`

Analizador de `%[banderas][ancho][.precisión]conversión` sobre la sintaxis de `java.util.Formatter`; lo válido en Java pero fuera del alcance (`%e %g %x %o %h %t %a`, `%1$`, `+ ( #` y espacio) es NO-DISP; lo inválido lanza la excepción de Java con su mensaje y marcos (`UnknownFormatConversionException`, `MissingFormatArgumentException`, `IllegalFormatConversionException: f != java.lang.Integer`, `FormatFlagsConversionMismatchException`, `IllegalFormatPrecisionException`, `MissingFormatWidthException`…). `%f`/`%.Nf` usan `digitosJava` (incluidas banda y empates), HALF_UP mirando un solo dígito en la precisión y relleno con ceros (`%.2f` de 2.675 → `2.68`; `%.1f` de 2⁶⁰ → `1152921504606846980.0`, **[verificado en diseño]**); jamás `toFixed`. `%d` con `int`/`long`, `%s` (`String.valueOf`, así que un `double` sale con punto aun en `es-ES`), `%c` (char o `int` como punto de código; `long` → excepción), `%b`, `%n` = `\n` (separador de la máquina de referencia), `%%`, ancho y banderas `- 0 ,` con los símbolos del modelo regional. El formateador devuelve piezas (literal / especificador → texto) para la plantilla 21.

### 4.4 `Math` (ADR 009)

| Miembro | Implementación |
|---|---|
| `pow` | puerto de `e_pow.c` de fdlibm 5.3 (netlib, aviso de Sun conservado), con palabras de 32 bits por `DataView` y operaciones binary64 estrictas; jamás el `FdLibm.java` de OpenJDK |
| `sqrt`, `floor`, `ceil` | los de JS (IEEE en los tres motores), validados con conjunto del JDK en los tres navegadores |
| `abs`, `max`, `min` | por sobrecarga: `int`/`long` con vuelta (`abs(MIN_VALUE)` negativo), `double` con `-0.0` y `NaN` de Java |
| `round` | `double → long` (más cercano, empates hacia +∞, satura, `NaN → 0`); `int`/`long`/`char` → sobrecarga `float` (§2.7) |
| `random`, `PI`, `E` | instancia oculta con semilla visible; constantes |

Regla de lint en `src/motor`: prohibidos `Math.pow/exp/log*/sin/cos/tan/cbrt/hypot…` y el operador `**` (ECMA-262 los deja «aproximados por la implementación»).

### 4.5 Texto

| Operación | Trampa de JS | Cómo se hace |
|---|---|---|
| `trim` | JS quita U+00A0 y no quita `\u0000` | quitar extremos ≤ U+0020 (**[verificado en diseño]**) |
| `toUpperCase`/`toLowerCase` | Unicode de JS ≠ Unicode 13 | mapeo de JS + tabla de excepciones generada del JDK (65 536 chars y casos especiales) |
| `equalsIgnoreCase`, `compareTo` | no existen igual | por char con tablas del JDK; diferencia del primer char distinto o de longitudes |
| `replace(CharSequence, …)` | `$&`, `$1` en el reemplazo de JS | reemplazo literal (`split`/`join`) |
| `Character.is*`/`to*` | `\p{L}` usa otro Unicode | tablas JDK 17 codificadas por rangos |
| `Integer.parseInt` | JS acepta espacios y decimales | gramática de Java, signo, cualquier dígito Unicode (`"٣٤"` → 34, **[verificado en diseño]**), desbordamiento → `NumberFormatException` |
| `Double.parseDouble` | `Number("")` es 0, rechaza `"1.5f"` | gramática de Java (`trim` de Java, `NaN`, `Infinity`, sufijos `f/d`; hexadecimal → NO-DISP), `Number()` hasta 20 dígitos significativos y redondeo exacto en `BigInt` más allá |

`String.valueOf`, `new String(texto)` (identidad nueva), `length charAt substring indexOf equals…` directos sobre UTF-16 con los chequeos de límites de Java.

### 4.6 `Scanner`

Estado: texto recibido, cursor, `cerrado`, `eof`. Delimitador = `Character.isWhitespace` del JDK (no `\s` de JS: difieren en U+00A0 y U+001C–U+001F); separadores de renglón `\r\n | [\n \r U+2028 U+2029 U+0085]`. Tokens `int` con signo, agrupación regional y dígitos Unicode (fuera de rango → `InputMismatchException` con mensaje `For input string: "…"`); `double` con separadores regionales, `NaN` y `∞`; `boolean` sin distinguir mayúsculas. `InputMismatchException` no consume; `nextInt` deja el fin de renglón (error #12); `nextLine` en EOF → `NoSuchElementException: No line found`. La gramática se reescribe desde la documentación pública, sin copiar código; la valida `corpus/datos/scanner` (es-MX y es-ES).

### 4.7 Modelo regional único (ADR 012, P2)

```ts
interface Regional { id: 'es-MX' | 'es-ES'; decimal: string; miles: string; menos: string; nan: string; infinito: string }
```

Sus valores se generan de `DecimalFormatSymbols` del JDK. Lo consumen **solo** `Scanner` (entrada) y `Formatter` (`printf`/`String.format`): la opción «coma» es una JVM `es_ES` completa. `Double.toString`, `println(double)`, `String.valueOf` y la concatenación nunca lo usan (Java tampoco). Los goldens y conjuntos de `es-ES` se generan con `-Duser.country=ES`.

### 4.8 Salida

`print`/`println` por tipo estático; `println` agrega `\n` (el separador de la máquina de referencia, macOS); los sustitutos sueltos salen como `?` (lo que hace el codificador UTF-8 de la JVM); `System.out` y `System.err` se escriben en orden al mismo panel.

### 4.9 Contrato de la biblioteca (hito 1)

`src/motor/biblioteca/index.ts` es la **única puerta** por la que el intérprete usa la biblioteca: funciones puras y clases pequeñas, TypeScript sin DOM, Node ni dependencias (ADR 001), cada una comparada contra el JDK 17.0.18 real (`pruebas/diferencial/biblioteca/`, datos en `corpus/datos/`). Reglas comunes:

- **Lo que Java lanza** sale como `ExcepcionJava { clase, mensaje: string | null, sitio, marcos }`. Clase y marcos de `java.base` salen de la tabla `sitio → (clase, marcos)` que generó el oráculo corriendo programas reales (`datos/marcos-de-pila.generado.ts`, 74 sitios: modo de falla, *coder*, puerta `String.format`/`printf`); el mensaje lo arma quien lanza. El intérprete la atrapa → paso `excepcion`, y `formatearTrazaDePila(excepcion, marcosDelAlumno)` arma el `stderr` exacto (`marcosDelAlumno` va del más interno a `main`, con `paquete` si lo hay). `divisionEntreCero()` es la de `/` y `%` entre enteros (la lanza el intérprete). Cualquier otra excepción de JS es `error-interno`.
- **Lo que Java hace pero no está verificado al 100 %** sale como `NoDisponibleEnEjecucion { motivo }` → paso `detenido` con el aviso «No disponible» (la traza previa sigue navegable). Motivos: `double-hexadecimal` (`Double.parseDouble("0x1p3")`, `nextDouble` sobre un literal hexadecimal), `formato-fuera-de-alcance` (`%e %x %g`, banderas `+ ( # espacio`, `1$`, `%S`, fecha y hora, y combinaciones de falla que el oráculo no midió), `math-pow` (hasta portar fdlibm, tarea 2.5) y `mayusculas-fuera-del-plano-basico` (reservado). El compilador puede anticipar los patrones literales con `formatoSoportado`.
- **`Scanner` no bloquea**: si para responder falta entrada lanza `FaltaEntrada` (que NO es una excepción de Java) **sin cambiar su estado visible**; el intérprete restaura la instantánea (`capturar()`/`restaurar()`), pide el renglón y reintenta la sentencia. Con `cerrarEntrada()` (EOF) se comporta como `java < archivo`.
- **Valores**: `int`, `char` (0–65535) y `double` son `number`; `long` es `bigint`; `boolean` es `boolean`; `String` es `CadenaJava` (identidad por referencia: dos cadenas son «la misma» si y solo si son el mismo objeto) y el tipo estático de lo que se imprime o concatena se pasa como `TipoImprimible` (`'int' | 'long' | 'double' | 'char' | 'boolean' | 'String'`).

| Pieza | API (todo se exporta desde `biblioteca/index.ts`) | Verificada contra |
|---|---|---|
| `Double.toString` (2.3, 2.4) | `digitosJava(x): {digitos, exponente}` · `doubleATexto(x): string` | ≈ 3 millones de `double` del JDK (todos los exponentes, subnormales, vecinos de 10ⁿ, banda, empates, potencias de dos): 100 % |
| `print`/`println` (2.13) | `valorATexto(tipo, valor)` (= `String.valueOf`, también para `+`) · `new FlujoDeSalida()` con `.print(tipo, valor)` / `.println(tipo?, valor?)` → texto que llega a la consola (un `FlujoDeSalida` por `System.out` y por `System.err`) · `FIN_DE_LINEA` | programa real en el JDK (sustitutos sueltos → `?`, alto pendiente entre dos `print`) |
| `Scanner` (2.12) | `new ScannerJava(regional)` · `.agregarEntrada(texto)` · `.cerrarEntrada()` · `.capturar()`/`.restaurar(estado)` · `.nextInt() .nextDouble() .nextBoolean() .next() .nextLine() .hasNext() .hasNextInt() .hasNextDouble() .hasNextLine() .close()` · `FaltaEntrada` | 8 340 casos de token y 2 500 secuencias × (es-MX, es-ES): 100 % |
| `printf`/`String.format` (2.8) | `formatear(patron, argumentos: {tipo, valor}[], regional, via: 'String.format' \| 'printf'): string` · `formatearEnPiezas(…)` (literal/especificador, para la plantilla 21) · `formatoSoportado(patron)` · `simbolosRegionales(regional)` | 12 456 casos es-MX + 2 556 es-ES: 100 % (más los «fuera de alcance» = «No disponible» o exacto) |
| Excepciones (2.14) | `ExcepcionJava` · `crearExcepcion(sitio, mensaje)` · `existeSitio(texto)` · `divisionEntreCero()` · `formatearTrazaDePila(excepcion, marcos)` · `formatearMarcos` · `textoDeLaExcepcion` | 127 escenarios reales: `stderr` completo byte a byte |
| `String` (2.9) | `nuevaCadena(texto)` · `new PoolDeCadenas().internar(texto)` · `StringJava.{length, charAt, substring, indexOf, indexOfChar, equals, equalsIgnoreCase, compareTo, toUpperCase, toLowerCase, trim, isEmpty, contains, startsWith, endsWith, replace, replaceChar, valueOf(tipo, valor), nueva}` (`substring(0)`, `trim` sin nada que recortar, `replace` sin coincidencias y mayúsculas sin cambios devuelven la **misma** instancia, como Java) | 17 690 operaciones (con identidad `==`) + los 131 070 puntos de código del plano básico y el plano 1 |
| `Character` (2.10) | `isDigit isLetter isLetterOrDigit isUpperCase isLowerCase isWhitespace toUpperCase toLowerCase` (sobre el `char` como número) · `digitoDecimal` | los 65 536 `char`: 100 % (tabla Unicode 13 generada: 2 186 tramos) |
| `Integer`/`Double`/`Long` (2.11) | `Integer.{parseInt, MAX_VALUE, MIN_VALUE}` · `Double.{parseDouble, MAX_VALUE, MIN_VALUE}` · `Long.{MAX_VALUE, MIN_VALUE}` (sin `parseLong`, REQ-SUB-007) | 3 294 entradas de aula, de error y al azar: 100 % (los hexadecimales de `double` son «No disponible») |
| `Math` (2.6) | `MathJava.{PI, E, absInt/Long/Double, maxInt/Long/Double, minInt/Long/Double, sqrt, floor, ceil, roundDouble → long, roundInt/roundLong/roundChar/roundFloat → int, random(fuente), pow}`; el intérprete elige la variante por el tipo estático (`Math.round(long)` no existe: va a `roundLong`, que pasa por `float`) | 3 138 operaciones: 100 %; `pow` = «No disponible» |
| `Random` (2.7) | `new RandomJava(semilla: bigint)` con `.nextInt() .nextInt(cota) .nextLong() .nextDouble() .nextBoolean()` · `new FuenteDeAleatorios(semillaVisible)` con `.nuevoSinSemilla()` y `.mathRandom()` · `FuenteDeAleatorios.semillaVisibleNueva(azar)` | 17 semillas × todos los métodos (≈ 35 000 valores): 100 % |

**Hallazgos del hito 1 que corrigen o precisan lo anterior:**

- **§4.2 (`Double.toString`)** — no se implementaron «cinco clases con reglas empíricas» sino **un solo generador de dígitos exacto** (Steele-White en `BigInt`: extremos excluidos, hueco simétrico en las potencias de dos, camino de enteros hasta 2⁶³ con 0–2 dígitos HALF_UP) más lo que el JDK hace con su estimación del exponente decimal: la aproximación lineal de log₁₀ da `k` o `k+1`, y con `k+1` una potencia de diez dentro del intervalo conserva un cero inicial (`2·MIN_VALUE` → `1.0E-323`, no `9.9E-324`); en notación científica la primera cifra real no puede terminar la generación solo si la estimación fue exacta (`MIN_VALUE` → `4.9E-324`). No se leyó ni se copió código de OpenJDK (ADR 016).
- **El «residual» `0x453d04ffce09b504` no es un caso aislado sino una clase entera**: todos los `double` con exponente binario 84 (2⁸⁴ ≤ x < 2⁸⁵), el 2,6 % de ellos. Causa: el JDK hace la generación con `long` cuando todo cabe en 63 bits y, con divisor 10·5²⁵, la suma `b + m` de la prueba de «lo generado + 1 cae dentro» puede pasar de 2⁶³ y dar negativo → trunca en vez de redondear; si `m` mismo pasa de 2⁶³ el JDK da por ciertos los dos límites. Se reproduce emulando el `long` (`BigInt.asIntN(64, …)`) cuando el exponente decimal y la estimación son 25 y el exponente binario está entre 77 y 87. En todo lo medido —≈ 3 millones de `double` de todos los exponentes, subnormales, vecinos de potencias de diez y literales cortos, más 200 000 frescos en cada corrida de `npm run test:oraculo`— el motor coincide con el JDK en el 100 %: ya no hay residual conocido (C4 puede reformularse como «100 % en lo medido»).
- **`Scanner`** (medido, no deducible de la documentación): tras un `InputMismatchException` **sí se consumen los separadores que precedían** al token (el token no); `hasNextLine()` guarda su resultado y el `nextLine()` siguiente lo usa **aunque el `Scanner` se haya cerrado entre los dos**; `nextDouble` sobre `∞` da `InputMismatchException: For input string: "∞"` (el patrón lo acepta pero `Double.parseDouble` no); con agrupación de miles `"1,000"` se lee como 1000 en es-MX y `"1.000"` en es-ES.
- **`String`**: con sustitutos (emoji) `toUpperCase`/`toLowerCase` siempre arman una instancia nueva aunque no cambie nada; la sigma final (`ΟΔΟΣ` → `οδος`) depende del contexto; el *coder* sale del contenido (Java 17 comprime al construir). **`printf`**: los ceros de relleno no se agrupan (`%,010d` de 1000 → `000001,000`); los errores de patrón salen antes de imprimir nada; `Double.parseDouble` recorta con `trim` de Java y cita el texto recortado en el mensaje (`1.5.5` → `multiple points`).
- **Datos**: `npm run oraculo:conjuntos` regenera `corpus/datos/{double-tostring, caracteres, cadenas, matematicas, random, printf, parseo, scanner, marcos}` y los `src/motor/biblioteca/datos/*.generado.ts` (≈ 45 s); `npm run test:oraculo` exige bytes idénticos a lo guardado y compara 200 000 `double` frescos. Tamaños más acotados que los de §7.3 (salón 15 108, aleatorios 27 997, `printf` 15 012, `Character` completo): el denso se genera en cada corrida en vez de guardarse.
- **Pendientes** (anotados en tasks.md): `Math.pow` con fdlibm (2.5); `Double.parseDouble` hexadecimal; combinaciones raras de excepción de `Formatter` (`%5n`, `%.2%`); el conjunto de `printf` no cubre todas las conversiones de fecha y hora (son «No disponible»).

## 5. Protocolo del Web Worker (ADR 007)

| Dirección | Mensaje | Campos |
|---|---|---|
| UI → T | `ejecutar` | `id`, `fuente`, `config` |
| UI → T | `entrada` · `cerrar-entrada` | `id`, `renglon` · `id` |
| UI → T | `detener` | `id` (si no responde en 300 ms, `terminate()`) |
| T → UI | `compilado` | `id`, `{ vista }` o `{ problema, adicionales }` |
| T → UI | `pasos` | `id`, `desde`, `pasos[]` (≤ 2 000 pasos o ≤ 16 ms por lote) |
| T → UI | `espera-entrada` | `id`, `nodo` (la lectura pendiente = «línea siguiente») |
| T → UI | `fin` · `error-interno` | `id`, `fin` · `id`, `mensaje` |
| T → UI | `detenido` | `id` — el acuse de `detener` (hito 2, parte A): el trabajador dejó de correr esa ejecución |

- **`detener` siempre recibe su `detenido`.** El trabajador lo manda aunque la ejecución ya no existiera; si no llega en 300 ms, el cliente termina al trabajador (`terminate()`), deja listo al de repuesto y **fabrica él mismo** el `detenido`. Así la interfaz no necesita su propio plazo.
- **Qué hace la pantalla con `detenido`** (hito 2, parte C): si la ejecución vigente seguía calculando o esperando un dato, queda `detenida` — no hay `fin` que resumir y ya no llegarán pasos —, el robot lo dice («Así terminó: la ejecución se detuvo antes de llegar al final del programa.»), el campo de la consola desaparece y lo ya calculado sigue navegable; si ya había terminado, el acuse no cambia nada. Un mensaje de una ejecución ya reemplazada (otro `id` que el vigente) se ignora —el contenedor compara con el `id` de la ejecución **vigente**, no con el del cliente que lo mandó— y «Editar programa» también invalida la ejecución que se deja.
- **Un trabajador por ejecución** y uno de repuesto ya cargado: editar o volver a visualizar termina el anterior; no hay estado viejo que limpiar.
- El trabajador corre `avanzar` en rebanadas de ≤ 8 ms y cede con `MessageChannel` (sin la espera mínima de `setTimeout` anidado); los límites son cooperativos dentro del motor.
- Clonación estructurada (conserva `BigInt`, `-0`, `NaN`); nada de JSON ni de `SharedArrayBuffer` (GitHub Pages no manda COOP/COEP).
- **UI ≤ 100 ms:** el hilo principal solo agrega lotes (O(lote)) y navega con `Traza.estadoEn` (síncrono); el perro guardián vive en el cliente.

```mermaid
sequenceDiagram
  actor A as Alumno o docente
  participant UI as interfaz
  participant C as cliente
  participant W as trabajador
  participant M as motor
  A->>UI: Visualizar
  UI->>C: ejecutar(fuente, config)
  C->>W: ejecutar {id, fuente, config}
  W->>M: compilar(fuente)
  alt hay problema
    W-->>C: compilado {problema, adicionales}
    C-->>UI: sigue en edición: línea marcada + mensaje (aria-live assertive)
  else compila
    W-->>C: compilado {vista}
    loop rebanadas de ≤ 8 ms
      W->>M: avanzar(n)
      M-->>W: pasos
      W-->>C: pasos {desde, pasos[]}
      C->>UI: traza.agregar(); versión++ (a lo más una vez por cuadro)
    end
    W-->>C: fin {causa}
  end
  A->>UI: → ← Inicio Fin deslizador
  UI->>UI: estadoEn(n) → derivarModeloVista() → render (sin trabajador)
```

```mermaid
sequenceDiagram
  participant UI as interfaz
  participant C as cliente
  participant W as trabajador
  participant M as motor
  W->>M: avanzar()
  M->>M: int edad = sc.nextInt(): instantánea, Scanner sin datos → FaltaEntrada
  M->>M: no quedan renglones preparados → restaura la instantánea
  M-->>W: espera-entrada (pasos previos, nodo)
  W-->>C: pasos + espera-entrada {nodo}
  Note over UI: el alumno sigue navegando; al llegar al último paso,<br/>la lectura es la línea siguiente y la consola muestra el campo
  UI->>C: renglón «25»
  C->>W: entrada {renglon: "25\n"}
  W->>M: darEntrada(); avanzar()
  M->>M: reintenta la sentencia: eco «25⏎» junto al mensaje del print, edad = 25
  M-->>W: pasos…
```

```mermaid
sequenceDiagram
  participant UI as interfaz
  participant C as cliente (perro guardián)
  participant W as trabajador
  W-->>C: pasos (cada ≤ 16 ms)
  alt límite cooperativo (pasos, caracteres o tiempo)
    W-->>C: fin {limite-pasos, diagnóstico del ciclo}
    C-->>UI: «Se detuvo por seguridad» con datos («contador siempre valió 1»), ya desde el paso 0 del robot
  else 2 s sin mensajes mientras calcula
    C->>W: terminate()
    C->>C: activa el trabajador de repuesto
    C-->>UI: fin limite-tiempo; la traza recibida sigue navegable
  end
```

## 6. Interfaz

### 6.1 Componentes y estado (ADR 013, ADR 015)

```
<App>                    contenedor raíz: EstadoApp (useReducer), ClienteTrabajador, enlace, PWA
├─ <BarraSuperior/>      Galería · Compartir · Ajustes (nivel, predicción, proyector, coma, semilla) · Ayuda · versión
├─ <Visualizador>        contenedor: useSyncExternalStore(Traza) → derivarModeloVista() (presentacion, puro)
│  ├─ <ZonaCodigo>       <EditorJava modo resaltados onCambio/>
│  ├─ <ZonaEstado>       pestañas <PanelVariables/> ⇄ <PruebaDeEscritorio/>
│  ├─ <ZonaConsola>      <Consola/> <FranjaBufer/> <CampoEntrada/>
│  └─ <ZonaExplicacion>  <AvisoProblema/> | <Explicacion/> <CadenaSustitucion/> <PreguntaPrediccion/>
├─ <BarraControles/>     ⏮ ◀ ▶ ⏭ ⏯ velocidad · deslizador «paso X de Y» · Normal/Detallado
└─ <DialogoGaleria/> <DialogoCompartir/> <DialogoAjustes/> <DialogoAyuda/> <AvisoVersionNueva/>
```

```ts
interface EstadoApp {
  modo: 'edicion' | 'compilando' | 'visualizacion';
  codigo: string; entradaPreparada: string;
  ajustes: { nivel: 'normal' | 'detallado'; prediccion: boolean; proyector: boolean;
             regional: 'es-MX' | 'es-ES'; semilla: string | null };      // null = nueva en cada ejecución
  ejecucion: { id: number; estado: 'calculando' | 'esperando-entrada' | 'terminada';
               total: number; fin?: FinEjecucion; problema?: { problema: Problema; adicionales: number } };
  navegacion: { paso: number; subpaso: number; reproduciendo: boolean; velocidad: 1 | 2 | 3 | 4 | 5;
                prediccion?: { paso: number; respuesta?: boolean } };
  pestanaEstado: 'variables' | 'prueba'; dialogo: null | 'galeria' | 'compartir' | 'ajustes' | 'ayuda';
}
```

La `Traza` vive fuera de React (almacén mutable con versión); los presentacionales reciben el `ModeloVista` por *props*. Los textos salen solo de `src/textos/es-MX` (funciones tipadas por sus datos: completas por construcción, C9); una regla local de ESLint rechaza texto literal en JSX y en `aria-label`/`title`/`placeholder` (C18).

### 6.2 Zonas (≤ 4 vistas) y flujos de pantalla

Cuatro zonas fijas en el mismo campo visual: **código · estado (Variables ⇄ Prueba de escritorio) · consola · explicación**. Lo contextual entra en una zona existente, no suma paneles: la cadena de sustitución, la rama ✓/✗ y la pregunta de predicción van en la explicación; la franja del búfer, en la consola; el contador de vueltas, como etiqueta junto al encabezado del ciclo en el editor.

| Situación | Qué ve el alumno |
|---|---|
| Primera visita | editor con un «Hola, mundo», botón principal **Visualizar** y la galería a la vista; nada que configurar |
| Paso 0 | «Todavía no se ejecuta nada»; marcada la línea siguiente; foco en ▶ |
| Error de compilación / No disponible | sigue en edición; línea subrayada (distinto estilo para cada categoría), icono y título propios; mensaje anunciado |
| Espera de entrada | campo en el mismo renglón que el mensaje del `print`; plantilla 22; ▶ lleva al campo |
| Predicción activa en paso predecible | «¿Entra al if?» / «¿Se repite el ciclo?» Sí/No; el resultado y las marcas de rama se revelan al contestar; retroalimentación sin «incorrecto» a secas |
| Excepción / error de arranque | explicación en español primero; `stderr` exacto (o texto del lanzador) como detalle; marco del alumno enlazado |
| Detenido por seguridad | datos del ciclo y una sugerencia; la traza sigue navegable |
| Proyector | código ≥ 24 px, controles grandes, disposición 4:3 (zonas apiladas a la derecha); puede ocultar Normal/Detallado |

### 6.3 CodeMirror 6

Paquetes: `@codemirror/state`, `view`, `language`, `commands`, `lang-java` (solo resalta; el análisis es del motor). Extensiones: números de línea, historial, sangría al pulsar Enter, correspondencia de llaves, resaltado, `Compartment` para solo lectura (en visualización) y para el tema (proyector). Un `StateField` recibe por `StateEffect` los resaltados del `ModeloVista`: línea recién ejecutada y línea siguiente (clase de línea + marcador de canal ▶/▷ con texto accesible), subexpresión actual (marca con contorno), rama no tomada (atenuada + etiqueta «✗ esta rama no se ejecuta»; los rangos salen de `VistaPrograma.ramasDeIf`, que el motor entrega con `compilar()`), «no evaluado» (tachado + etiqueta), error y aviso (subrayado ondulado o punteado + marcador ✖/ⓘ), contador de vueltas (*widget*). Tab no se captura (sin trampa de teclado, WCAG 2.1.2). El editor es un presentacional: recibe `modo` y `resaltados`, emite `onCambio`.

### 6.4 Consola (D7) y búfer

Un `<pre>` con segmentos: salida normal, `err` en rojo con icono, **eco de la entrada** con otro color *y* subrayado (rasgo no cromático), en el mismo renglón que el mensaje del `print`; sin mensajes del IDE. La franja del búfer («Pendiente: ␣30⏎», con espacios y ⏎ visibles) aparece solo si el paso tocó el `Scanner` o queda texto pendiente.

### 6.5 Galería, enlace y proyector (ADR 014)

- **Galería (D6):** se arma en *build* con `import.meta.glob` sobre `corpus/{curso,autoria}` (programa, entrada, `.meta.json` con unidad, origen «del curso»/«de autoría», «Qué observar», semilla y ajustes sugeridos). Los mismos archivos son goldens: la galería no puede divergir del oráculo.
- **Enlace:** `#v=1&codigo=…&entrada=…&semilla=…&nivel=detallado&prediccion=1&proyector=1&regional=es-ES` con `lz-string` (`compressToEncodedURIComponent`) en `codigo`/`entrada`; se analiza a mano porque `URLSearchParams` convierte `+` en espacio; versión desconocida o dato dañado → aviso, nunca un programa corrupto; si pasa de 2 000 caracteres, descargar/abrir `.java` (sin red).

### 6.6 Accesibilidad AA

Teclado completo (→ ← Inicio Fin Espacio cuando el foco no está en un campo de texto, más botones con `aria-keyshortcuts`); foco visible; explicación en `aria-live="polite"` y errores/excepciones en `assertive`; nada solo por color (iconos, textos, estilos de línea); contraste AA con variables CSS para claro/oscuro; `prefers-reduced-motion` quita transiciones sin perder información; disposición en *grid* con `rem` que aguanta zoom al 200 %.

### 6.7 Sin red

PWA con *precache* de todo (incluidos trabajador y galería); fuentes del sistema (cero bytes); `<meta http-equiv="Content-Security-Policy">` con `connect-src 'self'` (lo que CodeMirror necesite para sus estilos se verifica en el lote 0); sin telemetría ni cookies; `localStorage` solo para preferencias con clave versionada.

## 7. Arquitectura de pruebas

### 7.1 Mapa

| Capa | Herramienta | Qué | Cuándo |
|---|---|---|---|
| Unidad | Vitest (Node) | cada módulo del motor, presentación, textos, protocolo | cada commit |
| Diferencial | Vitest + goldens | corpus completo: `stdout`/`stderr`/orden combinado byte a byte, sin JDK | cada commit |
| Propiedades | Vitest + fast-check + conjuntos del oráculo | §7.3; invariantes de la traza (`estadoEn(n)` = reproducir desde 0; interactiva = preparada) | cada commit |
| Compilación | Vitest | 37 casos del catálogo, una muestra por construcción NO-DISP, ≥ 2 000 mutantes contra veredictos de javac guardados; corpus por familia con los goldens del oráculo (`corpus/experimentos/*`: la regla modelada, el aviso honesto y los controles que javac compila); las 21 formas de anidar del verificador contra los topes de anidamiento (tarea 1.37) | cada commit |
| Componentes | Vitest (jsdom) + Testing Library | reductor, presentacionales, enlace ida y vuelta | cada commit |
| Motor en navegadores | Vitest modo navegador (`@vitest/browser-playwright`) | diferencial + propiedades en Chromium, Firefox y WebKit (C17) | cada commit |
| E2E | Playwright ×3 motores + `@axe-core/playwright` | flujos MUST con teclado, AA (C14), sin red (C12), predicción (C19), proyector (C16), enlaces de la galería (C15), base no raíz; el tope de anidamiento medido en el trabajador REAL (21 formas, un `Worker` frío por caso: nunca `error-interno`, tarea 1.37) | cada commit |
| Rendimiento | Playwright Chromium, CPU ×4 | C10, C11; tamaño C13 por script | cada commit con umbral holgado; oficial en la máquina de referencia |
| Oráculo | JDK 17.0.18 (macOS arm64) | regenerar goldens y datos y exigir bytes idénticos | cambios en `corpus/`, `herramientas/oraculo/`, datos; nocturno |
| Nocturno | JDK + fast-check | ≥ 1 000 programas generados; regenerar veredictos de mutantes | cada noche |
| Plataforma | JDK x86_64 | medir `Math.pow` (§8); nunca bloquea | semanal y manual |

### 7.2 Arnés diferencial (ADR 011)

```mermaid
sequenceDiagram
  participant D as desarrollador o job del oráculo
  participant H as herramientas/oraculo
  participant J as JDK 17.0.18
  participant R as corpus/
  participant T as npm test (sin JDK)
  D->>H: npm run oraculo:goldens
  H->>H: verifica versión «17.0.18» y copia a dir temporal como Clase.java (paquete → subcarpeta)
  H->>J: javac -encoding UTF-8 -g
  H->>J: java -Duser.language=es -Duser.country=MX -Dfile.encoding=UTF-8, stdin = bytes de .entrada.txt
  J-->>H: stdout y stderr como Buffer; 2.ª corrida con un solo descriptor para el orden combinado; código; SIGKILL al vencer el tiempo
  H->>R: nombre.salida · nombre.errores · nombre.combinada · nombre.oraculo.json
  T->>R: lee goldens
  T->>T: el motor ejecuta con la misma entrada (EOF al final) → UTF-8 → compara byte a byte
```

`child_process.spawn` con tiempo límite propio (macOS no trae `timeout`); nunca `$(...)`. `.gitattributes` con `corpus/** -text`. Programas con `Random` sin semilla: `transformar-semilla.ts` reemplaza `new Random()` y `Math.random()` por la derivación de §3.7 antes de compilar. El ciclo infinito de U6 se marca `esperado: limite-pasos` y se prueba por propiedad (C1).

### 7.3 Conjuntos del oráculo (`corpus/datos/`, generados)

| Conjunto | Contenido | Criterio |
|---|---|---|
| `double-tostring/` | salón (19 828), aleatorios (25 465), aleatorio denso (≥ 200 000), banda 53–62 (≥ 1 000 por exponente, con empates), empates (decimales cortos en todos los exponentes con empate posible), las 2 098 potencias de dos y vecinos, subnormales | C4 reformulado |
| `printf/` | ≥ 30 000 dobles × precisiones 0–20 (incl. banda, empates, potencias de dos, subnormales, `NaN`, `-0.0`), `%d` con `int`/`long`, anchos y banderas, errores de formato, en `es-MX` y `es-ES` | C5 |
| `random/` | ≥ 8 semillas × todos los métodos × 1 000 valores (incl. `nextInt(n)` con rechazo) | C6 |
| `pow/` | ≥ 26 000 pares (rejilla de salón: bases −20…20, 0.5…, 1.05; exponentes enteros −10…30, mitades) + aleatorios, con bits de `Math.pow` y `StrictMath.pow` | C6 |
| `caracteres/` | 65 536 chars × métodos de `Character` + mapeos de mayúsculas/minúsculas de `String` | C6 |
| `scanner/`, `parseo/` | tokens aceptados/rechazados y valores (`es-MX`, `es-ES`), `parseInt`/`parseDouble` | fidelidad de entrada |
| `marcos/`, `api/`, `regional/` | marcos por sitio de excepción; firmas públicas de las clases soportadas; nombres de `java.lang`/`java.util`; símbolos regionales; mensajes del lanzador. `api/clases-que-chocan.jsonl` (tarea 1.37): los 296 nombres planos de clase (`Shutdown`, `Thread$State`) que javac rechaza como nombre de paquete, medidos con una compilación por lotes y confirmados uno a uno. `api/paquetes-de-modulos.jsonl` (tarea 1.39): los 871 paquetes de los módulos del sistema con lo que hace el JDK real con un programa en cada uno (`javac-rechaza` 226, `arranca` 129, `no-carga` 516) | ADR 010 |

Las tablas de ejecución derivadas (`src/motor/biblioteca/datos/*.generado.ts`, por rangos) salen de los mismos generadores.

### 7.4 Mutantes y veredictos (C7)

`mutantes.ts` aplica, con semilla fija, mutaciones de un solo token a los programas de `curso` y `autoria` (borrar, duplicar, intercambiar vecinos, cambiar operador, identificador, tipo o literal por otro **del alcance**, quitar o poner `; { } ( )`); las mutaciones que introducirían un token fuera del alcance no se generan. `CompiladorEnLote.java` compila todos en una sola JVM con `javax.tools` (javac tarda ≈ 0.25 s por archivo, **[verificado en diseño]**) y guarda `{ id, base, mutacion, compila, linea, codigoJavac }` en `corpus/mutantes/veredictos.jsonl`. `npm test` compara veredicto (100 %), línea (≥ 95 %) y código.

### 7.5 Programas generados (C3)

`pruebas/generadores/programas.ts` (fast-check) genera AST válidos del subconjunto (ciclos acotados, lecturas con su entrada, `printf` válidos, a veces en varios renglones para calibrar líneas de excepción) y los imprime como Java. El job nocturno los corre en el JDK (una JVM por programa, en paralelo) y en el motor; un fallo se encoge y queda en `corpus/regresiones/`.

## 8. Riesgo de `Math.pow` en x86_64 (laptops Windows)

1. **Paso local (lote 0):** con Docker Desktop encendido (está instalado; el demonio no corría hoy), `docker run --rm --platform linux/amd64 -v "$PWD":/w -w /w eclipse-temurin:17 java herramientas/oraculo/java/MedirPow.java corpus/datos/pow/pares.csv > informe-amd64.csv`. Es indicativo: corre traducido por Rosetta.
2. **Medición autoritativa (lote 0, job `plataforma`):** `ubuntu-latest` y `windows-latest` (x86_64) con Temurin 17.0.18 corren el mismo `MedirPow` y publican cuántos pares cumplen `Math.pow ≠ StrictMath.pow`, cuáles y cuáles son de la rejilla de salón. Nunca bloquea.
3. **Decisión:** la verdad sigue siendo fdlibm (D3; §9 de la propuesta deja fuera las diferencias de plataforma). Si no difiere ningún par de salón: se documenta la tasa y se cierra el riesgo. Si difieren pares de salón: se escala al PO con la lista y dos opciones: (a) solo documentarlo en Ayuda; (b) además, una nota contextual en la explicación cuando los argumentos de un `pow` estén en la lista medida («en una laptop con procesador Intel o AMD, NetBeans podría mostrar otro último dígito»). El motor no cambia en ningún caso.

## 9. Scripts, CI y despliegue

| Script | Comando |
|---|---|
| `dev` · `build` · `preview` | `vite` · `vite build` · `vite preview` |
| `test` | `vitest run --project motor --project interfaz --reporter=dot` |
| `test:oraculo` | `vitest run --project oraculo --reporter=dot`: pruebas de `herramientas/oraculo/**`, que requieren el JDK 17 real; `test` nunca las incluye (tarea 0.18). **Tarea 1.35 (estabilidad):** una JVM tarda de 5 a 10 veces más en arrancar con la CPU saturada, así que NINGÚN límite de este proyecto es el de omisión: el proyecto fija `testTimeout` y `hookTimeout` en `LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS` (10 minutos, `herramientas/oraculo/limites-de-pruebas.ts`, el mismo tope que `compilarEnLote` se da a sí mismo; `limites-de-pruebas.test.ts` lo vigila y prohíbe los topes escritos a mano), y `generarDatos` da `LIMITE_MS_DE_LAS_SONDAS` (60 s) a sus sondas y distingue «no terminó a tiempo» de «salida truncada» (antes, los 5 s por omisión de `ejecutar.ts` producían «se leyeron 0 clases»). Medido con el código de la tarea: cinco corridas seguidas en reposo y dos con la CPU cargada (8 y 16 procesos `yes` sobre 8 núcleos), todas en verde |
| `test:navegadores` | `vitest run --project navegadores --reporter=dot` |
| `e2e` · `rendimiento` | `playwright test --reporter=dot` · `playwright test -c pruebas/rendimiento --reporter=dot` |
| `lint` · `tipos` | `eslint . --quiet` · `tsc -p` por cada tsconfig con `noEmit` |
| `presupuesto` · `licencias` | `node herramientas/presupuesto-tamano.ts` (≤ 500 KB comprimidos) · `node herramientas/licencias.ts` |
| `ci` | lint + tipos + test + build + presupuesto + licencias |
| `oraculo:goldens` · `oraculo:verificar` · `oraculo:datos` | `node herramientas/oraculo/{generar-goldens,verificar-goldens,generar-datos}.ts` |
| `oraculo:mutantes` · `oraculo:generados` · `medir:plataforma` | `node herramientas/oraculo/{mutantes,programas-generados,medir-plataforma}.ts` |

Node 22.23.1 ejecuta los `.ts` de `herramientas/` directamente (**[verificado en diseño]**: elimina tipos; rechaza `enum`, por eso `erasableSyntaxOnly` en todo el repo).

**`oraculo:generados`: arranca en la tarea 1.31 con veredictos de COMPILACIÓN; la 2.21 lo extiende a la EJECUCIÓN.** `npm run oraculo:generados -- --semilla N --cantidad M [--salida ruta] [--max-reducir K]` (`herramientas/oraculo/programas-generados.ts`, piezas en `herramientas/oraculo/generados/`) genera programas pequeños del subconjunto —una clase con `main`, 1 a 6 sentencias, guiados por tipos, deterministas por semilla, cerca de la mitad aceptados por javac y la otra mitad no—, los compila con `javac` 17 en una sola JVM (`CompiladorEnLote.java`; `--solo-sintaxis` usa `JavacTask.parse()` para medir la sintaxis con javac mismo) y con `compilar()`, clasifica cada par de veredictos (falso acepto, falso rechazo y fallo interno son discrepancias; la coincidencia de línea, cuando ambos rechazan, se reporta sin fallar), **reduce** cada discrepancia por sentencias y subexpresiones al programa mínimo que la conserva (cada candidato se vuelve a verificar con javac), las agrupa en **familias** (tipo + clave de javac + respuesta nuestra + construcciones del mínimo) y escribe un informe JSON reproducible; sale con código ≠ 0 ante cualquier discrepancia y con 2 si los argumentos o el JDK están mal. Es una compuerta de CI (`oraculo.yml`: PR y *push* con semilla fija y 3 000 programas; de noche, 40 000 con la semilla del día) y **nunca** entra en `npm test` ni en `npm run test:oraculo`: el generador puede encontrar discrepancias y esas dos suites siguen verdes; lo que sí prueba `test:oraculo` es el propio generador (determinismo, cobertura de construcciones, sintaxis medida con javac, mezcla, clasificador con compiladores falsos y reductor verificado contra javac). La **tarea 2.21** lo extiende a la ejecución (salida y excepciones, una JVM por programa según §7.5) sobre la misma estructura: `generados/campana.ts` compara un veredicto por fase y el clasificador, el reductor y el informe no cambian; el generador de la 2.21 (`pruebas/generadores/programas.ts`, fast-check) sigue siendo el de programas VÁLIDOS con entrada y `printf`, y este es el que también se equivoca a propósito. **Tarea 1.34:** la gramática suma las cuatro familias de falsos aceptos que la re-verificación independiente halló FUERA de ella —A una sentencia antes del primer `case`, B `args` y `System.in`/`System.out`/`System.err` como valor, C la clase del programa con nombre de una clase del JDK (estratificada: 1 de cada 20 programas, los 11 nombres en rotación, con su uso como primera sentencia), D una expresión entre paréntesis como sentencia— y nombres de `Object.prototype` como identificadores (E); las formas de literal raro también se estratifican (1 de cada 16). Compila ≈ 44 % de los programas. **Tarea 1.35:** el programa deja de ser solo un cuerpo de `main` —suma `miembros` (campos, válidos o sin su `;`, clases selladas, métodos), la firma de `main`, un archivo sin clase y un carácter escrito como escape Unicode— y la gramática suma las familias de falsos RECHAZOS que la re-verificación halló fuera de ella: `instanceof` con patrón, clases anónimas, `for` mejorado con cualquier tipo, `main` con otra firma, clases selladas, campos en varias líneas y sin `;`, `import` con comodín, escapes Unicode con significado sintáctico y, tras la mutación por elemento de los conjuntos del reconocedor de casts, **un tipo en posición de expresión** (literales de clase, casts a arreglos, genéricos e intersecciones, `Tipo[]::new`, `Tipo<A>::new`) y un emoji en un `char`. Las estructuras (68 formas verificadas con el parser de javac, `--solo-sintaxis`) se estratifican 1 de cada 12 programas (`PERIODO_DE_LAS_ESTRUCTURAS`), nunca coinciden con los casts (0 mod 8), los literales raros (3 mod 16) ni las clases del JDK (7 mod 20); el reductor sabe quitar un miembro, la firma de `main`, el escape y las variantes de cada estructura. El generador nuevo contra el compilador de la 1.34 encontró 276 discrepancias (12 falsos aceptos y 264 falsos rechazos, 25 familias); con el código de la 1.35 salen 0 en todas las campañas. Las pruebas con JDK usan un único tope (`LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS`, 600 s, `herramientas/oraculo/limites-de-pruebas.ts`): con la máquina cargada, una JVM que arranca lento no debe poder tumbar una prueba. Lo que la gramática no ve lo vigila la **matriz valor × contexto** (`pruebas/compilacion/tablas-de-valor-y-contexto.ts`: 40 valores × 81 posiciones = 3 240 programas con el veredicto de javac como dato; `npm test` la corre sin JDK y `test:oraculo` la verifica contra javac).

| Flujo | Disparador | Qué hace |
|---|---|---|
| `ci.yml` | *push*/PR a `main` | `ubuntu-latest`, Node de `.nvmrc`, `npm ci`, navegadores de Playwright, `npm run ci`, `test:navegadores`, `e2e`, `rendimiento` (umbral holgado) |
| `oraculo.yml` | cambios en `corpus/`, `herramientas/oraculo/`, `src/motor/`; nocturno; manual | `macos-14` (arm64) + `actions/setup-java@v6` Temurin `17.0.18+8`: `test:oraculo` y `oraculo:verificar`; `oraculo:generados` (PR y *push*: semilla fija, 3 000 programas; de noche y a mano: 40 000 con la semilla del día); de noche, `oraculo:mutantes` |
| `plataforma.yml` | semanal; manual | matriz `ubuntu-latest`/`windows-latest`: `MedirPow` → informe y resumen; sin `continue-on-error`: un error de la herramienta falla el trabajo y una diferencia `Math.pow` ≠ `StrictMath.pow` sale como `::warning::` (tarea 0.18) |
| `desplegar.yml` | etiqueta `v*`; manual con `ref` | `BASE_PUBLICA=/<repo>/ vite build` → `actions/upload-pages-artifact` → `actions/deploy-pages`; revertir = correrlo con la etiqueta anterior |

La ruta base se toma de `BASE_PUBLICA` (P1 abierta: el nombre del repositorio la fija). Si el repositorio fuera privado, los minutos de macOS cuestan 10×: el job del oráculo corre solo por cambios y de noche.

**Versiones** (verificadas con `npm view` el 2026-09-25): ejecución `react`/`react-dom` 19.3.0, `@codemirror/state` 6.7.6, `view` 6.43.13, `language` 6.12.4, `commands` 6.11.1, `lang-java` 6.0.2, `lz-string` 1.5.0, `workbox-window` 7.4.1; desarrollo `typescript` 6.0.3, `vite` 8.3.1, `@vitejs/plugin-react` 6.1.1, `vite-plugin-pwa` 1.3.0, `vitest`/`@vitest/coverage-v8`/`@vitest/browser-playwright` 5.0.2, `@playwright/test` 1.63.0, `@testing-library/react` 16.3.3, `@testing-library/user-event` 14.6.7, `jsdom` 30.1.1 (exige Node ≥ 22.22.2), `fast-check` 4.10.2, `eslint` 10.11.0, `@eslint/js` 10.0.1, `typescript-eslint` 8.70.1 (exige TS < 6.1), `eslint-plugin-react-hooks` 7.1.1, `@axe-core/playwright` 4.13.0. Los `@types/*` y las versiones mayores de las acciones se verifican en el lote 0. El motor no tiene dependencias.

## 10. Orden de construcción sugerido

Cambio frente a la propuesta §6: el **lote 0 incluye una rebanada vertical** para que todos los contratos entre capas (`VistaPrograma`, `Paso`, protocolo, `Traza`, goldens) existan y se prueben de punta a punta desde el principio; los lotes 1–6 y sus hitos (validación en aula al cerrar el 5, Detallado en el 6) no cambian.

| Lote | Contenido | Criterios |
|---|---|---|
| 0 Cimientos + rebanada vertical (2–3 sesiones) | Herramientas, capas y guardas, CI (`ci`, `oraculo`, `plataforma`), oráculo y regeneración binaria de los 35 goldens y de `experimentos/`, medición de `Math.pow` en x86_64, Pages + PWA mínima. Rebanada: `u3-hola-mundo` (clase + `main` + `println` de literal) atraviesa léxico → sintaxis → semántica → IR → intérprete → `Traza` → trabajador → UI (editor, Visualizar, consola, ◀ ▶) con su prueba diferencial y su E2E en los tres motores, también sin red | C12 (inicial) |
| 1 Lenguaje (3–4) | Gramática completa, reconocimiento NO-DISP, cinco pasadas (la quinta, límites del archivo, desde la 1.36), catálogo del JDK, errores en español, mutantes con `javax.tools` | C7, C8 |
| 2 Ejecución y biblioteca (4–5) | Primero lo puro y verificable con datos: números, `digitosJava` (banda, empates, potencias de dos, subnormales), `printf`, fdlibm, `Random`, texto, `Scanner`, excepciones y marcos; luego IR + intérprete Normal con registro de valores, límites | C1, C3–C6, C17 |
| 3 Traza y trabajador (1–2) | Puntos de control, prueba de escritorio, protocolo completo (entrada, detener, perro guardián, repuesto), diagnóstico de ciclo, pruebas de rendimiento | C10, C11 |
| 4 Visualizador (3–4) | M1–M3, M5–M17 | C9 (Normal), C14 |
| 5 Aula (2–3) | M18–M23, galería de autoría, enlace, proyector, PWA completa, auditoría AA → **validación en aula** | C2, C12–C16, C19, C20 |
| 6 Paso Detallado (2–3) | M4: micropasos derivados del registro, plantillas y controles → **publicación v1** | C9 (Detallado), C11 |

## 11. Archivos

| Ruta | Acción | Descripción |
|---|---|---|
| raíz: `.nvmrc`, `.gitattributes`, `package.json`, `tsconfig*.json`, `vite/vitest/playwright` config, `eslint.config.js`, `index.html`, `AVISOS-DE-TERCEROS.md` | Crear | herramientas, capas, CSP, avisos |
| `src/motor/**` | Crear | dominio completo (§1.2) |
| `src/textos/es-MX/**`, `src/presentacion/**` | Crear | catálogo y derivación de la vista |
| `src/trabajador/**`, `src/interfaz/**` | Crear | adaptadores |
| `corpus/**` | Crear | migrar `exploracion/corpus-candidato/` → `corpus/curso/` y `exploracion/experimentos/` → `corpus/experimentos/`, **regenerando** todos los goldens en binario; `autoria/`, `compilacion/`, `mutantes/`, `datos/` |
| `herramientas/**`, `pruebas/**` | Crear | oráculo, reglas de lint, presupuestos, suites |
| `.github/workflows/{ci,oraculo,plataforma,desplegar}.yml` | Crear | §9 |
| `docs/adr/001…016` | Crear (esta fase) | decisiones |
| `openspec/changes/visualizador-java/exploracion/**` | Sin cambios | queda como registro de la exploración |

## 12. Migración y puesta en marcha

No hay datos que migrar. Publicación por etiquetas `vX.Y.Z` (reversión de la propuesta §11); el service worker avisa de versión nueva y la versión es visible; el formato del enlace y la clave de preferencias van versionados.

**Hallazgos de esta fase que tocan la propuesta y las specs** (para que el orquestador los concilie): (1) **C4** no puede decir «45 292/45 293»: hay tres clases más (empates en exponentes 71–85, potencias de dos —visibles en un ciclo que divide entre 2— y subnormales, incluido `Double.MIN_VALUE → 4.9E-324`); (2) el «primer error» es el de la primera pasada que falla, no el primero del texto (afecta C7 y los escenarios de errores); (3) `charAt` cambia mensaje y marcos según el *coder* Latin-1/UTF-16 (un texto pegado de Word con comillas tipográficas es UTF-16); (4) `Math.round` con `int`/`long` usa la sobrecarga `float`; (5) `trim` y `parseInt` difieren de JS.

## 13. Preguntas abiertas

- [ ] P1 (cuenta, nombre y visibilidad del repositorio), P4 (licencia; el diseño es compatible con MIT) y P5 (validación en aula): siguen con el PO; nada del diseño depende de ellas.
- [ ] Técnica, lote 2: regla de subnormales (si no se caracteriza al 100 %, aviso en ejecución), límite de exponentes de la regla de empates y redondeo de las potencias de dos con empate decimal exacto (caso 2⁻²⁵). No bloquea.
- [ ] Técnica, lote 0: soporte de *service worker* de WebKit en Playwright para la prueba sin red y la CSP que exija CodeMirror. No bloquea.
