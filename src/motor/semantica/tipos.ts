// Tipos de la pasada de atribución (tareas 1.7/1.8/1.21, design.md §2.7). Nace angosto a propósito
// (1.7 solo resolvía literales/variables/casts, lo suficiente para el selector de `switch`); la
// tarea 1.8 amplió `tipoDeExpresion` con conversiones/sobrecargas reales sobre `NodoLlamada`/
// `NodoAccesoMiembro` (JLS 15.12); la tarea 1.21 (sub-lote 1-D4) cierra el hueco que quedaba
// deferido A PROPÓSITO desde entonces: promoción numérica binaria/unaria (JLS 5.6), concatenación
// (15.18.1) e incremento/decremento (15.14/15.15) — ver `tipoDeBinaria`/`tipoDeUnaria` abajo. Lo
// que sigue sin resolver (asignaciones a algo NO-DISP, el propio NodoExpresionNoSoportada) da
// 'desconocido', que suprime errores en cascada (design.md §2.1: "nunca se informa un error que
// Java podría no dar").
import type { NodoExpresion } from '../sintaxis/ast.ts';
import { FIRMAS_JDK } from '../biblioteca/datos/firmas-jdk.generado.ts';
import type { Alcance } from './alcance.ts';
import { buscarFirmas } from './catalogo-api.ts';
import { resolverSobrecarga } from './sobrecargas.ts';

// El tipo 'desconocido' (design.md §2.1/§2.7) es el sumidero de cascada: nunca se agrega aquí un
// tipo por el que el motor todavía no puede responder con certeza.
export type Tipo = 'int' | 'long' | 'double' | 'boolean' | 'char' | 'String' | 'Scanner' | 'Random' | 'desconocido';

const NOMBRES_DE_TIPO_CONOCIDOS: ReadonlySet<Tipo> = new Set([
  'int', 'long', 'double', 'boolean', 'char', 'String', 'Scanner', 'Random',
]);

/** Pura: el texto de `NodoDeclaracionLocal.nombreTipo`/`NodoConversion.nombreTipo` (design.md
 * §2.3 "Tipo") al `Tipo` real, o 'desconocido' si no es uno de los 8 tipos del subconjunto
 * (design.md §2.7: "int long double boolean char String Scanner Random void" + desconocido). */
export function tipoDeNombreDeTipo(nombreTipo: string): Tipo {
  return NOMBRES_DE_TIPO_CONOCIDOS.has(nombreTipo as Tipo) ? (nombreTipo as Tipo) : 'desconocido';
}

/** Pura: el tipo estático de una expresión, hasta donde 1.7 lo necesita (switch selector). Nunca
 * lanza — lo que no sabe resolver todavía da 'desconocido' (D2, nunca inventar). */
