// Tarea 1.16 (Mutantes contra veredictos de javac, REQ-DIFF-006, criterio C7, sub-lotes
// 1-D3/1-D4/1-D5) -- CERRADA en el sub-lote 1-D5: C7 CUMPLIDO (100% veredicto, línea ≥95%).
// Compara `compilar()` (src/motor) contra `corpus/mutantes/veredictos.jsonl` -- datos REALES del
// oráculo (ADR 010), generados por `npm run oraculo:mutantes` (`herramientas/oraculo/mutantes.ts`
// + `CompiladorEnLote.java`, una sola JVM, `javax.tools`) a partir de ≥2000 mutaciones de un solo
// token sobre `corpus/curso/` con semilla fija (determinismo real).
//
// C7 (proposal.md §8): "Veredicto igual a javac en el 100% de ≥2000 mutantes de un solo cambio;
// línea del primer error -el de la primera pasada que falla- igual en ≥95% de ellos." El CÓDIGO
// (mapeo de claves de javac a `CodigoProblema`) NO tiene un umbral propio en C7 -- se rastrea aquí
// como métrica secundaria, con un umbral que refleja lo REALMENTE alcanzado, nunca inflado.
//
// Historia real (nunca inflada): sub-lote 1-D3 arrancó en 88.69% veredicto/86.93% línea, cerró en
// 98.02%/94.69% (línea todavía bajo el 95% de C7). Sub-lote 1-D4 (tarea 1.21) cerró las 3 clases
// de discrepancia que 1-D3 dejó documentadas MÁS 2 clases nuevas descubiertas al medir después de
// esas 3 correcciones, cerrando en 99.92% (2623/2625) veredicto / 98.76% línea (línea YA cumplía
// C7, veredicto a 2 mutantes de 100%) -- 2 clases NUEVAS, chicas, documentadas pero NO cerradas esa
// sesión: (a) `u5-switch-menu-calculadora.java#49`, un literal de cadena seguido de "(args)" se
// aceptaba como llamada (el PARSER de `expresiones.ts` no restringía la forma de
// `NodoLlamada.callee`, JLS 15.12 exige `MethodName(...)`/`Primary.Identifier(...)`, NUNCA un
// Primary arbitrario); (b) `u6-ciclos-anidados-tabla.java#52`, un literal float NO-DISP ("3f",
// verificado que javac también lo tokeniza así, JLS 3.10.2) dentro de la condición de un `for`
// hacía que el `for` COMPLETO se aceptara como NO-DISP en silencio, aunque javac rechace el
// programa por una razón estructural INDEPENDIENTE (falta el ";" real del "for", JLS 14.14).
//
// Sub-lote 1-D5 (ESTA sesión) cerró AMBAS clases pendientes:
//   (a) `expresiones.ts`, `analizarPostfija`: el "(" que sigue a una expresión postfija SOLO forma
//       una llamada cuando esa expresión es 'nombre' o 'acceso-miembro' (JLS 15.12) -- cualquier
//       otro Primary (un literal, el resultado de "(a-b)"...) deja el "(" SIN CONSUMIR, así que el
//       contexto que sigue (p. ej. el ")" de un println envolvente) lo rechaza con su propio error
//       real, verificado idéntico a javac ("')' expected").
//   (b) DOS correcciones juntas, porque una sola no bastaba: `expresiones.ts`, `analizarPrimaria`
//       ahora trata CUALQUIER token léxico no-soportado (hex/octal/binario/float/`\uXXXX`...) como
//       una primaria válida (ADR 003 "deja seguir", consume el token y produce
//       `expresion-no-soportada` -- MISMO patrón que ya usa this/super/null/lambda/ternario/
//       instanceof/bits, nunca una excepción). Y `compilador.ts`, `avisoEnmascaraError`: un aviso
//       NO-DISP léxico solo enmascara un error de sintaxis POSTERIOR (no colocado en su propio
//       rango) cuando su código es `escape-unicode-no-soportado` (JLS 3.3, la traducción real
//       NUNCA se implementa a propósito, D2 explícito) -- CUALQUIER otro no-soportado léxico
//       (literal hex/octal/binario/float) es un VALOR real y bien entendido que simplemente no se
//       renderiza, así que una vez que la gramática lo consume sin abortar, un error estructural
//       GENUINAMENTE posterior (p. ej. el ";" que le falta a un "for") debe ganar, no quedar
//       enmascarado. Verificado contra javac 17 real que ambas correcciones son necesarias Y
//       correctas (incluida la asimetría escape-unicode vs. literales, ver el discovery de esta
//       sesión en engram sobre `07-escape-unicode-en-comentario.java`, que SÍ debe seguir
//       enmascarando -- javac compila ese programa limpio -- vs. el "for" del mutante u6, que NO).
// Resultado final: **veredicto 100.00% (2625/2625), línea 98.84% (2383/2411), código 87.18%
// (2102/2411)**. C7 CUMPLIDO por completo. Umbrales fijados como mínimos de C7 (veredicto 1.0,
// línea 0.95 -- el mínimo que exige C7, con margen real de sobra por encima) + código en su valor
// real medido (0.87, nunca inflado).
//
// Tarea 1.29 (D2: ningún programa que javac compila se presenta como error): el veredicto (2625/2625 = 100.00 %) y la línea
// (2383/2411 = 98.84 %) quedan IDÉNTICOS; el CÓDIGO sube de 87.18 % (2102/2411) a 88.47 % (2133/2411): +31 mutantes de
// «duplicar» del tipo `System.out.println println("…")` — javac lee `System.out.println println` como una declaración con un tipo
// CALIFICADO y pide «;» (`compiler.err.expected` → `falta-punto-y-coma`); desde que el analizador reconoce declaraciones con tipo
// calificado (`consumirNombreDeTipo`, `pareceDeclaracionLocal`) damos ese mismo código, en la misma línea (antes
// `error-no-clasificado`). Comparados uno por uno contra `HEAD` (los 31 y solo esos). El umbral (0.87) NO se toca: es un mínimo
// que exige no retroceder, no un valor medido.
//
// Tarea 1.35 (el código había quedado a UN mutante del umbral por la 1.33 y la 1.34): veredicto 100,00 % y línea 98,88 % SIN cambios; el CÓDIGO pasa de 87,06 % (2 099/2 411) a 89,17 %
// (2 150/2 411) porque la tabla de claves de javac manda `not.stmt`, `expected3`, `doesnt.exist`… al genérico `error-no-clasificado` y el motor ya da, en la misma línea, el código preciso.
// Se aceptan SOLO los 51 mutantes que se auditaron uno por uno (`CODIGOS_MAS_PRECISOS_QUE_EL_DE_JAVAC`: el texto que vería el alumno contra la línea mutada) y se dejan fuera, con su razón, los
// grupos cuyo texto engaña a veces (`falta-parentesis-cierre`, `llave-de-clase-faltante`, `llave-de-metodo-faltante`…). El umbral SUBE de 0,87 a 0,88: nunca se baja.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RUTA_VEREDICTOS = resolve(AQUI, '..', '..', 'corpus', 'mutantes', 'veredictos.jsonl');

