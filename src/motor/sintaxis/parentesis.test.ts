// Tarea 1.35 (la mutación por elemento del conjunto de palabras que abren el operando de un cast mostró que NINGUNA prueba protegía 18 de sus 19 miembros, y al probar cada uno apareció la
// familia entera: javac compila casts a tipos que no son un nombre simple —`(String[]) args`, `(java.util.List<String>) x`, `(A & B) x`— que el analizador no reconocía).
//
// `leerParentesis` es `JavacParser.analyzeParens` (JDK 17.0.18, `jdk.compiler/com/sun/tools/javac/parser/JavacParser.java`) portado rama por rama: cada fila de las tablas de abajo
// es UNA rama de su `switch`, y el comentario de la fila dice cuál. Lo que javac llama lambda (explícita o implícita) y lo que llama paréntesis son aquí la misma respuesta, `otra`:
// el analizador de expresiones reconoce las lambdas antes de preguntar y lo demás es una agrupación.
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { CursorDeTokens } from './cursor-de-tokens.ts';
import { abreElOperandoDeUnaConversion, leerParentesis } from './parentesis.ts';

const leer = (texto: string) => leerParentesis(new CursorDeTokens(tokenizar(texto)));

describe('leerParentesis — lo que javac lee como el tipo de una conversión', () => {
  it.each([
    ['(int) x', 'un primitivo seguido de «)»'],
    ['(void) x', '`void` seguido de «)»'],
    ['(boolean) x', 'otro primitivo'],
    ['(a.b.C) x', 'un nombre con su paquete (el «.» se salta)'],
    ['(java . lang . String) x', 'los espacios entre las partes no cuentan'],
    ['(A & B) x', 'una intersección (el «&» se salta)'],
    ['(A<B>) x', 'argumentos de tipo que cierran con «>» y luego «)»'],
    ['(A<B> & C) x', 'argumentos de tipo que cierran con «>» y luego «&»'],
    ['(A<B<C>>) x', '«>>» baja dos niveles'],
    ['(A<B<C<D>>>) x', '«>>>» baja tres niveles'],
    ['(Map<K, V>) x', 'argumentos con una coma'],
    ['(List<?>) x', 'comodín sin cota'],
    ['(List<? extends Number>) x', 'comodín con `extends` (la «?» marca un tipo)'],
    ['(List<? super Integer>) x', 'comodín con `super`'],
    ['(a[]) x', '«[ ] )» es un tipo de arreglo'],
    ['(a[][]) x', 'dos pares de corchetes: el primero se consume y sigue «[ ] )»'],
    ['(a[] & B) x', '«[ ] &» es un arreglo en una intersección'],
    ['(int[]) x', 'un primitivo con corchetes'],
    ['(int[][]) x', 'un primitivo con dos pares de corchetes'],
    ['(List<String>[]) x', 'argumentos de tipo y corchetes'],
    ['(@A T) x', 'una anotación (marca un tipo)'],
    ['(@a.B T) x', 'una anotación con nombre calificado'],
    ['(@A(1) T) x', 'una anotación con argumentos'],
    ['(@A(1, (2)) T) x', 'una anotación con paréntesis anidados en sus argumentos'],
    ['(@A) + 1', 'una anotación sola y «)»: lo visto solo puede ser un tipo, así que ya es un cast aunque siga un «+»'],
    ['(a,) + 1', 'una coma marca un tipo: ya es un cast aunque siga un «+»'],
  ])('«%s» es una conversión: %s', (texto) => {
    expect(leer(texto)).toBe('conversion');
  });
});

describe('leerParentesis — «(Nombre) algo»: lo que viene tras el «)» decide si es un cast', () => {
  // El conjunto de `analyzeParens` (case RPAREN), uno por uno. Cada fuente es «(a)» seguido de la construcción.
  it.each([
    ['!x', '`!`'],
    ['~x', '`~`'],
    ['(x)', 'otro «(»'],
    ['this', '`this`'],
    ['super', '`super`'],
    ['1', 'un literal entero'],
    ['1L', 'un literal largo'],
    ['1.5', 'un literal doble'],
    ["'c'", 'un literal de carácter'],
    ['"s"', 'un literal de cadena'],
    ['0x1F', 'un literal hexadecimal (el visualizador no lo ejecuta, javac sí lo lee como un entero)'],
    ['1.5f', 'un literal float'],
    ['true', '`true`'],
    ['false', '`false`'],
    ['null', '`null`'],
    ['new', '`new`'],
    ['x', 'un identificador'],
    ['assert', '`assert`'],
    ['enum', '`enum`'],
    ['_', '`_`'],
    ['switch', '`switch`'],
    ['byte', '`byte`'],
    ['short', '`short`'],
    ['char', '`char`'],
    ['int', '`int`'],
    ['long', '`long`'],
    ['float', '`float`'],
    ['double', '`double`'],
    ['boolean', '`boolean`'],
    ['void', '`void`'],
  ])('«(a) %s» es una conversión: tras el «)» viene %s', (siguiente) => {
    expect(leer(`(a) ${siguiente}`)).toBe('conversion');
  });

  it.each([
    ['+ x', '`+` (una suma, no un signo)'],
    ['- x', '`-` (una resta)'],
    ['++', '`++` (un sufijo)'],
    ['--', '`--`'],
    ['* x', '`*`'],
    ['/ x', '`/`'],
    ['% x', '`%`'],
    ['. x', '`.`'],
    ['[0]', '`[`'],
    ['< x', '`<`'],
    ['> x', '`>`'],
    ['? x : y', '`?`'],
    [': x', '`:`'],
    ['== x', '`==`'],
    ['!= x', '`!=`'],
    ['&& x', '`&&`'],
    ['|| x', '`||`'],
    ['& x', '`&`'],
    ['| x', '`|`'],
    ['^ x', '`^`'],
    ['= x', '`=`'],
    ['instanceof T', '`instanceof`'],
    [', x', 'una coma'],
    [';', 'un punto y coma'],
    [')', 'otro «)»'],
    ['{', 'una llave'],
    [':: m', '`::`'],
  ])('«(a) %s» NO es una conversión: tras el «)» viene %s', (siguiente) => {
    expect(leer(`(a) ${siguiente}`)).toBe('otra');
  });
});

