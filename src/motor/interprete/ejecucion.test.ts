// RED de la tarea 2.19 (REQ-EJEC-001, REQ-EJEC-002, REQ-EJEC-006, design.md §1.3, §3.2, §3.5, §3.6): el director de ejecución reanuda el generador de
// sentencias, cuenta pasos, aplica los límites y convierte una `ExcepcionDeEjecucion` en el paso final `excepcion` con el `stderr` EXACTO de la JVM.
// Reemplaza a las pruebas de la rebanada vertical (0.12/0.13), cuyo intérprete solo ejecutaba `println("literal")`; conserva su contrato
// `Ejecucion.avanzar/darEntrada/cerrarEntrada` y la idempotencia del final.
import { describe, expect, it } from 'vitest';
import { NoDisponibleEnEjecucion } from '../biblioteca/index.ts';
import { compilar } from '../compilador.ts';
import type { ProgramaCompilado, ProgramaIr } from '../ir/ir.ts';
import { avanzarHastaElFinal, configuracion, correr, correrPrograma, programaDe } from './ayudas-de-prueba.ts';
import { crearEjecucion } from './ejecucion.ts';
import { ExcepcionDeEjecucion } from './excepcion-de-ejecucion.ts';
import type { OperacionDeBiblioteca, PuertoBiblioteca } from './puerto-biblioteca.ts';

function compilado(cuerpo: string): ProgramaCompilado {
  const resultado = compilar(programaDe(cuerpo));
  if (!resultado.ok) throw new Error('se esperaba que compilara');
  return resultado.programa;
}

describe('crearEjecucion: el contrato avanzar / fin', () => {
  it('avanzar() ejecuta el programa y termina con un Paso por sentencia ejecutada', () => {
    const corrida = correr('    System.out.println("Hola, mundo");');
    expect(corrida.pasos).toHaveLength(1);
    expect(corrida.pasos[0]).toMatchObject({ clase: 'impresion', linea: 3, salida: [{ flujo: 'out', texto: 'Hola, mundo\n' }] });
    expect(corrida.fin).toEqual({ causa: 'terminado' });
  });

  it('un Paso por cada sentencia, en orden (triangulación con dos impresiones)', () => {
    const corrida = correr('    System.out.println("uno");\n    System.out.println("dos");');
    expect(corrida.pasos.map((p) => p.salida?.[0]?.texto)).toEqual(['uno\n', 'dos\n']);
  });

  it('respeta maxPasos: se detiene a medio programa con estado "continua" y retoma donde iba', () => {
    const ejecucion = crearEjecucion(compilado('    System.out.println("uno");\n    System.out.println("dos");'), configuracion());
    const primero = ejecucion.avanzar(1);
    expect(primero.estado).toBe('continua');
    expect(primero.pasos).toHaveLength(1);
    const segundo = ejecucion.avanzar(1);
    expect(segundo.estado).toBe('fin');
    expect(segundo.pasos).toHaveLength(1);
    expect(segundo.pasos[0].salida?.[0]?.texto).toBe('dos\n');
  });

  it('tras terminar, avanzar() de nuevo devuelve fin sin pasos nuevos (idempotente)', () => {
    const ejecucion = crearEjecucion(compilado('    System.out.println("x");'), configuracion());
    ejecucion.avanzar(100_000);
    expect(ejecucion.avanzar(100_000)).toEqual({ estado: 'fin', pasos: [], fin: { causa: 'terminado' } });
  });

  it('un programa sin sentencias termina de inmediato con cero pasos', () => {
    const corrida = correr('');
    expect(corrida.pasos).toEqual([]);
    expect(corrida.fin).toEqual({ causa: 'terminado' });
  });

  it('retomar con avanzar(n) pequeños da EXACTAMENTE los mismos pasos que un solo avanzar grande', () => {
    const cuerpo = '    for (int i = 0; i < 3; i++) {\n      System.out.println(i);\n    }';
    const entero = correr(cuerpo);
    const porPartes = correr(cuerpo, { pasosPorAvance: 2 });
    expect(porPartes.pasos).toEqual(entero.pasos);
    expect(porPartes.avances.length).toBeGreaterThan(1);
  });
});

