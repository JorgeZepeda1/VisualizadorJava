// Asignación definitiva (tarea 1.13, JLS 16, REQ-COMP-004) — pasada 4 de ADR 004. Standalone por
// ahora, igual que `atribucion.ts`/`alcanzabilidad.ts`: 1.14 conecta las tres a `compilador.ts`,
// fuera de este sub-lote (el orquestador dijo explícitamente NO hacerlo aquí). Recorre TODO el
// árbol (nunca se detiene en el primer problema) y devuelve la lista COMPLETA ordenada por
// posición, mismo patrón que `atribuir()`/`verificarAlcanzabilidad()`.
//
// Cada pasada declara su PROPIO `Alcance` todavía (nota de arquitectura tras 1.12, engram
// `visualizador-java/patron-semantica-atribucion-catalogo`): esta reusa `esCondicionConstante`/
// `valorConstante` de `constantes.ts`, que YA resuelven variables `final` constantes con solo
// poblar el campo `SimboloVariable.constante` al declarar (deuda 3 del commit 999a8ca).
//
// Descubrimiento de esta tarea (verificado contra el propio analizador sintáctico, no contra
// javac): "final sin inicializador" ("blank final") es NO-DISP desde la SINTAXIS (REQ-SUB-007,
// `analizador-sintactico.ts`: CUALQUIER declaración `final` con algún declarador sin inicializador
// se convierte en `NodoNoSoportado` ANTES de llegar aquí — nunca en un `NodoDeclaracionLocal`).
// Consecuencia real: una `final` que SÍ llega a `visitarDeclaracionLocal` SIEMPRE tuvo su
// inicializador, así que está definitivamente asignada desde su propia declaración en el 100% de
// los programas que este subconjunto acepta — nunca hace falta rastrear "todavía sin asignar" (DU,
// JLS 16.1) para decidir si una reasignación es legal: CUALQUIER asignación posterior a una
// `final` es ilegal sin excepción, sin necesitar flujo (if/else, ciclos...). Por eso el estado de
// esta pasada es un solo conjunto (DA, `asignadas`) — más simple que el diseño general de JLS 16
// con DA+DU, JUSTIFICADO por esta restricción real y verificada del subconjunto (D2: nunca más
// mecanismo que el que el subconjunto puede ejercitar de verdad).
import type { NodoBloque, NodoDeclaracionLocal, NodoElementoBloque, NodoExpresion, NodoPrograma, NodoSentencia } from '../sintaxis/ast.ts';
import { esCondicionConstante } from './alcanzabilidad.ts';
import { Alcance } from './alcance.ts';
import type { ProblemaAtribucion } from './diagnostico.ts';

/** El conjunto de variables DEFINITIVAMENTE ASIGNADAS ("DA", JLS 16) en un punto del programa.
 * Inmutable: cada visitante devuelve un conjunto NUEVO, nunca muta el que recibió. */
type EstadoFlujo = ReadonlySet<string>;

/** El resultado de visitar una sentencia: el estado asumiendo que se sigue desde aquí (útil para
 * la caída secuencial normal), y si la sentencia puede completar normalmente (JLS 14.22 — cuando
 * es `false`, p. ej. un `return`, el `estado` no debe usarse para la caída secuencial: quien llama
 * decide si lo descarta o lo guarda aparte, como en un punto de `break`). */
interface ResultadoFlujo {
  readonly estado: EstadoFlujo;
  readonly completaNormal: boolean;
}

/** JLS 16.2.11 ("while(true)"/"for(;;)"): el punto donde un "break" SIN etiqueta entrega su estado
 * DE ESE momento -- cada ciclo/switch crea el SUYO propio para su cuerpo (nunca lo hereda de un
 * ciclo/switch envolvente, JLS 14.21: un "break" ahí adentro pertenece al más cercano) y lo
 * reemplaza mientras visita SU cuerpo; `if`/bloque simplemente lo hacen pasar, sin crear uno
 * nuevo. `null` fuera de todo ciclo/switch (un "break" ahí es error de OTRA pasada, atribucion.ts). */
