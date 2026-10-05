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
import {
  CODIGOS_NO_SOPORTADO,
  TIPOS_PRIMITIVOS_NO_SOPORTADOS,
  type CodigoNoSoportado,
  type DatosPorCodigoNoSoportado,
  type TipoPrimitivoNoSoportado,
} from '../no-soportado.ts';
export { CODIGOS_NO_SOPORTADO, type CodigoNoSoportado };

// Tabla construcción→código de los tipos primitivos NO soportados (design.md §2.6): float/byte/short
// son tipos primitivos REALES de Java que NUNCA se reinterpretan como double/int (REQ-SUB-007) — se
// reconocen por texto exacto en posición de tipo de DeclLocal (no viven en
// `PALABRAS_CLAVE_TIPO_PRIMITIVO` de tokens.ts a propósito: esa tabla sigue representando solo los
// tipos REALMENTE soportados, que también participan de casts válidos). Tarea 1.30: la lista sale de
// `TIPOS_PRIMITIVOS_NO_SOPORTADOS` (motor/no-soportado.ts), la misma de la que sale el tipo de los datos del aviso.
export const PALABRAS_TIPO_PRIMITIVO_NO_SOPORTADO: ReadonlySet<string> = new Set(TIPOS_PRIMITIVOS_NO_SOPORTADOS);

/** ¿Es esta palabra uno de los tres tipos primitivos fuera del subconjunto? Estrecha el tipo, para que el aviso
 * lleve el tipo CONCRETO (`DatosPorCodigoNoSoportado['tipo-primitivo-no-soportado']`) sin ningún `as`. */
export function esTipoPrimitivoNoSoportado(texto: string): texto is TipoPrimitivoNoSoportado {
  return PALABRAS_TIPO_PRIMITIVO_NO_SOPORTADO.has(texto);
}

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

// ---- `sealed` y `non-sealed` (tarea 1.35, JLS 8.1.1.2 y 9.1.1.4) ----
// Son modificadores CONTEXTUALES de una clase o interfaz: `int sealed = 1;` y `permits` como nombre de variable siguen valiendo. javac los reconoce por lo que
// los sigue (`JavacParser.isSealedClassStart`/`isNonSealedClassStart`, JDK 17): otro modificador, `class`, `interface`, `enum`, una anotación (que no sea `@interface`
// salvo tras `non-sealed`), o el otro de los dos. `non-sealed` son tres tokens (`non`, `-`, `sealed`) y deben ir PEGADOS: con espacios no es el modificador.
const PALABRAS_QUE_PUEDEN_SEGUIR_A_SEALED: ReadonlySet<string> = new Set([
  'public', 'protected', 'private', 'abstract', 'static', 'final', 'strictfp', 'class', 'interface', 'enum',
]);

function esNonSealedPegado(cursor: CursorDeTokens, desplazamiento: number): boolean {
  const non = cursor.mirar(desplazamiento);
  const menos = cursor.mirar(desplazamiento + 1);
  const sealed = cursor.mirar(desplazamiento + 2);
  return (
    non.tipo === 'identificador' &&
    non.texto === 'non' &&
    menos.texto === '-' &&
    sealed.tipo === 'identificador' &&
    sealed.texto === 'sealed' &&
    non.rango.fin === menos.rango.inicio &&
    menos.rango.fin === sealed.rango.inicio
  );
}

function puedeSeguirASealed(cursor: CursorDeTokens, desplazamiento: number, trasNonSealed: boolean): boolean {
  const token = cursor.mirar(desplazamiento);
  if (PALABRAS_QUE_PUEDEN_SEGUIR_A_SEALED.has(token.texto)) return true;
  if (token.texto === '@') return cursor.mirar(desplazamiento + 1).texto !== 'interface' || trasNonSealed;
  return token.tipo === 'identificador' && (token.texto === 'sealed' || esNonSealedPegado(cursor, desplazamiento));
}

/** Cuántos tokens ocupa el modificador `sealed` (1) o `non-sealed` (3) que empieza en `cursor.mirar(desplazamiento)`; 0 si ahí no hay ninguno. Solo mira. */
export function longitudDeModificadorSellado(cursor: CursorDeTokens, desplazamiento: number): number {
  if (esNonSealedPegado(cursor, desplazamiento)) return puedeSeguirASealed(cursor, desplazamiento + 3, true) ? 3 : 0;
  const token = cursor.mirar(desplazamiento);
  return token.tipo === 'identificador' && token.texto === 'sealed' && puedeSeguirASealed(cursor, desplazamiento + 1, false) ? 1 : 0;
}

