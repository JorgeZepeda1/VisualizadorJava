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
  NodoAsignacion,
  NodoBloque,
  NodoDeclaracionLocal,
  NodoElementoBloque,
  NodoElementoSwitch,
  NodoExpresion,
  NodoFor,
  NodoImportacion,
  NodoIncrementoDecremento,
  NodoLlamada,
  NodoNombre,
  NodoNuevaInstancia,
  NodoPrograma,
  NodoSentencia,
  NodoSwitch,
  NodoUnaria,
} from '../sintaxis/ast.ts';
import { CODIGOS_NO_SOPORTADO } from '../sintaxis/no-soportado.ts';
import { Alcance } from './alcance.ts';
import { CONSTRUCTORES_SOPORTADOS, clasificarCampo, clasificarMetodo } from './catalogo-api.ts';
import { valorConstante } from './constantes.ts';
import type { ProblemaAtribucion } from './diagnostico.ts';
import { resolverSobrecarga } from './sobrecargas.ts';
import { verificarEtiquetasDeCase, verificarSelectorDeSwitch } from './switch.ts';
import {
  argumentoDeSobrecarga,
  claseDelObjeto,
  NOMBRES_DE_CLASE_RECONOCIDOS,
  nombreDeArgumentoParaMostrar,
  tipoDeExpresion,
  tipoDeNombreDeTipo,
  tipoDeOperadorAritmetico,
  type Tipo,
} from './tipos.ts';
import {
  CLASES_QUE_REQUIEREN_IMPORT,
  codigoDeAsignacionInvalida,
  esAsignable,
  esConvertibleImplicitamenteEnAsignacionCompuesta,
  nombreDeClaseImportadaEsValido,
  operandoNoEsVariableValida,
  operandosValidosParaAritmetica,
  operandoValidoParaIncrementoDecremento,
  operandoValidoParaUnario,
  resultadoNombreDeTipo,
  sugerenciaDeMayuscula,
  tiposComparablesConIgualdad,
} from './verificaciones-de-tipo.ts';

// Corrección obligatoria (sub-lote 1-D2a): antes esta lista era una copia local idéntica a la de
// `verificaciones-de-tipo.ts` (`CLASES_QUE_REQUIEREN_IMPORT`) — una sola fuente ahora (importada),
// nunca dos listas que podrían divergir. "exacto" ("import java.util.Scanner;") O comodín
// ("import java.util.*;") cuentan igual -- verificado contra javac 17 real, ambos compilan
// idéntico (exploracion/03 §6).
function nombresJavaUtilImportados(importaciones: readonly NodoImportacion[]): ReadonlySet<string> {
  const importadas = new Set<string>();
  for (const clase of CLASES_QUE_REQUIEREN_IMPORT) {
    const estaImportada = importaciones.some(
      (importacion) =>
        (!importacion.comodin && importacion.nombre === `java.util.${clase}`) ||
        (importacion.comodin && importacion.nombre === 'java.util'),
    );
    if (estaImportada) importadas.add(clase);
  }
  return importadas;
}

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
  // Tarea 1.21 (sub-lote 1-D4, REQ-SUB-001): los imports existen y se validan SIN IMPORTAR si hay
  // "main" o no (a diferencia del resto de esta pasada, que necesita un cuerpo que recorrer) --
  // verificado contra javac 17 real: un import roto se rechaza aunque la clase no tenga "main".
  // ANTES del corte de "sin main" de abajo, nunca después.
  for (const importacion of programa.importaciones) {
    if (!importacion.comodin && !nombreDeClaseImportadaEsValido(importacion.nombre)) {
      problemas.push({ codigo: 'importacion-no-reconocida', rango: importacion.rango, datos: { nombre: importacion.nombre } });
    }
  }
  // Tarea 1.15 (REQ-COMP-008): sin "main" no hay cuerpo que recorrer -- nada MÁS que reportar aquí
  // (el error real es de ARRANQUE, pasada 5, no de atribución).
  if (programa.clase.main === null) return problemas.slice().sort((a, b) => a.rango.inicio - b.rango.inicio);
  const alcance = new Alcance();
  const importadas = nombresJavaUtilImportados(programa.importaciones);
  alcance.entrarBloque();
  // El parámetro de main vive en el alcance para que usarlo no dé "variable no declarada";
  // indexarlo ([]) es NO-DISP (arreglos, REQ-SUB-007), ajeno a esta pasada.
  alcance.declarar({
    nombre: programa.clase.main.parametro,
    tipo: 'desconocido',
    esFinal: false,
    rango: programa.clase.main.rango,
  });
  visitarBloque(programa.clase.main.cuerpo, alcance, importadas, CONTEXTO_INICIAL, problemas);
  alcance.salirBloque();
  return problemas.slice().sort((a, b) => a.rango.inicio - b.rango.inicio);
}

