// Modelo de problemas (design.md §2.2). Catálogo cerrado de `CodigoProblema` (tarea 1.11) sobre
// los casos del subconjunto verificados en `exploracion/03-semantica-texto-entrada-errores.md` §4
// que caen en el ALCANCE de esta tarea — REQ-COMP-001 (tipos), REQ-COMP-002/003 (símbolo/alcance/
// sombreado) y un puñado de errores de sintaxis básicos (punto y coma, paréntesis) — MÁS el
// selector de `switch`/`break`/`continue` de la tarea 1.7. Los mensajes en español viven en
// `src/textos/es-MX/problemas.ts` (ADR 015: el motor nunca arma texto, solo emite código + datos).
//
// Alcanzabilidad (REQ-COMP-010, JLS 14.22, pasada 3 de ADR 004) se agregó en la tarea 1.12
// (sub-lote 1-D1, `semantica/alcanzabilidad.ts`) — un único código, `sentencia-inalcanzable`, sin
// distinguir la CAUSA (tras "return"/"break"/"continue", cuerpo de ciclo con condición constante
// `false`, cola de un ciclo con condición constante `true` sin `break`): el mensaje amable
// ("esta línea nunca se ejecuta") es el mismo en los 4 casos, igual que exige el escenario
// verificado de REQ-COMP-010.
//
// QUEDA FUERA de este cierre, a propósito (ver el reporte de la tarea 1.11 para el detalle
// completo de motivos por caso):
//   - Asignación definitiva (REQ-COMP-004, tarea 1.13): pasada propia que todavía no existe — sus
//     códigos se agregan cuando se construya.
//   - Arranque (REQ-COMP-007/008, tarea 1.15): categoría `error-arranque` sin código propio
//     todavía (se muestra como excepción, design.md §2.2).
//   - Los códigos de "no disponible" (`sintaxis/no-soportado.ts`, el léxico y
//     `sintaxis/expresiones.ts`) — un catálogo YA organizado y probado desde 1.1-1.6/1.17, con su
//     propia tabla `CODIGOS_NO_SOPORTADO` (`no-soportado.ts`, tareas 1.24-1.26): un `Problema` de
//     categoría `no-disponible` trae uno de esos códigos, no uno de los de aquí abajo.
//
// Tarea 1.28 (agregada por el orquestador, decisión del PO 2026-09-29: «la pantalla muestra el
// texto real de cada problema»): `Problema` deja de ser una interfaz plana (`codigo: CodigoProblema
// | string`, `datos: Record<string, unknown>`, que la presentación no podía estrechar sin un `as`)
// y pasa a ser una UNIÓN DISCRIMINADA por `categoria`, con el código estrechado por categoría y los
// datos EXACTOS de cada código — el mismo mecanismo que la tarea 1.25 ya dio a los avisos
// (`DatosPorCodigoNoSoportado`/`ConDatosPorCodigo`), ahora también para los errores de compilación
// (`DatosPorCodigoProblema`, movido aquí desde el catálogo de textos). Un emisor que construye un
// problema sin los datos que su texto exige deja de compilar (`npm run tipos`). No cambia nada en
// ejecución: cada sitio de emisión ya construía sus datos exactos.
import type { Rango } from './fuente/rango.ts';
import type { ConDatosPorCodigo } from './no-soportado.ts';
import type { Tipo } from './semantica/tipos.ts';

export type Categoria = 'error-compilacion' | 'no-disponible' | 'error-arranque';

