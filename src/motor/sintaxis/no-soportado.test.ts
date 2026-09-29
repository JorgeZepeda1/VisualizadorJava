// RED de la tarea 1.6 (Reconocimiento NO-DISP sintáctico — resto del catálogo, REQ-SUB-006,
// REQ-SUB-007, design.md §2.6 fila "Sintaxis"): una muestra por cada fila restante (lo léxico ya
// quedó cubierto en 1.1, y bits/desplazamientos/ternario/instanceof/[]/:: en 1.3). Cada muestra
// MUST producir un `NodoNoSoportado`/`NodoExpresionNoSoportada` y dejar que el análisis siga —
// NUNCA un error de sintaxis (ErrorDeCompilacion) sin clasificar (C8).
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { analizarPrograma } from './analizador-sintactico.ts';
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';
import type { NodoDeclaracionLocal, NodoIf, NodoNoSoportado, NodoSwitch } from './ast.ts';

function analizar(fuente: string) {
  return analizarPrograma(tokenizar(fuente));
}

function primeraSentencia(cuerpoDeMain: string) {
  const programa = analizar(`class C { public static void main(String[] a) { ${cuerpoDeMain} } }`);
  return programa.clase.main!.cuerpo.elementos[0];
}

describe('no-soportado — otra clase/interfaz/enum/record de nivel superior', () => {
  it('una segunda clase tras la principal no rompe el análisis', () => {
    const programa = analizar(
      'class C { public static void main(String[] a) { } } class Ayudante { int x; }',
    );
    expect(programa.otrosTiposDeNivelSuperior).toHaveLength(1);
    expect(programa.otrosTiposDeNivelSuperior[0].codigo).toBe('otro-tipo-de-nivel-superior-no-soportado');
  });

  it('un enum tras la clase principal también se reconoce (triangulación de la misma fila)', () => {
    const programa = analizar(
      'class C { public static void main(String[] a) { } } enum Color { ROJO, VERDE }',
    );
    expect(programa.otrosTiposDeNivelSuperior).toHaveLength(1);
  });
});

describe('no-soportado — miembros de clase distintos de main (campos, métodos propios, anotaciones)', () => {
  it('un método propio (recursión, REQ-SUB-007) no rompe el análisis y main se sigue reconociendo', () => {
    const programa = analizar(
      'class C { static int cuadrado(int n) { return n * n; } public static void main(String[] a) { } }',
    );
    expect(programa.clase.otrosMiembros).toHaveLength(1);
    expect(programa.clase.otrosMiembros[0].codigo).toBe('miembro-de-clase-no-soportado');
    expect(programa.clase.main!.parametro).toBe('a');
  });

  it('un campo de clase (antes de main)', () => {
    const programa = analizar(
      'class C { static int contador; public static void main(String[] a) { } }',
    );
    expect(programa.clase.otrosMiembros).toHaveLength(1);
  });

  it('main en medio de otros miembros (antes Y después) se sigue reconociendo una sola vez', () => {
    const programa = analizar(
      'class C { int x; public static void main(String[] a) { } static int y() { return 1; } }',
    );
    expect(programa.clase.otrosMiembros).toHaveLength(2);
    expect(programa.clase.main!.parametro).toBe('a');
  });

  it('un campo CON inicializador (p. ej. "static int contador = 0;") sigue reconociéndose de punta a punta', () => {
    const programa = analizar('class C { static int contador = 0; public static void main(String[] a) { } }');
    expect(programa.clase.otrosMiembros).toHaveLength(1);
    expect(programa.clase.main).not.toBeNull();
  });
});

