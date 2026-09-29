// Orquesta compilar(): léxico+sintaxis → atribución → alcanzabilidad → asignación definitiva → IR
// (design.md §1.3, §2.1, ADR 004). El contrato público `ResultadoCompilacion` queda fijo desde la
// tarea 0.12 (REFACTOR de esa tarea) para que el lote 1 solo lo amplíe.
//
// Tarea 1.14 (REQ-COMP-005/006/009): conecta las pasadas 2-4 (`atribucion.ts`/`alcanzabilidad.ts`/
// `asignacion-definitiva.ts`) por primera vez -- hasta ahora cada una tenía su propia prueba
// unitaria, pero NINGUNA la llamaba `compilar()`. ADR 004 punto 2: "se informa el primer problema
// de la PRIMERA pasada que falla" -- nunca el primero por posición cruda en el texto entre pasadas
// distintas (verificado con javac 17 real en `sdd-design`, engram `orden-fases-javac`/
// `orden-flujo-javac`): un error de tipos oculta una variable sin asignar aunque esté antes en el
// texto, y la alcanzabilidad se informa antes que la asignación definitiva. Por eso las 3 pasadas
// son una lista ORDENADA de funciones `(programa) => ProblemaAtribucion[]` (REFACTOR pedido por la
// tarea): se prueban en orden y la PRIMERA con algo que reportar gana, sin mirar las demás.
import { tokenizar } from './lexico/analizador-lexico.ts';
import type { Token } from './lexico/tokens.ts';
import { analizarPrograma } from './sintaxis/analizador-sintactico.ts';
import type { NodoPrograma } from './sintaxis/ast.ts';
import { recolectarNoSoportados, type NoSoportadoColectado } from './sintaxis/no-soportado.ts';
// Tarea 1.24: única fuente de verdad de códigos "no soportado" (el respaldo defensivo de abajo).
import { CODIGOS_NO_SOPORTADO } from './no-soportado.ts';
import { atribuir } from './semantica/atribucion.ts';
import { verificarAlcanzabilidad } from './semantica/alcanzabilidad.ts';
import { verificarAsignacionDefinitiva } from './semantica/asignacion-definitiva.ts';
import { verificarArranque } from './semantica/arranque.ts';
import type { ProblemaAtribucion } from './semantica/diagnostico.ts';
import { ErrorDeEjecucionNoDisponible } from './ir/error-de-ejecucion-no-disponible.ts';
import { generarIr } from './ir/generar-ir.ts';
import type { ProgramaCompilado } from './ir/ir.ts';
import type { CodigoDeSintaxis, Problema, ProblemaNoDisponible } from './problemas.ts';
import { ErrorDeCompilacion } from './error-de-compilacion.ts';
import { TablaDeLineas } from './fuente/tabla-de-lineas.ts';
import type { Rango } from './fuente/rango.ts';

export interface VistaPrograma {
  readonly fuente: string;
}

export type ResultadoCompilacion =
  | { readonly ok: true; readonly programa: ProgramaCompilado; readonly vista: VistaPrograma }
  | { readonly ok: false; readonly problema: Problema; readonly adicionales: number };

// ADR 004: pasadas 2-4, EN ORDEN -- "atribuir" (símbolos/tipos/alcance/switch), luego
// "verificarAlcanzabilidad" (JLS 14.22), luego "verificarAsignacionDefinitiva" (JLS 16). Cada una
// recorre TODO el árbol y devuelve su lista COMPLETA (nunca se detiene en el primer problema, ver
// la cabecera de cada módulo) -- aquí, y SOLO aquí, se decide quedarse con el primero de la PRIMERA
// pasada que reportó algo.
const PASADAS_SEMANTICAS: readonly ((programa: NodoPrograma) => readonly ProblemaAtribucion[])[] = [
  atribuir,
  verificarAlcanzabilidad,
  verificarAsignacionDefinitiva,
];

