// RED de la tarea 4.2 (REQ-VIS-006, REQ-VIS-011): la cadena de sustitución de un paso — la expresión tal como se escribió, la misma con cada variable cambiada por su
// valor, y el resultado. Es lo que el alumno lee como `intentos < 10 → 3 < 10 → true`. Sale SOLO de los datos de la explicación que el motor calculó.
import { describe, expect, it } from 'vitest';
import type { ExplicacionPaso } from '../motor/vista.ts';
import { cadenaDeSustitucion } from './sustitucion.ts';

function condicionIf(condicion: string, sustituida: string, resultado: boolean): ExplicacionPaso {
  return { clave: 'condicion-if', datos: { condicion, sustituida, lecturas: [], resultado, tieneSino: false } };
}

describe('cadenaDeSustitucion: condiciones', () => {
  it('una condición de if con variables: condición → sustituida → resultado', () => {
    expect(cadenaDeSustitucion(condicionIf('intentos < 10', '3 < 10', true))).toEqual(['intentos < 10', '3 < 10', 'true']);
  });

  it('el resultado falso se escribe false', () => {
    expect(cadenaDeSustitucion(condicionIf('x > 5', '3 > 5', false))).toEqual(['x > 5', '3 > 5', 'false']);
  });

  it('una condición sin variables no repite la sustitución', () => {
    expect(cadenaDeSustitucion(condicionIf('5 > 3', '5 > 3', true))).toEqual(['5 > 3', 'true']);
  });

  it('la condición de un ciclo se escribe igual', () => {
    expect(
      cadenaDeSustitucion({
        clave: 'condicion-ciclo',
        datos: { ciclo: 'while', condicion: 'j < 2', sustituida: '1 < 2', lecturas: [], resultado: true, vuelta: 2 },
      }),
    ).toEqual(['j < 2', '1 < 2', 'true']);
  });
});

describe('cadenaDeSustitucion: cálculos', () => {
  it('una asignación con cálculo: expresión → sustituida → valor', () => {
    expect(
      cadenaDeSustitucion({
        clave: 'asignacion',
        datos: { nombre: 'total', expresion: 'total + precio * 2', sustituida: '100 + 25 * 2', valor: '150', anterior: '100' },
      }),
    ).toEqual(['total + precio * 2', '100 + 25 * 2', '150']);
  });

  it('una declaración con cálculo y variables', () => {
    expect(
      cadenaDeSustitucion({
        clave: 'declaracion-con-valor',
        datos: { nombre: 'total', tipo: 'int', expresion: 'precio * cantidad', sustituida: '18 * 2', valor: '36' },
      }),
    ).toEqual(['precio * cantidad', '18 * 2', '36']);
  });

  it('un cálculo sin variables muestra la expresión y su valor', () => {
    expect(
      cadenaDeSustitucion({
        clave: 'declaracion-con-valor',
        datos: { nombre: 'suma', tipo: 'int', expresion: '2 + 3', sustituida: '2 + 3', valor: '5' },
      }),
    ).toEqual(['2 + 3', '5']);
  });

  it('un literal no tiene nada que sustituir', () => {
    expect(
      cadenaDeSustitucion({
        clave: 'declaracion-con-valor',
        datos: { nombre: 'edad', tipo: 'int', expresion: '17', sustituida: '17', valor: '17' },
      }),
    ).toBeNull();
  });

  it('una asignación compuesta muestra el lado derecho sustituido', () => {
    expect(
      cadenaDeSustitucion({
        clave: 'asignacion-compuesta',
        datos: { nombre: 'suma', operador: '+=', expresion: 'i * j', sustituida: '1 * 0', derecho: '0', anterior: '0', valor: '0' },
      }),
    ).toEqual(['i * j', '1 * 0', '0']);
  });
});

describe('cadenaDeSustitucion: lo demás', () => {
  it('un paso sin expresión que sustituir no tiene cadena', () => {
    expect(cadenaDeSustitucion({ clave: 'vacia', datos: {} })).toBeNull();
    expect(cadenaDeSustitucion({ clave: 'break', datos: { en: 'ciclo' } })).toBeNull();
    expect(cadenaDeSustitucion({ clave: 'incremento', datos: { nombre: 'i', anterior: '1', valor: '2' } })).toBeNull();
  });
});
