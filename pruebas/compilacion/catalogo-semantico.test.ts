// Tarea 1.14 (Orquestación de las 5 pasadas, ADR 004, REQ-COMP-005/006): barrido de extremo a
// extremo, a través de `compilar()`, contra el catálogo de 42 casos verificados de
// `openspec/changes/visualizador-java/exploracion/03-semantica-texto-entrada-errores.md` §4 -- los
// que caen en el subconjunto (fuera quedan err25/26/27 -- métodos propios con tipo de retorno,
// NO-DISP desde 1.6; err31 -- etiquetas, NO-DISP; err36 -- varias clases públicas, NO-DISP).
// Fuente y línea esperada vienen DIRECTO de `corpus/experimentos/texto/` (oráculo, tarea 0.6): el
// `.java` es la fuente real que compiló javac 17, la línea sale de su `.errores` real -- nunca
// copiada a mano sin verificar (regla 4 de CLAUDE.md). Mismo patrón que
// `pruebas/compilacion/catalogo.test.ts` (tarea 1.17) para el mismo problema de capas: `node:fs`
// no type-chequea dentro de `src/motor/**` (tsconfig.motor.json, ADR 001), así que este barrido
// vive aquí, fuera del motor, e importa `compilar` desde el ÍNDICE público (`src/motor/index.ts`).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar, type CodigoProblema } from '../../src/motor/index.ts';

const RUTA_EXPERIMENTOS_TEXTO = resolve('corpus/experimentos/texto');

function fuenteDe(archivo: string): string {
  return readFileSync(resolve(RUTA_EXPERIMENTOS_TEXTO, `${archivo}.java`), 'utf-8');
}

