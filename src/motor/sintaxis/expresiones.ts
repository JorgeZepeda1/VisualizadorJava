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
import {
  CODIGOS_NO_SOPORTADO,
  consumirAnotaciones,
  consumirArgumentosDeTipoOpcionales,
  consumirTipo,
  consumirTipoDescrito,
  esTipoPrimitivoNoSoportado,
  indiceTrasArgumentosDeTipo,
  pareceInicioDeTipo,
  saltarHastaCerrar,
  type TipoConsumido,
} from './no-soportado.ts';
import { leerParentesis } from './parentesis.ts';
import type { NodoConversion, NodoExpresion, NodoExpresionNoSoportada, NodoNuevaInstancia } from './ast.ts';

// Tarea 1.34: un `Map` y no un objeto plano. Se consulta con el TEXTO del token que sigue a un operando, y ese texto puede ser un identificador del
// alumno: en un objeto `{ '||': 3 }`, `PRECEDENCIA['constructor']` es la función `Object` heredada de `Object.prototype` y no `undefined`, así que
// `int a = 1 constructor 2;` se leía como una operación (javac: `';' expected`). Un `Map` solo conoce las claves que se le pusieron.
const PRECEDENCIA: ReadonlyMap<string, number> = new Map([
  ['||', 3],
  ['&&', 4],
  ['|', 5],
  ['^', 6],
  ['&', 7],
  ['==', 8],
  ['!=', 8],
  ['<', 9],
  ['>', 9],
  ['<=', 9],
  ['>=', 9],
  ['instanceof', 9],
  ['<<', 10],
  ['>>', 10],
  ['>>>', 10],
  ['+', 11],
  ['-', 11],
  ['*', 12],
  ['/', 12],
  ['%', 12],
]);

// Tarea 1.25: tipo ESTRECHO (los 4 códigos reales, no `CodigoNoSoportado` completo) — los 4 solo
// necesitan `datos: {}` (ninguno nombra el operador en su texto, `textos/es-MX/no-soportado.ts`),
// así que el sitio de construcción de abajo (`CODIGOS_OPERADOR_NO_SOPORTADO.get(operador)`) puede
// verificar `datos: {}` de verdad: con el tipo ANCHO anterior, TypeScript no podía distinguir este
// código de, por ejemplo, `arreglo-no-soportado` (que SÍ exige más datos) y el `{}` de abajo no
// habría compilado.
type CodigoOperadorNoSoportado =
  | 'operador-bits-or'
  | 'operador-bits-xor'
  | 'operador-bits-and'
  | 'operador-desplazamiento';

// Tarea 1.34: un `Map` (ver `PRECEDENCIA`); sus claves son EXACTAMENTE los operadores binarios que el subconjunto no ejecuta.
const CODIGOS_OPERADOR_NO_SOPORTADO: ReadonlyMap<string, CodigoOperadorNoSoportado> = new Map<string, CodigoOperadorNoSoportado>([
  ['|', CODIGOS_NO_SOPORTADO.operadorBitsOr],
  ['^', CODIGOS_NO_SOPORTADO.operadorBitsXor],
  ['&', CODIGOS_NO_SOPORTADO.operadorBitsAnd],
  ['<<', CODIGOS_NO_SOPORTADO.operadorDesplazamiento],
  ['>>', CODIGOS_NO_SOPORTADO.operadorDesplazamiento],
  ['>>>', CODIGOS_NO_SOPORTADO.operadorDesplazamiento],
]);

const OPERADORES_ASIGNACION_SOPORTADOS: ReadonlySet<string> = new Set(['=', '+=', '-=', '*=', '/=', '%=']);
const OPERADORES_ASIGNACION_NO_SOPORTADOS: ReadonlySet<string> = new Set([
  '&=', '|=', '^=', '<<=', '>>=', '>>>=',
]);

const MAGNITUD_MAXIMA_INT_POSITIVO = 2147483647n;
const MAGNITUD_MAXIMA_INT_UNARIA = 2147483648n; // 2^31: solo válido tras "-" unario (MIN_VALUE)
const MAGNITUD_MAXIMA_LARGO_POSITIVO = 9223372036854775807n;
const MAGNITUD_MAXIMA_LARGO_UNARIA = 9223372036854775808n; // 2^63: solo válido tras "-" unario

