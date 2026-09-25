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
│   │   ├── vista.ts            API de presentación: Traza, formatearValorJava, tipos
│   │   ├── fuente/             Rango, tabla de líneas (desplazamiento ↔ línea/columna)
│   │   ├── lexico/             analizador-lexico.ts, tokens.ts, literales.ts
│   │   ├── sintaxis/           analizador-sintactico.ts, expresiones.ts (Pratt), ast.ts, no-soportado.ts
│   │   ├── semantica/          atribucion.ts, tipos.ts, conversiones.ts, sobrecargas.ts, constantes.ts,
│   │   │                       alcance.ts, alcanzabilidad.ts, asignacion-definitiva.ts, switch.ts, arranque.ts
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
| 5 | Arranque | lo que rechaza el lanzador (`main` sin `static`, sin `main`, no `public`) | error de arranque |

Una expresión que depende de algo no soportado recibe el tipo `desconocido`, que suprime los errores en cascada (nunca se informa un error que Java podría no dar). Cada error lleva el **código de diagnóstico de javac** (`compiler.err.var.might.not.have.been.initialized`, etc.) para compararlo con el oráculo (§7.4).

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
Programa     = [ "package" Nombre ";" ] { Importacion } Clase { ";" } EOF ;   (* otra clase/interfaz/enum/record → NO-DISP *)
Importacion  = "import" Nombre [ "." "*" ] ";" ;          (* static → NO-DISP; clase existente no soportada → NO-DISP; inexistente → error *)
Clase        = { "public" | "final" } "class" Id "{" { Main | ";" } "}" ;  (* campo, método, clase interna, bloque, anotación → NO-DISP *)
Main         = { "public" | "static" | "final" } "void" "main" "(" ParamMain ")" Bloque ;   (* throws → NO-DISP *)
ParamMain    = [ "final" ] "String" ( "[" "]" Id | Id "[" "]" | "..." Id ) ;
Bloque       = "{" { DeclLocal ";" | Sentencia } "}" ;
DeclLocal    = [ "final" ] Tipo Declarador { "," Declarador } ;             (* final sin inicializador → NO-DISP *)
Declarador   = Id [ "=" Expr ] ;
Tipo         = "int" | "long" | "double" | "boolean" | "char" | NombreDeTipo ; (* String, Scanner, Random, calificados o no *)
Sentencia    = Bloque | ";" | ExprSentencia ";" | If | Switch | While | DoWhile | For
             | "break" ";" | "continue" ";" | "return" ";" ;
ExprSentencia= Asignacion | IncDec | Llamada | "new" NombreDeTipo Argumentos ;  (* otra expresión → error «not a statement» *)
If           = "if" "(" Expr ")" Sentencia [ "else" Sentencia ] ;
Switch       = "switch" "(" Expr ")" "{" { Etiqueta { Etiqueta } { DeclLocal ";" | Sentencia } } "}" ;
Etiqueta     = "case" Expr ":" | "default" ":" ;                             (* "case X ->", yield → NO-DISP *)
While        = "while" "(" Expr ")" Sentencia ;
DoWhile      = "do" Sentencia "while" "(" Expr ")" ";" ;
For          = "for" "(" [ DeclLocal | ExprSentencia { "," ExprSentencia } ] ";" [ Expr ] ";"
               [ ExprSentencia { "," ExprSentencia } ] ")" Sentencia ;       (* for (T x : xs) → NO-DISP *)
