// Pasada de atribución (tarea 1.7, ADR 004 pasada 2): símbolos, alcance/sombreado (REQ-COMP-002/
// 003), selector de `switch` y — pendiente heredado del sub-lote 1-B — contexto de `break`/
// `continue` (verificado contra javac 17 real esta sesión: AMBOS viven en la MISMA pasada que un
// error de tipos, no en alcanzabilidad — ver engram `sdd/visualizador-java/apply-progress`).
//
// Recorre TODO el árbol (nunca se detiene en el primer problema, igual que `recolectarNoSoportados`
// en 1.6/1.17) y devuelve la lista COMPLETA ordenada por posición en el texto; quien la conecte a
// `compilador.ts` (tarea 1.14) decide quedarse solo con el primero, siguiendo ADR 004.
import type {
  NodoAccesoMiembro,
  NodoBloque,
  NodoDeclaracionLocal,
  NodoElementoBloque,
  NodoElementoSwitch,
  NodoExpresion,
  NodoFor,
  NodoLlamada,
  NodoNombre,
  NodoPrograma,
  NodoSentencia,
  NodoSwitch,
} from '../sintaxis/ast.ts';
import { Alcance } from './alcance.ts';
import { valorConstante } from './constantes.ts';
import type { ProblemaAtribucion } from './diagnostico.ts';
import { verificarEtiquetasDeCase, verificarSelectorDeSwitch } from './switch.ts';
import { NOMBRES_DE_CLASE_RECONOCIDOS, tipoDeExpresion, tipoDeNombreDeTipo, type Tipo } from './tipos.ts';
import {
  codigoDeAsignacionInvalida,
  esAsignable,
  esNombreDeTipoValido,
  operandosValidosParaAritmetica,
  sugerenciaDeMayuscula,
  tiposComparablesConIgualdad,
} from './verificaciones-de-tipo.ts';

/** `enCiclo`: hay al menos un `while`/`do-while`/`for` envolvente (destino real de `continue`,
 * que ATRAVIESA cualquier `switch` intermedio — verificado contra javac). `enCicloOSwitch`: además
 * cuenta un `switch` envolvente (destino real de `break`, JLS 14.15/14.21). */
interface ContextoFlujo {
  readonly enCiclo: boolean;
  readonly enCicloOSwitch: boolean;
}

const CONTEXTO_INICIAL: ContextoFlujo = { enCiclo: false, enCicloOSwitch: false };
const CONTEXTO_DENTRO_DE_CICLO: ContextoFlujo = { enCiclo: true, enCicloOSwitch: true };

export function atribuir(programa: NodoPrograma): ProblemaAtribucion[] {
  const problemas: ProblemaAtribucion[] = [];
  const alcance = new Alcance();
  alcance.entrarBloque();
  // El parámetro de main vive en el alcance para que usarlo no dé "variable no declarada";
  // indexarlo ([]) es NO-DISP (arreglos, REQ-SUB-007), ajeno a esta pasada.
  alcance.declarar({
    nombre: programa.clase.main.parametro,
    tipo: 'desconocido',
    esFinal: false,
    rango: programa.clase.main.rango,
  });
  visitarBloque(programa.clase.main.cuerpo, alcance, CONTEXTO_INICIAL, problemas);
  alcance.salirBloque();
  return problemas.slice().sort((a, b) => a.rango.inicio - b.rango.inicio);
}

function visitarBloque(
  bloque: NodoBloque,
  alcance: Alcance,
  contexto: ContextoFlujo,
  problemas: ProblemaAtribucion[],
): void {
  alcance.entrarBloque();
  for (const elemento of bloque.elementos) visitarElementoBloque(elemento, alcance, contexto, problemas);
  alcance.salirBloque();
}

function visitarElementoBloque(
  elemento: NodoElementoBloque,
  alcance: Alcance,
  contexto: ContextoFlujo,
  problemas: ProblemaAtribucion[],
): void {
  if (elemento.tipo === 'declaracion-local') {
    visitarDeclaracionLocal(elemento, alcance, problemas);
    return;
  }
  visitarSentencia(elemento, alcance, contexto, problemas);
}

