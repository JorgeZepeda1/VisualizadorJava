// Reconocedores del resto del catálogo REQ-SUB-007 (tarea 1.6, ADR 003, design.md §2.6 fila
// "Sintaxis"): construcciones que Java sí acepta pero que quedan fuera de la superficie soportada y
// que SOLO se detectan por su FORMA sintáctica (no por símbolos — eso es atribución, tarea 1.7+, y
// queda fuera de este módulo a propósito: `nextLong`, `Math.sin`, un segundo `Scanner`… no viven
// aquí). Cada reconocedor delimita la construcción completa con una subgramática permisiva
// (contando llaves/paréntesis balanceados cuando hace falta) y devuelve un `NodoNoSoportado`, sin
// interpretar su contenido — así el análisis sigue después en la posición correcta (C8: nunca un
// error de sintaxis engañoso).
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';
import type { Rango } from '../fuente/rango.ts';
import type { Token } from '../lexico/tokens.ts';
import { PALABRAS_CLAVE_TIPO_PRIMITIVO } from '../lexico/tokens.ts';
import { CursorDeTokens } from './cursor-de-tokens.ts';
import type {
  NodoElementoBloque,
  NodoElementoSwitch,
  NodoExpresion,
  NodoNoSoportado,
  NodoPrograma,
} from './ast.ts';
// Tarea 1.24: la tabla YA NO se define aquí — vive en `motor/no-soportado.ts` (única fuente de
// verdad, importada tanto por `lexico/` como por `sintaxis/` sin dependencia hacia atrás). Se
// importa normalmente (para que este mismo módulo pueda seguir usándola, ver el recolector más
// abajo) y se RE-EXPORTA con el mismo nombre para que ningún import existente de
// `CODIGOS_NO_SOPORTADO` (`analizador-sintactico.ts`, `semantica/atribucion.ts`) tenga que cambiar.
// Tarea 1.25: idem `DatosPorCodigoNoSoportado` (tipa el nuevo parámetro `datos` de
// `consumirRestoDeSentenciaNoSoportada`, ver abajo).
import { CODIGOS_NO_SOPORTADO, type CodigoNoSoportado, type DatosPorCodigoNoSoportado } from '../no-soportado.ts';
export { CODIGOS_NO_SOPORTADO, type CodigoNoSoportado };

// Tabla construcción→código de los tipos primitivos NO soportados (design.md §2.6): float/byte/short
// son tipos primitivos REALES de Java que NUNCA se reinterpretan como double/int (REQ-SUB-007) — se
// reconocen por texto exacto en posición de tipo de DeclLocal (no viven en
// `PALABRAS_CLAVE_TIPO_PRIMITIVO` de tokens.ts a propósito: esa tabla sigue representando solo los
// tipos REALMENTE soportados, que también participan de casts válidos).
export const PALABRAS_TIPO_PRIMITIVO_NO_SOPORTADO: ReadonlySet<string> = new Set(['float', 'byte', 'short']);

/**
 * Avanza el cursor hasta (e incluyendo) el token `cierre` que cierra el `apertura` que el llamador
 * YA CONSUMIÓ (profundidad inicial 1). Usado para delimitar bloques `{ }` o paréntesis `( )`
 * balanceados sin tener que entender la gramática interna de lo que no se soporta.
 */
export function saltarHastaCerrar(cursor: CursorDeTokens, apertura: string, cierre: string): Token {
  let profundidad = 1;
  let token: Token;
  do {
    token = cursor.avanzar();
    if (token.tipo === 'eof') {
      throw new ErrorDeCompilacion(`falta "${cierre}" para cerrar`, token.rango);
    }
    if (token.texto === apertura) profundidad += 1;
    else if (token.texto === cierre) profundidad -= 1;
  } while (profundidad > 0);
  return token;
}

/**
 * Consume desde el token ACTUAL hasta el próximo ";" de nivel 0 (respeta anidamiento de
 * "()"/"[]"/"{}"), y devuelve un `NodoNoSoportado` con ese tramo completo. La navaja suiza para
 * construcciones que terminan en ";" y cuyo interior no hace falta interpretar (var, arreglos,
 * genéricos, throw, import static…).
 */
// Tarea 1.25: genérica sobre `C` (en vez de recibir `codigo: CodigoNoSoportado` a secas) para que el
// LLAMADOR quede obligado a pasar los datos exactos que ese código necesita — un llamador que use
// `CODIGOS_NO_SOPORTADO.arreglo` sin también pasar `{ tipoArreglo }` deja de compilar. El `as
// NodoNoSoportado` del `return` es la única forma de construir el valor: TypeScript no distribuye un
// tipo discriminado sobre un parámetro de tipo genérico (`C` sigue siendo "cualquier miembro de la
// unión" dentro del cuerpo de la función) — la seguridad real vive en la FIRMA (`datos:
// DatosPorCodigoNoSoportado[C]`), que sí liga cada `codigo` concreto a su `datos` en cada llamada.
export function consumirRestoDeSentenciaNoSoportada<C extends CodigoNoSoportado>(
  cursor: CursorDeTokens,
  inicio: number,
  codigo: C,
  datos: DatosPorCodigoNoSoportado[C],
): NodoNoSoportado {
  let profundidad = 0;
  for (;;) {
    const token = cursor.actual();
    if (token.tipo === 'eof') {
      throw new ErrorDeCompilacion('falta ";" para terminar la sentencia', token.rango);
    }
    if (token.texto === '(' || token.texto === '[' || token.texto === '{') {
      profundidad += 1;
      cursor.avanzar();
      continue;
    }
    if (token.texto === ')' || token.texto === ']' || token.texto === '}') {
      profundidad -= 1;
      cursor.avanzar();
      continue;
    }
    if (profundidad === 0 && token.texto === ';') {
      const fin = cursor.avanzar().rango.fin;
      return { tipo: 'no-soportado', codigo, datos, rango: { inicio, fin } } as NodoNoSoportado;
    }
    cursor.avanzar();
  }
}

