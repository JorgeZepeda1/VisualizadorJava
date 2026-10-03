// Catálogo es-MX — mensajes de `Problema` (ADR 015; design.md línea 89, tarea 1.11). Funciones
// tipadas por sus datos (ADR 015 punto 1): el motor (`src/motor/problemas.ts`,
// `src/motor/semantica/*.ts`) SOLO emite `codigo` + `datos`, nunca texto; `textosProblemas` es el
// ÚNICO lugar que arma la frase en español de México — TypeScript exige, por el tipo
// `Record<CodigoProblema, ...>`, que existan TODAS las claves del catálogo cerrado
// (`src/motor/problemas.ts`), así que no hay manera de olvidar una al agregarla allá sin que esto
// deje de compilar.
//
// Tono (revisado por el PO, proposal.md): tuteo, directo, nunca "incorrecto" a secas — explica QUÉ
// pasó y, cuando aplica, una pista de cómo arreglarlo. Solo puede importar tipos de `motor/vista`
// (matriz de capas, herramientas/eslint/matriz-capas.ts).
import type { CodigoProblema, DatosPorCodigoProblema, Tipo } from '../../motor/vista.ts';

// Tarea 1.28: la forma de los datos de cada código YA NO se repite aquí. Vive en el motor
// (`DatosPorCodigoProblema`, `motor/problemas.ts`, vía `motor/vista.ts`) — la MISMA que exige a cada
// emisor (`semantica/*.ts`, `compilador.ts`) y que estrecha `Problema` — como la tarea 1.25 hizo con
// los avisos. Si `CodigoProblema` agrega o quita una clave sin actualizar `DatosPorCodigoProblema`,
// o esta tabla queda sin una clave, deja de compilar — la garantía real de ADR 015 punto 1.

// Tarea 1.32 (F1): cómo se nombra el valor de ORIGEN de un cast que Java rechaza («No puedes convertir un texto (`String`) en `int`…»).
const ORIGEN_DE_UN_CAST: Readonly<Record<Tipo, string>> = {
  int: 'un número entero (`int`)',
  long: 'un número (`long`)',
  double: 'un número decimal (`double`)',
  char: 'un carácter (`char`)',
  boolean: 'un valor `boolean`',
  String: 'un texto (`String`)',
  Scanner: 'un `Scanner`',
  Random: 'un `Random`',
  desconocido: 'un valor',
};

const NUMERICOS_DE_UN_CAST: ReadonlySet<Tipo> = new Set<Tipo>(['int', 'long', 'double', 'char']);

// La salida que SÍ existe dentro del subconjunto (REQ-SUB-005: `Integer.parseInt`, `Double.parseDouble`, `String.valueOf`, `charAt`);
// `null` cuando no hay una razonable — nunca se inventa una (`Long.parseLong` no está en el subconjunto, REQ-SUB-002).
function sugerenciaParaUnCast(origen: Tipo, destino: Tipo): string | null {
  if (origen === 'String') {
    if (destino === 'int') return 'Para leer un número escrito como texto usa `Integer.parseInt(...)`.';
    if (destino === 'double') return 'Para leer un número escrito como texto usa `Double.parseDouble(...)`.';
    if (destino === 'char') return 'Para tomar una letra de un texto usa `charAt(...)`, por ejemplo `texto.charAt(0)`.';
    return null;
  }
  if (destino === 'String' && (origen === 'boolean' || NUMERICOS_DE_UN_CAST.has(origen))) return 'Para convertirlo en texto usa `String.valueOf(...)`.';
  if (origen === 'boolean' && NUMERICOS_DE_UN_CAST.has(destino)) {
    return '`true` y `false` no son números en Java: si necesitas un número según una condición, usa un `if`.';
  }
  if (destino === 'boolean' && NUMERICOS_DE_UN_CAST.has(origen)) {
    return 'En Java un número nunca es verdadero o falso: compáralo con algo, por ejemplo `numero != 0`.';
  }
  return null;
}

function textoDeUnCastInvalido(origen: Tipo, destino: Tipo): string {
  const principio = `No puedes convertir ${ORIGEN_DE_UN_CAST[origen]} en \`${destino}\` con un cast`;
  const sugerencia = sugerenciaParaUnCast(origen, destino);
  return sugerencia === null ? `${principio}: Java no considera compatibles esos dos tipos.` : `${principio}. ${sugerencia}`;
}

