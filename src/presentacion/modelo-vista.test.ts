// RED de la tarea 4.2 (REQ-VIS-006, REQ-VIS-011): el modelo de vista de un paso — TODO lo que la pantalla necesita para dibujarlo, derivado de la traza sin tocar el DOM (design.md §6.1,
// ADR 013): las líneas recién ejecutada y siguiente, las variables vivas, la cadena de sustitución, el panel de condición, las vueltas, la consola, el búfer y lo que dice el robot.
import { describe, expect, it } from 'vitest';
import type { ExplicacionPaso, InstantaneaDeEjecucion, Paso } from '../motor/vista.ts';
import { nodo, paso, ranura, vistaDePrueba } from './ayudas-de-prueba.ts';
import { derivarModeloVista } from './modelo-vista.ts';

// Nodos del programa de mentira: 0 declaración de intentos, 1 condición del while, 2 asignación de total.
const VISTA = vistaDePrueba(
  [
    nodo(0, { clase: 'declaracion', linea: 3, vivas: [0] }),
    nodo(1, { clase: 'condicion-ciclo', linea: 4, vivas: [0, 1] }),
    nodo(2, { clase: 'expresion', linea: 5, vivas: [0, 1] }),
  ],
  [ranura(0, 'intentos'), ranura(1, 'total')],
);

const CONDICION: ExplicacionPaso = {
  clave: 'condicion-if',
  datos: { condicion: 'intentos < 10', sustituida: '3 < 10', lecturas: [{ nombre: 'intentos', valor: '3' }], resultado: true, tieneSino: false },
};
const ASIGNACION: ExplicacionPaso = {
  clave: 'asignacion',
  datos: { nombre: 'total', expresion: 'total + precio', sustituida: '100 + 25', valor: '125', anterior: '100' },
};

const PASO_CONDICION: Paso = paso({ clase: 'condicion-if', nodo: 1, linea: 4, explicacion: CONDICION, control: { resultado: true } });
const PASO_ASIGNACION: Paso = paso({
  clase: 'asignacion',
  nodo: 2,
  linea: 5,
  explicacion: ASIGNACION,
  cambios: [{ ranura: 'total', anterior: 100, nuevo: 125, punto: 0 }],
});

function instantanea(parcial: Partial<InstantaneaDeEjecucion>): InstantaneaDeEjecucion {
  return { paso: 0, linea: null, variables: [], salida: [], ...parcial };
}

describe('derivarModeloVista: la condición de un if', () => {
  const modelo = derivarModeloVista({
    vista: VISTA,
    aplicados: [PASO_CONDICION],
    siguiente: PASO_ASIGNACION,
    instantanea: instantanea({ paso: 1, linea: 4, variables: [{ nombre: 'intentos', tipo: 'int', valor: 3 }] }),
    total: 3,
    ejecucion: { estado: 'calculando' },
  });

  it('deriva la cadena de sustitución completa: intentos < 10 → 3 < 10 → true', () => {
    expect(modelo.cadena).toEqual(['intentos < 10', '3 < 10', 'true']);
  });

  it('el panel de condición marca la rama que corre', () => {
    expect(modelo.condicion).toMatchObject({ tipo: 'if', ramas: [{ texto: 'Entra al `if`', corre: true }] });
  });

  it('la línea recién ejecutada es la del paso y la siguiente es la del paso que sigue', () => {
    expect(modelo.lineas).toEqual({ ejecutada: 4, siguiente: 5 });
  });

  it('lleva la posición y el total', () => {
    expect(modelo.paso).toBe(1);
    expect(modelo.total).toBe(3);
  });
});

describe('derivarModeloVista: la rama del `if` que no se toma (hito 2C)', () => {
  // Nodo 1 = la condición `intentos < 10` (verdadera en PASO_CONDICION); su `if` tiene `else`.
  const VISTA_CON_RAMAS = { ...VISTA, ramasDeIf: [{ nodo: 1, entonces: { inicio: 30, fin: 60 }, sino: { inicio: 66, fin: 98 } }] };

  it('en el paso de la condición verdadera, la rama que se salta es la del `else`', () => {
    const modelo = derivarModeloVista({
      vista: VISTA_CON_RAMAS,
      aplicados: [PASO_CONDICION],
      siguiente: PASO_ASIGNACION,
      instantanea: instantanea({ paso: 1, linea: 4 }),
      total: 3,
      ejecucion: { estado: 'calculando' },
    });
    expect(modelo.ramaNoTomada).toEqual({ inicio: 66, fin: 98 });
  });

  it('en cuanto el paso ya no es la condición, no se atenúa nada', () => {
    const modelo = derivarModeloVista({
      vista: VISTA_CON_RAMAS,
      aplicados: [PASO_CONDICION, PASO_ASIGNACION],
      siguiente: null,
      instantanea: instantanea({ paso: 2, linea: 5 }),
      total: 2,
      ejecucion: { estado: 'calculando' },
    });
    expect(modelo.ramaNoTomada).toBeNull();
  });

  it('en el paso 0 tampoco', () => {
    const modelo = derivarModeloVista({
      vista: VISTA_CON_RAMAS,
      aplicados: [],
      siguiente: PASO_CONDICION,
      instantanea: instantanea({}),
      total: 2,
      ejecucion: { estado: 'calculando' },
    });
    expect(modelo.ramaNoTomada).toBeNull();
  });
});