// Sub-lote 1-D3 (mutante real contra veredicto de javac, tarea 1.16): ANTES, este catch-all
// devoraba CUALQUIER cosa hasta el siguiente ";"/"{" de nivel superior sin verificar que lo
// anterior siquiera pareciera el inicio de un miembro real de Java (JLS 8: como mínimo
// "{modificadores} Tipo Identificador") -- una firma de "main" mal escrita ("public static main
// void(...)", "public static void main main(...)"…) se aceptaba como "un método propio más" en
// silencio. Los 4 casos siguientes son mutantes REALES de esta sesión (ver el informe): verificados
// contra javac 17 real vía `corpus/mutantes/veredictos.jsonl` -- javac los RECHAZA, nuestro motor
// los aceptaba.
describe('consumirMiembroDeClase — cabecera inválida se rechaza como error real, nunca un NO-DISP inventado (sub-lote 1-D3)', () => {
  it('"public static main void(...)" ("void"/"main" intercambiados): el "nombre" no puede ser una palabra reservada', () => {
    const fuente = 'class C { public static main void(String[] args) { } public static void main(String[] a) { } }';
    expect(() => analizar(fuente)).toThrow(ErrorDeCompilacion);
  });

  it('"public static void main main(...)" ("main" duplicado): tras tipo+nombre debe seguir "(", ";", "{" o "="', () => {
    const fuente = 'class C { public static void main main(String[] args) { } }';
    expect(() => analizar(fuente)).toThrow(ErrorDeCompilacion);
  });

  it('"public static void (...)" ("main" borrado): falta el nombre por completo', () => {
    const fuente = 'class C { public static void (String[] args) { } public static void main(String[] a) { } }';
    expect(() => analizar(fuente)).toThrow(ErrorDeCompilacion);
  });

  it('"public static ; void main(...)" (";" de más justo tras los modificadores): falta el tipo por completo', () => {
    const fuente = 'class C { public static; void main(String[] args) { } }';
    expect(() => analizar(fuente)).toThrow(ErrorDeCompilacion);
  });

  it('control (regresión): "static int cuadrado(int n) { return n * n; }" (miembro real válido, REQ-SUB-007) NO se rechaza', () => {
    expect(() =>
      analizar('class C { static int cuadrado(int n) { return n * n; } public static void main(String[] a) { } }'),
    ).not.toThrow();
  });
});

// Tarea 1.21 (sub-lote 1-D4, ~35 mutantes de la tarea 1.16, la clase de discrepancia MÁS GRANDE):
// `validarCabeceraDeMiembro` (arriba) valida la CABECERA (tipo+nombre+continuación) pero, hasta
// esta tarea, NO el CONTENIDO de una lista de parámetros ya comprometida -- "void main([String[]
// args)" tiene una cabecera PERFECTA ("void main(") pero un parámetro roto DENTRO de los
// paréntesis; antes se tragaba como NO-DISP (¡pareceMain ya había fallado a reconocerlo como
// main, precisamente PORQUE el primer token del parámetro es "["!), cuando javac lo rechaza de
// verdad. Verificado contra javac 17 real esta sesión (carpetas temporales, borradas):
// "illegal start of type" en el primer token que no puede abrir un tipo.
describe('consumirMiembroDeClase — lista de parámetros DENTRO de los paréntesis (sub-lote 1-D4)', () => {
  it('"void main([String[] args)" ("[" insertado antes de "String", mutante real): se rechaza como error real, nunca NO-DISP en silencio', () => {
    expect(() => analizar('class C { public static void main([String[] args) { } }')).toThrow(ErrorDeCompilacion);
  });

  it('triangulación: "static int foo([int n) { return n; }" (miembro genérico, NO solo main -- REQ-SUB-007 acepta el miembro, pero sus PARÉNTESIS deben ser sintaxis real)', () => {
    expect(() =>
      analizar('class C { static int foo([int n) { return n; } public static void main(String[] a) { } }'),
    ).toThrow(ErrorDeCompilacion);
  });

  it('triangulación: "static void foo(int n, )" (coma colgante, ningún parámetro real después) también se rechaza', () => {
    expect(() =>
      analizar('class C { static void foo(int n, ) { } public static void main(String[] a) { } }'),
    ).toThrow(ErrorDeCompilacion);
  });

  it('control (regresión): parámetros con arreglos, varargs, nombres calificados y "final" -- las formas REALES de Java -- siguen sin rechazarse', () => {
    expect(() =>
      analizar(
        'class C { static void foo(final int x, String[] datos, java.util.List resto, int... otros) { } public static void main(String[] a) { } }',
      ),
    ).not.toThrow();
  });

  it('control (regresión): sin parámetros ("()") sigue sin rechazarse', () => {
    expect(() => analizar('class C { static void foo() { } public static void main(String[] a) { } }')).not.toThrow();
  });

  it('control (regresión): "static int contador;" (campo real válido) NO se rechaza', () => {
    expect(() => analizar('class C { static int contador; public static void main(String[] a) { } }')).not.toThrow();
  });
});