// Tarea 1.15 (REQ-COMP-007/008, ADR 004 pasada 5, decisión del orquestador design.md §2.2): un problema de ARRANQUE se presenta como una excepción EN
// EJECUCIÓN -- `compilar()` ya devolvió `ok:true`, pero el `ProgramaCompilado` trae `arranque` distinto de null. `avanzar()` lo reporta en su PRIMER
// llamado, sin ejecutar ninguna sentencia.
describe('crearEjecucion — arranque inválido (tarea 1.15)', () => {
  const IR_VACIO: ProgramaIr = { sentencias: [], ranuras: [], nodos: [], ramasDeIf: [], nombreClase: 'Ejercicio3', paquete: null };

  it('avanzar() reporta "error-arranque" en el PRIMER llamado, con el detalle completo y CERO pasos', () => {
    const programa: ProgramaCompilado = {
      ir: IR_VACIO,
      arranque: { codigo: 'sin-main', nombreClase: 'Ejercicio3', textoLanzador: 'texto exacto del lanzador' },
    };
    const avance = crearEjecucion(programa, configuracion()).avanzar(100_000);
    expect(avance.estado).toBe('fin');
    expect(avance.pasos).toHaveLength(0);
    if (avance.estado !== 'fin') throw new Error('se esperaba estado:fin');
    expect(avance.fin).toEqual({
      causa: 'error-arranque',
      arranque: { codigo: 'sin-main', nombreClase: 'Ejercicio3', textoLanzador: 'texto exacto del lanzador' },
    });
  });

  it('triangulación: "main-no-static" también se reporta igual (mismo mecanismo, código distinto)', () => {
    const programa: ProgramaCompilado = {
      ir: IR_VACIO,
      arranque: { codigo: 'main-no-static', nombreClase: 'Demo', textoLanzador: 'otro texto exacto' },
    };
    const avance = crearEjecucion(programa, configuracion()).avanzar(100_000);
    if (avance.estado !== 'fin') throw new Error('se esperaba estado:fin');
    expect(avance.fin.causa).toBe('error-arranque');
    expect(avance.fin.arranque?.codigo).toBe('main-no-static');
  });
});

