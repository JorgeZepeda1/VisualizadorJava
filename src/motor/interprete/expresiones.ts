// Intérprete de expresiones (tarea 2.17, REQ-EJEC-005, design.md §3.1/§3.2, ADR 005 punto 3): una función recursiva directa sobre la IR —sin
// generadores— que evalúa cada expresión con las reglas de Java y ANOTA el valor de cada punto del plan en `contexto.paso.registro`. Es la ÚNICA
// implementación de la semántica: el paso Detallado no tiene otra ruta, solo lee ese registro. El orden de evaluación es el de Java (izquierdo, derecho,
// operador; `x op= e` lee `x` primero; objetivo y luego argumentos); `&&` y `||` no evalúan la derecha si no hace falta y su punto queda en `null`.
//
// La aritmética de `int`, `long` y `char` y las conversiones son las funciones de `biblioteca/numeros`; todo lo demás (Scanner, Math, String, printf…)
// entra por el puerto de la biblioteca con la clave de firma que `generarIr` resolvió. `print`/`println` los resuelve el propio intérprete.
import { CadenaJava, NoDisponibleEnEjecucion } from '../biblioteca/index.ts';
import { caracterATexto, sumarChar } from '../biblioteca/numeros/caracter.ts';
import { convertirNumero } from '../biblioteca/numeros/conversiones.ts';
import { dividirInt, modInt, multiplicarInt, negarInt, restarInt, sumarInt } from '../biblioteca/numeros/enteros.ts';
import { dividirLong, modLong, multiplicarLong, negarLong, restarLong, sumarLong } from '../biblioteca/numeros/largos.ts';
import type { AritmeticaIr, AsignacionCompuestaIr, ComparacionIr, ExpresionIr, IncrementoIr, LlamadaIr, NuevoIr, RaizIr, TipoIr } from '../ir/ir.ts';
import { aTrazaValor, type ValorEjecucion, type ValorEncajado } from './puerto-biblioteca.ts';
import type { ContextoDeEjecucion } from './contexto.ts';
import { comprobarLargoDeCadena } from './limites.ts';

/** Evalúa la raíz de un paso. `undefined` solo si es una llamada `void` (una sentencia de expresión). */
export function evaluarRaiz(raiz: RaizIr, contexto: ContextoDeEjecucion): ValorEjecucion | undefined {
  return evaluarNodo(raiz.expresion, contexto);
}

/** Evalúa una expresión que SIEMPRE tiene valor (todo menos una llamada `void`, que el compilador no deja usar como operando). */
export function evaluar(expresion: ExpresionIr, contexto: ContextoDeEjecucion): ValorEjecucion {
  const valor = evaluarNodo(expresion, contexto);
  if (valor === undefined) throw new Error(`la expresión "${expresion.forma}" no tiene valor`);
  return valor;
}

function anotar(expresion: ExpresionIr, valor: ValorEjecucion | undefined, contexto: ContextoDeEjecucion): ValorEjecucion | undefined {
  if (valor !== undefined && expresion.punto >= 0) contexto.paso.registro[expresion.punto] = valor;
  return valor;
}

