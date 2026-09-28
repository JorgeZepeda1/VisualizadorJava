// Analizador sintáctico: descenso recursivo a mano (ADR 003) — design.md §2.3. Nace en la
// rebanada vertical (0.12) con Programa→Clase→Main→Bloque→System.out.println(literal); la tarea
// 1.2 agregó import/package, las 3 formas de `main`, `return;` y declaraciones locales. La tarea
// 1.5 completa `Sentencia` (if/else/while/do-while/for/switch/break/continue/`;`/bloque anidado/
// sentencia de expresión general) y la 1.6 agrega el resto del catálogo NO-DISP sintáctico
// (REQ-SUB-007: otra clase, miembros propios, `throws`, arreglos, `var`, genéricos, `for` mejorado,
// etiquetas, `try/catch/throw`, `switch` con flecha/`yield`) delegado en su mayoría a
// `no-soportado.ts` (ADR 003: reconocedores que delimitan y dejan seguir, nunca abortan).
import type { Token } from '../lexico/tokens.ts';
import { PALABRAS_CLAVE_TIPO_PRIMITIVO } from '../lexico/tokens.ts';
import { CursorDeTokens } from './cursor-de-tokens.ts';
import { analizarExpresion } from './expresiones.ts';
import {
  CODIGOS_NO_SOPORTADO,
  PALABRAS_TIPO_PRIMITIVO_NO_SOPORTADO,
  analizarClausulaThrowsOpcional,
  consumirMiembroDeClase,
  consumirRestoDeSentenciaNoSoportada,
  consumirTipoDeNivelSuperior,
  pareceGenericoDesde,
  pareceOtroTipoDeNivelSuperior,
  saltarHastaCerrar,
} from './no-soportado.ts';
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';
import type {
  NodoBloque,
  NodoBreak,
  NodoClase,
  NodoContinue,
  NodoDeclaracionLocal,
  NodoDeclarador,
  NodoDoWhile,
  NodoElementoBloque,
  NodoElementoSwitch,
  NodoEtiquetaCase,
  NodoEtiquetaDefault,
  NodoExpresion,
  NodoFor,
  NodoIf,
  NodoImportacion,
  NodoImpresion,
  NodoMain,
  NodoNoSoportado,
  NodoPrograma,
  NodoRetorno,
  NodoSentencia,
  NodoSentenciaExpresion,
  NodoSwitch,
  NodoWhile,
} from './ast.ts';

const MODIFICADORES_CLASE: ReadonlySet<string> = new Set(['public']);
const MODIFICADORES_MAIN: ReadonlySet<string> = new Set(['public', 'static', 'final']);

// Formas de expresión válidas en posición de sentencia (design.md §2.3 "ExprSentencia = Asignacion
// | IncDec | Llamada | 'new' NombreDeTipo Argumentos"); cualquier otra cosa es el error real de
// javac "not a statement" (verificado). Se admite también 'expresion-no-soportada' para que una
// construcción NO-DISP usada como sentencia completa (p. ej. una lambda o un cast a tipo no
// soportado) produzca su propio aviso en vez de un confuso "not a statement" (C8).
const TIPOS_EXPRESION_SENTENCIA_VALIDOS: ReadonlySet<string> = new Set([
  'asignacion',
  'incremento-decremento',
  'llamada',
  'nueva-instancia',
  'expresion-no-soportada',
]);

