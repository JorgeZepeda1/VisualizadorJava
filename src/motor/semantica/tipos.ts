// Tipos mínimos de la pasada de atribución (tarea 1.7, design.md §2.7). Nace angosto a propósito:
// 1.7 solo necesita resolver el tipo ESTÁTICO de literales, variables (vía `Alcance`) y casts —
// lo suficiente para el selector de `switch` (REQ-COMP-002) sin fabricar un tipo que no se puede
// verificar todavía. La tarea 1.8 AMPLÍA `tipoDeExpresion` con conversiones/sobrecargas reales
// sobre `NodoLlamada`/`NodoAccesoMiembro` (JLS 15.12) — hasta entonces, cualquier expresión que
// dependa de una llamada, operador binario/unario, asignación, etc. da 'desconocido', que
// suprime errores en cascada (design.md §2.1: "nunca se informa un error que Java podría no dar").
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
    // binaria/unaria/incremento-decremento/nueva-instancia/expresion-no-soportada: la promoción
    // numérica binaria/unaria (JLS 5.6) queda fuera de 1.7/1.8 — aquí, 'desconocido' en vez de
    // adivinar (D2). Ninguna de las dos tareas la necesita: 1.7 solo tipaba el selector de `switch`
    // (literal/variable/cast) y 1.8 solo amplía llamadas/campos reales de biblioteca.
    default:
      return 'desconocido';
  }
}

function tipoDeLlamada(expresion: Extract<NodoExpresion, { tipo: 'llamada' }>, alcance: Alcance): Tipo {
  if (expresion.callee.tipo !== 'acceso-miembro') return 'desconocido'; // llamada de nombre libre: 1.7 la marca aparte
  const clase = claseDelObjeto(expresion.callee.objeto, alcance);
  if (clase === null) return 'desconocido';
  const tiposDeArgumentos = expresion.argumentos.map((argumento) => tipoDeExpresion(argumento, alcance));
  const firma = resolverSobrecarga(clase, expresion.callee.miembro, tiposDeArgumentos);
  return firma === null ? 'desconocido' : tipoDeNombreReflejado(firma.retorno);
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
