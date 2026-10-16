// RED de la tarea 2.16 (REQ-EJEC-005, design.md §3.1, ADR 005 punto 1): `generarIr` BAJA el AST del subconjunto a la IR tipada. Cada operación
// ya sabe su tipo, las conversiones implícitas son nodos visibles, cada local tiene su ranura, cada llamada a la biblioteca su clave de firma
// y cada paso su plan de evaluación en el orden de Java. Lo que el puerto de la biblioteca no sabe hacer (todo, mientras la parte A no se
// integre) se rechaza con `ErrorDeEjecucionNoDisponible` y el rango real: nunca un resultado inventado (D2, regla 5 de CLAUDE.md).
// Reemplaza a las pruebas de la rebanada vertical (0.12 y 1.8), cuya IR solo conocía `println("literal")`.
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { analizarPrograma } from '../sintaxis/analizador-sintactico.ts';
import { PUERTO_VACIO, type OperacionDeBiblioteca, type PuertoBiblioteca } from '../interprete/puerto-biblioteca.ts';
import { ErrorDeEjecucionNoDisponible } from './error-de-ejecucion-no-disponible.ts';
import { generarIr } from './generar-ir.ts';
import type { ExpresionIr, ProgramaIr, RaizIr, SentenciaIr } from './ir.ts';

const NADA: OperacionDeBiblioteca = () => undefined;

function puertoCon(claves: readonly string[], conDouble = false): PuertoBiblioteca {
  return {
    operaciones: new Map(claves.map((clave) => [clave, NADA])),
    doubleATexto: conDouble ? (valor) => String(valor) : null,
  };
}

const PREFIJO = 'public class MiPrograma {\n  public static void main(String[] args) {\n';
const SUFIJO = '\n  }\n}\n';

function irDe(cuerpo: string, puerto: PuertoBiblioteca = PUERTO_VACIO): ProgramaIr {
  const fuente = `${PREFIJO}${cuerpo}${SUFIJO}`;
  return generarIr(analizarPrograma(tokenizar(fuente)), { fuente, puerto });
}

/** La expresión de una IR como texto corto: `(total +:int (precio *:int 2))`, `char→int(c)`, `System.out.println(...)`. */
function mostrar(e: ExpresionIr): string {
  switch (e.forma) {
    case 'constante':
      return typeof e.valor === 'string' ? JSON.stringify(e.valor) : `${String(e.valor)}${e.tipo === 'long' ? 'L' : ''}`;
    case 'lectura':
      return e.nombre;
    case 'conversion':
      return `${e.de}→${e.tipo}${e.implicita ? '' : '!'}(${mostrar(e.operando)})`;
    case 'aritmetica':
      return `(${mostrar(e.izquierda)} ${e.operador}:${e.tipo} ${mostrar(e.derecha)})`;
    case 'menos':
      return `-${e.tipo}(${mostrar(e.operando)})`;
    case 'comparacion':
      return `(${mostrar(e.izquierda)} ${e.operador}:${e.tipoOperandos} ${mostrar(e.derecha)})`;
    case 'logica':
      return `(${mostrar(e.izquierda)} ${e.operador} ${mostrar(e.derecha)})`;
    case 'negacion':
      return `!${mostrar(e.operando)}`;
    case 'concatenacion':
      return `(${mostrar(e.izquierda)} ++ ${mostrar(e.derecha)})`;
    case 'asignacion':
      return `${e.nombre} = ${mostrar(e.valor)}`;
    case 'asignacion-compuesta':
      return `${e.nombre} ${e.operador}=:${e.tipoOperacion} ${mostrar(e.valor)}`;
    case 'incremento':
      return e.posicion === 'postfijo' ? `${e.nombre}${e.delta === 1 ? '++' : '--'}` : `${e.delta === 1 ? '++' : '--'}${e.nombre}`;
    case 'llamada':
      return `${e.receptor === null ? (e.flujo === null ? '' : `System.${e.flujo}.`) : `${mostrar(e.receptor)}.`}${e.clave}(${[...e.argumentos, ...(e.variables ?? [])].map(mostrar).join(', ')})`;
    case 'nuevo':
      return `new ${e.clave}(${e.argumentos.map(mostrar).join(', ')})`;
  }
}

function raicesDe(sentencia: SentenciaIr): readonly RaizIr[] {
  switch (sentencia.forma) {
    case 'declaracion':
      return sentencia.declaradores.flatMap((d) => (d.inicializador === null ? [] : [d.inicializador]));
    case 'expresion':
      return sentencia.raices;
    default:
      throw new Error(`sin raíces en ${sentencia.forma}`);
  }
}

function textoDe(sentencia: SentenciaIr): string[] {
  return raicesDe(sentencia).map((raiz) => mostrar(raiz.expresion));
}

function formasDelPlan(ir: ProgramaIr, sentencia: SentenciaIr): string[] {
  if (sentencia.forma !== 'declaracion' && sentencia.forma !== 'expresion') throw new Error('sin plan');
  return ir.nodos[sentencia.nodo].plan.map((punto) => punto.forma);
}

