// Escenarios de excepción de la biblioteca (hito 1, parte A; tarea 2.14, design.md §3.6): cada uno es un programa REAL de una sola línea de `main` que el JDK 17 corre y cuya `stderr`
// guardamos tal cual. De ahí salen (a) la tabla `sitio → clase y marcos de java.base` que el motor usa en ejecución (`src/motor/biblioteca/datos/marcos-de-pila.generado.ts`) y (b) el
// golden con el que `pruebas/diferencial/biblioteca/excepciones.test.ts` compara el texto completo que arma la biblioteca. Nada de esto se escribe a mano: solo se ENUMERAN las
// situaciones; lo que contesta Java lo mide el oráculo (ADR 010).
//
// `sitio` es la clave que la biblioteca usa al lanzar (`crearExcepcion(sitio, mensaje)`): operación, modo de falla y, cuando cambia el mensaje o los marcos, el *coder* de la cadena.
// Varios escenarios pueden compartir `sitio` (distintas entradas, mismos marcos): el generador exige que sus marcos coincidan.

export interface EscenarioDeExcepcion {
  readonly id: string;
  readonly sitio: string;
  /** Las sentencias del `main`, en UNA línea (así el marco del alumno siempre dice `Prueba.java:5`). */
  readonly cuerpo: string;
  /** Lo que el programa lee de `System.in`. */
  readonly entrada: string;
}

/** La línea de `Prueba.java` donde cae el `main` de cada escenario (ver `programaDelEscenario`). */
export const LINEA_DEL_CUERPO = 5;
export const CLASE_DE_LOS_ESCENARIOS = 'Prueba';

export function programaDelEscenario(escenario: EscenarioDeExcepcion): string {
  return [
    'import java.util.Random;',
    'import java.util.Scanner;',
    `public class ${CLASE_DE_LOS_ESCENARIOS} {`,
    '    public static void main(String[] args) {',
    `        ${escenario.cuerpo}`,
    '    }',
    '}',
    '',
  ].join('\n');
}

function escenario(id: string, sitio: string, cuerpo: string, entrada = ''): EscenarioDeExcepcion {
  return { id, sitio, cuerpo, entrada };
}

const SCANNER = 'Scanner sc = new Scanner(System.in);';

function deScanner(operacion: string, modo: string, instruccion: string, entrada: string, id = `${operacion}-${modo}`): EscenarioDeExcepcion {
  return escenario(`scanner-${id}`, `Scanner.${operacion}/${modo}`, `${SCANNER} ${instruccion}`, entrada);
}

const ESCENARIOS_DE_SCANNER: readonly EscenarioDeExcepcion[] = [
  deScanner('nextInt', 'sin-token', 'int n = sc.nextInt();', ''),
  deScanner('nextInt', 'no-coincide', 'int n = sc.nextInt();', 'abc\n'),
  deScanner('nextInt', 'no-coincide', 'int n = sc.nextInt();', '3.5\n', 'nextInt-no-coincide-decimal'),
  deScanner('nextInt', 'fuera-de-rango', 'int n = sc.nextInt();', '99999999999\n'),
  deScanner('nextInt', 'cerrado', 'sc.close(); int n = sc.nextInt();', ''),
  deScanner('nextDouble', 'sin-token', 'double d = sc.nextDouble();', ''),
  deScanner('nextDouble', 'no-coincide', 'double d = sc.nextDouble();', 'abc\n'),
  deScanner('nextDouble', 'no-coincide', 'double d = sc.nextDouble();', '3,5\n', 'nextDouble-no-coincide-coma'),
  deScanner('nextDouble', 'no-numerico', 'double d = sc.nextDouble();', '+∞\n'),
  deScanner('nextDouble', 'cerrado', 'sc.close(); double d = sc.nextDouble();', ''),
  deScanner('nextBoolean', 'sin-token', 'boolean b = sc.nextBoolean();', ''),
  deScanner('nextBoolean', 'no-coincide', 'boolean b = sc.nextBoolean();', 'si\n'),
  deScanner('nextBoolean', 'cerrado', 'sc.close(); boolean b = sc.nextBoolean();', ''),
  deScanner('next', 'sin-token', 'String s = sc.next();', ''),
  deScanner('next', 'cerrado', 'sc.close(); String s = sc.next();', ''),
  deScanner('nextLine', 'sin-linea', 'String s = sc.nextLine();', ''),
  deScanner('nextLine', 'cerrado', 'sc.close(); String s = sc.nextLine();', ''),
  deScanner('hasNext', 'cerrado', 'sc.close(); boolean b = sc.hasNext();', ''),
  deScanner('hasNextInt', 'cerrado', 'sc.close(); boolean b = sc.hasNextInt();', ''),
  deScanner('hasNextDouble', 'cerrado', 'sc.close(); boolean b = sc.hasNextDouble();', ''),
  deScanner('hasNextLine', 'cerrado', 'sc.close(); boolean b = sc.hasNextLine();', ''),
];

