// RED de la tarea 1.24 (Texto en español de cada aviso de "no soportado" — agregada por el
// orquestador: los códigos de `CODIGOS_NO_SOPORTADO` no tenían NINGÚN texto en es-MX, a diferencia
// de `CodigoProblema`/`textosProblemas` desde la tarea 1.11). ADR 015: el motor SOLO emite
// `codigo` + `datos`; este catálogo es el ÚNICO lugar que arma la frase en español de México para
// cada construcción fuera de REQ-SUB-007. TypeScript ya exige, al tipar `textosNoSoportado` como
// `Record<CodigoNoSoportado, ...>`, que EXISTAN todas las claves de la unión cerrada — esta prueba
// cubre lo que el compilador NO puede verificar: que cada función, ejecutada con datos reales,
// produce una frase no vacía, sin restos (`undefined`, `{` sin resolver), que MENCIONA la línea
// real, y los escenarios formales de REQ-SUB-006 (spec `subconjunto-java`).
//
// Solo importa tipos de `motor/vista` (matriz de capas, herramientas/eslint/matriz-capas.ts): NUNCA
// `compilar()` ni nada de `motor/index.ts` — eso vive en `pruebas/compilacion/avisos-textos.test.ts`
// (capa sin restricción), que sí puede compilar los archivos reales del corpus.
import { describe, expect, it } from 'vitest';
import { textosNoSoportado } from './no-soportado.ts';
import type { CodigoNoSoportado } from '../../motor/vista.ts';

// Un dato de ejemplo razonable por código — cubre TODAS las claves de la unión cerrada
// `CodigoNoSoportado`. Si `motor/no-soportado.ts` agrega o quita un código sin actualizar esto,
// `npm run tipos` lo rechaza (mismo mecanismo que `problemas.test.ts` ya usa para `CodigoProblema`).
const DATOS_DE_EJEMPLO: Record<CodigoNoSoportado, Record<string, unknown>> = {
  'otro-tipo-de-nivel-superior-no-soportado': { linea: 1 },
  'miembro-de-clase-no-soportado': { linea: 1 },
  'throws-no-soportado': { linea: 1 },
  'arreglo-no-soportado': { linea: 1, tipoArreglo: 'int[]' },
  'var-no-soportado': { linea: 1 },
  'generico-no-soportado': { linea: 1 },
  // Tarea 1.30: el aviso nombra el tipo CONCRETO (`float`, `byte` o `short`), no una lista de los tres.
  'tipo-primitivo-no-soportado': { linea: 1, tipo: 'float' },
  'final-sin-inicializador-no-soportado': { linea: 1 },
  'for-mejorado-no-soportado': { linea: 1 },
  'etiqueta-no-soportada': { linea: 1 },
  'break-con-etiqueta-no-soportado': { linea: 1 },
  'continue-con-etiqueta-no-soportado': { linea: 1 },
  'try-catch-no-soportado': { linea: 1 },
  'throw-no-soportado': { linea: 1 },
  'switch-flecha-no-soportado': { linea: 1 },
  'case-con-varias-etiquetas-no-soportado': { linea: 1 },
  'anotacion-no-soportada': { linea: 1 },
  'nombre-calificado-no-soportado': { linea: 1, nombre: 'java.util.Scanner' },
  'yield-no-soportado': { linea: 1 },
  'import-static-no-soportado': { linea: 1 },
  'lambda-no-soportada': { linea: 1 },
  // Tarea 1.26: el código único "miembro-de-biblioteca-no-soportado" se dividió en 3 -- método y
  // campo conservan `{ clase, nombre }`; un constructor no tiene "nombre" propio en JLS, solo
  // `{ clase }` (ver el comentario de `DatosPorCodigoNoSoportado` en motor/no-soportado.ts).
  'metodo-de-biblioteca-no-soportado': { linea: 1, clase: 'String', nombre: 'split' },
  'campo-de-biblioteca-no-soportado': { linea: 1, clase: 'Integer', nombre: 'SIZE' },
  'constructor-de-biblioteca-no-soportado': { linea: 1, clase: 'Scanner' },
  // Tarea 1.29: una clase REAL del JDK (o la propia del programa) fuera del subconjunto — el import
  // de `java.util.Locale`, `StringBuilder`, `JOptionPane`… — con el nombre tal como lo escribió el alumno.
  'clase-no-soportada': { linea: 1, nombre: 'java.util.Locale' },
  // Tarea 1.29: la cabecera de la clase con `extends` o `implements` (herencia o interfaces).
  'herencia-no-soportada': { linea: 1 },
  // Tarea 1.29: `assert`, un tipo declarado dentro de un método y un bloque `synchronized`.
  'assert-no-soportado': { linea: 1 },
  'clase-local-no-soportada': { linea: 1 },
  // Tarea 1.35: `new Tipo() { … }`, una clase anónima.
  'clase-anonima-no-soportada': { linea: 1 },
  // Tarea 1.35: una llamada a un método de la propia clase (la única que llega a la atribución es la recursión de `main`).
  'llamada-a-metodo-propio-no-soportada': { linea: 1, nombre: 'main' },
  // Tarea 1.35: un archivo sin ninguna clase (vacío, solo `package`/`import`); su texto no habla de una línea.
  'archivo-sin-clase': { linea: 1 },
  // Tarea 1.35: un literal de clase (`String.class`, `int[].class`), con el literal tal como lo escribió el alumno.
  'literal-de-clase-no-soportado': { linea: 1, literal: 'String.class' },
  // Tarea 1.35: un carácter de dos unidades UTF-16 (un emoji) dentro de un literal `char`.
  'caracter-suplementario-no-soportado': { linea: 1, caracter: String.fromCodePoint(0x1f600) },
  'sincronizado-no-soportado': { linea: 1 },
  // Tarea 1.36 (C-3): `package java.util.Map;`, un nombre de paquete que es también el de una clase del JDK.
  'paquete-con-nombre-de-clase-no-soportado': { linea: 1, nombre: 'java.util.Map' },
  // Tarea 1.36 (C-5 y W-10): una constante de texto con un número decimal (`"a" + 1.5`) donde Java necesita su valor al compilar.
  'constante-de-texto-con-decimal-no-soportada': { linea: 1 },
  // Tarea 1.36 (C-4b): un programa que se pasa del tope de tamaño; el texto señala la línea donde se pasó, sin el marco de «construcción».
  'programa-demasiado-grande': { linea: 1 },
  // Tarea 1.37 (W-12): un programa con demasiados niveles de anidamiento; como el de tamaño, no es una construcción sino el programa entero.
  'programa-demasiado-anidado': { linea: 1 },
  // Tarea 1.36 (C-4a): un texto tan largo que se acerca al límite del archivo de clase y cuyo tamaño exacto no se puede calcular.
  'tamano-de-texto-no-revisable': { linea: 1 },
  'escape-no-soportado': { linea: 1 },
  'escape-octal-no-soportado': { linea: 1 },
  'escape-unicode-no-soportado': { linea: 1 },
  'bloque-de-texto-no-soportado': { linea: 1 },
  'literal-float-no-soportado': { linea: 1 },
  'literal-octal-no-soportado': { linea: 1, textoOriginal: '010', valorDecimal: 8 },
  'literal-hexadecimal-no-soportado': { linea: 1 },
  // Tarea 1.33: el resultado de `printf` (un `PrintStream`) usado como valor.
  'valor-de-tipo-no-soportado': { linea: 1, llamada: 'System.out.printf' },
  // Tarea 1.34: un valor cuyo tipo el subconjunto no modela (`System.in` usado como valor).
  'valor-de-tipo-no-modelado': { linea: 1, valor: 'System.in' },
  'literal-binario-no-soportado': { linea: 1 },
  'asignacion-de-bits': { linea: 1 },
  'operador-ternario': { linea: 1 },
  instanceof: { linea: 1 },
  'operador-complemento-bits': { linea: 1 },
  'acceso-arreglo': { linea: 1 },
  'referencia-metodo': { linea: 1 },
  'this-super-no-soportado': { linea: 1 },
  'null-no-soportado': { linea: 1 },
  'switch-expresion-no-soportado': { linea: 1 },
  'operador-bits-or': { linea: 1 },
  'operador-bits-xor': { linea: 1 },
  'operador-bits-and': { linea: 1 },
  'operador-desplazamiento': { linea: 1 },
  // Tarea 1.27: única entrada de este catálogo para una construcción que SÍ está en el subconjunto
  // (el motor la ACEPTA); el hueco es que `generarIr` todavía no sabe ejecutarla.
  'ejecucion-no-disponible': { linea: 1 },
  'no-soportado': { linea: 1 },
};