describe('compilar — catálogo de exploracion/03 §4: veredicto, código y línea contra javac 17 real (tarea 1.14)', () => {
  const casos: ReadonlyArray<{ readonly archivo: string; readonly codigo: CodigoProblema; readonly linea: number }> = [
    { archivo: 'err02_simbolo_no_encontrado_variable', codigo: 'variable-no-declarada', linea: 3 },
    { archivo: 'err03_simbolo_no_encontrado_metodo', codigo: 'metodo-no-declarado', linea: 3 },
    { archivo: 'err04_lossy_conversion_double_a_int', codigo: 'conversion-con-perdida', linea: 4 },
    { archivo: 'err05_variable_no_inicializada_simple', codigo: 'variable-posiblemente-no-asignada', linea: 4 },
    { archivo: 'err06_variable_no_inicializada_if_sin_else', codigo: 'variable-posiblemente-no-asignada', linea: 8 },
    { archivo: 'err09_definite_assignment_while_cond_break_falla', codigo: 'variable-posiblemente-no-asignada', linea: 9 },
    { archivo: 'err10_definite_assignment_for_falla', codigo: 'variable-posiblemente-no-asignada', linea: 7 },
    { archivo: 'err10c_final_reasignada', codigo: 'variable-final-reasignada', linea: 5 },
    { archivo: 'err11_unreachable_statement', codigo: 'sentencia-inalcanzable', linea: 5 },
    { archivo: 'err12_tipo_string_en_declaracion', codigo: 'tipos-incompatibles-en-asignacion', linea: 3 },
    { archivo: 'err13_asignacion_en_condicion_if', codigo: 'condicion-no-booleana', linea: 4 },
    { archivo: 'err18_string_minuscula', codigo: 'tipo-no-reconocido', linea: 3 },
    { archivo: 'err20_scanner_sin_import', codigo: 'tipo-requiere-import', linea: 3 },
    { archivo: 'err24_tipos_incompatibles_boolean_int', codigo: 'tipos-incompatibles-en-asignacion', linea: 3 },
    { archivo: 'err28_comparacion_tipos_incomparables', codigo: 'tipos-incomparables', linea: 5 },
    { archivo: 'err29_break_fuera_de_ciclo', codigo: 'break-fuera-de-contexto', linea: 5 },
    { archivo: 'err30_continue_fuera_de_ciclo', codigo: 'continue-fuera-de-contexto', linea: 5 },
    { archivo: 'err33_condicion_if_no_booleana', codigo: 'condicion-no-booleana', linea: 4 },
    { archivo: 'err34_case_no_constante', codigo: 'etiqueta-de-case-no-constante', linea: 6 },
    { archivo: 'err35_operador_incompatible_string_int', codigo: 'operandos-invalidos-operador-binario', linea: 5 },
    { archivo: 'flow05_switch_casos_duplicados', codigo: 'etiqueta-de-case-duplicada', linea: 8 },
    { archivo: 'flow13_variable_ya_definida', codigo: 'variable-ya-definida', linea: 5 },
    { archivo: 'flow14_variable_for_fuera_alcance', codigo: 'variable-no-declarada', linea: 6 },
    { archivo: 'flow15_variable_bloque_fuera_alcance', codigo: 'variable-no-declarada', linea: 6 },
    { archivo: 'flow18_shadowing_bloque_anidado_error', codigo: 'variable-ya-definida', linea: 5 },
    { archivo: 'flow19_shadowing_for_error', codigo: 'variable-ya-definida', linea: 4 },
  ];

  it('el catálogo no está vacío (guarda contra una lista mal armada)', () => {
    expect(casos.length).toBeGreaterThanOrEqual(26);
  });

  it.each(casos)('$archivo: mismo veredicto, código y línea que el .errores real de javac', ({ archivo, codigo, linea }) => {
    const resultado = compilar(fuenteDe(archivo));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.categoria).toBe('error-compilacion');
    expect(resultado.problema.codigo).toBe(codigo);
    expect(resultado.problema.linea).toBe(linea);
  });

  // err19 (`system.out...`): javac rechaza con "package system does not exist" -- resolución de
  // paquetes/classpath, AJENA a este subconjunto (nunca modelada, D2). Este visualizador SÍ
  // rechaza con el MISMO veredicto y la MISMA línea, pero con el código genérico
  // "variable-no-declarada" (mismo mecanismo que err02: "system" en minúscula no es ninguna
  // variable declarada) -- y SÍ ofrece la sugerencia real de mayúscula (verificaciones-de-tipo.ts,
  // sugerenciaDeMayuscula, ya wireada desde 1.7).
  it('err19_system_minuscula: mismo veredicto y línea; código genérico (paquetes fuera del subconjunto) con sugerencia real de mayúscula', () => {
    const resultado = compilar(fuenteDe('err19_system_minuscula'));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.codigo).toBe('variable-no-declarada');
    expect(resultado.problema.linea).toBe(3);
    expect(resultado.problema.datos).toEqual({ nombre: 'system', sugerencia: 'System' });
  });

  // Controles positivos: javac SÍ compila estos 4 limpio (sus .errores reales están vacíos). Las
  // pasadas 2-4 no deben rechazarlos -- pero el lote 1 todavía no genera IR real para
  // if/while/do-while ni para "println" de un valor que no sea un literal-cadena (llega en el
  // lote 2, ver src/motor/ir/generar-ir.ts) -- por eso HOY compilar() da ok:false con el catch-all
  // genérico "error-no-clasificado" (nunca un código semántico real) para los 4: prueba de que
  // atribución/alcanzabilidad/asignación definitiva NO los rechazan por error, no de que ya se
  // ejecuten de verdad.
  it.each([
    'err07_definite_assignment_if_else_ok',
    'err08_definite_assignment_while_true_break_ok',
    'err10b_definite_assignment_dowhile_ok',
    'flow17_shadowing_bloque_anidado',
  ])('%s: javac SÍ compila (control positivo) — las pasadas 2-4 no lo rechazan (solo falta la IR del lote 2)', (archivo) => {
    const resultado = compilar(fuenteDe(archivo));
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false (falta la IR del lote 2, no un rechazo semántico)');
    expect(resultado.problema.codigo).toBe('error-no-clasificado');
  });
});
