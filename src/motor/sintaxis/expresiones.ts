// Expresiones por precedencia (Pratt/descenso por precedencia, ADR 003) — design.md §2.4 (14
// niveles), §2.5 (ambigüedades: cast-vs-paréntesis, literales negativos en el borde). Lo NO-DISP
// (bits, desplazamientos, ternario, `instanceof`, `~`, acceso a arreglo, referencia a método,
// asignaciones compuestas de bits) se reconoce con la MISMA precedencia real — nunca se
// malinterpreta como error de sintaxis (C8) — y produce `NodoExpresionNoSoportada` en vez de
// abortar (ADR 003: "deja seguir").
//
// El léxico NO valida el rango de un literal entero/largo (design.md §2.5.3): aquí sí, porque
// depende de si el literal viene inmediatamente tras un "-" unario (JLS 3.10.1) — el único caso en
// que "2147483648"/"9223372036854775808L" son válidos (MIN_VALUE de int/long).
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';
import { PALABRAS_CLAVE_TIPO_PRIMITIVO, type Token } from '../lexico/tokens.ts';
import { CursorDeTokens } from './cursor-de-tokens.ts';
// Tarea 1.24: única fuente de verdad de códigos "no soportado" — antes este archivo emitía TODOS
// sus códigos como strings inline, nunca importados de ninguna tabla (engram
// visualizador-java/patron-codigos-inline-expresiones), lo que dejó pasar una discrepancia real:
// aquí se emitía 'lambda' mientras la tabla central decía 'lambda-no-soportada'.
import { CODIGOS_NO_SOPORTADO, PALABRAS_TIPO_PRIMITIVO_NO_SOPORTADO, saltarHastaCerrar } from './no-soportado.ts';
import type { NodoConversion, NodoExpresion, NodoExpresionNoSoportada, NodoNuevaInstancia } from './ast.ts';

const PRECEDENCIA: Readonly<Record<string, number>> = {
  '||': 3,
  '&&': 4,
  '|': 5,
  '^': 6,
  '&': 7,
  '==': 8,
  '!=': 8,
  '<': 9,
  '>': 9,
  '<=': 9,
  '>=': 9,
  instanceof: 9,
  '<<': 10,
  '>>': 10,
  '>>>': 10,
  '+': 11,
  '-': 11,
  '*': 12,
  '/': 12,
  '%': 12,
};

const OPERADORES_NO_SOPORTADOS_BINARIOS: ReadonlySet<string> = new Set(['|', '^', '&', '<<', '>>', '>>>']);

// Tarea 1.25: tipo ESTRECHO (los 4 códigos reales, no `CodigoNoSoportado` completo) — los 4 solo
// necesitan `datos: {}` (ninguno nombra el operador en su texto, `textos/es-MX/no-soportado.ts`),
// así que el sitio de construcción de abajo (`CODIGOS_OPERADOR_NO_SOPORTADO[operador]`) puede
// verificar `datos: {}` de verdad: con el tipo ANCHO anterior, TypeScript no podía distinguir este
// código de, por ejemplo, `arreglo-no-soportado` (que SÍ exige más datos) y el `{}` de abajo no
// habría compilado.
type CodigoOperadorNoSoportado =
  | 'operador-bits-or'
  | 'operador-bits-xor'
  | 'operador-bits-and'
  | 'operador-desplazamiento';

const CODIGOS_OPERADOR_NO_SOPORTADO: Readonly<Record<string, CodigoOperadorNoSoportado>> = {
  '|': CODIGOS_NO_SOPORTADO.operadorBitsOr,
  '^': CODIGOS_NO_SOPORTADO.operadorBitsXor,
  '&': CODIGOS_NO_SOPORTADO.operadorBitsAnd,
  '<<': CODIGOS_NO_SOPORTADO.operadorDesplazamiento,
  '>>': CODIGOS_NO_SOPORTADO.operadorDesplazamiento,
  '>>>': CODIGOS_NO_SOPORTADO.operadorDesplazamiento,
};