describe('excepciones de Java: el paso final y el stderr exacto de la JVM', () => {
  it('5 / 0 lanza ArithmeticException: / by zero, detiene ahí y conserva los pasos previos navegables', () => {
    const corrida = correr('    int x = 1;\n    System.out.println("antes");\n    int z = 10 / (x - 1);\n    System.out.println("despues");');
    expect(corrida.salida).toBe('antes\n');
    expect(corrida.pasos.map((p) => p.clase)).toEqual(['declaracion', 'impresion', 'excepcion']);
    expect(corrida.errores).toBe('Exception in thread "main" java.lang.ArithmeticException: / by zero\n\tat MiPrograma.main(MiPrograma.java:5)\n');
    expect(corrida.fin).toEqual({ causa: 'excepcion' });
  });

  it('el paso excepcion lleva su línea, la clave de explicación y los valores que alcanzó a calcular (el resto, null)', () => {
    const corrida = correr('    int x = 1;\n    int z = 10 / (x - 1);');
    const ultimo = corrida.pasos[corrida.pasos.length - 1];
    expect(ultimo).toMatchObject({
      clase: 'excepcion',
      linea: 4,
      valores: [10, 1, 1, 0, null],
      explicacion: { clave: 'excepcion', datos: { clase: 'java.lang.ArithmeticException', mensaje: '/ by zero' } },
      fin: { causa: 'excepcion' },
    });
    expect(ultimo.salida).toEqual([{ flujo: 'err', texto: corrida.errores }]);
  });

  it('con `package`, el marco del alumno lleva el nombre calificado; el archivo no', () => {
    const fuente = 'package aula.u3;\n\npublic class Demo {\n  public static void main(String[] args) {\n    int n = 0;\n    System.out.println(5 % n);\n  }\n}\n';
    const corrida = correrPrograma(fuente);
    expect(corrida.errores).toBe('Exception in thread "main" java.lang.ArithmeticException: / by zero\n\tat aula.u3.Demo.main(Demo.java:6)\n');
  });

  it('una excepción de la biblioteca trae sus marcos de java.base ANTES del marco del alumno, y sin mensaje la JVM imprime solo la clase', () => {
    const lanzaConMensaje: OperacionDeBiblioteca = () => {
      throw new ExcepcionDeEjecucion('java.lang.StringIndexOutOfBoundsException', 'String index out of range: 5', [
        'java.base/java.lang.StringLatin1.charAt(StringLatin1.java:48)',
        'java.base/java.lang.String.charAt(String.java:1515)',
      ]);
    };
    const lanzaSinMensaje: OperacionDeBiblioteca = () => {
      throw new ExcepcionDeEjecucion('java.util.NoSuchElementException', null);
    };
    const puerto = (operacion: OperacionDeBiblioteca): PuertoBiblioteca => ({ operaciones: new Map([['Math.abs(int)', operacion]]), doubleATexto: null });
    const conMensaje = correr('    int a = Math.abs(-5);', { puerto: puerto(lanzaConMensaje) });
    expect(conMensaje.errores).toBe(
      'Exception in thread "main" java.lang.StringIndexOutOfBoundsException: String index out of range: 5\n' +
        '\tat java.base/java.lang.StringLatin1.charAt(StringLatin1.java:48)\n' +
        '\tat java.base/java.lang.String.charAt(String.java:1515)\n' +
        '\tat MiPrograma.main(MiPrograma.java:3)\n',
    );
    const sinMensaje = correr('    int a = Math.abs(-5);', { puerto: puerto(lanzaSinMensaje) });
    expect(sinMensaje.errores).toBe('Exception in thread "main" java.util.NoSuchElementException\n\tat MiPrograma.main(MiPrograma.java:3)\n');
  });

  it('un fallo que no es de Java (un TypeError de la biblioteca) es error-interno, con el detalle para quien depure', () => {
    const rota: OperacionDeBiblioteca = () => {
      throw new TypeError('algo se rompió');
    };
    const corrida = correr('    int a = Math.abs(-5);', { puerto: { operaciones: new Map([['Math.abs(int)', rota]]), doubleATexto: null } });
    expect(corrida.fin).toMatchObject({ causa: 'error-interno' });
    expect(corrida.fin?.detalle).toContain('algo se rompió');
    expect(corrida.pasos[corrida.pasos.length - 1]).toMatchObject({ clase: 'detenido', explicacion: { clave: 'detenido', datos: { causa: 'error-interno' } } });
    expect(corrida.errores).toBe('');
  });
});

describe('lo que la biblioteca no puede ejecutar con fidelidad: un aviso honesto, nunca un resultado inventado (D2)', () => {
  const puertoQueNoSabe = (motivo: ConstructorParameters<typeof NoDisponibleEnEjecucion>[0]): PuertoBiblioteca => ({
    operaciones: new Map<string, OperacionDeBiblioteca>([
      [
        'Math.abs(int)',
        () => {
          throw new NoDisponibleEnEjecucion(motivo, 'detalle para quien depure');
        },
      ],
    ]),
    doubleATexto: null,
  });

  it('la NoDisponibleEnEjecucion de la biblioteca detiene con el paso `detenido` no-disponible-en-ejecucion y deja navegable lo anterior (no es un error-interno)', () => {
    const corrida = correr('    System.out.println("antes");\n    int a = Math.abs(-5);\n    System.out.println("despues");', { puerto: puertoQueNoSabe('formato-fuera-de-alcance') });
    expect(corrida.fin).toEqual({ causa: 'no-disponible-en-ejecucion' });
    expect(corrida.pasos.map((p) => p.clase)).toEqual(['impresion', 'detenido']);
    expect(corrida.pasos[1]).toMatchObject({ linea: 4, explicacion: { clave: 'detenido', datos: { causa: 'no-disponible-en-ejecucion' } } });
    expect(corrida.salida).toBe('antes\n');
    expect(corrida.errores).toBe('');
  });

  it('con cualquier motivo de la biblioteca el desenlace es el mismo', () => {
    for (const motivo of ['double-hexadecimal', 'math-pow', 'mayusculas-fuera-del-plano-basico'] as const) {
      expect(correr('    int a = Math.abs(-5);', { puerto: puertoQueNoSabe(motivo) }).fin, motivo).toEqual({ causa: 'no-disponible-en-ejecucion' });
    }
  });
});

