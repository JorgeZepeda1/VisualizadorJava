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

// Tarea 1.35 (WARNING 3, falsos RECHAZOS; javac 17.0.18 compila `main(args);` dentro de `main`): el ÚNICO método propio que la atribución ve es el propio `main` (todo
// otro método declarado ya avisó en su declaración y el programa no llega aquí). Llamarlo por su nombre es una llamada a un método propio: aviso, nunca «el método "main"
// no existe». Una llamada a un nombre que no es un método de la clase sigue siendo el error de siempre.
describe('atribuir — la llamada al propio `main` es un aviso, no «método no declarado» (tarea 1.35)', () => {
  it('"main(5);" es el aviso `llamada-a-metodo-propio-no-soportada` con el nombre del método', () => {
    const problemas = atribuirCuerpo('main(5);');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ categoria: 'no-disponible', codigo: 'llamada-a-metodo-propio-no-soportada', datos: { nombre: 'main' } });
  });

  it('el caso real, `main(args)`: el primer problema (el que ve el alumno) es la llamada, y `args` como valor es el aviso de arreglo que ya existía', () => {
    const problemas = atribuirCuerpo('main(a);');
    expect(problemas[0]).toMatchObject({ categoria: 'no-disponible', codigo: 'llamada-a-metodo-propio-no-soportada' });
    expect(problemas.map((p) => p.codigo)).toEqual(['llamada-a-metodo-propio-no-soportada', 'arreglo-no-soportado']);
  });

  it('triangulación: también dentro de un `if` y como argumento de otra llamada', () => {
    expect(atribuirCuerpo('if (true) { main(5); }')).toMatchObject([{ codigo: 'llamada-a-metodo-propio-no-soportada' }]);
    expect(atribuirCuerpo('System.out.println(main(5));').map((p) => p.codigo)).toContain('llamada-a-metodo-propio-no-soportada');
  });

  it('control: un nombre que no es el de ningún método de la clase sigue siendo «metodo-no-declarado»', () => {
    expect(atribuirCuerpo('principal(5);')).toMatchObject([{ codigo: 'metodo-no-declarado', datos: { nombre: 'principal' } }]);
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
      // Tarea 1.26: el código único "miembro-de-biblioteca-no-soportado" se dividió en 3 (método,
      // campo, constructor) -- "split" es una llamada de MÉTODO (visitarLlamadaDeMiembro).
      codigo: 'metodo-de-biblioteca-no-soportado',
    });
    // Tarea 1.25 (datos tipados): el texto es-MX nombra el miembro CONCRETO desde la tarea 1.24
    // (`{ clase, nombre }`), pero este sitio de emisión (visitarLlamadaDeMiembro) mandaba `datos: {}`
    // — el alumno veía "el miembro `undefined` de `undefined`" en vez de "split"/"String".
    expect(problemas[0].datos).toEqual({ clase: 'String', nombre: 'split' });
  });

  it('triangulación: Math.sin(x) -- otra clase, mismo desenlace NO-DISP (trascendentes, REQ-SUB-007)', () => {
    const problemas = atribuirCuerpo('double x = 1.0; Math.sin(x);');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ categoria: 'no-disponible', codigo: 'metodo-de-biblioteca-no-soportado' });
  });

  it('triangulación: sc.hasNextInt() -- Scanner real (con import), mismo desenlace NO-DISP (REQ-SUB-007)', () => {
    const problemas = atribuirPrograma(
      'import java.util.Scanner; class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); sc.hasNextInt(); } }',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ categoria: 'no-disponible', codigo: 'metodo-de-biblioteca-no-soportado' });
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
    // Tarea 1.26: sitio de emisión CAMPO (visitarAccesoMiembro) -- código propio, distinto del de
    // un método (ver "String.split" arriba) y del de un constructor (ver "new Scanner" abajo).
    expect(problemas[0]).toMatchObject({ categoria: 'no-disponible', codigo: 'campo-de-biblioteca-no-soportado' });
    // Tarea 1.25, triangulación (clase/nombre distintos de "split"/"String" para probar que no están
    // fijos).
    expect(problemas[0].datos).toEqual({ clase: 'Integer', nombre: 'SIZE' });
  });

  it('triangulación: s.length (el MÉTODO String.length usado como si fuera un campo, sin paréntesis) -- "campo-no-declarado" (verificado: javac da "cannot find symbol: variable length")', () => {
    const problemas = atribuirCuerpo('String s = "hola"; int n = s.length;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'campo-no-declarado', datos: { clase: 'String', nombre: 'length' } });
  });
});

// Sub-lote 1-D2c: corrección descubierta al conectar la biblioteca real -- antes de esta
// corrección, "Scanner sc = ...;" SIN import producía DOS problemas ("tipo-requiere-import" +
// "metodo-de-biblioteca-no-soportado" de "sc.hasNextInt()", tarea 1.26), nunca solo uno -- javac SIEMPRE
// suprime la cascada cuando el TIPO mismo no se resolvió (D2, nunca más permisivo/estricto que
// javac). Ver también el describe "err20" más abajo (control con import SÍ presente).
describe('atribuir — corrección: un tipo sin resolver (sin import) suprime la cascada sobre sus propios usos (sub-lote 1-D2c)', () => {
  it('"Scanner sc = ...; sc.hasNextInt();" SIN import da SOLO 2 "tipo-requiere-import" (declaración + "new", sub-lote 1-D3) -- nunca un TERCER problema de "sc.hasNextInt()"', () => {
    const problemas = atribuirPrograma(
      'class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); sc.hasNextInt(); } }',
    );
    // Sub-lote 1-D3: "new Scanner(...)" AHORA también se valida (antes de 1.16/1-D3, `nueva-instancia`
    // no se resolvía y este total era 1) -- verificado contra javac real: "cannot find symbol: class
    // Scanner" se reporta DOS veces (declaración Y "new"), nunca deduplicado. El invariante real de
    // esta prueba sigue intacto: "sc.hasNextInt()" (el USO de la variable mal tipada) no agrega un
    // TERCER problema -- D2, cascada suprimida sobre sus propios usos.
    expect(problemas).toHaveLength(2);
    expect(problemas.every((p) => p.codigo === 'tipo-requiere-import')).toBe(true);
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
    expect(problemas).toMatchObject([
      { codigo: 'variable-no-declarada', datos: { nombre: 'primera' } },
      { codigo: 'variable-no-declarada', datos: { nombre: 'segunda' } },
    ]);
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
    expect(problemas[0]).toMatchObject({ codigo: 'variable-no-declarada' });
    expect(problemas[0]?.datos).toEqual({ nombre: 'edadDeLaPersona' });
  });
});

// Deuda del commit 999a8ca (sub-lote 1-D1): err20 de exploracion/03 — "Scanner"/"Random" son las 2
// ÚNICAS clases de referencia de REQ-SUB-005 que viven en java.util (a diferencia de "String",
// java.lang, siempre disponible sin import) — Java exige importarlas de verdad. Verificado contra
// javac 17 real (corpus/experimentos/texto/err20_scanner_sin_import.java, línea 3): "cannot find
// symbol: class Scanner". El mensaje amable NUNCA debe ser el de "tipo-no-reconocido" (ese es para
// nombres mal escritos, como "string" — "Scanner" está BIEN escrito, solo falta importarlo).
describe('atribuir — err20 de exploracion/03: "Scanner"/"Random" sin import java.util (deuda del commit 999a8ca)', () => {
  it('"Scanner sc = ...;" SIN ningún import se rechaza como "tipo-requiere-import" ×2 (declaración + "new", sub-lote 1-D3), NUNCA "tipo-no-reconocido"', () => {
    const problemas = atribuirPrograma(
      'class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); } }',
    );
    // Sub-lote 1-D3: verificado contra javac real -- "cannot find symbol: class Scanner" se
    // reporta UNA vez por cada aparición del nombre (declaración Y "new"), nunca deduplicado.
    expect(problemas).toHaveLength(2);
    expect(problemas.every((p) => p.codigo === 'tipo-requiere-import' && p.datos['nombre'] === 'Scanner')).toBe(true);
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

// Tarea 1.35 (WARNING 3 de la re-verificación del lote 1, falsos RECHAZOS; cada programa verificado con javac 17.0.18 real): lo que javac COMPILA y aquí daba
// un error. JLS 4.12.4 + 5.2: el valor de una variable constante es el del inicializador convertido a su tipo declarado, y JLS 15.29 incluye los casts a
// `String` y a un primitivo entre las expresiones constantes.
describe('atribuir — constantes derivadas de un `char`, y casts constantes (tarea 1.35, JLS 4.12.4, 5.2 y 15.29)', () => {
  it('`final int A = \'a\'; char c = A;` compila (A es la constante int 97, que cabe en un char)', () => {
    expect(atribuirCuerpo("final int A = 'a'; char c = A;")).toEqual([]);
    expect(atribuirCuerpo("final int K = ' '; char c = K;")).toEqual([]);
  });

  it('triangulación: la constante se propaga por otras constantes y operaciones: `final int B = A + 1; char c = B;` y `char d = A + 1;`', () => {
    expect(atribuirCuerpo("final int A = 'a'; final int B = A + 1; char c = B;")).toEqual([]);
    expect(atribuirCuerpo("final int A = 'a'; char d = A + 1;")).toEqual([]);
  });

  it('controles negativos (javac los rechaza y aquí también): no cabe en un char, no es `final`, o es `long`', () => {
    const noCabe = atribuirCuerpo('final int A = 70000; char c = A;');
    expect(noCabe).toHaveLength(1);
    expect(noCabe[0]).toMatchObject({ codigo: 'conversion-con-perdida', datos: { origen: 'int', destino: 'char' } });
    expect(atribuirCuerpo("int A = 'a'; char c = A;")).toMatchObject([{ codigo: 'conversion-con-perdida' }]);
    expect(atribuirCuerpo('final long L = 65; char c = L;')).toMatchObject([{ codigo: 'conversion-con-perdida', datos: { origen: 'long' } }]);
  });

  it('`final String S = (String) "a";` es una constante: sirve de etiqueta de `case`, igual que `case (String) "a":`', () => {
    expect(atribuirCuerpo('final String S = (String) "a"; String s = "a"; switch (s) { case S: break; default: break; }')).toEqual([]);
    expect(atribuirCuerpo('String s = "a"; switch (s) { case (String) "a": break; default: break; }')).toEqual([]);
  });

  it('control: sin `final`, o con un cast que no es constante, la etiqueta sigue siendo «etiqueta-de-case-no-constante»', () => {
    expect(atribuirCuerpo('String t = "a"; String s = "a"; switch (s) { case (String) t: break; default: break; }')).toMatchObject([
      { codigo: 'etiqueta-de-case-no-constante' },
    ]);
  });
});

// Sub-lote 1-D3 (JLS 15.9, REQ-SUB-005): ANTES de esta tarea, "nueva-instancia" solo recorría sus
// argumentos como valores sueltos -- "Scanner sc = new Scanner();" (Scanner NO tiene constructor
// de aridad 0) se aceptaba en silencio, javac lo rechaza de verdad. Los 6 casos verificados contra
// javac 17 real (carpeta temporal, borrada tras verificar; ver el informe de la sesión).
describe('atribuir — "new Clase(...)" contra los constructores reales de FIRMAS_JDK (JLS 15.9, sub-lote 1-D3)', () => {
  it('"new Scanner(System.in)" CON import: soportado, sin problemas (verificado: javac compila limpio)', () => {
    const problemas = atribuirPrograma(
      'import java.util.Scanner; class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); } }',
    );
    expect(problemas).toEqual([]);
  });

  it('triangulación: "new Random()" y "new Random(42)" CON import: ambos soportados, sin problemas (verificado: javac compila limpio)', () => {
    const problemas = atribuirPrograma(
      'import java.util.Random; class C { public static void main(String[] a) { Random r1 = new Random(); Random r2 = new Random(42); } }',
    );
    expect(problemas).toEqual([]);
  });

  it('triangulación: "new String(\\"hola\\")" (java.lang, sin import): soportado, sin problemas', () => {
    expect(atribuirCuerpo('String s = new String("hola");')).toEqual([]);
  });

  it('clase no reconocida ("new Foo()"): "tipo-no-reconocido" (verificado: javac da "cannot find symbol: class Foo")', () => {
    const problemas = atribuirCuerpo('new Foo();');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'tipo-no-reconocido', datos: { nombre: 'Foo' } });
  });

  it('falta el import ("new Scanner(System.in)" sin "import java.util.Scanner;"): "tipo-requiere-import" -- DOS veces (verificado contra javac real: reporta la declaración Y el "new" por separado, "cannot find symbol: class Scanner" ×2, nunca deduplica)', () => {
    const problemas = atribuirCuerpo('Scanner sc = new Scanner(System.in);');
    expect(problemas).toHaveLength(2);
    expect(problemas.every((p) => p.codigo === 'tipo-requiere-import')).toBe(true);
    expect(problemas.every((p) => (p.datos as { nombre: string }).nombre === 'Scanner')).toBe(true);
  });

  it('"new Scanner()" (CON import, SIN argumentos): "sin-constructor-aplicable" (verificado: javac da "no suitable constructor found for Scanner(no arguments)")', () => {
    const problemas = atribuirPrograma(
      'import java.util.Scanner; class C { public static void main(String[] a) { Scanner sc = new Scanner(); } }',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'sin-constructor-aplicable', datos: { clase: 'Scanner', argumentos: [] } });
  });

  it('"new Scanner(\\"texto\\")" (CON import, constructor real pero fuera del subconjunto): aviso NO-DISP, NUNCA un error inventado (D2, verificado: javac compila limpio)', () => {
    const problemas = atribuirPrograma(
      'import java.util.Scanner; class C { public static void main(String[] a) { Scanner sc = new Scanner("texto"); } }',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]?.categoria).toBe('no-disponible');
    // Tarea 1.26 (hallazgo del orquestador): el código único "miembro-de-biblioteca-no-soportado"
    // mandaba, para el CONSTRUCTOR, `nombre: 'new ' + clase` -- el texto resultante ("el miembro
    // `new Scanner` de `Scanner`... `Scanner.new Scanner`") describía una construcción que NO es
    // Java. Sitio de emisión propio (visitarNuevaInstancia) con código propio
    // "constructor-de-biblioteca-no-soportado" y datos SOLO `{ clase }` -- un constructor no tiene
    // "nombre" propio en JLS (ver el comentario de "sin-constructor-aplicable" más arriba), así que
    // ya no se inventa uno.
    expect(problemas[0]?.codigo).toBe('constructor-de-biblioteca-no-soportado');
    expect(problemas[0]?.datos).toEqual({ clase: 'Scanner' });
  });
});

// Sub-lote 1-D3 (mutante real contra veredicto de javac, deuda "pendiente heredado 2" de 1.8):
// "System.err.println(...)" y "System.out.OTRO-QUE-NO-SEA-println/print(...)" caen en el camino
// GENERAL de expresiones (esInicioDeImpresion solo reconoce "out"+println/print) -- antes,
// `claseDelObjeto` no resolvía "System.out"/"System.err" a ninguna clase real, así que NINGÚN
// miembro (inventado o real) se validaba jamás por este camino.
describe('atribuir — "System.out"/"System.err" por el camino GENERAL de expresiones (sub-lote 1-D3)', () => {
  it('"System.out.Bienvenida(...)" (método inventado, mutante real): "miembro-no-declarado" (verificado: javac da "cannot find symbol: method Bienvenida(String)")', () => {
    const problemas = atribuirCuerpo('System.out.Bienvenida("hola");');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'miembro-no-declarado', datos: { clase: 'PrintStream', nombre: 'Bienvenida' } });
  });

  it('control: "System.err.println(...)" (real, soportado desde 1.19) sigue sin problemas -- la conexión de PrintStream NO rompe el caso válido', () => {
    expect(atribuirCuerpo('System.err.println("hola");')).toEqual([]);
  });

  it('triangulación: "System.err.sin(1.0)" (miembro real de Math confundido de clase -- en realidad no existe en PrintStream) también da "miembro-no-declarado"', () => {
    const problemas = atribuirCuerpo('System.err.sin(1.0);');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'miembro-no-declarado', datos: { clase: 'PrintStream', nombre: 'sin' } });
  });
});