const OPERADORES_ASIGNACION_SOPORTADOS: ReadonlySet<string> = new Set(['=', '+=', '-=', '*=', '/=', '%=']);
const OPERADORES_ASIGNACION_NO_SOPORTADOS: ReadonlySet<string> = new Set([
  '&=', '|=', '^=', '<<=', '>>=', '>>>=',
]);

const MAGNITUD_MAXIMA_INT_POSITIVO = 2147483647n;
const MAGNITUD_MAXIMA_INT_UNARIA = 2147483648n; // 2^31: solo válido tras "-" unario (MIN_VALUE)
const MAGNITUD_MAXIMA_LARGO_POSITIVO = 9223372036854775807n;
const MAGNITUD_MAXIMA_LARGO_UNARIA = 9223372036854775808n; // 2^63: solo válido tras "-" unario

/** Punto de entrada: una expresión completa (nivel 1, asignación — design.md §2.4). */
export function analizarExpresion(cursor: CursorDeTokens): NodoExpresion {
  return analizarAsignacion(cursor);
}

function analizarAsignacion(cursor: CursorDeTokens): NodoExpresion {
  const izquierda = analizarTernario(cursor);
  const token = cursor.actual();

  if (OPERADORES_ASIGNACION_SOPORTADOS.has(token.texto)) {
    cursor.avanzar();
    const valor = analizarAsignacion(cursor);
    return {
      tipo: 'asignacion',
      operador: token.texto as '=' | '+=' | '-=' | '*=' | '/=' | '%=',
      objetivo: izquierda,
      valor,
      rango: { inicio: izquierda.rango.inicio, fin: valor.rango.fin },
    };
  }
  if (OPERADORES_ASIGNACION_NO_SOPORTADOS.has(token.texto)) {
    cursor.avanzar();
    const valor = analizarAsignacion(cursor);
    return {
      tipo: 'expresion-no-soportada',
      codigo: CODIGOS_NO_SOPORTADO.asignacionDeBits,
      datos: {},
      rango: { inicio: izquierda.rango.inicio, fin: valor.rango.fin },
    };
  }
  return izquierda;
}

// Nivel 2 (design.md §2.4): "? :" — SIEMPRE NO-DISP en este subconjunto; "->" (lambda) no se
// intenta parsear en absoluto (requeriría reconocer listas de parámetros, fuera de alcance).
function analizarTernario(cursor: CursorDeTokens): NodoExpresion {
  const condicion = analizarBinaria(cursor, 3);
  if (!cursor.coincideTexto('?')) return condicion;

  cursor.avanzar();
  analizarAsignacion(cursor); // rama "si verdadero" — se descarta, nunca se va a evaluar (NO-DISP)
  cursor.esperarTexto(':');
  const siFalso = analizarTernario(cursor);
  return {
    tipo: 'expresion-no-soportada',
    codigo: CODIGOS_NO_SOPORTADO.operadorTernario,
    datos: {},
    rango: { inicio: condicion.rango.inicio, fin: siFalso.rango.fin },
  };
}

// Niveles 3-12: climbing por precedencia, izquierda-asociativo (design.md §2.4). `instanceof` se
// resuelve aparte porque su lado derecho es un TIPO, no una expresión.
function analizarBinaria(cursor: CursorDeTokens, precedenciaMinima: number): NodoExpresion {
  let izquierda = analizarUnaria(cursor);

  for (;;) {
    const operador = cursor.actual().texto;
    const precedencia = PRECEDENCIA[operador];
    if (precedencia === undefined || precedencia < precedenciaMinima) break;
    cursor.avanzar();

    if (operador === 'instanceof') {
      const tipo = cursor.esperarTipo('identificador');
      izquierda = {
        tipo: 'expresion-no-soportada',
        codigo: CODIGOS_NO_SOPORTADO.instanceofNoSoportado,
        datos: {},
        rango: { inicio: izquierda.rango.inicio, fin: tipo.rango.fin },
      };
      continue;
    }

    const derecha = analizarBinaria(cursor, precedencia + 1);
    const rango = { inicio: izquierda.rango.inicio, fin: derecha.rango.fin };
    izquierda = OPERADORES_NO_SOPORTADOS_BINARIOS.has(operador)
      ? { tipo: 'expresion-no-soportada', codigo: CODIGOS_OPERADOR_NO_SOPORTADO[operador], datos: {}, rango }
      : { tipo: 'binaria', operador, izquierda, derecha, rango };
  }

  return izquierda;
}

