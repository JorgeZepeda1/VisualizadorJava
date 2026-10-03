// Tarea 1.32: las tablas de verdad de atribución (`pruebas/compilacion/tablas-de-atribucion.ts`) son DATOS que salieron de javac 17.0.18;
// esta prueba, con el JDK real (proyecto `oraculo`), vuelve a preguntárselas a javac, celda por celda: los 64 pares (origen, destino) de un
// cast, las 39 celdas selector × etiqueta de un `switch` y los tres selectores que javac rechaza él mismo. La prueba de `compilar()`
// contra las MISMAS tablas (`pruebas/compilacion/tablas-de-atribucion.test.ts`, `npm test`, sin JDK) descansa en que estas respuestas
// sigan siendo ciertas: si otro JDK cambiara alguna, falla aquí antes de que el motor se calibre contra un dato viejo.
import { beforeAll, describe, expect, it } from 'vitest';
import {
  CASTS_QUE_JAVAC_ACEPTA,
  CELDAS_DE_SWITCH,
  ETIQUETAS_QUE_JAVAC_ACEPTA,
  LINEA_DE_LA_ETIQUETA,
  LINEA_DEL_CAST,
  PARES_DE_CAST,
  SELECTORES_DE_SWITCH,
  SELECTORES_INVALIDOS_DE_SWITCH,
  programaDeCast,
  programaDeSwitch,
} from '../../pruebas/compilacion/tablas-de-atribucion.ts';
import { compilarEnLote, type FuenteParaCompilar, type RespuestaJava } from './compilar-en-lote.ts';
import { localizarJdk, verificarVersionJdk, type InfoJdk } from './jdk.ts';
import { LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS } from './limites-de-pruebas.ts';

let jdk: InfoJdk;
beforeAll(() => {
  jdk = localizarJdk();
  verificarVersionJdk(jdk);
});

async function respuestasDeJavac(fuentes: readonly FuenteParaCompilar[]): Promise<Map<string, RespuestaJava>> {
  return compilarEnLote(jdk, fuentes);
}

describe('javac 17 real — la tabla de casts (F1)', () => {
  it('acepta exactamente los 20 pares de la tabla y rechaza los otros 44 con `prob.found.req` en la línea del cast', async () => {
    const respuestas = await respuestasDeJavac(PARES_DE_CAST.map(([o, d]) => ({ id: `${o}>${d}`, fuente: programaDeCast(o, d) })));
    expect(respuestas.size).toBe(64);
    const desacuerdos: string[] = [];
    for (const [o, d] of PARES_DE_CAST) {
      const clave = `${o}>${d}`;
      const javac = respuestas.get(clave);
      const debeCompilar = CASTS_QUE_JAVAC_ACEPTA.has(clave);
      if (javac?.compila !== debeCompilar) desacuerdos.push(`${clave}: javac ${javac?.compila === true ? 'compila' : 'rechaza'}, la tabla dice ${debeCompilar ? 'compila' : 'rechaza'}`);
      else if (!debeCompilar && (javac?.codigoJavac !== 'compiler.err.prob.found.req' || javac.linea !== LINEA_DEL_CAST)) {
        desacuerdos.push(`${clave}: ${javac?.codigoJavac} en la línea ${javac?.linea}`);
      }
    }
    expect(desacuerdos).toEqual([]);
  }, LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS);
});

describe('javac 17 real — la tabla de etiquetas de `switch` (F4)', () => {
  it('acepta exactamente las 16 celdas de la tabla y rechaza las otras 23 con `prob.found.req` en la línea de la etiqueta', async () => {
    const respuestas = await respuestasDeJavac(
      CELDAS_DE_SWITCH.map(([s, e]) => ({ id: `${s}>${e}`, fuente: programaDeSwitch(s, SELECTORES_DE_SWITCH[s], e) })),
    );
    expect(respuestas.size).toBe(39);
    const desacuerdos: string[] = [];
    for (const [s, e] of CELDAS_DE_SWITCH) {
      const clave = `${s}>${e}`;
      const javac = respuestas.get(clave);
      const debeCompilar = ETIQUETAS_QUE_JAVAC_ACEPTA.has(clave);
      if (javac?.compila !== debeCompilar) desacuerdos.push(`${clave}: javac ${javac?.compila === true ? 'compila' : 'rechaza'}, la tabla dice ${debeCompilar ? 'compila' : 'rechaza'}`);
      else if (!debeCompilar && (javac?.codigoJavac !== 'compiler.err.prob.found.req' || javac.linea !== LINEA_DE_LA_ETIQUETA)) {
        desacuerdos.push(`${clave}: ${javac?.codigoJavac} en la línea ${javac?.linea}`);
      }
    }
    expect(desacuerdos).toEqual([]);
  }, LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS);

  it('un selector long, double o boolean lo rechaza javac él mismo (`preview.feature.disabled.plural`), con cualquier etiqueta', async () => {
    const fuentes = SELECTORES_INVALIDOS_DE_SWITCH.flatMap(([tipo, valor]) =>
      ['1', '"x"', 'true'].map((etiqueta) => ({ id: `${tipo}>${etiqueta}`, fuente: programaDeSwitch(tipo, valor, etiqueta) })),
    );
    const respuestas = await respuestasDeJavac(fuentes);
    for (const { id } of fuentes) {
      expect(respuestas.get(id), id).toMatchObject({ compila: false, codigoJavac: 'compiler.err.preview.feature.disabled.plural' });
    }
  }, LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS);
});
