// El estado de la pantalla (tarea 4.13, design.md §6.1, ADR 013): `EstadoApp` y su reductor. Es una función pura: la `Traza` (almacén mutable con versión) y el cliente del trabajador viven FUERA
// de React; lo que llega del trabajador y lo que hace el alumno entran como acciones. La posición se acota con el `total` de la traza que cada acción de navegación trae —la traza es la única
// fuente de verdad de cuántos pasos hay—.
//
// Hito R0 (tarea R0.7, REQ-PANT-001, 002, 006; REQ-AULA-001; ADR 017): el estado también sabe en qué SECCIÓN está el alumno (cambiar de sección no toca el programa ni la traza), si todavía está el SALUDO
// (hasta su primera acción), los AJUSTES DE LA CLASE (proyector y velocidad; el reto y el revisor se suman en R1 y R3), la ENTRADA PREPARADA con la que se ejecuta el programa, DE DÓNDE vino el programa y el
// programa del alumno GUARDADO mientras mira un ejemplo. Los demás ajustes (nivel Normal/Detallado, regional, semilla) y los diálogos llegan en los lotes 5 y 6.
import type { FinEjecucion, VistaPrograma } from '../../motor/vista.ts';
import type { ResaltadoDeProblema, Seccion, SegmentoDeTexto } from '../../presentacion/index.ts';
import type { NivelDeVelocidad } from '../../textos/es-MX/controles.ts';
import type { TipoDeAviso } from '../../textos/es-MX/paneles.ts';

export type ModoApp = 'edicion' | 'compilando' | 'visualizacion';

/** Por qué se está en edición con un aviso a la vista: un problema del programa, un `main` inválido o un fallo del visualizador. Ya viene armado (texto, tipo, subrayado). */
export interface AvisoDeEdicion {
  readonly tipo: TipoDeAviso;
  readonly segmentos: readonly SegmentoDeTexto[];
  readonly adicionales: number;
  /** Lo que se subraya en el código; `null` si no hay un tramo que señalar o si el código ya cambió. */
  readonly resaltado: ResaltadoDeProblema | null;
  /**
   * El alumno editó el código después de recibir este aviso: ya no describe el programa que hay en el editor (C4 del panel 1). Se conserva en el estado, pero la pantalla no lo muestra como actual: el
   * robot dice «Cambiaste el programa…» en vez de repetir el error con la cara de preocupación mientras el editor ya no lo marca. Un aviso nuevo (otro «Visualizar») nace sin esta marca.
   */
  readonly caducado?: true;
}

export interface EjecucionApp {
  /** Identifica la ejecución: los mensajes de una ejecución ya reemplazada se ignoran. */
  readonly id: number;
  /** `detenida`: el trabajador acusó `detener` (`detenido`) antes de que el programa terminara; no hay `fin` y ya no llegarán pasos (hito 2C). */
  readonly estado: 'calculando' | 'esperando-entrada' | 'terminada' | 'detenida';
  /** El nodo de la lectura pendiente cuando `estado === 'esperando-entrada'`. */
  readonly nodoEnEspera: number | null;
  readonly fin: FinEjecucion | null;
  /** Lo que la interfaz conoce del programa compilado (código, variables, nodos); `null` mientras no compile. */
  readonly vista: VistaPrograma | null;
}

export interface NavegacionApp {
  /** A cuántos pasos aplicados se mira (0 = todavía no se ejecuta nada). */
  readonly paso: number;
  readonly reproduciendo: boolean;
  /** Tras escribir un dato: ¿pasar al paso nuevo (el de la lectura) en cuanto llegue? */
  readonly seguirAlLlegar: boolean;
}

/** Lo que el docente ajusta para la clase (REQ-PANT-006). El modo reto y el momento del aviso del revisor se agregan en R1 y R3. */
export interface AjustesApp {
  readonly proyector: boolean;
  readonly velocidad: NivelDeVelocidad;
}

