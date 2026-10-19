// RED de la tarea 2.19 (ADR 015, design.md §3.3): el catálogo es-MX convierte la CLAVE de explicación de cada paso y sus datos en la frase que
// el robot le dice al alumno de bachillerato. Frases sencillas, en español de México, con el código entre comillas invertidas.
import { describe, expect, it } from 'vitest';
import type { ClaveExplicacion, ExplicacionPaso } from '../../motor/vista.ts';
import { textoDeExplicacion, textosExplicacion } from './explicaciones.ts';

function frase(explicacion: ExplicacionPaso): string {
  return textoDeExplicacion(explicacion);
}

describe('textosExplicacion: una frase por clave', () => {
  it('declaración con un valor literal: crea la variable y le guarda el valor', () => {
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'edad', tipo: 'int', expresion: '17', sustituida: '17', valor: '17' } }),
    ).toBe('Creo la variable `edad` de tipo int y le guardo 17.');
  });

  it('declaración con un cálculo: muestra la sustitución y el resultado', () => {
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'total', tipo: 'int', expresion: 'a + b * 2', sustituida: '2 + 3 * 2', valor: '8' } }),
    ).toBe('Calculo `a + b * 2`: con los valores de ahora es `2 + 3 * 2`, que da 8. Creo la variable `total` de tipo int y le guardo 8.');
  });

  it('declaración con un cálculo sin variables: no repite la sustitución', () => {
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'suma', tipo: 'int', expresion: '2 + 3', sustituida: '2 + 3', valor: '5' } }),
    ).toBe('Calculo `2 + 3`, que da 5. Creo la variable `suma` de tipo int y le guardo 5.');
  });

  // Arreglo (b) del hito 2A: antes decía «con los valores de ahora es `un Scanner.nextInt()`».
  it('una lectura del teclado (`int edad = sc.nextInt();`) dice lo que el usuario escribió, sin «calcular» nada', () => {
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'edad', tipo: 'int', expresion: 'sc.nextInt()', sustituida: 'sc.nextInt()', valor: '25', leeDelTeclado: true } }),
    ).toBe('Leo lo que escribiste en el teclado con `sc.nextInt()`: 25. Creo la variable `edad` de tipo int y le guardo 25.');
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'nombre', tipo: 'String', expresion: 'sc.nextLine()', sustituida: 'sc.nextLine()', valor: '"Ana"', leeDelTeclado: true } }),
    ).toBe('Leo lo que escribiste en el teclado con `sc.nextLine()`: "Ana". Creo la variable `nombre` de tipo String y le guardo "Ana".');
  });

  it('una asignación desde el teclado (`x = sc.nextInt();`), con y sin valor anterior', () => {
    expect(
      frase({ clave: 'asignacion', datos: { nombre: 'x', expresion: 'sc.nextInt()', sustituida: 'sc.nextInt()', valor: '9', anterior: null, leeDelTeclado: true } }),
    ).toBe('Leo lo que escribiste en el teclado con `sc.nextInt()`: 9. Guardo 9 en `x`.');
    expect(
      frase({ clave: 'asignacion', datos: { nombre: 'x', expresion: 'sc.nextInt()', sustituida: 'sc.nextInt()', valor: '9', anterior: '4', leeDelTeclado: true } }),
    ).toBe('Leo lo que escribiste en el teclado con `sc.nextInt()`: 9. Guardo 9 en `x`; antes valía 4.');
  });

  it('una expresión con una lectura mezclada con otras cosas se calcula como siempre, y como el Scanner no se sustituye no dice «un Scanner.»', () => {
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'r', tipo: 'int', expresion: 'sc.nextInt() + base', sustituida: 'sc.nextInt() + 10', valor: '15' } }),
    ).toBe('Calculo `sc.nextInt() + base`: con los valores de ahora es `sc.nextInt() + 10`, que da 15. Creo la variable `r` de tipo int y le guardo 15.');
  });

  it('crear el Scanner (`Scanner sc = new Scanner(System.in);`) no «calcula» un valor: dice para qué sirve; igual el Random', () => {
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'sc', tipo: 'Scanner', expresion: 'new Scanner(System.in)', sustituida: 'new Scanner(System.in)', valor: 'un Scanner' } }),
    ).toBe('Creo la variable `sc` de tipo Scanner con `new Scanner(System.in)`. Con ella voy a leer lo que escribas en el teclado.');
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'azar', tipo: 'Random', expresion: 'new Random(7)', sustituida: 'new Random(7)', valor: 'un Random' } }),
    ).toBe('Creo la variable `azar` de tipo Random con `new Random(7)`. Con ella voy a sacar números aleatorios.');
  });

  it('declaración sin valor: avisa que todavía no se puede usar', () => {
    expect(frase({ clave: 'declaracion-sin-valor', datos: { nombre: 'total', tipo: 'int' } })).toBe(
      'Creo la variable `total` de tipo int. Todavía no tiene valor: Java no te deja usarla hasta que le guardes algo.',
    );
  });

  it('declaración de varias variables en un paso', () => {
    expect(
      frase({
        clave: 'declaracion-varias',
        datos: {
          variables: [
            { nombre: 'a', tipo: 'int', valor: '1' },
            { nombre: 'b', tipo: 'int', valor: null },
          ],
        },
      }),
    ).toBe('Creo estas variables: `a` (int) con 1 y `b` (int) sin valor todavía.');
  });

  it('asignación literal, con cálculo y sin valor anterior', () => {
    expect(frase({ clave: 'asignacion', datos: { nombre: 'x', expresion: '6', sustituida: '6', valor: '6', anterior: '5' } })).toBe(
      'Guardo 6 en `x`; antes valía 5.',
    );
    expect(frase({ clave: 'asignacion', datos: { nombre: 'x', expresion: 'x + 1', sustituida: '5 + 1', valor: '6', anterior: '5' } })).toBe(
      'Calculo `x + 1`: con los valores de ahora es `5 + 1`, que da 6. Guardo 6 en `x`; antes valía 5.',
    );
    expect(frase({ clave: 'asignacion', datos: { nombre: 'y', expresion: '3', sustituida: '3', valor: '3', anterior: null } })).toBe(
      'Guardo 3 en `y`.',
    );
  });

  it('asignación compuesta: el lado derecho, lo que valía la variable y el valor nuevo', () => {
    expect(
      frase({
        clave: 'asignacion-compuesta',
        datos: { nombre: 'total', operador: '+=', expresion: 'precio', sustituida: '25', derecho: '25', anterior: '100', valor: '125' },
      }),
    ).toBe('`total += precio`: el lado derecho vale 25 y `total` valía 100. Guardo 125 en `total`.');
    expect(
      frase({
        clave: 'asignacion-compuesta',
        datos: { nombre: 'total', operador: '+=', expresion: 'precio * 2', sustituida: '25 * 2', derecho: '50', anterior: '100', valor: '150' },
      }),
    ).toBe('`total += precio * 2`: el lado derecho es `25 * 2`, que da 50, y `total` valía 100. Guardo 150 en `total`.');
  });

  // C1 del panel 1: el cálculo se dice en el tipo de la EXPRESIÓN («`25 / 3` da 8») y la conversión se dice al guardar («como `promedio` es `double`, guardo 8.0»). Antes decía «`25 / 3`, que da 8.0».
  it('C1: declaración que convierte al guardar — el cálculo da 8 y el 8.0 aparece al guardarlo', () => {
    expect(
      frase({
        clave: 'declaracion-con-valor',
        datos: { nombre: 'promedio', tipo: 'double', expresion: 'suma / 3', sustituida: '25 / 3', valor: '8.0', conversion: { tipo: 'double', antes: '8' } },
      }),
    ).toBe('Calculo `suma / 3`: con los valores de ahora es `25 / 3`, que da 8. Creo la variable `promedio` de tipo double. Como `promedio` es `double`, guardo 8.0.');
    expect(
      frase({
        clave: 'declaracion-con-valor',
        datos: { nombre: 'mitad', tipo: 'double', expresion: 'cociente / 2', sustituida: '3 / 2', valor: '1.0', conversion: { tipo: 'double', antes: '1' } },
      }),
    ).toBe('Calculo `cociente / 2`: con los valores de ahora es `3 / 2`, que da 1. Creo la variable `mitad` de tipo double. Como `mitad` es `double`, guardo 1.0.');
  });

  it('C1: una constante o un carácter que se convierten no «calculan» nada: solo la conversión (`double d = 5`, `double e = \'a\'`, `char c = 65`)', () => {
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'd', tipo: 'double', expresion: '5', sustituida: '5', valor: '5.0', conversion: { tipo: 'double', antes: '5' } } }),
    ).toBe('Creo la variable `d` de tipo double. Como `d` es `double`, guardo 5.0.');
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'e', tipo: 'double', expresion: "'a'", sustituida: "'a'", valor: '97.0', conversion: { tipo: 'double', antes: "'a'" } } }),
    ).toBe('Creo la variable `e` de tipo double. Como `e` es `double`, guardo 97.0.');
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'c', tipo: 'char', expresion: '65', sustituida: '65', valor: "'A'", conversion: { tipo: 'char', antes: '65' } } }),
    ).toBe("Creo la variable `c` de tipo char. Como `c` es `char`, guardo 'A'.");
  });

  it('C1: `double f = Math.abs(a / b)` — `Math.abs(int)` da 3 y el 3.0 aparece al guardar', () => {
    expect(
      frase({
        clave: 'declaracion-con-valor',
        datos: { nombre: 'f', tipo: 'double', expresion: 'Math.abs(a / b)', sustituida: 'Math.abs(7 / 2)', valor: '3.0', conversion: { tipo: 'double', antes: '3' } },
      }),
    ).toBe('Calculo `Math.abs(a / b)`: con los valores de ahora es `Math.abs(7 / 2)`, que da 3. Creo la variable `f` de tipo double. Como `f` es `double`, guardo 3.0.');
  });

  it('C1: una lectura del teclado que se convierte dice lo que el usuario escribió (5), no el 5.0 de la variable', () => {
    expect(
      frase({
        clave: 'declaracion-con-valor',
        datos: { nombre: 'x', tipo: 'double', expresion: 'sc.nextInt()', sustituida: 'sc.nextInt()', valor: '5.0', leeDelTeclado: true, conversion: { tipo: 'double', antes: '5' } },
      }),
    ).toBe('Leo lo que escribiste en el teclado con `sc.nextInt()`: 5. Creo la variable `x` de tipo double. Como `x` es `double`, guardo 5.0.');
  });

  it('C1: una asignación que convierte (`g = a / b;`) dice el cálculo y luego lo que se guarda, con y sin valor anterior', () => {
    expect(
      frase({
        clave: 'asignacion',
        datos: { nombre: 'g', expresion: 'a / b', sustituida: '7 / 2', valor: '3.0', anterior: null, conversion: { tipo: 'double', antes: '3' } },
      }),
    ).toBe('Calculo `a / b`: con los valores de ahora es `7 / 2`, que da 3. Como `g` es `double`, guardo 3.0.');
    expect(
      frase({
        clave: 'asignacion',
        datos: { nombre: 'g', expresion: 'a / b', sustituida: '7 / 2', valor: '3.0', anterior: '2.0', conversion: { tipo: 'double', antes: '3' } },
      }),
    ).toBe('Calculo `a / b`: con los valores de ahora es `7 / 2`, que da 3. Como `g` es `double`, guardo 3.0; antes valía 2.0.');
  });

  // C2 del panel 1, primera parte: `x += 2.7;` con `int x = 10` guardaba 12 sin decir que la suma da 12.7 y que `int` se queda con 12.
  it('C2: una asignación compuesta que recorta dice lo que dio la operación y por qué se queda con menos', () => {
    expect(
      frase({
        clave: 'asignacion-compuesta',
        datos: { nombre: 'x', operador: '+=', expresion: '2.7', sustituida: '2.7', derecho: '2.7', anterior: '10', valor: '12', recorte: { tipo: 'int', operado: '12.7' } },
      }),
    ).toBe('`x += 2.7`: el lado derecho vale 2.7 y `x` valía 10. `10 + 2.7` da 12.7 y, como `x` es `int`, se queda con 12. Guardo 12 en `x`.');
    expect(
      frase({
        clave: 'asignacion-compuesta',
        datos: { nombre: 'x', operador: '/=', expresion: 'k', sustituida: '2.5', derecho: '2.5', anterior: '10', valor: '4', recorte: { tipo: 'int', operado: '4.0' } },
      }),
    ).toBe('`x /= k`: el lado derecho vale 2.5 y `x` valía 10. `10 / 2.5` da 4.0 y, como `x` es `int`, se queda con 4. Guardo 4 en `x`.');
    expect(
      frase({
        clave: 'asignacion-compuesta',
        datos: { nombre: 'ch', operador: '+=', expresion: '1', sustituida: '1', derecho: '1', anterior: "'a'", valor: "'b'", recorte: { tipo: 'char', operado: '98' } },
      }),
    ).toBe("`ch += 1`: el lado derecho vale 1 y `ch` valía 'a'. `'a' + 1` da 98 y, como `ch` es `char`, se queda con 'b'. Guardo 'b' en `ch`.");
  });

  // C2, segunda parte: los `++`/`--` de adentro de una expresión.
  it('C2: un `++` dentro de una expresión explica de dónde sale el valor que se ve (`int c = i++ + i;` con `i = 7`)', () => {
    expect(
      frase({
        clave: 'declaracion-con-valor',
        datos: {
          nombre: 'c',
          tipo: 'int',
          expresion: 'i++ + i',
          sustituida: 'i++ + 8',
          valor: '15',
          efectos: [{ expresion: 'i++', nombre: 'i', valor: '7', nuevo: '8' }],
        },
      }),
    ).toBe('Calculo `i++ + i`: con los valores de ahora es `i++ + 8`, que da 15. `i++` vale 7 y deja `i` en 8. Creo la variable `c` de tipo int y le guardo 15.');
  });

  it('C2: `i = i++;` explica el «antes valía»: el `i++` ya había subido `i` antes de guardar', () => {
    expect(
      frase({
        clave: 'asignacion',
        datos: { nombre: 'i', expresion: 'i++', sustituida: 'i++', valor: '9', anterior: '10', efectos: [{ expresion: 'i++', nombre: 'i', valor: '9', nuevo: '10' }] },
      }),
    ).toBe('Calculo `i++`, que da 9. `i++` vale 9 y deja `i` en 10. Guardo 9 en `i`; antes valía 10.');
  });

  it('C2: varios efectos (uno por frase, en orden) y en una asignación compuesta', () => {
    expect(
      frase({
        clave: 'declaracion-con-valor',
        datos: {
          nombre: 'r',
          tipo: 'int',
          expresion: 'a-- + b++',
          sustituida: 'a-- + b++',
          valor: '6',
          efectos: [
            { expresion: 'a--', nombre: 'a', valor: '5', nuevo: '4' },
            { expresion: 'b++', nombre: 'b', valor: '1', nuevo: '2' },
          ],
        },
      }),
    ).toBe('Calculo `a-- + b++`, que da 6. `a--` vale 5 y deja `a` en 4. `b++` vale 1 y deja `b` en 2. Creo la variable `r` de tipo int y le guardo 6.');
    expect(
      frase({
        clave: 'asignacion-compuesta',
        datos: {
          nombre: 's',
          operador: '+=',
          expresion: 'a++',
          sustituida: 'a++',
          derecho: '5',
          anterior: '1',
          valor: '6',
          efectos: [{ expresion: 'a++', nombre: 'a', valor: '5', nuevo: '6' }],
        },
      }),
    ).toBe('`s += a++`: el lado derecho vale 5 y `s` valía 1. `a++` vale 5 y deja `a` en 6. Guardo 6 en `s`.');
  });

  it('incremento y decremento', () => {
    expect(frase({ clave: 'incremento', datos: { nombre: 'i', anterior: '3', valor: '4' } })).toBe('Sumo 1 a `i`: valía 3 y ahora vale 4.');
    expect(frase({ clave: 'decremento', datos: { nombre: 'i', anterior: '3', valor: '2' } })).toBe('Resto 1 a `i`: valía 3 y ahora vale 2.');
  });

  it('varias acciones del for en un paso', () => {
    expect(frase({ clave: 'acciones-del-for', datos: { acciones: ['i = 0', 'j = 9'] } })).toBe('Hago estas acciones, en orden: `i = 0`, `j = 9`.');
  });

  it('impresión: con salto de línea, sin salto, solo el salto y por la consola de errores', () => {
    expect(frase({ clave: 'impresion', datos: { texto: 'Hola, mundo', flujo: 'out', saltoDeLinea: true } })).toBe(
      'Imprimo en la consola: «Hola, mundo» y paso a la línea siguiente.',
    );
    expect(frase({ clave: 'impresion', datos: { texto: 'Edad: ', flujo: 'out', saltoDeLinea: false } })).toBe(
      'Imprimo en la consola: «Edad: » sin pasar a la línea siguiente.',
    );
    expect(frase({ clave: 'impresion', datos: { texto: '', flujo: 'out', saltoDeLinea: true } })).toBe('Imprimo solamente un salto de línea.');
    expect(frase({ clave: 'impresion', datos: { texto: 'Error', flujo: 'err', saltoDeLinea: true } })).toBe(
      'Imprimo en la consola de errores: «Error» y paso a la línea siguiente.',
    );
  });

  it('llamada que no imprime', () => {
    expect(frase({ clave: 'expresion', datos: { expresion: 'sc.nextLine()' } })).toBe('Ejecuto `sc.nextLine()`.');
  });

  it('condición de if: verdadera, falsa sin else, falsa con else, sin variables', () => {
    const base = { condicion: 'cantidad < 1', sustituida: '2 < 1', lecturas: [{ nombre: 'cantidad', valor: '2' }] };
    expect(frase({ clave: 'condicion-if', datos: { ...base, resultado: false, tieneSino: false } })).toBe(
      'Reviso `cantidad < 1`: cantidad vale 2, así que es falso y no entro al `if`.',
    );
    expect(frase({ clave: 'condicion-if', datos: { ...base, resultado: false, tieneSino: true } })).toBe(
      'Reviso `cantidad < 1`: cantidad vale 2, así que es falso, no entro al `if` y sigo con el `else`.',
    );
    expect(frase({ clave: 'condicion-if', datos: { ...base, sustituida: '0 < 1', lecturas: [{ nombre: 'cantidad', valor: '0' }], resultado: true, tieneSino: true } })).toBe(
      'Reviso `cantidad < 1`: cantidad vale 0, así que es verdadero y entro al `if`.',
    );
    expect(frase({ clave: 'condicion-if', datos: { condicion: 'true', sustituida: 'true', lecturas: [], resultado: true, tieneSino: false } })).toBe(
      'Reviso `true`: es verdadero y entro al `if`.',
    );
  });

  it('varias variables en la condición: se enumeran con "y"', () => {
    expect(
      frase({
        clave: 'condicion-if',
        datos: {
          condicion: 'a > 0 && b > 0',
          sustituida: '1 > 0 && 2 > 0',
          lecturas: [
            { nombre: 'a', valor: '1' },
            { nombre: 'b', valor: '2' },
          ],
          resultado: true,
          tieneSino: false,
        },
      }),
    ).toBe('Reviso `a > 0 && b > 0`: a vale 1 y b vale 2, así que es verdadero y entro al `if`.');
    expect(
      frase({
        clave: 'condicion-if',
        datos: {
          condicion: 'a < b && b < c',
          sustituida: '1 < 2 && 2 < 3',
          lecturas: [
            { nombre: 'a', valor: '1' },
            { nombre: 'b', valor: '2' },
            { nombre: 'c', valor: '3' },
          ],
          resultado: true,
          tieneSino: false,
        },
      }),
    ).toBe('Reviso `a < b && b < c`: a vale 1, b vale 2 y c vale 3, así que es verdadero y entro al `if`.');
  });

  it('condición de ciclo: while y for entran o salen; do-while repite o sale', () => {
    const lecturas = [{ nombre: 'i', valor: '0' }];
    expect(frase({ clave: 'condicion-ciclo', datos: { ciclo: 'while', condicion: 'i < 3', sustituida: '0 < 3', lecturas, resultado: true, vuelta: 1 } })).toBe(
      'Reviso `i < 3` (revisión 1): i vale 0, así que es verdadero y entro al cuerpo del `while`.',
    );
    expect(frase({ clave: 'condicion-ciclo', datos: { ciclo: 'for', condicion: 'i < 3', sustituida: '3 < 3', lecturas: [{ nombre: 'i', valor: '3' }], resultado: false, vuelta: 4 } })).toBe(
      'Reviso `i < 3` (revisión 4): i vale 3, así que es falso y salgo del ciclo.',
    );
    expect(frase({ clave: 'condicion-ciclo', datos: { ciclo: 'do-while', condicion: 'i > 0', sustituida: '2 > 0', lecturas: [{ nombre: 'i', valor: '2' }], resultado: true, vuelta: 1 } })).toBe(
      'Terminó el cuerpo del `do-while` (vuelta 1). Reviso `i > 0`: i vale 2, así que es verdadero y repito.',
    );
    expect(frase({ clave: 'condicion-ciclo', datos: { ciclo: 'do-while', condicion: 'i > 0', sustituida: '0 > 0', lecturas: [{ nombre: 'i', valor: '0' }], resultado: false, vuelta: 3 } })).toBe(
      'Terminó el cuerpo del `do-while` (vuelta 3). Reviso `i > 0`: i vale 0, así que es falso y salgo del ciclo.',
    );
  });

  it('switch: elige un case, elige el default, no coincide, o cae al siguiente grupo', () => {
    expect(frase({ clave: 'switch-elige-caso', datos: { expresion: 'opcion', valor: '2', etiqueta: '2' } })).toBe(
      'El `switch` mira `opcion`, que vale 2, y salta al `case 2`.',
    );
    expect(frase({ clave: 'switch-elige-defecto', datos: { expresion: 'opcion', valor: '9' } })).toBe(
      'El `switch` mira `opcion`, que vale 9. Ningún `case` coincide, así que salta al `default`.',
    );
    expect(frase({ clave: 'switch-sin-coincidencia', datos: { expresion: 'opcion', valor: '9' } })).toBe(
      'El `switch` mira `opcion`, que vale 9. Ningún `case` coincide y no hay `default`: sigo con lo que viene después del `switch`.',
    );
    // C8 del panel 1: lo que el alumno no sabe es que Java NO vuelve a comparar al caer; el texto lo dice.
    expect(frase({ clave: 'switch-cae', datos: { etiqueta: '3' } })).toBe(
      'El grupo de arriba no termina en `break`, así que Java sigue de largo y ejecuta también lo del `case 3`, sin revisar si coincide.',
    );
    expect(frase({ clave: 'switch-cae', datos: { etiqueta: '"b"' } })).toBe(
      'El grupo de arriba no termina en `break`, así que Java sigue de largo y ejecuta también lo del `case "b"`, sin revisar si coincide.',
    );
    expect(frase({ clave: 'switch-cae', datos: { etiqueta: null } })).toBe(
      'El grupo de arriba no termina en `break`, así que Java sigue de largo y ejecuta también lo del `default`.',
    );
  });

  it('break, continue, return y sentencia vacía', () => {
    expect(frase({ clave: 'break', datos: { en: 'ciclo' } })).toBe('`break`: salgo del ciclo ahora mismo.');
    expect(frase({ clave: 'break', datos: { en: 'switch' } })).toBe('`break`: termino el `switch` ahora mismo.');
    expect(frase({ clave: 'continue', datos: { ciclo: 'while' } })).toBe('`continue`: me salto lo que falta de esta vuelta del `while` y sigo con la siguiente.');
    expect(frase({ clave: 'continue', datos: { ciclo: 'for' } })).toBe('`continue`: me salto lo que falta de esta vuelta del `for` y sigo con su actualización.');
    expect(frase({ clave: 'return', datos: {} })).toBe('`return`: termino el programa aquí.');
    expect(frase({ clave: 'vacia', datos: {} })).toBe('Una sentencia vacía (solo `;`): no hace nada, pero cuenta como un paso.');
  });

  it('excepción de Java: usa el nombre corto de la clase y el mensaje de Java', () => {
    expect(frase({ clave: 'excepcion', datos: { clase: 'java.lang.ArithmeticException', mensaje: '/ by zero' } })).toBe(
      'Java detuvo el programa con una excepción: `ArithmeticException` (/ by zero).',
    );
    expect(frase({ clave: 'excepcion', datos: { clase: 'java.util.NoSuchElementException', mensaje: null } })).toBe(
      'Java detuvo el programa con una excepción: `NoSuchElementException`.',
    );
  });

  // C7 del panel 1: el título del aviso ya dice «Se detuvo por seguridad»; el paso `detenido` no lo repite con «Paré el programa…», solo explica el motivo (un solo texto).
  it('detenido por el visualizador: una frase por causa', () => {
    expect(frase({ clave: 'detenido', datos: { causa: 'limite-pasos' } })).toBe(
      'El programa llevaba demasiados pasos y todavía no terminaba. ¿Será un ciclo que nunca termina?',
    );
    expect(frase({ clave: 'detenido', datos: { causa: 'limite-caracteres' } })).toBe(
      'El programa escribió demasiado texto: una cadena o la consola pasaron del tamaño que el visualizador permite.',
    );
    expect(frase({ clave: 'detenido', datos: { causa: 'no-disponible-en-ejecucion' } })).toBe('Paré aquí: esta parte todavía no sé ejecutarla.');
    expect(frase({ clave: 'detenido', datos: { causa: 'error-interno' } })).toBe('Algo falló dentro del visualizador y tuve que parar.');
    expect(frase({ clave: 'detenido', datos: { causa: 'limite-tiempo' } })).toBe('El programa llevaba demasiado tiempo calculando y todavía no terminaba.');
  });

  it('detenido por pasos o por tiempo con la evidencia del ciclo (tarea 3.4): cita la variable que no cambió, no una pregunta genérica, y es el ÚNICO texto del final (C7)', () => {
    const diagnostico = { ciclo: 'while', linea: 5, condicion: 'contador <= 5', vueltas: 100, sinCambio: [{ nombre: 'contador', valor: '1' }] } as const;
    const evidencia =
      'En las últimas 100 vueltas del `while` de la línea 5, `contador` siempre valió 1, así que `contador <= 5` siempre dio `true`. Mientras nada dentro del ciclo cambie `contador`, el ciclo no va a terminar.';
    expect(frase({ clave: 'detenido', datos: { causa: 'limite-pasos', diagnostico } })).toBe(evidencia);
    expect(frase({ clave: 'detenido', datos: { causa: 'limite-tiempo', diagnostico } })).toBe(evidencia);
  });

  it('detenido en un ciclo sin variables que citar (`while (true) {}`): dice el motivo y que el ciclo seguía repitiéndose', () => {
    const diagnostico = { ciclo: 'while', linea: 3, condicion: 'true', vueltas: 100, sinCambio: [] } as const;
    expect(frase({ clave: 'detenido', datos: { causa: 'limite-pasos', diagnostico } })).toBe(
      'El programa llevaba demasiados pasos y todavía no terminaba. El ciclo `while` de la línea 3, con la condición `true`, seguía repitiéndose.',
    );
  });
});

describe('textosExplicacion: cobertura', () => {
  it('tiene una frase para cada clave (el tipo ya lo exige; aquí se comprueba en ejecución)', () => {
    const claves: ClaveExplicacion[] = [
      'declaracion-con-valor',
      'declaracion-sin-valor',
      'declaracion-varias',
      'asignacion',
      'asignacion-compuesta',
      'incremento',
      'decremento',
      'acciones-del-for',
      'impresion',
      'expresion',
      'condicion-if',
      'condicion-ciclo',
      'switch-elige-caso',
      'switch-elige-defecto',
      'switch-sin-coincidencia',
      'switch-cae',
      'break',
      'continue',
      'return',
      'vacia',
      'excepcion',
      'detenido',
    ];
    expect(Object.keys(textosExplicacion).sort()).toEqual([...claves].sort());
  });
});
