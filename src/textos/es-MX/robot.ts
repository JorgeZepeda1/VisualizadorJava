// Catálogo es-MX — lo que dice el robot cuando NO es la explicación de un paso (tarea 4.11, REQ-VIS-011, ADR 015). La frase de cada paso del programa sale de
// `explicaciones.ts` (el motor manda la clave y los datos); aquí están las demás: el saludo, el paso 0, la espera de un dato y el resumen de cómo terminó. Cada
// frase se arma con un dato que el motor SÍ calculó (la línea que sigue, los pasos, la causa del fin) — el robot nunca dice algo que el motor no calculó.
// Tono (el mismo de `explicaciones.ts`): español de México, tuteo, frases cortas, sin «incorrecto» a secas. Un resumen por CADA causa de fin: el tipo
// `{ [K in CausaFin]: … }` impide agregar una causa al motor sin su texto.
import type { FinEjecucion } from '../../motor/vista.ts';

type CausaFin = FinEjecucion['causa'];

/** Cómo se ve el robot: lo decide la presentación según el momento (nunca el color solo: cambia el rostro y su descripción). */
export type AnimoDelRobot = 'normal' | 'esperando' | 'feliz' | 'preocupado' | 'seguridad';

interface DatosDelResumen {
  readonly pasos: number;
}

function cuentaDePasos(pasos: number): string {
  return `${pasos} ${pasos === 1 ? 'paso' : 'pasos'}`;
}

const POR_SEGURIDAD = 'Así terminó: me detuve por seguridad';

const RESUMENES_DEL_FIN: { readonly [K in CausaFin]: (datos: DatosDelResumen) => string } = {
  terminado: ({ pasos }) => `Así terminó: sin errores, en ${cuentaDePasos(pasos)}.`,
  excepcion: () => 'Así terminó: con un error (mira el mensaje en rojo en la consola).',
  'error-arranque': () => 'Así terminó: el programa no pudo arrancar.',
  'no-disponible-en-ejecucion': () => 'Así terminó: me detuve en una parte que todavía no sé ejecutar.',
  'limite-pasos': () => `${POR_SEGURIDAD} (demasiados pasos).`,
  'limite-caracteres': () => `${POR_SEGURIDAD} (un texto creció demasiado).`,
  'limite-tiempo': () => `${POR_SEGURIDAD} (tardó demasiado en calcular).`,
  'error-interno': () => 'Así terminó: algo falló dentro del visualizador, no en tu programa.',
};

export const textosRobot = {
  saludo: (): string => '¡Hola! Pega o escribe un programa de Java y pulsa «Visualizar». Yo te explico cada paso.',
  compilando: (): string => 'Estoy revisando tu programa…',
  /** El alumno editó el código después de un aviso (error de compilación, «no disponible»…): el aviso viejo ya no describe el programa y el editor ya no lo marca (C4 del panel 1). */
  programaCambiado: (): string => 'Cambiaste el programa. Pulsa «Visualizar» y lo reviso otra vez.',
  /** El paso 0: todavía no se ejecuta nada. `lineaSiguiente` es la del primer paso que el motor calculó (`null` si aún no hay ninguno). */
  alInicio: (lineaSiguiente: number | null): string =>
    lineaSiguiente === null
      ? 'Todavía no se ejecuta nada. Pulsa «Siguiente» para empezar.'
      : `Todavía no se ejecuta nada. Pulsa «Siguiente» y te explico la línea ${lineaSiguiente}.`,
  etiquetaDeLinea: (linea: number): string => `Línea ${linea}`,
  /** El programa llegó a una lectura de `Scanner` sin renglón: `linea` es la de ese nodo, que el motor mandó en `espera-entrada`. */
  esperandoUnDato: (linea: number): string => `En la línea ${linea} el programa espera un dato. Escríbelo en la consola y pulsa Enter.`,
  calculando: (): string => 'Sigo calculando los siguientes pasos…',
  /** El trabajador acusó `detener`: la ejecución ya no sigue y no llegarán más pasos. No es una causa de fin del programa (nadie lo vio terminar), por eso no está en `resumenDelFin`. */
  detenida: (): string => 'Así terminó: la ejecución se detuvo antes de llegar al final del programa.',
  resumenDelFin: RESUMENES_DEL_FIN,
  descripcionDelAnimo: {
    normal: (): string => 'Un robot amable que te explica cada paso',
    esperando: (): string => 'El robot espera a que escribas un dato',
    feliz: (): string => 'El robot está contento: el programa terminó bien',
    preocupado: (): string => 'El robot está preocupado: el programa terminó con un error',
    seguridad: (): string => 'El robot levanta la mano: detuvo el programa por seguridad',
  } satisfies { readonly [K in AnimoDelRobot]: () => string },
};
