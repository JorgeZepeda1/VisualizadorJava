// Analizador sintáctico: descenso recursivo a mano (ADR 003) — design.md §2.3. Nace en la
// rebanada vertical (0.12) con Programa→Clase→Main→Bloque→System.out.println(literal); la tarea
// 1.2 agrega el resto del "núcleo del programa": import/package (REQ-SUB-001), las 3 formas de
// `main`, `return;` y declaraciones locales (DeclLocal, con su inicializador vía `expresiones.ts`,
// tarea 1.3). El resto de Sentencia (if/while/for/switch/ExprSentencia general/break/continue) y
// el reconocimiento NO-DISP sintáctico llegan en la tarea 1.5/1.6 — fuera de este subconjunto
// todavía se lanza `ErrorDeCompilacion` con su rango en vez de fingir un análisis exitoso.
import type { Token } from '../lexico/tokens.ts';
import { PALABRAS_CLAVE_TIPO_PRIMITIVO } from '../lexico/tokens.ts';
import { CursorDeTokens } from './cursor-de-tokens.ts';
import { analizarExpresion } from './expresiones.ts';
import type {
  NodoBloque,
  NodoClase,
  NodoDeclaracionLocal,
  NodoDeclarador,
  NodoElementoBloque,
  NodoExpresion,
  NodoImportacion,
  NodoImpresion,
  NodoLiteralCadena,
  NodoMain,
  NodoPrograma,
  NodoRetorno,
  NodoSentencia,
} from './ast.ts';

const MODIFICADORES_CLASE: ReadonlySet<string> = new Set(['public']);
const MODIFICADORES_MAIN: ReadonlySet<string> = new Set(['public', 'static', 'final']);

export function analizarPrograma(tokens: readonly Token[]): NodoPrograma {
  const cursor = new CursorDeTokens(tokens);
  consumirPackageOpcional(cursor);
  const importaciones = analizarImportaciones(cursor);
  const clase = analizarClase(cursor);
  const finToken = cursor.esperarTipo('eof');
  return {
    tipo: 'programa',
    importaciones,
    clase,
    rango: { inicio: clase.rango.inicio, fin: finToken.rango.fin },
  };
}

// REQ-SUB-001: "MUST ignorar una línea package ...; sin rechazarla" — no se guarda en el AST.
function consumirPackageOpcional(cursor: CursorDeTokens): void {
  if (!cursor.coincideTexto('package')) return;
  cursor.avanzar();
  analizarNombreCalificado(cursor);
  cursor.esperarTexto(';');
}

function analizarImportaciones(cursor: CursorDeTokens): NodoImportacion[] {
  const importaciones: NodoImportacion[] = [];
  while (cursor.coincideTexto('import')) {
    importaciones.push(analizarImportacion(cursor));
  }
  return importaciones;
}

function analizarImportacion(cursor: CursorDeTokens): NodoImportacion {
  const inicioToken = cursor.esperarTexto('import');
  const nombre = analizarNombreCalificado(cursor);
  let comodin = false;
  if (cursor.coincideTexto('.')) {
    cursor.esperarTexto('.');
    cursor.esperarTexto('*');
    comodin = true;
  }
  const fin = cursor.esperarTexto(';');
  return {
    tipo: 'importacion',
    nombre,
    comodin,
    rango: { inicio: inicioToken.rango.inicio, fin: fin.rango.fin },
  };
}

// "Id ('.' Id)*" — se detiene ANTES de un "." final que no siga un identificador (p. ej. el ".*"
// de un import con comodín, que su llamador maneja aparte).
function analizarNombreCalificado(cursor: CursorDeTokens): string {
  let nombre = cursor.esperarTipo('identificador').texto;
  while (cursor.coincideTexto('.') && cursor.mirar(1).tipo === 'identificador') {
    cursor.avanzar();
    nombre += `.${cursor.esperarTipo('identificador').texto}`;
  }
  return nombre;
}

function analizarClase(cursor: CursorDeTokens): NodoClase {
  const inicio = cursor.actual().rango.inicio;
  consumirModificadores(cursor, MODIFICADORES_CLASE, 'class');
  cursor.esperarTexto('class');
  const nombre = cursor.esperarTipo('identificador');
  cursor.esperarTexto('{');
  const main = analizarMain(cursor);
  const cierre = cursor.esperarTexto('}');
  return { tipo: 'clase', nombre: nombre.texto, main, rango: { inicio, fin: cierre.rango.fin } };
}

function analizarMain(cursor: CursorDeTokens): NodoMain {
  const inicio = cursor.actual().rango.inicio;
  consumirModificadores(cursor, MODIFICADORES_MAIN, 'void');
  cursor.esperarTexto('void');
  cursor.esperarTexto('main');
  cursor.esperarTexto('(');
  const parametro = analizarParamMain(cursor);
  cursor.esperarTexto(')');
  const cuerpo = analizarBloque(cursor);
  return {
    tipo: 'main',
    parametro,
    cuerpo,
    rango: { inicio, fin: cuerpo.rango.fin },
  };
}

// design.md §2.3 "ParamMain": las 3 formas de Java, todas equivalentes (REQ-SUB-001). Función
// propia y reusada (REFACTOR de la tarea 1.2) para que la tarea 1.15 (arranque) no la reescriba.
function analizarParamMain(cursor: CursorDeTokens): string {
  if (cursor.coincideTexto('final')) cursor.avanzar();
  cursor.esperarTexto('String');

  if (cursor.coincideTexto('[')) {
    // String[] args
    cursor.esperarTexto('[');
    cursor.esperarTexto(']');
    return cursor.esperarTipo('identificador').texto;
  }
  if (cursor.coincideTexto('.')) {
    // String... args — el lexer no tiene un token "...": son tres "." seguidos (PUNTUACION).
    cursor.esperarTexto('.');
    cursor.esperarTexto('.');
    cursor.esperarTexto('.');
    return cursor.esperarTipo('identificador').texto;
  }
  // String args[]
  const nombre = cursor.esperarTipo('identificador').texto;
  cursor.esperarTexto('[');
  cursor.esperarTexto(']');
  return nombre;
}

