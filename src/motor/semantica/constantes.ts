// Plegado de expresiones constantes (tarea 1.10, JLS 15.29, REQ-COMP-001 parcial) · depende de 1.8
// (catálogo/sobrecargas reales, aunque esta tarea NUNCA pliega una llamada — JLS 15.29 jamás
// incluye invocaciones de método, ni siquiera a una función pura como `Math.abs`).
//
// Alcance de ESTA tarea (deliberadamente angosto, documentado — mismo estilo que el resto de
// `semantica/`): literales, operadores (+ - * / % == != < > <= >= && || ! unario), casts a
// primitivo (`int`/`long`/`double`/`char`) y los campos constantes reales que el subconjunto usa
// (`Integer`/`Long`/`Double.MAX_VALUE`/`MIN_VALUE`, `Math.PI`/`Math.E`). Los bits (`& | ^ << >> >>>`)
// y `instanceof`/`?:` NUNCA llegan aquí como `NodoBinaria`/`NodoUnaria` — son NO-DISP desde la
// SINTAXIS (`NodoExpresionNoSoportada`, 1.3), así que `plegarBinaria`/`plegarUnaria` no necesitan
// reconocerlos.
//
// Tarea 2.4 (cierre de la 1.36, hito 1 parte C): una expresión es constante de valor CONOCIDO o no es constante. La tarea 1.36 (C-5 y W-10) había agregado un tercer estado, «constante de valor
// desconocido», porque el motor no sabía convertir un `double` a texto: para javac `"a" + 1.5` es una expresión constante (JLS 15.29) y de ella dependen la alcanzabilidad de un ciclo, la asignación
// definitiva y las etiquetas de `case`; dar `null` («no es constante») era un resultado inventado, así que las tres decisiones daban un aviso honesto. Con `Double.toString` exacto (la biblioteca, tarea
// 2.4) el texto de un `double` se calcula como lo hace Java, el tercer estado desaparece y las tres decisiones usan el valor real.
//
// Deuda 3 saldada (commit 999a8ca, sub-lote 1-D1, JLS 4.12.4): las variables `final` con
// inicializador constante (design.md §2.7, exploracion/03 §1.1 `str03`) YA participan del plegado
// — caso 'nombre' de abajo, `valorDeVariableConstante` — porque `atribucion.ts`/`alcanzabilidad.ts`
// ahora guardan el valor plegado en `SimboloVariable.constante` al declarar un "final". `alcance.ts`
// sigue con CERO dependencia hacia `constantes.ts` en tiempo de VALOR (solo tipos, `import type`).
//
// QUEDA FUERA de esta tarea (D2: mejor null que fingir), para quien retome constantes más
// adelante:
//   - **Duplicados de `case` por VALOR tras convertir** (design.md §2.7: `case 97:`/`case 'a':` en
//     un mismo `switch` de `int`) más allá de la comparación textual — 1.11 solo necesita "¿esta
//     etiqueta de `case` es una expresión constante?" (`valorConstante(...) !== null`), no
//     reimplementar aquí la detección de duplicados (vive en `switch.ts`/`atribucion.ts`).
//
// El plegado de `double` reusa las MISMAS reglas numéricas de design.md §3.1 (wraparound `int`
// con `|0`/`Math.imul`, `long` con `BigInt.asIntN(64, ·)`) — la biblioteca REAL de esas reglas
// llega en la tarea 2.2; aquí se reimplementan mínimamente (mismas fórmulas, documentadas) porque
// el plegado de constantes NO PUEDE esperar a 2.2 (1.10 depende de 1.8, no de 2.2).
//
// Deuda saldada (tarea 2.4): el texto de un `double` en una concatenación es el `Double.toString` de la biblioteca (design.md §4.2), el mismo de `println(double)`; ya no hay un stub ni un `if` que
// evite plegar.
import { doubleATexto } from '../biblioteca/formato/double-a-texto.ts';
import type { NodoExpresion } from '../sintaxis/ast.ts';
import type { Alcance } from './alcance.ts';

