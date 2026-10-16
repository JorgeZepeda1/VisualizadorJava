// Intérprete de sentencias (tarea 2.18, REQ-EJEC-004, design.md §3.2/§3.3, ADR 005 punto 2): cada sentencia es una función GENERADORA que cede UN `Paso`
// por paso Normal —uno por sentencia ejecutada y uno por cada condición evaluada, cada vuelta de ciclo, cada impresión— y devuelve cómo terminó
// (`normal`, `break`, `continue`, `return`). Los bloques y los ciclos delegan con `yield*`, así que la profundidad de la pila es la del anidamiento
// de las sentencias, no la de las expresiones (que se evalúan con la función recursiva de `expresiones.ts`).
//
// Lectura con reintento (ADR 005 punto 4): el trabajo de un paso corre en `intentar`. Si la biblioteca lanza `FaltaEntrada`, restaura la
// instantánea, «teclea» el siguiente renglón por teclear (con su eco) o, si no hay y la entrada es interactiva, cede una `SenalDeEntrada` al director
// y al reanudarse vuelve a intentar. Un renglón solo entra al búfer cuando una lectura lo necesita: por eso la traza interactiva y la preparada son idénticas.
import { CadenaJava, FaltaEntrada } from '../biblioteca/index.ts';
import type {
  CondicionIr,
  DeclaracionIr,
  ElementoSwitchIr,
  ExpresionSentenciaIr,
  ForIr,
  RaizIr,
  SentenciaIr,
  SwitchIr,
} from '../ir/ir.ts';
import type { ClasePaso, Paso, Segmento } from '../traza/paso.ts';
import type { ExplicacionPaso, TipoDeCiclo } from '../traza/explicacion.ts';
import { aTrazaValor, type ValorEjecucion } from './puerto-biblioteca.ts';
import { nuevoPasoEnCurso, type ContextoDeEjecucion } from './contexto.ts';
import { evaluar, evaluarRaiz } from './expresiones.ts';
import { LimiteDePasosExcedido } from './limites.ts';
import {
  explicarCondicionCiclo,
  explicarCondicionIf,
  explicarDeclaracion,
  explicarExpresion,
  explicarSeleccionDeSwitch,
} from './explicar.ts';
import { restaurarInstantanea, tomarInstantanea } from './instantanea.ts';

/** Cómo terminó una sentencia: lo que su sentencia contenedora tiene que hacer a continuación. */
export type Terminacion = 'normal' | 'break' | 'continue' | 'return';

/** La ejecución no puede seguir hasta que llegue un renglón de entrada: el director la convierte en `espera-entrada`. */
export interface SenalDeEntrada {
  readonly senal: 'necesita-entrada';
  readonly nodo: number;
}

export type Emision = Paso | SenalDeEntrada;

type Generador<T> = Generator<Emision, T, undefined>;

// --- Un paso: intento, reintento y construcción ------------------------------------------------------------------------------------

/**
 * Ejecuta el trabajo de UN paso (`accion`: evaluar sus raíces y escribir sus variables) con lectura con reintento. Deja el resultado en `contexto.paso`
 * (el registro de valores, los cambios, la salida y el eco) para que `construirPaso` lo convierta en el `Paso`.
 */
function* intentar<T>(contexto: ContextoDeEjecucion, nodo: number, conBiblioteca: boolean, accion: () => T): Generador<T> {
  const largoDelPlan = contexto.programa.nodos[nodo].plan.length;
  contexto.ultimoNodo = nodo;
  contexto.paso = nuevoPasoEnCurso(largoDelPlan, contexto.entrada.cursor);
  for (;;) {
    const instantanea = conBiblioteca ? tomarInstantanea(contexto) : null;
    const { eco, cursorAntes } = contexto.paso;
    contexto.paso = { ...nuevoPasoEnCurso(largoDelPlan, cursorAntes), eco };
    try {
      return accion();
    } catch (error) {
      if (!(error instanceof FaltaEntrada) || instantanea === null) throw error;
      restaurarInstantanea(contexto, instantanea);
      let renglon = contexto.porTeclear.shift();
      // Sin renglón por teclear y con la entrada abierta e interactiva, se cede el control hasta que llegue uno (o el alumno cierre la entrada).
      while (renglon === undefined && contexto.config.entradaInteractiva && !contexto.finDeEntradaPedido) {
        yield { senal: 'necesita-entrada', nodo };
        renglon = contexto.porTeclear.shift();
      }
      if (renglon !== undefined) {
        // «teclea» el renglón: entra al búfer y queda en el eco del paso
        contexto.entrada.agregar(renglon);
        contexto.paso.eco.push(renglon);
      } else {
        contexto.entrada.cerrar(); // fin de la entrada (EOF): la lectura fallará con la excepción de Java
      }
    }
  }
}