// Tarea 1.21 (sub-lote 1-D4, JLS 5.6.1/15.14/15.15): hasta esta tarea, "!"/"+"/"-" unarios y
// "++"/"--" nunca verificaban su operando (`visitarExpresion` solo recorría el operando, sin
// llamar a ninguna verificación) -- verificado contra javac 17 real esta sesión (carpetas
// temporales, borradas): los 4 casos de abajo dan "bad operand type X for unary operator 'Y'".
describe('atribuir — operando inválido de un operador UNARIO ("!"/"+"/"-", JLS 5.6.1, sub-lote 1-D4)', () => {
  it('"!x" con "x" int: "operando-invalido-operador-unario" (verificado: javac da "bad operand type int for unary operator \'!\'")', () => {
    const problemas = atribuirCuerpo('int x = 5; boolean r = !x;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'operando-invalido-operador-unario', datos: { operador: '!', operando: 'int' } });
  });

  it('triangulación: "!s" con "s" String (operando distinto, mismo operador)', () => {
    const problemas = atribuirCuerpo('String s = "a"; boolean r = !s;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'operando-invalido-operador-unario', datos: { operador: '!', operando: 'String' } });
  });

  it('triangulación: "-b" con "b" boolean (operador distinto: "-" en vez de "!")', () => {
    const problemas = atribuirCuerpo('boolean b = true; int r = -b;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'operando-invalido-operador-unario', datos: { operador: '-', operando: 'boolean' } });
  });

  it('control: "-c" con "c" char SÍ es válido (JLS 5.6.1: "char" promueve a "int", verificado: javac compila limpio)', () => {
    expect(atribuirCuerpo('char c = \'a\'; int x = -c;')).toEqual([]);
  });

  it('control: "!b" con "b" boolean, "+x"/"-x" con "x" int siguen sin problemas', () => {
    expect(atribuirCuerpo('boolean b = true; boolean r = !b; int x = 5; int y = -x; int z = +x;')).toEqual([]);
  });
});

describe('atribuir — operando inválido de "++"/"--" (JLS 15.14/15.15, sub-lote 1-D4)', () => {
  it('"b++" con "b" boolean: "operando-invalido-operador-unario" (verificado: javac da "bad operand type boolean for unary operator \'++\'")', () => {
    const problemas = atribuirCuerpo('boolean b = true; b++;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'operando-invalido-operador-unario', datos: { operador: '++', operando: 'boolean' } });
  });

  it('triangulación: "s++" con "s" String (operando distinto)', () => {
    const problemas = atribuirCuerpo('String s = "a"; s++;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'operando-invalido-operador-unario', datos: { operador: '++', operando: 'String' } });
  });

  it('control: "x++"/"c--" con "x" int y "c" char siguen sin problemas', () => {
    expect(atribuirCuerpo('int x = 5; x++; char c = \'a\'; c--;')).toEqual([]);
  });
});

// Tarea 1.21 (JLS 15.26.2, verificado contra javac 17 real esta sesión): la asignación compuesta
// (`+= -= *= /= %=`) NUNCA se verificaba -- ni que el operador BASE aplicara a los operandos
// (`bad operand types for binary operator`) ni que el resultado promovido pudiera "castearse de
// vuelta" al tipo del objetivo (`E1 = (T)(E1 op E2)`, JLS 15.26.2 -- distinto de `verificarOperandosBinaria`
// porque aquí SIEMPRE hay una conversión implícita: "int cx=5; cx+=1.7;" es válido, REQ-SUB-003).
describe('atribuir — asignación compuesta (JLS 15.26.2, sub-lote 1-D4)', () => {
  it('"b += false" con "b" boolean: operador "+" no aplica a boolean (verificado: javac da "bad operand types for binary operator \'+\'")', () => {
    const problemas = atribuirCuerpo('boolean b = true; b += false;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({
      codigo: 'operandos-invalidos-operador-binario',
      datos: { operador: '+=', izquierda: 'boolean', derecha: 'boolean' },
    });
  });

  it('triangulación: "x *= \\"3\\"" con "x" int: "*" nunca concatena (a diferencia de "+"), verificado: javac da "bad operand types for binary operator \'*\'"', () => {
    const problemas = atribuirCuerpo('int x = 5; x *= "3";');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({
      codigo: 'operandos-invalidos-operador-binario',
      datos: { operador: '*=', izquierda: 'int', derecha: 'String' },
    });
  });

  it('"x += \\"a\\"" con "x" int: el operador "+" SÍ aplica (concatena, da "String"), pero "String" no puede volver a castearse a "int" (verificado: javac da "incompatible types: String cannot be converted to int", NUNCA "bad operand types")', () => {
    const problemas = atribuirCuerpo('int x = 5; x += "a";');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'tipos-incompatibles-en-asignacion', datos: { origen: 'String', destino: 'int' } });
  });

  it('control: "cx += 1.7" con "cx" int SÍ es válido (REQ-SUB-003, escenario ya verificado: "cx" queda en 6)', () => {
    expect(atribuirCuerpo('int cx = 5; cx += 1.7;')).toEqual([]);
  });

  it('control: "x *= 2.5" con "x" int SÍ es válido (numérico<->numérico siempre castea de vuelta, verificado: javac compila limpio)', () => {
    expect(atribuirCuerpo('int x = 5; x *= 2.5;')).toEqual([]);
  });

  it('control: "s += 5" con "s" String SÍ es válido (String += cualquier cosa siempre concatena, verificado: javac compila limpio)', () => {
    expect(atribuirCuerpo('String s = "a"; s += 5;')).toEqual([]);
  });
});

// Tarea NUEVA (sub-lote 1-D5, JLS 5.2/15.26.1: "el tipo de una expresión de asignación es el de
// la variable asignada"): la asignación SIMPLE ("=") fuera de una declaración NUNCA se verificaba
// -- a diferencia de un inicializador de declaración (`visitarDeclaracionLocal`, arriba) o de una
// asignación COMPUESTA (describe anterior), "int x; x = \"hola\";" se aceptaba en silencio (hueco
// documentado a propósito en el cierre de la tarea 1.21, sub-lote 1-D4). Reusa las MISMAS
// `esAsignable`/`codigoDeAsignacionInvalida` que ya usa una declaración -- nunca una segunda tabla
// de reglas. Verificado contra javac 17 real esta sesión (temurin-17.0.18, carpeta temporal
// borrada tras verificar): las 5 líneas de abajo compilaron como un solo archivo con 7 clases,
// javac reportó EXACTAMENTE estos 5 errores (y solo estos) en sus líneas reales.
describe('atribuir — asignación SIMPLE fuera de declaración (JLS 5.2/15.26.1, sub-lote 1-D5)', () => {
  it('"x = \\"hola\\"" con "x" int: "tipos-incompatibles-en-asignacion" (verificado: javac da "incompatible types: String cannot be converted to int")', () => {
    const problemas = atribuirCuerpo('int x; x = "hola";');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'tipos-incompatibles-en-asignacion', datos: { origen: 'String', destino: 'int' } });
  });

  it('triangulación: "x = 3.5" con "x" int: "conversion-con-perdida" (verificado: javac da "possible lossy conversion from double to int")', () => {
    const problemas = atribuirCuerpo('int x; x = 3.5;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'conversion-con-perdida', datos: { origen: 'double', destino: 'int' } });
  });

  it('triangulación: "c = n" con "c" char y "n" int NO constante (una variable, no un literal): "conversion-con-perdida" (verificado: javac da "possible lossy conversion from int to char")', () => {
    const problemas = atribuirCuerpo('char c; int n = 65; c = n;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'conversion-con-perdida', datos: { origen: 'int', destino: 'char' } });
  });

  it('triangulación: "s = 5" con "s" String: "tipos-incompatibles-en-asignacion" (verificado: javac da "incompatible types: int cannot be converted to String")', () => {
    const problemas = atribuirCuerpo('String s; s = 5;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'tipos-incompatibles-en-asignacion', datos: { origen: 'int', destino: 'String' } });
  });

  it('triangulación: "b = 1" con "b" boolean: "tipos-incompatibles-en-asignacion" (verificado: javac da "incompatible types: int cannot be converted to boolean")', () => {
    const problemas = atribuirCuerpo('boolean b; b = 1;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'tipos-incompatibles-en-asignacion', datos: { origen: 'int', destino: 'boolean' } });
  });

  it('control: "c = 65" con "c" char SÍ es válido (constante int que cabe en char, JLS 5.2 -- verificado: javac compila limpio)', () => {
    expect(atribuirCuerpo('char c; c = 65;')).toEqual([]);
  });

  it('control: "d = 5" con "d" double SÍ es válido (ensanchamiento int->double, verificado: javac compila limpio)', () => {
    expect(atribuirCuerpo('double d; d = 5;')).toEqual([]);
  });
});

// Tarea 1.21 (~15 mutantes de la tarea 1.16, "operator.cant.be.applied"/"prob.found.req" con una
// sub-expresión ANIDADA como operando): antes de esta tarea, "(a + b) == true" nunca se rechazaba
// -- "a + b" tipaba 'desconocido' (binaria fuera del alcance de 1.7/1.8) y la cascada de
// `verificarOperandosBinaria` se suprimía SIEMPRE, aunque "int == boolean" sea un error real.
describe('atribuir — un operando ANIDADO (él mismo una binaria) SÍ dispara el error real (sub-lote 1-D4)', () => {
  it('"(a + b) == true" con "a"/"b" int: "tipos-incomparables" (verificado: javac da "incomparable types: int and boolean")', () => {
    const problemas = atribuirCuerpo('int m = 1, n = 2; boolean r = (m + n) == true;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'tipos-incomparables', datos: { izquierda: 'int', derecha: 'boolean' } });
  });

  it('control: "a + b + 3" (aritmética anidada válida) sigue sin problemas', () => {
    expect(atribuirCuerpo('int m = 1, n = 2; int r = m + n + 3;')).toEqual([]);
  });
});

// Tarea 1.21 (gap documentado en engram "Gap: System.in/System.out/System.err..."): "System.in"/
// "System.out"/"System.err" como ARGUMENTOS (no como receptor, eso ya se resolvía desde 1-D3) daban
// 'desconocido' en `tipoDeExpresion` -- "new Scanner(System.in)" "funcionaba" SOLO porque un
// argumento 'desconocido' apagaba la resolución de sobrecarga ANTES de comprobar
// `CONSTRUCTORES_SOPORTADOS` (D2 mal aplicado: la cascada se suprimía sobre el "new" COMPLETO, no
// solo sobre el argumento). Verificado contra javac 17 real esta sesión.
describe('atribuir — System.in/System.out/System.err como ARGUMENTOS de un constructor (sub-lote 1-D4)', () => {
  it('"int sc = new Scanner(System.in)" (tipo mutado): "tipos-incompatibles-en-asignacion" -- antes de esta tarea daba [] en silencio (verificado: javac da "incompatible types: Scanner cannot be converted to int")', () => {
    const problemas = atribuirPrograma(
      'import java.util.Scanner; class C { public static void main(String[] a) { int sc = new Scanner(System.in); } }',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'tipos-incompatibles-en-asignacion', datos: { origen: 'Scanner', destino: 'int' } });
  });

  it('triangulación: "new Scanner(System.out)" (PrintStream, argumento inválido): "sin-constructor-aplicable" -- antes de esta tarea daba [] en silencio (verificado: javac da "no suitable constructor found for Scanner(PrintStream)")', () => {
    const problemas = atribuirPrograma(
      'import java.util.Scanner; class C { public static void main(String[] a) { Scanner sc = new Scanner(System.out); } }',
    );
    expect(problemas).toHaveLength(1);
    // Tarea NUEVA (sub-lote 1-D5): `datos.argumentos` debe mostrar "PrintStream" (como javac),
    // NUNCA "desconocido" -- ver el describe de abajo para el resto de la cobertura.
    expect(problemas[0]).toMatchObject({ codigo: 'sin-constructor-aplicable', datos: { clase: 'Scanner', argumentos: ['PrintStream'] } });
  });

  it('control: "new Scanner(System.in)" bien tipado SIGUE sin problemas (no se volvió más estricto que javac)', () => {
    const problemas = atribuirPrograma(
      'import java.util.Scanner; class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); } }',
    );
    expect(problemas).toEqual([]);
  });
});

// Tarea NUEVA (sub-lote 1-D5): en "sin-constructor-aplicable"/"sin-sobrecarga-aplicable",
// `datos.argumentos` mostraba "desconocido" para un argumento System.in/System.out/System.err --
// technically correcto (NINGUNO es uno de los 8 `Tipo` cerrados, design.md §2.7), pero MENOS
// preciso que javac, que SIEMPRE muestra el nombre simple de la clase real reflejada
// ("InputStream"/"PrintStream") en sus propios mensajes ("no suitable constructor found for
// Scanner(PrintStream)", nunca "Scanner(unknown)"). Reusa el MISMO canal que ya resuelve la
// sobrecarga real (`campoReflejadoDeSystem`, tipos.ts) -- nunca una segunda tabla de nombres.
describe('atribuir — nombres de tipo reflejado (InputStream/PrintStream) en los mensajes de sobrecarga (sub-lote 1-D5)', () => {
  it('"new Random(System.in)" (InputStream, ningún constructor real de Random lo acepta -- catalogo-api.ts solo tiene Random()/Random(long)): "sin-constructor-aplicable" con argumentos: ["InputStream"], NUNCA "desconocido"', () => {
    const problemas = atribuirPrograma(
      'import java.util.Random; class C { public static void main(String[] a) { Random r = new Random(System.in); } }',
    );
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'sin-constructor-aplicable', datos: { clase: 'Random', argumentos: ['InputStream'] } });
  });

  it('triangulación: "Math.max(System.out, 1)" (PrintStream como argumento de un MÉTODO, no un constructor): "sin-sobrecarga-aplicable" con argumentos: ["PrintStream", "int"]', () => {
    const problemas = atribuirCuerpo('Math.max(System.out, 1);');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({
      codigo: 'sin-sobrecarga-aplicable',
      datos: { clase: 'Math', nombre: 'max', argumentos: ['PrintStream', 'int'] },
    });
  });

  it('control: un argumento normal (no System.x) sigue mostrando su Tipo de siempre, sin cambios ("Math.max(\\"a\\", 1)" ya cubierto arriba con ["String", "int"])', () => {
    const problemas = atribuirCuerpo('String s = "x"; s.charAt(true);');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'sin-sobrecarga-aplicable', datos: { argumentos: ['boolean'] } });
  });
});

// Tarea 1.35 (SUGGESTION-3 de la re-verificación del lote 1 y un falso acepto hallado con una campaña de mutantes sobre el corpus; cada nombre verificado con javac 17.0.18): un `import
// paquete.*;` solo se validaba por su forma y `import java.sqrt.*;` o `import org.junit.*;` terminaban en `ok` (o, con un uso de `Scanner` tres líneas después, en el error del USO
// y no en la línea del `import`, que es donde javac lo señala: «package java.sqrt does not exist»).
describe('atribuir — `import p.*;` de un paquete que no existe (tarea 1.35, JLS 7.5.2)', () => {
  const conImport = (importacion: string, cuerpo = 'System.out.println(1);') =>
    atribuirPrograma(`${importacion}\nclass C { public static void main(String[] a) { ${cuerpo} } }`);

  it.each(['java.sqrt', 'java.Util', 'foo', 'org.junit', 'java', 'java.lang.Matth'])('"import %s.*;" es «importacion-no-reconocida» en la línea del import, con el nombre tal como se escribió', (paquete) => {
    const problemas = conImport(`import ${paquete}.*;`);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'importacion-no-reconocida', datos: { nombre: `${paquete}.*` } });
    expect(problemas[0]?.rango.inicio).toBe(0);
  });

  it('el error del import va PRIMERO aunque el uso posterior de `Scanner` también falle (la línea es la del import, la de javac)', () => {
    const problemas = conImport('import java.sqrt.*;', 'Scanner sc = new Scanner(System.in);');
    expect(problemas.length).toBeGreaterThan(1);
    expect(problemas[0]).toMatchObject({ codigo: 'importacion-no-reconocida', datos: { nombre: 'java.sqrt.*' } });
  });

  it.each(['java.util', 'java.lang', 'java.util.concurrent', 'javax.swing', 'java.util.Map', 'java.util.Map.Entry', 'java.lang.Math'])(
    'control: "import %s.*;" (un paquete real, o un tipo del que se importan los miembros) no produce ningún problema',
    (nombre) => {
      expect(conImport(`import ${nombre}.*;`)).toEqual([]);
    },
  );
});

