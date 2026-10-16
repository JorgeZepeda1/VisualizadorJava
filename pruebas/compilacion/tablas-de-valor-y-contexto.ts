// Tarea 1.34 (cerrar por defecto): la matriz VALOR × CONTEXTO de la re-verificación independiente del lote 1.
//
// Cada programa pone UN valor (`i`, `args`, `System.in`, `System.out.println()`, `Math`, `null`, `new Object()`, `sc.nextInt()`, `(i = 3)`…) en UNA posición donde Java
// espera algo (inicializador de cada tipo, asignación simple y compuesta, operando de cada operador, condición, selector y etiqueta de `switch`, argumento de
// `println`/`Math.abs`/`Integer.parseInt`/`new Scanner`, cast a cada tipo, receptor de `.length()`/`.foo()`, sentencia suelta, `return`…). Son 40 valores × 81 contextos
// = 3240 programas, y la pregunta es siempre la misma: ¿`compilar()` coincide con `javac` 17? El defecto que cazó (el compilador tapaba en silencio una expresión cuyo
// tipo no conocía: `int x = System.in;`, `args.length()`, `System.in.nextInt()`) solo se ve con la combinación: ni la gramática del generador ni el corpus cubren cada valor en cada contexto.
//
// `COMPILA_EN_JAVAC_POR_VALOR` son DATOS que salieron de javac 17.0.18 (una fila por valor y un carácter por contexto, en el orden de las listas: `1` compila, `0` rechaza), nunca
// derivados del motor. `pruebas/compilacion/matriz-de-valores-y-contextos.test.ts` (sin JDK, `npm test`) exige que `compilar()` jamás lance y que su veredicto no contradiga el de la
// tabla; `herramientas/oraculo/matriz-de-valores-y-contextos.test.ts` (con JDK) vuelve a preguntárselo a javac, celda por celda, y compara además la LÍNEA cuando los dos rechazan.

/** Los valores: variables de cada tipo, `args`, los campos de `System`, nombres de clase, `null`, llamadas con y sin valor, `++`, una asignación usada como valor… */
export const VALORES_DE_LA_MATRIZ: readonly string[] = [
  'i', 'l', 'd', 'c', 'b', 's',
  'sc', 'r', 'args', 'args.length', 'args[0]', 'System.in',
  'System.out', 'System.err', 'System.out.println()', 'sc.close()', 'Math', 'System',
  'String', 'null', 'Math.PI', 'Integer.MAX_VALUE', 'new Object()', 'System.in.read()',
  'args.length()', 'new Scanner(System.in)', '"abc"', '5', 'sc.nextInt()', 's.length()',
  'Math.round(d)', '(int) d', 'i++', '(i = 3)', 'r.nextInt(5)', 's.charAt(0)',
  'Character.isDigit(c)', 'System.out.printf("a")', 'Integer.parseInt(s)', 'String.valueOf(i)',
];

/** Las posiciones: `$V` es el hueco del valor. */
export const CONTEXTOS_DE_LA_MATRIZ: readonly string[] = [
  'int t = $V;', 'long t = $V;', 'double t = $V;',
  'char t = $V;', 'boolean t = $V;', 'String t = $V;',
  'Scanner t = $V;', 'Random t = $V;', 'i = $V;',
  's = $V;', 'b = $V;', 'i += $V;',
  's += $V;', 'd *= $V;', 'b &= $V;',
  'int t = $V + i;', 'int t = i + $V;', 'String t = $V + s;',
  'String t = s + $V;', 'double t = $V * d;', 'double t = d / $V;',
  'int t = $V % i;', 'int t = i - $V;', 'boolean t = $V == i;',
  'boolean t = $V == s;', 'boolean t = $V == b;', 'boolean t = $V != d;',
  'boolean t = $V < i;', 'boolean t = d >= $V;', 'boolean t = $V == $V;',
  'boolean t = $V == null;', 'boolean t = $V && b;', 'boolean t = b || $V;',
  'boolean t = !$V;', 'int t = -$V;', 'int t = +$V;',
  'int t = ~$V;', '$V++;', '--$V;',
  'if ($V) { }', 'while ($V) { }', 'do { } while ($V);',
  'for (; $V; ) { break; }', 'switch ($V) { default: break; }', 'switch (i) { case $V: break; }',
  'System.out.println($V);', 'System.out.print($V);', 'System.out.printf("%s", $V);',
  'Math.abs($V);', 'Math.sqrt($V);', 'Math.max($V, i);',
  'Integer.parseInt($V);', 'Double.parseDouble($V);', 'String.valueOf($V);',
  's.charAt($V);', 's.substring($V);', 's.equals($V);',
  's.indexOf($V);', 'Character.isDigit($V);', 'Character.toUpperCase($V);',
  'Scanner t = new Scanner($V);', 'Random t = new Random($V);', 'int t = r.nextInt($V);',
  'int t = (int) $V;', 'double t = (double) $V;', 'char t = (char) $V;',
  'boolean t = (boolean) $V;', 'String t = (String) $V;', 'long t = (long) $V;',
  '$V.length();', 'int t = $V.length;', 'String t = $V.toString();',
  'boolean t = $V.equals(1);', 'int t = $V.hashCode();', '$V.close();',
  '$V.nextInt();', '$V.foo();', 'int t = $V.foo;',
  '$V = 5;', '$V;', 'return $V;',
];