// Tarea 1.33 (WARNING-2): `System.out.println("a", x)` (una costumbre de Python) decía «Te falta cerrar un paréntesis» y `System.out.print()`
// «se esperaba una expresión»; javac dice «no suitable method found for println(String,int)». El texto genérico se completa donde hay una
// pista real: `println` y `print` reciben UN solo valor (para mostrar varios se juntan con `+`), y sin argumentos se dice eso, en vez de
// «los argumentos que le diste ()».
function textoDeSinSobrecargaAplicable(clase: string, nombre: string, argumentos: readonly string[]): string {
  if (argumentos.length === 0) return `Ningún "${nombre}(...)" de "${clase}" se puede llamar sin argumentos: falta darle un valor. Revisa la llamada.`;
  const generico = `Ningún "${nombre}(...)" de "${clase}" acepta los argumentos que le diste (${argumentos.join(', ')}). Revisa el tipo de cada uno.`;
  const esImpresion = clase === 'PrintStream' && (nombre === 'print' || nombre === 'println');
  if (!esImpresion || argumentos.length < 2) return generico;
  return `${generico} \`${nombre}\` recibe un solo valor: para mostrar varios, júntalos con \`+\`, por ejemplo \`${nombre}("Suma: " + suma)\`.`;
}

export const textosProblemas: { readonly [K in CodigoProblema]: (datos: DatosPorCodigoProblema[K]) => string } = {
  'falta-punto-y-coma': () => 'Te falta un punto y coma ";" al final de esta línea.',
  'falta-parentesis-cierre': () => 'Te falta cerrar un paréntesis ")".',
  'error-no-clasificado': ({ mensaje }) => `Hay un error de sintaxis aquí: ${mensaje}.`,
  'variable-no-declarada': ({ nombre, sugerencia }) =>
    sugerencia === undefined
      ? `No existe una variable llamada "${nombre}". ¿La declaraste antes? ¿Se te fue un error de dedo?`
      : `No existe una variable llamada "${nombre}". ¿Quisiste decir "${sugerencia}" (con mayúscula)?`,
  'metodo-no-declarado': ({ nombre }) => `No existe un método llamado "${nombre}()". ¿Lo definiste?`,
  'variable-ya-definida': ({ nombre }) => `Ya existe una variable llamada "${nombre}" visible en este punto; usa otro nombre.`,
  'tipo-no-reconocido': ({ nombre }) =>
    `No reconozco el tipo "${nombre}". Revisa que esté bien escrito (en Java los tipos casi siempre empiezan con mayúscula, como "String").`,
  'campo-no-declarado': ({ clase, nombre }) =>
    `"${clase}" no tiene ningún valor llamado "${nombre}". Revisa que esté bien escrito y que no le falten los paréntesis "()" si en realidad es un método.`,
  'miembro-no-declarado': ({ clase, nombre }) =>
    `"${clase}" no tiene ningún método llamado "${nombre}()". Revisa que esté bien escrito.`,
  'sin-sobrecarga-aplicable': ({ clase, nombre, argumentos }) => textoDeSinSobrecargaAplicable(clase, nombre, argumentos),
  'sin-constructor-aplicable': ({ clase, argumentos }) =>
    `Ningún constructor de "${clase}" acepta los argumentos que le diste (${argumentos.join(', ')}). Revisa el tipo y la cantidad de cada uno.`,
  'conversion-con-perdida': ({ origen, destino }) =>
    `Estás guardando un valor de tipo "${origen}" en una variable "${destino}"; puedes perder información. Usa "(${destino})" si es a propósito.`,
  'tipos-incompatibles-en-asignacion': ({ origen, destino }) =>
    `No puedes guardar un valor de tipo "${origen}" en una variable "${destino}": son tipos incompatibles.`,
  'condicion-no-booleana': ({ tipo }) =>
    `La condición debe ser verdadera o falsa ("boolean"), no un valor de tipo "${tipo}". Prueba comparando con algo, por ejemplo "!= 0".`,
  'tipos-incomparables': ({ izquierda, derecha }) =>
    `No puedes comparar un valor de tipo "${izquierda}" con uno de tipo "${derecha}" usando "=="/"!=".`,
  'operandos-invalidos-operador-binario': ({ operador, izquierda, derecha }) =>
    `El operador "${operador}" no se puede usar entre un valor de tipo "${izquierda}" y uno de tipo "${derecha}".`,
  'operando-invalido-operador-unario': ({ operador, operando }) =>
    `El operador "${operador}" no se puede usar con un valor de tipo "${operando}".`,
  'importacion-no-reconocida': ({ nombre }) =>
    `No reconozco "${nombre}" como algo que se pueda importar. Revisa que el nombre esté bien escrito, como "java.util.Scanner".`,
  'objetivo-no-es-variable': () =>
    'Aquí se necesita el nombre de una variable ya declarada, no una clase ni el resultado de otra operación.',
  'selector-de-switch-invalido': ({ tipo }) => `El valor de un "switch" debe ser "int", "char" o "String", no "${tipo}".`,
  'etiqueta-de-case-no-constante': () => 'Cada "case" necesita un valor fijo (constante), no una variable ni un cálculo.',
  'etiqueta-de-case-duplicada': () => 'Ya existe un "case" con este mismo valor más arriba; cada valor solo puede aparecer una vez.',
  // Tarea 1.32 (F4). Un `case` numérico con un `switch` de `char` es el único caso en que «otro tipo» sí puede servir (un número que
  // quepa): se explica con el rango de `char` en vez de repetir «debe ser del mismo tipo».
  'etiqueta-de-case-de-otro-tipo': ({ etiqueta, selector }) =>
    etiqueta === 'int' && selector === 'char'
      ? 'Este `case` es un número (`int`) que no cabe en un `char`: el `switch` compara caracteres, y un `case` con un número solo sirve si cabe en un `char` (de 0 a 65535).'
      : `Este \`case\` es de tipo \`${etiqueta}\`, pero el \`switch\` compara valores de tipo \`${selector}\`: cada \`case\` debe ser del mismo tipo que el valor del \`switch\`.`,
  'etiqueta-default-duplicada': () => 'Ya hay un `default` más arriba en este `switch`: solo puede haber uno.',
  'break-fuera-de-contexto': () => '"break" solo tiene sentido dentro de un ciclo o un "switch".',
  'continue-fuera-de-contexto': () => '"continue" solo tiene sentido dentro de un ciclo.',
  'else-sin-if': () => 'Este "else" no tiene un "if" al cual pertenecer; revisa las llaves "{ }".',
  'cadena-sin-cerrar': () => 'Te faltó cerrar las comillas " de este texto.',
  'fin-de-archivo-inesperado': () => 'El archivo terminó y todavía falta cerrar una o más llaves "}".',
  'llave-de-cierre-sobrante': () =>
    'Sobra una llave de cierre "}": hay una de más después de que la clase ya había cerrado.',
  'llave-de-metodo-faltante': () => 'Falta abrir una llave "{" después de esto — probablemente la del método.',
  'llave-de-clase-faltante': () => 'Falta abrir una llave "{" después de esto — probablemente la del cuerpo de la clase.',
  'paquete-despues-de-import': () => 'La línea "package" debe ir antes que cualquier "import".',
  'tipo-requiere-import': ({ nombre }) => `Falta la línea "import java.util.${nombre};" al principio del archivo.`,
  'modificador-repetido': () => 'Escribiste el mismo modificador (como "public" o "static") dos veces seguidas; cada uno solo se pone una vez.',
  'sentencia-inalcanzable': () => 'Esta línea nunca se ejecuta.',
  'variable-posiblemente-no-asignada': ({ nombre }) =>
    `La variable "${nombre}" podría no tener un valor asignado en este punto. Asegúrate de que SIEMPRE reciba uno antes de usarla.`,
  'variable-final-reasignada': ({ nombre }) => `"${nombre}" es "final": su valor se fija una sola vez y no se puede cambiar.`,
  // Tarea 1.32 (F5). Ejemplo de tono aprobado en el encargo: «`System.out.print(...)` no devuelve ningún valor, así que no puedes
  // usarlo como si fuera un número o un texto.» El nombre es la llamada tal como la escribió el alumno.
  'llamada-sin-valor': ({ llamada }) =>
    `\`${llamada}(...)\` no devuelve ningún valor, así que no puedes usarlo como si fuera un número o un texto.`,
  // Tarea 1.32 (F2). Con la variable (`n.length()`) se la nombra; sin ella (un literal, una operación) se señala el `.miembro` que sobra.
  // Tarea 1.32 (F1). Ejemplo de tono aprobado en el encargo: «No puedes convertir un texto (`String`) en `int` con un cast. Para leer un
  // número escrito como texto usa `Integer.parseInt(...)`.»
  'cast-invalido': ({ origen, destino }) => textoDeUnCastInvalido(origen, destino),
  // Tarea 1.32 (F6): `String.trim()` — el método existe, pero se llama sobre una VARIABLE del tipo, no sobre el nombre de la clase.
  'metodo-de-instancia-sin-objeto': ({ clase, nombre }) =>
    `\`${clase}.${nombre}(...)\` no funciona: \`${nombre}()\` se llama sobre una variable de tipo \`${clase}\` (por ejemplo, \`variable.${nombre}(...)\`), no sobre el nombre de la clase.`,
  // Tarea 1.33 (N2): la palabra tal como la escribió el alumno; dice qué es y qué hacer, sin «token» ni «identificador».
  'palabra-reservada-como-nombre': ({ palabra }) =>
    `\`${palabra}\` es una palabra reservada de Java: tiene un significado propio y no se puede usar como nombre de una variable. Elige otro nombre.`,
  // Tarea 1.33 (N3): el número tal como se escribió y la regla (JLS 3.10.1): el guion bajo solo va entre dos dígitos.
  'guion-bajo-mal-puesto': ({ numero }) =>
    `El número \`${numero}\` tiene un guion bajo (\`_\`) mal puesto: en un número solo puede ir entre dos dígitos, como en \`1_000\`.`,
  // Tarea 1.33 (WARNING-2): `return 0;` en `main` (javac: «incompatible types: unexpected return value»). Antes: «Te falta un punto y coma».
  'retorno-con-valor': () => '`main` no devuelve ningún valor (es `void`), así que `return` va solo, sin nada detrás: escribe `return;`.',
  // Tarea 1.34 (A): una instrucción antes del primer `case` (javac: «case, default, or '}' expected»). Dice dónde va y qué otra salida hay.
  'sentencia-antes-del-primer-case': () =>
    'Dentro de un `switch`, lo primero que va después de la llave `{` es un `case` o un `default`: esta instrucción quedó antes del primer `case`. ' +
    'Muévela debajo de un `case` (o escríbela antes del `switch`).',
  // Tarea 1.34 (D): una expresión entre paréntesis como instrucción (javac: «not a statement»). El genérico preguntaba «¿te faltó "="…?» cuando lo que sobra son los paréntesis.
  // La segunda frase es para el caso MÁS probable en el programa de un alumno (`(numero < 0) {`): se le olvidó el `if`/`while`/`switch` de la condición.
  'sentencia-entre-parentesis': () =>
    'Una instrucción completa (una asignación, un `++` o una llamada) se escribe sola, sin paréntesis: Java no acepta `(x = 2);`, solo `x = 2;`. ' +
    'Si lo que querías era una condición, te falta la palabra `if`, `while` o `switch` antes del paréntesis.',
  // Tarea 1.34 (C): `import java.util.Scanner;` junto a `public class Scanner` (javac: «Scanner is already defined in this compilation unit»). Se señala el `import`.
  'clase-repetida-con-import': ({ nombre, importacion }) =>
    `Tu clase se llama \`${nombre}\`, igual que \`${importacion}\`, que importas en esta línea: Java no permite dos cosas con el mismo nombre. ` +
    'Cambia el nombre de tu clase o quita el `import`.',
  'miembro-de-primitivo': ({ tipo, nombre, receptor }) =>
    receptor === undefined
      ? `Un valor de tipo \`${tipo}\` es primitivo: no tiene métodos ni campos, así que no puedes escribir \`.${nombre}\` después de él. Solo los objetos, como un \`String\`, los tienen.`
      : `\`${receptor}\` es de tipo \`${tipo}\`, un tipo primitivo: no tiene métodos ni campos, así que no puedes escribir \`${receptor}.${nombre}\`. Solo los objetos, como un \`String\`, los tienen.`,
};