interface ContextoRuptura {
  readonly registrar: (estado: EstadoFlujo) => void;
}

function conAgregada(conjunto: EstadoFlujo, nombre: string): EstadoFlujo {
  if (conjunto.has(nombre)) return conjunto;
  return new Set([...conjunto, nombre]);
}

function conQuitada(conjunto: EstadoFlujo, nombre: string): EstadoFlujo {
  if (!conjunto.has(nombre)) return conjunto;
  const copia = new Set(conjunto);
  copia.delete(nombre);
  return copia;
}

/** El punto en que se reúnen dos o más caminos (p. ej. tras "if"/"else", o los puntos de "break" de
 * un ciclo): una variable solo queda definitivamente asignada si lo estaba en TODOS los caminos
 * que llegan aquí -- por eso es una INTERSECCIÓN. */
function combinarEstados(estados: readonly EstadoFlujo[]): EstadoFlujo {
  if (estados.length === 0) return new Set();
  const [primero, ...resto] = estados;
  let resultado: EstadoFlujo = primero!;
  for (const estado of resto) {
    resultado = new Set([...resultado].filter((nombre) => estado.has(nombre)));
  }
  return resultado;
}

export function verificarAsignacionDefinitiva(programa: NodoPrograma): ProblemaAtribucion[] {
  const problemas: ProblemaAtribucion[] = [];
  const alcance = new Alcance();
  alcance.entrarBloque();
  const parametro = programa.clase.main.parametro;
  alcance.declarar({ nombre: parametro, tipo: 'desconocido', esFinal: false, rango: programa.clase.main.rango });
  // El parámetro de "main" SIEMPRE tiene un valor (lo entrega quien invoca el método, JLS 16) —
  // asignado desde el primer instante, nunca "no asignado".
  visitarBloque(programa.clase.main.cuerpo, alcance, new Set([parametro]), null, problemas);
  alcance.salirBloque();
  return problemas.slice().sort((a, b) => a.rango.inicio - b.rango.inicio);
}

function visitarBloque(
  bloque: NodoBloque,
  alcance: Alcance,
  entrada: EstadoFlujo,
  contextoRuptura: ContextoRuptura | null,
  problemas: ProblemaAtribucion[],
): ResultadoFlujo {
  alcance.entrarBloque();
  let estado = entrada;
  let completaNormal = true; // bloque vacío: completa normal trivialmente
  for (const elemento of bloque.elementos) {
    const resultado = visitarElemento(elemento, alcance, estado, contextoRuptura, problemas);
    estado = resultado.estado;
    completaNormal = resultado.completaNormal;
  }
  alcance.salirBloque();
  return { estado, completaNormal };
}

function visitarElemento(
  elemento: NodoElementoBloque,
  alcance: Alcance,
  entrada: EstadoFlujo,
  contextoRuptura: ContextoRuptura | null,
  problemas: ProblemaAtribucion[],
): ResultadoFlujo {
  if (elemento.tipo === 'declaracion-local') {
    return { estado: visitarDeclaracionLocal(elemento, alcance, entrada, problemas), completaNormal: true };
  }
  return visitarSentencia(elemento, alcance, entrada, contextoRuptura, problemas);
}

/** Solo asignación definitiva -- la validez del tipo/símbolo ya la reporta `atribucion.ts` (pasada
 * 2); esta pasada nunca vuelve a reportar eso. Con inicializador (el ÚNICO caso posible para una
 * `final`, ver cabecera del archivo): el declarador entra DIRECTO a `asignadas`. */
function visitarDeclaracionLocal(
  declaracion: NodoDeclaracionLocal,
  alcance: Alcance,
  entrada: EstadoFlujo,
  problemas: ProblemaAtribucion[],
): EstadoFlujo {
  let estado = entrada;
  for (const declarador of declaracion.declaradores) {
    if (declarador.inicializador !== null) {
      estado = visitarExpresion(declarador.inicializador, alcance, estado, problemas);
      estado = conAgregada(estado, declarador.nombre);
    } else {
      // "conQuitada" importa cuando el MISMO nombre ya vivió antes en un alcance hermano ya
      // cerrado (p. ej. la "i" de un "for" anterior) -- sin esto, una declaración nueva sin
      // inicializador podría heredar por error el "asignada" de una variable homónima previa, ya
      // fuera de alcance (verificado con una prueba dedicada de esta tarea).
      estado = conQuitada(estado, declarador.nombre);
    }
    alcance.declarar({ nombre: declarador.nombre, tipo: declaracion.nombreTipo, esFinal: declaracion.esFinal, rango: declarador.rango });
  }
  return estado;
}