export function tipoDeExpresion(expresion: NodoExpresion, alcance: Alcance): Tipo {
  switch (expresion.tipo) {
    case 'literal-entero':
      return 'int';
    case 'literal-largo':
      return 'long';
    case 'literal-doble':
      return 'double';
    case 'literal-caracter':
      return 'char';
    case 'literal-cadena':
      return 'String';
    case 'literal-booleano':
      return 'boolean';
    case 'nombre': {
      const simbolo = alcance.buscar(expresion.nombre);
      return simbolo === null ? 'desconocido' : tipoDeNombreDeTipo(simbolo.tipo);
    }
    case 'conversion':
      return tipoDeNombreDeTipo(expresion.nombreTipo);
    // 1.8 (JLS 15.12/5.6, REQ-BIB-004): tipo de retorno de una llamada/campo real, resuelto por
    // sobrecarga sobre el catálogo del oráculo (1.9) — nunca se inventa un tipo por adivinanza.
    case 'llamada':
      return tipoDeLlamada(expresion, alcance);
    case 'acceso-miembro':
      return tipoDeAccesoMiembro(expresion, alcance);
    // Corrección de la tarea 1.14 (JLS 15.26.1, err13 de exploracion/03): "el tipo de una expresión
    // de asignación es el tipo de la variable asignada" -- necesario para que "if (x = 5)" (con "x"
    // int) se reconozca como condición NO booleana en vez de caer en el "desconocido" que suprime
    // la cascada (D2). Descubierto al conectar atribución de punta a punta contra el catálogo real.
    case 'asignacion':
      return tipoDeExpresion(expresion.objetivo, alcance);
    // Sub-lote 1-D3 (JLS 15.9, REQ-SUB-005): tipo real de "new Clase(...)" -- el MISMO
    // `resolverSobrecarga` que ya tipa llamadas (arriba), con nombre='<init>' (design.md §1.9: los
    // constructores viven en `FIRMAS_JDK` con `genero:'constructor'`, `nombre:'<init>'`). Resuelve
    // el tipo aunque el constructor esté fuera del subconjunto (p. ej. "new Scanner(\"texto\")")
    // -- MISMO criterio que `tipoDeLlamada` ya aplica para métodos existentes-no-soportados
    // (`s.split(...)` sí tipa "String", pese a ser NO-DISP): la superficie SOPORTADA
    // (`CONSTRUCTORES_SOPORTADOS`/`MIEMBROS_SOPORTADOS`) es asunto de `atribucion.ts` (qué avisar),
    // nunca de esta función (qué tipo tiene la expresión si Java la aceptara).
    case 'nueva-instancia':
      return tipoDeNuevaInstancia(expresion, alcance);
    // Tarea 1.21 (sub-lote 1-D4, JLS 5.6.2/15.18.1): promoción numérica binaria + concatenación.
    case 'binaria':
      return tipoDeBinaria(expresion, alcance);
    // Tarea 1.21 (JLS 5.6.1): promoción numérica unaria ("+"/"-"); "!" siempre "boolean".
    case 'unaria':
      return tipoDeUnaria(expresion, alcance);
    // Tarea 1.21 (JLS 15.14/15.15): "x++"/"++x" conservan el tipo de "x" -- SIN promoción (a
    // diferencia de "-x"/"+x" arriba; exploracion/02 §6: "char c='a'; c++;" sigue siendo "char").
    case 'incremento-decremento':
      return tipoDeExpresion(expresion.operando, alcance);
    // expresion-no-soportada: construcción NO-DISP (bits, ternario, instanceof...) — ninguna
    // participa en el tipado real de este subconjunto (D2, nunca inventar).
    default:
      return 'desconocido';
  }
}

const TIPOS_NUMERICOS: ReadonlySet<Tipo> = new Set(['int', 'long', 'double', 'char']);

// JLS 5.6.2 (promoción numérica BINARIA), restringida a los tipos alcanzables de este subconjunto
// (sin byte/short/float, NO-DISP): si cualquiera de los dos es "double", el resultado es "double";
// si no, si cualquiera es "long", el resultado es "long"; si no, AMBOS promueven a "int" (incluido
// "char" + "char", que da "int", NUNCA "char" -- verificado, exploracion/02 §6: "'a'+'b'" es 195).
// 'desconocido' (o cualquier operando no-numérico, p. ej. "boolean"/"Scanner" en un "*"/"−" que
// `verificarOperandosBinaria` ya reporta aparte) propaga 'desconocido' -- D2, nunca un tipo
// aritmético inventado sobre operandos que no lo admiten.
function tipoDePromocionNumericaBinaria(izquierda: Tipo, derecha: Tipo): Tipo {
  if (!TIPOS_NUMERICOS.has(izquierda) || !TIPOS_NUMERICOS.has(derecha)) return 'desconocido';
  if (izquierda === 'double' || derecha === 'double') return 'double';
  if (izquierda === 'long' || derecha === 'long') return 'long';
  return 'int';
}

const OPERADORES_SIEMPRE_BOOLEANO: ReadonlySet<string> = new Set(['==', '!=', '<', '>', '<=', '>=', '&&', '||']);

/**
 * Tarea 1.21 (JLS 5.6.2/15.18.1, verificado contra javac 17 real esta sesión). Dos familias:
 *   - Relacionales (`< > <= >=`), igualdad (`== !=`) y lógicos (`&& ||`): el resultado es SIEMPRE
 *     "boolean", fijo por la gramática de Java -- igual sea o no válida la comparación (esa validez
 *     la reporta `verificarOperandosBinaria` en `atribucion.ts`, en su propio punto; esta función
 *     SOLO tipa expresiones, nunca decide si son correctas -- mismo principio que ya documentaba la
 *     "asignación" de la tarea 1.14 un poco más abajo). Verificado: `(a + b) == true` (con "a"/"b"
 *     "int") tipa "boolean" en javac REAL aunque la comparación en sí sea inválida (javac la
 *     rechaza con "incomparable types: int and boolean" -- un problema APARTE, no un tipo distinto).
 *   - Aritméticos (`+ - * / %`): "+" concatena (da "String") si CUALQUIER lado es "String" (JLS
 *     15.18.1, el otro lado pasa por `String.valueOf` de su tipo ESTÁTICO -- la ejecución real es
 *     asunto del lote 2); el resto de "+" y TODO "- * / %" siguen la promoción numérica binaria de
 *     arriba.
 */
