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
  'sincronizado-no-soportado': { linea: 1 },
  'escape-no-soportado': { linea: 1 },
  'escape-octal-no-soportado': { linea: 1 },
  'escape-unicode-no-soportado': { linea: 1 },
  'bloque-de-texto-no-soportado': { linea: 1 },
  'literal-float-no-soportado': { linea: 1 },
  'literal-octal-no-soportado': { linea: 1, textoOriginal: '010', valorDecimal: 8 },
  'literal-hexadecimal-no-soportado': { linea: 1 },
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

describe('textosNoSoportado — catálogo completo (ADR 015, REQ-SUB-006): cada código produce una frase real', () => {
  it.each(Object.keys(DATOS_DE_EJEMPLO) as CodigoNoSoportado[])(
    '"%s" no produce texto vacío ni restos sin resolver, y menciona la línea',
    (codigo) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- datos varían por código, ver DATOS_DE_EJEMPLO
      const texto = (textosNoSoportado[codigo] as (d: any) => string)(DATOS_DE_EJEMPLO[codigo]);
      expect(typeof texto).toBe('string');
      expect(texto.length).toBeGreaterThan(0);
      expect(texto).not.toMatch(/undefined|\[object Object\]|\{[a-zA-Z]/);
      expect(texto).toContain('línea 1');
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
    expect(texto).toMatch(/Java sí/);
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
  // `ejecucion-no-disponible` es la única excepción: solo se emite DESPUÉS de que TODAS las pasadas de
  // compilación aceptaron el programa, así que ahí «Java sí acepta tu programa» es cierto. `no-soportado` (el
  // respaldo defensivo) tampoco usa el marco: no sabe qué construcción es.
  const codigos = Object.keys(DATOS_DE_EJEMPLO) as CodigoNoSoportado[];
  const codigosConMarco = codigos.filter((codigo) => codigo !== 'ejecucion-no-disponible' && codigo !== 'no-soportado');
  const texto = (codigo: CodigoNoSoportado): string =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- datos varían por código, ver DATOS_DE_EJEMPLO
    (textosNoSoportado[codigo] as (d: any) => string)(DATOS_DE_EJEMPLO[codigo]);

  it('el barrido recorre el catálogo entero (guarda contra un filtro que deje la lista vacía)', () => {
    expect(codigos.length).toBeGreaterThanOrEqual(52);
    expect(codigosConMarco.length).toBe(codigos.length - 2);
  });

  it.each(codigos.filter((codigo) => codigo !== 'ejecucion-no-disponible'))(
    '"%s" no dice que Java acepta el programa ("Java sí lo acepta", "Java sí acepta", "Java sí tiene")',
    (codigo) => {
      expect(texto(codigo)).not.toMatch(AFIRMA_QUE_JAVA_LO_ACEPTA);
    },
  );

  it.each(codigosConMarco)('"%s" sigue el marco: es parte de Java, cubre U3–U7, admite que no revisa esa parte y no ejecuta', (codigo) => {
    const frase = texto(codigo);
    expect(frase).toContain('Es parte de Java, pero este visualizador cubre las unidades 3 a 7 y todavía ');
    expect(frase).toContain(', así que no puedo revisar si esa parte está bien escrita.');
    expect(frase.endsWith('No lo ejecuto para no enseñarte un resultado que podría no ser el de Java.')).toBe(true);
  });

  it('control: el detector SÍ reconoce la frase que `ejecucion-no-disponible` conserva a propósito (no es una expresión que nunca coincide)', () => {
    expect(texto('ejecucion-no-disponible')).toMatch(AFIRMA_QUE_JAVA_LO_ACEPTA);
    expect(texto('ejecucion-no-disponible')).toContain('Java sí acepta tu programa');
  });
});
