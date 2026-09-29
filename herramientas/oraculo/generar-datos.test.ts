// RED de la tarea 1.9 (Catálogo de datos del JDK, ADR 010): las firmas públicas de la biblioteca
// reconocida (REQ-SUB-005), los símbolos regionales (`DecimalFormatSymbols`, REQ-BIB-010) y los
// mensajes exactos del lanzador (design.md §2.2) NUNCA se escriben a mano — este archivo prueba
// primero el análisis PURO (sin JDK) del formato de línea que produce `GenerarFirmasApi.java`, y
// después (describe aparte, JDK real) que `generarDatos` obtiene hechos reales del oráculo.
import { beforeAll, describe, expect, it } from 'vitest';
import { localizarJdk } from './jdk.ts';
import { compilarEnLote, compilarImportaciones } from './compilar-en-lote.ts';
import {
  type DatosJdk,
  analizarClasesJdk,
  analizarIdentificadoresJava,
  analizarFirmasApi,
  analizarLineaClases,
  analizarLineaFirma,
  analizarLineaSupertipos,
  analizarSalidaRegional,
  analizarSupertipos,
  generarDatos,
  pareceLanzadorEnEspanol,
  renderizarClasesTs,
  renderizarFirmasTs,
  renderizarIdentificadoresTs,
  renderizarMarcosTs,
  renderizarRegionalTs,
  renderizarSupertiposTs,
  verificarMarcoEnEspanol,
} from './generar-datos.ts';

describe('analizarLineaFirma (pura) — parsea una línea de GenerarFirmasApi.java', () => {
  it('un método estático con un parámetro (Math.round(double))', () => {
    expect(analizarLineaFirma('Math|metodo|round|true|double|long|false')).toEqual({
      clase: 'Math',
      genero: 'metodo',
      nombre: 'round',
      esEstatico: true,
      parametros: ['double'],
      retorno: 'long',
      esVarargs: false,
    });
  });

  it('un constructor sin parámetros (triangulación: género distinto, lista de parámetros vacía)', () => {
    expect(analizarLineaFirma('Random|constructor|<init>|false||void|false')).toEqual({
      clase: 'Random',
      genero: 'constructor',
      nombre: '<init>',
      esEstatico: false,
      parametros: [],
      retorno: 'void',
      esVarargs: false,
    });
  });

  it('un campo estático (triangulación: género "campo", sin parámetros ni varargs)', () => {
    expect(analizarLineaFirma('Math|campo|PI|true||double|false')).toEqual({
      clase: 'Math',
      genero: 'campo',
      nombre: 'PI',
      esEstatico: true,
      parametros: [],
      retorno: 'double',
      esVarargs: false,
    });
  });

  it('un método con varios parámetros y varargs (String.format)', () => {
    expect(analizarLineaFirma('String|metodo|format|true|java.lang.String,java.lang.Object[]|java.lang.String|true'))
      .toEqual({
        clase: 'String',
        genero: 'metodo',
        nombre: 'format',
        esEstatico: true,
        parametros: ['java.lang.String', 'java.lang.Object[]'],
        retorno: 'java.lang.String',
        esVarargs: true,
      });
  });

  it('línea mal formada (menos de 7 campos) lanza un error claro en vez de devolver datos a medias', () => {
    expect(() => analizarLineaFirma('Math|metodo|round')).toThrow();
  });
});

describe('analizarFirmasApi (pura) — parsea el bloque completo de salida', () => {
  it('varias líneas, incluida una en blanco al final (como deja println), se filtra sin romper', () => {
    const salida = ['Math|metodo|abs|true|int|int|false', 'Math|metodo|abs|true|long|long|false', ''].join('\n');
    const firmas = analizarFirmasApi(salida);
    expect(firmas).toHaveLength(2);
    expect(firmas[0].nombre).toBe('abs');
    expect(firmas[1].parametros).toEqual(['long']);
  });
});

