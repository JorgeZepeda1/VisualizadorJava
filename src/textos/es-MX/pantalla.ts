// Catálogo es-MX — la pantalla nueva del hito R0 (REQ-PANT-001, 002, 004, 006, 007; ADR 015 y 017): el saludo con sus tres puertas, la navegación «Paso a paso · Libro · Ejemplos», la consola vacía, el
// aviso al teclear durante la visualización, la leyenda ▶/▷, el indicador de posición, «Ajustes de la clase» con sus estados en palabras y las acciones del fin. Un solo lugar con las palabras que
// el alumno ve —o escucha—: los componentes las piden aquí y nunca llevan un texto suelto. Tono: español de México, tuteo, frases cortas (el mismo de `robot.ts`). Los textos de la galería viven en
// `galeria.ts`. Borradores para la revisión del PO en R0.16.
export const textosPantalla = {
  saludo: {
    /** Lo que dice el robot paso a paso en el globo al abrir el visualizador sin un programa (S0). */
    globo: (): string => '¡Hola! Te muestro, paso a paso, qué hace Java con un programa. ¿Por dónde quieres empezar?',
    puertas: {
      etiquetaDelGrupo: (): string => '¿Por dónde quieres empezar?',
      leerUnTema: (): string => 'Leer un tema',
      verUnEjemplo: (): string => 'Ver un ejemplo paso a paso',
      probarMiPrograma: (): string => 'Probar mi programa',
    },
  },
  navegacion: {
    etiqueta: (): string => 'Secciones del visualizador',
    pasoAPaso: (): string => 'Paso a paso',
    libro: (): string => 'Libro',
    ejemplos: (): string => 'Ejemplos',
  },
  consola: {
    titulo: (): string => 'Consola',
    /** La consola vacía dice dónde aparecerá lo que imprima el programa (panel 1, H1). */
    vacia: (): string => 'Aquí aparecerá lo que imprima tu programa',
  },
  edicion: {
    /** Si el alumno teclea en el editor mientras se visualiza, el código no cambia y esto le dice cómo cambiarlo (se anuncia con `aria-live="polite"`). */
    avisoAlTeclearDuranteLaVisualizacion: (): string => 'Para cambiar el código pulsa «Editar programa»',
  },
  /** La leyenda de las marcas del margen del editor (panel 1, H9): ▶ la línea que acaba de ejecutarse y ▷ la que sigue. */
  leyenda: {
    etiqueta: (): string => 'Marcas del código',
    ejecutada: (): string => 'acaba de ejecutarse',
    siguiente: (): string => 'sigue',
  },
  posicion: {
    /** «Paso 5 de 8» solo cuando se conoce el total (el programa terminó); mientras el motor calcula o si lo detuvo por seguridad, solo «Paso 5» (panel 1, H9). */
    paso: (paso: number, total: number | null): string => (total === null ? `Paso ${paso}` : `Paso ${paso} de ${total}`),
  },
  ajustes: {
    boton: (): string => 'Ajustes de la clase',
    titulo: (): string => 'Ajustes de la clase',
    cerrar: (): string => 'Cerrar',
    proyector: {
      nombre: (): string => 'Modo proyector',
      descripcion: (): string => 'Letra más grande y una distribución pensada para proyectar en el salón.',
    },
    velocidad: {
      nombre: (): string => 'Velocidad',
    },
    /** El estado de un ajuste se dice con palabras, nunca solo con un color o un interruptor (WCAG 1.4.1). */
    estado: (encendido: boolean): string => (encendido ? 'Encendido' : 'Apagado'),
  },
  /** La zona donde el robot pone lo que sigue: las puertas, Anterior/Siguiente o las acciones del fin. */
  ranura: {
    etiqueta: (): string => 'Qué hacer ahora',
  },
  /** En el último paso de un programa que terminó (REQ-PANT-007). */
  fin: {
    etiqueta: (): string => 'Qué sigue',
    probarConOtrosDatos: (): string => 'Probar con otros datos',
    modificarElPrograma: (): string => 'Modificar el programa',
  },
  /** Tras abrir un ejemplo de la galería, el programa del alumno queda guardado y puede recuperarlo. */
  programaPropio: {
    volver: (): string => 'Volver a mi programa',
  },
};