interface ExtrasDelPaso {
  readonly explicacion: ExplicacionPaso;
  readonly control?: NonNullable<Paso['control']>;
}

/** El `Paso` de lo que acaba de ejecutarse: el registro de valores, los cambios, la salida (con el eco de lo tecleado) y la entrada. */
function construirPaso(contexto: ContextoDeEjecucion, clase: ClasePaso, nodo: number, extras: ExtrasDelPaso): Paso {
  const { registro, cambios, salida, eco, cursorAntes } = contexto.paso;
  const segmentos: Segmento[] = [...eco.map((texto) => ({ flujo: 'eco' as const, texto })), ...salida];
  const entradaCambio = eco.length > 0 || contexto.entrada.cursor !== cursorAntes;
  return {
    clase,
    nodo,
    linea: contexto.programa.nodos[nodo].linea,
    explicacion: extras.explicacion,
    ...(registro.length > 0 ? { valores: registro.map((valor) => (valor === null ? null : aTrazaValor(valor))) } : {}),
    ...(cambios.length > 0 ? { cambios } : {}),
    ...(segmentos.length > 0 ? { salida: segmentos } : {}),
    ...(entradaCambio ? { entrada: { cursor: contexto.entrada.cursor, ...(eco.length > 0 ? { agregado: eco.join('') } : {}) } } : {}),
    ...(extras.control === undefined ? {} : { control: extras.control }),
  };
}

function hayBiblioteca(raices: readonly RaizIr[]): boolean {
  return raices.some((raiz) => raiz.conBiblioteca);
}

// --- Sentencias ------------------------------------------------------------------------------------------------------------------

export function* ejecutarSentencia(sentencia: SentenciaIr, contexto: ContextoDeEjecucion): Generador<Terminacion> {
  switch (sentencia.forma) {
    case 'declaracion':
      yield* ejecutarDeclaracion(sentencia, contexto);
      return 'normal';
    case 'expresion':
      yield* ejecutarExpresion(sentencia, contexto);
      return 'normal';
    case 'bloque': {
      for (const interna of sentencia.sentencias) {
        const terminacion = yield* ejecutarSentencia(interna, contexto);
        if (terminacion !== 'normal') return terminacion;
      }
      return 'normal';
    }
    case 'if': {
      const resultado = yield* pasoDeCondicion(contexto, sentencia.condicion, 'condicion-if', (r) =>
        explicarCondicionIf(contexto, sentencia.condicion, r, sentencia.sino !== null),
      );
      if (resultado) return yield* ejecutarSentencia(sentencia.entonces, contexto);
      return sentencia.sino === null ? 'normal' : yield* ejecutarSentencia(sentencia.sino, contexto);
    }
    case 'while':
      return yield* ejecutarWhile(sentencia, contexto);
    case 'do-while':
      return yield* ejecutarDoWhile(sentencia, contexto);
    case 'for':
      return yield* ejecutarFor(sentencia, contexto);
    case 'switch':
      return yield* ejecutarSwitch(sentencia, contexto);
    case 'break': {
      yield* pasoSimple(contexto, 'break', sentencia.nodo, {
        clave: 'break',
        datos: { en: contexto.pilaDeControl[contexto.pilaDeControl.length - 1] === 'switch' ? 'switch' : 'ciclo' },
      });
      return 'break';
    }
    case 'continue': {
      yield* pasoSimple(contexto, 'continue', sentencia.nodo, { clave: 'continue', datos: { ciclo: cicloMasCercano(contexto) } });
      return 'continue';
    }
    case 'return':
      yield* pasoSimple(contexto, 'return', sentencia.nodo, { clave: 'return', datos: {} });
      return 'return';
    case 'vacia':
      yield* pasoSimple(contexto, 'vacia', sentencia.nodo, { clave: 'vacia', datos: {} });
      return 'normal';
  }
}

function cicloMasCercano(contexto: ContextoDeEjecucion): TipoDeCiclo {
  for (let indice = contexto.pilaDeControl.length - 1; indice >= 0; indice -= 1) {
    const control = contexto.pilaDeControl[indice];
    if (control !== 'switch') return control;
  }
  return 'while';
}

/** Un paso sin expresiones: `break`, `continue`, `return`, `;`. */
function* pasoSimple(contexto: ContextoDeEjecucion, clase: ClasePaso, nodo: number, explicacion: ExplicacionPaso): Generador<void> {
  contexto.ultimoNodo = nodo;
  contexto.paso = nuevoPasoEnCurso(0, contexto.entrada.cursor);
  yield construirPaso(contexto, clase, nodo, { explicacion });
}