// Tarea 1.21 (~7 mutantes de la tarea 1.16, p. ej. "import java.utilScanner;"): el nombre importado
// nunca se validaba contra el catálogo real -- javac ancla su error en la LÍNEA del import, nuestro
// motor (antes de esta tarea) solo fallaba DESPUÉS, en el USO de la variable (línea distinta,
// mismo veredicto pero línea equivocada). Verificado contra javac 17 real esta sesión: "cannot find
// symbol: class utilScanner, location: package java", en la línea 1 (la del import).
describe('atribuir — import de una clase inexistente (REQ-SUB-001, sub-lote 1-D4)', () => {
  it('"import java.utilScanner;" (falta el punto, mutante real), SIN usar "Scanner" después: "importacion-no-reconocida" anclado en el propio IMPORT (offset 0, el primer token del archivo) -- aislado del error de USO que ya cubre el describe de abajo', () => {
    const problemas = atribuirPrograma('import java.utilScanner;\nclass C { public static void main(String[] a) { System.out.println(1); } }');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'importacion-no-reconocida', datos: { nombre: 'java.utilScanner' } });
    expect(problemas[0]?.rango.inicio).toBe(0);
  });

  it('triangulación: el import roto se reporta PRIMERO por posición aunque el USO posterior de "Scanner" (sin import real) TAMBIÉN produzca sus propios problemas -- `atribuir` nunca se detiene, pero compilador.ts reportaría solo el primero (ADR 004)', () => {
    const problemas = atribuirPrograma(
      'import java.utilScanner;\nclass C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); } }',
    );
    expect(problemas.length).toBeGreaterThan(1);
    expect(problemas[0]).toMatchObject({ codigo: 'importacion-no-reconocida', datos: { nombre: 'java.utilScanner' } });
    expect(problemas[0]?.rango.inicio).toBe(0);
  });

  it('control: "import java.util.Scanner;" (real) no produce ningún problema de import', () => {
    const problemas = atribuirPrograma(
      'import java.util.Scanner;\nclass C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); } }',
    );
    expect(problemas).toEqual([]);
  });

  it('control: "import java.util.*;" (comodín) tampoco se valida -- fuera de alcance de esta tarea (REQ-SUB-001 solo pide "java.util.*" real)', () => {
    const problemas = atribuirPrograma(
      'import java.util.*;\nclass C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); } }',
    );
    expect(problemas).toEqual([]);
  });

  it('triangulación: "import java.java.Scanner;" (mutación real "cambiar-identificador", último segmento SÍ es una clase real pero el PAQUETE no) también se rechaza -- no basta con mirar solo el último segmento', () => {
    const problemas = atribuirPrograma('import java.java.Scanner;\nclass C { public static void main(String[] a) { System.out.println(1); } }');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'importacion-no-reconocida', datos: { nombre: 'java.java.Scanner' } });
  });
});

// Tarea 1.21 (sub-lote 1-D4, cierre de C7, ~2 de los 4 mutantes de VEREDICTO que quedaban tras
// cerrar las 3 tareas anteriores + 2 LÍNEA más): el objetivo de una asignación (JLS 15.26) y el
// operando de "++"/"--" (JLS 15.14/15.15) deben ser una VARIABLE real -- ni el nombre de una CLASE
// ("Scanner"/"Math" comparten la forma "Id" pero NO son variables) ni el VALOR de otra expresión
// ("fila++", el resultado de un incremento). Descubierto al volver a correr los mutantes tras las
// correcciones anteriores de esta sesión (nunca estuvo en el ~15/~35/~7 original).
describe('atribuir — el objetivo/operando debe ser una VARIABLE real (JLS 4.12.3/15.14/15.26, sub-lote 1-D4)', () => {
  it('"fila++ ++" (mutante real "duplicar" sobre "++"): "objetivo-no-es-variable" (verificado: javac da "unexpected type, required: variable, found: value")', () => {
    const problemas = atribuirCuerpo('int fila = 1; fila++ ++;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'objetivo-no-es-variable' });
  });

  it('triangulación: "Scanner = new Scanner(System.in);" (asignar a un nombre de CLASE): "objetivo-no-es-variable" (verificado: javac da "cannot find symbol: variable Scanner")', () => {
    const problemas = atribuirPrograma(
      'import java.util.Scanner; class C { public static void main(String[] a) { Scanner = new Scanner(System.in); } }',
    );
    expect(problemas.some((p) => p.codigo === 'objetivo-no-es-variable')).toBe(true);
  });

  it('control: "x++; x = 2;" (variable declarada de verdad, ambas formas) sigue sin problemas', () => {
    expect(atribuirCuerpo('int x = 1; x++; x = 2;')).toEqual([]);
  });

  it('control: "noExiste = 5;" (nombre genuinamente no declarado, NI clase) sigue reportando SOLO "variable-no-declarada" -- nunca un segundo problema por la misma causa', () => {
    const problemas = atribuirCuerpo('noExiste = 5;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-no-declarada' });
  });
});

// Tarea 1.29 (causa 2, agregada por el orquestador; design.md §2.3: «clase existente no soportada →
// NO-DISP; inexistente → error»): antes CUALQUIER import fuera de las 10 clases del catálogo daba
// `importacion-no-reconocida` («revisa que esté bien escrito»), incluido `import java.util.Locale;`,
// `javax.swing.JOptionPane` o `java.text.DecimalFormatSymbols` — clases que existen y que javac
// compila. La lista de clases reales sale del oráculo (`clases-jdk.generado.ts`), verificada
// exhaustivamente contra javac 17 (`generar-datos.test.ts`).
describe('atribuir — imports de clases REALES fuera del subconjunto son aviso, no error (tarea 1.29)', () => {
  it.each([
    'java.util.Locale',
    'java.text.DecimalFormatSymbols',
    'javax.swing.JOptionPane',
    'java.math.BigDecimal',
    'java.util.Map.Entry',
    'java.io.PrintStream',
    'java.lang.StringBuilder',
  ])('"import %s;" (real): "clase-no-soportada" (no-disponible) con el nombre completo, anclado en el propio import', (nombre) => {
    const problemas = atribuirPrograma(`import ${nombre};\nclass C { public static void main(String[] a) { } }`);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'clase-no-soportada', categoria: 'no-disponible', datos: { nombre } });
    expect(problemas[0]!.rango.inicio).toBe(0);
  });

  it.each([
    'java.util.Scaner',
    'java.java.Scanner',
    'javax.swing.JOptionPan',
    'java.util.Map.Entri',
    'java.util.HashMap.TreeNode',
    'java.lang.Scanner',
  ])('triangulación negativa: "import %s;" (NO existe o no es importable) sigue siendo "importacion-no-reconocida", un error real de javac', (nombre) => {
    const problemas = atribuirPrograma(`import ${nombre};\nclass C { public static void main(String[] a) { } }`);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'importacion-no-reconocida', datos: { nombre } });
    expect(problemas[0]!.categoria).toBeUndefined();
  });

  it('control: los imports que el subconjunto SÍ soporta (java.util.Scanner/Random) no producen ningún problema', () => {
    expect(atribuirPrograma('import java.util.Scanner;\nimport java.util.Random;\nclass C { public static void main(String[] a) { } }')).toEqual([]);
  });

  it('varios imports: solo los reales fuera del subconjunto avisan (Scanner no), y salen en el orden del texto', () => {
    const problemas = atribuirPrograma(
      'import java.util.Locale;\nimport java.util.Scanner;\nimport javax.swing.JOptionPane;\nclass C { public static void main(String[] a) { } }',
    );
    expect(problemas).toMatchObject([
      { codigo: 'clase-no-soportada', datos: { nombre: 'java.util.Locale' } },
      { codigo: 'clase-no-soportada', datos: { nombre: 'javax.swing.JOptionPane' } },
    ]);
  });
});

// Tarea 1.29 (agregada por el orquestador, hallada al escribir programas típicos de alumno y
// compararlos con javac): el motor solo conocía como «clase» las 10 de su catálogo, así que un
// programa con `StringBuilder sb = new StringBuilder();`, `Object o;` o `Boolean.parseBoolean("true")`
// (java.lang: se ve SIN import) o con `Locale.setDefault(Locale.US)` tras `import java.util.*;` daba
// `tipo-no-reconocido`/`variable-no-declarada` — errores FALSOS: javac los compila. Cada caso de
// abajo se verificó con javac 17 real; los que no se ven siguen siendo error (javac: «cannot find
// symbol»). JLS 6.4.1/6.4.2: lo que se ve son los tipos de java.lang, los de los imports (exactos y
// con comodín) y la clase del propio programa; una VARIABLE con el mismo nombre oculta a la clase.
describe('atribuir — nombres SIMPLES de clases reales que el programa ve son aviso, no error (tarea 1.29)', () => {
  it('java.lang se ve sin import: "StringBuilder sb = new StringBuilder();" avisa en la declaración y en el "new", nunca "tipo-no-reconocido"', () => {
    expect(atribuirCuerpo('StringBuilder sb = new StringBuilder();')).toMatchObject([
      { codigo: 'clase-no-soportada', categoria: 'no-disponible', datos: { nombre: 'StringBuilder' } },
      { codigo: 'clase-no-soportada', categoria: 'no-disponible', datos: { nombre: 'StringBuilder' } },
    ]);
  });

  it.each(['Object', 'Runtime', 'Thread', 'Number', 'Boolean'])('triangulación: "%s x;" (una clase de java.lang) también avisa, con su propio nombre', (clase) => {
    expect(atribuirCuerpo(`${clase} x;`)).toMatchObject([
      { codigo: 'clase-no-soportada', categoria: 'no-disponible', datos: { nombre: clase } },
    ]);
  });

  it('receptor de un miembro estático: "Boolean.parseBoolean(\\"true\\");" avisa con el nombre de la clase, nunca "variable-no-declarada"', () => {
    expect(atribuirCuerpo('boolean b = Boolean.parseBoolean("true");')).toMatchObject([
      { codigo: 'clase-no-soportada', categoria: 'no-disponible', datos: { nombre: 'Boolean' } },
    ]);
  });

  it('import con comodín: "import java.util.*;" deja ver Locale — "Locale.setDefault(Locale.US);" avisa dos veces (cada uso)', () => {
    const problemas = atribuirPrograma('import java.util.*;\nclass C { public static void main(String[] a) { Locale.setDefault(Locale.US); } }');
    expect(problemas).toMatchObject([
      { codigo: 'clase-no-soportada', datos: { nombre: 'Locale' } },
      { codigo: 'clase-no-soportada', datos: { nombre: 'Locale' } },
    ]);
  });

  it('import exacto de una clase real: "import java.util.Locale;" además del aviso del import, la declaración "Locale l;" avisa (no es «no reconozco el tipo»)', () => {
    const problemas = atribuirPrograma('import java.util.Locale;\nclass C { public static void main(String[] a) { Locale l; } }');
    expect(problemas).toMatchObject([
      { codigo: 'clase-no-soportada', datos: { nombre: 'java.util.Locale' } },
      { codigo: 'clase-no-soportada', datos: { nombre: 'Locale' } },
    ]);
  });

  it('un nombre que NO se ve sigue siendo error: sin el import, "Locale l = Locale.US;" es «no reconozco el tipo» y «variable no declarada» (javac: cannot find symbol ×2)', () => {
    expect(atribuirCuerpo('Locale l = Locale.US;')).toMatchObject([
      { codigo: 'tipo-no-reconocido', datos: { nombre: 'Locale' } },
      { codigo: 'variable-no-declarada', datos: { nombre: 'Locale' } },
    ]);
  });

  it('un import con comodín de OTRO paquete no deja ver la clase: "import java.io.*;" + "Locale l;" sigue siendo «no reconozco el tipo»', () => {
    const problemas = atribuirPrograma('import java.io.*;\nclass C { public static void main(String[] a) { Locale l; } }');
    expect(problemas).toMatchObject([{ codigo: 'tipo-no-reconocido', datos: { nombre: 'Locale' } }]);
  });

  it('la clase del propio programa: "C c = new C();" (objetos propios, REQ-SUB-007) avisa con el nombre de SU clase', () => {
    expect(atribuirCuerpo('C c = new C();')).toMatchObject([
      { codigo: 'clase-no-soportada', datos: { nombre: 'C' } },
      { codigo: 'clase-no-soportada', datos: { nombre: 'C' } },
    ]);
  });

  it('una VARIABLE con el nombre de una clase la oculta (JLS 6.4.2): "int Boolean = 5; int y = Boolean + 1;" no produce ningún problema', () => {
    expect(atribuirCuerpo('int Boolean = 5; int y = Boolean + 1;')).toEqual([]);
  });

  it('control: los nombres del catálogo no cambian — String/Math siguen siendo clases soportadas, sin ningún problema', () => {
    expect(atribuirCuerpo('String s = "a"; int m = Math.max(1, 2);')).toEqual([]);
  });

  // Los tres casos de abajo salieron de los MUTANTES de C7: la primera versión trataba cualquier nombre
  // de clase visible como válido en cualquier posición y 29 mutantes (un identificador reemplazado por el
  // nombre de la propia clase) pasaron de «cannot find symbol» (error) a «no disponible» — veredicto
  // 2596/2625. Un nombre de clase solo vale como TIPO o como receptor de un miembro.
  it('un nombre de clase suelto como VALOR sigue siendo error (javac: cannot find symbol: variable): "int y = Boolean;"', () => {
    expect(atribuirCuerpo('int y = Boolean;')).toMatchObject([{ codigo: 'variable-no-declarada', datos: { nombre: 'Boolean' } }]);
  });

  it('la clase del propio programa NO es receptor válido de un miembro que no existe (mutante real: "Bienvenida.out.println(...)"): error', () => {
    expect(atribuirCuerpo('C.out.println("hola");')).toMatchObject([{ codigo: 'variable-no-declarada', datos: { nombre: 'C' } }]);
  });

  it('...salvo para su propio "main" (recursión de main, REQ-SUB-007): "C.main(a);" avisa, no es error', () => {
    // Tarea 1.34: pasar `a` (el arreglo `args`) como argumento es, además, un uso del arreglo: el segundo aviso (el primero por posición sigue siendo el de la clase).
    expect(atribuirCuerpo('C.main(a);')).toMatchObject([
      { codigo: 'clase-no-soportada', datos: { nombre: 'C' } },
      { codigo: 'arreglo-no-soportado', datos: { tipoArreglo: 'String[]' } },
    ]);
    expect(atribuirCuerpo('C.main(null);')[0]).toMatchObject({ codigo: 'clase-no-soportada', datos: { nombre: 'C' } });
  });
});

// Tarea 1.29 (causa 11): un nombre de clase escrito CON su paquete (`java.util.Scanner`, `java.lang.Math`)
// existe en el JDK y javac lo compila sin `import`; el subconjunto solo entiende el nombre corto — un
// aviso, no un error. Una clase que NO existe con ese nombre completo sigue siendo el error de siempre.
describe('atribuir — nombres de clase con su paquete (tarea 1.29)', () => {
  it('"java.util.Scanner sc = new java.util.Scanner(System.in);" avisa en la declaración y en el new, con el nombre completo', () => {
    expect(atribuirCuerpo('java.util.Scanner sc = new java.util.Scanner(System.in);')).toMatchObject([
      { codigo: 'nombre-calificado-no-soportado', categoria: 'no-disponible', datos: { nombre: 'java.util.Scanner' } },
      { codigo: 'nombre-calificado-no-soportado', categoria: 'no-disponible', datos: { nombre: 'java.util.Scanner' } },
    ]);
  });

  it('una clase que existe pero el subconjunto no simula ("javax.swing.JOptionPane x;") también avisa por su nombre completo', () => {
    expect(atribuirCuerpo('javax.swing.JOptionPane x;')).toMatchObject([
      { codigo: 'nombre-calificado-no-soportado', datos: { nombre: 'javax.swing.JOptionPane' } },
    ]);
  });

  it('un nombre completo que NO existe ("java.util.Scaner sc;") sigue siendo «no reconozco el tipo»', () => {
    expect(atribuirCuerpo('java.util.Scaner sc;')).toMatchObject([{ codigo: 'tipo-no-reconocido', datos: { nombre: 'java.util.Scaner' } }]);
  });

  it('como receptor de un miembro estático ("int m = java.lang.Math.max(1, 2);") avisa con la clase, no con «java»', () => {
    expect(atribuirCuerpo('int m = java.lang.Math.max(1, 2);')).toMatchObject([
      { codigo: 'nombre-calificado-no-soportado', datos: { nombre: 'java.lang.Math' } },
    ]);
  });

  it('un miembro anidado de la clase ("java.lang.System.out.println(1);") avisa con la CLASE que es el prefijo, no con "java.lang.System.out"', () => {
    expect(atribuirCuerpo('java.lang.System.out.println(1);')).toMatchObject([
      { codigo: 'nombre-calificado-no-soportado', datos: { nombre: 'java.lang.System' } },
    ]);
  });

  it('una cadena con un primer nombre que no es paquete ni clase real sigue siendo «variable no declarada» ("java.util.Foo.bar();" → "java")', () => {
    expect(atribuirCuerpo('java.util.Foo.bar();')).toMatchObject([{ codigo: 'variable-no-declarada', datos: { nombre: 'java' } }]);
  });

  it('una VARIABLE que se llama como un paquete oculta el nombre completo: "int java = 1; int x = java;" no produce problemas', () => {
    expect(atribuirCuerpo('int java = 1; int x = java;')).toEqual([]);
  });
});

// ============================================================================================================
// Tarea 1.32 (agregada por el orquestador, decisión del PO 2026-09-29: «A, corrígelo antes del merge»): las familias de
// ATRIBUCIÓN que encontró el generador diferencial de la 1.31. Cada caso está verificado contra javac 17.0.18 real (sonda del
// 2026-09-29); el principio: dentro del subconjunto (REQ-SUB-002/REQ-SUB-005) se modela la regla de javac y sale un error;
// fuera, aviso de «no disponible», sin modelar la regla.
// ============================================================================================================