// Tarea 1.35: los códigos cuyo texto habla de TODO el archivo y no de una línea.
const CODIGOS_SIN_LINEA: ReadonlySet<CodigoNoSoportado> = new Set<CodigoNoSoportado>(['archivo-sin-clase']);

describe('textosNoSoportado — catálogo completo (ADR 015, REQ-SUB-006): cada código produce una frase real', () => {
  it.each(Object.keys(DATOS_DE_EJEMPLO) as CodigoNoSoportado[])(
    '"%s" no produce texto vacío ni restos sin resolver, y menciona la línea',
    (codigo) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- datos varían por código, ver DATOS_DE_EJEMPLO
      const texto = (textosNoSoportado[codigo] as (d: any) => string)(DATOS_DE_EJEMPLO[codigo]);
      expect(typeof texto).toBe('string');
      expect(texto.length).toBeGreaterThan(0);
      expect(texto).not.toMatch(/undefined|\[object Object\]|\{[a-zA-Z]/);
      // Tarea 1.35: un archivo SIN clase no tiene una línea que señalar (el aviso es del archivo entero).
      if (!CODIGOS_SIN_LINEA.has(codigo)) expect(texto).toContain('línea 1');
    },
  );

  it('exhaustividad en tiempo de ejecución (guarda redundante del cierre de tipos): hay una entrada por cada dato de ejemplo', () => {
    expect(Object.keys(textosNoSoportado).length).toBe(Object.keys(DATOS_DE_EJEMPLO).length);
  });
});