/**
 * ¿"< ... >" balanceado a partir de `cursor.mirar(desplazamientoDeApertura)` (el primer "<"),
 * seguido de un identificador (con o sin "[]" antes)? Lista de tipos genéricos, p. ej. "ArrayList<Integer> lista" o
 * "Map<String, List<Integer>> mapa". Nunca confunde una comparación real ("total < limite"): si los
 * "<" no cierran en un identificador que sigue, no es una declaración genérica.
 *
 * Tarea 1.29: reconoce también lo que Java admite dentro de los argumentos de tipo — comodines (`Class<?>`,
 * `List<? extends Number>`, `Map<String, ? super Integer>`) y arreglos (`List<int[]>`) — y los corchetes tras el cierre
 * (`List<String>[] listas`); antes solo pasaban identificadores, comas y puntos y esas declaraciones daban un error de
 * sintaxis FALSO (el recorrido es `indiceTrasArgumentosDeTipo`, el mismo de las cabeceras de miembro).
 */
export function pareceGenericoDesde(cursor: CursorDeTokens, desplazamientoDeApertura: number): boolean {
  const trasLosArgumentos = indiceTrasArgumentosDeTipo(cursor, desplazamientoDeApertura);
  if (trasLosArgumentos === null) return false;
  let i = trasLosArgumentos;
  while (cursor.mirar(i).texto === '[' && cursor.mirar(i + 1).texto === ']') i += 2;
  return cursor.mirar(i).tipo === 'identificador';
}

// ---- Nivel de programa: otra clase/interfaz/enum/record tras la primera (design.md §2.3) ----

const MODIFICADORES_TIPO_NIVEL_SUPERIOR: ReadonlySet<string> = new Set(['public', 'final', 'abstract', 'strictfp']);
const PALABRAS_TIPO_NIVEL_SUPERIOR: ReadonlySet<string> = new Set(['class', 'interface', 'enum', 'record']);

// ---- Anotaciones (tarea 1.29, design.md §2.3: «campo, método, clase interna, bloque, anotación → NO-DISP») ----

/** ¿El cursor está en el inicio de UNA anotación de uso (`@Nombre`, `@p.Nombre`, con o sin argumentos)?
 * `@interface` NO lo es: declara un tipo de anotación (`pareceOtroTipoDeNivelSuperior` lo reconoce). */
function abreUnaAnotacion(cursor: CursorDeTokens, desplazamiento: number): boolean {
  return cursor.mirar(desplazamiento).texto === '@' && cursor.mirar(desplazamiento + 1).tipo === 'identificador' && cursor.mirar(desplazamiento + 1).texto !== 'interface';
}

/**
 * Consume las anotaciones seguidas que empiezan en el cursor (`@A @B(1) @p.C`) y las devuelve como UN
 * solo aviso que las cubre a todas; `null` si el cursor no está en una. Solo delimita las anotaciones
 * (nombre calificado y argumentos entre paréntesis, con anidamiento): lo que sigue —la clase, el
 * miembro, la declaración— lo analiza quien llama, como siempre (ADR 003: delimitar y dejar seguir).
 * No se valida el nombre ni los argumentos: una anotación inexistente javac la rechaza, pero decidirlo
 * pide el catálogo del JDK, y aquí (sintaxis) un aviso es la respuesta segura.
 */
export function consumirAnotaciones(cursor: CursorDeTokens): NodoNoSoportado | null {
  if (!abreUnaAnotacion(cursor, 0)) return null;
  const inicio = cursor.actual().rango.inicio;
  let fin = inicio;
  while (abreUnaAnotacion(cursor, 0)) {
    cursor.avanzar(); // "@"
    let ultimo = cursor.esperarTipo('identificador');
    while (cursor.coincideTexto('.') && cursor.mirar(1).tipo === 'identificador') {
      cursor.avanzar();
      ultimo = cursor.esperarTipo('identificador');
    }
    fin = ultimo.rango.fin;
    if (cursor.coincideTexto('(')) {
      cursor.avanzar();
      fin = saltarHastaCerrar(cursor, '(', ')').rango.fin;
    }
  }
  return { tipo: 'no-soportado', codigo: CODIGOS_NO_SOPORTADO.anotacion, datos: {}, rango: { inicio, fin } };
}

/** Desplazamiento (sin consumir nada) del primer token que sigue a las anotaciones que empiezan en `i`. */
function saltarAnotacionesMirando(cursor: CursorDeTokens, desde: number): number {
  let i = desde;
  while (abreUnaAnotacion(cursor, i)) {
    i += 2;
    while (cursor.mirar(i).texto === '.' && cursor.mirar(i + 1).tipo === 'identificador') i += 2;
    if (cursor.mirar(i).texto === '(') {
      let profundidad = 0;
      do {
        const texto = cursor.mirar(i).texto;
        if (cursor.mirar(i).tipo === 'eof') return i;
        if (texto === '(') profundidad += 1;
        else if (texto === ')') profundidad -= 1;
        i += 1;
      } while (profundidad > 0);
    }
  }
  return i;
}

/** La palabra que abre el tipo de nivel superior que empieza en el cursor (`class`, `interface`, `enum`, `record`, o
 * `@interface`) y el desplazamiento de ese token; `null` si el cursor no está en el inicio de un tipo. */
function palabraDeTipoDeNivelSuperior(cursor: CursorDeTokens): { readonly palabra: string; readonly desplazamiento: number } | null {
  let i = saltarAnotacionesMirando(cursor, 0);
  // `@interface Nota { }`: declara un tipo de anotación (tarea 1.29).
  if (cursor.mirar(i).texto === '@' && cursor.mirar(i + 1).texto === 'interface') return { palabra: '@interface', desplazamiento: i };
  while (MODIFICADORES_TIPO_NIVEL_SUPERIOR.has(cursor.mirar(i).texto)) i += 1;
  const palabra = cursor.mirar(i).texto;
  return PALABRAS_TIPO_NIVEL_SUPERIOR.has(palabra) ? { palabra, desplazamiento: i } : null;
}

export function pareceOtroTipoDeNivelSuperior(cursor: CursorDeTokens): boolean {
  return palabraDeTipoDeNivelSuperior(cursor) !== null;
}

