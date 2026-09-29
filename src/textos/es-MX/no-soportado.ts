// Catálogo es-MX — mensajes de "No disponible en el visualizador" (ADR 015; tarea 1.24; ADR 003;
// REQ-SUB-006/REQ-SUB-007; proposal.md §2.3 "Cómo se comporta el aviso"). El motor SOLO emite
// `codigo` (unión cerrada `CodigoNoSoportado`, `src/motor/no-soportado.ts`) + los datos mínimos que
// ya calcula `compilador.ts` (la línea); este catálogo es el ÚNICO lugar que arma la frase en
// español de México — TypeScript exige, por el tipo `Record<CodigoNoSoportado, ...>`, que existan
// TODAS las claves de la unión cerrada, así que agregar un código nuevo sin darle texto aquí deja
// de compilar (mismo mecanismo que `textosProblemas` ya usa para `CodigoProblema` desde 1.11).
//
// Formato (REQ-SUB-006, proposal.md §2.3): cada mensaje señala la línea y la construcción, dice que
// Java sí la acepta, aclara que el visualizador cubre las unidades 3 a 7, y ofrece una alternativa
// dentro de alcance cuando existe una razonable — nunca inventa una si no la hay (D2). Tono
// (exploracion/01 §7, revisado por el PO): tuteo, amable, preciso, sin infantilizar; nunca deja al
// alumno sin una pista de qué hacer cuando hay una.
//
// Solo puede importar tipos de `motor/vista` (matriz de capas, herramientas/eslint/matriz-capas.ts).
import type { CodigoNoSoportado, DatosPorCodigoNoSoportado } from '../../motor/vista.ts';

interface DatosLinea {
  readonly linea: number;
}

// El mapeo código → forma de sus datos: línea (siempre, la calcula `compilador.ts`) MÁS los datos
// EXTRA que cada código exige. Tarea 1.25: la forma extra YA NO se duplica aquí — se deriva de
// `DatosPorCodigoNoSoportado` (motor/no-soportado.ts vía motor/vista.ts), la MISMA forma que el
// motor ya exige a cada emisor (léxico/sintaxis/expresiones/atribución de biblioteca). Antes de esta
// tarea esta interfaz repetía la forma de cada código A MANO, sin que nada obligara al MOTOR a
// mandar esos datos de verdad — 5 códigos reales lo incumplían en silencio (el alumno veía
// "undefined" en vez del literal/tipo/miembro real, ver `motor/no-soportado.ts` para el hallazgo
// completo). Si `CodigoNoSoportado` agrega o quita un código sin actualizar `DatosPorCodigoNoSoportado`
// (motor), `textosNoSoportado` de abajo deja de compilar — mecanismo sin cambios desde la tarea 1.24.
//
// Tarea 1.28: es un alias GENÉRICO (`DatosDe<K>`) y no un mapa `{ [K in …]: … }[K]`, a propósito: con
// el alias, indexar el catálogo con un código genérico (`textosNoSoportado[codigo]`, en
// `presentacion/texto-del-problema.ts`) deja el parámetro como `DatosLinea &
// DatosPorCodigoNoSoportado[C]` y TypeScript correlaciona el código con SUS datos sin ningún cast;
// con el mapa, el parámetro quedaba como un acceso indexado sin resolver y exigía la intersección de
// los datos de los 45 códigos.
type DatosDe<K extends CodigoNoSoportado> = DatosLinea & DatosPorCodigoNoSoportado[K];

// Marco común a (casi) todos los avisos (REQ-SUB-006): "Tu programa usa QUÉ en la línea N. Java sí
// lo acepta, pero este visualizador cubre las unidades 3 a 7 y todavía TODAVÍA-QUÉ.
// [ALTERNATIVA opcional] No lo ejecuto para no enseñarte un resultado que podría no ser el de
// Java." Reproduce BYTE A BYTE el ejemplo literal de la propuesta para el caso de arreglos (ver
// no-soportado.test.ts). "lo" es el "lo" neutro del español (retoma la ACCIÓN — "usar QUÉ" —, no el
// género de QUÉ), así que la misma frase sirve para cualquier construcción sin desacuerdo de género.
function marco(linea: number, que: string, todavia: string, alternativa?: string): string {
  const sufijoAlternativa = alternativa === undefined ? '' : ` ${alternativa}`;
  return (
    `Tu programa usa ${que} en la línea ${linea}. Java sí lo acepta, pero este visualizador cubre ` +
    `las unidades 3 a 7 y todavía ${todavia}.${sufijoAlternativa} No lo ejecuto para no enseñarte ` +
    `un resultado que podría no ser el de Java.`
  );
}

