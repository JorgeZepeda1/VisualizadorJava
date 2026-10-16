// Tarea 1.34 (la matriz de nombres de `Object.prototype`): datos de las pruebas «un nombre que JavaScript trae en TODOS sus objetos no rompe nada».
//
// El motor está escrito en TypeScript y corre en un navegador: una tabla del motor que sea un objeto plano (`{ in: …, out: … }`) hereda las
// propiedades de `Object.prototype`, así que buscar en ella un nombre que escribió el alumno —`constructor`, `toString`, `valueOf`,
// `hasOwnProperty`, `__proto__`, `isPrototypeOf`, `propertyIsEnumerable`, `toLocaleString`— no da «no está» sino una FUNCIÓN. La re-verificación del
// lote 1 lo encontró en `System.toString` como argumento (`compilar()` lanzaba `TypeError: campo.lastIndexOf is not a function`), y la 1.34, al
// auditar todas las tablas, en el analizador de expresiones: `int a = 1 constructor 2;` se leía como una suma de un operador llamado `constructor`.
//
// Cada PLANTILLA es un programa completo con el hueco `NOMBRE` en una posición distinta (variable, método, campo, clase, miembro de `System`,
// `Math`, `Integer`, `String` o `PrintStream`, tipo, operador, argumento de cada tipo de llamada, etiqueta, importación…). `programaDePrototipo`
// arma el programa; `COMPILAN_EN_JAVAC` guarda, por plantilla, con qué nombres lo COMPILA javac 17.0.18 (el resto lo rechaza): son datos que
// salieron de javac, nunca derivados del motor. `tablas-de-prototipo.test.ts` (sin JDK, `npm test`) exige que `compilar()` jamás lance y que su
// veredicto no contradiga al de javac; `herramientas/oraculo/tablas-de-prototipo.test.ts` (con JDK) vuelve a preguntárselo a javac celda por celda.

/** Las propiedades de `Object.prototype` de JavaScript (`Object.getOwnPropertyNames(Object.prototype)`), más `__defineGetter__` y sus tres hermanas. */
export const NOMBRES_DE_OBJECT_PROTOTYPE: readonly string[] = [
  'constructor',
  'toString',
  'valueOf',
  'hasOwnProperty',
  '__proto__',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
];

/** Otros nombres que en JavaScript significan algo y en Java son identificadores comunes, más dos controles (`foo`, `Math`). */
export const NOMBRES_DE_JAVASCRIPT: readonly string[] = ['prototype', 'length', 'name', 'undefined', 'NaN', 'Infinity', 'function', 'delete', 'typeof', 'in', 'foo'];

export const NOMBRES_DE_LA_MATRIZ: readonly string[] = [...NOMBRES_DE_OBJECT_PROTOTYPE, ...NOMBRES_DE_JAVASCRIPT];

export interface PlantillaDePrototipo {
  /** Clave estable de la plantilla. */
  readonly id: string;
  /** Qué posición del programa ocupa el nombre (para el mensaje de una falla). */
  readonly posicion: string;
  /** El programa completo con el nombre puesto. */
  readonly fuente: (nombre: string) => string;
}

function enMain(imports: string, cuerpo: (nombre: string) => string): (nombre: string) => string {
  return (nombre) => `${imports}public class P {\n    public static void main(String[] args) {\n        ${cuerpo(nombre)}\n    }\n}\n`;
}

const SCANNER = 'import java.util.Scanner;\n';

