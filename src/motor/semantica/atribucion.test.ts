// RED de la tarea 1.7 (Atribución — símbolos, alcance, sombreado, `switch`, REQ-COMP-002/003) +
// pendiente heredado 1 (break/continue fuera de contexto, verificado contra javac 17 real: AMBOS
// casos viven en la MISMA pasada que un error de tipos — ver engram — así que `atribuir` los
// reporta junto con el resto, "el primero en el texto" cuando hay más de uno).
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { analizarPrograma } from '../sintaxis/analizador-sintactico.ts';
import { TablaDeLineas } from '../fuente/tabla-de-lineas.ts';
import { atribuir } from './atribucion.ts';

function atribuirCuerpo(cuerpoDeMain: string) {
  const programa = analizarPrograma(tokenizar(`class C { public static void main(String[] a) { ${cuerpoDeMain} } }`));
  return atribuir(programa);
}

// Deuda del commit 999a8ca (sub-lote 1-D1, err20 de exploracion/03): a diferencia de
// `atribuirCuerpo`, este helper SÍ deja controlar los imports del programa completo -- necesario
// para probar "Scanner sin import java.util.Scanner" de verdad (atribuirCuerpo nunca trae imports).
function atribuirPrograma(fuenteCompleta: string) {
  const programa = analizarPrograma(tokenizar(fuenteCompleta));
  return atribuir(programa);
}

describe('atribuir — programa válido no produce ningún problema', () => {
  it('declaraciones, if/while/for/switch e impresión de un literal: sin problemas', () => {
    const problemas = atribuirCuerpo(`
      int x = 5;
      if (x > 0) { int y = x + 1; }
      while (x > 0) { x = x - 1; }
      for (int i = 0; i < 3; i++) { int z = i; }
      switch (x) { case 1: break; default: break; }
    `);
    expect(problemas).toEqual([]);
  });
});

describe('atribuir — variable no declarada (REQ-COMP-002, "cannot find symbol")', () => {
  it('usar una variable que nunca se declaró', () => {
    const problemas = atribuirCuerpo('int y = edad + 1;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-no-declarada', datos: { nombre: 'edad' } });
  });

  it('triangulación: la variable de un "for" usada DESPUÉS de cerrarlo (REQ-COMP-002 escenario propio)', () => {
    const problemas = atribuirCuerpo('for (int i = 0; i < 3; i++) { } System.out.println("hecho"); int y = i;');
    expect(problemas.some((p) => p.codigo === 'variable-no-declarada' && p.datos['nombre'] === 'i')).toBe(true);
  });

  it('control: una variable SÍ declarada y usada dentro de su bloque no produce error', () => {
    expect(atribuirCuerpo('int edad = 5; int y = edad + 1;')).toEqual([]);
  });
});

describe('atribuir — método no declarado (err03 de exploracion/03: ningún método propio existe en el subconjunto)', () => {
  it('llamar una función libre nunca definida', () => {
    const problemas = atribuirCuerpo('saludar();');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'metodo-no-declarado', datos: { nombre: 'saludar' } });
  });
});

describe('atribuir — redeclaración en el mismo bloque (flow13 de exploracion/03)', () => {
  it('declarar "x" dos veces en el cuerpo de main', () => {
    const problemas = atribuirCuerpo('int x = 1; int x = 2;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-ya-definida', datos: { nombre: 'x' } });
  });
});

describe('atribuir — sombreado en bloque anidado (flow18/flow19 de exploracion/03)', () => {
  it('declarar "x" dentro de un "if" mientras la "x" externa sigue viva', () => {
    const problemas = atribuirCuerpo('int x = 5; if (true) { int x = 10; }');
    expect(problemas).toHaveLength(1);
    expect(problemas[0].codigo).toBe('variable-ya-definida');
  });

  it('triangulación: el índice de un "for" anidado coincide con una variable externa viva (flow19)', () => {
    const problemas = atribuirCuerpo('int i = 0; for (int i = 0; i < 3; i++) { }');
    expect(problemas.some((p) => p.codigo === 'variable-ya-definida')).toBe(true);
  });

  it('control: redeclarar en un bloque HERMANO (no anidado al mismo tiempo) es válido', () => {
    expect(atribuirCuerpo('if (true) { int y = 1; } if (true) { int y = 2; }')).toEqual([]);
  });
});