/** Tarea 1.29: ¿el cursor está en una interfaz, un enum, un record o un tipo de anotación? (una `class` NO: esa la
 * analiza `analizarClase`). Es lo que puede ir ANTES de la clase principal. */
export function pareceTipoDeNivelSuperiorQueNoEsClase(cursor: CursorDeTokens): boolean {
  const tipo = palabraDeTipoDeNivelSuperior(cursor);
  return tipo !== null && tipo.palabra !== 'class';
}

/** Tarea 1.29: el nombre del tipo de nivel superior que empieza en el cursor (`Dia` en `public enum Dia { … }`), o
 * una cadena vacía si no se puede leer; solo mira, no consume. */
export function nombreDelTipoDeNivelSuperior(cursor: CursorDeTokens): string {
  const tipo = palabraDeTipoDeNivelSuperior(cursor);
  if (tipo === null) return '';
  const nombre = cursor.mirar(tipo.desplazamiento + (tipo.palabra === '@interface' ? 2 : 1));
  return nombre.tipo === 'identificador' ? nombre.texto : '';
}

/** Tarea 1.29: ¿el cursor está en una clase, interfaz, enum o record declarados DENTRO de un método (`class Local { }`,
 * `final class L { }`, `record P(int x) { }`)? `record` es una palabra contextual: solo cuenta con la forma `record Nombre(` o
 * `record Nombre<`, para no confundirla con una variable que se llame así (`record = 2;`). Un tipo de anotación nunca es local. */
export function pareceTipoDeclaradoEnUnMetodo(cursor: CursorDeTokens): boolean {
  const tipo = palabraDeTipoDeNivelSuperior(cursor);
  if (tipo === null || tipo.palabra === '@interface') return false;
  if (tipo.palabra === 'record') {
    const despuesDelNombre = cursor.mirar(tipo.desplazamiento + 2).texto;
    return cursor.mirar(tipo.desplazamiento + 1).tipo === 'identificador' && (despuesDelNombre === '(' || despuesDelNombre === '<');
  }
  return true;
}

/** Consume el tipo entero (cabecera y cuerpo entre llaves) que empieza en el cursor y lo devuelve como aviso: por omisión el de
 * «otro tipo de nivel superior»; el de un tipo local (tarea 1.29) pasa `clase-local-no-soportada`. */
export function consumirTipoDeNivelSuperior(
  cursor: CursorDeTokens,
  codigo: typeof CODIGOS_NO_SOPORTADO.otroTipoDeNivelSuperior | typeof CODIGOS_NO_SOPORTADO.claseLocal = CODIGOS_NO_SOPORTADO.otroTipoDeNivelSuperior,
): NodoNoSoportado {
  const inicio = cursor.actual().rango.inicio;
  consumirAnotaciones(cursor); // los argumentos de una anotación pueden traer "{ }": se delimitan aparte
  while (!cursor.coincideTexto('{')) {
    if (cursor.actual().tipo === 'eof') {
      throw new ErrorDeCompilacion('se esperaba "{" para el cuerpo del tipo', cursor.actual().rango);
    }
    cursor.avanzar();
  }
  cursor.avanzar();
  const cierre = saltarHastaCerrar(cursor, '{', '}');
  return { tipo: 'no-soportado', codigo, datos: {}, rango: { inicio, fin: cierre.rango.fin } };
}

// ---- Miembros de clase que no son `main` (campos, métodos propios, clases internas, anotaciones,
// inicializadores — design.md §2.3: "Clase = ... '{' { Main | ';' } '}'"; campo/método/clase interna/
// bloque/anotación → NO-DISP) ----

// Sub-lote 1-D3 (mutante real contra veredicto de javac, tarea 1.16): modificadores reales de
// miembro de clase (JLS 8.3/8.4.3) -- ninguno se valida más allá de "es uno de estos" (REQ-SUB-007
// acepta cualquier miembro propio sin verificar su forma exacta), solo sirven para saltarlos antes
// de buscar el tipo+nombre reales.
const MODIFICADORES_MIEMBRO: ReadonlySet<string> = new Set([
  'public', 'private', 'protected', 'static', 'final', 'abstract',
  'synchronized', 'transient', 'volatile', 'native', 'strictfp',
]);

function esFinalDeMiembro(token: Token): boolean {
  return token.tipo === 'eof' || token.texto === ';' || token.texto === '{' || token.texto === '(' || token.texto === '}';
}

// ---- Tipos en una cabecera (tarea 1.29, REQ-SUB-007: «métodos propios, clases/campos/objetos propios,
// arreglos» → aviso, nunca un error): calificados (`java.util.List`), genéricos (`Map<String, List<Integer>>`) y
// de arreglo (`int[][]`). Ninguno se VALIDA como tipo (el subconjunto acepta cualquiera como aviso, REQ-SUB-007):
// solo se recorren para saber dónde termina el tipo y dónde empieza el NOMBRE del miembro o del parámetro. ----

/** ¿`token` puede ir DENTRO de los argumentos o parámetros de tipo de un genérico (`<T extends A & B, ? super C>`)?
 * `extends` no es palabra clave de este léxico (es un identificador); `super` sí. */
function esTokenDeArgumentoDeTipo(token: Token): boolean {
  if (token.tipo === 'identificador') return true;
  if (PALABRAS_CLAVE_TIPO_PRIMITIVO.has(token.texto) || PALABRAS_TIPO_PRIMITIVO_NO_SOPORTADO.has(token.texto)) return true; // List<int[]>
  return token.texto === 'super' || token.texto === '.' || token.texto === ',' || token.texto === '?' || token.texto === '&' || token.texto === '[' || token.texto === ']';
}

/**
 * Desplazamiento del primer token DESPUÉS de los argumentos o parámetros de tipo que abre el «<» de
 * `cursor.mirar(desplazamientoDeApertura)` (`<String, List<Integer>>`, `<T extends Comparable<T>>`,
 * `<? super Integer>`), o `null` si lo que sigue no tiene la forma de una lista de tipos que CIERRA
 * (una comparación `a < b`, un «<» sin pareja). El lexer junta los cierres consecutivos en un solo token
 * (`>>`, `>>>`): cada uno cuenta por los «>» que trae. Solo mira, nunca consume.
 */