describe('no-soportado — "throws" en main (REQ-SUB-007)', () => {
  it('"public static void main(String[] args) throws Exception" no rompe el análisis', () => {
    const programa = analizar(
      'class C { public static void main(String[] args) throws Exception { } }',
    );
    expect(programa.clase.main!.clausulaThrows).not.toBeNull();
    expect(programa.clase.main!.clausulaThrows?.codigo).toBe('throws-no-soportado');
  });
});

describe('no-soportado — arreglos (tipo, new, inicializador — el acceso [] ya es de la tarea 1.3)', () => {
  it('"int[] datos;" como declaración es NO-DISP, no una declaración normal', () => {
    const elemento = primeraSentencia('int[] datos;');
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('arreglo-no-soportado');
  });

  it('"String[] datos = new String[5];" también es NO-DISP de punta a punta', () => {
    const elemento = primeraSentencia('String[] datos = new String[5];');
    expect(elemento.tipo).toBe('no-soportado');
  });

  it('"int[] datos = {1, 2, 3};" (inicializador de arreglo, ejemplo del REQ-SUB-006) es NO-DISP', () => {
    const elemento = primeraSentencia('int[] datos = {1, 2, 3};');
    expect(elemento.tipo).toBe('no-soportado');
  });

  it('"new int[5]" como expresión suelta es NO-DISP, no un error de sintaxis', () => {
    const elemento = primeraSentencia('int[] x = new int[5];');
    expect(elemento.tipo).toBe('no-soportado');
  });
});

describe('no-soportado — "var" (REQ-SUB-007)', () => {
  it('"var x = 5;" es NO-DISP', () => {
    const elemento = primeraSentencia('var x = 5;');
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('var-no-soportado');
  });
});

describe('no-soportado — genéricos (REQ-SUB-007)', () => {
  it('"ArrayList<Integer> lista;" es NO-DISP, nunca confundido con una comparación', () => {
    const elemento = primeraSentencia('ArrayList<Integer> lista;');
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('generico-no-soportado');
  });

  it('genéricos anidados ("Map<String, List<Integer>> mapa;") también se reconocen (triangulación)', () => {
    const elemento = primeraSentencia('Map<String, List<Integer>> mapa;');
    expect(elemento.tipo).toBe('no-soportado');
  });

  it('una comparación real ("total < limite") NUNCA se confunde con un genérico (regresión)', () => {
    const elemento = primeraSentencia('total = a < limite;');
    expect(elemento.tipo).toBe('sentencia-expresion');
  });
});

describe('no-soportado — for mejorado (REQ-SUB-007)', () => {
  it('"for (int x : arreglo) { }" es NO-DISP de punta a punta', () => {
    const elemento = primeraSentencia('for (int x : arreglo) { total = total + x; }');
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('for-mejorado-no-soportado');
  });

  it('un "for" clásico normal NUNCA se confunde con el mejorado (regresión)', () => {
    const elemento = primeraSentencia('for (int i = 0; i < 10; i++) { }');
    expect(elemento.tipo).toBe('for');
  });
});

describe('no-soportado — etiquetas y break/continue con etiqueta (REQ-SUB-007, verificado: flow08)', () => {
  it('una sentencia etiquetada ("externo: for (...) { }") es NO-DISP, pero delimita bien el for interior', () => {
    const elemento = primeraSentencia('externo: for (int i = 0; i < 3; i++) { break; }');
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('etiqueta-no-soportada');
  });

  it('"break externo;" (con etiqueta) es NO-DISP, distinto de un "break;" simple', () => {
    const elemento = primeraSentencia('for (int i = 0; i < 3; i++) { break externo; }');
    const cuerpo = (elemento as unknown as { cuerpo: { elementos: NodoNoSoportado[] } }).cuerpo;
    expect(cuerpo.elementos[0].tipo).toBe('no-soportado');
    expect(cuerpo.elementos[0].codigo).toBe('break-con-etiqueta-no-soportado');
  });

  it('"continue externo;" (con etiqueta) es NO-DISP', () => {
    const elemento = primeraSentencia('for (int i = 0; i < 3; i++) { continue externo; }');
    const cuerpo = (elemento as unknown as { cuerpo: { elementos: NodoNoSoportado[] } }).cuerpo;
    expect(cuerpo.elementos[0].codigo).toBe('continue-con-etiqueta-no-soportado');
  });

  it('un "break;"/"continue;" simples NUNCA se confunden con la forma etiquetada (regresión)', () => {
    const elemento = primeraSentencia('while (true) { break; }');
    const cuerpo = (elemento as unknown as { cuerpo: { elementos: { tipo: string }[] } }).cuerpo;
    expect(cuerpo.elementos[0].tipo).toBe('break');
  });
});