export type ValorConstante =
  | { readonly tipo: 'int'; readonly valor: number }
  | { readonly tipo: 'long'; readonly valor: bigint }
  | { readonly tipo: 'double'; readonly valor: number }
  | { readonly tipo: 'boolean'; readonly valor: boolean }
  | { readonly tipo: 'char'; readonly valor: number }
  | { readonly tipo: 'String'; readonly valor: string };

/** Los bytes que ocupa `texto` como constante `CONSTANT_Utf8` de un archivo de clase (UTF-8 MODIFICADO, JVMS 4.4.7): 1 para U+0001–U+007F, 2 para U+0000 y U+0080–U+07FF, 3 para el resto, y cada unidad de un par de sustitutos cuenta POR SEPARADO (3 + 3 = 6 bytes por un emoji). */
export function bytesEnUtf8Modificado(texto: string): number {
  let bytes = 0;
  for (let i = 0; i < texto.length; i += 1) {
    const unidad = texto.charCodeAt(i);
    bytes += unidad >= 0x01 && unidad <= 0x7f ? 1 : unidad <= 0x7ff ? 2 : 3;
  }
  return bytes;
}

/** Los campos constantes reales que REQ-SUB-005 reconoce (design.md §2.7). Valores universales de
 * la especificación de Java (IEEE 754 / complemento a 2), no dependen del JDK instalado — nunca
 * necesitan verificarse contra el oráculo. `Math.PI`/`Math.E` reusan los de JS DIRECTAMENTE: ambos
 * son "el `double` más cercano a la constante real", bit-idénticos entre JS y Java por definición
 * de IEEE 754 (nunca un valor aproximado o inventado). */
// Tarea 1.34: un `Map` (se consulta con `clase.miembro` armado con lo que escribió el alumno; ver `PRECEDENCIA` en `sintaxis/expresiones.ts`).
const CAMPOS_CONSTANTES: ReadonlyMap<string, ValorConstante> = new Map<string, ValorConstante>([
  ['Integer.MAX_VALUE', { tipo: 'int', valor: 2147483647 }],
  ['Integer.MIN_VALUE', { tipo: 'int', valor: -2147483648 }],
  ['Long.MAX_VALUE', { tipo: 'long', valor: 9223372036854775807n }],
  ['Long.MIN_VALUE', { tipo: 'long', valor: -9223372036854775808n }],
  ['Double.MAX_VALUE', { tipo: 'double', valor: 1.7976931348623157e308 }],
  ['Double.MIN_VALUE', { tipo: 'double', valor: 4.9e-324 }],
  ['Math.PI', { tipo: 'double', valor: Math.PI }],
  ['Math.E', { tipo: 'double', valor: Math.E }],
]);

/** Pura: el valor constante de `expresion` (JLS 15.29), o `null` si NO es una expresión constante — nunca lanza, nunca inventa (D2). Recorre el árbol recursivamente; cualquier
 * sub-expresión no constante (una llamada, una variable no-`final`, alguna de las excluidas arriba) propaga `null` hacia arriba de inmediato. */
export function valorConstante(expresion: NodoExpresion, alcance: Alcance): ValorConstante | null {
  switch (expresion.tipo) {
    case 'literal-entero':
      return { tipo: 'int', valor: Number(expresion.valor) };
    case 'literal-largo':
      return { tipo: 'long', valor: expresion.valor };
    case 'literal-doble':
      return { tipo: 'double', valor: expresion.valor };
    case 'literal-caracter':
      return { tipo: 'char', valor: expresion.valor.charCodeAt(0) };
    case 'literal-cadena':
      return { tipo: 'String', valor: expresion.valor };
    case 'literal-booleano':
      return { tipo: 'boolean', valor: expresion.valor };
    case 'unaria': {
      const operando = valorConstante(expresion.operando, alcance);
      return operando === null ? null : plegarUnaria(expresion.operador, operando);
    }
    case 'binaria': {
      const izquierda = valorConstante(expresion.izquierda, alcance);
      const derecha = valorConstante(expresion.derecha, alcance);
      return izquierda === null || derecha === null ? null : plegarBinaria(expresion.operador, izquierda, derecha);
    }
    case 'conversion': {
      const operando = valorConstante(expresion.operando, alcance);
      return operando === null ? null : plegarConversion(expresion.nombreTipo, operando);
    }
    case 'acceso-miembro':
      return valorDeCampoConstante(expresion, alcance);
    case 'nombre':
      return valorDeVariableConstante(expresion, alcance);
    // 'asignacion', 'incremento-decremento', 'llamada' (JAMÁS constante, JLS 15.29),
    // 'nueva-instancia', 'expresion-no-soportada': ninguna es una expresión constante.
    default:
      return null;
  }
}