// Tarea 1.29 (causa 4): los supertipos REALES de cada tipo de referencia del subconjunto
// (`GenerarSupertipos.java`) — de ahí sale el ensanchamiento de referencia (JLS 5.1.5) y el "más
// específico" (15.12.2.5) de `semantica/conversiones.ts`/`sobrecargas.ts`.
describe('analizarLineaSupertipos / analizarSupertipos (puras) — parsean la salida de GenerarSupertipos', () => {
  it('una línea "tipo|super1,super2" (java.lang.String)', () => {
    expect(
      analizarLineaSupertipos('java.lang.String|java.io.Serializable,java.lang.CharSequence,java.lang.Comparable,java.lang.Object'),
    ).toEqual({
      tipo: 'java.lang.String',
      supertipos: ['java.io.Serializable', 'java.lang.CharSequence', 'java.lang.Comparable', 'java.lang.Object'],
    });
  });

  it('triangulación: un tipo sin más supertipo que Object (una interfaz raíz) y uno sin ninguno', () => {
    expect(analizarLineaSupertipos('java.lang.CharSequence|java.lang.Object')).toEqual({
      tipo: 'java.lang.CharSequence',
      supertipos: ['java.lang.Object'],
    });
    expect(analizarLineaSupertipos('java.lang.Object|')).toEqual({ tipo: 'java.lang.Object', supertipos: [] });
  });

  it('una línea mal formada (sin "|") lanza un error claro en vez de devolver datos a medias', () => {
    expect(() => analizarLineaSupertipos('java.lang.String')).toThrow(/línea de supertipos mal formada/);
  });

  it('el bloque completo se indexa por tipo e ignora las líneas en blanco', () => {
    const tabla = analizarSupertipos(['java.lang.Integer|java.lang.Number,java.lang.Object', 'java.lang.Number|java.lang.Object', ''].join('\n'));
    expect(tabla['java.lang.Integer']).toEqual(['java.lang.Number', 'java.lang.Object']);
    expect(Object.keys(tabla)).toEqual(['java.lang.Integer', 'java.lang.Number']);
  });
});

describe('renderizarSupertiposTs (pura) — genera el .ts con cabecera "no editar"', () => {
  it('incluye la cabecera generada y una entrada real como literal TypeScript', () => {
    const texto = renderizarSupertiposTs({ 'java.lang.String': ['java.lang.CharSequence', 'java.lang.Object'] });
    expect(texto).toContain('generado');
    expect(texto).toContain('no editar');
    expect(texto).toContain('SUPERTIPOS_JDK');
    expect(texto).toContain("'java.lang.String': ['java.lang.CharSequence', 'java.lang.Object']");
  });
});

// Tarea 1.29 (causa 2): las clases REALES del JDK que un programa sin módulo ve por omisión
// (`GenerarClasesJdk.java`) — de ahí sale la distinción de REQ-SUB-007/design.md §2.3: «clase
// existente no soportada → aviso; inexistente → error». Sin esta lista, `import java.util.Locale;`
// (real) y `import java.util.Locale2;` (inventada) recibían el MISMO error.
describe('analizarLineaClases / analizarClasesJdk (puras) — parsean la salida de GenerarClasesJdk', () => {
  it('una línea "paquete|Clase1,Clase2,Map.Entry" (los tipos anidados llevan su nombre canónico)', () => {
    expect(analizarLineaClases('java.util|ArrayList,Locale,Map,Map.Entry,Scanner')).toEqual({
      paquete: 'java.util',
      clases: ['ArrayList', 'Locale', 'Map', 'Map.Entry', 'Scanner'],
    });
  });

  it('una línea mal formada (sin "|", o sin clases) lanza un error claro en vez de devolver datos a medias', () => {
    expect(() => analizarLineaClases('java.util')).toThrow(/línea de clases mal formada/);
    expect(() => analizarLineaClases('java.util|')).toThrow(/línea de clases mal formada/);
  });

  it('el bloque completo se indexa por paquete, ignora las líneas en blanco y no toma la línea "#total" por un paquete', () => {
    const tabla = analizarClasesJdk(['java.io|File,PrintStream', 'java.text|DecimalFormat', '#total|3', ''].join('\n'));
    expect(tabla['java.io']).toEqual(['File', 'PrintStream']);
    expect(Object.keys(tabla)).toEqual(['java.io', 'java.text']);
  });

  // El oráculo acota lo que captura de stdout (`LIMITE_BYTES_CAPTURA_POR_OMISION`, 64 KiB) y la lista
  // pesa ~83 KB: la primera versión de esta tarea la guardó CORTADA sin darse cuenta (156 de 225
  // paquetes) — cada clase que faltara se le habría mostrado al alumno como «no existe».
  it('una salida sin la línea "#total|N" (truncada por el tope de captura) lanza un error claro, nunca datos a medias', () => {
    expect(() => analizarClasesJdk('java.io|File,PrintStream\njava.text|DecimalFormat\n')).toThrow(/truncada/);
  });

  it('una línea "#total|N" que no coincide con las clases leídas también lanza (salida cortada a mitad de línea)', () => {
    expect(() => analizarClasesJdk('java.io|File,PrintStream\n#total|5\n')).toThrow(/truncada/);
  });
});

