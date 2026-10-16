// Director de ejecución mínimo de la rebanada vertical (design.md §1.3). Ejecuta las sentencias de
// la IR de corrido y produce un Paso por cada una. El intérprete real con generadores por
// sentencia, plan de evaluación y lectura con reintento (ADR 005) llega en las tareas 2.17-2.19 —
// el contrato `Ejecucion` (avanzar/darEntrada/cerrarEntrada) que ese lote hereda queda fijo desde
// aquí (design.md §1.3, REFACTOR de la tarea 0.12). Sin `Scanner` en este subconjunto,
// `darEntrada`/`cerrarEntrada` no tienen nada que hacer todavía (llega en la tarea 2.12); el
// intérprete de expresiones para `Valor`/`Cambio` llega en 2.17 (aquí no hay subexpresiones).
import type { ProgramaCompilado, SentenciaIr } from '../ir/ir.ts';
import type { FinEjecucion, Paso } from '../traza/paso.ts';

export interface ConfigEjecucion {
  readonly regional: 'es-MX' | 'es-ES';
  readonly semilla: bigint;
  readonly entradaPreparada: string;
  readonly entradaInteractiva: boolean;
  readonly limitePasos: number;
  readonly limiteCaracteres: number;
}

export type Avance =
  | { readonly estado: 'continua'; readonly pasos: readonly Paso[] }
  | { readonly estado: 'espera-entrada'; readonly pasos: readonly Paso[]; readonly nodo: number }
  | { readonly estado: 'fin'; readonly pasos: readonly Paso[]; readonly fin: FinEjecucion };

export interface Ejecucion {
  avanzar(maxPasos: number): Avance;
  darEntrada(renglon: string): void;
  cerrarEntrada(): void;
}

export function crearEjecucion(programa: ProgramaCompilado, config: ConfigEjecucion): Ejecucion {
  // `config` queda fijo en la firma pública desde ya (regional/semilla/entrada/límites); esta
  // rebanada no los necesita todavía porque el único programa soportado no tiene Scanner, Random
  // ni más de `config.limitePasos` sentencias — lo consumen las tareas 2.7-2.19.
  void config;

  let indice = 0;
  let terminado = false;

  return {
    avanzar(maxPasos: number): Avance {
      if (terminado) {
        return { estado: 'fin', pasos: [], fin: { causa: 'terminado' } };
      }
      // Tarea 1.15 (REQ-COMP-007/008, ADR 004 pasada 5): "main" sin "static" o sin ningún "main"
      // COMPILA limpio (`compilar()` ya devolvió ok:true) -- el problema real es del LANZADOR, al
      // intentar EJECUTAR (design.md §2.2: "se presenta como una excepción en ejecución"). Se
      // reporta ANTES de tocar cualquier sentencia de `programa.ir` (que, en este caso, siempre
      // viene vacía -- generar-ir.ts).
      if (programa.arranque !== null) {
        terminado = true;
        return { estado: 'fin', pasos: [], fin: { causa: 'error-arranque', arranque: programa.arranque } };
      }
      const pasos: Paso[] = [];
      while (indice < programa.ir.sentencias.length && pasos.length < maxPasos) {
        pasos.push(ejecutarSentencia(programa.ir.sentencias[indice], indice));
        indice += 1;
      }
      if (indice >= programa.ir.sentencias.length) {
        terminado = true;
        return { estado: 'fin', pasos, fin: { causa: 'terminado' } };
      }
      return { estado: 'continua', pasos };
    },
    darEntrada(): void {
      // Sin Scanner en la rebanada vertical (tarea 2.12).
    },
    cerrarEntrada(): void {
      // Sin Scanner en la rebanada vertical (tarea 2.12).
    },
  };
}

function ejecutarSentencia(sentencia: SentenciaIr, nodo: number): Paso {
  switch (sentencia.tipo) {
    case 'impresion':
      return {
        clase: 'impresion',
        nodo,
        salida: [{ flujo: 'out', texto: `${sentencia.texto}\n` }],
      };
  }
}
