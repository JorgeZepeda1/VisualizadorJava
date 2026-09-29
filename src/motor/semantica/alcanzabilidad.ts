// Alcanzabilidad (tarea 1.12, JLS 14.22, REQ-COMP-010) — pasada 3 de ADR 004. Standalone por
// ahora, igual que `atribucion.ts` (pasada 2): 1.14 conecta ambas a `compilador.ts`, fuera de este
// sub-lote. Recorre TODO el árbol (nunca se detiene en el primer problema) y devuelve la lista
// COMPLETA ordenada por posición, mismo patrón que `atribuir()`/`recolectarNoSoportados`.
//
// Reglas reales (JLS 14.22), restringidas al subconjunto:
// - `return`/`break`/`continue`: NUNCA completan normalmente — lo que sigue en el MISMO bloque es
//   inalcanzable.
// - declaración local / sentencia vacía / sentencia de expresión / impresión / no-soportado:
//   SIEMPRE completan normalmente (si son alcanzables) — no traen control de flujo propio.
// - `if` SIN `else`: completa normalmente SIEMPRE que sea alcanzable, sin importar el "then" — el
//   "then" es alcanzable si el `if` lo es, SIN USAR el valor de la condición (design.md §2.7:
//   "if(false) exento" — asimetría real y deliberada de JLS respecto a while/for, para permitir
//   "comentar con if(false)").
// - `if` CON `else`: completa normalmente sii el "then" O el "sino" completan normalmente. AMBAS
//   ramas son alcanzables si el `if` lo es (misma exención que arriba, nunca se usa la condición).
// - `while`/`do-while`/`for`: el cuerpo es alcanzable sii el ciclo es alcanzable Y la condición NO
//   es la constante `false` (`do-while` siempre alcanza su cuerpo: corre al menos una vez,
//   IGNORANDO la condición para esto). Un cuerpo inalcanzable se reporta EL CUERPO MISMO (la «{» de un
//   bloque, aunque esté vacío), como javac (tarea 1.29). `while`/`for` completan normalmente sii NO
//   tienen una condición constante `true` (un `for` SIN condición cuenta como `true`, JLS 14.21) O
//   tienen un `break` alcanzable que los cierra (`contieneBreakQueSaleDelCiclo`, JLS 14.21). Un
//   `do-while` completa normalmente sii (su cuerpo completa normalmente O tiene un `continue` que lo
//   apunta) Y la condición NO es la constante `true`, O tiene un `break` que lo cierra (JLS 14.22,
//   tarea 1.29).
// - `switch`: fuera de alcance a propósito (D2, conservador — ver la nota en `visitarSentencia`).
// - bloque: cada elemento es alcanzable sii el anterior completa normalmente (el primero, sii el
//   bloque en sí lo es); el bloque completa normalmente sii su ÚLTIMO elemento procesado completa
//   normalmente (vacío: sii el bloque en sí es alcanzable).
//
// Deuda 3 del commit 999a8ca (JLS 4.12.4, "variable constante"): una condición constante puede
// venir de una variable `final` con inicializador constante, no solo de un literal — se resuelve
// con las MISMAS `valorConstante`/`Alcance` de `constantes.ts`/`atribucion.ts` (por eso esta pasada
// declara sus propios símbolos según recorre, en su PROPIO `Alcance` — cada pasada es
// independiente todavía, 1.14 las unifica).
import type {
  NodoBloque,
  NodoDeclaracionLocal,
  NodoElementoBloque,
  NodoElementoSwitch,
  NodoExpresion,
  NodoFor,
  NodoIf,
  NodoPrograma,
  NodoSentencia,
  NodoSwitch,
} from '../sintaxis/ast.ts';
import { Alcance } from './alcance.ts';
import { valorConstante } from './constantes.ts';
import type { ProblemaAtribucion } from './diagnostico.ts';