/** De dónde vino el programa del editor: lo escribió el alumno, lo abrió de la galería de ejemplos o lo trajo un enlace. Los temas del libro se suman en R2. */
export type OrigenDelPrograma =
  | { readonly tipo: 'propio' }
  | { readonly tipo: 'galeria'; readonly id: string; readonly demostracion: boolean }
  | { readonly tipo: 'enlace' };

/** El programa del alumno, guardado mientras mira un ejemplo, para poder volver a él. */
export interface ProgramaGuardado {
  readonly codigo: string;
  readonly entrada: string;
}

export interface EstadoApp {
  readonly modo: ModoApp;
  readonly codigo: string;
  readonly ejecucion: EjecucionApp;
  readonly aviso: AvisoDeEdicion | null;
  readonly navegacion: NavegacionApp;
  /** La sección que se ve. Cambiar de sección NO desmonta el editor ni toca la traza (REQ-PANT-002). */
  readonly seccion: Seccion;
  /** El saludo con las tres puertas, hasta la primera acción del alumno (una puerta, editar, visualizar o abrir un programa; REQ-PANT-001). */
  readonly saludo: boolean;
  readonly ajustes: AjustesApp;
  /** Los renglones que el oráculo usó como entrada del programa (cada uno con su salto de línea, como en NetBeans); vacía si el alumno escribe sus propios datos. */
  readonly entradaPreparada: string;
  readonly origen: OrigenDelPrograma;
  readonly programaGuardado: ProgramaGuardado | null;
}

export type Accion =
  | { readonly tipo: 'editar'; readonly codigo: string }
  /** `entradaPreparada`: con ella se cambia la entrada preparada de esta ejecución («Probar con otros datos» la vacía); sin ella se conserva la del programa abierto. */
  | { readonly tipo: 'visualizar'; readonly id: number; readonly entradaPreparada?: string }
  | { readonly tipo: 'compilado-ok'; readonly vista: VistaPrograma }
  | { readonly tipo: 'problema-al-revisar'; readonly aviso: AvisoDeEdicion }
  | { readonly tipo: 'volver-a-editar' }
  | { readonly tipo: 'pasos-recibidos'; readonly totalAnterior: number; readonly total: number }
  | { readonly tipo: 'espera-entrada'; readonly nodo: number }
  | { readonly tipo: 'entrada-enviada' }
  | { readonly tipo: 'fin'; readonly fin: FinEjecucion }
  | { readonly tipo: 'detenido' }
  | { readonly tipo: 'siguiente'; readonly total: number }
  | { readonly tipo: 'anterior' }
  | { readonly tipo: 'reiniciar' }
  | { readonly tipo: 'al-final'; readonly total: number }
  | { readonly tipo: 'ir-al-paso'; readonly paso: number; readonly total: number }
  | { readonly tipo: 'alternar-reproduccion'; readonly total: number }
  | { readonly tipo: 'tic'; readonly total: number }
  | { readonly tipo: 'ir-a-seccion'; readonly seccion: Seccion }
  /** «Probar mi programa»: el alumno ya empezó por su cuenta, el saludo con las puertas termina. */
  | { readonly tipo: 'terminar-saludo' }
  | { readonly tipo: 'cambiar-ajuste'; readonly ajuste: 'proyector'; readonly valor: boolean }
  | { readonly tipo: 'cambiar-ajuste'; readonly ajuste: 'velocidad'; readonly valor: NivelDeVelocidad }
  /** Abre un programa que no escribió el alumno (un ejemplo, un tema, un enlace): guarda el suyo y vuelve a «Paso a paso» en edición. */
  | { readonly tipo: 'cargar-programa'; readonly codigo: string; readonly entradaPreparada: string; readonly origen: OrigenDelPrograma }
  | { readonly tipo: 'volver-a-mi-programa' };

