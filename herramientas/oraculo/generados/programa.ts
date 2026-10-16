// Representación de un programa generado (tarea 1.31): un árbol de sentencias y expresiones que se
// imprime como Java. Existe como ÁRBOL, no como texto, para que el reductor (delta debugging) pueda
// quitar sentencias y sustituir subexpresiones sin volver a parsear nada, y para que cada nodo lleve
// el rasgo de construcción que ejerce (las `Etiqueta`s con que se agrupan las familias de fallas).
//
// Formato de impresión estable: una sentencia por renglón (la línea de javac señala a la sentencia
// culpable) y llaves siempre presentes. La clase se llama `P` salvo que el programa pida otro nombre
// (tarea 1.34; el `CompiladorEnLote.java` deduce el nombre del archivo del primer `class X`).

/** Rasgos de construcción que un nodo ejerce: con ellos se agrupan las discrepancias por familia. */
export type Etiqueta =
  // Rasgos de las expresiones (los pone el generador en el nodo que los ejerce).
  | 'cast'
  | 'miembro-de-primitivo'
  | 'llamada-de-biblioteca'
  | 'metodo-de-instancia-por-clase'
  | 'metodo-estatico-por-objeto'
  | 'campo-de-biblioteca'
  | 'void-como-valor'
  | 'asignacion'
  | 'asignacion-compuesta'
  | 'incremento'
  | 'operador'
  | 'nombre-contextual'
  | 'palabra-reservada-como-nombre'
  | 'nombre-invalido'
  | 'condicion'
  | 'impresion'
  // Tarea 1.33: rasgos de las formas que las campañas de la 1.32 encontraron sueltas y que salían «sin rasgos».
  | 'guion-bajo-en-literal' // un literal con un guion bajo (bien o mal puesto): `1_L`, `1_.0`, `1_e1`…
  | 'flotante-hexadecimal' // `0x1p3`, `0x1.8p1`, `0x.8p0`, `0X1P-2`, `0x1p3d`
  | 'etiqueta-de-variable' // la etiqueta de un `case` es el NOMBRE de una variable (`case s ->`), no un literal
  | 'printf-como-valor' // `System.out.printf(...)` usado donde se espera un valor: devuelve un `PrintStream`
  // Tarea 1.34: las cuatro familias de falsos aceptos que la re-verificación del lote 1 halló fuera de la gramática del generador (A–D)
  // y los nombres de propiedades de JavaScript (E).
  | 'valor-de-tipo-no-modelado' // B: `args`, `args.length()`, `System.in`, `System.out`… usados como VALOR (inicializador, operando, condición…)
  | 'sentencia-entre-parentesis' // D: `(x = 2);`, `(x++);`, `(System.out.println(1));` — una expresión entre paréntesis puesta como sentencia
  | 'nombre-de-javascript' // E: `constructor`, `toString`, `__proto__`… como nombre de variable o de miembro (válidos en Java)
  // Tarea 1.35: las familias de falsos RECHAZOS (y los falsos aceptos hallados al revisarlos) que la re-verificación del lote 1 encontró fuera de la gramática del generador.
  | 'instanceof-con-patron' // B: `o instanceof String s`, `o instanceof final String s`, `o instanceof java.lang.String`
  | 'clase-anonima' // D: `new Runnable() { … }`, `new Object() { }`
  | 'llamada-generica-explicita' // I: `P.<String>id("a")`
  | 'campo-de-la-clase' // L, O: un campo de la clase (válido o sin su `;`)
  | 'clase-sellada' // C: `sealed`, `non-sealed`, `permits`
  | 'main-con-otra-firma' // F: `main(String... args)`, `main(final String[] args)`, `main(String[] args, int n)`, `main()`…
  | 'archivo-sin-clase' // E: un archivo que no declara ninguna clase (vacío, solo `import`s)
  | 'import-con-comodin' // M: `import paquete.*;` (de un paquete que existe o no)
  | 'import-con-punto-y-coma-de-mas' // J: `import a.B;;` (un `;` suelto entre dos `import`)
  | 'llamada-a-main' // F: `main(args);` — `main` llamado como un método propio
  | 'escape-unicode' // G: un carácter del programa escrito como escape Unicode (JLS 3.3)
  // Tarea 1.35 (la mutación por elemento de los conjuntos del reconocedor de casts destapó otra familia de falsos rechazos: un TIPO en posición de expresión) y un emoji en un `char`.
  | 'literal-de-clase' // `String.class`, `int[].class`, `void.class`, `java.util.List.class`
  | 'cast-a-tipo-complejo' // `(String[]) args`, `(java.util.List<String>) x`, `(java.lang.Object) x`, `(Object & Serializable) x`
  | 'referencia-a-metodo-de-tipo' // `String[]::new`, `ArrayList<String>::new`, `int[]::clone`
  | 'caracter-suplementario' // un emoji (dos unidades UTF-16) dentro de un literal `char`
  // Tarea 1.36: las familias que la verificación final del lote 1 halló fuera de la gramática del generador (C-1, C-3, W-1, C-2/W-2, C-5/W-10, C-4).
  | 'varargs-mal-escrito' // C-1: `String . . . args`, `String .. . args`: los tres puntos de `String...` separados
  | 'paquete-declarado' // C-3: una línea `package …;` (de un paquete que el JDK exporta, uno propio, o con el nombre de una clase)
  | 'caracter-ignorable' // W-1: un carácter invisible (U+200B, U+00AD, U+FEFF…) dentro de un nombre o de una palabra clave: javac lo salta
  | 'fin-de-linea-especial' // C-2/W-2: el programa termina sus renglones con `\r`, `\r\n`, `\n\r` o una mezcla
  | 'constante-de-texto-con-decimal' // C-5/W-10: `"a" + 1.5` donde Java decide con su valor (una condición, una etiqueta de `case`, la asignación definitiva)
  | 'texto-largo' // C-4: una constante de texto en la frontera del archivo de clase (65 535 caracteres o 65 535 bytes)
  // Rasgos de las declaraciones que pone el generador.
  | 'var'
  | 'tipo-envoltorio'
  // Rasgos que se deducen de la estructura del árbol (`etiquetasDe`).
  | 'clase-con-nombre-del-jdk' // C: la clase del programa NO se llama P sino como una del JDK (`System`, `Math`, `Scanner`…)
  | 'sentencia-antes-del-primer-case' // A: una sentencia dentro del `switch` antes del primer `case`/`default`
  | 'final'
  | 'if'
  | 'while'
  | 'do-while'
  | 'for'
  | 'for-mejorado' // Tarea 1.35: `for (Tipo x : coleccion)`
  | 'switch'
  | 'switch-flecha' // Tarea 1.33: `case X -> { … }` en vez de `case X:` (rasgo del `switch` con flecha)
  | 'break'
  | 'continue'
  | 'bloque';