describe('leerParentesis — lo que javac lee como una agrupación o como una lambda es `otra`', () => {
  it.each([
    ['(a < b) && c', 'una comparación: el «<» abre un nivel que el «)» no cierra con «>»'],
    ['(a < b) == (c > d)', 'dos comparaciones'],
    ['(a > b)', 'un «>» sin «<» antes (nivel negativo): no es un tipo'],
    ['(a[0]) + 1', 'un «[» que no cierra enseguida: un acceso a arreglo'],
    ['(a[i]) x', 'un acceso a arreglo, aunque lo siga un identificador'],
    ['(1 + 2) * 3', 'un literal dentro del paréntesis (rama por omisión)'],
    ['(a + b) * c', 'un operador dentro (rama por omisión)'],
    ['((a)) x', 'un «(» que no es el primero'],
    ['(a.b()) x', 'una llamada: el «(» interior no es el primero'],
    ['(a ? b : c) + 1', 'un ternario'],
    ['(x = 1)', 'una asignación'],
    ['() -> 1', '«( )» es una lista de parámetros vacía: lambda explícita'],
    ['(a) -> 1', 'un identificador, «)» y «->»: lambda implícita'],
    ['(a, b) -> 1', 'identificadores con comas: lambda implícita'],
    ['(int a, int b) -> 1', 'un primitivo y un nombre: lambda explícita'],
    ['(final int a) -> 1', '`final` solo aparece en una lambda explícita'],
    ['(String... a) -> 1', 'tres puntos solo aparecen en una lambda explícita'],
    ['(A<B> c, D e) -> 1', '«>» y un identificador seguido de coma: lambda explícita'],
    ['(A<B> c) -> 1', '«>» y un identificador, «)» y «->»: lambda explícita'],
    ['(A<B>... c) -> 1', '«>» seguido de tres puntos: lambda explícita'],
    ['(a[] b) -> 1', '«[ ]» seguido de un identificador: lambda explícita'],
    ['(a b) -> 1', 'dos identificadores seguidos: lambda explícita'],
  ])('«%s» no es una conversión: %s', (texto) => {
    expect(leer(texto)).toBe('otra');
  });

  it('el final del archivo en mitad de lo que podría ser un tipo no es una conversión', () => {
    expect(leer('(a.b')).toBe('otra');
    expect(leer('(')).toBe('otra');
  });
});

describe('abreElOperandoDeUnaConversion — los tokens que, tras «(Nombre)», hacen de eso un cast (JavacParser.analyzeParens, case RPAREN)', () => {
  const token = (texto: string) => tokenizar(texto)[0]!;

  it.each(['!', '~', '(', 'this', 'super', 'true', 'false', 'null', 'new', 'assert', 'enum', '_', 'switch', 'byte', 'short', 'char', 'int', 'long', 'float', 'double', 'boolean', 'void'])(
    '`%s` abre el operando de un cast',
    (texto) => {
      expect(abreElOperandoDeUnaConversion(token(texto))).toBe(true);
    },
  );

  it.each(['x', '1', '1L', '1.5', "'c'", '"s"', '0x1F', '1.5f'])('«%s» (un identificador o un literal) abre el operando de un cast', (texto) => {
    expect(abreElOperandoDeUnaConversion(token(texto))).toBe(true);
  });

  it.each(['+', '-', '++', '--', '*', '.', ';', ')', ',', '[', '{', '==', 'instanceof'])('«%s» NO abre el operando de un cast', (texto) => {
    expect(abreElOperandoDeUnaConversion(token(texto))).toBe(false);
  });
});
