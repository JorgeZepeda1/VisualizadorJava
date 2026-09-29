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
// (capa sin restricción), que sí puede compilar los 44 archivos reales del corpus.
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
  'tipo-primitivo-no-soportado': { linea: 1 },
  'final-sin-inicializador-no-soportado': { linea: 1 },
  'for-mejorado-no-soportado': { linea: 1 },
  'etiqueta-no-soportada': { linea: 1 },
  'break-con-etiqueta-no-soportado': { linea: 1 },
  'continue-con-etiqueta-no-soportado': { linea: 1 },
  'try-catch-no-soportado': { linea: 1 },
  'throw-no-soportado': { linea: 1 },
  'switch-flecha-no-soportado': { linea: 1 },
  'yield-no-soportado': { linea: 1 },
  'import-static-no-soportado': { linea: 1 },
  'lambda-no-soportada': { linea: 1 },
  // Tarea 1.26: el código único "miembro-de-biblioteca-no-soportado" se dividió en 3 -- método y
  // campo conservan `{ clase, nombre }`; un constructor no tiene "nombre" propio en JLS, solo
  // `{ clase }` (ver el comentario de `DatosPorCodigoNoSoportado` en motor/no-soportado.ts).
  'metodo-de-biblioteca-no-soportado': { linea: 1, clase: 'String', nombre: 'split' },
  'campo-de-biblioteca-no-soportado': { linea: 1, clase: 'Integer', nombre: 'SIZE' },
  'constructor-de-biblioteca-no-soportado': { linea: 1, clase: 'Scanner' },
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
  // Escenario "arreglo fuera de alcance" de spec.md / el ejemplo literal de proposal.md §2.3.
  it('arreglo fuera de alcance: texto EXACTO del escenario del spec', () => {
    const texto = textosNoSoportado['arreglo-no-soportado']({ linea: 4, tipoArreglo: 'int[]' });
    expect(texto).toBe(
      'Tu programa usa un arreglo (`int[]`) en la línea 4. Java sí lo acepta, pero este visualizador ' +
        'cubre las unidades 3 a 7 y todavía no muestra arreglos. No lo ejecuto para no enseñarte un ' +
        'resultado que podría no ser el de Java.',
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
  // aclarar que el visualizador cubre U3–U7" — formato compartido por el resto del catálogo.
  it('formato compartido: línea, "Java sí" la acepta, y cobertura U3–U7 explícita', () => {
    const texto = textosNoSoportado['var-no-soportado']({ linea: 7 });
    expect(texto).toContain('línea 7');
    expect(texto).toMatch(/Java sí/);
    expect(texto).toMatch(/unidades 3 a 7/);
  });

  it('las construcciones con alternativa dentro de alcance la ofrecen (proposal.md §2.2, "&"/"|" sugieren "&&"/"||")', () => {
    const textoAnd = textosNoSoportado['operador-bits-and']({ linea: 2 });
    const textoOr = textosNoSoportado['operador-bits-or']({ linea: 2 });
    expect(textoAnd).toContain('&&');
    expect(textoOr).toContain('||');
  });
});