// Unión cerrada (tarea 1.11) de los códigos de ATRIBUCIÓN (tipo/símbolo/alcance, REQ-COMP-001/
// 002/003 + switch/break/continue de 1.7) y de un primer tramo de errores de SINTAXIS básicos.
export type CodigoProblema =
  // Sintaxis (pasada 1) — mapeados desde `ErrorDeCompilacion.esperado` en `compilador.ts`.
  | 'falta-punto-y-coma' // err01
  | 'falta-parentesis-cierre' // err23, err32
  | 'error-no-clasificado' // cualquier otro fallo de léxico/sintaxis (catch-all honesto, D2)
  // Símbolo y alcance (pasada 2, REQ-COMP-002/003).
  | 'variable-no-declarada' // err02
  | 'metodo-no-declarado' // err03
  | 'variable-ya-definida' // flow13, flow18, flow19
  | 'tipo-no-reconocido' // err18
  // Biblioteca — miembro real de una clase reconocida (sub-lote 1-D2c, REQ-SUB-005/007,
  // task_c0cf2e6c): "campo"/"miembro" distinguen acceso de VALOR ("Math.PIE", sin llamar) de
  // LLAMADA ("s.lenght()"), igual que "variable-no-declarada"/"metodo-no-declarado" ya distinguen
  // lo mismo para nombres SUELTOS (sin receptor) — javac resuelve campos y métodos en espacios de
  // nombres separados (JLS 6.5.6), verificado contra javac 17 real: "cannot find symbol: variable
  // length" (método usado sin paréntesis) vs "cannot find symbol: method PI()" (campo llamado).
  | 'campo-no-declarado'
  | 'miembro-no-declarado'
  // El miembro SÍ existe y está soportado, pero NINGÚN argumento real encaja en ninguna sobrecarga
  // real (JLS 15.12.2, las 3 fases de sobrecargas.ts agotadas) — verificado contra javac 17 real:
  // "no suitable method found for max(String,int)" (Math.max("a",1)), "incompatible types: String
  // cannot be converted to int" (s.charAt("0")): dos frases distintas de javac para el MISMO
  // problema (candidato único vs varios) -- este catálogo usa un solo código para ambas, igual que
  // ya hace con "operandos-invalidos-operador-binario" para varias frases crudas de javac.
  | 'sin-sobrecarga-aplicable'
  // Sub-lote 1-D3 (JLS 15.9, REQ-SUB-005): como "sin-sobrecarga-aplicable", pero para "new
  // Clase(...)" -- javac usa una frase DISTINTA para constructores ("no suitable CONSTRUCTOR
  // found for X(...)", nunca "method"), verificado contra javac 17 real: "no suitable constructor
  // found for Scanner(no arguments)" (Scanner NO tiene constructor de aridad 0 — sus 16
  // constructores reales piden Readable/InputStream/File/Path/String/ReadableByteChannel, nunca
  // nada). Mismo `resolverSobrecarga` (JLS 15.12.2) que ya resuelve métodos, con nombre='<init>'.
  | 'sin-constructor-aplicable'
  // Tipos (pasada 2, REQ-COMP-001).
  | 'conversion-con-perdida' // err04
  | 'tipos-incompatibles-en-asignacion' // err12
  | 'condicion-no-booleana' // err13, err33
  | 'tipos-incomparables' // err28
  | 'operandos-invalidos-operador-binario' // err35
  // Tarea 1.21 (sub-lote 1-D4, JLS 5.6.1/15.14/15.15): "!x" con "x" no booleano, "-b"/"+b" con "b"
  // no numérico, "b++"/"s--" con un operando no numérico -- verificado contra javac 17 real: "bad
  // operand type X for unary operator 'Y'" (código DISTINTO de "operandos-invalidos-operador-
  // binario", que exige DOS tipos; aquí solo hay un operando).
  | 'operando-invalido-operador-unario'
  // Tarea 1.21 (REQ-SUB-001): "import java.utilScanner;" (nombre calificado que no resuelve a
  // ninguna clase real del catálogo) -- verificado contra javac 17 real: "cannot find symbol: class
  // X, location: package Y", anclado en la propia línea del import.
  | 'importacion-no-reconocida'
  // Tarea 1.21 (cierre de C7, JLS 4.12.3/15.14/15.26): el objetivo de una asignación o el operando
  // de "++"/"--" no es una variable real (un nombre de CLASE, p. ej. "Scanner = ...", o el VALOR de
  // otra expresión, p. ej. "fila++ ++") -- verificado contra javac 17 real: "cannot find symbol:
  // variable X" / "unexpected type, required: variable, found: value" (dos frases, un solo código).
  | 'objetivo-no-es-variable'
  // `switch` (REQ-COMP-002, design.md §2.7).
  | 'selector-de-switch-invalido'
  | 'etiqueta-de-case-no-constante' // err34
  | 'etiqueta-de-case-duplicada' // flow05
  // Flujo (pendiente heredado 1 del sub-lote 1-B, verificado que vive en esta pasada).
  | 'break-fuera-de-contexto' // err29
  | 'continue-fuera-de-contexto' // err30
  // Deuda del commit 999a8ca (sub-lote 1-D1): 5 errores de sintaxis básicos + Scanner sin import,
  // los MÁS frecuentes de un alumno (exploracion/03 §4) — antes caían en el catch-all
  // "error-no-clasificado" (veredicto y línea correctos, sin texto propio).
  | 'else-sin-if' // err14
  | 'cadena-sin-cerrar' // err15
  | 'fin-de-archivo-inesperado' // err16
  | 'llave-de-cierre-sobrante' // err17
  | 'llave-de-metodo-faltante' // err22
  // Tarea 1.21 (sub-lote 1-D4, cierre de C7, mutante real): falta la "{" que abre el CUERPO DE LA
  // CLASE -- código DISTINTO de "llave-de-metodo-faltante" (ese es sobre la "{" de "main"; javac
  // ancla ambos en el mismo patrón -- fin del token anterior -- pero son construcciones distintas,
  // mensajes amables distintos).
  | 'llave-de-clase-faltante'
  | 'paquete-despues-de-import' // struct07
  | 'tipo-requiere-import' // err20 (atribución, no sintaxis — Scanner/Random sin import)
  // Sub-lote 1-D3 (mutante real contra veredicto de javac, JLS 8.3/8.4.3): "public static static
  // void main" / "public public class" -- verificado contra javac 17 real: "repeated modifier",
  // apuntando al SEGUNDO modificador repetido (nunca al primero).
  | 'modificador-repetido'
  // Alcanzabilidad (pasada 3 de ADR 004, tarea 1.12, JLS 14.22, REQ-COMP-010).
  | 'sentencia-inalcanzable'
  // Asignación definitiva (pasada 4 de ADR 004, tarea 1.13, JLS 16, REQ-COMP-004). Un solo código
  // por causa (igual que "sentencia-inalcanzable" unifica 4 causas de JLS 14.22): el mensaje
  // amable no distingue "nunca se asignó" de "solo en una rama" de "el ciclo podría no correr" —
  // todas dicen lo mismo con la palabra correcta ("podría no tener un valor").
  | 'variable-posiblemente-no-asignada' // err05, err06, err09, err10, switch sin "default"
  | 'variable-final-reasignada'; // err10c (JLS 4.12.4 + 16.1: una "final" solo admite un valor)

