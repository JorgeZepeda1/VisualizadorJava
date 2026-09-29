// Catálogo es-MX — mensajes de "No disponible en el visualizador" (ADR 015; tarea 1.24; ADR 003;
// REQ-SUB-006/REQ-SUB-007; proposal.md §2.3 "Cómo se comporta el aviso"). El motor SOLO emite
// `codigo` (unión cerrada `CodigoNoSoportado`, `src/motor/no-soportado.ts`) + los datos mínimos que
// ya calcula `compilador.ts` (la línea); este catálogo es el ÚNICO lugar que arma la frase en
// español de México — TypeScript exige, por el tipo `Record<CodigoNoSoportado, ...>`, que existan
// TODAS las claves de la unión cerrada, así que agregar un código nuevo sin darle texto aquí deja
// de compilar (mismo mecanismo que `textosProblemas` ya usa para `CodigoProblema` desde 1.11).
//
// Formato (REQ-SUB-006, proposal.md §2.3): cada mensaje señala la línea y la construcción, dice que
// la construcción es parte de Java, aclara que el visualizador cubre las unidades 3 a 7 y admite que
// por eso no puede revisar si esa parte está bien escrita, y ofrece una alternativa dentro de alcance
// cuando existe una razonable — nunca inventa una si no la hay (D2). Tono (exploracion/01 §7,
// revisado por el PO): tuteo, amable, preciso, sin infantilizar; nunca deja al alumno sin una pista
// de qué hacer cuando hay una.
//
// Tarea 1.30 (decisión explícita del PO, 2026-09-29): un aviso afirma algo de la CONSTRUCCIÓN («es
// parte de Java»), NUNCA del PROGRAMA. Reconocer una construcción fuera del subconjunto no permite
// revisar la validez de lo que queda dentro de ella, y hay programas que javac rechaza y que llegan
// aquí (un método propio sin `return`, `byte c = a + b;`, un `break` a una etiqueta que no existe…):
// decirles «Java sí lo acepta» era FALSO (D2). La única excepción es `ejecucion-no-disponible`, que solo
// se emite DESPUÉS de que todas las pasadas de compilación aceptaron el programa. Lo fijan
// `pruebas/compilacion/programas-invalidos.test.ts` (corpus real, veredictos de javac) y `no-soportado.test.ts`.
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

// Tarea 1.30: el tipo del subconjunto que más se parece a cada uno de los tres que Java tiene y el
// visualizador no simula (`float` → `double`; `byte` y `short` → `int`). Tipado por el MISMO `tipo` que el
// motor manda en los datos del aviso: agregar un tipo allá deja este mapa sin su entrada y `npm run tipos` falla.
const TIPO_DEL_SUBCONJUNTO_EN_SU_LUGAR: Record<DatosPorCodigoNoSoportado['tipo-primitivo-no-soportado']['tipo'], 'int' | 'double'> = {
  float: 'double',
  byte: 'int',
  short: 'int',
};

// Marco común a (casi) todos los avisos (REQ-SUB-006): "Tu programa usa QUÉ en la línea N. Es parte de
// Java, pero este visualizador cubre las unidades 3 a 7 y todavía TODAVÍA, así que no puedo revisar si
// esa parte está bien escrita.[ ALTERNATIVA] No lo ejecuto para no enseñarte un resultado que podría no
// ser el de Java." Tarea 1.30 (frase aprobada por el PO el 2026-09-29): "Es parte de Java" afirma la
// CONSTRUCCIÓN (sujeto: QUÉ, que la oración anterior acaba de nombrar), nunca el programa entero, y "no
// puedo revisar si esa parte está bien escrita" admite lo que el reconocimiento de lo no soportado no
// ve. Antes decía "Java sí lo acepta", que para un programa que javac rechaza era FALSO (D2). El
// ejemplo literal del escenario de arreglos vive en no-soportado.test.ts.
function marco(linea: number, que: string, todavia: string, alternativa?: string): string {
  const sufijoAlternativa = alternativa === undefined ? '' : ` ${alternativa}`;
  return (
    `Tu programa usa ${que} en la línea ${linea}. Es parte de Java, pero este visualizador cubre ` +
    `las unidades 3 a 7 y todavía ${todavia}, así que no puedo revisar si esa parte está bien ` +
    `escrita.${sufijoAlternativa} No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.`
  );
}

