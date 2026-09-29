// RED de la tarea 1.28 (agregada por el orquestador, decisión del PO 2026-09-29: «la pantalla
// muestra el texto real de cada problema (error o aviso) con su línea; el ícono, el título y el
// subrayado siguen en la 4.5»). `textoDelProblema` elige el catálogo es-MX por `categoria` y arma la
// frase: un error de compilación lleva la línea antepuesta («Línea 3: …»); un aviso de "no
// disponible" ya dice «en la línea N» en su propio texto, así que NO se le antepone otra. Pura, sin
// DOM. Los fixtures son `Problema` tipados a mano (esta capa solo puede importar `motor/vista`, no
// el motor completo, ADR 001); el cruce con `compilar()` REAL vive en
// `pruebas/compilacion/problemas-en-pantalla.test.ts`.
import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  CodigoNoSoportado,
  CodigoProblema,
  DatosPorCodigoNoSoportado,
  Problema,
  ProblemaArranque,
} from '../motor/vista.ts';
import { textoDelArranque, textoDelProblema } from './texto-del-problema.ts';

const RANGO = { inicio: 0, fin: 1 } as const;

describe('textoDelProblema — error de compilación: el texto del catálogo con la línea antepuesta', () => {
  it('falta el ";" en la línea 3: «Línea 3: Te falta un punto y coma…»', () => {
    const problema: Problema = {
      categoria: 'error-compilacion',
      codigo: 'falta-punto-y-coma',
      rango: RANGO,
      linea: 3,
      datos: { mensaje: 'se esperaba ";" y se encontró "}"' },
    };
    expect(textoDelProblema(problema)).toBe('Línea 3: Te falta un punto y coma ";" al final de esta línea.');
  });

  it('triangulación: otro código, otra línea y datos propios ("edad" en la línea 12)', () => {
    const problema: Problema = {
      categoria: 'error-compilacion',
      codigo: 'variable-no-declarada',
      rango: RANGO,
      linea: 12,
      datos: { nombre: 'edad' },
    };
    const texto = textoDelProblema(problema);
    expect(texto.startsWith('Línea 12: ')).toBe(true);
    expect(texto).toContain('"edad"');
  });

  it('los datos del problema deciden el texto: la sugerencia de mayúscula aparece solo si el motor la mandó', () => {
    const conSugerencia: Problema = {
      categoria: 'error-compilacion',
      codigo: 'variable-no-declarada',
      rango: RANGO,
      linea: 5,
      datos: { nombre: 'system', sugerencia: 'System' },
    };
    const sinSugerencia: Problema = { ...conSugerencia, datos: { nombre: 'system' } };
    expect(textoDelProblema(conSugerencia)).toContain('"System"');
    expect(textoDelProblema(sinSugerencia)).not.toContain('"System"');
  });
});

describe('textoDelProblema — aviso "no disponible": el texto del catálogo tal cual, sin anteponer otra línea', () => {
  it('un arreglo en la línea 4: menciona la línea UNA vez, con `int[]` marcado como código', () => {
    const problema: Problema = {
      categoria: 'no-disponible',
      codigo: 'arreglo-no-soportado',
      rango: RANGO,
      linea: 4,
      datos: { tipoArreglo: 'int[]' },
    };
    const texto = textoDelProblema(problema);
    expect(texto.startsWith('Tu programa usa un arreglo (`int[]`) en la línea 4.')).toBe(true);
    expect(texto).not.toContain('Línea 4:');
  });

  it('triangulación: otro código con datos propios (literal octal "010" = 8) usa esos datos', () => {
    const problema: Problema = {
      categoria: 'no-disponible',
      codigo: 'literal-octal-no-soportado',
      rango: RANGO,
      linea: 2,
      datos: { textoOriginal: '010', valorDecimal: 8 },
    };
    const texto = textoDelProblema(problema);
    expect(texto).toContain('`010`');
    expect(texto).toContain('8');
    expect(texto).toContain('línea 2');
  });

  it('un código sin datos extra (operador ternario) solo necesita la línea', () => {
    const problema: Problema = {
      categoria: 'no-disponible',
      codigo: 'operador-ternario',
      rango: RANGO,
      linea: 9,
      datos: {},
    };
    expect(textoDelProblema(problema)).toContain('línea 9');
  });

  it('lo que el motor todavía no ejecuta (ejecucion-no-disponible) dice la línea sin decir que es un error de Java', () => {
    const problema: Problema = {
      categoria: 'no-disponible',
      codigo: 'ejecucion-no-disponible',
      rango: RANGO,
      linea: 6,
      datos: {},
    };
    const texto = textoDelProblema(problema);
    expect(texto).toContain('Java sí acepta tu programa');
    expect(texto).toContain('línea 6');
  });
});

