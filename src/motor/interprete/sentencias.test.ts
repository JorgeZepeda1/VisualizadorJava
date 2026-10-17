// RED de la tarea 2.18 (REQ-EJEC-004, design.md §3.2, §3.3, ADR 005): cada sentencia se ejecuta en un generador que cede UN `Paso` por paso Normal:
// uno por sentencia ejecutada y uno por cada condición evaluada (con su valor), por cada vuelta de ciclo, por cada impresión. Aquí se comprueba qué
// pasos salen (clase, línea, control) y con qué clave de explicación y datos, para `if`/`else if`, `switch` con caída, los tres ciclos, `break`,
// `continue` y `return`. Los programas son los mismos de `corpus/experimentos/ejecucion/`, cuya salida confirmó el JDK 17 real.
import { describe, expect, it } from 'vitest';
import type { Paso } from '../traza/paso.ts';
import { correr } from './ayudas-de-prueba.ts';

/** `clase@línea` de cada paso: la forma corta de comparar un recorrido. */
function recorrido(pasos: readonly Paso[]): string[] {
  return pasos.map((paso) => `${paso.clase}@${paso.linea}`);
}

function claves(pasos: readonly Paso[]): string[] {
  return pasos.map((paso) => paso.explicacion.clave);
}

describe('if / else if / else: un paso por condición evaluada, en orden', () => {
  const PROGRAMA = [
    '    int cantidad = 2;',
    '    if (cantidad < 1) {',
    '      System.out.println("pocas");',
    '    } else {',
    '      System.out.println("suficientes");',
    '    }',
  ].join('\n');

  it('declaración, condición falsa (con sus datos) y la impresión de la rama else', () => {
    const corrida = correr(PROGRAMA);
    expect(corrida.salida).toBe('suficientes\n');
    expect(recorrido(corrida.pasos)).toEqual(['declaracion@3', 'condicion-if@4', 'impresion@7']);
    expect(corrida.pasos[1]).toMatchObject({
      control: { resultado: false, predecible: true },
      valores: [2, 1, false],
      explicacion: {
        clave: 'condicion-if',
        datos: { condicion: 'cantidad < 1', sustituida: '2 < 1', lecturas: [{ nombre: 'cantidad', valor: '2' }], resultado: false, tieneSino: true },
      },
    });
    expect(corrida.fin).toEqual({ causa: 'terminado' });
  });

  it('con la condición verdadera entra al if y no evalúa nada del else', () => {
    const corrida = correr(PROGRAMA.replace('cantidad = 2', 'cantidad = 0'));
    expect(corrida.salida).toBe('pocas\n');
    expect(recorrido(corrida.pasos)).toEqual(['declaracion@3', 'condicion-if@4', 'impresion@5']);
    expect(corrida.pasos[1].control).toMatchObject({ resultado: true });
  });

  it('else if: cada condición evaluada es su propio paso y para en la primera verdadera', () => {
    const corrida = correr(
      [
        '    int nota = 75;',
        '    if (nota >= 90) {',
        '      System.out.println("A");',
        '    } else if (nota >= 70) {',
        '      System.out.println("B");',
        '    } else if (nota >= 60) {',
        '      System.out.println("C");',
        '    } else {',
        '      System.out.println("F");',
        '    }',
      ].join('\n'),
    );
    expect(corrida.salida).toBe('B\n');
    expect(recorrido(corrida.pasos)).toEqual(['declaracion@3', 'condicion-if@4', 'condicion-if@6', 'impresion@7']);
    expect(corrida.pasos.slice(1, 3).map((p) => p.control?.resultado)).toEqual([false, true]);
  });

  it('un if sin else lo dice en los datos (tieneSino false)', () => {
    const corrida = correr('    int x = 1;\n    if (x > 5) {\n      x = 0;\n    }');
    expect(corrida.pasos[1].explicacion).toMatchObject({ clave: 'condicion-if', datos: { tieneSino: false, resultado: false } });
    expect(recorrido(corrida.pasos)).toEqual(['declaracion@3', 'condicion-if@4']);
  });
});