export const PLANTILLAS_DE_PROTOTIPO: readonly PlantillaDePrototipo[] = [
  // ---- El nombre es una VARIABLE (declarada, usada, asignada, de un `for`, `final`, sin valor…). ----
  { id: 'variable-usada', posicion: 'una variable declarada y usada', fuente: enMain('', (n) => `int ${n} = 5; System.out.println(${n} + 1);`) },
  { id: 'variable-incrementada', posicion: 'una variable con ++ y +=', fuente: enMain('', (n) => `int ${n} = 5; ${n}++; ${n} += 2;`) },
  { id: 'variable-de-texto', posicion: 'una variable de texto con un método', fuente: enMain('', (n) => `String ${n} = "a"; int k = ${n}.length();`) },
  { id: 'variable-de-for', posicion: 'la variable de un for', fuente: enMain('', (n) => `for (int ${n} = 0; ${n} < 3; ${n}++) { }`) },
  { id: 'variable-final-reasignada', posicion: 'una final que se reasigna', fuente: enMain('', (n) => `final int ${n} = 1; ${n} = 2;`) },
  { id: 'variable-sin-valor', posicion: 'una variable sin valor que se lee', fuente: enMain('', (n) => `int ${n}; System.out.println(${n});`) },
  { id: 'variable-scanner', posicion: 'un Scanner llamado así', fuente: enMain(SCANNER, (n) => `Scanner ${n} = new Scanner(System.in); int x = ${n}.nextInt();`) },
  { id: 'variable-no-declarada', posicion: 'una variable que nunca se declaró', fuente: enMain('', (n) => `int a = ${n};`) },
  { id: 'asignacion-no-declarada', posicion: 'el destino de una asignación sin declarar', fuente: enMain('', (n) => `${n} = 5;`) },
  { id: 'parametro-de-main', posicion: 'el parámetro de main', fuente: (n) => `public class P {\n    public static void main(String[] ${n}) {\n        System.out.println(1);\n    }\n}\n` },
  // ---- El nombre es un MÉTODO. ----
  { id: 'metodo-propio', posicion: 'una llamada a un método que no existe', fuente: enMain('', (n) => `${n}(1);`) },
  { id: 'metodo-de-texto', posicion: 'un método de un String', fuente: enMain('', (n) => `String s = "a"; int y = s.${n}();`) },
  { id: 'campo-de-texto', posicion: 'un campo de un String', fuente: enMain('', (n) => `String s = "a"; int y = s.${n};`) },
  { id: 'metodo-de-math', posicion: 'un método de Math', fuente: enMain('', (n) => `int y = Math.${n}(1);`) },
  { id: 'campo-de-math', posicion: 'un campo de Math', fuente: enMain('', (n) => `int y = Math.${n};`) },
  { id: 'metodo-de-integer', posicion: 'un método de Integer', fuente: enMain('', (n) => `Integer.${n}("5");`) },
  { id: 'campo-de-integer', posicion: 'un campo de Integer', fuente: enMain('', (n) => `int z = Integer.${n};`) },
  { id: 'metodo-de-printstream', posicion: 'un método de System.out', fuente: enMain('', (n) => `System.out.${n}(1);`) },
  { id: 'metodo-de-system-err', posicion: 'un método de System.err', fuente: enMain('', (n) => `System.err.${n}(1);`) },
  { id: 'campo-de-printstream', posicion: 'un campo de System.out', fuente: enMain('', (n) => `System.out.${n}.println(1);`) },
  { id: 'campo-de-system-con-miembro', posicion: 'un campo de System seguido de out', fuente: enMain('', (n) => `System.${n}.out.println(1);`) },
  { id: 'campo-de-system-en-declaracion', posicion: 'un campo de System en una declaración', fuente: enMain('', (n) => `int x = System.${n};`) },
  // ---- El nombre es un campo de `System` pasado como ARGUMENTO (7 posiciones: la 1.34 repara el TypeError de `tipos.ts`). ----
  { id: 'argumento-de-new-scanner', posicion: 'argumento de new Scanner(...)', fuente: enMain(SCANNER, (n) => `Scanner sc = new Scanner(System.${n});`) },
  { id: 'argumento-de-math-abs', posicion: 'argumento de Math.abs(...)', fuente: enMain('', (n) => `int a = Math.abs(System.${n});`) },
  { id: 'argumento-de-parseint', posicion: 'argumento de Integer.parseInt(...)', fuente: enMain('', (n) => `int a = Integer.parseInt(System.${n});`) },
  { id: 'argumento-de-equals', posicion: 'argumento de String.equals(...)', fuente: enMain('', (n) => `String s = "a"; boolean b = s.equals(System.${n});`) },
  { id: 'argumento-de-nextint', posicion: 'argumento de Scanner.nextInt(...)', fuente: enMain(SCANNER, (n) => `Scanner sc = new Scanner(System.in); int a = sc.nextInt(System.${n});`) },
  { id: 'argumento-de-printf', posicion: 'argumento de printf', fuente: enMain('', (n) => `System.out.printf(System.${n});`) },
  { id: 'argumento-de-valueof', posicion: 'argumento de String.valueOf(...)', fuente: enMain('', (n) => `String s = String.valueOf(System.${n});`) },
  { id: 'argumento-de-println', posicion: 'argumento de println', fuente: enMain('', (n) => `System.out.println(System.${n});`) },
  { id: 'operando-de-suma', posicion: 'operando de una suma', fuente: enMain('', (n) => `int a = 1 + System.${n};`) },
  // ---- El nombre es un OPERADOR sospechoso: aparece entre dos operandos o detrás de uno (la 1.34 repara el analizador de expresiones). ----
  { id: 'entre-dos-literales', posicion: 'entre dos literales, donde iría un operador', fuente: enMain('', (n) => `int a = 1 ${n} 2;`) },
  { id: 'tras-una-suma', posicion: 'tras una suma', fuente: enMain('', (n) => `int a = 1 + 2 ${n} 3;`) },
  { id: 'entre-comparaciones', posicion: 'entre dos comparaciones', fuente: enMain('', (n) => `boolean b = (1 < 2) ${n} (2 > 1);`) },
  { id: 'tras-una-variable', posicion: 'tras una variable, donde iría un nombre de variable nueva', fuente: enMain('', (n) => `int a = 5; a ${n};`) },
  { id: 'entre-llamadas', posicion: 'entre dos llamadas', fuente: enMain('', (n) => `int a = Math.abs(1) ${n} Math.abs(2);`) },
  // ---- El nombre es un TIPO, una CLASE, una IMPORTACIÓN, una etiqueta o el texto de un case. ----
  { id: 'tipo-de-variable', posicion: 'el tipo de una variable', fuente: enMain('', (n) => `${n} x = 5;`) },
  { id: 'new-de-un-tipo', posicion: 'el tipo de un new', fuente: enMain('', (n) => `int x = new ${n}();`) },
  { id: 'cast-a-un-tipo', posicion: 'el tipo de un cast', fuente: enMain('', (n) => `int x = (${n}) 5;`) },
  { id: 'nombre-de-la-clase', posicion: 'el nombre de la clase', fuente: (n) => `public class ${n} {\n    public static void main(String[] args) {\n        System.out.println("x");\n    }\n}\n` },
  { id: 'clase-con-uso-propio', posicion: 'el nombre de la clase, usado como receptor', fuente: (n) => `public class ${n} {\n    public static void main(String[] args) {\n        ${n}.main(args);\n    }\n}\n` },
  { id: 'importacion-de-java-util', posicion: 'una importación de java.util', fuente: (n) => `import java.util.${n};\npublic class P {\n    public static void main(String[] args) { }\n}\n` },
  { id: 'importacion-de-paquete', posicion: 'el paquete de una importación', fuente: (n) => `import ${n}.Scanner;\npublic class P {\n    public static void main(String[] args) { }\n}\n` },
  { id: 'etiqueta-de-bucle', posicion: 'una etiqueta de un bucle', fuente: enMain('', (n) => `${n}: while (true) { break ${n}; }`) },
  { id: 'texto-de-un-case', posicion: 'el texto de un case', fuente: enMain('', (n) => `String s = "a"; switch (s) { case "${n}": break; default: break; }`) },
  { id: 'variable-en-un-case', posicion: 'una constante usada como case', fuente: enMain('', (n) => `final int ${n} = 1; int x = 1; switch (x) { case ${n}: break; default: break; }`) },
];

