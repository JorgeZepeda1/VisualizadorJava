// Límites del archivo de clase (tarea 1.36, C-4a de la verificación final del lote 1) — pasada 5 de ADR 004: léxico+sintaxis → atribución → alcanzabilidad → asignación definitiva → **límites del archivo** →
// arranque. javac revisa estos límites al GENERAR la clase, cuando ya no queda ningún error de Attr ni de Flow, y los dos que un programa de clase puede alcanzar son de las constantes de texto. Verificado
// con la fuente del JDK 17.0.18 (`Gen.java`, `StringConcat.java`, `Lower.java`, `PoolWriter.java`) y contra javac real, al byte (los casos, con sus goldens, están en
// `corpus/experimentos/limites-del-archivo/`):
//
//   - `limit.string` («constant string too long», `Gen.checkStringConstant`): una constante de texto de 65 535 CARACTERES (unidades UTF-16) o más que `Gen` GENERA. Se ancla en el árbol que `genExpr`
//     estaba generando (`posiciones-de-javac.ts`). Pasa con los textos que se generan como constante: un inicializador, el argumento de una llamada o de `println`, el lado derecho de una asignación, un
//     operando de una comparación, un receptor, una etiqueta de `switch` sobre texto (se ancla en el `switch`) y la declaración de una `final` constante.
//   - `limit.string.overflow` (`ClassWriter`, «UTF8 representation … is too long for the constant pool»): una entrada `CONSTANT_Utf8` de más de 65 535 BYTES en UTF-8 modificado (`\0` y U+0080…U+07FF
//     son 2 bytes, el resto 3, y un par de sustitutos son 2 × 3 = 6). Se ancla en la palabra `class`. Entran al archivo las constantes que se generan (`ldc`), las etiquetas de un `switch` sobre texto y la
//     RECETA de cada concatenación que no es constante (`invokedynamic`): sus constantes, más 1 byte (`\u0001`) por operando dinámico; una constante que trae un `\u0001` o `\u0002` va aparte (1 byte en la
//     receta y su propia entrada). Una receta se parte cada 200 ranuras de operandos (`StringConcat.split`: `long` y `double` ocupan 2).
//
// El oráculo del proyecto compila con `javac -g` (ADR 011), igual que NetBeans, y este modelo sigue ESA forma de compilar: con `-g` (`varDebugInfo`) `Gen.visitVarDef` también GENERA el inicializador de una
// `final` constante —para dejarla en la tabla de variables locales—, así que una `final` de más de 65 535 bytes da `limit.string.overflow` aunque nadie la use. Sin `-g` esa `final` no se generaba (lo medido con un
// `javac` sin opciones: es el único caso donde los dos difieren).
//
// Lo que `Gen` NO genera no cuenta: una expresión que se pliega (`"é…" == "b"`) es un boolean y nunca carga sus textos; y `Lower` poda antes de `Gen` la rama de un `if` con condición constante que no se toma y
// el lado derecho de `false && …` y de `true || …`.
//
// El motor NO modela el bytecode. Donde no puede decidir da un aviso honesto (`tamano-de-texto-no-revisable`), nunca `ok` ni un error inventado:
//   - una condición constante (`if (true)`, `if (DEBUG)`, `false && …`) en un programa donde un texto pasa el límite: javac poda código que el motor no sigue más allá de la rama que se descarta —por ejemplo, lo
//     que viene tras un `if (true) return;` tampoco se genera, aunque Flow lo ve alcanzable—, así que un error en el código restante podría no ser el primero de javac, ni existir. Sin textos largos no cambia nada.
// Un decimal convertido a texto (`"a" + 1.5`) ya no es una incertidumbre (tarea 2.4, cierre de la 1.36): su largo es el de `Double.toString`, exacto, como el de cualquier otra constante.
// El límite del código de un método (`limit.code`, 64 KB de bytecode) lo cubre el tope de tamaño de `limites.ts`, que se revisa antes de todo esto.
import type { Rango } from '../fuente/rango.ts';
import type {
  NodoAsignacion,
  NodoBinaria,
  NodoBloque,
  NodoDeclaracionLocal,
  NodoElementoBloque,
  NodoExpresion,
  NodoFor,
  NodoIf,
  NodoLlamada,
  NodoPrograma,
  NodoSentencia,
  NodoSwitch,
} from '../sintaxis/ast.ts';
import { Alcance } from './alcance.ts';
import { bytesEnUtf8Modificado, constanteDeVariable, textoJavaDeConstante, valorConstante, type ValorConstante } from './constantes.ts';
import { avisoDeTamanoDeTexto, type ProblemaAtribucion } from './diagnostico.ts';
import { posicionDeJavac } from './posiciones-de-javac.ts';
import { tipoDeExpresion } from './tipos.ts';

