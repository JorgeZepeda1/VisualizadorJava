// RED de la tarea 1.31: la campaña completa (generar → javac → nuestro compilador → clasificar →
// reducir → familias → informe), con JDK real (proyecto `oraculo`). Se prueba con compiladores FALSOS
// inyectados —uno que acepta todo, otro que rechaza todo y un espejo que responde exactamente lo que
// javac— para que las pruebas sigan valiendo cuando la tarea 1.32 corrija el compilador real: no dependen
// de que `compilar()` tenga discrepancias hoy ni de que no las tenga después.
//
// Lo que más importa: el REDUCTOR conserva la discrepancia y deja un mínimo local. Se verifica aquí, por
// fuera del propio reductor, volviendo a preguntarle a javac por el programa reducido y por cada uno de
// sus candidatos de reducción.
import { beforeAll, describe, expect, it } from 'vitest';
import { compilarEnLote } from '../compilar-en-lote.ts';
import { localizarJdk, verificarVersionJdk, VERSION_JDK_ESPERADA, type InfoJdk } from '../jdk.ts';
import {
  codigoDeSalidaDe,
  crearOraculo,
  ejecutarCampana,
  evaluarProgramas,
  identidadDe,
  reducirDiscrepancias,
  tieneLaIdentidad,
  type InformeDeCampana,
  type Oraculo,
} from './campana.ts';
import { claveDeNuestroVeredicto, type VeredictoNuestro } from './clasificador.ts';
import { generarPrograma, generarProgramas } from './generador.ts';
import { renderizarPrograma } from './programa.ts';
import { variantesDeExpresiones, variantesDeSentencias } from './reductor.ts';

const SEMILLA = 20260929;
const CANTIDAD = 240;
const MAXIMO_A_REDUCIR = 10;

const ACEPTA_TODO = (): VeredictoNuestro => ({ tipo: 'ok' });
const RECHAZA_TODO = (): VeredictoNuestro => ({ tipo: 'error-compilacion', codigo: 'error-no-clasificado', linea: 1 });

let jdk: InfoJdk;
let oraculo: Oraculo;
let aceptaTodo: InformeDeCampana;
let rechazaTodo: InformeDeCampana;
let espejo: InformeDeCampana;

beforeAll(async () => {
  jdk = localizarJdk();
  verificarVersionJdk(jdk);
  oraculo = crearOraculo(jdk);

  aceptaTodo = await ejecutarCampana({ semilla: SEMILLA, cantidad: CANTIDAD, jdk, nuestro: ACEPTA_TODO, maximoAReducir: MAXIMO_A_REDUCIR });
  rechazaTodo = await ejecutarCampana({ semilla: SEMILLA, cantidad: CANTIDAD, jdk, nuestro: RECHAZA_TODO, maximoAReducir: MAXIMO_A_REDUCIR });

  // El espejo responde, para cada fuente, exactamente lo que dijo javac.
  const fuentes = generarProgramas(SEMILLA, CANTIDAD).map(renderizarPrograma);
  const respuestas = await compilarEnLote(jdk, fuentes.map((fuente, i) => ({ id: `e${i}`, fuente })));
  const porFuente = new Map(fuentes.map((fuente, i) => [fuente, respuestas.get(`e${i}`)!]));
  espejo = await ejecutarCampana({
    semilla: SEMILLA,
    cantidad: CANTIDAD,
    jdk,
    nuestro: (fuente) => {
      const javac = porFuente.get(fuente)!;
      return javac.compila ? { tipo: 'ok' } : { tipo: 'error-compilacion', codigo: 'espejo', linea: javac.linea };
    },
    maximoAReducir: MAXIMO_A_REDUCIR,
  });
}, 300_000);

describe('el informe de la campaña', () => {
  it('describe la campaña: semilla, cantidad, versión exacta del JDK y la mezcla de veredictos de javac', () => {
    expect(aceptaTodo).toMatchObject({ version: 1, semilla: SEMILLA, cantidad: CANTIDAD, jdk: VERSION_JDK_ESPERADA });
    expect(aceptaTodo.programas.javacCompila + aceptaTodo.programas.javacRechaza).toBe(CANTIDAD);
    expect(aceptaTodo.programas.javacCompila).toBeGreaterThan(CANTIDAD * 0.3);
    expect(aceptaTodo.programas.javacRechaza).toBeGreaterThan(CANTIDAD * 0.3);
    expect(aceptaTodo.programas.proporcionQueCompila).toBeCloseTo(aceptaTodo.programas.javacCompila / CANTIDAD, 3);
  });

  it('cuenta lo que respondió nuestro compilador por clave (aquí: todo ok)', () => {
    expect(aceptaTodo.respuestasDeNuestroCompilador).toEqual({ ok: CANTIDAD });
  });

  it('es reproducible: la misma semilla y cantidad producen EXACTAMENTE el mismo informe', async () => {
    const otra = await ejecutarCampana({ semilla: SEMILLA, cantidad: CANTIDAD, jdk, nuestro: ACEPTA_TODO, maximoAReducir: MAXIMO_A_REDUCIR });
    expect(JSON.stringify(otra)).toBe(JSON.stringify(aceptaTodo));
  }, 120_000);

  it('otra semilla produce otra campaña', async () => {
    const otra = await ejecutarCampana({ semilla: SEMILLA + 1, cantidad: 60, jdk, nuestro: ACEPTA_TODO, maximoAReducir: 1 });
    expect(otra.semilla).toBe(SEMILLA + 1);
    expect(otra.cantidad).toBe(60);
  }, 120_000);
});