export function analizarPrograma(tokens: readonly Token[]): NodoPrograma {
  const cursor = new CursorDeTokens(tokens);
  consumirPackageOpcional(cursor);
  const importacionesNoSoportadas: NodoNoSoportado[] = [];
  const importaciones = analizarImportaciones(cursor, importacionesNoSoportadas);
  const clase = analizarClase(cursor);

  const otrosTiposDeNivelSuperior: NodoNoSoportado[] = [];
  consumirPuntosYComasSueltos(cursor);
  while (pareceOtroTipoDeNivelSuperior(cursor)) {
    otrosTiposDeNivelSuperior.push(consumirTipoDeNivelSuperior(cursor));
    consumirPuntosYComasSueltos(cursor);
  }

  // err17 de exploracion/03: cualquier cosa que sobre aquí (no es otro tipo de nivel superior, no
  // es fin de archivo) es contenido sobrante tras la clase — típicamente una "}" de más. Verificado
  // contra javac 17 real (corpus/experimentos/texto/err17_llaves_desbalanceadas.java): "class,
  // interface, enum, or record expected", apuntando al propio token sobrante (a diferencia de
  // "fin de archivo inesperado", que ancla al final del token ANTERIOR — aquí SÍ hay un token real
  // que señalar, ya en la posición correcta sin necesitar `finDelTokenAnterior`).
  if (cursor.actual().tipo !== 'eof') {
    throw new ErrorDeCompilacion(
      'sobra código después de que la clase ya cerró',
      cursor.actual().rango,
      undefined,
      'llave-de-cierre-sobrante',
    );
  }
  const finToken = cursor.avanzar();
  return {
    tipo: 'programa',
    importaciones,
    importacionesNoSoportadas,
    clase,
    otrosTiposDeNivelSuperior,
    rango: { inicio: clase.rango.inicio, fin: finToken.rango.fin },
  };
}

function consumirPuntosYComasSueltos(cursor: CursorDeTokens): void {
  while (cursor.coincideTexto(';')) cursor.avanzar();
}

// REQ-SUB-001: "MUST ignorar una línea package ...; sin rechazarla" — no se guarda en el AST.
function consumirPackageOpcional(cursor: CursorDeTokens): void {
  if (!cursor.coincideTexto('package')) return;
  cursor.avanzar();
  analizarNombreCalificado(cursor);
  cursor.esperarTexto(';');
}

function analizarImportaciones(cursor: CursorDeTokens, noSoportadas: NodoNoSoportado[]): NodoImportacion[] {
  const importaciones: NodoImportacion[] = [];
  while (cursor.coincideTexto('import')) {
    // "import static" (REQ-SUB-007): fuera de alcance — se reconoce y se deja seguir (ADR 003) en
    // vez de tratarlo como un import normal (nunca "import static" silenciosamente reinterpretado
    // como "import").
    if (cursor.mirar(1).texto === 'static') {
      noSoportadas.push(analizarImportacionEstatica(cursor));
      continue;
    }
    importaciones.push(analizarImportacion(cursor));
  }
  return importaciones;
}

function analizarImportacionEstatica(cursor: CursorDeTokens): NodoNoSoportado {
  const inicioToken = cursor.esperarTexto('import');
  cursor.esperarTexto('static');
  return consumirRestoDeSentenciaNoSoportada(cursor, inicioToken.rango.inicio, CODIGOS_NO_SOPORTADO.importStatic);
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
  // struct07 de exploracion/03: "package" solo es válido como la PRIMERÍSIMA sentencia del
  // programa (consumirPackageOpcional, antes de cualquier import — design.md §2.3). Si llega uno
  // hasta aquí (donde ya se espera "class"), es SIEMPRE porque el alumno lo puso después de un
  // import. Verificado contra javac 17 real
  // (corpus/experimentos/texto/struct07_package_fuera_de_lugar.java): "class, interface, enum, or
  // record expected" en la línea del propio "package" — mismo mensaje crudo que err17 (llave
  // sobrante), pero un mensaje amable DISTINTO (el problema es el ORDEN, no una llave de más).
  if (cursor.coincideTexto('package')) {
    throw new ErrorDeCompilacion(
      'la línea "package" debe ir antes que cualquier "import"',
      cursor.actual().rango,
      undefined,
      'paquete-despues-de-import',
    );
  }
  consumirModificadores(cursor, MODIFICADORES_CLASE, 'class');
  cursor.esperarTexto('class');
  const nombre = cursor.esperarTipo('identificador');
  cursor.esperarTexto('{');

  let main: NodoMain | null = null;
  const otrosMiembros: NodoNoSoportado[] = [];
  while (!cursor.coincideTexto('}')) {
    if (cursor.coincideTexto(';')) {
      cursor.avanzar();
      continue;
    }
    if (main === null && pareceMain(cursor)) {
      main = analizarMain(cursor);
      continue;
    }
    otrosMiembros.push(consumirMiembroDeClase(cursor));
  }
  const cierre = cursor.esperarTexto('}');

  // Tarea 1.15 (REQ-COMP-008): "sin main" ya NO es un error de sintaxis -- javac compila esa clase
  // limpio (verificado, exploracion/03 §4.2); `main: null` sigue hasta `semantica/arranque.ts`
  // (pasada 5, ADR 004), que es quien de verdad lo rechaza, como error de ARRANQUE al ejecutar.
  return { tipo: 'clase', nombre: nombre.texto, main, otrosMiembros, rango: { inicio, fin: cierre.rango.fin } };
}