// N1 — tipos envoltorio. REQ-SUB-002 lista los tipos de variable del subconjunto: `int`, `double`, `boolean`, `char`,
// `String` y `long`; REQ-SUB-005 nombra `Integer`, `Double`, `Long` y `Character` solo como CLASES ESTÁTICAS (`Integer.parseInt`,
// `Long.MAX_VALUE`, `Character.isDigit`). Declarar una variable `Long m = 0;` está FUERA de U3–U7: aviso de «no disponible», sin
// modelar el boxing (javac rechaza `Long m = 0;` y `Integer k = 5; boolean b = k;`, y compila `Long l = 5L;`; el aviso es
// la respuesta honesta para las tres). Antes el motor los tomaba por tipos válidos y desconocidos, y todo lo que seguía se
// aceptaba en silencio (el generador encontró 211 discrepancias N1–N6 en 35 000 programas).
describe('atribuir — tipos envoltorio como TIPO de variable (N1, tarea 1.32): fuera del subconjunto, aviso — sin modelar el boxing', () => {
  it.each([
    ['Long m = 0;', 'Long'],
    ['Integer k = 5;', 'Integer'],
    ['Double d = 1.5;', 'Double'],
    ["Character c = 'a';", 'Character'],
  ])('"%s" avisa la clase real que el subconjunto no simula', (cuerpo, nombre) => {
    expect(atribuirCuerpo(cuerpo)).toMatchObject([{ codigo: 'clase-no-soportada', categoria: 'no-disponible', datos: { nombre } }]);
  });

  it('lo que sigue a la declaración no se modela: "Integer k = 5; boolean b = k;" da SOLO el aviso (una variable de tipo desconocido no cascada errores)', () => {
    const problemas = atribuirCuerpo('Integer k = 5; boolean b = k;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'clase-no-soportada', datos: { nombre: 'Integer' } });
  });

  it('el mismo nombre como clase ESTÁTICA sigue siendo del subconjunto (REQ-SUB-005): Integer.parseInt, Long.MAX_VALUE, Double.parseDouble, Character.isDigit', () => {
    expect(
      atribuirCuerpo(`int n = Integer.parseInt("5"); long m = Long.MAX_VALUE; double d = Double.parseDouble("2.5"); boolean b = Character.isDigit('5');`),
    ).toEqual([]);
  });

  it('"new Integer(5)" también avisa la clase (no es uno de los constructores del subconjunto)', () => {
    expect(atribuirCuerpo('new Integer(5);')).toMatchObject([{ codigo: 'clase-no-soportada', categoria: 'no-disponible', datos: { nombre: 'Integer' } }]);
  });

  it('un nombre del catálogo que NO es un tipo del subconjunto y ni siquiera está a la vista ("PrintStream", de java.io, sin import) es «no reconozco el tipo», como en javac', () => {
    expect(atribuirPrograma('class C { public static void main(String[] a) { PrintStream p = System.out; } }')).toMatchObject([
      { codigo: 'tipo-no-reconocido', datos: { nombre: 'PrintStream' } },
    ]);
  });

  it('...y con su import es una clase real que el subconjunto no simula: aviso del import (tarea 1.29) y aviso de la declaración', () => {
    expect(
      atribuirPrograma('import java.io.PrintStream; class C { public static void main(String[] a) { PrintStream p = System.out; } }'),
    ).toMatchObject([
      { codigo: 'clase-no-soportada', datos: { nombre: 'java.io.PrintStream' } },
      { codigo: 'clase-no-soportada', datos: { nombre: 'PrintStream' } },
    ]);
  });

  it('control: los cuatro tipos de referencia y primitivos del subconjunto NO cambian — String, Scanner y Random con su import, y los cinco primitivos', () => {
    expect(
      atribuirPrograma(
        'import java.util.*; class C { public static void main(String[] a) { String s = "x"; Scanner sc = new Scanner(System.in); Random r = new Random(); int i = 1; long l = 2L; double d = 3.0; boolean b = true; char c = \'c\'; } }',
      ),
    ).toEqual([]);
  });
});

// F3 — `final` con `++`/`--` (JLS 15.14/15.15 + 4.12.4). javac 17 da `cant.assign.val.to.final.var` («cannot assign a value to
// final variable k») en la pasada de ATRIBUCIÓN (`Attr.visitIdent` → `checkAssignable`) para `k = 2;`, `k += 2;`, `k++;`,
// `++k;`, `k--;` y `--k;`, y lo da ANTES que cualquier error de tipos del mismo operando (`final String s; s++;`: solo el
// `final`). Como «final sin inicializador» es NO-DISP (REQ-SUB-007), toda `final` del subconjunto ya trae su único valor: cualquier
// modificación posterior es un error, sin mirar el flujo. Antes `k = 2;`/`k += 2;` se detectaban en la pasada de asignación
// definitiva (4) y `k++;`/`++k;` no se detectaban en ninguna: el generador encontró 202 falsos aceptos de esta familia.
describe('atribuir — modificar una variable "final" (F3, tarea 1.32): "=", "op=", "++" y "--" son el mismo error, en la pasada de atribución', () => {
  it.each([
    ['final int k = 0; k++;', 'k'],
    ['final int k = 0; ++k;', 'k'],
    ['final int k = 3; k--;', 'k'],
    ['final int k = 3; --k;', 'k'],
    ['final double t = 0.5; t++;', 't'],
    ["final char c = 'a'; c++;", 'c'],
    ['final int k = 0; k = 2;', 'k'],
    ['final int k = 0; k += 2;', 'k'],
    ['final boolean listo = true; listo = false;', 'listo'],
  ])('%s → "variable-final-reasignada"', (cuerpo, nombre) => {
    expect(atribuirCuerpo(cuerpo)).toMatchObject([{ codigo: 'variable-final-reasignada', datos: { nombre } }]);
  });

  it('el operando final SE INCREMENTA dentro de una expresión mayor: "final int k = 0; int j = k++;", "if (k-- > 0)", "for (…; …; k++)"', () => {
    expect(atribuirCuerpo('final int k = 0; int j = k++;')).toMatchObject([{ codigo: 'variable-final-reasignada' }]);
    expect(atribuirCuerpo('final int k = 5; if (k-- > 0) { }')).toMatchObject([{ codigo: 'variable-final-reasignada' }]);
    expect(atribuirCuerpo('final int k = 0; for (int i = 0; i < 3; k++) { }')).toMatchObject([{ codigo: 'variable-final-reasignada' }]);
  });

  it('el error del `final` gana al del tipo del operando (javac: solo «cannot assign a value to final variable s»): "final String s = \\"a\\"; s++;"', () => {
    expect(atribuirCuerpo('final String s = "a"; s++;')).toMatchObject([{ codigo: 'variable-final-reasignada', datos: { nombre: 's' } }]);
  });

  it('javac reporta en el ORDEN DEL TEXTO: un `final` modificado en la línea 1 gana a un error de tipos de la línea 2 (los dos son de atribución)', () => {
    const problemas = atribuirCuerpo('final int k = 0;\nk = 2;\nint x = "s";');
    expect(problemas).toMatchObject([{ codigo: 'variable-final-reasignada' }, { codigo: 'tipos-incompatibles-en-asignacion' }]);
    expect(problemas[0].rango.inicio).toBeLessThan(problemas[1].rango.inicio);
  });

  it('triangulación: la asignación a una final con un valor de otro tipo da los dos errores, el del `final` primero (javac: lhs antes que rhs)', () => {
    expect(atribuirCuerpo('final int k = 0; k = "a";')).toMatchObject([
      { codigo: 'variable-final-reasignada' },
      { codigo: 'tipos-incompatibles-en-asignacion' },
    ]);
  });

  it('control: una variable NO final se modifica libremente, y una final se LEE sin problema', () => {
    expect(atribuirCuerpo('int k = 0; k++; ++k; k--; --k; k = 2; k += 2;')).toEqual([]);
    expect(atribuirCuerpo('final int k = 5; int y = k + 1; y++; final String s = "a"; String t = s + y;')).toEqual([]);
  });

  it('control: la "final" de un bloque hermano ya cerrado no afecta a otra variable con el mismo nombre', () => {
    expect(atribuirCuerpo('if (true) { final int k = 1; } int k = 0; k++;')).toEqual([]);
  });
});

// F5 — un método que NO devuelve nada (`void`: `System.out.print`, `System.out.println`, `Scanner.close`) usado como VALOR. javac 17
// lo rechaza en todo contexto que necesita un valor: «incompatible types: void cannot be converted to int» (`prob.found.req`) en un
// inicializador, una asignación, una condición o un cast, y «'void' type not allowed here» (`void.not.allowed.here`) como
// argumento o como operando. Solo es válido como sentencia (y en la actualización de un `for`). El motor tipaba su llamada como
// «desconocido» (el sumidero de cascada) y aceptaba todo: el generador encontró 392 falsos aceptos de esta familia. `void` NO es
// un `Tipo` del subconjunto: `tipoDeExpresion` sigue dando «desconocido» (así ningún error se propaga en cascada) y un predicado
// aparte (`esLlamadaSinValor`) reconoce la llamada cuya firma real, del oráculo, devuelve `void`.
describe('atribuir — un método sin valor de retorno (void) usado como VALOR (F5, tarea 1.32)', () => {
  it.each([
    ['int b = System.out.print(7);', 'System.out.print'],
    ['String s = System.out.println();', 'System.out.println'],
    ['System.out.print(System.out.print(0));', 'System.out.print'],
    ['System.out.println(System.out.println());', 'System.out.println'],
    ['if (System.out.print(2)) { }', 'System.out.print'],
    ['while (System.out.print(7)) { }', 'System.out.print'],
    ['do { } while (System.out.print(7));', 'System.out.print'],
    ['for (; System.out.print(7); ) { }', 'System.out.print'],
    ['for (int i = System.out.print(1); i < 3; i++) { }', 'System.out.print'],
    ['switch (System.out.print(7)) { }', 'System.out.print'],
    ['int y; y = System.out.print(1);', 'System.out.print'],
    ['int x = 1; x += System.out.print(1);', 'System.out.print'],
    ['int x = 1 + System.out.print(1);', 'System.out.print'],
    ['String t = "a" + System.out.print(1);', 'System.out.print'],
    ['boolean q = System.out.print(1) == 1;', 'System.out.print'],
    ['boolean z = !System.out.print(1);', 'System.out.print'],
    ['int m = -System.out.print(1);', 'System.out.print'],
    ['System.out.println((int) System.out.print(7));', 'System.out.print'],
    ['Math.abs(System.out.println());', 'System.out.println'],
    ['System.err.println(System.out.println());', 'System.out.println'],
  ])('%s → "llamada-sin-valor" (una sola vez, sin cascada)', (cuerpo, llamada) => {
    expect(atribuirCuerpo(cuerpo)).toMatchObject([{ codigo: 'llamada-sin-valor', datos: { llamada } }]);
  });

  it('el `void` de otra clase del subconjunto: "Scanner.close()" en un inicializador, en un argumento y como receptor de otra llamada', () => {
    const programa = (cuerpo: string) => atribuirPrograma(`import java.util.Scanner; class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); ${cuerpo} } }`);
    expect(programa('int h = sc.close();')).toMatchObject([{ codigo: 'llamada-sin-valor', datos: { llamada: 'sc.close' } }]);
    expect(programa('System.out.println(sc.close());')).toMatchObject([{ codigo: 'llamada-sin-valor', datos: { llamada: 'sc.close' } }]);
    expect(programa('sc.close().foo();')).toMatchObject([{ codigo: 'llamada-sin-valor', datos: { llamada: 'sc.close' } }]);
  });

  it('si el receptor no es una cadena de nombres, el texto usa solo el nombre del método: "new Scanner(System.in).close()"', () => {
    const problemas = atribuirPrograma('import java.util.Scanner; class C { public static void main(String[] a) { int h = new Scanner(System.in).close(); } }');
    expect(problemas).toMatchObject([{ codigo: 'llamada-sin-valor', datos: { llamada: 'close' } }]);
  });

  it('el problema señala la LLAMADA (la línea de javac), no el principio de la sentencia: "int p = 0;\\nint b = System.out.print(7);" señala la llamada, en la línea 3 del programa', () => {
    const fuente = 'class C { public static void main(String[] a) {\nint p = 0;\nint b = System.out.print(7);\n} }';
    const [problema] = atribuirPrograma(fuente);
    expect(problema).toMatchObject({ codigo: 'llamada-sin-valor' });
    if (problema === undefined) return;
    expect(fuente.slice(problema.rango.inicio, problema.rango.fin)).toBe('System.out.print(7)');
    expect(new TablaDeLineas(fuente).ubicar(problema.rango.inicio).linea).toBe(3);
  });

  it('control: un método void como SENTENCIA es correcto, también en la actualización de un `for`; y `printf` (que devuelve un PrintStream) como argumento ya no pasa en silencio (tarea 1.33)', () => {
    expect(atribuirCuerpo('System.out.println("a"); System.out.print(1); System.out.println();')).toEqual([]);
    expect(atribuirCuerpo('for (int i = 0; i < 3; System.out.print(i), i++) { }')).toEqual([]);
    // Tarea 1.33: antes de esta tarea este control esperaba `[]`. javac compila `println(System.out.printf(...))` (println(Object) recibe el PrintStream), pero el
    // subconjunto no modela ese tipo: dejarlo pasar era un resultado sin comprobar. Ahora es el aviso de «valor de un tipo que no manejo» (bloque de printf, más abajo).
    expect(atribuirCuerpo('System.out.println(System.out.printf("%d", 1));')).toMatchObject([{ codigo: 'valor-de-tipo-no-soportado', categoria: 'no-disponible' }]);
    expect(atribuirPrograma('import java.util.Scanner; class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); sc.close(); } }')).toEqual([]);
  });

  it('control: los métodos con valor se siguen usando como valor en todos esos contextos', () => {
    expect(atribuirCuerpo('int n = Math.abs(-1); String s = String.valueOf(n); if (s.isEmpty()) { } while (s.length() > 3) { } System.out.println(Math.max(1, 2) + s);')).toEqual([]);
  });
});

// F2 — un MIEMBRO de un valor primitivo. Un `int`, `long`, `double`, `char` o `boolean` no es un objeto: no tiene métodos ni campos.
// javac 17 da `cant.deref` («int cannot be dereferenced») para `n.length()`, `n.length`, `0L.foo()`, `'a'.equals(5)`, `(x + 2).toString()`,
// `s.length().foo()` y para una VARIABLE primitiva que tapa el nombre de una clase (`int System; System.out.println("");`, JLS 6.4.2
// y 6.5.2: un nombre simple que es una variable en alcance se clasifica como expresión antes que como tipo). Antes el motor no
// tenía clase para el receptor primitivo (`claseDelObjeto` da `null`) y callaba: el generador encontró 451 falsos aceptos.
describe('atribuir — un miembro de un valor primitivo (F2, tarea 1.32): "int cannot be dereferenced"', () => {
  it.each([
    ['int n = 5; int d = n.length();', 'int', 'length', 'n'],
    ['long g = 1L; g.foo();', 'long', 'foo', 'g'],
    ['double p = 9.5; boolean q = p.equals(9.5);', 'double', 'equals', 'p'],
    ["char c = 'a'; c.toUpperCase();", 'char', 'toUpperCase', 'c'],
    ['boolean b = true; b.toString();', 'boolean', 'toString', 'b'],
    ['int n = 5; int d = n.length;', 'int', 'length', 'n'],
    ['int n = 1; System.out.println(n.toString());', 'int', 'toString', 'n'],
    ['0L.foo();', 'long', 'foo', null],
    ["'a'.equals(5);", 'char', 'equals', null],
    ['0.0.equals(5);', 'double', 'equals', null],
    ['true.foo();', 'boolean', 'foo', null],
    ['String s = "a"; s.length().foo();', 'int', 'foo', null],
    ['int x = 1; (x + 2).toString();', 'int', 'toString', null],
    ['int x = 1; ((int) 2.5).toString();', 'int', 'toString', null],
  ])('%s → "miembro-de-primitivo" (una sola vez)', (cuerpo, tipo, nombre, receptor) => {
    const problemas = atribuirCuerpo(cuerpo);
    expect(problemas).toMatchObject([{ codigo: 'miembro-de-primitivo' }]);
    expect(problemas[0]?.datos).toEqual(receptor === null ? { tipo, nombre } : { tipo, nombre, receptor });
  });

  it('una VARIABLE primitiva que se llama como una clase del JDK la tapa (JLS 6.4.2): "int System = 3; System.out.println(...)" y las demás formas de `System.out`', () => {
    const tapada = { tipo: 'int', receptor: 'System' };
    expect(atribuirCuerpo('int System = 3; System.out.println("hola");')).toMatchObject([{ codigo: 'miembro-de-primitivo', datos: { ...tapada, nombre: 'out' } }]);
    expect(atribuirCuerpo('int System = 3; System.out.print(1);')).toMatchObject([{ codigo: 'miembro-de-primitivo', datos: { ...tapada, nombre: 'out' } }]);
    expect(atribuirCuerpo('int System = 3; System.err.println("x");')).toMatchObject([{ codigo: 'miembro-de-primitivo', datos: { ...tapada, nombre: 'err' } }]);
    expect(atribuirCuerpo('int System = 3; System.out.printf("x");')).toMatchObject([{ codigo: 'miembro-de-primitivo', datos: { ...tapada, nombre: 'out' } }]);
    expect(atribuirCuerpo('char Character = 0; int e = Character.SIZE;')).toMatchObject([{ codigo: 'miembro-de-primitivo', datos: { tipo: 'char', nombre: 'SIZE' } }]);
  });

  it('una VARIABLE de un tipo de referencia que tapa a `System` no tiene el campo `out`: "campo-no-declarado" (javac: cannot find symbol)', () => {
    expect(atribuirCuerpo('String System = "a"; System.out.println("x");')).toMatchObject([
      { codigo: 'campo-no-declarado', datos: { clase: 'String', nombre: 'out' } },
    ]);
    expect(atribuirPrograma('import java.util.Random; class C { public static void main(String[] a) { Random System = new Random(); System.out.print(1); } }')).toMatchObject([
      { codigo: 'campo-no-declarado', datos: { clase: 'Random', nombre: 'out' } },
    ]);
  });

  // Tarea 1.35 (hallado por una semilla nueva del fuzzer de tokens, el programa `Bisiesto` con `main(String[] System)`; javac: «cannot find symbol»): el PARÁMETRO de `main` es un
  // arreglo, y si se llama `System` tapa a la clase igual que cualquier variable. `println` y `print` van por un camino propio que no miraba el tipo de esa variable (un arreglo es
  // «desconocido» para el subconjunto) y el programa terminaba en «pasó todas mis revisiones». Un arreglo está fuera del subconjunto: aviso, como todo uso de `args`.
  it('el parámetro de `main` llamado `System` (un arreglo) tapa a la clase: `System.out.println(1);` y `System.out.print(1);` son el aviso de arreglo, nunca «sí»', () => {
    for (const metodo of ['println', 'print']) {
      expect(atribuirPrograma(`class C { public static void main(String[] System) { System.out.${metodo}(1); } }`)).toMatchObject([
        { categoria: 'no-disponible', codigo: 'arreglo-no-soportado', datos: { tipoArreglo: 'String[]' } },
      ]);
    }
  });

  it('control: sin uso de `System.out` el parámetro llamado `System` es válido, y un `System` que no es el parámetro no avisa de arreglos', () => {
    expect(atribuirPrograma('class C { public static void main(String[] System) { int x = 1; } }')).toEqual([]);
    expect(atribuirCuerpo('System.out.println(1);')).toEqual([]);
  });

  it('el error señala el miembro del valor primitivo (la línea de javac): "int n = 5;\\nint d = n.length();" en la línea 3 del programa', () => {
    const fuente = 'class C { public static void main(String[] a) {\nint n = 5;\nint d = n.length();\n} }';
    const [problema] = atribuirPrograma(fuente);
    expect(problema).toMatchObject({ codigo: 'miembro-de-primitivo' });
    if (problema === undefined) return;
    expect(new TablaDeLineas(fuente).ubicar(problema.rango.inicio).linea).toBe(3);
  });

  it('control: los miembros de un String, de un Scanner, y los de las clases estáticas NO cambian', () => {
    expect(atribuirCuerpo('String s = "hola"; int n = s.length(); char c = s.charAt(0); boolean v = s.isEmpty(); String m = s.toUpperCase();')).toEqual([]);
    expect(atribuirCuerpo('int m = Math.max(1, 2); int p = Integer.parseInt("5"); boolean d = Character.isDigit(\'5\'); double x = Math.PI; long l = Long.MAX_VALUE;')).toEqual([]);
    expect(atribuirCuerpo('System.out.println("hola"); System.err.println("x"); System.out.printf("%d", 1);')).toEqual([]);
  });

  it('control: una variable con el nombre de una clase pero de un tipo de referencia que SÍ tiene el miembro se usa con normalidad (javac compila)', () => {
    expect(atribuirCuerpo('String String = "a"; int n = String.length();')).toEqual([]);
    expect(atribuirCuerpo('int Math = 5; int y = Math + 1;')).toEqual([]);
  });
});

// F1 — cast inválido (JLS 5.5). Entre los 8 tipos del subconjunto, javac 17.0.18 acepta un cast en 20 de los 64 pares
// (origen → destino): los cuatro numéricos (`int`, `long`, `double`, `char`) entre sí (16) y la identidad de `boolean`, `String`,
// `Scanner` y `Random` (4). Los otros 44 son `prob.found.req` («incompatible types: String cannot be converted to int»), reportado
// en el OPERANDO del cast. La TABLA de los 64 pares es un dato de javac que vive en `pruebas/compilacion/tablas-de-atribucion.ts`
// (con su prueba de punta a punta, `tablas-de-atribucion.test.ts`, y su verificación contra el JDK real, `herramientas/oraculo/
// atribucion-tablas.test.ts`); aquí van las formas en que aparece un cast, dónde se señala y qué NO se propaga. Antes el motor aceptaba
// los 44 (`tipoDeExpresion` de un cast era siempre el tipo destino): el generador encontró 1 848 falsos aceptos, la familia más grande.
describe('atribuir — cast inválido (F1, tarea 1.32): formas, posición y cascada', () => {
  it.each([
    ['int c = (int) "";', 'String', 'int'],
    ['System.out.println((long) "");', 'String', 'long'],
    ['Math.abs((long) "");', 'String', 'long'],
    ['int w; w = (int) "";', 'String', 'int'],
    ['boolean z = 0 != (int) true;', 'boolean', 'int'],
    ['int d = 0; d += (int) true;', 'boolean', 'int'],
    ['if ((boolean) 1) { }', 'int', 'boolean'],
    ['double t = 2 * (double) "9.5";', 'String', 'double'],
  ])('%s → "cast-invalido" (%s → %s), una sola vez', (cuerpo, origen, destino) => {
    expect(atribuirCuerpo(cuerpo)).toMatchObject([{ codigo: 'cast-invalido', datos: { origen, destino } }]);
  });

  it('un cast inválido NO se propaga: su tipo es «desconocido» (javac: tipo erróneo). "String s = (int) true;" da SOLO el cast, no también el de la asignación', () => {
    expect(atribuirCuerpo('String s = (int) true;')).toMatchObject([{ codigo: 'cast-invalido', datos: { origen: 'boolean', destino: 'int' } }]);
  });

  it('javac señala el OPERANDO del cast (`int c = (int) texto;` con el signo ^ bajo `texto`), no el paréntesis', () => {
    const fuente = 'class C { public static void main(String[] a) { String t = "1";\nint c = (int) t;\n} }';
    const [problema] = atribuirPrograma(fuente);
    expect(problema).toMatchObject({ codigo: 'cast-invalido' });
    if (problema === undefined) return;
    expect(fuente.slice(problema.rango.inicio, problema.rango.fin)).toBe('t');
    expect(new TablaDeLineas(fuente).ubicar(problema.rango.inicio).linea).toBe(2);
  });

  it('un operando que ya es un error no se vuelve a reportar: "int c = (int) noExiste;" da solo la variable no declarada', () => {
    expect(atribuirCuerpo('int c = (int) noExiste;')).toMatchObject([{ codigo: 'variable-no-declarada', datos: { nombre: 'noExiste' } }]);
  });

  it('el NOMBRE del tipo del cast se valida como el de una declaración: "(Foo) 5" → no reconozco el tipo; "(Scanner) 1L" sin import → falta el import (N5)', () => {
    expect(atribuirCuerpo('int c = (Foo) 5;')).toMatchObject([{ codigo: 'tipo-no-reconocido', datos: { nombre: 'Foo' } }]);
    expect(atribuirPrograma('import java.util.Random; class C { public static void main(String[] a) { System.out.println((Scanner) 1L); } }')).toMatchObject([
      { codigo: 'tipo-requiere-import', datos: { nombre: 'Scanner' } },
    ]);
    expect(atribuirPrograma('class C { public static void main(String[] a) { Object o = (Random) 1L; } }')).toMatchObject([
      { codigo: 'clase-no-soportada', datos: { nombre: 'Object' } },
      { codigo: 'tipo-requiere-import', datos: { nombre: 'Random' } },
    ]);
  });

  it('un cast a un tipo que el subconjunto no simula (un envoltorio) es un aviso, sin modelar javac: "(Integer) 5" y "(Integer) \\"5\\""', () => {
    expect(atribuirCuerpo('Object o = (Integer) 5;')).toMatchObject([
      { codigo: 'clase-no-soportada', datos: { nombre: 'Object' } },
      { codigo: 'clase-no-soportada', datos: { nombre: 'Integer' } },
    ]);
    expect(atribuirCuerpo('System.out.println((Integer) "5");')).toMatchObject([{ codigo: 'clase-no-soportada', datos: { nombre: 'Integer' } }]);
  });

  it('control: los casts numéricos de siempre siguen limpios, dentro de expresiones', () => {
    expect(atribuirCuerpo("int a1 = (int) 3.99; double b = (double) 3 / 2; char c = (char) (65 + 1); long l = (long) a1 * 2; int d = (int) 'a' + 1; String s = (String) \"x\";")).toEqual([]);
  });
});

// F4 — etiquetas de `switch`. Cada `case` debe ser ASIGNABLE al tipo del selector (JLS 14.11) y solo puede haber un `default`. javac
// 17.0.18 (sonda del 2026-09-29, `T v = valor; switch (v) { case E: }`) rechaza con `prob.found.req` la etiqueta de otro tipo y con
// `duplicate.default.label` el segundo `default`; con un selector `long`, `double` o `boolean` rechaza el selector mismo
// (`preview.feature.disabled.plural`). El tipo de la etiqueta se comprueba ANTES que su constancia y que su duplicado, como javac
// (`attribTree(expr, …, seltype)`): `String t = ""; switch (0) { case t: }` es un error de TIPO, no «constant expression required».
// Antes ninguna de las 15 celdas rechazadas por javac se detectaba: el generador encontró 115 falsos aceptos.
// La TABLA de las 39 celdas selector × etiqueta (y los tres selectores que javac rechaza él mismo) es un dato de javac que vive en
// `pruebas/compilacion/tablas-de-atribucion.ts`, con su prueba de punta a punta y su verificación contra el JDK real; aquí, el orden en
// que se revisa cada etiqueta y sus casos límite.

describe('atribuir — etiqueta de `switch` de otro tipo que el selector (F4, tarea 1.32): tipo, constancia y duplicado, en el orden de javac', () => {
  it.each([
    ['int v = 0; switch (v) { case "x": break; }', 'String', 'int'],
    ['int v = 0; switch (v) { case 1L: break; }', 'long', 'int'],
    ['int v = 0; switch (v) { case 1.5: break; }', 'double', 'int'],
    ['int v = 0; switch (v) { case true: break; }', 'boolean', 'int'],
    ["char v = 'a'; switch (v) { case 70000: break; }", 'int', 'char'],
    ["char v = 'a'; switch (v) { case -1: break; }", 'int', 'char'],
    ['String v = ""; switch (v) { case 1: break; }', 'int', 'String'],
    ['String v = ""; switch (v) { case \'a\': break; }', 'char', 'String'],
  ])('%s → "etiqueta-de-case-de-otro-tipo" (%s en un switch de %s)', (cuerpo, etiqueta, selector) => {
    expect(atribuirCuerpo(cuerpo)).toMatchObject([{ codigo: 'etiqueta-de-case-de-otro-tipo', datos: { etiqueta, selector } }]);
  });

  it('lo que javac acepta no se rechaza: `char` en un `int`, un `int` constante que cabe en un `char`, una constante `String`', () => {
    expect(atribuirCuerpo("int v = 0; switch (v) { case 'a': break; case 70000: break; case 1 + 1: break; }")).toEqual([]);
    expect(atribuirCuerpo("char v = 'a'; switch (v) { case 65: break; case 'b': break; case (char) 5: break; case 'a' + 2: break; }")).toEqual([]);
    expect(atribuirCuerpo('String v = ""; switch (v) { case "x": break; }')).toEqual([]);
  });

  it.each([['long', '0L'], ['double', '0.0'], ['boolean', 'true']])(
    'un selector %s se rechaza él (y las etiquetas no dan un segundo error): "switch (v) { case 1: }"',
    (selector, valor) => {
      expect(atribuirCuerpo(`${selector} v = ${valor}; switch (v) { case 1: break; }`)).toMatchObject([
        { codigo: 'selector-de-switch-invalido', datos: { tipo: selector } },
      ]);
    },
  );

  it('el tipo se comprueba ANTES que la constancia: una variable String no constante es un error de TIPO ("incompatible types"), no «constant expression required»', () => {
    expect(atribuirCuerpo('String t = ""; switch (0) { case t: break; }')).toMatchObject([
      { codigo: 'etiqueta-de-case-de-otro-tipo', datos: { etiqueta: 'String', selector: 'int' } },
    ]);
  });

  it('una constante `final` también cuenta con su tipo: "final String t = \\"x\\"; switch (0) { case t: }" y "final int k = 1; switch (\\"a\\") { case k: }"', () => {
    expect(atribuirCuerpo('final String t = "x"; switch (0) { case t: break; }')).toMatchObject([
      { codigo: 'etiqueta-de-case-de-otro-tipo', datos: { etiqueta: 'String', selector: 'int' } },
    ]);
    expect(atribuirCuerpo('final int k = 1; switch ("a") { case k: break; }')).toMatchObject([
      { codigo: 'etiqueta-de-case-de-otro-tipo', datos: { etiqueta: 'int', selector: 'String' } },
    ]);
    expect(atribuirCuerpo('final int k = 1; switch (0) { case k: break; }')).toEqual([]);
  });

  it('el orden es el del texto y del tipo antes que el duplicado: "case 1: case \\"a\\": case 1:" da primero el error de tipo de "a" y luego el duplicado', () => {
    const problemas = atribuirCuerpo('switch (0) { case 1: case "a": case 1: }');
    expect(problemas).toMatchObject([{ codigo: 'etiqueta-de-case-de-otro-tipo' }, { codigo: 'etiqueta-de-case-duplicada' }]);
    expect(problemas[0]?.rango.inicio).toBeLessThan(problemas[1]?.rango.inicio ?? 0);
  });

  it('control: lo que NO cambia — una variable no constante sigue siendo «no constante», una etiqueta sin declarar no dispara el tipo, un duplicado sigue siendo duplicado', () => {
    expect(atribuirCuerpo('int k = 1; switch (k) { case k: break; }')).toMatchObject([{ codigo: 'etiqueta-de-case-no-constante' }]);
    expect(atribuirCuerpo('switch (0) { case zzz: break; }')).toMatchObject([{ codigo: 'etiqueta-de-case-no-constante' }, { codigo: 'variable-no-declarada' }]);
    expect(atribuirCuerpo("char c = 'a'; switch (c) { case 66: case 66: break; }")).toMatchObject([{ codigo: 'etiqueta-de-case-duplicada' }]);
  });
});

describe('atribuir — dos `default` en el mismo `switch` (F4, tarea 1.32): «duplicate default label»', () => {
  it('el SEGUNDO `default` se rechaza, con la línea de ese `default` (la que señala javac)', () => {
    const fuente = 'class C { public static void main(String[] a) {\nswitch (0) {\ndefault:\ndefault:\n}\n} }';
    const problemas = atribuirPrograma(fuente);
    expect(problemas).toMatchObject([{ codigo: 'etiqueta-default-duplicada' }]);
    expect(new TablaDeLineas(fuente).ubicar(problemas[0]?.rango.inicio ?? 0).linea).toBe(4);
  });

  it('con tres `default` se rechazan el segundo y el tercero, y no importa lo que haya entre ellos: "case 1: default: case 2: default:"', () => {
    expect(atribuirCuerpo('switch (0) { default: default: default: }')).toMatchObject([{ codigo: 'etiqueta-default-duplicada' }, { codigo: 'etiqueta-default-duplicada' }]);
    expect(atribuirCuerpo('switch (0) { case 1: default: case 2: default: }')).toMatchObject([{ codigo: 'etiqueta-default-duplicada' }]);
  });

  it('un `default` por `switch` es correcto, también en `switch` anidados (cada uno cuenta el suyo)', () => {
    expect(atribuirCuerpo('switch (0) { case 1: break; default: break; }')).toEqual([]);
    expect(atribuirCuerpo('switch (0) { default: switch (1) { default: break; } }')).toEqual([]);
  });
});

// F6 y N5 — el NOMBRE DE UNA CLASE como receptor (`String.trim()`, `Scanner.nextInt()`). javac 17 compara lo que el nombre designa
// (JLS 6.5.2): una variable en alcance gana; si no, una clase que el programa VE (`java.lang` o un `import`). Con la clase a la
// vista, el método elegido por sobrecarga debe ser `static` (F6: `non-static method trim() cannot be referenced from a static
// context`, `non-static.cant.be.ref`); sin el `import` (N5) la clase ni siquiera existe (`cant.resolve.location`, «cannot find symbol»).
// El generador encontró 141 falsos aceptos de F6 y varios de N5. La firma real (con `esEstatico`) viene del oráculo (`FIRMAS_JDK`).
describe('atribuir — un método de instancia llamado con el nombre de la clase (F6, tarea 1.32): "non-static method … cannot be referenced from a static context"', () => {
  const conImports = (cuerpo: string) => atribuirPrograma(`import java.util.*; class C { public static void main(String[] a) { ${cuerpo} } }`);

  it.each([
    ['String.trim();', 'String', 'trim'],
    ['String.length();', 'String', 'length'],
    ['String.replace("", "");', 'String', 'replace'],
    ['String.charAt(0);', 'String', 'charAt'],
    ['String.equals("a");', 'String', 'equals'],
    ['String.isEmpty();', 'String', 'isEmpty'],
    ['int n = String.length();', 'String', 'length'],
    ['Random.nextInt();', 'Random', 'nextInt'],
    ['Random.nextInt(5);', 'Random', 'nextInt'],
    ['Scanner.close();', 'Scanner', 'close'],
    ['int n = Scanner.nextInt();', 'Scanner', 'nextInt'],
    ['String.valueOf(5).length().foo();', 'int', 'foo'],
  ])('%s → "metodo-de-instancia-sin-objeto" (una sola vez)', (cuerpo, clase, nombre) => {
    // La última fila es un control disfrazado: el receptor de `.length()` es una LLAMADA (no un nombre de clase) y el error es de F2.
    const problemas = conImports(cuerpo);
    if (clase === 'int') {
      expect(problemas).toMatchObject([{ codigo: 'miembro-de-primitivo', datos: { tipo: 'int', nombre } }]);
    } else {
      expect(problemas).toMatchObject([{ codigo: 'metodo-de-instancia-sin-objeto', datos: { clase, nombre } }]);
    }
  });

  it('los métodos ESTÁTICOS se siguen llamando con el nombre de la clase, sin problemas', () => {
    expect(
      conImports(
        `String.valueOf(5); String.format("a"); Math.abs(5); Math.max(1, 2); Math.sqrt(4.0); Integer.parseInt("5"); Double.parseDouble("2.5"); Character.isDigit('5'); String.valueOf(1).length();`,
      ),
    ).toEqual([]);
  });

  it('el mismo método sobre una VARIABLE del tipo es lo correcto: "String t = \\"a\\"; t.trim();", "Scanner sc = …; sc.close();"', () => {
    expect(conImports('String t = "a"; t.trim(); Scanner sc = new Scanner(System.in); sc.close(); Random r = new Random(); int n = r.nextInt(5);')).toEqual([]);
  });

  it('una VARIABLE con el nombre de la clase la tapa (JLS 6.4.2): "String String = \\"a\\"; int n = String.length();" es correcto, no es una referencia estática', () => {
    expect(conImports('String String = "a"; int n = String.length();')).toEqual([]);
  });

  it('si ningún argumento encaja el problema es OTRO (javac: cant.apply.symbol), y un método de `Object` que el subconjunto no cubre sigue siendo un aviso', () => {
    expect(conImports('String.length(5);')).toMatchObject([{ codigo: 'sin-sobrecarga-aplicable' }]);
    expect(conImports('Math.hashCode();')).toMatchObject([{ codigo: 'metodo-de-biblioteca-no-soportado', categoria: 'no-disponible' }]);
  });

  it('el problema señala la llamada (la línea de javac): "String.trim();" en la línea 3 del programa', () => {
    const fuente = 'class C { public static void main(String[] a) {\nint p = 0;\nString.trim();\n} }';
    const [problema] = atribuirPrograma(fuente);
    expect(problema).toMatchObject({ codigo: 'metodo-de-instancia-sin-objeto' });
    expect(new TablaDeLineas(fuente).ubicar(problema?.rango.inicio ?? 0).linea).toBe(3);
  });
});

describe('atribuir — `Scanner`/`Random` sin `import` como receptor (N5, tarea 1.32): «cannot find symbol», no un método de instancia', () => {
  const sinImports = (cuerpo: string) => atribuirPrograma(`class C { public static void main(String[] a) { ${cuerpo} } }`);

  it.each([
    ['Scanner.next();', 'Scanner'],
    ['int n = Scanner.nextInt();', 'Scanner'],
    ['Random.nextInt();', 'Random'],
    ['int d = Random.nextInt(6);', 'Random'],
    ['int m = Scanner.MAX;', 'Scanner'],
    ['System.out.println(Scanner.MAX);', 'Scanner'],
  ])('%s → "tipo-requiere-import" de %s (una sola vez: el método no se resuelve)', (cuerpo, nombre) => {
    expect(sinImports(cuerpo)).toMatchObject([{ codigo: 'tipo-requiere-import', datos: { nombre } }]);
  });

  it('con el `import` de la OTRA clase no basta: "import java.util.Random;" no deja ver a `Scanner` (y sí a `Random`, que pasa a ser F6)', () => {
    const conRandom = (cuerpo: string) => atribuirPrograma(`import java.util.Random; class C { public static void main(String[] a) { ${cuerpo} } }`);
    expect(conRandom('Scanner.next();')).toMatchObject([{ codigo: 'tipo-requiere-import', datos: { nombre: 'Scanner' } }]);
    expect(conRandom('Random.nextInt();')).toMatchObject([{ codigo: 'metodo-de-instancia-sin-objeto', datos: { clase: 'Random', nombre: 'nextInt' } }]);
  });

  it('una VARIABLE con ese nombre gana aunque la clase no se importe (JLS 6.5.2): "int Random = 1; Random.nextInt();" es un miembro de un primitivo', () => {
    expect(sinImports('int Random = 1; Random.nextInt();')).toMatchObject([{ codigo: 'miembro-de-primitivo', datos: { tipo: 'int', nombre: 'nextInt', receptor: 'Random' } }]);
  });

  it('control: las clases de `java.lang` (String, Math, Integer, Double, Character) no piden `import` como receptor', () => {
    expect(sinImports(`int m = Math.max(1, 2); String s = String.valueOf(5); int p = Integer.parseInt("5"); double d = Double.parseDouble("2.5"); boolean b = Character.isDigit('5');`)).toEqual([]);
  });
});

// N6 — una variable que tapa el nombre de una clase del JDK, y el ALCANCE de una variable local (JLS 6.3: «el alcance de una
// declaración de variable local es el resto del bloque, EMPEZANDO POR SU PROPIO INICIALIZADOR»; JLS 6.5.2: un nombre simple que es una
// variable en alcance se clasifica como expresión antes que como tipo). javac 17 (sonda del 2026-09-29): `Scanner System = new
// Scanner(System.in);` es «cannot find symbol» — `System.in` ya es un miembro de la VARIABLE `System`, un `Scanner` —, `int Math =
// Math.max(1, 2);` es «int cannot be dereferenced» e `int x = x + 1;` es «variable x might not have been initialized» (pasada de
// asignación definitiva). El motor declaraba la variable DESPUÉS de visitar su inicializador: el alumno leía «Java sí acepta tu
// programa» en las primeras y «no existe una variable llamada x» (falso: sí existe) en la última, y `int y = (y = 5) + 1;` —que
// javac compila— se rechazaba como «variable no declarada».
describe('atribuir — el alcance de una variable incluye su propio inicializador (N6, tarea 1.32, JLS 6.3 y 6.5.2)', () => {
  const conScanner = (cuerpo: string) => atribuirPrograma(`import java.util.Scanner; class C { public static void main(String[] a) { ${cuerpo} } }`);

  it('"Scanner System = new Scanner(System.in);": `System.in` es un campo de la variable, un Scanner, que no lo tiene', () => {
    expect(conScanner('Scanner System = new Scanner(System.in);')).toMatchObject([
      { codigo: 'campo-no-declarado', datos: { clase: 'Scanner', nombre: 'in' } },
    ]);
  });

  it('con un primitivo es un miembro de un primitivo: "long Math = Math.min(0L, 5L);", "int Math = Math.max(1, 2);", "double Math = Math.sqrt(4.0);"', () => {
    expect(atribuirCuerpo('long Math = Math.min(0L, 5L);')).toMatchObject([{ codigo: 'miembro-de-primitivo', datos: { tipo: 'long', nombre: 'min', receptor: 'Math' } }]);
    expect(atribuirCuerpo('int Math = Math.max(1, 2);')).toMatchObject([{ codigo: 'miembro-de-primitivo', datos: { tipo: 'int', nombre: 'max', receptor: 'Math' } }]);
    expect(atribuirCuerpo('double Math = Math.sqrt(4.0);')).toMatchObject([{ codigo: 'miembro-de-primitivo', datos: { tipo: 'double', nombre: 'sqrt', receptor: 'Math' } }]);
  });

  it('con un String, el método debe existir en String: "String System = System.lineSeparator();" → String no tiene `lineSeparator`', () => {
    expect(atribuirCuerpo('String System = System.lineSeparator();')).toMatchObject([
      { codigo: 'miembro-no-declarado', datos: { clase: 'String', nombre: 'lineSeparator' } },
    ]);
  });

  it('el nombre de una variable ya NO es «no declarado» dentro de su inicializador: "int x = x + 1;" no es un error de atribución (lo es de asignación definitiva)', () => {
    expect(atribuirCuerpo('int x = x + 1;')).toEqual([]);
    expect(atribuirCuerpo('boolean b = b && true;')).toEqual([]);
    expect(atribuirCuerpo('for (int i = i; i < 3; i++) { }')).toEqual([]);
  });

  it('y una asignación DENTRO del inicializador es válida (javac compila `int y = (y = 5) + 1;`): antes daba «variable no declarada»', () => {
    expect(atribuirCuerpo('int y = (y = 5) + 1;')).toEqual([]);
  });

  it('los declaradores se ven de izquierda a derecha: "int a = 1, b = a + 1;" es válido; "int a = b + 1, b = 2;" usa `b` antes de declararla', () => {
    expect(atribuirCuerpo('int p = 1, q = p + 1;')).toEqual([]);
    expect(atribuirCuerpo('int p = q + 1, q = 2;')).toMatchObject([{ codigo: 'variable-no-declarada', datos: { nombre: 'q' } }]);
  });

  it('el tipo declarado también se conoce dentro del inicializador: "Scanner sc = new Scanner(sc);" es un constructor sin sobrecarga aplicable, no una variable no declarada', () => {
    expect(conScanner('Scanner sc = new Scanner(sc);')).toMatchObject([{ codigo: 'sin-constructor-aplicable', datos: { clase: 'Scanner' } }]);
  });

  it('control: las variables con el nombre de una clase, usadas con su propio tipo y DESPUÉS de declararse, siguen siendo válidas', () => {
    expect(conScanner('String String = "a"; int n = String.length(); Scanner Scanner = new Scanner(System.in); Scanner.close(); int Math = 5; int y = Math + 1;')).toEqual([]);
  });
});

// HERMANOS DE N5 que el generador no sortea (hallados al sondear la familia con javac 17, 2026-09-29): (a) el nombre de una clase usado
// como VALOR — `int y = Math;`, `"" + String`, `System.out.println(System)` — es «cannot find symbol: variable Math» (`cant.resolve.location`,
// JLS 6.5.2: un nombre simple que no es una variable ni un tipo con miembro accedido no designa ningún valor) aunque la clase exista y esté
// importada; y (b) `import java.lang.PrintStream;` no existe (`PrintStream` es de `java.io`): el motor daba por buena la clase porque su
// nombre está en el catálogo de firmas, sin mirar el paquete. Un nombre de clase solo vale como TIPO o como receptor de un miembro.
describe('atribuir — el nombre de una clase del catálogo usado como VALOR es «variable no declarada» (hermano de N5, tarea 1.32)', () => {
  const conImports = (cuerpo: string) => atribuirPrograma(`import java.util.*; class C { public static void main(String[] a) { ${cuerpo} } }`);

  it.each([
    ['int y = Math;', 'Math'],
    ['System.out.println(Math);', 'Math'],
    ['String s = "" + String;', 'String'],
    ['int z = System;', 'System'],
    ['if (Math) { }', 'Math'],
    ['int y = 1; y = Math;', 'Math'],
    ['int y = Scanner;', 'Scanner'],
    ['int r = Random + 1;', 'Random'],
    ['int m = Math.max(Math, 1);', 'Math'],
    ['switch (Integer) { }', 'Integer'],
  ])('%s → "variable-no-declarada" de %s (una sola vez)', (cuerpo, nombre) => {
    expect(conImports(cuerpo)).toMatchObject([{ codigo: 'variable-no-declarada', datos: { nombre } }]);
  });

  it('como DESTINO de una asignación o de un `++` sigue siendo «no es una variable» (tarea 1.21), no se repite como «no declarada»', () => {
    expect(conImports('Math = 5;')).toMatchObject([{ codigo: 'objetivo-no-es-variable' }]);
    expect(conImports('Scanner = new Scanner(System.in);')).toMatchObject([{ codigo: 'objetivo-no-es-variable' }]);
    expect(conImports('Math++;')).toMatchObject([{ codigo: 'objetivo-no-es-variable' }]);
  });

  it('control: el mismo nombre como RECEPTOR de un miembro, o una VARIABLE con ese nombre, no cambian', () => {
    expect(conImports('int m = Math.max(1, 2); double p = Math.PI; String s = String.valueOf(1); System.out.println(1);')).toEqual([]);
    expect(conImports('int Math = 5; int y = Math; String String = "a"; String t = String;')).toEqual([]);
  });
});

describe('atribuir — un import de java.lang solo vale para una clase de java.lang (hermano de N5, tarea 1.32)', () => {
  const conImport = (importacion: string) => atribuirPrograma(`${importacion}\nclass C { public static void main(String[] a) { System.out.println(1); } }`);

  it('"import java.lang.PrintStream;" no existe: `PrintStream` es de `java.io` (javac: cannot find symbol, location: package java.lang)', () => {
    expect(conImport('import java.lang.PrintStream;')).toMatchObject([{ codigo: 'importacion-no-reconocida', datos: { nombre: 'java.lang.PrintStream' } }]);
  });

  it('control: "import java.lang.Math;", "import java.lang.String;" y "import java.util.Scanner;" siguen siendo válidos', () => {
    expect(conImport('import java.lang.Math;')).toEqual([]);
    expect(conImport('import java.lang.String;')).toEqual([]);
    expect(conImport('import java.util.Scanner;')).toEqual([]);
  });
});

describe('atribuir — `return` con valor en `main` (WARNING-2, tarea 1.33): «incompatible types: unexpected return value»', () => {
  it.each(['return 0;', 'return "a";', 'return true;', 'return 1 + 2;', 'return (1);', 'return -1;', 'return 1.5;', "return 'a';"])('«%s» es retorno-con-valor', (cuerpo) => {
    const problemas = atribuirCuerpo(cuerpo);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'retorno-con-valor', datos: {} });
  });

  it('con una variable declarada: el error es del `return`, no de la variable', () => {
    const problemas = atribuirCuerpo('int x = 5; return x;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'retorno-con-valor' });
  });

  it('con un nombre que ni existe: el PRIMER error es el del `return` (javac lo da antes de mirar la expresión) y después el del nombre', () => {
    const problemas = atribuirCuerpo('return sinDeclarar;');
    expect(problemas.map((p) => p.codigo)).toEqual(['retorno-con-valor', 'variable-no-declarada']);
  });

  it('el error señala el VALOR (la expresión), como javac: `return 42;` → el rango de `42`', () => {
    const cuerpo = 'return 42;';
    const fuente = `class C { public static void main(String[] a) { ${cuerpo} } }`;
    const [problema] = atribuir(analizarPrograma(tokenizar(fuente)));
    expect(fuente.slice(problema!.rango.inicio, problema!.rango.fin)).toBe('42');
  });

  it('dentro de un ciclo, de un if o de un switch también es un error', () => {
    for (const cuerpo of ['int i = 0; while (i < 3) { i++; return i; }', 'if (true) { return 0; }', 'switch (1) { case 1: return 2; }']) {
      expect(atribuirCuerpo(cuerpo).map((p) => p.codigo), cuerpo).toContain('retorno-con-valor');
    }
  });

  it('un error de tipos ANTERIOR gana (javac reporta el primero en el texto de la pasada): `int x = "a"; return 0;` → primero el de la asignación', () => {
    const problemas = atribuirCuerpo('int x = "a"; return 0;');
    expect(problemas.map((p) => p.codigo)).toEqual(['tipos-incompatibles-en-asignacion', 'retorno-con-valor']);
  });

  it('control: `return;` sin valor no da ningún problema', () => {
    expect(atribuirCuerpo('return;')).toEqual([]);
  });
});

