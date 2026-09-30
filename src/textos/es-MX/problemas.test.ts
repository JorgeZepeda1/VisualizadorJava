// RED de la tarea 1.11 (catálogo es-MX de `Problema`, ADR 015). El motor SOLO emite `codigo` +
// `datos` (nunca texto armado); este catálogo es el ÚNICO lugar que traduce cada `CodigoProblema`
// cerrado (`src/motor/problemas.ts`) a una frase en español de México. TypeScript ya exige, al
// tipar `textosProblemas` como `Record<CodigoProblema, ...>`, que EXISTAN las 29 claves — esta
// prueba cubre lo que el compilador NO puede verificar: que cada función, ejecutada con datos
// reales, produce una frase no vacía y SIN restos (`undefined`, `{` sin resolver — ADR 015 punto
// 4), y la lógica condicional real (p. ej. la sugerencia de mayúscula de err19).
import { describe, expect, it } from 'vitest';
import { textosProblemas } from './problemas.ts';
import type { CodigoProblema } from '../../motor/vista.ts';

// Un dato de ejemplo razonable por código — cubre TODAS las claves del catálogo cerrado.
const DATOS_DE_EJEMPLO: Record<CodigoProblema, Record<string, unknown>> = {
  'falta-punto-y-coma': {},
  'falta-parentesis-cierre': {},
  'error-no-clasificado': { mensaje: 'se esperaba "}" y se encontró "<fin de archivo>"' },
  'variable-no-declarada': { nombre: 'edad' },
  'metodo-no-declarado': { nombre: 'saludar' },
  'variable-ya-definida': { nombre: 'x' },
  'tipo-no-reconocido': { nombre: 'string' },
  'campo-no-declarado': { clase: 'Math', nombre: 'PIE' },
  'miembro-no-declarado': { clase: 'String', nombre: 'lenght' },
  'sin-sobrecarga-aplicable': { clase: 'Math', nombre: 'max', argumentos: ['String', 'int'] },
  'sin-constructor-aplicable': { clase: 'Scanner', argumentos: [] },
  'conversion-con-perdida': { origen: 'double', destino: 'int' },
  'tipos-incompatibles-en-asignacion': { origen: 'String', destino: 'int' },
  'condicion-no-booleana': { tipo: 'int' },
  'tipos-incomparables': { izquierda: 'String', derecha: 'int' },
  'operandos-invalidos-operador-binario': { operador: '-', izquierda: 'String', derecha: 'int' },
  'operando-invalido-operador-unario': { operador: '!', operando: 'int' },
  'importacion-no-reconocida': { nombre: 'java.utilScanner' },
  'objetivo-no-es-variable': {},
  'llave-de-clase-faltante': {},
  'selector-de-switch-invalido': { tipo: 'long' },
  'etiqueta-de-case-no-constante': {},
  'etiqueta-de-case-duplicada': {},
  'break-fuera-de-contexto': {},
  'continue-fuera-de-contexto': {},
  'else-sin-if': {},
  'cadena-sin-cerrar': {},
  'fin-de-archivo-inesperado': {},
  'llave-de-cierre-sobrante': {},
  'llave-de-metodo-faltante': {},
  'paquete-despues-de-import': {},
  'tipo-requiere-import': { nombre: 'Scanner' },
  'modificador-repetido': { mensaje: 'escribiste "static" dos veces seguidas' },
  'sentencia-inalcanzable': {},
  'variable-posiblemente-no-asignada': { nombre: 'x' },
  'variable-final-reasignada': { nombre: 'MAX' },
  'llamada-sin-valor': { llamada: 'System.out.print' },
  'miembro-de-primitivo': { tipo: 'int', nombre: 'length', receptor: 'n' },
  'cast-invalido': { origen: 'String', destino: 'int' },
  'etiqueta-de-case-de-otro-tipo': { etiqueta: 'String', selector: 'int' },
  'etiqueta-default-duplicada': {},
  'metodo-de-instancia-sin-objeto': { clase: 'String', nombre: 'trim' },
};