describe('con un compilador falso que ACEPTA todo', () => {
  it('cada programa que javac rechaza es un falso acepto, y no hay falsos rechazos ni fallos internos', () => {
    expect(aceptaTodo.discrepancias.falsosAceptos).toBe(aceptaTodo.programas.javacRechaza);
    expect(aceptaTodo.discrepancias.falsosRechazos).toBe(0);
    expect(aceptaTodo.discrepancias.fallosInternos).toBe(0);
    expect(aceptaTodo.discrepancias.total).toBe(aceptaTodo.programas.javacRechaza);
  });

  it('sale con código distinto de cero', () => {
    expect(codigoDeSalidaDe(aceptaTodo)).toBe(1);
  });

  it('reduce solo hasta el tope pedido y cuenta el resto como sin reducir', () => {
    expect(aceptaTodo.discrepancias.reducidas).toBe(MAXIMO_A_REDUCIR);
    expect(aceptaTodo.discrepancias.sinReducir).toBe(aceptaTodo.discrepancias.total - MAXIMO_A_REDUCIR);
    expect(aceptaTodo.familias.reduce((suma, familia) => suma + familia.cantidad, 0)).toBe(MAXIMO_A_REDUCIR);
  });

  it('el programa mínimo de cada familia sigue rechazado por javac, con la misma clave y el mismo mensaje', async () => {
    expect(aceptaTodo.familias.length).toBeGreaterThan(0);
    const respuestas = await compilarEnLote(jdk, aceptaTodo.familias.map((familia, i) => ({ id: `m${i}`, fuente: familia.minimo.fuente })));
    aceptaTodo.familias.forEach((familia, i) => {
      const javac = respuestas.get(`m${i}`)!;
      expect(javac.compila, `el mínimo de «${familia.clave}» debe seguir rechazado`).toBe(false);
      expect(javac.codigoJavac).toBe(familia.codigoJavac);
      expect(javac.mensajeJavac).toBe(familia.mensajeJavac);
    });
  });

  it('cada programa mínimo no es más largo que el original del que salió, y en conjunto son mucho más cortos', () => {
    const largos = aceptaTodo.familias.map((familia) => ({
      minimo: familia.minimo.fuente.length,
      original: renderizarPrograma(generarPrograma(SEMILLA, familia.indicesDeEjemplo[0]!)).length,
    }));
    for (const { minimo, original } of largos) expect(minimo).toBeLessThanOrEqual(original);
    expect(largos.reduce((s, l) => s + l.minimo, 0)).toBeLessThan(largos.reduce((s, l) => s + l.original, 0) * 0.7);
  });

  it('cada familia trae la clave de javac, el mensaje real y el programa mínimo con su cuerpo', () => {
    for (const familia of aceptaTodo.familias) {
      expect(familia.tipo).toBe('falso-acepto');
      expect(familia.codigoJavac).toMatch(/^compiler\.err\./);
      expect(familia.mensajeJavac.length).toBeGreaterThan(0);
      expect(familia.minimo.cuerpo.length).toBeGreaterThan(0);
      expect(familia.nuestraClave).toBe('ok');
      expect(['sintaxis', 'semantica']).toContain(familia.fase);
    }
  });
});