// Tarea 1.17 (C8, REQ-SUB-006, REQ-SUB-008): detecta lo NO-DISP (léxico y sintáctico) ANTES de
// intentar bajar a IR, para que un programa fuera del subconjunto NUNCA produzca "cero pasos, cero
// errores de sintaxis engañosos" (nunca un `error-compilacion` genérico cuando en realidad es una
// construcción que Java sí acepta). ADR 004: avisos y errores de sintaxis COMPITEN por posición en
// el texto — si el análisis sintáctico se detiene con un error real, pero había un aviso léxico
// ANTES de esa posición, gana el aviso (p. ej. un "\uXXXX" en un comentario que precede a un error
// de sintaxis genuino más adelante) -- ver `avisoEnmascaraError` para el criterio REAL, refinado en
// el sub-lote 1-D5 (cierre de C7).
export function compilar(fuente: string): ResultadoCompilacion {
  let tokens: Token[];
  try {
    tokens = tokenizar(fuente);
  } catch (error) {
    if (!(error instanceof ErrorDeCompilacion)) throw error; // fallo interno (tarea 1.28), ver abajo
    return { ok: false, problema: construirProblema(error, fuente), adicionales: 0 };
  }

  const noSoportadosLexicos = tokens.filter((t) => t.tipo === 'no-soportado');

  try {
    const programaAst = analizarPrograma(tokens);
    const noSoportados = recolectarNoSoportados(programaAst, noSoportadosLexicos);
    if (noSoportados.length > 0) {
      return construirResultadoNoDisponible(noSoportados, fuente);
    }
    for (const pasada of PASADAS_SEMANTICAS) {
      const problemas = pasada(programaAst);
      if (problemas.length > 0) {
        return construirResultadoDeAtribucion(problemas[0]!, fuente);
      }
    }
    const ir = generarIr(programaAst);
    const arranque = verificarArranque(programaAst.clase);
    return { ok: true, programa: { ir, arranque }, vista: { fuente } };
  } catch (error) {
    // Tarea 1.27 (agregada por el orquestador, D2/regla 5 de CLAUDE.md): por construcción, este
    // `catch` solo puede recibir un `ErrorDeEjecucionNoDisponible` DESPUÉS de que `analizarPrograma`
    // ya devolvió un AST válido, `recolectarNoSoportados` ya devolvió cero avisos y las 3 PASADAS
    // SEMÁNTICAS ya devolvieron cero problemas -- es decir, "todas las pasadas semánticas aceptaron
    // el programa" se cumple SIEMPRE que se llega aquí, sin necesitar una bandera aparte. Un tipo
    // PROPIO (nunca un `catch` genérico ni un `instanceof Error` ancho) para no tragarse un bug
    // real de otra fase.
    if (error instanceof ErrorDeEjecucionNoDisponible) {
      return construirResultadoNoDisponible(
        [{ codigo: CODIGOS_NO_SOPORTADO.ejecucionNoDisponible, rango: error.rango, datos: {} }],
        fuente,
      );
    }
    // Tarea 1.28 (agregada por el orquestador, D2/regla 5 de CLAUDE.md): SOLO un `ErrorDeCompilacion`
    // -- el error del ALUMNO, siempre con posición -- es un `error-compilacion`. Cualquier otra
    // excepción (un TypeError, un RangeError por agotar la pila...) es un fallo del propio motor: se
    // propaga, ni siquiera un aviso léxico previo la esconde (un aviso solo puede enmascarar a un
    // error de sintaxis genuino, ver `avisoEnmascaraError`), y el trabajador la convierte en
    // `error-interno`. Antes se disfrazaba de un error de sintaxis en la línea 1 con el mensaje de
    // JavaScript, un resultado inventado en inglés (medición previa a este cambio: 0 de las 2 713
    // fuentes de `corpus/{mutantes,compilacion,curso}` llegaban aquí con una excepción ajena).
    if (!(error instanceof ErrorDeCompilacion)) throw error;
    const avisosAntesDelError = noSoportadosLexicos.filter((t) => avisoEnmascaraError(t, error.rango));
    if (avisosAntesDelError.length > 0) {
      const noSoportados = avisosAntesDelError
        .map((t) => ({ codigo: t.codigo ?? CODIGOS_NO_SOPORTADO.sinClasificar, rango: t.rango, datos: t.datos ?? {} }))
        .sort((a, b) => a.rango.inicio - b.rango.inicio);
      return construirResultadoNoDisponible(noSoportados, fuente);
    }
    return { ok: false, problema: construirProblema(error, fuente), adicionales: 0 };
  }
}