const EJECUCION_NUEVA = (id: number): EjecucionApp => ({ id, estado: 'calculando', nodoEnEspera: null, fin: null, vista: null });

const NAVEGACION_AL_INICIO: NavegacionApp = { paso: 0, reproduciendo: false, seguirAlLlegar: false };

export function estadoInicial(codigo: string): EstadoApp {
  return {
    modo: 'edicion',
    codigo,
    ejecucion: EJECUCION_NUEVA(0),
    aviso: null,
    navegacion: NAVEGACION_AL_INICIO,
    seccion: 'paso-a-paso',
    saludo: true,
    ajustes: { proyector: false, velocidad: 3 },
    entradaPreparada: '',
    origen: { tipo: 'propio' },
    programaGuardado: null,
  };
}

function acotar(paso: number, total: number): number {
  return Math.max(0, Math.min(total, paso));
}

/** Una navegación a mano (siguiente, anterior, saltar) pausa la reproducción: el alumno toma el control. */
function irA(estado: EstadoApp, paso: number): EstadoApp {
  return { ...estado, navegacion: { ...estado.navegacion, paso, reproduciendo: false } };
}

function alTic(estado: EstadoApp, total: number): EstadoApp {
  const { navegacion, ejecucion } = estado;
  if (!navegacion.reproduciendo) return estado;
  // Se acabaron los pasos que hay: si el motor aún calcula, llegarán más y se espera; si no, no hay nada más que reproducir.
  if (navegacion.paso >= total) {
    return ejecucion.estado === 'calculando' ? estado : { ...estado, navegacion: { ...navegacion, reproduciendo: false } };
  }
  const paso = navegacion.paso + 1;
  const sigueReproduciendo = paso < total || ejecucion.estado === 'calculando';
  return { ...estado, navegacion: { ...navegacion, paso, reproduciendo: sigueReproduciendo } };
}

