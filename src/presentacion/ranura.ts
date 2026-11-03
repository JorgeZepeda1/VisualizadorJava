// La ranura de acciones (tareas R0.8 a R0.10, REQ-PANT-001, 003, 007; PQ-2; ADR 017): una sola zona, pegada debajo del globo del robot, donde el alumno encuentra lo que sigue. Aloja —NUNCA a la vez— las
// puertas del saludo, el par «◀ Anterior · Siguiente ▶» (en R1, también las tres opciones del reto) y las acciones del fin. Aquí solo se decide QUÉ hay (ids, sin texto: las palabras viven en
// `textos/es-MX/pantalla.ts`); el componente `RanuraDeAcciones` lo dibuja. Cada puerta aparece solo cuando su destino tiene contenido publicado (PQ-2): ninguna lleva a un callejón. Puro, sin DOM.
import type { EstadoDeLaEjecucion } from './robot.ts';

export type IdDePuerta = 'leer-un-tema' | 'ver-un-ejemplo' | 'probar-mi-programa';

/**
 * El dibujo de cada puerta: el accesorio del robot que ayuda en ese destino (el libro, el puntero), no tres caras que compitan por la atención del principiante. «Probar mi programa» lleva una hoja con
 * código y un lápiz que no es de ningún robot: la lupa es del revisor y será la marca de trampa (panel R0, diseñador).
 */
export type AccesorioDePuerta = 'libro-abierto' | 'puntero' | 'hoja-con-lapiz';

export interface Puerta {
  readonly id: IdDePuerta;
  readonly accesorio: AccesorioDePuerta;
}

/** Lo que el alumno puede hacer al llegar al último paso de un programa que terminó (REQ-PANT-007). «Volver al tema» y «Siguiente tema» se suman con el libro (R2). */
export type AccionDeFin = 'anterior' | 'probar-con-otros-datos' | 'modificar-el-programa';

export type Ranura =
  | { readonly tipo: 'puertas'; readonly puertas: readonly Puerta[] }
  | { readonly tipo: 'navegacion'; readonly alPrincipio: boolean; readonly alFinal: boolean }
  /** `principal`: la acción que se destaca y recibe el foco (panel R0: «Probar con otros datos» solo si el programa lee datos; en un ciclo que el visualizador detuvo, «Modificar el programa»). */
  | { readonly tipo: 'fin'; readonly acciones: readonly AccionDeFin[]; readonly principal: AccionDeFin }
  | { readonly tipo: 'ninguna' };

export interface DestinosDelSaludo {
  /** ¿Hay al menos un tema del libro publicado? Hoy ninguno (PQ-2); el hito R2 lo conecta (`interfaz/datos/temas-publicados.ts`). */
  readonly hayTemasPublicados: boolean;
}

/** Las puertas del saludo, en el orden del requisito, solo las que tienen destino. */
export function puertasDelSaludo({ hayTemasPublicados }: DestinosDelSaludo): readonly Puerta[] {
  return [
    ...(hayTemasPublicados ? [{ id: 'leer-un-tema', accesorio: 'libro-abierto' } as const] : []),
    { id: 'ver-un-ejemplo', accesorio: 'puntero' },
    { id: 'probar-mi-programa', accesorio: 'hoja-con-lapiz' },
  ];
}

export interface EntradaDeLaRanura extends DestinosDelSaludo {
  readonly ejecucion: EstadoDeLaEjecucion;
  /** A cuántos pasos aplicados se mira. */
  readonly paso: number;
  /** Cuántos pasos tiene la traza hasta ahora. */
  readonly total: number;
  /** ¿El programa leyó datos (algún paso consumió entrada, preparada o tecleada)? Solo entonces tiene sentido «Probar con otros datos» (panel R0). */
  readonly leeDatos: boolean;
}

/** Las causas con que el visualizador detiene un ciclo (o un texto) que no termina: probar otros datos no lo arregla, lo que hay que hacer es corregir el programa. */
const DETENCIONES_POR_SEGURIDAD: ReadonlySet<string> = new Set(['limite-pasos', 'limite-tiempo', 'limite-caracteres']);

function accionesDelFin(total: number, leeDatos: boolean, causa: string): Ranura {
  const principal: AccionDeFin = leeDatos && !DETENCIONES_POR_SEGURIDAD.has(causa) ? 'probar-con-otros-datos' : 'modificar-el-programa';
  const acciones: AccionDeFin[] = [...(total > 0 ? (['anterior'] as const) : []), ...(leeDatos ? (['probar-con-otros-datos'] as const) : []), 'modificar-el-programa'];
  return { tipo: 'fin', acciones, principal };
}

export function derivarRanura({ ejecucion, paso, total, hayTemasPublicados, leeDatos }: EntradaDeLaRanura): Ranura {
  switch (ejecucion.estado) {
    case 'saludo':
      return { tipo: 'puertas', puertas: puertasDelSaludo({ hayTemasPublicados }) };
    case 'sin-ejecutar':
    case 'compilando':
    case 'cambiado-tras-un-aviso':
      return { tipo: 'ninguna' };
    case 'terminada':
      // Solo en el ÚLTIMO paso de un programa que terminó: ahí lo que sigue ya no es otro paso sino probar otra cosa. Sin pasos (cero) no hay a dónde volver.
      if (paso >= total) return accionesDelFin(total, leeDatos, ejecucion.fin.causa);
      return { tipo: 'navegacion', alPrincipio: paso <= 0, alFinal: false };
    case 'calculando':
    case 'esperando-entrada':
    case 'detenida':
      return { tipo: 'navegacion', alPrincipio: paso <= 0, alFinal: paso >= total };
  }
}