describe('generarIr: declaraciones y aritmética de int', () => {
  it('baja `int total = a + b * 2;` con la precedencia del árbol y una ranura por variable', () => {
    const ir = irDe('    int a = 2;\n    int b = 3;\n    int total = a + b * 2;');
    expect(ir.ranuras.map((r) => `${r.indice}:${r.nombre}:${r.tipo}`)).toEqual(['0:a:int', '1:b:int', '2:total:int']);
    expect(textoDe(ir.sentencias[2])).toEqual(['(a +:int (b *:int 2))']);
  });

  it('el plan de evaluación va en el orden de Java: izquierdo, derecho, operador (cada subexpresión antes que la que la contiene)', () => {
    const ir = irDe('    int a = 2;\n    int b = 3;\n    int total = a + b * 2;');
    expect(formasDelPlan(ir, ir.sentencias[2])).toEqual(['lectura', 'lectura', 'constante', 'aritmetica', 'aritmetica']);
    const plan = ir.nodos[(ir.sentencias[2] as { nodo: number }).nodo].plan;
    expect(plan.map((p) => p.nombre ?? null)).toEqual(['a', 'b', null, null, null]);
  });

  it('cada expresión sabe su `punto` en el plan: el de la raíz es el último', () => {
    const ir = irDe('    int a = 2;\n    int total = a + 1;');
    const raiz = raicesDe(ir.sentencias[1])[0];
    expect(raiz.expresion.punto).toBe(2);
    expect(raiz.texto).toBe('a + 1');
  });

  it('una declaración sin inicializador no tiene raíz ni plan; con varios declaradores es UN paso', () => {
    const ir = irDe('    int x, y = 5, z;');
    const declaracion = ir.sentencias[0];
    if (declaracion.forma !== 'declaracion') throw new Error('se esperaba declaracion');
    expect(declaracion.declaradores.map((d) => `${d.nombre}:${d.inicializador === null ? 'sin valor' : 'con valor'}`)).toEqual(['x:sin valor', 'y:con valor', 'z:sin valor']);
    expect(ir.nodos[declaracion.nodo].plan.map((p) => p.forma)).toEqual(['constante']);
  });

  it('el literal -2147483648 es MIN_VALUE: el analizador ya lo entrega como un solo literal (no existe 2147483648 como int)', () => {
    const ir = irDe('    int m = -2147483648;\n    long l = -9223372036854775808L;');
    expect(textoDe(ir.sentencias[0])).toEqual(['-2147483648']);
    expect(textoDe(ir.sentencias[1])).toEqual(['-9223372036854775808L']);
  });
});

describe('generarIr: conversiones implícitas visibles (promoción numérica y asignación)', () => {
  it("`c + 1` con `char c` promueve el char a int: char→int(c) es un nodo del plan", () => {
    const ir = irDe("    char c = 'a';\n    int n = c + 1;");
    expect(textoDe(ir.sentencias[0])).toEqual(['97']);
    expect(textoDe(ir.sentencias[1])).toEqual(['(char→int(c) +:int 1)']);
    expect(formasDelPlan(ir, ir.sentencias[1])).toEqual(['lectura', 'conversion', 'constante', 'aritmetica']);
  });

  it('`long l = n;` ensancha int a long, y `l * 2` promueve el 2 a long', () => {
    const ir = irDe('    int n = 4;\n    long l = n;\n    long m = l * 2;');
    expect(textoDe(ir.sentencias[1])).toEqual(['int→long(n)']);
    expect(textoDe(ir.sentencias[2])).toEqual(['(l *:long int→long(2))']);
  });

  it('un literal long y la aritmética de long llevan tipo long', () => {
    const ir = irDe('    long big = 9223372036854775807L + 1L;');
    expect(textoDe(ir.sentencias[0])).toEqual(['(9223372036854775807L +:long 1L)']);
  });

  it('`char c = 65;` estrecha la constante int a char (conversión implícita int→char)', () => {
    const ir = irDe('    char c = 65;');
    expect(textoDe(ir.sentencias[0])).toEqual(['int→char(65)']);
  });

  it('un cast es una conversión explícita sobre el operando inmediato: `(long) a * b` convierte solo a', () => {
    const ir = irDe('    int a = 3;\n    int b = 4;\n    long p = (long) a * b;');
    expect(textoDe(ir.sentencias[2])).toEqual(['(int→long!(a) *:long int→long(b))']);
  });

  it('un cast al mismo tipo no deja nodo', () => {
    const ir = irDe('    int a = 3;\n    int b = (int) a;');
    expect(textoDe(ir.sentencias[1])).toEqual(['a']);
  });

  it('con double (puerto con Double.toString): `double d = n / 2;` divide como int y luego ensancha; `n / 2.0` promueve el n', () => {
    const ir = irDe('    int n = 5;\n    double d = n / 2;\n    double e = n / 2.0;', puertoCon([], true));
    expect(textoDe(ir.sentencias[1])).toEqual(['int→double((n /:int 2))']);
    expect(textoDe(ir.sentencias[2])).toEqual(['(int→double(n) /:double 2)']);
  });
});

