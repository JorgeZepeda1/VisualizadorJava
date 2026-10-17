// RED del resto de la tarea 4.4 (REQ-VIS-006, hito 2C): en el paso de la condición de un `if`, el editor atenúa la rama que NO se toma. La presentación decide QUÉ rango del código se atenúa a partir de
// lo que el motor ya calculó: el resultado de la condición (`Paso.explicacion.datos.resultado`) y los rangos de las ramas de cada `if` (`VistaPrograma.ramasDeIf`, que se empata con el paso por el
// nodo de la condición). Aquí no se evalúa nada. Un `else if` es un `sino` que abarca el `if` siguiente completo.
import { describe, expect, it } from 'vitest';
import type { ExplicacionPaso, Paso, RamasDeIf, VistaPrograma } from '../motor/vista.ts';
import { nodo, paso, vistaDePrueba } from './ayudas-de-prueba.ts';
import { ramaNoTomada } from './ramas-del-if.ts';

function condicionDeIf(parcial: { nodo: number; resultado: boolean; tieneSino: boolean }): Paso {
  const explicacion: ExplicacionPaso = {
    clave: 'condicion-if',
    datos: { condicion: 'n > 3', sustituida: '5 > 3', lecturas: [{ nombre: 'n', valor: '5' }], resultado: parcial.resultado, tieneSino: parcial.tieneSino },
  };
  return paso({ clase: 'condicion-if', nodo: parcial.nodo, linea: 4, explicacion, control: { resultado: parcial.resultado } });
}

// `if (a) { A } else if (b) { B } else { C }` y, después, un `if (c) D` sin llaves ni `else`. Los números son desplazamientos del texto (los rangos son inventados pero coherentes).
const IF_EXTERIOR: RamasDeIf = { nodo: 1, entonces: { inicio: 10, fin: 20 }, sino: { inicio: 26, fin: 90 } };
const IF_ANIDADO: RamasDeIf = { nodo: 3, entonces: { inicio: 40, fin: 50 }, sino: { inicio: 56, fin: 90 } };
const IF_SIMPLE: RamasDeIf = { nodo: 6, entonces: { inicio: 100, fin: 130 }, sino: null };

function vistaConRamas(ramas: readonly RamasDeIf[] | undefined): VistaPrograma {
  const base = vistaDePrueba([nodo(0), nodo(1), nodo(2), nodo(3), nodo(4), nodo(5), nodo(6)]);
  return ramas === undefined ? base : { ...base, ramasDeIf: ramas };
}

const VISTA = vistaConRamas([IF_EXTERIOR, IF_ANIDADO, IF_SIMPLE]);

describe('ramaNoTomada: la rama del `if` que NO se toma en el paso de su condición', () => {
  it('si la condición es falsa, la rama que no se toma es la del `if` (el `entonces`)', () => {
    expect(ramaNoTomada(condicionDeIf({ nodo: 1, resultado: false, tieneSino: true }), VISTA)).toEqual({ inicio: 10, fin: 20 });
  });

  it('si la condición es verdadera y hay `else`, la rama que no se toma es el `else` (el `sino`)', () => {
    expect(ramaNoTomada(condicionDeIf({ nodo: 1, resultado: true, tieneSino: true }), VISTA)).toEqual({ inicio: 26, fin: 90 });
  });

  it('un `else if` es un `sino` que abarca el `if` siguiente completo: con la primera condición verdadera se atenúa todo ese `if`', () => {
    const atenuado = ramaNoTomada(condicionDeIf({ nodo: 1, resultado: true, tieneSino: true }), VISTA);
    expect(atenuado).toEqual(IF_EXTERIOR.sino);
    expect(atenuado?.fin).toBe(IF_ANIDADO.sino?.fin);
  });

  it('la condición del `else if` tiene sus propias ramas: falsa atenúa su `entonces`, verdadera su `else`', () => {
    expect(ramaNoTomada(condicionDeIf({ nodo: 3, resultado: false, tieneSino: true }), VISTA)).toEqual({ inicio: 40, fin: 50 });
    expect(ramaNoTomada(condicionDeIf({ nodo: 3, resultado: true, tieneSino: true }), VISTA)).toEqual({ inicio: 56, fin: 90 });
  });

  it('un `if` sin `else` con la condición verdadera no atenúa nada: no hay rama que se salte', () => {
    expect(ramaNoTomada(condicionDeIf({ nodo: 6, resultado: true, tieneSino: false }), VISTA)).toBeNull();
  });

  it('un `if` sin `else` con la condición falsa atenúa su único bloque', () => {
    expect(ramaNoTomada(condicionDeIf({ nodo: 6, resultado: false, tieneSino: false }), VISTA)).toEqual({ inicio: 100, fin: 130 });
  });
});

describe('ramaNoTomada: lo que NO es la condición de un `if` no atenúa nada', () => {
  it('un paso de impresión, aunque su nodo sea el de un `if`, no atenúa nada', () => {
    const impresion = paso({ clase: 'impresion', nodo: 1, explicacion: { clave: 'impresion', datos: { texto: 'x', flujo: 'out', saltoDeLinea: true } } });
    expect(ramaNoTomada(impresion, VISTA)).toBeNull();
  });

  it('la condición de un ciclo no atenúa nada (un ciclo no tiene rama que se salte en el editor)', () => {
    const ciclo = paso({
      clase: 'condicion-ciclo',
      nodo: 1,
      explicacion: { clave: 'condicion-ciclo', datos: { ciclo: 'while', condicion: 'x', sustituida: 'x', lecturas: [], resultado: true, vuelta: 1 } },
    });
    expect(ramaNoTomada(ciclo, VISTA)).toBeNull();
  });

  it('antes del primer paso (paso 0) no hay nada que atenuar', () => {
    expect(ramaNoTomada(null, VISTA)).toBeNull();
  });

  it('sin vista del programa no inventa un rango', () => {
    expect(ramaNoTomada(condicionDeIf({ nodo: 1, resultado: false, tieneSino: true }), null)).toBeNull();
  });

  it('una vista armada a mano sin `ramasDeIf` (el campo es opcional) no atenúa nada ni falla', () => {
    expect(ramaNoTomada(condicionDeIf({ nodo: 1, resultado: false, tieneSino: true }), vistaConRamas(undefined))).toBeNull();
  });

  it('una condición cuyo nodo no está entre las ramas conocidas no inventa un rango', () => {
    expect(ramaNoTomada(condicionDeIf({ nodo: 5, resultado: false, tieneSino: true }), VISTA)).toBeNull();
  });
});
