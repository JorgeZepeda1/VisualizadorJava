// RED de la tarea 1.8 (conversiones — JLS 5.1.2/15.12.2, fase 1 "invocación estricta": identidad
// + ensanchamiento primitivo + ensanchamiento de referencia; SIN boxing/unboxing ni varargs —
// nuestro subconjunto nunca produce un valor de tipo envuelto, así que la fase 1 basta, ver
// engram). `esConvertiblePorEnsanchamiento` compara tipos NUESTROS (`Tipo`) contra el nombre de
// parámetro tal como lo da la reflexión real del JDK (`java.lang.String`, `int`, `double`…).
import { describe, expect, it } from 'vitest';
import { esConvertiblePorEnsanchamiento, esConvertiblePorInvocacionLaxa, esSubtipoDeReferencia } from './conversiones.ts';

describe('esConvertiblePorEnsanchamiento — identidad', () => {
  it.each([
    ['int', 'int'],
    ['double', 'double'],
    ['char', 'char'],
    ['boolean', 'boolean'],
    ['String', 'java.lang.String'],
  ] as const)('%s -> %s es aplicable (identidad)', (origen, destino) => {
    expect(esConvertiblePorEnsanchamiento(origen, destino)).toBe(true);
  });
});

describe('esConvertiblePorEnsanchamiento — ensanchamiento primitivo real (JLS 5.1.2)', () => {
  it.each([
    ['char', 'int'],
    ['char', 'double'],
    ['int', 'long'],
    ['int', 'double'],
    ['long', 'float'],
    ['long', 'double'],
  ] as const)('%s ensancha a %s', (origen, destino) => {
    expect(esConvertiblePorEnsanchamiento(origen, destino)).toBe(true);
  });

  it('triangulación negativa: double NO se angosta a int (dirección inversa, nunca aplicable sin cast)', () => {
    expect(esConvertiblePorEnsanchamiento('double', 'int')).toBe(false);
  });

  it('triangulación negativa: boolean nunca ensancha a ningún tipo numérico', () => {
    expect(esConvertiblePorEnsanchamiento('boolean', 'int')).toBe(false);
  });
});

describe('esConvertiblePorEnsanchamiento — ensanchamiento de referencia (String -> Object, JAMÁS al revés)', () => {
  it('String es aplicable a un parámetro Object (println(Object) es candidato real de String)', () => {
    expect(esConvertiblePorEnsanchamiento('String', 'java.lang.Object')).toBe(true);
  });

  it('triangulación negativa: un primitivo NUNCA ensancha a Object sin boxing (fase 1 no lo permite)', () => {
    expect(esConvertiblePorEnsanchamiento('int', 'java.lang.Object')).toBe(false);
  });
});

// Corrección obligatoria (sub-lote 1-C2, orquestador): JLS 15.12.2 fase 2 ("invocación laxa") —
// boxing primitivo, restringido a los 5 envoltorios que el subconjunto puede producir como
// argumento (int/double/char/boolean/long). Nunca unboxing (este subconjunto no tiene variables de
// tipo envuelto que desempaquetar, REQ-SUB-007) ni un envoltorio "adivinado" para String/Scanner/
// Random (ya son de referencia, `esConvertiblePorEnsanchamiento` los cubre si aplica).
describe('esConvertiblePorInvocacionLaxa — fase 2 JLS 15.12.2: boxing primitivo (corrección 1-C2)', () => {
  it.each([
    ['int', 'java.lang.Integer'],
    ['double', 'java.lang.Double'],
    ['char', 'java.lang.Character'],
    ['boolean', 'java.lang.Boolean'],
    ['long', 'java.lang.Long'],
  ] as const)('%s empaqueta a su envoltorio real %s', (origen, envoltorio) => {
    expect(esConvertiblePorInvocacionLaxa(origen, envoltorio)).toBe(true);
  });

  it('boxing seguido de ensanchamiento de referencia (JLS 5.3): int boxea a Integer y ENSANCHA a Object', () => {
    // El mismo caso que la fase 1 rechaza (ver arriba, "triangulación negativa") — la fase 2 SÍ lo
    // permite: es justo la diferencia entre las dos fases.
    expect(esConvertiblePorInvocacionLaxa('int', 'java.lang.Object')).toBe(true);
  });

  it('la fase laxa incluye TODO lo de la fase estricta (nunca es más angosta)', () => {
    expect(esConvertiblePorInvocacionLaxa('int', 'long')).toBe(true);
    expect(esConvertiblePorInvocacionLaxa('String', 'java.lang.String')).toBe(true);
  });

  it('triangulación negativa: boolean NUNCA empaqueta a Integer (cada primitivo tiene un único envoltorio)', () => {
    expect(esConvertiblePorInvocacionLaxa('boolean', 'java.lang.Integer')).toBe(false);
  });

  it('triangulación negativa: String nunca "empaqueta" a nada (ya es de referencia; sin unboxing tampoco aplica)', () => {
    expect(esConvertiblePorInvocacionLaxa('String', 'java.lang.Integer')).toBe(false);
  });
});