// Nivel 13: prefijos (design.md §2.4, §2.5.1 cast-vs-paréntesis). Corrección obligatoria (sub-lote
// 1-B, tarea 1.6): "->" (lambdas) no se analizaba en absoluto — hoy produce su aviso NO-DISP en vez
// de dejar que el resto del análisis se confunda con lo que sigue (C8).
function analizarUnaria(cursor: CursorDeTokens): NodoExpresion {
  const lambda = intentarAnalizarLambda(cursor);
  if (lambda) return lambda;

  const token = cursor.actual();

  if (token.texto === '~') {
    cursor.avanzar();
    const operando = analizarUnaria(cursor);
    return {
      tipo: 'expresion-no-soportada',
      codigo: CODIGOS_NO_SOPORTADO.operadorComplementoBits,
      datos: {},
      rango: { inicio: token.rango.inicio, fin: operando.rango.fin },
    };
  }

  if (token.texto === '++' || token.texto === '--') {
    cursor.avanzar();
    const operando = analizarUnaria(cursor);
    return {
      tipo: 'incremento-decremento',
      operador: token.texto,
      posicion: 'prefijo',
      operando,
      rango: { inicio: token.rango.inicio, fin: operando.rango.fin },
    };
  }

  if (token.texto === '-' && esLiteralEnteroOLargo(cursor.mirar(1))) {
    return analizarLiteralNegativo(cursor);
  }

  if (token.texto === '+' || token.texto === '-' || token.texto === '!') {
    cursor.avanzar();
    const operando = analizarUnaria(cursor);
    return {
      tipo: 'unaria',
      operador: token.texto,
      operando,
      rango: { inicio: token.rango.inicio, fin: operando.rango.fin },
    };
  }

  const cast = intentarAnalizarCast(cursor);
  if (cast) return cast;

  return analizarPostfija(cursor);
}

function esLiteralEnteroOLargo(token: Token): boolean {
  return token.tipo === 'entero' || token.tipo === 'largo';
}

// Lambdas (tarea 1.6, REQ-SUB-007, corrección obligatoria del sub-lote 1-B): "identificador ->" (un
// solo parámetro sin paréntesis) o "(...) ->" (lista de parámetros, posiblemente vacía o con más de
// uno — el contenido de los paréntesis no se interpreta, solo se delimita). Nunca se confunde con
// un cast o una agrupación normal porque solo dispara si el "->" aparece de verdad después del
// paréntesis que cierra.
function intentarAnalizarLambda(cursor: CursorDeTokens): NodoExpresionNoSoportada | null {
  const token = cursor.actual();

  if (token.tipo === 'identificador' && cursor.mirar(1).texto === '->') {
    cursor.avanzar();
    cursor.avanzar();
    const fin = consumirCuerpoDeLambda(cursor);
    return {
      tipo: 'expresion-no-soportada',
      codigo: CODIGOS_NO_SOPORTADO.lambda,
      datos: {},
      rango: { inicio: token.rango.inicio, fin },
    };
  }

  if (token.texto === '(') {
    const desplazamientoCierre = buscarDesplazamientoDelParentesisQueCierra(cursor);
    if (desplazamientoCierre !== null && cursor.mirar(desplazamientoCierre + 1).texto === '->') {
      cursor.avanzar(); // '('
      saltarHastaCerrar(cursor, '(', ')');
      cursor.avanzar(); // '->'
      const fin = consumirCuerpoDeLambda(cursor);
      return {
        tipo: 'expresion-no-soportada',
        codigo: CODIGOS_NO_SOPORTADO.lambda,
        datos: {},
        rango: { inicio: token.rango.inicio, fin },
      };
    }
  }

  return null;
}

