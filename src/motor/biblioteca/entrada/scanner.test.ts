// RED de la tarea 2.12 (REQ-BIB-009, REQ-BIB-010, REQ-EJEC-010, design.md §4.6): `Scanner` sobre la entrada del programa (`EntradaDelPrograma`), un búfer que puede recibir MÁS texto. Si falta
// entrada para decidir el resultado NO bloquea: lanza `FaltaEntrada` y el intérprete reintenta la sentencia cuando llegue otro renglón (modo interactivo, design.md §3.2). Con `entrada.cerrar()`
// (EOF) se comporta como `java < archivo`. Hito 1, parte C: el texto, el cursor y el EOF son los de la `EntradaDelPrograma` que maneja el intérprete, no los de un búfer propio del `Scanner`. Los escenarios son los de la especificación y los goldens de `corpus/experimentos/texto/scan*`; el barrido contra miles de casos del JDK real
// (tokens y secuencias, es-MX y es-ES) está en `pruebas/diferencial/biblioteca/scanner.test.ts`.
import { describe, expect, it } from 'vitest';
import { ExcepcionJava } from '../excepciones/excepcion-java.ts';
import { EntradaDelPrograma } from './entrada-del-programa.ts';
import { FaltaEntrada, ScannerJava } from './scanner.ts';

function conEntrada(texto: string, regional: 'es-MX' | 'es-ES' = 'es-MX'): ScannerJava {
  const entrada = new EntradaDelPrograma();
  entrada.agregar(texto);
  entrada.cerrar();
  return new ScannerJava(regional, entrada);
}

function excepcionDe(accion: () => unknown): ExcepcionJava {
  try {
    accion();
  } catch (error) {
    if (error instanceof ExcepcionJava) return error;
    throw error;
  }
  throw new Error('se esperaba una ExcepcionJava y no se lanzó nada');
}

describe('Scanner — tokenización y el error clásico de nextInt + nextLine', () => {
  it('separa por cualquier espacio en blanco (espacios, tabuladores, saltos de línea)', () => {
    const scanner = conEntrada('uno  dos\tre\ntres');
    expect([scanner.next(), scanner.next(), scanner.next(), scanner.next()]).toEqual(['uno', 'dos', 're', 'tres']);
  });

  it('nextInt() deja el salto de línea pendiente: el nextLine() siguiente devuelve "" (REQ-BIB-009)', () => {
    const scanner = conEntrada('20\nJuan Perez\n');
    expect(scanner.nextInt()).toBe(20);
    expect(scanner.nextLine()).toBe('');
    expect(scanner.nextLine()).toBe('Juan Perez');
  });

  it('nextLine() devuelve el resto del renglón sin el separador, y el último renglón sin fin de línea si el texto termina ahí', () => {
    const scanner = conEntrada('hola mundo\r\nsegunda\nultima');
    expect(scanner.nextLine()).toBe('hola mundo');
    expect(scanner.nextLine()).toBe('segunda');
    expect(scanner.nextLine()).toBe('ultima');
    expect(excepcionDe(() => scanner.nextLine()).mensaje).toBe('No line found');
  });

  it('el espacio de no separación U+00A0 NO separa tokens (a diferencia de \\s de JavaScript)', () => {
    expect(conEntrada('a b c').next()).toBe('a b');
  });
});

describe('Scanner — excepciones exactas', () => {
  it('InputMismatchException no consume el token y no lleva mensaje', () => {
    const scanner = conEntrada('abc 5');
    const excepcion = excepcionDe(() => scanner.nextInt());
    expect(excepcion.clase).toBe('java.util.InputMismatchException');
    expect(excepcion.mensaje).toBeNull();
    expect(excepcion.sitio).toBe('Scanner.nextInt/no-coincide');
    expect(scanner.next()).toBe('abc');
    expect(scanner.nextInt()).toBe(5);
  });

  it('un entero fuera de rango da InputMismatchException con mensaje «For input string»', () => {
    const excepcion = excepcionDe(() => conEntrada('99999999999').nextInt());
    expect(excepcion.clase).toBe('java.util.InputMismatchException');
    expect(excepcion.mensaje).toBe('For input string: "99999999999"');
    expect(excepcion.sitio).toBe('Scanner.nextInt/fuera-de-rango');
  });

  it('NoSuchElementException al agotar la entrada, sin mensaje; nextLine dice "No line found"', () => {
    const excepcion = excepcionDe(() => conEntrada('   \n').nextInt());
    expect(excepcion.clase).toBe('java.util.NoSuchElementException');
    expect(excepcion.mensaje).toBeNull();
    expect(excepcionDe(() => conEntrada('').nextLine()).sitio).toBe('Scanner.nextLine/sin-linea');
  });

  it('close() y luego cualquier lectura lanza IllegalStateException: Scanner closed', () => {
    const scanner = conEntrada('5');
    scanner.close();
    const excepcion = excepcionDe(() => scanner.nextInt());
    expect(excepcion.clase).toBe('java.lang.IllegalStateException');
    expect(excepcion.mensaje).toBe('Scanner closed');
    expect(excepcionDe(() => scanner.hasNext()).sitio).toBe('Scanner.hasNext/cerrado');
  });
});