const ESCENARIOS_DE_STRING: readonly EscenarioDeExcepcion[] = [
  escenario('string-charAt-latin1', 'String.charAt/latin1', 'String s = "abc"; char c = s.charAt(5);'),
  escenario('string-charAt-latin1-negativo', 'String.charAt/latin1', 'String s = "abc"; char c = s.charAt(-1);'),
  escenario('string-charAt-latin1-limite', 'String.charAt/latin1', 'String s = "abc"; char c = s.charAt(3);'),
  escenario('string-charAt-latin1-vacia', 'String.charAt/latin1', 'String s = ""; char c = s.charAt(0);'),
  escenario('string-charAt-utf16', 'String.charAt/utf16', 'String s = "€bc"; char c = s.charAt(5);'),
  escenario('string-charAt-utf16-negativo', 'String.charAt/utf16', 'String s = "€bc"; char c = s.charAt(-1);'),
  escenario('string-substring1-mayor', 'String.substring1/mayor', 'String s = "abc"; String t = s.substring(5);'),
  escenario('string-substring1-negativo', 'String.substring1/negativo', 'String s = "abc"; String t = s.substring(-1);'),
  escenario('string-substring1-utf16', 'String.substring1/mayor', 'String s = "€bc"; String t = s.substring(5);'),
  escenario('string-substring2-fin-mayor', 'String.substring2/fin-mayor', 'String s = "abc"; String t = s.substring(1, 10);'),
  escenario('string-substring2-inicio-negativo', 'String.substring2/inicio-negativo', 'String s = "abc"; String t = s.substring(-1, 2);'),
  escenario('string-substring2-inicio-mayor-que-fin', 'String.substring2/inicio-mayor-que-fin', 'String s = "abcdef"; String t = s.substring(4, 2);'),
  escenario('string-substring2-fin-negativo', 'String.substring2/fin-negativo', 'String s = "abc"; String t = s.substring(0, -1);'),
];

const ESCENARIOS_DE_NUMEROS: readonly EscenarioDeExcepcion[] = [
  escenario('aritmetica-division-entera', 'Aritmetica/division-entera', 'int a = 5; int b = 0; int c = a / b;'),
  escenario('aritmetica-modulo-entero', 'Aritmetica/division-entera', 'int a = 5; int b = 0; int c = a % b;'),
  escenario('aritmetica-division-long', 'Aritmetica/division-entera', 'long a = 5L; long b = 0L; long c = a / b;'),
  escenario('integer-parseInt-letras', 'Integer.parseInt/digito-invalido', 'int n = Integer.parseInt("abc");'),
  escenario('integer-parseInt-decimal', 'Integer.parseInt/digito-invalido', 'int n = Integer.parseInt("3.5");'),
  escenario('integer-parseInt-letra-al-final', 'Integer.parseInt/digito-invalido', 'int n = Integer.parseInt("12x");'),
  escenario('integer-parseInt-con-signo-y-letra', 'Integer.parseInt/digito-invalido', 'int n = Integer.parseInt("-5x");'),
  escenario('integer-parseInt-espacios', 'Integer.parseInt/inicio-invalido', 'int n = Integer.parseInt(" 5 ");'),
  escenario('integer-parseInt-punto-al-inicio', 'Integer.parseInt/inicio-invalido', 'int n = Integer.parseInt(".5");'),
  escenario('integer-parseInt-vacio', 'Integer.parseInt/vacio', 'int n = Integer.parseInt("");'),
  escenario('integer-parseInt-solo-menos', 'Integer.parseInt/solo-signo', 'int n = Integer.parseInt("-");'),
  escenario('integer-parseInt-solo-mas', 'Integer.parseInt/solo-signo', 'int n = Integer.parseInt("+");'),
  escenario('integer-parseInt-muy-largo', 'Integer.parseInt/digito-invalido', 'int n = Integer.parseInt("99999999999");'),
  escenario('integer-parseInt-justo-fuera-de-rango', 'Integer.parseInt/desborde-final', 'int n = Integer.parseInt("2147483648");'),
  escenario('integer-parseInt-justo-fuera-de-rango-negativo', 'Integer.parseInt/desborde-final', 'int n = Integer.parseInt("-2147483649");'),
  escenario('double-parseDouble-letras', 'Double.parseDouble/no-es-numero', 'double d = Double.parseDouble("abc");'),
  escenario('double-parseDouble-coma', 'Double.parseDouble/no-es-numero', 'double d = Double.parseDouble("1,5");'),
  escenario('double-parseDouble-vacio', 'Double.parseDouble/vacio', 'double d = Double.parseDouble("");'),
  escenario('double-parseDouble-en-blanco', 'Double.parseDouble/vacio', 'double d = Double.parseDouble("   ");'),
  escenario('random-nextInt-cero', 'Random.nextInt/cota-no-positiva', 'Random r = new Random(1); int n = r.nextInt(0);'),
  escenario('random-nextInt-negativa', 'Random.nextInt/cota-no-positiva', 'Random r = new Random(1); int n = r.nextInt(-5);'),
];

