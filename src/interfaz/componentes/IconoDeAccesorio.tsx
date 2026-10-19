// El accesorio de un robot, en chiquito (tarea R0.8, REQ-PANT-001, ADR 017): las puertas del saludo muestran el accesorio del robot que ayuda ahí —el libro abierto, el puntero ▶, la lupa con «!»—, no tres
// caras que compitan por la atención de quien llega por primera vez. Es un dibujo decorativo (`aria-hidden`): el texto del botón ya dice a dónde lleva. Los mismos trazos que sostiene cada robot (`Robot.tsx`),
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
  lupa: (
    <>
      <line className="robot-mango" x1="20" y1="20" x2="28" y2="28" />
      <circle className="robot-cristal" cx="13" cy="13" r="9.5" />
      <line className="robot-trazo" x1="13" y1="7.5" x2="13" y2="14.5" />
      <circle className="robot-ojo" cx="13" cy="18.5" r="1.6" />
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
