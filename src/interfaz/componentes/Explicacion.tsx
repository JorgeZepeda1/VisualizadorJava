// Explicación del robot (tarea 4.11, REQ-VIS-011): el robot y su globo de texto, en una ubicación fija del mismo campo visual que el código y las variables (nunca en una pestaña aparte). El globo
// narra el paso actual con la frase que el motor y el catálogo armaron —con su línea—; es una región `aria-live="polite"` (y `assertive` cuando el paso es una excepción o una detención); en el
// último paso agrega una nota (el programa espera un dato, el motor sigue calculando, o cómo terminó). Cuando hay un problema al revisar el programa, ese aviso ocupa el globo. Presentacional puro:
// solo pinta lo que recibe — el robot NUNCA dice algo que el motor no calculó.
import type { ReactNode } from 'react';
import type { RobotVista, SegmentoDeTexto } from '../../presentacion/index.ts';
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

export function Explicacion({ robot, problema = null }: PropiedadesExplicacion) {
  return (
    <section className="explicacion" aria-label={textosPaneles.zonas.explicacion()}>
      <Robot animo={problema === null ? robot.animo : 'preocupado'} />
      <div className="globo">
        {problema !== null ? (
          <AvisoProblema tipo={problema.tipo} adicionales={problema.adicionales}>
            <TextoConCodigo segmentos={problema.segmentos} />
          </AvisoProblema>
        ) : (
          <div data-testid="globo-del-robot" className="globo-contenido" aria-live={robot.asertivo ? 'assertive' : 'polite'} aria-atomic="true">
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