describe('renderizarClasesTs (pura) — genera el .ts compacto con cabecera "no editar"', () => {
  it('una entrada por paquete, con sus clases en una sola cadena separada por comas', () => {
    const texto = renderizarClasesTs({ 'java.util': ['ArrayList', 'Map', 'Map.Entry'], 'javax.swing': ['JOptionPane'] });
    expect(texto).toContain('generado');
    expect(texto).toContain('no editar');
    expect(texto).toContain('CLASES_JDK');
    expect(texto).toContain("'java.util': 'ArrayList,Map,Map.Entry'");
    expect(texto).toContain("'javax.swing': 'JOptionPane'");
  });
});

// Tarea 1.29 (causa 8): qué caracteres puede llevar un identificador — los rangos de
// `Character.isJavaIdentifierStart/Part` del JDK 17 (Unicode 13), tal cual (`GenerarIdentificadores.java`).
// Las propiedades Unicode del motor de JavaScript son de OTRA versión (Node 22 trae Unicode 17: acepta
// ~14 000 letras que javac 17 rechaza) y no modelan los caracteres ignorables que javac sí admite.
describe('analizarIdentificadoresJava (pura) — parsea la salida de GenerarIdentificadores', () => {
  it('dos líneas "inicio|…" y "parte|…" con rangos en hexadecimal ("41-5a" o un solo punto de código "5f")', () => {
    const tabla = analizarIdentificadoresJava(['inicio|24,41-5a,5f', 'parte|0-8,24,30-39,41-5a', '#total|3,4', ''].join('\n'));
    expect(tabla).toEqual({ inicio: '24,41-5a,5f', parte: '0-8,24,30-39,41-5a' });
  });

  it('una salida sin la línea "#total|N,M" (truncada) o con cuentas que no coinciden lanza un error claro', () => {
    expect(() => analizarIdentificadoresJava('inicio|24,41-5a\nparte|30-39\n')).toThrow(/truncada/);
    expect(() => analizarIdentificadoresJava('inicio|24,41-5a\nparte|30-39\n#total|9,9\n')).toThrow(/truncada/);
  });

  it('una salida sin alguna de las dos líneas lanza (no se guarda una tabla a medias)', () => {
    expect(() => analizarIdentificadoresJava('inicio|24\n#total|1,0\n')).toThrow(/mal formada/);
  });
});

describe('renderizarIdentificadoresTs (pura) — genera el .ts compacto con cabecera "no editar"', () => {
  it('exporta las dos tablas de rangos como cadenas', () => {
    const texto = renderizarIdentificadoresTs({ inicio: '24,41-5a', parte: '30-39' });
    expect(texto).toContain('generado');
    expect(texto).toContain('no editar');
    expect(texto).toContain("INICIO_DE_IDENTIFICADOR_JAVA: string = '24,41-5a'");
    expect(texto).toContain("PARTE_DE_IDENTIFICADOR_JAVA: string = '30-39'");
  });
});

