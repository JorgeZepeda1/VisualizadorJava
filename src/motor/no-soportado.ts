// Catálogo CERRADO de códigos "no soportado" (tarea 1.24, ADR 003, REQ-SUB-006/REQ-SUB-007): UNA
// SOLA fuente de verdad para los códigos que hoy emiten, cada uno por su cuenta, el léxico
// (lexico/literales.ts, lexico/analizador-lexico.ts), la sintaxis (sintaxis/no-soportado.ts,
// sintaxis/analizador-sintactico.ts, sintaxis/expresiones.ts) y la atribución de miembros de
// biblioteca existentes-pero-no-soportados (semantica/atribucion.ts).
//
// Antes de esta tarea NO existía ninguna tabla así de completa: `sintaxis/no-soportado.ts` tenía su
// PROPIA tabla (usada por sintaxis/atribución), pero `sintaxis/expresiones.ts` emitía sus propios
// códigos como strings INLINE, nunca importados de ninguna tabla (engram
// visualizador-java/patron-codigos-inline-expresiones) — con una discrepancia real: la tabla decía
// `lambda: 'lambda-no-soportada'`, pero `expresiones.ts` emitía literalmente `'lambda'` (sin el
// sufijo). Esa discrepancia significaba que un alumno que escribía una lambda recibía
// `{ categoria: 'no-disponible', codigo: 'lambda' }` sin NINGÚN texto (ver GREEN de esta tarea:
// `expresiones.ts` ahora importa y usa `CODIGOS_NO_SOPORTADO.lambda`, igual que el resto).
//
// Esta tabla vive en la RAÍZ de `motor/` (no dentro de `sintaxis/`) para que TANTO `lexico/` como
// `sintaxis/` la importen sin crear una dependencia hacia atrás (el léxico es más "bajo" que la
// sintaxis, que ya importa tipos de `lexico/`) — mismo patrón que ya usa `problemas.ts` en la raíz
// para `CodigoProblema`, compartido por `compilador.ts` y `semantica/*.ts`. `sintaxis/no-soportado.ts`
// RE-EXPORTA esta constante para que ningún import existente (`analizador-sintactico.ts`,
// `semantica/atribucion.ts`, que hacen `from './no-soportado.ts'` / `from '../sintaxis/no-soportado.ts'`)
// tenga que cambiar.
//
// `CodigoNoSoportado` es la unión CERRADA derivada de los VALORES de esta tabla (`as const` +
// indexado por `keyof typeof`): cualquier emisor que use un código que no esté aquí deja de
// compilar (`npm run tipos`), y `src/textos/es-MX/no-soportado.ts` (ADR 015) exige, por tipar su
// catálogo como `Record<CodigoNoSoportado, ...>`, que absolutamente todos tengan texto en español.
export const CODIGOS_NO_SOPORTADO = {
  // ---- Sintaxis a nivel sentencia/declaración/programa (sintaxis/no-soportado.ts,
  // sintaxis/analizador-sintactico.ts) — tabla original desde la tarea 1.6. ----
  otroTipoDeNivelSuperior: 'otro-tipo-de-nivel-superior-no-soportado',
  miembroDeClase: 'miembro-de-clase-no-soportado',
  throwsClausula: 'throws-no-soportado',
  arreglo: 'arreglo-no-soportado',
  var: 'var-no-soportado',
  generico: 'generico-no-soportado',
  tipoPrimitivoNoSoportado: 'tipo-primitivo-no-soportado',
  finalSinInicializador: 'final-sin-inicializador-no-soportado',
  forMejorado: 'for-mejorado-no-soportado',
  etiqueta: 'etiqueta-no-soportada',
  breakConEtiqueta: 'break-con-etiqueta-no-soportado',
  continueConEtiqueta: 'continue-con-etiqueta-no-soportado',
  tryCatch: 'try-catch-no-soportado',
  throwSentencia: 'throw-no-soportado',
  switchFlecha: 'switch-flecha-no-soportado',
  // Tarea 1.29 (causa 5): `case 1, 2:` — varios valores en una etiqueta CLÁSICA (con dos puntos), Java 14+.
  // La forma con flecha (`case 1, 2 ->`) sigue siendo `switchFlecha`: lo que la aleja del subconjunto es la
  // flecha. Ambas se verificaron con javac 17 real.
  caseConVariasEtiquetas: 'case-con-varias-etiquetas-no-soportado',
  // Tarea 1.29 (design.md §2.3: «campo, método, clase interna, bloque, anotación → NO-DISP»): `@Override`,
  // `@SuppressWarnings("resource")`… — Java válido que el subconjunto no interpreta. Una sola entrada para
  // cualquier anotación (antes de la clase, de un miembro o de una declaración local).
  anotacion: 'anotacion-no-soportada',
  // Tarea 1.29 (design.md §2.3: «Tipo = … NombreDeTipo (* String, Scanner, Random, calificados o no *)»):
  // `java.util.Scanner sc = new java.util.Scanner(System.in);`, `java.lang.Math.max(1, 2)` — el nombre
  // COMPLETO de una clase (con su paquete, sin `import`) es Java válido; el subconjunto solo entiende el
  // nombre corto. Lo emite `semantica/atribucion.ts` (necesita el catálogo de clases del JDK).
  nombreCalificado: 'nombre-calificado-no-soportado',
  yield: 'yield-no-soportado',
  importStatic: 'import-static-no-soportado',
  lambda: 'lambda-no-soportada',
  // Mismo valor que `arreglo` a propósito: "new Tipo[...]" (expresión) y "Tipo[] x;" (declaración)
  // son la MISMA fila del catálogo REQ-SUB-007 ("Arreglos"), solo detectadas en dos posiciones
  // sintácticas distintas — nunca dos construcciones distintas para el alumno.
  arregloNuevo: 'arreglo-no-soportado',
  // Sub-lote 1-D2c (design.md §2.6 fila "Atribución": "miembros existentes no soportados de clases
  // soportadas" — `s.split`, `Math.sin`, `sc.hasNextInt`, `new Scanner("texto")`…). A diferencia de
  // TODO lo demás en esta tabla, estos 3 códigos NO los produce un reconocedor de `sintaxis/`
  // (necesitan el catálogo real del JDK para saber que el miembro EXISTE, ADR 010) — los emite
  // `semantica/atribucion.ts` directamente, reusando esta MISMA constante.
  //
  // Tarea 1.26 (agregada por el orquestador — hallazgo verificado de punta a punta): antes de esta
  // tarea existía un solo código, `miembroDeBiblioteca: 'miembro-de-biblioteca-no-soportado'`,
  // compartido por los 3 sitios de emisión de `atribucion.ts` (llamada de método, acceso de campo,
  // constructor). Para el CONSTRUCTOR, que no tiene "nombre" propio en JLS, ese único código
  // obligaba a inventar uno (`nombre: 'new ' + clase`) — el texto resultante, "el miembro `new
  // Scanner` de `Scanner`... todavía no simula `Scanner.new Scanner`", describe una sintaxis que NO
  // es Java (D2: casi un resultado inventado en el propio TEXTO del aviso). "miembro" tampoco es una
  // palabra que un alumno de U3-U7 conozca (conoce "método"). Divididos en 3 códigos — cada uno con
  // su propio texto es-MX (`textos/es-MX/no-soportado.ts`) y su propia forma de datos exacta abajo
  // (`DatosPorCodigoNoSoportado`) — para que ni el motor ni el texto tengan que fingir un nombre que
  // Java no usa.
  metodoDeBiblioteca: 'metodo-de-biblioteca-no-soportado',
  campoDeBiblioteca: 'campo-de-biblioteca-no-soportado',
  constructorDeBiblioteca: 'constructor-de-biblioteca-no-soportado',
  // Tarea 1.29 (agregada por el orquestador, design.md §2.3/§2.6: «clase existente no soportada →
  // NO-DISP; inexistente → error»): una clase REAL del JDK (la lista sale del oráculo,
  // `biblioteca/datos/clases-jdk.generado.ts`) que el subconjunto no simula — `import java.util.Locale;`,
  // `javax.swing.JOptionPane`, `StringBuilder sb`, `Boolean.parseBoolean(...)` — o la clase del propio
  // programa usada como tipo (`Main m = new Main();`, «objetos propios», REQ-SUB-007). Antes un import
  // así daba `importacion-no-reconocida` («revisa que esté bien escrito»): un error FALSO. Lo emite
  // `semantica/atribucion.ts` (necesita saber qué clases existen y cuáles están a la vista).
  claseNoSoportada: 'clase-no-soportada',
  // Tarea 1.29 (design.md §2.3: la clase es UNA, con `main`; REQ-SUB-007: «clases/objetos propios» → aviso):
  // `class C extends B`, `class C implements A` — la herencia y las interfaces son Java válido que el
  // subconjunto no simula. Una sola entrada para `extends`, `implements` o ambas (la cláusula completa). Los
  // parámetros de tipo de la clase (`class C<T>`) avisan con `generico`.
  herencia: 'herencia-no-soportada',
  // Tarea 1.29 (design.md §2.3, REQ-SUB-007): `assert x > 0 : "mensaje";` — Java válido que el subconjunto no comprueba.
  assert: 'assert-no-soportado',
  // Tarea 1.29 (REQ-SUB-007: «clases/objetos propios» → aviso): una clase, interfaz, enum o record declarados DENTRO de un método.
  claseLocal: 'clase-local-no-soportada',
  // Tarea 1.29: `synchronized (obj) { … }` — el subconjunto no simula hilos ni sincronización.
  sincronizado: 'sincronizado-no-soportado',
  // Tarea 1.35 (REQ-SUB-007: «clases/objetos propios» → aviso): `new Runnable() { … }` — una clase ANÓNIMA (JLS 15.9.5). Se delimita el cuerpo completo sin interpretarlo.
  claseAnonima: 'clase-anonima-no-soportada',
  // Tarea 1.35 (REQ-SUB-007: «métodos propios» → aviso): una llamada a un método de la propia clase. Cada método que el alumno DECLARA ya avisa en su declaración, así que lo único
  // que la atribución llega a ver es la recursión de `main` (`main(args);`), que javac compila. Lo emite `semantica/atribucion.ts`.
  llamadaAMetodoPropio: 'llamada-a-metodo-propio-no-soportada',
  // Tarea 1.35 (WARNING 3, decisión del PO 2026-10-02): un archivo que no declara NINGUNA clase —vacío, solo un comentario, un `package`, imports o `;`— lo compila javac sin
  // un solo error (no hay nada que generar) y no hay nada que ejecutar. No es una construcción fuera del subconjunto: es el programa entero el que no trae una clase con `main`. Lo
  // emite `sintaxis/analizador-sintactico.ts`, y su texto no usa el marco ni habla de una línea.
  archivoSinClase: 'archivo-sin-clase',
  // Tarea 1.35 (JLS 15.8.2; la mutación por elemento de los conjuntos del reconocedor de casts destapó la familia): `String.class`, `int.class`, `int[].class`, `void.class` — un literal de
  // clase. javac lo compila y el visualizador no maneja los objetos `Class`. Lo emite `sintaxis/expresiones.ts`.
  literalDeClase: 'literal-de-clase-no-soportado',
  // Tarea 1.36 (C-3): el nombre del paquete es el de una CLASE pública del JDK que javac todavía no conoce al leer el `package` y COMPILA (`package javax.swing.JFrame;`). Tarea 1.37 midió con el
  // oráculo cuáles rechaza javac (`paquete-con-nombre-de-clase`, un error modelado); lo que queda es un aviso conservador, porque el visualizador no comprueba los paquetes que se llaman como una
  // clase. Tarea 1.38: solo las que están FUERA de `java` —el JDK real las ejecuta con normalidad—; dentro de `java` el lanzador no arranca nada y el aviso es `paqueteReservadoPorJava`.
  // Lo emite `semantica/atribucion.ts`.
  paqueteConNombreDeClase: 'paquete-con-nombre-de-clase-no-soportado',
  // Tarea 1.38 (W-15 de la «Verificación acotada del lote 1 (1.37)»): `package java.miapp;` — `java` y todo lo que está dentro. javac lo compila, pero el lanzador del JDK real se niega a arrancar el
  // programa (`java.lang.SecurityException: Prohibited package name: java.miapp`, `ClassLoader.preDefineClass`: el nombre de la CLASE empieza con `java.`), y `compilar()` daba `ok`: el lote 0 ejecutaba el
  // `println`. Es lo que rechaza el LANZADOR, no javac (ADR 004): lo emite `semantica/paquete-del-lanzador.ts` cuando las pasadas de javac ya aceptaron el programa.
  paqueteReservadoPorJava: 'paquete-reservado-por-java',
  // Tarea 1.39 (W-16 de la tarea 1.38): `package jdk.internal.misc;` o `package sun.nio.ch;` — el nombre EXACTO de un paquete de un módulo del JDK que javac compila porque el módulo no lo exporta (no
  // hay `package.in.other.module`) y que el lanzador no carga (`ClassNotFoundException`: el cargador de aplicaciones busca el paquete en su módulo y no mira el classpath). La lista sale del oráculo
  // (`GenerarPaquetesDeModulos.java`, 516 de los 871 paquetes de los módulos del sistema del JDK 17.0.18); un subpaquete (`jdk.internal.misc.aula`) sí arranca. Es otra razón que `paqueteReservadoPorJava`
  // (el nombre no está reservado: el paquete ya existe dentro de Java), con su propio texto. Lo emite `semantica/paquete-del-lanzador.ts`, en la misma pasada y antes que el de `java`.
  paqueteInternoDelJdk: 'paquete-interno-del-jdk',
  // Tarea 1.36 (C-5 y W-10): una expresión constante de texto con un número decimal (`"a" + 1.5`, `"a" + 1.5 == "a1.5"`, una `final` que la guarda) usada donde Java decide con su VALOR —la condición
  // de un ciclo, la asignación definitiva, una etiqueta de `case`—. Su valor depende de cómo Java convierte un `double` a texto (`Double.toString`, lote 2): hasta entonces es un aviso, nunca una
  // respuesta inventada. Lo emiten `semantica/alcanzabilidad.ts`, `asignacion-definitiva.ts` y `switch.ts` (vía `semantica/diagnostico.ts`).
  constanteDeTextoConDecimal: 'constante-de-texto-con-decimal-no-soportada',
  // Tarea 1.36 (C-4b y S-1): el programa tiene más elementos (tokens) que el tope conservador de `motor/limites.ts`. javac rechaza un método de más de 65 535 bytes de bytecode (`limit.code`) y el
  // motor no modela ese tamaño; tampoco revisa un programa tan grande (las pasadas semánticas crecían como n² con las declaraciones locales). Lo emite `compilador.ts`, justo después del léxico.
  programaDemasiadoGrande: 'programa-demasiado-grande',
  // Tarea 1.37 (W-12): el programa tiene más niveles de anidamiento que los topes de `motor/limites.ts` (paréntesis dentro de paréntesis, instrucciones dentro de instrucciones, cadenas larguísimas de
  // operadores…). El tope de tokens no lo acota —4 000 tokens caben en un árbol de 2 000 niveles— y la pila se agotaba en las pasadas: la pantalla decía «Algo falló dentro del visualizador». Lo
  // emite `compilador.ts` cuando `sintaxis/analizador-sintactico.ts` lanza `ProgramaDemasiadoAnidado`.
  programaDemasiadoAnidado: 'programa-demasiado-anidado',
  // Tarea 1.36 (C-4a): un texto tan largo que se acerca al límite del archivo de clase (65 535 bytes por texto: `limit.string` y `limit.string.overflow` de javac) y cuyo tamaño exacto el motor no puede calcular:
  // lleva un decimal (su largo lo decide `Double.toString`, que es del lote 2), o hay condiciones constantes que podrían podar el código que lo genera. Lo emite `semantica/limites-del-archivo.ts`.
  tamanoDeTextoNoRevisable: 'tamano-de-texto-no-revisable',

  // ---- Léxico (lexico/literales.ts, lexico/analizador-lexico.ts) — tarea 1.24: antes strings
  // inline, nunca reunidos en una tabla. ----
  escapeNoSoportado: 'escape-no-soportado',
  escapeOctalNoSoportado: 'escape-octal-no-soportado',
  escapeUnicodeNoSoportado: 'escape-unicode-no-soportado',
  // Tarea 1.35: un carácter fuera del plano básico (un emoji) dentro de un literal `char`: ocupa dos unidades UTF-16; javac 17 lo compila y el valor del `char` es la primera unidad.
  caracterSuplementario: 'caracter-suplementario-no-soportado',
  bloqueDeTexto: 'bloque-de-texto-no-soportado',
  literalFloat: 'literal-float-no-soportado',
  literalOctal: 'literal-octal-no-soportado',
  literalHexadecimal: 'literal-hexadecimal-no-soportado',
  literalBinario: 'literal-binario-no-soportado',

  // ---- Expresiones (sintaxis/expresiones.ts, nivel Pratt) — tarea 1.24: antes strings inline,
  // NUNCA importados de ninguna tabla (el bug real de "lambda" vivía en este grupo). ----
  asignacionDeBits: 'asignacion-de-bits',
  operadorTernario: 'operador-ternario',
  instanceofNoSoportado: 'instanceof',
  operadorComplementoBits: 'operador-complemento-bits',
  accesoArreglo: 'acceso-arreglo',
  referenciaMetodo: 'referencia-metodo',
  thisSuper: 'this-super-no-soportado',
  nullNoSoportado: 'null-no-soportado',
  switchExpresion: 'switch-expresion-no-soportado',
  operadorBitsOr: 'operador-bits-or',
  operadorBitsXor: 'operador-bits-xor',
  operadorBitsAnd: 'operador-bits-and',
  operadorDesplazamiento: 'operador-desplazamiento',

  // Tarea 1.33 (residual de la 1.32): un método SOPORTADO cuyo tipo de retorno el subconjunto no modela — hoy solo `System.out.printf`, que
  // devuelve un `PrintStream` — usado donde se espera un valor (`int b = System.out.printf("a");`, `if (System.out.printf("x"))`): javac lo
  // rechaza casi siempre («PrintStream cannot be converted to int»), pero algunos usos son válidos (`println(printf(...))`, el receptor
  // `printf(...).println(...)`), y decidirlo pide modelar un tipo de referencia más. Lo emite `semantica/atribucion.ts`.
  valorDeTipoNoSoportado: 'valor-de-tipo-no-soportado',

  // Tarea 1.34 (cierre por defecto, familia B de la re-verificación del lote 1): una expresión cuyo tipo el motor no sabe —`System.in`, `System.out` o
  // `System.err` usados como VALOR (`int x = System.in;`, `System.in.nextInt()`), de un tipo (`InputStream`, `PrintStream`) que el subconjunto no modela— en
  // posición de valor NO puede terminar en «Java sí acepta tu programa»: si ninguna regla modelada la rechaza, es este aviso. Lo emite `semantica/atribucion.ts`
  // (un arreglo, en cambio, usa `arreglo`).
  valorDeTipoNoModelado: 'valor-de-tipo-no-modelado',

  // Tarea 1.27 (agregada por el orquestador, D2/regla 5 de CLAUDE.md): a diferencia de TODO lo
  // demás en esta tabla (construcciones FUERA del subconjunto U3-U7 por diseño), este código cubre
  // un programa QUE SÍ está en el subconjunto y que las 5 pasadas de `compilador.ts` YA ACEPTARON,
  // pero que `generarIr` (motor/ir/generar-ir.ts) todavía no sabe bajar a IR porque el lote 2
  // (tareas 1.5/2.16) no ha llegado a ese elemento — ruta defensiva PERMANENTE (ver el comentario de
  // `ErrorDeEjecucionNoDisponible`, motor/ir/error-de-ejecucion-no-disponible.ts). Lo emite
  // `compilador.ts` directamente (nunca un reconocedor de léxico/sintaxis/atribución).
  ejecucionNoDisponible: 'ejecucion-no-disponible',

  // Respaldo defensivo: el `?? '...'` de `compilador.ts`/`sintaxis/no-soportado.ts`/
  // `sintaxis/expresiones.ts` para un token `tipo:'no-soportado'` sin `codigo` fijado. En la
  // práctica TODO token de ese tipo fija su código al crearse (lexico/literales.ts,
  // lexico/analizador-lexico.ts) — este miembro no debería alcanzarse nunca; existe solo para que
  // esos `??` tipen contra la unión CERRADA sin recurrir a un `as` inseguro.
  sinClasificar: 'no-soportado',
} as const;