function visitarSentencia(
  sentencia: NodoSentencia,
  alcance: Alcance,
  entrada: EstadoFlujo,
  contextoRuptura: ContextoRuptura | null,
  problemas: ProblemaAtribucion[],
): ResultadoFlujo {
  switch (sentencia.tipo) {
    case 'bloque':
      return visitarBloque(sentencia, alcance, entrada, contextoRuptura, problemas);
    case 'break':
      contextoRuptura?.registrar(entrada); // JLS 16.2.11: el "break" entrega el estado DE ESE punto
      return { estado: entrada, completaNormal: false };
    case 'retorno':
    case 'continue':
      return { estado: entrada, completaNormal: false }; // JLS 14.22: nunca completan normalmente
    case 'sentencia-vacia':
    case 'no-soportado':
      return { estado: entrada, completaNormal: true };
    case 'sentencia-expresion':
      return { estado: visitarExpresion(sentencia.expresion, alcance, entrada, problemas), completaNormal: true };
    case 'impresion': {
      const estado = sentencia.argumento !== null ? visitarExpresion(sentencia.argumento, alcance, entrada, problemas) : entrada;
      return { estado, completaNormal: true };
    }
    case 'if':
      return visitarIf(sentencia, alcance, entrada, contextoRuptura, problemas);
    case 'while':
      return visitarWhile(sentencia, alcance, entrada, problemas);
    case 'for':
      return visitarFor(sentencia, alcance, entrada, problemas);
    case 'do-while':
      return visitarDoWhile(sentencia, alcance, entrada, problemas);
    case 'switch':
      return visitarSwitch(sentencia, alcance, entrada, problemas);
  }
}

/** "switch" con "default" (JLS 16.2.9) -- verificado ad-hoc contra javac 17 real (DA_A..DA_D2 del
 * reporte de la tarea; exploracion/03 §4.4 no cubre "switch"). SIN "default", nunca garantiza (el
 * selector podría no coincidir con ningún "case" -- misma razón que la corrección de "switch" de
 * `alcanzabilidad.ts` en este mismo sub-lote). CON "default", garantiza sii TODO punto de salida
 * real (cada "break" que le pertenece + el último grupo si cae al fondo) ya asignó la variable --
 * misma intersección que "if"/"else"/"while(true)". El recorrido honra la caída (fallthrough)
 * reiniciando el estado a la entrada del switch en cada etiqueta (destino de salto válido, mismo
 * principio que la corrección de `alcanzabilidad.ts`). */
function visitarSwitch(
  sentencia: Extract<NodoSentencia, { tipo: 'switch' }>,
  alcance: Alcance,
  entrada: EstadoFlujo,
  problemas: ProblemaAtribucion[],
): ResultadoFlujo {
  const entradaSelector = visitarExpresion(sentencia.selector, alcance, entrada, problemas);
  const tieneDefault = sentencia.elementos.some((elemento) => elemento.tipo === 'etiqueta-default');
  const salidas: EstadoFlujo[] = [];
  const contextoPropio: ContextoRuptura = { registrar: (estado) => salidas.push(estado) };
  alcance.entrarBloque();
  let actual = entradaSelector;
  let resultadoUltimoGrupo: ResultadoFlujo = { estado: entradaSelector, completaNormal: true };
  for (const elemento of sentencia.elementos) {
    if (elemento.tipo === 'etiqueta-case' || elemento.tipo === 'etiqueta-default') {
      actual = entradaSelector;
      resultadoUltimoGrupo = { estado: entradaSelector, completaNormal: true };
      continue;
    }
    resultadoUltimoGrupo = visitarElemento(elemento, alcance, actual, contextoPropio, problemas);
    actual = resultadoUltimoGrupo.estado;
  }
  alcance.salirBloque();
  if (!tieneDefault) return { estado: entradaSelector, completaNormal: true };
  const candidatos = resultadoUltimoGrupo.completaNormal ? [...salidas, resultadoUltimoGrupo.estado] : salidas;
  return {
    estado: candidatos.length > 0 ? combinarEstados(candidatos) : entradaSelector,
    completaNormal: salidas.length > 0 || resultadoUltimoGrupo.completaNormal,
  };
}