interface VeredictoReal {
  readonly id: string;
  readonly base: string;
  readonly mutacion: string;
  readonly fuente: string;
  readonly compila: boolean;
  readonly linea: number;
  readonly codigoJavac: string;
  readonly mensajeJavac: string;
}

function leerVeredictos(): VeredictoReal[] {
  const contenido = readFileSync(RUTA_VEREDICTOS, 'utf-8').trim();
  return contenido
    .split('\n')
    .filter((linea) => linea.length > 0)
    .map((linea) => JSON.parse(linea) as VeredictoReal);
}

interface NuestroVeredicto {
  readonly compila: boolean;
  readonly linea: number | null;
  readonly codigo: string | null;
}

function nuestroVeredicto(fuente: string): NuestroVeredicto {
  const resultado = compilar(fuente);
  if (resultado.ok) return { compila: true, linea: null, codigo: null };
  // NO-DISP (categoria 'no-disponible'): javac SÍ compila estas construcciones (existen, fuera de
  // REQ-SUB-005/007) -- "no lo mostramos" nunca es "no compila" (D2, misma distinción que ya hace
  // el resto del motor). Desde la tarea 1.27 esto incluye el hueco de IR del lote 2
  // (`ejecucion-no-disponible`): antes llegaba como `error-no-clasificado` y esta comparación lo
  // reconocía por el texto del mensaje de `generar-ir.ts`, una regla que ya no puede coincidir con
  // nada y que solo habría servido para esconder una regresión futura.
  if (resultado.problema.categoria === 'no-disponible') return { compila: true, linea: null, codigo: null };
  return { compila: false, linea: resultado.problema.linea, codigo: String(resultado.problema.codigo) };
}