function pareceMain(cursor: CursorDeTokens): boolean {
  let i = 0;
  while (MODIFICADORES_MAIN.has(cursor.mirar(i).texto)) i += 1;
  return cursor.mirar(i).texto === 'void' && cursor.mirar(i + 1).texto === 'main';
}

function analizarMain(cursor: CursorDeTokens): NodoMain {
  const inicio = cursor.actual().rango.inicio;
  const modificadores = consumirModificadores(cursor, MODIFICADORES_MAIN, 'void');
  const esEstatico = modificadores.has('static');
  cursor.esperarTexto('void');
  cursor.esperarTexto('main');
  cursor.esperarTexto('(');
  const parametro = analizarParamMain(cursor);
  cursor.esperarTexto(')');
  const clausulaThrows = analizarClausulaThrowsOpcional(cursor);
  // err22 de exploracion/03: si falta la "{" de apertura del cuerpo, javac reporta "';' expected"
  // (el mismo "punto de inserción" que un punto y coma: el final del token anterior) y encadena
  // 3 errores más leyendo el resto como una declaración nueva — el catálogo recomienda mostrar
  // SOLO el primero (§4.1) y NUNCA con el texto de "falta punto y coma" (insertar ";" aquí no
  // arregla nada; lo que falta es abrir el cuerpo del método). Ancla verificada contra javac 17
  // real (corpus/experimentos/texto/err22_falta_llave_metodo.java): la línea de "args)", no la del
  // siguiente token real (que puede caer en otra línea, igual que err16).
  if (!cursor.coincideTexto('{')) {
    const fin = cursor.finDelTokenAnterior();
    throw new ErrorDeCompilacion(
      'falta abrir "{" para el cuerpo del método',
      { inicio: fin, fin },
      undefined,
      'llave-de-metodo-faltante',
    );
  }
  const cuerpo = analizarBloque(cursor);
  return {
    tipo: 'main',
    parametro,
    esEstatico,
    clausulaThrows,
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

// design.md §2.3: "Bloque = '{' { DeclLocal ';' | Sentencia } '}'". `NodoNoSoportado` puede salir
// de cualquiera de los dos caminos (una declaración con forma NO-DISP, o una sentencia NO-DISP).
function analizarElementoDeBloque(cursor: CursorDeTokens): NodoElementoBloque {
  if (pareceDeclaracionLocal(cursor)) {
    return analizarDeclaracionLocal(cursor);
  }
  return analizarSentencia(cursor);
}

// design.md §2.5.2 (declaración vs. expresión), restringido al subconjunto de "Tipo" ya soportado
// (primitivos + nombre por referencia: String, Scanner, Random…) MÁS las formas NO-DISP que la
// tarea 1.6 necesita reconocer para no confundirlas con una expresión (var, arreglo, genérico): un
// identificador seguido de OTRO identificador ⇒ declaración de tipo por referencia; "Tipo[]" ⇒
// arreglo; "Tipo<...>Id" ⇒ genérico (nunca ambiguo con una comparación real, ver pareceGenericoDesde).
function pareceDeclaracionLocal(cursor: CursorDeTokens): boolean {
  const token = cursor.actual();
  if (token.texto === 'final') return true;
  if (token.texto === 'var') return true;
  if (token.tipo === 'palabra-clave' && PALABRAS_CLAVE_TIPO_PRIMITIVO.has(token.texto)) return true;
  // float/byte/short (tarea 1.6): también son palabra-clave desde que se agregaron a PALABRAS_CLAVE
  // (para que "float f" no colara como "identificador identificador"), así que se comprueban aparte.
  if (token.tipo === 'palabra-clave' && PALABRAS_TIPO_PRIMITIVO_NO_SOPORTADO.has(token.texto)) return true;
  if (token.tipo === 'identificador' && cursor.mirar(1).tipo === 'identificador') return true;
  if (token.tipo === 'identificador' && cursor.mirar(1).texto === '[' && cursor.mirar(2).texto === ']') {
    return true;
  }
  if (token.tipo === 'identificador' && cursor.mirar(1).texto === '<' && pareceGenericoDesde(cursor, 1)) {
    return true;
  }
  return false;
}

function analizarDeclaracionLocal(cursor: CursorDeTokens): NodoDeclaracionLocal | NodoNoSoportado {
  const inicio = cursor.actual().rango.inicio;
  let esFinal = false;
  if (cursor.coincideTexto('final')) {
    cursor.avanzar();
    esFinal = true;
  }

  if (cursor.coincideTexto('var')) {
    return consumirRestoDeSentenciaNoSoportada(cursor, inicio, CODIGOS_NO_SOPORTADO.var);
  }

  const nombreTipoToken = cursor.avanzar();
  const nombreTipo = nombreTipoToken.texto;

  if (PALABRAS_TIPO_PRIMITIVO_NO_SOPORTADO.has(nombreTipo)) {
    return consumirRestoDeSentenciaNoSoportada(cursor, inicio, CODIGOS_NO_SOPORTADO.tipoPrimitivoNoSoportado);
  }

  if (nombreTipoToken.tipo === 'identificador' && cursor.coincideTexto('<') && pareceGenericoDesde(cursor, 0)) {
    return consumirRestoDeSentenciaNoSoportada(cursor, inicio, CODIGOS_NO_SOPORTADO.generico);
  }
  if (cursor.coincideTexto('[') && cursor.mirar(1).texto === ']') {
    return consumirRestoDeSentenciaNoSoportada(cursor, inicio, CODIGOS_NO_SOPORTADO.arreglo);
  }

  const declaradores = [analizarDeclarador(cursor)];
  while (cursor.coincideTexto(',')) {
    cursor.avanzar();
    declaradores.push(analizarDeclarador(cursor));
  }
  const fin = cursor.esperarTexto(';').rango.fin;

  // REQ-SUB-007: "final sin inicializador" es NO-DISP (nunca se ejecuta con un valor a medias).
  if (esFinal && declaradores.some((d) => d.inicializador === null)) {
    return { tipo: 'no-soportado', codigo: CODIGOS_NO_SOPORTADO.finalSinInicializador, rango: { inicio, fin } };
  }

  return { tipo: 'declaracion-local', esFinal, nombreTipo, declaradores, rango: { inicio, fin } };
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

// design.md §2.3 "Sentencia" completa (tarea 1.5) + reconocedores NO-DISP en posición de sentencia
// (tarea 1.6: etiquetas, try/catch/throw). El orden importa poco (cada rama empieza con un token
// distinguible), salvo que la sentencia de impresión (0.12, forma especial) se intenta ANTES que la
// sentencia de expresión general para no romper su AST ya probado desde el lote 0.
function analizarSentencia(cursor: CursorDeTokens): NodoSentencia {
  if (cursor.coincideTexto('{')) return analizarBloque(cursor);
  if (cursor.coincideTexto(';')) {
    const token = cursor.avanzar();
    return { tipo: 'sentencia-vacia', rango: token.rango };
  }
  if (cursor.coincideTexto('if')) return analizarIf(cursor);
  // err14 de exploracion/03: un "else" que NO sigue inmediatamente al "entonces"/"sino" de un "if"
  // (analizarIf ya lo consume ahí mismo) solo puede ser un "else" SUELTO. Verificado contra javac
  // 17 real (corpus/experimentos/texto/err14_else_sin_if.java): "'else' without 'if'", apuntando
  // al propio "else" — nunca al final del token anterior (a diferencia de "; esperado").
  if (cursor.coincideTexto('else')) {
    throw new ErrorDeCompilacion(
      '"else" no tiene un "if" al que pertenecer',
      cursor.actual().rango,
      undefined,
      'else-sin-if',
    );
  }
  if (cursor.coincideTexto('while')) return analizarWhile(cursor);
  if (cursor.coincideTexto('do')) return analizarDoWhile(cursor);
  if (cursor.coincideTexto('for')) return analizarFor(cursor);
  if (cursor.coincideTexto('switch')) return analizarSwitch(cursor);
  if (cursor.coincideTexto('break')) return analizarBreak(cursor);
  if (cursor.coincideTexto('continue')) return analizarContinue(cursor);
  if (cursor.coincideTexto('return')) return analizarRetorno(cursor);
  if (cursor.coincideTexto('try')) return analizarTry(cursor);
  if (cursor.coincideTexto('throw')) return analizarThrow(cursor);
  if (cursor.actual().tipo === 'identificador' && cursor.mirar(1).texto === ':') return analizarEtiqueta(cursor);
  if (esInicioDeImpresion(cursor)) return analizarImpresion(cursor);
  return analizarSentenciaExpresion(cursor);
}

function analizarIf(cursor: CursorDeTokens): NodoIf {
  const inicioToken = cursor.esperarTexto('if');
  cursor.esperarTexto('(');
  const condicion = analizarExpresion(cursor);
  cursor.esperarTexto(')');
  const entonces = analizarSentencia(cursor);
  let sino: NodoSentencia | null = null;
  let fin = entonces.rango.fin;
  if (cursor.coincideTexto('else')) {
    cursor.avanzar();
    sino = analizarSentencia(cursor);
    fin = sino.rango.fin;
  }
  return { tipo: 'if', condicion, entonces, sino, rango: { inicio: inicioToken.rango.inicio, fin } };
}

function analizarWhile(cursor: CursorDeTokens): NodoWhile {
  const inicioToken = cursor.esperarTexto('while');
  cursor.esperarTexto('(');
  const condicion = analizarExpresion(cursor);
  cursor.esperarTexto(')');
  const cuerpo = analizarSentencia(cursor);
  return { tipo: 'while', condicion, cuerpo, rango: { inicio: inicioToken.rango.inicio, fin: cuerpo.rango.fin } };
}

function analizarDoWhile(cursor: CursorDeTokens): NodoDoWhile {
  const inicioToken = cursor.esperarTexto('do');
  const cuerpo = analizarSentencia(cursor);
  cursor.esperarTexto('while');
  cursor.esperarTexto('(');
  const condicion = analizarExpresion(cursor);
  cursor.esperarTexto(')');
  const fin = cursor.esperarTexto(';').rango.fin;
  return { tipo: 'do-while', cuerpo, condicion, rango: { inicio: inicioToken.rango.inicio, fin } };
}

// design.md §2.3 "For": inicialización = UNA DeclLocal (con sus propios declaradores) O una lista
// de ExprSentencia separadas por coma; nunca ambas. Reusa `analizarDeclaracionLocal` tal cual: su
// propio ";" final es EXACTAMENTE el separador que el "for" necesita entre inicialización y
// condición.
function analizarFor(cursor: CursorDeTokens): NodoFor | NodoNoSoportado {
  const inicioToken = cursor.esperarTexto('for');
  cursor.esperarTexto('(');

  if (pareceForMejorado(cursor)) {
    saltarHastaCerrar(cursor, '(', ')');
    const cuerpo = analizarSentencia(cursor);
    return {
      tipo: 'no-soportado',
      codigo: CODIGOS_NO_SOPORTADO.forMejorado,
      rango: { inicio: inicioToken.rango.inicio, fin: cuerpo.rango.fin },
    };
  }

  let inicializacionDeclaracion: NodoDeclaracionLocal | null = null;
  let inicializacionExpresiones: NodoSentenciaExpresion[] = [];
  if (cursor.coincideTexto(';')) {
    cursor.avanzar();
  } else if (pareceDeclaracionLocal(cursor)) {
    const decl = analizarDeclaracionLocal(cursor); // ya consume su propio ";"
    if (decl.tipo === 'no-soportado') {
      saltarHastaCerrar(cursor, '(', ')');
      const cuerpo = analizarSentencia(cursor);
      return {
        tipo: 'no-soportado',
        codigo: decl.codigo,
        rango: { inicio: inicioToken.rango.inicio, fin: cuerpo.rango.fin },
      };
    }
    inicializacionDeclaracion = decl;
  } else {
    inicializacionExpresiones = analizarListaDeSentenciasExpresion(cursor);
    cursor.esperarTexto(';');
  }

  const condicion = cursor.coincideTexto(';') ? null : analizarExpresion(cursor);
  cursor.esperarTexto(';');

  const actualizacion = cursor.coincideTexto(')') ? [] : analizarListaDeSentenciasExpresion(cursor);
  cursor.esperarTexto(')');

  const cuerpo = analizarSentencia(cursor);
  return {
    tipo: 'for',
    inicializacionDeclaracion,
    inicializacionExpresiones,
    condicion,
    actualizacion,
    cuerpo,
    rango: { inicio: inicioToken.rango.inicio, fin: cuerpo.rango.fin },
  };
}

// "for (" ya consumido. "Tipo Id ':'" con Tipo de UN token (primitivo o nombre simple) cubre el
// caso real de currículo, "for (int x : arreglo)"; un tipo calificado o con arreglo no se detecta
// aquí (simplificación deliberada: rarísimo en este nivel) y cae al camino general, que producirá
// su propio error o aviso más abajo.
function pareceForMejorado(cursor: CursorDeTokens): boolean {
  const t0 = cursor.mirar(0);
  const t0EsTipo = (t0.tipo === 'palabra-clave' && PALABRAS_CLAVE_TIPO_PRIMITIVO.has(t0.texto)) || t0.tipo === 'identificador';
  return t0EsTipo && cursor.mirar(1).tipo === 'identificador' && cursor.mirar(2).texto === ':';
}

function analizarListaDeSentenciasExpresion(cursor: CursorDeTokens): NodoSentenciaExpresion[] {
  const lista = [envolverComoSentenciaExpresion(analizarExpresion(cursor))];
  while (cursor.coincideTexto(',')) {
    cursor.avanzar();
    lista.push(envolverComoSentenciaExpresion(analizarExpresion(cursor)));
  }
  return lista;
}

function analizarSwitch(cursor: CursorDeTokens): NodoSwitch {
  const inicioToken = cursor.esperarTexto('switch');
  cursor.esperarTexto('(');
  const selector = analizarExpresion(cursor);
  cursor.esperarTexto(')');
  cursor.esperarTexto('{');

  const elementos: NodoElementoSwitch[] = [];
  while (!cursor.coincideTexto('}')) {
    if (cursor.coincideTexto('case')) {
      elementos.push(analizarEtiquetaCase(cursor));
      continue;
    }
    if (cursor.coincideTexto('default')) {
      elementos.push(analizarEtiquetaDefault(cursor));
      continue;
    }
    if (cursor.coincideTexto('yield')) {
      const inicio = cursor.actual().rango.inicio;
      elementos.push(consumirRestoDeSentenciaNoSoportada(cursor, inicio, CODIGOS_NO_SOPORTADO.yield));
      continue;
    }
    elementos.push(analizarElementoDeBloque(cursor));
  }
  const cierre = cursor.esperarTexto('}');
  return { tipo: 'switch', selector, elementos, rango: { inicio: inicioToken.rango.inicio, fin: cierre.rango.fin } };
}

// "case Expr :" clásico (con caída, REQ-SUB-004) o "case Expr ->" (tarea 1.6, NO-DISP: switch de
// flecha, design.md §2.6, sin reinterpretar el programa).
function analizarEtiquetaCase(cursor: CursorDeTokens): NodoEtiquetaCase | NodoNoSoportado {
  const inicioToken = cursor.esperarTexto('case');
  const valor = analizarExpresion(cursor);
  if (cursor.coincideTexto('->')) {
    cursor.avanzar();
    const fin = consumirCuerpoDeFlecha(cursor);
    return { tipo: 'no-soportado', codigo: CODIGOS_NO_SOPORTADO.switchFlecha, rango: { inicio: inicioToken.rango.inicio, fin } };
  }
  const fin = cursor.esperarTexto(':').rango.fin;
  return { tipo: 'etiqueta-case', valor, rango: { inicio: inicioToken.rango.inicio, fin } };
}

function analizarEtiquetaDefault(cursor: CursorDeTokens): NodoEtiquetaDefault | NodoNoSoportado {
  const inicioToken = cursor.esperarTexto('default');
  if (cursor.coincideTexto('->')) {
    cursor.avanzar();
    const fin = consumirCuerpoDeFlecha(cursor);
    return { tipo: 'no-soportado', codigo: CODIGOS_NO_SOPORTADO.switchFlecha, rango: { inicio: inicioToken.rango.inicio, fin } };
  }
  const fin = cursor.esperarTexto(':').rango.fin;
  return { tipo: 'etiqueta-default', rango: { inicio: inicioToken.rango.inicio, fin } };
}

// El cuerpo de una rama "->" es un bloque "{ … }" o una expresión/"throw" terminada en ";" — se
// delimita sin interpretarlo (ADR 003), igual que el resto de este catálogo.
function consumirCuerpoDeFlecha(cursor: CursorDeTokens): number {
  if (cursor.coincideTexto('{')) {
    cursor.avanzar();
    return saltarHastaCerrar(cursor, '{', '}').rango.fin;
  }
  return consumirRestoDeSentenciaNoSoportada(cursor, cursor.actual().rango.inicio, CODIGOS_NO_SOPORTADO.switchFlecha).rango.fin;
}

function analizarBreak(cursor: CursorDeTokens): NodoBreak | NodoNoSoportado {
  const inicioToken = cursor.esperarTexto('break');
  if (cursor.actual().tipo === 'identificador') {
    cursor.avanzar();
    const fin = cursor.esperarTexto(';').rango.fin;
    return { tipo: 'no-soportado', codigo: CODIGOS_NO_SOPORTADO.breakConEtiqueta, rango: { inicio: inicioToken.rango.inicio, fin } };
  }
  const fin = cursor.esperarTexto(';').rango.fin;
  return { tipo: 'break', rango: { inicio: inicioToken.rango.inicio, fin } };
}

function analizarContinue(cursor: CursorDeTokens): NodoContinue | NodoNoSoportado {
  const inicioToken = cursor.esperarTexto('continue');
  if (cursor.actual().tipo === 'identificador') {
    cursor.avanzar();
    const fin = cursor.esperarTexto(';').rango.fin;
    return { tipo: 'no-soportado', codigo: CODIGOS_NO_SOPORTADO.continueConEtiqueta, rango: { inicio: inicioToken.rango.inicio, fin } };
  }
  const fin = cursor.esperarTexto(';').rango.fin;
  return { tipo: 'continue', rango: { inicio: inicioToken.rango.inicio, fin } };
}

function analizarRetorno(cursor: CursorDeTokens): NodoRetorno {
  const inicio = cursor.esperarTexto('return');
  const fin = cursor.esperarTexto(';');
  return { tipo: 'retorno', rango: { inicio: inicio.rango.inicio, fin: fin.rango.fin } };
}

// "try (recursos)? { … } (catch (…) { … })* (finally { … })?" — se delimita completo como UN solo
// aviso (tarea 1.6, REQ-SUB-007); el interior no se interpreta.
function analizarTry(cursor: CursorDeTokens): NodoNoSoportado {
  const inicioToken = cursor.esperarTexto('try');
  if (cursor.coincideTexto('(')) {
    cursor.avanzar();
    saltarHastaCerrar(cursor, '(', ')');
  }
  cursor.esperarTexto('{');
  let cierre = saltarHastaCerrar(cursor, '{', '}');
  while (cursor.coincideTexto('catch')) {
    cursor.avanzar();
    cursor.esperarTexto('(');
    saltarHastaCerrar(cursor, '(', ')');
    cursor.esperarTexto('{');
    cierre = saltarHastaCerrar(cursor, '{', '}');
  }
  if (cursor.coincideTexto('finally')) {
    cursor.avanzar();
    cursor.esperarTexto('{');
    cierre = saltarHastaCerrar(cursor, '{', '}');
  }
  return { tipo: 'no-soportado', codigo: CODIGOS_NO_SOPORTADO.tryCatch, rango: { inicio: inicioToken.rango.inicio, fin: cierre.rango.fin } };
}

function analizarThrow(cursor: CursorDeTokens): NodoNoSoportado {
  const inicioToken = cursor.esperarTexto('throw');
  return consumirRestoDeSentenciaNoSoportada(cursor, inicioToken.rango.inicio, CODIGOS_NO_SOPORTADO.throwSentencia);
}

// "Id ':' Sentencia" (tarea 1.6, REQ-SUB-007): la etiqueta en sí es NO-DISP, pero delimita su
// contenido reusando la gramática real de Sentencia (así un ciclo etiquetado sigue bien anidado).
function analizarEtiqueta(cursor: CursorDeTokens): NodoNoSoportado {
  const inicioToken = cursor.avanzar(); // identificador (la etiqueta)
  cursor.esperarTexto(':');
  const interior = analizarSentencia(cursor);
  return { tipo: 'no-soportado', codigo: CODIGOS_NO_SOPORTADO.etiqueta, rango: { inicio: inicioToken.rango.inicio, fin: interior.rango.fin } };
}

// Tarea 1.8 (pendiente heredado): "println" O "print" — antes solo "println". `System.err` queda
// fuera a propósito (ningún RED de 1.5/1.6/1.8 lo pide todavía; sigue cayendo en el camino
// genérico de `analizarSentenciaExpresion`, que hoy no ejecuta nada — mismo `throw` honesto que
// cualquier otra sentencia sin IR real, nunca un resultado inventado).
function esInicioDeImpresion(cursor: CursorDeTokens): boolean {
  const metodo = cursor.mirar(4).texto;
  return (
    cursor.coincideTexto('System') &&
    cursor.mirar(1).texto === '.' &&
    cursor.mirar(2).texto === 'out' &&
    cursor.mirar(3).texto === '.' &&
    (metodo === 'println' || metodo === 'print')
  );
}

function analizarImpresion(cursor: CursorDeTokens): NodoImpresion {
  const inicioToken = cursor.esperarTexto('System');
  cursor.esperarTexto('.');
  cursor.esperarTexto('out');
  cursor.esperarTexto('.');
  const metodo = cursor.coincideTexto('println') ? 'println' : 'print';
  cursor.esperarTexto(metodo);
  cursor.esperarTexto('(');
  // Tarea 1.8 (pendiente heredado): cualquier expresión, no solo un literal-cadena (0.12) — la
  // sobrecarga real la resuelve `semantica/sobrecargas.ts` sobre el tipo estático ya parseado.
  // Corrección obligatoria (sub-lote 1-C2): "println()" con paréntesis VACÍOS es Java real
  // (PrintStream.println() existe, verificado contra javac 17) — solo "println", nunca "print"
  // (print() sin argumentos NO existe en la API real, verificado contra javac 17: "no suitable
  // method found for print(no arguments)"), así que "print(" seguido de ")" sigue cayendo en
  // `analizarExpresion`, que lo rechaza igual que siempre.
  const argumento =
    metodo === 'println' && cursor.coincideTexto(')') ? null : analizarExpresion(cursor);
  cursor.esperarTexto(')');
  const fin = cursor.esperarTexto(';');
  return {
    tipo: 'impresion',
    metodo,
    argumento,
    rango: { inicio: inicioToken.rango.inicio, fin: fin.rango.fin },
  };
}

// design.md §2.3 "ExprSentencia" (tarea 1.5): cualquier expresión general usada como sentencia
// completa (asignación, incremento/decremento, llamada, "new Tipo(...)"), terminada en ";". Cubre
// REQ-SUB-004 ("sentencias de expresión") sin tocar el camino especial de `println` de arriba.
function analizarSentenciaExpresion(cursor: CursorDeTokens): NodoSentenciaExpresion {
  const expresion = analizarExpresion(cursor);
  const sentencia = envolverComoSentenciaExpresion(expresion);
  const fin = cursor.esperarTexto(';').rango.fin;
  return { ...sentencia, rango: { inicio: sentencia.rango.inicio, fin } };
}

function envolverComoSentenciaExpresion(expresion: NodoExpresion): NodoSentenciaExpresion {
  if (!TIPOS_EXPRESION_SENTENCIA_VALIDOS.has(expresion.tipo)) {
    throw new ErrorDeCompilacion(
      'esta expresión no es una sentencia válida (¿te faltó "=", "++"/"--", o es una llamada?)',
      expresion.rango,
    );
  }
  return { tipo: 'sentencia-expresion', expresion, rango: expresion.rango };
}

// Tarea 1.15 (REQ-COMP-007): devuelve los modificadores REALMENTE vistos (antes, `void` -- el
// llamador de `analizarClase` no necesita saber cuáles vio, pero `analizarMain` sí necesita saber
// si "static" estaba presente, para `NodoMain.esEstatico`).
function consumirModificadores(
  cursor: CursorDeTokens,
  permitidos: ReadonlySet<string>,
  hasta: string,
): ReadonlySet<string> {
  const vistos = new Set<string>();
  while (!cursor.coincideTexto(hasta) && permitidos.has(cursor.actual().texto)) {
    vistos.add(cursor.avanzar().texto);
  }
  return vistos;
}