// Búsqueda SIN CONSUMIR (solo `mirar`) del desplazamiento del ")" que cierra el "(" en la posición
// actual (desplazamiento 0). Devuelve `null` si no cierra antes de EOF.
function buscarDesplazamientoDelParentesisQueCierra(cursor: CursorDeTokens): number | null {
  let profundidad = 0;
  for (let i = 0; i < 4096; i += 1) {
    const token = cursor.mirar(i);
    if (token.tipo === 'eof') return null;
    if (token.texto === '(') profundidad += 1;
    else if (token.texto === ')') {
      profundidad -= 1;
      if (profundidad === 0) return i;
    }
  }
  return null;
}

function consumirCuerpoDeLambda(cursor: CursorDeTokens): number {
  if (cursor.coincideTexto('{')) {
    cursor.avanzar();
    return saltarHastaCerrar(cursor, '{', '}').rango.fin;
  }
  return analizarAsignacion(cursor).rango.fin;
}

// JLS 3.10.1: "-2147483648" y "-9223372036854775808L" solo son literales válidos como operando
// DIRECTO de un "-" unario (tarea 1.4). Se pliegan aquí a un literal negativo (nunca a
// NodoUnaria{'-', literal}) — misma técnica para cualquier magnitud, así el caso límite sale
// gratis en vez de necesitar una rama aparte.
function analizarLiteralNegativo(cursor: CursorDeTokens): NodoExpresion {
  const menos = cursor.avanzar();
  const literal = cursor.avanzar();
  const rango = { inicio: menos.rango.inicio, fin: literal.rango.fin };
  const magnitud = literal.valorEntero ?? 0n;

  if (literal.tipo === 'largo') {
    if (magnitud > MAGNITUD_MAXIMA_LARGO_UNARIA) throw errorLiteralDemasiadoGrande(rango);
    return { tipo: 'literal-largo', valor: -magnitud, rango };
  }
  if (magnitud > MAGNITUD_MAXIMA_INT_UNARIA) throw errorLiteralDemasiadoGrande(rango);
  return { tipo: 'literal-entero', valor: -magnitud, rango };
}

function errorLiteralDemasiadoGrande(rango: { inicio: number; fin: number }): ErrorDeCompilacion {
  return new ErrorDeCompilacion('el número entero es demasiado grande', rango);
}

// design.md §2.5.1 (JLS 15.16): "(" tipo primitivo ")" es SIEMPRE cast; "(" Nombre ")" es cast
// solo si lo que sigue puede abrir una expresión unaria sin "+"/"-" — si no, es un paréntesis
// normal ("lo demás, expresión", §2.5.2) y se deja que analizarPostfija/analizarPrimaria lo trate.
//
// Tarea 1.29 (causa 3): "primitivo" incluye `byte`/`short`/`float` — tipos REALES de Java que el
// subconjunto no soporta (REQ-SUB-007: nunca se reinterpretan como `int`/`double`). Un cast a ellos
// es el MISMO aviso que su declaración (`tipo-primitivo-no-soportado`), con el rango del paréntesis
// de apertura al final del operando; antes no abría un cast y daba «se esperaba una expresión y se
// encontró "byte"» para un programa que javac compila. El operando se analiza igual (un cast sin
// operando sigue siendo un error de sintaxis real).
function intentarAnalizarCast(cursor: CursorDeTokens): NodoConversion | NodoExpresionNoSoportada | null {
  if (cursor.actual().texto !== '(') return null;

  const posibleTipo = cursor.mirar(1);
  const esPrimitivoNoSoportado =
    posibleTipo.tipo === 'palabra-clave' && PALABRAS_TIPO_PRIMITIVO_NO_SOPORTADO.has(posibleTipo.texto);
  const esPrimitivo =
    esPrimitivoNoSoportado || (posibleTipo.tipo === 'palabra-clave' && PALABRAS_CLAVE_TIPO_PRIMITIVO.has(posibleTipo.texto));
  const esIdentificador = posibleTipo.tipo === 'identificador';
  if (!esPrimitivo && !esIdentificador) return null;

  if (cursor.mirar(2).texto !== ')') return null;

  if (esIdentificador && !abreExpresionUnariaSinSigno(cursor.mirar(3))) {
    return null;
  }

  const inicio = cursor.actual().rango.inicio;
  cursor.avanzar(); // "("
  const tipo = cursor.avanzar(); // el nombre del tipo
  cursor.avanzar(); // ")"
  const operando = analizarUnaria(cursor);
  const rango = { inicio, fin: operando.rango.fin };
  if (esPrimitivoNoSoportado) {
    return { tipo: 'expresion-no-soportada', codigo: CODIGOS_NO_SOPORTADO.tipoPrimitivoNoSoportado, datos: {}, rango };
  }
  return { tipo: 'conversion', nombreTipo: tipo.texto, operando, rango };
}

