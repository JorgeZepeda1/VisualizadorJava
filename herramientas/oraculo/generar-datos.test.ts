// RED de la tarea 1.9 (Catálogo de datos del JDK, ADR 010): las firmas públicas de la biblioteca
// reconocida (REQ-SUB-005), los símbolos regionales (`DecimalFormatSymbols`, REQ-BIB-010) y los
// mensajes exactos del lanzador (design.md §2.2) NUNCA se escriben a mano — este archivo prueba
// primero el análisis PURO (sin JDK) del formato de línea que produce `GenerarFirmasApi.java`, y
// después (describe aparte, JDK real) que `generarDatos` obtiene hechos reales del oráculo.
import { describe, expect, it } from 'vitest';
import { localizarJdk } from './jdk.ts';
import {
  analizarFirmasApi,
  analizarLineaFirma,
  analizarSalidaRegional,
  generarDatos,
  renderizarFirmasTs,
  renderizarMarcosTs,
  renderizarRegionalTs,
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

// Integración contra el JDK real (ADR 010/011) — requiere el proyecto Vitest `oraculo`
// (`npm run test:oraculo`). Verifica que el oráculo, HOY, observa exactamente los hechos ya
// confirmados a mano en esta sesión (ver engram): Math.round tiene sobrecarga float (no long/int),
// PrintStream reconoce print/println(String), y los separadores regionales de es-MX/es-ES.
describe('generarDatos — integración contra el JDK real (Temurin 17.0.18)', () => {
  const jdk = localizarJdk();

  it('Math.round tiene EXACTAMENTE 2 sobrecargas: round(double)->long y round(float)->int (JLS 15.12, REQ-BIB-004)', async () => {
    const datos = await generarDatos(jdk);
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
    const datos = await generarDatos(jdk);
    const println = datos.firmas.filter((f) => f.clase === 'PrintStream' && f.nombre === 'println');
    expect(println).toContainEqual(expect.objectContaining({ parametros: ['java.lang.String'] }));
    expect(println).toContainEqual(expect.objectContaining({ parametros: ['int'] }));
  });

  it('String.split existe (miembro real, REQ-SUB-007 "existe pero no soportado")', async () => {
    const datos = await generarDatos(jdk);
    expect(datos.firmas.some((f) => f.clase === 'String' && f.nombre === 'split')).toBe(true);
  });

  it('separadores regionales: es-MX usa punto decimal, es-ES usa coma (§2.1 de la exploración 03)', async () => {
    const datos = await generarDatos(jdk);
    expect(datos.regional['es-MX'].decimal).toBe('.');
    expect(datos.regional['es-MX'].miles).toBe(',');
    expect(datos.regional['es-ES'].decimal).toBe(',');
    expect(datos.regional['es-ES'].miles).toBe('.');
  });

  it('marco "sin main": código de salida 1 y el "\\n" LITERAL verificado (bug real de Temurin, §4.3 de la exploración 03)', async () => {
    const datos = await generarDatos(jdk);
    expect(datos.marcos.sinMain.codigoSalida).toBe(1);
    expect(datos.marcos.sinMain.mensaje).toContain('no se ha encontrado el método principal');
    // El bug real: el mensaje trae los DOS caracteres "\" y "n" como texto, no un salto real.
    expect(datos.marcos.sinMain.mensaje).toContain('siguiente modo:\\n');
  });

  it('marco "main no static": código de salida 1 y saltos de línea REALES (bien formado, sin el bug)', async () => {
    const datos = await generarDatos(jdk);
    expect(datos.marcos.mainNoStatic.codigoSalida).toBe(1);
    expect(datos.marcos.mainNoStatic.mensaje).toContain('el método principal no es static');
    expect(datos.marcos.mainNoStatic.mensaje).toContain('siguiente modo:\n   public static void main');
    expect(datos.marcos.mainNoStatic.mensaje).not.toContain('\\n');
  });
});