function indiceTrasArgumentosDeTipo(cursor: CursorDeTokens, desplazamientoDeApertura: number): number | null {
  let i = desplazamientoDeApertura;
  let profundidad = 0;
  for (;;) {
    const token = cursor.mirar(i);
    if (token.tipo === 'eof') return null;
    if (token.texto === '<') profundidad += 1;
    else if (token.texto === '>') profundidad -= 1;
    else if (token.texto === '>>') profundidad -= 2;
    else if (token.texto === '>>>') profundidad -= 3;
    else if (!esTokenDeArgumentoDeTipo(token)) return null;
    i += 1;
    if (profundidad === 0) return i;
    if (profundidad < 0) return null;
  }
}

/**
 * Desplazamiento del primer token DESPUÉS del tipo cuyo primer token está en `cursor.mirar(desplazamiento)`:
 * el resto del nombre calificado (`.Entry`), los argumentos de tipo (`<K, V>`, si CIERRAN) y las dimensiones de
 * arreglo (`[]`, tantas como haya; `conArreglos: false` para un tipo que no las admite, como el padre de un
 * `extends`). Si algo no encaja (un «<» sin cerrar, un «[» sin su «]»), se detiene ahí: quien llama ve el token
 * que rompe la forma y lo rechaza con su propio error, igual que antes de esta tarea.
 */
function indiceTrasTipo(cursor: CursorDeTokens, desplazamiento: number, conArreglos = true): number {
  let i = desplazamiento + 1;
  for (;;) {
    if (cursor.mirar(i).texto === '.' && cursor.mirar(i + 1).tipo === 'identificador') {
      i += 2;
      continue;
    }
    if (cursor.mirar(i).texto === '<') {
      const trasLosArgumentos = indiceTrasArgumentosDeTipo(cursor, i);
      if (trasLosArgumentos !== null) {
        i = trasLosArgumentos;
        continue;
      }
    }
    break;
  }
  while (conArreglos && cursor.mirar(i).texto === '[' && cursor.mirar(i + 1).texto === ']') i += 2;
  return i;
}

// Lo que puede seguir al nombre de una clase, interfaz, enum o record ANIDADOS (`static class B<T> extends A {`,
// `record P(int x) implements I {`): se acepta cualquiera de ellos sin validar la cabecera completa del tipo
// anidado —es un aviso más, REQ-SUB-007—; lo demás cae al chequeo de siempre y sigue siendo un error.
const CONTINUACIONES_DE_TIPO_ANIDADO: ReadonlySet<string> = new Set(['{', '<', '(', 'extends', 'implements', 'permits']);

/** Cómo termina un miembro: un CAMPO en el «;» de nivel superior (su inicializador puede traer llaves: `{ 1, 2 }`, una
 * clase anónima, una lambda); todo lo demás —método, constructor, bloque, tipo anidado— en su «;» o en su «{ … }». */
type FormaDeMiembro = 'campo' | 'otro';

/**
 * Verifica que lo que sigue a los modificadores tenga al menos la forma MÍNIMA de un miembro real
 * de Java (JLS 8: "{modificadores} Tipo Identificador" antes de "(", ";", "{" o "=") -- NUNCA
 * valida el TIPO en sí (REQ-SUB-007 acepta cualquier tipo, inventado o no, como NO-DISP), solo que
 * haya UNO, que el NOMBRE sea un identificador real (nunca una palabra reservada como "void"), y
 * que lo que sigue al nombre sea una continuación real. Sin esta verificación, el resto de
 * `consumirMiembroDeClase` (un escáner ciego hasta el siguiente ";"/"{" de nivel superior) se
 * comprometía con CUALQUIER texto, incluida una firma de "main" mal escrita que javac rechaza de
 * verdad -- verificado contra javac 17 real vía mutantes reales de esta sesión (ver el informe):
 * "public static main void(...)" -> "<identifier> expected"; "public static void main main(...)"
 * -> "'(' expected"; "public static void (...)" -> "<identifier> expected"; "public static;
 * void main(...)" -> "illegal start of type". Solo lanza -- nunca avanza el cursor (D2: el
 * llamador decide qué hacer con el error real; nunca se "corrige" en silencio).
 *
 * Tarea 1.29 (causa 11): la cabecera de arriba rechazaba como error formas VÁLIDAS de Java, todas miembros
 * propios que REQ-SUB-007 manda avisar: el constructor (`Persona(String nombre) { … }`: sin tipo de retorno, con el
 * nombre de la clase), los tipos calificados/genéricos/de arreglo (`static int[] crear(int n)`, `List<String>
 * nombres`, `java.util.Map<K, V> m`), los parámetros de tipo de un método o constructor genérico (`static <T> T
 * mayor(T a, T b)`), varios campos en una declaración (`int a, b;`), los corchetes tras el nombre (`int a[];`) y el
 * tipo anidado con cabecera larga (`static class B<T> extends A { … }`). Lo que ya era un error sigue siéndolo:
 * un método sin tipo de retorno cuyo nombre NO es el de la clase, un nombre que no es identificador, una coma
 * sin nombre de campo detrás, un «<» o un «[» sin cerrar.
 */