function evaluarNodo(expresion: ExpresionIr, contexto: ContextoDeEjecucion): ValorEjecucion | undefined {
  switch (expresion.forma) {
    case 'constante':
      return anotar(expresion, typeof expresion.valor === 'string' ? contexto.pool.internar(expresion.valor) : expresion.valor, contexto);
    case 'lectura': {
      const valor = contexto.ranuras[expresion.ranura];
      if (valor === undefined) throw new Error(`la variable "${expresion.nombre}" se leyó sin valor`);
      return anotar(expresion, valor, contexto);
    }
    case 'conversion': {
      const operando = evaluar(expresion.operando, contexto) as number | bigint;
      return anotar(expresion, convertirNumero(operando, expresion.de, expresion.tipo), contexto);
    }
    case 'aritmetica':
      return anotar(expresion, aritmetica(expresion, contexto), contexto);
    case 'menos': {
      const operando = evaluar(expresion.operando, contexto);
      if (expresion.tipo === 'int') return anotar(expresion, negarInt(operando as number), contexto);
      if (expresion.tipo === 'long') return anotar(expresion, negarLong(operando as bigint), contexto);
      return anotar(expresion, -(operando as number), contexto);
    }
    case 'comparacion':
      return anotar(expresion, comparacion(expresion, contexto), contexto);
    case 'logica': {
      const izquierda = evaluar(expresion.izquierda, contexto) as boolean;
      // Corto circuito: la derecha solo se evalúa si el resultado todavía no está decidido.
      if (expresion.operador === '&&' && !izquierda) return anotar(expresion, false, contexto);
      if (expresion.operador === '||' && izquierda) return anotar(expresion, true, contexto);
      return anotar(expresion, evaluar(expresion.derecha, contexto) as boolean, contexto);
    }
    case 'negacion':
      return anotar(expresion, !(evaluar(expresion.operando, contexto) as boolean), contexto);
    case 'concatenacion': {
      const izquierda = aTexto(evaluar(expresion.izquierda, contexto), expresion.izquierda.tipo, contexto);
      const derecha = aTexto(evaluar(expresion.derecha, contexto), expresion.derecha.tipo, contexto);
      return anotar(expresion, cadenaConLimite(izquierda + derecha, contexto), contexto);
    }
    case 'asignacion': {
      const valor = evaluar(expresion.valor, contexto);
      asignar(contexto, expresion.ranura, expresion.nombre, valor, expresion.punto);
      return anotar(expresion, valor, contexto);
    }
    case 'asignacion-compuesta': {
      const valor = asignacionCompuesta(expresion, contexto);
      return anotar(expresion, valor, contexto);
    }
    case 'incremento':
      return anotar(expresion, incremento(expresion, contexto), contexto);
    case 'llamada':
      return anotar(expresion, llamada(expresion, contexto), contexto);
    case 'nuevo':
      return anotar(expresion, nuevo(expresion, contexto), contexto);
  }
}

// --- Aritmética y comparaciones --------------------------------------------------------------------------------------------------

function aritmetica(expresion: AritmeticaIr, contexto: ContextoDeEjecucion): ValorEjecucion {
  const izquierda = evaluar(expresion.izquierda, contexto);
  const derecha = evaluar(expresion.derecha, contexto);
  return operar(expresion.tipo, expresion.operador, izquierda as number | bigint, derecha as number | bigint);
}

/** La operación aritmética de Java para `tipo` (`int`, `long` o `double`) sobre dos operandos ya del mismo tipo. */
function operar(tipo: 'int' | 'long' | 'double', operador: AritmeticaIr['operador'], izquierda: number | bigint, derecha: number | bigint): number | bigint {
  if (tipo === 'int') {
    const a = izquierda as number;
    const b = derecha as number;
    switch (operador) {
      case '+': return sumarInt(a, b);
      case '-': return restarInt(a, b);
      case '*': return multiplicarInt(a, b);
      case '/': return dividirInt(a, b);
      case '%': return modInt(a, b);
    }
  }
  if (tipo === 'long') {
    const a = izquierda as bigint;
    const b = derecha as bigint;
    switch (operador) {
      case '+': return sumarLong(a, b);
      case '-': return restarLong(a, b);
      case '*': return multiplicarLong(a, b);
      case '/': return dividirLong(a, b);
      case '%': return modLong(a, b);
    }
  }
  const a = izquierda as number;
  const b = derecha as number;
  switch (operador) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return a / b;
    case '%': return a % b; // `%` de JavaScript es el resto de punto flotante con el signo del dividendo, igual que el de Java
  }
}

function comparacion(expresion: ComparacionIr, contexto: ContextoDeEjecucion): boolean {
  const izquierda = evaluar(expresion.izquierda, contexto);
  const derecha = evaluar(expresion.derecha, contexto);
  if (expresion.tipoOperandos === 'long') return comparar(expresion.operador, izquierda as bigint, derecha as bigint);
  if (expresion.tipoOperandos === 'int' || expresion.tipoOperandos === 'double') return comparar(expresion.operador, izquierda as number, derecha as number);
  // boolean y referencias (identidad: `String == String` compara el objeto, no el texto): solo `==` y `!=`
  return expresion.operador === '==' ? izquierda === derecha : izquierda !== derecha;
}

