// RED de la tarea 1.16 (Mutantes contra veredictos de javac, REQ-DIFF-006, criterio C7,
// sub-lote 1-D3). Este archivo prueba SOLO la parte PURA (sin JDK, sin proceso hijo): el
// tokenizador para mutación, el generador seudoaleatorio con semilla fija (determinismo real —
// design.md §7.4: "con semilla fija"), y cada uno de los 9 tipos de mutación de un solo token
// (borrar, duplicar, intercambiar vecinos, cambiar operador/identificador/tipo/literal, quitar/
// poner puntuación `; { } ( )`). La integración real contra `CompiladorEnLote.java` (JDK real)
// vive en `pruebas/compilacion/mutantes.test.ts` (proyecto `oraculo`, compara contra
// `corpus/mutantes/veredictos.jsonl`).
import { describe, expect, it } from 'vitest';
import {
  aplicarMutacion,
  crearGeneradorConSemilla,
  generarMutantesDePrograma,
  tiposDeMutacion,
  tokenizarParaMutar,
  type TipoMutacion,
} from './mutantes.ts';

describe('tokenizarParaMutar (pura) — separa código (mutable) de espacio/comentarios (trivia, nunca se muta)', () => {
  it('un programa mínimo real produce segmentos que reconstruyen la fuente EXACTA al concatenarlos', () => {
    const fuente = 'public class A { public static void main(String[] a) { System.out.println(1); } }';
    const segmentos = tokenizarParaMutar(fuente);
    expect(segmentos.map((s) => s.texto).join('')).toBe(fuente);
  });

  it('clasifica un identificador real como "identificador" (no palabra clave, no tipo)', () => {
    const segmentos = tokenizarParaMutar('int total = 0;').filter((s) => s.tipo === 'token');
    const total = segmentos.find((s) => s.texto === 'total');
    expect(total).toMatchObject({ categoria: 'identificador' });
  });

  it('clasifica los 8 tipos del subconjunto como "tipo" (int/long/double/boolean/char/String/Scanner/Random)', () => {
    const fuente = 'int a; long b; double c; boolean d; char e; String f; Scanner g; Random h;';
    const tokens = tokenizarParaMutar(fuente).filter((s) => s.tipo === 'token');
    for (const nombre of ['int', 'long', 'double', 'boolean', 'char', 'String', 'Scanner', 'Random']) {
      const encontrado = tokens.find((s) => s.texto === nombre);
      expect(encontrado, `falta clasificar "${nombre}"`).toMatchObject({ categoria: 'tipo' });
    }
  });

  it('triangulación: distingue literal-entero, literal-largo, literal-doble, literal-caracter, literal-cadena y literal-booleano', () => {
    const fuente = "int a = 5; long b = 5L; double c = 5.5; char d = 'x'; String e = \"hola\"; boolean f = true;";
    const tokens = tokenizarParaMutar(fuente).filter((s) => s.tipo === 'token');
    expect(tokens.find((s) => s.texto === '5')).toMatchObject({ categoria: 'literal-entero' });
    expect(tokens.find((s) => s.texto === '5L')).toMatchObject({ categoria: 'literal-largo' });
    expect(tokens.find((s) => s.texto === '5.5')).toMatchObject({ categoria: 'literal-doble' });
    expect(tokens.find((s) => s.texto === "'x'")).toMatchObject({ categoria: 'literal-caracter' });
    expect(tokens.find((s) => s.texto === '"hola"')).toMatchObject({ categoria: 'literal-cadena' });
    expect(tokens.find((s) => s.texto === 'true')).toMatchObject({ categoria: 'literal-booleano' });
  });

  it('una cadena con espacio interno no se parte en dos segmentos (la comilla delimita, no el espacio)', () => {
    const segmentos = tokenizarParaMutar('String s = "hola mundo";').filter((s) => s.tipo === 'token');
    expect(segmentos.some((s) => s.texto === '"hola mundo"')).toBe(true);
  });

  it('reconoce operadores de 2 caracteres como UN solo segmento, nunca partidos ("==" no es "=" + "=")', () => {
    const segmentos = tokenizarParaMutar('if (x == 1) { }').filter((s) => s.tipo === 'token');
    expect(segmentos.some((s) => s.texto === '==' && s.categoria === 'operador')).toBe(true);
    expect(segmentos.some((s) => s.texto === '=')).toBe(false);
  });

  it('un comentario de línea y uno de bloque son "trivia" (nunca "token") -- nunca se mutan', () => {
    const segmentos = tokenizarParaMutar('int x = 1; // comentario\n/* bloque */ int y = 2;');
    const trivia = segmentos.filter((s) => s.tipo === 'trivia').map((s) => s.texto);
    expect(trivia.some((t) => t.includes('// comentario'))).toBe(true);
    expect(trivia.some((t) => t.includes('/* bloque */'))).toBe(true);
  });
});