describe('generarIr: asignaciones, compuestas e incrementos', () => {
  it('`x = x + 1;` es un paso `asignacion` cuyo plan termina en el nodo de asignación', () => {
    const ir = irDe('    int x = 1;\n    x = x + 1;');
    const sentencia = ir.sentencias[1];
    if (sentencia.forma !== 'expresion') throw new Error('se esperaba expresion');
    expect(sentencia.clasePaso).toBe('asignacion');
    expect(textoDe(sentencia)).toEqual(['x = (x +:int 1)']);
    expect(formasDelPlan(ir, sentencia)).toEqual(['lectura', 'constante', 'aritmetica', 'asignacion']);
  });

  it('`x += 2 * 3;` lee `x` PRIMERO (lectura previa en el plan), luego el valor, y al final la asignación', () => {
    const ir = irDe('    int x = 1;\n    x += 2 * 3;');
    expect(textoDe(ir.sentencias[1])).toEqual(['x +=:int (2 *:int 3)']);
    expect(formasDelPlan(ir, ir.sentencias[1])).toEqual(['lectura', 'constante', 'constante', 'aritmetica', 'asignacion-compuesta']);
  });

  it('`x += 1.5` con x int opera en double y estrecha de vuelta (tipoOperacion double); `s += 1` concatena', () => {
    const ir = irDe('    int x = 1;\n    String s = "a";\n    x += 1.5;\n    s += 1;', puertoCon([], true));
    expect(textoDe(ir.sentencias[2])).toEqual(['x +=:double 1.5']);
    expect(textoDe(ir.sentencias[3])).toEqual(['s +=:String 1']);
  });

  it('`i++`, `++i`, `i--` son pasos `asignacion` de un solo punto', () => {
    const ir = irDe('    int i = 0;\n    i++;\n    ++i;\n    i--;');
    expect(ir.sentencias.slice(1).map((s) => textoDe(s)[0])).toEqual(['i++', '++i', 'i--']);
    expect(ir.sentencias.slice(1).map((s) => formasDelPlan(ir, s))).toEqual([['incremento'], ['incremento'], ['incremento']]);
    expect((ir.sentencias[1] as { clasePaso: string }).clasePaso).toBe('asignacion');
  });
});

describe('generarIr: operadores lógicos, de comparación y concatenación', () => {
  it('`a > 0 && b > 0` conserva el corto circuito: lógica con dos comparaciones; el plan lleva izquierda, derecha y operador', () => {
    const ir = irDe('    int a = 1;\n    int b = 2;\n    boolean ok = a > 0 && b > 0;');
    expect(textoDe(ir.sentencias[2])).toEqual(['((a >:int 0) && (b >:int 0))']);
    expect(formasDelPlan(ir, ir.sentencias[2])).toEqual(['lectura', 'constante', 'comparacion', 'lectura', 'constante', 'comparacion', 'logica']);
  });

  it('`!`, `==` de booleanos y `==` de referencias (String) se distinguen por tipoOperandos', () => {
    const ir = irDe('    boolean p = true;\n    String s = "a";\n    boolean q = !p;\n    boolean r = p == q;\n    boolean t = s == "a";');
    expect(textoDe(ir.sentencias[2])).toEqual(['!p']);
    expect(textoDe(ir.sentencias[3])).toEqual(['(p ==:boolean q)']);
    expect(textoDe(ir.sentencias[4])).toEqual(['(s ==:referencia "a")']);
  });

  it('una comparación mixta int con long promueve a long; char con int promueve a int', () => {
    const ir = irDe("    int a = 1;\n    long b = 2;\n    char c = 'x';\n    boolean r1 = a < b;\n    boolean r2 = c == 120;");
    expect(textoDe(ir.sentencias[3])).toEqual(['(int→long(a) <:long b)']);
    expect(textoDe(ir.sentencias[4])).toEqual(['(char→int(c) ==:int 120)']);
  });

  it('el `+` con un String concatena de izquierda a derecha: "n=" + n + 2 es ("n=" ++ n) ++ 2; n + 2 + "x" suma primero', () => {
    const ir = irDe('    int n = 1;\n    String a = "n=" + n + 2;\n    String b = n + 2 + "x";');
    expect(textoDe(ir.sentencias[1])).toEqual(['(("n=" ++ n) ++ 2)']);
    expect(textoDe(ir.sentencias[2])).toEqual(['((n +:int 2) ++ "x")']);
  });

  it('una concatenación de constantes se pliega a UNA constante String (para que `"ho" + "la" == "hola"` sea true por el pool)', () => {
    const ir = irDe('    String t = "ho" + "la";\n    final String P = "a";\n    String u = P + "b";');
    expect(textoDe(ir.sentencias[0])).toEqual(['"hola"']);
    expect(textoDe(ir.sentencias[2])).toEqual(['"ab"']);
  });

  it('el menos unario promueve el char: -c es -int(char→int(c))', () => {
    const ir = irDe("    char c = 'a';\n    int n = -c;\n    int p = +c;");
    expect(textoDe(ir.sentencias[1])).toEqual(['-int(char→int(c))']);
    expect(textoDe(ir.sentencias[2])).toEqual(['char→int(c)']);
  });
});

