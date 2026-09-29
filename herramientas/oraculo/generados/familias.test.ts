// RED de la tarea 1.31: la agrupación de las discrepancias (ya reducidas) en FAMILIAS. Una familia es
// un tipo de discrepancia + la clave de error de javac + lo que respondió nuestro compilador + las
// construcciones que quedaron en el programa mínimo: es la unidad de trabajo de quien corrige el
// compilador (la tarea 1.32), no cada programa suelto. Puro: se prueba con discrepancias construidas a
// mano. Además: qué familias son las CONOCIDAS de la re-verificación del lote 1 (F1–F6 y V).
import { describe, expect, it } from 'vitest';
import type { VeredictoJavac, VeredictoNuestro } from './clasificador.ts';
import { agruparEnFamilias, identificarFamiliaConocida, type DiscrepanciaReducida } from './familias.ts';
import { declaracion, literal, nombre, plantilla, seleccion, sentenciaExpr, type Etiqueta, type Programa } from './programa.ts';

const JAVAC_COMPILA: VeredictoJavac = { compila: true, linea: -1, codigoJavac: '', mensajeJavac: '' };
const javacRechaza = (codigoJavac: string, mensajeJavac: string, linea = 3): VeredictoJavac => ({ compila: false, linea, codigoJavac, mensajeJavac });
const ACEPTA_SIN_EJECUTAR: VeredictoNuestro = { tipo: 'ejecucion-no-disponible', linea: 3 };

const programaConCast = (texto: string): Programa => ({
  imports: [],
  sentencias: [
    declaracion({
      tipo: 'int',
      nombre: 'x',
      inicial: plantilla(['(int) ', ''], [literal(texto, 'String')], 'int', { etiquetas: ['cast'] }),
    }),
  ],
});

function discrepancia(indice: number, javac: VeredictoJavac, programa: Programa, nuestro: VeredictoNuestro = ACEPTA_SIN_EJECUTAR, tipo: DiscrepanciaReducida['tipo'] = 'falso-acepto'): DiscrepanciaReducida {
  return { indice, tipo, javac, nuestro, programa, fase: 'semantica' };
}

