// RED de la tarea 1.8 (conversiones — JLS 5.1.2/15.12.2, fase 1 "invocación estricta": identidad
// + ensanchamiento primitivo + ensanchamiento de referencia; SIN boxing/unboxing ni varargs —
// nuestro subconjunto nunca produce un valor de tipo envuelto, así que la fase 1 basta, ver
// engram). `esConvertiblePorEnsanchamiento` compara tipos NUESTROS (`Tipo`) contra el nombre de
// parámetro tal como lo da la reflexión real del JDK (`java.lang.String`, `int`, `double`…).
import { describe, expect, it } from 'vitest';
import { esConvertiblePorEnsanchamiento } from './conversiones.ts';

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