export function verificarAlcanzabilidad(programa: NodoPrograma): ProblemaAtribucion[] {
  // Tarea 1.15 (REQ-COMP-008): sin "main" no hay cuerpo que recorrer -- nada que reportar aquí (el
  // error real es de ARRANQUE, pasada 5, no de alcanzabilidad).
  if (programa.clase.main === null) return [];
  const problemas: ProblemaAtribucion[] = [];
  const alcance = new Alcance();
  alcance.entrarBloque();
  alcance.declarar({
    nombre: programa.clase.main.parametro,
    tipo: 'desconocido',
    esFinal: false,
    rango: programa.clase.main.rango,
  });
  visitarBloque(programa.clase.main.cuerpo, alcance, true, problemas);
  alcance.salirBloque();
  return problemas.slice().sort((a, b) => a.rango.inicio - b.rango.inicio);
}

/** Devuelve si el BLOQUE completo completa normalmente. Reporta un problema por CADA elemento que
 * empieza siendo inalcanzable (incluidos los anidados en una rama ya muerta — recursivo, sin
 * suprimir cascadas: ver la cabecera del archivo, "collect everything" es el mismo patrón que
 * `atribuir()`). */
function visitarBloque(bloque: NodoBloque, alcance: Alcance, alcanzable: boolean, problemas: ProblemaAtribucion[]): boolean {
  alcance.entrarBloque();
  let actual = alcanzable;
  let completaNormal = alcanzable; // bloque vacío: completa normal sii el bloque en sí es alcanzable
  for (const elemento of bloque.elementos) {
    if (!actual) {
      problemas.push({ codigo: 'sentencia-inalcanzable', rango: elemento.rango, datos: {} });
    }
    completaNormal = visitarElemento(elemento, alcance, actual, problemas);
    actual = completaNormal;
  }
  alcance.salirBloque();
  return completaNormal;
}

function visitarElemento(
  elemento: NodoElementoBloque,
  alcance: Alcance,
  alcanzable: boolean,
  problemas: ProblemaAtribucion[],
): boolean {
  if (elemento.tipo === 'declaracion-local') {
    visitarDeclaracionLocal(elemento, alcance);
    return alcanzable; // una declaración simple completa normal sii es alcanzable
  }
  return visitarSentencia(elemento, alcance, alcanzable, problemas);
}

/** Solo scoping + el campo "constante" (deuda 3) — la validez del tipo/asignación ya la reporta
 * `atribucion.ts` (pasada 2); esta pasada NUNCA reporta un problema al declarar. */
function visitarDeclaracionLocal(declaracion: NodoDeclaracionLocal, alcance: Alcance): void {
  for (const declarador of declaracion.declaradores) {
    const valorInicializador = declarador.inicializador !== null ? valorConstante(declarador.inicializador, alcance) : null;
    const constante = declaracion.esFinal && valorInicializador !== null ? valorInicializador : undefined;
    alcance.declarar({
      nombre: declarador.nombre,
      tipo: declaracion.nombreTipo,
      esFinal: declaracion.esFinal,
      rango: declarador.rango,
      constante,
    });
  }
}

function visitarSentencia(
  sentencia: NodoSentencia,
  alcance: Alcance,
  alcanzable: boolean,
  problemas: ProblemaAtribucion[],
): boolean {
  switch (sentencia.tipo) {
    case 'bloque':
      return visitarBloque(sentencia, alcance, alcanzable, problemas);
    case 'retorno':
    case 'break':
    case 'continue':
      return false; // JLS 14.22: nunca completan normalmente
    case 'sentencia-vacia':
    case 'sentencia-expresion':
    case 'impresion':
    case 'no-soportado':
      return alcanzable;
    case 'if':
      return visitarIf(sentencia, alcance, alcanzable, problemas);
    case 'while':
      return visitarCiclo(sentencia.condicion, sentencia.cuerpo, false, alcance, alcanzable, problemas);
    case 'do-while':
      return visitarCiclo(sentencia.condicion, sentencia.cuerpo, true, alcance, alcanzable, problemas);
    case 'for':
      return visitarFor(sentencia, alcance, alcanzable, problemas);
    case 'switch':
      return visitarSwitch(sentencia, alcance, alcanzable, problemas);
  }
}

