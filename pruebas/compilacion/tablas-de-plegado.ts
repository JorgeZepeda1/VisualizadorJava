// Tarea 1.36 (S-9 de la verificación final del lote 1): el plegado de expresiones constantes (`semantica/constantes.ts`, JLS 15.29) con UNA fila por operador y por tipo —la regla de la 1.35,
// «cada conjunto cerrado se muta elemento por elemento», no se había aplicado a `plegarBinaria`: 24 líneas de `constantes.ts` (los brazos `long` con `-`, `*`, `/`, `%`; `double` con `-`, `*`, `%` y las
// comparaciones; `==` y `!=` de `boolean`; la saturación de `(int)` y `(long)` sobre un `double`) no las ejecutaba ninguna prueba—.
//
// Cada fila es una expresión de Java y el valor que javac 17.0.18 le da al plegarla. El valor NO está escrito a mano: lo produce el JDK real —`herramientas/oraculo/plegado-de-constantes.test.ts`
// (`npm run test:oraculo`) arma con estas mismas filas un programa, lo compila y lo corre, y compara lo que imprime con la columna `resultado`—, y `plegado-de-constantes.test.ts` (sin JDK) compara con ella
// lo que calcula el motor. Así, si el JDK cambia o la tabla se escribe mal, falla la que corresponde.
//
// Formato del resultado (el mismo que imprime el programa de Java): `int` en decimal; `long` en decimal con una `L`; `double` como los 64 bits de `Double.doubleToLongBits` en hexadecimal (un `NaN` es
// siempre `0x7ff8000000000000`: así se distingue `0.0` de `-0.0` y no se pierde ningún dígito); `boolean` como `true`/`false`; `char` como `c` y su valor numérico; `String` entre comillas.
import { tokenizar } from '../../src/motor/lexico/analizador-lexico.ts';
import { Alcance } from '../../src/motor/semantica/alcance.ts';
import { valorConstante, type ValorConstante } from '../../src/motor/semantica/constantes.ts';
import { CursorDeTokens } from '../../src/motor/sintaxis/cursor-de-tokens.ts';
import { analizarExpresion } from '../../src/motor/sintaxis/expresiones.ts';

export type TipoDeLaFila = 'int' | 'long' | 'double' | 'boolean' | 'char' | 'String';

export interface FilaDePlegado {
  /** Un nombre corto, único: aparece en el programa de Java y en los mensajes de las pruebas. */
  readonly id: string;
  readonly tipo: TipoDeLaFila;
  /** La expresión tal como se escribe en Java. Es una expresión CONSTANTE (JLS 15.29): javac la pliega al compilar. */
  readonly expresion: string;
  /** Lo que imprime Java para esa expresión, en el formato de la cabecera. */
  readonly resultado: string;
}

const fila = (id: string, tipo: TipoDeLaFila, expresion: string, resultado: string): FilaDePlegado => ({ id, tipo, expresion, resultado });