/** `PoolWriter.MAX_STRING_LENGTH` de javac: un texto constante de ESTE largo (en unidades UTF-16) o más no se genera. */
const LARGO_DE_TEXTO_QUE_YA_NO_SE_GENERA = 65_535;
/** Lo que cabe en una entrada `CONSTANT_Utf8` (JVMS 4.4.7: el largo es un `u2`): 65 535 bytes; con uno más javac da `limit.string.overflow`. */
const BYTES_MAXIMOS_DE_UNA_ENTRADA = 65_535;
/** `StringConcat.MAX_INDY_CONCAT_ARG_SLOTS`: javac parte una concatenación en recetas cuando las ranuras de los operandos llegan a este número. */
const RANURAS_DE_UNA_RECETA = 200;

/** El largo en caracteres y en bytes de la constante de texto `constante`; `null` si no es un texto. */
function medirTexto(constante: ValorConstante): { readonly unidades: number; readonly bytes: number } | null {
  if (constante.tipo !== 'String') return null;
  return { unidades: constante.valor.length, bytes: bytesEnUtf8Modificado(constante.valor) };
}

/** Lo que encontró la revisión: SEGURO (se sabe que pasa del límite) o INCIERTO (depende de lo que el motor no sabe: el reparto en recetas de una concatenación con un operando de tipo desconocido). */
interface Hallazgo {
  readonly certeza: 'seguro' | 'incierto';
  /** Donde javac ancla el error. */
  readonly rango: Rango;
  /** Donde está el texto en el programa (para el aviso, cuando el error de javac se ancla en la clase). */
  readonly rangoDelTexto: Rango;
}

interface Revision {
  readonly alcance: Alcance;
  /** La palabra `class`: donde javac ancla los errores del archivo ya generado. */
  readonly rangoDeLaClase: Rango;
  /** `limit.string`, en el ORDEN en que `Gen` genera el código (el primero es el que javac informa). */
  readonly deGeneracion: Hallazgo[];
  /** `limit.string.overflow`, que `ClassWriter` revisa después de `Gen`: todos se anclan en la clase. */
  readonly deArchivo: Hallazgo[];
  /** ¿Hay una condición constante que podría podar código de `Lower` o de `Gen`? */
  hayPodaPosible: boolean;
}

/** Pasada 5 de ADR 004: devuelve a lo más UN problema (el que javac informaría), o ninguno. */
export function verificarLimitesDelArchivo(programa: NodoPrograma): ProblemaAtribucion[] {
  const main = programa.clase.main;
  if (main === null) return [];
  const revision: Revision = {
    alcance: new Alcance(),
    rangoDeLaClase: programa.clase.rangoDeLaPalabraClass,
    deGeneracion: [],
    deArchivo: [],
    hayPodaPosible: false,
  };
  revision.alcance.entrarBloque();
  revision.alcance.declarar({ nombre: main.parametro, tipo: 'desconocido', esFinal: false, rango: main.rango });
  visitarBloque(main.cuerpo, revision);
  revision.alcance.salirBloque();
  return decidir(revision);
}

/** Con los hallazgos en la mano, lo que informa javac: `Gen` antes que `ClassWriter`, y de `Gen` el primero. */
function decidir(revision: Revision): ProblemaAtribucion[] {
  const primeroDeGeneracion = revision.deGeneracion[0];
  if (primeroDeGeneracion !== undefined) {
    if (primeroDeGeneracion.certeza === 'seguro' && !revision.hayPodaPosible) return [{ codigo: 'texto-con-demasiados-caracteres', rango: primeroDeGeneracion.rango, datos: {} }];
    return [avisoDeTamanoDeTexto(primeroDeGeneracion.rangoDelTexto)];
  }
  // El exceso de bytes se ancla siempre en la clase: da igual cuál de los textos lo cause, así que basta que ALGUNO sea seguro.
  const seguro = revision.deArchivo.find((hallazgo) => hallazgo.certeza === 'seguro');
  if (seguro !== undefined && !revision.hayPodaPosible) return [{ codigo: 'texto-con-demasiados-bytes', rango: seguro.rango, datos: {} }];
  const primeroDelArchivo = revision.deArchivo[0];
  return primeroDelArchivo === undefined ? [] : [avisoDeTamanoDeTexto(primeroDelArchivo.rangoDelTexto)];
}