describe('textosProblemas — catálogo completo (ADR 015): cada código produce una frase real', () => {
  it.each(Object.keys(DATOS_DE_EJEMPLO) as CodigoProblema[])('"%s" no produce texto vacío ni restos sin resolver', (codigo) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- datos varían por código, ver DATOS_DE_EJEMPLO
    const texto = (textosProblemas[codigo] as (d: any) => string)(DATOS_DE_EJEMPLO[codigo]);
    expect(typeof texto).toBe('string');
    expect(texto.length).toBeGreaterThan(0);
    expect(texto).not.toMatch(/undefined|\[object Object\]|\{[a-zA-Z]/);
  });
});

describe('textosProblemas — "variable-no-declarada": la sugerencia de mayúscula es CONDICIONAL (err19)', () => {
  it('CON sugerencia (err19: "system" -> "System"): la frase la incluye', () => {
    const texto = textosProblemas['variable-no-declarada']({ nombre: 'system', sugerencia: 'System' });
    expect(texto).toContain('System');
  });

  it('SIN sugerencia (caso normal, err02): la frase no inventa una mayúscula que nadie propuso', () => {
    const texto = textosProblemas['variable-no-declarada']({ nombre: 'edad' });
    expect(texto).not.toMatch(/quisiste decir/i);
  });
});

describe('textosProblemas — mensajes con datos reales quedan legibles (muestra representativa)', () => {
  it('"conversion-con-perdida" menciona AMBOS tipos (origen Y destino)', () => {
    const texto = textosProblemas['conversion-con-perdida']({ origen: 'double', destino: 'int' });
    expect(texto).toContain('double');
    expect(texto).toContain('int');
  });

  it('"operandos-invalidos-operador-binario" menciona el operador real', () => {
    const texto = textosProblemas['operandos-invalidos-operador-binario']({
      operador: '-',
      izquierda: 'String',
      derecha: 'int',
    });
    expect(texto).toContain('-');
  });
});

// Sub-lote 1-D2c (REQ-SUB-005/007, task_c0cf2e6c): los 3 códigos nuevos de la biblioteca conectada
// a la atribución — "clase"/"nombre" (y "argumentos") identifican el receptor real, nunca un
// nombre suelto inventado.
describe('textosProblemas — biblioteca conectada a la atribución (sub-lote 1-D2c)', () => {
  it('"campo-no-declarado" menciona la CLASE y el nombre del campo que no existe', () => {
    const texto = textosProblemas['campo-no-declarado']({ clase: 'Math', nombre: 'PIE' });
    expect(texto).toContain('Math');
    expect(texto).toContain('PIE');
  });

  it('"miembro-no-declarado" menciona la CLASE y el nombre del método que no existe', () => {
    const texto = textosProblemas['miembro-no-declarado']({ clase: 'String', nombre: 'lenght' });
    expect(texto).toContain('String');
    expect(texto).toContain('lenght');
  });

  it('"sin-sobrecarga-aplicable" menciona clase, método y CADA tipo de argumento real', () => {
    const texto = textosProblemas['sin-sobrecarga-aplicable']({
      clase: 'Math',
      nombre: 'max',
      argumentos: ['String', 'int'],
    });
    expect(texto).toContain('Math');
    expect(texto).toContain('max');
    expect(texto).toContain('String');
    expect(texto).toContain('int');
  });
});

// Tarea 1.32 (F5): un método que no devuelve nada (`void`) usado como valor. La frase nombra la llamada CONCRETA que escribió el
// alumno y explica por qué no se puede usar como un número o un texto.
describe('textosProblemas — un método sin valor de retorno usado como valor (F5, tarea 1.32)', () => {
  it('"llamada-sin-valor" nombra la llamada y dice que no devuelve ningún valor', () => {
    const texto = textosProblemas['llamada-sin-valor']({ llamada: 'System.out.print' });
    expect(texto).toBe('`System.out.print(...)` no devuelve ningún valor, así que no puedes usarlo como si fuera un número o un texto.');
  });

  it('triangulación: con otra llamada (`sc.close`) la frase cambia con ella', () => {
    expect(textosProblemas['llamada-sin-valor']({ llamada: 'sc.close' })).toContain('`sc.close(...)` no devuelve ningún valor');
  });
});