describe('while y do-while: un paso por cada revisión de la condición, con su vuelta', () => {
  it('while: la condición se revisa una vez más que las vueltas del cuerpo; las vueltas se cuentan desde 1', () => {
    const corrida = correr('    int i = 0;\n    while (i < 2) {\n      i++;\n    }');
    expect(recorrido(corrida.pasos)).toEqual(['declaracion@3', 'condicion-ciclo@4', 'asignacion@5', 'condicion-ciclo@4', 'asignacion@5', 'condicion-ciclo@4']);
    const condiciones = corrida.pasos.filter((p) => p.clase === 'condicion-ciclo');
    expect(condiciones.map((p) => [p.control?.vuelta, p.control?.resultado])).toEqual([
      [1, true],
      [2, true],
      [3, false],
    ]);
    expect(new Set(condiciones.map((p) => p.control?.ciclo)).size).toBe(1);
    expect(condiciones[0].control?.predecible).toBe(true);
    expect(condiciones[2].explicacion).toMatchObject({
      clave: 'condicion-ciclo',
      datos: { ciclo: 'while', condicion: 'i < 2', sustituida: '2 < 2', lecturas: [{ nombre: 'i', valor: '2' }], resultado: false, vuelta: 3 },
    });
  });

  it('do-while: el cuerpo corre primero y la condición se revisa DESPUÉS de cada vuelta', () => {
    const corrida = correr('    int i = 0;\n    do {\n      i++;\n    } while (i < 2);');
    expect(recorrido(corrida.pasos)).toEqual(['declaracion@3', 'asignacion@5', 'condicion-ciclo@6', 'asignacion@5', 'condicion-ciclo@6']);
    expect(corrida.pasos.filter((p) => p.clase === 'condicion-ciclo').map((p) => [p.control?.vuelta, p.control?.resultado])).toEqual([
      [1, true],
      [2, false],
    ]);
    expect(corrida.pasos[2].explicacion).toMatchObject({ datos: { ciclo: 'do-while' } });
  });

  it('un do-while cuya condición es falsa desde el principio igual corre el cuerpo UNA vez', () => {
    const corrida = correr('    int i = 5;\n    do {\n      System.out.println(i);\n    } while (i < 0);');
    expect(corrida.salida).toBe('5\n');
  });

  it('un while que no entra: solo la condición falsa', () => {
    const corrida = correr('    int i = 9;\n    while (i < 3) {\n      i++;\n    }');
    expect(recorrido(corrida.pasos)).toEqual(['declaracion@3', 'condicion-ciclo@4']);
  });
});

describe('for: inicio, condición, cuerpo y actualización son pasos distintos', () => {
  const PROGRAMA = '    for (int i = 0; i < 2; i++) {\n      System.out.println(i);\n    }';

  it('recorrido completo: inicio una vez; condición, cuerpo y actualización en cada vuelta', () => {
    const corrida = correr(PROGRAMA);
    expect(corrida.salida).toBe('0\n1\n');
    expect(recorrido(corrida.pasos)).toEqual([
      'declaracion@3',
      'condicion-ciclo@3',
      'impresion@4',
      'asignacion@3',
      'condicion-ciclo@3',
      'impresion@4',
      'asignacion@3',
      'condicion-ciclo@3',
    ]);
    expect(corrida.pasos[3].explicacion).toMatchObject({ clave: 'incremento', datos: { nombre: 'i', anterior: '0', valor: '1' } });
    expect(corrida.pasos[1].explicacion).toMatchObject({ datos: { ciclo: 'for', vuelta: 1 } });
  });

  it('continue ejecuta la actualización antes de volver a evaluar la condición', () => {
    const corrida = correr(
      ['    for (int i = 0; i < 3; i++) {', '      if (i == 1) {', '        continue;', '      }', '      System.out.println(i);', '    }'].join('\n'),
    );
    expect(corrida.salida).toBe('0\n2\n');
    const iDeLaVueltaDeContinue = recorrido(corrida.pasos);
    // ...condicion-ciclo, condicion-if(i == 1) verdadera, continue, actualización (i++), condicion-ciclo...
    const posicion = iDeLaVueltaDeContinue.indexOf('continue@5');
    expect(iDeLaVueltaDeContinue.slice(posicion - 1, posicion + 3)).toEqual(['condicion-if@4', 'continue@5', 'asignacion@3', 'condicion-ciclo@3']);
    expect(corrida.pasos[posicion].explicacion).toMatchObject({ clave: 'continue', datos: { ciclo: 'for' } });
  });

  it('break sale del ciclo sin evaluar la condición ni la actualización otra vez', () => {
    const corrida = correr(
      ['    for (int i = 0; i < 10; i++) {', '      if (i == 2) {', '        break;', '      }', '      System.out.println(i);', '    }'].join('\n'),
    );
    expect(corrida.salida).toBe('0\n1\n');
    expect(recorrido(corrida.pasos).slice(-3)).toEqual(['condicion-ciclo@3', 'condicion-if@4', 'break@5']);
    expect(corrida.pasos[corrida.pasos.length - 1].explicacion).toMatchObject({ clave: 'break', datos: { en: 'ciclo' } });
  });

  it('for sin condición (for(;;)) no da paso de condición y se corta con break', () => {
    const corrida = correr('    int n = 0;\n    for (;;) {\n      n++;\n      if (n == 2) {\n        break;\n      }\n    }');
    expect(corrida.pasos.some((p) => p.clase === 'condicion-ciclo')).toBe(false);
    expect(corrida.fin).toEqual({ causa: 'terminado' });
  });

  it('varias expresiones en el inicio y la actualización son UN paso cada una', () => {
    const corrida = correr('    int i;\n    int j;\n    for (i = 0, j = 2; i < j; i++, j--) {\n    }');
    expect(recorrido(corrida.pasos)).toEqual(['declaracion@3', 'declaracion@4', 'asignacion@5', 'condicion-ciclo@5', 'asignacion@5', 'condicion-ciclo@5']);
    expect(corrida.pasos[2].explicacion).toMatchObject({ clave: 'acciones-del-for', datos: { acciones: ['i = 0', 'j = 2'] } });
  });
});