// ---- Constantes de texto que se revisan ----

/** El rango del árbol `expresion` donde javac ancla el error (`JCTree.pos`): su inicio es esa posición y llega hasta el fin de la expresión, para que el editor la subraye completa. */
function rangoDeJavac(expresion: NodoExpresion, esRaizDeLaExpresion: boolean): Rango {
  const inicio = posicionDeJavac(expresion, esRaizDeLaExpresion);
  const fin = expresion.parentesis?.fin ?? expresion.rango.fin;
  return { inicio, fin: Math.max(fin, inicio + 1) };
}

/**
 * Una constante de texto que javac revisa: `limit.string` si mide 65 535 caracteres o más (`Gen.checkStringConstant`), y, si además se GENERA (`ldc`), `limit.string.overflow` si su entrada pasa de 65 535 bytes.
 * `rango` es el que ancla el error de `Gen`. Una constante que no es un texto no tiene nada que revisar.
 */
function revisarTextoConstante(constante: ValorConstante, rango: Rango, seGenera: boolean, revision: Revision): void {
  const medida = medirTexto(constante);
  if (medida === null) return;
  if (medida.unidades >= LARGO_DE_TEXTO_QUE_YA_NO_SE_GENERA) revision.deGeneracion.push({ certeza: 'seguro', rango, rangoDelTexto: rango });
  if (seGenera && medida.bytes > BYTES_MAXIMOS_DE_UNA_ENTRADA) revision.deArchivo.push({ certeza: 'seguro', rango: revision.rangoDeLaClase, rangoDelTexto: rango });
}

// ---- Sentencias, en el orden en que `Gen` las genera ----

function visitarBloque(bloque: NodoBloque, revision: Revision): void {
  revision.alcance.entrarBloque();
  for (const elemento of bloque.elementos) visitarElemento(elemento, revision);
  revision.alcance.salirBloque();
}

function visitarElemento(elemento: NodoElementoBloque, revision: Revision): void {
  if (elemento.tipo === 'declaracion-local') visitarDeclaracionLocal(elemento, revision);
  else visitarSentencia(elemento, revision);
}

/**
 * `Gen.visitVarDef`: el valor de una `final` constante se revisa con `checkStringConstant` en el árbol del inicializador y, con `-g` (el oráculo y NetBeans), el inicializador se GENERA igual que el de
 * cualquier otra variable —`genExpr` de una constante es un `ldc`—: la `final` entra al archivo aunque nadie la use.
 */
function visitarDeclaracionLocal(declaracion: NodoDeclaracionLocal, revision: Revision): void {
  for (const declarador of declaracion.declaradores) {
    const inicializador = declarador.inicializador;
    const valor = inicializador === null ? null : valorConstante(inicializador, revision.alcance);
    const constante = declaracion.esFinal ? constanteDeVariable(declaracion.nombreTipo, valor) : undefined;
    if (inicializador !== null) {
      if (constante !== undefined) revisarTextoConstante(constante, rangoDeJavac(inicializador, true), true, revision);
      else generar(inicializador, true, revision);
    }
    revision.alcance.declarar({ nombre: declarador.nombre, tipo: declaracion.nombreTipo, esFinal: declaracion.esFinal, rango: declarador.rango, constante });
  }
}