/** Avanza `desplazamiento` por los modificadores de `permitidos` y los `sealed`/`non-sealed` que empiezan ahí (solo mira). */
function desplazamientoTrasModificadores(cursor: CursorDeTokens, permitidos: ReadonlySet<string>, desplazamiento: number): number {
  let i = desplazamiento;
  for (;;) {
    const sellado = longitudDeModificadorSellado(cursor, i);
    if (sellado > 0) i += sellado;
    else if (permitidos.has(cursor.mirar(i).texto)) i += 1;
    else return i;
  }
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
  i = desplazamientoTrasModificadores(cursor, MODIFICADORES_TIPO_NIVEL_SUPERIOR, i); // tarea 1.35: también `sealed` y `non-sealed`
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
 * `extends` y `super` son palabras reservadas (desde la tarea 1.33 el léxico entrega las 54 de javac como `palabra-clave`; antes `extends`
 * era un identificador), y en un genérico las dos son parte del tipo (`? extends Number`, `T extends Comparable<T>`). */
function esTokenDeArgumentoDeTipo(token: Token): boolean {
  if (token.tipo === 'identificador') return true;
  if (PALABRAS_CLAVE_TIPO_PRIMITIVO.has(token.texto) || PALABRAS_TIPO_PRIMITIVO_NO_SOPORTADO.has(token.texto)) return true; // List<int[]>
  return token.texto === 'super' || token.texto === 'extends' || token.texto === '.' || token.texto === ',' || token.texto === '?' || token.texto === '&' || token.texto === '[' || token.texto === ']';
}

/**
 * Desplazamiento del primer token DESPUÉS de los argumentos o parámetros de tipo que abre el «<» de
 * `cursor.mirar(desplazamientoDeApertura)` (`<String, List<Integer>>`, `<T extends Comparable<T>>`,
 * `<? super Integer>`), o `null` si lo que sigue no tiene la forma de una lista de tipos que CIERRA
 * (una comparación `a < b`, un «<» sin pareja). El lexer junta los cierres consecutivos en un solo token
 * (`>>`, `>>>`): cada uno cuenta por los «>» que trae. Solo mira, nunca consume.
 */
export function indiceTrasArgumentosDeTipo(cursor: CursorDeTokens, desplazamientoDeApertura: number): number | null {
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

/**
 * Tarea 1.35: consume un TIPO completo que empieza en el cursor —el nombre con su paquete (`java.lang.String`), los argumentos de tipo (`List<?>`,
 * `Map.Entry<K, V>`) y las dimensiones de arreglo (`String[][]`)— y devuelve su último token. El primer token ya debe ser un identificador (quien llama lo
 * comprueba: aquí no se valida nada, solo se delimita; REQ-SUB-007 acepta cualquier tipo como aviso). Lo usa el lado derecho de `instanceof`.
 */
export function consumirTipo(cursor: CursorDeTokens): Token {
  return consumirTipoDescrito(cursor).ultimo;
}

/** Lo que se sabe de un tipo ya consumido (`consumirTipoDescrito`). */
export interface TipoConsumido {
  /** El tipo tal como se escribió, SIN espacios (`java.util.List<String>[]`). */
  readonly texto: string;
  readonly ultimo: Token;
  /** ¿Trae dimensiones de arreglo (`[]`)? */
  readonly conDimensiones: boolean;
  /** ¿Trae argumentos de tipo (`<…>`)? */
  readonly conArgumentosDeTipo: boolean;
}

/**
 * Tarea 1.35: lo mismo que `consumirTipo`, pero devolviendo además el texto del tipo sin espacios y qué trae (dimensiones, argumentos de tipo): el aviso de un cast a `String[]` o a
 * `List<String>` depende de eso. Lo usan el tipo de un cast y el literal de clase de un tipo con corchetes.
 */
export function consumirTipoDescrito(cursor: CursorDeTokens): TipoConsumido {
  const cantidad = indiceTrasTipo(cursor, 0);
  let texto = '';
  let ultimo = cursor.actual();
  let conDimensiones = false;
  let conArgumentosDeTipo = false;
  for (let n = 0; n < cantidad; n += 1) {
    ultimo = cursor.avanzar();
    texto += ultimo.texto;
    if (ultimo.texto === '[') conDimensiones = true;
    else if (ultimo.texto === '<') conArgumentosDeTipo = true;
  }
  return { texto, ultimo, conDimensiones, conArgumentosDeTipo };
}

/**
 * Tarea 1.35: si el cursor está en los argumentos de tipo de un genérico (`<String>`, `<K, V>`, el rombo `<>`) que CIERRAN, los consume y devuelve su último
 * token (el `>` que los cierra); `null` —sin consumir nada— si no hay un «<» ahí o no tiene la forma de una lista de tipos (`a < b`). Lo usa `new Tipo<…>(…)`.
 */
export function consumirArgumentosDeTipoOpcionales(cursor: CursorDeTokens): Token | null {
  if (!cursor.coincideTexto('<')) return null;
  const cantidad = indiceTrasArgumentosDeTipo(cursor, 0);
  if (cantidad === null) return null;
  let ultimo = cursor.actual();
  for (let n = 0; n < cantidad; n += 1) ultimo = cursor.avanzar();
  return ultimo;
}

// Lo que puede seguir al nombre de una clase, interfaz, enum o record ANIDADOS (`static class B<T> extends A {`,
// `record P(int x) implements I {`): se acepta cualquiera de ellos sin validar la cabecera completa del tipo
// anidado —es un aviso más, REQ-SUB-007—; lo demás cae al chequeo de siempre y sigue siendo un error.
const CONTINUACIONES_DE_TIPO_ANIDADO: ReadonlySet<string> = new Set(['{', '<', '(', 'extends', 'implements', 'permits']);

/** Cómo termina un miembro: un CAMPO en el «;» de nivel superior (su inicializador puede traer llaves: `{ 1, 2 }`, una
 * clase anónima, una lambda); todo lo demás —método, constructor, bloque, tipo anidado— en su «;» o en su «{ … }».
 * Tarea 1.35: de un campo se sabe además cuántos tokens ocupa su CABECERA (modificadores, tipo, nombre y los corchetes
 * del primer declarador): `consumirCampo` la salta y vigila solo lo que sigue, el inicializador. */
type FormaDeMiembro = { readonly tipo: 'campo'; readonly tokensDeLaCabecera: number } | { readonly tipo: 'otro' };

const MIEMBRO_QUE_NO_ES_CAMPO: FormaDeMiembro = { tipo: 'otro' };

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
  let i = desplazamientoTrasModificadores(cursor, MODIFICADORES_MIEMBRO, 0); // tarea 1.35: también `sealed` y `non-sealed`

  // EOF en CUALQUIER posición de la cabecera: nunca es asunto de esta función -- err16
  // (`fin-de-archivo-inesperado`, con su propio código y posición ancladas en
  // `cursor.finDelTokenAnterior()`) sigue siendo el ÚNICO responsable; el bucle original de
  // `consumirMiembroDeClase` (abajo) lo detecta en su primera vuelta tal cual ya hacía.
  let tipo = cursor.mirar(i);
  if (tipo.tipo === 'eof') return MIEMBRO_QUE_NO_ES_CAMPO;
  // "{" aquí (sin tipo/nombre antes) es un bloque inicializador (JLS 8.6/8.7) -- una forma REAL de
  // miembro que este subconjunto ya trataba como NO-DISP ("bloque", cabecera del módulo) antes de
  // esta corrección; nunca se rechaza como "falta el tipo" -- se difiere al bucle original de
  // `consumirMiembroDeClase`, que YA sabe delimitarlo bien con `saltarHastaCerrar`.
  if (tipo.texto === '{') return MIEMBRO_QUE_NO_ES_CAMPO;
  // Tarea 1.35: javac solo lee `Tipo nombre …` como un CAMPO si el miembro no es `void` ni lleva parámetros de tipo propios (`<T> …`); en los otros dos casos exige el «(» de un método.
  let conParametrosDeTipo = false;
  // Tarea 1.29: los parámetros de tipo de un método o constructor genérico (`<T> void f(T t)`) se saltan y la
  // cabecera sigue desde el tipo de retorno (o el nombre del constructor). Si no cierran, todo sigue como antes.
  if (tipo.texto === '<') {
    const trasLosParametros = indiceTrasArgumentosDeTipo(cursor, i);
    if (trasLosParametros !== null) {
      i = trasLosParametros;
      conParametrosDeTipo = true;
      tipo = cursor.mirar(i);
      if (tipo.tipo === 'eof') return MIEMBRO_QUE_NO_ES_CAMPO;
    }
  }
  if (esFinalDeMiembro(tipo)) {
    throw new ErrorDeCompilacion('se esperaba el tipo de un campo o método aquí', tipo.rango);
  }
  // Tarea 1.29: una clase, interfaz, enum o record anidados.
  if (PALABRAS_TIPO_NIVEL_SUPERIOR.has(tipo.texto) && cursor.mirar(i + 1).tipo === 'identificador') {
    const trasElNombre = cursor.mirar(i + 2);
    if (trasElNombre.tipo === 'eof' || CONTINUACIONES_DE_TIPO_ANIDADO.has(trasElNombre.texto)) return MIEMBRO_QUE_NO_ES_CAMPO;
  }
  // Tarea 1.29: el constructor (JLS 8.8: el nombre de la clase, sin tipo de retorno). Con OTRO nombre es un
  // método al que le falta el tipo de retorno y sigue siendo el error de siempre (javac: invalid method
  // declaration; return type required).
  if (tipo.tipo === 'identificador' && tipo.texto === nombreDeLaClase && cursor.mirar(i + 1).texto === '(') {
    validarListaDeParametros(cursor, i + 2);
    return MIEMBRO_QUE_NO_ES_CAMPO;
  }

  const desplazamientoDelNombre = indiceTrasTipo(cursor, i);
  const nombre = cursor.mirar(desplazamientoDelNombre);
  if (nombre.tipo === 'eof') return MIEMBRO_QUE_NO_ES_CAMPO;
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
  if (siguiente.tipo === 'eof') return MIEMBRO_QUE_NO_ES_CAMPO;
  const esCampo = siguiente.texto === ';' || siguiente.texto === '=' || siguiente.texto === ',';
  // Tarea 1.35: ya no se acepta «{» tras `Tipo nombre` (`int x { … }`): javac lo rechaza («';' expected», verificado con javac 17.0.18) y era un falso acepto; los únicos «{» válidos
  // tras un nombre son los del tipo anidado (`class B {`, resuelto arriba) y el bloque inicializador (sin tipo ni nombre), que no llegan aquí.
  const esContinuacionValida = esCampo || (!hayDimensionesTrasElNombre && siguiente.texto === '(');
  if (!esContinuacionValida) {
    // Tarea 1.35 (SUGGESTION-3): `int x` seguido de lo que no es «=», «,», «;» ni «(» —el siguiente miembro, un «}», un «+»— es un campo al que le falta el «;»: javac lo señala en
    // el FIN de su última palabra (`accept(SEMI)` ancla en el token anterior), no donde está lo que sigue, que casi siempre cae en otra línea. Un «[» que no cierra es otro error
    // de javac («']' expected»), y un `void` o un miembro con parámetros de tipo exigen «(» en el token mismo: esos conservan el error de siempre.
    const esVoid = tipo.texto === 'void';
    // Una anotación pegada al nombre es, para javac, la anotación de TIPO de unos corchetes que no llegan («illegal start of type», en la `@`): ni siquiera «falta el ;».
    if (!esVoid && !conParametrosDeTipo && siguiente.texto === '@') throw new ErrorDeCompilacion('se esperaba un tipo y se encontró "@"', siguiente.rango);
    if (!esVoid && !conParametrosDeTipo && siguiente.texto !== '[') {
      throw errorDeFaltaPuntoYComa(cursor.mirar(desplazamientoTrasElNombre - 1).rango.fin);
    }
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
  if (esCampo) {
    validarDeclaradoresDeCampo(cursor, desplazamientoTrasElNombre);
    return { tipo: 'campo', tokensDeLaCabecera: desplazamientoTrasElNombre };
  }
  return MIEMBRO_QUE_NO_ES_CAMPO;
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
        // Tarea 1.35: javac («<identifier> expected») lo señala en el FIN de la coma, no en lo que sigue, que casi siempre está en otro renglón (verificado con javac 17.0.18).
        throw new ErrorDeCompilacion(`se esperaba un identificador y se encontró "${siguiente.texto}"`, { inicio: token.rango.fin, fin: token.rango.fin });
      }
    }
  }
}