describe('ciclos anidados: cada ciclo cuenta SUS vueltas por separado', () => {
  it('el ciclo interno reinicia su cuenta cada vez que se entra a él; los dos ciclos tienen identificadores distintos', () => {
    const corrida = correr(
      ['    for (int i = 0; i < 2; i++) {', '      for (int j = 0; j < 2; j++) {', '        System.out.println(i + "," + j);', '      }', '    }'].join('\n'),
    );
    expect(corrida.salida).toBe('0,0\n0,1\n1,0\n1,1\n');
    const condiciones = corrida.pasos.filter((p) => p.clase === 'condicion-ciclo');
    const ciclos = [...new Set(condiciones.map((p) => p.control?.ciclo))];
    expect(ciclos).toHaveLength(2);
    const [externo, interno] = ciclos;
    expect(condiciones.filter((p) => p.control?.ciclo === externo).map((p) => p.control?.vuelta)).toEqual([1, 2, 3]);
    expect(condiciones.filter((p) => p.control?.ciclo === interno).map((p) => p.control?.vuelta)).toEqual([1, 2, 3, 1, 2, 3]);
  });
});

describe('switch: selección, caída sin break y default', () => {
  const PROGRAMA = (valor: string): string =>
    [
      `    int op = ${valor};`,
      '    switch (op) {',
      '      case 1:',
      '        System.out.println("uno");',
      '      case 2:',
      '        System.out.println("dos");',
      '      case 3:',
      '        System.out.println("tres");',
      '        break;',
      '      default:',
      '        System.out.println("otro");',
      '    }',
    ].join('\n');

  it('elige el case, ejecuta y CAE al siguiente grupo hasta el break (cada caída es un paso)', () => {
    const corrida = correr(PROGRAMA('2'));
    expect(corrida.salida).toBe('dos\ntres\n');
    expect(recorrido(corrida.pasos)).toEqual(['declaracion@3', 'seleccion-switch@4', 'impresion@8', 'caida-switch@9', 'impresion@10', 'break@11']);
    expect(corrida.pasos[1]).toMatchObject({
      control: { caso: 1 },
      explicacion: { clave: 'switch-elige-caso', datos: { expresion: 'op', valor: '2', etiqueta: '2' } },
    });
    expect(corrida.pasos[3]).toMatchObject({ control: { caso: 2 }, explicacion: { clave: 'switch-cae', datos: { etiqueta: '3' } } });
    expect(corrida.pasos[5].explicacion).toMatchObject({ clave: 'break', datos: { en: 'switch' } });
  });

  it('el primer case cae por TODOS los siguientes, hasta el break', () => {
    expect(correr(PROGRAMA('1')).salida).toBe('uno\ndos\ntres\n');
  });

  it('sin coincidencia va al default (y su índice de etiqueta es el del default)', () => {
    const corrida = correr(PROGRAMA('9'));
    expect(corrida.salida).toBe('otro\n');
    expect(corrida.pasos[1]).toMatchObject({ control: { caso: 3 }, explicacion: { clave: 'switch-elige-defecto', datos: { expresion: 'op', valor: '9' } } });
  });

  it('sin coincidencia y sin default: solo el paso de selección, sin caso', () => {
    const corrida = correr('    int op = 9;\n    switch (op) {\n      case 1:\n        System.out.println("uno");\n    }');
    expect(recorrido(corrida.pasos)).toEqual(['declaracion@3', 'seleccion-switch@4']);
    expect(corrida.pasos[1].control).toBeUndefined();
    expect(corrida.pasos[1].explicacion).toMatchObject({ clave: 'switch-sin-coincidencia' });
  });

  it('etiquetas apiladas (case 2: case 3:) no son una caída: no hay paso caida-switch entre ellas', () => {
    const corrida = correr('    int op = 2;\n    switch (op) {\n      case 2:\n      case 3:\n        System.out.println("dos o tres");\n        break;\n    }');
    expect(recorrido(corrida.pasos)).toEqual(['declaracion@3', 'seleccion-switch@4', 'impresion@7', 'break@8']);
  });

  it('switch de char y de String comparan por valor', () => {
    const porChar = correr("    char c = 'b';\n    switch (c) {\n      case 'a':\n        System.out.println(\"a\");\n        break;\n      case 'b':\n        System.out.println(\"b\");\n        break;\n    }");
    expect(porChar.salida).toBe('b\n');
    expect(porChar.pasos[1].explicacion).toMatchObject({ clave: 'switch-elige-caso', datos: { valor: "'b'", etiqueta: "'b'" } });
    const porTexto = correr('    String s = "dos";\n    switch (s) {\n      case "uno":\n        System.out.println(1);\n        break;\n      case "dos":\n        System.out.println(2);\n        break;\n    }');
    expect(porTexto.salida).toBe('2\n');
  });

  it('un break dentro de un switch dentro de un ciclo solo sale del switch; un continue sigue con el ciclo', () => {
    const corrida = correr(
      [
        '    for (int i = 0; i < 3; i++) {',
        '      switch (i) {',
        '        case 0:',
        '          System.out.println("cero");',
        '          break;',
        '        case 1:',
        '          continue;',
        '        default:',
        '          System.out.println("otro");',
        '      }',
        '      System.out.println("fin vuelta");',
        '    }',
      ].join('\n'),
    );
    expect(corrida.salida).toBe('cero\nfin vuelta\notro\nfin vuelta\n');
  });
});

