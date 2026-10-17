// RED de la tarea 4.4 (REQ-VIS-004, REQ-VIS-002, REQ-VIS-007): lo que el editor marca. La línea recién ejecutada y la siguiente van con DOS marcas distintas (el editor decide cuáles: ▶ y ▷, un
// borde sólido y uno punteado — no solo color); el contador de vueltas va como etiqueta junto al encabezado de cada ciclo activo; y un problema (error o aviso) se subraya sobre su rango.
import { describe, expect, it } from 'vitest';
import type { Problema } from '../motor/vista.ts';
import { nodo, vistaDePrueba } from './ayudas-de-prueba.ts';
import { derivarResaltados, resaltadosDelProblema } from './resaltados.ts';

const VISTA = vistaDePrueba([nodo(0, { linea: 4 }), nodo(1, { linea: 6 })]);

describe('derivarResaltados: líneas y vueltas', () => {
  it('lleva la línea recién ejecutada y la siguiente', () => {
    expect(derivarResaltados({ lineas: { ejecutada: 4, siguiente: 5 }, vueltas: [], ramaNoTomada: null }, VISTA)).toEqual({
      lineaEjecutada: 4,
      lineaSiguiente: 5,
      vueltas: [],
      ramaNoTomada: null,
    });
  });

  it('lleva la rama del `if` que no se toma como el tramo de código a atenuar (desde/hasta, como el subrayado de un problema)', () => {
    const resaltados = derivarResaltados({ lineas: { ejecutada: 4, siguiente: 5 }, vueltas: [], ramaNoTomada: { inicio: 66, fin: 98 } }, VISTA);
    expect(resaltados.ramaNoTomada).toEqual({ desde: 66, hasta: 98 });
  });

  it('triangulación: otro tramo, otros desplazamientos', () => {
    const resaltados = derivarResaltados({ lineas: { ejecutada: 9, siguiente: 10 }, vueltas: [], ramaNoTomada: { inicio: 12, fin: 40 } }, VISTA);
    expect(resaltados.ramaNoTomada).toEqual({ desde: 12, hasta: 40 });
  });

  it('antes del primer paso solo hay línea siguiente', () => {
    expect(derivarResaltados({ lineas: { ejecutada: null, siguiente: 3 }, vueltas: [], ramaNoTomada: null }, VISTA)).toEqual({
      lineaEjecutada: null,
      lineaSiguiente: 3,
      vueltas: [],
      ramaNoTomada: null,
    });
  });

  it('pone la etiqueta de vuelta junto al encabezado de cada ciclo activo, en la línea del ciclo', () => {
    const resaltados = derivarResaltados(
      {
        lineas: { ejecutada: 7, siguiente: 8 },
        vueltas: [
          { nombre: 'ciclo externo', vuelta: 2, termino: false, nodoDelCiclo: 0 },
          { nombre: 'ciclo interno', vuelta: 3, termino: true, nodoDelCiclo: 1 },
        ],
        ramaNoTomada: null,
      },
      VISTA,
    );
    expect(resaltados.vueltas).toEqual([
      { linea: 4, vuelta: 2, termino: false },
      { linea: 6, vuelta: 3, termino: true },
    ]);
  });

  it('un ciclo que la vista no conoce no inventa una línea', () => {
    const resaltados = derivarResaltados(
      { lineas: { ejecutada: 1, siguiente: null }, vueltas: [{ nombre: 'ciclo', vuelta: 1, termino: false, nodoDelCiclo: 99 }], ramaNoTomada: null },
      VISTA,
    );
    expect(resaltados.vueltas).toEqual([]);
  });
});

describe('resaltadosDelProblema: el subrayado de un error o un aviso', () => {
  const RANGO = { inicio: 12, fin: 20 } as const;

  it('un error de compilación se subraya como error (ondulado) en su rango y su línea', () => {
    const problema: Problema = { categoria: 'error-compilacion', codigo: 'falta-punto-y-coma', rango: RANGO, linea: 3, datos: { mensaje: 'x' } };
    expect(resaltadosDelProblema(problema)).toEqual({ desde: 12, hasta: 20, linea: 3, tipo: 'error' });
  });

  it('un aviso de «no disponible» se subraya como aviso (punteado)', () => {
    const problema: Problema = { categoria: 'no-disponible', codigo: 'arreglo-no-soportado', rango: RANGO, linea: 4, datos: { tipoArreglo: 'int[]' } };
    expect(resaltadosDelProblema(problema)).toEqual({ desde: 12, hasta: 20, linea: 4, tipo: 'aviso' });
  });
});
