// Asignación definitiva (tarea 1.13, JLS 16, REQ-COMP-004) — pasada 4 de ADR 004. Standalone por
// ahora, igual que `atribucion.ts`/`alcanzabilidad.ts`: 1.14 conecta las tres a `compilador.ts`,
// fuera de este sub-lote (el orquestador dijo explícitamente NO hacerlo aquí). Recorre TODO el
// árbol (nunca se detiene en el primer problema) y devuelve la lista COMPLETA ordenada por
// posición, mismo patrón que `atribuir()`/`verificarAlcanzabilidad()`.
//
// Cada pasada declara su PROPIO `Alcance` todavía (nota de arquitectura tras 1.12, engram
// `visualizador-java/patron-semantica-atribucion-catalogo`): esta reusa
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
//
// Tarea 1.29 (D2: nunca un error de compilación donde javac compila — hallado por el fuzzer diferencial de sentencias,
// ~36 falsos rechazos en 18 000 programas): el modelo se acercó a JLS 16 en lo que el subconjunto puede ejercitar.
//   · JLS 16.1.1: una expresión CONSTANTE (`true`, `!(1 == 1)`, una `final` con inicializador constante) deja
//     «vacuamente» asignada CUALQUIER variable en la rama que nunca ocurre («V is DA after any constant expression
//     whose value is true when false / false when true»). El estado «vacuo» (`todasLasVisibles`) son las variables YA
//     declaradas en ese punto —el rango de bits de javac—, no las que se declaren después (en otro grupo de `case`
//     siguen sin asignar), y la regla se compone por `&&`/`||`/`!` (`n > 0 || true` no es constante, pero su «asignada
//     si falso» es vacua por el operando `true`).
//   · JLS 16.1.2-16.1.4: `a && b`/`a || b` usados como VALOR (`boolean r = c && (x = 1) > 0;`) valen la intersección de
//     «asignada si verdadero» y «asignada si falso» — antes se evaluaban como una secuencia y se aceptaba de más.
//   · JLS 16.2.10-16.2.12: el cuerpo de `while`/`for` entra con «asignada si verdadero» de la condición y el bucle sale
//     con «asignada si falso» (más los `break`); la actualización del `for` y la condición del `do-while` entran con el
//     estado tras el cuerpo Y antes de cada `continue` (antes la actualización veía solo el estado previo al cuerpo).
import type { NodoBloque, NodoDeclaracionLocal, NodoElementoBloque, NodoExpresion, NodoPrograma, NodoSentencia } from '../sintaxis/ast.ts';
import { Alcance } from './alcance.ts';
import { valorConstante, type ValorConstante } from './constantes.ts';
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

/** JLS 16.2.11 ("while(true)"/"for(;;)"): los puntos donde un "break" SIN etiqueta (y, desde la tarea 1.29, un
 * "continue") entregan su estado DE ESE momento -- cada ciclo/switch crea el SUYO propio para su cuerpo (nunca lo hereda de
 * un ciclo/switch envolvente, JLS 14.21: un "break" ahí adentro pertenece al más cercano) y lo reemplaza mientras visita SU
 * cuerpo; `if`/bloque simplemente lo hacen pasar, sin crear uno nuevo. Un "switch" reenvía los "continue" al ciclo que lo
 * envuelve (un "continue" no le pertenece). `null` fuera de todo ciclo/switch (un "break" ahí es error de OTRA pasada,
 * atribucion.ts). */
