// Expresiones guiadas por tipos (tarea 1.31): `expresion(entorno, tipo, profundidad)` arma una
// expresión que PRETENDE tener ese tipo estático usando las variables en alcance, literales,
// operadores, llamadas del catálogo de biblioteca y casts. Es «guiado» en el sentido de que sabe qué
// tipo pide cada lugar; NO es un verificador de tipos: javac es quien decide si el resultado compila.
// Cuando `debeViolar` cae, `expresionMalTipada` entrega a propósito un tipo distinto del pedido.
import { debeViolar, type Entorno, type Variable } from './entorno.ts';
import type { MetodoApi } from './catalogo-api.ts';
import { literal, nombre, plantilla, renderizarExpr, type Etiqueta, type Expr, type OpcionesDeExpr } from './programa.ts';
import {
  LITERALES,
  METODOS_DEL_CURRICULO,
  OPERADORES_ARITMETICOS,
  OPERADORES_DE_BITS,
  OPERADORES_DE_DESPLAZAMIENTO,
  OPERADORES_DE_IGUALDAD,
  OPERADORES_LOGICOS,
  OPERADORES_RELACIONALES,
  TIPOS_DE_VALOR,
  TIPOS_PARA_CAST,
} from './vocabulario.ts';

const NOMBRE_INEXISTENTE = 'sinDeclarar';

/** Envuelve en paréntesis lo que no sea ya un operando indivisible (un literal negativo también: `(Integer) -1` se lee como resta). */
export function agrupar(expr: Expr): Expr {
  const esHoja = expr.hijos.length === 0;
  const necesita = esHoja ? renderizarExpr(expr).startsWith('-') : expr.primaria !== true;
  return necesita ? plantilla(['(', ')'], [expr], expr.tipo, { primaria: true }) : expr;
}

/** Un receptor de `.miembro`: un literal numérico va entre paréntesis (`5.length()` se lee como el literal `5.`). */
function comoReceptor(expr: Expr): Expr {
  if (expr.hijos.length === 0 && /^[\d.-]/.test(renderizarExpr(expr))) return plantilla(['(', ')'], [expr], expr.tipo, { primaria: true });
  return agrupar(expr);
}

export function referenciaAVariable(variable: Variable): Expr {
  return nombre(variable.nombre, variable.tipo, { etiquetas: variable.etiquetas, primaria: true });
}

/** Un literal (o la construcción más corta) de `tipo`: `new Scanner(System.in)` para un Scanner. */
export function literalDe(entorno: Entorno, tipo: string): Expr {
  const { azar } = entorno;
  switch (tipo) {
    case 'Scanner':
      return plantilla(['new Scanner(System.in)'], [], 'Scanner', { primaria: true });
    case 'Random':
      return plantilla([azar.elegir(['new Random()', 'new Random(5L)', 'new Random(3)'])], [], 'Random', { primaria: true });
    case 'Integer':
      return literal(azar.elegir(LITERALES['int']!), 'Integer');
    case 'Double':
      return literal(azar.elegir(LITERALES['double']!), 'Double');
    case 'Character':
      return literal(azar.elegir(LITERALES['char']!), 'Character');
    case 'Long':
      return literal(azar.elegir(LITERALES['long']!), 'Long');
    case 'Boolean':
      return literal(azar.elegir(LITERALES['boolean']!), 'Boolean');
    case 'Object':
      return literalDe(entorno, azar.elegir(TIPOS_DE_VALOR));
    default: {
      const pool = LITERALES[tipo];
      return literal(pool === undefined ? '0' : azar.elegir(pool), tipo);
    }
  }
}

/** Un valor de un tipo distinto de `esperado`: el error de tipos más común de un alumno. */
export function expresionMalTipada(entorno: Entorno, esperado: string, profundidad: number): Expr {
  const otros = [...TIPOS_DE_VALOR, 'Scanner', 'Random'].filter((t) => t !== esperado);
  return expresion(entorno, entorno.azar.elegir(otros), profundidad);
}

/** Bien tipada, salvo que `debeViolar` decida lo contrario. */
export function expresionQuizaMalTipada(entorno: Entorno, esperado: string, profundidad: number): Expr {
  return debeViolar(entorno) ? expresionMalTipada(entorno, esperado, profundidad) : expresion(entorno, esperado, profundidad);
}

