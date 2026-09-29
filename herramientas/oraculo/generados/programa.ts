// Representación de un programa generado (tarea 1.31): un árbol de sentencias y expresiones que se
// imprime como Java. Existe como ÁRBOL, no como texto, para que el reductor (delta debugging) pueda
// quitar sentencias y sustituir subexpresiones sin volver a parsear nada, y para que cada nodo lleve
// el rasgo de construcción que ejerce (las `Etiqueta`s con que se agrupan las familias de fallas).
//
// Formato de impresión estable: una sentencia por renglón (la línea de javac señala a la sentencia
// culpable) y llaves siempre presentes. La clase se llama siempre `P` (el `CompiladorEnLote.java` deduce
// el nombre del archivo de `class P`).

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
  // Rasgos de las declaraciones que pone el generador.
  | 'var'
  | 'tipo-envoltorio'
  // Rasgos que se deducen de la estructura del árbol (`etiquetasDe`).
  | 'final'
  | 'if'
  | 'while'
  | 'do-while'
  | 'for'
  | 'switch'
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

/** Un grupo de etiquetas (`case 1, 2:`) o el `default`, con las sentencias que le siguen. */
export interface Caso {
  readonly etiquetas: readonly Expr[] | 'default';
  readonly cuerpo: readonly Sentencia[];
}

export interface Seleccion {
  readonly k: 'seleccion';
  readonly selector: Expr;
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
  | Seleccion
  | Salto
  | BloqueAnonimo;

export interface Programa {
  /** Renglones completos (`import java.util.Scanner;`). */
  readonly imports: readonly string[];
  /** Cuerpo de `main`. */
  readonly sentencias: readonly Sentencia[];
}

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

export function seleccion(datos: { readonly selector: Expr; readonly casos: readonly Caso[]; readonly flecha: boolean }): Seleccion {
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
    case 'seleccion':
      return [
        `${sangria}switch (${renderizarExpr(sentencia.selector)}) {`,
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

/** El programa completo: imports, la clase `P` y el cuerpo de `main` (un renglón por sentencia). */
export function renderizarPrograma(programa: Programa): string {
  const imports = programa.imports.length === 0 ? [] : [...programa.imports, ''];
  const cuerpo = renderizarSentencias(programa.sentencias, UNA_SANGRIA + UNA_SANGRIA);
  return [...imports, 'public class P {', `${UNA_SANGRIA}public static void main(String[] args) {`, ...cuerpo, `${UNA_SANGRIA}}`, '}', ''].join('\n');
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
    case 'seleccion':
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
  for (const sentencia of sentenciasDe(programa.sentencias)) {
    const estructural = ETIQUETA_POR_CLASE_DE_SENTENCIA[sentencia.k];
    if (estructural !== undefined) etiquetas.add(estructural);
    if (sentencia.k === 'salto') etiquetas.add(sentencia.palabra);
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
  for (const sentencia of sentenciasDe(programa.sentencias)) {
    if (sentencia.k === 'declaracion' && sentencia.sintaxisInvalida) return true;
  }
  for (const expr of todasLasExprs(programa)) if (expr.sintaxisInvalida === true) return true;
  return false;
}