function validarCabeceraDeMiembro(cursor: CursorDeTokens, nombreDeLaClase: string): FormaDeMiembro {
  let i = 0;
  while (MODIFICADORES_MIEMBRO.has(cursor.mirar(i).texto)) i += 1;

  // EOF en CUALQUIER posición de la cabecera: nunca es asunto de esta función -- err16
  // (`fin-de-archivo-inesperado`, con su propio código y posición ancladas en
  // `cursor.finDelTokenAnterior()`) sigue siendo el ÚNICO responsable; el bucle original de
  // `consumirMiembroDeClase` (abajo) lo detecta en su primera vuelta tal cual ya hacía.
  let tipo = cursor.mirar(i);
  if (tipo.tipo === 'eof') return 'otro';
  // "{" aquí (sin tipo/nombre antes) es un bloque inicializador (JLS 8.6/8.7) -- una forma REAL de
  // miembro que este subconjunto ya trataba como NO-DISP ("bloque", cabecera del módulo) antes de
  // esta corrección; nunca se rechaza como "falta el tipo" -- se difiere al bucle original de
  // `consumirMiembroDeClase`, que YA sabe delimitarlo bien con `saltarHastaCerrar`.
  if (tipo.texto === '{') return 'otro';
  // Tarea 1.29: los parámetros de tipo de un método o constructor genérico (`<T> void f(T t)`) se saltan y la
  // cabecera sigue desde el tipo de retorno (o el nombre del constructor). Si no cierran, todo sigue como antes.
  if (tipo.texto === '<') {
    const trasLosParametros = indiceTrasArgumentosDeTipo(cursor, i);
    if (trasLosParametros !== null) {
      i = trasLosParametros;
      tipo = cursor.mirar(i);
      if (tipo.tipo === 'eof') return 'otro';
    }
  }
  if (esFinalDeMiembro(tipo)) {
    throw new ErrorDeCompilacion('se esperaba el tipo de un campo o método aquí', tipo.rango);
  }
  // Tarea 1.29: una clase, interfaz, enum o record anidados.
  if (PALABRAS_TIPO_NIVEL_SUPERIOR.has(tipo.texto) && cursor.mirar(i + 1).tipo === 'identificador') {
    const trasElNombre = cursor.mirar(i + 2);
    if (trasElNombre.tipo === 'eof' || CONTINUACIONES_DE_TIPO_ANIDADO.has(trasElNombre.texto)) return 'otro';
  }
  // Tarea 1.29: el constructor (JLS 8.8: el nombre de la clase, sin tipo de retorno). Con OTRO nombre es un
  // método al que le falta el tipo de retorno y sigue siendo el error de siempre (javac: invalid method
  // declaration; return type required).
  if (tipo.tipo === 'identificador' && tipo.texto === nombreDeLaClase && cursor.mirar(i + 1).texto === '(') {
    validarListaDeParametros(cursor, i + 2);
    return 'otro';
  }

  const desplazamientoDelNombre = indiceTrasTipo(cursor, i);
  const nombre = cursor.mirar(desplazamientoDelNombre);
  if (nombre.tipo === 'eof') return 'otro';
  if (nombre.tipo !== 'identificador') {
    throw new ErrorDeCompilacion(`se esperaba un identificador y se encontró "${nombre.texto}"`, nombre.rango);
  }

  // Tarea 1.29: `int a[]` — los corchetes también pueden ir tras el nombre (solo de un campo: un método o un
  // bloque no admiten dimensiones ahí).
  let desplazamientoTrasElNombre = desplazamientoDelNombre + 1;
  while (cursor.mirar(desplazamientoTrasElNombre).texto === '[' && cursor.mirar(desplazamientoTrasElNombre + 1).texto === ']') {
    desplazamientoTrasElNombre += 2;
  }
  const hayDimensionesTrasElNombre = desplazamientoTrasElNombre > desplazamientoDelNombre + 1;
  const siguiente = cursor.mirar(desplazamientoTrasElNombre);
  if (siguiente.tipo === 'eof') return 'otro';
  const esCampo = siguiente.texto === ';' || siguiente.texto === '=' || siguiente.texto === ',';
  const esContinuacionValida = esCampo || (!hayDimensionesTrasElNombre && (siguiente.texto === '(' || siguiente.texto === '{'));
  if (!esContinuacionValida) {
    throw new ErrorDeCompilacion(`se esperaba "(", ";" o "=" y se encontró "${siguiente.texto}"`, siguiente.rango);
  }
  // Tarea 1.21 (sub-lote 1-D4, mutante real contra veredicto de javac, la clase de discrepancia
  // MÁS GRANDE de la tarea 1.16, ~35 mutantes): la cabecera arriba solo comprueba "Tipo
  // Identificador (" -- nunca lo que sigue DENTRO de esos paréntesis. Sin este chequeo,
  // "void main([String[] args)" (cabecera perfecta, parámetro roto) se tragaba entero como NO-DISP
  // por el bucle de `consumirMiembroDeClase` (cuenta "("/")" a ciegas) -- javac lo rechaza de
  // verdad ("illegal start of type"). Solo aplica cuando la continuación es "(" -- un campo (";"/
  // "=") o un bloque inicializador ("{") no tienen lista de parámetros que validar.
  if (siguiente.texto === '(') validarListaDeParametros(cursor, desplazamientoTrasElNombre + 1);
  if (esCampo) validarDeclaradoresDeCampo(cursor, desplazamientoTrasElNombre);
  return esCampo ? 'campo' : 'otro';
}

/**
 * Tarea 1.29: tras el primer declarador de un campo, cada «,» de NIVEL SUPERIOR (no dentro de paréntesis,
 * corchetes ni llaves: `int a = f(1, 2), b = { 3, 4 };`) debe traer detrás el nombre del siguiente campo (JLS
 * 8.3: `VariableDeclaratorList`). Sin nombre —`int a, ;`, `int a, (int n) { }`— es el mismo «<identifier>
 * expected» de javac, no un campo más. Solo mira; el campo entero lo consume `consumirCampo`.
 */
function validarDeclaradoresDeCampo(cursor: CursorDeTokens, desplazamientoInicial: number): void {
  let profundidad = 0;
  for (let i = desplazamientoInicial; ; i += 1) {
    const token = cursor.mirar(i);
    if (token.tipo === 'eof') return;
    if (token.texto === '(' || token.texto === '[' || token.texto === '{') profundidad += 1;
    else if (token.texto === ')' || token.texto === ']' || token.texto === '}') {
      profundidad -= 1;
      if (profundidad < 0) return; // la "}" que cierra la clase: de un campo sin ";" se ocupa `consumirCampo`
    } else if (profundidad === 0 && token.texto === ';') return;
    else if (profundidad === 0 && token.texto === ',') {
      const siguiente = cursor.mirar(i + 1);
      if (siguiente.tipo !== 'eof' && siguiente.tipo !== 'identificador') {
        throw new ErrorDeCompilacion(`se esperaba un identificador y se encontró "${siguiente.texto}"`, siguiente.rango);
      }
    }
  }
}

