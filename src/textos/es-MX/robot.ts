// Catálogo es-MX — lo que dice el robot cuando NO es la explicación de un paso (tarea 4.11, REQ-VIS-011, ADR 015). La frase de cada paso del programa sale de
// `explicaciones.ts` (el motor manda la clave y los datos); aquí están las demás: lo que dice mientras el alumno escribe, el paso 0, la espera de un dato y el resumen de cómo
// terminó. Cada frase se arma con un dato que el motor SÍ calculó (la línea que sigue, los pasos, la causa del fin) — el robot nunca dice algo que el motor no calculó.
// Tono (el mismo de `explicaciones.ts`): español de México, tuteo, frases cortas, sin «incorrecto» a secas. Un resumen por CADA causa de fin: el tipo
// `{ [K in CausaFin]: … }` impide agregar una causa al motor sin su texto.
//
// Voz (tarea R0.3, REQ-PANT-010): el robot señala lo que hace la máquina en tercera persona («Java revisa…», «El visualizador lo detuvo…»), nunca como si él fuera la computadora. El saludo con
// las puertas (S0) vive en `pantalla.ts`.
import type { FinEjecucion } from '../../motor/vista.ts';

type CausaFin = FinEjecucion['causa'];

/** Cómo se ve el robot: lo decide la presentación según el momento (nunca el color solo: cambia el rostro y su descripción). */
export type AnimoDelRobot = 'normal' | 'esperando' | 'feliz' | 'preocupado' | 'seguridad';

/** Los tres robots (REQ-PANT-008): el que narra cada paso, el que revisa el programa y el del libro. Es también quién habla (`presentacion/hablante.ts`). */
export type PersonajeDelRobot = 'paso-a-paso' | 'revisor' | 'libro';

const NOMBRES_DE_PERSONAJE: { readonly [P in PersonajeDelRobot]: string } = {
  'paso-a-paso': 'Robot paso a paso',
  revisor: 'Robot revisor',
  libro: 'Robot del libro',
};

/** Lo que hace cada robot, para describirlo cuando está tranquilo (los demás ánimos se describen igual en los tres). */
const TAREA_DE_PERSONAJE: { readonly [P in PersonajeDelRobot]: string } = {
  'paso-a-paso': 'te explica cada paso',
  revisor: 'revisa tu programa',
  libro: 'te presenta el tema',
};

const DESCRIPCION_DEL_ANIMO: { readonly [A in Exclude<AnimoDelRobot, 'normal'>]: string } = {
  esperando: 'espera a que escribas un dato',
  feliz: 'contento, el programa terminó bien',
  preocupado: 'preocupado, algo salió mal',
  seguridad: 'con la mano levantada, el programa se detuvo por seguridad',
};

interface DatosDelResumen {
  readonly pasos: number;
}

function cuentaDePasos(pasos: number): string {
  return `${pasos} ${pasos === 1 ? 'paso' : 'pasos'}`;
}

const POR_SEGURIDAD = 'Así terminó: el visualizador lo detuvo por seguridad';

const RESUMENES_DEL_FIN: { readonly [K in CausaFin]: (datos: DatosDelResumen) => string } = {
  terminado: ({ pasos }) => `Así terminó: sin errores, en ${cuentaDePasos(pasos)}.`,
  // «Mira el mensaje en rojo» dependía del color (panel 1, H15): la consola marca el mensaje con la palabra «Error» y su ícono.
  excepcion: () => 'Así terminó: Java detuvo el programa por un error y lo que seguía ya no se ejecutó. Lee en la consola el mensaje marcado «Error»: dice qué pasó.',
  'error-arranque': () => 'Así terminó: el programa no pudo arrancar.',
  'no-disponible-en-ejecucion': () => 'Así terminó: el visualizador se detuvo en una parte que todavía no sabe ejecutar.',
  'limite-pasos': () => `${POR_SEGURIDAD} (demasiados pasos).`,
  'limite-caracteres': () => `${POR_SEGURIDAD} (un texto creció demasiado).`,
  'limite-tiempo': () => `${POR_SEGURIDAD} (tardó demasiado en calcular).`,
  'error-interno': () => 'Así terminó: algo falló dentro del visualizador, no en tu programa.',
};

export const textosRobot = {
  /** Mientras el alumno escribe o pega su programa (ya pasó el saludo con las puertas): qué hacer para verlo paso a paso. */
  sinEjecutar: (): string => 'Cuando tu programa esté listo, pulsa «Visualizar» y te muestro cómo lo ejecuta Java, paso a paso.',
  compilando: (): string => 'Java está revisando tu programa…',
  /** El alumno editó el código después de un aviso (error de compilación, «no disponible»…): el aviso viejo ya no describe el programa y el editor ya no lo marca (C4 del panel 1). */
  programaCambiado: (): string => 'Cambiaste el programa. Pulsa «Visualizar» para que Java lo revise otra vez.',
  /**
   * El paso 0 (T3 del maestro): todavía no se ejecuta nada y el robot invita a PREDECIR antes de ver (PRIMM; Naps 2002) sin adelantar nada de la ejecución. `lineaSiguiente` es la del primer paso
   * que el motor calculó (`null` si aún no hay ninguno).
   */
  alInicio: (lineaSiguiente: number | null): string => {
    const invitacion = 'Todavía no se ejecuta nada. Antes de empezar, lee el programa y anota qué crees que va a aparecer en la consola.';
    return lineaSiguiente === null
      ? `${invitacion} Luego pulsa «Siguiente» para empezar.`
      : `${invitacion} Luego pulsa «Siguiente» y lo comprobamos desde la línea ${lineaSiguiente}.`;
  },
  etiquetaDeLinea: (linea: number): string => `Línea ${linea}`,
  /** El programa llegó a una lectura de `Scanner` sin renglón: `linea` es la de ese nodo, que el motor mandó en `espera-entrada`. */
  esperandoUnDato: (linea: number): string => `En la línea ${linea} el programa espera un dato. Escríbelo en la consola y pulsa Enter.`,
  calculando: (): string => 'Se siguen calculando los siguientes pasos…',
  /** El trabajador acusó `detener`: la ejecución ya no sigue y no llegarán más pasos. No es una causa de fin del programa (nadie lo vio terminar), por eso no está en `resumenDelFin`. */
  detenida: (): string => 'Así terminó: la ejecución se detuvo antes de llegar al final del programa.',
  resumenDelFin: RESUMENES_DEL_FIN,
  personajes: {
    'paso-a-paso': { nombre: (): string => NOMBRES_DE_PERSONAJE['paso-a-paso'] },
    revisor: { nombre: (): string => NOMBRES_DE_PERSONAJE.revisor },
    libro: { nombre: (): string => NOMBRES_DE_PERSONAJE.libro },
  } satisfies { readonly [P in PersonajeDelRobot]: { readonly nombre: () => string } },
  /** El nombre accesible del dibujo (lo que oye quien usa lector de pantalla): el nombre del robot y su ánimo, nunca el color. */
  nombreAccesible: (personaje: PersonajeDelRobot, animo: AnimoDelRobot): string =>
    `${NOMBRES_DE_PERSONAJE[personaje]}: ${animo === 'normal' ? TAREA_DE_PERSONAJE[personaje] : DESCRIPCION_DEL_ANIMO[animo]}`,
};