describe('atribuir — `println`/`print` con un número de argumentos que no existe (WARNING-2, tarea 1.33): no suitable method found', () => {
  it.each([
    ['System.out.println("a", 5);', 'println', ['String', 'int']],
    ['System.out.print("a", 5);', 'print', ['String', 'int']],
    ['System.out.println("Suma: ", 1 + 2);', 'println', ['String', 'int']],
    ['System.out.println(1, 2, 3);', 'println', ['int', 'int', 'int']],
    ['System.out.print();', 'print', []],
  ])('«%s» → sin-sobrecarga-aplicable de PrintStream.%s', (cuerpo, nombre, argumentos) => {
    const problemas = atribuirCuerpo(cuerpo);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'sin-sobrecarga-aplicable', datos: { clase: 'PrintStream', nombre, argumentos } });
  });

  it('con una variable como argumento: `int suma = 3; System.out.println("Suma: ", suma);`', () => {
    const problemas = atribuirCuerpo('int suma = 3; System.out.println("Suma: ", suma);');
    expect(problemas[0]).toMatchObject({ codigo: 'sin-sobrecarga-aplicable', datos: { nombre: 'println', argumentos: ['String', 'int'] } });
  });

  it('control: println() y println(x) y print(x) siguen sin problemas', () => {
    expect(atribuirCuerpo('int x = 1; System.out.println(); System.out.println(x); System.out.print(x);')).toEqual([]);
  });
});