/** Opciones de un nodo-expresión más allá de su texto y sus hijos. */
export interface OpcionesDeExpr {
  readonly etiquetas?: readonly Etiqueta[];
  /** Nunca necesita paréntesis al ser operando (literal, nombre, llamada, `new`, expresión ya entre paréntesis). */
  readonly primaria?: boolean;
  /** El generador quiere AQUÍ un error de sintaxis (palabra reservada como nombre…). */
  readonly sintaxisInvalida?: boolean;
}

/**
 * Una expresión como plantilla con huecos: `partes[0] + hijos[0] + partes[1] + …`. `tipo` es el tipo
 * estático que el generador PRETENDE que tenga (`int`, `String`, `void`…); javac es quien decide, este
 * dato solo guía la generación y permite al reductor sustituir un nodo por un literal de su tipo.
 */
export interface Expr {
  readonly partes: readonly string[];
  readonly hijos: readonly Expr[];
  readonly tipo: string;
  readonly etiquetas?: readonly Etiqueta[];
  readonly primaria?: boolean;
  readonly sintaxisInvalida?: boolean;
}

export function plantilla(partes: readonly string[], hijos: readonly Expr[], tipo: string, opciones: OpcionesDeExpr = {}): Expr {
  if (partes.length !== hijos.length + 1) {
    throw new Error(`plantilla: ${hijos.length} hijos piden ${hijos.length + 1} partes de texto y llegaron ${partes.length}`);
  }
  return { partes, hijos, tipo, ...opciones };
}