function* ejecutarDeclaracion(declaracion: DeclaracionIr, contexto: ContextoDeEjecucion): Generador<void> {
  const raices = declaracion.declaradores.flatMap((declarador) => (declarador.inicializador === null ? [] : [declarador.inicializador]));
  yield* intentar(contexto, declaracion.nodo, hayBiblioteca(raices), () => {
    // Cada variable queda escrita ANTES de evaluar el inicializador de la siguiente (`int a = 1, b = a + 1;`).
    for (const declarador of declaracion.declaradores) {
      const valor = declarador.inicializador === null ? undefined : evaluar(declarador.inicializador.expresion, contexto);
      const anterior = contexto.ranuras[declarador.ranura];
      contexto.ranuras[declarador.ranura] = valor;
      contexto.paso.cambios.push({
        ranura: declarador.nombre,
        anterior: anterior === undefined ? undefined : aTrazaValor(anterior),
        nuevo: valor === undefined ? null : aTrazaValor(valor),
      });
    }
  });
  yield construirPaso(contexto, 'declaracion', declaracion.nodo, { explicacion: explicarDeclaracion(contexto, declaracion) });
}

function* ejecutarExpresion(sentencia: ExpresionSentenciaIr, contexto: ContextoDeEjecucion): Generador<void> {
  yield* intentar(contexto, sentencia.nodo, hayBiblioteca(sentencia.raices), () => {
    for (const raiz of sentencia.raices) evaluarRaiz(raiz, contexto);
  });
  yield construirPaso(contexto, sentencia.clasePaso, sentencia.nodo, { explicacion: explicarExpresion(contexto, sentencia) });
}

// --- Condiciones y ciclos --------------------------------------------------------------------------------------------------------

/** Evalúa una condición y cede su paso (con `control.resultado`); devuelve el resultado. */
function* pasoDeCondicion(
  contexto: ContextoDeEjecucion,
  condicion: CondicionIr,
  clase: 'condicion-if' | 'condicion-ciclo',
  explicar: (resultado: boolean) => ExplicacionPaso,
  controlExtra: { readonly vuelta?: number; readonly ciclo?: number } = {},
): Generador<boolean> {
  const resultado = yield* intentar(contexto, condicion.nodo, condicion.raiz.conBiblioteca, () => evaluarRaiz(condicion.raiz, contexto) as boolean);
  yield construirPaso(contexto, clase, condicion.nodo, {
    explicacion: explicar(resultado),
    control: { resultado, ...controlExtra, predecible: true },
  });
  return resultado;
}

function siguienteVuelta(contexto: ContextoDeEjecucion, nodoDelCiclo: number): number {
  const vuelta = (contexto.vueltas.get(nodoDelCiclo) ?? 0) + 1;
  contexto.vueltas.set(nodoDelCiclo, vuelta);
  return vuelta;
}

function* revisarCondicionDeCiclo(contexto: ContextoDeEjecucion, nodoDelCiclo: number, condicion: CondicionIr, ciclo: TipoDeCiclo): Generador<boolean> {
  const vuelta = siguienteVuelta(contexto, nodoDelCiclo);
  return yield* pasoDeCondicion(contexto, condicion, 'condicion-ciclo', (r) => explicarCondicionCiclo(contexto, condicion, ciclo, r, vuelta), { vuelta, ciclo: nodoDelCiclo });
}

function* ejecutarWhile(ciclo: Extract<SentenciaIr, { forma: 'while' }>, contexto: ContextoDeEjecucion): Generador<Terminacion> {
  contexto.vueltas.set(ciclo.nodo, 0);
  contexto.pilaDeControl.push('while');
  let terminacion: Terminacion = 'normal';
  while (yield* revisarCondicionDeCiclo(contexto, ciclo.nodo, ciclo.condicion, 'while')) {
    const cuerpo = yield* ejecutarSentencia(ciclo.cuerpo, contexto);
    if (cuerpo === 'break') break;
    if (cuerpo === 'return') {
      terminacion = 'return';
      break;
    }
  }
  contexto.pilaDeControl.pop();
  return terminacion;
}

function* ejecutarDoWhile(ciclo: Extract<SentenciaIr, { forma: 'do-while' }>, contexto: ContextoDeEjecucion): Generador<Terminacion> {
  contexto.vueltas.set(ciclo.nodo, 0);
  contexto.pilaDeControl.push('do-while');
  let terminacion: Terminacion = 'normal';
  for (;;) {
    const cuerpo = yield* ejecutarSentencia(ciclo.cuerpo, contexto);
    if (cuerpo === 'break') break;
    if (cuerpo === 'return') {
      terminacion = 'return';
      break;
    }
    // `continue` salta a la condición, igual que terminar el cuerpo
    if (!(yield* revisarCondicionDeCiclo(contexto, ciclo.nodo, ciclo.condicion, 'do-while'))) break;
  }
  contexto.pilaDeControl.pop();
  return terminacion;
}