describe('atribuir — el resultado de `printf` (un `PrintStream`) usado como VALOR es un aviso (tarea 1.33): el subconjunto no modela ese tipo', () => {
  it.each([
    'int b = System.out.printf("a");',
    'String s = System.out.printf("a");',
    'if (System.out.printf("x")) { }',
    'while (System.out.printf("x")) { }',
    'int b = System.out.printf("%d", 5) + 1;',
    'boolean t = !System.out.printf("a");',
    'int x = 1; x = System.out.printf("a");',
    'int y = (int) System.out.printf("a");',
    'Math.abs(System.out.printf("a"));',
    'System.out.println(System.out.printf("a"));',
    'System.out.printf("a").println("b");',
    'System.out.printf("a").printf("b");',
    'String u = "a" + System.out.printf("a");',
  ])('«%s» → aviso valor-de-tipo-no-soportado', (cuerpo) => {
    const problemas = atribuirCuerpo(cuerpo);
    expect(problemas.length, cuerpo).toBeGreaterThanOrEqual(1);
    expect(problemas[0], cuerpo).toMatchObject({ codigo: 'valor-de-tipo-no-soportado', categoria: 'no-disponible', datos: { llamada: 'System.out.printf' } });
  });

  it('el aviso señala la llamada completa (desde `System`)', () => {
    const cuerpo = 'int b = System.out.printf("a");';
    const fuente = `class C { public static void main(String[] a) { ${cuerpo} } }`;
    const [problema] = atribuir(analizarPrograma(tokenizar(fuente)));
    expect(fuente.slice(problema!.rango.inicio, problema!.rango.fin)).toBe('System.out.printf("a")');
  });

  it('control: `printf` como SENTENCIA (y en la actualización de un for) NO es un uso como valor: sin problemas', () => {
    expect(atribuirCuerpo('System.out.printf("a%n"); System.out.printf("%d%n", 5);')).toEqual([]);
    expect(atribuirCuerpo('for (int i = 0; i < 2; System.out.printf("x")) { }')).toEqual([]);
  });

  it('control: un método soportado que devuelve un tipo del subconjunto (String.valueOf, Math.abs, s.length()) sigue siendo un valor normal', () => {
    expect(atribuirCuerpo('String t = String.valueOf(5); int v = Math.abs(-3); String s = "hola"; int n = s.length();')).toEqual([]);
  });

  it('control: un método fuera del subconjunto sigue avisando por SU propio código (`Integer.valueOf` → método de biblioteca), no por el del valor', () => {
    const problemas = atribuirCuerpo('int i = Integer.valueOf(5);');
    expect(problemas[0]).toMatchObject({ codigo: 'metodo-de-biblioteca-no-soportado' });
  });
});

