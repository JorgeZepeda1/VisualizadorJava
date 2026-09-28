// RED de la tarea 1.8 (Catálogo de biblioteca reconocida, REQ-SUB-005/007). `clasificarMiembro`
// distingue las 3 categorías reales sobre el catálogo generado por el oráculo (tarea 1.9, ADR
// 010): 'soportado' (REQ-SUB-005), 'existe-no-soportado' (REQ-SUB-007: el miembro es real en el
// JDK pero fuera de esta versión) y 'no-existe' (ni siquiera es un miembro real — typo del
// alumno). Los 3 ejemplos de "existe pero no soportado" son los que da el propio RED de la tarea.
import { describe, expect, it } from 'vitest';
import { CONSTRUCTORES_SOPORTADOS, clasificarCampo, clasificarMetodo, clasificarMiembro, MIEMBROS_SOPORTADOS } from './catalogo-api.ts';
import { FIRMAS_JDK } from '../biblioteca/datos/firmas-jdk.generado.ts';

describe('clasificarMiembro — "existe pero no soportado" (REQ-SUB-007, los 3 ejemplos del RED de 1.8)', () => {
  it('String.split existe en el JDK pero no está en la superficie soportada (REQ-SUB-005)', () => {
    expect(clasificarMiembro('String', 'split')).toBe('existe-no-soportado');
  });

  it('Math.sin existe pero no está soportado (trascendentes, REQ-SUB-007)', () => {
    expect(clasificarMiembro('Math', 'sin')).toBe('existe-no-soportado');
  });

  it('Scanner.hasNextInt existe pero no está soportado (REQ-SUB-007)', () => {
    expect(clasificarMiembro('Scanner', 'hasNextInt')).toBe('existe-no-soportado');
  });
});

describe('clasificarMiembro — "soportado" (REQ-SUB-005)', () => {
  it.each([
    ['Math', 'round'],
    ['Math', 'abs'],
    ['String', 'length'],
    ['Scanner', 'nextInt'],
    ['Character', 'isDigit'],
    ['Integer', 'parseInt'],
  ] as const)('%s.%s', (clase, nombre) => {
    expect(clasificarMiembro(clase, nombre)).toBe('soportado');
  });
});

describe('clasificarMiembro — "no existe" (ni siquiera es un miembro real del JDK)', () => {
  it('un nombre inventado no es ni soportado ni "existe-no-soportado"', () => {
    expect(clasificarMiembro('Math', 'sqrtDeUnaCosaQueNoExiste')).toBe('no-existe');
  });

  it('triangulación: un error de dedo común (typo de "length")', () => {
    expect(clasificarMiembro('String', 'lenght')).toBe('no-existe');
  });

  it('Long.parseLong existe en el JDK pero NUNCA está soportado aquí (REQ-SUB-002 lo excluye explícitamente)', () => {
    expect(clasificarMiembro('Long', 'parseLong')).toBe('existe-no-soportado');
  });
});

// Sub-lote 1-D2c (hueco flageado por 1-D2b: `sobrecargas.ts`/`catalogo-api.ts` nunca se conectaron
// a `atribucion.ts`). `clasificarMiembro` es genero-AGNÓSTICO (mezcla campos y métodos con el
// mismo nombre) -- correcto para el uso de 1.8 (probar EXISTENCIA de "Clase.miembro" sin importar
// cuál), pero INSUFICIENTE para atribución real: javac resuelve campos y métodos en espacios de
// nombres SEPARADOS (JLS 6.5.6.1 vs 6.5.6.2) -- un método usado SIN paréntesis ("s.length", con
// "length" solo definido como MÉTODO) da "cannot find symbol: variable length", y un CAMPO llamado
// como si fuera método ("Math.PI()") da "cannot find symbol: method PI()", AMBOS "no existe" pese
// a que `clasificarMiembro` (genero-agnóstico) diría "soportado" para los dos. Verificado contra
// javac 17 real (carpeta temporal, borrada):
//   javac: "CampoComoValor.java:4: error: cannot find symbol\n symbol: variable length\n location: variable s of type String"
//   javac: "MetodoComoCampo.java:3: error: cannot find symbol\n symbol: method PI()\n location: class Math"
describe('clasificarMetodo — genero-aware (JLS 6.5.6.2): un CAMPO no cuenta como método real', () => {
  it('Math.PI existe como CAMPO pero NUNCA como método -- "no-existe" para una llamada Math.PI() (verificado: cannot find symbol: method PI())', () => {
    expect(clasificarMetodo('Math', 'PI')).toBe('no-existe');
  });

  it('control: Math.round SÍ es un método real -- "soportado" sin cambios', () => {
    expect(clasificarMetodo('Math', 'round')).toBe('soportado');
  });

  it('triangulación: Math.sin es un método real pero fuera de REQ-SUB-005 -- "existe-no-soportado"', () => {
    expect(clasificarMetodo('Math', 'sin')).toBe('existe-no-soportado');
  });
});

