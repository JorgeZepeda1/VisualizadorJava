// Explicación del robot (tarea 4.11, REQ-VIS-011; un solo hablante en la tarea R0.6, REQ-PANT-009, ADR 017): el robot y su globo de texto, en una ubicación fija del mismo campo visual que el código y las
// variables (nunca en una pestaña aparte). Habla UN solo robot a la vez —el que decide `presentacion/hablante.ts`—, siempre en la misma ranura, y NUNCA se pinta un robot dentro del globo de otro.
// El globo narra el paso actual con la frase que el motor y el catálogo armaron —con su línea—; es una región `aria-live="polite"` (y `assertive` cuando el paso es una excepción o una detención); en el
// último paso agrega una nota (el programa espera un dato, el motor sigue calculando, o cómo terminó). Cuando hay un problema al revisar el programa, ese aviso ocupa el globo. Al CAMBIAR el hablante, el globo
// dice primero el nombre del robot nuevo (solo para lectores de pantalla) y no lo repite mientras siga hablando el mismo. Presentacional puro: solo pinta lo que recibe — el robot NUNCA dice algo que el
// motor no calculó.
import { useState, type ReactNode } from 'react';
import type { Hablante, RobotVista, SegmentoDeTexto } from '../../presentacion/index.ts';
import { textosPaneles, type TipoDeAviso } from '../../textos/es-MX/paneles.ts';
import { textosRobot } from '../../textos/es-MX/robot.ts';
import { AvisoProblema } from './AvisoProblema.tsx';
import { FraseConCodigo } from './FraseConCodigo.tsx';
import { Robot } from './Robot.tsx';
import { TextoConCodigo } from './TextoConCodigo.tsx';

/** Un problema al revisar el programa (error de compilación, aviso de «no disponible») o un fallo del visualizador: ocupa el globo en lugar de la explicación de un paso. */
export interface ProblemaParaExplicacion {
  readonly tipo: TipoDeAviso;
  readonly segmentos: readonly SegmentoDeTexto[];
  readonly adicionales: number;
}

export interface PropiedadesExplicacion {
  readonly robot: RobotVista;
  /** Quién habla: lo decide la presentación (`derivarHablante`). */
  readonly hablante: Hablante;
  readonly problema?: ProblemaParaExplicacion | null;
}

function TextoDelPaso({ robot }: { readonly robot: RobotVista }): ReactNode {
  return (
    <>
      {robot.linea !== null && (
        <>
          <span className="globo-linea">{textosRobot.etiquetaDeLinea(robot.linea)}</span>
          <span className="solo-lectores">{': '}</span>
        </>
      )}
      <FraseConCodigo texto={robot.texto} />
    </>
  );
}

/** Lo que el globo dice ahora, como una clave: cuando cambia es que hay algo nuevo que anunciar. */
function claveDelContenido(robot: RobotVista, problema: ProblemaParaExplicacion | null): string {
  if (problema !== null) return `problema|${problema.tipo}|${problema.adicionales}|${problema.segmentos.map((segmento) => segmento.texto).join('')}`;
  return `paso|${robot.linea ?? ''}|${robot.texto}|${robot.nota ?? ''}`;
}

/**
 * ¿Hay que decir el nombre del robot antes de lo que dice? Sí, justo cuando el hablante CAMBIÓ y mientras el globo siga diciendo eso mismo; en cuanto el globo dice otra cosa con el mismo hablante, ya no
 * (para no repetir el nombre en cada paso). Es estado derivado de las propiedades —se ajusta durante el render, como recomienda React— y no un efecto: así el nombre y el texto salen en el mismo pintado.
 */
function useAnunciarElNombre(hablante: Hablante, contenido: string): boolean {
  const [previo, setPrevio] = useState({ hablante, contenido, anunciar: false });
  let actual = previo;
  if (previo.hablante !== hablante) actual = { hablante, contenido, anunciar: true };
  else if (previo.contenido !== contenido) actual = { hablante, contenido, anunciar: false };
  if (actual !== previo) setPrevio(actual);
  return actual.anunciar;
}

export function Explicacion({ robot, hablante, problema = null }: PropiedadesExplicacion) {
  const anunciarElNombre = useAnunciarElNombre(hablante, claveDelContenido(robot, problema));
  const nombre = anunciarElNombre ? textosRobot.personajes[hablante].nombre() : null;
  return (
    <section className="explicacion" aria-label={textosPaneles.zonas.explicacion()} data-hablante={hablante}>
      {/* `key`: al cambiar de hablante la figura se vuelve a crear y entra con un fundido de 150 ms (solo con `prefers-reduced-motion: no-preference`; con movimiento reducido es instantáneo). */}
      <Robot key={hablante} personaje={hablante} animo={problema === null ? robot.animo : 'preocupado'} />
      <div className="globo">
        {problema !== null ? (
          <AvisoProblema tipo={problema.tipo} adicionales={problema.adicionales} nombreDelRobot={nombre}>
            <TextoConCodigo segmentos={problema.segmentos} />
          </AvisoProblema>
        ) : (
          <div data-testid="globo-del-robot" className="globo-contenido" aria-live={robot.asertivo ? 'assertive' : 'polite'} aria-atomic="true">
            {nombre !== null && <span className="solo-lectores">{`${nombre}: `}</span>}
            {robot.aviso === null ? (
              <p className="globo-texto">
                <TextoDelPaso robot={robot} />
              </p>
            ) : (
              <AvisoProblema tipo={robot.aviso} anunciar={false}>
                <TextoDelPaso robot={robot} />
              </AvisoProblema>
            )}
            {robot.nota !== null && (
              <p className="globo-nota">
                <FraseConCodigo texto={robot.nota} />
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
