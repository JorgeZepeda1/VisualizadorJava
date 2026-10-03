// Tarea 1.29 (causa 2, agregada por el orquestador): «¿existe esta clase en el JDK?» sobre la lista
// que generó el oráculo (`clases-jdk.generado.ts`, ADR 010) — lo que separa el aviso «esta clase
// existe pero todavía no la simulo» (`import java.util.Locale;`, `JOptionPane`, `StringBuilder`) del
// error «esta clase no existe» (`import java.util.Scaner;`). La lista cubre lo que javac 17 ve por
// omisión (todo módulo que exporta API, java.* y jdk.* salvo los incubadores) y solo los tipos que
// se pueden importar: públicos, con todos sus tipos envolventes públicos, fuera de la vista previa.
import { describe, expect, it } from 'vitest';
import { clasesDelPaquete, existeClaseDelJdk, existePaqueteOTipoDelJdk } from './catalogo-clases.ts';

describe('existeClaseDelJdk — nombres calificados reales (JLS 7.5.1: el nombre canónico)', () => {
  it.each([
    'java.util.Scanner',
    'java.util.Locale',
    'java.text.DecimalFormatSymbols',
    'javax.swing.JOptionPane',
    'java.lang.StringBuilder',
    'java.math.BigDecimal',
    'java.util.Map.Entry',
    'java.lang.Character.UnicodeBlock',
  ])('%s existe', (nombre) => {
    expect(existeClaseDelJdk(nombre)).toBe(true);
  });

  it.each([
    ['java.util.Scaner', 'una falta de ortografía'],
    ['java.java.Scanner', 'un paquete que no existe con un nombre de clase real'],
    ['javax.swing.JOptionPan', 'una falta de ortografía en otro paquete'],
    ['java.util.Map.Entri', 'un tipo anidado inexistente'],
    ['java.util.HashMap.TreeNode', 'un tipo anidado que no es público'],
    ['jdk.internal.misc.Unsafe', 'un paquete interno (no exportado)'],
    ['java.lang.runtime.SwitchBootstraps', 'una API en vista previa (javac la rechaza sin --enable-preview)'],
    ['jdk.incubator.vector.VectorSpecies', 'un módulo incubador (fuera del grafo por omisión)'],
  ])('triangulación negativa: %s NO existe (%s)', (nombre) => {
    expect(existeClaseDelJdk(nombre)).toBe(false);
  });

  it('un nombre sin paquete, o que es solo un paquete, no es una clase importable', () => {
    expect(existeClaseDelJdk('Locale')).toBe(false);
    expect(existeClaseDelJdk('java.util')).toBe(false);
    expect(existeClaseDelJdk('')).toBe(false);
  });

  it('las claves del prototipo no cuentan como paquetes (constructor.toString, __proto__.x)', () => {
    expect(existeClaseDelJdk('constructor.toString')).toBe(false);
    expect(existeClaseDelJdk('__proto__.Object')).toBe(false);
  });
});

describe('clasesDelPaquete — las clases que un import con comodín (o java.lang) deja ver por su nombre simple', () => {
  it('java.lang trae StringBuilder, Object y Boolean, pero no Locale (que vive en java.util)', () => {
    const javaLang = clasesDelPaquete('java.lang');
    expect(javaLang.has('StringBuilder')).toBe(true);
    expect(javaLang.has('Object')).toBe(true);
    expect(javaLang.has('Boolean')).toBe(true);
    expect(javaLang.has('Locale')).toBe(false);
  });

  it('java.util trae Locale, Scanner y Arrays; javax.swing trae JOptionPane', () => {
    const javaUtil = clasesDelPaquete('java.util');
    expect(['Locale', 'Scanner', 'Arrays'].every((clase) => javaUtil.has(clase))).toBe(true);
    expect(clasesDelPaquete('javax.swing').has('JOptionPane')).toBe(true);
  });

  it('un paquete que no existe (o mal escrito) no trae ninguna clase', () => {
    expect(clasesDelPaquete('java.utill').size).toBe(0);
    expect(clasesDelPaquete('constructor').size).toBe(0);
  });
});

// Tarea 1.35 (SUGGESTION-3 y un falso acepto: `import foo.*;`, `import java.Util.*;`, `import org.junit.*;` terminaban en `ok`; javac: «package foo does not exist» en la línea del
// `import`): un `import nombre.*;` (JLS 7.5.2) es válido si `nombre` es un PAQUETE que tiene tipos visibles o un TIPO (se importan sus miembros: `import java.util.Map.*;`). La regla se
// midió con javac 17.0.18 sobre 886 nombres (los 871 paquetes del sistema y 15 más): lo que javac acepta es EXACTAMENTE los 226 paquetes de la lista y 4 tipos.
describe('existePaqueteOTipoDelJdk — qué acepta `import nombre.*;` (JLS 7.5.2, tarea 1.35)', () => {
  it.each(['java.util', 'java.lang', 'java.util.concurrent', 'javax.swing', 'org.w3c.dom', 'sun.misc'])('el paquete %s existe', (nombre) => {
    expect(existePaqueteOTipoDelJdk(nombre)).toBe(true);
  });

  it.each(['java.util.Map', 'java.util.Map.Entry', 'java.lang.Math', 'java.lang.String'])('el TIPO %s también vale: se importan sus miembros', (nombre) => {
    expect(existePaqueteOTipoDelJdk(nombre)).toBe(true);
  });

  it.each([
    ['java', 'un paquete que solo tiene subpaquetes'],
    ['javax', 'idem'],
    ['java.sqrt', 'un paquete inventado dentro de uno real'],
    ['java.Util', 'una mayúscula de más'],
    ['java.util2', 'un número de más'],
    ['java.lang.Matth', 'una falta de ortografía en un tipo'],
    ['foo', 'un paquete inventado'],
    ['org.junit', 'una biblioteca que no es del JDK'],
    ['com.google.gson', 'idem'],
    ['jdk.internal.misc', 'un paquete interno (no exportado)'],
    ['jdk.incubator.vector', 'un módulo incubador'],
    ['', 'nada'],
  ])('%s NO existe (%s)', (nombre) => {
    expect(existePaqueteOTipoDelJdk(nombre)).toBe(false);
  });

  it('un nombre que JavaScript trae en todos sus objetos no es un paquete (la tabla no hereda de Object.prototype)', () => {
    expect(existePaqueteOTipoDelJdk('constructor')).toBe(false);
    expect(existePaqueteOTipoDelJdk('__proto__')).toBe(false);
    expect(existePaqueteOTipoDelJdk('toString')).toBe(false);
  });
});
