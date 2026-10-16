// RED del hito 1, parte C (tareas 2.12 a 2.19, REQ-SUB-005, D2): el puerto por omisión conecta el intérprete con la biblioteca de Java. Esta prueba cierra el hueco entre las dos mitades: cada
// miembro que el catálogo reconoce como «soportado» (`MIEMBROS_SOPORTADOS` × `FIRMAS_JDK`, los constructores de `CONSTRUCTORES_SOPORTADOS`) o está conectado —y entonces `generarIr` lo baja a
// una llamada— o aparece AQUÍ con el motivo por el que no lo está. Lo no conectado no se ejecuta: `generarIr` lo deja como `ejecucion-no-disponible` en la compilación, nunca a media ejecución.
import { describe, expect, it } from 'vitest';
import { doubleATexto } from '../biblioteca/index.ts';
import { FIRMAS_JDK, type FirmaMiembro } from '../biblioteca/datos/firmas-jdk.generado.ts';
import { CLAVES_NATIVAS } from '../ir/generar-ir.ts';
import { CONSTRUCTORES_SOPORTADOS, MIEMBROS_SOPORTADOS } from '../semantica/catalogo-api.ts';
import { PUERTO_POR_OMISION } from './puerto-por-omision.ts';
import { unirOperaciones } from './operaciones/unir-operaciones.ts';

function claveDeFirma(firma: FirmaMiembro): string {
  return `${firma.clase}.${firma.genero === 'constructor' ? '<init>' : firma.nombre}(${firma.parametros.join(',')})`;
}

/** Las firmas que el catálogo del subconjunto reconoce y que son métodos o constructores (las constantes de campo las baja `generarIr` a un valor). */
const FIRMAS_SOPORTADAS = FIRMAS_JDK.filter((firma) => {
  if (firma.genero === 'campo') return false;
  if (firma.genero === 'constructor') return CONSTRUCTORES_SOPORTADOS.has(`${firma.clase}(${firma.parametros.join(',')})`);
  return MIEMBROS_SOPORTADOS.has(`${firma.clase}.${firma.nombre}`);
}).map(claveDeFirma);

const FUERA_DEL_SUBCONJUNTO = 'el subconjunto no tiene ese tipo: no hay forma de escribir un argumento así';
const SOBRECARGA_EXOTICA = 'sobrecarga que ningún programa de clase usa y la biblioteca no cubre (pendiente, aviso honesto en la compilación)';

/** Lo reconocido que NO está conectado, con su motivo. Un `Map`: se consulta con claves de firma. */
const NO_CONECTADAS: ReadonlyMap<string, string> = new Map([
  ['Math.pow(double,double)', '`Math.pow` espera el puerto de fdlibm (tarea 2.5): sin él Java y V8 difieren en el 4 % de los casos, así que NO se ejecuta (decisión D2, en la compilación)'],
  ['Math.abs(float)', FUERA_DEL_SUBCONJUNTO],
  ['Math.max(float,float)', FUERA_DEL_SUBCONJUNTO],
  ['Math.min(float,float)', FUERA_DEL_SUBCONJUNTO],
  ['PrintStream.print(float)', FUERA_DEL_SUBCONJUNTO],
  ['PrintStream.println(float)', FUERA_DEL_SUBCONJUNTO],
  ['String.valueOf(float)', FUERA_DEL_SUBCONJUNTO],
  ['PrintStream.print(char[])', FUERA_DEL_SUBCONJUNTO],
  ['PrintStream.println(char[])', FUERA_DEL_SUBCONJUNTO],
  ['String.valueOf(char[])', FUERA_DEL_SUBCONJUNTO],
  ['String.valueOf(char[],int,int)', FUERA_DEL_SUBCONJUNTO],
  ['PrintStream.printf(java.util.Locale,java.lang.String,java.lang.Object[])', FUERA_DEL_SUBCONJUNTO],
  ['String.format(java.util.Locale,java.lang.String,java.lang.Object[])', FUERA_DEL_SUBCONJUNTO],
  ['String.toLowerCase(java.util.Locale)', FUERA_DEL_SUBCONJUNTO],
  ['String.toUpperCase(java.util.Locale)', FUERA_DEL_SUBCONJUNTO],
  ['Scanner.next(java.util.regex.Pattern)', FUERA_DEL_SUBCONJUNTO],
  ['Integer.parseInt(java.lang.CharSequence,int,int,int)', FUERA_DEL_SUBCONJUNTO],
  ['PrintStream.print(java.lang.Object)', 'imprimir un objeto (`Scanner`, `Random`) pide su `toString` con la dirección en memoria: no se modela'],
  ['PrintStream.println(java.lang.Object)', 'imprimir un objeto (`Scanner`, `Random`) pide su `toString` con la dirección en memoria: no se modela'],
  ['Scanner.next(java.lang.String)', SOBRECARGA_EXOTICA],
  ['Scanner.nextInt(int)', SOBRECARGA_EXOTICA],
  ['Random.nextInt(int,int)', SOBRECARGA_EXOTICA],
  ['Random.nextDouble(double)', SOBRECARGA_EXOTICA],
  ['Random.nextDouble(double,double)', SOBRECARGA_EXOTICA],
  ['Integer.parseInt(java.lang.String,int)', SOBRECARGA_EXOTICA],
  ['String.indexOf(int,int)', SOBRECARGA_EXOTICA],
  ['String.startsWith(java.lang.String,int)', SOBRECARGA_EXOTICA],
]);