// Sub-lote 1-D2c: hueco flageado por 1-D2b (`task_c0cf2e6c`) — `sobrecargas.ts`/`catalogo-api.ts`
// (tareas 1.7/1.8) estaban completos y probados STANDALONE pero JAMÁS se invocaban desde
// `visitarLlamada`/`visitarAccesoMiembro`: un método real de Java pero no soportado (`s.split`,
// `Math.sin`) no producía ningún aviso. Cada caso está verificado contra javac 17 real (carpeta
// temporal, borrada) — ver el informe de la sesión para la transcripción completa.
describe('atribuir — biblioteca conectada a la atribución (sub-lote 1-D2c, REQ-SUB-005/007)', () => {
  it('String.split existe en el JDK pero no está soportado (REQ-SUB-007): aviso NO-DISP, nunca un error de tipos', () => {
    const problemas = atribuirCuerpo('String s = "a,b"; s.split(",");');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({
      categoria: 'no-disponible',
      codigo: 'miembro-de-biblioteca-no-soportado',
    });
  });

  it('triangulación: Math.sin(x) -- otra clase, mismo desenlace NO-DISP (trascendentes, REQ-SUB-007)', () => {
    const problemas = atribuirCuerpo('double x = 1.0; Math.sin(x);');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ categoria: 'no-disponible', codigo: 'miembro-de-biblioteca-no-soportado' });
  });

  it('triangulación: sc.hasNextInt() -- Scanner real (con import), mismo desenlace NO-DISP (REQ-SUB-007)', () => {
    const problemas = atribuirPrograma(
      'import java.util.Scanner; class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); sc.hasNextInt(); } }',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ categoria: 'no-disponible', codigo: 'miembro-de-biblioteca-no-soportado' });
  });

  it('s.lenght() (error de dedo real de un alumno) -- NO existe ningún miembro con ese nombre: "miembro-no-declarado" (verificado: javac da "cannot find symbol: method lenght()")', () => {
    const problemas = atribuirCuerpo('String s = "a"; s.lenght();');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'miembro-no-declarado', datos: { clase: 'String', nombre: 'lenght' } });
  });

  it('triangulación: Math.raiz(4) -- otra clase, mismo desenlace "miembro-no-declarado" (verificado: javac da "cannot find symbol: method raiz(int)")', () => {
    const problemas = atribuirCuerpo('Math.raiz(4);');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'miembro-no-declarado', datos: { clase: 'Math', nombre: 'raiz' } });
  });

  it('Math.max("a", 1) -- existe y está soportado, pero NINGÚN argumento real encaja: "sin-sobrecarga-aplicable" (verificado: javac da "no suitable method found for max(String,int)")', () => {
    const problemas = atribuirCuerpo('Math.max("a", 1);');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({
      codigo: 'sin-sobrecarga-aplicable',
      datos: { clase: 'Math', nombre: 'max', argumentos: ['String', 'int'] },
    });
  });

  it('triangulación: s.charAt("0") -- mismo desenlace "sin-sobrecarga-aplicable" con una clase distinta (verificado: javac da "incompatible types: String cannot be converted to int")', () => {
    const problemas = atribuirCuerpo('String s = "hola"; s.charAt("0");');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({
      codigo: 'sin-sobrecarga-aplicable',
      datos: { clase: 'String', nombre: 'charAt', argumentos: ['String'] },
    });
  });

  it('control: los usos correctos (soportados, sobrecarga real aplicable) NO producen ningún problema', () => {
    expect(atribuirCuerpo('String s = "hola"; s.charAt(0); s.length(); Math.max(1, 2);')).toEqual([]);
  });

  it('control: un argumento "desconocido" (Math.abs(-x), la promoción unaria que tipos.ts todavía no modela) NUNCA inventa "sin-sobrecarga-aplicable" -- D2, cascada suprimida', () => {
    expect(atribuirCuerpo('int x = 3; Math.abs(-x);')).toEqual([]);
  });

  it('control: una llamada encadenada (sc.nextLine().length()) resuelve el receptor real de la llamada externa por su tipo de retorno, sin ningún problema', () => {
    const problemas = atribuirPrograma(
      'import java.util.Scanner; class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); sc.nextLine().length(); } }',
    );
    expect(problemas).toEqual([]);
  });
});