export function literal(texto: string, tipo: string, opciones: OpcionesDeExpr = {}): Expr {
  return { partes: [texto], hijos: [], tipo, ...opciones };
}

/** Un nombre (de variable o de clase): igual que un literal, pero se distingue al leer el generador. */
export function nombre(texto: string, tipo: string, opciones: OpcionesDeExpr = {}): Expr {
  return literal(texto, tipo, opciones);
}

export function renderizarExpr(expr: Expr): string {
  let texto = expr.partes[0]!;
  for (let i = 0; i < expr.hijos.length; i += 1) texto += renderizarExpr(expr.hijos[i]!) + expr.partes[i + 1]!;
  return texto;
}

// ---- Sentencias ----

export interface Declaracion {
  readonly k: 'declaracion';
  readonly esFinal: boolean;
  readonly tipo: string;
  readonly nombre: string;
  readonly inicial: Expr | null;
  /** El generador quiere AQUÍ un error de sintaxis (p. ej. `int class = 5;`). */
  readonly sintaxisInvalida: boolean;
  readonly etiquetas: readonly Etiqueta[];
}

export interface SentenciaDeExpr {
  readonly k: 'expresion';
  readonly expr: Expr;
}

export interface Condicional {
  readonly k: 'si';
  readonly condicion: Expr;
  readonly entonces: readonly Sentencia[];
  readonly sino: readonly Sentencia[] | null;
}

export interface CicloMientras {
  readonly k: 'mientras';
  readonly condicion: Expr;
  readonly cuerpo: readonly Sentencia[];
}

export interface CicloHaz {
  readonly k: 'haz';
  readonly cuerpo: readonly Sentencia[];
  readonly condicion: Expr;
}

export interface CicloPara {
  readonly k: 'para';
  readonly inicial: Declaracion | SentenciaDeExpr | null;
  readonly condicion: Expr | null;
  readonly paso: Expr | null;
  readonly cuerpo: readonly Sentencia[];
}

/** Tarea 1.35: el `for` mejorado, `for ([final] Tipo nombre : coleccion) { … }` (JLS 14.14.2). El tipo se imprime tal cual: `int`, `float`, `int[]`, `java.util.Map.Entry<String, Integer>`… */
export interface CicloParaCada {
  readonly k: 'para-cada';
  readonly esFinal: boolean;
  readonly tipo: string;
  readonly nombre: string;
  readonly coleccion: Expr;
  readonly cuerpo: readonly Sentencia[];
}

/** Un grupo de etiquetas (`case 1, 2:`) o el `default`, con las sentencias que le siguen. */
export interface Caso {
  readonly etiquetas: readonly Expr[] | 'default';
  readonly cuerpo: readonly Sentencia[];
}

export interface Seleccion {
  readonly k: 'seleccion';
  readonly selector: Expr;
  /**
   * Tarea 1.34 (familia A): sentencias entre la llave `{` del `switch` y su primer `case`/`default`. Java solo admite ahí una etiqueta
   * (javac: «case, default, or '}' expected»), así que un `switch` con `antes` no vacío es un error de sintaxis A PROPÓSITO.
   */
  readonly antes?: readonly Sentencia[];
  readonly casos: readonly Caso[];
  /** `case X -> { … }` en vez de `case X:` (Java 14+). */
  readonly flecha: boolean;
}

export interface Salto {
  readonly k: 'salto';
  readonly palabra: 'break' | 'continue';
}

export interface BloqueAnonimo {
  readonly k: 'bloque';
  readonly sentencias: readonly Sentencia[];
}

export type Sentencia =
  | Declaracion
  | SentenciaDeExpr
  | Condicional
  | CicloMientras
  | CicloHaz
  | CicloPara
  | CicloParaCada
  | Seleccion
  | Salto
  | BloqueAnonimo;

/**
 * Tarea 1.35: un miembro de la clase (un campo, un tipo anidado, un método) que va ANTES de `main`. Sus renglones se imprimen tal cual, solo con la sangría de la clase:
 * un campo sin su `;` es un miembro cuyo último renglón no lo trae (y `sintaxisInvalida` lo dice).
 */