/**
 * Mapeo de claves de javac (`Diagnostic#getCode()`, estable e independiente de idioma --
 * `CompiladorEnLote.java`) a `CodigoProblema` esperado. Construido a partir de los datos REALES de
 * `corpus/mutantes/veredictos.jsonl` de esta sesión (nunca a priori) -- una clave ausente de este
 * `switch` es una clase de discrepancia TODAVÍA no investigada (cae en `null`, excluida del
 * denominador de "código", nunca contada como acierto artificial).
 */
function codigoEsperadoDeJavac(codigoJavac: string, mensajeJavac: string): string | null {
  switch (codigoJavac) {
    case 'compiler.err.expected':
      if (mensajeJavac.startsWith("';'")) return 'falta-punto-y-coma';
      if (mensajeJavac.startsWith("')'")) return 'falta-parentesis-cierre';
      return 'error-no-clasificado';
    case 'compiler.err.expected2':
    case 'compiler.err.expected3':
      return 'error-no-clasificado';
    case 'compiler.err.expected4':
      return 'llave-de-cierre-sobrante';
    case 'compiler.err.repeated.modifier':
      return 'modificador-repetido';
    case 'compiler.err.premature.eof':
      return 'fin-de-archivo-inesperado';
    case 'compiler.err.else.without.if':
      return 'else-sin-if';
    case 'compiler.err.illegal.start.of.expr':
    case 'compiler.err.illegal.start.of.type':
    case 'compiler.err.not.stmt':
    case 'compiler.err.illegal.dot':
    case 'compiler.err.doesnt.exist':
    case 'compiler.err.invalid.meth.decl.ret.type.req':
    case 'compiler.err.missing.meth.body.or.decl.abstract':
    case 'compiler.err.illegal.start.of.stmt':
    case 'compiler.err.dot.class.expected':
    case 'compiler.err.preview.feature.disabled.plural':
    case 'compiler.err.unreachable.stmt':
    case 'excepcion-del-compilador':
      return 'error-no-clasificado';
    // Tarea 1.21 (sub-lote 1-D4): "unexpected type\n  required: variable\n  found: value" (JLS
    // 4.12.3/15.14/15.26, "Scanner = ...;"/"fila++ ++;") -- MISMA clave que OTROS "unexpected
    // type" que esta tarea no cubre (p. ej. usar un método donde se espera un tipo); el mensaje es
    // lo único que distingue el caso real de "objetivo-no-es-variable".
    case 'compiler.err.unexpected.type':
      return mensajeJavac.includes('required:') && mensajeJavac.includes('variable') ? 'objetivo-no-es-variable' : 'error-no-clasificado';
    case 'compiler.err.cant.resolve.location': {
      // "cannot find symbol\n  symbol:   KIND NAME\n  location: LOCATION" (Locale.ROOT, ver
      // CompiladorEnLote.java) -- MISMA heurística que `resultadoNombreDeTipo`/`atribucion.ts`
      // usan en producción: Scanner/Random (java.util) piden import, cualquier otra clase no
      // reconocida es "tipo-no-reconocido"; un "variable" cuya LOCATION es otra variable (acceso
      // de miembro) es un campo no declarado, si no, un nombre suelto no declarado. Tarea 1.21:
      // "location: package X" es un IMPORT roto (nombreDeClaseImportadaEsValido, atribucion.ts),
      // nunca "tipo-no-reconocido" (ese es sobre un nombre de tipo USADO, no sobre un import).
      const coincidencia = /symbol:\s+(\w+)\s+(\S+)[\s\S]*location:\s+(.+)/.exec(mensajeJavac);
      if (coincidencia === null) return 'error-no-clasificado';
      const [, genero, nombre, ubicacion] = coincidencia as unknown as [string, string, string, string];
      if (genero === 'class') {
        if (ubicacion.startsWith('package ')) return 'importacion-no-reconocida';
        return nombre === 'Scanner' || nombre === 'Random' ? 'tipo-requiere-import' : 'tipo-no-reconocido';
      }
      if (genero === 'variable') return ubicacion.startsWith('variable ') ? 'campo-no-declarado' : 'variable-no-declarada';
      if (genero === 'method') return ubicacion.startsWith('variable ') ? 'miembro-no-declarado' : 'metodo-no-declarado';
      return 'error-no-clasificado';
    }
    case 'compiler.err.cant.resolve.location.args': {
      const coincidencia = /location:\s+(.+)/.exec(mensajeJavac);
      const ubicacion = coincidencia?.[1] ?? '';
      return ubicacion.startsWith('variable ') ? 'miembro-no-declarado' : 'metodo-no-declarado';
    }
    case 'compiler.err.cant.apply.symbols':
    case 'compiler.err.cant.apply.symbol':
      return 'sin-sobrecarga-aplicable';
    case 'compiler.err.prob.found.req':
      if (mensajeJavac.includes('possible lossy conversion')) return 'conversion-con-perdida';
      if (mensajeJavac.includes('to boolean')) return 'condicion-no-booleana';
      return 'tipos-incompatibles-en-asignacion';
    case 'compiler.err.operator.cant.be.applied':
      return 'operandos-invalidos-operador-binario';
    // Tarea 1.21 (sub-lote 1-D4): ".1" es la variante de UN SOLO operando (JLS, unario/incremento)
    // -- código DISTINTO del binario de arriba, desde que existe la verificación real (antes de
    // esta tarea, "!"/"+"/"-"/"++"/"--" nunca se comprobaban, así que esta clave nunca aparecía
    // mapeada a nuestro lado).
    case 'compiler.err.operator.cant.be.applied.1':
      return 'operando-invalido-operador-unario';
    default:
      return null;
  }
}