function abreExpresionUnariaSinSigno(token: Token): boolean {
  if (
    token.tipo === 'identificador' ||
    token.tipo === 'entero' ||
    token.tipo === 'largo' ||
    token.tipo === 'doble' ||
    token.tipo === 'caracter' ||
    token.tipo === 'cadena'
  ) {
    return true;
  }
  if (
    token.tipo === 'palabra-clave' &&
    (token.texto === 'true' ||
      token.texto === 'false' ||
      token.texto === 'new' ||
      token.texto === 'this' ||
      token.texto === 'super' ||
      token.texto === 'null')
  ) {
    return true;
  }
  return token.texto === '(' || token.texto === '!' || token.texto === '~';
}

// Nivel 14: posfijos (design.md §2.4) — "." miembro y "(...)" llamada soportados; "[...]" (acceso
// a arreglo) y "::" (referencia a método) son NO-DISP, pero se consumen enteros para que el
// análisis siga en la posición correcta después (ADR 003).
function analizarPostfija(cursor: CursorDeTokens): NodoExpresion {
  let expresion = analizarPrimaria(cursor);

  for (;;) {
    const token = cursor.actual();

    if (token.texto === '.') {
      cursor.avanzar();
      const miembro = cursor.esperarTipo('identificador');
      expresion = {
        tipo: 'acceso-miembro',
        objeto: expresion,
        miembro: miembro.texto,
        rango: { inicio: expresion.rango.inicio, fin: miembro.rango.fin },
      };
      continue;
    }

    // Tarea NUEVA (sub-lote 1-D5, JLS 15.12, cierre de C7 -- mutante real
    // u5-switch-menu-calculadora.java#49): "MethodInvocation" SIEMPRE exige un Identifier justo
    // antes de "(" (`MethodName(...)` o `Primary.Identifier(...)`) -- NINGUNA forma de la JLS
    // admite un Primary arbitrario (un literal de cadena, el resultado de "(a-b)"...) directamente
    // seguido de "(...)". Antes de esta corrección, CUALQUIER expresión ya reducida podía "volverse"
    // el callee de una llamada, así que `"texto"(args)` se aceptaba como una llamada real. Cuando
    // `expresion` no es 'nombre' ni 'acceso-miembro', el "(" NUNCA se consume aquí -- se deja
    // intacto para el contexto que sigue (quien SÍ sabe qué esperaba, p. ej. el ")" de un println
    // envolvente) lo rechace con su propio error real, verificado contra javac 17 real: "')'
    // expected" (el mismo mensaje que da javac para este mutante exacto).
    if (token.texto === '(' && (expresion.tipo === 'nombre' || expresion.tipo === 'acceso-miembro')) {
      const argumentos = analizarArgumentos(cursor);
      const cierre = cursor.esperarTexto(')');
      expresion = {
        tipo: 'llamada',
        callee: expresion,
        argumentos,
        rango: { inicio: expresion.rango.inicio, fin: cierre.rango.fin },
      };
      continue;
    }

    if (token.texto === '++' || token.texto === '--') {
      cursor.avanzar();
      expresion = {
        tipo: 'incremento-decremento',
        operador: token.texto,
        posicion: 'postfijo',
        operando: expresion,
        rango: { inicio: expresion.rango.inicio, fin: token.rango.fin },
      };
      continue;
    }

    if (token.texto === '[') {
      cursor.avanzar();
      analizarExpresion(cursor); // el índice — se descarta, nunca se va a evaluar (NO-DISP)
      const cierre = cursor.esperarTexto(']');
      expresion = {
        tipo: 'expresion-no-soportada',
        codigo: CODIGOS_NO_SOPORTADO.accesoArreglo,
        datos: {},
        rango: { inicio: expresion.rango.inicio, fin: cierre.rango.fin },
      };
      continue;
    }

    if (token.texto === '::') {
      cursor.avanzar();
      const miembro = cursor.avanzar(); // nombre de método, o "new"
      expresion = {
        tipo: 'expresion-no-soportada',
        codigo: CODIGOS_NO_SOPORTADO.referenciaMetodo,
        datos: {},
        rango: { inicio: expresion.rango.inicio, fin: miembro.rango.fin },
      };
      continue;
    }

    break;
  }

  return expresion;
}

