// Tarea 1.35: ¿cómo lee javac un «(» en posición de expresión? Es `JavacParser.analyzeParens` (JDK 17.0.18, `jdk.compiler/com/sun/tools/javac/parser/JavacParser.java`) portado rama
// por rama, sin atajos: mira los tokens que siguen SIN consumirlos y decide si el paréntesis abre el tipo de una conversión —`(int) x`, `(String[]) args`, `(java.util.List<String>) x`,
// `(A & B) x`, `(@T C) x`—, una lambda o una agrupación. Antes de esta tarea solo se reconocían `(primitivo)` y `(Nombre)`, y javac compila casts a cualquier tipo: un arreglo, un
// genérico, un nombre con su paquete, una intersección.
//
// Lo que javac llama lambda (explícita o implícita) y lo que llama agrupación son aquí la misma respuesta, `otra`: el analizador de expresiones reconoce las lambdas antes de
// preguntar (`intentarAnalizarLambda`) y lo demás es una agrupación. Lo único que importa es cuándo es una CONVERSIÓN.
import type { Token } from '../lexico/tokens.ts';
import type { CursorDeTokens } from './cursor-de-tokens.ts';

export type LecturaDelParentesis = 'conversion' | 'otra';

const PALABRAS_DE_TIPO_PRIMITIVO_Y_VOID: ReadonlySet<string> = new Set(['byte', 'short', 'int', 'long', 'float', 'double', 'boolean', 'char', 'void']);

// Lo que, tras «(Nombre)», abre el operando de un cast: EXACTAMENTE la lista del `case RPAREN` de `analyzeParens` (verificada leyendo su fuente): `!`, `~`, `(`, `this`, `super`, un
// identificador, un literal (entero, largo, `float`, `double`, carácter, cadena —y el bloque de texto, que javac también lee como cadena—), `true`, `false`, `null`, `new`, `switch`,
// `assert`, `enum`, `_` y las palabras de tipo primitivo y `void`; NO `+`, `-`, `++` ni `--` (`(x) + 1` es una suma). Un literal que el visualizador no ejecuta (octal, hexadecimal,
// binario, `float`, bloque de texto, un escape que no decodifica) llega como un token «no soportado»: para javac es un literal más, así que también abre el operando del cast.
const PALABRAS_QUE_ABREN_EL_OPERANDO_DE_UN_CAST: ReadonlySet<string> = new Set([
  'true', 'false', 'null', 'new', 'this', 'super', 'switch', 'assert', 'enum', '_',
  ...PALABRAS_DE_TIPO_PRIMITIVO_Y_VOID,
]);

/** ¿`token`, el que sigue a «(Nombre)», hace de eso una conversión y no una agrupación? */
export function abreElOperandoDeUnaConversion(token: Token): boolean {
  switch (token.tipo) {
    case 'identificador':
    case 'entero':
    case 'largo':
    case 'doble':
    case 'caracter':
    case 'cadena':
    case 'no-soportado':
      return true;
    case 'palabra-clave':
      return PALABRAS_QUE_ABREN_EL_OPERANDO_DE_UN_CAST.has(token.texto);
    default:
      return token.texto === '(' || token.texto === '!' || token.texto === '~';
  }
}

/** `LAX_IDENTIFIER` de javac: un identificador o una de las tres palabras que se leen como uno para dar un mejor error (`_`, `assert`, `enum`). */
function esIdentificadorLaxo(token: Token): boolean {
  return token.tipo === 'identificador' || (token.tipo === 'palabra-clave' && (token.texto === '_' || token.texto === 'assert' || token.texto === 'enum'));
}

/** `skipAnnotation` de javac: el índice del último token de la anotación que empieza en la «@» de `desde` (`@A`, `@p.A`, `@A(1, (2))`). */
function saltarAnotacion(cursor: CursorDeTokens, desde: number): number {
  let i = desde + 1; // la «@»: sigue el nombre
  while (cursor.mirar(i + 1).texto === '.') i += 2;
  if (cursor.mirar(i + 1).texto !== '(') return i;
  i += 1;
  let anidamiento = 0;
  for (;; i += 1) {
    const token = cursor.mirar(i);
    if (token.tipo === 'eof') return i;
    if (token.texto === '(') anidamiento += 1;
    else if (token.texto === ')') {
      anidamiento -= 1;
      if (anidamiento === 0) return i;
    }
  }
}