export function expresionDeCualquierTipo(entorno: Entorno, profundidad: number): Expr {
  const tipo = entorno.azar.ponderado<string>([
    [30, 'int'], [14, 'String'], [12, 'double'], [12, 'boolean'], [10, 'char'], [8, 'long'],
  ]);
  return expresion(entorno, tipo, profundidad);
}

export function operadorBinario(operador: string, izquierda: Expr, derecha: Expr, tipo: string): Expr {
  return plantilla(['', ` ${operador} `, ''], [agrupar(izquierda), agrupar(derecha)], tipo, { etiquetas: ['operador'] });
}

export function operadorUnario(operador: string, operando: Expr, tipo: string): Expr {
  return plantilla([operador, ''], [agrupar(operando)], tipo, { etiquetas: ['operador'] });
}

/** `(destino) operando`: la validez depende del PAR de tipos (JLS 5.5). */
export function castHacia(destino: string, operando: Expr): Expr {
  return plantilla([`(${destino}) `, ''], [agrupar(operando)], destino, { etiquetas: ['cast'] });
}

// ---- Llamadas al catálogo de biblioteca ----

export type ModoDeReceptor = 'correcto' | 'clase' | 'objeto';
export type ModoDeArgumentos = 'buenos' | 'mal-tipados' | 'aridad';

/** `receptor.texto(args)` o, sin receptor, `texto(args)`. */
export function llamada(receptor: Expr | null, texto: string, args: readonly Expr[], tipo: string, opciones: OpcionesDeExpr = {}): Expr {
  const cabeza = `${texto}(`;
  const conPrimaria = { primaria: true, ...opciones };
  if (args.length === 0) {
    return receptor === null
      ? plantilla([`${cabeza})`], [], tipo, conPrimaria)
      : plantilla(['', `.${cabeza})`], [comoReceptor(receptor)], tipo, conPrimaria);
  }
  const separadores = args.slice(1).map(() => ', ');
  return receptor === null
    ? plantilla([cabeza, ...separadores, ')'], args, tipo, conPrimaria)
    : plantilla(['', `.${cabeza}`, ...separadores, ')'], [comoReceptor(receptor), ...args], tipo, conPrimaria);
}

function argumentoDeParametro(entorno: Entorno, parametro: string, profundidad: number): Expr {
  if (parametro === 'Object') return expresionDeCualquierTipo(entorno, profundidad);
  if (parametro === 'CharSequence') return expresion(entorno, 'String', profundidad);
  return expresion(entorno, parametro, profundidad);
}

function argumentosDe(entorno: Entorno, metodo: MetodoApi, profundidad: number, modo: ModoDeArgumentos): Expr[] {
  const args = metodo.parametros.map((p) => argumentoDeParametro(entorno, p, profundidad));
  if (modo === 'mal-tipados' && args.length > 0) {
    const i = entorno.azar.entero(args.length);
    args[i] = expresionMalTipada(entorno, metodo.parametros[i]!, profundidad);
  }
  if (modo === 'aridad') {
    if (args.length > 0 && entorno.azar.probabilidad(0.5)) args.pop();
    else args.push(literalDe(entorno, 'int'));
  }
  return args;
}

const CLASES_ENVOLTORIO = ['Integer', 'Double', 'Character', 'Long'] as const;

/** Un valor de tipo `clase` sobre el que llamar un método de instancia; `null` si esa clase no tiene objetos (Math, System). */
export function receptorDeClase(entorno: Entorno, clase: string, profundidad: number): Expr | null {
  const { azar } = entorno;
  if (clase === 'String') return expresion(entorno, 'String', profundidad);
  if (clase === 'Scanner' || clase === 'Random') {
    const variables = entorno.variables.filter((v) => v.tipo === clase);
    return variables.length > 0 && azar.probabilidad(0.8) ? referenciaAVariable(azar.elegir(variables)) : literalDe(entorno, clase);
  }
  if ((CLASES_ENVOLTORIO as readonly string[]).includes(clase)) {
    const variables = entorno.variables.filter((v) => v.tipo === clase);
    if (variables.length > 0 && azar.probabilidad(0.8)) return referenciaAVariable(azar.elegir(variables));
    const primitivo = clase === 'Integer' ? 'int' : clase === 'Double' ? 'double' : clase === 'Character' ? 'char' : 'long';
    return llamada(null, `${clase}.valueOf`, [literalDe(entorno, primitivo)], clase);
  }
  return null;
}

