// El estado mutable de UNA ejecución (design.md §3.2): las variables, el registro del paso en curso, la entrada y la consola. Lo comparten el intérprete
// de expresiones (`expresiones.ts`), el de sentencias (`sentencias.ts`), la instantánea (`instantanea.ts`) y el director (`ejecucion.ts`).
import { EntradaDelPrograma, FlujoDeSalida, FuenteDeAleatorios, PoolDeCadenas } from '../biblioteca/index.ts';
import type { ProgramaIr } from '../ir/ir.ts';
import type { Cambio, Segmento } from '../traza/paso.ts';
import type { ConfigEjecucion } from './ejecucion.ts';
import { ControlDeConsola } from './limites.ts';
import type { ContextoDeBiblioteca, PuertoBiblioteca, ValorEjecucion } from './puerto-biblioteca.ts';

/** Lo que se acumula mientras se evalúa UN paso (se reinicia en cada intento si hay que reintentar por falta de entrada). */
export interface PasoEnCurso {
  /** El valor de cada punto del plan del nodo; `null` si no se evaluó. */
  registro: (ValorEjecucion | null)[];
  cambios: Cambio[];
  salida: Segmento[];
  /** Lo que valía una variable ANTES de asignarla, por punto (para decir «antes valía 5»). */
  anteriores: Map<number, ValorEjecucion | undefined>;
  /** Los renglones que se «teclearon» durante este paso (se acumulan entre intentos). */
  eco: string[];
  cursorAntes: number;
}

export interface ContextoDeEjecucion {
  readonly programa: ProgramaIr;
  readonly config: ConfigEjecucion;
  readonly puerto: PuertoBiblioteca;
  /** Una por declaración; `undefined` = todavía sin valor. */
  readonly ranuras: (ValorEjecucion | undefined)[];
  readonly entrada: EntradaDelPrograma;
  /** Renglones por teclear: la entrada preparada y lo que llega con `darEntrada`. Un renglón entra al búfer solo cuando una lectura lo necesita. */
  readonly porTeclear: string[];
  /** El alumno pidió el fin de la entrada (EOF). */
  finDeEntradaPedido: boolean;
  readonly pool: PoolDeCadenas;
  readonly biblioteca: ContextoDeBiblioteca;
  /** `System.out` y `System.err`: UN objeto por flujo durante toda la ejecución (cada uno recuerda su sustituto alto pendiente, como el codificador de la JVM). */
  readonly flujos: { readonly out: FlujoDeSalida; readonly err: FlujoDeSalida };
  readonly consola: ControlDeConsola;
  paso: PasoEnCurso;
  /** El último nodo que empezó a ejecutarse: de él sale la línea del marco `at Clase.main(Clase.java:N)`. */
  ultimoNodo: number;
  /** Los ciclos y `switch` abiertos, del más externo al más interno (para saber qué cierra un `break`). */
  readonly pilaDeControl: ('while' | 'for' | 'do-while' | 'switch')[];
  /** La cuenta de revisiones de la condición de cada ciclo, por el nodo del ciclo. */
  readonly vueltas: Map<number, number>;
}

/** Parte la entrada preparada en renglones, cada uno con su `\n` (el último puede no tenerlo). */
export function partirEnRenglones(texto: string): string[] {
  return texto.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

export function nuevoPasoEnCurso(largoDelPlan: number, cursorAntes: number): PasoEnCurso {
  return { registro: new Array<ValorEjecucion | null>(largoDelPlan).fill(null), cambios: [], salida: [], anteriores: new Map(), eco: [], cursorAntes };
}

export function crearContexto(programa: ProgramaIr, config: ConfigEjecucion, puerto: PuertoBiblioteca): ContextoDeEjecucion {
  const entrada = new EntradaDelPrograma();
  const consola = new ControlDeConsola(config.limiteCaracteres);
  // `paso` se reasigna al empezar cada nodo; `escribir` apunta siempre al paso en curso.
  const contexto: ContextoDeEjecucion = {
    programa,
    config,
    puerto,
    ranuras: new Array<ValorEjecucion | undefined>(programa.ranuras.length).fill(undefined),
    entrada,
    porTeclear: partirEnRenglones(config.entradaPreparada),
    finDeEntradaPedido: false,
    pool: new PoolDeCadenas(),
    flujos: { out: new FlujoDeSalida('out'), err: new FlujoDeSalida('err') },
    consola,
    paso: nuevoPasoEnCurso(0, 0),
    ultimoNodo: 0,
    pilaDeControl: [],
    vueltas: new Map(),
    biblioteca: {
      regional: config.regional,
      entrada,
      limiteCaracteres: config.limiteCaracteres,
      fuenteDeAleatorios: new FuenteDeAleatorios(config.semilla),
      escribir: (flujo, texto) => {
        consola.sumar(texto);
        contexto.paso.salida.push({ flujo, texto });
      },
    },
  };
  return contexto;
}