describe('generarIr: impresión', () => {
  it('`System.out.println("Hola")` es un paso `impresion` con una llamada NATIVA a PrintStream.println(String) sobre el flujo out', () => {
    const ir = irDe('    System.out.println("Hola");');
    const sentencia = ir.sentencias[0];
    if (sentencia.forma !== 'expresion') throw new Error('se esperaba expresion');
    expect(sentencia.clasePaso).toBe('impresion');
    const llamada = sentencia.raices[0].expresion;
    expect(llamada).toMatchObject({ forma: 'llamada', clave: 'PrintStream.println(java.lang.String)', flujo: 'out', receptor: null, esNativa: true, tipo: null });
    expect(textoDe(sentencia)).toEqual(['System.out.PrintStream.println(java.lang.String)("Hola")']);
    expect(formasDelPlan(ir, sentencia)).toEqual(['constante', 'llamada']);
  });

  it('elige la sobrecarga por el tipo ESTÁTICO: println(char), println(int) con "A"+1... print(long), println(boolean), println()', () => {
    const ir = irDe("    System.out.println('A');\n    System.out.println('A' + 1);\n    System.out.print(5L);\n    System.out.println(true);\n    System.out.println();");
    const claves = ir.sentencias.map((s) => {
      if (s.forma !== 'expresion') throw new Error('se esperaba expresion');
      const llamada = s.raices[0].expresion;
      if (llamada.forma !== 'llamada') throw new Error('se esperaba llamada');
      return llamada.clave;
    });
    expect(claves).toEqual([
      'PrintStream.println(char)',
      'PrintStream.println(int)',
      'PrintStream.print(long)',
      'PrintStream.println(boolean)',
      'PrintStream.println()',
    ]);
  });

  it('`System.err.println(x)` es la misma llamada sobre el flujo err', () => {
    const ir = irDe('    int x = 1;\n    System.err.println(x);');
    const sentencia = ir.sentencias[1];
    if (sentencia.forma !== 'expresion') throw new Error('se esperaba expresion');
    expect(sentencia.raices[0].expresion).toMatchObject({ forma: 'llamada', clave: 'PrintStream.println(int)', flujo: 'err' });
  });

  it('imprimir un double exige Double.toString: sin él es ejecucion-no-disponible; con él, println(double)', () => {
    expect(() => irDe('    System.out.println(1.5);')).toThrow(ErrorDeEjecucionNoDisponible);
    const ir = irDe('    System.out.println(1.5);', puertoCon([], true));
    const sentencia = ir.sentencias[0];
    if (sentencia.forma !== 'expresion') throw new Error('se esperaba expresion');
    expect(sentencia.raices[0].expresion).toMatchObject({ clave: 'PrintStream.println(double)' });
  });
});

describe('generarIr: lo que la biblioteca (puerto) no sabe NO se ejecuta, con el rango real', () => {
  it('un double sin Double.toString: ErrorDeEjecucionNoDisponible con el rango de la declaración, no un error de sintaxis', () => {
    const cuerpo = '    int n = 1;\n    double d = 2.5;';
    const fuente = `${PREFIJO}${cuerpo}${SUFIJO}`;
    try {
      generarIr(analizarPrograma(tokenizar(fuente)), { fuente, puerto: PUERTO_VACIO });
      expect.unreachable('debía rechazarse');
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorDeEjecucionNoDisponible);
      const rango = (error as ErrorDeEjecucionNoDisponible).rango;
      expect(fuente.slice(rango.inicio, rango.inicio + 6)).toBe('double');
    }
  });

  it('una llamada a la biblioteca sin esa operación en el puerto: ErrorDeEjecucionNoDisponible; con ella, LlamadaIr con su clave', () => {
    expect(() => irDe('    int a = Math.abs(-5);')).toThrow(ErrorDeEjecucionNoDisponible);
    const ir = irDe('    int a = Math.abs(-5);', puertoCon(['Math.abs(int)']));
    const raiz = raicesDe(ir.sentencias[0])[0];
    expect(raiz.expresion).toMatchObject({ forma: 'llamada', clave: 'Math.abs(int)', receptor: null, flujo: null, esNativa: false, tipo: 'int' });
    expect(raiz.conBiblioteca).toBe(true);
  });

  it('un método de instancia: el receptor va primero en el plan, luego los argumentos, luego la llamada', () => {
    const ir = irDe('    String s = "hola";\n    char c = s.charAt(1);', puertoCon(['String.charAt(int)']));
    expect(textoDe(ir.sentencias[1])).toEqual(['s.String.charAt(int)(1)']);
    expect(formasDelPlan(ir, ir.sentencias[1])).toEqual(['lectura', 'constante', 'llamada']);
  });

  it('un String donde la firma pide CharSequence u Object (`contains`, `replace`, `equals`) se pasa tal cual: la clave lleva los tipos reflejados del JDK', () => {
    const puerto = puertoCon(['String.contains(java.lang.CharSequence)', 'String.equals(java.lang.Object)', 'String.replace(java.lang.CharSequence,java.lang.CharSequence)']);
    const ir = irDe('    String s = "hola";\n    boolean a = s.contains("ol");\n    boolean b = s.equals("hola");\n    String c = s.replace("o", "0");', puerto);
    expect([1, 2, 3].map((i) => (raicesDe(ir.sentencias[i])[0].expresion as { clave: string }).clave)).toEqual([
      'String.contains(java.lang.CharSequence)',
      'String.equals(java.lang.Object)',
      'String.replace(java.lang.CharSequence,java.lang.CharSequence)',
    ]);
  });

  it('`new Scanner(System.in)` sin el constructor en el puerto: no disponible; con él, NuevoIr sin argumentos (el System.in lo dice la clave)', () => {
    expect(() => irDe('    Scanner sc = new Scanner(System.in);')).toThrow(ErrorDeEjecucionNoDisponible);
    const ir = irDe('    Scanner sc = new Scanner(System.in);', puertoCon(['Scanner.<init>(java.io.InputStream)']));
    expect(raicesDe(ir.sentencias[0])[0].expresion).toMatchObject({ forma: 'nuevo', clave: 'Scanner.<init>(java.io.InputStream)', tipo: 'Scanner', argumentos: [] });
  });

  it('`printf` empaqueta los argumentos variables con su tipo estático', () => {
    const ir = irDe('    int n = 3;\n    System.out.printf("%d %s%n", n, "x");', puertoCon(['PrintStream.printf(java.lang.String,java.lang.Object[])']));
    const sentencia = ir.sentencias[1];
    if (sentencia.forma !== 'expresion') throw new Error('se esperaba expresion');
    expect(sentencia.clasePaso).toBe('impresion');
    const llamada = sentencia.raices[0].expresion;
    if (llamada.forma !== 'llamada') throw new Error('se esperaba llamada');
    expect(llamada.flujo).toBe('out');
    expect(llamada.argumentos.map(mostrar)).toEqual(['"%d %s%n"']);
    expect((llamada.variables ?? []).map((v) => `${mostrar(v)}:${v.tipo}`)).toEqual(['n:int', '"x":String']);
  });

  it('concatenar un Scanner o un Random (su toString de Java) no se ejecuta: ejecucion-no-disponible, nunca un texto inventado', () => {
    const puerto = puertoCon(['Scanner.<init>(java.io.InputStream)', 'Random.<init>()']);
    expect(() => irDe('    Scanner sc = new Scanner(System.in);\n    String s = "x" + sc;', puerto)).toThrow(ErrorDeEjecucionNoDisponible);
    expect(() => irDe('    Random r = new Random();\n    String s = r + "x";', puerto)).toThrow(ErrorDeEjecucionNoDisponible);
    expect(() => irDe('    Random r = new Random();\n    String s = "";\n    s += r;', puerto)).toThrow(ErrorDeEjecucionNoDisponible);
  });

  it('las constantes de Integer y Long (MAX_VALUE, MIN_VALUE) son constantes del propio intérprete', () => {
    const ir = irDe('    int a = Integer.MAX_VALUE;\n    long b = Long.MIN_VALUE;');
    expect(textoDe(ir.sentencias[0])).toEqual(['2147483647']);
    expect(textoDe(ir.sentencias[1])).toEqual(['-9223372036854775808L']);
  });
});

