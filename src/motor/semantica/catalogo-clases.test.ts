// Tarea 1.29 (causa 2, agregada por el orquestador): «¿existe esta clase en el JDK?» sobre la lista
// que generó el oráculo (`clases-jdk.generado.ts`, ADR 010) — lo que separa el aviso «esta clase
// existe pero todavía no la simulo» (`import java.util.Locale;`, `JOptionPane`, `StringBuilder`) del
// error «esta clase no existe» (`import java.util.Scaner;`). La lista cubre lo que javac 17 ve por
// omisión (todo módulo que exporta API, java.* y jdk.* salvo los incubadores) y solo los tipos que
// se pueden importar: públicos, con todos sus tipos envolventes públicos, fuera de la vista previa.
import { describe, expect, it } from 'vitest';
import { claseQueChocaComoPaquete, clasesDelPaquete, existeClaseDelJdk, existePaqueteOTipoDelJdk } from './catalogo-clases.ts';

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

// Tarea 1.37 (C-6 de la verificación del delta del lote 1): `package java.lang.Shutdown;` lo rechaza javac («package java.lang.Shutdown clashes with class of same name») aunque `Shutdown` no sea
// pública, y el catálogo solo conocía las públicas. El chequeo de javac (`checkClassPackageClash`) compara CADA prefijo del nombre del paquete (de dos segmentos en adelante) con las clases que el
// compilador ya conoce al arrancar: todos los archivos de `java.lang` (públicos o no, anidados o no) y las pocas que él mismo crea de antemano; la lista sale del oráculo (`GenerarClasesQueChocan.java`).
describe('claseQueChocaComoPaquete — qué prefijo del nombre de un paquete es una clase que javac ya conoce (tarea 1.37, C-6)', () => {
  it.each([
    ['java.lang.Shutdown', 'una clase NO pública de java.lang (C-6)'],
    ['java.lang.StringCoding', 'otra clase NO pública de java.lang'],
    ['java.lang.CharacterData00', 'una más, con dígitos'],
    ['java.lang.String', 'una pública de java.lang'],
    ['java.lang.Thread$State', 'una anidada de java.lang, con su nombre plano'],
    ['java.lang.Class$1', 'una anónima de java.lang'],
    ['java.lang.runtime.SwitchBootstraps', 'una API en vista previa que el catálogo de tipos importables no tiene'],
    ['java.lang.runtime.ObjectMethods', 'la otra de java.lang.runtime'],
    ['java.io.Serializable', 'una de las que el compilador crea de antemano'],
    ['java.util.Iterator', 'idem, en java.util'],
    ['java.util.List', 'idem'],
    ['java.lang.invoke.MethodHandle', 'idem, en java.lang.invoke'],
    ['java.lang.invoke.MethodHandles$Lookup', 'una anidada de las de antemano'],
  ])('«%s» choca (%s): devuelve ese mismo nombre', (nombre) => {
    expect(claseQueChocaComoPaquete(nombre)).toBe(nombre);
  });

  it.each([
    ['java.lang.String.aula', 'java.lang.String'],
    ['java.lang.Shutdown.a.b.c', 'java.lang.Shutdown'],
    ['java.lang.Thread$State.x', 'java.lang.Thread$State'],
    ['java.io.Serializable.aula', 'java.io.Serializable'],
    ['java.lang.runtime.SwitchBootstraps.curso', 'java.lang.runtime.SwitchBootstraps'],
  ])('«%s» choca por su PREFIJO: devuelve la clase que es su prefijo (%s)', (nombre, prefijo) => {
    expect(claseQueChocaComoPaquete(nombre)).toBe(prefijo);
  });

  it.each([
    ['java.util.Map', 'el compilador aún no la conoce (se carga si el programa la usa, con el chequeo ya hecho)'],
    ['java.util.Map.aula', 'idem como prefijo'],
    ['java.util.Scanner', 'una pública que NO está entre las conocidas de antemano'],
    ['java.io.File', 'idem'],
    ['java.io.PrintStream', 'idem'],
    ['java.io.FileSystem', 'una no pública fuera de java.lang'],
    ['java.util.ArraysParallelSortHelpers', 'idem'],
    ['java.util.Map$Entry', 'una anidada fuera de java.lang'],
    ['java.lang.reflect.Method', 'un paquete hermano de java.lang: solo java.lang se importa solo'],
    ['java.lang.ref.Reference', 'idem'],
    ['java.lang.Strin', 'un nombre que no existe'],
    ['java.lang.string', 'otra mayúscula'],
    ['java.lang', 'es un paquete, no una clase'],
    ['java.lang.invoke', 'idem'],
    ['miproyecto', 'un paquete propio de un solo segmento'],
    ['aula.java.lang.String', 'java.lang.String dentro de un paquete propio'],
    ['String', 'un solo segmento nunca se compara (javac no lo hace)'],
    ['', 'nada'],
  ])('«%s» NO choca (%s)', (nombre) => {
    expect(claseQueChocaComoPaquete(nombre)).toBeNull();
  });

  it('las claves del prototipo no cuentan (constructor.toString, __proto__.x, java.lang.constructor)', () => {
    expect(claseQueChocaComoPaquete('constructor.toString')).toBeNull();
    expect(claseQueChocaComoPaquete('__proto__.Object')).toBeNull();
    expect(claseQueChocaComoPaquete('java.lang.constructor')).toBeNull();
    expect(claseQueChocaComoPaquete('java.lang.__proto__.x')).toBeNull();
  });
});