describe('textosNoSoportado — REQ-SUB-006 (spec subconjunto-java): formato y escenarios exactos', () => {
  // Escenario "arreglo fuera de alcance" de spec.md / el ejemplo literal de proposal.md §2.3, con la frase del
  // marco que el PO aprobó el 2026-09-29 (tarea 1.30): «Es parte de Java… así que no puedo revisar si esa parte
  // está bien escrita». La frase anterior («Java sí lo acepta») afirmaba que el PROGRAMA era válido, y el aviso no
  // puede saberlo: no revisa lo que queda dentro de la construcción que no cubre.
  it('arreglo fuera de alcance: texto EXACTO del escenario (frase del marco aprobada por el PO, tarea 1.30)', () => {
    const texto = textosNoSoportado['arreglo-no-soportado']({ linea: 4, tipoArreglo: 'int[]' });
    expect(texto).toBe(
      'Tu programa usa un arreglo (`int[]`) en la línea 4. Es parte de Java, pero este visualizador ' +
        'cubre las unidades 3 a 7 y todavía no muestra arreglos, así que no puedo revisar si esa parte ' +
        'está bien escrita. No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.',
    );
  });

  // Escenario "literal octal se explica, no se malinterpreta": el aviso indica EXPLÍCITAMENTE que
  // Java lee "010" como octal (valor 8), nunca como diez.
  it('literal octal: el aviso explica que Java lo lee como octal, con el valor real', () => {
    const texto = textosNoSoportado['literal-octal-no-soportado']({ linea: 3, textoOriginal: '010', valorDecimal: 8 });
    expect(texto).toContain('010');
    expect(texto).toContain('8');
    expect(texto).toMatch(/octal/i);
  });

  // Tarea 1.26 (agregada por el orquestador): "miembro" es jerga que un alumno de U3-U7 no conoce
  // (conoce "método") y el código único anterior producía, para un constructor, "el miembro `new
  // Scanner` de `Scanner`... `Scanner.new Scanner`" -- una construcción que NO es Java (D2). Ahora
  // 3 textos independientes, cada uno con la palabra que el alumno SÍ reconoce.
  it('método de biblioteca: el texto dice "el método `NOMBRE` de `CLASE`", nombra el método CONCRETO, nunca algo genérico', () => {
    const texto = textosNoSoportado['metodo-de-biblioteca-no-soportado']({ linea: 5, clase: 'String', nombre: 'split' });
    expect(texto).toContain('el método `split` de `String`');
  });

  it('triangulación de método de biblioteca: otra clase/método distintos se reflejan tal cual (nunca "split"/"String" fijos)', () => {
    const texto = textosNoSoportado['metodo-de-biblioteca-no-soportado']({ linea: 9, clase: 'Math', nombre: 'sin' });
    expect(texto).toContain('el método `sin` de `Math`');
    expect(texto).not.toContain('split');
  });

  it('campo de biblioteca: el texto dice "`CLASE.NOMBRE`" tal como se escribe en Java, y NUNCA usa la palabra "miembro"', () => {
    const texto = textosNoSoportado['campo-de-biblioteca-no-soportado']({ linea: 5, clase: 'Integer', nombre: 'SIZE' });
    expect(texto).toContain('`Integer.SIZE`');
    expect(texto).not.toContain('miembro');
  });

  it('triangulación de campo de biblioteca: otra clase/campo distintos se reflejan tal cual (nunca "Integer"/"SIZE" fijos)', () => {
    const texto = textosNoSoportado['campo-de-biblioteca-no-soportado']({ linea: 9, clase: 'Math', nombre: 'PI' });
    expect(texto).toContain('`Math.PI`');
    expect(texto).not.toContain('Integer');
  });

  // El constructor NO tiene "nombre" propio en JLS (solo `{ clase }`, ver DatosPorCodigoNoSoportado)
  // -- el texto nombra la SINTAXIS real ("new Scanner"), nunca "Scanner.new Scanner" (eso no es Java).
  it('constructor de biblioteca: el texto dice "`new CLASE`"/"crear un `CLASE`" y NUNCA "`CLASE.new" (eso no es Java)', () => {
    const texto = textosNoSoportado['constructor-de-biblioteca-no-soportado']({ linea: 3, clase: 'Scanner' });
    expect(texto).toContain('`new Scanner`');
    expect(texto).toContain('crear un `Scanner`');
    expect(texto).not.toContain('`Scanner.new');
  });

  it('triangulación de constructor de biblioteca: otra clase distinta se refleja tal cual (nunca "Scanner" fijo)', () => {
    const texto = textosNoSoportado['constructor-de-biblioteca-no-soportado']({ linea: 6, clase: 'Random' });
    expect(texto).toContain('`new Random`');
    expect(texto).toContain('crear un `Random`');
    expect(texto).not.toContain('Scanner');
  });

  // Tarea 1.29 (agregada por el orquestador): antes `import java.util.Locale;` daba «No reconozco
  // "java.util.Locale"… revisa que esté bien escrito», un error FALSO (la clase existe): design.md
  // §2.3 pide un aviso «clase existente no soportada». El nombre es el que escribió el alumno (el
  // completo en un `import`, el simple en `StringBuilder sb`).
  it('clase no soportada: el texto dice "la clase `NOMBRE`" con el nombre TAL COMO lo escribió el alumno, nunca uno fijo', () => {
    const deImport = textosNoSoportado['clase-no-soportada']({ linea: 1, nombre: 'java.util.Locale' });
    expect(deImport).toContain('la clase `java.util.Locale`');
    expect(deImport).toContain('línea 1');
    const simple = textosNoSoportado['clase-no-soportada']({ linea: 4, nombre: 'StringBuilder' });
    expect(simple).toContain('la clase `StringBuilder`');
    expect(simple).toContain('línea 4');
    expect(simple).not.toContain('Locale');
  });

  it('clase no soportada: sigue el marco de REQ-SUB-006 (es parte de Java, unidades 3 a 7, no la ejecuta) y NO dice "no reconozco" ni "revisa que esté bien escrito"', () => {
    const texto = textosNoSoportado['clase-no-soportada']({ linea: 2, nombre: 'javax.swing.JOptionPane' });
    expect(texto).toMatch(/Es parte de Java/);
    expect(texto).toMatch(/unidades 3 a 7/);
    expect(texto).toMatch(/No lo ejecuto/);
    // «bien escrito» solo aparece en la admisión honesta del marco («no puedo revisar si esa parte está bien
    // escrita»), nunca como la orden «revisa que esté bien escrito» del error falso que la 1.29 quitó.
    expect(texto).not.toMatch(/no reconozco|revisa que esté bien escrito/i);
  });

  // Tarea 1.29: `java.util.Scanner sc = new java.util.Scanner(System.in);` es Java válido (el nombre completo
  // hace innecesario el import); el subconjunto solo entiende el nombre corto, con su `import`.
  it('nombre completo de una clase: lo dice tal como lo escribió el alumno y explica cómo escribirlo (import + nombre corto)', () => {
    const texto = textosNoSoportado['nombre-calificado-no-soportado']({ linea: 4, nombre: 'java.util.Scanner' });
    expect(texto).toContain('línea 4');
    expect(texto).toContain('`java.util.Scanner`');
    expect(texto).toContain('`import java.util.Scanner;`');
    expect(texto).toContain('`Scanner`');
  });

  it('triangulación: otra clase con su paquete se refleja tal cual (el import y el nombre corto salen del nombre completo)', () => {
    const texto = textosNoSoportado['nombre-calificado-no-soportado']({ linea: 2, nombre: 'javax.swing.JOptionPane' });
    expect(texto).toContain('`import javax.swing.JOptionPane;`');
    expect(texto).toContain('`JOptionPane`');
    expect(texto).not.toContain('Scanner');
  });

  // Tarea 1.29: una anotación (`@Override`, `@SuppressWarnings("resource")`) es Java válido que el subconjunto
  // no interpreta; casi siempre solo silencia un aviso del editor, y quitarla no cambia el programa.
  it('anotación: dice la línea, da ejemplos que el alumno reconoce y sugiere quitarla si solo silencia un aviso', () => {
    const texto = textosNoSoportado['anotacion-no-soportada']({ linea: 3 });
    expect(texto).toContain('línea 3');
    expect(texto).toContain('`@Override`');
    expect(texto).toContain('`@SuppressWarnings`');
    expect(texto).toMatch(/quitar/);
  });

  // Tarea 1.29: `case 1, 2:` es Java válido (14+) que el subconjunto no ejecuta — la alternativa dentro
  // del subconjunto existe y se nombra (un `case` por valor), con el ejemplo del propio alumno en mente.
  it('varias etiquetas en un case: dice la línea, ofrece un `case` por valor y no habla de la flecha', () => {
    const texto = textosNoSoportado['case-con-varias-etiquetas-no-soportado']({ linea: 5 });
    expect(texto).toContain('línea 5');
    expect(texto).toContain('`case 1, 2:`');
    expect(texto).toContain('`case 1:`');
    expect(texto).toContain('`case 2:`');
    expect(texto).not.toContain('->');
  });

  // Tarea 1.27: a diferencia de TODO el resto del catálogo, esta construcción SÍ está dentro del
  // subconjunto U3-U7 -- el texto NUNCA debe decir "este visualizador cubre las unidades 3 a 7"
  // (sería engañoso) ni usar jerga de desarrollo ("lote", "tarea", "declaracion-local").
  it('ejecución no disponible: el texto NUNCA dice "unidades 3 a 7" (sí está en el subconjunto) ni usa jerga de desarrollo', () => {
    const texto = textosNoSoportado['ejecucion-no-disponible']({ linea: 3 });
    expect(texto).toContain('línea 3');
    // Tarea 1.34: dice lo que se revisó, ya no «Java sí acepta tu programa».
    expect(texto).toContain('pasó todas mis revisiones');
    expect(texto).not.toMatch(/Java sí/);
    expect(texto).not.toMatch(/unidades 3 a 7/);
    expect(texto).not.toContain('lote');
    expect(texto).not.toContain('tarea');
    expect(texto).not.toContain('declaracion-local');
  });

  // REQ-SUB-006: "señalar la línea y la construcción, decir que Java sí la acepta (cuando aplica),
  // aclarar que el visualizador cubre U3–U7" — formato compartido por el resto del catálogo. Tarea 1.30 (PO,
  // 2026-09-29): «decir que Java la acepta» se afirma de la CONSTRUCCIÓN («Es parte de Java»), nunca del
  // programa, y el aviso admite lo que no revisa.
  it('formato compartido: línea, "es parte de Java", cobertura U3–U7 explícita y la admisión de que no revisa esa parte', () => {
    const texto = textosNoSoportado['var-no-soportado']({ linea: 7 });
    expect(texto).toContain('línea 7');
    expect(texto).toMatch(/Es parte de Java/);
    expect(texto).toMatch(/unidades 3 a 7/);
    expect(texto).toMatch(/así que no puedo revisar si esa parte está bien escrita/);
  });

  it('el marco antepone la alternativa a "No lo ejecuto", después de la admisión: el orden exacto de las cuatro frases', () => {
    const texto = textosNoSoportado['for-mejorado-no-soportado']({ linea: 2 });
    expect(texto).toBe(
      'Tu programa usa un ciclo `for` mejorado (`for-each`) en la línea 2. Es parte de Java, pero este ' +
        'visualizador cubre las unidades 3 a 7 y todavía no ejecuta el `for` mejorado, así que no puedo ' +
        'revisar si esa parte está bien escrita. Usa un `for` clásico con índice para recorrer el arreglo. ' +
        'No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.',
    );
  });

  // Tarea 1.30 (decisión del PO 2026-09-29): el aviso de `float`/`byte`/`short` decía «un tipo primitivo
  // (`float`, `byte` o `short`) que Java sí tiene, pero que no forma parte de este subconjunto en la línea 3.
  // Java sí lo acepta…»: repetía «Java sí» y dejaba «en la línea N» a media oración. Ahora nombra el tipo CONCRETO
  // que escribió el alumno y su alternativa depende de ese tipo.
  it.each([
    ['float', 'double'],
    ['byte', 'int'],
    ['short', 'int'],
  ] as const)('tipo primitivo "%s": lo nombra, dice la línea justo después y sugiere `%s` en su lugar', (tipo, alternativa) => {
    const texto = textosNoSoportado['tipo-primitivo-no-soportado']({ linea: 3, tipo });
    expect(texto.startsWith(`Tu programa usa el tipo \`${tipo}\` en la línea 3. Es parte de Java, `)).toBe(true);
    expect(texto).toContain('todavía no simula ese tipo');
    expect(texto).toContain(`Si tu programa lo permite, usa \`${alternativa}\` en vez de \`${tipo}\`.`);
  });

  it('tipo primitivo: el texto EXACTO de `byte` (frase aprobada por el PO) y solo nombra el tipo que escribió el alumno', () => {
    const texto = textosNoSoportado['tipo-primitivo-no-soportado']({ linea: 3, tipo: 'byte' });
    expect(texto).toBe(
      'Tu programa usa el tipo `byte` en la línea 3. Es parte de Java, pero este visualizador cubre las ' +
        'unidades 3 a 7 y todavía no simula ese tipo, así que no puedo revisar si esa parte está bien ' +
        'escrita. Si tu programa lo permite, usa `int` en vez de `byte`. No lo ejecuto para no enseñarte ' +
        'un resultado que podría no ser el de Java.',
    );
    expect(texto).not.toContain('float');
    expect(texto).not.toContain('short');
  });

  it('las construcciones con alternativa dentro de alcance la ofrecen (proposal.md §2.2, "&"/"|" sugieren "&&"/"||")', () => {
    const textoAnd = textosNoSoportado['operador-bits-and']({ linea: 2 });
    const textoOr = textosNoSoportado['operador-bits-or']({ linea: 2 });
    expect(textoAnd).toContain('&&');
    expect(textoOr).toContain('||');
  });
});

