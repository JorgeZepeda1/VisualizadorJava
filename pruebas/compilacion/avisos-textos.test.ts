// RED de la tarea 1.25 (Datos tipados de cada aviso de "no soportado" — agregada por el
// orquestador: verificación de punta a punta encontró 4 textos que le mostrarían `undefined` al
// alumno porque el MOTOR nunca mandaba los datos que su propio texto pedía). A diferencia de la
// versión de la tarea 1.24, esta suite YA NO fabrica datos con un mapa `DATOS_EXTRA` local — arma el
// argumento del renderizador EXACTAMENTE como lo hará la interfaz real: `{ linea: problema.linea,
// ...problema.datos }`, con `problema.datos` viniendo de `compilar()` DE VERDAD. Así, si el motor
// deja de mandar un dato real, esta prueba lo detecta — antes NO lo hacía: fabricaba el dato que
// faltaba, así que "1045/1045" pasaba con 4 textos rotos (02-literal-octal.java,
// 25/26/27-arreglo-*.java mostraban "undefined" en vez del literal/tipo real).
//
// Vive en `pruebas/` (capa sin restricción, design.md §1.1) porque necesita `compilar()`
// (`motor/index.ts` completo) Y `textosNoSoportado` (`textos/es-MX`) a la vez — `src/textos/es-MX`
// solo puede importar `motor/vista` (herramientas/eslint/matriz-capas.ts), así que ese cruce nunca
// puede vivir junto al catálogo mismo (ver `src/textos/es-MX/no-soportado.test.ts` para las pruebas
// que SÍ respetan esa frontera, con datos fabricados pero REALISTAS por código).
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import { textosNoSoportado } from '../../src/textos/es-MX/no-soportado.ts';
import type { CodigoNoSoportado } from '../../src/motor/vista.ts';

const RUTA_AVISOS = resolve('corpus/compilacion/avisos');

function archivosJava(ruta: string): string[] {
  return readdirSync(ruta)
    .filter((nombre) => nombre.endsWith('.java'))
    .sort();
}

// `datos` varía por código; el propio motor (DatosPorCodigoNoSoportado, tarea 1.25) ya exige la
// forma correcta a cada EMISOR — esta prueba solo verifica el resultado final, nunca reconstruye
// esa exhaustividad en tiempo de ejecución (sería una segunda fuente de verdad, exactamente lo que
// esta tarea eliminó).
function renderizar(codigo: CodigoNoSoportado, linea: number, datos: Readonly<Record<string, unknown>>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ver comentario de la función
  const generador = textosNoSoportado[codigo] as (d: any) => string;
  return generador({ linea, ...datos });
}

describe('corpus/compilacion/avisos — cada muestra real produce, vía compilar(), un texto es-MX SIN restos sin resolver', () => {
  const archivos = archivosJava(RUTA_AVISOS);

  it('el corpus de avisos no está vacío (guarda contra un directorio mal armado)', () => {
    expect(archivos.length).toBeGreaterThanOrEqual(37);
  });

  it.each(archivos)('%s: el texto renderizado con los datos REALES de compilar() no tiene restos sin resolver', (nombre) => {
    const fuente = readFileSync(resolve(RUTA_AVISOS, nombre), 'utf-8');
    const resultado = compilar(fuente);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;

    // C8 (ya cubierto por pruebas/compilacion/catalogo.test.ts): nunca otra categoría.
    expect(resultado.problema.categoria).toBe('no-disponible');

    const codigo = resultado.problema.codigo as CodigoNoSoportado;
    const generador = textosNoSoportado[codigo];
    expect(generador, `"${nombre}" produjo el código "${codigo}", sin entrada en textosNoSoportado`).toBeTypeOf('function');

    // Tal cual lo hará la interfaz real (design.md, ADR 015): línea + los datos REALES que mandó el
    // motor (`resultado.problema.datos`) — NUNCA datos fabricados por la prueba, a diferencia de la
    // versión anterior (tarea 1.24) que enmascaraba exactamente este hallazgo.
    const texto = renderizar(codigo, resultado.problema.linea, resultado.problema.datos);

    expect(texto.length).toBeGreaterThan(0);
    expect(texto).toContain(`línea ${resultado.problema.linea}`);
    // El hallazgo real de esta tarea: ningún texto debe mostrarle al alumno un dato sin resolver.
    // "43-null.java" contiene LEGÍTIMAMENTE la palabra "null" en su propio texto — no es un resto de
    // interpolación, por eso esta guarda busca "undefined"/"NaN"/"[object", nunca la palabra "null".
    expect(texto).not.toMatch(/undefined/);
    expect(texto).not.toMatch(/\bNaN\b/);
    expect(texto).not.toMatch(/\[object/);
  });

  // Regresión directa del hallazgo: sin el dato real, "02-literal-octal.java" mostraba "Tu programa
  // usa el número `undefined`..." en vez del literal que el alumno escribió.
  it('02-literal-octal.java: el texto menciona el literal REAL ("010") y su valor real (8), no un dato fabricado', () => {
    const fuente = readFileSync(resolve(RUTA_AVISOS, '02-literal-octal.java'), 'utf-8');
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.problema.codigo).toBe('literal-octal-no-soportado');
    const texto = renderizar('literal-octal-no-soportado', resultado.problema.linea, resultado.problema.datos);
    expect(texto).toContain('010');
    expect(texto).toContain('8');
  });

  // Regresión directa del hallazgo: sin el dato real, estas 3 muestras mostraban "Tu programa usa un
  // arreglo (`undefined`)..." en vez del tipo real declarado por el alumno. Las 3 llegan al MISMO
  // sitio de emisión (`analizador-sintactico.ts`, forma "Tipo[] nombre" — ver el hallazgo de la
  // tarea), así que las 3 comparten la misma aserción (triangulación real de tipoArreglo vive en
  // `expresiones.test.ts`, sitio `new Tipo[...]`, y en `no-soportado.test.ts` de textos).
  it.each(['25-arreglo-como-tipo.java', '26-arreglo-new.java', '27-arreglo-inicializador.java'])(
    '%s: el texto menciona el TIPO real del arreglo ("int[]"), no un dato fabricado',
    (nombre) => {
      const fuente = readFileSync(resolve(RUTA_AVISOS, nombre), 'utf-8');
      const resultado = compilar(fuente);
      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.problema.codigo).toBe('arreglo-no-soportado');
      const texto = renderizar('arreglo-no-soportado', resultado.problema.linea, resultado.problema.datos);
      expect(texto).toContain('int[]');
    },
  );
});