/**
 * Cada error de formato por las dos puertas que usa un alumno: `String.format` y `System.out.printf`. `modo` es la clase de falla (lo que fija los marcos de `Formatter`); `nombre`
 * distingue los argumentos que la provocan, para que el generador compruebe que da lo mismo con un `double` que con un `String`.
 */
function deFormato(modo: string, nombre: string, formato: string, argumentos: string): EscenarioDeExcepcion[] {
  return [
    escenario(`formato-${nombre}-string-format`, `Formatter/${modo}@String.format`, `String s = String.format(${formato}${argumentos});`),
    escenario(`formato-${nombre}-printf`, `Formatter/${modo}@printf`, `System.out.printf(${formato}${argumentos});`),
  ];
}

const ESCENARIOS_DE_FORMATO: readonly EscenarioDeExcepcion[] = [
  ...deFormato('conversion-incompatible-d', 'd-con-double', '"%d"', ', 3.5'),
  ...deFormato('conversion-incompatible-d', 'd-con-string', '"%d"', ', "hola"'),
  ...deFormato('conversion-incompatible-d', 'd-con-char', '"%d"', ", 'a'"),
  ...deFormato('conversion-incompatible-d', 'd-con-boolean', '"%d"', ', true'),
  ...deFormato('conversion-incompatible-f', 'f-con-int', '"%.2f"', ', 3'),
  ...deFormato('conversion-incompatible-f', 'f-con-string', '"%f"', ', "hola"'),
  ...deFormato('conversion-incompatible-f', 'f-con-long', '"%f"', ', 3L'),
  ...deFormato('conversion-incompatible-f', 'f-con-char', '"%f"', ", 'a'"),
  ...deFormato('conversion-incompatible-c', 'c-con-string', '"%c"', ', "hola"'),
  ...deFormato('conversion-incompatible-c', 'c-con-double', '"%c"', ', 3.5'),
  ...deFormato('falta-argumento', 'falta-argumento', '"%d y %d"', ', 1'),
  ...deFormato('falta-argumento', 'falta-argumento-s', '"%s"', ''),
  ...deFormato('conversion-desconocida', 'conversion-desconocida', '"%i"', ', 1'),
  ...deFormato('conversion-desconocida', 'conversion-desconocida-lf', '"%lf"', ', 1.5'),
  ...deFormato('conversion-desconocida-al-final', 'porcentaje-al-final', '"abc%"', ''),
  ...deFormato('especificador-incompleto', 'ancho-sin-conversion', '"%5"', ''),
  ...deFormato('especificador-incompleto', 'punto-sin-conversion', '"%."', ''),
  ...deFormato('especificador-incompleto', 'precision-sin-digitos', '"%.f"', ', 1.5'),
  ...deFormato('precision-con-d', 'precision-con-d', '"%.2d"', ', 1'),
  ...deFormato('precision-con-c', 'precision-con-c', '"%.2c"', ", 'a'"),
  ...deFormato('falta-ancho-general', 'falta-ancho-s', '"%-s"', ', "x"'),
  ...deFormato('falta-ancho-caracter', 'falta-ancho-c', '"%-c"', ", 'a'"),
  ...deFormato('falta-ancho-entero', 'falta-ancho', '"%-d"', ', 1'),
  ...deFormato('falta-ancho-entero', 'falta-ancho-cero', '"%0d"', ', 1'),
  ...deFormato('falta-ancho-decimal', 'falta-ancho-f', '"%-f"', ', 1.5'),
  ...deFormato('falta-ancho-decimal', 'falta-ancho-cero-f', '"%0f"', ', 1.5'),
  ...deFormato('bandera-incompatible-general', 'bandera-con-s', '"%,s"', ', "x"'),
  ...deFormato('bandera-incompatible-general', 'bandera-ceros-con-s', '"%05s"', ', "x"'),
  ...deFormato('bandera-incompatible-general', 'bandera-con-b', '"%,b"', ', true'),
  ...deFormato('bandera-incompatible-caracter', 'bandera-con-c', '"%,c"', ", 'a'"),
  ...deFormato('banderas-ilegales-entero', 'banderas-ilegales-d', '"%0-5d"', ', 1'),
  ...deFormato('banderas-ilegales-decimal', 'banderas-ilegales-f', '"%0-5f"', ', 1.5'),
  ...deFormato('bandera-repetida', 'bandera-repetida-d', '"%--5d"', ', 1'),
  ...deFormato('bandera-repetida', 'bandera-repetida-coma', '"%,,d"', ', 1'),
  ...deFormato('punto-de-codigo-invalido', 'punto-de-codigo-invalido', '"%c"', ', -1'),
  ...deFormato('punto-de-codigo-invalido', 'punto-de-codigo-demasiado-grande', '"%c"', ', 1114112'),
];

