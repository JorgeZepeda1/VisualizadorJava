// Tarea 1.34 (la matriz de nombres de `Object.prototype`): `compilar()` NUNCA lanza con un nombre que JavaScript trae en todos sus objetos
// (`constructor`, `toString`, `valueOf`, `hasOwnProperty`, `__proto__`, `isPrototypeOf`, `propertyIsEnumerable`, `toLocaleString`…) ni con otros
// nombres que en JavaScript significan algo (`prototype`, `length`, `undefined`, `function`, `delete`, `typeof`, `in`…), en NINGUNA de las 46
// posiciones de `tablas-de-prototipo.ts` (variable, método, campo y miembro de `System`/`Math`/`Integer`/`String`/`PrintStream`, tipo, clase,
// importación, etiqueta, operador, argumento de cada tipo de llamada…) y su veredicto no contradice al de javac 17.0.18:
//   - donde javac COMPILA, `compilar()` no da un error de compilación (ok, o un aviso honesto);
//   - donde javac RECHAZA, `compilar()` no da `ok` ni `ejecucion-no-disponible` (el texto de este último dice que Java acepta el programa).
// Sin JDK: las celdas de javac son datos; su verificación es `herramientas/oraculo/tablas-de-prototipo.test.ts` (`npm run test:oraculo`).
// Por qué existe: la re-verificación del lote 1 vio un `TypeError` con `System.toString` como argumento (56 de 120 variantes) y esta matriz, al
// buscar el MISMO defecto en las demás tablas del motor, vio que `int a = 1 constructor 2;` se aceptaba como si `constructor` fuera un operador.
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import type { ResultadoCompilacion } from '../../src/motor/index.ts';
import {
  COMPILAN_EN_JAVAC,
  NOMBRES_DE_JAVASCRIPT,
  NOMBRES_DE_LA_MATRIZ,
  NOMBRES_DE_OBJECT_PROTOTYPE,
  PLANTILLAS_DE_PROTOTIPO,
  programaDePrototipo,
  type PlantillaDePrototipo,
} from './tablas-de-prototipo.ts';

function javacCompila(plantilla: PlantillaDePrototipo, nombre: string): boolean {
  const compilan = COMPILAN_EN_JAVAC.get(plantilla.id);
  if (compilan === undefined) throw new Error(`la plantilla «${plantilla.id}» no está en COMPILAN_EN_JAVAC`);
  return compilan === 'todos' || compilan.includes(nombre);
}

function loDaPorBueno(resultado: ResultadoCompilacion): boolean {
  return resultado.ok || resultado.problema.codigo === 'ejecucion-no-disponible';
}

describe('la matriz de nombres de Object.prototype — está bien armada', () => {
  it('trae las propiedades de Object.prototype que pide el encargo y los 46 puestos del nombre', () => {
    for (const nombre of ['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__', 'isPrototypeOf', 'propertyIsEnumerable']) {
      expect(NOMBRES_DE_OBJECT_PROTOTYPE, nombre).toContain(nombre);
    }
    expect(NOMBRES_DE_JAVASCRIPT.length).toBeGreaterThanOrEqual(10);
    expect(PLANTILLAS_DE_PROTOTIPO.length).toBeGreaterThanOrEqual(46);
    expect(new Set(PLANTILLAS_DE_PROTOTIPO.map((p) => p.id)).size).toBe(PLANTILLAS_DE_PROTOTIPO.length);
  });

  it('cada plantilla tiene su fila de javac, y javac compila una parte de las celdas y rechaza otra (la matriz no es trivial)', () => {
    expect([...COMPILAN_EN_JAVAC.keys()].sort()).toEqual(PLANTILLAS_DE_PROTOTIPO.map((p) => p.id).sort());
    let compilan = 0;
    let total = 0;
    for (const plantilla of PLANTILLAS_DE_PROTOTIPO) {
      for (const nombre of NOMBRES_DE_LA_MATRIZ) {
        total += 1;
        if (javacCompila(plantilla, nombre)) compilan += 1;
      }
    }
    expect(total).toBe(PLANTILLAS_DE_PROTOTIPO.length * NOMBRES_DE_LA_MATRIZ.length);
    // La medición de javac 17.0.18 (1 058 celdas): compila 259 y rechaza 799.
    expect(compilan).toBe(259);
    expect(total - compilan).toBe(799);
  });
});

describe('la matriz de nombres de Object.prototype — compilar() nunca lanza y no contradice a javac', () => {
  it.each(PLANTILLAS_DE_PROTOTIPO.map((p) => [p.id, p] as const))('%s', (_id, plantilla) => {
    const contradicciones: string[] = [];
    for (const nombre of NOMBRES_DE_LA_MATRIZ) {
      const fuente = programaDePrototipo(plantilla, nombre);
      let resultado: ResultadoCompilacion;
      try {
        resultado = compilar(fuente);
      } catch (error) {
        contradicciones.push(`«${nombre}»: LANZA ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`);
        continue;
      }
      if (javacCompila(plantilla, nombre)) {
        if (!resultado.ok && resultado.problema.categoria === 'error-compilacion') {
          contradicciones.push(`«${nombre}»: javac lo compila y compilar() da el error [${resultado.problema.codigo}] en la línea ${resultado.problema.linea}`);
        }
      } else if (loDaPorBueno(resultado)) {
        contradicciones.push(`«${nombre}»: javac lo rechaza y compilar() lo da por bueno (${resultado.ok ? 'ok' : 'ejecucion-no-disponible'})`);
      }
    }
    expect(contradicciones, `${plantilla.posicion}`).toEqual([]);
  });

  it('de las 799 celdas que javac rechaza, la gran mayoría sale como ERROR de compilación (el resto son avisos honestos): la matriz no pasa por pura prudencia', () => {
    let rechazadas = 0;
    let comoError = 0;
    for (const plantilla of PLANTILLAS_DE_PROTOTIPO) {
      for (const nombre of NOMBRES_DE_LA_MATRIZ) {
        if (javacCompila(plantilla, nombre)) continue;
        rechazadas += 1;
        const resultado = compilar(programaDePrototipo(plantilla, nombre));
        if (!resultado.ok && resultado.problema.categoria === 'error-compilacion') comoError += 1;
      }
    }
    expect(rechazadas).toBe(799);
    expect(comoError).toBeGreaterThanOrEqual(700);
  });
});