describe('generarIr: lo que se puede decidir en la compilación NO se deja para la mitad de la ejecución (hito 1, parte C, D2)', () => {
  const PRINTF = 'PrintStream.printf(java.lang.String,java.lang.Object[])';
  const FORMAT = 'String.format(java.lang.String,java.lang.Object[])';
  const SCANNER = 'Scanner.<init>(java.io.InputStream)';

  function noDisponibleDe(cuerpo: string, puerto: PuertoBiblioteca): ErrorDeEjecucionNoDisponible {
    try {
      irDe(cuerpo, puerto);
    } catch (error) {
      if (error instanceof ErrorDeEjecucionNoDisponible) return error;
      throw error;
    }
    throw new Error('se esperaba ErrorDeEjecucionNoDisponible y el programa bajó sin problema');
  }

  describe('printf y String.format con un patrón LITERAL', () => {
    it.each([
      ['%e', '    System.out.printf("%e%n", 1.5);'],
      ['%x', '    System.out.printf("%x", 255);'],
      ['%+d', '    System.out.printf("%+d", 5);'],
      ['%1$d', '    System.out.printf("%1$d", 5);'],
      ['%tY', '    System.out.printf("%tY", 5);'],
    ])('el especificador %s está fuera del alcance medido: no disponible en la compilación, con el rango de la llamada', (_especificador, cuerpo) => {
      const error = noDisponibleDe(cuerpo, puertoCon([PRINTF], true));
      expect(error.message).toContain('printf');
      expect(`${PREFIJO}${cuerpo}${SUFIJO}`.slice(error.rango.inicio, error.rango.fin)).toContain('System.out.printf');
    });

    it('lo mismo con String.format', () => {
      expect(() => irDe('    String s = String.format("%e", 1.5);', puertoCon([FORMAT], true))).toThrow(ErrorDeEjecucionNoDisponible);
    });

    it('un patrón dentro del alcance baja a una llamada; uno que Java RECHAZARÍA (%i) también: la excepción es de la ejecución, no un aviso', () => {
      const puerto = puertoCon([PRINTF], true);
      expect(() => irDe('    System.out.printf("%d %s %.2f %c %b%n", 1, "a", 2.5, \'x\', true);', puerto)).not.toThrow();
      expect(() => irDe('    System.out.printf("%i", 1);', puerto)).not.toThrow();
    });

    it('el patrón es una constante de compilación: una variable final o una concatenación de literales también se revisan', () => {
      const puerto = puertoCon([PRINTF], true);
      expect(() => irDe('    final String F = "%x";\n    System.out.printf(F, 255);', puerto)).toThrow(ErrorDeEjecucionNoDisponible);
      expect(() => irDe('    System.out.printf("%" + "x", 255);', puerto)).toThrow(ErrorDeEjecucionNoDisponible);
      expect(() => irDe('    final String F = "%d";\n    System.out.printf(F + "%n", 255);', puerto)).not.toThrow();
    });

    it('un patrón que NO es constante (una variable, lo que lee Scanner) se decide en ejecución: no hay forma de saberlo antes', () => {
      expect(() => irDe('    String f = "%x";\n    System.out.printf(f, 255);', puertoCon([PRINTF], true))).not.toThrow();
    });
  });

  describe('Double.parseDouble con un literal hexadecimal', () => {
    const PARSE = 'Double.parseDouble(java.lang.String)';

    it('un literal hexadecimal de punto flotante es no disponible en la compilación (Java lo acepta; el motor no lo ha medido)', () => {
      expect(() => irDe('    double d = Double.parseDouble("0x1p3");', puertoCon([PARSE], true))).toThrow(ErrorDeEjecucionNoDisponible);
      expect(() => irDe('    final String H = "0X1.8p1";\n    double d = Double.parseDouble(H);', puertoCon([PARSE], true))).toThrow(ErrorDeEjecucionNoDisponible);
    });

    it('un literal decimal baja sin problema, y uno inválido ("abc") también: la NumberFormatException es de la ejecución', () => {
      const puerto = puertoCon([PARSE], true);
      expect(() => irDe('    double d = Double.parseDouble("1.5");', puerto)).not.toThrow();
      expect(() => irDe('    double d = Double.parseDouble("abc");', puerto)).not.toThrow();
    });

    it('un texto que no es constante (lo que teclea el alumno) se decide en ejecución', () => {
      expect(() => irDe('    String t = "0x1p3";\n    double d = Double.parseDouble(t);', puertoCon([PARSE], true))).not.toThrow();
    });
  });

  describe('un solo Scanner sobre System.in (REQ-SUB-005): con dos, Java reparte la entrada entre sus búferes y el motor no lo modela', () => {
    it('dos `new Scanner(System.in)` en el programa: no disponible, con el rango del SEGUNDO', () => {
      const cuerpo = '    Scanner a = new Scanner(System.in);\n    Scanner b = new Scanner(System.in);';
      const error = noDisponibleDe(cuerpo, puertoCon([SCANNER]));
      const fuente = `${PREFIJO}${cuerpo}${SUFIJO}`;
      expect(fuente.slice(0, error.rango.inicio).split('\n').length).toBe(4);
    });

    it('un `new Scanner(System.in)` dentro de un ciclo se ejecuta varias veces: no disponible (while, do-while y for, en el cuerpo)', () => {
      const puerto = puertoCon([SCANNER]);
      expect(() => irDe('    int i = 0;\n    while (i < 3) {\n      Scanner s = new Scanner(System.in);\n      i++;\n    }', puerto)).toThrow(ErrorDeEjecucionNoDisponible);
      expect(() => irDe('    int i = 0;\n    do {\n      Scanner s = new Scanner(System.in);\n      i++;\n    } while (i < 3);', puerto)).toThrow(ErrorDeEjecucionNoDisponible);
      expect(() => irDe('    for (int i = 0; i < 3; i++) {\n      Scanner s = new Scanner(System.in);\n    }', puerto)).toThrow(ErrorDeEjecucionNoDisponible);
    });

    it('un solo Scanner, antes o después de los ciclos, o dentro de un if, baja sin problema', () => {
      const puerto = puertoCon([SCANNER, 'Scanner.nextInt()']);
      expect(() => irDe('    Scanner sc = new Scanner(System.in);\n    int i = 0;\n    while (i < 3) {\n      int n = sc.nextInt();\n      i++;\n    }', puerto)).not.toThrow();
      expect(() => irDe('    int i = 0;\n    while (i < 3) {\n      i++;\n    }\n    Scanner sc = new Scanner(System.in);', puerto)).not.toThrow();
      expect(() => irDe('    boolean b = true;\n    if (b) {\n      Scanner sc = new Scanner(System.in);\n    }', puerto)).not.toThrow();
    });
  });

  describe('Math.round de un entero: se resuelve a round(float), y el subconjunto no tiene float', () => {
    const REDONDEO = puertoCon(['Math.round(float)', 'Math.round(double)'], true);

    it.each([
      ['int', '    int n = 5;\n    long r = Math.round(n);', 'n'],
      ['long', '    long n = 5L;\n    int r = Math.round(n);', 'n'],
      ['char', "    char c = 'a';\n    int r = Math.round(c);", 'c'],
    ])('Math.round(%s) baja a la clave Math.round(float) con el argumento SIN convertir (la operación sabe pasarlo a float)', (tipo, cuerpo, nombre) => {
      // Math.round(int) e (long) no existen: Java toma round(float); el resultado es `int` (no `long`).
      const cuerpoCorregido = tipo === 'int' ? cuerpo.replace('long r', 'int r') : cuerpo;
      const ir = irDe(cuerpoCorregido, REDONDEO);
      const llamada = raicesDe(ir.sentencias[1])[0].expresion;
      expect(llamada).toMatchObject({ forma: 'llamada', clave: 'Math.round(float)', tipo: 'int' });
      if (llamada.forma !== 'llamada') throw new Error('se esperaba llamada');
      expect(llamada.argumentos.map(mostrar)).toEqual([nombre]);
    });

    it('Math.round de un double sigue siendo round(double), que devuelve long', () => {
      const ir = irDe('    double d = 2.5;\n    long r = Math.round(d);', REDONDEO);
      expect(raicesDe(ir.sentencias[1])[0].expresion).toMatchObject({ clave: 'Math.round(double)', tipo: 'long' });
    });
  });

  describe('un Scanner o un Random no se convierte en texto: su toString lleva una dirección de memoria', () => {
    it('como argumento variable de printf o String.format: no disponible (antes solo se revisaba la concatenación)', () => {
      const puerto = puertoCon([PRINTF, FORMAT, SCANNER, 'Random.<init>()'], true);
      expect(() => irDe('    Scanner sc = new Scanner(System.in);\n    System.out.printf("%s", sc);', puerto)).toThrow(ErrorDeEjecucionNoDisponible);
      expect(() => irDe('    Random r = new Random();\n    String s = String.format("%s", r);', puerto)).toThrow(ErrorDeEjecucionNoDisponible);
    });

    it('como argumento de String.valueOf(Object): no disponible; pero String.equals(Object) con un Scanner es válido (siempre false)', () => {
      const puerto = puertoCon(['String.valueOf(java.lang.Object)', 'String.equals(java.lang.Object)', SCANNER]);
      expect(() => irDe('    Scanner sc = new Scanner(System.in);\n    String s = String.valueOf(sc);', puerto)).toThrow(ErrorDeEjecucionNoDisponible);
      expect(() => irDe('    Scanner sc = new Scanner(System.in);\n    String t = "x";\n    boolean b = t.equals(sc);', puerto)).not.toThrow();
      expect(() => irDe('    String t = "x";\n    String s = String.valueOf(t);', puerto)).not.toThrow();
    });
  });
});