/** Punto de entrada: una expresión completa (nivel 1, asignación — design.md §2.4).
 *
 * Tarea 1.33 (N4): `sinLambda` es el `NOLAMBDA` de javac (`term(EXPR | NOLAMBDA)`), el modo en que se lee la expresión de una etiqueta `case`:
 * ahí `s ->` y `(1) ->` NO son lambdas, la flecha es la del `switch` (`case s -> …`). Baja por todo lo que forma PARTE de la expresión (operandos,
 * ramas del ternario, lado derecho de una asignación, paréntesis, cast) y se corta donde javac lo corta: los argumentos de una llamada se leen de
 * nuevo con lambdas permitidas (`arguments()` vuelve a `term(EXPR)`). El índice de un acceso a arreglo también las admite aquí, aunque javac ahí
 * conserva `NOLAMBDA`: una lambda dentro de un índice de una etiqueta `case` no existe en la práctica y la etiqueta no se interpreta. */
export function analizarExpresion(cursor: CursorDeTokens, sinLambda = false): NodoExpresion {
  return analizarAsignacion(cursor, sinLambda);
}

function analizarAsignacion(cursor: CursorDeTokens, sinLambda = false): NodoExpresion {
  const izquierda = analizarTernario(cursor, sinLambda);
  const token = cursor.actual();

  if (OPERADORES_ASIGNACION_SOPORTADOS.has(token.texto)) {
    cursor.avanzar();
    const valor = analizarAsignacion(cursor, sinLambda);
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
    const valor = analizarAsignacion(cursor, sinLambda);
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
function analizarTernario(cursor: CursorDeTokens, sinLambda = false): NodoExpresion {
  const condicion = analizarBinaria(cursor, 3, sinLambda);
  if (!cursor.coincideTexto('?')) return condicion;

  cursor.avanzar();
  analizarAsignacion(cursor, sinLambda); // rama "si verdadero" — se descarta, nunca se va a evaluar (NO-DISP)
  cursor.esperarTexto(':');
  const siFalso = analizarTernario(cursor, sinLambda);
  return {
    tipo: 'expresion-no-soportada',
    codigo: CODIGOS_NO_SOPORTADO.operadorTernario,
    datos: {},
    rango: { inicio: condicion.rango.inicio, fin: siFalso.rango.fin },
  };
}

// Niveles 3-12: climbing por precedencia, izquierda-asociativo (design.md §2.4). `instanceof` se
// resuelve aparte porque su lado derecho es un TIPO, no una expresión.
function analizarBinaria(cursor: CursorDeTokens, precedenciaMinima: number, sinLambda = false): NodoExpresion {
  let izquierda = analizarUnaria(cursor, sinLambda);

  for (;;) {
    const tokenDelOperador = cursor.actual();
    const operador = tokenDelOperador.texto;
    const precedencia = PRECEDENCIA.get(operador);
    if (precedencia === undefined || precedencia < precedenciaMinima) break;
    cursor.avanzar();

    if (operador === 'instanceof') {
      // Tarea 1.35 (JLS 15.20.2): el lado derecho es un TIPO completo (`java.lang.String`, `String[]`, `List<?>`) y, desde Java 16, puede terminar en una variable
      // (el patrón: `o instanceof final String s`). Todo es el mismo aviso; un `instanceof` sin tipo sigue siendo el error de sintaxis de siempre.
      if (cursor.coincideTexto('final')) cursor.avanzar();
      if (cursor.actual().tipo !== 'identificador') cursor.esperarTipo('identificador');
      let ultimo = consumirTipo(cursor);
      if (cursor.actual().tipo === 'identificador') ultimo = cursor.avanzar();
      izquierda = {
        tipo: 'expresion-no-soportada',
        codigo: CODIGOS_NO_SOPORTADO.instanceofNoSoportado,
        datos: {},
        rango: { inicio: izquierda.rango.inicio, fin: ultimo.rango.fin },
      };
      continue;
    }

    const derecha = analizarBinaria(cursor, precedencia + 1, sinLambda);
    const rango = { inicio: izquierda.rango.inicio, fin: derecha.rango.fin };
    const codigoNoSoportado = CODIGOS_OPERADOR_NO_SOPORTADO.get(operador);
    izquierda =
      codigoNoSoportado === undefined
        ? { tipo: 'binaria', operador, izquierda, derecha, rango, rangoDelOperador: tokenDelOperador.rango }
        : { tipo: 'expresion-no-soportada', codigo: codigoNoSoportado, datos: {}, rango };
  }

  return izquierda;
}

// Nivel 13: prefijos (design.md §2.4, §2.5.1 cast-vs-paréntesis). Corrección obligatoria (sub-lote
// 1-B, tarea 1.6): "->" (lambdas) no se analizaba en absoluto — hoy produce su aviso NO-DISP en vez
// de dejar que el resto del análisis se confunda con lo que sigue (C8).
function analizarUnaria(cursor: CursorDeTokens, sinLambda = false): NodoExpresion {
  const lambda = sinLambda ? null : intentarAnalizarLambda(cursor);
  if (lambda) return lambda;

  const token = cursor.actual();

  if (token.texto === '~') {
    cursor.avanzar();
    const operando = analizarUnaria(cursor, sinLambda);
    return {
      tipo: 'expresion-no-soportada',
      codigo: CODIGOS_NO_SOPORTADO.operadorComplementoBits,
      datos: {},
      rango: { inicio: token.rango.inicio, fin: operando.rango.fin },
    };
  }

  if (token.texto === '++' || token.texto === '--') {
    cursor.avanzar();
    const operando = analizarUnaria(cursor, sinLambda);
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
    const operando = analizarUnaria(cursor, sinLambda);
    return {
      tipo: 'unaria',
      operador: token.texto,
      operando,
      rango: { inicio: token.rango.inicio, fin: operando.rango.fin },
    };
  }

  const cast = intentarAnalizarCast(cursor, sinLambda);
  if (cast) return cast;

  return analizarPostfija(cursor, sinLambda);
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

// design.md §2.5.1 (JLS 15.16): «(» tipo «)» operando es una conversión. Tarea 1.35: la decisión de si un «(» abre el tipo de una conversión —o es una agrupación o una lambda— es la de
// javac (`JavacParser.analyzeParens`, portada entera en `parentesis.ts`); antes solo se reconocían `(primitivo)` y `(Nombre)`, y javac compila casts a cualquier tipo.
//
// Tarea 1.29 (causa 3): «primitivo» incluye `byte`/`short`/`float` — tipos REALES de Java que el subconjunto no soporta (REQ-SUB-007: nunca se reinterpretan como `int`/`double`). Un cast a
// ellos es el MISMO aviso que su declaración (`tipo-primitivo-no-soportado`), con el rango del paréntesis de apertura al final del operando. El operando se analiza igual (un cast sin
// operando sigue siendo un error de sintaxis real).
//
// Tarea 1.35: el tipo se DELIMITA, no se valida (REQ-SUB-007 acepta cualquiera como aviso), y el aviso es el de la forma que tiene: una anotación, una intersección (`A & B`), un arreglo
// (`String[]`) o un genérico (`List<String>`); un nombre con su paquete (`java.lang.String`) sigue siendo una conversión: la atribución decide si existe. El aviso cubre desde el «(»
// hasta el final del operando.
function intentarAnalizarCast(cursor: CursorDeTokens, sinLambda = false): NodoConversion | NodoExpresionNoSoportada | null {
  if (cursor.actual().texto !== '(') return null;
  if (leerParentesis(cursor) !== 'conversion') return null;

  const apertura = cursor.avanzar(); // "("
  const conAnotacion = consumirAnotaciones(cursor) !== null;
  const limites: TipoConsumido[] = [consumirTipoDeUnCast(cursor)];
  while (cursor.coincideTexto('&')) {
    cursor.avanzar();
    limites.push(consumirTipoDeUnCast(cursor));
  }
  cursor.esperarTexto(')');
  const operando = analizarUnaria(cursor, sinLambda);
  const rango = { inicio: apertura.rango.inicio, fin: operando.rango.fin };

  if (conAnotacion) return { tipo: 'expresion-no-soportada', codigo: CODIGOS_NO_SOPORTADO.anotacion, datos: {}, rango };
  if (limites.length > 1) {
    return { tipo: 'expresion-no-soportada', codigo: CODIGOS_NO_SOPORTADO.claseNoSoportada, datos: { nombre: limites.map((limite) => limite.texto).join(' & ') }, rango };
  }
  const tipo = limites[0]!;
  if (tipo.conDimensiones) return { tipo: 'expresion-no-soportada', codigo: CODIGOS_NO_SOPORTADO.arregloNuevo, datos: { tipoArreglo: tipo.texto }, rango };
  if (tipo.conArgumentosDeTipo) return { tipo: 'expresion-no-soportada', codigo: CODIGOS_NO_SOPORTADO.generico, datos: {}, rango };
  // Tarea 1.30: el aviso nombra el tipo CONCRETO del cast (`(byte) x` → `byte`), igual que en la declaración.
  if (esTipoPrimitivoNoSoportado(tipo.texto)) {
    return { tipo: 'expresion-no-soportada', codigo: CODIGOS_NO_SOPORTADO.tipoPrimitivoNoSoportado, datos: { tipo: tipo.texto }, rango };
  }
  return { tipo: 'conversion', nombreTipo: tipo.texto, operando, rango };
}

/** Un tipo del cast: un nombre (con paquete, argumentos de tipo y corchetes) o una palabra de tipo primitivo (con corchetes). Lo que no empieza un tipo es un error de sintaxis. */
function consumirTipoDeUnCast(cursor: CursorDeTokens): TipoConsumido {
  const primero = cursor.actual();
  if (!pareceInicioDeTipo(primero)) {
    throw new ErrorDeCompilacion(`se esperaba un tipo y se encontró "${primero.texto || '<fin de archivo>'}"`, primero.rango);
  }
  return consumirTipoDescrito(cursor);
}

// Nivel 14: posfijos (design.md §2.4) — "." miembro y "(...)" llamada soportados; "[...]" (acceso
// a arreglo) y "::" (referencia a método) son NO-DISP, pero se consumen enteros para que el
// análisis siga en la posición correcta después (ADR 003).
function analizarPostfija(cursor: CursorDeTokens, sinLambda = false): NodoExpresion {
  let expresion = analizarPrimaria(cursor, sinLambda);

  for (;;) {
    const token = cursor.actual();

    if (token.texto === '.') {
      cursor.avanzar();
      // Tarea 1.35 (JLS 15.8.2): `Nombre.class` es un literal de clase; solo un nombre (con su paquete) puede ser el receptor (`f().class` sigue siendo «<identifier> expected»).
      if (cursor.coincideTexto('class')) {
        const nombre = cadenaDeNombres(expresion);
        if (nombre !== null) {
          const clase = cursor.avanzar();
          expresion = {
            tipo: 'expresion-no-soportada',
            codigo: CODIGOS_NO_SOPORTADO.literalDeClase,
            datos: { literal: `${nombre}.class` },
            rango: { inicio: expresion.rango.inicio, fin: clase.rango.fin },
          };
          continue;
        }
      }
      // Tarea 1.35 (JLS 15.12): una llamada puede llevar argumentos de tipo explícitos entre el punto y el nombre (`P.<String>id("a")`): genéricos, fuera del subconjunto — el
      // aviso cubre la llamada entera y el análisis sigue tras su `)`.
      const argumentosDeTipo = consumirArgumentosDeTipoOpcionales(cursor);
      const miembro = cursor.esperarTipo('identificador');
      if (argumentosDeTipo !== null) {
        analizarArgumentos(cursor);
        const cierre = cursor.esperarTexto(')');
        expresion = {
          tipo: 'expresion-no-soportada',
          codigo: CODIGOS_NO_SOPORTADO.generico,
          datos: {},
          rango: { inicio: expresion.rango.inicio, fin: cierre.rango.fin },
        };
        continue;
      }
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
    // Tarea 1.34 (D): ni siquiera un nombre entre paréntesis (`(f)(1)`): la llamada es `Identifier(...)` o `Primary.Identifier(...)` (JLS 15.12), nunca un `( Expression )`.
    if (token.texto === '(' && expresion.parentesis === undefined && (expresion.tipo === 'nombre' || expresion.tipo === 'acceso-miembro')) {
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

    // Tarea 1.35 (JLS 15.8.2, 15.13): `Tipo[]` sin índice es un tipo de arreglo, y en una expresión solo puede ser el receptor de `.class` o de `::` (javac: `bracketsSuffix`).
    if (token.texto === '[' && cursor.mirar(1).texto === ']') {
      const nombre = cadenaDeNombres(expresion);
      if (nombre !== null) {
        let dimensiones = 0;
        let fin = expresion.rango.fin;
        while (cursor.coincideTexto('[') && cursor.mirar(1).texto === ']') {
          cursor.avanzar();
          fin = cursor.avanzar().rango.fin;
          dimensiones += 1;
        }
        if (cursor.coincideTexto('.') && cursor.mirar(1).texto === 'class') {
          cursor.avanzar();
          const clase = cursor.avanzar();
          expresion = {
            tipo: 'expresion-no-soportada',
            codigo: CODIGOS_NO_SOPORTADO.literalDeClase,
            datos: { literal: `${nombre}${'[]'.repeat(dimensiones)}.class` },
            rango: { inicio: expresion.rango.inicio, fin: clase.rango.fin },
          };
          continue;
        }
        if (!cursor.coincideTexto('::')) {
          throw new ErrorDeCompilacion(`se esperaba ".class" y se encontró "${cursor.actual().texto || '<fin de archivo>'}"`, cursor.actual().rango);
        }
        // Un receptor de referencia a método: el turno siguiente del lazo ve el «::» y arma el aviso con el miembro.
        expresion = { tipo: 'expresion-no-soportada', codigo: CODIGOS_NO_SOPORTADO.referenciaMetodo, datos: {}, rango: { inicio: expresion.rango.inicio, fin } };
        continue;
      }
    }

    // Tarea 1.35 (JLS 15.13; `JavacParser.isUnboundMemberRef`): `Tipo<Args>::miembro` —el receptor es un tipo con argumentos de tipo— es una referencia a método; un «<» que no cierra con un
    // «>» seguido de «.», «[» o «::» es una comparación, como siempre.
    if (token.texto === '<' && cadenaDeNombres(expresion) !== null) {
      const referencia = intentarAnalizarReceptorGenerico(cursor, expresion);
      if (referencia !== null) {
        expresion = referencia;
        continue;
      }
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

/**
 * Tarea 1.35: el receptor de una referencia a método que es un tipo con argumentos de tipo (`ArrayList<String>::new`, `List<?>::size`). Con el cursor en el «<» y `receptor` un nombre,
 * si los argumentos cierran y lo que sigue es un «.», un «[» o un «::» (la regla de `isUnboundMemberRef`), consume los argumentos, los miembros anidados (`.Entry<K, V>`) y las
 * dimensiones, y exige el «::» (javac: «illegal start of expression» si falta); devuelve un aviso de referencia que el sufijo `::` rehace con el miembro. `null`, sin consumir nada, si
 * no tiene esa forma (una comparación).
 */
function intentarAnalizarReceptorGenerico(cursor: CursorDeTokens, receptor: NodoExpresion): NodoExpresionNoSoportada | null {
  const trasLosArgumentos = indiceTrasArgumentosDeTipo(cursor, 0);
  if (trasLosArgumentos === null) return null;
  const siguiente = cursor.mirar(trasLosArgumentos).texto;
  if (siguiente !== '.' && siguiente !== '[' && siguiente !== '::') return null;
  let ultimo = consumirArgumentosDeTipoOpcionales(cursor)!;
  while (cursor.coincideTexto('.')) {
    cursor.avanzar();
    ultimo = cursor.esperarTipo('identificador');
    ultimo = consumirArgumentosDeTipoOpcionales(cursor) ?? ultimo;
  }
  while (cursor.coincideTexto('[') && cursor.mirar(1).texto === ']') {
    cursor.avanzar();
    ultimo = cursor.avanzar();
  }
  if (!cursor.coincideTexto('::')) {
    throw new ErrorDeCompilacion(`se esperaba "::" y se encontró "${cursor.actual().texto || '<fin de archivo>'}"`, cursor.actual().rango);
  }
  return { tipo: 'expresion-no-soportada', codigo: CODIGOS_NO_SOPORTADO.referenciaMetodo, datos: {}, rango: { inicio: receptor.rango.inicio, fin: ultimo.rango.fin } };
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

function analizarPrimaria(cursor: CursorDeTokens, sinLambda = false): NodoExpresion {
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
    const apertura = cursor.avanzar();
    const interior = analizarExpresion(cursor, sinLambda);
    const cierre = cursor.esperarTexto(')');
    // Tarea 1.34 (D): la expresión es la misma, con la marca de sus paréntesis más externos (los de adentro, si los había, se sustituyen: `((x))` marca los de
    // afuera, que es lo que javac señala). Ver `ConParentesis` en `ast.ts` para las tres reglas de Java que la leen.
    return { ...interior, parentesis: { inicio: apertura.rango.inicio, fin: cierre.rango.fin } };
  }
  if (token.tipo === 'identificador') {
    cursor.avanzar();
    return { tipo: 'nombre', nombre: token.texto, rango: token.rango };
  }
  // Tarea 1.35 (JLS 15.8.2, 15.13): una palabra de tipo primitivo (o `void`) en posición de expresión solo puede abrir un literal de clase (`int.class`, `int[].class`, `void.class`) o
  // una referencia a método (`int[]::new`): javac la lee con `bracketsSuffix`. Cualquier otra cosa (`int` solo, `int x`) sigue siendo «se esperaba una expresión».
  if (token.tipo === 'palabra-clave') {
    const tipoPrimitivo = intentarAnalizarTipoPrimitivoComoOperando(cursor);
    if (tipoPrimitivo !== null) return tipoPrimitivo;
  }

  throw new ErrorDeCompilacion(
    `se esperaba una expresión y se encontró "${token.texto || '<fin de archivo>'}"`,
    token.rango,
  );
}

/**
 * Tarea 1.35: `int.class`, `int[][].class`, `void.class` (aviso `literal-de-clase-no-soportado`) o `int[]::new` (el receptor de una referencia a método: se consume el tipo y se
 * devuelve un aviso de referencia que el sufijo `::` de `analizarPostfija` rehace con el miembro). `null`, sin consumir nada, si lo que sigue a la palabra no es ninguna de las dos.
 */
function intentarAnalizarTipoPrimitivoComoOperando(cursor: CursorDeTokens): NodoExpresionNoSoportada | null {
  const primero = cursor.actual();
  const esVoid = primero.texto === 'void';
  if (!esVoid && !PALABRAS_CLAVE_TIPO_PRIMITIVO.has(primero.texto) && !esTipoPrimitivoNoSoportado(primero.texto)) return null;
  let i = 1;
  while (!esVoid && cursor.mirar(i).texto === '[' && cursor.mirar(i + 1).texto === ']') i += 2; // `void` no admite dimensiones
  const esLiteralDeClase = cursor.mirar(i).texto === '.' && cursor.mirar(i + 1).texto === 'class';
  const esReferencia = !esVoid && cursor.mirar(i).texto === '::';
  if (!esLiteralDeClase && !esReferencia) return null;
  let literal = '';
  let ultimo = primero;
  for (let n = 0; n < (esLiteralDeClase ? i + 2 : i); n += 1) {
    ultimo = cursor.avanzar();
    literal += ultimo.texto;
  }
  const rango = { inicio: primero.rango.inicio, fin: ultimo.rango.fin };
  return esLiteralDeClase
    ? { tipo: 'expresion-no-soportada', codigo: CODIGOS_NO_SOPORTADO.literalDeClase, datos: { literal }, rango }
    : { tipo: 'expresion-no-soportada', codigo: CODIGOS_NO_SOPORTADO.referenciaMetodo, datos: {}, rango };
}

/** `a.b.C` para la cadena `acceso-miembro(acceso-miembro(a, b), C)` de nombres simples, o `null` si la expresión es otra cosa (una llamada, un literal, un paréntesis…): el único
 * receptor posible de `.class`, de `[]` y de `<…>::` (un tipo escrito con su paquete). */
function cadenaDeNombres(expresion: NodoExpresion): string | null {
  if (expresion.parentesis !== undefined) return null;
  if (expresion.tipo === 'nombre') return expresion.nombre;
  if (expresion.tipo !== 'acceso-miembro') return null;
  const receptor = cadenaDeNombres(expresion.objeto);
  return receptor === null ? null : `${receptor}.${expresion.miembro}`;
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

  // Tarea 1.35: `new ArrayList<String>()` y el rombo `new ArrayList<>()` llevan argumentos de tipo (JLS 15.9): fuera del subconjunto (`generico-no-soportado`,
  // como la declaración `ArrayList<String> l`), pero Java válido: antes daban «se esperaba "("».
  const argumentosDeTipo = consumirArgumentosDeTipoOpcionales(cursor);
  const argumentos = analizarArgumentos(cursor);
  const cierre = cursor.esperarTexto(')');
  // Tarea 1.35 (JLS 15.9.5): `new Tipo(...) { … }` es una clase ANÓNIMA — se delimita el cuerpo entero sin interpretarlo (el análisis sigue tras su «}», ADR 003).
  // Aunque la clase base sea una soportada, el cuerpo es código propio que no se revisa: el aviso es el de la clase anónima.
  if (cursor.coincideTexto('{')) {
    cursor.avanzar();
    const finDelCuerpo = saltarHastaCerrar(cursor, '{', '}').rango.fin;
    return {
      tipo: 'expresion-no-soportada',
      codigo: CODIGOS_NO_SOPORTADO.claseAnonima,
      datos: {},
      rango: { inicio: inicioToken.rango.inicio, fin: finDelCuerpo },
    };
  }
  if (argumentosDeTipo !== null) {
    return {
      tipo: 'expresion-no-soportada',
      codigo: CODIGOS_NO_SOPORTADO.generico,
      datos: {},
      rango: { inicio: inicioToken.rango.inicio, fin: cierre.rango.fin },
    };
  }
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
