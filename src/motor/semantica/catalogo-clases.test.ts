// Tarea 1.29 (causa 2, agregada por el orquestador): «¿existe esta clase en el JDK?» sobre la lista
// que generó el oráculo (`clases-jdk.generado.ts`, ADR 010) — lo que separa el aviso «esta clase
// existe pero todavía no la simulo» (`import java.util.Locale;`, `JOptionPane`, `StringBuilder`) del
// error «esta clase no existe» (`import java.util.Scaner;`). La lista cubre lo que javac 17 ve por
// omisión (todo módulo que exporta API, java.* y jdk.* salvo los incubadores) y solo los tipos que
// se pueden importar: públicos, con todos sus tipos envolventes públicos, fuera de la vista previa.
import { describe, expect, it } from 'vitest';
import { clasesDelPaquete, existeClaseDelJdk } from './catalogo-clases.ts';

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
