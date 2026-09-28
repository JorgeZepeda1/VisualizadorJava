// RED de la tarea 1.8 (conversiones — JLS 5.1.2/15.12.2, fase 1 "invocación estricta": identidad
// + ensanchamiento primitivo + ensanchamiento de referencia; SIN boxing/unboxing ni varargs —
// nuestro subconjunto nunca produce un valor de tipo envuelto, así que la fase 1 basta, ver
// engram). `esConvertiblePorEnsanchamiento` compara tipos NUESTROS (`Tipo`) contra el nombre de
// parámetro tal como lo da la reflexión real del JDK (`java.lang.String`, `int`, `double`…).
import { describe, expect, it } from 'vitest';
import { esConvertiblePorEnsanchamiento, esConvertiblePorInvocacionLaxa } from './conversiones.ts';

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
