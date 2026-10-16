// RED de la tarea 1.31: el catálogo de biblioteca con que el generador llama métodos y lee campos.
// Sale de las firmas REALES del JDK que ya generó el oráculo (`corpus/datos/api/firmas.jsonl`, ADR 010),
// nunca de una lista escrita a mano: así el generador es independiente del catálogo que el motor
// reconoce como «soportado» (si dependiera de él, sus puntos ciegos coincidirían con los del compilador
// que se quiere vigilar). Solo entran las firmas que el generador sabe armar con los tipos del
// subconjunto (nada de `File`, `Locale`, `Stream`…).
import { describe, expect, it } from 'vitest';
import { cargarCatalogoApi, tipoDeApi } from './catalogo-api.ts';

const catalogo = cargarCatalogoApi();

describe('tipoDeApi — de los nombres reflejados del JDK a los tipos del generador', () => {
  it('los primitivos y void pasan tal cual', () => {
    for (const tipo of ['int', 'long', 'double', 'boolean', 'char', 'void']) expect(tipoDeApi(tipo)).toBe(tipo);
  });

  it('las clases del subconjunto pierden su paquete', () => {
    expect(tipoDeApi('java.lang.String')).toBe('String');
    expect(tipoDeApi('java.util.Scanner')).toBe('Scanner');
    expect(tipoDeApi('java.util.Random')).toBe('Random');
  });

  it('Object y CharSequence son tipos de PARÁMETRO que el generador sabe llenar (con cualquier valor / con un String)', () => {
    expect(tipoDeApi('java.lang.Object')).toBe('Object');
    expect(tipoDeApi('java.lang.CharSequence')).toBe('CharSequence');
  });

  it('lo que el generador no sabe armar devuelve null (arreglos, Locale, float, Stream…)', () => {
    for (const tipo of ['int[]', 'java.util.Locale', 'float', 'byte', 'java.util.stream.IntStream', 'java.io.File']) {
      expect(tipoDeApi(tipo)).toBeNull();
    }
  });
});

describe('cargarCatalogoApi — las firmas reales que el generador puede usar', () => {
  it('trae las clases del currículo y las dos más que el subconjunto reconoce (Long y System)', () => {
    expect([...catalogo.clases].sort()).toEqual(['Character', 'Double', 'Integer', 'Long', 'Math', 'Random', 'Scanner', 'String', 'System']);
  });

  it('String.length() es un método de instancia sin parámetros que devuelve int', () => {
    expect(catalogo.metodos('String')).toContainEqual({ clase: 'String', nombre: 'length', esEstatico: false, parametros: [], retorno: 'int' });
  });

  it('Math.abs(int) es estático; Math.sqrt(double) devuelve double', () => {
    expect(catalogo.metodos('Math')).toContainEqual({ clase: 'Math', nombre: 'abs', esEstatico: true, parametros: ['int'], retorno: 'int' });
    expect(catalogo.metodos('Math')).toContainEqual({ clase: 'Math', nombre: 'sqrt', esEstatico: true, parametros: ['double'], retorno: 'double' });
  });

  it('String.equals(Object) entra con su parámetro Object (es la llamada más común del currículo)', () => {
    expect(catalogo.metodos('String')).toContainEqual({ clase: 'String', nombre: 'equals', esEstatico: false, parametros: ['Object'], retorno: 'boolean' });
  });

  it('Scanner.close() es un método void: entra en la lista de los que no devuelven valor', () => {
    expect(catalogo.metodosVoid()).toContainEqual({ clase: 'Scanner', nombre: 'close', esEstatico: false, parametros: [], retorno: 'void' });
  });

  it('metodosPorRetorno solo devuelve métodos de ese tipo, y hay de cada tipo del subconjunto', () => {
    for (const tipo of ['int', 'long', 'double', 'boolean', 'char', 'String']) {
      const metodos = catalogo.metodosPorRetorno(tipo);
      expect(metodos.length, `métodos que devuelven ${tipo}`).toBeGreaterThan(0);
      expect(metodos.every((m) => m.retorno === tipo)).toBe(true);
    }
  });

  it('cada firma solo usa tipos que el generador sabe armar y ninguna es varargs', () => {
    const permitidos = new Set(['int', 'long', 'double', 'boolean', 'char', 'String', 'Scanner', 'Random', 'Object', 'CharSequence', 'void']);
    for (const clase of catalogo.clases) {
      for (const metodo of catalogo.metodos(clase)) {
        expect(permitidos.has(metodo.retorno), `${clase}.${metodo.nombre} retorna ${metodo.retorno}`).toBe(true);
        for (const parametro of metodo.parametros) {
          expect(permitidos.has(parametro) && parametro !== 'void', `${clase}.${metodo.nombre} recibe ${parametro}`).toBe(true);
        }
      }
    }
  });

  it('no incluye wait, notify ni notifyAll: son de hilos (fuera del currículo) y siempre fallan por una excepción comprobada', () => {
    const excluidos = new Set(['wait', 'notify', 'notifyAll']);
    const presentes = catalogo.clases.flatMap((clase) => catalogo.metodos(clase)).filter((m) => excluidos.has(m.nombre));
    expect(presentes).toEqual([]);
  });

  it('los campos de biblioteca traen su tipo y si son estáticos (Math.PI, Integer.MAX_VALUE)', () => {
    expect(catalogo.campos('Math')).toContainEqual({ clase: 'Math', nombre: 'PI', esEstatico: true, tipo: 'double' });
    expect(catalogo.campos('Integer')).toContainEqual({ clase: 'Integer', nombre: 'MAX_VALUE', esEstatico: true, tipo: 'int' });
  });

  it('es determinista: dos cargas producen exactamente lo mismo, en el mismo orden', () => {
    expect(cargarCatalogoApi().metodos('String')).toEqual(catalogo.metodos('String'));
  });
});
