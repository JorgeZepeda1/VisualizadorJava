// La POSICIÓN que javac le da a un árbol de expresión (tarea 1.36, C-4a): `JCTree.pos`, el desplazamiento del que sale la LÍNEA de un error. Los límites del archivo de clase (`limit.string`:
// «constant string too long») no se anclan en el texto que se pasa, sino en el árbol que `Gen.genExpr` estaba generando cuando lo encontró, y la posición de un árbol no siempre es donde empieza:
//   - un literal, un nombre, una conversión `(T) x` y una expresión entre paréntesis: donde EMPIEZAN (el `(` en las dos últimas: `JCTypeCast` y `JCParens` se anclan ahí, y para un paréntesis
//     repetido, el más externo);
//   - una binaria: su OPERADOR (`JCBinary.pos`), así que `A\n + A\n + A` es la línea del último `+` y no la del primer operando;
//   - EXCEPCIÓN del analizador de javac (`JavacParser.foldStrings`, verificado con la fuente del JDK 17.0.18 y con javac real): al terminar de leer una expresión completa cuya raíz es un `+`,
//     si la cadena de sumas tiene dos o más literales de texto SEGUIDOS los junta en un solo literal, que empieza donde el primero, y vuelve a armar las sumas con la posición del INICIO de cada
//     operando derecho (`TreeInfo.getStartPos`), no la de su operador. Solo ocurre en la raíz de la expresión (un argumento, un inicializador, el lado derecho de una asignación, el contenido de un
//     paréntesis): una suma que es operando de otro operador (`t == "a" + "b"`) conserva la posición de su operador.
// Todo esto sale de la fuente de javac y se contrastó con él en programas de varias líneas (`corpus/experimentos/limites-del-archivo/ls-pos-*`); no es una suposición.
import type { NodoExpresion } from '../sintaxis/ast.ts';

/** El inicio de `expresion` para javac (`TreeInfo.getStartPos`): el de su primer operando para una binaria, el de su receptor para una llamada o un acceso; el `(` de un paréntesis; el de su operando para un `x++`. */
export function inicioDeJavac(expresion: NodoExpresion): number {
  if (expresion.parentesis !== undefined) return expresion.parentesis.inicio;
  switch (expresion.tipo) {
    case 'binaria':
      return inicioDeJavac(expresion.izquierda);
    case 'llamada':
      return inicioDeJavac(expresion.callee);
    case 'acceso-miembro':
      return inicioDeJavac(expresion.objeto);
    case 'asignacion':
      return inicioDeJavac(expresion.objetivo);
    case 'incremento-decremento':
      return expresion.posicion === 'postfijo' ? inicioDeJavac(expresion.operando) : expresion.rango.inicio;
    default:
      return expresion.rango.inicio;
  }
}

/**
 * La posición (`JCTree.pos`) de `expresion` para javac. `esRaizDeLaExpresion` dice si es la raíz de una expresión completa (lo que lee `term()` en el analizador de javac: un argumento, un
 * inicializador, el lado derecho de una asignación, una condición, el contenido de un paréntesis) —ahí rige el pliegue de literales de texto— o un operando de otro operador.
 */
export function posicionDeJavac(expresion: NodoExpresion, esRaizDeLaExpresion: boolean): number {
  if (expresion.parentesis !== undefined) return expresion.parentesis.inicio;
  if (expresion.tipo !== 'binaria') return expresion.rango.inicio;
  if (esRaizDeLaExpresion && expresion.operador === '+') {
    const trasElPliegue = posicionTrasPlegarLiterales(expresion);
    if (trasElPliegue !== null) return trasElPliegue;
  }
  return expresion.rangoDelOperador.inicio;
}

function esLiteralDeTexto(expresion: NodoExpresion): boolean {
  return expresion.tipo === 'literal-cadena' && expresion.parentesis === undefined;
}

/**
 * Lo que hace `JavacParser.foldStrings` con la cadena de `+` de `raiz` (sin paréntesis alrededor): junta cada tramo de dos o más literales de texto vecinos en uno, y si hubo algún pliegue, la raíz
 * resultante queda en el inicio de su ÚLTIMO operando (el literal juntado empieza donde el primero del tramo). `null` si no hubo pliegue: el árbol sigue como se leyó, con la posición de cada operador.
 */
function posicionTrasPlegarLiterales(raiz: NodoExpresion): number | null {
  // La columna izquierda de sumas SIN paréntesis, de izquierda a derecha: un operando con paréntesis es un `JCParens` para javac y no se abre.
  const operandos: NodoExpresion[] = [];
  let actual: NodoExpresion = raiz;
  while (actual.tipo === 'binaria' && actual.operador === '+' && (actual === raiz || actual.parentesis === undefined)) {
    operandos.unshift(actual.derecha);
    actual = actual.izquierda;
  }
  operandos.unshift(actual);

  const iniciosTrasElPliegue: number[] = [];
  let huboPliegue = false;
  let indice = 0;
  while (indice < operandos.length) {
    const operando = operandos[indice]!;
    if (!esLiteralDeTexto(operando)) {
      iniciosTrasElPliegue.push(inicioDeJavac(operando));
      indice += 1;
      continue;
    }
    let ultimoDelTramo = indice;
    while (ultimoDelTramo + 1 < operandos.length && esLiteralDeTexto(operandos[ultimoDelTramo + 1]!)) ultimoDelTramo += 1;
    if (ultimoDelTramo > indice) huboPliegue = true;
    iniciosTrasElPliegue.push(operando.rango.inicio); // un literal solo, o el juntado: empieza donde el primero
    indice = ultimoDelTramo + 1;
  }
  return huboPliegue ? iniciosTrasElPliegue[iniciosTrasElPliegue.length - 1]! : null;
}