describe('agruparEnFamilias', () => {
  const cast = javacRechaza('compiler.err.prob.found.req', 'incompatible types: java.lang.String cannot be converted to int');

  it('junta las discrepancias con el mismo tipo, la misma clave de javac, la misma respuesta nuestra y las mismas construcciones', () => {
    const familias = agruparEnFamilias([
      discrepancia(4, cast, programaConCast('"5"')),
      discrepancia(9, cast, programaConCast('"123"')),
      discrepancia(2, cast, programaConCast('""')),
    ]);
    expect(familias).toHaveLength(1);
    expect(familias[0]).toMatchObject({
      tipo: 'falso-acepto',
      codigoJavac: 'compiler.err.prob.found.req',
      nuestraClave: 'ejecucion-no-disponible',
      etiquetas: ['cast'],
      cantidad: 3,
    });
  });

  it('separa por las construcciones del programa mínimo: el mismo error de javac con un cast y con un switch son familias distintas', () => {
    const conSwitch: Programa = { imports: [], sentencias: [seleccion({ selector: nombre('a', 'int'), casos: [{ etiquetas: [literal('"x"', 'String')], cuerpo: [] }], flecha: false })] };
    const familias = agruparEnFamilias([discrepancia(1, cast, programaConCast('"5"')), discrepancia(2, cast, conSwitch)]);
    expect(familias.map((f) => f.etiquetas)).toEqual(expect.arrayContaining([['cast'], ['switch']]));
    expect(familias).toHaveLength(2);
  });

  it('el println que envuelve la expresión es contexto, no la regla: no separa familias', () => {
    const cast = plantilla(['(int) ', ''], [literal('"5"', 'String')], 'int', { etiquetas: ['cast'] });
    const conPrintln: Programa = { imports: [], sentencias: [sentenciaExpr(plantilla(['System.out.println(', ')'], [cast], 'void', { etiquetas: ['impresion'] }))] };
    const familias = agruparEnFamilias([
      discrepancia(1, javacRechaza('compiler.err.prob.found.req', 'incompatible types'), programaConCast('"5"')),
      discrepancia(2, javacRechaza('compiler.err.prob.found.req', 'incompatible types'), conPrintln),
    ]);
    expect(familias).toHaveLength(1);
    expect(familias[0]!.etiquetas).toEqual(['cast']);
  });

  it('un nombre que es palabra clave contextual no separa a los falsos aceptos (es incidental), pero es LA regla de un falso rechazo', () => {
    const conNombre = (nombreDeLaVariable: string): Programa => ({
      imports: [],
      sentencias: [declaracion({ tipo: 'int', nombre: nombreDeLaVariable, etiquetas: ['nombre-contextual'], inicial: plantilla(['(int) ', ''], [literal('""', 'String')], 'int', { etiquetas: ['cast'] }) })],
    });
    const aceptos = agruparEnFamilias([
      discrepancia(1, javacRechaza('compiler.err.prob.found.req', 'incompatible types'), conNombre('sealed')),
      discrepancia(2, javacRechaza('compiler.err.prob.found.req', 'incompatible types'), programaConCast('""')),
    ]);
    expect(aceptos).toHaveLength(1);
    const rechazo = agruparEnFamilias([discrepancia(3, JAVAC_COMPILA, conNombre('var'), { tipo: 'error-compilacion', codigo: 'error-no-clasificado', linea: 3 }, 'falso-rechazo')]);
    expect(rechazo[0]!.etiquetas).toContain('nombre-contextual');
  });

  it('separa por lo que respondió nuestro compilador y por el tipo de discrepancia', () => {
    const familias = agruparEnFamilias([
      discrepancia(1, cast, programaConCast('"5"'), ACEPTA_SIN_EJECUTAR),
      discrepancia(2, cast, programaConCast('"5"'), { tipo: 'ok' }),
      discrepancia(3, JAVAC_COMPILA, programaConCast('"5"'), { tipo: 'error-compilacion', codigo: 'error-no-clasificado', linea: 3 }, 'falso-rechazo'),
    ]);
    expect(familias).toHaveLength(3);
  });

  it('el programa de ejemplo es el más corto, con su mensaje de javac; los ejemplos reproducibles son los índices más bajos', () => {
    const familias = agruparEnFamilias([
      discrepancia(40, cast, programaConCast('"un texto largo"')),
      discrepancia(7, cast, programaConCast('"5"')),
      discrepancia(22, cast, programaConCast('""')),
    ]);
    expect(familias[0]!.minimo.fuente).toContain('(int) ""');
    expect(familias[0]!.mensajeJavac).toBe('incompatible types: java.lang.String cannot be converted to int');
    expect(familias[0]!.indicesDeEjemplo).toEqual([7, 22, 40]);
  });

  it('lista los programas mínimos distintos de la familia con cuántas veces salió cada uno', () => {
    const familias = agruparEnFamilias([
      discrepancia(1, cast, programaConCast('"5"')),
      discrepancia(2, cast, programaConCast('"5"')),
      discrepancia(3, cast, programaConCast('""')),
    ]);
    expect(familias[0]!.variantes.map((v) => v.veces)).toEqual([2, 1]);
    expect(familias[0]!.variantes.map((v) => v.cuerpo)).toEqual([['int x = (int) "5";'], ['int x = (int) "";']]);
  });

  it('ordena las familias de la más frecuente a la menos, y es determinista (mismas entradas, mismo orden)', () => {
    const rara = discrepancia(5, javacRechaza('compiler.err.cant.deref', 'int cannot be dereferenced'), { imports: [], sentencias: [sentenciaExpr(plantilla(['x.length()'], [], 'int', { etiquetas: ['miembro-de-primitivo'] }))] });
    const entradas = [rara, discrepancia(1, cast, programaConCast('"5"')), discrepancia(2, cast, programaConCast('"5"'))];
    const familias = agruparEnFamilias(entradas);
    expect(familias.map((f) => f.cantidad)).toEqual([2, 1]);
    expect(agruparEnFamilias([...entradas].reverse()).map((f) => f.clave)).toEqual(familias.map((f) => f.clave));
  });

  it('la fase de javac (sintaxis o semántica) viaja con la familia', () => {
    const familias = agruparEnFamilias([{ ...discrepancia(1, cast, programaConCast('"5"')), fase: 'sintaxis' }]);
    expect(familias[0]!.fase).toBe('sintaxis');
  });
});

