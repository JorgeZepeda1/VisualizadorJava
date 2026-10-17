// IR tipada del subconjunto (tarea 2.16, design.md §3.1, ADR 005 punto 1). El semántico BAJA el AST a esta forma: cada operación ya sabe su
// tipo (`aritmetica` de `int`, de `long` o de `double`; `concatenacion`; `comparacion` numérica o de referencias…), cada local su ranura,
// cada llamada a la biblioteca su clave de firma resuelta, y las conversiones implícitas son nodos visibles (`conversion` con
// `implicita: true`: el Detallado mostrará «'a' se promueve a int: 97»). Definición de tipos — se ejercita en generar-ir.test.ts,
// plan-evaluacion.test.ts y las pruebas del intérprete.
import type { Rango } from '../fuente/rango.ts';
import type { ProblemaArranque } from '../problemas.ts';

/** Los tipos de un valor en tiempo de ejecución. `InputStream` y `PrintStream` solo existen como `System.in` / `System.out` / `System.err`. */
export type TipoIr = 'int' | 'long' | 'double' | 'boolean' | 'char' | 'String' | 'Scanner' | 'Random';
export type TipoNumericoIr = 'int' | 'long' | 'double' | 'char';

/** Una variable local: una ranura por declaración (design.md §2.7: no hay recursión, un solo marco). */
export interface RanuraIr {
  readonly indice: number;
  readonly nombre: string;
  readonly tipo: TipoIr;
  /** El nodo del paso que la declara. */
  readonly nodo: number;
  readonly esFinal: boolean;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Expresiones
// ---------------------------------------------------------------------------------------------------------------------------------

/**
 * Lo que toda expresión lleva: su forma, su tipo estático, dónde está en el programa y su `punto` en el plan de evaluación del nodo (el
 * índice donde el intérprete anota su valor; `-1` si no tiene punto: `System.out`, `System.in`, `Math` como referencia estática).
 */
interface BaseExpresionIr {
  readonly punto: number;
  readonly rango: Rango;
}

export interface ConstanteIr extends BaseExpresionIr {
  readonly forma: 'constante';
  readonly tipo: TipoIr;
  /** `number` para `int`/`char`/`double`, `bigint` para `long`, `boolean`, y para `String` el texto (el intérprete lo convierte en la `CadenaJava` internada). */
  readonly valor: number | bigint | boolean | string;
}

export interface LecturaIr extends BaseExpresionIr {
  readonly forma: 'lectura';
  readonly tipo: TipoIr;
  readonly ranura: number;
  readonly nombre: string;
}

/** Ensanchamiento (implícito) o cast (explícito) entre tipos numéricos; `implicita` lo distingue para la explicación («se promueve» / «se convierte»). */
export interface ConversionIr extends BaseExpresionIr {
  readonly forma: 'conversion';
  readonly tipo: TipoNumericoIr;
  readonly de: TipoNumericoIr;
  readonly operando: ExpresionIr;
  readonly implicita: boolean;
}

export type OperadorAritmeticoIr = '+' | '-' | '*' | '/' | '%';

/** `a op b` con los dos operandos YA convertidos a `tipo` (la promoción numérica binaria es visible como `conversion` en los operandos). */
export interface AritmeticaIr extends BaseExpresionIr {
  readonly forma: 'aritmetica';
  readonly tipo: 'int' | 'long' | 'double';
  readonly operador: OperadorAritmeticoIr;
  readonly izquierda: ExpresionIr;
  readonly derecha: ExpresionIr;
}

/** `-x` sobre un operando ya promovido (`+x` no deja nodo: solo la promoción). */
export interface MenosIr extends BaseExpresionIr {
  readonly forma: 'menos';
  readonly tipo: 'int' | 'long' | 'double';
  readonly operando: ExpresionIr;
}

export type OperadorComparacionIr = '<' | '<=' | '>' | '>=' | '==' | '!=';

/** Comparación de números (operandos ya promovidos a `tipoOperandos`), de booleanos o de referencias (`String`, `Scanner`, `Random`: identidad). */
export interface ComparacionIr extends BaseExpresionIr {
  readonly forma: 'comparacion';
  readonly tipo: 'boolean';
  readonly operador: OperadorComparacionIr;
  readonly tipoOperandos: 'int' | 'long' | 'double' | 'boolean' | 'referencia';
  readonly izquierda: ExpresionIr;
  readonly derecha: ExpresionIr;
}

/** `&&` y `||` con corto circuito: el operando derecho puede quedar sin evaluar (su valor en el registro es `null`). */
export interface LogicaIr extends BaseExpresionIr {
  readonly forma: 'logica';
  readonly tipo: 'boolean';
  readonly operador: '&&' | '||';
  readonly izquierda: ExpresionIr;
  readonly derecha: ExpresionIr;
}

export interface NegacionIr extends BaseExpresionIr {
  readonly forma: 'negacion';
  readonly tipo: 'boolean';
  readonly operando: ExpresionIr;
}

/** `+` con algún operando `String` (JLS 15.18.1): cada lado pasa por `String.valueOf` de su tipo ESTÁTICO. */
export interface ConcatenacionIr extends BaseExpresionIr {
  readonly forma: 'concatenacion';
  readonly tipo: 'String';
  readonly izquierda: ExpresionIr;
  readonly derecha: ExpresionIr;
}

/** `x = e` con `valor` ya convertido al tipo de `x`. El valor de la expresión es el asignado. */
export interface AsignacionIr extends BaseExpresionIr {
  readonly forma: 'asignacion';
  readonly tipo: TipoIr;
  readonly ranura: number;
  readonly nombre: string;
  readonly valor: ExpresionIr;
}

/**
 * `x op= e` (JLS 15.26.2): `x = (T)(x op e)`. `lectura` es la lectura previa de `x` (va PRIMERO en el plan: «en `x op= e` primero se lee `x`»);
 * `valor` ya está convertido a `tipoOperacion` (la promoción de `T` con el tipo de `e`; `String` si es `s += …`). El resultado se estrecha de
 * vuelta a `tipo` (el tipo de `x`).
 */
export interface AsignacionCompuestaIr extends BaseExpresionIr {
  readonly forma: 'asignacion-compuesta';
  readonly tipo: TipoIr;
  readonly ranura: number;
  readonly nombre: string;
  readonly operador: OperadorAritmeticoIr;
  readonly tipoOperacion: 'int' | 'long' | 'double' | 'String';
  readonly lectura: LecturaIr;
  readonly valor: ExpresionIr;
}

/** `x++`, `++x`, `x--`, `--x` sobre una local; el valor de la expresión es el anterior (postfijo) o el nuevo (prefijo). */
export interface IncrementoIr extends BaseExpresionIr {
  readonly forma: 'incremento';
  readonly tipo: 'int' | 'long' | 'double' | 'char';
  readonly ranura: number;
  readonly nombre: string;
  readonly delta: 1 | -1;
  readonly posicion: 'prefijo' | 'postfijo';
}

/**
 * Una llamada a la biblioteca: `clave` es la firma resuelta (`Clase.metodo(tipo,tipo)` con los nombres reflejados del JDK, p. ej.
 * `String.charAt(int)`, `PrintStream.println(int)`, `Math.abs(double)`) — la llave con la que el intérprete busca la función en el puerto.
 * `receptor` es `null` para un método estático y para `System.out`/`System.err` (que se indican con `flujo`). `tipo` es `null` si devuelve `void`.
 */
export interface LlamadaIr extends BaseExpresionIr {
  readonly forma: 'llamada';
  readonly tipo: TipoIr | null;
  readonly clave: string;
  readonly receptor: ExpresionIr | null;
  readonly flujo: 'out' | 'err' | null;
  readonly argumentos: readonly ExpresionIr[];
  /** Los argumentos variables (`Object...` de `printf`/`String.format`), cada uno con su tipo estático (`%d` con un `char` falla distinto que con un `int`); `null` si la firma no es variable. */
  readonly variables: readonly ExpresionIr[] | null;
  /** La resuelve el intérprete por sí mismo (`print`/`println`); si no, viene del puerto de la biblioteca. */
  readonly esNativa: boolean;
}

/** `new Scanner(System.in)` (el `System.in` no queda como argumento: la clave ya lo dice), `new Random(semilla)`, `new String(texto)`. */
export interface NuevoIr extends BaseExpresionIr {
  readonly forma: 'nuevo';
  readonly tipo: TipoIr;
  readonly clave: string;
  readonly argumentos: readonly ExpresionIr[];
}

export type ExpresionIr =
  | ConstanteIr
  | LecturaIr
  | ConversionIr
  | AritmeticaIr
  | MenosIr
  | ComparacionIr
  | LogicaIr
  | NegacionIr
  | ConcatenacionIr
  | AsignacionIr
  | AsignacionCompuestaIr
  | IncrementoIr
  | LlamadaIr
  | NuevoIr;

/** La expresión raíz de un paso, con el texto del programa que la escribió (para que la explicación diga «`cantidad < 1`» sin tener el código fuente). */
export interface RaizIr {
  readonly expresion: ExpresionIr;
  readonly texto: string;
  /** Desplazamiento de `texto` en el programa: los rangos de los puntos del plan son del programa, no de `texto`. */
  readonly inicio: number;
  /** ¿Llama a la biblioteca (puede leer entrada, gastar azar)? Si sí, el intérprete toma una instantánea para reintentar (ADR 005 punto 4). */
  readonly conBiblioteca: boolean;
}

/** Un punto del plan de evaluación (design.md §3.1): una subexpresión, en el orden en que Java la evalúa; su valor se anota en `Paso.valores[índice]`. */
export interface PuntoDelPlan {
  readonly forma: ExpresionIr['forma'];
  /** `null` si es una llamada `void`. */
  readonly tipo: TipoIr | null;
  readonly rango: Rango;
  /** Solo en `lectura`, `asignacion`, `asignacion-compuesta` e `incremento`: el nombre de la variable. */
  readonly nombre?: string;
  /** Solo en `conversion`: el tipo de origen y si es implícita. */
  readonly de?: TipoNumericoIr;
  readonly implicita?: boolean;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Sentencias
// ---------------------------------------------------------------------------------------------------------------------------------

export interface DeclaradorIr {
  readonly ranura: number;
  readonly nombre: string;
  readonly tipo: TipoIr;
  readonly inicializador: RaizIr | null;
}

export interface DeclaracionIr {
  readonly forma: 'declaracion';
  readonly nodo: number;
  readonly declaradores: readonly DeclaradorIr[];
}

/**
 * Una sentencia de expresión: asignación, `++`/`--`, llamada o `new` suelto. Un `for` con varias expresiones en su inicio o su actualización
 * es UN paso con todas (`raices`). `clasePaso`: `asignacion` para `=`, `op=`, `++`/`--`; `impresion` para `print`/`println`/`printf`; `expresion` para el resto.
 */
export interface ExpresionSentenciaIr {
  readonly forma: 'expresion';
  readonly nodo: number;
  readonly clasePaso: 'asignacion' | 'expresion' | 'impresion';
  readonly raices: readonly RaizIr[];
}

export interface BloqueIr {
  readonly forma: 'bloque';
  readonly sentencias: readonly SentenciaIr[];
}

/** Una condición evaluable: su nodo (la condición tiene su propio paso) y su expresión. */
export interface CondicionIr {
  readonly nodo: number;
  readonly raiz: RaizIr;
}

export interface IfIr {
  readonly forma: 'if';
  readonly condicion: CondicionIr;
  readonly entonces: SentenciaIr;
  readonly sino: SentenciaIr | null;
}

export interface WhileIr {
  readonly forma: 'while';
  /** El nodo del ciclo (lo que `Paso.control.ciclo` nombra). */
  readonly nodo: number;
  readonly condicion: CondicionIr;
  readonly cuerpo: SentenciaIr;
}

export interface DoWhileIr {
  readonly forma: 'do-while';
  readonly nodo: number;
  readonly cuerpo: SentenciaIr;
  readonly condicion: CondicionIr;
}

export interface ForIr {
  readonly forma: 'for';
  readonly nodo: number;
  readonly inicio: DeclaracionIr | ExpresionSentenciaIr | null;
  /** `null` en `for (;;)`: no hay condición que evaluar ni paso que dar. */
  readonly condicion: CondicionIr | null;
  readonly actualizacion: ExpresionSentenciaIr | null;
  readonly cuerpo: SentenciaIr;
}

export type ElementoSwitchIr =
  | { readonly forma: 'caso'; readonly nodo: number; readonly valor: number | string; readonly texto: string }
  | { readonly forma: 'defecto'; readonly nodo: number }
  | { readonly forma: 'sentencia'; readonly sentencia: SentenciaIr };

export interface SwitchIr {
  readonly forma: 'switch';
  readonly nodo: number;
  readonly selector: RaizIr;
  readonly tipoSelector: 'int' | 'char' | 'String';
  readonly elementos: readonly ElementoSwitchIr[];
}

export interface BreakIr {
  readonly forma: 'break';
  readonly nodo: number;
}

export interface ContinueIr {
  readonly forma: 'continue';
  readonly nodo: number;
}

export interface ReturnIr {
  readonly forma: 'return';
  readonly nodo: number;
}

export interface VaciaIr {
  readonly forma: 'vacia';
  readonly nodo: number;
}

export type SentenciaIr =
  | DeclaracionIr
  | ExpresionSentenciaIr
  | BloqueIr
  | IfIr
  | WhileIr
  | DoWhileIr
  | ForIr
  | SwitchIr
  | BreakIr
  | ContinueIr
  | ReturnIr
  | VaciaIr;

// ---------------------------------------------------------------------------------------------------------------------------------
// Programa
// ---------------------------------------------------------------------------------------------------------------------------------

export type ClaseDeNodo =
  | 'declaracion'
  | 'expresion'
  | 'if'
  | 'condicion-if'
  | 'while'
  | 'do-while'
  | 'for'
  | 'condicion-ciclo'
  | 'switch'
  | 'caso'
  | 'defecto'
  | 'break'
  | 'continue'
  | 'return'
  | 'vacia';

/** Un nodo del programa: lo que `Paso.nodo` nombra (design.md §3.3, `VistaPrograma`). */
export interface NodoIr {
  readonly id: number;
  readonly clase: ClaseDeNodo;
  readonly rango: Rango;
  /** Línea (1 en adelante) donde empieza. */
  readonly linea: number;
  /** Las ranuras de las variables que están a la vista cuando el nodo se ejecuta (derivadas del texto, design.md §3.4). */
  readonly vivas: readonly number[];
  /** El plan de evaluación del nodo: sus puntos en el orden de Java; `Paso.valores` va alineado con él. */
  readonly plan: readonly PuntoDelPlan[];
}

export interface RamasDeIfIr {
  readonly nodo: number;
  readonly entonces: Rango;
  readonly sino: Rango | null;
}

export interface ProgramaIr {
  readonly sentencias: readonly SentenciaIr[];
  readonly ranuras: readonly RanuraIr[];
  readonly nodos: readonly NodoIr[];
  /** Las ramas de cada `if` (hito 2A): el nodo de su condición y los rangos de `then`/`else`; la vista del programa las lleva al editor. */
  readonly ramasDeIf: readonly RamasDeIfIr[];
  /** La clase del alumno y su paquete (`null` si no declara `package`): de ellos sale el marco `at [paquete.]Clase.main(Clase.java:N)` que la JVM imprime. */
  readonly nombreClase: string;
  readonly paquete: string | null;
}

/** Lo que produce `compilar()` cuando el análisis termina sin problemas (design.md §1.3). */
export interface ProgramaCompilado {
  readonly ir: ProgramaIr;
  /** Tarea 1.15 (REQ-COMP-007/008, ADR 004 pasada 5): `null` si el punto de entrada es válido
   * (`main` estático presente) -- si no, `crearEjecucion` lo convierte en un `Avance` de
   * `causa:'error-arranque'` al primer `avanzar()`, ANTES de ejecutar cualquier sentencia de `ir`
   * (que, en ese caso, siempre viene vacía -- ver `generar-ir.ts`). */
  readonly arranque: ProblemaArranque | null;
}
