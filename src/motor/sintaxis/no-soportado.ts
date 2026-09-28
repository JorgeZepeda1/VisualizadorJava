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
import { CursorDeTokens } from './cursor-de-tokens.ts';
import type {
  NodoElementoBloque,
  NodoElementoSwitch,
  NodoExpresion,
  NodoNoSoportado,
  NodoPrograma,
} from './ast.ts';

// Tabla construcción→código (REFACTOR pedido por 1.6, reusada por el recolector de 1.17).
// float/byte/short (design.md §2.6): tipos primitivos reales de Java que NUNCA se reinterpretan
// como double/int (REQ-SUB-007) — se reconocen por texto exacto en posición de tipo de DeclLocal
// (no viven en `PALABRAS_CLAVE_TIPO_PRIMITIVO` de tokens.ts a propósito: esa tabla sigue
// representando solo los tipos REALMENTE soportados, que también participan de casts válidos).
export const PALABRAS_TIPO_PRIMITIVO_NO_SOPORTADO: ReadonlySet<string> = new Set(['float', 'byte', 'short']);

export const CODIGOS_NO_SOPORTADO = {
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
  arregloNuevo: 'arreglo-no-soportado',
  // Sub-lote 1-D2c (design.md §2.6 fila "Atribución": "miembros existentes no soportados de
  // clases soportadas" — `s.split`, `Math.sin`, `sc.hasNextInt`…). A diferencia de TODO lo demás
  // en esta tabla, este código NO lo produce un reconocedor de `sintaxis/` (necesita el catálogo
  // real del JDK para saber que el miembro EXISTE, ADR 010) — lo emite `semantica/atribucion.ts`
  // directamente, reusando esta MISMA constante para no tener dos fuentes de nombres NO-DISP.
  miembroDeBiblioteca: 'miembro-de-biblioteca-no-soportado',
} as const;

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
export function consumirRestoDeSentenciaNoSoportada(
  cursor: CursorDeTokens,
  inicio: number,
  codigo: string,
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
      return { tipo: 'no-soportado', codigo, rango: { inicio, fin } };
    }
    cursor.avanzar();
  }
}

/**
 * ¿"< ... >" balanceado a partir de `cursor.mirar(desplazamientoDeApertura)` (el primer "<"),
 * seguido de un identificador? Lista de tipos genéricos, p. ej. "ArrayList<Integer> lista" o
 * "Map<String, List<Integer>> mapa". Nunca confunde una comparación real ("total < limite"): si los
 * "<" no cierran en un identificador que sigue, no es una declaración genérica.
 */
export function pareceGenericoDesde(cursor: CursorDeTokens, desplazamientoDeApertura: number): boolean {
  let i = desplazamientoDeApertura;
  let profundidad = 0;
  for (;;) {
    const token = cursor.mirar(i);
    if (token.tipo === 'eof') return false;
    if (token.texto === '<') {
      profundidad += 1;
      i += 1;
      continue;
    }
    if (token.texto === '>') {
      profundidad -= 1;
      i += 1;
      if (profundidad <= 0) break;
      continue;
    }
    if (token.texto === '>>' && profundidad >= 2) {
      profundidad -= 2;
      i += 1;
      if (profundidad <= 0) break;
      continue;
    }
    if (token.tipo === 'identificador' || token.texto === ',' || token.texto === '.') {
      i += 1;
      continue;
    }
    return false;
  }
  return cursor.mirar(i).tipo === 'identificador';
}

// ---- Nivel de programa: otra clase/interfaz/enum/record tras la primera (design.md §2.3) ----

const MODIFICADORES_TIPO_NIVEL_SUPERIOR: ReadonlySet<string> = new Set(['public', 'final', 'abstract']);
const PALABRAS_TIPO_NIVEL_SUPERIOR: ReadonlySet<string> = new Set(['class', 'interface', 'enum', 'record']);

export function pareceOtroTipoDeNivelSuperior(cursor: CursorDeTokens): boolean {
  let i = 0;
  while (MODIFICADORES_TIPO_NIVEL_SUPERIOR.has(cursor.mirar(i).texto)) i += 1;
  return PALABRAS_TIPO_NIVEL_SUPERIOR.has(cursor.mirar(i).texto);
}