export const FILAS_DE_PLEGADO: readonly FilaDePlegado[] = [
  // ---- int: + - * / % con la vuelta de los 32 bits, y la promoción de `char` ----
  fila('int-suma', 'int', '2147483647 + 1', '-2147483648'),
  fila('int-suma-normal', 'int', '20 + 22', '42'),
  fila('int-resta', 'int', '-2147483648 - 1', '2147483647'),
  fila('int-resta-normal', 'int', '50 - 8', '42'),
  fila('int-mult', 'int', '65536 * 65536', '0'),
  fila('int-mult-con-vuelta', 'int', '46341 * 46341', '-2147479015'),
  fila('int-mult-normal', 'int', '6 * 7', '42'),
  fila('int-div-trunca-hacia-cero', 'int', '-7 / 2', '-3'),
  fila('int-div-divisor-negativo', 'int', '7 / -2', '-3'),
  fila('int-div-minimo-entre-menos-uno', 'int', '-2147483648 / -1', '-2147483648'),
  fila('int-mod-dividendo-negativo', 'int', '-7 % 2', '-1'),
  fila('int-mod-divisor-negativo', 'int', '7 % -2', '1'),
  fila('int-mod-minimo-entre-menos-uno', 'int', '-2147483648 % -1', '0'),
  fila('int-mod-normal', 'int', '5 % 3', '2'),
  fila('int-char-mas-int', 'int', "'a' + 1", '98'),
  fila('int-char-mas-char', 'int', "'a' + 'b'", '195'),
  fila('int-char-por-int', 'int', "'a' * 2", '194'),
  fila('int-char-menos-char', 'int', "'z' - 'a'", '25'),
  fila('int-menos-unario', 'int', '-(-2147483648)', '-2147483648'),
  fila('int-menos-unario-de-un-char', 'int', "-'a'", '-97'),
  fila('int-mas-unario-de-un-char', 'int', "+'a'", '97'),
  fila('int-minimo-del-tipo', 'int', 'Integer.MIN_VALUE', '-2147483648'),
  fila('int-maximo-mas-uno', 'int', 'Integer.MAX_VALUE + 1', '-2147483648'),

  // ---- long: + - * / % con la vuelta de los 64 bits y la promoción desde int y char ----
  fila('long-suma', 'long', '9223372036854775807L + 1L', '-9223372036854775808L'),
  fila('long-suma-con-un-int', 'long', '1L + 2', '3L'),
  fila('long-suma-con-un-int-a-la-izquierda', 'long', '1 + 2L', '3L'),
  fila('long-suma-con-un-char', 'long', "'a' + 1L", '98L'),
  fila('long-resta', 'long', '-9223372036854775808L - 1L', '9223372036854775807L'),
  fila('long-resta-normal', 'long', '10L - 3', '7L'),
  fila('long-mult', 'long', '4294967296L * 4294967296L', '0L'),
  fila('long-mult-con-vuelta', 'long', '3037000500L * 3037000500L', '-9223372036709301616L'),
  fila('long-mult-normal', 'long', '1000000L * 1000000', '1000000000000L'),
  fila('long-div-trunca-hacia-cero', 'long', '-7L / 2L', '-3L'),
  fila('long-div-divisor-negativo', 'long', '7L / -2L', '-3L'),
  fila('long-div-con-un-int', 'long', '7L / 2', '3L'),
  fila('long-div-minimo-entre-menos-uno', 'long', '-9223372036854775808L / -1L', '-9223372036854775808L'),
  fila('long-mod-dividendo-negativo', 'long', '-7L % 2L', '-1L'),
  fila('long-mod-divisor-negativo', 'long', '7L % -2L', '1L'),
  fila('long-mod-minimo-entre-menos-uno', 'long', '-9223372036854775808L % -1L', '0L'),
  fila('long-menos-unario-del-minimo', 'long', '-(-9223372036854775808L)', '-9223372036854775808L'),
  fila('long-minimo-del-tipo', 'long', 'Long.MIN_VALUE', '-9223372036854775808L'),
  fila('long-maximo-mas-uno', 'long', 'Long.MAX_VALUE + 1', '-9223372036854775808L'),

  // ---- double: + - * / % con IEEE 754 (infinitos, NaN, cero negativo) y la promoción ----
  fila('double-suma', 'double', '0.1 + 0.2', '0x3fd3333333333334'),
  fila('double-suma-desborda', 'double', '1e308 + 1e308', '0x7ff0000000000000'),
  fila('double-suma-con-un-int', 'double', '1 + 1.5', '0x4004000000000000'),
  fila('double-suma-ceros', 'double', '-0.0 + 0.0', '0x0000000000000000'),
  fila('double-resta', 'double', '1.0 - 0.9', '0x3fb9999999999998'),
  fila('double-resta-ceros', 'double', '0.0 - 0.0', '0x0000000000000000'),
  fila('double-resta-con-un-long', 'double', '1.5 - 1L', '0x3fe0000000000000'),
  fila('double-mult', 'double', '0.1 * 3', '0x3fd3333333333334'),
  fila('double-mult-desborda', 'double', '1e308 * 10', '0x7ff0000000000000'),
  fila('double-mult-cero-por-negativo', 'double', '0.0 * -1', '0x8000000000000000'),
  fila('double-mult-subdesborda', 'double', '1e-200 * 1e-200', '0x0000000000000000'),
  fila('double-div', 'double', '1.0 / 3', '0x3fd5555555555555'),
  fila('double-div-int-entre-double', 'double', '5 / 2.0', '0x4004000000000000'),
  fila('double-div-entre-cero', 'double', '1.0 / 0.0', '0x7ff0000000000000'),
  fila('double-div-negativo-entre-cero', 'double', '-1.0 / 0.0', '0xfff0000000000000'),
  fila('double-div-cero-entre-cero', 'double', '0.0 / 0.0', '0x7ff8000000000000'),
  fila('double-div-entera-primero', 'double', '1 / 2 * 1.0', '0x0000000000000000'),
  fila('double-mod', 'double', '5.5 % 2.0', '0x3ff8000000000000'),
  fila('double-mod-dividendo-negativo', 'double', '-5.5 % 2.0', '0xbff8000000000000'),
  fila('double-mod-divisor-negativo', 'double', '5.5 % -2.0', '0x3ff8000000000000'),
  fila('double-mod-entre-cero', 'double', '1.0 % 0.0', '0x7ff8000000000000'),
  fila('double-mod-con-un-int', 'double', '7.5 % 2', '0x3ff8000000000000'),
  fila('double-menos-unario-de-cero', 'double', '-0.0', '0x8000000000000000'),
  fila('double-menos-unario', 'double', '-(-1.5)', '0x3ff8000000000000'),
  fila('double-mas-unario', 'double', '+2.5', '0x4004000000000000'),
  fila('double-char-mas-decimal', 'double', "'a' + 0.5", '0x4058600000000000'),
  fila('double-maximo-por-dos', 'double', 'Double.MAX_VALUE * 2', '0x7ff0000000000000'),
  fila('double-minimo-entre-dos', 'double', 'Double.MIN_VALUE / 2', '0x0000000000000000'),
  fila('double-minimo-del-tipo', 'double', 'Double.MIN_VALUE', '0x0000000000000001'),
  fila('double-pi', 'double', 'Math.PI', '0x400921fb54442d18'),
  fila('double-e', 'double', 'Math.E', '0x4005bf0a8b145769'),
  fila('double-maximo-del-int-mas-decimal', 'double', 'Integer.MAX_VALUE + 1.0', '0x41e0000000000000'),

  // ---- boolean: comparaciones de cada tipo, `==` y `!=` de boolean, y los operadores lógicos ----
  fila('bool-int-menor', 'boolean', '1 < 2', 'true'),
  fila('bool-int-menor-o-igual', 'boolean', '2 <= 2', 'true'),
  fila('bool-int-mayor', 'boolean', '3 > 4', 'false'),
  fila('bool-int-mayor-o-igual', 'boolean', '4 >= 4', 'true'),
  fila('bool-int-igual', 'boolean', '1 == 1', 'true'),
  fila('bool-int-distinto', 'boolean', '1 != 1', 'false'),
  fila('bool-char-igual-a-int', 'boolean', "'a' == 97", 'true'),
  fila('bool-char-menor', 'boolean', "'a' < 'b'", 'true'),
  fila('bool-long-mayor', 'boolean', '5L > 3', 'true'),
  fila('bool-long-igual-a-int', 'boolean', '5L == 5', 'true'),
  fila('bool-long-compara-sin-perder-bits', 'boolean', '9223372036854775807L > 9223372036854775806L', 'true'),
  fila('bool-long-menor-o-igual', 'boolean', '-9223372036854775808L <= 0L', 'true'),
  fila('bool-long-menor', 'boolean', '3L < 5L', 'true'),
  fila('bool-long-mayor-o-igual', 'boolean', '5L >= 5', 'true'),
  fila('bool-long-distinto', 'boolean', '5L != 6', 'true'),
  fila('bool-double-suma-no-es-exacta', 'boolean', '0.1 + 0.2 == 0.3', 'false'),
  fila('bool-double-cero-igual-a-cero-negativo', 'boolean', '0.0 == -0.0', 'true'),
  fila('bool-double-nan-no-es-igual-a-nada', 'boolean', '(0.0 / 0.0) == (0.0 / 0.0)', 'false'),
  fila('bool-double-nan-es-distinto-de-todo', 'boolean', '(0.0 / 0.0) != (0.0 / 0.0)', 'true'),
  fila('bool-double-nan-no-es-menor', 'boolean', '(0.0 / 0.0) < 1', 'false'),
  fila('bool-double-nan-no-es-mayor-o-igual', 'boolean', '(0.0 / 0.0) >= 1', 'false'),
  fila('bool-double-infinito-mayor', 'boolean', '1.0 / 0.0 > Double.MAX_VALUE', 'true'),
  fila('bool-double-menor-con-un-int', 'boolean', '1 < 1.5', 'true'),
  fila('bool-double-mayor-o-igual-con-un-int', 'boolean', '2 >= 2.0', 'true'),
  fila('bool-double-menor-o-igual', 'boolean', '1.5 <= 1.5', 'true'),
  fila('bool-double-mayor', 'boolean', '1.5 > 1.4', 'true'),
  fila('bool-igual-de-booleanos', 'boolean', 'true == false', 'false'),
  fila('bool-igual-de-booleanos-iguales', 'boolean', 'true == true', 'true'),
  fila('bool-distinto-de-booleanos', 'boolean', 'true != false', 'true'),
  fila('bool-distinto-de-booleanos-iguales', 'boolean', 'false != false', 'false'),
  fila('bool-igual-entre-comparaciones', 'boolean', '(1 < 2) == (3 < 4)', 'true'),
  fila('bool-y', 'boolean', 'true && false', 'false'),
  fila('bool-y-verdadero', 'boolean', 'true && true', 'true'),
  fila('bool-o', 'boolean', 'true || false', 'true'),
  fila('bool-o-falso', 'boolean', 'false || false', 'false'),
  fila('bool-negacion', 'boolean', '!true', 'false'),
  fila('bool-negacion-de-una-comparacion', 'boolean', '!(1 < 2)', 'false'),

  // ---- String: la concatenación con cada tipo, el orden de las sumas y la igualdad (se internan) ----
  fila('texto-con-un-int', 'String', '"a" + 1', '"a1"'),
  fila('texto-con-un-char', 'String', '"a" + \'b\'', '"ab"'),
  fila('texto-con-un-boolean', 'String', '"a" + true', '"atrue"'),
  fila('texto-con-un-long', 'String', '"a" + 1L', '"a1"'),
  fila('texto-con-un-negativo', 'String', '"a" + -1', '"a-1"'),
  fila('texto-con-un-char-convertido', 'String', '"a" + (char) 65', '"aA"'),
  fila('texto-con-un-long-convertido', 'String', '"" + (long) 5', '"5"'),
  fila('texto-sumas-antes-del-texto', 'String', '1 + 2 + "x"', '"3x"'),
  fila('texto-sumas-despues-del-texto', 'String', '"x" + 1 + 2', '"x12"'),
  fila('texto-con-una-suma-entre-parentesis', 'String', '"x" + (1 + 2)', '"x3"'),
  fila('texto-char-delante', 'String', '\'a\' + "x"', '"ax"'),
  fila('texto-dos-chars-suman-antes', 'String', '\'a\' + \'b\' + "x"', '"195x"'),
  fila('texto-vacio-mas-un-numero', 'String', '"" + 5', '"5"'),
  fila('texto-con-el-minimo-de-int', 'String', '"" + Integer.MIN_VALUE', '"-2147483648"'),
  fila('texto-con-el-minimo-de-long', 'String', '"" + Long.MIN_VALUE', '"-9223372036854775808"'),
  // Tarea 2.4 (cierre de la 1.36): un `double` concatenado a un texto se pliega con el `Double.toString` de Java, que el JDK 17 usa al compilar (umbrales 10^-3 y 10^7, exponente sin `+`, `Infinity`, `NaN`).
  fila('texto-con-un-double', 'String', '"a" + 1.5', '"a1.5"'),
  fila('texto-con-un-double-entero', 'String', '"a" + 2.0', '"a2.0"'),
  fila('texto-con-un-double-a-la-izquierda', 'String', '1.5 + "a"', '"1.5a"'),
  fila('texto-con-un-int-convertido-a-double', 'String', '"a" + (double) 1', '"a1.0"'),
  fila('texto-con-un-long-convertido-a-double-redondea', 'String', '"m=" + (double) 9007199254740993L', '"m=9.007199254740992E15"'),
  fila('texto-con-la-suma-de-dos-doubles', 'String', '"x" + (0.1 + 0.2)', '"x0.30000000000000004"'),
  fila('texto-con-un-double-justo-antes-del-umbral-grande', 'String', '"x" + 9999999.0', '"x9999999.0"'),
  fila('texto-con-un-double-en-el-umbral-grande', 'String', '"x" + 1.0E7', '"x1.0E7"'),
  fila('texto-con-un-double-en-el-umbral-pequeno', 'String', '"x" + 0.001', '"x0.001"'),
  fila('texto-con-un-double-bajo-el-umbral-pequeno', 'String', '"x" + 0.0001', '"x1.0E-4"'),
  fila('texto-con-un-double-muy-grande', 'String', '"x" + 1e20', '"x1.0E20"'),
  fila('texto-con-un-double-de-empate-exacto', 'String', '"x" + 1e23', '"x9.999999999999999E22"'),
  fila('texto-con-math-pi', 'String', '"x" + Math.PI', '"x3.141592653589793"'),
  fila('texto-con-math-e', 'String', '"x" + Math.E', '"x2.718281828459045"'),
  fila('texto-con-double-max-value', 'String', '"x" + Double.MAX_VALUE', '"x1.7976931348623157E308"'),
  fila('texto-con-double-min-value', 'String', '"x" + Double.MIN_VALUE', '"x4.9E-324"'),
  fila('texto-con-infinito', 'String', '"x" + (1.0 / 0)', '"xInfinity"'),
  fila('texto-con-menos-infinito', 'String', '"x" + (-1.0 / 0)', '"x-Infinity"'),
  fila('texto-con-nan', 'String', '"x" + (0.0 / 0)', '"xNaN"'),
  fila('texto-con-menos-cero', 'String', '"x" + -0.0', '"x-0.0"'),
  fila('texto-con-un-double-igual-a-su-literal', 'boolean', '"a" + 1.5 == "a1.5"', 'true'),
  fila('texto-con-un-double-distinto-de-su-literal', 'boolean', '"a" + 1.5 == "a1.50"', 'false'),
  fila('texto-igual-se-interna', 'boolean', '"a" == "a"', 'true'),
  fila('texto-plegado-igual-a-otro-literal', 'boolean', '"a" + "b" == "ab"', 'true'),
  fila('texto-distinto', 'boolean', '"a" != "b"', 'true'),
  fila('texto-vacio-igual-a-vacio', 'boolean', '"" == ""', 'true'),
  fila('texto-de-un-numero-igual-a-su-literal', 'boolean', '"a" + 1 == "a1"', 'true'),
  fila('texto-conversion-a-string-es-la-identidad', 'String', '(String) "a"', '"a"'),
  fila('texto-conversion-a-string-de-una-suma', 'String', '(String) ("a" + 1)', '"a1"'),

  // ---- Conversiones (casts): a int, long, double y char desde cada tipo, con la saturación del double ----
  fila('cast-int-de-double-trunca', 'int', '(int) 3.99', '3'),
  fila('cast-int-de-double-negativo-trunca-hacia-cero', 'int', '(int) -3.99', '-3'),
  fila('cast-int-de-double-satura-arriba', 'int', '(int) 3e10', '2147483647'),
  fila('cast-int-de-double-satura-abajo', 'int', '(int) -3e10', '-2147483648'),
  fila('cast-int-de-nan-es-cero', 'int', '(int) (0.0 / 0.0)', '0'),
  fila('cast-int-de-infinito-satura', 'int', '(int) (1.0 / 0.0)', '2147483647'),
  fila('cast-int-de-menos-infinito-satura', 'int', '(int) (-1.0 / 0.0)', '-2147483648'),
  fila('cast-int-de-double-justo-sobre-el-maximo', 'int', '(int) 2147483647.5', '2147483647'),
  fila('cast-int-de-double-justo-bajo-el-minimo', 'int', '(int) -2147483648.9', '-2147483648'),
  fila('cast-int-de-double-diminuto', 'int', '(int) 1e-10', '0'),
  fila('cast-int-de-long-da-la-vuelta', 'int', '(int) 4294967297L', '1'),
  fila('cast-int-de-long-pasa-al-negativo', 'int', '(int) 2147483648L', '-2147483648'),
  fila('cast-int-de-long-negativo', 'int', '(int) -1L', '-1'),
  fila('cast-int-de-char', 'int', "(int) 'a'", '97'),
  fila('cast-int-de-char-y-suma', 'int', "(int) 'z' + 1", '123'),
  fila('cast-long-de-double-trunca', 'long', '(long) 3.99', '3L'),
  fila('cast-long-de-double-negativo-trunca-hacia-cero', 'long', '(long) -3.99', '-3L'),
  fila('cast-long-de-double-satura-arriba', 'long', '(long) 1e30', '9223372036854775807L'),
  fila('cast-long-de-double-satura-abajo', 'long', '(long) -1e30', '-9223372036854775808L'),
  fila('cast-long-de-nan-es-cero', 'long', '(long) (0.0 / 0.0)', '0L'),
  fila('cast-long-de-2-a-la-63', 'long', '(long) 9.223372036854776E18', '9223372036854775807L'),
  fila('cast-long-de-menos-2-a-la-63', 'long', '(long) -9.223372036854776E18', '-9223372036854775808L'),
  fila('cast-long-de-un-double-grande-exacto', 'long', '(long) 1e15', '1000000000000000L'),
  fila('cast-long-de-infinito-satura', 'long', '(long) (1.0 / 0.0)', '9223372036854775807L'),
  fila('cast-long-de-int', 'long', '(long) 5', '5L'),
  fila('cast-long-de-int-negativo', 'long', '(long) -5', '-5L'),
  fila('cast-long-de-char', 'long', "(long) 'a'", '97L'),
  fila('cast-double-de-int', 'double', '(double) 5', '0x4014000000000000'),
  fila('cast-double-de-int-maximo', 'double', '(double) 2147483647', '0x41dfffffffc00000'),
  fila('cast-double-de-long-redondea', 'double', '(double) 9007199254740993L', '0x4340000000000000'),
  fila('cast-double-de-long-minimo', 'double', '(double) -9223372036854775808L', '0xc3e0000000000000'),
  fila('cast-double-de-char', 'double', "(double) 'a'", '0x4058400000000000'),
  fila('cast-char-de-int', 'char', '(char) 65', 'c65'),
  fila('cast-char-de-double-trunca', 'char', '(char) 97.9', 'c97'),
  fila('cast-char-de-negativo-da-la-vuelta', 'char', '(char) -1', 'c65535'),
  fila('cast-char-de-65536-es-cero', 'char', '(char) 65536', 'c0'),
  fila('cast-char-de-70000', 'char', '(char) 70000', 'c4464'),
  fila('cast-char-de-double-grande-pasa-por-int', 'char', '(char) 3e10', 'c65535'),
  fila('cast-char-de-double-muy-negativo-pasa-por-int', 'char', '(char) -3e10', 'c0'),
  fila('cast-char-de-long', 'char', '(char) 65L', 'c65'),
  fila('cast-char-de-long-grande-da-la-vuelta', 'char', '(char) 4294967361L', 'c65'),
  fila('cast-char-de-char', 'char', "(char) 'a'", 'c97'),
  fila('cast-boolean-es-la-identidad', 'boolean', '(boolean) true', 'true'),
];

