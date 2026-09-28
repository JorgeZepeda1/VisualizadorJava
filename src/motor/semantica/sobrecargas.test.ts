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

// Corrección obligatoria (sub-lote 1-C2, orquestador): `printf(String, Object...)` y
// `String.format(String, Object...)` SÍ están en REQ-SUB-005 (reconocimiento sintáctico) pero
// hasta ahora `resolverSobrecarga` solo tenía la fase 1 (identidad/ensanchamiento, aridad fija) —
// nunca resolvía una llamada real (aridad SIEMPRE distinta a 2 salvo por coincidencia, y aun con
// aridad 2 el segundo parámetro real es `Object[]`, al que ningún tipo nuestro ensancha sin
// boxing). Verificado contra javac 17 real (esta sesión): los 4 casos de abajo COMPILAN — el
// error de formato de `printf("%.2f", 3)` es de EJECUCIÓN (Formatter real, lote 2), no de
// compilación; aquí solo importa que la sobrecarga SE RESUELVA.
describe('resolverSobrecarga — printf/String.format: aridad variable (JLS 15.12.2 fase 3, corrección 1-C2)', () => {
  it('printf("hola") — solo el literal de formato, CERO argumentos empacados en el varargs', () => {
    const firma = resolverSobrecarga('PrintStream', 'printf', ['String']);
    expect(firma).toMatchObject({ parametros: ['java.lang.String', 'java.lang.Object[]'], esVarargs: true });
  });

  it('printf("%d%n", 5) — un "int" se empaqueta en el varargs vía boxing (int -> Integer -> Object)', () => {
    const firma = resolverSobrecarga('PrintStream', 'printf', ['String', 'int']);
    expect(firma).toMatchObject({ parametros: ['java.lang.String', 'java.lang.Object[]'] });
  });

  it('printf(".2f de 3 -> %.2f", 3) — mismo caso con un int distinto (triangulación, arg. tal cual la corrección lo pide)', () => {
    expect(resolverSobrecarga('PrintStream', 'printf', ['String', 'int'])).not.toBeNull();
  });

  it('triangulación: varios argumentos empacados de tipos MEZCLADOS (String, int, double) — printf real con 3 sustituciones', () => {
    const firma = resolverSobrecarga('PrintStream', 'printf', ['String', 'String', 'int', 'double']);
    expect(firma).toMatchObject({ parametros: ['java.lang.String', 'java.lang.Object[]'] });
  });

  it('String.format("%s y %s", a, b) — misma resolución de aridad variable, ahora en String (no PrintStream)', () => {
    const firma = resolverSobrecarga('String', 'format', ['String', 'String', 'String']);
    expect(firma).toMatchObject({ parametros: ['java.lang.String', 'java.lang.Object[]'], esVarargs: true });
  });
});

// Sub-lote 1-D2c (hueco flageado por 1-D2b, task_c0cf2e6c): `buscarFirmas` (catalogo-api.ts) es
// genero-agnóstica a propósito -- devuelve CAMPOS y MÉTODOS mezclados de "Clase.nombre". Sin
// filtrar, un CAMPO de aridad 0 (como "Math.PI", parametros: []) "calzaría" como candidato
// aplicable de una llamada de aridad 0 ("Math.PI()") en la fase 1 (ningún parámetro que revisar =
// siempre aplicable) -- un falso positivo real. Verificado contra javac 17 real (carpeta temporal,
// borrada): "MetodoComoCampo.java:3: error: cannot find symbol\n symbol: method PI()\n location: class Math".
describe('resolverSobrecarga — un CAMPO nunca resuelve una llamada (JLS 15.12 solo mira métodos, sub-lote 1-D2c)', () => {
  it('Math.PI() (el campo PI llamado como si fuera método, aridad 0) da null -- NUNCA "resuelve" al campo', () => {
    expect(resolverSobrecarga('Math', 'PI', [])).toBeNull();
  });

  it('triangulación: Integer.MAX_VALUE() (mismo problema con otro campo de aridad 0) también da null', () => {
    expect(resolverSobrecarga('Integer', 'MAX_VALUE', [])).toBeNull();
  });
});

describe('resolverSobrecarga — la fase estricta SIGUE ganando cuando aplica (corrección 1-C2: no romper 1.8)', () => {
  it('Math.round(long) SIGUE resolviendo a round(float) -> int por la fase 1, nunca por boxing/varargs', () => {
    // Math no tiene NINGUNA sobrecarga varargs — si esto alguna vez resolviera distinto, sería
    // señal de que la fase 3 se está probando ANTES que la 1 (orden equivocado de fases).
    expect(resolverSobrecarga('Math', 'round', ['long'])).toMatchObject({ parametros: ['float'], retorno: 'int' });
  });

  it('println(int) sigue resolviendo la sobrecarga EXACTA (println no tiene varargs; nunca cae a boxing)', () => {
    expect(resolverSobrecarga('PrintStream', 'println', ['int'])).toMatchObject({ parametros: ['int'] });
  });
});