```

Una declaración en posición de `Sentencia` (`if (c) int x = 5;`) da el error de javac «variable declaration not allowed here». El `else` se liga al `if` más cercano por construcción.

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

1. **Cast o paréntesis** (regla de JLS 15.16, igual que javac): `(` tipo primitivo `)` es cast siempre; `(` Nombre `)` es cast solo si sigue algo que abre una expresión unaria sin `+`/`-` (identificador, literal, `(`, `!`, `~`, `new`); si no, es paréntesis. Un cast a tipo de referencia pasa a atribución: NO-DISP si el tipo existe, error «cannot find symbol» si no.
2. **Declaración o expresión** al inicio de sentencia: primitivo o `final` ⇒ declaración; `Nombre[.Nombre]* Id` ⇒ declaración (el tipo se resuelve en atribución: `string nombre` da «cannot find symbol: class string», como err18); `Nombre [ ]` ⇒ arreglo (NO-DISP); `Nombre < … > Id` con `<>` balanceados ⇒ genérico (NO-DISP); `var Id` ⇒ NO-DISP; `Id :` ⇒ etiqueta (NO-DISP); lo demás, expresión. No hace falta retroceso: el conjunto de tipos es cerrado.
3. **`-2147483648` y `-9223372036854775808L`:** el léxico conserva el texto del literal; el analizador valida el rango sabiendo si lo precede un `-` unario (JLS 3.10.1) y si no, «integer number too large» (error de sintaxis, como javac).

### 2.6 Reconocimiento de lo no soportado (sin reinterpretar)

Cada construcción se reconoce con una subgramática permisiva que delimita su extensión, crea un nodo `NoSoportado { codigo, rango }` y deja seguir el análisis (así se encuentra el primer problema en el orden del texto). En cada punto de error se pregunta primero si el token que falla abre una construcción válida de Java fuera del alcance: si sí, es aviso, nunca error de sintaxis (C8).

| Detector | Construcciones |
|---|---|
| Léxico | `\uXXXX` en cualquier lugar (javac lo procesa incluso en comentarios); literales hexadecimales, octales (incl. `010`, explicando que Java lo lee como 8) y binarios; `float` (`1.5f`); bloques de texto `"""`; escapes válidos en Java fuera de `\n \t \" \' \\` (`\r \b \f \s \0–\377`) |
| Sintaxis | varias clases, interfaces, enums, records; campos, métodos propios, clases internas, inicializadores, anotaciones; `throws`; arreglos (tipo, `new`, acceso, inicializador) salvo el parámetro de `main`; `for` mejorado; etiquetas; `switch` con flecha, como expresión o con `yield`; `try/catch/finally/throw`; `var`; genéricos; lambdas; `::`; `?:`; `& \| ^ ~ << >> >>>` y sus asignaciones; `instanceof`; `this`/`super`; `null`; `float`/`byte`/`short`; `final` sin inicializador; `import static` |
| Atribución | clases de `java.lang`/`java.util` existentes pero no soportadas y sus miembros; miembros existentes no soportados de clases soportadas (`s.split`, `Math.sin`, `sc.hasNextInt`, `sc.nextLong`, `Long.parseLong`, `System.exit`…); un segundo `Scanner` o `new Scanner` dentro de un ciclo; `Scanner` sobre algo distinto de `System.in`; `useLocale`; `printf`/`String.format` con conversión o bandera no soportada en formato literal |
| Ejecución | formato no literal con conversión no soportada (detiene en ese paso; la traza previa sigue navegable); subnormales (§4.2) si el lote 2 no caracteriza su regla |

Posiciones calibradas con javac: los errores «X expected» se ubican al **final del token anterior** (línea del token anterior); una cadena sin cerrar, en su inicio. Cada regla de posición tiene su caso en el catálogo o en los mutantes.

### 2.7 Semántica

- **Tipos:** `int long double boolean char String Scanner Random void` + `desconocido`. Asignación (JLS 5.2): identidad, ensanchamiento, estrechamiento de constantes `int` a `char` si caben (`char c = 65;`); lo demás, «possible lossy conversion from X to Y» o «X cannot be converted to Y». Promoción numérica binaria y unaria (5.6). `+` concatena si algún operando es `String` (la otra parte pasa por `String.valueOf` de su tipo **estático**); `==`/`!=` numérico, booleano o de referencias comparables (`String` vs `Scanner` → «incomparable types»); asignación compuesta con conversión implícita `E1 = (T)(E1 op E2)`.
- **Sobrecargas:** JLS 15.12.2 (fases estricta, laxa, *varargs* y «más específico») sobre las firmas reales del **catálogo del JDK** (ADR 010), que también distingue *soportado* / *existe en Java (NO-DISP)* / *no existe (error)*. **[verificado en diseño]** `Math.round(123456789L)` elige `round(float)` y da el `int` 123456792 (por eso `int r = Math.round(l);` compila si `l` es `long`); `Math.abs('a')` es `int`; `Character.toUpperCase(97)` imprime `65`; `println(char)` ≠ `println(int)`; `printf` recibe argumentos «encajados» (`%d` con `double` → `IllegalFormatConversionException: d != java.lang.Double`).
- **Constantes (JLS 15.29):** literales, operadores, casts a primitivo o `String`, variables constantes (`final` con inicializador constante) y campos constantes (`Integer.MAX_VALUE`, `Math.PI`…). Se pliegan con las **mismas** funciones de la biblioteca (`"a" + 1.0` usa `Double.toString`); una división entera entre cero no es constante. Sirven para: internar `String` (`"ho" + "la" == "hola"` es `true`), etiquetas de `case` y duplicados, estrechamiento, y condiciones constantes en alcanzabilidad y asignación definitiva (`while (1 < 2)` cuenta como `while (true)`, **[verificado en diseño]**).
- **Alcance:** una ranura por declaración (no hay recursión: un solo marco); el nombre de una local viva no se puede redeclarar en un bloque anidado ni en el mismo (`variable x is already defined in method main(String[])`, incluido `args`); el bloque de un `switch` es un solo alcance; las variables del `for` viven en el `for`.
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
  cambios?: Cambio[];                 // { ranura, anterior, nuevo, punto } — reversibles
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
- `estadoEn(n)` = punto de control + ≤ 255 deltas; avanzar o retroceder uno aplica o deshace un delta (cada cambio trae `anterior`). Saltar a cualquier paso de 100 000 cuesta microsegundos (C11).
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
    C-->>UI: «Se detuvo por seguridad» con datos («contador siempre valió 1»)
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

Paquetes: `@codemirror/state`, `view`, `language`, `commands`, `lang-java` (solo resalta; el análisis es del motor). Extensiones: números de línea, historial, sangría al pulsar Enter, correspondencia de llaves, resaltado, `Compartment` para solo lectura (en visualización) y para el tema (proyector). Un `StateField` recibe por `StateEffect` los resaltados del `ModeloVista`: línea recién ejecutada y línea siguiente (clase de línea + marcador de canal ▶/▷ con texto accesible), subexpresión actual (marca con contorno), rama no tomada (atenuada + etiqueta «no se ejecuta»), «no evaluado» (tachado + etiqueta), error y aviso (subrayado ondulado o punteado + marcador ✖/ⓘ), contador de vueltas (*widget*). Tab no se captura (sin trampa de teclado, WCAG 2.1.2). El editor es un presentacional: recibe `modo` y `resaltados`, emite `onCambio`.

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
| Compilación | Vitest | 37 casos del catálogo, una muestra por construcción NO-DISP, ≥ 2 000 mutantes contra veredictos de javac guardados | cada commit |
| Componentes | Vitest (jsdom) + Testing Library | reductor, presentacionales, enlace ida y vuelta | cada commit |
| Motor en navegadores | Vitest modo navegador (`@vitest/browser-playwright`) | diferencial + propiedades en Chromium, Firefox y WebKit (C17) | cada commit |
| E2E | Playwright ×3 motores + `@axe-core/playwright` | flujos MUST con teclado, AA (C14), sin red (C12), predicción (C19), proyector (C16), enlaces de la galería (C15), base no raíz | cada commit |
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
| `marcos/`, `api/`, `regional/` | marcos por sitio de excepción; firmas públicas de las clases soportadas; nombres de `java.lang`/`java.util`; símbolos regionales; mensajes del lanzador | ADR 010 |

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
| `test:navegadores` | `vitest run --project navegadores --reporter=dot` |
| `e2e` · `rendimiento` | `playwright test --reporter=dot` · `playwright test -c pruebas/rendimiento --reporter=dot` |
| `lint` · `tipos` | `eslint . --quiet` · `tsc -p` por cada tsconfig con `noEmit` |
| `presupuesto` · `licencias` | `node herramientas/presupuesto-tamano.ts` (≤ 500 KB comprimidos) · `node herramientas/licencias.ts` |
| `ci` | lint + tipos + test + build + presupuesto + licencias |
| `oraculo:goldens` · `oraculo:verificar` · `oraculo:datos` | `node herramientas/oraculo/{generar-goldens,verificar-goldens,generar-datos}.ts` |
| `oraculo:mutantes` · `oraculo:generados` · `medir:plataforma` | `node herramientas/oraculo/{mutantes,programas-generados,medir-plataforma}.ts` |

Node 22.23.1 ejecuta los `.ts` de `herramientas/` directamente (**[verificado en diseño]**: elimina tipos; rechaza `enum`, por eso `erasableSyntaxOnly` en todo el repo).

| Flujo | Disparador | Qué hace |
|---|---|---|
| `ci.yml` | *push*/PR a `main` | `ubuntu-latest`, Node de `.nvmrc`, `npm ci`, navegadores de Playwright, `npm run ci`, `test:navegadores`, `e2e`, `rendimiento` (umbral holgado) |
| `oraculo.yml` | cambios en `corpus/`, `herramientas/oraculo/`, datos; nocturno; manual | `macos-14` (arm64) + `actions/setup-java@v6` Temurin `17.0.18+8`: `oraculo:verificar`; de noche, `oraculo:generados` y `oraculo:mutantes` |
| `plataforma.yml` | semanal; manual | matriz `ubuntu-latest`/`windows-latest`: `MedirPow` → informe y resumen; `continue-on-error` |
| `desplegar.yml` | etiqueta `v*`; manual con `ref` | `BASE_PUBLICA=/<repo>/ vite build` → `actions/upload-pages-artifact` → `actions/deploy-pages`; revertir = correrlo con la etiqueta anterior |

La ruta base se toma de `BASE_PUBLICA` (P1 abierta: el nombre del repositorio la fija). Si el repositorio fuera privado, los minutos de macOS cuestan 10×: el job del oráculo corre solo por cambios y de noche.

**Versiones** (verificadas con `npm view` el 2026-09-25): ejecución `react`/`react-dom` 19.3.0, `@codemirror/state` 6.7.6, `view` 6.43.13, `language` 6.12.4, `commands` 6.11.1, `lang-java` 6.0.2, `lz-string` 1.5.0, `workbox-window` 7.4.1; desarrollo `typescript` 6.0.3, `vite` 8.3.1, `@vitejs/plugin-react` 6.1.1, `vite-plugin-pwa` 1.3.0, `vitest`/`@vitest/coverage-v8`/`@vitest/browser-playwright` 5.0.2, `@playwright/test` 1.63.0, `@testing-library/react` 16.3.3, `@testing-library/user-event` 14.6.7, `jsdom` 30.1.1 (exige Node ≥ 22.22.2), `fast-check` 4.10.2, `eslint` 10.11.0, `@eslint/js` 10.0.1, `typescript-eslint` 8.70.1 (exige TS < 6.1), `eslint-plugin-react-hooks` 7.1.1, `@axe-core/playwright` 4.13.0. Los `@types/*` y las versiones mayores de las acciones se verifican en el lote 0. El motor no tiene dependencias.

## 10. Orden de construcción sugerido

Cambio frente a la propuesta §6: el **lote 0 incluye una rebanada vertical** para que todos los contratos entre capas (`VistaPrograma`, `Paso`, protocolo, `Traza`, goldens) existan y se prueben de punta a punta desde el principio; los lotes 1–6 y sus hitos (validación en aula al cerrar el 5, Detallado en el 6) no cambian.

| Lote | Contenido | Criterios |
|---|---|---|
| 0 Cimientos + rebanada vertical (2–3 sesiones) | Herramientas, capas y guardas, CI (`ci`, `oraculo`, `plataforma`), oráculo y regeneración binaria de los 35 goldens y de `experimentos/`, medición de `Math.pow` en x86_64, Pages + PWA mínima. Rebanada: `u3-hola-mundo` (clase + `main` + `println` de literal) atraviesa léxico → sintaxis → semántica → IR → intérprete → `Traza` → trabajador → UI (editor, Visualizar, consola, ◀ ▶) con su prueba diferencial y su E2E en los tres motores, también sin red | C12 (inicial) |
| 1 Lenguaje (3–4) | Gramática completa, reconocimiento NO-DISP, cuatro pasadas, catálogo del JDK, errores en español, mutantes con `javax.tools` | C7, C8 |
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