// Tarea 1.32 (F2): un miembro de un valor primitivo. Con el nombre de la variable el texto la nombra («`n.length`»); sin él (un
// literal, el resultado de una operación) señala el miembro que sobra.
describe('textosProblemas — un miembro de un valor primitivo (F2, tarea 1.32)', () => {
  it('CON receptor: nombra la variable, su tipo y lo que intentó escribir', () => {
    expect(textosProblemas['miembro-de-primitivo']({ tipo: 'int', nombre: 'length', receptor: 'n' })).toBe(
      '`n` es de tipo `int`, un tipo primitivo: no tiene métodos ni campos, así que no puedes escribir `n.length`. Solo los objetos, como un `String`, los tienen.',
    );
  });

  it('SIN receptor (un literal o una operación): señala el `.miembro` que sobra y el tipo del valor', () => {
    expect(textosProblemas['miembro-de-primitivo']({ tipo: 'long', nombre: 'foo' })).toBe(
      'Un valor de tipo `long` es primitivo: no tiene métodos ni campos, así que no puedes escribir `.foo` después de él. Solo los objetos, como un `String`, los tienen.',
    );
  });

  it('triangulación: el caso de una variable que tapa a `System` se lee como lo que es (`System.out` sobre un `int`)', () => {
    expect(textosProblemas['miembro-de-primitivo']({ tipo: 'int', nombre: 'out', receptor: 'System' })).toContain('`System` es de tipo `int`');
  });
});

