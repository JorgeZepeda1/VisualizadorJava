// El robot (tarea 4.11, REQ-VIS-011; tres personajes en la tarea R0.5, REQ-PANT-008, ADR 017): un dibujo SVG en línea —cero imágenes ni peticiones de red, ADR 014— con un rostro distinto para cada
// ánimo (normal, esperando un dato, contento, preocupado, "alto" por seguridad) y una descripción en palabras para el lector de pantalla. Lo que cambia entre ánimos es la FORMA de los ojos y la boca,
// no solo el color. Son TRES robots, cada uno reconocible por la silueta de su cabeza y por el accesorio que sostiene, además del color (que se pinta con variables CSS por personaje):
//   - paso a paso: cabeza cuadrada con antena y un puntero ▶ (como el marcador del editor), en azul;
//   - revisor: cabeza redonda tipo casco y una lupa con «!» (como la marca de trampa del editor), en ámbar;
//   - del libro: cabeza ancha con lentes y un libro abierto, en verde.
// Los tres comparten `viewBox`, cuerpo, rostros y tamaño, para que quien habla ocupe siempre el mismo lugar. El movimiento (la antena que se balancea, el parpadeo) vive en la hoja de estilos y se apaga con
// `prefers-reduced-motion`. Presentacional puro: solo recibe el personaje (quién habla, lo decide la presentación) y el ánimo.
import type { ReactElement } from 'react';
import { textosRobot, type AnimoDelRobot, type PersonajeDelRobot } from '../../textos/es-MX/robot.ts';

/** Ojos y boca de cada ánimo, en la cara de 80×62 que empieza en (20, 26). Los tres personajes comparten rostros: cambia la cabeza, no la cara. */
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
      {/* Cejas de preocupación amable (panel 1, C5): el extremo de adentro MÁS ALTO que el de afuera. Al revés (adentro más bajo) se leen como enojo. */}
      <path className="robot-trazo" d="M37 47 L53 42" />
      <path className="robot-trazo" d="M83 47 L67 42" />
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

interface Figura {
  /** El nombre de la silueta, en `data-forma`: lo que distingue a los personajes sin depender del color. */
  readonly forma: string;
  /** La cabeza (y lo que le sale de ella: la antena, el casco, los lentes). Se dibuja ANTES del rostro, para que los ojos queden por encima. */
  readonly cabeza: ReactElement;
  /** Lo que se dibuja DESPUÉS del rostro y sobre él (los lentes, que van delante de los ojos). */
  readonly sobreElRostro?: ReactElement;
  /** El brazo izquierdo, que sostiene el accesorio, y el accesorio. Siempre a la izquierda y siempre presente: sin él no se reconoce al personaje. */
  readonly brazoYAccesorio: ReactElement;
  /** Desde dónde se levanta la mano derecha en el ánimo «seguridad» (el borde izquierdo de la mano): cada cabeza tiene otro ancho. */
  readonly manoLevantadaX: number;
  readonly accesorio: string;
}