function tipoDeBinaria(expresion: Extract<NodoExpresion, { tipo: 'binaria' }>, alcance: Alcance): Tipo {
  if (OPERADORES_SIEMPRE_BOOLEANO.has(expresion.operador)) return 'boolean';
  const izquierda = tipoDeExpresion(expresion.izquierda, alcance);
  const derecha = tipoDeExpresion(expresion.derecha, alcance);
  return tipoDeOperadorAritmetico(expresion.operador, izquierda, derecha);
}

/** El núcleo aritmético de `tipoDeBinaria` de arriba (JLS 5.6.2/15.18.1), sobre `Tipo` YA
 * resueltos en vez de nodos del AST -- reusada tal cual por `verificarAsignacionCompuesta`
 * (atribucion.ts, tarea 1.21, JLS 15.26.2: "E1 op= E2" promueve/concatena con las MISMAS reglas
 * que "E1 op E2" suelto antes de castear de vuelta al tipo de "E1"), nunca una segunda tabla de
 * reglas que podría divergir. Exportada por eso. */
export function tipoDeOperadorAritmetico(operador: string, izquierda: Tipo, derecha: Tipo): Tipo {
  if (operador === '+' && (izquierda === 'String' || derecha === 'String')) return 'String';
  return tipoDePromocionNumericaBinaria(izquierda, derecha);
}

/**
 * Tarea 1.21 (JLS 5.6.1, verificado contra javac 17 real esta sesión): "!" siempre da "boolean"
 * (fijo por gramática, igual que arriba); "+"/"-" unarios promueven "char" a "int" (exploracion/02
 * §6: "-c" con "c" char da "int", NUNCA "char" -- a diferencia de "c++"/"c--", que si lo conservan,
 * ver `tipoDeExpresion` arriba) y conservan cualquier otro tipo numérico tal cual. Un operando
 * 'desconocido' o no-numérico (para "+"/"-") propaga 'desconocido' -- D2, `verificarOperandosUnaria`
 * (atribucion.ts) reporta el error real si lo hay.
 */
function tipoDeUnaria(expresion: Extract<NodoExpresion, { tipo: 'unaria' }>, alcance: Alcance): Tipo {
  if (expresion.operador === '!') return 'boolean';
  const operando = tipoDeExpresion(expresion.operando, alcance);
  if (!TIPOS_NUMERICOS.has(operando)) return 'desconocido';
  return operando === 'char' ? 'int' : operando;
}

function tipoDeNuevaInstancia(expresion: Extract<NodoExpresion, { tipo: 'nueva-instancia' }>, alcance: Alcance): Tipo {
  const tipo = tipoDeNombreDeTipo(expresion.nombreTipo);
  if (tipo === 'desconocido') return 'desconocido'; // clase no reconocida — atribucion.ts ya lo reporta aparte
  const argumentos = expresion.argumentos.map((argumento) => argumentoDeSobrecarga(argumento, alcance));
  if (argumentos.includes('desconocido')) return 'desconocido'; // D2, mismo sumidero de cascada de siempre
  const firma = resolverSobrecarga(expresion.nombreTipo, '<init>', argumentos);
  return firma === null ? 'desconocido' : tipo;
}

function tipoDeLlamada(expresion: Extract<NodoExpresion, { tipo: 'llamada' }>, alcance: Alcance): Tipo {
  if (expresion.callee.tipo !== 'acceso-miembro') return 'desconocido'; // llamada de nombre libre: 1.7 la marca aparte
  const clase = claseDelObjeto(expresion.callee.objeto, alcance);
  if (clase === null) return 'desconocido';
  const argumentos = expresion.argumentos.map((argumento) => argumentoDeSobrecarga(argumento, alcance));
  const firma = resolverSobrecarga(clase, expresion.callee.miembro, argumentos);
  return firma === null ? 'desconocido' : tipoDeNombreReflejado(firma.retorno);
}

