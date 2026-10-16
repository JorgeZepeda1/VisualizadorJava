// Tarea 1.39 (W-16 de la tarea 1.38): los 871 paquetes de los módulos del sistema del JDK 17.0.18, cada uno con lo que el JDK REAL hizo con `package <p>; public class Saludo { … println("hola") … }`
// (`corpus/datos/api/paquetes-de-modulos.jsonl`, el dato crudo del oráculo: `GenerarPaquetesDeModulos.java` compila todos con javac y el oráculo arranca los que javac compiló con el `java` real), contra
// `compilar()`. Tres desenlaces, y el motor tiene que decir lo mismo en cada uno, sin JDK y en `npm test`:
//   - `javac-rechaza` (226): el módulo EXPORTA el paquete («package exists in another module») → el error de compilación `paquete-del-jdk`;
//   - `no-carga` (516): javac lo compila porque el módulo no lo exporta y el lanzador no encuentra la clase (`ClassNotFoundException`) → el aviso `paquete-interno-del-jdk`, nunca `ok`;
//   - `arranca` (129): javac lo compila y el lanzador escribe «hola» (los módulos que ni siquiera están en el arranque: incubadoras, herramientas) → `ok`, el programa se ejecuta.
// Es la guarda de TODA la familia, no de los casos que alguien pensó en probar: los nombres no los escribe nadie. El archivo del motor (`PAQUETES_INTERNOS_DEL_JDK`) y el dato crudo se vigilan entre sí.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAQUETES_INTERNOS_DEL_JDK } from '../../src/motor/biblioteca/datos/paquetes-internos-del-jdk.generado.ts';
import { compilar } from '../../src/motor/index.ts';

type Desenlace = 'javac-rechaza' | 'arranca' | 'no-carga';

interface PaqueteMedido {
  readonly paquete: string;
  readonly desenlace: Desenlace;
}

const medidos: PaqueteMedido[] = readFileSync(resolve('corpus/datos/api/paquetes-de-modulos.jsonl'), 'utf-8')
  .split('\n')
  .filter((linea) => linea !== '')
  .map((linea) => JSON.parse(linea) as PaqueteMedido);

const programaEn = (paquete: string): string => `package ${paquete};\n\npublic class Saludo {\n    public static void main(String[] args) {\n        System.out.println("hola");\n    }\n}\n`;
const deDesenlace = (desenlace: Desenlace): string[] => medidos.filter((medido) => medido.desenlace === desenlace).map((medido) => medido.paquete);

/** Lo que `compilar()` dice de un programa en `paquete`, en una palabra: `ok`, o `categoria/codigo`. */
function veredictoDelMotor(paquete: string): string {
  const resultado = compilar(programaEn(paquete));
  if (resultado.ok) return resultado.programa.arranque === null ? 'ok' : `ok con arranque ${resultado.programa.arranque.codigo}`;
  return `${resultado.problema.categoria}/${resultado.problema.codigo}`;
}

describe('los 871 paquetes de los módulos del sistema — lo que el JDK real hizo con cada uno y lo que dice `compilar()` (tarea 1.39, W-16)', () => {
  it('el dato crudo del oráculo trae cientos de paquetes de cada desenlace, ordenados y sin repetidos (nunca un barrido vacío)', () => {
    expect(medidos.length).toBeGreaterThanOrEqual(800);
    expect(deDesenlace('javac-rechaza').length).toBeGreaterThanOrEqual(200);
    expect(deDesenlace('no-carga').length).toBeGreaterThanOrEqual(400);
    expect(deDesenlace('arranca').length).toBeGreaterThanOrEqual(100);
    const nombres = medidos.map((medido) => medido.paquete);
    expect(nombres).toEqual([...nombres].sort());
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it('el archivo del motor y el dato crudo se vigilan entre sí: la lista del motor es EXACTAMENTE los paquetes «no-carga» del oráculo', () => {
    expect(PAQUETES_INTERNOS_DEL_JDK.split(',')).toEqual(deDesenlace('no-carga'));
  });

  it('«javac-rechaza»: el JDK exporta el paquete y javac no compila → `compilar()` da el error `paquete-del-jdk` en los 226', () => {
    const desacuerdos = deDesenlace('javac-rechaza')
      .map((paquete) => [paquete, veredictoDelMotor(paquete)] as const)
      .filter(([, veredicto]) => veredicto !== 'error-compilacion/paquete-del-jdk');
    expect(desacuerdos).toEqual([]);
  });

  it('«no-carga»: javac compila y el lanzador real no carga la clase → `compilar()` da el aviso `paquete-interno-del-jdk`, nunca `ok`, en los 516 (también en `java.awt.peer` y `java.awt.dnd.peer`)', () => {
    const desacuerdos = deDesenlace('no-carga')
      .map((paquete) => [paquete, veredictoDelMotor(paquete)] as const)
      .filter(([, veredicto]) => veredicto !== 'no-disponible/paquete-interno-del-jdk');
    expect(desacuerdos).toEqual([]);
    expect(deDesenlace('no-carga')).toEqual(expect.arrayContaining(['java.awt.peer', 'java.awt.dnd.peer', 'jdk.internal.misc', 'sun.nio.ch', 'com.sun.crypto.provider']));
  });

  it('«arranca»: javac compila y el lanzador real escribe «hola» → `compilar()` lo acepta (`ok`, listo para ejecutarse) en los 129: el motor no rechaza lo que Java ejecuta', () => {
    const desacuerdos = deDesenlace('arranca')
      .map((paquete) => [paquete, veredictoDelMotor(paquete)] as const)
      .filter(([, veredicto]) => veredicto !== 'ok');
    expect(desacuerdos).toEqual([]);
    expect(deDesenlace('arranca')).toEqual(expect.arrayContaining(['jdk.incubator.vector', 'sun.jvm.hotspot.debugger', 'com.sun.java.swing.action']));
  });

  it('un subpaquete de CADA paquete medido nunca es de esta lista: solo cuenta el nombre exacto, y el lanzador real arranca el subpaquete de uno que no carga (medido en `generar-datos.test.ts`)', () => {
    const subpaquetesQueElMotorMarca = medidos.map((medido) => `${medido.paquete}.aula`).filter((subpaquete) => veredictoDelMotor(subpaquete) === 'no-disponible/paquete-interno-del-jdk');
    expect(subpaquetesQueElMotorMarca).toEqual([]);
  });
});