function comparar<T extends number | bigint>(operador: ComparacionIr['operador'], a: T, b: T): boolean {
  switch (operador) {
    case '<': return a < b;
    case '<=': return a <= b;
    case '>': return a > b;
    case '>=': return a >= b;
    case '==': return a === b;
    case '!=': return a !== b;
  }
}

// --- Texto -----------------------------------------------------------------------------------------------------------------------

/** `String.valueOf` según el tipo ESTÁTICO del valor (JLS 5.1.11, 15.18.1). */
export function aTexto(valor: ValorEjecucion, tipo: TipoIr | null, contexto: ContextoDeEjecucion): string {
  switch (tipo) {
    case 'int':
      return String(valor as number);
    case 'long':
      return (valor as bigint).toString();
    case 'char':
      return caracterATexto(valor as number);
    case 'boolean':
      return (valor as boolean) ? 'true' : 'false';
    case 'String':
      return (valor as CadenaJava).texto;
    case 'double': {
      const aTextoDeDouble = contexto.puerto.doubleATexto;
      if (aTextoDeDouble === null) throw new NoDisponibleEnEjecucion('double-sin-conversion-a-texto');
      return aTextoDeDouble(valor as number);
    }
    case 'Scanner':
    case 'Random':
      throw new NoDisponibleEnEjecucion('texto-de-un-objeto-de-la-biblioteca');
    case null:
      throw new Error('un valor sin tipo (una llamada void) no se convierte en texto');
  }
}

/** Una cadena NUEVA (identidad propia) que se arma en ejecución; si pasa del tope de caracteres, la ejecución se detiene con `limite-caracteres` (design.md §3.5). */
function cadenaConLimite(texto: string, contexto: ContextoDeEjecucion): CadenaJava {
  comprobarLargoDeCadena(texto.length, contexto.config.limiteCaracteres);
  return new CadenaJava(texto);
}

// --- Variables -------------------------------------------------------------------------------------------------------------------

/** Escribe una variable y deja el cambio (con el valor anterior, para poder deshacerlo) en el paso en curso. */
function asignar(contexto: ContextoDeEjecucion, ranura: number, nombre: string, valor: ValorEjecucion, punto: number): void {
  const anterior = contexto.ranuras[ranura];
  contexto.ranuras[ranura] = valor;
  contexto.paso.anteriores.set(punto, anterior);
  contexto.paso.cambios.push({ ranura: nombre, anterior: anterior === undefined ? undefined : aTrazaValor(anterior), nuevo: aTrazaValor(valor), punto });
}

function asignacionCompuesta(expresion: AsignacionCompuestaIr, contexto: ContextoDeEjecucion): ValorEjecucion {
  // `x op= e` es `x = (T)(x op e)`: primero se LEE x, luego se evalúa e (JLS 15.26.2).
  const leido = evaluar(expresion.lectura, contexto);
  const derecho = evaluar(expresion.valor, contexto);
  let resultado: ValorEjecucion;
  if (expresion.tipoOperacion === 'String') {
    resultado = cadenaConLimite(aTexto(leido, 'String', contexto) + aTexto(derecho, expresion.valor.tipo, contexto), contexto);
  } else {
    const tipoVariable = expresion.tipo as 'int' | 'long' | 'double' | 'char';
    const izquierdoPromovido = convertirNumero(leido as number | bigint, tipoVariable, expresion.tipoOperacion);
    const operado = operar(expresion.tipoOperacion, expresion.operador, izquierdoPromovido, derecho as number | bigint);
    contexto.paso.sinRecortar.set(expresion.punto, operado); // lo que dio la operación, para que la explicación lo diga antes de recortarlo
    resultado = convertirNumero(operado, expresion.tipoOperacion, tipoVariable); // estrechamiento implícito de vuelta al tipo de x
  }
  asignar(contexto, expresion.ranura, expresion.nombre, resultado, expresion.punto);
  return resultado;
}