describe('Scanner — separador decimal por región (REQ-BIB-010)', () => {
  it('es-MX por omisión: "3.5" se lee y "3,5" se rechaza con InputMismatchException', () => {
    expect(conEntrada('3.5').nextDouble()).toBe(3.5);
    expect(excepcionDe(() => conEntrada('3,5').nextDouble()).clase).toBe('java.util.InputMismatchException');
  });

  it('es-ES (opción «coma»): "3,5" se lee y "3.5" se rechaza', () => {
    expect(conEntrada('3,5', 'es-ES').nextDouble()).toBe(3.5);
    expect(excepcionDe(() => conEntrada('3.5', 'es-ES').nextDouble()).clase).toBe('java.util.InputMismatchException');
  });

  it('agrupación de miles con la coma de es-MX: "1,000" es 1000; "1,00" no es número', () => {
    expect(conEntrada('1,000').nextInt()).toBe(1000);
    expect(excepcionDe(() => conEntrada('1,00').nextInt()).sitio).toBe('Scanner.nextInt/no-coincide');
  });

  it('nextBoolean acepta true/false sin distinguir mayúsculas y rechaza lo demás', () => {
    const scanner = conEntrada('TRUE False si');
    expect(scanner.nextBoolean()).toBe(true);
    expect(scanner.nextBoolean()).toBe(false);
    expect(excepcionDe(() => scanner.nextBoolean()).sitio).toBe('Scanner.nextBoolean/no-coincide');
  });
});

describe('Scanner — hasNext* no consumen', () => {
  it('hasNextInt mira sin avanzar y distingue enteros de palabras', () => {
    const scanner = conEntrada('12 abc');
    expect(scanner.hasNextInt()).toBe(true);
    expect(scanner.hasNextInt()).toBe(true);
    expect(scanner.nextInt()).toBe(12);
    expect(scanner.hasNextInt()).toBe(false);
    expect(scanner.hasNext()).toBe(true);
    expect(scanner.next()).toBe('abc');
    expect(scanner.hasNext()).toBe(false);
    expect(scanner.hasNextLine()).toBe(false);
  });
});

describe('Scanner — modo interactivo: pedir más entrada en vez de bloquear', () => {
  function interactivo(): { entrada: EntradaDelPrograma; scanner: ScannerJava } {
    const entrada = new EntradaDelPrograma();
    return { entrada, scanner: new ScannerJava('es-MX', entrada) };
  }

  it('sin texto y sin EOF, nextInt pide entrada; con el renglón completo responde', () => {
    const { entrada, scanner } = interactivo();
    expect(() => scanner.nextInt()).toThrow(FaltaEntrada);
    entrada.agregar('12\n');
    expect(scanner.nextInt()).toBe(12);
  });

  it('un token pegado al final del búfer puede seguir: espera al delimitador (o al EOF) antes de decidir', () => {
    const { entrada, scanner } = interactivo();
    entrada.agregar('12');
    expect(() => scanner.nextInt()).toThrow(FaltaEntrada);
    entrada.agregar('3\n');
    expect(scanner.nextInt()).toBe(123);
  });

  it('nextLine pide entrada hasta ver el fin de renglón; hasNext responde en cuanto hay algún carácter que no es separador', () => {
    const { entrada, scanner } = interactivo();
    entrada.agregar('hola');
    expect(() => scanner.nextLine()).toThrow(FaltaEntrada);
    expect(scanner.hasNext()).toBe(true);
    entrada.agregar(' mundo\n');
    expect(scanner.nextLine()).toBe('hola mundo');
    expect(() => scanner.hasNext()).toThrow(FaltaEntrada);
  });

  it('el EOF de la entrada (entrada.cerrar()) convierte "falta entrada" en el resultado final: NoSuchElementException', () => {
    const { entrada, scanner } = interactivo();
    entrada.agregar('7\n');
    expect(scanner.nextInt()).toBe(7);
    expect(() => scanner.nextInt()).toThrow(FaltaEntrada);
    entrada.cerrar();
    expect(excepcionDe(() => scanner.nextInt()).clase).toBe('java.util.NoSuchElementException');
  });
});

describe('Scanner — lee la entrada del programa (EntradaDelPrograma), no un búfer propio', () => {
  it('lo que lee avanza el cursor de la entrada: ese cursor es el que el intérprete captura y restaura en una instantánea', () => {
    const entrada = new EntradaDelPrograma();
    entrada.agregar('5 8\n');
    entrada.cerrar();
    const scanner = new ScannerJava('es-MX', entrada);
    expect(scanner.nextInt()).toBe(5);
    expect(entrada.cursor).toBe(1);
    expect(scanner.nextInt()).toBe(8);
    expect(entrada.cursor).toBe(3);
  });

  it('si el intérprete devuelve el cursor de la entrada, el Scanner vuelve a leer lo mismo (la sentencia se reintenta desde donde empezó)', () => {
    const entrada = new EntradaDelPrograma();
    entrada.agregar('5 ');
    const scanner = new ScannerJava('es-MX', entrada);
    const cursorInicial = entrada.cursor;
    expect(scanner.nextInt()).toBe(5);
    expect(() => scanner.nextInt()).toThrow(FaltaEntrada);
    entrada.cursor = cursorInicial;
    entrada.agregar('8\n');
    expect(scanner.nextInt()).toBe(5);
    expect(scanner.nextInt()).toBe(8);
  });

  it('capturar/restaurar devuelve lo que es del Scanner y no de la entrada: si estaba cerrado, vuelve a estarlo abierto', () => {
    const entrada = new EntradaDelPrograma();
    entrada.agregar('5 6\n');
    entrada.cerrar();
    const scanner = new ScannerJava('es-MX', entrada);
    const estado = scanner.capturar();
    scanner.close();
    expect(excepcionDe(() => scanner.nextInt()).clase).toBe('java.lang.IllegalStateException');
    scanner.restaurar(estado);
    expect(scanner.nextInt()).toBe(5);
  });

  it('es un objeto de la biblioteca de clase Scanner (así viaja en la traza: { objeto: "Scanner" })', () => {
    expect(new ScannerJava('es-MX', new EntradaDelPrograma()).claseJava).toBe('Scanner');
  });
});