/** exploracion/03 §4.4 punto 3 (err09, JLS 16.2.5): "while(condición)" con condición NO constante
 * NUNCA garantiza asignación después del ciclo, aun si el cuerpo asigna en TODAS las vueltas -- el
 * compilador no sabe que el cuerpo corre al menos una vez (JLS no razona sobre el valor real de la
 * condición, solo sobre si es una CONSTANTE booleana literal). El cuerpo SÍ se recorre (para seguir
 * reportando lecturas inválidas dentro de él); su resultado se DESCARTA para lo que sigue al ciclo
 * salvo la excepción real de condición constante "true" (JLS 16.2.11, err08). */
function visitarWhile(
  sentencia: Extract<NodoSentencia, { tipo: 'while' }>,
  alcance: Alcance,
  entrada: EstadoFlujo,
  problemas: ProblemaAtribucion[],
): ResultadoFlujo {
  const entradaCondicion = visitarExpresion(sentencia.condicion, alcance, entrada, problemas);
  const salidas: EstadoFlujo[] = [];
  const contextoPropio: ContextoRuptura = { registrar: (estado) => salidas.push(estado) };
  visitarSentencia(sentencia.cuerpo, alcance, entradaCondicion, contextoPropio, problemas);
  // exploracion/03 §4.4 punto 4 (err08, JLS 16.2.11): condición constante "true" es un caso
  // especial -- el ciclo SOLO puede terminar por un "break" (nunca por la condición, que javac SABE
  // que nunca es falsa); la asignación definitiva después se calcula sobre TODOS los puntos de
  // "break" (si todos ocurrieron ya asignada, queda garantizada). Sin "break" alguno, nada sigue al
  // ciclo (alcanzabilidad.ts ya lo rechaza aparte) -- aquí, sin puntos que combinar, no hay nada que
  // garantizar: se usa la entrada tal cual, D2 (mejor no reportar que inventar).
  if (esCondicionConstante(sentencia.condicion, alcance, true)) {
    return { estado: salidas.length > 0 ? combinarEstados(salidas) : entradaCondicion, completaNormal: true };
  }
  return { estado: entradaCondicion, completaNormal: true };
}

/** exploracion/03 §4.4 punto 5 (err10): mismo principio que `visitarWhile` para "for(condición)" no
 * constante. El propio "for" abre su alcance (sus variables cubren condición, actualización y
 * cuerpo -- mismo patrón que `atribucion.ts`/`alcanzabilidad.ts`); la actualización se visita con
 * el estado que entra al cuerpo (esta pasada, como `alcanzabilidad.ts`, no modela iteraciones). */