// Tarea 1.35 (WARNING 3 de la re-verificación del lote 1, falsos RECHAZOS): `new Runnable() { … }` es una clase anónima, Java válido que el subconjunto no simula
// (REQ-SUB-007: «clases/objetos propios» → aviso). Antes salía «Te falta un punto y coma», un texto falso para un programa que javac compila.
describe('textosNoSoportado — una clase anónima (tarea 1.35)', () => {
  it('usa el marco aprobado, nombra la construcción y la línea, y no afirma que Java acepta el programa', () => {
    const texto = textosNoSoportado['clase-anonima-no-soportada']({ linea: 4 });
    expect(texto).toBe(
      'Tu programa usa una clase anónima (`new Tipo() { … }`) en la línea 4. Es parte de Java, pero este visualizador cubre las unidades 3 a 7 y todavía ' +
        'no simula clases propias, así que no puedo revisar si esa parte está bien escrita. ' +
        'No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.',
    );
  });

  it('triangulación: la línea sale de los datos, no de un valor fijo', () => {
    expect(textosNoSoportado['clase-anonima-no-soportada']({ linea: 11 })).toContain('en la línea 11');
  });
});

// Tarea 1.35 (WARNING 3, falsos RECHAZOS): `main(args);` dentro de `main` es una llamada a un método de la propia clase; javac lo compila y aquí daba «el método "main" no
// existe», un texto falso. Los métodos propios que el alumno declara ya avisan en su declaración; la recursión de `main` es el único método propio que la atribución ve.
describe('textosNoSoportado — una llamada a un método propio (tarea 1.35)', () => {
  it('nombra el método y la línea, con el marco aprobado y sin afirmar que Java acepta el programa', () => {
    expect(textosNoSoportado['llamada-a-metodo-propio-no-soportada']({ linea: 3, nombre: 'main' })).toBe(
      'Tu programa usa una llamada a un método propio (`main(...)`) en la línea 3. Es parte de Java, pero este visualizador cubre las unidades 3 a 7 y todavía ' +
        'no ejecuta llamadas a métodos de tu propia clase, así que no puedo revisar si esa parte está bien escrita. ' +
        'No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.',
    );
  });

  it('triangulación: el nombre y la línea salen de los datos', () => {
    const texto = textosNoSoportado['llamada-a-metodo-propio-no-soportada']({ linea: 9, nombre: 'saludar' });
    expect(texto).toContain('`saludar(...)`');
    expect(texto).toContain('en la línea 9');
  });
});