export const textosNoSoportado: { readonly [K in CodigoNoSoportado]: (datos: DatosDe<K>) => string } = {
  'otro-tipo-de-nivel-superior-no-soportado': ({ linea }) =>
    marco(linea, 'otra clase, interfaz, enum o record además de la principal', 'no ejecuta programas con más de un tipo de nivel superior'),

  'miembro-de-clase-no-soportado': ({ linea }) =>
    marco(
      linea,
      'un miembro propio de la clase (un campo, un constructor, un método distinto de `main`, una clase interna o un bloque inicializador)',
      'no ejecuta nada fuera de `main`',
      'Si necesitas repetir código, cópialo dentro de `main` por ahora.',
    ),

  'throws-no-soportado': ({ linea }) => marco(linea, 'una cláusula `throws` en `main`', 'no interpreta el manejo de excepciones'),

  'arreglo-no-soportado': ({ linea, tipoArreglo }) =>
    marco(linea, `un arreglo (\`${tipoArreglo}\`)`, 'no muestra arreglos'),

  'var-no-soportado': ({ linea }) =>
    marco(linea, '`var` para declarar una variable', 'no infiere tipos con `var`', 'Escribe el tipo explícito (`int`, `double`, `String`…) en su lugar.'),

  'generico-no-soportado': ({ linea }) => marco(linea, 'un tipo genérico (como `ArrayList<Integer>`)', 'no muestra colecciones ni tipos genéricos'),

  // Tarea 1.30 (decisión del PO, 2026-09-29): nombra el tipo CONCRETO que escribió el alumno y sugiere la
  // alternativa de ESE tipo (antes: una lista de los tres, «Java sí tiene», y «en la línea N» a media oración).
  'tipo-primitivo-no-soportado': ({ linea, tipo }) =>
    marco(
      linea,
      `el tipo \`${tipo}\``,
      'no simula ese tipo',
      `Si tu programa lo permite, usa \`${TIPO_DEL_SUBCONJUNTO_EN_SU_LUGAR[tipo]}\` en vez de \`${tipo}\`.`,
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

  // Tarea 1.29: `case 1, 2:` (Java 14+). Ofrece la forma que sí ejecuta el subconjunto: un `case` por valor.
  'case-con-varias-etiquetas-no-soportado': ({ linea }) =>
    marco(
      linea,
      'un `case` con varios valores separados por coma (`case 1, 2:`)',
      'solo ejecuta un valor por cada `case`',
      'Escribe un `case` por cada valor, uno debajo del otro: `case 1:` y luego `case 2:`.',
    ),

  // Tarea 1.29: una anotación. Casi siempre solo silencia un aviso del editor; quitarla no cambia el programa.
  'anotacion-no-soportada': ({ linea }) =>
    marco(
      linea,
      'una anotación (como `@Override` o `@SuppressWarnings`)',
      'no interpreta anotaciones',
      'Si solo silencia un aviso del editor, puedes quitarla.',
    ),

  // Tarea 1.29: el nombre COMPLETO de una clase (sin `import`). Se explica cómo escribirlo: el `import` y el
  // nombre corto, que salen del propio nombre completo (el último segmento).
  'nombre-calificado-no-soportado': ({ linea, nombre }) =>
    marco(
      linea,
      `el nombre completo de una clase (\`${nombre}\`)`,
      'solo entiende las clases por su nombre corto',
      `Escribe \`import ${nombre};\` al principio del programa y usa solo \`${nombre.slice(nombre.lastIndexOf('.') + 1)}\`.`,
    ),

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

  // Tarea 1.29: la clase existe en Java (un import correcto ya no se lee como «no reconozco…, revisa que
  // esté bien escrito»); el visualizador solo no la simula. El nombre es el que escribió el alumno.
  'clase-no-soportada': ({ linea, nombre }) => marco(linea, `la clase \`${nombre}\``, 'no simula esa clase'),

  // Tarea 1.29: la cabecera de la clase con `extends` (hereda de otra clase) o `implements` (cumple una interfaz).
  'herencia-no-soportada': ({ linea }) =>
    marco(linea, 'una clase que hereda de otra o implementa una interfaz (`extends` o `implements`)', 'no simula herencia ni interfaces'),

  // Tarea 1.29: `assert`, un tipo declarado dentro de un método y un bloque `synchronized`.
  'assert-no-soportado': ({ linea }) => marco(linea, 'una instrucción `assert`', 'no comprueba aserciones'),

  'clase-local-no-soportada': ({ linea }) =>
    marco(linea, 'un tipo declarado dentro de un método (una clase, interfaz, enum o record local)', 'no simula clases propias'),

  'sincronizado-no-soportado': ({ linea }) =>
    marco(linea, 'un bloque `synchronized`', 'no simula hilos ni sincronización'),

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
  //
  // Tarea 1.30: es el ÚNICO texto que afirma «Java sí acepta tu programa», y es cierto porque solo se
  // emite DESPUÉS de que TODAS las pasadas de compilación (léxico+sintaxis, atribución, alcanzabilidad y
  // asignación definitiva) aceptaron el programa entero; cualquier otro aviso se emite al RECONOCER una
  // construcción, sin poder revisar el resto, y por eso ya no lo afirma (ver la cabecera y `marco()`).
  'ejecucion-no-disponible': ({ linea }) =>
    `Java sí acepta tu programa, pero este visualizador todavía no sabe ejecutar lo que escribiste ` +
    `en la línea ${linea}. No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.`,

  // Respaldo defensivo (`motor/no-soportado.ts` → `sinClasificar`): en la práctica nunca debería
  // alcanzarse (todo token `no-soportado` fija su código al crearse) — a diferencia del resto del
  // catálogo, este texto NO usa el marco («Es parte de Java…») porque, si de verdad se llega aquí, no hay
  // certeza de qué construcción es, así que ni siquiera afirma que sea parte de Java (D2: nunca un
  // resultado inventado, ni siquiera en el mensaje).
  'no-soportado': ({ linea }) =>
    `Tu programa usa, en la línea ${linea}, una construcción que este visualizador no alcanza a identificar con precisión. ` +
    `Por seguridad, no la ejecuto: podría no coincidir con lo que Java realmente hace.`,
};
