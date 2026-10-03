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

  it('una discrepancia que no es ninguna de las conocidas es una familia NUEVA (null)', () => {
    // Un `Integer x = 5L;` (tipo envoltorio) no es F1–F6, V ni de la 1.33: sigue siendo NUEVA.
    const javac = javacRechaza('compiler.err.prob.found.req', 'incompatible types: long cannot be converted to java.lang.Integer');
    const programa: Programa = { imports: [], sentencias: [declaracion({ tipo: 'Integer', nombre: 'x', inicial: literal('5L', 'long') })] };
    expect(identificarFamiliaConocida(familiaDe(javac, programa))).toBeNull();
  });
});

// Tarea 1.33: las familias que la 1.32 dejó abiertas (N2, N3, N4) y el residual de `printf` como valor dejan de salir como NUEVA
// y, sobre todo, como «sin rasgos»: cada una lleva el rasgo de construcción que la identifica.
describe('identificarFamiliaConocida — las de la tarea 1.33 (N2, N3, N4 y printf como valor)', () => {
  const familiaDe = (javac: VeredictoJavac, programa: Programa, nuestro: VeredictoNuestro = ACEPTA_SIN_EJECUTAR, tipo: DiscrepanciaReducida['tipo'] = 'falso-acepto') =>
    agruparEnFamilias([discrepancia(1, javac, programa, nuestro, tipo)])[0]!;
  const RECHAZO_DE_SINTAXIS: VeredictoNuestro = { tipo: 'error-compilacion', codigo: 'error-no-clasificado', linea: 3 };

  it('N2 una palabra reservada como nombre de variable (los 15 falsos aceptos: native, enum, goto, _…)', () => {
    const javac = javacRechaza('compiler.err.not.stmt', 'not a statement');
    const programa: Programa = { imports: [], sentencias: [declaracion({ tipo: 'int', nombre: 'native', inicial: null, etiquetas: ['palabra-reservada-como-nombre'], sintaxisInvalida: true })] };
    const familia = familiaDe(javac, programa);
    expect(familia.etiquetas).toEqual(['palabra-reservada-como-nombre']);
    expect(identificarFamiliaConocida(familia)?.id).toBe('N2');
  });

  it('N3 un guion bajo mal puesto en un literal: lleva el rasgo guion-bajo-en-literal y no sale «sin rasgos»', () => {
    const javac = javacRechaza('compiler.err.illegal.underscore', 'illegal underscore');
    const programa: Programa = {
      imports: [],
      sentencias: [declaracion({ tipo: 'long', nombre: 't', inicial: literal('1_L', 'long', { etiquetas: ['guion-bajo-en-literal'], sintaxisInvalida: true }) })],
    };
    const familia = familiaDe(javac, programa);
    expect(familia.etiquetas).toEqual(['guion-bajo-en-literal']);
    expect(familia.clave).not.toContain('sin-rasgos');
    expect(identificarFamiliaConocida(familia)?.id).toBe('N3');
  });

  it('N4 un flotante hexadecimal que javac compila y nosotros rechazamos', () => {
    const programa: Programa = {
      imports: [],
      sentencias: [declaracion({ tipo: 'double', nombre: 'a', inicial: literal('0x1p3', 'double', { etiquetas: ['flotante-hexadecimal'] }) })],
    };
    const familia = familiaDe(JAVAC_COMPILA, programa, { tipo: 'error-compilacion', codigo: 'falta-punto-y-coma', linea: 3 }, 'falso-rechazo');
    expect(familia.etiquetas).toEqual(['flotante-hexadecimal']);
    expect(identificarFamiliaConocida(familia)?.id).toBe('N4');
  });

  it('N4 un `case s ->` con una variable constante que javac compila y nosotros rechazamos: lleva switch y switch-flecha', () => {
    const conFlecha: Programa = {
      imports: [],
      sentencias: [seleccion({ selector: nombre('s', 'int'), casos: [{ etiquetas: [nombre('k', 'int', { etiquetas: ['etiqueta-de-variable'] })], cuerpo: [] }], flecha: true })],
    };
    const familia = familiaDe(JAVAC_COMPILA, conFlecha, RECHAZO_DE_SINTAXIS, 'falso-rechazo');
    expect(familia.etiquetas).toEqual(['etiqueta-de-variable', 'switch', 'switch-flecha']);
    expect(identificarFamiliaConocida(familia)?.id).toBe('N4');
  });

  it('un falso rechazo de un switch CLÁSICO (sin flecha) no es N4', () => {
    const clasico: Programa = { imports: [], sentencias: [seleccion({ selector: nombre('s', 'int'), casos: [], flecha: false })] };
    expect(identificarFamiliaConocida(familiaDe(JAVAC_COMPILA, clasico, RECHAZO_DE_SINTAXIS, 'falso-rechazo'))).toBeNull();
  });

  it('P el resultado de printf usado como valor: un falso acepto con el rasgo printf-como-valor', () => {
    const javac = javacRechaza('compiler.err.prob.found.req', 'incompatible types: java.io.PrintStream cannot be converted to int');
    const printf = plantilla(['System.out.printf(', ')'], [literal('"a"', 'String')], 'PrintStream', { etiquetas: ['impresion', 'printf-como-valor'] });
    const programa: Programa = { imports: [], sentencias: [declaracion({ tipo: 'int', nombre: 'b', inicial: printf })] };
    const familia = familiaDe(javac, programa);
    expect(familia.etiquetas).toEqual(['printf-como-valor']);
    expect(identificarFamiliaConocida(familia)?.id).toBe('P');
  });

  it('el mismo error de javac con un cast SIGUE siendo F1 (el orden de los reconocedores no pisa a las anteriores)', () => {
    const javac = javacRechaza('compiler.err.prob.found.req', 'incompatible types: java.lang.String cannot be converted to int');
    expect(identificarFamiliaConocida(familiaDe(javac, programaConCast('"5"')))?.id).toBe('F1');
  });
});

