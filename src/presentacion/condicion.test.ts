// RED de las tareas 4.2 y 4.8 (REQ-VIS-006): lo que el panel de condición muestra cuando el paso actual evalúa una condición o elige un caso — la cadena de sustitución completa,
// la rama que corre (✓) y la que no (✗, atenuada y NUNCA oculta), las condiciones de un `else if` EN ORDEN, y en un `switch` el `case` igualado, la caída sin `break` y el `default`.
// Todo sale de los datos de la explicación de los pasos que el motor calculó.
import { describe, expect, it } from 'vitest';
import type { ExplicacionPaso, Paso } from '../motor/vista.ts';
import { paso } from './ayudas-de-prueba.ts';
import { derivarCondicion } from './condicion.ts';

function pasoIf(condicion: string, sustituida: string, resultado: boolean, tieneSino: boolean, linea = 1): Paso {
  const explicacion: ExplicacionPaso = { clave: 'condicion-if', datos: { condicion, sustituida, lecturas: [], resultado, tieneSino } };
  return paso({ clase: 'condicion-if', linea, explicacion, control: { resultado } });
}

function pasoCiclo(ciclo: 'while' | 'for' | 'do-while', resultado: boolean, vuelta: number): Paso {
  const explicacion: ExplicacionPaso = {
    clave: 'condicion-ciclo',
    datos: { ciclo, condicion: 'j < 2', sustituida: '1 < 2', lecturas: [], resultado, vuelta },
  };
  return paso({ clase: 'condicion-ciclo', explicacion, control: { resultado, vuelta } });
}

describe('derivarCondicion: if', () => {
  it('un if falso con else muestra la cadena, atenúa el if y marca el else como el que corre', () => {
    const condicion = derivarCondicion([pasoIf('x > 5', '3 > 5', false, true)]);
    expect(condicion).toEqual({
      tipo: 'if',
      evaluaciones: [{ cadena: ['x > 5', '3 > 5', 'false'], resultado: false }],
      ramas: [
        { texto: 'Entra al `if`', corre: false },
        { texto: 'Entra al `else`', corre: true },
      ],
    });
  });

  it('un if verdadero con else marca el if como el que corre y atenúa el else (nunca lo oculta)', () => {
    const condicion = derivarCondicion([pasoIf('intentos < 10', '3 < 10', true, true)]);
    expect(condicion).toMatchObject({
      tipo: 'if',
      evaluaciones: [{ cadena: ['intentos < 10', '3 < 10', 'true'], resultado: true }],
      ramas: [
        { texto: 'Entra al `if`', corre: true },
        { texto: 'Entra al `else`', corre: false },
      ],
    });
  });

  it('un if sin else solo tiene la rama del if: corre o no corre', () => {
    expect(derivarCondicion([pasoIf('x > 5', '3 > 5', false, false)])).toMatchObject({ ramas: [{ texto: 'Entra al `if`', corre: false }] });
    expect(derivarCondicion([pasoIf('x > 2', '3 > 2', true, false)])).toMatchObject({ ramas: [{ texto: 'Entra al `if`', corre: true }] });
  });
});

describe('derivarCondicion: cadena de else if, en orden', () => {
  it('un else if sigue a un if falso con else: se muestran las dos condiciones, en el orden en que se revisaron', () => {
    const condicion = derivarCondicion([pasoIf('suma > 100', '3 > 100', false, true, 15), pasoIf('suma > 0', '3 > 0', true, true, 17)]);
    expect(condicion).toEqual({
      tipo: 'if',
      evaluaciones: [
        { cadena: ['suma > 100', '3 > 100', 'false'], resultado: false },
        { cadena: ['suma > 0', '3 > 0', 'true'], resultado: true },
      ],
      ramas: [
        { texto: 'Entra al `else if`', corre: true },
        { texto: 'Entra al `else`', corre: false },
      ],
    });
  });

  it('con tres condiciones encadenadas, las tres aparecen en orden', () => {
    const condicion = derivarCondicion([
      pasoIf('n == 1', '3 == 1', false, true),
      pasoIf('n == 2', '3 == 2', false, true),
      pasoIf('n == 3', '3 == 3', true, false),
    ]);
    expect(condicion).toMatchObject({ tipo: 'if' });
    expect(condicion?.tipo === 'if' && condicion.evaluaciones.map((e) => e.cadena[0])).toEqual(['n == 1', 'n == 2', 'n == 3']);
  });

  it('un if falso SIN else no encadena: la condición siguiente es de otro if', () => {
    const condicion = derivarCondicion([pasoIf('a > 1', '0 > 1', false, false), pasoIf('b > 1', '5 > 1', true, false)]);
    expect(condicion?.tipo === 'if' && condicion.evaluaciones).toHaveLength(1);
  });

  it('un paso de otra clase en medio corta la cadena', () => {
    const condicion = derivarCondicion([pasoIf('a > 1', '0 > 1', false, true), paso({ clase: 'impresion' }), pasoIf('b > 1', '5 > 1', true, false)]);
    expect(condicion?.tipo === 'if' && condicion.evaluaciones).toHaveLength(1);
  });

  it('un if verdadero no empieza una cadena hacia atrás: solo cuenta lo anterior que lo precedió falso', () => {
    const condicion = derivarCondicion([pasoIf('a > 1', '5 > 1', true, true), pasoIf('b > 1', '5 > 1', true, false)]);
    expect(condicion?.tipo === 'if' && condicion.evaluaciones).toHaveLength(1);
  });
});