function* ejecutarFor(ciclo: ForIr, contexto: ContextoDeEjecucion): Generador<Terminacion> {
  contexto.vueltas.set(ciclo.nodo, 0);
  if (ciclo.inicio !== null) yield* ejecutarSentencia(ciclo.inicio, contexto);
  contexto.pilaDeControl.push('for');
  let terminacion: Terminacion = 'normal';
  let vueltasSinCondicion = 0;
  for (;;) {
    if (ciclo.condicion !== null) {
      if (!(yield* revisarCondicionDeCiclo(contexto, ciclo.nodo, ciclo.condicion, 'for'))) break;
    } else {
      // `for (;;)` no tiene condición que dé un paso por vuelta: si el cuerpo tampoco da pasos, el director no se enteraría nunca de que el ciclo no termina.
      vueltasSinCondicion += 1;
      if (vueltasSinCondicion > contexto.config.limitePasos) throw new LimiteDePasosExcedido();
    }
    const cuerpo = yield* ejecutarSentencia(ciclo.cuerpo, contexto);
    if (cuerpo === 'break') break;
    if (cuerpo === 'return') {
      terminacion = 'return';
      break;
    }
    // `continue` también ejecuta la actualización antes de volver a evaluar la condición
    if (ciclo.actualizacion !== null) yield* ejecutarSentencia(ciclo.actualizacion, contexto);
  }
  contexto.pilaDeControl.pop();
  return terminacion;
}

// --- switch ----------------------------------------------------------------------------------------------------------------------

function esEtiqueta(elemento: ElementoSwitchIr): elemento is Exclude<ElementoSwitchIr, { forma: 'sentencia' }> {
  return elemento.forma !== 'sentencia';
}

function coincide(elemento: Extract<ElementoSwitchIr, { forma: 'caso' }>, valor: ValorEjecucion): boolean {
  return valor instanceof CadenaJava ? valor.texto === elemento.valor : valor === elemento.valor;
}

function* ejecutarSwitch(sentencia: SwitchIr, contexto: ContextoDeEjecucion): Generador<Terminacion> {
  const valor = yield* intentar(contexto, sentencia.nodo, sentencia.selector.conBiblioteca, () => evaluarRaiz(sentencia.selector, contexto) as ValorEjecucion);
  const elementos = sentencia.elementos;
  // Cuántas etiquetas hay antes de cada elemento: el índice de etiqueta que `control.caso` nombra.
  const indiceDeEtiqueta: number[] = [];
  let etiquetas = 0;
  for (const elemento of elementos) {
    indiceDeEtiqueta.push(etiquetas);
    if (esEtiqueta(elemento)) etiquetas += 1;
  }
  let inicio = elementos.findIndex((elemento) => elemento.forma === 'caso' && coincide(elemento, valor));
  if (inicio < 0) inicio = elementos.findIndex((elemento) => elemento.forma === 'defecto');

  const elegido = inicio < 0 ? null : elementos[inicio];
  const resultado =
    elegido === null ? ({ tipo: 'ninguno' } as const) : elegido.forma === 'caso' ? ({ tipo: 'caso', etiqueta: elegido.texto } as const) : ({ tipo: 'defecto' } as const);
  yield construirPaso(contexto, 'seleccion-switch', sentencia.nodo, {
    explicacion: explicarSeleccionDeSwitch(contexto, sentencia.selector, resultado),
    ...(inicio < 0 ? {} : { control: { caso: indiceDeEtiqueta[inicio] } }),
  });
  if (inicio < 0) return 'normal';

  contexto.pilaDeControl.push('switch');
  let terminacion: Terminacion = 'normal';
  let ejecutadasDesdeLaEtiqueta = 0;
  for (let indice = inicio + 1; indice < elementos.length; indice += 1) {
    const elemento = elementos[indice];
    if (esEtiqueta(elemento)) {
      // Llegar a otra etiqueta habiendo ejecutado algo es la CAÍDA (no hubo `break`); las etiquetas apiladas no lo son.
      if (ejecutadasDesdeLaEtiqueta > 0) {
        contexto.ultimoNodo = elemento.nodo;
        contexto.paso = nuevoPasoEnCurso(0, contexto.entrada.cursor);
        yield construirPaso(contexto, 'caida-switch', elemento.nodo, {
          explicacion: { clave: 'switch-cae', datos: { etiqueta: elemento.forma === 'caso' ? elemento.texto : null } },
          control: { caso: indiceDeEtiqueta[indice] },
        });
      }
      ejecutadasDesdeLaEtiqueta = 0;
      continue;
    }
    const interna = yield* ejecutarSentencia(elemento.sentencia, contexto);
    ejecutadasDesdeLaEtiqueta += 1;
    if (interna === 'break') break; // el `break` termina el switch y ahí se consume
    if (interna !== 'normal') {
      terminacion = interna; // `continue` y `return` siguen hacia fuera
      break;
    }
  }
  contexto.pilaDeControl.pop();
  return terminacion;
}