describe('atribuir — `var` y `yield` como nombres de variable no dan ningún problema (V, tarea 1.33)', () => {
  it.each([
    'int var = 5; var = var + 1; System.out.println(var);',
    'double yield = 2.5; yield = yield * 2; yield++; yield += 1.5;',
    'String var = "hola"; String yield = "mundo"; int n = var.length() + yield.length();',
    'for (int var = 0; var < 3; var++) { System.out.println(var); }',
    'boolean yield = true; while (yield) { yield = false; } if (yield) { }',
    'int record = 1; int sealed = 2; int permits = 3; int non = 4; int module = 5; int open = 6; int with = 7;',
  ])('«%s»', (cuerpo) => {
    expect(atribuirCuerpo(cuerpo)).toEqual([]);
  });

  it('una variable llamada `var` sigue teniendo su tipo: `int var = 5; String s = var;` es un error de tipos, como con cualquier nombre', () => {
    expect(atribuirCuerpo('int var = 5; String s = var;').map((p) => p.codigo)).toEqual(['tipos-incompatibles-en-asignacion']);
  });

  it('`yield();` es una llamada a un método que no existe (javac: invalid.yield)', () => {
    expect(atribuirCuerpo('yield();')[0]).toMatchObject({ codigo: 'metodo-no-declarado', datos: { nombre: 'yield' } });
  });
});


// Tarea 1.34: `CAMPOS_DE_SYSTEM_REFLEJADOS` era un objeto plano indexado con el nombre del campo que escribió el alumno: `System.toString` devolvía la
// función heredada de `Object.prototype` (el `?? null` no actúa: no es `undefined`) y `nombreDeArgumentoParaMostrar` le pedía `lastIndexOf` — la
// re-verificación del lote 1 vio `TypeError: campo.lastIndexOf is not a function` en 56 de 120 variantes. Ningún campo de `System` salvo `in`, `out`
// y `err` existe: es «cannot find symbol» (`campo-no-declarado`), con cualquier nombre y en cualquier posición de argumento.
describe('atribuir — un nombre de Object.prototype como campo de System, en cada posición de argumento (tarea 1.34): nunca lanza', () => {
  const NOMBRES = ['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString'];
  const POSICIONES: ReadonlyArray<readonly [descripcion: string, cuerpo: (nombre: string) => string]> = [
    ['new Scanner(...)', (n) => `Scanner sc = new Scanner(System.${n});`],
    ['Math.abs(...)', (n) => `int r = Math.abs(System.${n});`],
    ['Integer.parseInt(...)', (n) => `int r = Integer.parseInt(System.${n});`],
    ['String.equals(...)', (n) => `String s = "a"; boolean b = s.equals(System.${n});`],
    ['Scanner.nextInt(...)', (n) => `Scanner sc = new Scanner(System.in); int r = sc.nextInt(System.${n});`],
    ['System.out.printf(...)', (n) => `System.out.printf(System.${n});`],
    ['String.valueOf(...)', (n) => `String s = String.valueOf(System.${n});`],
  ];

  it.each(NOMBRES.flatMap((nombre) => POSICIONES.map(([posicion, cuerpo]) => [nombre, posicion, cuerpo] as const)))(
    'System.%s como argumento de %s: «campo-no-declarado», sin lanzar',
    (nombre, _posicion, cuerpo) => {
      const problemas = atribuirPrograma(`import java.util.Scanner; class C { public static void main(String[] a) { ${cuerpo(nombre)} } }`);
      expect(problemas).toHaveLength(1);
      expect(problemas[0]).toMatchObject({ codigo: 'campo-no-declarado', datos: { clase: 'System', nombre } });
    },
  );

  it('control: `in`, `out` y `err` SIGUEN siendo los campos reflejados que valen como argumento (`new Scanner(System.in)`, `new Scanner(System.out)` da su error de sobrecarga)', () => {
    expect(atribuirPrograma('import java.util.Scanner; class C { public static void main(String[] a) { Scanner sc = new Scanner(System.in); } }')).toEqual([]);
    const problemas = atribuirPrograma('import java.util.Scanner; class C { public static void main(String[] a) { Scanner sc = new Scanner(System.err); } }');
    expect(problemas[0]).toMatchObject({ codigo: 'sin-constructor-aplicable', datos: { clase: 'Scanner', argumentos: ['PrintStream'] } });
  });
});

// Tarea 1.34 (D): `(Math).abs(-1.5)` — javac: «illegal parenthesized expression». Un nombre simple entre paréntesis es una EXPRESIÓN (JLS 15.8.5), no puede
// ser un tipo: ya no es la clase `Math` sino una variable llamada `Math`, que no existe. El árbol recuerda los paréntesis (`parentesis`) y la atribución no
// toma por clase al nombre que los lleva.
describe('atribuir — el nombre de una clase entre paréntesis ya no es la clase (D, tarea 1.34)', () => {
  it.each([
    ['(Math).abs(-1.5)', 'double r = (Math).abs(-1.5);'],
    ['(Math).PI', 'double r = (Math).PI;'],
    ['(Integer).parseInt("5")', 'int r = (Integer).parseInt("5");'],
    ['(System).out.println(1)', '(System).out.println(1);'],
    ['(Scanner).nextInt()', 'int r = (Scanner).nextInt();'],
  ])('%s → «variable-no-declarada» con el nombre de la clase', (_descripcion, cuerpo) => {
    const problemas = atribuirPrograma(`import java.util.Scanner; class C { public static void main(String[] a) { ${cuerpo} } }`);
    expect(problemas.length).toBeGreaterThanOrEqual(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-no-declarada' });
  });

  it('control: sin paréntesis `Math.abs(-1.5)` sigue siendo una llamada estática válida, y `(x).length()` con una variable `x` también', () => {
    expect(atribuirCuerpo('double r = Math.abs(-1.5);')).toEqual([]);
    expect(atribuirCuerpo('String x = "a"; int n = (x).length();')).toEqual([]);
    expect(atribuirCuerpo('int x = 1; (x)++; (x) = 2; ((x)) += 3;')).toEqual([]);
  });

  it('control: una VARIABLE llamada como una clase y entre paréntesis sigue siendo la variable', () => {
    expect(atribuirCuerpo('String Math = "a"; int n = (Math).length();')).toEqual([]);
  });
});

// Tarea 1.34 (familia C de la re-verificación del lote 1): JLS 6.4.1 — la declaración de un tipo TAPA a los tipos de igual nombre que están a la vista, y la
// clase de nivel superior tapa a las de `java.lang` (que se importan «bajo demanda») y a las de un `import p.*;`; JLS 7.5.1 — un `import` de UN solo tipo
// choca con la clase del mismo nombre del archivo. Con `public class System`, `System.out` es el campo `out` de LA CLASE DEL ALUMNO (que no lo tiene); con
// `public class Math`, `Math.sqrt(4)` también. Antes la clase se llamaba como una del catálogo y el motor seguía creyendo que `Math` era `java.lang.Math`:
// `public class System { System.out.println("hola"); }` daba `ok` (se EJECUTARÍA) donde javac dice «cannot find symbol».
describe('atribuir — una clase del alumno con el nombre de una clase del JDK (C, tarea 1.34): la del alumno tapa a la del JDK', () => {
  function programaConClase(clase: string, cuerpo: string, imports = ''): string {
    return `${imports}public class ${clase} { public static void main(String[] a) { ${cuerpo} } }`;
  }

  it.each([
    ['System', 'System.out.println("hola");', 'campo-no-declarado', { clase: 'System', nombre: 'out' }],
    ['System', 'System.err.println("hola");', 'campo-no-declarado', { clase: 'System', nombre: 'err' }],
    ['System', 'int x = System.in;', 'campo-no-declarado', { clase: 'System', nombre: 'in' }],
    ['Math', 'double r = Math.sqrt(4.0);', 'miembro-no-declarado', { clase: 'Math', nombre: 'sqrt' }],
    ['Math', 'double r = Math.PI;', 'campo-no-declarado', { clase: 'Math', nombre: 'PI' }],
    ['Integer', 'int x = Integer.parseInt("5");', 'miembro-no-declarado', { clase: 'Integer', nombre: 'parseInt' }],
    ['Integer', 'int x = Integer.MAX_VALUE;', 'campo-no-declarado', { clase: 'Integer', nombre: 'MAX_VALUE' }],
    ['String', 'int x = String.valueOf(1).length();', 'miembro-no-declarado', { clase: 'String', nombre: 'valueOf' }],
  ])('class %s { %s } → [%s]', (clase, cuerpo, codigo, datos) => {
    const problemas = atribuirPrograma(programaConClase(clase, cuerpo));
    expect(problemas.length).toBeGreaterThanOrEqual(1);
    expect(problemas[0]).toMatchObject({ codigo, datos });
  });

  it('el nombre de la propia clase como TIPO es «objetos propios» (aviso), con el nombre que escribió el alumno: `Random r = new Random();`, `String s = "a";`, `Scanner s = new Scanner();`', () => {
    for (const [clase, cuerpo] of [
      ['Random', 'Random r = new Random();'],
      ['String', 'String s = "a";'],
      ['Scanner', 'Scanner s = new Scanner();'],
      ['Math', 'Math m = new Math();'],
      ['Integer', 'Integer i = new Integer();'],
    ] as const) {
      const problemas = atribuirPrograma(programaConClase(clase, cuerpo));
      expect(problemas[0], `${clase}: ${cuerpo}`).toMatchObject({ categoria: 'no-disponible', codigo: 'clase-no-soportada', datos: { nombre: clase } });
    }
  });

  it('el `main` de la propia clase se llama por su nombre (`Math.main(args);`): aviso, no un error de «no existe `main`»', () => {
    const problemas = atribuirPrograma(programaConClase('Math', 'Math.main(a);'));
    expect(problemas[0]).toMatchObject({ categoria: 'no-disponible', codigo: 'clase-no-soportada', datos: { nombre: 'Math' } });
    // `a` (el arreglo `args`) pasado como argumento es un uso del arreglo: un segundo aviso, después del de la clase por posición.
    expect(problemas.map((p) => p.codigo)).toEqual(['clase-no-soportada', 'arreglo-no-soportado']);
  });

  it('una clase que NO se llama como una del JDK (`Main`) no cambia: `Main.main(a);` es aviso, y `Math.sqrt(4.0)` es la `Math` del JDK', () => {
    expect(atribuirPrograma(programaConClase('Main', 'Main.main(a);'))[0]).toMatchObject({ categoria: 'no-disponible', codigo: 'clase-no-soportada' });
    expect(atribuirPrograma(programaConClase('Main', 'double r = Math.sqrt(4.0);'))).toEqual([]);
    expect(atribuirPrograma(programaConClase('Main', 'System.out.println("hola");'))).toEqual([]);
  });

  it('una VARIABLE con ese nombre sigue tapando a la clase: `String Math = "a";` en `class Math` es una variable', () => {
    expect(atribuirPrograma(programaConClase('Math', 'String Math = "a"; int n = Math.length();'))).toEqual([]);
  });

  it('una clase llamada como una del JDK que no se usa no produce problema alguno (javac la compila)', () => {
    for (const clase of ['System', 'Math', 'String', 'Integer', 'Scanner', 'Random', 'Double', 'Character', 'Long']) {
      expect(atribuirPrograma(programaConClase(clase, 'int x = 1; x++;')), clase).toEqual([]);
    }
  });
});

describe('atribuir — `import` de un solo tipo con el mismo nombre que la clase del archivo (C, tarea 1.34, JLS 7.5.1): «already defined in this compilation unit»', () => {
  it.each([
    ['Scanner', 'import java.util.Scanner;', 'java.util.Scanner'],
    ['Random', 'import java.util.Random;', 'java.util.Random'],
    ['System', 'import java.lang.System;', 'java.lang.System'],
    ['Math', 'import java.lang.Math;', 'java.lang.Math'],
    ['Locale', 'import java.util.Locale;', 'java.util.Locale'],
    ['Entry', 'import java.util.Map.Entry;', 'java.util.Map.Entry'],
  ])('class %s + «%s» → «clase-repetida-con-import», señalado en el import', (clase, importacion, nombreCompleto) => {
    const fuente = `${importacion}\npublic class ${clase} { public static void main(String[] a) { } }`;
    const problemas = atribuirPrograma(fuente);
    expect(problemas[0]).toMatchObject({ codigo: 'clase-repetida-con-import', datos: { nombre: clase, importacion: nombreCompleto } });
    // El rango es el del `import` (la línea 1), no el de la clase.
    expect(problemas[0]!.rango.inicio).toBe(0);
  });

  it('un import con comodín NO choca (la clase del archivo tapa a la importada bajo demanda): `import java.util.*;` + `class Scanner`', () => {
    expect(atribuirPrograma('import java.util.*;\npublic class Scanner { public static void main(String[] a) { } }')).toEqual([]);
  });

  it('un import de OTRA clase, o de una clase que no existe, no es este error: `import java.util.Random;` + `class Scanner` → nada; `import java.util.Foo;` + `class Foo` → el import que no existe', () => {
    expect(atribuirPrograma('import java.util.Random;\npublic class Scanner { public static void main(String[] a) { } }')).toEqual([]);
    expect(atribuirPrograma('import java.util.Foo;\npublic class Foo { public static void main(String[] a) { } }')[0]).toMatchObject({ codigo: 'importacion-no-reconocida' });
  });

  it('control: sin ninguna clase repetida, los imports de siempre no dan problema (`import java.util.Scanner;` + `class Main`)', () => {
    expect(atribuirPrograma('import java.util.Scanner;\npublic class Main { public static void main(String[] a) { Scanner sc = new Scanner(System.in); } }')).toEqual([]);
  });
});

// Tarea 1.36 (C-3 de la verificación final del lote 1, javac `package.in.other.module`): un `package` cuyo nombre es el de un paquete que el JDK exporta (`java.util`, `java.lang`, `javax.swing`,
// `java.sql`… 226 en el JDK 17, la lista que ya generó el oráculo) lo rechaza javac: «package exists in another module: java.base». El motor ignoraba la línea entera (REQ-SUB-001: «`package` se ignora») y
// el programa se «ejecutaría». Medido con javac 17.0.18 sobre 278 nombres (los 226 paquetes exportados, los paquetes de arriba como `java`, `javax` y `com.sun`, nombres de clases usados como paquete y typos): rechaza EXACTAMENTE los que tienen tipos exportados;
// `java`, `javax`, `jdk`, `sun`, `com.sun`, `aula.java`, `java.utils`, `Java.util` y los internos no exportados (`jdk.internal.misc`, `sun.nio.ch`) compilan.
describe('atribuir — `package` con el nombre de un paquete del JDK (C-3, tarea 1.36, javac: «package exists in another module»)', () => {
  it.each([
    'java.util',
    'java.lang',
    'java.io',
    'java.net',
    'java.awt',
    'java.sql',
    'java.nio.file',
    'javax.swing',
    'javax.crypto',
    'org.w3c.dom',
    'org.xml.sax',
    'org.ietf.jgss',
    'com.sun.net.httpserver',
    'jdk.net',
    'jdk.jfr',
    'sun.misc',
    'java.util.concurrent',
    'java.util.function',
    'java.lang.invoke',
    'java.util.logging',
  ])('«package %s;» → «paquete-del-jdk», señalado en la línea del `package`', (nombre) => {
    const problemas = atribuirPrograma(`package ${nombre};\npublic class C { public static void main(String[] a) { } }`);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'paquete-del-jdk', datos: { nombre } });
    expect(problemas[0]!.categoria).toBeUndefined(); // un error de compilación, no un aviso
    expect(problemas[0]!.rango.inicio).toBe(0);
  });

  it.each([
    'miproyecto', // lo que pone NetBeans: el caso más común
    'aula',
    'mi.proyecto',
    'util',
    'java', // un paquete que solo tiene subpaquetes: javac lo compila
    'javax',
    'jdk',
    'sun',
    'com',
    'com.sun',
    'org',
    'aula.java',
    'mi.java.util',
    'java.utils',
    'Java.util',
    'java.util.foo',
    'java.sqrt',
    'jdk.internal.misc', // existe, pero no lo exporta a nadie: javac lo compila
    'sun.nio.ch',
    'sun.security.x509',
    'jdk.nashorn',
  ])('control: «package %s;» lo compila javac y no da ningún problema', (nombre) => {
    expect(atribuirPrograma(`package ${nombre};\npublic class C { public static void main(String[] a) { } }`)).toEqual([]);
  });

  it('un programa SIN `package` no cambia, y el `package` va antes que los `import` en el orden del texto (se reporta primero)', () => {
    expect(atribuirPrograma('public class C { public static void main(String[] a) { } }')).toEqual([]);
    const problemas = atribuirPrograma('package java.util;\nimport java.util.Scanner;\npublic class C { public static void main(String[] a) { } }');
    expect(problemas.map((p) => p.codigo)).toEqual(['paquete-del-jdk']);
  });

  it('el rango cubre la declaración entera (de `package` al `;`), para que la línea sea la del `package`', () => {
    const fuente = '// aula\n\npackage java.util;\npublic class C { public static void main(String[] a) { } }';
    const problemas = atribuirPrograma(fuente);
    expect(problemas[0]!.rango).toEqual({ inicio: fuente.indexOf('package'), fin: fuente.indexOf(';') + 1 });
  });

  // `java.lang.String` y `java.lang.Math` los rechaza javac aunque no sean paquetes (`pkg.clashes.with.class.of.same.name`): el nombre de un paquete no puede ser el de
  // una clase que el compilador ya conoce, y `java.lang` siempre está a la vista. Con `java.util.Map` depende de que el programa use `java.util`: no se puede revisar, y es un aviso.
  it.each(['java.lang.String', 'java.lang.Math', 'java.util.Map', 'java.util.Scanner', 'java.util.Map.Entry'])(
    '«package %s;» es el nombre de una CLASE del JDK: aviso honesto, nunca «ok»',
    (nombre) => {
      const problemas = atribuirPrograma(`package ${nombre};\npublic class C { public static void main(String[] a) { } }`);
      expect(problemas).toHaveLength(1);
      expect(problemas[0]).toMatchObject({ categoria: 'no-disponible', codigo: 'paquete-con-nombre-de-clase-no-soportado', datos: { nombre } });
    },
  );
});