// Sub-lote 1-D4 (gap documentado en engram "Gap: System.in/System.out/System.err..."): "System.in"
// (java.io.InputStream) y "System.out"/"System.err" (java.io.PrintStream) como ARGUMENTOS de un
// constructor/método NUNCA tienen un `Tipo` cerrado (los 8 declarables de design.md §2.7 no
// incluyen esas clases -- correctamente, un alumno nunca puede escribir "InputStream x = ...;" en
// este subconjunto) -- pero SÍ tienen un nombre reflejado REAL conocido (el mismo dato del catálogo
// del oráculo, `FIRMAS_JDK`, campo `System.in`/`System.out`/`System.err`). Sin este canal PARALELO,
// `new Scanner(System.in)` "funcionaba" SOLO porque un argumento 'desconocido' apagaba
// `resolverSobrecarga` ANTES de comprobar `CONSTRUCTORES_SOPORTADOS` (D2 mal aplicado: apagaba la
// resolución del "new" COMPLETO, no solo del argumento) -- "new Scanner(System.out)" (inválido) se
// aceptaba en silencio por el MISMO mecanismo. `ArgumentoDeSobrecarga` es un `Tipo` normal para
// CUALQUIER otra expresión (nunca cambia su comportamiento, ver `esConvertiblePorEnsanchamiento`/
// `esConvertiblePorInvocacionLaxa` en conversiones.ts) y solo el nombre reflejado directo para estos
// 3 casos. Ambos verificados contra javac 17 real esta sesión: "int sc = new Scanner(System.in);"
// -> "incompatible types: Scanner cannot be converted to int"; "new Scanner(System.out)" -> "no
// suitable constructor found for Scanner(PrintStream)".
export type ArgumentoDeSobrecarga = Tipo | { readonly reflejado: string };

const CAMPOS_DE_SYSTEM_REFLEJADOS: Readonly<Record<string, string>> = {
  in: 'java.io.InputStream',
  out: 'java.io.PrintStream',
  err: 'java.io.PrintStream',
};

/** `System.in`/`System.out`/`System.err` -- el ÚNICO caso real de este subconjunto donde un campo
 * de biblioteca conocido tiene un tipo de referencia que el `Tipo` cerrado no puede representar.
 * `null` para cualquier otra expresión (el llamador cae al `Tipo` normal). Comparte el MISMO patrón
 * de detección que ya usaba `claseDelObjeto` para "System.out"/"System.err" como RECEPTOR (abajo,
 * ahora reescrito para reusar esta función, nunca una segunda implementación que podría divergir);
 * a diferencia de ahí, aquí "in" SÍ importa (es exactamente el caso real, "in" nunca se navega como
 * receptor pero SÍ se pasa como argumento). */
function campoReflejadoDeSystem(expresion: NodoExpresion, alcance: Alcance): string | null {
  if (
    expresion.tipo === 'acceso-miembro' &&
    expresion.objeto.tipo === 'nombre' &&
    expresion.objeto.nombre === 'System' &&
    alcance.buscar('System') === null
  ) {
    return CAMPOS_DE_SYSTEM_REFLEJADOS[expresion.miembro] ?? null;
  }
  return null;
}

/** El "tipo" de un argumento real para resolución de sobrecargas (JLS 15.12.2): normalmente el
 * `Tipo` cerrado de siempre (`tipoDeExpresion`); para `System.in`/`System.out`/`System.err`, su
 * nombre reflejado REAL directo (`{reflejado}`) -- nunca 'desconocido' solo porque el subconjunto
 * no puede DECLARAR ese tipo (D2 bien aplicado: SABEMOS el tipo real, con certeza, del catálogo del
 * oráculo). Pura, nunca lanza. Exportada: `atribucion.ts` la reusa tal cual para `visitarLlamadaDeMiembro`/
 * `visitarNuevaInstancia` (nunca una segunda implementación que podría divergir). */
export function argumentoDeSobrecarga(expresion: NodoExpresion, alcance: Alcance): ArgumentoDeSobrecarga {
  const campo = campoReflejadoDeSystem(expresion, alcance);
  return campo === null ? tipoDeExpresion(expresion, alcance) : { reflejado: campo };
}

/** El nombre tal como lo reporta la reflexión del JDK para un `Tipo` nuestro (`FirmaMiembro` usa
 * `Class#getTypeName()`: los primitivos se quedan igual, `String`/`Scanner`/`Random` son su nombre
 * calificado). Exportada (sub-lote 1-D4): antes vivía privada en `conversiones.ts`; ahora vive
 * junto a `Tipo`, su dueño real, y `conversiones.ts` la importa -- nunca una segunda copia. */
export function nombreReflejado(tipo: Tipo): string {
  if (tipo === 'String') return 'java.lang.String';
  if (tipo === 'Scanner') return 'java.util.Scanner';
  if (tipo === 'Random') return 'java.util.Random';
  return tipo;
}

