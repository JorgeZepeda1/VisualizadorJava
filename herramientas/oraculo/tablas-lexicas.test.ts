// Tarea 1.33: las tablas de verdad léxicas y sintácticas (`pruebas/compilacion/tablas-lexicas.ts`) son DATOS que salieron de javac 17.0.18; esta
// prueba, con el JDK real (proyecto `oraculo`), vuelve a preguntárselas a javac fila por fila — los literales que acepta y los que rechaza, las 54
// palabras reservadas y los 17 identificadores contextuales como nombre de variable (cinco contextos) y de clase, las formas de `yield` y las etiquetas
// `case` con flecha — y además compara javac con `compilar()` sobre miles de literales MUTADOS de esas tablas (fuzz con semilla fija). La prueba de
// `compilar()` contra las MISMAS tablas (`pruebas/compilacion/tablas-lexicas.test.ts`, `npm test`, sin JDK) descansa en que estas respuestas sigan
// siendo ciertas: si otro JDK cambiara alguna, falla aquí antes de que el motor se calibre contra un dato viejo.
import { beforeAll, describe, expect, it } from 'vitest';
import {
  CLAVE_DE_GUION_BAJO_ILEGAL,
  CONTEXTOS_DE_NOMBRE,
  ETIQUETAS_DE_CASE,
  FORMAS_DE_YIELD,
  IDENTIFICADORES_CONTEXTUALES,
  LINEA_DE_LA_CLASE,
  LINEA_DE_YIELD,
  LINEA_DEL_CASE,
  LINEA_DEL_LITERAL,
  LINEA_DEL_NOMBRE,
  LITERALES_ACEPTADOS,
  LITERALES_RECHAZADOS,
  NOMBRES_DE_CLASE_RESTRINGIDOS,
  PALABRAS_RESERVADAS_DE_JAVA,
  programaConCaseConFlecha,
  programaConClase,
  programaConLiteral,
  programaConNombre,
  programaConYield,
} from '../../pruebas/compilacion/tablas-lexicas.ts';
import { crearAzar, type Azar } from './generados/azar.ts';
import { clasificar } from './generados/clasificador.ts';
import { veredictoDeNuestroCompilador } from './generados/nuestro-compilador.ts';
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

describe('javac 17 real — la tabla de literales numéricos (N3, N4)', () => {
  it('acepta exactamente los literales aceptados de la tabla y rechaza los otros con la clave y la línea de la tabla', async () => {
    const fuentes = [
      ...LITERALES_ACEPTADOS.map((l) => ({ id: `acepta|${l.texto}`, fuente: programaConLiteral(l.texto) })),
      ...LITERALES_RECHAZADOS.map((l) => ({ id: `rechaza|${l.texto}`, fuente: programaConLiteral(l.texto) })),
    ];
    const respuestas = await respuestasDeJavac(fuentes);
    expect(respuestas.size).toBe(fuentes.length);
    const desacuerdos: string[] = [];
    for (const { texto } of LITERALES_ACEPTADOS) {
      const javac = respuestas.get(`acepta|${texto}`);
      if (javac?.compila !== true) desacuerdos.push(`${texto}: la tabla dice que javac lo acepta y dijo ${javac?.codigoJavac}`);
    }
    for (const { texto, codigoJavac } of LITERALES_RECHAZADOS) {
      const javac = respuestas.get(`rechaza|${texto}`);
      if (javac?.compila !== false || javac.codigoJavac !== codigoJavac || javac.linea !== LINEA_DEL_LITERAL) {
        desacuerdos.push(`${texto}: la tabla dice ${codigoJavac} en la línea ${LINEA_DEL_LITERAL} y javac dijo ${javac?.compila === true ? 'que compila' : `${javac?.codigoJavac} en la línea ${javac?.linea}`}`);
      }
    }
    expect(desacuerdos).toEqual([]);
  }, LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS);
});