// Datos EXTRA que el texto es-MX (`src/textos/es-MX/problemas.ts`) necesita de cada código — la
// ÚNICA fuente de verdad de su forma. Vive en el MOTOR (no en el catálogo) para que el propio emisor
// (`semantica/*.ts`, `compilador.ts`) quede obligado a construir su problema CONTRA ella: nunca al
// revés (un catálogo de textos no puede obligar a nada del lado del motor). El catálogo la importa
// vía `motor/vista.ts` para tipar el argumento de cada función (ADR 015 punto 1), así que las DOS
// puntas comparten un solo contrato. `Record<never, never>` (⇒ solo `{}`) para los códigos cuyo
// texto no usa ningún dato.
interface DatosNombre {
  readonly nombre: string;
}

interface DatosNombreConSugerencia {
  readonly nombre: string;
  readonly sugerencia?: string;
}

interface DatosConversion {
  readonly origen: Tipo;
  readonly destino: Tipo;
}

interface DatosCondicion {
  readonly tipo: Tipo;
}

interface DatosComparacion {
  readonly izquierda: Tipo;
  readonly derecha: Tipo;
}

interface DatosOperadorBinario {
  readonly operador: string;
  readonly izquierda: Tipo;
  readonly derecha: Tipo;
}

// Tarea 1.21 (sub-lote 1-D4): un solo operando -- a diferencia de `DatosOperadorBinario`, que
// siempre trae dos (izquierda/derecha).
interface DatosOperadorUnario {
  readonly operador: string;
  readonly operando: Tipo;
}

// Lo que `compilador.ts` (`construirProblema`) empaqueta para CUALQUIER error de sintaxis: el
// mensaje del `ErrorDeCompilacion`, en español, escrito por el propio analizador.
interface DatosMensajeCrudo {
  readonly mensaje: string;
}