/**
 * Tarea 1.35 (SUGGESTION de la re-verificación del lote 1 y riesgo (1) de la 1.34: el código quedó a UN mutante del umbral): la tabla de claves de javac de arriba da UN solo código
 * esperado por clave, y para varias claves es el genérico `error-no-clasificado` —`not.stmt`, `expected3`, `doesnt.exist`…— porque nació antes de que el motor distinguiera esos casos.
 * Desde la 1.29/1.33/1.34 el motor da, en la MISMA línea que javac, un código más preciso. Esta tabla lista, MUTANTE POR MUTANTE, los que se auditaron a mano (el texto que vería el alumno
 * contra la línea mutada y el mensaje de javac) y en los que ese código describe el error REAL. Un mutante solo cuenta como acierto de más si su código nuestro es EXACTAMENTE el de esta
 * tabla (una prueba lo comprueba: no se cuela ningún otro código, y la entrada no puede quedar muerta).
 *
 * AUDITADOS Y ACEPTADOS (51 de los 312 mutantes cuyo código difiere del de la tabla de javac), con su evidencia en cada grupo de abajo.
 * AUDITADOS Y RECHAZADOS (el código nuestro NO se acepta; son defectos de texto, no del veredicto, y quedan como están):
 *  - `expected3` «',', ')', or '[' expected» → `falta-parentesis-cierre` (40): sirve cuando de verdad falta el `)` (`main(String[] args {`, 17 casos) pero engaña cuando el error es otro
 *    (`main(String[] args args)`, `main(String String[] args)`, `main(String[] args;)`: 23 casos, y ninguno se arregla poniendo un `)`).
 *  - `expected` «'{' expected» → `llave-de-clase-faltante` (39): acierta si la `{` falta o se movió (`public class X` sin llave), engaña si el error es un nombre repetido o un `)` suelto.
 *  - `expected` «';' expected» → `llave-de-metodo-faltante` (30): acierta con la `{` borrada o movida, engaña con un `)` repetido (`main(String[] args) ) {`: 5 casos, la `{` está ahí).
 *  - `missing.meth.body.or.decl.abstract` → `llave-de-metodo-faltante` (4): `main(String[] args); {`: el error es el `;` de más y el texto manda a buscar una `{` que existe.
 *  - `not.stmt` → `falta-punto-y-coma` (3): un `)` de más cierra la llamada antes de tiempo (`println("a") + b);`) y el texto manda a poner un `;` que no lo arregla.
 *  - `not.stmt` → `palabra-reservada-como-nombre` en `seEncontroNegativo  true;` (1): falta el `=`; el texto habla de `true` como nombre y no de lo que falta.
 *  - `illegal.start.of.expr` → `fin-de-archivo-inesperado` (17): ni siquiera la línea coincide (javac señala la cabecera; nosotros el final del archivo).
 *  - `illegal.start.of.stmt` → `else-sin-if` (2): `else }`: el `else` sí tiene su `if`; lo que sobra es la `}`.
 *  - el resto (`variable-no-declarada` ↔ `campo-no-declarado`, operador unario ↔ binario…) son diferencias de la heurística de la tabla de javac, ajenas a esta auditoría.
 *
 * Tarea 1.36 (S-8 de la verificación final del lote 1: «la tabla va indexada por id de mutante; más estable por clave de javac → códigos aceptables»): SE QUEDA indexada por mutante, a propósito.
 *  - La auditoría es POR MUTANTE y una clave de javac no la puede reproducir: el par (`not.stmt`, `palabra-reservada-como-nombre`) tiene 31 mutantes aceptados y 1 rechazado por engañoso
 *    (`seEncontroNegativo  true;`: falta el `=` y el texto habla de `true`); una tabla por clave los aceptaría a los 32 (52 en vez de 51) y dejaría de ser lo que se auditó uno por uno. Lo que
 *    distingue al rechazado es la FORMA de la mutación, no ningún dato de javac.
 *  - El id (`archivo.java#N`) solo cambia si se regenera `corpus/mutantes/` (`npm run oraculo:mutantes`, semilla fija: sin tocar el mutador ni la semilla sale idéntico) y entonces cambian los PROGRAMAS
 *    mutados junto con la métrica entera —la de veredicto, la de línea y la de código—, que hay que volver a medir y auditar de todas formas; una clave por contenido tampoco sobreviviría a una semilla distinta.
 *  - Una entrada que deja de coincidir no pasa en silencio: la prueba de abajo exige que cada una exista, que javac la rechace, que su código y su línea sean los de la tabla y que la tabla de javac
 *    esperara otro (con el aviso de cómo reauditarla).
 */
