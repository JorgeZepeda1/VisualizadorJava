// Director de ejecución (tareas 2.17 a 2.19, design.md §1.3, §3.2, §3.5, §3.6, ADR 005 punto 5). Reanuda el generador de sentencias hasta producir los
// pasos que se le piden, cuenta los pasos y aplica los límites, convierte una `ExcepcionDeEjecucion` en el paso final `excepcion` con el `stderr` EXACTO
// de la JVM, y cualquier otro fallo en el paso final `detenido` (`limite-caracteres`, `no-disponible-en-ejecucion`) o en `error-interno`.
// El contrato `Ejecucion` (avanzar / darEntrada / cerrarEntrada) quedó fijo desde la rebanada vertical (REFACTOR de la tarea 0.12).
import { formatearTrazaDePila, NoDisponibleEnEjecucion } from '../biblioteca/index.ts';
import type { ProgramaCompilado, ProgramaIr } from '../ir/ir.ts';
import { diagnosticarCiclo } from '../traza/diagnostico-ciclo.ts';
import type { DiagnosticoDeCiclo, ExplicacionPaso } from '../traza/explicacion.ts';
import type { FinEjecucion, Paso, Segmento } from '../traza/paso.ts';
import { aTrazaValor } from './puerto-biblioteca.ts';
import { crearContexto, nuevoPasoEnCurso, type ContextoDeEjecucion } from './contexto.ts';
import { ExcepcionDeEjecucion } from './excepcion-de-ejecucion.ts';
import { explicarFin } from './explicar.ts';
import { LIMITE_DE_TIEMPO_POR_OMISION_MS, LimiteDePasosExcedido, LimiteDeTiempoExcedido, LimiteExcedido } from './limites.ts';
import { PUERTO_POR_OMISION } from './puerto-por-omision.ts';
import type { PuertoBiblioteca } from './puerto-biblioteca.ts';
import { ejecutarSentencia, type Emision } from './sentencias.ts';

export interface ConfigEjecucion {
  readonly regional: 'es-MX' | 'es-ES';
  readonly semilla: bigint;
  readonly entradaPreparada: string;
  readonly entradaInteractiva: boolean;
  readonly limitePasos: number;
  readonly limiteCaracteres: number;
  /** Cuántos milisegundos de cómputo se le dan al programa (tarea 3.4; por omisión 15 000, design.md §3.5). */
  readonly limiteTiempoMs?: number;
}

export type Avance =
  | { readonly estado: 'continua'; readonly pasos: readonly Paso[] }
  | { readonly estado: 'espera-entrada'; readonly pasos: readonly Paso[]; readonly nodo: number }
  | { readonly estado: 'fin'; readonly pasos: readonly Paso[]; readonly fin: FinEjecucion };

export interface Ejecucion {
  /**
   * Da hasta `maxPasos` pasos. Con `presupuestoMs`, devuelve lo que lleva (`continua`) en cuanto esta llamada gasta ese tiempo: así el trabajador da rebanadas de ≤ 8 ms y cede el
   * turno entre una y otra (ADR 007). El reloj se mira cada pocos pasos, nunca a media sentencia.
   */
  avanzar(maxPasos: number, presupuestoMs?: number): Avance;
  darEntrada(renglon: string): void;
  cerrarEntrada(): void;
}

/**
 * El `stderr` de una excepción no atrapada (design.md §3.6): `Exception in thread "main" <clase>[: <mensaje>]`, los marcos de `java.base` que la
 * biblioteca dejó, y al final el marco del alumno `at [paquete.]Clase.main(Clase.java:<línea>)` (el nombre calificado del programa ya lo trae con `package`).
 */
function textoDeLaExcepcion(excepcion: ExcepcionDeEjecucion, programa: ProgramaIr, linea: number): string {
  return formatearTrazaDePila(excepcion, [{ paquete: programa.paquete, clase: programa.nombreClase, metodo: 'main', linea }]);
}

function* ejecutarPrograma(programa: ProgramaIr, contexto: ContextoDeEjecucion): Generator<Emision, void, undefined> {
  for (const sentencia of programa.sentencias) {
    const terminacion = yield* ejecutarSentencia(sentencia, contexto);
    if (terminacion === 'return') return;
  }
}