// Sub-lote 1-D2c (REQ-SUB-005/007, task_c0cf2e6c): "clase"/"nombre" identifican el receptor real
// (el "Math" de "Math.raiz", el "String" de "s.lenght") — nunca solo el nombre suelto, a
// diferencia de "metodo-no-declarado" (que SÍ es un nombre suelto, sin receptor: REQ-SUB-007 dice
// "ningún método propio existe en el subconjunto").
interface DatosMiembro {
  readonly clase: string;
  readonly nombre: string;
}

// Tarea NUEVA (sub-lote 1-D5): `argumentos` es `string`, NO `Tipo` -- desde esta tarea puede traer
// el nombre SIMPLE de una clase reflejada que el `Tipo` cerrado de 8 valores nunca representa
// ("InputStream"/"PrintStream" para System.in/out/err, ver `nombreDeArgumentoParaMostrar` en
// tipos.ts) -- es un valor puramente para MOSTRAR (nunca se vuelve a comparar/resolver con él),
// así que ensancharlo de `Tipo` a `string` es seguro.
interface DatosSinSobrecarga {
  readonly clase: string;
  readonly nombre: string;
  readonly argumentos: readonly string[];
}

// Sub-lote 1-D3 (JLS 15.9): sin "nombre" -- a diferencia de un método, un constructor no tiene un
// nombre propio distinto de su clase ("new Scanner(...)" nunca es "Scanner.algo(...)").
interface DatosSinConstructor {
  readonly clase: string;
  readonly argumentos: readonly string[];
}

// `rangoExistente`: dónde se declaró antes el nombre repetido. El texto actual no lo usa; el motor
// lo manda desde el sub-lote 1-C2 y queda disponible para señalarlo en el editor (lote 4).
interface DatosVariableYaDefinida {
  readonly nombre: string;
  readonly rangoExistente: Rango;
}

export interface DatosPorCodigoProblema {
  'falta-punto-y-coma': DatosMensajeCrudo;
  'falta-parentesis-cierre': DatosMensajeCrudo;
  'error-no-clasificado': DatosMensajeCrudo;
  'variable-no-declarada': DatosNombreConSugerencia;
  'metodo-no-declarado': DatosNombre;
  'variable-ya-definida': DatosVariableYaDefinida;
  'tipo-no-reconocido': DatosNombre;
  'campo-no-declarado': DatosMiembro;
  'miembro-no-declarado': DatosMiembro;
  'sin-sobrecarga-aplicable': DatosSinSobrecarga;
  'sin-constructor-aplicable': DatosSinConstructor;
  'conversion-con-perdida': DatosConversion;
  'tipos-incompatibles-en-asignacion': DatosConversion;
  'condicion-no-booleana': DatosCondicion;
  'tipos-incomparables': DatosComparacion;
  'operandos-invalidos-operador-binario': DatosOperadorBinario;
  'operando-invalido-operador-unario': DatosOperadorUnario;
  'importacion-no-reconocida': DatosNombre;
  'objetivo-no-es-variable': Record<never, never>;
  'selector-de-switch-invalido': DatosCondicion;
  'etiqueta-de-case-no-constante': Record<never, never>;
  'etiqueta-de-case-duplicada': Record<never, never>;
  'break-fuera-de-contexto': Record<never, never>;
  'continue-fuera-de-contexto': Record<never, never>;
  'else-sin-if': DatosMensajeCrudo;
  'cadena-sin-cerrar': DatosMensajeCrudo;
  'fin-de-archivo-inesperado': DatosMensajeCrudo;
  'llave-de-cierre-sobrante': DatosMensajeCrudo;
  'llave-de-metodo-faltante': DatosMensajeCrudo;
  'llave-de-clase-faltante': DatosMensajeCrudo;
  'paquete-despues-de-import': DatosMensajeCrudo;
  'tipo-requiere-import': DatosNombre;
  'modificador-repetido': DatosMensajeCrudo;
  'sentencia-inalcanzable': Record<never, never>;
  'variable-posiblemente-no-asignada': DatosNombre;
  'variable-final-reasignada': DatosNombre;
}

