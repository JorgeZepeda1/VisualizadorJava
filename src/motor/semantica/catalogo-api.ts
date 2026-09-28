// Catálogo de biblioteca reconocida (tarea 1.8, REQ-SUB-005/007) sobre los hechos reales del JDK
// (tarea 1.9, ADR 010) — nunca una lista de miembros "soportados" escrita a mano sin cruzarla
// contra lo que el JDK realmente tiene (`catalogo-api.test.ts` lo verifica: cada entrada de
// `MIEMBROS_SOPORTADOS` DEBE existir en `FIRMAS_JDK`). El catálogo REAL de sobrecargas (2.15,
// design.md §7.3) reemplaza este archivo — aquí es el "stub" que menciona el GREEN de 1.8: no una
// tabla simulada, sino la superficie exacta de REQ-SUB-005 sobre datos reales, ya usable para
// resolver sobrecargas (1.8) y reconocer miembros NO-DISP (REQ-SUB-007).
import { FIRMAS_JDK, type FirmaMiembro } from '../biblioteca/datos/firmas-jdk.generado.ts';

// REQ-SUB-005: la superficie exacta que el subconjunto reconoce. Cada clave es "Clase.miembro"
// ("Clase.<init>" para constructores). Deliberadamente NO incluye `Long.parseLong` ni
// `Scanner.nextLong` (REQ-SUB-002 los excluye a propósito) ni ningún trascendente de `Math`.
export const MIEMBROS_SOPORTADOS: ReadonlySet<string> = new Set([
  // System.out/System.err (PrintStream) — print/println completos (tarea 1.8, pendiente heredado
  // 2); printf reconocido sintácticamente (semántica de formato: fuera de 1.8, biblioteca-java).
  'PrintStream.print',
  'PrintStream.println',
  'PrintStream.printf',
  // String.format (biblioteca-java, formato completo fuera de 1.8; aquí solo se reconoce el miembro).
  'String.format',
  // Scanner — REQ-SUB-005.
  'Scanner.<init>',
  'Scanner.nextInt',
  'Scanner.nextDouble',
  'Scanner.nextBoolean',
  'Scanner.next',
  'Scanner.nextLine',
  'Scanner.close',
  // Math — REQ-SUB-005.
  'Math.abs',
  'Math.max',
  'Math.min',
  'Math.pow',
  'Math.sqrt',
  'Math.round',
  'Math.floor',
  'Math.ceil',
  'Math.random',
  'Math.PI',
  'Math.E',
  // String — REQ-SUB-005.
  'String.length',
  'String.charAt',
  'String.substring',
  'String.indexOf',
  'String.equals',
  'String.equalsIgnoreCase',
  'String.compareTo',
  'String.toUpperCase',
  'String.toLowerCase',
  'String.trim',
  'String.isEmpty',
  'String.contains',
  'String.startsWith',
  'String.endsWith',
  'String.replace',
  'String.valueOf',
  'String.<init>',
  // Character — REQ-SUB-005.
  'Character.isDigit',
  'Character.isLetter',
  'Character.isLetterOrDigit',
  'Character.isUpperCase',
  'Character.isLowerCase',
  'Character.isWhitespace',
  'Character.toUpperCase',
  'Character.toLowerCase',
  // Integer/Double/Long — REQ-SUB-005 (Long SOLO las constantes: nunca parseLong).
  'Integer.parseInt',
  'Integer.MAX_VALUE',
  'Integer.MIN_VALUE',
  'Double.parseDouble',
  'Double.MAX_VALUE',
  'Double.MIN_VALUE',
  'Long.MAX_VALUE',
  'Long.MIN_VALUE',
  // Random — REQ-SUB-005.
  'Random.<init>',
  'Random.nextInt',
  'Random.nextDouble',
  'Random.nextBoolean',
]);

export type ClasificacionMiembro = 'soportado' | 'existe-no-soportado' | 'no-existe';

/** Pura: clasifica `Clase.miembro` contra el catálogo real del JDK (1.9) y la superficie
 * soportada (REQ-SUB-005) — nunca sobre lo que "debería" existir, siempre sobre lo que el
 * oráculo observó de verdad. */
export function clasificarMiembro(clase: string, nombre: string): ClasificacionMiembro {
  const existe = FIRMAS_JDK.some((f) => f.clase === clase && f.nombre === nombre);
  if (!existe) return 'no-existe';
  return MIEMBROS_SOPORTADOS.has(`${clase}.${nombre}`) ? 'soportado' : 'existe-no-soportado';
}

/** Todas las firmas reales (todas las sobrecargas) de `Clase.miembro`, soportado o no. */
export function buscarFirmas(clase: string, nombre: string): readonly FirmaMiembro[] {
  return FIRMAS_JDK.filter((f) => f.clase === clase && f.nombre === nombre);
}