/** ¿"Tipo Identificador" plausible? (JLS 8.4.1, sin validar el TIPO en sí -- REQ-SUB-007 acepta
 * cualquiera, real o inventado, como NO-DISP): un identificador (incluye nombres calificados,
 * "java.util.List"), o una palabra de tipo primitivo (soportada o no -- "float"/"byte"/"short"
 * también abren un tipo real de Java, aunque este subconjunto no los soporte, REQ-SUB-007). */
function pareceInicioDeTipo(token: Token): boolean {
  return token.tipo === 'identificador' || PALABRAS_CLAVE_TIPO_PRIMITIVO.has(token.texto) || PALABRAS_TIPO_PRIMITIVO_NO_SOPORTADO.has(token.texto);
}

/**
 * Verifica que la lista de parámetros que empieza en `cursor.mirar(indiceInicial)` (el primer
 * token DESPUÉS del "(" que ya validó `validarCabeceraDeMiembro`) tenga la forma real de JLS
 * 8.4.1: vacía, o `Parametro (',' Parametro)*` con `Parametro = ['final'] Tipo('.' Identificador)*
 * ['<' … '>'] ('[' ']')* (Identificador | '...' Identificador) ('[' ']')*` -- suficiente para distinguir
 * sintaxis REAL (arreglos, varargs, nombres calificados, genéricos, "final") de basura como "[String[] args"
 * sin necesitar entender el TIPO en sí (REQ-SUB-007 acepta cualquiera). Devuelve el ÍNDICE del
 * primer token que rompe la forma (para anclar el error ahí, no siempre al principio -- p. ej.
 * "foo(int n, [int m)" debe señalar el "[" del SEGUNDO parámetro, no el "int" del primero), o
 * `null` si la lista completa es válida. Solo mira (`mirar`), nunca avanza el cursor real --
 * `consumirMiembroDeClase` sigue siendo quien de verdad consume el miembro completo.
 */
function indiceDeErrorEnListaDeParametros(cursor: CursorDeTokens, indiceInicial: number): number | null {
  let i = indiceInicial;
  if (cursor.mirar(i).texto === ')') return null; // "()", lista vacía
  for (;;) {
    if (cursor.mirar(i).texto === 'final') i += 1;
    if (!pareceInicioDeTipo(cursor.mirar(i))) return i;
    i = indiceTrasTipo(cursor, i); // Tipo.Calificado<Genérico>[] (antes del nombre)
    if (cursor.mirar(i).texto === '.' && cursor.mirar(i + 1).texto === '.' && cursor.mirar(i + 2).texto === '.') {
      i += 3; // varargs: Tipo... nombre
    }
    if (cursor.mirar(i).tipo !== 'identificador') return i; // falta el nombre del parámetro
    i += 1;
    while (cursor.mirar(i).texto === '[' && cursor.mirar(i + 1).texto === ']') i += 2; // Tipo nombre[] (tras el nombre)
    if (cursor.mirar(i).texto === ',') {
      i += 1;
      continue;
    }
    if (cursor.mirar(i).texto === ')') return null;
    return i;
  }
}

function validarListaDeParametros(cursor: CursorDeTokens, indiceInicial: number): void {
  const indiceDeError = indiceDeErrorEnListaDeParametros(cursor, indiceInicial);
  if (indiceDeError === null) return;
  throw new ErrorDeCompilacion('la lista de parámetros no es válida aquí', cursor.mirar(indiceDeError).rango);
}

function errorDeFinDeArchivoEnLaClase(cursor: CursorDeTokens): ErrorDeCompilacion {
  // err16 de exploracion/03: ancla en el FIN del último token real (nunca en la posición cruda
  // de "eof" — ver la nota de `finDelTokenAnterior`, verificado con javac 17 real).
  const fin = cursor.finDelTokenAnterior();
  return new ErrorDeCompilacion(
    'el archivo terminó y todavía falta cerrar una llave "}" en el cuerpo de la clase',
    { inicio: fin, fin },
    undefined,
    'fin-de-archivo-inesperado',
  );
}

/** Tarea 1.29: consume un CAMPO entero, hasta SU «;» de nivel superior — el inicializador puede traer llaves (`{ 1, 2 }`,
 * una clase anónima, una lambda) que no lo terminan. Si la «}» que cierra la clase llega antes del «;», al campo le
 * falta: el mismo «';' expected» de javac, anclado al final del último token. */
function consumirCampo(cursor: CursorDeTokens, inicio: number): NodoNoSoportado {
  let profundidad = 0;
  for (;;) {
    const token = cursor.actual();
    if (token.tipo === 'eof') throw errorDeFinDeArchivoEnLaClase(cursor);
    if (token.texto === '(' || token.texto === '[' || token.texto === '{') {
      profundidad += 1;
    } else if (token.texto === ')' || token.texto === ']' || token.texto === '}') {
      if (profundidad === 0) {
        const fin = cursor.finDelTokenAnterior();
        throw new ErrorDeCompilacion('falta el ";" al final de la declaración', { inicio: fin, fin }, undefined, 'falta-punto-y-coma');
      }
      profundidad -= 1;
    } else if (profundidad === 0 && token.texto === ';') {
      const fin = cursor.avanzar().rango.fin;
      return { tipo: 'no-soportado', codigo: CODIGOS_NO_SOPORTADO.miembroDeClase, datos: {}, rango: { inicio, fin } };
    }
    cursor.avanzar();
  }
}

export function consumirMiembroDeClase(cursor: CursorDeTokens, nombreDeLaClase: string): NodoNoSoportado {
  const inicio = cursor.actual().rango.inicio;
  const forma = validarCabeceraDeMiembro(cursor, nombreDeLaClase);
  if (forma === 'campo') return consumirCampo(cursor, inicio);
  let profundidadParen = 0;
  for (;;) {
    const token = cursor.actual();
    if (token.tipo === 'eof') throw errorDeFinDeArchivoEnLaClase(cursor);
    if (token.texto === '(') {
      profundidadParen += 1;
      cursor.avanzar();
      continue;
    }
    if (token.texto === ')') {
      profundidadParen -= 1;
      cursor.avanzar();
      continue;
    }
    if (profundidadParen === 0 && token.texto === ';') {
      const fin = cursor.avanzar().rango.fin;
      return { tipo: 'no-soportado', codigo: CODIGOS_NO_SOPORTADO.miembroDeClase, datos: {}, rango: { inicio, fin } };
    }
    if (profundidadParen === 0 && token.texto === '{') {
      cursor.avanzar();
      const cierre = saltarHastaCerrar(cursor, '{', '}');
      return {
        tipo: 'no-soportado',
        codigo: CODIGOS_NO_SOPORTADO.miembroDeClase,
        datos: {},
        rango: { inicio, fin: cierre.rango.fin },
      };
    }
    cursor.avanzar();
  }
}