function visitarDeclaracionLocal(
  declaracion: NodoDeclaracionLocal,
  alcance: Alcance,
  problemas: ProblemaAtribucion[],
): void {
  // err18 de exploracion/03 ("string nombre" en minúscula): el nombre de tipo se valida UNA vez
  // por declaración (no por declarador) — javac lo hace en el mismo punto.
  if (!esNombreDeTipoValido(declaracion.nombreTipo)) {
    problemas.push({
      codigo: 'tipo-no-reconocido',
      rango: declaracion.rango,
      datos: { nombre: declaracion.nombreTipo },
    });
  }
  for (const declarador of declaracion.declaradores) {
    if (declarador.inicializador !== null) {
      visitarExpresion(declarador.inicializador, alcance, problemas);
      // err04/err12 de exploracion/03 (JLS 5.2): solo si el TIPO de destino se reconoce (si no,
      // ya se reportó "tipo-no-reconocido" arriba — nunca dos problemas por la misma causa).
      const destino = tipoDeNombreDeTipo(declaracion.nombreTipo);
      const origen = tipoDeExpresion(declarador.inicializador, alcance);
      if (destino !== 'desconocido' && !esAsignable(origen, destino, valorConstante(declarador.inicializador, alcance))) {
        problemas.push({
          codigo: codigoDeAsignacionInvalida(origen, destino),
          rango: declarador.inicializador.rango,
          datos: { origen, destino },
        });
      }
    }
    const resultado = alcance.declarar({
      nombre: declarador.nombre,
      tipo: declaracion.nombreTipo,
      esFinal: declaracion.esFinal,
      rango: declarador.rango,
    });
    if (!resultado.ok) {
      problemas.push({
        codigo: 'variable-ya-definida',
        rango: declarador.rango,
        datos: { nombre: declarador.nombre, rangoExistente: resultado.existente.rango },
      });
    }
  }
}

function visitarSentencia(
  sentencia: NodoSentencia,
  alcance: Alcance,
  contexto: ContextoFlujo,
  problemas: ProblemaAtribucion[],
): void {
  switch (sentencia.tipo) {
    case 'bloque':
      visitarBloque(sentencia, alcance, contexto, problemas);
      return;
    case 'impresion':
      // Corrección obligatoria (sub-lote 1-C2): "println()" sin argumentos tiene `argumento:null`
      // (nunca hay símbolos que resolver en ese caso).
      if (sentencia.argumento !== null) visitarExpresion(sentencia.argumento, alcance, problemas);
      return;
    case 'retorno':
    case 'sentencia-vacia':
    case 'no-soportado':
      return;
    case 'sentencia-expresion':
      visitarExpresion(sentencia.expresion, alcance, problemas);
      return;
    case 'if':
      visitarExpresion(sentencia.condicion, alcance, problemas);
      verificarCondicionBooleana(sentencia.condicion, alcance, problemas);
      visitarSentencia(sentencia.entonces, alcance, contexto, problemas);
      if (sentencia.sino !== null) visitarSentencia(sentencia.sino, alcance, contexto, problemas);
      return;
    case 'while':
      visitarExpresion(sentencia.condicion, alcance, problemas);
      verificarCondicionBooleana(sentencia.condicion, alcance, problemas);
      visitarSentencia(sentencia.cuerpo, alcance, CONTEXTO_DENTRO_DE_CICLO, problemas);
      return;
    case 'do-while':
      visitarSentencia(sentencia.cuerpo, alcance, CONTEXTO_DENTRO_DE_CICLO, problemas);
      visitarExpresion(sentencia.condicion, alcance, problemas);
      verificarCondicionBooleana(sentencia.condicion, alcance, problemas);
      return;
    case 'for':
      visitarFor(sentencia, alcance, problemas);
      return;
    case 'switch':
      visitarSwitch(sentencia, alcance, contexto, problemas);
      return;
    case 'break':
      if (!contexto.enCicloOSwitch) {
        problemas.push({ codigo: 'break-fuera-de-contexto', rango: sentencia.rango, datos: {} });
      }
      return;
    case 'continue':
      if (!contexto.enCiclo) {
        problemas.push({ codigo: 'continue-fuera-de-contexto', rango: sentencia.rango, datos: {} });
      }
      return;
  }
}

/** err13/err33 de exploracion/03 ("incompatible types: int cannot be converted to boolean"): la
 * condición de `if`/`while`/`do-while`/`for` debe ser `boolean` — Java NUNCA trata un número como
 * verdadero/falso (a diferencia de JS/Python). `'desconocido'` no se reporta (D2). */