describe('analizarSalidaRegional (pura) — parsea la salida de GenerarRegional', () => {
  it('las 5 claves "clave=valor" verificadas contra es-MX', () => {
    const salida = ['decimal=.', 'miles=,', 'menos=-', 'nan=NaN', 'infinito=∞', 'locale=es_MX'].join('\n');
    expect(analizarSalidaRegional(salida)).toEqual({
      decimal: '.',
      miles: ',',
      menos: '-',
      nan: 'NaN',
      infinito: '∞',
    });
  });

  it('triangulación con es-ES (decimal y miles invertidos, verificado contra el JDK real)', () => {
    const salida = ['decimal=,', 'miles=.', 'menos=-', 'nan=NaN', 'infinito=∞', 'locale=es_ES'].join('\n');
    expect(analizarSalidaRegional(salida)).toEqual({
      decimal: ',',
      miles: '.',
      menos: '-',
      nan: 'NaN',
      infinito: '∞',
    });
  });
});

describe('renderizarFirmasTs (pura) — genera el .ts con cabecera "no editar"', () => {
  it('incluye la cabecera generada y una entrada real como literal TypeScript', () => {
    const texto = renderizarFirmasTs([
      { clase: 'Math', genero: 'metodo', nombre: 'round', esEstatico: true, parametros: ['double'], retorno: 'long', esVarargs: false },
    ]);
    expect(texto).toContain('generado');
    expect(texto).toContain('no editar');
    expect(texto).toContain("clase: 'Math'");
    expect(texto).toContain("nombre: 'round'");
    expect(texto).toContain('FIRMAS_JDK');
  });
});

describe('renderizarRegionalTs / renderizarMarcosTs (puras)', () => {
  it('renderizarRegionalTs incluye ambos locales con sus separadores', () => {
    const texto = renderizarRegionalTs({
      'es-MX': { decimal: '.', miles: ',', menos: '-', nan: 'NaN', infinito: '∞' },
      'es-ES': { decimal: ',', miles: '.', menos: '-', nan: 'NaN', infinito: '∞' },
    });
    expect(texto).toContain("'es-MX'");
    expect(texto).toContain("'es-ES'");
    expect(texto).toContain("decimal: '.'");
    expect(texto).toContain("decimal: ','");
  });

  it('renderizarMarcosTs conserva el "\\n" LITERAL de sinMain y el salto real de mainNoStatic', () => {
    const texto = renderizarMarcosTs({
      sinMain: { mensaje: 'primera linea\\nsegunda linea', codigoSalida: 1 },
      mainNoStatic: { mensaje: 'una sola linea\nreal', codigoSalida: 1 },
    });
    // El literal de código TS debe reproducir el escape tal cual (JSON.stringify hace esto solo:
    // una fuente con \n LITERAL de dos caracteres se serializa como "\\n" en el archivo .ts).
    expect(texto).toContain(JSON.stringify('primera linea\\nsegunda linea'));
    expect(texto).toContain(JSON.stringify('una sola linea\nreal'));
  });
});

