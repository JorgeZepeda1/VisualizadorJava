// Las etiquetas fijas del libro (R0.13, REQ-LIBRO-002, ADR 015): los nombres de las ocho secciones de un tema, en su orden, y las frases de los botones y preguntas que se repiten en todos los temas. Lo que
// cambia de un tema a otro (la situación, la idea, las consignas) vive en cada tema; esto es lo que no cambia.

export type IdDeSeccion = 'para-empezar' | 'la-idea' | 'como-se-escribe' | 'paso-a-paso' | 'errores-tipicos' | 'ponte-a-prueba' | 'ahora-hazlo-tu' | 'en-resumen';

export interface SeccionDelTema {
  readonly id: IdDeSeccion;
  readonly titulo: string;
}

/** Las ocho secciones de todo tema, en este orden: el libro va del ejemplo a la regla y termina pidiendo predecir, modificar y crear. */
export const SECCIONES_DEL_TEMA: readonly SeccionDelTema[] = [
  { id: 'para-empezar', titulo: 'Para empezar' },
  { id: 'la-idea', titulo: 'La idea' },
  { id: 'como-se-escribe', titulo: 'Cómo se escribe' },
  { id: 'paso-a-paso', titulo: 'Míralo paso a paso' },
  { id: 'errores-tipicos', titulo: 'Errores típicos' },
  { id: 'ponte-a-prueba', titulo: 'Ponte a prueba' },
  { id: 'ahora-hazlo-tu', titulo: 'Ahora hazlo tú' },
  { id: 'en-resumen', titulo: 'En resumen' },
];

export const ETIQUETAS_DEL_LIBRO = {
  preguntaDelEjemplo: '¿Qué crees que imprime?',
  verLaSalida: 'Ver la salida',
  verLaRespuesta: 'Ver la respuesta',
  /** El encabezado de lo que debe imprimir la solución de una tarea (PQ-5: el alumno ve la salida esperada, no la solución). `conEntrada`: el programa lee del teclado y se le da una entrada de prueba. */
  paraComprobar: (conEntrada: boolean): string => (conEntrada ? 'Para comprobar: con esta entrada debe imprimir' : 'Para comprobar: debe imprimir'),
  /** Va en «Míralo paso a paso» cuando el tema tiene condiciones que predecir (panel R0, maestro: una invitación, no una sugerencia). */
  sugerenciaDelReto: 'Prueba este ejemplo con el modo reto encendido.',
  /** Va en «Para comprobar» cuando el programa lee del teclado: NetBeans repite en la consola lo que se teclea y el visualizador no, así que las dos salidas no se ven iguales (panel R0, maestro). */
  avisoDeLaEntrada: 'En NetBeans también verás los datos que escribiste; aquí solo aparece lo que imprime el programa.',
};
