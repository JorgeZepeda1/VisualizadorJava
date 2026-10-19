// La ranura de acciones (tareas R0.8 a R0.10, REQ-PANT-001, 003, 007; PQ-2; ADR 017): una sola zona, pegada debajo del globo del robot, donde el alumno encuentra lo que sigue. Aloja —NUNCA a la vez— las
// puertas del saludo, el par «◀ Anterior · Siguiente ▶» (en R1, también las tres opciones del reto) y las acciones del fin. Aquí solo se decide QUÉ hay (ids, sin texto: las palabras viven en
// `textos/es-MX/pantalla.ts`); el componente `RanuraDeAcciones` lo dibuja. Cada puerta aparece solo cuando su destino tiene contenido publicado (PQ-2): ninguna lleva a un callejón. Puro, sin DOM.
import type { EstadoDeLaEjecucion } from './robot.ts';

export type IdDePuerta = 'leer-un-tema' | 'ver-un-ejemplo' | 'probar-mi-programa';

/** El accesorio del robot que ayuda en ese destino: la puerta muestra el accesorio (el libro, el puntero, la lupa), no tres caras que compitan por la atención del principiante. */
export type AccesorioDePuerta = 'libro-abierto' | 'puntero' | 'lupa';

export interface Puerta {
  readonly id: IdDePuerta;
  readonly accesorio: AccesorioDePuerta;
}

/** Lo que el alumno puede hacer al llegar al último paso de un programa que terminó (REQ-PANT-007). «Volver al tema» y «Siguiente tema» se suman con el libro (R2). */
export type AccionDeFin = 'anterior' | 'probar-con-otros-datos' | 'modificar-el-programa';

export type Ranura =
  | { readonly tipo: 'puertas'; readonly puertas: readonly Puerta[] }
  | { readonly tipo: 'navegacion'; readonly alPrincipio: boolean; readonly alFinal: boolean }
  | { readonly tipo: 'fin'; readonly acciones: readonly AccionDeFin[] }
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
    { id: 'probar-mi-programa', accesorio: 'lupa' },
  ];
}

export interface EntradaDeLaRanura extends DestinosDelSaludo {
  readonly ejecucion: EstadoDeLaEjecucion;
  /** A cuántos pasos aplicados se mira. */
  readonly paso: number;
  /** Cuántos pasos tiene la traza hasta ahora. */
  readonly total: number;
}

export function derivarRanura({ ejecucion, paso, total, hayTemasPublicados }: EntradaDeLaRanura): Ranura {
  switch (ejecucion.estado) {
    case 'saludo':
      return { tipo: 'puertas', puertas: puertasDelSaludo({ hayTemasPublicados }) };
    case 'sin-ejecutar':
    case 'compilando':
    case 'cambiado-tras-un-aviso':
      return { tipo: 'ninguna' };
    case 'terminada':
      // Solo en el ÚLTIMO paso de un programa que terminó: ahí lo que sigue ya no es otro paso sino probar otra cosa. Sin pasos (cero) no hay a dónde volver.
      if (paso >= total) return { tipo: 'fin', acciones: total > 0 ? ['anterior', 'probar-con-otros-datos', 'modificar-el-programa'] : ['probar-con-otros-datos', 'modificar-el-programa'] };
      return { tipo: 'navegacion', alPrincipio: paso <= 0, alFinal: false };
    case 'calculando':
    case 'esperando-entrada':
    case 'detenida':
      return { tipo: 'navegacion', alPrincipio: paso <= 0, alFinal: paso >= total };
  }
}