/** La llamada a `metodo` del catálogo con el receptor y los argumentos pedidos. */
export function llamadaDeApi(entorno: Entorno, metodo: MetodoApi, profundidad: number, receptor: ModoDeReceptor, argumentos: ModoDeArgumentos): Expr {
  const args = argumentosDe(entorno, metodo, profundidad, argumentos);
  const etiquetas: Etiqueta[] = ['llamada-de-biblioteca'];
  const objeto = receptor === 'correcto' && !metodo.esEstatico ? receptorDeClase(entorno, metodo.clase, profundidad) : receptor === 'objeto' ? receptorDeClase(entorno, metodo.clase, profundidad) : null;
  if (objeto !== null) {
    if (metodo.esEstatico) etiquetas.push('metodo-estatico-por-objeto');
    return llamada(objeto, metodo.nombre, args, metodo.retorno, { etiquetas });
  }
  // Sin objeto posible (o pedido por la clase): `Clase.metodo(...)`. Un método de instancia así es error.
  if (!metodo.esEstatico) etiquetas.push('metodo-de-instancia-por-clase');
  return llamada(null, `${metodo.clase}.${metodo.nombre}`, args, metodo.retorno, { etiquetas });
}

function elegirModoDeReceptor(entorno: Entorno, metodo: MetodoApi): ModoDeReceptor {
  const { azar } = entorno;
  // Un método estático llamado por un objeto (`s.valueOf(1)`) es válido; uno de instancia por el nombre de la clase, no.
  if (metodo.esEstatico) return azar.probabilidad(0.06) ? 'objeto' : 'correcto';
  return debeViolar(entorno) ? 'clase' : 'correcto';
}

function elegirModoDeArgumentos(entorno: Entorno): ModoDeArgumentos {
  if (!debeViolar(entorno)) return 'buenos';
  return entorno.azar.probabilidad(0.65) ? 'mal-tipados' : 'aridad';
}

// Con esta probabilidad una llamada elige entre los métodos del currículo (ver `METODOS_DEL_CURRICULO`).
const PROBABILIDAD_DE_ELEGIR_DEL_CURRICULO = 0.8;

function elegirMetodo(entorno: Entorno, candidatos: readonly MetodoApi[]): MetodoApi {
  const delCurriculo = candidatos.filter((m) => METODOS_DEL_CURRICULO[m.clase]?.includes(m.nombre) === true);
  const elegibles = delCurriculo.length > 0 && entorno.azar.probabilidad(PROBABILIDAD_DE_ELEGIR_DEL_CURRICULO) ? delCurriculo : candidatos;
  return entorno.azar.elegir(elegibles);
}

/** Una llamada de biblioteca elegida al azar entre las que devuelven `tipo`; `null` si no hay ninguna. */
export function llamadaQueDevuelve(entorno: Entorno, tipo: string, profundidad: number): Expr | null {
  const candidatos = entorno.api.metodosPorRetorno(tipo);
  if (candidatos.length === 0) return null;
  const metodo = elegirMetodo(entorno, candidatos);
  return llamadaDeApi(entorno, metodo, profundidad, elegirModoDeReceptor(entorno, metodo), elegirModoDeArgumentos(entorno));
}

// Cuánto pesa cada clase al elegir a cuál llamarle un método (las del currículo, más que las demás).
const PESO_DE_LA_CLASE: readonly (readonly [number, string])[] = [
  [28, 'String'], [18, 'Math'], [12, 'Scanner'], [10, 'Character'], [10, 'Integer'], [8, 'Double'], [8, 'Random'], [3, 'Long'], [3, 'System'],
];

/** Una llamada de biblioteca cualquiera (de cualquier clase del catálogo), con receptor y argumentos elegidos al azar. */
export function llamadaDeBibliotecaAlAzar(entorno: Entorno, profundidad: number): Expr {
  const clase = entorno.azar.ponderado(PESO_DE_LA_CLASE.filter(([, c]) => entorno.api.clases.includes(c)));
  const metodo = elegirMetodo(entorno, entorno.api.metodos(clase));
  return llamadaDeApi(entorno, metodo, profundidad, elegirModoDeReceptor(entorno, metodo), elegirModoDeArgumentos(entorno));
}