function valorDeCampoConstante(
  nodo: Extract<NodoExpresion, { tipo: 'acceso-miembro' }>,
  alcance: Alcance,
): ValorConstante | null {
  if (nodo.objeto.tipo !== 'nombre') return null;
  // Una variable local con ese nombre SIEMPRE gana sobre la clase (JLS: resolución de nombres),
  // igual que ya hace `claseDelObjeto` en `tipos.ts` — nunca lee "Math.PI" como constante si "Math"
  // es, en este programa, el nombre de una variable.
  if (alcance.buscar(nodo.objeto.nombre) !== null) return null;
  return CAMPOS_CONSTANTES.get(`${nodo.objeto.nombre}.${nodo.miembro}`) ?? null;
}

/** Deuda 3 del commit 999a8ca (JLS 4.12.4, "variable constante"): una local "final" cuyo
 * inicializador es una expresión constante ES una expresión constante (participa en etiquetas de
 * `case`, alcanzabilidad/asignación definitiva y en el internado de `String`, exactamente como un
 * literal). Quien DECLARA el símbolo (`atribucion.ts`/`alcanzabilidad.ts`) ya guardó ese valor
 * plegado en `SimboloVariable.constante` — aquí solo se lee de vuelta; `null` si el nombre no
 * existe, no es "final", o su inicializador nunca se pudo plegar (D2: nunca inventar). */
function valorDeVariableConstante(nodo: Extract<NodoExpresion, { tipo: 'nombre' }>, alcance: Alcance): ValorConstante | null {
  const simbolo = alcance.buscar(nodo.nombre);
  return simbolo !== null && simbolo.esFinal && simbolo.constante !== undefined ? simbolo.constante : null;
}

// ---- Promoción numérica binaria/unaria (JLS 5.6) ----

type NumericoPromovido =
  | { readonly tipo: 'int'; readonly valor: number }
  | { readonly tipo: 'long'; readonly valor: bigint }
  | { readonly tipo: 'double'; readonly valor: number };

/** `char` promueve a `int` (JLS 5.6); `boolean`/`String` no participan en aritmética numérica. */
function promoverNumerico(v: ValorConstante): NumericoPromovido | null {
  if (v.tipo === 'char') return { tipo: 'int', valor: v.valor };
  if (v.tipo === 'int' || v.tipo === 'long' || v.tipo === 'double') return v;
  return null;
}

function tipoPromovidoComun(a: NumericoPromovido, b: NumericoPromovido): 'int' | 'long' | 'double' {
  if (a.tipo === 'double' || b.tipo === 'double') return 'double';
  if (a.tipo === 'long' || b.tipo === 'long') return 'long';
  return 'int';
}

function comoDouble(p: NumericoPromovido): number {
  return p.tipo === 'long' ? Number(p.valor) : p.valor;
}

function comoLargo(p: NumericoPromovido): bigint {
  return p.tipo === 'long' ? p.valor : BigInt(p.valor);
}

// ---- Unaria (+ - !) ----

function plegarUnaria(operador: '+' | '-' | '!', v: ValorConstante): ValorConstante | null {
  if (operador === '!') return v.tipo === 'boolean' ? { tipo: 'boolean', valor: !v.valor } : null;
  const p = promoverNumerico(v);
  if (p === null) return null;
  if (operador === '+') return p; // no-op numérico (JLS 15.29 lo incluye igual que "-")
  if (p.tipo === 'int') return { tipo: 'int', valor: -p.valor | 0 };
  if (p.tipo === 'long') return { tipo: 'long', valor: BigInt.asIntN(64, -p.valor) };
  return { tipo: 'double', valor: -p.valor };
}

// ---- Binaria (+ - * / % == != < > <= >= && ||) ----