export const ESCENARIOS_DE_EXCEPCIONES: readonly EscenarioDeExcepcion[] = [
  ...ESCENARIOS_DE_SCANNER,
  ...ESCENARIOS_DE_STRING,
  ...ESCENARIOS_DE_NUMEROS,
  ...ESCENARIOS_DE_FORMATO,
];

export interface ResultadoDeEscenario {
  readonly id: string;
  readonly sitio: string;
  readonly cuerpo: string;
  readonly entrada: string;
  readonly clase: string;
  readonly mensaje: string | null;
  /** Los marcos de `java.base`, del más interno al más externo, SIN el marco del alumno. */
  readonly marcos: readonly string[];
  readonly stderr: string;
}

/**
 * Pura: la `stderr` de un escenario → clase, mensaje y marcos. Exige la forma exacta `Exception in thread "main" <clase>[: <mensaje>]` + `\tat <marco>` por línea, y que el último marco
 * sea el del alumno (`Prueba.main(Prueba.java:5)`): si no, el escenario no hizo lo que se esperaba y guardarlo inventaría un dato.
 */
export function analizarStderrDeEscenario(escenarioProbado: EscenarioDeExcepcion, stderr: string): ResultadoDeEscenario {
  const lineas = stderr.split('\n');
  const encabezado = lineas[0] ?? '';
  const coincidencia = /^Exception in thread "main" ([\w.$]+)(?:: (.*))?$/.exec(encabezado);
  if (coincidencia === null) {
    throw new Error(`El escenario ${escenarioProbado.id} no terminó con una excepción: stderr = ${JSON.stringify(stderr.slice(0, 300))}`);
  }
  const marcosCrudos = lineas.slice(1).filter((linea) => linea !== '');
  if (marcosCrudos.some((linea) => !linea.startsWith('\tat '))) {
    throw new Error(`El escenario ${escenarioProbado.id} tiene líneas de pila inesperadas (¿"Caused by"?): ${JSON.stringify(stderr.slice(0, 600))}`);
  }
  const marcos = marcosCrudos.map((linea) => linea.slice('\tat '.length));
  const marcoEsperadoDelAlumno = `${CLASE_DE_LOS_ESCENARIOS}.main(${CLASE_DE_LOS_ESCENARIOS}.java:${LINEA_DEL_CUERPO})`;
  if (marcos[marcos.length - 1] !== marcoEsperadoDelAlumno) {
    throw new Error(`El escenario ${escenarioProbado.id} no terminó en el marco del alumno (${marcoEsperadoDelAlumno}): ${JSON.stringify(marcos)}`);
  }
  return {
    ...escenarioProbado,
    clase: coincidencia[1] as string,
    mensaje: coincidencia[2] ?? null,
    marcos: marcos.slice(0, -1),
    stderr,
  };
}