// Tarea 1.35 (WARNING 3, decisión del PO 2026-10-02): un archivo vacío, o con solo un comentario, un `package` o imports, no declara ninguna clase. javac lo compila sin error, así que
// no es un error de compilación; tampoco es una construcción fuera del subconjunto (no usa nada). Lo que SÍ se le puede decir es que no hay nada que ejecutar y cómo empezar.
describe('textosNoSoportado — un archivo sin ninguna clase (tarea 1.35)', () => {
  it('dice que no hay ninguna clase, que por eso no hay nada que ejecutar, y cómo se empieza; sin afirmar que Java acepta el programa', () => {
    const texto = textosNoSoportado['archivo-sin-clase']({ linea: 1 });
    expect(texto).toBe(
      'Tu programa no tiene ninguna clase, así que no hay nada que ejecutar. Un programa de Java empieza en una clase con un método `main`; por ejemplo: ' +
        '`public class MiPrograma { public static void main(String[] args) { … } }`.',
    );
    expect(texto).not.toMatch(/Java sí (lo |la )?(acepta|tiene)/);
  });
});

// Tarea 1.35 (la mutación por elemento de los conjuntos del reconocedor de casts destapó una familia de falsos RECHAZOS): `System.out.println(String.class)` y `Object o = int[].class;`
// son Java válido —un literal de clase, JLS 15.8.2— y salían como un error de sintaxis. El visualizador no maneja los objetos `Class`: el aviso nombra el literal tal como se escribió.
describe('textosNoSoportado — un literal de clase (tarea 1.35)', () => {
  it('nombra el literal y la línea, con el marco aprobado y sin afirmar que Java acepta el programa', () => {
    expect(textosNoSoportado['literal-de-clase-no-soportado']({ linea: 3, literal: 'String.class' })).toBe(
      'Tu programa usa un literal de clase (`String.class`) en la línea 3. Es parte de Java, pero este visualizador cubre las unidades 3 a 7 y todavía ' +
        'no maneja los objetos que representan a una clase (`Class`), así que no puedo revisar si esa parte está bien escrita. ' +
        'No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.',
    );
  });

  it('triangulación: el literal y la línea salen de los datos', () => {
    const texto = textosNoSoportado['literal-de-clase-no-soportado']({ linea: 12, literal: 'int[].class' });
    expect(texto).toContain('`int[].class`');
    expect(texto).toContain('en la línea 12');
  });
});

// Tarea 1.35 (hallado con una sonda de Java válido): `char c = '<emoji>';` lo compila javac (el valor es la primera unidad UTF-16 del carácter) y salía un error de sintaxis. El visualizador no
// simula ese literal: el aviso nombra el carácter tal como se escribió.
describe('textosNoSoportado — un carácter de dos unidades dentro de un literal char (tarea 1.35)', () => {
  it('nombra el carácter y la línea, con el marco aprobado y sin afirmar que Java acepta el programa', () => {
    const emoji = String.fromCodePoint(0x1f600);
    expect(textosNoSoportado['caracter-suplementario-no-soportado']({ linea: 3, caracter: emoji })).toBe(
      `Tu programa usa el carácter \`${emoji}\` dentro de un literal \`char\` en la línea 3. Es parte de Java, pero este visualizador cubre las unidades 3 a 7 y todavía ` +
        'no simula un carácter que Java guarda en dos `char` (como un emoji), así que no puedo revisar si esa parte está bien escrita. ' +
        'No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.',
    );
  });

  it('triangulación: el carácter y la línea salen de los datos', () => {
    const caracter = String.fromCodePoint(0x10000);
    const texto = textosNoSoportado['caracter-suplementario-no-soportado']({ linea: 8, caracter });
    expect(texto).toContain(`\`${caracter}\``);
    expect(texto).toContain('en la línea 8');
  });
});

