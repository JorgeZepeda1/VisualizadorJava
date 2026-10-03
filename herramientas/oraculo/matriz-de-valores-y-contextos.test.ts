// Tarea 1.34: la matriz valor × contexto (`pruebas/compilacion/tablas-de-valor-y-contexto.ts`, 40 × 81 = 3 240 programas) son DATOS que salieron de javac 17.0.18; esta prueba, con
// el JDK real (proyecto `oraculo`), vuelve a preguntárselas a javac, celda por celda (una sola JVM), y además compara contra `compilar()` con la MISMA regla que usa el generador
// diferencial (`clasificar`): sin falsos aceptos, sin falsos rechazos y sin fallos internos, y cuando los dos rechazan con un error, en la misma línea. La prueba de `compilar()` contra las
// mismas celdas SIN JDK (`pruebas/compilacion/matriz-de-valores-y-contextos.test.ts`, `npm test`) descansa en que estas respuestas sigan siendo ciertas: si otro JDK cambiara alguna,
// falla aquí antes de que el motor se calibre contra un dato viejo.
//
// Para REGENERAR la tabla (por ejemplo al agregar un valor o un contexto): se deja `COMPILA_EN_JAVAC_POR_VALOR` vacío (`[]`), se corre esta prueba, que falla imprimiendo las filas nuevas
// con el formato de la tabla, y se pegan en el archivo de datos.
import { beforeAll, describe, expect, it } from 'vitest';
import {
  COMPILA_EN_JAVAC_POR_VALOR,
  CONTEXTOS_DE_LA_MATRIZ,
  LINEA_DEL_CONTEXTO_EN_LA_MATRIZ,
  VALORES_DE_LA_MATRIZ,
  programaDeLaMatriz,
} from '../../pruebas/compilacion/tablas-de-valor-y-contexto.ts';
import { compilarEnLote, type RespuestaJava } from './compilar-en-lote.ts';
import { clasificar } from './generados/clasificador.ts';
import { veredictoDeNuestroCompilador } from './generados/nuestro-compilador.ts';
import { localizarJdk, verificarVersionJdk } from './jdk.ts';

let respuestas: Map<string, RespuestaJava>;

beforeAll(async () => {
  const jdk = localizarJdk();
  verificarVersionJdk(jdk);
  const fuentes = VALORES_DE_LA_MATRIZ.flatMap((valor, i) => CONTEXTOS_DE_LA_MATRIZ.map((contexto, j) => ({ id: `${i}-${j}`, fuente: programaDeLaMatriz(valor, contexto) })));
  respuestas = await compilarEnLote(jdk, fuentes);
}, 120_000);

describe('javac 17 real — la matriz valor × contexto', () => {
  it('compila exactamente las celdas de COMPILA_EN_JAVAC_POR_VALOR y rechaza las otras (3 240 programas)', () => {
    expect(respuestas.size).toBe(VALORES_DE_LA_MATRIZ.length * CONTEXTOS_DE_LA_MATRIZ.length);
    const filasReales = VALORES_DE_LA_MATRIZ.map((_, i) => CONTEXTOS_DE_LA_MATRIZ.map((__, j) => (respuestas.get(`${i}-${j}`)?.compila === true ? '1' : '0')).join(''));
    const desacuerdos: string[] = [];
    filasReales.forEach((fila, i) => {
      const guardada = COMPILA_EN_JAVAC_POR_VALOR[i];
      if (guardada === fila) return;
      for (let j = 0; j < fila.length; j += 1) {
        if (guardada?.[j] !== fila[j]) desacuerdos.push(`«${VALORES_DE_LA_MATRIZ[i]}» en «${CONTEXTOS_DE_LA_MATRIZ[j]}»: javac ${fila[j] === '1' ? 'compila' : 'rechaza'}, la tabla dice ${guardada?.[j] === '1' ? 'compila' : 'rechaza'}`);
      }
    });
    // Si la tabla está vacía o desalineada, se imprimen las filas reales con el formato del archivo de datos.
    expect(desacuerdos, `filas reales:\n${filasReales.map((fila, i) => `  '${fila}', // ${VALORES_DE_LA_MATRIZ[i]}`).join('\n')}`).toEqual([]);
  });

  it('compilar() coincide con javac en las 3 240 celdas: ni falsos aceptos, ni falsos rechazos, ni fallos internos; y la misma línea cuando los dos rechazan con un error', () => {
    const discrepancias: string[] = [];
    let comparables = 0;
    let lineasQueCoinciden = 0;
    VALORES_DE_LA_MATRIZ.forEach((valor, i) => {
      CONTEXTOS_DE_LA_MATRIZ.forEach((contexto, j) => {
        const javac = respuestas.get(`${i}-${j}`)!;
        const nuestro = veredictoDeNuestroCompilador(programaDeLaMatriz(valor, contexto));
        const clasificacion = clasificar(javac, nuestro);
        if (clasificacion.discrepancia !== null) discrepancias.push(`${clasificacion.discrepancia}: «${valor}» en «${contexto}» — javac ${javac.compila ? 'compila' : `rechaza (${javac.codigoJavac})`}, nuestro ${JSON.stringify(nuestro)}`);
        if (clasificacion.lineaCoincide !== null) {
          comparables += 1;
          if (clasificacion.lineaCoincide) lineasQueCoinciden += 1;
          else discrepancias.push(`línea distinta: «${valor}» en «${contexto}» — javac L${javac.linea}, nuestro ${JSON.stringify(nuestro)}`);
        }
      });
    });
    expect(discrepancias).toEqual([]);
    expect(comparables, 'hay celdas donde los dos rechazan con un error').toBeGreaterThan(1000);
    expect(lineasQueCoinciden).toBe(comparables);
    expect(LINEA_DEL_CONTEXTO_EN_LA_MATRIZ).toBe(6);
  });
});