describe('el puerto por omisión conecta la biblioteca con el intérprete', () => {
  it('el recorrido ve las firmas soportadas del catálogo (guarda contra una lista vacía)', () => {
    expect(FIRMAS_SOPORTADAS.length).toBeGreaterThan(100);
    expect(FIRMAS_SOPORTADAS).toContain('Scanner.nextInt()');
    expect(FIRMAS_SOPORTADAS).toContain('Random.<init>(long)');
  });

  it('cada firma soportada está conectada, es nativa del intérprete (print/println) o aparece en NO_CONECTADAS con su motivo', () => {
    const sinExplicar = FIRMAS_SOPORTADAS.filter((clave) => !PUERTO_POR_OMISION.operaciones.has(clave) && !CLAVES_NATIVAS.has(clave) && !NO_CONECTADAS.has(clave));
    expect(sinExplicar).toEqual([]);
  });

  it('NO_CONECTADAS no tiene entradas viejas: cada una es una firma soportada y NO está conectada (si se conecta, se quita de la lista)', () => {
    const viejas = [...NO_CONECTADAS.keys()].filter((clave) => !FIRMAS_SOPORTADAS.includes(clave) || PUERTO_POR_OMISION.operaciones.has(clave));
    expect(viejas).toEqual([]);
  });

  it('el puerto no registra nada que el catálogo no reconozca ni lo que el intérprete resuelve solo', () => {
    const sobrantes = [...PUERTO_POR_OMISION.operaciones.keys()].filter((clave) => !FIRMAS_SOPORTADAS.includes(clave) || CLAVES_NATIVAS.has(clave));
    expect(sobrantes).toEqual([]);
  });

  it('conecta un número razonable de operaciones (el informe del hito: cuántas de las firmas soportadas)', () => {
    expect(PUERTO_POR_OMISION.operaciones.size).toBeGreaterThanOrEqual(70);
  });

  it('Double.toString es el de la biblioteca (el de los 3 millones de double del JDK)', () => {
    expect(PUERTO_POR_OMISION.doubleATexto).toBe(doubleATexto);
    expect(PUERTO_POR_OMISION.doubleATexto?.(0.1 + 0.2)).toBe('0.30000000000000004');
  });
});

describe('unirOperaciones: el puerto se arma con las tablas de cada clase y una clave repetida es un error de programación', () => {
  const nada = (): undefined => undefined;

  it('une las tablas en un solo Map', () => {
    const unido = unirOperaciones([new Map([['A.uno()', nada]]), new Map([['B.dos()', nada]])]);
    expect([...unido.keys()]).toEqual(['A.uno()', 'B.dos()']);
  });

  it('una clave en dos tablas lanza: la segunda NO pisa en silencio a la primera', () => {
    expect(() => unirOperaciones([new Map([['A.uno()', nada]]), new Map([['A.uno()', nada]])])).toThrow('A.uno()');
  });
});