function visitarFor(
  sentencia: Extract<NodoSentencia, { tipo: 'for' }>,
  alcance: Alcance,
  entrada: EstadoFlujo,
  problemas: ProblemaAtribucion[],
): ResultadoFlujo {
  alcance.entrarBloque();
  let estado = entrada;
  if (sentencia.inicializacionDeclaracion !== null) {
    estado = visitarDeclaracionLocal(sentencia.inicializacionDeclaracion, alcance, estado, problemas);
  }
  for (const expresionSentencia of sentencia.inicializacionExpresiones) {
    estado = visitarExpresion(expresionSentencia.expresion, alcance, estado, problemas);
  }
  const entradaCondicion = sentencia.condicion !== null ? visitarExpresion(sentencia.condicion, alcance, estado, problemas) : estado;
  const salidas: EstadoFlujo[] = [];
  const contextoPropio: ContextoRuptura = { registrar: (e) => salidas.push(e) };
  visitarSentencia(sentencia.cuerpo, alcance, entradaCondicion, contextoPropio, problemas);
  for (const expresionSentencia of sentencia.actualizacion) {
    visitarExpresion(expresionSentencia.expresion, alcance, entradaCondicion, problemas);
  }
  // "for(;;)" (condición OMITIDA) cuenta como constante "true" (JLS 14.21, igual que
  // `alcanzabilidad.ts`) -- mismo cálculo sobre los puntos de "break" que `visitarWhile`.
  const esInfinito = sentencia.condicion === null || esCondicionConstante(sentencia.condicion, alcance, true);
  const resultado = esInfinito
    ? { estado: salidas.length > 0 ? combinarEstados(salidas) : entradaCondicion, completaNormal: true }
    : { estado: entradaCondicion, completaNormal: true };
  alcance.salirBloque();
  return resultado;
}

/** exploracion/03 §4.4 punto 6 (err10b, JLS 14.22.2/16.2.10): el cuerpo de "do-while" corre SIEMPRE
 * al menos una vez, sin importar la condición (a diferencia de `visitarWhile`/`visitarFor`) -- si
 * completa normal (sin "return"/"break" propio), su estado YA es una garantía real después del
 * ciclo, sin necesitar la excepción de "condición constante" de JLS 16.2.11 (esa es exclusiva de
 * while/for). Cualquier "break" (aunque el cuerpo COMPLETE normal, JLS 14.21: puede haber breaks
 * en un camino y una caída normal en otro) aporta sus propios puntos de salida, igual que
 * `visitarWhile`. */
function visitarDoWhile(
  sentencia: Extract<NodoSentencia, { tipo: 'do-while' }>,
  alcance: Alcance,
  entrada: EstadoFlujo,
  problemas: ProblemaAtribucion[],
): ResultadoFlujo {
  const salidas: EstadoFlujo[] = [];
  const contextoPropio: ContextoRuptura = { registrar: (estado) => salidas.push(estado) };
  const resCuerpo = visitarSentencia(sentencia.cuerpo, alcance, entrada, contextoPropio, problemas);
  visitarExpresion(sentencia.condicion, alcance, resCuerpo.estado, problemas);
  const candidatos = resCuerpo.completaNormal ? [...salidas, resCuerpo.estado] : salidas;
  return { estado: candidatos.length > 0 ? combinarEstados(candidatos) : entrada, completaNormal: true };
}

/** exploracion/03 §4.4 punto 2 (err06/err07, JLS 16.2.6): tras "if"/"else", una variable queda
 * definitivamente asignada solo si se asigna en AMBAS ramas, o una rama asigna y la otra termina
 * abruptamente (su contribución se DESCARTA, nunca llega a "después del if" -- por eso se ignora
 * su `estado` cuando `completaNormal` es `false`, igual que ya hace `alcanzabilidad.ts`). Sin
 * "else", el "then" compite contra un "else" IMPLÍCITO vacío (mismo `entradaCondicion`, siempre
 * alcanzable) -- por construcción, la intersección con él NUNCA agrega nada nuevo. */
function visitarIf(
  sentencia: Extract<NodoSentencia, { tipo: 'if' }>,
  alcance: Alcance,
  entrada: EstadoFlujo,
  contextoRuptura: ContextoRuptura | null,
  problemas: ProblemaAtribucion[],
): ResultadoFlujo {
  visitarExpresion(sentencia.condicion, alcance, entrada, problemas); // reporta lecturas inválidas; el estado se recalcula abajo
  const entradaSiVerdadero = daSiVerdadero(sentencia.condicion, alcance, entrada);
  const entradaSiFalso = daSiFalso(sentencia.condicion, alcance, entrada);
  const resEntonces = visitarSentencia(sentencia.entonces, alcance, entradaSiVerdadero, contextoRuptura, problemas);
  if (sentencia.sino === null) {
    const estado = resEntonces.completaNormal ? combinarEstados([resEntonces.estado, entradaSiFalso]) : entradaSiFalso;
    return { estado, completaNormal: true }; // "if" sin "else" SIEMPRE completa normal (alcanzabilidad.ts, mismo principio)
  }
  const resSino = visitarSentencia(sentencia.sino, alcance, entradaSiFalso, contextoRuptura, problemas);
  if (!resEntonces.completaNormal && !resSino.completaNormal) return { estado: entradaSiVerdadero, completaNormal: false };
  if (!resEntonces.completaNormal) return { estado: resSino.estado, completaNormal: true };
  if (!resSino.completaNormal) return { estado: resEntonces.estado, completaNormal: true };
  return { estado: combinarEstados([resEntonces.estado, resSino.estado]), completaNormal: true };
}