interface ContextoRuptura {
  readonly registrar: (estado: EstadoFlujo) => void;
  readonly registrarContinue: (estado: EstadoFlujo) => void;
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

/** Al cerrarse un alcance sus variables MUEREN: se olvidan del estado, para que otra variable con el mismo nombre declarada
 * después (o un estado guardado antes de declararla, como el de un `case`) no herede su «asignada». */
function sinLasCerradas(estado: EstadoFlujo, nombresCerrados: readonly string[]): EstadoFlujo {
  return nombresCerrados.reduce(conQuitada, estado);
}

/** JLS 16.1.1: el estado «vacuo» de un punto al que no se llega por ese camino (la rama que una condición constante descarta,
 * lo que sigue a un ciclo sin salida): todas las variables YA declaradas están asignadas, «vacuamente». Solo las de ahora — una
 * variable que se declare después (p. ej. en otro grupo de `case`) empieza sin asignar, como en javac (rango de bits hasta la
 * última variable declarada). */
function todasLasVisibles(alcance: Alcance): EstadoFlujo {
  return new Set(alcance.nombresVisibles());
}

export function verificarAsignacionDefinitiva(programa: NodoPrograma): ProblemaAtribucion[] {
  // Tarea 1.15 (REQ-COMP-008): sin "main" no hay cuerpo que recorrer -- nada que reportar aquí (el
  // error real es de ARRANQUE, pasada 5, no de asignación definitiva).
  if (programa.clase.main === null) return [];
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
  return { estado: sinLasCerradas(estado, alcance.salirBloque()), completaNormal };
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
    // Tarea 1.29 (JLS 4.12.4 + 16.1.1): una `final` con inicializador constante es una VARIABLE CONSTANTE — `if (DEBUG)` con
    // `final boolean DEBUG = true;` es una condición constante (mismo campo que arman `atribucion.ts`/`alcanzabilidad.ts`).
    let constante: ValorConstante | undefined;
    if (declarador.inicializador !== null) {
      estado = visitarExpresion(declarador.inicializador, alcance, estado, problemas);
      estado = conAgregada(estado, declarador.nombre);
      constante = (declaracion.esFinal ? valorConstante(declarador.inicializador, alcance) : null) ?? undefined;
    } else {
      // "conQuitada" importa cuando el MISMO nombre ya vivió antes en un alcance hermano ya
      // cerrado (p. ej. la "i" de un "for" anterior) -- sin esto, una declaración nueva sin
      // inicializador podría heredar por error el "asignada" de una variable homónima previa, ya
      // fuera de alcance (verificado con una prueba dedicada de esta tarea).
      estado = conQuitada(estado, declarador.nombre);
    }
    alcance.declarar({ nombre: declarador.nombre, tipo: declaracion.nombreTipo, esFinal: declaracion.esFinal, rango: declarador.rango, constante });
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
    case 'continue':
      // JLS 16.2.12: el "continue" entrega su estado a la actualización del "for" / la condición del "do-while".
      contextoRuptura?.registrarContinue(entrada);
      return { estado: entrada, completaNormal: false };
    case 'retorno':
      return { estado: entrada, completaNormal: false }; // JLS 14.22: nunca completa normalmente
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
      return visitarSwitch(sentencia, alcance, entrada, contextoRuptura, problemas);
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
  contextoEnvolvente: ContextoRuptura | null,
  problemas: ProblemaAtribucion[],
): ResultadoFlujo {
  const entradaSelector = visitarExpresion(sentencia.selector, alcance, entrada, problemas);
  const tieneDefault = sentencia.elementos.some((elemento) => elemento.tipo === 'etiqueta-default');
  const salidas: EstadoFlujo[] = [];
  const contextoPropio: ContextoRuptura = {
    registrar: (estado) => salidas.push(estado),
    // Un "continue" dentro de un switch no le pertenece: es del ciclo que lo envuelve (tarea 1.29).
    registrarContinue: (estado) => contextoEnvolvente?.registrarContinue(estado),
  };
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
  const cerradas = alcance.salirBloque();
  if (!tieneDefault) return { estado: entradaSelector, completaNormal: true };
  const candidatos = resultadoUltimoGrupo.completaNormal ? [...salidas, resultadoUltimoGrupo.estado] : salidas;
  return {
    estado: sinLasCerradas(candidatos.length > 0 ? combinarEstados(candidatos) : entradaSelector, cerradas),
    completaNormal: salidas.length > 0 || resultadoUltimoGrupo.completaNormal,
  };
}

/** exploracion/03 §4.4 punto 3 (err09, JLS 16.2.10): "while(condición)" con condición NO constante NUNCA garantiza
 * asignación después del ciclo, aun si el cuerpo asigna en TODAS las vueltas -- el compilador no sabe que el cuerpo corre al
 * menos una vez (JLS no razona sobre el valor real de la condición, solo sobre si es una CONSTANTE booleana). El cuerpo SÍ se
 * recorre (para seguir reportando lecturas inválidas dentro de él) y entra con «asignada si verdadero» de la condición; el
 * ciclo SALE con «asignada si falso» de la condición Y el estado de cada `break` (tarea 1.29, JLS 16.2.10). La excepción real
 * de la condición constante `true` (JLS 16.2.11, err08) ya no es un caso aparte: su «asignada si falso» es vacua
 * (`todasLasVisibles`), así que el ciclo solo sale por sus `break` — y sin ninguno nada sigue al ciclo (alcanzabilidad.ts ya
 * lo rechaza aparte). */
function visitarWhile(
  sentencia: Extract<NodoSentencia, { tipo: 'while' }>,
  alcance: Alcance,
  entrada: EstadoFlujo,
  problemas: ProblemaAtribucion[],
): ResultadoFlujo {
  const condicion = visitarCondicion(sentencia.condicion, alcance, entrada, problemas);
  const salidas: EstadoFlujo[] = [];
  // Un "continue" de un while vuelve a evaluar la condición: no cambia lo que sigue al ciclo (solo se rastrea el "break").
  const contextoPropio: ContextoRuptura = { registrar: (estado) => salidas.push(estado), registrarContinue: () => undefined };
  visitarSentencia(sentencia.cuerpo, alcance, condicion.siVerdadero, contextoPropio, problemas);
  return { estado: combinarEstados([condicion.siFalso, ...salidas]), completaNormal: true };
}

/** exploracion/03 §4.4 punto 5 (err10, JLS 16.2.12): mismo principio que `visitarWhile` para "for(condición)". El propio
 * "for" abre su alcance (sus variables cubren condición, actualización y cuerpo -- mismo patrón que `atribucion.ts`/
 * `alcanzabilidad.ts`). "for(;;)" (condición OMITIDA) cuenta como constante "true" (JLS 14.21): su «asignada si falso» es
 * vacua. Tarea 1.29: la actualización entra con el estado tras el cuerpo Y antes de cada `continue` (`for (…; i += x) { x = 1; }`
 * compila; con un `continue` antes de asignar, no), y sin ninguno de los dos (el cuerpo termina siempre en `break`/`return`) la
 * actualización no se alcanza y es vacua. */
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
  // "for(;;)" (condición ausente) = constante `true`: entra tal cual y su «si falso» es vacuo.
  const condicion: EstadosDeCondicion =
    sentencia.condicion !== null ? visitarCondicion(sentencia.condicion, alcance, estado, problemas) : { siVerdadero: estado, siFalso: todasLasVisibles(alcance) };
  const entradaCuerpo = condicion.siVerdadero;
  const salidaDeLaCondicion = condicion.siFalso;
  const salidas: EstadoFlujo[] = [];
  const continues: EstadoFlujo[] = [];
  const contextoPropio: ContextoRuptura = { registrar: (e) => salidas.push(e), registrarContinue: (e) => continues.push(e) };
  const resCuerpo = visitarSentencia(sentencia.cuerpo, alcance, entradaCuerpo, contextoPropio, problemas);
  const antesDeActualizar = [...(resCuerpo.completaNormal ? [resCuerpo.estado] : []), ...continues];
  let estadoActualizacion = antesDeActualizar.length > 0 ? combinarEstados(antesDeActualizar) : todasLasVisibles(alcance);
  for (const expresionSentencia of sentencia.actualizacion) {
    estadoActualizacion = visitarExpresion(expresionSentencia.expresion, alcance, estadoActualizacion, problemas);
  }
  const cerradas = alcance.salirBloque();
  return { estado: sinLasCerradas(combinarEstados([salidaDeLaCondicion, ...salidas]), cerradas), completaNormal: true };
}