// Tarea 1.35: `sealed`, `non-sealed` y `permits` de la clase principal avisan con el mismo código de herencia (JLS 8.1.6: restringen quién puede heredar de ella); el texto
// ya no puede decir solo «`extends` o `implements`», porque `public sealed class C permits D` no tiene ninguna de las dos.
describe('textosNoSoportado — herencia, ahora también clases selladas (tarea 1.35)', () => {
  it('nombra `sealed` y `permits` además de `extends` e `implements`, con el marco aprobado', () => {
    expect(textosNoSoportado['herencia-no-soportada']({ linea: 4 })).toBe(
      'Tu programa usa una clase con herencia, interfaces o clases selladas (`extends`, `implements`, `sealed` o `permits`) en la línea 4. ' +
        'Es parte de Java, pero este visualizador cubre las unidades 3 a 7 y todavía no simula herencia, interfaces ni clases selladas, ' +
        'así que no puedo revisar si esa parte está bien escrita. ' +
        'No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.',
    );
  });
});

// Tarea 1.30 (decisión explícita del PO, 2026-09-29: «sí, corrige la frase ya»). Un aviso de «No disponible»
// se emite al RECONOCER una construcción fuera del subconjunto; el reconocimiento no puede revisar la validez
// de lo que queda dentro de ella, y hay programas que javac rechaza y que llegan aquí (7 en el corpus: un método
// propio sin `return`, `byte c = a + b;`, un `break` a una etiqueta que no existe…). Decirles «Java sí lo
// acepta» era FALSO (D2, regla 5 de CLAUDE.md). Un aviso afirma algo de la construcción y admite lo que no
// revisa. La guarda de punta a punta, con los veredictos reales de javac, es
// `pruebas/compilacion/programas-invalidos.test.ts`; esta cubre el catálogo COMPLETO, incluidos los códigos que
// ninguna muestra del corpus alcanza.
describe('textosNoSoportado — tarea 1.30: un aviso afirma algo de la construcción, nunca que Java acepta el programa', () => {
  const AFIRMA_QUE_JAVA_LO_ACEPTA = /Java sí (?:l[oa]s? )?(?:acepta|tiene)/;
  // Tarea 1.34 (defensa en profundidad, aprobada por el PO el 2026-10-02): ya NO hay excepción — tampoco `ejecucion-no-disponible` afirma que Java acepta el
  // programa. Su texto decía «Java sí acepta tu programa», cierto solo si TODAS las reglas de javac están modeladas, y la re-verificación del lote 1 halló programas
  // que javac rechaza y que la pasaban (las familias A–D). Ahora dice lo que SÍ se revisó: «pasó todas mis revisiones». `no-soportado` (el respaldo defensivo)
  // tampoco usa el marco: no sabe qué construcción es.
  const codigos = Object.keys(DATOS_DE_EJEMPLO) as CodigoNoSoportado[];
  // Tarea 1.35: `archivo-sin-clase` tampoco usa el marco: no hay una construcción que nombrar, el archivo no tiene ninguna clase.
  // Tarea 1.36: ni `programa-demasiado-grande`: tampoco hay una construcción, es el programa entero el que se pasa del tope de tamaño.
  // Tarea 1.37: ni `programa-demasiado-anidado`: es el programa entero el que se pasa de los niveles que el visualizador sabe revisar.
  const SIN_MARCO: ReadonlySet<CodigoNoSoportado> = new Set<CodigoNoSoportado>(['ejecucion-no-disponible', 'no-soportado', 'archivo-sin-clase', 'programa-demasiado-grande', 'programa-demasiado-anidado']);
  const codigosConMarco = codigos.filter((codigo) => !SIN_MARCO.has(codigo));
  const texto = (codigo: CodigoNoSoportado): string =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- datos varían por código, ver DATOS_DE_EJEMPLO
    (textosNoSoportado[codigo] as (d: any) => string)(DATOS_DE_EJEMPLO[codigo]);

  it('el barrido recorre el catálogo entero (guarda contra un filtro que deje la lista vacía)', () => {
    expect(codigos.length).toBeGreaterThanOrEqual(52);
    expect(codigosConMarco.length).toBe(codigos.length - SIN_MARCO.size);
  });

  it.each(codigos)('"%s" no dice que Java acepta el programa ("Java sí lo acepta", "Java sí acepta", "Java sí tiene")', (codigo) => {
    expect(texto(codigo)).not.toMatch(AFIRMA_QUE_JAVA_LO_ACEPTA);
  });

  it.each(codigosConMarco)('"%s" sigue el marco: es parte de Java, cubre U3–U7, admite que no revisa esa parte y no ejecuta', (codigo) => {
    const frase = texto(codigo);
    expect(frase).toContain('Es parte de Java, pero este visualizador cubre las unidades 3 a 7 y todavía ');
    expect(frase).toContain(', así que no puedo revisar si esa parte está bien escrita.');
    expect(frase.endsWith('No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.')).toBe(true);
  });

  it('control: el detector SÍ reconoce la frase de antes («Java sí acepta tu programa»): no es una expresión que nunca coincide', () => {
    expect('Java sí acepta tu programa, pero este visualizador todavía no sabe ejecutar lo que escribiste en la línea 6.').toMatch(AFIRMA_QUE_JAVA_LO_ACEPTA);
    expect('Java sí lo acepta').toMatch(AFIRMA_QUE_JAVA_LO_ACEPTA);
  });

  it('`ejecucion-no-disponible` dice lo que SÍ se revisó, la línea que todavía no se sabe ejecutar y por qué no se ejecuta (texto aprobado por el PO, 2026-10-02)', () => {
    expect(texto('ejecucion-no-disponible')).toBe(
      'Tu programa pasó todas mis revisiones, pero todavía no sé ejecutar lo que escribiste en la línea 1. ' +
        'No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.',
    );
    expect(textosNoSoportado['ejecucion-no-disponible']({ linea: 12 })).toContain('en la línea 12');
  });
});