function visitarSentencia(sentencia: NodoSentencia, revision: Revision): void {
  switch (sentencia.tipo) {
    case 'bloque':
      visitarBloque(sentencia, revision);
      return;
    case 'impresion':
      if (sentencia.argumento !== null) generar(sentencia.argumento, true, revision);
      return;
    case 'sentencia-expresion':
      generar(sentencia.expresion, true, revision);
      return;
    case 'if':
      visitarIf(sentencia, revision);
      return;
    case 'while':
      generar(sentencia.condicion, true, revision);
      visitarSentencia(sentencia.cuerpo, revision);
      return;
    case 'do-while':
      visitarSentencia(sentencia.cuerpo, revision);
      generar(sentencia.condicion, true, revision);
      return;
    case 'for':
      visitarFor(sentencia, revision);
      return;
    case 'switch':
      visitarSwitch(sentencia, revision);
      return;
    // `return`, `break`, `continue`, la sentencia vacía y lo no soportado (que a esta altura ya no existe) no generan ningún texto.
    default:
      return;
  }
}

/** `Lower.visitIf`: con una condición constante el `if` entero se reemplaza por la rama que se toma (la otra no llega a `Gen`). */
function visitarIf(sentencia: NodoIf, revision: Revision): void {
  const condicion = valorConstante(sentencia.condicion, revision.alcance);
  if (condicion === null) {
    generar(sentencia.condicion, true, revision);
    visitarSentencia(sentencia.entonces, revision);
    if (sentencia.sino !== null) visitarSentencia(sentencia.sino, revision);
    return;
  }
  revision.hayPodaPosible = true;
  if (condicion.tipo === 'boolean' && condicion.valor) visitarSentencia(sentencia.entonces, revision);
  else if (sentencia.sino !== null) visitarSentencia(sentencia.sino, revision);
}

/** `Gen.genLoop` genera la inicialización, la condición, el CUERPO y, al final, el paso. */
function visitarFor(sentencia: NodoFor, revision: Revision): void {
  revision.alcance.entrarBloque();
  if (sentencia.inicializacionDeclaracion !== null) visitarDeclaracionLocal(sentencia.inicializacionDeclaracion, revision);
  for (const inicializacion of sentencia.inicializacionExpresiones) generar(inicializacion.expresion, true, revision);
  if (sentencia.condicion !== null) generar(sentencia.condicion, true, revision);
  visitarSentencia(sentencia.cuerpo, revision);
  for (const paso of sentencia.actualizacion) generar(paso.expresion, true, revision);
  revision.alcance.salirBloque();
}

/**
 * `Lower.visitStringSwitch`: un `switch` sobre texto se traduce a dos — el primero compara el selector con cada etiqueta (`s.equals("…")`, con la etiqueta como literal anclado en la palabra `switch`), el
 * segundo ejecuta los cuerpos—, así que TODAS las etiquetas se generan antes que cualquier cuerpo.
 */
function visitarSwitch(sentencia: NodoSwitch, revision: Revision): void {
  generar(sentencia.selector, true, revision);
  if (tipoDeExpresion(sentencia.selector, revision.alcance) === 'String') {
    const palabraSwitch: Rango = { inicio: sentencia.rango.inicio, fin: sentencia.rango.inicio + 'switch'.length };
    for (const elemento of sentencia.elementos) {
      if (elemento.tipo !== 'etiqueta-case') continue;
      const etiqueta = valorConstante(elemento.valor, revision.alcance);
      if (etiqueta !== null) revisarTextoConstante(etiqueta, palabraSwitch, true, revision);
    }
  }
  revision.alcance.entrarBloque();
  for (const elemento of sentencia.elementos) {
    if (elemento.tipo === 'etiqueta-case' || elemento.tipo === 'etiqueta-default') continue;
    visitarElemento(elemento, revision);
  }
  revision.alcance.salirBloque();
}

// ---- Expresiones: `Gen.genExpr` ----

/**
 * `Gen.genExpr`: una expresión CONSTANTE se genera de golpe (`ldc`) y se revisa con `checkStringConstant`, sin bajar a sus partes; una que no lo es, se genera por partes. `esRaizDeLaExpresion` dice si
 * `expresion` es la raíz de una expresión completa (un argumento, un inicializador, una condición…) o un operando de otro operador, y solo cambia la POSICIÓN de javac para una suma de literales.
 */
