// El dibujo de una puerta, en chiquito (tarea R0.8, REQ-PANT-001, ADR 017): las puertas del saludo muestran el accesorio del robot que ayuda ahí —el libro abierto, el puntero ▶—, no tres caras que compitan por
// la atención de quien llega por primera vez. «Probar mi programa» lleva una hoja con código y un lápiz que no pertenece a ningún robot (panel R0: la lupa con «!» es del revisor y será la marca de trampa). Es un dibujo decorativo (`aria-hidden`): el texto del botón ya dice a dónde lleva. Los mismos trazos que sostiene cada robot (`Robot.tsx`),
// con los colores de su dueño (la hoja de estilos los pone por `data-icono-accesorio`).
import type { ReactElement } from 'react';
import type { AccesorioDePuerta } from '../../presentacion/index.ts';

const DIBUJOS: Readonly<Record<AccesorioDePuerta, ReactElement>> = {
  'libro-abierto': (
    <>
      <polygon className="robot-pagina" points="3,8 15,11 15,27 3,24" />
      <polygon className="robot-pagina" points="15,11 29,8 29,24 15,27" />
      <path className="robot-renglon" d="M6 14 L12 15.5 M6 18 L12 19.5 M6 22 L12 23.5 M18 15.5 L25 14 M18 19.5 L25 18 M18 23.5 L25 22" />
    </>
  ),
  puntero: <polygon className="robot-punta" points="7,4 27,16 7,28" />,
  // «Probar mi programa»: una hoja con dos renglones de código (el segundo con sangría) y un lápiz en diagonal. No es de ningún robot: sus clases son `icono-*`, no `robot-*`.
  'hoja-con-lapiz': (
    <>
      <path className="icono-hoja" d="M5 3 H19 L25 9 V29 H5 Z" />
      <path className="icono-doblez" d="M19 3 V9 H25" />
      <path className="icono-renglon" d="M9 13 H17" />
      <path className="icono-renglon" d="M12 18 H20" />
      <g className="icono-lapiz" transform="rotate(45 22 22)">
        <rect x="19.5" y="9" width="5" height="14" />
        <polygon points="19.5,23 24.5,23 22,29" />
      </g>
    </>
  ),
};

export interface PropiedadesIconoDeAccesorio {
  readonly accesorio: AccesorioDePuerta;
}

export function IconoDeAccesorio({ accesorio }: PropiedadesIconoDeAccesorio) {
  return (
    <svg className="icono-accesorio" data-icono-accesorio={accesorio} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      {DIBUJOS[accesorio]}
    </svg>
  );
}
