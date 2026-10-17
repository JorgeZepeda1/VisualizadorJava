// Lo que el editor marca (tarea 4.4, REQ-VIS-004, REQ-VIS-002, REQ-VIS-007, design.md §6.3): la línea recién ejecutada y la siguiente (el editor las pinta con DOS marcas distintas, no solo color),
// la etiqueta de vuelta junto al encabezado de cada ciclo activo, la rama del `if` que no se toma (atenuada con una etiqueta, nunca oculta; los rangos salen de `VistaPrograma.ramasDeIf`, hito 2C) y
// el subrayado de un problema (error o aviso) sobre su rango. Datos puros que el editor recibe por `props` y convierte en decoraciones de CodeMirror; aquí no hay DOM.
import type { Problema, VistaPrograma } from '../motor/vista.ts';
import type { ModeloVista } from './modelo-vista.ts';

export interface EtiquetaDeVuelta {
  /** La línea del encabezado del ciclo (la que empieza el `for`, el `while` o el `do`). */
  readonly linea: number;
  readonly vuelta: number;
  readonly termino: boolean;
}

/** El tramo del código que el editor atenúa (nunca oculta): la rama del `if` que NO se toma en el paso de su condición. Desplazamientos del programa, como el subrayado de un problema. */
export interface RamaAtenuada {
  readonly desde: number;
  readonly hasta: number;
}

export interface ResaltadosDelEditor {
  readonly lineaEjecutada: number | null;
  readonly lineaSiguiente: number | null;
  readonly vueltas: readonly EtiquetaDeVuelta[];
  readonly ramaNoTomada: RamaAtenuada | null;
}

export function derivarResaltados(modelo: Pick<ModeloVista, 'lineas' | 'vueltas' | 'ramaNoTomada'>, vista: VistaPrograma | null): ResaltadosDelEditor {
  const vueltas = modelo.vueltas.flatMap((vuelta): EtiquetaDeVuelta[] => {
    const linea = vista?.nodos[vuelta.nodoDelCiclo]?.linea;
    return linea === undefined ? [] : [{ linea, vuelta: vuelta.vuelta, termino: vuelta.termino }];
  });
  const rama = modelo.ramaNoTomada;
  return {
    lineaEjecutada: modelo.lineas.ejecutada,
    lineaSiguiente: modelo.lineas.siguiente,
    vueltas,
    ramaNoTomada: rama === null ? null : { desde: rama.inicio, hasta: rama.fin },
  };
}

export interface ResaltadoDeProblema {
  /** El rango del código señalado, en desplazamientos del programa. */
  readonly desde: number;
  readonly hasta: number;
  readonly linea: number;
  /** `error`: subrayado ondulado (error de compilación). `aviso`: subrayado punteado («no disponible en el visualizador»). */
  readonly tipo: 'error' | 'aviso';
}

export function resaltadosDelProblema(problema: Problema): ResaltadoDeProblema {
  return {
    desde: problema.rango.inicio,
    hasta: problema.rango.fin,
    linea: problema.linea,
    tipo: problema.categoria === 'error-compilacion' ? 'error' : 'aviso',
  };
}
