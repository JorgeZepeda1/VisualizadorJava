// El robot (tarea 4.11, REQ-VIS-011): un dibujo SVG en línea —cero imágenes ni peticiones de red, ADR 014— con un rostro distinto para cada ánimo (normal, esperando un dato, contento, preocupado,
// "alto" por seguridad) y una descripción en palabras para el lector de pantalla. Lo que cambia entre ánimos es la FORMA de los ojos y la boca, no solo el color. El movimiento (la antena que
// se balancea, el parpadeo) vive en la hoja de estilos y se apaga con `prefers-reduced-motion`. Presentacional puro: solo recibe el ánimo que la presentación decidió.
import type { ReactElement } from 'react';
import { textosRobot, type AnimoDelRobot } from '../../textos/es-MX/robot.ts';

/** Ojos y boca de cada ánimo, en la cara de 80×62 que empieza en (20, 26). */
const ROSTROS: Readonly<Record<AnimoDelRobot, ReactElement>> = {
  normal: (
    <>
      <circle className="robot-ojo" cx="45" cy="54" r="6" />
      <circle className="robot-ojo" cx="75" cy="54" r="6" />
      <path className="robot-trazo" d="M46 71 Q60 81 74 71" />
    </>
  ),
  esperando: (
    <>
      <circle className="robot-ojo" cx="45" cy="50" r="6" />
      <circle className="robot-ojo" cx="75" cy="50" r="6" />
      <ellipse className="robot-trazo" cx="60" cy="72" rx="5" ry="6" />
    </>
  ),
  feliz: (
    <>
      <path className="robot-trazo" d="M38 56 Q45 46 52 56" />
      <path className="robot-trazo" d="M68 56 Q75 46 82 56" />
      <path className="robot-boca-abierta" d="M44 68 Q60 88 76 68 Z" />
    </>
  ),
  preocupado: (
    <>
      <circle className="robot-ojo" cx="45" cy="56" r="6" />
      <circle className="robot-ojo" cx="75" cy="56" r="6" />
      <path className="robot-trazo" d="M37 44 L53 49" />
      <path className="robot-trazo" d="M83 44 L67 49" />
      <path className="robot-trazo" d="M46 78 Q60 68 74 78" />
    </>
  ),
  seguridad: (
    <>
      <path className="robot-trazo" d="M38 54 H52" />
      <path className="robot-trazo" d="M68 54 H82" />
      <path className="robot-trazo" d="M48 74 H72" />
    </>
  ),
};

export interface PropiedadesRobot {
  readonly animo: AnimoDelRobot;
}

export function Robot({ animo }: PropiedadesRobot) {
  return (
    <svg
      className="robot"
      data-animo={animo}
      viewBox="0 0 140 130"
      role="img"
      aria-label={textosRobot.descripcionDelAnimo[animo]()}
      focusable="false"
    >
      <g className="robot-antena">
        <line className="robot-trazo" x1="60" y1="14" x2="60" y2="26" />
        <circle className="robot-punta" cx="60" cy="10" r="5" />
      </g>
      <rect className="robot-cabeza" x="20" y="26" width="80" height="62" rx="14" />
      <g data-rostro={animo}>{ROSTROS[animo]}</g>
      <rect className="robot-cuerpo" x="34" y="92" width="52" height="24" rx="8" />
      <circle className="robot-boton" cx="60" cy="104" r="4" />
      <path className="robot-trazo" d="M34 100 Q22 104 24 114" />
      {animo === 'seguridad' ? (
        // La mano levantada: "alto".
        <g className="robot-mano">
          <path className="robot-trazo" d="M86 100 Q104 96 108 74" />
          <rect className="robot-cabeza" x="98" y="46" width="22" height="26" rx="6" />
        </g>
      ) : (
        <path className="robot-trazo" d="M86 100 Q98 104 96 114" />
      )}
    </svg>
  );
}