// Tarea 1.36 (W-10 de la verificación final del lote 1, JLS 14.11 y 15.29): `case "d" + 1.5:` es una etiqueta CONSTANTE para javac (el valor lo decide el `Double.toString` de Java) y la compila;
// el motor la tomaba por «no constante» y daba «Cada "case" necesita un valor fijo». Ahora es un aviso honesto: no se puede revisar si dos etiquetas se repiten, pero tampoco se inventa un error.
describe('atribuir — una etiqueta de `case` constante de valor desconocido: aviso, nunca «etiqueta-de-case-no-constante» (W-10, tarea 1.36)', () => {
  const AVISO = { categoria: 'no-disponible', codigo: 'constante-de-texto-con-decimal-no-soportada', datos: {} } as const;

  it.each([
    ['una concatenación con un decimal', 'String s = "d1.5"; switch (s) { case "d" + 1.5: break; default: break; }'],
    ['una variable `final String` con un decimal', 'final String K = "d" + 1.5; String s = "d1.5"; switch (s) { case K: break; default: break; }'],
    ['un cast a double dentro del texto', 'String s = "a1.0"; switch (s) { case "a" + (double) 1: break; default: break; }'],
    ['con otra etiqueta conocida al lado', 'String s = "x"; switch (s) { case "x": break; case "d" + 1.5: break; default: break; }'],
  ])('%s: un solo aviso', (_nombre, cuerpo) => {
    const problemas = atribuirCuerpo(cuerpo);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject(AVISO);
  });

  it('el aviso se señala en la etiqueta, y no se cuenta como duplicada de otra (no se puede saber su valor)', () => {
    const cuerpo = 'String s = "d1.5"; switch (s) { case "d" + 1.5: break; case "d1.5": break; default: break; }';
    const problemas = atribuirCuerpo(cuerpo);
    expect(problemas.map((p) => p.codigo)).toEqual(['constante-de-texto-con-decimal-no-soportada']);
    expect(problemas[0]!.rango.inicio).toBe(`class C { public static void main(String[] a) { ${cuerpo} } }`.indexOf('case "d" + 1.5'));
  });

  it('el TIPO se sigue revisando antes que la constancia (como javac): `case "d" + 1.5:` con un selector `int` es un error de tipos', () => {
    const problemas = atribuirCuerpo('int n = 1; switch (n) { case "d" + 1.5: break; default: break; }');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'etiqueta-de-case-de-otro-tipo', datos: { etiqueta: 'String', selector: 'int' } });
  });

  it('control: una etiqueta que NO es constante sigue siendo «etiqueta-de-case-no-constante» (una variable que no es `final`, o un texto con un `double` que no es constante)', () => {
    expect(atribuirCuerpo('String k = "a"; String s = "a"; switch (s) { case k: break; default: break; }')[0]).toMatchObject({ codigo: 'etiqueta-de-case-no-constante' });
    expect(atribuirCuerpo('double d = 1.5; String s = "a"; switch (s) { case "a" + d: break; default: break; }')[0]).toMatchObject({ codigo: 'etiqueta-de-case-no-constante' });
  });

  it('control: una constante CONOCIDA sigue plegándose y revisándose (`"d" + 1` es "d1", y repetirla es un error)', () => {
    expect(atribuirCuerpo('String s = "d1"; switch (s) { case "d" + 1: break; default: break; }')).toEqual([]);
    expect(atribuirCuerpo('String s = "d1"; switch (s) { case "d" + 1: break; case "d1": break; default: break; }')[0]).toMatchObject({ codigo: 'etiqueta-de-case-duplicada' });
  });
});

// Tarea 1.34 (familia B de la re-verificación del lote 1, y el cambio de fondo detrás de ella): CERRAR POR DEFECTO. Si la atribución no sabía el tipo de una
// expresión ('desconocido') la suprimía en silencio — era el sumidero de cascada de la 1.7: nunca informar un error que Java podría no dar — y el programa
// terminaba en «Java sí acepta tu programa». Pero «no sé» no es «sí»: `int x = System.in;`, `args.length()` y `System.in.nextInt()` los rechaza javac y se
// aceptaban, porque `System.in` solo existía como «argumento reflejado» de una sobrecarga y `args` no tenía tipo ni aviso. La regla nueva: una expresión
// de tipo desconocido —o de un tipo que el subconjunto no modela— en posición de VALOR (inicializador, asignación y su destino, argumento, operando, condición,
// receptor, selector, `return`) NUNCA pasa en silencio: si algo dentro de ella ya produjo un problema, ese es el problema (sin cascada); si no, es un AVISO
// honesto. `args` es un arreglo (`arreglo-no-soportado`, REQ-SUB-007); `System.in`/`System.out`/`System.err` usados como valor, `valor-de-tipo-no-modelado`.
describe('atribuir — cerrar por defecto (B, tarea 1.34): `args` y `System.in/out/err` como VALOR nunca pasan en silencio', () => {
  const ARREGLO = { categoria: 'no-disponible', codigo: 'arreglo-no-soportado', datos: { tipoArreglo: 'String[]' } } as const;
  const flujo = (valor: string) => ({ categoria: 'no-disponible', codigo: 'valor-de-tipo-no-modelado', datos: { valor } }) as const;

  // [descripción de la posición, el cuerpo con el valor V]
  const POSICIONES: ReadonlyArray<readonly [posicion: string, cuerpo: (valor: string) => string]> = [
    ['inicializador', (v) => `int x = ${v};`],
    ['asignación (lado derecho)', (v) => `int x = 0; x = ${v};`],
    ['asignación compuesta', (v) => `int x = 0; x += ${v};`],
    ['operando de una suma', (v) => `int x = 1 + ${v};`],
    ['operando de una comparación', (v) => `boolean b = ${v} == 5;`],
    ['operando unario', (v) => `int x = -${v};`],
    ['negación', (v) => `boolean b = !${v};`],
    ['condición de if', (v) => `if (${v}) { }`],
    ['condición de while', (v) => `while (${v}) { }`],
    ['condición de for', (v) => `for (; ${v}; ) { break; }`],
    ['selector de switch', (v) => `switch (${v}) { default: break; }`],
    ['argumento de println', (v) => `System.out.println(${v});`],
    ['operando de un cast', (v) => `int x = (int) ${v};`],
    ['operando de un operando', (v) => `int x = 1 + (2 * ${v});`],
  ];

  it.each(POSICIONES)('`args` como %s → aviso de arreglo (`String[]`)', (_posicion, cuerpo) => {
    const problemas = atribuirCuerpo(cuerpo('a'));
    expect(problemas.length).toBeGreaterThanOrEqual(1);
    expect(problemas[0]).toMatchObject(ARREGLO);
  });

  it.each(POSICIONES)('`System.in` como %s → «valor-de-tipo-no-modelado» con `System.in`', (_posicion, cuerpo) => {
    const problemas = atribuirCuerpo(cuerpo('System.in'));
    expect(problemas.length).toBeGreaterThanOrEqual(1);
    expect(problemas[0]).toMatchObject(flujo('System.in'));
  });

  it.each(['System.out', 'System.err'])('`%s` como valor (inicializador, operando y condición) → «valor-de-tipo-no-modelado» con su nombre', (valor) => {
    for (const cuerpo of [`String s = ${valor};`, `boolean b = ${valor} == ${valor};`, `if (${valor}) { }`]) {
      expect(atribuirCuerpo(cuerpo)[0], cuerpo).toMatchObject(flujo(valor));
    }
  });

  it('el destino de una asignación o de `++`/`--` que no se sabe qué es: `args = 5;`, `args++;`, `--args;`', () => {
    for (const cuerpo of ['a = 5;', 'a++;', '--a;', 'a += 1;']) {
      expect(atribuirCuerpo(cuerpo)[0], cuerpo).toMatchObject(ARREGLO);
    }
  });

  it('un RECEPTOR que no se sabe qué es: `args.length()`, `args.length`, `System.in.nextInt()`, `System.in.read()`, `System.in.available()`', () => {
    expect(atribuirCuerpo('int n = a.length();')[0]).toMatchObject(ARREGLO);
    expect(atribuirCuerpo('int n = a.length;')[0]).toMatchObject(ARREGLO);
    expect(atribuirCuerpo('int n = System.in.nextInt();')[0]).toMatchObject(flujo('System.in'));
    expect(atribuirCuerpo('int c = System.in.read();')[0]).toMatchObject(flujo('System.in'));
    expect(atribuirCuerpo('System.out.println(System.in.available());')[0]).toMatchObject(flujo('System.in'));
    expect(atribuirCuerpo('System.in.read();')[0]).toMatchObject(flujo('System.in'));
  });

  it('un argumento de una llamada: `Math.abs(args)`, `Integer.parseInt(args)`, `s.equals(args)` (un arreglo no es un tipo que el subconjunto modele)', () => {
    for (const cuerpo of ['int r = Math.abs(a);', 'int r = Integer.parseInt(a);', 'String s = "x"; boolean b = s.equals(a);', 'Scanner sc = new Scanner(a);']) {
      const problemas = atribuirPrograma(`import java.util.Scanner; class C { public static void main(String[] a) { ${cuerpo} } }`);
      expect(problemas[0], cuerpo).toMatchObject(ARREGLO);
    }
  });

  it('una etiqueta de `case` que no se sabe qué es: javac la rechaza y aquí es «etiqueta-de-case-no-constante» (un error modelado va antes que el aviso, que queda detrás)', () => {
    for (const valor of ['a', 'System.in']) {
      const problemas = atribuirCuerpo(`int x = 1; switch (x) { case ${valor}: break; }`);
      expect(problemas[0]).toMatchObject({ codigo: 'etiqueta-de-case-no-constante' });
      expect(problemas.some((p) => p.categoria === 'no-disponible'), valor).toBe(true);
    }
  });

  it('un `return` con valor es el error de `main` (sin cascada): la expresión de tipo desconocido no agrega nada ANTES de él', () => {
    expect(atribuirCuerpo('return a;')[0]).toMatchObject({ codigo: 'retorno-con-valor' });
  });

  it('sin cascada: si algo DENTRO de la expresión ya es un problema, ese es el primero y no hay un aviso de cierre antes', () => {
    // `foo` no existe: «variable-no-declarada» en `foo`; la suma que lo contiene no agrega un aviso suyo al principio de la línea.
    const problemas = atribuirCuerpo('int x = 1 + foo;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-no-declarada', datos: { nombre: 'foo' } });
    // El mismo `System.in` dentro de una llamada que ya es otro problema: la sobrecarga que no aplica es el problema.
    expect(atribuirCuerpo('int r = Math.abs(System.in);')[0]).toMatchObject({ codigo: 'sin-sobrecarga-aplicable' });
  });

  it('controles — lo que SÍ se sabe no es un aviso: `new Scanner(System.in)`, `System.out.println(…)`, `System.err.println(…)`, `s.equals(System.in)` y las variables de siempre', () => {
    for (const cuerpo of [
      'Scanner sc = new Scanner(System.in);',
      'System.out.println(1);',
      'System.err.println("x");',
      'System.out.printf("%d", 1);',
      'String s = "x"; boolean b = s.equals(System.in);',
      'int x = 5; x = x + 1; if (x > 0) { x++; }',
      'String t = "a" + 1; int n = t.length();',
      'Scanner sc = new Scanner(System.in); int n = sc.nextInt(); String l = sc.nextLine();',
    ]) {
      expect(atribuirPrograma(`import java.util.Scanner; class C { public static void main(String[] a) { ${cuerpo} } }`), cuerpo).toEqual([]);
    }
  });

  it('el parámetro de `main` que NO se usa como valor no es un aviso (declararlo es lo normal): `String[] args` solo declarado, y `String... args`', () => {
    expect(atribuirCuerpo('int x = 1;')).toEqual([]);
    const conPuntos = analizarPrograma(tokenizar('class C { public static void main(String... a) { int x = 1; } }'));
    expect(atribuir(conPuntos)).toEqual([]);
  });

  it('`args` TAPADO por una variable local de otro tipo vuelve a ser esa variable (el alumno que redeclara el parámetro ya recibe «variable-ya-definida»)', () => {
    expect(atribuirCuerpo('int a = 5;')[0]).toMatchObject({ codigo: 'variable-ya-definida' });
  });
});