const OPERADORES_ARITMETICOS: ReadonlySet<string> = new Set(['+', '-', '*', '/', '%']);
const OPERADORES_COMPARACION: ReadonlySet<string> = new Set(['==', '!=', '<', '>', '<=', '>=']);

function plegarBinaria(operador: string, a: ValorConstante, b: ValorConstante): ValorConstante | null {
  // JLS 15.18.1: `+` con un operando `String` es una concatenación y SIEMPRE es constante cuando los dos lados lo son; un `double` se convierte con `Double.toString` (tarea 2.4).
  if (operador === '+' && (a.tipo === 'String' || b.tipo === 'String')) return { tipo: 'String', valor: textoJavaDeConstante(a) + textoJavaDeConstante(b) };
  if (OPERADORES_ARITMETICOS.has(operador)) {
    const pa = promoverNumerico(a);
    const pb = promoverNumerico(b);
    return pa === null || pb === null ? null : plegarAritmetica(operador, pa, pb);
  }
  if (OPERADORES_COMPARACION.has(operador)) {
    if (a.tipo === 'boolean' && b.tipo === 'boolean') {
      if (operador !== '==' && operador !== '!=') return null; // <, > etc. no aplican a boolean
      const r = operador === '==' ? a.valor === b.valor : a.valor !== b.valor;
      return { tipo: 'boolean', valor: r };
    }
    if (a.tipo === 'String' && b.tipo === 'String') {
      // Comparación por CONTENIDO: dos expresiones constantes de tipo String se internan (JLS
      // 3.10.5) — para dos constantes, "==" y ".equals()" dan SIEMPRE el mismo resultado
      // (exploracion/03 §1.1). "<"/">" nunca aplican a String (error de tipos, ajeno a esta pasada).
      if (operador !== '==' && operador !== '!=') return null;
      const r = operador === '==' ? a.valor === b.valor : a.valor !== b.valor;
      return { tipo: 'boolean', valor: r };
    }
    const pa = promoverNumerico(a);
    const pb = promoverNumerico(b);
    if (pa === null || pb === null) return null;
    const r = plegarComparacionNumerica(operador, pa, pb);
    return r === null ? null : { tipo: 'boolean', valor: r };
  }
  if (operador === '&&' || operador === '||') {
    if (a.tipo !== 'boolean' || b.tipo !== 'boolean') return null;
    const r = operador === '&&' ? a.valor && b.valor : a.valor || b.valor;
    return { tipo: 'boolean', valor: r };
  }
  // Bits/instanceof/?: nunca llegan aquí (NO-DISP desde la sintaxis, ver cabecera).
  return null;
}

function plegarAritmetica(operador: string, a: NumericoPromovido, b: NumericoPromovido): ValorConstante | null {
  const comun = tipoPromovidoComun(a, b);
  if (comun === 'double') {
    const r = aplicarDouble(operador, comoDouble(a), comoDouble(b));
    return r === null ? null : { tipo: 'double', valor: r };
  }
  if (comun === 'long') {
    const x = comoLargo(a);
    const y = comoLargo(b);
    if ((operador === '/' || operador === '%') && y === 0n) return null; // JLS 15.29: lanzaría ArithmeticException
    const r = aplicarLargo(operador, x, y);
    return r === null ? null : { tipo: 'long', valor: r };
  }
  // 'int' — a esta altura, promoverNumerico ya garantizó que ambos son 'int' (char ya promovió).
  const x = a.valor as number;
  const y = b.valor as number;
  if ((operador === '/' || operador === '%') && y === 0) return null;
  const r = aplicarEntero(operador, x, y);
  return r === null ? null : { tipo: 'int', valor: r };
}

// design.md §3.1, reimplementado aquí mínimamente (1.10 no puede esperar a la biblioteca real de
// la tarea 2.2 — ver cabecera del archivo).
function aplicarEntero(operador: string, x: number, y: number): number | null {
  switch (operador) {
    case '+':
      return (x + y) | 0;
    case '-':
      return (x - y) | 0;
    case '*':
      return Math.imul(x, y);
    case '/':
      return (x / y) | 0; // trunca hacia cero (ToInt32); MIN_VALUE/-1 da la vuelta a MIN_VALUE
    case '%':
      return (x % y) | 0; // normaliza -0
    default:
      return null;
  }
}