/** JLS 16.1.2 ("&&"): "asignada-si-verdadero" tras "a && b" es la de "b" evaluado con la
 * "asignada-si-verdadero" de "a" como entrada (para llegar aquí, AMBOS fueron verdaderos, así que
 * el efecto de evaluar "b" con la entrada correcta de "a" ya cuenta). JLS 16.1.4 ("!"): invierte.
 * Fallback (cualquier otra expresión -- comparaciones, llamadas, nombres...): verdadero y falso dan
 * LO MISMO que el estado normal tras evaluarla (`propagar`) -- ver `daSiFalso`, su espejo. */
function daSiVerdadero(expresion: NodoExpresion, alcance: Alcance, entrada: EstadoFlujo): EstadoFlujo {
  if (expresion.tipo === 'binaria' && expresion.operador === '&&') {
    return daSiVerdadero(expresion.derecha, alcance, daSiVerdadero(expresion.izquierda, alcance, entrada));
  }
  if (expresion.tipo === 'binaria' && expresion.operador === '||') {
    return combinarEstados([
      daSiVerdadero(expresion.izquierda, alcance, entrada),
      daSiVerdadero(expresion.derecha, alcance, daSiFalso(expresion.izquierda, alcance, entrada)),
    ]);
  }
  if (expresion.tipo === 'unaria' && expresion.operador === '!') {
    return daSiFalso(expresion.operando, alcance, entrada);
  }
  return propagar(expresion, alcance, entrada);
}

/** JLS 16.1.3 ("||"): espejo de `daSiVerdadero` -- "asignada-si-falso" tras "a || b" es la de "b"
 * evaluado con la "asignada-si-falso" de "a" (para llegar aquí por "b", "a" tuvo que ser falso, así
 * que "b" SÍ se evaluó). "&&": "asignada-si-falso" es la INTERSECCIÓN de la de "a" y la de "b" con
 * la entrada de "a" verdadera (cualquiera de los dos pudo ser el que hizo falso el resultado). */
function daSiFalso(expresion: NodoExpresion, alcance: Alcance, entrada: EstadoFlujo): EstadoFlujo {
  if (expresion.tipo === 'binaria' && expresion.operador === '&&') {
    return combinarEstados([
      daSiFalso(expresion.izquierda, alcance, entrada),
      daSiFalso(expresion.derecha, alcance, daSiVerdadero(expresion.izquierda, alcance, entrada)),
    ]);
  }
  if (expresion.tipo === 'binaria' && expresion.operador === '||') {
    return daSiFalso(expresion.derecha, alcance, daSiFalso(expresion.izquierda, alcance, entrada));
  }
  if (expresion.tipo === 'unaria' && expresion.operador === '!') {
    return daSiVerdadero(expresion.operando, alcance, entrada);
  }
  return propagar(expresion, alcance, entrada);
}

/** Gemela PURA (nunca reporta) de `visitarExpresion` -- `daSiVerdadero`/`daSiFalso` la usan para
 * recalcular estados intermedios sin duplicar problemas: la condición completa YA se reportó UNA
 * vez, en el único `visitarExpresion(sentencia.condicion, ...)` de `visitarIf`. Mismo recorrido,
 * mismo orden de evaluación (design.md), solo sin el parámetro `problemas`. */