export function consumirTipoDeNivelSuperior(cursor: CursorDeTokens): NodoNoSoportado {
  const inicio = cursor.actual().rango.inicio;
  while (!cursor.coincideTexto('{')) {
    if (cursor.actual().tipo === 'eof') {
      throw new ErrorDeCompilacion('se esperaba "{" para el cuerpo del tipo', cursor.actual().rango);
    }
    cursor.avanzar();
  }
  cursor.avanzar();
  const cierre = saltarHastaCerrar(cursor, '{', '}');
  return { tipo: 'no-soportado', codigo: CODIGOS_NO_SOPORTADO.otroTipoDeNivelSuperior, rango: { inicio, fin: cierre.rango.fin } };
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
 * void main(...)" -> "illegal start of type". Solo lanza -- nunca devuelve nada, ni avanza el
 * cursor (D2: el llamador decide qué hacer con el error real; nunca se "corrige" en silencio).
 */
function validarCabeceraDeMiembro(cursor: CursorDeTokens): void {
  let i = 0;
  while (MODIFICADORES_MIEMBRO.has(cursor.mirar(i).texto)) i += 1;

  // EOF en CUALQUIER posición de la cabecera: nunca es asunto de esta función -- err16
  // (`fin-de-archivo-inesperado`, con su propio código y posición ancladas en
  // `cursor.finDelTokenAnterior()`) sigue siendo el ÚNICO responsable; el bucle original de
  // `consumirMiembroDeClase` (abajo) lo detecta en su primera vuelta tal cual ya hacía.
  const tipo = cursor.mirar(i);
  if (tipo.tipo === 'eof') return;
  // "{" aquí (sin tipo/nombre antes) es un bloque inicializador (JLS 8.6/8.7) -- una forma REAL de
  // miembro que este subconjunto ya trataba como NO-DISP ("bloque", cabecera del módulo) antes de
  // esta corrección; nunca se rechaza como "falta el tipo" -- se difiere al bucle original de
  // `consumirMiembroDeClase`, que YA sabe delimitarlo bien con `saltarHastaCerrar`.
  if (tipo.texto === '{') return;
  if (esFinalDeMiembro(tipo)) {
    throw new ErrorDeCompilacion('se esperaba el tipo de un campo o método aquí', tipo.rango);
  }

  const nombre = cursor.mirar(i + 1);
  if (nombre.tipo === 'eof') return;
  if (nombre.tipo !== 'identificador') {
    throw new ErrorDeCompilacion(`se esperaba un identificador y se encontró "${nombre.texto}"`, nombre.rango);
  }

  const siguiente = cursor.mirar(i + 2);
  if (siguiente.tipo === 'eof') return;
  const esContinuacionValida =
    siguiente.texto === '(' || siguiente.texto === ';' || siguiente.texto === '{' || siguiente.texto === '=';
  if (!esContinuacionValida) {
    throw new ErrorDeCompilacion(`se esperaba "(", ";" o "=" y se encontró "${siguiente.texto}"`, siguiente.rango);
  }
}

export function consumirMiembroDeClase(cursor: CursorDeTokens): NodoNoSoportado {
  const inicio = cursor.actual().rango.inicio;
  validarCabeceraDeMiembro(cursor);
  let profundidadParen = 0;
  for (;;) {
    const token = cursor.actual();
    if (token.tipo === 'eof') {
      // err16 de exploracion/03: ancla en el FIN del último token real (nunca en la posición cruda
      // de "eof" — ver la nota de `finDelTokenAnterior`, verificado con javac 17 real).
      const fin = cursor.finDelTokenAnterior();
      throw new ErrorDeCompilacion(
        'el archivo terminó y todavía falta cerrar una llave "}" en el cuerpo de la clase',
        { inicio: fin, fin },
        undefined,
        'fin-de-archivo-inesperado',
      );
    }
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
      return { tipo: 'no-soportado', codigo: CODIGOS_NO_SOPORTADO.miembroDeClase, rango: { inicio, fin } };
    }
    if (profundidadParen === 0 && token.texto === '{') {
      cursor.avanzar();
      const cierre = saltarHastaCerrar(cursor, '{', '}');
      return { tipo: 'no-soportado', codigo: CODIGOS_NO_SOPORTADO.miembroDeClase, rango: { inicio, fin: cierre.rango.fin } };
    }
    cursor.avanzar();
  }
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
    rango: { inicio: inicioToken.rango.inicio, fin: ultimo.rango.fin },
  };
}

// ---- Recolector (tarea 1.17, REQ-DIFF-004 parte C8): reúne TODOS los avisos NO-DISP de un
// programa ya analizado — tanto léxicos (tokens `no-soportado` del tokenizador: literales hex/
// octal/binarios/float, escapes, \uXXXX incluso en comentarios) como sintácticos (`NodoNoSoportado`
// de este módulo y `NodoExpresionNoSoportada` de `expresiones.ts`) — ordenados por posición en el
// texto (design.md §2.1: "el primero en el texto"). `compilador.ts` reporta el primero y cuenta el
// resto como "adicionales" (REQ-SUB-006: "y N más").

export interface NoSoportadoColectado {
  readonly codigo: string;
  readonly rango: Rango;
}

export function recolectarNoSoportados(
  programa: NodoPrograma,
  tokensNoSoportados: readonly Token[],
): NoSoportadoColectado[] {
  const salida: NoSoportadoColectado[] = tokensNoSoportados.map((t) => ({
    codigo: t.codigo ?? 'no-soportado',
    rango: t.rango,
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