function verificarCondicionBooleana(condicion: NodoExpresion, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  const tipo = tipoDeExpresion(condicion, alcance);
  if (tipo === 'desconocido' || tipo === 'boolean') return;
  problemas.push({ codigo: 'condicion-no-booleana', rango: condicion.rango, datos: { tipo } });
}

function visitarFor(sentencia: NodoFor, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  // El propio "for" es un alcance (design.md §2.3): sus variables cubren condición, actualización
  // Y el cuerpo — verificado contra javac que redeclarar el índice DENTRO del cuerpo con llaves
  // también es "already defined" (el cuerpo, si es un NodoBloque, abre su PROPIO alcance anidado
  // al visitarlo más abajo, adentro de este).
  alcance.entrarBloque();
  if (sentencia.inicializacionDeclaracion !== null) {
    visitarDeclaracionLocal(sentencia.inicializacionDeclaracion, alcance, problemas);
  }
  for (const expresionSentencia of sentencia.inicializacionExpresiones) {
    visitarExpresion(expresionSentencia.expresion, alcance, problemas);
  }
  if (sentencia.condicion !== null) {
    visitarExpresion(sentencia.condicion, alcance, problemas);
    verificarCondicionBooleana(sentencia.condicion, alcance, problemas);
  }
  visitarSentencia(sentencia.cuerpo, alcance, CONTEXTO_DENTRO_DE_CICLO, problemas);
  for (const expresionSentencia of sentencia.actualizacion) {
    visitarExpresion(expresionSentencia.expresion, alcance, problemas);
  }
  alcance.salirBloque();
}

function visitarSwitch(
  sentencia: NodoSwitch,
  alcance: Alcance,
  contexto: ContextoFlujo,
  problemas: ProblemaAtribucion[],
): void {
  visitarExpresion(sentencia.selector, alcance, problemas);
  const problemaSelector = verificarSelectorDeSwitch(sentencia, alcance);
  if (problemaSelector !== null) problemas.push(problemaSelector);
  // err34/flow05 de exploracion/03 (tarea 1.11): etiquetas de "case" no constantes o duplicadas.
  problemas.push(...verificarEtiquetasDeCase(sentencia, alcance));

  // "El bloque de un switch es un solo alcance" (design.md §2.7): un único entrarBloque/
  // salirBloque para TODA la lista plana de etiquetas+elementos (nunca uno por "case").
  alcance.entrarBloque();
  // `continue` sigue viendo el ciclo envolvente (si lo hay) a través del switch; `break` gana el
  // switch como destino válido adicional, sin perder el ciclo si también lo hay (contexto.enCiclo
  // se conserva tal cual, nunca se resetea a false).
  const contextoSwitch: ContextoFlujo = { enCiclo: contexto.enCiclo, enCicloOSwitch: true };
  for (const elemento of sentencia.elementos) visitarElementoSwitch(elemento, alcance, contextoSwitch, problemas);
  alcance.salirBloque();
}

function visitarElementoSwitch(
  elemento: NodoElementoSwitch,
  alcance: Alcance,
  contexto: ContextoFlujo,
  problemas: ProblemaAtribucion[],
): void {
  if (elemento.tipo === 'etiqueta-case') {
    visitarExpresion(elemento.valor, alcance, problemas);
    return;
  }
  if (elemento.tipo === 'etiqueta-default') return;
  visitarElementoBloque(elemento, alcance, contexto, problemas);
}

function visitarExpresion(expresion: NodoExpresion, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  switch (expresion.tipo) {
    case 'literal-entero':
    case 'literal-largo':
    case 'literal-doble':
    case 'literal-caracter':
    case 'literal-cadena':
    case 'literal-booleano':
    case 'expresion-no-soportada':
      return;
    case 'nombre':
      visitarNombreComoValor(expresion, alcance, problemas);
      return;
    case 'binaria':
      visitarExpresion(expresion.izquierda, alcance, problemas);
      visitarExpresion(expresion.derecha, alcance, problemas);
      verificarOperandosBinaria(expresion, alcance, problemas);
      return;
    case 'unaria':
      visitarExpresion(expresion.operando, alcance, problemas);
      return;
    case 'asignacion':
      visitarExpresion(expresion.objetivo, alcance, problemas);
      visitarExpresion(expresion.valor, alcance, problemas);
      return;
    case 'incremento-decremento':
      visitarExpresion(expresion.operando, alcance, problemas);
      return;
    case 'llamada':
      visitarLlamada(expresion, alcance, problemas);
      return;
    case 'acceso-miembro':
      visitarAccesoMiembro(expresion, alcance, problemas);
      return;
    case 'nueva-instancia':
      for (const argumento of expresion.argumentos) visitarExpresion(argumento, alcance, problemas);
      return;
    case 'conversion':
      visitarExpresion(expresion.operando, alcance, problemas);
      return;
  }
}