const CODIGOS_MAS_PRECISOS_QUE_EL_DE_JAVAC: ReadonlyMap<string, string> = new Map<string, string>([
  // not.stmt → sentencia-entre-parentesis: 10 mutantes: `(cond) {` con el `if`/`while`/`switch` olvidado, de `else if` o metido dentro del paréntesis. javac: «not a statement» sobre el paréntesis; el texto de `sentencia-entre-parentesis` dice justo eso y su segunda frase nombra la palabra que falta.
  ['u5-escalera-else-if-correcta.java#66', 'sentencia-entre-parentesis'],
  ['u5-par-o-impar.java#45', 'sentencia-entre-parentesis'],
  ['u5-switch-menu-calculadora.java#67', 'sentencia-entre-parentesis'],
  ['u5-switch-sin-break-fallthrough.java#2', 'sentencia-entre-parentesis'],
  ['u6-bandera-numero-negativo.java#49', 'sentencia-entre-parentesis'],
  ['u6-bandera-numero-negativo.java#51', 'sentencia-entre-parentesis'],
  ['u6-ciclo-infinito-demo.java#36', 'sentencia-entre-parentesis'],
  ['u6-ciclo-infinito-demo.java#73', 'sentencia-entre-parentesis'],
  ['u6-prediccion-while-no-ejecuta.java#28', 'sentencia-entre-parentesis'],
  ['u7-proyecto-cajero-automatico.java#24', 'sentencia-entre-parentesis'],
  // not.stmt → palabra-reservada-como-nombre: 31 mutantes: un tipo o `final` repetido (`int int x`) o en el lugar del nombre (`base double = 5.0`, `double final IVA`). javac: «not a statement» sobre la primera palabra; el texto dice que la palabra reservada de esa posición no puede ser el nombre: es lo que la gramática ve.
  ['u3-area-rectangulo-con-scanner.java#1', 'palabra-reservada-como-nombre'],
  ['u3-area-rectangulo-con-scanner.java#7', 'palabra-reservada-como-nombre'],
  ['u3-area-rectangulo-valores-fijos.java#29', 'palabra-reservada-como-nombre'],
  ['u3-area-rectangulo-valores-fijos.java#52', 'palabra-reservada-como-nombre'],
  ['u3-area-rectangulo-valores-fijos.java#56', 'palabra-reservada-como-nombre'],
  ['u3-cuadrado-de-un-numero.java#42', 'palabra-reservada-como-nombre'],
  ['u3-tipos-basicos-y-constantes.java#5', 'palabra-reservada-como-nombre'],
  ['u4-calculadora-vueltos.java#67', 'palabra-reservada-como-nombre'],
  ['u4-casting-basico.java#4', 'palabra-reservada-como-nombre'],
  ['u4-casting-basico.java#26', 'palabra-reservada-como-nombre'],
  ['u4-casting-basico.java#32', 'palabra-reservada-como-nombre'],
  ['u4-division-entera-y-modulo.java#31', 'palabra-reservada-como-nombre'],
  ['u4-division-entera-y-modulo.java#40', 'palabra-reservada-como-nombre'],
  ['u4-division-entera-y-modulo.java#68', 'palabra-reservada-como-nombre'],
  ['u4-operador-logico-and.java#4', 'palabra-reservada-como-nombre'],
  ['u4-operador-logico-and.java#73', 'palabra-reservada-como-nombre'],
  ['u4-precedencia-de-operadores.java#28', 'palabra-reservada-como-nombre'],
  ['u4-prediccion-or-logico.java#6', 'palabra-reservada-como-nombre'],
  ['u4-prediccion-or-logico.java#54', 'palabra-reservada-como-nombre'],
  ['u4-prediccion-precedencia.java#36', 'palabra-reservada-como-nombre'],
  ['u4-verificar-acceso.java#73', 'palabra-reservada-como-nombre'],
  ['u5-escalera-else-if-orden-incorrecto.java#42', 'palabra-reservada-como-nombre'],
  ['u5-if-else-verificar-voto.java#1', 'palabra-reservada-como-nombre'],
  ['u5-switch-menu-calculadora.java#24', 'palabra-reservada-como-nombre'],
  ['u6-acumulador-promedio-calificaciones.java#42', 'palabra-reservada-como-nombre'],
  ['u6-acumulador-promedio-calificaciones.java#50', 'palabra-reservada-como-nombre'],
  ['u6-acumulador-promedio-calificaciones.java#55', 'palabra-reservada-como-nombre'],
  ['u6-contador-de-pares.java#22', 'palabra-reservada-como-nombre'],
  ['u6-contador-de-pares.java#40', 'palabra-reservada-como-nombre'],
  ['u6-prediccion-while-no-ejecuta.java#47', 'palabra-reservada-como-nombre'],
  ['u6-tabla-de-multiplicar.java#28', 'palabra-reservada-como-nombre'],
  // expected3 → sentencia-antes-del-primer-case: 1 mutante: una `{` justo tras la `{` del `switch` («case, default, or '}' expected»); el texto dice que lo primero tras la llave es un `case`.
  ['u5-switch-sin-break-fallthrough.java#63', 'sentencia-antes-del-primer-case'],
  // doesnt.exist → importacion-no-reconocida: 7 mutantes: `import util.util.Scanner;` y `import javautil.Scanner;` («package … does not exist» en la línea del `import`); el texto dice que no reconoce el nombre y pide revisarlo.
  ['u4-calculadora-vueltos.java#62', 'importacion-no-reconocida'],
  ['u4-verificar-acceso.java#31', 'importacion-no-reconocida'],
  ['u5-par-o-impar.java#28', 'importacion-no-reconocida'],
  ['u5-switch-menu-calculadora.java#8', 'importacion-no-reconocida'],
  ['u6-pedir-numero-positivo.java#29', 'importacion-no-reconocida'],
  ['u6-suma-1-a-n.java#27', 'importacion-no-reconocida'],
  ['u7-proyecto-cajero-automatico.java#61', 'importacion-no-reconocida'],
  // unreachable.stmt → sentencia-inalcanzable: 1 mutante: un `;` suelto tras `break;`; javac «unreachable statement», el texto «Esta línea nunca se ejecuta».
  ['u7-proyecto-cajero-automatico.java#33', 'sentencia-inalcanzable'],
  // preview.feature.disabled.plural → selector-de-switch-invalido: 1 mutante: `switch` sobre un `long` (javac 17 contesta con la queja de los patrones en vista previa); el texto dice que el selector debe ser `int`, `char` o `String`, no `long`.
  ['u5-switch-menu-calculadora.java#59', 'selector-de-switch-invalido'],
]);