/**
 * Tarea NUEVA (sub-lote 1-D5, cierre de C7 -- mutante real u6-ciclos-anidados-tabla.java#52):
 * ¿este aviso NO-DISP léxico debe ganarle a `rangoError` (un error de sintaxis real, posterior)?
 * Antes de esta corrección, la regla era una sola comparación de POSICIÓN (`t.rango.inicio <=
 * rangoError.inicio`) para CUALQUIER aviso -- suficiente mientras `analizarPrimaria` no sabía
 * consumir un token no-soportado dentro de una expresión (SIEMPRE abortaba ahí mismo, así que el
 * aviso y el error terminaban colocados exactamente en el mismo punto). Ahora que `analizarPrimaria`
 * los consume como una expresión válida (ADR 003 "deja seguir", ver expresiones.ts), un literal
 * hex/octal/binario/float DEJA de ser la causa real de un error que aparece MÁS ADELANTE -- p. ej.
 * un "for" cuya condición contiene un literal float NO-DISP pero a la que igual le falta su propio
 * ";" real (verificado contra javac 17 real: rechaza con "';' expected", un problema estructural
 * del "for", INDEPENDIENTE de que el literal sea float). Distinción real, verificada contra javac
 * 17 (ambos fixtures REALES de `corpus/compilacion/avisos/`, sub-lote 1-D5):
 *   - `\uXXXX` (`escape-unicode-no-soportado`, JLS 3.3): la traducción real NUNCA se implementa
 *     (D2 explícito, ver la cabecera de `analizador-lexico.ts`) -- así que SIEMPRE debe ganar,
 *     incluso sobre un error posterior no colocado (p. ej. `07-escape-unicode-en-comentario.java`:
 *     un "A" dentro de un comentario de línea dejaba a `int x = 5;` sin su propio punto de
 *     entrada esperado tras la corrección de expresiones.ts -- pero javac SÍ compila ese programa
 *     limpio, verificado; reportar "error-compilacion" ahí sería INVENTAR un rechazo que javac
 *     nunca da, peor que la simplificación actual).
 *   - Cualquier OTRO no-soportado léxico (literal hex/octal/binario/float...): un VALOR real y
 *     bien entendido que simplemente no se RENDERIZA -- una vez que `analizarPrimaria` lo consume
 *     sin abortar, solo debe seguir ganando si el error cae DENTRO de su propio rango (colocado,
 *     el mismo caso de siempre para un no-soportado que TODAVÍA no sepa consumir alguna otra parte
 *     de la gramática) -- nunca sobre un problema estructural genuinamente posterior e
 *     independiente.
 */
function avisoEnmascaraError(aviso: Token, rangoError: Rango): boolean {
  if (aviso.rango.inicio > rangoError.inicio) return false;
  if (aviso.codigo === 'escape-unicode-no-soportado') return true;
  return rangoError.inicio < aviso.rango.fin;
}

// Tarea 1.14: `ProblemaAtribucion` (semantica/diagnostico.ts) es deliberadamente angosto -- ni
// `categoria` (normalmente 'error-compilacion'; ver la corrección de abajo) ni `linea` (se calcula
// aquí, mismo patrón que ya usa `construirResultadoNoDisponible`).
//
// Corrección de la tarea 1.24 (hallazgo real): este `return` IGNORABA `problema.categoria` y
// SIEMPRE devolvía 'error-compilacion' -- correcto cuando esta función se escribió (tarea 1.14,
// antes de que la pasada de atribución pudiera producir NO-DISP), pero la tarea 1.19 (sub-lote
// 1-D2c) conectó la biblioteca real a `atribuir()`, que desde entonces SÍ devuelve
// `categoria:'no-disponible'` para un miembro real-pero-no-soportado (`s.split`, `Math.sin`...) --
// sin este fix, `compilar()` completo mostraba esos avisos con el ícono/título de "Error de
// compilación" en vez de "No disponible en el visualizador" (D2, REQ-SUB-006). `atribuir()` en
// aislamiento ya lo hacía bien (atribucion.test.ts); solo esta orquestación se había quedado atrás.
function construirResultadoDeAtribucion(problema: ProblemaAtribucion, fuente: string): ResultadoCompilacion {
  const tabla = new TablaDeLineas(fuente);
  const { linea } = tabla.ubicar(problema.rango.inicio);
  // Tarea 1.28: `ProblemaAtribucion` y `Problema` son uniones discriminadas (el código estrecha los
  // datos); al copiar con `...problema` cada miembro conserva SU pareja código/datos, sin cast.
  if (problema.categoria === 'no-disponible') {
    return { ok: false, adicionales: 0, problema: { ...problema, linea } };
  }
  return { ok: false, adicionales: 0, problema: { ...problema, categoria: 'error-compilacion', linea } };
}