function incremento(expresion: IncrementoIr, contexto: ContextoDeEjecucion): ValorEjecucion {
  const anterior = contexto.ranuras[expresion.ranura];
  if (anterior === undefined) throw new Error(`la variable "${expresion.nombre}" se incrementó sin valor`);
  let nuevoValor: ValorEjecucion;
  switch (expresion.tipo) {
    case 'int':
      nuevoValor = sumarInt(anterior as number, expresion.delta);
      break;
    case 'long':
      nuevoValor = sumarLong(anterior as bigint, BigInt(expresion.delta));
      break;
    case 'char':
      nuevoValor = sumarChar(anterior as number, expresion.delta);
      break;
    case 'double':
      nuevoValor = (anterior as number) + expresion.delta;
      break;
  }
  asignar(contexto, expresion.ranura, expresion.nombre, nuevoValor, expresion.punto);
  return expresion.posicion === 'prefijo' ? nuevoValor : anterior;
}

// --- Biblioteca ------------------------------------------------------------------------------------------------------------------

function llamada(expresion: LlamadaIr, contexto: ContextoDeEjecucion): ValorEjecucion | undefined {
  const receptor = expresion.receptor === null ? null : evaluar(expresion.receptor, contexto);
  const argumentos = expresion.argumentos.map((argumento) => evaluar(argumento, contexto));
  const variables: ValorEncajado[] | null =
    expresion.variables === null ? null : expresion.variables.map((variable) => ({ tipo: variable.tipo as TipoIr, valor: evaluar(variable, contexto) }));
  if (expresion.esNativa) {
    imprimir(expresion, argumentos, contexto);
    return undefined;
  }
  const operacion = contexto.puerto.operaciones.get(expresion.clave);
  if (operacion === undefined) throw new NoDisponibleEnEjecucion('operacion-sin-conectar', expresion.clave);
  const objetivo = receptor ?? (expresion.flujo === null ? null : contexto.flujos[expresion.flujo]);
  const resultado = operacion(objetivo, argumentos, variables, contexto.biblioteca);
  // Lo que arma la biblioteca (`replace`, `format`, `toUpperCase`…) también cuenta para el tope de caracteres.
  if (resultado instanceof CadenaJava) comprobarLargoDeCadena(resultado.texto.length, contexto.config.limiteCaracteres);
  return resultado;
}

function nuevo(expresion: NuevoIr, contexto: ContextoDeEjecucion): ValorEjecucion {
  const argumentos = expresion.argumentos.map((argumento) => evaluar(argumento, contexto));
  const operacion = contexto.puerto.operaciones.get(expresion.clave);
  if (operacion === undefined) throw new NoDisponibleEnEjecucion('operacion-sin-conectar', expresion.clave);
  const objeto = operacion(null, argumentos, null, contexto.biblioteca);
  if (objeto === undefined) throw new NoDisponibleEnEjecucion('operacion-sin-conectar', `${expresion.clave} no devolvió un objeto`);
  if (objeto instanceof CadenaJava) comprobarLargoDeCadena(objeto.texto.length, contexto.config.limiteCaracteres);
  return objeto;
}

/**
 * `print` y `println` de `int`, `long`, `char`, `boolean`, `double` y `String`: el texto es `String.valueOf` del tipo estático del argumento (`aTexto`, la misma conversión de la
 * concatenación) y el flujo (`System.out` o `System.err`, uno por ejecución) lo codifica como la JVM: un sustituto suelto sale como `?`, el fin de línea es `\n`.
 */
function imprimir(expresion: LlamadaIr, argumentos: readonly ValorEjecucion[], contexto: ContextoDeEjecucion): void {
  const conSalto = expresion.clave.startsWith('PrintStream.println');
  const texto = argumentos.length === 0 ? '' : aTexto(argumentos[0], expresion.argumentos[0].tipo, contexto);
  const flujo = contexto.flujos[expresion.flujo ?? 'out'];
  contexto.biblioteca.escribir(flujo.nombre, conSalto ? flujo.println('String', texto) : flujo.print('String', texto));
}
