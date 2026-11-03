// Quién habla (tarea R0.6, REQ-PANT-009, ADR 017). En cada pantalla habla UN solo robot, siempre en la misma ranura junto al globo; nunca aparece un robot ni su retrato dentro del globo de otro. Habla:
//   - el robot del LIBRO, en la sección «Libro»;
//   - el REVISOR, cuando el análisis del programa terminó con un error de compilación, un aviso de fuera de alcance o un error de arranque (hoy: hay un problema vigente en el globo);
//   - el robot PASO A PASO, en todo lo demás: el saludo, la edición, cada paso, la galería y (desde R1) el reto.
// El revisor también hablará en el paso donde se ve una trampa de Java y al pedir «Ver explicación» (R3): esas dos condiciones se suman aquí, sin cambiar a quien consulta. Puro, sin DOM.
import type { PersonajeDelRobot } from '../textos/es-MX/robot.ts';
import type { Seccion } from './secciones.ts';

export type Hablante = PersonajeDelRobot;

export interface EntradaDelHablante {
  readonly seccion: Seccion;
  /** ¿Hay en el globo un problema vigente al revisar el programa (error de compilación, aviso de «no disponible», error de arranque o falla del visualizador)? */
  readonly hayProblema: boolean;
}

export function derivarHablante({ seccion, hayProblema }: EntradaDelHablante): Hablante {
  if (seccion === 'libro') return 'libro';
  return hayProblema ? 'revisor' : 'paso-a-paso';
}