describe('derivarModeloVista: una asignación', () => {
  const modelo = derivarModeloVista({
    vista: VISTA,
    aplicados: [PASO_CONDICION, PASO_ASIGNACION],
    siguiente: null,
    instantanea: instantanea({
      paso: 2,
      linea: 5,
      variables: [
        { nombre: 'intentos', tipo: 'int', valor: 3 },
        { nombre: 'total', tipo: 'int', valor: 125 },
      ],
      salida: [{ flujo: 'out', texto: 'Hola\n' }],
    }),
    total: 2,
    ejecucion: { estado: 'calculando' },
  });

  it('deriva las variables vivas, con el valor anterior de la que cambió', () => {
    expect(modelo.variables.map((v) => [v.nombre, v.valor, v.anterior, v.estado])).toEqual([
      ['intentos', '3', null, 'sin-cambio'],
      ['total', '125', '100', 'cambio'],
    ]);
  });

  it('la explicación del robot se resuelve con la frase del catálogo, sin marcadores', () => {
    expect(modelo.robot.texto).toBe('Calculo `total + precio`: con los valores de ahora es `100 + 25`, que da 125. Guardo 125 en `total`; antes valía 100.');
    expect(modelo.robot.linea).toBe(5);
  });

  it('la cadena de sustitución de la asignación', () => {
    expect(modelo.cadena).toEqual(['total + precio', '100 + 25', '125']);
  });

  it('la consola es la salida acumulada de la instantánea', () => {
    expect(modelo.consola).toEqual([{ flujo: 'out', texto: 'Hola\n' }]);
  });

  it('en el último paso con el motor aún calculando, no hay línea siguiente inventada', () => {
    expect(modelo.lineas).toEqual({ ejecutada: 5, siguiente: null });
  });
});

describe('derivarModeloVista: el paso 0 y la espera de un dato', () => {
  it('en el paso 0 no hay línea ejecutada y la siguiente es la del primer paso', () => {
    const modelo = derivarModeloVista({
      vista: VISTA,
      aplicados: [],
      siguiente: PASO_CONDICION,
      instantanea: instantanea({}),
      total: 2,
      ejecucion: { estado: 'calculando' },
    });
    expect(modelo.lineas).toEqual({ ejecutada: null, siguiente: 4 });
    expect(modelo.variables).toEqual([]);
    expect(modelo.condicion).toBeNull();
    expect(modelo.cadena).toBeNull();
    expect(modelo.robot.texto).toBe('Todavía no se ejecuta nada. Pulsa «Siguiente» y te explico la línea 4.');
  });

  it('en el último paso, con el programa esperando un dato, la línea siguiente es la de la lectura que espera', () => {
    const modelo = derivarModeloVista({
      vista: VISTA,
      aplicados: [PASO_ASIGNACION],
      siguiente: null,
      instantanea: instantanea({ paso: 1, linea: 5 }),
      total: 1,
      ejecucion: { estado: 'esperando-entrada', nodo: 1 },
    });
    expect(modelo.lineas).toEqual({ ejecutada: 5, siguiente: 4 });
    expect(modelo.esperandoEntrada).toBe(true);
    expect(modelo.robot.animo).toBe('esperando');
  });

  it('esperar un dato mientras se navega a un paso anterior NO muestra el campo de entrada', () => {
    const modelo = derivarModeloVista({
      vista: VISTA,
      aplicados: [PASO_CONDICION],
      siguiente: PASO_ASIGNACION,
      instantanea: instantanea({ paso: 1, linea: 4 }),
      total: 2,
      ejecucion: { estado: 'esperando-entrada', nodo: 1 },
    });
    expect(modelo.esperandoEntrada).toBe(false);
  });
});

describe('derivarModeloVista: antes de ejecutar', () => {
  it('sin vista del programa (todavía no compiló) no hay nada que derivar, solo lo que dice el robot', () => {
    const modelo = derivarModeloVista({
      vista: null,
      aplicados: [],
      siguiente: null,
      instantanea: instantanea({}),
      total: 0,
      ejecucion: { estado: 'sin-ejecutar' },
    });
    expect(modelo.variables).toEqual([]);
    expect(modelo.vueltas).toEqual([]);
    expect(modelo.lineas).toEqual({ ejecutada: null, siguiente: null });
    expect(modelo.robot.texto).toContain('Pega o escribe un programa');
  });
});