describe('identificarFamiliaConocida — las siete de la re-verificación del lote 1', () => {
  const familiaDe = (javac: VeredictoJavac, programa: Programa, nuestro: VeredictoNuestro = ACEPTA_SIN_EJECUTAR, tipo: DiscrepanciaReducida['tipo'] = 'falso-acepto') =>
    agruparEnFamilias([discrepancia(1, javac, programa, nuestro, tipo)])[0]!;
  const conEtiqueta = (etiqueta: Etiqueta): Programa => ({
    imports: [],
    sentencias: [sentenciaExpr(plantilla(['x'], [], 'int', { etiquetas: [etiqueta] }))],
  });

  it('F1 cast inválido', () => {
    expect(identificarFamiliaConocida(familiaDe(javacRechaza('compiler.err.prob.found.req', 'incompatible types'), programaConCast('"5"')))?.id).toBe('F1');
  });

  it('F2 miembro de un primitivo', () => {
    expect(identificarFamiliaConocida(familiaDe(javacRechaza('compiler.err.cant.deref', 'int cannot be dereferenced'), conEtiqueta('miembro-de-primitivo')))?.id).toBe('F2');
  });

  it('F3 final con ++/--/asignación', () => {
    const javac = javacRechaza('compiler.err.cant.assign.val.to.final.var', 'cannot assign a value to final variable x');
    expect(identificarFamiliaConocida(familiaDe(javac, conEtiqueta('incremento')))?.id).toBe('F3');
  });

  it('F4 switch con etiqueta de otro tipo y con default repetido', () => {
    const conSwitch: Programa = { imports: [], sentencias: [seleccion({ selector: nombre('a', 'int'), casos: [], flecha: false })] };
    expect(identificarFamiliaConocida(familiaDe(javacRechaza('compiler.err.prob.found.req', 'incompatible types'), conSwitch))?.id).toBe('F4');
    expect(identificarFamiliaConocida(familiaDe(javacRechaza('compiler.err.duplicate.default.label', 'duplicate default label'), conSwitch))?.id).toBe('F4');
  });

  it('F5 void como valor', () => {
    expect(identificarFamiliaConocida(familiaDe(javacRechaza('compiler.err.void.not.allowed.here', "'void' type not allowed here"), conEtiqueta('void-como-valor')))?.id).toBe('F5');
    expect(identificarFamiliaConocida(familiaDe(javacRechaza('compiler.err.prob.found.req', 'incompatible types: void cannot be converted to int'), conEtiqueta('void-como-valor')))?.id).toBe('F5');
  });

  it('F6 método de instancia desde el nombre de la clase', () => {
    const javac = javacRechaza('compiler.err.non-static.cant.be.ref', 'non-static method length() cannot be referenced from a static context');
    expect(identificarFamiliaConocida(familiaDe(javac, conEtiqueta('metodo-de-instancia-por-clase')))?.id).toBe('F6');
  });

  it('V var y yield como nombres de variable: es un FALSO RECHAZO de un programa que javac compila', () => {
    const programa: Programa = { imports: [], sentencias: [declaracion({ tipo: 'int', nombre: 'var', inicial: literal('5', 'int'), etiquetas: ['nombre-contextual'] })] };
    const rechazo: VeredictoNuestro = { tipo: 'error-compilacion', codigo: 'error-no-clasificado', linea: 3 };
    expect(identificarFamiliaConocida(familiaDe(JAVAC_COMPILA, programa, rechazo, 'falso-rechazo'))?.id).toBe('V');
  });

  it('una discrepancia que no es ninguna de las siete es una familia NUEVA (null)', () => {
    const javac = javacRechaza('compiler.err.underscore.as.identifier', "as of release 9, '_' is a keyword");
    const programa: Programa = { imports: [], sentencias: [declaracion({ tipo: 'int', nombre: '_', inicial: literal('1', 'int'), etiquetas: ['palabra-reservada-como-nombre'], sintaxisInvalida: true })] };
    expect(identificarFamiliaConocida(familiaDe(javac, programa))).toBeNull();
  });
});