function aplicarLargo(operador: string, x: bigint, y: bigint): bigint | null {
  switch (operador) {
    case '+':
      return BigInt.asIntN(64, x + y);
    case '-':
      return BigInt.asIntN(64, x - y);
    case '*':
      return BigInt.asIntN(64, x * y);
    case '/':
      return BigInt.asIntN(64, x / y); // BigInt "/" ya trunca hacia cero, igual que Java long
    case '%':
      return BigInt.asIntN(64, x % y);
    default:
      return null;
  }
}

function aplicarDouble(operador: string, x: number, y: number): number | null {
  switch (operador) {
    case '+':
      return x + y;
    case '-':
      return x - y;
    case '*':
      return x * y;
    case '/':
      return x / y; // IEEE 754 real: /0.0 da Infinity/NaN, JAMÁS lanza (design.md §3.1)
    case '%':
      return x % y; // JS "%" de number ES el resto truncado de IEEE 754 (ECMA-262), igual que Java
    default:
      return null;
  }
}

function plegarComparacionNumerica(operador: string, a: NumericoPromovido, b: NumericoPromovido): boolean | null {
  const comun = tipoPromovidoComun(a, b);
  if (comun === 'double') return aplicarComparacionNumero(operador, comoDouble(a), comoDouble(b));
  if (comun === 'long') return aplicarComparacionLargo(operador, comoLargo(a), comoLargo(b));
  return aplicarComparacionNumero(operador, a.valor as number, b.valor as number);
}

function aplicarComparacionNumero(operador: string, x: number, y: number): boolean | null {
  switch (operador) {
    case '==':
      return x === y; // NaN === NaN es false en JS, igual que Java (NaN nunca es igual a nada)
    case '!=':
      return x !== y;
    case '<':
      return x < y;
    case '>':
      return x > y;
    case '<=':
      return x <= y;
    case '>=':
      return x >= y;
    default:
      return null;
  }
}

function aplicarComparacionLargo(operador: string, x: bigint, y: bigint): boolean | null {
  switch (operador) {
    case '==':
      return x === y;
    case '!=':
      return x !== y;
    case '<':
      return x < y;
    case '>':
      return x > y;
    case '<=':
      return x <= y;
    case '>=':
      return x >= y;
    default:
      return null;
  }
}

// ---- Concatenación con String (JLS 15.18.1: "+" con un operando String es constante) ----

/** El texto en que Java convierte `v` al concatenarlo con un `String` (JLS 5.1.11): `String.valueOf` de su tipo, con el `Double.toString` exacto para un `double`. TypeScript exige cubrir todos los tipos. */
export function textoJavaDeConstante(v: ValorConstante): string {
  switch (v.tipo) {
    case 'int':
      return String(v.valor);
    case 'long':
      return v.valor.toString();
    case 'double':
      return doubleATexto(v.valor);
    case 'boolean':
      return v.valor ? 'true' : 'false';
    case 'char':
      return String.fromCharCode(v.valor);
    case 'String':
      return v.valor;
  }
}

// ---- Casts a primitivo y a String (JLS 15.29: "casts a primitivo o String"; el de `String` y el de `boolean` son la identidad, tarea 1.35) ----

function plegarConversion(nombreTipo: string, v: ValorConstante): ValorConstante | null {
  // Tarea 1.35 (JLS 15.29: «casts a tipos primitivos y a `String`»): `(String) "a"` y `(boolean) true` son la identidad — el único cast válido de un `String` a
  // `String` o de un `boolean` a `boolean` — y siguen siendo constantes (`case (String) "a":`, `if ((boolean) true)`). Cualquier otro operando (`(String) 5`,
  // `(boolean) 1`) es un cast que Java rechaza: no es una constante (el error lo da la atribución, REQ-SUB-003).
  if (nombreTipo === 'String') return v.tipo === 'String' ? v : null;
  if (nombreTipo === 'boolean') return v.tipo === 'boolean' ? v : null;
  const p = promoverNumerico(v);
  if (p === null) return null; // cast numérico de boolean/String: no es una conversión válida de Java
  switch (nombreTipo) {
    case 'int':
      return { tipo: 'int', valor: aEntero(p) };
    case 'long':
      return { tipo: 'long', valor: aLargo(p) };
    case 'double':
      return { tipo: 'double', valor: aDouble(p) };
    case 'char':
      return { tipo: 'char', valor: aEntero(p) & 0xffff }; // design.md §3.1: "desde double, primero a int"
    default:
      return null;
  }
}

