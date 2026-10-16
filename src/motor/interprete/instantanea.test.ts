// RED de la tarea 2.18 (REQ-EJEC-009 mecanismo, REQ-EJEC-010 integración, ADR 005 punto 4, design.md §3.2): LECTURA CON REINTENTO. Si la biblioteca no tiene datos
// lanza `FaltaEntrada`; el director restaura la instantánea que tomó al empezar la sentencia (ranuras, cursor de la entrada, estado de los objetos de la
// biblioteca), «teclea» el siguiente renglón preparado (eco en la consola) o cede `espera-entrada`, y reintenta. El resultado es determinista: la traza
// INTERACTIVA y la PREPARADA son idénticas con los mismos renglones (propiedad). Aquí la biblioteca es un `Scanner` de mentira que cumple el puerto
// (`ObjetoDeBiblioteca`, `EntradaDelPrograma`, `FaltaEntrada`): lo que se prueba es el mecanismo del intérprete, no la tokenización real de Java (parte A).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compilar } from '../compilador.ts';
import type { Paso } from '../traza/paso.ts';
import { avanzarHastaElFinal, configuracion, correrPrograma, type Corrida } from './ayudas-de-prueba.ts';
import { crearEjecucion } from './ejecucion.ts';
import { ExcepcionDeEjecucion } from './excepcion-de-ejecucion.ts';
import { FaltaEntrada } from '../biblioteca/index.ts';
import type { ObjetoDeBiblioteca, OperacionDeBiblioteca, PuertoBiblioteca } from './puerto-biblioteca.ts';

class ScannerFalso implements ObjetoDeBiblioteca {
  readonly claseJava = 'Scanner' as const;
  lecturas = 0;
  capturar(): unknown {
    return this.lecturas;
  }
  restaurar(estado: unknown): void {
    this.lecturas = estado as number;
  }
}

const nextInt: OperacionDeBiblioteca = (receptor, _argumentos, _variables, contexto) => {
  const entrada = contexto.entrada;
  const resto = entrada.texto.slice(entrada.cursor);
  const token = /^(\s*)(\S+)(\s|$)/.exec(resto);
  // Java necesita ver el delimitador (o el fin de la entrada) tras el token para saber que está completo.
  if (token === null || (token[3] === '' && !entrada.cerrada)) {
    if (entrada.cerrada) throw new ExcepcionDeEjecucion('java.util.NoSuchElementException', null);
    throw new FaltaEntrada();
  }
  entrada.cursor += token[1].length + token[2].length;
  (receptor as ScannerFalso).lecturas += 1;
  return Number.parseInt(token[2], 10);
};

const PUERTO: PuertoBiblioteca = {
  operaciones: new Map<string, OperacionDeBiblioteca>([
    ['Scanner.<init>(java.io.InputStream)', () => new ScannerFalso()],
    ['Scanner.nextInt()', nextInt],
  ]),
  doubleATexto: null,
};

function conScanner(cuerpo: string): string {
  return `import java.util.Scanner;\n\npublic class MiPrograma {\n  public static void main(String[] args) {\n${cuerpo}\n  }\n}\n`;
}

const DOS_ENTEROS = [
  '    Scanner sc = new Scanner(System.in);',
  '    int a = sc.nextInt();',
  '    int b = sc.nextInt();',
  '    System.out.println(a + b);',
].join('\n');

/** Corre en modo interactivo: cada vez que espera entrada, le da el siguiente renglón. */
function correrInteractivo(fuente: string, renglones: readonly string[]): Corrida {
  const resultado = compilar(fuente, PUERTO);
  if (!resultado.ok) throw new Error('no compiló');
  const ejecucion = crearEjecucion(resultado.programa, configuracion({ entradaInteractiva: true }), PUERTO);
  let corrida = avanzarHastaElFinal(ejecucion, [], 1_000_000, []);
  let siguiente = 0;
  while (corrida.esperaEntrada) {
    if (siguiente >= renglones.length) return corrida;
    ejecucion.darEntrada(renglones[siguiente]);
    siguiente += 1;
    corrida = avanzarHastaElFinal(ejecucion, corrida.pasos, 1_000_000, corrida.avances);
  }
  return corrida;
}

