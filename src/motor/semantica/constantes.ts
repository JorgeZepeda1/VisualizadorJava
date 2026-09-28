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
// QUEDA FUERA de esta tarea (D2: mejor null que fingir), para quien retome constantes más
// adelante:
//   - **Variables `final` con inicializador constante** (design.md §2.7, exploracion/03 §1.1
//     `str03`): `valorConstante('nombre', alcance)` siempre da `null` hoy. Requeriría que
//     `atribucion.ts` calcule y guarde el valor plegado en `SimboloVariable` al declarar un
//     `final` — cambio real pero acotado (`Alcance`/`atribucion.ts`), no lo pidió ningún RED de
//     1.10/1.11. `alcance.ts` seguiría con CERO dependencias hacia `constantes.ts` en tiempo de
//     VALOR (solo tipos, vía `import type`, igual que ya hacen `sobrecargas.ts`/`tipos.ts` entre
//     sí) si algún día se conecta.
//   - **Duplicados de `case` por VALOR tras convertir** (design.md §2.7: `case 97:`/`case 'a':` en
//     un mismo `switch` de `int`) más allá de la comparación textual — 1.11 solo necesita "¿esta
//     etiqueta de `case` es una expresión constante?" (`valorConstante(...) !== null`), no
//     reimplementar aquí la detección de duplicados (vive en `switch.ts`/`atribucion.ts`).
//
// El plegado de `double` reusa las MISMAS reglas numéricas de design.md §3.1 (wraparound `int`
// con `|0`/`Math.imul`, `long` con `BigInt.asIntN(64, ·)`) — la biblioteca REAL de esas reglas
// llega en la tarea 2.2; aquí se reimplementan mínimamente (mismas fórmulas, documentadas) porque
// el plegado de constantes NO PUEDE esperar a 2.2 (1.10 depende de 1.8, no de 2.2). La
// concatenación con un operando `double` usa un STUB NUMÉRICO para `Double.toString` (marcado
// `TODO(2.4)` en `textoDoubleTemporal`, retirado explícitamente al cerrar la tarea 2.4, igual que
// el propio stub de constantes que menciona el GREEN de esta tarea).
import type { NodoExpresion } from '../sintaxis/ast.ts';
import type { Alcance } from './alcance.ts';

export type ValorConstante =
  | { readonly tipo: 'int'; readonly valor: number }
  | { readonly tipo: 'long'; readonly valor: bigint }
  | { readonly tipo: 'double'; readonly valor: number }
  | { readonly tipo: 'boolean'; readonly valor: boolean }
  | { readonly tipo: 'char'; readonly valor: number }
  | { readonly tipo: 'String'; readonly valor: string };

/** Los campos constantes reales que REQ-SUB-005 reconoce (design.md §2.7). Valores universales de
 * la especificación de Java (IEEE 754 / complemento a 2), no dependen del JDK instalado — nunca
 * necesitan verificarse contra el oráculo. `Math.PI`/`Math.E` reusan los de JS DIRECTAMENTE: ambos
 * son "el `double` más cercano a la constante real", bit-idénticos entre JS y Java por definición
 * de IEEE 754 (nunca un valor aproximado o inventado). */
const CAMPOS_CONSTANTES: Readonly<Record<string, ValorConstante>> = {
  'Integer.MAX_VALUE': { tipo: 'int', valor: 2147483647 },
  'Integer.MIN_VALUE': { tipo: 'int', valor: -2147483648 },
  'Long.MAX_VALUE': { tipo: 'long', valor: 9223372036854775807n },
  'Long.MIN_VALUE': { tipo: 'long', valor: -9223372036854775808n },
  'Double.MAX_VALUE': { tipo: 'double', valor: 1.7976931348623157e308 },
  'Double.MIN_VALUE': { tipo: 'double', valor: 4.9e-324 },
  'Math.PI': { tipo: 'double', valor: Math.PI },
  'Math.E': { tipo: 'double', valor: Math.E },
};

/** Pura: el valor constante de `expresion` (JLS 15.29), o `null` si NO es una expresión constante
 * — nunca lanza, nunca inventa (D2). Recorre el árbol recursivamente; cualquier sub-expresión no
 * constante (una llamada, una variable no-`final`, alguna de las excluidas arriba) propaga `null`
 * hacia arriba de inmediato. */
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
    // 'nombre' (variable "final" — ver cabecera), 'asignacion', 'incremento-decremento', 'llamada'
    // (JAMÁS constante, JLS 15.29), 'nueva-instancia', 'expresion-no-soportada': ninguna es una
    // expresión constante en el alcance de esta tarea.
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
  return CAMPOS_CONSTANTES[`${nodo.objeto.nombre}.${nodo.miembro}`] ?? null;
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
  if (operador === '+' && (a.tipo === 'String' || b.tipo === 'String')) {
    return { tipo: 'String', valor: aTextoJava(a) + aTextoJava(b) };
  }
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

function aTextoJava(v: ValorConstante): string {
  switch (v.tipo) {
    case 'int':
      return String(v.valor);
    case 'long':
      return v.valor.toString();
    case 'boolean':
      return v.valor ? 'true' : 'false';
    case 'char':
      return String.fromCharCode(v.valor);
    case 'String':
      return v.valor;
    case 'double':
      return textoDoubleTemporal(v.valor);
  }
}

/** STUB NUMÉRICO (tarea 1.10 — retirado explícitamente al cerrar la tarea 2.4, que trae
 * `digitosJava`/`Double.toString` reales, design.md §4.2). Corrige el caso MÁS común donde JS y
 * Java difieren (JS omite ".0" en un valor entero exacto: `String(2)` -> "2"; Java SIEMPRE muestra
 * al menos un dígito decimal: "2.0") pero NO reproduce los casos finos de design.md §4.2 (empates
 * en el borde, potencias de dos, subnormales, umbral de notación científica) — ninguna prueba de
 * 1.10/1.11 depende de esos casos; cuando el lote 2 los necesite, esta función desaparece.
 */
function textoDoubleTemporal(valor: number): string {
  if (Number.isNaN(valor)) return 'NaN';
  if (!Number.isFinite(valor)) return valor > 0 ? 'Infinity' : '-Infinity';
  const texto = String(valor);
  return /[.e]/.test(texto) ? texto : `${texto}.0`;
}

// ---- Casts a primitivo (JLS 15.29: "casts a primitivo o String" — solo primitivo por ahora, ver
// cabecera: ningún caso real de 1.10/1.11 pide un cast a String) ----

function plegarConversion(nombreTipo: string, v: ValorConstante): ValorConstante | null {
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