function analizarBloque(cursor: CursorDeTokens): NodoBloque {
  const apertura = cursor.esperarTexto('{');
  const elementos: NodoElementoBloque[] = [];
  while (!cursor.coincideTexto('}')) {
    elementos.push(analizarElementoDeBloque(cursor));
  }
  const cierre = cursor.esperarTexto('}');
  return {
    tipo: 'bloque',
    elementos,
    rango: { inicio: apertura.rango.inicio, fin: cierre.rango.fin },
  };
}

// design.md §2.3: "Bloque = '{' { DeclLocal ';' | Sentencia } '}'". El resto de Sentencia
// (if/while/for/switch/ExprSentencia general/break/continue) llega en la tarea 1.5 — aquí, lo que
// ya tiene dueño: impresion (0.12), DeclLocal y "return;" (1.2).
function analizarElementoDeBloque(cursor: CursorDeTokens): NodoElementoBloque {
  if (pareceDeclaracionLocal(cursor)) {
    return analizarDeclaracionLocal(cursor);
  }
  return analizarSentencia(cursor);
}

// design.md §2.5.2 (declaración vs. expresión), restringido al subconjunto de "Tipo" ya soportado
// (primitivos + nombre por referencia: String, Scanner, Random…): primitivo o "final" ⇒
// declaración; un identificador seguido de OTRO identificador ⇒ declaración de tipo por
// referencia (nunca ambiguo: ninguna expresión válida de Java empieza con dos identificadores
// seguidos). El resto de la regla general (arreglos, genéricos, "var", etiquetas) llega con las
// construcciones NO-DISP que la necesitan (tarea 1.6).
function pareceDeclaracionLocal(cursor: CursorDeTokens): boolean {
  const token = cursor.actual();
  if (token.texto === 'final') return true;
  if (token.tipo === 'palabra-clave' && PALABRAS_CLAVE_TIPO_PRIMITIVO.has(token.texto)) return true;
  return token.tipo === 'identificador' && cursor.mirar(1).tipo === 'identificador';
}

function analizarDeclaracionLocal(cursor: CursorDeTokens): NodoDeclaracionLocal {
  const inicio = cursor.actual().rango.inicio;
  let esFinal = false;
  if (cursor.coincideTexto('final')) {
    cursor.avanzar();
    esFinal = true;
  }
  const nombreTipo = cursor.avanzar().texto;
  const declaradores = [analizarDeclarador(cursor)];
  while (cursor.coincideTexto(',')) {
    cursor.avanzar();
    declaradores.push(analizarDeclarador(cursor));
  }
  const fin = cursor.esperarTexto(';');
  return {
    tipo: 'declaracion-local',
    esFinal,
    nombreTipo,
    declaradores,
    rango: { inicio, fin: fin.rango.fin },
  };
}

function analizarDeclarador(cursor: CursorDeTokens): NodoDeclarador {
  const nombre = cursor.esperarTipo('identificador');
  let inicializador: NodoExpresion | null = null;
  let fin = nombre.rango.fin;
  if (cursor.coincideTexto('=')) {
    cursor.avanzar();
    inicializador = analizarExpresion(cursor);
    fin = inicializador.rango.fin;
  }
  return { tipo: 'declarador', nombre: nombre.texto, inicializador, rango: { inicio: nombre.rango.inicio, fin } };
}

function analizarSentencia(cursor: CursorDeTokens): NodoSentencia {
  if (cursor.coincideTexto('return')) {
    return analizarRetorno(cursor);
  }
  // El resto de Sentencia (if/while/for/switch/ExprSentencia general/break/continue) llega en la
  // tarea 1.5; por ahora la única otra forma reconocida es println (0.12).
  return analizarImpresion(cursor);
}

function analizarRetorno(cursor: CursorDeTokens): NodoRetorno {
  const inicio = cursor.esperarTexto('return');
  const fin = cursor.esperarTexto(';');
  return { tipo: 'retorno', rango: { inicio: inicio.rango.inicio, fin: fin.rango.fin } };
}

function analizarImpresion(cursor: CursorDeTokens): NodoImpresion {
  const inicioToken = cursor.esperarTexto('System');
  cursor.esperarTexto('.');
  cursor.esperarTexto('out');
  cursor.esperarTexto('.');
  cursor.esperarTexto('println');
  cursor.esperarTexto('(');
  const argumento = analizarLiteralCadena(cursor);
  cursor.esperarTexto(')');
  const fin = cursor.esperarTexto(';');
  return {
    tipo: 'impresion',
    argumento,
    rango: { inicio: inicioToken.rango.inicio, fin: fin.rango.fin },
  };
}

function analizarLiteralCadena(cursor: CursorDeTokens): NodoLiteralCadena {
  const token = cursor.esperarTipo('cadena');
  return { tipo: 'literal-cadena', valor: token.valor ?? '', rango: token.rango };
}

function consumirModificadores(
  cursor: CursorDeTokens,
  permitidos: ReadonlySet<string>,
  hasta: string,
): void {
  while (!cursor.coincideTexto(hasta) && permitidos.has(cursor.actual().texto)) {
    cursor.avanzar();
  }
}
