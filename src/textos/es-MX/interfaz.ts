// Catálogo es-MX — textos de interfaz (ADR 015; design.md línea 89: "textos/es-MX/ ...
// interfaz.ts"). Funciones tipadas por sus datos (ADR 015 punto 1): incluso las que no reciben
// datos quedan como función de cero argumentos, misma forma en todo el catálogo. El resto del
// catálogo (`explicaciones.ts`, `problemas.ts`, `excepciones.ts`, `ayuda.ts`) llega en los lotes
// que los definen (1.11 problemas, 2.14 excepciones, 4/5 explicaciones y ayuda); esta tarea (0.17)
// solo crea lo mínimo que la rebanada vertical ya necesita: los textos de `App.tsx`/`Visualizador.tsx`.
//
// Solo puede importar tipos de `motor/vista` (matriz de capas, herramientas/eslint/matriz-capas.ts)
// — ninguno de los textos de abajo lo necesita todavía.

export const textosInterfaz = {
  tituloApp: (): string => 'Visualizador de Java paso a paso',
  botonVisualizar: (): string => 'Visualizar',
  botonAnterior: (): string => '◀ Anterior',
  botonSiguiente: (): string => 'Siguiente ▶',
  pasoActualDeTotal: (paso: number, total: number): string => `Paso ${paso} de ${total}`,
  noCompilaTodavia: (): string =>
    'El programa no compila todavía (el catálogo completo de errores en español llega en el lote 1).',
  errorInterno: (): string => 'Algo falló dentro del visualizador.',
};
