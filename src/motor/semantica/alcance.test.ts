// RED de la tarea 1.7 (Atribución — símbolos y alcance, REQ-COMP-002/003): una ranura por
// declaración, pila de bloques abiertos (design.md §2.7 "una ranura por declaración... un solo
// marco"). `declarar` rechaza tanto la redeclaración en el MISMO bloque como el sombreado en un
// bloque anidado con el MISMO código (javac da el mensaje idéntico para ambos, verificado contra
// el JDK real — ver `flow13`/`flow18`/`flow19` de exploracion/03).
import { describe, expect, it } from 'vitest';
import { Alcance } from './alcance.ts';

const R = (inicio: number, fin: number) => ({ inicio, fin });

describe('Alcance — declarar y buscar en el bloque actual', () => {
  it('una variable declarada se encuentra por su nombre', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'x', tipo: 'int', esFinal: false, rango: R(0, 1) });
    expect(alcance.buscar('x')).toEqual({ nombre: 'x', tipo: 'int', esFinal: false, rango: R(0, 1) });
  });

  it('una variable no declarada no se encuentra (null)', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    expect(alcance.buscar('noExiste')).toBeNull();
  });
});

describe('Alcance — redeclaración en el MISMO bloque se rechaza', () => {
  it('declarar dos veces el mismo nombre en un bloque devuelve ok:false', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    const primera = alcance.declarar({ nombre: 'x', tipo: 'int', esFinal: false, rango: R(0, 1) });
    const segunda = alcance.declarar({ nombre: 'x', tipo: 'double', esFinal: false, rango: R(5, 6) });
    expect(primera.ok).toBe(true);
    expect(segunda.ok).toBe(false);
    if (segunda.ok) throw new Error('se esperaba ok:false');
    expect(segunda.existente.rango).toEqual(R(0, 1));
  });
});

describe('Alcance — sombreado en un bloque anidado se rechaza (mientras la externa siga viva)', () => {
  it('declarar "x" en un bloque hijo mientras "x" del padre sigue abierta también es ok:false', () => {
    const alcance = new Alcance();
    alcance.entrarBloque(); // bloque de main
    alcance.declarar({ nombre: 'x', tipo: 'int', esFinal: false, rango: R(0, 1) });
    alcance.entrarBloque(); // bloque anidado (if/while/for/bloque suelto)
    const resultado = alcance.declarar({ nombre: 'x', tipo: 'int', esFinal: false, rango: R(10, 11) });
    expect(resultado.ok).toBe(false);
  });

  it('triangulación: DOS niveles de anidamiento, incluida la variable de control de un for', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'i', tipo: 'int', esFinal: false, rango: R(0, 1) });
    alcance.entrarBloque(); // "for" externo reusa el nombre 'i' de una variable normal
    const resultado = alcance.declarar({ nombre: 'i', tipo: 'int', esFinal: false, rango: R(20, 21) });
    expect(resultado.ok).toBe(false);
  });
});

describe('Alcance — salirBloque cierra el alcance: la variable deja de encontrarse', () => {
  it('una variable de un bloque cerrado ya no se encuentra (REQ-COMP-002, variable de un for tras cerrarlo)', () => {
    const alcance = new Alcance();
    alcance.entrarBloque(); // main
    alcance.entrarBloque(); // for
    alcance.declarar({ nombre: 'i', tipo: 'int', esFinal: false, rango: R(0, 1) });
    expect(alcance.buscar('i')).not.toBeNull();
    alcance.salirBloque(); // cierra el "for"
    expect(alcance.buscar('i')).toBeNull();
  });

  it('triangulación: tras cerrar el bloque anidado, SÍ se puede declarar el mismo nombre en un bloque hermano', () => {
    const alcance = new Alcance();
    alcance.entrarBloque(); // main
    alcance.entrarBloque(); // primer "if"
    alcance.declarar({ nombre: 'y', tipo: 'int', esFinal: false, rango: R(0, 1) });
    alcance.salirBloque();
    alcance.entrarBloque(); // segundo "if", hermano del primero
    const resultado = alcance.declarar({ nombre: 'y', tipo: 'int', esFinal: false, rango: R(50, 51) });
    expect(resultado.ok).toBe(true);
  });
});