function generar(expresion: NodoExpresion, esRaizDeLaExpresion: boolean, revision: Revision): void {
  const constante = valorConstante(expresion, revision.alcance);
  if (constante !== null) {
    revisarTextoConstante(constante, rangoDeJavac(expresion, esRaizDeLaExpresion), true, revision);
    return;
  }
  switch (expresion.tipo) {
    case 'binaria':
      generarBinaria(expresion, esRaizDeLaExpresion, revision);
      return;
    case 'unaria':
      generar(expresion.operando, false, revision);
      return;
    case 'conversion':
      generar(expresion.operando, false, revision);
      return;
    case 'asignacion':
      generarAsignacion(expresion, revision);
      return;
    case 'llamada':
      generarLlamada(expresion, revision);
      return;
    case 'acceso-miembro':
      generarReceptor(expresion.objeto, revision);
      return;
    case 'nueva-instancia':
      for (const argumento of expresion.argumentos) generar(argumento, true, revision);
      return;
    // Un nombre (una variable), `x++`, `x--` y lo que ya no puede aparecer a esta altura: ningún texto que generar.
    default:
      return;
  }
}

function generarBinaria(expresion: NodoBinaria, esRaizDeLaExpresion: boolean, revision: Revision): void {
  if (expresion.operador === '&&' || expresion.operador === '||') {
    generarCortocircuito(expresion, revision);
    return;
  }
  if (expresion.operador === '+' && tipoDeExpresion(expresion, revision.alcance) === 'String') {
    const operandos: NodoExpresion[] = [];
    aplanarConcatenacion(expresion, operandos, revision);
    generarConcatenacion(operandos, rangoDeJavac(expresion, esRaizDeLaExpresion), revision);
    return;
  }
  generar(expresion.izquierda, false, revision);
  generar(expresion.derecha, false, revision);
}

/**
 * `Lower.visitBinary`: con el lado IZQUIERDO constante, `false && …` y `true || …` valen su lado izquierdo y el derecho se descarta; `true && x` y `false || x` valen `x`. Un lado izquierdo que no
 * es constante genera los dos.
 */
function generarCortocircuito(expresion: NodoBinaria, revision: Revision): void {
  const izquierda = valorConstante(expresion.izquierda, revision.alcance);
  if (izquierda === null) {
    generar(expresion.izquierda, false, revision);
    generar(expresion.derecha, false, revision);
    return;
  }
  revision.hayPodaPosible = true;
  const seGeneraElDerecho = izquierda.tipo === 'boolean' && (expresion.operador === '&&' ? izquierda.valor : !izquierda.valor);
  if (seGeneraElDerecho) generar(expresion.derecha, false, revision);
}

function generarAsignacion(expresion: NodoAsignacion, revision: Revision): void {
  if (expresion.operador === '+=' && tipoDeExpresion(expresion.objetivo, revision.alcance) === 'String') {
    // `s += x` es una concatenación con `s` como primer operando (`StringConcat.makeConcat(JCAssignOp)`): `s` se carga aparte y los demás operandos entran a la receta.
    const operandos: NodoExpresion[] = [expresion.objetivo];
    aplanarConcatenacion(expresion.valor, operandos, revision);
    generarConcatenacion(operandos, expresion.rango, revision);
    return;
  }
  generar(expresion.valor, true, revision);
}

/** El receptor de una llamada o de un acceso a un miembro y después los argumentos; un nombre de clase (`Math`, `System.out`) no genera nada. */
function generarLlamada(expresion: NodoLlamada, revision: Revision): void {
  if (expresion.callee.tipo === 'acceso-miembro') generarReceptor(expresion.callee.objeto, revision);
  for (const argumento of expresion.argumentos) generar(argumento, true, revision);
}

function generarReceptor(objeto: NodoExpresion, revision: Revision): void {
  if (esReferenciaAUnaClase(objeto, revision.alcance)) return;
  generar(objeto, false, revision);
}

/** `Math`, `System`, `System.out`: un nombre que no es una variable (una variable lo tapa, JLS 6.4.2) o un campo estático de uno así. */
function esReferenciaAUnaClase(expresion: NodoExpresion, alcance: Alcance): boolean {
  if (expresion.tipo === 'nombre') return alcance.buscar(expresion.nombre) === null;
  return expresion.tipo === 'acceso-miembro' && esReferenciaAUnaClase(expresion.objeto, alcance);
}

// ---- La receta de una concatenación (`StringConcat`, `indyWithConstants`) ----

