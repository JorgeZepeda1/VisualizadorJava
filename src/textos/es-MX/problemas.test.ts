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