/** Cada cuántos pasos se mira el reloj (leerlo en cada paso costaría más de lo que vale). */
const PASOS_ENTRE_LECTURAS_DEL_RELOJ = 32;
/** Cuántos de los últimos pasos se recuerdan para diagnosticar un ciclo desbocado (tarea 3.4): alcanza para sus últimas 100 vueltas salvo que cada vuelta tenga cientos de pasos. */
const PASOS_RECIENTES = 16_384;

/**
 * `reloj` (milisegundos) se inyecta para que las pruebas no esperen tiempo de verdad; por omisión es `Date.now`. El tiempo que cuenta contra `limiteTiempoMs` es el de CÓMPUTO: lo que
 * transcurre dentro de las llamadas a `avanzar`, no lo que pasa entre una y otra (esperando entrada, o con el trabajador cediendo el turno).
 */
export function crearEjecucion(programa: ProgramaCompilado, config: ConfigEjecucion, puerto: PuertoBiblioteca = PUERTO_POR_OMISION, reloj: () => number = Date.now): Ejecucion {
  const contexto = crearContexto(programa.ir, config, puerto);
  const generador = ejecutarPrograma(programa.ir, contexto);
  const limiteDeTiempo = config.limiteTiempoMs ?? LIMITE_DE_TIEMPO_POR_OMISION_MS;
  let tiempoDeComputo = 0;
  let pasosDesdeElReloj = 0;
  let recientes: Paso[] = [];
  let pasosEmitidos = 0;
  let final: FinEjecucion | null = null;
  // Al llenar el lote, se mira UNA emisión más para saber si el programa terminó justo ahí (`fin` en el mismo avance); si no, queda aquí para el siguiente.
  let pendiente: Emision | null = null;

  /** El paso final de una detención o de una excepción: lleva lo que alcanzó a calcular el paso que falló. */
  function pasoFinal(clase: 'excepcion' | 'detenido', explicacion: ExplicacionPaso, fin: FinEjecucion, segmentosPropios: readonly Segmento[], ultimaLinea: number): Paso {
    const { registro, cambios, salida, eco } = contexto.paso;
    const nodo = contexto.ultimoNodo;
    const segmentos: Segmento[] = [...eco.map((texto) => ({ flujo: 'eco' as const, texto })), ...salida, ...segmentosPropios];
    return {
      clase,
      nodo,
      linea: ultimaLinea,
      explicacion,
      ...(registro.length > 0 ? { valores: registro.map((valor) => (valor === null ? null : aTrazaValor(valor))) } : {}),
      ...(cambios.length > 0 ? { cambios } : {}),
      ...(segmentos.length > 0 ? { salida: segmentos } : {}),
      fin,
    };
  }

  function terminar(pasos: Paso[], fin: FinEjecucion): Avance {
    final = fin;
    return { estado: 'fin', pasos, fin };
  }

  function lineaDelUltimoNodo(): number {
    return programa.ir.nodos[contexto.ultimoNodo]?.linea ?? 1;
  }

  /** El director detiene el programa por seguridad: el paso `detenido` cierra la traza, con la evidencia del ciclo si el programa estaba dentro de uno. */
  function detenerPorSeguridad(pasos: Paso[], causa: 'limite-pasos' | 'limite-tiempo'): Avance {
    contexto.paso = nuevoPasoEnCurso(0, contexto.entrada.cursor); // lo que quedó del último paso ya salió en su propio Paso
    const diagnostico: DiagnosticoDeCiclo | null = diagnosticarCiclo(recientes, programa.ir);
    const fin: FinEjecucion = diagnostico === null ? { causa } : { causa, diagnostico };
    // Con evidencia, el paso resalta la línea del ciclo (de ahí habla el aviso); sin ella, la línea que iba a ejecutarse.
    pasos.push(pasoFinal('detenido', explicarFin(causa, diagnostico ?? undefined), fin, [], diagnostico?.linea ?? lineaDelUltimoNodo()));
    return terminar(pasos, fin);
  }

  function detener(pasos: Paso[], error: unknown): Avance {
    const linea = lineaDelUltimoNodo();
    if (error instanceof ExcepcionDeEjecucion) {
      const fin: FinEjecucion = { causa: 'excepcion' };
      const texto = textoDeLaExcepcion(error, programa.ir, linea);
      pasos.push(
        pasoFinal('excepcion', { clave: 'excepcion', datos: { clase: error.clase, mensaje: error.mensaje } }, fin, [{ flujo: 'err', texto }], linea),
      );
      return terminar(pasos, fin);
    }
    if (error instanceof LimiteDePasosExcedido) return detenerPorSeguridad(pasos, 'limite-pasos');
    if (error instanceof LimiteDeTiempoExcedido) return detenerPorSeguridad(pasos, 'limite-tiempo');
    if (error instanceof LimiteExcedido) {
      const fin: FinEjecucion = { causa: 'limite-caracteres' };
      pasos.push(pasoFinal('detenido', explicarFin('limite-caracteres'), fin, [], linea));
      return terminar(pasos, fin);
    }
    if (error instanceof NoDisponibleEnEjecucion) {
      const fin: FinEjecucion = { causa: 'no-disponible-en-ejecucion' };
      pasos.push(pasoFinal('detenido', explicarFin('no-disponible-en-ejecucion'), fin, [], linea));
      return terminar(pasos, fin);
    }
    const fin: FinEjecucion = { causa: 'error-interno', detalle: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
    pasos.push(pasoFinal('detenido', explicarFin('error-interno'), fin, [], linea));
    return terminar(pasos, fin);
  }

  /** Recuerda los últimos pasos (una ventana que se recorta cuando llega al doble) para poder diagnosticar un ciclo desbocado sin guardar toda la traza. */
  function recordar(paso: Paso): void {
    recientes.push(paso);
    if (recientes.length >= 2 * PASOS_RECIENTES) recientes = recientes.slice(-PASOS_RECIENTES);
  }

  function avanzarPasos(maxPasos: number, presupuestoMs: number | undefined, inicio: number): Avance {
    const pasos: Paso[] = [];
    try {
      for (;;) {
        let emision: Emision;
        if (pendiente !== null) {
          emision = pendiente;
          pendiente = null;
        } else {
          const siguiente = generador.next();
          if (siguiente.done === true) return terminar(pasos, { causa: 'terminado' });
          emision = siguiente.value;
        }
        if ('senal' in emision) return { estado: 'espera-entrada', pasos, nodo: emision.nodo };
        if (pasosEmitidos >= config.limitePasos) return detenerPorSeguridad(pasos, 'limite-pasos'); // el tope de pasos Normal (design.md §3.5): la traza sigue navegable
        pasos.push(emision);
        recordar(emision);
        pasosEmitidos += 1;
        if (pasos.length >= maxPasos) {
          const adelante = generador.next();
          if (adelante.done === true) return terminar(pasos, { causa: 'terminado' });
          if ('senal' in adelante.value) return { estado: 'espera-entrada', pasos, nodo: adelante.value.nodo };
          pendiente = adelante.value;
          return { estado: 'continua', pasos };
        }
        // Cooperativo: el reloj se mira entre un paso y otro, nunca a media sentencia.
        pasosDesdeElReloj += 1;
        if (pasosDesdeElReloj >= PASOS_ENTRE_LECTURAS_DEL_RELOJ) {
          pasosDesdeElReloj = 0;
          const transcurrido = reloj() - inicio;
          if (tiempoDeComputo + transcurrido > limiteDeTiempo) throw new LimiteDeTiempoExcedido();
          if (presupuestoMs !== undefined && transcurrido >= presupuestoMs) return { estado: 'continua', pasos };
        }
      }
    } catch (error) {
      return detener(pasos, error);
    }
  }

  return {
    avanzar(maxPasos: number, presupuestoMs?: number): Avance {
      if (final !== null) return { estado: 'fin', pasos: [], fin: final };
      // Tarea 1.15 (REQ-COMP-007/008, ADR 004 pasada 5): "main" sin "static" o sin ningún "main" COMPILA limpio -- el problema real es del LANZADOR, al intentar
      // EJECUTAR (design.md §2.2: "se presenta como una excepción en ejecución"). Se reporta ANTES de tocar cualquier sentencia (que, en este caso, siempre viene vacía).
      if (programa.arranque !== null) return terminar([], { causa: 'error-arranque', arranque: programa.arranque });

      const inicio = reloj();
      const avance = avanzarPasos(maxPasos, presupuestoMs, inicio);
      tiempoDeComputo += reloj() - inicio;
      return avance;
    },
    darEntrada(renglon: string): void {
      if (final === null) contexto.porTeclear.push(renglon);
    },
    cerrarEntrada(): void {
      contexto.finDeEntradaPedido = true;
    },
  };
}