export type CodigoNoSoportado = (typeof CODIGOS_NO_SOPORTADO)[keyof typeof CODIGOS_NO_SOPORTADO];

// Tarea 1.30 (decisión del PO 2026-09-29): `float`, `byte` y `short` son tipos primitivos REALES de Java que
// el subconjunto no simula (REQ-SUB-007: nunca se reinterpretan como `double`/`int`). La lista vive aquí, y no
// en `sintaxis/`, porque de ella sale el TIPO de los datos del aviso (`DatosPorCodigoNoSoportado`): el
// reconocedor de `sintaxis/no-soportado.ts` construye su conjunto de palabras a partir de esta misma lista,
// así que agregar un tipo la extiende en los dos lados y el catálogo de textos (que exige una alternativa por
// tipo) deja de compilar hasta dársela.
export const TIPOS_PRIMITIVOS_NO_SOPORTADOS = ['float', 'byte', 'short'] as const;

export type TipoPrimitivoNoSoportado = (typeof TIPOS_PRIMITIVOS_NO_SOPORTADOS)[number];

// Tarea 1.25 (Datos tipados de cada aviso de "no soportado" — agregada por el orquestador):
// verificación de punta a punta (compilar() real + textosNoSoportado real, nunca datos fabricados)
// encontró que 5 códigos reales mostraban "undefined" al alumno porque NINGÚN tipo obligaba al
// motor a mandar los datos que su propio texto (`textos/es-MX/no-soportado.ts`) ya pedía desde la
// tarea 1.24 (`arreglo-no-soportado`, `literal-octal-no-soportado`, `miembro-de-biblioteca-no-
// soportado` en sus 3 sitios de emisión reales) — `Problema.datos`/`NoSoportadoColectado` seguían
// siendo `Record<string, unknown>` sin verificar, así que un emisor podía usar cualquier código sin
// darle los datos que su texto necesita y TypeScript nunca se quejaba; la prueba de 1.24 solo
// verificaba "texto no vacío que menciona la línea" (nunca el contenido de los datos).
//
// `DatosPorCodigoNoSoportado` es la ÚNICA fuente de verdad de qué datos EXTRA (más allá de la
// línea, que `compilador.ts` siempre calcula aparte con `TablaDeLineas` — nunca algo que un emisor
// decida) necesita cada código — `Record<never, never>` (⇒ solo `{}`) para los que su texto solo
// usa la línea. Vive en el MOTOR (no en `textos/es-MX`) para que el propio emisor (léxico/sintaxis/
// expresiones/atribución de biblioteca) quede obligado a construir su nodo/token CONTRA esta forma
// — nunca al revés (un catálogo de textos no puede obligar a nada del lado del motor). `textos/es-
// MX/no-soportado.ts` la importa vía `motor/vista.ts` (matriz de capas) para tipar el argumento de
// cada función de su catálogo, así que las DOS puntas (quién manda los datos, quién los consume)
// comparten un solo contrato — agregar un campo aquí sin que el emisor lo mande es un error de
// `npm run tipos` en el sitio de emisión (ver `ConDatosPorCodigo` abajo), y quitarlo sin actualizar
// el texto es un error de tipos en `textos/es-MX/no-soportado.ts` (mecanismo sin cambios de 1.24).
export interface DatosPorCodigoNoSoportado {
  'otro-tipo-de-nivel-superior-no-soportado': Record<never, never>;
  'miembro-de-clase-no-soportado': Record<never, never>;
  'throws-no-soportado': Record<never, never>;
  /** REQ-SUB-006, el ejemplo literal de la propuesta: "Tu programa usa un arreglo (`int[]`)…" — el
   * tipo EXACTO tal como lo escribió el alumno (`int[]`, `String[][]`…), nunca un genérico. */
  'arreglo-no-soportado': { readonly tipoArreglo: string };
  'var-no-soportado': Record<never, never>;
  'generico-no-soportado': Record<never, never>;
  /** Tarea 1.30: el tipo CONCRETO que escribió el alumno (`float`, `byte` o `short`), tanto en una declaración
   * (`byte b = 5;`) como en un cast (`(byte) x`): el texto lo nombra y sugiere la alternativa de ESE tipo. */
  'tipo-primitivo-no-soportado': { readonly tipo: TipoPrimitivoNoSoportado };
  'final-sin-inicializador-no-soportado': Record<never, never>;
  'for-mejorado-no-soportado': Record<never, never>;
  'etiqueta-no-soportada': Record<never, never>;
  'break-con-etiqueta-no-soportado': Record<never, never>;
  'continue-con-etiqueta-no-soportado': Record<never, never>;
  'try-catch-no-soportado': Record<never, never>;
  'throw-no-soportado': Record<never, never>;
  'switch-flecha-no-soportado': Record<never, never>;
  'case-con-varias-etiquetas-no-soportado': Record<never, never>;
  'anotacion-no-soportada': Record<never, never>;
  /** Tarea 1.29: el nombre completo tal como lo escribió el alumno (`java.util.Scanner`); si el uso es un
   * miembro (`java.lang.System.out.println`), el de la CLASE que es su prefijo (`java.lang.System`). */
  'nombre-calificado-no-soportado': { readonly nombre: string };
  'yield-no-soportado': Record<never, never>;
  'import-static-no-soportado': Record<never, never>;
  'lambda-no-soportada': Record<never, never>;
  /** Tarea 1.26: instrucción explícita del orquestador (heredada de la 1.24) — el texto nombra el
   * método CONCRETO, nunca un "miembro de biblioteca" genérico. `semantica/atribucion.ts` manda el
   * identificador real tal cual lo escribió el alumno. */
  'metodo-de-biblioteca-no-soportado': { readonly clase: string; readonly nombre: string };
  /** Tarea 1.26: mismo criterio que el método, para un acceso de CAMPO (`Integer.SIZE`, sin
   * paréntesis) — espacio de nombres separado (JLS 6.5.6), sitio de emisión propio
   * (`visitarAccesoMiembro`). */
  'campo-de-biblioteca-no-soportado': { readonly clase: string; readonly nombre: string };
  /** Tarea 1.26 (hallazgo del orquestador): un constructor NO tiene "nombre" propio en JLS (ver el
   * comentario de `sin-constructor-aplicable` en `problemas.ts`) — antes de esta tarea,
   * `semantica/atribucion.ts` inventaba `nombre: 'new ' + clase` para reusar el mismo código que
   * método/campo, y el texto resultante ("el miembro `new Scanner` de `Scanner`... `Scanner.new
   * Scanner`") describía una sintaxis que Java no tiene. Solo `clase`: el texto arma la sintaxis
   * real (`new ${clase}`) él mismo, sin que el motor tenga que fingir un identificador. */
  'constructor-de-biblioteca-no-soportado': { readonly clase: string };
  /** Tarea 1.29: el nombre TAL COMO lo escribió el alumno — el completo en un `import`
   * (`java.util.Locale`), el simple en el resto (`StringBuilder`, `Locale`, el de su propia clase). */
  'clase-no-soportada': { readonly nombre: string };
  /** Tarea 1.33: la llamada tal como el alumno la escribió, sin argumentos (`System.out.printf`, `flujo.printf`); si el receptor no es una
   * cadena de nombres, solo el nombre del método. El texto la muestra como `llamada(...)`. */
  'valor-de-tipo-no-soportado': { readonly llamada: string };
  /** Tarea 1.34: el valor tal como el alumno lo escribió (`System.in`, `System.out`, `System.err`); `null` si la expresión no es un nombre ni una cadena de
   * nombres (no debería ocurrir: es el respaldo de un valor que el motor no sabe describir). */
  'valor-de-tipo-no-modelado': { readonly valor: string | null };
  /** Tarea 1.29: la cláusula `extends`/`implements` de la cabecera de la clase; el texto no necesita más datos. */
  'herencia-no-soportada': Record<never, never>;
  /** Tarea 1.29: `assert cond;` o `assert cond : mensaje;`. */
  'assert-no-soportado': Record<never, never>;
  /** Tarea 1.29: un tipo (clase, interfaz, enum o record) declarado dentro de un método. */
  'clase-local-no-soportada': Record<never, never>;
  /** Tarea 1.29: un bloque `synchronized (obj) { … }`. */
  'sincronizado-no-soportado': Record<never, never>;
  /** Tarea 1.35: `new Tipo(...) { … }`; el texto no necesita más datos que la línea. */
  'clase-anonima-no-soportada': Record<never, never>;
  /** Tarea 1.35: el nombre del método tal como lo escribió el alumno (`main`). */
  'llamada-a-metodo-propio-no-soportada': { readonly nombre: string };
  /** Tarea 1.35: un archivo sin ninguna clase; el texto es del archivo entero y no necesita más datos. */
  'archivo-sin-clase': Record<never, never>;
  /** Tarea 1.35: el literal tal como lo escribió el alumno, sin espacios (`String.class`, `java.util.List.class`, `int[].class`). */
  'literal-de-clase-no-soportado': { readonly literal: string };
  /** Tarea 1.36: el nombre del paquete tal como lo escribió el alumno (`java.util.Map`). */
  'paquete-con-nombre-de-clase-no-soportado': { readonly nombre: string };
  /** Tarea 1.38: el nombre del paquete tal como lo lee javac, sin comentarios ni espacios (`java.miapp`). */
  'paquete-reservado-por-java': { readonly nombre: string };
  /** Tarea 1.39: el nombre del paquete tal como lo lee javac, sin comentarios ni espacios (`jdk.internal.misc`). */
  'paquete-interno-del-jdk': { readonly nombre: string };
  /** Tarea 1.36: solo la línea; el texto da el ejemplo (`"a" + 1.5`). */
  'constante-de-texto-con-decimal-no-soportada': Record<never, never>;
  /** Tarea 1.36: solo la línea donde el programa se pasó del tope. */
  'programa-demasiado-grande': Record<never, never>;
  /** Tarea 1.37: solo la línea donde el programa se pasó de los niveles de anidamiento. */
  'programa-demasiado-anidado': Record<never, never>;
  /** Tarea 1.36 (C-4a): solo la línea del texto (o de la concatenación) que se acerca al límite. */
  'tamano-de-texto-no-revisable': Record<never, never>;
  'escape-no-soportado': Record<never, never>;
  'escape-octal-no-soportado': Record<never, never>;
  'escape-unicode-no-soportado': Record<never, never>;
  /** Tarea 1.35: el carácter tal como lo escribió el alumno (un emoji: dos unidades UTF-16). */
  'caracter-suplementario-no-soportado': { readonly caracter: string };
  'bloque-de-texto-no-soportado': Record<never, never>;
  'literal-float-no-soportado': Record<never, never>;
  /** REQ-SUB-006, escenario "literal octal se explica, no se malinterpreta": el texto EXACTO que
   * escribió el alumno (p. ej. "010") y el valor decimal real que Java le da (8). */
  'literal-octal-no-soportado': { readonly textoOriginal: string; readonly valorDecimal: number };
  'literal-hexadecimal-no-soportado': Record<never, never>;
  'literal-binario-no-soportado': Record<never, never>;
  'asignacion-de-bits': Record<never, never>;
  'operador-ternario': Record<never, never>;
  instanceof: Record<never, never>;
  'operador-complemento-bits': Record<never, never>;
  'acceso-arreglo': Record<never, never>;
  'referencia-metodo': Record<never, never>;
  'this-super-no-soportado': Record<never, never>;
  'null-no-soportado': Record<never, never>;
  'switch-expresion-no-soportado': Record<never, never>;
  'operador-bits-or': Record<never, never>;
  'operador-bits-xor': Record<never, never>;
  'operador-bits-and': Record<never, never>;
  'operador-desplazamiento': Record<never, never>;
  /** Tarea 1.27: solo la línea (siempre calculada aparte, ver la cabecera de este archivo) — el
   * texto es-MX es deliberadamente genérico, sin nombrar el elemento AST interno (D2: nunca jerga
   * de desarrollo en un texto del alumno). */
  'ejecucion-no-disponible': Record<never, never>;
  'no-soportado': Record<never, never>;
}