export function reductor(estado: EstadoApp, accion: Accion): EstadoApp {
  switch (accion.tipo) {
    case 'editar':
      // Un aviso a la vista se conserva en el estado, pero su subrayado ya no señala el código nuevo y, si el código de verdad cambió, el aviso queda caducado: describe un programa que ya no está.
      return {
        ...estado,
        codigo: accion.codigo,
        // Una edición que de verdad cambia el código es la primera acción del alumno: el saludo termina. El eco de un programa que el editor ya tenía no cuenta.
        saludo: estado.saludo && accion.codigo === estado.codigo,
        aviso: estado.aviso === null ? null : { ...estado.aviso, resaltado: null, ...(accion.codigo === estado.codigo ? {} : { caducado: true as const }) },
      };
    case 'visualizar':
      return {
        ...estado,
        modo: 'compilando',
        saludo: false,
        entradaPreparada: accion.entradaPreparada ?? estado.entradaPreparada,
        ejecucion: EJECUCION_NUEVA(accion.id),
        aviso: null,
        navegacion: NAVEGACION_AL_INICIO,
      };
    case 'compilado-ok':
      return { ...estado, modo: 'visualizacion', ejecucion: { ...estado.ejecucion, vista: accion.vista } };
    case 'problema-al-revisar':
      return {
        ...estado,
        modo: 'edicion',
        ejecucion: EJECUCION_NUEVA(estado.ejecucion.id),
        aviso: accion.aviso,
        navegacion: NAVEGACION_AL_INICIO,
      };
    case 'volver-a-editar':
      return {
        ...estado,
        modo: 'edicion',
        ejecucion: EJECUCION_NUEVA(estado.ejecucion.id),
        aviso: null,
        navegacion: NAVEGACION_AL_INICIO,
      };
    case 'pasos-recibidos': {
      const { navegacion } = estado;
      if (!navegacion.seguirAlLlegar) return estado;
      const llegaronPasos = accion.total > accion.totalAnterior;
      const estabaEnElUltimo = navegacion.paso === accion.totalAnterior;
      return { ...estado, navegacion: { ...navegacion, paso: llegaronPasos && estabaEnElUltimo ? accion.totalAnterior + 1 : navegacion.paso, seguirAlLlegar: false } };
    }
    case 'espera-entrada':
      return { ...estado, ejecucion: { ...estado.ejecucion, estado: 'esperando-entrada', nodoEnEspera: accion.nodo } };
    case 'entrada-enviada':
      return {
        ...estado,
        ejecucion: { ...estado.ejecucion, estado: 'calculando', nodoEnEspera: null },
        navegacion: { ...estado.navegacion, seguirAlLlegar: true },
      };
    case 'fin':
      return {
        ...estado,
        ejecucion: { ...estado.ejecucion, estado: 'terminada', nodoEnEspera: null, fin: accion.fin },
        navegacion: { ...estado.navegacion, seguirAlLlegar: false },
      };
    case 'detenido':
      // Un programa que ya terminó (con su `fin`) no cambia por un acuse tardío; uno que seguía calculando o esperando un dato ya no va a recibir nada más.
      if (estado.ejecucion.estado === 'terminada' || estado.ejecucion.estado === 'detenida') return estado;
      return {
        ...estado,
        ejecucion: { ...estado.ejecucion, estado: 'detenida', nodoEnEspera: null },
        navegacion: { ...estado.navegacion, seguirAlLlegar: false },
      };
    case 'siguiente':
      return irA(estado, acotar(estado.navegacion.paso + 1, accion.total));
    case 'anterior':
      return irA(estado, Math.max(0, estado.navegacion.paso - 1));
    case 'reiniciar':
      return irA(estado, 0);
    case 'al-final':
      return irA(estado, accion.total);
    case 'ir-al-paso':
      return irA(estado, acotar(accion.paso, accion.total));
    case 'alternar-reproduccion': {
      const { navegacion } = estado;
      const reproduciendo = !navegacion.reproduciendo && navegacion.paso < accion.total;
      return { ...estado, navegacion: { ...navegacion, reproduciendo } };
    }
    case 'tic':
      return alTic(estado, accion.total);
    case 'ir-a-seccion':
      // Ir a otra sección es una puerta del saludo: lo termina. «Ir» a la sección en la que ya está no es una acción.
      return { ...estado, seccion: accion.seccion, saludo: estado.saludo && accion.seccion === estado.seccion };
    case 'terminar-saludo':
      return estado.saludo ? { ...estado, saludo: false } : estado;
    case 'cambiar-ajuste':
      return { ...estado, ajustes: accion.ajuste === 'proyector' ? { ...estado.ajustes, proyector: accion.valor } : { ...estado.ajustes, velocidad: accion.valor } };
    case 'cargar-programa':
      return {
        ...estado,
        modo: 'edicion',
        seccion: 'paso-a-paso',
        saludo: false,
        codigo: accion.codigo,
        entradaPreparada: accion.entradaPreparada,
        origen: accion.origen,
        // Se guarda el programa del alumno; abrir un segundo ejemplo no pisa el suyo con el primero.
        programaGuardado: estado.origen.tipo === 'propio' ? { codigo: estado.codigo, entrada: estado.entradaPreparada } : estado.programaGuardado,
        ejecucion: EJECUCION_NUEVA(estado.ejecucion.id),
        aviso: null,
        navegacion: NAVEGACION_AL_INICIO,
      };
    case 'volver-a-mi-programa':
      if (estado.programaGuardado === null) return estado;
      return {
        ...estado,
        modo: 'edicion',
        seccion: 'paso-a-paso',
        codigo: estado.programaGuardado.codigo,
        entradaPreparada: estado.programaGuardado.entrada,
        origen: { tipo: 'propio' },
        programaGuardado: null,
        ejecucion: EJECUCION_NUEVA(estado.ejecucion.id),
        aviso: null,
        navegacion: NAVEGACION_AL_INICIO,
      };
  }
}