function analizarArgumentos(cursor: CursorDeTokens): NodoExpresion[] {
  cursor.esperarTexto('(');
  const argumentos: NodoExpresion[] = [];
  if (!cursor.coincideTexto(')')) {
    argumentos.push(analizarAsignacion(cursor));
    while (cursor.coincideTexto(',')) {
      cursor.avanzar();
      argumentos.push(analizarAsignacion(cursor));
    }
  }
  return argumentos;
}

function analizarPrimaria(cursor: CursorDeTokens): NodoExpresion {
  const token = cursor.actual();

  // Tarea NUEVA (sub-lote 1-D5, ADR 003 "deja seguir", cierre de C7 -- mutante real
  // u6-ciclos-anidados-tabla.java#52): un token LÉXICO no-soportado (literal hex/octal/binario/
  // float, `\uXXXX`...) es, para la GRAMÁTICA de expresiones, una primaria válida como cualquier
  // otra -- javac los reconoce y tokeniza igual (verificado: "3f" es un literal float REAL, JLS
  // 3.10.2). Antes de esta corrección, `analizarPrimaria` no tenía ninguna rama para
  // `tipo:'no-soportado'`, así que SIEMPRE caía en el `throw` genérico de abajo -- cortando el
  // análisis en seco en vez de "propagar" el aviso y dejar que el RESTO de la gramática (p. ej. el
  // ';' que un "for" exige después de su condición) se siga verificando de verdad, como ya pasa con
  // CUALQUIER otra construcción NO-DISP de este archivo (this/super/null/lambda/ternario/
  // instanceof/bits...). El código real de esta construcción específica viaja en `token.codigo`
  // (nunca un valor inventado aquí).
  if (token.tipo === 'no-soportado') {
    cursor.avanzar();
    // Tarea 1.25: `token.codigo`/`token.datos` YA se construyeron juntos y verificados contra
    // `DatosPorCodigoNoSoportado` en el léxico (`lexico/literales.ts`/`analizador-lexico.ts`, el
    // ÚNICO lugar donde un `Token` no-soportado se crea) — aquí solo se re-envuelve ese mismo par en
    // la forma de `NodoExpresionNoSoportada`. TypeScript no puede probar que la pareja sobrevive el
    // re-envoltorio porque `token.codigo`/`token.datos` llegan anchos (`CodigoNoSoportado`/
    // `Record<string, unknown>`, no el miembro específico que de verdad tienen en tiempo de
    // ejecución) — el `as` es seguro por construcción, no un escape general de tipos.
    const codigo = token.codigo ?? CODIGOS_NO_SOPORTADO.sinClasificar;
    const datos = token.datos ?? {};
    return { tipo: 'expresion-no-soportada', codigo, datos, rango: token.rango } as NodoExpresionNoSoportada;
  }

  if (token.tipo === 'entero' || token.tipo === 'largo') {
    cursor.avanzar();
    const limite = token.tipo === 'largo' ? MAGNITUD_MAXIMA_LARGO_POSITIVO : MAGNITUD_MAXIMA_INT_POSITIVO;
    const magnitud = token.valorEntero ?? 0n;
    if (magnitud > limite) throw errorLiteralDemasiadoGrande(token.rango);
    return token.tipo === 'largo'
      ? { tipo: 'literal-largo', valor: magnitud, rango: token.rango }
      : { tipo: 'literal-entero', valor: magnitud, rango: token.rango };
  }
  if (token.tipo === 'doble') {
    cursor.avanzar();
    return { tipo: 'literal-doble', valor: token.valorDoble ?? 0, rango: token.rango };
  }
  if (token.tipo === 'caracter') {
    cursor.avanzar();
    return { tipo: 'literal-caracter', valor: token.valorCaracter ?? '', rango: token.rango };
  }
  if (token.tipo === 'cadena') {
    cursor.avanzar();
    return { tipo: 'literal-cadena', valor: token.valor ?? '', rango: token.rango };
  }
  if (token.texto === 'true' || token.texto === 'false') {
    cursor.avanzar();
    return { tipo: 'literal-booleano', valor: token.texto === 'true', rango: token.rango };
  }
  // "this"/"super"/"null" (tarea 1.6, REQ-SUB-007, design.md §2.6): se interceptan por TEXTO antes
  // de caer en la rama genérica de identificador de abajo, para que nunca se traten como el nombre
  // de una variable común.
  if (token.texto === 'this' || token.texto === 'super') {
    cursor.avanzar();
    return { tipo: 'expresion-no-soportada', codigo: CODIGOS_NO_SOPORTADO.thisSuper, datos: {}, rango: token.rango };
  }
  if (token.texto === 'null') {
    cursor.avanzar();
    return { tipo: 'expresion-no-soportada', codigo: CODIGOS_NO_SOPORTADO.nullNoSoportado, datos: {}, rango: token.rango };
  }
  // Tarea 1.23 (agregada por el orquestador: hallazgo de la guarda de avisos, sub-lote 1-D6, JLS
  // 15.28, Java 14+): "switch" en posición de EXPRESIÓN (inicializador, argumento, operando
  // anidado...) es Java válido real (REQ-SUB-007, fila "switch flecha/expresión, yield") que este
  // analizador no reconocía -- `analizarSwitch` (analizador-sintactico.ts) solo lo espera como
  // inicio de SENTENCIA, así que antes de esta rama un "switch" aquí siempre caía en el `throw`
  // genérico de abajo (error de sintaxis engañoso para algo que javac sí compila, C8/regla 5 de
  // CLAUDE.md). Se delimita balanceado hasta su "}" que cierra, sin interpretar NADA de su interior
  // (selector, etiquetas "case"/"default"/flecha, "yield") -- igual patrón que ya usa este mismo
  // archivo para "new Tipo[]{...}" (arreglo-no-soportado) y "->" (lambda).
  if (token.texto === 'switch') {
    return analizarSwitchExpresionNoSoportado(cursor);
  }
  if (token.texto === 'new') {
    return analizarNuevaInstancia(cursor);
  }
  if (token.texto === '(') {
    cursor.avanzar();
    const interior = analizarExpresion(cursor);
    cursor.esperarTexto(')');
    return interior;
  }
  if (token.tipo === 'identificador') {
    cursor.avanzar();
    return { tipo: 'nombre', nombre: token.texto, rango: token.rango };
  }

  throw new ErrorDeCompilacion(
    `se esperaba una expresión y se encontró "${token.texto || '<fin de archivo>'}"`,
    token.rango,
  );
}