/**
 * Corrección obligatoria (sub-lote 1-D2a, JLS 14.22): reemplaza el conservador "return alcanzable"
 * de antes (que NUNCA bajaba a los elementos del switch). Reglas reales, verificadas contra javac
 * 17 real (carpetas temporales, borradas al terminar): un switch completa normalmente sii (a) NO
 * tiene "default" (el selector podría no coincidir con ningún "case": el switch entero se salta) —
 * O (b) tiene un "break" que estructuralmente le pertenece (`contieneBreakQueSaleDelSwitch`, SIN
 * filtrar por si ese break en sí es alcanzable — un break MUERTO tras un "return" en el mismo grupo
 * TODAVÍA cuenta, igual que ya hacen los ciclos de 1.12: javac reporta un único error, el del break
 * muerto, no un segundo error en lo que sigue) — O (c) el ÚLTIMO grupo (el que quedó procesado al
 * final del recorrido secuencial) completa normal por sí mismo (cae al fondo del switch sin
 * return/throw/break, incluido un grupo vacío al final).
 *
 * El recorrido secuencial honra la caída real (fallthrough, design.md §2.3: "el cuerpo es una
 * secuencia PLANA de etiquetas y elementos"): cada etiqueta ("case"/"default") es un destino de
 * salto válido por sí misma — verificado contra javac que un "return" en un grupo NUNCA vuelve
 * inalcanzable la PRIMERA sentencia del grupo siguiente (se puede saltar ahí directo) — así que
 * "actual" se REINICIA a `alcanzable` (el del switch en sí, nunca el estado de caída del grupo
 * anterior) en cada etiqueta; dentro de un mismo grupo (sin etiqueta de por medio) la reachability
 * es secuencial normal, igual que un bloque.
 */
function visitarSwitch(sentencia: NodoSwitch, alcance: Alcance, alcanzable: boolean, problemas: ProblemaAtribucion[]): boolean {
  const tieneDefault = sentencia.elementos.some((elemento) => elemento.tipo === 'etiqueta-default');
  const tieneBreakQueSale = contieneBreakQueSaleDelSwitch(sentencia.elementos);
  alcance.entrarBloque();
  let actual = alcanzable;
  // switch vacío, o que termina en una etiqueta sin sentencias tras ella (grupo final vacío): cae
  // al fondo sii el switch en sí es alcanzable.
  let completaUltimoGrupo = alcanzable;
  for (const elemento of sentencia.elementos) {
    if (elemento.tipo === 'etiqueta-case' || elemento.tipo === 'etiqueta-default') {
      actual = alcanzable;
      completaUltimoGrupo = alcanzable;
      continue;
    }
    if (!actual) {
      problemas.push({ codigo: 'sentencia-inalcanzable', rango: elemento.rango, datos: {} });
    }
    completaUltimoGrupo = visitarElemento(elemento, alcance, actual, problemas);
    actual = completaUltimoGrupo;
  }
  alcance.salirBloque();
  return alcanzable && (!tieneDefault || tieneBreakQueSale || completaUltimoGrupo);
}

/** ¿Hay un `break` que estructuralmente pertenece a ESTE switch (nunca a un ciclo/switch anidado —
 * reusa `contieneBreakQueSaleDelCiclo`, misma frontera de JLS 14.21) en alguno de sus elementos?
 * PURAMENTE estructural, sin filtrar por alcanzabilidad — verificado contra javac 17 real que un
 * "break" ya muerto (p. ej. tras un "return" incondicional en el mismo grupo, sin etiqueta de por
 * medio) TODAVÍA cuenta para esta regla. */
function contieneBreakQueSaleDelSwitch(elementos: readonly NodoElementoSwitch[]): boolean {
  return elementos.some((elemento) => {
    if (elemento.tipo === 'etiqueta-case' || elemento.tipo === 'etiqueta-default' || elemento.tipo === 'declaracion-local') {
      return false;
    }
    return contieneBreakQueSaleDelCiclo(elemento);
  });
}