/** exploracion/03 §4.4 punto 6 (err10b, JLS 14.22.2/16.2.11): el cuerpo de "do-while" corre SIEMPRE al menos una vez, sin
 * importar la condición (a diferencia de `visitarWhile`/`visitarFor`) -- si completa normal (sin "return"/"break" propio), su
 * estado YA es una garantía real después del ciclo. Tarea 1.29 (JLS 16.2.11): la condición entra con el estado tras el cuerpo
 * Y antes de cada `continue` (un `continue` que salta sobre la asignación la deja sin asignar), y el ciclo sale con
 * «asignada si falso» de la condición Y el estado de cada `break`. */
function visitarDoWhile(
  sentencia: Extract<NodoSentencia, { tipo: 'do-while' }>,
  alcance: Alcance,
  entrada: EstadoFlujo,
  problemas: ProblemaAtribucion[],
): ResultadoFlujo {
  const salidas: EstadoFlujo[] = [];
  const continues: EstadoFlujo[] = [];
  const contextoPropio: ContextoRuptura = { registrar: (estado) => salidas.push(estado), registrarContinue: (estado) => continues.push(estado) };
  const resCuerpo = visitarSentencia(sentencia.cuerpo, alcance, entrada, contextoPropio, problemas);
  const antesDeLaCondicion = [...(resCuerpo.completaNormal ? [resCuerpo.estado] : []), ...continues];
  const entradaCondicion = antesDeLaCondicion.length > 0 ? combinarEstados(antesDeLaCondicion) : todasLasVisibles(alcance);
  const condicion = visitarCondicion(sentencia.condicion, alcance, entradaCondicion, problemas);
  return { estado: combinarEstados([condicion.siFalso, ...salidas]), completaNormal: true };
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
  const { siVerdadero: entradaSiVerdadero, siFalso: entradaSiFalso } = visitarCondicion(sentencia.condicion, alcance, entrada, problemas);
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

/** Los dos estados que deja una expresión BOOLEANA (JLS 16.1): la variable puede estar asignada «si la expresión vale verdadero» y/o
 * «si vale falso». */
interface EstadosDeCondicion {
  readonly siVerdadero: EstadoFlujo;
  readonly siFalso: EstadoFlujo;
}

/**
 * Visita una condición y devuelve sus DOS estados (JLS 16.1), reportando las lecturas inválidas en el mismo recorrido — cada
 * subexpresión se visita UNA sola vez (una primera versión calculaba los estados por separado desde cada nivel y su costo crecía como
 * n⁴ con la longitud de una cadena de `&&`).
 *   - Constante (JLS 16.1.1): `true` deja «vacuamente» todo asignado «si falso» y `false` «si verdadero» (`todasLasVisibles`); el
 *     otro estado es la entrada (una constante no asigna nada).
 *   - `a && b` (JLS 16.1.2): `b` solo se evalúa si `a` fue verdadera, así que entra con el «si verdadero» de `a`; «si verdadero» es el
 *     de `b`, «si falso» la intersección de los dos «si falso» (cualquiera de los dos pudo hacer falso el resultado).
 *   - `a || b` (JLS 16.1.3): espejo — `b` entra con el «si falso» de `a`.
 *   - `!a` (JLS 16.1.4): intercambia verdadero y falso.
 *   - Cualquier otra expresión (comparaciones, llamadas, nombres, asignaciones…): los dos estados son el estado tras evaluarla.
 */
function visitarCondicion(expresion: NodoExpresion, alcance: Alcance, entrada: EstadoFlujo, problemas: ProblemaAtribucion[]): EstadosDeCondicion {
  const constante = valorConstante(expresion, alcance);
  if (constante !== null && constante.tipo === 'boolean') {
    const vacuo = todasLasVisibles(alcance);
    return constante.valor ? { siVerdadero: entrada, siFalso: vacuo } : { siVerdadero: vacuo, siFalso: entrada };
  }
  if (expresion.tipo === 'binaria' && expresion.operador === '&&') {
    const izquierda = visitarCondicion(expresion.izquierda, alcance, entrada, problemas);
    const derecha = visitarCondicion(expresion.derecha, alcance, izquierda.siVerdadero, problemas);
    return { siVerdadero: derecha.siVerdadero, siFalso: combinarEstados([izquierda.siFalso, derecha.siFalso]) };
  }
  if (expresion.tipo === 'binaria' && expresion.operador === '||') {
    const izquierda = visitarCondicion(expresion.izquierda, alcance, entrada, problemas);
    const derecha = visitarCondicion(expresion.derecha, alcance, izquierda.siFalso, problemas);
    return { siVerdadero: combinarEstados([izquierda.siVerdadero, derecha.siVerdadero]), siFalso: derecha.siFalso };
  }
  if (expresion.tipo === 'unaria' && expresion.operador === '!') {
    const operando = visitarCondicion(expresion.operando, alcance, entrada, problemas);
    return { siVerdadero: operando.siFalso, siFalso: operando.siVerdadero };
  }
  const despues = visitarExpresion(expresion, alcance, entrada, problemas);
  return { siVerdadero: despues, siFalso: despues };
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
      if (expresion.operador === '&&' || expresion.operador === '||') {
        // JLS 16.1.2/16.1.3 (tarea 1.29): el valor completo vale la intersección de «asignada si verdadero» y «asignada si falso».
        const estados = visitarCondicion(expresion, alcance, entrada, problemas);
        return combinarEstados([estados.siVerdadero, estados.siFalso]);
      }
      const trasIzquierda = visitarExpresion(expresion.izquierda, alcance, entrada, problemas);
      return visitarExpresion(expresion.derecha, alcance, trasIzquierda, problemas);
    }
    case 'unaria': {
      if (expresion.operador === '!') {
        // JLS 16.1.4: el operando de `!` es una CONDICIÓN — una constante booleana no se recorre (javac no le exige estar asignada,
        // igual que como operando de `&&`/`||`); el valor completo vale la intersección de sus dos estados.
        const estados = visitarCondicion(expresion, alcance, entrada, problemas);
        return combinarEstados([estados.siVerdadero, estados.siFalso]);
      }
      return visitarExpresion(expresion.operando, alcance, entrada, problemas);
    }
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
