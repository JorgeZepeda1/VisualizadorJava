// RED de la tarea 2.16 (design.md §3.3, §6.1): `VistaPrograma` es lo que la interfaz conoce del programa compilado — el código, las variables
// (ranuras) y los nodos que `Paso.nodo` nombra, cada uno con su línea, sus variables vivas y su plan de evaluación. Son datos simples
// (viajan por `postMessage`): no lleva el árbol IR ni funciones.
import { describe, expect, it } from 'vitest';
import { compilar } from '../compilador.ts';
import { construirVistaPrograma, type RamasDeIf, type VistaPrograma } from './vista-programa.ts';

const FUENTE = ['public class Demo {', '  public static void main(String[] args) {', '    int a = 1;', '    int b = a + 2;', '  }', '}', ''].join('\n');

describe('construirVistaPrograma', () => {
  it('lleva el código fuente, una ranura por variable y un nodo por paso con su línea y su plan', () => {
    const resultado = compilar(FUENTE);
    if (!resultado.ok) throw new Error('se esperaba que compilara');
    const vista = construirVistaPrograma(resultado.programa.ir, FUENTE);
    expect(vista.fuente).toBe(FUENTE);
    expect(vista.ranuras.map((r) => `${r.nombre}:${r.tipo}`)).toEqual(['a:int', 'b:int']);
    expect(vista.nodos.map((n) => `${n.clase}@${n.linea}`)).toEqual(['declaracion@3', 'declaracion@4']);
    expect(vista.nodos[1].plan.map((p) => p.forma)).toEqual(['lectura', 'constante', 'aritmetica']);
    expect(vista.nodos[1].vivas).toEqual([0, 1]);
  });

  it('la vista que entrega compilar() es esa misma (no solo el código)', () => {
    const resultado = compilar(FUENTE);
    if (!resultado.ok) throw new Error('se esperaba que compilara');
    expect(resultado.vista).toEqual(construirVistaPrograma(resultado.programa.ir, FUENTE));
  });

  it('es serializable: son solo datos simples (sobrevive a un viaje por JSON, como a uno por postMessage, sin perder nada)', () => {
    const resultado = compilar(FUENTE);
    if (!resultado.ok) throw new Error('se esperaba que compilara');
    expect(JSON.parse(JSON.stringify(resultado.vista))).toEqual(resultado.vista);
  });
});

// RED del arreglo (d) del hito 2A: el editor atenúa la rama que NO se tomó de un `if`. Para eso la vista lleva, por cada `if`, el rango (en el código fuente) de su rama `then` y de su rama `else`, y
// el nodo de la condición (el `Paso.nodo` de la revisión del `if`, cuyo `control.resultado` dice cuál rama se tomó).
describe('VistaPrograma.ramasDeIf: los rangos de las ramas de cada if', () => {
  const PROGRAMA = [
    'public class Demo {',
    '  public static void main(String[] args) {',
    '    int a = 5;',
    '    if (a > 3) {',
    '      System.out.println("mayor");',
    '    } else {',
    '      System.out.println("menor");',
    '    }',
    '    if (a == 5) System.out.println("cinco");',
    '    if (a < 0) {',
    '    } else if (a == 0) {',
    '      a = 1;',
    '    } else {',
    '      a = 2;',
    '    }',
    '  }',
    '}',
    '',
  ].join('\n');

  function ramas(): { texto: (rango: { inicio: number; fin: number }) => string; vista: VistaPrograma & { readonly ramasDeIf: readonly RamasDeIf[] } } {
    const resultado = compilar(PROGRAMA);
    if (!resultado.ok) throw new Error('se esperaba que compilara');
    const { ramasDeIf } = resultado.vista;
    if (ramasDeIf === undefined) throw new Error('compilar() siempre entrega las ramas de los if');
    return { texto: (rango) => PROGRAMA.slice(rango.inicio, rango.fin), vista: { ...resultado.vista, ramasDeIf } };
  }

  it('hay una entrada por cada `if`, en el orden del programa (el `else if` es otro if dentro del else del primero)', () => {
    const { vista } = ramas();
    expect(vista.ramasDeIf).toHaveLength(4);
    expect(vista.ramasDeIf.map((r) => vista.nodos[r.nodo].clase)).toEqual(['condicion-if', 'condicion-if', 'condicion-if', 'condicion-if']);
    expect(vista.ramasDeIf.map((r) => vista.nodos[r.nodo].linea)).toEqual([4, 9, 10, 11]);
  });

  it('la rama then y la rama else de un if con llaves son los bloques completos, con sus llaves', () => {
    const { vista, texto } = ramas();
    const [primero] = vista.ramasDeIf;
    expect(texto(primero.entonces)).toBe('{\n      System.out.println("mayor");\n    }');
    expect(primero.sino === null ? null : texto(primero.sino)).toBe('{\n      System.out.println("menor");\n    }');
  });

  it('sin llaves, la rama es la sentencia; sin else, `sino` es null', () => {
    const { vista, texto } = ramas();
    const segundo = vista.ramasDeIf[1];
    expect(texto(segundo.entonces)).toBe('System.out.println("cinco");');
    expect(segundo.sino).toBeNull();
  });

  it('un else if: la rama else del primero abarca el if siguiente completo, con todos sus else', () => {
    const { vista, texto } = ramas();
    const tercero = vista.ramasDeIf[2];
    expect(texto(tercero.entonces)).toBe('{\n    }');
    expect(tercero.sino === null ? null : texto(tercero.sino)).toBe('if (a == 0) {\n      a = 1;\n    } else {\n      a = 2;\n    }');
    const cuarto = vista.ramasDeIf[3];
    expect(texto(cuarto.entonces)).toBe('{\n      a = 1;\n    }');
    expect(cuarto.sino === null ? null : texto(cuarto.sino)).toBe('{\n      a = 2;\n    }');
  });

  it('un programa sin if tiene la lista vacía, y sigue siendo serializable (datos simples)', () => {
    const resultado = compilar(FUENTE);
    if (!resultado.ok) throw new Error('se esperaba que compilara');
    expect(resultado.vista.ramasDeIf).toEqual([]);
    const conIf = ramas().vista;
    expect(JSON.parse(JSON.stringify(conIf))).toEqual(conIf);
  });
});