describe('generarIr: control de flujo', () => {
  it('if / else if / else: la condición de cada `if` es su propio nodo; el `else if` es un `if` dentro de `sino`', () => {
    const ir = irDe('    int n = 5;\n    if (n < 0) {\n      n = 1;\n    } else if (n == 0) {\n      n = 2;\n    } else {\n      n = 3;\n    }');
    const sentencia = ir.sentencias[1];
    if (sentencia.forma !== 'if') throw new Error('se esperaba if');
    expect(mostrar(sentencia.condicion.raiz.expresion)).toBe('(n <:int 0)');
    expect(ir.nodos[sentencia.condicion.nodo]).toMatchObject({ clase: 'condicion-if', linea: 4 });
    expect(sentencia.entonces.forma).toBe('bloque');
    const sino = sentencia.sino;
    if (sino === null || sino.forma !== 'if') throw new Error('se esperaba un if en sino');
    expect(mostrar(sino.condicion.raiz.expresion)).toBe('(n ==:int 0)');
    expect(ir.nodos[sino.condicion.nodo].linea).toBe(6);
    expect(sino.sino?.forma).toBe('bloque');
  });

  it('while y do-while: su nodo de ciclo y su condición son nodos distintos', () => {
    const ir = irDe('    int i = 0;\n    while (i < 3) {\n      i++;\n    }\n    do {\n      i--;\n    } while (i > 0);');
    const ciclo = ir.sentencias[1];
    if (ciclo.forma !== 'while') throw new Error('se esperaba while');
    expect(ir.nodos[ciclo.nodo]).toMatchObject({ clase: 'while', linea: 4 });
    expect(ir.nodos[ciclo.condicion.nodo]).toMatchObject({ clase: 'condicion-ciclo', linea: 4 });
    expect(ciclo.nodo).not.toBe(ciclo.condicion.nodo);
    const hacer = ir.sentencias[2];
    if (hacer.forma !== 'do-while') throw new Error('se esperaba do-while');
    expect(ir.nodos[hacer.condicion.nodo].linea).toBe(9);
  });

  it('for con declaración: inicio, condición, actualización y cuerpo; la variable del for está viva en todos', () => {
    const ir = irDe('    for (int i = 0; i < 3; i++) {\n      System.out.println(i);\n    }');
    const ciclo = ir.sentencias[0];
    if (ciclo.forma !== 'for') throw new Error('se esperaba for');
    expect(ciclo.inicio?.forma).toBe('declaracion');
    expect(mostrar(ciclo.condicion?.raiz.expresion as ExpresionIr)).toBe('(i <:int 3)');
    expect(textoDe(ciclo.actualizacion as SentenciaIr)).toEqual(['i++']);
    const indiceI = ir.ranuras.findIndex((r) => r.nombre === 'i');
    expect(ir.nodos[ciclo.condicion?.nodo ?? -1].vivas).toContain(indiceI);
    expect(ir.nodos[(ciclo.actualizacion as { nodo: number }).nodo].vivas).toContain(indiceI);
  });

  it('for con expresiones en el inicio y la actualización, y sin condición: `for (i = 0, j = 9; ; i++, j--)`', () => {
    const ir = irDe('    int i;\n    int j;\n    for (i = 0, j = 9; ; i++, j--) {\n      break;\n    }');
    const ciclo = ir.sentencias[2];
    if (ciclo.forma !== 'for') throw new Error('se esperaba for');
    expect(textoDe(ciclo.inicio as SentenciaIr)).toEqual(['i = 0', 'j = 9']);
    expect(ciclo.condicion).toBeNull();
    expect(textoDe(ciclo.actualizacion as SentenciaIr)).toEqual(['i++', 'j--']);
  });

  it('el bloque del for sin llaves y la sentencia vacía: `;` es un paso real', () => {
    const ir = irDe('    int i = 0;\n    while (i < 2) i++;\n    ;');
    expect(ir.sentencias[2].forma).toBe('vacia');
    const ciclo = ir.sentencias[1];
    if (ciclo.forma !== 'while') throw new Error('se esperaba while');
    expect(ciclo.cuerpo.forma).toBe('expresion');
  });

  it('switch de int: etiquetas con su valor numérico, `default`, y las sentencias del cuerpo en línea (caída)', () => {
    const ir = irDe('    int op = 2;\n    switch (op) {\n      case 1:\n        op = 10;\n      case 2:\n      case 3:\n        op = 20;\n        break;\n      default:\n        op = 0;\n    }');
    const sentencia = ir.sentencias[1];
    if (sentencia.forma !== 'switch') throw new Error('se esperaba switch');
    expect(sentencia.tipoSelector).toBe('int');
    expect(mostrar(sentencia.selector.expresion)).toBe('op');
    expect(sentencia.elementos.map((e) => (e.forma === 'caso' ? `caso ${String(e.valor)}` : e.forma === 'defecto' ? 'defecto' : e.sentencia.forma))).toEqual([
      'caso 1',
      'expresion',
      'caso 2',
      'caso 3',
      'expresion',
      'break',
      'defecto',
      'expresion',
    ]);
  });

  it("switch de char: `case 'a'` y `case 98` valen por su valor numérico; switch de String: por su texto", () => {
    const ir = irDe("    char c = 'a';\n    switch (c) {\n      case 'a':\n        break;\n      case 98:\n        break;\n    }\n    String s = \"x\";\n    switch (s) {\n      case \"x\":\n        break;\n    }");
    const porChar = ir.sentencias[1];
    const porTexto = ir.sentencias[3];
    if (porChar.forma !== 'switch' || porTexto.forma !== 'switch') throw new Error('se esperaban switch');
    expect(porChar.tipoSelector).toBe('char');
    expect(porChar.elementos.filter((e) => e.forma === 'caso').map((e) => (e as { valor: number | string }).valor)).toEqual([97, 98]);
    expect(porTexto.tipoSelector).toBe('String');
    expect(porTexto.elementos.filter((e) => e.forma === 'caso').map((e) => (e as { valor: number | string }).valor)).toEqual(['x']);
  });

  it('break, continue y return en main son pasos con su nodo', () => {
    const ir = irDe('    while (true) {\n      continue;\n    }');
    const ciclo = ir.sentencias[0];
    if (ciclo.forma !== 'while') throw new Error('se esperaba while');
    const cuerpo = ciclo.cuerpo;
    if (cuerpo.forma !== 'bloque') throw new Error('se esperaba bloque');
    expect(cuerpo.sentencias[0].forma).toBe('continue');
    const conRetorno = irDe('    return;');
    expect(conRetorno.sentencias[0].forma).toBe('return');
  });
});