/**
 * Tarea 1.35: si en `cursor.mirar(desplazamiento)` empieza un TIPO (un identificador o una palabra de tipo primitivo, soportada o no), el desplazamiento del primer token que
 * sigue al tipo completo —nombre con paquete, argumentos de tipo y dimensiones de arreglo—; `null` si ahí no puede empezar un tipo. Solo mira. Lo usa el reconocedor del
 * `for` mejorado (`for (int[] fila : matriz)`).
 */
export function desplazamientoTrasTipoOpcional(cursor: CursorDeTokens, desplazamiento: number): number | null {
  return pareceInicioDeTipo(cursor.mirar(desplazamiento)) ? indiceTrasTipo(cursor, desplazamiento) : null;
}

/** ¿"Tipo Identificador" plausible? (JLS 8.4.1, sin validar el TIPO en sí -- REQ-SUB-007 acepta
 * cualquiera, real o inventado, como NO-DISP): un identificador (incluye nombres calificados,
 * "java.util.List"), o una palabra de tipo primitivo (soportada o no -- "float"/"byte"/"short"
 * también abren un tipo real de Java, aunque este subconjunto no los soporte, REQ-SUB-007). */
export function pareceInicioDeTipo(token: Token): boolean {
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
    if (cursor.mirar(i).texto === '...') {
      i += 1; // varargs: Tipo... nombre (tarea 1.36: la elipsis es UN token de tres puntos pegados)
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

/** Tarea 1.35: ¿la lista de parámetros que empieza en `cursor.mirar(desplazamiento)` (el primer token tras el «(») tiene la forma completa de JLS 8.4.1 y CIERRA con su «)»?
 * Solo mira. Sirve para decidir si un `void main(String…` con otra firma es un método propio más (bien formado) o un `main` mal escrito (error de sintaxis). */
export function listaDeParametrosEsValida(cursor: CursorDeTokens, desplazamiento: number): boolean {
  return indiceDeErrorEnListaDeParametros(cursor, desplazamiento) === null;
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

/** «falta el ";" al final de la declaración» anclado en `fin`, el FIN de la última palabra de la declaración (`accept(SEMI)` de javac ancla en el token anterior, nunca en el siguiente). */
function errorDeFaltaPuntoYComa(fin: number): ErrorDeCompilacion {
  return new ErrorDeCompilacion('falta el ";" al final de la declaración', { inicio: fin, fin }, undefined, 'falta-punto-y-coma');
}

// ---- Dónde termina el inicializador de un campo al que le falta el «;» (tarea 1.35, SUGGESTION-3 de la re-verificación del lote 1) ----
//
// javac lee un campo como `Tipo nombre [= expresión] {, nombre [= expresión]} ;` y la expresión se acaba en la primera palabra que ya no puede continuarla (`term()` solo sigue mientras
// ve un operador, un `.`, un `[`, un `(`, un `::`, un `?`, un `++`…): ahí falta el «;» y el error se ancla en el FIN de la palabra anterior. Hasta esta tarea `consumirCampo` buscaba a ciegas
// el siguiente «;» de nivel superior, así que el campo olvidado se tragaba al miembro siguiente entero y el error caía al final de ESE miembro —otra línea—, o ni siquiera era error: `int x = 5`
// seguido de `int y;` salía como un solo campo y un aviso. La regla de abajo solo mira PARES de palabras de nivel superior y solo se dispara en los que NINGÚN programa válido contiene
// (verificado con javac 17.0.18): un operando seguido de algo que empieza una construcción nueva. Lo ambiguo no se rechaza (cerrar por defecto, 1.34, no es rechazar lo válido):
//   - `(Tipo) operando` es una conversión: tras un `)` cuyo interior solo tiene forma de tipo puede venir una palabra (`(int) x`, `(Object) int.class`), así que ahí solo se vigilan los modificadores;
//   - `o instanceof Tipo nombre` y `new @Anotación Tipo()` traen dos nombres seguidos: en cuanto aparece un `instanceof` o una `@` de nivel superior, el par «nombre nombre» ya no se vigila.

const PALABRAS_QUE_ABREN_UN_MIEMBRO: ReadonlySet<string> = new Set([...MODIFICADORES_MIEMBRO, 'default', 'class', 'interface', 'enum']);
const PALABRAS_DE_TIPO_PRIMITIVO_Y_VOID: ReadonlySet<string> = new Set(['int', 'long', 'double', 'float', 'char', 'boolean', 'byte', 'short', 'void']);
const PALABRAS_DE_LITERAL: ReadonlySet<string> = new Set(['true', 'false', 'null']);
const PUNTUACION_DE_UN_TIPO: ReadonlySet<string> = new Set(['.', ',', '<', '>', '>>', '>>>', '?', '&', '[', ']']);

/**
 * Tarea 1.35: los operadores tras los cuales la expresión TODAVÍA espera un operando: si en su lugar llega una palabra que abre un miembro (un modificador, `default`, `class`, `interface`
 * o `enum`: `int x =` y, abajo, `public static void main`), javac dice «illegal start of expression» en esa palabra (verificado con javac 17.0.18 para cada operador y cada palabra), no «falta
 * el ;»: la expresión aún no podía terminar. Quedan fuera `.` y `new` (javac pide un
 * identificador, en el fin del token anterior), `<` y `>` (pueden abrir o cerrar argumentos de tipo) y `++`/`--` (el sufijo termina un operando; el prefijo lo pide).
 */
const OPERADORES_QUE_PIDEN_UN_OPERANDO: ReadonlySet<string> = new Set([
  '=', '+', '-', '*', '/', '%', '&&', '||', '&', '|', '^', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '<<=', '>>=', '>>>=', '?', ':', '->', '!', '~',
]);

/** Qué se sabe del último grupo `( … )` de nivel superior que se cerró dentro de un campo. */
interface GrupoCerrado {
  /** `( … )` pegado a un nombre: los argumentos de una llamada o de un constructor (`f(1)`, `new Scanner(System.in)`). Su valor es un operando, nunca una conversión. */
  readonly esLlamada: boolean;
  /** Los argumentos de un `new Tipo(…)`: tras ellos puede venir el cuerpo de una clase anónima (`new Object() { }`); tras los de una llamada cualquiera no. */
  readonly esConstructor: boolean;
  /** El selector de un `switch` (`switch (a + 1)`): tras él viene el cuerpo `{ … }`. */
  readonly trasSwitch: boolean;
  /** La expresión TERMINÓ con este grupo, sin que un sufijo (como una anotación) pueda seguirle: la `}` de un arreglo (`= { 1, 2 }`) o la de un `switch`. */
  readonly terminaLaExpresion: boolean;
  /** El interior es solo un tipo (`Tipo`, `List<String>`, `int[]`, `A & B`): podría ser el tipo de una conversión, y entonces lo que sigue es su operando. */
  readonly podriaSerConversion: boolean;
}

/** El grupo `( … )`, `[ … ]` o `{ … }` de nivel superior que está abierto mientras se recorre el campo. */
interface GrupoAbierto {
  readonly esLlamada: boolean;
  readonly esConstructor: boolean;
  readonly trasSwitch: boolean;
  readonly terminaLaExpresion: boolean;
  tokens: number;
  soloTipo: boolean;
  conArroba: boolean;
}

function esTokenDeUnTipo(token: Token): boolean {
  if (token.tipo === 'identificador') return true;
  if (token.tipo === 'palabra-clave') return (PALABRAS_DE_TIPO_PRIMITIVO_Y_VOID.has(token.texto) && token.texto !== 'void') || token.texto === 'extends' || token.texto === 'super';
  return token.tipo === 'puntuacion' && PUNTUACION_DE_UN_TIPO.has(token.texto);
}

function esLiteralOCasiLiteral(token: Token): boolean {
  switch (token.tipo) {
    case 'entero':
    case 'largo':
    case 'doble':
    case 'caracter':
    case 'cadena':
      return true;
    // Un literal con algo fuera del subconjunto (`1.5f`, `0x1F`, un escape raro) llega como «no soportado»; el escape `\uXXXX` NO es un literal: puede ser cualquier carácter.
    case 'no-soportado':
      return token.codigo !== CODIGOS_NO_SOPORTADO.escapeUnicodeNoSoportado;
    case 'palabra-clave':
      return PALABRAS_DE_LITERAL.has(token.texto);
    default:
      return false;
  }
}

/** ¿Termina `previo` un operando (o un nombre) tras el cual ninguna palabra puede seguir dentro de la misma expresión? `'conversion'`: es el `)` de algo que podría ser `(Tipo)` y el operando de la conversión puede venir detrás. */
function terminaUnOperando(previo: Token, ultimoCierre: GrupoCerrado | null): 'no' | 'si' | 'conversion' {
  if (previo.tipo === 'identificador' || esLiteralOCasiLiteral(previo)) return 'si';
  if (previo.tipo === 'palabra-clave' && previo.texto === 'this') return 'si';
  if (previo.tipo !== 'puntuacion') return 'no';
  if (previo.texto === ']' || previo.texto === '}') return 'si';
  if (previo.texto !== ')' || ultimoCierre === null) return 'no';
  return ultimoCierre.esLlamada || !ultimoCierre.podriaSerConversion ? 'si' : 'conversion';
}

/** ¿`actual` empieza algo NUEVO (otro miembro, otra declaración, otro literal) que no puede seguir a `previo` dentro del inicializador de un campo? Entonces al campo le falta el «;». */
function faltaElPuntoYComaAntesDe(actual: Token, previo: Token, ultimoCierre: GrupoCerrado | null, hayDosNombresSeguidosValidos: boolean): boolean {
  const termina = terminaUnOperando(previo, ultimoCierre);
  if (termina === 'no') return false;
  if (actual.tipo === 'palabra-clave' && PALABRAS_QUE_ABREN_UN_MIEMBRO.has(actual.texto)) return true; // ningún operando de una conversión empieza así
  // Un «{» solo continúa un campo tras `new Tipo(…)` (clase anónima), tras el selector de un `switch`, tras `]` o `->` y tras un `=` (arreglo, lambda): detrás de un nombre, un literal o los
  // paréntesis de una llamada, un grupo o una conversión («x {», «f(1) {», «(1 + 2) {»), javac ya cerró la expresión y pide el «;».
  if (actual.texto === '{') {
    if (previo.tipo !== 'puntuacion') return true;
    if (previo.texto === ')') return ultimoCierre !== null && !ultimoCierre.esConstructor && !ultimoCierre.trasSwitch;
    return previo.texto === '}' && ultimoCierre !== null && ultimoCierre.terminaLaExpresion; // tras la `}` de un arreglo o de un `switch` la expresión ya terminó
  }
  if (termina === 'conversion') return false;
  if (actual.tipo === 'palabra-clave') return PALABRAS_DE_TIPO_PRIMITIVO_Y_VOID.has(actual.texto) || PALABRAS_DE_LITERAL.has(actual.texto);
  if (actual.tipo === 'identificador') return !hayDosNombresSeguidosValidos;
  return esLiteralOCasiLiteral(actual);
}

/** Tarea 1.29: consume un CAMPO entero, hasta SU «;» de nivel superior — el inicializador puede traer llaves (`{ 1, 2 }`,
 * una clase anónima, una lambda) que no lo terminan. Si la «}» que cierra la clase llega antes del «;», al campo le
 * falta: el mismo «';' expected» de javac, anclado al final del último token. Tarea 1.35: lo mismo si, en el nivel superior del campo, aparece algo que ya no puede
 * continuar el inicializador —el siguiente miembro— (ver arriba); el error se ancla en el fin de la palabra anterior, como en javac. */
function consumirCampo(cursor: CursorDeTokens, inicio: number, tokensDeLaCabecera: number): NodoNoSoportado {
  let previo = cursor.actual();
  for (let n = 0; n < tokensDeLaCabecera; n += 1) previo = cursor.avanzar(); // la cabecera ya está validada: `Tipo nombre[]` no trae ninguno de los pares de abajo
  let profundidad = 0;
  let grupo: GrupoAbierto | null = null;
  let ultimoCierre: GrupoCerrado | null = null;
  let hayDosNombresSeguidosValidos = false;
  let nombreDeTipoTrasNew = false; // ¿lo último de nivel superior es `new` y el nombre de un tipo (`new java.util.ArrayList<String>`)? Entonces un «(» abre los argumentos de un constructor.
  for (;;) {
    const token = cursor.actual();
    if (token.tipo === 'eof') throw errorDeFinDeArchivoEnLaClase(cursor);
    if (profundidad === 0 && token.tipo === 'palabra-clave' && PALABRAS_QUE_ABREN_UN_MIEMBRO.has(token.texto) && previo.tipo === 'puntuacion' && OPERADORES_QUE_PIDEN_UN_OPERANDO.has(previo.texto)) {
      throw new ErrorDeCompilacion(`se esperaba una expresión y se encontró "${token.texto}"`, token.rango);
    }
    // Una anotación tras un operando (nombre, literal, llamada, grupo, `]`, la `}` de una clase anónima, de una lambda o de un arreglo creado con `new`) no continúa nada: javac la lee como el
    // inicio de una expresión («illegal start of expression») y la señala a ella. Tras la `}` de un arreglo (`= { 1, 2 }`) o de un `switch` la expresión ya había terminado: «';' expected».
    if (profundidad === 0 && token.texto === '@' && terminaUnOperando(previo, ultimoCierre) !== 'no') {
      if (previo.texto === '}' && ultimoCierre !== null && ultimoCierre.terminaLaExpresion) throw errorDeFaltaPuntoYComa(cursor.finDelTokenAnterior());
      throw new ErrorDeCompilacion('se esperaba una expresión y se encontró "@"', token.rango);
    }
    // Tras un `.` o un `new` javac pide un NOMBRE («<identifier> expected») y lo señala en el fin de ese token, no en la palabra que llegó en su lugar. Excepciones: `class` tras un `.`
    // es un literal de clase (`a.class`) y `enum` se lee como un identificador mal usado (el error cae en la palabra).
    if (
      profundidad === 0 &&
      token.tipo === 'palabra-clave' &&
      PALABRAS_QUE_ABREN_UN_MIEMBRO.has(token.texto) &&
      token.texto !== 'enum' &&
      ((previo.texto === '.' && token.texto !== 'class') || (previo.tipo === 'palabra-clave' && previo.texto === 'new'))
    ) {
      throw new ErrorDeCompilacion(`se esperaba un identificador y se encontró "${token.texto}"`, { inicio: previo.rango.fin, fin: previo.rango.fin });
    }
    if (profundidad === 0 && faltaElPuntoYComaAntesDe(token, previo, ultimoCierre, hayDosNombresSeguidosValidos)) {
      throw errorDeFaltaPuntoYComa(cursor.finDelTokenAnterior());
    }
    const esApertura = token.texto === '(' || token.texto === '[' || token.texto === '{';
    const esCierre = token.texto === ')' || token.texto === ']' || token.texto === '}';
    if (esCierre && profundidad === 0) throw errorDeFaltaPuntoYComa(cursor.finDelTokenAnterior());
    if (profundidad === 0 && token.texto === ';') {
      const fin = cursor.avanzar().rango.fin;
      return { tipo: 'no-soportado', codigo: CODIGOS_NO_SOPORTADO.miembroDeClase, datos: {}, rango: { inicio, fin } };
    }
    if (profundidad === 0 && (token.texto === 'instanceof' || token.texto === '@')) hayDosNombresSeguidosValidos = true;
    if (profundidad > 0 && grupo !== null && !(esCierre && profundidad === 1)) {
      grupo.tokens += 1;
      if (!esTokenDeUnTipo(token)) grupo.soloTipo = false;
      if (token.texto === '@') grupo.conArroba = true;
    }
    if (esApertura) {
      if (profundidad === 0) {
        const trasUnNombre = previo.tipo === 'identificador' || (previo.tipo === 'palabra-clave' && (previo.texto === 'this' || previo.texto === 'super'));
        grupo = {
          esLlamada: token.texto === '(' && trasUnNombre,
          esConstructor: token.texto === '(' && nombreDeTipoTrasNew,
          trasSwitch: token.texto === '(' && previo.tipo === 'palabra-clave' && previo.texto === 'switch',
          terminaLaExpresion: token.texto === '{' && (previo.texto === '=' || (previo.texto === ')' && ultimoCierre !== null && ultimoCierre.trasSwitch)),
          tokens: 0,
          soloTipo: true,
          conArroba: false,
        };
      }
      profundidad += 1;
    } else if (esCierre) {
      profundidad -= 1;
      if (profundidad === 0 && grupo !== null) {
        ultimoCierre = {
          esLlamada: grupo.esLlamada,
          esConstructor: grupo.esConstructor,
          trasSwitch: grupo.trasSwitch,
          terminaLaExpresion: grupo.terminaLaExpresion,
          podriaSerConversion: token.texto === ')' && grupo.tokens > 0 && (grupo.soloTipo || grupo.conArroba),
        };
        grupo = null;
      }
    }
    if (profundidad === 0) {
      if (token.tipo === 'palabra-clave' && token.texto === 'new') nombreDeTipoTrasNew = true;
      else if (!(token.tipo === 'identificador' || (token.tipo === 'puntuacion' && PUNTUACION_DE_UN_TIPO.has(token.texto) && token.texto !== '[' && token.texto !== ']'))) nombreDeTipoTrasNew = false;
    }
    previo = cursor.avanzar();
  }
}

export function consumirMiembroDeClase(cursor: CursorDeTokens, nombreDeLaClase: string): NodoNoSoportado {
  const inicio = cursor.actual().rango.inicio;
  const forma = validarCabeceraDeMiembro(cursor, nombreDeLaClase);
  if (forma.tipo === 'campo') return consumirCampo(cursor, inicio, forma.tokensDeLaCabecera);
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
  // Tarea 1.35: la cláusula `permits A, B` de una clase sellada (JLS 8.1.6) es parte de la misma cabecera de herencia; `permits` es un identificador, así que solo cuenta
  // si lo sigue otro (`class C foo` sigue siendo un error).
  const esPermits = (): boolean => cursor.actual().tipo === 'identificador' && cursor.actual().texto === 'permits' && cursor.mirar(1).tipo === 'identificador';
  if (cursor.coincideTexto('extends') || cursor.coincideTexto('implements') || esPermits()) {
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
    if (esPermits()) {
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
  return sinHallazgosRepetidos(salida);
}

/**
 * Tarea 1.35: un literal fuera del subconjunto (`0x1F`, `010`, `0b101`, `3.5f`, un bloque de texto, una cadena con un escape raro) lo señalan DOS emisores —el token del
 * léxico y el nodo que el analizador crea para ese mismo token— con el mismo código y el MISMO rango: es UNA construcción, y contarla dos veces le habría dicho al alumno
 * «y 1 más» en un programa con una sola (REQ-SUB-006). Se queda con la primera aparición; dos ocurrencias en sitios distintos tienen rangos distintos y siguen siendo dos.
 */
function sinHallazgosRepetidos(hallazgos: readonly NoSoportadoColectado[]): NoSoportadoColectado[] {
  const vistos = new Set<string>();
  return hallazgos.filter((hallazgo) => {
    const clave = `${hallazgo.codigo}:${hallazgo.rango.inicio}:${hallazgo.rango.fin}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
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