/** Un campo estático del catálogo (`Math.PI`, `Integer.MAX_VALUE`), a veces leído a través de un objeto. */
export function campoDeBiblioteca(entorno: Entorno, tipo: string | null, profundidad: number): Expr | null {
  const { azar } = entorno;
  const campos = entorno.api.clases.flatMap((clase) => entorno.api.campos(clase)).filter((c) => tipo === null || c.tipo === tipo);
  if (campos.length === 0) return null;
  const campo = azar.elegir(campos);
  const objeto = azar.probabilidad(0.2) ? receptorDeClase(entorno, campo.clase, profundidad) : null;
  const etiquetas: Etiqueta[] = ['campo-de-biblioteca'];
  return objeto === null
    ? plantilla([`${campo.clase}.${campo.nombre}`], [], campo.tipo, { etiquetas, primaria: true })
    : plantilla(['', `.${campo.nombre}`], [objeto], campo.tipo, { etiquetas, primaria: true });
}

// ---- Llamadas void (para ponerlas donde se espera un valor) ----

/** `System.out.println(...)`, `print(...)` o una llamada void del catálogo (`Scanner.close()`, `Random.setSeed(5L)`). */
export function llamadaVoid(entorno: Entorno, profundidad: number): Expr {
  const { azar } = entorno;
  const forma = azar.ponderado<'println' | 'print' | 'println-vacio' | 'api'>([[38, 'println'], [14, 'print'], [10, 'println-vacio'], [38, 'api']]);
  if (forma === 'println') return llamada(null, 'System.out.println', [expresionDeCualquierTipo(entorno, profundidad)], 'void', { etiquetas: ['impresion'] });
  if (forma === 'print') return llamada(null, 'System.out.print', [expresionDeCualquierTipo(entorno, profundidad)], 'void', { etiquetas: ['impresion'] });
  if (forma === 'println-vacio') return llamada(null, 'System.out.println', [], 'void', { etiquetas: ['impresion'] });
  const metodo = azar.elegir(entorno.api.metodosVoid());
  return llamadaDeApi(entorno, metodo, profundidad, 'correcto', 'buenos');
}

/** Una llamada void usada COMO VALOR: el error `'void' type not allowed here` / `void cannot be converted`. */
export function voidComoValor(entorno: Entorno, profundidad: number): Expr {
  const base = llamadaVoid(entorno, profundidad);
  return { ...base, etiquetas: [...(base.etiquetas ?? []), 'void-como-valor'] };
}

// ---- Miembros de un primitivo ----

export function miembroDeReceptor(receptor: Expr, texto: string, esLlamada: boolean, tipo: string): Expr {
  const esPrimitivo = ['int', 'long', 'double', 'boolean', 'char'].includes(receptor.tipo);
  const etiquetas: Etiqueta[] = esPrimitivo ? ['miembro-de-primitivo'] : esLlamada ? ['llamada-de-biblioteca'] : ['campo-de-biblioteca'];
  return plantilla(['', `.${texto}`], [comoReceptor(receptor)], tipo, { etiquetas, primaria: esLlamada });
}

// ---- La expresión de un tipo ----

type Forma = readonly [peso: number, generar: () => Expr | null];

function aritmetica(entorno: Entorno, tipo: 'int' | 'long' | 'double', profundidad: number): Expr {
  const { azar } = entorno;
  const operador = azar.elegir(OPERADORES_ARITMETICOS);
  const operandos: Record<'int' | 'long' | 'double', readonly (readonly [string, string])[]> = {
    int: [['int', 'int'], ['int', 'char'], ['char', 'int'], ['char', 'char']],
    long: [['long', 'long'], ['long', 'int'], ['int', 'long'], ['long', 'char']],
    double: [['double', 'double'], ['double', 'int'], ['int', 'double'], ['double', 'long'], ['char', 'double']],
  };
  const [tipoIzquierdo, tipoDerecho] = azar.elegir(operandos[tipo]);
  return operadorBinario(operador, expresion(entorno, tipoIzquierdo, profundidad - 1), expresion(entorno, tipoDerecho, profundidad - 1), tipo);
}