describe('crearGeneradorConSemilla (pura) — PRNG determinista (design.md §7.4: "con semilla fija")', () => {
  it('la MISMA semilla produce la MISMA secuencia', () => {
    const secuenciaDe = (semilla: number) => {
      const siguiente = crearGeneradorConSemilla(semilla);
      return [siguiente(), siguiente(), siguiente(), siguiente(), siguiente()];
    };
    expect(secuenciaDe(42)).toEqual(secuenciaDe(42));
  });

  it('triangulación: semillas DISTINTAS producen secuencias distintas', () => {
    const siguienteA = crearGeneradorConSemilla(1);
    const siguienteB = crearGeneradorConSemilla(2);
    expect(siguienteA()).not.toBe(siguienteB());
  });

  it('cada valor cae en [0, 1) -- nunca fuera de rango (para usarlo como índice/selector)', () => {
    const siguiente = crearGeneradorConSemilla(7);
    for (let i = 0; i < 50; i += 1) {
      const valor = siguiente();
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(1);
    }
  });
});

describe('tiposDeMutacion (dato) — los 9 tipos del diseño (design.md §7.4)', () => {
  it('incluye exactamente los 9 tipos documentados, sin duplicados', () => {
    const esperados: readonly TipoMutacion[] = [
      'borrar',
      'duplicar',
      'intercambiar-vecinos',
      'cambiar-operador',
      'cambiar-identificador',
      'cambiar-tipo',
      'cambiar-literal',
      'quitar-puntuacion',
      'poner-puntuacion',
    ];
    expect(new Set(tiposDeMutacion)).toEqual(new Set(esperados));
    expect(tiposDeMutacion).toHaveLength(9);
  });
});

describe('aplicarMutacion (pura) — cada tipo, sobre un programa real conocido', () => {
  const fuente = 'public class A { public static void main(String[] a) { int total = 5; if (total == 5) { total = total + 1; } } }';

  it('"borrar" quita el texto del token elegido -- la fuente resultante es más corta', () => {
    const segmentos = tokenizarParaMutar(fuente);
    const indice = segmentos.findIndex((s) => s.tipo === 'token' && s.texto === 'total');
    const resultado = aplicarMutacion(segmentos, indice, 'borrar');
    expect(resultado.aplicada).toBe(true);
    expect(resultado.fuente.length).toBeLessThan(fuente.length);
    expect(resultado.fuente).not.toBe(fuente);
  });

  it('"duplicar" repite el texto del token elegido -- la fuente resultante es más larga', () => {
    const segmentos = tokenizarParaMutar(fuente);
    const indice = segmentos.findIndex((s) => s.tipo === 'token' && s.texto === 'total');
    const resultado = aplicarMutacion(segmentos, indice, 'duplicar');
    expect(resultado.aplicada).toBe(true);
    expect(resultado.fuente.length).toBeGreaterThan(fuente.length);
  });

  it('"intercambiar-vecinos" cambia el orden de dos tokens consecutivos, longitud igual', () => {
    const segmentos = tokenizarParaMutar(fuente);
    const indice = segmentos.findIndex((s) => s.tipo === 'token' && s.texto === 'total');
    const resultado = aplicarMutacion(segmentos, indice, 'intercambiar-vecinos');
    expect(resultado.aplicada).toBe(true);
    expect(resultado.fuente).not.toBe(fuente);
    expect(resultado.fuente.length).toBe(fuente.length);
  });

  it('"cambiar-operador" en un token "==" lo reemplaza por OTRO operador real, nunca el mismo', () => {
    const segmentos = tokenizarParaMutar(fuente);
    const indice = segmentos.findIndex((s) => s.tipo === 'token' && s.texto === '==');
    const resultado = aplicarMutacion(segmentos, indice, 'cambiar-operador');
    expect(resultado.aplicada).toBe(true);
    expect(resultado.fuente).not.toBe(fuente);
  });

  it('triangulación: "cambiar-operador" en un token que NO es operador (p. ej. un identificador) no se aplica', () => {
    const segmentos = tokenizarParaMutar(fuente);
    const indice = segmentos.findIndex((s) => s.tipo === 'token' && s.texto === 'total');
    const resultado = aplicarMutacion(segmentos, indice, 'cambiar-operador');
    expect(resultado.aplicada).toBe(false);
  });

  it('"cambiar-identificador" en la PRIMERA "total" la reemplaza por OTRO identificador REAL del mismo programa (nunca inventado) -- mutación de UN SOLO token, las demás "total" quedan intactas', () => {
    const segmentos = tokenizarParaMutar(fuente);
    const indice = segmentos.findIndex((s) => s.tipo === 'token' && s.texto === 'total');
    const resultado = aplicarMutacion(segmentos, indice, 'cambiar-identificador');
    expect(resultado.aplicada).toBe(true);
    expect(resultado.fuente).not.toBe(fuente);
    // El token reconstruido en ESA posición ya no es "total" -- verificado retokenizando el
    // resultado y mirando la MISMA posición de la lista (un solo token cambió, el resto no).
    const segmentosResultado = tokenizarParaMutar(resultado.fuente);
    expect(segmentosResultado[indice]).toMatchObject({ categoria: 'identificador' });
    expect(segmentosResultado[indice]?.texto).not.toBe('total');
    // El resto de las apariciones de "total" (3 de las 4 originales) siguen intactas -- prueba
    // real de que la mutación tocó UN SOLO token, no un renombrado global.
    const ocurrenciasRestantes = (resultado.fuente.match(/\btotal\b/g) ?? []).length;
    expect(ocurrenciasRestantes).toBe(3);
  });

  it('"cambiar-tipo" en "int" lo reemplaza por OTRO tipo del subconjunto (nunca fuera de alcance)', () => {
    const segmentos = tokenizarParaMutar(fuente);
    const indice = segmentos.findIndex((s) => s.tipo === 'token' && s.texto === 'int');
    const resultado = aplicarMutacion(segmentos, indice, 'cambiar-tipo');
    expect(resultado.aplicada).toBe(true);
    const tiposValidos = ['int', 'long', 'double', 'boolean', 'char', 'String', 'Scanner', 'Random'];
    const nuevoTexto = tokenizarParaMutar(resultado.fuente).find((s, i, arr) => {
      void arr;
      return i === indice;
    });
    expect(nuevoTexto && tiposValidos.includes(nuevoTexto.texto)).toBe(true);
    expect(nuevoTexto?.texto).not.toBe('int');
  });

  it('"cambiar-literal" en "5" (entero) lo reemplaza por OTRO literal entero válido, nunca octal/hex', () => {
    const segmentos = tokenizarParaMutar(fuente);
    const indice = segmentos.findIndex((s) => s.tipo === 'token' && s.texto === '5' && s.categoria === 'literal-entero');
    const resultado = aplicarMutacion(segmentos, indice, 'cambiar-literal');
    expect(resultado.aplicada).toBe(true);
    expect(resultado.fuente).not.toBe(fuente);
    expect(resultado.fuente).not.toMatch(/\b0[0-7]+\b/); // nunca produce una forma que parezca octal
  });

  it('"quitar-puntuacion" en un ";" real lo borra', () => {
    const segmentos = tokenizarParaMutar(fuente);
    const indice = segmentos.findIndex((s) => s.tipo === 'token' && s.texto === ';');
    const resultado = aplicarMutacion(segmentos, indice, 'quitar-puntuacion');
    expect(resultado.aplicada).toBe(true);
    expect(resultado.fuente.length).toBe(fuente.length - 1);
  });

  it('triangulación: "quitar-puntuacion" en un token que NO es puntuación (p. ej. un identificador) no se aplica', () => {
    const segmentos = tokenizarParaMutar(fuente);
    const indice = segmentos.findIndex((s) => s.tipo === 'token' && s.texto === 'total');
    const resultado = aplicarMutacion(segmentos, indice, 'quitar-puntuacion');
    expect(resultado.aplicada).toBe(false);
  });

  it('"poner-puntuacion" inserta un carácter extra de "; { } ( )" junto al token elegido', () => {
    const segmentos = tokenizarParaMutar(fuente);
    const indice = segmentos.findIndex((s) => s.tipo === 'token' && s.texto === 'total');
    const resultado = aplicarMutacion(segmentos, indice, 'poner-puntuacion');
    expect(resultado.aplicada).toBe(true);
    expect(resultado.fuente.length).toBe(fuente.length + 1);
  });
});

