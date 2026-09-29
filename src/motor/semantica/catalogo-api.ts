// Catálogo de biblioteca reconocida (tarea 1.8, REQ-SUB-005/007) sobre los hechos reales del JDK
// (tarea 1.9, ADR 010) — nunca una lista de miembros "soportados" escrita a mano sin cruzarla
// contra lo que el JDK realmente tiene (`catalogo-api.test.ts` lo verifica: cada entrada de
// `MIEMBROS_SOPORTADOS` DEBE existir en `FIRMAS_JDK`). No es un simulacro provisional: es la
// superficie EXACTA de REQ-SUB-005 (qué miembros del JDK reconoce este subconjunto) calculada
// sobre datos reales del oráculo, ya usable tal cual para resolver sobrecargas (1.8) y reconocer
// miembros NO-DISP (REQ-SUB-007). El catálogo de sobrecargas de EJECUCIÓN (2.15, design.md §7.3)
// es trabajo aparte, sobre estos mismos hechos del JDK.
import { FIRMAS_JDK, type FirmaMiembro } from '../biblioteca/datos/firmas-jdk.generado.ts';

// REQ-SUB-005: la superficie exacta que el subconjunto reconoce. Cada clave es "Clase.miembro"
// ("Clase.<init>" para constructores). Deliberadamente NO incluye `Long.parseLong` ni
// `Scanner.nextLong` (REQ-SUB-002 los excluye a propósito) ni ningún trascendente de `Math`.
export const MIEMBROS_SOPORTADOS: ReadonlySet<string> = new Set([
  // System.in/System.out/System.err — REQ-SUB-005 exige "un único new Scanner(System.in)"
  // (System.in, campo real de System, genero:'campo') — sin esta entrada, la conexión de la
  // biblioteca a la atribución (sub-lote 1-D2c) clasificaba "System.in" como NO-DISP y rompía el
  // patrón MÁS básico del currículo. "out"/"err" se agregan por la misma razón — son el MISMO tipo
  // de campo (java.io.PrintStream) y el propio print/println completo ya listado abajo los da por
  // soportados; "System.out.println(...)" normalmente ni pasa por aquí (gramática dedicada,
  // analizador-sintactico.ts) pero "System.err.println(...)" SÍ (esInicioDeImpresion solo reconoce
  // "out", a propósito, pendiente heredado 2 de 1.8) y necesita el mismo campo real para no
  // rechazar de más el receptor.
  'System.in',
  'System.out',
  'System.err',
  // System.out/System.err (PrintStream) — print/println completos (tarea 1.8, pendiente heredado
  // 2); printf reconocido sintácticamente (semántica de formato: fuera de 1.8, biblioteca-java).
  'PrintStream.print',
  'PrintStream.println',
  'PrintStream.printf',
  // String.format (biblioteca-java, formato completo fuera de 1.8; aquí solo se reconoce el miembro).
  'String.format',
  // Scanner — REQ-SUB-005. Constructor: ver `CONSTRUCTORES_SOPORTADOS` (abajo), NUNCA aquí —
  // "Scanner.<init>" en ESTA lista diría "cualquier constructor real de Scanner está soportado",
  // falso (REQ-SUB-005 exige el ÚNICO "new Scanner(System.in)"; "new Scanner(String)" existe en
  // el JDK real pero está fuera del subconjunto — sub-lote 1-D3, ver el informe de la sesión).
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
  // String.<init>: mismo motivo que Scanner arriba — ver `CONSTRUCTORES_SOPORTADOS` ("new
  // String(texto)" soportado; "new String(char[])"/"new String(byte[])"/etc. NO).
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
  'Random.nextInt',
  'Random.nextDouble',
  'Random.nextBoolean',
]);

// Sub-lote 1-D3 (JLS 15.9, REQ-SUB-005): la superficie EXACTA de constructores soportados — a
// diferencia de `MIEMBROS_SOPORTADOS` (granularidad de NOMBRE: cualquier sobrecarga real de un
// método soportado cuenta como soportada, 1.8/1.19), un constructor se filtra por FIRMA completa
// (clase + lista de parámetros) porque REQ-SUB-005 es explícito: "un único new
// Scanner(System.in)", "new String(texto)" — nunca "cualquier constructor de Scanner/String".
// Clave "Clase(tipo1,tipo2,...)" con los MISMOS nombres reflejados que trae
// `FirmaMiembro.parametros` (p. ej. "java.io.InputStream") — para casar exacto contra la firma
// que `resolverSobrecarga` YA resolvió (visitarNuevaInstancia, atribucion.ts), nunca una segunda
// tabla de tipos que podría divergir.
export const CONSTRUCTORES_SOPORTADOS: ReadonlySet<string> = new Set([
  'Scanner(java.io.InputStream)',
  'Random()',
  'Random(long)',
  'String(java.lang.String)',
]);