/** err28 (`==`/`!=`, "bad operand types") y err35 (aritmética/relacional, "bad operand types for
 * binary operator") de exploracion/03 — mismo punto, tres reglas distintas según la FAMILIA del
 * operador (design.md §2.7). Los operadores de bits/`instanceof`/`?:` nunca llegan como
 * `NodoBinaria` (son NO-DISP desde la sintaxis, 1.3).
 */
function verificarOperandosBinaria(
  expresion: Extract<NodoExpresion, { tipo: 'binaria' }>,
  alcance: Alcance,
  problemas: ProblemaAtribucion[],
): void {
  const izquierda = tipoDeExpresion(expresion.izquierda, alcance);
  const derecha = tipoDeExpresion(expresion.derecha, alcance);
  if (expresion.operador === '==' || expresion.operador === '!=') {
    if (!tiposComparablesConIgualdad(izquierda, derecha)) {
      problemas.push({ codigo: 'tipos-incomparables', rango: expresion.rango, datos: { izquierda, derecha } });
    }
    return;
  }
  if (expresion.operador === '&&' || expresion.operador === '||') {
    // Java exige "boolean" en AMBOS lados (nunca un número, a diferencia de JS) — mismo criterio
    // que `verificarCondicionBooleana`, pero aquí ambos operandos, no uno solo.
    const ambosBooleanos = (t: Tipo) => t === 'boolean' || t === 'desconocido';
    if (!ambosBooleanos(izquierda) || !ambosBooleanos(derecha)) {
      problemas.push({
        codigo: 'operandos-invalidos-operador-binario',
        rango: expresion.rango,
        datos: { operador: expresion.operador, izquierda, derecha },
      });
    }
    return;
  }
  // Aritmética (+ - * / %) y relacional (< > <= >=): design.md §2.4 nivel 9/11/12 — ambas familias
  // exigen operandos numéricos (salvo "+" con String, que concatena, nunca un error).
  if (!operandosValidosParaAritmetica(expresion.operador, izquierda, derecha)) {
    problemas.push({
      codigo: 'operandos-invalidos-operador-binario',
      rango: expresion.rango,
      datos: { operador: expresion.operador, izquierda, derecha },
    });
  }
}

function visitarNombreComoValor(nodo: NodoNombre, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  if (NOMBRES_DE_CLASE_RECONOCIDOS.has(nodo.nombre)) return; // referencia estática (Math, String…)
  if (alcance.buscar(nodo.nombre) !== null) return;
  const sugerencia = sugerenciaDeMayuscula(nodo.nombre);
  problemas.push({
    codigo: 'variable-no-declarada',
    rango: nodo.rango,
    datos: sugerencia === undefined ? { nombre: nodo.nombre } : { nombre: nodo.nombre, sugerencia },
  });
}

function visitarLlamada(nodo: NodoLlamada, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  if (nodo.callee.tipo === 'nombre') {
    // Ningún método propio existe en el subconjunto (REQ-SUB-007): una llamada de nombre libre
    // (sin "objeto.") SIEMPRE es "método no declarado" (err03 de exploracion/03).
    problemas.push({
      codigo: 'metodo-no-declarado',
      rango: nodo.callee.rango,
      datos: { nombre: nodo.callee.nombre },
    });
  } else {
    visitarExpresion(nodo.callee, alcance, problemas);
  }
  for (const argumento of nodo.argumentos) visitarExpresion(argumento, alcance, problemas);
}

function visitarAccesoMiembro(nodo: NodoAccesoMiembro, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  if (nodo.objeto.tipo === 'nombre' && NOMBRES_DE_CLASE_RECONOCIDOS.has(nodo.objeto.nombre)) {
    return; // Math.foo/String.foo/System.foo…: referencia estática — 1.8 valida el miembro real.
  }
  visitarExpresion(nodo.objeto, alcance, problemas);
}
