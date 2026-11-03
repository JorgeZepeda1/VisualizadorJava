// RED de la tarea 2.19 (ADR 015, design.md §3.3), actualizado en la tarea R0.3 (REQ-PANT-010, panel 1 H9/H10, plantillas T1 y T2 del maestro): el catálogo es-MX convierte la CLAVE de explicación de cada paso
// y sus datos en la frase que el robot le dice al alumno de bachillerato. Voz en TERCERA persona («Java revisa…», «Java guarda…»), `true` y `false` como código, «vuelta» para cada repetición de un ciclo.
// Frases sencillas, en español de México, con el código entre comillas invertidas. Las correcciones C1 y C2 de la `v0.3.1` conservan su sentido: el cálculo se dice en el tipo de la expresión y la
// conversión se dice al guardar; el recorte de `x += 2.7` explica el 12.7 y el 12.
import { describe, expect, it } from 'vitest';
import type { ClaveExplicacion, ExplicacionPaso } from '../../motor/vista.ts';
import { textoDeExplicacion, textosExplicacion } from './explicaciones.ts';

function frase(explicacion: ExplicacionPaso): string {
  return textoDeExplicacion(explicacion);
}

describe('textosExplicacion: una frase por clave', () => {
  it('declaración con un valor literal: Java crea la variable y le guarda el valor', () => {
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'edad', tipo: 'int', expresion: '17', sustituida: '17', valor: '17' } }),
    ).toBe('Java crea la variable `edad` de tipo int y le guarda 17.');
  });

  it('declaración con un cálculo: muestra la sustitución y el resultado', () => {
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'total', tipo: 'int', expresion: 'a + b * 2', sustituida: '2 + 3 * 2', valor: '8' } }),
    ).toBe('Java calcula `a + b * 2`: con los valores de ahora es `2 + 3 * 2`, que da 8. Después crea la variable `total` de tipo int y le guarda 8.');
  });

  it('declaración con un cálculo sin variables: no repite la sustitución', () => {
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'suma', tipo: 'int', expresion: '2 + 3', sustituida: '2 + 3', valor: '5' } }),
    ).toBe('Java calcula `2 + 3`, que da 5. Después crea la variable `suma` de tipo int y le guarda 5.');
  });

  // Arreglo (b) del hito 2A: antes decía «con los valores de ahora es `un Scanner.nextInt()`». Una lectura no se «calcula»: se dice lo que se escribió (puede ser lo que el alumno tecleó o la entrada preparada de un ejemplo).
  it('una lectura del teclado (`int edad = sc.nextInt();`) dice lo que se escribió, sin «calcular» nada', () => {
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'edad', tipo: 'int', expresion: 'sc.nextInt()', sustituida: 'sc.nextInt()', valor: '25', leeDelTeclado: true } }),
    ).toBe('Java lee con `sc.nextInt()` lo que se escribió y obtiene 25. Después crea la variable `edad` de tipo int y le guarda 25.');
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'nombre', tipo: 'String', expresion: 'sc.nextLine()', sustituida: 'sc.nextLine()', valor: '"Ana"', leeDelTeclado: true } }),
    ).toBe('Java lee con `sc.nextLine()` lo que se escribió y obtiene "Ana". Después crea la variable `nombre` de tipo String y le guarda "Ana".');
  });

  it('una asignación desde el teclado (`x = sc.nextInt();`), con y sin valor anterior', () => {
    expect(
      frase({ clave: 'asignacion', datos: { nombre: 'x', expresion: 'sc.nextInt()', sustituida: 'sc.nextInt()', valor: '9', anterior: null, leeDelTeclado: true } }),
    ).toBe('Java lee con `sc.nextInt()` lo que se escribió y obtiene 9. Después guarda 9 en `x`.');
    expect(
      frase({ clave: 'asignacion', datos: { nombre: 'x', expresion: 'sc.nextInt()', sustituida: 'sc.nextInt()', valor: '9', anterior: '4', leeDelTeclado: true } }),
    ).toBe('Java lee con `sc.nextInt()` lo que se escribió y obtiene 9. Después guarda 9 en `x`; antes valía 4.');
  });

  // A3 del panel R0 (experto en Java): con `nextDouble()` y un `8` tecleado, «lo que se escribió en el teclado: 8.0» afirmaba que el alumno tecleó «8.0». Lo que Java obtiene (8.0) no es lo que se escribió (8):
  // la frase ya no los iguala. El dato sale de la entrada; la conversión es del motor.
  it('A3: `nextDouble()` con un entero tecleado no afirma que se escribió «8.0»: dice lo que Java obtiene', () => {
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'nota', tipo: 'double', expresion: 'teclado.nextDouble()', sustituida: 'teclado.nextDouble()', valor: '8.0', leeDelTeclado: true } }),
    ).toBe('Java lee con `teclado.nextDouble()` lo que se escribió y obtiene 8.0. Después crea la variable `nota` de tipo double y le guarda 8.0.');
    expect(
      frase({ clave: 'asignacion', datos: { nombre: 'nota', expresion: 'teclado.nextDouble()', sustituida: 'teclado.nextDouble()', valor: '8.0', anterior: '7.5', leeDelTeclado: true } }),
    ).toBe('Java lee con `teclado.nextDouble()` lo que se escribió y obtiene 8.0. Después guarda 8.0 en `nota`; antes valía 7.5.');
  });

  it('una expresión con una lectura mezclada con otras cosas se calcula como siempre, y como el Scanner no se sustituye no dice «un Scanner.»', () => {
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'r', tipo: 'int', expresion: 'sc.nextInt() + base', sustituida: 'sc.nextInt() + 10', valor: '15' } }),
    ).toBe('Java calcula `sc.nextInt() + base`: con los valores de ahora es `sc.nextInt() + 10`, que da 15. Después crea la variable `r` de tipo int y le guarda 15.');
  });

  it('crear el Scanner (`Scanner sc = new Scanner(System.in);`) no «calcula» un valor: dice para qué sirve; igual el Random', () => {
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'sc', tipo: 'Scanner', expresion: 'new Scanner(System.in)', sustituida: 'new Scanner(System.in)', valor: 'un Scanner' } }),
    ).toBe('Java crea la variable `sc` de tipo Scanner con `new Scanner(System.in)`. Con ella leerá lo que escribas en el teclado.');
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'azar', tipo: 'Random', expresion: 'new Random(7)', sustituida: 'new Random(7)', valor: 'un Random' } }),
    ).toBe('Java crea la variable `azar` de tipo Random con `new Random(7)`. Con ella sacará números aleatorios.');
  });

  it('declaración sin valor: avisa que todavía no se puede usar', () => {
    expect(frase({ clave: 'declaracion-sin-valor', datos: { nombre: 'total', tipo: 'int' } })).toBe(
      'Java crea la variable `total` de tipo int. Todavía no tiene valor: Java no te deja usarla hasta que le guardes algo.',
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
    ).toBe('Java crea estas variables: `a` (int) con 1 y `b` (int) sin valor todavía.');
  });

  // A1 del panel R0 (experto en Java): la lista se armaba con una expresión regular que cambiaba la ÚLTIMA coma del texto, y un `String` con comas ("Hola, mundo") salía como «Hola y mundo».
  it('A1: un String con comas no se toca (`String s = "x", t = "Hola, mundo";`)', () => {
    expect(
      frase({
        clave: 'declaracion-varias',
        datos: {
          variables: [
            { nombre: 's', tipo: 'String', valor: '"x"' },
            { nombre: 't', tipo: 'String', valor: '"Hola, mundo"' },
          ],
        },
      }),
    ).toBe('Java crea estas variables: `s` (String) con "x" y `t` (String) con "Hola, mundo".');
    expect(
      frase({
        clave: 'declaracion-varias',
        datos: {
          variables: [
            { nombre: 'w', tipo: 'String', valor: '"a"' },
            { nombre: 'x', tipo: 'String', valor: '"b, c, d"' },
          ],
        },
      }),
    ).toBe('Java crea estas variables: `w` (String) con "a" y `x` (String) con "b, c, d".');
  });

  it('A1: con tres o más variables separa con comas y une las dos últimas con «y»; con una sola no agrega nada', () => {
    expect(
      frase({
        clave: 'declaracion-varias',
        datos: {
          variables: [
            { nombre: 'a', tipo: 'int', valor: '1' },
            { nombre: 'b', tipo: 'String', valor: '"uno, dos"' },
            { nombre: 'c', tipo: 'int', valor: null },
          ],
        },
      }),
    ).toBe('Java crea estas variables: `a` (int) con 1, `b` (String) con "uno, dos" y `c` (int) sin valor todavía.');
    expect(frase({ clave: 'declaracion-varias', datos: { variables: [{ nombre: 'a', tipo: 'int', valor: '1' }] } })).toBe('Java crea estas variables: `a` (int) con 1.');
  });

  // V1 del maestro: un valor `boolean` es código, igual que en las condiciones. Un String "true" lleva comillas y no se confunde.
  it('V1: declaración de varias variables con un boolean', () => {
    expect(
      frase({
        clave: 'declaracion-varias',
        datos: {
          variables: [
            { nombre: 'activo', tipo: 'boolean', valor: 'true' },
            { nombre: 'texto', tipo: 'String', valor: '"true"' },
          ],
        },
      }),
    ).toBe('Java crea estas variables: `activo` (boolean) con `true` y `texto` (String) con "true".');
  });

  it('asignación literal, con cálculo y sin valor anterior', () => {
    expect(frase({ clave: 'asignacion', datos: { nombre: 'x', expresion: '6', sustituida: '6', valor: '6', anterior: '5' } })).toBe(
      'Java guarda 6 en `x`; antes valía 5.',
    );
    expect(frase({ clave: 'asignacion', datos: { nombre: 'x', expresion: 'x + 1', sustituida: '5 + 1', valor: '6', anterior: '5' } })).toBe(
      'Java calcula `x + 1`: con los valores de ahora es `5 + 1`, que da 6. Después guarda 6 en `x`; antes valía 5.',
    );
    expect(frase({ clave: 'asignacion', datos: { nombre: 'y', expresion: '3', sustituida: '3', valor: '3', anterior: null } })).toBe(
      'Java guarda 3 en `y`.',
    );
  });

  // V1 del maestro (panel R0): `true` y `false` como código también en los VALORES (14 frases de 9 programas del curso salían con la palabra suelta).
  it('V1: un valor boolean es código al guardarlo, calcularlo y reasignarlo', () => {
    expect(frase({ clave: 'declaracion-con-valor', datos: { nombre: 'activo', tipo: 'boolean', expresion: 'false', sustituida: 'false', valor: 'false' } })).toBe(
      'Java crea la variable `activo` de tipo boolean y le guarda `false`.',
    );
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'aprobado', tipo: 'boolean', expresion: 'promedio >= 6.0', sustituida: '8.5 >= 6.0', valor: 'true' } }),
    ).toBe('Java calcula `promedio >= 6.0`: con los valores de ahora es `8.5 >= 6.0`, que da `true`. Después crea la variable `aprobado` de tipo boolean y le guarda `true`.');
    expect(frase({ clave: 'declaracion-con-valor', datos: { nombre: 'a', tipo: 'boolean', expresion: '3 > 5', sustituida: '3 > 5', valor: 'false' } })).toBe(
      'Java calcula `3 > 5`, que da `false`. Después crea la variable `a` de tipo boolean y le guarda `false`.',
    );
    expect(frase({ clave: 'asignacion', datos: { nombre: 'seEncontroNegativo', expresion: 'true', sustituida: 'true', valor: 'true', anterior: 'false' } })).toBe(
      'Java guarda `true` en `seEncontroNegativo`; antes valía `false`.',
    );
    expect(frase({ clave: 'asignacion', datos: { nombre: 'ok', expresion: 'a && b', sustituida: 'true && false', valor: 'false', anterior: null } })).toBe(
      'Java calcula `a && b`: con los valores de ahora es `true && false`, que da `false`. Después guarda `false` en `ok`.',
    );
    expect(frase({ clave: 'asignacion', datos: { nombre: 'ok', expresion: 'teclado.nextBoolean()', sustituida: 'teclado.nextBoolean()', valor: 'true', anterior: 'false', leeDelTeclado: true } })).toBe(
      'Java lee con `teclado.nextBoolean()` lo que se escribió y obtiene `true`. Después guarda `true` en `ok`; antes valía `false`.',
    );
  });

  it('V1: un String "true" o "false" lleva comillas y no se convierte en código', () => {
    expect(frase({ clave: 'declaracion-con-valor', datos: { nombre: 's', tipo: 'String', expresion: '"true"', sustituida: '"true"', valor: '"true"' } })).toBe(
      'Java crea la variable `s` de tipo String y le guarda "true".',
    );
    expect(frase({ clave: 'asignacion', datos: { nombre: 's', expresion: '"false"', sustituida: '"false"', valor: '"false"', anterior: '"true"' } })).toBe(
      'Java guarda "false" en `s`; antes valía "true".',
    );
  });

  it('asignación compuesta: el lado derecho, lo que valía la variable y el valor nuevo', () => {
    expect(
      frase({
        clave: 'asignacion-compuesta',
        datos: { nombre: 'total', operador: '+=', expresion: 'precio', sustituida: '25', derecho: '25', anterior: '100', valor: '125' },
      }),
    ).toBe('`total += precio`: el lado derecho vale 25 y `total` valía 100. Java guarda 125 en `total`.');
    expect(
      frase({
        clave: 'asignacion-compuesta',
        datos: { nombre: 'total', operador: '+=', expresion: 'precio * 2', sustituida: '25 * 2', derecho: '50', anterior: '100', valor: '150' },
      }),
    ).toBe('`total += precio * 2`: el lado derecho es `25 * 2`, que da 50, y `total` valía 100. Java guarda 150 en `total`.');
  });

  // C1 del panel 1: el cálculo se dice en el tipo de la EXPRESIÓN («`25 / 3` da 8») y la conversión se dice al guardar («como `promedio` es `double`, Java guarda 8.0»). Antes decía «`25 / 3`, que da 8.0».
  it('C1: declaración que convierte al guardar — el cálculo da 8 y el 8.0 aparece al guardarlo', () => {
    expect(
      frase({
        clave: 'declaracion-con-valor',
        datos: { nombre: 'promedio', tipo: 'double', expresion: 'suma / 3', sustituida: '25 / 3', valor: '8.0', conversion: { tipo: 'double', antes: '8' } },
      }),
    ).toBe(
      'Java calcula `suma / 3`: con los valores de ahora es `25 / 3`, que da 8. Después crea la variable `promedio` de tipo double. Como `promedio` es `double`, guarda 8.0.',
    );
    expect(
      frase({
        clave: 'declaracion-con-valor',
        datos: { nombre: 'mitad', tipo: 'double', expresion: 'cociente / 2', sustituida: '3 / 2', valor: '1.0', conversion: { tipo: 'double', antes: '1' } },
      }),
    ).toBe(
      'Java calcula `cociente / 2`: con los valores de ahora es `3 / 2`, que da 1. Después crea la variable `mitad` de tipo double. Como `mitad` es `double`, guarda 1.0.',
    );
  });

  it('C1: una constante o un carácter que se convierten no «calculan» nada: solo la conversión (`double d = 5`, `double e = \'a\'`, `char c = 65`)', () => {
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'd', tipo: 'double', expresion: '5', sustituida: '5', valor: '5.0', conversion: { tipo: 'double', antes: '5' } } }),
    ).toBe('Java crea la variable `d` de tipo double. Como `d` es `double`, guarda 5.0.');
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'e', tipo: 'double', expresion: "'a'", sustituida: "'a'", valor: '97.0', conversion: { tipo: 'double', antes: "'a'" } } }),
    ).toBe('Java crea la variable `e` de tipo double. Como `e` es `double`, guarda 97.0.');
    expect(
      frase({ clave: 'declaracion-con-valor', datos: { nombre: 'c', tipo: 'char', expresion: '65', sustituida: '65', valor: "'A'", conversion: { tipo: 'char', antes: '65' } } }),
    ).toBe("Java crea la variable `c` de tipo char. Como `c` es `char`, guarda 'A'.");
  });

  it('C1: `double f = Math.abs(a / b)` — `Math.abs(int)` da 3 y el 3.0 aparece al guardar', () => {
    expect(
      frase({
        clave: 'declaracion-con-valor',
        datos: { nombre: 'f', tipo: 'double', expresion: 'Math.abs(a / b)', sustituida: 'Math.abs(7 / 2)', valor: '3.0', conversion: { tipo: 'double', antes: '3' } },
      }),
    ).toBe(
      'Java calcula `Math.abs(a / b)`: con los valores de ahora es `Math.abs(7 / 2)`, que da 3. Después crea la variable `f` de tipo double. Como `f` es `double`, guarda 3.0.',
    );
  });

  it('C1: una lectura del teclado que se convierte dice lo que se escribió (5), no el 5.0 de la variable', () => {
    expect(
      frase({
        clave: 'declaracion-con-valor',
        datos: { nombre: 'x', tipo: 'double', expresion: 'sc.nextInt()', sustituida: 'sc.nextInt()', valor: '5.0', leeDelTeclado: true, conversion: { tipo: 'double', antes: '5' } },
      }),
    ).toBe('Java lee con `sc.nextInt()` lo que se escribió y obtiene 5. Después crea la variable `x` de tipo double. Como `x` es `double`, guarda 5.0.');
  });

  it('C1: una asignación que convierte (`g = a / b;`) dice el cálculo y luego lo que se guarda, con y sin valor anterior', () => {
    expect(
      frase({
        clave: 'asignacion',
        datos: { nombre: 'g', expresion: 'a / b', sustituida: '7 / 2', valor: '3.0', anterior: null, conversion: { tipo: 'double', antes: '3' } },
      }),
    ).toBe('Java calcula `a / b`: con los valores de ahora es `7 / 2`, que da 3. Como `g` es `double`, guarda 3.0.');
    expect(
      frase({
        clave: 'asignacion',
        datos: { nombre: 'g', expresion: 'a / b', sustituida: '7 / 2', valor: '3.0', anterior: '2.0', conversion: { tipo: 'double', antes: '3' } },
      }),
    ).toBe('Java calcula `a / b`: con los valores de ahora es `7 / 2`, que da 3. Como `g` es `double`, guarda 3.0; antes valía 2.0.');
  });

  it('C1: una asignación que convierte una constante no calcula nada y nombra a Java antes de la conversión', () => {
    expect(
      frase({ clave: 'asignacion', datos: { nombre: 'd', expresion: '5', sustituida: '5', valor: '5.0', anterior: '2.5', conversion: { tipo: 'double', antes: '5' } } }),
    ).toBe('Como `d` es `double`, Java guarda 5.0; antes valía 2.5.');
  });

  // C2 del panel 1, primera parte: `x += 2.7;` con `int x = 10` guardaba 12 sin decir que la suma da 12.7 y que `int` se queda con 12.
  it('C2: una asignación compuesta que recorta dice lo que dio la operación y por qué se queda con menos', () => {
    expect(
      frase({
        clave: 'asignacion-compuesta',
        datos: { nombre: 'x', operador: '+=', expresion: '2.7', sustituida: '2.7', derecho: '2.7', anterior: '10', valor: '12', recorte: { tipo: 'int', operado: '12.7' } },
      }),
    ).toBe('`x += 2.7`: el lado derecho vale 2.7 y `x` valía 10. `10 + 2.7` da 12.7 y, como `x` es `int`, se queda con 12. Java guarda 12 en `x`.');
    expect(
      frase({
        clave: 'asignacion-compuesta',
        datos: { nombre: 'x', operador: '/=', expresion: 'k', sustituida: '2.5', derecho: '2.5', anterior: '10', valor: '4', recorte: { tipo: 'int', operado: '4.0' } },
      }),
    ).toBe('`x /= k`: el lado derecho vale 2.5 y `x` valía 10. `10 / 2.5` da 4.0 y, como `x` es `int`, se queda con 4. Java guarda 4 en `x`.');
    expect(
      frase({
        clave: 'asignacion-compuesta',
        datos: { nombre: 'ch', operador: '+=', expresion: '1', sustituida: '1', derecho: '1', anterior: "'a'", valor: "'b'", recorte: { tipo: 'char', operado: '98' } },
      }),
    ).toBe("`ch += 1`: el lado derecho vale 1 y `ch` valía 'a'. `'a' + 1` da 98 y, como `ch` es `char`, se queda con 'b'. Java guarda 'b' en `ch`.");
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
    ).toBe(
      'Java calcula `i++ + i`: con los valores de ahora es `i++ + 8`, que da 15. `i++` vale 7 y deja `i` en 8. Después crea la variable `c` de tipo int y le guarda 15.',
    );
  });

  it('C2: `i = i++;` explica el «antes valía»: el `i++` ya había subido `i` antes de guardar', () => {
    expect(
      frase({
        clave: 'asignacion',
        datos: { nombre: 'i', expresion: 'i++', sustituida: 'i++', valor: '9', anterior: '10', efectos: [{ expresion: 'i++', nombre: 'i', valor: '9', nuevo: '10' }] },
      }),
    ).toBe('Java calcula `i++`, que da 9. `i++` vale 9 y deja `i` en 10. Después guarda 9 en `i`; antes valía 10.');
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
    ).toBe(
      'Java calcula `a-- + b++`, que da 6. `a--` vale 5 y deja `a` en 4. `b++` vale 1 y deja `b` en 2. Después crea la variable `r` de tipo int y le guarda 6.',
    );
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
    ).toBe('`s += a++`: el lado derecho vale 5 y `s` valía 1. `a++` vale 5 y deja `a` en 6. Java guarda 6 en `s`.');
  });

  it('incremento y decremento', () => {
    expect(frase({ clave: 'incremento', datos: { nombre: 'i', anterior: '3', valor: '4' } })).toBe('Java le suma 1 a `i`: valía 3 y ahora vale 4.');
    expect(frase({ clave: 'decremento', datos: { nombre: 'i', anterior: '3', valor: '2' } })).toBe('Java le resta 1 a `i`: valía 3 y ahora vale 2.');
  });

  it('varias acciones del for en un paso', () => {
    expect(frase({ clave: 'acciones-del-for', datos: { acciones: ['i = 0', 'j = 9'] } })).toBe('Java hace estas acciones, en orden: `i = 0`, `j = 9`.');
  });

  it('impresión: con salto de línea, sin salto, solo el salto y por la consola de errores', () => {
    expect(frase({ clave: 'impresion', datos: { texto: 'Hola, mundo', flujo: 'out', saltoDeLinea: true } })).toBe(
      'Java imprime en la consola: «Hola, mundo» y pasa a la línea siguiente.',
    );
    expect(frase({ clave: 'impresion', datos: { texto: 'Edad: ', flujo: 'out', saltoDeLinea: false } })).toBe(
      'Java imprime en la consola: «Edad: » sin pasar a la línea siguiente.',
    );
    expect(frase({ clave: 'impresion', datos: { texto: '', flujo: 'out', saltoDeLinea: true } })).toBe('Java imprime solamente un salto de línea.');
    expect(frase({ clave: 'impresion', datos: { texto: '', flujo: 'out', saltoDeLinea: false } })).toBe('Java imprime en la consola un texto vacío.');
    expect(frase({ clave: 'impresion', datos: { texto: 'Error', flujo: 'err', saltoDeLinea: true } })).toBe(
      'Java imprime en la consola de errores: «Error» y pasa a la línea siguiente.',
    );
  });

  it('llamada que no imprime', () => {
    expect(frase({ clave: 'expresion', datos: { expresion: 'sc.nextLine()' } })).toBe('Java ejecuta `sc.nextLine()`.');
  });

  // T1 del maestro: «Java revisa `{condicion}`. Con los valores de ahora queda `{sustituida}`, que da `true`. Entra al `if`.»
  it('T1, condición de if: Java revisa la condición, la sustituye y dice `true` o `false` como código (MaquinaSnacks línea 72)', () => {
    const maquinaSnacks = { condicion: 'dinero < total', sustituida: '50 < 36', lecturas: [{ nombre: 'dinero', valor: '50' }, { nombre: 'total', valor: '36' }] };
    expect(frase({ clave: 'condicion-if', datos: { ...maquinaSnacks, resultado: false, tieneSino: true } })).toBe(
      'Java revisa `dinero < total`. Con los valores de ahora queda `50 < 36`, que da `false`. Se salta el `if` y entra al `else`.',
    );
    expect(frase({ clave: 'condicion-if', datos: { ...maquinaSnacks, sustituida: '20 < 36', resultado: true, tieneSino: true } })).toBe(
      'Java revisa `dinero < total`. Con los valores de ahora queda `20 < 36`, que da `true`. Entra al `if`.',
    );
  });

  it('T1: una condición falsa sin else se salta el bloque y sigue después de él', () => {
    expect(
      frase({
        clave: 'condicion-if',
        datos: { condicion: 'cantidad < 1', sustituida: '2 < 1', lecturas: [{ nombre: 'cantidad', valor: '2' }], resultado: false, tieneSino: false },
      }),
    ).toBe('Java revisa `cantidad < 1`. Con los valores de ahora queda `2 < 1`, que da `false`. Se salta el bloque del `if` y sigue después de él.');
  });

  it('T1: si la condición no cambia al sustituir (no lee variables) se omite «Con los valores de ahora queda…»', () => {
    expect(frase({ clave: 'condicion-if', datos: { condicion: 'true', sustituida: 'true', lecturas: [], resultado: true, tieneSino: false } })).toBe(
      'Java revisa `true`, que da `true`. Entra al `if`.',
    );
  });

  // V2 del maestro (panel R0): una condición que es UNA variable boolean no necesita «queda `true`, que da `true`»; basta decir que vale `true`.
  it('V2: una condición que es una sola variable boolean dice «que vale `true`», sin repetir el valor', () => {
    const licencia = { condicion: 'tieneLicencia', sustituida: 'true', lecturas: [{ nombre: 'tieneLicencia', valor: 'true' }] };
    expect(frase({ clave: 'condicion-if', datos: { ...licencia, resultado: true, tieneSino: false } })).toBe('Java revisa `tieneLicencia`, que vale `true`. Entra al `if`.');
    expect(frase({ clave: 'condicion-if', datos: { ...licencia, sustituida: 'false', resultado: false, tieneSino: true } })).toBe(
      'Java revisa `tieneLicencia`, que vale `false`. Se salta el `if` y entra al `else`.',
    );
  });

  it('V2: en los ciclos, la primera revisión dice «que vale» y las siguientes «que ahora vale»; el do-while ya trae «Ahora» en el prefijo', () => {
    const continuar = { ciclo: 'while', condicion: 'continuar', sustituida: 'true', lecturas: [{ nombre: 'continuar', valor: 'true' }] } as const;
    expect(frase({ clave: 'condicion-ciclo', datos: { ...continuar, resultado: true, vuelta: 1 } })).toBe(
      'Antes de la primera vuelta, Java revisa `continuar`, que vale `true`. Entra al cuerpo del `while`.',
    );
    expect(frase({ clave: 'condicion-ciclo', datos: { ...continuar, sustituida: 'false', resultado: false, vuelta: 7 } })).toBe(
      'Terminó la vuelta 6. Java revisa otra vez `continuar`, que ahora vale `false`. El ciclo termina y el programa sigue después del `while`.',
    );
    expect(frase({ clave: 'condicion-ciclo', datos: { ...continuar, resultado: true, vuelta: 3 } })).toBe(
      'Terminó la vuelta 2. Java revisa otra vez `continuar`, que ahora vale `true`. Empieza la vuelta 3.',
    );
    expect(frase({ clave: 'condicion-ciclo', datos: { ...continuar, ciclo: 'do-while', sustituida: 'false', resultado: false, vuelta: 2 } })).toBe(
      'Terminó la vuelta 2 del `do-while`. Ahora Java revisa `continuar`, que vale `false`. Sale del ciclo.',
    );
  });

  it('V2: una comparación o una negación NO es «una sola variable»: conserva «queda…, que da…»', () => {
    expect(frase({ clave: 'condicion-if', datos: { condicion: '!activo', sustituida: '!true', lecturas: [{ nombre: 'activo', valor: 'true' }], resultado: false, tieneSino: false } })).toBe(
      'Java revisa `!activo`. Con los valores de ahora queda `!true`, que da `false`. Se salta el bloque del `if` y sigue después de él.',
    );
  });

  it('T1: una condición compuesta conserva la sustitución completa (las piezas llegan con el modo reto, R1)', () => {
    expect(
      frase({
        clave: 'condicion-if',
        datos: {
          condicion: 'cantidad < 1 || cantidad > 3',
          sustituida: '2 < 1 || 2 > 3',
          lecturas: [{ nombre: 'cantidad', valor: '2' }],
          resultado: false,
          tieneSino: false,
        },
      }),
    ).toBe(
      'Java revisa `cantidad < 1 || cantidad > 3`. Con los valores de ahora queda `2 < 1 || 2 > 3`, que da `false`. Se salta el bloque del `if` y sigue después de él.',
    );
  });

  // T2 del maestro: cada repetición es una «vuelta»; la primera revisión es «antes de la primera vuelta».
  it('T2, ciclo while o for: la primera revisión es antes de la primera vuelta; entra o no da ni una vuelta', () => {
    const base = { ciclo: 'while', condicion: 'i < 3', sustituida: '0 < 3', lecturas: [{ nombre: 'i', valor: '0' }], vuelta: 1 } as const;
    expect(frase({ clave: 'condicion-ciclo', datos: { ...base, resultado: true } })).toBe(
      'Antes de la primera vuelta, Java revisa `i < 3`: queda `0 < 3`, que da `true`. Entra al cuerpo del `while`.',
    );
    expect(frase({ clave: 'condicion-ciclo', datos: { ...base, ciclo: 'for', sustituida: '5 < 3', resultado: false } })).toBe(
      'Antes de la primera vuelta, Java revisa `i < 3`: queda `5 < 3`, que da `false`. No da ni una vuelta: sigue después del `for`.',
    );
  });

  it('T2: desde la segunda revisión cuenta la vuelta que terminó y la que empieza («Terminó la vuelta 2…»)', () => {
    const base = { ciclo: 'while', condicion: 'contador <= 5', sustituida: '3 <= 5', lecturas: [{ nombre: 'contador', valor: '3' }], vuelta: 3 } as const;
    expect(frase({ clave: 'condicion-ciclo', datos: { ...base, resultado: true } })).toBe(
      'Terminó la vuelta 2. Java revisa otra vez `contador <= 5`: queda `3 <= 5`, que da `true`. Empieza la vuelta 3.',
    );
    expect(frase({ clave: 'condicion-ciclo', datos: { ...base, ciclo: 'for', sustituida: '6 <= 5', vuelta: 6, resultado: false } })).toBe(
      'Terminó la vuelta 5. Java revisa otra vez `contador <= 5`: queda `6 <= 5`, que da `false`. El ciclo termina y el programa sigue después del `for`.',
    );
  });

  it('T2: sin variables que sustituir (`while (true)`) se omite «queda…» y se sigue contando las vueltas', () => {
    expect(
      frase({ clave: 'condicion-ciclo', datos: { ciclo: 'while', condicion: 'true', sustituida: 'true', lecturas: [], resultado: true, vuelta: 1 } }),
    ).toBe('Antes de la primera vuelta, Java revisa `true`, que da `true`. Entra al cuerpo del `while`.');
    expect(
      frase({ clave: 'condicion-ciclo', datos: { ciclo: 'while', condicion: 'true', sustituida: 'true', lecturas: [], resultado: true, vuelta: 4 } }),
    ).toBe('Terminó la vuelta 3. Java revisa otra vez `true`, que da `true`. Empieza la vuelta 4.');
  });

  it('T2, do-while: la vuelta ya terminó cuando Java revisa; repite o sale', () => {
    expect(frase({ clave: 'condicion-ciclo', datos: { ciclo: 'do-while', condicion: 'i > 0', sustituida: '2 > 0', lecturas: [{ nombre: 'i', valor: '2' }], resultado: true, vuelta: 1 } })).toBe(
      'Terminó la vuelta 1 del `do-while`. Ahora Java revisa `i > 0`: queda `2 > 0`, que da `true`. Repite: empieza la vuelta 2.',
    );
    expect(frase({ clave: 'condicion-ciclo', datos: { ciclo: 'do-while', condicion: 'i > 0', sustituida: '0 > 0', lecturas: [{ nombre: 'i', valor: '0' }], resultado: false, vuelta: 3 } })).toBe(
      'Terminó la vuelta 3 del `do-while`. Ahora Java revisa `i > 0`: queda `0 > 0`, que da `false`. Sale del ciclo.',
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
      'El `switch` mira `opcion`, que vale 9. Ningún `case` coincide y no hay `default`: sigue con lo que viene después del `switch`.',
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
    expect(frase({ clave: 'break', datos: { en: 'ciclo' } })).toBe('`break`: Java sale del ciclo ahora mismo.');
    expect(frase({ clave: 'break', datos: { en: 'switch' } })).toBe('`break`: Java termina el `switch` ahora mismo.');
    // A2 del panel R0 (experto en Java): en `while` y `do-while` el `continue` salta a REVISAR LA CONDICIÓN, que puede terminar el ciclo; «sigue con la siguiente» prometía una vuelta que quizá no ocurre.
    expect(frase({ clave: 'continue', datos: { ciclo: 'while' } })).toBe('`continue`: Java se salta lo que falta de esta vuelta del `while` y pasa a revisar la condición.');
    expect(frase({ clave: 'continue', datos: { ciclo: 'do-while' } })).toBe('`continue`: Java se salta lo que falta de esta vuelta del `do-while` y pasa a revisar la condición.');
    expect(frase({ clave: 'continue', datos: { ciclo: 'for' } })).toBe('`continue`: Java se salta lo que falta de esta vuelta del `for` y sigue con su actualización.');
    expect(frase({ clave: 'return', datos: {} })).toBe('`return` termina `main`, y con eso termina el programa.');
    expect(frase({ clave: 'vacia', datos: {} })).toBe('Una sentencia vacía (solo `;`): no hace nada, pero cuenta como un paso.');
  });

  it('excepción de Java: usa el nombre corto de la clase y el mensaje de Java', () => {
    expect(frase({ clave: 'excepcion', datos: { clase: 'java.lang.ArithmeticException', mensaje: '/ by zero' } })).toBe(
      'Java detuvo el programa por un error mientras se ejecutaba (una excepción): `ArithmeticException` (/ by zero).',
    );
    expect(frase({ clave: 'excepcion', datos: { clase: 'java.util.NoSuchElementException', mensaje: null } })).toBe(
      'Java detuvo el programa por un error mientras se ejecutaba (una excepción): `NoSuchElementException`.',
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
    expect(frase({ clave: 'detenido', datos: { causa: 'no-disponible-en-ejecucion' } })).toBe('El visualizador se detuvo aquí: esta parte todavía no la sabe ejecutar.');
    expect(frase({ clave: 'detenido', datos: { causa: 'error-interno' } })).toBe('Algo falló dentro del visualizador y tuvo que parar.');
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