describe('textoDelArranque — el texto amable de arranque, con el nombre REAL de la clase', () => {
  const lanzador = 'Error: texto exacto del lanzador\n';

  it('"main" sin static: menciona la clase del alumno y la palabra "static"', () => {
    const arranque: ProblemaArranque = { codigo: 'main-no-static', nombreClase: 'SinStatic', textoLanzador: lanzador };
    const texto = textoDelArranque(arranque);
    expect(texto).toContain('SinStatic');
    expect(texto).toContain('static');
  });

  it('triangulación: sin "main" y OTRA clase da OTRO texto', () => {
    const arranque: ProblemaArranque = { codigo: 'sin-main', nombreClase: 'CalculadoraVueltos', textoLanzador: lanzador };
    const texto = textoDelArranque(arranque);
    expect(texto).toContain('CalculadoraVueltos');
    expect(texto).toContain('main');
    expect(texto).not.toContain('SinStatic');
  });

  it('el detalle secundario (el texto exacto del lanzador) NO se mezcla en el texto amable', () => {
    const arranque: ProblemaArranque = { codigo: 'sin-main', nombreClase: 'X', textoLanzador: lanzador };
    expect(textoDelArranque(arranque)).not.toContain('texto exacto del lanzador');
  });
});

// Contrato de tipos de `Problema` (tarea 1.28): no lo comprueba Vitest al ejecutar sino `tsc`
// (`npm run tipos` incluye esta capa). `Problema` es una unión discriminada por `categoria` con el
// código estrechado por categoría y los datos exactos de cada código (mismo mecanismo que 1.25 dio a
// los avisos): el catálogo se elige por categoría, el texto se arma con datos verificados por el
// compilador — sin `as`, sin `any`. Cada `@ts-expect-error` es un problema mal formado que DEBE
// rechazarse; si alguno dejara de fallar, `tsc` lo reportaría como directiva sin uso.
describe('contrato de tipos de Problema (lo verifica `npm run tipos`)', () => {
  it('el código se estrecha por categoría y los datos por código', () => {
    expectTypeOf<Extract<Problema, { categoria: 'no-disponible' }>['codigo']>().toEqualTypeOf<CodigoNoSoportado>();
    expectTypeOf<Extract<Problema, { categoria: 'error-compilacion' }>['codigo']>().toEqualTypeOf<CodigoProblema>();
    expectTypeOf<Extract<Problema, { codigo: 'arreglo-no-soportado' }>['datos']>().toEqualTypeOf<
      DatosPorCodigoNoSoportado['arreglo-no-soportado']
    >();
    expectTypeOf<Extract<Problema, { codigo: 'variable-no-declarada' }>['datos']>().toEqualTypeOf<{
      readonly nombre: string;
      readonly sugerencia?: string;
    }>();
  });

  it('los problemas mal formados no compilan', () => {
    // @ts-expect-error -- 'arreglo-no-soportado' exige `datos.tipoArreglo`.
    const sinTipoDeArreglo: Problema = { categoria: 'no-disponible', codigo: 'arreglo-no-soportado', rango: RANGO, linea: 1, datos: {} };
    // @ts-expect-error -- un código de error de compilación no es válido bajo la categoría "no-disponible".
    const codigoDeOtraCategoria: Problema = { categoria: 'no-disponible', codigo: 'falta-punto-y-coma', rango: RANGO, linea: 1, datos: {} };
    // @ts-expect-error -- 'variable-no-declarada' exige `datos.nombre`.
    const sinNombre: Problema = { categoria: 'error-compilacion', codigo: 'variable-no-declarada', rango: RANGO, linea: 1, datos: {} };
    // @ts-expect-error -- un código inventado no pertenece a la unión cerrada.
    const codigoInventado: Problema = { categoria: 'error-compilacion', codigo: 'inventado', rango: RANGO, linea: 1, datos: {} };
    // @ts-expect-error -- "error-arranque" no es un `Problema`: el arranque viaja aparte, como `ProblemaArranque`.
    const categoriaDeArranque: Problema = { categoria: 'error-arranque', codigo: 'sin-main', rango: RANGO, linea: 1, datos: {} };
    // Solo se referencian para el linter: la aserción de este caso es que `tsc` los rechace.
    void [sinTipoDeArreglo, codigoDeOtraCategoria, sinNombre, codigoInventado, categoriaDeArranque];
  });
});