describe('límites: la ejecución se detiene con un paso detenido y deja la traza navegable', () => {
  it('limitePasos: tras ese número de pasos Normal, un paso `detenido` con causa limite-pasos (un ciclo infinito no cuelga)', () => {
    const corrida = correr('    while (true) {\n      System.out.println("Vuelta");\n    }', { config: { limitePasos: 10 } });
    expect(corrida.pasos).toHaveLength(11);
    expect(corrida.pasos[10]).toMatchObject({ clase: 'detenido', explicacion: { clave: 'detenido', datos: { causa: 'limite-pasos' } }, fin: { causa: 'limite-pasos' } });
    expect(corrida.salida).toBe('Vuelta\n'.repeat(5));
    // tarea 3.4: sabe en qué ciclo estaba (una condición sin variables no tiene nada que citar)
    expect(corrida.fin).toEqual({ causa: 'limite-pasos', diagnostico: { ciclo: 'while', linea: 3, condicion: 'true', vueltas: 5, sinCambio: [] } });
  });

  it('un `for (;;)` sin condición ni nada que dé pasos en el cuerpo también se detiene (limite-pasos): no cuelga la ejecución', () => {
    const corrida = correr('    for (;;) {\n    }', { config: { limitePasos: 50 } });
    expect(corrida.fin).toEqual({ causa: 'limite-pasos' });
    expect(corrida.pasos[corrida.pasos.length - 1]).toMatchObject({ clase: 'detenido', explicacion: { clave: 'detenido', datos: { causa: 'limite-pasos' } } });
  });

  it('limite-caracteres: `s += s` en un ciclo detiene la ejecución en vez de agotar la memoria', () => {
    const corrida = correr('    String s = "ab";\n    while (true) {\n      s += s;\n    }', { config: { limiteCaracteres: 100 } });
    expect(corrida.fin).toEqual({ causa: 'limite-caracteres' });
    expect(corrida.pasos[corrida.pasos.length - 1]).toMatchObject({ clase: 'detenido', explicacion: { datos: { causa: 'limite-caracteres' } } });
  });

  it('limite-caracteres también acota la consola (cuatro veces el tope de una cadena)', () => {
    const corrida = correr('    while (true) {\n      System.out.println("0123456789");\n    }', { config: { limiteCaracteres: 10 } });
    expect(corrida.fin).toEqual({ causa: 'limite-caracteres' });
    expect(corrida.salida.length).toBeLessThanOrEqual(40);
  });
});

describe('Paso: la línea, los valores y la explicación de cada paso', () => {
  it('cada paso lleva su línea y su nodo (índice en la vista del programa)', () => {
    const resultado = compilar(programaDe('    int a = 1;\n    a = a + 1;'));
    if (!resultado.ok) throw new Error('se esperaba que compilara');
    const corrida = avanzarHastaElFinal(crearEjecucion(resultado.programa, configuracion()), [], 100, []);
    expect(corrida.pasos.map((p) => [p.linea, resultado.vista.nodos[p.nodo].linea])).toEqual([
      [3, 3],
      [4, 4],
    ]);
  });
});