describe('no-soportado — try/catch/throw (REQ-SUB-007)', () => {
  it('"try { } catch (Exception e) { }" completo es NO-DISP y consume bien las llaves anidadas', () => {
    const elemento = primeraSentencia(
      'try { total = 1 / 0; } catch (Exception e) { total = -1; } System.out.println("después");',
    );
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('try-catch-no-soportado');
  });

  it('el análisis SIGUE después del try/catch (la sentencia siguiente se reconoce normal)', () => {
    const programa = analizar(
      'class C { public static void main(String[] a) { try { } catch (Exception e) { } System.out.println("ok"); } }',
    );
    expect(programa.clase.main!.cuerpo.elementos[1]).toMatchObject({ tipo: 'impresion' });
  });

  it('"throw new RuntimeException(\\"error\\");" es NO-DISP', () => {
    const elemento = primeraSentencia('throw new RuntimeException("error");');
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('throw-no-soportado');
  });
});

describe('no-soportado — switch con flecha / yield (REQ-SUB-007, verificado: flow06/flow07)', () => {
  it('"case 1 -> ...;" es NO-DISP, no confunde el resto del switch', () => {
    const elemento = primeraSentencia('switch (dia) { case 1 -> total = 1; default -> total = 0; }') as NodoSwitch;
    expect(elemento.tipo).toBe('switch');
    expect(elemento.elementos[0].tipo).toBe('no-soportado');
    expect((elemento.elementos[0] as NodoNoSoportado).codigo).toBe('switch-flecha-no-soportado');
    expect(elemento.elementos[1].tipo).toBe('no-soportado');
  });

  it('una rama de flecha con bloque "{ }" también se delimita bien', () => {
    const elemento = primeraSentencia(
      'switch (dia) { case 1 -> { total = 1; } default -> { total = 0; } }',
    ) as NodoSwitch;
    expect(elemento.elementos).toHaveLength(2);
  });

  it('"yield" dentro de un switch es NO-DISP', () => {
    const elemento = primeraSentencia('switch (dia) { case 1: yield 1; }') as NodoSwitch;
    expect(elemento.elementos.some((e) => e.tipo === 'no-soportado' && (e as NodoNoSoportado).codigo === 'yield-no-soportado')).toBe(true);
  });

  it('un switch clásico normal (con ":") NUNCA se confunde con el de flecha (regresión)', () => {
    const elemento = primeraSentencia('switch (dia) { case 1: total = 1; break; default: total = 0; }') as NodoSwitch;
    expect(elemento.elementos[0].tipo).toBe('etiqueta-case');
  });
});

describe('no-soportado — "final" sin inicializador (REQ-SUB-007)', () => {
  it('"final int x;" (sin "=") es NO-DISP', () => {
    const elemento = primeraSentencia('final int x;');
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('final-sin-inicializador-no-soportado');
  });

  it('"final int x = 5;" (CON inicializador) sigue siendo una declaración normal (regresión)', () => {
    const elemento = primeraSentencia('final int x = 5;') as NodoDeclaracionLocal;
    expect(elemento.tipo).toBe('declaracion-local');
    expect(elemento.esFinal).toBe(true);
  });
});

describe('no-soportado — "import static" (REQ-SUB-007)', () => {
  it('"import static java.lang.Math.PI;" no rompe el análisis del resto del programa', () => {
    const programa = analizar(
      'import static java.lang.Math.PI; class C { public static void main(String[] a) { } }',
    );
    expect(programa.clase.nombre).toBe('C');
  });
});