describe('mutantes contra veredictos de javac (tarea 1.16, REQ-DIFF-006, criterio C7)', () => {
  const veredictos = leerVeredictos();

  it('el corpus de mutantes tiene AL MENOS 2000 casos (criterio C7)', () => {
    expect(veredictos.length).toBeGreaterThanOrEqual(2000);
  });

  it('VEREDICTO: nuestro compilar() coincide con javac -- C7 pide 100%, CUMPLIDO desde el sub-lote 1-D5 (umbral fijado en el mínimo EXACTO de C7, nunca por debajo)', () => {
    const discrepancias = veredictos.filter((v) => nuestroVeredicto(v.fuente).compila !== v.compila);
    const proporcion = (veredictos.length - discrepancias.length) / veredictos.length;
    // eslint-disable-next-line no-console -- resumen intencional, útil para la próxima continuación (nunca un log completo, solo el conteo)
    console.log(`[mutantes] veredicto: ${veredictos.length - discrepancias.length}/${veredictos.length} = ${(proporcion * 100).toFixed(2)}%`);
    expect(proporcion).toBeGreaterThanOrEqual(1);
  });

  it('LINEA: entre los mutantes que javac SÍ rechaza, nuestra línea coincide -- C7 pide ≥95%, CUMPLIDO desde el sub-lote 1-D4 (umbral fijado en el MÍNIMO real de C7 -- el margen medido real, 98.84% desde 1-D5, queda documentado en la cabecera, nunca en el umbral)', () => {
    const rechazados = veredictos.filter((v) => !v.compila);
    let aciertos = 0;
    for (const v of rechazados) {
      const nuestro = nuestroVeredicto(v.fuente);
      if (nuestro.compila === false && nuestro.linea === v.linea) aciertos++;
    }
    const proporcion = aciertos / rechazados.length;
    // eslint-disable-next-line no-console -- ver nota de arriba
    console.log(`[mutantes] línea: ${aciertos}/${rechazados.length} = ${(proporcion * 100).toFixed(2)}%`);
    expect(proporcion).toBeGreaterThanOrEqual(0.95);
  });

  it('CODIGO: entre los mutantes mapeados, nuestro código coincide con el esperado -- métrica secundaria (C7 no le fija umbral), umbral real medido esta sesión (sub-lote 1-D5), nunca inflado', () => {
    const rechazados = veredictos.filter((v) => !v.compila);
    let mapeados = 0;
    let aciertos = 0;
    for (const v of rechazados) {
      const esperado = codigoEsperadoDeJavac(v.codigoJavac, v.mensajeJavac);
      if (esperado === null) continue;
      mapeados++;
      const nuestro = nuestroVeredicto(v.fuente);
      // Tarea 1.35: acierta con el código de la tabla de javac O con el código más preciso auditado mutante por mutante (`CODIGOS_MAS_PRECISOS_QUE_EL_DE_JAVAC`).
      if (nuestro.compila === false && (nuestro.codigo === esperado || CODIGOS_MAS_PRECISOS_QUE_EL_DE_JAVAC.get(v.id) === nuestro.codigo)) aciertos++;
    }
    const proporcion = aciertos / mapeados;
    // eslint-disable-next-line no-console -- ver nota de arriba
    console.log(`[mutantes] código: ${aciertos}/${mapeados} (de ${rechazados.length} rechazados, ${mapeados} mapeados) = ${(proporcion * 100).toFixed(2)}%`);
    expect(proporcion).toBeGreaterThanOrEqual(0.88);
  });

  // Tarea 1.35: la tabla de códigos más precisos no puede esconder nada. Cada entrada es un mutante real que javac rechaza, cuyo código nuestro es EXACTAMENTE el de la tabla, en la MISMA
  // línea que javac, y al que la tabla de claves de javac le daba OTRO código (si no, la entrada sobra). Los totales por código son la evidencia de la auditoría.
  it('CODIGOS MAS PRECISOS: cada mutante de la tabla existe, javac lo rechaza, nuestro código es exactamente el de la tabla y en la misma línea, y la tabla de javac esperaba otro', () => {
    const porId = new Map(veredictos.map((v) => [v.id, v]));
    const problemas: string[] = [];
    for (const [id, codigo] of CODIGOS_MAS_PRECISOS_QUE_EL_DE_JAVAC) {
      const v = porId.get(id);
      if (v === undefined) {
        problemas.push(`${id}: no está en el corpus (¿se regeneró \`corpus/mutantes/\`? el id cambia con la semilla o el mutador: reaudita esta entrada contra el mutante nuevo antes de moverla)`);
        continue;
      }
      const nuestro = nuestroVeredicto(v.fuente);
      if (v.compila) problemas.push(`${id}: javac lo compila`);
      else if (nuestro.compila || nuestro.codigo !== codigo) problemas.push(`${id}: nuestro código es ${String(nuestro.codigo)} y la tabla dice ${codigo}`);
      else if (nuestro.linea !== v.linea) problemas.push(`${id}: la línea es ${String(nuestro.linea)} y javac dice ${v.linea}`);
      if (codigoEsperadoDeJavac(v.codigoJavac, v.mensajeJavac) === codigo) problemas.push(`${id}: la tabla de javac ya esperaba ${codigo} (la entrada sobra)`);
    }
    expect(problemas).toEqual([]);
  });

  it('CODIGOS MAS PRECISOS: el total y el reparto por código son los auditados (51 mutantes: 31 + 10 + 7 + 1 + 1 + 1)', () => {
    const reparto = new Map<string, number>();
    for (const codigo of CODIGOS_MAS_PRECISOS_QUE_EL_DE_JAVAC.values()) reparto.set(codigo, (reparto.get(codigo) ?? 0) + 1);
    expect(CODIGOS_MAS_PRECISOS_QUE_EL_DE_JAVAC.size).toBe(51);
    expect(Object.fromEntries(reparto)).toEqual({
      'sentencia-entre-parentesis': 10,
      'palabra-reservada-como-nombre': 31,
      'sentencia-antes-del-primer-case': 1,
      'importacion-no-reconocida': 7,
      'sentencia-inalcanzable': 1,
      'selector-de-switch-invalido': 1,
    });
  });

  it('triangulación: al menos un mutante de CADA uno de los 9 tipos de mutación aparece en el corpus (cobertura real de mutantes.ts)', () => {
    const tipos = new Set(veredictos.map((v) => v.mutacion));
    for (const tipo of [
      'borrar', 'duplicar', 'intercambiar-vecinos', 'cambiar-operador', 'cambiar-identificador',
      'cambiar-tipo', 'cambiar-literal', 'quitar-puntuacion', 'poner-puntuacion',
    ]) {
      expect(tipos.has(tipo), `falta cobertura del tipo de mutación "${tipo}"`).toBe(true);
    }
  });
});