export function programaDePrototipo(plantilla: PlantillaDePrototipo, nombre: string): string {
  return plantilla.fuente(nombre);
}

/**
 * Por plantilla, con qué nombres de `NOMBRES_DE_LA_MATRIZ` COMPILA javac 17.0.18 el programa: `'todos'`, o la lista de los que sí (con el resto lo
 * rechaza; `[]`: con ninguno). Datos de javac, no del motor: `herramientas/oraculo/tablas-de-prototipo.test.ts` los vuelve a medir. Un `Map` (no un
 * objeto plano) por la misma razón que esta tabla existe. Medición de la tarea 1.34: 46 plantillas × 23 nombres = 1 058 programas, javac compila 259.
 */
export const COMPILAN_EN_JAVAC: ReadonlyMap<string, 'todos' | readonly string[]> = new Map<string, 'todos' | readonly string[]>([
  ['variable-usada', 'todos'],
  ['variable-incrementada', 'todos'],
  ['variable-de-texto', 'todos'],
  ['variable-de-for', 'todos'],
  ['variable-final-reasignada', []],
  ['variable-sin-valor', []],
  ['variable-scanner', 'todos'],
  ['variable-no-declarada', []],
  ['asignacion-no-declarada', []],
  ['parametro-de-main', 'todos'],
  ['metodo-propio', []],
  ['metodo-de-texto', ['length']],
  ['campo-de-texto', []],
  ['metodo-de-math', []],
  ['campo-de-math', []],
  ['metodo-de-integer', ['valueOf']],
  ['campo-de-integer', []],
  ['metodo-de-printstream', []],
  ['metodo-de-system-err', []],
  ['campo-de-printstream', []],
  ['campo-de-system-con-miembro', []],
  ['campo-de-system-en-declaracion', []],
  ['argumento-de-new-scanner', ['in']],
  ['argumento-de-math-abs', []],
  ['argumento-de-parseint', []],
  ['argumento-de-equals', ['in']],
  ['argumento-de-nextint', []],
  ['argumento-de-printf', []],
  ['argumento-de-valueof', ['in']],
  ['argumento-de-println', ['in']],
  ['operando-de-suma', []],
  ['entre-dos-literales', []],
  ['tras-una-suma', []],
  ['entre-comparaciones', []],
  ['tras-una-variable', []],
  ['entre-llamadas', []],
  ['tipo-de-variable', []],
  ['new-de-un-tipo', []],
  ['cast-a-un-tipo', []],
  ['nombre-de-la-clase', 'todos'],
  ['clase-con-uso-propio', 'todos'],
  ['importacion-de-java-util', []],
  ['importacion-de-paquete', []],
  ['etiqueta-de-bucle', 'todos'],
  ['texto-de-un-case', 'todos'],
  ['variable-en-un-case', 'todos'],
]);