// Tarea 1.29 (causa 4, agregada por el orquestador): hasta ahora el único ensanchamiento de
// referencia era `String -> Object`, escrito a mano. `String.contains(CharSequence)` y
// `String.replace(CharSequence, CharSequence)` (REQ-SUB-005) tienen como parámetro un SUPERTIPO
// de `String` que no es `Object`, así que `s.contains("ol")` daba «sin-sobrecarga-aplicable»
// para un programa que javac compila. JLS 5.1.5: un tipo de referencia ensancha a TODOS sus
// supertipos — la tabla sale del JDK real (`supertipos-jdk.generado.ts`, ADR 010), nunca de una
// lista escrita a mano.
describe('esSubtipoDeReferencia — supertipos REALES del JDK (JLS 4.10.2/5.1.5, tarea 1.29)', () => {
  it.each([
    ['java.lang.String', 'java.lang.CharSequence'],
    ['java.lang.String', 'java.lang.Comparable'],
    ['java.lang.String', 'java.io.Serializable'],
    ['java.lang.String', 'java.lang.Object'],
    ['java.util.Scanner', 'java.io.Closeable'],
    ['java.util.Scanner', 'java.util.Iterator'],
    ['java.lang.CharSequence', 'java.lang.Object'],
    ['java.lang.Integer', 'java.lang.Number'],
  ] as const)('%s es subtipo de %s', (subtipo, supertipo) => {
    expect(esSubtipoDeReferencia(subtipo, supertipo)).toBe(true);
  });

  it('un tipo es subtipo de sí mismo (reflexividad)', () => {
    expect(esSubtipoDeReferencia('java.util.Random', 'java.util.Random')).toBe(true);
  });

  it.each([
    ['java.lang.CharSequence', 'java.lang.String'],
    ['java.lang.String', 'java.lang.Number'],
    ['java.util.Scanner', 'java.lang.CharSequence'],
    ['java.lang.Character', 'java.lang.Number'],
  ] as const)('triangulación negativa: %s NO es subtipo de %s (nunca al revés, nunca entre ramas distintas)', (subtipo, supertipo) => {
    expect(esSubtipoDeReferencia(subtipo, supertipo)).toBe(false);
  });

  it('un nombre desconocido no es subtipo de nada, ni siquiera de Object (sin adivinar)', () => {
    expect(esSubtipoDeReferencia('com.inventado.Clase', 'java.lang.Object')).toBe(false);
  });
});

describe('esConvertiblePorEnsanchamiento — ensanchamiento de referencia GENERAL (JLS 5.1.5, tarea 1.29)', () => {
  it.each([
    ['String', 'java.lang.CharSequence'],
    ['String', 'java.lang.Comparable'],
    ['String', 'java.io.Serializable'],
    ['Scanner', 'java.io.Closeable'],
  ] as const)('%s es aplicable a un parámetro %s', (origen, destino) => {
    expect(esConvertiblePorEnsanchamiento(origen, destino)).toBe(true);
  });

  it('un argumento reflejado (System.out) ensancha a sus supertipos reales: PrintStream -> Appendable', () => {
    expect(esConvertiblePorEnsanchamiento({ reflejado: 'java.io.PrintStream' }, 'java.lang.Appendable')).toBe(true);
    expect(esConvertiblePorEnsanchamiento({ reflejado: 'java.io.InputStream' }, 'java.io.Closeable')).toBe(true);
  });

  it.each([
    ['String', 'java.lang.Number'],
    ['String', 'java.lang.StringBuilder'],
    ['Scanner', 'java.lang.CharSequence'],
    ['Random', 'java.lang.Comparable'],
  ] as const)('triangulación negativa: %s NO es aplicable a un parámetro %s', (origen, destino) => {
    expect(esConvertiblePorEnsanchamiento(origen, destino)).toBe(false);
  });

  it('triangulación negativa: un argumento reflejado (InputStream) NO ensancha a PrintStream (ramas distintas)', () => {
    expect(esConvertiblePorEnsanchamiento({ reflejado: 'java.io.InputStream' }, 'java.io.PrintStream')).toBe(false);
  });
});

describe('esConvertiblePorInvocacionLaxa — boxing y ensanchamiento general (JLS 5.3, tarea 1.29)', () => {
  it.each([
    ['int', 'java.lang.Number'],
    ['int', 'java.lang.Comparable'],
    ['double', 'java.lang.Number'],
    ['char', 'java.lang.Comparable'],
    ['boolean', 'java.io.Serializable'],
  ] as const)('%s boxea y ensancha a %s', (origen, destino) => {
    expect(esConvertiblePorInvocacionLaxa(origen, destino)).toBe(true);
  });

  it.each([
    ['char', 'java.lang.Number'],
    ['boolean', 'java.lang.Number'],
    ['int', 'java.lang.CharSequence'],
  ] as const)('triangulación negativa: %s NO boxea hacia %s (su envoltorio no desciende de él)', (origen, destino) => {
    expect(esConvertiblePorInvocacionLaxa(origen, destino)).toBe(false);
  });
});
