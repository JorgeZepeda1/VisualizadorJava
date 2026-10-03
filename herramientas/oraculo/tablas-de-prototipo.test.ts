// Tarea 1.34: la matriz de nombres de `Object.prototype` (`pruebas/compilacion/tablas-de-prototipo.ts`) son DATOS que salieron de javac 17.0.18; esta
// prueba, con el JDK real (proyecto `oraculo`), vuelve a preguntárselas a javac, celda por celda (46 posiciones × 23 nombres = 1 058 programas, una
// sola JVM). La prueba de `compilar()` contra las MISMAS celdas (`pruebas/compilacion/tablas-de-prototipo.test.ts`, `npm test`, sin JDK) descansa
// en que estas respuestas sigan siendo ciertas: si otro JDK cambiara alguna, falla aquí antes de que el motor se calibre contra un dato viejo.
import { beforeAll, describe, expect, it } from 'vitest';
import {
  COMPILAN_EN_JAVAC,
  NOMBRES_DE_LA_MATRIZ,
  PLANTILLAS_DE_PROTOTIPO,
  programaDePrototipo,
} from '../../pruebas/compilacion/tablas-de-prototipo.ts';
import { compilarEnLote } from './compilar-en-lote.ts';
import { localizarJdk, verificarVersionJdk, type InfoJdk } from './jdk.ts';

let jdk: InfoJdk;
beforeAll(() => {
  jdk = localizarJdk();
  verificarVersionJdk(jdk);
});

describe('javac 17 real — la matriz de nombres de Object.prototype', () => {
  it('compila exactamente las celdas de COMPILAN_EN_JAVAC y rechaza las otras (1 058 programas)', async () => {
    const fuentes = PLANTILLAS_DE_PROTOTIPO.flatMap((plantilla) =>
      NOMBRES_DE_LA_MATRIZ.map((nombre) => ({ id: `${plantilla.id}|${nombre}`, fuente: programaDePrototipo(plantilla, nombre) })),
    );
    const respuestas = await compilarEnLote(jdk, fuentes);
    expect(respuestas.size).toBe(1058);
    const desacuerdos: string[] = [];
    for (const plantilla of PLANTILLAS_DE_PROTOTIPO) {
      const compilan = COMPILAN_EN_JAVAC.get(plantilla.id);
      for (const nombre of NOMBRES_DE_LA_MATRIZ) {
        const javac = respuestas.get(`${plantilla.id}|${nombre}`);
        const debeCompilar = compilan === 'todos' || (compilan !== undefined && compilan.includes(nombre));
        if (javac?.compila !== debeCompilar) {
          desacuerdos.push(`${plantilla.id} «${nombre}»: javac ${javac?.compila === true ? 'compila' : 'rechaza'}, la tabla dice ${debeCompilar ? 'compila' : 'rechaza'}`);
        }
      }
    }
    expect(desacuerdos).toEqual([]);
  }, 120_000);
});