describe('generarMutantesDePrograma (pura, determinista) — genera N mutantes distintos de UN solo token', () => {
  const fuente = 'public class A { public static void main(String[] a) { int total = 5; if (total == 5) { total = total + 1; } } }';

  it('genera exactamente la cantidad pedida (cuando hay suficientes posiciones aplicables)', () => {
    const mutantes = generarMutantesDePrograma(fuente, 'A.java', 20, 12345);
    expect(mutantes).toHaveLength(20);
  });

  it('cada mutante trae id único, referencia a "base" y "mutacion", y una fuente DISTINTA de la original', () => {
    const mutantes = generarMutantesDePrograma(fuente, 'A.java', 10, 1);
    const ids = new Set(mutantes.map((m) => m.id));
    expect(ids.size).toBe(mutantes.length); // ids únicos
    for (const mutante of mutantes) {
      expect(mutante.base).toBe('A.java');
      expect(tiposDeMutacion).toContain(mutante.mutacion);
      expect(mutante.fuente).not.toBe(fuente);
    }
  });

  it('determinismo real: la MISMA semilla sobre el MISMO programa da la MISMA lista de mutantes', () => {
    const a = generarMutantesDePrograma(fuente, 'A.java', 15, 999);
    const b = generarMutantesDePrograma(fuente, 'A.java', 15, 999);
    expect(a).toEqual(b);
  });

  it('triangulación: dos mutantes cualesquiera de la lista son fuentes DISTINTAS entre sí (dedup real)', () => {
    const mutantes = generarMutantesDePrograma(fuente, 'A.java', 15, 55);
    const fuentesUnicas = new Set(mutantes.map((m) => m.fuente));
    expect(fuentesUnicas.size).toBe(mutantes.length);
  });
});
