// La campaña del generador diferencial (tarea 1.31): genera programas, le pregunta a javac 17 (una JVM
// por lote, `CompiladorEnLote.java`) y a nuestro compilador, clasifica cada par de veredictos, REDUCE las
// discrepancias al programa mínimo que las conserva (cada candidato se vuelve a verificar con javac) y las
// agrupa en familias. Todo lo que toca el mundo exterior se inyecta (`nuestro`, el JDK), así que se prueba
// con compiladores falsos. Diseñada para que la tarea 2.21 la extienda a la EJECUCIÓN (salida y
// excepciones): bastará un oráculo y un veredicto por fase con la misma forma, sin rehacer el reductor ni
// el informe.
import { availableParallelism } from 'node:os';
import { compilarEnLote, type OpcionesDeCompilacionEnLote } from '../compilar-en-lote.ts';
import { VERSION_JDK_ESPERADA, type InfoJdk } from '../jdk.ts';
import {
  clasificar,
  claveDeNuestroVeredicto,
  type Clasificacion,
  type TipoDeDiscrepancia,
  type VeredictoJavac,
  type VeredictoNuestro,
} from './clasificador.ts';
import { agruparEnFamilias, identificarFamiliaConocida, type DiscrepanciaReducida, type FamiliaConocida, type Familia, type FaseDeJavac } from './familias.ts';
import { generarProgramas } from './generador.ts';
import { veredictoDeNuestroCompilador, type CompiladorNuestro } from './nuestro-compilador.ts';
import { renderizarPrograma, type Programa } from './programa.ts';
import { reducirEnRondas, type Conserva } from './reductor.ts';

// ---- El oráculo: javac, con caché y en paralelo ----

export interface Oraculo {
  /** El veredicto completo de javac de cada fuente (compila o el primer error). */
  veredictos(fuentes: readonly string[]): Promise<VeredictoJavac[]>;
  /** Solo el del análisis sintáctico (`--solo-sintaxis`). */
  veredictosDeSintaxis(fuentes: readonly string[]): Promise<VeredictoJavac[]>;
}

// Un lote más chico que esto no vale otra JVM (cada una tarda ≈ 0,4 s en arrancar).
const FUENTES_MINIMAS_POR_JVM = 1500;
const MAXIMO_DE_JVM_EN_PARALELO = 4;

async function compilarEnParalelo(jdk: InfoJdk, fuentes: readonly string[], opciones: OpcionesDeCompilacionEnLote): Promise<VeredictoJavac[]> {
  const jvm = Math.max(1, Math.min(MAXIMO_DE_JVM_EN_PARALELO, availableParallelism(), Math.ceil(fuentes.length / FUENTES_MINIMAS_POR_JVM)));
  const tamano = Math.ceil(fuentes.length / jvm);
  const trozos = Array.from({ length: jvm }, (_, i) => fuentes.slice(i * tamano, (i + 1) * tamano)).filter((trozo) => trozo.length > 0);
  const respuestas = await Promise.all(
    trozos.map((trozo) => compilarEnLote(jdk, trozo.map((fuente, i) => ({ id: `c${i}`, fuente })), opciones)),
  );
  return trozos.flatMap((trozo, t) =>
    trozo.map((_, i) => {
      const respuesta = respuestas[t]!.get(`c${i}`);
      if (respuesta === undefined) throw new Error(`CompiladorEnLote.java no devolvió veredicto para la fuente ${i} del lote ${t} (manifiesto y salida desalineados).`);
      return respuesta;
    }),
  );
}

export function crearOraculo(jdk: InfoJdk): Oraculo {
  const completo = new Map<string, VeredictoJavac>();
  const soloSintaxis = new Map<string, VeredictoJavac>();

  async function consultar(cache: Map<string, VeredictoJavac>, fuentes: readonly string[], opciones: OpcionesDeCompilacionEnLote): Promise<VeredictoJavac[]> {
    const pendientes = [...new Set(fuentes.filter((fuente) => !cache.has(fuente)))];
    if (pendientes.length > 0) {
      const respuestas = await compilarEnParalelo(jdk, pendientes, opciones);
      pendientes.forEach((fuente, i) => cache.set(fuente, respuestas[i]!));
    }
    return fuentes.map((fuente) => cache.get(fuente)!);
  }

  return {
    veredictos: (fuentes) => consultar(completo, fuentes, {}),
    veredictosDeSintaxis: (fuentes) => consultar(soloSintaxis, fuentes, { soloSintaxis: true }),
  };
}

// ---- Evaluar programas: javac contra nuestro compilador ----

export interface ProgramaEvaluado {
  /** Posición en la lista evaluada (en una campaña, el índice del programa; con la semilla se regenera). */
  readonly indice: number;
  readonly programa: Programa;
  readonly fuente: string;
  readonly javac: VeredictoJavac;
  readonly nuestro: VeredictoNuestro;
  readonly clasificacion: Clasificacion;
}