/** `StringConcat.collect`: una suma de TEXTO que no es constante se abre en sus dos lados (los paréntesis no cuentan); todo lo demás —una constante incluida— es un operando. */
function aplanarConcatenacion(expresion: NodoExpresion, operandos: NodoExpresion[], revision: Revision): void {
  const alcance = revision.alcance;
  if (expresion.tipo === 'binaria' && expresion.operador === '+' && valorConstante(expresion, alcance) === null && tipoDeExpresion(expresion, alcance) === 'String') {
    aplanarConcatenacion(expresion.izquierda, operandos, revision);
    aplanarConcatenacion(expresion.derecha, operandos, revision);
    return;
  }
  operandos.push(expresion);
}

/** Un operando de la receta: las ranuras que ocupa (`long` y `double`, 2), lo que aporta a la receta y, si trae las marcas `\u0001`/`\u0002`, su propia entrada aparte. */
interface Pieza {
  readonly ranuras: 1 | 2;
  readonly bytes: number;
}

const esMarcaDeLaReceta = (texto: string): boolean => texto.includes('\u0001') || texto.includes('\u0002');

/**
 * Los operandos de una concatenación que no es constante (ya aplanada): cada operando no constante se genera, EN ORDEN, y aporta 1 byte (`\u0001`) a la receta; cada constante aporta el texto de su valor
 * (las vacías, nada). Las ranuras reparten la receta en tramos de menos de 200 (`StringConcat.split`) y cada tramo es una entrada del archivo.
 */
function generarConcatenacion(operandos: readonly NodoExpresion[], rangoDeLaConcatenacion: Rango, revision: Revision): void {
  const piezas: Pieza[] = [];
  let ranurasDesconocidas = false;
  for (const operando of operandos) {
    const constante = valorConstante(operando, revision.alcance);
    if (constante === null) {
      generar(operando, false, revision);
      const tipo = tipoDeExpresion(operando, revision.alcance);
      if (tipo === 'desconocido') ranurasDesconocidas = true;
      piezas.push({ ranuras: tipo === 'long' || tipo === 'double' ? 2 : 1, bytes: 1 });
      continue;
    }
    const ranuras = constante.tipo === 'long' || constante.tipo === 'double' ? 2 : 1;
    const texto = textoJavaDeConstante(constante);
    if (esMarcaDeLaReceta(texto)) {
      // Una constante con una marca no entra a la receta: la receta guarda su propia marca (1 byte) y el texto va como una entrada más.
      piezas.push({ ranuras, bytes: 1 });
      registrarEntradaDeArchivo(bytesEnUtf8Modificado(texto), rangoDeLaConcatenacion, false, revision);
      continue;
    }
    piezas.push({ ranuras, bytes: bytesEnUtf8Modificado(texto) });
  }
  // Sin conocer el tipo de algún operando no se sabe cómo se reparte en recetas: si son pocos operandos no hay reparto posible; con muchos, lo que salga es incierto.
  const incierto = ranurasDesconocidas && piezas.length >= RANURAS_DE_UNA_RECETA / 2;
  for (const grupo of repartirEnRecetas(piezas)) {
    registrarEntradaDeArchivo(grupo.reduce((suma, pieza) => suma + pieza.bytes, 0), rangoDeLaConcatenacion, incierto, revision);
  }
}

/** `StringConcat.split`: pasa a otra receta cuando las ranuras acumuladas más las del operando llegan a 200. */
function repartirEnRecetas(piezas: readonly Pieza[]): Pieza[][] {
  const grupos: Pieza[][] = [];
  let actual: Pieza[] = [];
  let ranuras = 0;
  for (const pieza of piezas) {
    if (ranuras + pieza.ranuras >= RANURAS_DE_UNA_RECETA) {
      grupos.push(actual);
      actual = [];
      ranuras = 0;
    }
    actual.push(pieza);
    ranuras += pieza.ranuras;
  }
  if (actual.length > 0) grupos.push(actual);
  return grupos;
}

/** Una entrada `CONSTANT_Utf8` del archivo de clase de `bytes` bytes (`incierto`: el reparto en recetas que la produce no se sabe). */
function registrarEntradaDeArchivo(bytes: number, rangoDelTexto: Rango, incierto: boolean, revision: Revision): void {
  if (bytes > BYTES_MAXIMOS_DE_UNA_ENTRADA) revision.deArchivo.push({ certeza: incierto ? 'incierto' : 'seguro', rango: revision.rangoDeLaClase, rangoDelTexto });
}