function propagar(expresion: NodoExpresion, alcance: Alcance, entrada: EstadoFlujo): EstadoFlujo {
  switch (expresion.tipo) {
    case 'literal-entero':
    case 'literal-largo':
    case 'literal-doble':
    case 'literal-caracter':
    case 'literal-cadena':
    case 'literal-booleano':
    case 'expresion-no-soportada':
    case 'nombre': // una lectura NUNCA cambia el estado -- solo se REPORTA, y eso ya lo hizo visitarExpresion
      return entrada;
    case 'binaria':
      return propagar(expresion.derecha, alcance, propagar(expresion.izquierda, alcance, entrada));
    case 'unaria':
      return propagar(expresion.operando, alcance, entrada);
    case 'asignacion':
      return propagarAsignacion(expresion, alcance, entrada);
    case 'incremento-decremento':
      return propagar(expresion.operando, alcance, entrada);
    case 'llamada': {
      let estado = propagar(expresion.callee, alcance, entrada);
      for (const argumento of expresion.argumentos) estado = propagar(argumento, alcance, estado);
      return estado;
    }
    case 'acceso-miembro':
      return propagar(expresion.objeto, alcance, entrada);
    case 'nueva-instancia': {
      let estado = entrada;
      for (const argumento of expresion.argumentos) estado = propagar(argumento, alcance, estado);
      return estado;
    }
    case 'conversion':
      return propagar(expresion.operando, alcance, entrada);
  }
}

/** Gemela pura de `visitarAsignacion` -- ver `propagar`. Nunca chequea reasignación de "final"
 * (eso es un PROBLEMA, no un cambio de estado, y ya lo reportó `visitarAsignacion` la única vez que
 * esta asignación se visitó de verdad). */
function propagarAsignacion(expresion: Extract<NodoExpresion, { tipo: 'asignacion' }>, alcance: Alcance, entrada: EstadoFlujo): EstadoFlujo {
  const objetivo = expresion.objetivo;
  if (objetivo.tipo !== 'nombre') {
    return propagar(expresion.valor, alcance, propagar(objetivo, alcance, entrada));
  }
  const estado = propagar(expresion.valor, alcance, entrada);
  return conAgregada(estado, objetivo.nombre);
}

/** Visita una expresión de izquierda a derecha (design.md: orden de evaluación real de Java) y
 * reporta cualquier lectura de una variable que podría no estar definitivamente asignada. Devuelve
 * el estado DESPUÉS de evaluar toda la expresión. */
function visitarExpresion(expresion: NodoExpresion, alcance: Alcance, entrada: EstadoFlujo, problemas: ProblemaAtribucion[]): EstadoFlujo {
  switch (expresion.tipo) {
    case 'literal-entero':
    case 'literal-largo':
    case 'literal-doble':
    case 'literal-caracter':
    case 'literal-cadena':
    case 'literal-booleano':
    case 'expresion-no-soportada':
      return entrada;
    case 'nombre':
      return visitarNombreComoValor(expresion, alcance, entrada, problemas);
    case 'binaria': {
      const trasIzquierda = visitarExpresion(expresion.izquierda, alcance, entrada, problemas);
      return visitarExpresion(expresion.derecha, alcance, trasIzquierda, problemas);
    }
    case 'unaria':
      return visitarExpresion(expresion.operando, alcance, entrada, problemas);
    case 'asignacion':
      return visitarAsignacion(expresion, alcance, entrada, problemas);
    case 'incremento-decremento':
      return visitarExpresion(expresion.operando, alcance, entrada, problemas);
    case 'llamada': {
      let estado = visitarExpresion(expresion.callee, alcance, entrada, problemas);
      for (const argumento of expresion.argumentos) estado = visitarExpresion(argumento, alcance, estado, problemas);
      return estado;
    }
    case 'acceso-miembro':
      return visitarExpresion(expresion.objeto, alcance, entrada, problemas);
    case 'nueva-instancia': {
      let estado = entrada;
      for (const argumento of expresion.argumentos) estado = visitarExpresion(argumento, alcance, estado, problemas);
      return estado;
    }
    case 'conversion':
      return visitarExpresion(expresion.operando, alcance, entrada, problemas);
  }
}