// Sub-lote 1-D3 (Parte A.2 del orquestador): gotcha real descubierto la sesión anterior (engram
// "Gotcha: JVM en frío da el mensaje del lanzador en inglés en esta sandbox") -- las PRIMERAS
// invocaciones de `java` en una sesión nueva PUEDEN dar el mensaje del lanzador en inglés pese a
// `-Duser.language=es -Duser.country=MX` (causa exacta no confirmada — ver el informe de esta
// sesión). `generarDatos` capturaba `sinMain.stderr`/`mainNoStatic.stderr` DIRECTO, sin validar su
// idioma -- si el runner de CI (SIEMPRE una JVM en frío, un job nuevo por corrida) lo golpea,
// `marcos-arranque.generado.ts` se regeneraría en INGLÉS en silencio, corrompiendo el dato que
// `semantica/arranque.ts` (tarea 1.15) muestra al alumno. Ambos mensajes reales comparten la frase
// "método principal" (ver `marcos-arranque.generado.ts`, ya verificado contra el JDK real) -- un
// marcador simple y suficiente para detectar el idioma equivocado, sin necesitar reproducir el bug
// para probarlo (Extract-Before-Mock, mismo patrón que `esVersionEsperada`/`jdk.ts`).
describe('pareceLanzadorEnEspanol (pura) — detecta un mensaje del lanzador que NO está en español', () => {
  it('el mensaje REAL de "sin main" (es-MX, con el bug del "\\n" literal) sí parece español', () => {
    expect(
      pareceLanzadorEnEspanol(
        'Error: no se ha encontrado el método principal en la clase SinMain, defina el método principal del siguiente modo:\\n   public static void main(String[] args)\\nde lo contrario, se deberá ampliar una clase de aplicación JavaFX javafx.application.Application\n',
      ),
    ).toBe(true);
  });

  it('triangulación: el mensaje REAL de "main no static" (es-MX) también parece español', () => {
    expect(
      pareceLanzadorEnEspanol(
        'Error: el método principal no es static en la clase MainNoStatic, defina el método principal del siguiente modo:\n   public static void main(String[] args)\n',
      ),
    ).toBe(true);
  });

  it('el mensaje real en INGLÉS (arranque en frío, JVM recién iniciada) NO parece español', () => {
    expect(
      pareceLanzadorEnEspanol(
        'Error: Main method not found in class SinMain, please define the main method as:\n   public static void main(String[] args)\nor a JavaFX application class must extend javafx.application.Application\n',
      ),
    ).toBe(false);
  });

  it('triangulación: "main no static" en INGLÉS tampoco parece español (mensaje distinto, mismo marcador ausente)', () => {
    expect(
      pareceLanzadorEnEspanol(
        'Error: Main method is not static in class MainNoStatic, please define the main method as:\n   public static void main(String[] args)\n',
      ),
    ).toBe(false);
  });

  it('control: una cadena vacía (captura que falló por completo) tampoco parece español', () => {
    expect(pareceLanzadorEnEspanol('')).toBe(false);
  });
});

describe('verificarMarcoEnEspanol (pura) — falla con un error claro en vez de guardar un dato corrupto', () => {
  it('un mensaje en español no lanza', () => {
    expect(() =>
      verificarMarcoEnEspanol('Error: no se ha encontrado el método principal en la clase X', 'sin main'),
    ).not.toThrow();
  });

  it('un mensaje en inglés (arranque en frío) LANZA con un error claro que menciona la etiqueta y nunca se guarda', () => {
    expect(() =>
      verificarMarcoEnEspanol('Error: Main method not found in class X, please define the main method as:', 'sin main'),
    ).toThrowError(/sin main/);
  });
});