/** El resultado del motor para `fila`, en el formato de la cabecera; `null` si el motor no la reconoce como constante. */
export function calcularConElMotor(filaDePlegado: FilaDePlegado): string | null {
  const nodo = analizarExpresion(new CursorDeTokens(tokenizar(filaDePlegado.expresion)));
  const constante = valorConstante(nodo, new Alcance());
  if (constante === null) return null;
  return formatearConstante(constante);
}

/** La constante en el formato de la cabecera (el mismo que arma el programa de Java). */
export function formatearConstante(constante: ValorConstante): string {
  switch (constante.tipo) {
    case 'int':
      return String(constante.valor);
    case 'long':
      return `${constante.valor}L`;
    case 'double':
      return `0x${bitsDeUnDouble(constante.valor).toString(16).padStart(16, '0')}`;
    case 'boolean':
      return constante.valor ? 'true' : 'false';
    case 'char':
      return `c${constante.valor}`;
    case 'String':
      return `"${constante.valor}"`;
  }
}

/** Los 64 bits de `Double.doubleToLongBits`: un `NaN` siempre en su forma canónica (`0x7ff8000000000000`). */
export function bitsDeUnDouble(valor: number): bigint {
  if (Number.isNaN(valor)) return 0x7ff8000000000000n;
  const vista = new DataView(new ArrayBuffer(8));
  vista.setFloat64(0, valor);
  return vista.getBigUint64(0);
}

/** El programa de Java que imprime, una línea `id resultado` por fila, lo que javac le calcula a cada expresión (cada una se pliega al compilar). */
export function programaDeJavaDelPlegado(filas: readonly FilaDePlegado[]): string {
  const lineas = filas.map((f) => {
    switch (f.tipo) {
      case 'int':
        return `System.out.println("${f.id} " + (${f.expresion}));`;
      case 'long':
        return `System.out.println("${f.id} " + (${f.expresion}) + "L");`;
      case 'double':
        return `System.out.println("${f.id} " + bits(${f.expresion}));`;
      case 'boolean':
        return `System.out.println("${f.id} " + (${f.expresion}));`;
      case 'char':
        return `System.out.println("${f.id} c" + (int) (${f.expresion}));`;
      case 'String':
        return `System.out.println("${f.id} \\"" + (${f.expresion}) + "\\"");`;
    }
  });
  return [
    'public class Saludo {',
    '    static String bits(double x) {',
    '        return String.format("0x%016x", Double.doubleToLongBits(x));',
    '    }',
    '    public static void main(String[] args) {',
    ...lineas.map((linea) => `        ${linea}`),
    '    }',
    '}',
    '',
  ].join('\n');
}
