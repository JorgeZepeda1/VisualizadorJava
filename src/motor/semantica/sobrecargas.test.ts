// RED de la tarea 1.8 (Sobrecargas — JLS 15.12.2, REQ-BIB-004). `resolverSobrecarga(clase,
// nombre, tiposDeArgumentos)` recibe los tipos ESTÁTICOS reales de los argumentos (nuestro
// `Tipo`, nunca incluye 'float' como tipo de una expresión — no hay literales `float` en el
// subconjunto, REQ-SUB-007) y devuelve la `FirmaMiembro` real ganadora entre TODAS las
// sobrecargas reales de esa clase/miembro (1.9), o `null` si ninguna es aplicable.
//
// El caso insignia, verificado contra el JDK real (design.md §2.7, REQ-BIB-004): NO existe
// `Math.round(long)` — un argumento `long` ensancha a `float` Y a `double` (JLS 5.1.2), y
// `round(float)` es la MÁS ESPECÍFICA de las dos (float ensancha a double, nunca al revés) — por
// eso `Math.round(unLong)` da `int`, no `long`.
import { describe, expect, it } from 'vitest';
import { resolverSobrecarga } from './sobrecargas.ts';

describe('resolverSobrecarga — Math.round: coincidencias exactas', () => {
  it('round(double) -> long: coincidencia exacta con un argumento double', () => {
    expect(resolverSobrecarga('Math', 'round', ['double'])).toMatchObject({ parametros: ['double'], retorno: 'long' });
  });
});

describe('resolverSobrecarga — Math.round: el caso insignia de REQ-BIB-004 (más específico entre aplicables)', () => {
  it('un argumento "long" NO tiene round(long): resuelve a round(float) -> int, nunca a round(double)', () => {
    const firma = resolverSobrecarga('Math', 'round', ['long']);
    expect(firma).toMatchObject({ parametros: ['float'], retorno: 'int' });
  });

  it('triangulación: un argumento "int" también resuelve a round(float) -> int (mismo razonamiento)', () => {
    expect(resolverSobrecarga('Math', 'round', ['int'])).toMatchObject({ parametros: ['float'], retorno: 'int' });
  });

  it('triangulación: un argumento "char" también resuelve a round(float) -> int', () => {
    expect(resolverSobrecarga('Math', 'round', ['char'])).toMatchObject({ parametros: ['float'], retorno: 'int' });
  });
});

describe('resolverSobrecarga — Math.abs: "más específico" entre 4 sobrecargas reales', () => {
  it('Math.abs(char) resuelve a abs(int) -> int (design.md §2.7: "Math.abs(\'a\') es int")', () => {
    expect(resolverSobrecarga('Math', 'abs', ['char'])).toMatchObject({ parametros: ['int'], retorno: 'int' });
  });

  it('control: Math.abs(int) es una coincidencia exacta, sigue dando int', () => {
    expect(resolverSobrecarga('Math', 'abs', ['int'])).toMatchObject({ parametros: ['int'], retorno: 'int' });
  });

  it('control: Math.abs(double) es una coincidencia exacta, da double', () => {
    expect(resolverSobrecarga('Math', 'abs', ['double'])).toMatchObject({ parametros: ['double'], retorno: 'double' });
  });
});

describe('resolverSobrecarga — PrintStream.println: elige por tipo ESTÁTICO exacto (REQ-BIB-011)', () => {
  it('println(char) y println(int) son sobrecargas DISTINTAS — println(\'A\') nunca es println(65)', () => {
    expect(resolverSobrecarga('PrintStream', 'println', ['char'])).toMatchObject({ parametros: ['char'] });
    expect(resolverSobrecarga('PrintStream', 'println', ['int'])).toMatchObject({ parametros: ['int'] });
  });

  it('println(String) para un argumento String (incluida una concatenación, siempre String en este subconjunto)', () => {
    expect(resolverSobrecarga('PrintStream', 'println', ['String'])).toMatchObject({ parametros: ['java.lang.String'] });
  });

  it('triangulación: println(boolean) y println(long) también resuelven a su propia sobrecarga exacta', () => {
    expect(resolverSobrecarga('PrintStream', 'println', ['boolean'])).toMatchObject({ parametros: ['boolean'] });
    expect(resolverSobrecarga('PrintStream', 'println', ['long'])).toMatchObject({ parametros: ['long'] });
  });
});

describe('resolverSobrecarga — sin sobrecarga aplicable da null (nunca inventa una firma)', () => {
  it('un miembro real pero con un número de argumentos que ninguna sobrecarga real acepta', () => {
    expect(resolverSobrecarga('Math', 'round', ['double', 'double'])).toBeNull();
  });

  it('un miembro que no existe en absoluto también da null (clasificarMiembro es quien distingue el porqué)', () => {
    expect(resolverSobrecarga('Math', 'noExiste', ['int'])).toBeNull();
  });
});