// Tarea 1.32 (F1): un cast que Java rechaza. La frase describe el valor de origen, nombra el tipo de destino y, cuando hay una salida
// dentro del subconjunto (REQ-SUB-005: `Integer.parseInt`, `Double.parseDouble`, `String.valueOf`, `charAt`), la sugiere.
describe('textosProblemas — un cast que Java rechaza (F1, tarea 1.32)', () => {
  it.each([
    [
      'String', 'int',
      'No puedes convertir un texto (`String`) en `int` con un cast. Para leer un número escrito como texto usa `Integer.parseInt(...)`.',
    ],
    [
      'String', 'double',
      'No puedes convertir un texto (`String`) en `double` con un cast. Para leer un número escrito como texto usa `Double.parseDouble(...)`.',
    ],
    [
      'String', 'char',
      'No puedes convertir un texto (`String`) en `char` con un cast. Para tomar una letra de un texto usa `charAt(...)`, por ejemplo `texto.charAt(0)`.',
    ],
    [
      'int', 'String',
      'No puedes convertir un número entero (`int`) en `String` con un cast. Para convertirlo en texto usa `String.valueOf(...)`.',
    ],
    [
      'boolean', 'int',
      'No puedes convertir un valor `boolean` en `int` con un cast. `true` y `false` no son números en Java: si necesitas un número según una condición, usa un `if`.',
    ],
    [
      'int', 'boolean',
      'No puedes convertir un número entero (`int`) en `boolean` con un cast. En Java un número nunca es verdadero o falso: compáralo con algo, por ejemplo `numero != 0`.',
    ],
    ['Scanner', 'Random', 'No puedes convertir un `Scanner` en `Random` con un cast: Java no considera compatibles esos dos tipos.'],
    ['String', 'long', 'No puedes convertir un texto (`String`) en `long` con un cast: Java no considera compatibles esos dos tipos.'],
  ] as const)('(%s) → (%s)', (origen, destino, esperado) => {
    expect(textosProblemas['cast-invalido']({ origen, destino })).toBe(esperado);
  });

  it('los 44 pares que javac rechaza se leen bien: frase completa, sin restos y con el tipo de origen y el de destino', () => {
    const TIPOS = ['int', 'long', 'double', 'char', 'boolean', 'String', 'Scanner', 'Random'] as const;
    const NUMERICOS = new Set(['int', 'long', 'double', 'char']);
    const rechazados = TIPOS.flatMap((origen) =>
      TIPOS.filter((destino) => !(origen === destino || (NUMERICOS.has(origen) && NUMERICOS.has(destino)))).map((destino) => [origen, destino] as const),
    );
    expect(rechazados).toHaveLength(44);
    for (const [origen, destino] of rechazados) {
      const texto = textosProblemas['cast-invalido']({ origen, destino });
      expect(texto, `${origen} → ${destino}`).toMatch(/^No puedes convertir .+ con un cast[.:] /);
      expect(texto, `${origen} → ${destino}`).toContain(`\`${origen}\``);
      expect(texto, `${origen} → ${destino}`).toContain(`en \`${destino}\``);
      expect(texto, `${origen} → ${destino}`).not.toMatch(/undefined|\[object Object\]|\{[a-zA-Z]/);
    }
  });
});

// Tarea 1.32 (F4): una etiqueta de `case` de otro tipo que el selector, y un segundo `default`.
describe('textosProblemas — etiquetas de `switch` (F4, tarea 1.32)', () => {
  it('"etiqueta-de-case-de-otro-tipo" nombra el tipo del `case` y el del `switch`', () => {
    expect(textosProblemas['etiqueta-de-case-de-otro-tipo']({ etiqueta: 'String', selector: 'int' })).toBe(
      'Este `case` es de tipo `String`, pero el `switch` compara valores de tipo `int`: cada `case` debe ser del mismo tipo que el valor del `switch`.',
    );
  });

  it('triangulación: otro par de tipos cambia la frase con él', () => {
    expect(textosProblemas['etiqueta-de-case-de-otro-tipo']({ etiqueta: 'int', selector: 'String' })).toContain('es de tipo `int`');
    expect(textosProblemas['etiqueta-de-case-de-otro-tipo']({ etiqueta: 'int', selector: 'String' })).toContain('de tipo `String`');
  });

  it('un `case` numérico que no cabe en el `char` del `switch` se explica con el rango de `char` (`case 70000:`, `case -1:`)', () => {
    expect(textosProblemas['etiqueta-de-case-de-otro-tipo']({ etiqueta: 'int', selector: 'char' })).toBe(
      'Este `case` es un número (`int`) que no cabe en un `char`: el `switch` compara caracteres, y un `case` con un número solo sirve si cabe en un `char` (de 0 a 65535).',
    );
  });

  it('"etiqueta-default-duplicada" dice que solo puede haber un `default`', () => {
    expect(textosProblemas['etiqueta-default-duplicada']({})).toBe('Ya hay un `default` más arriba en este `switch`: solo puede haber uno.');
  });
});

// Tarea 1.32 (F6): un método de instancia llamado con el nombre de la clase.
describe('textosProblemas — un método de instancia llamado con el nombre de la clase (F6, tarea 1.32)', () => {
  it('nombra la llamada equivocada y explica que se llama sobre una variable de ese tipo', () => {
    expect(textosProblemas['metodo-de-instancia-sin-objeto']({ clase: 'String', nombre: 'trim' })).toBe(
      '`String.trim(...)` no funciona: `trim()` se llama sobre una variable de tipo `String` (por ejemplo, `variable.trim(...)`), no sobre el nombre de la clase.',
    );
  });

  it('triangulación: con otra clase y otro método la frase cambia con ellos', () => {
    const texto = textosProblemas['metodo-de-instancia-sin-objeto']({ clase: 'Scanner', nombre: 'nextInt' });
    expect(texto).toContain('`Scanner.nextInt(...)`');
    expect(texto).toContain('variable de tipo `Scanner`');
  });
});