// "new Tipo(...)" (soportado, REQ-SUB-005) o "new Tipo[...]" / "new Tipo[]{...}" (arreglo, NO-DISP
// — tarea 1.6, REQ-SUB-007). El tipo puede ser un identificador (Scanner, Random…) o una palabra
// clave primitiva (el elemento de un arreglo, p. ej. "new int[5]").
function analizarNuevaInstancia(cursor: CursorDeTokens): NodoNuevaInstancia | NodoExpresionNoSoportada {
  const inicioToken = cursor.esperarTexto('new');
  const tipoToken = cursor.avanzar();
  // Tarea 1.29: el tipo puede llevar su paquete ("new java.util.Scanner(System.in)") — se guarda tal como
  // se escribió; qué es lo decide la atribución.
  let nombreTipo = tipoToken.texto;
  while (cursor.coincideTexto('.') && cursor.mirar(1).tipo === 'identificador') {
    cursor.avanzar();
    nombreTipo += `.${cursor.avanzar().texto}`;
  }

  if (cursor.coincideTexto('[')) {
    let fin = tipoToken.rango.fin;
    // Tarea 1.25 (mismo hallazgo que la forma de declaración "Tipo[] x;", analizador-sintactico.ts
    // — este sitio, "new Tipo[...]" en posición de EXPRESIÓN, es el ÚNICO que ninguna muestra de
    // `corpus/compilacion/avisos/` ejercita, ver expresiones.test.ts): cuenta las dimensiones reales
    // ("[5]", "[][]"…) para que `tipoArreglo` sea el tipo EXACTO que escribió el alumno, con tantos
    // "[]" como pares haya, nunca "int[]" fijo.
    let dimensiones = 0;
    while (cursor.coincideTexto('[')) {
      cursor.avanzar();
      dimensiones += 1;
      if (!cursor.coincideTexto(']')) analizarExpresion(cursor);
      fin = cursor.esperarTexto(']').rango.fin;
    }
    if (cursor.coincideTexto('{')) {
      cursor.avanzar();
      fin = saltarHastaCerrar(cursor, '{', '}').rango.fin;
    }
    return {
      tipo: 'expresion-no-soportada',
      codigo: CODIGOS_NO_SOPORTADO.arregloNuevo,
      datos: { tipoArreglo: `${nombreTipo}${'[]'.repeat(dimensiones)}` },
      rango: { inicio: inicioToken.rango.inicio, fin },
    };
  }

  const argumentos = analizarArgumentos(cursor);
  const cierre = cursor.esperarTexto(')');
  return {
    tipo: 'nueva-instancia',
    nombreTipo,
    argumentos,
    rango: { inicio: inicioToken.rango.inicio, fin: cierre.rango.fin },
  };
}