function visitarBloque(
  bloque: NodoBloque,
  alcance: Alcance,
  importadas: ReadonlySet<string>,
  contexto: ContextoFlujo,
  problemas: ProblemaAtribucion[],
): void {
  alcance.entrarBloque();
  for (const elemento of bloque.elementos) visitarElementoBloque(elemento, alcance, importadas, contexto, problemas);
  alcance.salirBloque();
}

function visitarElementoBloque(
  elemento: NodoElementoBloque,
  alcance: Alcance,
  importadas: ReadonlySet<string>,
  contexto: ContextoFlujo,
  problemas: ProblemaAtribucion[],
): void {
  if (elemento.tipo === 'declaracion-local') {
    visitarDeclaracionLocal(elemento, alcance, importadas, problemas);
    return;
  }
  visitarSentencia(elemento, alcance, importadas, contexto, problemas);
}

function visitarDeclaracionLocal(
  declaracion: NodoDeclaracionLocal,
  alcance: Alcance,
  importadas: ReadonlySet<string>,
  problemas: ProblemaAtribucion[],
): void {
  // err18/err20 de exploracion/03 ("string nombre" en minúscula / "Scanner" sin import): el nombre
  // de tipo se valida UNA vez por declaración (no por declarador) — javac lo hace en el mismo
  // punto. "tipo-no-reconocido" (genuinamente desconocido) y "tipo-requiere-import" (real, de
  // java.util, sin importar) son códigos DISTINTOS — nunca el mismo mensaje para los dos casos.
  const resultadoTipo = resultadoNombreDeTipo(declaracion.nombreTipo, importadas);
  if (resultadoTipo === 'no-reconocido') {
    problemas.push({
      codigo: 'tipo-no-reconocido',
      rango: declaracion.rango,
      datos: { nombre: declaracion.nombreTipo },
    });
  } else if (resultadoTipo === 'requiere-import') {
    problemas.push({
      codigo: 'tipo-requiere-import',
      rango: declaracion.rango,
      datos: { nombre: declaracion.nombreTipo },
    });
  }
  // Corrección obligatoria (sub-lote 1-D2c): descubierta al conectar la biblioteca real —
  // `alcance.declarar` guardaba SIEMPRE `declaracion.nombreTipo` tal cual, incluso cuando el tipo
  // NO se reconoció de verdad ("tipo-no-reconocido"/"tipo-requiere-import" arriba). Antes era
  // inofensivo (nada más miraba el tipo guardado), pero ahora que `visitarLlamadaDeMiembro`/
  // `visitarAccesoMiembro` SÍ lo consultan para resolver miembros reales, "Scanner sc = ...;" SIN
  // import producía un SEGUNDO problema (NO-DISP para "sc.hasNextInt()") además del real
  // ("tipo-requiere-import") -- verificado contra javac 17 real: con el import faltante, javac
  // NUNCA llega a resolver el miembro (cascada suprimida en su propio recovery, D2 nunca fue tan
  // permisivo). "desconocido" (el mismo sumidero de cascada de siempre) hace que cualquier uso
  // posterior de la variable no dispare ningún problema adicional por esta misma causa.
  const tipoDelSimbolo = resultadoTipo === 'valido' ? declaracion.nombreTipo : 'desconocido';
  for (const declarador of declaracion.declaradores) {
    // Comparte el plegado (REFACTOR de la tarea 1.10) con la verificación de asignación DE ABAJO
    // Y con el campo "constante" del símbolo (deuda 3 del commit 999a8ca, JLS 4.12.4).
    const valorInicializador = declarador.inicializador !== null ? valorConstante(declarador.inicializador, alcance) : null;
    if (declarador.inicializador !== null) {
      visitarExpresion(declarador.inicializador, alcance, importadas, problemas);
      // err04/err12 de exploracion/03 (JLS 5.2): solo si el TIPO de destino se reconoce (si no,
      // ya se reportó un problema arriba — nunca dos problemas por la misma causa).
      const destino = tipoDeNombreDeTipo(declaracion.nombreTipo);
      const origen = tipoDeExpresion(declarador.inicializador, alcance);
      if (destino !== 'desconocido' && !esAsignable(origen, destino, valorInicializador)) {
        problemas.push({
          codigo: codigoDeAsignacionInvalida(origen, destino),
          rango: declarador.inicializador.rango,
          datos: { origen, destino },
        });
      }
    }
    // Deuda 3 del commit 999a8ca (JLS 4.12.4): una local "final" con inicializador CONSTANTE es
    // una VARIABLE CONSTANTE -- participa en expresiones constantes (etiquetas de "case",
    // alcanzabilidad, internado de String). `undefined` si no aplica (no es "final", o el
    // inicializador no es constante) -- `valorConstante` ya sabe leerlo de vuelta (constantes.ts).
    const constante = declaracion.esFinal && valorInicializador !== null ? valorInicializador : undefined;
    const resultado = alcance.declarar({
      nombre: declarador.nombre,
      tipo: tipoDelSimbolo,
      esFinal: declaracion.esFinal,
      rango: declarador.rango,
      constante,
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
  importadas: ReadonlySet<string>,
  contexto: ContextoFlujo,
  problemas: ProblemaAtribucion[],
): void {
  switch (sentencia.tipo) {
    case 'bloque':
      visitarBloque(sentencia, alcance, importadas, contexto, problemas);
      return;
    case 'impresion':
      // Corrección obligatoria (sub-lote 1-C2): "println()" sin argumentos tiene `argumento:null`
      // (nunca hay símbolos que resolver en ese caso).
      if (sentencia.argumento !== null) visitarExpresion(sentencia.argumento, alcance, importadas, problemas);
      return;
    case 'retorno':
    case 'sentencia-vacia':
    case 'no-soportado':
      return;
    case 'sentencia-expresion':
      visitarExpresion(sentencia.expresion, alcance, importadas, problemas);
      return;
    case 'if':
      visitarExpresion(sentencia.condicion, alcance, importadas, problemas);
      verificarCondicionBooleana(sentencia.condicion, alcance, problemas);
      visitarSentencia(sentencia.entonces, alcance, importadas, contexto, problemas);
      if (sentencia.sino !== null) visitarSentencia(sentencia.sino, alcance, importadas, contexto, problemas);
      return;
    case 'while':
      visitarExpresion(sentencia.condicion, alcance, importadas, problemas);
      verificarCondicionBooleana(sentencia.condicion, alcance, problemas);
      visitarSentencia(sentencia.cuerpo, alcance, importadas, CONTEXTO_DENTRO_DE_CICLO, problemas);
      return;
    case 'do-while':
      visitarSentencia(sentencia.cuerpo, alcance, importadas, CONTEXTO_DENTRO_DE_CICLO, problemas);
      visitarExpresion(sentencia.condicion, alcance, importadas, problemas);
      verificarCondicionBooleana(sentencia.condicion, alcance, problemas);
      return;
    case 'for':
      visitarFor(sentencia, alcance, importadas, problemas);
      return;
    case 'switch':
      visitarSwitch(sentencia, alcance, importadas, contexto, problemas);
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

function visitarFor(
  sentencia: NodoFor,
  alcance: Alcance,
  importadas: ReadonlySet<string>,
  problemas: ProblemaAtribucion[],
): void {
  // El propio "for" es un alcance (design.md §2.3): sus variables cubren condición, actualización
  // Y el cuerpo — verificado contra javac que redeclarar el índice DENTRO del cuerpo con llaves
  // también es "already defined" (el cuerpo, si es un NodoBloque, abre su PROPIO alcance anidado
  // al visitarlo más abajo, adentro de este).
  alcance.entrarBloque();
  if (sentencia.inicializacionDeclaracion !== null) {
    visitarDeclaracionLocal(sentencia.inicializacionDeclaracion, alcance, importadas, problemas);
  }
  for (const expresionSentencia of sentencia.inicializacionExpresiones) {
    visitarExpresion(expresionSentencia.expresion, alcance, importadas, problemas);
  }
  if (sentencia.condicion !== null) {
    visitarExpresion(sentencia.condicion, alcance, importadas, problemas);
    verificarCondicionBooleana(sentencia.condicion, alcance, problemas);
  }
  visitarSentencia(sentencia.cuerpo, alcance, importadas, CONTEXTO_DENTRO_DE_CICLO, problemas);
  for (const expresionSentencia of sentencia.actualizacion) {
    visitarExpresion(expresionSentencia.expresion, alcance, importadas, problemas);
  }
  alcance.salirBloque();
}

function visitarSwitch(
  sentencia: NodoSwitch,
  alcance: Alcance,
  importadas: ReadonlySet<string>,
  contexto: ContextoFlujo,
  problemas: ProblemaAtribucion[],
): void {
  visitarExpresion(sentencia.selector, alcance, importadas, problemas);
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
  for (const elemento of sentencia.elementos) {
    visitarElementoSwitch(elemento, alcance, importadas, contextoSwitch, problemas);
  }
  alcance.salirBloque();
}

function visitarElementoSwitch(
  elemento: NodoElementoSwitch,
  alcance: Alcance,
  importadas: ReadonlySet<string>,
  contexto: ContextoFlujo,
  problemas: ProblemaAtribucion[],
): void {
  if (elemento.tipo === 'etiqueta-case') {
    visitarExpresion(elemento.valor, alcance, importadas, problemas);
    return;
  }
  if (elemento.tipo === 'etiqueta-default') return;
  visitarElementoBloque(elemento, alcance, importadas, contexto, problemas);
}

function visitarExpresion(
  expresion: NodoExpresion,
  alcance: Alcance,
  importadas: ReadonlySet<string>,
  problemas: ProblemaAtribucion[],
): void {
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
      visitarExpresion(expresion.izquierda, alcance, importadas, problemas);
      visitarExpresion(expresion.derecha, alcance, importadas, problemas);
      verificarOperandosBinaria(expresion, alcance, problemas);
      return;
    case 'unaria':
      visitarExpresion(expresion.operando, alcance, importadas, problemas);
      verificarOperandoUnaria(expresion, alcance, problemas);
      return;
    case 'asignacion':
      visitarExpresion(expresion.objetivo, alcance, importadas, problemas);
      visitarExpresion(expresion.valor, alcance, importadas, problemas);
      verificarObjetivoDeAsignacion(expresion, alcance, problemas);
      verificarAsignacionSimple(expresion, alcance, problemas);
      verificarAsignacionCompuesta(expresion, alcance, problemas);
      return;
    case 'incremento-decremento':
      visitarExpresion(expresion.operando, alcance, importadas, problemas);
      verificarOperandoIncrementoDecremento(expresion, alcance, problemas);
      return;
    case 'llamada':
      visitarLlamada(expresion, alcance, importadas, problemas);
      return;
    case 'acceso-miembro':
      visitarAccesoMiembro(expresion, alcance, importadas, problemas);
      return;
    case 'nueva-instancia':
      visitarNuevaInstancia(expresion, alcance, importadas, problemas);
      return;
    case 'conversion':
      visitarExpresion(expresion.operando, alcance, importadas, problemas);
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

/** Tarea 1.21 (sub-lote 1-D4, JLS 5.6.1): "!x" exige "boolean"; "+x"/"-x" exigen un tipo numérico
 * (`operandoValidoParaUnario`, verificaciones-de-tipo.ts) — verificado contra javac 17 real: "bad
 * operand type X for unary operator 'Y'". 'desconocido' nunca reporta nada (D2). */
function verificarOperandoUnaria(expresion: NodoUnaria, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  const operando = tipoDeExpresion(expresion.operando, alcance);
  if (operandoValidoParaUnario(expresion.operador, operando)) return;
  problemas.push({
    codigo: 'operando-invalido-operador-unario',
    rango: expresion.rango,
    datos: { operador: expresion.operador, operando },
  });
}

/** Tarea 1.21 (sub-lote 1-D4, JLS 15.14/15.15/4.12.3, cierre de C7): (1) el operando debe ser una
 * VARIABLE real (`operandoNoEsVariableValida` -- verificado: "fila++ ++;" da "unexpected type,
 * required: variable, found: value", porque el operando del "++" EXTERIOR es "fila++", un VALOR,
 * no una variable) ANTES de mirar el tipo (una vez que se sabe que es una variable, (2) "x++"/
 * "--x" exigen que sea numérica -- mismo criterio que "+x"/"-x" arriba, verificado contra javac 17
 * real: "bad operand type X for unary operator '++'/'--'"). Los dos casos usan códigos DISTINTOS
 * -- nunca el mismo mensaje para "no es una variable" y "es una variable del tipo equivocado". */
function verificarOperandoIncrementoDecremento(
  expresion: NodoIncrementoDecremento,
  alcance: Alcance,
  problemas: ProblemaAtribucion[],
): void {
  if (operandoNoEsVariableValida(expresion.operando, alcance)) {
    problemas.push({ codigo: 'objetivo-no-es-variable', rango: expresion.rango, datos: {} });
    return;
  }
  const operando = tipoDeExpresion(expresion.operando, alcance);
  if (operandoValidoParaIncrementoDecremento(operando)) return;
  problemas.push({
    codigo: 'operando-invalido-operador-unario',
    rango: expresion.rango,
    datos: { operador: expresion.operador, operando },
  });
}

/** Tarea 1.21 (sub-lote 1-D4, JLS 15.26/4.12.3, cierre de C7): el objetivo de CUALQUIER asignación
 * ("=" incluida, no solo compuesta) debe ser una VARIABLE real -- verificado contra javac 17 real:
 * "Scanner = new Scanner(System.in);" da "cannot find symbol: variable Scanner" ("Scanner" existe
 * como CLASE, un espacio de símbolos DISTINTO, JLS 6.5.6 -- `visitarNombreComoValor` lo trata como
 * referencia estática válida en posición de VALOR, pero nunca es válido en posición de OBJETIVO).
 * Independiente de `verificarAsignacionCompuesta` (abajo): esa solo mira operadores COMPUESTOS;
 * esta corre siempre, "=" incluido. */
function verificarObjetivoDeAsignacion(expresion: NodoAsignacion, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  if (!operandoNoEsVariableValida(expresion.objetivo, alcance)) return;
  problemas.push({ codigo: 'objetivo-no-es-variable', rango: expresion.rango, datos: {} });
}

/** Tarea NUEVA (sub-lote 1-D5, JLS 5.2/15.26.1: "el tipo de una expresión de asignación es el de
 * la variable asignada"): una asignación SIMPLE ("x = expr;", fuera de una declaración) exige la
 * MISMA conversión de asignación que un inicializador de declaración (`visitarDeclaracionLocal`,
 * arriba) — reusa `esAsignable`/`codigoDeAsignacionInvalida`/`valorConstante`, las MISMAS que ya
 * usa una declaración, nunca una segunda tabla de reglas. Verificado contra javac 17 real esta
 * sesión: "int x; x = \"hola\";" → "incompatible types: String cannot be converted to int"; "int
 * x; x = 3.5;" → "possible lossy conversion from double to int"; "char c; c = 65;" COMPILA limpio
 * (constante que cabe, igual que una declaración); "double d; d = 5;" COMPILA limpio
 * (ensanchamiento). `destino === 'desconocido'` cubre D2 para AMBOS casos de cascada: un objetivo
 * genuinamente no declarado (ya reportado por `visitarNombreComoValor`) Y un objetivo que no es una
 * variable real (ya reportado por `verificarObjetivoDeAsignacion`, arriba) — en los dos,
 * `tipoDeExpresion` sobre el nombre da 'desconocido' porque `alcance.buscar` no lo encuentra, sin
 * necesitar un segundo chequeo aquí. */
function verificarAsignacionSimple(expresion: NodoAsignacion, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  if (expresion.operador !== '=') return;
  const destino = tipoDeExpresion(expresion.objetivo, alcance);
  if (destino === 'desconocido') return;
  const origen = tipoDeExpresion(expresion.valor, alcance);
  const constanteOrigen = valorConstante(expresion.valor, alcance);
  if (esAsignable(origen, destino, constanteOrigen)) return;
  problemas.push({
    codigo: codigoDeAsignacionInvalida(origen, destino),
    rango: expresion.valor.rango,
    datos: { origen, destino },
  });
}

/** Tarea 1.21 (JLS 15.26.2, "E1 op= E2" ≡ "E1 = (T)(E1 op E2)"): una asignación COMPUESTA revisa
 * DOS cosas, en orden,
 * igual que javac: (1) el operador BASE ("+ - * / %") debe aplicar entre el tipo del objetivo y el
 * del valor (`operandosValidosParaAritmetica`, MISMA regla que un "+"/"-" suelto — verificado:
 * "boolean b; b += false;"/"int x; x *= \"3\";" dan "bad operand types for binary operator"); (2)
 * si aplica, el resultado (YA promovido/concatenado, `tipoDeOperadorAritmetico`) debe poder
 * castearse de vuelta al tipo del objetivo (`esConvertibleImplicitamenteEnAsignacionCompuesta` —
 * verificado: "int x; x += \"a\";" da "incompatible types: String cannot be converted to int", una
 * frase DISTINTA de "bad operand types" pese a que el operador "+" sí aplicó). */
function verificarAsignacionCompuesta(expresion: NodoAsignacion, alcance: Alcance, problemas: ProblemaAtribucion[]): void {
  if (expresion.operador === '=') return;
  const operadorBase = expresion.operador.slice(0, -1);
  const objetivo = tipoDeExpresion(expresion.objetivo, alcance);
  const valor = tipoDeExpresion(expresion.valor, alcance);
  if (objetivo === 'desconocido' || valor === 'desconocido') return; // D2
  if (!operandosValidosParaAritmetica(operadorBase, objetivo, valor)) {
    problemas.push({
      codigo: 'operandos-invalidos-operador-binario',
      rango: expresion.rango,
      datos: { operador: expresion.operador, izquierda: objetivo, derecha: valor },
    });
    return;
  }
  const resultado = tipoDeOperadorAritmetico(operadorBase, objetivo, valor);
  if (!esConvertibleImplicitamenteEnAsignacionCompuesta(resultado, objetivo)) {
    problemas.push({
      codigo: codigoDeAsignacionInvalida(resultado, objetivo),
      rango: expresion.rango,
      datos: { origen: resultado, destino: objetivo },
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

function visitarLlamada(
  nodo: NodoLlamada,
  alcance: Alcance,
  importadas: ReadonlySet<string>,
  problemas: ProblemaAtribucion[],
): void {
  if (nodo.callee.tipo === 'nombre') {
    // Ningún método propio existe en el subconjunto (REQ-SUB-007): una llamada de nombre libre
    // (sin "objeto.") SIEMPRE es "método no declarado" (err03 de exploracion/03).
    problemas.push({
      codigo: 'metodo-no-declarado',
      rango: nodo.callee.rango,
      datos: { nombre: nodo.callee.nombre },
    });
  } else if (nodo.callee.tipo === 'acceso-miembro') {
    // Sub-lote 1-D2c: "objeto.metodo(...)" real -- resuelto contra el catálogo (abajo), en vez de
    // solo recorrer el receptor como valor genérico (lo que hacía que NINGÚN método de biblioteca
    // se validara jamás — hueco flageado por 1-D2b, task_c0cf2e6c).
    visitarLlamadaDeMiembro(nodo, nodo.callee, alcance, importadas, problemas);
  } else {
    visitarExpresion(nodo.callee, alcance, importadas, problemas);
  }
  for (const argumento of nodo.argumentos) visitarExpresion(argumento, alcance, importadas, problemas);
}

/**
 * Sub-lote 1-D2c (REQ-SUB-005/007, task_c0cf2e6c): `objeto.metodo(...)` contra el catálogo real
 * del JDK (`catalogo-api.ts`/`sobrecargas.ts`, tareas 1.8/1.9) — cada veredicto verificado contra
 * javac 17 real (carpeta temporal, borrada tras verificar; ver el informe de la sesión):
 *   - `s.lenght()`/`Math.raiz(4)` (no existe NINGÚN miembro con ese nombre) -> "cannot find
 *     symbol: method X()" real -> "miembro-no-declarado"
 *   - `s.split(",")`/`Math.sin(x)`/`sc.hasNextInt()` (existe en el JDK, fuera de REQ-SUB-005) ->
 *     javac SÍ compila -> aviso NO-DISP (categoria 'no-disponible'), NUNCA un error inventado
 *   - `Math.max("a",1)`/`s.charAt("0")` (existe y soportado, pero NINGÚN argumento real encaja en
 *     ninguna sobrecarga real) -> "no suitable method found"/"incompatible types" reales (dos
 *     frases distintas de javac para el MISMO problema, D2: un solo código nuestro) ->
 *     "sin-sobrecarga-aplicable"
 *   - soportado y una sobrecarga real SÍ aplica -> nada que reportar aquí; `tipos.ts` resuelve el
 *     tipo de retorno real por separado (misma `resolverSobrecarga`, nunca una segunda tabla)
 * `clase === null` (el receptor ya es inválido, o de un tipo sin miembros en este subconjunto —
 * p. ej. un primitivo) no reporta NADA aquí: D2, cascada suprimida por quien ya reportó el
 * problema real del receptor (o por el hueco YA documentado de "primitivo no se puede
 * dereferenciar", ajeno a esta tarea).
 */
function visitarLlamadaDeMiembro(
  nodo: NodoLlamada,
  callee: NodoAccesoMiembro,
  alcance: Alcance,
  importadas: ReadonlySet<string>,
  problemas: ProblemaAtribucion[],
): void {
  visitarExpresion(callee.objeto, alcance, importadas, problemas);
  const clase = claseDelObjeto(callee.objeto, alcance);
  if (clase === null) return;
  const clasificacion = clasificarMetodo(clase, callee.miembro);
  if (clasificacion === 'no-existe') {
    problemas.push({ codigo: 'miembro-no-declarado', rango: callee.rango, datos: { clase, nombre: callee.miembro } });
    return;
  }
  if (clasificacion === 'existe-no-soportado') {
    // Tarea 1.25 (hallazgo real, encontrado por esta MISMA tarea, no reportado por el orquestador:
    // ninguna muestra de `corpus/compilacion/avisos/` ejercita este código — solo la atribución lo
    // produce): el texto es-MX (`miembro-de-biblioteca-no-soportado`) nombra el miembro CONCRETO
    // desde la tarea 1.24 (`{ clase, nombre }`), pero este sitio mandaba `datos: {}` — el alumno
    // veía "el miembro `undefined` de `undefined`" en vez de, p. ej., "split" de "String".
    problemas.push({
      codigo: CODIGOS_NO_SOPORTADO.miembroDeBiblioteca,
      categoria: 'no-disponible',
      rango: callee.rango,
      datos: { clase, nombre: callee.miembro },
    });
    return;
  }
  // Tarea NUEVA (sub-lote 1-D5): `tiposDeArgumentos` (SOLO para el mensaje) usa
  // `nombreDeArgumentoParaMostrar` -- MISMO nombre simple que javac muestra en sus propios mensajes
  // ("PrintStream"/"InputStream" para System.out/System.in, nunca "desconocido" -- antes de esta
  // corrección, un `Tipo` cerrado directo SIEMPRE daba 'desconocido' para estos 3 casos, ver tipos.ts).
  const tiposDeArgumentos = nodo.argumentos.map((argumento) => nombreDeArgumentoParaMostrar(argumento, alcance));
  // Tarea 1.21 (sub-lote 1-D4): la RESOLUCIÓN en sí usa `argumentoDeSobrecarga` (nunca solo
  // `tipoDeExpresion`), para que "System.in"/"System.out"/"System.err" participen con su nombre
  // reflejado real en vez de apagar la cascada como 'desconocido' -- `tiposDeArgumentos`, arriba,
  // sigue siendo el que se MUESTRA en el mensaje (ver "sin-sobrecarga-aplicable" en
  // textos/es-MX/problemas.ts), nunca el que decide la resolución.
  const argumentos = nodo.argumentos.map((argumento) => argumentoDeSobrecarga(argumento, alcance));
  // D2 (nunca un resultado inventado): un argumento genuinamente 'desconocido' (p. ej. una llamada
  // anidada que en sí no resolvió, o un símbolo no declarado) NO significa "ningún tipo encaja" --
  // significa "no sabemos todavía". Reportar "sin-sobrecarga-aplicable" aquí sería inventar un
  // error que javac nunca daría -- mismo sumidero de cascada que ya usa TODO el resto de esta
  // pasada. El chequeo es sobre `argumentos` (NO `tiposDeArgumentos`): un `{reflejado}` (System.x)
  // SIEMPRE es un tipo conocido, nunca dispara este sumidero.
  if (!argumentos.includes('desconocido') && resolverSobrecarga(clase, callee.miembro, argumentos) === null) {
    problemas.push({
      codigo: 'sin-sobrecarga-aplicable',
      rango: nodo.rango,
      datos: { clase, nombre: callee.miembro, argumentos: tiposDeArgumentos },
    });
  }
}

/**
 * Sub-lote 1-D2c: acceso a miembro usado como VALOR, sin llamar (`Math.PI`, `Integer.MAX_VALUE`)
 * — espacio de nombres SEPARADO del de métodos (JLS 6.5.6.1 vs 6.5.6.2, `clasificarCampo` filtra
 * por género): un método real del mismo nombre (`s.length`, sin paréntesis) NUNCA cuenta como
 * campo — verificado contra javac 17 real: "cannot find symbol: variable length". Mismas 3
 * categorías que `visitarLlamadaDeMiembro` salvo "sin-sobrecarga-aplicable" (un campo no tiene
 * sobrecargas que resolver).
 */
function visitarAccesoMiembro(
  nodo: NodoAccesoMiembro,
  alcance: Alcance,
  importadas: ReadonlySet<string>,
  problemas: ProblemaAtribucion[],
): void {
  visitarExpresion(nodo.objeto, alcance, importadas, problemas);
  const clase = claseDelObjeto(nodo.objeto, alcance);
  if (clase === null) return;
  const clasificacion = clasificarCampo(clase, nodo.miembro);
  if (clasificacion === 'no-existe') {
    problemas.push({ codigo: 'campo-no-declarado', rango: nodo.rango, datos: { clase, nombre: nodo.miembro } });
    return;
  }
  if (clasificacion === 'existe-no-soportado') {
    // Tarea 1.25 (mismo hallazgo que `visitarLlamadaDeMiembro` arriba, sitio de emisión DISTINTO —
    // acceso de CAMPO, no llamada): "Integer.SIZE" mostraba "el miembro `undefined` de `undefined`".
    problemas.push({
      codigo: CODIGOS_NO_SOPORTADO.miembroDeBiblioteca,
      categoria: 'no-disponible',
      rango: nodo.rango,
      datos: { clase, nombre: nodo.miembro },
    });
  }
}

/**
 * Sub-lote 1-D3 (JLS 15.9, REQ-SUB-005): "new Clase(...)" contra los constructores REALES de
 * `FIRMAS_JDK` (`genero:'constructor'`, `nombre:'<init>'`) — ANTES de esta tarea, `nueva-instancia`
 * solo recorría sus argumentos como valores sueltos (nunca se validaba el propio "new"), así que
 * "Scanner sc = new Scanner();" (Scanner NO tiene constructor de aridad 0 en el JDK real) se
 * aceptaba en silencio. Los 4 desenlaces, cada uno verificado contra javac 17 real (carpeta
 * temporal, borrada tras verificar; ver el informe de la sesión):
 *   - `nombreTipo` no reconocido ("new Foo()") -> "cannot find symbol: class Foo" -> MISMO código
 *     que una declaración con un tipo desconocido ("tipo-no-reconocido") -- `resultadoNombreDeTipo`
 *     reusada tal cual (nunca una segunda implementación que podría divergir); D2 no distingue
 *     "el nombre aparece en una declaración" de "el nombre aparece tras new": javac tampoco lo hace
 *     en su intención real (símbolo de clase no resuelto).
 *   - `nombreTipo` real de java.util SIN su import ("new Scanner(...)" sin "import
 *     java.util.Scanner;") -> "tipo-requiere-import" (MISMO mecanismo que una declaración).
 *   - constructor real pero NINGÚN argumento encaja ("new Scanner()", Scanner no tiene aridad 0) ->
 *     "no suitable constructor found for Scanner(no arguments)" -> "sin-constructor-aplicable" --
 *     MISMA `resolverSobrecarga` (JLS 15.12.2) que ya resuelve métodos, con nombre='<init>'.
 *   - constructor real, aplica, pero FUERA de REQ-SUB-005 ("new Scanner(\"texto\")", Scanner SÍ
 *     tiene Scanner(String) real) -> javac SÍ compila -> aviso NO-DISP (categoria
 *     'no-disponible'), NUNCA un error inventado (D2) -- `CONSTRUCTORES_SOPORTADOS` filtra por
 *     FIRMA completa (clase+parámetros), más angosto que `MIEMBROS_SOPORTADOS` (métodos: CUALQUIER
 *     sobrecarga real de un nombre soportado cuenta como soportada) porque REQ-SUB-005 es
 *     explícito para constructores: "un único new Scanner(System.in)", "new String(texto)".
 * `new Random()`/`new Random(42)`/`new String("hola")`/`new Scanner(System.in)` (los 4 casos
 * EXPLÍCITAMENTE soportados de REQ-SUB-005) verificados limpios contra javac real.
 *
 * Fuera de alcance A PROPÓSITO (documentado, no un olvido — ver apply-progress de 1-D2c): un
 * argumento `'desconocido'` nunca dispara "sin-constructor-aplicable" (mismo sumidero de cascada
 * D2 que ya usa `visitarLlamadaDeMiembro`).
 */
function visitarNuevaInstancia(
  nodo: NodoNuevaInstancia,
  alcance: Alcance,
  importadas: ReadonlySet<string>,
  problemas: ProblemaAtribucion[],
): void {
  for (const argumento of nodo.argumentos) visitarExpresion(argumento, alcance, importadas, problemas);

  const resultadoTipo = resultadoNombreDeTipo(nodo.nombreTipo, importadas);
  if (resultadoTipo === 'no-reconocido') {
    problemas.push({ codigo: 'tipo-no-reconocido', rango: nodo.rango, datos: { nombre: nodo.nombreTipo } });
    return;
  }
  if (resultadoTipo === 'requiere-import') {
    problemas.push({ codigo: 'tipo-requiere-import', rango: nodo.rango, datos: { nombre: nodo.nombreTipo } });
    return;
  }

  // Tarea 1.21 (sub-lote 1-D4, gap "System.in/out/err como argumentos") + tarea NUEVA (sub-lote
  // 1-D5, nombre de tipo en el mensaje): `tiposDeArgumentos` (SOLO para el mensaje) usa
  // `nombreDeArgumentoParaMostrar` -- da "InputStream"/"PrintStream" para System.in/out/err (nunca
  // "desconocido", igual que javac) mientras que `argumentos` (abajo, lo que de verdad resuelve la
  // sobrecarga) sigue usando `argumentoDeSobrecarga` -- antes de la tarea 1.21, "new
  // Scanner(System.in)" se aceptaba en silencio SOLO porque el sumidero de cascada se disparaba
  // sobre el "new" COMPLETO.
  const tiposDeArgumentos = nodo.argumentos.map((argumento) => nombreDeArgumentoParaMostrar(argumento, alcance));
  const argumentos = nodo.argumentos.map((argumento) => argumentoDeSobrecarga(argumento, alcance));
  if (argumentos.includes('desconocido')) return; // D2, mismo sumidero de cascada de siempre

  const firma = resolverSobrecarga(nodo.nombreTipo, '<init>', argumentos);
  if (firma === null) {
    problemas.push({
      codigo: 'sin-constructor-aplicable',
      rango: nodo.rango,
      datos: { clase: nodo.nombreTipo, argumentos: tiposDeArgumentos },
    });
    return;
  }
  const claveDeFirma = `${nodo.nombreTipo}(${firma.parametros.join(',')})`;
  if (!CONSTRUCTORES_SOPORTADOS.has(claveDeFirma)) {
    // Tarea 1.25 (mismo hallazgo, tercer sitio de emisión — CONSTRUCTOR): un constructor no tiene
    // "nombre" propio en JLS (ver el comentario de "sin-constructor-aplicable" más abajo en este
    // mismo archivo) — `nombre` describe la llamada tal como la escribió el alumno ("new Scanner")
    // en vez de inventar un identificador que Java no usa (D2).
    problemas.push({
      codigo: CODIGOS_NO_SOPORTADO.miembroDeBiblioteca,
      categoria: 'no-disponible',
      rango: nodo.rango,
      datos: { clase: nodo.nombreTipo, nombre: `new ${nodo.nombreTipo}` },
    });
  }
}