// Los códigos que `compilar()` saca de un `ErrorDeCompilacion` (léxico y sintaxis): TODOS llevan
// como datos el mensaje del propio error (`construirProblema`), a diferencia de los de atribución,
// que traen los datos estructurados de su regla. Subconjunto de `CodigoProblema` — el tipo obliga
// a que un `ErrorDeCompilacion` solo pueda declarar uno de estos, así que `construirProblema`
// siempre arma datos que su código admite.
export type CodigoDeSintaxis = Extract<
  CodigoProblema,
  | 'falta-punto-y-coma'
  | 'falta-parentesis-cierre'
  | 'error-no-clasificado'
  | 'else-sin-if'
  | 'cadena-sin-cerrar'
  | 'fin-de-archivo-inesperado'
  | 'llave-de-cierre-sobrante'
  | 'llave-de-metodo-faltante'
  | 'llave-de-clase-faltante'
  | 'paquete-despues-de-import'
  | 'modificador-repetido'
>;

interface ProblemaComun {
  readonly codigoJavac?: string;
  readonly rango: Rango;
  readonly linea: number;
}

/** Un error del ALUMNO que javac también rechaza: un código de `CodigoProblema` con SUS datos. */
export type ProblemaDeCompilacion = {
  readonly [C in CodigoProblema]: ProblemaComun & {
    readonly categoria: 'error-compilacion';
    readonly codigo: C;
    readonly datos: DatosPorCodigoProblema[C];
  };
}[CodigoProblema];

/** Algo que Java acepta pero este visualizador no cubre (o todavía no ejecuta): un código de
 * `CodigoNoSoportado` con SUS datos (`DatosPorCodigoNoSoportado`, tarea 1.25). */
export type ProblemaNoDisponible = ConDatosPorCodigo<ProblemaComun & { readonly categoria: 'no-disponible' }>;

// `categoria: 'error-arranque'` (`Categoria`, design.md §2.2) NO es una variante de `Problema`:
// `compilar()` nunca devuelve `ok:false` por un arranque inválido (javac SÍ compila un `main` sin
// `static`); ese problema viaja aparte, como `ProblemaArranque`, y aparece al ejecutar.
export type Problema = ProblemaDeCompilacion | ProblemaNoDisponible;

export type CausaFin =
  | 'terminado'
  | 'excepcion'
  | 'error-arranque'
  | 'no-disponible-en-ejecucion'
  | 'limite-pasos'
  | 'limite-caracteres'
  | 'limite-tiempo'
  | 'error-interno';

// Tarea 1.15 (REQ-COMP-007/008, ADR 004 pasada 5 "arranque"; decisión del orquestador, design.md
// §2.2): a diferencia de `CodigoProblema` (categoría `error-compilacion`), esto NUNCA hace que
// `compilar()` devuelva `ok:false` -- javac SÍ compila un `main` sin `static` o una clase sin
// `main` (verificado, exploracion/03 §4.2). El problema real solo aparece al EJECUTAR, por eso
// vive junto a `CausaFin` (que ya tenía `'error-arranque'` reservado desde la rebanada vertical) y
// no junto a `CodigoProblema`.
export type CodigoArranque = 'sin-main' | 'main-no-static';

export interface ProblemaArranque {
  readonly codigo: CodigoArranque;
  /** El nombre REAL de la clase del alumno (`NodoClase.nombre`) -- nunca el nombre de ejemplo que
   * usó el oráculo para capturar `textoLanzador` (design.md §2.2: "se muestra tal cual" se refiere
   * a la ESTRUCTURA del mensaje real de Java, no a mostrarle al alumno la clase de otro). */
  readonly nombreClase: string;
  /** El texto EXACTO que capturó el oráculo del lanzador de JDK 17 real (es-MX), con el nombre de
   * clase de ejemplo sustituido por `nombreClase` -- incluidas sus rarezas (el `\n` LITERAL del
   * caso "sin main", ver `marcos-arranque.generado.ts`), sin reinterpretar nada más. Es el
   * "detalle secundario" de la decisión del orquestador; el texto amable ("texto principal") sale
   * del catálogo es-MX (`src/textos/es-MX/arranque.ts`) a partir de `codigo` + `nombreClase`. */
  readonly textoLanzador: string;
}