// `miembro-de-biblioteca-no-soportado` (semantica/atribucion.ts) NO está cubierto por
// `corpus/compilacion/avisos/` (esa carpeta solo ejercita léxico/sintaxis, tarea 1.6 — este código
// necesita el catálogo real del JDK, ADR 010, que solo existe desde la atribución, tarea 1.19). Un
// 5.º texto roto, encontrado por esta MISMA verificación de punta a punta durante la tarea 1.25 (no
// reportado por el orquestador: ningún archivo de `avisos/` lo ejercita): `atribucion.ts` mandaba
// `datos: {}` en sus 3 sitios de emisión (llamada de método, acceso de campo, constructor) aunque el
// texto pide `{ clase, nombre }` desde la tarea 1.24 — "Tu programa usa el miembro `undefined` de
// `undefined`...". Snippets verificados contra javac 17 real en `atribucion.test.ts` (líneas
// 93-100, 178-182, 580-586).
describe('miembro-de-biblioteca-no-soportado — no cubierto por corpus/avisos (necesita atribución, no solo sintaxis)', () => {
  it('s.split(","): llamada de método — el texto nombra el miembro REAL ("split" de "String"), vía compilar() completo', () => {
    const fuente = 'class C { public static void main(String[] a) { String s = "a,b"; s.split(","); } }';
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.problema.categoria).toBe('no-disponible');
    expect(resultado.problema.codigo).toBe('miembro-de-biblioteca-no-soportado');
    const texto = renderizar('miembro-de-biblioteca-no-soportado', resultado.problema.linea, resultado.problema.datos);
    expect(texto).toContain('split');
    expect(texto).toContain('String');
    expect(texto).not.toMatch(/undefined/);
  });

  it('triangulación: Integer.SIZE (acceso de CAMPO, no llamada) nombra "SIZE"/"Integer" — sitio de emisión distinto (visitarAccesoMiembro)', () => {
    const fuente = 'class C { public static void main(String[] a) { int n = Integer.SIZE; } }';
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.problema.codigo).toBe('miembro-de-biblioteca-no-soportado');
    const texto = renderizar('miembro-de-biblioteca-no-soportado', resultado.problema.linea, resultado.problema.datos);
    expect(texto).toContain('SIZE');
    expect(texto).toContain('Integer');
    expect(texto).not.toMatch(/undefined/);
  });

  it('triangulación: new Scanner("texto") (CONSTRUCTOR, no método ni campo) — tercer sitio de emisión distinto (visitarNuevaInstancia)', () => {
    const fuente =
      'import java.util.Scanner; class C { public static void main(String[] a) { Scanner sc = new Scanner("texto"); } }';
    const resultado = compilar(fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.problema.codigo).toBe('miembro-de-biblioteca-no-soportado');
    const texto = renderizar('miembro-de-biblioteca-no-soportado', resultado.problema.linea, resultado.problema.datos);
    expect(texto).toContain('Scanner');
    expect(texto).not.toMatch(/undefined/);
  });
});