/**
 * Construye, a partir de una forma común `Extra` (p. ej. `{ tipo:'no-soportado'; rango:Rango }`),
 * un tipo discriminado por `codigo` donde CADA miembro trae exactamente los datos que
 * `DatosPorCodigoNoSoportado` exige para ese código — nunca los de otro. Reusado por
 * `NodoNoSoportado`/`NodoExpresionNoSoportada` (sintaxis/ast.ts), `NoSoportadoLexico` (léxico,
 * literales.ts), `ProblemaAtribucion` (semantica/diagnostico.ts, tarea 1.28) y `ProblemaNoDisponible`
 * (problemas.ts, tarea 1.28): los sitios donde un emisor construye un valor "codigo + datos" nuevo,
 * o donde un tipo público lo expone. `NoSoportadoColectado` (sintaxis/no-soportado.ts) y `Token.datos`
 * sí siguen siendo `Record<string, unknown>`: solo COPIAN un valor ya construido aquí, y
 * `compilador.ts` re-afirma la pareja código/datos con un `as` documentado al armar el `Problema`.
 *
 * Un objeto construido con un `codigo` LITERAL (p. ej. `CODIGOS_NO_SOPORTADO.arreglo`) se verifica
 * de forma directa (TypeScript elige el miembro exacto de la unión y exige su `datos`). Un `codigo`
 * que llega por PARÁMETRO (p. ej. `consumirRestoDeSentenciaNoSoportada<C>`) necesita que la función
 * sea GENÉRICA sobre `C extends CodigoNoSoportado` — ver ese caso en `sintaxis/no-soportado.ts` para
 * el patrón completo, incluida la única forma de construir el valor de retorno (un `as` acotado a
 * la firma genérica, nunca un escape general de tipos).
 */
export type ConDatosPorCodigo<Extra> = {
  readonly [C in CodigoNoSoportado]: Extra & { readonly codigo: C; readonly datos: DatosPorCodigoNoSoportado[C] };
}[CodigoNoSoportado];