export interface MiembroDeClase {
  readonly lineas: readonly string[];
  readonly etiquetas: readonly Etiqueta[];
  /** El generador quiere AQUÍ un error de sintaxis (un campo sin su `;`, `int x { }`…). */
  readonly sintaxisInvalida?: boolean;
  /** El miembro va DESPUÉS de `main` (y antes de la `}` de la clase): así se prueba el último miembro de la clase. */
  readonly despuesDeMain?: boolean;
}

/**
 * Tarea 1.35 (JLS 3.3): escribe UNA aparición de `caracter` como escape Unicode (`"` → barra, `u0022`) en el texto ya impreso del programa. `aparicion` se toma módulo el número
 * de apariciones, así el escape sobrevive a que el reductor quite texto del programa. Un escape se traduce ANTES de leer el programa, así que javac ve el mismo programa
 * de siempre: el veredicto no cambia, y quien debe seguir de acuerdo es nuestro compilador.
 */
export interface EscapeUnicode {
  readonly caracter: string;
  readonly aparicion: number;
}

/** Tarea 1.36: cómo termina cada renglón. `lf-y-cr` es `\n\r` (javac lo cuenta como DOS terminadores) y `mezclado` alterna `\r\n`, `\n` y `\r`. */
export type FinDeLinea = 'cr' | 'crlf' | 'lf-y-cr' | 'mezclado';

export interface Programa {
  /** Renglones completos (`import java.util.Scanner;`). */
  readonly imports: readonly string[];
  /** Tarea 1.35: los miembros de la clase que van antes de `main` (campos, tipos anidados, métodos). */
  readonly miembros?: readonly MiembroDeClase[];
  /** Tarea 1.35: la lista de parámetros de `main` si no es la del lanzador (`String[] args`): `String... args`, `final String[] args`, `String[] args, int n`, ``… */
  readonly parametrosDeMain?: string;
  /** Tarea 1.35: un archivo SIN ninguna clase (solo los `import`s, o nada): javac lo compila, no hay nada que ejecutar. */
  readonly sinClase?: boolean;
  /** Tarea 1.35: un carácter del programa escrito como escape Unicode. */
  readonly escapeUnicode?: EscapeUnicode;
  /** Tarea 1.36 (C-2/W-2, JLS 3.4): con qué termina cada renglón del programa impreso; sin esto, `\n`. El retorno de carro solo y la pareja `\r\n` son fines de línea de Java. */
  readonly finDeLinea?: FinDeLinea;
  /** Tarea 1.36: el programa entero pretende un error de sintaxis (los tres puntos separados de `main`, un carácter invisible al principio de un nombre): no vive en un miembro ni en una expresión. */
  readonly sintaxisInvalida?: boolean;
  /**
   * Tarea 1.34 (familia C): el nombre de la clase. Por omisión `P`; el generador la llama a veces como una clase del JDK (`System`,
   * `Math`, `Scanner`…): JLS 6.4.1 y 7.5.1 dicen que la clase del alumno TAPA a la del JDK, y es una regla que el motor tuvo que modelar.
   */
  readonly clase?: string;
  /** Cuerpo de `main`. */
  readonly sentencias: readonly Sentencia[];
}

/** El nombre de la clase de un programa que no pidió otro. */
export const CLASE_POR_OMISION = 'P';

export function declaracion(datos: {
  readonly tipo: string;
  readonly nombre: string;
  readonly inicial: Expr | null;
  readonly esFinal?: boolean;
  readonly sintaxisInvalida?: boolean;
  readonly etiquetas?: readonly Etiqueta[];
}): Declaracion {
  return {
    k: 'declaracion',
    esFinal: datos.esFinal ?? false,
    tipo: datos.tipo,
    nombre: datos.nombre,
    inicial: datos.inicial,
    sintaxisInvalida: datos.sintaxisInvalida ?? false,
    etiquetas: datos.etiquetas ?? [],
  };
}

export function sentenciaExpr(expr: Expr): SentenciaDeExpr {
  return { k: 'expresion', expr };
}

export function si(condicion: Expr, entonces: readonly Sentencia[], sino: readonly Sentencia[] | null): Condicional {
  return { k: 'si', condicion, entonces, sino };
}

export function mientras(condicion: Expr, cuerpo: readonly Sentencia[]): CicloMientras {
  return { k: 'mientras', condicion, cuerpo };
}