describe('el reductor, verificado contra javac por fuera de su propio bucle', () => {
  it('conserva la discrepancia Y deja un mínimo local: ningún candidato de reducción de un paso la conserva', async () => {
    const evaluados = await evaluarProgramas(generarProgramas(SEMILLA, 160), oraculo, ACEPTA_TODO);
    const discrepancias = evaluados.filter((e) => e.clasificacion.discrepancia !== null).slice(0, 8);
    expect(discrepancias.length).toBeGreaterThanOrEqual(6);
    const reducidos = await reducirDiscrepancias(discrepancias, oraculo, ACEPTA_TODO);

    for (let i = 0; i < discrepancias.length; i += 1) {
      const identidad = identidadDe(discrepancias[i]!)!;
      const original = discrepancias[i]!;
      const reducido = reducidos[i]!;
      expect(tieneLaIdentidad(identidad, reducido.javac, reducido.nuestro), `el reducido ${i} conserva la identidad`).toBe(true);
      // La misma comprobación, escrita aparte (sin `tieneLaIdentidad`): javac dice lo MISMO del programa reducido
      // que del original —misma clave y mismo mensaje— y nuestro compilador también.
      expect({ tipo: reducido.clasificacion.discrepancia, codigo: reducido.javac.codigoJavac, mensaje: reducido.javac.mensajeJavac, nuestro: claveDeNuestroVeredicto(reducido.nuestro) }, `el reducido ${i} dice lo mismo que el original`).toEqual({
        tipo: original.clasificacion.discrepancia,
        codigo: original.javac.codigoJavac,
        mensaje: original.javac.mensajeJavac,
        nuestro: claveDeNuestroVeredicto(original.nuestro),
      });
      expect(reducido.fuente.length).toBeLessThanOrEqual(discrepancias[i]!.fuente.length);

      const candidatos = [...variantesDeSentencias(reducido.programa), ...variantesDeExpresiones(reducido.programa)];
      const evaluadosDeLosCandidatos = await evaluarProgramas(candidatos, oraculo, ACEPTA_TODO);
      const quePreservan = evaluadosDeLosCandidatos.filter((c) => tieneLaIdentidad(identidad, c.javac, c.nuestro)).map((c) => c.fuente);
      expect(quePreservan, `el reducido ${i} es un mínimo local`).toEqual([]);
    }
  }, 180_000);
});

describe('con un compilador falso que RECHAZA todo', () => {
  it('cada programa que javac compila es un falso rechazo, y no hay falsos aceptos', () => {
    expect(rechazaTodo.discrepancias.falsosRechazos).toBe(rechazaTodo.programas.javacCompila);
    expect(rechazaTodo.discrepancias.falsosAceptos).toBe(0);
    expect(codigoDeSalidaDe(rechazaTodo)).toBe(1);
  });

  it('el programa mínimo de cada familia de falso rechazo sigue COMPILANDO con javac', async () => {
    expect(rechazaTodo.familias.length).toBeGreaterThan(0);
    const respuestas = await compilarEnLote(jdk, rechazaTodo.familias.map((familia, i) => ({ id: `r${i}`, fuente: familia.minimo.fuente })));
    rechazaTodo.familias.forEach((familia, i) => {
      expect(familia.tipo).toBe('falso-rechazo');
      expect(respuestas.get(`r${i}`)?.compila, familia.clave).toBe(true);
    });
  });

  it('cuando ambos rechazan reporta el porcentaje de coincidencia de línea (con este falso, la línea 1 casi nunca coincide)', () => {
    expect(rechazaTodo.coincidenciaDeLinea.comparables).toBe(rechazaTodo.programas.javacRechaza);
    expect(rechazaTodo.coincidenciaDeLinea.porcentaje).toBeLessThan(10);
  });
});

describe('con un compilador espejo (responde exactamente lo que javac)', () => {
  it('no hay ninguna discrepancia, ninguna familia y la coincidencia de línea es del 100 %', () => {
    expect(espejo.discrepancias).toMatchObject({ total: 0, falsosAceptos: 0, falsosRechazos: 0, fallosInternos: 0, reducidas: 0, sinReducir: 0 });
    expect(espejo.familias).toEqual([]);
    expect(espejo.coincidenciaDeLinea).toMatchObject({ porcentaje: 100 });
  });

  it('sale con código cero', () => {
    expect(codigoDeSalidaDe(espejo)).toBe(0);
  });
});

describe('cuando el compilador lanza una excepción', () => {
  it('cuenta un fallo interno por programa y la campaña sigue (nunca se detiene)', async () => {
    const informe = await ejecutarCampana({
      semilla: SEMILLA,
      cantidad: 80,
      jdk,
      nuestro: (fuente) => {
        if (fuente.includes('switch')) throw new RangeError('Maximum call stack size exceeded');
        return { tipo: 'ok' };
      },
      maximoAReducir: 2,
    });
    expect(informe.discrepancias.fallosInternos).toBeGreaterThan(0);
    expect(Object.keys(informe.respuestasDeNuestroCompilador).some((clave) => clave.startsWith('fallo-interno'))).toBe(true);
    expect(codigoDeSalidaDe(informe)).toBe(1);
  }, 120_000);
});