function visitarIf(sentencia: NodoIf, alcance: Alcance, alcanzable: boolean, problemas: ProblemaAtribucion[]): boolean {
  const completaEntonces = visitarSentencia(sentencia.entonces, alcance, alcanzable, problemas);
  if (sentencia.sino === null) return alcanzable; // if sin else: SIEMPRE completa normal si es alcanzable
  const completaSino = visitarSentencia(sentencia.sino, alcance, alcanzable, problemas);
  return completaEntonces || completaSino;
}

function visitarCiclo(
  condicion: NodoExpresion,
  cuerpo: NodoSentencia,
  esDoWhile: boolean,
  alcance: Alcance,
  alcanzable: boolean,
  problemas: ProblemaAtribucion[],
): boolean {
  const condicionFalsa = esCondicionConstante(condicion, alcance, false);
  const condicionVerdadera = esCondicionConstante(condicion, alcance, true);
  // "do-while" SIEMPRE ejecuta su cuerpo al menos una vez (JLS 14.22.2) — ignora la condición para
  // esto, a diferencia de "while"/"for" (JLS 14.22.1/.4).
  const cuerpoAlcanzable = esDoWhile ? alcanzable : alcanzable && !condicionFalsa;
  const cuerpoCompleta = visitarCuerpoDeCiclo(cuerpo, alcanzable, cuerpoAlcanzable, alcance, problemas);
  const tieneBreakQueSale = contieneBreakQueSaleDelCiclo(cuerpo);
  if (esDoWhile) {
    // JLS 14.22.2: la condición del do-while solo se alcanza si el cuerpo completa normalmente o hay un `continue` que la
    // apunta; con la condición constante `true` el ciclo no termina por ella, solo por un `break`.
    const alcanzaLaCondicion = cuerpoCompleta || contieneContinueQueApuntaAlCiclo(cuerpo);
    return alcanzable && ((alcanzaLaCondicion && !condicionVerdadera) || tieneBreakQueSale);
  }
  return alcanzable && (!condicionVerdadera || tieneBreakQueSale);
}

/** Tarea 1.29 (JLS 14.22.1/.4): el cuerpo de un `while`/`for` con condición constante `false` es una sentencia INALCANZABLE en
 * sí misma — javac la señala a ella (la «{» de un bloque, aunque esté vacío; antes solo se miraban las sentencias DENTRO del
 * bloque, así que `while (false) { }` pasaba) y sigue analizando su interior como vivo, sin cascadas (modo de recuperación).
 * Devuelve si el cuerpo completa normalmente. */
function visitarCuerpoDeCiclo(
  cuerpo: NodoSentencia,
  cicloAlcanzable: boolean,
  cuerpoAlcanzable: boolean,
  alcance: Alcance,
  problemas: ProblemaAtribucion[],
): boolean {
  if (cicloAlcanzable && !cuerpoAlcanzable) {
    problemas.push({ codigo: 'sentencia-inalcanzable', rango: cuerpo.rango, datos: {} });
    return visitarSentencia(cuerpo, alcance, true, problemas);
  }
  return visitarSentencia(cuerpo, alcance, cuerpoAlcanzable, problemas);
}

function visitarFor(sentencia: NodoFor, alcance: Alcance, alcanzable: boolean, problemas: ProblemaAtribucion[]): boolean {
  // El propio "for" abre su alcance (variables de inicialización) — igual que atribucion.ts.
  alcance.entrarBloque();
  if (sentencia.inicializacionDeclaracion !== null) {
    visitarDeclaracionLocal(sentencia.inicializacionDeclaracion, alcance);
  }
  const condicion = sentencia.condicion;
  // "for(;;)" (condición OMITIDA) cuenta como constante `true` (JLS 14.21, igual que while(true)).
  const condicionFalsa = condicion !== null && esCondicionConstante(condicion, alcance, false);
  const condicionVerdadera = condicion === null || esCondicionConstante(condicion, alcance, true);
  const cuerpoAlcanzable = alcanzable && !condicionFalsa;
  visitarCuerpoDeCiclo(sentencia.cuerpo, alcanzable, cuerpoAlcanzable, alcance, problemas);
  const tieneBreakQueSale = contieneBreakQueSaleDelCiclo(sentencia.cuerpo);
  alcance.salirBloque();
  return alcanzable && (!condicionVerdadera || tieneBreakQueSale);
}