function concatenacion(entorno: Entorno, profundidad: number): Expr {
  const { azar } = entorno;
  const otro = azar.elegir(TIPOS_DE_VALOR);
  const lados = azar.probabilidad(0.5) ? (['String', otro] as const) : ([otro, 'String'] as const);
  return operadorBinario('+', expresion(entorno, lados[0], profundidad - 1), expresion(entorno, lados[1], profundidad - 1), 'String');
}

function booleanaCompuesta(entorno: Entorno, profundidad: number): Expr {
  const { azar } = entorno;
  const familia = azar.ponderado<'relacional' | 'igualdad' | 'logico' | 'negacion' | 'bits'>([[38, 'relacional'], [22, 'igualdad'], [24, 'logico'], [10, 'negacion'], [6, 'bits']]);
  const numerico = () => azar.elegir(['int', 'int', 'double', 'long', 'char']);
  if (familia === 'relacional') {
    return operadorBinario(azar.elegir(OPERADORES_RELACIONALES), expresion(entorno, numerico(), profundidad - 1), expresion(entorno, numerico(), profundidad - 1), 'boolean');
  }
  if (familia === 'igualdad') {
    const tipo = azar.elegir(['int', 'int', 'char', 'boolean', 'String', 'double', 'long']);
    return operadorBinario(azar.elegir(OPERADORES_DE_IGUALDAD), expresion(entorno, tipo, profundidad - 1), expresion(entorno, tipo, profundidad - 1), 'boolean');
  }
  if (familia === 'logico') {
    return operadorBinario(azar.elegir(OPERADORES_LOGICOS), expresion(entorno, 'boolean', profundidad - 1), expresion(entorno, 'boolean', profundidad - 1), 'boolean');
  }
  if (familia === 'bits') {
    return operadorBinario(azar.elegir(OPERADORES_DE_BITS), expresion(entorno, 'boolean', profundidad - 1), expresion(entorno, 'boolean', profundidad - 1), 'boolean');
  }
  return operadorUnario('!', expresion(entorno, 'boolean', profundidad - 1), 'boolean');
}

function enteraConBits(entorno: Entorno, profundidad: number): Expr {
  const { azar } = entorno;
  if (azar.probabilidad(0.25)) return operadorUnario('~', expresion(entorno, 'int', profundidad - 1), 'int');
  const operador = azar.elegir([...OPERADORES_DE_BITS, ...OPERADORES_DE_DESPLAZAMIENTO]);
  return operadorBinario(operador, expresion(entorno, 'int', profundidad - 1), expresion(entorno, 'int', profundidad - 1), 'int');
}

// Cada tipo primitivo y su envoltorio: donde va uno, Java acepta el otro (empaquetado y desempaquetado, JLS 5.1.7-5.1.8).
const ENVOLTORIO_DE: Readonly<Record<string, string>> = { int: 'Integer', double: 'Double', char: 'Character', long: 'Long', boolean: 'Boolean' };
const PRIMITIVO_DE: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(ENVOLTORIO_DE).map(([primitivo, envoltorio]) => [envoltorio, primitivo]));

/**
 * Una variable de ese tipo; a veces, la de su envoltorio o su primitivo (`int y = k;` con `Integer k`, o
 * `Integer k = n;` con `int n`). Rara vez, un nombre que nunca se declaró.
 */
function variableOFantasma(entorno: Entorno, tipo: string, permitirEnvoltorio: boolean): Expr | null {
  const exactas = entorno.variables.filter((v) => v.tipo === tipo);
  const equivalente = ENVOLTORIO_DE[tipo] ?? PRIMITIVO_DE[tipo];
  const equivalentes = permitirEnvoltorio && equivalente !== undefined ? entorno.variables.filter((v) => v.tipo === equivalente) : [];
  const elegibles = equivalentes.length > 0 && entorno.azar.probabilidad(0.35) ? equivalentes : exactas;
  if (elegibles.length === 0) return null;
  // A veces un alumno usa un nombre que nunca declaró: un error de símbolo con el que ambos compiladores coinciden.
  if (debeViolar(entorno)) return nombre(NOMBRE_INEXISTENTE, tipo, { primaria: true });
  return referenciaAVariable(entorno.azar.elegir(elegibles));
}

function castDeCualquierTipo(entorno: Entorno, destino: string, profundidad: number): Expr {
  const origen = entorno.azar.elegir(TIPOS_DE_VALOR);
  return castHacia(destino, expresion(entorno, origen, profundidad - 1));
}