export function haz(cuerpo: readonly Sentencia[], condicion: Expr): CicloHaz {
  return { k: 'haz', cuerpo, condicion };
}

export function para(datos: {
  readonly inicial: Declaracion | SentenciaDeExpr | null;
  readonly condicion: Expr | null;
  readonly paso: Expr | null;
  readonly cuerpo: readonly Sentencia[];
}): CicloPara {
  return { k: 'para', ...datos };
}

export function paraCada(datos: {
  readonly tipo: string;
  readonly nombre: string;
  readonly coleccion: Expr;
  readonly cuerpo: readonly Sentencia[];
  readonly esFinal?: boolean;
}): CicloParaCada {
  return { k: 'para-cada', esFinal: datos.esFinal ?? false, tipo: datos.tipo, nombre: datos.nombre, coleccion: datos.coleccion, cuerpo: datos.cuerpo };
}

export function seleccion(datos: {
  readonly selector: Expr;
  readonly antes?: readonly Sentencia[];
  readonly casos: readonly Caso[];
  readonly flecha: boolean;
}): Seleccion {
  return { k: 'seleccion', ...datos };
}

export function salto(palabra: 'break' | 'continue'): Salto {
  return { k: 'salto', palabra };
}

export function bloque(sentencias: readonly Sentencia[]): BloqueAnonimo {
  return { k: 'bloque', sentencias };
}

// ---- Impresión ----

const UNA_SANGRIA = '    ';

function encabezadoDeDeclaracion(d: Declaracion): string {
  const cabeza = `${d.esFinal ? 'final ' : ''}${d.tipo} ${d.nombre}`;
  return d.inicial === null ? cabeza : `${cabeza} = ${renderizarExpr(d.inicial)}`;
}

function renderizarCaso(caso: Caso, flecha: boolean, sangria: string): string[] {
  const etiqueta = caso.etiquetas === 'default' ? 'default' : `case ${caso.etiquetas.map(renderizarExpr).join(', ')}`;
  if (flecha) {
    return [`${sangria}${etiqueta} -> {`, ...renderizarSentencias(caso.cuerpo, sangria + UNA_SANGRIA), `${sangria}}`];
  }
  return [`${sangria}${etiqueta}:`, ...renderizarSentencias(caso.cuerpo, sangria + UNA_SANGRIA)];
}

function renderizarSentencia(sentencia: Sentencia, sangria: string): string[] {
  const dentro = sangria + UNA_SANGRIA;
  switch (sentencia.k) {
    case 'declaracion':
      return [`${sangria}${encabezadoDeDeclaracion(sentencia)};`];
    case 'expresion':
      return [`${sangria}${renderizarExpr(sentencia.expr)};`];
    case 'si': {
      const lineas = [`${sangria}if (${renderizarExpr(sentencia.condicion)}) {`, ...renderizarSentencias(sentencia.entonces, dentro)];
      if (sentencia.sino === null) return [...lineas, `${sangria}}`];
      return [...lineas, `${sangria}} else {`, ...renderizarSentencias(sentencia.sino, dentro), `${sangria}}`];
    }
    case 'mientras':
      return [`${sangria}while (${renderizarExpr(sentencia.condicion)}) {`, ...renderizarSentencias(sentencia.cuerpo, dentro), `${sangria}}`];
    case 'haz':
      return [`${sangria}do {`, ...renderizarSentencias(sentencia.cuerpo, dentro), `${sangria}} while (${renderizarExpr(sentencia.condicion)});`];
    case 'para': {
      const inicial =
        sentencia.inicial === null
          ? ''
          : sentencia.inicial.k === 'declaracion'
            ? encabezadoDeDeclaracion(sentencia.inicial)
            : renderizarExpr(sentencia.inicial.expr);
      const condicion = sentencia.condicion === null ? '' : ` ${renderizarExpr(sentencia.condicion)}`;
      const paso = sentencia.paso === null ? '' : ` ${renderizarExpr(sentencia.paso)}`;
      const cabecera = sentencia.inicial === null && sentencia.condicion === null && sentencia.paso === null ? ';;' : `${inicial};${condicion};${paso}`;
      return [`${sangria}for (${cabecera}) {`, ...renderizarSentencias(sentencia.cuerpo, dentro), `${sangria}}`];
    }
    case 'para-cada':
      return [
        `${sangria}for (${sentencia.esFinal ? 'final ' : ''}${sentencia.tipo} ${sentencia.nombre} : ${renderizarExpr(sentencia.coleccion)}) {`,
        ...renderizarSentencias(sentencia.cuerpo, dentro),
        `${sangria}}`,
      ];
    case 'seleccion':
      return [
        `${sangria}switch (${renderizarExpr(sentencia.selector)}) {`,
        ...renderizarSentencias(sentencia.antes ?? [], dentro),
        ...sentencia.casos.flatMap((caso) => renderizarCaso(caso, sentencia.flecha, dentro)),
        `${sangria}}`,
      ];
    case 'salto':
      return [`${sangria}${sentencia.palabra};`];
    case 'bloque':
      return [`${sangria}{`, ...renderizarSentencias(sentencia.sentencias, dentro), `${sangria}}`];
  }
}