// Integración contra el JDK real (ADR 010/011) — requiere el proyecto Vitest `oraculo`
// (`npm run test:oraculo`). Verifica que el oráculo, HOY, observa exactamente los hechos ya
// confirmados a mano en esta sesión (ver engram): Math.round tiene sobrecarga float (no long/int),
// PrintStream reconoce print/println(String), y los separadores regionales de es-MX/es-ES.
describe('generarDatos — integración contra el JDK real (Temurin 17.0.18)', () => {
  const jdk = localizarJdk();
  // Una sola generación para todas las pruebas de abajo (cada una tarda ~3 s: firmas, supertipos, clases
  // con su compilación de javac, regional y marcos) — salvo la de determinismo, que necesita dos.
  let datos: DatosJdk;
  beforeAll(async () => {
    datos = await generarDatos(jdk);
  }, 120_000);

  it('Math.round tiene EXACTAMENTE 2 sobrecargas: round(double)->long y round(float)->int (JLS 15.12, REQ-BIB-004)', async () => {
    const round = datos.firmas.filter((f) => f.clase === 'Math' && f.nombre === 'round');
    expect(round).toHaveLength(2);
    expect(round).toContainEqual(
      expect.objectContaining({ parametros: ['double'], retorno: 'long' }),
    );
    expect(round).toContainEqual(
      expect.objectContaining({ parametros: ['float'], retorno: 'int' }),
    );
    // No existe round(long) ni round(int) — la razón real de REQ-BIB-004 ("se resuelve a round(float)").
    expect(round.some((f) => f.parametros[0] === 'long' || f.parametros[0] === 'int')).toBe(false);
  });

  it('PrintStream reconoce println(String) Y println(int) (triangulación: dos sobrecargas reales distintas)', async () => {
    const println = datos.firmas.filter((f) => f.clase === 'PrintStream' && f.nombre === 'println');
    expect(println).toContainEqual(expect.objectContaining({ parametros: ['java.lang.String'] }));
    expect(println).toContainEqual(expect.objectContaining({ parametros: ['int'] }));
  });

  // Tarea 1.29 (causa 1, orquestador): `Scanner implements Iterator<String>` hace que javac genere el
  // método PUENTE sintético `next():Object` — la reflexión lo lista junto al real `next():String`.
  // Un método puente no existe para javac (se resuelve sobre lo DECLARADO), así que el generador
  // debe excluirlo (`Method#isBridge`/`isSynthetic`): con los dos, `sc.next()` no se podía resolver.
  it('sin métodos puente (tarea 1.29): Scanner.next() sin parámetros es UNA firma que devuelve String', async () => {
    const sinParametros = datos.firmas.filter((f) => f.clase === 'Scanner' && f.nombre === 'next' && f.parametros.length === 0);
    expect(sinParametros.map((f) => f.retorno)).toEqual(['java.lang.String']);
  });

  it('sin métodos puente (tarea 1.29): ninguna firma se repite y String.compareTo solo tiene la sobrecarga real', async () => {
    const claves = datos.firmas.map((f) => `${f.clase}|${f.genero}|${f.nombre}(${f.parametros.join(',')})`);
    expect(claves.filter((clave, indice) => claves.indexOf(clave) !== indice)).toEqual([]);
    const compareTo = datos.firmas.filter((f) => f.clase === 'String' && f.nombre === 'compareTo');
    expect(compareTo.map((f) => f.parametros)).toEqual([['java.lang.String']]);
  });

  it('supertipos (tarea 1.29): String desciende de CharSequence, Comparable, Serializable y Object; Scanner de Closeable', async () => {
    expect(datos.supertipos['java.lang.String']).toEqual(
      expect.arrayContaining(['java.lang.CharSequence', 'java.lang.Comparable', 'java.io.Serializable', 'java.lang.Object']),
    );
    expect(datos.supertipos['java.util.Scanner']).toEqual(expect.arrayContaining(['java.io.Closeable', 'java.util.Iterator']));
    // Una interfaz también tiene a Object como supertipo (JLS 4.10.2) aunque `getSuperclass()` sea null.
    expect(datos.supertipos['java.lang.CharSequence']).toEqual(['java.lang.Object']);
  });

  // Tarea 1.29 (causa 6): javac resuelve una llamada sobre los miembros públicos de la clase Y los
  // heredados (JLS 8.4.8) — `Random` (JDK 17) hereda de `RandomGenerator` los métodos por defecto
  // `nextInt(int, int)`, `nextDouble(double)`…, y toda clase hereda los públicos de `Object`.
  it('miembros heredados (tarea 1.29): Random.nextInt(int, int) y Random.hashCode() están en el catálogo', async () => {
    const nextInt = datos.firmas.filter((f) => f.clase === 'Random' && f.nombre === 'nextInt');
    expect(nextInt.map((f) => f.parametros.join(','))).toEqual(expect.arrayContaining(['', 'int', 'int,int']));
    expect(datos.firmas.some((f) => f.clase === 'Random' && f.nombre === 'hashCode')).toBe(true);
  });

  it('el orden de las firmas y de las clases es determinista (el CI compara bytes contra una regeneración)', async () => {
    const segunda = await generarDatos(jdk);
    expect(segunda.firmas).toEqual(datos.firmas);
    expect(segunda.clases).toEqual(datos.clases);
    expect(segunda.supertipos).toEqual(datos.supertipos);
    const deRandom = datos.firmas.filter((f) => f.clase === 'Random' && f.genero === 'metodo').map((f) => f.nombre);
    expect(deRandom).toEqual([...deRandom].sort());
  }, 120_000);

  // Tarea 1.29 (causa 2): las clases públicas que ve un programa sin módulo (java.se + los módulos
  // `jdk.*` que exportan API), por su nombre canónico — la única fuente de «esta clase existe».
  it('clases (tarea 1.29): están las de U3-U7 y las de los cursos de NetBeans, con sus tipos anidados', async () => {
    expect(datos.clases['java.util']).toEqual(expect.arrayContaining(['Scanner', 'Random', 'Locale', 'ArrayList', 'Map', 'Map.Entry']));
    expect(datos.clases['java.lang']).toEqual(expect.arrayContaining(['String', 'StringBuilder', 'Object', 'Boolean', 'Runtime']));
    expect(datos.clases['java.text']).toEqual(expect.arrayContaining(['DecimalFormat', 'DecimalFormatSymbols']));
    expect(datos.clases['javax.swing']).toContain('JOptionPane');
    expect(datos.clases['java.math']).toEqual(expect.arrayContaining(['BigDecimal', 'BigInteger']));
    // Los últimos paquetes en orden alfabético: si el oráculo cortara la salida, faltarían primero estos.
    expect(datos.clases['org.w3c.dom']).toContain('Document');
    expect(datos.clases['sun.misc']).toContain('Unsafe');
  });

  it('clases (tarea 1.29): no están las que javac rechaza — paquetes internos, incubadoras, APIs en vista previa, miembros no públicos', async () => {
    expect(datos.clases['jdk.internal.misc']).toBeUndefined();
    expect(datos.clases['jdk.incubator.vector']).toBeUndefined();
    expect(datos.clases['java.lang.runtime']).not.toContain('SwitchBootstraps');
    expect(datos.clases['java.util']).not.toContain('HashMap.TreeNode');
    expect(datos.clases['java.util']).not.toContain('Scaner');
    // javac 17 resuelve TODO módulo que exporta API (java.* incluido), aunque `java.se` no lo agrupe:
    // el primer intento de esta tarea lo excluía por suponer lo contrario, y javac lo desmintió.
    expect(datos.clases['javax.smartcardio']).toContain('Card');
  });

  it('clases (tarea 1.29): CADA nombre de la lista es importable con javac real, y los que quedaron fuera no (compilación por nombre, una sola JVM)', async () => {
    const nombres = Object.entries(datos.clases).flatMap(([paquete, clases]) => clases.map((clase) => `${paquete}.${clase}`));
    expect(nombres.length).toBeGreaterThan(4000);
    const negativos = [
      'java.util.Scaner',
      'java.java.Scanner',
      'javax.swing.JOptionPan',
      'java.util.HashMap.TreeNode',
      'jdk.internal.misc.Unsafe',
      'java.lang.runtime.SwitchBootstraps',
      'jdk.incubator.vector.VectorSpecies',
    ];
    const veredictos = await compilarImportaciones(jdk, [...nombres, ...negativos]);
    const rechazadosSinRazon = nombres.filter((nombre) => veredictos.get(nombre) !== true);
    expect(rechazadosSinRazon).toEqual([]);
    const aceptadosSinRazon = negativos.filter((nombre) => veredictos.get(nombre) !== false);
    expect(aceptadosSinRazon).toEqual([]);
  }, 300_000);

  // Tarea 1.29 (causa 8): los rangos de identificador salen del JDK y se verifican contra javac por los
  // BORDES de cada rango (el último punto de código de dentro y el primero de fuera, por los dos lados):
  // ahí es donde una tabla equivocada se equivoca. Se compila `int <c>x;` (inicio) y `int a<c>;` (parte).
  it('identificadores (tarea 1.29): las tablas traen las letras de siempre y NO las de Unicode posterior al 13 del JDK 17', () => {
    const contiene = (rangos: string, punto: number): boolean =>
      rangos.split(',').some((rango) => {
        const [desde, hasta] = rango.split('-').map((h) => Number.parseInt(h, 16)) as [number, number?];
        return punto >= desde && punto <= (hasta ?? desde);
      });
    expect(contiene(datos.identificadores.inicio, 0xf1)).toBe(true); // ñ
    expect(contiene(datos.identificadores.inicio, 0x24)).toBe(true); // $
    expect(contiene(datos.identificadores.inicio, 0x30)).toBe(false); // un dígito no inicia
    expect(contiene(datos.identificadores.parte, 0x30)).toBe(true); // pero sí continúa
    expect(contiene(datos.identificadores.inicio, 0x870)).toBe(false); // letra árabe de Unicode 14: javac 17 la rechaza
    expect(contiene(datos.identificadores.parte, 0x200d)).toBe(true); // ignorable (ZWJ): javac lo admite dentro de un identificador
  });

  it('identificadores (tarea 1.29): en los BORDES de cada rango, javac real coincide con la tabla (inicio y parte)', async () => {
    const aRangos = (texto: string): [number, number][] =>
      texto.split(',').map((rango) => {
        const [desde, hasta] = rango.split('-').map((h) => Number.parseInt(h, 16)) as [number, number?];
        return [desde, hasta ?? desde];
      });
    const dentro = (rangos: [number, number][], punto: number): boolean => rangos.some(([desde, hasta]) => punto >= desde && punto <= hasta);
    const inicio = aRangos(datos.identificadores.inicio);
    const parte = aRangos(datos.identificadores.parte);
    const bordes = new Set<number>();
    for (const [desde, hasta] of [...inicio, ...parte]) {
      for (const punto of [desde - 1, desde, hasta, hasta + 1]) {
        if (punto > 0x1f && punto <= 0x10ffff && !(punto >= 0xd800 && punto <= 0xdfff)) bordes.add(punto);
      }
    }
    const casos = [...bordes].flatMap((punto) => {
      const caracter = String.fromCodePoint(punto);
      return [
        // «x» detrás del carácter de inicio: un «_» SOLO es una palabra reservada desde Java 9 (javac lo
        // rechaza como identificador), pero «_x» sí es un identificador y `_` es un carácter de inicio válido.
        { id: `inicio:${punto}`, fuente: `class T { int ${caracter}x; }\n`, esperado: dentro(inicio, punto) },
        { id: `parte:${punto}`, fuente: `class T { int a${caracter}; }\n`, esperado: dentro(parte, punto) },
      ];
    });
    expect(casos.length).toBeGreaterThan(4000);
    const veredictos = await compilarEnLote(jdk, casos);
    const discrepancias = casos.filter((caso) => veredictos.get(caso.id)?.compila !== caso.esperado).map((caso) => caso.id);
    expect(discrepancias).toEqual([]);
  }, 300_000);

  it('String.split existe (miembro real, REQ-SUB-007 "existe pero no soportado")', async () => {
    expect(datos.firmas.some((f) => f.clase === 'String' && f.nombre === 'split')).toBe(true);
  });

  it('separadores regionales: es-MX usa punto decimal, es-ES usa coma (§2.1 de la exploración 03)', async () => {
    expect(datos.regional['es-MX'].decimal).toBe('.');
    expect(datos.regional['es-MX'].miles).toBe(',');
    expect(datos.regional['es-ES'].decimal).toBe(',');
    expect(datos.regional['es-ES'].miles).toBe('.');
  });

  it('marco "sin main": código de salida 1 y el "\\n" LITERAL verificado (bug real de Temurin, §4.3 de la exploración 03)', async () => {
    expect(datos.marcos.sinMain.codigoSalida).toBe(1);
    expect(datos.marcos.sinMain.mensaje).toContain('no se ha encontrado el método principal');
    // El bug real: el mensaje trae los DOS caracteres "\" y "n" como texto, no un salto real.
    expect(datos.marcos.sinMain.mensaje).toContain('siguiente modo:\\n');
  });

  it('marco "main no static": código de salida 1 y saltos de línea REALES (bien formado, sin el bug)', async () => {
    expect(datos.marcos.mainNoStatic.codigoSalida).toBe(1);
    expect(datos.marcos.mainNoStatic.mensaje).toContain('el método principal no es static');
    expect(datos.marcos.mainNoStatic.mensaje).toContain('siguiente modo:\n   public static void main');
    expect(datos.marcos.mainNoStatic.mensaje).not.toContain('\\n');
  });
});