export const textosNoSoportado: { readonly [K in CodigoNoSoportado]: (datos: DatosDe<K>) => string } = {
  'otro-tipo-de-nivel-superior-no-soportado': ({ linea }) =>
    marco(linea, 'otra clase, interfaz, enum o record además de la principal', 'no ejecuta programas con más de un tipo de nivel superior'),

  'miembro-de-clase-no-soportado': ({ linea }) =>
    marco(
      linea,
      'un miembro propio de la clase (un campo, un método distinto de `main`, una clase interna o un bloque inicializador)',
      'no ejecuta nada fuera de `main`',
      'Si necesitas repetir código, cópialo dentro de `main` por ahora.',
    ),

  'throws-no-soportado': ({ linea }) => marco(linea, 'una cláusula `throws` en `main`', 'no interpreta el manejo de excepciones'),

  'arreglo-no-soportado': ({ linea, tipoArreglo }) =>
    marco(linea, `un arreglo (\`${tipoArreglo}\`)`, 'no muestra arreglos'),

  'var-no-soportado': ({ linea }) =>
    marco(linea, '`var` para declarar una variable', 'no infiere tipos con `var`', 'Escribe el tipo explícito (`int`, `double`, `String`…) en su lugar.'),

  'generico-no-soportado': ({ linea }) => marco(linea, 'un tipo genérico (como `ArrayList<Integer>`)', 'no muestra colecciones ni tipos genéricos'),

  'tipo-primitivo-no-soportado': ({ linea }) =>
    marco(
      linea,
      'un tipo primitivo (`float`, `byte` o `short`) que Java sí tiene, pero que no forma parte de este subconjunto',
      'no simula ese tipo (para no arriesgarme a darte un valor que no coincida con el de Java)',
      'Si tu programa lo permite, usa `double` en vez de `float`, o `int` en vez de `byte`/`short`.',
    ),

  'final-sin-inicializador-no-soportado': ({ linea }) =>
    marco(linea, 'una variable `final` sin valor inicial', 'solo admite `final` cuando ya trae su valor', 'Agrégale un valor al declararla, por ejemplo `final int MAX = 10;`.'),

  'for-mejorado-no-soportado': ({ linea }) =>
    marco(linea, 'un ciclo `for` mejorado (`for-each`)', 'no ejecuta el `for` mejorado', 'Usa un `for` clásico con índice para recorrer el arreglo.'),

  'etiqueta-no-soportada': ({ linea }) => marco(linea, 'una sentencia con etiqueta (`nombre:`)', 'no interpreta etiquetas'),

  'break-con-etiqueta-no-soportado': ({ linea }) =>
    marco(linea, 'un `break` con etiqueta', 'solo ejecuta `break` sin etiqueta', 'Reestructura el ciclo para poder usar un `break` simple.'),

  'continue-con-etiqueta-no-soportado': ({ linea }) =>
    marco(linea, 'un `continue` con etiqueta', 'solo ejecuta `continue` sin etiqueta', 'Reestructura el ciclo para poder usar un `continue` simple.'),

  'try-catch-no-soportado': ({ linea }) => marco(linea, 'un bloque `try`/`catch`', 'no ejecuta el manejo de excepciones'),

  'throw-no-soportado': ({ linea }) => marco(linea, 'una sentencia `throw`', 'no ejecuta el manejo de excepciones'),

  'switch-flecha-no-soportado': ({ linea }) =>
    marco(linea, 'un `switch` con flecha (`case valor -> …`)', 'solo ejecuta la forma clásica de `switch`', 'Usa `case valor:` seguido de `break;`, la forma clásica.'),

  'yield-no-soportado': ({ linea }) =>
    marco(linea, 'la palabra `yield` dentro de un `switch`', 'no interpreta `yield`', 'Usa la forma clásica de `switch`, asignando el valor directamente dentro de cada `case`.'),

  'import-static-no-soportado': ({ linea }) =>
    marco(linea, 'un `import static`', 'no interpreta los imports estáticos', 'Usa el import normal y escribe el nombre completo, por ejemplo `Math.PI` en vez de `PI`.'),

  'lambda-no-soportada': ({ linea }) => marco(linea, 'una expresión lambda (`->`)', 'no ejecuta lambdas'),

  // Tarea 1.26 (agregada por el orquestador): el código único anterior, "miembro-de-biblioteca-no-
  // soportado", usaba "miembro" (jerga que un alumno de U3-U7 no conoce — conoce "método") y, para
  // un constructor, inventaba `nombre: 'new ' + clase` porque un constructor no tiene "nombre" propio
  // en JLS — el texto resultante ("el miembro `new Scanner` de `Scanner`... `Scanner.new Scanner`")
  // describía una sintaxis que Java no tiene. Divididos en 3 textos, cada uno con la palabra que el
  // alumno SÍ reconoce.
  'metodo-de-biblioteca-no-soportado': ({ linea, clase, nombre }) =>
    marco(linea, `el método \`${nombre}\` de \`${clase}\``, 'no simula ese método'),

  'campo-de-biblioteca-no-soportado': ({ linea, clase, nombre }) =>
    marco(linea, `\`${clase}.${nombre}\``, 'no simula ese valor'),

  // Un constructor no tiene "nombre" propio en JLS (`DatosPorCodigoNoSoportado` solo manda `clase`)
  // — el texto arma la sintaxis real de la llamada ("new Scanner") él mismo, en vez de que el motor
  // tenga que fingir un identificador que Java no usa.
  'constructor-de-biblioteca-no-soportado': ({ linea, clase }) =>
    marco(linea, `\`new ${clase}\` con esos argumentos`, `no simula esa forma de crear un \`${clase}\``),

  'escape-no-soportado': ({ linea }) =>
    marco(linea, 'una secuencia de escape que Java reconoce pero este visualizador todavía no simula (como `\\r`, `\\b`, `\\f` o `\\s`)', 'no decodifica ese escape'),

  'escape-octal-no-soportado': ({ linea }) => marco(linea, 'un escape octal dentro de un texto o carácter (como `\\101`)', 'no decodifica escapes octales'),

  'escape-unicode-no-soportado': ({ linea }) => marco(linea, 'un escape Unicode (`\\uXXXX`)', 'no decodifica escapes Unicode'),

  'bloque-de-texto-no-soportado': ({ linea }) =>
    marco(linea, 'un bloque de texto (`""" … """`)', 'no interpreta bloques de texto', 'Usa comillas dobles normales, con `\\n` para los saltos de línea.'),

  'literal-float-no-soportado': ({ linea }) =>
    marco(linea, 'un literal `float` (el sufijo `f`)', 'solo trabaja con `double` para los números con punto decimal', 'Quita el sufijo `f` (o cámbialo por `d`) para que sea un `double`.'),

  'literal-octal-no-soportado': ({ linea, textoOriginal, valorDecimal }) =>
    marco(
      linea,
      `el número \`${textoOriginal}\``,
      'no simula literales octales',
      `Cuidado: Java no lee "${textoOriginal}" en base diez — lo interpreta como octal (base 8), así que su valor real es ${valorDecimal}. Si querías escribir ese número en decimal, quita el "0" inicial.`,
    ),

  'literal-hexadecimal-no-soportado': ({ linea }) =>
    marco(linea, 'un literal hexadecimal (`0x…`)', 'solo trabaja con literales en base diez', 'Escribe el valor equivalente en decimal.'),

  'literal-binario-no-soportado': ({ linea }) =>
    marco(linea, 'un literal binario (`0b…`)', 'solo trabaja con literales en base diez', 'Escribe el valor equivalente en decimal.'),

  'asignacion-de-bits': ({ linea }) =>
    marco(linea, 'una asignación compuesta de bits (`&=`, `|=`, `^=`, `<<=`, `>>=` o `>>>=`)', 'no ejecuta operaciones de bits'),

  'operador-ternario': ({ linea }) => marco(linea, 'el operador ternario (`?:`)', 'no evalúa el operador ternario', 'Usa un `if`/`else` equivalente.'),

  instanceof: ({ linea }) => marco(linea, '`instanceof`', 'no evalúa `instanceof`'),

  'operador-complemento-bits': ({ linea }) => marco(linea, 'el operador de complemento de bits (`~`)', 'no ejecuta operaciones de bits'),

  'acceso-arreglo': ({ linea }) => marco(linea, 'un acceso a un arreglo con `[ ]`', 'no muestra arreglos'),

  'referencia-metodo': ({ linea }) => marco(linea, 'una referencia a método (`::`)', 'no interpreta referencias a método'),

  'this-super-no-soportado': ({ linea }) => marco(linea, '`this` o `super`', 'no simula referencias a la propia instancia'),

  'null-no-soportado': ({ linea }) => marco(linea, '`null`', 'no simula referencias nulas'),

  'switch-expresion-no-soportado': ({ linea }) =>
    marco(
      linea,
      'un `switch` usado como expresión (con `yield` o con flecha, para obtener un valor)',
      'solo ejecuta el `switch` como sentencia clásica',
      'Usa la forma clásica de `switch` y asigna el valor dentro de cada `case`.',
    ),

  'operador-bits-or': ({ linea }) =>
    marco(linea, 'el operador de bits `|`', 'no ejecuta operaciones de bits', 'Si buscabas la versión lógica de corto-circuito, en este subconjunto sí existe `||`.'),

  'operador-bits-xor': ({ linea }) => marco(linea, 'el operador de bits `^`', 'no ejecuta operaciones de bits'),

  'operador-bits-and': ({ linea }) =>
    marco(linea, 'el operador de bits `&`', 'no ejecuta operaciones de bits', 'Si buscabas la versión lógica de corto-circuito, en este subconjunto sí existe `&&`.'),

  'operador-desplazamiento': ({ linea }) => marco(linea, 'un operador de desplazamiento de bits (`<<`, `>>` o `>>>`)', 'no ejecuta operaciones de bits'),

  // Tarea 1.27 (agregada por el orquestador, D2/regla 5 de CLAUDE.md): a diferencia de TODO el
  // resto de este catálogo, esta construcción SÍ está dentro del subconjunto U3-U7 (por eso el texto
  // NUNCA dice "este visualizador cubre las unidades 3 a 7" — sería engañoso, `marco()` no aplica
  // aquí) — el hueco es que `generarIr` todavía no sabe EJECUTARLA (lote 2, tareas 1.5/2.16). Texto
  // deliberadamente genérico, sin nombrar el elemento AST interno: "declaracion-local", "lote" y
  // "tarea" son jerga de desarrollo que un alumno nunca debe leer.
  'ejecucion-no-disponible': ({ linea }) =>
    `Java sí acepta tu programa, pero este visualizador todavía no sabe ejecutar lo que escribiste ` +
    `en la línea ${linea}. No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.`,

  // Respaldo defensivo (`motor/no-soportado.ts` → `sinClasificar`): en la práctica nunca debería
  // alcanzarse (todo token `no-soportado` fija su código al crearse) — a diferencia del resto del
  // catálogo, este texto NO afirma "Java sí lo acepta" porque, si de verdad se llega aquí, no hay
  // certeza de qué construcción es (D2: nunca un resultado inventado, ni siquiera en el mensaje).
  'no-soportado': ({ linea }) =>
    `Tu programa usa, en la línea ${linea}, una construcción que este visualizador no alcanza a identificar con precisión. ` +
    `Por seguridad, no la ejecuto: podría no coincidir con lo que Java realmente hace.`,
};
