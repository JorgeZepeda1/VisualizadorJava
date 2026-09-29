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

  // ---- Léxico (lexico/literales.ts, lexico/analizador-lexico.ts) — tarea 1.24: antes strings
  // inline, nunca reunidos en una tabla. ----
  escapeNoSoportado: 'escape-no-soportado',
  escapeOctalNoSoportado: 'escape-octal-no-soportado',
  escapeUnicodeNoSoportado: 'escape-unicode-no-soportado',
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
  'tipo-primitivo-no-soportado': Record<never, never>;
  'final-sin-inicializador-no-soportado': Record<never, never>;
  'for-mejorado-no-soportado': Record<never, never>;
  'etiqueta-no-soportada': Record<never, never>;
  'break-con-etiqueta-no-soportado': Record<never, never>;
  'continue-con-etiqueta-no-soportado': Record<never, never>;
  'try-catch-no-soportado': Record<never, never>;
  'throw-no-soportado': Record<never, never>;
  'switch-flecha-no-soportado': Record<never, never>;
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
  'escape-no-soportado': Record<never, never>;
  'escape-octal-no-soportado': Record<never, never>;
  'escape-unicode-no-soportado': Record<never, never>;
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
 * `NodoNoSoportado`/`NodoExpresionNoSoportada` (sintaxis/ast.ts) y `NoSoportadoLexico` (léxico,
 * literales.ts): los TRES sitios donde un emisor construye un valor "codigo + datos" nuevo (a
 * diferencia de `NoSoportadoColectado`/`Problema.datos`, que solo COPIAN un valor ya construido
 * aquí — por eso esos dos siguen siendo `Record<string, unknown>`, igual que `ProblemaAtribucion.
 * datos` ya era desde la tarea 1.11: no hay nada nuevo que verificar en una copia).
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