const FIGURAS: Readonly<Record<PersonajeDelRobot, Figura>> = {
  'paso-a-paso': {
    forma: 'cuadrada-con-antena',
    accesorio: 'puntero',
    manoLevantadaX: 98,
    cabeza: (
      <>
        <g className="robot-antena">
          <line className="robot-trazo" x1="60" y1="14" x2="60" y2="26" />
          <circle className="robot-punta" cx="60" cy="10" r="5" />
        </g>
        <rect className="robot-cabeza" x="20" y="26" width="80" height="62" rx="14" />
      </>
    ),
    brazoYAccesorio: (
      <>
        <path className="robot-trazo" d="M34 100 Q24 102 12 108" />
        {/* Un puntero ▶ como el marcador de «acaba de ejecutarse» del editor. */}
        <g data-accesorio="puntero">
          <polygon className="robot-punta" points="-20,92 10,108 -20,124" />
        </g>
      </>
    ),
  },
  revisor: {
    forma: 'redonda-tipo-casco',
    accesorio: 'lupa',
    manoLevantadaX: 98,
    cabeza: (
      <>
        {/* El casco: una cúpula redonda con ala y una lámpara arriba. */}
        <rect className="robot-punta" x="51" y="20" width="18" height="12" rx="4" />
        <path className="robot-cabeza" d="M18 88 V72 A42 42 0 0 1 102 72 V88 Z" />
        <rect className="robot-cabeza" x="12" y="83" width="96" height="9" rx="4.5" />
      </>
    ),
    brazoYAccesorio: (
      <>
        <path className="robot-trazo" d="M34 100 Q27 112 16 122" />
        {/* Una lupa con «!», como la marca de trampa del editor. */}
        <g data-accesorio="lupa">
          <line className="robot-mango" x1="3" y1="111" x2="15" y2="123" />
          <circle className="robot-cristal" cx="-8" cy="100" r="15" />
          <line className="robot-trazo" x1="-8" y1="92" x2="-8" y2="102" />
          <circle className="robot-ojo" cx="-8" cy="108" r="2.2" />
        </g>
      </>
    ),
  },
  libro: {
    forma: 'ancha-con-lentes',
    accesorio: 'libro-abierto',
    manoLevantadaX: 108,
    cabeza: <rect className="robot-cabeza" x="8" y="30" width="104" height="58" rx="24" />,
    sobreElRostro: (
      <g className="robot-lentes">
        <circle className="robot-lente" cx="45" cy="54" r="14" />
        <circle className="robot-lente" cx="75" cy="54" r="14" />
        <path className="robot-trazo" d="M58 52 Q60 49 62 52" />
      </g>
    ),
    brazoYAccesorio: (
      <>
        <path className="robot-trazo" d="M34 100 Q26 106 14 112" />
        {/* Un libro abierto: dos páginas con renglones y el lomo en medio. */}
        <g data-accesorio="libro-abierto">
          <polygon className="robot-pagina" points="-24,96 -5,101 -5,125 -24,120" />
          <polygon className="robot-pagina" points="-5,101 14,96 14,120 -5,125" />
          <path className="robot-renglon" d="M-20 105 L-9 108 M-20 111 L-9 114 M-20 117 L-9 120 M-1 108 L10 105 M-1 114 L10 111 M-1 120 L10 117" />
        </g>
      </>
    ),
  },
};

export interface PropiedadesRobot {
  /** Quién es: lo decide `presentacion/hablante.ts`. */
  readonly personaje: PersonajeDelRobot;
  readonly animo: AnimoDelRobot;
}

export function Robot({ personaje, animo }: PropiedadesRobot) {
  const figura = FIGURAS[personaje];
  return (
    <figure className="robot-figura">
      <svg
        className="robot"
        data-personaje={personaje}
        data-forma={figura.forma}
        data-animo={animo}
        viewBox="-28 0 168 130"
        role="img"
        aria-label={textosRobot.nombreAccesible(personaje, animo)}
        focusable="false"
      >
        <g data-cabeza={figura.forma}>{figura.cabeza}</g>
        <g data-rostro={animo}>{ROSTROS[animo]}</g>
        {figura.sobreElRostro}
        <rect className="robot-cuerpo" x="34" y="92" width="52" height="24" rx="8" />
        <circle className="robot-boton" cx="60" cy="104" r="4" />
        {figura.brazoYAccesorio}
        {animo === 'seguridad' ? (
          // La mano levantada: "alto".
          <g className="robot-mano">
            <path className="robot-trazo" d={`M86 100 Q${figura.manoLevantadaX + 6} 96 ${figura.manoLevantadaX + 10} 74`} />
            <rect className="robot-cabeza" x={figura.manoLevantadaX} y="46" width="22" height="26" rx="6" />
          </g>
        ) : (
          <path className="robot-trazo" d="M86 100 Q98 104 96 114" />
        )}
      </svg>
      {/* El nombre ya está en el nombre accesible del dibujo: aquí es solo para quien ve. */}
      <figcaption className="robot-nombre" aria-hidden="true">
        {textosRobot.personajes[personaje].nombre()}
      </figcaption>
    </figure>
  );
}