function aDouble(p: NumericoPromovido): number {
  return p.tipo === 'long' ? Number(p.valor) : p.valor; // design.md §3.1: long->double con Number(bigint)
}

const LARGO_MIN = -9223372036854775808n;
const LARGO_MAX = 9223372036854775807n;

function aEntero(p: NumericoPromovido): number {
  if (p.tipo === 'int') return p.valor;
  if (p.tipo === 'long') return Number(BigInt.asIntN(32, p.valor)); // long->int: da la vuelta (design.md §3.1)
  return saturarDoubleAEntero(p.valor); // double->int: satura, NaN->0, trunca hacia cero
}

function aLargo(p: NumericoPromovido): bigint {
  if (p.tipo === 'long') return p.valor;
  if (p.tipo === 'int') return BigInt(p.valor);
  return saturarDoubleALargo(p.valor);
}

function saturarDoubleAEntero(valor: number): number {
  if (Number.isNaN(valor)) return 0;
  if (valor <= -2147483648) return -2147483648;
  if (valor >= 2147483647) return 2147483647;
  return Math.trunc(valor);
}

function saturarDoubleALargo(valor: number): bigint {
  if (Number.isNaN(valor)) return 0n;
  if (valor <= -9223372036854775808) return LARGO_MIN;
  if (valor >= 9223372036854775808) return LARGO_MAX; // 2^63: el double más cercano por arriba de LARGO_MAX
  return BigInt(Math.trunc(valor));
}

// ---- El valor de una variable CONSTANTE (JLS 4.12.4) ----

/**
 * Tarea 1.35 (JLS 4.12.4 y 5.2): el valor que guarda una variable `final` constante — el del inicializador ya CONVERTIDO al tipo declarado por la
 * conversión de asignación: `final int A = 'a';` guarda el `int` 97 (no el `char`), `final double D = 5;` guarda el `double` 5.0 y `final char C = 65;`
 * guarda el `char` 65 (estrechamiento de una constante `int` que cabe en un `char`, JLS 5.2). Antes cada pasada guardaba el valor plegado TAL CUAL salió del
 * inicializador: `char c = A;` (con `A` el `int` 97 declarado con un `char`) no reconocía la constante y daba un `conversion-con-perdida` falso, y
 * `final double D = 5; D / 2` se plegaba como división entera. Pura. `undefined` si no hay valor, si el tipo declarado no puede ser constante (solo los
 * primitivos del subconjunto y `String`, JLS 4.12.4) o si la asignación no es válida (el error de asignación lo da la atribución: aquí no queda una
 * constante inventada).
 */
export function constanteDeVariable(nombreTipo: string, valor: ValorConstante | null): ValorConstante | undefined {
  if (valor === null) return undefined;
  switch (nombreTipo) {
    case 'boolean':
      return valor.tipo === 'boolean' ? valor : undefined;
    case 'String':
      return valor.tipo === 'String' ? valor : undefined;
    case 'int':
      return valor.tipo === 'int' ? valor : valor.tipo === 'char' ? { tipo: 'int', valor: valor.valor } : undefined;
    case 'long':
      return valor.tipo === 'long' ? valor : valor.tipo === 'int' || valor.tipo === 'char' ? { tipo: 'long', valor: BigInt(valor.valor) } : undefined;
    case 'double':
      if (valor.tipo === 'double') return valor;
      if (valor.tipo === 'long') return { tipo: 'double', valor: Number(valor.valor) };
      return valor.tipo === 'int' || valor.tipo === 'char' ? { tipo: 'double', valor: valor.valor } : undefined;
    case 'char':
      if (valor.tipo === 'char') return valor;
      return valor.tipo === 'int' && valor.valor >= 0 && valor.valor <= 65535 ? { tipo: 'char', valor: valor.valor } : undefined;
    default:
      return undefined;
  }
}