/**
 * ¿El «(» que está en el cursor abre el tipo de una conversión (`'conversion'`) o es otra cosa (`'otra'`)? Solo mira, nunca consume. Es `analyzeParens` con el mismo orden de
 * ramas; cada una lleva el nombre de la suya en javac. Los tres puntos de una lambda con argumentos variables (`ELLIPSIS`) llegan del léxico como tres «.» seguidos.
 */
export function leerParentesis(cursor: CursorDeTokens): LecturaDelParentesis {
  let profundidad = 0;
  let marcaUnTipo = false; // `type` de javac: lo visto hasta ahora solo puede ser un tipo
  for (let i = 0; ; i += 1) {
    const token = cursor.mirar(i);
    const mas = (n: number): Token => cursor.mirar(i + n); // `peekToken(lookahead, …)`: el token n posiciones más adelante

    if (token.tipo === 'eof') return 'otra';

    // `case UNDERSCORE: case ASSERT: case ENUM: case IDENTIFIER`
    if (esIdentificadorLaxo(token)) {
      if (esIdentificadorLaxo(mas(1))) return 'otra'; // Identificador Identificador: lambda explícita
      if (mas(1).texto === ')' && mas(2).texto === '->') return 'otra'; // Identificador «)» «->»: lambda implícita (o agrupación sin lambdas)
      marcaUnTipo = false;
      continue;
    }

    if (token.tipo !== 'puntuacion' && token.tipo !== 'palabra-clave') return 'otra'; // un literal: la rama por omisión

    switch (token.texto) {
      case ',':
        marcaUnTipo = true;
        break;
      case 'extends':
      case 'super':
      case '&':
        break;
      case '.':
        if (mas(1).texto === '.' && mas(2).texto === '.') return 'otra'; // `...`: solo aparece en una lambda explícita
        break;
      case '?':
        if (mas(1).texto === 'extends' || mas(1).texto === 'super') marcaUnTipo = true; // un comodín con cota
        break;
      case 'byte':
      case 'short':
      case 'int':
      case 'long':
      case 'float':
      case 'double':
      case 'boolean':
      case 'char':
      case 'void':
        if (mas(1).texto === ')') return 'conversion'; // Tipo «)»
        if (esIdentificadorLaxo(mas(1))) return 'otra'; // Tipo Identificador: lambda explícita
        break;
      case '(':
        if (i !== 0) return 'otra'; // un «(» que no es el primero: agrupación
        if (mas(1).texto === ')') return 'otra'; // «( )»: lambda explícita
        break;
      case ')':
        if (marcaUnTipo) return 'conversion'; // lo visto solo podía ser un tipo
        return abreElOperandoDeUnaConversion(mas(1)) ? 'conversion' : 'otra'; // si no, decide lo que sigue
      case 'final':
        return 'otra'; // solo aparece en una lambda explícita
      case '@':
        marcaUnTipo = true;
        i = saltarAnotacion(cursor, i);
        break;
      case '[':
        if (mas(1).texto !== ']') return 'otra'; // un acceso a arreglo
        if (esIdentificadorLaxo(mas(2))) return 'otra'; // «[ ]» Identificador: lambda explícita
        if (mas(2).texto === ')' || mas(2).texto === '&') return 'conversion'; // «[ ] )» y «[ ] &»: un tipo de arreglo
        marcaUnTipo = true; // «[ ]» y algo más (otra dimensión): se consume el «]»
        i += 1;
        break;
      case '<':
        profundidad += 1;
        break;
      case '>>>':
      case '>>':
      case '>': {
        profundidad -= token.texto === '>>>' ? 3 : token.texto === '>>' ? 2 : 1;
        if (profundidad === 0) {
          if (mas(1).texto === ')' || mas(1).texto === '&') return 'conversion'; // «>» «)» y «>» «&»
          // Argumentos de tipo seguidos de un nombre y una coma, de un nombre y «) ->», o de «...»: una lambda explícita.
          if (esIdentificadorLaxo(mas(1)) && (mas(2).texto === ',' || (mas(2).texto === ')' && mas(3).texto === '->'))) return 'otra';
          if (mas(1).texto === '.' && mas(2).texto === '.' && mas(3).texto === '.') return 'otra';
          marcaUnTipo = true; // parece un tipo, y todavía puede ser un cast, una referencia a método o una lambda
        } else if (profundidad < 0) {
          return 'otra'; // «<» y «>» que no se corresponden: no es un tipo
        }
        break;
      }
      default:
        return 'otra';
    }
  }
}