function construirResultadoNoDisponible(
  noSoportados: readonly NoSoportadoColectado[],
  fuente: string,
): ResultadoCompilacion {
  const [primero, ...resto] = noSoportados;
  const tabla = new TablaDeLineas(fuente);
  const { linea } = tabla.ubicar(primero.rango.inicio);
  // Tarea 1.25 (EL hallazgo: `datos: {}` fijo aquí, sin importar `primero.codigo`, era la causa raíz
  // de que 4 textos le mostraran "undefined" al alumno). `primero.datos` ya viene correctamente
  // construido desde el emisor real (léxico o sintaxis, ambos verificados contra
  // `DatosPorCodigoNoSoportado` en su propio sitio de construcción, ver `motor/no-soportado.ts`).
  //
  // Tarea 1.28: `Problema` es una unión discriminada (`problemas.ts`) y `NoSoportadoColectado` sigue
  // siendo una COPIA ancha (`codigo: CodigoNoSoportado`, `datos: Record<string, unknown>`), a propósito
  // (1.25): TypeScript no puede probar que la pareja código/datos sobrevive a la copia, aunque en
  // ejecución sea la MISMA que verificó su emisor — el `as` es seguro por construcción, no un escape
  // general de tipos (mismo criterio que `analizarPrimaria`, `sintaxis/expresiones.ts`). Se eligen los
  // cinco campos a mano, como siempre, y NO se copia con `...primero`: los avisos sintácticos son los
  // propios nodos del árbol (`recolectarNoSoportados`) y traen su `tipo` interno, que no es parte de
  // un `Problema`.
  const problema = {
    categoria: 'no-disponible',
    codigo: primero.codigo,
    rango: primero.rango,
    linea,
    datos: primero.datos,
  } as ProblemaNoDisponible;
  return { ok: false, adicionales: resto.length, problema };
}

function construirProblema(error: ErrorDeCompilacion, fuente: string): Problema {
  const tabla = new TablaDeLineas(fuente);
  const { linea } = tabla.ubicar(error.rango.inicio);
  return {
    categoria: 'error-compilacion',
    codigo: codigoDeSintaxis(error),
    rango: error.rango,
    linea,
    datos: { mensaje: error.message },
  };
}

// Tarea 1.11 (cierre de CodigoProblema): `CursorDeTokens.esperarTexto` ya guarda el texto exacto
// que esperaba (";", ")"…) en `ErrorDeCompilacion.esperado` — aquí solo se traduce a un código real
// del catálogo, sin tener que tocar cada punto donde el analizador llama `esperarTexto`. Lo que no
// mapea a un caso conocido (`esperarTipo`, errores léxicos, EOF inesperado…) sigue con el
// catch-all honesto de siempre — nunca un código inventado para un caso no verificado (D2).
const CODIGOS_POR_TEXTO_ESPERADO: Readonly<Record<string, CodigoDeSintaxis>> = {
  ';': 'falta-punto-y-coma',
  ')': 'falta-parentesis-cierre',
};

function codigoDeSintaxis(error: ErrorDeCompilacion): CodigoDeSintaxis {
  // Sub-lote 1-D1: un código DIRECTO (`else-sin-if`, `fin-de-archivo-inesperado`…) gana sobre la
  // tabla indirecta de `esperado` — ver la nota de `ErrorDeCompilacion.codigo`.
  if (error.codigo !== undefined) return error.codigo;
  if (error.esperado !== undefined) return CODIGOS_POR_TEXTO_ESPERADO[error.esperado] ?? 'error-no-clasificado';
  return 'error-no-clasificado';
}