// ---- Cabecera de la clase: parámetros de tipo, `extends`, `implements` (tarea 1.29, design.md §2.3: la clase es UNA,
// con `main`; REQ-SUB-007: «clases/objetos propios» → aviso). Hasta esta tarea la cabecera exigía «{» justo tras el
// nombre, así que `class C extends B` / `class C implements A` / `class C<T>` daban «falta abrir "{"», un error FALSO. ----

/** Consume un tipo de la cláusula `extends`/`implements` (nombre calificado y, si los trae, sus argumentos de tipo) y
 * devuelve su último token. Un tipo ausente es el mismo «<identifier> expected» de javac. */
function consumirTipoDeCabeceraDeClase(cursor: CursorDeTokens): Token {
  const primero = cursor.actual();
  if (primero.tipo !== 'identificador') {
    throw new ErrorDeCompilacion(`se esperaba un identificador y se encontró "${primero.texto || '<fin de archivo>'}"`, primero.rango);
  }
  const cantidad = indiceTrasTipo(cursor, 0, false);
  let ultimo = primero;
  for (let n = 0; n < cantidad; n += 1) ultimo = cursor.avanzar();
  return ultimo;
}

/**
 * Consume lo que puede haber entre el nombre de la clase y su «{» —`<T extends Comparable<T>>`, `extends B`,
 * `implements A, C<String>`— y lo devuelve como avisos: uno de genérico por los parámetros de tipo y uno de herencia
 * por la cláusula (`extends` y `implements` juntos son UNO, del primero al último tipo). No valida que los tipos
 * existan (una clase padre inexistente la rechaza javac, pero decidirlo pide el catálogo del JDK y aquí, en la
 * sintaxis, un aviso es la respuesta segura). Cualquier otra cosa antes de la «{» la rechaza quien llama, con el error
 * de siempre; una cláusula mal formada (`extends` sin tipo, dos `extends`, una lista tras `extends`) es un error real.
 */
export function consumirCabeceraDeClase(cursor: CursorDeTokens): NodoNoSoportado[] {
  const avisos: NodoNoSoportado[] = [];
  if (cursor.coincideTexto('<')) {
    const cantidad = indiceTrasArgumentosDeTipo(cursor, 0);
    if (cantidad !== null) {
      const inicio = cursor.actual().rango.inicio;
      let ultimo = cursor.actual();
      for (let n = 0; n < cantidad; n += 1) ultimo = cursor.avanzar();
      avisos.push({ tipo: 'no-soportado', codigo: CODIGOS_NO_SOPORTADO.generico, datos: {}, rango: { inicio, fin: ultimo.rango.fin } });
    }
  }
  if (cursor.coincideTexto('extends') || cursor.coincideTexto('implements')) {
    const inicio = cursor.actual().rango.inicio;
    let ultimo = cursor.actual();
    if (cursor.coincideTexto('extends')) {
      cursor.avanzar();
      ultimo = consumirTipoDeCabeceraDeClase(cursor);
    }
    if (cursor.coincideTexto('implements')) {
      cursor.avanzar();
      ultimo = consumirTipoDeCabeceraDeClase(cursor);
      while (cursor.coincideTexto(',')) {
        cursor.avanzar();
        ultimo = consumirTipoDeCabeceraDeClase(cursor);
      }
    }
    avisos.push({ tipo: 'no-soportado', codigo: CODIGOS_NO_SOPORTADO.herencia, datos: {}, rango: { inicio, fin: ultimo.rango.fin } });
  }
  return avisos;
}

// ---- `throws` de `main` (design.md §2.3: "Main = ... ')' Bloque" — throws → NO-DISP) ----

function consumirNombreCalificado(cursor: CursorDeTokens): Token {
  let ultimo = cursor.esperarTipo('identificador');
  while (cursor.coincideTexto('.') && cursor.mirar(1).tipo === 'identificador') {
    cursor.avanzar();
    ultimo = cursor.esperarTipo('identificador');
  }
  return ultimo;
}

export function analizarClausulaThrowsOpcional(cursor: CursorDeTokens): NodoNoSoportado | null {
  if (!cursor.coincideTexto('throws')) return null;
  const inicioToken = cursor.avanzar();
  let ultimo = consumirNombreCalificado(cursor);
  while (cursor.coincideTexto(',')) {
    cursor.avanzar();
    ultimo = consumirNombreCalificado(cursor);
  }
  return {
    tipo: 'no-soportado',
    codigo: CODIGOS_NO_SOPORTADO.throwsClausula,
    datos: {},
    rango: { inicio: inicioToken.rango.inicio, fin: ultimo.rango.fin },
  };
}

// ---- Recolector (tarea 1.17, REQ-DIFF-004 parte C8): reúne TODOS los avisos NO-DISP de un
// programa ya analizado — tanto léxicos (tokens `no-soportado` del tokenizador: literales hex/
// octal/binarios/float, escapes, \uXXXX incluso en comentarios) como sintácticos (`NodoNoSoportado`
// de este módulo y `NodoExpresionNoSoportada` de `expresiones.ts`) — ordenados por posición en el
// texto (design.md §2.1: "el primero en el texto"). `compilador.ts` reporta el primero y cuenta el
// resto como "adicionales" (REQ-SUB-006: "y N más").