function tipoDeAccesoMiembro(expresion: Extract<NodoExpresion, { tipo: 'acceso-miembro' }>, alcance: Alcance): Tipo {
  const clase = claseDelObjeto(expresion.objeto, alcance);
  if (clase === null) return 'desconocido';
  const campos = buscarFirmas(clase, expresion.miembro).filter((firma) => firma.genero === 'campo');
  return campos.length === 1 ? tipoDeNombreReflejado(campos[0]!.retorno) : 'desconocido';
}

/** La "clase" de un objeto receptor (el `Math` de `Math.round(...)`, el `sc` de `sc.nextInt()`):
 * una referencia ESTÁTICA a un nombre de clase reconocido (cuando NO hay una variable con ese
 * mismo nombre en alcance — una variable real siempre gana), o la clase del `Tipo` de la
 * expresión si es de referencia (`String`/`Scanner`/`Random`, las únicas con miembros de
 * instancia en este subconjunto: los primitivos no tienen métodos en Java).
 *
 * Exportada desde el sub-lote 1-D2c: `atribucion.ts` la reusa tal cual para clasificar cada
 * llamada/acceso a miembro contra el catálogo real (`catalogo-api.ts`) — MISMA función que ya
 * resolvía el receptor para calcular el TIPO de la expresión (arriba), nunca una segunda
 * implementación que podría divergir. */
export function claseDelObjeto(objeto: NodoExpresion, alcance: Alcance): string | null {
  if (objeto.tipo === 'nombre') {
    const variable = alcance.buscar(objeto.nombre);
    if (variable === null && NOMBRES_DE_CLASE_RECONOCIDOS.has(objeto.nombre)) return objeto.nombre;
  }
  // Sub-lote 1-D3 (mutante real contra veredicto de javac; "pendiente heredado 2" de 1.8, ver la
  // cabecera de `esInicioDeImpresion`): "System.out"/"System.err" son la ÚNICA clase de biblioteca
  // de este subconjunto cuyos miembros se navegan DOS veces -- pero solo "System.out.println/
  // print" pasan por la gramática dedicada; "System.err.println(...)" y cualquier
  // "System.out.OTRO(...)" (p. ej. un método inventado) caen en el camino GENERAL de expresiones.
  // Sin este caso, `tipoDeExpresion(System.out)` daba 'desconocido' (PrintStream no es un `Tipo`
  // declarable de este subconjunto) y la cascada se suprimía SIEMPRE -- verificado contra javac 17
  // real (mutante real): "System.out.Bienvenida(\"...\")" (método inventado) -> "cannot find
  // symbol: method Bienvenida(String)", javac lo rechaza; nuestro motor lo aceptaba en silencio.
  // "System.in" (reusa `campoReflejadoDeSystem`, sub-lote 1-D4) queda FUERA a propósito -- no
  // navegable en este subconjunto: se consume directo como argumento de "new Scanner(...)", nunca
  // "System.in.algo()" (InputStream no tiene miembros de este catálogo).
  if (campoReflejadoDeSystem(objeto, alcance) === 'java.io.PrintStream') return 'PrintStream';
  const tipo = tipoDeExpresion(objeto, alcance);
  return tipo === 'String' || tipo === 'Scanner' || tipo === 'Random' ? tipo : null;
}

const NOMBRES_DE_TIPO_PRIMITIVO_REFLEJADOS: ReadonlySet<string> = new Set(['int', 'long', 'double', 'char', 'boolean']);

/** El tipo real de retorno de una `FirmaMiembro` (`Class#getTypeName()`, p. ej. "int",
 * "java.lang.String", "void") al `Tipo` nuestro — 'desconocido' para lo que este subconjunto no
 * modela como valor (`void`, cualquier otra clase de referencia: p. ej. `Scanner#useDelimiter`
 * devuelve el propio `Scanner` para encadenar, algo que este subconjunto no soporta). */
function tipoDeNombreReflejado(nombreReflejado: string): Tipo {
  if (nombreReflejado === 'java.lang.String') return 'String';
  return NOMBRES_DE_TIPO_PRIMITIVO_REFLEJADOS.has(nombreReflejado) ? (nombreReflejado as Tipo) : 'desconocido';
}

// REQ-SUB-005: nombres de clase que el subconjunto reconoce como referencia ESTÁTICA (el "Math"
// de "Math.round(x)", el "String" de "String.format(...)", etc.) — nunca se buscan como variable.
// Viene del catálogo real generado por el oráculo (tarea 1.9, ADR 010), no de una lista aparte
// que alguien tendría que mantener sincronizada a mano.
export const NOMBRES_DE_CLASE_RECONOCIDOS: ReadonlySet<string> = new Set(FIRMAS_JDK.map((f) => f.clase));