describe('javac 17 real — las palabras reservadas y los identificadores contextuales como NOMBRE (V, N2)', () => {
  it('rechaza cada una de las 54 palabras reservadas y acepta cada uno de los 17 identificadores contextuales, como nombre de variable en los cinco contextos', async () => {
    const fuentes = CONTEXTOS_DE_NOMBRE.flatMap((contexto) =>
      [...PALABRAS_RESERVADAS_DE_JAVA, ...IDENTIFICADORES_CONTEXTUALES].map((nombre) => ({ id: `${contexto}|${nombre}`, fuente: programaConNombre(nombre, contexto) })),
    );
    const respuestas = await respuestasDeJavac(fuentes);
    expect(respuestas.size).toBe(CONTEXTOS_DE_NOMBRE.length * (54 + 17));
    const desacuerdos: string[] = [];
    for (const contexto of CONTEXTOS_DE_NOMBRE) {
      for (const nombre of PALABRAS_RESERVADAS_DE_JAVA) {
        const javac = respuestas.get(`${contexto}|${nombre}`);
        if (javac?.compila !== false || javac.linea !== LINEA_DEL_NOMBRE) desacuerdos.push(`${contexto} ${nombre}: javac debía rechazarla en la línea ${LINEA_DEL_NOMBRE} y dijo ${javac?.compila === true ? 'que compila' : `la línea ${javac?.linea}`}`);
      }
      for (const nombre of IDENTIFICADORES_CONTEXTUALES) {
        const javac = respuestas.get(`${contexto}|${nombre}`);
        if (javac?.compila !== true) desacuerdos.push(`${contexto} ${nombre}: javac debía aceptarlo y dijo ${javac?.codigoJavac}`);
      }
    }
    expect(desacuerdos).toEqual([]);
  }, LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS);

  it('como nombre de la CLASE rechaza las 54 reservadas y los 5 restringidos (`restricted.type.not.allowed`), y acepta los otros 12 contextuales', async () => {
    const nombres = [...PALABRAS_RESERVADAS_DE_JAVA, ...IDENTIFICADORES_CONTEXTUALES];
    const respuestas = await respuestasDeJavac(nombres.map((nombre) => ({ id: nombre, fuente: programaConClase(nombre) })));
    const desacuerdos: string[] = [];
    for (const nombre of PALABRAS_RESERVADAS_DE_JAVA) {
      const javac = respuestas.get(nombre);
      if (javac?.compila !== false || javac.linea !== LINEA_DE_LA_CLASE) desacuerdos.push(`${nombre}: debía rechazarla en la línea 1`);
    }
    for (const nombre of IDENTIFICADORES_CONTEXTUALES) {
      const javac = respuestas.get(nombre);
      if (NOMBRES_DE_CLASE_RESTRINGIDOS.includes(nombre)) {
        if (javac?.compila !== false || javac.codigoJavac !== 'compiler.err.restricted.type.not.allowed') desacuerdos.push(`${nombre}: debía ser restricted.type.not.allowed y javac dijo ${javac?.codigoJavac}`);
      } else if (javac?.compila !== true) {
        desacuerdos.push(`${nombre}: javac debía aceptarlo como clase y dijo ${javac?.codigoJavac}`);
      }
    }
    expect(desacuerdos).toEqual([]);
  }, LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS);
});

describe('javac 17 real — `yield`: la sentencia o una variable llamada `yield` (V)', () => {
  it('cada forma de la tabla se comporta como dice: una variable compila (o falla por su tipo), la sentencia falla con `yield outside of switch expression`', async () => {
    const respuestas = await respuestasDeJavac(FORMAS_DE_YIELD.map((f) => ({ id: f.cuerpo, fuente: programaConYield(f.cuerpo) })));
    expect(respuestas.size).toBe(FORMAS_DE_YIELD.length);
    const desacuerdos: string[] = [];
    for (const { cuerpo, codigoJavac } of FORMAS_DE_YIELD) {
      const javac = respuestas.get(cuerpo);
      if (codigoJavac === null) {
        if (javac?.compila !== true) desacuerdos.push(`${cuerpo}: debía compilar y javac dijo ${javac?.codigoJavac}`);
      } else if (javac?.compila !== false || javac.codigoJavac !== codigoJavac || javac.linea !== LINEA_DE_YIELD) {
        desacuerdos.push(`${cuerpo}: la tabla dice ${codigoJavac} en la línea ${LINEA_DE_YIELD} y javac dijo ${javac?.compila === true ? 'que compila' : `${javac?.codigoJavac} en la línea ${javac?.linea}`}`);
      }
    }
    expect(desacuerdos).toEqual([]);
  }, LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS);
});

describe('javac 17 real — `case` con flecha (N4)', () => {
  it('cada etiqueta de la tabla compila o falla con la clave de la tabla, en la línea de la etiqueta', async () => {
    const respuestas = await respuestasDeJavac(ETIQUETAS_DE_CASE.map((e) => ({ id: e.etiqueta, fuente: programaConCaseConFlecha(e.etiqueta) })));
    expect(respuestas.size).toBe(ETIQUETAS_DE_CASE.length);
    const desacuerdos: string[] = [];
    for (const { etiqueta, codigoJavac } of ETIQUETAS_DE_CASE) {
      const javac = respuestas.get(etiqueta);
      if (codigoJavac === null) {
        if (javac?.compila !== true) desacuerdos.push(`case ${etiqueta} ->: debía compilar y javac dijo ${javac?.codigoJavac}`);
      } else if (javac?.compila !== false || javac.codigoJavac !== codigoJavac || javac.linea !== LINEA_DEL_CASE) {
        desacuerdos.push(`case ${etiqueta} ->: la tabla dice ${codigoJavac} en la línea ${LINEA_DEL_CASE} y javac dijo ${javac?.compila === true ? 'que compila' : `${javac?.codigoJavac} en la línea ${javac?.linea}`}`);
      }
    }
    expect(desacuerdos).toEqual([]);
  }, LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS);
});