describe('generarIr: nodos, líneas y variables vivas', () => {
  it('cada nodo lleva su línea (de la primera línea del programa) y sus variables vivas en ese punto', () => {
    const ir = irDe('    int a = 1;\n    {\n      int b = 2;\n      b = a + b;\n    }\n    int c = 3;');
    const [decA, bloque, decC] = ir.sentencias;
    if (decA.forma !== 'declaracion' || decC.forma !== 'declaracion' || bloque.forma !== 'bloque') throw new Error('forma inesperada');
    const nombres = (vivas: readonly number[]): string[] => vivas.map((i) => ir.ranuras[i].nombre);
    expect(ir.nodos[decA.nodo]).toMatchObject({ clase: 'declaracion', linea: 3 });
    expect(nombres(ir.nodos[decA.nodo].vivas)).toEqual(['a']);
    const asignacionB = bloque.sentencias[1];
    if (asignacionB.forma !== 'expresion') throw new Error('se esperaba expresion');
    expect(ir.nodos[asignacionB.nodo].linea).toBe(6);
    expect(nombres(ir.nodos[asignacionB.nodo].vivas)).toEqual(['a', 'b']);
    // `b` murió con su bloque: la `c` de después solo ve a `a` y a sí misma
    expect(nombres(ir.nodos[decC.nodo].vivas)).toEqual(['a', 'c']);
  });

  it('la clase del alumno queda en el programa, sin paquete (para el marco `at MiPrograma.main(MiPrograma.java:N)`)', () => {
    const ir = irDe('    ;');
    expect(ir).toMatchObject({ nombreClase: 'MiPrograma', paquete: null });
  });

  it('con `package`, el programa recuerda el paquete (el marco lleva el nombre calificado; el archivo no)', () => {
    const fuente = 'package aula.u3;\npublic class Demo {\n  public static void main(String[] args) {\n    ;\n  }\n}\n';
    const ir = generarIr(analizarPrograma(tokenizar(fuente)), { fuente, puerto: PUERTO_VACIO });
    expect(ir).toMatchObject({ nombreClase: 'Demo', paquete: 'aula.u3' });
  });

  it('sin `main` no hay nada que bajar: el programa queda vacío (el arranque lo reporta `crearEjecucion`)', () => {
    const fuente = 'public class Vacio {\n}\n';
    const ir = generarIr(analizarPrograma(tokenizar(fuente)), { fuente, puerto: PUERTO_VACIO });
    expect(ir.sentencias).toEqual([]);
    expect(ir.nodos).toEqual([]);
  });
});
