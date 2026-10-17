// Diagnóstico de ciclo desbocado (tarea 3.3, REQ-EJEC-007, design.md §3.5, M15): cuando el visualizador detiene un programa por seguridad, esto busca el ciclo más interno que seguía activo y,
// en sus últimas 100 revisiones de la condición, qué variables de la condición no cambiaron. Así el aviso dice «`intentos` siempre valió 1» en vez de un mensaje genérico. Pura: lee los pasos
// que ya existen (cada `condicion-ciclo` trae el valor de cada variable que leyó su condición) y la vista del programa (qué nodos son ciclos y dónde están).
import type { VistaPrograma } from '../ir/vista-programa.ts';
import type { NodoIr } from '../ir/ir.ts';
import type { DiagnosticoDeCiclo, LecturaExplicada } from './explicacion.ts';
import type { Paso } from './paso.ts';

/** Cuántas revisiones de la condición, las últimas, se miran (design.md §3.5). */
export const VUELTAS_A_REVISAR = 100;
/** Con menos revisiones que estas no hay con qué comparar. */
const MINIMO_DE_VUELTAS = 2;

type VistaParaDiagnosticar = Pick<VistaPrograma, 'nodos' | 'ranuras'>;

const CLASES_DE_CICLO: ReadonlySet<NodoIr['clase']> = new Set(['while', 'do-while', 'for']);

/** Los ciclos que contienen el nodo (por el rango de su texto), del más interno al más externo. */
function ciclosQueContienen(vista: VistaParaDiagnosticar, nodo: number): NodoIr[] {
  const objetivo = vista.nodos[nodo];
  if (objetivo === undefined) return [];
  return vista.nodos
    .filter((candidato) => CLASES_DE_CICLO.has(candidato.clase) && candidato.rango.inicio <= objetivo.rango.inicio && objetivo.rango.fin <= candidato.rango.fin)
    .sort((a, b) => a.rango.fin - a.rango.inicio - (b.rango.fin - b.rango.inicio));
}

/** Las revisiones de la condición del ciclo `ciclo` en su ÚLTIMA ejecución, a lo más `VUELTAS_A_REVISAR`, de la más vieja a la más reciente. */
function ultimasRevisiones(pasos: readonly Paso[], ciclo: number): Paso[] {
  const revisiones: Paso[] = [];
  for (let indice = pasos.length - 1; indice >= 0 && revisiones.length < VUELTAS_A_REVISAR; indice -= 1) {
    const paso = pasos[indice];
    if (paso.clase !== 'condicion-ciclo' || paso.control?.ciclo !== ciclo) continue;
    revisiones.push(paso);
    if (paso.control.vuelta === 1) break; // la primera revisión de esta ejecución del ciclo: lo anterior es otra ejecución
  }
  return revisiones.reverse();
}

/** ¿Alguna variable de la condición es un objeto que cambia por dentro (`Scanner`, `Random`)? Entonces «siempre valió» no dice nada: leer consume entrada o avanza la semilla. */
function leeUnObjeto(vista: VistaParaDiagnosticar, nombres: Iterable<string>): boolean {
  for (const nombre of nombres) {
    if (vista.ranuras.some((ranura) => ranura.nombre === nombre && (ranura.tipo === 'Scanner' || ranura.tipo === 'Random'))) return true;
  }
  return false;
}

function diagnosticarUnCiclo(pasos: readonly Paso[], vista: VistaParaDiagnosticar, ciclo: NodoIr): DiagnosticoDeCiclo | null {
  const revisiones = ultimasRevisiones(pasos, ciclo.id);
  if (revisiones.length < MINIMO_DE_VUELTAS) return null;
  const ultima = revisiones[revisiones.length - 1];
  if (ultima.explicacion.clave !== 'condicion-ciclo') return null;

  // El valor de cada variable en cada revisión, en el orden en que aparecen por primera vez.
  const valores = new Map<string, Set<string>>();
  for (const revision of revisiones) {
    if (revision.explicacion.clave !== 'condicion-ciclo') continue;
    for (const lectura of revision.explicacion.datos.lecturas) {
      const vistos = valores.get(lectura.nombre) ?? new Set<string>();
      vistos.add(lectura.valor);
      valores.set(lectura.nombre, vistos);
    }
  }
  const ningunaCambio = valores.size > 0 && [...valores.values()].every((vistos) => vistos.size === 1) && !leeUnObjeto(vista, valores.keys());
  const sinCambio: LecturaExplicada[] = ningunaCambio ? [...valores].map(([nombre, vistos]) => ({ nombre, valor: [...vistos][0] })) : [];
  return { ciclo: ultima.explicacion.datos.ciclo, linea: ultima.linea, condicion: ultima.explicacion.datos.condicion, vueltas: revisiones.length, sinCambio };
}

/**
 * El diagnóstico del ciclo desbocado al final de `pasos`, o `null` si el programa no estaba dentro de ningún ciclo con condición. Recorre los ciclos que contienen el último paso, del más
 * interno al más externo, y se queda con el primero cuyas variables no cambiaron; si ninguno tiene evidencia, el más interno que se pudo revisar (con `sinCambio` vacío).
 */
export function diagnosticarCiclo(pasos: readonly Paso[], vista: VistaParaDiagnosticar): DiagnosticoDeCiclo | null {
  let ultimo: Paso | undefined;
  for (let indice = pasos.length - 1; indice >= 0; indice -= 1) {
    if (pasos[indice].clase !== 'detenido') {
      ultimo = pasos[indice];
      break;
    }
  }
  if (ultimo === undefined) return null;
  // Si el último paso es la condición que acaba de dar falso, ese ciclo ya terminó: sigue activo solo lo que lo envuelve.
  const cicloTerminado = ultimo.clase === 'condicion-ciclo' && ultimo.control?.resultado === false ? ultimo.control.ciclo : undefined;

  let sinEvidencia: DiagnosticoDeCiclo | null = null;
  for (const ciclo of ciclosQueContienen(vista, ultimo.nodo)) {
    if (ciclo.id === cicloTerminado) continue;
    const diagnostico = diagnosticarUnCiclo(pasos, vista, ciclo);
    if (diagnostico === null) continue;
    if (diagnostico.sinCambio.length > 0) return diagnostico;
    sinEvidencia ??= diagnostico;
  }
  return sinEvidencia;
}