describe('clasificarCampo — genero-aware (JLS 6.5.6.1): un MÉTODO no cuenta como campo real', () => {
  it('String.length existe como MÉTODO pero NUNCA como campo -- "no-existe" para un acceso s.length sin paréntesis (verificado: cannot find symbol: variable length)', () => {
    expect(clasificarCampo('String', 'length')).toBe('no-existe');
  });

  it('control: Math.PI SÍ es un campo real -- "soportado" sin cambios', () => {
    expect(clasificarCampo('Math', 'PI')).toBe('soportado');
  });

  it('triangulación: Integer.SIZE es un campo real pero fuera de REQ-SUB-005 -- "existe-no-soportado" (verificado: javac compila Integer.SIZE limpio)', () => {
    expect(clasificarCampo('Integer', 'SIZE')).toBe('existe-no-soportado');
  });
});

// Sub-lote 1-D3 (JLS 15.9, REQ-SUB-005): a diferencia de MIEMBROS_SOPORTADOS (granularidad de
// NOMBRE), un constructor necesita granularidad de FIRMA -- REQ-SUB-005 es explícito: "un único
// new Scanner(System.in)", "new String(texto)". Verificado contra javac 17 real: "new
// Scanner(\"texto\")" SÍ compila (Scanner.Scanner(String) es un constructor real) pero está fuera
// del subconjunto -- por eso NO puede bastar con "¿Scanner tiene ALGÚN constructor soportado?".
describe('CONSTRUCTORES_SOPORTADOS (JLS 15.9, sub-lote 1-D3) — granularidad de FIRMA, no de nombre', () => {
  it('Scanner(InputStream) — la firma real de "new Scanner(System.in)" — está soportada', () => {
    expect(CONSTRUCTORES_SOPORTADOS.has('Scanner(java.io.InputStream)')).toBe(true);
  });

  it('triangulación: Scanner(String) — real en el JDK, pero FUERA de REQ-SUB-005 — NO está soportada', () => {
    expect(CONSTRUCTORES_SOPORTADOS.has('Scanner(java.lang.String)')).toBe(false);
  });

  it('Random() y Random(long) — las 2 únicas firmas reales de Random — ambas soportadas', () => {
    expect(CONSTRUCTORES_SOPORTADOS.has('Random()')).toBe(true);
    expect(CONSTRUCTORES_SOPORTADOS.has('Random(long)')).toBe(true);
  });

  it('String(String) — "new String(texto)" — soportada; String(char[]) NO (fuera de REQ-SUB-005)', () => {
    expect(CONSTRUCTORES_SOPORTADOS.has('String(java.lang.String)')).toBe(true);
    expect(CONSTRUCTORES_SOPORTADOS.has('String(char[])')).toBe(false);
  });

  it('cada clave corresponde a una firma REAL de FIRMAS_JDK (nunca inventada)', () => {
    const sinCorrespondencia = [...CONSTRUCTORES_SOPORTADOS].filter((clave) => {
      const coincidencia = /^(\w+)\((.*)\)$/.exec(clave);
      if (coincidencia === null) return true;
      const [, clase, parametrosTexto] = coincidencia as unknown as [string, string, string];
      const parametros = parametrosTexto === '' ? [] : parametrosTexto.split(',');
      return !FIRMAS_JDK.some(
        (f) =>
          f.clase === clase &&
          f.nombre === '<init>' &&
          f.parametros.length === parametros.length &&
          f.parametros.every((p, i) => p === parametros[i]),
      );
    });
    expect(sinCorrespondencia).toEqual([]);
  });
});

describe('MIEMBROS_SOPORTADOS — cada entrada corresponde a un miembro REAL del catálogo del oráculo (nunca inventado)', () => {
  it('ninguna entrada de la lista blanca es un nombre que el JDK real no tenga', () => {
    const sinCorrespondencia = [...MIEMBROS_SOPORTADOS].filter((clave) => {
      const separador = clave.indexOf('.');
      const clase = clave.slice(0, separador);
      const nombre = clave.slice(separador + 1);
      return !FIRMAS_JDK.some((f) => f.clase === clase && f.nombre === nombre);
    });
    expect(sinCorrespondencia).toEqual([]);
  });
});