/** Formas que producen `tipo`: las que valen para todos y las propias de cada tipo. */
function formasDe(entorno: Entorno, tipo: string, profundidad: number): readonly Forma[] {
  const hoja = profundidad <= 0;
  const conProfundidad = (peso: number): number => (hoja ? 0 : peso);
  const comunes: Forma[] = [
    [28, () => literalDe(entorno, tipo)],
    [30, () => variableOFantasma(entorno, tipo, !hoja)],
    [conProfundidad(12), () => llamadaQueDevuelve(entorno, tipo, profundidad - 1)],
    [3, () => campoDeBiblioteca(entorno, tipo, profundidad - 1)],
  ];
  switch (tipo) {
    case 'int':
      return [...comunes, [conProfundidad(14), () => aritmetica(entorno, 'int', profundidad)], [conProfundidad(4), () => castDeCualquierTipo(entorno, 'int', profundidad)], [conProfundidad(3), () => enteraConBits(entorno, profundidad)], [conProfundidad(3), () => operadorUnario('-', expresion(entorno, 'int', profundidad - 1), 'int')]];
    case 'long':
      return [...comunes, [conProfundidad(14), () => aritmetica(entorno, 'long', profundidad)], [conProfundidad(4), () => castDeCualquierTipo(entorno, 'long', profundidad)]];
    case 'double':
      return [...comunes, [conProfundidad(14), () => aritmetica(entorno, 'double', profundidad)], [conProfundidad(4), () => castDeCualquierTipo(entorno, 'double', profundidad)]];
    case 'char':
      return [...comunes, [conProfundidad(4), () => castDeCualquierTipo(entorno, 'char', profundidad)]];
    case 'boolean':
      return [...comunes, [conProfundidad(22), () => booleanaCompuesta(entorno, profundidad)]];
    case 'String':
      return [...comunes, [conProfundidad(16), () => concatenacion(entorno, profundidad)]];
    default:
      return [[70, () => literalDe(entorno, tipo)], [30, () => variableOFantasma(entorno, tipo, true)]];
  }
}

/** Una expresión que pretende tener `tipo`, de profundidad a lo más `profundidad` (0 = un literal o una variable). */
export function expresion(entorno: Entorno, tipo: string, profundidad: number): Expr {
  const formas = formasDe(entorno, tipo, profundidad);
  const forma = entorno.azar.ponderado(formas.map(([peso, generar]) => [peso, generar] as const));
  return forma() ?? literalDe(entorno, tipo);
}

/** Una condición de `if`/`while`/`for`/`do`: casi siempre booleana; a veces de otro tipo (error de alumno: `if (x)`, `while (n = 0)`). */
export function condicion(entorno: Entorno, profundidad: number): Expr {
  if (!debeViolar(entorno)) return expresion(entorno, 'boolean', profundidad);
  const { azar } = entorno;
  const forma = azar.ponderado<'entero' | 'cadena' | 'asignacion' | 'otro'>([[40, 'entero'], [15, 'cadena'], [25, 'asignacion'], [20, 'otro']]);
  if (forma === 'entero') return expresion(entorno, 'int', profundidad);
  if (forma === 'cadena') return expresion(entorno, 'String', profundidad);
  if (forma === 'asignacion') return asignacionComoValor(entorno, profundidad);
  return expresionMalTipada(entorno, 'boolean', profundidad);
}

/** `x = valor` usado como expresión (`if (x = 5)`): el tipo es el de la variable. */
export function asignacionComoValor(entorno: Entorno, profundidad: number): Expr {
  const objetivo = entorno.variables.length === 0 ? null : entorno.azar.elegir(entorno.variables);
  if (objetivo === null) return expresion(entorno, 'int', profundidad);
  const valor = expresionQuizaMalTipada(entorno, objetivo.tipo, profundidad - 1);
  return plantilla(['', ' = ', ''], [referenciaAVariable(objetivo), valor], objetivo.tipo, { etiquetas: ['asignacion'] });
}

// Los tipos «de afuera» que un cast o una declaración puede pedir.
export function tipoParaCast(entorno: Entorno): string {
  return entorno.azar.elegir(TIPOS_PARA_CAST);
}
