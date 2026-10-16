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
    expect(frase({ clave: 'switch-cae', datos: { etiqueta: '3' } })).toBe('Como no hubo `break`, la ejecución sigue de largo y entra al `case 3`.');
    expect(frase({ clave: 'switch-cae', datos: { etiqueta: null } })).toBe('Como no hubo `break`, la ejecución sigue de largo y entra al `default`.');
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

  it('detenido por el visualizador: una frase por causa', () => {
    expect(frase({ clave: 'detenido', datos: { causa: 'limite-pasos' } })).toBe(
      'Paré el programa: ya llevaba demasiados pasos. ¿Será un ciclo que nunca termina?',
    );
    expect(frase({ clave: 'detenido', datos: { causa: 'limite-caracteres' } })).toBe('Paré el programa: un texto creció demasiado.');
    expect(frase({ clave: 'detenido', datos: { causa: 'no-disponible-en-ejecucion' } })).toBe('Paré aquí: esta parte todavía no sé ejecutarla.');
    expect(frase({ clave: 'detenido', datos: { causa: 'error-interno' } })).toBe('Algo falló dentro del visualizador y tuve que parar.');
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