describe('no-soportado — lambdas (REQ-SUB-007, corrección obligatoria del sub-lote 1-B)', () => {
  it('"() -> System.out.println(\\"hola\\");" (sin parámetros) es NO-DISP', () => {
    // La declaración en sí ("Runnable r = ...") sigue siendo 'declaracion-local' (Runnable es un
    // nombre de tipo por referencia válido sintácticamente); lo NO-DISP es el INICIALIZADOR: la
    // lambda que Runnable recibiría.
    const elemento = primeraSentencia('Runnable r = () -> System.out.println("hola");') as NodoDeclaracionLocal;
    expect(elemento.tipo).toBe('declaracion-local');
    expect(elemento.declaradores[0].inicializador).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'lambda' });
  });

  it('"x -> x * 2" (un parámetro sin paréntesis) es NO-DISP', () => {
    const elemento = primeraSentencia('Convertidor c = x -> x * 2;') as NodoDeclaracionLocal;
    expect(elemento.declaradores[0].inicializador).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'lambda' });
  });

  it('una lambda con cuerpo en bloque "{ }" se delimita bien y el análisis sigue', () => {
    const programa = analizar(
      'class C { public static void main(String[] a) { Runnable r = () -> { total = 1; }; System.out.println("después"); } }',
    );
    expect(programa.clase.main!.cuerpo.elementos[1]).toMatchObject({ tipo: 'impresion' });
  });

  it('una llamada normal con paréntesis NUNCA se confunde con una lambda (regresión: "foo(1, 2);")', () => {
    const elemento = primeraSentencia('foo(1, 2);');
    expect(elemento.tipo).toBe('sentencia-expresion');
    expect((elemento as { expresion: { tipo: string } }).expresion.tipo).toBe('llamada');
  });
});

describe('no-soportado — this/super/null (design.md §2.6)', () => {
  it('"this" como expresión es NO-DISP', () => {
    const elemento = primeraSentencia('total = this.x;');
    expect(elemento).toMatchObject({ tipo: 'sentencia-expresion', expresion: { tipo: 'asignacion' } });
  });

  it('"null" es NO-DISP (sin null no hay NPE fuera del currículo)', () => {
    const elemento = primeraSentencia('String s = null;') as NodoDeclaracionLocal;
    expect(elemento.declaradores[0].inicializador).toMatchObject({ tipo: 'expresion-no-soportada', codigo: 'null-no-soportado' });
  });
});

describe('no-soportado — float/byte/short como tipo de declaración (design.md §2.6)', () => {
  it('"float f = 3.5f;" es NO-DISP (nunca se reinterpreta como double)', () => {
    const elemento = primeraSentencia('float f = 3.5f;');
    expect(elemento.tipo).toBe('no-soportado');
    expect((elemento as NodoNoSoportado).codigo).toBe('tipo-primitivo-no-soportado');
  });

  it('"byte b = 10;" es NO-DISP (nunca se reinterpreta como int)', () => {
    const elemento = primeraSentencia('byte b = 10;');
    expect(elemento.tipo).toBe('no-soportado');
  });

  it('"short s;" es NO-DISP', () => {
    const elemento = primeraSentencia('short s;');
    expect(elemento.tipo).toBe('no-soportado');
  });
});

describe('no-soportado — combinaciones que confirman "cero errores de sintaxis engañosos" (C8)', () => {
  it('un programa con VARIAS construcciones NO-DISP seguidas nunca lanza ErrorDeCompilacion', () => {
    const fuente = [
      'class C {',
      '  static int ayudante() { return 1; }',
      '  public static void main(String[] args) {',
      '    var x = 5;',
      '    int[] datos = {1, 2, 3};',
      '    try { total = 1 / 0; } catch (Exception e) { }',
      '    for (int y : datos) { }',
      '    System.out.println("fin");',
      '  }',
      '}',
    ].join('\n');
    expect(() => analizar(fuente)).not.toThrow();
    const programa = analizar(fuente);
    const tipos = programa.clase.main!.cuerpo.elementos.map((e) => e.tipo);
    expect(tipos).toEqual(['no-soportado', 'no-soportado', 'no-soportado', 'no-soportado', 'impresion']);
  });

  it('el "if" alrededor de una construcción NO-DISP se sigue reconociendo como "if" real', () => {
    const elemento = primeraSentencia('if (listo) { var x = 5; }') as NodoIf;
    expect(elemento.tipo).toBe('if');
    expect((elemento.entonces as unknown as { elementos: { tipo: string }[] }).elementos[0].tipo).toBe('no-soportado');
  });
});
