// Catálogo es-MX — la barra de reproducción (tarea 4.12, REQ-VIS-012, ADR 015). Cada botón lleva el glifo Y la palabra: nada va solo por símbolo (WCAG).
// «Anterior» y «Siguiente» viven en `interfaz.ts` (los usa desde la rebanada vertical) y se reutilizan tal cual; aquí están los demás. El indicador «Paso N de M» (que solo dice el total cuando se conoce) vive en
// `pantalla.ts`, y la etiqueta de la velocidad con los demás «Ajustes de la clase»; aquí quedan los niveles de velocidad con su nombre.
export type NivelDeVelocidad = 1 | 2 | 3 | 4 | 5;

const NOMBRES_DE_VELOCIDAD: Readonly<Record<NivelDeVelocidad, string>> = {
  1: 'Muy lenta',
  2: 'Lenta',
  3: 'Normal',
  4: 'Rápida',
  5: 'Muy rápida',
};

export const textosControles = {
  etiquetaDelGrupo: (): string => 'Controles de reproducción',
  botonReiniciar: (): string => '⏮ Reiniciar',
  botonReproducir: (): string => '⏵ Reproducir',
  botonPausar: (): string => '⏸ Pausa',
  botonFin: (): string => 'Fin ⏭',
  etiquetaDelDeslizador: (): string => 'Posición en el programa',
  nombreDeVelocidad: (nivel: NivelDeVelocidad): string => NOMBRES_DE_VELOCIDAD[nivel],
  ayudaDeAtajos: (): string =>
    'Atajos: flecha izquierda y derecha para ir atrás y adelante, Inicio y Fin para ir a los extremos, y espacio para reproducir o pausar.',
};