// Tarea 1.34: las cuatro familias de falsos aceptos de la re-verificación del lote 1 que el generador de la 1.31 no podía producir (A, B, C, D) y el
// fallo interno por nombres de `Object.prototype` (E) dejan de salir como NUEVA o «sin rasgos»: cada una lleva el rasgo de construcción que la identifica.
describe('identificarFamiliaConocida — las de la tarea 1.34 (A, B, C, D y E)', () => {
  const familiaDe = (javac: VeredictoJavac, programa: Programa, nuestro: VeredictoNuestro = ACEPTA_SIN_EJECUTAR, tipo: DiscrepanciaReducida['tipo'] = 'falso-acepto') =>
    agruparEnFamilias([discrepancia(1, javac, programa, nuestro, tipo)])[0]!;
  const FALLO_INTERNO: VeredictoNuestro = { tipo: 'fallo-interno', mensaje: 'TypeError: campo.lastIndexOf is not a function' };

  it('A una sentencia antes del primer case: lleva el rasgo sentencia-antes-del-primer-case (y switch) y es la familia A, no F4', () => {
    const javac = javacRechaza('compiler.err.expected3', "case, default, or '}' expected");
    const conAntes: Programa = {
      imports: [],
      sentencias: [seleccion({ selector: nombre('a', 'int'), antes: [sentenciaExpr(plantilla(['a++'], [], 'int', { etiquetas: ['incremento'] }))], casos: [{ etiquetas: [literal('1', 'int')], cuerpo: [] }], flecha: false })],
    };
    const familia = familiaDe(javac, conAntes);
    expect(familia.etiquetas).toEqual(['incremento', 'sentencia-antes-del-primer-case', 'switch']);
    expect(identificarFamiliaConocida(familia)?.id).toBe('A');
    // Con una clave de switch de la F4 (`default` repetido) el programa SIGUE siendo A si lleva una sentencia antes del primer case: lo que lo rompe es eso.
    expect(identificarFamiliaConocida(familiaDe(javacRechaza('compiler.err.duplicate.default.label', 'duplicate default label'), conAntes))?.id).toBe('A');
  });

  it('B args o System.in usados como valor: un falso acepto con el rasgo valor-de-tipo-no-modelado', () => {
    const javac = javacRechaza('compiler.err.prob.found.req', 'incompatible types: java.io.InputStream cannot be converted to int');
    const programa: Programa = {
      imports: [],
      sentencias: [declaracion({ tipo: 'int', nombre: 'x', inicial: nombre('System.in', 'InputStream', { etiquetas: ['valor-de-tipo-no-modelado'] }) })],
    };
    const familia = familiaDe(javac, programa);
    expect(familia.etiquetas).toEqual(['valor-de-tipo-no-modelado']);
    expect(identificarFamiliaConocida(familia)?.id).toBe('B');
  });

  it('C la clase con nombre del JDK: sea un falso acepto o un falso rechazo, la causa es el nombre de la clase', () => {
    const conClase = (clase: string): Programa => ({ imports: [], clase, sentencias: [sentenciaExpr(plantilla(['System.out.println(1)'], [], 'void', { etiquetas: ['impresion'] }))] });
    const aceptado = familiaDe(javacRechaza('compiler.err.cant.resolve.location', 'cannot find symbol'), conClase('System'));
    expect(aceptado.etiquetas).toEqual(['clase-con-nombre-del-jdk']);
    expect(identificarFamiliaConocida(aceptado)?.id).toBe('C');
    const rechazado = familiaDe(JAVAC_COMPILA, conClase('Math'), { tipo: 'error-compilacion', codigo: 'campo-no-declarado', linea: 3 }, 'falso-rechazo');
    expect(identificarFamiliaConocida(rechazado)?.id).toBe('C');
  });

  it('D una expresión entre paréntesis como sentencia: un falso acepto con el rasgo sentencia-entre-parentesis', () => {
    const javac = javacRechaza('compiler.err.not.stmt', 'not a statement');
    const asignacion = plantilla(['', ' = ', ''], [nombre('x', 'int'), literal('2', 'int')], 'int', { etiquetas: ['asignacion'] });
    const programa: Programa = {
      imports: [],
      sentencias: [sentenciaExpr(plantilla(['(', ')'], [asignacion], 'int', { primaria: true, etiquetas: ['sentencia-entre-parentesis'], sintaxisInvalida: true }))],
    };
    const familia = familiaDe(javac, programa);
    expect(familia.etiquetas).toEqual(['asignacion', 'sentencia-entre-parentesis']);
    expect(identificarFamiliaConocida(familia)?.id).toBe('D');
  });

  it('E un nombre de Object.prototype que hace LANZAR al compilador: un fallo interno con el rasgo nombre-de-javascript', () => {
    const programa: Programa = {
      imports: [],
      sentencias: [declaracion({ tipo: 'int', nombre: 'constructor', inicial: literal('1', 'int'), etiquetas: ['nombre-de-javascript'] })],
    };
    const familia = familiaDe(javacRechaza('compiler.err.cant.resolve.location', 'cannot find symbol'), programa, FALLO_INTERNO, 'fallo-interno');
    expect(familia.etiquetas).toEqual(['nombre-de-javascript']);
    expect(identificarFamiliaConocida(familia)?.id).toBe('E');
  });

  it('E también cuando el nombre de Object.prototype es el MIEMBRO de un valor (`int x = System.toString;`): el fallo interno lleva valor-de-tipo-no-modelado Y nombre-de-javascript y es E, no una familia NUEVA', () => {
    const programa: Programa = {
      imports: [],
      sentencias: [declaracion({ tipo: 'int', nombre: 'x', inicial: nombre('System.toString', 'desconocido', { etiquetas: ['valor-de-tipo-no-modelado', 'nombre-de-javascript'] }) })],
    };
    const familia = familiaDe(javacRechaza('compiler.err.cant.resolve.location', 'cannot find symbol'), programa, FALLO_INTERNO, 'fallo-interno');
    expect(familia.etiquetas).toEqual(['nombre-de-javascript', 'valor-de-tipo-no-modelado']);
    expect(identificarFamiliaConocida(familia)?.id).toBe('E');
    // Y el MISMO programa como falso acepto (el compilador no lanza pero lo acepta) es B: lo que lo rompe es el valor sin modelar.
    expect(identificarFamiliaConocida(familiaDe(javacRechaza('compiler.err.cant.resolve.location', 'cannot find symbol'), programa))?.id).toBe('B');
  });

  it('una discrepancia sin ninguno de esos rasgos NO es A–E (F4 con default repetido sigue siendo F4)', () => {
    const conSwitch: Programa = { imports: [], sentencias: [seleccion({ selector: nombre('a', 'int'), casos: [], flecha: false })] };
    expect(identificarFamiliaConocida(familiaDe(javacRechaza('compiler.err.duplicate.default.label', 'duplicate default label'), conSwitch))?.id).toBe('F4');
  });
});