describe('entrada preparada: se «teclea» sola, renglón por renglón', () => {
  it('cada lectura teclea el renglón que le falta: el paso lleva el eco en la consola y el avance del cursor', () => {
    const corrida = correrPrograma(conScanner(DOS_ENTEROS), { puerto: PUERTO, config: { entradaPreparada: '3\n4\n' } });
    expect(corrida.salida).toBe('7\n');
    expect(corrida.pasos.map((p) => `${p.clase}@${p.linea}`)).toEqual(['declaracion@5', 'declaracion@6', 'declaracion@7', 'impresion@8']);
    expect(corrida.pasos[1]).toMatchObject({
      salida: [{ flujo: 'eco', texto: '3\n' }],
      entrada: { cursor: 1, agregado: '3\n' },
      cambios: [{ ranura: 'a', nuevo: 3 }],
    });
    expect(corrida.pasos[2]).toMatchObject({ salida: [{ flujo: 'eco', texto: '4\n' }], entrada: { cursor: 3, agregado: '4\n' } });
    // el paso que no lee no lleva entrada
    expect(corrida.pasos[3].entrada).toBeUndefined();
    expect(corrida.fin).toEqual({ causa: 'terminado' });
  });

  it('el objeto Scanner viaja en la traza como { objeto: "Scanner" }', () => {
    const corrida = correrPrograma(conScanner(DOS_ENTEROS), { puerto: PUERTO, config: { entradaPreparada: '3\n4\n' } });
    expect(corrida.pasos[0].cambios).toEqual([{ ranura: 'sc', anterior: undefined, nuevo: { objeto: 'Scanner' } }]);
  });

  it('si la entrada preparada se agota y no es interactiva, es el fin de la entrada: la biblioteca lanza NoSuchElementException', () => {
    const corrida = correrPrograma(conScanner(DOS_ENTEROS), { puerto: PUERTO, config: { entradaPreparada: '3\n' } });
    expect(corrida.fin).toEqual({ causa: 'excepcion' });
    expect(corrida.errores).toBe('Exception in thread "main" java.util.NoSuchElementException\n\tat MiPrograma.main(MiPrograma.java:7)\n');
    expect(corrida.pasos.map((p) => p.clase)).toEqual(['declaracion', 'declaracion', 'excepcion']);
  });
});

describe('entrada interactiva: cede espera-entrada y retoma cuando llega el renglón', () => {
  it('se detiene en la sentencia que necesita datos, avisa su nodo y sigue al llegar el renglón', () => {
    const resultado = compilar(conScanner(DOS_ENTEROS), PUERTO);
    if (!resultado.ok) throw new Error('no compiló');
    const ejecucion = crearEjecucion(resultado.programa, configuracion({ entradaInteractiva: true }), PUERTO);
    const primero = ejecucion.avanzar(1000);
    expect(primero.estado).toBe('espera-entrada');
    expect(primero.pasos.map((p) => p.clase)).toEqual(['declaracion']); // solo `Scanner sc = ...`: la lectura aún no es un paso
    if (primero.estado !== 'espera-entrada') throw new Error('se esperaba espera-entrada');
    expect(resultado.vista.nodos[primero.nodo].linea).toBe(6);
    ejecucion.darEntrada('3\n');
    const segundo = ejecucion.avanzar(1000);
    expect(segundo.estado).toBe('espera-entrada');
    expect(segundo.pasos.map((p) => `${p.clase}@${p.linea}`)).toEqual(['declaracion@6']);
    if (segundo.estado !== 'espera-entrada') throw new Error('se esperaba espera-entrada');
    expect(resultado.vista.nodos[segundo.nodo].linea).toBe(7);
    ejecucion.darEntrada('4\n');
    const tercero = ejecucion.avanzar(1000);
    expect(tercero.estado).toBe('fin');
    expect(tercero.pasos.map((p) => p.clase)).toEqual(['declaracion', 'impresion']);
  });

  it('avanzar() otra vez sin que haya llegado nada vuelve a pedir la entrada, sin repetir efectos (idempotente)', () => {
    const resultado = compilar(conScanner(DOS_ENTEROS), PUERTO);
    if (!resultado.ok) throw new Error('no compiló');
    const ejecucion = crearEjecucion(resultado.programa, configuracion({ entradaInteractiva: true }), PUERTO);
    ejecucion.avanzar(1000);
    const otraVez = ejecucion.avanzar(1000);
    expect(otraVez.estado).toBe('espera-entrada');
    expect(otraVez.pasos).toEqual([]);
  });

  it('cerrarEntrada() es el EOF que pide el alumno: la lectura pendiente falla con NoSuchElementException', () => {
    const resultado = compilar(conScanner(DOS_ENTEROS), PUERTO);
    if (!resultado.ok) throw new Error('no compiló');
    const ejecucion = crearEjecucion(resultado.programa, configuracion({ entradaInteractiva: true }), PUERTO);
    ejecucion.avanzar(1000);
    ejecucion.cerrarEntrada();
    const corrida = avanzarHastaElFinal(ejecucion, [], 1000, []);
    expect(corrida.fin).toEqual({ causa: 'excepcion' });
    expect(corrida.errores).toContain('java.util.NoSuchElementException');
  });
});

