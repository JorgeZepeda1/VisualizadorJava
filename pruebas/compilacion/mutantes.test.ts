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
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import type { Problema } from '../../src/motor/index.ts';

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

/**
 * Tarea 1.16 (sub-lote 1-D2c, descubierto midiendo esta comparación): `generarIr` (lote 2, fuera
 * de alcance del lote 1) lanza a propósito para CUALQUIER sentencia que no sea "println" de un
 * literal (design.md, cabecera de `ir/generar-ir.ts`: "D2, nunca un resultado a medias") --
 * `compilar()` envuelve ESE throw exactamente igual que un error de compilación real
 * (`error-no-clasificado`). Para esta comparación (que solo evalúa las 4 pasadas de COMPILACIÓN,
 * nunca IR/ejecución -- fuera del alcance de la tarea 1.16), un programa que las 4 pasadas
 * aceptan pero que `generarIr` todavía no sabe bajar a IR SIGUE siendo "compila" desde el punto de
 * vista de javac -- nunca un error real. Detectado por el mensaje EXACTO que `generar-ir.ts` usa
 * (única fuente de ese texto, nunca inventado aquí).
 */
function esGapDeIrTodaviaNoImplementado(problema: Problema): boolean {
  return (
    problema.categoria === 'error-compilacion' &&
    problema.codigo === 'error-no-clasificado' &&
    typeof problema.datos['mensaje'] === 'string' &&
    (problema.datos['mensaje'] as string).includes('llega en el lote 2')
  );
}

function nuestroVeredicto(fuente: string): NuestroVeredicto {
  const resultado = compilar(fuente);
  if (resultado.ok) return { compila: true, linea: null, codigo: null };
  // NO-DISP (categoria 'no-disponible'): javac SÍ compila estas construcciones (existen, fuera de
  // REQ-SUB-005/007) -- "no lo mostramos" nunca es "no compila" (D2, misma distinción que ya hace
  // el resto del motor).
  if (resultado.problema.categoria === 'no-disponible') return { compila: true, linea: null, codigo: null };
  if (esGapDeIrTodaviaNoImplementado(resultado.problema)) return { compila: true, linea: null, codigo: null };
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
      if (nuestro.compila === false && nuestro.codigo === esperado) aciertos++;
    }
    const proporcion = aciertos / mapeados;
    // eslint-disable-next-line no-console -- ver nota de arriba
    console.log(`[mutantes] código: ${aciertos}/${mapeados} (de ${rechazados.length} rechazados, ${mapeados} mapeados) = ${(proporcion * 100).toFixed(2)}%`);
    expect(proporcion).toBeGreaterThanOrEqual(0.87);
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