function renderizarSentencias(sentencias: readonly Sentencia[], sangria: string): string[] {
  return sentencias.flatMap((sentencia) => renderizarSentencia(sentencia, sangria));
}

/** Solo las sentencias de `main`, un renglón cada una, con la sangría relativa de lo anidado. */
export function renderizarCuerpo(programa: Programa): string[] {
  return renderizarSentencias(programa.sentencias, '');
}

/** La firma de `main` que el lanzador conoce. */
const PARAMETROS_DE_MAIN_POR_OMISION = 'String[] args';

/** Tarea 1.35: los renglones de los miembros que van antes de `main` (`despues` falso) o después de él (`despues` verdadero), con la sangría de la clase. */
function lineasDeMiembros(programa: Programa, despues: boolean): string[] {
  return (programa.miembros ?? []).filter((miembro) => (miembro.despuesDeMain === true) === despues).flatMap((miembro) => miembro.lineas.map((linea) => `${UNA_SANGRIA}${linea}`));
}

/** Tarea 1.35: el escape Unicode de `caracter` (cuatro dígitos hexadecimales, JLS 3.3). */
function escapeDe(caracter: string): string {
  return `${String.fromCharCode(92)}u${(caracter.codePointAt(0) ?? 0).toString(16).padStart(4, '0')}`;
}

/** Tarea 1.35: reemplaza UNA aparición de `escape.caracter` por su escape Unicode; si el carácter no aparece, el texto queda igual. */
function aplicarEscapeUnicode(texto: string, escape: EscapeUnicode): string {
  const posiciones: number[] = [];
  for (let i = texto.indexOf(escape.caracter); i !== -1; i = texto.indexOf(escape.caracter, i + 1)) posiciones.push(i);
  if (posiciones.length === 0) return texto;
  const posicion = posiciones[escape.aparicion % posiciones.length]!;
  return `${texto.slice(0, posicion)}${escapeDe(escape.caracter)}${texto.slice(posicion + escape.caracter.length)}`;
}

/**
 * El programa completo: imports, la clase (`P`, o la que pida `programa.clase`), sus miembros, y `main` con el cuerpo (un renglón por sentencia). Tarea 1.35: un programa
 * `sinClase` imprime solo los imports; los miembros, la firma de `main` y el escape Unicode son opcionales y, sin ellos, el texto es el de siempre.
 */
export function renderizarPrograma(programa: Programa): string {
  const imports = programa.imports.length === 0 ? [] : [...programa.imports, ''];
  const texto =
    programa.sinClase === true
      ? programa.imports.map((linea) => `${linea}\n`).join('')
      : [
          ...imports,
          `public class ${programa.clase ?? CLASE_POR_OMISION} {`,
          ...lineasDeMiembros(programa, false),
          `${UNA_SANGRIA}public static void main(${programa.parametrosDeMain ?? PARAMETROS_DE_MAIN_POR_OMISION}) {`,
          ...renderizarSentencias(programa.sentencias, UNA_SANGRIA + UNA_SANGRIA),
          `${UNA_SANGRIA}}`,
          ...lineasDeMiembros(programa, true),
          '}',
          '',
        ].join('\n');
  const conEscape = programa.escapeUnicode === undefined ? texto : aplicarEscapeUnicode(texto, programa.escapeUnicode);
  return programa.finDeLinea === undefined ? conEscape : conFinDeLinea(conEscape, programa.finDeLinea);
}