/** JLS 16.1.8 ("V = expr", y las compuestas "V op= expr"): a diferencia de una lectura normal, el
 * `objetivo` de una asignación simple NUNCA se chequea como lectura -- es un destino de escritura,
 * no un uso de su valor actual. Una compuesta ("x += 1", JLS 15.26.2) SÍ lee `objetivo` primero
 * (exige que ya estuviera asignada) antes de reasignarlo. En cualquier caso, tras evaluar `valor`,
 * `objetivo` (si es un nombre simple -- el único destino real de este subconjunto, sin arreglos ni
 * campos propios) queda definitivamente asignado para lo que sigue. */
function visitarAsignacion(
  expresion: Extract<NodoExpresion, { tipo: 'asignacion' }>,
  alcance: Alcance,
  entrada: EstadoFlujo,
  problemas: ProblemaAtribucion[],
): EstadoFlujo {
  const objetivo = expresion.objetivo;
  let estado = entrada;
  if (objetivo.tipo !== 'nombre') {
    // Defensivo (D2): este subconjunto nunca asigna a algo que no sea un nombre simple (sin
    // arreglos ni campos propios) -- si algún día ocurriera, se visita como cualquier otra
    // sub-expresión, sin inventar semántica de asignación definitiva sobre ella.
    estado = visitarExpresion(objetivo, alcance, estado, problemas);
    return visitarExpresion(expresion.valor, alcance, estado, problemas);
  }
  if (expresion.operador !== '=') {
    // Una compuesta ("x += 1", JLS 15.26.2) LEE "objetivo" primero -- exige que ya estuviera
    // asignada, a diferencia de la simple "x = 1" de abajo.
    estado = visitarNombreComoValor(objetivo, alcance, estado, problemas);
  }
  estado = visitarExpresion(expresion.valor, alcance, estado, problemas);
  verificarReasignacionDeFinal(objetivo, alcance, problemas);
  return conAgregada(estado, objetivo.nombre);
}

/** exploracion/03 §4.4 punto 7 (err10c, JLS 4.12.4 + 16.1): una "final" solo admite UNA asignación
 * total. Como "final sin inicializador" es NO-DISP desde la sintaxis (cabecera del archivo), una
 * "final" que llega aquí SIEMPRE tuvo su inicializador -- así que YA tiene su único valor desde la
 * declaración, y CUALQUIER asignación posterior (la que sea que estemos visitando en este punto)
 * es, por construcción, una reasignación ilegal. Nunca hace falta mirar el flujo (if/else,
 * ciclos...) para esta regla, a diferencia del resto de esta pasada. */
function verificarReasignacionDeFinal(nodo: Extract<NodoExpresion, { tipo: 'nombre' }>, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  const simbolo = alcance.buscar(nodo.nombre);
  if (simbolo !== null && simbolo.esFinal) {
    problemas.push({ codigo: 'variable-final-reasignada', rango: nodo.rango, datos: { nombre: nodo.nombre } });
  }
}

/** err05 de exploracion/03 ("variable x might not have been initialized"): una lectura de una
 * variable LOCAL (declarada sin inicializador y todavía no asignada por ningún camino) se rechaza.
 * `alcance.buscar` decide si el nombre es siquiera una variable local conocida -- una referencia a
 * una clase estática (`Math`, `System`...) o cualquier otro nombre ya lo resolvió `atribucion.ts`
 * (pasada 2, corre ANTES según ADR 004); esta pasada solo mira las que SÍ son variables locales. */
function visitarNombreComoValor(
  nodo: Extract<NodoExpresion, { tipo: 'nombre' }>,
  alcance: Alcance,
  entrada: EstadoFlujo,
  problemas: ProblemaAtribucion[],
): EstadoFlujo {
  const simbolo = alcance.buscar(nodo.nombre);
  if (simbolo !== null && !entrada.has(nodo.nombre)) {
    problemas.push({ codigo: 'variable-posiblemente-no-asignada', rango: nodo.rango, datos: { nombre: nodo.nombre } });
  }
  return entrada;
}