// "switch (Selector) { ... }" en posición de expresión (tarea 1.23, JLS 15.28). El selector se
// delimita balanceando SOLO "("/")" (nunca se interpreta como expresión real) para que un "{" que
// pudiera aparecer DENTRO de él (p. ej. un inicializador de arreglo anónimo en el selector, rarísimo
// pero sintácticamente legal) nunca se confunda con la apertura del cuerpo del switch. El cuerpo
// completo -- etiquetas "case"/"default" (clásicas o con flecha) y cualquier "yield", en bloque o
// no -- se delimita balanceando "{"/"}" sin interpretarlo (ADR 003 "deja seguir"): un "{" anidado de
// una rama "case X -> { ... }" incrementa la misma profundidad y no rompe el balanceo.
function analizarSwitchExpresionNoSoportado(cursor: CursorDeTokens): NodoExpresionNoSoportada {
  const inicioToken = cursor.esperarTexto('switch');
  cursor.esperarTexto('(');
  saltarHastaCerrar(cursor, '(', ')');
  cursor.esperarTexto('{');
  const cierre = saltarHastaCerrar(cursor, '{', '}');
  return {
    tipo: 'expresion-no-soportada',
    codigo: CODIGOS_NO_SOPORTADO.switchExpresion,
    datos: {},
    rango: { inicio: inicioToken.rango.inicio, fin: cierre.rango.fin },
  };
}