/** Tarea 1.36: cambia cada `\n` del programa impreso por el fin de línea pedido (los textos del programa no traen renglones sueltos: una cadena escribe `\\n`, no un salto de línea). */
function conFinDeLinea(texto: string, fin: FinDeLinea): string {
  switch (fin) {
    case 'cr':
      return texto.replace(/\n/g, '\r');
    case 'crlf':
      return texto.replace(/\n/g, '\r\n');
    case 'lf-y-cr':
      return texto.replace(/\n/g, '\n\r');
    case 'mezclado': {
      const finales = ['\r\n', '\n', '\r'] as const;
      let renglon = 0;
      return texto.replace(/\n/g, () => finales[renglon++ % finales.length]!);
    }
  }
}

// ---- Recorridos y rasgos ----

/** Las expresiones que una sentencia lleva DIRECTAMENTE (no las de sus sentencias anidadas ni la
 * declaración de la cabecera de un `for`: ésas las visita `sentenciasDe` como sentencias propias). */
function* exprsDeSentencia(sentencia: Sentencia): Generator<Expr> {
  switch (sentencia.k) {
    case 'declaracion':
      if (sentencia.inicial !== null) yield sentencia.inicial;
      return;
    case 'expresion':
      yield sentencia.expr;
      return;
    case 'si':
    case 'mientras':
    case 'haz':
      yield sentencia.condicion;
      return;
    case 'para':
      if (sentencia.condicion !== null) yield sentencia.condicion;
      if (sentencia.paso !== null) yield sentencia.paso;
      return;
    case 'para-cada':
      yield sentencia.coleccion;
      return;
    case 'seleccion':
      yield sentencia.selector;
      for (const caso of sentencia.casos) if (caso.etiquetas !== 'default') yield* caso.etiquetas;
      return;
    case 'salto':
    case 'bloque':
      return;
  }
}

/** Las sentencias anidadas de una sentencia, en el orden en que se imprimen. */
function* hijasDeSentencia(sentencia: Sentencia): Generator<Sentencia> {
  switch (sentencia.k) {
    case 'si':
      yield* sentencia.entonces;
      if (sentencia.sino !== null) yield* sentencia.sino;
      return;
    case 'mientras':
    case 'haz':
      yield* sentencia.cuerpo;
      return;
    case 'para':
      if (sentencia.inicial !== null) yield sentencia.inicial;
      yield* sentencia.cuerpo;
      return;
    case 'para-cada':
      yield* sentencia.cuerpo;
      return;
    case 'seleccion':
      yield* sentencia.antes ?? [];
      for (const caso of sentencia.casos) yield* caso.cuerpo;
      return;
    case 'bloque':
      yield* sentencia.sentencias;
      return;
    case 'declaracion':
    case 'expresion':
    case 'salto':
      return;
  }
}

/** Todas las sentencias (las de nivel superior y las anidadas) en preorden. */
export function* sentenciasDe(sentencias: readonly Sentencia[]): Generator<Sentencia> {
  for (const sentencia of sentencias) {
    yield sentencia;
    yield* sentenciasDe([...hijasDeSentencia(sentencia)]);
  }
}

function* nodosDeExpr(expr: Expr): Generator<Expr> {
  yield expr;
  for (const hijo of expr.hijos) yield* nodosDeExpr(hijo);
}

/** Cada nodo de expresión del programa (con sus subexpresiones), sentencia por sentencia en preorden. */
export function* todasLasExprs(programa: Programa): Generator<Expr> {
  for (const sentencia of sentenciasDe(programa.sentencias)) {
    for (const expr of exprsDeSentencia(sentencia)) yield* nodosDeExpr(expr);
  }
}

// Los tipos que el compilador no tipa como los primitivos: declararlos es un rasgo de la construcción.
const TIPOS_ENVOLTORIO_Y_OBJECT: ReadonlySet<string> = new Set(['Integer', 'Double', 'Character', 'Long', 'Boolean', 'Object']);

