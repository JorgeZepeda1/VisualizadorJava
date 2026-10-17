// Lo que el editor marca (tarea 4.4, REQ-VIS-004, REQ-VIS-002, REQ-VIS-007, design.md §6.3): la línea recién ejecutada y la siguiente (el editor las pinta con DOS marcas distintas, no solo color),
// la etiqueta de vuelta junto al encabezado de cada ciclo activo, y el subrayado de un problema (error o aviso) sobre su rango. Datos puros que el editor recibe por `props` y convierte en
// decoraciones de CodeMirror; aquí no hay DOM. Pendiente de la unión con el motor: atenuar la rama que no corre EN EL EDITOR necesita los rangos de las ramas, que `VistaPrograma` todavía no trae
// (el panel de condición sí la muestra atenuada, nunca oculta).
import type { Problema, VistaPrograma } from '../motor/vista.ts';
import type { ModeloVista } from './modelo-vista.ts';

export interface EtiquetaDeVuelta {
  /** La línea del encabezado del ciclo (la que empieza el `for`, el `while` o el `do`). */
  readonly linea: number;
  readonly vuelta: number;
  readonly termino: boolean;
}

export interface ResaltadosDelEditor {
  readonly lineaEjecutada: number | null;
  readonly lineaSiguiente: number | null;
  readonly vueltas: readonly EtiquetaDeVuelta[];
}

export function derivarResaltados(modelo: Pick<ModeloVista, 'lineas' | 'vueltas'>, vista: VistaPrograma | null): ResaltadosDelEditor {
  const vueltas = modelo.vueltas.flatMap((vuelta): EtiquetaDeVuelta[] => {
    const linea = vista?.nodos[vuelta.nodoDelCiclo]?.linea;
    return linea === undefined ? [] : [{ linea, vuelta: vuelta.vuelta, termino: vuelta.termino }];
  });
  return { lineaEjecutada: modelo.lineas.ejecutada, lineaSiguiente: modelo.lineas.siguiente, vueltas };
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