// Tarea 1.25: `datos` es una COPIA (nunca una construcción nueva) de un valor que YA se verificó
// contra `DatosPorCodigoNoSoportado` en su sitio de origen (un `Token` léxico, ya tipado por
// `ConDatosPorCodigo` en `literales.ts`/`analizador-lexico.ts`, o un `NodoNoSoportado`/
// `NodoExpresionNoSoportada` sintáctico, ídem en `ast.ts`) — por eso, a diferencia de esos tres
// sitios, esta interfaz sigue con `Record<string, unknown>` sin re-verificar: no hay nada nuevo que
// construir aquí, solo reunir en una sola lista lo que cada emisor ya construyó bien (mismo patrón
// que `ProblemaAtribucion.datos`/`Problema.datos` desde la tarea 1.11).
export interface NoSoportadoColectado {
  readonly codigo: CodigoNoSoportado;
  readonly rango: Rango;
  readonly datos: Readonly<Record<string, unknown>>;
}

export function recolectarNoSoportados(
  programa: NodoPrograma,
  tokensNoSoportados: readonly Token[],
): NoSoportadoColectado[] {
  const salida: NoSoportadoColectado[] = tokensNoSoportados.map((t) => ({
    codigo: t.codigo ?? CODIGOS_NO_SOPORTADO.sinClasificar,
    rango: t.rango,
    datos: t.datos ?? {},
  }));

  for (const otro of programa.importacionesNoSoportadas) salida.push(otro);
  for (const otro of programa.otrosTiposDeNivelSuperior) salida.push(otro);
  for (const otro of programa.clase.otrosMiembros) salida.push(otro);
  // Tarea 1.15 (REQ-COMP-008): sin "main" no hay nada más que recolectar aquí (el AST ya no lanza
  // por "sin main" -- ver analizador-sintactico.ts).
  if (programa.clase.main !== null) {
    if (programa.clase.main.clausulaThrows) salida.push(programa.clase.main.clausulaThrows);
    recolectarDeElemento(programa.clase.main.cuerpo, salida);
  }

  salida.sort((a, b) => a.rango.inicio - b.rango.inicio);
  return salida;
}

function recolectarDeElemento(elemento: NodoElementoBloque, salida: NoSoportadoColectado[]): void {
  if (elemento.tipo === 'no-soportado') {
    salida.push(elemento);
    return; // ya delimita el tramo completo (ADR 003): no hace falta bajar más.
  }
  switch (elemento.tipo) {
    case 'declaracion-local':
      for (const declarador of elemento.declaradores) {
        if (declarador.inicializador) recolectarDeExpresion(declarador.inicializador, salida);
      }
      return;
    case 'bloque':
      for (const hijo of elemento.elementos) recolectarDeElemento(hijo, salida);
      return;
    case 'sentencia-expresion':
      recolectarDeExpresion(elemento.expresion, salida);
      return;
    case 'if':
      recolectarDeExpresion(elemento.condicion, salida);
      recolectarDeElemento(elemento.entonces, salida);
      if (elemento.sino) recolectarDeElemento(elemento.sino, salida);
      return;
    case 'while':
      recolectarDeExpresion(elemento.condicion, salida);
      recolectarDeElemento(elemento.cuerpo, salida);
      return;
    case 'do-while':
      recolectarDeElemento(elemento.cuerpo, salida);
      recolectarDeExpresion(elemento.condicion, salida);
      return;
    case 'for':
      if (elemento.inicializacionDeclaracion) recolectarDeElemento(elemento.inicializacionDeclaracion, salida);
      for (const expr of elemento.inicializacionExpresiones) recolectarDeExpresion(expr.expresion, salida);
      if (elemento.condicion) recolectarDeExpresion(elemento.condicion, salida);
      for (const expr of elemento.actualizacion) recolectarDeExpresion(expr.expresion, salida);
      recolectarDeElemento(elemento.cuerpo, salida);
      return;
    case 'switch':
      recolectarDeExpresion(elemento.selector, salida);
      for (const el of elemento.elementos) recolectarDeElementoSwitch(el, salida);
      return;
    case 'impresion':
      // Tarea 1.8 (pendiente heredado): el argumento de print/println ya no es solo un
      // literal-cadena (0.12) — puede traer NO-DISP anidado (p. ej. "println(a & b)").
      // Corrección obligatoria (sub-lote 1-C2): "println()" sin argumentos tiene `argumento:null`
      // — nunca hay nada que recolectar en ese caso.
      if (elemento.argumento !== null) recolectarDeExpresion(elemento.argumento, salida);
      return;
    default:
      // 'retorno', 'break', 'continue', 'sentencia-vacia': sin subexpresiones.
      return;
  }
}

function recolectarDeElementoSwitch(elemento: NodoElementoSwitch, salida: NoSoportadoColectado[]): void {
  if (elemento.tipo === 'etiqueta-case') {
    recolectarDeExpresion(elemento.valor, salida);
    return;
  }
  if (elemento.tipo === 'etiqueta-default') return;
  recolectarDeElemento(elemento, salida);
}

function recolectarDeExpresion(expresion: NodoExpresion, salida: NoSoportadoColectado[]): void {
  if (expresion.tipo === 'expresion-no-soportada') {
    salida.push(expresion);
    return;
  }
  switch (expresion.tipo) {
    case 'binaria':
      recolectarDeExpresion(expresion.izquierda, salida);
      recolectarDeExpresion(expresion.derecha, salida);
      return;
    case 'unaria':
      recolectarDeExpresion(expresion.operando, salida);
      return;
    case 'asignacion':
      recolectarDeExpresion(expresion.objetivo, salida);
      recolectarDeExpresion(expresion.valor, salida);
      return;
    case 'incremento-decremento':
      recolectarDeExpresion(expresion.operando, salida);
      return;
    case 'llamada':
      recolectarDeExpresion(expresion.callee, salida);
      for (const argumento of expresion.argumentos) recolectarDeExpresion(argumento, salida);
      return;
    case 'acceso-miembro':
      recolectarDeExpresion(expresion.objeto, salida);
      return;
    case 'nueva-instancia':
      for (const argumento of expresion.argumentos) recolectarDeExpresion(argumento, salida);
      return;
    case 'conversion':
      recolectarDeExpresion(expresion.operando, salida);
      return;
    default:
      // Literales y NodoNombre: sin subexpresiones.
      return;
  }
}