export type ClasificacionMiembro = 'soportado' | 'existe-no-soportado' | 'no-existe';

/** Pura: clasifica `Clase.miembro` contra el catálogo real del JDK (1.9) y la superficie
 * soportada (REQ-SUB-005) — nunca sobre lo que "debería" existir, siempre sobre lo que el
 * oráculo observó de verdad. Genero-AGNÓSTICA a propósito (mezcla campos y métodos del mismo
 * nombre): correcta para "¿existe ALGO llamado Clase.miembro?", pero quien resuelve una llamada
 * real o un acceso de valor real necesita `clasificarMetodo`/`clasificarCampo` (abajo, sub-lote
 * 1-D2c) — javac separa campos y métodos en espacios de nombres distintos (JLS 6.5.6). */
export function clasificarMiembro(clase: string, nombre: string): ClasificacionMiembro {
  const existe = FIRMAS_JDK.some((f) => f.clase === clase && f.nombre === nombre);
  if (!existe) return 'no-existe';
  return MIEMBROS_SOPORTADOS.has(`${clase}.${nombre}`) ? 'soportado' : 'existe-no-soportado';
}

// Sub-lote 1-D2c: conecta `sobrecargas.ts`/`catalogo-api.ts` a `atribucion.ts` (hueco flageado por
// 1-D2b, `task_c0cf2e6c`). Cada llamada a método y cada acceso a miembro de una clase de
// biblioteca debe resolverse contra el catálogo real — pero javac resuelve MÉTODOS (JLS 6.5.6.2,
// invocación con "(...)") y CAMPOS (JLS 6.5.6.1, valor sin paréntesis) en espacios de nombres
// SEPARADOS: un campo del nombre correcto NUNCA cuenta como método aplicable, y viceversa.
// Verificado contra javac 17 real (carpeta temporal, borrada tras verificar):
//   `Math.PI()` (el CAMPO `Math.PI` llamado como si fuera método) -> "cannot find symbol: method PI()"
//   `s.length` (el MÉTODO `String.length()` usado sin paréntesis, como si fuera campo) -> "cannot find symbol: variable length"
// Sin este filtro por `genero`, `clasificarMiembro`/`buscarFirmas` (genero-agnósticos, por diseño
// de 1.8/1.9) dirían "soportado" en ambos casos — un falso negativo real (D2: nunca sea más
// permisivo que javac).

/** Como `clasificarMiembro`, pero restringida a MÉTODOS y CONSTRUCTORES (JLS 15.12, invocación):
 * un campo del mismo nombre nunca resuelve una llamada `objeto.nombre(...)`. */
export function clasificarMetodo(clase: string, nombre: string): ClasificacionMiembro {
  const existe = FIRMAS_JDK.some((f) => f.clase === clase && f.nombre === nombre && f.genero !== 'campo');
  if (!existe) return 'no-existe';
  return MIEMBROS_SOPORTADOS.has(`${clase}.${nombre}`) ? 'soportado' : 'existe-no-soportado';
}

/** Como `clasificarMiembro`, pero restringida a CAMPOS (JLS 6.5.6.1, acceso de valor sin
 * paréntesis): un método del mismo nombre nunca resuelve un acceso `objeto.nombre` (sin llamar). */
export function clasificarCampo(clase: string, nombre: string): ClasificacionMiembro {
  const existe = FIRMAS_JDK.some((f) => f.clase === clase && f.nombre === nombre && f.genero === 'campo');
  if (!existe) return 'no-existe';
  return MIEMBROS_SOPORTADOS.has(`${clase}.${nombre}`) ? 'soportado' : 'existe-no-soportado';
}

/** Todas las firmas reales (todas las sobrecargas) de `Clase.miembro`, soportado o no. */
export function buscarFirmas(clase: string, nombre: string): readonly FirmaMiembro[] {
  return FIRMAS_JDK.filter((f) => f.clase === clase && f.nombre === nombre);
}