// ---- Fuzz por mutación de literales: javac contra `compilar()` ----
//
// Cada candidato es una de las formas de las tablas con una a tres mutaciones de un carácter (insertar, borrar, cambiar o repetir uno de
// `0-9 a-f A-F _ . e E p P + - x X b B l L f F d D`), dentro de `double x = <candidato>;`. Los criterios son los de la campaña del generador diferencial
// (`clasificar`): ningún falso rechazo (javac compila y `compilar()` da error), ningún falso acepto (javac rechaza y `compilar()` da `ok` o
// `ejecucion-no-disponible`; un aviso NO lo es) y, si los dos rechazan con un error, la misma línea. Además: cuando el primer error de javac es el guion
// bajo mal puesto, el nuestro también lo es. El recíproco no se exige: javac lee los tokens de a uno, así que un `;` que falta ANTES de un guion bajo
// mal puesto se le reporta primero; nuestro léxico recorre el texto entero antes de la sintaxis (la misma línea, otro código).
const ALFABETO_DEL_FUZZ = [...'0123456789abcdefABCDEF_.eEpP+-xXbBlLfFdD'];

function mutar(texto: string, azar: Azar): string {
  let resultado = texto;
  const mutaciones = 1 + azar.entero(3);
  for (let i = 0; i < mutaciones; i += 1) {
    const operacion = azar.entero(4);
    const posicion = azar.entero(resultado.length + 1);
    const ultima = Math.max(0, resultado.length - 1);
    if (operacion === 0) resultado = resultado.slice(0, posicion) + azar.elegir(ALFABETO_DEL_FUZZ) + resultado.slice(posicion);
    else if (operacion === 1 && resultado.length > 1) resultado = resultado.slice(0, Math.min(posicion, ultima)) + resultado.slice(Math.min(posicion, ultima) + 1);
    else if (operacion === 2 && resultado.length > 0) resultado = resultado.slice(0, Math.min(posicion, ultima)) + azar.elegir(ALFABETO_DEL_FUZZ) + resultado.slice(Math.min(posicion, ultima) + 1);
    else if (resultado.length > 0) resultado = resultado.slice(0, Math.min(posicion, ultima)) + resultado[Math.min(posicion, ultima)]! + resultado.slice(Math.min(posicion, ultima));
  }
  return resultado;
}

describe('fuzz — javac 17 real contra compilar() sobre literales numéricos mutados (N3, N4)', () => {
  const SEMILLA = 20260929;
  const CANTIDAD = 6000;

  it(`${CANTIDAD} literales mutados (semilla ${SEMILLA}): ninguna discrepancia, y el fuzz de verdad ejerce el guion bajo, los hexadecimales flotantes y los rechazos`, async () => {
    const azar = crearAzar(SEMILLA);
    const semillas = [...LITERALES_ACEPTADOS.map((l) => l.texto), ...LITERALES_RECHAZADOS.map((l) => l.texto)];
    const candidatos = new Set<string>(semillas);
    for (let intentos = 0; candidatos.size < CANTIDAD && intentos < CANTIDAD * 20; intentos += 1) candidatos.add(mutar(azar.elegir(semillas), azar));
    const lista = [...candidatos].filter((c) => c.length > 0);
    const respuestas = await respuestasDeJavac(lista.map((candidato, indice) => ({ id: String(indice), fuente: programaConLiteral(candidato) })));

    const discrepancias: string[] = [];
    let javacCompila = 0;
    let conGuionBajoIlegal = 0;
    let hexadecimalesFlotantes = 0;
    for (const [indice, candidato] of lista.entries()) {
      const javac = respuestas.get(String(indice));
      if (javac === undefined) throw new Error(`javac no respondió por «${candidato}»`);
      if (javac.compila) javacCompila += 1;
      if (javac.codigoJavac === CLAVE_DE_GUION_BAJO_ILEGAL) conGuionBajoIlegal += 1;
      if (javac.compila && /^0[xX].*[pP]/.test(candidato)) hexadecimalesFlotantes += 1;
      const nuestro = veredictoDeNuestroCompilador(programaConLiteral(candidato));
      const clasificacion = clasificar(javac, nuestro);
      if (clasificacion.discrepancia !== null) {
        discrepancias.push(`«${candidato}»: ${clasificacion.discrepancia} (javac ${javac.compila ? 'compila' : javac.codigoJavac}, nosotros ${nuestro.tipo})`);
      } else if (clasificacion.lineaCoincide === false) {
        discrepancias.push(`«${candidato}»: otra línea (javac ${javac.linea})`);
      } else if (javac.codigoJavac === CLAVE_DE_GUION_BAJO_ILEGAL && !(nuestro.tipo === 'error-compilacion' && nuestro.codigo === 'guion-bajo-mal-puesto')) {
        discrepancias.push(`«${candidato}»: javac dice guion bajo mal puesto y nosotros ${nuestro.tipo}`);
      }
    }
    expect(discrepancias).toEqual([]);
    // El fuzz de verdad ejerce lo que dice (una campaña vacía «coincidiría» con cualquier motor).
    expect(lista.length).toBeGreaterThan(CANTIDAD * 0.9);
    expect(javacCompila).toBeGreaterThan(300);
    expect(lista.length - javacCompila).toBeGreaterThan(1000);
    expect(conGuionBajoIlegal).toBeGreaterThan(200);
    expect(hexadecimalesFlotantes).toBeGreaterThan(20);
  }, LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS);
});
