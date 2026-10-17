// RED de la tarea 2.19 (design.md §3.4): lo que el alumno ve en cada paso —la línea resaltada, las variables a la vista con su valor (o «sin inicializar») y la
// salida acumulada— se RECONSTRUYE de los pasos y de la vista del programa, sin volver a ejecutar nada. `instantaneaEn(pasos, vista, n)` aplica los `cambios`
// de los primeros `n` pasos; las variables que están a la vista son las `vivas` del nodo del último paso (derivadas del texto, no de la ejecución).
// (El punto de control cada 256 pasos de la tarea 3.1 acelera esto; el resultado es el mismo.)
import { describe, expect, it } from 'vitest';
import { compilar } from '../compilador.ts';
import { configuracion } from '../interprete/ayudas-de-prueba.ts';
import { crearEjecucion } from '../interprete/ejecucion.ts';
import type { VistaPrograma } from '../ir/vista-programa.ts';
import type { Paso } from './paso.ts';
import { instantaneaEn } from './estado.ts';
import { Traza } from './traza.ts';

function ejecutar(fuente: string): { pasos: readonly Paso[]; vista: VistaPrograma } {
  const resultado = compilar(fuente);
  if (!resultado.ok) throw new Error('no compiló');
  const ejecucion = crearEjecucion(resultado.programa, configuracion());
  const avance = ejecucion.avanzar(10_000);
  return { pasos: avance.pasos, vista: resultado.vista };
}

const PROGRAMA = [
  'public class Demo {',
  '  public static void main(String[] args) {',
  '    int a = 5;',
  '    int b;',
  '    for (int i = 0; i < 2; i++) {',
  '      int t = i * 10;',
  '      System.out.println(a + t);',
  '    }',
  '    b = a * 2;',
  '  }',
  '}',
  '',
].join('\n');

describe('instantaneaEn: variables a la vista, línea y salida acumulada en cada paso', () => {
  it('con cero pasos aplicados no hay línea, ni variables, ni salida', () => {
    const { pasos, vista } = ejecutar(PROGRAMA);
    expect(instantaneaEn(pasos, vista, 0)).toEqual({ paso: 0, linea: null, variables: [], salida: [] });
  });

  it('tras declarar `a` y `b` (sin valor): a vale 5 y b queda «sin inicializar» (null)', () => {
    const { pasos, vista } = ejecutar(PROGRAMA);
    expect(instantaneaEn(pasos, vista, 2)).toEqual({
      paso: 2,
      linea: 4,
      variables: [
        { nombre: 'a', tipo: 'int', valor: 5 },
        { nombre: 'b', tipo: 'int', valor: null },
      ],
      salida: [],
    });
  });

  it('dentro del for ve la variable del ciclo y la local de la vuelta; la salida se acumula', () => {
    const { pasos, vista } = ejecutar(PROGRAMA);
    // pasos: 0 decl a, 1 decl b, 2 decl i, 3 cond (i<2), 4 decl t, 5 println, 6 i++, 7 cond, 8 decl t, 9 println, 10 i++, 11 cond (falsa), 12 b = a*2
    const despuesDelPrintln = instantaneaEn(pasos, vista, 6);
    expect(despuesDelPrintln.linea).toBe(7);
    expect(despuesDelPrintln.variables.map((v) => `${v.nombre}=${String(v.valor)}`)).toEqual(['a=5', 'b=null', 'i=0', 't=0']);
    expect(despuesDelPrintln.salida).toEqual([{ flujo: 'out', texto: '5\n' }]);

    const segundaVuelta = instantaneaEn(pasos, vista, 10);
    expect(segundaVuelta.variables.map((v) => `${v.nombre}=${String(v.valor)}`)).toEqual(['a=5', 'b=null', 'i=1', 't=10']);
    expect(segundaVuelta.salida.map((s) => s.texto).join('')).toBe('5\n15\n');
  });

  it('al salir del for, `i` y `t` ya no están a la vista y `b` tiene su valor', () => {
    const { pasos, vista } = ejecutar(PROGRAMA);
    const final = instantaneaEn(pasos, vista, pasos.length);
    expect(final.linea).toBe(9);
    expect(final.variables).toEqual([
      { nombre: 'a', tipo: 'int', valor: 5 },
      { nombre: 'b', tipo: 'int', valor: 10 },
    ]);
  });

  it('un valor String o char viaja como lo guarda el Paso; cada instantánea es independiente de las demás (nada se comparte)', () => {
    const fuente = ['public class Demo {', '  public static void main(String[] args) {', "    String s = \"hola\";", "    char c = 'x';", '    s += c;', '  }', '}', ''].join('\n');
    const { pasos, vista } = ejecutar(fuente);
    expect(instantaneaEn(pasos, vista, 3).variables).toEqual([
      { nombre: 's', tipo: 'String', valor: 'holax' },
      { nombre: 'c', tipo: 'char', valor: 120 },
    ]);
    expect(instantaneaEn(pasos, vista, 2).variables[0]).toEqual({ nombre: 's', tipo: 'String', valor: 'hola' });
  });

  it('Traza.instantaneaEn(n, vista) da lo mismo que la función pura, sobre los pasos que guarda', () => {
    const { pasos, vista } = ejecutar(PROGRAMA);
    const traza = new Traza();
    traza.agregar(pasos);
    expect(traza.instantaneaEn(7, vista)).toEqual(instantaneaEn(pasos, vista, 7));
  });
});