describe('return en main', () => {
  it('termina el programa desde dentro de un ciclo anidado, con su paso return', () => {
    const corrida = correr('    for (int i = 0; i < 5; i++) {\n      if (i == 1) {\n        System.out.println("salgo");\n        return;\n      }\n    }\n    System.out.println("nunca");');
    expect(corrida.salida).toBe('salgo\n');
    expect(corrida.pasos[corrida.pasos.length - 1]).toMatchObject({ clase: 'return', linea: 6, explicacion: { clave: 'return' } });
    expect(corrida.fin).toEqual({ causa: 'terminado' });
  });
});

describe('declaraciones y asignaciones: cambios reversibles y su explicación', () => {
  it('la declaración con valor deja un cambio con anterior undefined; la sin valor lo deja en null', () => {
    const corrida = correr('    int a = 5;\n    int b;');
    expect(corrida.pasos[0]).toMatchObject({
      clase: 'declaracion',
      cambios: [{ ranura: 'a', anterior: undefined, nuevo: 5 }],
      explicacion: { clave: 'declaracion-con-valor', datos: { nombre: 'a', tipo: 'int', expresion: '5', sustituida: '5', valor: '5' } },
    });
    expect(corrida.pasos[1]).toMatchObject({ cambios: [{ ranura: 'b', anterior: undefined, nuevo: null }], explicacion: { clave: 'declaracion-sin-valor', datos: { nombre: 'b', tipo: 'int' } } });
  });

  it('varios declaradores son UN paso', () => {
    const corrida = correr('    int a = 1, b, c = 3;');
    expect(corrida.pasos).toHaveLength(1);
    expect(corrida.pasos[0].cambios).toEqual([
      { ranura: 'a', anterior: undefined, nuevo: 1 },
      { ranura: 'b', anterior: undefined, nuevo: null },
      { ranura: 'c', anterior: undefined, nuevo: 3 },
    ]);
    expect(corrida.pasos[0].explicacion).toEqual({
      clave: 'declaracion-varias',
      datos: {
        variables: [
          { nombre: 'a', tipo: 'int', valor: '1' },
          { nombre: 'b', tipo: 'int', valor: null },
          { nombre: 'c', tipo: 'int', valor: '3' },
        ],
      },
    });
  });

  it('la variable declarada dentro de un ciclo se vuelve a declarar en cada vuelta: el `anterior` es el valor de la vuelta pasada', () => {
    const corrida = correr('    for (int i = 0; i < 2; i++) {\n      int t = i * 10 + 5;\n    }');
    const declaracionesDeT = corrida.pasos.filter((p) => p.cambios?.some((c) => c.ranura === 't'));
    expect(declaracionesDeT.map((p) => p.cambios)).toEqual([
      [{ ranura: 't', anterior: undefined, nuevo: 5 }],
      [{ ranura: 't', anterior: 5, nuevo: 15 }],
    ]);
  });

  it('asignación: guarda el cambio con el valor anterior y explica el cálculo con la sustitución', () => {
    const corrida = correr('    int x = 5;\n    x = x + 1;');
    expect(corrida.pasos[1]).toMatchObject({
      clase: 'asignacion',
      cambios: [{ ranura: 'x', anterior: 5, nuevo: 6, punto: 3 }],
      valores: [5, 1, 6, 6],
      explicacion: { clave: 'asignacion', datos: { nombre: 'x', expresion: 'x + 1', sustituida: '5 + 1', valor: '6', anterior: '5' } },
    });
  });

  it('asignación compuesta e incremento explican lo que valía la variable', () => {
    const corrida = correr('    int total = 100;\n    int precio = 25;\n    total += precio * 2;\n    total--;');
    expect(corrida.pasos[2].explicacion).toEqual({
      clave: 'asignacion-compuesta',
      datos: { nombre: 'total', operador: '+=', expresion: 'precio * 2', sustituida: '25 * 2', derecho: '50', anterior: '100', valor: '150' },
    });
    expect(corrida.pasos[3].explicacion).toEqual({ clave: 'decremento', datos: { nombre: 'total', anterior: '150', valor: '149' } });
  });

  it('valores de otros tipos se escriben como Java: char con comillas simples, String con comillas dobles', () => {
    const corrida = correr("    char letra = 'k';\n    String palabra = \"hola\";\n    letra = 'z';");
    expect(corrida.pasos[0].explicacion).toMatchObject({ datos: { valor: "'k'" } });
    expect(corrida.pasos[1].explicacion).toMatchObject({ datos: { valor: '"hola"' } });
    expect(corrida.pasos[2].explicacion).toMatchObject({ clave: 'asignacion', datos: { anterior: "'k'", valor: "'z'" } });
  });
});

