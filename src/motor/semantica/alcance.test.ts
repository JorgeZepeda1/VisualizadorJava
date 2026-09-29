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

// Tarea 1.29: la asignación definida (JLS 16.1.1) necesita el estado «vacuo» de una rama que nunca ocurre — todas las
// variables YA declaradas en ese punto, ni una más —, y para armarlo pide a `Alcance` los nombres de todo lo visible.
describe('Alcance — nombresVisibles (tarea 1.29)', () => {
  it('sin ningún bloque abierto, o con uno vacío, no hay nombres', () => {
    const alcance = new Alcance();
    expect(alcance.nombresVisibles()).toEqual([]);
    alcance.entrarBloque();
    expect(alcance.nombresVisibles()).toEqual([]);
  });

  it('reúne los nombres de TODOS los bloques abiertos y olvida los del bloque que se cierra', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'a', tipo: 'int', esFinal: false, rango: R(0, 1) });
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'b', tipo: 'int', esFinal: false, rango: R(2, 3) });
    expect([...alcance.nombresVisibles()].sort()).toEqual(['a', 'b']);
    alcance.salirBloque();
    expect(alcance.nombresVisibles()).toEqual(['a']);
  });

  it('una declaración rechazada por duplicada no agrega nada', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'a', tipo: 'int', esFinal: false, rango: R(0, 1) });
    alcance.declarar({ nombre: 'a', tipo: 'long', esFinal: false, rango: R(2, 3) });
    expect(alcance.nombresVisibles()).toEqual(['a']);
  });
});

// Tarea 1.29: al cerrarse un alcance, sus variables MUEREN — la asignación definida las olvida (si no, la `x` de un `for` ya
// cerrado se confundiría con otra `x` declarada después). Para eso `salirBloque` entrega los nombres que se llevó.
describe('Alcance — salirBloque devuelve los nombres del bloque que cierra (tarea 1.29)', () => {
  it('devuelve SOLO los nombres del bloque más interno; los del exterior siguen visibles', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'a', tipo: 'int', esFinal: false, rango: R(0, 1) });
    alcance.entrarBloque();
    alcance.declarar({ nombre: 'b', tipo: 'int', esFinal: false, rango: R(2, 3) });
    alcance.declarar({ nombre: 'c', tipo: 'int', esFinal: false, rango: R(4, 5) });
    expect([...alcance.salirBloque()].sort()).toEqual(['b', 'c']);
    expect(alcance.buscar('a')).not.toBeNull();
    expect(alcance.buscar('b')).toBeNull();
  });

  it('un bloque vacío devuelve una lista vacía', () => {
    const alcance = new Alcance();
    alcance.entrarBloque();
    expect(alcance.salirBloque()).toEqual([]);
  });
});