/** ¿`condicion` es una expresión constante (JLS 15.29, variables `final` constantes incluidas —
 * deuda 3 del commit 999a8ca) de valor EXACTAMENTE `valorEsperado`? Compartido con la tarea 1.13
 * (REFACTOR pedido por 1.12, asignación definitiva también necesita "condición constante"). */
export function esCondicionConstante(condicion: NodoExpresion, alcance: Alcance, valorEsperado: boolean): boolean {
  const constante = valorConstante(condicion, alcance);
  return constante !== null && constante.tipo === 'boolean' && constante.valor === valorEsperado;
}

/** Tarea 1.29 (JLS 14.22.2): ¿hay un `continue` SIN etiqueta (1.6: `continueConEtiqueta` es NO-DISP) dentro de `cuerpo` que apunte
 * a ESTE ciclo? Puramente estructural, igual que `contieneBreakQueSaleDelCiclo` (un `continue` ya muerto invalida el programa por
 * otra vía). Desciende en `if`/bloques Y en `switch` — un `continue` dentro de un switch NO es del switch, es del ciclo que lo
 * envuelve —, pero NUNCA en un `while`/`do-while`/`for` anidado (ahí es de ESE ciclo). */
function contieneContinueQueApuntaAlCiclo(sentencia: NodoSentencia): boolean {
  switch (sentencia.tipo) {
    case 'continue':
      return true;
    case 'bloque':
      return sentencia.elementos.some((elemento) => elemento.tipo !== 'declaracion-local' && contieneContinueQueApuntaAlCiclo(elemento));
    case 'if':
      return (
        contieneContinueQueApuntaAlCiclo(sentencia.entonces) ||
        (sentencia.sino !== null && contieneContinueQueApuntaAlCiclo(sentencia.sino))
      );
    case 'switch':
      return sentencia.elementos.some(
        (elemento) =>
          elemento.tipo !== 'etiqueta-case' &&
          elemento.tipo !== 'etiqueta-default' &&
          elemento.tipo !== 'declaracion-local' &&
          contieneContinueQueApuntaAlCiclo(elemento),
      );
    default:
      return false;
  }
}

/** ¿Hay un `break` SIN etiqueta (1.6: `breakConEtiqueta` es NO-DISP — todo `break` de este
 * subconjunto sale del ciclo/switch MÁS CERCANO) alcanzable dentro de `cuerpo` que cierre ESTE
 * ciclo? Desciende en `if`/bloques (no establecen su propio destino de "break"); NUNCA desciende
 * en un `while`/`do-while`/`for`/`switch` anidado (un "break" ahí pertenece a ESE ciclo/switch
 * interno, nunca al que se está analizando aquí — JLS 14.21). */
function contieneBreakQueSaleDelCiclo(sentencia: NodoSentencia): boolean {
  switch (sentencia.tipo) {
    case 'break':
      return true;
    case 'bloque':
      return sentencia.elementos.some(
        (elemento) => elemento.tipo !== 'declaracion-local' && contieneBreakQueSaleDelCiclo(elemento),
      );
    case 'if':
      return (
        contieneBreakQueSaleDelCiclo(sentencia.entonces) ||
        (sentencia.sino !== null && contieneBreakQueSaleDelCiclo(sentencia.sino))
      );
    // while/do-while/for/switch: cualquier "break" ahí adentro pertenece a ESE ciclo/switch más
    // cercano, nunca al que se está analizando aquí. continue/return/sentencia-expresion/etc.: sin
    // "break" propio que aportar.
    default:
      return false;
  }
}