// Tarea 1.33: `printf` devuelve un `PrintStream` (el mismo `System.out`), un tipo que el subconjunto no modela. Usar ese resultado como
// valor (`int b = System.out.printf("a");`) es Java válido o no según el uso, y no se puede revisar: aviso, con la salida que SÍ existe.
describe('textosNoSoportado — el resultado de `printf` usado como valor (tarea 1.33)', () => {
  it('nombra la llamada y la línea, usa el marco aprobado (sin afirmar que el programa compila) y ofrece la alternativa', () => {
    const texto = textosNoSoportado['valor-de-tipo-no-soportado']({ linea: 6, llamada: 'System.out.printf' });
    expect(texto).toBe(
      'Tu programa usa el resultado de `System.out.printf(...)` como un valor en la línea 6. Es parte de Java, pero este visualizador ' +
        'cubre las unidades 3 a 7 y todavía no maneja el tipo de ese resultado, así que no puedo revisar si esa parte está bien escrita. ' +
        'Escribe `System.out.printf(...)` como una sentencia aparte, sin usar lo que devuelve. ' +
        'No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.',
    );
    expect(texto).not.toMatch(/Java sí (lo |la )?(acepta|tiene)/);
  });

  it('triangulación: con otra llamada la frase cambia con ella', () => {
    expect(textosNoSoportado['valor-de-tipo-no-soportado']({ linea: 2, llamada: 'flujo.printf' })).toContain('`flujo.printf(...)`');
  });
});


// Tarea 1.34: `System.in`, `System.out` y `System.err` usados como VALOR (no como argumento del `Scanner` ni como receptor de `println`) son de un tipo
// (`InputStream`, `PrintStream`) que el subconjunto no modela, y el motor ya no los deja pasar en silencio. El aviso nombra el valor y, para los tres que un
// alumno de U3–U7 confunde, da la salida que SÍ existe: leer es con un `Scanner`, mostrar es con `println`.
describe('textosNoSoportado — un valor cuyo tipo el subconjunto no modela (cierre por defecto, tarea 1.34)', () => {
  it('`System.in`: nombra el valor y la línea, usa el marco aprobado y manda al `Scanner`', () => {
    const texto = textosNoSoportado['valor-de-tipo-no-modelado']({ linea: 4, valor: 'System.in' });
    expect(texto).toBe(
      'Tu programa usa `System.in` como un valor en la línea 4. Es parte de Java, pero este visualizador cubre las unidades 3 a 7 y todavía no ' +
        'maneja el tipo de ese valor, así que no puedo revisar si esa parte está bien escrita. ' +
        'Para leer lo que escribe el usuario, crea un `Scanner` con `new Scanner(System.in)` y usa sus métodos, como `nextInt()`. ' +
        'No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.',
    );
    expect(texto).not.toMatch(/Java sí (lo |la )?(acepta|tiene)/);
  });

  it('`System.out` y `System.err`: la alternativa es `println` sobre ellos mismos', () => {
    expect(textosNoSoportado['valor-de-tipo-no-modelado']({ linea: 2, valor: 'System.out' })).toContain('Para mostrar algo en pantalla, usa `System.out.println(...)`.');
    expect(textosNoSoportado['valor-de-tipo-no-modelado']({ linea: 2, valor: 'System.err' })).toContain('usa `System.err.println(...)`.');
  });

  it('otro valor (o ninguno que se pueda nombrar): sin inventar una alternativa, y la frase sigue el marco', () => {
    const otro = textosNoSoportado['valor-de-tipo-no-modelado']({ linea: 7, valor: 'flujo' });
    expect(otro).toContain('`flujo` como un valor en la línea 7');
    expect(otro).not.toMatch(/Scanner|println/);
    const sinNombre = textosNoSoportado['valor-de-tipo-no-modelado']({ linea: 9, valor: null });
    expect(sinNombre).toContain('un valor de un tipo que este visualizador no simula en la línea 9');
    expect(sinNombre).not.toMatch(/undefined|null|`null`/);
  });
});

// Tarea 1.36 (C-3): `package java.util.Map;`. javac lo rechaza o no según lo que use el programa (`pkg.clashes.with.class.of.same.name` solo cuando el paquete de arriba ya se
// cargó: siempre con `java.lang`, con `java.util` solo si se importa algo de él), y decidirlo pide modelar la carga de paquetes de javac: aviso honesto.
describe('textosNoSoportado — un nombre de paquete que es también el de una clase de Java (C-3, tarea 1.36)', () => {
  it('nombra el paquete y la línea, usa el marco aprobado y da la salida (un nombre propio o quitar la línea)', () => {
    const texto = textosNoSoportado['paquete-con-nombre-de-clase-no-soportado']({ linea: 1, nombre: 'java.util.Map' });
    expect(texto).toBe(
      'Tu programa usa un nombre de paquete (`java.util.Map`) que también es el de una clase de Java en la línea 1. Es parte de Java, pero este visualizador cubre las unidades 3 a 7 y ' +
        'todavía no comprueba los paquetes que se llaman como una clase, así que no puedo revisar si esa parte está bien escrita. ' +
        'Usa un nombre de paquete propio, como `package miproyecto;`, o quita la línea `package`. ' +
        'No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.',
    );
    expect(texto).not.toMatch(/Java sí (lo |la )?(acepta|tiene)/);
  });

  it('triangulación: con otro nombre la frase cambia con él', () => {
    expect(textosNoSoportado['paquete-con-nombre-de-clase-no-soportado']({ linea: 3, nombre: 'java.lang.String' })).toContain('`java.lang.String`');
  });
});