describe('instantánea: el reintento NO repite los efectos de la sentencia', () => {
  it('`int r = k++ + sc.nextInt();` sin dato: k++ se deshace y al reintentar da 10 + 5 = 15 con k = 11 (no 16)', () => {
    const cuerpo = ['    Scanner sc = new Scanner(System.in);', '    int k = 10;', '    int r = k++ + sc.nextInt();', '    System.out.println(r + " " + k);'].join('\n');
    const corrida = correrInteractivo(conScanner(cuerpo), ['5\n']);
    expect(corrida.salida).toBe('15 11\n');
    // los cambios del paso son los del intento que valió, sin duplicados del intento fallido
    expect(corrida.pasos[2].cambios).toEqual([
      { ranura: 'k', anterior: 10, nuevo: 11, punto: 0 },
      { ranura: 'r', anterior: undefined, nuevo: 15 },
    ]);
  });

  it('el cursor de la entrada también se restaura: `sc.nextInt() + sc.nextInt()` con un solo dato vuelve a leer el primero', () => {
    const cuerpo = ['    Scanner sc = new Scanner(System.in);', '    int t = sc.nextInt() + sc.nextInt();', '    System.out.println(t);'].join('\n');
    const corrida = correrInteractivo(conScanner(cuerpo), ['3\n', '4\n']);
    expect(corrida.salida).toBe('7\n');
    // los dos renglones se tecleron DURANTE esta sentencia: el paso los lleva juntos
    expect(corrida.pasos[1]).toMatchObject({
      salida: [
        { flujo: 'eco', texto: '3\n' },
        { flujo: 'eco', texto: '4\n' },
      ],
      entrada: { cursor: 3, agregado: '3\n4\n' },
    });
  });

  it('el estado interno del objeto de la biblioteca se restaura: las lecturas del intento fallido no cuentan', () => {
    const cuerpo = ['    Scanner sc = new Scanner(System.in);', '    int t = sc.nextInt() + sc.nextInt();'].join('\n');
    const resultado = compilar(conScanner(cuerpo), PUERTO);
    if (!resultado.ok) throw new Error('no compiló');
    const lecturasVistas: number[] = [];
    const puerto: PuertoBiblioteca = {
      ...PUERTO,
      operaciones: new Map(PUERTO.operaciones).set('Scanner.nextInt()', (receptor, argumentos, variables, contexto) => {
        const valor = nextInt(receptor, argumentos, variables, contexto);
        lecturasVistas.push((receptor as ScannerFalso).lecturas);
        return valor;
      }),
    };
    const ejecucion = crearEjecucion(resultado.programa, configuracion({ entradaInteractiva: true }), puerto);
    ejecucion.avanzar(100);
    ejecucion.darEntrada('3\n');
    ejecucion.avanzar(100);
    ejecucion.darEntrada('4\n');
    ejecucion.avanzar(100);
    // primer intento: lee 3 (lecturas=1) y se queda sin dato para el segundo; se restaura a 0. Segundo intento: 3 (1) y 4 (2).
    expect(lecturasVistas).toEqual([1, 1, 2]);
  });
});

describe('propiedad: la traza interactiva y la preparada son IDÉNTICAS con los mismos renglones', () => {
  const SUMA = (n: number): string =>
    [
      '    Scanner sc = new Scanner(System.in);',
      `    int n = ${n};`,
      '    int total = 0;',
      '    int i = 0;',
      '    while (i < n) {',
      '      int dato = sc.nextInt();',
      '      total += dato;',
      '      i++;',
      '    }',
      '    System.out.println(total);',
    ].join('\n');

  it('para cualquier lista de enteros: mismos pasos (clase, línea, cambios, eco, cursor) y misma salida', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 6 }), (datos) => {
        const renglones = datos.map((dato) => `${dato}\n`);
        const fuente = conScanner(SUMA(datos.length));
        const preparada = correrPrograma(fuente, { puerto: PUERTO, config: { entradaPreparada: renglones.join('') } });
        const interactiva = correrInteractivo(fuente, renglones);
        const resumen = (pasos: readonly Paso[]): unknown[] => pasos.map((p) => [p.clase, p.linea, p.cambios, p.salida, p.entrada, p.valores, p.explicacion]);
        expect(resumen(interactiva.pasos)).toEqual(resumen(preparada.pasos));
        expect(interactiva.salida).toBe(`${datos.reduce((a, b) => a + b, 0)}\n`);
        expect(preparada.salida).toBe(interactiva.salida);
      }),
      { numRuns: 40 },
    );
  });
});