/** Nuestro compilador nunca detiene la campaña: una excepción es un `fallo-interno` más. */
function veredictoSeguro(nuestro: CompiladorNuestro, fuente: string): VeredictoNuestro {
  try {
    return nuestro(fuente);
  } catch (error) {
    return { tipo: 'fallo-interno', mensaje: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}

export async function evaluarProgramas(programas: readonly Programa[], oraculo: Oraculo, nuestro: CompiladorNuestro): Promise<ProgramaEvaluado[]> {
  const fuentes = programas.map(renderizarPrograma);
  const javac = await oraculo.veredictos(fuentes);
  return programas.map((programa, indice) => {
    const fuente = fuentes[indice]!;
    const suyo = veredictoSeguro(nuestro, fuente);
    return { indice, programa, fuente, javac: javac[indice]!, nuestro: suyo, clasificacion: clasificar(javac[indice]!, suyo) };
  });
}

// ---- Identidad de una discrepancia y reducción ----

/** Lo que hace «la misma» a una discrepancia mientras se reduce el programa. */
export interface IdentidadDeDiscrepancia {
  readonly tipo: TipoDeDiscrepancia;
  readonly codigoJavac: string;
  readonly mensajeJavac: string;
  readonly nuestraClave: string;
}

export function identidadDe(evaluado: ProgramaEvaluado): IdentidadDeDiscrepancia | null {
  const tipo = evaluado.clasificacion.discrepancia;
  if (tipo === null) return null;
  return { tipo, codigoJavac: evaluado.javac.codigoJavac, mensajeJavac: evaluado.javac.mensajeJavac, nuestraClave: claveDeNuestroVeredicto(evaluado.nuestro) };
}

export function tieneLaIdentidad(identidad: IdentidadDeDiscrepancia, javac: VeredictoJavac, nuestro: VeredictoNuestro): boolean {
  return (
    clasificar(javac, nuestro).discrepancia === identidad.tipo &&
    javac.codigoJavac === identidad.codigoJavac &&
    javac.mensajeJavac === identidad.mensajeJavac &&
    claveDeNuestroVeredicto(nuestro) === identidad.nuestraClave
  );
}

/**
 * Reduce cada discrepancia al programa mínimo que conserva su identidad, verificando cada candidato con
 * javac. Antes de molestar a javac se descarta lo que ya no coincide con lo que respondía nuestro
 * compilador (es barato); los veredictos de javac se guardan por fuente, así que un programa que sale de
 * varias reducciones se compila una sola vez. Devuelve los programas reducidos ya evaluados, en el mismo
 * orden y con el `indice` del programa original.
 */
export async function reducirDiscrepancias(discrepancias: readonly ProgramaEvaluado[], oraculo: Oraculo, nuestro: CompiladorNuestro): Promise<ProgramaEvaluado[]> {
  const identidades = discrepancias.map((d) => identidadDe(d)!);
  const suyos = new Map<string, VeredictoNuestro>();
  const suyoDe = (fuente: string): VeredictoNuestro => {
    const guardado = suyos.get(fuente);
    if (guardado !== undefined) return guardado;
    const veredicto = veredictoSeguro(nuestro, fuente);
    suyos.set(fuente, veredicto);
    return veredicto;
  };

  const conserva: Conserva = async (candidatos) => {
    const propios = candidatos.map((c) => suyoDe(c.fuente));
    const aVerificar = candidatos.flatMap((c, k) => (claveDeNuestroVeredicto(propios[k]!) === identidades[c.indice]!.nuestraClave ? [k] : []));
    const javac = await oraculo.veredictos(aVerificar.map((k) => candidatos[k]!.fuente));
    const sirve = candidatos.map(() => false);
    aVerificar.forEach((k, j) => {
      sirve[k] = tieneLaIdentidad(identidades[candidatos[k]!.indice]!, javac[j]!, propios[k]!);
    });
    return sirve;
  };

  const reducidos = await reducirEnRondas(discrepancias.map((d) => d.programa), conserva);
  const evaluados = await evaluarProgramas(reducidos, oraculo, nuestro);
  return evaluados.map((evaluado, i) => ({ ...evaluado, indice: discrepancias[i]!.indice }));
}

// ---- La campaña ----

export interface OpcionesDeCampana {
  readonly semilla: number;
  readonly cantidad: number;
  readonly jdk: InfoJdk;
  /** Por omisión, el `compilar()` real. En las pruebas, un compilador falso. */
  readonly nuestro?: CompiladorNuestro;
  /** Cuántas discrepancias (las de índice más bajo) se reducen; el resto solo se cuenta. */
  readonly maximoAReducir?: number;
  readonly avisar?: (mensaje: string) => void;
}

export const MAXIMO_A_REDUCIR_POR_OMISION = 2000;

export type FamiliaEnInforme = Familia & { readonly conocida: FamiliaConocida | null };

export interface InformeDeCampana {
  readonly version: 1;
  readonly semilla: number;
  readonly cantidad: number;
  /** La versión EXACTA del JDK contra el que se comparó (ADR 010/011). */
  readonly jdk: string;
  readonly programas: {
    readonly total: number;
    readonly javacCompila: number;
    readonly javacRechaza: number;
    readonly proporcionQueCompila: number;
  };
  /** Cuántas veces respondió nuestro compilador cada cosa (`ok`, `error:<código>`, `aviso:<código>`…). */
  readonly respuestasDeNuestroCompilador: Readonly<Record<string, number>>;
  /** Entre los programas que AMBOS rechazan con un error: ¿misma línea? Se reporta, no falla. */
  readonly coincidenciaDeLinea: {
    readonly comparables: number;
    readonly coinciden: number;
    readonly porcentaje: number;
  };
  readonly discrepancias: {
    readonly total: number;
    readonly falsosAceptos: number;
    readonly falsosRechazos: number;
    readonly fallosInternos: number;
    readonly reducidas: number;
    readonly sinReducir: number;
  };
  readonly familias: readonly FamiliaEnInforme[];
}

function redondear(valor: number, decimales: number): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

function faseDe(javac: VeredictoJavac, soloSintaxis: VeredictoJavac): FaseDeJavac {
  if (javac.compila) return 'javac-compila';
  return soloSintaxis.compila ? 'semantica' : 'sintaxis';
}

/** 0 si no hubo ninguna discrepancia; 1 si hubo cualquiera (la campaña es una compuerta de CI). */
export function codigoDeSalidaDe(informe: InformeDeCampana): 0 | 1 {
  return informe.discrepancias.total > 0 ? 1 : 0;
}

export async function ejecutarCampana(opciones: OpcionesDeCampana): Promise<InformeDeCampana> {
  const { semilla, cantidad, jdk } = opciones;
  const nuestro = opciones.nuestro ?? ((fuente) => veredictoDeNuestroCompilador(fuente));
  const maximoAReducir = opciones.maximoAReducir ?? MAXIMO_A_REDUCIR_POR_OMISION;
  const avisar = opciones.avisar ?? (() => undefined);
  const oraculo = crearOraculo(jdk);

  avisar(`Generando ${cantidad} programas (semilla ${semilla}) y compilándolos con javac ${VERSION_JDK_ESPERADA}…`);
  const evaluados = await evaluarProgramas(generarProgramas(semilla, cantidad), oraculo, nuestro);

  const javacCompila = evaluados.filter((e) => e.javac.compila).length;
  const respuestas = new Map<string, number>();
  for (const { nuestro: suyo } of evaluados) {
    const clave = claveDeNuestroVeredicto(suyo);
    respuestas.set(clave, (respuestas.get(clave) ?? 0) + 1);
  }
  const comparables = evaluados.filter((e) => e.clasificacion.lineaCoincide !== null);
  const coinciden = comparables.filter((e) => e.clasificacion.lineaCoincide === true).length;
  const discrepancias = evaluados.filter((e) => e.clasificacion.discrepancia !== null);
  const cuantas = (tipo: TipoDeDiscrepancia): number => discrepancias.filter((e) => e.clasificacion.discrepancia === tipo).length;

  const aReducir = discrepancias.slice(0, maximoAReducir);
  avisar(`${discrepancias.length} discrepancias; reduciendo ${aReducir.length}…`);
  const reducidas = aReducir.length === 0 ? [] : await reducirDiscrepancias(aReducir, oraculo, nuestro);
  const deSintaxis = reducidas.length === 0 ? [] : await oraculo.veredictosDeSintaxis(reducidas.map((r) => r.fuente));
  const reducidasConFase: DiscrepanciaReducida[] = reducidas.map((r, i) => ({
    indice: r.indice,
    tipo: r.clasificacion.discrepancia!,
    javac: r.javac,
    nuestro: r.nuestro,
    programa: r.programa,
    fase: faseDe(r.javac, deSintaxis[i]!),
  }));
  const familias = agruparEnFamilias(reducidasConFase).map((familia): FamiliaEnInforme => ({ ...familia, conocida: identificarFamiliaConocida(familia) }));

  return {
    version: 1,
    semilla,
    cantidad,
    jdk: VERSION_JDK_ESPERADA,
    programas: {
      total: evaluados.length,
      javacCompila,
      javacRechaza: evaluados.length - javacCompila,
      proporcionQueCompila: evaluados.length === 0 ? 0 : redondear(javacCompila / evaluados.length, 4),
    },
    respuestasDeNuestroCompilador: Object.fromEntries([...respuestas.entries()].sort(([a], [b]) => (a < b ? -1 : 1))),
    coincidenciaDeLinea: {
      comparables: comparables.length,
      coinciden,
      porcentaje: comparables.length === 0 ? 100 : redondear((100 * coinciden) / comparables.length, 2),
    },
    discrepancias: {
      total: discrepancias.length,
      falsosAceptos: cuantas('falso-acepto'),
      falsosRechazos: cuantas('falso-rechazo'),
      fallosInternos: cuantas('fallo-interno'),
      reducidas: aReducir.length,
      sinReducir: discrepancias.length - aReducir.length,
    },
    familias,
  };
}