describe('derivarCondicion: ciclos', () => {
  it('while verdadero: entra al cuerpo y no sale', () => {
    expect(derivarCondicion([pasoCiclo('while', true, 2)])).toEqual({
      tipo: 'ciclo',
      ciclo: 'while',
      cadena: ['j < 2', '1 < 2', 'true'],
      resultado: true,
      vuelta: 2,
      ramas: [
        { texto: 'Entra al cuerpo del ciclo', corre: true },
        { texto: 'Sale del ciclo', corre: false },
      ],
    });
  });

  it('for falso: sale del ciclo y atenúa la entrada al cuerpo', () => {
    expect(derivarCondicion([pasoCiclo('for', false, 3)])).toMatchObject({
      ramas: [
        { texto: 'Entra al cuerpo del ciclo', corre: false },
        { texto: 'Sale del ciclo', corre: true },
      ],
    });
  });

  it('do-while verdadero: repite el ciclo', () => {
    expect(derivarCondicion([pasoCiclo('do-while', true, 1)])).toMatchObject({
      ciclo: 'do-while',
      ramas: [
        { texto: 'Repite el ciclo', corre: true },
        { texto: 'Sale del ciclo', corre: false },
      ],
    });
  });
});

describe('derivarCondicion: switch', () => {
  function pasoSwitch(explicacion: ExplicacionPaso, clase: 'seleccion-switch' | 'caida-switch' = 'seleccion-switch'): Paso {
    return paso({ clase, explicacion });
  }

  it('señala el case igualado, con la cadena de lo que mira el switch', () => {
    const condicion = derivarCondicion([pasoSwitch({ clave: 'switch-elige-caso', datos: { expresion: 'codigo', valor: '"A1"', etiqueta: '"A1"' } })]);
    expect(condicion).toEqual({ tipo: 'switch', cadena: ['codigo', '"A1"'], filas: [{ texto: 'Coincide con `case "A1"`', corre: true }] });
  });

  it('señala el default cuando ningún case coincide', () => {
    expect(derivarCondicion([pasoSwitch({ clave: 'switch-elige-defecto', datos: { expresion: 'n', valor: '9' } })])).toEqual({
      tipo: 'switch',
      cadena: ['n', '9'],
      filas: [{ texto: 'Ningún `case` coincide: va al `default`', corre: true }],
    });
  });

  it('dice que no hay coincidencia ni default', () => {
    expect(derivarCondicion([pasoSwitch({ clave: 'switch-sin-coincidencia', datos: { expresion: 'n', valor: '9' } })])).toMatchObject({
      filas: [{ texto: 'Ningún `case` coincide y no hay `default`: sigue después del `switch`', corre: true }],
    });
  });

  it('señala la caída sin break, a un case y al default', () => {
    expect(derivarCondicion([pasoSwitch({ clave: 'switch-cae', datos: { etiqueta: '2' } }, 'caida-switch')])).toEqual({
      tipo: 'switch',
      cadena: null,
      filas: [{ texto: 'Cae a `case 2` porque no hubo `break`', corre: true }],
    });
    expect(derivarCondicion([pasoSwitch({ clave: 'switch-cae', datos: { etiqueta: null } }, 'caida-switch')])).toMatchObject({
      filas: [{ texto: 'Cae al `default` porque no hubo `break`', corre: true }],
    });
  });
});

describe('derivarCondicion: lo que no es una condición', () => {
  it('un paso que no evalúa nada no tiene panel de condición', () => {
    expect(derivarCondicion([paso({ clase: 'impresion' })])).toBeNull();
    expect(derivarCondicion([])).toBeNull();
  });
});