// Tarea 1.36 (C-5 y W-10): `while ("a" + 1.5 == "a1.5") { }`, `case "d" + 1.5:`. Java trata `"a" + 1.5` como una constante y decide con su valor si un ciclo termina, si una variable queda asignada o si dos
// etiquetas se repiten; el valor depende de cómo Java convierte un número decimal a texto, y eso todavía no está en el visualizador. El aviso dice qué es, por qué no se puede revisar y qué hacer.
describe('textosNoSoportado — una constante de texto con un número decimal (C-5 y W-10, tarea 1.36)', () => {
  it('nombra la construcción y la línea, usa el marco aprobado y da la salida (escribir el texto completo)', () => {
    const texto = textosNoSoportado['constante-de-texto-con-decimal-no-soportada']({ linea: 4 });
    expect(texto).toBe(
      'Tu programa usa una constante de texto con un número decimal (como `"a" + 1.5`) en la línea 4. Es parte de Java, pero este visualizador cubre las unidades 3 a 7 y todavía no sabe ' +
        'convertir un número decimal a texto como lo hace Java, así que no puedo revisar si esa parte está bien escrita. ' +
        'Java necesita conocer ese valor al compilar para decidir cosas como si un ciclo termina; si puedes, escribe el texto ya completo (por ejemplo, `"a1.5"`). ' +
        'No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.',
    );
    expect(texto).not.toMatch(/Java sí (lo |la )?(acepta|tiene)|token|constante desconocida/);
  });

  it('triangulación: con otra línea la frase cambia con ella', () => {
    expect(textosNoSoportado['constante-de-texto-con-decimal-no-soportada']({ linea: 12 })).toContain('en la línea 12.');
  });
});

// Tarea 1.36 (C-4b y S-1): javac rechaza un método de más de 65 535 bytes de bytecode (`limit.code`) y el motor no modela ese tamaño: pone un tope conservador de elementos del programa. Un programa de
// clase está muy por debajo; el aviso dice dónde se pasó, que el visualizador está pensado para programas de clase y qué hacer, sin afirmar que Java rechace o acepte el programa.
describe('textosNoSoportado — un programa demasiado grande (C-4b, tarea 1.36)', () => {
  it('señala la línea donde se pasó del tope, explica para qué está pensado el visualizador y da la salida (una parte más pequeña)', () => {
    const texto = textosNoSoportado['programa-demasiado-grande']({ linea: 312 });
    expect(texto).toBe(
      'Tu programa es demasiado grande para este visualizador: a partir de la línea 312 se pasa del tamaño que sabe revisar (está pensado para programas de clase). ' +
        'Prueba con una parte más pequeña. No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.',
    );
    expect(texto).not.toMatch(/Java sí (lo |la )?(acepta|tiene)|token|bytecode/);
  });

  it('triangulación: con otra línea la frase cambia con ella', () => {
    expect(textosNoSoportado['programa-demasiado-grande']({ linea: 5 })).toContain('a partir de la línea 5 se pasa');
  });
});

// Tarea 1.37 (W-12): un programa con muchísimos niveles de anidamiento (cientos de paréntesis uno dentro de otro, o una cadena de cientos de `&&`) agotaba la pila del visualizador y la pantalla decía
// «Algo falló dentro del visualizador». Ahora es un aviso: dice dónde se pasó, que el visualizador está pensado para programas de clase y qué hacer, sin afirmar que Java rechace o acepte el programa
// y sin jerga del motor (pila, recursión, árbol, token).
describe('textosNoSoportado — un programa demasiado anidado (W-12, tarea 1.37)', () => {
  it('señala la línea donde se pasó, explica qué es (anidado o encadenado) y da la salida (una parte más sencilla)', () => {
    const texto = textosNoSoportado['programa-demasiado-anidado']({ linea: 12 });
    expect(texto).toBe(
      'Tu programa tiene demasiadas cosas anidadas: a partir de la línea 12 hay más paréntesis, bloques o instrucciones metidos unos dentro de otros (o más operaciones encadenadas) ' +
        'de los que este visualizador sabe revisar, y está pensado para programas de clase. Prueba con una parte más sencilla. ' +
        'No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.',
    );
    expect(texto).not.toMatch(/Java sí (lo |la )?(acepta|tiene)|pila|recursi|árbol|token|RangeError|undefined/);
  });

  it('triangulación: con otra línea la frase cambia con ella', () => {
    expect(textosNoSoportado['programa-demasiado-anidado']({ linea: 3 })).toContain('a partir de la línea 3 hay');
  });
});

// Tarea 1.36 (C-4a): un texto cuyo largo cae justo en el límite de Java (65 535 bytes) y que el visualizador no sabe medir con seguridad —lleva un decimal, cuyo largo decide `Double.toString`, o hay
// condiciones fijas que podrían podar código—. El aviso dice qué es, por qué no se revisa y qué hacer; sin la frase de un número exacto que no se tiene.
describe('textosNoSoportado — un texto cerca del límite de tamaño que no se puede medir (C-4a, tarea 1.36)', () => {
  it('señala la línea, usa el marco aprobado y da la salida (acortarlo o dividirlo)', () => {
    const texto = textosNoSoportado['tamano-de-texto-no-revisable']({ linea: 7 });
    expect(texto).toBe(
      'Tu programa usa un texto tan largo que se acerca al límite de tamaño que Java permite (65 535 bytes por texto) en la línea 7. Es parte de Java, pero este visualizador cubre las unidades 3 a 7 y ' +
        'todavía no sabe comprobar con seguridad si Java lo aceptaría, así que no puedo revisar si esa parte está bien escrita. ' +
        'Acórtalo, o divídelo en varias instrucciones `System.out.print`. ' +
        'No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.',
    );
    expect(texto).not.toMatch(/Java sí (lo |la )?(acepta|tiene)|UTF|constant pool|bytecode/);
  });

  it('triangulación: con otra línea la frase cambia con ella', () => {
    expect(textosNoSoportado['tamano-de-texto-no-revisable']({ linea: 120 })).toContain('en la línea 120.');
  });
});