/** Las variables que el preludio declara para que los valores y los contextos tengan algo con qué combinarse (`i`, `l`, `d`, `c`, `b`, `s`, `sc`, `r`). */
export const PRELUDIO_DE_LA_MATRIZ = 'int i = 1; long l = 2L; double d = 1.5; char c = \'a\'; boolean b = true; String s = "x"; Scanner sc = new Scanner(System.in); Random r = new Random(1);';

/** La línea del contexto en `programaDeLaMatriz` (la que señala javac cuando rechaza esa posición). */
export const LINEA_DEL_CONTEXTO_EN_LA_MATRIZ = 6;

/** El programa de una celda: el preludio en la línea 5 y el contexto, con el valor puesto, en la línea 6 (`LINEA_DEL_CONTEXTO_EN_LA_MATRIZ`). */
export function programaDeLaMatriz(valor: string, contexto: string): string {
  return `import java.util.Scanner;\nimport java.util.Random;\npublic class P {\n    public static void main(String[] args) {\n        ${PRELUDIO_DE_LA_MATRIZ}\n        ${contexto.replaceAll('$V', valor)}\n    }\n}\n`;
}

/** Una fila por valor, un carácter por contexto: `1` si javac 17.0.18 COMPILA el programa, `0` si lo rechaza. */
export const COMPILA_EN_JAVAC_POR_VALOR: readonly string[] = [
  '111000001001110111111111001111000011111000010111111001111111011111001000000000100', // i
  '011000000001110001111001001111000000011000000111111001001000010111001000000000100', // l
  '001000000001110001111001001111000000011000000111111001001000000111001000000000100', // d
  '111100001001110111111111001111000011111000010111111001111111011111001000000000100', // c
  '000010000010101001100000010001011100000111100111000001001000000000100000000000000', // b
  '000001000100100001100000100001100000000000010111000111001100100000010101110000000', // s
  '000000100000100001100000000001100000000000000111000001001000000000000001111100000', // sc
  '000000010000100001100000000001100000000000000111000001001000000000000001110100000', // r
  '000000000000100001100000000001100000000000000111000001001000000000000011110000000', // args
  '111000001001110111111111001111000011100000010111111001111111011111001000000000000', // args.length
  '000001000100100001100000100001100000000000010111000111001100100000010101110000000', // args[0]
  '000000000000100001100000000001100000000000000111000001001000100000000001110000000', // System.in
  '000000000000100001100000000001100000000000000111000001001000000000000001111000000', // System.out
  '000000000000100001100000000001100000000000000111000001001000000000000001111000000', // System.err
  '000000000000000000000000000000000000000000000000000000000000000000000000000000010', // System.out.println()
  '000000000000000000000000000000000000000000000000000000000000000000000000000000010', // sc.close()
  '000000000000000000000000000000000000000000000000000000000000000000000000000000000', // Math
  '000000000000000000000000000000000000000000000000000000000000000000000000000000000', // System
  '000000000000000000000000000000000000000000000000000000000000000000000000000000000', // String
  '000001110100100001100000100001100000000000000001000111001100000000010000000000000', // null
  '001000000001110001111001001111000000000000000111111001001000000111001000000000000', // Math.PI
  '111000001001110111111111001111000011100000011111111001111111011111001000000000000', // Integer.MAX_VALUE
  '000000000000100001100000100001100000000000000111000001001000000111111001110000010', // new Object()
  '000000000000000000000000000000000000000000000000000000000000000000000000000000000', // System.in.read()
  '000000000000000000000000000000000000000000000000000000000000000000000000000000000', // args.length()
  '000000100000100001100000000001100000000000000111000001001000000000000001111100010', // new Scanner(System.in)
  '000001000100100001100000100001100000000000010111000111001100100000010101110000000', // "abc"
  '111100001001110111111111001111000011100000011111111001111111011111001000000000000', // 5
  '111000001001110111111111001111000011100000010111111001111111011111001000000000010', // sc.nextInt()
  '111000001001110111111111001111000011100000010111111001111111011111001000000000010', // s.length()
  '011000000001110001111001001111000000000000000111111001001000010111001000000000010', // Math.round(d)
  '111000001001110111111111001111000011100000010111111001111111011111001000000000000', // (int) d
  '111000001001110111111111001111000011100000010111111001111111011111001000000000010', // i++
  '111000001001110111111111001111000011100000010111111001111111011111001000000000000', // (i = 3)
  '111000001001110111111111001111000011100000010111111001111111011111001000000000010', // r.nextInt(5)
  '111100001001110111111111001111000011100000010111111001111111011111001000000000010', // s.charAt(0)
  '000010000010101001100000010001011100000111100111000001001000000000100000000000010', // Character.isDigit(c)
  '000000000000100001100000000001100000000000000111000001001000000000000001111000010', // System.out.printf("a")
  '111000001001110111111111001111000011100000010111111001111111011111001000000000010', // Integer.parseInt(s)
  '000001000100100001100000100001100000000000010111000111001100100000010101110000010', // String.valueOf(i)
];
