// Ayudas SOLO para las pruebas del intérprete (no entran al producto: nadie las importa fuera de `*.test.ts`). Compilan un fragmento de `main`,
// lo ejecutan con el director y devuelven lo que las pruebas comparan: la salida, los pasos y cómo terminó.
import { compilar } from '../compilador.ts';
import type { FinEjecucion, Paso } from '../traza/paso.ts';
import { crearEjecucion, type Avance, type ConfigEjecucion, type Ejecucion } from './ejecucion.ts';
import { PUERTO_VACIO, type PuertoBiblioteca } from './puerto-biblioteca.ts';

export function configuracion(cambios: Partial<ConfigEjecucion> = {}): ConfigEjecucion {
  return {
    regional: 'es-MX',
    semilla: 0n,
    entradaPreparada: '',
    entradaInteractiva: false,
    limitePasos: 100_000,
    limiteCaracteres: 1_048_576,
    ...cambios,
  };
}

export const PREFIJO = 'public class MiPrograma {\n  public static void main(String[] args) {\n';
export const SUFIJO = '\n  }\n}\n';

/** Un programa completo cuyo `main` es `cuerpo` (la primera línea del cuerpo es la 3). */
export function programaDe(cuerpo: string): string {
  return `${PREFIJO}${cuerpo}${SUFIJO}`;
}

export interface Corrida {
  readonly ejecucion: Ejecucion;
  readonly pasos: readonly Paso[];
  /** Lo escrito en stdout, concatenado. */
  readonly salida: string;
  /** Lo escrito en stderr, concatenado. */
  readonly errores: string;
  readonly fin: FinEjecucion | null;
  /** La ejecución se detuvo esperando entrada (`espera-entrada`). */
  readonly esperaEntrada: boolean;
  readonly avances: readonly Avance[];
}

export interface OpcionesDeCorrida {
  readonly config?: Partial<ConfigEjecucion>;
  readonly puerto?: PuertoBiblioteca;
  /** Cuántos pasos pide por llamada a `avanzar` (por omisión, todos los que quepan). */
  readonly pasosPorAvance?: number;
}

/** Compila `fuente` y la ejecuta hasta que termina o espera entrada. Lanza si no compila. */
export function correrPrograma(fuente: string, opciones: OpcionesDeCorrida = {}): Corrida {
  const puerto = opciones.puerto ?? PUERTO_VACIO;
  const resultado = compilar(fuente, puerto);
  if (!resultado.ok) throw new Error(`no compiló: ${JSON.stringify(resultado.problema)}`);
  const ejecucion = crearEjecucion(resultado.programa, configuracion(opciones.config), puerto);
  return avanzarHastaElFinal(ejecucion, [], opciones.pasosPorAvance ?? 1_000_000, []);
}

/** Compila un fragmento de `main` y lo ejecuta. */
export function correr(cuerpo: string, opciones: OpcionesDeCorrida = {}): Corrida {
  return correrPrograma(programaDe(cuerpo), opciones);
}

/** Sigue avanzando una ejecución ya creada (o a medias) hasta que termina o espera entrada. */
export function avanzarHastaElFinal(ejecucion: Ejecucion, pasosPrevios: readonly Paso[], pasosPorAvance: number, avancesPrevios: readonly Avance[]): Corrida {
  const pasos = [...pasosPrevios];
  const avances = [...avancesPrevios];
  for (;;) {
    const avance = ejecucion.avanzar(pasosPorAvance);
    avances.push(avance);
    pasos.push(...avance.pasos);
    if (avance.estado === 'continua') continue;
    const segmentos = pasos.flatMap((paso) => paso.salida ?? []);
    return {
      ejecucion,
      pasos,
      salida: segmentos.filter((s) => s.flujo === 'out').map((s) => s.texto).join(''),
      errores: segmentos.filter((s) => s.flujo === 'err').map((s) => s.texto).join(''),
      fin: avance.estado === 'fin' ? avance.fin : null,
      esperaEntrada: avance.estado === 'espera-entrada',
      avances,
    };
  }
}