describe('impresión y sentencia vacía', () => {
  it('print no agrega salto de línea y println sí; cada uno es un paso con su salida y su explicación', () => {
    const corrida = correr('    System.out.print("Edad: ");\n    System.out.println(17);\n    System.err.println("ups");');
    expect(corrida.pasos.map((p) => p.salida)).toEqual([
      [{ flujo: 'out', texto: 'Edad: ' }],
      [{ flujo: 'out', texto: '17\n' }],
      [{ flujo: 'err', texto: 'ups\n' }],
    ]);
    expect(corrida.pasos.map((p) => p.explicacion)).toEqual([
      { clave: 'impresion', datos: { texto: 'Edad: ', flujo: 'out', saltoDeLinea: false } },
      { clave: 'impresion', datos: { texto: '17', flujo: 'out', saltoDeLinea: true } },
      { clave: 'impresion', datos: { texto: 'ups', flujo: 'err', saltoDeLinea: true } },
    ]);
    expect(corrida.salida).toBe('Edad: 17\n');
    expect(corrida.errores).toBe('ups\n');
  });

  it('println() sin argumentos solo da el salto; ; suelto es un paso vacío', () => {
    const corrida = correr('    System.out.println();\n    ;');
    expect(corrida.salida).toBe('\n');
    expect(claves(corrida.pasos)).toEqual(['impresion', 'vacia']);
    expect(corrida.pasos[0].explicacion).toMatchObject({ datos: { texto: '', saltoDeLinea: true } });
    expect(corrida.pasos[1]).toMatchObject({ clase: 'vacia', linea: 4 });
  });
});