// Sub-lote 1-D2c: acceso a miembro como VALOR (sin llamar) -- "cada acceso a miembro" del
// orquestador incluye campos (Math.PI, Integer.MAX_VALUE), no solo llamadas. Mismas 3 categorías
// que arriba, pero genero-restringidas a CAMPOS (`clasificarCampo`, JLS 6.5.6.1) -- un MÉTODO real
// del mismo nombre (p. ej. "String.length") nunca cuenta como campo, verificado contra javac 17
// real: "s.length" (sin paréntesis) da "cannot find symbol: variable length".
describe('atribuir — acceso a miembro como valor (sub-lote 1-D2c, REQ-SUB-005/007)', () => {
  it('control: Math.PI (campo real y soportado) no produce ningún problema', () => {
    expect(atribuirCuerpo('double p = Math.PI;')).toEqual([]);
  });

  it('Math.PIE (error de dedo) -- no existe ningún campo con ese nombre: "campo-no-declarado"', () => {
    const problemas = atribuirCuerpo('double p = Math.PIE;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'campo-no-declarado', datos: { clase: 'Math', nombre: 'PIE' } });
  });

  it('Integer.SIZE -- campo real del JDK, fuera de REQ-SUB-005: aviso NO-DISP (verificado: javac compila Integer.SIZE limpio)', () => {
    const problemas = atribuirCuerpo('int n = Integer.SIZE;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ categoria: 'no-disponible', codigo: 'miembro-de-biblioteca-no-soportado' });
  });

  it('triangulación: s.length (el MÉTODO String.length usado como si fuera un campo, sin paréntesis) -- "campo-no-declarado" (verificado: javac da "cannot find symbol: variable length")', () => {
    const problemas = atribuirCuerpo('String s = "hola"; int n = s.length;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'campo-no-declarado', datos: { clase: 'String', nombre: 'length' } });
  });
});

// Sub-lote 1-D2c: corrección descubierta al conectar la biblioteca real -- antes de esta
// corrección, "Scanner sc = ...;" SIN import producía DOS problemas ("tipo-requiere-import" +
// "miembro-de-biblioteca-no-soportado" de "sc.hasNextInt()"), nunca solo uno -- javac SIEMPRE
// suprime la cascada cuando el TIPO mismo no se resolvió (D2, nunca más permisivo/estricto que
// javac). Ver también el describe "err20" más abajo (control con import SÍ presente).
describe('atribuir — corrección: un tipo sin resolver (sin import) suprime la cascada sobre sus propios usos (sub-lote 1-D2c)', () => {
  it('"Scanner sc = ...; sc.hasNextInt();" SIN import da SOLO "tipo-requiere-import" -- nunca un segundo problema de "sc"', () => {
    const problemas = atribuirPrograma(
      'class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); sc.hasNextInt(); } }',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'tipo-requiere-import' });
  });
});

describe('atribuir — selector de switch inválido, integrado (REQ-COMP-002)', () => {
  it('switch sobre una variable "long" se reporta con el tipo real', () => {
    const problemas = atribuirCuerpo('long n = 5L; switch (n) { default: break; }');
    expect(problemas.some((p) => p.codigo === 'selector-de-switch-invalido' && p.datos['tipo'] === 'long')).toBe(true);
  });

  it('control: switch sobre int/char/String no produce problema', () => {
    expect(atribuirCuerpo('int x = 1; switch (x) { default: break; }')).toEqual([]);
  });
});

describe('atribuir — break fuera de contexto (err29 de exploracion/03, "break outside switch or loop")', () => {
  it('un "break" suelto en el cuerpo de main', () => {
    const problemas = atribuirCuerpo('break;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0].codigo).toBe('break-fuera-de-contexto');
  });

  it('control: "break" dentro de un while sí es válido', () => {
    expect(atribuirCuerpo('while (true) { break; }')).toEqual([]);
  });

  it('control: "break" dentro de un switch (sin ciclo) también es válido', () => {
    expect(atribuirCuerpo('int x = 1; switch (x) { default: break; }')).toEqual([]);
  });
});

describe('atribuir — continue fuera de contexto (err30 de exploracion/03, "continue outside of loop")', () => {
  it('un "continue" suelto', () => {
    const problemas = atribuirCuerpo('continue;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0].codigo).toBe('continue-fuera-de-contexto');
  });

  it('triangulación: "continue" dentro de un switch SIN ciclo envolvente también se rechaza (verificado contra javac)', () => {
    const problemas = atribuirCuerpo('int x = 1; switch (x) { case 1: continue; }');
    expect(problemas.some((p) => p.codigo === 'continue-fuera-de-contexto')).toBe(true);
  });

  it('control: "continue" dentro de un switch DENTRO de un while sí es válido (pasa a través del switch)', () => {
    expect(atribuirCuerpo('while (true) { int x = 1; switch (x) { default: continue; } }')).toEqual([]);
  });

  it('control: "continue" dentro de un for es válido', () => {
    expect(atribuirCuerpo('for (int i = 0; i < 3; i++) { continue; }')).toEqual([]);
  });
});

describe('atribuir — nombres de clase reconocidos nunca se marcan "variable no declarada"', () => {
  it('Math.round(x) no reporta "Math" como variable, solo revisa el argumento real', () => {
    // Descubrimiento real de la tarea 1.11 (verificado contra javac 17 real): "int r =
    // Math.round(3.5);" NO compila de verdad ("possible lossy conversion from long to int",
    // Math.round(double) retorna long) — es EXACTAMENTE el escenario de REQ-COMP-001. Antes de
    // 1.11 no existía el chequeo de asignación que lo detectara; el destino cambia a "long" para
    // seguir probando SOLO lo que este describe verifica (Math no se confunde con una variable).
    expect(atribuirCuerpo('int x = 5; long r = Math.round(3.5);')).toEqual([]);
  });

  it('triangulación: Scanner declarado y usado (sc.nextInt()) no reporta "sc" como no declarado', () => {
    const problemas = atribuirCuerpo('Scanner sc = new Scanner(System.in); int x = sc.nextInt();');
    expect(problemas.filter((p) => p.codigo === 'variable-no-declarada')).toEqual([]);
  });

  it('control: el OBJETO de un acceso a miembro que SÍ es una variable no declarada se reporta igual', () => {
    const problemas = atribuirCuerpo('int x = noDeclarada.length();');
    expect(problemas.some((p) => p.codigo === 'variable-no-declarada' && p.datos['nombre'] === 'noDeclarada')).toBe(true);
  });
});

describe('atribuir — varios problemas: se devuelven TODOS, ordenados por posición en el texto', () => {
  it('dos variables no declaradas en líneas distintas aparecen en orden de aparición', () => {
    const problemas = atribuirCuerpo('int uno = primera + 1; int dos = segunda + 1;');
    expect(problemas).toHaveLength(2);
    expect(problemas[0].datos['nombre']).toBe('primera');
    expect(problemas[1].datos['nombre']).toBe('segunda');
    expect(problemas[0].rango.inicio).toBeLessThan(problemas[1].rango.inicio);
  });
});

describe('atribuir — "println()" sin argumentos (corrección obligatoria, sub-lote 1-C2): argumento null no debe reventar la visita', () => {
  it('un "println()" vacío no produce ningún problema (nunca revienta al visitar un argumento null)', () => {
    expect(atribuirCuerpo('System.out.println();')).toEqual([]);
  });
});

describe('atribuir — redeclarar el parámetro de main ("a" en estas pruebas) también se rechaza (design.md §2.7: "incluido args")', () => {
  it('verificado contra javac 17 real: "int a = 5;" cuando main(String[] a) ya lo declaró', () => {
    const problemas = atribuirCuerpo('int a = 5;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-ya-definida', datos: { nombre: 'a' } });
  });
});

// Tarea 1.11 (cierre de REQ-COMP-001, catálogo `03` §4): errores de TIPO en la asignación/
// inicialización (JLS 5.2). "possible lossy conversion" (ambos numéricos, existe un cast que
// arreglaría el problema) es un código DISTINTO de "cannot be converted" (no existe ningún cast,
// p. ej. String -> int) — javac usa mensajes distintos para cada caso.
describe('atribuir — err04 de exploracion/03: conversión con pérdida en la inicialización (double -> int)', () => {
  it('"int x = 3.5;" se rechaza: "conversion-con-perdida" (double no cabe en int sin cast)', () => {
    const problemas = atribuirCuerpo('int x = 3.5;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'conversion-con-perdida', datos: { origen: 'double', destino: 'int' } });
  });

  it('triangulación: "long n = 5L; int x = n;" (long -> int) también es "conversion-con-perdida"', () => {
    // "a" colisionaría con el parámetro "a" de main(String[] a) del helper `atribuirCuerpo` (ver
    // engram: "landmine" ya documentado) — "n" evita esa redeclaración accidental.
    const problemas = atribuirCuerpo('long n = 5L; int x = n;');
    expect(problemas.some((p) => p.codigo === 'conversion-con-perdida')).toBe(true);
  });

  it('control: "int r = Math.round(3.5);" NO se rechaza (Math.round(double) YA da long -> hmm, este control usa double->int directo, sin round)', () => {
    // Control de ensanchamiento real (int/long/double/char siempre asignables "hacia arriba"):
    expect(atribuirCuerpo('int x = 5; long y = x; double z = y;')).toEqual([]);
  });

  it('control real de diseño (REQ-COMP-001, Math.round(double) asignado a int): "double x = 2.5; int r = Math.round(x);" se rechaza igual — Math.round(double) retorna long', () => {
    const problemas = atribuirCuerpo('double x = 2.5; int r = Math.round(x);');
    expect(problemas.some((p) => p.codigo === 'conversion-con-perdida' && p.datos['origen'] === 'long')).toBe(true);
  });

  it('control: "char c = 65;" SÍ compila (JLS 5.2: constante int que cabe en char, design.md §2.7)', () => {
    expect(atribuirCuerpo('char c = 65;')).toEqual([]);
  });

  it('triangulación negativa del control anterior: "char c = 70000;" (no cabe en 0..65535) SÍ se rechaza', () => {
    const problemas = atribuirCuerpo('char c = 70000;');
    expect(problemas.some((p) => p.codigo === 'conversion-con-perdida')).toBe(true);
  });
});

describe('atribuir — err12 de exploracion/03: tipos incompatibles sin ningún cast posible (String -> int)', () => {
  it('"int x = "5";" se rechaza: "tipos-incompatibles-en-asignacion" (String nunca convierte a int)', () => {
    const problemas = atribuirCuerpo('int x = "5";');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({
      codigo: 'tipos-incompatibles-en-asignacion',
      datos: { origen: 'String', destino: 'int' },
    });
  });

  it('control: "String s = "5";" (identidad) no se rechaza', () => {
    expect(atribuirCuerpo('String s = "5";')).toEqual([]);
  });
});

describe('atribuir — err13/err33 de exploracion/03: condición no booleana en if/while/do-while/for', () => {
  it('"if (x)" con x int (err13/err33: "incompatible types: int cannot be converted to boolean")', () => {
    const problemas = atribuirCuerpo('int x = 5; if (x) { }');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'condicion-no-booleana', datos: { tipo: 'int' } });
  });

  it('triangulación: "while (x)" con x int también se rechaza', () => {
    const problemas = atribuirCuerpo('int x = 5; while (x) { }');
    expect(problemas.some((p) => p.codigo === 'condicion-no-booleana')).toBe(true);
  });

  it('triangulación: "do { } while (x);" con x int también se rechaza', () => {
    const problemas = atribuirCuerpo('int x = 5; do { } while (x);');
    expect(problemas.some((p) => p.codigo === 'condicion-no-booleana')).toBe(true);
  });

  it('triangulación: "for (;x;)" con x int también se rechaza', () => {
    const problemas = atribuirCuerpo('int x = 5; for (; x; ) { }');
    expect(problemas.some((p) => p.codigo === 'condicion-no-booleana')).toBe(true);
  });

  it('control: "if (x == 5)" (una comparación, boolean real) no se rechaza', () => {
    expect(atribuirCuerpo('int x = 5; if (x == 5) { }')).toEqual([]);
  });

  it('control: "for" sin condición (parte vacía, REQ-SUB-004) nunca se rechaza por este chequeo', () => {
    expect(atribuirCuerpo('for (;;) { break; }')).toEqual([]);
  });
});

describe('atribuir — err28 de exploracion/03: operandos incomparables con ==/!= ("bad operand types")', () => {
  it('"String == int" se rechaza: "tipos-incomparables"', () => {
    const problemas = atribuirCuerpo('int x = 5; boolean b = "hola" == x;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'tipos-incomparables', datos: { izquierda: 'String', derecha: 'int' } });
  });

  it('triangulación: "String != boolean" también se rechaza', () => {
    const problemas = atribuirCuerpo('boolean b = "hola" != true;');
    expect(problemas.some((p) => p.codigo === 'tipos-incomparables')).toBe(true);
  });

  it('control: comparar dos "String" (referencia con referencia del mismo tipo) no se rechaza', () => {
    expect(atribuirCuerpo('boolean b = "hola" == "hola";')).toEqual([]);
  });

  it('control: comparar dos numéricos de tipos distintos (int/double) no se rechaza (promoción real)', () => {
    expect(atribuirCuerpo('int x = 5; double y = 5.0; boolean b = x == y;')).toEqual([]);
  });
});

describe('atribuir — err35 de exploracion/03: operandos inválidos en un operador aritmético (String - int)', () => {
  it('"String - int" se rechaza: "operandos-invalidos-operador-binario"', () => {
    const problemas = atribuirCuerpo('int x = 5; int y = "hola" - x;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'operandos-invalidos-operador-binario', datos: { operador: '-' } });
  });

  it('triangulación: "String * int" también se rechaza', () => {
    const problemas = atribuirCuerpo('int y = "hola" * 2;');
    expect(problemas.some((p) => p.codigo === 'operandos-invalidos-operador-binario')).toBe(true);
  });

  it('control: "String + int" (concatenación real, nunca aritmética) NO se rechaza', () => {
    expect(atribuirCuerpo('String s = "n=" + 5;')).toEqual([]);
  });
});

describe('atribuir — err18 de exploracion/03: nombre de tipo no reconocido en una declaración ("string" minúscula)', () => {
  it('"string nombre = "Ana";" se rechaza: "tipo-no-reconocido"', () => {
    const problemas = atribuirCuerpo('string nombre = "Ana";');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'tipo-no-reconocido', datos: { nombre: 'string' } });
  });

  it('control: "String nombre = "Ana";" (con mayúscula real) no se rechaza', () => {
    expect(atribuirCuerpo('String nombre = "Ana";')).toEqual([]);
  });
});

describe('atribuir — err19 de exploracion/03: nombre no reconocido con sugerencia de mayúscula ("system" minúscula)', () => {
  it('"system.out.println(1);" se rechaza como no declarado, CON una sugerencia de mayúscula', () => {
    const problemas = atribuirCuerpo('system.out.println(1);');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-no-declarada', datos: { nombre: 'system', sugerencia: 'System' } });
  });

  it('control: un nombre no declarado SIN parecido a ninguna clase real no trae sugerencia', () => {
    const problemas = atribuirCuerpo('int y = edadDeLaPersona + 1;');
    expect(problemas[0]?.datos['sugerencia']).toBeUndefined();
  });
});

// Deuda del commit 999a8ca (sub-lote 1-D1): err20 de exploracion/03 — "Scanner"/"Random" son las 2
// ÚNICAS clases de referencia de REQ-SUB-005 que viven en java.util (a diferencia de "String",
// java.lang, siempre disponible sin import) — Java exige importarlas de verdad. Verificado contra
// javac 17 real (corpus/experimentos/texto/err20_scanner_sin_import.java, línea 3): "cannot find
// symbol: class Scanner". El mensaje amable NUNCA debe ser el de "tipo-no-reconocido" (ese es para
// nombres mal escritos, como "string" — "Scanner" está BIEN escrito, solo falta importarlo).
describe('atribuir — err20 de exploracion/03: "Scanner"/"Random" sin import java.util (deuda del commit 999a8ca)', () => {
  it('"Scanner sc = ...;" SIN ningún import se rechaza como "tipo-requiere-import", NUNCA "tipo-no-reconocido"', () => {
    const problemas = atribuirPrograma(
      'class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); } }',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'tipo-requiere-import', datos: { nombre: 'Scanner' } });
  });

  it('la línea del problema coincide con la línea 3 real de javac (corpus/experimentos/texto/err20_scanner_sin_import.java)', () => {
    // Fuente EXACTA del archivo real -- javac 17: "3: error: cannot find symbol / symbol: class
    // Scanner", apuntando al inicio de "Scanner" en la declaración (primera aparición).
    const fuente = [
      'public class err20_scanner_sin_import {',
      '    public static void main(String[] args) {',
      '        Scanner sc = new Scanner(System.in);',
      '        System.out.println(sc.nextInt());',
      '    }',
      '}',
    ].join('\n');
    const programa = analizarPrograma(tokenizar(fuente));
    const [problema] = atribuir(programa);
    expect(problema).toMatchObject({ codigo: 'tipo-requiere-import' });
    if (problema === undefined) return;
    const { linea } = new TablaDeLineas(fuente).ubicar(problema.rango.inicio);
    expect(linea).toBe(3);
  });

  it('triangulación: "Random" (la otra clase de java.util del subconjunto) sin import también se rechaza', () => {
    const problemas = atribuirPrograma('class C { public static void main(String[] a) { Random r = new Random(); } }');
    expect(problemas.some((p) => p.codigo === 'tipo-requiere-import' && p.datos['nombre'] === 'Random')).toBe(true);
  });

  it('control: "import java.util.Scanner;" exacto SÍ basta -- no se rechaza', () => {
    const problemas = atribuirPrograma(
      'import java.util.Scanner; class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); } }',
    );
    expect(problemas).toEqual([]);
  });

  it('control: "import java.util.*;" (comodín) también basta -- no se rechaza', () => {
    const problemas = atribuirPrograma(
      'import java.util.*; class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); } }',
    );
    expect(problemas).toEqual([]);
  });

  it('control: "String" (java.lang) NUNCA exige import, con o sin imports de java.util en el programa', () => {
    expect(atribuirPrograma('class C { public static void main(String[] a) { String s = "hola"; } }')).toEqual([]);
  });

  it('control: un tipo GENUINAMENTE mal escrito ("scanner" minúscula) sigue siendo "tipo-no-reconocido", nunca "tipo-requiere-import"', () => {
    const problemas = atribuirPrograma('import java.util.Scanner; class C { public static void main(String[] a) { scanner sc; } }');
    expect(problemas.some((p) => p.codigo === 'tipo-no-reconocido')).toBe(true);
    expect(problemas.some((p) => p.codigo === 'tipo-requiere-import')).toBe(false);
  });
});

// Deuda 3 del commit 999a8ca (JLS 4.12.4, "variable constante"): verificado contra javac 17 real
// (str03_folding_final_vars.java, corpus/experimentos/texto/) que "final int MAX = 3;" hace de
// "MAX" una expresión constante real — participa en etiquetas de "case" igual que el literal "3".
describe('atribuir — deuda 3 del commit 999a8ca (JLS 4.12.4): una variable "final" con inicializador constante participa en etiquetas de "case"', () => {
  it('"final int MAX = 3; switch (n) { case MAX: break; }" compila limpio (MAX es una etiqueta constante real)', () => {
    const problemas = atribuirPrograma(
      'class C { public static void main(String[] a) { final int MAX = 3; int n = 1; switch (n) { case MAX: break; } } }',
    );
    expect(problemas).toEqual([]);
  });

  it('control (regresión): SIN "final", la misma etiqueta sigue siendo "etiqueta-de-case-no-constante" (err34)', () => {
    const problemas = atribuirPrograma(
      'class C { public static void main(String[] a) { int max = 3; int n = 1; switch (n) { case max: break; } } }',
    );
    expect(problemas.some((p) => p.codigo === 'etiqueta-de-case-no-constante')).toBe(true);
  });
});