const ETIQUETA_POR_CLASE_DE_SENTENCIA: Partial<Record<Sentencia['k'], Etiqueta>> = {
  si: 'if',
  mientras: 'while',
  haz: 'do-while',
  para: 'for',
  'para-cada': 'for-mejorado',
  seleccion: 'switch',
  bloque: 'bloque',
};

/**
 * Los rasgos de construcción que ejerce el programa, sin repetir y en orden alfabético: los que puso
 * el generador en sus nodos (`cast`, `incremento`…) más los que se deducen de la estructura
 * (`final`, `if`, `switch`, `break`…). Con ellos se agrupan las discrepancias en familias.
 */
export function etiquetasDe(programa: Programa): readonly Etiqueta[] {
  const etiquetas = new Set<Etiqueta>();
  if (programa.clase !== undefined && programa.clase !== CLASE_POR_OMISION) etiquetas.add('clase-con-nombre-del-jdk');
  // Tarea 1.35: los rasgos de la estructura de la clase.
  if (programa.sinClase === true) etiquetas.add('archivo-sin-clase');
  if (programa.parametrosDeMain !== undefined) etiquetas.add('main-con-otra-firma');
  if (programa.escapeUnicode !== undefined) etiquetas.add('escape-unicode');
  if (programa.finDeLinea !== undefined) etiquetas.add('fin-de-linea-especial');
  // Tarea 1.36 (C-1): los tres puntos de `String...` mal escritos (separados, o dos pegados y uno suelto); `String ... args` con espacios alrededor es válido y no cuenta.
  if (programa.parametrosDeMain !== undefined && /\.\s+\.|(?<!\.)\.\.(?!\.)/.test(programa.parametrosDeMain)) etiquetas.add('varargs-mal-escrito');
  if (programa.imports.some((linea) => /^package\s/.test(linea))) etiquetas.add('paquete-declarado');
  if (programa.imports.some((linea) => /\.\*;/.test(linea))) etiquetas.add('import-con-comodin');
  if (programa.imports.some((linea) => /;;/.test(linea))) etiquetas.add('import-con-punto-y-coma-de-mas');
  for (const miembro of programa.miembros ?? []) for (const etiqueta of miembro.etiquetas) etiquetas.add(etiqueta);
  for (const sentencia of sentenciasDe(programa.sentencias)) {
    const estructural = ETIQUETA_POR_CLASE_DE_SENTENCIA[sentencia.k];
    if (estructural !== undefined) etiquetas.add(estructural);
    if (sentencia.k === 'salto') etiquetas.add(sentencia.palabra);
    if (sentencia.k === 'seleccion' && sentencia.flecha) etiquetas.add('switch-flecha');
    if (sentencia.k === 'seleccion' && (sentencia.antes ?? []).length > 0) etiquetas.add('sentencia-antes-del-primer-case');
    if (sentencia.k === 'declaracion') {
      if (sentencia.esFinal) etiquetas.add('final');
      if (sentencia.tipo === 'var') etiquetas.add('var');
      if (TIPOS_ENVOLTORIO_Y_OBJECT.has(sentencia.tipo)) etiquetas.add('tipo-envoltorio');
      for (const etiqueta of sentencia.etiquetas) etiquetas.add(etiqueta);
    }
  }
  for (const expr of todasLasExprs(programa)) for (const etiqueta of expr.etiquetas ?? []) etiquetas.add(etiqueta);
  return [...etiquetas].sort();
}

/** ¿Alguna parte del programa está marcada como error de sintaxis A PROPÓSITO? */
export function pretendeErrorDeSintaxis(programa: Programa): boolean {
  if (programa.sintaxisInvalida === true) return true;
  if ((programa.miembros ?? []).some((miembro) => miembro.sintaxisInvalida === true)) return true;
  for (const sentencia of sentenciasDe(programa.sentencias)) {
    if (sentencia.k === 'declaracion' && sentencia.sintaxisInvalida) return true;
    // Tarea 1.34: una sentencia antes del primer `case` es un error del ANÁLISIS SINTÁCTICO de javac, no de tipos.
    if (sentencia.k === 'seleccion' && (sentencia.antes ?? []).length > 0) return true;
  }
  for (const expr of todasLasExprs(programa)) if (expr.sintaxisInvalida === true) return true;
  return false;
}
